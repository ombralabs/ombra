<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { GROUP_PALETTE } from '../lib/groups'

const model = defineModel<string>({ required: true })
/** Выбор щелчком, пробелом или Enter: группа закрывает всплывающую палитру. Стрелки только меняют цвет. */
const emit = defineEmits<{ pick: [color: string] }>()
const { t } = useI18n()
const root = ref<HTMLElement | null>(null)

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const selected = computed(() => GROUP_PALETTE.findIndex((color) => same(color, model.value)))
/** Roving tabindex: в порядке Tab одна позиция — выбранный цвет, без него — первый. */
const tabStop = computed(() => Math.max(selected.value, 0))

/** Стрелки — соседний цвет по кругу (вправо и вниз — следующий), Home и End — первый и последний. */
function target(key: string, from: number): number | null {
  const last = GROUP_PALETTE.length - 1
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return from === last ? 0 : from + 1
    case 'ArrowLeft':
    case 'ArrowUp':
      return from === 0 ? last : from - 1
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}

function onKeydown(event: KeyboardEvent, from: number) {
  const next = target(event.key, from)
  if (next === null) return
  event.preventDefault()
  model.value = GROUP_PALETTE[next]
  root.value?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
}

function pick(color: string) {
  model.value = color
  emit('pick', color)
}
</script>

<template>
  <div ref="root" class="palette" role="radiogroup" :aria-label="t('palette.label')">
    <button
      v-for="(color, index) in GROUP_PALETTE"
      :key="color"
      type="button"
      role="radio"
      class="swatch"
      :tabindex="index === tabStop ? 0 : -1"
      :aria-checked="index === selected"
      :aria-label="t('palette.color', { color })"
      :style="{ background: color, color }"
      @click="pick(color)"
      @keydown="onKeydown($event, index)"
    />
  </div>
</template>

<style scoped>
.palette {
  display: grid;
  grid-template-columns: repeat(4, 28px);
  gap: 10px;
}

.swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.swatch[aria-checked='true'] {
  box-shadow:
    0 0 0 2px var(--surface),
    0 0 0 4px currentColor;
}

.swatch:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}
</style>
