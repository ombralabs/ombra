using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Playwright;

namespace OmbraLabs.Ombra;

/// <summary>
/// Official C# / .NET SDK for Ombra stealth Chromium — drop-in Microsoft.Playwright launcher over CDP.
/// </summary>
public static partial class Ombra
{
    public const string SdkVersion = OmbraConfig.SdkVersion;
    public const string ContractVersion = OmbraConfig.ContractVersion;
    public const string SupportedContractRange = OmbraConfig.SupportedContractRange;
    public const string DefaultEngineVersion = OmbraConfig.DefaultEngineVersion;
    public const string SupportedEngineRange = OmbraConfig.SupportedEngineRange;
    public const string SupportedPlaywrightRange = OmbraConfig.SupportedPlaywrightRange;

    private const string StderrLogName = ".ombra-stderr.log";

    private static readonly Dictionary<int, string> LicenseExitCodes = new()
    {
        [76] = "no_slot",
        [77] = "invalid",
        [78] = "offline",
        [79] = "config",
    };

    private static readonly HashSet<string> LicenseErrorStates = new(StringComparer.Ordinal)
    {
        "no_key",
        "invalid",
        "no_slot",
        "offline",
        "config",
    };

    private static readonly HttpClient ProbeHttpClient = new(new HttpClientHandler { UseProxy = false })
    {
        Timeout = TimeSpan.FromSeconds(2),
    };

    private static readonly ConditionalWeakTable<object, LaunchInfoBox> LaunchMetadata = new();
    private static readonly ConditionalWeakTable<object, IBrowser> ContextToBrowser = new();
    private static readonly ConditionalWeakTable<object, EngineRuntime> ObjectToRuntime = new();
    private static readonly ConcurrentDictionary<EngineRuntime, byte> ActiveRuntimes = new();

    // Test seam for offline unit/conformance tests.
    internal static Func<Task<IPlaywright>> PlaywrightFactory { get; set; } = Playwright.CreateAsync;

    static Ombra()
    {
        AppDomain.CurrentDomain.ProcessExit += (_, _) =>
        {
            foreach (var runtime in ActiveRuntimes.Keys)
            {
                try
                {
                    runtime.CleanupSync();
                }
                catch (Exception)
                {
                }
            }
        };
    }

    [GeneratedRegex(@"ombra license:\s*([a-z0-9_]+)", RegexOptions.IgnoreCase)]
    private static partial Regex LicenseLineRegex();

    /// <summary>
    /// Return resolved local engine binary metadata matching <c>spec/schemas/binary-info.schema.json</c>.
    /// </summary>
    public static BinaryInfo BinaryInfo(BinaryQueryOptions options) =>
        BinaryManager.GetBinaryInfo(options);

    /// <inheritdoc cref="BinaryInfo(BinaryQueryOptions)"/>
    public static BinaryInfo BinaryInfo(string? binaryPath = null, string? version = null, string? releaseChannel = null) =>
        BinaryManager.GetBinaryInfo(new BinaryQueryOptions
        {
            BinaryPath = binaryPath,
            Version = version,
            ReleaseChannel = releaseChannel,
        });

    /// <summary>
    /// Resolve, download if missing, and verify the Ombra engine binary, returning its executable path.
    /// </summary>
    public static Task<string> EnsureBinaryAsync(
        BinaryQueryOptions options,
        CancellationToken cancellationToken = default) =>
        BinaryManager.EnsureBinaryAsync(options, cancellationToken);

    /// <inheritdoc cref="EnsureBinaryAsync(BinaryQueryOptions, CancellationToken)"/>
    public static Task<string> EnsureBinaryAsync(
        string? binaryPath = null,
        string? version = null,
        string? releaseChannel = null,
        CancellationToken cancellationToken = default) =>
        BinaryManager.EnsureBinaryAsync(
            new BinaryQueryOptions
            {
                BinaryPath = binaryPath,
                Version = version,
                ReleaseChannel = releaseChannel,
            },
            cancellationToken);

    /// <summary>
    /// Remove SDK-managed engine binaries while preserving named profiles and saved keys.
    /// </summary>
    public static void ClearCache() => BinaryManager.ClearCache();

    /// <summary>
    /// Validate launch options and preview the resolved engine command without spawning Chromium.
    /// </summary>
    public static async Task<BuiltLaunchCommand> BuildLaunchOptionsAsync(
        LaunchOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var opts = OptionsValidator.Validate(options);
        var resolvedBin = await BinaryManager.ResolveBinaryAsync(
            binaryPath: opts.BinaryPath,
            version: opts.VersionExplicitlyLatest ? "latest" : opts.Version,
            download: opts.Download,
            ct: cancellationToken).ConfigureAwait(false);

        if (resolvedBin.Path is null)
        {
            throw new BinaryNotFoundException("Could not resolve Ombra engine binary.");
        }

        var seed = opts.Fingerprint.Seed ?? 0;
        var proxyArgs = new List<string>(2);
        if (opts.Proxy is not null)
        {
            proxyArgs.Add(opts.Proxy.HasCredentials
                ? "--proxy-server=socks5://127.0.0.1:<relay>"
                : $"--proxy-server={opts.Proxy.ServerUrl}");
            if (!string.IsNullOrEmpty(opts.Proxy.Bypass))
            {
                proxyArgs.Add($"--proxy-bypass-list={opts.Proxy.Bypass}");
            }
        }

        var args = OptionsValidator.BuildEngineArgs(
            options: opts,
            profileDir: opts.UserDataDir ?? "<ephemeral-profile>",
            seed: seed,
            proxyArgs: proxyArgs,
            engineVersion: resolvedBin.Version,
            resolvedOs: opts.Fingerprint.Os,
            resolvedTimezone: opts.Fingerprint.Timezone,
            resolvedLocale: opts.Fingerprint.Locale);

        return new BuiltLaunchCommand(resolvedBin.Path, resolvedBin.Version, args, opts.TimeoutMs);
    }

