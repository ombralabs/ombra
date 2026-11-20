/**
 * Subpath entry point `@ombralabs/sdk/captcha` — custom `Ombra` CAPTCHA CDP client & types.
 */

export {
  CAPTCHA_EVENTS,
  CaptchaEventRecorder,
  OmbraCDP,
  ombraCdp,
  type CaptchaEventFilter,
  type SolveCaptchaOptions,
  type WaitForCaptchaOptions,
} from "./cdp.js";
export type {
  CaptchaBBox,
  CaptchaEvent,
  CaptchaEventName,
  CaptchaInfo,
  CaptchaOptions,
  CaptchaPoint,
  CaptchaState,
  CaptchaWirePolicy,
} from "./types.js";
