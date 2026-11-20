<script setup lang="ts">
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {useSceneFieldEditor} from '../../composables/useSceneFieldEditor';
import {attachmentTransformFields,type AttachmentTransformEditor} from '../../composables/useAttachmentTransformEditor';
import AppButton from '../atoms/AppButton.vue';
import SequenceInspector from './SequenceInspector.vue';
import AttachmentColorEditor from './AttachmentColorEditor.vue';
const w=useWorkspace(),{t}=useI18n();
defineProps<{transformEditor:AttachmentTransformEditor}>();
const attachment=computed(()=>w.selectedAttachment);
const owner=computed(()=>w.sceneSlots.find(slot=>slot.id===attachment.value?.slot)??null);
const linkedMesh=computed(()=>attachment.value?.linkedMeshSourceId!==undefined);
const pathAttachment=computed(()=>attachment.value?.type==='path');
const meshSource=computed(()=>w.sceneAttachments.find(item=>item.id===attachment.value?.linkedMeshSourceId));
const inheritsTimelines=computed(()=>attachment.value?.linkedMeshInheritsTimelines!==false);
const canChangeInheritance=computed(()=>linkedMesh.value&&w.selectedAttachmentIds.length===1&&w.editorMode==='setup'&&
 w.sceneEditing&&w.canEdit&&!w.busy&&!w.editing&&!w.openingProject&&!w.traceOpen&&!w.pruneOpen&&!w.clippingDraft&&
 !w.meshOutlineDraft&&!w.parentPicking&&!w.newDialog&&!w.discardDialog&&!w.inspectorError);
