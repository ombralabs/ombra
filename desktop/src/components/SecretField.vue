<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SecretDraft } from './types'

const draft = defineModel<SecretDraft>({ required: true })
/** `kind` выбирает тексты «удалить»: пароль учётной записи или ключ 2FA. */
const props = withDefaults(defineProps<{ inputId: string; invalid?: boolean; kind?: 'password' | 'totp' }>(), {
  invalid: false,
  kind: 'password',
})
const { t } = useI18n()

/** Любая правка отдаёт новый объект через `update:modelValue`: объект модели на месте не меняется. */
const value = computed({
  get: () => draft.value.value,
  set: (next: string) => {
    draft.value = { ...draft.value, value: next }
  },
})

function removeSaved() {
  draft.value = { ...draft.value, value: '', clear: true }
}

function keepSaved() {
  draft.value = { ...draft.value, clear: false }
}
</script>

<template>
  <div class="secret">
    <input
      :id="inputId"
      v-model="value"
      type="password"
      class="input"
      :class="{ invalid }"
      autocomplete="new-password"
      :placeholder="draft.saved && !draft.clear ? t('secret.saved') : ''"
      :disabled="draft.clear"
    />
    <div v-if="draft.saved" class="hint">
      <template v-if="draft.clear">
        {{ t(`secret.${props.kind}.willBeRemoved`) }}
        <button type="button" class="link" @click="keepSaved">{{ t('secret.keep') }}</button>
      </template>
      <button v-else type="button" class="link" @click="removeSaved">{{ t(`secret.${props.kind}.remove`) }}</button>
    </div>
  </div>
</template>

<style scoped>
.secret {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
