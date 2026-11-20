/**
 * Engine binary resolution, Ed25519 + SHA-256 verification, download, and cache management
 * (SDK contract v0.1 §5 & spec/schemas/binary-info.schema.json).
 */

import { execFileSync } from "node:child_process";
import { createHash, createPublicKey, randomUUID, verify as cryptoVerify } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { safeExtractTarGz, safeExtractTarXz, safeExtractZip } from "./archive.js";
import {
  BINARY_SIGNING_PUBKEYS,
  DEFAULT_DOWNLOAD_URL,
  binaryCandidatesInDir,
  expandTilde,
  getAppEnginesDir,
  getAutoUpdate,
  getBinaryPathOverride,
  getCacheDir,
  getDownloadBaseUrl,
  getManagedEnginesDir,
  getPlatformInfo,
  getReleaseChannel,
  isLoopbackHost,
  logger,
  normalizeRequestedVersion,
  skipChecksumEnabled,
  type PlatformInfo,
} from "./config.js";
import {
  BinaryNotFoundError,
  ChecksumMismatchError,
  DownloadFailedError,
  UnsupportedEngineError,
  UnsupportedPlatformError,
} from "./errors.js";
import { acquireFileLock, FileLockBusyError } from "./file-lock.js";
import type { BinaryInfo, BinarySource } from "./types.js";
import {
  DEFAULT_ENGINE_VERSION,
  SUPPORTED_ENGINE_MAX_MAJOR,
  SUPPORTED_ENGINE_MIN_CHROMIUM,
  SUPPORTED_ENGINE_RANGE,
} from "./version.js";

const VERSION_PARTS_RE = /^(\d+\.\d+\.\d+\.\d+)(?:-([1-9]\d*|0\+dev\.[0-9a-fA-F]+))?$/;
const GITHUB_TAG_RE = /^v(\d+\.\d+\.\d+\.\d+(?:-[1-9]\d*)?)$/;
const GITHUB_DOWNLOAD_URL = "https://github.com/ombralabs/ombra/releases/download";
const SHA256_RE = /^[a-f0-9]{64}$/;
const UPDATE_CHECK_INTERVAL_MS = 3_600_000;
const DOWNLOAD_RETRIES = 2; // Contract §11: download may retry twice with backoff
const INSTALL_LOCK_TIMEOUT_MS = 30 * 60_000;
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export interface ResolvedBinary {
  version: string;
  platform: string;
  path: string | null;
  installed: boolean;
  source: BinarySource;
  sha256: string | null;
}

export function toBinaryInfo(resolved: ResolvedBinary): BinaryInfo {
  return {
    version: resolved.version,
    platform: resolved.platform,
    path: resolved.path,
    installed: resolved.installed,
    source: resolved.source,
    sha256: resolved.sha256,
  };
}

export function parseVersionKey(version: string): {
  chromium: [number, number, number, number];
  release: number;
  dev: boolean;
} {
  const m = VERSION_PARTS_RE.exec(version.trim());
  if (!m) {
    throw new Error(`Unrecognized engine version: '${version}'`);
  }
  const parts = m[1].split(".").map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
    number,
  ];
  const rel = m[2];
  if (!rel) return { chromium: parts, release: 0, dev: false };
  if (rel.startsWith("0+dev.")) return { chromium: parts, release: 0, dev: true };
  return { chromium: parts, release: Number.parseInt(rel, 10), dev: false };
}

