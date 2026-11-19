<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ text: string }>()
const { t } = useI18n()
</script>

<template>
  <details class="details hint">
    <summary>{{ t('common.details') }}</summary>
    <p>{{ text }}</p>
  </details>
</template>

<style scoped>
.details { min-width: 0; overflow-wrap: anywhere; }
.details summary { cursor: pointer; width: fit-content; padding: 4px 0; }
.details summary:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.details p { margin: 4px 0 0; white-space: pre-line; }
</style>
