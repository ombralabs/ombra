using System.Formats.Tar;
using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json;
using OmbraLabs.Ombra;
using Xunit;

namespace OmbraTests;

[Collection("OmbraEnv")]
public sealed class BinaryTests
{
    private const string GitHubApi = "https://api.github.com/repos/ombralabs/ombra/releases";
    private const string GitHubDownload = "https://github.com/ombralabs/ombra/releases/download";

    private sealed class MockHttpHandler : HttpMessageHandler
    {
        public Dictionary<string, Func<HttpResponseMessage>> Routes { get; } = new(StringComparer.Ordinal);
        public List<string> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var url = request.RequestUri!.AbsoluteUri;
            Requests.Add(url);
            if (Routes.TryGetValue(url, out var factory))
            {
                return Task.FromResult(factory());
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }

    [Fact]
    public void PrefersCanonicalNativePathsAndRejectsAmbiguousOrConflictingLayouts()
    {
        Assert.EndsWith(
            Path.Combine("Ombra.app", "Contents", "MacOS", "Ombra"),
            OmbraConfig.BinaryCandidatesInDir("/engine", "Darwin")[0]);
        Assert.EndsWith("ombra.exe", OmbraConfig.BinaryCandidatesInDir("/engine", "Windows")[0]);
        Assert.EndsWith("ombra", OmbraConfig.BinaryCandidatesInDir("/engine", "Linux")[0]);

        using var env = new IsolatedEnv();
        var version = "158.0.8127.37-3";
        var root = Path.Combine(env.CacheDir, "engines", version);
        var bin = TestFixtures.MakeFakeEngine(root, version: version, layout: "ombra");

        // Native layout resolves cleanly
        var info = Ombra.BinaryInfo(version: version);
        Assert.True(info.Installed);
        Assert.Equal("cache", info.Source);
        Assert.Equal(bin, info.Path);
        Assert.Matches(@"^[a-f0-9]{64}$", info.Sha256!);

        // Adding a competing legacy executable in the same dir is rejected
        TestFixtures.MakeFakeEngine(root, version: version, layout: "legacy");
        Assert.False(Ombra.BinaryInfo(version: version).Installed);

        // Conflicting ombra-build.json metadata is rejected
        var conflictRoot = Path.Combine(env.CacheDir, "engines", "158.0.8127.37-2");
        var conflictBin = TestFixtures.MakeFakeEngine(conflictRoot, version: "158.0.8127.37-2", layout: "ombra");
        var appRoot = OperatingSystem.IsMacOS()
            ? Path.GetFullPath(Path.Combine(Path.GetDirectoryName(conflictBin)!, "..", ".."))
            : conflictRoot;
        var duplicateMeta = OperatingSystem.IsMacOS()
            ? Path.Combine(appRoot, "ombra-build.json")
            : Path.Combine(appRoot, "Contents", "Resources", "ombra-build.json");
        Directory.CreateDirectory(Path.GetDirectoryName(duplicateMeta)!);
        File.WriteAllText(duplicateMeta, JsonSerializer.Serialize(new { version = "158.0.8127.37-3" }));

        Assert.False(Ombra.BinaryInfo(version: "158.0.8127.37-2").Installed);
    }

