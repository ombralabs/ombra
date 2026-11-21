//! Extract into a private staging directory; materialize confined links last.
use super::{BrowserError, Cancel, invalid};
use std::{
    collections::HashSet,
    fs,
    io::{Read, Write},
    path::{Component, Path, PathBuf},
};

const MAX_FILE: u64 = 2 * 1024 * 1024 * 1024;
const MAX_UNPACKED: u64 = 8 * 1024 * 1024 * 1024;
const MAX_ENTRIES: usize = 100_000;

fn relative(path: &Path) -> Result<PathBuf, BrowserError> {
    let text = path
        .to_str()
        .ok_or_else(|| invalid("Non-UTF-8 archive path"))?;
    if text.len() > 4096 || text.contains(['\\', ':', '\0']) {
        return Err(invalid("Invalid archive path"));
    }
    let mut result = PathBuf::new();
    for part in path.components() {
        match part {
            Component::Normal(value) => result.push(value),
            Component::CurDir => (),
            _ => return Err(invalid("Archive path escapes staging")),
        }
    }
    Ok(result)
}

fn link_target(parent: &Path, target: &Path) -> Result<PathBuf, BrowserError> {
    let text = target
        .to_str()
        .ok_or_else(|| invalid("Invalid archive link"))?;
    if text.is_empty() || text.len() > 4096 || text.contains(['\\', ':', '\0']) {
        return Err(invalid("Invalid archive link"));
    }
    let mut resolved = parent.to_path_buf();
    for part in target.components() {
        match part {
            Component::Normal(value) => resolved.push(value),
            Component::CurDir => (),
            Component::ParentDir if resolved.pop() => (),
            _ => return Err(invalid("Archive link escapes staging")),
        }
    }
    Ok(resolved)
}

fn directory(path: &Path) -> Result<(), BrowserError> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.is_dir() && !metadata.file_type().is_symlink() => Ok(()),
        Ok(_) => Err(invalid("Archive entry overlaps a file or link")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(fs::create_dir(path)?),
        Err(error) => Err(error.into()),
    }
}

fn parents(root: &Path, path: &Path) -> Result<(), BrowserError> {
    let mut cursor = root.to_path_buf();
    if let Some(parent) = path.parent() {
        for part in parent.components() {
            cursor.push(part);
            directory(&cursor)?;
        }
    }
    Ok(())
}

fn copy_file(
    reader: &mut impl Read,
    path: &Path,
    size: u64,
    mode: u32,
    cancel: &Cancel,
) -> Result<(), BrowserError> {
    let mut output = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?;
    let mut buffer = [0; 128 * 1024];
    let mut written = 0u64;
    loop {
        cancel.check()?;
        let n = reader.read(&mut buffer).map_err(invalid)?;
        if n == 0 {
            break;
        }
        written = written
            .checked_add(n as u64)
            .ok_or_else(|| invalid("Archive entry is too large"))?;
        if written > size {
            return Err(invalid("Archive entry exceeds declared size"));
        }
        output.write_all(&buffer[..n])?;
    }
    if written != size {
        return Err(invalid("Truncated archive entry"));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        output.set_permissions(fs::Permissions::from_mode(mode & 0o777))?;
    }
    #[cfg(not(unix))]
    let _ = mode;
    Ok(())
}

fn budget(size: u64, total: &mut u64, entries: usize) -> Result<(), BrowserError> {
    *total = total
        .checked_add(size)
        .ok_or_else(|| invalid("Archive is too large"))?;
    if size > MAX_FILE || *total > MAX_UNPACKED || entries > MAX_ENTRIES {
        return Err(invalid("Archive exceeds extraction limits"));
    }
    Ok(())
}

