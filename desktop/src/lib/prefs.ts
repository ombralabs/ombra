/** Ключи `localStorage`: только удобство окна, а не данные. */
export const PREF_PAGE_SIZE = 'ombra.profiles.pageSize'
export const PREF_COLUMNS = 'ombra.profiles.columns'
export const PREF_SIDEBAR_COLLAPSED = 'ombra.sidebar.collapsed'
export const PREF_SETTINGS_SECTION = 'ombra.settings.section'
export const PREF_PROFILE_GROUPS_COLLAPSED = 'ombra.profiles.groups.collapsed'

/** Значение из `localStorage` (JSON). Нет, испорчено, не прошло `parse`, хранилище недоступно — `fallback`. */
export function readPref<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  try {
    const text = localStorage.getItem(key)
    if (text === null) return fallback
    return parse(JSON.parse(text)) ?? fallback
  } catch {
    return fallback
  }
}

/** Запись не обязана удаться: приватный режим или запрет хранилища не мешают работе. */
export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Это только удобство: без сохранения окно откроется со значениями по умолчанию.
  }
}
