use super::*;
use ring::signature::{Ed25519KeyPair, KeyPair};
use serde_json::{Value, json};

const PRODUCTION_MANIFEST: &str = r###"{"signed": "{\"chromium\":\"158.0.8127.37\",\"commit\":\"071c87127a550236aa9bf1239e1e3d41e88b20be\",\"files\":[{\"format\":\"dmg\",\"name\":\"ombra-engine-158.0.8127.37-3-darwin-arm64.dmg\",\"platform\":\"darwin-arm64\",\"sha256\":\"762f805719593306bcb2295a07aabf8dcdacf707d270e06c16e3a02c813a81dd\",\"size\":487930908},{\"format\":\"deb\",\"name\":\"ombra-engine_158.0.8127.37-3_amd64.deb\",\"platform\":\"linux-x64\",\"sha256\":\"7ec9d3de802d0ec1019d62989d53a67cae112f4adab475db81158b02065b41ea\",\"size\":479656304},{\"format\":\"rpm\",\"name\":\"ombra-engine-158.0.8127.37-3.x86_64.rpm\",\"platform\":\"linux-x64\",\"sha256\":\"b1a079c33d2298641533262976c5d4b539ef0ff632d622e73b9aa14e810c7513\",\"size\":485685435},{\"format\":\"AppImage\",\"name\":\"ombra-engine-158.0.8127.37-3-x86_64.AppImage\",\"platform\":\"linux-x64\",\"sha256\":\"1cea186daf32d6cd6dd7ea7019db27d3e6cfb5032956e90e1ef04adbf6ab821b\",\"size\":461941240},{\"format\":\"exe\",\"name\":\"ombra-engine-158.0.8127.37-3-windows-x64-setup.exe\",\"platform\":\"windows-x64\",\"sha256\":\"dd64f750aa6fabf929ca343fad6c73a04b1cf8f86fb2b8724fafcf9db26d4a75\",\"size\":488100200}],\"minManager\":\"1.2.2\",\"notes\":\"Ombra Engine 158.0.8127.37-3\\n\\nFull native Ombra branding on macOS ARM64, Linux x64 and Windows x64, including executables, helpers, framework, profile paths, shell registration, icons and translated browser text.\\n\\nAll 53 original patches are preserved; the complete build includes 56 patches, all seven pinned models, 11 sealed payloads and Cursory ABI 1 with 2,356 records.\\n\\nOmbra uses its own key-store identity with standard OSCrypt encryption. macOS may request permission to use Ombra Safe Storage when encrypted browser data is first accessed. Existing Chromium profiles and keys are not imported. Linux key initialization handles a busy creation lock asynchronously.\\n\\nRelease discovery and downloads use GitHub Releases without a GitHub token. Minimum compatible manager: 1.2.2. Packages are provided for macOS ARM64, Linux x64 and Windows x64.\\n\\nWindows packages do not carry an Authenticode signature. The inherited Widevine limitation remains; this release does not claim protected-content playback support.\",\"platforms\":{\"darwin-arm64\":{\"built\":\"2026-11-21T15:02:46Z\",\"file\":\"ombra-engine-158.0.8127.37-3-darwin-arm64.tar.gz\",\"sha256\":\"ea34d3b6eda55cce8008b2df54ffb1a7bc179a864028065951a657e223efda14\",\"size\":482578859},\"linux-x64\":{\"built\":\"2026-11-21T14:54:41Z\",\"file\":\"ombra-engine-158.0.8127.37-3-linux-x64.tar.xz\",\"sha256\":\"b59f9f63e0e98c3f1db59310f01aa22bd20508f799f334a5a556c5c1f493caa5\",\"size\":417868484},\"windows-x64\":{\"built\":\"2026-11-21T14:54:41Z\",\"file\":\"ombra-engine-158.0.8127.37-3-windows-x64.zip\",\"sha256\":\"8ed703e6a6ba82ad6937c4bd36f49f41ffd95b7fbd4e3537b0cdbca60a447d79\",\"size\":487978416}},\"version\":\"158.0.8127.37-3\"}", "sig": "0Z2pyG0W4eoIKy415zw4x432wks+jcGbCgXFp7Mk2bnE7C+51/WNGf0CyG7t2mUjg3IWvdnIEOuKzjfkUcZ5BQ=="}"###;

