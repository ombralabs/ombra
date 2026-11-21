import { invoke } from '@tauri-apps/api/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App.vue'
import { setLocale } from './i18n'
import { mountWithApp } from './test/mount'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), Channel: class { onmessage = () => {} } }))

beforeEach(() => {
  vi.mocked(invoke).mockReset()
  setLocale('en')
})

afterEach(() => {
  setLocale('ru')
})

it('can retry opening a locked catalog', async () => {
  vi.mocked(invoke).mockRejectedValueOnce({ kind: 'busy' }).mockResolvedValueOnce({ active: [], trash: [] })
  const app = mountWithApp(App, { global: { stubs: { BrowserDownload: true } } })
  await flushPromises()

  expect(app.get('[role="alert"]').text()).toContain('Close the other Ombra Desktop window')
  await app.findAll('button').find((button) => button.text() === 'Try again')!.trigger('click')
  await flushPromises()

  expect(app.find('[role="alert"]').exists()).toBe(false)
  expect(app.text()).toContain('No profiles yet')
  app.unmount()
})

it('keeps unsaved details available when creating a profile fails', async () => {
  vi.mocked(invoke)
    .mockResolvedValueOnce({ active: [], trash: [] })
    .mockRejectedValueOnce({ kind: 'storage', detail: 'Disk full' })
  const app = mountWithApp(App, { global: { stubs: { BrowserDownload: true } } })
  await flushPromises()

  await app.findAll('button').find((button) => button.text() === 'New profile')!.trigger('click')
  await app.get('#profile-name').setValue('Research')
  await app.get('form').trigger('submit')
  await flushPromises()

  expect(app.get('[role="dialog"] [role="alert"]').text()).toContain('Disk full')
  expect((app.get('#profile-name').element as HTMLInputElement).value).toBe('Research')
  app.unmount()
})


it('shows browser download without making a network request on startup', async () => {
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === 'list_profiles') return { active: [], trash: [] }
    if (command === 'get_browser_status') return null
    throw new Error(`Unexpected command ${command}`)
  })
  const app = mountWithApp(App)
  await flushPromises()

  expect(app.get('[aria-labelledby="browser-title"]').text()).toContain('Browser is not installed')
  expect(app.findAll('button').some((button) => button.text() === 'Download browser')).toBe(true)
  expect(vi.mocked(invoke).mock.calls.map(([command]) => command).sort()).toEqual(['get_browser_status', 'list_profiles'])
  expect(app.text()).toContain('No profiles yet')
  app.unmount()
})
