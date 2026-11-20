<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { VIEWPORT_MAX_ZOOM_PERCENT, VIEWPORT_MIN_ZOOM_PERCENT } from '../../viewport/createViewport';
import AppIcon from '../atoms/AppIcon.vue';

const props = withDefaults(defineProps<{
  zoom: number;
  surface?: 'viewport' | 'preview';
  minZoom?: number;
  maxZoom?: number;
  horizontal?: boolean;
  canFit?: boolean;
  rulersVisible?: boolean;
  disabled?: boolean;
}>(), {
  surface: 'viewport',
  minZoom: VIEWPORT_MIN_ZOOM_PERCENT,
  maxZoom: VIEWPORT_MAX_ZOOM_PERCENT,
  canFit: true,
});

const emit = defineEmits<{ zoom: [percent: number]; fit: []; toggleRulers: [] }>();
const { t } = useI18n();
const fitLabel = computed(() => t(props.surface === 'preview' ? 'previewFit' : 'fitSkeleton'));
const zoomStep = 1.25;

function stepZoom(factor: number) {
  const next = Math.round(props.zoom * factor);
  emit('zoom', Math.min(props.maxZoom, Math.max(props.minZoom, next)));
}

async function changeZoom(event: Event) {
  const slider = event.currentTarget as HTMLInputElement;
  emit('zoom', slider.valueAsNumber);
  await nextTick();
  slider.value = String(props.zoom);
}
</script>

<template>
  <div class="viewport-navigation-rail" :class="{ horizontal }" role="group"
    :aria-label="t(surface === 'preview' ? 'previewNavigation' : 'viewportNavigation')"
    :data-testid="`${surface}-navigation`" @keydown.space.stop>
    <button v-if="surface === 'viewport'" type="button" :disabled="disabled" data-testid="viewport-rulers"
      :aria-label="t('rulers')" :title="t('rulers')" :aria-pressed="rulersVisible ?? false" @click="emit('toggleRulers')">
      <span class="ruler-mark" aria-hidden="true" />
    </button>
    <button type="button" :aria-label="t('zoomIn')" :title="t('zoomIn')"
      :disabled="disabled || zoom >= maxZoom" :data-testid="`${surface}-zoom-in`"
      @click="stepZoom(zoomStep)"><AppIcon name="plus" class="!size-3.5" /></button>
    <input class="zoom-slider" type="range" :min="minZoom" :max="maxZoom" step="1" :value="zoom"
      :aria-label="t(surface === 'preview' ? 'previewZoom' : 'zoom')"
      :aria-orientation="horizontal ? 'horizontal' : 'vertical'" :aria-valuetext="`${zoom}%`"
      :disabled="disabled" :data-testid="`${surface}-zoom`" @input="changeZoom" />
    <button type="button" :aria-label="t('zoomOut')" :title="t('zoomOut')"
      :disabled="disabled || zoom <= minZoom" :data-testid="`${surface}-zoom-out`"
      @click="stepZoom(1 / zoomStep)"><span aria-hidden="true">−</span></button>
    <button type="button" :aria-label="t('actualSize')" :title="t('actualSize')" :disabled="disabled"
      :data-testid="`${surface}-zoom-actual-size`" @click="emit('zoom', 100)"><span aria-hidden="true">1:1</span></button>
    <button type="button" :aria-label="fitLabel" :title="fitLabel" :disabled="disabled || !canFit"
      :data-testid="`${surface}-fit`" @click="emit('fit')"><span class="fit-mark" aria-hidden="true">⛶</span></button>
  </div>
</template>

<style scoped>
.viewport-navigation-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 34px;
  padding: 2px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-shell);
  color: var(--color-ink);
  font-size: 11px;
}

.viewport-navigation-rail button {
  display: grid;
  width: 100%;
  min-height: 18px;
  place-items: center;
  border-radius: 2px;
  line-height: 1;
}

.viewport-navigation-rail button:hover:not(:disabled) {
  background: var(--color-raised);
}

.viewport-navigation-rail button[aria-pressed='true'] {
  background: var(--color-accent-deep);
}

.viewport-navigation-rail button:disabled {
  opacity: .48;
}

.viewport-navigation-rail :focus-visible {
  outline-offset: -1px;
}

.zoom-slider {
  width: 24px;
  height: 54px;
  margin: 0;
  accent-color: var(--color-accent);
  direction: rtl;
  writing-mode: vertical-lr;
}

@container viewport-navigation (max-height: 159px) {
  .zoom-slider {
    height: 26px;
  }
}

.viewport-navigation-rail.horizontal {
  flex-direction: row;
  width: min(100%, 138px);
}

.horizontal button {
  width: 18px;
  flex: 0 0 18px;
}

.horizontal .zoom-slider {
  flex: 1;
  min-width: 24px;
  height: 16px;
  direction: ltr;
  writing-mode: horizontal-tb;
}

.ruler-mark {
  width: 13px;
  height: 7px;
  border: 1px solid currentColor;
  background: repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 3px) left top / 9px 3px no-repeat;
  transform: rotate(-25deg);
}

.fit-mark {
  font-size: 15px;
}
</style>
