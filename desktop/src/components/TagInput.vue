<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { freeSuggestions, mergeTags } from '../lib/tags'
import AppIcon from './AppIcon.vue'

const model = defineModel<string[]>({ required: true })
const props = withDefaults(
  defineProps<{ suggestions: string[]; inputId?: string; invalid?: boolean }>(),
  { invalid: false },
)
const { t } = useI18n()
const draft = ref('')
const listId = useId()
const options = computed(() => freeSuggestions(props.suggestions, model.value))

/** Набранный текст становится тегами; запятая разделяет несколько. */
function commit() {
  if (draft.value.trim() === '') return
  model.value = mergeTags(model.value, draft.value)
  draft.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    commit()
  } else if (event.key === 'Backspace' && draft.value === '' && model.value.length > 0) {
    model.value = model.value.slice(0, -1)
  }
}

function remove(tag: string) {
  model.value = model.value.filter((item) => item !== tag)
}
</script>

<template>
  <div :class="['input', 'tags', { invalid }]">
    <span v-for="tag in model" :key="tag" class="tag">
      {{ tag }}
      <button type="button" class="remove" :aria-label="t('tags.remove', { tag })" @click="remove(tag)">
        <AppIcon name="close" :size="12" />
      </button>
    </span>
    <input
      :id="inputId"
      v-model="draft"
      class="entry"
      :list="listId"
      :placeholder="model.length === 0 ? t('tags.add') : ''"
      autocomplete="off"
      spellcheck="false"
      @keydown="onKeydown"
      @change="commit"
    />
    <datalist :id="listId">
      <option v-for="option in options" :key="option" :value="option" />
    </datalist>
  </div>
</template>

<style scoped>
.tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  height: auto;
  min-height: var(--control-h);
  padding: 6px 8px;
  cursor: text;
}

.tags:focus-within {
  border-color: var(--focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 4px 0 10px;
  border-radius: 999px;
  background: var(--muted-bg);
  font-size: 13px;
}

.remove {
  display: inline-flex;
  padding: 3px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
}

.remove:focus-visible {
  outline: 2px solid var(--focus);
}

.entry {
  flex: 1 0 120px;
  min-width: 0;
  height: 28px;
  border: 0;
  outline: 0;
  background: transparent;
}
</style>