fn github(raw: &[u8]) -> GithubRelease {
    let outer: Value = serde_json::from_slice(raw).unwrap();
    let inner: Value = serde_json::from_str(outer["signed"].as_str().unwrap()).unwrap();
    let version = inner["version"].as_str().unwrap();
    let mut assets = vec![GithubAsset {
        name: "release.json".into(),
        size: raw.len() as u64,
        browser_download_url: format!(
            "https://github.com/ombralabs/ombra/releases/download/v{version}/release.json"
        ),
    }];
    for entry in inner["platforms"].as_object().unwrap().values() {
        let name = entry["file"].as_str().unwrap();
        assets.push(GithubAsset {
            name: name.into(),
            size: entry["size"].as_u64().unwrap(),
            browser_download_url: format!(
                "https://github.com/ombralabs/ombra/releases/download/v{version}/{name}"
            ),
        });
    }
    GithubRelease {
        tag_name: format!("v{version}"),
        draft: false,
        prerelease: false,
        assets,
    }
}

fn signed(payload: Value) -> (Vec<u8>, String) {
    // A fixture key cannot authenticate any production download.
    let key = Ed25519KeyPair::from_seed_unchecked(&[7; 32]).unwrap();
    let text = payload.to_string();
    let sig = STANDARD.encode(key.sign(text.as_bytes()).as_ref());
    (
        json!({"signed": text, "sig": sig}).to_string().into_bytes(),
        STANDARD.encode(key.public_key().as_ref()),
    )
}

fn payload() -> Value {
    json!({"schema":1,"type":"release","version":"158.0.8127.37-3","minManager":"1.2.2",
        "chromium":"158.0.8127.37","commit":"071c87127a550236aa9bf1239e1e3d41e88b20be",
        "platforms":{"darwin-arm64":{"file":"ombra-engine-158.0.8127.37-3-darwin-arm64.tar.gz",
            "size":4,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}})
}

#[test]
fn accepts_the_published_manifest_with_the_pinned_public_key() {
    let raw = PRODUCTION_MANIFEST.as_bytes();
    let release = github(raw);
    let actual = verify_release(raw, &release, "darwin-arm64", SIGNING_KEY).unwrap();
    assert_eq!(actual.summary.version, "158.0.8127.37-3");
    assert_eq!(actual.summary.size, 482_578_859);
    for platform in ["linux-x64", "windows-x64"] {
        assert!(verify_release(raw, &release, platform, SIGNING_KEY).is_ok());
    }
}

#[test]
fn rejects_wrong_key_tampering_and_github_asset_substitution() {
    let raw = PRODUCTION_MANIFEST.as_bytes();
    let release = github(raw);
    assert!(verify_release(raw, &release, "darwin-arm64", &STANDARD.encode([0; 32])).is_err());
    let tampered = PRODUCTION_MANIFEST.replace("1.2.2", "0.0.1");
    assert!(verify_release(tampered.as_bytes(), &release, "darwin-arm64", SIGNING_KEY).is_err());
    for mutation in 0..5 {
        let mut release = release.clone();
        match mutation {
            0 => release.tag_name = "v158.0.8127.37-2".into(),
            1 => release.assets[1].size += 1,
            2 => release.assets[1].browser_download_url = "https://example.org/replacement".into(),
            3 => release.assets.push(release.assets[1].clone()),
            _ => release.prerelease = true,
        }
        assert!(
            verify_release(raw, &release, "darwin-arm64", SIGNING_KEY).is_err(),
            "mutation {mutation}"
        );
    }
}

#[test]
fn enforces_signed_identity_compatibility_and_archive_bounds() {
    let (raw, key) = signed(payload());
    assert!(verify_release(&raw, &github(&raw), "darwin-arm64", &key).is_ok());
    assert!(matches!(
        verify_release(&raw, &github(&raw), "darwin-x64", &key),
        Err(BrowserError::Unsupported)
    ));
    for (pointer, value) in [
        ("/type", json!("channel")),
        ("/type", json!(null)),
        ("/schema", json!(2)),
        ("/schema", json!(null)),
        ("/version", json!("158.0.8127.37-0+dev.abcdef")),
        ("/platforms/darwin-arm64/file", json!("../../bad.tar.gz")),
        ("/platforms/darwin-arm64/size", json!(0)),
        ("/platforms/darwin-arm64/size", json!(9_000_000_000u64)),
        ("/platforms/darwin-arm64/sha256", json!("aa")),
    ] {
        let mut inner = payload();
        *inner.pointer_mut(pointer).unwrap() = value;
        let (bad, key) = signed(inner);
        assert!(
            verify_release(&bad, &github(&bad), "darwin-arm64", &key).is_err(),
            "{pointer}"
        );
    }
    let mut inner = payload();
    inner["minManager"] = json!("99.0.0");
    let (bad, key) = signed(inner);
    assert!(matches!(
        verify_release(&bad, &github(&bad), "darwin-arm64", &key),
        Err(BrowserError::Incompatible)
    ));
}

fn tar_fixture(
    dir: &std::path::Path,
    path: &str,
    kind: tar::EntryType,
    target: Option<&str>,
    size: Option<u64>,
) -> std::path::PathBuf {
    use std::io::Write;
    let archive = dir.join("fixture.tar.gz");
    let mut gz = flate2::write::GzEncoder::new(
        std::fs::File::create(&archive).unwrap(),
        flate2::Compression::fast(),
    );
    let mut header = tar::Header::new_gnu();
    header.set_entry_type(kind);
    header.set_mode(0o755);
    header.set_size(size.unwrap_or(if target.is_some() { 0 } else { 5 }));
    let bytes = header.as_mut_bytes();
    bytes[..path.len()].copy_from_slice(path.as_bytes());
    if let Some(target) = target {
        header.set_link_name(target).unwrap();
    }
    header.set_cksum();
    gz.write_all(header.as_bytes()).unwrap();
    if target.is_none() {
        gz.write_all(b"hello").unwrap();
    }
    gz.write_all(&[0; 2048]).unwrap();
    gz.finish().unwrap();
    archive
}

#[test]
fn extracts_regular_files_and_preserves_executable_permissions() {
    let dir = tempfile::tempdir().unwrap();
    let path = tar_fixture(
        dir.path(),
        "Ombra.app/Contents/MacOS/Ombra",
        tar::EntryType::Regular,
        None,
        None,
    );
    let output = tempfile::tempdir().unwrap();
    archive::unpack(&path, output.path(), "darwin-arm64", &Cancel::default()).unwrap();
    let binary = output.path().join("Ombra.app/Contents/MacOS/Ombra");
    assert_eq!(std::fs::read(&binary).unwrap(), b"hello");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_ne!(
            std::fs::metadata(binary).unwrap().permissions().mode() & 0o111,
            0
        );
    }
}

