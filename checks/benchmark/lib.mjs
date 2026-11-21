/*
 * Ombra checks — pure benchmark helpers (argument parsing, comparison,
 * target evaluation, baseline regression gate, redaction, engine layout).
 *
 * Kept dependency-free and side-effect-light so both run.mjs and unit tests
 * can import and exercise every invariant directly.
 */

import { createHash } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';

export const PROBE_VERSION = '1.1.0';
export const CONTRACT_VERSION = '0.1.0';
export const DEFAULT_SEED = '20261119';

export const TARGET_RANK = { UNREACHABLE: 0, FAIL: 1, DEGRADED: 2, PASS: 3 };
export const VERDICT_RANK = { INCOMPLETE: 0, FAIL: 1, PASS_WITH_GAPS: 2, PASS: 3 };
export const VALID_PLATFORMS = ['windows', 'macos', 'linux', 'android'];

export const DEFAULTS = {
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
  seed2: null,
  seedCheck: true,
  platform: null,
  timezone: null,
  location: null,
  profilePreset: null,
  dpr: null,
  knownGapOwner: null,
  knownGapExpires: null,
  operator: process.env.USER || process.env.USERNAME || 'local'
};

export function defaultGapExpiry(startedAt) {
  const base = startedAt ? new Date(startedAt) : new Date();
  const expiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiry.toISOString().slice(0, 10);
}

export function deriveAlternateSeed(seed) {
  const text = String(seed);
  if (/^\d+$/.test(text)) {
    try {
      return (BigInt(text) + 1n).toString();
    } catch { /* fall through */ }
  }
  return `${text}-alt`;
}

export function hashSeed(seed) {
  return `sha256:${createHash('sha256').update(String(seed)).digest('hex')}`;
}

export function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`missing value for ${arg}`);
      return value;
    };
    switch (arg) {
      case '--runs': {
        const raw = next();
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new Error(`--runs must be a positive integer (got ${JSON.stringify(raw)})`);
        }
        args.runs = parsed;
        break;
      }
      case '--engine':
      case '--chrome':
        args.engine = next();
        break;
      case '--profile':
        args.profile = resolve(next());
        break;
      case '--out':
        args.out = resolve(next());
        break;
      case '--baseline':
        args.baseline = resolve(next());
        break;
      case '--seed': {
        const value = next().trim();
        if (!value) throw new Error('--seed must be non-empty');
        args.seed = value;
        break;
      }
      case '--seed2': {
        const value = next().trim();
        if (!value) throw new Error('--seed2 must be non-empty');
        args.seed2 = value;
        break;
      }
      case '--no-seed-check':
        args.seedCheck = false;
        break;
      case '--platform': {
        const value = next().toLowerCase();
        if (!VALID_PLATFORMS.includes(value)) {
          throw new Error(`--platform must be one of ${VALID_PLATFORMS.join(', ')}`);
        }
        args.platform = value;
        break;
      }
      case '--timezone':
        args.timezone = next();
        break;
      case '--location':
        args.location = next();
        break;
      case '--profile-preset':
        args.profilePreset = next();
        break;
      case '--dpr': {
        const raw = next();
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error(`--dpr must be a positive number (got ${JSON.stringify(raw)})`);
        }
        args.dpr = parsed;
        break;
      }
      case '--operator':
        args.operator = next();
        break;
      case '--known-gap-owner':
        args.knownGapOwner = next();
        break;
      case '--known-gap-expires': {
        const value = next();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('--known-gap-expires must be YYYY-MM-DD');
        }
        args.knownGapExpires = value;
        break;
      }
      case '--timeout': {
        const raw = next();
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 10000) {
          throw new Error(`--timeout must be a number >= 10000 (got ${JSON.stringify(raw)})`);
        }
        args.timeout = parsed;
        break;
      }
      case '--mode':
        args.mode = next();
        if (!['headed', 'headless'].includes(args.mode)) {
          throw new Error('--mode must be headed or headless');
        }
        break;
      case '--transport':
        args.transport = next();
        if (!['http', 'file'].includes(args.transport)) {
          throw new Error('--transport must be http or file');
        }
        break;
      case '--headless':
        args.mode = 'headless';
        break;
      case '--headed':
        args.mode = 'headed';
        break;
      case '--no-sandbox':
        args.sandbox = false;
        break;
      case '--no-double':
        args.doubleRun = false;
        break;
      case '--hard-only':
        args.hardOnly = true;
        break;
      case '--all-probes':
        args.hardOnly = false;
        break;
      case '--keep':
        args.keep = true;
        break;
      case '--no-redact':
        args.redact = false;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (args.seed2 && args.seed2 === args.seed) {
    throw new Error('--seed2 must differ from --seed');
  }
  return args;
}

