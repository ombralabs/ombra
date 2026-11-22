using System.Formats.Tar;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Playwright;
using OmbraLabs.Ombra;
using Org.BouncyCastle.Crypto.Generators;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;
using Org.BouncyCastle.Security;
using Xunit;

namespace OmbraTests;

[CollectionDefinition("OmbraEnv", DisableParallelization = true)]
public sealed class OmbraEnvCollection;

internal sealed class IsolatedEnv : IDisposable
{
    private static readonly string[] SavedEnvKeys =
    [
        "OMBRA_BINARY_PATH",
        "OMBRA_CACHE_DIR",
        "OMBRA_APP_ENGINES_DIR",
        "OMBRA_DOWNLOAD_URL",
        "OMBRA_VERSION",
        "OMBRA_RELEASE_CHANNEL",
        "OMBRA_AUTO_UPDATE",
        "OMBRA_SKIP_CHECKSUM",
        "OMBRA_LICENSE_KEY",
        "OMBRA_TIMEOUT_MS",
        "OMBRA_LOG_LEVEL",
    ];

    private readonly Dictionary<string, string?> _saved = new(StringComparer.Ordinal);
    private readonly List<string> _savedPubKeys;

    public string TmpRoot { get; }
    public string CacheDir { get; }
    public string AppEnginesDir { get; }

    public IsolatedEnv()
    {
        foreach (var key in SavedEnvKeys)
        {
            _saved[key] = Environment.GetEnvironmentVariable(key);
            Environment.SetEnvironmentVariable(key, null);
        }

        _savedPubKeys = [.. OmbraConfig.BinarySigningPubKeys];

        TmpRoot = Path.Combine(Path.GetTempPath(), $"ombra-dotnet-test-{Guid.NewGuid():N}");
        CacheDir = Path.Combine(TmpRoot, "cache");
        AppEnginesDir = Path.Combine(TmpRoot, "app-engines");
        Directory.CreateDirectory(CacheDir);
        Directory.CreateDirectory(AppEnginesDir);

        Environment.SetEnvironmentVariable("OMBRA_CACHE_DIR", CacheDir);
        Environment.SetEnvironmentVariable("OMBRA_APP_ENGINES_DIR", AppEnginesDir);
        Environment.SetEnvironmentVariable("OMBRA_DOWNLOAD_URL", "off");
        Environment.SetEnvironmentVariable("OMBRA_LOG_LEVEL", "error");
    }

    public void Dispose()
    {
        BinaryManager.SetHttpHandlerForTests(null);
        BinaryManager.DelayHook = Task.Delay;
        Ombra.PlaywrightFactory = Playwright.CreateAsync;
        OmbraConfig.BinarySigningPubKeys.Clear();
        OmbraConfig.BinarySigningPubKeys.AddRange(_savedPubKeys);

        foreach (var (key, value) in _saved)
        {
            Environment.SetEnvironmentVariable(key, value);
        }

        try
        {
            if (Directory.Exists(TmpRoot))
            {
                Directory.Delete(TmpRoot, recursive: true);
            }
        }
        catch (Exception)
        {
        }
    }
}

internal sealed class TestSigner
{
    private readonly Ed25519PrivateKeyParameters _privateKey;

    public string PublicKeyBase64 { get; }

    public TestSigner()
    {
        var gen = new Ed25519KeyPairGenerator();
        gen.Init(new Ed25519KeyGenerationParameters(new SecureRandom()));
        var pair = gen.GenerateKeyPair();
        _privateKey = (Ed25519PrivateKeyParameters)pair.Private;
        var pub = (Ed25519PublicKeyParameters)pair.Public;
        PublicKeyBase64 = Convert.ToBase64String(pub.GetEncoded());
    }

    public string SignEnvelope(object payload)
    {
        var signedJson = JsonSerializer.Serialize(payload);
        var msgBytes = Encoding.UTF8.GetBytes(signedJson);
        var signer = new Ed25519Signer();
        signer.Init(forSigning: true, _privateKey);
        signer.BlockUpdate(msgBytes, 0, msgBytes.Length);
        var sig = signer.GenerateSignature();
        return JsonSerializer.Serialize(new Dictionary<string, string>
        {
            ["signed"] = signedJson,
            ["sig"] = Convert.ToBase64String(sig),
        });
    }

