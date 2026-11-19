import { describe, expect, it } from 'vitest'
import { freeSuggestions, mergeTags, sameTag } from './tags'

describe('теги в поле ввода', () => {
  it('добавляет через запятую, без пустых и повторов без учёта регистра', () => {
    expect(mergeTags(['Shop'], ' vip , shop,,Новый ')).toEqual(['Shop', 'vip', 'Новый'])
    expect(mergeTags([], '   ')).toEqual([])
  })

  it('подсказки без уже выбранных тегов', () => {
    expect(freeSuggestions(['Shop', 'vip', 'test'], ['SHOP'])).toEqual(['vip', 'test'])
    expect(sameTag(' Ёж ', 'ёж')).toBe(true)
  })

  it('ё и е — один тег, как в ядре (`store::fold`)', () => {
    expect(sameTag('Ёж', 'еж')).toBe(true)
    expect(sameTag('ёлка', 'ЕЛКА')).toBe(true)
    expect(sameTag('еж', 'ежи')).toBe(false)
    expect(mergeTags(['Ёж'], 'еж, Елка')).toEqual(['Ёж', 'Елка'])
    expect(freeSuggestions(['ёлка', 'Shop'], ['Елка'])).toEqual(['Shop'])
  })
})
