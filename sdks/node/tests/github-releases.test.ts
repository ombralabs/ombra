import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { describe, it } from "node:test";
import { binaryInfo, ensureBinary, resolveBinary, resolveReleaseEntry, _sleepHook } from "../dist/esm/binary.js";
import { BINARY_SIGNING_PUBKEYS, getPlatformInfo } from "../dist/esm/config.js";
import { BinaryNotFoundError, ChecksumMismatchError, DownloadFailedError } from "../dist/esm/errors.js";
import { buildTarGzBuffer, buildTarXzBuffer, buildZipBuffer, createTestSigningKeypair, makeFakeEngine, withIsolatedEnv, withSignedEngineServer } from "./helpers.js";

const API = "https://api.github.com/repos/ombralabs/ombra/releases";
const DOWNLOAD = "https://github.com/ombralabs/ombra/releases/download";

async function withGitHubFixture(run: (fixture: {
  version: string;
  release: (version?: string, prerelease?: boolean) => any;
  manifest: (version: string) => any;
  routes: Map<string, unknown>;
  statuses: Map<string, number>;
  requests: string[];
  cacheDir: string;
}) => Promise<void>, version = "151.0.7922.108-9"): Promise<void> {
  await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => {
    const plat = getPlatformInfo();
    const signer = createTestSigningKeypair();
    const keys = [...BINARY_SIGNING_PUBKEYS];
    const fetch = globalThis.fetch;
    const sleep = _sleepHook.sleep;
    const src = path.join(tmpRoot, "src");
    makeFakeEngine(src, { version });
    const files: Array<{ name: string; content: Buffer; mode: number }> = [];
    function collect(dir: string, prefix = ""): void {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = prefix + item.name;
        const file = path.join(dir, item.name);
        if (item.isDirectory()) collect(file, `${name}/`);
        else files.push({ name, content: fs.readFileSync(file), mode: fs.statSync(file).mode & 0o777 });
      }
    }
    collect(src);
    const archive = plat.archiveExt === ".zip"
      ? buildZipBuffer(files.map((file) => ({ ...file, unixMode: 0o100000 | file.mode })))
      : plat.archiveExt === ".tar.xz" ? buildTarXzBuffer(files) : buildTarGzBuffer(files);
    const name = (v: string) => `ombra-engine-${v}-${plat.cdnName}${plat.archiveExt}`;
    const release = (v = version, prerelease = false) => ({
      tag_name: `v${v}`, draft: false, prerelease,
      assets: [
        { name: "release.json", browser_download_url: `${DOWNLOAD}/v${v}/release.json` },
        { name: name(v), browser_download_url: `${DOWNLOAD}/v${v}/${name(v)}`, size: archive.length },
      ],
    });
    const manifest = (v: string) => ({ version: v, platforms: { [plat.cdnName]: { file: name(v), sha256: signer.sha256Hex(archive), size: archive.length } } });
    const routes = new Map<string, unknown>([
      [`${API}/latest`, release()],
      [`${API}?per_page=10&page=1`, [release()]],
      [`${API}/tags/v${version}`, release()],
      [`${DOWNLOAD}/v${version}/release.json`, signer.signEnvelope(manifest(version))],
      [`${DOWNLOAD}/v${version}/${name(version)}`, archive],
    ]);
    const statuses = new Map<string, number>();
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url!.slice(1));
      const body = routes.get(url);
      if (body === undefined || statuses.has(url)) { res.writeHead(statuses.get(url) ?? 404); res.end(); return; }
      res.end(Buffer.isBuffer(body) ? body : typeof body === "string" ? body : JSON.stringify(body));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const local = `http://127.0.0.1:${(server.address() as any).port}/`;
    delete process.env.OMBRA_DOWNLOAD_URL;
    BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, signer.rawPubB64);
    _sleepHook.sleep = async () => {};
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      requests.push(url);
      if (!url.startsWith(API) && !url.startsWith(`${DOWNLOAD}/`)) throw new Error(`Unexpected source ${url}`);
      return fetch(local + encodeURIComponent(url), init);
    };
    try {
      await run({ version, release, manifest, routes, statuses, requests, cacheDir });
    } finally {
      globalThis.fetch = fetch;
      _sleepHook.sleep = sleep;
      BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, ...keys);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}

