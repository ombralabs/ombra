import { describe, expect, it } from 'vitest'
import { GROUP_PALETTE, nextGroupColor } from './groups'

describe('цвет новой группы', () => {
  it('первый свободный цвет палитры без учёта регистра', () => {
    expect(nextGroupColor([])).toBe('#0A6B66')
    expect(nextGroupColor([{ color: '#0a6b66' }])).toBe('#B02A6B')
    expect(nextGroupColor([{ color: '#123456' }, { color: '#B02A6B' }, { color: '#0a6b66' }])).toBe('#6B46C1')
  })

  it('все цвета заняты — первый', () => {
    expect(nextGroupColor(GROUP_PALETTE.map((color) => ({ color: color.toLowerCase() })))).toBe('#0A6B66')
  })
})
