<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from './components/AppIcon.vue'
import UiButton from './components/UiButton.vue'
import UiDialog from './components/UiDialog.vue'
import UiField from './components/UiField.vue'
import UiSegmented from './components/UiSegmented.vue'
import BrowserDownload from './components/BrowserDownload.vue'

interface Profile {
  id: string
  serial: number
  name: string
  note: string
}

type View = 'active' | 'trash'
type Editor =
  | { action: 'create' | 'edit'; id?: string; name: string; note: string }
  | { action: 'trash'; id: string; name: string }

const { t, te } = useI18n()
const catalog = ref<Record<View, Profile[]> | null>(null)
const view = ref<View>('active')
const search = ref('')
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const actionError = ref('')
const editor = ref<Editor | null>(null)
const dialogError = ref('')
const heading = ref<HTMLElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
let previousFocus: HTMLElement | null = null

const editorOpen = computed({
  get: () => editor.value !== null,
  set: (open: boolean) => { if (!open) editor.value = null },
})
const views = computed(() => [
  { value: 'active' as const, label: t('catalog.active') },
  { value: 'trash' as const, label: t('catalog.trash') },
])
const profiles = computed(() => {
  const rows = catalog.value?.[view.value] ?? []
  const query = search.value.trim().toLocaleLowerCase()
  return query
    ? rows.filter((profile) => [profile.name, profile.note, `#${profile.serial}`]
        .some((value) => value.toLocaleLowerCase().includes(query)))
    : rows
})
const nameLength = computed(() => Array.from(editor.value?.name.trim() ?? '').length)

function explain(error: unknown) {
  if (typeof error === 'object' && error !== null && 'kind' in error && typeof error.kind === 'string') {
    const key = `catalog.errors.${error.kind}`
    if (te(key)) return t(key, { detail: 'detail' in error ? error.detail : '' })
  }
  return t('catalog.errors.storage', { detail: String(error) })
}

async function loadProfiles() {
  loading.value = true
  loadError.value = ''
  try {
    catalog.value = await invoke<Record<View, Profile[]>>('list_profiles')
  } catch (error) {
    loadError.value = explain(error)
  } finally {
    loading.value = false
  }
}

function openEditor(event: MouseEvent, next: Editor) {
  previousFocus = event.currentTarget as HTMLElement
  dialogError.value = ''
  editor.value = next
}

function focusEditor(event: Event) {
  const target = nameInput.value ?? document.getElementById('profile-cancel')
  if (target) {
    event.preventDefault()
    target.focus()
  }
}

function returnFocus(event: Event) {
  event.preventDefault()
  const target = previousFocus?.isConnected ? previousFocus : heading.value
  target?.focus()
}

async function save() {
  const current = editor.value
  if (!current || saving.value) return
  if (current.action !== 'trash' && (nameLength.value < 1 || nameLength.value > 100)) {
    dialogError.value = t('catalog.errors.invalidName')
    nameInput.value?.focus()
    return
  }
  saving.value = true
  dialogError.value = ''
  try {
    if (current.action === 'trash') {
      await invoke('set_profile_deleted', { id: current.id, deleted: true })
      previousFocus = null
    } else {
      const fields = { name: current.name, note: current.note }
      if (current.action === 'edit') {
        await invoke('edit_profile', { id: current.id, ...fields })
      } else {
        await invoke('create_profile', fields)
        search.value = ''
        view.value = 'active'
      }
    }
    editor.value = null
    await loadProfiles()
  } catch (error) {
    dialogError.value = explain(error)
  } finally {
    saving.value = false
  }
}

async function restore(profile: Profile) {
  if (saving.value) return
  saving.value = true
  actionError.value = ''
  try {
    await invoke('set_profile_deleted', { id: profile.id, deleted: false })
    await loadProfiles()
    heading.value?.focus()
  } catch (error) {
    actionError.value = explain(error)
  } finally {
    saving.value = false
  }
}

onMounted(loadProfiles)
</script>

