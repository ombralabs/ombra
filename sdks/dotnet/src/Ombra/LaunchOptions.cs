using System.Text.Json.Serialization;
using Microsoft.Playwright;

namespace OmbraLabs.Ombra;

/// <summary>
/// Launch configuration accepted by <see cref="Ombra.LaunchAsync"/> (SDK contract v0.2 §4).
/// </summary>
public class LaunchOptions
{
    public bool Headless { get; set; } = true;

    /// <summary>Native mobile page layout on the host OS (whole CSS pixels 1..10000).</summary>
    public ViewportDimensions? MobileViewport { get; set; }

    public ProxyOption? Proxy { get; set; }

    public Fingerprint? Fingerprint { get; set; }

    /// <summary>Named persistent profile under <c>OMBRA_CACHE_DIR/profiles</c>. Mutually exclusive with <see cref="UserDataDir"/>.</summary>
    public string? Profile { get; set; }

    /// <summary>Explicit profile directory. Mutually exclusive with <see cref="Profile"/>.</summary>
    public string? UserDataDir { get; set; }

    /// <summary>Extra Chromium arguments passed through unchanged.</summary>
    public IReadOnlyList<string>? Args { get; set; }

    /// <summary>Explicit path to an Ombra engine executable.</summary>
    public string? BinaryPath { get; set; }

    /// <summary>Engine version pin overriding <c>OMBRA_VERSION</c> (for example "158.0.8127.37-3").</summary>
    public string? Version { get; set; }

    /// <summary>Deadline in milliseconds for engine startup and CDP attach (1000..600000, default 30000).</summary>
    public int? TimeoutMs { get; set; }

    /// <summary>Native humanized input switch: <c>true</c>, <c>false</c>, or preset selection.</summary>
    public HumanizeOption? Humanize { get; set; }

    /// <summary>License key for legacy licensed builds (passed via environment, never logged).</summary>
    public string? LicenseKey { get; set; }

    /// <summary>Extra environment variables for the engine process.</summary>
    public IReadOnlyDictionary<string, string>? Env { get; set; }

    /// <summary>Allow downloading a missing engine binary (default <c>true</c>).</summary>
    public bool Download { get; set; } = true;
}

/// <summary>
/// Options for <see cref="Ombra.LaunchContextAsync"/>.
/// </summary>
public sealed class LaunchContextOptions : LaunchOptions
{
    public string? Locale { get; set; }

    public string? Timezone { get; set; }

    public string? TimezoneId { get; set; }

    /// <summary>Explicit Playwright context viewport override. Defaults to <see cref="ViewportSize.NoViewport"/>.</summary>
    public ViewportSize? Viewport { get; set; }

    /// <summary>Additional Playwright context options forwarded to <c>Browser.NewContextAsync</c>.</summary>
    public BrowserNewContextOptions? ContextOptions { get; set; }
}

/// <summary>
/// Options for <see cref="Ombra.LaunchPersistentContextAsync(LaunchPersistentContextOptions, CancellationToken)"/>.
/// </summary>
public sealed class LaunchPersistentContextOptions : LaunchOptions
{
    public string? Locale { get; set; }

    public string? Timezone { get; set; }

    public string? TimezoneId { get; set; }
}

/// <summary>
/// Options for <see cref="Ombra.BinaryInfo(BinaryQueryOptions)"/> and <see cref="Ombra.EnsureBinaryAsync(BinaryQueryOptions, CancellationToken)"/>.
/// </summary>
public sealed class BinaryQueryOptions
{
    public string? BinaryPath { get; set; }

    public string? Version { get; set; }

    public string? ReleaseChannel { get; set; }
}

/// <summary>
/// Result of <see cref="Ombra.BinaryInfo(BinaryQueryOptions)"/> matching <c>spec/schemas/binary-info.schema.json</c>.
/// </summary>
public sealed record BinaryInfo(
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("platform")] string Platform,
    [property: JsonPropertyName("path")] string? Path,
    [property: JsonPropertyName("installed")] bool Installed,
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("sha256")] string? Sha256);

/// <summary>
/// Runtime metadata for a browser or context launched by Ombra.
/// </summary>
public sealed record LaunchInfo(
    string BinaryPath,
    string EngineVersion,
    string ProfileDir,
    long Seed,
    int CdpPort,
    string WsUrl,
    int Pid,
    bool Crashed,
    int? ExitCode);

