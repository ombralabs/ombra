/**
 * Browser-level CDP bridge for Ombra's custom `Ombra` and `Browser` domains
 * (engine patches 135, 200, and 970).
 *
 * Ombra Chromium registers its custom `Ombra` CDP domain (`Ombra.pdl`) exclusively on
 * browser-level CDP sessions:
 *   - Playwright: `await browser.newBrowserCDPSession()`
 *   - Puppeteer:  `await browser.target().createCDPSession()`
 *
 * All 9 `Ombra.captcha*` events stream automatically to every browser session without calling
 * an `Ombra.enable` method.
 */

import { InvalidOptionError } from "./errors.js";
import { resolveBrowserHandle } from "./launch.js";
import { normalizeCaptchaPolicyPatch } from "./options.js";
import type {
  AgentRunResult,
  CaptchaEvent,
  CaptchaEventName,
  CaptchaOptions,
  CaptchaState,
  CDPSessionLike,
  HumanizePreset,
  HumanizeState,
} from "./types.js";

export const CAPTCHA_EVENTS: readonly CaptchaEventName[] = Object.freeze([
  "captchaDetected",
  "captchaStateChanged",
  "captchaInvisible",
  "captchaBlocked",
  "captchaHardMode",
  "captchaGone",
  "captchaSolving",
  "captchaSolved",
  "captchaFailed",
]);

const HUMANIZE_PRESETS = new Set<HumanizePreset>(["default", "careful", "fast"]);

function normalizeEventName(event: string): { shortName: string; fullName: string } {
  if (typeof event !== "string" || !event.trim()) {
    throw new InvalidOptionError("CDP event name must be a non-empty string.");
  }
  const trimmed = event.trim();
  const dot = trimmed.indexOf(".");
  if (dot !== -1) {
    const domain = trimmed.slice(0, dot);
    const shortName = trimmed.slice(dot + 1);
    if (!domain || !shortName) {
      throw new InvalidOptionError(`Invalid CDP event name '${event}'.`);
    }
    return { shortName, fullName: `${domain}.${shortName}` };
  }
  return { shortName: trimmed, fullName: `Ombra.${trimmed}` };
}

export type CaptchaEventFilter =
  | CaptchaEventName
  | string
  | ReadonlyArray<string>
  | ((event: CaptchaEvent) => boolean)
  | null
  | undefined;

function buildPredicate(filter: CaptchaEventFilter): (event: CaptchaEvent) => boolean {
  if (filter === undefined || filter === null) {
    return () => true;
  }
  if (typeof filter === "function") {
    return filter;
  }
  if (typeof filter === "string") {
    const { shortName } = normalizeEventName(filter);
    return (ev) => ev.event === shortName;
  }
  if (Array.isArray(filter)) {
    const wanted = new Set(filter.map((item) => normalizeEventName(item).shortName));
    return (ev) => wanted.has(ev.event);
  }
  throw new InvalidOptionError(
    "Event filter must be undefined, an event name, an array of event names, or a predicate function.",
  );
}

export interface WaitForCaptchaOptions {
  timeoutMs?: number;
  timeout_ms?: number;
}

export interface SolveCaptchaOptions {
  targetId?: string;
  target_id?: string;
  frameId?: string;
  frame_id?: string;
  id?: number;
  captchaId?: number;
  captcha_id?: number;
}

export interface SetHumanizeOptions {
  enabled?: boolean;
  preset?: HumanizePreset;
  overrides?: Record<string, unknown>;
}

export interface AgentRunTaskOptions {
  targetId?: string;
  target_id?: string;
  goal: string;
  maxSteps?: number;
  max_steps?: number;
  model?: string;
  planJson?: string;
  plan_json?: string;
}

function makeTimeoutError(timeoutMs: number): Error {
  const err = new Error(`Timed out after ${timeoutMs}ms waiting for Ombra CAPTCHA CDP event.`);
  err.name = "TimeoutError";
  return err;
}

/**
 * In-order, event-driven buffer of `Ombra.captcha*` CDP events.
 */
