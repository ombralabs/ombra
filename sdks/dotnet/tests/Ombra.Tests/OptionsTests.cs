using System.Text.Json;
using OmbraLabs.Ombra;
using Xunit;

namespace OmbraTests;

[Collection("OmbraEnv")]
public sealed class OptionsTests
{
    [Fact]
    public void RejectsMutuallyExclusiveProfileAndUserDataDir()
    {
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Profile = "shop", UserDataDir = "/tmp/dir" }));
    }

    [Fact]
    public void ValidatesFingerprintBoundsAndTimeout()
    {
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Fingerprint = new Fingerprint { Seed = -1 } }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Fingerprint = new Fingerprint { Os = "android" } }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Fingerprint = new Fingerprint { Screen = new ScreenOption(200, 600) } }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Fingerprint = new Fingerprint { Screen = new ScreenOption(800, 100) } }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Fingerprint = new Fingerprint { HardwareConcurrency = 0 } }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Fingerprint = new Fingerprint { DeviceMemory = 0 } }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { TimeoutMs = 500 }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { TimeoutMs = 700_000 }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Humanize = new HumanizeOption { Preset = "turbo" } }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Version = "not-a-version" }));
        Assert.Throws<InvalidOptionException>(() =>
            OptionsValidator.Validate(new LaunchOptions { Args = ["--remote-debugging-address=0.0.0.0"] }));
    }

    [Fact]
    public async Task BuildsCoherentEngineCliSwitchesAndValidatesPins()
    {
        using var env = new IsolatedEnv();
        var bin = TestFixtures.MakeFakeEngine(env.TmpRoot, version: "151.0.7922.108-7");

        var built = await Ombra.BuildLaunchOptionsAsync(new LaunchOptions
        {
            BinaryPath = bin,
            Version = " 151.0.7922.108-7 ",
            Headless = false,
            Profile = "acct-main",
            Fingerprint = new Fingerprint
            {
                Seed = 424242,
                Os = "macos",
                OsVersion = "14.5",
                Timezone = "Europe/Berlin",
                Locale = "de-DE",
                Screen = new ScreenOption(1440, 900),
                Gpu = new GpuOption("Apple Inc.", "Apple M3"),
                HardwareConcurrency = 8,
                DeviceMemory = 16,
                Noise = false,
            },
            Humanize = HumanizeOption.Careful,
        });

        Assert.Equal(bin, built.BinaryPath);
        Assert.Equal("151.0.7922.108-7", built.EngineVersion);
        Assert.Contains("--fingerprint=424242", built.Args);
        Assert.Contains("--fingerprint-brand=chrome", built.Args);
        Assert.Contains("--fingerprint-platform=macos", built.Args);
        Assert.Contains("--fingerprint-platform-version=14.5", built.Args);
        Assert.Contains("--fingerprint-timezone=Europe/Berlin", built.Args);
        Assert.Contains("--fingerprint-locale=de-DE", built.Args);
        Assert.Contains("--fingerprint-screen-width=1440", built.Args);
        Assert.Contains("--fingerprint-screen-height=900", built.Args);
        Assert.Contains("--window-position=0,0", built.Args);
        Assert.Contains("--window-size=1440,805", built.Args); // 900 - 95 macOS dock/menubar
        Assert.Contains("--fingerprint-gpu-vendor=Apple Inc.", built.Args);
        Assert.Contains("--fingerprint-gpu-renderer=Apple M3", built.Args);
        Assert.Contains("--fingerprint-hardware-concurrency=8", built.Args);
        Assert.Contains("--fingerprint-device-memory=16", built.Args);
        Assert.Contains("--fingerprint-tls-profile=chrome-151", built.Args);
        Assert.Contains("--disable-fingerprint-noise", built.Args);
        Assert.Contains("--fingerprint-humanize=on", built.Args);
        Assert.Contains("--fingerprint-humanize-seed=424242", built.Args);
        Assert.Contains("--fingerprint-humanize-preset=careful", built.Args);
        Assert.Contains("--profile-label=acct-main", built.Args);
        Assert.DoesNotContain("--headless=new", built.Args);

        await Assert.ThrowsAsync<UnsupportedEngineException>(() =>
            Ombra.BuildLaunchOptionsAsync(new LaunchOptions { BinaryPath = bin, Version = "151.0.7922.108-9" }));

        Environment.SetEnvironmentVariable("OMBRA_VERSION", "151.0.7922.108-9");
        var latestOverride = await Ombra.BuildLaunchOptionsAsync(new LaunchOptions
        {
            BinaryPath = bin,
            Version = " latest ",
        });
        Assert.Equal("151.0.7922.108-7", latestOverride.EngineVersion);
    }

    [Fact]
    public void ComputesWindowsWindowSizeAndHumanizeOff()
    {
        var validated = OptionsValidator.Validate(new LaunchOptions
        {
            Fingerprint = new Fingerprint
            {
                Os = "windows",
                Screen = new ScreenOption(1920, 1080),
            },
            Humanize = false,
        });

        var args = OptionsValidator.BuildEngineArgs(
            validated,
            profileDir: "/tmp/p",
            seed: 10000,
            proxyArgs: [],
            resolvedOs: "windows");

        Assert.Contains("--window-size=1920,1032", args); // 1080 - 48 taskbar
        Assert.Contains("--fingerprint-humanize=off", args);
        Assert.Contains("--headless=new", args);
    }

    [Fact]
    public async Task MobileViewportValidatesDimensionsAndHostOsWithoutMutatingSavedProfile()
    {
        using var env = new IsolatedEnv();
        var bin = TestFixtures.MakeFakeEngine(env.TmpRoot);
        var hostOs = OmbraConfig.GetHostPersonaOs();
        var otherOs = hostOs == "linux" ? "macos" : "linux";

        var okCmd = await Ombra.BuildLaunchOptionsAsync(new LaunchOptions
        {
            BinaryPath = bin,
            Download = false,
            MobileViewport = new ViewportDimensions(390, 844),
            Fingerprint = new Fingerprint { Os = hostOs },
        });
        Assert.Contains("--mobile-layout-viewport=390,844", okCmd.Args);

        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            Ombra.BuildLaunchOptionsAsync(new LaunchOptions
            {
                BinaryPath = bin,
                Download = false,
                MobileViewport = new ViewportDimensions(0, 844),
            }));
        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            Ombra.BuildLaunchOptionsAsync(new LaunchOptions
            {
                BinaryPath = bin,
                Download = false,
                MobileViewport = new ViewportDimensions(390, 10001),
            }));
        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            Ombra.BuildLaunchOptionsAsync(new LaunchOptions
            {
                BinaryPath = bin,
                Download = false,
                MobileViewport = new ViewportDimensions(390, 844),
                Fingerprint = new Fingerprint { Os = otherOs },
            }));

        // Saved profile with non-native OS is rejected before rewriting profile.json
        var profileDir = Path.Combine(env.TmpRoot, "saved-other-os");
        var metaFile = Path.Combine(profileDir, ".ombra", "profile.json");
        Directory.CreateDirectory(Path.GetDirectoryName(metaFile)!);
        var originalJson = JsonSerializer.Serialize(new { seed = 43210, os = otherOs });
        File.WriteAllText(metaFile, originalJson);

        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            Ombra.BuildLaunchOptionsAsync(new LaunchOptions
            {
                BinaryPath = bin,
                Download = false,
                UserDataDir = profileDir,
                MobileViewport = new ViewportDimensions(390, 844),
            }));
        Assert.Equal(originalJson, File.ReadAllText(metaFile));
    }

    [Fact]
    public void RedactsSecretsInMessagesAndExceptionDetails()
    {
        var raw =
            "Failed http://alice:s3cr3t@proxy.example.com:8080 and socks5://bob@1.2.3.4:1080 " +
            "OMBRA_LICENSE_KEY=lic_live_123456789 Authorization: Bearer tok_abcdef " +
            "ws://127.0.0.1:9222/devtools/browser/sess-secret-token customSecret99";

        var redacted = SecretRedactor.Redact(raw, ["customSecret99"]);
        Assert.Contains("http://***:***@proxy.example.com:8080", redacted);
        Assert.Contains("socks5://***@1.2.3.4:1080", redacted);
        Assert.Contains("OMBRA_LICENSE_KEY=***", redacted);
        Assert.Contains("Authorization: Bearer ***", redacted);
        Assert.Contains("/devtools/browser/***", redacted);
        Assert.DoesNotContain("alice", redacted);
        Assert.DoesNotContain("s3cr3t", redacted);
        Assert.DoesNotContain("bob", redacted);
        Assert.DoesNotContain("lic_live_123456789", redacted);
        Assert.DoesNotContain("tok_abcdef", redacted);
        Assert.DoesNotContain("sess-secret-token", redacted);
        Assert.DoesNotContain("customSecret99", redacted);

        var ex = new ProxyException(
            "Proxy failed for http://user:pw@host:8080",
            new Dictionary<string, object?> { ["password"] = "rawpass", ["url"] = "http://user:pw@host:8080" },
            ["pw"]);
        Assert.Equal(ErrorKind.ProxyError, ex.Kind);
        Assert.Equal("***", ex.Details["password"]);
        Assert.DoesNotContain("pw", ex.Message);
        Assert.DoesNotContain("pw", ex.Details["url"]?.ToString());
    }
}
