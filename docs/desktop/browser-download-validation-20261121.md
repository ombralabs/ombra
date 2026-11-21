# Desktop1.2.3 browser downloader validation

Desktop1.2.3 adds an explicit native browser downloader to the local catalog. Its npm, Cargo and Tauri versions and lock-file records agree. The existing catalog, profile cryptography and browser launch behavior are unchanged.

## Native checks

The actual locked Linux Cargo suite passes107 unit tests,6 integration tests and doc tests. The14 browser tests cover signed release selection, malformed/explicit-null signed metadata fields, unsupported or inconsistent assets, archive size/hash integrity, cancellation, concurrency, safe extraction, receipts and preservation of the previous installation. A positive TAR fixture retains a macOS framework's Versions/Current symlink, its framework entry-point symlink and an internal hard link.

`cargo clippy --locked --all-targets --features app -- -D warnings` passes in the existing native Desktop builder on pipe_pc. This compiles the real Tauri commands, Arc state and capability wiring; it is not a packaged GUI launch claim. The temporary source transfer contained AppleDouble sidecars; only those sidecars in that task copy were removed before the final checks.

The real published Linux TAR also passes the actual production `commit_archive` and `inspect_install` functions using its pinned signed manifest. Archive417868484 bytes, SHA256 `b59f9f63e0e98c3f1db59310f01aa22bd20508f799f334a5a556c5c1f493caa5`; native `ombra`316992600 bytes, SHA256 `2f050ac0584e02b746090d563f615fad5fac163dfdd8a21b511873887283059b`. Provenance matches release158.0.8127.37-3, source071c87127a550236aa9bf1239e1e3d41e88b20be and linux-x64. Signed receipt, selection and both SDK checksum receipts pass. This supplemental qualification used the existing canonical archive without another download; its temporary extraction and hard links were removed, with21.07GiB free afterward. It did not launch the browser or change the committed source.

## UI and caller checks

Vue/TypeScript30 tests and Vite build pass. Tests first reproduce the absent downloader and a background-completion focus regression, then pass with the implementation. The final UI keeps focus in catalog search if installation finishes while the user is typing; cancellation restores focus only within the browser section.

Actual built UI was checked at960px in English and530px in Russian: no automatic release request at startup, download progress, cancellation, retry, installed location, no horizontal overflow and no page errors. These captures use synthetic Tauri IPC and are separate from the native installer checks. Independent UI review returned Ship; the design detector returned no findings and the incumbent visual system was retained.

The freshly published Node.js and Python SDK0.2.0 resolve the same native Ombra executable, version and SHA256 from a shared synthetic Desktop installation. Both reject a mismatched binary checksum. Node rejects a missing receipt; Python retains its existing external-app allowance for a missing receipt. Desktop writes both binary.sha256 and archive.sha256, so its valid installations satisfy both clients.

An independent backend review found no material code defect. The signature authenticates the release/archive metadata. Installed binary receipts detect local corruption and do not protect against a process authorized to rewrite both the executable and its receipt.

## Published Desktop packages

[Ombra Desktop 1.2.3](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.3) was published from source `c4db43e476ceb4b88129fedd5e85b5cd26d74b01`, the peeled target of annotated tag `desktop-v1.2.3`. All three platform builds use that frozen source and matching frontend assets. Subsequent documentation changes do not change the tag or installer bytes.

The release contains exactly four installers (macOS ARM64 DMG, Linux x64 DEB/RPM and Windows x64 NSIS), `release.json` and `SHA256SUMS`. GitHub reports the expected size and SHA256 for all six assets; downloaded metadata matches the local files byte for byte. The browser remains Latest at `v158.0.8127.37-3`, with its ten release assets unchanged.

- macOS: Developer ID signature, Apple acceptance of the app (`c50bd10d-779c-4714-a97c-23b98d0435a4`) and DMG (`d34ced7b-d424-4cbb-be6a-e88b61f06e88`), stapling and Gatekeeper checks pass. The app mounted from the final DMG matches the accepted app's five regular files. An isolated native catalog launch exits normally with code 0 and leaves those files unchanged.
- Linux: DEB/RPM metadata reports version 1.2.3 and the expected architecture. The installed DEB opens the native catalog and browser section under Xvfb; RPM payload verification matches the Linux binary. A failed explicit update check leaves engine files absent.
- Windows: real NSIS installation of 1.2.2, upgrade to 1.2.3 and removal of 1.2.3 return code 0. The six catalog files remain byte-identical across upgrade and uninstall. The actual 1.2.3 GUI displays the old profile and browser section, supports creating/editing a profile, retains both profiles after reopening, and exits normally with code 0 twice. Uninstall removes the owned executable, registration and two shortcuts while preserving the catalog. The installer includes Microsoft's offline WebView2 runtime, keeps CRC checks enabled and has no Authenticode signature.

Windows explicit update checking returns the expected network error under the inherited restricted VM network; this does not establish public GitHub reachability. The original 1.2.2 GUI observer returned a null exit code and its failed observation is retained; later 1.2.3 exits were captured with an actual process handle. The VM shut down normally, no owned application process survived, and both read-only parent disks retained their original metadata. Existing engine qualification was reused without a new engine or fingerprint benchmark claim.

## Limits and resource handling

Live anonymous release download cannot be accepted while the distribution repository is private. The downloader keeps public GitHub endpoints and never adds a token or CDN fallback. The owner opens the repository separately.

The local Mac Cargo dependency rebuild stopped at the20GiB free-space floor; only new files from that stopped run were removed. Native Cargo checks moved to the authorized pipe_pc builder rather than lowering the floor or cleaning unrelated caches. The original Mac swap baseline13685.19MiB and approved ceiling20853.19MiB were retained.

The later macOS release build completed with the same swap ceiling and disk floor. Windows native acceptance also retained the 20GiB disk floor and used a separate disposable child disk.

macOS Intel packages and a live anonymous end-to-end download remain outside this qualification. Browser startup/privacy suites were not rerun because this feature does not launch or modify the browser. Release publication did not change repository visibility or deploy a website.
