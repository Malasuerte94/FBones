<script setup lang="ts" generic="Category extends string">
import {useId} from 'vue';
import {useI18n} from 'vue-i18n';
import AppIcon from '../atoms/AppIcon.vue';

type RowFilterMode = 'categories' | 'current-tool';

defineProps<{
  id: string;
  options: readonly {id: Category; label: string; checked: boolean}[];
  mode: RowFilterMode;
  canUseCurrentTool: boolean;
  canReset: boolean;
}>();

const emit = defineEmits<{
  mode: [mode: RowFilterMode];
  category: [id: Category, additive: boolean];
  reset: [];
  close: [];
}>();
const {t} = useI18n();
const hint = useId();
</script>

<template>
  <div :id="id" class="timeline-row-filters" role="group" :aria-label="t('animation_rowFilterPanel')"
    data-testid="timeline-row-filters" @keydown.space.stop @keydown.esc.stop.prevent="emit('close')">
    <button type="button" data-testid="timeline-row-filter-current-tool"
      class="timeline-row-current-tool"
      :disabled="!canUseCurrentTool" :class="{active:mode==='current-tool'}" :aria-pressed="mode==='current-tool'"
      @click="emit('mode',mode==='current-tool' ? 'categories' : 'current-tool')">{{ t('animation_rowFilterCurrentTool') }}</button>
    <div class="timeline-row-categories" role="group" :aria-label="t('animation_rowFilterProperties')" :aria-describedby="hint">
      <span :id="hint" class="sr-only">{{ t('animation_rowFilterCombine') }}</span>
      <button v-for="option in options" :key="option.id" type="button" class="timeline-row-category"
        :class="{active:mode==='categories' && option.checked}" :aria-pressed="mode==='categories' && option.checked"
        :title="t('animation_rowFilterCombine')" :data-testid="'timeline-row-filter-'+option.id"
        @click="emit('category',option.id,$event.ctrlKey || $event.metaKey || $event.shiftKey)">
        <span class="timeline-row-category-check" aria-hidden="true">✓</span>{{ option.label }}
      </button>
    </div>
    <div class="timeline-row-filter-actions">
      <button type="button" :disabled="!canReset" data-testid="timeline-row-filter-reset" @click="emit('reset')">{{ t('animation_rowFilterReset') }}</button>
      <button type="button" :aria-label="t('animation_rowFilterClose')" :title="t('animation_rowFilterClose')"
        class="timeline-row-filter-close" data-testid="timeline-row-filter-close" @click="emit('close')">
        <AppIcon name="close" class="!size-3.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.timeline-row-filters {
  display: grid;
  grid-template: "tool . actions" "properties properties properties" / max-content minmax(0, 1fr) max-content;
  flex: 0 0 auto;
  gap: 3px 7px;
  min-width: 0;
  padding: 3px 6px;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-panel);
}

.timeline-row-categories,
.timeline-row-filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.timeline-row-categories {
  grid-area: properties;
  min-width: 0;
}

.timeline-row-current-tool {
  grid-area: tool;
}

.timeline-row-filter-actions {
  grid-area: actions;
}

.timeline-row-filters button {
  height: 22px;
}

.timeline-row-filters button.timeline-row-category {
  gap: 2px;
  border-radius: 11px;
  padding-inline: 5px 7px;
}

.timeline-row-category-check {
  visibility: hidden;
}

.timeline-row-category.active .timeline-row-category-check {
  visibility: visible;
}

.timeline-row-filters button.timeline-row-filter-close {
  width: 22px;
  padding: 0;
}

.timeline-row-filters button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
</style>
