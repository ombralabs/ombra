using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

namespace OmbraLabs.Ombra;

internal sealed record PlatformInfo(
    string SdkName,
    string CdnName,
    string ArchiveExt,
    string SystemName,
    string Arch);

internal static class OmbraLogger
{
    private const int ErrorWeight = 40;
    private const int WarnWeight = 30;
    private const int InfoWeight = 20;
    private const int DebugWeight = 10;

    private static int CurrentWeight()
    {
        var raw = (Environment.GetEnvironmentVariable("OMBRA_LOG_LEVEL") ?? "warn").Trim().ToLowerInvariant();
        return raw switch
        {
            "error" => ErrorWeight,
            "warn" or "warning" => WarnWeight,
            "info" => InfoWeight,
            "debug" => DebugWeight,
            _ => WarnWeight,
        };
    }

    public static void Error(string message)
    {
        if (CurrentWeight() <= ErrorWeight)
        {
            Console.Error.WriteLine($"[ombra:error] {message}");
        }
    }

    public static void Warn(string message)
    {
        if (CurrentWeight() <= WarnWeight)
        {
            Console.Error.WriteLine($"[ombra:warn] {message}");
        }
    }

    public static void Info(string message)
    {
        if (CurrentWeight() <= InfoWeight)
        {
            Console.Error.WriteLine($"[ombra:info] {message}");
        }
    }

    public static void Debug(string message)
    {
        if (CurrentWeight() <= DebugWeight)
        {
            Console.Error.WriteLine($"[ombra:debug] {message}");
        }
    }
}

internal static partial class OmbraConfig
{
    public const string SdkVersion = "0.2.0";
    public const string ContractVersion = "0.2.0";
    public const string SupportedContractRange = ">=0.2,<0.3";
    public const string DefaultEngineVersion = "158.0.8127.37";
    public const string SupportedEngineRange = ">=151.0.7922.108,<159";
    public const string SupportedPlaywrightRange = ">=1.60.0,<2.0.0";

    public static readonly (int Major, int Minor, int Build, int Patch) SupportedEngineMinChromium = (151, 0, 7922, 108);
    public const int SupportedEngineMaxMajor = 159; // exclusive

    public const string DefaultDownloadUrl = "https://api.github.com/repos/ombralabs/ombra/releases";
    public const int DefaultTimeoutMs = 30_000;
    public const int MinTimeoutMs = 1_000;
    public const int MaxTimeoutMs = 600_000;

    // Matches config/engine-signing.pub in ombra-engine and Python/Node SDKs.
    internal static readonly List<string> BinarySigningPubKeys =
    [
        "c3bmkOT6aDdpe3Kobp/KU5GzND8A77L6gv0XCdL2ZlY=",
    ];

    [GeneratedRegex(@"^(?:chromium-)?(\d+\.\d+\.\d+\.\d+(?:-(?:[1-9]\d*|0\+dev\.[0-9a-fA-F]+))?)$")]
    private static partial Regex VersionPinRegex();

    public static PlatformInfo GetPlatformInfo()
    {
        return GetPlatformInfo(
            OperatingSystem.IsMacOS() ? "Darwin" : OperatingSystem.IsWindows() ? "Windows" : OperatingSystem.IsLinux() ? "Linux" : RuntimeInformation.OSDescription,
            RuntimeInformation.OSArchitecture);
    }

    internal static PlatformInfo GetPlatformInfo(string systemName, Architecture arch)
    {
        var archName = arch switch
        {
            Architecture.X64 => "x64",
            Architecture.Arm64 => "arm64",
            _ => null,
        };

        if (archName is null)
        {
            throw new UnsupportedPlatformException(
                $"Unsupported CPU architecture '{arch}'; Ombra supports x64 and arm64.",
                new Dictionary<string, object?> { ["os"] = systemName, ["arch"] = arch.ToString() });
        }

        if (systemName == "Darwin")
        {
            return archName == "arm64"
                ? new PlatformInfo("macos-arm64", "darwin-arm64", ".tar.gz", "Darwin", "arm64")
                : new PlatformInfo("macos-x64", "darwin-x64", ".tar.gz", "Darwin", "x64");
        }

        if (systemName == "Windows")
        {
            if (archName != "x64")
            {
                throw new UnsupportedPlatformException(
                    $"Ombra does not publish Windows builds for architecture '{arch}'.",
                    new Dictionary<string, object?> { ["os"] = systemName, ["arch"] = arch.ToString() });
            }

            return new PlatformInfo("windows-x64", "windows-x64", ".zip", "Windows", "x64");
        }

        if (systemName == "Linux")
        {
            if (archName != "x64")
            {
                throw new UnsupportedPlatformException(
                    $"Ombra does not publish Linux builds for architecture '{arch}'.",
                    new Dictionary<string, object?> { ["os"] = systemName, ["arch"] = arch.ToString() });
            }

            return new PlatformInfo("linux-x64", "linux-x64", ".tar.xz", "Linux", "x64");
        }

        throw new UnsupportedPlatformException(
            $"Unsupported operating system '{systemName}'.",
            new Dictionary<string, object?> { ["os"] = systemName, ["arch"] = arch.ToString() });
    }

