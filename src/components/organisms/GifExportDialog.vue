<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AnimationView } from '../../domain/animation';
import { lastGifFrame, maxGifFps, type GifExportOptions } from '../../domain/gifExport';
import AppButton from '../atoms/AppButton.vue';
import ModalDialog from '../molecules/ModalDialog.vue';

const props = defineProps<{
  animations: readonly Pick<AnimationView, 'id' | 'name' | 'duration'>[];
  activeAnimationId: number | null;
  timelineFps: number;
  busy?: boolean;
  error?: string;
}>();
const emit = defineEmits<{ cancel: []; submit: [options: GifExportOptions] }>();
const { t } = useI18n();
const id = useId();
const rangeErrorId = `${id}-range-error`;
const fpsErrorId = `${id}-fps-error`;

const animationId = ref(props.activeAnimationId ?? props.animations[0]?.id ?? null);
const selectedAnimation = computed(() =>
  props.animations.find(animation => animation.id === animationId.value) ?? props.animations[0],
);
const startFrame = ref<number | ''>(0);
const endFrame = ref<number | ''>(0);
const fps = ref<number | ''>(Math.min(maxGifFps, Math.max(1, Math.round(props.timelineFps))));
const repeat = ref(true);
const customRange = ref(false);
const includeLastFrame = ref(false);
const fpsValid = computed(() => typeof fps.value === 'number'
  && Number.isInteger(fps.value) && fps.value >= 1 && fps.value <= maxGifFps);
const lastExportFrame = computed(() => typeof fps.value === 'number' && fpsValid.value
  ? lastGifFrame(selectedAnimation.value?.duration ?? 0, props.timelineFps, fps.value)
  : 0);

function resetRange() {
  startFrame.value = 0;
  endFrame.value = lastExportFrame.value;
}

watch(selectedAnimation, animation => {
  animationId.value = animation?.id ?? null;
  resetRange();
}, { immediate: true });
watch([customRange, lastExportFrame], () => {
  if (!customRange.value) resetRange();
});

const rangeValid = computed(() => {
  if (!selectedAnimation.value) return false;
  if (!customRange.value) return true;
  const start = startFrame.value;
  const finish = endFrame.value;
  return typeof start === 'number' && typeof finish === 'number'
    && Number.isInteger(start) && Number.isInteger(finish)
    && start >= 0 && finish >= start && finish <= lastExportFrame.value;
});
const rangeError = computed(() => customRange.value && fpsValid.value && !rangeValid.value);

function submit() {
  if (props.busy || !rangeValid.value || !fpsValid.value || animationId.value === null
    || startFrame.value === '' || endFrame.value === '' || fps.value === '') return;
  emit('submit', {
    animationId: animationId.value,
    startFrame: startFrame.value,
    endFrame: endFrame.value,
    fps: fps.value,
    repeat: repeat.value,
    customRange: customRange.value,
    includeLastFrame: includeLastFrame.value,
  });
}
</script>

<template>
  <ModalDialog :title="t('gifExportTitle')" :busy="busy" isolate-keys test-id="gif-export-dialog"
    @cancel="emit('cancel')">
    <form class="grid gap-4" novalidate @submit.prevent="submit">
      <fieldset :disabled="busy" class="grid min-w-0 gap-3">
        <label class="grid min-w-0 gap-1 text-xs text-muted">
          {{ t('animation') }}
          <select v-model="animationId" class="editor-input min-w-0 w-full text-ink"
            :disabled="!animations.length" data-testid="gif-export-animation">
            <option v-if="!animations.length" :value="null">{{ t('gifExportNoClip') }}</option>
            <option v-for="animation in animations" :key="animation.id" :value="animation.id">
              {{ animation.name }}
            </option>
          </select>
        </label>

        <fieldset class="grid min-w-0 gap-2 rounded-md border border-line bg-shell/60 px-3 pb-3 pt-1"
          :disabled="!selectedAnimation">
          <legend class="px-1 text-xs">
            <label class="flex items-center gap-2">
              <input v-model="customRange" type="checkbox" class="accent-accent" data-testid="gif-export-custom-range">
              {{ t('gifExportRange') }}
            </label>
          </legend>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid min-w-0 gap-1 text-xs text-muted">
              {{ t('gifExportStart') }}
              <input v-model="startFrame" type="number" min="0" :max="lastExportFrame"
                step="1" class="editor-input min-w-0 w-full text-ink tabular-nums"
                :disabled="!customRange || !fpsValid" :aria-invalid="rangeError"
                :aria-describedby="rangeError ? rangeErrorId : undefined"
                data-testid="gif-export-start">
            </label>
            <label class="grid min-w-0 gap-1 text-xs text-muted">
              {{ t('gifExportEnd') }}
              <input v-model="endFrame" type="number" min="0" :max="lastExportFrame"
                step="1" class="editor-input min-w-0 w-full text-ink tabular-nums"
                :disabled="!customRange || !fpsValid" :aria-invalid="rangeError"
                :aria-describedby="rangeError ? rangeErrorId : undefined"
                data-testid="gif-export-end">
            </label>
          </div>
          <p v-if="rangeError" :id="rangeErrorId" class="text-xs text-danger">
            {{ t('gifExportInvalidRange', { end: lastExportFrame }) }}
          </p>
          <p v-else-if="customRange && fpsValid" class="text-xs text-muted">{{ t('gifExportRangeHelp') }}</p>
        </fieldset>

        <div class="grid gap-3 sm:grid-cols-[8rem_1fr] sm:items-end">
          <label class="grid min-w-0 gap-1 text-xs text-muted">
            {{ t('gifExportFps') }}
            <input v-model="fps" type="number" min="1" :max="maxGifFps" step="1"
              class="editor-input min-w-0 w-full text-ink tabular-nums" :aria-invalid="!fpsValid"
              :aria-describedby="!fpsValid ? fpsErrorId : undefined" data-testid="gif-export-fps">
          </label>
          <div class="grid gap-1.5 text-xs text-ink">
            <label class="flex items-center gap-2">
              <input v-model="repeat" type="checkbox" class="accent-accent" data-testid="gif-export-repeat">
              {{ t('gifExportRepeat') }}
            </label>
            <label class="flex items-center gap-2">
              <input v-model="includeLastFrame" type="checkbox" class="accent-accent" data-testid="gif-export-include-last">
              {{ t('gifExportIncludeLast') }}
            </label>
          </div>
        </div>
        <p v-if="!fpsValid" :id="fpsErrorId" class="text-xs text-danger">{{ t('gifExportInvalidFps') }}</p>
      </fieldset>

      <p v-if="error" role="alert" class="text-xs text-danger" data-testid="gif-export-error">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <AppButton :disabled="busy" data-testid="gif-export-cancel" @click="emit('cancel')">
          {{ t('cancel') }}
        </AppButton>
        <AppButton type="submit" variant="primary" :disabled="busy || !rangeValid || !fpsValid"
          data-testid="gif-export-submit">
          {{ busy ? t('working') : t('gifExportSubmit') }}
        </AppButton>
      </div>
    </form>
  </ModalDialog>
</template>
