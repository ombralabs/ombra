export type Language = 'ru' | 'en'

export type SecretInput = { action: 'keep' } | { action: 'clear' } | { action: 'set'; value: string }

export interface GroupView {
  id: number
  name: string
  color: string
}
