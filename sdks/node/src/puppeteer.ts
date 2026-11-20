/**
 * Subpath entry point `@ombralabs/sdk/puppeteer` — Puppeteer-first exports.
 *
 * @example
 * ```ts
 * import { launch } from "@ombralabs/sdk/puppeteer";
 * const browser = await launch({ headless: false });
 * ```
 */

export {
  launchPuppeteer as launch,
  launchPuppeteer,
  buildLaunchOptions,
  lastLaunchInfo,
  checkEngineHealth,
} from "./launch.js";
export { binaryInfo, ensureBinary, clearCache } from "./binary.js";
export { ombraCdp, CAPTCHA_EVENTS, OmbraCDP, CaptchaEventRecorder } from "./cdp.js";
export * from "./errors.js";
export type {
  PuppeteerLaunchOptions as LaunchOptions,
  PuppeteerBrowser,
  PuppeteerBrowserLike,
  BinaryInfo,
  LaunchInfo,
  CaptchaEvent,
  CaptchaEventName,
  CaptchaInfo,
  CaptchaState,
  HumanizeState,
} from "./types.js";