    [Fact]
    public async Task EnforcesResolutionOrderAndEngineRangeAndClearCachePreservesProfiles()
    {
        using var env = new IsolatedEnv();

        var argBin = TestFixtures.MakeFakeEngine(Path.Combine(env.TmpRoot, "arg"), version: "158.0.8127.37-3");
        var envBin = TestFixtures.MakeFakeEngine(Path.Combine(env.TmpRoot, "env"), version: "158.0.8127.37-2");
        var appBin = TestFixtures.MakeFakeEngine(Path.Combine(env.AppEnginesDir, "versions", "158.0.8127.37-1"), version: "158.0.8127.37-1");
        File.WriteAllText(Path.Combine(env.AppEnginesDir, "selection.json"), JsonSerializer.Serialize(new { active = "158.0.8127.37-1" }));

        // 1. App resolution when no arg/env
        var appInfo = Ombra.BinaryInfo();
        Assert.Equal("app", appInfo.Source);
        Assert.Equal(appBin, appInfo.Path);

        // 2. Env beats app
        Environment.SetEnvironmentVariable("OMBRA_BINARY_PATH", envBin);
        var envInfo = Ombra.BinaryInfo();
        Assert.Equal("env", envInfo.Source);
        Assert.Equal(envBin, envInfo.Path);

        // 3. Explicit argument beats env
        var argInfo = Ombra.BinaryInfo(binaryPath: argBin);
        Assert.Equal("argument", argInfo.Source);
        Assert.Equal(argBin, argInfo.Path);

        // 4. Out-of-range engines fail compatibility check
        Assert.Throws<UnsupportedEngineException>(() => BinaryManager.CheckEngineCompatibility("150.0.0.1"));
        Assert.Throws<UnsupportedEngineException>(() => BinaryManager.CheckEngineCompatibility("159.0.0.1"));
        BinaryManager.CheckEngineCompatibility("151.0.7922.108");
        BinaryManager.CheckEngineCompatibility("158.0.8127.37-3");

        // 5. Tampered checksum fails unless OMBRA_SKIP_CHECKSUM=1
        var cacheRoot = Path.Combine(env.CacheDir, "engines", "158.0.8127.37-3");
        TestFixtures.MakeFakeEngine(cacheRoot, version: "158.0.8127.37-3");
        File.WriteAllText(Path.Combine(cacheRoot, "binary.sha256"), new string('0', 64));
        Environment.SetEnvironmentVariable("OMBRA_BINARY_PATH", null);
        Directory.Delete(env.AppEnginesDir, recursive: true);

        await Assert.ThrowsAsync<ChecksumMismatchException>(() =>
            BinaryManager.ResolveBinaryAsync(version: "158.0.8127.37-3", download: false));

        Environment.SetEnvironmentVariable("OMBRA_SKIP_CHECKSUM", "1");
        var bypassed = await BinaryManager.ResolveBinaryAsync(version: "158.0.8127.37-3", download: false);
        Assert.True(bypassed.Installed);

        // 6. ClearCache removes engines/ while preserving profiles/
        var profileMarker = Path.Combine(env.CacheDir, "profiles", "keep-me", "data.txt");
        Directory.CreateDirectory(Path.GetDirectoryName(profileMarker)!);
        File.WriteAllText(profileMarker, "keep");
        Ombra.ClearCache();
        Assert.False(Directory.Exists(Path.Combine(env.CacheDir, "engines")));
        Assert.True(File.Exists(profileMarker));
    }

