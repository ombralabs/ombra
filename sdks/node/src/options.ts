/**
 * Launch option validation and Ombra engine CLI switch builder
 * (SDK contract v0.1 §4, §6, §9 & spec/schemas/launch-options.schema.json).
 */

import path from "node:path";
import { expandTilde, getTimeoutMs, isLoopbackHost, logger, normalizeRequestedVersion } from "./config.js";
import { InvalidOptionError } from "./errors.js";
import { checkMobileViewportOS } from "./profile.js";
import { parseProxy, type NormalizedProxy } from "./proxy.js";
import type {
  FingerprintOptions,
  HumanizePreset,
  LaunchOptions,
  PersonaOS,
  ScreenSize,
} from "./types.js";

const ALLOWED_TOP_KEYS = new Set([
  "headless",
  "mobileViewport",
  "mobile_viewport",
  "proxy",
  "fingerprint",
  "profile",
  "userDataDir",
  "user_data_dir",
  "args",
  "binaryPath",
  "binary_path",
  "version",
  "timeoutMs",
  "timeout_ms",
  "humanize",
  "licenseKey",
  "license_key",
  "env",
  "download",
]);

const ALLOWED_OS = new Set<PersonaOS>(["macos", "windows", "linux"]);
const ALLOWED_FINGERPRINT_KEYS = new Set([
  "seed",
  "os",
  "osVersion",
  "os_version",
  "timezone",
  "locale",
  "screen",
  "gpu",
  "hardwareConcurrency",
  "hardware_concurrency",
  "deviceMemory",
  "device_memory",
  "noise",
]);
const ALLOWED_HUMANIZE_KEYS = new Set(["preset"]);
const ALLOWED_HUMANIZE_PRESETS = new Set<HumanizePreset>(["default", "careful", "fast"]);
const WARN_USER_ARGS = new Set(["--no-sandbox", "--disable-setuid-sandbox"]);

export interface ValidatedFingerprint {
  seed?: number;
  os?: PersonaOS;
  osVersion?: string;
  timezone?: string;
  locale?: string;
  screen?: { width: number; height: number } | "auto";
  gpu?: { vendor: string; renderer: string } | "auto";
  hardwareConcurrency?: number | "auto";
  deviceMemory?: number | "auto";
  noise?: boolean;
}

export interface ValidatedLaunchOptions {
  headless: boolean;
  mobileViewport?: ScreenSize;
  proxy: NormalizedProxy | null;
  fingerprint: ValidatedFingerprint;
  profile?: string;
  userDataDir?: string;
  args: string[];
  binaryPath?: string;
  version?: string;
  timeoutMs: number;
  humanize?: boolean | { preset: HumanizePreset };
  licenseKey?: string;
  env: Record<string, string>;
  download: boolean;
}

function rejectUnknownKeys(obj: Record<string, unknown>, allowed: Set<string>, scope: string): void {
  const unknown = Object.keys(obj).filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    throw new InvalidOptionError(
      `Unknown ${scope} option(s): ${unknown.sort().join(", ")}.`,
      { details: { scope, unknown: unknown.sort() } },
    );
  }
}

function requireBool(val: unknown, name: string): boolean {
  if (typeof val !== "boolean") {
    throw new InvalidOptionError(`${name} must be a boolean, got ${typeof val}.`);
  }
  return val;
}

function requireInt(
  val: unknown,
  name: string,
  bounds: { min?: number; max?: number } = {},
): number {
  if (typeof val !== "number" || !Number.isInteger(val)) {
    throw new InvalidOptionError(`${name} must be an integer, got ${typeof val}.`);
  }
  if (bounds.min !== undefined && val < bounds.min) {
    throw new InvalidOptionError(`${name} must be >= ${bounds.min}, got ${val}.`);
  }
  if (bounds.max !== undefined && val > bounds.max) {
    throw new InvalidOptionError(`${name} must be <= ${bounds.max}, got ${val}.`);
  }
  return val;
}

