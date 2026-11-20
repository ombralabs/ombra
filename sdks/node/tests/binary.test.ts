import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { acquireFileLock } from "../dist/esm/file-lock.js";
import http from "node:http";
import path from "node:path";
import { describe, it } from "node:test";
import { safeExtractTarGz, safeExtractTarXz, safeExtractZip } from "../dist/esm/archive.js";
import { resolveBinary, resolveReleaseEntry, verifyBinary, verifySignedEnvelope } from "../dist/esm/binary.js";
import { BINARY_SIGNING_PUBKEYS, getPlatformInfo, logger } from "../dist/esm/config.js";
import {
  BinaryNotFoundError,
  ChecksumMismatchError,
  DownloadFailedError,
  UnsupportedEngineError,
  _sleepHook,
  binaryInfo,
  clearCache,
  ensureBinary,
} from "../dist/esm/index.js";
import {
  buildTarGzBuffer,
  buildTarXzBuffer,
  buildZipBuffer,
  createTestSigningKeypair,
  makeFakeEngine,
  withIsolatedEnv,
  withSignedEngineServer,
} from "./helpers.js";

describe("binary resolution, archive safety, and Ed25519 download verification", () => {
  function child(code: string, key: string): Promise<string> {
    const configUrl = new URL("../dist/esm/config.js", import.meta.url).href;
    const binaryUrl = new URL("../dist/esm/binary.js", import.meta.url).href;
    const proc = spawn(process.execPath, ["--input-type=module", "-e", `
      import { BINARY_SIGNING_PUBKEYS } from ${JSON.stringify(configUrl)};
      import { ensureBinary, resolveBinary, clearCache } from ${JSON.stringify(binaryUrl)};
      BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, ${JSON.stringify(key)});
      ${code}
    `], { env: process.env, stdio: ["ignore", "pipe", "pipe"], timeout: 10_000 });
    let out = "", err = "";
    proc.stdout.on("data", (chunk) => out += chunk);
    proc.stderr.on("data", (chunk) => err += chunk);
    return new Promise((resolve, reject) => {
      proc.on("error", reject);
      proc.on("exit", (code) => code === 0 ? resolve(out.trim()) : reject(new Error(`child exit ${code}: ${err}`)));
    });
  }

  async function children(tasks: Promise<string>[]): Promise<string[]> {
    const results = await Promise.allSettled(tasks);
    return results.map(result => {
      if (result.status === "rejected") throw result.reason;
      return result.value;
    });
  }

  it("keeps beta out of stable fallback and adopts signed channel cache without transfer", async () => {
    await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => withSignedEngineServer(tmpRoot, async (cdn) => {
      const beta = await ensureBinary({ releaseChannel: "beta" });
      assert.equal((await binaryInfo({ releaseChannel: "stable" })).installed, false);
      await assert.rejects(() => resolveBinary({ releaseChannel: "stable", download: false }), BinaryNotFoundError);
      const inode = fs.statSync(beta).ino;
      assert.equal(await ensureBinary({ releaseChannel: "stable" }), beta);
      assert.equal(cdn.archiveRequests, 1);
      assert.equal(fs.statSync(beta).ino, inode);
    }));
  });

  it("keeps release pins out of stable fallback and adopts them only with signed channel evidence", async () => {
    await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => withSignedEngineServer(tmpRoot, async (cdn) => {
      const pinned = await ensureBinary({ version: cdn.version });
      assert.equal(fs.existsSync(path.join(cacheDir, "engines", `.latest_stable_${getPlatformInfo().cdnName}`)), false);
      process.env.OMBRA_DOWNLOAD_URL = "off";
      assert.equal(await ensureBinary({ version: cdn.version }), pinned);
      await assert.rejects(() => ensureBinary(), BinaryNotFoundError);
      process.env.OMBRA_DOWNLOAD_URL = cdn.baseUrl;
      assert.equal(await ensureBinary(), pinned);
      assert.equal(cdn.archiveRequests, 1);
    }));
  });

  it("separate processes install once and preserve valid immutable versions during concurrent updates", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => withSignedEngineServer(tmpRoot, async (cdn) => {
      const outputs = await children([child('console.log(await ensureBinary())', cdn.signer.rawPubB64), child('console.log(await ensureBinary())', cdn.signer.rawPubB64)]);
      assert.equal(outputs[0], outputs[1]);
      assert.equal(cdn.archiveRequests, 1);
      const oldPath = outputs[0], oldInode = fs.statSync(oldPath).ino;
      const oldVersion = cdn.version;
      cdn.version = "151.0.7922.108-8";
      cdn.serial++;
      const observer = child(`for (let i = 0; i < 100; i++) { const r = await resolveBinary({ version: ${JSON.stringify(oldVersion)}, download: false }); if (r.path !== ${JSON.stringify(oldPath)}) throw Error("previous engine disappeared"); await new Promise(r => setTimeout(r, 5)); }`, cdn.signer.rawPubB64);
      await children([observer, child('await resolveBinary({forceUpdateCheck:true})', cdn.signer.rawPubB64), child('await resolveBinary({forceUpdateCheck:true})', cdn.signer.rawPubB64)]);
      assert.equal(cdn.archiveRequests, 2);
      assert.equal(fs.statSync(oldPath).ino, oldInode);
      assert.equal((await binaryInfo()).version, cdn.version);
    }));
  });

  it("publication failure preserves previous bytes and receipts and cleans partial directories", async () => {
    await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => withSignedEngineServer(tmpRoot, async (cdn) => {
      const previous = await ensureBinary();
      const bytes = fs.readFileSync(previous);
      const previousDir = path.join(cacheDir, "engines", cdn.version);
      const receipt = fs.readFileSync(path.join(previousDir, "binary.sha256"));
      cdn.version = "151.0.7922.108-8";
      cdn.serial++;
      const dest = path.join(cacheDir, "engines", cdn.version);
      const damaged = makeFakeEngine(dest, { version: "150.0.7000.1" });
      const damagedBytes = fs.readFileSync(damaged);
      const damagedReceipt = fs.readFileSync(path.join(dest, "binary.sha256"));
      const rename = fs.renameSync;
      const sleep = _sleepHook.sleep;
      fs.renameSync = ((from, to) => {
        if (String(from).includes(".partial-") && String(to) === dest) throw new Error("injected publication failure");
        return rename(from, to);
      }) as typeof fs.renameSync;
      _sleepHook.sleep = async () => {};
      try {
        const fallback = await resolveBinary({ forceUpdateCheck: true });
        assert.equal(fallback.path, previous);
      } finally {
        fs.renameSync = rename;
        _sleepHook.sleep = sleep;
      }
      assert.deepEqual(fs.readFileSync(previous), bytes);
      assert.deepEqual(fs.readFileSync(path.join(previousDir, "binary.sha256")), receipt);
      assert.deepEqual(fs.readFileSync(damaged), damagedBytes);
      assert.deepEqual(fs.readFileSync(path.join(dest, "binary.sha256")), damagedReceipt);
      assert.equal((await binaryInfo()).path, previous);
      assert.equal(fs.readdirSync(path.join(cacheDir, "engines")).some(n => /\.(partial|stale)-/.test(n)), false);
    }));
  });

  it("clearCache waits for installer ownership and preserves the root lock inode", async () => {
    await withIsolatedEnv(async ({ cacheDir }) => {
      const lockPath = path.join(cacheDir, ".install.lock");
      const lock = acquireFileLock(lockPath);
      const inode = fs.statSync(lockPath).ino;
      const marker = path.join(cacheDir, "engines", "keep");
      fs.mkdirSync(path.dirname(marker));
      fs.writeFileSync(marker, "keep");
      let completed = false;
      const clearing = child('await clearCache()', "").then(() => { completed = true; });
      try {
        await new Promise(r => setTimeout(r, 300));
        assert.equal(completed, false);
        assert.equal(fs.existsSync(marker), true);
      } finally { lock.release(); }
      await clearing;
      assert.equal(fs.existsSync(marker), false);
      assert.equal(fs.statSync(lockPath).ino, inode);
    });
  });

  it("rejects legacy, tampered and wrong-channel cache provenance while preserving explicit pins", async () => {
    await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => withSignedEngineServer(tmpRoot, async (cdn) => {
      const bin = await ensureBinary({ releaseChannel: "beta" });
      const plat = getPlatformInfo();
      const betaMarker = path.join(cacheDir, "engines", `.latest_beta_${plat.cdnName}`);
      const stableMarker = path.join(cacheDir, "engines", `.latest_stable_${plat.cdnName}`);
      const betaEnvelope = fs.readFileSync(betaMarker, "utf8");
      for (const marker of [cdn.version + "\n", betaEnvelope, JSON.stringify({ signed: "{}", sig: Buffer.alloc(64).toString("base64") })]) {
        fs.writeFileSync(stableMarker, marker);
        assert.equal((await binaryInfo()).installed, false);
        assert.equal(await ensureBinary({ version: cdn.version }), bin);
      }
    }));
  });

  it("serializes channel serial commits and rejects rollback after concurrent metadata checks", async () => {
    await withIsolatedEnv(async ({ cacheDir }) => {
      const signer = createTestSigningKeypair();
      const keys = [...BINARY_SIGNING_PUBKEYS];
      const originalFetch = globalThis.fetch;
      const plat = getPlatformInfo();
      const version = "151.0.7922.108-7";
      let request = 0;
      BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, signer.rawPubB64);
      globalThis.fetch = async () => {
        const serial = request++ === 0 ? 10 : 11;
        await new Promise(r => setTimeout(r, serial === 10 ? 60 : 1));
        return new Response(signer.signEnvelope({ channel: "stable", serial, platforms: {
          [plat.cdnName]: { version, path: `/engine/releases/${version}/ombra-engine-${version}-${plat.cdnName}${plat.archiveExt}`, sha256: "a".repeat(64), size: 1 },
        } }).toString());
      };
      const params = { baseUrl: "https://fixture.invalid", plat, requestedVersion: null, channel: "stable" };
      try {
        const results = await Promise.allSettled([resolveReleaseEntry(params), resolveReleaseEntry(params)]);
        assert.equal(results.every(r => r.status === "fulfilled"), true);
        assert.equal(fs.readFileSync(path.join(cacheDir, "engines", ".serial_stable"), "utf8").trim(), "11");
        request = 0;
        await assert.rejects(() => resolveReleaseEntry(params), ChecksumMismatchError);
      } finally {
        globalThis.fetch = originalFetch;
        BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, ...keys);
      }
    });
  });

  it("does not retry installer lock open failures as contention", async () => {
    await withIsolatedEnv(async ({ cacheDir }) => {
      fs.mkdirSync(path.join(cacheDir, ".install.lock"));
      await assert.rejects(() => clearCache(), (err: NodeJS.ErrnoException) => err.code === "EISDIR" || err.code === "EACCES");
    });
  });

  for (const source of ["app", "cache"] as const) {
    for (const receipt of [null, "not-a-sha256", "0".repeat(64)]) {
      it(`rejects ${source} ${receipt === null ? "missing" : receipt.length === 64 ? "mismatched" : "malformed"} receipt before executing a version probe`, async () => {
        await withIsolatedEnv(async ({ tmpRoot, cacheDir, appEnginesDir }) => {
          const root = source === "app" ? appEnginesDir : path.join(cacheDir, "engines", "151.0.7922.108-7");
          const marker = path.join(tmpRoot, "executed");
          const bin = makeFakeEngine(root, {
            version: "151.0.7922.108-7",
            scriptBody: `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "executed"); console.log("Ombra Chromium 151.0.7922.108");`,
          });
          const metadata = process.platform === "darwin"
            ? path.join(root, "Chromium.app", "Contents", "Resources", "ombra-build.json")
            : path.join(root, "ombra-build.json");
          fs.rmSync(metadata);
          const receiptPath = path.join(root, "binary.sha256");
          if (receipt === null) fs.rmSync(receiptPath);
          else fs.writeFileSync(receiptPath, receipt + "\n");
          let rejection: unknown;
          try { await resolveBinary({ download: false, ...(source === "cache" ? { version: "151.0.7922.108-7" } : {}) }); } catch (err) { rejection = err; }
          assert.equal(fs.existsSync(marker), false, `unverified ${bin} executed`);
          assert.ok(rejection instanceof ChecksumMismatchError, "must reject the untrusted receipt with a typed error");
          assert.match(rejection.message, /binary\.sha256|SHA-256/);
          assert.equal((await binaryInfo()).installed, false);
        });
      });
    }
  }

  it("supports an explicit external development binary without a managed receipt", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const bin = makeFakeEngine(tmpRoot, { version: "151.0.7922.108-7" });
      fs.rmSync(path.join(tmpRoot, "binary.sha256"));
      assert.equal(await ensureBinary({ binaryPath: bin, version: "151.0.7922.108-7" }), bin);
      assert.equal((await binaryInfo({ binaryPath: bin, version: "151.0.7922.108" })).version, "151.0.7922.108-7");
      fs.writeFileSync(path.join(tmpRoot, "binary.sha256"), "invalid receipt");
      await assert.rejects(() => ensureBinary({ binaryPath: bin }), ChecksumMismatchError);
    });
  });

  it("preserves the native engine revision when probing an external development binary", { skip: process.platform === "win32" }, async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const bin = makeFakeEngine(tmpRoot, { version: "151.0.7922.108-7" });
      const metadata = process.platform === "darwin"
        ? path.join(tmpRoot, "Chromium.app", "Contents", "Resources", "ombra-build.json")
        : path.join(tmpRoot, "ombra-build.json");
      fs.rmSync(metadata);
      fs.rmSync(path.join(tmpRoot, "binary.sha256"));
      assert.equal((await binaryInfo({ binaryPath: bin, version: "151.0.7922.108-7" })).version, "151.0.7922.108-7");
    });
  });

  for (const source of ["argument", "env"] as const) {
    for (const ownership of ["app", "cache"] as const) {
      it(`requires ${ownership} receipts when selected by ${source}, including symlink aliases`, async () => {
        await withIsolatedEnv(async ({ tmpRoot, cacheDir, appEnginesDir }) => {
          const root = ownership === "app" ? path.join(appEnginesDir, "versions", "151.0.7922.108-7") : path.join(cacheDir, "engines", "151.0.7922.108-7");
          const bin = makeFakeEngine(root, { version: "151.0.7922.108-7" });
          fs.rmSync(path.join(root, "binary.sha256"));
          const alias = path.join(tmpRoot, "engine-alias");
          fs.symlinkSync(bin, alias);
          for (const binaryPath of [bin, alias]) {
            if (source === "env") process.env.OMBRA_BINARY_PATH = binaryPath;
            await assert.rejects(() => ensureBinary(source === "argument" ? { binaryPath } : {}), ChecksumMismatchError);
          }
        });
      });
    }
  }

  it("ignores an unrelated ancestor receipt for an external binary", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const dir = path.join(tmpRoot, "development");
      fs.mkdirSync(dir);
      const bin = path.join(dir, "engine");
      fs.writeFileSync(bin, `#!${process.execPath}\nconsole.log("Ombra Chromium 151.0.7922.108");\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(tmpRoot, "binary.sha256"), "0".repeat(64));
      assert.equal(await ensureBinary({ binaryPath: bin }), bin);
    });
  });

  for (const source of ["argument", "env"] as const) {
    for (const receipt of ["malformed", "0".repeat(64)]) {
      it(`rejects ${source} external symlink target's ${receipt === "malformed" ? "malformed" : "mismatched"} receipt before probing`, async () => {
        await withIsolatedEnv(async ({ tmpRoot }) => {
          const targetDir = path.join(tmpRoot, "target");
          const marker = path.join(tmpRoot, "executed");
          const target = makeFakeEngine(targetDir, {
            scriptBody: `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "executed"); console.log("Ombra Chromium 151.0.7922.108");`,
          });
          const metadata = process.platform === "darwin"
            ? path.join(targetDir, "Chromium.app", "Contents", "Resources", "ombra-build.json")
            : path.join(targetDir, "ombra-build.json");
          fs.rmSync(metadata);
          fs.writeFileSync(path.join(targetDir, "binary.sha256"), receipt + "\n");
          const aliasDir = path.join(tmpRoot, "alias");
          fs.mkdirSync(aliasDir);
          const alias = path.join(aliasDir, "engine");
          fs.symlinkSync(target, alias);
          await assert.rejects(() => ensureBinary({ binaryPath: target }), ChecksumMismatchError);
          if (source === "env") process.env.OMBRA_BINARY_PATH = alias;
          let rejection: unknown;
          try { await ensureBinary(source === "argument" ? { binaryPath: alias } : {}); } catch (err) { rejection = err; }
          assert.equal(fs.existsSync(marker), false, "external alias executed before its target receipt was verified");
          assert.ok(rejection instanceof ChecksumMismatchError);
        });
      });
    }
  }

  for (const source of ["argument", "env"] as const) {
    it(`rejects a conflicting ${source} engine pin without falling back`, async () => {
      await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => {
        const bin = makeFakeEngine(path.join(tmpRoot, "external"), { version: "151.0.7922.108-7" });
        makeFakeEngine(path.join(cacheDir, "engines", "151.0.7922.108-9"), { version: "151.0.7922.108-9" });
        if (source === "env") process.env.OMBRA_BINARY_PATH = bin;
        const opts = { ...(source === "argument" ? { binaryPath: bin } : {}), version: "151.0.7922.108-9" };
        for (const resolve of [ensureBinary, binaryInfo]) {
          await assert.rejects(() => resolve(opts), (err: any) =>
            err instanceof UnsupportedEngineError && err.details.requestedVersion === "151.0.7922.108-9" && err.details.engineVersion === "151.0.7922.108-7");
        }
        process.env.OMBRA_VERSION = "151.0.7922.108-9";
        await assert.rejects(() => ensureBinary({ binaryPath: bin }), UnsupportedEngineError);
        assert.equal(await ensureBinary({ binaryPath: bin, version: "151.0.7922.108" }), bin);
      });
    });
  }

  it("resolves production channel and release shapes for all published platforms", async () => {
    await withIsolatedEnv(async () => {
      const signer = createTestSigningKeypair();
      const originalKeys = [...BINARY_SIGNING_PUBKEYS];
      BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, signer.rawPubB64);
      const fixtures = ["cdn-stable.json", "cdn-beta.json", "cdn-release9.json"].map((name) =>
        JSON.parse(JSON.parse(fs.readFileSync(path.join("tests", "fixtures", name), "utf8")).signed),
      );
      let payload = fixtures[0];
      const server = http.createServer((_req, res) => res.end(signer.signEnvelope(payload)));
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      try {
        const platforms = [
          ["darwin", "arm64", "darwin-arm64", ".tar.gz"],
          ["darwin", "x64", "darwin-x64", ".tar.gz"],
          ["linux", "x64", "linux-x64", ".tar.xz"],
          ["win32", "x64", "windows-x64", ".zip"],
        ] as const;
        for (const fixture of fixtures) {
          payload = fixture;
          for (const [system, arch, cdnName, ext] of platforms) {
            if (!fixture.platforms[cdnName]) continue;
            const plat = getPlatformInfo(system, arch);
            assert.equal(plat.cdnName, cdnName);
            assert.equal(plat.archiveExt, ext);
            const channel = fixture.channel ?? "stable";
            const requestedVersion = fixture.version ?? null;
            const entry = await resolveReleaseEntry({ baseUrl, plat, channel, requestedVersion });
            const version = fixture.version ?? (cdnName === "darwin-x64" ? "151.0.7922.108-7" : "151.0.7922.108-9");
            assert.equal(entry.version, version);
            assert.equal(entry.archiveUrl, `${baseUrl}/engine/releases/${version}/ombra-engine-${version}-${cdnName}${ext}`);
            assert.equal(entry.sha256, fixture.platforms[cdnName].sha256);
            assert.equal(entry.size, fixture.platforms[cdnName].size);
            if (fixture.channel) {
              assert.equal(entry.channel!.name, channel);
              assert.equal(entry.channel!.serial, fixture.serial);
              assert.equal(verifySignedEnvelope(Buffer.from(entry.channel!.envelope), "channel").channel, channel);
            } else {
              assert.equal(entry.channel, undefined);
            }
          }
        }
      } finally {
        BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, ...originalKeys);
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  it("rejects invalid signed channel identity, serial, and artifact metadata before persisting serial", async () => {
    await withIsolatedEnv(async ({ cacheDir }) => {
      const signer = createTestSigningKeypair();
      const originalKeys = [...BINARY_SIGNING_PUBKEYS];
      BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, signer.rawPubB64);
      const plat = getPlatformInfo();
      const version = "151.0.7922.108-9";
      const validEntry = { version, path: `/engine/releases/${version}/ombra-engine-${version}-${plat.cdnName}${plat.archiveExt}`, sha256: "a".repeat(64), size: 12 };
      const validPayload = { channel: "stable", serial: 5, platforms: { [plat.cdnName]: validEntry } };
      let payload: any = validPayload;
      const server = http.createServer((_req, res) => res.end(signer.signEnvelope(payload)));
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      try {
        const params = { baseUrl, plat, channel: "stable", requestedVersion: null };
        const invalidPayloads = [
          { ...validPayload, channel: "beta" },
          ...[undefined, "5", -1, 1.5, null, Number.MAX_SAFE_INTEGER + 1].map((serial) => ({ ...validPayload, serial })),
          { ...validPayload, schema: 2 },
          { ...validPayload, type: "release" },
          ...[
            { version: 123 }, { version: "" }, { version: " 151.0.7922.108-9" },
            { sha256: "xyz" }, { sha256: 42 },
            ...[0, -1, 1.5, "12", null, Number.MAX_SAFE_INTEGER + 1].map((size) => ({ size })),
            { path: "https://other.example/archive.tar.gz" },
            { path: `/engine/releases/151.0.7922.108-8/ombra-engine-${version}-${plat.cdnName}${plat.archiveExt}` },
            { path: `/engine/releases/${version}/../wrong${plat.archiveExt}` },
          ].map((override) => ({ ...validPayload, platforms: { [plat.cdnName]: { ...validEntry, ...override } } })),
        ];
        for (const invalid of invalidPayloads) {
          payload = invalid;
          await assert.rejects(() => resolveReleaseEntry(params), ChecksumMismatchError);
          assert.equal(fs.existsSync(path.join(cacheDir, "engines", ".serial_stable")), false);
        }
        payload = { ...validPayload, schema: 1, type: "channel" };
        assert.equal((await resolveReleaseEntry(params)).version, version);
        payload = { ...validPayload, serial: 4 };
        await assert.rejects(() => resolveReleaseEntry(params), ChecksumMismatchError);
        payload = { version, platforms: { [plat.cdnName]: { file: "../wrong.tar.gz", sha256: "a".repeat(64), size: 12 } } };
        await assert.rejects(() => resolveReleaseEntry({ ...params, requestedVersion: version }), ChecksumMismatchError);
        payload = {
          version: "151.0.7922.108-8",
          platforms: { [plat.cdnName]: { file: `ombra-engine-151.0.7922.108-8-${plat.cdnName}${plat.archiveExt}`, sha256: "a".repeat(64), size: 12 } },
        };
        await assert.rejects(() => resolveReleaseEntry({ ...params, requestedVersion: version }), ChecksumMismatchError);
      } finally {
        BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, ...originalKeys);
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  it("extracts normal tar.xz archives and reports missing or failed XZ decoders", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const archive = path.join(tmpRoot, "normal.tar.xz");
      fs.writeFileSync(archive, buildTarXzBuffer([{ name: "engine/chrome", content: "engine payload", mode: 0o755 }]));
      const dest = path.join(tmpRoot, "extracted");
      await safeExtractTarXz(archive, dest);
      assert.equal(fs.readFileSync(path.join(dest, "engine", "chrome"), "utf8"), "engine payload");
      if (process.platform !== "win32") assert.equal(fs.statSync(path.join(dest, "engine", "chrome")).mode & 0o777, 0o755);
      fs.writeFileSync(archive, "decoder failure");
      await assert.rejects(() => safeExtractTarXz(archive, dest), DownloadFailedError);
      const originalPath = process.env.PATH;
      process.env.PATH = tmpRoot;
      try {
        await assert.rejects(() => safeExtractTarXz(archive, dest), (err: any) => err instanceof DownloadFailedError && /xz/i.test(err.message));
      } finally {
        process.env.PATH = originalPath;
      }
    });
  });

  it("reports uninstalled schema-compliant BinaryInfo when no engine exists", async () => {
    await withIsolatedEnv(async () => {
      const info = await binaryInfo();
      assert.equal(info.version, "158.0.8127.37");
      assert.equal(info.installed, false);
      assert.equal(info.source, "none");
      assert.equal(info.path, null);
      assert.equal(info.sha256, null);
    });
  });

  it("follows resolution order: argument > env > app > cache", async () => {
    await withIsolatedEnv(async ({ tmpRoot, cacheDir, appEnginesDir }) => {
      const cacheVerDir = path.join(cacheDir, "engines", "151.0.7922.108");
      const cacheBin = makeFakeEngine(cacheVerDir, { version: "151.0.7922.108" });

      let info = await binaryInfo({ version: "151.0.7922.108" });
      assert.equal(info.source, "cache");
      assert.equal(info.path, cacheBin);

      const appVerDir = path.join(appEnginesDir, "versions", "151.0.7922.108-2");
      const appBin = makeFakeEngine(appVerDir, { version: "151.0.7922.108-2" });
      fs.writeFileSync(
        path.join(appEnginesDir, "selection.json"),
        JSON.stringify({ active: "151.0.7922.108-2" }),
      );

      info = await binaryInfo();
      assert.equal(info.source, "app");
      assert.equal(info.path, appBin);

      const envDir = path.join(tmpRoot, "env-bin");
      const envBin = makeFakeEngine(envDir, { version: "151.0.7922.108-3" });
      process.env.OMBRA_BINARY_PATH = envBin;

      info = await binaryInfo();
      assert.equal(info.source, "env");
      assert.equal(info.path, envBin);

      const argDir = path.join(tmpRoot, "arg-bin");
      const argBin = makeFakeEngine(argDir, { version: "151.0.7922.108-4" });

      info = await binaryInfo({ binaryPath: argBin });
      assert.equal(info.source, "argument");
      assert.equal(info.path, argBin);
    });
  });

  for (const version of ["151.0.7922.108-9", "158.0.8127.37-2"]) {
    it(`resolves supported engine ${version} with a Chromium-family pin`, async () => {
      await withIsolatedEnv(async ({ tmpRoot }) => {
        const bin = makeFakeEngine(tmpRoot, { version });
        assert.equal(await ensureBinary({ binaryPath: bin, version: version.split("-")[0] }), bin);
        assert.equal((await binaryInfo({ binaryPath: bin })).version, version);
      });
    });
  }

  it("rejects unsupported engine versions and tampered binary.sha256 markers", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const plat = getPlatformInfo();
      const oldBin = makeFakeEngine(path.join(tmpRoot, "old"), { version: "150.0.7000.1" });
      assert.throws(() => verifyBinary(oldBin, plat, { receiptDir: null }), UnsupportedEngineError);

      const futureBin = makeFakeEngine(path.join(tmpRoot, "future"), { version: "159.0.1.1" });
      assert.throws(() => verifyBinary(futureBin, plat, { receiptDir: null }), UnsupportedEngineError);

      const validDir = path.join(tmpRoot, "tampered");
      const validBin = makeFakeEngine(validDir, { version: "151.0.7922.108" });
      fs.writeFileSync(path.join(validDir, "binary.sha256"), "0".repeat(64) + "\n", "utf8");

      assert.throws(() => verifyBinary(validBin, plat, { receiptDir: validDir }), ChecksumMismatchError);

      // OMBRA_SKIP_CHECKSUM=1 bypasses SHA-256 check for local dev builds
      process.env.OMBRA_SKIP_CHECKSUM = "1";
      const originalWarn = logger.warn;
      const warnings: string[] = [];
      logger.warn = (message) => { warnings.push(message); };
      try {
        const res = verifyBinary(validBin, plat, { receiptDir: validDir });
        assert.equal(res.version, "151.0.7922.108");
        assert.match(warnings.join("\n"), /OMBRA_SKIP_CHECKSUM=1.*development only/);
      } finally { logger.warn = originalWarn; }
    });
  });

  it("blocks Zip-Slip / Tar-Slip path traversal and unsafe symlinks", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const evilTar = path.join(tmpRoot, "evil.tar.gz");
      fs.writeFileSync(
        evilTar,
        buildTarGzBuffer([{ name: "../escaped-tar.txt", content: "pwned" }]),
      );
      const dest1 = path.join(tmpRoot, "extract-tar");
      await assert.rejects(() => safeExtractTarGz(evilTar, dest1), ChecksumMismatchError);
      assert.equal(fs.existsSync(path.join(tmpRoot, "escaped-tar.txt")), false);

      const evilSymTar = path.join(tmpRoot, "evilsym.tar.gz");
      fs.writeFileSync(
        evilSymTar,
        buildTarGzBuffer([{ name: "link", typeFlag: "2", linkName: "../../etc/passwd" }]),
      );
      await assert.rejects(() => safeExtractTarGz(evilSymTar, dest1), ChecksumMismatchError);

      const evilZip = path.join(tmpRoot, "evil.zip");
      fs.writeFileSync(
        evilZip,
        buildZipBuffer([{ name: "../escaped-zip.txt", content: "pwned" }]),
      );
      const dest2 = path.join(tmpRoot, "extract-zip");
      assert.throws(() => safeExtractZip(evilZip, dest2), ChecksumMismatchError);
      assert.equal(fs.existsSync(path.join(tmpRoot, "escaped-zip.txt")), false);
    });
  });

  it("downloads, verifies Ed25519 + SHA-256, retries transient 503s, and preserves profiles on clearCache()", async () => {
    await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => {
      const plat = getPlatformInfo();
      const signer = createTestSigningKeypair();
      const origKeys = [...BINARY_SIGNING_PUBKEYS];
      const origSleep = _sleepHook.sleep;
      BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, signer.rawPubB64);
      _sleepHook.sleep = async () => {};

      // Build a real archive containing a valid fake engine for current OS
      const srcEngineDir = path.join(tmpRoot, "pkg-src");
      makeFakeEngine(srcEngineDir, { version: "151.0.7922.108-5" });

      function collectRelativeFiles(dir: string, prefix = ""): Array<{ name: string; content: Buffer; mode: number }> {
        const out: Array<{ name: string; content: Buffer; mode: number }> = [];
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
          if (ent.isDirectory()) {
            out.push(...collectRelativeFiles(full, rel));
          } else {
            out.push({
              name: rel,
              content: fs.readFileSync(full),
              mode: fs.statSync(full).mode & 0o777,
            });
          }
        }
        return out;
      }

      const files = collectRelativeFiles(srcEngineDir);
      const archiveBytes =
        plat.archiveExt === ".zip"
          ? buildZipBuffer(files.map((f) => ({ name: f.name, content: f.content, unixMode: 0o100000 | f.mode })))
          : plat.system === "Linux" ? buildTarXzBuffer(files) : buildTarGzBuffer(files);
      const archiveSha = signer.sha256Hex(archiveBytes);

      let archiveAttempts = 0;
      let tamperSig = false;
      let serialValue = 10;
      let archiveBody = archiveBytes;
      let signedSize = archiveBytes.length;
      let signedHash = archiveSha;

      const server = http.createServer((req, res) => {
        if (req.url === "/engine/channels/stable.json") {
          const envBuf = signer.signEnvelope({
            channel: "stable",
            serial: serialValue,
            platforms: {
              [plat.cdnName]: {
                version: "151.0.7922.108-5",
                path: `/engine/releases/151.0.7922.108-5/ombra-engine-151.0.7922.108-5-${plat.cdnName}${plat.archiveExt}`,
                sha256: signedHash,
                size: signedSize,
              },
            },
          });
          if (tamperSig) {
            const parsed = JSON.parse(envBuf.toString("utf8"));
            parsed.sig = Buffer.alloc(64, 1).toString("base64");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(parsed));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(envBuf);
          return;
        }
        if (req.url?.startsWith("/engine/releases/151.0.7922.108-5/ombra-engine-")) {
          archiveAttempts += 1;
          if (archiveAttempts < 3) {
            res.writeHead(503);
            res.end("transient CDN outage");
            return;
          }
          res.writeHead(200, { "Content-Type": "application/octet-stream" });
          const halfway = Math.floor(archiveBody.length / 2);
          res.write(archiveBody.subarray(0, halfway));
          setImmediate(() => res.end(archiveBody.subarray(halfway)));
          return;
        }
        res.writeHead(404);
        res.end();
      });

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
      const port = (server.address() as any).port;
      process.env.OMBRA_DOWNLOAD_URL = `http://127.0.0.1:${port}`;

      try {
        // Rejects download=false when missing
        await assert.rejects(
          () => import("../dist/esm/binary.js").then((m) => m.resolveBinary({ download: false })),
          BinaryNotFoundError,
        );

        // The archive must use streaming reads; arrayBuffer is forbidden for every response.
        const originalArrayBuffer = Response.prototype.arrayBuffer;
        Object.defineProperty(Response.prototype, "arrayBuffer", { configurable: true, writable: true, value: async () => { throw new Error("whole-response buffering forbidden"); } });
        let installedPath: string;
        try {
          // Retries twice on 503 and succeeds on 3rd attempt
          installedPath = await ensureBinary();
        } finally {
          Object.defineProperty(Response.prototype, "arrayBuffer", { configurable: true, writable: true, value: originalArrayBuffer });
        }
        assert.equal(archiveAttempts, 3);
        assert.equal(fs.existsSync(installedPath), true);

        const info = await binaryInfo();
        assert.equal(info.installed, true);
        assert.equal(info.source, "cache");
        assert.equal(info.version, "151.0.7922.108-5");

        await clearCache();
        archiveBody = archiveBytes.subarray(0, archiveBytes.length - 1);
        await assert.rejects(() => ensureBinary(), ChecksumMismatchError);
        assert.equal(fs.existsSync(path.join(cacheDir, "engines", "151.0.7922.108-5")), false);
        archiveBody = archiveBytes;
        signedSize = archiveBytes.length - 1;
        await assert.rejects(() => ensureBinary(), ChecksumMismatchError);
        signedSize = archiveBytes.length;
        signedHash = "0".repeat(64);
        await assert.rejects(() => ensureBinary(), ChecksumMismatchError);
        signedHash = archiveSha;

        // Rollback detection (serial 9 < 10)
        await clearCache();
        fs.mkdirSync(path.join(cacheDir, "engines"), { recursive: true });
        fs.writeFileSync(path.join(cacheDir, "engines", ".serial_stable"), "10\n", "utf8");
        serialValue = 9;
        await assert.rejects(() => ensureBinary(), ChecksumMismatchError);
        serialValue = 11;

        // Tampered Ed25519 signature rejected
        tamperSig = true;
        await assert.rejects(() => ensureBinary(), ChecksumMismatchError);
        tamperSig = false;

        // Re-install and test clearCache() preserves profiles & license.key
        archiveAttempts = 2;
        await ensureBinary();
        const profMarker = path.join(cacheDir, "profiles", "keep-me", "marker.txt");
        fs.mkdirSync(path.dirname(profMarker), { recursive: true });
        fs.writeFileSync(profMarker, "ok");
        const licFile = path.join(cacheDir, "license.key");
        fs.writeFileSync(licFile, "lic_keep");

        await clearCache();
        assert.equal((await binaryInfo()).installed, false);
        assert.equal(fs.existsSync(profMarker), true);
        assert.equal(fs.existsSync(licFile), true);
      } finally {
        BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, ...origKeys);
        _sleepHook.sleep = origSleep;
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });
});
