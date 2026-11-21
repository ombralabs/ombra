/**
 * Engine process lifecycle, CDP readiness bridge, and Playwright / Puppeteer launchers
 * (SDK contract v0.1 §3, §10, §11, §12).
 */

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { loadOptionalModule, optionalModuleAvailable } from "./optional-module.cjs";
import { resolveBinary } from "./binary.js";
import { isLoopbackHost, resolveLicenseKey } from "./config.js";
import {
  CDPConnectError,
  ClientNotInstalledError,
  EngineCrashedError,
  EngineExitedError,
  InvalidOptionError,
  LaunchTimeoutError,
  LicenseError,
  redactSecrets,
} from "./errors.js";
import { resolveAutoGeoHints } from "./geoip.js";
import { buildEngineArgs, validateLaunchOptions } from "./options.js";
import { acquireProfileLease, type ProfileLease } from "./profile.js";
import { prepareProxy, type LoopbackProxyRelay } from "./proxy.js";
import type {
  BuiltLaunchCommand,
  LaunchContextOptions,
  LaunchInfo,
  LaunchOptions,
  LaunchPersistentContextOptions,
  PlaywrightBrowserContext,
  PlaywrightBrowser,
  PuppeteerBrowser,
  PuppeteerLaunchOptions,
} from "./types.js";

const STDERR_LOG_NAME = ".ombra-stderr.log";
const LICENSE_LINE_RE = /ombra license:\s*([a-z0-9_]+)/i;
const LICENSE_EXIT_CODES: Record<number, string> = {
  76: "no_slot",
  77: "invalid",
  78: "offline",
  79: "config",
};

interface EngineRuntime {
  proc: ChildProcess;
  binaryPath: string;
  engineVersion: string;
  args: string[];
  profileLease: ProfileLease;
  relay: LoopbackProxyRelay | null;
  stderrLogPath: string;
  stderrFd: number | null;
  secretsToRedact: string[];
  exitCode: number | null;
  closing: boolean;
  crashedExitCode: number | null;
  closed: boolean;
  cleanupPromise: Promise<void> | null;
  stderrTail(limit?: number): string;
  cleanup(): Promise<void>;
  cleanupSync(): void;
}

const launchMetadata = new WeakMap<object, LaunchInfo>();
const contextToBrowser = new WeakMap<object, object>();
const objectToRuntime = new WeakMap<object, EngineRuntime>();
const activeRuntimes = new Set<EngineRuntime>();

process.on("exit", () => {
  for (const rt of Array.from(activeRuntimes)) {
    try {
      rt.cleanupSync();
    } catch {
      // ignore on exit
    }
  }
});

function signalProcessGroup(proc: ChildProcess, force: boolean): void {
  const pid = proc.pid;
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/F", "/T", "/PID", String(pid)], {
        stdio: "ignore",
        timeout: 5_000,
      });
    } catch {
      // Fall back to terminating the leader if taskkill is unavailable.
    }
    try {
      proc.kill(force ? "SIGKILL" : "SIGTERM");
    } catch {
      // ignore
    }
    return;
  }

  const sig = force ? "SIGKILL" : "SIGTERM";
  try {
    process.kill(-pid, sig);
  } catch {
    try {
      proc.kill(sig);
    } catch {
      // already exited
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForChildExit(proc: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      proc.removeListener("exit", onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    proc.once("exit", onExit);
  });
}

function buildChildEnv(
  userEnv: Record<string, string>,
  explicitLicenseKey?: string,
): { env: NodeJS.ProcessEnv | undefined; secrets: string[] } {
  const { key, source } = resolveLicenseKey(explicitLicenseKey);
  const secrets = key ? [key] : [];
  if (Object.keys(userEnv).length === 0 && source !== "param" && source !== "file") {
    return { env: undefined, secrets };
  }
  const merged: NodeJS.ProcessEnv = { ...process.env, ...userEnv };
  if (key && (source === "param" || source === "file")) {
    merged.OMBRA_LICENSE_KEY = key;
  }
  return { env: merged, secrets };
}

function parseDevtoolsActivePort(portFile: string): { port: number; wsPath: string } | null {
  try {
    const lines = fs.readFileSync(portFile, "utf8").split(/\r?\n/);
    if (lines.length < 2) return null;
    const portText = lines[0].trim();
    const wsPath = lines[1].trim();
    if (!/^\d+$/.test(portText) || !wsPath.startsWith("/devtools/browser/")) return null;
    const port = Number.parseInt(portText, 10);
    if (port < 1 || port > 65535) return null;
    return { port, wsPath };
  } catch {
    return null;
  }
}

function probeCdpVersion(
  port: number,
): Promise<{ status: "ready" | "license" | "pending"; value: string | null }> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/json/version",
        timeout: 2_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(text);
              const ws = data?.webSocketDebuggerUrl;
              if (typeof ws === "string" && ws.trim()) {
                resolve({ status: "ready", value: ws.trim() });
                return;
              }
            } catch {
              // pending
            }
            resolve({ status: "pending", value: null });
            return;
          }
          if (res.statusCode === 503) {
            try {
              const body = JSON.parse(text);
              const state = body?.ombra?.license;
              if (typeof state === "string" && state.trim()) {
                resolve({ status: "license", value: state.trim() });
                return;
              }
            } catch {
              // pending
            }
          }
          resolve({ status: "pending", value: null });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: "pending", value: null });
    });
    req.on("error", () => {
      resolve({ status: "pending", value: null });
    });
  });
}