    public static string GetHostPersonaOs()
    {
        if (OperatingSystem.IsMacOS())
        {
            return "macos";
        }

        if (OperatingSystem.IsWindows())
        {
            return "windows";
        }

        return "linux";
    }

    public static string GetHomeDir()
    {
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        if (!string.IsNullOrWhiteSpace(home))
        {
            return home;
        }

        return Environment.GetEnvironmentVariable("HOME")
            ?? Environment.GetEnvironmentVariable("USERPROFILE")
            ?? ".";
    }

    public static string ExpandTilde(string path)
    {
        if (path == "~")
        {
            return GetHomeDir();
        }

        if (path.StartsWith("~/", StringComparison.Ordinal) || path.StartsWith("~\\", StringComparison.Ordinal))
        {
            return Path.Combine(GetHomeDir(), path[2..]);
        }

        return path;
    }

    public static string GetCacheDir()
    {
        var raw = Environment.GetEnvironmentVariable("OMBRA_CACHE_DIR")?.Trim();
        if (!string.IsNullOrEmpty(raw))
        {
            return Path.GetFullPath(ExpandTilde(raw));
        }

        return Path.Combine(GetHomeDir(), ".ombra");
    }

    public static string GetManagedEnginesDir() => Path.Combine(GetCacheDir(), "engines");

    public static string GetProfilesDir() => Path.Combine(GetCacheDir(), "profiles");

    public static string GetAppEnginesDir()
    {
        var overrideDir = Environment.GetEnvironmentVariable("OMBRA_APP_ENGINES_DIR")?.Trim();
        if (!string.IsNullOrEmpty(overrideDir))
        {
            return Path.GetFullPath(ExpandTilde(overrideDir));
        }

        if (OperatingSystem.IsMacOS())
        {
            return Path.Combine(GetHomeDir(), "Library", "Application Support", "Ombra", "engines");
        }

        if (OperatingSystem.IsWindows())
        {
            var localApp = Environment.GetEnvironmentVariable("LOCALAPPDATA")?.Trim();
            var baseDir = !string.IsNullOrEmpty(localApp)
                ? localApp
                : Path.Combine(GetHomeDir(), "AppData", "Local");
            return Path.Combine(baseDir, "Ombra", "engines");
        }

        var xdg = Environment.GetEnvironmentVariable("XDG_DATA_HOME")?.Trim();
        var linuxBase = !string.IsNullOrEmpty(xdg) && Path.IsPathRooted(xdg)
            ? xdg
            : Path.Combine(GetHomeDir(), ".local", "share");
        return Path.Combine(linuxBase, "Ombra", "engines");
    }

    public static string? GetBinaryPathOverride()
    {
        var raw = Environment.GetEnvironmentVariable("OMBRA_BINARY_PATH")?.Trim();
        return string.IsNullOrEmpty(raw) ? null : Path.GetFullPath(ExpandTilde(raw));
    }

