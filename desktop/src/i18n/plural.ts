/** Русские формы множественного числа для vue-i18n: «нет | 1, 21 | 2–4, 22–24 | остальные». */
export function ruPlural(choice: number, choicesLength: number): number {
  if (choice === 0) return 0
  const teen = choice % 100 > 10 && choice % 100 < 20
  const lastDigit = choice % 10
  if (choicesLength < 4) return !teen && lastDigit === 1 ? 1 : 2
  if (!teen && lastDigit === 1) return 1
  if (!teen && lastDigit >= 2 && lastDigit <= 4) return 2
  return 3
}
