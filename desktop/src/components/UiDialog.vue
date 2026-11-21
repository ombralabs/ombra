<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { useI18n } from 'vue-i18n'
import UiButton from './UiButton.vue'

const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{ title: string; description?: string; width?: number; busy?: boolean }>(), {
  width: 520,
  busy: false,
})
const emit = defineEmits<{ openAutoFocus: [event: Event]; closeAutoFocus: [event: Event] }>()
const { t } = useI18n()

/** Пока идёт операция, диалог не закрывается ни Escape, ни щелчком снаружи. */
function keepOpenWhileBusy(event: Event) {
  if (props.busy) event.preventDefault()
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent
        class="dialog-box card"
        :style="{ width: `min(${width}px, calc(100vw - 48px))` }"
        @escape-key-down="keepOpenWhileBusy"
        @pointer-down-outside="keepOpenWhileBusy"
        @interact-outside="keepOpenWhileBusy"
        @open-auto-focus="emit('openAutoFocus', $event)"
        @close-auto-focus="emit('closeAutoFocus', $event)"
      >
        <header class="head">
          <DialogTitle class="section-title">{{ title }}</DialogTitle>
          <DialogClose as-child>
            <UiButton size="icon" variant="ghost" icon="close" :icon-size="16" :disabled="busy" :aria-label="t('common.close')" />
          </DialogClose>
        </header>
        <DialogDescription v-if="description" class="hint">{{ description }}</DialogDescription>
        <div class="body"><slot /></div>
        <footer v-if="$slots.footer" class="foot"><slot name="footer" /></footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.dialog-box {
  gap: 12px;
  max-height: calc(100vh - 48px);
  padding: 20px 24px;
  overflow: hidden;
}

.head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Место для обводки фокуса у полей по краям прокручиваемой формы. */
  margin: -3px;
  padding: 3px;
}

.foot {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.dialog-box > .hint { flex-shrink: 0; }
</style>