function raiseExitError(runtime: EngineRuntime, exitCode: number | null): never {
  const tail = runtime.stderrTail();
  const licMatch = LICENSE_LINE_RE.exec(tail);
  const state = licMatch
    ? licMatch[1].toLowerCase()
    : exitCode !== null
      ? LICENSE_EXIT_CODES[exitCode]
      : undefined;
  if (state && ["no_key", "invalid", "no_slot", "offline", "config"].includes(state)) {
    throw new LicenseError(`Ombra engine refused to start due to license state (${state}).`, {
      details: {
        licenseState: state,
        exitCode,
        binaryPath: runtime.binaryPath,
        stderrTail: tail,
      },
      secrets: runtime.secretsToRedact,
    });
  }
  throw new EngineExitedError(`Ombra engine exited prematurely with code ${String(exitCode)}.`, {
    details: {
      exitCode,
      binaryPath: runtime.binaryPath,
      stderrTail: tail,
    },
    secrets: runtime.secretsToRedact,
  });
}

function checkWsLoopback(wsUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(wsUrl);
  } catch (err) {
    throw new CDPConnectError(`Invalid CDP WebSocket URL: '${wsUrl}'`, { cause: err });
  }
  if (!isLoopbackHost(parsed.hostname)) {
    throw new CDPConnectError(
      `Refusing non-loopback CDP endpoint host '${parsed.hostname}' (SI-08).`,
      { details: { cdpHost: parsed.hostname } },
    );
  }
}

async function waitForEngineReady(
  runtime: EngineRuntime,
  timeoutMs: number,
): Promise<{ port: number; wsUrl: string }> {
  const portFile = path.join(runtime.profileLease.path, "DevToolsActivePort");
  const deadline = Date.now() + timeoutMs;
  let port: number | null = null;
  let lastLicenseState: string | null = null;

  while (Date.now() < deadline) {
    if (runtime.proc.exitCode !== null || runtime.proc.signalCode !== null) {
      raiseExitError(runtime, runtime.proc.exitCode);
    }

    if (port === null) {
      const parsed = parseDevtoolsActivePort(portFile);
      if (parsed) {
        port = parsed.port;
      } else {
        await sleep(50);
        continue;
      }
    }

    const probe = await probeCdpVersion(port);
    if (probe.status === "ready" && probe.value) {
      checkWsLoopback(probe.value);
      return { port, wsUrl: probe.value };
    }
    if (probe.status === "license" && probe.value) {
      lastLicenseState = probe.value;
      if (probe.value === "no_key" || probe.value === "invalid") {
        throw new LicenseError(
          `Ombra engine license error (${probe.value}). Set OMBRA_LICENSE_KEY or ~/.ombra/license.key.`,
          {
            details: {
              licenseState: probe.value,
              binaryPath: runtime.binaryPath,
              stderrTail: runtime.stderrTail(),
            },
            secrets: runtime.secretsToRedact,
          },
        );
      }
    }
    await sleep(100);
  }

  if (lastLicenseState === "no_slot" || lastLicenseState === "offline") {
    throw new LicenseError(
      `Ombra engine license error (${lastLicenseState}) timed out after ${timeoutMs}ms.`,
      {
        details: {
          licenseState: lastLicenseState,
          timeoutMs,
          binaryPath: runtime.binaryPath,
          stderrTail: runtime.stderrTail(),
        },
        secrets: runtime.secretsToRedact,
      },
    );
  }

  throw new LaunchTimeoutError(
    `Ombra engine did not expose a ready CDP endpoint within ${timeoutMs}ms.`,
    {
      details: {
        timeoutMs,
        binaryPath: runtime.binaryPath,
        stderrTail: runtime.stderrTail(),
      },
      secrets: runtime.secretsToRedact,
    },
  );
}

