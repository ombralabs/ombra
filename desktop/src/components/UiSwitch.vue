<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

const model = defineModel<boolean>({ required: true })
withDefaults(defineProps<{ label: string; disabled?: boolean }>(), { disabled: false })
</script>

<template>
  <SwitchRoot v-model="model" :disabled="disabled" :aria-label="label" class="switch">
    <SwitchThumb class="thumb" />
  </SwitchRoot>
</template>

<style scoped>
.switch {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  padding: 3px;
  border: 0;
  border-radius: 999px;
  background: var(--switch-off);
  cursor: pointer;
}

.switch[data-state='checked'] {
  justify-content: flex-end;
  background: var(--switch-on);
}

.switch[data-disabled] {
  cursor: default;
  opacity: 0.5;
}

/* Занят запросом: вид неактивного, но фокус остаётся (атрибут `disabled` увёл бы его в WKWebView). */
.switch[aria-disabled='true'] {
  cursor: default;
  opacity: 0.5;
}

.switch:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.thumb {
  display: block;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface);
}
</style>
