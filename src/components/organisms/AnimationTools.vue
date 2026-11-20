<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, useId, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import type {BoneFieldEditor} from '../../composables/useBoneFieldEditor';
import {useBoneVerticalDrag} from '../../composables/useBoneVerticalDrag';
import {animationChannelFamily,type AnimationFamily} from '../../domain/animation';
import {boneFieldValue,boneTransformFields,createBoneFieldCommitter,matchesAffineCompensation,type BoneAffineCompensation,type BoneField,type BoneTransformSpace,type SetupBoneTransformAxes} from '../../domain/boneFields';
import {createBoneWheelBurst} from '../../domain/boneWheelBurst';
import {localTranslationAxes,type CompensationOptions,type LocalTranslationAxes} from '../../domain/boneCompensation';
import {normalizeWorldRotation,worldRotationHeading,worldScaleProjection} from '../../domain/boneRotationCompensation';
import type {DenseBindingView,EditorTool,ProjectSummary,RigEdit} from '../../domain/project';
import {logicalDocumentKey} from '../../domain/resourceContinuity';
import {worldBones} from '../../domain/rig';
import {parentTranslationAxes,type ParentTranslation} from '../../viewport/transformGizmo';
import AppIcon from '../atoms/AppIcon.vue';
const props=defineProps<{
  editor:BoneFieldEditor;setupTransformAxes:SetupBoneTransformAxes;numericCompensation?:CompensationOptions;
  affineCompensation?:BoneAffineCompensation;canCompensateAffine:boolean;
  suspendWheel?:boolean;
}>();
const emit=defineEmits<{
  parentTranslation:[value:ParentTranslation|null];compensationApplied:[layers:CompensationOptions];
  localTranslation:[axes:LocalTranslationAxes|null,unavailable:boolean];
  transformAxesChange:[value:SetupBoneTransformAxes];
  chooseTool:[tool:EditorTool];
}>();
const {t}=useI18n();
const w=useWorkspace();
const setupTarget=computed(()=>{
  const model=w.project,bone=w.selectedBone;
  if(!model||!bone||w.editorMode!=='setup'||w.editMode!=='bones'||!w.sceneEditing||!w.canEdit
    ||w.selectedIds.length!==1||w.selectedIds[0]!==bone.id||!w.treeFilters.bone||w.constraints.length
    ||w.librarySelection!==null||w.openingProject||w.parentPicking||w.traceOpen||w.clippingDraft||w.newDialog||w.discardDialog)return null;
  return {model,bone};
});
const translateTarget=computed(()=>{
  if(w.tool!=='translate'||!setupTarget.value)return null;
  const {model,bone}=setupTarget.value;
  try{
    const poses=worldBones(model.bones);
    const origin=poses.find(item=>item.id===bone.id);
    if(!origin)return null;
    const parent=poses.find(item=>item.id===bone.parent);
    const parentAxes=parent?parentTranslationAxes(bone.id,parent):null;
    if(bone.parent!==null&&!parentAxes)return null;
    const {worldX:x,worldY:y}=origin;
    return Number.isFinite(x)&&Number.isFinite(y)?{world:{x,y},parentAxes}:null;
  }catch{return null;}
});
const affineTarget=computed(()=>w.selectedSlotId!==null||w.selectedAttachmentIds.length||w.selectedEventId!==null?null:setupTarget.value);
const rotateTarget=computed(()=>{
  if(w.tool!=='rotate'||!affineTarget.value)return null;
  const {model,bone}=affineTarget.value;
  return {boneId:bone.id,documentId:model.documentId,revision:model.revision,angle:worldRotationHeading(model.bones,bone.id)};
});
const scaleTarget=computed(()=>{
  if(w.tool!=='scale'||!affineTarget.value)return null;
  const {model,bone}=affineTarget.value;
  return {projection:worldScaleProjection(model.bones,bone.id)};
});
const worldPosition=computed(()=>props.setupTransformAxes.translate==='world'?translateTarget.value?.world??null:null);
const parentTranslation=computed(()=>props.setupTransformAxes.translate==='parent'?translateTarget.value?.parentAxes??null:null);
const worldRotation=computed(()=>{
  const target=rotateTarget.value;
  return props.setupTransformAxes.rotate==='world'&&target?.angle!=null?{...target,angle:target.angle}:null;
});
const parentRotation=computed(()=>props.setupTransformAxes.rotate==='parent'&&!!rotateTarget.value);
const worldScale=computed(()=>props.setupTransformAxes.scale==='world'?scaleTarget.value?.projection??null:null);
const parentScale=computed(()=>props.setupTransformAxes.scale==='parent'&&!!scaleTarget.value);
const effectiveSpace=computed<BoneTransformSpace>(()=>{
  if(worldPosition.value||worldRotation.value||worldScale.value)return 'world';
  return parentTranslation.value||parentRotation.value||parentScale.value?'parent':'local';
});
const relativeDraft=reactive({rotation:'',x:'',y:'',scaleX:'',scaleY:'',shearX:'',shearY:''});
type HudTransformField=keyof typeof relativeDraft;
const relativeFields=Object.keys(relativeDraft) as HudTransformField[];
const absoluteTransformText=/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const constrainedRotationPinned=ref(false);
const availableConstrainedRotation=computed(()=>{
  if(w.editorMode!=='animate'||w.tool!=='rotate'||effectiveSpace.value!=='local')return null;
  return w.constrainedAnimationRotation??null;
});
const pinnedConstrainedRotation=computed(()=>constrainedRotationPinned.value?availableConstrainedRotation.value:null);
const pendingFkRotation=computed(()=>{
  const bone=w.selectedBone;
  if(!bone)return false;
  const draft=props.editor.draft.rotation;
  return !!relativeDraft.rotation||!String(draft).trim()||Number(draft)!==bone.rotation;
});
const pinEntryBlocked=computed(()=>!constrainedRotationPinned.value&&pendingFkRotation.value);
const pinnedFkDraftPending=computed(()=>pinnedConstrainedRotation.value!==null&&pendingFkRotation.value);
const constrainedRotationText=computed(()=>{
  const angle=pinnedConstrainedRotation.value;
  return angle===null?'':Object.is(angle,-0)?'-0':String(angle);
});
const constrainedRotationAction=computed(()=>{
  if(availableConstrainedRotation.value===null)return t('constrainedRotateUnavailable');
  return t(pinEntryBlocked.value?'constrainedRotateFinishFk':'constrainedRotateHint');
});
watch([
  ()=>logicalDocumentKey(w.project),()=>w.activeAnimation?.id,()=>w.editorMode,()=>w.editMode,()=>w.tool,
  effectiveSpace,()=>w.selectedBone?.id,()=>w.selectedIds.length,()=>w.treeFilters.bone,
],()=>{
  constrainedRotationPinned.value=false;
},{flush:'sync'});
function toggleConstrainedRotation(){
  if(!w.busy&&availableConstrainedRotation.value!==null&&!pinEntryBlocked.value)constrainedRotationPinned.value=!constrainedRotationPinned.value;
}
const localContext=computed(()=>w.tool==='translate'&&effectiveSpace.value==='local'?affineTarget.value:null);
const localTarget=computed(()=>{
  if(!localContext.value)return null;
  const {model,bone}=localContext.value;
  const axes=localTranslationAxes(model.bones,bone.id);
  return axes?{axes,documentId:model.documentId,revision:model.revision}:null;
});
const localTranslationUnavailable=computed(()=>!!localContext.value&&!localTarget.value);
const worldAvailable=computed(()=>!!translateTarget.value||rotateTarget.value?.angle!=null||!!scaleTarget.value?.projection);
const parentAvailable=computed(()=>!!translateTarget.value?.parentAxes||!!rotateTarget.value||!!scaleTarget.value);
const axesEditable=computed(()=>!w.busy&&(!w.inspectorError||effectiveSpace.value==='world'));
const worldEnabled=computed(()=>worldAvailable.value&&axesEditable.value);
const parentEnabled=computed(()=>parentAvailable.value&&axesEditable.value);
const worldHint=computed(()=>{
  if(w.tool==='rotate')return t(worldAvailable.value?'worldRotateHint':'worldRotateUnavailable');
  if(w.tool==='scale')return t(worldAvailable.value?'worldScaleHint':'scaleAxesUnavailable');
  return t(worldAvailable.value?'worldTranslateHint':'worldTranslateUnavailable');
});
const parentHint=computed(()=>{
  if(w.tool==='rotate')return t(parentAvailable.value?'parentRotateHint':'parentRotateUnavailable');
  if(w.tool==='scale')return t(parentAvailable.value?'parentScaleHint':'scaleAxesUnavailable');
  return t(parentAvailable.value?'parentTranslateHint':'parentTranslateUnavailable');
});
const worldScaleDescriptionId=useId();
const relativeHintId=useId();
const focusedScaleField=ref<'scaleX'|'scaleY'|null>(null);
const focusedWorldScale=computed(()=>worldScale.value?focusedScaleField.value:null);
const projectedDraft=reactive({x:'',y:'',rotation:''});
let axesError='';
function setAxesError(message:string){
  if(message||w.inspectorError===axesError)w.inspectorError=message;
  axesError=message;
  if(message)w.showNotice(message,true);
}
function resetProjectedDraft(){
  const position=worldPosition.value??localTarget.value?.axes.position;
  projectedDraft.x=position?String(position.x):'';
  projectedDraft.y=position?String(position.y):'';
  const angle=worldRotation.value?.angle;
  projectedDraft.rotation=angle===undefined?'':String(angle);
  setAxesError('');
}
watch(worldPosition,resetProjectedDraft,{immediate:true});
watch(worldRotation,resetProjectedDraft,{flush:'sync'});
watch([localTarget,localTranslationUnavailable],([target,unavailable])=>{
  resetProjectedDraft();
  emit('localTranslation',target?.axes??null,unavailable);
},{immediate:true,flush:'sync'});
watch(parentTranslation,value=>{setAxesError('');emit('parentTranslation',value);},{immediate:true});
watch([
  ()=>logicalDocumentKey(w.project),()=>w.project?.documentId,()=>w.project?.revision,
  ()=>w.activeAnimation?.id,()=>w.animationFrame,()=>w.animationDraft,
  ()=>w.selectedBone?.id,()=>w.selectedIds.length,()=>w.editorMode,()=>w.editMode,()=>w.tool,effectiveSpace,
],()=>{
  if(!relativeFields.some(field=>relativeDraft[field]))return;
  for(const field of relativeFields)relativeDraft[field]='';
  setAxesError('');
},{flush:'sync'});
onBeforeUnmount(()=>{setAxesError('');emit('parentTranslation',null);emit('localTranslation',null,false);});
const editOptions={invalidMessage:()=>t('invalidTransform'),setError:setAxesError,failureMessage:()=>w.notice,edit:editTransform};
const editSnapshot=()=>({bone:w.selectedBone,documentId:w.project?.documentId??-1,revision:w.project?.revision??-1,translationCompensation:props.numericCompensation});
function projectedSnapshot(){
  const world=worldPosition.value;
  const local=localTarget.value;
  const rotation=worldRotation.value;
  const snapshot=editSnapshot();
  const currentLocal=local&&local.documentId===snapshot.documentId&&local.revision===snapshot.revision&&local.axes.boneId===snapshot.bone?.id?local:null;
  const currentRotation=rotation&&rotation.documentId===snapshot.documentId&&rotation.revision===snapshot.revision&&rotation.boneId===snapshot.bone?.id?rotation:null;
  return {...snapshot,canEdit:!!world||!!currentLocal||!!currentRotation,worldPosition:world??undefined,
    localPosition:currentLocal?.axes.position,worldRotation:currentRotation?.angle,
    affineCompensation:currentRotation?props.affineCompensation:undefined};
}
const commitProjected=createBoneFieldCommitter({...editOptions,draft:projectedDraft,current:projectedSnapshot});
const commitParent=createBoneFieldCommitter({
  ...editOptions,draft:props.editor.draft,
  current:()=>({...editSnapshot(),canEdit:!!parentTranslation.value,parentPosition:!!parentTranslation.value}),
});
const commitAffine=createBoneFieldCommitter({
  ...editOptions,draft:props.editor.draft,
  current:()=>({...editSnapshot(),canEdit:props.canCompensateAffine&&!!props.affineCompensation,affineCompensation:props.affineCompensation}),
});
const commitRelative=createBoneFieldCommitter<HudTransformField>({
  ...editOptions,draft:relativeDraft,relative:true,invalidMessage:()=>t('invalidRelativeTransform'),
  current:()=>{
    const snapshot=projectedSnapshot();
    return {...snapshot,canEdit:w.canEdit,parentPosition:!!parentTranslation.value,
      affineCompensation:snapshot.worldRotation!==undefined||props.canCompensateAffine?props.affineCompensation:undefined};
  },
});

