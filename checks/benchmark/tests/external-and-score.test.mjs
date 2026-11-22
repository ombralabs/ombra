import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHECKER_ORDER,
  EXTERNAL_PRESETS,
  resolveExternalSelection,
  detectChallengeWall,
  scrubIps,
  parseTlsResponse,
  parseIpLeakData,
  parseSannysoftRows,
  parseIntoliRows,
  parseCreepjsData,
  parseFingerprintjsData,
  parseBrowserscanText,
  parsePixelscanText,
  parseIpheyText,
  parseRebrowserDetections,
  parseDeviceInfoData
} from '../external.mjs';
import {
  computeQualityScore,
  compareQuality,
  renderMarkdownTable,
  formatQualitySummary
} from '../score.mjs';
import {
  parseArgs,
  buildEngineFlags,
  isCompatibleBaseline,
  diffBaseline,
  redactReport,
  PROBE_VERSION
} from '../lib.mjs';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const BENCH_DIR = dirname(TESTS_DIR);

test('external.mjs never sends CDP Runtime.enable (conformance SI-01)', () => {
  const src = readFileSync(join(BENCH_DIR, 'external.mjs'), 'utf8');
  assert.ok(!/send\s*\(\s*['"]Runtime\.enable['"]/.test(src), 'external.mjs must not call Runtime.enable');
});

test('resolveExternalSelection handles presets, comma lists, deduplication, and invalid names', () => {
  assert.deepEqual(resolveExternalSelection(true), CHECKER_ORDER);
  assert.deepEqual(resolveExternalSelection('fast'), EXTERNAL_PRESETS.fast);
  assert.deepEqual(resolveExternalSelection('sannysoft,rebrowser,sannysoft'), ['sannysoft', 'rebrowser']);
  assert.throws(() => resolveExternalSelection('nonexistent'), /unknown external checker/);
});

test('parseArgs validates --external, --proxy (SI-06), --min-score, and --retries', () => {
  const parsed = parseArgs([
    '--external', 'fast',
    '--proxy', 'socks5://127.0.0.1:10808',
    '--proxy-country', 'DE',
    '--min-score', '90',
    '--score-tolerance', '3',
    '--retries', '2'
  ]);
  assert.equal(parsed.external, 'fast');
  assert.equal(parsed.proxy, 'socks5://127.0.0.1:10808');
  assert.equal(parsed.proxyCountry, 'DE');
  assert.equal(parsed.minScore, 90);
  assert.equal(parsed.scoreTolerance, 3);
  assert.equal(parsed.retries, 2);

  // Bare --external defaults to 'all'
  assert.equal(parseArgs(['--external', '--headless']).external, 'all');
  assert.equal(parseArgs(['--external-only']).external, 'all');

  // Embedded credentials must be rejected (SI-06)
  assert.throws(() => parseArgs(['--proxy', 'http://user:pass@proxy.example:8080']), /credentials/);
  assert.throws(() => buildEngineFlags({ profileDir: '/tmp/p', mode: 'headless', sandbox: true, seed: '1', proxy: 'http://u:p@h:80' }), /credentials/);
  assert.throws(() => parseArgs(['--min-score', '120']), /min-score/);
  assert.throws(() => parseArgs(['--retries', '9']), /retries/);
});

test('detectChallengeWall identifies Cloudflare/WAF gates and Chromium ERR_* pages without false positives', () => {
  assert.ok(detectChallengeWall('Just a moment...', 'Checking if the site connection is secure'));
  assert.ok(detectChallengeWall('Attention Required! | Cloudflare', 'Please complete the security check'));
  assert.ok(detectChallengeWall('browserleaks.com', 'Не удается получить доступ\nERR_CONNECTION_RESET'));
  assert.equal(detectChallengeWall('Antibot Test', 'WebDriver passed'), null);
});

test('parseTlsResponse evaluates clean Chrome H2/JA4, HeadlessChrome fail, and fallback degraded', () => {
  const pass = parseTlsResponse({
    http_version: 'h2',
    tls: { ja4: 't13d1516h2_8daaf6152771_e5627efa2ab1', ja3_hash: 'abc123' },
    http2: {
      akamai_fingerprint_hash: '52d84b11737d980aef856699f885ca86',
      sent_frames: [{ headers: ['user-agent: Mozilla/5.0 Chrome/158.0.0.0', 'sec-ch-ua: "Chromium";v="158"'] }]
    }
  });
  assert.equal(pass.status, 'PASS');
  assert.equal(pass.metrics.ja4, 't13d1516h2_8daaf6152771_e5627efa2ab1');
  assert.equal(pass.metrics.has_sec_ch_ua, true);

  const headlessFail = parseTlsResponse({
    http_version: 'h2',
    user_agent: 'Mozilla/5.0 HeadlessChrome/158.0.0.0',
    tls: { ja4: 't13d1516h2_8daaf6152771_e5627efa2ab1' },
    http2: { akamai_fingerprint_hash: '52d84b' }
  });
  assert.equal(headlessFail.status, 'FAIL');
  assert.equal(headlessFail.critical, true);

  const fallback = parseTlsResponse({ ja3_hash: 'abc', ja4: 't13d1516h2_a_b' }, 'tls.browserleaks.com');
  assert.equal(fallback.status, 'DEGRADED');
  assert.ok(fallback.known_gap);
});

test('parseIpLeakData catches host IP leak under proxy, RFC1918 WebRTC leak, and redacts raw IPs', () => {
  const cleanDirect = parseIpLeakData({
    httpJson: { ip: '203.0.113.55', country_code: 'DE' },
    webrtcText: 'No WebRTC leak 127.0.0.1',
    webrtcCandidates: ['candidate:1 1 udp 2113937151 a1b2c3.local 54321 typ host'],
    proxyUsed: false
  });
  assert.equal(cleanDirect.status, 'PASS');
  assert.equal(cleanDirect.metrics.exit_country, 'DE');
  assert.ok(!JSON.stringify(cleanDirect).includes('203.0.113.55'));

  const leakedProxy = parseIpLeakData({
    httpJson: { ip: '198.51.100.20', country_code: 'NL' },
    webrtcText: 'Public IP: 203.0.113.55',
    hostIp: '203.0.113.55',
    proxyUsed: true
  });
  assert.equal(leakedProxy.status, 'FAIL');
  assert.equal(leakedProxy.critical, true);
  assert.ok(leakedProxy.flags.includes('real-ip-webrtc'));
  assert.ok(!JSON.stringify(leakedProxy).includes('203.0.113.55'));

  const localLeak = parseIpLeakData({
    httpJson: { ip: '198.51.100.20', country_code: 'NL' },
    webrtcCandidates: ['candidate:1 1 udp 2113937151 192.168.1.42 54321 typ host'],
    proxyUsed: false
  });
  assert.equal(localLeak.status, 'FAIL');
  assert.ok(localLeak.flags.includes('webrtc-local-ip-leak'));
});

test('parseSannysoftRows and parseIntoliRows distinguish PASS, minor DEGRADED, and critical FAIL', () => {
  const rows = [
    'User Agent', 'WebDriver', 'WebDriver (New)', 'Chrome', 'Chrome (New)',
    'Permissions', 'Plugins Length', 'Languages', 'WebGL Renderer', 'Hairline Feature'
  ].map((name) => ({ name, value: 'ok', failed: false }));
  assert.equal(parseSannysoftRows(rows).status, 'PASS');

  const minorRed = rows.map((r) => (r.name === 'Hairline Feature' ? { ...r, failed: true } : r));
  const degraded = parseSannysoftRows(minorRed);
  assert.equal(degraded.status, 'DEGRADED');
  assert.ok(degraded.known_gap);

  const wdRed = rows.map((r) => (r.name === 'WebDriver (New)' ? { ...r, failed: true } : r));
  const failed = parseSannysoftRows(wdRed);
  assert.equal(failed.status, 'FAIL');
  assert.equal(failed.critical, true);

  assert.equal(parseIntoliRows(rows.slice(0, 6)).status, 'PASS');
  assert.equal(parseIntoliRows(rows.slice(0, 6).map((r, i) => (i === 1 ? { ...r, failed: true } : r))).status, 'FAIL');
});

test('parseCreepjsData, parseBrowserscanText, parsePixelscanText, parseIpheyText, parseRebrowserDetections, parseDeviceInfoData', () => {
  // CreepJS: 31% like headless is normal (stock Chrome), 0 lies -> PASS
  const cPass = parseCreepjsData({ text: 'FP ID: 1234abcd5678\n31% like headless\n0% headless\n0% stealth', lies: [] });
  assert.equal(cPass.status, 'PASS');
  const cFail = parseCreepjsData({ text: 'FP ID: 1234abcd5678\n0% headless\n20% stealth', lies: ['Canvas'] });
  assert.equal(cFail.status, 'FAIL');
  assert.equal(cFail.critical, true);

  // FingerprintJS OSS reload stability (L2-02)
  const fpPass = parseFingerprintjsData({ firstId: '5c45c679c2151ef6a23b3573d72e3072', secondId: '5c45c679c2151ef6a23b3573d72e3072', confidence: 0.5 });
  assert.equal(fpPass.status, 'PASS');
  assert.equal(fpPass.metrics.reload_stable, true);
  assert.ok(!JSON.stringify(fpPass).includes('5c45c679c2151ef6a23b3573d72e3072'));
  const fpDrift = parseFingerprintjsData({ firstId: 'aaaa1111bbbb2222', secondId: 'cccc3333dddd4444' });
  assert.equal(fpDrift.status, 'FAIL');
  assert.equal(fpDrift.critical, true);

  // BrowserScan
  const bPass = parseBrowserscanText('Browser fingerprint authenticity: 100%\nBot Detection:\nNoDetection\n');
  assert.equal(bPass.status, 'PASS');
  const bDeg = parseBrowserscanText('Browser fingerprint authenticity: 90%\nBot Detection:\nNoDetection\nWebGL\n-10%\n');
  assert.equal(bDeg.status, 'DEGRADED');
  assert.equal(bDeg.metrics.authenticity_pct, 90);
  const bBot = parseBrowserscanText('Browser fingerprint authenticity: 60%\nBot Detection:\nDetected\nBot Control\n-40%\n');
  assert.equal(bBot.status, 'FAIL');
  assert.equal(bBot.critical, true);

  // Pixelscan: proxy flag ignored when proxyUsed=true; Masking detected always FAIL
  const pClean = parsePixelscanText('Your Browser Fingerprint is consistent\nNo automated behavior detected\nProxy detected', { proxyUsed: true });
  assert.equal(pClean.status, 'PASS');
  const pMask = parsePixelscanText('Your Browser Fingerprint is inconsistent\nMasking detected', { proxyUsed: false });
  assert.equal(pMask.status, 'FAIL');
  assert.equal(pMask.critical, true);

  // IPhey
  const iPass = parseIpheyText('Your Digital Identity Looks\nTrustworthy\n99\nMX SCORE\nBROWSER\nChrome 158\nHARDWARE\nEverything is fine\nSOFTWARE\nEverything is fine');
  assert.equal(iPass.status, 'PASS');
  const iFail = parseIpheyText('Your Digital Identity Looks\nUnreliable\nBROWSER\nClick here to see\nHARDWARE\nEverything is fine');
  assert.equal(iFail.status, 'FAIL');

  // rebrowser
  const rPass = parseRebrowserDetections([
    { type: 'runtimeEnableLeak', rating: 0 },
    { type: 'navigatorWebdriver', rating: 0 },
    { type: 'sourceUrlLeak', rating: 0 }
  ]);
  assert.equal(rPass.status, 'PASS');
  const rWarn = parseRebrowserDetections([
    { type: 'runtimeEnableLeak', rating: 0 },
    { type: 'viewport', rating: 0.5 }
  ]);
  assert.equal(rWarn.status, 'DEGRADED');
  const rLeak = parseRebrowserDetections([
    { type: 'runtimeEnableLeak', rating: 1 },
    { type: 'navigatorWebdriver', rating: 0 }
  ]);
  assert.equal(rLeak.status, 'FAIL');
  assert.equal(rLeak.critical, true);

  // deviceandbrowserinfo
  assert.equal(parseDeviceInfoData({ text: 'You are human!' }).status, 'PASS');
  assert.equal(parseDeviceInfoData({ text: 'You are a bot', details: { isBot: true, isHeadless: true } }).status, 'FAIL');
});

test('computeQualityScore enforces layer weights, anti-gaming caps, grades, and baseline score regressions', () => {
  // All green full suite -> 100 / A+
  const fullGreen = computeQualityScore([
    { id: 'L0-02', status: 'PASS', failures: [] },
    { id: 'L0-03', status: 'PASS', failures: [] },
    { id: 'L1-01', status: 'PASS', failures: [] },
    { id: 'L1-02', status: 'PASS', failures: [] },
    { id: 'L2-01', status: 'PASS', failures: [] },
    { id: 'L2-03', status: 'PASS', failures: [], metrics: { authenticity_pct: 100 } },
    { id: 'L3-01', status: 'PASS', failures: [] },
    { id: 'L5-01', status: 'PASS', failures: [] },
    { id: 'L5-02', status: 'PASS', failures: [] }
  ]);
  assert.equal(fullGreen.score, 100);
  assert.equal(fullGreen.grade, 'A+');
  assert.equal(fullGreen.meets_floor, true);
  assert.equal(fullGreen.cap_applied, null);

  // Critical leak (L3-01 FAIL) MUST cap overall score <= 49 and grade F even if everything else passed
  const criticalLeak = computeQualityScore([
    { id: 'L0-02', status: 'PASS', failures: [] },
    { id: 'L0-03', status: 'PASS', failures: [] },
    { id: 'L1-01', status: 'PASS', failures: [] },
    { id: 'L2-01', status: 'PASS', failures: [] },
    { id: 'L3-01', status: 'FAIL', critical: true, failures: ['critical CDP/automation leaks: runtimeEnableLeak'] },
    { id: 'L5-01', status: 'PASS', failures: [] }
  ]);
  assert.ok(criticalLeak.score <= 49, `expected capped score <=49, got ${criticalLeak.score}`);
  assert.equal(criticalLeak.grade, 'F');
  assert.equal(criticalLeak.cap_applied, 49);
  assert.equal(criticalLeak.meets_floor, false);

  // Non-critical external FAIL caps at 69 (cannot reach A/B)
  const nonCriticalFail = computeQualityScore([
    { id: 'L0-02', status: 'PASS', failures: [] },
    { id: 'L1-01', status: 'PASS', failures: [] },
    { id: 'L2-05', status: 'FAIL', failures: ['IPhey verdict: unreliable'] },
    { id: 'L3-01', status: 'PASS', failures: [] },
    { id: 'L5-01', status: 'PASS', failures: [] }
  ]);
  assert.ok(nonCriticalFail.score <= 69);
  assert.equal(nonCriticalFail.cap_applied, 69);
  assert.notEqual(nonCriticalFail.grade, 'A');
  assert.notEqual(nonCriticalFail.grade, 'B');

  // Compare quality detects score regression beyond tolerance
  const degradedRun = computeQualityScore([
    { id: 'L0-02', status: 'PASS', failures: [] },
    { id: 'L1-01', status: 'PASS', failures: [] },
    { id: 'L2-03', status: 'DEGRADED', failures: ['authenticity 85%'], metrics: { authenticity_pct: 85 } },
    { id: 'L3-01', status: 'PASS', failures: [] },
    { id: 'L5-01', status: 'PASS', failures: [] }
  ]);
  const cmp = compareQuality(fullGreen, degradedRun, { tolerance: 2 });
  assert.ok(cmp.delta < 0);
  assert.ok(cmp.regressions.some((r) => r.includes('quality score:')));
  assert.ok(formatQualitySummary(degradedRun, cmp).includes('QUALITY:'));

  const md = renderMarkdownTable([{
    report: { started_at: '2026-11-22T12:00:00Z', engine: { version: '158.0.8127.37' }, environment: { mode: 'headless' }, verdict: 'PASS', targets: [] },
    quality: fullGreen,
    delta: 0
  }]);
  assert.ok(md.includes('| 2026-11-22 | 158.0.8127.37 |'));
});

test('diffBaseline handles external flag regression, tolerates transient external UNREACHABLE, and redactReport scrubs IPs & proxy', () => {
  const baseReport = {
    run_id: 'base-full',
    started_at: '2026-11-21T00:00:00Z',
    verdict: 'PASS',
    engine: { name: 'Ombra Chromium' },
    environment: { os: 'darwin 25 arm64', mode: 'headless', transport: 'http', sandbox: true, hard_only: true, profile_platform: null },
    targets: [
      { id: 'L1-01', status: 'PASS', failures: [] },
      { id: 'L2-03', status: 'PASS', failures: [], flags: [], metrics: { authenticity_pct: 100 } },
      { id: 'L3-01', status: 'PASS', failures: [], flags: [] }
    ],
    checks: {
      scope: 'full',
      probe_version: PROBE_VERSION,
      external: { version: '1.0.0', checkers: ['browserscan', 'rebrowser'] },
      metrics: { runs: 2, hard_total: 65, hard_skipped: 0, hard_executed: 65, hard_pct: 100, noise_per_run: 0, hard_errors_per_run: 0 }
    }
  };
  assert.equal(isCompatibleBaseline(baseReport, {
    engineName: 'Ombra Chromium', mode: 'headless', os: 'darwin 25 arm64', transport: 'http',
    probeVersion: PROBE_VERSION, hardOnly: true, sandbox: true, profilePlatform: null,
    scope: 'full', externalVersion: '1.0.0', startedAt: '2026-11-22T00:00:00Z'
  }), true);
  assert.equal(isCompatibleBaseline(baseReport, {
    engineName: 'Ombra Chromium', mode: 'headless', os: 'darwin 25 arm64', transport: 'http',
    probeVersion: PROBE_VERSION, hardOnly: true, sandbox: true, profilePlatform: null,
    scope: 'local', startedAt: '2026-11-22T00:00:00Z'
  }), false);

  // External target becoming UNREACHABLE does not produce a false stealth regression
  const transient = diffBaseline({
    baselineReport: baseReport,
    baselineFile: 'checks/results/base.json',
    currentTargets: [
      { id: 'L1-01', status: 'PASS', failures: [] },
      { id: 'L2-03', status: 'UNREACHABLE', failures: ['blocked by WAF'], flags: [] },
      { id: 'L3-01', status: 'PASS', failures: [], flags: [] }
    ],
    currentMetrics: baseReport.checks.metrics,
    currentVerdict: 'INCOMPLETE',
    currentQuality: computeQualityScore([
      { id: 'L1-01', status: 'PASS', failures: [] },
      { id: 'L2-03', status: 'UNREACHABLE', failures: ['blocked by WAF'] },
      { id: 'L3-01', status: 'PASS', failures: [] }
    ])
  });
  assert.equal(transient.regressions.length, 0);

  // New flag on external detector triggers regression
  const regressed = diffBaseline({
    baselineReport: baseReport,
    baselineFile: 'checks/results/base.json',
    currentTargets: [
      { id: 'L1-01', status: 'PASS', failures: [] },
      { id: 'L2-03', status: 'DEGRADED', failures: ['authenticity 85%'], flags: ['WebGL(-15%)'], metrics: { authenticity_pct: 85 } },
      { id: 'L3-01', status: 'PASS', failures: [], flags: [] }
    ],
    currentMetrics: baseReport.checks.metrics,
    currentVerdict: 'PASS_WITH_GAPS',
    currentQuality: computeQualityScore([
      { id: 'L1-01', status: 'PASS', failures: [] },
      { id: 'L2-03', status: 'DEGRADED', failures: ['authenticity 85%'], metrics: { authenticity_pct: 85 } },
      { id: 'L3-01', status: 'PASS', failures: [] }
    ])
  });
  assert.ok(regressed.regressions.some((r) => r.includes('L2-03: PASS -> DEGRADED')));
  assert.ok(regressed.regressions.some((r) => r.includes('L2-03 new flag(s): WebGL(-15%)')));

  // Redaction strips proxy flag and raw IPs
  assert.equal(scrubIps('exit 203.0.113.10 loopback 127.0.0.1'), 'exit <ip> loopback 127.0.0.1');
  const redacted = redactReport({
    targets: [{ id: 'L0-02', status: 'FAIL', failures: ['leak 203.0.113.10 via socks5://10.0.0.2:1080'] }],
    checks: {
      flags: ['--headless=new', '--proxy-server=socks5://10.0.0.2:1080', '--fingerprint=12345'],
      error: 'proxy socks5://10.0.0.2:1080 failed on 203.0.113.10',
      runs: []
    }
  }, { proxy: 'socks5://10.0.0.2:1080', seed: '12345', hostIp: '203.0.113.10' });
  assert.deepEqual(redacted.checks.flags, ['--headless=new']);
  assert.ok(!JSON.stringify(redacted).includes('203.0.113.10'));
  assert.ok(!JSON.stringify(redacted).includes('socks5://10.0.0.2:1080'));
});
