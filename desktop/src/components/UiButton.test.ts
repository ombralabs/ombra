import { describe, expect, it, vi } from 'vitest'
import { mountWithApp } from '../test/mount'
import UiButton from './UiButton.vue'

const mountButton = (props: Record<string, unknown>) => {
  const onClick = vi.fn()
  const wrapper = mountWithApp(UiButton, { props: { ...props, onClick }, slots: { default: 'Сохранить' } })
  return { button: wrapper.find('button'), onClick }
}

describe('кнопка', () => {
  it('занятая (loading и busy) без атрибута disabled: aria-disabled, щелчок не уходит родителю', async () => {
    for (const props of [{ loading: true }, { busy: true }]) {
      const { button, onClick } = mountButton(props)
      expect(button.attributes('disabled')).toBeUndefined()
      expect(button.attributes('aria-disabled')).toBe('true')
      await button.trigger('click')
      expect(onClick).not.toHaveBeenCalled()
    }
  })

  it('loading — крутилка и aria-busy; busy — без крутилки', () => {
    const loading = mountButton({ loading: true }).button
    expect(loading.attributes('aria-busy')).toBe('true')
    expect(loading.find('.spin').exists()).toBe(true)
    const busy = mountButton({ busy: true }).button
    expect(busy.attributes('aria-busy')).toBeUndefined()
    expect(busy.find('.spin').exists()).toBe(false)
  })

  it('disabled — атрибут; обычная кнопка отдаёт щелчок', async () => {
    expect(mountButton({ disabled: true }).button.attributes('disabled')).toBeDefined()
    const { button, onClick } = mountButton({})
    expect(button.attributes('aria-disabled')).toBeUndefined()
    await button.trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