const boneAffineFields=['x','y','rotation','scaleX','scaleY','shearX','shearY'] as const;
const regionTransformFields=['x','y','rotation','scaleX','scaleY'] as const;
function imageTransformChanged(before:ProjectSummary,after:ProjectSummary,boneId:number){
  const nextSlots=new Map(after.slots.map(slot=>[slot.id,slot]));
  return before.slots.some(slot=>{
    const next=nextSlots.get(slot.id);
    if(!next?.attachments)return false;
    const attachments=new Map(next.attachments.map(attachment=>[attachment.id,attachment]));
    return slot.attachments?.some(attachment=>{
      const current=attachments.get(attachment.id);
      if(!current)return false;
      const region=attachment.region,nextRegion=current.region;
      if(slot.bone===boneId&&attachment.type==='region'&&current.type==='region'&&region&&nextRegion){
        return regionTransformFields.some(field=>region[field]!==nextRegion[field]);
      }
      return bindingPositionChanged(attachment.mesh??attachment.clipping,current.mesh??current.clipping,boneId);
    })??false;
  });
}

function bindingPositionChanged(before:DenseBindingView|null,after:DenseBindingView|null,boneId:number){
  const column=before?.bones.indexOf(boneId)??-1;
  const nextColumn=after?.bones.indexOf(boneId)??-1;
  if(!before||!after||column<0||nextColumn<0)return false;
  return before.vertices.some((vertex,index)=>{
    const next=after.vertices[index];
    return vertex.weights[column]!>0&&!!next&&
      (vertex.positions[column*2]!==next.positions[nextColumn*2]||vertex.positions[column*2+1]!==next.positions[nextColumn*2+1]);
  });
}