#[test]
fn tar_rejects_traversal_links_and_unbounded_entries() {
    for (path, kind, target, size) in [
        ("../escaped", tar::EntryType::Regular, None, None),
        ("/escaped", tar::EntryType::Regular, None, None),
        ("C:\\escaped", tar::EntryType::Regular, None, None),
        (
            "safe/link",
            tar::EntryType::Symlink,
            Some("../../escaped"),
            None,
        ),
        ("safe/link", tar::EntryType::Link, Some("../escaped"), None),
        ("large", tar::EntryType::Regular, None, Some(9_000_000_000)),
    ] {
        let dir = tempfile::tempdir().unwrap();
        let archive = tar_fixture(dir.path(), path, kind, target, size);
        let output = dir.path().join("staging");
        std::fs::create_dir(&output).unwrap();
        assert!(
            archive::unpack(&archive, &output, "darwin-arm64", &Cancel::default()).is_err(),
            "{path}"
        );
        assert!(!dir.path().join("escaped").exists());
    }
}

#[test]
fn zip_rejects_traversal_and_symlinks() {
    use std::io::Write;
    for entry in ["ombra.exe", "../escaped", "link"] {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("fixture.zip");
        let mut writer = zip::ZipWriter::new(std::fs::File::create(&path).unwrap());
        let options = zip::write::SimpleFileOptions::default();
        if entry == "link" {
            writer.add_symlink(entry, "../../escaped", options).unwrap();
        } else {
            writer.start_file(entry, options).unwrap();
            writer.write_all(b"hello").unwrap();
        }
        writer.finish().unwrap();
        let output = dir.path().join("staging");
        std::fs::create_dir(&output).unwrap();
        let result = archive::unpack(&path, &output, "windows-x64", &Cancel::default());
        if entry == "ombra.exe" {
            result.unwrap();
            assert_eq!(std::fs::read(output.join(entry)).unwrap(), b"hello");
        } else {
            assert!(result.is_err());
            assert!(!dir.path().join("escaped").exists());
        }
    }
}

