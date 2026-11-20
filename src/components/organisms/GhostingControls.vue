<script setup lang="ts">
import {computed, nextTick, reactive, ref, useId, useTemplateRef} from 'vue';
import {useI18n} from 'vue-i18n';
import {GHOST_FRAME_RANGE, GHOST_FRAME_STEP, GHOST_MOTION_THRESHOLD_LIMIT, GHOST_OFFSET_LIMIT} from '../../domain/ghosting';
import {useWorkspace} from '../../stores/workspace';
import AppIcon from '../atoms/AppIcon.vue';
import NumericSliderRow from '../molecules/NumericSliderRow.vue';

const w = useWorkspace();
const {t} = useI18n();
const open = ref(false);
const toggle = useTemplateRef<HTMLButtonElement>('toggle');
const id = useId();
const drafts = reactive<Record<string, string>>({});

const ranges = [
  {key: 'frames', id: 'frames', label: 'ghostingFrames'},
  {key: 'keyFrames', id: 'key-frames', label: 'ghostingKeyFrames'},
] as const;
const sides = [
  {value: 'before', enabled: 'beforeEnabled', color: 'beforeColor', label: 'ghostingBefore', rangeLabel: 'ghostingBeforeFrames', colorLabel: 'ghostingBeforeColor'},
  {value: 'after', enabled: 'afterEnabled', color: 'afterColor', label: 'ghostingAfter', rangeLabel: 'ghostingAfterFrames', colorLabel: 'ghostingAfterColor'},
] as const;
const timingOptions = [
  {key: 'anchor', id: 'anchor', label: 'ghostingAnchor', hint: 'ghostingAnchorHint'},
  {key: 'onTop', id: 'on-top', label: 'ghostingOnTop', hint: 'ghostingOnTopHint'},
  {key: 'loop', id: 'loop', label: 'ghostingLoop', hint: 'ghostingLoopHint'},
] as const;
const offsets = [
  {key: 'offsetX', id: 'offset-x', label: 'ghostingOffsetX', icon: 'x'},
  {key: 'offsetY', id: 'offset-y', label: 'ghostingOffsetY', icon: 'y'},
] as const;
const unavailableLabels = {
  mode: 'ghostingMode',
  animation: 'ghostingNoAnimation',
  physics: 'ghostingPhysics',
  unsupported: 'ghostingUnsupported',
  budget: 'ghostingBudget',
} as const;
const unavailable = computed(() => w.ghostingAvailability ? unavailableLabels[w.ghostingAvailability] : null);
const opacityPercent = computed(() => String(Number((w.ghostingSettings.opacity * 100).toPrecision(14))));

function cancelDraft(field: string) {
  delete drafts[field];
}

function commitNumber(field: string, min: number, max: number, apply: (value: number) => void, integer = false) {
  const draft = drafts[field];
  cancelDraft(field);
  if (draft === undefined || !draft.trim()) return;
  const value = Number(draft);
  if (Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))) apply(value);
}

function close() {
  Object.keys(drafts).forEach(cancelDraft);
  open.value = false;
}

function closeOnEscape(event: KeyboardEvent) {
  if (!open.value) return;
  event.preventDefault();
  event.stopPropagation();
  close();
  toggle.value?.focus();
}

function togglePanel() {
  if (open.value) close();
  else open.value = true;
}

async function show() {
  open.value = true;
  await nextTick();
  toggle.value?.focus();
}

defineExpose({show});
</script>

