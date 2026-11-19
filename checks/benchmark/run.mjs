#!/usr/bin/env node
/*
 * Ombra checks — local fingerprint benchmark.
 *
 * Launches the Ombra Chromium engine N times with one profile and one
 * fingerprint seed, runs the bundled local probe through CDP, compares the
 * hard probes and writes a conformance report to checks/results/.
 *
 * The report follows conformance/schema/report.schema.json and covers:
 *   L1-01  local fingerprint probe
 *   L5-01  seed stability across cold starts
 *
 * No npm dependencies. Node.js 22+ (global fetch/WebSocket).
 */

import { spawn, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir, platform, release, arch, homedir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';

const BENCH_DIR = dirname(fileURLToPath(import.meta.url));
const PROBE_DIR = join(BENCH_DIR, 'probe');
const CHECKS_DIR = dirname(BENCH_DIR);
const REPO_ROOT = dirname(CHECKS_DIR);
const RESULTS_DIR = join(CHECKS_DIR, 'results');
const PROBE_VERSION = '1.0.0';
const CONTRACT_VERSION = '0.1.0';
const DEFAULT_SEED = 20261119;

const DEFAULTS = {
  runs: 5,
  timeout: 120000,
  mode: 'headed',
  transport: 'http',
  sandbox: true,
  doubleRun: true,
  hardOnly: true,
  redact: true,
  keep: false,
  seed: DEFAULT_SEED,
  operator: process.env.USER || process.env.USERNAME || 'local'
};

const TARGET_RANK = { INCOMPLETE: 0, UNREACHABLE: 1, FAIL: 1, DEGRADED: 2, PASS: 3 };

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`missing value for ${arg}`);
      return value;
    };
    switch (arg) {
      case '--runs': args.runs = Math.max(1, Number(next())); break;
      case '--engine': args.engine = next(); break;
      case '--chrome': args.engine = next(); break;
      case '--profile': args.profile = resolve(next()); break;
      case '--out': args.out = resolve(next()); break;
      case '--baseline': args.baseline = resolve(next()); break;
      case '--seed': args.seed = Number(next()); break;
      case '--operator': args.operator = next(); break;
      case '--timeout': args.timeout = Math.max(10000, Number(next())); break;
      case '--mode':
        args.mode = next();
        if (!['headed', 'headless'].includes(args.mode)) throw new Error('--mode must be headed or headless');
        break;
      case '--transport':
        args.transport = next();
        if (!['http', 'file'].includes(args.transport)) throw new Error('--transport must be http or file');
        break;
      case '--headless': args.mode = 'headless'; break;
      case '--headed': args.mode = 'headed'; break;
      case '--no-sandbox': args.sandbox = false; break;
      case '--no-double': args.doubleRun = false; break;
      case '--hard-only': args.hardOnly = true; break;
      case '--all-probes': args.hardOnly = false; break;
      case '--keep': args.keep = true; break;
      case '--no-redact': args.redact = false; break;
      case '-h':
      case '--help': printHelp(); process.exit(0); break;
      default:
        throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.seed) || args.seed < 0) throw new Error('--seed must be a non-negative integer');
  return args;
}

