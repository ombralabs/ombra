# SDK contract v0.1

> **Status: draft.** The Ombra Local API is normative for wire behavior. This document is normative for SDK behavior. If the two disagree, the app wins and this document is corrected in the same pull request.

This contract defines what every official Ombra SDK exposes, how it maps to the Local API, and which guarantees hold across languages. It deliberately stops at the browser boundary: page automation belongs to Playwright, Puppeteer, Selenium, chromedp, Ferrum, and chromiumoxide.

## 1. Scope

In scope:

- Local API discovery, authentication, and error handling.
- Profile lifecycle: list, get, create, update, delete.
- Session lifecycle: launch, inspect, stop.
- Typed access to the `ombra.humanize` and `ombra.captcha` profile namespaces.
- A connection helper that returns the CDP endpoint in the shape the language's dominant client expects.
- Cross-language behavior that the conformance suite can verify.

Out of scope:

- Page automation, selectors, waits, and assertions.
- Fingerprint generation, patching, or validation. The engine owns it.
- Proxy rotation, CAPTCHA solving, and RPA scheduling.
- Downloading, installing, or updating the browser.
- Cloud APIs. Ombra is local-first.

## 2. Principles

1. **Thin over clever.** An SDK is a typed HTTP client plus a CDP connection helper. If a feature can live in the app or the engine, it does not live in eight SDKs.
2. **The wire is the contract.** SDKs do not invent behavior the Local API does not have. Missing wire capability is an issue, not a client-side workaround.
3. **Same profile, same result.** The browser must not be able to tell which SDK started it. No SDK-specific launch flags, injected scripts, or CDP calls.
4. **Explicit lifecycle.** Launch and stop are visible operations. No hidden retries, no background reconnection, no silent profile creation.
5. **Local by default.** Loopback endpoint, no telemetry, no phone-home, no credential logging.
6. **Boring errors.** One error hierarchy per language, stable kinds, and the raw wire message preserved for support.

## 3. Transport

| Item | Value |
|---|---|
| Default endpoint | `http://127.0.0.1:45678` |
| Override | `OMBRA_API_URL`, then an explicit constructor argument wins |
| Binding | Loopback only (`127.0.0.1`, `localhost`, `[::1]`) |
| Methods | `GET` and `POST` are equivalent; SDKs use `POST` with JSON for mutations and `GET` for reads |
| Content type | `application/json; charset=utf-8` |
| Auth | Disabled by default. When enabled in the app: `Authorization: Bearer <key>` from `OMBRA_API_KEY` or the constructor |
| Origin | Requests carrying a browser `Origin` header are rejected by the app. SDKs must not send one |
| Connect timeout | 5 seconds (recommended default) |
| Read timeout | 30 seconds for reads, 120 seconds for launch and stop |
| Keep-alive | Reuse one HTTP connection pool per client |

SDKs must URL-encode query values and must not append a trailing slash to the base URL.

## 4. Envelope and errors

Every response uses the same envelope:

```json
{ "code": 0, "msg": "success", "data": {} }
```

Failure:

```json
{ "code": -1, "msg": "Profile not found: abc123", "data": {} }
```

Rules:

- HTTP status is usually `200` even for failures. Inspect `code`, not the status line.
- `code: 0` means success; any other value is a failure.
- `404` means an unknown path and `405` an unsupported method; both are client bugs, not API errors.
- `data` may be `{}`, `null`, or absent on failure. SDKs must not assume a shape.

The wire exposes only `code` and `msg`. SDKs map failures to a stable local taxonomy while preserving `raw_code` and `raw_message`:

| SDK error kind | Typical cause |
|---|---|
| `connection_failed` | App not running, wrong port, loopback blocked |
| `timeout` | Launch exceeded the deadline, app is busy |
| `unauthorized` | API key missing or wrong |
| `not_found` | Unknown profile or proxy |
| `invalid_request` | Bad field, wrong type, unsupported value |
| `conflict` | Profile already running, delete of a running profile |
| `engine_unavailable` | Engine binary missing, license slot unavailable |
| `unsupported` | Contract or feature not supported by this app build |
| `server_error` | Unclassified app failure |
| `protocol_error` | Non-JSON response, truncated body, unexpected envelope |

