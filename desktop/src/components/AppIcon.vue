<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 18 })
const icon = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    :class="['icon', { filled: icon.filled }]"
    :stroke-width="icon.stroke ?? 1.7"
    v-html="icon.body"
  />
</template>
