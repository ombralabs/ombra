<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <div class="brand">
    <img class="mark" src="/branding/ombra-c.svg" width="26" height="26" alt="" aria-hidden="true" />
    <span :class="compact ? 'sr-only' : 'word'">Ombra</span>
  </div>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 8px;
}

.mark {
  flex-shrink: 0;
}

.word {
  font-family: var(--font-brand);
  font-size: 23px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--sidebar-strong);
}
</style>
