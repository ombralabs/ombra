using System.Buffers.Binary;
using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

namespace OmbraLabs.Ombra;

internal sealed record ResolvedBinary(
    string Version,
    string Platform,
    string? Path,
    bool Installed,
    string Source,
    string? Sha256)
{
    public BinaryInfo ToBinaryInfo() => new(Version, Platform, Path, Installed, Source, Sha256);
}

internal sealed record EngineVersionKey(int Major, int Minor, int Build, int Patch, int Release, bool IsDev)
    : IComparable<EngineVersionKey>
{
    public int CompareTo(EngineVersionKey? other)
    {
        if (other is null)
        {
            return 1;
        }

        var cmp = Major.CompareTo(other.Major);
        if (cmp != 0)
        {
            return cmp;
        }

        cmp = Minor.CompareTo(other.Minor);
        if (cmp != 0)
        {
            return cmp;
        }

        cmp = Build.CompareTo(other.Build);
        if (cmp != 0)
        {
            return cmp;
        }

        cmp = Patch.CompareTo(other.Patch);
        if (cmp != 0)
        {
            return cmp;
        }

        return Release.CompareTo(other.Release);
    }
}

internal sealed record ReleaseEntry(
    string Version,
    string ArchiveUrl,
    string Sha256,
    long Size,
    ChannelProvenance? Channel = null,
    GitHubProvenance? GitHub = null);

internal sealed record ChannelProvenance(string Name, long Serial, string Envelope);

internal sealed record GitHubProvenance(string Name, string Envelope, JsonElement Release);

internal static partial class BinaryManager
{
    private const string GitHubDownloadUrl = "https://github.com/ombralabs/ombra/releases/download";
    private const int GitHubReleasesPageSize = 10;
    private const int MaxMetadataBytes = 1024 * 1024;
    private const int MaxRedirects = 5;
    private const int DownloadRetries = 2; // Contract §11: download may retry twice with backoff
    private const long UpdateCheckIntervalMs = 3_600_000;
    private const int InstallLockTimeoutMs = 300_000;

    private static HttpClient _httpClient = CreateDefaultHttpClient();

    // Test seams (internal)
    internal static Func<TimeSpan, CancellationToken, Task> DelayHook { get; set; } = Task.Delay;

    internal static void SetHttpHandlerForTests(HttpMessageHandler? handler)
    {
        _httpClient = handler is null ? CreateDefaultHttpClient() : CreateHttpClient(handler);
    }

    private static HttpClient CreateDefaultHttpClient() =>
        CreateHttpClient(new HttpClientHandler { AllowAutoRedirect = false });

    private static HttpClient CreateHttpClient(HttpMessageHandler handler)
    {
        var client = new HttpClient(handler)
        {
            Timeout = Timeout.InfiniteTimeSpan,
        };
        client.DefaultRequestHeaders.UserAgent.ParseAdd($"ombra-dotnet-sdk/{OmbraConfig.SdkVersion}");
        return client;
    }

    [GeneratedRegex(@"^(\d+)\.(\d+)\.(\d+)\.(\d+)(?:-([1-9]\d*|0\+dev\.[0-9a-fA-F]+))?$")]
    private static partial Regex VersionPartsRegex();

    [GeneratedRegex(@"^v(\d+\.\d+\.\d+\.\d+(?:-[1-9]\d*)?)$")]
    private static partial Regex GitHubTagRegex();

    [GeneratedRegex(@"^[a-f0-9]{64}$")]
    private static partial Regex Sha256Regex();

    [GeneratedRegex(@"<key>CFBundleShortVersionString</key>\s*<string>([^<]+)</string>")]
    private static partial Regex PlistVersionRegex();

    [GeneratedRegex(@"(\d+\.\d+\.\d+\.\d+(?:-(?:[1-9]\d*|0\+dev\.[0-9a-fA-F]+))?)")]
    private static partial Regex CliVersionRegex();

    public static EngineVersionKey ParseVersionKey(string version)
    {
        var match = VersionPartsRegex().Match(version.Trim());
        if (!match.Success)
        {
            throw new FormatException($"Unrecognized engine version: '{version}'");
        }

        var major = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var minor = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        var build = int.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture);
        var patch = int.Parse(match.Groups[4].Value, CultureInfo.InvariantCulture);
        var rel = match.Groups[5].Value;
        if (string.IsNullOrEmpty(rel))
        {
            return new EngineVersionKey(major, minor, build, patch, 0, IsDev: false);
        }

        if (rel.StartsWith("0+dev.", StringComparison.Ordinal))
        {
            return new EngineVersionKey(major, minor, build, patch, 0, IsDev: true);
        }

