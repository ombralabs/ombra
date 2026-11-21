//! Tokenless, signed browser releases installed beside the local catalog.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tokio::io::AsyncWriteExt;

#[path = "browser_archive.rs"]
mod archive;
#[path = "browser_install.rs"]
mod install;
use install::{
    bounded_file, commit_archive, inspect_install, prepare_selection, read_selection, storage_lock,
};

#[derive(Default)]
struct Cancel {
    flag: AtomicBool,
    notify: tokio::sync::Notify,
}

impl Cancel {
    fn check(&self) -> Result<(), BrowserError> {
        if self.flag.load(Ordering::SeqCst) {
            Err(BrowserError::Cancelled)
        } else {
            Ok(())
        }
    }
    fn cancel(&self) {
        self.flag.store(true, Ordering::SeqCst);
        self.notify.notify_waiters();
    }
    async fn cancelled(&self) {
        loop {
            let notified = self.notify.notified();
            if self.flag.load(Ordering::SeqCst) {
                return;
            }
            notified.await;
        }
    }
}

const SIGNING_KEY: &str = "c3bmkOT6aDdpe3Kobp/KU5GzND8A77L6gv0XCdL2ZlY=";
const DOWNLOAD_URL: &str = "https://github.com/ombralabs/ombra/releases/download";
const RELEASES_URL: &str = "https://api.github.com/repos/ombralabs/ombra/releases";
const MAX_METADATA: u64 = 2 * 1024 * 1024;
const MAX_ARCHIVE: u64 = 2 * 1024 * 1024 * 1024;

#[derive(Debug, Deserialize, Serialize, Clone)]
struct GithubRelease {
    tag_name: String,
    draft: bool,
    prerelease: bool,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct GithubAsset {
    name: String,
    size: u64,
    browser_download_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserRelease {
    pub version: String,
    pub size: u64,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InstalledBrowser {
    pub version: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserProgress {
    pub phase: &'static str,
    pub version: Option<String>,
    pub downloaded: u64,
    pub total: Option<u64>,
}

pub struct BrowserManager {
    root: PathBuf,
    installing: Mutex<Option<Arc<Cancel>>>,
}

struct InstallGuard<'a> {
    manager: &'a BrowserManager,
    cancel: Arc<Cancel>,
}

impl Drop for InstallGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut slot) = self.manager.installing.lock() {
            *slot = None;
        }
    }
}

