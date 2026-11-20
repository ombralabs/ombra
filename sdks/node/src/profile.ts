/**
 * Named profiles, `.ombra/profile.json` seed persistence, and cross-process locks
 * (SDK contract v0.1 §7).
 */

import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expandTilde, getProfilesDir, logger } from "./config.js";
import { InvalidOptionError, ProfileBusyError } from "./errors.js";
import { acquireFileLock, FileLockBusyError } from "./file-lock.js";
import type { HumanizePreset, PersonaOS } from "./types.js";

const PROFILE_META_DIR = ".ombra";
const PROFILE_META_FILE = "profile.json";
const PROFILE_LOCK_FILE = "profile.lock";

/**
 * Generate a 53-bit CSPRNG persona seed safe in IEEE-754 double / JSON (`Number.MAX_SAFE_INTEGER`)
 * and 64-bit engine integer parsers.
 */
export function generateSeed(): number {
  while (true) {
    const candidate = Number(randomBytes(8).readBigUInt64BE(0) & 0x001f_ffff_ffff_ffffn);
    if (candidate >= 10_000) {
      return candidate;
    }
  }
}

function rawSlug(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "profile";
}

function metaPath(profileDir: string): string {
  return path.join(profileDir, PROFILE_META_DIR, PROFILE_META_FILE);
}

function lockPath(profileDir: string): string {
  return path.join(profileDir, PROFILE_META_DIR, PROFILE_LOCK_FILE);
}

export interface ProfileMetadata {
  name?: string;
  seed: number;
  os?: PersonaOS;
  timezone?: string;
  locale?: string;
  humanize_preset?: HumanizePreset;
  created_at: string;
  updated_at?: string;
  engine_version?: string;
}

export function readProfileMetadata(profileDir: string): ProfileMetadata | null {
  try {
    const raw = fs.readFileSync(metaPath(profileDir), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ProfileMetadata;
    }
  } catch {
    // Missing or unreadable metadata
  }
  return null;
}

export function writeProfileMetadata(profileDir: string, data: ProfileMetadata): void {
  const target = metaPath(profileDir);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${randomBytes(6).toString("hex")}.tmp`;
  const payload = JSON.stringify(data, null, 2) + "\n";
  try {
    fs.writeFileSync(tmp, payload, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmp, target);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
    throw err;
  }
}

export function resolveNamedProfileDir(name: string): string {
  if (typeof name !== "string" || !name.trim()) {
    throw new InvalidOptionError("profile must be a non-empty string.");
  }
  const profilesRoot = getProfilesDir();
  const baseSlug = rawSlug(name);
  let entries: string[];
  try {
    entries = fs.readdirSync(profilesRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    entries = [];
  }
  // Find the existing identity before reusing a base name vacated by a neighbor.
  for (const entry of entries.sort()) {
    if (entry !== baseSlug && !entry.startsWith(`${baseSlug}-`)) continue;
    const candidate = path.join(profilesRoot, entry);
    if (readProfileMetadata(candidate)?.name === name) return candidate;
  }
  const suffix = createHash("sha256").update(name, "utf8").digest("hex").slice(0, 8);
  for (let attempt = 0; ; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${suffix}${attempt === 1 ? "" : `-${attempt}`}`;
    const candidate = path.join(profilesRoot, slug);
    const existing = readProfileMetadata(candidate);
    if (!existing || existing.name === undefined || existing.name === name) return candidate;
  }
}

