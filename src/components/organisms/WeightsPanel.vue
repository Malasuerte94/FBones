<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
import {useWeightFieldEditor} from '../../composables/useWeightFieldEditor';
import {weightInfluenceColor} from '../../domain/colors';
import type {BoneView,RigEdit} from '../../domain/project';
const w=useWorkspace(),{t,locale}=useI18n(),chosen=ref<number[]>([]),binding=computed(()=>w.selectedBinding);
const inspectionVertexSelect=ref<HTMLSelectElement|null>(null);
const inspectionPercentage=computed(()=>new Intl.NumberFormat(locale.value,{style:'percent',maximumFractionDigits:2}));
const inspectionInfluences=computed(()=>{
  const target=w.animateWeightsTarget,index=w.animateWeightsVertex;
  if(!target||index===null)return [];
  const row=target.binding.vertices[index];
  if(!row)return [];
  const bones=new Map(w.project?.bones.map(bone=>[bone.id,bone]));
  return target.binding.bones.map((id,column)=>{
    const bone=bones.get(id);
    return {id,name:bone?.name??String(id),color:'#'+weightInfluenceColor(bone,column).toString(16).padStart(6,'0'),
      percentage:inspectionPercentage.value.format(row.weights[column]??0)};
  });
});
function selectInspectionVertex(event:Event){
  const value=(event.target as HTMLSelectElement).value;
  w.selectAnimateWeightsVertex(value===''?null:Number(value)-1);
}
function focusInspection(){inspectionVertexSelect.value?.focus();}
defineExpose({focusInspection});
let lastSetupBindingScope: string | null = null;
watch([
  () => w.editorMode,
  () => w.project?.documentId,
  () => w.selectedSlotId,
  () => w.selectedAttachmentId,
  () => binding.value?.weighted,
  () => binding.value?.bones.join(','),
], ([mode, ...scope]) => {
  if (mode !== 'setup') return;
  const bones = binding.value?.weighted ? binding.value.bones : [];
  const scopeKey = JSON.stringify(scope);
  if (scopeKey !== lastSetupBindingScope) {
    chosen.value = [...bones];
    lastSetupBindingScope = scopeKey;
  }
  if (!bones.includes(w.influence ?? -1)) w.influence = bones[0] ?? null;
}, {immediate: true, flush: 'sync'});
const linkedMesh=computed(()=>w.selectedAttachment?.linkedMeshSourceId!==undefined);
const disabled=computed(()=>linkedMesh.value||!w.canEdit||w.busy||w.traceOpen||!!w.clippingDraft);
const actionHintId = useId();
const pruneHint = computed(() => t(w.canPruneWeights ? 'pruneWeightsHint' : 'pruneWeightsUnavailable'));
const smoothTarget = computed(() => {
  const attachment = w.selectedAttachment;
  return w.sceneEditing && w.editorMode === 'setup' && attachment?.type === 'mesh' && attachment.mesh?.weighted
    ? attachment : null;
});
const smoothHint = computed(() => t(smoothTarget.value ? 'smoothWeightsHint' : 'smoothWeightsUnavailable'));
const setupBindingTarget = computed(() => {
  const attachment = w.selectedAttachment;
  return w.sceneEditing && w.editorMode === 'setup' && binding.value?.weighted &&
    (attachment?.type === 'mesh' || attachment?.type === 'clipping') ? attachment : null;
});
const swapPair = computed<[number, number] | null>(() => {
  const [first, second] = w.weightBones;
  if (w.weightBones.length !== 2 || first === undefined || second === undefined || first === second) return null;
  const boundBones = binding.value?.bones;
  if (!boundBones?.includes(first) || !boundBones.includes(second)) return null;
  return w.weightLocks.includes(first) || w.weightLocks.includes(second) ? null : [first, second];
});
const swapHint = computed(() => t(!setupBindingTarget.value ? 'swapWeightsUnavailable' :
  swapPair.value ? 'swapWeightsHint' : 'swapWeightsSelectionHint'));
