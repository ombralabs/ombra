use std::path::{Path, PathBuf};

/// Раскладка папки данных Ombra (спецификация этапа 1, раздел «Структура»).
#[derive(Debug, Clone)]
pub struct Paths {
    root: PathBuf,
}

impl Paths {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn security_config(&self) -> PathBuf { self.root.join("security.json") }
    pub fn vault_image(&self) -> PathBuf { self.root.join("Profiles.sparsebundle") }
    /// Platform-specific application data directory.
    pub fn default_root() -> PathBuf {
        #[cfg(target_os = "macos")]
        { PathBuf::from(std::env::var_os("HOME").expect("HOME не задан")).join("Library/Application Support/Ombra") }
        #[cfg(windows)]
        { PathBuf::from(std::env::var_os("LOCALAPPDATA").expect("LOCALAPPDATA не задан")).join("Ombra") }
        #[cfg(target_os = "linux")]
        {
            std::env::var_os("XDG_DATA_HOME").map(PathBuf::from).filter(|p| p.is_absolute())
                .unwrap_or_else(|| PathBuf::from(std::env::var_os("HOME").expect("HOME не задан")).join(".local/share"))
                .join("Ombra")
        }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn db(&self) -> PathBuf {
        self.root().join("ombra.db")
    }

    pub fn profiles(&self) -> PathBuf {
        self.root().join("profiles")
    }

    pub fn profile_dir(&self, id: &str) -> PathBuf {
        self.profiles().join(id)
    }

    /// Библиотека расширений: `<id>/<version>/` — распакованное расширение.
    pub fn extensions(&self) -> PathBuf {
        self.root().join("extensions")
    }

    pub fn extension_dir(&self, id: &str, version: &str) -> PathBuf {
        self.extensions().join(id).join(version)
    }

    pub fn local_key_file(&self) -> PathBuf { self.root().join("secrets.key") }
    pub fn device_key_file(&self) -> PathBuf { self.root.join("vault-device.key") }

    pub fn dev_key_file(&self) -> PathBuf {
        self.root().join("dev-secrets.key")
    }
    pub fn vault_key_file(&self) -> PathBuf { self.root().join("vault-secrets.key") }
}
