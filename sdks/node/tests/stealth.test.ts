import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  InvalidOptionError,
  type PuppeteerBrowserLike,
  _clientLoader,
  binaryInfo,
  buildLaunchOptions,
  launch,
  launchContext,
  launchPersistentContext,
  launchPuppeteer,
} from "../dist/esm/index.js";
import { makeFakeEngine, withIsolatedEnv } from "./helpers.js";

// Canonical SDK stealth invariants (SI-05..SI-11; see AGENTS.md).
const STEALTH_INVARIANTS = {
  "SI-05": [
    "--enable-automation",
    "--disable-blink-features=AutomationControlled",
    "--headless=old",
    "--disable-web-security",
    "--ignore-certificate-errors",
  ],
  "SI-06": [
    "://[^/@:]+:[^/@]+@",
    "OMBRA_LICENSE_KEY=",
    "Authorization: Bearer",
  ],
  "SI-07": ["--user-agent"],
  "SI-11": ["--no-sandbox", "--disable-setuid-sandbox"],
} as const;

describe("SDK-owned stealth configuration conformance", () => {
  it("satisfies SI-05, SI-06, SI-07, SI-11, and SI-12 on CLI flags and binaryInfo()", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const bin = makeFakeEngine(tmpRoot);
      const info = await binaryInfo({ binaryPath: bin });
      assert.equal(info.installed, true);
      assert.match(info.sha256 ?? "", /^[a-f0-9]{64}$/); // SI-12

      const built = await buildLaunchOptions({
        binaryPath: bin,
        proxy: "http://proxyuser:proxypass@10.0.0.2:8080",
        licenseKey: "lic_super_secret_999",
        fingerprint: {
          os: "macos",
          timezone: "America/Chicago",
          locale: "en-US",
        },
      });

      const joined = built.args.join(" ");

      // SI-05 forbidden automation flags
      for (const flag of STEALTH_INVARIANTS["SI-05"]) {
        assert.ok(!built.args.some((a) => a.startsWith(flag)), `Forbidden flag found: ${flag}`);
      }
      // SI-06 no credentials or license key on command line
      for (const pat of STEALTH_INVARIANTS["SI-06"]) {
        assert.doesNotMatch(joined, new RegExp(pat));
      }
      assert.ok(!joined.includes("proxyuser"));
      assert.ok(!joined.includes("proxypass"));
      assert.ok(!joined.includes("lic_super_secret_999"));

      // SI-07 no --user-agent flag
      for (const flag of STEALTH_INVARIANTS["SI-07"]) {
        assert.ok(!built.args.some((a) => a.startsWith(flag)));
      }
      // SI-11 no --no-sandbox unless explicitly requested
      for (const flag of STEALTH_INVARIANTS["SI-11"]) {
        assert.ok(!built.args.includes(flag));
      }
    });
  });

  it("observes SDK-owned attach/context/CDP calls without asserting zero stock-client traffic", async () => {
    await assert.rejects(() => launchPersistentContext("/tmp/some-dir", {
      viewport: { width: 800, height: 600 },
    } as any), InvalidOptionError);

    // Stock Playwright 1.60 crPage.ts sends Runtime.enable, Log.enable and a utility-world
    // Page.addScriptToEvaluateOnNewDocument. noDefaults only suppresses existing-context
    // defaults (media/focus/download behavior); new contexts retain stock client defaults.
    const calls: Array<{ method: string; options?: any }> = [];
    const observe = (method: string, options?: any) => { calls.push({ method, options }); };
    const guard = (object: any) => new Proxy(object, { get(target, key) {
      if (key in target || key === "then") return target[key];
      return (...args: unknown[]) => { observe(String(key), args); throw Error('Unexpected SDK client call: ' + String(key)); };
    } });
    const makeBrowser = () => {
      const page = guard({});
      const context = guard({ close: async () => {}, newPage: async () => page });
      const session = { send: async (method: string) => { observe(method); throw Error("fixture records CDP without executing it"); }, detach: async () => {} };
      return guard({
        close: async () => {}, on: () => {}, contexts: () => [context],
        newContext: async (options: any) => { observe('newContext', options); return context; },
        newPage: async (options: any) => { observe('newPage', options); return page; },
        newBrowserCDPSession: async () => session,
        target: () => ({ createCDPSession: async () => session }),
        disconnect: async () => {},
      });
    };
    const origPw = _clientLoader.loadPlaywright, origPup = _clientLoader.loadPuppeteer;
    _clientLoader.loadPlaywright = async () => ({ chromium: { connectOverCDP: async (_endpoint: string, options: any) => {
      observe('connectOverCDP', options); return makeBrowser();
    } } });
    _clientLoader.loadPuppeteer = async () => ({ connect: async (options: any) => {
      observe('connect', options); return makeBrowser();
    } });
    try {
      await withIsolatedEnv(async ({ tmpRoot }) => {
        const binaryPath = makeFakeEngine(tmpRoot);
        const options = { binaryPath, fingerprint: { locale: 'fr-FR', timezone: 'Europe/Paris' } };
        const built = await buildLaunchOptions(options);
        assert.ok(built.args.includes('--fingerprint-locale=fr-FR'));
        assert.ok(built.args.includes('--fingerprint-timezone=Europe/Paris'));
        const browser = await launch(options);
        try { await browser.newPage(); await browser.newContext(); } finally { await browser.close(); }
        const context = await launchContext(options);
        try { await context.newPage(); } finally { await context.close(); }
        const persistent = await launchPersistentContext(path.join(tmpRoot, 'persistent'), options);
        try { await persistent.newPage(); } finally { await persistent.close(); }
        const puppeteer = await launchPuppeteer<PuppeteerBrowserLike>(options);
        try { await puppeteer.newPage(); } finally { await puppeteer.close(); }
      });
      assert.equal(calls.filter(call => call.method === 'connectOverCDP').length, 3);
      for (const { options } of calls.filter(call => call.method === 'connectOverCDP')) {
        assert.deepEqual(Object.keys(options).sort(), ['isLocal', 'noDefaults', 'timeout']);
        assert.equal(options.noDefaults, true);
        assert.equal(options.isLocal, true);
      }
      const pup = calls.filter(call => call.method === 'connect');
      assert.equal(pup.length, 1);
      assert.deepEqual(Object.keys(pup[0].options).sort(), ['browserWSEndpoint', 'defaultViewport']);
      assert.equal(pup[0].options.defaultViewport, null);
      const contexts = calls.filter(call => call.method === 'newContext');
      assert.equal(contexts.length, 2);
      for (const { options } of contexts) assert.deepEqual(options, { viewport: null });
      assert.deepEqual(calls.filter(call => call.method === 'newPage').map(call => call.options), [{ viewport: null }, undefined]);
      assert.equal(calls.filter(call => call.method === 'Browser.close').length, 4);
      // Fail on any additional SDK method, CDP command, fingerprint script, media or focus override.
      assert.deepEqual([...new Set(calls.map(call => call.method))].sort(),
        ['Browser.close', 'connect', 'connectOverCDP', 'newContext', 'newPage']);
    } finally {
      _clientLoader.loadPlaywright = origPw;
      _clientLoader.loadPuppeteer = origPup;
    }
  });
});