    /// <summary>
    /// Launch Ombra stealth Chromium and return a native <see cref="IBrowser"/> attached over loopback CDP.
    /// </summary>
    public static async Task<IBrowser> LaunchAsync(
        LaunchOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var (runtime, timeoutMs) = await PrepareRuntimeAsync(options, cancellationToken).ConfigureAwait(false);

        IPlaywright? playwright = null;
        IBrowser innerBrowser;
        int port;
        string wsUrl;

        try
        {
            var deadline = Environment.TickCount64 + timeoutMs;
            (port, wsUrl) = await WaitForEngineReadyAsync(runtime, timeoutMs, cancellationToken).ConfigureAwait(false);
            playwright = await PlaywrightFactory().ConfigureAwait(false);
            innerBrowser = await ConnectCdpWithSingleRetryAsync(
                playwright,
                runtime,
                port,
                deadline,
                cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            try
            {
                playwright?.Dispose();
            }
            catch (Exception)
            {
            }

            try
            {
                await runtime.CleanupAsync().ConfigureAwait(false);
            }
            catch (Exception)
            {
                // Preserve the launch failure.
            }

            throw;
        }

        runtime.AttachPlaywright(playwright);

        var metaBox = new LaunchInfoBox(
            runtime.BinaryPath,
            runtime.EngineVersion,
            runtime.ProfileLease.Path,
            runtime.ProfileLease.Seed,
            port,
            wsUrl,
            runtime.Pid);

        innerBrowser.Disconnected += (_, _) =>
        {
            if (runtime.Closing || runtime.Closed)
            {
                return;
            }

            var code = runtime.TryGetExitCode();
            if (code.HasValue)
            {
                runtime.CrashedExitCode = code.Value;
                metaBox.MarkCrashed(code.Value);
            }

            _ = Task.Run(async () =>
            {
                try
                {
                    await runtime.CleanupAsync().ConfigureAwait(false);
                }
                catch (Exception)
                {
                }
            });
        };

        var wrappedBrowser = OmbraBrowserProxy.Create(
            innerBrowser,
            closeOpts => runtime.CloseBrowserAsync(innerBrowser, closeOpts));

        RegisterTrackedObject(wrappedBrowser, runtime, metaBox);
        RegisterTrackedObject(innerBrowser, runtime, metaBox);
        return wrappedBrowser;
    }

    /// <summary>
    /// Launch Ombra Chromium and return a <see cref="IBrowserContext"/>.
    /// Closing the context closes the underlying browser and stops the engine process.
    /// </summary>
    public static async Task<IBrowserContext> LaunchContextAsync(
        LaunchContextOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var opts = options ?? new LaunchContextOptions();
        var (launchOpts, pwCtxOpts) = SplitContextOptions(opts);
        var browser = await LaunchAsync(launchOpts, cancellationToken).ConfigureAwait(false);

        IBrowserContext innerContext;
        try
        {
            innerContext = await browser.NewContextAsync(pwCtxOpts).ConfigureAwait(false);
        }
        catch
        {
            try
            {
                await browser.CloseAsync().ConfigureAwait(false);
            }
            catch (Exception)
            {
            }

            throw;
        }

        var wrappedContext = OmbraBrowserContextProxy.Create(innerContext, browser, closeInnerContextFirst: true);
        AttachContextTracking(wrappedContext, innerContext, browser);
        return wrappedContext;
    }

    /// <summary>
    /// Launch Ombra with a persistent profile directory and return its default <see cref="IBrowserContext"/>.
    /// </summary>
    public static Task<IBrowserContext> LaunchPersistentContextAsync(
        string userDataDir,
        LaunchPersistentContextOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var merged = CopyPersistentOptions(options);
        merged.UserDataDir = userDataDir;
        return LaunchPersistentContextAsync(merged, cancellationToken);
    }

    /// <summary>
    /// Launch Ombra with a persistent profile (<see cref="LaunchOptions.Profile"/> or
    /// <see cref="LaunchOptions.UserDataDir"/>) and return its default <see cref="IBrowserContext"/>.
    /// </summary>
    public static async Task<IBrowserContext> LaunchPersistentContextAsync(
        LaunchPersistentContextOptions options,
        CancellationToken cancellationToken = default)
    {
        if (options is null || (options.UserDataDir is null && options.Profile is null))
        {
            throw new InvalidOptionException("Either 'UserDataDir' or 'Profile' is required.");
        }

        var launchOpts = BuildPersistentLaunchOptions(options);
        var browser = await LaunchAsync(launchOpts, cancellationToken).ConfigureAwait(false);

        IBrowserContext innerContext;
        try
        {
            var existingContexts = browser.Contexts;
            innerContext = existingContexts is { Count: > 0 }
                ? existingContexts[0]
                : await browser.NewContextAsync(new BrowserNewContextOptions { ViewportSize = ViewportSize.NoViewport })
                    .ConfigureAwait(false);
        }
        catch
        {
            try
            {
                await browser.CloseAsync().ConfigureAwait(false);
            }
            catch (Exception)
            {
            }

            throw;
        }

        var wrappedContext = OmbraBrowserContextProxy.Create(innerContext, browser, closeInnerContextFirst: false);
        AttachContextTracking(wrappedContext, innerContext, browser);
        return wrappedContext;
    }

    /// <summary>
    /// Return read-only launch metadata for a browser or context created by Ombra, or <c>null</c> if untracked.
    /// </summary>
    public static LaunchInfo? LastLaunchInfo(object? browserOrContext)
    {
        if (browserOrContext is null || !LaunchMetadata.TryGetValue(browserOrContext, out var metaBox))
        {
            return null;
        }

        if (ObjectToRuntime.TryGetValue(browserOrContext, out var runtime) &&
            !runtime.Closing &&
            !runtime.Closed &&
            runtime.CrashedExitCode is null)
        {
            var code = runtime.TryGetExitCode();
            if (code.HasValue)
            {
                runtime.CrashedExitCode = code.Value;
                metaBox.MarkCrashed(code.Value);
            }
        }

        return metaBox.Snapshot();
    }

    /// <summary>
    /// Throw <see cref="EngineCrashedException"/> if the launched Ombra engine died unexpectedly.
    /// </summary>
    public static void CheckEngineHealth(object? browserOrContext)
    {
        if (browserOrContext is null || !ObjectToRuntime.TryGetValue(browserOrContext, out var runtime))
        {
            throw new InvalidOptionException(
                "Expected a Playwright IBrowser or IBrowserContext returned by Ombra.Launch*Async().");
        }

        if (runtime.Closing && runtime.CrashedExitCode is null)
        {
            return;
        }

        var exitCode = runtime.CrashedExitCode;
        if (exitCode is null && !runtime.Closed)
        {
            exitCode = runtime.TryGetExitCode();
            if (exitCode.HasValue && !runtime.Closing)
            {
                runtime.CrashedExitCode = exitCode.Value;
            }
        }

        if (exitCode.HasValue && (runtime.CrashedExitCode.HasValue || !runtime.Closing))
        {
            if (LaunchMetadata.TryGetValue(browserOrContext, out var metaBox))
            {
                metaBox.MarkCrashed(exitCode.Value);
            }

            var tail = runtime.StderrTail();
            _ = Task.Run(async () =>
            {
                try
                {
                    await runtime.CleanupAsync().ConfigureAwait(false);
                }
                catch (Exception)
                {
                }
            });

            throw new EngineCrashedException(
                $"Ombra engine process exited unexpectedly while browser was open (code {exitCode.Value}).",
                new Dictionary<string, object?>
                {
                    ["exitCode"] = exitCode.Value,
                    ["binaryPath"] = runtime.BinaryPath,
                    ["stderrTail"] = tail,
                },
                runtime.SecretsToRedact);
        }
    }

    /// <summary>
    /// Open a browser-level CDP session for Ombra's custom <c>Ombra</c> and <c>Browser</c> domains.
    /// </summary>
    public static async Task<OmbraCdp> CdpAsync(object browserOrContext)
    {
        var browser = ResolveBrowserHandle(browserOrContext);
        var session = await browser.NewBrowserCDPSessionAsync().ConfigureAwait(false);
        return new OmbraCdp(browser, session);
    }

    internal static IBrowser ResolveBrowserHandle(object? obj)
    {
        if (obj is null)
        {
            throw new InvalidOptionException(
                "Expected a Playwright IBrowser or IBrowserContext returned by Ombra.Launch*Async().");
        }

        if (ContextToBrowser.TryGetValue(obj, out var mapped))
        {
            return mapped;
        }

        if (obj is IBrowser browser)
        {
            return browser;
        }

        if (obj is IBrowserContext context && context.Browser is not null)
        {
            return context.Browser;
        }

        throw new InvalidOptionException(
            "Expected a Playwright IBrowser or IBrowserContext returned by Ombra.Launch*Async().");
    }

    private static void RegisterTrackedObject(object obj, EngineRuntime runtime, LaunchInfoBox metaBox)
    {
        LaunchMetadata.AddOrUpdate(obj, metaBox);
        ObjectToRuntime.AddOrUpdate(obj, runtime);
    }

    private static void AttachContextTracking(IBrowserContext wrappedContext, IBrowserContext innerContext, IBrowser browser)
    {
        ContextToBrowser.AddOrUpdate(wrappedContext, browser);
        ContextToBrowser.AddOrUpdate(innerContext, browser);

        if (ObjectToRuntime.TryGetValue(browser, out var runtime))
        {
            ObjectToRuntime.AddOrUpdate(wrappedContext, runtime);
            ObjectToRuntime.AddOrUpdate(innerContext, runtime);
        }

        if (LaunchMetadata.TryGetValue(browser, out var metaBox))
        {
            LaunchMetadata.AddOrUpdate(wrappedContext, metaBox);
            LaunchMetadata.AddOrUpdate(innerContext, metaBox);
        }
    }

    private static Fingerprint? CloneFingerprintWithLocaleTz(Fingerprint? src, string? locale, string? timezone, string? timezoneId)
    {
        var effTz = timezone ?? timezoneId;
        if (src is null && locale is null && effTz is null)
        {
            return null;
        }

        return new Fingerprint
        {
            Seed = src?.Seed,
            Os = src?.Os,
            OsVersion = src?.OsVersion,
            Timezone = src?.Timezone ?? effTz,
            Locale = src?.Locale ?? locale,
            Screen = src?.Screen,
            Gpu = src?.Gpu,
            HardwareConcurrency = src?.HardwareConcurrency,
            DeviceMemory = src?.DeviceMemory,
            Noise = src?.Noise,
        };
    }

    private static (LaunchOptions LaunchOpts, BrowserNewContextOptions PwContextOpts) SplitContextOptions(
        LaunchContextOptions options)
    {
        var launchOpts = new LaunchOptions
        {
            Headless = options.Headless,
            MobileViewport = options.MobileViewport,
            Proxy = options.Proxy,
            Fingerprint = CloneFingerprintWithLocaleTz(options.Fingerprint, options.Locale, options.Timezone, options.TimezoneId),
            Profile = options.Profile,
            UserDataDir = options.UserDataDir,
            Args = options.Args,
            BinaryPath = options.BinaryPath,
            Version = options.Version,
            TimeoutMs = options.TimeoutMs,
            Humanize = options.Humanize,
            LicenseKey = options.LicenseKey,
            Env = options.Env,
            Download = options.Download,
        };

        var pwCtxOpts = options.ContextOptions is not null
            ? new BrowserNewContextOptions(options.ContextOptions)
            : new BrowserNewContextOptions();

        // SI-04: never pass locale/timezoneId via Playwright Emulation overrides by default.
        pwCtxOpts.Locale = null;
        pwCtxOpts.TimezoneId = null;
        pwCtxOpts.ViewportSize = options.Viewport ?? options.ContextOptions?.ViewportSize ?? ViewportSize.NoViewport;

        return (launchOpts, pwCtxOpts);
    }

    private static LaunchPersistentContextOptions CopyPersistentOptions(LaunchPersistentContextOptions? src)
    {
        if (src is null)
        {
            return new LaunchPersistentContextOptions();
        }

        return new LaunchPersistentContextOptions
        {
            Headless = src.Headless,
            MobileViewport = src.MobileViewport,
            Proxy = src.Proxy,
            Fingerprint = src.Fingerprint,
            Profile = src.Profile,
            UserDataDir = src.UserDataDir,
            Args = src.Args,
            BinaryPath = src.BinaryPath,
            Version = src.Version,
            TimeoutMs = src.TimeoutMs,
            Humanize = src.Humanize,
            LicenseKey = src.LicenseKey,
            Env = src.Env,
            Download = src.Download,
            Locale = src.Locale,
            Timezone = src.Timezone,
            TimezoneId = src.TimezoneId,
        };
    }

    private static LaunchOptions BuildPersistentLaunchOptions(LaunchPersistentContextOptions options)
    {
        return new LaunchOptions
        {
            Headless = options.Headless,
            MobileViewport = options.MobileViewport,
            Proxy = options.Proxy,
            Fingerprint = CloneFingerprintWithLocaleTz(options.Fingerprint, options.Locale, options.Timezone, options.TimezoneId),
            Profile = options.Profile,
            UserDataDir = options.UserDataDir,
            Args = options.Args,
            BinaryPath = options.BinaryPath,
            Version = options.Version,
            TimeoutMs = options.TimeoutMs,
            Humanize = options.Humanize,
            LicenseKey = options.LicenseKey,
            Env = options.Env,
            Download = options.Download,
        };
    }

    private static async Task<(EngineRuntime Runtime, int TimeoutMs)> PrepareRuntimeAsync(
        LaunchOptions? rawOptions,
        CancellationToken ct)
    {
        var opts = OptionsValidator.Validate(rawOptions);
        var resolvedBin = await BinaryManager.ResolveBinaryAsync(
            binaryPath: opts.BinaryPath,
            version: opts.VersionExplicitlyLatest ? "latest" : opts.Version,
            download: opts.Download,
            ct: ct).ConfigureAwait(false);

        if (resolvedBin.Path is null)
        {
            throw new BinaryNotFoundException("Could not resolve Ombra engine binary.");
        }

        var explicitPreset = opts.Humanize is { Enabled: true } ? opts.Humanize.Preset : null;
        var lease = ProfileStore.AcquireLease(
            profile: opts.Profile,
            userDataDir: opts.UserDataDir,
            explicitSeed: opts.Fingerprint.Seed,
            osHint: opts.Fingerprint.Os,
            requireHostOs: opts.MobileViewport is not null,
            timezone: opts.Fingerprint.Timezone,
            locale: opts.Fingerprint.Locale,
            humanizePreset: explicitPreset,
            engineVersion: resolvedBin.Version);

        LoopbackProxyRelay? relay = null;
        Process? proc = null;
        FileStream? stderrStream = null;
        Task? stderrPump = null;

        try
        {
            (var proxyArgs, relay) = await LoopbackProxyRelay.PrepareAsync(opts.Proxy).ConfigureAwait(false);

            var effTz = lease.Timezone;
            var effLocale = lease.Locale;
            if (effTz == "auto" || effLocale == "auto")
            {
                // shortcut: GeoIP lookup for timezone/locale="auto" is omitted to avoid bundling MaxMind DB deps;
                // upgrade by adding an optional GeoIP resolver package if consumers require automatic exit-IP lookup.
                OmbraLogger.Warn(
                    "Fingerprint 'auto' timezone/locale is not bundled in Ombra .NET SDK; leaving engine defaults.");
                if (effTz == "auto")
                {
                    effTz = null;
                }

                if (effLocale == "auto")
                {
                    effLocale = null;
                }
            }

            var cliArgs = OptionsValidator.BuildEngineArgs(
                options: opts,
                profileDir: lease.Path,
                seed: lease.Seed,
                proxyArgs: proxyArgs,
                engineVersion: resolvedBin.Version,
                resolvedOs: lease.OsHint,
                resolvedTimezone: effTz,
                resolvedLocale: effLocale,
                resolvedHumanizePreset: lease.HumanizePreset);

            var (childEnv, keySecrets) = BuildChildEnv(opts.Env, opts.LicenseKey);
            var allSecrets = (opts.Proxy?.Secrets() ?? [])
                .Concat(keySecrets)
                .Where(s => !string.IsNullOrEmpty(s))
                .ToArray();

            var stalePortFile = Path.Combine(lease.Path, "DevToolsActivePort");
            try
            {
                File.Delete(stalePortFile);
            }
            catch (IOException)
            {
            }

            var stderrLogPath = Path.Combine(lease.Path, StderrLogName);
            stderrStream = new FileStream(
                stderrLogPath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.ReadWrite);
            if (!OperatingSystem.IsWindows())
            {
                try
                {
                    File.SetUnixFileMode(stderrLogPath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
                }
                catch (Exception)
                {
                }
            }

            var startInfo = new ProcessStartInfo(resolvedBin.Path)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardInput = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            foreach (var arg in cliArgs)
            {
                startInfo.ArgumentList.Add(arg);
            }

            if (childEnv is not null)
            {
                foreach (var (k, v) in childEnv)
                {
                    startInfo.Environment[k] = v;
                }
            }

            proc = new Process { StartInfo = startInfo };
            try
            {
                if (!proc.Start())
                {
                    throw new EngineExitedException(
                        "Ombra engine process could not start.",
                        new Dictionary<string, object?> { ["binaryPath"] = resolvedBin.Path },
                        allSecrets);
                }
            }
            catch (OmbraException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new EngineExitedException(
                    $"Ombra engine process could not start: {ex.Message}",
                    new Dictionary<string, object?> { ["binaryPath"] = resolvedBin.Path },
                    allSecrets,
                    ex);
            }

            // Drain stdout to prevent blocking if the engine writes diagnostic lines.
            _ = DrainToNullAsync(proc.StandardOutput.BaseStream);
            var capturedStream = stderrStream;
            stderrPump = PumpStderrAsync(proc.StandardError.BaseStream, capturedStream);

            var runtime = new EngineRuntime(
                proc,
                resolvedBin.Path,
                resolvedBin.Version,
                cliArgs,
                lease,
                relay,
                stderrLogPath,
                stderrStream,
                stderrPump,
                allSecrets);

            ActiveRuntimes.TryAdd(runtime, 0);
            return (runtime, opts.TimeoutMs);
        }
        catch
        {
            if (proc is not null)
            {
                try
                {
                    if (!proc.HasExited)
                    {
                        proc.Kill(entireProcessTree: true);
                        proc.WaitForExit(2000);
                    }
                }
                catch (Exception)
                {
                }

                proc.Dispose();
            }

            if (stderrPump is not null)
            {
                try
                {
                    await stderrPump.WaitAsync(TimeSpan.FromSeconds(1)).ConfigureAwait(false);
                }
                catch (Exception)
                {
                }
            }

            if (stderrStream is not null)
            {
                try
                {
                    await stderrStream.DisposeAsync().ConfigureAwait(false);
                }
                catch (Exception)
                {
                }
            }

            if (relay is not null)
            {
                try
                {
                    await relay.StopAsync().ConfigureAwait(false);
                }
                catch (Exception)
                {
                }
            }

            try
            {
                lease.Dispose();
            }
            catch (Exception)
            {
            }

            throw;
        }
    }

    private static async Task DrainToNullAsync(Stream stream)
    {
        var buf = new byte[4096];
        try
        {
            while (await stream.ReadAsync(buf).ConfigureAwait(false) > 0)
            {
            }
        }
        catch (Exception)
        {
        }
    }

    private static async Task PumpStderrAsync(Stream source, FileStream dest)
    {
        var buf = new byte[4096];
        try
        {
            int read;
            while ((read = await source.ReadAsync(buf).ConfigureAwait(false)) > 0)
            {
                await dest.WriteAsync(buf.AsMemory(0, read)).ConfigureAwait(false);
                await dest.FlushAsync().ConfigureAwait(false);
            }
        }
        catch (Exception)
        {
        }
    }

    private static (Dictionary<string, string>? ChildEnv, string[] Secrets) BuildChildEnv(
        IReadOnlyDictionary<string, string> userEnv,
        string? explicitLicenseKey)
    {
        if (explicitLicenseKey is null &&
            userEnv.TryGetValue("OMBRA_LICENSE_KEY", out var userEnvKey) &&
            !string.IsNullOrWhiteSpace(userEnvKey))
        {
            explicitLicenseKey = userEnvKey;
        }

        var (resolvedKey, source) = OmbraConfig.ResolveLicenseKey(explicitLicenseKey);
        string[] secrets = !string.IsNullOrEmpty(resolvedKey) ? [resolvedKey] : [];
        if (userEnv.Count == 0 && source is not ("param" or "file"))
        {
            return (null, secrets);
        }

        var merged = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (k, v) in userEnv)
        {
            merged[k] = v;
        }

        if (!string.IsNullOrEmpty(resolvedKey) && source is "param" or "file")
        {
            merged["OMBRA_LICENSE_KEY"] = resolvedKey;
        }

        return (merged, secrets);
    }

    private static (int Port, string WsPath)? ParseDevtoolsActivePort(string portFile)
    {
        try
        {
            if (!File.Exists(portFile))
            {
                return null;
            }

            var lines = File.ReadAllLines(portFile, Encoding.UTF8);
            if (lines.Length < 2)
            {
                return null;
            }

            var portText = lines[0].Trim();
            var wsPath = lines[1].Trim();
            if (!portText.All(char.IsAsciiDigit) || !wsPath.StartsWith("/devtools/browser/", StringComparison.Ordinal))
            {
                return null;
            }

            if (!int.TryParse(portText, out var port) || port is < 1 or > 65535)
            {
                return null;
            }

            return (port, wsPath);
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static async Task<(string Status, string? Value)> ProbeCdpVersionAsync(int port, CancellationToken ct)
    {
        var url = $"http://127.0.0.1:{port}/json/version";
        try
        {
            using var response = await ProbeHttpClient.GetAsync(url, ct).ConfigureAwait(false);
            var text = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

            if (response.StatusCode == HttpStatusCode.OK)
            {
                using var doc = JsonDocument.Parse(text);
                if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                    doc.RootElement.TryGetProperty("webSocketDebuggerUrl", out var wsProp) &&
                    wsProp.ValueKind == JsonValueKind.String)
                {
                    var ws = wsProp.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(ws))
                    {
                        return ("ready", ws);
                    }
                }

                return ("pending", null);
            }

            if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                using var doc = JsonDocument.Parse(text);
                if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                    doc.RootElement.TryGetProperty("ombra", out var ombraProp) &&
                    ombraProp.ValueKind == JsonValueKind.Object &&
                    ombraProp.TryGetProperty("license", out var licProp) &&
                    licProp.ValueKind == JsonValueKind.String)
                {
                    var state = licProp.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(state))
                    {
                        return ("license", state);
                    }
                }
            }