#[test]
fn cancelled_extraction_does_not_write_files() {
    let cancel = Cancel::default();
    cancel.flag.store(true, Ordering::SeqCst);
    assert!(matches!(cancel.check(), Err(BrowserError::Cancelled)));
    let dir = tempfile::tempdir().unwrap();
    let archive = tar_fixture(dir.path(), "ombra", tar::EntryType::Regular, None, None);
    let output = tempfile::tempdir().unwrap();
    assert!(matches!(
        archive::unpack(&archive, output.path(), "darwin-arm64", &cancel),
        Err(BrowserError::Cancelled)
    ));
    assert_eq!(std::fs::read_dir(output.path()).unwrap().count(), 0);
}

fn local_http(
    body: Vec<u8>,
    declared: usize,
    status: &str,
) -> (String, std::thread::JoinHandle<()>) {
    use std::io::{Read, Write};
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}/fixture", listener.local_addr().unwrap());
    let status = status.to_owned();
    let thread = std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(2)))
            .unwrap();
        let mut request = [0; 4096];
        let _ = stream.read(&mut request);
        let response =
            format!("HTTP/1.1 {status}\r\nContent-Length: {declared}\r\nConnection: close\r\n\r\n");
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.write_all(&body);
    });
    (url, thread)
}

fn fixture_release(bytes: &[u8], platform: &str) -> (VerifiedRelease, String) {
    use sha2::{Digest, Sha256};
    let ext = match platform {
        "linux-x64" => ".tar.xz",
        "windows-x64" => ".zip",
        _ => ".tar.gz",
    };
    let mut inner = payload();
    inner["platforms"] = json!({platform:{"file":format!("ombra-engine-158.0.8127.37-3-{platform}{ext}"),"size":bytes.len(),"sha256":format!("{:x}",Sha256::digest(bytes))}});
    let (raw, key) = signed(inner);
    (
        verify_release(&raw, &github(&raw), platform, &key).unwrap(),
        key,
    )
}

#[tokio::test]
async fn downloads_only_exact_signed_size_and_sha256() {
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .unwrap();
    for (body, declared, valid) in [
        (b"hello".to_vec(), 5, true),
        (b"hello!".to_vec(), 6, false),
        (b"hell".to_vec(), 5, false),
        (b"jello".to_vec(), 5, false),
    ] {
        let (url, server) = local_http(body, declared, "200 OK");
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("archive");
        let (release, _) = fixture_release(b"hello", "darwin-arm64");
        let result = download(&client, &url, &release, &path, &Cancel::default(), &|_| {}).await;
        assert_eq!(result.is_ok(), valid);
        server.join().unwrap();
        if valid {
            assert_eq!(std::fs::read(path).unwrap(), b"hello");
        }
    }
}

#[test]
fn confines_downloads_to_https_github_hosts_without_credentials() {
    for (url, valid) in [
        (
            "https://api.github.com/repos/ombralabs/ombra/releases",
            true,
        ),
        (
            "https://github.com/ombralabs/ombra/releases/download/v1/a",
            true,
        ),
        (
            "https://release-assets.githubusercontent.com/github-production-release-asset/a?sig=x",
            true,
        ),
        ("http://github.com/a", false),
        ("https://github.com.evil.example/a", false),
        ("https://user:password@github.com/a", false),
        ("https://github.com:8443/a", false),
        ("file:///etc/passwd", false),
        ("https://127.0.0.1/a", false),
        ("https://example.org/a", false),
    ] {
        assert_eq!(
            allowed_url(&reqwest::Url::parse(url).unwrap()),
            valid,
            "{url}"
        );
    }
}

#[tokio::test]
async fn cancellation_interrupts_a_response_that_has_not_started() {
    use std::io::Read;
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}/fixture", listener.local_addr().unwrap());
    let server = std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut request = [0; 4096];
        let _ = stream.read(&mut request);
        std::thread::sleep(std::time::Duration::from_millis(100));
    });
    let cancel = Arc::new(Cancel::default());
    let trigger = cancel.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(15)).await;
        trigger.cancel();
    });
    let (release, _) = fixture_release(b"hello", "darwin-arm64");
    let output = tempfile::tempdir().unwrap();
    assert!(matches!(
        download(
            &reqwest::Client::new(),
            &url,
            &release,
            &output.path().join("archive"),
            &cancel,
            &|_| {}
        )
        .await,
        Err(BrowserError::Cancelled)
    ));
    server.join().unwrap();
}

