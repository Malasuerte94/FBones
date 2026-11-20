<script setup lang="ts">
import { computed } from 'vue';
import type { ViewportRulerFrame } from '../../viewport/createViewport';

const props = defineProps<{ frame: ViewportRulerFrame }>();
const majorTickSpacing = 60;
const maxMajorTicks = 128;

function rulerTicks(length: number, origin: number, zoom: number, direction: 1 | -1) {
  if (!Number.isFinite(length) || !Number.isFinite(origin) || !Number.isFinite(zoom) || length <= 0 || zoom <= 0) return [];

  const target = Math.max(majorTickSpacing, length / maxMajorTicks) / zoom;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = magnitude * ([1, 2, 5, 10].find(factor => factor * magnitude >= target) ?? 10);
  const from = -origin / zoom * direction;
  const to = (length - origin) / zoom * direction;
  const first = Math.ceil(Math.min(from, to) / step);
  const last = Math.floor(Math.max(from, to) / step);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return [];

  return Array.from({ length: Math.max(0, Math.min(maxMajorTicks, last - first + 1)) }, (_, index) => {
    const value = (first + index) * step;
    return { value, position: origin + value * zoom * direction };
  });
}

function valueText(value: number) {
  return Math.abs(value) >= 100_000 ? value.toExponential(2).replace('e+', 'e') : String(Number(value.toFixed(2)));
}

const camera = computed(() => props.frame.camera);
const xTicks = computed(() => rulerTicks(camera.value.width, camera.value.originX, camera.value.zoom, 1));
const yTicks = computed(() => rulerTicks(camera.value.height, camera.value.originY, camera.value.zoom, -1));
const axes = computed(() => {
  const pointer = props.frame.pointer;
  return [
    { id: 'x', ticks: xTicks.value, cursor: pointer && { position: pointer.x, value: pointer.worldX } },
    { id: 'y', ticks: yTicks.value, cursor: pointer && { position: pointer.y, value: pointer.worldY } },
  ];
});
</script>

<template>
  <div class="viewport-rulers" data-testid="viewport-rulers-overlay" aria-hidden="true">
    <div class="ruler-corner" />
    <div v-for="axis in axes" :key="axis.id" class="ruler-band" :class="`ruler-band--${axis.id}`"
      :data-testid="`viewport-ruler-${axis.id}`">
      <div v-for="tick in axis.ticks" :key="tick.value" class="ruler-point" :style="{ '--position': `${tick.position}px` }">
        <span class="ruler-mark" />
        <span class="ruler-label">{{ valueText(tick.value) }}</span>
      </div>
      <div v-if="axis.cursor" class="ruler-point ruler-cursor" :style="{ '--position': `${axis.cursor.position}px` }">
        <span class="ruler-mark" />
        <span class="ruler-label" :data-testid="`viewport-ruler-${axis.id}-cursor`">{{ valueText(axis.cursor.value) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport-rulers {
  --ruler-edge: var(--viewport-ruler-edge, 22px);
  --ruler-label-span: 44px;
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  color: var(--color-muted);
  font-size: 10px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ruler-band,
.ruler-corner {
  position: absolute;
  overflow: hidden;
  background: var(--color-shell);
}

.ruler-corner {
  inset: 0 auto auto 0;
  width: var(--ruler-edge);
  height: var(--ruler-edge);
  border-right: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
}

.ruler-band--x {
  inset: 0 0 auto var(--ruler-edge);
  height: var(--ruler-edge);
  border-bottom: 1px solid var(--color-line);
}

.ruler-band--y {
  inset: var(--ruler-edge) auto 0 0;
  width: var(--ruler-edge);
  border-right: 1px solid var(--color-line);
}

.ruler-point {
  --offset: calc(var(--position) - var(--ruler-edge));
}

.ruler-mark {
  position: absolute;
  background: currentColor;
}

.ruler-band--x .ruler-mark {
  left: var(--offset);
  bottom: 0;
  width: 1px;
  height: 5px;
}

.ruler-band--y .ruler-mark {
  top: var(--offset);
  right: 0;
  width: 5px;
  height: 1px;
}

.ruler-label {
  position: absolute;
  display: grid;
  place-items: center;
  inline-size: var(--ruler-label-span);
  block-size: 14px;
  white-space: nowrap;
}

.ruler-band--x .ruler-label {
  top: 1px;
  left: clamp(0px, calc(var(--offset) - var(--ruler-label-span) / 2), calc(100% - var(--ruler-label-span)));
}

.ruler-band--y .ruler-label {
  top: clamp(0px, calc(var(--offset) - var(--ruler-label-span) / 2), calc(100% - var(--ruler-label-span)));
  left: 1px;
  writing-mode: vertical-rl;
  text-orientation: sideways;
  transform: rotate(180deg);
}

.ruler-cursor {
  color: var(--color-danger);
}

.ruler-cursor .ruler-label {
  background: var(--color-shell);
}

.ruler-band--x .ruler-cursor .ruler-mark {
  left: clamp(0px, var(--offset), calc(100% - 1px));
  height: 100%;
}

.ruler-band--y .ruler-cursor .ruler-mark {
  top: clamp(0px, var(--offset), calc(100% - 1px));
  width: 100%;
}
</style>
