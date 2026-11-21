/**
 * Environment variables, platform mapping, Ed25519 keys, and license resolution.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { InvalidOptionError, UnsupportedPlatformError } from "./errors.js";

export const DEFAULT_DOWNLOAD_URL = "https://api.github.com/repos/ombralabs/ombra/releases";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MIN_TIMEOUT_MS = 1_000;
export const MAX_TIMEOUT_MS = 600_000;

/**
 * Ed25519 public keys used to verify Ombra engine channel/release envelopes
 * (matches config/engine-signing.pub in ombra-engine).
 */
export const BINARY_SIGNING_PUBKEYS: string[] = [
  "c3bmkOT6aDdpe3Kobp/KU5GzND8A77L6gv0XCdL2ZlY=",
];

const VERSION_PIN_RE = /^(?:chromium-)?(\d+\.\d+\.\d+\.\d+(?:-(?:[1-9]\d*|0\+dev\.[0-9a-fA-F]+))?)$/;

type LogLevelName = "error" | "warn" | "info" | "debug";
const LOG_WEIGHTS: Record<LogLevelName, number> = {
  error: 40,
  warn: 30,
  info: 20,
  debug: 10,
};

function currentLogWeight(): number {
  const raw = (process.env.OMBRA_LOG_LEVEL ?? "warn").trim().toLowerCase();
  if (raw === "warning") return LOG_WEIGHTS.warn;
  if (raw in LOG_WEIGHTS) return LOG_WEIGHTS[raw as LogLevelName];
  return LOG_WEIGHTS.warn;
}

export const logger = {
  error(msg: string): void {
    if (currentLogWeight() <= LOG_WEIGHTS.error) {
      process.stderr.write(`[ombra:error] ${msg}\n`);
    }
  },
  warn(msg: string): void {
    if (currentLogWeight() <= LOG_WEIGHTS.warn) {
      process.stderr.write(`[ombra:warn] ${msg}\n`);
    }
  },
  info(msg: string): void {
    if (currentLogWeight() <= LOG_WEIGHTS.info) {
      process.stderr.write(`[ombra:info] ${msg}\n`);
    }
  },
  debug(msg: string): void {
    if (currentLogWeight() <= LOG_WEIGHTS.debug) {
      process.stderr.write(`[ombra:debug] ${msg}\n`);
    }
  },
};

export interface PlatformInfo {
  sdkName: "macos-arm64" | "macos-x64" | "windows-x64" | "linux-x64";
  cdnName: "darwin-arm64" | "darwin-x64" | "windows-x64" | "linux-x64";
  archiveExt: ".tar.gz" | ".tar.xz" | ".zip";
  system: "Darwin" | "Windows" | "Linux";
  arch: "arm64" | "x64";
}

export function getPlatformInfo(
  platformOverride: NodeJS.Platform = process.platform,
  archOverride: string = process.arch,
): PlatformInfo {
  const arch = archOverride === "x64" ? "x64" : archOverride === "arm64" ? "arm64" : null;
  if (!arch) {
    throw new UnsupportedPlatformError(
      `Unsupported CPU architecture '${archOverride}'; Ombra supports x64 and arm64.`,
      { details: { os: platformOverride, arch: archOverride } },
    );
  }

  if (platformOverride === "darwin") {
    return {
      sdkName: arch === "arm64" ? "macos-arm64" : "macos-x64",
      cdnName: arch === "arm64" ? "darwin-arm64" : "darwin-x64",
      archiveExt: ".tar.gz",
      system: "Darwin",
      arch,
    };
  }
  if (platformOverride === "win32") {
    if (arch !== "x64") {
      throw new UnsupportedPlatformError(
        `Ombra does not publish Windows builds for architecture '${archOverride}'.`,
        { details: { os: platformOverride, arch: archOverride } },
      );
    }
    return {
      sdkName: "windows-x64",
      cdnName: "windows-x64",
      archiveExt: ".zip",
      system: "Windows",
      arch: "x64",
    };
  }
  if (platformOverride === "linux") {
    if (arch !== "x64") {
      throw new UnsupportedPlatformError(
        `Ombra does not publish Linux builds for architecture '${archOverride}'.`,
        { details: { os: platformOverride, arch: archOverride } },
      );
    }
    return {
      sdkName: "linux-x64",
      cdnName: "linux-x64",
      archiveExt: ".tar.xz",
      system: "Linux",
      arch: "x64",
    };
  }

  throw new UnsupportedPlatformError(
    `Unsupported operating system '${platformOverride}'.`,
    { details: { os: platformOverride, arch: archOverride } },
  );
}