    public static string? GetDownloadBaseUrl()
    {
        var raw = Environment.GetEnvironmentVariable("OMBRA_DOWNLOAD_URL");
        if (raw is null)
        {
            return DefaultDownloadUrl;
        }

        var trimmed = raw.Trim();
        if (string.IsNullOrEmpty(trimmed) ||
            trimmed.Equals("0", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("false", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("off", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("none", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return trimmed.TrimEnd('/');
    }

    private static bool EnvTruthy(string name, bool defaultValue)
    {
        var raw = Environment.GetEnvironmentVariable(name)?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(raw))
        {
            return defaultValue;
        }

        return raw switch
        {
            "1" or "true" or "yes" or "on" => true,
            "0" or "false" or "no" or "off" => false,
            _ => defaultValue,
        };
    }

    public static bool GetAutoUpdate() => EnvTruthy("OMBRA_AUTO_UPDATE", true);

    public static bool SkipChecksumEnabled() => EnvTruthy("OMBRA_SKIP_CHECKSUM", false);

    public static string GetReleaseChannel(string? explicitChannel = null)
    {
        var raw = (explicitChannel ?? Environment.GetEnvironmentVariable("OMBRA_RELEASE_CHANNEL") ?? "stable")
            .Trim()
            .ToLowerInvariant();
        if (string.IsNullOrEmpty(raw) || raw == "stable")
        {
            return "stable";
        }

        if (raw is "beta" or "preview")
        {
            return "beta";
        }

        throw new InvalidOptionException(
            $"Unsupported release channel '{raw}'; expected 'stable' or 'beta'.",
            new Dictionary<string, object?> { ["channel"] = raw });
    }

    public static string? NormalizeRequestedVersion(string? explicitVersion = null)
    {
        var raw = (explicitVersion ?? Environment.GetEnvironmentVariable("OMBRA_VERSION") ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(raw) || raw.Equals("latest", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var match = VersionPinRegex().Match(raw);
        if (!match.Success)
        {
            throw new InvalidOptionException(
                $"Invalid engine version pin '{raw}'; expected '<a.b.c.d>' or '<a.b.c.d>-<N>' (for example '158.0.8127.37' or '158.0.8127.37-3').",
                new Dictionary<string, object?> { ["version"] = raw });
        }

        return match.Groups[1].Value;
    }

    public static int GetTimeoutMs(int? explicitTimeoutMs = null)
    {
        int value;
        if (explicitTimeoutMs.HasValue)
        {
            value = explicitTimeoutMs.Value;
        }
        else
        {
            var envRaw = Environment.GetEnvironmentVariable("OMBRA_TIMEOUT_MS")?.Trim();
            if (!string.IsNullOrEmpty(envRaw))
            {
                if (!int.TryParse(envRaw, out value))
                {
                    throw new InvalidOptionException(
                        $"OMBRA_TIMEOUT_MS must be an integer in milliseconds, got '{envRaw}'.");
                }
            }
            else
            {
                value = DefaultTimeoutMs;
            }
        }

        if (value < MinTimeoutMs || value > MaxTimeoutMs)
        {
            throw new InvalidOptionException(
                $"TimeoutMs must be between {MinTimeoutMs} and {MaxTimeoutMs}, got {value}.",
                new Dictionary<string, object?> { ["timeoutMs"] = value });
        }

        return value;
    }

    public static (string? Key, string Source) ResolveLicenseKey(string? explicitKey = null)
    {
        if (explicitKey is not null)
        {
            if (string.IsNullOrWhiteSpace(explicitKey))
            {
                throw new InvalidOptionException("LicenseKey must be a non-empty string.");
            }

            return (NormalizeLicenseKey(explicitKey), "param");
        }

        var envKey = Environment.GetEnvironmentVariable("OMBRA_LICENSE_KEY");
        if (!string.IsNullOrWhiteSpace(envKey))
        {
            return (NormalizeLicenseKey(envKey), "env");
        }

        foreach (var candidate in GetLicenseKeyPaths())
        {
            try
            {
                if (File.Exists(candidate))
                {
                    var text = File.ReadAllText(candidate, Encoding.UTF8);
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        return (NormalizeLicenseKey(text), "file");
                    }
                }
            }
            catch (IOException)
            {
                // Ignore unreadable license file; engine reports license state if required.
            }
            catch (UnauthorizedAccessException)
            {
            }
        }

        return (null, "none");
    }

    private static IReadOnlyList<string> GetLicenseKeyPaths()
    {
        var primary = Path.Combine(GetCacheDir(), "license.key");
        var fallback = Path.Combine(GetHomeDir(), ".ombra", "license.key");
        return string.Equals(primary, fallback, StringComparison.Ordinal)
            ? [primary]
            : [primary, fallback];
    }

    internal static string NormalizeLicenseKey(string raw)
    {
        var cleaned = raw.Trim(' ', '\t', '\r', '\n', '\ufeff');
        if (string.IsNullOrEmpty(cleaned) || cleaned.Length > 512 ||
            cleaned.Any(ch => char.IsWhiteSpace(ch) || ch < 32))
        {
            throw new InvalidOptionException("Invalid license key format.");
        }

        return cleaned;
    }

    public static bool IsLoopbackHost(string? host)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            return false;
        }

        var cleaned = host.Trim().ToLowerInvariant().Trim('[', ']');
        return cleaned is "127.0.0.1" or "localhost" or "::1";
    }

    public static string ResolveRealPath(string path)
    {
        var full = Path.GetFullPath(path);
        try
        {
            var info = File.Exists(full) ? (FileSystemInfo)new FileInfo(full) : new DirectoryInfo(full);
            var resolved = info.ResolveLinkTarget(returnFinalTarget: true);
            return resolved is not null ? Path.GetFullPath(resolved.FullName) : full;
        }
        catch (IOException)
        {
            return full;
        }
        catch (UnauthorizedAccessException)
        {
            return full;
        }
    }

    public static IReadOnlyList<string> BinaryCandidatesInDir(string baseDir, string systemName)
    {
        List<string> candidates;
        if (systemName == "Darwin")
        {
            candidates =
            [
                Path.Combine(baseDir, "Ombra.app", "Contents", "MacOS", "Ombra"),
                Path.Combine(baseDir, "Chromium.app", "Contents", "MacOS", "Chromium"),
                Path.Combine(baseDir, "Ombra.app", "Contents", "MacOS", "Chromium"),
                Path.Combine(baseDir, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
            ];
        }
        else
        {
            string[] names = systemName == "Windows"
                ? ["ombra.exe", "chrome.exe"]
                : ["ombra", "chrome", "chromium"];
            candidates =
            [
                .. names.Select(n => Path.Combine(baseDir, n)),
                .. names.Select(n => Path.Combine(baseDir, "Chromium", n)),
            ];
        }

        var existingRealPaths = new HashSet<string>(
            OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                existingRealPaths.Add(ResolveRealPath(candidate));
            }
        }

        if (existingRealPaths.Count > 1)
        {
            throw new ChecksumMismatchException(
                $"Ambiguous engine executables under {baseDir}. Reinstall the engine.");
        }

        return candidates;
    }
}
