export interface SelectOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
  /** Подсказка при наведении: например, почему пункт недоступен. */
  title?: string
}

/** Пароль в форме: новое значение, есть ли сохранённый, попросили ли удалить сохранённый. */
export interface SecretDraft {
  value: string
  saved: boolean
  clear: boolean
}