export function getProcessStartTime(pid: number): string | null {
  if (process.platform === "linux") {
    try {
      const statText = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      const rparen = statText.lastIndexOf(")");
      if (rparen !== -1) {
        const fields = statText.slice(rparen + 2).trim().split(/\s+/);
        if (fields.length > 19) return fields[19];
      }
    } catch {
      return null;
    }
  }
  if (process.platform !== "win32") {
    try {
      const out = execFileSync("ps", ["-p", String(pid), "-o", "lstart="], {
        encoding: "utf8",
        timeout: 2000,
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      return out || null;
    } catch {
      return null;
    }
  }
  return null;
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err?.code === "EPERM";
  }
}

function isStaleLock(payload: Record<string, unknown>): boolean {
  const pid = payload.pid;
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return true;
  if (!isPidAlive(pid)) return true;
  const recordedStart = payload.process_start_time;
  if (typeof recordedStart === "string" && recordedStart) {
    const currentStart = getProcessStartTime(pid);
    if (currentStart !== null && currentStart !== recordedStart) {
      return true;
    }
  }
  return false;
}

function acquireProfileLock(profileDir: string, name?: string): { release(): void } {
  const lockFile = lockPath(profileDir);
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  const busy = () => new ProfileBusyError(`Profile is locked by another running Ombra instance: ${profileDir}`, {
    details: { profile: name ?? null, path: profileDir },
  });
  let lock: ReturnType<typeof acquireFileLock>;
  try {
    lock = acquireFileLock(lockFile);
  } catch (error) {
    if (error instanceof FileLockBusyError) throw busy();
    throw error;
  }

  let ownsPayload = false;
  try {
    const contents = fs.readFileSync(lock.fd, "utf8");
    let existing: Record<string, unknown> | null = null;
    try { existing = JSON.parse(contents); } catch { /* Empty or stale legacy metadata. */ }
    // Exclusive OS ownership supersedes marked payloads, but not live PID-only legacy owners.
    if (existing && existing.os_lock !== true && !isStaleLock(existing)) throw busy();
    ownsPayload = true;
    const payload = JSON.stringify({
      os_lock: true,
      pid: process.pid,
      started_at: new Date().toISOString(),
      process_start_time: getProcessStartTime(process.pid),
    }) + "\n";
    fs.ftruncateSync(lock.fd, 0);
    fs.writeSync(lock.fd, payload, 0, "utf8");
    fs.fsyncSync(lock.fd);
  } catch (error) {
    try {
      if (ownsPayload) fs.ftruncateSync(lock.fd, 0);
    } finally {
      lock.release();
    }
    throw error;
  }
  return {
    release() {
      try {
        fs.ftruncateSync(lock.fd, 0);
      } catch (error) {
        // Older clients still consult the PID payload, so retry before giving up OS ownership.
        try { fs.ftruncateSync(lock.fd, 0); } catch { /* Preserve the first cleanup error. */ }
        throw error;
      } finally {
        lock.release();
      }
    },
  };
}

export interface ProfileLease {
  readonly path: string;
  readonly name: string | null;
  readonly seed: number;
  readonly ephemeral: boolean;
  readonly osHint?: PersonaOS;
  readonly timezone?: string;
  readonly locale?: string;
  readonly humanizePreset?: HumanizePreset;
  release(): void;
}

export interface AcquireProfileOptions {
  profile?: string;
  userDataDir?: string;
  explicitSeed?: number;
  osHint?: PersonaOS;
  timezone?: string;
  locale?: string;
  humanizePreset?: HumanizePreset;
  engineVersion?: string;
}

export function acquireProfileLease(opts: AcquireProfileOptions = {}): ProfileLease {
  if (opts.profile !== undefined && opts.userDataDir !== undefined) {
    throw new InvalidOptionError("Options 'profile' and 'userDataDir' are mutually exclusive.");
  }

  let profileDir: string;
  let ephemeral = false;
  if (opts.profile !== undefined) {
    profileDir = resolveNamedProfileDir(opts.profile);
    fs.mkdirSync(profileDir, { recursive: true });
  } else if (opts.userDataDir !== undefined) {
    if (typeof opts.userDataDir !== "string" || !opts.userDataDir.trim()) {
      throw new InvalidOptionError("userDataDir must be a non-empty path.");
    }
    profileDir = path.resolve(expandTilde(opts.userDataDir.trim()));
    fs.mkdirSync(profileDir, { recursive: true });
  } else {
    profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "ombra-profile-"));
    ephemeral = true;
  }

  let lock: { release(): void };
  try {
    while (true) {
      lock = acquireProfileLock(profileDir, opts.profile);
      try {
        const owner = readProfileMetadata(profileDir)?.name;
        if (opts.profile === undefined || owner === undefined || owner === opts.profile) break;
      } catch (error) {
        lock.release();
        throw error;
      }
      lock.release();
      profileDir = resolveNamedProfileDir(opts.profile!);
    }
  } catch (err) {
    if (ephemeral) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
    throw err;
  }

  let released = false;
  const releaseLockOnly = (): void => {
    if (released) return;
    released = true;
    try {
      lock.release();
    } finally {
      if (ephemeral) {
        fs.rmSync(profileDir, { recursive: true, force: true });
      }
    }
  };

  try {
    let seed: number;
    let effOs = opts.osHint;
    let effTz = opts.timezone;
    let effLocale = opts.locale;
    let effPreset = opts.humanizePreset;

    if (ephemeral) {
      seed = opts.explicitSeed ?? generateSeed();
    } else {
      const existing = readProfileMetadata(profileDir);
      const nowIso = new Date().toISOString();
      if (existing && typeof existing.seed === "number") {
        if (opts.explicitSeed !== undefined && opts.explicitSeed !== existing.seed) {
          logger.info(
            `Updating persona seed for profile '${opts.profile ?? profileDir}' from ${existing.seed} to ${opts.explicitSeed}`,
          );
          seed = opts.explicitSeed;
        } else {
          seed = existing.seed;
        }
      } else {
        seed = opts.explicitSeed ?? generateSeed();
      }

      effOs = opts.osHint ?? existing?.os;
      effTz = opts.timezone ?? existing?.timezone;
      effLocale = opts.locale ?? existing?.locale;
      effPreset = opts.humanizePreset ?? existing?.humanize_preset;

      const updated: ProfileMetadata = {
        ...(opts.profile ? { name: opts.profile } : existing?.name ? { name: existing.name } : {}),
        seed,
        ...(effOs ? { os: effOs } : {}),
        ...(effTz ? { timezone: effTz } : {}),
        ...(effLocale ? { locale: effLocale } : {}),
        ...(effPreset ? { humanize_preset: effPreset } : {}),
        created_at: existing?.created_at ?? nowIso,
        updated_at: nowIso,
        ...(opts.engineVersion
          ? { engine_version: opts.engineVersion }
          : existing?.engine_version
            ? { engine_version: existing.engine_version }
            : {}),
      };
      writeProfileMetadata(profileDir, updated);
    }

    return {
      path: profileDir,
      name: opts.profile ?? null,
      seed,
      ephemeral,
      osHint: effOs,
      timezone: effTz,
      locale: effLocale,
      humanizePreset: effPreset,
      release: releaseLockOnly,
    };
  } catch (err) {
    releaseLockOnly();
    throw err;
  }
}