    [Fact]
    public async Task DownloadsAndVerifiesSignedGitHubReleaseAndSupportsOfflineReuse()
    {
        using var env = new IsolatedEnv();
        var plat = OmbraConfig.GetPlatformInfo();
        // Use tar.gz or zip matching host (skip tar.xz archive generation if xz isn't installed on Linux test host)
        if (plat.ArchiveExt == ".tar.xz")
        {
            return;
        }

        const string version = "158.0.8127.37-3";
        var signer = new TestSigner();
        OmbraConfig.BinarySigningPubKeys.Clear();
        OmbraConfig.BinarySigningPubKeys.Add(signer.PublicKeyBase64);
        Environment.SetEnvironmentVariable("OMBRA_DOWNLOAD_URL", null); // Use default GitHub Releases

        var srcDir = Path.Combine(env.TmpRoot, "pkg-src");
        TestFixtures.MakeFakeEngine(srcDir, version: version, layout: "ombra");
        var archive = TestFixtures.BuildArchiveFromDirectory(srcDir, plat.ArchiveExt);
        var assetName = $"ombra-engine-{version}-{plat.CdnName}{plat.ArchiveExt}";

        object BuildRelease(string v, bool prerelease) => new
        {
            tag_name = $"v{v}",
            draft = false,
            prerelease,
            assets = new object[]
            {
                new { name = "release.json", browser_download_url = $"{GitHubDownload}/v{v}/release.json", size = 100 },
                new { name = assetName, browser_download_url = $"{GitHubDownload}/v{v}/{assetName}", size = archive.Length },
            },
        };

        var manifestEnvelope = signer.SignEnvelope(new Dictionary<string, object>
        {
            ["schema"] = 1,
            ["type"] = "release",
            ["version"] = version,
            ["platforms"] = new Dictionary<string, object>
            {
                [plat.CdnName] = new Dictionary<string, object>
                {
                    ["file"] = assetName,
                    ["sha256"] = TestSigner.Sha256Hex(archive),
                    ["size"] = archive.Length,
                },
            },
        });

        var handler = new MockHttpHandler();
        // /latest points to a non-browser desktop tag -> SDK must fall back to paginated list
        handler.Routes[$"{GitHubApi}/latest"] = () => JsonResponse(new { tag_name = "desktop-v1.2.3", draft = false, prerelease = false });
        handler.Routes[$"{GitHubApi}?per_page=10&page=1"] = () => JsonResponse(new object[]
        {
            new { tag_name = "v158.0.8127.37-0+dev.abc", draft = false, prerelease = false },
            BuildRelease(version, prerelease: true),
            BuildRelease(version, prerelease: false),
        });
        handler.Routes[$"{GitHubDownload}/v{version}/release.json"] = () => TextResponse(manifestEnvelope);
        handler.Routes[$"{GitHubDownload}/v{version}/{assetName}"] = () => BytesResponse(archive);
        BinaryManager.SetHttpHandlerForTests(handler);
        BinaryManager.DelayHook = (_, _) => Task.CompletedTask;

        var installedPath = await Ombra.EnsureBinaryAsync();
        Assert.True(File.Exists(installedPath));
        Assert.Equal(version, Ombra.BinaryInfo().Version);
        Assert.True(Ombra.BinaryInfo().Installed);

        // Offline reuse works with OMBRA_DOWNLOAD_URL=off and zero network calls
        Environment.SetEnvironmentVariable("OMBRA_DOWNLOAD_URL", "off");
        var callsBefore = handler.Requests.Count;
        var offline = await BinaryManager.ResolveBinaryAsync(download: false);
        Assert.Equal(installedPath, offline.Path);
        Assert.Equal(callsBefore, handler.Requests.Count);

        // Tampering with GitHub provenance marker invalidates unpinned resolution while keeping pinned cache usable
        var marker = Path.Combine(env.CacheDir, "engines", $".latest_github_stable_{plat.CdnName}");
        File.WriteAllText(marker, JsonSerializer.Serialize(new { source = "https://evil.example", channel = "stable", envelope = "{}" }));
        Assert.False(Ombra.BinaryInfo().Installed);
        Assert.True(Ombra.BinaryInfo(version: version).Installed);
    }

    [Fact]
    public async Task FailsClosedOnBadEd25519SignatureRollbackAndInsecureUrl()
    {
        using var env = new IsolatedEnv();
        var plat = OmbraConfig.GetPlatformInfo();
        var signer = new TestSigner();
        OmbraConfig.BinarySigningPubKeys.Clear();
        OmbraConfig.BinarySigningPubKeys.Add(signer.PublicKeyBase64);

        Assert.Throws<DownloadFailedException>(() =>
            BinaryManager.ValidateDownloadUrl("http://downloads.example.com/engine.tar.gz"));
        BinaryManager.ValidateDownloadUrl("https://downloads.example.com/engine.tar.gz");
        BinaryManager.ValidateDownloadUrl("http://127.0.0.1:8080/engine.tar.gz");

        var badEnvelope = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
        {
            signed = "{}",
            sig = Convert.ToBase64String(new byte[64]),
        }));
        Assert.Throws<ChecksumMismatchException>(() =>
            BinaryManager.VerifySignedEnvelope(badEnvelope, "release"));