const updateBindingsHint = computed(() => t(setupBindingTarget.value ? 'updateBindingsHint' : 'updateBindingsUnavailable'));
const copyWeightsHint = computed(() => t(w.canCopyWeights ? 'copyWeightsHint' : 'weightClipboardTarget'));
const pasteWeightsHint = computed(() => {
  switch (w.weightPasteUnavailable) {
    case 'noClipboard': return t('weightClipboardEmpty');
    case 'target': return t('weightClipboardTarget');
    case 'count': return t('weightClipboardCountMismatch', w.weightClipboardCount);
    case 'bones': return t('weightClipboardBonesMismatch');
    case 'locks': return t('weightClipboardLockMismatch');
    case null: return t('pasteWeightsHint');
  }
});
const clipboardStatus = computed(() => w.weightClipboardCount ? t('weightClipboardRows', w.weightClipboardCount) : '');
const autoScopeKey = computed(() => JSON.stringify(w.weightAutoEdit));
const autoStatus = ref<'autoWeightsDone' | 'autoWeightsSelectedDone' | 'autoWeightsUnchanged' | 'autoWeightsAllLocked' | null>(null);
watch([autoScopeKey, () => w.project?.documentId, () => w.project?.revision, () => w.editorMode],
  () => { autoStatus.value = null; }, {flush: 'sync'});
