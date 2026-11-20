/**
 * Version and compatibility constants for the Ombra Node.js SDK.
 */

export const SDK_VERSION = "0.1.0";

export const CONTRACT_VERSION = "0.1.0";
export const SUPPORTED_CONTRACT_RANGE = ">=0.1,<0.2";

export const DEFAULT_ENGINE_VERSION = "151.0.7922.108";
export const SUPPORTED_ENGINE_RANGE = ">=151.0.7922.108,<152";
export const SUPPORTED_ENGINE_MIN_CHROMIUM = [151, 0, 7922, 108] as const;
export const SUPPORTED_ENGINE_MAX_MAJOR = 152; // exclusive

export const SUPPORTED_PLAYWRIGHT_RANGE = ">=1.60.0 <2.0.0";
export const SUPPORTED_PUPPETEER_RANGE = ">=22.0.0";