Classification is heuristic because the wire has no machine-readable error codes. The SDK must keep the original message and expose a `request_id` when the app provides one.

## 5. Resource model

**Profile** — a persisted browser identity and its settings.

| SDK field | Wire field | Notes |
|---|---|---|
| `id` | `profile_id` | Short string; never assume numeric |
| `profile_no` | `profile_no` | Integer serial number, stable per installation |
| `name` | `name` | Required on create |
| `group_id` | `group_id` | String; `"0"` means ungrouped |
| `group_name` | `group_name` | Read-only |
| `remark` | `remark` | Free text |
| `proxy` | `user_proxy_config` | Normalized object; secrets are write-only |
| `fingerprint` | `fingerprint_config` | Typed facade, see §6 |
| `humanize` | `ombra.humanize` | See §7 |
| `captcha` | `ombra.captcha` | See §8 |
| `created_at` | `created_time` | Wire string; expose as native time when parseable |
| `last_opened_at` | `last_open_time` | Wire string; `"0"` means never |
| `ip` | `ip` | Last observed exit IP, or empty |
| `ip_country` | `ip_country` | Lowercase country code, or empty |

**Session** — a running profile.

| SDK field | Wire field | Notes |
|---|---|---|
| `profile_id` | `profile_id` | The profile this session belongs to |
| `cdp_url` | `ws.puppeteer` | CDP WebSocket URL |
| `selenium_address` | `ws.selenium` | `host:port` without a scheme |
| `debug_port` | `debug_port` | Wire value is a string; SDK exposes an integer |
| `webdriver` | `webdriver` | Empty string in v0; reserved for compatibility |

**Status** — the result of `GET /status`. The app returns `{ "code": 0, "data": {}, "msg": "success" }` as a liveness check. It does not expose app or engine versions in v0.

## 6. Operations

All profile operations target the v2 paths. SDKs do not use the v1 paths.

| SDK operation | Wire call | Idempotent | Notes |
|---|---|---|---|
| `status()` | `GET /status` | Yes | Liveness only |
| `profiles.list(query)` | `POST /api/v2/browser-profile/list` | Yes | See pagination below |
| `profiles.get(id)` | list with `profile_id: [id]` | Yes | Returns `not_found` when empty |
| `profiles.create(spec)` | `POST /api/v2/browser-profile/create` | No | Returns `{ profile_id, profile_no }` |
| `profiles.update(id, patch)` | `POST /api/v2/browser-profile/update` | Yes | Partial patch; returns no content |
| `profiles.delete(ids)` | `POST /api/v2/browser-profile/delete` | Yes | Moves profiles to trash; running profiles are rejected |
| `launch(id, options)` | `POST /api/v2/browser-profile/start` | No | Blocks until the CDP endpoint is ready |
| `active(id)` | `GET /api/v2/browser-profile/active` | Yes | `Active` or `Inactive` |
| `stop(id)` | `POST /api/v2/browser-profile/stop` | Yes | Stopping a stopped profile succeeds |

### Pagination

The server defaults to **one** profile per page. SDKs must set an explicit page size, defaulting to `100`, and must expose `page` and `limit`. The list response is:

```json
{ "code": 0, "msg": "success", "data": { "list": [], "page": 1, "limit": 100 } }
```

Supported v2 query fields: `profile_id` (array), `profile_no` (array), `group_id`, `sort_type` (`serial_number`, `last_open_time`, `created_time`), `sort_order` (`asc`, `desc`), `page`, `limit`.

### Create and update

Required on create: `name`. Everything else is optional and falls back to the app's defaults.

| SDK field | Wire field |
|---|---|
| `name` | `name` |
| `group_id` | `group_id` |
| `remark` | `remark` |
| `proxy` | `user_proxy_config` or `proxyid` |
| `fingerprint` | `fingerprint_config` |
| `humanize` | `ombra.humanize` |
| `captcha` | `ombra.captcha` |
| `extras` | merged into `fingerprint_config` |

Update sends only the fields present in the patch. `null` clears an optional field where the app supports clearing; otherwise the SDK rejects the patch locally with `invalid_request`.

### Launch and stop

Launch body:

```json
{
  "profile_id": "abc123",
  "headless": false,
  "launch_args": ["--window-size=1512,982"],
  "last_opened_tabs": true,
  "delete_cache": false
}
```