function pickDualField<T>(
  raw: Record<string, unknown>,
  camel: string,
  snake: string,
  scope: string,
): T | undefined {
  const hasCamel = camel in raw && raw[camel] !== undefined;
  const hasSnake = snake in raw && raw[snake] !== undefined;
  if (hasCamel && hasSnake) {
    throw new InvalidOptionError(
      `Specify either '${camel}' or '${snake}' in ${scope}, not both.`,
    );
  }
  return (hasCamel ? raw[camel] : raw[snake]) as T | undefined;
}

function validateFingerprint(raw: FingerprintOptions | undefined): ValidatedFingerprint {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new InvalidOptionError(`fingerprint must be an object, got ${typeof raw}.`);
  }
  const obj = raw as Record<string, unknown>;
  rejectUnknownKeys(obj, ALLOWED_FINGERPRINT_KEYS, "fingerprint");

  const out: ValidatedFingerprint = {};
  if (obj.seed !== undefined && obj.seed !== null) {
    out.seed = requireInt(obj.seed, "fingerprint.seed", { min: 0 });
  }
  if (obj.os !== undefined && obj.os !== null) {
    if (typeof obj.os !== "string" || !ALLOWED_OS.has(obj.os as PersonaOS)) {
      throw new InvalidOptionError(
        `fingerprint.os must be 'macos', 'windows', or 'linux', got '${String(obj.os)}'.`,
      );
    }
    out.os = obj.os as PersonaOS;
  }

  const osVer = pickDualField<string>(obj, "osVersion", "os_version", "fingerprint");
  if (osVer !== undefined && osVer !== null) {
    if (typeof osVer !== "string" || !osVer.trim()) {
      throw new InvalidOptionError("fingerprint.osVersion must be a non-empty string.");
    }
    out.osVersion = osVer.trim();
  }

  if (obj.timezone !== undefined && obj.timezone !== null) {
    if (typeof obj.timezone !== "string" || !obj.timezone.trim()) {
      throw new InvalidOptionError("fingerprint.timezone must be an IANA timezone or 'auto'.");
    }
    out.timezone = obj.timezone.trim();
  }

  if (obj.locale !== undefined && obj.locale !== null) {
    if (typeof obj.locale !== "string" || !obj.locale.trim()) {
      throw new InvalidOptionError("fingerprint.locale must be a BCP-47 tag or 'auto'.");
    }
    out.locale = obj.locale.trim();
  }

  if (obj.screen !== undefined && obj.screen !== null) {
    if (obj.screen === "auto") {
      out.screen = "auto";
    } else if (typeof obj.screen === "object" && !Array.isArray(obj.screen)) {
      const scr = obj.screen as Record<string, unknown>;
      rejectUnknownKeys(scr, new Set(["width", "height"]), "fingerprint.screen");
      if (scr.width === undefined || scr.height === undefined) {
        throw new InvalidOptionError("fingerprint.screen requires 'width' and 'height'.");
      }
      out.screen = {
        width: requireInt(scr.width, "fingerprint.screen.width", { min: 320 }),
        height: requireInt(scr.height, "fingerprint.screen.height", { min: 240 }),
      };
    } else {
      throw new InvalidOptionError("fingerprint.screen must be { width, height } or 'auto'.");
    }
  }

  if (obj.gpu !== undefined && obj.gpu !== null) {
    if (obj.gpu === "auto") {
      out.gpu = "auto";
    } else if (typeof obj.gpu === "object" && !Array.isArray(obj.gpu)) {
      const gpu = obj.gpu as Record<string, unknown>;
      rejectUnknownKeys(gpu, new Set(["vendor", "renderer"]), "fingerprint.gpu");
      if (typeof gpu.vendor !== "string" || typeof gpu.renderer !== "string") {
        throw new InvalidOptionError("fingerprint.gpu requires string 'vendor' and 'renderer'.");
      }
      out.gpu = { vendor: gpu.vendor, renderer: gpu.renderer };
    } else {
      throw new InvalidOptionError("fingerprint.gpu must be { vendor, renderer } or 'auto'.");
    }
  }

  const hc = pickDualField<number | "auto">(
    obj,
    "hardwareConcurrency",
    "hardware_concurrency",
    "fingerprint",
  );
  if (hc !== undefined && hc !== null) {
    out.hardwareConcurrency =
      hc === "auto" ? "auto" : requireInt(hc, "fingerprint.hardwareConcurrency", { min: 1 });
  }

  const mem = pickDualField<number | "auto">(obj, "deviceMemory", "device_memory", "fingerprint");
  if (mem !== undefined && mem !== null) {
    out.deviceMemory =
      mem === "auto" ? "auto" : requireInt(mem, "fingerprint.deviceMemory", { min: 1 });
  }

  if (obj.noise !== undefined && obj.noise !== null) {
    out.noise = requireBool(obj.noise, "fingerprint.noise");
  }

  return out;
}

