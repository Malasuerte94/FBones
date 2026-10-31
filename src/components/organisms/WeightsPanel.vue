<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
import {useWeightFieldEditor} from '../../composables/useWeightFieldEditor';
const w=useWorkspace(),{t}=useI18n(),chosen=ref<number[]>([]),binding=computed(()=>w.selectedBinding);
watch(()=>[w.project?.documentId,w.selectedSlotId,w.selectedAttachmentId,binding.value?.weighted,binding.value?.bones.join(',')],()=>{chosen.value=binding.value?.weighted?[...binding.value.bones]:[];if(!binding.value?.weighted||!binding.value.bones.includes(w.influence??-1))w.influence=binding.value?.weighted?binding.value.bones[0]??null:null;},{immediate:true,flush:'sync'});
const disabled=computed(()=>!w.canEdit||w.busy||w.traceOpen||!!w.clippingDraft);
const editRows=computed(()=>w.weightVertices.length?w.weightVertices:w.weightActiveVertex===null?[]:[w.weightActiveVertex]);
const vertex=computed(()=>w.weightActiveVertex===null?null:binding.value?.vertices[w.weightActiveVertex]??null);
const mixed=computed(()=>{const b=binding.value,first=b?.vertices[editRows.value[0]??-1];return b?.bones.map((_,column)=>!!first&&editRows.value.some(row=>b.vertices[row]?.weights[column]!==first.weights[column]))??[];});
const directWeight=computed(()=>{const b=binding.value,index=b?.bones.indexOf(w.influence??-1)??-1;return b?.weighted&&vertex.value&&index>=0?(vertex.value.weights[index]??0)*100:null;});
const directMixed=computed(()=>mixed.value[binding.value?.bones.indexOf(w.influence??-1)??-1]??false);
function activateTool(){if(binding.value?.weighted&&binding.value.bones.length>=2)w.setMode('weights');}
const weightEditor=useWeightFieldEditor({
 current:()=>{const p=w.project,b=binding.value,v=w.weightActiveVertex,id=w.sceneEditing?w.selectedAttachmentId:w.selectedSlotId;if(!p||!b?.weighted||v===null||!b.vertices[v]||id===null)return null;return{documentId:p.documentId,id,revision:p.revision,vertex:v,scene:w.sceneEditing,editable:!disabled.value&&b.bones.length>=2,bones:b.bones,weights:b.vertices[editRows.value[0]??v]!.weights,mixed:mixed.value,...(editRows.value.length>1?{vertices:[...editRows.value]}:{}),...(w.weightLocks.length?{lockedBones:[...w.weightLocks]}:{})};},
 invalidMessage:()=>t('invalidWeight'),
 edit:(source,bone,value)=>{const locks=source.lockedBones?.length?{lockedBones:[...source.lockedBones]}:{};if(source.vertices&&source.vertices.length>1){const changes=source.vertices.map(vertex=>({vertex,value}));return w.editRig(source.scene?{type:'paintAttachmentWeights',id:source.id,bone,changes,...locks}:{type:'paintWeights',id:source.id,bone,changes},source.revision);}return w.editRig(source.scene?{type:'setAttachmentWeight',id:source.id,vertex:source.vertex,bone,value,...locks}:{type:'setWeight',id:source.id,vertex:source.vertex,bone,value},source.revision);},
});
function check(id:number,on:boolean){chosen.value=on?[...chosen.value,id]:chosen.value.filter(b=>b!==id);}
function bind(bones=chosen.value){
 if(w.sceneEditing){if(w.selectedAttachmentId!==null)void w.editRig({type:'bindAttachment',id:w.selectedAttachmentId,bones:[...bones]});}
 else if(w.selectedSlot)void w.editRig({type:'bindMesh',id:w.selectedSlot.id,bones:[...bones]});
}
function auto(){const edit=w.weightAutoEdit;if(edit)void w.editRig(edit);}
function normalize(){if(w.sceneEditing){if(w.selectedAttachmentId!==null)void w.editRig({type:'normalizeAttachmentWeights',id:w.selectedAttachmentId,...(w.weightLocks.length?{lockedBones:[...w.weightLocks]}:{})});}else if(w.selectedSlot)void w.editRig({type:'normalizeWeights',id:w.selectedSlot.id});}
function identify(id:number,event?:MouseEvent){if(w.chooseInfluence(id,{toggle:!!(event?.ctrlKey||event?.metaKey),shift:!!event?.shiftKey}))w.setMode('weights');}
function selectVertex(event:Event){const value=(event.target as HTMLSelectElement).value,index=value===''?null:Number(value);w.selectWeightVertices(index===null?[]:[index],index);}
function leaveFocus(event:FocusEvent,id:number){if(!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node|null))w.clearBoneHover('weights-focus',id);}
onBeforeUnmount(()=>{w.clearBoneHover('weights-pointer');w.clearBoneHover('weights-focus');});

