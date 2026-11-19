import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import {
  PROBE_VERSION,
  TARGET_RANK,
  parseArgs,
  buildEngineFlags,
  candidateVersionDirs,
  extractBuildVersion,
  compareSnapshots,
  evaluateL101,
  evaluateL501,
  evaluateL502,
  metricsFor,
  isCompatibleBaseline,
  diffBaseline,
  reportVerdict,
  redactReport
} from '../lib.mjs';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const BENCH_DIR = dirname(TESTS_DIR);

function makeCleanSnapshot(id = 'snap-1', overrides = {}) {
  const probes = {
    'nav.webdriver': { c: 'hard', h: 'wd-false', v: false, ok: true, s: null, err: null, ms: 1, n: false },
    'nav.uaData': { c: 'hard', h: 'ua-ok', v: { available: true, platform: 'macOS' }, ok: true, s: null, err: null, ms: 2, n: false },
    'auto.cdp': { c: 'hard', h: 'cdp-ok', v: [], ok: true, s: null, err: null, ms: 1, n: false },
    'auto.headless': {
      c: 'hard', h: 'hl-ok',
      v: { webdriver: false, uaHeadless: false, outerZero: false, screenZero: false, noChrome: false, pluginsZero: false, languagesZero: false },
      ok: true, s: null, err: null, ms: 1, n: false
    },
    'auto.consistency': {
      c: 'hard', h: 'con-ok',
      v: {
        webdriver: false, mobileNoTouch: false, chromeNoPlugins: false, outerZero: false, screenZero: false,
        uaPlatformMismatch: false, uaMobileMismatch: false, gpuOsMismatch: false, webdriverOwnProp: false
      },
      ok: true, s: null, err: null, ms: 1, n: false
    },
    'auto.permissions': {
      c: 'hard', h: 'perm-ok',
      v: { query: 'prompt', notification: 'default', mismatch: false },
      ok: true, s: null, err: null, ms: 1, n: false
    },
    'auto.runtimeLeak': { c: 'hard', h: 'rt-ok', v: { leaked: false }, ok: true, s: null, err: null, ms: 1, n: false },
    'js.error': { c: 'hard', h: 'err-ok', v: { sourceUrlLeak: false }, ok: true, s: null, err: null, ms: 1, n: false },
    'js.native': { c: 'hard', h: 'nat-ok', v: { allNative: true, nonNative: [], webdriverOwnProp: false }, ok: true, s: null, err: null, ms: 1, n: false },
    'context.agreement': {
      c: 'hard', h: 'ctx-ok',
      v: { workerSkipped: null, workerOk: true, iframeOk: true, detachedScreenZero: true, mismatches: [] },
      ok: true, s: null, err: null, ms: 5, n: false
    },
    ...(overrides.probes || {})
  };
  const hardCount = Object.values(probes).filter((p) => p.c === 'hard').length;
  const hardSkipped = Object.entries(probes).filter(([, p]) => p.c === 'hard' && (p.s || p.v?.skipped)).map(([k]) => k);
  const hardErr = Object.entries(probes).filter(([, p]) => p.c === 'hard' && !p.ok).map(([k]) => k);
  const hardNoisy = Object.entries(probes).filter(([, p]) => p.c === 'hard' && p.n).map(([k]) => k);
  return {
    schema: 1,
    version: PROBE_VERSION,
    id,
    createdAt: '2026-11-19T18:00:00.000Z',
    durationMs: 100,
    label: id,
    profile: 'benchmark-headless',
    probes,
    noise: hardNoisy,
    hardHash: overrides.hardHash ?? 'aaaa1111bbbb2222',
    hardNoisy: overrides.hardNoisy ?? hardNoisy,
    hardErr: overrides.hardErr ?? hardErr,
    hardSkipped: overrides.hardSkipped ?? hardSkipped,
    counts: {
      total: Object.keys(probes).length,
      hard: hardCount,
      context: 0,
      hardStable: hardCount - hardSkipped.length - hardErr.length - hardNoisy.length,
      hardNoisy: hardNoisy.length,
      hardErr: hardErr.length,
      hardSkipped: hardSkipped.length
    }
  };
}

