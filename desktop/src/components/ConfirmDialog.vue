<script setup lang="ts">
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from './UiButton.vue'

const { t } = useI18n()
const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(
  defineProps<{
    title: string
    description: string
    confirmLabel: string
    danger?: boolean
    busy?: boolean
    /** Фокус на подтверждении (по умолчанию Reka ставит его на «Отмену»). */
    focusConfirm?: boolean
  }>(),
  { danger: false, busy: false, focusConfirm: false },
)
const emit = defineEmits<{ confirm: [] }>()
const confirmButton = ref<{ $el: HTMLElement } | null>(null)

function onOpenFocus(event: Event) {
  if (!props.focusConfirm) return
  event.preventDefault()
  confirmButton.value?.$el.focus()
}

/** Пока профили останавливаются, диалог не закрывается ни Escape, ни кликом снаружи. */
function keepOpenWhileBusy(event: Event) {
  if (props.busy) event.preventDefault()
}
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="dialog-overlay" />
      <AlertDialogContent class="dialog-box card" @open-auto-focus="onOpenFocus" @escape-key-down="keepOpenWhileBusy" @pointer-down-outside="keepOpenWhileBusy" @interact-outside="keepOpenWhileBusy">
        <AlertDialogTitle class="section-title">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="hint">{{ description }}</AlertDialogDescription>
        <div class="actions">
          <AlertDialogCancel as-child>
            <UiButton :disabled="busy">{{ t('common.cancel') }}</UiButton>
          </AlertDialogCancel>
          <UiButton ref="confirmButton" :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="emit('confirm')">
            {{ confirmLabel }}
          </UiButton>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<style scoped>
.dialog-box {
  gap: 10px;
  width: min(440px, calc(100vw - 48px));
  padding: 22px 24px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
