# Stealth checkup

A repeatable procedure for deciding whether an Ombra engine build, SDK change, or automation-client configuration is allowed to ship from a stealth standpoint.

This is not a promise that a browser is undetectable. Detection is a moving target: it depends on the site, region, IP reputation, account history, browser version, detector version, and the coherence of the profile. The checkup exists to replace anecdotes with **measurements taken under recorded conditions**, and to catch regressions before users do.

The method borrows heavily from two open projects that got the boring parts right: [stealth-browser-mcp](https://github.com/vibheksoni/stealth-browser-mcp), whose weekly multi-OS benchmark and status model are a good template, and early [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) READMEs, which published a detector table instead of a vague claim. We keep the reproducibility and drop the guarantees.

## 1. Principles

1. **Measure, do not assert.** Every claim in a release note must point to a report with a run ID.
2. **Record the conditions.** OS, engine version, Chromium milestone, mode, proxy country, seed hash, detector versions, and date. A result without them is not a result.
3. **Separate engine defects from client defects.** A leak caused by an external Playwright/Puppeteer configuration is not an engine failure, but it is still a user-facing failure and must be documented.
4. **Gate on regressions, not absolute perfection.** Some targets are expected to degrade on GPU-less CI or behind a proxy. The baseline encodes what is known and accepted.
5. **Expire waivers.** A known gap has an owner and a review date. Silent permanent exceptions are how stealth rot starts.
6. **Redact aggressively.** No proxy credentials, full IPs, cookies, tokens, or profile data in reports or CI artifacts.

## 2. Detection layers

The checkup covers six layers. Each layer has a different owner and a different failure mode.

| Layer | What is measured | Owner | Typical targets |
|---|---|---|---|
| **L0 Transport** | Exit IP, DNS, WebRTC, TLS, HTTP/2, headers | Engine + SDK proxy relay | TrackMe, IP/WebRTC leak pages, header echoes |
| **L1 Identity** | UA, Client Hints, platform, GPU, screen, fonts, locale, timezone | Engine | Local probe, Sannysoft, Intoli |
| **L2 Fingerprint** | Canvas, WebGL, audio, client rects, voices, media devices | Engine | CreepJS, FingerprintJS, BrowserScan, Pixelscan |
| **L3 Automation** | WebDriver, CDP artifacts, injected scripts, bindings, stack traces | Engine + SDK/helper | rebrowser, brotector, botd, local probe |
| **L4 Behavior** | Trusted input, event order, mouse path, typing, scroll, timing | Engine humanize + automation client | Input fidelity page, CAPTCHA flows |
| **L5 Consistency** | Seed stability, main/worker/iframe agreement, reloads, cross-SDK parity | Engine + SDK | Local probe across contexts |

A profile can pass L1 and fail L0 because the proxy exit does not match the timezone. It can pass L2 and fail L3 because a helper enabled `Runtime`. The layers are scored separately on purpose.

## 3. Threat model

Detectors combine signals; no single check is decisive.

- **Server-side:** IP reputation and ASN, TLS JA3/JA4, HTTP/2 fingerprint, header order and casing, cookie behavior, request timing, geolocation consistency.
- **Client-side JavaScript:** `navigator` surface, Client Hints, canvas/WebGL/audio hashes, fonts, permissions, WebRTC candidates, storage quota, CDP artifacts, error stack traces, event `isTrusted`.
- **Behavioral:** pointer paths, click down/up intervals, typing cadence, scroll physics, focus changes, navigation timing, CAPTCHA interaction.
- **Cross-request:** fingerprint reuse across sessions, profile switching, cookie and locale history, contradiction between visits.

The adversary is not a single page. A production anti-bot system correlates all four groups and may challenge again after a successful pass. The checkup therefore treats a single green screenshot as evidence for exactly one run, not for a release.

## 4. Preconditions

Before running any target:

- [ ] Engine build is the exact artifact under test, recorded by version and SHA-256.
- [ ] SDK version, automation-client version, and engine version are recorded; no second client is attached to the engine.
- [ ] A dedicated test profile exists with a fixed seed and no personal data.
- [ ] Proxy is configured on the profile, and the exit country is recorded.
- [ ] Timezone, locale, and WebRTC are set to follow the proxy exit unless the test explicitly checks manual values.
- [ ] Headed or headless mode is recorded. Detectors behave differently; both modes are required for a full pass.
- [ ] Extensions are disabled except the test extension, if the run measures extensions.
- [ ] No debugger, DevTools window, or second automation client is attached.
- [ ] The machine has a working GPU for GPU-gated targets. GPU-less CI uses software WebGL and is scored as `DEGRADED` on renderer checks only.
- [ ] Test accounts and target sites are authorized for this kind of testing.

Record all of this in the report header. If a condition is unknown, the run is `UNREACHABLE` for targets that depend on it.

## 5. Status model

| Status | Meaning | Release effect |
|---|---|---|
| **PASS** | Every check in the target passed | Counts toward the gate |
| **DEGRADED** | Only known, documented minor checks failed | Allowed only with a `known_gap` entry: reason, owner, expiry |
| **FAIL** | At least one critical check failed | Blocks the release |
| **UNREACHABLE** | The target could not be loaded or measured | Rerun; two consecutive failures block or require an owner waiver |

Critical checks are the ones that identify automation directly or break coherence:

- `navigator.webdriver` is truthy.
- A CDP leak fires (`runtimeEnableLeak`, `exposeFunctionLeak`, `pwInitScripts`, `sourceUrlLeak`).
- An injected script or binding is visible to the page.
- The host IP is visible over HTTP, STUN, or TURN.
- JA4 or HTTP/2 does not match the engine's Chromium.
- A headless marker or a fingerprint lie is detected.
- The same seed produces different fingerprints across launches.
- UA, Client Hints, platform, and GPU contradict each other.

Everything else is minor by default and must be classified in the target definition, not at report time.

Volatile values are recorded but do not decide a verdict: FingerprintJS ML scores, CreepJS percentages that move between runs, proxy/VPN flags when a proxy is intentionally used, and ad-tech verdicts that depend on account history.

## 6. Targets and gates

The IDs are stable and are used in reports and baselines.

| ID | Target | Layer | What it catches | Gate |
|---|---|---|---|---|
| `L0-01` | Launch flags audit | L0 | Automation, sandbox, or override flags in the real command line | No forbidden flags |
| `L0-02` | IP and WebRTC leak | L0 | Host IP over HTTP, STUN, or TURN | Exit IP only |
| `L0-03` | TLS and HTTP/2 | L0 | JA3N, JA4, Akamai hash, cipher and extension differences | Match reference Chromium |
| `L0-04` | Proxy relay | L0 | Credentials in the process list, relay exposed beyond loopback | Loopback only; no secret in the command line |
| `L1-01` | Local fingerprint probe | L1 | WebDriver, chrome object, plugins, permissions, UA-CH, screen, fonts, timezone | All critical checks pass |
| `L1-02` | Sannysoft | L1 | Classic headless and automation tells | All rows green |
| `L1-03` | Intoli headless test | L1 | Older headless markers and UA consistency | All rows pass |
| `L1-04` | Client Hints coherence | L1 | UA vs `Sec-CH-UA`, platform, architecture, bitness | No contradiction |
| `L2-01` | CreepJS | L2 | Deep fingerprinting, headless/stealth percentages, lies | No `lie` section; no headless marker |
| `L2-02` | FingerprintJS / botd | L2 | Bot detection and visitor stability | `bot: false`; stable visitor ID for the same seed |
| `L2-03` | BrowserScan | L2 | Bot detection, masking, proxy, timezone deductions | `NoDetection`; no bot-control deduction |
| `L2-04` | Pixelscan | L2 | Automation behavior, masking, WebRTC, proxy signals | No automated-behavior verdict; leak flags empty |
| `L2-05` | Fingerprint.com demo | L2 | Bot and tampering signals | `not_detected`; `anti_detect_browser: false` |
| `L3-01` | rebrowser bot detector | L3 | `Runtime.enable`, binding, init-script, source-URL leaks | No leaks |
| `L3-02` | brotector | L3 | CDP and automation fingerprints | No detections |
| `L3-03` | Init-script and stack probe | L3 | Visible injections, `toString` anomalies, stack traces | No artifacts |
| `L3-04` | CDP command audit | L3 | Domains and commands used by the client | No `Runtime.enable`, `Debugger`, `Log` |
| `L4-01` | Input fidelity | L4 | Synthetic events, missing `isTrusted`, wrong event order | All events trusted and ordered |
| `L4-02` | Humanize traces | L4 | Teleport clicks, linear typing, instant scroll | Within recorded human ranges |
| `L4-03` | CAPTCHA flow | L4 | Detection, timing, manual-mode behavior | State transitions match policy |
| `L4-04` | Live challenge smoke | L0–L4 | Cloudflare, Queue-it, or a production challenge | Resolves without manual intervention; not a guarantee |
| `L5-01` | Seed stability | L5 | Same seed, different persona across launches | Identical canonical hashes |
| `L5-02` | Context agreement | L5 | Main frame vs worker vs iframe vs cross-origin | Same values |
| `L5-03` | Reload stability | L5 | Noise resets, canvas drift, storage changes | Stable hashes |
| `L5-04` | Cross-SDK parity | L5 | SDK-specific launch or CDP behavior | Identical hashes for the same profile |
| `L5-05` | Profile persistence | L5 | Seed drift across restarts, concurrent launch of one profile | Identical hash; second launch gets `ProfileBusy` |

### Target notes

**L0-01 — Launch flags.** Inspect the actual command line of the engine process, not the SDK's intent. Forbidden: `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--headless=old`, `--no-sandbox` on a host that supports the sandbox, `--remote-debugging-port` with a fixed public port, `--user-agent` overrides, and any flag the SDK did not intend to pass. The engine's real command line is the source of truth.

**L0-02 — IP and WebRTC.** Test over HTTP, a STUN page, and a TURN relay. A profile behind a proxy must not expose the host IP through any path. A direct profile may show its own IP; that is not a leak. Record the exit country and compare it with timezone and locale.

**L0-03 — TLS and HTTP/2.** Use a local TrackMe instance or `tls.peet.ws`. Compare JA3N, JA4, and the Akamai HTTP/2 hash with a real Chrome of the same milestone. A mismatch usually means a non-Chromium client, a TLS-terminating proxy, or a build with a modified network stack.

**L0-04 — Proxy relay.** When the SDK uses an authenticated proxy, inspect the engine command line and the open ports. The engine must see a loopback proxy without credentials; the relay must bind to `127.0.0.1` and only the child process may connect. A credential in the process list, a relay on `0.0.0.0`, or a direct connection that bypasses the relay is a failure.

**L1-01 — Local probe.** Keep a bundled page that runs without network access. It must cover `navigator.webdriver`, `window.chrome`, plugins, permissions, UA-CH, hardware concurrency, device memory, screen and viewport, color depth, timezone, languages, WebGL vendor and renderer, fonts, and a canvas hash. This is the first target to run and the first to fail when a build is wrong.

**L1-02 / L1-03 — Public identity suites.** Sannysoft and Intoli are old but still catch careless regressions. They are not sufficient on their own; they are cheap and stable smoke tests.

**L2-01 — CreepJS.** Treat percentages as trend data. The gate is the presence of a lie section or an explicit headless marker, not a particular trust score. CreepJS is cloud-assisted in some builds; record whether the score was available.

**L2-02 — FingerprintJS / botd.** Run the local botd bundle when possible, because the demo page changes. The visitor ID must be stable for the same seed and must change when the seed changes. A stable ID across different seeds is a bug in the persona generator, not a win.

**L2-03 / L2-04 / L2-05 — Commercial detectors.** These are point-in-time services. Record the detector version or page hash, the region, and the raw verdict. A `Proxy detected` flag is expected when a proxy is used and must not be scored as a failure; a `Masking detected` flag is a failure. Fingerprint.com's ML score is volatile and is recorded as data only.

**L3-01 / L3-02 — CDP leaks.** Run the local rebrowser and brotector bundles. The critical checks are `runtimeEnableLeak`, `exposeFunctionLeak`, `navigatorWebdriver`, `pwInitScripts`, and `sourceUrlLeak`. If the automation client itself calls `Runtime.enable`, the run must distinguish that from an engine defect. The preferred client configuration avoids the domain entirely.

**L3-03 — Init-script and stack probe.** Load a page that inspects `Function.prototype.toString`, `Error.prepareStackTrace`, script source URLs, and unexpected globals. Any injected helper must be invisible or must not exist. Ombra's engine automation uses an isolated world named `ombra`; a visible world or a global binding is a failure.

**L3-04 — CDP command audit.** Put a logging WebSocket proxy between the automation client and the CDP endpoint returned by the SDK, or use the client's protocol log. Record every domain and method. `Runtime.enable`, `Debugger.enable`, `Log.enable`, `Page.addScriptToEvaluateOnNewDocument`, and `Target.setAutoAttach` with unexpected filters are red flags. This audit is how SDK regressions are caught before a detector notices them.

**L4-01 — Input fidelity.** Use a page that records pointer, mouse, keyboard, and focus events with `isTrusted`, timestamps, coordinates, and order. A correct click is a `mouseMoved` sequence, `mousePressed`, `mouseReleased`, with plausible timing. A correct keystroke carries `key`, `code`, `keyCode`, and, where relevant, composition data. `element.click()` and direct value assignment fail this target.

**L4-02 — Humanize traces.** Compare recorded traces with the engine's persona envelopes: speed, pause distribution, path curvature, overshoot, scroll decay. The gate is not "looks human" in a screenshot; it is "stays inside the recorded envelope for this preset".

**L4-03 — CAPTCHA flow.** Only for profiles with the module enabled. Verify detection, state transitions, timing budget, attempt limit, manual-mode pause, and that a failed solve does not leave the profile in a stuck state. This target does not assert a solve rate.

**L4-04 — Live challenge smoke.** Run one or two public challenges, for example `nowsecure.nl`, in a region and on an IP that are recorded in the report. Count manual interactions and time-to-pass. This is a smoke test, not a hard gate: site policy, IP reputation, and challenge version change without notice. A regression matters only when the same site passed on the same runner and exit before.

**L5-01 — Seed stability.** Launch the same profile three times. Canonicalize the fingerprint into a stable JSON object (sorted keys, excluded volatiles) and hash it. All three hashes must match. Change the seed and confirm the hash changes.

**L5-02 — Context agreement.** The same canvas, WebGL, audio, and timezone values must be returned from the main frame, a dedicated worker, a same-origin iframe, and a cross-origin iframe. A value that differs by context is a detection signal even if each value looks plausible alone.

**L5-03 — Reload stability.** Reload the page, navigate away and back, and restore a closed profile. Noise must not reset per document, and storage quota must not jump.

**L5-04 — Cross-SDK parity.** Run the same profile and seed through Python, Node.js, and at least one compiled-language SDK. The canonical hashes must match. A difference means an SDK is adding a flag, a CDP command, or a launch option it should not.

**L5-05 — Profile persistence.** Launch a named profile, record the canonical hash, close it, and launch it again without passing a seed. The hash must match. Launch the same profile twice concurrently: the second launch must fail with `ProfileBusy`, not steal the lock or spawn a second browser.

## 7. Runbook

### Step 0 — Freeze the inputs

```text
engine_version:   151.0.7922.108 (build SHA-256)
sdk_version:      <version>
client_version:   <version>
contract_version: 0.1.0
os:               macOS 15.x arm64 / Windows 11 x64 / Ubuntu 24.04 x64
mode:             headed | headless
proxy_country:    <ISO country>
seed_hash:        sha256(seed) — never the raw seed in public reports
detectors:        rebrowser <sha>, brotector <sha>, botd <version>, ...
```

### Step 1 — Engine harness

Run the engine's QA suite first. It is the only place with full access to process flags, CDP logs, and profile internals.

```bash
# From the engine repository.
scripts/mac/qa.sh --detectors \
  --proxy socks5://127.0.0.1:10808 \
  --persona macos-full \
  --mode both \
  --report-dir qa/out/checkup-$(date +%F)
```

The harness writes `report.json` and `report.md`. Preserve both; the JSON is the machine-readable source, the Markdown is for humans.

### Step 2 — SDK and client pass

The SDK does not change the engine, but it chooses the binary, launch options, and CDP client. Run the same profile through each SDK under test and capture:

- the real engine command line;
- the CDP command audit;
- the local probe output;
- the public target screenshots and raw text.

Use the engine harness for the engine and the manual matrix below for the client; any automated runner must follow the invariants and report format in [AGENTS.md](../AGENTS.md#sdk-conformance-and-stealth-invariants).

### Step 3 — Collect artifacts

Per target: status, failure text, screenshot, raw DOM or JSON, detector version, and timestamp. Store artifacts under a run directory keyed by run ID. Redact credentials and full IPs at capture time, not at publication time.

### Step 4 — Compare with the baseline

The baseline is keyed by `target × platform × mode × engine major`. Compare:

- a target that passed before and fails now → regression, block;
- a target that failed before and passes now → remove the known gap;
- a new flag on a passing target → investigate, even if the verdict did not change;
- a tool version change → mark the comparison invalid and rebuild the baseline.

### Step 5 — Sign off

The release owner signs the report, not the person who ran it. The signature means: conditions were recorded, artifacts exist, gates were applied, and every exception has an owner and an expiry date.

## 8. Per-signal checklist

Use this as the manual matrix when the automated runner is not available.

### L0 — Transport

| Check | Expected | If it fails |
|---|---|---|
| HTTP exit IP | Proxy exit | Proxy not applied to the profile, or a direct request escaped |
| STUN candidate | Proxy exit or no candidate | WebRTC is bypassing the proxy |
| TURN relay | Proxy exit | UDP path leaks the host |
| DNS resolution | Through the proxy path | DNS leak or split tunneling |
| JA3N / JA4 | Matches reference Chromium | TLS-terminating proxy, non-Chromium client, modified network stack |
| HTTP/2 Akamai hash | Matches reference Chromium | Same as above |
| Header order | Chromium-like | A proxy or SDK rewrote headers |
| Timezone vs exit | Coherent | `automatic_timezone` is off, or the proxy geo is wrong |
| Locale vs exit | Coherent | Manual language overrides the profile |

### L1 — Identity

| Check | Expected | If it fails |
|---|---|---|
| `navigator.webdriver` | `false` | Engine patch missing, or `--enable-automation` |
| `window.chrome` | Object with runtime | Not Chromium, or a stripped build |
| Plugins | Five PDF plugins | Headless build or a stripped profile |
| Permissions | `prompt` for notifications | Automation defaults or a bad override |
| UA | No `Headless`, version matches engine | Old flag or a client override |
| UA-CH brands | Include the engine's Chromium brand and major version | UA and Client Hints disagree |
| `navigator.platform` | Matches the persona OS | Persona generator or OS mismatch |
| Hardware concurrency | Matches persona | Host value leaked |
| Device memory | Matches persona | Host value leaked |
| Screen / avail / DPR | Matches persona | Playwright viewport override |
| Color depth | 24 or 30, coherent | Headless default |
| Fonts | Persona-consistent set | Host fonts leaked or seed ignored |
| WebGL vendor / renderer | Coherent with persona GPU | Software renderer or host GPU leaked |

### L2 — Fingerprint

| Check | Expected | If it fails |
|---|---|---|
| Canvas hash | Stable per seed, different across seeds | Noise per call, or no seed |
| WebGL image hash | Stable per seed | Same as above |
| Audio fingerprint | Stable per seed | Same as above |
| Client rects | Stable per seed | Same as above |
| Voices | Persona-consistent | Host voices leaked |
| Media devices | Persona-consistent | Host devices leaked |
| Storage quota | Persona-consistent | Default or host value |
| `lie` sections (CreepJS) | None | A spoofed property is detectable |
| Masking flags | None | A detector sees the patch itself |

### L3 — Automation

| Check | Expected | If it fails |
|---|---|---|
| `Runtime.enable` used | No | Automation client or SDK enabled it |
| `exposeFunction` leak | No | A binding is visible |
| Init script leak | No | `addScriptToEvaluateOnNewDocument` is visible |
| Source URL leak | No | An injected script has a file URL |
| `navigator.webdriver` | `false` | See L1 |
| `cdc_` globals | Absent | Chromedriver is attached |
| Isolated world visible | No | The helper world is exposed |
| CDP auto-attach artifacts | None | A client attached to every target |
| Console / Log domains | Not enabled | A client enabled them for debugging |

### L4 — Behavior

| Check | Expected | If it fails |
|---|---|---|
| Click events | Trusted, ordered, plausible timing | DOM `.click()` or a synthetic event |
| Mouse path | Curved, with pauses and overshoot | Teleport to the target |
| Keystrokes | `key`, `code`, `keyCode`, composition | `insertText` only, or wrong layout |
| Paste | Engine hotkey or trusted insert | `navigator.clipboard` write from JS |
| Scroll | Wheel events with decay | `scrollTo` jumps |
| Focus | Real focus and blur sequence | Programmatic focus only |
| CAPTCHA state | Matches policy and timing | Module disabled or stuck |

### L5 — Consistency

| Check | Expected | If it fails |
|---|---|---|
| Same seed, three launches | Identical canonical hash | Persona is not seed-deterministic |
| Different seed | Different hash | Seed is ignored |
| Main vs worker | Identical surfaces | Surface is patched only in the main world |
| Main vs iframe | Identical surfaces | Patch does not apply to iframes |
| Cross-origin iframe | Identical surfaces | Origin-dependent patch |
| Reload | Stable hashes | Noise resets per document |
| Profile restart | Stable hashes | Persona is regenerated |
| Cross-SDK | Identical hashes | SDK adds flags or CDP calls |

## 9. Reporting

Reports are JSON first, Markdown second. The schema lives in [AGENTS.md](../AGENTS.md#conformance-and-stealth-report-format). A minimal report:

```json
{
  "run_id": "2026-11-16-macos-arm64-001",
  "started_at": "2026-11-16T09:00:00Z",
  "operator": "engine-qa",
  "sdk": { "name": "python", "version": "0.1.0" },
  "engine": { "version": "151.0.7922.108", "sha256": "…" },
  "environment": {
    "os": "macOS 15.7 arm64",
    "mode": "headed",
    "proxy_country": "DE",
    "seed_hash": "sha256:…"
  },
  "targets": [
    {
      "id": "L1-01",
      "status": "PASS",
      "failures": [],
      "artifacts": ["artifacts/L1-01/probe.json"]
    },
    {
      "id": "L2-03",
      "status": "DEGRADED",
      "failures": ["Proxy detected (expected: proxy in use)"],
      "known_gap": { "owner": "engine", "reason": "proxy flag is expected", "expires": "2026-12-31" }
    }
  ],
  "verdict": "PASS_WITH_GAPS"
}
```

Rules:

- `verdict` is `PASS`, `PASS_WITH_GAPS`, `FAIL`, or `INCOMPLETE`.
- A `FAIL` target makes the verdict `FAIL`.
- An `UNREACHABLE` required target makes the verdict `INCOMPLETE` until rerun.
- `known_gap` is mandatory for `DEGRADED`.
- Artifact paths are relative to the run directory.
- The raw seed is never stored. The hash is enough to compare runs.

## 10. CI and regression

The weekly matrix, adapted from stealth-browser-mcp's benchmark:

| Dimension | Values |
|---|---|
| OS | macOS arm64, Windows x64, Ubuntu x64 |
| Mode | headed, headless |
| Chromium | current stable, previous milestone |
| Proxy | direct, one residential exit |
| SDK | Python, Node.js, and one compiled language per rotation |

The job:

1. Builds or installs the engine artifact under test.
2. Runs the local probe and CDP audit first; fails fast.
3. Runs public targets with a bounded timeout.
4. Writes `report.json` and publishes it as an artifact.
5. Compares against `baseline.json` for the same key.
6. Opens an issue labeled `stealth-regression` when a previously passing target fails.
7. Never opens an issue for `UNREACHABLE`; it retries once, then reports `INCOMPLETE`.

CI-specific rules:

- Linux runners without a GPU report software WebGL. That is a known `DEGRADED` on renderer checks, not a release blocker.
- Public services are rate-limited and change without notice. Prefer local bundles for gates and treat public targets as smoke tests.
- Tool versions are pinned in the report. If a tool updates, the baseline is invalid until rebuilt.
- Secrets are injected at runtime and never written to artifacts. Logs are scrubbed for proxy URLs and IPs.

## 11. Triage

| Symptom | Likely cause | Fix |
|---|---|---|
| `navigator.webdriver === true` | Patch missing, `--enable-automation`, chromedriver | Rebuild the engine, audit flags, remove the driver |
| `runtimeEnableLeak` | Client enabled `Runtime` | Use a client configuration that does not, or patch the client |
| `pwInitScripts` / `sourceUrlLeak` | Init script injected by the client | Remove `addScriptToEvaluateOnNewDocument`; use engine humanize |
| Canvas hash changes every call | Noise applied per call | Seed the noise per profile, not per document |
| Canvas same across seeds | Seed ignored by the patch | Fix the engine seed path |
| WebGL software renderer | No GPU, headless CI, `--disable-gpu` | Expected on CI; use a GPU host for release runs |
| Timezone mismatch | `automatic_timezone` off, wrong proxy geo | Enable auto or fix the profile |
| WebRTC real IP | Proxy bypassed, UDP leak, TURN fallback | Fix the proxy path; block non-proxied UDP |
| JA4 mismatch | TLS proxy, non-Chromium client, modified network stack | Use a pass-through proxy and the real engine |
| Fonts from host | Seed not applied, or fonts loaded from OS | Check the font model and persona |
| Sannysoft WebGL red | Software renderer | GPU host; not a code defect |
| Cloudflare loop | IP reputation, cookies, headless, behavior | Change exit, clear profile, run headed, inspect input |
| CAPTCHA not detected | Module off, build mismatch, task type unsupported | Enable the module; record the unsupported type |
| Profile closes after last tab | Expected headed behavior when the script closes all tabs | Keep a tab open or run headless |
| `ProfileBusy` | Another process holds the profile lock | Close the other browser or use a different profile |
| `Launch timeout` | Engine missing, license refused, blocked binary, slow start | Run `binary_info()`, check the license and the engine stderr, then retry |
| `ChecksumMismatch` | Binary replaced or download corrupted | Clear the SDK cache and re-run `ensure_binary()` |

## 12. What this checkup does not cover

- A specific site's proprietary scoring model. Only that site can measure it.
- Account reputation, cookies, and browsing history. A perfect fingerprint on a burned account still fails.
- Legal or contractual permission to automate a target.
- Long-term drift. A pass is valid for the recorded build and date, not forever.
- Solve rates for CAPTCHA. The checkup verifies state and policy, not success percentages.

## 13. Lessons adopted from the ecosystem

**From stealth-browser-mcp**

- Use a real Chrome-family browser over CDP, not a driver that advertises itself.
- Audit the real launch command line, not the wrapper's intent.
- Test pre-document injection as a capability, then make sure production paths do not leave artifacts.
- Send input through trusted CDP events; keep a separate path for large paste.
- Keep the tool surface small. Their `--xpool-safe` mode disables CDP function tools because `Runtime.enable` is a liability; the same logic applies to SDK helpers.
- Publish a status model and a weekly matrix, and open regression issues automatically.
- Say "measurements, not guarantees".

**From early CloakBrowser**

- Put the detector table in the README, with the test date and browser version.
- Explain the mechanism, not just the result.
- Treat the arms race as a fact and say what happens when detection evolves.
- Keep the install path and the first example short.

**From the Ombra engine QA**

- Separate engine defects from test-harness defects by running the same tests against stock Chrome.
- Keep known gaps in a registry with a reason and a patch ID, and fail when a known gap starts passing.
- Run detectors in the engine's default context, not a fresh incognito context.
- Record tool versions and rebuild baselines when they change.
- Compare against a reference engine on the same profile instead of arguing from a checklist.

## 14. References

- [stealth-browser-mcp](https://github.com/vibheksoni/stealth-browser-mcp) and its [STEALTH_TESTS.md](https://github.com/vibheksoni/stealth-browser-mcp/blob/master/STEALTH_TESTS.md) — weekly multi-OS benchmark, status model, local probe.
- [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) — early READMEs with a public detector table and mechanism-first explanation.
- [CreepJS](https://github.com/abrahamjuliot/creepjs) — deep fingerprint and lie detection.
- [rebrowser-bot-detector](https://github.com/rebrowser/rebrowser-bot-detector) — CDP leak checks.
- [brotector](https://github.com/kaliiiiiiiiii/brotector) — automation fingerprint checks.
- [FingerprintJS botd](https://github.com/fingerprintjs/BotD) — open bot detection.
- [TrackMe](https://github.com/adryfish/TrackMe) — TLS and HTTP/2 fingerprint comparison.
- [Sannysoft](https://bot.sannysoft.com/) and [Intoli](https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html) — classic headless smoke tests.
- [BrowserScan](https://browserscan.net/bot-detection), [Pixelscan](https://pixelscan.net/), [IPLeak](https://ipleak.net/) — public detector pages used as smoke tests.

The engine's own QA harness, personas, known gaps, and detector baseline are documented in the engine repository (`docs/QA.md`). That document is the source of truth for engine-level runs; this checkup wraps it in release gates and cross-SDK parity.