function validateHumanize(raw: unknown): boolean | { preset: HumanizePreset } | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    rejectUnknownKeys(obj, ALLOWED_HUMANIZE_KEYS, "humanize");
    const preset = (obj.preset ?? "default") as string;
    if (typeof preset !== "string" || !ALLOWED_HUMANIZE_PRESETS.has(preset as HumanizePreset)) {
      throw new InvalidOptionError(
        `humanize.preset must be 'default', 'careful', or 'fast', got '${String(preset)}'.`,
      );
    }
    return { preset: preset as HumanizePreset };
  }
  throw new InvalidOptionError(`humanize must be a boolean or object, got ${typeof raw}.`);
}

function validateExtraArgs(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || !raw.every((a) => typeof a === "string")) {
    throw new InvalidOptionError("args must be an array of strings.");
  }
  for (const arg of raw) {
    const eq = arg.indexOf("=");
    const key = eq === -1 ? arg : arg.slice(0, eq);
    const val = eq === -1 ? "" : arg.slice(eq + 1);
    if (key === "--remote-debugging-address" && !isLoopbackHost(val)) {
      throw new InvalidOptionError(
        `CDP debugging port must remain on loopback (SI-08); refusing --remote-debugging-address=${val}.`,
      );
    }
    if (WARN_USER_ARGS.has(key)) {
      logger.warn(
        `Caller explicitly passed ${key} in args; disabling Chromium sandbox reduces isolation.`,
      );
    }
  }
  return [...raw];
}

function validateMobileViewport(raw: unknown): ScreenSize | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new InvalidOptionError("mobileViewport must be an object with width and height.");
  }
  const size = raw as Record<string, unknown>;
  rejectUnknownKeys(size, new Set(["width", "height"]), "mobileViewport");
  return {
    width: requireInt(size.width, "mobileViewport.width", { min: 1, max: 10000 }),
    height: requireInt(size.height, "mobileViewport.height", { min: 1, max: 10000 }),
  };
}