function compareTuple(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

export function versionNewer(candidate: string, current: string): boolean {
  const c = parseVersionKey(candidate);
  const cur = parseVersionKey(current);
  const cmp = compareTuple(c.chromium, cur.chromium);
  if (cmp !== 0) return cmp > 0;
  return c.release > cur.release;
}

export function checkEngineCompatibility(version: string, binaryPath?: string): void {
  let parsed: ReturnType<typeof parseVersionKey>;
  try {
    parsed = parseVersionKey(version);
  } catch (err) {
    throw new UnsupportedEngineError(
      `Unrecognized Ombra engine version '${version}'; SDK supports ${SUPPORTED_ENGINE_RANGE}.`,
      {
        details: {
          engineVersion: version,
          supportedRange: SUPPORTED_ENGINE_RANGE,
          binaryPath: binaryPath ?? null,
        },
        cause: err,
      },
    );
  }
  if (
    compareTuple(parsed.chromium, SUPPORTED_ENGINE_MIN_CHROMIUM) < 0 ||
    parsed.chromium[0] >= SUPPORTED_ENGINE_MAX_MAJOR
  ) {
    throw new UnsupportedEngineError(
      `Ombra engine version '${version}' is outside SDK supported range ${SUPPORTED_ENGINE_RANGE}.`,
      {
        details: {
          engineVersion: version,
          supportedRange: SUPPORTED_ENGINE_RANGE,
          binaryPath: binaryPath ?? null,
        },
      },
    );
  }
}

export function computeSha256(filePath: string): string {
  const hash = createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(128 * 1024);
  try {
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex").toLowerCase();
}

function appRootForBinary(binaryPath: string, system: PlatformInfo["system"]): string {
  const parent = path.dirname(binaryPath);
  const grandParent = path.dirname(parent);
  if (system === "Darwin" && path.basename(parent) === "MacOS" && path.basename(grandParent) === "Contents") {
    return path.dirname(grandParent);
  }
  return parent;
}

function readOmbraBuildJson(
  binaryPath: string,
  system: PlatformInfo["system"],
): Record<string, unknown> | null {
  const appRoot = appRootForBinary(binaryPath, system);
  const candidates = [
    path.join(appRoot, "Contents", "Resources", "ombra-build.json"),
    path.join(appRoot, "ombra-build.json"),
    path.join(path.dirname(binaryPath), "ombra-build.json"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      }
    } catch {
      // continue
    }
  }
  return null;
}

function readMacPlistVersion(appRoot: string): string | null {
  const plistPath = path.join(appRoot, "Contents", "Info.plist");
  try {
    if (!fs.existsSync(plistPath)) return null;
    const text = fs.readFileSync(plistPath, "utf8");
    const m = /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(text);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

export function detectBinaryVersion(
  binaryPath: string,
  system: PlatformInfo["system"],
  fallbackVersion?: string | null,
): string | null {
  const buildMeta = readOmbraBuildJson(binaryPath, system);
  if (buildMeta) {
    for (const k of ["version", "chromium"]) {
      const v = buildMeta[k];
      if (typeof v === "string" && VERSION_PARTS_RE.test(v.trim())) {
        return v.trim();
      }
    }
  }

  if (system === "Darwin") {
    const plistVer = readMacPlistVersion(appRootForBinary(binaryPath, system));
    if (plistVer && VERSION_PARTS_RE.test(plistVer)) return plistVer;
  }

  if (fallbackVersion && VERSION_PARTS_RE.test(fallbackVersion.trim())) {
    return fallbackVersion.trim();
  }

  if (system !== "Windows") {
    try {
      const out = execFileSync(binaryPath, ["--version"], {
        encoding: "utf8",
        timeout: 5_000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      const m = /(\d+\.\d+\.\d+\.\d+(?:-(?:[1-9]\d*|0\+dev\.[0-9a-fA-F]+))?)/.exec(out);
      if (m) return m[1];
    } catch {
      // ignore
    }
  }
  return null;
}

function checkBinaryMagicAndArch(binaryPath: string, plat: PlatformInfo): void {
  const fd = fs.openSync(binaryPath, "r");
  const head = Buffer.alloc(64);
  let n = 0;
  try {
    n = fs.readSync(fd, head, 0, 64, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (n < 4) {
    throw new UnsupportedPlatformError(`Binary is truncated or empty: ${binaryPath}`);
  }

  // Allow text/shebang stubs used in unit/conformance test harnesses.
  if (head[0] === 0x23 && head[1] === 0x21) return;

  const magicBe = head.readUInt32BE(0);
  const magicLe = head.readUInt32LE(0);

  if (magicBe === 0x7f454c46) {
    // ELF
    if (plat.system !== "Linux") {
      throw new UnsupportedPlatformError(
        `ELF binary cannot run on host platform ${plat.sdkName}: ${binaryPath}`,
      );
    }
    if (n >= 20) {
      const machine = head.readUInt16LE(18);
      if (plat.arch === "x64" && machine !== 0x3e) {
        throw new UnsupportedPlatformError(`ELF architecture mismatch for ${plat.sdkName}: ${binaryPath}`);
      }
    }
    return;
  }

  if (
    magicLe === 0xfeedfacf ||
    magicBe === 0xfeedfacf ||
    magicBe === 0xcafebabe ||
    magicBe === 0xcafebabf
  ) {
    // Mach-O 64-bit or Universal binary
    if (plat.system !== "Darwin") {
      throw new UnsupportedPlatformError(
        `Mach-O binary cannot run on host platform ${plat.sdkName}: ${binaryPath}`,
      );
    }
    if (magicLe === 0xfeedfacf && n >= 8) {
      const cputype = head.readUInt32LE(4);
      const expected = plat.arch === "arm64" ? 0x0100000c : 0x01000007;
      if (cputype !== expected) {
        throw new UnsupportedPlatformError(
          `Mach-O CPU architecture mismatch for ${plat.sdkName}: ${binaryPath}`,
        );
      }
    }
    return;
  }

  if (head[0] === 0x4d && head[1] === 0x5a) {
    // Windows PE ('MZ')
    if (plat.system !== "Windows") {
      throw new UnsupportedPlatformError(
        `Windows PE binary cannot run on host platform ${plat.sdkName}: ${binaryPath}`,
      );
    }
  }
}

function checkWindowsMotw(binaryPath: string, system: PlatformInfo["system"]): void {
  if (system !== "Windows") return;
  try {
    const ads = fs.readFileSync(`${binaryPath}:Zone.Identifier`, "utf8");
    if (/ZoneId=[34]/.test(ads)) {
      throw new ChecksumMismatchError(
        `Ombra binary is blocked by Windows Mark-of-the-Web (${binaryPath}). Unblock the file before launching.`,
      );
    }
  } catch (err) {
    if (err instanceof ChecksumMismatchError) throw err;
    // Alternate data stream absent -> not blocked.
  }
}

export function verifyBinary(
  binaryPath: string,
  plat: PlatformInfo,
  trust: { receiptDir: string | null; fallbackVersion?: string | null },
): { version: string; sha256: string } {
  if (!fs.existsSync(binaryPath) || !fs.statSync(binaryPath).isFile()) {
    throw new BinaryNotFoundError(`Ombra engine binary does not exist: ${binaryPath}`, {
      details: { path: binaryPath },
    });
  }

  if (plat.system !== "Windows") {
    try {
      fs.accessSync(binaryPath, fs.constants.X_OK);
    } catch {
      throw new BinaryNotFoundError(`Ombra engine binary is not executable: ${binaryPath}`, {
        details: { path: binaryPath },
      });
    }
  }

  checkWindowsMotw(binaryPath, plat.system);

  const sha = computeSha256(binaryPath);
  if (skipChecksumEnabled()) {
    logger.warn(
      `OMBRA_SKIP_CHECKSUM=1 is active: skipping SHA-256 verification for ${binaryPath} (development only).`,
    );
  } else {
    const receiptBinaryPath = trust.receiptDir === null ? fs.realpathSync(binaryPath) : binaryPath;
    const appRoot = appRootForBinary(receiptBinaryPath, plat.system);
    const markerCandidates = trust.receiptDir !== null
      ? [path.join(trust.receiptDir, "binary.sha256")]
      : appRoot === path.dirname(receiptBinaryPath)
        ? [path.join(appRoot, "binary.sha256")]
        : [
            path.join(path.dirname(appRoot), "binary.sha256"),
            path.join(appRoot, "binary.sha256"),
            path.join(path.dirname(receiptBinaryPath), "binary.sha256"),
          ];
    const marker = markerCandidates.find((candidate) => fs.existsSync(candidate));
    if (marker || trust.receiptDir !== null) {
      const receipt = marker ?? markerCandidates[0];
      let expected: string;
      try {
        expected = fs.readFileSync(receipt, "utf8").trim().toLowerCase();
      } catch (err) {
        throw new ChecksumMismatchError(
          `Ombra binary.sha256 receipt is missing or unreadable at ${receipt}. Reinstall the engine before launching.`,
          { details: { path: binaryPath, receipt }, cause: err },
        );
      }
      if (!SHA256_RE.test(expected) || expected !== sha) {
        throw new ChecksumMismatchError(
          `Ombra binary SHA-256 receipt is invalid or mismatched for ${binaryPath}. Reinstall the engine before launching.`,
          { details: { path: binaryPath, receipt, expected, actual: sha } },
        );
      }
    }
  }

  const buildMeta = readOmbraBuildJson(binaryPath, plat.system);
  if (buildMeta && typeof buildMeta.platform === "string") {
    const builtPlat = buildMeta.platform.trim();
    if (builtPlat && builtPlat !== plat.cdnName && builtPlat !== plat.sdkName) {
      throw new UnsupportedPlatformError(
        `Ombra binary platform '${builtPlat}' does not match host '${plat.sdkName}'.`,
        { details: { binaryPlatform: builtPlat, hostPlatform: plat.sdkName } },
      );
    }
  }

  checkBinaryMagicAndArch(binaryPath, plat);

  const detectedVer = detectBinaryVersion(binaryPath, plat.system, trust.fallbackVersion) ?? DEFAULT_ENGINE_VERSION;
  checkEngineCompatibility(detectedVer, binaryPath);

  return { version: detectedVer, sha256: sha };
}

function versionMatches(installed: string, requested: string | null): boolean {
  if (!requested) return true;
  if (installed === requested) return true;
  if (!requested.includes("-")) {
    try {
      const a = parseVersionKey(installed);
      const b = parseVersionKey(requested);
      return compareTuple(a.chromium, b.chromium) === 0;
    } catch {
      return false;
    }
  }
  return false;
}

function checkRequestedVersion(
  version: string,
  requestedVersion: string | null,
  binaryPath: string,
): void {
  if (!versionMatches(version, requestedVersion)) {
    throw new UnsupportedEngineError(
      `Ombra engine '${version}' at ${binaryPath} does not match requested version '${requestedVersion}'. Select a matching binaryPath or change the version pin.`,
      { details: { binaryPath, engineVersion: version, requestedVersion } },
    );
  }
}

function explicitBinaryReceiptDir(binaryPath: string, plat: PlatformInfo): string | null {
  if (!fs.existsSync(binaryPath)) return null;
  const actualPath = fs.realpathSync(binaryPath);
  for (const root of [getManagedEnginesDir(), getAppEnginesDir()]) {
    if (!fs.existsSync(root)) continue;
    const relative = path.relative(fs.realpathSync(root), actualPath);
    if (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`)) {
      const appRoot = appRootForBinary(actualPath, plat.system);
      return appRoot === path.dirname(actualPath) ? appRoot : path.dirname(appRoot);
    }
  }
  return null;
}

function resolveAppBinary(
  plat: PlatformInfo,
  requestedVersion: string | null,
): { binPath: string; version: string; sha256: string } | null {
  const enginesDir = getAppEnginesDir();
  if (!fs.existsSync(enginesDir) || !fs.statSync(enginesDir).isDirectory()) return null;

  const candidateDirs: Array<{ dir: string; ver: string | null }> = [];
  let activeId: string | null = null;
  try {
    const selRaw = fs.readFileSync(path.join(enginesDir, "selection.json"), "utf8");
    const sel = JSON.parse(selRaw);
    if (sel && typeof sel.active === "string" && sel.active.trim()) {
      activeId = sel.active.trim();
    }
  } catch {
    // ignore
  }

  if (requestedVersion) {
    candidateDirs.push({ dir: path.join(enginesDir, "versions", requestedVersion), ver: requestedVersion });
  }
  if (activeId && activeId !== "legacy") {
    candidateDirs.push({ dir: path.join(enginesDir, "versions", activeId), ver: activeId });
  }

  const versionsDir = path.join(enginesDir, "versions");
  if (fs.existsSync(versionsDir) && fs.statSync(versionsDir).isDirectory()) {
    const entries = fs
      .readdirSync(versionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && VERSION_PARTS_RE.test(d.name))
      .map((d) => d.name)
      .sort((a, b) => (versionNewer(a, b) ? -1 : versionNewer(b, a) ? 1 : 0));
    for (const name of entries) {
      candidateDirs.push({ dir: path.join(versionsDir, name), ver: name });
    }
  }
  candidateDirs.push({ dir: enginesDir, ver: null });

  const seen = new Set<string>();
  for (const { dir, ver } of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const candidate of binaryCandidatesInDir(dir, plat.system)) {
      if (seen.has(candidate) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
        continue;
      }
      seen.add(candidate);
      const verified = verifyBinary(candidate, plat, { receiptDir: dir, fallbackVersion: ver });
      if (!versionMatches(verified.version, requestedVersion)) {
        continue;
      }
      return { binPath: candidate, ...verified };
    }
  }
  return null;
}

async function withInstallerLock<T>(action: () => Promise<T>): Promise<T> {
  fs.mkdirSync(getCacheDir(), { recursive: true });
  // This inode must survive clearCache(), including while other processes wait.
  const lockPath = path.join(getCacheDir(), ".install.lock");
  const deadline = Date.now() + INSTALL_LOCK_TIMEOUT_MS;
  let lock: ReturnType<typeof acquireFileLock>;
  for (;;) {
    try {
      lock = acquireFileLock(lockPath);
      break;
    } catch (err) {
      if (!(err instanceof FileLockBusyError)) throw err;
      if (Date.now() >= deadline) throw new DownloadFailedError("Timed out waiting for the engine installer lock.", { cause: err });
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
  }
  try { return await action(); } finally { lock.release(); }
}

function writeMarker(markerPath: string, contents: string): void {
  const tempPath = markerPath + ".partial-" + randomUUID();
  try {
    fs.writeFileSync(tempPath, contents, "utf8");
    fs.renameSync(tempPath, markerPath);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

function latestMarkerPath(channel: string, plat: PlatformInfo, github = false): string {
  return path.join(getManagedEnginesDir(), `.latest_${github ? "github_" : ""}${channel}_${plat.cdnName}`);
}

function serialMarkerPath(channel: string): string {
  return path.join(getManagedEnginesDir(), `.serial_${channel}`);
}

function lastUpdateCheckPath(channel: string, plat: PlatformInfo, github = getDownloadBaseUrl() === DEFAULT_DOWNLOAD_URL): string {
  return path.join(getManagedEnginesDir(), `.last_check_${github ? "github_" : ""}${channel}_${plat.cdnName}`);
}

function resolveCacheBinary(
  plat: PlatformInfo,
  requestedVersion: string | null,
  channel: string,
): { binPath: string; hintVer: string; receiptDir: string } | null {
  const enginesDir = getManagedEnginesDir();
  if (!fs.existsSync(enginesDir) || !fs.statSync(enginesDir).isDirectory()) return null;

  const candidateDirs: Array<{ dir: string; ver: string }> = [];
  if (requestedVersion) {
    candidateDirs.push({ dir: path.join(enginesDir, requestedVersion), ver: requestedVersion });
  } else {
    const baseUrl = getDownloadBaseUrl();
    for (const github of baseUrl === null ? [true, false] : [baseUrl === DEFAULT_DOWNLOAD_URL]) {
      try {
        const raw = fs.readFileSync(latestMarkerPath(channel, plat, github));
        let latest: ReleaseEntry;
        if (github) {
          const saved = JSON.parse(raw.toString("utf8"));
          if (saved.source !== DEFAULT_DOWNLOAD_URL || saved.channel !== channel || typeof saved.envelope !== "string") continue;
          latest = parseGitHubRelease(Buffer.from(saved.envelope), saved.release, { plat, requestedVersion: null, channel });
        } else {
          latest = parseReleaseEntry(raw, { baseUrl: baseUrl ?? "https://offline.invalid", plat, requestedVersion: null, channel });
        }
        candidateDirs.push({ dir: path.join(enginesDir, latest.version), ver: latest.version });
      } catch {
        // Invalid provenance must not select an unpinned cached engine.
      }
    }
  }

  const subdirs = requestedVersion ? fs
    .readdirSync(enginesDir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        !d.name.startsWith(".") &&
        !d.name.includes(".partial-") &&
        !d.name.includes(".stale-") &&
        VERSION_PARTS_RE.test(d.name) &&
        versionMatches(d.name, requestedVersion),
    )
    .map((d) => d.name)
    .sort((a, b) => (versionNewer(a, b) ? -1 : versionNewer(b, a) ? 1 : 0)) : [];

  for (const sub of subdirs) {
    candidateDirs.push({ dir: path.join(enginesDir, sub), ver: sub });
  }

  const seen = new Set<string>();
  for (const { dir, ver } of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const candidate of binaryCandidatesInDir(dir, plat.system)) {
      if (seen.has(candidate) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
        continue;
      }
      seen.add(candidate);
      return { binPath: candidate, hintVer: ver, receiptDir: dir };
    }
  }
  return null;
}

function resolveLocalBinary(params: {
  binaryPath?: string;
  requestedVersion: string | null;
  channel: string;
  plat: PlatformInfo;
}): ResolvedBinary {
  if (params.binaryPath !== undefined) {
    const trimmed = params.binaryPath.trim();
    if (!trimmed) {
      throw new BinaryNotFoundError("Explicit binaryPath cannot be empty.");
    }
    const resolvedPath = path.resolve(expandTilde(trimmed));
    const { version, sha256 } = verifyBinary(resolvedPath, params.plat, {
      receiptDir: explicitBinaryReceiptDir(resolvedPath, params.plat),
    });
    checkRequestedVersion(version, params.requestedVersion, resolvedPath);
    return {
      version,
      platform: params.plat.sdkName,
      path: resolvedPath,
      installed: true,
      source: "argument",
      sha256,
    };
  }

  const envPath = getBinaryPathOverride();
  if (envPath !== null) {
    const { version, sha256 } = verifyBinary(envPath, params.plat, {
      receiptDir: explicitBinaryReceiptDir(envPath, params.plat),
    });
    checkRequestedVersion(version, params.requestedVersion, envPath);
    return {
      version,
      platform: params.plat.sdkName,
      path: envPath,
      installed: true,
      source: "env",
      sha256,
    };
  }

  const appMatch = resolveAppBinary(params.plat, params.requestedVersion);
  if (appMatch) {
    const { version, sha256 } = appMatch;
    return {
      version,
      platform: params.plat.sdkName,
      path: appMatch.binPath,
      installed: true,
      source: "app",
      sha256,
    };
  }

  const cacheMatch = resolveCacheBinary(params.plat, params.requestedVersion, params.channel);
  if (cacheMatch) {
    const { version, sha256 } = verifyBinary(cacheMatch.binPath, params.plat, {
      receiptDir: cacheMatch.receiptDir,
      fallbackVersion: cacheMatch.hintVer,
    });
    checkRequestedVersion(version, cacheMatch.hintVer, cacheMatch.binPath);
    checkRequestedVersion(version, params.requestedVersion, cacheMatch.binPath);
    return {
      version,
      platform: params.plat.sdkName,
      path: cacheMatch.binPath,
      installed: true,
      source: "cache",
      sha256,
    };
  }

  return {
    version: params.requestedVersion ?? DEFAULT_ENGINE_VERSION,
    platform: params.plat.sdkName,
    path: null,
    installed: false,
    source: "none",
    sha256: null,
  };
}

function validateDownloadUrl(urlStr: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    throw new DownloadFailedError(`Invalid download URL: '${urlStr}'.`, { cause: err });
  }
  if (parsed.protocol === "https:") return;
  if (parsed.protocol === "http:" && isLoopbackHost(parsed.hostname)) return;
  throw new DownloadFailedError(`Refusing insecure non-HTTPS download URL: '${urlStr}'.`);
}

export function verifySignedEnvelope(rawBytes: Buffer, expectedType: string): Record<string, any> {
  let outer: any;
  try {
    outer = JSON.parse(rawBytes.toString("utf8"));
  } catch (err) {
    throw new ChecksumMismatchError("Signed release manifest is not valid JSON.", { cause: err });
  }
  if (!outer || typeof outer.signed !== "string" || typeof outer.sig !== "string") {
    throw new ChecksumMismatchError("Release manifest is missing Ed25519 'signed'/'sig' envelope.");
  }

  const sigBytes = Buffer.from(outer.sig, "base64");
  if (sigBytes.length !== 64) {
    throw new ChecksumMismatchError("Invalid Ed25519 signature length in release manifest.");
  }

  const msgBytes = Buffer.from(outer.signed, "utf8");
  let verified = false;
  for (const pubB64 of BINARY_SIGNING_PUBKEYS) {
    const rawPub = Buffer.from(pubB64, "base64");
    if (rawPub.length !== 32) continue;
    const pubKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawPub]),
      format: "der",
      type: "spki",
    });
    if (cryptoVerify(null, msgBytes, pubKey, sigBytes)) {
      verified = true;
      break;
    }
  }
  if (!verified) {
    throw new ChecksumMismatchError("Ed25519 signature verification failed for release manifest.");
  }

  let inner: any;
  try {
    inner = JSON.parse(outer.signed);
  } catch (err) {
    throw new ChecksumMismatchError("Signed manifest payload is not valid JSON.", { cause: err });
  }
  if (!inner || typeof inner !== "object" || Array.isArray(inner) ||
      (inner.schema !== undefined && inner.schema !== 1) ||
      (inner.type !== undefined && inner.type !== expectedType)) {
    throw new ChecksumMismatchError(
      `Unexpected manifest schema/type: schema=${String(inner?.schema)}, type=${String(inner?.type)}.`,
    );
  }
  return inner;
}

async function fetchResponse(urlStr: string, signal: AbortSignal): Promise<Response> {
  for (let redirects = 0; redirects <= 5; redirects++) {
    validateDownloadUrl(urlStr);
    const response = await fetch(urlStr, { redirect: "manual", signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new DownloadFailedError("Download redirect has no Location header.");
      urlStr = new URL(location, urlStr).href;
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new DownloadFailedError(`HTTP ${response.status} while downloading ${urlStr}`);
    }
    if (!response.body) throw new DownloadFailedError(`Empty response while downloading ${urlStr}`);
    return response;
  }
  throw new DownloadFailedError("Too many download redirects.");
}

async function fetchBytes(urlStr: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const signal = controller.signal;
  try {
    const response = await fetchResponse(urlStr, signal);
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of Readable.fromWeb(response.body!)) {
      size += chunk.length;
      if (size > 1024 * 1024) throw new DownloadFailedError("Release metadata exceeds the 1 MiB limit.");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    controller.abort();
    if (err instanceof DownloadFailedError) throw err;
    throw new DownloadFailedError(`Failed to download ${urlStr}: ${String(err)}`, { cause: err });
  } finally {
    clearTimeout(timeout);
  }
}

export interface ReleaseEntry {
  version: string;
  archiveUrl: string;
  sha256: string;
  size: number;
  channel?: { name: string; serial: number; envelope: string };
  github?: { name: string; envelope: string; release: Record<string, any> };
}

export async function resolveReleaseEntry(params: {
  baseUrl: string;
  plat: PlatformInfo;
  requestedVersion: string | null;
  channel: string;
}): Promise<ReleaseEntry> {
  return withInstallerLock(() => fetchReleaseEntry(params));
}

async function fetchReleaseEntry(params: {
  baseUrl: string;
  plat: PlatformInfo;
  requestedVersion: string | null;
  channel: string;
}): Promise<ReleaseEntry> {
  const { baseUrl, plat, requestedVersion, channel } = params;
  if (baseUrl === DEFAULT_DOWNLOAD_URL) {
    let release: any;
    if (requestedVersion?.includes("-")) {
      release = await fetchGitHubJson(`${baseUrl}/tags/v${requestedVersion}`);
    } else {
      for (let page = 1; ; page++) {
        const releases = await fetchGitHubJson(`${baseUrl}?per_page=100&page=${page}`);
        if (!Array.isArray(releases)) throw new DownloadFailedError("GitHub releases response must be an array.");
        release = releases.find((item) => item && item.draft === false &&
          item.prerelease === (channel === "beta") && typeof item.tag_name === "string" &&
          GITHUB_TAG_RE.test(item.tag_name) && versionMatches(item.tag_name.slice(1), requestedVersion));
        if (release) break;
        if (releases.length < 100) throw new BinaryNotFoundError(`GitHub Releases has no published ${channel} browser release.`);
      }
    }
    const version = githubReleaseVersion(release, requestedVersion, channel);
    const manifestUrl = githubAssetUrl(release, version, "release.json");
    return parseGitHubRelease(await fetchBytes(manifestUrl), release, params);
  }
  const isRelease = requestedVersion !== null && requestedVersion.includes("-");
  const manifestUrl = isRelease
    ? `${baseUrl}/engine/releases/${requestedVersion}/release.json`
    : `${baseUrl}/engine/channels/${channel}.json`;
  const raw = await fetchBytes(manifestUrl);
  const entry = parseReleaseEntry(raw, params);
  if (entry.channel) {
    try {
      const prevRaw = fs.readFileSync(serialMarkerPath(channel), "utf8").trim();
      const prevSerial = prevRaw ? Number(prevRaw) : null;
      if (prevSerial !== null && Number.isSafeInteger(prevSerial) && entry.channel.serial < prevSerial) {
        throw new ChecksumMismatchError(
          `Channel manifest rollback detected: serial ${entry.channel.serial} < ${prevSerial}.`,
        );
      }
    } catch (err) {
      if (err instanceof ChecksumMismatchError) throw err;
    }
    fs.mkdirSync(getManagedEnginesDir(), { recursive: true });
    writeMarker(serialMarkerPath(channel), `${entry.channel.serial}\n`);
  }
  return entry;
}

async function fetchGitHubJson(url: string): Promise<any> {
  const raw = await fetchBytes(url);
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch (err) {
    throw new DownloadFailedError("GitHub releases response is not valid JSON.", { cause: err });
  }
}

function githubReleaseVersion(release: any, requestedVersion: string | null, channel: string): string {
  const match = typeof release?.tag_name === "string" ? GITHUB_TAG_RE.exec(release.tag_name) : null;
  if (!match || release.draft !== false || typeof release.prerelease !== "boolean" ||
      !versionMatches(match[1], requestedVersion) ||
      (!requestedVersion?.includes("-") && release.prerelease !== (channel === "beta"))) {
    throw new ChecksumMismatchError("GitHub release has an invalid browser tag, draft, or channel identity.");
  }
  return match[1];
}

function githubAssetUrl(release: any, version: string, filename: string, size?: number): string {
  const matches = Array.isArray(release.assets) ? release.assets.filter((asset: any) => asset?.name === filename) : [];
  const url = `${GITHUB_DOWNLOAD_URL}/v${version}/${filename}`;
  if (matches.length !== 1 || matches[0].browser_download_url !== url ||
      (size !== undefined && matches[0].size !== size)) {
    throw new ChecksumMismatchError(`GitHub release has invalid or missing '${filename}' asset metadata.`);
  }
  return url;
}

function parseGitHubRelease(raw: Buffer, release: any, params: {
  plat: PlatformInfo;
  requestedVersion: string | null;
  channel: string;
}): ReleaseEntry {
  const version = githubReleaseVersion(release, params.requestedVersion, params.channel);
  githubAssetUrl(release, version, "release.json");
  const entry = parseReleaseEntry(raw, { ...params, baseUrl: DEFAULT_DOWNLOAD_URL, requestedVersion: version });
  githubAssetUrl(release, version, path.posix.basename(entry.archiveUrl), entry.size);
  if (params.requestedVersion === null) {
    entry.github = { name: params.channel, envelope: raw.toString("utf8"), release };
  }
  return entry;
}

function parseReleaseEntry(raw: Buffer, params: {
  baseUrl: string;
  plat: PlatformInfo;
  requestedVersion: string | null;
  channel: string;
}): ReleaseEntry {
  const { baseUrl, plat, requestedVersion, channel } = params;
  const github = baseUrl === DEFAULT_DOWNLOAD_URL;
  const isRelease = github || (requestedVersion !== null && requestedVersion.includes("-"));
  const inner = verifySignedEnvelope(raw, isRelease ? "release" : "channel");

  if (!isRelease && (inner.channel !== channel || !Number.isSafeInteger(inner.serial) || inner.serial < 0)) {
    throw new ChecksumMismatchError("Channel manifest has an invalid channel identity or serial.");
  }
  if (!inner.platforms || typeof inner.platforms !== "object" || Array.isArray(inner.platforms)) {
    throw new ChecksumMismatchError("Manifest has invalid platforms metadata.");
  }
  const entry = inner.platforms[plat.cdnName];
  if (!entry) {
    throw new UnsupportedPlatformError(`Manifest does not publish an artifact for ${plat.sdkName}.`);
  }
  const version = isRelease ? inner.version : entry.version;
  if (typeof version !== "string" || !VERSION_PARTS_RE.test(version)) {
    throw new ChecksumMismatchError("Manifest has an invalid engine version.");
  }
  if (isRelease && version !== requestedVersion) {
    throw new ChecksumMismatchError("Release manifest version does not match the requested version.");
  }
  if (!isRelease && requestedVersion && !versionMatches(version, requestedVersion)) {
    throw new BinaryNotFoundError(
      `Requested version '${requestedVersion}' is not on channel '${channel}' (current: '${version}').`,
    );
  }
  checkEngineCompatibility(version);
  const filename = `ombra-engine-${version}-${plat.cdnName}${plat.archiveExt}`;
  const artifactPath = `/engine/releases/${version}/${filename}`;
  if ((isRelease ? entry.file !== filename : entry.path !== artifactPath) ||
      typeof entry.sha256 !== "string" || !SHA256_RE.test(entry.sha256) ||
      !Number.isSafeInteger(entry.size) || entry.size <= 0) {
    throw new ChecksumMismatchError("Manifest has invalid artifact path, SHA-256, or size.");
  }
  const archiveUrl = github ? `${GITHUB_DOWNLOAD_URL}/v${version}/${filename}` : `${baseUrl}${artifactPath}`;
  validateDownloadUrl(archiveUrl);

  return {
    version, archiveUrl, sha256: entry.sha256, size: entry.size,
    ...(!isRelease ? { channel: { name: channel, serial: inner.serial, envelope: raw.toString("utf8") } } : {}),
  };
}

async function downloadArchive(entry: ReleaseEntry, archivePath: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600_000);
  const signal = controller.signal;
  const hash = createHash("sha256");
  let size = 0;
  try {
    const response = await fetchResponse(entry.archiveUrl, signal);
    const verifyChunks = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        size += chunk.length;
        if (size > entry.size) {
          callback(new ChecksumMismatchError(`Downloaded archive exceeds signed size ${entry.size}.`));
          return;
        }
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body!), verifyChunks, fs.createWriteStream(archivePath, { flags: "wx" }), { signal });
    if (size !== entry.size) {
      throw new ChecksumMismatchError(`Downloaded archive size mismatch: expected ${entry.size}, got ${size}.`);
    }
    const actualSha = hash.digest("hex");
    if (skipChecksumEnabled()) {
      logger.warn("OMBRA_SKIP_CHECKSUM=1 is active: skipping archive SHA-256 verification (development only).");
    } else if (actualSha !== entry.sha256) {
      throw new ChecksumMismatchError(`Downloaded archive SHA-256 mismatch: expected ${entry.sha256}, got ${actualSha}.`);
    }
  } catch (err) {
    controller.abort();
    fs.rmSync(archivePath, { force: true });
    if (err instanceof ChecksumMismatchError || err instanceof DownloadFailedError) throw err;
    throw new DownloadFailedError(`Failed to download engine archive: ${String(err)}`, { cause: err });
  } finally {
    clearTimeout(timeout);
  }
}

function flattenSingleSubdir(stagingDir: string): void {
  const entries = fs.readdirSync(stagingDir, { withFileTypes: true });
  if (entries.length === 1 && entries[0].isDirectory() && !entries[0].name.endsWith(".app")) {
    const sub = path.join(stagingDir, entries[0].name);
    for (const child of fs.readdirSync(sub)) {
      fs.renameSync(path.join(sub, child), path.join(stagingDir, child));
    }
    fs.rmdirSync(sub);
  }
}

function verifiedCachedVersion(version: string, plat: PlatformInfo): ResolvedBinary | null {
  const dir = path.join(getManagedEnginesDir(), version);
  for (const binPath of binaryCandidatesInDir(dir, plat.system)) {
    if (!fs.existsSync(binPath)) continue;
    try {
      const verified = verifyBinary(binPath, plat, { receiptDir: dir, fallbackVersion: version });
      checkRequestedVersion(verified.version, version, binPath);
      return { ...verified, platform: plat.sdkName, path: binPath, installed: true, source: "cache" };
    } catch (err) {
      if (!(err instanceof BinaryNotFoundError || err instanceof ChecksumMismatchError ||
            err instanceof UnsupportedEngineError || err instanceof UnsupportedPlatformError)) throw err;
    }
  }
  return null;
}

function adoptChannel(entry: ReleaseEntry, plat: PlatformInfo): void {
  if (entry.github) {
    writeMarker(latestMarkerPath(entry.github.name, plat, true), JSON.stringify({
      source: DEFAULT_DOWNLOAD_URL, channel: entry.github.name,
      release: entry.github.release, envelope: entry.github.envelope,
    }));
    writeMarker(lastUpdateCheckPath(entry.github.name, plat, true), String(Date.now()) + "\n");
    return;
  }
  if (!entry.channel) return;
  writeMarker(latestMarkerPath(entry.channel.name, plat), entry.channel.envelope);
  writeMarker(lastUpdateCheckPath(entry.channel.name, plat), String(Date.now()) + "\n");
}

async function installArchive(params: {
  archivePath: string;
  version: string;
  archiveSha256: string;
  plat: PlatformInfo;
}): Promise<string> {
  const enginesDir = getManagedEnginesDir();
  fs.mkdirSync(enginesDir, { recursive: true });
  const cached = verifiedCachedVersion(params.version, params.plat);
  if (cached?.path) return cached.path;
  const destDir = path.join(enginesDir, params.version);
  const stagingDir = path.join(enginesDir, `${params.version}.partial-${randomUUID()}`);
  fs.mkdirSync(stagingDir, { recursive: true });
  let backup: string | null = null;

  try {
    if (params.archivePath.endsWith(".zip")) {
      safeExtractZip(params.archivePath, stagingDir);
    } else if (params.archivePath.endsWith(".tar.xz")) {
      await safeExtractTarXz(params.archivePath, stagingDir);
    } else {
      await safeExtractTarGz(params.archivePath, stagingDir);
    }
    flattenSingleSubdir(stagingDir);

    const stagedBin = binaryCandidatesInDir(stagingDir, params.plat.system).find(
      (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
    );
    if (!stagedBin) {
      throw new DownloadFailedError(
        `Extracted archive for ${params.version} did not contain expected binary.`,
      );
    }

    if (params.plat.system !== "Windows") {
      const mode = fs.statSync(stagedBin).mode;
      fs.chmodSync(stagedBin, mode | 0o755);
    }
    if (params.plat.system === "Darwin") {
      try {
        execFileSync("xattr", ["-cr", stagingDir], { stdio: "ignore", timeout: 15_000 });
      } catch {
        // ignore if xattr unavailable
      }
    }

    const binSha = computeSha256(stagedBin);
    fs.writeFileSync(path.join(stagingDir, "archive.sha256"), `${params.archiveSha256}\n`, "utf8");
    fs.writeFileSync(path.join(stagingDir, "binary.sha256"), `${binSha}\n`, "utf8");

    const verified = verifyBinary(stagedBin, params.plat, { receiptDir: stagingDir, fallbackVersion: params.version });
    checkRequestedVersion(verified.version, params.version, stagedBin);
    if (fs.existsSync(destDir)) {
      backup = path.join(enginesDir, `${params.version}.stale-${randomUUID()}`);
      fs.renameSync(destDir, backup);
    }
    try {
      fs.renameSync(stagingDir, destDir);
    } catch (err) {
      if (backup) fs.renameSync(backup, destDir);
      throw err;
    }
    if (backup) fs.rmSync(backup, { recursive: true, force: true });
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  const finalBin = binaryCandidatesInDir(destDir, params.plat.system).find(
    (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
  );
  if (!finalBin) {
    throw new DownloadFailedError(`Installed binary missing under ${destDir}.`);
  }
  return finalBin;
}

export const _sleepHook = {
  sleep: (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms)),
};

async function downloadWithRetries(params: {
  baseUrl: string;
  plat: PlatformInfo;
  requestedVersion: string | null;
  channel: string;
}, selected?: ReleaseEntry): Promise<ResolvedBinary> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= DOWNLOAD_RETRIES; attempt++) {
    let tmpDir: string | null = null;
    try {
      const entry = selected ?? await fetchReleaseEntry(params);
      const cached = verifiedCachedVersion(entry.version, params.plat);
      if (cached) {
        adoptChannel(entry, params.plat);
        return cached;
      }
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ombra-dl-"));
      const archiveFile = path.join(tmpDir, `engine${params.plat.archiveExt}`);

      await downloadArchive(entry, archiveFile);

      const binPath = await installArchive({
        archivePath: archiveFile,
        version: entry.version,
        archiveSha256: entry.sha256,
        plat: params.plat,
      });
      const verified = verifyBinary(binPath, params.plat, {
        receiptDir: path.join(getManagedEnginesDir(), entry.version),
        fallbackVersion: entry.version,
      });
      adoptChannel(entry, params.plat);

      return {
        version: entry.version,
        platform: params.plat.sdkName,
        path: binPath,
        installed: true,
        source: "download",
        sha256: verified.sha256,
      };
    } catch (err) {
      if (
        err instanceof ChecksumMismatchError ||
        err instanceof UnsupportedPlatformError ||
        err instanceof UnsupportedEngineError ||
        err instanceof BinaryNotFoundError
      ) {
        throw err;
      }
      lastErr = err;
      if (attempt < DOWNLOAD_RETRIES) {
        await _sleepHook.sleep(500 * 2 ** attempt);
        continue;
      }
      if (err instanceof DownloadFailedError) throw err;
      throw new DownloadFailedError(`Failed to download Ombra engine: ${String(err)}`, {
        cause: err,
      });
    } finally {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  }
  throw new DownloadFailedError(`Failed to download Ombra engine: ${String(lastErr)}`);
}

function shouldCheckAutoUpdate(channel: string, plat: PlatformInfo): boolean {
  if (!getAutoUpdate()) return false;
  try {
    const ts = Number.parseFloat(fs.readFileSync(lastUpdateCheckPath(channel, plat), "utf8").trim());
    return !Number.isFinite(ts) || Date.now() - ts >= UPDATE_CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

export async function resolveBinary(
  opts: {
    binaryPath?: string;
    version?: string;
    download?: boolean;
    releaseChannel?: string;
    forceUpdateCheck?: boolean;
  } = {},
): Promise<ResolvedBinary> {
  const plat = getPlatformInfo();
  const requestedVersion = normalizeRequestedVersion(opts.version);
  const channel = getReleaseChannel(opts.releaseChannel);
  const download = opts.download ?? true;

  let local = resolveLocalBinary({
    binaryPath: opts.binaryPath,
    requestedVersion,
    channel,
    plat,
  });

  if (local.source === "argument" || local.source === "env" || local.source === "app") {
    return local;
  }

  const baseUrl = getDownloadBaseUrl();
  const resolveManaged = async (): Promise<ResolvedBinary> => {
    local = resolveLocalBinary({ binaryPath: opts.binaryPath, requestedVersion, channel, plat });
    if (
      local.installed &&
      local.source === "cache" &&
      download &&
      baseUrl !== null &&
      requestedVersion === null &&
      (opts.forceUpdateCheck || shouldCheckAutoUpdate(channel, plat))
    ) {
      try {
        const latest = await fetchReleaseEntry({
          baseUrl,
          plat,
          requestedVersion: null,
          channel,
        });
        writeMarker(lastUpdateCheckPath(channel, plat), `${Date.now()}\n`);
        if (versionNewer(latest.version, local.version)) {
          return await downloadWithRetries({
            baseUrl,
            plat,
            requestedVersion: null,
            channel,
          }, latest);
        }
        if (latest.version === local.version) adoptChannel(latest, plat);
      } catch (err) {
        if (err instanceof ChecksumMismatchError || err instanceof UnsupportedEngineError) {
          throw err;
        }
        logger.warn(`Engine auto-update check failed; using cached ${local.version}: ${String(err)}`);
      }
    }

    if (local.installed) return local;

    if (!download) {
      throw new BinaryNotFoundError(
        "Ombra engine binary not found and automatic download is disabled. Run ensureBinary() or set OMBRA_BINARY_PATH / binaryPath.",
        { details: { platform: plat.sdkName, version: requestedVersion ?? DEFAULT_ENGINE_VERSION } },
      );
    }
    if (baseUrl === null) {
      throw new BinaryNotFoundError(
        "Ombra engine binary not found and OMBRA_DOWNLOAD_URL is disabled. Run ensureBinary() with a download URL or set OMBRA_BINARY_PATH.",
        { details: { platform: plat.sdkName } },
      );
    }

    return downloadWithRetries({
      baseUrl,
      plat,
      requestedVersion,
      channel,
    });
  };
  return download && baseUrl !== null ? withInstallerLock(resolveManaged) : resolveManaged();
}

export async function ensureBinary(
  opts: { binaryPath?: string; version?: string; releaseChannel?: string } = {},
): Promise<string> {
  const resolved = await resolveBinary({
    binaryPath: opts.binaryPath,
    version: opts.version,
    download: true,
    releaseChannel: opts.releaseChannel,
  });
  if (!resolved.installed || !resolved.path) {
    throw new BinaryNotFoundError("Could not resolve or download Ombra engine binary.");
  }
  return resolved.path;
}

export async function binaryInfo(
  opts: { binaryPath?: string; version?: string; releaseChannel?: string } = {},
): Promise<BinaryInfo> {
  const plat = getPlatformInfo();
  const requestedVersion = normalizeRequestedVersion(opts.version);
  const channel = getReleaseChannel(opts.releaseChannel);
  try {
    const resolved = resolveLocalBinary({
      binaryPath: opts.binaryPath,
      requestedVersion,
      channel,
      plat,
    });
    return toBinaryInfo(resolved);
  } catch (err) {
    if (
      err instanceof UnsupportedEngineError &&
      err.details.requestedVersion !== undefined &&
      (opts.binaryPath !== undefined || getBinaryPathOverride() !== null)
    ) throw err;
    if (
      err instanceof BinaryNotFoundError ||
      err instanceof ChecksumMismatchError ||
      err instanceof UnsupportedEngineError ||
      err instanceof UnsupportedPlatformError
    ) {
      logger.debug(`binaryInfo verification incomplete: ${err.message}`);
      return {
        version: requestedVersion ?? DEFAULT_ENGINE_VERSION,
        platform: plat.sdkName,
        path: null,
        installed: false,
        source: "none",
        sha256: null,
      };
    }
    throw err;
  }
}

export async function clearCache(): Promise<void> {
  return withInstallerLock(async () => {
    const enginesDir = getManagedEnginesDir();
    if (fs.existsSync(enginesDir)) {
      fs.rmSync(enginesDir, { recursive: true, force: true });
      logger.info(`Cleared SDK engine cache at ${enginesDir}`);
    }
    const cacheDir = getCacheDir();
    if (fs.existsSync(cacheDir) && fs.statSync(cacheDir).isDirectory()) {
      for (const entry of fs.readdirSync(cacheDir)) {
        if (entry.startsWith("engines.partial-") || entry.startsWith("engines.stale-")) {
          fs.rmSync(path.join(cacheDir, entry), { recursive: true, force: true });
        }
      }
    }
  });
}