test('parseArgs validates numeric args, string seeds, platform, and seed2', () => {
  assert.throws(() => parseArgs(['--runs', 'abc']), /positive integer/);
  assert.throws(() => parseArgs(['--runs', '0']), /positive integer/);
  assert.throws(() => parseArgs(['--timeout', 'not-a-number']), /timeout/);
  assert.throws(() => parseArgs(['--platform', 'solaris']), /platform/);
  assert.throws(() => parseArgs(['--seed', 'abc', '--seed2', 'abc']), /differ/);
  assert.throws(() => parseArgs(['--known-gap-expires', '2026/11/19']), /YYYY-MM-DD/);

  const parsed = parseArgs([
    '--runs', '3',
    '--seed', 'persona-seed-alpha',
    '--platform', 'android',
    '--dpr', '2.5',
    '--known-gap-expires', '2026-12-31'
  ]);
  assert.equal(parsed.runs, 3);
  assert.equal(parsed.seed, 'persona-seed-alpha');
  assert.equal(parsed.platform, 'android');
  assert.equal(parsed.dpr, 2.5);
  assert.equal(parsed.knownGapExpires, '2026-12-31');
});

test('buildEngineFlags omits --force-device-scale-factor by default and wires ombra switches', () => {
  const defaultFlags = buildEngineFlags({
    profileDir: '/tmp/p',
    mode: 'headless',
    sandbox: true,
    seed: '42'
  });
  assert.ok(!defaultFlags.some((f) => f.startsWith('--force-device-scale-factor')));
  assert.ok(defaultFlags.includes('--fingerprint=42'));
  assert.ok(defaultFlags.includes('--headless=new'));

  const customFlags = buildEngineFlags({
    profileDir: '/tmp/p',
    mode: 'headed',
    sandbox: true,
    seed: '42',
    platform: 'windows',
    timezone: 'America/New_York',
    location: 'en-US',
    dpr: 1.5
  });
  assert.ok(customFlags.includes('--fingerprint-platform=windows'));
  assert.ok(customFlags.includes('--fingerprint-timezone=America/New_York'));
  assert.ok(customFlags.includes('--fingerprint-location=en-US'));
  assert.ok(customFlags.includes('--fingerprint-device-pixel-ratio=1.5'));
});

