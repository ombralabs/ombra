#!/usr/bin/env node
/*
 * Ombra checks — local fingerprint benchmark.
 *
 * Launches the Ombra Chromium engine N times with one profile and one
 * fingerprint seed, runs the bundled local probe through CDP (without
 * Runtime.enable), optionally verifies seed sensitivity with an alternate
 * seed, compares the hard probes, and writes a conformance report to
 * checks/results/.
 *
 * The report follows the format in AGENTS.md and covers:
 *   L1-01  local fingerprint probe (across all runs)
 *   L5-01  seed stability across cold starts + seed-change sensitivity
 *   L5-02  cross-context agreement (Main / Worker / iframe / detached iframe)
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

import {
  PROBE_VERSION,
  CONTRACT_VERSION,
  DEFAULT_SEED,
  VALID_PLATFORMS,
  defaultGapExpiry,
  deriveAlternateSeed,
  hashSeed,
  parseArgs,
  buildEngineFlags,
  candidateVersionDirs,
  extractBuildVersion,
  compareSnapshots,
  skippedProbes,
  evaluateL101,
  evaluateL501,
  evaluateL502,
  metricsFor,
  isCompatibleBaseline,
  diffBaseline,
  reportVerdict,
  redactReport
} from './lib.mjs';
import {
  EXTERNAL_VERSION,
  EXTERNAL_PRESETS,
  CHECKER_ORDER,
  DEFAULT_EXTERNAL_TIMEOUT,
  resolveExternalSelection,
  detectHostPublicIp,
  runExternalCheckers
} from './external.mjs';
import {
  DEFAULT_MIN_SCORE,
  computeQualityScore,
  formatQualitySummary
} from './score.mjs';

const BENCH_DIR = dirname(fileURLToPath(import.meta.url));
const PROBE_DIR = join(BENCH_DIR, 'probe');
const CHECKS_DIR = dirname(BENCH_DIR);
const REPO_ROOT = dirname(CHECKS_DIR);
const RESULTS_DIR = join(CHECKS_DIR, 'results');

function printHelp() {
  console.log(`Ombra fingerprint benchmark (probe v${PROBE_VERSION})

Usage:
  node checks/benchmark/run.mjs [options]

Options:
  --runs N                 cold starts with primary seed (default 5)
  --engine PATH            Ombra Chromium binary (default: selected installed engine)
  --profile DIR            reuse an existing profile (default: temporary profile)
  --out FILE               report path (default: checks/results/<run_id>.json)
  --baseline FILE          compare against a specific previous report (missing fails)
  --seed VALUE             primary fingerprint seed passed as --fingerprint=VALUE (default ${DEFAULT_SEED})
  --seed2 VALUE            alternate seed for L5-01 sensitivity check (default derived)
  --no-seed-check          skip the L5-01 alternate-seed sensitivity check
  --platform OS            pass --fingerprint-platform (${VALID_PLATFORMS.join('|')})
  --timezone TZ            pass --fingerprint-timezone=TZ
  --location LOC           pass --fingerprint-location=LOC
  --profile-preset NAME    pass --fingerprint-profile=NAME
  --dpr N                  pass --fingerprint-device-pixel-ratio=N (opt-in)
  --mode MODE              headed | headless (default headed)
  --transport MODE         http (default) or file for hosts where loopback HTTP is blocked
  --headless               alias for --mode headless
  --headed                 alias for --mode headed
  --no-sandbox             pass --no-sandbox on hosts where the Chromium sandbox is unavailable
  --no-double              disable the probe's two-pass noise detection
  --hard-only              run only hard probes (default)
  --all-probes             include context/volatile probes too
  --timeout MS             per-run evaluation timeout (default 120000)
  --keep                   keep the temporary profile
  --no-redact              keep raw probe values in the JSON (local debugging only)
  --operator NAME          value written to report.operator
  --known-gap-owner NAME   owner recorded on DEGRADED targets
  --known-gap-expires DATE expiry YYYY-MM-DD recorded on DEGRADED targets
  --external [LIST]        run external antidetect checkers (presets: ${Object.keys(EXTERNAL_PRESETS).join('|')}; or comma list: ${CHECKER_ORDER.join(',')})
  --external-only          skip local probe runs and execute external checkers only
  --external-timeout MS    per-external-checker timeout (default ${DEFAULT_EXTERNAL_TIMEOUT})
  --retries N              retries per UNREACHABLE external checker (default 1)
  --proxy URL              proxy URL for external checkers (no embedded credentials; e.g. socks5://127.0.0.1:10808)
  --proxy-country CC       ISO alpha-2 exit country code or "direct" (auto-detected if --proxy is set)
  --min-score N            minimum quality score floor 0..100 (default ${DEFAULT_MIN_SCORE})
  --score-tolerance N      allowed score delta vs baseline before regression (default 0 local / 2 external)

The report is saved to checks/results/ and follows
the report format in AGENTS.md. Exit code 0 means PASS; 1 means
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
    'Ombra.app/Contents/MacOS/Ombra',
    'Contents/MacOS/Ombra',
    'Chromium.app/Contents/MacOS/Chromium',
    'Contents/MacOS/Chromium',
    'Ombra',
    'ombra',
    'Chromium',
    'chrome',
    'chromium',
    'Ombra.exe',
    'chrome.exe',
    'chromium.exe',
    'Chromium.exe'
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

  const engineRoots = [];
  if (process.platform === 'darwin') {
    engineRoots.push(join(homedir(), 'Library', 'Application Support', 'Ombra', 'engines'));
  } else if (process.platform === 'linux') {
    const xdgData = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
    engineRoots.push(join(xdgData, 'Ombra', 'engines'));
    engineRoots.push(join(xdgData, 'ombra', 'engines'));
  } else if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    engineRoots.push(join(localAppData, 'Ombra', 'engines'));
  }

  for (const engines of [...engineRoots, join(homedir(), '.ombra', 'engines')]) {
    try {
      const selection = JSON.parse(await readFile(join(engines, 'selection.json'), 'utf8'));
      if (selection.active) {
        candidates.push(join(engines, 'versions', selection.active));
      }
    } catch { /* no selection */ }
    candidates.push(engines);
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
  const dirs = candidateVersionDirs(binary);
  const build = extractBuildVersion(dirs);

  let sha256 = null;
  let hashSource = 'binary';
  let artifactDir = build.dir;

  for (const dir of dirs) {
    const archiveFile = join(dir, 'archive.sha256');
    try {
      const text = (await readFile(archiveFile, 'utf8')).trim().split(/\s+/)[0];
      if (/^[0-9a-f]{64}$/i.test(text)) {
        sha256 = text.toLowerCase();
        hashSource = 'archive.sha256';
        artifactDir = dir;
        break;
      }
    } catch { /* try next ancestor */ }
  }
  if (!sha256) sha256 = await hashFile(binary);

  return {
    name: 'Ombra Chromium',
    version: build.version || version,
    sha256,
    hash_source: hashSource,
    artifact: basename(artifactDir || dirname(binary)),
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

  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'self' blob: about:; worker-src 'self' blob:; base-uri 'none'; form-action 'none'";
  let output = html.replace(
    /<meta http-equiv="Content-Security-Policy"[\s\S]*?>/i,
    () => `<meta http-equiv="Content-Security-Policy" content="${csp}">`
  );
  output = output.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
  output = output.replace('<script src="fp-core.js"></script>', () => `<script>\n${core}\n</script>`);
  output = output.replace('<script src="app.js"></script>', () => `<script>\n${app}\n</script>`);
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
    this.onCloseRejectors = new Set();
  }

  _failAll(reason) {
    const error = new Error(reason);
    for (const item of this.pending.values()) item.reject(error);
    this.pending.clear();
    for (const rejector of this.onCloseRejectors) rejector(error);
    this.onCloseRejectors.clear();
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
    this.socket.addEventListener('close', (event) => {
      this._failAll(`CDP socket closed (code ${event.code || 0})`);
    });
    this.socket.addEventListener('error', (event) => {
      this._failAll(`CDP socket error: ${event.message || 'unknown'}`);
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

  once(method, timeoutMs = 15000, expectedSessionId = null) {
    return new Promise((resolvePromise, reject) => {
      let timer = null;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.onCloseRejectors.delete(onAbort);
        const handlers = this.listeners.get(method) || [];
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
      };
      const onAbort = (error) => {
        cleanup();
        reject(error);
      };
      const handler = (params, sessionId) => {
        if (expectedSessionId && sessionId !== expectedSessionId) return;
        cleanup();
        resolvePromise({ params, sessionId });
      };
      if (!this.listeners.has(method)) this.listeners.set(method, []);
      this.listeners.get(method).push(handler);
      this.onCloseRejectors.add(onAbort);
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`CDP event timeout: ${method}`));
      }, timeoutMs);
    });
  }

  close() {
    this._failAll('CDP client closed');
    try { this.socket?.close(); } catch { /* ignore */ }
  }
}