        // Legacy mirror serial rollback protection
        const string mirror = "https://mirror.example.test";
        var filename = $"ombra-engine-158.0.8127.37-3-{plat.CdnName}{plat.ArchiveExt}";
        string MakeChannelEnvelope(long serial) => signer.SignEnvelope(new Dictionary<string, object>
        {
            ["schema"] = 1,
            ["type"] = "channel",
            ["channel"] = "stable",
            ["serial"] = serial,
            ["platforms"] = new Dictionary<string, object>
            {
                [plat.CdnName] = new Dictionary<string, object>
                {
                    ["version"] = "158.0.8127.37-3",
                    ["path"] = $"/engine/releases/158.0.8127.37-3/{filename}",
                    ["sha256"] = new string('a', 64),
                    ["size"] = 123,
                },
            },
        });

        var handler = new MockHttpHandler();
        var currentSerial = 5L;
        handler.Routes[$"{mirror}/engine/channels/stable.json"] = () => TextResponse(MakeChannelEnvelope(currentSerial));
        BinaryManager.SetHttpHandlerForTests(handler);

        var first = await BinaryManager.FetchReleaseEntryAsync(mirror, plat, null, "stable", CancellationToken.None);
        Assert.Equal("158.0.8127.37-3", first.Version);

        currentSerial = 4L; // Rollback!
        await Assert.ThrowsAsync<ChecksumMismatchException>(() =>
            BinaryManager.FetchReleaseEntryAsync(mirror, plat, null, "stable", CancellationToken.None));
    }

    [Fact]
    public async Task RejectsZipSlipAndTarSlipArchiveEntries()
    {
        using var env = new IsolatedEnv();

        // Zip-Slip path traversal
        var badZip = Path.Combine(env.TmpRoot, "bad.zip");
        using (var zip = ZipFile.Open(badZip, ZipArchiveMode.Create))
        {
            var entry = zip.CreateEntry("../escape.txt");
            using var sw = new StreamWriter(entry.Open());
            sw.Write("nope");
        }

        await Assert.ThrowsAsync<ChecksumMismatchException>(() =>
            ArchiveExtractor.SafeExtractZipAsync(badZip, Path.Combine(env.TmpRoot, "zip-out")));

        // Zip symlink entry
        var symlinkZip = Path.Combine(env.TmpRoot, "symlink.zip");
        using (var zip = ZipFile.Open(symlinkZip, ZipArchiveMode.Create))
        {
            var entry = zip.CreateEntry("link");
            entry.ExternalAttributes = (0xA000 | 0x1FF) << 16;
            using var sw = new StreamWriter(entry.Open());
            sw.Write("/etc/passwd");
        }

        await Assert.ThrowsAsync<ChecksumMismatchException>(() =>
            ArchiveExtractor.SafeExtractZipAsync(symlinkZip, Path.Combine(env.TmpRoot, "zip-sym-out")));

        // Tar.gz escaping symlink
        var badTar = Path.Combine(env.TmpRoot, "bad.tar.gz");
        using (var fs = File.Create(badTar))
        using (var gz = new GZipStream(fs, CompressionLevel.Fastest))
        using (var tar = new TarWriter(gz, TarEntryFormat.Pax))
        {
            var sym = new PaxTarEntry(TarEntryType.SymbolicLink, "escape")
            {
                LinkName = "../../etc/passwd",
            };
            tar.WriteEntry(sym);
        }

        await Assert.ThrowsAsync<ChecksumMismatchException>(() =>
            ArchiveExtractor.SafeExtractTarGzAsync(badTar, Path.Combine(env.TmpRoot, "tar-out")));
    }

    private static HttpResponseMessage JsonResponse(object payload) =>
        new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json") };

    private static HttpResponseMessage TextResponse(string text) =>
        new(HttpStatusCode.OK) { Content = new StringContent(text, Encoding.UTF8, "application/json") };

    private static HttpResponseMessage BytesResponse(byte[] bytes) =>
        new(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) };
}
