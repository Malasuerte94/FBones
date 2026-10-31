<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import { bindingPoints } from '../../domain/binding';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
const w=useWorkspace(),{t}=useI18n(),mesh=computed(()=>w.selectedSlot?.mesh),animate=computed(()=>w.editorMode==='animate'),deform=computed(()=>animate.value?w.selectedAttachment?.mesh??w.selectedAttachment?.clipping:null),binding=computed(()=>animate.value?deform.value:mesh.value);
const point=computed(()=>binding.value&&w.selectedVertex!==null?bindingPoints(w.renderedBones,binding.value)[w.selectedVertex]:undefined);
const editable=computed(()=>w.canEdit&&!w.busy&&!w.traceOpen&&(!animate.value||!!w.activeAnimation));
const pending=new Map<string,Promise<boolean>>();
function editMesh(){if(animate.value){w.meshEditUvs=false;w.setMode(w.selectedAttachment?.clipping?'clipping':'meshes');}else w.setMode('meshes');w.meshTool='move';}
async function convert(){if(animate.value)return;const slot=w.selectedSlot;if(slot&&await w.editRig({type:'convertMesh',id:slot.id}))editMesh();}
function position(axis:'x'|'y',event:Event):Promise<boolean>{
  const slot=w.selectedSlot,vertex=w.selectedVertex,current=point.value,input=event.target as HTMLInputElement,value=Number(input.value);
  if(!slot||vertex===null||!current||!editable.value)return Promise.resolve(false);
  if(!input.value.trim()||!Number.isFinite(value)){w.inspectorError=t('invalidTransform');return Promise.resolve(false);}
  if(Math.abs(current[axis]-value)<1e-6){w.inspectorError='';return Promise.resolve(true);}
  const token=`${w.project?.documentId}:${w.editorMode}:${w.animationId}:${w.animationFrame}:${w.selectedAttachment?.id}:${slot.id}:${vertex}:${axis}:${value}`,existing=pending.get(token);if(existing)return existing;
  let resolve!:(value:boolean)=>void;const operation=new Promise<boolean>(done=>{resolve=done;});pending.set(token,operation);w.inspectorError='';
  void w.editRig(animate.value&&w.selectedAttachment?.clipping?{type:'moveClippingVertices',id:w.selectedAttachment.id,vertices:[{vertex,...current,[axis]:value}]}:{type:'moveVertices',id:slot.id,vertices:[{vertex,...current,[axis]:value}],editUvs:animate.value?false:w.meshEditUvs}).then(success=>{if(!success&&w.selectedSlotId===slot.id&&w.selectedVertex===vertex)w.inspectorError=w.notice;resolve(success);}).finally(()=>pending.delete(token));
  return operation;
}
function enter(axis:'x'|'y',event:KeyboardEvent){void position(axis,event);(event.target as HTMLInputElement).blur();}
function cancelPosition(axis:'x'|'y',event:KeyboardEvent){(event.target as HTMLInputElement).value=String(point.value?.[axis]??'');w.inspectorError='';(event.target as HTMLInputElement).blur();}
</script>
<template>
  <div class="dock-title"><AppIcon name="mesh"/><h2>{{ t('meshTools') }}</h2></div>
  <div class="min-h-0 flex-1 overflow-y-auto p-2">
    <fieldset :disabled="w.busy||w.traceOpen" class="control-group space-y-2">
      <label class="flex items-center gap-2"><input v-model="w.softSelection" type="checkbox">{{ t('softSelection') }}</label>
      <label class="control-row"><span>{{ t('size') }}</span><input v-model.number="w.softSize" type="range" min="10" max="400"><output>{{ w.softSize }}</output></label>
      <label class="control-row"><span>{{ t('feather') }}</span><input v-model.number="w.softFeather" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(w.softFeather*100) }}%</output></label>
    </fieldset>
    <template v-if="binding&&w.selectedSlot">
      <div class="my-3 flex items-center justify-between gap-1 text-muted"><span class="truncate">{{ w.selectedAttachment?.name??w.selectedSlot.name }}</span><span class="shrink-0">{{ binding.vertices.length }} {{ t('vertices') }}</span></div>
      <AppButton v-if="w.editMode!==(w.selectedAttachment?.clipping?'clipping':'meshes')" class="w-full" :disabled="!editable" @click="editMesh">{{ animate?'Edit deformation':t('editMesh') }}</AppButton><AppButton v-if="animate&&w.selectedAttachment" class="mt-1 w-full" :disabled="!editable" data-testid="deform-key" aria-label="Key deformation" @click="w.insertDeformKey(w.selectedAttachment.id)"><AppIcon name="key"/> Key deformation</AppButton>
      <p class="my-3 text-[11px] leading-4 text-muted">{{ animate?'Move vertices to change this pose. Use Auto Key or Key deformation to save it.':t(w.editMode==='meshes'?'meshHint_'+w.meshTool:'meshOpenHint') }}</p>
      <fieldset :disabled="!editable" class="control-group space-y-2">
        <label v-if="!animate" class="flex items-center gap-2"><input type="checkbox" :checked="!w.meshEditUvs" @change="w.meshEditUvs=!($event.target as HTMLInputElement).checked">{{ t('deformed') }}</label>
        <p v-if="!animate" class="text-[10px] leading-4 text-muted">{{ t(w.meshEditUvs?'setupMeshHint':'deformedMeshHint') }}</p>
        <div class="flex justify-between"><span>{{ t('vertex') }}</span><span>{{ w.selectedVertex===null?'—':w.selectedVertex+1 }}</span></div>
        <label v-for="axis in (['x','y'] as const)" :key="axis" class="control-row"><span>{{ t(axis) }}</span><input type="number" step="any" class="editor-input w-full" :aria-label="t('vertex')+' '+t(axis)" :value="point?.[axis]?.toFixed(3)??''" :disabled="!point" @change="position(axis,$event)" @keydown.esc.prevent="cancelPosition(axis,$event)" @keydown.enter.prevent="enter(axis,$event)"></label>
      </fieldset>
      <div v-if="!animate" class="mt-3 grid grid-cols-2 gap-1">
        <AppButton :disabled="!editable" @click="w.editRig({type:'triangulateMesh',id:w.selectedSlot.id})">{{ t('triangulate') }}</AppButton>
        <AppButton :disabled="!w.canEdit||w.busy||w.traceOpen||w.selectedVertex===null" @click="w.editRig({type:'deleteVertex',id:w.selectedSlot.id,vertex:w.selectedVertex!})">{{ t('deleteVertex') }}</AppButton>
        <AppButton :disabled="!editable" @click="w.openTrace(false)">{{ t('trace') }}</AppButton>
        <AppButton :disabled="!editable" @click="w.openTrace(true)">{{ t('innerTrace') }}</AppButton>
        <AppButton class="col-span-2" :disabled="!editable" @click="w.editRig({type:'resetMesh',id:w.selectedSlot.id})">{{ t('resetQuad') }}</AppButton>
      </div>
      <dl v-if="mesh" class="mt-4 grid grid-cols-2 gap-y-2 border-t border-line pt-3 text-muted"><dt>{{ t('triangles') }}</dt><dd class="text-right">{{ mesh.triangles.length/3 }}</dd><dt>{{ t('hull') }}</dt><dd class="text-right">{{ mesh.hull }}</dd><dt>{{ t('binding') }}</dt><dd class="text-right">{{ t(mesh.weighted?'weighted':'rigid') }}</dd></dl>
    </template>
    <div v-else-if="animate" class="py-4"><p class="leading-5 text-muted" data-testid="select-deform-attachment-hint">Select a mesh or clipping attachment to edit deformation.</p></div>
    <div v-else class="py-4"><p class="mb-3 leading-5 text-muted">{{ t('selectMeshImage') }}</p><AppButton class="w-full" :disabled="animate||!w.canEdit||w.busy||w.traceOpen||!w.selectedSlot?.region" @click="convert">{{ t('convertMesh') }}</AppButton><AppButton v-if="!animate&&w.selectedSlot?.region" class="mt-1 w-full" :disabled="!editable" @click="w.openTrace(false)">{{ t('trace') }}</AppButton></div>
  </div>
</template>
