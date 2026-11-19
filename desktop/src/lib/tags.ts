/** Свёртка ядра (`store::fold`): нижний регистр и «ё» → «е»; плюс пробелы по краям. */
export const fold = (tag: string) => tag.trim().toLowerCase().replaceAll('ё', 'е')

/** Теги сравниваются без учёта регистра, «ё/е» и пробелов по краям, как в ядре. */
export function sameTag(a: string, b: string): boolean {
  return fold(a) === fold(b)
}

/** Набранный текст → теги: запятая разделяет несколько, пустые и повторы отбрасываются. */
export function mergeTags(current: string[], text: string): string[] {
  const result = [...current]
  for (const raw of text.split(',')) {
    const tag = raw.trim()
    if (tag !== '' && !result.some((existing) => sameTag(existing, tag))) result.push(tag)
  }
  return result
}

export function freeSuggestions(suggestions: string[], current: string[]): string[] {
  return suggestions.filter((suggestion) => !current.some((tag) => sameTag(tag, suggestion)))
}
