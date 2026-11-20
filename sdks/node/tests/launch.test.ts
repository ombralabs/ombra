import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { runCli } from "../dist/esm/cli.js";
import {
  CDPConnectError,
  EngineCrashedError,
  EngineExitedError,
  LaunchTimeoutError,
  LicenseError,
  SDK_VERSION,
  UnsupportedEngineError,
  type PuppeteerBrowserLike,
  _clientLoader,
  checkEngineHealth,
  lastLaunchInfo,
  launch,
  launchContext,
  launchPersistentContext,
  launchPuppeteer,
  ombraCdp,
} from "../dist/esm/index.js";
import * as puppeteerSubpath from "../dist/esm/puppeteer.js";
import { makeFakeEngine, withIsolatedEnv } from "./helpers.js";
import { acquireProfileLease } from "../dist/esm/profile.js";
import { LoopbackProxyRelay } from "../dist/esm/proxy.js";

function createFakePlaywrightClient(opts: { failFirstConnect?: boolean } = {}) {
  let connectAttempts = 0;
  const connectEndpoints: Array<{ endpoint: string; options: any }> = [];
  const contextCalls: Array<Record<string, unknown>> = [];

  return {
    connectEndpoints,
    contextCalls,
    module: {
      chromium: {
        async connectOverCDP(endpoint: string, options: any) {
          connectAttempts += 1;
          connectEndpoints.push({ endpoint, options });
          if (opts.failFirstConnect && connectAttempts === 1) {
            throw new Error("Transient ECONNRESET during CDP handshake");
          }

          const emitter = new EventEmitter();
          const defaultCtx = {
            pages: () => [],
            newPage: async () => ({ goto: async () => {} }),
            close: async () => {},
            browser: () => browserObj,
          };
          const browserObj: any = Object.assign(emitter, {
            isConnected: () => true,
            contexts: () => [defaultCtx],
            async newContext(ctxOpts: Record<string, unknown> = {}) {
              contextCalls.push(ctxOpts);
              return {
                pages: () => [],
                newPage: async () => ({ goto: async () => {} }),
                close: async () => {},
                browser: () => browserObj,
              };
            },
            async newPage(pageOpts: Record<string, unknown> = {}) {
              contextCalls.push(pageOpts);
              return { goto: async () => {}, close: async () => {} };
            },
            async newBrowserCDPSession() {
              return {
                send: async (method: string) => {
                  if (method === "Browser.close") {
                    throw new Error("stub does not implement Browser.close");
                  }
                  return {};
                },
                on: () => {},
                detach: async () => {},
              };
            },
            async close() {},
          });
          return browserObj;
        },
      },
    },
  };
}

function createFakePuppeteerClient() {
  const connectCalls: any[] = [];
  return {
    connectCalls,
    module: {
      async connect(opts: any) {
        connectCalls.push(opts);
        const emitter = new EventEmitter();
        return Object.assign(emitter, {
          connected: true,
          wsEndpoint: () => opts.browserWSEndpoint,
          target: () => ({
            createCDPSession: async () => ({
              send: async (method: string) => {
                if (method === "Browser.close") {
                  throw new Error("stub does not implement Browser.close");
                }
                return {};
              },
              on: () => {},
              detach: async () => {},
            }),
          }),
          disconnect: async () => {},
          close: async () => {},
        });
      },
    },
  };
}

