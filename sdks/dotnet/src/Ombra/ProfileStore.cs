using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace OmbraLabs.Ombra;

internal sealed class FileLockBusyException : Exception
{
    public FileLockBusyException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}

/// <summary>
/// Cross-process + same-process OS file lock handle that keeps the lock file inode intact.
/// </summary>
internal sealed class OsFileLock : IDisposable
{
    private static readonly object Guard = new();
    private static readonly HashSet<string> ActivePaths = new(
        OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);

    private readonly string _canonicalPath;
    private FileStream? _stream;
    private bool _released;

    public FileStream Stream => _stream ?? throw new ObjectDisposedException(nameof(OsFileLock));

    private OsFileLock(string canonicalPath, FileStream stream)
    {
        _canonicalPath = canonicalPath;
        _stream = stream;
    }

    public static OsFileLock Acquire(string lockFilePath)
    {
        var dir = Path.GetDirectoryName(lockFilePath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var canonical = OmbraConfig.ResolveRealPath(lockFilePath);
        lock (Guard)
        {
            if (!ActivePaths.Add(canonical))
            {
                throw new FileLockBusyException($"Lock file is already held by this process: {lockFilePath}");
            }
        }

        try
        {
            // FileShare.None acquires an exclusive non-blocking flock on Unix (interoperable with
            // Python fcntl.flock / Node fs-ext) and an exclusive handle lock on Windows.
            var stream = new FileStream(
                lockFilePath,
                FileMode.OpenOrCreate,
                FileAccess.ReadWrite,
                FileShare.None);
            return new OsFileLock(canonical, stream);
        }
        catch (IOException ex)
        {
            lock (Guard)
            {
                ActivePaths.Remove(canonical);
            }

            throw new FileLockBusyException($"Lock file is busy: {lockFilePath}", ex);
        }
        catch
        {
            lock (Guard)
            {
                ActivePaths.Remove(canonical);
            }

            throw;
        }
    }

    public void Dispose()
    {
        if (_released)
        {
            return;
        }

        _released = true;
        try
        {
            _stream?.Dispose();
        }
        catch (IOException)
        {
        }
        finally
        {
            _stream = null;
            lock (Guard)
            {
                ActivePaths.Remove(_canonicalPath);
            }
        }
    }
}

internal sealed class ProfileMetadata
{
    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Name { get; set; }

    [JsonPropertyName("seed")]
    public long Seed { get; set; }