    public static string Sha256Hex(byte[] data) =>
        Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();
}

internal static class TestFixtures
{
    public static string MakeFakeEngine(
        string rootDir,
        string version = "158.0.8127.37-3",
        string layout = "ombra",
        string? pythonBody = null)
    {
        var plat = OmbraConfig.GetPlatformInfo();
        string binaryPath;
        if (plat.SystemName == "Darwin")
        {
            binaryPath = layout switch
            {
                "legacy" => Path.Combine(rootDir, "Chromium.app", "Contents", "MacOS", "Chromium"),
                "hybrid" => Path.Combine(rootDir, "Ombra.app", "Contents", "MacOS", "Chromium"),
                _ => Path.Combine(rootDir, "Ombra.app", "Contents", "MacOS", "Ombra"),
            };
        }
        else if (plat.SystemName == "Windows")
        {
            binaryPath = Path.Combine(rootDir, layout == "legacy" ? "chrome.exe" : "ombra.exe");
        }
        else
        {
            binaryPath = Path.Combine(rootDir, layout == "legacy" ? "chrome" : "ombra");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(binaryPath)!);

        var script = pythonBody ?? DefaultFakeEnginePython(version);
        File.WriteAllText(binaryPath, script, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));

        if (!OperatingSystem.IsWindows())
        {
            File.SetUnixFileMode(
                binaryPath,
                UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute |
                UnixFileMode.GroupRead | UnixFileMode.GroupExecute |
                UnixFileMode.OtherRead | UnixFileMode.OtherExecute);
        }

        var buildMetaPath = plat.SystemName == "Darwin"
            ? Path.Combine(
                Path.GetDirectoryName(Path.GetDirectoryName(Path.GetDirectoryName(binaryPath)!)!)!,
                "Contents",
                "Resources",
                "ombra-build.json")
            : Path.Combine(rootDir, "ombra-build.json");
        Directory.CreateDirectory(Path.GetDirectoryName(buildMetaPath)!);
        File.WriteAllText(
            buildMetaPath,
            JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["version"] = version,
                ["platform"] = plat.CdnName,
            }),
            Encoding.UTF8);

        var sha = BinaryManager.ComputeSha256(binaryPath);
        File.WriteAllText(Path.Combine(rootDir, "binary.sha256"), $"{sha}\n", Encoding.UTF8);
        return binaryPath;
    }

    private static string DefaultFakeEnginePython(string version)
    {
        return $$$"""
#!/usr/bin/env python3
import http.server, json, os, signal, socketserver, sys, time

if "--version" in sys.argv:
    print("Ombra {{{version}}}")
    sys.exit(0)

mode = os.environ.get("FAKE_ENGINE_MODE", "ok")
ws_host = os.environ.get("FAKE_WS_HOST", "127.0.0.1")

udd = None
for arg in sys.argv[1:]:
    if arg.startswith("--user-data-dir="):
        udd = arg.split("=", 1)[1]

if udd:
    os.makedirs(udd, exist_ok=True)
    with open(os.path.join(udd, "spawned-args.json"), "w", encoding="utf-8") as fh:
        json.dump({"args": sys.argv[1:], "envKey": os.environ.get("OMBRA_LICENSE_KEY")}, fh)

if mode == "exit_early":
    sys.stderr.write("fatal: proxy http://u:topsecret@10.0.0.1:8080 OMBRA_LICENSE_KEY=" + os.environ.get("OMBRA_LICENSE_KEY", "") + "\n")
    sys.stderr.flush()
    sys.exit(1)

if mode == "exit_license_invalid":
    sys.stderr.write("ombra license: invalid\n")
    sys.stderr.flush()
    sys.exit(77)

if mode == "hang_no_port":
    time.sleep(30)
    sys.exit(0)

state = {"hits": 0}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def do_GET(self):
        state["hits"] += 1
        if mode == "license_no_key":
            body = json.dumps({"ombra": {"license": "no_key"}}).encode()
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            return
        if mode == "license_no_slot":
            body = json.dumps({"ombra": {"license": "no_slot"}}).encode()
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            return
        if mode == "warmup_then_ready" and state["hits"] == 1:
            body = json.dumps({"ombra": {"license": "warming"}}).encode()
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            return
        port = self.server.server_address[1]
        ws = f"ws://{ws_host}:{port}/devtools/browser/fake-session-123"
        body = json.dumps({"webSocketDebuggerUrl": ws}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
port = httpd.server_address[1]
if udd:
    with open(os.path.join(udd, "DevToolsActivePort"), "w", encoding="utf-8") as fh:
        fh.write(f"{port}\n/devtools/browser/fake-session-123\n")

signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
httpd.serve_forever()
""";
    }

    public static byte[] BuildArchiveFromDirectory(string sourceDir, string archiveExt)
    {
        if (archiveExt == ".zip")
        {
            using var ms = new MemoryStream();
            using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var file in Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories))
                {
                    var rel = Path.GetRelativePath(sourceDir, file).Replace('\\', '/');
                    var entry = zip.CreateEntry(rel);
                    if (!OperatingSystem.IsWindows())
                    {
                        var mode = (int)File.GetUnixFileMode(file);
                        entry.ExternalAttributes = (0x8000 | mode) << 16;
                    }

                    using var es = entry.Open();
                    using var fs = File.OpenRead(file);
                    fs.CopyTo(es);
                }
            }

            return ms.ToArray();
        }

        using var outMs = new MemoryStream();
        using (var gz = new GZipStream(outMs, CompressionLevel.Fastest, leaveOpen: true))
        using (var tar = new TarWriter(gz, TarEntryFormat.Pax, leaveOpen: true))
        {
            foreach (var file in Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories))
            {
                var rel = Path.GetRelativePath(sourceDir, file).Replace('\\', '/');
                tar.WriteEntry(file, rel);
            }
        }

        return outMs.ToArray();
    }
}

