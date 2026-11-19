<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger'
    size?: 'md' | 'sm' | 'icon'
    icon?: IconName
    iconSize?: number
    /** Идёт операция этой кнопки: крутилка, кнопка занята. */
    loading?: boolean
    /** Идёт другая операция: кнопка занята, без крутилки. */
    busy?: boolean
    /** Действие недоступно по смыслу (пустое поле, ничего не выбрано). */
    disabled?: boolean
  }>(),
  { variant: 'secondary', size: 'md', iconSize: 18, loading: false, busy: false, disabled: false },
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()

/**
 * Занятая кнопка не получает `disabled`: в WKWebView кнопка с фокусом, ставшая `disabled`, отдаёт фокус `<body>`,
 * и следующий Tab начинается с начала страницы. Вместо этого — `aria-disabled`, а щелчок не уходит родителю.
 */
function onClick(event: MouseEvent) {
  if (props.loading || props.busy) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    :class="['btn', variant, size === 'icon' ? 'square' : size]"
    :disabled="disabled"
    :aria-disabled="loading || busy || undefined"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <AppIcon v-if="loading" name="spinner" :size="iconSize" class="spin" />
    <AppIcon v-else-if="icon" :name="icon" :size="iconSize" />
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  height: var(--control-h);
  padding: 0 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.btn:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.btn:disabled,
.btn[aria-disabled='true'] {
  cursor: default;
}

/* Неактивная и занятая без крутилки — приглушены; с крутилкой (`aria-busy`) крутилка видна как есть. */
.btn:disabled,
.btn[aria-disabled='true']:not([aria-busy='true']) {
  opacity: 0.55;
}

/* Неактивная вторичная кнопка — как на холсте: фон страницы, рамка карточки, без прозрачности. */
.secondary:disabled,
.secondary[aria-disabled='true']:not([aria-busy='true']) {
  border-color: var(--disabled-border);
  background: var(--disabled-bg);
  color: var(--text-2);
  opacity: 1;
}

.primary {
  padding: 0 16px;
  border-color: var(--accent);
  background: var(--accent);
  color: var(--text-inverse);
  font-weight: 600;
}

.secondary:not(:disabled):not([aria-disabled='true']):hover,
.ghost:not(:disabled):not([aria-disabled='true']):hover {
  background: var(--muted-bg);
}

.primary:not(:disabled):not([aria-disabled='true']):hover {
  border-color: var(--accent-hover);
  background: var(--accent-hover);
}

.soft {
  border-color: transparent;
  background: var(--accent-soft);
  color: var(--accent-ink);
}

.ghost {
  border-color: transparent;
  background: transparent;
  color: var(--text-2);
}

.danger {
  border-color: var(--danger-border);
  color: var(--danger-text);
  font-weight: 600;
}

.sm {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
}

/* Квадратная кнопка с одной иконкой; класс не `.icon`, чтобы не смешаться с глобальным классом значков. */
.square {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
}
</style>
