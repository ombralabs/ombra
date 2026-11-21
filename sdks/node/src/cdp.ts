/**
 * Browser-level CDP bridge for Ombra's custom `Ombra` and `Browser` domains
 * (engine patches 135 and 200).
 *
 * Ombra Chromium registers its custom `Ombra` CDP domain (`Ombra.pdl`) exclusively on
 * browser-level CDP sessions:
 *   - Playwright: `await browser.newBrowserCDPSession()`
 *   - Puppeteer:  `await browser.target().createCDPSession()`
 */

import { InvalidOptionError } from "./errors.js";
import { resolveBrowserHandle } from "./launch.js";
import type {
  AgentRunResult,
  CDPSessionLike,
  HumanizePreset,
  HumanizeState,
} from "./types.js";

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

/**
 * Browser-level CDP client for Ombra's custom `Ombra` and `Browser` domains.
 */
export class OmbraCDP {
  public readonly browser: any;
  public readonly session: CDPSessionLike;
  private detached = false;

  constructor(browser: any, session: CDPSessionLike) {
    this.browser = browser;
    this.session = session;
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
