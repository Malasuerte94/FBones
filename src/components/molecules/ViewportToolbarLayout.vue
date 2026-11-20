<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useViewportToolbarPosition } from '../../composables/useViewportToolbarPosition';
import AppIcon from '../atoms/AppIcon.vue';

const props = defineProps<{
  position: number;
  locked: boolean;
  contextKey?: string | number;
  disabled?: boolean;
  labelMode?: 'automatic' | 'text' | 'icons';
}>();
const emit = defineEmits<{
  'update:position': [position: number];
  'update:locked': [locked: boolean];
}>();
const { t, locale } = useI18n();
const {
  track, group, displayPosition, offsetX, canMove, dragging, cancel: cancelDrag, onPointerDown, onPointerMove, onPointerUp,
  onPointerCancel, onLostPointerCapture, onKeyDown,
} = useViewportToolbarPosition({
  position: () => props.position,
  enabled: () => !props.locked && !props.disabled,
  context: () => props.contextKey,
  commit: position => emit('update:position', position),
});
const positionPercent = computed(() => displayPosition.value * 100);
defineExpose({cancelDrag});

const automaticCompact=shallowRef(false);
const labelMode=computed(()=>props.labelMode??'automatic');
const compact=computed(()=>labelMode.value==='icons'||labelMode.value==='automatic'&&automaticCompact.value);
const controls=shallowRef<HTMLElement|null>(null);
const actionLabel='[data-toolbar-action-label]';

watch([track,group,controls,labelMode,locale,()=>props.contextKey],([trackNode,groupNode,controlsNode,mode],_,onCleanup)=>{
  if(!trackNode||!groupNode||!controlsNode||mode!=='automatic')return;
  let frame:number|undefined;
  const measure=()=>{
    frame=undefined;
    const available=trackNode.getBoundingClientRect().width;
    if(available<=0)return;
    if(!controlsNode.querySelector(actionLabel)){
      automaticCompact.value=false;
      return;
    }
    // Measure the same mounted controls with their full labels, then restore before paint.
    groupNode.setAttribute('data-toolbar-measuring','');
    try{
      automaticCompact.value=groupNode.getBoundingClientRect().width>available+0.25;
    }finally{groupNode.removeAttribute('data-toolbar-measuring');}
  };
  function schedule(){if(frame===undefined)frame=requestAnimationFrame(measure);}

  const widths=new Map<Element,number>();
  const resize=new ResizeObserver(entries=>{
    for(const {target,contentRect:{width}} of entries){
      if(widths.get(target)!==width)schedule();
      widths.set(target,width);
    }
  });
  resize.observe(trackNode);
  resize.observe(groupNode);
  const labels=new MutationObserver(schedule);
  const observeLabels=()=>{
    labels.disconnect();
    for(const label of controlsNode.querySelectorAll(actionLabel))labels.observe(label,{childList:true,characterData:true,subtree:true});
  };
  const structure=new MutationObserver(records=>{
    if(records.some(({target,addedNodes,removedNodes})=>target===controlsNode||
      [...addedNodes,...removedNodes].some(node=>node instanceof Element&&
        (node.matches(actionLabel)||node.querySelector(actionLabel))))){
      observeLabels();
      schedule();
    }
  });
  // Numeric values and preview attributes have fixed cells and do not affect preferred width.
  structure.observe(controlsNode,{childList:true,subtree:true});
  observeLabels();
  document.fonts?.addEventListener('loadingdone',schedule);
  onCleanup(()=>{
    resize.disconnect();structure.disconnect();labels.disconnect();document.fonts?.removeEventListener('loadingdone',schedule);
    if(frame!==undefined)cancelAnimationFrame(frame);
  });
  measure();
},{flush:'post'});

function toggleLock() {
  if (!props.disabled) emit('update:locked', !props.locked);
}
</script>

<template>
  <div ref="track" class="viewport-toolbar-layout pointer-events-none! w-full min-w-0"
    data-testid="viewport-toolbar-layout">
    <div ref="group" class="viewport-toolbar-group relative w-max max-w-full min-w-0"
      :style="{ transform: `translateX(${offsetX}px)` }"
      :data-toolbar-compact="compact?'true':undefined"
      data-testid="viewport-toolbar-group">
      <div class="viewport-toolbar-path w-full min-w-0"><slot name="path"/></div>
      <div ref="controls" class="viewport-toolbar-controls flex min-w-0 flex-wrap items-end justify-center">
        <div class="viewport-toolbar-movement flex shrink-0 items-center gap-px rounded-sm border border-line bg-shell p-px">
          <button type="button"
            class="pointer-events-auto grid size-5 place-items-center rounded-xs text-muted hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40"
            :disabled="disabled" :aria-pressed="locked" :aria-label="t('viewportToolbarLock')" :title="t('viewportToolbarLock')"
            data-testid="viewport-toolbar-lock" @mousedown.prevent @keydown.space.stop @keydown.enter.stop @click="toggleLock">
            <AppIcon :name="locked ? 'lock' : 'unlock'" class="!size-3.5"/>
          </button>
          <div role="slider" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100"
            :aria-valuenow="Math.round(positionPercent)" :aria-disabled="!canMove"
            :aria-label="t('viewportToolbarPosition')" :title="t('viewportToolbarPosition')" :tabindex="canMove ? 0 : -1"
            data-testid="viewport-toolbar-grip"
            class="grid size-5 touch-none place-items-center rounded-xs text-muted select-none focus-visible:outline focus-visible:outline-accent"
            :class="canMove ? ['pointer-events-auto hover:bg-raised hover:text-ink', dragging ? 'cursor-grabbing' : 'cursor-grab'] : 'opacity-40'"
            @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp"
            @pointercancel="onPointerCancel" @lostpointercapture="onLostPointerCapture"
            @keydown.space.stop.prevent @keydown="onKeyDown">
            <span class="grid grid-cols-2 gap-0.5" aria-hidden="true">
              <span v-for="point in 6" :key="point" class="size-0.5 rounded-full bg-current"/>
            </span>
          </div>
        </div>
        <slot/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport-toolbar-path {
  contain: inline-size;
}
.viewport-toolbar-path:not(:empty) {
  margin-bottom: 6px;
}
.viewport-toolbar-controls {
  gap: 6px;
}
.viewport-toolbar-controls > :deep(:not(:first-child)) {
  max-width: 100%;
  pointer-events: auto;
}
.viewport-toolbar-controls > :deep(.context-toolbar) {
  position: static;
}
.viewport-toolbar-group[data-toolbar-measuring] {
  max-width: none;
}
.viewport-toolbar-group[data-toolbar-measuring] > .viewport-toolbar-controls {
  flex-wrap: nowrap;
}
.viewport-toolbar-group[data-toolbar-measuring] > .viewport-toolbar-controls > :deep(:not(:first-child)) {
  max-width: none;
}
@container (max-width: 760px) {
  .viewport-toolbar-movement {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
  }
  .viewport-toolbar-path {
    min-height: 24px;
    padding-inline-start: 48px;
  }
  .viewport-toolbar-path:not(:empty) {
    margin-bottom: 4px;
  }
  .viewport-toolbar-controls {
    gap: 4px;
  }
}
</style>
