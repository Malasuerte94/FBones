<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import AppButton from '../atoms/AppButton.vue';
import ModalDialog from '../molecules/ModalDialog.vue';

const w = useWorkspace();
const { t } = useI18n();
const id = useId();
const maxDraft = ref(String(w.pruneMaxInfluences));
const thresholdDraft = ref('0');
const maxInfluences = computed(() => maxDraft.value === '' ? NaN : Number(maxDraft.value));
const threshold = computed(() => thresholdDraft.value === '' ? NaN : Number(thresholdDraft.value));
const validMax = computed(() => Number.isInteger(maxInfluences.value) &&
  maxInfluences.value >= 1 && maxInfluences.value <= w.pruneMaxInfluences);
const validThreshold = computed(() => threshold.value >= 0 && threshold.value <= 100);
const validation = computed(() => {
  if (!validMax.value) return t('pruneInvalidMax', { max: w.pruneMaxInfluences });
  return validThreshold.value ? '' : t('pruneInvalidThreshold');
});
const removedCount = computed(() => w.prunePreview?.removed ?? null);
const previewStatus = computed(() => {
  if (w.busy) return t('working');
  if (validation.value || w.pruneError) return '';
  if (w.pruneBusy) return t('prunePreviewing');
  return removedCount.value === null ? '' : t('pruneRemoved', removedCount.value);
});

watch([maxDraft, thresholdDraft], () => {
  w.setPruneOptions(validMax.value && validThreshold.value
    ? { maxInfluences: maxInfluences.value, threshold: threshold.value / 100 }
    : null);
}, { immediate: true, flush: 'sync' });
</script>

<template>
  <ModalDialog :title="t('pruneTitle')" placement="side" test-id="weights-prune-dialog"
    :busy="w.busy" @cancel="w.cancelPrune">
    <p class="mb-3 text-[11px] leading-4 text-muted">{{ t('pruneScope', w.pruneTargetCount) }}</p>
    <div class="space-y-2 rounded-sm border border-line bg-shell p-2">
      <div class="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-2">
        <label :for="`${id}-max`" class="text-xs text-muted">{{ t('pruneMaxInfluences') }}</label>
        <input :id="`${id}-max`" type="number" min="1" :max="w.pruneMaxInfluences" step="1"
          :value="maxDraft" :aria-invalid="!validMax" :disabled="w.busy" data-testid="weights-prune-max"
          class="editor-input text-right tabular-nums" @input="maxDraft = ($event.target as HTMLInputElement).value">
        <input type="range" min="1" :max="w.pruneMaxInfluences" step="1"
          :value="validMax ? maxInfluences : w.pruneMaxInfluences" :disabled="w.busy || w.pruneMaxInfluences === 1"
          :aria-label="t('numericSlider', { name: t('pruneMaxInfluences') })" data-testid="weights-prune-max-slider"
          class="col-span-2 h-5 w-full cursor-ew-resize accent-accent disabled:cursor-default disabled:opacity-40"
          @input="maxDraft = ($event.target as HTMLInputElement).value">
      </div>
      <div class="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-2">
        <label :for="`${id}-threshold`" class="text-xs text-muted">{{ t('pruneThreshold') }}</label>
        <input :id="`${id}-threshold`" type="number" min="0" max="100" step="any"
          :value="thresholdDraft" :aria-invalid="!validThreshold" :disabled="w.busy" data-testid="weights-prune-threshold"
          class="editor-input text-right tabular-nums" @input="thresholdDraft = ($event.target as HTMLInputElement).value">
        <input type="range" min="0" max="100" step="0.1" :value="validThreshold ? threshold : 0" :disabled="w.busy"
          :aria-label="t('numericSlider', { name: t('pruneThreshold') })" data-testid="weights-prune-threshold-slider"
          class="col-span-2 h-5 w-full cursor-ew-resize accent-accent disabled:cursor-default disabled:opacity-40"
          @input="thresholdDraft = ($event.target as HTMLInputElement).value">
      </div>
    </div>
    <div class="my-2 min-h-4 text-[11px] leading-4">
      <p role="status" data-testid="weights-prune-status" class="tabular-nums text-muted">{{ previewStatus }}</p>
      <p v-if="validation || w.pruneError" role="alert" class="text-danger">{{ validation || w.pruneError }}</p>
    </div>
    <div class="flex justify-end gap-2">
      <AppButton :disabled="w.busy" data-testid="weights-prune-cancel" @click="w.cancelPrune">{{ t('cancel') }}</AppButton>
      <AppButton variant="primary" :disabled="w.busy || !!validation || !w.canApplyPrune"
        data-testid="weights-prune-apply" @click="w.applyPrune">{{ t('apply') }}</AppButton>
    </div>
  </ModalDialog>
</template>
