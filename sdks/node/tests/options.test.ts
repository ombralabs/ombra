import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InvalidOptionError,
  ProxyError,
  buildLaunchOptions,
  redactSecrets,
} from "../dist/esm/index.js";
import {
  buildEngineArgs,
  validateLaunchOptions,
} from "../dist/esm/options.js";
import { makeFakeEngine, withIsolatedEnv } from "./helpers.js";

describe("launch options validation & CLI flag mapping", () => {
  it("rejects the removed captcha launch option", () => {
    for (const captcha of [true, false, {}, { solve: false }, null]) {
      assert.throws(
        () => validateLaunchOptions({ captcha } as any),
        (err: any) => err instanceof InvalidOptionError && /Unknown launch option.*captcha/.test(err.message),
      );
    }
  });

  it("validates engine pins and forwards them through buildLaunchOptions", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      assert.equal(validateLaunchOptions({ version: " 151.0.7922.108-7 " }).version, "151.0.7922.108-7");
      for (const version of [123, null, {}, "invalid"]) {
        assert.throws(() => validateLaunchOptions({ version } as any), InvalidOptionError);
      }
      const bin = makeFakeEngine(tmpRoot, { version: "151.0.7922.108-7" });
      const command = await buildLaunchOptions({ binaryPath: bin, version: "151.0.7922.108-7" });
      assert.equal(command.engineVersion, "151.0.7922.108-7");
      await assert.rejects(() => buildLaunchOptions({ binaryPath: bin, version: "151.0.7922.108-9" }), /requested version/);
      process.env.OMBRA_VERSION = "151.0.7922.108-9";
      assert.equal((await buildLaunchOptions({ binaryPath: bin, version: " latest " })).engineVersion, "151.0.7922.108-7");
    });
  });
  it("rejects unknown keys at every nesting level", () => {
    assert.throws(
      () => validateLaunchOptions({ bogusFlag: true } as any),
      (err: any) => err instanceof InvalidOptionError && /Unknown launch option/.test(err.message),
    );
    assert.throws(
      () => validateLaunchOptions({ fingerprint: { unknownField: 1 } as any }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ humanize: { speed: 2 } as any }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ proxy: { host: "1.2.3.4", port: 80, type: "http", extra: 1 } as any }),
      InvalidOptionError,
    );
  });

  it("enforces mutual exclusion between profile & userDataDir and dual camel/snake fields", () => {
    assert.throws(
      () => validateLaunchOptions({ profile: "shop", userDataDir: "/tmp/dir" }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ timeoutMs: 5_000, timeout_ms: 5_000 }),
      InvalidOptionError,
    );
  });

  it("validates fingerprint bounds and persona OS values", () => {
    assert.throws(
      () => validateLaunchOptions({ fingerprint: { seed: -1 } }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ fingerprint: { os: "android" as any } }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ fingerprint: { screen: { width: 200, height: 600 } } }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ fingerprint: { hardwareConcurrency: 0 } }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ timeoutMs: 500 }),
      InvalidOptionError,
    );
  });

  it("builds coherent engine CLI switches including brand, window-size, and humanize", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const bin = makeFakeEngine(tmpRoot, { version: "151.0.7922.108" });
      const built = await buildLaunchOptions({
        binaryPath: bin,
        headless: false,
        profile: "acct-main",
        fingerprint: {
          seed: 424242,
          os: "macos",
          osVersion: "14.5",
          timezone: "Europe/Berlin",
          locale: "de-DE",
          screen: { width: 1440, height: 900 },
          gpu: { vendor: "Apple Inc.", renderer: "Apple M3" },
          hardwareConcurrency: 8,
          deviceMemory: 16,
          noise: false,
        },
        humanize: { preset: "careful" },
      });

      assert.equal(built.binaryPath, bin);
      assert.ok(built.args.includes("--fingerprint=424242"));
      assert.ok(built.args.includes("--fingerprint-brand=chrome"));
      assert.ok(built.args.includes("--fingerprint-platform=macos"));
      assert.ok(built.args.includes("--fingerprint-platform-version=14.5"));
      assert.ok(built.args.includes("--fingerprint-timezone=Europe/Berlin"));
      assert.ok(built.args.includes("--fingerprint-locale=de-DE"));
      assert.ok(built.args.includes("--fingerprint-screen-width=1440"));
      assert.ok(built.args.includes("--fingerprint-screen-height=900"));
      assert.ok(built.args.includes("--window-position=0,0"));
      assert.ok(built.args.includes("--window-size=1440,805")); // 900 - 95 macOS dock/menubar
      assert.ok(built.args.includes("--fingerprint-tls-profile=chrome-151"));
      assert.ok(built.args.includes("--disable-fingerprint-noise"));
      assert.ok(built.args.includes("--fingerprint-humanize=on"));
      assert.ok(built.args.includes("--fingerprint-humanize-seed=424242"));
      assert.ok(built.args.includes("--fingerprint-humanize-preset=careful"));
      assert.ok(!built.args.some((arg) => arg.startsWith("--fingerprint-captcha")));
      assert.ok(!built.args.includes("--headless=new"));
    });
  });

  it("computes OS-specific default window height and refuses non-loopback debug address", () => {
    const validatedWin = validateLaunchOptions({
      fingerprint: { os: "windows", screen: { width: 1920, height: 1080 } },
    });
    const winArgs = buildEngineArgs({
      options: validatedWin,
      profileDir: "/tmp/p",
      seed: 10000,
      proxyArgs: [],
      resolvedOs: "windows",
    });
    assert.ok(winArgs.includes("--window-size=1920,1032")); // 1080 - 48 taskbar

    assert.throws(
      () => validateLaunchOptions({ args: ["--remote-debugging-address=0.0.0.0"] }),
      InvalidOptionError,
    );
    assert.throws(
      () => validateLaunchOptions({ proxy: "http://bad-port:99999" }),
      ProxyError,
    );
  });

  it("redacts proxy credentials, license keys, and bearer tokens without double-masking", () => {
    const raw =
      "Failed http://alice:s3cr3t@proxy.example.com:8080 and socks5://bob@1.2.3.4:1080 " +
      "OMBRA_LICENSE_KEY=lic_live_123456789 Authorization: Bearer tok_abcdef customSecret99";
    const redacted = redactSecrets(raw, ["customSecret99"]);
    assert.ok(redacted.includes("http://***:***@proxy.example.com:8080"));
    assert.ok(redacted.includes("socks5://***@1.2.3.4:1080"));
    assert.ok(redacted.includes("OMBRA_LICENSE_KEY=***"));
    assert.ok(redacted.includes("Authorization: Bearer ***"));
    assert.ok(!redacted.includes("alice"));
    assert.ok(!redacted.includes("s3cr3t"));
    assert.ok(!redacted.includes("bob"));
    assert.ok(!redacted.includes("lic_live_123456789"));
    assert.ok(!redacted.includes("tok_abcdef"));
    assert.ok(!redacted.includes("customSecret99"));
  });
});