const editRows=computed(()=>w.weightVertices.length?w.weightVertices:w.weightActiveVertex===null?[]:[w.weightActiveVertex]);
const vertex=computed(()=>w.weightActiveVertex===null?null:binding.value?.vertices[w.weightActiveVertex]??null);
const mixed=computed(()=>{const b=binding.value,first=b?.vertices[editRows.value[0]??-1];return b?.bones.map((_,column)=>!!first&&editRows.value.some(row=>b.vertices[row]?.weights[column]!==first.weights[column]))??[];});
const directWeight=computed(()=>{const b=binding.value,index=b?.bones.indexOf(w.influence??-1)??-1;return b?.weighted&&vertex.value&&index>=0?(vertex.value.weights[index]??0)*100:null;});
const directMixed=computed(()=>mixed.value[binding.value?.bones.indexOf(w.influence??-1)??-1]??false);
function activateTool(){if(!disabled.value&&binding.value?.weighted&&binding.value.bones.length>=2)w.setMode('weights');}
const weightEditor=useWeightFieldEditor({
 current:()=>{const p=w.project,b=binding.value,v=w.weightActiveVertex,id=w.sceneEditing?w.selectedAttachmentId:w.selectedSlotId;if(w.editorMode!=='setup'||!p||!b?.weighted||v===null||!b.vertices[v]||id===null)return null;return{documentId:p.documentId,id,revision:p.revision,vertex:v,scene:w.sceneEditing,editable:!disabled.value&&b.bones.length>=2,bones:b.bones,weights:b.vertices[editRows.value[0]??v]!.weights,mixed:mixed.value,...(editRows.value.length>1?{vertices:[...editRows.value]}:{}),...(w.weightLocks.length?{lockedBones:[...w.weightLocks]}:{})};},
 invalidMessage:()=>t('invalidWeight'),
 edit:(source,bone,value)=>{const locks=source.lockedBones?.length?{lockedBones:[...source.lockedBones]}:{};if(source.vertices&&source.vertices.length>1){const changes=source.vertices.map(vertex=>({vertex,value}));return w.editRig(source.scene?{type:'paintAttachmentWeights',id:source.id,bone,changes,...locks}:{type:'paintWeights',id:source.id,bone,changes},source.revision);}return w.editRig(source.scene?{type:'setAttachmentWeight',id:source.id,vertex:source.vertex,bone,value,...locks}:{type:'setWeight',id:source.id,vertex:source.vertex,bone,value},source.revision);},
});
function check(id:number,on:boolean){chosen.value=on?[...chosen.value,id]:chosen.value.filter(b=>b!==id);}
function bind(bones=chosen.value){
 if(disabled.value)return;
 if(w.sceneEditing){if(w.selectedAttachmentId!==null)void w.editRig({type:'bindAttachment',id:w.selectedAttachmentId,bones:[...bones]});}
 else if(w.selectedSlot)void w.editRig({type:'bindMesh',id:w.selectedSlot.id,bones:[...bones]});
}
async function auto() {
  const edit = w.weightAutoEdit;
  const before = w.project;
  if (disabled.value || !edit || !before || w.editorMode !== 'setup') return;
  const scopeKey = autoScopeKey.value;
  const scope = edit.type === 'autoAttachmentWeights' ? edit.scope : undefined;
  const candidates = scope?.bones ?? binding.value?.bones ?? [];
  const locks = scope?.lockedBones ?? [];
  const allCandidatesLocked = candidates.length > 0 && candidates.every(bone => locks.includes(bone));
  autoStatus.value = null;
  if (!await w.editRig(edit, before.revision)) return;

  const after = w.project;
  if (!after || after.documentId !== before.documentId || w.editorMode !== 'setup' || autoScopeKey.value !== scopeKey) return;
  if (after.revision === before.revision) {
    autoStatus.value = allCandidatesLocked ? 'autoWeightsAllLocked' : 'autoWeightsUnchanged';
  } else if (after.revision === before.revision + 1) {
    autoStatus.value = scope?.bones?.length ? 'autoWeightsSelectedDone' : 'autoWeightsDone';
  }
}
function normalize(){if(disabled.value)return;if(w.sceneEditing){if(w.selectedAttachmentId!==null)void w.editRig({type:'normalizeAttachmentWeights',id:w.selectedAttachmentId,...(w.weightLocks.length?{lockedBones:[...w.weightLocks]}:{})});}else if(w.selectedSlot)void w.editRig({type:'normalizeWeights',id:w.selectedSlot.id});}
function smooth() {
  const attachment = smoothTarget.value;
  const model = w.project;
  if (disabled.value || !attachment || !model) return;
  const vertices = [...w.weightVertices];
  const lockedBones = [...w.weightLocks];
  autoStatus.value = null;
  void w.editRig({type: 'smoothAttachmentWeights', id: attachment.id,
    ...(vertices.length ? {vertices} : {}), ...(lockedBones.length ? {lockedBones} : {}),
  }, model.revision);
}
function swap() {
  const attachment = setupBindingTarget.value;
  const bones = swapPair.value;
  const model = w.project;
  if (disabled.value || !attachment || !bones || !model) return;
  const lockedBones = [...w.weightLocks];
  const edit: RigEdit = {type: 'swapAttachmentWeights', id: attachment.id, bones,
    ...(lockedBones.length ? {lockedBones} : {}),
  };
  autoStatus.value = null;
  void w.editRig(edit, model.revision);
}
function updateBindings() {
  const attachment = setupBindingTarget.value;
  const model = w.project;
  if (disabled.value || !attachment || !model) return;
  void w.editRig({type: 'updateAttachmentBindings', id: attachment.id}, model.revision);
}
function identify(id:number,event?:MouseEvent){if(w.chooseInfluence(id,{toggle:!!(event?.ctrlKey||event?.metaKey),shift:!!event?.shiftKey})&&!linkedMesh.value)w.setMode('weights');}
function influenceColor(bone: BoneView) {
  const column = binding.value?.weighted ? binding.value.bones.indexOf(bone.id) : -1;
  return '#' + weightInfluenceColor(bone, column).toString(16).padStart(6, '0');
}
function selectVertex(event:Event){const value=(event.target as HTMLSelectElement).value,index=value===''?null:Number(value);w.selectWeightVertices(index===null?[]:[index],index);}
function leaveFocus(event:FocusEvent,id:number){if(!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node|null))w.clearBoneHover('weights-focus',id);}
onBeforeUnmount(()=>{w.clearBoneHover('weights-pointer');w.clearBoneHover('weights-focus');});