describe("GitHub browser releases", () => {
  for (const releaseChannel of ["stable", "beta"]) {
    for (const requestedVersion of [undefined, "158.0.8127.37", "158.0.8127.37-2"]) {
      it(`installs Chromium 158 from GitHub ${releaseChannel} with pin ${requestedVersion ?? "latest"}`, async () => {
        await withGitHubFixture(async ({ version, release, routes, requests }) => {
          routes.set(`${API}?per_page=10&page=1`, [release(version, releaseChannel === "beta")]);
          const options = { version: requestedVersion, releaseChannel };
          const installed = await ensureBinary(options);
          assert.equal((await binaryInfo(options)).version, "158.0.8127.37-2");
          process.env.OMBRA_DOWNLOAD_URL = "off";
          const calls = requests.length;
          assert.equal((await resolveBinary({ ...options, download: false })).path, installed);
          assert.equal(requests.length, calls);
        }, "158.0.8127.37-2");
      });
    }
  }

  it("finds stable browser tags across pages and installs signed GitHub assets", async () => {
    await withGitHubFixture(async ({ version, release, routes, requests }) => {
      routes.set(`${API}/latest`, { tag_name: "v1.2.1", draft: false, prerelease: false });
      routes.set(`${API}?per_page=10&page=1`, Array.from({ length: 10 }, () => ({ tag_name: "v1.2.1", draft: false, prerelease: false })));
      routes.set(`${API}?per_page=10&page=2`, [
        release("151.0.7922.108-0+dev.abc"),
        { ...release("151.0.7922.108-12"), draft: true },
        release("151.0.7922.108-11", true),
        release(),
      ]);
      const installed = await ensureBinary();
      assert.equal(fs.existsSync(installed), true);
      assert.equal((await binaryInfo()).version, version);
      assert.equal(requests.includes(`${API}?per_page=10&page=2`), true);
      assert.equal(requests.some((url) => url === `${DOWNLOAD}/v${version}/release.json`), true);
      process.env.OMBRA_DOWNLOAD_URL = "off";
      const calls = requests.length;
      assert.equal((await resolveBinary({ download: false })).path, installed);
      assert.equal(requests.length, calls);
    });
  });

  it("resolves an exact version tag without consulting channel metadata", async () => {
    await withGitHubFixture(async ({ version, requests }) => {
      const installed = await ensureBinary({ version });
      assert.equal(requests[0], `${API}/tags/v${version}`);
      assert.equal(requests.some((url) => url.includes("per_page")), false);
      assert.equal((await binaryInfo()).installed, false);
      process.env.OMBRA_DOWNLOAD_URL = "off";
      assert.equal((await resolveBinary({ version, download: false })).path, installed);
      await assert.rejects(() => resolveBinary({ download: false }), BinaryNotFoundError);
    });
  });

  it("resolves Chromium-family pins from matching channel releases", async () => {
    await withGitHubFixture(async ({ version, release, routes, requests }) => {
      const params = { baseUrl: API, plat: getPlatformInfo(), requestedVersion: "151.0.7922.108", channel: "stable" };
      routes.set(`${API}?per_page=10&page=1`, [release("151.0.8000.1-1"), release(version, true), release()]);
      assert.equal((await resolveReleaseEntry(params)).version, version);
      assert.equal(requests[0], `${API}?per_page=10&page=1`);
      routes.set(`${API}?per_page=10&page=1`, [release(version, true)]);
      await assert.rejects(() => resolveReleaseEntry(params), BinaryNotFoundError);
      assert.equal((await resolveReleaseEntry({ ...params, channel: "beta" })).version, version);
    });
  });

  it("keeps stable and beta provenance separate when a shared version is reused", async () => {
    await withGitHubFixture(async ({ version, release, routes, requests }) => {
      routes.set(`${API}?per_page=10&page=1`, [release(version, true)]);
      const installed = await ensureBinary({ releaseChannel: "beta" });
      assert.equal((await binaryInfo()).installed, false);
      assert.equal((await binaryInfo({ releaseChannel: "beta" })).path, installed);
      await assert.rejects(() => resolveBinary({ download: false }), BinaryNotFoundError);
      assert.equal(requests.includes(`${API}/latest`), false);
      assert.equal(await ensureBinary(), installed);
      assert.equal(requests.filter((url) => url.endsWith(getPlatformInfo().archiveExt)).length, 1);
      process.env.OMBRA_DOWNLOAD_URL = "off";
      for (const releaseChannel of ["stable", "beta"]) {
        assert.equal((await resolveBinary({ download: false, releaseChannel })).path, installed);
      }
    });
  });

  it("does not adopt old CDN channel caches as current GitHub releases", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => withSignedEngineServer(tmpRoot, async () => {
      const installed = await ensureBinary();
      const version = (await binaryInfo()).version;
      delete process.env.OMBRA_DOWNLOAD_URL;
      assert.equal((await binaryInfo()).installed, false);
      await assert.rejects(() => resolveBinary({ download: false }), BinaryNotFoundError);
      assert.equal((await resolveBinary({ version, download: false })).path, installed);
    }));
  });

  it("rejects altered GitHub cache evidence without losing explicit offline pins", async () => {
    await withGitHubFixture(async ({ version, cacheDir }) => {
      const installed = await ensureBinary();
      const marker = path.join(cacheDir, "engines", `.latest_github_stable_${getPlatformInfo().cdnName}`);
      const saved = JSON.parse(fs.readFileSync(marker, "utf8"));
      for (const altered of [
        { ...saved, source: "https://dl.ombrabrowser.dev" },
        { ...saved, channel: "beta" },
        { ...saved, release: { ...saved.release, prerelease: true } },
        { ...saved, release: { ...saved.release, tag_name: "v151.0.7922.108-8" } },
        { ...saved, envelope: JSON.stringify({ signed: "{}", sig: Buffer.alloc(64).toString("base64") }) },
      ]) {
        fs.writeFileSync(marker, JSON.stringify(altered));
        assert.equal((await binaryInfo()).installed, false);
        await assert.rejects(() => resolveBinary({ download: false }), BinaryNotFoundError);
        assert.equal((await resolveBinary({ version, download: false })).path, installed);
      }
      fs.writeFileSync(marker, JSON.stringify(saved));
      assert.equal((await resolveBinary({ download: false })).path, installed);
    });
  });

  it("reports an empty GitHub release feed without a CDN fallback", async () => {
    await withGitHubFixture(async ({ routes, requests }) => {
      routes.delete(`${API}/latest`);
      routes.set(`${API}?per_page=10&page=1`, []);
      await assert.rejects(() => ensureBinary(), BinaryNotFoundError);
      assert.deepEqual(requests, [`${API}/latest`, `${API}?per_page=10&page=1`]);
    });
  });

  it("honors GitHub's latest stable selection ahead of newer versions in the release list", async () => {
    await withGitHubFixture(async ({ version, release, routes, requests }) => {
      routes.set(`${API}?per_page=10&page=1`, [release("151.0.7922.108-12"), release()]);
      const entry = await resolveReleaseEntry({ baseUrl: API, plat: getPlatformInfo(), requestedVersion: null, channel: "stable" });
      assert.equal(entry.version, version);
      assert.deepEqual(requests, [`${API}/latest`, `${DOWNLOAD}/v${version}/release.json`]);
    });
  });

  it("falls back to browser stable lists only for missing or non-browser latest selections", async () => {
    await withGitHubFixture(async ({ version, release, routes, requests, statuses }) => {
      const latestUrl = `${API}/latest`;
      const params = { baseUrl: API, plat: getPlatformInfo(), requestedVersion: null, channel: "stable" };
      for (const latest of [
        { ...release(), tag_name: "v1.2.1" },
        release("151.0.7922.108-0+dev.abc"),
        release(version, true),
        { ...release(), draft: true },
      ]) {
        routes.set(latestUrl, latest);
        requests.length = 0;
        assert.equal((await resolveReleaseEntry(params)).version, version);
        assert.deepEqual(requests, [latestUrl, `${API}?per_page=10&page=1`, `${DOWNLOAD}/v${version}/release.json`]);
      }
      statuses.set(latestUrl, 404);
      requests.length = 0;
      assert.equal((await resolveReleaseEntry(params)).version, version);
      assert.deepEqual(requests, [latestUrl, `${API}?per_page=10&page=1`, `${DOWNLOAD}/v${version}/release.json`]);
    });
  });

  it("propagates rate, server, network, and invalid JSON failures from latest", async () => {
    await withGitHubFixture(async ({ routes, requests, statuses }) => {
      const latestUrl = `${API}/latest`;
      const params = { baseUrl: API, plat: getPlatformInfo(), requestedVersion: null, channel: "stable" };
      for (const status of [403, 429, 500]) {
        statuses.set(latestUrl, status);
        requests.length = 0;
        await assert.rejects(() => resolveReleaseEntry(params), (err: unknown) => err instanceof DownloadFailedError && err.details.status === status);
        assert.deepEqual(requests, [latestUrl]);
      }
      statuses.delete(latestUrl);
      routes.set(latestUrl, "not JSON");
      requests.length = 0;
      await assert.rejects(() => resolveReleaseEntry(params), DownloadFailedError);
      assert.deepEqual(requests, [latestUrl]);
      const fetch = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (String(input) !== latestUrl) return fetch(input, init);
        requests.push(latestUrl);
        throw new TypeError("fixture connection failed");
      };
      requests.length = 0;
      await assert.rejects(() => resolveReleaseEntry(params), DownloadFailedError);
      assert.deepEqual(requests, [latestUrl]);
    });
  });

  it("reads bounded pages of asset-rich release records and retains the manifest limit", async () => {
    await withGitHubFixture(async ({ version, release, routes, requests }) => {
      const apiRecord = { ...release(version, true), assets: [
        ...release(version, true).assets,
        ...Array.from({ length: 18 }, (_, i) => ({
          name: `browser-platform-${i}.zip`, size: 400_000_000,
          browser_download_url: `${DOWNLOAD}/v${version}/browser-platform-${i}.zip`,
          uploader: { login: "release-builder", avatar_url: "https://avatars.githubusercontent.com/u/1", html_url: "https://github.com/release-builder" },
          created_at: "2026-11-20T00:00:00Z", updated_at: "2026-11-20T00:00:00Z",
        })),
      ], body: "Browser release notes. ".repeat(500) };
      assert.ok(Buffer.byteLength(JSON.stringify(Array(100).fill(apiRecord))) > 1024 * 1024);
      const records = Array(10).fill(apiRecord);
      assert.ok(Buffer.byteLength(JSON.stringify(records)) < 1024 * 1024);
      routes.set(`${API}?per_page=10&page=1`, records);
      const params = { baseUrl: API, plat: getPlatformInfo(), requestedVersion: null, channel: "beta" };
      assert.equal((await resolveReleaseEntry(params)).version, version);
      assert.deepEqual(requests, [`${API}?per_page=10&page=1`, `${DOWNLOAD}/v${version}/release.json`]);
      routes.set(`${DOWNLOAD}/v${version}/release.json`, Buffer.alloc(1024 * 1024 + 1, " "));
      await assert.rejects(() => resolveReleaseEntry(params), (err: unknown) => err instanceof DownloadFailedError && /1 MiB/.test(err.message));
    });
  });

  it("fails closed on invalid release identity, assets, signatures, and signed metadata", async () => {
    await withGitHubFixture(async ({ version, release, manifest, routes }) => {
      const apiUrl = `${API}/tags/v${version}`;
      const manifestUrl = `${DOWNLOAD}/v${version}/release.json`;
      const validRelease = release();
      const validManifest = routes.get(manifestUrl)!;
      const params = { baseUrl: API, plat: getPlatformInfo(), requestedVersion: version, channel: "stable" };
      for (const badRelease of [
        { ...release(), tag_name: "v151.0.7922.108-8" },
        { ...release(), draft: true },
        { ...release(), assets: [] },
        { ...release(), assets: [...release().assets, release().assets[0]] },
        { ...release(), assets: release().assets.map((asset: any) => ({ ...asset, browser_download_url: "https://dl.ombrabrowser.dev/wrong" })) },
        { ...release(), assets: release().assets.map((asset: any) => ({ ...asset, size: 1 })) },
      ]) {
        routes.set(apiUrl, badRelease);
        await assert.rejects(() => resolveReleaseEntry(params), ChecksumMismatchError);
      }
      routes.set(apiUrl, validRelease);
      const signer = createTestSigningKeypair();
      BINARY_SIGNING_PUBKEYS.push(signer.rawPubB64);
      const plat = getPlatformInfo();
      for (const invalid of [
        { ...manifest(version), version: "151.0.7922.108-8" },
        ...[{ file: "../engine.tar.gz" }, { sha256: "invalid" }, { size: 0 }, { size: "1" }].map((override) => ({ ...manifest(version), platforms: { [plat.cdnName]: { ...manifest(version).platforms[plat.cdnName], ...override } } })),
      ]) {
        routes.set(manifestUrl, signer.signEnvelope(invalid));
        await assert.rejects(() => resolveReleaseEntry(params), ChecksumMismatchError);
      }
      routes.set(manifestUrl, JSON.stringify({ signed: "{}", sig: Buffer.alloc(64).toString("base64") }));
      await assert.rejects(() => resolveReleaseEntry(params), ChecksumMismatchError);
      routes.set(manifestUrl, validManifest);
      assert.equal((await resolveReleaseEntry(params)).version, version);
      routes.set(apiUrl, "not JSON");
      await assert.rejects(() => resolveReleaseEntry(params), DownloadFailedError);
    });
  });
});
