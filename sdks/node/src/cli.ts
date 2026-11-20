#!/usr/bin/env node
/**
 * CLI for managing the Ombra stealth Chromium binary and license key (`ombra-sdk`).
 *
 * Commands:
 *   npx ombra-sdk install [--version <v>] [--channel <stable|beta>]
 *   npx ombra-sdk info [--quick] [--json] [--proxy <url>]
 *   npx ombra-sdk doctor [--quick] [--json] [--proxy <url>]
 *   npx ombra-sdk update [--channel <stable|beta>]
 *   npx ombra-sdk clear-cache
 *   npx ombra-sdk login [KEY]
 *   npx ombra-sdk logout
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { binaryInfo, clearCache, ensureBinary, resolveBinary } from "./binary.js";
import {
  getCacheDir,
  getGeoipDir,
  getLicenseKeyPath,
  getPlatformInfo,
  removeLicenseKey,
  resolveLicenseKey,
  saveLicenseKey,
} from "./config.js";
import { InvalidOptionError, redactSecrets } from "./errors.js";
import { GEOIP_DB_FILENAME, geoipAvailable, resolveAutoGeoHints } from "./geoip.js";
import { parseProxy } from "./proxy.js";
import { optionalModuleAvailable } from "./optional-module.cjs";
import { CONTRACT_VERSION, SDK_VERSION, SUPPORTED_ENGINE_RANGE } from "./version.js";

export interface CliIO {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

const defaultIO: CliIO = {
  stdout: (line: string) => process.stdout.write(`${line}\n`),
  stderr: (line: string) => process.stderr.write(`${line}\n`),
};

function probeBinaryRuns(binaryPath: string): Record<string, unknown> {
  if (process.platform === "win32") {
    return { tested: false, reason: "skipped on Windows (--version spawns browser)" };
  }
  try {
    const out = execFileSync(binaryPath, ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { tested: true, ok: true, version: out.trim() };
  } catch (err: any) {
    const detail = (err?.stderr?.toString?.() || err?.message || String(err)).trim();
    return { tested: true, ok: false, error: detail };
  }
}

function printHelp(out: (line: string) => void): void {
  out(`ombra-sdk v${SDK_VERSION} — Manage the Ombra stealth Chromium binary and SDK configuration.

Usage:
  ombra-sdk <command> [options]

Commands:
  install [--version <v>] [--channel <stable|beta>]  Download and verify the Ombra engine
  info [--quick] [--json] [--proxy <url>]            Environment, binary, and peer diagnostics
  doctor [--quick] [--json] [--proxy <url>]          Alias for info
  update [--channel <stable|beta>]                   Check for and install a newer engine build
  clear-cache                                        Remove SDK-managed binaries (keeps profiles)
  login [<license-key>]                              Save license key to ~/.ombra/license.key (0600)
  logout                                             Remove saved ~/.ombra/license.key

Options:
  -h, --help                                         Show this help message
  -v, --version                                      Print SDK version`);
}

function parseFlags(args: string[]): {
  positionals: string[];
  flags: Record<string, string | boolean>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        if (key === "quick" || key === "json" || key === "help") {
          flags[key] = true;
        } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          flags[key] = args[++i];
        } else {
          flags[key] = true;
        }
      }
    } else if (arg === "-h") {
      flags.help = true;
    } else if (arg === "-v") {
      flags.version = true;
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags };
}

function promptLine(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function collectDiagnostics(opts: {
  quick: boolean;
  proxy?: string;
}): Promise<Record<string, any>> {
  const plat = getPlatformInfo();
  const info = await binaryInfo();
  const lic = resolveLicenseKey();

  const launchCheck =
    opts.quick || !info.installed || !info.path
      ? {
          tested: false,
          reason: opts.quick ? "skipped (--quick)" : "binary not installed",
        }
      : probeBinaryRuns(info.path);

  const geoipDb = path.join(getGeoipDir(), GEOIP_DB_FILENAME);
  const geoipDiag: Record<string, unknown> = {
    dbPresent: fs.existsSync(geoipDb),
    path: geoipDb,
  };

  if (opts.proxy) {
    try {
      const parsedProxy = parseProxy(opts.proxy);
      const hints = await resolveAutoGeoHints({
        timezone: "auto",
        locale: "auto",
        proxy: parsedProxy,
      });
      geoipDiag.resolved = {
        timezone: hints.timezone ?? null,
        locale: hints.locale ?? null,
      };
    } catch (err) {
      geoipDiag.resolved = { error: redactSecrets(String(err)) };
    }
  }

  return {
    sdk: {
      version: SDK_VERSION,
      contract: CONTRACT_VERSION,
      supportedEngine: SUPPORTED_ENGINE_RANGE,
      node: process.versions.node,
      os: os.type(),
      arch: process.arch,
      platform: plat.sdkName,
      cacheDir: getCacheDir(),
    },
    binary: info,
    launchCheck,
    license: {
      configured: lic.source !== "none",
      source: lic.source,
    },
    geoip: geoipDiag,
    modules: {
      playwright: (await optionalModuleAvailable("playwright")) || (await optionalModuleAvailable("playwright-core")),
      puppeteer: (await optionalModuleAvailable("puppeteer")) || (await optionalModuleAvailable("puppeteer-core")),
      "mmdb-lib": await geoipAvailable(),
    },
  };
}

function printDiagnostics(diag: Record<string, any>, out: (line: string) => void): void {
  const { sdk, binary, launchCheck, license, geoip, modules } = diag;
  out("Ombra SDK diagnostics");
  out(`SDK:       ${sdk.version} (contract ${sdk.contract}, engine ${sdk.supportedEngine})`);
  out(`Node.js:   ${sdk.node}`);
  out(`Platform:  ${sdk.platform} (${sdk.os} ${sdk.arch})`);
  out(`Cache dir: ${sdk.cacheDir}`);
  out(`Binary:    ${binary.path || "(not installed)"}`);
  out(`Version:   ${binary.version} (source=${binary.source}, installed=${binary.installed})`);
  out(`SHA-256:   ${binary.sha256 || "(none)"}`);
  if (launchCheck.tested) {
    out(
      `Check:     ${launchCheck.ok ? `ok (${launchCheck.version})` : `failed (${launchCheck.error})`}`,
    );
  } else {
    out(`Check:     ${launchCheck.reason}`);
  }
  out(`License:   ${license.configured ? "configured" : "not set"} (source=${license.source})`);
  out(`GeoIP DB:  ${geoip.dbPresent ? "present" : "absent"}`);
  if (geoip.resolved) {
    if (geoip.resolved.error) {
      out(`GeoIP res: error (${geoip.resolved.error})`);
    } else {
      out(`GeoIP res: tz=${geoip.resolved.timezone}, locale=${geoip.resolved.locale}`);
    }
  }
  out("Modules:");
  for (const [name, ok] of Object.entries(modules)) {
    out(`  ${name}: ${ok ? "ok" : "missing"}`);
  }
}

export async function runCli(argv: string[] = process.argv.slice(2), io: CliIO = defaultIO): Promise<number> {
  const { positionals, flags } = parseFlags(argv);
  const cmd = positionals[0];

  if (flags.help || (!cmd && !flags.version)) {
    printHelp(io.stdout);
    return flags.help ? 0 : 2;
  }
  if (flags.version && !cmd) {
    io.stdout(SDK_VERSION);
    return 0;
  }

  try {
    switch (cmd) {
      case "install": {
        if (flags.version === true || flags.version === "") {
          throw new InvalidOptionError("install --version requires a value.");
        }
        const version = typeof flags.version === "string" ? flags.version : undefined;
        const releaseChannel = typeof flags.channel === "string" ? flags.channel : undefined;
        const binPath = await ensureBinary({ version, releaseChannel });
        io.stdout(binPath);
        return 0;
      }

      case "info":
      case "doctor": {
        const diag = await collectDiagnostics({
          quick: Boolean(flags.quick),
          proxy: typeof flags.proxy === "string" ? flags.proxy : undefined,
        });
        if (flags.json) {
          io.stdout(JSON.stringify(diag, null, 2));
        } else {
          printDiagnostics(diag, io.stdout);
        }
        return 0;
      }

      case "update": {
        const releaseChannel = typeof flags.channel === "string" ? flags.channel : undefined;
        const resolved = await resolveBinary({
          download: true,
          releaseChannel,
          forceUpdateCheck: true,
        });
        io.stdout(`Engine ready: ${resolved.version} (${resolved.path})`);
        return 0;
      }

      case "clear-cache": {
        await clearCache();
        io.stdout("Cleared SDK-managed engine cache (profiles preserved).");
        return 0;
      }

      case "login": {
        let rawKey = positionals[1];
        if (!rawKey) {
          if (!process.stdin.isTTY) {
            io.stderr("Usage: ombra-sdk login <license-key>");
            return 2;
          }
          rawKey = await promptLine("Enter Ombra license key: ");
        }
        if (/[\r\n\0]/.test(rawKey) || /\s/.test(rawKey.trim())) {
          throw new InvalidOptionError("License key must not contain whitespace or control characters.");
        }
        const savedPath = saveLicenseKey(rawKey);
        io.stdout(`Saved license key to ${savedPath}`);
        return 0;
      }

      case "logout": {
        const keyPath = getLicenseKeyPath();
        if (removeLicenseKey()) {
          io.stdout(`Removed ${keyPath}`);
        } else {
          io.stdout("No saved license key found.");
        }
        return 0;
      }

      default: {
        io.stderr(`Unknown command: '${cmd}'. Run 'ombra-sdk --help' for usage.`);
        return 2;
      }
    }
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    io.stderr(`Error: ${redactSecrets(msg)}`);
    return 1;
  }
}

function isInvokedAsCli(): boolean {
  if (process.env.OMBRA_CLI_NO_AUTORUN === "1") return false;
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const resolved = fs.realpathSync(entry).replace(/\\/g, "/");
    return (
      resolved.endsWith("/dist/esm/cli.js") ||
      resolved.endsWith("/dist/cjs/cli.js") ||
      resolved.endsWith("/src/cli.ts") ||
      path.basename(entry) === "ombra-sdk"
    );
  } catch {
    return path.basename(entry) === "ombra-sdk";
  }
}

if (isInvokedAsCli()) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
