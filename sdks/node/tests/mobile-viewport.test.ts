import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { it } from "node:test";
import {
  InvalidOptionError,
  buildLaunchOptions,
  launch,
  launchContext,
  launchPersistentContext,
  type PersonaOS,
} from "../dist/esm/index.js";
import { makeFakeEngine, withIsolatedEnv } from "./helpers.js";

const size = { width: 390, height: 844 };
const hostOS: PersonaOS = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
const otherOS = hostOS === "linux" ? "macos" : "linux";

it("adds only the requested CSS layout size to the public launch command", async () => {
  await withIsolatedEnv(async ({ tmpRoot }) => {
    const options = { binaryPath: makeFakeEngine(tmpRoot), download: false, args: ["--window-size=1200,900"] };
    const ordinary = (await buildLaunchOptions(options)).args;
    assert.ok(ordinary.every((arg) => !arg.startsWith("--mobile-layout-viewport")));
    const disabled = { ...options, mobileViewport: null };
    assert.deepEqual((await buildLaunchOptions(disabled)).args, ordinary);
    for (const mobileViewport of [size, { width: 1, height: 10000 }, { width: 10000, height: 1 }]) {
      const input = { ...options, mobileViewport };
      const args = (await buildLaunchOptions(input)).args;
      const flag = `--mobile-layout-viewport=${mobileViewport.width},${mobileViewport.height}`;
      assert.equal(args.filter((arg) => arg === flag).length, 1);
      assert.deepEqual(args.filter((arg) => arg !== flag), ordinary);
    }
  });
});

it("rejects malformed or out-of-range mobile dimensions before resolving a binary", async () => {
  const invalid = [
    {},
    { width: 390 },
    { width: 1, height: 10001 },
    { width: 0, height: 1 },
    { width: true, height: 1 },
    { width: 1.5, height: 1 },
    { ...size, depth: 3 },
    "390,844",
  ];
  for (const mobileViewport of invalid) {
    await assert.rejects(
      buildLaunchOptions({ download: false, mobileViewport } as any),
      (error) => error instanceof InvalidOptionError &&
        /mobileViewport(?:\.(?:width|height)| must| option)/.test(error.message),
    );
  }
});

it("passes the native layout argument through all three public launchers", async (t) => {
  await withIsolatedEnv(async ({ tmpRoot }) => {
    const options = {
      binaryPath: makeFakeEngine(tmpRoot),
      download: false,
      userDataDir: path.join(tmpRoot, "profile"),
      mobileViewport: size,
    };
    const spawn = t.mock.method(childProcess, "spawn", () => { throw new Error("captured spawn"); });
    syncBuiltinESMExports();
    try {
      for (const start of [launch, launchContext, launchPersistentContext]) {
        await assert.rejects(start(options), /captured spawn/);
        const args = spawn.mock.calls.at(-1)!.arguments[1] as string[];
        assert.equal(args.filter((arg) => arg === "--mobile-layout-viewport=390,844").length, 1);
      }
    } finally {
      spawn.mock.restore();
      syncBuiltinESMExports();
    }
  });
});

it("checks the real host and preserves existing OS and persistent viewport errors", async () => {
  await withIsolatedEnv(async ({ tmpRoot }) => {
    const options = { binaryPath: makeFakeEngine(tmpRoot), download: false, mobileViewport: size };
    const command = await buildLaunchOptions({ ...options, fingerprint: { os: hostOS } });
    assert.ok(command.args.includes("--mobile-layout-viewport=390,844"));
    await assert.rejects(buildLaunchOptions({ ...options, fingerprint: { os: otherOS } }), /host OS/);
    await assert.rejects(buildLaunchOptions({ ...options, fingerprint: { os: "android" as any } }), /fingerprint\.os.*android/);
    const persistent = { ...options, userDataDir: path.join(tmpRoot, "profile"), viewport: size };
    await assert.rejects(launchPersistentContext(persistent), /cannot override viewport/);
  });
});

it("rejects a saved non-native OS before rewriting profile metadata", async () => {
  await withIsolatedEnv(async ({ tmpRoot }) => {
    const userDataDir = path.join(tmpRoot, "profile");
    const metadata = path.join(userDataDir, ".ombra", "profile.json");
    fs.mkdirSync(path.dirname(metadata), { recursive: true });
    const original = JSON.stringify({ seed: 43210, os: otherOS });
    fs.writeFileSync(metadata, original);
    const options = { userDataDir, binaryPath: makeFakeEngine(tmpRoot), download: false, mobileViewport: size };
    await assert.rejects(buildLaunchOptions(options), /host OS/);
    await assert.rejects(launchPersistentContext(options), /host OS/);
    assert.equal(fs.readFileSync(metadata, "utf8"), original);
  });
});

it("accepts a native legacy profile with an empty OS field", async () => {
  await withIsolatedEnv(async ({ tmpRoot }) => {
    const userDataDir = path.join(tmpRoot, "profile");
    const metadata = path.join(userDataDir, ".ombra", "profile.json");
    fs.mkdirSync(path.dirname(metadata), { recursive: true });
    fs.writeFileSync(metadata, JSON.stringify({ seed: 43210, os: null }));
    const options = { userDataDir, binaryPath: makeFakeEngine(tmpRoot), download: false, mobileViewport: size };
    const { args } = await buildLaunchOptions(options);
    assert.ok(args.includes("--mobile-layout-viewport=390,844"));
    assert.ok(args.every((arg) => !arg.startsWith("--fingerprint-platform=")));
  });
});
