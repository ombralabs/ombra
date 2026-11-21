use super::{
    BrowserError, Cancel, InstalledBrowser, MAX_METADATA, Receipt, VerifiedRelease,
    browser_version, invalid, verify_release,
};
use crate::lock::{DirLock, LockError};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
};

fn directory(path: &Path, create: bool) -> Result<(), BrowserError> {
    match fs::symlink_metadata(path) {
        Ok(meta) if meta.is_dir() && !meta.file_type().is_symlink() => Ok(()),
        Ok(_) => Err(invalid("Browser storage directory is a file or link")),
        Err(e) if create && e.kind() == std::io::ErrorKind::NotFound => Ok(fs::create_dir(path)?),
        Err(e) => Err(e.into()),
    }
}

pub(super) fn storage_lock(root: &Path) -> Result<DirLock, BrowserError> {
    if !root.is_absolute() {
        return Err(invalid("Browser directory must be absolute"));
    }
    if let Some(parent) = root.parent() {
        fs::create_dir_all(parent)?;
    }
    directory(root, true)?;
    let lock = root.join(crate::lock::LOCK_FILE);
    match fs::symlink_metadata(&lock) {
        Ok(meta) if !meta.is_file() || meta.file_type().is_symlink() => {
            return Err(invalid("Browser lock is not a regular file"));
        }
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e.into()),
        _ => (),
    }
    let lock = DirLock::acquire(root).map_err(|e| match e {
        LockError::Busy => BrowserError::Busy,
        LockError::Io(e) => e.into(),
    })?;
    directory(&root.join("versions"), true)?;
    Ok(lock)
}

pub(super) fn bounded_file(path: &Path, limit: u64) -> Result<Vec<u8>, BrowserError> {
    let meta = fs::symlink_metadata(path)?;
    if !meta.is_file() || meta.file_type().is_symlink() || meta.len() > limit {
        return Err(invalid("Invalid browser metadata file"));
    }
    let mut bytes = Vec::new();
    fs::File::open(path)?
        .take(limit + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() as u64 > limit {
        return Err(invalid("Browser metadata exceeds size limit"));
    }
    Ok(bytes)
}

pub(super) fn read_selection(root: &Path) -> Result<serde_json::Value, BrowserError> {
    match fs::symlink_metadata(root) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(serde_json::json!({})),
        _ => directory(root, false)?,
    }
    let path = root.join("selection.json");
    if let Err(e) = fs::symlink_metadata(&path) {
        if e.kind() == std::io::ErrorKind::NotFound {
            return Ok(serde_json::json!({}));
        }
        return Err(e.into());
    }
    let value: serde_json::Value =
        serde_json::from_slice(&bounded_file(&path, MAX_METADATA)?).map_err(invalid)?;
    if !value.is_object() {
        return Err(invalid("Invalid browser selection"));
    }
    Ok(value)
}

pub(super) fn prepare_selection(
    root: &Path,
    version: &str,
) -> Result<tempfile::NamedTempFile, BrowserError> {
    let mut selection = read_selection(root)?;
    selection["active"] = serde_json::Value::String(version.into());
    let mut file = tempfile::NamedTempFile::new_in(root)?;
    serde_json::to_writer(&mut file, &selection).map_err(invalid)?;
    file.flush()?;
    file.as_file().sync_all()?;
    Ok(file)
}

fn binary_relative(platform: &str) -> Result<&'static str, BrowserError> {
    match platform {
        "darwin-arm64" => Ok("Ombra.app/Contents/MacOS/Ombra"),
        "linux-x64" => Ok("ombra"),
        "windows-x64" => Ok("ombra.exe"),
        _ => Err(BrowserError::Unsupported),
    }
}

fn native_binary(root: &Path, release: &VerifiedRelease) -> Result<PathBuf, BrowserError> {
    let platform = release.summary.platform.as_str();
    let binary = root.join(binary_relative(platform)?);
    let meta = fs::symlink_metadata(&binary)?;
    if !meta.is_file()
        || meta.file_type().is_symlink()
        || meta.len() < 64
        || meta.len() > 2 * 1024 * 1024 * 1024
        || !binary.canonicalize()?.starts_with(root.canonicalize()?)
    {
        return Err(invalid("Invalid native browser executable"));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if platform != "windows-x64" && meta.permissions().mode() & 0o111 == 0 {
            return Err(invalid("Browser file is not executable"));
        }
    }
    let mut file = fs::File::open(&binary)?;
    let mut header = [0; 64];
    file.read_exact(&mut header)?;
    let valid = match platform {
        "darwin-arm64" => header[..8] == [0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0, 0, 1],
        "linux-x64" => header[..6] == *b"\x7fELF\x02\x01" && header[18..20] == [62, 0],
        "windows-x64" if header[..2] == *b"MZ" => {
            let offset = u32::from_le_bytes(header[60..64].try_into().unwrap()) as u64;
            if !(64..=1024 * 1024).contains(&offset) || offset + 6 > meta.len() {
                false
            } else {
                file.seek(SeekFrom::Start(offset))?;
                let mut pe = [0; 6];
                file.read_exact(&mut pe)?;
                pe == *b"PE\0\0\x64\x86"
            }
        }
        _ => false,
    };
    if !valid {
        return Err(invalid(
            "Browser executable has the wrong native format or architecture",
        ));
    }
    let metadata = root.join(if platform == "darwin-arm64" {
        "Ombra.app/Contents/Resources/ombra-build.json"
    } else {
        "ombra-build.json"
    });
    if !metadata.canonicalize()?.starts_with(root.canonicalize()?) {
        return Err(invalid("Browser provenance escapes installation"));
    }
    let value: serde_json::Value =
        serde_json::from_slice(&bounded_file(&metadata, MAX_METADATA)?).map_err(invalid)?;
    if value.get("version").and_then(|v| v.as_str()) != Some(release.summary.version.as_str())
        || value.get("chromium").and_then(|v| v.as_str()) != Some(release.chromium.as_str())
        || value.get("platform").and_then(|v| v.as_str()) != Some(platform)
        || release
            .commit
            .as_deref()
            .is_some_and(|commit| value.get("commit").and_then(|v| v.as_str()) != Some(commit))
    {
        return Err(invalid("Browser provenance does not match signed release"));
    }
    Ok(binary)
}