async function prepareRuntime(rawOptions: LaunchOptions): Promise<{
  runtime: EngineRuntime;
  timeoutMs: number;
}> {
  const opts = validateLaunchOptions(rawOptions);
  const resolvedBin = await resolveBinary({
    binaryPath: opts.binaryPath,
    version: opts.version,
    download: opts.download,
  });
  if (!resolvedBin.path) {
    throw new Error("Unexpected null binary path after resolveBinary()");
  }

  const explicitPreset =
    typeof opts.humanize === "object" && opts.humanize !== null ? opts.humanize.preset : undefined;

  const lease = acquireProfileLease({
    profile: opts.profile,
    userDataDir: opts.userDataDir,
    explicitSeed: opts.fingerprint.seed,
    osHint: opts.fingerprint.os,
    requireHostOS: opts.mobileViewport !== undefined,
    timezone: opts.fingerprint.timezone,
    locale: opts.fingerprint.locale,
    humanizePreset: explicitPreset,
    engineVersion: resolvedBin.version,
  });

  let relay: LoopbackProxyRelay | null = null;
  let stderrFd: number | null = null;
  let child: ChildProcess | null = null;
  try {
    const proxyRes = await prepareProxy(opts.proxy);
    relay = proxyRes.relay;

    const geoHints = await resolveAutoGeoHints({
      timezone: lease.timezone,
      locale: lease.locale,
      proxy: opts.proxy,
    });

    const cliArgs = buildEngineArgs({
      options: opts,
      profileDir: lease.path,
      seed: lease.seed,
      proxyArgs: proxyRes.proxyArgs,
      engineVersion: resolvedBin.version,
      resolvedOs: lease.osHint,
      resolvedTimezone: geoHints.timezone,
      resolvedLocale: geoHints.locale,
      resolvedHumanizePreset: lease.humanizePreset,
    });

    const { env: childEnv, secrets: keySecrets } = buildChildEnv(opts.env, opts.licenseKey);
    const allSecrets = [...(opts.proxy?.secrets() ?? []), ...keySecrets].filter(Boolean);

    fs.rmSync(path.join(lease.path, "DevToolsActivePort"), { force: true });
    const stderrLogPath = path.join(lease.path, STDERR_LOG_NAME);
    stderrFd = fs.openSync(stderrLogPath, "w", 0o600);

    const proc = spawn(resolvedBin.path, cliArgs, {
      stdio: ["ignore", "ignore", stderrFd],
      env: childEnv,
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    child = proc;
    const spawned = new Promise<void>((resolve, reject) => {
      proc.once("spawn", resolve);
      proc.on("error", reject);
    });
    fs.closeSync(stderrFd);
    stderrFd = null;
    try {
      await spawned;
    } catch (err) {
      throw new EngineExitedError("Ombra engine process could not start.", {
        details: { binaryPath: resolvedBin.path, spawnCode: (err as NodeJS.ErrnoException).code },
        secrets: allSecrets,
        cause: err,
      });
    }

    const runtime: EngineRuntime = {
      proc,
      binaryPath: resolvedBin.path,
      engineVersion: resolvedBin.version,
      args: cliArgs,
      profileLease: lease,
      relay,
      stderrLogPath,
      stderrFd: null,
      secretsToRedact: allSecrets,
      exitCode: null,
      closing: false,
      crashedExitCode: null,
      closed: false,
      cleanupPromise: null,
      stderrTail(limit = 2_000): string {
        let fd: number | null = null;
        try {
          fd = fs.openSync(stderrLogPath, "r");
          const size = fs.fstatSync(fd).size;
          const length = Math.min(size, limit);
          const buf = Buffer.alloc(length);
          let read = 0;
          while (read < length) {
            const bytes = fs.readSync(fd, buf, read, length - read, size - length + read);
            if (bytes === 0) break;
            read += bytes;
          }
          return redactSecrets(buf.subarray(0, read).toString("utf8"), allSecrets);
        } catch {
          // ignore
        } finally {
          if (fd !== null) {
            try { fs.closeSync(fd); } catch { /* Best-effort diagnostics. */ }
          }
        }
        return "";
      },
      cleanup(): Promise<void> {
        if (this.cleanupPromise) return this.cleanupPromise;
        if (this.closed) return Promise.resolve();
        this.closing = true;
        this.cleanupPromise = (async () => {
          try {
            signalProcessGroup(this.proc, false);
            if (this.proc.pid) {
              await waitForChildExit(this.proc, 3_000);
              // The leader can exit while owned descendants still need termination.
              if (process.platform !== "win32") signalProcessGroup(this.proc, true);
              await waitForChildExit(this.proc, 2_000);
            }
          } finally {
            try {
              if (this.relay) {
                try { await this.relay.stop(); } catch { /* Continue releasing ownership. */ }
              }
            } finally {
              try {
                this.profileLease.release();
              } finally {
                this.closed = true;
                activeRuntimes.delete(this);
              }
            }
          }
        })();
        return this.cleanupPromise;
      },
      cleanupSync(): void {
        if (this.closed) return;
        this.closed = true;
        activeRuntimes.delete(this);
        try {
          signalProcessGroup(this.proc, true);
        } finally {
          this.profileLease.release();
        }
      },
    };

    proc.on("exit", (code) => {
      runtime.exitCode = code;
      if (!runtime.closing && !runtime.closed && runtime.crashedExitCode === null) {
        runtime.crashedExitCode = code ?? -1;
      }
    });

    activeRuntimes.add(runtime);
    return { runtime, timeoutMs: opts.timeoutMs };
  } catch (err) {
    if (child?.pid) {
      signalProcessGroup(child, true);
      await waitForChildExit(child, 2_000);
    }
    if (stderrFd !== null) {
      try {
        fs.closeSync(stderrFd);
      } catch {
        // ignore
      }
    }
    if (relay) {
      try {
        await relay.stop();
      } catch {
        // ignore
      }
    }
    try { lease.release(); } catch { /* Preserve the startup failure. */ }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Module overrides for unit tests + dynamic optional peer import
// ---------------------------------------------------------------------------

export const _clientLoader = {
  loadPlaywright: async (): Promise<any> => {
    const names = ["playwright", "playwright-core"];
    for (const modName of names) {
      if (await optionalModuleAvailable(modName)) return loadOptionalModule(modName);
    }
    throw new ClientNotInstalledError(
      "Playwright is required for launch(). Install it with: npm install playwright",
    );
  },
  loadPuppeteer: async (): Promise<any> => {
    const names = ["puppeteer", "puppeteer-core"];
    for (const modName of names) {
      if (await optionalModuleAvailable(modName)) return loadOptionalModule(modName);
    }
    throw new ClientNotInstalledError(
      "Puppeteer is required for launchPuppeteer(). Install it with: npm install puppeteer-core",
    );
  },
};

function defaultViewportNullOnBrowser(browser: any): void {
  const origNewContext = browser.newContext?.bind(browser);
  if (typeof origNewContext === "function") {
    browser.newContext = (options: Record<string, unknown> = {}) => {
      const next = { ...options };
      if (!("viewport" in next)) {
        next.viewport = null;
      }
      return origNewContext(next);
    };
  }
  const origNewPage = browser.newPage?.bind(browser);
  if (typeof origNewPage === "function") {
    browser.newPage = (options: Record<string, unknown> = {}) => {
      const next = { ...options };
      if (!("viewport" in next)) {
        next.viewport = null;
      }
      return origNewPage(next);
    };
  }
}

export function lastLaunchInfo(obj: unknown): LaunchInfo | null {
  if (!obj || (typeof obj !== "object" && typeof obj !== "function")) return null;
  const meta = launchMetadata.get(obj as object);
  if (!meta) return null;
  const rt = objectToRuntime.get(obj as object);
  if (rt && !rt.closing && !rt.closed) {
    const code = rt.crashedExitCode ?? rt.proc.exitCode;
    if (code !== null) {
      rt.crashedExitCode = code;
      meta.crashed = true;
      meta.exitCode = code;
    }
  }
  return { ...meta };
}

export function resolveBrowserHandle(obj: unknown): any {
  if (!obj || (typeof obj !== "object" && typeof obj !== "function")) {
    throw new InvalidOptionError(
      "Expected a Browser or BrowserContext returned by @ombralabs/sdk launch*().",
    );
  }
  const mapped = contextToBrowser.get(obj as object);
  if (mapped) return mapped;
  const anyObj = obj as any;
  if (
    typeof anyObj.newBrowserCDPSession === "function" ||
    (typeof anyObj.target === "function" && typeof anyObj.wsEndpoint === "function")
  ) {
    return anyObj;
  }
  if (typeof anyObj.browser === "function") {
    const b = anyObj.browser();
    if (b && typeof b.newBrowserCDPSession === "function") return b;
  }
  throw new InvalidOptionError(
    "Expected a Browser or BrowserContext returned by @ombralabs/sdk launch*().",
  );
}

export function checkEngineHealth(obj: unknown): void {
  if (!obj || (typeof obj !== "object" && typeof obj !== "function")) {
    throw new InvalidOptionError(
      "Expected a Browser or BrowserContext returned by @ombralabs/sdk launch*().",
    );
  }
  const rt = objectToRuntime.get(obj as object);
  if (!rt) {
    throw new InvalidOptionError(
      "Expected a Browser or BrowserContext returned by @ombralabs/sdk launch*().",
    );
  }
  if (rt.closing && rt.crashedExitCode === null) return;

  const code = rt.crashedExitCode ?? (!rt.closed ? rt.proc.exitCode : null);
  if (code !== null) {
    rt.crashedExitCode = code;
    const meta = launchMetadata.get(obj as object);
    if (meta) {
      meta.crashed = true;
      meta.exitCode = code;
    }
    const tail = rt.stderrTail();
    void rt.cleanup().catch(() => {});
    throw new EngineCrashedError(
      `Ombra engine process exited unexpectedly while browser was open (code ${code}).`,
      {
        details: {
          exitCode: code,
          binaryPath: rt.binaryPath,
          stderrTail: tail,
        },
        secrets: rt.secretsToRedact,
      },
    );
  }
}

export async function buildLaunchOptions(options: LaunchOptions = {}): Promise<BuiltLaunchCommand> {
  const opts = validateLaunchOptions(options);
  const resolvedBin = await resolveBinary({
    binaryPath: opts.binaryPath,
    version: opts.version,
    download: opts.download,
  });
  if (!resolvedBin.path) {
    throw new Error("Unexpected null binary path");
  }
  const seed = opts.fingerprint.seed ?? 0;
  const proxyArgs: string[] = [];
  if (opts.proxy) {
    proxyArgs.push(
      opts.proxy.hasCredentials
        ? "--proxy-server=socks5://127.0.0.1:<relay>"
        : `--proxy-server=${opts.proxy.serverUrl}`,
    );
    if (opts.proxy.bypass) {
      proxyArgs.push(`--proxy-bypass-list=${opts.proxy.bypass}`);
    }
  }
  const args = buildEngineArgs({
    options: opts,
    profileDir: opts.userDataDir ?? "<ephemeral-profile>",
    seed,
    proxyArgs,
    engineVersion: resolvedBin.version,
    resolvedOs: opts.fingerprint.os,
    resolvedTimezone: opts.fingerprint.timezone,
    resolvedLocale: opts.fingerprint.locale,
  });
  return {
    binaryPath: resolvedBin.path,
    engineVersion: resolvedBin.version,
    args,
    timeoutMs: opts.timeoutMs,
  };
}

/**
 * Launch Ombra Chromium and return a native Playwright `Browser`.
 */
export async function launch<TBrowser = PlaywrightBrowser>(
  options: LaunchOptions = {},
): Promise<TBrowser> {
  const pwMod = await _clientLoader.loadPlaywright();
  const chromium = pwMod.chromium ?? pwMod.default?.chromium;
  if (!chromium || typeof chromium.connectOverCDP !== "function") {
    throw new ClientNotInstalledError("Loaded Playwright module does not expose chromium.connectOverCDP.");
  }

  const { runtime, timeoutMs } = await prepareRuntime(options);
  let browser: any;
  let port = 0;
  let wsUrl = "";

  try {
    const deadline = Date.now() + timeoutMs;
    const ready = await waitForEngineReady(runtime, timeoutMs);
    port = ready.port;
    wsUrl = ready.wsUrl;

    const endpoint = `http://127.0.0.1:${port}`;
    let lastErr: unknown;
    let connected = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = Math.max(1_000, deadline - Date.now());
      try {
        browser = await chromium.connectOverCDP(endpoint, {
          timeout: remaining,
          isLocal: true,
          noDefaults: true,
        });
        connected = true;
        break;
      } catch (err) {
        lastErr = err;
        if (runtime.proc.exitCode !== null || runtime.proc.signalCode !== null) {
          raiseExitError(runtime, runtime.proc.exitCode);
        }
        const probe = await probeCdpVersion(port);
        if (attempt === 0 && probe.status === "ready" && Date.now() < deadline) {
          await sleep(100);
          continue;
        }
        break;
      }
    }
    if (!connected) {
      throw new CDPConnectError(
        `Failed to connect Playwright over CDP to ${endpoint}: ${String(lastErr)}`,
        {
          details: {
            endpoint,
            binaryPath: runtime.binaryPath,
            stderrTail: runtime.stderrTail(),
          },
          secrets: runtime.secretsToRedact,
          cause: lastErr,
        },
      );
    }
  } catch (err) {
    try { await runtime.cleanup(); } catch { /* Preserve the startup/attach failure. */ }
    throw err;
  }

  const origClose = browser.close.bind(browser);
  const meta: LaunchInfo = {
    binaryPath: runtime.binaryPath,
    engineVersion: runtime.engineVersion,
    profileDir: runtime.profileLease.path,
    seed: runtime.profileLease.seed,
    cdpPort: port,
    wsUrl,
    pid: runtime.proc.pid ?? 0,
    crashed: false,
    exitCode: null,
  };

  browser.close = async (closeOpts?: { reason?: string }): Promise<void> => {
    runtime.closing = true;
    try {
      let sentBrowserClose = false;
      try {
        const cdp = await browser.newBrowserCDPSession();
        await cdp.send("Browser.close");
        sentBrowserClose = true;
      } catch {
        // ignore if already disconnected
      }
      try {
        await origClose(closeOpts);
      } catch {
        // ignore
      }
      if (sentBrowserClose) {
        await waitForChildExit(runtime.proc, 3_500);
      }
    } finally {
      await runtime.cleanup();
    }
  };

  defaultViewportNullOnBrowser(browser);
  browser.on?.("disconnected", () => {
    if (!runtime.closing && !runtime.closed) {
      if (runtime.proc.exitCode !== null) {
        runtime.crashedExitCode = runtime.proc.exitCode;
        meta.crashed = true;
        meta.exitCode = runtime.proc.exitCode;
      }
      void runtime.cleanup().catch(() => {});
    }
  });

  launchMetadata.set(browser, meta);
  objectToRuntime.set(browser, runtime);
  return browser as TBrowser;
}

function splitContextOptions(options: LaunchContextOptions): {
  launchOpts: LaunchOptions;
  pwContextOpts: Record<string, unknown>;
} {
  const { locale, timezone, timezoneId, viewport, contextOptions, ...rest } = options;
  const fp = { ...(rest.fingerprint ?? {}) };
  const effTz = timezone ?? timezoneId;
  if (effTz !== undefined && fp.timezone === undefined) {
    fp.timezone = effTz;
  }
  if (locale !== undefined && fp.locale === undefined) {
    fp.locale = locale;
  }

  const cleanCtx = { ...(contextOptions ?? {}) };
  // SI-04: never pass locale/timezoneId/userAgent via Playwright Emulation overrides by default
  delete cleanCtx.locale;
  delete cleanCtx.timezoneId;

  const pwContextOpts: Record<string, unknown> = {
    ...cleanCtx,
    viewport: viewport !== undefined ? viewport : cleanCtx.viewport ?? null,
  };

  return {
    launchOpts: {
      ...rest,
      ...(Object.keys(fp).length > 0 ? { fingerprint: fp } : {}),
    },
    pwContextOpts,
  };
}

/**
 * Launch Ombra and return a Playwright `BrowserContext`.
 * Closing the context closes the browser and stops the engine process.
 */
export async function launchContext<TContext = PlaywrightBrowserContext>(
  options: LaunchContextOptions = {},
): Promise<TContext> {
  const { launchOpts, pwContextOpts } = splitContextOptions(options);
  const browser: any = await launch(launchOpts);
  let context: any;
  try {
    context = await browser.newContext(pwContextOpts);
  } catch (err) {
    try {
      await browser.close();
    } catch {
      // ignore
    }
    throw err;
  }

  const origClose = context.close.bind(context);
  context.close = async (closeOpts?: { reason?: string }): Promise<void> => {
    try {
      await origClose(closeOpts);
    } catch {
      // ignore
    } finally {
      await browser.close(closeOpts);
    }
  };

  contextToBrowser.set(context, browser);
  const rt = objectToRuntime.get(browser);
  if (rt) objectToRuntime.set(context, rt);
  const meta = launchMetadata.get(browser);
  if (meta) launchMetadata.set(context, meta);
  return context as TContext;
}

/**
 * Launch Ombra with a persistent profile and return its default Playwright `BrowserContext`.
 */
export async function launchPersistentContext<TContext = PlaywrightBrowserContext>(
  userDataDirOrOptions?: string | LaunchPersistentContextOptions,
  maybeOptions?: LaunchPersistentContextOptions,
): Promise<TContext> {
  let merged: Record<string, unknown>;
  if (typeof userDataDirOrOptions === "string") {
    merged = { ...(maybeOptions ?? {}), userDataDir: userDataDirOrOptions };
  } else {
    merged = { ...(userDataDirOrOptions ?? {}) };
  }

  if (
    merged.userDataDir === undefined &&
    merged.user_data_dir === undefined &&
    merged.profile === undefined
  ) {
    throw new InvalidOptionError("Either 'userDataDir' or 'profile' is required.");
  }
  if ("viewport" in merged && merged.viewport !== undefined && merged.viewport !== null) {
    throw new InvalidOptionError(
      "launchPersistentContext attaches to the engine's default context and cannot override viewport via Playwright Emulation (SI-04); pass fingerprint: { screen: { width, height } } or args: ['--window-size=W,H'] instead.",
    );
  }
  delete merged.viewport;

  const { launchOpts } = splitContextOptions(merged as LaunchContextOptions);
  const browser: any = await launch(launchOpts);
  let context: any;
  try {
    const existingContexts = typeof browser.contexts === "function" ? browser.contexts() : browser.contexts;
    context = Array.isArray(existingContexts) && existingContexts.length > 0
      ? existingContexts[0]
      : await browser.newContext({ viewport: null });
  } catch (err) {
    try { await browser.close(); } catch { /* Preserve the attach failure. */ }
    throw err;
  }

  context.close = async (closeOpts?: { reason?: string }): Promise<void> => {
    await browser.close(closeOpts);
  };

  contextToBrowser.set(context, browser);
  const rt = objectToRuntime.get(browser);
  if (rt) objectToRuntime.set(context, rt);
  const meta = launchMetadata.get(browser);
  if (meta) launchMetadata.set(context, meta);
  return context as TContext;
}

/**
 * Launch Ombra Chromium and return a native Puppeteer `Browser`.
 */
export async function launchPuppeteer<TBrowser = PuppeteerBrowser>(
  options: PuppeteerLaunchOptions = {},
): Promise<TBrowser> {
  const { defaultViewport, ...launchOpts } = options;
  const pupMod = await _clientLoader.loadPuppeteer();
  const puppeteer = pupMod.default ?? pupMod;
  if (!puppeteer || typeof puppeteer.connect !== "function") {
    throw new ClientNotInstalledError("Loaded Puppeteer module does not expose connect().");
  }

  const { runtime, timeoutMs } = await prepareRuntime(launchOpts);
  let browser: any;
  let port = 0;
  let wsUrl = "";

  try {
    const deadline = Date.now() + timeoutMs;
    const ready = await waitForEngineReady(runtime, timeoutMs);
    port = ready.port;
    wsUrl = ready.wsUrl;

    let lastErr: unknown;
    let connected = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        browser = await puppeteer.connect({
          browserWSEndpoint: wsUrl,
          defaultViewport: defaultViewport !== undefined ? defaultViewport : null,
        });
        connected = true;
        break;
      } catch (err) {
        lastErr = err;
        if (runtime.proc.exitCode !== null || runtime.proc.signalCode !== null) {
          raiseExitError(runtime, runtime.proc.exitCode);
        }
        const probe = await probeCdpVersion(port);
        if (attempt === 0 && probe.status === "ready" && Date.now() < deadline) {
          await sleep(100);
          continue;
        }
        break;
      }
    }
    if (!connected) {
      throw new CDPConnectError(
        `Failed to connect Puppeteer over CDP to ${wsUrl}: ${String(lastErr)}`,
        {
          details: {
            wsUrl,
            binaryPath: runtime.binaryPath,
            stderrTail: runtime.stderrTail(),
          },
          secrets: runtime.secretsToRedact,
          cause: lastErr,
        },
      );
    }
  } catch (err) {
    try { await runtime.cleanup(); } catch { /* Preserve the startup/attach failure. */ }
    throw err;
  }

  const origClose = browser.close?.bind(browser);
  const meta: LaunchInfo = {
    binaryPath: runtime.binaryPath,
    engineVersion: runtime.engineVersion,
    profileDir: runtime.profileLease.path,
    seed: runtime.profileLease.seed,
    cdpPort: port,
    wsUrl,
    pid: runtime.proc.pid ?? 0,
    crashed: false,
    exitCode: null,
  };

  browser.close = async (): Promise<void> => {
    runtime.closing = true;
    try {
      let sentBrowserClose = false;
      try {
        const cdp = await browser.target().createCDPSession();
        await cdp.send("Browser.close");
        sentBrowserClose = true;
      } catch {
        if (typeof origClose === "function") {
          try {
            await origClose();
          } catch {
            // ignore
          }
        }
      }
      try {
        await browser.disconnect?.();
      } catch {
        // ignore
      }
      if (sentBrowserClose) {
        await waitForChildExit(runtime.proc, 3_500);
      }
    } finally {
      await runtime.cleanup();
    }
  };

  browser.on?.("disconnected", () => {
    if (!runtime.closing && !runtime.closed) {
      if (runtime.proc.exitCode !== null) {
        runtime.crashedExitCode = runtime.proc.exitCode;
        meta.crashed = true;
        meta.exitCode = runtime.proc.exitCode;
      }
      void runtime.cleanup().catch(() => {});
    }
  });

  launchMetadata.set(browser, meta);
  objectToRuntime.set(browser, runtime);
  return browser as TBrowser;
}
