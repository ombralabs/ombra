import { createI18n } from 'vue-i18n'
import type { Language } from '../api/types'
import en from './en.json'
import { ruPlural } from './plural'
import ru from './ru.json'

/** Языки интерфейса: единый список для боковой панели и «Настроек». */
export const LANGUAGES = ['ru', 'en'] as const

export const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: { ru, en },
  pluralRules: { ru: ruPlural },
})

export function setLocale(language: Language) {
  i18n.global.locale.value = language
  document.documentElement.lang = language
}
