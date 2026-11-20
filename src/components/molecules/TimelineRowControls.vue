<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import AppIcon from '../atoms/AppIcon.vue';
import type {TimelineSyncMode} from '../../domain/dopesheetSync';

const syncChoices = {
  off: {label: 'animation_rowSyncOff', marker: ''},
  'graph-to-dopesheet': {label: 'animation_rowSyncFromGraph', marker: 'G→D'},
  'dopesheet-to-graph': {label: 'animation_rowSyncFromDopesheet', marker: 'D→G'},
} as const satisfies Record<TimelineSyncMode,{label:string;marker:string}>;

defineProps<{
  syncMode?: TimelineSyncMode;
  canSync?: boolean;
  scopeDriven?: boolean;
  locked: boolean;
  canLock: boolean;
  canRefresh: boolean;
  canSelect: boolean;
  canKeyShown: boolean;
  keyShownShortcut?: 'Control+Shift+L' | 'Meta+Shift+L';
  filterOpen: boolean;
  filterActive: boolean;
  filterPanelId: string;
}>();

const emit = defineEmits<{
  setSyncMode: [mode: TimelineSyncMode];
  toggleFilter: [];
  toggleFiltering: [];
  toggleLock: [];
  refresh: [];
  select: [];
  keyShown: [];
}>();
const {t} = useI18n();
</script>

<template>
  <div class="at-tool-group" role="group" :aria-label="t('animation_rowControls')" @keydown.space.stop>
    <label v-if="syncMode !== undefined" class="sync-control" :class="{active: syncMode !== 'off'}">
      <span aria-hidden="true" class="sync-caption">
        {{ t('animation_rowSync') }} <span v-if="syncMode !== 'off'">{{ syncChoices[syncMode].marker }}</span>
        <span class="sync-chevron">⌄</span>
      </span>
      <select class="sync-select" data-testid="timeline-sync" :aria-label="t('animation_rowSync')"
        :title="t('animation_rowSync') + ' · ' + t(syncChoices[syncMode].label)" :value="syncMode" :disabled="canSync === false"
        @change="emit('setSyncMode', ($event.target as HTMLSelectElement).value as TimelineSyncMode)">
        <option v-for="(choice, mode) in syncChoices" :key="mode" :value="mode">{{ t(choice.label) }}</option>
      </select>
    </label>
    <template v-if="!scopeDriven && syncMode !== 'graph-to-dopesheet'">
      <button type="button" class="timeline-row-control" :class="{active:filterOpen}"
        :aria-label="t('animation_rowFilter')" :title="t('animation_rowFilter')"
        :aria-expanded="filterOpen" :aria-controls="filterOpen ? filterPanelId : undefined"
        :aria-description="filterActive ? t('animation_rowFilterActive') : undefined"
        data-testid="timeline-row-filter" @click="emit('toggleFilter')" @contextmenu.prevent="emit('toggleFiltering')">
        <AppIcon name="filter" class="!size-3.5" />
        <span v-if="filterActive" class="filter-indicator" aria-hidden="true" />
      </button>
      <button type="button" class="timeline-row-control" :class="{active:locked}"
        :aria-label="t('animation_rowLock')" :title="t('animation_rowLock')" :aria-pressed="locked" :disabled="!canLock"
        data-testid="timeline-row-lock" @click="emit('toggleLock')">
        <AppIcon :name="locked ? 'lock' : 'unlock'" class="!size-3.5" />
      </button>
      <button type="button" class="timeline-row-control" :disabled="!canRefresh"
        :aria-label="t('animation_rowRefresh')" :title="t('animation_rowRefresh')"
        data-testid="timeline-row-refresh" @click="emit('refresh')">
        <AppIcon name="refresh" class="!size-3.5" />
      </button>
    </template>
    <button type="button" class="timeline-row-control" :disabled="!canSelect"
      :aria-label="t('animation_rowSelect')" :title="t('animation_rowSelect')"
      data-testid="timeline-row-select" @click="emit('select')">
      <AppIcon name="bone" class="!size-3.5" />
    </button>
    <button type="button" class="timeline-row-control timeline-key-shown" :disabled="!canKeyShown"
      :aria-label="t('animation_rowKeyShown')" :aria-description="t('animation_rowKeyShownScope')"
      :aria-keyshortcuts="keyShownShortcut"
      :title="keyShownShortcut ? t('animation_rowKeyShownWithShortcut',{shortcut:keyShownShortcut==='Meta+Shift+L'?'Cmd+Shift+L':'Ctrl+Shift+L'}) : t('animation_rowKeyShown')"
      data-testid="timeline-row-key-shown" @click="emit('keyShown')">
      <AppIcon name="key" class="!size-3.5" />
    </button>
  </div>
</template>

<style scoped>
.sync-control {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  min-width: 72px;
  height: 24px;
  padding-inline: 4px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  background: var(--color-raised);
  white-space: nowrap;
}

.sync-control:hover:not(:has(:disabled)) {
  border-color: var(--color-muted);
}

.sync-control.active {
  border-color: var(--color-accent);
  background: var(--color-accent-deep);
}

.sync-control:has(:disabled) {
  opacity: .55;
}

.sync-caption {
  pointer-events: none;
}

.sync-chevron {
  color: var(--color-muted);
}

.sync-control .sync-select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  appearance: none;
  border: 0;
  background: transparent;
  color: transparent;
  cursor: pointer;
}

.sync-control .sync-select option {
  background: var(--color-panel);
  color: var(--color-ink);
}

button.timeline-row-control {
  position: relative;
  width: 24px;
  padding: 0;
}

button.timeline-key-shown:not(:disabled) {
  color: var(--color-motion);
}

.filter-indicator {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-warning);
}
</style>