function printHelp() {
  console.log(`Ombra fingerprint benchmark

Usage:
  node checks/benchmark/run.mjs [options]

Options:
  --runs N          cold starts (default 5)
  --engine PATH     Ombra Chromium binary (default: selected installed engine)
  --profile DIR     reuse an existing profile (default: temporary profile)
  --out FILE        report path (default: checks/results/<run_id>.json)
  --baseline FILE   compare against a specific previous report
  --seed N          fingerprint seed passed as --fingerprint=N (default ${DEFAULT_SEED})
  --mode MODE       headed | headless (default headed)
  --transport MODE  http (default) or file for hosts where loopback HTTP is blocked
  --headless        alias for --mode headless
  --no-sandbox      pass --no-sandbox on hosts where the Chromium sandbox is unavailable
  --no-double       disable the probe's two-pass noise detection
  --all-probes      include context/volatile probes (default: hard-only)
  --timeout MS      per-run evaluation timeout (default 120000)
  --keep            keep the temporary profile
  --no-redact       keep raw probe values in the JSON (local debugging only)
  --operator NAME   value written to report.operator

The report is saved to checks/results/ and follows
conformance/schema/report.schema.json. Exit code 0 means PASS; 1 means
PASS_WITH_GAPS or FAIL; 2 means the benchmark could not be completed.
`);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fileExists(path) {
  try { await access(path, fsConstants.F_OK); return true; } catch { return false; }
}

async function hashFile(path) {
  const data = await readFile(path);
  return createHash('sha256').update(data).digest('hex');
}

async function detectVersion(binary) {
  return new Promise((resolvePromise) => {
    execFile(binary, ['--version'], { timeout: 15000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const text = `${stdout || ''}\n${stderr || ''}`;
      const match = text.match(/Chromium\s+([0-9.]+)/i) || text.match(/(\d+\.\d+\.\d+\.\d+)/);
      resolvePromise(match ? match[1] : 'unknown');
    });
  });
}

async function normalizeEngine(candidate) {
  if (!candidate) return null;
  const info = await stat(candidate).catch(() => null);
  if (!info) return null;
  if (info.isFile()) return candidate;
  if (!info.isDirectory()) return null;

  const relativeCandidates = [
    'Chromium.app/Contents/MacOS/Chromium',
    'Contents/MacOS/Chromium',
    'Chromium',
    'chrome',
    'chromium'
  ];
  for (const item of relativeCandidates) {
    const path = join(candidate, item);
    if (await fileExists(path)) return path;
  }
  return null;
}

async function resolveEngine(explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  if (process.env.OMBRA_BINARY_PATH) candidates.push(process.env.OMBRA_BINARY_PATH);

  if (process.platform === 'darwin') {
    const engines = join(homedir(), 'Library', 'Application Support', 'Ombra', 'engines');
    try {
      const selection = JSON.parse(await readFile(join(engines, 'selection.json'), 'utf8'));
      if (selection.active) {
        candidates.push(join(engines, 'versions', selection.active, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
      }
    } catch { /* no selection */ }
    candidates.push(join(engines, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
  }

  for (const candidate of candidates) {
    const normalized = await normalizeEngine(candidate);
    if (normalized) return normalized;
  }

  throw new Error(
    'Ombra engine not found. Pass --engine /path/to/Chromium, set OMBRA_BINARY_PATH, ' +
    'or install an engine through the Ombra app.'
  );
}

async function engineInfo(binary) {
  const version = await detectVersion(binary);
  const versionDir = resolve(dirname(binary), '..', '..', '..');
  const archiveFile = join(versionDir, 'archive.sha256');
  let sha256 = null;
  let hashSource = 'binary';
  try {
    const text = (await readFile(archiveFile, 'utf8')).trim().split(/\s+/)[0];
    if (/^[0-9a-f]{64}$/i.test(text)) {
      sha256 = text.toLowerCase();
      hashSource = 'archive.sha256';
    }
  } catch { /* fall back to the binary */ }
  if (!sha256) sha256 = await hashFile(binary);

  const buildMatch = versionDir.match(/(\d+\.\d+\.\d+\.\d+-[0-9]+)/);
  return {
    name: 'Ombra Chromium',
    version: buildMatch ? buildMatch[1] : version,
    sha256,
    hash_source: hashSource,
    artifact: basename(versionDir),
    binary: basename(binary)
  };
}

function mimeType(path) {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

async function startProbeServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === '/' || pathname === '') pathname = '/index.html';
      const filePath = resolve(PROBE_DIR, '.' + pathname);
      if (filePath !== PROBE_DIR && !filePath.startsWith(PROBE_DIR + sep)) {
        response.writeHead(403);
        response.end('forbidden');
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        'Content-Type': mimeType(filePath),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      response.end(body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('not found');
    }
  });

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}/` };
}

async function buildStandalone() {
  const dir = await mkdtemp(join(tmpdir(), 'ombra-probe-'));
  const file = join(dir, 'probe.html');
  const [html, css, core, app] = await Promise.all([
    readFile(join(PROBE_DIR, 'index.html'), 'utf8'),
    readFile(join(PROBE_DIR, 'styles.css'), 'utf8'),
    readFile(join(PROBE_DIR, 'fp-core.js'), 'utf8'),
    readFile(join(PROBE_DIR, 'app.js'), 'utf8')
  ]);

  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'";
  let output = html.replace(/<meta http-equiv="Content-Security-Policy"[\s\S]*?>/i, `<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  output = output.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`);
  output = output.replace('<script src="fp-core.js"></script>', `<script>\n${core}\n</script>`);
  output = output.replace('<script src="app.js"></script>', `<script>\n${app}\n</script>`);
  await writeFile(file, output, 'utf8');
  return { dir, file, url: pathToFileURL(file).href };
}

class CDP {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolvePromise, reject) => {
      const onOpen = () => { cleanup(); resolvePromise(); };
      const onError = (event) => { cleanup(); reject(new Error(`WebSocket error: ${event.message || 'unknown'}`)); };
      const cleanup = () => {
        this.socket.removeEventListener('open', onOpen);
        this.socket.removeEventListener('error', onError);
      };
      this.socket.addEventListener('open', onOpen);
      this.socket.addEventListener('error', onError);
    });
    this.socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id) {
        const item = this.pending.get(message.id);
        if (!item) return;
        this.pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error.message || 'CDP error'));
        else item.resolve(message.result);
        return;
      }
      if (message.method) {
        const handlers = this.listeners.get(message.method);
        if (!handlers) return;
        for (const handler of handlers.slice()) handler(message.params, message.sessionId);
      }
    });
  }

  send(method, params = {}, sessionId) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('CDP socket is not open'));
    }
    const id = ++this.nextId;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.socket.send(JSON.stringify(payload));
    });
  }

  once(method, timeoutMs = 15000) {
    return new Promise((resolvePromise, reject) => {
      let timer = null;
      const handler = (params, sessionId) => {
        clearTimeout(timer);
        const handlers = this.listeners.get(method) || [];
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
        resolvePromise({ params, sessionId });
      };
      if (!this.listeners.has(method)) this.listeners.set(method, []);
      this.listeners.get(method).push(handler);
      timer = setTimeout(() => {
        const handlers = this.listeners.get(method) || [];
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
        reject(new Error(`timeout waiting for ${method}`));
      }, timeoutMs);
    });
  }

  close() {
    try { this.socket?.close(); } catch { /* ignore */ }
  }
}

function waitExit(child, timeoutMs = 12000) {
  return new Promise((resolvePromise) => {
    if (child.exitCode !== null) { resolvePromise(); return; }
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      resolvePromise();
    }, timeoutMs);
    child.once('exit', () => { clearTimeout(timer); resolvePromise(); });
  });
}

function evaluate(cdp, sessionId, expression, timeoutMs) {
  return cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs
  }, sessionId).then((response) => {
    if (response.exceptionDetails) {
      const details = response.exceptionDetails;
      const description = details.exception?.description || details.text || 'evaluation failed';
      throw new Error(description);
    }
    return response.result?.value;
  });
}

async function waitForPort(profileDir, timeoutMs) {
  const portFile = join(profileDir, 'DevToolsActivePort');
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const text = await readFile(portFile, 'utf8');
      const port = Number(text.trim().split(/\r?\n/)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch { /* not written yet */ }
    await sleep(120);
  }
  throw new Error(`DevToolsActivePort was not created in ${profileDir}`);
}

async function waitForVersion(port) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      lastStatus = response.status;
      if (response.ok) return response.json();
      const body = await response.text();
      if (body.includes('no_slot')) {
        throw new Error('engine license has no free slot; close other Ombra instances and retry');
      }
      lastStatus = `${response.status} ${body.slice(0, 120)}`;
    } catch (error) {
      if (error.message.includes('no free slot')) throw error;
    }
    await sleep(200);
  }
  throw new Error(`/json/version did not become ready (last HTTP ${lastStatus})`);
}

async function runOnce({ engine, profileDir, url, mode, sandbox, doubleRun, hardOnly, seed, timeout, index }) {
  try { await rm(join(profileDir, 'DevToolsActivePort'), { force: true }); } catch { /* ignore */ }

  const flags = [
    `--user-data-dir=${profileDir}`,
    '--remote-debugging-port=0',
    `--fingerprint=${seed}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--metrics-recording-only',
    '--mute-audio',
    '--window-size=1440,900',
    '--force-device-scale-factor=1',
    'about:blank'
  ];
  if (mode === 'headless') flags.unshift('--headless=new');
  if (!sandbox) flags.unshift('--no-sandbox', '--disable-gpu-sandbox');

  const child = spawn(engine, flags, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  child.stdout.on('data', () => { /* drain */ });

  let cdp = null;
  try {
    const port = await waitForPort(profileDir, 30000);
    const version = await waitForVersion(port);
    cdp = new CDP(version.webSocketDebuggerUrl);
    await cdp.connect();

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);

    const loaded = cdp.once('Page.loadEventFired', 20000).catch(() => null);
    await cdp.send('Page.navigate', { url }, sessionId);
    await loaded;

    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      ready = await evaluate(cdp, sessionId, 'Boolean(window.FPAudit && window.FPAudit.run)', 5000);
      if (ready) break;
      await sleep(100);
    }
    if (!ready) throw new Error('window.FPAudit did not initialize');

    const label = `cold ${index}`;
    const expression = `window.FPAudit.run({doubleRun:${doubleRun}, hardOnly:${hardOnly}, label:${JSON.stringify(label)}, profile:${JSON.stringify(`benchmark-${mode}`)}})`;
    const snapshot = await evaluate(cdp, sessionId, expression, timeout);
    if (!snapshot || !snapshot.probes) throw new Error('empty snapshot');

    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
    await cdp.send('Browser.close').catch(() => {});
    await waitExit(child, 12000);
    return { snapshot, flags };
  } catch (error) {
    try { child.kill('SIGKILL'); } catch { /* ignore */ }
    const tail = stderr.trim().split(/\r?\n/).slice(-10).join('\n');
    throw new Error(`${error.message}${tail ? `\nengine stderr:\n${tail}` : ''}`);
  } finally {
    if (cdp) cdp.close();
  }
}