internal sealed class FakeCdpSessionEvent(string eventName) : ICDPSessionEvent
{
    public string EventName { get; } = eventName;
    public event EventHandler<JsonElement?>? OnEvent;

    public void Emit(JsonElement? payload) => OnEvent?.Invoke(this, payload);
}

internal class FakeCdpSessionProxy : DispatchProxy
{
    private readonly Dictionary<string, FakeCdpSessionEvent> _events = new(StringComparer.Ordinal);

    public List<(string Method, Dictionary<string, object>? Args)> Calls { get; } = [];
    public bool Detached { get; private set; }
    public bool FailBrowserClose { get; set; }

    public static (ICDPSession Session, FakeCdpSessionProxy State) Create(bool failBrowserClose = false)
    {
        var proxy = Create<ICDPSession, FakeCdpSessionProxy>();
        var state = (FakeCdpSessionProxy)(object)proxy;
        state.FailBrowserClose = failBrowserClose;
        return (proxy, state);
    }

    public void Emit(string eventName, object payload)
    {
        if (_events.TryGetValue(eventName, out var ev))
        {
            using var doc = JsonDocument.Parse(JsonSerializer.Serialize(payload));
            ev.Emit(doc.RootElement.Clone());
        }
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        if (targetMethod is null)
        {
            return null;
        }

        switch (targetMethod.Name)
        {
            case nameof(ICDPSession.SendAsync):
                var method = (string)args![0]!;
                var sendArgs = args.Length > 1 ? args[1] as Dictionary<string, object> : null;
                Calls.Add((method, sendArgs));
                return HandleSendAsync(method, sendArgs);

            case nameof(ICDPSession.DetachAsync):
                Detached = true;
                return Task.CompletedTask;

            case nameof(ICDPSession.Event):
                var evName = (string)args![0]!;
                if (!_events.TryGetValue(evName, out var ev))
                {
                    ev = new FakeCdpSessionEvent(evName);
                    _events[evName] = ev;
                }

                return ev;
        }

        return null;
    }

