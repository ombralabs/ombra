<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { GroupView } from '../api/types'

defineProps<{ group: GroupView | null }>()
const { t } = useI18n()
</script>

<template>
  <span v-if="group" class="chip" :style="{ background: `${group.color}1f` }" :title="group.name">
    <span class="dot dot-sm" :style="{ background: group.color }" />
    <span class="name">{{ group.name }}</span>
  </span>
  <span v-else class="none">{{ t('common.ungrouped') }}</span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  max-width: 100%;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.none {
  font-size: 13px;
  color: var(--text-2);
}
</style>
