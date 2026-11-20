<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, useId, useTemplateRef} from 'vue';
import {useI18n} from 'vue-i18n';

const hideControls = defineModel<boolean>('hideControls', {required: true});
const showBones = defineModel<boolean>('showBones', {required: true});
const playCurrent = defineModel<boolean>('playCurrent', {required: true});
defineProps<{canPlayCurrent: boolean}>();

const {t} = useI18n();
const panelId = useId();
const open = ref(false);
const root = useTemplateRef<HTMLElement>('root');
const trigger = useTemplateRef<HTMLButtonElement>('trigger');

function closeOutside(target: EventTarget | null) {
  if (open.value && target instanceof Node && !root.value?.contains(target)) open.value = false;
}

function pointerOutside(event: PointerEvent) {
  closeOutside(event.target);
}

function escape(event: KeyboardEvent) {
  if (!open.value) return;
  event.preventDefault();
  event.stopPropagation();
  open.value = false;
  trigger.value?.focus({preventScroll: true});
}

onMounted(() => document.addEventListener('pointerdown', pointerOutside, true));
onBeforeUnmount(() => document.removeEventListener('pointerdown', pointerOutside, true));
</script>

<template>
  <div ref="root" class="relative z-20 ml-auto shrink-0" @keydown.esc="escape" @keydown.space.stop
    @focusout="closeOutside($event.relatedTarget)">
    <button ref="trigger" type="button" class="dock-tab !h-5 !min-h-5 !w-6 justify-center !px-0 !text-[14px]"
      :class="{active: open}" :aria-label="t('previewViewSettings')" :title="t('previewViewSettings')"
      :aria-expanded="open" :aria-controls="open ? panelId : undefined"
      data-testid="preview-view-settings" @click="open = !open">
      <span aria-hidden="true">⚙︎</span>
    </button>
    <div v-if="open" :id="panelId" role="group" :aria-label="t('previewViewSettings')"
      class="preview-view-settings-panel absolute end-0 top-full mt-1 w-40 rounded-sm border border-line bg-panel p-1 shadow-xl"
      data-testid="preview-view-settings-panel">
      <label>
        <input v-model="hideControls" type="checkbox" class="accent-accent" data-testid="preview-hide-controls">
        {{ t('previewHideControls') }}
      </label>
      <label :title="t(canPlayCurrent ? 'previewPlayCurrentHint' : 'previewTracksUnsupported')">
        <input v-model="playCurrent" type="checkbox" class="accent-accent" :disabled="!canPlayCurrent"
          :aria-describedby="`${panelId}-play-current`" data-testid="preview-play-current">
        {{ t('previewPlayCurrent') }}
      </label>
      <span :id="`${panelId}-play-current`" class="sr-only">{{ t(canPlayCurrent ? 'previewPlayCurrentHint' : 'previewTracksUnsupported') }}</span>
      <label>
        <input v-model="showBones" type="checkbox" class="accent-accent" data-testid="preview-show-bones">
        {{ t('previewShowBones') }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.preview-view-settings-panel label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  padding: 2px 4px;
  border-radius: 2px;
}

.preview-view-settings-panel label:has(input:enabled) {
  cursor: pointer;
}

.preview-view-settings-panel label:has(input:enabled):hover {
  background: var(--color-raised);
}

.preview-view-settings-panel input {
  flex: none;
}
</style>