function probeClass(probe) {
  return probe?.c || 'hard';
}

function statusOf(baseProbe, currentProbe) {
  if (!baseProbe || !currentProbe) return 'missing';
  if (!baseProbe.ok && !currentProbe.ok) return 'absent';
  if (!baseProbe.ok || !currentProbe.ok) return 'changed';
  if (baseProbe.n || currentProbe.n) return 'noisy';
  return baseProbe.h === currentProbe.h ? 'same' : 'changed';
}

function compareSnapshots(base, current) {
  const ids = new Set([...Object.keys(base.probes || {}), ...Object.keys(current.probes || {})]);
  const rows = [];
  for (const id of ids) {
    const baseProbe = base.probes?.[id];
    const currentProbe = current.probes?.[id];
    rows.push({
      id,
      cls: probeClass(baseProbe || currentProbe),
      status: statusOf(baseProbe, currentProbe)
    });
  }
  const hard = rows.filter((row) => row.cls === 'hard');
  const context = rows.filter((row) => row.cls === 'context');
  const hardBad = hard.filter((row) => row.status === 'changed' || row.status === 'noisy');
  const hardMissing = hard.filter((row) => row.status === 'missing');
  const contextBad = context.filter((row) => row.status === 'changed' || row.status === 'noisy' || row.status === 'missing');
  const pct = (subset) => {
    const denominator = subset.filter((row) => row.status !== 'absent').length;
    const same = subset.filter((row) => row.status === 'same').length;
    return denominator ? Math.round((same / denominator) * 1000) / 10 : 100;
  };
  return {
    hardPct: pct(hard),
    contextPct: pct(context),
    hardBad,
    hardMissing,
    contextBad
  };
}

