/*
 * Ombra checks — external antidetect checkers.
 *
 * Runs public external detectors inside an Ombra browser session over raw CDP
 * (without calling Runtime.enable, matching conformance invariant SI-01), parses
 * verdicts deterministically, redacts IPs/credentials, and maps results to
 * docs/stealth-checkup.md target IDs (L0-02..L3-02).
 *
 * No npm dependencies. Node.js 22+ (global fetch/WebSocket).
 */

import { createHash } from 'node:crypto';

export const EXTERNAL_VERSION = '1.0.0';
export const DEFAULT_EXTERNAL_TIMEOUT = 45000;

export const CHECKER_ORDER = [
  'tls',
  'ipleak',
  'sannysoft',
  'intoli',
  'creepjs',
  'fingerprintjs',
  'browserscan',
  'pixelscan',
  'iphey',
  'rebrowser',
  'deviceinfo'
];

export const EXTERNAL_PRESETS = {
  all: CHECKER_ORDER,
  core: ['tls', 'ipleak', 'sannysoft', 'creepjs', 'fingerprintjs', 'browserscan', 'pixelscan', 'iphey', 'rebrowser'],
  fast: ['tls', 'ipleak', 'intoli', 'creepjs', 'fingerprintjs', 'browserscan', 'rebrowser']
};

export const CHECKER_META = {
  tls: { id: 'L0-03', layer: 'L0', name: 'TLS & HTTP/2 (peet.ws / browserleaks)', url: 'https://tls.peet.ws/api/all', timeoutFloor: 25000 },
  ipleak: { id: 'L0-02', layer: 'L0', name: 'IP & WebRTC leak (ipleak + STUN)', url: 'https://ipleak.net/json/', timeoutFloor: 30000 },
  sannysoft: { id: 'L1-02', layer: 'L1', name: 'Sannysoft bot test', url: 'https://bot.sannysoft.com/', timeoutFloor: 25000 },
  intoli: { id: 'L1-03', layer: 'L1', name: 'Intoli headless test', url: 'https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html', timeoutFloor: 25000 },
  creepjs: { id: 'L2-01', layer: 'L2', name: 'CreepJS', url: 'https://abrahamjuliot.github.io/creepjs/', timeoutFloor: 45000 },
  fingerprintjs: { id: 'L2-02', layer: 'L2', name: 'FingerprintJS OSS (reload stability)', url: 'https://fingerprintjs.github.io/fingerprintjs/', timeoutFloor: 30000 },
  browserscan: { id: 'L2-03', layer: 'L2', name: 'BrowserScan', url: 'https://www.browserscan.net/', timeoutFloor: 60000 },
  pixelscan: { id: 'L2-04', layer: 'L2', name: 'Pixelscan', url: 'https://pixelscan.net/fingerprint-check', timeoutFloor: 60000 },
  iphey: { id: 'L2-05', layer: 'L2', name: 'IPhey', url: 'https://iphey.com/', timeoutFloor: 45000 },
  rebrowser: { id: 'L3-01', layer: 'L3', name: 'rebrowser bot detector', url: 'https://bot-detector.rebrowser.net/', timeoutFloor: 30000 },
  deviceinfo: { id: 'L3-02', layer: 'L3', name: 'deviceandbrowserinfo bot test', url: 'https://deviceandbrowserinfo.com/are_you_a_bot', timeoutFloor: 35000 }
};

export function resolveExternalSelection(spec) {
  if (!spec) return [];
  if (spec === true) return [...EXTERNAL_PRESETS.all];
  const tokens = String(spec).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length) return [...EXTERNAL_PRESETS.all];
  const selected = [];
  for (const token of tokens) {
    if (EXTERNAL_PRESETS[token]) {
      for (const name of EXTERNAL_PRESETS[token]) {
        if (!selected.includes(name)) selected.push(name);
      }
    } else if (CHECKER_META[token]) {
      if (!selected.includes(token)) selected.push(token);
    } else {
      throw new Error(
        `unknown external checker or preset ${JSON.stringify(token)}; ` +
        `valid presets: ${Object.keys(EXTERNAL_PRESETS).join(', ')}; ` +
        `valid checkers: ${CHECKER_ORDER.join(', ')}`
      );
    }
  }
  return selected;
}

export function hashValue(value) {
  if (!value) return null;
  return `sha256:${createHash('sha256').update(String(value)).digest('hex').slice(0, 16)}`;
}

const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6_RE = /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{0,4}\b/gi;
const SAFE_IPS = new Set(['127.0.0.1', '0.0.0.0', '::1']);

export function extractIps(text) {
  const out = new Set();
  const str = String(text || '');
  for (const match of str.match(IPV4_RE) || []) out.add(match);
  for (const match of str.match(IPV6_RE) || []) {
    if (match.includes(':') && !/^\d+:\d+(:\d+)?$/.test(match)) out.add(match.toLowerCase());
  }
  return [...out];
}

