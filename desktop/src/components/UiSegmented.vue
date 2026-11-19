<script setup lang="ts" generic="T extends string">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import type { SelectOption } from './types'

const model = defineModel<T>({ required: true })
defineProps<{ options: SelectOption<T>[]; ariaLabel?: string }>()

/** Повторный щелчок по выбранному пункту в Reka снимает выбор — у переключателя всегда есть значение. */
function update(value: unknown) {
  if (typeof value === 'string' && value !== '') model.value = value as T
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="model"
    :aria-label="ariaLabel"
    class="segmented"
    @update:model-value="update"
  >
    <ToggleGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
      :title="option.title"
      class="segment"
    >
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style scoped>
.segmented {
  display: flex;
  gap: 3px;
  height: var(--control-h);
  padding: 3px;
  border-radius: var(--radius-control);
  background: var(--segment-bg);
}

.segment {
  flex: 1 1 0;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-2);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.segment[data-state='on'] {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 12%, transparent);
}

.segment[data-disabled] {
  cursor: default;
  opacity: 0.5;
}
.segment:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}
</style>