async function evaluate(cdp, sessionId, expression, timeoutMs) {
  const timer = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`evaluate timeout (${timeoutMs}ms)`)), timeoutMs);
  });
  const call = cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  const result = await Promise.race([call, timer]);
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'JS exception';
    throw new Error(text);
  }
  return result.result?.value;
}

async function waitForPort(profileDir, timeoutMs) {
  const portFile = join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const text = await readFile(portFile, 'utf8');
      const port = Number(text.trim().split(/\r?\n/)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch { /* wait */ }
    await sleep(150);
  }
  throw new Error('DevToolsActivePort did not appear');
}

async function waitExit(child, timeoutMs) {
  if (child.exitCode !== null) return;
  await new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      resolvePromise();
    }, timeoutMs);
    child.once('exit', () => { clearTimeout(timer); resolvePromise(); });
  });
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

async function runOnce({
  engine,
  profileDir,
  url,
  mode,
  sandbox,
  doubleRun,
  hardOnly,
  seed,
  platformName,
  timezone,
  location,
  profilePreset,
  dpr,
  timeout,
  label
}) {
  try { await rm(join(profileDir, 'DevToolsActivePort'), { force: true }); } catch { /* ignore */ }

  const flags = buildEngineFlags({
    profileDir,
    mode,
    sandbox,
    seed,
    platform: platformName,
    timezone,
    location,
    profilePreset,
    dpr
  });

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
    // Intentionally omit Runtime.enable (conformance SI-01: Runtime.enable leaks via console/Error.stack).

    const loaded = cdp.once('Page.loadEventFired', 20000, sessionId).catch(() => null);
    await cdp.send('Page.navigate', { url }, sessionId);
    await loaded;

    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      ready = await evaluate(cdp, sessionId, 'Boolean(window.FPAudit && window.FPAudit.run)', 5000);
      if (ready) break;
      await sleep(100);
    }
    if (!ready) throw new Error('window.FPAudit did not initialize');

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