- `launch_args` is passed through unchanged. SDKs never add their own flags.
- `profile_no` is accepted as an alternative identifier. If both are present, `profile_id` wins.
- Starting a profile that is already starting waits for the same browser.
- Stop is idempotent and safe to call in `finally`.
- Deleting a running profile fails with `conflict`; stop it first.

## 7. Fingerprint facade

`fingerprint_config` is a string-heavy wire surface. SDKs expose a typed facade and perform only mechanical mapping. They never generate, infer, or randomize values.

| SDK field | Wire mapping | Value format |
|---|---|---|
| `seed` | `fingerprint_config.seed` | Unsigned integer |
| `os` | `fingerprint_config.os` | `macos`, `windows`, `linux` |
| `os_version` | `fingerprint_config.os_version` | String |
| `brand` | `fingerprint_config.brand` | `chrome` |
| `timezone` | `automatic_timezone: "0"` + `timezone` | IANA zone |
| `timezone: "auto"` | `automatic_timezone: "1"` | Omit `timezone` |
| `language` | `language_switch: "0"` + `language` | BCP-47 tag |
| `language: "auto"` | `language_switch: "1"` | Omit `language` |
| `screen` | `screen_resolution` | `"<width>_<height>"` |
| `screen: "auto"` | `screen_resolution: "random"` | — |
| `gpu` | `webgl: "2"` + `webgl_config` | `{ "unmasked_vendor", "unmasked_renderer" }` |
| `gpu: "auto"` | Omit `webgl`, `webgl_config` | Seed decides |
| `hardware_concurrency` | `hardware_concurrency` | Integer or numeric string |
| `device_memory` | `device_memory` | Integer or numeric string |
| `storage_quota_mb` | `storage_quota_mb` | Integer |
| `noise.*` | `canvas`, `webgl_image`, `audio`, `client_rects` | `"0"` / `"1"` or boolean |

`webrtc` is not a settable SDK field. Ombra always reports the gateway IP; the app stores a supplied value only for compatibility. Reads expose `webrtc: "proxy"` as informational.

Stored-only fields such as `fonts`, `media_devices`, `mac_address_config`, `device_name`, `speech_switch`, `tls`, `do_not_track`, `scan_port_type`, `flash`, `location`, `browser_kernel_config` are not typed in v0. They pass through `extras` unchanged and are returned on read.

## 8. Humanize

| Field | Type | Default | Notes |
|---|---|---|---|
| `enabled` | bool | `true` | Per-profile |
| `preset` | `default` \| `careful` \| `fast` | `default` | Engine persona preset |
| `block_input` | bool | `false` | Blocks manual input while automation runs |
| `paste_key` | string | `""` | Hotkey, e.g. `Ctrl+Alt+V`; `⌘` is rejected |
| `seed` | string | read-only | Persona seed, returned by the app |

SDKs must reject unknown keys with `invalid_request` before sending the request, so the error names the field. `ombra.humanize.seed` is always read-only.

## 9. CAPTCHA

| Field | Type | Notes |
|---|---|---|
| `enabled` | bool | Enables the engine module |
| `solve` | bool | Solve automatically when detection fires |
| `types` | string[] \| null | `null` means all supported types |
| `time_budget_ms` | u32 | Per-task budget |
| `max_attempts` | u32 | 1–10 |
| `allow_llm` | bool | Permit the LLM channel |
| `manual_mode` | bool | Solve while working by hand |
| `manual_resume_ms` | u32 | Pause before resuming after manual input |

The engine validates ranges and task types. SDKs validate only types and unknown keys. Support depends on the build and the task; the SDK must not promise a success rate.

Runtime state and solving events are exposed over the CDP domain `Ombra` (`getCaptchaState`, `setCaptchaPolicy`, `solveCaptcha`). A typed event stream is planned for contract `0.2`; v0 SDKs return the endpoint and document the CDP commands.

## 10. Sessions and CDP helpers

The SDK never opens the page. It returns a session and, optionally, a one-line connection helper:

