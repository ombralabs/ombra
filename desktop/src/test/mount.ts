import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { i18n } from '../i18n'

type MountOptions = NonNullable<Parameters<typeof mount>[1]>

export function mountWithApp(component: Component, options: MountOptions = {}) {
  const { plugins = [], stubs = {}, ...global } = options.global ?? {}
  return mount(component, {
    ...options,
    global: {
      renderStubDefaultSlot: true,
      ...global,
      plugins: [i18n, ...plugins],
      stubs: { teleport: true, ...stubs },
    },
  })
}
