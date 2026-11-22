#!/usr/bin/env node
/*
 * Ombra checks — deterministic antidetect quality scoring system.
 *
 * Computes a 0-100 quality score, letter grade (A+..F), per-layer breakdown
 * (L0..L5), anti-gaming hard caps, baseline score deltas, and human/Markdown
 * scorecards from conformance reports (conformance/schema/report.schema.json).
 *
 * Can be imported by run.mjs or invoked directly on checks/results/:
 *   node checks/benchmark/score.mjs checks/results/
 *   node checks/benchmark/score.mjs --markdown checks/results/
 *   node checks/benchmark/score.mjs --min-score 85 checks/results/<run>.json
 *
 * No npm dependencies. Node.js 22+.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

export const SCORE_VERSION = '1.0.0';
export const DEFAULT_MIN_SCORE = 85;
export const VALID_GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'];

// Layer weights follow docs/stealth-checkup.md §2.
// L0+L1+L2+L3+L5 sum to 100; normalized over measured layers so partial/local runs stay 0-100.
export const LAYER_META = {
  L0: { weight: 20, name: 'Transport' },
  L1: { weight: 25, name: 'Identity' },
  L2: { weight: 20, name: 'Fingerprint' },
  L3: { weight: 20, name: 'Automation' },
  L4: { weight: 15, name: 'Behavior' },
  L5: { weight: 15, name: 'Consistency' }
};

// Relative importance within a layer (default 1.0).
export const TARGET_WEIGHTS = {
  'L1-01': 2.0,
  'L1-02': 1.0,
  'L1-03': 0.5
};

// Failures on these targets directly indicate automation, IP leak, or broken determinism.
export const CRITICAL_TARGETS = new Set([
  'L0-01', 'L0-02', 'L0-04',
  'L1-01',
  'L3-01', 'L3-03', 'L3-04',
  'L5-01', 'L5-02'
]);

const CRITICAL_FAILURE_RE = /webdriver|runtime\.enable|cdp artifact|cdp tells|real (?:host )?ip|host ip|rfc1918|private ip|hard hash differs|hard stability|masking detected|bot detection|automated behavior|automation framework|anti-detect|sourceurl leak|non-native/i;

export function layerOf(targetId) {
  const match = String(targetId || '').match(/^(L[0-5])-\d+/i);
  return match ? match[1].toUpperCase() : 'OTHER';
}

export function isCriticalFailure(target) {
  if (!target || target.status !== 'FAIL') return false;
  if (target.critical === true) return true;
  if (CRITICAL_TARGETS.has(target.id)) return true;
  const failures = Array.isArray(target.failures) ? target.failures : [];
  return failures.some((line) => CRITICAL_FAILURE_RE.test(String(line)));
}

export function scoreTarget(target) {
  const id = String(target?.id || 'UNKNOWN');
  const layer = layerOf(id);
  const status = target?.status || 'UNREACHABLE';
  const weight = TARGET_WEIGHTS[id] ?? 1.0;
  const failures = Array.isArray(target?.failures) ? target.failures : [];
  const metrics = target?.metrics && typeof target.metrics === 'object' ? target.metrics : null;
  const authPct = typeof metrics?.authenticity_pct === 'number' && Number.isFinite(metrics.authenticity_pct)
    ? metrics.authenticity_pct
    : null;
  const critical = isCriticalFailure(target);

  let score = null;
  if (status === 'PASS') {
    score = authPct !== null ? Math.max(90, Math.min(100, Math.round(authPct))) : 100;
  } else if (status === 'DEGRADED') {
    const base = Math.max(40, 75 - 5 * Math.max(0, failures.length - 1));
    score = authPct !== null ? Math.min(75, Math.max(40, Math.round(authPct))) : base;
  } else if (status === 'FAIL') {
    score = critical ? 0 : Math.max(0, 25 - 10 * Math.max(0, failures.length - 1));
  }

  return { id, layer, status, score, weight, critical };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

export function gradeFor({ score, failCount, degradedCount, criticalFailCount, coveragePct }) {
  if (criticalFailCount > 0 || coveragePct === 0) return 'F';
  if (score >= 97 && failCount === 0 && degradedCount === 0 && coveragePct >= 80) return 'A+';
  if (score >= 90 && failCount === 0) return 'A';
  if (score >= 80 && failCount === 0) return 'B';
  if (score >= 70) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function computeQualityScore(targets, options = {}) {
  const minScore = typeof options.minScore === 'number' ? options.minScore : DEFAULT_MIN_SCORE;
  const list = Array.isArray(targets) ? targets : [];
  const scoredTargets = list.map(scoreTarget);

  const counts = { pass: 0, degraded: 0, fail: 0, unreachable: 0 };
  for (const item of scoredTargets) {
    if (item.status === 'PASS') counts.pass++;
    else if (item.status === 'DEGRADED') counts.degraded++;
    else if (item.status === 'FAIL') counts.fail++;
    else counts.unreachable++;
  }

  const byLayer = new Map();
  for (const item of scoredTargets) {
    if (!byLayer.has(item.layer)) byLayer.set(item.layer, []);
    byLayer.get(item.layer).push(item);
  }

  const layers = {};
  let weightedSum = 0;
  let weightTotal = 0;
  const layersMeasured = [];

  for (const [layerId, items] of [...byLayer.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const measured = items.filter((item) => item.score !== null);
    const layerWeight = LAYER_META[layerId]?.weight ?? 10;
    let layerScore = null;
    if (measured.length) {
      const num = measured.reduce((sum, item) => sum + item.score * item.weight, 0);
      const den = measured.reduce((sum, item) => sum + item.weight, 0);
      layerScore = den ? round1(num / den) : 0;
      weightedSum += layerScore * layerWeight;
      weightTotal += layerWeight;
      layersMeasured.push(layerId);
    }

    let layerStatus = 'UNREACHABLE';
    if (items.some((item) => item.status === 'FAIL')) layerStatus = 'FAIL';
    else if (items.some((item) => item.status === 'DEGRADED')) layerStatus = 'DEGRADED';
    else if (items.some((item) => item.status === 'PASS')) layerStatus = 'PASS';

    layers[layerId] = {
      name: LAYER_META[layerId]?.name || layerId,
      score: layerScore,
      status: layerStatus,
      weight: layerWeight,
      measured: measured.length,
      total: items.length
    };
  }

  const totalTargets = scoredTargets.length;
  const measuredTargets = scoredTargets.filter((item) => item.score !== null).length;
  const coveragePct = totalTargets ? round1((measuredTargets / totalTargets) * 100) : 0;
  const rawScore = weightTotal ? round1(weightedSum / weightTotal) : 0;

  const criticalFails = scoredTargets.filter((item) => item.status === 'FAIL' && item.critical);
  const otherFails = scoredTargets.filter((item) => item.status === 'FAIL' && !item.critical);

  let cap = 100;
  const capReasons = [];
  if (measuredTargets === 0) {
    cap = 0;
    capReasons.push('no targets reachable');
  } else {
    if (criticalFails.length) {
      cap = Math.min(cap, 49);
      capReasons.push(`critical failure: ${criticalFails.map((item) => item.id).join(', ')}`);
    } else if (otherFails.length) {
      cap = Math.min(cap, 69);
      capReasons.push(`failed target: ${otherFails.map((item) => item.id).join(', ')}`);
    }
    if (coveragePct < 50) {
      cap = Math.min(cap, 69);
      capReasons.push(`low target coverage (${coveragePct}%)`);
    }
  }

  const finalScore = round1(Math.min(rawScore, cap));
  const grade = gradeFor({
    score: finalScore,
    failCount: counts.fail,
    degradedCount: counts.degraded,
    criticalFailCount: criticalFails.length,
    coveragePct
  });

  const meetsFloor = measuredTargets > 0 &&
    coveragePct >= 50 &&
    criticalFails.length === 0 &&
    finalScore >= minScore;

  return {
    version: SCORE_VERSION,
    score: finalScore,
    raw_score: rawScore,
    grade,
    min_score: minScore,
    meets_floor: meetsFloor,
    cap_applied: cap < 100 ? cap : null,
    cap_reasons: capReasons,
    coverage: {
      measured: measuredTargets,
      total: totalTargets,
      pct: coveragePct,
      layers_measured: layersMeasured
    },
    counts,
    layers,
    targets: scoredTargets
  };
}

export function qualityOfReport(report, options = {}) {
  if (report?.checks?.quality && typeof report.checks.quality.score === 'number') {
    return report.checks.quality;
  }
  return computeQualityScore(report?.targets || [], options);
}

export function compareQuality(baselineQuality, currentQuality, options = {}) {
  if (!baselineQuality || !currentQuality) {
    return { delta: null, layerDeltas: {}, regressions: [] };
  }
  const tolerance = typeof options.tolerance === 'number' ? options.tolerance : 0;
  const delta = round1(currentQuality.score - baselineQuality.score);
  const regressions = [];

  if (currentQuality.score < baselineQuality.score - tolerance) {
    const tolNote = tolerance > 0 ? ` (tolerance ${tolerance})` : '';
    regressions.push(`quality score: ${baselineQuality.score} -> ${currentQuality.score}${tolNote}`);
  }

  const layerDeltas = {};
  const baseLayers = baselineQuality.layers || {};
  const currLayers = currentQuality.layers || {};
  for (const layerId of Object.keys(currLayers)) {
    const prevScore = baseLayers[layerId]?.score;
    const currScore = currLayers[layerId]?.score;
    if (typeof prevScore === 'number' && typeof currScore === 'number') {
      layerDeltas[layerId] = round1(currScore - prevScore);
      if (currScore < prevScore - tolerance) {
        regressions.push(`layer ${layerId} score: ${prevScore} -> ${currScore}`);
      }
    }
  }

  return { delta, layerDeltas, regressions };
}

export function inferScope(report) {
  if (report?.checks?.scope) return report.checks.scope;
  const hasRuns = Array.isArray(report?.checks?.runs) && report.checks.runs.length > 0;
  const hasExternal = Boolean(report?.checks?.external?.checkers?.length) ||
    (report?.targets || []).some((target) => !['L1-01', 'L5-01', 'L5-02'].includes(target.id));
  if (hasRuns && hasExternal) return 'full';
  if (hasExternal) return 'external';
  return 'local';
}

export function formatQualitySummary(quality, comparison = null) {
  const lines = [];
  const deltaText = comparison && typeof comparison.delta === 'number'
    ? ` (${comparison.delta >= 0 ? '+' : ''}${comparison.delta} vs baseline)`
    : '';
  const capText = quality.cap_applied !== null
    ? ` [capped at ${quality.cap_applied}: ${quality.cap_reasons.join('; ')}]`
    : '';
  lines.push(
    `QUALITY: ${quality.score}/100 (${quality.grade})${deltaText}${capText} ` +
    `· coverage ${quality.coverage.measured}/${quality.coverage.total} (${quality.coverage.pct}%) ` +
    `· floor >=${quality.min_score} ${quality.meets_floor ? 'OK' : 'BELOW'}`
  );
  const layerParts = Object.entries(quality.layers).map(([id, layer]) => {
    const scoreText = layer.score === null ? 'n/a' : `${layer.score}`;
    return `${id}:${scoreText}(${layer.status})`;
  });
  if (layerParts.length) lines.push(`LAYERS:  ${layerParts.join('  ')}`);
  return lines.join('\n');
}

export function renderMarkdownTable(entries) {
  const header = [
    '| Date | Engine | Mode | Scope | Score | Grade | Delta | L0 | L1 | L2 | L3 | L5 | Coverage | Verdict |',
    '|---|---|---|---|---:|:---:|---:|---:|---:|---:|---:|---:|---:|---|'
  ];
  const cell = (layer) => (layer && typeof layer.score === 'number' ? String(layer.score) : '—');
  const rows = entries.map(({ report, quality, delta }) => {
    const date = String(report.started_at || '').slice(0, 10) || '?';
    const engine = report.engine?.version || '?';
    const mode = report.environment?.mode || '?';
    const scope = inferScope(report);
    const deltaStr = typeof delta === 'number' ? `${delta >= 0 ? '+' : ''}${delta}` : '—';
    const cov = `${quality.coverage.measured}/${quality.coverage.total}`;
    return `| ${date} | ${engine} | ${mode} | ${scope} | ${quality.score} | ${quality.grade} | ${deltaStr} | ` +
      `${cell(quality.layers.L0)} | ${cell(quality.layers.L1)} | ${cell(quality.layers.L2)} | ` +
      `${cell(quality.layers.L3)} | ${cell(quality.layers.L5)} | ${cov} | ${report.verdict || '?'} |`;
  });
  return [...header, ...rows].join('\n');
}

export function renderTextTable(entries) {
  const lines = ['Ombra antidetect quality scorecard', ''];
  for (const { file, report, quality, delta } of entries) {
    const date = String(report.started_at || '').slice(0, 19).replace('T', ' ');
    const engine = report.engine?.version || '?';
    const mode = report.environment?.mode || '?';
    const scope = inferScope(report);
    const deltaStr = typeof delta === 'number' ? ` (${delta >= 0 ? '+' : ''}${delta})` : '';
    const layers = ['L0', 'L1', 'L2', 'L3', 'L5']
      .filter((id) => quality.layers[id])
      .map((id) => `${id}=${quality.layers[id].score ?? 'n/a'}`)
      .join(' ');
    lines.push(
      `${date}  ${engine.padEnd(18)} ${mode.padEnd(8)} ${scope.padEnd(8)} ` +
      `${String(quality.score).padStart(5)}/100 (${quality.grade.padEnd(2)})${deltaStr.padEnd(9)} ` +
      `${(report.verdict || '?').padEnd(14)} ${layers}  [${basename(file)}]`
    );
  }
  const latest = entries[entries.length - 1];
  if (latest) {
    lines.push('', `Latest targets (${basename(latest.file)}):`);
    for (const target of latest.report.targets || []) {
      const scored = latest.quality.targets.find((item) => item.id === target.id);
      const scoreStr = scored?.score === null || scored?.score === undefined ? 'n/a' : `${scored.score}/100`;
      const failText = target.failures?.length ? ` — ${target.failures.join('; ')}` : '';
      lines.push(`  ${target.id.padEnd(6)} ${target.status.padEnd(11)} ${scoreStr.padStart(7)}${failText}`);
    }
  }
  return lines.join('\n');
}

async function collectReportFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const resolved = resolve(input);
    const info = await stat(resolved);
    if (info.isDirectory()) {
      const names = (await readdir(resolved)).filter((name) => name.endsWith('.json')).sort();
      for (const name of names) files.push(join(resolved, name));
    } else {
      files.push(resolved);
    }
  }
  return files;
}

function parseCliArgs(argv) {
  const opts = { paths: [], markdown: false, json: false, minScore: null, mode: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--markdown' || arg === '--md') opts.markdown = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--mode') {
      const value = argv[++i];
      if (!['headed', 'headless'].includes(value)) throw new Error('--mode must be headed or headless');
      opts.mode = value;
    } else if (arg === '--min-score') {
      const raw = argv[++i];
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0 || num > 100) throw new Error('--min-score must be 0..100');
      opts.minScore = num;
    } else if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`unknown option: ${arg}`);
    } else {
      opts.paths.push(arg);
    }
  }
  return opts;
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Ombra antidetect quality scorecard (v${SCORE_VERSION})

Usage:
  node checks/benchmark/score.mjs [options] [report.json | checks/results/]

Options:
  --markdown, --md   output GitHub Markdown scorecard table
  --json             output machine-readable JSON array
  --mode MODE        filter by headed | headless
  --min-score N      exit 1 if latest report score < N or verdict is FAIL/INCOMPLETE
`);
    return 0;
  }

  const defaultDir = join(resolve(fileURLToPath(import.meta.url), '..', '..'), 'results');
  const files = await collectReportFiles(opts.paths.length ? opts.paths : [defaultDir]);
  if (!files.length) {
    console.error('no report JSON files found');
    return 2;
  }

  const loaded = [];
  for (const file of files) {
    const report = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(report.targets)) continue;
    if (opts.mode && report.environment?.mode !== opts.mode) continue;
    const quality = qualityOfReport(report, opts.minScore !== null ? { minScore: opts.minScore } : {});
    loaded.push({ file, report, quality });
  }
  if (!loaded.length) {
    console.error('no matching conformance reports found');
    return 2;
  }

  loaded.sort((a, b) => String(a.report.started_at || '').localeCompare(String(b.report.started_at || '')));

  // Compute delta against previous report of the same (mode, scope).
  const prevByKey = new Map();
  const entries = loaded.map((item) => {
    const key = `${item.report.environment?.mode || '?'}|${inferScope(item.report)}`;
    const prev = prevByKey.get(key);
    const delta = prev ? round1(item.quality.score - prev.quality.score) : null;
    prevByKey.set(key, item);
    return { ...item, delta };
  });

  if (opts.json) {
    console.log(JSON.stringify(entries.map(({ file, report, quality, delta }) => ({
      file: basename(file),
      run_id: report.run_id,
      started_at: report.started_at,
      engine: report.engine?.version,
      mode: report.environment?.mode,
      scope: inferScope(report),
      verdict: report.verdict,
      delta,
      quality
    })), null, 2));
  } else if (opts.markdown) {
    console.log(renderMarkdownTable(entries));
  } else {
    console.log(renderTextTable(entries));
  }

  if (opts.minScore !== null) {
    const latest = entries[entries.length - 1];
    const failed = latest.quality.score < opts.minScore ||
      ['FAIL', 'INCOMPLETE'].includes(latest.report.verdict) ||
      latest.quality.targets.some((item) => item.status === 'FAIL' && item.critical);
    if (failed) return 1;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(`score failed: ${error.message}`);
    process.exitCode = 2;
  });
}
