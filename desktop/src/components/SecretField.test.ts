import { describe, expect, it } from 'vitest'
import SecretField from './SecretField.vue'
import type { SecretDraft } from './types'
import { mountWithApp } from '../test/mount'

describe('SecretField', () => {
  it('ввод и удаление сохранённого отдают новый объект, исходный не меняется', async () => {
    const original: SecretDraft = { value: '', saved: true, clear: false }
    const wrapper = mountWithApp(SecretField, { props: { modelValue: original, inputId: 'pw' } })
    await wrapper.find('#pw').setValue('secret')
    await wrapper.find('button').trigger('click')
    expect(original).toEqual({ value: '', saved: true, clear: false })
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [{ value: 'secret', saved: true, clear: false }],
      [{ value: '', saved: true, clear: true }],
    ])
  })

  it('тексты ключа 2FA — свои, по умолчанию — про пароль', async () => {
    const draft: SecretDraft = { value: '', saved: true, clear: false }
    const totp = mountWithApp(SecretField, { props: { modelValue: draft, inputId: 'k', kind: 'totp' } })
    expect(totp.text()).toContain('Удалить сохранённый ключ 2FA')
    await totp.setProps({ modelValue: { ...draft, clear: true } })
    expect(totp.text()).toContain('Ключ 2FA будет удалён при сохранении.')
    expect(mountWithApp(SecretField, { props: { modelValue: draft, inputId: 'p' } }).text()).toContain('Удалить сохранённый пароль')
  })

  it('«Оставить» отменяет удаление новым объектом', async () => {
    const original: SecretDraft = { value: '', saved: true, clear: true }
    const wrapper = mountWithApp(SecretField, { props: { modelValue: original, inputId: 'pw' } })
    await wrapper.find('button').trigger('click')
    expect(original.clear).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[{ value: '', saved: true, clear: false }]])
  })
})