fn native_fixture(root: &std::path::Path, platform: &str) -> std::path::PathBuf {
    let relative = match platform {
        "darwin-arm64" => "Ombra.app/Contents/MacOS/Ombra",
        "linux-x64" => "ombra",
        _ => "ombra.exe",
    };
    let binary = root.join(relative);
    std::fs::create_dir_all(binary.parent().unwrap()).unwrap();
    let mut bytes = vec![0u8; 128];
    match platform {
        "darwin-arm64" => {
            bytes[..8].copy_from_slice(&[0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0, 0, 1]);
        }
        "linux-x64" => {
            bytes[..6].copy_from_slice(b"\x7fELF\x02\x01");
            bytes[18] = 62;
        }
        _ => {
            bytes[..2].copy_from_slice(b"MZ");
            bytes[60] = 64;
            bytes[64..70].copy_from_slice(b"PE\0\0\x64\x86");
        }
    }
    std::fs::write(&binary, bytes).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&binary, std::fs::Permissions::from_mode(0o755)).unwrap();
    }
    let metadata = if platform == "darwin-arm64" {
        root.join("Ombra.app/Contents/Resources/ombra-build.json")
    } else {
        root.join("ombra-build.json")
    };
    std::fs::create_dir_all(metadata.parent().unwrap()).unwrap();
    std::fs::write(metadata,json!({"version":"158.0.8127.37-3","chromium":"158.0.8127.37","platform":platform,"commit":"071c87127a550236aa9bf1239e1e3d41e88b20be"}).to_string()).unwrap();
    binary
}

#[test]
fn status_requires_a_valid_signed_receipt_and_matching_native_binary() {
    use sha2::{Digest, Sha256};
    let root = tempfile::tempdir().unwrap();
    let engines = root.path().join("engines");
    let manager = BrowserManager::new(engines.clone());
    assert!(manager.status().unwrap().is_none());
    assert!(!engines.exists());
    let platform = current_platform().unwrap();
    let version = engines.join("versions/158.0.8127.37-3");
    let binary = native_fixture(&version, platform);
    std::fs::write(
        engines.join("selection.json"),
        r#"{"active":"158.0.8127.37-3"}"#,
    )
    .unwrap();
    assert!(manager.status().unwrap().is_none());
    let receipt = Receipt {
        envelope: PRODUCTION_MANIFEST.into(),
        github: github(PRODUCTION_MANIFEST.as_bytes()),
        binary_sha256: format!("{:x}", Sha256::digest(std::fs::read(&binary).unwrap())),
    };
    std::fs::write(
        version.join("receipt.json"),
        serde_json::to_vec(&receipt).unwrap(),
    )
    .unwrap();
    std::fs::write(version.join("binary.sha256"), &receipt.binary_sha256).unwrap();
    let release = verify_release(
        PRODUCTION_MANIFEST.as_bytes(),
        &receipt.github,
        platform,
        SIGNING_KEY,
    )
    .unwrap();
    std::fs::write(version.join("archive.sha256"), &release.sha256).unwrap();
    let installed = manager.status().unwrap().unwrap();
    assert_eq!(installed.version, "158.0.8127.37-3");
    assert_eq!(installed.path, binary.to_string_lossy());
    std::fs::remove_file(version.join("binary.sha256")).unwrap();
    assert!(manager.status().unwrap().is_none());
    std::fs::write(version.join("binary.sha256"), &receipt.binary_sha256).unwrap();
    std::fs::write(&binary, b"replaced").unwrap();
    assert!(manager.status().unwrap().is_none());
}

#[test]
fn duplicate_installs_are_busy_and_cancellation_resets_for_the_next_attempt() {
    let root = tempfile::tempdir().unwrap();
    let manager = BrowserManager::new(root.path().to_path_buf());
    let first = manager.begin().unwrap();
    assert!(matches!(manager.begin(), Err(BrowserError::Busy)));
    manager.cancel().unwrap();
    assert!(matches!(first.cancel.check(), Err(BrowserError::Cancelled)));
    drop(first);
    let second = manager.begin().unwrap();
    assert!(second.cancel.check().is_ok());
}

fn staged_archive(root: &std::path::Path) -> (tempfile::TempDir, VerifiedRelease) {
    let source = tempfile::tempdir().unwrap();
    native_fixture(source.path(), "darwin-arm64");
    let staging = tempfile::Builder::new()
        .prefix(".browser-stage-")
        .tempdir_in(root)
        .unwrap();
    let gz = flate2::write::GzEncoder::new(
        std::fs::File::create(staging.path().join("archive")).unwrap(),
        flate2::Compression::fast(),
    );
    let mut tar = tar::Builder::new(gz);
    tar.append_dir_all("Ombra.app", source.path().join("Ombra.app"))
        .unwrap();
    tar.into_inner().unwrap().finish().unwrap();
    let bytes = std::fs::read(staging.path().join("archive")).unwrap();
    let (release, _) = fixture_release(&bytes, "darwin-arm64");
    (staging, release)
}