export class CaptchaEventRecorder {
  public readonly events: CaptchaEvent[] = [];
  private unsubscribe: (() => void) | null;
  private waiters: Set<(stopped?: boolean) => void> = new Set();

  constructor(cdp: OmbraCDP) {
    this.unsubscribe = cdp.onCaptcha((ev) => {
      this.events.push(ev);
      for (const wake of Array.from(this.waiters)) {
        wake();
      }
    });
  }

  /** Clear already buffered events without unsubscribing. */
  clear(): void {
    this.events.length = 0;
  }

  /** Unsubscribe from further CDP events and reject pending waits. */
  stop(): void {
    if (this.unsubscribe) {
      const fn = this.unsubscribe;
      this.unsubscribe = null;
      fn();
    }
    for (const wake of Array.from(this.waiters)) wake(true);
  }

  [Symbol.dispose](): void {
    this.stop();
  }

  /**
   * Wait for a matching `Ombra.captcha*` event (either already buffered or arriving before timeout).
   */
  waitFor(filter?: CaptchaEventFilter, options: WaitForCaptchaOptions = {}): Promise<CaptchaEvent> {
    const predicate = buildPredicate(filter);
    const timeoutMs = options.timeoutMs ?? options.timeout_ms ?? 30_000;
    if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs < 0) {
      throw new InvalidOptionError("timeoutMs must be a non-negative number.");
    }

    for (const item of this.events) {
      if (predicate(item)) {
        return Promise.resolve(item);
      }
    }
    if (!this.unsubscribe) {
      return Promise.reject(new InvalidOptionError("CAPTCHA event recorder has stopped. Create a new recorder before waiting for further events."));
    }
    if (timeoutMs === 0) {
      return Promise.reject(makeTimeoutError(0));
    }

    return new Promise<CaptchaEvent>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.waiters.delete(onWake);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(makeTimeoutError(timeoutMs));
      }, timeoutMs);

      const onWake = (stopped = false) => {
        try {
          if (stopped) {
            throw new InvalidOptionError("CAPTCHA event recorder has stopped. Create a new recorder before waiting for further events.");
          }
          for (const item of this.events) {
            if (predicate(item)) {
              cleanup();
              resolve(item);
              return;
            }
          }
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      this.waiters.add(onWake);
    });
  }
}

/**
 * Browser-level CDP client for Ombra's custom `Ombra` and `Browser` domains.
 */
export class OmbraCDP {
  public readonly browser: any;
  public readonly session: CDPSessionLike;
  private readonly startHrTime: bigint;
  private detached = false;

  constructor(browser: any, session: CDPSessionLike) {
    this.browser = browser;
    this.session = session;
    this.startHrTime = process.hrtime.bigint();
  }

  /** Detach this browser CDP session without closing the browser. */
  async detach(): Promise<void> {
    if (this.detached) return;
    this.detached = true;
    try {
      await this.session.detach();
    } catch {
      // Ignore if browser or session already closed.
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.detach();
  }

  /**
   * Subscribe to an `Ombra.*` (or explicit `Domain.event`) CDP event.
   * Returns an `unsubscribe()` function.
   */
  on(event: string, listener: (params: any) => void): () => void {
    const { fullName } = normalizeEventName(event);
    this.session.on(fullName, listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      try {
        if (typeof this.session.off === "function") {
          this.session.off(fullName, listener);
        } else if (typeof this.session.removeListener === "function") {
          this.session.removeListener(fullName, listener);
        }
      } catch {
        // ignore
      }
    };
  }

  /**
   * Subscribe `callback` to all 9 `Ombra.captcha*` events.
   * Returns an `unsubscribe()` function.
   */
  onCaptcha(callback: (event: CaptchaEvent) => void | Promise<void>): () => void {
    const unsubscribers: Array<() => void> = [];
    for (const shortName of CAPTCHA_EVENTS) {
      const fullName = `Ombra.${shortName}` as const;
      const listener = (params: Record<string, unknown> | undefined) => {
        const elapsedSec = Number(process.hrtime.bigint() - this.startHrTime) / 1e9;
        const payload: CaptchaEvent = {
          ...(params && typeof params === "object" ? params : {}),
          event: shortName,
          cdpEvent: fullName,
          timestamp: Math.round(elapsedSec * 1000) / 1000,
        };
        try {
          const maybePromise = callback(payload);
          if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
            (maybePromise as Promise<void>).catch(() => {});
          }
        } catch {
          // Avoid crashing CDP event emitter on user callback error
        }
      };
      unsubscribers.push(this.on(fullName, listener));
    }
    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }

