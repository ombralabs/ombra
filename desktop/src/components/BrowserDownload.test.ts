import { invoke } from '@tauri-apps/api/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { setLocale } from '../i18n'
import { mountWithApp } from '../test/mount'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), Channel: class { onmessage = () => {} } }))

beforeEach(() => {
  vi.mocked(invoke).mockReset()
  setLocale('en')
})
afterEach(() => { setLocale('ru') })

function button(app: ReturnType<typeof mountWithApp>, label: string) {
  return app.findAll('button').find((element) => element.text() === label)!
}

it('checks a release explicitly and updates the installed browser', async () => {
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === 'list_profiles') return { active: [], trash: [] }
    if (command === 'get_browser_status') return { version: '158.0.8127.37-2', path: '/engines/old/Ombra' }
    if (command === 'check_browser_update') return { version: '158.0.8127.37-3', size: 482578859, platform: 'darwin-arm64' }
    if (command === 'install_browser') return { version: '158.0.8127.37-3', path: '/engines/new/Ombra' }
    throw new Error(`Unexpected command ${command}`)
  })
  const app = mountWithApp(App)
  await flushPromises()
  expect(app.get('[aria-labelledby="browser-title"]').text()).toContain('158.0.8127.37-2')
  await button(app, 'Check for updates').trigger('click')
  await flushPromises()
  expect(app.text()).toContain('158.0.8127.37-3')
  await button(app, 'Update browser').trigger('click')
  await flushPromises()
  expect(app.get('[aria-labelledby="browser-title"]').text()).toContain('/engines/new/Ombra')
  expect(button(app, 'Update browser')).toBeUndefined()
  app.unmount()
})

it('shows download progress, cancels, and leaves profiles usable', async () => {
  let rejectInstall: (error: unknown) => void = () => {}
  vi.mocked(invoke).mockImplementation(async (command, args) => {
    if (command === 'list_profiles') return { active: [], trash: [] }
    if (command === 'get_browser_status') return null
    if (command === 'cancel_browser_install') { rejectInstall({ kind: 'cancelled' }); return }
    if (command === 'install_browser') {
      const channel = (args as { onProgress: { onmessage: (data: unknown) => void } }).onProgress
      channel.onmessage({ phase: 'downloading', version: '158.0.8127.37-3', downloaded: 50, total: 100 })
      return new Promise((_, reject) => { rejectInstall = reject })
    }
    throw new Error(`Unexpected command ${command}`)
  })
  const app = mountWithApp(App)
  await flushPromises()
  await button(app, 'Download browser').trigger('click')
  await flushPromises()
  expect(app.get('progress').attributes('value')).toBe('50')
  expect(button(app, 'New profile').attributes('aria-disabled')).toBeUndefined()
  await button(app, 'Cancel download').trigger('click')
  await flushPromises()
  expect(app.text()).toContain('Download cancelled')
  expect(button(app, 'Download browser')).toBeDefined()
  expect(app.find('progress').exists()).toBe(false)
  app.unmount()
})

it('keeps the installed browser on a failed update and allows retry', async () => {
  let attempts = 0
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === 'list_profiles') return { active: [], trash: [] }
    if (command === 'get_browser_status') return { version: '158.0.8127.37-2', path: '/engines/old/Ombra' }
    if (command === 'check_browser_update') {
      if (++attempts === 1) throw { kind: 'unavailable' }
      return { version: '158.0.8127.37-3', size: 482578859, platform: 'darwin-arm64' }
    }
    throw new Error(`Unexpected command ${command}`)
  })
  const app = mountWithApp(App)
  await flushPromises()
  await button(app, 'Check for updates').trigger('click')
  await flushPromises()
  expect(app.get('[aria-labelledby="browser-title"] [role="alert"]').text()).toContain('Try again')
  expect(app.text()).toContain('/engines/old/Ombra')
  await button(app, 'Check for updates').trigger('click')
  await flushPromises()
  expect(app.find('[aria-labelledby="browser-title"] [role="alert"]').exists()).toBe(false)
  expect(button(app, 'Update browser')).toBeDefined()
  app.unmount()
})

it('does not offer a downgrade when the installed release is newer', async () => {
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === 'list_profiles') return { active: [], trash: [] }
    if (command === 'get_browser_status') return { version: '158.0.8127.37-10', path: '/engines/current/Ombra' }
    if (command === 'check_browser_update') return { version: '158.0.8127.37-3', size: 1, platform: 'darwin-arm64' }
    throw new Error(`Unexpected command ${command}`)
  })
  const app = mountWithApp(App)
  await flushPromises()
  await button(app, 'Check for updates').trigger('click')
  await flushPromises()
  expect(app.text()).toContain('Browser is up to date')
  expect(button(app, 'Update browser')).toBeUndefined()
  app.unmount()
})

it('keeps focus in catalog search when an installation finishes in the background', async () => {
  let finish: (value: unknown) => void = () => {}
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === 'list_profiles') return { active: [], trash: [] }
    if (command === 'get_browser_status') return null
    if (command === 'install_browser') return new Promise((resolve) => { finish = resolve })
    throw new Error(`Unexpected command ${command}`)
  })
  const app = mountWithApp(App, { attachTo: document.body })
  try {
    await flushPromises()
    await button(app, 'Download browser').trigger('click')
    await flushPromises()
    const search = app.get('input[type="search"]').element as HTMLInputElement
    search.focus()
    finish({ version: '158.0.8127.37-3', path: '/engines/new/Ombra' })
    await flushPromises()
    expect(document.activeElement).toBe(search)
  } finally {
    app.unmount()
  }
})
