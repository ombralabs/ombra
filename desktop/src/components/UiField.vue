<script setup lang="ts">
import UiDetails from './UiDetails.vue'

defineProps<{ label?: string; inputId?: string; hint?: string; details?: string; error?: string | null }>()
</script>

<template>
  <div class="field">
    <div v-if="label || $slots.badge" class="head">
      <label v-if="label" :for="inputId" class="label">{{ label }}</label>
      <slot name="badge" />
    </div>
    <div class="body">
      <slot />
      <div v-if="error" class="error-text">{{ error }}</div>
      <div v-else-if="hint" class="hint">{{ hint }}</div>
      <UiDetails v-if="details" :text="details" />
    </div>
  </div>
</template>

<style scoped>
.field,
.body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

/* В строке сетки шапки соседних полей одной высоты: перенос подписи или плашка «вручную» не сдвигают поле ввода. */
.grid > .field {
  display: grid;
  grid-row: span 2;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: subgrid;
  row-gap: 6px;
}

.grid > .field > .head {
  align-self: end;
}

.grid > .field > .body {
  grid-row: 2;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.label {
  font-size: 13px;
  line-height: 18px;
  color: var(--text-2);
}
</style>