  /** Start buffering all `Ombra.captcha*` events in arrival order. */
  recordCaptchaEvents(): CaptchaEventRecorder {
    return new CaptchaEventRecorder(this);
  }

  /** Call `Ombra.getCaptchaState` and return `{ policy, captchas, signaturesVersion }`. */
  async getCaptchaState(): Promise<CaptchaState> {
    const res = await this.session.send("Ombra.getCaptchaState");
    return (res && typeof res === "object" && "state" in res ? res.state : res) as CaptchaState;
  }

  /** Validate and apply a live `Ombra.setCaptchaPolicy` update. */
  async setCaptchaPolicy(
    policy: CaptchaOptions & { enabled?: boolean },
  ): Promise<CaptchaState> {
    const wirePolicy = normalizeCaptchaPolicyPatch(policy as Record<string, unknown>);
    const res = await this.session.send("Ombra.setCaptchaPolicy", { policy: wirePolicy });
    return (res && typeof res === "object" && "state" in res ? res.state : res) as CaptchaState;
  }

  /**
   * Trigger `Ombra.solveCaptcha` manually (works even when policy `solve: false`).
   * Returns the number of matching CAPTCHAs queued for solving.
   */
  async solveCaptcha(options: SolveCaptchaOptions = {}): Promise<number> {
    if (options.targetId !== undefined && options.target_id !== undefined) {
      throw new InvalidOptionError("Specify either 'targetId' or 'target_id', not both.");
    }
    if (options.frameId !== undefined && options.frame_id !== undefined) {
      throw new InvalidOptionError("Specify either 'frameId' or 'frame_id', not both.");
    }
    const idCandidates = [options.id, options.captchaId, options.captcha_id].filter(
      (v) => v !== undefined,
    );
    if (idCandidates.length > 1) {
      throw new InvalidOptionError("Specify only one of 'id', 'captchaId', or 'captcha_id'.");
    }

    const params: Record<string, unknown> = {};
    const targetId = options.targetId ?? options.target_id;
    if (targetId !== undefined) {
      if (typeof targetId !== "string" || !targetId) {
        throw new InvalidOptionError("targetId must be a non-empty string.");
      }
      params.targetId = targetId;
    }

    const frameId = options.frameId ?? options.frame_id;
    if (frameId !== undefined) {
      if (typeof frameId !== "string" || !frameId) {
        throw new InvalidOptionError("frameId must be a non-empty string.");
      }
      params.frameId = frameId;
    }

    const captchaId = idCandidates[0];
    if (captchaId !== undefined) {
      if (typeof captchaId !== "number" || !Number.isInteger(captchaId) || captchaId < 0) {
        throw new InvalidOptionError("captchaId must be a non-negative integer.");
      }
      params.id = captchaId;
    }

    const res = await this.session.send(
      "Ombra.solveCaptcha",
      Object.keys(params).length > 0 ? params : undefined,
    );
    return res && typeof res === "object" && typeof res.count === "number" ? res.count : 0;
  }

  /** Call `Ombra.getHumanizeState`. */
  async getHumanizeState(): Promise<HumanizeState> {
    const res = await this.session.send("Ombra.getHumanizeState");
    return (res && typeof res === "object" && "state" in res ? res.state : res) as HumanizeState;
  }

