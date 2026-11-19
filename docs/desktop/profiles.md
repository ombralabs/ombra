# Working with profiles

The local catalog stores one SQLite record per profile. A profile can belong to one group, carry several tags, have one user-assigned status label and keep an ordered list of bookmarks. For example, a group can identify a project, tags can identify review topics, and a status label can show that a review is complete.

## Ombra Desktop 1.2.2

1. Select **New profile**, enter a name and an optional note, then select **Save**.
2. Find a profile by name, note or number in **Search profiles**. Select **Edit** to change its name or note.
3. Select the profile’s trash button and confirm **Move to Trash**. Open **Trash** and select **Restore** to return it to the active list. Its files stay in the data directory.

## Catalog operations

Open the application data directory with `Store::open_local`. The handle holds the directory lock until it is dropped. Use an empty directory for this example. Close the application that owns a catalog before opening it with this library. The caller supplies the creation time in Unix seconds.

```rust
use ombra_desktop_store::store::{profiles::ProfileInput, Store, StoreError};
use std::path::Path;

fn create_review_profile(data_dir: &Path, now: i64) -> Result<String, StoreError> {
    let store = Store::open_local(data_dir)?;
    let mut input = ProfileInput::new("Documentation review", "{}");
    input.note = "Check the getting-started guide".into();
    let record = store.create_profile(&input, now)?;
    Ok(record.id)
}
```

The empty JSON object is sufficient for a catalog-only record. The original Desktop profile editor requires a complete browser configuration. When copying an existing record for use with 1.2.1, preserve its `fingerprint_json` value.

| Task | Operation |
| --- | --- |
| Create | Give the profile a name up to 100 characters. Keep the ID returned by `create_profile` for later changes. |
| Edit a note | Set `ProfileEdit::note` and pass the selected IDs to `edit_profiles`. Other unset edit fields keep their values. |
| Organize | `move_profiles` assigns a group to the selected IDs. Use `None` to ungroup them. Deleting a group leaves its profiles in the catalog. |
| Tag and label | Use `add_tags` to add tags while preserving existing ones. Use `set_profile_label` to assign or clear a single user status. |
| Save bookmarks | `set_profile_bookmarks` replaces the profile's bookmark list in the supplied order. Read the current list with `profile_bookmarks` before adding to it. |
| Find | `list_profiles` accepts a `ListQuery` with search text, a group or tag and sort order. The ordinary list omits records in the trash. |
| Move to trash and restore | Pass a deletion timestamp to `set_deleted` for the selected IDs. `list_trash` shows those records. Pass `None` to `set_deleted` to restore them. |

The catalog records these changes locally. Opening a directory marked as an encrypted vault returns `StoreError::Protected`. Use the original desktop app for [vault unlock and recovery](profile-security.md).

### Reusable interface controls

The Vue controls support the same edits. `TagInput` accepts Enter or a comma to add a tag and gives each remove button an accessible name. `SecretField` shows when a credential is saved and requires an explicit choice to remove it. `UiButton` keeps keyboard focus during a pending operation, and `UiField` places a validation error beside the input it describes. [Component sources](../../desktop/src/components/).

## Original desktop window

These menu names document the historical Desktop 1.2.1 interface. That release required the retired account service to open its profile window.

1. Open **Profiles**, select **New profile**, enter a name and select **Create profile**. You can add a group, tags and a note to help you find it later.
2. Open the profile editor to change its name or note, then select **Save**. On the profile list, search or filter by group, tag or user-assigned status.
3. With a browser engine installed, select **Start** in the profile row. The status changes from **Starting** to **Running**. Select **Stop** when finished. A running profile holds a lock on its directory so two browser instances cannot write to the same profile.
4. To remove a stopped profile, select **Delete** from its row menu. The record and browser directory stay in **Trash** until you restore or permanently delete the profile. **Restore** returns it to its original group if the group still exists.

**Delete permanently** and **Empty trash** remove the profile record and browser files, including history and cookies. The original application has no timed trash purge.

### Export a profile

A CSV export contains the profile list. Selecting the option to include credentials writes those values as plain text. A profile archive also contains Chromium files and can be imported as a new profile.

An archive password encrypts the block containing the stored username, password, authenticator secret and proxy password. An export without a password omits that block. In both cases, the browser files and profile metadata are in an ordinary compressed archive and can contain private data. Store exported files in a private location. For recovery of the whole installation, use a [backup of the application data and keys](local-keys.md).

### Interface conventions

The original window uses Vue 3 and TypeScript in a Tauri WebView. The sidebar starts at 72 px, expands to 248 px and saves the choice. Collapsed controls retain their accessible names. In the profile list, a monospace ID sits beside the browser state. Status text and visible keyboard focus keep the controls usable without relying on color.

The Russian and English settings group related controls under **General**, **Profile launches**, **Browser**, **Security & data** and **Integrations**. Search finds controls by label or description. The save status distinguishes a pending edit from a saved change or a field error. The interface uses Golos Text for controls, Jost for the wordmark and JetBrains Mono for technical values.

These conventions come from the original `PRODUCT.md`, `DESIGN.md`, profile specification and manual checks. The original UI checks used Chromium with synthetic data and mocked Tauri commands. A native browser launch or a real vault mount requires a separate platform check.