    private Task<JsonElement?> HandleSendAsync(string method, Dictionary<string, object>? args)
    {
        if (method == "Browser.close" && FailBrowserClose)
        {
            return Task.FromException<JsonElement?>(new InvalidOperationException("stub does not implement Browser.close"));
        }

        object response = method switch
        {
            "Ombra.getHumanizeState" => new
            {
                state = new
                {
                    enabled = true,
                    preset = "default",
                    seed = "42",
                    persona = new { },
                    overrides = new { },
                    blockInput = false,
                    cursory = new { },
                },
            },
            "Ombra.setHumanize" => new
            {
                state = new
                {
                    enabled = args is not null && args.TryGetValue("enabled", out var en) ? en : true,
                    preset = args is not null && args.TryGetValue("preset", out var pr) ? pr : "default",
                    seed = "42",
                    persona = new { },
                    overrides = args is not null && args.TryGetValue("overrides", out var ov) ? ov : new { },
                    blockInput = false,
                    cursory = new { },
                },
            },
            "Browser.agentRunTask" => new
            {
                success = true,
                finalText = "Task completed",
                stepsJson = "[]",
            },
            _ => new { },
        };

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(response));
        return Task.FromResult<JsonElement?>(doc.RootElement.Clone());
    }
}

internal sealed class FakePlaywrightHarness
{
    public List<(string Endpoint, BrowserTypeConnectOverCDPOptions? Options)> ConnectCalls { get; } = [];
    public List<BrowserNewContextOptions?> NewContextCalls { get; } = [];
    public List<BrowserNewPageOptions?> NewPageCalls { get; } = [];
    public List<(string Method, Dictionary<string, object>? Args)> CdpCalls { get; } = [];
    public int PlaywrightDisposedCount { get; private set; }
    public bool FailFirstConnect { get; set; }
    public bool FailBrowserClose { get; set; } = true;

    public Func<Task<IPlaywright>> Factory => () => Task.FromResult(CreatePlaywright());

    private IPlaywright CreatePlaywright()
    {
        var browserType = FakeBrowserTypeProxy.Create(this);
        return FakePlaywrightProxy.Create(this, browserType);
    }

    internal void MarkDisposed() => PlaywrightDisposedCount++;

    internal class FakePlaywrightProxy : DispatchProxy
    {
        private FakePlaywrightHarness _harness = null!;
        private IBrowserType _chromium = null!;

        public static IPlaywright Create(FakePlaywrightHarness harness, IBrowserType chromium)
        {
            var proxy = Create<IPlaywright, FakePlaywrightProxy>();
            var impl = (FakePlaywrightProxy)(object)proxy;
            impl._harness = harness;
            impl._chromium = chromium;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            return targetMethod?.Name switch
            {
                "get_Chromium" => _chromium,
                nameof(IDisposable.Dispose) => MarkAndReturnNull(),
                _ => null,
            };
        }

        private object? MarkAndReturnNull()
        {
            _harness.MarkDisposed();
            return null;
        }
    }

    internal class FakeBrowserTypeProxy : DispatchProxy
    {
        private FakePlaywrightHarness _harness = null!;
        private int _attempts;

        public static IBrowserType Create(FakePlaywrightHarness harness)
        {
            var proxy = Create<IBrowserType, FakeBrowserTypeProxy>();
            var impl = (FakeBrowserTypeProxy)(object)proxy;
            impl._harness = harness;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            if (targetMethod?.Name == nameof(IBrowserType.ConnectOverCDPAsync))
            {
                var endpoint = (string)args![0]!;
                var opts = args.Length > 1 ? args[1] as BrowserTypeConnectOverCDPOptions : null;
                _attempts++;
                _harness.ConnectCalls.Add((endpoint, opts));
                if (_harness.FailFirstConnect && _attempts == 1)
                {
                    return Task.FromException<IBrowser>(new IOException("Transient ECONNRESET during CDP handshake"));
                }

                return Task.FromResult(FakeBrowserProxy.Create(_harness));
            }

            return null;
        }
    }

