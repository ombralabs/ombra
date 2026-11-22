namespace OmbraLabs.Ombra;

/// <summary>
/// CSS pixel dimensions (width and height).
/// </summary>
public sealed record ViewportDimensions(int Width, int Height);

/// <summary>
/// Screen metrics for <see cref="Fingerprint.Screen"/>: explicit dimensions or <see cref="Auto"/>.
/// </summary>
public sealed record ScreenOption
{
    public static ScreenOption Auto { get; } = new() { IsAuto = true };

    public bool IsAuto { get; init; }

    public int Width { get; init; }

    public int Height { get; init; }

    public ScreenOption()
    {
    }

    public ScreenOption(int width, int height)
    {
        Width = width;
        Height = height;
    }

    public static implicit operator ScreenOption(string value)
    {
        if (string.Equals(value, "auto", StringComparison.Ordinal))
        {
            return Auto;
        }

        throw new InvalidOptionException("Fingerprint.Screen string value must be \"auto\".");
    }
}

/// <summary>
/// WebGL vendor/renderer identity for <see cref="Fingerprint.Gpu"/>: explicit strings or <see cref="Auto"/>.
/// </summary>
public sealed record GpuOption
{
    public static GpuOption Auto { get; } = new() { IsAuto = true };

    public bool IsAuto { get; init; }

    public string? Vendor { get; init; }

    public string? Renderer { get; init; }

    public GpuOption()
    {
    }

    public GpuOption(string vendor, string renderer)
    {
        Vendor = vendor;
        Renderer = renderer;
    }

    public static implicit operator GpuOption(string value)
    {
        if (string.Equals(value, "auto", StringComparison.Ordinal))
        {
            return Auto;
        }

        throw new InvalidOptionException("Fingerprint.Gpu string value must be \"auto\".");
    }
}

/// <summary>
/// Integer hardware metric or <see cref="Auto"/>.
/// </summary>
public readonly record struct AutoOrInt
{
    public static AutoOrInt Auto { get; } = new(isAuto: true, value: 0);

    public bool IsAuto { get; }

    public int Value { get; }

    private AutoOrInt(bool isAuto, int value)
    {
        IsAuto = isAuto;
        Value = value;
    }

    public AutoOrInt(int value)
    {
        IsAuto = false;
        Value = value;
    }

    public static implicit operator AutoOrInt(int value) => new(value);

    public static implicit operator AutoOrInt(string value)
    {
        if (string.Equals(value, "auto", StringComparison.Ordinal))
        {
            return Auto;
        }

        throw new InvalidOptionException($"Expected an integer or \"auto\", got '{value}'.");
    }
}

/// <summary>
/// Typed facade over Ombra Chromium's persona flags (SDK contract §6).
/// </summary>
public sealed class Fingerprint
{
    public long? Seed { get; set; }

    /// <summary>Target OS persona: "macos", "windows", or "linux".</summary>
    public string? Os { get; set; }

    public string? OsVersion { get; set; }

    /// <summary>IANA time zone (for example "Europe/Berlin") or "auto".</summary>
    public string? Timezone { get; set; }

    /// <summary>BCP-47 language tag (for example "de-DE") or "auto".</summary>
    public string? Locale { get; set; }

    public ScreenOption? Screen { get; set; }

    public GpuOption? Gpu { get; set; }

    public AutoOrInt? HardwareConcurrency { get; set; }

    public AutoOrInt? DeviceMemory { get; set; }

    /// <summary>Enable/disable fingerprint noise (<c>false</c> passes <c>--disable-fingerprint-noise</c>).</summary>
    public bool? Noise { get; set; }
}

/// <summary>
/// Launch-time switch over Ombra Chromium's native humanized input (SDK contract §9).
/// Supports implicit conversion from <see cref="bool"/> (<c>Humanize = true</c>, <c>Humanize = false</c>)
/// or preset selection (<c>new HumanizeOption { Preset = "careful" }</c>, <see cref="Careful"/>).
/// </summary>
public sealed record HumanizeOption
{
    public static HumanizeOption Off { get; } = new() { Enabled = false };
    public static HumanizeOption On { get; } = new() { Enabled = true };
    public static HumanizeOption Default { get; } = new() { Enabled = true, Preset = "default" };
    public static HumanizeOption Careful { get; } = new() { Enabled = true, Preset = "careful" };
    public static HumanizeOption Fast { get; } = new() { Enabled = true, Preset = "fast" };

    public bool Enabled { get; init; } = true;

    /// <summary>Optional preset: "default", "careful", or "fast".</summary>
    public string? Preset { get; init; }

    public static implicit operator HumanizeOption(bool enabled) => enabled ? On : Off;
}

/// <summary>
/// Proxy configuration accepting a URL string (via implicit conversion), contract fields
/// (<see cref="Type"/>, <see cref="Host"/>, <see cref="Port"/>), or Playwright-style <see cref="Server"/>.
/// </summary>
public sealed class ProxyOption
{
    /// <summary>Raw proxy URL (for example "socks5://user:pass@proxy:1080" or "http://proxy:8080").</summary>
    public string? Server { get; set; }

    /// <summary>Proxy scheme: "http", "https", or "socks5".</summary>
    public string? Type { get; set; }

    public string? Host { get; set; }

    public int? Port { get; set; }

    public string? Username { get; set; }

    public string? Password { get; set; }

    public string? Bypass { get; set; }

    public static implicit operator ProxyOption(string url) => new() { Server = url };
}
