import { SelectRoot } from 'reka-ui'
import { describe, expect, it } from 'vitest'
import UiSelect from './UiSelect.vue'
import { mountWithApp } from '../test/mount'

const options = [
  { value: '', label: 'Без группы' },
  { value: '5', label: 'Магазины' },
]

describe('UiSelect', () => {
  it('принимает и отдаёт пустое значение', async () => {
    const wrapper = mountWithApp(UiSelect, { props: { modelValue: '', options } })
    expect(wrapper.text()).toContain('Без группы')
    const root = wrapper.findComponent(SelectRoot)
    // Типы SelectRoot у test-utils не раскрывают пропсы, читаем их как есть.
    const inner = () => (root.props() as { modelValue: string }).modelValue
    const empty = inner()
    expect(empty).not.toBe('')

    root.vm.$emit('update:modelValue', '5')
    root.vm.$emit('update:modelValue', empty)
    expect(wrapper.emitted('update:modelValue')).toEqual([['5'], ['']])

    await wrapper.setProps({ modelValue: '5' })
    expect(inner()).toBe('5')
    expect(wrapper.text()).toContain('Магазины')
  })
})
