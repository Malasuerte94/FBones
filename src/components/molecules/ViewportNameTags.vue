<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ViewportNameTag, ViewportNameTagFrame } from '../../viewport/nameTags';

const props = defineProps<{
  frame: ViewportNameTagFrame;
  rulersVisible: boolean;
  selectable: Readonly<Record<ViewportNameTag['layer'], boolean>>;
}>();

const emit = defineEmits<{ select: [tag: ViewportNameTag, event: MouseEvent]; wheel: [event: WheelEvent]; pan: [event: PointerEvent] }>();
const { t } = useI18n();

const tagHeight = 18;
const tagGap = 2;
const viewportMargin = 4;
const rulerEdge = 22;
const maxTagWidth = 146;
const maxTags = 128;
const selectLabels = {
  bones: 'viewportNameTagBone',
  images: 'viewportNameTagImage',
  others: 'viewportNameTagOther',
} as const;

type TagPosition = { left: number; top: number; width: number };
type PositionedTag = TagPosition & { tag: ViewportNameTag };

function overlaps(first: TagPosition, second: TagPosition) {
  return first.left < second.left + second.width + tagGap && first.left + first.width + tagGap > second.left &&
    first.top < second.top + tagHeight + tagGap && first.top + tagHeight + tagGap > second.top;
}

const visibleTags = computed(() => {
  const { width, height, tags } = props.frame;
  const nearEdge = viewportMargin + (props.rulersVisible ? rulerEdge : 0);
  const right = width - viewportMargin;
  const bottom = height - viewportMargin;
  if (right - nearEdge < 36 || bottom - nearEdge < tagHeight) return [];

  const positioned: PositionedTag[] = [];
  const candidates = [...tags].sort((first, second) => Number(second.selected) - Number(first.selected));
  for (const tag of candidates) {
    if (positioned.length === maxTags) break;
    if (!Number.isFinite(tag.x) || !Number.isFinite(tag.y) || tag.x < nearEdge || tag.x > right || tag.y < nearEdge || tag.y > bottom) continue;

    const width = Math.min(maxTagWidth, right - nearEdge, Math.max(36, tag.name.length * 6 + 22));
    const left = tag.x - width - 8;
    const rightOfTag = tag.x + 8;
    const aligned = Math.max(nearEdge, Math.min(right - width, tag.x - width / 2));
    const above = tag.y - tagHeight - 7;
    const below = tag.y + 7;
    const places = [
      { left: rightOfTag, top: above }, { left, top: above }, { left: aligned, top: above },
      { left: rightOfTag, top: below }, { left, top: below }, { left: aligned, top: below },
    ].map(place => ({ ...place, width }));
    const placement = places.find(place =>
      place.left >= nearEdge && place.left + width <= right && place.top >= nearEdge && place.top + tagHeight <= bottom &&
      !positioned.some(other => overlaps(place, other)));
    if (placement) positioned.push({ ...placement, tag });
  }
  return positioned;
});
</script>

<template>
  <div class="viewport-name-tags" data-testid="viewport-name-tags">
    <button v-for="{ tag, left, top, width } in visibleTags" :key="`${frame.documentId}:${tag.layer}:${tag.id}`"
      type="button" class="viewport-name-tag" :data-layer="tag.layer" :aria-pressed="tag.selected"
      :disabled="!selectable[tag.layer]" :aria-label="t(selectLabels[tag.layer], { name: tag.name })"
      :style="{ left: `${left}px`, top: `${top}px`, width: `${width}px` }"
      :title="tag.name" :data-testid="`viewport-name-tag-${tag.layer}-${tag.id}`"
      @pointerdown.stop="emit('pan', $event)" @contextmenu.prevent
      @keydown.space.stop @click.stop="emit('select', tag, $event)" @wheel.stop="emit('wheel', $event)">
      <span class="viewport-name-tag-text">{{ tag.name }}</span>
    </button>
  </div>
</template>

<style scoped>
.viewport-name-tags {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.viewport-name-tag {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding-inline: 5px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-shell);
  color: var(--color-ink);
  font-size: 11px;
  line-height: 1;
  text-align: left;
}

.viewport-name-tag:not(:disabled) {
  pointer-events: auto;
}

.viewport-name-tag::before {
  content: '';
  flex: 0 0 4px;
  height: 8px;
  border-radius: 1px;
  background: var(--tag-color);
}

.viewport-name-tag[data-layer='bones'] { --tag-color: var(--color-bone); }
.viewport-name-tag[data-layer='images'] { --tag-color: var(--color-accent); }
.viewport-name-tag[data-layer='others'] { --tag-color: var(--color-inertia); }

.viewport-name-tag[aria-pressed='true'] {
  border-color: var(--color-accent);
  background: var(--color-accent-deep);
}

.viewport-name-tag:not(:disabled):hover {
  border-color: var(--tag-color);
}

.viewport-name-tag:focus-visible {
  outline-offset: -2px;
}

.viewport-name-tag-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
