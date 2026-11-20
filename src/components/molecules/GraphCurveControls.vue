<script setup lang="ts">
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../atoms/AppIcon.vue';

type FavorMode = 'favor' | 'blend';
type CurvePreset = 'flat' | 'easeOut' | 'easeIn';

const props = defineProps<{
  kind: 'favor' | 'presets';
  favorMode: FavorMode;
  favorAmount: number;
  canApplyFavor: boolean;
  canApplyPreset: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:favorMode': [mode: FavorMode];
  'update:favorAmount': [amount: number];
  applyFavor: [];
  applyPreset: [preset: CurvePreset];
  cancelFavor: [];
}>();

const { t } = useI18n();
const plannedId = useId();
const amountLimit = 100;
const modes = [
  { id: 'favor', label: 'animation_favorOptionFavor', available: true },
  { id: 'blend', label: 'animation_favorOptionBlend', available: true },
  { id: 'shift', label: 'animation_shiftKeys', available: false },
  { id: 'linear', label: 'animation_favorLinear', available: false },
  { id: 'averageCurve', label: 'animation_favorAverageCurve', available: false },
  { id: 'averageFrame', label: 'animation_favorAverageFrame', available: false },
  { id: 'averageAll', label: 'animation_favorAverageAll', available: false },
  { id: 'default', label: 'animation_favorDefault', available: false },
  { id: 'setup', label: 'setup', available: false },
  { id: 'store', label: 'animation_storeCurve', available: false },
] as const;
const presets = [
  { id: 'automatic', label: 'animation_curvePresetAutomatic', available: false },
  { id: 'separate', label: 'animation_curvePresetSeparate', available: false },
  { id: 'flat', label: 'animation_curvePresetFlat', available: true, value: 'flat' },
  { id: 'bounce', label: 'animation_curvePresetBounce', available: false },
  { id: 'ease-out', label: 'animation_curvePresetEaseOut', available: true, value: 'easeOut' },
  { id: 'ease-in', label: 'animation_curvePresetEaseIn', available: true, value: 'easeIn' },
] as const;

let pointerInput = false;

function changeMode(event: Event) {
  const mode = (event.currentTarget as HTMLSelectElement).value;
  if (mode === 'favor' || mode === 'blend') emit('update:favorMode', mode);
}

function stageAmount(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  if (Number.isFinite(input.valueAsNumber) && input.validity.valid) emit('update:favorAmount', input.valueAsNumber);
}

function beginPointerInput(event: PointerEvent) {
  pointerInput = event.button === 0;
}

function clearPointerInput() {
  pointerInput = false;
}

function finishPointerInput() {
  if (!pointerInput) return;
  clearPointerInput();
  if (!props.disabled) emit('applyFavor');
}

function clearDraft() {
  clearPointerInput();
  emit('cancelFavor');
}

function applyFavor(event?: KeyboardEvent) {
  if (event) {
    const input = event.currentTarget as HTMLInputElement;
    if (!input.value || !input.validity.valid) return;
  }
  if (props.canApplyFavor && !props.disabled) emit('applyFavor');
}

function restoreAmount(event: FocusEvent) {
  (event.currentTarget as HTMLInputElement).value = String(props.favorAmount);
}

function applyPreset(preset: typeof presets[number]) {
  if (preset.available && props.canApplyPreset && !props.disabled) {
    emit('applyPreset', preset.value);
  }
}
</script>

<template>
  <div class="graph-curve-controls" role="group" data-testid="timeline-curve-controls"
    :aria-label="t(kind === 'favor' ? 'animation_favorKeys' : 'animation_curvePresets')" @keydown.space.stop>
    <template v-if="kind === 'favor'">
      <label class="favor-mode" data-testid="timeline-favor-mode-label">
        <span>{{ t('animation_favorMode') }}</span>
        <select :value="favorMode" :disabled="disabled" data-testid="timeline-favor-mode" @change="changeMode">
          <option v-for="mode in modes" :key="mode.id" :value="mode.id" :disabled="!mode.available">
            {{ mode.available ? t(mode.label) : t('animation_curveModeUnavailable', { mode: t(mode.label) }) }}
          </option>
        </select>
      </label>
      <div class="favor-value">
        <input type="range" :min="-amountLimit" :max="amountLimit" step="1" :value="favorAmount"
          :disabled="disabled" :aria-label="t('animation_favorAmount')" :aria-valuetext="`${favorAmount}%`"
          data-testid="timeline-favor-slider" @input="stageAmount" @change="finishPointerInput"
          @pointerdown="beginPointerInput" @pointercancel="clearDraft" @blur="clearPointerInput"
          @keydown="clearPointerInput" @keydown.enter.stop.prevent="applyFavor" />
        <input type="number" :min="-amountLimit" :max="amountLimit" step="1" :value="favorAmount"
          :disabled="disabled" :aria-label="t('animation_favorAmount')" data-testid="timeline-favor-amount"
          @input="stageAmount" @blur="restoreAmount" @keydown.enter.stop.prevent="applyFavor" />
      </div>
      <div class="favor-actions">
        <button type="button" :disabled="disabled || !canApplyFavor" data-testid="timeline-favor-apply"
          @click="applyFavor()">{{ t('animation_applyFavor') }}</button>
        <button type="button" :aria-label="t('animation_resetFavor')" :title="t('animation_resetFavor')"
          :disabled="disabled || favorAmount === 0" data-testid="timeline-favor-reset" @click="clearDraft">
          <AppIcon name="reset" class="!size-3.5" />
        </button>
      </div>
    </template>
    <template v-else>
      <span :id="plannedId" class="sr-only">{{ t('animation_plannedControls') }}</span>
      <button v-for="preset in presets" :key="preset.id" type="button"
        :disabled="disabled || !canApplyPreset || !preset.available" :aria-describedby="!preset.available ? plannedId : undefined"
        :title="!preset.available ? t('animation_plannedControls') : undefined" :data-testid="`timeline-curve-preset-${preset.id}`"
        @click="applyPreset(preset)">{{ t(preset.label) }}</button>
    </template>
  </div>
</template>

<style scoped>
.graph-curve-controls {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 6px;
  min-width: 0;
  padding: 3px 6px;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-panel);
}

.favor-mode,
.favor-value,
.favor-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.favor-mode span { color: var(--color-muted); }
.favor-mode select { max-width: 110px; }
.favor-value { flex: 1 1 104px; max-width: 220px; }
.favor-value input[type='range'] { flex: 1 1 0; min-width: 28px; accent-color: var(--color-accent); }
.favor-value input[type='number'] { width: 44px; text-align: right; appearance: textfield; }
.favor-value input[type='number']::-webkit-inner-spin-button { appearance: none; }
</style>