export function expandTilde(filePath: string): string {
  if (filePath === "~") return os.homedir();
  if (filePath.startsWith("~/") || filePath.startsWith("~\\")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

export function getCacheDir(): string {
  const raw = process.env.OMBRA_CACHE_DIR?.trim();
  if (raw) {
    return path.resolve(expandTilde(raw));
  }
  return path.join(os.homedir(), ".ombra");
}

export function getManagedEnginesDir(): string {
  return path.join(getCacheDir(), "engines");
}

export function getProfilesDir(): string {
  return path.join(getCacheDir(), "profiles");
}

export function getGeoipDir(): string {
  return path.join(getCacheDir(), "geoip");
}

export function getLicenseKeyPath(): string {
  return path.join(getCacheDir(), "license.key");
}

export function getAppEnginesDir(): string {
  const override = process.env.OMBRA_APP_ENGINES_DIR?.trim();
  if (override) {
    return path.resolve(expandTilde(override));
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Ombra", "engines");
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Ombra", "engines");
  }
  const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(xdg, "Ombra", "engines");
}

export function getBinaryPathOverride(): string | null {
  const raw = process.env.OMBRA_BINARY_PATH?.trim();
  return raw ? path.resolve(expandTilde(raw)) : null;
}

export function getDownloadBaseUrl(): string | null {
  const raw = process.env.OMBRA_DOWNLOAD_URL;
  if (raw === undefined) return DEFAULT_DOWNLOAD_URL;
  const trimmed = raw.trim();
  if (!trimmed || ["0", "false", "off", "none"].includes(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed.replace(/\/+$/, "");
}

function envTruthy(name: string, defaultVal: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultVal;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return defaultVal;
}

export function getAutoUpdate(): boolean {
  return envTruthy("OMBRA_AUTO_UPDATE", true);
}

export function skipChecksumEnabled(): boolean {
  return envTruthy("OMBRA_SKIP_CHECKSUM", false);
}

export function getReleaseChannel(explicit?: string): "stable" | "beta" {
  const raw = (explicit ?? process.env.OMBRA_RELEASE_CHANNEL ?? "stable").trim().toLowerCase();
  const mapped = raw === "preview" ? "beta" : raw;
  if (mapped !== "stable" && mapped !== "beta") {
    throw new InvalidOptionError(
      `Unsupported release channel '${raw}'; expected 'stable' or 'beta'.`,
      { details: { channel: raw } },
    );
  }
  return mapped;
}

export function normalizeRequestedVersion(explicit?: string): string | null {
  const raw = (explicit ?? process.env.OMBRA_VERSION ?? "").trim();
  if (!raw || raw.toLowerCase() === "latest") return null;
  const m = VERSION_PIN_RE.exec(raw);
  if (!m) {
    throw new InvalidOptionError(
      `Invalid engine version pin '${raw}'; expected 'X.Y.Z.W' or 'X.Y.Z.W-N'.`,
      { details: { version: raw } },
    );
  }
  return m[1];
}

export function getTimeoutMs(explicit?: number): number {
  let value: number;
  if (explicit !== undefined) {
    if (typeof explicit !== "number" || !Number.isInteger(explicit)) {
      throw new InvalidOptionError(`timeoutMs must be an integer, got ${typeof explicit}.`);
    }
    value = explicit;
  } else {
    const envRaw = process.env.OMBRA_TIMEOUT_MS?.trim();
    if (envRaw) {
      if (!/^-?\d+$/.test(envRaw)) {
        throw new InvalidOptionError(
          `OMBRA_TIMEOUT_MS must be an integer in milliseconds, got '${envRaw}'.`,
        );
      }
      value = Number.parseInt(envRaw, 10);
    } else {
      value = DEFAULT_TIMEOUT_MS;
    }
  }

  if (value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) {
    throw new InvalidOptionError(
      `timeoutMs must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}, got ${value}.`,
      { details: { timeoutMs: value } },
    );
  }
  return value;
}

export function resolveLicenseKey(explicitKey?: string): {
  key: string | null;
  source: "param" | "env" | "file" | "none";
} {
  if (explicitKey && explicitKey.trim()) {
    return { key: explicitKey.trim(), source: "param" };
  }
  const envKey = process.env.OMBRA_LICENSE_KEY?.trim();
  if (envKey) {
    return { key: envKey, source: "env" };
  }
  const keyFile = getLicenseKeyPath();
  try {
    if (fs.existsSync(keyFile) && fs.statSync(keyFile).isFile()) {
      const content = fs.readFileSync(keyFile, "utf8").trim();
      if (content) {
        return { key: content, source: "file" };
      }
    }
  } catch {
    // Ignore unreadable license file; engine will report no_key if required.
  }
  return { key: null, source: "none" };
}

export function saveLicenseKey(key: string): string {
  const cleaned = key.trim();
  if (!cleaned) {
    throw new InvalidOptionError("License key cannot be empty.");
  }
  const keyPath = getLicenseKeyPath();
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  const tmpPath = `${keyPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${cleaned}\n`, { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") {
    fs.chmodSync(tmpPath, 0o600);
  }
  fs.renameSync(tmpPath, keyPath);
  return keyPath;
}

export function removeLicenseKey(): boolean {
  const keyPath = getLicenseKeyPath();
  if (!fs.existsSync(keyPath)) return false;
  fs.unlinkSync(keyPath);
  return true;
}

export function isLoopbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const cleaned = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return cleaned === "127.0.0.1" || cleaned === "::1" || cleaned === "localhost";
}

export function binaryCandidatesInDir(baseDir: string, system: PlatformInfo["system"]): string[] {
  if (system === "Darwin") {
    return [
      path.join(baseDir, "Chromium.app", "Contents", "MacOS", "Chromium"),
      path.join(baseDir, "Ombra.app", "Contents", "MacOS", "Ombra"),
      path.join(baseDir, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
    ];
  }
  if (system === "Windows") {
    return [path.join(baseDir, "chrome.exe"), path.join(baseDir, "ombra.exe")];
  }
  return [path.join(baseDir, "chrome"), path.join(baseDir, "chromium"), path.join(baseDir, "ombra")];
}
