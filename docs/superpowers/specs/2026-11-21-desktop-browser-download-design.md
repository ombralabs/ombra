# Desktop browser download

The user requests SDK publication with new tags and a native Desktop browser downloader, followed by a Desktop version bump. SDK publication is tracked independently. Desktop moves from1.2.2 to1.2.3 after the downloader is verified.

## Approach

Extend the existing local catalog UI with a compact browser section. Use Rust for public GitHub Release discovery, signature verification, streaming download and atomic installation. Keep the existing Vue controls, colors and EN/RU messages. Reusing the Node SDK would add a runtime dependency to a native app; opening a web download link would not provide managed verification or installation. The native path is the implementation choice under the user's request.

## Behavior

- Startup reads installed status locally; no automatic network access or download.
- Check for updates and Download/Update are explicit actions, with progress, cancellation and retry.
- Stable browser releases come from public GitHub endpoints in ombralabs/ombra without authentication; SDK/Desktop release tags are ignored. There is no CDN fallback.
- Verify the pinned Ed25519 signed release envelope, tag/version, platform, minimum Desktop version, unique canonical asset URL, exact size and SHA256 before extraction.
- Stage under the app's engines directory, reject archive escapes and atomically install immutable version directories. Errors/cancellation leave catalog data and existing browsers intact.
- Supported native artifacts are macOS ARM64, Linux x64 and Windows x64. Unsupported platforms report a clear error.
- Catalog operations remain available while the independent browser task runs. No browser launch/profile migration or new encryption scheme is added.

## Interfaces

Tauri commands: get_browser_status returns null or {version,path}; check_browser_update returns {version,size,platform}; install_browser accepts onProgress Channel and returns {version,path}; cancel_browser_install cancels the active task. Progress is {phase,version,downloaded,total}; phases checking/downloading/verifying/extracting/complete. Structured error kinds: busy, unavailable, invalid, unsupported, incompatible, cancelled, storage.

## Verification and constraints

Test signed metadata and download/extraction trust boundaries with small fixtures, plus UI check/download/progress/cancel/retry and preserved catalog behavior. Run Rust and Vue checks, compile the native app wiring, and inspect rendered EN/RU desktop/narrow states. Existing fixed swap ceiling20853.19MiB and20GiB disk floor apply; reuse Cargo caches. Production anonymous access awaits the owner making the release repository public. Do not change visibility or disable signature checks to make that pass.