function skippedProbes(snapshot) {
  const probes = snapshot?.probes || {};
  return Object.keys(probes).filter((id) => probes[id]?.v && probes[id].v.skipped);
}

function evaluateL101(snapshot) {
  const failures = [];
  const critical = [];
  const probes = snapshot?.probes || {};

  if (probes['nav.webdriver']?.v !== false) {
    critical.push(`navigator.webdriver=${JSON.stringify(probes['nav.webdriver']?.v)}`);
  }
  const cdpArtifacts = probes['auto.cdp']?.v;
  if (Array.isArray(cdpArtifacts) && cdpArtifacts.length) {
    critical.push(`CDP artifacts visible: ${cdpArtifacts.join(', ')}`);
  }
  const headless = probes['auto.headless']?.v || {};
  for (const [key, value] of Object.entries(headless)) {
    if (value) critical.push(`auto.headless.${key}=true`);
  }
  const consistency = probes['auto.consistency']?.v || {};
  for (const key of ['webdriver', 'mobileNoTouch', 'chromeNoPlugins', 'outerZero', 'screenZero']) {
    if (consistency[key]) critical.push(`auto.consistency.${key}=true`);
  }
  if (snapshot?.hardErr?.length) {
    failures.push(`unavailable hard probes: ${snapshot.hardErr.join(', ')}`);
  }
  if (probes['nav.uaData']?.v?.available === false) {
    failures.push('User-Agent Client Hints unavailable');
  }

  const status = critical.length ? 'FAIL' : failures.length ? 'DEGRADED' : 'PASS';
  return {
    id: 'L1-01',
    status,
    failures: critical.concat(failures),
    skipped: skippedProbes(snapshot),
    duration_ms: snapshot?.durationMs || 0,
    artifacts: ['benchmark/probe/index.html', 'benchmark/probe/fp-core.js']
  };
}