async function editTransform(edit:RigEdit,revision:number){
  const before=w.project;
  const success=await w.editRig(edit,revision);
  const after=w.project;
  if(success&&before?.revision===revision&&after?.revision===revision&&before.documentId===after.documentId){
    if(edit.type==='setBoneWorldRotation'){
      const current=worldRotation.value;
      if(current&&current.documentId===before.documentId&&current.boneId===edit.id)projectedDraft.rotation=String(current.angle);
    }else if(edit.type==='setBoneLocalPosition'){
      const current=localTarget.value;
      if(current&&current.documentId===before.documentId&&current.axes.boneId===edit.id)resetProjectedDraft();
    }
  }
  if(!success||(edit.type!=='setBoneParentPosition'&&edit.type!=='setBoneWorldPosition'&&edit.type!=='setBoneLocalPosition'&&
    edit.type!=='setBoneWorldRotation'&&edit.type!=='rotateBoneWithCompensation'&&edit.type!=='scaleBoneWithCompensation'&&edit.type!=='shearBoneWithCompensation')||
    (!edit.compensateBones&&!edit.compensateImages)||!before||!after||
    before.revision!==revision||after.documentId!==before.documentId||after.revision!==revision+1)return success;
  if(edit.type!=='setBoneParentPosition'&&edit.type!=='setBoneWorldPosition'){
    const tool=edit.type==='scaleBoneWithCompensation'?'scale':edit.type==='shearBoneWithCompensation'?'shear':edit.type==='setBoneLocalPosition'?'translate':'rotate';
    if(w.tool!==tool||w.selectedBone?.id!==edit.id)return success;
  }
  const priorChildren=new Map(before.bones.filter(bone=>bone.parent===edit.id).map(bone=>[bone.id,bone]));
  const bones=!!edit.compensateBones&&after.bones.some(bone=>{
    const prior=priorChildren.get(bone.id);
    return !!prior&&bone.parent===edit.id&&boneAffineFields.some(field=>bone[field]!==prior[field]);
  });
  const images=!!edit.compensateImages&&imageTransformChanged(before,after,edit.id);
  if(bones||images)emit('compensationApplied',{bones,images});
  return success;
}

