/**
 * Public TypeScript interfaces for @ombralabs/sdk.
 *
 * Native defaults resolve from the installed optional client. Legacy structural Like
 * interfaces remain available for explicit generic overrides.
 */

// JSDoc suppressions survive declaration emit: unselected optional peers need not be installed.
/** @ts-ignore -- optional full Playwright peer */
type FullPlaywrightBrowser = import("playwright").Browser;
/** @ts-ignore -- optional core Playwright peer */
type CorePlaywrightBrowser = import("playwright-core").Browser;
/** @ts-ignore -- optional full Playwright peer */
type FullPlaywrightContext = import("playwright").BrowserContext;
/** @ts-ignore -- optional core Playwright peer */
type CorePlaywrightContext = import("playwright-core").BrowserContext;
/** @ts-ignore -- optional full Puppeteer peer */
type FullPuppeteerBrowser = import("puppeteer", { with: { "resolution-mode": "import" } }).Browser;
/** @ts-ignore -- optional core Puppeteer peer */
type CorePuppeteerBrowser = import("puppeteer-core", { with: { "resolution-mode": "import" } }).Browser;

// keyof distinguishes missing-import error types without leaking them as any into the API.
type NativeClient<Full, Core> = string extends keyof Full ? (string extends keyof Core ? unknown : Core) : Full;
export type PlaywrightBrowser = NativeClient<FullPlaywrightBrowser, CorePlaywrightBrowser>;
export type PlaywrightBrowserContext = NativeClient<FullPlaywrightContext, CorePlaywrightContext>;
export type PuppeteerBrowser = NativeClient<FullPuppeteerBrowser, CorePuppeteerBrowser>;

export type PersonaOS = "macos" | "windows" | "linux";
export type HumanizePreset = "default" | "careful" | "fast";
export type ProxyScheme = "http" | "https" | "socks5";
export type BinarySource = "argument" | "env" | "app" | "cache" | "download" | "none";

export interface ScreenSize {
  width: number;
  height: number;
}

export interface GpuIdentity {
  vendor: string;
  renderer: string;
}

export interface FingerprintOptions {
  seed?: number;
  os?: PersonaOS;
  osVersion?: string;
  /** Alias accepted for JSON schema / Python parity. */
  os_version?: string;
  timezone?: string | "auto";
  locale?: string | "auto";
  screen?: ScreenSize | "auto";
  gpu?: GpuIdentity | "auto";
  hardwareConcurrency?: number | "auto";
  hardware_concurrency?: number | "auto";
  deviceMemory?: number | "auto";
  device_memory?: number | "auto";
  noise?: boolean;
}

export interface ProxyObject {
  type: ProxyScheme;
  host: string;
  port: number;
  username?: string;
  password?: string;
  bypass?: string;
}

export interface PlaywrightProxyObject {
  server: string;
  username?: string;
  password?: string;
  bypass?: string;
}

export type ProxyInput = string | ProxyObject | PlaywrightProxyObject;

export interface HumanizeOptions {
  preset?: HumanizePreset;
}

export interface CaptchaOptions {
  /** When false, enables detection and Ombra.* CDP events without automatic solving. */
  solve?: boolean;
  types?: string[] | null;
  timeBudgetMs?: number;
  time_budget_ms?: number;
  maxAttempts?: number;
  max_attempts?: number;
  allowLLM?: boolean;
  allow_llm?: boolean;
  manualMode?: boolean;
  manual_mode?: boolean;
  manualResumeMs?: number;
  manual_resume_ms?: number;
}

export interface LaunchOptions {
  headless?: boolean;
  proxy?: ProxyInput;
  fingerprint?: FingerprintOptions;
  profile?: string;
  userDataDir?: string;
  user_data_dir?: string;
  args?: string[];
  binaryPath?: string;
  binary_path?: string;
  version?: string;
  timeoutMs?: number;
  timeout_ms?: number;
  humanize?: boolean | HumanizeOptions;
  captcha?: boolean | CaptchaOptions;
  licenseKey?: string;
  license_key?: string;
  env?: Record<string, string>;
  download?: boolean;
}

export interface LaunchContextOptions extends LaunchOptions {
  locale?: string;
  timezone?: string;
  timezoneId?: string;
  viewport?: ScreenSize | null;
  /** Extra options passed directly to Playwright's `browser.newContext()`. */
  contextOptions?: Record<string, unknown>;
}

export interface LaunchPersistentContextOptions extends LaunchOptions {
  locale?: string;
  timezone?: string;
  timezoneId?: string;
}

export interface PuppeteerLaunchOptions extends LaunchOptions {
  defaultViewport?: ScreenSize | null;
}

export interface BinaryInfo {
  version: string;
  platform: string;
  path: string | null;
  installed: boolean;
  source: BinarySource;
  sha256: string | null;
}