            return ("pending", null);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            return ("pending", null);
        }
    }

    private static void CheckWsLoopback(string wsUrl)
    {
        if (!Uri.TryCreate(wsUrl, UriKind.Absolute, out var uri))
        {
            throw new CdpConnectException($"Invalid CDP WebSocket URL: '{wsUrl}'.");
        }

        if (!OmbraConfig.IsLoopbackHost(uri.Host))
        {
            throw new CdpConnectException(
                $"Refusing non-loopback CDP endpoint host '{uri.Host}' (SI-08).",
                new Dictionary<string, object?> { ["cdpHost"] = uri.Host });
        }
    }

    private static Exception BuildExitException(EngineRuntime runtime, int exitCode)
    {
        runtime.FlushStderrBrief();
        var tail = runtime.StderrTail();
        var licMatch = LicenseLineRegex().Match(tail);
        string? state = licMatch.Success
            ? licMatch.Groups[1].Value.ToLowerInvariant()
            : LicenseExitCodes.TryGetValue(exitCode, out var mapped)
                ? mapped
                : null;

        if (state is not null && LicenseErrorStates.Contains(state))
        {
            return new LicenseException(
                $"Ombra engine refused to start due to license state ({state}).",
                new Dictionary<string, object?>
                {
                    ["licenseState"] = state,
                    ["exitCode"] = exitCode,
                    ["binaryPath"] = runtime.BinaryPath,
                    ["stderrTail"] = tail,
                },
                runtime.SecretsToRedact);
        }

        return new EngineExitedException(
            $"Ombra engine exited prematurely with code {exitCode}.",
            new Dictionary<string, object?>
            {
                ["exitCode"] = exitCode,
                ["binaryPath"] = runtime.BinaryPath,
                ["stderrTail"] = tail,
            },
            runtime.SecretsToRedact);
    }

    private static async Task<(int Port, string WsUrl)> WaitForEngineReadyAsync(
        EngineRuntime runtime,
        int timeoutMs,
        CancellationToken ct)
    {
        var portFile = Path.Combine(runtime.ProfileLease.Path, "DevToolsActivePort");
        var deadline = Environment.TickCount64 + timeoutMs;
        int? port = null;
        string? lastLicenseState = null;

        while (Environment.TickCount64 < deadline)
        {
            ct.ThrowIfCancellationRequested();

            var exitCode = runtime.TryGetExitCode();
            if (exitCode.HasValue)
            {
                throw BuildExitException(runtime, exitCode.Value);
            }

            if (port is null)
            {
                var parsed = ParseDevtoolsActivePort(portFile);
                if (parsed.HasValue)
                {
                    port = parsed.Value.Port;
                }
                else
                {
                    await Task.Delay(50, ct).ConfigureAwait(false);
                    continue;
                }
            }

            var (status, value) = await ProbeCdpVersionAsync(port.Value, ct).ConfigureAwait(false);
            if (status == "ready" && value is not null)
            {
                CheckWsLoopback(value);
                return (port.Value, value);
            }

            if (status == "license" && value is not null)
            {
                lastLicenseState = value;
                if (value is "no_key" or "invalid")
                {
                    throw new LicenseException(
                        $"Ombra engine license error ({value}). Set OMBRA_LICENSE_KEY or ~/.ombra/license.key.",
                        new Dictionary<string, object?>
                        {
                            ["licenseState"] = value,
                            ["binaryPath"] = runtime.BinaryPath,
                            ["stderrTail"] = runtime.StderrTail(),
                        },
                        runtime.SecretsToRedact);
                }
            }

            await Task.Delay(100, ct).ConfigureAwait(false);
        }

        if (lastLicenseState is "no_slot" or "offline")
        {
            throw new LicenseException(
                $"Ombra engine license error ({lastLicenseState}) timed out after {timeoutMs}ms.",
                new Dictionary<string, object?>
                {
                    ["licenseState"] = lastLicenseState,
                    ["timeoutMs"] = timeoutMs,
                    ["binaryPath"] = runtime.BinaryPath,
                    ["stderrTail"] = runtime.StderrTail(),
                },
                runtime.SecretsToRedact);
        }

        throw new LaunchTimeoutException(
            $"Ombra engine did not expose a ready CDP endpoint within {timeoutMs}ms.",
            new Dictionary<string, object?>
            {
                ["timeoutMs"] = timeoutMs,
                ["binaryPath"] = runtime.BinaryPath,
                ["stderrTail"] = runtime.StderrTail(),
            },
            runtime.SecretsToRedact);
    }

    private static async Task<IBrowser> ConnectCdpWithSingleRetryAsync(
        IPlaywright playwright,
        EngineRuntime runtime,
        int port,
        long deadlineTick,
        CancellationToken ct)
    {
        var endpoint = $"http://127.0.0.1:{port}";
        Exception? lastErr = null;

        for (var attempt = 0; attempt < 2; attempt++)
        {
            ct.ThrowIfCancellationRequested();
            var remainingMs = (int)Math.Max(1000, deadlineTick - Environment.TickCount64);
            try
            {
                return await playwright.Chromium.ConnectOverCDPAsync(
                    endpoint,
                    new BrowserTypeConnectOverCDPOptions
                    {
                        Timeout = remainingMs,
                        IsLocal = true,
                        NoDefaults = true,
                    }).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                lastErr = ex;
                var exitCode = runtime.TryGetExitCode();
                if (exitCode.HasValue)
                {
                    throw BuildExitException(runtime, exitCode.Value);
                }

                var (status, _) = await ProbeCdpVersionAsync(port, ct).ConfigureAwait(false);
                if (attempt == 0 && status == "ready" && Environment.TickCount64 < deadlineTick)
                {
                    await Task.Delay(100, ct).ConfigureAwait(false);
                    continue;
                }

                break;
            }
        }

        throw new CdpConnectException(
            $"Failed to connect Playwright over CDP to {endpoint}: {lastErr?.Message}",
            new Dictionary<string, object?>
            {
                ["endpoint"] = endpoint,
                ["binaryPath"] = runtime.BinaryPath,
                ["stderrTail"] = runtime.StderrTail(),
            },
            runtime.SecretsToRedact,
            lastErr);
    }

    private sealed class LaunchInfoBox(
        string binaryPath,
        string engineVersion,
        string profileDir,
        long seed,
        int cdpPort,
        string wsUrl,
        int pid)
    {
        private bool _crashed;
        private int? _exitCode;

        public void MarkCrashed(int exitCode)
        {
            _crashed = true;
            _exitCode = exitCode;
        }

        public LaunchInfo Snapshot() =>
            new(binaryPath, engineVersion, profileDir, seed, cdpPort, wsUrl, pid, _crashed, _exitCode);
    }

    private sealed class EngineRuntime
    {
        private readonly Process _proc;
        private readonly FileStream _stderrStream;
        private readonly Task _stderrPump;
        private readonly LoopbackProxyRelay? _relay;
        private readonly string _stderrLogPath;
        private readonly object _cleanupGate = new();
        private IPlaywright? _playwright;
        private Task? _cleanupTask;

        public string BinaryPath { get; }
        public string EngineVersion { get; }
        public IReadOnlyList<string> Args { get; }
        public ProfileLease ProfileLease { get; }
        public string[] SecretsToRedact { get; }
        public int Pid { get; }

        public volatile bool Closing;
        public volatile bool Closed;
        public int? CrashedExitCode;

        public EngineRuntime(
            Process proc,
            string binaryPath,
            string engineVersion,
            IReadOnlyList<string> args,
            ProfileLease profileLease,
            LoopbackProxyRelay? relay,
            string stderrLogPath,
            FileStream stderrStream,
            Task stderrPump,
            string[] secretsToRedact)
        {
            _proc = proc;
            BinaryPath = binaryPath;
            EngineVersion = engineVersion;
            Args = args;
            ProfileLease = profileLease;
            _relay = relay;
            _stderrLogPath = stderrLogPath;
            _stderrStream = stderrStream;
            _stderrPump = stderrPump;
            SecretsToRedact = secretsToRedact;
            Pid = proc.Id;
        }

        public void AttachPlaywright(IPlaywright playwright) => _playwright = playwright;

        public int? TryGetExitCode()
        {
            try
            {
                return _proc.HasExited ? _proc.ExitCode : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public void FlushStderrBrief()
        {
            try
            {
                _stderrPump.Wait(250);
            }
            catch (Exception)
            {
            }
        }

        public string StderrTail(int limit = 2000)
        {
            if (limit <= 0)
            {
                return string.Empty;
            }

            try
            {
                if (!File.Exists(_stderrLogPath))
                {
                    return string.Empty;
                }

                using var fs = new FileStream(_stderrLogPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                var len = fs.Length;
                var toRead = (int)Math.Min(len, limit);
                if (toRead <= 0)
                {
                    return string.Empty;
                }

                fs.Seek(len - toRead, SeekOrigin.Begin);
                var buf = new byte[toRead];
                var readTotal = 0;
                while (readTotal < toRead)
                {
                    var n = fs.Read(buf, readTotal, toRead - readTotal);
                    if (n == 0)
                    {
                        break;
                    }

                    readTotal += n;
                }

                var text = Encoding.UTF8.GetString(buf, 0, readTotal);
                return SecretRedactor.Redact(text, SecretsToRedact);
            }
            catch (Exception)
            {
                return string.Empty;
            }
        }

        public async Task CloseBrowserAsync(IBrowser innerBrowser, BrowserCloseOptions? closeOpts)
        {
            Closing = true;
            var sentBrowserClose = false;
            try
            {
                try
                {
                    var cdp = await innerBrowser.NewBrowserCDPSessionAsync().ConfigureAwait(false);
                    await cdp.SendAsync("Browser.close").ConfigureAwait(false);
                    sentBrowserClose = true;
                }
                catch (Exception)
                {
                    // Ignore if already disconnected or stub doesn't implement Browser.close.
                }

                try
                {
                    await innerBrowser.CloseAsync(closeOpts).ConfigureAwait(false);
                }
                catch (Exception)
                {
                }

                if (sentBrowserClose)
                {
                    try
                    {
                        using var waitCts = new CancellationTokenSource(TimeSpan.FromMilliseconds(3500));
                        await _proc.WaitForExitAsync(waitCts.Token).ConfigureAwait(false);
                    }
                    catch (Exception)
                    {
                    }
                }
            }
            finally
            {
                await CleanupAsync().ConfigureAwait(false);
            }
        }

        public Task CleanupAsync()
        {
            lock (_cleanupGate)
            {
                if (_cleanupTask is not null)
                {
                    return _cleanupTask;
                }

                Closing = true;
                _cleanupTask = CleanupCoreAsync();
                return _cleanupTask;
            }
        }

        private async Task CleanupCoreAsync()
        {
            try
            {
                try
                {
                    if (!_proc.HasExited)
                    {
                        _proc.Kill(entireProcessTree: true);
                        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                        await _proc.WaitForExitAsync(cts.Token).ConfigureAwait(false);
                    }
                }
                catch (Exception)
                {
                }

                try
                {
                    await _stderrPump.WaitAsync(TimeSpan.FromSeconds(1)).ConfigureAwait(false);
                }
                catch (Exception)
                {
                }

                try
                {
                    await _stderrStream.DisposeAsync().ConfigureAwait(false);
                }
                catch (Exception)
                {
                }

                try
                {
                    _proc.Dispose();
                }
                catch (Exception)
                {
                }
            }
            finally
            {
                try
                {
                    _playwright?.Dispose();
                }
                catch (Exception)
                {
                }

                try
                {
                    if (_relay is not null)
                    {
                        await _relay.StopAsync().ConfigureAwait(false);
                    }
                }
                catch (Exception)
                {
                }
                finally
                {
                    try
                    {
                        ProfileLease.Dispose();
                    }
                    finally
                    {
                        Closed = true;
                        ActiveRuntimes.TryRemove(this, out _);
                    }
                }
            }
        }

        public void CleanupSync()
        {
            if (Closed)
            {
                return;
            }

            Closing = true;
            Closed = true;
            ActiveRuntimes.TryRemove(this, out _);
            try
            {
                if (!_proc.HasExited)
                {
                    _proc.Kill(entireProcessTree: true);
                }
            }
            catch (Exception)
            {
            }
            finally
            {
                try
                {
                    _stderrStream.Dispose();
                }
                catch (Exception)
                {
                }

                try
                {
                    _proc.Dispose();
                }
                catch (Exception)
                {
                }

                try
                {
                    _playwright?.Dispose();
                }
                catch (Exception)
                {
                }

                try
                {
                    ProfileLease.Dispose();
                }
                catch (Exception)
                {
                }
            }
        }
    }
}