async function runExternalSession({
  engine,
  profileDir,
  mode,
  sandbox,
  seed,
  platformName,
  timezone,
  location,
  profilePreset,
  dpr,
  proxy,
  hostIp,
  selection,
  timeout,
  retries,
  gapOptions
}) {
  try { await rm(join(profileDir, 'DevToolsActivePort'), { force: true }); } catch { /* ignore */ }

  const flags = buildEngineFlags({
    profileDir,
    mode,
    sandbox,
    seed,
    platform: platformName,
    timezone,
    location,
    profilePreset,
    dpr,
    proxy
  });

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

    const result = await runExternalCheckers({
      selection,
      cdp,
      evaluate,
      timeout,
      retries,
      proxy,
      hostIp,
      gapOptions,
      onResult: (target, meta) => {
        const detail = target.failures.length
          ? ` — ${target.failures.join('; ')}`
          : (target.flags?.length ? ` (${target.flags.join(', ')})` : '');
        console.log(
          `external ${target.id} [${target.checker}]: ${target.status} ` +
          `(${target.duration_ms}ms, attempt ${target.attempts})${detail}`
        );
      }
    });

    await cdp.send('Browser.close').catch(() => {});
    await waitExit(child, 12000);
    return { ...result, flags };
  } catch (error) {
    try { child.kill('SIGKILL'); } catch { /* ignore */ }
    const tail = stderr.trim().split(/\r?\n/).slice(-10).join('\n');
    throw new Error(`${error.message}${tail ? `\nengine stderr:\n${tail}` : ''}`);
  } finally {
    if (cdp) cdp.close();
  }
}

