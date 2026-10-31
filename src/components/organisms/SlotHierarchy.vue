<script setup lang="ts">
import { computed,ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import type {SlotView} from '../../domain/project';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
const w = useWorkspace(), { t } = useI18n();
const animate=computed(()=>w.editorMode==='animate');
const sourceSlots=computed<SlotView[]>(()=>animate.value?w.drawOrderSlots:w.slots);
const canOrder=computed(()=>w.canEdit&&!w.busy&&(!animate.value||!!w.activeAnimation));
const rows = computed(() => [...sourceSlots.value].reverse());
const dropId=ref<number|null>(null);
function drag(event:DragEvent,id:number){if(!canOrder.value||!w.project)return;if(animate.value)w.pauseAnimation();event.dataTransfer?.setData('application/x-fbones-draw-order',JSON.stringify({id,documentId:w.project.documentId,revision:w.project.revision,mode:w.editorMode,animation:w.animationId,frame:w.animationFrame}));if(event.dataTransfer)event.dataTransfer.effectAllowed='move';}
async function drop(event:DragEvent,id:number){event.preventDefault();dropId.value=null;const value=event.dataTransfer?.getData('application/x-fbones-draw-order');if(!value||!canOrder.value||!w.project)return;let payload:{id:number;documentId:number;revision:number;mode:string;animation:number|null;frame:number};try{payload=JSON.parse(value) as typeof payload;}catch{return;}if(payload.documentId!==w.project.documentId||payload.revision!==w.project.revision||payload.mode!==w.editorMode||animate.value&&(payload.animation!==w.animationId||payload.frame!==w.animationFrame))return;const source=Number(payload.id);const visual=rows.value.map(s=>s.id),from=visual.indexOf(source),target=visual.indexOf(id);if(from<0||target<0||source===id)return;const rect=(event.currentTarget as HTMLElement).getBoundingClientRect(),after=event.clientY>rect.top+rect.height/2;visual.splice(from,1);const at=visual.indexOf(id)+(after?1:0);visual.splice(at,0,source);if(animate.value)await w.setAnimationDrawOrder(visual.slice().reverse());else await w.editRig({type:'reorderSlot',id:source,index:visual.length-1-visual.indexOf(source)});}
function reorder(id: number, direction: number) {
  if(!canOrder.value)return;const order=sourceSlots.value.map(slot=>slot.id),from=order.indexOf(id),index=from+direction;
  if(from<0||index<0||index>=order.length)return;if(animate.value){order.splice(from,1);order.splice(index,0,id);void w.setAnimationDrawOrder(order);}else void w.editRig({type:'reorderSlot',id,index});
}
</script>
<template>
  <div class="flex h-10 shrink-0 items-center justify-between border-b border-line px-4"><h2 class="text-xs font-semibold">{{ t('drawOrder') }}</h2><span class="ml-auto text-xs text-faint">{{ rows.length }}</span><AppButton v-if="animate" :disabled="!w.canEdit||w.busy||!w.activeAnimation" data-testid="draw-order-key" aria-label="Key draw order" title="Key draw order" @click="w.insertDrawOrderKey()"><AppIcon name="key" class="!size-3"/></AppButton></div>
  <p class="px-4 py-2 text-[11px] text-faint">{{ t('frontToBack') }}<button v-if="animate" class="float-right text-accent" :disabled="!w.canEdit||w.busy||!w.activeAnimation" data-testid="draw-order-setup" @click="w.setAnimationDrawOrder(null)">Setup order</button></p>
  <div role="listbox" :aria-label="t('drawOrder')" class="min-h-0 flex-1 overflow-y-auto px-2">
    <div v-for="(slot, index) in rows" :key="slot.id" :data-testid="'draw-order-slot-'+slot.id" class="mb-1 flex items-center rounded" :draggable="canOrder" @dragstart="drag($event,slot.id)" @dragover="($event.dataTransfer?.types.includes('application/x-fbones-draw-order'))&&($event.preventDefault(),dropId=slot.id)" @dragleave="dropId=null" @drop="drop($event,slot.id)" :style="dropId===slot.id?{outline:'1px solid var(--color-accent)'}:undefined" :class="w.selectedSlotId === slot.id ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-raised'">
      <button role="option" :aria-selected="w.selectedSlotId === slot.id" class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs outline-none focus-visible:ring-1 focus-visible:ring-accent" @click="w.selectSlot(slot.id)">
        <AppIcon name="file" :class="!slot.imageAvailable ? 'text-warning' : ''"/><span class="truncate" :class="!slot.visible ? 'opacity-40' : ''">{{ slot.name }}</span>
      </button>
      <button class="px-1 text-xs hover:text-ink disabled:opacity-20" :disabled="!canOrder || index === 0" :aria-label="t('bringForward')" :title="t('bringForward')" @click="reorder(slot.id, 1)">↑</button>
      <button class="px-1.5 text-xs hover:text-ink disabled:opacity-20" :disabled="!canOrder || index === rows.length - 1" :aria-label="t('sendBackward')" :title="t('sendBackward')" @click="reorder(slot.id, -1)">↓</button>
    </div>
    <p v-if="!rows.length" class="px-3 py-5 text-xs leading-5 text-muted">{{ t('emptyImages') }}</p>
  </div>
  <div class="flex shrink-0 gap-2 border-t border-line p-3">
    <span class="flex-1 px-1 text-[10px] leading-4 text-muted">{{ t('drawOrderDragHint') }}</span>
    <AppButton :disabled="animate || !w.canEdit || w.busy || !w.selectedSlot" :aria-label="t('deleteImage')" :title="t('deleteImage')" @click="w.removeSelection"><AppIcon name="trash" /></AppButton>
  </div>
</template>