/// <summary>
/// Result of <see cref="Ombra.BuildLaunchOptionsAsync"/> dry-run command preview.
/// </summary>
public sealed record BuiltLaunchCommand(
    string BinaryPath,
    string EngineVersion,
    IReadOnlyList<string> Args,
    int TimeoutMs);

internal sealed class ValidatedFingerprint
{
    public long? Seed { get; init; }
    public string? Os { get; init; }
    public string? OsVersion { get; init; }
    public string? Timezone { get; init; }
    public string? Locale { get; init; }
    public ScreenOption? Screen { get; init; }
    public GpuOption? Gpu { get; init; }
    public AutoOrInt? HardwareConcurrency { get; init; }
    public AutoOrInt? DeviceMemory { get; init; }
    public bool? Noise { get; init; }
}

internal sealed class ValidatedLaunchOptions
{
    public bool Headless { get; init; } = true;
    public ViewportDimensions? MobileViewport { get; init; }
    public NormalizedProxy? Proxy { get; init; }
    public ValidatedFingerprint Fingerprint { get; init; } = new();
    public string? Profile { get; init; }
    public string? UserDataDir { get; init; }
    public IReadOnlyList<string> Args { get; init; } = [];
    public string? BinaryPath { get; init; }
    public string? Version { get; init; }
    public bool VersionExplicitlyLatest { get; init; }
    public int TimeoutMs { get; init; } = OmbraConfig.DefaultTimeoutMs;
    public HumanizeOption? Humanize { get; init; }
    public string? LicenseKey { get; init; }
    public IReadOnlyDictionary<string, string> Env { get; init; } = new Dictionary<string, string>();
    public bool Download { get; init; } = true;
}

internal static class OptionsValidator
{
    private static readonly HashSet<string> AllowedOs = new(StringComparer.Ordinal)
    {
        "macos",
        "windows",
        "linux",
    };

    private static readonly HashSet<string> AllowedHumanizePresets = new(StringComparer.Ordinal)
    {
        "default",
        "careful",
        "fast",
    };

    private static readonly HashSet<string> WarnUserArgs = new(StringComparer.Ordinal)
    {
        "--no-sandbox",
        "--disable-setuid-sandbox",
    };

    public static ValidatedLaunchOptions Validate(LaunchOptions? raw)
    {
        var opts = raw ?? new LaunchOptions();

        if (opts.Profile is not null && opts.UserDataDir is not null)
        {
            throw new InvalidOptionException("Options 'Profile' and 'UserDataDir' are mutually exclusive.");
        }

        string? profile = null;
        if (opts.Profile is not null)
        {
            if (string.IsNullOrWhiteSpace(opts.Profile))
            {
                throw new InvalidOptionException("Profile must be a non-empty string.");
            }

            profile = opts.Profile.Trim();
        }

        string? userDataDir = null;
        if (opts.UserDataDir is not null)
        {
            if (string.IsNullOrWhiteSpace(opts.UserDataDir))
            {
                throw new InvalidOptionException("UserDataDir must be a non-empty path.");
            }

            userDataDir = Path.GetFullPath(OmbraConfig.ExpandTilde(opts.UserDataDir.Trim()));
        }

        string? binaryPath = null;
        if (opts.BinaryPath is not null)
        {
            if (string.IsNullOrWhiteSpace(opts.BinaryPath))
            {
                throw new InvalidOptionException("BinaryPath must be a non-empty path.");
            }

            binaryPath = Path.GetFullPath(OmbraConfig.ExpandTilde(opts.BinaryPath.Trim()));
        }

        string? licenseKey = null;
        if (opts.LicenseKey is not null)
        {
            if (string.IsNullOrWhiteSpace(opts.LicenseKey))
            {
                throw new InvalidOptionException("LicenseKey must be a non-empty string.");
            }

            licenseKey = OmbraConfig.NormalizeLicenseKey(opts.LicenseKey);
        }

        var versionExplicitlyLatest = opts.Version is not null &&
            opts.Version.Trim().Equals("latest", StringComparison.OrdinalIgnoreCase);
        var normalizedVersion = opts.Version is null
            ? OmbraConfig.NormalizeRequestedVersion(null)
            : versionExplicitlyLatest
                ? null
                : OmbraConfig.NormalizeRequestedVersion(opts.Version);

        var proxy = ProxyParser.Parse(opts.Proxy);
        var fingerprint = ValidateFingerprint(opts.Fingerprint);
        var mobileViewport = ValidateMobileViewport(opts.MobileViewport);
        if (mobileViewport is not null)
        {
            ProfileStore.CheckMobileViewportOs(fingerprint.Os, userDataDir, profile);
        }

        var env = new Dictionary<string, string>(StringComparer.Ordinal);
        if (opts.Env is not null)
        {
            foreach (var (key, value) in opts.Env)
            {
                if (key is null || value is null)
                {
                    throw new InvalidOptionException("Env keys and values must all be non-null strings.");
                }

                env[key] = value;
            }
        }

        return new ValidatedLaunchOptions
        {
            Headless = opts.Headless,
            MobileViewport = mobileViewport,
            Proxy = proxy,
            Fingerprint = fingerprint,
            Profile = profile,
            UserDataDir = userDataDir,
            Args = ValidateExtraArgs(opts.Args),
            BinaryPath = binaryPath,
            Version = normalizedVersion,
            VersionExplicitlyLatest = versionExplicitlyLatest,
            TimeoutMs = OmbraConfig.GetTimeoutMs(opts.TimeoutMs),
            Humanize = ValidateHumanize(opts.Humanize),
            LicenseKey = licenseKey,
            Env = env,
            Download = opts.Download,
        };
    }