</script>
<template>
  <div class="dock-title"><AppIcon name="weights"/><h2>{{ t('weights') }}</h2></div>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
    <fieldset :disabled="!binding||disabled" class="control-group space-y-2">
      <label class="control-row"><span>{{ t('influence') }}</span><select v-model="w.influence" data-testid="weights-influence" class="editor-input min-w-0 flex-1"><option v-if="!binding?.weighted" :value="null">—</option><option v-for="id in binding?.weighted?binding.bones:[]" :key="id" :value="id">{{ w.project?.bones.find(b=>b.id===id)?.name }}</option></select></label>
      <label class="control-row"><span>{{ t('mode') }}</span><select v-model="w.brushMode" data-testid="weights-mode" class="editor-input flex-1" @change="activateTool"><option v-for="mode in ['direct','add','subtract','replace','smooth']" :key="mode" :value="mode">{{ t('brush_'+mode) }}</option></select></label>
      <label v-if="w.brushMode==='direct'" class="control-row" data-testid="weights-direct-control"><span>{{t('weight')}}</span><input type="range" min="0" max="100" step="0.1" :key="'slider-'+weightEditor.key(w.influence)" v-bind="weightEditor.field(w.influence)" :disabled="directMixed||directWeight===null||!binding?.weighted||binding.bones.length<2" :aria-label="t('weight')" data-testid="weights-direct-slider"/><input type="number" min="0" max="100" step="0.1" class="editor-input w-16" :key="'number-'+weightEditor.key(w.influence)" v-bind="weightEditor.field(w.influence)" :disabled="directWeight===null||!binding?.weighted||binding.bones.length<2" :aria-label="t('weight')" data-testid="weights-direct-number"/><span>%</span></label>
      <template v-else>
      <label class="control-row"><span>{{ t('strength') }}</span><input v-model.number="w.brushStrength" type="range" min="0" max="1" step="0.01"/><output>{{ Math.round(w.brushStrength*100) }}%</output></label>
      <label class="control-row"><span>{{ t('size') }}</span><input v-model.number="w.brushSize" type="range" min="10" max="400"/><output>{{ w.brushSize }}</output></label>
      <label class="control-row"><span>{{ t('feather') }}</span><input v-model.number="w.brushFeather" type="range" min="0" max="1" step="0.01"/><output>{{ Math.round(w.brushFeather*100) }}%</output></label>
      </template>
      <AppButton class="w-full" :class="w.editMode==='weights'?'!border-accent !text-accent':''" :disabled="!binding?.weighted||(binding?.bones.length??0)<2" @click="w.setMode('weights')"><AppIcon name="weights"/>{{ t(w.brushMode==='direct'?'editWeights':'paintWeights') }}</AppButton>
    </fieldset>
    <p v-if="binding" data-testid="weights-target" class="mt-2 truncate text-xs text-accent" :title="w.selectedAttachment?.name??w.selectedSlot?.name">{{w.selectedAttachment?.name??w.selectedSlot?.name}}</p>
    <p v-if="!binding" class="py-3 leading-5 text-muted">{{ t('weightsEmpty') }}</p>
    <template v-else>
      <div class="mt-3 mb-1 flex items-center justify-between"><h3>{{ t('bones') }}</h3><span class="text-muted">{{ chosen.length }} / {{ w.project?.bones.length }}</span></div>
      <div class="min-h-24 flex-1 overflow-auto rounded-sm border border-line bg-raised/50 p-1">
        <label v-for="bone in w.project?.bones" :key="bone.id" class="flex items-center gap-1.5 px-1 py-1" :class="[w.weightBones.includes(bone.id)?'bg-accent/15 text-accent':w.influence===bone.id?'text-accent':'',w.hoveredBoneId===bone.id?'outline outline-1 -outline-offset-1 outline-warning/80':'']" :data-weight-bone="bone.id" :data-weight-selected="w.weightBones.includes(bone.id)?'true':undefined" :data-bone-hovered="w.hoveredBoneId===bone.id?'true':undefined" @pointerenter="w.hoverBone('weights-pointer',bone.id)" @pointerleave="w.clearBoneHover('weights-pointer',bone.id)" @focusin="w.hoverBone('weights-focus',bone.id)" @focusout="leaveFocus($event,bone.id)">
          <input type="checkbox" :checked="chosen.includes(bone.id)" :disabled="disabled" :aria-label="t('bind')+' '+bone.name" @change="check(bone.id,($event.target as HTMLInputElement).checked)"/>
          <button v-if="w.sceneEditing&&binding.weighted&&binding.bones.includes(bone.id)" type="button" class="group flex size-4 shrink-0 items-center justify-center rounded-sm border border-line text-white" :style="{backgroundColor:'#'+((bone.color??0x9b9b9bff)>>>8).toString(16).padStart(6,'0')}" :aria-label="t('toggleWeightLock',{name:bone.name})" :title="t('weightLockHint')" :aria-pressed="w.weightLocks.includes(bone.id)" :disabled="disabled" :data-testid="`weights-lock-${bone.id}`" @click="w.toggleWeightLock(bone.id)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" class="size-3" :class="w.weightLocks.includes(bone.id)?'opacity-100':'opacity-0 group-hover:opacity-80 group-focus-visible:opacity-80'"><rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5 7V4.5a3 3 0 0 1 6 0V7"/></svg></button>
          <span v-else class="size-2 shrink-0 rounded-full" :style="{backgroundColor:'#'+((bone.color??0x9b9b9bff)>>>8).toString(16).padStart(6,'0')}"/>
          <button type="button" class="min-w-0 flex-1 truncate text-left" :aria-pressed="w.sceneEditing?w.weightBones.includes(bone.id):binding.weighted&&binding.bones.includes(bone.id)&&w.influence===bone.id" @click="identify(bone.id,$event)">{{ bone.name }}</button>
          <span v-if="binding.weighted&&binding.bones.includes(bone.id)" class="text-[10px] text-muted">{{ t('bound') }}</span>
        </label>
      </div>
      <div class="mt-1 grid grid-cols-3 gap-1">
        <AppButton :disabled="disabled||!chosen.length" data-testid="weights-bind" @click="bind()">{{ t('bind') }}</AppButton>
        <AppButton :disabled="disabled||!binding.weighted||binding.bones.length<2" :title="t(w.sceneEditing?'autoWeightsScopeHint':'autoWeightsAllHint')" data-testid="weights-auto" @click="auto">{{ t('autoWeights') }}</AppButton>
        <AppButton :disabled="disabled||!binding.weighted" data-testid="weights-unbind" @click="bind([])">{{ t('unbind') }}</AppButton>
      </div>
      <div v-if="w.sceneEditing&&binding.weighted" class="mt-2 space-y-1 text-[11px] text-muted">
        <p data-testid="weights-auto-scope">{{t('autoWeightsScope',{vertices:w.weightVertices.length||t('all'),bones:w.weightBones.length||t('all')})}}</p>
        <div class="flex gap-1"><AppButton class="flex-1 !text-[10px]" data-testid="weights-all-vertices" :disabled="!w.weightVertices.length" @click="w.clearWeightVertices">{{t('allVertices')}}</AppButton><AppButton class="flex-1 !text-[10px]" data-testid="weights-all-influences" :disabled="!w.weightBones.length" @click="w.clearWeightBones">{{t('allInfluences')}}</AppButton></div>
      </div>
      <p class="my-2 text-[11px] leading-4 text-muted">{{ t(!binding.weighted?'bindHint':w.sceneEditing?'bindMembershipHint':'paintHint') }}</p>
      <p v-if="w.weightLocks.length" class="mb-2 text-[10px] leading-4 text-muted">{{t('weightLocksSessionHint')}}</p>
      <div class="control-group mt-1">
        <label class="control-row mb-2"><span>{{ t('vertex') }}<span v-if="w.weightVertices.length>1"> ({{w.weightVertices.length}})</span></span><select :value="w.weightActiveVertex??''" @change="selectVertex" data-testid="weights-vertex" class="editor-input flex-1"><option value="">{{ t('selectVertex') }}</option><option v-for="(_,i) in binding.vertices" :key="i" :value="i">{{ i+1 }}</option></select></label>
        <div v-if="vertex&&binding.weighted" class="space-y-1">
          <label v-for="(id,i) in binding.bones" :key="id" class="control-row"><span class="truncate">{{ w.project?.bones.find(b=>b.id===id)?.name }}</span><input type="number" min="0" max="100" step="0.1" class="editor-input w-20" :aria-label="t('weight')+' '+w.project?.bones.find(b=>b.id===id)?.name" :key="weightEditor.key(id)" v-bind="weightEditor.field(id)" :disabled="disabled||binding.bones.length<2"/><span>%</span></label>
        </div>
        <AppButton class="mt-2 w-full" :disabled="disabled||!binding.weighted" data-testid="weights-normalize" :title="t('normalizeWeightsHint')" @click="normalize">{{ t('normalizeWeights') }}</AppButton>
      </div>
    </template>
  </div>
</template>