function translationField(field:BoneField):field is 'x'|'y'{
  return field==='x'||field==='y';
}
function projectedField(field:BoneField):field is 'x'|'y'|'rotation'{
  return field==='rotation'?!!worldRotation.value:!!(worldPosition.value||localTarget.value)&&translationField(field);
}
function parentField(field:BoneField):field is 'x'|'y'{
  return !!parentTranslation.value&&translationField(field);
}
function localFieldUnavailable(field:BoneField){
  return localTranslationUnavailable.value&&translationField(field);
}
function armedAffineField(field:BoneField){
  return matchesAffineCompensation(field,props.affineCompensation);
}
function scaleField(field:BoneField):field is 'scaleX'|'scaleY'{
  return field==='scaleX'||field==='scaleY';
}
function scaleAxis(field:BoneField){return field==='scaleX'?'X':'Y';}
function worldScaleField(field:BoneField):field is 'scaleX'|'scaleY'{
  return !!worldScale.value&&scaleField(field);
}
function projectedScaleText(field:BoneField){
  const projection=worldScale.value;
  if(!projection||!scaleField(field))return '';
  const value=field==='scaleX'?projection.x:projection.y;
  return Object.is(value,-0)?'-0':String(value);
}
function focusField(field:BoneField){
  cancelWheel();
  w.pauseAnimation();
  focusedScaleField.value=scaleField(field)?field:null;
}
function blurField(field:BoneField){
  if(focusedScaleField.value===field)focusedScaleField.value=null;
}
function fieldLabel(field:BoneField){
  if(field==='rotation'&&worldRotation.value)return t('worldRotationField');
  if(scaleField(field)&&scaleTarget.value)return t('localScaleField',{axis:scaleAxis(field)});
  if(translationField(field)){
    const axis=field.toUpperCase();
    if(worldPosition.value)return t('worldTranslationAxis',{axis});
    if(parentTranslation.value)return t('parentTranslationAxis',{axis});
    if(localContext.value)return t('localTranslationAxis',{axis});
  }
  return field;
}
function fieldText(field:HudTransformField){
  if(localFieldUnavailable(field))return '';
  return relativeDraft[field]||(projectedField(field)?projectedDraft[field]:props.editor.draft[field]);
}
function setFieldText(field:HudTransformField,value:string){
  cancelWheel();
  cancelNumericDrag();
  if(value.trim()&&!absoluteTransformText.test(value.trim())){
    relativeDraft[field]=value;
    return;
  }
  relativeDraft[field]='';
  if(projectedField(field))projectedDraft[field]=value;
  else props.editor.draft[field]=value;
}
function transformFieldValue(field:HudTransformField,snapshot=projectedSnapshot()){
  const position=snapshot.worldPosition??snapshot.localPosition;
  return translationField(field)&&position?position[field]:
    field==='rotation'&&snapshot.worldRotation!==undefined?snapshot.worldRotation:
    snapshot.bone?Number(boneFieldValue(snapshot.bone,field)):undefined;
}
function restoreRelativeField(field:HudTransformField){
  const value=transformFieldValue(field);
  if(value===undefined)relativeDraft[field]='';
  else setFieldText(field,String(value));
}
function commitField(field:HudTransformField){
  if(localFieldUnavailable(field)||field==='rotation'&&pinnedConstrainedRotation.value!==null)return Promise.resolve(false);
  const raw=relativeDraft[field];
  if(raw){
    if(w.busy||armedAffineField(field)&&!props.canCompensateAffine)return Promise.resolve(false);
    const result=commitRelative(field);
    const submitted=relativeDraft[field];
    return result.then(success=>{
      if(submitted&&relativeDraft[field]===submitted){
        if(success)restoreRelativeField(field);
        else relativeDraft[field]=raw;
      }
      return success;
    });
  }
  if(projectedField(field))return commitProjected(field);
  if(armedAffineField(field))return commitAffine(field);
  return parentField(field)?commitParent(field):props.editor.commit(field);
}
let finishingField:HudTransformField|null=null;
function changeField(field:HudTransformField){
  if(finishingField!==field)void commitField(field);
}
function stepField(field:HudTransformField,delta:number){
  const text=String(fieldText(field)).trim();
  if(w.busy||!absoluteTransformText.test(text))return false;
  const next=Number(text)+delta;
  if(!Number.isFinite(next))return false;
  setFieldText(field,String(next));
  void commitField(field);
  return true;
}
function stepFieldKey(event:KeyboardEvent,field:HudTransformField){
  if(!event.isComposing&&stepField(field,event.key==='ArrowUp'?1:-1))event.preventDefault();
}
interface NumericGestureContext {
  field:HudTransformField;
  family:AnimationFamily;
  input:HTMLInputElement;
  baseline:number;
  scope:string;
}
type NumericPreview={context:NumericGestureContext;value:number};
const wheelPreview=shallowRef<NumericPreview|null>(null);
const dragPreview=shallowRef<NumericPreview|null>(null);
function matchesDraft(text:string|number,value:number|undefined){
  return String(text).trim()!==''&&Number(text)===value;
}
function numericGestureContext(field:HudTransformField,family:AnimationFamily,input:HTMLInputElement,allowFocusedScale=false):NumericGestureContext|null{
  const model=w.project,snapshot=projectedSnapshot(),bone=snapshot.bone;
  if(props.suspendWheel||!model||!bone||!input.isConnected||w.editMode!=='bones'||w.selectedIds.length!==1||w.selectedIds[0]!==bone.id||
    !w.treeFilters.bone||w.librarySelection!==null||w.openingProject||w.editing||w.animationPlaying||w.timelineAdjustState?.enabled||
    fieldDisabled(field,family)||field==='rotation'&&pinnedConstrainedRotation.value!==null||
    w.inspectorError||w.animationKeyError||w.eventKeyError||w.sequenceFieldError||w.attachmentColorError||
    w.traceOpen||w.clippingDraft||w.meshOutlineDraft||w.pruneOpen||w.parentPicking||w.newDialog||w.discardDialog)return null;
  const active=document.activeElement;
  if(worldScaleField(field)&&(!allowFocusedScale||active!==input||focusedWorldScale.value!==field))return null;
  if(active!==input&&active?.closest('input, textarea, select, [contenteditable="true"]'))return null;
  if(props.editor.draft.name!==bone.name||boneTransformFields.some(key=>
    !matchesDraft(props.editor.draft[key],Number(boneFieldValue(bone,key))))||
    relativeFields.some(key=>relativeDraft[key]||
      projectedField(key)&&!matchesDraft(projectedDraft[key],transformFieldValue(key,snapshot))))return null;
  const baseline=transformFieldValue(field,snapshot);
  if(baseline===undefined||!Number.isFinite(baseline))return null;
  const {numericCompensation,affineCompensation}=props;
  const scope=JSON.stringify([logicalDocumentKey(model),model.documentId,model.revision,bone.id,w.editorMode,w.tool,effectiveSpace.value,
    w.animationId,w.animationFrame,w.animationDraftEpoch,w.animationDraftVersion,w.animationAutoKey,
    numericCompensation?.bones,numericCompensation?.images,affineCompensation?.mode,
    affineCompensation?.layers.bones,affineCompensation?.layers.images]);
  return {field,family,input,baseline,scope};
}
function sameNumericGestureContext(a:NumericGestureContext,b:NumericGestureContext){
  return a.field===b.field&&a.input===b.input&&a.scope===b.scope&&Object.is(a.baseline,b.baseline);
}
function isCurrentNumericGesture(context:NumericGestureContext,allowFocusedScale=false){
  const current=numericGestureContext(context.field,context.family,context.input,allowFocusedScale);
  return !!current&&sameNumericGestureContext(context,current);
}
function commitNumericGesture({field}:NumericGestureContext,value:number){
  if(!Number.isFinite(value))return Promise.resolve(false);
  setFieldText(field,String(value));
  return commitField(field);
}
const wheel=createBoneWheelBurst<NumericGestureContext>({
  ticksPerUnit:10,
  isCurrent:context=>isCurrentNumericGesture(context),
  matches:sameNumericGestureContext,
  commit:commitNumericGesture,
  changed:preview=>{
    if(preview&&!wheelPreview.value){
      window.addEventListener('keydown',cancelWheelEscape,true);
      window.addEventListener('blur',cancelWheel);
    }else if(!preview&&wheelPreview.value){
      window.removeEventListener('keydown',cancelWheelEscape,true);
      window.removeEventListener('blur',cancelWheel);
    }
    wheelPreview.value=preview;
  },
});
function cancelWheel(){wheel.cancel();}
function finishWheel(){void wheel.flush();}
function cancelWheelEscape(event:KeyboardEvent){
  if(event.key!=='Escape')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  cancelWheel();
  cancelNumericDrag();
}
const verticalDrag=useBoneVerticalDrag<NumericGestureContext>({
  isCurrent:context=>isCurrentNumericGesture(context,true),
  preview:(context,delta)=>{
    if(delta!==null)cancelWheel();
    const value=delta===null?NaN:context.baseline+delta;
    dragPreview.value=Number.isFinite(value)?{context,value}:null;
  },
  commit:(context,delta)=>{
    const value=context.baseline+delta;
    if(value!==context.baseline)void commitNumericGesture(context,value);
  },
});
function cancelNumericDrag(){verticalDrag.cancel();}
defineExpose({finishWheel,cancelWheel,cancelNumericDrag});
watchEffect(()=>{if(wheelPreview.value)wheel.check();},{flush:'sync'});
onBeforeUnmount(cancelWheel);
function beginNumericDrag(event:PointerEvent,field:HudTransformField,family:AnimationFamily){
  if(!(event.currentTarget instanceof HTMLInputElement))return;
  const capture=numericGestureContext(field,family,event.currentTarget,true);
  verticalDrag.pointerDown(event,capture);
}
function stepFieldWheel(event:WheelEvent,field:HudTransformField,family:AnimationFamily){
  if(props.suspendWheel||!Number.isFinite(event.deltaY)||!event.deltaY||Math.abs(event.deltaX)>Math.abs(event.deltaY)||
    event.ctrlKey||event.metaKey||event.altKey||!(event.currentTarget instanceof HTMLInputElement))return;
  const direction=event.deltaY<0?1:-1;
  if(verticalDrag.dragging.value){
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const started=numericGestureContext(field,family,event.currentTarget);
  if(started?wheel.step(started,started.baseline,direction*(event.shiftKey?1:10)):
    worldScaleField(field)&&event.currentTarget===document.activeElement&&stepField(field,direction)){
    cancelNumericDrag();
    event.preventDefault();
    event.stopPropagation();
  }
}
function enterField(event:KeyboardEvent,field:HudTransformField){
  cancelNumericDrag();
  finishingField=field;
  try{
    if(wheelPreview.value?.context.field===field)finishWheel();
    else void commitField(field);
    (event.target as HTMLInputElement).blur();
  }finally{finishingField=null;}
}
function escapeField(event:KeyboardEvent,field:HudTransformField){
  cancelNumericDrag();
  finishingField=field;
  try{
    if(relativeDraft[field]){
      relativeDraft[field]='';
      setAxesError('');
    }
    if(!projectedField(field)){
      if(parentField(field)||armedAffineField(field))setAxesError('');
      props.editor.escape(event);
      return;
    }
    resetProjectedDraft();
    (event.target as HTMLInputElement).blur();
  }finally{finishingField=null;}
}
function fieldDescription(field:HudTransformField,family:AnimationFamily){
  const scaleHint=worldScaleField(field)?`${worldScaleDescriptionId}-${field}`:undefined;
  if(fieldDisabled(field,family))return scaleHint;
  return scaleHint?`${scaleHint} ${relativeHintId}`:`${relativeHintId} ${wheelHintId} ${dragHintId}`;
}
function fieldHint(field:HudTransformField,family:AnimationFamily){
  if(localFieldUnavailable(field))return t('localTranslateUnavailable');
  if(armedAffineField(field)&&!props.canCompensateAffine)return t('viewportCompensationSetupHint');
  if(!fieldDisabled(field,family)){
    const relativeHint=t('relativeTransformHint');
    if(!worldScaleField(field))return `${relativeHint} ${t('wheelTransformHint')} ${t('dragTransformHint')}`;
    return focusedWorldScale.value===field?`${relativeHint} ${t('dragTransformHint')}`:relativeHint;
  }
}
function chooseSpace(space:BoneTransformSpace){
  const tool=w.tool;
  if(w.editorMode!=='setup'||(tool!=='translate'&&tool!=='rotate'&&tool!=='scale'))return;
  if(w.busy||space==='world'&&!worldEnabled.value||space==='parent'&&!parentEnabled.value)return;
  emit('transformAxesChange',{...props.setupTransformAxes,[tool]:space});
}

function compact(value:string|number){const number=Number(value);return String(value).trim()&&Number.isFinite(number)?String(Number(number.toPrecision(6))):value;}
function fieldReadout(field:HudTransformField){
  const preview=numericPreviewValue(field);
  if(preview!==undefined)return compact(preview);
  const projected=projectedScaleText(field);
  if(projected==='-0')return projected;
  return compact(projected||fieldText(field));
}
const wheelHintId=useId();
const dragHintId=useId();
function fieldPreviewValue(field:HudTransformField,preview:NumericPreview|null){
  if(preview?.context.field!==field)return undefined;
  return field==='rotation'&&worldRotation.value?normalizeWorldRotation(preview.value):preview.value;
}
function numericPreviewValue(field:HudTransformField){
  return fieldPreviewValue(field,dragPreview.value)??fieldPreviewValue(field,wheelPreview.value);
}
const rows: {channel:AnimationFamily;title:string;glyph:string;fields:HudTransformField[];tool:'rotate'|'translate'|'scale'|'shear'}[]=[
  {channel:'rotate',title:'Rotate',glyph:'↻',fields:['rotation'],tool:'rotate'},
  {channel:'translate',title:'Translate',glyph:'✣',fields:['x','y'],tool:'translate'},
  {channel:'scale',title:'Scale',glyph:'▣',fields:['scaleX','scaleY'],tool:'scale'},
  {channel:'shear',title:'Shear',glyph:'⌁',fields:['shearX','shearY'],tool:'shear'},
];
function keyLabel(row:(typeof rows)[number]){
  return row.channel==='rotate'&&pinnedConstrainedRotation.value!==null?t('keyFkRotation'):'Key '+row.title;
}
function allowed(family:AnimationFamily){return w.canEdit&&!w.busy&&!w.traceOpen&&!w.clippingDraft&&(w.editorMode==='setup'||w.animationChannels.some(channel=>animationChannelFamily(channel)===family)&&!!w.activeAnimation);}
function fieldDisabled(field:BoneField,family:AnimationFamily){
  return !allowed(family)||!w.selectedBone||localFieldUnavailable(field)||(armedAffineField(field)&&!props.canCompensateAffine);
}
</script>
<template>
 <div class="animation-tools" data-testid="animation-tools" :aria-label="w.editorMode==='animate'?'Animation transform tools':'Setup transform tools'">
  <div class="animation-tool-stack animation-action-stack">
   <button :disabled="!allowed('rotate')" :class="{active:w.tool==='pose'}" :aria-pressed="w.tool==='pose'"
    :aria-label="t('pose')" :title="t('pose')" @click="emit('chooseTool','pose')">
    <AppIcon name="pose" class="text-motion"/><span data-toolbar-action-label>{{t('pose')}}</span>
   </button>
   <button :disabled="w.editorMode==='animate'||!w.canEdit||w.busy" :aria-label="t('weights')" :title="t('weights')" @click="w.setMode('weights')">
    <AppIcon name="weights"/><span data-toolbar-action-label>{{t('weights')}}</span>
   </button>
   <button :disabled="w.editorMode==='animate'||!w.canEdit||w.busy" :class="{active:w.tool==='create'}"
    :aria-pressed="w.tool==='create'" :aria-label="t('viewportCreateTool')" :title="t('viewportCreateTool')" @click="w.tool='create'">
    <AppIcon name="plus"/><span data-toolbar-action-label>{{t('viewportCreateTool')}}</span>
   </button>
  </div>
  <div class="animation-transform-rows">
   <div v-for="row in rows" :key="row.channel" class="animation-transform-row" :data-channel="row.channel">
    <button class="animation-transform-name" :class="{active:w.tool===row.tool}" :disabled="!allowed(row.channel)" :aria-label="row.title" :aria-pressed="w.tool===row.tool" :title="row.title" @click="emit('chooseTool',row.tool)"><span aria-hidden="true">{{row.glyph}}</span><span data-toolbar-action-label>{{row.title}}</span></button>
    <span v-for="field in row.fields" :key="field" class="animation-transform-cell" :class="{disabled:fieldDisabled(field,row.channel)}"
      :title="fieldHint(field,row.channel)" :data-wheel-preview="fieldPreviewValue(field,wheelPreview)"
      :data-drag-preview="fieldPreviewValue(field,dragPreview)">
     <span v-if="field==='rotation'&&pinnedConstrainedRotation!==null"
       class="flex min-w-0 flex-1 items-center justify-center gap-1 bg-panel px-1 text-motion"
       role="group" :aria-label="t('constrainedRotateField')" :title="`${t('constrainedRotateField')} · ${constrainedRotationText}°`"
       data-testid="constrained-rotation-readout" :data-value="constrainedRotationText">
      <span class="truncate" aria-hidden="true">{{constrainedRotationText==='-0'?'-0':compact(constrainedRotationText)}}°</span>
      <span class="sr-only">{{constrainedRotationText}}°</span>
      <span class="shrink-0 text-[9px]">{{t('constrainedRotateReadOnly')}}</span>
     </span>
     <template v-else>
      <input :value="fieldText(field)" @focus="focusField(field)" @blur="blurField(field)" @input="setFieldText(field,($event.target as HTMLInputElement).value)"
        :class="{'text-transparent! caret-transparent':numericPreviewValue(field)!==undefined,'cursor-ns-resize':fieldPreviewValue(field,dragPreview)!==undefined}"
        :aria-label="fieldLabel(field)" :data-testid="(w.editorMode==='animate'?'animate-bone-':'bone-')+field"
        :aria-describedby="fieldDescription(field,row.channel)"
        type="text" spellcheck="false" autocomplete="off" :disabled="fieldDisabled(field,row.channel)" @change="changeField(field)"
        @pointerdown="beginNumericDrag($event,field,row.channel)"
        @keydown.up.down="stepFieldKey($event,field)" @wheel="stepFieldWheel($event,field,row.channel)"
        @keydown.enter.stop.prevent="enterField($event,field)" @keydown.esc.stop.prevent="escapeField($event,field)">
      <span class="animation-transform-compact" aria-hidden="true"
        :class="{'flex!':numericPreviewValue(field)!==undefined}"
        :data-testid="worldScaleField(field)?`world-scale-${scaleAxis(field).toLowerCase()}-readout`:undefined">{{fieldReadout(field)}}</span>
      <span v-if="worldScaleField(field)" :id="`${worldScaleDescriptionId}-${field}`" hidden>
        {{t('worldScaleDescription',{axis:scaleAxis(field),value:projectedScaleText(field)})}}
      </span>
     </template>
    </span>
    <button v-if="w.editorMode==='animate'" class="animation-key-tool"
      :disabled="!allowed(row.channel)||!w.selectedBone||!w.selectedIds.length||row.channel==='rotate'&&pinnedFkDraftPending"
      :aria-label="keyLabel(row)" :aria-description="row.channel==='rotate'&&pinnedFkDraftPending?t('constrainedRotateFinishFk'):undefined"
      :title="row.channel==='rotate'&&pinnedFkDraftPending?t('constrainedRotateFinishFk'):keyLabel(row)"
      @click="w.insertAnimationKeys(row.channel)"><AppIcon name="key" class="!size-3"/></button>
   </div>
   <span :id="relativeHintId" hidden>{{t('relativeTransformHint')}}</span>
   <span :id="wheelHintId" hidden>{{t('wheelTransformHint')}}</span>
   <span :id="dragHintId" hidden>{{t('dragTransformHint')}}</span>
   <div v-if="w.editorMode==='setup'" class="animation-transform-row" data-channel="length"><button class="animation-transform-name" :class="{active:w.tool==='length'}" :disabled="!allowed('rotate')" :aria-label="t('lengthTool')" :title="t('lengthTool')" @click="w.tool='length'"><span aria-hidden="true">↔</span><span data-toolbar-action-label>{{t('lengthTool')}}</span></button><input v-model="editor.draft.length" data-testid="bone-length" aria-label="length" type="number" step="any" min="0" max="1000000" :disabled="!allowed('rotate')||!w.selectedBone" @change="editor.commit('length')" @keydown.enter.stop.prevent="editor.enter($event,'length')" @keydown.esc.stop.prevent="editor.escape($event)"></div>
   <div v-if="w.tool==='rotate'&&w.selectedIds.length>1" class="flex gap-1 pt-1" role="group" aria-label="Rotation pivot"><button v-for="pivot in (['individual','group'] as const)" :key="pivot" class="dock-tab flex-1 !text-[10px]" :class="{active:w.transformPivot===pivot}" :aria-pressed="w.transformPivot===pivot" :disabled="!allowed('rotate')" @click="w.transformPivot=pivot">{{pivot==='individual'?'Individual':'Group'}}</button></div>
   <p v-if="w.inspectorError" role="status" class="max-w-56 text-[10px] text-danger">{{w.inspectorError}}</p>
  </div>
  <div class="animation-tool-stack" role="group" :aria-label="t('transformAxes')">
   <button type="button" :class="{active:effectiveSpace==='local','ring-1 ring-inset ring-warning text-warning!':!!focusedWorldScale}"
     :aria-pressed="effectiveSpace==='local'" :disabled="w.busy" :data-scale-local-editing="focusedWorldScale??undefined"
     :title="localTranslationUnavailable?t('localTranslateUnavailable'):localTarget?t('localTranslateHint'):undefined"
     data-testid="bone-axes-local" @keydown.space.stop @click="chooseSpace('local')">◇ {{t('localCoordinates')}}</button>
   <div class="flex gap-0.5">
    <button type="button" class="min-w-0 flex-1" :class="{active:effectiveSpace==='parent'}" :aria-pressed="effectiveSpace==='parent'"
      :disabled="!parentEnabled" :title="parentHint"
      data-testid="bone-axes-parent" @keydown.space.stop @click="chooseSpace('parent')">⌁ {{t('parentCoordinates')}}</button>
    <button type="button" class="w-[22px] shrink-0 justify-center p-0! text-motion focus-visible:outline-1 focus-visible:outline-accent"
      :class="{'ring-1 ring-inset ring-motion':pinnedConstrainedRotation!==null}"
      :disabled="w.busy||availableConstrainedRotation===null||pinEntryBlocked" :aria-pressed="pinnedConstrainedRotation!==null"
      :aria-label="t('constrainedRotatePin')" :aria-description="constrainedRotationAction" :title="constrainedRotationAction"
      data-testid="bone-axes-constrained-rotation" @pointerdown.stop @mousedown.prevent
      @keydown.space.stop @keydown.enter.stop @keydown.esc.stop @click="toggleConstrainedRotation">
     <AppIcon name="pin"/>
    </button>
   </div>
   <button type="button" :class="{active:effectiveSpace==='world'}" :aria-pressed="effectiveSpace==='world'"
     :disabled="!worldEnabled" :title="worldHint"
     data-testid="bone-axes-world" @keydown.space.stop @click="chooseSpace('world')">◈ {{t('worldCoordinates')}}</button>
  </div>
 </div>
</template>