    private static ValidatedFingerprint ValidateFingerprint(Fingerprint? raw)
    {
        if (raw is null)
        {
            return new ValidatedFingerprint();
        }

        if (raw.Seed.HasValue && raw.Seed.Value < 0)
        {
            throw new InvalidOptionException($"Fingerprint.Seed must be >= 0, got {raw.Seed.Value}.");
        }

        if (raw.Os is not null && !AllowedOs.Contains(raw.Os))
        {
            throw new InvalidOptionException(
                $"Fingerprint.Os must be 'macos', 'windows', or 'linux', got '{raw.Os}'.");
        }

        string? osVersion = null;
        if (raw.OsVersion is not null)
        {
            if (string.IsNullOrWhiteSpace(raw.OsVersion))
            {
                throw new InvalidOptionException("Fingerprint.OsVersion must be a non-empty string.");
            }

            osVersion = raw.OsVersion.Trim();
        }

        string? timezone = null;
        if (raw.Timezone is not null)
        {
            if (string.IsNullOrWhiteSpace(raw.Timezone))
            {
                throw new InvalidOptionException("Fingerprint.Timezone must be an IANA time zone or 'auto'.");
            }

            timezone = raw.Timezone.Trim();
        }

        string? locale = null;
        if (raw.Locale is not null)
        {
            if (string.IsNullOrWhiteSpace(raw.Locale))
            {
                throw new InvalidOptionException("Fingerprint.Locale must be a BCP-47 tag or 'auto'.");
            }

            locale = raw.Locale.Trim();
        }

        ScreenOption? screen = null;
        if (raw.Screen is not null)
        {
            if (raw.Screen.IsAuto)
            {
                screen = ScreenOption.Auto;
            }
            else
            {
                if (raw.Screen.Width < 320)
                {
                    throw new InvalidOptionException(
                        $"Fingerprint.Screen.Width must be >= 320, got {raw.Screen.Width}.");
                }

                if (raw.Screen.Height < 240)
                {
                    throw new InvalidOptionException(
                        $"Fingerprint.Screen.Height must be >= 240, got {raw.Screen.Height}.");
                }

                screen = new ScreenOption(raw.Screen.Width, raw.Screen.Height);
            }
        }

        GpuOption? gpu = null;
        if (raw.Gpu is not null)
        {
            if (raw.Gpu.IsAuto)
            {
                gpu = GpuOption.Auto;
            }
            else
            {
                if (raw.Gpu.Vendor is null || raw.Gpu.Renderer is null)
                {
                    throw new InvalidOptionException("Fingerprint.Gpu requires non-null Vendor and Renderer.");
                }

                gpu = new GpuOption(raw.Gpu.Vendor, raw.Gpu.Renderer);
            }
        }

        AutoOrInt? hardwareConcurrency = null;
        if (raw.HardwareConcurrency.HasValue)
        {
            var hc = raw.HardwareConcurrency.Value;
            if (!hc.IsAuto && hc.Value < 1)
            {
                throw new InvalidOptionException(
                    $"Fingerprint.HardwareConcurrency must be >= 1, got {hc.Value}.");
            }

            hardwareConcurrency = hc;
        }

        AutoOrInt? deviceMemory = null;
        if (raw.DeviceMemory.HasValue)
        {
            var mem = raw.DeviceMemory.Value;
            if (!mem.IsAuto && mem.Value < 1)
            {
                throw new InvalidOptionException(
                    $"Fingerprint.DeviceMemory must be >= 1, got {mem.Value}.");
            }

            deviceMemory = mem;
        }

        return new ValidatedFingerprint
        {
            Seed = raw.Seed,
            Os = raw.Os,
            OsVersion = osVersion,
            Timezone = timezone,
            Locale = locale,
            Screen = screen,
            Gpu = gpu,
            HardwareConcurrency = hardwareConcurrency,
            DeviceMemory = deviceMemory,
            Noise = raw.Noise,
        };
    }

