/**
 * Typed error hierarchy and secret redaction for the Ombra Node.js SDK
 * (SDK contract v0.1 §11 & SI-06).
 */

const URL_USERINFO_RE = /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^/\s"'?#]*)@/g;
const LICENSE_ENV_RE = /(OMBRA_LICENSE_KEY=)([^\s"']+)/g;
const AUTH_HEADER_RE = /(Authorization\s*:\s*(?:Basic|Bearer|License)\s+)([^\s"']+)/gi;
const URL_TOKEN_RE = /([?&](?:auth|authorization|token|access_token|refresh_token|api_key|key|license_key)=)([^&#\s"'<>]+)/gi;
const CDP_SESSION_RE = /(\/devtools\/browser\/)([^/?#\s"'<>]+)/gi;
const CREDENTIAL_KEY_RE = /^(?:user|username|authorization|proxyauthorization|cookie|setcookie|credentials)$|(?:password|passwd|pwd|secret|token|apikey|licensekey)$/i;

export type ErrorKind =
  | "OmbraError"
  | "InvalidOption"
  | "BinaryNotFound"
  | "DownloadFailed"
  | "ChecksumMismatch"
  | "UnsupportedPlatform"
  | "UnsupportedEngine"
  | "LicenseError"
  | "ProxyError"
  | "ProfileBusy"
  | "LaunchTimeout"
  | "CDPConnectError"
  | "EngineExited"
  | "EngineCrashed"
  | "ClientNotInstalled";

/**
 * Return `text` with proxy credentials, license keys, and auth headers masked.
 */
export function redactSecrets(text: string, extraSecrets: readonly string[] = []): string {
  if (!text) return text;
  let out = text.replace(URL_USERINFO_RE, (_, scheme: string, auth: string) => `${scheme}${auth.includes(":") ? "***:***" : "***"}@`);
  out = out.replace(LICENSE_ENV_RE, "$1***");
  out = out.replace(AUTH_HEADER_RE, "$1***");
  out = out.replace(URL_TOKEN_RE, "$1***");
  out = out.replace(CDP_SESSION_RE, "$1***");
  for (const secret of extraSecrets) {
    if (secret) {
      out = out.split(secret).join("***");
    }
  }
  return out;
}

function redactValue(value: unknown, extraSecrets: readonly string[], seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return redactSecrets(value, extraSecrets);
  }
  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (Array.isArray(value)) return Array.from(value, (item) => redactValue(item, extraSecrets, seen));
    // Snapshot Error's non-enumerable diagnostics without retaining its raw cause or prototype.
    const entries = value instanceof Error
      ? Object.entries({ ...value, name: value.name, message: value.message, stack: value.stack, cause: value.cause })
      : Object.entries(value);
    return Object.fromEntries(entries.map(([key, item]) => [
      redactSecrets(key, extraSecrets),
      CREDENTIAL_KEY_RE.test(key.replace(/[-_\s]/g, "")) ? "***" : redactValue(item, extraSecrets, seen),
    ]));
  }
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  return value;
}

export interface OmbraErrorOptions {
  details?: Record<string, unknown>;
  secrets?: readonly string[];
  cause?: unknown;
}

export class OmbraError extends Error {
  readonly kind: ErrorKind;
  readonly details: Record<string, unknown>;

  constructor(message: string, options: OmbraErrorOptions = {}, kind: ErrorKind = "OmbraError") {
    const secrets = (options.secrets ?? []).filter(Boolean);
    const cleanMessage = redactSecrets(message, secrets);
    super(cleanMessage, options.cause !== undefined ? { cause: redactValue(options.cause, secrets) } : undefined);
    this.name = new.target.name;
    this.kind = kind;
    this.details = (redactValue(options.details ?? {}, secrets) as Record<string, unknown>) ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidOptionError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "InvalidOption");
  }
}

export class BinaryNotFoundError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "BinaryNotFound");
  }
}

export class DownloadFailedError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "DownloadFailed");
  }
}

export class ChecksumMismatchError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "ChecksumMismatch");
  }
}

export class UnsupportedPlatformError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "UnsupportedPlatform");
  }
}

export class UnsupportedEngineError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "UnsupportedEngine");
  }
}

export class LicenseError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "LicenseError");
  }
}

export class ProxyError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "ProxyError");
  }
}

export class ProfileBusyError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "ProfileBusy");
  }
}

export class LaunchTimeoutError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "LaunchTimeout");
  }
}

export class CDPConnectError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "CDPConnectError");
  }
}

export class EngineExitedError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "EngineExited");
  }
}

export class EngineCrashedError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "EngineCrashed");
  }
}

export class ClientNotInstalledError extends OmbraError {
  constructor(message: string, options?: OmbraErrorOptions) {
    super(message, options, "ClientNotInstalled");
  }
}