impl BrowserManager {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            installing: Mutex::new(None),
        }
    }
    pub fn status(&self) -> Result<Option<InstalledBrowser>, BrowserError> {
        if !self.root.is_absolute() {
            return Err(invalid("Browser directory must be absolute"));
        }
        let platform = current_platform()?;
        let selection = read_selection(&self.root)?;
        let Some(version) = selection.get("active").and_then(|v| v.as_str()) else {
            return Ok(None);
        };
        Ok(inspect_install(&self.root, version, platform, SIGNING_KEY).ok())
    }
    fn begin(&self) -> Result<InstallGuard<'_>, BrowserError> {
        if !self.root.is_absolute() {
            return Err(invalid("Browser directory must be absolute"));
        }
        let mut slot = self
            .installing
            .lock()
            .map_err(|e| BrowserError::Storage(e.to_string()))?;
        if slot.is_some() {
            return Err(BrowserError::Busy);
        }
        let cancel = Arc::new(Cancel::default());
        *slot = Some(cancel.clone());
        Ok(InstallGuard {
            manager: self,
            cancel,
        })
    }
    pub fn cancel(&self) -> Result<(), BrowserError> {
        if let Some(cancel) = &*self
            .installing
            .lock()
            .map_err(|e| BrowserError::Storage(e.to_string()))?
        {
            cancel.cancel();
        }
        Ok(())
    }
    pub async fn check_update(&self) -> Result<BrowserRelease, BrowserError> {
        if !self.root.is_absolute() {
            return Err(invalid("Browser directory must be absolute"));
        }
        let platform = current_platform()?;
        Ok(resolve_release(&client()?, platform, &Cancel::default())
            .await?
            .summary)
    }
    pub async fn install(
        self: &Arc<Self>,
        progress: impl Fn(BrowserProgress) + Send + Sync + 'static,
    ) -> Result<InstalledBrowser, BrowserError> {
        let platform = current_platform()?;
        let operation = self.begin()?;
        let root = self.root.clone();
        let _lock = tokio::task::spawn_blocking(move || storage_lock(&root))
            .await
            .map_err(invalid)??;
        emit(&progress, "checking", None, 0);
        let client = client()?;
        let release = resolve_release(&client, platform, &operation.cancel).await?;
        operation.cancel.check()?;
        let summary = release.summary.clone();
        let root = self.root.clone();
        if root
            .join("versions")
            .join(&summary.version)
            .symlink_metadata()
            .is_ok()
        {
            let cancel = operation.cancel.clone();
            let installed = tokio::task::spawn_blocking(move || {
                let installed =
                    inspect_install(&root, &release.summary.version, platform, SIGNING_KEY)?;
                let receipt: Receipt = serde_json::from_slice(&bounded_file(
                    &root
                        .join("versions")
                        .join(&installed.version)
                        .join("receipt.json"),
                    MAX_METADATA * 2,
                )?)
                .map_err(invalid)?;
                let saved = verify_release(
                    receipt.envelope.as_bytes(),
                    &receipt.github,
                    platform,
                    SIGNING_KEY,
                )?;
                if saved.sha256 != release.sha256 {
                    return Err(invalid("Installed version has a different archive digest"));
                }
                cancel.check()?;
                prepare_selection(&root, &installed.version)?
                    .persist(root.join("selection.json"))
                    .map_err(|e| BrowserError::from(e.error))?;
                Ok::<_, BrowserError>(installed)
            })
            .await
            .map_err(invalid)??;
            emit(&progress, "complete", Some(&summary), summary.size);
            return Ok(installed);
        }
        let staging = tempfile::Builder::new()
            .prefix(".browser-stage-")
            .tempdir_in(&self.root)?;
        download(
            &client,
            &release.url,
            &release,
            &staging.path().join("archive"),
            &operation.cancel,
            &progress,
        )
        .await?;
        emit(&progress, "extracting", Some(&summary), summary.size);
        let cancel = operation.cancel.clone();
        let installed =
            tokio::task::spawn_blocking(move || commit_archive(&root, staging, &release, &cancel))
                .await
                .map_err(invalid)??;
        emit(&progress, "complete", Some(&summary), summary.size);
        Ok(installed)
    }
}

#[derive(Serialize, Deserialize)]
struct Receipt {
    envelope: String,
    github: GithubRelease,
    binary_sha256: String,
}

fn current_platform() -> Result<&'static str, BrowserError> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => Ok("darwin-arm64"),
        ("linux", "x86_64") => Ok("linux-x64"),
        ("windows", "x86_64") => Ok("windows-x64"),
        _ => Err(BrowserError::Unsupported),
    }
}

fn allowed_url(url: &reqwest::Url) -> bool {
    url.scheme() == "https"
        && url.port_or_known_default() == Some(443)
        && url.username().is_empty()
        && url.password().is_none()
        && url.fragment().is_none()
        && matches!(
            url.host_str(),
            Some(
                "api.github.com"
                    | "github.com"
                    | "release-assets.githubusercontent.com"
                    | "objects.githubusercontent.com"
            )
        )
}

