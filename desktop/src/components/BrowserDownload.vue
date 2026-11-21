<script setup lang="ts">
import { Channel, invoke } from '@tauri-apps/api/core'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from './UiButton.vue'

interface InstalledBrowser { version: string; path: string }
interface BrowserRelease { version: string; size: number; platform: string }
interface BrowserProgress {
  phase: 'checking' | 'downloading' | 'verifying' | 'extracting' | 'complete'
  version: string | null
  downloaded: number
  total: number | null
}

const { t, te } = useI18n()
const installed = ref<InstalledBrowser | null>(null)
const available = ref<BrowserRelease | null>(null)
const loading = ref(true)
const busy = ref<'checking' | 'installing' | ''>('')
const progress = ref<BrowserProgress | null>(null)
const error = ref('')
const notice = ref('')
const cancelling = ref(false)
const title = ref<HTMLElement | null>(null)
const section = ref<HTMLElement | null>(null)

const newer = computed(() => {
  if (!available.value) return false
  if (!installed.value) return true
  const current = installed.value.version.split(/[.-]/).map(Number)
  const next = available.value.version.split(/[.-]/).map(Number)
  return (next.map((part, index) => part - (current[index] ?? 0)).find((part) => part !== 0) ?? 0) > 0
})
const canInstall = computed(() => !loading.value && (!installed.value || newer.value))
const percent = computed(() => progress.value?.total
  ? Math.min(100, Math.floor(progress.value.downloaded / progress.value.total * 100))
  : undefined)

function explain(reason: unknown) {
  if (typeof reason === 'object' && reason !== null && 'kind' in reason && typeof reason.kind === 'string') {
    const key = `browser.errors.${reason.kind}`
    if (te(key)) return t(key)
  }
  return t('browser.errors.storage')
}

async function loadStatus() {
  try {
    installed.value = await invoke<InstalledBrowser | null>('get_browser_status')
  } catch (reason) {
    error.value = explain(reason)
  } finally {
    loading.value = false
  }
}

async function check() {
  if (busy.value) return
  busy.value = 'checking'
  error.value = ''
  notice.value = ''
  try {
    available.value = await invoke<BrowserRelease>('check_browser_update')
    if (installed.value && !newer.value) notice.value = t('browser.current')
  } catch (reason) {
    error.value = explain(reason)
  } finally {
    busy.value = ''
  }
}

async function install() {
  if (busy.value || !canInstall.value) return
  busy.value = 'installing'
  error.value = ''
  notice.value = ''
  progress.value = { phase: 'checking', version: null, downloaded: 0, total: null }
  const channel = new Channel<BrowserProgress>()
  channel.onmessage = (event) => { progress.value = event }
  try {
    installed.value = await invoke<InstalledBrowser>('install_browser', { onProgress: channel })
    notice.value = t('browser.ready')
  } catch (reason) {
    if (typeof reason === 'object' && reason !== null && 'kind' in reason && reason.kind === 'cancelled') {
      notice.value = t('browser.cancelled')
    } else {
      error.value = explain(reason)
    }
  } finally {
    const restoreFocus = section.value?.contains(document.activeElement)
    progress.value = null
    busy.value = ''
    cancelling.value = false
    await nextTick()
    if (restoreFocus) title.value?.focus()
  }
}

async function cancel() {
  if (cancelling.value) return
  cancelling.value = true
  try {
    await invoke('cancel_browser_install')
  } catch (reason) {
    error.value = explain(reason)
    cancelling.value = false
  }
}

onMounted(loadStatus)
</script>

<template>
  <section ref="section" class="browser-download" aria-labelledby="browser-title" :aria-busy="!!busy">
    <div class="browser-overview">
      <div class="browser-copy">
        <h2 id="browser-title" ref="title" tabindex="-1">{{ t('browser.title') }}</h2>
        <p v-if="loading" class="muted">{{ t('browser.loading') }}</p>
        <p v-else-if="installed">{{ t('browser.installed', { version: installed.version }) }}</p>
        <p v-else class="muted">{{ t('browser.missing') }}</p>
        <p v-if="available && newer" class="muted">{{ t('browser.available', { version: available.version, size: Math.ceil(available.size / 1048576) }) }}</p>
      </div>
      <div class="browser-actions">
        <UiButton size="sm" :loading="busy === 'checking'" :busy="!!busy" :disabled="loading" @click="check">
          {{ t('browser.check') }}
        </UiButton>
        <UiButton v-if="canInstall" size="sm" variant="primary" :loading="busy === 'installing'" :busy="!!busy" @click="install">
          {{ t(installed ? 'browser.update' : 'browser.download') }}
        </UiButton>
      </div>
    </div>
    <div v-if="progress" class="browser-progress">
      <p role="status">{{ t(`browser.phases.${progress.phase}`) }}<span v-if="progress.phase === 'downloading' && percent !== undefined"> · {{ percent }}%</span></p>
      <progress :value="progress.phase === 'downloading' ? percent : undefined" max="100" :aria-label="t('browser.progress')" />
      <UiButton size="sm" :busy="cancelling" @click="cancel">{{ t('browser.cancel') }}</UiButton>
    </div>
    <p v-if="notice" role="status" class="browser-notice">{{ notice }}</p>
    <p v-if="error" role="alert" class="error-text">{{ error }}</p>
    <details v-if="installed" class="browser-location">
      <summary>{{ t('browser.location') }}</summary>
      <p class="mono">{{ installed.path }}</p>
    </details>
  </section>
</template>

<style scoped>
.browser-download {
  border-top: 1px solid var(--border);
  margin-top: 30px;
  padding-top: 22px;
}
.browser-overview,
.browser-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.browser-overview { justify-content: space-between; gap: 18px; }
.browser-copy { min-width: 0; }
h2 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
p { margin: 4px 0; overflow-wrap: anywhere; }
.browser-progress { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.browser-progress p { flex: 1 0 100%; }
progress { flex: 1; min-width: 100px; height: 8px; accent-color: var(--accent); }
.browser-notice { margin-top: 12px; }
.browser-location { color: var(--text-2); margin-top: 10px; font-size: 12px; overflow-wrap: anywhere; }
summary { width: fit-content; padding: 4px 0; cursor: pointer; }
summary:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
@media (max-width: 680px) {
  .browser-overview { align-items: flex-start; flex-direction: column; gap: 12px; }
  .browser-actions { flex-wrap: wrap; }
}
</style>