</script>
<template>
  <div class="dock-title"><AppIcon name="weights"/><h2>{{ t('weights') }}</h2></div>
  <div v-if="w.editorMode==='animate'" class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
    role="region" :aria-label="t('inspectWeights')" data-testid="animate-weights-panel">
    <template v-if="w.animateWeightsTarget">
      <div class="flex min-w-0 items-center gap-2">
        <p class="min-w-0 flex-1 truncate text-xs text-accent" :title="w.animateWeightsTarget.name"
          data-testid="animate-weights-target">{{ w.animateWeightsTarget.name }}</p>
        <span class="shrink-0 text-[10px] text-muted">{{ t('animateWeightsReadOnly') }}</span>
      </div>
      <div class="control-group space-y-2">
        <label class="control-row">
          <span>{{ t('vertex') }}</span>
          <select ref="inspectionVertexSelect" class="editor-input min-w-0 flex-1" data-testid="animate-weights-vertex"
            :value="w.animateWeightsVertex===null?'':w.animateWeightsVertex+1" @change="selectInspectionVertex">
            <option value="">{{ t('selectVertex') }}</option>
            <option v-for="(_,i) in w.animateWeightsTarget.binding.vertices" :key="i" :value="i+1">{{ i+1 }}</option>
          </select>
        </label>
        <table v-if="inspectionInfluences.length" class="w-full table-fixed text-[11px]" data-testid="animate-weights-influences">
          <thead class="text-muted">
            <tr><th scope="col" class="text-left font-normal">{{ t('bones') }}</th><th scope="col" class="w-16 text-right font-normal">{{ t('weight') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="influence in inspectionInfluences" :key="influence.id" class="border-t border-line"
              :data-testid="`animate-weights-influence-${influence.id}`">
              <th scope="row" class="py-1 text-left font-normal">
                <span class="flex min-w-0 items-center gap-1.5">
                  <span class="size-2 shrink-0 rounded-full" :style="{backgroundColor:influence.color}" aria-hidden="true"/>
                  <span class="truncate" :title="influence.name">{{ influence.name }}</span>
                </span>
              </th>
              <td class="py-1 text-right tabular-nums">{{ influence.percentage }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p v-else class="text-[11px] leading-4 text-muted">{{ t('animateWeightsUnavailable') }}</p>
  </div>
  <div v-else class="flex min-h-0 flex-1 flex-col overflow-y-auto p-2" tabindex="0"
    role="region" :aria-label="t('weights')" data-weights-clipboard-scope>
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
    <p v-if="linkedMesh" class="mt-2 text-[11px] leading-4 text-muted">{{t('linkedMeshGeometryReadOnly')}}</p>
    <p v-if="!binding" class="py-3 leading-5 text-muted">{{ t('weightsEmpty') }}</p>
    <template v-else>
      <div class="mt-3 mb-1 flex items-center gap-2">
        <h3 class="mr-auto">{{ t('bones') }}</h3>
        <span class="text-muted">{{ chosen.length }} / {{ w.project?.bones.length }}</span>
        <span v-if="w.sceneEditing" :title="swapHint">
          <AppButton :disabled="disabled || !setupBindingTarget || !swapPair" :aria-describedby="`${actionHintId}-swap`"
            data-testid="weights-swap" @click="swap">{{ t('swapWeights') }}</AppButton>
          <span :id="`${actionHintId}-swap`" class="sr-only">{{ swapHint }}</span>
        </span>
      </div>
      <div class="min-h-24 flex-1 overflow-auto rounded-sm border border-line bg-raised/50 p-1">
        <label v-for="bone in w.project?.bones" :key="bone.id" class="flex items-center gap-1.5 px-1 py-1" :class="[w.weightBones.includes(bone.id)?'bg-accent/15 text-accent':w.influence===bone.id?'text-accent':'',w.hoveredBoneId===bone.id?'outline outline-1 -outline-offset-1 outline-warning/80':'']" :data-weight-bone="bone.id" :data-weight-selected="w.weightBones.includes(bone.id)?'true':undefined" :data-bone-hovered="w.hoveredBoneId===bone.id?'true':undefined" @pointerenter="w.hoverBone('weights-pointer',bone.id)" @pointerleave="w.clearBoneHover('weights-pointer',bone.id)" @focusin="w.hoverBone('weights-focus',bone.id)" @focusout="leaveFocus($event,bone.id)">
          <input type="checkbox" :checked="chosen.includes(bone.id)" :disabled="disabled" :aria-label="t('bind')+' '+bone.name" @change="check(bone.id,($event.target as HTMLInputElement).checked)"/>
          <button v-if="w.sceneEditing&&binding.weighted&&binding.bones.includes(bone.id)" type="button" class="group flex size-4 shrink-0 items-center justify-center rounded-sm border border-line text-white" :style="{backgroundColor:influenceColor(bone)}" :aria-label="t('toggleWeightLock',{name:bone.name})" :title="t('weightLockHint')" :aria-pressed="w.weightLocks.includes(bone.id)" :disabled="disabled" :data-testid="`weights-lock-${bone.id}`" @click="w.toggleWeightLock(bone.id)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" class="size-3" :class="w.weightLocks.includes(bone.id)?'opacity-100':'opacity-0 group-hover:opacity-80 group-focus-visible:opacity-80'"><rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5 7V4.5a3 3 0 0 1 6 0V7"/></svg></button>
          <span v-else class="size-2 shrink-0 rounded-full" :style="{backgroundColor:influenceColor(bone)}"/>
          <button type="button" class="min-w-0 flex-1 truncate text-left" :aria-pressed="w.sceneEditing?w.weightBones.includes(bone.id):binding.weighted&&binding.bones.includes(bone.id)&&w.influence===bone.id" @click="identify(bone.id,$event)">{{ bone.name }}</button>
          <span v-if="binding.weighted&&binding.bones.includes(bone.id)" class="text-[10px] text-muted">{{ t('bound') }}</span>
        </label>
      </div>
      <div class="mt-1 grid grid-cols-3 gap-1">
        <AppButton :disabled="disabled||!chosen.length" data-testid="weights-bind" @click="bind()">{{ t('bind') }}</AppButton>
        <AppButton :disabled="disabled||w.editorMode!=='setup'||!binding.weighted||binding.bones.length<2" :title="t(w.editorMode!=='setup'?'autoWeightsSetupHint':w.sceneEditing?'autoWeightsScopeHint':'autoWeightsAllHint')" data-testid="weights-auto" @click="auto">{{ t('autoWeights') }}</AppButton>
        <AppButton :disabled="disabled||!binding.weighted" data-testid="weights-unbind" @click="bind([])">{{ t('unbind') }}</AppButton>
      </div>
      <p role="status" aria-atomic="true" data-testid="weights-auto-result" :class="autoStatus?'mt-1 text-[11px] text-muted':'sr-only'">{{ autoStatus ? t(autoStatus) : '' }}</p>
      <div v-if="w.sceneEditing" class="mt-1 self-start" :title="updateBindingsHint">
        <AppButton :disabled="disabled || !setupBindingTarget" :aria-describedby="`${actionHintId}-update-bindings`"
          data-testid="weights-update-bindings" @click="updateBindings">{{ t('updateBindings') }}</AppButton>
        <span :id="`${actionHintId}-update-bindings`" class="sr-only">{{ updateBindingsHint }}</span>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" role="group" :aria-label="t('weightDisplay')">
        <label class="flex items-center gap-1" :title="t('weightPiesHint')">
          <input v-model="w.weightDisplay.pies" :disabled="!binding.weighted" type="checkbox" data-testid="weights-pies"/>
          {{ t('weightPies') }}
        </label>
        <label class="flex items-center gap-1" :title="t('weightOverlayHint')">
          <input v-model="w.weightDisplay.overlay" :disabled="!binding.weighted" type="checkbox" data-testid="weights-overlay"/>
          {{ t('weightOverlay') }}
        </label>
        <label class="flex items-center gap-1" :title="t('weightSelectedHint')">
          <input v-model="w.weightDisplay.selectedOnly" :disabled="!binding.weighted||(!w.weightDisplay.pies&&!w.weightDisplay.overlay)" type="checkbox" data-testid="weights-pies-selected"/>
          {{ t('weightSelected') }}
        </label>
      </div>
      <div v-if="w.sceneEditing&&binding.weighted" class="mt-2 space-y-1 text-[11px] text-muted">
        <p data-testid="weights-auto-scope">{{t('autoWeightsScope',{vertices:w.weightVertices.length||t('all'),bones:w.weightBones.length||t('all')})}}</p>
        <div class="flex gap-1"><AppButton class="flex-1 !text-[10px]" data-testid="weights-all-vertices" :disabled="!w.weightVertices.length" @click="w.clearWeightVertices">{{t('allVertices')}}</AppButton><AppButton class="flex-1 !text-[10px]" data-testid="weights-all-influences" :disabled="!w.weightBones.length" @click="w.clearWeightBones">{{t('allInfluences')}}</AppButton></div>
      </div>
      <p class="my-2 text-[11px] leading-4 text-muted">{{ t(!binding.weighted?'bindHint':w.sceneEditing?'bindMembershipHint':'paintHint') }}</p>
      <p v-if="w.weightLocks.length" class="mb-2 text-[10px] leading-4 text-muted">{{t('weightLocksSessionHint')}}</p>
      <div class="control-group mt-1">
        <label class="control-row mb-2"><span>{{ t('vertex') }}<span v-if="w.weightVertices.length>1"> ({{w.weightVertices.length}})</span></span><select :value="w.weightActiveVertex??''" @change="selectVertex" data-testid="weights-vertex" class="editor-input flex-1"><option value="">{{ t('selectVertex') }}</option><option v-for="(_,i) in binding.vertices" :key="i" :value="i">{{ i+1 }}</option></select></label>
        <div v-if="w.sceneEditing && binding.weighted" class="mb-2">
          <div class="flex flex-wrap gap-1">
            <span class="flex flex-1" :title="copyWeightsHint">
              <AppButton class="flex-1" :disabled="!w.canCopyWeights" :aria-describedby="`${actionHintId}-copy`"
                aria-keyshortcuts="Control+C Meta+C" data-testid="weights-copy" @click="w.copyWeights">{{ t('copyWeights') }}</AppButton>
            </span>
            <span class="flex flex-1" :title="pasteWeightsHint">
              <AppButton class="flex-1" :disabled="disabled||!w.canPasteWeights" :aria-describedby="`${actionHintId}-paste`"
                aria-keyshortcuts="Control+V Meta+V" data-testid="weights-paste" @click="w.pasteWeights">{{ t('pasteWeights') }}</AppButton>
            </span>
          </div>
          <p :id="`${actionHintId}-copy`" class="sr-only">{{ copyWeightsHint }}</p>
          <p role="status" aria-atomic="true" data-testid="weights-clipboard-status"
            :class="clipboardStatus ? 'mt-1 text-[11px] text-muted' : 'sr-only'">{{ clipboardStatus }}</p>
          <p :id="`${actionHintId}-paste`" data-testid="weights-paste-hint"
            :class="clipboardStatus && w.weightPasteUnavailable && !w.busy ? 'text-[11px] leading-4 text-muted' : 'sr-only'">{{ pasteWeightsHint }}</p>
        </div>
        <div v-if="vertex&&binding.weighted" class="space-y-1">
          <label v-for="(id,i) in binding.bones" :key="id" class="control-row"><span class="truncate">{{ w.project?.bones.find(b=>b.id===id)?.name }}</span><input type="number" min="0" max="100" step="0.1" class="editor-input w-20" :aria-label="t('weight')+' '+w.project?.bones.find(b=>b.id===id)?.name" :key="weightEditor.key(id)" v-bind="weightEditor.field(id)" :disabled="disabled||binding.bones.length<2"/><span>%</span></label>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-1">
          <AppButton class="flex-1" :disabled="disabled||!binding.weighted" data-testid="weights-normalize" :title="t('normalizeWeightsHint')" @click="normalize">{{ t('normalizeWeights') }}</AppButton>
          <span :title="smoothHint">
            <AppButton :disabled="disabled || !smoothTarget" :aria-describedby="`${actionHintId}-smooth`"
              data-testid="weights-smooth" @click="smooth">{{ t('smoothWeights') }}</AppButton>
            <span :id="`${actionHintId}-smooth`" class="sr-only">{{ smoothHint }}</span>
          </span>
          <span :title="pruneHint">
            <AppButton :disabled="disabled||!w.canPruneWeights" :aria-describedby="`${actionHintId}-prune`"
              data-testid="weights-prune" @click="w.openPrune">{{ t('pruneWeights') }}</AppButton>
            <span :id="`${actionHintId}-prune`" class="sr-only">{{ pruneHint }}</span>
          </span>
          <span :title="t('weldWeightsUnavailable')">
            <AppButton disabled :aria-describedby="`${actionHintId}-weld`" data-testid="weights-weld">
              {{ t('weldWeights') }}
            </AppButton>
            <span :id="`${actionHintId}-weld`" class="sr-only">{{ t('weldWeightsUnavailable') }}</span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