fn client() -> Result<reqwest::Client, BrowserError> {
    reqwest::Client::builder()
        .no_proxy()
        .https_only(true)
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .user_agent(concat!("Ombra-Desktop/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|_| BrowserError::Unavailable)
}

async fn response(
    client: &reqwest::Client,
    url: &str,
    timeout: Duration,
    cancel: &Cancel,
) -> Result<reqwest::Response, BrowserError> {
    let mut url = reqwest::Url::parse(url).map_err(invalid)?;
    for _ in 0..=5 {
        cancel.check()?;
        let permitted = allowed_url(&url);
        #[cfg(test)]
        let permitted = permitted
            || (url.scheme() == "http"
                && url.host_str() == Some("127.0.0.1")
                && url.username().is_empty()
                && url.password().is_none());
        if !permitted {
            return Err(invalid("Download URL or redirect is not permitted"));
        }
        let response = tokio::select! {
            biased;
            () = cancel.cancelled() => return Err(BrowserError::Cancelled),
            result = client.get(url.clone()).timeout(timeout).send() => result.map_err(|_| BrowserError::Unavailable)?,
        };
        if matches!(response.status().as_u16(), 301 | 302 | 303 | 307 | 308) {
            let location = response
                .headers()
                .get(reqwest::header::LOCATION)
                .and_then(|v| v.to_str().ok())
                .ok_or_else(|| invalid("Redirect has no valid Location"))?;
            url = url.join(location).map_err(invalid)?;
            continue;
        }
        if response.status() != reqwest::StatusCode::OK {
            return Err(BrowserError::Unavailable);
        }
        return Ok(response);
    }
    Err(invalid("Too many download redirects"))
}

async fn chunk(
    response: &mut reqwest::Response,
    cancel: &Cancel,
) -> Result<Option<impl AsRef<[u8]>>, BrowserError> {
    tokio::select! {
        biased;
        () = cancel.cancelled() => Err(BrowserError::Cancelled),
        result = response.chunk() => result.map_err(|_| BrowserError::Unavailable),
    }
}

async fn metadata(
    client: &reqwest::Client,
    url: &str,
    cancel: &Cancel,
) -> Result<Vec<u8>, BrowserError> {
    let mut response = response(client, url, Duration::from_secs(30), cancel).await?;
    if response
        .content_length()
        .is_some_and(|size| size > MAX_METADATA)
    {
        return Err(invalid("Release metadata exceeds size limit"));
    }
    let mut bytes = Vec::new();
    while let Some(part) = chunk(&mut response, cancel).await? {
        let part = part.as_ref();
        if bytes.len() as u64 + part.len() as u64 > MAX_METADATA {
            return Err(invalid("Release metadata exceeds size limit"));
        }
        bytes.extend_from_slice(part);
    }
    Ok(bytes)
}

async fn resolve_release(
    client: &reqwest::Client,
    platform: &str,
    cancel: &Cancel,
) -> Result<VerifiedRelease, BrowserError> {
    let latest = metadata(client, &format!("{RELEASES_URL}/latest"), cancel).await;
    let mut release = match latest {
        Ok(bytes) => serde_json::from_slice::<GithubRelease>(&bytes)
            .ok()
            .filter(|r| release_version(r).is_ok()),
        Err(BrowserError::Unavailable) => None,
        Err(error) => return Err(error),
    };
    // shortcut: scan at most 400 releases; use an engine index if SDK history outgrows this bound.
    for page in 1..=20 {
        if release.is_some() {
            break;
        }
        let bytes = metadata(
            client,
            &format!("{RELEASES_URL}?per_page=20&page={page}"),
            cancel,
        )
        .await?;
        let releases: Vec<GithubRelease> = serde_json::from_slice(&bytes).map_err(invalid)?;
        let last_page = releases.len() < 20;
        release = releases.into_iter().find(|r| release_version(r).is_ok());
        if last_page {
            break;
        }
    }
    let release = release.ok_or(BrowserError::Unavailable)?;
    let version = release_version(&release)?;
    let url = github_asset(&release, version, "release.json", None)?;
    let raw = metadata(client, &url, cancel).await?;
    verify_release(&raw, &release, platform, SIGNING_KEY)
}

fn emit(
    progress: &impl Fn(BrowserProgress),
    phase: &'static str,
    release: Option<&BrowserRelease>,
    downloaded: u64,
) {
    progress(BrowserProgress {
        phase,
        version: release.map(|r| r.version.clone()),
        downloaded,
        total: release.map(|r| r.size),
    });
}

async fn download(
    client: &reqwest::Client,
    url: &str,
    release: &VerifiedRelease,
    path: &Path,
    cancel: &Cancel,
    progress: &impl Fn(BrowserProgress),
) -> Result<(), BrowserError> {
    emit(progress, "downloading", Some(&release.summary), 0);
    let mut response = response(client, url, Duration::from_secs(30 * 60), cancel).await?;
    if response
        .content_length()
        .is_some_and(|size| size != release.summary.size)
    {
        return Err(invalid("Download size differs from signed size"));
    }
    let mut file = tokio::fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .await?;
    let mut hash = Sha256::new();
    let mut downloaded = 0u64;
    let mut last = Instant::now();
    while let Some(part) = chunk(&mut response, cancel).await? {
        let part = part.as_ref();
        downloaded += part.len() as u64;
        if downloaded > release.summary.size {
            return Err(invalid("Download exceeds signed size"));
        }
        hash.update(part);
        file.write_all(part).await?;
        if last.elapsed() >= Duration::from_millis(200) {
            emit(progress, "downloading", Some(&release.summary), downloaded);
            last = Instant::now();
        }
    }
    emit(progress, "verifying", Some(&release.summary), downloaded);
    if downloaded != release.summary.size || format!("{:x}", hash.finalize()) != release.sha256 {
        return Err(invalid("Download size or SHA-256 does not match signature"));
    }
    file.flush().await?;
    file.sync_all().await?;
    cancel.check()
}

#[derive(Debug)]
struct VerifiedRelease {
    summary: BrowserRelease,
    sha256: String,
    url: String,
    envelope: String,
    github: GithubRelease,
    chromium: String,
    commit: Option<String>,
}

#[derive(Deserialize)]
struct Envelope {
    signed: String,
    sig: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseManifest {
    version: String,
    min_manager: String,
    chromium: String,
    commit: Option<String>,
    platforms: BTreeMap<String, PlatformAsset>,
}

#[derive(Deserialize)]
struct PlatformAsset {
    file: String,
    sha256: String,
    size: u64,
}

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "kind", content = "detail", rename_all = "camelCase")]
pub enum BrowserError {
    #[error("Another browser installation is running")]
    Busy,
    #[error("The public browser release is unavailable")]
    Unavailable,
    #[error("The browser release failed validation: {0}")]
    Invalid(String),
    #[error("This platform has no supported browser release")]
    Unsupported,
    #[error("Update Ombra Desktop before installing this browser")]
    Incompatible,
    #[error("Browser installation was cancelled")]
    Cancelled,
    #[error("Browser storage: {0}")]
    Storage(String),
}

impl From<std::io::Error> for BrowserError {
    fn from(error: std::io::Error) -> Self {
        Self::Storage(error.to_string())
    }
}

fn invalid(detail: impl ToString) -> BrowserError {
    BrowserError::Invalid(detail.to_string())
}

fn numbers<const N: usize>(raw: &str) -> Option<[u32; N]> {
    let parts: Vec<_> = raw.split('.').collect();
    if parts.len() != N {
        return None;
    }
    let mut result = [0; N];
    for (i, part) in parts.into_iter().enumerate() {
        if part.is_empty()
            || !part.bytes().all(|b| b.is_ascii_digit())
            || (part.len() > 1 && part.starts_with('0'))
        {
            return None;
        }
        result[i] = part.parse().ok()?;
    }
    Some(result)
}

fn browser_version(raw: &str) -> Option<([u32; 4], u32)> {
    let (base, suffix) = raw
        .split_once('-')
        .map_or((raw, None), |(a, b)| (a, Some(b)));
    let release = match suffix {
        None => 0,
        Some(value)
            if !value.is_empty()
                && !value.starts_with('0')
                && value.bytes().all(|b| b.is_ascii_digit()) =>
        {
            value.parse().ok()?
        }
        _ => return None,
    };
    Some((numbers(base)?, release))
}

fn extension(platform: &str) -> Result<&'static str, BrowserError> {
    match platform {
        "darwin-arm64" => Ok(".tar.gz"),
        "linux-x64" => Ok(".tar.xz"),
        "windows-x64" => Ok(".zip"),
        _ => Err(BrowserError::Unsupported),
    }
}

