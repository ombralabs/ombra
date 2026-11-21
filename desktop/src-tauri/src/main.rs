#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ombra_desktop_store::{
    browser::{BrowserError, BrowserManager, BrowserProgress, BrowserRelease, InstalledBrowser},
    lock::LockError,
    paths::Paths,
    store::{
        Store, StoreError,
        profiles::{ListQuery, ProfileInput, ProfileRecord},
    },
};
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager};

struct Catalog {
    path: PathBuf,
    store: Mutex<Option<Store>>,
}

#[derive(Serialize)]
#[serde(tag = "kind", content = "detail", rename_all = "camelCase")]
enum CatalogError {
    Busy,
    Protected,
    Key,
    InvalidPath,
    InvalidName,
    MissingProfile,
    Version(i64),
    Storage(String),
}

impl From<StoreError> for CatalogError {
    fn from(error: StoreError) -> Self {
        match error {
            StoreError::Lock(LockError::Busy) => Self::Busy,
            StoreError::Protected => Self::Protected,
            StoreError::Crypto | StoreError::Keychain(_) => Self::Key,
            StoreError::Invalid("name") => Self::InvalidName,
            StoreError::NotFound(_) => Self::MissingProfile,
            StoreError::Schema(version) => Self::Version(version),
            StoreError::Db(error) => Self::Storage(error.to_string()),
            StoreError::Io(error) | StoreError::Lock(LockError::Io(error)) => {
                Self::Storage(error.to_string())
            }
            error => Self::Storage(error.to_string()),
        }
    }
}

#[derive(Serialize)]
struct ProfileSummary {
    id: String,
    serial: i64,
    name: String,
    note: String,
}

impl From<ProfileRecord> for ProfileSummary {
    fn from(profile: ProfileRecord) -> Self {
        Self {
            id: profile.id,
            serial: profile.serial,
            name: profile.name,
            note: profile.note,
        }
    }
}

#[derive(Serialize)]
struct ProfileLists {
    active: Vec<ProfileSummary>,
    trash: Vec<ProfileSummary>,
}

async fn with_store<T: Send + 'static>(
    app: AppHandle,
    operation: impl FnOnce(&Store) -> Result<T, StoreError> + Send + 'static,
) -> Result<T, CatalogError> {
    tauri::async_runtime::spawn_blocking(move || {
        let catalog = app.state::<Catalog>();
        if !catalog.path.is_absolute() {
            return Err(CatalogError::InvalidPath);
        }
        let mut slot = catalog
            .store
            .lock()
            .map_err(|error| CatalogError::Storage(error.to_string()))?;
        let store = match &mut *slot {
            Some(store) => store,
            None => slot.insert(Store::open_local(&catalog.path)?),
        };
        Ok(operation(store)?)
    })
    .await
    .map_err(|error| CatalogError::Storage(error.to_string()))?
}

#[tauri::command]
async fn list_profiles(app: AppHandle) -> Result<ProfileLists, CatalogError> {
    with_store(app, |store| {
        Ok(ProfileLists {
            active: store
                .list_profiles(&ListQuery::default())?
                .into_iter()
                .map(ProfileSummary::from)
                .collect(),
            trash: store
                .list_trash()?
                .into_iter()
                .map(ProfileSummary::from)
                .collect(),
        })
    })
    .await
}

#[tauri::command]
async fn create_profile(app: AppHandle, name: String, note: String) -> Result<(), CatalogError> {
    with_store(app, |store| {
        let mut input = ProfileInput::new(name, "{}");
        input.note = note;
        store.create_profile(&input, now())?;
        Ok(())
    })
    .await
}

#[tauri::command]
async fn edit_profile(
    app: AppHandle,
    id: String,
    name: String,
    note: String,
) -> Result<(), CatalogError> {
    with_store(app, move |store| {
        store.edit_profile_details(&id, &name, &note)
    })
    .await
}

#[tauri::command]
async fn set_profile_deleted(
    app: AppHandle,
    id: String,
    deleted: bool,
) -> Result<(), CatalogError> {
    let deleted_at = deleted.then(now);
    with_store(app, move |store| store.set_deleted(&[id], deleted_at)).await
}

fn now() -> i64 {
    UNIX_EPOCH.elapsed().unwrap_or_default().as_secs() as i64
}

#[tauri::command]
async fn get_browser_status(
    browser: tauri::State<'_, Arc<BrowserManager>>,
) -> Result<Option<InstalledBrowser>, BrowserError> {
    let browser = browser.inner().clone();
    tauri::async_runtime::spawn_blocking(move || browser.status())
        .await
        .map_err(|error| BrowserError::Storage(error.to_string()))?
}

#[tauri::command]
async fn check_browser_update(
    browser: tauri::State<'_, Arc<BrowserManager>>,
) -> Result<BrowserRelease, BrowserError> {
    let browser = browser.inner().clone();
    browser.check_update().await
}

#[tauri::command]
async fn install_browser(
    browser: tauri::State<'_, Arc<BrowserManager>>,
    on_progress: tauri::ipc::Channel<BrowserProgress>,
) -> Result<InstalledBrowser, BrowserError> {
    let browser = browser.inner().clone();
    let events = browser.clone();
    browser
        .install(move |progress| {
            if on_progress.send(progress).is_err() {
                let _ = events.cancel();
            }
        })
        .await
}

#[tauri::command]
fn cancel_browser_install(
    browser: tauri::State<'_, Arc<BrowserManager>>,
) -> Result<(), BrowserError> {
    browser.cancel()
}

fn main() {
    let path = std::env::var_os("OMBRA_DESKTOP_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(Paths::default_root);
    let browser = Arc::new(BrowserManager::new(path.join("engines")));
    tauri::Builder::default()
        .manage(browser)
        .manage(Catalog {
            path,
            store: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            list_profiles,
            create_profile,
            edit_profile,
            set_profile_deleted,
            get_browser_status,
            check_browser_update,
            install_browser,
            cancel_browser_install,
        ])
        .run(tauri::generate_context!())
        .expect("Could not start Ombra Desktop");
}
