import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import * as cdpSubpath from "../dist/esm/cdp.js";
import {
  InvalidOptionError,
  ombraCdp,
  type CDPSessionLike,
} from "../dist/esm/index.js";

class FakeCDPSession extends EventEmitter implements CDPSessionLike {
  public readonly calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  public detached = false;

  async send(method: string, params?: Record<string, unknown>): Promise<any> {
    this.calls.push({ method, params });
    switch (method) {
      case "Ombra.getHumanizeState":
        return {
          state: {
            enabled: true,
            preset: "default",
            seed: "42",
            persona: {},
            overrides: {},
            blockInput: false,
            cursory: {},
          },
        };
      case "Ombra.setHumanize":
        return {
          state: {
            enabled: Boolean(params?.enabled ?? true),
            preset: String(params?.preset ?? "default"),
            seed: "42",
            persona: {},
            overrides: (params?.overrides as Record<string, unknown>) ?? {},
            blockInput: false,
            cursory: {},
          },
        };
      case "Browser.agentRunTask":
        return {
          success: true,
          finalText: "Task completed",
          stepsJson: "[]",
        };
      default:
        return {};
    }
  }

  async detach(): Promise<void> {
    this.detached = true;
  }
}

describe("custom Ombra CDP domain", () => {
  it("exposes the CDP entrypoint on @ombralabs/sdk and @ombralabs/sdk/cdp", () => {
    assert.equal(cdpSubpath.ombraCdp, ombraCdp);
  });

  it("attaches to Playwright Browser, Playwright BrowserContext, and Puppeteer Browser without Ombra.enable", async () => {
    const pwSession = new FakeCDPSession();
    const fakePwBrowser = {
      newBrowserCDPSession: async () => pwSession,
    };
    const fakePwContext = {
      browser: () => fakePwBrowser,
    };

    const pupSession = new FakeCDPSession();
    const fakePupBrowser = {
      wsEndpoint: () => "ws://127.0.0.1:9222/devtools/browser/1",
      target: () => ({
        createCDPSession: async () => pupSession,
      }),
    };

    const cdpFromBrowser = await ombraCdp(fakePwBrowser);
    const cdpFromContext = await ombraCdp(fakePwContext);
    const cdpFromPuppeteer = await ombraCdp(fakePupBrowser);

    // Zero enable commands sent on attach
    assert.equal(pwSession.calls.length, 0);
    assert.equal(pupSession.calls.length, 0);

    await cdpFromBrowser.detach();
    await cdpFromContext.detach();
    await cdpFromPuppeteer.detach();
    assert.equal(pwSession.detached, true);
    assert.equal(pupSession.detached, true);

    await assert.rejects(() => ombraCdp({}), InvalidOptionError);
  });

  it("subscribes to CDP events and stops delivery after unsubscribe", async () => {
    const session = new FakeCDPSession();
    const cdp = await ombraCdp({ newBrowserCDPSession: async () => session });
    const received: unknown[] = [];
    const unsubscribe = cdp.on("Target.targetCreated", (event) => received.push(event));
    session.emit("Target.targetCreated", { targetId: "first" });
    unsubscribe();
    unsubscribe();
    session.emit("Target.targetCreated", { targetId: "second" });
    assert.deepEqual(received, [{ targetId: "first" }]);
    await cdp.detach();
  });

  it("executes humanize and agentRunTask commands", async () => {
    const session = new FakeCDPSession();
    const cdp = await ombraCdp({ newBrowserCDPSession: async () => session });

    assert.equal((await cdp.getHumanizeState()).preset, "default");

    const hState = await cdp.setHumanize({
      enabled: true,
      preset: "careful",
      overrides: { jitterPx: 2 },
    });
    assert.equal(hState.preset, "careful");

    const agentRes = await cdp.agentRunTask({
      targetId: "target-1",
      goal: "Click submit button",
      maxSteps: 5,
      model: "gemini-2.5-flash",
    });
    assert.equal(agentRes.success, true);

    await cdp.detach();
  });
});
