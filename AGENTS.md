# Repository rules

## README translations

Keep the canonical English README at the repository root. Put each translation
in `translations/<locale>/README.md`, using the language tag as the directory
name (for example, `ru`, `zh-Hans`, or `zh-Hant`). When adding or moving a
translation, update the relative links in every README's language menu.

Store charts, diagrams, and screenshots with language-specific text in
`translations/<locale>/assets/`. For example, a Russian chart goes in
`translations/ru/assets/` and is linked from the Russian README as
`assets/chart.svg`. For English graphics with text, use `translations/en/assets/`.
Keep language-neutral graphics such as the logo in the shared root `assets/`.

## Benchmark quality must not regress between releases

The local fingerprint benchmark in `checks/` is release evidence, not an optional demo.

- Every release candidate must run `node checks/benchmark/run.mjs` against the engine artifact under test and commit the resulting JSON under `checks/results/`. On hosts where loopback HTTP is blocked, add `--transport file`; the report records the transport and any skipped probes as `known_gap`.
- Do not delete, rewrite, or silently replace earlier results. The history is the baseline.
- Compare the new result with the previous accepted result for the same engine mode, OS, transport, and probe version (the runner does this automatically; `--baseline` can name a specific report).
- Quality must not decrease from release to release. A regression is any of:
  - `L1-01`, `L5-01`, or `L5-02` dropping from `PASS` to `DEGRADED`, `FAIL`, or `UNREACHABLE`;
  - any external checker (`L0-02`..`L3-02`) dropping to `DEGRADED`/`FAIL` or gaining new detector flags;
  - the overall quality score (`checks.quality.score`) or any measured layer score dropping beyond tolerance, or falling below the release floor (`85`);
  - hard stability dropping below `100%`;
  - executed hard probe coverage decreasing;
  - hard noise rate rising above `0`;
  - hard probe error rate increasing;
  - the report verdict dropping from `PASS`.
- A regression blocks the release. Fix it, or record a `known_gap` with an owner and expiry date under `docs/stealth-checkup.md` §5 before shipping.
- Run both `headed` and `headless` modes for a full release; each mode has its own baseline. `--headless` alone is not a substitute for the headed pass.
- A `--no-sandbox` run is allowed only on hosts where the Chromium sandbox cannot initialize. The report records this as `DEGRADED` with `known_gap`; do not treat it as an `L0-01` launch-flags pass.
- Do not lower thresholds, remove probes, mark a failing target as `DEGRADED` without a gap entry, or delete a result to make a release pass.

See `checks/README.md` for the commands, report format, and target definitions.

## SDK conformance and stealth invariants

All language SDKs (`docs/sdk-contract.md`) must preserve the same launch behavior, lifecycle, and stealth surface:

- **Basic launch (`launch-basic`)**: `launch()` returns a native client browser (`playwright` or `puppeteer`, no wrapper API), can open a page and navigate, and `close()` cleanly terminates the engine process.
- **Profile lock (`launch-profile-lock`)**: one profile directory = one live browser. A concurrent launch on the same `profile` must fail with `ProfileBusy`; closing the first browser releases the lock so a subsequent launch succeeds.
- **Stealth invariants (`SI-01`..`SI-12`)**:
  - `SI-01`: Never send CDP `Runtime.enable`.
  - `SI-02`: Never send CDP `Debugger.enable` or `Log.enable`.
  - `SI-03`: Never inject init scripts (`Page.addScriptToEvaluateOnNewDocument`).
  - `SI-04`: Never override identity via CDP `Emulation.*` (`setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`, `setTouchEmulationEnabled`).
  - `SI-05`: Never add automation/unsafe CLI flags (`--enable-automation`, `--disable-blink-features=AutomationControlled`, `--headless=old`, `--disable-web-security`, `--ignore-certificate-errors`).
  - `SI-06`: Never pass proxy credentials or license keys on the CLI (forbid `://[^/@:]+:[^/@]+@`, `OMBRA_LICENSE_KEY=`, `Authorization: Bearer`).
  - `SI-07`: Never add `--user-agent` on the CLI.
  - `SI-08`: Bind the CDP debug port to loopback only (`127.0.0.1`).
  - `SI-09`: `navigator.webdriver` must be `false`.
  - `SI-10`: No SDK helper globals on page (`window.__ombra == null`).
  - `SI-11`: Never add `--no-sandbox` or `--disable-setuid-sandbox` unless explicitly passed in `args`.
  - `SI-12`: `binary_info()` must report `installed: true` and a 64-hex `sha256` before launch.

## Conformance and stealth report format

Shared JSON report format for benchmark, stealth checkup, and SDK runs (validated by `tools/check_repo.py`):

- Required top-level fields: `run_id`, `started_at` (ISO 8601), `operator`, `sdk` (`name`, `version`, optional `contract`/`sha256`), `engine` (`name`, `version`, optional `sha256`), `environment`, `targets` (non-empty), `verdict` (`PASS` | `PASS_WITH_GAPS` | `FAIL` | `INCOMPLETE`).
- `environment`: `os`, `mode` (`headed` | `headless`), `seed_hash` (`sha256:...` — never store the raw seed), optional `proxy_country` (ISO alpha-2 or `direct`), optional `notes`.
- Each entry in `targets`: `id` (e.g. `L1-01`, `SI-03`), `status` (`PASS` | `DEGRADED` | `FAIL` | `UNREACHABLE`), `failures[]`, optional `artifacts[]`, `duration_ms`, and `known_gap` (`{ owner, reason, expires: YYYY-MM-DD, issue? }`, required whenever `status == "DEGRADED"`).

## SDK launch options and binary info schemas

Language-neutral schemas shared across all SDKs (`additionalProperties: false` on every object; contract details in `docs/sdk-contract.md`):

### Launch options (`launch()`)

- `headless`: `bool` (default `true`)
- `mobile_viewport`: `{ width: int(1..10000), height: int(1..10000) } | null` (CSS pixels; host OS only)
- `proxy`: non-empty URL string **or** `{ type: "http"|"https"|"socks5", host: string, port: int(1..65535), username?: string, password?: string }`
- `fingerprint`: `{ seed?: int(>=0), os?: "macos"|"windows"|"linux", os_version?: string, timezone?: IANA|"auto", locale?: BCP-47|"auto", screen?: "auto"|{ width: int(>=320), height: int(>=240) }, gpu?: "auto"|{ vendor: string, renderer: string }, hardware_concurrency?: "auto"|int(>=1), device_memory?: "auto"|int(>=1), noise?: bool }`
- `profile` (named persistent profile, slugified) and `user_data_dir` (explicit path): non-empty strings, **mutually exclusive**
- `args`: `string[]` (default `[]`, passed through unchanged)
- `binary_path`: non-empty string
- `version`: string matching `^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(?:-(?:[1-9][0-9]*|0\+dev\.[0-9a-fA-F]+))?$` (overrides `OMBRA_VERSION`)
- `timeout_ms`: `int(1000..600000)` (default `30000`)
- `humanize`: `bool` **or** `{ preset?: "default"|"careful"|"fast" }`
- `license_key`: non-empty string (never logged)
- `env`: `Record<string, string>`
- `download`: `bool` (default `true`)

### Binary info (`binary_info()`)

- Required: `version` (non-empty string), `platform` (e.g. `macos-arm64`, `windows-x64`), `installed` (`bool`, `true` only after resolution + verification), `source` (`"argument"|"env"|"app"|"cache"|"download"|"none"`).
- Optional/nullable: `path` (`string | null`), `sha256` (`^[a-f0-9]{64}$ | null`).