export function isPrivateIpv4(ip) {
  const parts = String(ip).split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

export function scrubIps(text) {
  if (!text) return text;
  let out = String(text);
  out = out.replace(IPV4_RE, (ip) => (SAFE_IPS.has(ip) ? ip : '<ip>'));
  out = out.replace(IPV6_RE, (ip) => {
    if (SAFE_IPS.has(ip.toLowerCase()) || /^\d+:\d+(:\d+)?$/.test(ip)) return ip;
    return '<ip>';
  });
  return out;
}

const CHALLENGE_PATTERNS = [
  /just a moment\.\.\./i,
  /checking (?:your|if the site connection) browser/i,
  /verify you are human/i,
  /attention required!\s*\|\s*cloudflare/i,
  /enable javascript and cookies to continue/i,
  /access denied\s*\|/i,
  /error 1020|error 1015|rate limit exceeded/i,
  /please complete the security check/i,
  /ddos protection by/i
];

const NETWORK_ERROR_RE = /\b(ERR_CONNECTION_RESET|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT|ERR_TIMED_OUT|ERR_NAME_NOT_RESOLVED|ERR_PROXY_CONNECTION_FAILED|ERR_TUNNEL_CONNECTION_FAILED|ERR_SSL_PROTOCOL_ERROR|ERR_EMPTY_RESPONSE)\b/;

export function detectChallengeWall(title = '', text = '') {
  const combined = `${title || ''}\n${String(text || '').slice(0, 1500)}`;
  const netMatch = combined.match(NETWORK_ERROR_RE);
  if (netMatch) {
    return `network error (${netMatch[1]}; retry with --proxy if region-blocked)`;
  }
  for (const pattern of CHALLENGE_PATTERNS) {
    if (pattern.test(combined)) {
      return `blocked by WAF/challenge (${pattern.source.slice(0, 32)})`;
    }
  }
  return null;
}

function makeGap(reasons, options = {}) {
  return {
    owner: options.knownGapOwner || options.operator || 'local',
    reason: reasons.join('; ').slice(0, 500),
    expires: options.knownGapExpires || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  };
}

function makeTargetResult(key, { status, failures = [], flags = [], metrics = {}, critical = false, durationMs = 0, options = {} }) {
  const meta = CHECKER_META[key];
  const target = {
    id: meta.id,
    checker: key,
    status,
    failures,
    flags,
    metrics,
    duration_ms: Math.round(durationMs),
    artifacts: [meta.url]
  };
  if (critical && status === 'FAIL') target.critical = true;
  if (status === 'DEGRADED') {
    target.known_gap = makeGap(failures.length ? failures : flags, options);
  }
  return target;
}

// ---------------------------------------------------------------------------
// Pure parsers (exported for deterministic unit testing)
// ---------------------------------------------------------------------------

export function parseTlsResponse(data, endpoint = 'tls.peet.ws', options = {}) {
  if (!data || typeof data !== 'object') {
    return makeTargetResult('tls', {
      status: 'UNREACHABLE',
      failures: [`invalid JSON from ${endpoint}`],
      options
    });
  }

  const tls = data.tls || data;
  const http2 = data.http2 || {};
  const ja4 = tls.ja4 || data.ja4 || null;
  const ja3Hash = tls.ja3_hash || data.ja3_hash || null;
  const ja3nHash = data.ja3n_hash || tls.ja3n_hash || null;
  const akamaiHash = http2.akamai_fingerprint_hash || data.akamai_hash || null;
  const httpVersion = data.http_version || (akamaiHash ? 'h2' : null);
  const headers = Array.isArray(http2.sent_frames)
    ? http2.sent_frames.flatMap((frame) => frame.headers || [])
    : (Array.isArray(data.headers) ? data.headers : []);

  const userAgent = data.user_agent ||
    headers.find((h) => typeof h === 'string' && /^user-agent:/i.test(h))?.replace(/^user-agent:\s*/i, '') ||
    null;
  const hasSecChUa = headers.some((h) => typeof h === 'string' && /^sec-ch-ua:/i.test(h)) ||
    Boolean(data.sec_ch_ua);

  const critical = [];
  const degraded = [];
  const flags = [];

  if (userAgent && /HeadlessChrome/i.test(userAgent)) {
    critical.push('HTTP User-Agent contains HeadlessChrome');
    flags.push('http-ua-headless');
  }
  if (!ja4 && !ja3Hash && !ja3nHash) {
    critical.push('TLS fingerprint (JA4/JA3) missing from endpoint response');
    flags.push('tls-missing');
  }
  if (ja4 && !/^t1[23]d/i.test(String(ja4))) {
    degraded.push(`unexpected JA4 prefix: ${String(ja4).slice(0, 10)}`);
    flags.push('ja4-unusual');
  }
  if (endpoint === 'tls.peet.ws') {
    if (httpVersion && !/^(h2|h3|http\/2|http\/3)/i.test(String(httpVersion))) {
      critical.push(`unexpected HTTP version ${httpVersion} (expected h2)`);
      flags.push(`http-version:${httpVersion}`);
    }
    if (!akamaiHash) {
      degraded.push('HTTP/2 Akamai fingerprint hash missing');
      flags.push('h2-akamai-missing');
    }
  } else {
    degraded.push(`primary TLS endpoint unreachable; used fallback ${endpoint}`);
    flags.push('tls-fallback');
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('tls', {
    status,
    failures: critical.concat(degraded),
    flags,
    critical: critical.length > 0,
    metrics: {
      endpoint,
      http_version: httpVersion,
      ja4,
      ja3_hash: ja3Hash || ja3nHash,
      akamai_hash: akamaiHash,
      has_sec_ch_ua: hasSecChUa,
      ua_headless: Boolean(userAgent && /HeadlessChrome/i.test(userAgent))
    },
    options
  });
}

export function parseIpLeakData({ httpJson, webrtcText, webrtcCandidates = [], hostIp = null, proxyUsed = false }, options = {}) {
  const httpIp = httpJson?.ip || null;
  const country = (httpJson?.country_code || httpJson?.country || '').toUpperCase();
  const validCountry = /^[A-Z]{2}$/.test(country) ? country : null;

  if (!httpIp && !webrtcText && !webrtcCandidates.length) {
    return makeTargetResult('ipleak', {
      status: 'UNREACHABLE',
      failures: ['could not read HTTP exit IP or WebRTC candidates'],
      options
    });
  }

  const webrtcIps = new Set();
  for (const ip of extractIps(webrtcText || '')) {
    if (!SAFE_IPS.has(ip)) webrtcIps.add(ip);
  }
  for (const cand of webrtcCandidates) {
    for (const ip of extractIps(typeof cand === 'string' ? cand : cand?.raw || cand?.address || '')) {
      if (!SAFE_IPS.has(ip)) webrtcIps.add(ip);
    }
  }

  const privateLeaks = [...webrtcIps].filter((ip) => isPrivateIpv4(ip));
  const critical = [];
  const degraded = [];
  const flags = [];

  if (proxyUsed && hostIp) {
    if (httpIp && httpIp === hostIp) {
      critical.push('real host IP visible over HTTP (proxy bypassed)');
      flags.push('real-ip-http');
    }
    if (webrtcIps.has(hostIp)) {
      critical.push('real host IP leaked via WebRTC');
      flags.push('real-ip-webrtc');
    }
  }

  if (privateLeaks.length) {
    critical.push(`local RFC1918 IP leaked via WebRTC (${privateLeaks.length} address(es))`);
    flags.push('webrtc-local-ip-leak');
  }

  if (!httpIp) {
    degraded.push('HTTP exit IP unavailable from ipleak.net');
    flags.push('http-ip-missing');
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('ipleak', {
    status,
    failures: critical.concat(degraded),
    flags,
    critical: critical.length > 0,
    metrics: {
      proxy_used: Boolean(proxyUsed),
      exit_country: validCountry,
      http_ip_hash: hashValue(httpIp),
      webrtc_ip_count: webrtcIps.size,
      webrtc_private_leak_count: privateLeaks.length,
      host_ip_leaked: Boolean(proxyUsed && hostIp && (httpIp === hostIp || webrtcIps.has(hostIp)))
    },
    options
  });
}

const SANNYSOFT_CRITICAL = new Set([
  'User Agent',
  'WebDriver',
  'WebDriver (New)',
  'WebDriver Advanced',
  'Chrome',
  'Chrome (New)',
  'Permissions',
  'Plugins Length',
  'Languages'
]);

export function parseSannysoftRows(rows, options = {}) {
  if (!Array.isArray(rows) || rows.length < 8) {
    return makeTargetResult('sannysoft', {
      status: 'UNREACHABLE',
      failures: [`unexpected Sannysoft table (${Array.isArray(rows) ? rows.length : 0} rows)`],
      options
    });
  }

  const red = rows.filter((row) => row.failed).map((row) => row.name);
  const criticalRed = red.filter((name) => SANNYSOFT_CRITICAL.has(name));
  const minorRed = red.filter((name) => !SANNYSOFT_CRITICAL.has(name));
  const passedCount = rows.length - red.length;

  const failures = [];
  if (criticalRed.length) failures.push(`critical failed rows: ${criticalRed.join(', ')}`);
  if (minorRed.length) failures.push(`minor failed rows: ${minorRed.join(', ')}`);

  const status = criticalRed.length ? 'FAIL' : minorRed.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('sannysoft', {
    status,
    failures,
    flags: red,
    critical: criticalRed.length > 0,
    metrics: {
      total_rows: rows.length,
      passed_rows: passedCount,
      failed_rows: red.length
    },
    options
  });
}

export function parseIntoliRows(rows, options = {}) {
  if (!Array.isArray(rows) || rows.length < 4) {
    return makeTargetResult('intoli', {
      status: 'UNREACHABLE',
      failures: [`unexpected Intoli table (${Array.isArray(rows) ? rows.length : 0} rows)`],
      options
    });
  }

  const red = rows.filter((row) => row.failed).map((row) => row.name);
  const status = red.length ? 'FAIL' : 'PASS';
  return makeTargetResult('intoli', {
    status,
    failures: red.length ? [`failed checks: ${red.join(', ')}`] : [],
    flags: red,
    critical: red.length > 0,
    metrics: {
      total_rows: rows.length,
      passed_rows: rows.length - red.length,
      failed_rows: red.length
    },
    options
  });
}

export function parseCreepjsData({ text = '', lies = [] }, options = {}) {
  const fpMatch = String(text).match(/FP ID:\s*([0-9a-f]{8,})/i);
  if (!fpMatch) {
    return makeTargetResult('creepjs', {
      status: 'UNREACHABLE',
      failures: ['CreepJS did not produce FP ID'],
      options
    });
  }

  const pct = (pattern) => {
    const match = String(text).match(pattern);
    return match ? Number(match[1]) : 0;
  };
  const likeHeadless = pct(/(\d+)%\s*like\s+headless/i);
  const headless = pct(/^(?!.*like\s+headless)[^\n]*?(\d+)%\s+headless/im);
  const stealth = pct(/(\d+)%\s*stealth/i);
  const cleanLies = Array.isArray(lies) ? lies.map((s) => String(s).trim()).filter(Boolean) : [];

  const critical = [];
  const degraded = [];
  const flags = [];

  if (cleanLies.length) {
    critical.push(`${cleanLies.length} lie(s): ${cleanLies.slice(0, 8).join(', ')}`);
    for (const lie of cleanLies) flags.push(`lie:${lie}`);
  }
  if (headless > 0) {
    critical.push(`headless=${headless}%`);
    flags.push(`headless:${headless}%`);
  }
  if (stealth > 0) {
    critical.push(`stealth=${stealth}%`);
    flags.push(`stealth:${stealth}%`);
  }
  if (likeHeadless >= 50) {
    degraded.push(`like-headless=${likeHeadless}% (>=50%)`);
    flags.push(`like-headless:${likeHeadless}%`);
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('creepjs', {
    status,
    failures: critical.concat(degraded),
    flags,
    critical: critical.length > 0,
    metrics: {
      fp_id: fpMatch[1].slice(0, 16),
      lies_count: cleanLies.length,
      headless_pct: headless,
      stealth_pct: stealth,
      like_headless_pct: likeHeadless
    },
    options
  });
}

export function parseFingerprintjsData({ firstId = null, secondId = null, confidence = null }, options = {}) {
  const id1 = firstId ? String(firstId).trim() : null;
  const id2 = secondId ? String(secondId).trim() : null;
  if (!id1) {
    return makeTargetResult('fingerprintjs', {
      status: 'UNREACHABLE',
      failures: ['FingerprintJS did not produce a visitorId'],
      options
    });
  }

  const critical = [];
  const degraded = [];
  const flags = [];
  const stable = Boolean(id2 && id1 === id2);
  if (id2 && id1 !== id2) {
    critical.push('visitorId changed across reload on the same origin');
    flags.push('visitorId-unstable');
  } else if (!id2) {
    degraded.push('reload stability check did not capture second visitorId');
    flags.push('reload-missing');
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('fingerprintjs', {
    status,
    failures: critical.concat(degraded),
    flags,
    critical: critical.length > 0,
    metrics: {
      visitor_id_hash: hashValue(id1),
      reload_stable: stable,
      confidence: typeof confidence === 'number' ? confidence : null
    },
    options
  });
}

export function parseBrowserscanText(text, options = {}) {
  const str = String(text || '');
  const scoreMatch = str.match(/authenticity:\s*(\d{1,3})\s*%/i);
  if (!scoreMatch) {
    return makeTargetResult('browserscan', {
      status: 'UNREACHABLE',
      failures: ["no 'Browser fingerprint authenticity: NN%' found"],
      options
    });
  }
  const percent = Number(scoreMatch[1]);
  const botMatch = str.match(/Bot Detection:\s*\n\s*([^\n]+)/i) || str.match(/Bot Detection:\s*([A-Za-z0-9_-]+)/i);
  const botLabel = botMatch ? botMatch[1].trim() : '';
  if (!botLabel || /authenticity/i.test(botLabel)) {
    return makeTargetResult('browserscan', {
      status: 'UNREACHABLE',
      failures: ["scan incomplete: 'Bot Detection:' has no verdict"],
      options
    });
  }

  const lines = str.split(/\r?\n/).map((line) => line.trim());
  const deductions = [];
  for (let i = 1; i < lines.length; i++) {
    const pm = lines[i].match(/^-(\d+)\s*%$/);
    if (!pm) continue;
    const name = lines[i - 1];
    if (name) deductions.push({ name, penalty: Number(pm[1]) });
  }

  const botDetected = botLabel.toLowerCase() !== 'nodetection' ||
    deductions.some((d) => /bot\s*control|automation/i.test(d.name));

  const critical = [];
  const degraded = [];
  const flags = deductions.map((d) => `${d.name}(-${d.penalty}%)`);

  if (botDetected) {
    critical.push(`bot detection: ${botLabel}`);
    flags.unshift(`bot:${botLabel}`);
  }
  if (percent < 70) {
    critical.push(`authenticity ${percent}% (<70%)`);
  } else if (percent < 95 || deductions.length > 0) {
    const names = deductions.map((d) => `${d.name} -${d.penalty}%`).join(', ');
    degraded.push(`authenticity ${percent}%${names ? ` (${names})` : ''}`);
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('browserscan', {
    status,
    failures: critical.concat(degraded),
    flags,
    critical: botDetected,
    metrics: {
      authenticity_pct: percent,
      bot_label: botLabel,
      deduction_count: deductions.length,
      deductions
    },
    options
  });
}

const PIXELSCAN_CARDS = [
  'Proxy detected',
  'VPN detected',
  'Masking detected',
  'Timezone spoofed',
  'Language mismatch',
  'Automation framework',
  'Automated behavior detected'
];
const PIXELSCAN_CRITICAL_CARDS = new Set([
  'Masking detected',
  'Automation framework',
  'Automated behavior detected'
]);
const PIXELSCAN_PROXY_EXPECTED = new Set(['Proxy detected', 'VPN detected']);

export function parsePixelscanText(text, { proxyUsed = false, hostIp = null } = {}, options = {}) {
  const str = String(text || '');
  const verdictMatch = str.match(/Your Browser Fingerprint is (consistent|inconsistent)/i);
  if (!verdictMatch) {
    return makeTargetResult('pixelscan', {
      status: 'UNREACHABLE',
      failures: ["no 'Your Browser Fingerprint is (in)consistent' verdict found"],
      options
    });
  }
  const inconsistent = verdictMatch[1].toLowerCase() === 'inconsistent';
  const cards = PIXELSCAN_CARDS.filter((card) => {
    const escaped = card.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<!No\\s)${escaped}`, 'i').test(str);
  });

  const webrtcLineMatch = str.match(/WebRTC IP Address\s*\n([^\n]*)/i);
  const webrtcIps = webrtcLineMatch ? extractIps(webrtcLineMatch[1]) : [];
  const hostLeaked = Boolean(proxyUsed && hostIp && webrtcIps.includes(hostIp));

  const critical = [];
  const degraded = [];
  const flags = [];

  for (const card of cards) {
    if (proxyUsed && PIXELSCAN_PROXY_EXPECTED.has(card)) continue;
    flags.push(card);
    if (PIXELSCAN_CRITICAL_CARDS.has(card)) critical.push(card);
    else degraded.push(card);
  }
  if (hostLeaked) {
    critical.push('real host IP leaked via WebRTC');
    flags.push('real-ip-webrtc');
  }
  if (inconsistent) {
    flags.unshift('inconsistent');
    if (!critical.length) degraded.push('fingerprint reported inconsistent');
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('pixelscan', {
    status,
    failures: critical.concat(degraded),
    flags,
    critical: critical.length > 0,
    metrics: {
      inconsistent,
      cards_detected: cards,
      proxy_flags_ignored: proxyUsed ? cards.filter((c) => PIXELSCAN_PROXY_EXPECTED.has(c)) : [],
      host_ip_leaked: hostLeaked
    },
    options
  });
}

export function parseIpheyText(text, { proxyUsed = false } = {}, options = {}) {
  const str = String(text || '');
  const verdictMatch = str.match(/Your Digital Identity Looks\s*[\r\n]+\s*(Trustworthy|Unreliable|Suspicious)/i) ||
    str.match(/Looks\s+(Trustworthy|Unreliable|Suspicious)/i);
  if (!verdictMatch) {
    return makeTargetResult('iphey', {
      status: 'UNREACHABLE',
      failures: ["no IPhey verdict ('Trustworthy'/'Suspicious'/'Unreliable') found"],
      options
    });
  }
  const verdict = verdictMatch[1].toLowerCase();
  const mxMatch = str.match(/(\d{1,3})\s*[\r\n]+\s*MX SCORE/i);
  const mxScore = mxMatch ? Number(mxMatch[1]) : null;

  const sections = {};
  for (const name of ['BROWSER', 'LOCATION', 'IP ADDRESS', 'HARDWARE', 'SOFTWARE']) {
    const match = str.match(new RegExp(`^${name}\\s*[\\r\\n]+\\s*([^\\r\\n]+)`, 'im'));
    sections[name.toLowerCase()] = match ? match[1].trim() : '';
  }

  const critical = [];
  const degraded = [];
  const flags = [];

  for (const key of ['browser', 'hardware', 'software']) {
    const val = sections[key];
    if (!val) continue;
    const bad = key === 'browser'
      ? /click here to see|unreliable|suspicious|mismatch|detected/i.test(val)
      : !/everything is fine|reliable|authentic/i.test(val);
    if (bad) {
      critical.push(`${key}: ${val}`);
      flags.push(`${key}:${val}`);
    }
  }
  for (const key of ['location', 'ip address']) {
    const val = sections[key];
    if (!val) continue;
    if (/unreliable|suspicious|proxy|vpn|mismatch|click here/i.test(val)) {
      if (proxyUsed && /proxy|vpn/i.test(val)) continue;
      degraded.push(`${key}: ${val}`);
      flags.push(`${key}:${val}`);
    }
  }

  if (verdict === 'unreliable') {
    flags.unshift('unreliable');
    if (!critical.length) critical.push('IPhey verdict: unreliable');
  } else if (verdict === 'suspicious') {
    flags.unshift('suspicious');
    if (!critical.length && !degraded.length) degraded.push('IPhey verdict: suspicious');
  }

  const status = critical.length ? 'FAIL' : degraded.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('iphey', {
    status,
    failures: critical.concat(degraded),
    flags,
    critical: critical.length > 0,
    metrics: {
      verdict,
      mx_score: mxScore,
      sections
    },
    options
  });
}

const REBROWSER_CRITICAL = new Set([
  'runtimeEnableLeak',
  'exposeFunctionLeak',
  'navigatorWebdriver',
  'pwInitScripts',
  'sourceUrlLeak',
  'mainWorldExecution',
  'dummyFn'
]);

export function parseRebrowserDetections(detections, options = {}) {
  if (!Array.isArray(detections) || !detections.length) {
    return makeTargetResult('rebrowser', {
      status: 'UNREACHABLE',
      failures: ['rebrowser detections array is empty'],
      options
    });
  }

  const red = detections.filter((d) => Number(d?.rating) >= 1).map((d) => String(d.type));
  const yellow = detections.filter((d) => Number(d?.rating) > 0 && Number(d?.rating) < 1).map((d) => String(d.type));
  const criticalRed = red.filter((type) => REBROWSER_CRITICAL.has(type));
  const otherRed = red.filter((type) => !REBROWSER_CRITICAL.has(type));

  const failures = [];
  if (criticalRed.length) failures.push(`critical CDP/automation leaks: ${criticalRed.join(', ')}`);
  if (otherRed.length) failures.push(`red detections: ${otherRed.join(', ')}`);
  if (yellow.length) failures.push(`warnings: ${yellow.join(', ')}`);

  const flags = [...red, ...yellow.map((t) => `${t}?`)];
  const status = red.length ? 'FAIL' : yellow.length ? 'DEGRADED' : 'PASS';
  return makeTargetResult('rebrowser', {
    status,
    failures,
    flags,
    critical: criticalRed.length > 0,
    metrics: {
      total_checks: detections.length,
      red_count: red.length,
      yellow_count: yellow.length,
      red,
      yellow
    },
    options
  });
}

export function parseDeviceInfoData({ text = '', verdict = null, details = null }, options = {}) {
  const str = String(text || '');
  const isHuman = verdict === 'human' ||
    /you are human|not a bot|human \(|likely human|no bot detected/i.test(str);
  const isBot = verdict === 'bot' ||
    /you are a bot|bot detected|automated browser detected|likely a bot/i.test(str);

  if (!isHuman && !isBot && !details) {
    return makeTargetResult('deviceinfo', {
      status: 'UNREACHABLE',
      failures: ['deviceandbrowserinfo did not render a bot/human verdict'],
      options
    });
  }

  const botFlags = [];
  if (details && typeof details === 'object') {
    for (const [key, val] of Object.entries(details)) {
      if (val === true && /^(isBot|isAutomated|isHeadless|isWebDriver|hasBot|webdriver|cdp)/i.test(key)) {
        botFlags.push(key);
      }
    }
  }

  const critical = [];
  if (isBot) critical.push('classified as bot');
  if (botFlags.length) critical.push(`bot signals: ${botFlags.join(', ')}`);

  const status = critical.length ? 'FAIL' : isHuman ? 'PASS' : 'DEGRADED';
  return makeTargetResult('deviceinfo', {
    status,
    failures: critical.length ? critical : (status === 'DEGRADED' ? ['inconclusive verdict'] : []),
    flags: isBot ? ['bot', ...botFlags] : botFlags,
    critical: critical.length > 0,
    metrics: {
      verdict: isBot ? 'bot' : (isHuman ? 'human' : 'unknown'),
      bot_flags: botFlags
    },
    options
  });
}

// ---------------------------------------------------------------------------
// CDP page helpers (never call Runtime.enable — SI-01)
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function openTab(cdp, url, timeoutMs) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  const loaded = cdp.once('Page.loadEventFired', Math.min(timeoutMs, 15000), sessionId).catch(() => null);
  const nav = await cdp.send('Page.navigate', { url }, sessionId);
  if (nav?.errorText) {
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
    throw new Error(`navigation failed: ${nav.errorText}`);
  }
  await loaded;
  return { targetId, sessionId };
}

async function closeTab(cdp, targetId) {
  if (targetId) await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
}

async function readPageSummary(cdp, sessionId, evaluate) {
  return evaluate(
    cdp,
    sessionId,
    `({ title: document.title || '', readyState: document.readyState || '', text: (document.body && document.body.innerText) || '' })`,
    10000
  );
}

async function waitForCondition(cdp, sessionId, evaluate, jsExpr, timeoutMs, pollMs = 800) {
  const started = Date.now();
  const deadline = started + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(cdp, sessionId, jsExpr, 8000);
      if (value) return value;
      // Fast-fail once an error page or WAF wall is rendered (avoid wasting 45-60s).
      if (Date.now() - started >= 2500) {
        const { challenge } = await checkChallenge(cdp, sessionId, evaluate);
        if (challenge) return null;
      }
    } catch { /* page still navigating or updating */ }
    await sleep(pollMs);
  }
  return null;
}

async function waitStableText(cdp, sessionId, evaluate, { maxMs = 20000, quietMs = 3500, stepMs = 1000 } = {}) {
  let last = '';
  let quiet = 0;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const now = await evaluate(cdp, sessionId, `(document.body && document.body.innerText) || ''`, 8000).catch(() => last);
    if (now === last && now.length > 0) {
      quiet += stepMs;
      if (quiet >= quietMs) return now;
    } else {
      last = now;
      quiet = 0;
    }
    await sleep(stepMs);
  }
  return last;
}

async function checkChallenge(cdp, sessionId, evaluate) {
  const summary = await readPageSummary(cdp, sessionId, evaluate).catch(() => ({ title: '', text: '' }));
  return { summary, challenge: detectChallengeWall(summary.title, summary.text) };
}

// ---------------------------------------------------------------------------
// Live checker executors
// ---------------------------------------------------------------------------

async function runTlsChecker(ctx) {
  const endpoints = [
    { name: 'tls.peet.ws', url: 'https://tls.peet.ws/api/all' },
    { name: 'tls.browserleaks.com', url: 'https://tls.browserleaks.com/json' }
  ];
  let lastErr = 'no TLS endpoint responded';
  for (const ep of endpoints) {
    let tab = null;
    try {
      tab = await openTab(ctx.cdp, ep.url, ctx.timeout);
      const body = await waitForCondition(
        ctx.cdp, tab.sessionId, ctx.evaluate,
        `(() => { const t = (document.body && document.body.innerText || '').trim(); return t.startsWith('{') ? t : null; })()`,
        Math.min(ctx.timeout, 20000),
        500
      );
      if (!body) {
        const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
        lastErr = challenge || `empty JSON from ${ep.name}`;
        continue;
      }
      const parsed = JSON.parse(body);
      return parseTlsResponse(parsed, ep.name, ctx.gapOptions);
    } catch (error) {
      lastErr = `${ep.name}: ${error.message}`;
    } finally {
      await closeTab(ctx.cdp, tab?.targetId);
    }
  }
  return makeTargetResult('tls', { status: 'UNREACHABLE', failures: [lastErr], options: ctx.gapOptions });
}

async function runIpLeakChecker(ctx) {
  let httpJson = null;
  let webrtcText = '';
  let webrtcCandidates = [];
  let tab = null;

  try {
    tab = await openTab(ctx.cdp, 'https://ipleak.net/json/', ctx.timeout);
    const jsonText = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `(() => { const t = (document.body && document.body.innerText || '').trim(); return t.startsWith('{') ? t : null; })()`,
      Math.min(ctx.timeout, 18000),
      500
    );
    if (jsonText) {
      try { httpJson = JSON.parse(jsonText); } catch { /* ignore */ }
    }
    // Probe WebRTC STUN candidates directly on this live HTTPS origin so we still test WebRTC
    // even when browserleaks.com is blocked on the current exit.
    const rtc = await ctx.evaluate(ctx.cdp, tab.sessionId, `(async () => {
      if (typeof RTCPeerConnection === 'undefined') return [];
      const out = [];
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.createDataChannel('c');
        pc.onicecandidate = (e) => { if (e.candidate && e.candidate.candidate) out.push(e.candidate.candidate); };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise((r) => setTimeout(r, 3000));
        pc.close();
      } catch {}
      return out;
    })()`, 10000).catch(() => []);
    if (Array.isArray(rtc)) webrtcCandidates = rtc;
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
    tab = null;
  }

  try {
    tab = await openTab(ctx.cdp, 'https://browserleaks.com/webrtc', 8000);
    await sleep(3500);
    const { summary, challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
    if (!challenge) webrtcText = summary.text || '';
  } catch {
    // Keep HTTP IP + STUN candidate results if browserleaks.com is blocked
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }

  return parseIpLeakData(
    { httpJson, webrtcText, webrtcCandidates, hostIp: ctx.hostIp, proxyUsed: Boolean(ctx.proxy) },
    ctx.gapOptions
  );
}

async function runSannysoftChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.sannysoft.url, ctx.timeout);
    const ready = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `document.querySelectorAll('table tr').length >= 8`,
      Math.min(ctx.timeout, 15000),
      800
    );
    if (!ready) {
      const { summary, challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      const reason = challenge || (summary.readyState === 'loading'
        ? 'Sannysoft page stalled in readyState=loading (likely CDN/ISP block — retry with --proxy)'
        : 'unexpected Sannysoft table (0 rows)');
      return makeTargetResult('sannysoft', { status: 'UNREACHABLE', failures: [reason], options: ctx.gapOptions });
    }
    await sleep(2000);

    const rows = await ctx.evaluate(ctx.cdp, tab.sessionId, `(() => Array.from(document.querySelectorAll('table tr')).map(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(c => (c.innerText || '').trim());
      const tds = Array.from(tr.querySelectorAll('td'));
      const failed = tds.some(td => /\\bfailed\\b/.test(td.className));
      return { name: cells[0] || '', value: cells[1] || '', failed };
    }).filter(r => r.name && r.name !== 'TEST NAME'))()`, 10000);
    return parseSannysoftRows(rows, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runIntoliChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.intoli.url, ctx.timeout);
    await sleep(3000);
    const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
    if (challenge) return makeTargetResult('intoli', { status: 'UNREACHABLE', failures: [challenge], options: ctx.gapOptions });

    const rows = await ctx.evaluate(ctx.cdp, tab.sessionId, `(() => Array.from(document.querySelectorAll('table tr')).map(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(c => (c.innerText || '').trim());
      const tds = Array.from(tr.querySelectorAll('td'));
      const failed = tds.some(td => /\\bfailed\\b/.test(td.className));
      return { name: cells[0] || '', value: cells[1] || '', failed };
    }).filter(r => r.name && !/^(test|result)/i.test(r.name)))()`, 10000);
    return parseIntoliRows(rows, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runCreepjsChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.creepjs.url, ctx.timeout);
    const ready = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `Boolean(document.body && /FP ID:\\s*[0-9a-f]{8}/i.test(document.body.innerText || ''))`,
      ctx.timeout,
      1000
    );
    if (!ready) {
      const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      return makeTargetResult('creepjs', {
        status: 'UNREACHABLE',
        failures: [challenge || `CreepJS timed out after ${ctx.timeout}ms`],
        options: ctx.gapOptions
      });
    }
    await sleep(3500);
    const data = await ctx.evaluate(ctx.cdp, tab.sessionId, `(() => {
      const text = (document.body && document.body.innerText) || '';
      const lies = Array.from(document.querySelectorAll('.lies')).map(el => {
        const card = el.closest('.col-six, .col-four, .col-eight');
        const title = card ? (card.querySelector('strong') || {}).textContent : '';
        return ((title || '').trim() || (el.textContent || '').trim()).slice(0, 80);
      }).filter(Boolean);
      return { text, lies };
    })()`, 12000);
    return parseCreepjsData(data, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runFingerprintjsChecker(ctx) {
  const readVisitor = async (sessionId) => {
    const found = await waitForCondition(
      ctx.cdp, sessionId, ctx.evaluate,
      `(() => {
        const text = (document.body && document.body.innerText) || '';
        const m = text.match(/Visitor identifier:\\s*[\\r\\n]*\\s*([a-z0-9]{16,})/i);
        if (!m) return null;
        const cm = text.match(/Confidence score:\\s*[\\r\\n]*\\s*([0-9.]+)/i);
        return { id: m[1], confidence: cm ? Number(cm[1]) : null };
      })()`,
      Math.min(ctx.timeout, 20000),
      600
    );
    return found;
  };

  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.fingerprintjs.url, ctx.timeout);
    const first = await readVisitor(tab.sessionId);
    if (!first) {
      const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      return makeTargetResult('fingerprintjs', {
        status: 'UNREACHABLE',
        failures: [challenge || 'FingerprintJS demo did not render a visitor identifier'],
        options: ctx.gapOptions
      });
    }
    const reloaded = ctx.cdp.once('Page.loadEventFired', 15000, tab.sessionId).catch(() => null);
    await ctx.cdp.send('Page.reload', {}, tab.sessionId);
    await reloaded;
    const second = await readVisitor(tab.sessionId);
    return parseFingerprintjsData(
      { firstId: first.id, secondId: second?.id || null, confidence: first.confidence },
      ctx.gapOptions
    );
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runBrowserscanChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.browserscan.url, ctx.timeout);
    const ready = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `Boolean(document.body && /Bot Detection:\\s*[\\r\\n]+\\s*(?!Browser fingerprint authenticity)\\S/i.test(document.body.innerText || ''))`,
      ctx.timeout,
      1500
    );
    if (!ready) {
      const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      return makeTargetResult('browserscan', {
        status: 'UNREACHABLE',
        failures: [challenge || `BrowserScan did not finish within ${ctx.timeout}ms`],
        options: ctx.gapOptions
      });
    }
    const text = await waitStableText(ctx.cdp, tab.sessionId, ctx.evaluate, { maxMs: 20000, quietMs: 4000, stepMs: 1500 });
    return parseBrowserscanText(text, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runPixelscanChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.pixelscan.url, ctx.timeout);
    const ready = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `Boolean(document.body && /Your Browser Fingerprint is (consistent|inconsistent)/i.test(document.body.innerText || ''))`,
      ctx.timeout,
      1500
    );
    if (!ready) {
      const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      return makeTargetResult('pixelscan', {
        status: 'UNREACHABLE',
        failures: [challenge || `Pixelscan did not finish within ${ctx.timeout}ms`],
        options: ctx.gapOptions
      });
    }
    await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `Boolean(document.body && !/scanning…|collecting data…/i.test(document.body.innerText || ''))`,
      20000,
      1500
    );
    const text = await waitStableText(ctx.cdp, tab.sessionId, ctx.evaluate, { maxMs: 15000, quietMs: 3000, stepMs: 1000 });
    return parsePixelscanText(text, { proxyUsed: Boolean(ctx.proxy), hostIp: ctx.hostIp }, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runIpheyChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.iphey.url, ctx.timeout);
    const ready = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `Boolean(document.body && /Looks\\s+[\\r\\n]*\\s*(Trustworthy|Unreliable|Suspicious)/i.test(document.body.innerText || ''))`,
      ctx.timeout,
      1500
    );
    if (!ready) {
      const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      return makeTargetResult('iphey', {
        status: 'UNREACHABLE',
        failures: [challenge || `IPhey did not finish within ${ctx.timeout}ms`],
        options: ctx.gapOptions
      });
    }
    const text = await waitStableText(ctx.cdp, tab.sessionId, ctx.evaluate, { maxMs: 12000, quietMs: 3000, stepMs: 1000 });
    return parseIpheyText(text, { proxyUsed: Boolean(ctx.proxy) }, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runRebrowserChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.rebrowser.url, ctx.timeout);
    await sleep(1500);
    // Arm sourceUrlLeak the same way automation callers interact with the DOM (still no Runtime.enable).
    await ctx.evaluate(ctx.cdp, tab.sessionId, `Boolean(document.getElementById('detections-json'))`, 8000).catch(() => {});
    const ready = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `Boolean((Array.isArray(window.detections) && window.detections.length > 0) || (document.getElementById('detections-json') && (document.getElementById('detections-json').textContent || '').trim().startsWith('[')))`,
      Math.min(ctx.timeout, 25000),
      800
    );
    if (!ready) {
      const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      return makeTargetResult('rebrowser', {
        status: 'UNREACHABLE',
        failures: [challenge || 'rebrowser detections did not populate'],
        options: ctx.gapOptions
      });
    }
    await sleep(1500);
    const detections = await ctx.evaluate(ctx.cdp, tab.sessionId, `(() => {
      if (Array.isArray(window.detections) && window.detections.length) return window.detections;
      const el = document.getElementById('detections-json');
      if (el && el.textContent) { try { return JSON.parse(el.textContent); } catch {} }
      return [];
    })()`, 10000);
    return parseRebrowserDetections(detections, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

async function runDeviceInfoChecker(ctx) {
  let tab = null;
  try {
    tab = await openTab(ctx.cdp, CHECKER_META.deviceinfo.url, ctx.timeout);
    const ready = await waitForCondition(
      ctx.cdp, tab.sessionId, ctx.evaluate,
      `Boolean(document.body && /you are (?:human|a bot)|bot detected|likely (?:human|a bot)|not a bot|isBot/i.test(document.body.innerText || ''))`,
      ctx.timeout,
      1200
    );
    if (!ready) {
      const { challenge } = await checkChallenge(ctx.cdp, tab.sessionId, ctx.evaluate);
      return makeTargetResult('deviceinfo', {
        status: 'UNREACHABLE',
        failures: [challenge || `deviceandbrowserinfo timed out after ${ctx.timeout}ms`],
        options: ctx.gapOptions
      });
    }
    await sleep(2000);
    const data = await ctx.evaluate(ctx.cdp, tab.sessionId, `(() => {
      const text = (document.body && document.body.innerText) || '';
      let details = null;
      const pres = Array.from(document.querySelectorAll('pre, code'));
      for (const el of pres) {
        const raw = (el.textContent || '').trim();
        if (raw.startsWith('{') && raw.endsWith('}')) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') { details = parsed; break; }
          } catch {}
        }
      }
      return { text, details };
    })()`, 10000);
    return parseDeviceInfoData(data, ctx.gapOptions);
  } finally {
    await closeTab(ctx.cdp, tab?.targetId);
  }
}

const EXECUTORS = {
  tls: runTlsChecker,
  ipleak: runIpLeakChecker,
  sannysoft: runSannysoftChecker,
  intoli: runIntoliChecker,
  creepjs: runCreepjsChecker,
  fingerprintjs: runFingerprintjsChecker,
  browserscan: runBrowserscanChecker,
  pixelscan: runPixelscanChecker,
  iphey: runIpheyChecker,
  rebrowser: runRebrowserChecker,
  deviceinfo: runDeviceInfoChecker
};

export async function detectHostPublicIp() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('https://ipleak.net/json/', { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.ip === 'string' ? data.ip : null;
  } catch {
    return null;
  }
}

export async function runExternalCheckers({
  selection,
  cdp,
  evaluate,
  timeout = DEFAULT_EXTERNAL_TIMEOUT,
  retries = 1,
  proxy = null,
  hostIp = null,
  gapOptions = {},
  onResult = null
}) {
  const targets = [];
  let detectedCountry = null;

  for (const key of selection) {
    const executor = EXECUTORS[key];
    const meta = CHECKER_META[key];
    const effectiveTimeout = Math.max(timeout, meta.timeoutFloor || timeout);
    let result = null;
    const attempts = Math.max(1, 1 + retries);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const started = Date.now();
      try {
        result = await executor({
          cdp,
          evaluate,
          timeout: effectiveTimeout,
          proxy,
          hostIp,
          gapOptions
        });
        result.duration_ms = Date.now() - started;
      } catch (error) {
        result = makeTargetResult(key, {
          status: 'UNREACHABLE',
          failures: [scrubIps(error.message)],
          durationMs: Date.now() - started,
          options: gapOptions
        });
      }
      result.attempts = attempt;
      if (result.status !== 'UNREACHABLE') break;
      if (attempt < attempts) await sleep(2000);
    }

    if (key === 'ipleak' && result?.metrics?.exit_country) {
      detectedCountry = result.metrics.exit_country;
    }

    targets.push(result);
    if (onResult) onResult(result, meta);
  }

  return { targets, detectedCountry };
}