    internal class FakeBrowserProxy : DispatchProxy
    {
        private FakePlaywrightHarness _harness = null!;
        private IBrowser _self = null!;
        private IBrowserContext _defaultContext = null!;
        private EventHandler<IBrowser>? _disconnected;

        public static IBrowser Create(FakePlaywrightHarness harness)
        {
            var proxy = Create<IBrowser, FakeBrowserProxy>();
            var impl = (FakeBrowserProxy)(object)proxy;
            impl._harness = harness;
            impl._self = proxy;
            impl._defaultContext = FakeContextProxy.Create(proxy);
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            switch (targetMethod?.Name)
            {
                case "get_IsConnected":
                    return true;
                case "get_Contexts":
                    return (IReadOnlyList<IBrowserContext>)[_defaultContext];
                case "add_Disconnected":
                    _disconnected += (EventHandler<IBrowser>)args![0]!;
                    return null;
                case "remove_Disconnected":
                    _disconnected -= (EventHandler<IBrowser>)args![0]!;
                    return null;
                case nameof(IBrowser.NewContextAsync):
                    var ctxOpts = args is { Length: > 0 } ? args[0] as BrowserNewContextOptions : null;
                    _harness.NewContextCalls.Add(ctxOpts);
                    return Task.FromResult(FakeContextProxy.Create(_self));
                case nameof(IBrowser.NewPageAsync):
                    var pageOpts = args is { Length: > 0 } ? args[0] as BrowserNewPageOptions : null;
                    _harness.NewPageCalls.Add(pageOpts);
                    return Task.FromResult(FakePageProxy.Create());
                case nameof(IBrowser.NewBrowserCDPSessionAsync):
                    var (session, state) = FakeCdpSessionProxy.Create(_harness.FailBrowserClose);
                    // Mirror calls onto harness
                    return Task.FromResult(InterceptingCdpProxy.Create(session, _harness.CdpCalls));
                case nameof(IBrowser.CloseAsync):
                    return Task.CompletedTask;
                case nameof(IAsyncDisposable.DisposeAsync):
                    return ValueTask.CompletedTask;
            }

            return null;
        }
    }

    internal class InterceptingCdpProxy : DispatchProxy
    {
        private ICDPSession _inner = null!;
        private List<(string Method, Dictionary<string, object>? Args)> _calls = null!;

        public static ICDPSession Create(ICDPSession inner, List<(string Method, Dictionary<string, object>? Args)> calls)
        {
            var proxy = Create<ICDPSession, InterceptingCdpProxy>();
            var impl = (InterceptingCdpProxy)(object)proxy;
            impl._inner = inner;
            impl._calls = calls;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            if (targetMethod?.Name == nameof(ICDPSession.SendAsync))
            {
                _calls.Add(((string)args![0]!, args.Length > 1 ? args[1] as Dictionary<string, object> : null));
            }

            return targetMethod?.Invoke(_inner, args);
        }
    }

    internal class FakeContextProxy : DispatchProxy
    {
        private IBrowser _browser = null!;

        public static IBrowserContext Create(IBrowser browser)
        {
            var proxy = Create<IBrowserContext, FakeContextProxy>();
            var impl = (FakeContextProxy)(object)proxy;
            impl._browser = browser;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            return targetMethod?.Name switch
            {
                "get_Browser" => _browser,
                "get_Pages" => (IReadOnlyList<IPage>)[],
                nameof(IBrowserContext.NewPageAsync) => Task.FromResult(FakePageProxy.Create()),
                nameof(IBrowserContext.CloseAsync) => Task.CompletedTask,
                nameof(IAsyncDisposable.DisposeAsync) => ValueTask.CompletedTask,
                _ => null,
            };
        }
    }

    internal class FakePageProxy : DispatchProxy
    {
        public static IPage Create() => Create<IPage, FakePageProxy>();

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) =>
            targetMethod?.Name == nameof(IPage.CloseAsync) ? Task.CompletedTask : null;
    }
}
