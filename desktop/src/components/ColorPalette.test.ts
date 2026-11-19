import { describe, expect, it } from 'vitest'
import ColorPalette from './ColorPalette.vue'
import { mountWithApp } from '../test/mount'

function mountPalette(modelValue: string) {
  return mountWithApp(ColorPalette, { props: { modelValue }, attachTo: document.body })
}

type Wrapper = ReturnType<typeof mountPalette>

const radios = (wrapper: Wrapper) => wrapper.findAll('[role="radio"]')
const checked = (wrapper: Wrapper) => radios(wrapper).findIndex((radio) => radio.attributes('aria-checked') === 'true')
const tabStops = (wrapper: Wrapper) => radios(wrapper).filter((radio) => radio.attributes('tabindex') === '0').length

/** Клавиша на кружке `from`; как родитель с v-model, принимаем новый цвет. Возвращает индекс кружка в фокусе. */
async function press(wrapper: Wrapper, from: number, key: string): Promise<number> {
  await radios(wrapper)[from]!.trigger('keydown', { key })
  const last = wrapper.emitted<[string]>('update:modelValue')?.at(-1)
  if (last) await wrapper.setProps({ modelValue: last[0] })
  return radios(wrapper).findIndex((radio) => radio.element === document.activeElement)
}

describe('палитра цвета группы', () => {
  it('отмечает выбранный цвет без учёта регистра; щелчок меняет цвет и шлёт pick', async () => {
    const wrapper = mountPalette('#2447c9')
    expect(radios(wrapper)).toHaveLength(8)
    expect(
      radios(wrapper)
        .filter((r) => r.attributes('aria-checked') === 'true')
        .map((r) => r.attributes('aria-label')),
    ).toEqual(['Цвет #2447C9'])
    await radios(wrapper)[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['#B02A6B']])
    expect(wrapper.emitted('pick')).toEqual([['#B02A6B']])
    wrapper.unmount()
  })

  it('одна позиция в порядке Tab; стрелки, Home и End выбирают цвет и переносят фокус без pick', async () => {
    const wrapper = mountPalette('#2447c9')
    expect([checked(wrapper), tabStops(wrapper)]).toEqual([3, 1])
    expect(radios(wrapper)[3]!.attributes('tabindex')).toBe('0')
    expect(await press(wrapper, 3, 'ArrowRight')).toBe(4)
    expect(await press(wrapper, 4, 'ArrowDown')).toBe(5)
    expect(await press(wrapper, 5, 'ArrowLeft')).toBe(4)
    expect(await press(wrapper, 4, 'ArrowUp')).toBe(3)
    expect(await press(wrapper, 3, 'End')).toBe(7)
    expect(await press(wrapper, 7, 'ArrowRight')).toBe(0)
    expect(await press(wrapper, 0, 'ArrowLeft')).toBe(7)
    expect(await press(wrapper, 7, 'Home')).toBe(0)
    expect(wrapper.emitted('update:modelValue')).toEqual([
      ['#B4451F'],
      ['#2F7D32'],
      ['#B4451F'],
      ['#2447C9'],
      ['#5A5F6B'],
      ['#0A6B66'],
      ['#5A5F6B'],
      ['#0A6B66'],
    ])
    expect([checked(wrapper), tabStops(wrapper)]).toEqual([0, 1])
    expect(wrapper.emitted('pick')).toBeUndefined()
    wrapper.unmount()
  })

  it('цвет не из палитры — в порядке Tab первый кружок', () => {
    const wrapper = mountPalette('#123456')
    expect(radios(wrapper).map((radio) => radio.attributes('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
      '-1',
      '-1',
      '-1',
    ])
    wrapper.unmount()
  })
})