async function loadBaseline({
  explicit,
  startedAt,
  engine,
  mode,
  osName,
  transport,
  hardOnly,
  sandbox,
  profilePlatform,
  scope,
  externalVersion,
  outPath,
  currentTargets,
  currentMetrics,
  currentVerdict,
  currentQuality,
  scoreTolerance
}) {
  let file = null;
  if (explicit) {
    file = explicit;
    if (!(await fileExists(file))) {
      throw new Error(`explicit baseline not found: ${file}`);
    }
  } else {
    const files = (await readdir(RESULTS_DIR).catch(() => []))
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(RESULTS_DIR, name))
      .filter((path) => path !== outPath);
    const reports = [];
    const criteria = {
      engineName: engine.name,
      mode,
      os: osName,
      transport,
      probeVersion: PROBE_VERSION,
      hardOnly,
      sandbox,
      profilePlatform,
      scope,
      externalVersion,
      startedAt
    };
    for (const path of files) {
      try {
        const report = JSON.parse(await readFile(path, 'utf8'));
        if (!isCompatibleBaseline(report, criteria)) continue;
        reports.push({ path, report });
      } catch { /* skip malformed */ }
    }
    reports.sort((left, right) => String(left.report.started_at).localeCompare(String(right.report.started_at)));
    if (reports.length) file = reports[reports.length - 1].path;
  }

  if (!file) return { baseline: null, qualityDelta: null, layerDeltas: {}, regressions: [] };

  const baselineReport = JSON.parse(await readFile(file, 'utf8'));
  return diffBaseline({
    baselineReport,
    baselineFile: relative(REPO_ROOT, file),
    currentTargets,
    currentMetrics,
    currentVerdict,
    currentQuality,
    scoreTolerance
  });
}

function makeRunId(startedAt, engineVersion, mode, scope = 'local') {
  const stamp = startedAt.replace(/\.\d{3}Z$/, 'Z').replace(/[:]/g, '-');
  const suffix = scope === 'local' ? mode : `${mode}-${scope}`;
  return `${stamp}-${engineVersion}-${suffix}`.replace(/[^A-Za-z0-9._-]/g, '-');
}