const canMove=computed(()=>!linkedMesh.value&&!pathAttachment.value&&w.sceneEditing&&w.canEdit&&!w.busy&&!w.traceOpen&&!w.clippingDraft&&!w.inspectorError);
const canPath=computed(()=>w.sceneEditing&&w.canEdit&&!w.busy&&!w.traceOpen&&!w.clippingDraft&&!w.parentPicking&&!w.newDialog&&!w.discardDialog&&!!attachment.value?.region);
const pathEditor=useSceneFieldEditor({current:()=>{
 const a=attachment.value,p=w.project;if(!a?.region||!p)return null;
 return{id:a.id,documentId:p.documentId,revision:p.revision,editable:canPath.value,values:{imagePath:a.region.imagePath??a.region.image}};
},numeric:()=>false,invalidMessage:()=>t('invalidImagePath'),edit:(_key,value,revision)=>w.setAttachmentImagePath(String(value),revision)});
function chooseImage(event:Event){
 const select=event.target as HTMLSelectElement,key=select.value;
 if(canPath.value&&w.library.images.some(image=>image.key===key)){pathEditor.draft.imagePath=key;void pathEditor.commit('imagePath');}
 select.selectedIndex=0;
}
const editor=useSceneFieldEditor({current:()=>{const a=attachment.value,p=w.project;if(!a||!p)return null;return{id:a.id,documentId:p.documentId,revision:p.revision,editable:w.canEdit,values:{name:a.name}};},numeric:()=>false,invalidMessage:()=>t('invalidTransform'),edit:(_key,value,revision)=>w.renameAttachment(String(value),revision)});
function clipBoolean(key:'convex'|'inverse',event:Event){void w.editClipping({[key]:(event.target as HTMLInputElement).checked});}
function clipColor(event:Event){const c=attachment.value?.clipping;if(!c)return;const rgb=Number.parseInt((event.target as HTMLInputElement).value.slice(1),16);void w.editClipping({color:((rgb<<8)|(c.color&255))>>>0});}
async function editMesh(){const a=attachment.value;if(!a?.region||linkedMesh.value)return;const ok=a.mesh||await w.editRig(w.sceneEditing?{type:'attachmentEdit',id:a.id,edit:{type:'convertMesh',id:a.slot}}:{type:'convertMesh',id:a.slot});if(ok)w.setMode('meshes');}
async function changeInheritance(event:Event){
 const input=event.target as HTMLInputElement, target=attachment.value, project=w.project;
 if(!target||!project||!canChangeInheritance.value){input.checked=inheritsTimelines.value;return;}
 const success=await w.editRig({type:'setLinkedMeshInheritance',id:target.id,inheritTimelines:input.checked},project.revision);
 if(!success&&w.project?.documentId===project.documentId&&attachment.value?.id===target.id)input.checked=inheritsTimelines.value;
}
async function moveOwner(event:Event){
 const select=event.target as HTMLSelectElement,a=attachment.value,project=w.project;
 if(!canMove.value||!a||!project)return;
 const target=Number(select.value);
 if(!w.sceneSlots.some(slot=>slot.id===target)||target===a.slot)return;
 const success=await w.moveAttachment(a.id,target,project.revision);
 if(!success&&w.project?.documentId===project.documentId&&attachment.value?.id===a.id)select.value=String(attachment.value.slot);
}
</script>
<template>
 <section v-if="attachment" class="inspector-form border-b border-line p-2" data-testid="attachment-inspector">
  <h3 class="mb-3 flex items-center justify-between text-xs font-medium text-accent"><span>{{t(linkedMesh?'newLinkedMesh':'attachment_'+attachment.type)}}</span><span class="text-[10px] text-muted">{{t(owner?.activeAttachmentId===attachment.id?'activeAttachment':'inactiveAttachment')}}</span></h3>
  <div v-if="linkedMesh" class="mb-3 text-[10px] leading-4 text-muted">
   <p v-if="meshSource" class="break-words" data-testid="linked-mesh-source">{{t('linkedMeshSource',{name:meshSource.name})}}</p>
   <label v-if="w.editorMode==='setup'" :key="attachment.id" class="my-1 inline-flex items-center gap-1.5 text-xs">
    <input type="checkbox" :checked="inheritsTimelines" :disabled="!canChangeInheritance"
     data-testid="linked-mesh-inherit-timelines" @change="changeInheritance"/>
    {{t('linkedMeshInheritTimelines')}}
   </label>
   <p>{{t('linkedMeshGeometryReadOnly')}}</p>
  </div>
  <div v-if="w.meshWireframeTargetId===attachment.id" class="mb-3">
   <label class="inline-flex items-center gap-1.5 text-xs text-muted" :title="t('meshWireframeHint')">
    <input type="checkbox" :checked="w.meshWireframeAttachments.has(attachment.id)" :disabled="w.openingProject"
     data-testid="attachment-mesh-wireframe" aria-describedby="attachment-mesh-wireframe-hint"
     @change="w.setMeshWireframe(attachment.id,($event.target as HTMLInputElement).checked)"/>
    {{t('meshWireframe')}}
   </label>
   <span id="attachment-mesh-wireframe-hint" class="sr-only">{{t('meshWireframeHint')}}</span>
  </div>
  <fieldset :disabled="!w.canEdit||w.busy" class="space-y-3">
   <label class="block text-xs text-muted">{{t('attachmentName')}}<input v-model="editor.draft.name" data-testid="attachment-name" :disabled="!w.sceneEditing" maxlength="120" class="editor-input mt-1 w-full" @change="editor.commit('name')" @keydown.enter.prevent="editor.enter($event,'name')" @keydown.esc.prevent="editor.escape"/></label>
   <div v-if="attachment.region" class="space-y-1.5">
    <label class="block text-xs text-muted">{{t('imagePath')}}<input v-model="pathEditor.draft.imagePath" data-testid="attachment-image-path" :aria-label="t('imagePath')" :placeholder="attachment.name" :disabled="!canPath" spellcheck="false" autocomplete="off" class="editor-input mt-1 w-full" @change="pathEditor.commit('imagePath')" @blur="pathEditor.commit('imagePath')" @keydown.enter.prevent="pathEditor.enter($event,'imagePath')" @keydown.esc.prevent="pathEditor.escape"/></label>
    <select value="" data-testid="attachment-image-library" :aria-label="t('chooseAttachmentImage')" :disabled="!canPath||!w.library.images.length" class="editor-input w-full" @change="chooseImage"><option value="" disabled>{{t('chooseAttachmentImage')}}</option><option v-for="image in w.library.images" :key="image.key" :value="image.key">{{image.key}}.png · {{image.width}} × {{image.height}}</option></select>
    <p class="text-[10px] leading-4 text-muted">{{t('imagePathGeometryHint')}}</p>
   </div>
   <label class="block text-xs text-muted">{{t('ownerSlot')}}<select v-if="w.sceneEditing" :value="attachment.slot" :disabled="!canMove" class="editor-input mt-1 w-full" data-testid="attachment-owner" @change="moveOwner"><option v-for="slot in w.sceneSlots" :key="slot.id" :value="slot.id">{{slot.name}}</option></select><input v-else :value="owner?.name" class="editor-input mt-1 w-full text-muted" readonly/></label>
   <p v-if="w.sceneEditing&&!linkedMesh&&!pathAttachment" class="text-[10px] leading-4 text-muted">{{t('attachmentMoveHint')}}</p>
   <button class="dock-tab w-full" :aria-pressed="owner?.activeAttachmentId===attachment.id" @click="w.toggleAttachment(attachment.slot,attachment.id)">{{t(owner?.activeAttachmentId===attachment.id?'deactivateSelectedAttachment':'activateSelectedAttachment')}}</button>
   <div v-if="pathAttachment&&attachment.path" data-testid="path-attachment-settings">
    <dl class="grid grid-cols-2 gap-1 text-xs text-muted">
     <dt>{{t('pathShape')}}</dt><dd class="text-right text-ink" data-testid="path-closed">{{t(attachment.path.closed?'pathClosed':'pathOpen')}}</dd>
     <dt>{{t('pathSpeed')}}</dt><dd class="text-right text-ink" data-testid="path-constant-speed">{{t(attachment.path.constantSpeed?'pathSpeedConstant':'pathSpeedVariable')}}</dd>
     <dt>{{t('pathPointCount')}}</dt><dd class="text-right text-ink" data-testid="path-point-count">{{attachment.path.vertices.length}}</dd>
    </dl>
    <p class="mt-1 text-[10px] leading-4 text-muted">{{t('pathGeometryReadOnly')}}</p>
   </div>
   <template v-if="attachment.clipping">
    <p class="text-[11px] leading-4 text-muted">{{t('clipStartOwner')}}</p>
    <label class="block text-xs text-muted">{{t('clipEnd')}}<select class="editor-input mt-1 w-full" :value="attachment.clipping.endSlot" data-testid="clipping-end" @change="w.editClipping({endSlot:Number(($event.target as HTMLSelectElement).value)})"><option v-for="slot in w.sceneSlots" :key="slot.id" :value="slot.id">{{slot.name}}</option></select></label>
    <div class="flex gap-4 text-xs"><label class="flex items-center gap-1"><input type="checkbox" :checked="attachment.clipping.convex" :disabled="attachment.clipping.inverse" data-testid="clipping-convex" @change="clipBoolean('convex',$event)"/>{{t('convex')}}</label><label class="flex items-center gap-1"><input type="checkbox" :checked="attachment.clipping.inverse" data-testid="clipping-inverse" @change="clipBoolean('inverse',$event)"/>{{t('inverse')}}</label></div>
    <label class="flex items-center justify-between text-xs text-muted">{{t('outlineColor')}}<input type="color" :value="'#'+(attachment.clipping.color>>>8).toString(16).padStart(6,'0')" @change="clipColor"/></label>
    <p class="text-[11px] text-muted">{{t('clipVertexCount',{count:attachment.clipping.vertices.length})}}</p>
    <AppButton class="w-full" @click="w.beginClippingEdit(attachment.id)">{{t('editClipping')}}</AppButton>
    <div v-if="w.editorMode==='setup'&&w.sceneEditing&&attachment.type==='clipping'&&w.selectedAttachmentIds.length===1&&w.selectedAttachmentIds[0]===attachment.id" class="flex flex-wrap gap-1">
     <span :title="t('clippingResetUnavailable')">
      <AppButton disabled data-testid="attachment-clipping-reset" aria-describedby="attachment-clipping-reset-hint">{{t('clippingReset')}}</AppButton>
      <span id="attachment-clipping-reset-hint" class="sr-only">{{t('clippingResetUnavailable')}}</span>
     </span>
     <span :title="t('clippingFreezeUnavailable')">
      <AppButton disabled data-testid="attachment-clipping-freeze" aria-describedby="attachment-clipping-freeze-hint">{{t('clippingFreeze')}}</AppButton>
      <span id="attachment-clipping-freeze-hint" class="sr-only">{{t('clippingFreezeUnavailable')}}</span>
     </span>
    </div>
    <AppButton class="w-full" data-testid="clipping-weights" @click="w.setMode('weights')">{{t('weights')}}</AppButton>
   </template>
   <div v-else-if="!pathAttachment&&transformEditor.targetId.value===attachment.id" role="group" :aria-label="t('attachmentOwnerLocal')">
    <div class="mb-1 text-[11px] text-muted">{{t('attachmentOwnerLocal')}}</div>
    <div class="grid grid-cols-2 gap-2">
     <label v-for="field in attachmentTransformFields" :key="field" class="text-[11px] text-muted">{{t(field)}}
      <input :value="transformEditor.draft[field]" type="number" step="any" required class="editor-input mt-1 w-full min-w-0"
       :data-testid="`attachment-${field}`" :disabled="!transformEditor.canEdit.value"
       @input="transformEditor.draft[field]=($event.target as HTMLInputElement).value"
       @change="transformEditor.commit(field)" @blur="transformEditor.commit(field)"
       @keydown.enter.stop.prevent="transformEditor.enter($event,field)" @keydown.esc.stop.prevent="transformEditor.escape"/>
     </label>
    </div>
   </div>
   <p v-if="attachment.region" class="break-all text-[11px] text-muted">{{attachment.region.image}}.png · {{attachment.region.width}} × {{attachment.region.height}}</p><p v-if="attachment.region&&!attachment.imageAvailable" role="status" class="text-xs leading-4 text-warning">{{t('missingImage')}}</p>
   <AppButton v-if="attachment.region" class="w-full" :disabled="linkedMesh" @click="editMesh">{{t(attachment.mesh?'editMesh':'convertMesh')}}</AppButton>
   <div v-if="w.meshWireframeTargetId===attachment.id" class="flex flex-wrap gap-1">
    <span :title="t('meshResetDeformationUnavailable')">
     <AppButton disabled data-testid="attachment-mesh-reset-deformation" aria-describedby="attachment-mesh-reset-deformation-hint">{{t('meshResetDeformation')}}</AppButton>
     <span id="attachment-mesh-reset-deformation-hint" class="sr-only">{{t('meshResetDeformationUnavailable')}}</span>
    </span>
    <span :title="t('meshFreezeUnavailable')">
     <AppButton disabled data-testid="attachment-mesh-freeze" aria-describedby="attachment-mesh-freeze-hint">{{t('meshFreeze')}}</AppButton>
     <span id="attachment-mesh-freeze-hint" class="sr-only">{{t('meshFreezeUnavailable')}}</span>
    </span>
   </div>
   <AppButton v-if="w.sceneEditing" class="w-full" @click="w.removeAttachment">{{t('deleteAttachment')}}</AppButton>
  </fieldset><AttachmentColorEditor v-if="attachment.region" :attachment="attachment"/><SequenceInspector v-if="attachment.region" :attachment="attachment"/><p v-if="w.inspectorError" role="alert" class="mt-2 text-xs text-danger">{{w.inspectorError}}</p>
 </section>
</template>
