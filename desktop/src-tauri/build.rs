fn main() {
    #[cfg(feature = "app")]
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "list_profiles",
            "create_profile",
            "edit_profile",
            "set_profile_deleted",
            "get_browser_status",
            "check_browser_update",
            "install_browser",
            "cancel_browser_install",
        ]),
    ))
    .expect("Could not configure Ombra Desktop");
}
