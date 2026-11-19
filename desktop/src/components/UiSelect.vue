<script setup lang="ts" generic="T extends string">
import { SelectContent, SelectItem, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from 'reka-ui'
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import type { SelectOption } from './types'

const model = defineModel<T>({ required: true })
const props = withDefaults(
  defineProps<{ options: SelectOption<T>[]; id?: string; disabled?: boolean; mono?: boolean; invalid?: boolean; ariaLabel?: string }>(),
  { disabled: false, mono: false, invalid: false },
)
/** Reka не допускает пункт с пустым значением: внутри пустая строка заменяется служебной. */
const EMPTY = '__ombra_empty__'
const toInner = (value: T) => (value === '' ? EMPTY : value)
const inner = computed({
  get: () => toInner(model.value),
  set: (value: string) => {
    model.value = (value === EMPTY ? '' : value) as T
  },
})
const selectedLabel = computed(() => props.options.find((option) => option.value === model.value)?.label ?? model.value)
</script>

<template>
  <SelectRoot v-model="inner" :disabled="disabled">
    <SelectTrigger :id="id" :aria-label="ariaLabel" :class="['input', 'trigger', { mono, invalid }]">
      <SelectValue class="value">{{ selectedLabel }}</SelectValue>
      <AppIcon name="chevron" :size="16" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" :side-offset="4" class="popover">
        <SelectViewport>
          <SelectItem
            v-for="option in options"
            :key="toInner(option.value)"
            :value="toInner(option.value)"
            :disabled="option.disabled"
            :title="option.title"
            :class="['menu-item', { mono }]"
          >
            <SelectItemText>{{ option.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
