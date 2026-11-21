import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { binaryInfo, ensureBinary, resolveBinary } from "../dist/esm/binary.js";
import { binaryCandidatesInDir, getPlatformInfo } from "../dist/esm/config.js";
import { ChecksumMismatchError } from "../dist/esm/errors.js";
import { makeFakeEngine, withIsolatedEnv, withSignedEngineServer } from "./helpers.js";

describe("native Ombra and supported legacy engine layouts", () => {
  for (const [system, relative] of [
    ["Darwin", "Ombra.app/Contents/MacOS/Ombra"], ["Windows", "ombra.exe"], ["Linux", "ombra"],
  ] as const) {
    it(`prefers the canonical ${system} path`, () => {
      assert.equal(binaryCandidatesInDir("/engine", system)[0], path.join("/engine", relative));
    });
  }

  for (const layout of ["legacy", "ombra", ...(process.platform === "darwin" ? ["hybrid" as const] : [])] as const) {
    it(`resolves a ${layout} cache without replacing its binary or receipt`, async () => {
      await withIsolatedEnv(async ({ cacheDir }) => {
        const version = layout === "ombra" ? "158.0.8127.37-3" : "158.0.8127.37-2";
        const root = path.join(cacheDir, "engines", version);
        const binary = makeFakeEngine(root, { version, layout });
        const inode = fs.statSync(binary).ino;
        const receipt = fs.readFileSync(path.join(root, "binary.sha256"));
        assert.equal((await resolveBinary({ version, download: false })).path, binary);
        assert.equal(fs.statSync(binary).ino, inode);
        assert.deepEqual(fs.readFileSync(path.join(root, "binary.sha256")), receipt);
      });
    });
  }

  it("installs a signed native archive and reuses its verified offline cache", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => withSignedEngineServer(tmpRoot, async (cdn) => {
      cdn.version = "158.0.8127.37-3";
      cdn.layout = "ombra";
      const binary = await ensureBinary();
      assert.equal(path.basename(binary), getPlatformInfo().system === "Windows" ? "ombra.exe" : process.platform === "darwin" ? "Ombra" : "ombra");
      const inode = fs.statSync(binary).ino;
      process.env.OMBRA_DOWNLOAD_URL = "off";
      assert.equal(await ensureBinary({ version: cdn.version }), binary);
      assert.equal(fs.statSync(binary).ino, inode);
      assert.equal(cdn.archiveRequests, 1);
    }));
  });

  it("rejects conflicting executable layouts before choosing one", async () => {
    await withIsolatedEnv(async ({ cacheDir }) => {
      const version = "158.0.8127.37-3";
      const root = path.join(cacheDir, "engines", version);
      makeFakeEngine(root, { version, layout: "legacy" });
      makeFakeEngine(root, { version, layout: "ombra" });
      await assert.rejects(() => resolveBinary({ version, download: false }), /ambiguous.*executable/i);
      assert.equal((await binaryInfo({ version })).installed, false);
    });
  });

  it("rejects conflicting build metadata instead of silently taking the first file", async () => {
    await withIsolatedEnv(async ({ cacheDir }) => {
      const version = "158.0.8127.37-3";
      const root = path.join(cacheDir, "engines", version);
      const binary = makeFakeEngine(root, { version, layout: "ombra" });
      const app = process.platform === "darwin" ? path.resolve(binary, "../../..") : root;
      const duplicate = path.join(app, process.platform === "darwin" ? "ombra-build.json" : "Contents/Resources/ombra-build.json");
      fs.mkdirSync(path.dirname(duplicate), { recursive: true });
      fs.writeFileSync(duplicate, JSON.stringify({ version: "158.0.8127.37-2" }));
      await assert.rejects(() => resolveBinary({ version, download: false }), ChecksumMismatchError);
    });
  });
});