  /** Call `Ombra.setHumanize` to toggle or adjust humanized input on the fly. */
  async setHumanize(options: SetHumanizeOptions = {}): Promise<HumanizeState> {
    const params: Record<string, unknown> = {};
    if (options.enabled !== undefined) {
      if (typeof options.enabled !== "boolean") {
        throw new InvalidOptionError("enabled must be a boolean.");
      }
      params.enabled = options.enabled;
    }
    if (options.preset !== undefined) {
      if (typeof options.preset !== "string" || !HUMANIZE_PRESETS.has(options.preset)) {
        throw new InvalidOptionError(
          `preset must be 'default', 'careful', or 'fast', got '${String(options.preset)}'.`,
        );
      }
      params.preset = options.preset;
    }
    if (options.overrides !== undefined) {
      if (!options.overrides || typeof options.overrides !== "object" || Array.isArray(options.overrides)) {
        throw new InvalidOptionError("overrides must be a plain object.");
      }
      params.overrides = options.overrides;
    }
    const res = await this.session.send(
      "Ombra.setHumanize",
      Object.keys(params).length > 0 ? params : undefined,
    );
    return (res && typeof res === "object" && "state" in res ? res.state : res) as HumanizeState;
  }

  /** Call `Browser.agentRunTask` for Ombra's native in-browser AI agent. */
  async agentRunTask(options: AgentRunTaskOptions): Promise<AgentRunResult> {
    if (!options || typeof options !== "object") {
      throw new InvalidOptionError("agentRunTask requires an options object.");
    }
    if (options.targetId !== undefined && options.target_id !== undefined) {
      throw new InvalidOptionError("Specify either 'targetId' or 'target_id', not both.");
    }
    if (options.maxSteps !== undefined && options.max_steps !== undefined) {
      throw new InvalidOptionError("Specify either 'maxSteps' or 'max_steps', not both.");
    }
    if (options.planJson !== undefined && options.plan_json !== undefined) {
      throw new InvalidOptionError("Specify either 'planJson' or 'plan_json', not both.");
    }

    const targetId = options.targetId ?? options.target_id;
    if (typeof targetId !== "string" || !targetId.trim()) {
      throw new InvalidOptionError("targetId must be a non-empty string.");
    }
    if (typeof options.goal !== "string" || !options.goal.trim()) {
      throw new InvalidOptionError("goal must be a non-empty string.");
    }

    const params: Record<string, unknown> = {
      targetId,
      goal: options.goal,
    };

    const maxSteps = options.maxSteps ?? options.max_steps;
    if (maxSteps !== undefined) {
      if (typeof maxSteps !== "number" || !Number.isInteger(maxSteps) || maxSteps < 1) {
        throw new InvalidOptionError("maxSteps must be an integer >= 1.");
      }
      params.maxSteps = maxSteps;
    }
    if (options.model !== undefined) {
      if (typeof options.model !== "string" || !options.model.trim()) {
        throw new InvalidOptionError("model must be a non-empty string.");
      }
      params.model = options.model;
    }
    const planJson = options.planJson ?? options.plan_json;
    if (planJson !== undefined) {
      if (typeof planJson !== "string") {
        throw new InvalidOptionError("planJson must be a JSON string.");
      }
      params.planJson = planJson;
    }

    return (await this.session.send("Browser.agentRunTask", params)) as AgentRunResult;
  }
}

/**
 * Open a browser-level CDP session for Ombra's custom `Ombra` domain.
 *
 * Accepts a Playwright `Browser` (`launch()`), Playwright `BrowserContext`
 * (`launchContext()` / `launchPersistentContext()`), or Puppeteer `Browser`
 * (`launchPuppeteer()` / `@ombralabs/sdk/puppeteer`).
 */
export async function ombraCdp(browserOrContext: unknown): Promise<OmbraCDP> {
  const browser = resolveBrowserHandle(browserOrContext);
  if (typeof browser.newBrowserCDPSession === "function") {
    const session: CDPSessionLike = await browser.newBrowserCDPSession();
    return new OmbraCDP(browser, session);
  }
  if (typeof browser.target === "function") {
    const target = browser.target();
    if (target && typeof target.createCDPSession === "function") {
      const session: CDPSessionLike = await target.createCDPSession();
      return new OmbraCDP(browser, session);
    }
  }
  throw new InvalidOptionError(
    "Provided browser handle does not support browser-level CDP sessions.",
  );
}