export function validateLaunchOptions(rawOptions: LaunchOptions = {}): ValidatedLaunchOptions {
  if (!rawOptions || typeof rawOptions !== "object" || Array.isArray(rawOptions)) {
    throw new InvalidOptionError("Launch options must be an object.");
  }
  const raw = rawOptions as Record<string, unknown>;
  rejectUnknownKeys(raw, ALLOWED_TOP_KEYS, "launch");

  const headless = raw.headless === undefined ? true : requireBool(raw.headless, "headless");
  const download = raw.download === undefined ? true : requireBool(raw.download, "download");
  if (raw.version !== undefined && typeof raw.version !== "string") {
    throw new InvalidOptionError("version must be a string.");
  }
  const version = raw.version === undefined ? undefined : normalizeRequestedVersion(raw.version as string) ?? "latest";

  const userDataDirRaw = pickDualField<string>(raw, "userDataDir", "user_data_dir", "launch");
  if (raw.profile !== undefined && userDataDirRaw !== undefined) {
    throw new InvalidOptionError("Options 'profile' and 'userDataDir' are mutually exclusive.");
  }

  let profile: string | undefined;
  if (raw.profile !== undefined && raw.profile !== null) {
    if (typeof raw.profile !== "string" || !raw.profile.trim()) {
      throw new InvalidOptionError("profile must be a non-empty string.");
    }
    profile = raw.profile;
  }

  let userDataDir: string | undefined;
  if (userDataDirRaw !== undefined && userDataDirRaw !== null) {
    if (typeof userDataDirRaw !== "string" || !userDataDirRaw.trim()) {
      throw new InvalidOptionError("userDataDir must be a non-empty string.");
    }
    userDataDir = path.resolve(expandTilde(userDataDirRaw.trim()));
  }

  const binaryPathRaw = pickDualField<string>(raw, "binaryPath", "binary_path", "launch");
  let binaryPath: string | undefined;
  if (binaryPathRaw !== undefined && binaryPathRaw !== null) {
    if (typeof binaryPathRaw !== "string" || !binaryPathRaw.trim()) {
      throw new InvalidOptionError("binaryPath must be a non-empty string.");
    }
    binaryPath = path.resolve(expandTilde(binaryPathRaw.trim()));
  }

  const licenseKeyRaw = pickDualField<string>(raw, "licenseKey", "license_key", "launch");
  let licenseKey: string | undefined;
  if (licenseKeyRaw !== undefined && licenseKeyRaw !== null) {
    if (typeof licenseKeyRaw !== "string" || !licenseKeyRaw.trim()) {
      throw new InvalidOptionError("licenseKey must be a non-empty string.");
    }
    licenseKey = licenseKeyRaw.trim();
  }

  let env: Record<string, string> = {};
  if (raw.env !== undefined && raw.env !== null) {
    if (typeof raw.env !== "object" || Array.isArray(raw.env)) {
      throw new InvalidOptionError("env must be a string-to-string object.");
    }
    const envObj = raw.env as Record<string, unknown>;
    for (const [k, v] of Object.entries(envObj)) {
      if (typeof v !== "string") {
        throw new InvalidOptionError(`env.${k} must be a string.`);
      }
      env[k] = v;
    }
  }

  const timeoutRaw = pickDualField<number>(raw, "timeoutMs", "timeout_ms", "launch");
  const timeoutMs = getTimeoutMs(timeoutRaw);

  const proxy = parseProxy(raw.proxy as LaunchOptions["proxy"]);
  const fingerprint = validateFingerprint(raw.fingerprint as FingerprintOptions | undefined);
  const mobileViewport = validateMobileViewport(pickDualField(raw, "mobileViewport", "mobile_viewport", "launch"));
  if (mobileViewport) {
    checkMobileViewportOS(fingerprint.os, userDataDir, profile);
  }
  return {
    headless,
    ...(mobileViewport ? { mobileViewport } : {}),
    proxy,
    fingerprint,
    profile,
    userDataDir,
    args: validateExtraArgs(raw.args),
    binaryPath,
    version,
    timeoutMs,
    humanize: validateHumanize(raw.humanize),
    licenseKey,
    env,
    download,
  };
}

export interface BuildEngineArgsParams {
  options: ValidatedLaunchOptions;
  profileDir: string;
  seed: number;
  proxyArgs: string[];
  engineVersion?: string;
  resolvedOs?: PersonaOS;
  resolvedTimezone?: string;
  resolvedLocale?: string;
  resolvedHumanizePreset?: HumanizePreset;
}