    private static ViewportDimensions? ValidateMobileViewport(ViewportDimensions? raw)
    {
        if (raw is null)
        {
            return null;
        }

        if (raw.Width is < 1 or > 10_000)
        {
            throw new InvalidOptionException(
                $"MobileViewport.Width must be between 1 and 10000, got {raw.Width}.");
        }

        if (raw.Height is < 1 or > 10_000)
        {
            throw new InvalidOptionException(
                $"MobileViewport.Height must be between 1 and 10000, got {raw.Height}.");
        }

        return raw;
    }

    private static HumanizeOption? ValidateHumanize(HumanizeOption? raw)
    {
        if (raw is null)
        {
            return null;
        }

        if (!raw.Enabled)
        {
            return HumanizeOption.Off;
        }

        if (raw.Preset is not null)
        {
            if (!AllowedHumanizePresets.Contains(raw.Preset))
            {
                throw new InvalidOptionException(
                    $"Humanize.Preset must be 'default', 'careful', or 'fast', got '{raw.Preset}'.");
            }

            return new HumanizeOption { Enabled = true, Preset = raw.Preset };
        }

        return HumanizeOption.On;
    }

    private static IReadOnlyList<string> ValidateExtraArgs(IReadOnlyList<string>? raw)
    {
        if (raw is null || raw.Count == 0)
        {
            return [];
        }

        var validated = new List<string>(raw.Count);
        foreach (var arg in raw)
        {
            if (arg is null)
            {
                throw new InvalidOptionException("Args must not contain null entries.");
            }

            var eq = arg.IndexOf('=');
            var key = eq == -1 ? arg : arg[..eq];
            var val = eq == -1 ? string.Empty : arg[(eq + 1)..];
            if (key == "--remote-debugging-address" && !OmbraConfig.IsLoopbackHost(val))
            {
                throw new InvalidOptionException(
                    $"CDP debugging port must remain on loopback (SI-08); refusing --remote-debugging-address={val}.");
            }

            if (WarnUserArgs.Contains(key))
            {
                OmbraLogger.Warn(
                    $"Caller explicitly passed {key} in Args; disabling Chromium sandbox reduces isolation.");
            }

            validated.Add(arg);
        }

        return validated;
    }

