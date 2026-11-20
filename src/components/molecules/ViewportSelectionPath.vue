<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ViewportSelectionPathItem } from '../../domain/selectionHierarchy';
import AppIcon from '../atoms/AppIcon.vue';

const props = defineProps<{ items: readonly ViewportSelectionPathItem[] }>();
const { t } = useI18n();
const icons = { bone: 'bone', slot: 'tree', region: 'image', mesh: 'mesh', clipping: 'grid', path: 'curve' } as const;
const earlierItems = computed(() => props.items.slice(0, -2));
const nearestItem = computed(() => props.items.at(-2));
const leaf = computed(() => props.items.at(-1));
const fullPath = computed(() => props.items.map(item => item.name).join(' › '));
</script>

<template>
  <div v-if="leaf" class="pointer-events-none! flex w-full min-w-0 basis-full justify-center"
    role="group" :aria-label="t('viewportSelectionPath')" :aria-description="fullPath" :title="fullPath"
    data-testid="viewport-selection-path">
    <div aria-hidden="true"
      class="flex max-w-full min-w-0 items-center gap-1 rounded-sm border border-line bg-shell px-2 py-0.5 text-[11px] leading-4">
      <span v-if="earlierItems.length" class="flex min-w-0 shrink-[4] justify-end overflow-hidden">
        <span class="flex shrink-0 items-center gap-1">
          <template v-for="item in earlierItems" :key="`${item.kind}-${item.id}`">
            <span class="max-w-36 truncate text-muted" data-testid="viewport-selection-path-item"
              :data-kind="item.kind" :data-selection-id="item.id">{{ item.name }}</span>
            <span class="text-muted">›</span>
          </template>
        </span>
      </span>
      <template v-if="nearestItem">
        <span class="max-w-[35%] min-w-0 truncate text-ink" data-testid="viewport-selection-path-item"
          :data-kind="nearestItem.kind" :data-selection-id="nearestItem.id">{{ nearestItem.name }}</span>
        <span class="shrink-0 text-muted">›</span>
      </template>
      <span class="flex min-w-0 items-center gap-1 font-medium text-accent" :class="nearestItem ? 'max-w-[60%]' : 'max-w-full'"
        data-testid="viewport-selection-path-leaf" :data-kind="leaf.kind" :data-selection-id="leaf.id">
        <AppIcon :name="icons[leaf.kind]" class="!size-3" />
        <span class="truncate">{{ leaf.name }}</span>
      </span>
    </div>
  </div>
</template>
