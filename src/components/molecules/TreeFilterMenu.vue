<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TreeFilterState } from '../../domain/treeProjection';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';

const props = defineProps<{
  selected: Readonly<TreeFilterState>;
  bypassed: boolean;
  textFilters: boolean;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  setType: [kind: keyof TreeFilterState, value: boolean];
  toggleBypass: [];
  reset: [];
  setTextFilters: [value: boolean];
}>();
const { t } = useI18n();
const menuId = useId();
const open = ref(false);
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const popup = ref<HTMLElement>();
const position = shallowRef({ left: '0px', top: '0px', width: '236px', maxHeight: 'calc(100vh - 16px)' });
const types = [
  ['bone', 'treeFilterBones'], ['slot', 'treeFilterSlots'],
  ['attachment', 'treeFilterAttachments'], ['constraint', 'treeFilterConstraints'],
] as const;
const additionalTypes = [
  ['region', 'treeFilterRegion'], ['mesh', 'treeFilterMesh'], ['linked-mesh', 'treeFilterLinkedMesh'],
  ['clipping', 'treeFilterClipping'], ['bounding-box', 'treeFilterBoundingBox'],
  ['path', 'treeFilterPath'], ['point', 'treeFilterPoint'],
] as const;
const restricted = computed(() => types.some(([kind]) => !props.selected[kind]));
const filterState = computed(() => props.bypassed ? t('treeFilterBypassed') : restricted.value ? t('treeFilterActive') : '');

function reposition(event?: Event) {
  if (!open.value || !trigger.value || !popup.value || event?.target === popup.value) return;
  const bounds = trigger.value.getBoundingClientRect();
  const margin = 8, gap = 4;
  const width = Math.max(0, Math.min(236, window.innerWidth - 2 * margin));
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

async function toggleMenu() {
  if (props.disabled) return;
  if (open.value) { close(true); return; }
  open.value = true;
  await nextTick();
  if (!open.value) return;
  reposition();
  popup.value?.querySelector<HTMLElement>('input:not(:disabled)')?.focus({ preventScroll: true });
}

function toggleBypass() {
  if (!props.disabled) emit('toggleBypass');
}

function updateCheckbox(event: Event, apply: (value: boolean) => void, current: () => boolean) {
  const input = event.target as HTMLInputElement;
  apply(input.checked);
  // A held viewport interaction can reject the change without publishing props.
  void nextTick(() => { input.checked = current(); });
}

function closeOutside(event: Event) {
  if (event.target instanceof Node && !root.value?.contains(event.target)) close();
}

function focusLeavesMenu(event: FocusEvent) {
  if (event.relatedTarget === trigger.value && popup.value?.contains(event.target as Node)) close();
}

function escapeMenu(event: KeyboardEvent) {
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
  <div ref="root" class="shrink-0" @focusout="focusLeavesMenu" @keydown.esc="escapeMenu" @keydown.space.stop>
    <button ref="trigger" type="button" class="dock-tab relative px-1!" :class="{
      'text-accent': restricted && !bypassed,
      'text-warning': bypassed,
      active: open,
    }" :disabled="disabled" :aria-expanded="open" :aria-controls="open ? menuId : undefined"
      :aria-label="t('treeFilters')" :aria-description="filterState || undefined"
      :title="[t('treeFilters'), filterState, t('treeFilterMenuHint')].filter(Boolean).join(' · ')"
      data-testid="tree-filter-menu-trigger" @mousedown.prevent @click="toggleMenu" @contextmenu.prevent.stop="toggleBypass">
      <AppIcon name="filter" class="size-3.5!"/>
      <span v-if="bypassed" class="absolute top-1/2 h-px w-4.5 -rotate-45 bg-current" aria-hidden="true"/>
      <span v-else-if="restricted" class="absolute right-0.5 bottom-0.5 size-1 rounded-full bg-current" aria-hidden="true"/>
    </button>
    <div v-if="open" :id="menuId" ref="popup" role="group" :aria-labelledby="`${menuId}-title`"
      data-testid="tree-filter-menu" class="fixed z-80 overflow-y-auto overscroll-contain rounded-md border border-line bg-panel p-2 text-xs shadow-xl"
      :style="position" @keydown.f3.stop.prevent>
      <div class="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 :id="`${menuId}-title`" class="font-medium text-ink">{{ t('treeFilters') }}</h2>
        <span v-if="bypassed" class="text-[10px] text-warning" role="status">{{ t('treeFilterBypassed') }}</span>
      </div>
      <fieldset class="grid min-w-0 grid-cols-2 gap-x-2 gap-y-1.5 border-y border-line py-2">
        <legend class="px-0.5 text-[10px] text-muted">{{ t('treeFilterObjectTypes') }}</legend>
        <label v-for="[kind, label] in types" :key="kind" class="flex min-w-0 items-start gap-1.5">
          <input type="checkbox" class="mt-0.5 shrink-0" :checked="selected[kind]" :data-testid="`tree-filter-menu-${kind}`"
            @change="updateCheckbox($event, value => emit('setType', kind, value), () => selected[kind])">
          <span class="min-w-0 break-words">{{ t(label) }}</span>
        </label>
      </fieldset>
      <label class="flex min-w-0 items-center gap-1.5 py-2">
        <input type="checkbox" class="shrink-0" :checked="textFilters" data-testid="tree-filter-text-search"
          @change="updateCheckbox($event, value => emit('setTextFilters', value), () => textFilters)">
        <span class="min-w-0 break-words">{{ t('treeFilterTextSearch') }}</span>
      </label>
      <fieldset class="grid min-w-0 grid-cols-2 gap-x-2 gap-y-1.5 border-y border-line py-2 text-muted">
        <legend class="px-0.5 text-[10px]">{{ t('treeFilterAdditionalTypes') }}</legend>
        <label v-for="[kind, label] in additionalTypes" :key="kind" class="flex min-w-0 items-start gap-1.5"
          :title="t('treeFilterUnavailable')">
          <input type="checkbox" class="mt-0.5 shrink-0" disabled :aria-description="t('treeFilterUnavailable')"
            :data-testid="`tree-filter-menu-${kind}`">
          <span class="min-w-0 break-words">{{ t(label) }}</span>
        </label>
      </fieldset>
      <div class="mt-2 flex flex-wrap justify-between gap-1">
        <AppButton :aria-pressed="bypassed" :class="{ 'border-accent!': bypassed }"
          data-testid="tree-filter-bypass" @click="toggleBypass">{{ t('treeFilterBypass') }}</AppButton>
        <AppButton variant="ghost" data-testid="tree-filter-reset" @click="emit('reset')">{{ t('treeFilterResetTypes') }}</AppButton>
      </div>
    </div>
  </div>
</template>
