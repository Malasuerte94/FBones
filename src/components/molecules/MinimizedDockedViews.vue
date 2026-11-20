<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { DockPanelId } from '../../domain/dockLayout';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';

defineProps<{ panels: readonly { id: DockPanelId; title: string }[]; disabled?: boolean }>();
const emit = defineEmits<{ restore: [id: DockPanelId] }>();
const { t } = useI18n();
const icons = {
  tree: 'tree',
  weights: 'weights',
  mesh: 'mesh',
  properties: 'filter',
  preview: 'eye',
  ik: 'ik',
  transform: 'transform',
  physics: 'physics',
  curves: 'chevron',
} as const satisfies Record<DockPanelId, string>;
</script>

<template>
  <div v-if="panels.length" class="flex shrink-0 items-center gap-px" role="group"
    :aria-label="t('minimizedPanels')" data-testid="minimized-docked-views">
    <AppButton v-for="panel in panels" :key="panel.id" variant="ghost"
      class="size-6 p-0! focus-visible:outline focus-visible:outline-accent" :disabled="disabled"
      :aria-label="t('restorePanel', { name: panel.title })" :title="t('restorePanel', { name: panel.title })"
      :id="`restore-dock-${panel.id}`" :data-testid="`restore-dock-${panel.id}`" @mousedown.prevent @keydown.space.stop
      @click="!disabled && emit('restore', panel.id)">
      <AppIcon :name="icons[panel.id]" class="size-3.5!"/>
    </AppButton>
  </div>
</template>