| Language | Helper | Returns |
|---|---|---|
| Python | `session.connect_playwright()` | `playwright.sync_api.Browser` |
| Python | `session.connect_playwright_async()` | `playwright.async_api.Browser` |
| Node.js | `session.connectPlaywright()` | `playwright.Browser` |
| Node.js | `session.connectPuppeteer()` | `puppeteer.Browser` |
| .NET | `session.ConnectPlaywrightAsync()` | `Microsoft.Playwright.IBrowser` |
| Java | `session.connectPlaywright()` | `com.microsoft.playwright.Browser` |
| Go | `session.ConnectChromedp(ctx)` | `context.Context` bound to the browser |
| PHP | `session->cdpUrl()` | `string` |
| Ruby | `session.ferrum_options` | Hash for `Ferrum::Browser.new` |
| Rust | `session.chromiumoxide_config()` | `chromiumoxide::browser::Config` |

Helpers may set the WebSocket URL and transport options. They must not:

- enable `Runtime`, `Log`, or `Debugger` domains;
- inject scripts or evaluate JavaScript;
- override user agent, timezone, locale, viewport, or device metrics;
- dismiss dialogs or interact with the page;
- retry connection attempts indefinitely.

The helper returns a normal client object. The caller owns page lifecycle, and closing the browser object must not stop the Ombra profile unless the SDK documents an explicit `close({ stopProfile: true })` option.

## 11. Stealth invariants

These are MUST-level requirements for every SDK and every helper. A violation is a release blocker.

1. **No `Runtime.enable`.** Use `Runtime.evaluate` only when the caller explicitly asks for JavaScript, and prefer the engine's isolated world.
2. **No stealth scripts.** No `Page.addScriptToEvaluateOnNewDocument`, no `evaluateOnNewDocument`, no property shims, no prototype patches.
3. **No identity overrides.** No `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`, or `setTouchEmulationEnabled`.
4. **No automation flags.** No `--enable-automation`, no `--disable-blink-features=AutomationControlled`, no `--no-sandbox` unless the caller explicitly opts in for a container and the app allows it.
5. **No synthetic interaction.** Do not replace `Input.dispatchMouseEvent` / `dispatchKeyEvent` with DOM `.click()` or value assignment on security-sensitive steps.
6. **No seed mutation.** Never derive, randomize, or rewrite the profile seed or persona.
7. **No cross-profile state.** One session per profile, one user-data directory per profile, no copying cookies between profiles.
8. **No telemetry.** No analytics, crash reporting, or usage pings without explicit, documented opt-in.

The conformance suite checks the observable subset of these rules in [conformance/cases/stealth-invariants.json](../conformance/cases/stealth-invariants.json). The engine checkup covers the rest; see [stealth-checkup.md](stealth-checkup.md).

## 12. Versioning

- The contract has its own semantic version; this document is `0.1.0`.
- While the contract is `0.x`, additive changes bump the patch and breaking changes bump the minor. After `1.0`, normal semver applies.
- Every SDK declares the contract range it implements, for example `ombra-contract = ">=0.1,<0.2"`.
- An SDK must refuse to run against an app build whose contract is outside that range, with `unsupported` and both versions in the message.
- Deprecations are announced one minor ahead, documented in [CHANGELOG.md](../CHANGELOG.md), and removed no earlier than the next minor.

See [versioning.md](versioning.md) for the compatibility matrix.

## 13. Open questions

These block the `0.1.0` freeze and need an owner decision:

1. **App and engine version exposure.** `/status` returns empty data. Do we add an Ombra-specific endpoint, or keep the contract version in the SDK only?
2. **Wire error codes.** Should `code` stay `0/-1`, or can Ombra add stable negative codes without breaking existing clients?
3. **Session adoption.** Should `launch()` attach to an already-running profile and return its endpoint, or fail with `conflict`? The server currently waits for the in-flight start.
4. **`launch_args` policy.** Which flags are forbidden by the app, and should the SDK mirror that list?
5. **CAPTCHA events.** Is the CDP domain `Ombra` the long-term event channel, or will Local API add a stream?
6. **Group and proxy CRUD.** v0 accepts an inline proxy and `group_id`; full CRUD is deferred to `0.2`.
7. **Trash semantics.** `delete` moves to trash. Do SDKs need `restore` and `purge` in v0, or is trash an app-only feature?

Until these are resolved, SDKs must implement the documented behavior and leave the edge cases as typed `unsupported` errors rather than guessing.