<template>
  <header class="desktop-header">
    <img src="/branding/ombra-c.svg" width="24" height="24" alt="" />
    <span>Ombra Desktop</span>
  </header>

  <main class="workspace" :aria-busy="loading">
    <div class="page-heading">
      <h1 ref="heading" tabindex="-1" class="page-title">{{ t('catalog.title') }}</h1>
      <UiButton
        variant="primary"
        icon="plus"
        :busy="saving || loading"
        :disabled="!catalog || !!loadError"
        @click="openEditor($event, { action: 'create', name: '', note: '' })"
      >
        {{ t('catalog.newProfile') }}
      </UiButton>
    </div>

    <div v-if="loadError" class="catalog-error">
      <p role="alert">{{ loadError }}</p>
      <UiButton size="sm" @click="loadProfiles">{{ t('catalog.retry') }}</UiButton>
    </div>
    <p v-else-if="!catalog" class="muted" role="status">{{ t('catalog.loading') }}</p>

    <template v-else>
      <div class="toolbar">
        <UiSegmented v-model="view" :options="views" :aria-label="t('catalog.views')" @update:model-value="actionError = ''" />
        <label class="search">
          <AppIcon name="search" :size="17" />
          <input
            v-model="search"
            class="input"
            type="search"
            :placeholder="t('catalog.search')"
            :aria-label="t('catalog.search')"
          />
        </label>
      </div>

      <p v-if="actionError" class="error-text" role="alert">{{ actionError }}</p>
      <ul v-if="profiles.length" class="profile-list" :aria-label="t('catalog.title')">
        <li v-for="profile in profiles" :key="profile.id" class="profile-row">
          <span class="serial mono">#{{ profile.serial }}</span>
          <div class="profile-details">
            <strong>{{ profile.name }}</strong>
            <div v-if="profile.note" class="profile-note">{{ profile.note }}</div>
          </div>
          <div class="row-actions">
            <template v-if="view === 'active'">
              <UiButton
                size="sm"
                variant="ghost"
                :aria-label="t('catalog.editNamed', { name: profile.name })"
                :busy="saving"
                @click="openEditor($event, { ...profile, action: 'edit' })"
              >
                {{ t('catalog.edit') }}
              </UiButton>
              <UiButton
                size="icon"
                variant="ghost"
                icon="trash"
                :icon-size="16"
                :aria-label="t('catalog.trashNamed', { name: profile.name })"
                :title="t('catalog.moveToTrash')"
                :busy="saving"
                @click="openEditor($event, { ...profile, action: 'trash' })"
              />
            </template>
            <UiButton v-else size="sm" :busy="saving" :aria-label="t('catalog.restoreNamed', { name: profile.name })" @click="restore(profile)">
              {{ t('catalog.restore') }}
            </UiButton>
          </div>
        </li>
      </ul>
      <div v-else class="empty-state" role="status">
        <AppIcon :name="view === 'trash' ? 'trash' : 'profiles'" :size="25" />
        <p>{{ t(search.trim() ? 'catalog.noMatches' : view === 'active' ? 'catalog.noProfiles' : 'catalog.emptyTrash') }}</p>
      </div>
    </template>
    <BrowserDownload />
  </main>

  <UiDialog
    v-model:open="editorOpen"
    :title="editor ? t(`catalog.dialog.${editor.action}`) : ''"
    :description="editor?.action === 'trash' ? t('catalog.trashDescription', { name: editor.name }) : undefined"
    :busy="saving"
    :width="420"
    @open-auto-focus="focusEditor"
    @close-auto-focus="returnFocus"
  >
    <form v-if="editor" id="profile-form" @submit.prevent="save">
      <template v-if="editor.action !== 'trash'">
        <UiField :label="t('catalog.name')" input-id="profile-name">
          <input
            id="profile-name"
            ref="nameInput"
            v-model="editor.name"
            class="input"
            type="text"
            required
            :aria-invalid="nameLength > 100 || undefined"
            :readonly="saving"
          />
        </UiField>
        <UiField :label="t('catalog.note')" input-id="profile-note">
          <textarea id="profile-note" v-model="editor.note" class="input" rows="4" :readonly="saving" />
        </UiField>
      </template>
      <p v-if="dialogError" class="error-text" role="alert">{{ dialogError }}</p>
    </form>
    <template #footer>
      <UiButton id="profile-cancel" :disabled="saving" @click="editorOpen = false">{{ t('common.cancel') }}</UiButton>
      <UiButton type="submit" form="profile-form" :variant="editor?.action === 'trash' ? 'danger' : 'primary'" :loading="saving">
        {{ t(editor?.action === 'trash' ? 'catalog.moveToTrash' : 'catalog.save') }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.desktop-header {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 52px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  background: var(--sidebar);
  font-weight: 600;
}

.workspace {
  width: min(100%, 1000px);
  margin: 0 auto;
  padding: 30px clamp(18px, 4vw, 38px) 32px;
}

.page-heading,
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.page-title:focus {
  outline: none;
}

.search {
  position: relative;
  flex: 0 1 240px;
  min-width: 0;
}

.search .icon {
  position: absolute;
  inset: 50% auto auto 11px;
  transform: translateY(-50%);
  color: var(--text-2);
  pointer-events: none;
}

.search .input {
  padding-left: 36px;
}

.search .input::placeholder {
  color: var(--text-2);
}

.profile-list {
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  list-style: none;
}

.profile-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 62px;
  padding: 10px 13px 10px 17px;
}

.profile-row + .profile-row {
  border-top: 1px solid var(--row-border);
}

.serial, .profile-note {
  color: var(--text-2);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.profile-details strong {
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.profile-note {
  margin-top: 2px;
  white-space: pre-wrap;
}

.row-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  display: grid;
  min-height: 168px;
  place-content: center;
  justify-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--more-bg);
  color: var(--text-2);
}

.empty-state p,
.catalog-error p,
form p {
  margin: 0;
  overflow-wrap: anywhere;
}

.catalog-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-card);
  color: var(--danger-text);
}

form {
  display: grid;
  gap: 14px;
}

form textarea {
  min-height: 86px;
}
</style>