pub(super) fn unpack(
    archive: &Path,
    destination: &Path,
    platform: &str,
    cancel: &Cancel,
) -> Result<(), BrowserError> {
    cancel.check()?;
    let file = fs::File::open(archive)?;
    let mut seen = HashSet::new();
    let mut total = 0;
    if platform == "windows-x64" {
        let mut zip = zip::ZipArchive::new(file).map_err(invalid)?;
        if zip.len() > MAX_ENTRIES {
            return Err(invalid("Too many archive entries"));
        }
        for i in 0..zip.len() {
            cancel.check()?;
            let mut entry = zip.by_index(i).map_err(invalid)?;
            let path = relative(Path::new(entry.name()))?;
            if path.as_os_str().is_empty() || !seen.insert(path.clone()) {
                return Err(invalid("Duplicate or empty archive path"));
            }
            let mode = entry.unix_mode().unwrap_or(0o644);
            if !matches!(mode & 0o170000, 0 | 0o100000 | 0o040000) {
                return Err(invalid("Unsupported ZIP link or special file"));
            }
            budget(entry.size(), &mut total, seen.len())?;
            parents(destination, &path)?;
            let output = destination.join(path);
            if entry.is_dir() {
                directory(&output)?;
            } else {
                let size = entry.size();
                copy_file(&mut entry, &output, size, mode, cancel)?;
            }
        }
        return Ok(());
    }
    let reader: Box<dyn Read> = match platform {
        "darwin-arm64" => Box::new(flate2::read::GzDecoder::new(file)),
        "linux-x64" => Box::new(xz2::read::XzDecoder::new(file)),
        _ => return Err(BrowserError::Unsupported),
    };
    let mut tar = tar::Archive::new(reader);
    let mut links = Vec::new();
    for entry in tar.entries().map_err(invalid)? {
        cancel.check()?;
        let mut entry = entry.map_err(invalid)?;
        let path = relative(&entry.path().map_err(invalid)?)?;
        let kind = entry.header().entry_type();
        if path.as_os_str().is_empty() && kind.is_dir() {
            continue;
        }
        if path.as_os_str().is_empty() || !seen.insert(path.clone()) {
            return Err(invalid("Duplicate or empty archive path"));
        }
        let size = entry.header().size().map_err(invalid)?;
        budget(size, &mut total, seen.len())?;
        parents(destination, &path)?;
        let output = destination.join(&path);
        if kind.is_dir() {
            directory(&output)?;
        } else if kind.is_file() {
            let mode = entry.header().mode().map_err(invalid)?;
            copy_file(&mut entry, &output, size, mode, cancel)?;
        } else if kind.is_symlink() || kind.is_hard_link() {
            let target = entry
                .link_name()
                .map_err(invalid)?
                .ok_or_else(|| invalid("Missing archive link target"))?
                .into_owned();
            if kind.is_symlink() {
                link_target(path.parent().unwrap_or(Path::new("")), &target)?;
            } else {
                relative(&target)?;
            }
            links.push((path, target, kind.is_symlink()));
        } else {
            return Err(invalid("Unsupported archive special file"));
        }
    }
    // Hard links only reference regular files; no links exist while file contents are written.
    for (path, target, _) in links.iter().filter(|entry| !entry.2) {
        cancel.check()?;
        let source = destination.join(relative(target)?);
        if !fs::symlink_metadata(&source)?.is_file() {
            return Err(invalid("Invalid archive hard link"));
        }
        parents(destination, path)?;
        fs::hard_link(source, destination.join(path))?;
    }
    for (path, target, _) in links.iter().filter(|entry| entry.2) {
        cancel.check()?;
        parents(destination, path)?;
        #[cfg(unix)]
        std::os::unix::fs::symlink(target, destination.join(path))?;
        #[cfg(not(unix))]
        {
            let _ = target;
            return Err(invalid("Unsupported archive symlink"));
        }
    }
    let root = destination.canonicalize()?;
    for (path, _, _) in links {
        if !destination
            .join(path)
            .canonicalize()
            .map_err(invalid)?
            .starts_with(&root)
        {
            return Err(invalid("Archive link resolves outside staging"));
        }
    }
    cancel.check()
}