export function buildEngineArgs(params: BuildEngineArgsParams): string[] {
  const { options, profileDir, seed, proxyArgs } = params;
  const cmdArgs: string[] = [
    `--user-data-dir=${profileDir}`,
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
  ];

  if (process.platform === "darwin") {
    cmdArgs.push("--use-mock-keychain");
  }
  if (!options.args.some((a) => a.startsWith("--window-position"))) {
    cmdArgs.push("--window-position=0,0");
  }
  if (options.headless) {
    cmdArgs.push("--headless=new");
  }
  if (options.mobileViewport) {
    const { width, height } = options.mobileViewport;
    cmdArgs.push(`--mobile-layout-viewport=${width},${height}`);
  }

  if (options.profile) {
    const cleanLabel = Array.from(options.profile)
      .filter((ch) => ch.charCodeAt(0) >= 32)
      .join("");
    if (cleanLabel) {
      cmdArgs.push(`--profile-label=${cleanLabel}`);
    }
  }

  cmdArgs.push(...proxyArgs);

  // Fingerprint switches (SDK contract §6)
  cmdArgs.push(`--fingerprint=${seed}`);
  if (!options.args.some((a) => a.startsWith("--fingerprint-brand"))) {
    cmdArgs.push("--fingerprint-brand=chrome");
  }

  const fp = options.fingerprint;
  const effOs = params.resolvedOs ?? fp.os;
  if (effOs) {
    cmdArgs.push(`--fingerprint-platform=${effOs}`);
  }
  if (fp.osVersion) {
    cmdArgs.push(`--fingerprint-platform-version=${fp.osVersion}`);
  }

  const effTz = params.resolvedTimezone !== "auto" ? params.resolvedTimezone : undefined;
  if (effTz) {
    cmdArgs.push(`--fingerprint-timezone=${effTz}`);
  }

  const effLocale = params.resolvedLocale !== "auto" ? params.resolvedLocale : undefined;
  if (effLocale) {
    cmdArgs.push(`--fingerprint-locale=${effLocale}`);
  }

  if (fp.screen && fp.screen !== "auto") {
    cmdArgs.push(`--fingerprint-screen-width=${fp.screen.width}`);
    cmdArgs.push(`--fingerprint-screen-height=${fp.screen.height}`);
    if (!options.args.some((a) => a.startsWith("--window-size"))) {
      const targetOs =
        effOs ??
        (process.platform === "darwin"
          ? "macos"
          : process.platform === "win32"
            ? "windows"
            : "linux");
      const taskbar = targetOs === "macos" ? 95 : targetOs === "windows" ? 48 : 0;
      const minH = Math.min(600, fp.screen.height);
      const winH = Math.max(minH, fp.screen.height - taskbar);
      cmdArgs.push(`--window-size=${fp.screen.width},${winH}`);
    }
  } else if (!options.args.some((a) => a.startsWith("--window-size"))) {
    cmdArgs.push("--window-size=1280,720");
  }

  if (fp.gpu && fp.gpu !== "auto") {
    cmdArgs.push(`--fingerprint-gpu-vendor=${fp.gpu.vendor}`);
    cmdArgs.push(`--fingerprint-gpu-renderer=${fp.gpu.renderer}`);
  }

  if (typeof fp.hardwareConcurrency === "number") {
    cmdArgs.push(`--fingerprint-hardware-concurrency=${fp.hardwareConcurrency}`);
  }
  if (typeof fp.deviceMemory === "number") {
    cmdArgs.push(`--fingerprint-device-memory=${fp.deviceMemory}`);
  }
  if (fp.noise === false) {
    cmdArgs.push("--disable-fingerprint-noise");
  }

  if (params.engineVersion && !options.args.some((a) => a.startsWith("--fingerprint-tls-profile"))) {
    const major = params.engineVersion.split(".", 1)[0];
    if (/^\d+$/.test(major)) {
      cmdArgs.push(`--fingerprint-tls-profile=chrome-${major}`);
    }
  }

  // Humanize switches (contract §9; engine patch 135)
  if (options.humanize === false) {
    cmdArgs.push("--fingerprint-humanize=off");
  } else if (options.humanize === true || typeof options.humanize === "object") {
    cmdArgs.push("--fingerprint-humanize=on");
    cmdArgs.push(`--fingerprint-humanize-seed=${seed}`);
    const preset =
      typeof options.humanize === "object"
        ? options.humanize.preset
        : params.resolvedHumanizePreset;
    if (preset) {
      cmdArgs.push(`--fingerprint-humanize-preset=${preset}`);
    }
  }

  cmdArgs.push(...options.args);
  return cmdArgs;
}