async function writeReport(report, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return relative(REPO_ROOT, outPath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }
  const externalSelection = resolveExternalSelection(args.external);
  const runLocal = !args.externalOnly;
  const runExternal = externalSelection.length > 0;
  const scope = runLocal && runExternal ? 'full' : (runExternal ? 'external' : 'local');
  const scoreTolerance = args.scoreTolerance !== null
    ? args.scoreTolerance
    : (runExternal ? 2 : 0);

  if (runLocal && !(await fileExists(join(PROBE_DIR, 'index.html')))) {
    throw new Error(`probe not found: ${PROBE_DIR}`);
  }

  const enginePath = await resolveEngine(args.engine);
  const engine = await engineInfo(enginePath);
  const startedAt = new Date().toISOString();
  const osName = `${platform()} ${release()} ${arch()}`;
  const runId = makeRunId(startedAt, engine.version, args.mode, scope);
  const outPath = args.out || join(RESULTS_DIR, `${runId}.json`);
  const seedHash = hashSeed(args.seed);
  const effectiveSeed2 = runLocal && args.seedCheck && args.runs >= 2
    ? (args.seed2 || deriveAlternateSeed(args.seed))
    : null;
  const gapOptions = {
    operator: args.operator,
    knownGapOwner: args.knownGapOwner || args.operator,
    knownGapExpires: args.knownGapExpires || defaultGapExpiry(startedAt)
  };

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
  let altProfileDir = null;
  let extProfileDir = null;
  const snapshots = [];
  const allFlags = new Set();
  let runError = null;
  let externalError = null;
  let externalTargets = [];
  let detectedCountry = null;
  let hostIp = null;
  let seedCheck = { checked: false, changed: null, seed2_hash: null, diff_probes: [], error: null };

  console.log(`Ombra antidetect checkup (probe v${PROBE_VERSION}, external v${EXTERNAL_VERSION})`);
  console.log(`  engine:    ${engine.name} ${engine.version}`);
  console.log(`  sha256:    ${engine.sha256.slice(0, 16)}… (${engine.hash_source})`);
  console.log(`  scope:     ${scope}`);
  console.log(`  mode:      ${args.mode}`);
  if (runLocal) console.log(`  transport: ${args.transport}`);
  console.log(`  seed_hash: ${seedHash.slice(0, 23)}…`);
  if (args.platform) console.log(`  platform:  ${args.platform}`);
  if (args.proxy) console.log(`  proxy:     configured (redacted in report)`);
  console.log(`  profile:   ${profileDir}${temporaryProfile ? ' (temporary)' : ''}`);
  if (runLocal) console.log(`  runs:      ${args.runs}${effectiveSeed2 ? ' (+1 alternate-seed check)' : ''}`);
  if (runExternal) console.log(`  external:  ${externalSelection.join(', ')}`);
  console.log('');

  try {
    if (runLocal) {
      let probeUrl;
      if (args.transport === 'file') {
        standalone = await buildStandalone();
        probeUrl = standalone.url;
      } else {
        serverInfo = await startProbeServer();
        probeUrl = serverInfo.url;
      }
      console.log(`  probe:     ${probeUrl}`);
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
          platformName: args.platform,
          timezone: args.timezone,
          location: args.location,
          profilePreset: args.profilePreset,
          dpr: args.dpr,
          timeout: args.timeout,
          label: `cold ${index}`
        });
        snapshots.push(result.snapshot);
        for (const flag of result.flags) {
          if (flag.startsWith('--fingerprint=')) continue;
          if (flag.startsWith('--user-data-dir=')) continue;
          if (flag.startsWith('--proxy-server=')) continue;
          allFlags.add(flag);
        }
        console.log(
          `run ${index}/${args.runs}: hard=${result.snapshot.hardHash.slice(0, 12)} ` +
          `probes=${result.snapshot.counts.total} skipped=${result.snapshot.counts.hardSkipped || 0} ` +
          `noise=${result.snapshot.noise.length} hardErrors=${result.snapshot.hardErr.length} ` +
          `duration=${result.snapshot.durationMs}ms`
        );
      }

      if (effectiveSeed2 && snapshots.length >= 2) {
        altProfileDir = await mkdtemp(join(tmpdir(), 'ombra-check-seed2-'));
        seedCheck.checked = true;
        seedCheck.seed2_hash = hashSeed(effectiveSeed2);
        try {
          const alt = await runOnce({
            engine: enginePath,
            profileDir: altProfileDir,
            url: probeUrl,
            mode: args.mode,
            sandbox: args.sandbox,
            doubleRun: false,
            hardOnly: args.hardOnly,
            seed: effectiveSeed2,
            platformName: args.platform,
            timezone: args.timezone,
            location: args.location,
            profilePreset: args.profilePreset,
            dpr: args.dpr,
            timeout: args.timeout,
            label: 'seed-check'
          });
          const diff = compareSnapshots(snapshots[0], alt.snapshot);
          seedCheck.changed = alt.snapshot.hardHash !== snapshots[0].hardHash;
          seedCheck.seed2_hard_hash = alt.snapshot.hardHash;
          seedCheck.diff_probes = diff.hardBad.map((row) => row.id);
          console.log(
            `seed check: hard=${alt.snapshot.hardHash.slice(0, 12)} ` +
            `changed=${seedCheck.changed} (${seedCheck.diff_probes.length} hard probe(s) differed)`
          );
        } catch (error) {
          seedCheck.error = error.message;
          console.error(`seed check failed: ${error.message}`);
        }
      }
    }

    if (runExternal) {
      if (args.proxy) hostIp = await detectHostPublicIp();
      extProfileDir = runLocal ? await mkdtemp(join(tmpdir(), 'ombra-check-ext-')) : profileDir;
      try {
        const ext = await runExternalSession({
          engine: enginePath,
          profileDir: extProfileDir,
          mode: args.mode,
          sandbox: args.sandbox,
          seed: args.seed,
          platformName: args.platform,
          timezone: args.timezone,
          location: args.location,
          profilePreset: args.profilePreset,
          dpr: args.dpr,
          proxy: args.proxy,
          hostIp,
          selection: externalSelection,
          timeout: args.externalTimeout,
          retries: args.retries,
          gapOptions
        });
        externalTargets = ext.targets;
        detectedCountry = ext.detectedCountry;
        for (const flag of ext.flags) {
          if (flag.startsWith('--fingerprint=')) continue;
          if (flag.startsWith('--user-data-dir=')) continue;
          if (flag.startsWith('--proxy-server=')) continue;
          allFlags.add(flag);
        }
      } catch (error) {
        externalError = error;
        console.error(`external checkers failed: ${error.message}`);
      }
    }
  } catch (error) {
    runError = error;
    console.error(`benchmark failed: ${error.message}`);
  } finally {
    if (serverInfo) await new Promise((resolvePromise) => serverInfo.server.close(resolvePromise));
    if (standalone) await rm(standalone.dir, { recursive: true, force: true }).catch(() => {});
    if (altProfileDir) await rm(altProfileDir, { recursive: true, force: true }).catch(() => {});
    if (extProfileDir && extProfileDir !== profileDir) {
      await rm(extProfileDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  const localTargets = [];
  if (runLocal) {
    const l101 = evaluateL101(snapshots, {
      ...gapOptions,
      sandbox: args.sandbox,
      runError: runError?.message
    });
    const l501 = evaluateL501(snapshots, {
      ...gapOptions,
      expectedRuns: args.runs,
      runError: runError?.message,
      seedCheck
    });
    const l502 = evaluateL502(snapshots, gapOptions);
    localTargets.push(l101, l501);
    if (l502) localTargets.push(l502);
  }
  const targets = [...localTargets, ...externalTargets];
  if (!targets.length && externalError) {
    targets.push({
      id: 'L3-01',
      status: 'UNREACHABLE',
      failures: [externalError.message],
      duration_ms: 0
    });
  }

  const comparisons = snapshots.length > 1
    ? snapshots.slice(1).map((snapshot) => compareSnapshots(snapshots[0], snapshot))
    : [];
  const metrics = snapshots.length ? metricsFor(snapshots, comparisons, { expectedRuns: args.runs, seedCheck }) : null;
  const skipped = snapshots.length
    ? [...new Set(snapshots.flatMap((snapshot) => skippedProbes(snapshot)))].sort()
    : [];

  const quality = computeQualityScore(targets, { minScore: args.minScore });

  const preBaselineVerdict = (runError || externalError) ? 'INCOMPLETE' : reportVerdict(targets, []);
  let baseline = null;
  let qualityDelta = null;
  let layerDeltas = {};
  let regressions = [];
  let baselineError = null;
  if (!runError && !externalError && targets.length) {
    try {
      const result = await loadBaseline({
        explicit: args.baseline,
        startedAt,
        engine,
        mode: args.mode,
        osName,
        transport: args.transport,
        hardOnly: args.hardOnly,
        sandbox: args.sandbox,
        profilePlatform: args.platform,
        scope,
        externalVersion: runExternal ? EXTERNAL_VERSION : null,
        outPath,
        currentTargets: targets,
        currentMetrics: metrics,
        currentVerdict: preBaselineVerdict,
        currentQuality: quality,
        scoreTolerance
      });
      baseline = result.baseline;
      qualityDelta = result.qualityDelta;
      layerDeltas = result.layerDeltas || {};
      regressions = result.regressions;
    } catch (error) {
      baselineError = error;
      console.error(`baseline error: ${error.message}`);
    }
  }

  if (!runError && !externalError && !quality.meets_floor && quality.coverage.measured > 0) {
    const floorMsg = `quality score ${quality.score} below minimum floor ${args.minScore}`;
    if (!regressions.includes(floorMsg)) regressions.push(floorMsg);
  }

  const verdict = (runError || externalError || baselineError) ? 'INCOMPLETE' : reportVerdict(targets, regressions);
  const errorText = [runError?.message, externalError?.message, baselineError?.message].filter(Boolean).join('; ') || null;
  const proxyCountry = args.proxyCountry || (args.proxy ? (detectedCountry || undefined) : 'direct');

  const environment = {
    os: osName,
    mode: args.mode,
    transport: runLocal ? args.transport : 'network',
    sandbox: args.sandbox,
    hard_only: args.hardOnly,
    profile_platform: args.platform,
    seed_hash: seedHash,
    notes: [
      `scope=${scope}`,
      `sandbox=${args.sandbox ? 'enabled' : 'disabled'}`,
      'window=1440x900',
      args.dpr !== null ? `dpr=${args.dpr}` : 'dpr=native',
      runLocal ? `probe=${PROBE_VERSION}` : null,
      runLocal ? `probes=${args.hardOnly ? 'hard-only' : 'all'}` : null,
      runLocal ? `transport=${args.transport}` : null,
      runExternal ? `external=${EXTERNAL_VERSION}(${externalSelection.join(',')})` : null,
      args.proxy ? 'proxy=configured' : 'proxy=direct',
      args.platform ? `platform=${args.platform}` : null,
      args.sandbox ? null : 'no-sandbox is required on this host; do not treat this run as an L0-01 pass'
    ].filter(Boolean).join('; ')
  };
  if (proxyCountry) environment.proxy_country = proxyCountry;

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
    environment,
    targets,
    verdict,
    checks: {
      scope,
      probe_version: PROBE_VERSION,
      result_file: relative(REPO_ROOT, outPath),
      flags: [...allFlags].sort(),
      metrics,
      quality,
      external: runExternal ? {
        version: EXTERNAL_VERSION,
        checkers: externalSelection,
        proxy_used: Boolean(args.proxy),
        error: externalError?.message || null
      } : null,
      skipped,
      seed_check: seedCheck,
      comparisons,
      runs: snapshots,
      baseline,
      quality_delta: qualityDelta,
      layer_deltas: layerDeltas,
      regressions,
      error: errorText
    }
  };

  const finalReport = args.redact
    ? redactReport(report, { profileDir, seed: args.seed, seed2: effectiveSeed2, proxy: args.proxy, hostIp })
    : report;
  const savedPath = await writeReport(finalReport, outPath);

  console.log('');
  for (const target of targets) {
    const label = target.checker ? `${target.id} (${target.checker})` : target.id;
    console.log(`${label}: ${target.status}${target.failures.length ? ` (${target.failures.join('; ')})` : ''}`);
  }
  console.log('');
  console.log(formatQualitySummary(quality, { delta: qualityDelta }));
  if (baseline) {
    console.log(`baseline: ${baseline.run_id} (${baseline.verdict}, score ${baseline.score ?? '?'})`);
  } else if (!baselineError) {
    console.log(`baseline: none (first compatible ${scope} run for this engine/mode/os)`);
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