fn binary_hash(path: &Path, cancel: &Cancel) -> Result<String, BrowserError> {
    let mut file = fs::File::open(path)?;
    let mut hash = Sha256::new();
    let mut buffer = [0; 128 * 1024];
    loop {
        cancel.check()?;
        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        hash.update(&buffer[..n]);
    }
    Ok(format!("{:x}", hash.finalize()))
}

pub(super) fn inspect_install(
    root: &Path,
    version: &str,
    platform: &str,
    key: &str,
) -> Result<InstalledBrowser, BrowserError> {
    if browser_version(version).is_none() {
        return Err(invalid("Invalid installed browser version"));
    }
    directory(root, false)?;
    directory(&root.join("versions"), false)?;
    let directory_path = root.join("versions").join(version);
    directory(&directory_path, false)?;
    let receipt: Receipt = serde_json::from_slice(&bounded_file(
        &directory_path.join("receipt.json"),
        MAX_METADATA * 2,
    )?)
    .map_err(invalid)?;
    let release = verify_release(receipt.envelope.as_bytes(), &receipt.github, platform, key)?;
    if release.summary.version != version {
        return Err(invalid("Receipt version does not match installation"));
    }
    for (name, expected) in [
        ("binary.sha256", receipt.binary_sha256.as_str()),
        ("archive.sha256", release.sha256.as_str()),
    ] {
        let bytes = bounded_file(&directory_path.join(name), 128)?;
        if std::str::from_utf8(&bytes).map_err(invalid)?.trim() != expected {
            return Err(invalid(
                "SDK checksum receipt differs from signed installation",
            ));
        }
    }
    let binary = native_binary(&directory_path, &release)?;
    if binary_hash(&binary, &Cancel::default())? != receipt.binary_sha256 {
        return Err(invalid("Installed browser checksum differs from receipt"));
    }
    Ok(InstalledBrowser {
        version: version.into(),
        path: binary.to_string_lossy().into_owned(),
    })
}

pub(super) fn commit_archive(
    root: &Path,
    staging: tempfile::TempDir,
    release: &VerifiedRelease,
    cancel: &Cancel,
) -> Result<InstalledBrowser, BrowserError> {
    cancel.check()?;
    directory(root, false)?;
    directory(&root.join("versions"), false)?;
    let destination = root.join("versions").join(&release.summary.version);
    match fs::symlink_metadata(&destination) {
        Ok(_) => return Err(invalid("Browser version folders are immutable")),
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e.into()),
        _ => (),
    }
    let ready = staging.path().join("ready");
    fs::create_dir(&ready)?;
    super::archive::unpack(
        &staging.path().join("archive"),
        &ready,
        &release.summary.platform,
        cancel,
    )?;
    let binary = native_binary(&ready, release)?;
    let receipt = Receipt {
        envelope: release.envelope.clone(),
        github: release.github.clone(),
        binary_sha256: binary_hash(&binary, cancel)?,
    };
    for (name, digest) in [
        ("binary.sha256", receipt.binary_sha256.as_str()),
        ("archive.sha256", release.sha256.as_str()),
    ] {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(ready.join(name))?;
        writeln!(file, "{digest}")?;
        file.sync_all()?;
    }
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(ready.join("receipt.json"))?;
    serde_json::to_writer(&mut file, &receipt).map_err(invalid)?;
    file.flush()?;
    file.sync_all()?;
    drop(file);
    let selection = prepare_selection(root, &release.summary.version)?;
    cancel.check()?;
    fs::rename(&ready, &destination)?;
    // A failed selection write preserves the previous selection and every existing version.
    selection
        .persist(root.join("selection.json"))
        .map_err(|e| BrowserError::from(e.error))?;
    Ok(InstalledBrowser {
        version: release.summary.version.clone(),
        path: destination
            .join(binary_relative(&release.summary.platform)?)
            .to_string_lossy()
            .into_owned(),
    })
}
