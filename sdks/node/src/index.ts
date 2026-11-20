/**
 * @ombralabs/sdk — Official Node.js / TypeScript SDK for Ombra stealth Chromium.
 *
 * Launches Ombra's C++-patched Chromium with a seed-coherent fingerprint, optional
 * authenticated proxy relay, humanized input, and custom `Ombra` CAPTCHA CDP domain,
 * returning native Playwright (`Browser` / `BrowserContext`) or Puppeteer (`Browser`) objects.
 */

export {
  SDK_VERSION,
  CONTRACT_VERSION,
  SUPPORTED_CONTRACT_RANGE,
  DEFAULT_ENGINE_VERSION,
  SUPPORTED_ENGINE_RANGE,
  SUPPORTED_PLAYWRIGHT_RANGE,
  SUPPORTED_PUPPETEER_RANGE,
} from "./version.js";

export {
  launch,
  launchContext,
  launchPersistentContext,
  launchPuppeteer,
  buildLaunchOptions,
  lastLaunchInfo,
  checkEngineHealth,
  resolveBrowserHandle,
  _clientLoader,
} from "./launch.js";

export {
  binaryInfo,
  ensureBinary,
  clearCache,
  resolveBinary,
  _sleepHook,
} from "./binary.js";

export {
  ombraCdp,
  CAPTCHA_EVENTS,
  OmbraCDP,
  CaptchaEventRecorder,
  type CaptchaEventFilter,
  type WaitForCaptchaOptions,
  type SolveCaptchaOptions,
  type SetHumanizeOptions,
  type AgentRunTaskOptions,
} from "./cdp.js";

export {
  OmbraError,
  InvalidOptionError,
  BinaryNotFoundError,
  DownloadFailedError,
  ChecksumMismatchError,
  UnsupportedPlatformError,
  UnsupportedEngineError,
  LicenseError,
  ProxyError,
  ProfileBusyError,
  LaunchTimeoutError,
  CDPConnectError,
  EngineExitedError,
  EngineCrashedError,
  ClientNotInstalledError,
  redactSecrets,
  type ErrorKind,
  type OmbraErrorOptions,
} from "./errors.js";

export type {
  PersonaOS,
  HumanizePreset,
  ProxyScheme,
  BinarySource,
  ScreenSize,
  GpuIdentity,
  FingerprintOptions,
  ProxyObject,
  PlaywrightProxyObject,
  ProxyInput,
  HumanizeOptions,
  CaptchaOptions,
  LaunchOptions,
  LaunchContextOptions,
  LaunchPersistentContextOptions,
  PuppeteerLaunchOptions,
  BinaryInfo,
  LaunchInfo,
  BuiltLaunchCommand,
  CDPSessionLike,
  PlaywrightPageLike,
  PlaywrightBrowserContextLike,
  PlaywrightBrowser,
  PlaywrightBrowserContext,
  PlaywrightBrowserLike,
  PuppeteerBrowser,
  PuppeteerBrowserLike,
  CaptchaEventName,
  CaptchaBBox,
  CaptchaPoint,
  CaptchaInfo,
  CaptchaWirePolicy,
  CaptchaState,
  CaptchaEvent,
  HumanizeState,
  AgentRunResult,
} from "./types.js";
