<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const model = defineModel<boolean>({ required: true })
const props = withDefaults(defineProps<{ ariaLabel: string; indeterminate?: boolean; disabled?: boolean }>(), {
  indeterminate: false,
  disabled: false,
})
const input = ref<HTMLInputElement | null>(null)

// `indeterminate` у флажка — только свойство DOM, атрибута нет.
watchEffect(() => {
  if (input.value) input.value.indeterminate = props.indeterminate
})
</script>

<template>
  <input ref="input" v-model="model" type="checkbox" class="checkbox" :aria-label="ariaLabel" :disabled="disabled" />
</template>

<style scoped>
.checkbox {
  width: 18px;
  height: 18px;
  margin: 0;
  /* Общий акцент выделения строк. */
  accent-color: var(--accent);
  cursor: pointer;
}

.checkbox:disabled {
  cursor: default;
}

.checkbox:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
</style>
