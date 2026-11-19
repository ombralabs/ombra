<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'
defineProps<{ text?: string }>()
</script>

<template>
  <TooltipProvider v-if="text" :delay-duration="350">
    <TooltipRoot>
      <TooltipTrigger as-child><slot /></TooltipTrigger>
      <TooltipPortal><TooltipContent side="right" :side-offset="10" class="nav-tooltip">{{ text }}</TooltipContent></TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
  <slot v-else />
</template>

<style scoped>
.nav-tooltip { z-index: 100; max-width: 280px; padding: 8px 12px; border-radius: var(--radius-control); background: var(--text); color: var(--text-inverse); font-size: 13px; line-height: 20px; box-shadow: 0 4px 12px color-mix(in srgb, var(--text) 16%, transparent); }
</style>
