/** Палитра цветов групп (холст заказчика). */
export const GROUP_PALETTE = ['#0A6B66', '#B02A6B', '#6B46C1', '#2447C9', '#B4451F', '#2F7D32', '#9A6A00', '#5A5F6B'] as const

/** Первый цвет палитры, не занятый другой группой; все заняты — первый. Ядро хранит цвет строчными. */
export function nextGroupColor(groups: { color: string }[]): string {
  const used = new Set(groups.map((group) => group.color.toLowerCase()))
  return GROUP_PALETTE.find((color) => !used.has(color.toLowerCase())) ?? GROUP_PALETTE[0]
}