<template>
  <div class="relative" @keydown="event=>{if (!event.ctrlKey && !event.metaKey) event.stopPropagation()}" @keydown.esc.capture="closeOnEscape">
    <button
      ref="toggle"
      type="button"
      class="dock-tab"
      :class="{active: open || w.ghostingSettings.enabled}"
      :aria-expanded="open"
      :aria-controls="`${id}-panel`"
      :aria-describedby="w.ghostingSettings.enabled ? `${id}-enabled` : undefined"
      data-testid="ghosting-toggle"
      @click="togglePanel"
    >
      {{ t('ghosting') }}
      <span v-if="w.ghostingSettings.enabled" aria-hidden="true">✓</span>
    </button>
    <span v-if="w.ghostingSettings.enabled" :id="`${id}-enabled`" class="sr-only">{{ t('ghostingIsEnabled') }}</span>
    <section
      v-if="open"
      :id="`${id}-panel`"
      :aria-labelledby="`${id}-title`"
      class="absolute right-0 top-full z-50 mt-1 max-h-[calc(100dvh-5rem)] w-88 max-w-[calc(100vw-6rem)] overflow-y-auto rounded-sm border border-line bg-panel p-2 text-[11px] shadow-xl"
      data-testid="ghosting-panel"
    >
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <h2 :id="`${id}-title`" class="font-semibold">{{ t('ghosting') }}</h2>
        <label class="inline-flex items-center gap-1.5">
          <input v-model="w.ghostingSettings.enabled" type="checkbox" class="accent-accent" data-testid="ghosting-enabled">
          {{ t('ghostingEnable') }}
        </label>
      </div>
      <p v-if="unavailable || w.ghostingLimited" role="status" class="mt-1 text-warning" data-testid="ghosting-status">
        {{ t(unavailable ?? 'ghostingLimited') }}
      </p>

      <fieldset v-for="range in ranges" :key="range.key" class="mt-2 min-w-0 border border-line px-1.5 pb-1">
        <legend class="px-1 text-accent">{{ t(range.label) }}</legend>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pb-1">
          <label v-for="side in sides" :key="side.value" class="inline-flex items-center gap-1">
            <input v-model="w.ghostingSettings[range.key][side.enabled]" type="checkbox" class="accent-accent" :data-testid="`ghosting-${range.id}-${side.value}-toggle`">
            {{ t(side.label) }}
          </label>
          <label class="inline-flex items-center gap-1">
            <input v-model="w.ghostingSettings[range.key].current" type="checkbox" class="accent-accent" :data-testid="`ghosting-${range.id}-current`">
            {{ t('ghostingCurrent') }}
          </label>
        </div>
        <NumericSliderRow
          v-for="side in sides"
          :key="side.value"
          :label="t(side.rangeLabel)"
          :test-id="`ghosting-${range.id}-${side.value}`"
          :context-key="range.id"
          :model-value="drafts[`${range.id}-${side.value}`] ?? String(w.ghostingSettings[range.key][side.value])"
          :min="0"
          :max="GHOST_FRAME_RANGE"
          :step="GHOST_FRAME_STEP"
          icon="fps"
          @update:model-value="value=>drafts[`${range.id}-${side.value}`]=value"
          @commit="commitNumber(`${range.id}-${side.value}`, 0, GHOST_FRAME_RANGE, value=>w.ghostingSettings[range.key][side.value]=value)"
          @cancel="cancelDraft(`${range.id}-${side.value}`)"
        >
          <template #trailing>
            <input
              v-model="w.ghostingSettings[range.key][side.color]"
              type="color"
              class="h-5 w-6 cursor-pointer rounded-sm border border-line bg-shell p-0.5"
              :aria-label="t(side.colorLabel)"
              :title="t(side.colorLabel)"
              :data-testid="`ghosting-${range.id}-${side.value}-color`"
            >
          </template>
        </NumericSliderRow>
        <NumericSliderRow
          :label="t(range.key === 'frames' ? 'ghostingFrameStep' : 'ghostingKeyStep')"
          :test-id="`ghosting-${range.id}-step`"
          :context-key="range.id"
          :model-value="drafts[`${range.id}-step`] ?? String(w.ghostingSettings[range.key].step)"
          :min="range.key === 'frames' ? GHOST_FRAME_STEP : 1"
          :max="GHOST_FRAME_RANGE"
          :step="range.key === 'frames' ? GHOST_FRAME_STEP : 1"
          icon="fps"
          @update:model-value="value=>drafts[`${range.id}-step`]=value"
          @commit="commitNumber(`${range.id}-step`, range.key === 'frames' ? GHOST_FRAME_STEP : 1, GHOST_FRAME_RANGE, value=>w.ghostingSettings[range.key].step=value, range.key === 'keyFrames')"
          @cancel="cancelDraft(`${range.id}-step`)"
        />
        <div class="mt-1 grid grid-cols-2 gap-2 border-t border-line pt-1">
          <label class="flex min-w-0 items-center gap-1.5">
            {{ t('ghostingFill') }}
            <select v-model="w.ghostingSettings[range.key].fill"
              class="h-6 min-w-0 flex-1 rounded-sm border border-line bg-shell px-1"
              :data-testid="`ghosting-${range.id}-fill`">
              <option value="none">{{ t('ghostingNone') }}</option>
              <option value="images">{{ t('images') }}</option>
              <option value="solid">{{ t('ghostingSolid') }}</option>
            </select>
          </label>
          <label class="flex min-w-0 items-center gap-1.5">
            {{ t('ghostingOutline') }}
            <select v-model="w.ghostingSettings[range.key].outline"
              class="h-6 min-w-0 flex-1 rounded-sm border border-line bg-shell px-1"
              :data-testid="`ghosting-${range.id}-outline`">
              <option value="none">{{ t('ghostingNone') }}</option>
              <option value="silhouette">{{ t('ghostingSilhouette') }}</option>
              <option value="xray">{{ t('ghostingXray') }}</option>
            </select>
          </label>
        </div>
      </fieldset>

      <details class="mt-2 min-w-0 rounded-sm border border-line" data-testid="ghosting-motion-vectors">
        <summary class="px-1.5 py-0.5 text-accent" data-testid="ghosting-motion-vectors-toggle">
          {{ t('ghostingMotionVectors') }}
          <span v-if="w.ghostingSettings.motionVectors.beforeEnabled || w.ghostingSettings.motionVectors.afterEnabled"
            aria-hidden="true">✓</span>
        </summary>
        <div class="border-t border-line px-1.5 py-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pb-1">
            <label v-for="side in sides" :key="side.value" class="inline-flex items-center gap-1">
              <input v-model="w.ghostingSettings.motionVectors[side.enabled]" type="checkbox" class="accent-accent"
                :data-testid="`ghosting-motion-vectors-${side.value}-toggle`">
              {{ t(side.label) }}
            </label>
          </div>
          <NumericSliderRow
            v-for="side in sides"
            :key="side.value"
            :label="t(side.rangeLabel)"
            :test-id="`ghosting-motion-vectors-${side.value}`"
            context-key="motion-vectors"
            :model-value="drafts[`motion-${side.value}`] ?? String(w.ghostingSettings.motionVectors[side.value])"
            :min="0"
            :max="GHOST_FRAME_RANGE"
            :step="GHOST_FRAME_STEP"
            icon="fps"
            @update:model-value="value=>drafts[`motion-${side.value}`]=value"
            @commit="commitNumber(`motion-${side.value}`, 0, GHOST_FRAME_RANGE, value=>w.ghostingSettings.motionVectors[side.value]=value)"
            @cancel="cancelDraft(`motion-${side.value}`)"
          >
            <template #trailing>
              <input v-model="w.ghostingSettings.motionVectors[side.color]" type="color"
                class="h-5 w-6 cursor-pointer rounded-sm border border-line bg-shell p-0.5"
                :aria-label="t(side.colorLabel)" :title="t(side.colorLabel)"
                :data-testid="`ghosting-motion-vectors-${side.value}-color`">
            </template>
          </NumericSliderRow>
          <div role="group" :aria-label="t('ghostingMotionThreshold')" :aria-describedby="`${id}-threshold-hint`">
            <NumericSliderRow
              :label="t('ghostingMotionThreshold')"
              test-id="ghosting-motion-vectors-threshold"
              context-key="motion-vectors"
              :model-value="drafts['motion-threshold'] ?? String(w.ghostingSettings.motionVectors.threshold)"
              :min="0"
              :max="GHOST_MOTION_THRESHOLD_LIMIT"
              :step=".125"
              icon="limit"
              @update:model-value="value=>drafts['motion-threshold']=value"
              @commit="commitNumber('motion-threshold', 0, GHOST_MOTION_THRESHOLD_LIMIT, value=>w.ghostingSettings.motionVectors.threshold=value)"
              @cancel="cancelDraft('motion-threshold')"
            />
            <p :id="`${id}-threshold-hint`" class="text-muted">{{ t('ghostingMotionThresholdHint') }}</p>
          </div>
        </div>
      </details>

      <fieldset class="mt-2 min-w-0 border border-line px-1.5 pb-1">
        <legend class="px-1 text-accent">{{ t('ghostingDisplay') }}</legend>
        <label class="inline-flex items-center gap-1 pb-1">
          <input v-model="w.ghostingSettings.bones" type="checkbox" class="accent-accent" data-testid="ghosting-bones">
          {{ t('bones') }}
        </label>
        <NumericSliderRow
          :label="t('ghostingOpacity')"
          test-id="ghosting-opacity"
          context-key="ghosting-opacity"
          :model-value="drafts.opacity ?? opacityPercent"
          :min="0"
          :max="100"
          :step="1"
          @update:model-value="value=>drafts.opacity=value"
          @commit="commitNumber('opacity', 0, 100, value=>w.ghostingSettings.opacity=value / 100)"
          @cancel="cancelDraft('opacity')"
        />
        <div class="mt-1 flex flex-wrap items-center gap-1 border-t border-line pt-1">
          <label class="inline-flex items-center gap-1" :title="t('ghostingSelectionHint')">
            <input v-model="w.ghostingSettings.selectionOnly" type="checkbox" class="accent-accent"
              :aria-describedby="`${id}-selection-hint`" data-testid="ghosting-selection">
            {{ t('ghostingSelection') }}
          </label>
          <span :id="`${id}-selection-hint`" class="sr-only">{{ t('ghostingSelectionHint') }}</span>
          <button type="button" class="dock-tab !px-1" :class="{active:w.ghostingSelectionLocked}"
            :aria-label="t('ghostingLockSelection')" :title="t('ghostingLockSelection')"
            :aria-pressed="w.ghostingSelectionLocked" :disabled="!w.ghostingSettings.selectionOnly"
            data-testid="ghosting-lock-selection" @click="w.setGhostingSelectionLocked(!w.ghostingSelectionLocked)">
            <AppIcon :name="w.ghostingSelectionLocked ? 'lock' : 'unlock'" class="!size-3.5" />
          </button>
          <button type="button" class="dock-tab !px-1" :aria-label="t('ghostingRefreshSelection')"
            :title="t('ghostingRefreshSelection')" :disabled="!w.ghostingSettings.selectionOnly || !w.ghostingSelectionLocked"
            data-testid="ghosting-refresh-selection" @click="w.refreshGhostingSelection()">
            <AppIcon name="refresh" class="!size-3.5" />
          </button>
        </div>
      </fieldset>

      <fieldset class="mt-2 min-w-0 border border-line px-1.5 pb-1">
        <legend class="px-1 text-accent">{{ t('ghostingOptions') }}</legend>
        <div class="flex flex-wrap gap-x-3 gap-y-1 pb-1">
          <div v-for="option in timingOptions" :key="option.key">
            <label class="inline-flex items-center gap-1" :title="t(option.hint)">
              <input v-model="w.ghostingSettings[option.key]" type="checkbox" class="accent-accent" :aria-describedby="`${id}-${option.id}-hint`" :data-testid="`ghosting-${option.id}`">
              {{ t(option.label) }}
            </label>
            <span :id="`${id}-${option.id}-hint`" class="sr-only">{{ t(option.hint) }}</span>
          </div>
        </div>
        <NumericSliderRow
          v-for="offset in offsets"
          :key="offset.key"
          :label="t(offset.label)"
          :test-id="`ghosting-${offset.id}`"
          :context-key="offset.id"
          :model-value="drafts[offset.id] ?? String(w.ghostingSettings[offset.key])"
          :min="-GHOST_OFFSET_LIMIT"
          :max="GHOST_OFFSET_LIMIT"
          :step="1"
          :icon="offset.icon"
          @update:model-value="value=>drafts[offset.id]=value"
          @commit="commitNumber(offset.id, -GHOST_OFFSET_LIMIT, GHOST_OFFSET_LIMIT, value=>w.ghostingSettings[offset.key]=value)"
          @cancel="cancelDraft(offset.id)"
        />
      </fieldset>
    </section>
  </div>
</template>