export interface LaunchInfo {
  binaryPath: string;
  engineVersion: string;
  profileDir: string;
  seed: number;
  cdpPort: number;
  wsUrl: string;
  pid: number;
  crashed: boolean;
  exitCode: number | null;
}

export interface BuiltLaunchCommand {
  binaryPath: string;
  engineVersion: string;
  args: string[];
  timeoutMs: number;
}

// ---------------------------------------------------------------------------
// Structural automation client interfaces (compatible with Playwright & Puppeteer)
// ---------------------------------------------------------------------------

export interface CDPSessionLike {
  send(method: string, params?: Record<string, unknown>): Promise<any>;
  on(event: string, listener: (params: any) => void): any;
  off?(event: string, listener: (params: any) => void): any;
  removeListener?(event: string, listener: (params: any) => void): any;
  detach(): Promise<void>;
}

export interface PlaywrightPageLike {
  goto(url: string, options?: Record<string, unknown>): Promise<any>;
  title(): Promise<string>;
  content(): Promise<string>;
  setContent(html: string, options?: Record<string, unknown>): Promise<void>;
  evaluate<R = any>(pageFunction: string | ((...args: any[]) => R), arg?: any): Promise<R>;
  waitForTimeout(timeout: number): Promise<void>;
  close(options?: { reason?: string }): Promise<void>;
  [key: string]: any;
}

export interface PlaywrightBrowserContextLike {
  newPage(): Promise<PlaywrightPageLike>;
  pages(): PlaywrightPageLike[];
  browser(): PlaywrightBrowserLike | null;
  newCDPSession(page: unknown): Promise<CDPSessionLike>;
  close(options?: { reason?: string }): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): any;
  [key: string]: any;
}

export interface PlaywrightBrowserLike {
  newContext(options?: Record<string, unknown>): Promise<PlaywrightBrowserContextLike>;
  newPage(options?: Record<string, unknown>): Promise<PlaywrightPageLike>;
  contexts(): PlaywrightBrowserContextLike[];
  newBrowserCDPSession(): Promise<CDPSessionLike>;
  isConnected(): boolean;
  close(options?: { reason?: string }): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): any;
  [key: string]: any;
}

export interface PuppeteerBrowserLike {
  newPage(): Promise<any>;
  pages(): Promise<any[]>;
  target(): { createCDPSession(): Promise<CDPSessionLike>; [key: string]: any };
  wsEndpoint(): string;
  connected: boolean;
  disconnect(): Promise<void> | void;
  close(): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): any;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Custom Ombra CDP domain types (patches 135, 200, 970)
// ---------------------------------------------------------------------------

export type CaptchaEventName =
  | "captchaDetected"
  | "captchaStateChanged"
  | "captchaInvisible"
  | "captchaBlocked"
  | "captchaHardMode"
  | "captchaGone"
  | "captchaSolving"
  | "captchaSolved"
  | "captchaFailed";

export interface CaptchaBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptchaPoint {
  x: number;
  y: number;
}

export interface CaptchaInfo {
  targetId: string;
  frameId: string;
  pageUrl: string;
  id: number;
  vendor: string;
  variant: string;
  taskType: string;
  state: string;
  bbox?: CaptchaBBox;
  click?: CaptchaPoint;
  ready: boolean;
  rounds: number;
  rejections: number;
  suspectedHardMode: boolean;
  taskServed: boolean;
}

export interface CaptchaWirePolicy {
  enabled: boolean;
  types: string[] | null;
  timeBudgetMs: number;
  maxAttempts: number;
  allowLLM: boolean;
  manualMode: boolean;
  manualResumeMs: number;
}

export interface CaptchaState {
  policy: CaptchaWirePolicy;
  captchas: CaptchaInfo[];
  signaturesVersion: string;
}

export interface CaptchaEvent {
  event: CaptchaEventName;
  cdpEvent: `Ombra.${CaptchaEventName}`;
  timestamp: number;
  captcha?: CaptchaInfo;
  previousState?: string;
  targetId?: string;
  frameId?: string;
  pageUrl?: string;
  vendor?: string;
  reason?: string;
  diagnosis?: Record<string, unknown>;
  strategy?: string;
  strategies?: string[];
  attempt?: number;
  attempts?: number;
  rounds?: number;
  durationMs?: number;
  [key: string]: unknown;
}

export interface HumanizeState {
  enabled: boolean;
  preset: HumanizePreset;
  seed: string;
  persona: Record<string, unknown>;
  overrides: Record<string, unknown>;
  blockInput: boolean;
  cursory: Record<string, unknown>;
  scrollTableError?: string;
}

export interface AgentRunResult {
  success: boolean;
  finalText: string;
  stepsJson: string;
}
