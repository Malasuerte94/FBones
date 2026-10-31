<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import type {DockPanelId} from '../../domain/dockLayout';
import AppIcon from '../atoms/AppIcon.vue';
defineProps<{id:DockPanelId;title:string;height:number;maxHeight:number}>();
defineEmits<{drag:[event:PointerEvent];resize:[event:PointerEvent|KeyboardEvent,axis:'height'|'both'];close:[]}>();
const{t}=useI18n();
</script>
<template>
 <aside class="dock-pane h-full w-full" :data-testid="`dock-panel-${id}`" :aria-label="title">
  <header class="dock-title !px-1">
   <button class="min-w-0 flex-1 cursor-grab truncate px-1 text-left active:cursor-grabbing" :data-testid="`dock-drag-${id}`" :aria-label="t('movePanel',{name:title})" :title="t('movePanelHint')" style="touch-action:none" @pointerdown="$emit('drag',$event)">{{title}}</button>
   <button class="dock-tab !min-h-5 !px-1" :aria-label="t('closePanel',{name:title})" @click="$emit('close')"><AppIcon name="close" class="!size-3"/></button>
  </header>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto" :data-testid="`dock-content-${id}`"><slot/></div>
  <div class="relative h-1.5 shrink-0 bg-line">
   <div role="separator" aria-orientation="horizontal" tabindex="0" :aria-label="t('resizePanelHeight',{name:title})" :aria-valuenow="Math.round(height)" :aria-valuemin="112" :aria-valuemax="Math.round(maxHeight)" :data-testid="`dock-height-${id}`" class="h-full cursor-row-resize hover:bg-accent/60" style="touch-action:none" @pointerdown="$emit('resize',$event,'height')" @keydown.up.prevent="$emit('resize',$event,'height')" @keydown.down.prevent="$emit('resize',$event,'height')"/>
   <div class="absolute bottom-0 right-0 size-3 cursor-nwse-resize border-r-2 border-b-2 border-faint/70 hover:border-accent" :data-testid="`dock-corner-${id}`" :title="t('resizePanel',{name:title})" style="touch-action:none" @pointerdown.stop="$emit('resize',$event,'both')"/>
  </div>
 </aside>
</template>