#[test]
fn atomic_install_preserves_older_versions_and_selection_on_cancel_or_error() {
    let root = tempfile::tempdir().unwrap();
    let engines = root.path();
    let old = engines.join("versions/157.0.1.1");
    std::fs::create_dir_all(&old).unwrap();
    std::fs::write(old.join("keep"), b"old").unwrap();
    let selection = r#"{"active":"157.0.1.1","automatic":false,"custom":"preserved"}"#;
    std::fs::write(engines.join("selection.json"), selection).unwrap();
    for cancelled in [true, false] {
        let (staging, release) = staged_archive(engines);
        let staging_path = staging.path().to_owned();
        let cancel = Cancel::default();
        if cancelled {
            cancel.cancel();
        } else {
            std::fs::write(staging.path().join("archive"), b"corrupt").unwrap();
        }
        assert!(commit_archive(engines, staging, &release, &cancel).is_err());
        assert!(!staging_path.exists());
        assert_eq!(
            std::fs::read_to_string(engines.join("selection.json")).unwrap(),
            selection
        );
        assert_eq!(std::fs::read(old.join("keep")).unwrap(), b"old");
    }
    let (staging, release) = staged_archive(engines);
    let installed = commit_archive(engines, staging, &release, &Cancel::default()).unwrap();
    assert!(std::path::Path::new(&installed.path).is_file());
    assert_eq!(std::fs::read(old.join("keep")).unwrap(), b"old");
    use sha2::{Digest, Sha256};
    let directory = engines.join("versions/158.0.8127.37-3");
    assert_eq!(
        std::fs::read_to_string(directory.join("binary.sha256"))
            .unwrap()
            .trim(),
        format!(
            "{:x}",
            Sha256::digest(std::fs::read(&installed.path).unwrap())
        )
    );
    assert_eq!(
        std::fs::read_to_string(directory.join("archive.sha256"))
            .unwrap()
            .trim(),
        release.sha256
    );
    let selection: Value =
        serde_json::from_slice(&std::fs::read(engines.join("selection.json")).unwrap()).unwrap();
    assert_eq!(selection["active"], "158.0.8127.37-3");
    assert_eq!(selection["automatic"], false);
    assert_eq!(selection["custom"], "preserved");
    let (staging, release) = staged_archive(engines);
    assert!(commit_archive(engines, staging, &release, &Cancel::default()).is_err());
    assert!(std::path::Path::new(&installed.path).is_file());
}

#[cfg(unix)]
#[test]
fn extracts_framework_symlinks_and_hard_links_within_the_installation() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("framework.tar.gz");
    let gzip = flate2::write::GzEncoder::new(
        std::fs::File::create(&path).unwrap(),
        flate2::Compression::fast(),
    );
    let mut tar = tar::Builder::new(gzip);
    let mut file = tar::Header::new_gnu();
    file.set_size(5);
    file.set_mode(0o755);
    file.set_cksum();
    tar.append_data(&mut file, "Framework/Versions/A/file", &b"hello"[..])
        .unwrap();
    for (name, target, kind) in [
        ("Framework/Versions/Current", "A", tar::EntryType::Symlink),
        (
            "Framework/file",
            "Versions/Current/file",
            tar::EntryType::Symlink,
        ),
        (
            "Framework/hard",
            "Framework/Versions/A/file",
            tar::EntryType::Link,
        ),
    ] {
        let mut link = tar::Header::new_gnu();
        link.set_entry_type(kind);
        link.set_size(0);
        link.set_mode(0o777);
        tar.append_link(&mut link, name, target).unwrap();
    }
    tar.into_inner().unwrap().finish().unwrap();
    let output = tempfile::tempdir().unwrap();
    archive::unpack(&path, output.path(), "darwin-arm64", &Cancel::default()).unwrap();
    assert!(
        std::fs::symlink_metadata(output.path().join("Framework/Versions/Current"))
            .unwrap()
            .file_type()
            .is_symlink()
    );
    for name in [
        "Framework/file",
        "Framework/Versions/Current/file",
        "Framework/hard",
    ] {
        assert_eq!(std::fs::read(output.path().join(name)).unwrap(), b"hello");
    }
}
