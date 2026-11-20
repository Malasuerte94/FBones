<script setup lang="ts">
import { nextTick, ref, shallowRef, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../atoms/AppIcon.vue';

const props = defineProps<{ hideSkeletonNames: boolean; supported: boolean; disabled?: boolean }>();
const emit = defineEmits<{ 'update:hideSkeletonNames': [value: boolean] }>();
const { t } = useI18n();
const menuId = useId();
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const popup = ref<HTMLElement>();
const hideNames = ref<HTMLInputElement>();
const open = ref(false);
const position = shallowRef({ left: '0px', top: '0px', width: '256px', maxHeight: 'calc(100vh - 16px)' });
const unavailable = [
  ['show-slot-folders-under-bones', 'treeShowSlotFoldersUnderBones'],
  ['show-slot-paths', 'treeShowSlotPaths'],
  ['show-all-skin-attachments', 'treeShowAllSkinAttachments'],
  ['hide-skin-names', 'treeHideSkinNames'],
  ['hide-skin-bones-and-constraints', 'treeHideSkinBonesAndConstraints'],
  ['hide-viewport-skin-bones', 'treeHideViewportSkinBones'],
] as const;

function reposition(event?: Event) {
  if (!open.value || !trigger.value || !popup.value || event?.target === popup.value) return;
  const bounds = trigger.value.getBoundingClientRect();
  if (!bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= window.innerHeight ||
    bounds.right <= 0 || bounds.left >= window.innerWidth) { close(); return; }
  const margin = 8, gap = 4;
  const width = Math.max(0, Math.min(256, window.innerWidth - 2 * margin));
  popup.value.style.width = `${width}px`;
  const above = Math.max(0, bounds.top - margin - gap);
  const below = Math.max(0, window.innerHeight - bounds.bottom - margin - gap);
  const contentHeight = popup.value.scrollHeight + 2;
  const placeBelow = below >= contentHeight || below >= above;
  const room = placeBelow ? below : above;
  const top = placeBelow ? bounds.bottom + gap : bounds.top - gap - Math.min(room, contentHeight);
  position.value = {
    left: `${Math.max(margin, Math.min(bounds.right - width, window.innerWidth - width - margin))}px`,
    top: `${Math.max(margin, top)}px`,
    width: `${width}px`,
    maxHeight: `${room}px`,
  };
}

function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus({ preventScroll: true });
}

async function toggle() {
  if (props.disabled) return;
  if (open.value) { close(true); return; }
  open.value = true;
  await nextTick();
  if (!open.value) return;
  reposition();
  if (open.value) (props.supported ? hideNames.value : popup.value)?.focus({ preventScroll: true });
}

function updateHideNames(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!props.disabled && props.supported) emit('update:hideSkeletonNames', input.checked);
  void nextTick(() => { input.checked = props.hideSkeletonNames; });
}

function closeOutside(event: Event) {
  if (event.target instanceof Node && !root.value?.contains(event.target)) close();
}

function focusLeavesPopup(event: FocusEvent) {
  if (event.relatedTarget === trigger.value && popup.value?.contains(event.target as Node)) close();
}

function escape(event: KeyboardEvent) {
  if (!open.value) return;
  event.preventDefault();
  event.stopPropagation();
  close(true);
}

watch(() => props.disabled, disabled => { if (disabled) close(); }, { flush: 'sync' });
watch(open, (active, _, onCleanup) => {
  if (!active) return;
  document.addEventListener('pointerdown', closeOutside, true);
  document.addEventListener('focusin', closeOutside);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  onCleanup(() => {
    document.removeEventListener('pointerdown', closeOutside, true);
    document.removeEventListener('focusin', closeOutside);
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
  });
}, { flush: 'sync' });
</script>

<template>
  <div ref="root" class="shrink-0" @focusout="focusLeavesPopup" @keydown.esc="escape" @keydown.space.stop>
    <button ref="trigger" type="button" class="dock-tab size-6 px-0!" :class="{ active: open }"
      :disabled="disabled" :aria-expanded="open" :aria-controls="open ? menuId : undefined"
      :aria-label="t('treeViewSettings')" :title="t('treeViewSettings')" data-testid="tree-view-settings"
      @mousedown.prevent @click="toggle"><AppIcon name="treeViewSettings" class="size-3.5!"/></button>
    <div v-if="open" :id="menuId" ref="popup" tabindex="-1" role="group" :aria-labelledby="`${menuId}-title`"
      data-testid="tree-view-settings-menu" class="fixed z-80 overflow-y-auto overscroll-contain rounded-md border border-line bg-panel p-2 text-xs shadow-xl"
      :style="position" @keydown.f3.stop.prevent>
      <h2 :id="`${menuId}-title`" class="mb-2 font-medium text-ink">{{ t('treeViewSettings') }}</h2>
      <label class="flex items-center gap-1.5 pb-2" :class="{ 'text-muted': !supported }"
        :title="t(supported ? 'treeHideSkeletonNamesHint' : 'treeViewSettingsUnavailable')">
        <input ref="hideNames" type="checkbox" class="shrink-0" :checked="hideSkeletonNames" :disabled="!supported"
          :aria-description="t(supported ? 'treeHideSkeletonNamesHint' : 'treeViewSettingsUnavailable')"
          data-testid="tree-hide-skeleton-names" @change="updateHideNames">
        <span>{{ t('treeHideSkeletonNames') }}</span>
      </label>
      <fieldset class="grid gap-y-1.5 border-t border-line pt-2 text-muted" :aria-describedby="`${menuId}-unavailable`">
        <legend class="px-0.5 text-[10px]">{{ t('treeViewSettingsAdvanced') }}</legend>
        <p :id="`${menuId}-unavailable`" class="text-[10px]">{{ t('treeViewSettingsUnavailable') }}</p>
        <label v-for="[id, label] in unavailable" :key="id" class="flex min-w-0 items-start gap-1.5">
          <input type="checkbox" disabled class="mt-0.5 shrink-0" :data-testid="`tree-view-settings-${id}`">
          <span>{{ t(label) }}</span>
        </label>
      </fieldset>
    </div>
  </div>
</template>