describe("engine lifecycle, Playwright & Puppeteer launchers, CLI, and dual ESM/CJS", () => {
  it("rejects missing-interpreter startup in an isolated host and releases logs, relay and profiles", { skip: process.platform === "win32" }, () => {
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import path from 'node:path';
      import net from 'node:net';
      import { createHash } from 'node:crypto';
      import { launch, launchPuppeteer, _clientLoader, EngineExitedError } from './dist/esm/index.js';
      import { acquireProfileLease } from './dist/esm/profile.js';
      import { LoopbackProxyRelay } from './dist/esm/proxy.js';
      import { makeFakeEngine, withIsolatedEnv } from './.test-dist/helpers.js';
      _clientLoader.loadPlaywright = async () => ({ chromium: { connectOverCDP() { throw Error('unexpected attach'); } } });
      _clientLoader.loadPuppeteer = async () => ({ connect() { throw Error('unexpected attach'); } });
      await withIsolatedEnv(async ({tmpRoot}) => {
        const bin = makeFakeEngine(tmpRoot);
        fs.writeFileSync(bin, '#!/missing/ombra/interpreter\\n');
        fs.writeFileSync(path.join(tmpRoot, 'binary.sha256'), createHash('sha256').update(fs.readFileSync(bin)).digest('hex'));
        const open = fs.openSync, close = fs.closeSync, mkdir = fs.mkdtempSync, start = LoopbackProxyRelay.prototype.start;
        const logs = new Set(); const profiles = []; const relays = [];
        fs.openSync = function(file, ...args) { const fd = open.call(this, file, ...args); if (String(file).endsWith('.ombra-stderr.log')) logs.add(fd); return fd; };
        fs.closeSync = function(fd) { logs.delete(fd); return close.call(this, fd); };
        fs.mkdtempSync = function(prefix, ...args) { const dir = mkdir.call(this, prefix, ...args); if (String(prefix).includes('ombra-profile-')) profiles.push(dir); return dir; };
        LoopbackProxyRelay.prototype.start = async function() { const url = await start.call(this); relays.push(Number(new URL(url).port)); return url; };
        try {
          for (const launchFn of [launch, launchPuppeteer]) {
            for (const persistent of [false, true]) {
              const userDataDir = path.join(tmpRoot, 'persistent');
              await assert.rejects(() => launchFn({ binaryPath: bin, ...(persistent ? {userDataDir} : {}), proxy: 'http://user:password@127.0.0.1:9', fingerprint: {timezone: 'UTC', locale: 'en-US'}, timeoutMs: 1000 }), err => err instanceof EngineExitedError && err.details.spawnCode === 'ENOENT');
              assert.equal(logs.size, 0);
              if (persistent) { const lease = acquireProfileLease({userDataDir}); lease.release(); }
            }
          }
          assert.equal(profiles.length, 2);
          for (const profile of profiles) assert.equal(fs.existsSync(profile), false);
          for (const port of relays) {
            const server = net.createServer();
            await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
            await new Promise(resolve => server.close(resolve));
          }
          process.stdout.write('host alive; resources released\\n');
        } finally { fs.openSync = open; fs.closeSync = close; fs.mkdtempSync = mkdir; LoopbackProxyRelay.prototype.start = start; }
      });
    `], { cwd: process.cwd(), encoding: "utf8", timeout: 15_000 });
    assert.equal(child.status, 0, child.stderr || String(child.error));
    assert.match(child.stdout, /host alive; resources released/);
  });

  it("kills the owned POSIX group after its leader exits, including a child ignoring SIGTERM", { skip: process.platform === "win32" }, async () => {
    const origPw = _clientLoader.loadPlaywright;
    let browser: any;
    let childPid = 0;
    _clientLoader.loadPlaywright = async () => createFakePlaywrightClient().module;
    try {
      await withIsolatedEnv(async ({tmpRoot}) => {
        const bin = makeFakeEngine(tmpRoot, { scriptBody: `
          const fs = require('node:fs'), path = require('node:path');
          const {spawn} = require('node:child_process');
          const dir = process.argv.find(a => a.startsWith('--user-data-dir=')).slice(16);
          const child = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); const fs=require('node:fs'); fs.writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)", path.join(dir, 'tree-child.pid')], {stdio:'ignore'});
          child.unref();
          setInterval(() => {}, 1000);
        ` });
        const versionServer = (await import("node:http")).createServer((_req, res) => res.end(JSON.stringify({webSocketDebuggerUrl:'ws://127.0.0.1:1234/devtools/browser/tree'})));
        await new Promise<void>(resolve => versionServer.listen(0, '127.0.0.1', resolve));
        const userDataDir = path.join(tmpRoot, 'tree-profile');
        fs.mkdirSync(userDataDir);
        const pending = launch({binaryPath:bin, userDataDir, timeoutMs:2000});
        try {
          for (let i = 0; i < 200 && !fs.existsSync(path.join(userDataDir,'tree-child.pid')); i++) await new Promise(r => setTimeout(r,10));
          childPid = Number(fs.readFileSync(path.join(userDataDir,'tree-child.pid'),'utf8'));
          fs.writeFileSync(path.join(userDataDir, 'DevToolsActivePort'), `${(versionServer.address() as any).port}\n/devtools/browser/tree\n`);
          browser = await pending;
          process.kill(lastLaunchInfo(browser)!.pid, 'SIGKILL');
          for (let i = 0; i < 200 && !lastLaunchInfo(browser)?.crashed; i++) await new Promise(r => setTimeout(r,10));
          assert.equal(lastLaunchInfo(browser)?.crashed, true);
          process.kill(childPid, 0);
          await browser.close();
          for (let i = 0; i < 200; i++) {
            try { process.kill(childPid, 0); } catch { childPid = 0; break; }
            await new Promise(r => setTimeout(r,10));
          }
          assert.equal(childPid, 0, 'owned child survived browser.close() after leader exit');
        } finally {
          await browser?.close();
          if (childPid) { try { process.kill(childPid, 'SIGKILL'); } catch {} }
          await new Promise<void>(resolve => versionServer.close(() => resolve()));
        }
      });
    } finally { _clientLoader.loadPlaywright = origPw; }
  });

  it("reads only the bounded stderr tail from a multi-megabyte log", async (t) => {
    const origPw = _clientLoader.loadPlaywright;
    _clientLoader.loadPlaywright = async () => createFakePlaywrightClient().module;
    try {
      await withIsolatedEnv(async ({tmpRoot}) => {
        const bin = makeFakeEngine(tmpRoot, {scriptBody: `require('node:fs').writeSync(2, Buffer.alloc(5 * 1024 * 1024, 120)); require('node:fs').writeSync(2, 'LAST-BYTES'); process.exit(1);`});
        const logFds = new Set<number>(); const reads: number[] = []; let wholeReads = 0, bytesRead = 0;
        const open = fs.openSync, read = fs.readSync, readFile = fs.readFileSync, close = fs.closeSync;
        t.mock.method(fs, 'openSync', ((file: any, ...args: any[]) => { const fd = (open as any)(file, ...args); if (String(file).endsWith('.ombra-stderr.log')) logFds.add(fd); return fd; }) as any);
        t.mock.method(fs, 'closeSync', (fd: number) => { logFds.delete(fd); return close(fd); });
        t.mock.method(fs, 'readSync', ((fd: number, ...args: any[]) => {
          const log = logFds.has(fd);
          if (log) { reads.push(args[2]); args[2] = Math.min(args[2], 127); }
          const bytes = (read as any)(fd, ...args);
          if (log) bytesRead += bytes;
          return bytes;
        }) as any);
        t.mock.method(fs, 'readFileSync', ((file: any, ...args: any[]) => { if (String(file).endsWith('.ombra-stderr.log')) wholeReads++; return (readFile as any)(file, ...args); }) as any);
        await assert.rejects(() => launch({binaryPath:bin}), (err: any) => {
          assert.ok(err instanceof EngineExitedError);
          assert.equal(err.details.stderrTail, 'x'.repeat(1990) + 'LAST-BYTES');
          return true;
        });
        assert.equal(wholeReads, 0, 'stderrTail read the entire file');
        assert.ok(reads.length > 1, 'fixture must exercise short reads');
        assert.ok(reads.every(length => length <= 2000), String(reads));
        assert.equal(bytesRead, 2000);
        assert.equal(logFds.size, 0);
      });
    } finally { t.mock.restoreAll(); _clientLoader.loadPlaywright = origPw; }
  });

  it("makes concurrent close and disconnect await profile release before reopen", async (t) => {
    for (const puppeteer of [false, true]) {
      const origPw = _clientLoader.loadPlaywright, origPup = _clientLoader.loadPuppeteer;
      _clientLoader.loadPlaywright = async () => createFakePlaywrightClient().module;
      _clientLoader.loadPuppeteer = async () => createFakePuppeteerClient().module;
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      let entered!: () => void;
      const stopping = new Promise<void>(resolve => { entered = resolve; });
      const stop = LoopbackProxyRelay.prototype.stop;
      const hook = t.mock.method(LoopbackProxyRelay.prototype, 'stop', async function(this: LoopbackProxyRelay) { entered(); await gate; await stop.call(this); });
      try {
        await withIsolatedEnv(async ({tmpRoot}) => {
          const bin = makeFakeEngine(tmpRoot), userDataDir = path.join(tmpRoot,'concurrent');
          const browser: any = await (puppeteer ? launchPuppeteer : launch)({binaryPath:bin, userDataDir, proxy:'http://user:password@127.0.0.1:9', fingerprint:{timezone:'UTC', locale:'en-US'}});
          browser.emit('disconnected');
          await stopping;
          let settled = 0;
          const closings = [browser.close(), browser.close()].map(p => p.then(() => { settled++; }));
          try {
            await new Promise(resolve => setTimeout(resolve,30));
            assert.equal(settled, 0, 'close returned during in-flight cleanup');
            assert.throws(() => acquireProfileLease({userDataDir}), /locked/);
          } finally { release(); await Promise.all(closings); }
          const reopened = acquireProfileLease({userDataDir}); reopened.release();
        });
      } finally { release(); hook.mock.restore(); _clientLoader.loadPlaywright = origPw; _clientLoader.loadPuppeteer = origPup; }
    }
  });

  it("tries native close before Windows forced cleanup, and taskkill before leader kill (platform model)", { skip: process.platform === "win32" }, async (t) => {
    const origPw = _clientLoader.loadPlaywright, origPup = _clientLoader.loadPuppeteer;
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
    const childProcess = createRequire(import.meta.url)('node:child_process');
    try {
      for (const puppeteer of [false, true]) {
        await withIsolatedEnv(async ({tmpRoot}) => {
          const events: string[] = [];
          const fake: any = puppeteer ? createFakePuppeteerClient() : createFakePlaywrightClient();
          const connect = puppeteer ? fake.module.connect : fake.module.chromium.connectOverCDP;
          const attach = async (...args: any[]) => {
            const browser = await connect(...args);
            browser.close = async () => { events.push('native-close'); };
            return browser;
          };
          if (puppeteer) fake.module.connect = attach;
          else fake.module.chromium.connectOverCDP = attach;
          _clientLoader.loadPlaywright = async () => fake.module;
          _clientLoader.loadPuppeteer = async () => fake.module;
          const browser: any = await (puppeteer ? launchPuppeteer : launch)({binaryPath:makeFakeEngine(tmpRoot)});
          const pid = lastLaunchInfo(browser)!.pid;
          let leaderAvailable = true, treeHadLeader = false;
          const calls: Array<{command:string; args:string[]}> = [];
          const cdp = {send: async () => { events.push('cdp-close'); throw Error('graceful close failed'); }};
          browser.newBrowserCDPSession = async () => cdp;
          browser.target = () => ({createCDPSession: async () => cdp});
          const kill = childProcess.ChildProcess.prototype.kill;
          const killHook = t.mock.method(childProcess.ChildProcess.prototype, 'kill', function(this: any, ...args: any[]) {
            if (this.pid === pid && leaderAvailable) { events.push('leader-kill'); leaderAvailable = false; }
            return kill.apply(this, args);
          });
          const hook = t.mock.method(childProcess, 'execFileSync', (command: string, args: string[]) => {
            calls.push({command,args});
            events.push('taskkill');
            treeHadLeader = leaderAvailable;
            // The model ends at taskkill; native profile locks still use the host OS.
            Object.defineProperty(process, 'platform', platform);
            process.kill(-pid, 'SIGKILL');
            return Buffer.alloc(0);
          });
          syncBuiltinESMExports();
          Object.defineProperty(process, 'platform', {value:'win32'});
          try {
            await browser.close();
            assert.deepEqual(calls, [{command:'taskkill',args:['/F','/T','/PID',String(pid)]}]);
            assert.equal(treeHadLeader, true);
            assert.deepEqual(events, ['cdp-close','native-close','taskkill','leader-kill']);
          } finally {
            Object.defineProperty(process, 'platform', platform);
            hook.mock.restore(); killHook.mock.restore(); syncBuiltinESMExports();
            try { process.kill(-pid, 'SIGKILL'); } catch {}
            await browser.close();
          }
        });
      }
    } finally { Object.defineProperty(process, 'platform', platform); _clientLoader.loadPlaywright = origPw; _clientLoader.loadPuppeteer = origPup; }
  });

  it("preserves startup failure when relay and profile cleanup fail, while releasing ownership", async (t) => {
    const origPw = _clientLoader.loadPlaywright;
    _clientLoader.loadPlaywright = async () => createFakePlaywrightClient().module;
    try {
      await withIsolatedEnv(async ({tmpRoot}) => {
        const bin = makeFakeEngine(tmpRoot);
        let failedProfile = '';
        const rm = fs.rmSync, stop = LoopbackProxyRelay.prototype.stop;
        const rmHook = t.mock.method(fs, 'rmSync', ((target: any, ...args: any[]) => {
          if (path.basename(String(target)).startsWith('ombra-profile-')) { failedProfile = String(target); throw Error('profile cleanup failed'); }
          return (rm as any)(target, ...args);
        }) as any);
        const stopHook = t.mock.method(LoopbackProxyRelay.prototype, 'stop', async function(this: LoopbackProxyRelay) { await stop.call(this); throw Error('relay cleanup failed'); });
        try {
          await assert.rejects(() => launch({binaryPath:bin, timeoutMs:1000, env:{FAKE_ENGINE_MODE:'hang_no_port'}, proxy:'http://user:password@127.0.0.1:9', fingerprint:{timezone:'UTC',locale:'en-US'}}), LaunchTimeoutError);
        } finally { rmHook.mock.restore(); stopHook.mock.restore(); }
        assert.ok(failedProfile);
        const reopened = acquireProfileLease({userDataDir:failedProfile}); reopened.release();
        fs.rmSync(failedProfile, {recursive:true,force:true});
      });
    } finally { _clientLoader.loadPlaywright = origPw; }
  });

  it("shares cleanup errors between close callers after releasing the profile descriptor", async (t) => {
    const origPw = _clientLoader.loadPlaywright;
    _clientLoader.loadPlaywright = async () => createFakePlaywrightClient().module;
    try {
      await withIsolatedEnv(async ({tmpRoot}) => {
        const browser: any = await launch({binaryPath:makeFakeEngine(tmpRoot)});
        const userDataDir = lastLaunchInfo(browser)!.profileDir;
        const rm = fs.rmSync, failure = new Error('cannot remove ephemeral profile');
        const hook = t.mock.method(fs, 'rmSync', ((target: any, ...args: any[]) => {
          if (String(target) === userDataDir) throw failure;
          return (rm as any)(target, ...args);
        }) as any);
        try {
          const results = await Promise.allSettled([browser.close(), browser.close()]);
          for (const result of results) {
            assert.equal(result.status, 'rejected');
            if (result.status === 'rejected') assert.equal(result.reason, failure);
          }
        } finally { hook.mock.restore(); }
        const reopened = acquireProfileLease({userDataDir}); reopened.release();
        fs.rmSync(userDataDir, {recursive:true,force:true});
      });
    } finally { _clientLoader.loadPlaywright = origPw; }
  });

  it("releases a persistent context when default-context attachment fails", async () => {
    const origPw = _clientLoader.loadPlaywright;
    const fake = createFakePlaywrightClient();
    let attached: any;
    _clientLoader.loadPlaywright = async () => ({chromium:{connectOverCDP: async (...args: [string, any]) => {
      attached = await fake.module.chromium.connectOverCDP(...args);
      attached.contexts = () => [];
      attached.newContext = async () => { throw Error('default context unavailable'); };
      return attached;
    }}});
    try {
      await withIsolatedEnv(async ({tmpRoot}) => {
        const userDataDir = path.join(tmpRoot,'attach-failure');
        try {
          await assert.rejects(() => launchPersistentContext(userDataDir, {binaryPath:makeFakeEngine(tmpRoot)}), /default context unavailable/);
          const reopened = acquireProfileLease({userDataDir}); reopened.release();
        } finally { await attached?.close(); }
      });
    } finally { _clientLoader.loadPlaywright = origPw; }
  });

  it("selects the pinned revision through every launch family and rejects conflicting explicit engines", async () => {
    const origPw = _clientLoader.loadPlaywright;
    const origPup = _clientLoader.loadPuppeteer;
    _clientLoader.loadPlaywright = async () => createFakePlaywrightClient().module;
    _clientLoader.loadPuppeteer = async () => createFakePuppeteerClient().module;
    try {
      await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => {
        const pinned = makeFakeEngine(path.join(cacheDir, "engines", "151.0.7922.108-7"), { version: "151.0.7922.108-7" });
        const newer = makeFakeEngine(path.join(cacheDir, "engines", "151.0.7922.108-9"), { version: "151.0.7922.108-9" });
        const launchers = [
          launch,
          launchContext,
          (opts: any) => launchPersistentContext(path.join(tmpRoot, "persistent-pin"), opts),
          launchPuppeteer<PuppeteerBrowserLike>,
          puppeteerSubpath.launch<PuppeteerBrowserLike>,
        ];
        for (const start of launchers) {
          const browser = await start({ version: "151.0.7922.108-7", download: false });
          try {
            assert.equal(lastLaunchInfo(browser)?.binaryPath, pinned);
            assert.equal(lastLaunchInfo(browser)?.engineVersion, "151.0.7922.108-7");
          } finally { await browser.close(); }
          await assert.rejects(() => start({ binaryPath: newer, version: "151.0.7922.108-7" }), UnsupportedEngineError);
        }
      });
    } finally {
      _clientLoader.loadPlaywright = origPw;
      _clientLoader.loadPuppeteer = origPup;
    }
  });

  it("launches Playwright (launch, launchContext, launchPersistentContext) with 503 warmup, retry, and viewport:null", async () => {
    const origPw = _clientLoader.loadPlaywright;
    const fakePw = createFakePlaywrightClient({ failFirstConnect: true });
    _clientLoader.loadPlaywright = async () => fakePw.module;

    try {
      await withIsolatedEnv(async ({ tmpRoot }) => {
        const bin = makeFakeEngine(tmpRoot);

        const browser = await launch({
          binaryPath: bin,
          licenseKey: "lic_test_123456",
          env: { FAKE_ENGINE_MODE: "warmup_then_ready" },
        });
        assert.equal(fakePw.connectEndpoints.length, 2); // retried once on transient connect error
        assert.match(fakePw.connectEndpoints[0].endpoint, /^http:\/\/127\.0\.0\.1:\d+$/);

        const info = lastLaunchInfo(browser)!;
        assert.equal(info.binaryPath, bin);
        assert.equal(info.crashed, false);
        assert.ok(info.cdpPort > 0);
        checkEngineHealth(browser);

        // Verify spawned child received OMBRA_LICENSE_KEY via env, not CLI
        const spawned = JSON.parse(
          fs.readFileSync(path.join(info.profileDir, "spawned-args.json"), "utf8"),
        );
        assert.equal(spawned.envKey, "lic_test_123456");
        assert.ok(!spawned.args.join(" ").includes("lic_test_123456"));

        // Default newContext() injects viewport: null
        await browser.newContext();
        assert.equal(fakePw.contextCalls.at(-1)?.viewport, null);
        await browser.close();

        assert.ok(fakePw.connectEndpoints.every(({ options }) => options.noDefaults === true));

        // launchContext routes locale/timezone to engine flags and sets viewport: null
        const ctx = await launchContext({
          binaryPath: bin,
          locale: "ja-JP",
          timezone: "Asia/Tokyo",
        });
        assert.equal(fakePw.contextCalls.at(-1)?.viewport, null);
        assert.equal("locale" in (fakePw.contextCalls.at(-1) ?? {}), false);
        const ctxCdp = await ombraCdp(ctx);
        await ctxCdp.detach();
        await ctx.close();

        // launchPersistentContext reuses profile directory and closes engine on context.close()
        const udd = path.join(tmpRoot, "persist-dir");
        const pCtx = await launchPersistentContext(udd, { binaryPath: bin });
        assert.equal(lastLaunchInfo(pCtx)?.profileDir, udd);
        await pCtx.close();
      });
    } finally {
      _clientLoader.loadPlaywright = origPw;
    }
  });

  it("launches Puppeteer via both launchPuppeteer() and @ombralabs/sdk/puppeteer with defaultViewport:null", async () => {
    const origPup = _clientLoader.loadPuppeteer;
    const fakePup = createFakePuppeteerClient();
    _clientLoader.loadPuppeteer = async () => fakePup.module;

    try {
      await withIsolatedEnv(async ({ tmpRoot }) => {
        const bin = makeFakeEngine(tmpRoot);
        assert.equal(puppeteerSubpath.launch, launchPuppeteer);

        const browser = await puppeteerSubpath.launch<PuppeteerBrowserLike>({ binaryPath: bin });
        assert.equal(fakePup.connectCalls.length, 1);
        assert.equal(fakePup.connectCalls[0].defaultViewport, null);
        assert.match(fakePup.connectCalls[0].browserWSEndpoint, /^ws:\/\/127\.0\.0\.1:\d+\//);

        const cdp = await ombraCdp(browser);
        await cdp.detach();
        await browser.close();
      });
    } finally {
      _clientLoader.loadPuppeteer = origPup;
    }
  });

  it("maps license errors, timeouts, non-loopback WS, early exit secret redaction, and mid-session crashes", async () => {
    const origPw = _clientLoader.loadPlaywright;
    _clientLoader.loadPlaywright = async () => createFakePlaywrightClient().module;

    try {
      await withIsolatedEnv(async ({ tmpRoot }) => {
        const bin = makeFakeEngine(tmpRoot);

        // 1. 503 no_key fails fast without waiting full timeout
        const t0 = Date.now();
        await assert.rejects(
          () =>
            launch({
              binaryPath: bin,
              timeoutMs: 10_000,
              env: { FAKE_ENGINE_MODE: "license_no_key" },
            }),
          (err: any) => err instanceof LicenseError && err.details.licenseState === "no_key",
        );
        assert.ok(Date.now() - t0 < 5_000);

        // 2. Exit code 77 maps to LicenseError(invalid)
        await assert.rejects(
          () => launch({ binaryPath: bin, env: { FAKE_ENGINE_MODE: "exit_license_invalid" } }),
          (err: any) => err instanceof LicenseError && err.details.licenseState === "invalid",
        );

        // 3. 503 no_slot times out as LicenseError(no_slot)
        await assert.rejects(
          () =>
            launch({
              binaryPath: bin,
              timeoutMs: 1_000,
              env: { FAKE_ENGINE_MODE: "license_no_slot" },
            }),
          (err: any) => err instanceof LicenseError && err.details.licenseState === "no_slot",
        );

        // 4. Hang with no DevToolsActivePort raises LaunchTimeoutError
        await assert.rejects(
          () =>
            launch({
              binaryPath: bin,
              timeoutMs: 1_000,
              env: { FAKE_ENGINE_MODE: "hang_no_port" },
            }),
          LaunchTimeoutError,
        );

        // 5. Early exit redacts proxy credentials and license key from stderrTail
        await assert.rejects(
          () =>
            launch({
              binaryPath: bin,
              licenseKey: "lic_secret_value_777",
              env: { FAKE_ENGINE_MODE: "exit_early" },
            }),
          (err: any) => {
            assert.ok(err instanceof EngineExitedError);
            const tail = String(err.details.stderrTail ?? "");
            assert.ok(!tail.includes("topsecret"));
            assert.ok(!tail.includes("lic_secret_value_777"));
            assert.ok(tail.includes("***"));
            return true;
          },
        );

        // 6. Non-loopback webSocketDebuggerUrl rejected (SI-08)
        await assert.rejects(
          () =>
            launch({
              binaryPath: bin,
              env: { FAKE_WS_HOST: "192.168.1.50" },
            }),
          CDPConnectError,
        );

        // 7. Unexpected crash after launch surfaces EngineCrashedError via checkEngineHealth
        const browser = await launch({ binaryPath: bin });
        const pid = lastLaunchInfo(browser)!.pid;
        process.kill(pid, "SIGKILL");
        await new Promise((r) => setTimeout(r, 150));

        assert.throws(() => checkEngineHealth(browser), EngineCrashedError);
        assert.equal(lastLaunchInfo(browser)?.crashed, true);
        await browser.close();
      });
    } finally {
      _clientLoader.loadPlaywright = origPw;
    }
  });

  it("runs CLI commands (help, version, info, login, logout, clear-cache)", async () => {
    await withIsolatedEnv(async ({ tmpRoot, cacheDir }) => {
      const bin = makeFakeEngine(tmpRoot);
      process.env.OMBRA_BINARY_PATH = bin;

      const outLines: string[] = [];
      const errLines: string[] = [];
      const io = {
        stdout: (l: string) => outLines.push(l),
        stderr: (l: string) => errLines.push(l),
      };

      assert.equal(await runCli(["--help"], io), 0);
      assert.ok(outLines.join("\n").includes("ombra-sdk"));

      outLines.length = 0;
      assert.equal(await runCli(["--version"], io), 0);
      assert.equal(outLines[0], SDK_VERSION);

      outLines.length = 0;
      assert.equal(await runCli(["login", "lic_cli_saved_key"], io), 0);
      const keyFile = path.join(cacheDir, "license.key");
      assert.equal(fs.existsSync(keyFile), true);
      if (process.platform !== "win32") {
        assert.equal(fs.statSync(keyFile).mode & 0o777, 0o600);
      }

      outLines.length = 0;
      assert.equal(await runCli(["info", "--quick", "--json"], io), 0);
      const diag = JSON.parse(outLines.join("\n"));
      assert.equal(diag.binary.installed, true);
      assert.equal(diag.license.configured, true);
      assert.equal(diag.license.source, "file");

      outLines.length = 0;
      assert.equal(await runCli(["logout"], io), 0);
      assert.equal(fs.existsSync(keyFile), false);

      assert.equal(await runCli(["clear-cache"], io), 0);
      assert.equal(errLines.length, 0);
    });
  });

  it("loads cleanly via CommonJS require() for dual-package consumers", () => {
    const req = createRequire(import.meta.url);
    const cjsMain = req("../dist/cjs/index.js");
    const cjsPup = req("../dist/cjs/puppeteer.js");
    const cjsCdp = req("../dist/cjs/cdp.js");

    assert.equal(cjsMain.SDK_VERSION, SDK_VERSION);
    assert.equal(typeof cjsMain.launch, "function");
    assert.equal(typeof cjsPup.launch, "function");
    assert.equal(cjsCdp.ombraCdp, cjsMain.ombraCdp);
  });
});