test('run.mjs never sends CDP Runtime.enable (conformance SI-01)', () => {
  const runSrc = readFileSync(join(BENCH_DIR, 'run.mjs'), 'utf8');
  assert.ok(!/send\s*\(\s*['"]Runtime\.enable['"]/.test(runSrc), 'run.mjs must not call Runtime.enable');
});

test('candidateVersionDirs and extractBuildVersion handle macOS, Linux, and Windows layouts', () => {
  const mac = extractBuildVersion(candidateVersionDirs('/Users/u/Ombra/engines/versions/151.0.7922.108-7/Chromium.app/Contents/MacOS/Chromium'));
  assert.equal(mac.version, '151.0.7922.108-7');

  const linux = extractBuildVersion(candidateVersionDirs('/home/u/.local/share/Ombra/engines/versions/151.0.7922.108-7/chrome'));
  assert.equal(linux.version, '151.0.7922.108-7');

  const win = extractBuildVersion(candidateVersionDirs('/engines/versions/151.0.7922.108-7/chrome.exe'));
  assert.equal(win.version, '151.0.7922.108-7');
});

test('compareSnapshots returns 0% when denominator is 0 and excludes skipped probes', () => {
  const allFailed1 = {
    probes: { a: { c: 'hard', ok: false, h: null }, b: { c: 'hard', ok: false, h: null } }
  };
  const allFailed2 = {
    probes: { a: { c: 'hard', ok: false, h: null }, b: { c: 'hard', ok: false, h: null } }
  };
  const failedComp = compareSnapshots(allFailed1, allFailed2);
  assert.equal(failedComp.hardDenominator, 0);
  assert.equal(failedComp.hardPct, 0);

  const skip1 = {
    probes: {
      a: { c: 'hard', ok: true, h: '111', s: null, n: false },
      b: { c: 'hard', ok: true, h: 'skip', s: 'file-origin', n: false }
    }
  };
  const skip2 = {
    probes: {
      a: { c: 'hard', ok: true, h: '111', s: null, n: false },
      b: { c: 'hard', ok: true, h: 'skip', s: 'file-origin', n: false }
    }
  };
  const skipComp = compareSnapshots(skip1, skip2);
  assert.equal(skipComp.hardDenominator, 1);
  assert.equal(skipComp.hardSkipped.length, 1);
  assert.equal(skipComp.hardPct, 100);
});

test('evaluateL101 inspects all snapshots, catches permissions/runtime/native/coherence, and attaches known_gap on DEGRADED', () => {
  const s1 = makeCleanSnapshot('s1');
  const s2 = makeCleanSnapshot('s2');
  assert.equal(evaluateL101([s1, s2], { sandbox: true }).status, 'PASS');

  // Failure on run 2 must fail L1-01
  const s2PermMismatch = makeCleanSnapshot('s2', {
    probes: {
      'auto.permissions': { c: 'hard', h: 'p', v: { query: 'denied', notification: 'default', mismatch: true }, ok: true, s: null, n: false }
    }
  });
  const permRes = evaluateL101([s1, s2PermMismatch], { sandbox: true });
  assert.equal(permRes.status, 'FAIL');
  assert.ok(permRes.failures.some((f) => f.includes('auto.permissions mismatch')));

  // Runtime.enable leak fails L1-01
  const sLeak = makeCleanSnapshot('s-leak', {
    probes: { 'auto.runtimeLeak': { c: 'hard', h: 'r', v: { leaked: true }, ok: true, s: null, n: false } }
  });
  assert.equal(evaluateL101([sLeak], { sandbox: true }).status, 'FAIL');

  // Cross-field OS/GPU mismatch fails L1-01
  const sGpuMismatch = makeCleanSnapshot('s-gpu', {
    probes: {
      'auto.consistency': {
        c: 'hard', h: 'c',
        v: { webdriver: false, mobileNoTouch: false, chromeNoPlugins: false, outerZero: false, screenZero: false, gpuOsMismatch: true },
        ok: true, s: null, n: false
      }
    }
  });
  assert.equal(evaluateL101([sGpuMismatch], { sandbox: true }).status, 'FAIL');

  // Skipped hard probe on file:// must be DEGRADED with known_gap (never PASS)
  const sSkipped = makeCleanSnapshot('s-skip', {
    probes: {
      'auto.permissions': { c: 'hard', h: '4c3097841357f2ad', v: { skipped: 'file-origin' }, ok: true, s: 'file-origin', n: false }
    }
  });
  const skipRes = evaluateL101([sSkipped], { sandbox: true, operator: 'qa', knownGapExpires: '2026-12-31' });
  assert.equal(skipRes.status, 'DEGRADED');
  assert.deepEqual(skipRes.skipped, ['auto.permissions']);
  assert.equal(skipRes.known_gap.owner, 'qa');
  assert.equal(skipRes.known_gap.expires, '2026-12-31');

  // --no-sandbox must not be PASS
  const noSandboxRes = evaluateL101([s1], { sandbox: false, operator: 'qa', knownGapExpires: '2026-12-31' });
  assert.equal(noSandboxRes.status, 'DEGRADED');
  assert.ok(noSandboxRes.known_gap);
});

test('evaluateL501 enforces seed sensitivity and marks partial crash UNREACHABLE', () => {
  const s1 = makeCleanSnapshot('s1');
  const s2 = makeCleanSnapshot('s2');

  const passRes = evaluateL501([s1, s2], { expectedRuns: 2, seedCheck: { checked: true, changed: true } });
  assert.equal(passRes.status, 'PASS');

  const sameSeedFail = evaluateL501([s1, s2], { expectedRuns: 2, seedCheck: { checked: true, changed: false } });
  assert.equal(sameSeedFail.status, 'FAIL');
  assert.ok(sameSeedFail.failures.some((f) => f.includes('did not change hardHash')));

  const partialAbort = evaluateL501([s1, s2], { expectedRuns: 5, runError: 'engine crashed on run 3' });
  assert.equal(partialAbort.status, 'UNREACHABLE');
  assert.ok(partialAbort.failures[0].includes('2/5'));
});

test('evaluateL502 evaluates cross-context agreement', () => {
  const clean = makeCleanSnapshot('s1');
  assert.equal(evaluateL502([clean]).status, 'PASS');

  const workerSkip = makeCleanSnapshot('s2', {
    probes: {
      'context.agreement': {
        c: 'hard', h: 'ctx',
        v: { workerSkipped: 'file-origin', workerOk: false, iframeOk: true, mismatches: [] },
        ok: true, s: null, ms: 3, n: false
      }
    }
  });
  const degraded = evaluateL502([workerSkip], { operator: 'qa', knownGapExpires: '2026-12-31' });
  assert.equal(degraded.status, 'DEGRADED');
  assert.ok(degraded.known_gap);

  const mismatch = makeCleanSnapshot('s3', {
    probes: {
      'context.agreement': {
        c: 'hard', h: 'ctx',
        v: { workerSkipped: null, workerOk: true, iframeOk: true, mismatches: ['worker.timeZone'] },
        ok: true, s: null, ms: 3, n: false
      }
    }
  });
  assert.equal(evaluateL502([mismatch]).status, 'FAIL');
});

test('baseline matching isolates OS/transport/probe_version/sandbox and normalizes error rates', () => {
  const baseReport = {
    run_id: '2026-11-18-base',
    started_at: '2026-11-18T00:00:00.000Z',
    verdict: 'PASS',
    engine: { name: 'Ombra Chromium' },
    environment: { os: 'darwin 25.6.0 arm64', mode: 'headless', transport: 'http', sandbox: true, hard_only: true, profile_platform: null },
    targets: [{ id: 'L1-01', status: 'PASS' }, { id: 'L5-01', status: 'PASS' }],
    checks: {
      probe_version: PROBE_VERSION,
      metrics: { runs: 5, hard_total: 65, hard_skipped: 0, hard_executed: 65, hard_pct: 100, noise_total: 0, noise_per_run: 0, hard_errors: 0, hard_errors_per_run: 0 }
    }
  };
  const criteria = {
    engineName: 'Ombra Chromium',
    mode: 'headless',
    os: 'darwin 25.6.0 arm64',
    transport: 'http',
    probeVersion: PROBE_VERSION,
    hardOnly: true,
    sandbox: true,
    profilePlatform: null,
    startedAt: '2026-11-19T00:00:00.000Z'
  };
  assert.equal(isCompatibleBaseline(baseReport, criteria), true);
  assert.equal(isCompatibleBaseline(baseReport, { ...criteria, os: 'linux 6.8 x64' }), false);
  assert.equal(isCompatibleBaseline(baseReport, { ...criteria, transport: 'file' }), false);
  assert.equal(isCompatibleBaseline(baseReport, { ...criteria, probeVersion: '1.0.0' }), false);
  assert.equal(isCompatibleBaseline({ ...baseReport, environment: { ...baseReport.environment, sandbox: false } }, criteria), false);

  const reg = diffBaseline({
    baselineReport: baseReport,
    baselineFile: 'checks/results/base.json',
    currentTargets: [{ id: 'L1-01', status: 'DEGRADED' }, { id: 'L5-01', status: 'PASS' }],
    currentMetrics: { runs: 10, hard_total: 65, hard_skipped: 1, hard_executed: 64, hard_pct: 100, noise_per_run: 0, hard_errors_per_run: 0 },
    currentVerdict: 'PASS_WITH_GAPS'
  });
  assert.ok(reg.regressions.some((r) => r.includes('L1-01: PASS -> DEGRADED')));
  assert.ok(reg.regressions.some((r) => r.includes('verdict: PASS -> PASS_WITH_GAPS')));
  assert.ok(reg.regressions.some((r) => r.includes('hard probe coverage: 65 -> 64')));
  assert.equal(Object.prototype.hasOwnProperty.call(TARGET_RANK, 'INCOMPLETE'), false);
});

test('redactReport preserves probe.s and sanitized checks.error while stripping values and secrets', () => {
  const report = {
    targets: [{ id: 'L5-01', status: 'UNREACHABLE', failures: ['crash in /tmp/ombra-secret-dir with seed-99999'] }],
    checks: {
      flags: ['--headless=new', '--fingerprint=seed-99999', '--user-data-dir=/tmp/ombra-secret-dir'],
      error: 'failed at /tmp/ombra-secret-dir (seed-99999)',
      runs: [{
        probes: {
          'auto.permissions': { c: 'hard', h: 'abc', v: { skipped: 'file-origin' }, s: 'file-origin', ok: true }
        }
      }]
    }
  };
  const redacted = redactReport(report, { profileDir: '/tmp/ombra-secret-dir', seed: 'seed-99999' });
  assert.equal('v' in redacted.checks.runs[0].probes['auto.permissions'], false);
  assert.equal(redacted.checks.runs[0].probes['auto.permissions'].s, 'file-origin');
  assert.deepEqual(redacted.checks.flags, ['--headless=new']);
  assert.ok(redacted.checks.error.includes('<redacted>'));
  assert.ok(!redacted.checks.error.includes('seed-99999'));
  assert.ok(!redacted.checks.error.includes('/tmp/ombra-secret-dir'));
});

test('fp-core.js compare handles skipped probes, denominator===0, and UNSTABLE before INCOMPLETE', () => {
  const src = readFileSync(join(BENCH_DIR, 'probe', 'fp-core.js'), 'utf8');
  const ctx = {
    window: { location: { protocol: 'http:' } },
    document: {},
    navigator: {},
    screen: {},
    performance: { now: () => 0 }
  };
  vm.runInNewContext(src, ctx);
  const { compare } = ctx.window.FPAudit;

  // hard-only snapshots must not flag uncollected context probes as missing
  const b1 = { probes: { 'nav.userAgent': { c: 'hard', ok: true, h: 'aaa', s: null, n: false } } };
  const b2 = { probes: { 'nav.userAgent': { c: 'hard', ok: true, h: 'aaa', s: null, n: false } } };
  const okRes = compare(b1, b2, { strict: true });
  assert.equal(okRes.verdict, 'STABLE');
  assert.equal(okRes.contextBad.length, 0);

  // hardBad must win over hardMissing (UNSTABLE, not INCOMPLETE)
  const badBase = {
    probes: {
      'nav.userAgent': { c: 'hard', ok: true, h: 'aaa', s: null, n: false },
      'nav.platform': { c: 'hard', ok: true, h: 'bbb', s: null, n: false }
    }
  };
  const badCur = {
    probes: {
      'nav.userAgent': { c: 'hard', ok: true, h: 'zzz', s: null, n: false }
    }
  };
  assert.equal(compare(badBase, badCur).verdict, 'UNSTABLE');

  // denominator === 0 (all absent) -> INCOMPLETE and 0%
  const abs1 = { probes: { 'nav.userAgent': { c: 'hard', ok: false, h: null, s: null, n: false } } };
  const abs2 = { probes: { 'nav.userAgent': { c: 'hard', ok: false, h: null, s: null, n: false } } };
  const absRes = compare(abs1, abs2);
  assert.equal(absRes.verdict, 'INCOMPLETE');
  assert.equal(absRes.hard.pct, 0);

  // skipped probe tracked in hardSkipped and excluded from same
  const sk1 = {
    probes: {
      'nav.userAgent': { c: 'hard', ok: true, h: 'aaa', s: null, n: false },
      'auto.permissions': { c: 'hard', ok: true, h: 'skip', s: 'file-origin', n: false }
    }
  };
  const skRes = compare(sk1, sk1);
  assert.equal(skRes.hard.denominator, 1);
  assert.equal(skRes.hardSkipped.length, 1);
  assert.equal(skRes.hard.pct, 100);
});

test('reportVerdict and metricsFor compute expected verdicts and rates', () => {
  const s1 = makeCleanSnapshot('s1');
  const s2 = makeCleanSnapshot('s2');
  const comp = [compareSnapshots(s1, s2)];
  const m = metricsFor([s1, s2], comp, { expectedRuns: 2, seedCheck: { checked: true, changed: true } });
  assert.equal(m.hard_pct, 100);
  assert.equal(m.seed_changed, true);
  assert.equal(m.noise_per_run, 0);
  assert.equal(reportVerdict([{ status: 'PASS' }, { status: 'DEGRADED' }], []), 'PASS_WITH_GAPS');
  assert.equal(reportVerdict([{ status: 'PASS' }], ['hard stability: 100% -> 98%']), 'FAIL');
});

test('fp-core.js executes Android mobile consistency cleanly and detects Runtime.enable leak + __ombra', async () => {
  const src = readFileSync(join(BENCH_DIR, 'probe', 'fp-core.js'), 'utf8');
  const androidNav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv81',
    language: 'en-US',
    languages: ['en-US'],
    plugins: [],
    mimeTypes: [],
    maxTouchPoints: 5,
    webdriver: false,
    userAgentData: { platform: 'Android', mobile: true, brands: [{ brand: 'Chromium', version: '151' }] }
  };
  const win = {
    location: { protocol: 'http:' },
    navigator: androidNav,
    screen: { width: 412, height: 915 },
    outerWidth: 412,
    outerHeight: 915,
    chrome: { app: {}, runtime: {} },
    __ombra: { leaked: true }
  };
  const ctx = {
    window: win,
    document: { createElement: () => ({ getContext: () => null }) },
    navigator: androidNav,
    screen: win.screen,
    performance: { now: () => 0 },
    // Simulate Runtime.enable console serialization invoking error.stack getter
    console: { debug: (arg) => { void arg.stack; } },
    Error,
    Object,
    Array,
    Promise,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(src, ctx);

  // Run only the targeted automation probes via FPAudit.run
  const snap = await ctx.window.FPAudit.run({ hardOnly: true, doubleRun: false });
  assert.equal(snap.probes['auto.consistency'].v.chromeNoPlugins, false);
  assert.equal(snap.probes['auto.consistency'].v.uaPlatformMismatch, false);
  assert.equal(snap.probes['auto.consistency'].v.uaMobileMismatch, false);
  assert.equal(snap.probes['auto.headless'].v.pluginsZero, false);
  assert.equal(snap.probes['auto.runtimeLeak'].v.leaked, true);
  assert.ok(snap.probes['auto.cdp'].v.includes('__ombra'));
});

