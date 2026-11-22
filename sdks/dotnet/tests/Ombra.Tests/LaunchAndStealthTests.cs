using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using OmbraLabs.Ombra;
using Xunit;

namespace OmbraTests;

[Collection("OmbraEnv")]
public sealed class LaunchAndStealthTests
{
    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "conformance", "cases", "stealth-invariants.json")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate repository root containing conformance/cases/stealth-invariants.json");
    }

    [Fact]
    public async Task SatisfiesCanonicalStealthInvariantsOnCliFlagsAndBinaryInfo()
    {
        using var env = new IsolatedEnv();
        var bin = TestFixtures.MakeFakeEngine(env.TmpRoot);

        var info = Ombra.BinaryInfo(binaryPath: bin);
        Assert.True(info.Installed);
        Assert.Matches(@"^[a-f0-9]{64}$", info.Sha256!); // SI-12

        var built = await Ombra.BuildLaunchOptionsAsync(new LaunchOptions
        {
            BinaryPath = bin,
            Proxy = "http://proxyuser:proxypass@10.0.0.2:8080",
            LicenseKey = "lic_super_secret_999",
            Fingerprint = new Fingerprint
            {
                Os = "macos",
                Timezone = "America/Chicago",
                Locale = "en-US",
            },
        });

        var specPath = Path.Combine(FindRepoRoot(), "conformance", "cases", "stealth-invariants.json");
        using var doc = JsonDocument.Parse(File.ReadAllText(specPath));
        var invariants = doc.RootElement.GetProperty("invariants")
            .EnumerateArray()
            .ToDictionary(e => e.GetProperty("id").GetString()!, e => e);

        var joined = string.Join(" ", built.Args);

        // SI-05, SI-07, SI-11 forbidden flags
        foreach (var id in new[] { "SI-05", "SI-07", "SI-11" })
        {
            foreach (var forbidden in invariants[id].GetProperty("forbidden").EnumerateArray())
            {
                var flag = forbidden.GetString()!;
                Assert.DoesNotContain(built.Args, a => a.StartsWith(flag, StringComparison.Ordinal));
            }
        }

        // SI-06 no proxy credentials or license key on CLI
        foreach (var pat in invariants["SI-06"].GetProperty("forbidden_patterns").EnumerateArray())
        {
            Assert.DoesNotMatch(new Regex(pat.GetString()!), joined);
        }

        Assert.DoesNotContain("proxyuser", joined);
        Assert.DoesNotContain("proxypass", joined);
        Assert.DoesNotContain("lic_super_secret_999", joined);
    }

    [Fact]
    public async Task LaunchesPlaywrightWithWarmupRetryNoViewportAndCleanShutdown()
    {
        if (OperatingSystem.IsWindows())
        {
            return; // POSIX fake-engine script fixture
        }

        using var env = new IsolatedEnv();
        var bin = TestFixtures.MakeFakeEngine(env.TmpRoot);
        var harness = new FakePlaywrightHarness { FailFirstConnect = true };
        Ombra.PlaywrightFactory = harness.Factory;

        var browser = await Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            LicenseKey = "lic_test_123456",
            Env = new Dictionary<string, string> { ["FAKE_ENGINE_MODE"] = "warmup_then_ready" },
        });

        // Retried once on transient CDP connect error
        Assert.Equal(2, harness.ConnectCalls.Count);
        Assert.Matches(@"^http://127\.0\.0\.1:\d+$", harness.ConnectCalls[0].Endpoint);
        Assert.All(harness.ConnectCalls, call =>
        {
            Assert.True(call.Options?.IsLocal);
            Assert.True(call.Options?.NoDefaults);
        });

        var info = Ombra.LastLaunchInfo(browser);
        Assert.NotNull(info);
        Assert.Equal(bin, info!.BinaryPath);
        Assert.False(info.Crashed);
        Assert.True(info.CdpPort > 0);
        Ombra.CheckEngineHealth(browser);

        // Verify spawned child received OMBRA_LICENSE_KEY via env, not CLI (SI-06)
        var spawnedJson = JsonDocument.Parse(File.ReadAllText(Path.Combine(info.ProfileDir, "spawned-args.json")));
        Assert.Equal("lic_test_123456", spawnedJson.RootElement.GetProperty("envKey").GetString());
        Assert.DoesNotContain("lic_test_123456", spawnedJson.RootElement.GetProperty("args").GetRawText());

        // Default NewContextAsync and NewPageAsync inject ViewportSize.NoViewport (SI-04)
        await browser.NewContextAsync();
        Assert.Equal(-1, harness.NewContextCalls[^1]?.ViewportSize?.Width);
        Assert.Equal(-1, harness.NewContextCalls[^1]?.ViewportSize?.Height);
        await browser.NewPageAsync();
        Assert.Equal(-1, harness.NewPageCalls[^1]?.ViewportSize?.Width);
        Assert.Equal(-1, harness.NewPageCalls[^1]?.ViewportSize?.Height);

        await browser.CloseAsync();
        Assert.Equal(1, harness.PlaywrightDisposedCount);
        Assert.Contains(harness.CdpCalls, c => c.Method == "Browser.close");
        Assert.False(Directory.Exists(info.ProfileDir)); // ephemeral cleaned up

        // Also verify await using (IAsyncDisposable) + authenticated proxy relay launch without CLI credential leak
        string? authProfileDir;
        await using (var authBrowser = await Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            Proxy = "http://user1:pass1@127.0.0.1:9",
        }))
        {
            var authInfo = Ombra.LastLaunchInfo(authBrowser)!;
            authProfileDir = authInfo.ProfileDir;
            var authArgs = File.ReadAllText(Path.Combine(authProfileDir, "spawned-args.json"));
            Assert.Contains("--proxy-server=socks5://127.0.0.1:", authArgs);
            Assert.DoesNotContain("user1", authArgs);
            Assert.DoesNotContain("pass1", authArgs);
        }

        Assert.False(Directory.Exists(authProfileDir));
    }

    [Fact]
    public async Task LaunchContextAndPersistentContextRespectStealthAndProfileLockConformance()
    {
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        using var env = new IsolatedEnv();
        var bin = TestFixtures.MakeFakeEngine(env.TmpRoot);
        var harness = new FakePlaywrightHarness();
        Ombra.PlaywrightFactory = harness.Factory;

        // LaunchContextAsync routes Locale/Timezone to engine args, never Playwright Emulation (SI-04)
        var ctx = await Ombra.LaunchContextAsync(new LaunchContextOptions
        {
            BinaryPath = bin,
            Locale = "ja-JP",
            Timezone = "Asia/Tokyo",
        });
        Assert.Equal(-1, harness.NewContextCalls[^1]?.ViewportSize?.Width);
        Assert.Equal(-1, harness.NewContextCalls[^1]?.ViewportSize?.Height);
        Assert.Null(harness.NewContextCalls[^1]?.Locale);
        Assert.Null(harness.NewContextCalls[^1]?.TimezoneId);

        var ctxInfo = Ombra.LastLaunchInfo(ctx)!;
        var ctxSpawn = File.ReadAllText(Path.Combine(ctxInfo.ProfileDir, "spawned-args.json"));
        Assert.Contains("--fingerprint-locale=ja-JP", ctxSpawn);
        Assert.Contains("--fingerprint-timezone=Asia/Tokyo", ctxSpawn);

        await using (var cdp = await Ombra.CdpAsync(ctx))
        {
            var state = await cdp.GetHumanizeStateAsync();
            Assert.True(state.Enabled);
        }

        await ctx.CloseAsync();

        // Explicit viewport in ContextOptions is forwarded; top-level Viewport overrides it
        var nestedVp = new ViewportSize { Width = 713, Height = 491 };
        var ctxNested = await Ombra.LaunchContextAsync(new LaunchContextOptions
        {
            BinaryPath = bin,
            ContextOptions = new BrowserNewContextOptions { ViewportSize = nestedVp },
        });
        Assert.Equal(713, harness.NewContextCalls[^1]?.ViewportSize?.Width);
        await ctxNested.CloseAsync();

        var explicitVp = new ViewportSize { Width = 800, Height = 600 };
        var ctx2 = await Ombra.LaunchContextAsync(new LaunchContextOptions
        {
            BinaryPath = bin,
            ContextOptions = new BrowserNewContextOptions { ViewportSize = nestedVp },
            Viewport = explicitVp,
        });
        Assert.Equal(800, harness.NewContextCalls[^1]?.ViewportSize?.Width);
        await ctx2.CloseAsync();

        // Conformance case: launch-profile-lock.json
        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            Ombra.LaunchPersistentContextAsync(new LaunchPersistentContextOptions { BinaryPath = bin }));

        var first = await Ombra.LaunchPersistentContextAsync(new LaunchPersistentContextOptions
        {
            BinaryPath = bin,
            Profile = "conformance-lock",
        });
        await Assert.ThrowsAsync<ProfileBusyException>(() =>
            Ombra.LaunchPersistentContextAsync(new LaunchPersistentContextOptions
            {
                BinaryPath = bin,
                Profile = "conformance-lock",
            }));
        await first.CloseAsync();

        // Immediately reusable after CloseAsync
        var third = await Ombra.LaunchPersistentContextAsync(new LaunchPersistentContextOptions
        {
            BinaryPath = bin,
            Profile = "conformance-lock",
        });
        Assert.Equal(Ombra.LastLaunchInfo(first)!.ProfileDir, Ombra.LastLaunchInfo(third)!.ProfileDir);
        await third.CloseAsync();
    }

    [Fact]
    public async Task MapsLicenseErrorsTimeoutsNonLoopbackEarlyExitRedactionAndCrash()
    {
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        using var env = new IsolatedEnv();
        var bin = TestFixtures.MakeFakeEngine(env.TmpRoot);
        var harness = new FakePlaywrightHarness();
        Ombra.PlaywrightFactory = harness.Factory;

        // 1. 503 no_key fails fast as LicenseException
        var sw = Stopwatch.StartNew();
        var noKey = await Assert.ThrowsAsync<LicenseException>(() => Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            TimeoutMs = 10_000,
            Env = new Dictionary<string, string> { ["FAKE_ENGINE_MODE"] = "license_no_key" },
        }));
        Assert.Equal("no_key", noKey.Details["licenseState"]);
        Assert.True(sw.ElapsedMilliseconds < 5000);

        // 2. Exit code 77 -> LicenseException(invalid)
        var inv = await Assert.ThrowsAsync<LicenseException>(() => Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            Env = new Dictionary<string, string> { ["FAKE_ENGINE_MODE"] = "exit_license_invalid" },
        }));
        Assert.Equal("invalid", inv.Details["licenseState"]);

        // 3. 503 no_slot times out as LicenseException(no_slot)
        var noSlot = await Assert.ThrowsAsync<LicenseException>(() => Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            TimeoutMs = 1000,
            Env = new Dictionary<string, string> { ["FAKE_ENGINE_MODE"] = "license_no_slot" },
        }));
        Assert.Equal("no_slot", noSlot.Details["licenseState"]);

        // 4. Hang with no DevToolsActivePort -> LaunchTimeoutException
        await Assert.ThrowsAsync<LaunchTimeoutException>(() => Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            TimeoutMs = 1000,
            Env = new Dictionary<string, string> { ["FAKE_ENGINE_MODE"] = "hang_no_port" },
        }));

        // 5. Early exit redacts proxy credentials and license key from stderrTail
        var exited = await Assert.ThrowsAsync<EngineExitedException>(() => Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            LicenseKey = "lic_secret_value_777",
            Env = new Dictionary<string, string> { ["FAKE_ENGINE_MODE"] = "exit_early" },
        }));
        var tail = exited.Details["stderrTail"]?.ToString() ?? string.Empty;
        Assert.DoesNotContain("topsecret", tail);
        Assert.DoesNotContain("lic_secret_value_777", tail);
        Assert.Contains("***", tail);

        // 6. Non-loopback webSocketDebuggerUrl rejected (SI-08)
        await Assert.ThrowsAsync<CdpConnectException>(() => Ombra.LaunchAsync(new LaunchOptions
        {
            BinaryPath = bin,
            Env = new Dictionary<string, string> { ["FAKE_WS_HOST"] = "192.168.1.50" },
        }));

        // 7. Mid-session engine kill surfaces EngineCrashedException via CheckEngineHealth
        var browser = await Ombra.LaunchAsync(new LaunchOptions { BinaryPath = bin });
        var pid = Ombra.LastLaunchInfo(browser)!.Pid;
        using (var targetProc = Process.GetProcessById(pid))
        {
            targetProc.Kill(entireProcessTree: true);
            targetProc.WaitForExit(2000);
        }

        Assert.Throws<EngineCrashedException>(() => Ombra.CheckEngineHealth(browser));
        Assert.True(Ombra.LastLaunchInfo(browser)!.Crashed);
        await browser.CloseAsync();
    }
}