    [JsonPropertyName("os")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Os { get; set; }

    [JsonPropertyName("timezone")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Timezone { get; set; }

    [JsonPropertyName("locale")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Locale { get; set; }

    [JsonPropertyName("humanize_preset")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? HumanizePreset { get; set; }

    [JsonPropertyName("created_at")]
    public string CreatedAt { get; set; } = string.Empty;

    [JsonPropertyName("updated_at")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? UpdatedAt { get; set; }

    [JsonPropertyName("engine_version")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? EngineVersion { get; set; }
}

internal sealed class ProfileLease : IDisposable
{
    private readonly Action _release;
    private bool _disposed;

    public string Path { get; }
    public string? Name { get; }
    public long Seed { get; }
    public bool Ephemeral { get; }
    public string? OsHint { get; }
    public string? Timezone { get; }
    public string? Locale { get; }
    public string? HumanizePreset { get; }

    public ProfileLease(
        string path,
        string? name,
        long seed,
        bool ephemeral,
        string? osHint,
        string? timezone,
        string? locale,
        string? humanizePreset,
        Action release)
    {
        Path = path;
        Name = name;
        Seed = seed;
        Ephemeral = ephemeral;
        OsHint = osHint;
        Timezone = timezone;
        Locale = locale;
        HumanizePreset = humanizePreset;
        _release = release;
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _release();
    }
}

internal static partial class ProfileStore
{
    private const string MetaDir = ".ombra";
    private const string MetaFile = "profile.json";
    private const string LockFile = "profile.lock";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = false,
    };

    [GeneratedRegex(@"[^a-z0-9_-]+")]
    private static partial Regex UnsafeSlugRegex();

    [GeneratedRegex(@"-{2,}")]
    private static partial Regex MultiDashRegex();

    /// <summary>
    /// Generate a 53-bit CSPRNG persona seed safe across JSON, JS, Python, and 64-bit engines.
    /// </summary>
    public static long GenerateSeed()
    {
        const ulong mask = 0x001F_FFFF_FFFF_FFFFUL;
        Span<byte> bytes = stackalloc byte[8];
        while (true)
        {
            RandomNumberGenerator.Fill(bytes);
            var candidate = BitConverter.ToUInt64(bytes) & mask;
            if (candidate >= 10_000UL)
            {
                return (long)candidate;
            }
        }
    }

    internal static string RawSlug(string name)
    {
        var lowered = name.Trim().ToLowerInvariant();
        var cleaned = UnsafeSlugRegex().Replace(lowered, "-");
        cleaned = MultiDashRegex().Replace(cleaned, "-").Trim('-');
        return string.IsNullOrEmpty(cleaned) ? "profile" : cleaned;
    }

    private static string MetaPath(string profileDir) => Path.Combine(profileDir, MetaDir, MetaFile);

    private static string LockPath(string profileDir) => Path.Combine(profileDir, MetaDir, LockFile);

    public static ProfileMetadata? ReadProfileMetadata(string profileDir)
    {
        var path = MetaPath(profileDir);
        try
        {
            if (!File.Exists(path))
            {
                return null;
            }

            var raw = File.ReadAllText(path, Encoding.UTF8);
            return JsonSerializer.Deserialize<ProfileMetadata>(raw, JsonOptions);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return null;
        }
    }

    public static void WriteProfileMetadata(string profileDir, ProfileMetadata data)
    {
        var target = MetaPath(profileDir);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        var tmp = $"{target}.{Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant()}.tmp";
        var payload = JsonSerializer.Serialize(data, JsonOptions) + "\n";
        try
        {
            File.WriteAllText(tmp, payload, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
            if (!OperatingSystem.IsWindows())
            {
                File.SetUnixFileMode(tmp, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            }

            File.Move(tmp, target, overwrite: true);
        }
        catch
        {
            try
            {
                File.Delete(tmp);
            }
            catch (IOException)
            {
            }

            throw;
        }
    }

    public static string ResolveNamedProfileDir(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOptionException("Profile must be a non-empty string.");
        }

        var profilesRoot = OmbraConfig.GetProfilesDir();
        var baseSlug = RawSlug(name);

        if (Directory.Exists(profilesRoot))
        {
            var entries = Directory.GetDirectories(profilesRoot)
                .Select(Path.GetFileName)
                .Where(n => n is not null)
                .OrderBy(n => n, StringComparer.Ordinal);

            foreach (var entry in entries)
            {
                if (entry != baseSlug && !entry!.StartsWith($"{baseSlug}-", StringComparison.Ordinal))
                {
                    continue;
                }

                var candidate = Path.Combine(profilesRoot, entry!);
                if (ReadProfileMetadata(candidate)?.Name == name)
                {
                    return candidate;
                }
            }
        }

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(name));
        var suffix = Convert.ToHexString(hashBytes)[..8].ToLowerInvariant();
        for (var attempt = 0; ; attempt++)
        {
            var slug = attempt == 0
                ? baseSlug
                : attempt == 1
                    ? $"{baseSlug}-{suffix}"
                    : $"{baseSlug}-{suffix}-{attempt}";
            var candidate = Path.Combine(profilesRoot, slug);
            var existing = ReadProfileMetadata(candidate);
            if (existing is null || existing.Name is null || existing.Name == name)
            {
                return candidate;
            }
        }
    }

    public static void CheckMobileViewportOs(string? osHint, string? userDataDir = null, string? profile = null)
    {
        if (osHint is null)
        {
            var profileDir = profile is not null ? ResolveNamedProfileDir(profile) : userDataDir;
            if (profileDir is not null)
            {
                var savedOs = ReadProfileMetadata(profileDir)?.Os;
                if (!string.IsNullOrWhiteSpace(savedOs))
                {
                    osHint = savedOs.Trim();
                }
            }
        }

        if (osHint is not null)
        {
            var hostOs = OmbraConfig.GetHostPersonaOs();
            if (!string.Equals(osHint, hostOs, StringComparison.Ordinal))
            {
                throw new InvalidOptionException(
                    $"MobileViewport requires the host OS ({hostOs}). This profile uses fingerprint.os='{osHint}'.");
            }
        }
    }

    private static string? GetProcessStartTime(int pid)
    {
        if (OperatingSystem.IsLinux())
        {
            try
            {
                var statText = File.ReadAllText($"/proc/{pid}/stat", Encoding.UTF8);
                var rparen = statText.LastIndexOf(')');
                if (rparen != -1)
                {
                    var fields = statText[(rparen + 2)..].Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (fields.Length > 19)
                    {
                        return fields[19];
                    }
                }
            }
            catch (Exception)
            {
                return null;
            }
        }

        if (!OperatingSystem.IsWindows())
        {
            try
            {
                using var proc = new Process();
                proc.StartInfo = new ProcessStartInfo("ps")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                proc.StartInfo.ArgumentList.Add("-p");
                proc.StartInfo.ArgumentList.Add(pid.ToString());
                proc.StartInfo.ArgumentList.Add("-o");
                proc.StartInfo.ArgumentList.Add("lstart=");
                proc.Start();
                var output = proc.StandardOutput.ReadToEnd().Trim();
                proc.WaitForExit(2000);
                return proc.ExitCode == 0 && !string.IsNullOrEmpty(output) ? output : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        try
        {
            using var process = Process.GetProcessById(pid);
            return process.StartTime.ToUniversalTime().ToString("O");
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static bool IsPidAlive(int pid)
    {
        if (pid <= 0)
        {
            return false;
        }

        try
        {
            using var proc = Process.GetProcessById(pid);
            return !proc.HasExited;
        }
        catch (ArgumentException)
        {
            return false;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
        catch (Exception)
        {
            return true;
        }
    }

    private static bool IsStaleLegacyLock(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            return true;
        }

        if (!root.TryGetProperty("pid", out var pidProp) || !pidProp.TryGetInt32(out var pid) || pid <= 0)
        {
            return true;
        }

        if (!IsPidAlive(pid))
        {
            return true;
        }

        if (root.TryGetProperty("process_start_time", out var startProp) &&
            startProp.ValueKind == JsonValueKind.String)
        {
            var recorded = startProp.GetString();
            if (!string.IsNullOrEmpty(recorded))
            {
                var current = GetProcessStartTime(pid);
                if (current is not null && !string.Equals(current, recorded, StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static Action AcquireProfileLock(string profileDir, string? profileName)
    {
        var lockFile = LockPath(profileDir);
        ProfileBusyException Busy() => new(
            $"Profile is locked by another running Ombra instance: {profileDir}",
            new Dictionary<string, object?> { ["profile"] = profileName, ["path"] = profileDir });

        OsFileLock fileLock;
        try
        {
            fileLock = OsFileLock.Acquire(lockFile);
        }
        catch (FileLockBusyException)
        {
            throw Busy();
        }

        var ownsPayload = false;
        try
        {
            var stream = fileLock.Stream;
            stream.Seek(0, SeekOrigin.Begin);
            using (var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true))
            {
                var contents = reader.ReadToEnd().Trim();
                if (!string.IsNullOrEmpty(contents))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(contents);
                        var isOsLock = doc.RootElement.TryGetProperty("os_lock", out var osLockProp) &&
                            osLockProp.ValueKind == JsonValueKind.True;
                        if (!isOsLock && !IsStaleLegacyLock(doc.RootElement))
                        {
                            throw Busy();
                        }
                    }
                    catch (JsonException)
                    {
                        // Stale or corrupt lock metadata; reclaim under OS lock.
                    }
                }
            }

            ownsPayload = true;
            var payload = JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                ["os_lock"] = true,
                ["pid"] = Environment.ProcessId,
                ["started_at"] = DateTimeOffset.UtcNow.ToString("O"),
                ["process_start_time"] = GetProcessStartTime(Environment.ProcessId),
            }) + "\n";
            var payloadBytes = Encoding.UTF8.GetBytes(payload);
            stream.Seek(0, SeekOrigin.Begin);
            stream.SetLength(0);
            stream.Write(payloadBytes, 0, payloadBytes.Length);
            stream.Flush(flushToDisk: true);
        }
        catch
        {
            try
            {
                if (ownsPayload)
                {
                    fileLock.Stream.SetLength(0);
                    fileLock.Stream.Flush(flushToDisk: false);
                }
            }
            catch (IOException)
            {
            }
            finally
            {
                fileLock.Dispose();
            }

            throw;
        }

        return () =>
        {
            try
            {
                fileLock.Stream.Seek(0, SeekOrigin.Begin);
                fileLock.Stream.SetLength(0);
                fileLock.Stream.Flush(flushToDisk: false);
            }
            catch (IOException)
            {
            }
            finally
            {
                fileLock.Dispose();
            }
        };
    }

    public static ProfileLease AcquireLease(
        string? profile = null,
        string? userDataDir = null,
        long? explicitSeed = null,
        string? osHint = null,
        bool requireHostOs = false,
        string? timezone = null,
        string? locale = null,
        string? humanizePreset = null,
        string? engineVersion = null)
    {
        if (profile is not null && userDataDir is not null)
        {
            throw new InvalidOptionException("Options 'Profile' and 'UserDataDir' are mutually exclusive.");
        }

        string profileDir;
        var ephemeral = false;
        if (profile is not null)
        {
            profileDir = ResolveNamedProfileDir(profile);
            Directory.CreateDirectory(profileDir);
        }
        else if (userDataDir is not null)
        {
            if (string.IsNullOrWhiteSpace(userDataDir))
            {
                throw new InvalidOptionException("UserDataDir must be a non-empty path.");
            }

            profileDir = Path.GetFullPath(OmbraConfig.ExpandTilde(userDataDir.Trim()));
            Directory.CreateDirectory(profileDir);
        }
        else
        {
            profileDir = Path.Combine(
                Path.GetTempPath(),
                $"ombra-profile-{Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLowerInvariant()}");
            Directory.CreateDirectory(profileDir);
            ephemeral = true;
        }

        Action lockRelease;
        try
        {
            while (true)
            {
                lockRelease = AcquireProfileLock(profileDir, profile);
                try
                {
                    var owner = ReadProfileMetadata(profileDir)?.Name;
                    if (profile is null || owner is null || owner == profile)
                    {
                        break;
                    }
                }
                catch
                {
                    lockRelease();
                    throw;
                }

                lockRelease();
                profileDir = ResolveNamedProfileDir(profile);
                Directory.CreateDirectory(profileDir);
            }
        }
        catch
        {
            if (ephemeral)
            {
                TryDeleteDirectory(profileDir);
            }

            throw;
        }

        var released = 0;
        void ReleaseAll()
        {
            if (Interlocked.Exchange(ref released, 1) != 0)
            {
                return;
            }

            try
            {
                lockRelease();
            }
            finally
            {
                if (ephemeral)
                {
                    TryDeleteDirectory(profileDir);
                }
            }
        }

        try
        {
            long seed;
            var effOs = osHint;
            var effTz = timezone;
            var effLocale = locale;
            var effPreset = humanizePreset;

            if (ephemeral)
            {
                seed = explicitSeed ?? GenerateSeed();
            }
            else
            {
                var existing = ReadProfileMetadata(profileDir);
                var nowIso = DateTimeOffset.UtcNow.ToString("O");
                var persistedSeed = existing is not null && existing.Seed >= 0 ? existing.Seed : (long?)null;

                if (explicitSeed.HasValue)
                {
                    seed = explicitSeed.Value;
                    if (persistedSeed.HasValue && persistedSeed.Value != explicitSeed.Value)
                    {
                        OmbraLogger.Info(
                            $"Updating persona seed for profile '{profile ?? Path.GetFileName(profileDir)}' ({persistedSeed.Value} -> {explicitSeed.Value})");
                    }
                }
                else if (persistedSeed.HasValue)
                {
                    seed = persistedSeed.Value;
                }
                else
                {
                    seed = GenerateSeed();
                }

                effOs ??= OptStr(existing?.Os);
                if (requireHostOs)
                {
                    CheckMobileViewportOs(effOs);
                }

                effTz ??= OptStr(existing?.Timezone);
                effLocale ??= OptStr(existing?.Locale);
                effPreset ??= OptStr(existing?.HumanizePreset);

                var updated = new ProfileMetadata
                {
                    Name = profile ?? existing?.Name,
                    Seed = seed,
                    Os = effOs,
                    Timezone = effTz is not null && effTz != "auto" ? effTz : null,
                    Locale = effLocale is not null && effLocale != "auto" ? effLocale : null,
                    HumanizePreset = effPreset,
                    CreatedAt = !string.IsNullOrEmpty(existing?.CreatedAt) ? existing.CreatedAt : nowIso,
                    UpdatedAt = nowIso,
                    EngineVersion = !string.IsNullOrEmpty(existing?.EngineVersion) ? existing.EngineVersion : engineVersion,
                };
                WriteProfileMetadata(profileDir, updated);
            }

            return new ProfileLease(
                profileDir,
                profile,
                seed,
                ephemeral,
                effOs,
                effTz,
                effLocale,
                effPreset,
                ReleaseAll);
        }
        catch
        {
            ReleaseAll();
            throw;
        }
    }

    private static string? OptStr(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    internal static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch (Exception)
        {
        }
    }
}
