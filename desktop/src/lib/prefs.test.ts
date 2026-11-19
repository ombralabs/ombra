import { beforeEach, describe, expect, it } from 'vitest'
import { readPref, writePref } from './prefs'

const pageSize = (raw: unknown): number | null => (typeof raw === 'number' && [50, 100, 200].includes(raw) ? raw : null)

describe('настройки окна в localStorage', () => {
  beforeEach(() => localStorage.clear())

  it('пишет JSON и читает его обратно', () => {
    writePref('size', 100)
    expect(localStorage.getItem('size')).toBe('100')
    expect(readPref('size', pageSize, 50)).toBe(100)
  })

  it('испорченное или отсутствующее значение — значение по умолчанию', () => {
    for (const [key, value] of Object.entries({ size: '37', broken: 'не json{', text: '"200"' })) localStorage.setItem(key, value)
    expect(readPref('size', pageSize, 50)).toBe(50)
    expect(readPref('broken', pageSize, 50)).toBe(50)
    expect(readPref('text', pageSize, 50)).toBe(50)
    expect(readPref('missing', pageSize, 50)).toBe(50)
  })
})