export function buildEngineFlags({
  profileDir,
  mode,
  sandbox,
  seed,
  platform = null,
  timezone = null,
  location = null,
  profilePreset = null,
  dpr = null
}) {
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
    'about:blank'
  ];
  if (platform) flags.splice(3, 0, `--fingerprint-platform=${platform}`);
  if (timezone) flags.splice(3, 0, `--fingerprint-timezone=${timezone}`);
  if (location) flags.splice(3, 0, `--fingerprint-location=${location}`);
  if (profilePreset) flags.splice(3, 0, `--fingerprint-profile=${profilePreset}`);
  if (dpr !== null && dpr !== undefined) {
    flags.splice(3, 0, `--fingerprint-device-pixel-ratio=${dpr}`);
  }
  if (mode === 'headless') flags.unshift('--headless=new');
  if (!sandbox) flags.unshift('--no-sandbox', '--disable-gpu-sandbox');
  return flags;
}

export function candidateVersionDirs(binary) {
  const dirs = [];
  let current = dirname(resolve(binary));
  for (let depth = 0; depth < 5; depth++) {
    dirs.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

export function extractBuildVersion(dirs) {
  for (const dir of dirs) {
    const match = basename(dir).match(/^(\d+\.\d+\.\d+\.\d+-[0-9]+)$/);
    if (match) return { version: match[1], dir };
  }
  for (const dir of dirs) {
    const match = dir.match(/(\d+\.\d+\.\d+\.\d+-[0-9]+)/);
    if (match) return { version: match[1], dir };
  }
  return { version: null, dir: dirs[0] || '' };
}

export function probeClass(probe) {
  return probe?.c || 'hard';
}

export function probeSkippedReason(probe) {
  if (!probe || typeof probe !== 'object') return null;
  if (typeof probe.s === 'string' && probe.s) return probe.s;
  if (probe.v && typeof probe.v === 'object' && typeof probe.v.skipped === 'string' && probe.v.skipped) {
    return probe.v.skipped;
  }
  return null;
}

export function statusOf(baseProbe, currentProbe) {
  if (!baseProbe || !currentProbe) return 'missing';
  if (!baseProbe.ok && !currentProbe.ok) return 'absent';
  if (!baseProbe.ok || !currentProbe.ok) return 'changed';
  const baseSkipped = probeSkippedReason(baseProbe);
  const curSkipped = probeSkippedReason(currentProbe);
  if (baseSkipped && curSkipped) return 'skipped';
  if (baseSkipped || curSkipped) return 'changed';
  if (baseProbe.n || currentProbe.n) return 'noisy';
  return baseProbe.h === currentProbe.h ? 'same' : 'changed';
}

export function compareSnapshots(base, current) {
  const ids = new Set([...Object.keys(base?.probes || {}), ...Object.keys(current?.probes || {})]);
  const rows = [];
  for (const id of ids) {
    const baseProbe = base?.probes?.[id];
    const currentProbe = current?.probes?.[id];
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
  const hardSkipped = hard.filter((row) => row.status === 'skipped');
  const contextBad = context.filter((row) =>
    row.status === 'changed' || row.status === 'noisy' || row.status === 'missing'
  );
  const pct = (subset) => {
    const denominator = subset.filter((row) => row.status !== 'absent' && row.status !== 'skipped').length;
    const same = subset.filter((row) => row.status === 'same').length;
    if (!denominator) return subset.length ? 0 : 100;
    return Math.round((same / denominator) * 1000) / 10;
  };
  const hardDenominator = hard.filter((row) => row.status !== 'absent' && row.status !== 'skipped').length;
  return {
    hardPct: pct(hard),
    contextPct: pct(context),
    hardDenominator,
    hardBad,
    hardMissing,
    hardSkipped,
    contextBad
  };
}

export function skippedProbes(snapshot) {
  const probes = snapshot?.probes || {};
  return Object.keys(probes).filter((id) => Boolean(probeSkippedReason(probes[id]))).sort();
}

export function makeKnownGap(reasons, { owner, expires }) {
  return {
    owner: owner || 'local',
    reason: reasons.join('; ').slice(0, 500),
    expires: expires || defaultGapExpiry()
  };
}

export function evaluateL101(snapshots, options = {}) {
  const list = Array.isArray(snapshots) ? snapshots : (snapshots ? [snapshots] : []);
  if (!list.length) {
    return {
      id: 'L1-01',
      status: 'UNREACHABLE',
      failures: [options.runError || 'no run'],
      skipped: [],
      duration_ms: 0,
      artifacts: ['benchmark/probe/index.html', 'benchmark/probe/fp-core.js']
    };
  }

  const critical = [];
  const degraded = [];
  const skippedSet = new Set();

  const pushUnique = (arr, msg) => {
    if (!arr.includes(msg)) arr.push(msg);
  };

  for (let idx = 0; idx < list.length; idx++) {
    const snapshot = list[idx];
    const tag = list.length > 1 ? `run ${idx + 1}: ` : '';
    const probes = snapshot?.probes || {};

    for (const id of skippedProbes(snapshot)) skippedSet.add(id);

    if (probes['nav.webdriver']?.v !== false) {
      pushUnique(critical, `${tag}navigator.webdriver=${JSON.stringify(probes['nav.webdriver']?.v)}`);
    }
    const cdpArtifacts = probes['auto.cdp']?.v;
    if (Array.isArray(cdpArtifacts) && cdpArtifacts.length) {
      pushUnique(critical, `${tag}CDP artifacts visible: ${cdpArtifacts.join(', ')}`);
    }
    const headless = probes['auto.headless']?.v || {};
    for (const [key, value] of Object.entries(headless)) {
      if (value) pushUnique(critical, `${tag}auto.headless.${key}=true`);
    }
    const consistency = probes['auto.consistency']?.v || {};
    const criticalConsistencyKeys = [
      'webdriver',
      'mobileNoTouch',
      'chromeNoPlugins',
      'outerZero',
      'screenZero',
      'innerExceedsOuter',
      'windowExceedsScreen',
      'uaPlatformMismatch',
      'uaMobileMismatch',
      'uaArchMismatch',
      'gpuOsMismatch',
      'osFontMismatch',
      'webdriverOwnProp'
    ];
    for (const key of criticalConsistencyKeys) {
      if (consistency[key]) {
        if (key === 'osFontMismatch' && Array.isArray(consistency.osFontLeak) && consistency.osFontLeak.length) {
          pushUnique(critical, `${tag}auto.consistency.osFontMismatch=true (${consistency.osFontLeak.join(', ')})`);
        } else if (key === 'uaArchMismatch') {
          pushUnique(critical, `${tag}auto.consistency.uaArchMismatch=true (uaArch=${consistency.uaArch}, gpuArch=${consistency.gpuArch})`);
        } else {
          pushUnique(critical, `${tag}auto.consistency.${key}=true`);
        }
      }
    }

    const perms = probes['auto.permissions'];
    if (perms?.v?.mismatch === true) {
      pushUnique(critical, `${tag}auto.permissions mismatch (query=${perms.v.query}, notification=${perms.v.notification})`);
    }

    const runtimeLeak = probes['auto.runtimeLeak'];
    if (runtimeLeak?.v?.leaked === true) {
      pushUnique(critical, `${tag}CDP Runtime.enable leak detected`);
    }

    const jsError = probes['js.error'];
    if (jsError?.v?.sourceUrlLeak === true) {
      pushUnique(critical, `${tag}automation sourceURL leak in Error.stack`);
    }

    const jsNative = probes['js.native'];
    if (jsNative?.v?.allNative === false) {
      const nonNative = Array.isArray(jsNative.v.nonNative) ? jsNative.v.nonNative.join(', ') : 'unknown';
      pushUnique(critical, `${tag}non-native prototype/getter detected (${nonNative || 'webdriverOwnProp'})`);
    }

    if (snapshot?.hardErr?.length) {
      pushUnique(degraded, `${tag}unavailable hard probes: ${snapshot.hardErr.join(', ')}`);
    }
    if (probes['nav.uaData']?.v?.available === false) {
      pushUnique(degraded, `${tag}User-Agent Client Hints unavailable`);
    }
  }

  const skippedList = [...skippedSet].sort();
  if (skippedList.length) {
    pushUnique(degraded, `skipped hard probes: ${skippedList.join(', ')}`);
  }
  if (options.sandbox === false) {
    pushUnique(degraded, 'sandbox disabled (--no-sandbox); not a full release-gate pass');
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  const target = {
    id: 'L1-01',
    status,
    failures: critical.concat(degraded),
    skipped: skippedList,
    duration_ms: list[0]?.durationMs || 0,
    artifacts: ['benchmark/probe/index.html', 'benchmark/probe/fp-core.js']
  };
  if (status === 'DEGRADED') {
    target.known_gap = makeKnownGap(degraded, {
      owner: options.knownGapOwner || options.operator,
      expires: options.knownGapExpires
    });
  }
  return target;
}

export function evaluateL501(snapshots, options = {}) {
  const list = Array.isArray(snapshots) ? snapshots : [];
  const totalDuration = list.reduce((sum, snapshot) => sum + (snapshot.durationMs || 0), 0);

  if (options.runError) {
    return {
      id: 'L5-01',
      status: 'UNREACHABLE',
      failures: [`benchmark aborted after ${list.length}/${options.expectedRuns || list.length} run(s): ${options.runError}`],
      duration_ms: totalDuration,
      artifacts: ['benchmark/probe/fp-core.js']
    };
  }
  if (list.length < 2) {
    return {
      id: 'L5-01',
      status: 'UNREACHABLE',
      failures: ['at least two cold starts are required'],
      duration_ms: totalDuration,
      artifacts: ['benchmark/probe/fp-core.js']
    };
  }

  const base = list[0];
  const critical = [];
  const degraded = [];
  const comparisons = list.slice(1).map((snapshot) => compareSnapshots(base, snapshot));
  const hardBad = comparisons.flatMap((comparison) => comparison.hardBad);
  const hardMissing = comparisons.flatMap((comparison) => comparison.hardMissing);
  const hardSkipped = comparisons.flatMap((comparison) => comparison.hardSkipped);
  const minDenominator = Math.min(...comparisons.map((comparison) => comparison.hardDenominator));
  const noiseTotal = list.reduce((sum, snapshot) => sum + (snapshot.hardNoisy?.length || 0), 0);
  const hardErrors = list.flatMap((snapshot) => snapshot.hardErr || []);
  const minHardPct = Math.min(...comparisons.map((comparison) => comparison.hardPct));
  const hashes = new Set(list.map((snapshot) => snapshot.hardHash));

  if (hardBad.length) {
    critical.push(`hard probes changed or became noisy: ${[...new Set(hardBad.map((row) => row.id))].join(', ')}`);
  }
  if (noiseTotal) critical.push(`hard noise detected: ${noiseTotal} probe(s)`);
  if (minDenominator === 0) critical.push('no comparable hard probes succeeded');
  if (minHardPct < 100) critical.push(`hard stability dropped to ${minHardPct}%`);
  if (hashes.size !== 1) critical.push('hard hash differs between cold starts');

  if (options.seedCheck && options.seedCheck.checked) {
    if (options.seedCheck.error) {
      degraded.push(`seed-change check failed to execute: ${options.seedCheck.error}`);
    } else if (!options.seedCheck.changed) {
      critical.push('changing --fingerprint seed did not change hardHash');
    }
  }

  if (hardMissing.length) {
    degraded.push(`hard probes missing: ${[...new Set(hardMissing.map((row) => row.id))].join(', ')}`);
  }
  if (hardErrors.length) {
    degraded.push(`unavailable hard probes: ${[...new Set(hardErrors)].join(', ')}`);
  }
  if (hardSkipped.length) {
    degraded.push(`skipped hard probes: ${[...new Set(hardSkipped.map((row) => row.id))].join(', ')}`);
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  const target = {
    id: 'L5-01',
    status,
    failures: critical.concat(degraded),
    duration_ms: totalDuration,
    artifacts: ['benchmark/probe/fp-core.js']
  };
  if (status === 'DEGRADED') {
    target.known_gap = makeKnownGap(degraded, {
      owner: options.knownGapOwner || options.operator,
      expires: options.knownGapExpires
    });
  }
  return target;
}

export function evaluateL502(snapshots, options = {}) {
  const list = Array.isArray(snapshots) ? snapshots : [];
  if (!list.length) return null;
  const hasProbe = list.some((snapshot) => Boolean(snapshot?.probes?.['context.agreement']));
  if (!hasProbe) return null;

  const critical = [];
  const degraded = [];
  let duration = 0;

  for (let idx = 0; idx < list.length; idx++) {
    const probe = list[idx]?.probes?.['context.agreement'];
    if (!probe) {
      degraded.push(`run ${idx + 1}: context.agreement missing`);
      continue;
    }
    duration += Math.round(probe.ms || 0);
    if (!probe.ok) {
      degraded.push(`run ${idx + 1}: context.agreement error (${probe.err || 'unavailable'})`);
      continue;
    }
    const v = probe.v || {};
    if (Array.isArray(v.mismatches) && v.mismatches.length) {
      critical.push(`run ${idx + 1}: cross-context mismatches: ${v.mismatches.join(', ')}`);
    }
    if (v.iframeOk === false) {
      critical.push(`run ${idx + 1}: same-origin iframe check failed`);
    }
    if (v.workerSkipped) {
      degraded.push(`run ${idx + 1}: worker check skipped (${v.workerSkipped})`);
    } else if (v.workerOk === false) {
      degraded.push(`run ${idx + 1}: worker check unavailable`);
    }
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  const target = {
    id: 'L5-02',
    status,
    failures: [...new Set(critical.concat(degraded))],
    duration_ms: duration,
    artifacts: ['benchmark/probe/fp-core.js']
  };
  if (status === 'DEGRADED') {
    target.known_gap = makeKnownGap([...new Set(degraded)], {
      owner: options.knownGapOwner || options.operator,
      expires: options.knownGapExpires
    });
  }
  return target;
}

export function metricsFor(snapshots, comparisons, options = {}) {
  const first = snapshots[0];
  const runs = snapshots.length;
  const noiseTotal = snapshots.reduce((sum, snapshot) => sum + (snapshot.hardNoisy?.length || 0), 0);
  const hardErrors = snapshots.reduce((sum, snapshot) => sum + (snapshot.hardErr?.length || 0), 0);
  const hardSkipped = Math.max(0, ...snapshots.map((snapshot) => (snapshot.hardSkipped?.length ?? skippedProbes(snapshot).length)));
  const hardTotal = first?.counts?.hard ?? 0;
  const hardPct = comparisons.length
    ? Math.min(...comparisons.map((comparison) => comparison.hardPct))
    : (hardTotal > hardSkipped ? 100 : 0);

  return {
    runs,
    expected_runs: options.expectedRuns || runs,
    probe_count: first?.counts?.total ?? Object.keys(first?.probes || {}).length,
    hard_total: hardTotal,
    hard_skipped: hardSkipped,
    hard_executed: Math.max(0, hardTotal - hardSkipped),
    hard_stable: Math.min(...snapshots.map((snapshot) => snapshot.counts?.hardStable ?? 0)),
    hard_pct: hardPct,
    noise_total: noiseTotal,
    noise_per_run: runs ? Number((noiseTotal / runs).toFixed(4)) : 0,
    hard_errors: hardErrors,
    hard_errors_per_run: runs ? Number((hardErrors / runs).toFixed(4)) : 0,
    hard_hash: snapshots.every((snapshot) => snapshot.hardHash === first?.hardHash) ? first?.hardHash : null,
    seed_changed: options.seedCheck?.checked ? Boolean(options.seedCheck.changed) : null
  };
}

export function inferHardOnly(report) {
  if (typeof report?.environment?.hard_only === 'boolean') return report.environment.hard_only;
  const notes = String(report?.environment?.notes || '');
  if (notes.includes('probes=all')) return false;
  if (notes.includes('probes=hard-only')) return true;
  return true;
}

export function inferSandbox(report) {
  if (typeof report?.environment?.sandbox === 'boolean') return report.environment.sandbox;
  const notes = String(report?.environment?.notes || '');
  if (notes.includes('sandbox=disabled')) return false;
  if (notes.includes('sandbox=enabled')) return true;
  const flags = report?.checks?.flags || [];
  return !flags.includes('--no-sandbox');
}

export function isCompatibleBaseline(report, criteria) {
  if (!report || typeof report !== 'object') return false;
  if (report?.engine?.name !== criteria.engineName) return false;
  if (report?.environment?.mode !== criteria.mode) return false;
  if (report?.environment?.os !== criteria.os) return false;
  if ((report?.environment?.transport || 'http') !== criteria.transport) return false;
  if (report?.checks?.probe_version !== criteria.probeVersion) return false;
  if (inferHardOnly(report) !== criteria.hardOnly) return false;
  if ((report?.environment?.profile_platform || null) !== (criteria.profilePlatform || null)) return false;
  if (criteria.sandbox && !inferSandbox(report)) return false;
  if (!['PASS', 'PASS_WITH_GAPS'].includes(report?.verdict)) return false;
  if (report?.started_at && criteria.startedAt && report.started_at >= criteria.startedAt) return false;
  return true;
}

export function diffBaseline({ baselineReport, baselineFile, currentTargets, currentMetrics, currentVerdict }) {
  const baselineTargets = new Map((baselineReport.targets || []).map((target) => [target.id, target.status]));
  const currentTargetMap = new Map((currentTargets || []).map((target) => [target.id, target.status]));
  const regressions = [];

  for (const [id, status] of currentTargetMap) {
    const previous = baselineTargets.get(id);
    if (previous && (TARGET_RANK[status] ?? -1) < (TARGET_RANK[previous] ?? -1)) {
      regressions.push(`${id}: ${previous} -> ${status}`);
    }
  }

  if (baselineReport.verdict && currentVerdict &&
      (VERDICT_RANK[currentVerdict] ?? -1) < (VERDICT_RANK[baselineReport.verdict] ?? -1)) {
    regressions.push(`verdict: ${baselineReport.verdict} -> ${currentVerdict}`);
  }

  const prev = baselineReport.checks?.metrics || {};
  const curr = currentMetrics || {};

  if (typeof prev.hard_pct === 'number' && typeof curr.hard_pct === 'number' && prev.hard_pct > curr.hard_pct) {
    regressions.push(`hard stability: ${prev.hard_pct}% -> ${curr.hard_pct}%`);
  }
  const prevExecuted = typeof prev.hard_executed === 'number'
    ? prev.hard_executed
    : (typeof prev.hard_total === 'number' ? prev.hard_total - (prev.hard_skipped || 0) : null);
  const currExecuted = typeof curr.hard_executed === 'number'
    ? curr.hard_executed
    : (typeof curr.hard_total === 'number' ? curr.hard_total - (curr.hard_skipped || 0) : null);
  if (prevExecuted !== null && currExecuted !== null && prevExecuted > currExecuted) {
    regressions.push(`hard probe coverage: ${prevExecuted} -> ${currExecuted}`);
  }

  const prevRuns = prev.runs || 1;
  const currRuns = curr.runs || 1;
  const prevNoiseRate = typeof prev.noise_per_run === 'number'
    ? prev.noise_per_run
    : (typeof prev.noise_total === 'number' ? prev.noise_total / prevRuns : null);
  const currNoiseRate = typeof curr.noise_per_run === 'number'
    ? curr.noise_per_run
    : (typeof curr.noise_total === 'number' ? curr.noise_total / currRuns : null);
  if (prevNoiseRate !== null && currNoiseRate !== null && prevNoiseRate < currNoiseRate) {
    regressions.push(`hard noise rate: ${prevNoiseRate}/run -> ${currNoiseRate}/run`);
  }

  const prevErrRate = typeof prev.hard_errors_per_run === 'number'
    ? prev.hard_errors_per_run
    : (typeof prev.hard_errors === 'number' ? prev.hard_errors / prevRuns : null);
  const currErrRate = typeof curr.hard_errors_per_run === 'number'
    ? curr.hard_errors_per_run
    : (typeof curr.hard_errors === 'number' ? curr.hard_errors / currRuns : null);
  if (prevErrRate !== null && currErrRate !== null && prevErrRate < currErrRate) {
    regressions.push(`hard error rate: ${prevErrRate}/run -> ${currErrRate}/run`);
  }

  return {
    baseline: {
      file: baselineFile,
      run_id: baselineReport.run_id,
      started_at: baselineReport.started_at,
      verdict: baselineReport.verdict,
      metrics: prev
    },
    regressions
  };
}

export function reportVerdict(targets, regressions = []) {
  if (regressions.length) return 'FAIL';
  if (targets.some((target) => target.status === 'FAIL')) return 'FAIL';
  if (targets.some((target) => target.status === 'UNREACHABLE')) return 'INCOMPLETE';
  if (targets.some((target) => target.status === 'DEGRADED')) return 'PASS_WITH_GAPS';
  return 'PASS';
}

export function sanitizeErrorText(text, secrets = []) {
  if (!text) return null;
  let out = String(text);
  for (const secret of secrets) {
    if (!secret) continue;
    const str = String(secret);
    if (str.length < 3) continue;
    out = out.split(str).join('<redacted>');
  }
  return out;
}

export function redactReport(report, options = {}) {
  const copy = JSON.parse(JSON.stringify(report));
  for (const run of copy.checks?.runs || []) {
    for (const probe of Object.values(run.probes || {})) {
      if (probe && typeof probe === 'object') delete probe.v;
    }
  }
  copy.checks.flags = (copy.checks.flags || []).filter((flag) =>
    !flag.startsWith('--user-data-dir=') && !flag.startsWith('--fingerprint=')
  );
  const secrets = [options.profileDir, options.seed, options.seed2].filter(Boolean);
  if (copy.checks.error) {
    copy.checks.error = sanitizeErrorText(copy.checks.error, secrets);
  }
  for (const target of copy.targets || []) {
    if (Array.isArray(target.failures)) {
      target.failures = target.failures.map((item) => sanitizeErrorText(item, secrets));
    }
  }
  return copy;
}