function evaluateL501(snapshots) {
  if (snapshots.length < 2) {
    return {
      id: 'L5-01',
      status: 'UNREACHABLE',
      failures: ['at least two cold starts are required'],
      duration_ms: snapshots.reduce((sum, snapshot) => sum + (snapshot.durationMs || 0), 0),
      artifacts: ['benchmark/probe/fp-core.js']
    };
  }

  const base = snapshots[0];
  const failures = [];
  const comparisons = snapshots.slice(1).map((snapshot) => compareSnapshots(base, snapshot));
  const hardBad = comparisons.flatMap((comparison) => comparison.hardBad);
  const hardMissing = comparisons.flatMap((comparison) => comparison.hardMissing);
  const noiseTotal = snapshots.reduce((sum, snapshot) => sum + (snapshot.hardNoisy?.length || 0), 0);
  const hardErrors = snapshots.flatMap((snapshot) => snapshot.hardErr || []);
  const minHardPct = Math.min(...comparisons.map((comparison) => comparison.hardPct));
  const hashes = new Set(snapshots.map((snapshot) => snapshot.hardHash));

  if (hardBad.length) {
    failures.push(`hard probes changed or became noisy: ${hardBad.map((row) => row.id).join(', ')}`);
  }
  if (hardMissing.length) {
    failures.push(`hard probes missing: ${hardMissing.map((row) => row.id).join(', ')}`);
  }
  if (noiseTotal) failures.push(`hard noise detected: ${noiseTotal} probe(s)`);
  if (minHardPct < 100) failures.push(`hard stability dropped to ${minHardPct}%`);
  if (hashes.size !== 1) failures.push('hard hash differs between cold starts');
  if (hardErrors.length) failures.push(`unavailable hard probes: ${[...new Set(hardErrors)].join(', ')}`);

  const critical = hardBad.length || noiseTotal || minHardPct < 100 || hashes.size !== 1;
  const degraded = hardMissing.length || hardErrors.length;
  const status = critical ? 'FAIL' : degraded ? 'DEGRADED' : 'PASS';

  return {
    id: 'L5-01',
    status,
    failures,
    duration_ms: snapshots.reduce((sum, snapshot) => sum + (snapshot.durationMs || 0), 0),
    artifacts: ['benchmark/probe/fp-core.js']
  };
}