        return new EngineVersionKey(major, minor, build, patch, int.Parse(rel, CultureInfo.InvariantCulture), IsDev: false);
    }

    public static bool VersionNewer(string candidate, string current) =>
        ParseVersionKey(candidate).CompareTo(ParseVersionKey(current)) > 0;

    public static void CheckEngineCompatibility(string version, string? binaryPath = null)
    {
        EngineVersionKey parsed;
        try
        {
            parsed = ParseVersionKey(version);
        }
        catch (FormatException ex)
        {
            throw new UnsupportedEngineException(
                $"Unrecognized Ombra engine version '{version}'; SDK supports {OmbraConfig.SupportedEngineRange}.",
                new Dictionary<string, object?>
                {
                    ["engineVersion"] = version,
                    ["supportedRange"] = OmbraConfig.SupportedEngineRange,
                    ["binaryPath"] = binaryPath,
                },
                innerException: ex);
        }

        var min = OmbraConfig.SupportedEngineMinChromium;
        var minKey = new EngineVersionKey(min.Major, min.Minor, min.Build, min.Patch, 0, IsDev: false);
        var cmpMin = new EngineVersionKey(parsed.Major, parsed.Minor, parsed.Build, parsed.Patch, 0, IsDev: false)
            .CompareTo(minKey);

        if (cmpMin < 0 || parsed.Major >= OmbraConfig.SupportedEngineMaxMajor)
        {
            throw new UnsupportedEngineException(
                $"Ombra engine version '{version}' is outside SDK supported range {OmbraConfig.SupportedEngineRange}.",
                new Dictionary<string, object?>
                {
                    ["engineVersion"] = version,
                    ["supportedRange"] = OmbraConfig.SupportedEngineRange,
                    ["binaryPath"] = binaryPath,
                });
        }
    }

    public static bool VersionMatches(string installed, string? requested)
    {
        if (string.IsNullOrEmpty(requested))
        {
            return true;
        }

        if (string.Equals(installed, requested, StringComparison.Ordinal))
        {
            return true;
        }

        if (!requested.Contains('-'))
        {
            try
            {
                var a = ParseVersionKey(installed);
                var b = ParseVersionKey(requested);
                return a.Major == b.Major && a.Minor == b.Minor && a.Build == b.Build && a.Patch == b.Patch;
            }
            catch (FormatException)
            {
                return false;
            }
        }

        return false;
    }

    private static void CheckRequestedVersion(string version, string? requestedVersion, string binaryPath)
    {
        if (!VersionMatches(version, requestedVersion))
        {
            throw new UnsupportedEngineException(
                $"Ombra engine '{version}' at {binaryPath} does not match requested version '{requestedVersion}'.",
                new Dictionary<string, object?>
                {
                    ["binaryPath"] = binaryPath,
                    ["engineVersion"] = version,
                    ["requestedVersion"] = requestedVersion,
                });
        }
    }

    public static string ComputeSha256(string filePath)
    {
        using var stream = File.OpenRead(filePath);
        var hash = SHA256.HashData(stream);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string AppRootForBinary(string binaryPath, string systemName)
    {
        var parent = Path.GetDirectoryName(binaryPath) ?? string.Empty;
        var grandParent = Path.GetDirectoryName(parent) ?? string.Empty;
        if (systemName == "Darwin" &&
            Path.GetFileName(parent) == "MacOS" &&
            Path.GetFileName(grandParent) == "Contents")
        {
            return Path.GetDirectoryName(grandParent) ?? parent;
        }

        return parent;
    }

    private static Dictionary<string, string>? ReadOmbraBuildJson(string binaryPath, string systemName)
    {
        var appRoot = AppRootForBinary(binaryPath, systemName);
        var candidates = new[]
        {
            Path.Combine(appRoot, "Contents", "Resources", "ombra-build.json"),
            Path.Combine(appRoot, "ombra-build.json"),
            Path.Combine(Path.GetDirectoryName(binaryPath) ?? string.Empty, "ombra-build.json"),
        }.Distinct(OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);

        Dictionary<string, string>? metadata = null;
        string[] trackedKeys = ["version", "chromium", "platform", "commit"];

        foreach (var candidate in candidates)
        {
            if (!File.Exists(candidate))
            {
                continue;
            }

            JsonDocument doc;
            try
            {
                doc = JsonDocument.Parse(File.ReadAllText(candidate, Encoding.UTF8));
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
            {
                continue;
            }

            using (doc)
            {
                if (doc.RootElement.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var current = new Dictionary<string, string>(StringComparer.Ordinal);
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    if (prop.Value.ValueKind == JsonValueKind.String)
                    {
                        var strVal = prop.Value.GetString();
                        if (strVal is not null)
                        {
                            current[prop.Name] = strVal;
                        }
                    }
                }

                if (metadata is not null)
                {
                    foreach (var key in trackedKeys)
                    {
                        if (metadata.TryGetValue(key, out var prevVal) &&
                            current.TryGetValue(key, out var nextVal) &&
                            !string.Equals(prevVal, nextVal, StringComparison.Ordinal))
                        {
                            throw new ChecksumMismatchException(
                                $"Conflicting engine build metadata for {binaryPath}. Reinstall the engine.");
                        }
                    }

                    foreach (var (k, v) in current)
                    {
                        metadata.TryAdd(k, v);
                    }
                }
                else
                {
                    metadata = current;
                }
            }
        }

        return metadata;
    }

    private static string? ReadMacPlistVersion(string appRoot)
    {
        var plistPath = Path.Combine(appRoot, "Contents", "Info.plist");
        try
        {
            if (!File.Exists(plistPath))
            {
                return null;
            }

            var text = File.ReadAllText(plistPath, Encoding.UTF8);
            var match = PlistVersionRegex().Match(text);
            return match.Success ? match.Groups[1].Value.Trim() : null;
        }
        catch (Exception)
        {
            return null;
        }
    }

    public static string? DetectBinaryVersion(
        string binaryPath,
        string systemName,
        string? fallbackVersion = null,
        bool allowCli = true)
    {
        var buildMeta = ReadOmbraBuildJson(binaryPath, systemName);
        if (buildMeta is not null)
        {
            foreach (var key in new[] { "version", "chromium" })
            {
                if (buildMeta.TryGetValue(key, out var ver) && VersionPartsRegex().IsMatch(ver.Trim()))
                {
                    return ver.Trim();
                }
            }
        }

        if (systemName == "Darwin")
        {
            var plistVer = ReadMacPlistVersion(AppRootForBinary(binaryPath, systemName));
            if (plistVer is not null && VersionPartsRegex().IsMatch(plistVer))
            {
                return plistVer;
            }
        }

        if (!string.IsNullOrWhiteSpace(fallbackVersion) && VersionPartsRegex().IsMatch(fallbackVersion.Trim()))
        {
            return fallbackVersion.Trim();
        }

        // Windows Chromium ignores --version and launches a full browser window.
        if (allowCli && systemName != "Windows")
        {
            try
            {
                using var proc = new Process();
                proc.StartInfo = new ProcessStartInfo(binaryPath)
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                proc.StartInfo.ArgumentList.Add("--version");
                proc.Start();
                var output = proc.StandardOutput.ReadToEnd();
                if (proc.WaitForExit(5000) && proc.ExitCode == 0)
                {
                    var match = CliVersionRegex().Match(output);
                    if (match.Success)
                    {
                        return match.Groups[1].Value;
                    }
                }
                else if (!proc.HasExited)
                {
                    proc.Kill(entireProcessTree: true);
                }
            }
            catch (Exception)
            {
            }
        }

        return null;
    }

    private static void CheckExecutableFormat(string binaryPath, PlatformInfo plat)
    {
        var head = new byte[64];
        int bytesRead;
        try
        {
            using var fs = File.OpenRead(binaryPath);
            bytesRead = fs.Read(head, 0, head.Length);
        }
        catch (Exception ex)
        {
            throw new BinaryNotFoundException(
                $"Cannot read engine binary at {binaryPath}: {ex.Message}",
                new Dictionary<string, object?> { ["binaryPath"] = binaryPath },
                innerException: ex);
        }

        if (bytesRead < 4)
        {
            throw new UnsupportedPlatformException(
                $"Binary is truncated or empty: {binaryPath}",
                new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["platform"] = plat.SdkName });
        }

        // Allow shebang stubs (#!) so offline unit tests can run fake launcher scripts.
        if (head[0] == 0x23 && head[1] == 0x21)
        {
            return;
        }

        var magicBe = BinaryPrimitives.ReadUInt32BigEndian(head);
        var magicLe = BinaryPrimitives.ReadUInt32LittleEndian(head);

        if (plat.SystemName == "Darwin")
        {
            if (magicBe is 0xCAFEBABE or 0xBEBAFECA or 0xCAFEBABF)
            {
                return; // Universal Mach-O fat binary
            }

            if (bytesRead < 8)
            {
                throw new UnsupportedPlatformException(
                    $"Engine binary at {binaryPath} is not a valid macOS Mach-O executable.",
                    new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["platform"] = plat.SdkName });
            }

            uint cpuType;
            if (magicLe == 0xFEEDFACF)
            {
                cpuType = BinaryPrimitives.ReadUInt32LittleEndian(head.AsSpan(4, 4));
            }
            else if (magicBe == 0xFEEDFACF)
            {
                cpuType = BinaryPrimitives.ReadUInt32BigEndian(head.AsSpan(4, 4));
            }
            else
            {
                throw new UnsupportedPlatformException(
                    $"Engine binary at {binaryPath} is not a macOS 64-bit Mach-O binary.",
                    new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["platform"] = plat.SdkName });
            }

            var expectedCpu = plat.Arch == "arm64" ? 0x0100000Cu : 0x01000007u;
            if (cpuType != expectedCpu)
            {
                throw new UnsupportedPlatformException(
                    $"Engine binary architecture mismatch at {binaryPath} for {plat.SdkName}.",
                    new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["platform"] = plat.SdkName });
            }

            return;
        }

        if (plat.SystemName == "Linux")
        {
            if (bytesRead < 20 || magicBe != 0x7F454C46)
            {
                throw new UnsupportedPlatformException(
                    $"Engine binary at {binaryPath} is not a Linux ELF executable.",
                    new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["platform"] = plat.SdkName });
            }

            var eMachine = BinaryPrimitives.ReadUInt16LittleEndian(head.AsSpan(18, 2));
            if (plat.Arch == "x64" && eMachine != 0x3E)
            {
                throw new UnsupportedPlatformException(
                    $"Engine binary architecture mismatch at {binaryPath} for {plat.SdkName}.",
                    new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["platform"] = plat.SdkName });
            }

            return;
        }

        if (plat.SystemName == "Windows")
        {
            if (bytesRead < 64 || head[0] != 0x4D || head[1] != 0x5A)
            {
                throw new UnsupportedPlatformException(
                    $"Engine binary at {binaryPath} is not a Windows PE executable.",
                    new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["platform"] = plat.SdkName });
            }
        }
    }

    private static void CheckWindowsMotw(string binaryPath, string systemName)
    {
        if (systemName != "Windows" || !OperatingSystem.IsWindows())
        {
            return;
        }

        try
        {
            var ads = File.ReadAllText($"{binaryPath}:Zone.Identifier", Encoding.UTF8);
            if (ads.Contains("ZoneId=3", StringComparison.Ordinal) ||
                ads.Contains("ZoneId=4", StringComparison.Ordinal))
            {
                throw new ChecksumMismatchException(
                    $"Ombra binary is blocked by Windows Mark-of-the-Web ({binaryPath}). Unblock the file before launching.",
                    new Dictionary<string, object?> { ["binaryPath"] = binaryPath });
            }
        }
        catch (ChecksumMismatchException)
        {
            throw;
        }
        catch (Exception)
        {
            // Alternate data stream absent -> not blocked.
        }
    }

    private static bool IsPosixExecutable(string binaryPath)
    {
        if (OperatingSystem.IsWindows())
        {
            return true;
        }

        try
        {
            var mode = File.GetUnixFileMode(binaryPath);
            return (mode & (UnixFileMode.UserExecute | UnixFileMode.GroupExecute | UnixFileMode.OtherExecute)) != 0;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public static (string Version, string Sha256) VerifyBinary(
        string binaryPath,
        PlatformInfo plat,
        string? receiptDir = null,
        string? fallbackVersion = null)
    {
        if (!File.Exists(binaryPath))
        {
            throw new BinaryNotFoundException(
                $"Ombra engine binary does not exist: {binaryPath}",
                new Dictionary<string, object?> { ["binaryPath"] = binaryPath });
        }

        if (plat.SystemName != "Windows" && !IsPosixExecutable(binaryPath))
        {
            throw new ChecksumMismatchException(
                $"Ombra engine binary is not executable: {binaryPath}",
                new Dictionary<string, object?> { ["binaryPath"] = binaryPath });
        }

        CheckWindowsMotw(binaryPath, plat.SystemName);

        var actualSha = ComputeSha256(binaryPath);
        if (OmbraConfig.SkipChecksumEnabled())
        {
            OmbraLogger.Warn(
                $"OMBRA_SKIP_CHECKSUM=1 is active: skipping SHA-256 verification for {binaryPath} (development only).");
        }
        else
        {
            var receiptBinaryPath = receiptDir is null ? OmbraConfig.ResolveRealPath(binaryPath) : binaryPath;
            var appRoot = AppRootForBinary(receiptBinaryPath, plat.SystemName);
            var binParent = Path.GetDirectoryName(receiptBinaryPath) ?? string.Empty;
            string[] markerCandidates = receiptDir is not null
                ? [Path.Combine(receiptDir, "binary.sha256")]
                : string.Equals(appRoot, binParent, StringComparison.Ordinal)
                    ? [Path.Combine(appRoot, "binary.sha256")]
                    :
                    [
                        Path.Combine(Path.GetDirectoryName(appRoot) ?? string.Empty, "binary.sha256"),
                        Path.Combine(appRoot, "binary.sha256"),
                        Path.Combine(binParent, "binary.sha256"),
                    ];

            var marker = markerCandidates.FirstOrDefault(File.Exists);
            if (marker is not null || receiptDir is not null)
            {
                var receipt = marker ?? markerCandidates[0];
                string expected;
                try
                {
                    expected = File.ReadAllText(receipt, Encoding.UTF8).Trim().ToLowerInvariant();
                }
                catch (Exception ex)
                {
                    throw new ChecksumMismatchException(
                        $"Ombra binary.sha256 receipt is missing or unreadable at {receipt}. Reinstall the engine before launching.",
                        new Dictionary<string, object?> { ["binaryPath"] = binaryPath, ["receipt"] = receipt },
                        innerException: ex);
                }

                if (!Sha256Regex().IsMatch(expected) || !string.Equals(expected, actualSha, StringComparison.Ordinal))
                {
                    throw new ChecksumMismatchException(
                        $"Ombra binary SHA-256 receipt is invalid or mismatched for {binaryPath}.",
                        new Dictionary<string, object?>
                        {
                            ["binaryPath"] = binaryPath,
                            ["receipt"] = receipt,
                            ["expectedSha256"] = expected,
                            ["actualSha256"] = actualSha,
                        });
                }
            }
        }

        var buildMeta = ReadOmbraBuildJson(binaryPath, plat.SystemName);
        if (buildMeta is not null && buildMeta.TryGetValue("platform", out var rawPlat))
        {
            var builtPlat = rawPlat.Trim();
            if (!string.IsNullOrEmpty(builtPlat) &&
                !string.Equals(builtPlat, plat.CdnName, StringComparison.Ordinal) &&
                !string.Equals(builtPlat, plat.SdkName, StringComparison.Ordinal))
            {
                throw new UnsupportedPlatformException(
                    $"Ombra binary platform '{builtPlat}' does not match host '{plat.SdkName}'.",
                    new Dictionary<string, object?> { ["binaryPlatform"] = builtPlat, ["hostPlatform"] = plat.SdkName });
            }
        }

        CheckExecutableFormat(binaryPath, plat);

        var detectedVersion = DetectBinaryVersion(binaryPath, plat.SystemName, fallbackVersion)
            ?? OmbraConfig.DefaultEngineVersion;
        CheckEngineCompatibility(detectedVersion, binaryPath);

        return (detectedVersion, actualSha);
    }

    private static string? ExplicitBinaryReceiptDir(string binaryPath, PlatformInfo plat)
    {
        if (!File.Exists(binaryPath))
        {
            return null;
        }

        var actualPath = OmbraConfig.ResolveRealPath(binaryPath);
        foreach (var root in new[] { OmbraConfig.GetManagedEnginesDir(), OmbraConfig.GetAppEnginesDir() })
        {
            if (!Directory.Exists(root))
            {
                continue;
            }

            var resolvedRoot = OmbraConfig.ResolveRealPath(root);
            var rel = Path.GetRelativePath(resolvedRoot, actualPath);
            if (!Path.IsPathRooted(rel) && rel != ".." && !rel.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            {
                var appRoot = AppRootForBinary(actualPath, plat.SystemName);
                var parent = Path.GetDirectoryName(actualPath) ?? string.Empty;
                return string.Equals(appRoot, parent, StringComparison.Ordinal)
                    ? appRoot
                    : Path.GetDirectoryName(appRoot) ?? appRoot;
            }
        }

        return null;
    }

    private static (string BinPath, string Version, string Sha256)? ResolveAppBinary(
        PlatformInfo plat,
        string? requestedVersion)
    {
        var enginesDir = OmbraConfig.GetAppEnginesDir();
        if (!Directory.Exists(enginesDir))
        {
            return null;
        }

        var candidateDirs = new List<(string Dir, string? HintVer)>();
        string? activeId = null;
        try
        {
            var selectionPath = Path.Combine(enginesDir, "selection.json");
            if (File.Exists(selectionPath))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(selectionPath, Encoding.UTF8));
                if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                    doc.RootElement.TryGetProperty("active", out var activeProp) &&
                    activeProp.ValueKind == JsonValueKind.String)
                {
                    var rawActive = activeProp.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(rawActive))
                    {
                        activeId = rawActive;
                    }
                }
            }
        }
        catch (Exception)
        {
        }

        if (!string.IsNullOrEmpty(requestedVersion))
        {
            candidateDirs.Add((Path.Combine(enginesDir, "versions", requestedVersion), requestedVersion));
        }

        if (!string.IsNullOrEmpty(activeId) && activeId != "legacy")
        {
            candidateDirs.Add((Path.Combine(enginesDir, "versions", activeId), activeId));
        }

        var versionsDir = Path.Combine(enginesDir, "versions");
        if (Directory.Exists(versionsDir))
        {
            var subdirs = Directory.GetDirectories(versionsDir)
                .Select(Path.GetFileName)
                .Where(n => n is not null && VersionPartsRegex().IsMatch(n))
                .OrderByDescending(n => ParseVersionKey(n!));
            foreach (var name in subdirs)
            {
                candidateDirs.Add((Path.Combine(versionsDir, name!), name));
            }
        }

        candidateDirs.Add((enginesDir, null));

        var seen = new HashSet<string>(OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
        foreach (var (dir, hintVer) in candidateDirs)
        {
            if (!Directory.Exists(dir))
            {
                continue;
            }

            foreach (var candidate in OmbraConfig.BinaryCandidatesInDir(dir, plat.SystemName))
            {
                if (!seen.Add(candidate) || !File.Exists(candidate))
                {
                    continue;
                }

                var (ver, sha) = VerifyBinary(candidate, plat, receiptDir: dir, fallbackVersion: hintVer);
                if (!VersionMatches(ver, requestedVersion))
                {
                    continue;
                }

                return (candidate, ver, sha);
            }
        }

        return null;
    }

    private static string LatestMarkerPath(string channel, PlatformInfo plat, bool github) =>
        Path.Combine(OmbraConfig.GetManagedEnginesDir(), $".latest_{(github ? "github_" : string.Empty)}{channel}_{plat.CdnName}");

    private static string SerialMarkerPath(string channel) =>
        Path.Combine(OmbraConfig.GetManagedEnginesDir(), $".serial_{channel}");

    private static string LastUpdateCheckPath(string channel, PlatformInfo plat, bool github) =>
        Path.Combine(OmbraConfig.GetManagedEnginesDir(), $".last_check_{(github ? "github_" : string.Empty)}{channel}_{plat.CdnName}");

    private static void WriteMarkerAtomic(string markerPath, string contents)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(markerPath)!);
        var tempPath = $"{markerPath}.partial-{Guid.NewGuid():N}";
        try
        {
            File.WriteAllText(tempPath, contents, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
            File.Move(tempPath, markerPath, overwrite: true);
        }
        finally
        {
            try
            {
                File.Delete(tempPath);
            }
            catch (IOException)
            {
            }
        }
    }

    private static (string BinPath, string HintVer, string ReceiptDir)? ResolveCacheBinary(
        PlatformInfo plat,
        string? requestedVersion,
        string channel)
    {
        var enginesDir = OmbraConfig.GetManagedEnginesDir();
        if (!Directory.Exists(enginesDir))
        {
            return null;
        }

        var candidateDirs = new List<(string Dir, string Ver)>();
        if (!string.IsNullOrEmpty(requestedVersion))
        {
            candidateDirs.Add((Path.Combine(enginesDir, requestedVersion), requestedVersion));
        }
        else
        {
            var baseUrl = OmbraConfig.GetDownloadBaseUrl();
            bool[] modes = baseUrl is null ? [true, false] : [baseUrl == OmbraConfig.DefaultDownloadUrl];
            foreach (var isGitHub in modes)
            {
                try
                {
                    var markerFile = LatestMarkerPath(channel, plat, isGitHub);
                    if (!File.Exists(markerFile))
                    {
                        continue;
                    }

                    var rawBytes = File.ReadAllBytes(markerFile);
                    ReleaseEntry latest;
                    if (isGitHub)
                    {
                        using var doc = JsonDocument.Parse(rawBytes);
                        var root = doc.RootElement;
                        if (root.ValueKind != JsonValueKind.Object ||
                            !root.TryGetProperty("source", out var srcProp) ||
                            srcProp.GetString() != OmbraConfig.DefaultDownloadUrl ||
                            !root.TryGetProperty("channel", out var chProp) ||
                            chProp.GetString() != channel ||
                            !root.TryGetProperty("envelope", out var envProp) ||
                            envProp.ValueKind != JsonValueKind.String ||
                            !root.TryGetProperty("release", out var relProp))
                        {
                            continue;
                        }

                        var envText = envProp.GetString()!;
                        latest = ParseGitHubRelease(Encoding.UTF8.GetBytes(envText), relProp.Clone(), plat, null, channel);
                    }
                    else
                    {
                        latest = ParseReleaseEntry(
                            rawBytes,
                            baseUrl ?? "https://offline.invalid",
                            plat,
                            requestedVersion: null,
                            channel);
                    }

                    candidateDirs.Add((Path.Combine(enginesDir, latest.Version), latest.Version));
                }
                catch (Exception)
                {
                    // Invalid provenance must not select an unpinned cached engine.
                }
            }
        }

        if (!string.IsNullOrEmpty(requestedVersion))
        {
            var subdirs = Directory.GetDirectories(enginesDir)
                .Select(Path.GetFileName)
                .Where(n => n is not null &&
                    !n.StartsWith('.') &&
                    !n.Contains(".partial-", StringComparison.Ordinal) &&
                    !n.Contains(".stale-", StringComparison.Ordinal) &&
                    VersionPartsRegex().IsMatch(n) &&
                    VersionMatches(n, requestedVersion))
                .OrderByDescending(n => ParseVersionKey(n!));

            foreach (var sub in subdirs)
            {
                candidateDirs.Add((Path.Combine(enginesDir, sub!), sub!));
            }
        }

        var seen = new HashSet<string>(OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
        foreach (var (dir, ver) in candidateDirs)
        {
            if (!Directory.Exists(dir))
            {
                continue;
            }

            foreach (var candidate in OmbraConfig.BinaryCandidatesInDir(dir, plat.SystemName))
            {
                if (!seen.Add(candidate) || !File.Exists(candidate))
                {
                    continue;
                }

                return (candidate, ver, dir);
            }
        }

        return null;
    }

    private static ResolvedBinary ResolveLocalBinary(
        string? binaryPath,
        string? requestedVersion,
        string channel,
        PlatformInfo plat)
    {
        if (binaryPath is not null)
        {
            var trimmed = binaryPath.Trim();
            if (string.IsNullOrEmpty(trimmed))
            {
                throw new BinaryNotFoundException("Explicit BinaryPath cannot be empty.");
            }

            var resolvedPath = Path.GetFullPath(OmbraConfig.ExpandTilde(trimmed));
            var (version, sha256) = VerifyBinary(
                resolvedPath,
                plat,
                receiptDir: ExplicitBinaryReceiptDir(resolvedPath, plat));
            CheckRequestedVersion(version, requestedVersion, resolvedPath);
            return new ResolvedBinary(version, plat.SdkName, resolvedPath, true, "argument", sha256);
        }

        var envPath = OmbraConfig.GetBinaryPathOverride();
        if (envPath is not null)
        {
            var (version, sha256) = VerifyBinary(
                envPath,
                plat,
                receiptDir: ExplicitBinaryReceiptDir(envPath, plat));
            CheckRequestedVersion(version, requestedVersion, envPath);
            return new ResolvedBinary(version, plat.SdkName, envPath, true, "env", sha256);
        }

        var appMatch = ResolveAppBinary(plat, requestedVersion);
        if (appMatch is not null)
        {
            return new ResolvedBinary(appMatch.Value.Version, plat.SdkName, appMatch.Value.BinPath, true, "app", appMatch.Value.Sha256);
        }

        var cacheMatch = ResolveCacheBinary(plat, requestedVersion, channel);
        if (cacheMatch is not null)
        {
            var (version, sha256) = VerifyBinary(
                cacheMatch.Value.BinPath,
                plat,
                receiptDir: cacheMatch.Value.ReceiptDir,
                fallbackVersion: cacheMatch.Value.HintVer);
            CheckRequestedVersion(version, cacheMatch.Value.HintVer, cacheMatch.Value.BinPath);
            CheckRequestedVersion(version, requestedVersion, cacheMatch.Value.BinPath);
            return new ResolvedBinary(version, plat.SdkName, cacheMatch.Value.BinPath, true, "cache", sha256);
        }

        return new ResolvedBinary(
            requestedVersion ?? OmbraConfig.DefaultEngineVersion,
            plat.SdkName,
            null,
            false,
            "none",
            null);
    }

    internal static void ValidateDownloadUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            throw new DownloadFailedException($"Invalid download URL: '{url}'.");
        }

        if (uri.Scheme == Uri.UriSchemeHttps)
        {
            return;
        }

        if (uri.Scheme == Uri.UriSchemeHttp && OmbraConfig.IsLoopbackHost(uri.Host))
        {
            return;
        }

        throw new DownloadFailedException($"Refusing insecure non-HTTPS download URL: '{url}'.");
    }

    internal static JsonElement VerifySignedEnvelope(byte[] rawBytes, string expectedType)
    {
        JsonDocument outerDoc;
        try
        {
            outerDoc = JsonDocument.Parse(rawBytes);
        }
        catch (Exception ex)
        {
            throw new ChecksumMismatchException("Signed release manifest is not valid JSON.", innerException: ex);
        }

        string signedStr;
        byte[] sigBytes;
        using (outerDoc)
        {
            if (outerDoc.RootElement.ValueKind != JsonValueKind.Object ||
                !outerDoc.RootElement.TryGetProperty("signed", out var signedProp) ||
                signedProp.ValueKind != JsonValueKind.String ||
                !outerDoc.RootElement.TryGetProperty("sig", out var sigProp) ||
                sigProp.ValueKind != JsonValueKind.String)
            {
                throw new ChecksumMismatchException(
                    "Release manifest is missing Ed25519 'signed'/'sig' envelope.");
            }

            signedStr = signedProp.GetString()!;
            try
            {
                sigBytes = Convert.FromBase64String(sigProp.GetString()!.Trim());
            }
            catch (FormatException ex)
            {
                throw new ChecksumMismatchException(
                    "Malformed base64 Ed25519 signature in release manifest.",
                    innerException: ex);
            }
        }

        if (sigBytes.Length != 64)
        {
            throw new ChecksumMismatchException("Invalid Ed25519 signature length in release manifest.");
        }

        var msgBytes = Encoding.UTF8.GetBytes(signedStr);
        var verified = false;
        foreach (var pubB64 in OmbraConfig.BinarySigningPubKeys)
        {
            byte[] rawPub;
            try
            {
                rawPub = Convert.FromBase64String(pubB64.Trim());
            }
            catch (FormatException)
            {
                continue;
            }

            if (rawPub.Length != 32)
            {
                continue;
            }

            var signer = new Ed25519Signer();
            signer.Init(forSigning: false, new Ed25519PublicKeyParameters(rawPub, 0));
            signer.BlockUpdate(msgBytes, 0, msgBytes.Length);
            if (signer.VerifySignature(sigBytes))
            {
                verified = true;
                break;
            }
        }

        if (!verified)
        {
            throw new ChecksumMismatchException(
                "Ed25519 signature verification failed against pinned Ombra signing keys.");
        }

        JsonDocument innerDoc;
        try
        {
            innerDoc = JsonDocument.Parse(signedStr);
        }
        catch (Exception ex)
        {
            throw new ChecksumMismatchException("Signed manifest payload is not valid JSON.", innerException: ex);
        }

        using (innerDoc)
        {
            var inner = innerDoc.RootElement;
            if (inner.ValueKind != JsonValueKind.Object)
            {
                throw new ChecksumMismatchException("Signed manifest payload must be a JSON object.");
            }

            if (inner.TryGetProperty("schema", out var schemaProp) &&
                (!schemaProp.TryGetInt32(out var schemaVal) || schemaVal != 1))
            {
                throw new ChecksumMismatchException($"Unexpected manifest schema: {schemaProp}.");
            }

            if (inner.TryGetProperty("type", out var typeProp) &&
                (typeProp.ValueKind != JsonValueKind.String || typeProp.GetString() != expectedType))
            {
                throw new ChecksumMismatchException($"Unexpected manifest type: {typeProp}.");
            }

            return inner.Clone();
        }
    }

    private static async Task<HttpResponseMessage> SendValidatedGetAsync(
        string url,
        CancellationToken ct)
    {
        var currentUrl = url;
        for (var redirects = 0; redirects <= MaxRedirects; redirects++)
        {
            ValidateDownloadUrl(currentUrl);
            var response = await _httpClient
                .GetAsync(currentUrl, HttpCompletionOption.ResponseHeadersRead, ct)
                .ConfigureAwait(false);

            if ((int)response.StatusCode is 301 or 302 or 303 or 307 or 308)
            {
                var location = response.Headers.Location;
                response.Dispose();
                if (location is null)
                {
                    throw new DownloadFailedException("Download redirect has no Location header.");
                }

                var nextUri = location.IsAbsoluteUri
                    ? location
                    : new Uri(new Uri(currentUrl), location);
                currentUrl = nextUri.AbsoluteUri;
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                var code = (int)response.StatusCode;
                response.Dispose();
                throw new DownloadFailedException(
                    $"HTTP {code} while downloading {currentUrl}",
                    new Dictionary<string, object?> { ["status"] = code, ["url"] = currentUrl });
            }

            return response;
        }

        throw new DownloadFailedException("Too many download redirects.");
    }

    private static async Task<byte[]> FetchBytesAsync(string url, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

        try
        {
            using var response = await SendValidatedGetAsync(url, timeoutCts.Token).ConfigureAwait(false);
            await using var stream = await response.Content.ReadAsStreamAsync(timeoutCts.Token).ConfigureAwait(false);
            using var ms = new MemoryStream();
            var buf = new byte[16 * 1024];
            int read;
            while ((read = await stream.ReadAsync(buf, timeoutCts.Token).ConfigureAwait(false)) > 0)
            {
                if (ms.Length + read > MaxMetadataBytes)
                {
                    throw new DownloadFailedException("Release metadata exceeds the 1 MiB limit.");
                }

                ms.Write(buf, 0, read);
            }

            return ms.ToArray();
        }
        catch (OmbraException)
        {
            throw;
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            throw new DownloadFailedException($"Failed to download {url}: {ex.Message}", innerException: ex);
        }
    }

    private static async Task<JsonElement> FetchGitHubJsonAsync(string url, CancellationToken ct)
    {
        var raw = await FetchBytesAsync(url, ct).ConfigureAwait(false);
        try
        {
            using var doc = JsonDocument.Parse(raw);
            return doc.RootElement.Clone();
        }
        catch (JsonException ex)
        {
            throw new DownloadFailedException("GitHub releases response is not valid JSON.", innerException: ex);
        }
    }

    private static string GitHubReleaseVersion(JsonElement release, string? requestedVersion, string channel)
    {
        if (release.ValueKind != JsonValueKind.Object ||
            !release.TryGetProperty("tag_name", out var tagProp) || tagProp.ValueKind != JsonValueKind.String ||
            !release.TryGetProperty("draft", out var draftProp) || draftProp.ValueKind != JsonValueKind.False ||
            !release.TryGetProperty("prerelease", out var preProp) ||
            (preProp.ValueKind != JsonValueKind.True && preProp.ValueKind != JsonValueKind.False))
        {
            throw new ChecksumMismatchException(
                "GitHub release has an invalid browser tag, draft, or channel identity.");
        }

        var tag = tagProp.GetString()!;
        var match = GitHubTagRegex().Match(tag);
        if (!match.Success)
        {
            throw new ChecksumMismatchException(
                "GitHub release has an invalid browser tag, draft, or channel identity.");
        }

        var version = match.Groups[1].Value;
        var isPrerelease = preProp.GetBoolean();
        var exactPin = requestedVersion is not null && requestedVersion.Contains('-');
        if (!VersionMatches(version, requestedVersion) ||
            (!exactPin && isPrerelease != (channel == "beta")))
        {
            throw new ChecksumMismatchException(
                "GitHub release has an invalid browser tag, draft, or channel identity.");
        }

        return version;
    }

    private static string GitHubAssetUrl(JsonElement release, string version, string filename, long? expectedSize = null)
    {
        var expectedUrl = $"{GitHubDownloadUrl}/v{version}/{filename}";
        if (!release.TryGetProperty("assets", out var assetsProp) || assetsProp.ValueKind != JsonValueKind.Array)
        {
            throw new ChecksumMismatchException($"GitHub release has invalid or missing '{filename}' asset metadata.");
        }

        var matches = new List<JsonElement>();
        foreach (var asset in assetsProp.EnumerateArray())
        {
            if (asset.ValueKind == JsonValueKind.Object &&
                asset.TryGetProperty("name", out var nameProp) &&
                nameProp.ValueKind == JsonValueKind.String &&
                nameProp.GetString() == filename)
            {
                matches.Add(asset);
            }
        }

        if (matches.Count != 1 ||
            !matches[0].TryGetProperty("browser_download_url", out var urlProp) ||
            urlProp.ValueKind != JsonValueKind.String ||
            urlProp.GetString() != expectedUrl)
        {
            throw new ChecksumMismatchException($"GitHub release has invalid or missing '{filename}' asset metadata.");
        }

        if (expectedSize.HasValue)
        {
            if (!matches[0].TryGetProperty("size", out var sizeProp) ||
                !sizeProp.TryGetInt64(out var actualSize) ||
                actualSize != expectedSize.Value)
            {
                throw new ChecksumMismatchException($"GitHub release has invalid or missing '{filename}' asset metadata.");
            }
        }

        return expectedUrl;
    }

    private static ReleaseEntry ParseGitHubRelease(
        byte[] raw,
        JsonElement release,
        PlatformInfo plat,
        string? requestedVersion,
        string channel)
    {
        var version = GitHubReleaseVersion(release, requestedVersion, channel);
        _ = GitHubAssetUrl(release, version, "release.json");
        var entry = ParseReleaseEntry(raw, OmbraConfig.DefaultDownloadUrl, plat, version, channel);
        var filename = Path.GetFileName(new Uri(entry.ArchiveUrl).AbsolutePath);
        _ = GitHubAssetUrl(release, version, filename, entry.Size);
        if (requestedVersion is null)
        {
            entry = entry with
            {
                GitHub = new GitHubProvenance(channel, Encoding.UTF8.GetString(raw), release.Clone()),
            };
        }

        return entry;
    }

    internal static ReleaseEntry ParseReleaseEntry(
        byte[] raw,
        string baseUrl,
        PlatformInfo plat,
        string? requestedVersion,
        string channel)
    {
        var isGitHub = baseUrl == OmbraConfig.DefaultDownloadUrl;
        var isRelease = isGitHub || (requestedVersion is not null && requestedVersion.Contains('-'));
        var inner = VerifySignedEnvelope(raw, isRelease ? "release" : "channel");

        long serial = 0;
        if (!isRelease)
        {
            if (!inner.TryGetProperty("channel", out var chProp) ||
                chProp.ValueKind != JsonValueKind.String ||
                chProp.GetString() != channel ||
                !inner.TryGetProperty("serial", out var serProp) ||
                !serProp.TryGetInt64(out serial) ||
                serial < 0)
            {
                throw new ChecksumMismatchException(
                    "Channel manifest has an invalid channel identity or serial.");
            }
        }

        if (!inner.TryGetProperty("platforms", out var platformsProp) || platformsProp.ValueKind != JsonValueKind.Object)
        {
            throw new ChecksumMismatchException("Manifest has invalid platforms metadata.");
        }

        if (!platformsProp.TryGetProperty(plat.CdnName, out var entryProp) || entryProp.ValueKind != JsonValueKind.Object)
        {
            throw new UnsupportedPlatformException($"Manifest does not publish an artifact for {plat.SdkName}.");
        }

        var versionPropFound = isRelease
            ? inner.TryGetProperty("version", out var verProp)
            : entryProp.TryGetProperty("version", out verProp);
        if (!versionPropFound || verProp.ValueKind != JsonValueKind.String)
        {
            throw new ChecksumMismatchException("Manifest has an invalid engine version.");
        }

        var version = verProp.GetString()!;
        if (!VersionPartsRegex().IsMatch(version))
        {
            throw new ChecksumMismatchException("Manifest has an invalid engine version.");
        }

        if (isRelease && !string.Equals(version, requestedVersion, StringComparison.Ordinal))
        {
            throw new ChecksumMismatchException("Release manifest version does not match the requested version.");
        }

        if (!isRelease && !string.IsNullOrEmpty(requestedVersion) && !VersionMatches(version, requestedVersion))
        {
            throw new BinaryNotFoundException(
                $"Requested version '{requestedVersion}' is not on channel '{channel}' (current: '{version}').");
        }

        CheckEngineCompatibility(version);

        var expectedFilename = $"ombra-engine-{version}-{plat.CdnName}{plat.ArchiveExt}";
        var expectedPath = $"/engine/releases/{version}/{expectedFilename}";

        var locationOk = isRelease
            ? entryProp.TryGetProperty("file", out var fileProp) &&
              fileProp.ValueKind == JsonValueKind.String &&
              fileProp.GetString() == expectedFilename
            : entryProp.TryGetProperty("path", out var pathProp) &&
              pathProp.ValueKind == JsonValueKind.String &&
              pathProp.GetString() == expectedPath;

        if (!locationOk ||
            !entryProp.TryGetProperty("sha256", out var shaProp) ||
            shaProp.ValueKind != JsonValueKind.String ||
            !Sha256Regex().IsMatch(shaProp.GetString()!.ToLowerInvariant()) ||
            !entryProp.TryGetProperty("size", out var sizeProp) ||
            !sizeProp.TryGetInt64(out var size) ||
            size <= 0)
        {
            throw new ChecksumMismatchException("Manifest has invalid artifact path, SHA-256, or size.");
        }

        var sha256 = shaProp.GetString()!.ToLowerInvariant();
        var archiveUrl = isGitHub
            ? $"{GitHubDownloadUrl}/v{version}/{expectedFilename}"
            : $"{baseUrl}{expectedPath}";
        ValidateDownloadUrl(archiveUrl);

        return new ReleaseEntry(
            version,
            archiveUrl,
            sha256,
            size,
            Channel: isRelease ? null : new ChannelProvenance(channel, serial, Encoding.UTF8.GetString(raw)));
    }

    internal static async Task<ReleaseEntry> FetchReleaseEntryAsync(
        string baseUrl,
        PlatformInfo plat,
        string? requestedVersion,
        string channel,
        CancellationToken ct)
    {
        if (baseUrl == OmbraConfig.DefaultDownloadUrl)
        {
            JsonElement? selectedRelease = null;
            if (requestedVersion is not null && requestedVersion.Contains('-'))
            {
                selectedRelease = await FetchGitHubJsonAsync($"{baseUrl}/tags/v{requestedVersion}", ct)
                    .ConfigureAwait(false);
            }
            else
            {
                if (requestedVersion is null && channel == "stable")
                {
                    try
                    {
                        var latest = await FetchGitHubJsonAsync($"{baseUrl}/latest", ct).ConfigureAwait(false);
                        if (IsMatchingGitHubRelease(latest, requestedVersion: null, channel))
                        {
                            selectedRelease = latest;
                        }
                    }
                    catch (DownloadFailedException ex) when (ex.Details.TryGetValue("status", out var s) && s is int code && code == 404)
                    {
                        // Missing /latest falls back to paginated release list.
                    }
                }

                for (var page = 1; selectedRelease is null; page++)
                {
                    var releases = await FetchGitHubJsonAsync(
                        $"{baseUrl}?per_page={GitHubReleasesPageSize}&page={page}", ct).ConfigureAwait(false);
                    if (releases.ValueKind != JsonValueKind.Array)
                    {
                        throw new DownloadFailedException("GitHub releases response must be an array.");
                    }

                    var count = 0;
                    foreach (var item in releases.EnumerateArray())
                    {
                        count++;
                        if (IsMatchingGitHubRelease(item, requestedVersion, channel))
                        {
                            selectedRelease = item.Clone();
                            break;
                        }
                    }

                    if (selectedRelease is null && count < GitHubReleasesPageSize)
                    {
                        throw new BinaryNotFoundException(
                            $"GitHub Releases has no published {channel} browser release.");
                    }
                }
            }

            var rel = selectedRelease.Value;
            var version = GitHubReleaseVersion(rel, requestedVersion, channel);
            var manifestUrl = GitHubAssetUrl(rel, version, "release.json");
            var manifestRaw = await FetchBytesAsync(manifestUrl, ct).ConfigureAwait(false);
            return ParseGitHubRelease(manifestRaw, rel, plat, requestedVersion, channel);
        }

        var isRelease = requestedVersion is not null && requestedVersion.Contains('-');
        var url = isRelease
            ? $"{baseUrl}/engine/releases/{requestedVersion}/release.json"
            : $"{baseUrl}/engine/channels/{channel}.json";
        var raw = await FetchBytesAsync(url, ct).ConfigureAwait(false);
        var entry = ParseReleaseEntry(raw, baseUrl, plat, requestedVersion, channel);

        if (entry.Channel is not null)
        {
            var serialPath = SerialMarkerPath(channel);
            if (File.Exists(serialPath))
            {
                var prevRaw = File.ReadAllText(serialPath, Encoding.UTF8).Trim();
                if (long.TryParse(prevRaw, CultureInfo.InvariantCulture, out var prevSerial) &&
                    entry.Channel.Serial < prevSerial)
                {
                    throw new ChecksumMismatchException(
                        $"Channel manifest rollback detected: serial {entry.Channel.Serial} < {prevSerial}.");
                }
            }

            WriteMarkerAtomic(serialPath, $"{entry.Channel.Serial}\n");
        }

        return entry;
    }

    private static bool IsMatchingGitHubRelease(JsonElement item, string? requestedVersion, string channel)
    {
        if (item.ValueKind != JsonValueKind.Object ||
            !item.TryGetProperty("draft", out var draftProp) || draftProp.ValueKind != JsonValueKind.False ||
            !item.TryGetProperty("prerelease", out var preProp) ||
            (preProp.ValueKind != JsonValueKind.True && preProp.ValueKind != JsonValueKind.False) ||
            !item.TryGetProperty("tag_name", out var tagProp) || tagProp.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        if (preProp.GetBoolean() != (channel == "beta"))
        {
            return false;
        }

        var tag = tagProp.GetString()!;
        var match = GitHubTagRegex().Match(tag);
        return match.Success && VersionMatches(match.Groups[1].Value, requestedVersion);
    }

    private static async Task DownloadArchiveAsync(ReleaseEntry entry, string archivePath, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromMinutes(10));

        OmbraLogger.Info($"Downloading Ombra engine from {SecretRedactor.Redact(entry.ArchiveUrl)}");
        try
        {
            using var response = await SendValidatedGetAsync(entry.ArchiveUrl, timeoutCts.Token).ConfigureAwait(false);
            await using var netStream = await response.Content.ReadAsStreamAsync(timeoutCts.Token).ConfigureAwait(false);
            using var hasher = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

            long totalWritten = 0;
            await using (var fileStream = new FileStream(archivePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                var buffer = new byte[64 * 1024];
                int read;
                while ((read = await netStream.ReadAsync(buffer, timeoutCts.Token).ConfigureAwait(false)) > 0)
                {
                    totalWritten += read;
                    if (totalWritten > entry.Size)
                    {
                        throw new ChecksumMismatchException(
                            $"Downloaded archive exceeds signed size {entry.Size}.");
                    }

                    hasher.AppendData(buffer, 0, read);
                    await fileStream.WriteAsync(buffer.AsMemory(0, read), timeoutCts.Token).ConfigureAwait(false);
                }
            }

            if (totalWritten != entry.Size)
            {
                throw new ChecksumMismatchException(
                    $"Downloaded archive size mismatch: expected {entry.Size}, got {totalWritten}.");
            }

            var actualSha = Convert.ToHexString(hasher.GetHashAndReset()).ToLowerInvariant();
            if (OmbraConfig.SkipChecksumEnabled())
            {
                OmbraLogger.Warn("OMBRA_SKIP_CHECKSUM=1 is active: skipping archive SHA-256 verification (development only).");
            }
            else if (!string.Equals(actualSha, entry.Sha256, StringComparison.Ordinal))
            {
                throw new ChecksumMismatchException(
                    $"Downloaded archive SHA-256 mismatch: expected {entry.Sha256}, got {actualSha}.",
                    new Dictionary<string, object?>
                    {
                        ["version"] = entry.Version,
                        ["expectedSha256"] = entry.Sha256,
                        ["actualSha256"] = actualSha,
                    });
            }
        }
        catch (Exception ex)
        {
            try
            {
                File.Delete(archivePath);
            }
            catch (IOException)
            {
            }

            if (ex is OmbraException)
            {
                throw;
            }

            if (ex is OperationCanceledException && ct.IsCancellationRequested)
            {
                throw;
            }

            throw new DownloadFailedException($"Failed to download engine archive: {ex.Message}", innerException: ex);
        }
    }

    private static void FlattenSingleSubdir(string stagingDir)
    {
        var entries = Directory.GetFileSystemEntries(stagingDir);
        if (entries.Length == 1 &&
            Directory.Exists(entries[0]) &&
            !entries[0].EndsWith(".app", StringComparison.OrdinalIgnoreCase))
        {
            var sub = entries[0];
            foreach (var child in Directory.GetFileSystemEntries(sub))
            {
                var dest = Path.Combine(stagingDir, Path.GetFileName(child));
                if (Directory.Exists(child))
                {
                    Directory.Move(child, dest);
                }
                else
                {
                    File.Move(child, dest);
                }
            }

            Directory.Delete(sub);
        }
    }

    private static ResolvedBinary? VerifiedCachedVersion(string version, PlatformInfo plat)
    {
        var dir = Path.Combine(OmbraConfig.GetManagedEnginesDir(), version);
        if (!Directory.Exists(dir))
        {
            return null;
        }

        foreach (var binPath in OmbraConfig.BinaryCandidatesInDir(dir, plat.SystemName))
        {
            if (!File.Exists(binPath))
            {
                continue;
            }

            try
            {
                var (ver, sha) = VerifyBinary(binPath, plat, receiptDir: dir, fallbackVersion: version);
                CheckRequestedVersion(ver, version, binPath);
                return new ResolvedBinary(ver, plat.SdkName, binPath, true, "cache", sha);
            }
            catch (Exception ex) when (ex is BinaryNotFoundException or ChecksumMismatchException or UnsupportedEngineException or UnsupportedPlatformException)
            {
            }
        }

        return null;
    }

    private static void AdoptChannel(ReleaseEntry entry, PlatformInfo plat)
    {
        var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture);
        if (entry.GitHub is not null)
        {
            var payload = JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                ["source"] = OmbraConfig.DefaultDownloadUrl,
                ["channel"] = entry.GitHub.Name,
                ["release"] = entry.GitHub.Release,
                ["envelope"] = entry.GitHub.Envelope,
            });
            WriteMarkerAtomic(LatestMarkerPath(entry.GitHub.Name, plat, github: true), payload);
            WriteMarkerAtomic(LastUpdateCheckPath(entry.GitHub.Name, plat, github: true), $"{nowMs}\n");
            return;
        }

        if (entry.Channel is not null)
        {
            WriteMarkerAtomic(LatestMarkerPath(entry.Channel.Name, plat, github: false), entry.Channel.Envelope);
            WriteMarkerAtomic(LastUpdateCheckPath(entry.Channel.Name, plat, github: false), $"{nowMs}\n");
        }
    }

    private static async Task<string> InstallArchiveAsync(
        string archivePath,
        string version,
        string archiveSha256,
        PlatformInfo plat,
        CancellationToken ct)
    {
        var enginesDir = OmbraConfig.GetManagedEnginesDir();
        Directory.CreateDirectory(enginesDir);

        var cached = VerifiedCachedVersion(version, plat);
        if (cached?.Path is not null)
        {
            return cached.Path;
        }

        var destDir = Path.Combine(enginesDir, version);
        var stagingDir = Path.Combine(enginesDir, $"{version}.partial-{Guid.NewGuid():N}");
        Directory.CreateDirectory(stagingDir);
        string? backupDir = null;

        try
        {
            if (archivePath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                await ArchiveExtractor.SafeExtractZipAsync(archivePath, stagingDir, ct).ConfigureAwait(false);
            }
            else if (archivePath.EndsWith(".tar.xz", StringComparison.OrdinalIgnoreCase))
            {
                await ArchiveExtractor.SafeExtractTarXzAsync(archivePath, stagingDir, ct).ConfigureAwait(false);
            }
            else
            {
                await ArchiveExtractor.SafeExtractTarGzAsync(archivePath, stagingDir, ct).ConfigureAwait(false);
            }

            FlattenSingleSubdir(stagingDir);

            var stagedBin = OmbraConfig.BinaryCandidatesInDir(stagingDir, plat.SystemName)
                .FirstOrDefault(File.Exists);
            if (stagedBin is null)
            {
                throw new DownloadFailedException(
                    $"Extracted archive for {version} did not contain expected binary.",
                    new Dictionary<string, object?> { ["version"] = version, ["platform"] = plat.SdkName });
            }

            if (!OperatingSystem.IsWindows())
            {
                var current = File.GetUnixFileMode(stagedBin);
                File.SetUnixFileMode(
                    stagedBin,
                    current | UnixFileMode.UserExecute | UnixFileMode.GroupExecute | UnixFileMode.OtherExecute);
            }

            if (OperatingSystem.IsMacOS())
            {
                try
                {
                    using var xattr = Process.Start(new ProcessStartInfo("xattr")
                    {
                        ArgumentList = { "-cr", stagingDir },
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                    });
                    xattr?.WaitForExit(15_000);
                }
                catch (Exception)
                {
                }
            }

            var binSha = ComputeSha256(stagedBin);
            File.WriteAllText(Path.Combine(stagingDir, "archive.sha256"), $"{archiveSha256}\n", Encoding.UTF8);
            File.WriteAllText(Path.Combine(stagingDir, "binary.sha256"), $"{binSha}\n", Encoding.UTF8);

            var (ver, _) = VerifyBinary(stagedBin, plat, receiptDir: stagingDir, fallbackVersion: version);
            CheckRequestedVersion(ver, version, stagedBin);

            if (Directory.Exists(destDir))
            {
                backupDir = Path.Combine(enginesDir, $"{version}.stale-{Guid.NewGuid():N}");
                Directory.Move(destDir, backupDir);
            }

            try
            {
                Directory.Move(stagingDir, destDir);
            }
            catch
            {
                if (backupDir is not null && Directory.Exists(backupDir))
                {
                    Directory.Move(backupDir, destDir);
                }

                throw;
            }

            if (backupDir is not null)
            {
                ProfileStore.TryDeleteDirectory(backupDir);
            }
        }
        finally
        {
            ProfileStore.TryDeleteDirectory(stagingDir);
        }

        var finalBin = OmbraConfig.BinaryCandidatesInDir(destDir, plat.SystemName)
            .FirstOrDefault(File.Exists);
        if (finalBin is null)
        {
            throw new DownloadFailedException($"Installed binary missing under {destDir}.");
        }

        return finalBin;
    }

    private static async Task<T> WithInstallerLockAsync<T>(Func<Task<T>> action, CancellationToken ct)
    {
        var cacheDir = OmbraConfig.GetCacheDir();
        Directory.CreateDirectory(cacheDir);
        // Keep the lock outside engines/ so ClearCache cannot unlink its inode.
        var lockPath = Path.Combine(cacheDir, ".install.lock");
        var deadline = Environment.TickCount64 + InstallLockTimeoutMs;

        OsFileLock fileLock;
        while (true)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                fileLock = OsFileLock.Acquire(lockPath);
                break;
            }
            catch (FileLockBusyException ex)
            {
                if (Environment.TickCount64 >= deadline)
                {
                    throw new DownloadFailedException(
                        "Timed out waiting for the engine installer lock.",
                        innerException: ex);
                }

                await Task.Delay(50, ct).ConfigureAwait(false);
            }
        }

        using (fileLock)
        {
            return await action().ConfigureAwait(false);
        }
    }

    private static void WithInstallerLock(Action action)
    {
        var cacheDir = OmbraConfig.GetCacheDir();
        Directory.CreateDirectory(cacheDir);
        var lockPath = Path.Combine(cacheDir, ".install.lock");
        var deadline = Environment.TickCount64 + InstallLockTimeoutMs;

        OsFileLock fileLock;
        while (true)
        {
            try
            {
                fileLock = OsFileLock.Acquire(lockPath);
                break;
            }
            catch (FileLockBusyException ex)
            {
                if (Environment.TickCount64 >= deadline)
                {
                    throw new DownloadFailedException(
                        "Timed out waiting for the engine installer lock.",
                        innerException: ex);
                }

                Thread.Sleep(50);
            }
        }

        using (fileLock)
        {
            action();
        }
    }

    private static async Task<ResolvedBinary> DownloadWithRetriesAsync(
        string baseUrl,
        PlatformInfo plat,
        string? requestedVersion,
        string channel,
        ReleaseEntry? selected,
        CancellationToken ct)
    {
        Exception? lastErr = null;
        for (var attempt = 0; attempt <= DownloadRetries; attempt++)
        {
            string? tmpDir = null;
            try
            {
                var entry = selected ?? await FetchReleaseEntryAsync(baseUrl, plat, requestedVersion, channel, ct)
                    .ConfigureAwait(false);
                var cached = VerifiedCachedVersion(entry.Version, plat);
                if (cached is not null)
                {
                    AdoptChannel(entry, plat);
                    return cached;
                }

                tmpDir = Path.Combine(Path.GetTempPath(), $"ombra-dl-{Guid.NewGuid():N}");
                Directory.CreateDirectory(tmpDir);
                var archiveFile = Path.Combine(tmpDir, $"engine{plat.ArchiveExt}");

                await DownloadArchiveAsync(entry, archiveFile, ct).ConfigureAwait(false);
                var binPath = await InstallArchiveAsync(archiveFile, entry.Version, entry.Sha256, plat, ct)
                    .ConfigureAwait(false);
                var (_, binSha) = VerifyBinary(
                    binPath,
                    plat,
                    receiptDir: Path.Combine(OmbraConfig.GetManagedEnginesDir(), entry.Version),
                    fallbackVersion: entry.Version);
                AdoptChannel(entry, plat);

                return new ResolvedBinary(entry.Version, plat.SdkName, binPath, true, "download", binSha);
            }
            catch (Exception ex) when (ex is ChecksumMismatchException or UnsupportedPlatformException or UnsupportedEngineException or BinaryNotFoundException)
            {
                throw;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                lastErr = ex;
                if (attempt < DownloadRetries)
                {
                    await DelayHook(TimeSpan.FromMilliseconds(500 * (1 << attempt)), ct).ConfigureAwait(false);
                    continue;
                }

                if (ex is DownloadFailedException)
                {
                    throw;
                }

                throw new DownloadFailedException($"Failed to download Ombra engine: {ex.Message}", innerException: ex);
            }
            finally
            {
                if (tmpDir is not null)
                {
                    ProfileStore.TryDeleteDirectory(tmpDir);
                }
            }
        }

        throw new DownloadFailedException($"Failed to download Ombra engine: {lastErr?.Message}", innerException: lastErr);
    }

    private static bool ShouldCheckAutoUpdate(string channel, PlatformInfo plat, bool github)
    {
        if (!OmbraConfig.GetAutoUpdate())
        {
            return false;
        }

        try
        {
            var text = File.ReadAllText(LastUpdateCheckPath(channel, plat, github), Encoding.UTF8).Trim();
            if (!double.TryParse(text, CultureInfo.InvariantCulture, out var ts))
            {
                return true;
            }

            var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            return nowMs - ts >= UpdateCheckIntervalMs;
        }
        catch (Exception)
        {
            return true;
        }
    }

    public static async Task<ResolvedBinary> ResolveBinaryAsync(
        string? binaryPath = null,
        string? version = null,
        bool download = true,
        string? releaseChannel = null,
        bool forceUpdateCheck = false,
        CancellationToken ct = default)
    {
        var plat = OmbraConfig.GetPlatformInfo();
        var requestedVersion = OmbraConfig.NormalizeRequestedVersion(version);
        var channel = OmbraConfig.GetReleaseChannel(releaseChannel);

        var local = ResolveLocalBinary(binaryPath, requestedVersion, channel, plat);
        if (local.Source is "argument" or "env" or "app")
        {
            return local;
        }

        var baseUrl = OmbraConfig.GetDownloadBaseUrl();
        async Task<ResolvedBinary> ResolveManagedAsync()
        {
            local = ResolveLocalBinary(binaryPath, requestedVersion, channel, plat);
            var isGitHub = baseUrl == OmbraConfig.DefaultDownloadUrl;
            if (local.Installed &&
                local.Source == "cache" &&
                download &&
                baseUrl is not null &&
                requestedVersion is null &&
                (forceUpdateCheck || ShouldCheckAutoUpdate(channel, plat, isGitHub)))
            {
                try
                {
                    var latest = await FetchReleaseEntryAsync(baseUrl, plat, null, channel, ct).ConfigureAwait(false);
                    var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture);
                    WriteMarkerAtomic(LastUpdateCheckPath(channel, plat, isGitHub), $"{nowMs}\n");
                    if (VersionNewer(latest.Version, local.Version))
                    {
                        return await DownloadWithRetriesAsync(baseUrl, plat, null, channel, latest, ct)
                            .ConfigureAwait(false);
                    }

                    if (latest.Version == local.Version)
                    {
                        AdoptChannel(latest, plat);
                    }
                }
                catch (Exception ex) when (ex is ChecksumMismatchException or UnsupportedEngineException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    OmbraLogger.Warn($"Engine auto-update check failed; using cached {local.Version}: {ex.Message}");
                }
            }

            if (local.Installed)
            {
                return local;
            }

            if (!download)
            {
                throw new BinaryNotFoundException(
                    "Ombra engine binary not found and automatic download is disabled. Run EnsureBinaryAsync() or set OMBRA_BINARY_PATH / BinaryPath.",
                    new Dictionary<string, object?>
                    {
                        ["platform"] = plat.SdkName,
                        ["version"] = requestedVersion ?? OmbraConfig.DefaultEngineVersion,
                    });
            }

            if (baseUrl is null)
            {
                throw new BinaryNotFoundException(
                    "Ombra engine binary not found and OMBRA_DOWNLOAD_URL is disabled. Run EnsureBinaryAsync() with a download URL or set OMBRA_BINARY_PATH.",
                    new Dictionary<string, object?> { ["platform"] = plat.SdkName });
            }

            return await DownloadWithRetriesAsync(baseUrl, plat, requestedVersion, channel, null, ct)
                .ConfigureAwait(false);
        }

        return download && baseUrl is not null
            ? await WithInstallerLockAsync(ResolveManagedAsync, ct).ConfigureAwait(false)
            : await ResolveManagedAsync().ConfigureAwait(false);
    }

    public static async Task<string> EnsureBinaryAsync(
        BinaryQueryOptions? options = null,
        CancellationToken ct = default)
    {
        var resolved = await ResolveBinaryAsync(
            binaryPath: options?.BinaryPath,
            version: options?.Version,
            download: true,
            releaseChannel: options?.ReleaseChannel,
            ct: ct).ConfigureAwait(false);
        if (!resolved.Installed || resolved.Path is null)
        {
            throw new BinaryNotFoundException("Could not resolve or download Ombra engine binary.");
        }

        return resolved.Path;
    }

    public static BinaryInfo GetBinaryInfo(BinaryQueryOptions? options = null)
    {
        var plat = OmbraConfig.GetPlatformInfo();
        var requestedVersion = OmbraConfig.NormalizeRequestedVersion(options?.Version);
        var channel = OmbraConfig.GetReleaseChannel(options?.ReleaseChannel);

        try
        {
            return ResolveLocalBinary(options?.BinaryPath, requestedVersion, channel, plat).ToBinaryInfo();
        }
        catch (UnsupportedEngineException ex)
            when (ex.Details.ContainsKey("requestedVersion") &&
                  (options?.BinaryPath is not null || OmbraConfig.GetBinaryPathOverride() is not null))
        {
            throw;
        }
        catch (Exception ex) when (ex is BinaryNotFoundException or ChecksumMismatchException or UnsupportedEngineException or UnsupportedPlatformException)
        {
            OmbraLogger.Debug($"BinaryInfo verification incomplete: {ex.Message}");
            return new BinaryInfo(
                requestedVersion ?? OmbraConfig.DefaultEngineVersion,
                plat.SdkName,
                null,
                false,
                "none",
                null);
        }
    }

    public static void ClearCache()
    {
        WithInstallerLock(() =>
        {
            var enginesDir = OmbraConfig.GetManagedEnginesDir();
            if (Directory.Exists(enginesDir))
            {
                Directory.Delete(enginesDir, recursive: true);
                OmbraLogger.Info($"Cleared SDK engine cache at {enginesDir}");
            }

            var cacheDir = OmbraConfig.GetCacheDir();
            if (Directory.Exists(cacheDir))
            {
                foreach (var entry in Directory.GetDirectories(cacheDir))
                {
                    var name = Path.GetFileName(entry);
                    if (name.StartsWith("engines.partial-", StringComparison.Ordinal) ||
                        name.StartsWith("engines.stale-", StringComparison.Ordinal))
                    {
                        ProfileStore.TryDeleteDirectory(entry);
                    }
                }
            }
        });
    }
}
