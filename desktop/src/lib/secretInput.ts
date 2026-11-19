import type { SecretInput } from '../api/types'
import type { SecretDraft } from '../components/types'

export function secretInput(draft: SecretDraft): SecretInput {
  if (draft.value !== '') return { action: 'set', value: draft.value }
  if (draft.clear && draft.saved) return { action: 'clear' }
  return { action: 'keep' }
}