fn release_version(release: &GithubRelease) -> Result<&str, BrowserError> {
    let version = release
        .tag_name
        .strip_prefix('v')
        .ok_or_else(|| invalid("Invalid browser tag"))?;
    if release.draft || release.prerelease || browser_version(version).is_none() {
        return Err(invalid("Invalid stable browser release"));
    }
    Ok(version)
}

fn github_asset(
    release: &GithubRelease,
    version: &str,
    filename: &str,
    size: Option<u64>,
) -> Result<String, BrowserError> {
    let mut matches = release.assets.iter().filter(|asset| asset.name == filename);
    let asset = matches
        .next()
        .ok_or_else(|| invalid("Missing release asset"))?;
    let url = format!("{DOWNLOAD_URL}/v{version}/{filename}");
    if matches.next().is_some()
        || asset.browser_download_url != url
        || asset.size == 0
        || size.is_some_and(|n| asset.size != n)
    {
        return Err(invalid("Invalid release asset identity or size"));
    }
    Ok(url)
}

fn verify_release(
    raw: &[u8],
    release: &GithubRelease,
    platform: &str,
    key: &str,
) -> Result<VerifiedRelease, BrowserError> {
    let ext = extension(platform)?;
    if raw.len() as u64 > MAX_METADATA {
        return Err(invalid("Manifest exceeds size limit"));
    }
    let version = release_version(release)?;
    github_asset(release, version, "release.json", Some(raw.len() as u64))?;
    let envelope: Envelope = serde_json::from_slice(raw).map_err(invalid)?;
    let public_key = STANDARD.decode(key).map_err(invalid)?;
    let signature = STANDARD.decode(&envelope.sig).map_err(invalid)?;
    if public_key.len() != 32 || signature.len() != 64 {
        return Err(invalid("Invalid Ed25519 key or signature"));
    }
    ring::signature::UnparsedPublicKey::new(&ring::signature::ED25519, public_key)
        .verify(envelope.signed.as_bytes(), &signature)
        .map_err(|_| invalid("Signature verification failed"))?;
    let payload: serde_json::Value = serde_json::from_str(&envelope.signed).map_err(invalid)?;
    // Existing signed releases predate these optional fields; explicit values must match.
    if payload.get("schema").is_some_and(|s| s != 1)
        || payload.get("type").is_some_and(|k| k != "release")
    {
        return Err(invalid("Invalid signed manifest schema or type"));
    }
    let manifest: ReleaseManifest = serde_json::from_value(payload).map_err(invalid)?;
    if manifest.version != version
        || manifest.chromium != version.split('-').next().unwrap()
        || manifest
            .commit
            .as_deref()
            .is_some_and(|s| s.len() != 40 || !s.bytes().all(|b| b.is_ascii_hexdigit()))
    {
        return Err(invalid("Signed release identity does not match GitHub"));
    }
    let minimum = numbers::<3>(&manifest.min_manager)
        .ok_or_else(|| invalid("Invalid minimum manager version"))?;
    if minimum > numbers::<3>(env!("CARGO_PKG_VERSION")).unwrap() {
        return Err(BrowserError::Incompatible);
    }
    let asset = manifest
        .platforms
        .get(platform)
        .ok_or(BrowserError::Unsupported)?;
    let filename = format!("ombra-engine-{version}-{platform}{ext}");
    if asset.file != filename
        || asset.size == 0
        || asset.size > MAX_ARCHIVE
        || asset.sha256.len() != 64
        || !asset.sha256.bytes().all(|b| b.is_ascii_hexdigit())
    {
        return Err(invalid("Invalid signed archive filename, size or SHA-256"));
    }
    let url = github_asset(release, version, &filename, Some(asset.size))?;
    Ok(VerifiedRelease {
        summary: BrowserRelease {
            version: version.into(),
            size: asset.size,
            platform: platform.into(),
        },
        sha256: asset.sha256.to_ascii_lowercase(),
        url,
        envelope: String::from_utf8(raw.to_vec()).map_err(invalid)?,
        github: release.clone(),
        chromium: manifest.chromium,
        commit: manifest.commit,
    })
}

#[cfg(test)]
#[path = "browser_tests.rs"]
mod tests;
