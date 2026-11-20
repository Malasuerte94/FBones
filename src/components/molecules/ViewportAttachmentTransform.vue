<script setup lang="ts">
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
import type {AttachmentTransformEditor} from '../../composables/useAttachmentTransformEditor';
import {useWorkspace} from '../../stores/workspace';

const props=defineProps<{
  transformEditor:AttachmentTransformEditor;
  meshHullCenter?:{x:number;y:number}|null;
  clipTransformTools?:boolean;
}>();
type ClipTransformTool='rotate'|'translate'|'scale';
const emit=defineEmits<{useTool:[tool:ClipTransformTool]}>();
const w=useWorkspace(),{t}=useI18n();
const selected=computed(()=>{
  const item=w.selectedAttachment;
  if(!item||!w.sceneEditing||w.editorMode!=='setup'||!w.treeFilters.attachment||
    w.selectedAttachmentIds.length!==1||w.selectedAttachmentIds[0]!==item.id||
    (item.type!=='region'&&item.type!=='mesh'&&!(item.type==='clipping'&&item.clipping)))return null;
  return item;
});
const isRegion=computed(()=>selected.value?.type==='region'&&props.transformEditor.targetId.value===selected.value.id);
const isMesh=computed(()=>selected.value?.type==='mesh'&&!!selected.value.mesh);
const isClipping=computed(()=>selected.value?.type==='clipping');
const axes=['x','y'] as const;
const rows=[
  {tool:'rotate',fields:['rotation'],color:'text-motion'},
  {tool:'translate',fields:['x','y'],color:'text-accent'},
  {tool:'scale',fields:['scaleX','scaleY'],color:'text-danger'},
  {tool:'shear',fields:['shearX','shearY'],color:'text-bone'},
] as const;
function numericUnavailableHint(tool:ClipTransformTool|'shear'){
  if(isRegion.value)return t('attachmentRegionShearUnavailable');
  if(isClipping.value&&tool==='translate')return t('attachmentClippingTranslateUnavailable');
  return t('attachmentNumericTransformUnavailable');
}
function activateClipTool(tool:ClipTransformTool|'shear'){
  if(isClipping.value&&props.clipTransformTools&&tool!=='shear')emit('useTool',tool);
}
function compact(value:number){
  return Object.is(value,-0)?'-0':String(Number(value.toPrecision(6)));
}
</script>

<template>
  <div v-if="selected" class="context-toolbar w-48 min-w-0 gap-0.5" role="group"
    :aria-label="t('attachmentTransformValues')" data-testid="viewport-attachment-transform">
    <span v-if="isRegion" class="px-1 text-[10px] text-muted">{{t('attachmentOwnerLocal')}}</span>
    <template v-for="row in rows" :key="row.tool">
      <div v-if="isMesh&&row.tool==='translate'" class="grid grid-cols-[minmax(4rem,auto)_repeat(2,minmax(0,1fr))] items-center gap-1"
        role="group" :aria-label="t('viewportMeshHullCenter')" :title="t('viewportMeshHullCenterHint')"
        data-testid="viewport-mesh-hull-center">
        <span class="text-[10px] text-accent">{{t('viewportMeshHullCenter')}}</span>
        <span v-for="axis in axes" :key="axis" class="truncate rounded-sm bg-shell px-1 py-0.5 text-center text-[11px] tabular-nums"
          :data-testid="`viewport-mesh-hull-center-${axis}`" :data-value="meshHullCenter?.[axis]">
          <span class="mr-1 text-[9px] text-muted">{{t(axis)}}</span>{{meshHullCenter?compact(meshHullCenter[axis]):'—'}}
        </span>
      </div>
      <div v-else class="grid grid-cols-[minmax(4rem,auto)_repeat(2,minmax(0,1fr))] items-center gap-1">
        <button v-if="isClipping" type="button" class="dock-tab min-w-0 justify-start px-1 text-[11px]"
          :class="[row.color,{active:w.editMode==='images'&&w.tool===row.tool}]"
          :disabled="row.tool==='shear'||!clipTransformTools"
          :aria-pressed="row.tool==='shear'?undefined:w.editMode==='images'&&w.tool===row.tool"
          :title="row.tool==='shear'?numericUnavailableHint(row.tool):w.editMode==='clipping'?t('clippingWholeTransformHint'):t(row.tool)"
          :data-testid="`clipping-transform-${row.tool}`" @keydown.space.stop @click="activateClipTool(row.tool)">
          <span class="truncate">{{t(row.tool)}}</span>
        </button>
        <span v-else class="truncate text-[11px]" :class="row.color">{{t(row.tool)}}</span>
        <span v-for="(field,index) in row.fields" :key="field" class="relative min-w-0"
          :title="!isRegion||row.tool==='shear'?numericUnavailableHint(row.tool):undefined">
          <span v-if="row.fields.length===2" aria-hidden="true"
            class="pointer-events-none absolute top-1/2 left-1 -translate-y-1/2 text-[9px] text-muted">{{t(index===0?'x':'y')}}</span>
          <input v-if="isRegion&&row.tool!=='shear'" type="number" step="any" required
            class="editor-input w-full min-w-0 px-1 text-right text-[11px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            :class="row.fields.length===2?'pl-3':undefined"
            :aria-label="t('attachmentOwnerLocalField',{field:t(field)})" :data-testid="`viewport-attachment-${field}`"
            :value="transformEditor.draft[field]" :disabled="!transformEditor.canEdit.value"
            @input="transformEditor.draft[field]=($event.target as HTMLInputElement).value"
            @change="transformEditor.commit(field)" @blur="transformEditor.commit(field)"
            @keydown.enter.stop.prevent="transformEditor.enter($event,field)" @keydown.esc.stop.prevent="transformEditor.escape"/>
          <input v-else type="number"
              class="editor-input pointer-events-none w-full min-w-0 px-1 text-right text-[11px] placeholder:text-muted/60"
              disabled placeholder="—" :aria-label="t(field)" :aria-description="numericUnavailableHint(row.tool)"
              :data-testid="`viewport-attachment-${field}`"/>
        </span>
      </div>
    </template>
  </div>
</template>