function metricsFor(snapshots, comparisons) {
  const first = snapshots[0];
  return {
    runs: snapshots.length,
    probe_count: first?.counts?.total ?? Object.keys(first?.probes || {}).length,
    hard_total: first?.counts?.hard ?? 0,
    hard_stable: Math.min(...snapshots.map((snapshot) => snapshot.counts?.hardStable ?? 0)),
    hard_pct: comparisons.length ? Math.min(...comparisons.map((comparison) => comparison.hardPct)) : 100,
    noise_total: snapshots.reduce((sum, snapshot) => sum + (snapshot.hardNoisy?.length || 0), 0),
    hard_errors: snapshots.reduce((sum, snapshot) => sum + (snapshot.hardErr?.length || 0), 0),
    hard_hash: snapshots.every((snapshot) => snapshot.hardHash === first?.hardHash) ? first?.hardHash : null
  };
}

async function loadBaseline({ explicit, startedAt, engine, mode, outPath, currentTargets, currentMetrics }) {
  let file = null;
  if (explicit) {
    file = explicit;
    if (!(await fileExists(file))) throw new Error(`baseline not found: ${file}`);
  } else {
    const files = (await readdir(RESULTS_DIR).catch(() => []))
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(RESULTS_DIR, name))
      .filter((path) => path !== outPath);
    const reports = [];
    for (const path of files) {
      try {
        const report = JSON.parse(await readFile(path, 'utf8'));
        if (report?.engine?.name !== engine.name) continue;
        if (report?.environment?.mode !== mode) continue;
        if (!['PASS', 'PASS_WITH_GAPS'].includes(report?.verdict)) continue;
        if (report?.started_at && report.started_at >= startedAt) continue;
        reports.push({ path, report });
      } catch { /* skip malformed */ }
    }
    reports.sort((left, right) => String(left.report.started_at).localeCompare(String(right.report.started_at)));
    if (reports.length) file = reports[reports.length - 1].path;
  }

  if (!file) return { baseline: null, regressions: [] };

  const report = JSON.parse(await readFile(file, 'utf8'));
  const baselineTargets = new Map((report.targets || []).map((target) => [target.id, target.status]));
  const currentTargetMap = new Map((currentTargets || []).map((target) => [target.id, target.status]));
  const regressions = [];

  for (const [id, status] of currentTargetMap) {
    const previous = baselineTargets.get(id);
    if (previous && TARGET_RANK[status] < TARGET_RANK[previous]) {
      regressions.push(`${id}: ${previous} -> ${status}`);
    }
  }

  const previousMetrics = report.checks?.metrics || {};
  const current = currentMetrics || {};
  if (typeof previousMetrics.hard_pct === 'number' && previousMetrics.hard_pct > current.hard_pct) {
    regressions.push(`hard stability: ${previousMetrics.hard_pct}% -> ${current.hard_pct}%`);
  }
  if (typeof previousMetrics.hard_total === 'number' && previousMetrics.hard_total > current.hard_total) {
    regressions.push(`hard probe coverage: ${previousMetrics.hard_total} -> ${current.hard_total}`);
  }
  if (typeof previousMetrics.noise_total === 'number' && previousMetrics.noise_total < current.noise_total) {
    regressions.push(`hard noise: ${previousMetrics.noise_total} -> ${current.noise_total}`);
  }
  if (typeof previousMetrics.hard_errors === 'number' && previousMetrics.hard_errors < current.hard_errors) {
    regressions.push(`hard probe errors: ${previousMetrics.hard_errors} -> ${current.hard_errors}`);
  }

  return {
    baseline: {
      file: relative(REPO_ROOT, file),
      run_id: report.run_id,
      started_at: report.started_at,
      verdict: report.verdict,
      metrics: previousMetrics
    },
    regressions
  };
}