    public static IReadOnlyList<string> BuildEngineArgs(
        ValidatedLaunchOptions options,
        string profileDir,
        long seed,
        IReadOnlyList<string> proxyArgs,
        string? engineVersion = null,
        string? resolvedOs = null,
        string? resolvedTimezone = null,
        string? resolvedLocale = null,
        string? resolvedHumanizePreset = null)
    {
        var cmdArgs = new List<string>
        {
            $"--user-data-dir={profileDir}",
            "--remote-debugging-port=0",
            "--no-first-run",
            "--no-default-browser-check",
        };

        if (OperatingSystem.IsMacOS())
        {
            cmdArgs.Add("--use-mock-keychain");
        }

        if (!options.Args.Any(a => a.StartsWith("--window-position", StringComparison.Ordinal)))
        {
            cmdArgs.Add("--window-position=0,0");
        }

        if (options.Headless)
        {
            cmdArgs.Add("--headless=new");
        }

        if (options.MobileViewport is not null)
        {
            cmdArgs.Add($"--mobile-layout-viewport={options.MobileViewport.Width},{options.MobileViewport.Height}");
        }

        if (!string.IsNullOrEmpty(options.Profile))
        {
            var cleanLabel = new string(options.Profile.Where(ch => ch >= 32).ToArray());
            if (!string.IsNullOrEmpty(cleanLabel))
            {
                cmdArgs.Add($"--profile-label={cleanLabel}");
            }
        }

        cmdArgs.AddRange(proxyArgs);

        // Fingerprint switches (SDK contract §6)
        cmdArgs.Add($"--fingerprint={seed}");
        if (!options.Args.Any(a => a.StartsWith("--fingerprint-brand", StringComparison.Ordinal)))
        {
            cmdArgs.Add("--fingerprint-brand=chrome");
        }

        var fp = options.Fingerprint;
        var effOs = resolvedOs ?? fp.Os;
        if (!string.IsNullOrEmpty(effOs))
        {
            cmdArgs.Add($"--fingerprint-platform={effOs}");
        }

        if (!string.IsNullOrEmpty(fp.OsVersion))
        {
            cmdArgs.Add($"--fingerprint-platform-version={fp.OsVersion}");
        }

        var effTz = resolvedTimezone == "auto" ? null : resolvedTimezone;
        if (!string.IsNullOrEmpty(effTz))
        {
            cmdArgs.Add($"--fingerprint-timezone={effTz}");
        }

        var effLocale = resolvedLocale == "auto" ? null : resolvedLocale;
        if (!string.IsNullOrEmpty(effLocale))
        {
            cmdArgs.Add($"--fingerprint-locale={effLocale}");
        }

        if (fp.Screen is not null && !fp.Screen.IsAuto)
        {
            cmdArgs.Add($"--fingerprint-screen-width={fp.Screen.Width}");
            cmdArgs.Add($"--fingerprint-screen-height={fp.Screen.Height}");
            if (!options.Args.Any(a => a.StartsWith("--window-size", StringComparison.Ordinal)))
            {
                var targetOs = effOs ?? OmbraConfig.GetHostPersonaOs();
                var taskbar = targetOs == "macos" ? 95 : targetOs == "windows" ? 48 : 0;
                var minH = Math.Min(600, fp.Screen.Height);
                var winH = Math.Max(minH, fp.Screen.Height - taskbar);
                cmdArgs.Add($"--window-size={fp.Screen.Width},{winH}");
            }
        }
        else if (!options.Args.Any(a => a.StartsWith("--window-size", StringComparison.Ordinal)))
        {
            cmdArgs.Add("--window-size=1280,720");
        }

        if (fp.Gpu is not null && !fp.Gpu.IsAuto)
        {
            cmdArgs.Add($"--fingerprint-gpu-vendor={fp.Gpu.Vendor}");
            cmdArgs.Add($"--fingerprint-gpu-renderer={fp.Gpu.Renderer}");
        }

        if (fp.HardwareConcurrency is { IsAuto: false } hc)
        {
            cmdArgs.Add($"--fingerprint-hardware-concurrency={hc.Value}");
        }

        if (fp.DeviceMemory is { IsAuto: false } mem)
        {
            cmdArgs.Add($"--fingerprint-device-memory={mem.Value}");
        }

        if (fp.Noise == false)
        {
            cmdArgs.Add("--disable-fingerprint-noise");
        }

        if (!string.IsNullOrEmpty(engineVersion) &&
            !options.Args.Any(a => a.StartsWith("--fingerprint-tls-profile", StringComparison.Ordinal)))
        {
            var dot = engineVersion.IndexOf('.');
            var major = dot > 0 ? engineVersion[..dot] : engineVersion;
            if (major.Length > 0 && major.All(char.IsAsciiDigit))
            {
                cmdArgs.Add($"--fingerprint-tls-profile=chrome-{major}");
            }
        }

        // Humanize switches (SDK contract §9; engine patch 135)
        if (options.Humanize is not null)
        {
            if (!options.Humanize.Enabled)
            {
                cmdArgs.Add("--fingerprint-humanize=off");
            }
            else
            {
                cmdArgs.Add("--fingerprint-humanize=on");
                cmdArgs.Add($"--fingerprint-humanize-seed={seed}");
                var preset = options.Humanize.Preset ?? resolvedHumanizePreset;
                if (!string.IsNullOrEmpty(preset))
                {
                    cmdArgs.Add($"--fingerprint-humanize-preset={preset}");
                }
            }
        }

        cmdArgs.AddRange(options.Args);
        return cmdArgs;
    }
}
