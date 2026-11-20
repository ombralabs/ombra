import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import * as captchaSubpath from "../dist/esm/captcha.js";
import * as cdpSubpath from "../dist/esm/cdp.js";
import {
  CAPTCHA_EVENTS,
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
      case "Ombra.getCaptchaState":
        return {
          state: {
            policy: {
              enabled: true,
              types: null,
              timeBudgetMs: 120_000,
              maxAttempts: 5,
              allowLLM: true,
              manualMode: false,
              manualResumeMs: 0,
            },
            captchas: [],
            signaturesVersion: "2026.11",
          },
        };
      case "Ombra.setCaptchaPolicy":
        return {
          state: {
            policy: {
              enabled: true,
              types: null,
              timeBudgetMs: 120_000,
              maxAttempts: 5,
              allowLLM: true,
              manualMode: false,
              manualResumeMs: 0,
              ...(params?.policy as object),
            },
            captchas: [],
            signaturesVersion: "2026.11",
          },
        };
      case "Ombra.solveCaptcha":
        return { count: 2 };
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

describe("custom Ombra CDP domain & all 9 CAPTCHA events", () => {
  it("exposes identical exports on @ombralabs/sdk, @ombralabs/sdk/cdp, and @ombralabs/sdk/captcha", () => {
    assert.equal(CAPTCHA_EVENTS.length, 9);
    assert.equal(cdpSubpath.ombraCdp, ombraCdp);
    assert.equal(captchaSubpath.ombraCdp, ombraCdp);
    assert.deepEqual(captchaSubpath.CAPTCHA_EVENTS, CAPTCHA_EVENTS);
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

  for (const format of ["esm", "cjs"]) {
    for (const mode of ["timeout", "stop", "dispose", "event", "predicate"]) {
      it(`settles foreground ${mode} waits and clears timers in a standalone ${format} process`, () => {
        const entry = new URL(`../dist/${format}/cdp.js`, import.meta.url).href;
        const script = `
          import assert from 'node:assert/strict';
          import { EventEmitter } from 'node:events';
          const { OmbraCDP } = await import(${JSON.stringify(entry)});
          const session = new EventEmitter();
          const recorder = new OmbraCDP({}, session).recordCaptchaEvents();
          const mode = ${JSON.stringify(mode)};
          const pending = recorder.waitFor(mode === 'predicate' ? () => { throw new Error('fake predicate failure'); } : 'captchaSolved', { timeoutMs: mode === 'timeout' ? 30 : 60000 });
          if (mode === 'timeout') {
            await assert.rejects(pending, { name: 'TimeoutError' });
          } else if (mode === 'event') {
            session.emit('Ombra.captchaSolved', {});
            assert.equal((await pending).event, 'captchaSolved');
          } else if (mode === 'predicate') {
            session.emit('Ombra.captchaSolved', {});
            await assert.rejects(pending, /fake predicate failure/);
          } else {
            const second = recorder.waitFor('captchaFailed', { timeoutMs: 60000 });
            if (mode === 'stop') recorder.stop();
            else recorder[Symbol.dispose]();
            await assert.rejects(pending, /stopped.*new recorder/i);
            await assert.rejects(second, /stopped.*new recorder/i);
            await assert.rejects(recorder.waitFor('captchaSolved'), /stopped.*new recorder/i);
            recorder.stop();
            session.emit('Ombra.captchaSolved', {});
            assert.equal(recorder.events.length, 0);
          }
          console.log('settled');
        `;
        const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 2000 });
        assert.equal(child.error, undefined, child.stderr);
        assert.equal(child.status, 0, child.stderr);
        assert.equal(child.stdout.trim(), "settled");
      });
    }
  }

  it("streams all 9 Ombra.captcha* events and supports waitFor buffering, filtering, and timeout", async () => {
    const session = new FakeCDPSession();
    const cdp = await ombraCdp({ newBrowserCDPSession: async () => session });
    const recorder = cdp.recordCaptchaEvents();

    // Emit all 9 custom Ombra CAPTCHA events
    for (const evName of CAPTCHA_EVENTS) {
      session.emit(`Ombra.${evName}`, {
        vendor: "cloudflare",
        targetId: "t-1",
        captcha: { id: 1, vendor: "cloudflare", taskType: "managed", state: evName },
      });
    }

    assert.equal(recorder.events.length, 9);
    assert.deepEqual(
      recorder.events.map((e) => e.event),
      [...CAPTCHA_EVENTS],
    );
    assert.equal(recorder.events[0].cdpEvent, "Ombra.captchaDetected");
    assert.equal(recorder.events[0].vendor, "cloudflare");

    // Buffered lookup resolves immediately
    const solved = await recorder.waitFor("captchaSolved", { timeoutMs: 50 });
    assert.equal(solved.event, "captchaSolved");

    // Async arrival wakes waitFor immediately
    recorder.clear();
    setTimeout(() => {
      session.emit("Ombra.captchaHardMode", { vendor: "arkose", reason: "elevated_risk" });
    }, 15);
    const hardMode = await recorder.waitFor(["captchaBlocked", "Ombra.captchaHardMode"], {
      timeoutMs: 1_000,
    });
    assert.equal(hardMode.event, "captchaHardMode");
    assert.equal(hardMode.reason, "elevated_risk");

    // Predicate timeout rejects with TimeoutError
    await assert.rejects(
      () => recorder.waitFor((ev) => ev.vendor === "nonexistent", { timeoutMs: 30 }),
      { name: "TimeoutError" },
    );

    recorder.stop();
    session.emit("Ombra.captchaGone", { targetId: "t-1" });
    assert.equal(recorder.events.length, 1); // no longer recording after stop()
    await cdp.detach();
  });

  it("executes getCaptchaState, setCaptchaPolicy, solveCaptcha, humanize, and agentRunTask", async () => {
    const session = new FakeCDPSession();
    const cdp = await ombraCdp({ newBrowserCDPSession: async () => session });

    const initial = await cdp.getCaptchaState();
    assert.equal(initial.signaturesVersion, "2026.11");

    const updated = await cdp.setCaptchaPolicy({
      solve: false,
      allowLLM: false,
      manualMode: true,
      manualResumeMs: 3_000,
    });
    assert.equal(updated.policy.enabled, false);
    assert.equal(updated.policy.allowLLM, false);
    assert.equal(updated.policy.manualMode, true);
    assert.equal(updated.policy.manualResumeMs, 3_000);

    const count = await cdp.solveCaptcha({ targetId: "target-1", frameId: "frame-1", captchaId: 0 });
    assert.equal(count, 2);
    assert.deepEqual(session.calls.at(-1), {
      method: "Ombra.solveCaptcha",
      params: { targetId: "target-1", frameId: "frame-1", id: 0 },
    });

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