function reportVerdict(targets, regressions) {
  if (regressions.length) return 'FAIL';
  if (targets.some((target) => target.status === 'FAIL')) return 'FAIL';
  if (targets.some((target) => target.status === 'UNREACHABLE')) return 'INCOMPLETE';
  if (targets.some((target) => target.status === 'DEGRADED')) return 'PASS_WITH_GAPS';
  return 'PASS';
}

function makeRunId(startedAt, engineVersion, mode) {
  const stamp = startedAt.replace(/\.\d{3}Z$/, 'Z').replace(/[:]/g, '-');
  return `${stamp}-${engineVersion}-${mode}`.replace(/[^A-Za-z0-9._-]/g, '-');
}

function redactReport(report) {
  const copy = JSON.parse(JSON.stringify(report));
  for (const run of copy.checks?.runs || []) {
    for (const probe of Object.values(run.probes || {})) {
      if (probe && typeof probe === 'object') delete probe.v;
    }
  }
  copy.checks.flags = (copy.checks.flags || []).filter((flag) => !flag.startsWith('--user-data-dir='));
  delete copy.checks.error;
  return copy;
}

async function writeReport(report, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return relative(REPO_ROOT, outPath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!(await fileExists(join(PROBE_DIR, 'index.html')))) throw new Error(`probe not found: ${PROBE_DIR}`);

  const enginePath = await resolveEngine(args.engine);
  const engine = await engineInfo(enginePath);
  const startedAt = new Date().toISOString();
  const runId = makeRunId(startedAt, engine.version, args.mode);
  const outPath = args.out || join(RESULTS_DIR, `${runId}.json`);

  let profileDir = args.profile;
  let temporaryProfile = false;
  if (!profileDir) {
    profileDir = await mkdtemp(join(tmpdir(), 'ombra-check-'));
    temporaryProfile = true;
  } else {
    await mkdir(profileDir, { recursive: true });
  }

  let serverInfo = null;
  let standalone = null;
  const snapshots = [];
  const allFlags = new Set();
  let runError = null;

  console.log('Ombra fingerprint benchmark');
  console.log(`  engine:  ${engine.name} ${engine.version}`);
  console.log(`  sha256:  ${engine.sha256.slice(0, 16)}… (${engine.hash_source})`);
  console.log(`  mode:    ${args.mode}`);
  console.log(`  transport: ${args.transport}`);
  console.log(`  seed:    ${args.seed}`);
  console.log(`  profile: ${profileDir}${temporaryProfile ? ' (temporary)' : ''}`);
  console.log(`  runs:    ${args.runs}`);
  console.log('');

  try {
    let probeUrl;
    if (args.transport === 'file') {
      standalone = await buildStandalone();
      probeUrl = standalone.url;
    } else {
      serverInfo = await startProbeServer();
      probeUrl = serverInfo.url;
    }
    console.log(`  probe:   ${probeUrl}`);
    console.log('');

    for (let index = 1; index <= args.runs; index++) {
      const result = await runOnce({
        engine: enginePath,
        profileDir,
        url: probeUrl,
        mode: args.mode,
        sandbox: args.sandbox,
        doubleRun: args.doubleRun,
        hardOnly: args.hardOnly,
        seed: args.seed,
        timeout: args.timeout,
        index
      });
      snapshots.push(result.snapshot);
      for (const flag of result.flags) {
        if (flag.startsWith('--fingerprint=')) continue;
        if (flag.startsWith('--user-data-dir=')) continue;
        allFlags.add(flag);
      }
      console.log(
        `run ${index}/${args.runs}: hard=${result.snapshot.hardHash.slice(0, 12)} ` +
        `probes=${result.snapshot.counts.total} noise=${result.snapshot.noise.length} ` +
        `hardErrors=${result.snapshot.hardErr.length} duration=${result.snapshot.durationMs}ms`
      );
    }
  } catch (error) {
    runError = error;
    console.error(`benchmark failed: ${error.message}`);
  } finally {
    if (serverInfo) await new Promise((resolvePromise) => serverInfo.server.close(resolvePromise));
    if (standalone) await rm(standalone.dir, { recursive: true, force: true }).catch(() => {});
  }

  const targets = snapshots.length
    ? [evaluateL101(snapshots[0]), evaluateL501(snapshots)]
    : [
        { id: 'L1-01', status: 'UNREACHABLE', failures: [runError?.message || 'no run'], duration_ms: 0, artifacts: [] },
        { id: 'L5-01', status: 'UNREACHABLE', failures: [runError?.message || 'no run'], duration_ms: 0, artifacts: [] }
      ];
  const comparisons = snapshots.length > 1
    ? snapshots.slice(1).map((snapshot) => compareSnapshots(snapshots[0], snapshot))
    : [];
  const metrics = snapshots.length ? metricsFor(snapshots, comparisons) : null;
  const skipped = snapshots.length ? skippedProbes(snapshots[0]) : [];
  const seedHash = `sha256:${createHash('sha256').update(String(args.seed)).digest('hex')}`;

  let baseline = null;
  let regressions = [];
  if (!runError && snapshots.length) {
    try {
      const result = await loadBaseline({
        explicit: args.baseline,
        startedAt,
        engine,
        mode: args.mode,
        outPath,
        currentTargets: targets,
        currentMetrics: metrics
      });
      baseline = result.baseline;
      regressions = result.regressions;
    } catch (error) {
      console.error(`baseline comparison skipped: ${error.message}`);
    }
  }

  const verdict = runError ? 'INCOMPLETE' : reportVerdict(targets, regressions);
  const report = {
    run_id: runId,
    started_at: startedAt,
    operator: args.operator,
    sdk: {
      name: 'ombra-checks-probe',
      version: PROBE_VERSION,
      contract: CONTRACT_VERSION
    },
    engine: {
      name: engine.name,
      version: engine.version,
      sha256: engine.sha256,
      hash_source: engine.hash_source,
      artifact: engine.artifact,
      binary: engine.binary
    },
    environment: {
      os: `${platform()} ${release()} ${arch()}`,
      mode: args.mode,
      transport: args.transport,
      proxy_country: 'direct',
      seed_hash: seedHash,
      notes: [
        `sandbox=${args.sandbox ? 'enabled' : 'disabled'}`,
        `window=1440x900`,
        `probe=${PROBE_VERSION}`,
        `probes=${args.hardOnly ? 'hard-only' : 'all'}`,
        `transport=${args.transport}`,
        args.sandbox ? null : 'no-sandbox is required on this host; do not treat this run as an L0-01 pass'
      ].filter(Boolean).join('; ')
    },
    targets,
    verdict,
    checks: {
      probe_version: PROBE_VERSION,
      result_file: relative(REPO_ROOT, outPath),
      flags: [...allFlags].sort(),
      metrics,
      skipped,
      comparisons,
      runs: snapshots,
      baseline,
      regressions,
      error: runError ? runError.message : null
    }
  };

  const savedPath = await writeReport(args.redact ? redactReport(report) : report, outPath);
  console.log('');
  for (const target of targets) {
    console.log(`${target.id}: ${target.status}${target.failures.length ? ` (${target.failures.join('; ')})` : ''}`);
  }
  if (baseline) {
    console.log(`baseline: ${baseline.run_id} (${baseline.verdict})`);
  } else {
    console.log('baseline: none (first accepted run for this engine mode)');
  }
  if (regressions.length) {
    for (const regression of regressions) console.log(`REGRESSION: ${regression}`);
  }
  console.log(`result: ${savedPath}`);
  console.log(`VERDICT: ${verdict}`);

  if (temporaryProfile && !args.keep) {
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }

  if (verdict === 'PASS') return 0;
  if (verdict === 'PASS_WITH_GAPS' || verdict === 'FAIL') return 1;
  return 2;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`benchmark failed: ${error.message}`);
  process.exitCode = 2;
});
