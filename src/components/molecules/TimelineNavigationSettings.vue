<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, useId, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import type {TimelineNavigationOptions, TimelineView} from '../../domain/timelineNavigation';

const props = defineProps<{
  view: TimelineView;
  options: TimelineNavigationOptions;
}>();

const emit = defineEmits<{
  update: [option: keyof TimelineNavigationOptions, enabled: boolean];
}>();

const {t} = useI18n();
const optionsList = [
  {key: 'showToolbar', label: 'animation_showToolbar', id: 'timeline-show-toolbar'},
  {key: 'showRows', label: 'animation_showRows', id: 'timeline-show-rows'},
  {key: 'jumpToKey', label: 'animation_jumpToKey', id: 'timeline-jump-to-key'},
  {key: 'jumpToFrame', label: 'animation_jumpToFrame', id: 'timeline-jump-to-frame'},
  {key: 'boxSelectPause', label: 'animation_boxSelectPause', id: 'timeline-box-select-pause', view: 'dopesheet'},
] as const;
const panelId = useId();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);

function closeOnOutside(target: EventTarget | null) {
  if (open.value && target instanceof Node && !root.value?.contains(target)) open.value = false;
}

function pointerOutside(event: PointerEvent) {
  closeOnOutside(event.target);
}

function escape(event: KeyboardEvent) {
  if (!open.value) return;
  event.stopPropagation();
  event.preventDefault();
  open.value = false;
  trigger.value?.focus({preventScroll: true});
}

watch(() => props.view, () => {open.value = false;});
onMounted(() => document.addEventListener('pointerdown', pointerOutside, true));
onBeforeUnmount(() => document.removeEventListener('pointerdown', pointerOutside, true));
</script>

<template>
  <div ref="root" class="timeline-navigation-settings" @keydown.esc="escape" @keydown.space.stop
    @focusout="closeOnOutside($event.relatedTarget)">
    <button ref="trigger" class="timeline-navigation-trigger" :class="{active: open}" type="button"
      :aria-label="t('animation_navigationSettings')" :title="t('animation_navigationSettings')"
      :aria-expanded="open" :aria-controls="open ? panelId : undefined"
      data-testid="timeline-navigation-settings" @click="open=!open">
      <span aria-hidden="true">⚙︎</span>
    </button>
    <div v-if="open" :id="panelId" class="timeline-navigation-panel" role="group"
      :aria-label="t(view==='graph' ? 'animation_graphSettings' : 'animation_dopesheetSettings')"
      data-testid="timeline-navigation-settings-panel">
      <template v-for="item in optionsList" :key="item.key">
        <label v-if="!('view' in item) || item.view === view">
          <input type="checkbox" :checked="options[item.key]" :data-testid="item.id"
            @change="emit('update',item.key,($event.target as HTMLInputElement).checked)" />
          {{t(item.label)}}
        </label>
      </template>
    </div>
  </div>
</template>

<style scoped>
.timeline-navigation-settings {
  position: relative;
  z-index: 12;
  flex: none;
  align-self: center;
}

.timeline-navigation-settings button.timeline-navigation-trigger {
  width: 24px;
  height: 22px;
  padding: 0;
  font-size: 15px;
}

.timeline-navigation-panel {
  position: absolute;
  inset-block-start: calc(100% + 3px);
  inset-inline-end: 0;
  min-width: 142px;
  padding: 4px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-panel);
  box-shadow: 0 4px 10px #0006;
}

.timeline-navigation-panel label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 23px;
  padding: 2px 5px;
  border-radius: 2px;
  white-space: nowrap;
  cursor: pointer;
}

.timeline-navigation-panel label:hover {
  background: var(--color-raised);
}

.timeline-navigation-panel label:nth-child(3) {
  margin-top: 4px;
  border-top: 1px solid var(--color-line);
}

.timeline-navigation-panel input[type='checkbox'] {
  width: 13px;
  height: 13px;
  margin: 0;
  padding: 0;
  accent-color: var(--color-accent);
}

.timeline-navigation-settings :is(button,input):focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 0;
}
</style>
