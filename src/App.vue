<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {logicalDocumentKey} from './domain/resourceContinuity';
import type {SetupBoneTransformAxes} from './domain/boneFields';
import { useI18n } from 'vue-i18n';
import { useWorkspace, type Intent } from './stores/workspace';
import { desktop } from './services/desktop';
import { onEditorCommand, onMcpProjectChanged, nativeWindow } from './services/bridge';
import { validProjectName, type EditMode, type ProjectSummary } from './domain/project';
import AppButton from './components/atoms/AppButton.vue';
import AppIcon from './components/atoms/AppIcon.vue';
import ModalDialog from './components/molecules/ModalDialog.vue';
import PhysicsPreviewControls from './components/molecules/PhysicsPreviewControls.vue';
import ProjectInspectionNotice from './components/molecules/ProjectInspectionNotice.vue';
import ProjectViewport from './components/organisms/ProjectViewport.vue';
import AnimationTimeline from './components/organisms/AnimationTimeline.vue';
import AnimationTools from './components/organisms/AnimationTools.vue';
import AnimationPreview from './components/organisms/AnimationPreview.vue';
import CurvesPanel from './components/organisms/CurvesPanel.vue';
import SceneTree from './components/organisms/SceneTree.vue';
import TreeFindReplace from './components/organisms/TreeFindReplace.vue';
import TreeViewSettings from './components/molecules/TreeViewSettings.vue';
import MeshTools from './components/organisms/MeshTools.vue';
import WeightsPanel from './components/organisms/WeightsPanel.vue';
import WeightsPrunePanel from './components/organisms/WeightsPrunePanel.vue';
import DockWorkspace from './components/organisms/DockWorkspace.vue';
import ConstraintViewPanel from './components/organisms/ConstraintViewPanel.vue';
import {cloneDockLayout,defaultDockLayout,dockPanel,dockPanels,dockStorageKey,readDockLayout,type DockPanelId} from './domain/dockLayout';
import {curveSegmentAllowsInterpolation,curveSegmentHandleChange,type CurveSegmentSelection} from './domain/curveSegment';
import {planCurvesHandleGroup,type CurvesHandleGroupIntent} from './domain/curvesHandleGroup';
import {captureCurvePresetControls,curvePresetStorageKey,maxCurvePresets,normalizeCurvePresetName,readCurvePresets,type CurvePreset} from './domain/curvePresets';
import {animationChannelFamily} from './domain/animation';
import type {TimelineInterpolation} from './domain/animationTimeline';
import type {GraphPreset} from './domain/graphCurveTools';
import BoneInspector from './components/organisms/BoneInspector.vue';
import {useBoneFieldEditor} from './composables/useBoneFieldEditor';
import {useAttachmentTransformEditor} from './composables/useAttachmentTransformEditor';
import {useAppUpdater} from './composables/useAppUpdater';
import {usePreviewTracks} from './composables/usePreviewTracks';
import UpdateNotice from './components/organisms/UpdateNotice.vue';
import EditorFileMenu from './components/organisms/EditorFileMenu.vue';
import GifExportDialog from './components/organisms/GifExportDialog.vue';
import type {GifExportOptions} from './domain/gifExport';
import EditorTitleBar from './components/organisms/EditorTitleBar.vue';
import GhostingControls from './components/organisms/GhostingControls.vue';
import ViewportOptions from './components/organisms/ViewportOptions.vue';
import ViewportSelectionTools from './components/organisms/ViewportSelectionTools.vue';
import ViewportSelectionPath from './components/molecules/ViewportSelectionPath.vue';
import ViewportAttachmentTransform from './components/molecules/ViewportAttachmentTransform.vue';
import ViewportToolbarAlignment from './components/molecules/ViewportToolbarAlignment.vue';
import ViewportToolbarLayout from './components/molecules/ViewportToolbarLayout.vue';
import DockedViewsToggle from './components/molecules/DockedViewsToggle.vue';
import MinimizedDockedViews from './components/molecules/MinimizedDockedViews.vue';
import McpControl from './components/organisms/McpControl.vue';
import {useMcp} from './composables/useMcp';

import SlotInspector from './components/organisms/SlotInspector.vue';
import AttachmentInspector from './components/organisms/AttachmentInspector.vue';
import ConstraintInspector from './components/organisms/ConstraintInspector.vue';
import EventInspector from './components/organisms/EventInspector.vue';
import ConstraintCreator from './components/organisms/ConstraintCreator.vue';
import ClippingCreator from './components/organisms/ClippingCreator.vue';
import LinkedMeshCreator from './components/organisms/LinkedMeshCreator.vue';
import TracePanel from './components/organisms/TracePanel.vue';
import type { EditorTool, RigEdit } from './domain/project';
import type {CompensationOptions,LocalTranslationAxes} from './domain/boneCompensation';
import type {KeyShownRequest} from './domain/animationTimeline';
import type {ParentTranslation} from './viewport/transformGizmo';
import {defaultTimelineNavigation,readTimelineNavigation,type TimelineNavigation,type TimelineNavigationOptions,type TimelineView} from './domain/timelineNavigation';
import { toolEditMode } from './domain/toolMode';
import {meshHullCenter} from './domain/sceneSelection';

const { t } = useI18n();
const w = useWorkspace();
const viewportPixels = ref(false);
const viewportToolbarPosition=ref(.5),viewportToolbarLocked=ref(true);
const viewportToolbarLayout=ref<InstanceType<typeof ViewportToolbarLayout>>();
const viewportToolbarLabelChoices=[
  {mode:'automatic',label:'viewportToolbarLabelsAutomatic'},
  {mode:'text',label:'viewportToolbarLabelsShow'},
  {mode:'icons',label:'viewportToolbarLabelsHide'},
] as const;
type ViewportToolbarLabelMode=typeof viewportToolbarLabelChoices[number]['mode'];
const viewportToolbarLabelMode=ref<ViewportToolbarLabelMode>('automatic');
const compensation = shallowRef<CompensationOptions>({bones:false,images:false});
const parentTranslation = shallowRef<ParentTranslation|null>(null);
const localTranslation = shallowRef<LocalTranslationAxes|null>(null);
const localTranslationUnavailable = ref(false);
function setLocalTranslation(axes:LocalTranslationAxes|null,unavailable:boolean){
  localTranslation.value=axes;
  localTranslationUnavailable.value=unavailable;
}
const defaultSetupTransformAxes:SetupBoneTransformAxes={translate:'local',rotate:'local',scale:'local'};
const setupTransformAxes = shallowRef(defaultSetupTransformAxes);
const boneCompensationContext = computed(() => w.editorMode==='setup'&&w.sceneEditing&&w.canEdit&&w.editMode==='bones');
const affineTool = computed(() => w.tool==='rotate'||w.tool==='scale'||w.tool==='shear'?w.tool:null);
const compensationToolAvailable = computed(() => boneCompensationContext.value&&!w.openingProject
  &&(w.tool==='translate'||!!affineTool.value)&&w.treeFilters.bone&&!w.constraints.length&&!w.parentPicking&&!w.traceOpen&&!w.clippingDraft);
const compensationAvailable = computed(() => compensationToolAvailable.value&&w.selectedIds.length===1&&w.selectedIds[0]===w.selectedBone?.id
  &&w.librarySelection===null&&w.selectedSlotId===null&&w.selectedEventId===null&&!w.selectedAttachmentIds.length);
const compensationArmed = computed(() => compensation.value.bones||compensation.value.images);
const affineCompensation = computed(() => {
  const mode=affineTool.value;
  return boneCompensationContext.value&&mode&&compensationArmed.value?{mode,layers:compensation.value}:undefined;
});
const activeCompensation = computed(() => affineCompensation.value?.layers??(compensationToolAvailable.value&&compensationArmed.value?compensation.value:undefined));
const appliedCompensation = shallowRef<CompensationOptions|null>(null);
const compensationAnnouncement = computed(() => {
  const layers=appliedCompensation.value;
  return layers?t(layers.bones&&layers.images?'viewportCompensationAppliedBoth':layers.bones?'viewportCompensationAppliedBones':'viewportCompensationAppliedImages'):'';
});
let compensationFeedbackTimer:number|undefined;
function clearCompensationFeedback(){
  window.clearTimeout(compensationFeedbackTimer);
  compensationFeedbackTimer=undefined;
  appliedCompensation.value=null;
}
function showCompensationApplied(layers:CompensationOptions){
  if(w.editorMode!=='setup'||(!layers.bones&&!layers.images))return;
  clearCompensationFeedback();
  appliedCompensation.value=layers;
  compensationFeedbackTimer=window.setTimeout(clearCompensationFeedback,850);
}
function canToggleCompensation(layer:keyof CompensationOptions){
  const canDisarm=boneCompensationContext.value&&!!affineTool.value&&compensation.value[layer];
  return !w.busy&&!w.openingProject&&(compensationAvailable.value||canDisarm);
}
function compensationHint(layer:keyof CompensationOptions){
  if(w.editorMode==='animate')return t('viewportUnavailableOption',{option:t('viewportCompensateLayer',{layer:t(layer)})});
  if(!compensationAvailable.value)return t(canToggleCompensation(layer)?'viewportCompensationDisarmHint':'viewportCompensationSetupHint');
  if(w.tool==='rotate')return t(layer==='bones'?'viewportCompensateRotateBonesHint':'viewportCompensateRotateImagesHint');
  if(w.tool==='scale')return t(layer==='bones'?'viewportCompensateScaleBonesHint':'viewportCompensateScaleImagesHint');
  if(w.tool==='shear')return t(layer==='bones'?'viewportCompensateShearBonesHint':'viewportCompensateShearImagesHint');
  return t(layer==='bones'?'viewportCompensateBonesHint':'viewportCompensateImagesHint');
}
function toggleCompensation(layer:keyof CompensationOptions){
  if(canToggleCompensation(layer))compensation.value={...compensation.value,[layer]:!compensation.value[layer]};
}
watch(() => [w.editorMode,w.tool,w.selectedId,logicalDocumentKey(w.project)],clearCompensationFeedback);
watch(() => logicalDocumentKey(w.project),()=>{setupTransformAxes.value=defaultSetupTransformAxes;},{flush:'sync'});
const linuxDesktop = desktop && /\bLinux\b/.test(navigator.userAgent);
const appleDesktop = /Macintosh/.test(navigator.userAgent);
const keyShownShortcut = appleDesktop ? 'Meta+Shift+L' : 'Control+Shift+L';
const linuxFileShortcuts: Readonly<Partial<Record<string, string>>> = {
  n: 'new', o: 'open', i: 'import', s: 'save', w: 'close',
};
const mcp=useMcp({beforeUnlock:()=>w.refreshFromMcp(),beforeStart:async()=>{
 if(creatorModalOpen.value)throw Error(t('mcpFinishFirst'));
 if(!await w.prepareForMcp())throw Error(w.notice||t('mcpFinishFirst'));
 return true;
}});
watch(()=>mcp.state.value.enabled,enabled=>{if(enabled)w.suspendSimulation('mcp');else w.resumeSimulation('mcp');},{flush:'sync'});
const timelineSlots=computed(()=>(w.project?.slots??[]).map(slot=>({id:slot.id,boneId:slot.bone,name:slot.name,tintBlack:slot.tintBlack,attachments:slot.attachments?.map(({id,name,sequence,linkedMeshSourceId,linkedMeshInheritsTimelines})=>({id,name,sequence,linkedMeshSourceId,linkedMeshInheritsTimelines}))??(slot.region?[{id:slot.id,name:slot.region.name}]:[])})));
const timelineSelectedConstraints=computed(()=>w.selectedConstraintIds);
const timelineInterpolations:Array<'linear'|'stepped'|'bezier'>=['linear','stepped','bezier'];
const boneEditor=useBoneFieldEditor(()=>t('invalidTransform'));
const animationTools=ref<InstanceType<typeof AnimationTools>>();
function finishTransformWheel(){
  const tools=animationTools.value;
  if(!tools)return;
  if(w.inspectorError||w.animationKeyError||w.eventKeyError||w.sequenceFieldError||w.attachmentColorError){tools.cancelWheel();return;}
  tools.finishWheel();
}
const attachmentTransformEditor=useAttachmentTransformEditor(()=>t('invalidTransform'));
const timeline=ref<InstanceType<typeof AnimationTimeline>>();
const timelineNavigationKey='fbones.timeline-navigation.v1';
const timelineNavigation=shallowRef<TimelineNavigation>(defaultTimelineNavigation);
try{timelineNavigation.value=readTimelineNavigation(localStorage.getItem(timelineNavigationKey));}catch{/* optional local preference */}
const customCurvePresets=shallowRef<readonly CurvePreset[]>([]);
try{customCurvePresets.value=readCurvePresets(localStorage.getItem(curvePresetStorageKey));}catch{/* optional local preference */}
function setTimelineNavigation(view:TimelineView, key:keyof TimelineNavigationOptions, value:boolean){
 timelineNavigation.value={...timelineNavigation.value,[view]:{...timelineNavigation.value[view],[key]:value}};
 try{localStorage.setItem(timelineNavigationKey,JSON.stringify(timelineNavigation.value));}catch{/* in-session preferences remain available */}
}
function commitGraphCurveEdit(edit:Extract<RigEdit,{type:'setAnimationKeys'}>,revision:number){
 if(w.editorMode!=='animate'||w.animationId!==edit.animation||w.project?.revision!==revision)return;
 if(w.inspectorError||w.animationKeyError||w.attachmentColorError){w.showNotice(w.inspectorError||w.animationKeyError||w.attachmentColorError,true);return;}
 void w.editRig(edit,revision,undefined,{keepWorkingPose:true});
}
function sameCurveSegment(current:CurveSegmentSelection,source:CurveSegmentSelection):boolean {
 const {segment}=current;
 return current.documentKey===source.documentKey&&current.revision===source.revision&&current.animation===source.animation&&
  segment.trackId===source.segment.trackId&&segment.key.id===source.segment.key.id&&segment.next.id===source.segment.next.id&&
  segment.leftSelected===source.segment.leftSelected&&segment.rightSelected===source.segment.rightSelected;
}
function currentCurveSegments(sources:readonly CurveSegmentSelection[]):readonly CurveSegmentSelection[] {
 const current=curvesSelections.value,first=current[0];
 if(!curvesEditable.value||!first||w.project?.revision!==first.revision||w.animationId!==first.animation||
  current.length!==sources.length||!current.every((item,index)=>sameCurveSegment(item,sources[index]!)))return [];
 return current;
}
function editCurveHandle({selection,component,control,point}:{selection:CurveSegmentSelection;component:number;control:0|1;point:{x:number;y:number}}){
 if(!curvesEditable.value||w.project?.revision!==selection.revision||w.animationId!==selection.animation)return;
 const current=curvesSelections.value.find(item=>sameCurveSegment(item,selection));
 if(!current)return;
 const change=curveSegmentHandleChange(current.segment,component,control,point);
 if(change)void w.updateAnimationBezier(change,current.revision);
}
function editCurveHandleGroup({selections,handles,activeHandleId,point}:CurvesHandleGroupIntent) {
 const current=currentCurveSegments(selections),first=current[0];
 if(!first)return;
 const changes=planCurvesHandleGroup(current,handles,activeHandleId,point);
 if(!changes?.length)return;
 const {documentKey,revision,animation}=first;
 void w.updateAnimationBezierGroup({documentKey,revision,animation,changes});
}
function setCurveInterpolation({selections,interpolation}:{selections:readonly CurveSegmentSelection[];interpolation:TimelineInterpolation}){
 const current=currentCurveSegments(selections);
 const ids=current.flatMap(({segment})=>segment.key.interpolation!==interpolation&&curveSegmentAllowsInterpolation(segment,interpolation)
  ?[segment.key.id]:[]);
 if(!ids.length)return;
 w.pauseAnimation();
 void w.setAnimationInterpolation({ids,interpolation},current[0]!.revision);
}
function applyCurvePreset({selections,preset}:{selections:readonly CurveSegmentSelection[];preset:GraphPreset}){
 const current=currentCurveSegments(selections);
 if(current.length)void w.applyAnimationCurvePreset(current,preset);
}
function updateCustomCurvePresets(presets:readonly CurvePreset[]){
 customCurvePresets.value=presets;
 try{localStorage.setItem(curvePresetStorageKey,JSON.stringify(presets));}
 catch{w.showNotice(t('animation_curvesPresetWriteError'),true);}
}
function saveCustomCurvePreset({name,replace,selection,component}:{name:string;replace:boolean;selection:CurveSegmentSelection;component:number}){
 if(!curvesEditable.value||w.project?.revision!==selection.revision||w.animationId!==selection.animation)return;
 const current=curvesSelections.value.find(item=>sameCurveSegment(item,selection));
 const normalizedName=normalizeCurvePresetName(name);
 if(!current||!normalizedName)return;
 const controls=captureCurvePresetControls(current.segment,component);
 if(!controls)return;
 const presets=customCurvePresets.value;
 if(replace){
  if(!presets.some(preset=>preset.name===normalizedName))return;
  updateCustomCurvePresets(presets.map(preset=>preset.name===normalizedName?{...preset,controls}:preset));
 }else{
  if(presets.length>=maxCurvePresets||presets.some(preset=>preset.name.toLowerCase()===normalizedName.toLowerCase()))return;
  updateCustomCurvePresets([...presets,{name:normalizedName,controls}]);
 }
}
function removeCustomCurvePreset({name}:{name:string}){
 if(!curvesVisible.value)return;
 const presets=customCurvePresets.value.filter(preset=>preset.name!==name);
 if(presets.length!==customCurvePresets.value.length)updateCustomCurvePresets(presets);
}
async function applyCustomCurvePreset({name,selections}:{name:string;selections:readonly CurveSegmentSelection[]}){
 const current=currentCurveSegments(selections),preset=customCurvePresets.value.find(item=>item.name===name);
 if(!current.length||!preset)return;
 const result=await w.applyAnimationCurvePreset(current,preset.controls);
 if(result==='incompatible')w.showNotice(t('animation_curvesPresetIncompatible'),true);
}
function commitKeyShown(request:KeyShownRequest){
 if (mcp.state.value.enabled||mcp.visible.value||updater.installing.value||w.parentPicking||w.clippingDraft||w.traceOpen
   ||w.newDialog||w.discardDialog||creatorModalOpen.value) return;
 const invalid=w.inspectorError||w.animationKeyError||w.eventKeyError||w.sequenceFieldError||w.attachmentColorError;
 if(invalid){w.showNotice(invalid,true);return;}
 void w.keyShownAnimationTracks(request);
}
async function newAnimation(){await w.setEditorMode('animate');await nextTick();if(w.editorMode==='animate')timeline.value?.beginName('create');}
const eventCreator=ref(false),eventName=ref('event');
const eventNameValid=computed(()=>{const value=eventName.value.trim();return value.length>0&&[...value].length<=120&&!/\p{Cc}/u.test(value)&&!w.eventDefinitions.some(event=>event.name===value);});
function newEvent(){if(w.editorMode!=='setup')return;let value='event',index=2;while(w.eventDefinitions.some(event=>event.name===value))value='event '+index++;eventName.value=value;eventCreator.value=true;}
async function submitEvent(){if(eventNameValid.value&&await w.createEvent(eventName.value.trim()))eventCreator.value=false;}
const timelineMinHeight=190, stackedTimelineMinHeight=300;
const timelinePane=ref<HTMLElement|null>(null);
const stackedTimelines=ref(false);
const timelineHeight=ref(Math.round(window.innerHeight*.4));
const stackedTimelineHeight=ref<number|null>(null);
const timelinePaneHeight=computed(()=>stackedTimelines.value
 ? Math.max(stackedTimelineMinHeight,stackedTimelineHeight.value??timelineHeight.value)
 : timelineHeight.value);
try{const saved=Number(localStorage.getItem('fbones.animation-height'));if(Number.isFinite(saved)&&saved>=timelineMinHeight)timelineHeight.value=saved;}catch{/* optional workspace preference */}
let stopTimelineResize:((keepSize?:boolean)=>void)|null=null;
function setStackedTimelines(stacked:boolean){
 stopTimelineResize?.();
 stackedTimelines.value=stacked;
}
function setTimelinePaneHeight(requested:number){
 const minimum=stackedTimelines.value?stackedTimelineMinHeight:timelineMinHeight;
 const maximum=(timelinePane.value?.parentElement?.clientHeight??window.innerHeight)*.7;
 const height=Math.min(maximum,Math.max(minimum,requested));
 if(stackedTimelines.value)stackedTimelineHeight.value=height;
 else timelineHeight.value=height;
}
function measuredTimelinePaneHeight(){return timelinePane.value?.getBoundingClientRect().height??timelinePaneHeight.value;}
function resizeTimeline(event:PointerEvent){
 if(event.button!==0)return;
 event.preventDefault();
 stopTimelineResize?.();
 const start=event.clientY,height=measuredTimelinePaneHeight();
 const initialTimelineHeight=timelineHeight.value,initialStackedHeight=stackedTimelineHeight.value;
 const move=(e:PointerEvent)=>{setTimelinePaneHeight(height+start-e.clientY);};
 const finish=(keepSize=true)=>{
  window.removeEventListener('pointermove',move);
  window.removeEventListener('pointerup',endPointerResize);
  window.removeEventListener('pointercancel',endPointerResize);
  stopTimelineResize=null;
  if(!keepSize){timelineHeight.value=initialTimelineHeight;stackedTimelineHeight.value=initialStackedHeight;return;}
  if(!stackedTimelines.value){try{localStorage.setItem('fbones.animation-height',String(timelineHeight.value));}catch{/* optional */}}
 };
 const endPointerResize=()=>finish();
 window.addEventListener('pointermove',move);
 window.addEventListener('pointerup',endPointerResize);
 window.addEventListener('pointercancel',endPointerResize);
 stopTimelineResize=finish;
}
function timelineResizeKey(event:KeyboardEvent){
 if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
 event.preventDefault();
 setTimelinePaneHeight(measuredTimelinePaneHeight()+(event.key==='ArrowUp'?20:-20));
}
function timelineSelectBone(id:number,additive:boolean){if(additive){const ids=w.selectedIds.includes(id)?w.selectedIds.filter(b=>b!==id):[...w.selectedIds,id];w.selectBones(ids,ids.includes(id)?id:ids.at(-1)??null);}else w.selectBone(id);}
function timelineSelectShownBones(ids:number[]){
 const active=w.selectedBone?.id??null;
 if(w.editMode!=='bones')w.setMode('bones');
 w.selectBones(ids,active);
}
function changeEditorMode(value:'setup'|'animate'){
  if(w.traceApplying)return;
  (document.activeElement as HTMLElement|null)?.blur();
  void w.setEditorMode(value);
}
const name = ref('Untitled');
const submitted = ref(false);
const constraintCreator=ref<'ik'|'transform'|null>(null),clippingCreator=ref(false);
const linkedMeshCreator=ref(false);
const creatorModalOpen=computed(()=>!!constraintCreator.value||clippingCreator.value||linkedMeshCreator.value||eventCreator.value);
function closeCreators(){constraintCreator.value=null;clippingCreator.value=false;linkedMeshCreator.value=false;eventCreator.value=false;}
const findReplaceProject=shallowRef<ProjectSummary|null>(null);
const findReplaceOpen=computed(()=>findReplaceProject.value!==null);
const findReplaceBoneIds=shallowRef<readonly number[]>([]);
const findReplaceError=ref('');
const findReplaceApplying=ref(false);
let findReplaceOpener:HTMLButtonElement|null=null;
const updater=useAppUpdater({beforeInstall:async()=>{
  if(creatorModalOpen.value||findReplaceOpen.value){w.showNotice(t('updatePreparing'),true);return false;}
  animationTools.value?.cancelNumericDrag();
  const focused=document.activeElement;
  if(focused instanceof HTMLInputElement||focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)focused.blur();
  finishTransformWheel();
  return w.prepareForUpdate();
},expectedRevision:()=>w.project?.revision??null});
const transformInputModalOpen=computed(()=>creatorModalOpen.value||
  findReplaceOpen.value||mcp.visible.value||mcp.state.value.enabled||updater.installing.value);
async function createConstraint(type:'ik'|'transform'|'physics'){
  if(type!=='physics'){constraintCreator.value=type;return;}
  const count=w.physicsBoneIds.length;
  if(!count){w.showNotice(t('selectPhysicsBones'),true);return;}
  (document.activeElement as HTMLElement|null)?.blur();
  if(await w.addPhysicsToSelectedBones())w.showNotice(t('physicsAdded',{count}));
}
watch(()=>creatorModalOpen.value||findReplaceOpen.value,open=>{if(open)w.suspendSimulation('creator-modal');else w.resumeSimulation('creator-modal');},{flush:'sync'});
function storedLayout(){try{return localStorage.getItem(dockStorageKey);}catch{return null;}}
const setupDockLayout=ref(readDockLayout(storedLayout(),window.innerWidth<1340));
const animationDockLayout=ref(defaultDockLayout(window.innerWidth<1100,'animate'));
try{const saved=localStorage.getItem('fbones.animate-dock-layout.v1');if(saved)animationDockLayout.value=readDockLayout(saved,window.innerWidth<1100,'animate');}catch{/* optional workspace preference */}
const dockLayout=computed({get:()=>w.editorMode==='animate'?animationDockLayout.value:setupDockLayout.value,set:value=>{if(w.editorMode==='animate')animationDockLayout.value=value;else setupDockLayout.value=value;}});
const viewsMinimized=ref(false);
const projectViewport=ref<InstanceType<typeof ProjectViewport>>();
const minimizedSetupPanels=ref(new Set<DockPanelId>());
const minimizedAnimatePanels=ref(new Set<DockPanelId>());
const minimizedPanels=computed(()=>w.editorMode==='animate'?minimizedAnimatePanels.value:minimizedSetupPanels.value);
const canToggleDockedViews=computed(()=>!transformInputModalOpen.value&&!w.openingProject&&!w.newDialog&&!w.discardDialog&&
  !w.traceOpen&&!w.traceApplying&&!w.pruneOpen&&!w.clippingDraft&&!w.meshOutlineDraft&&!w.parentPicking);
function openLinkedMeshCreator(){
  if(w.editorMode!=='setup'||!w.sceneEditing||!w.canEdit||w.busy||w.editing||w.inspectorError||
    !canToggleDockedViews.value||!w.linkedMeshCreationSources.length||projectViewport.value?.interactionActive())return;
  linkedMeshCreator.value=true;
}
const findReplaceEnabled=computed(()=>w.editorMode==='setup'&&w.sceneEditing&&w.canEdit&&canToggleDockedViews.value&&
  !w.busy&&!w.editing&&!w.inspectorError);
function openTreeFindReplace(opener:HTMLButtonElement){
  if(!findReplaceEnabled.value||!w.project||projectViewport.value?.interactionActive())return;
  findReplaceOpener=opener;
  findReplaceError.value='';
  findReplaceBoneIds.value=w.librarySelection===null&&w.selectedEventId===null&&w.selectedConstraintId===null&&
    w.selectedSlotId===null&&w.selectedAttachmentId===null ? [...w.selectedIds] : [];
  findReplaceProject.value=w.project;
}
async function closeTreeFindReplace(){
  if(!findReplaceOpen.value||findReplaceApplying.value)return;
  const opener=findReplaceOpener;
  findReplaceOpener=null;
  findReplaceProject.value=null;
  await nextTick();
  if(!findReplaceOpen.value&&opener?.isConnected)opener.focus({preventScroll:true});
}
watch(()=>logicalDocumentKey(w.project),()=>{void closeTreeFindReplace();});
type TreeRenameRequest={documentId:number;revision:number;renames:Extract<RigEdit,{type:'renameBones'}>['renames']};
async function applyTreeFindReplace(request:TreeRenameRequest){
  const preview=findReplaceProject.value,current=w.project;
  if(!preview||!current||findReplaceApplying.value||w.busy||w.editorMode!=='setup'||!w.canEdit||!w.sceneEditing)return;
  if(logicalDocumentKey(preview)!==logicalDocumentKey(current)){void closeTreeFindReplace();return;}
  if(preview.documentId!==request.documentId||preview.revision!==request.revision||
    current.documentId!==request.documentId||current.revision!==request.revision){
    findReplaceProject.value=current;
    findReplaceError.value=t('treeFindReplaceStale');
    return;
  }
  findReplaceError.value='';
  findReplaceApplying.value=true;
  let success=false;
  try{success=await w.editRig({type:'renameBones',renames:request.renames},request.revision);}
  finally{findReplaceApplying.value=false;}
  if(success||logicalDocumentKey(preview)!==logicalDocumentKey(w.project)){void closeTreeFindReplace();return;}
  findReplaceError.value=w.noticeError&&w.notice?w.notice:t('treeFindReplaceFailed');
}
function dockedViewsToggleAvailable(){
 const focus=document.activeElement;
 return canToggleDockedViews.value&&!(focus instanceof HTMLElement&&
   (focus.isContentEditable||focus.matches('input,textarea,select')));
}
function toggleDockedViews(){
 if(!dockedViewsToggleAvailable())return false;
 viewportToolbarLayout.value?.cancelDrag();
 animationTools.value?.cancelNumericDrag();
 animationTools.value?.cancelWheel();
 stopTimelineResize?.(false);
 viewsMinimized.value=!viewsMinimized.value;
 return true;
}
function panelOnScreen(id:DockPanelId){
 return !viewsMinimized.value&&!minimizedPanels.value.has(id)&&dockPanel(dockLayout.value,id).visible;
}
async function setPanelMinimized(id:DockPanelId,minimized:boolean){
 if(viewsMinimized.value||!dockedViewsToggleAvailable()||!dockPanel(dockLayout.value,id).visible)return;
 const panels=minimizedPanels.value;
 if(panels.has(id)===minimized)return;
 if(minimized)panels.add(id);else panels.delete(id);
 await nextTick();
 if(minimizedPanels.value===panels&&!viewsMinimized.value&&panels.has(id)===minimized){
  document.getElementById(`${minimized?'restore-dock':'dock-pane-actions'}-${id}`)?.focus();
 }
}
const previewVisible = computed(()=>panelOnScreen(w.editorMode==='animate'?'properties':'preview'));
const previewTracks = usePreviewTracks(()=>w.project, ()=>previewVisible.value, ()=>w.animationId);
const previewHideControls = ref(false);
const previewShowBones = ref(false);
const curvesVisible=computed(()=>w.editorMode==='animate'&&dockPanel(animationDockLayout.value,'curves').visible);
const curvesSelections=computed(()=>curvesVisible.value?timeline.value?.curveSegmentSelections??[]:[]);
const curvesEditable=computed(()=>w.editorMode==='animate'&&panelOnScreen('curves')&&w.canEdit&&!w.busy&&!w.inspectorError&&!w.animationKeyError&&
 !w.eventKeyError&&!w.sequenceFieldError&&!w.attachmentColorError);
const availableDockPanels=computed(()=>dockPanels.filter(id=>id!==(w.editorMode==='animate'?'preview':'curves')));
const dockTitles=computed(()=>({weights:t('weights'),mesh:t('meshTools'),tree:t('tree'),properties:w.editorMode==='animate'?t('previewTitle'):t('properties'),preview:t('previewTitle'),ik:t('constraint_ik'),transform:t('constraint_transform'),physics:t('constraint_physics'),curves:t('animation_curvesDock')}));
const panelsToRestore=computed(()=>availableDockPanels.value.filter(id=>minimizedPanels.value.has(id))
 .map(id=>({id,title:dockTitles.value[id]})));
const viewsMenu = ref<HTMLDetailsElement>();
const ghostingControls = ref<InstanceType<typeof GhostingControls>>();
function showGhosting() {
  if (viewsMenu.value) viewsMenu.value.open = false;
  void ghostingControls.value?.show();
}
function showPanel(id:DockPanelId,visible=true){
 minimizedPanels.value.delete(id);
 if(dockPanel(dockLayout.value,id).visible===visible)return;
 const copy=cloneDockLayout(dockLayout.value);
 dockPanel(copy,id).visible=visible;
 dockLayout.value=copy;
}
async function closeDockedPanel(id:DockPanelId){
 showPanel(id,false);
 await nextTick();
 viewsMenu.value?.querySelector('summary')?.focus();
}
const showWeights=computed({get:()=>dockPanel(dockLayout.value,'weights').visible,set:value=>showPanel('weights',value)});
const canUseWeightsShortcut=computed(()=>{
 const attachment=w.selectedAttachment;
 return !viewsMinimized.value&&canToggleDockedViews.value&&w.editorMode==='setup'&&w.sceneEditing&&w.canEdit&&
   !w.busy&&!w.editing&&!w.inspectorError&&w.treeFilters.attachment&&w.selectedAttachmentIds.length===1&&
   !!attachment&&w.selectedAttachmentIds[0]===attachment.id&&
   (attachment.type==='mesh'&&!!attachment.mesh||attachment.type==='clipping'&&!!attachment.clipping);
});
const showMesh=computed({get:()=>dockPanel(dockLayout.value,'mesh').visible,set:value=>showPanel('mesh',value)});
const weightsPanel=ref<InstanceType<typeof WeightsPanel>>();
const sceneTree=ref<InstanceType<typeof SceneTree>>();
const treeFilterGestureActive=()=>projectViewport.value?.interactionActive()??false;
const hideTreeSkeletonNames=ref(false);
const treeSkeletonName=computed(()=>{
  const project=w.project;
  return project?.sceneEditing&&!project.inspectionOnly&&project.name?project.name:null;
});
const animateWeightInspection=computed(()=>{
  const target=w.animateWeightsTarget,vertex=w.animateWeightsVertex;
  return panelOnScreen('weights')&&target&&vertex!==null?{attachmentId:target.attachmentId,vertex}:null;
});
async function inspectAnimateWeights(){
  if(!w.animateWeightsTarget)return;
  showWeights.value=true;
  await nextTick();
  weightsPanel.value?.focusInspection();
}
watch(dockLayout,value=>{try{localStorage.setItem(w.editorMode==='animate'?'fbones.animate-dock-layout.v1':dockStorageKey,JSON.stringify(value));}catch{/* Workspace layout is optional local UI state. */}},{deep:true});
function alignViewportToolbar(position:0|.5|1){
 viewportToolbarLayout.value?.cancelDrag();
 viewportToolbarPosition.value=position;
}
function setViewportToolbarLabelMode(mode:ViewportToolbarLabelMode){
 viewportToolbarLayout.value?.cancelDrag();
 viewportToolbarLabelMode.value=mode;
}
function resetLayout(){
 const mode=w.editorMode;
 alignViewportToolbar(.5);
 viewportToolbarLabelMode.value='automatic';
 minimizedPanels.value.clear();
 dockLayout.value=defaultDockLayout(window.innerWidth<(mode==='animate'?1100:1340),mode);
 viewportToolbarLocked.value=true;
}

watch(()=>w.editMode,value=>{if(value==='weights')showWeights.value=true;});
function mode(value:EditMode){
  if(w.traceApplying||w.hasSelectedPath&&value!=='bones'&&value!=='images')return;
  if(w.clippingDraft)w.cancelClipping();
  if(w.traceOpen)w.cancelTrace();
  const target=w.editorMode==='animate'&&value==='meshes'&&w.selectedAttachment?.clipping?'clipping':value;
  if(w.editMode!==target)w.setMode(target);
  if(value==='weights')showWeights.value=true;
  if(value==='meshes'||value==='clipping')showMesh.value=true;
}
function handleSetupWeightsShortcut(event:KeyboardEvent,target:HTMLElement){
 if(event.repeat||event.isComposing||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||
   !canUseWeightsShortcut.value||target.isContentEditable||target.closest('[role="menu"],[role="dialog"],details[open]')||
   projectViewport.value?.interactionActive())return;
 event.preventDefault();
 mode('weights');
}
const displayedAttachment=computed(()=>w.treeFilters.attachment?w.selectedAttachment:null);
function editDeformSource(){
  const source=w.selectedDeformSourceId;
  if(source===undefined||!w.canEdit||w.busy||!w.activeAnimation)return;
  w.selectAttachment(source);mode('meshes');
}
const hasClippingTransformRows=computed(()=>{
  const attachment=displayedAttachment.value;
  return w.editorMode==='setup'&&w.sceneEditing&&attachment?.type==='clipping'&&!!attachment.clipping&&
    w.selectedAttachmentIds.length===1&&w.selectedAttachmentIds[0]===attachment.id;
});
const canChooseClippingTransform=computed(()=>hasClippingTransformRows.value&&w.canEdit&&!w.busy&&!w.openingProject&&
  !w.traceOpen&&!w.traceApplying&&!w.clippingDraft&&!w.meshOutlineDraft&&!w.parentPicking&&!w.pruneOpen&&!w.newDialog&&!w.discardDialog);
function chooseClippingTransform(tool:'rotate'|'translate'|'scale'){
  if(!canChooseClippingTransform.value)return;
  if(w.editMode!=='images')mode('images');
  useTool(tool);
}
const selectedMeshHullCenter=computed(()=>{
  const attachment=displayedAttachment.value;
  if(w.editorMode!=='setup'||w.openingProject||w.parentPicking||!w.sceneEditing||attachment?.type!=='mesh'||
    w.selectedAttachmentIds.length!==1||w.selectedAttachmentIds[0]!==attachment.id)return null;
  return meshHullCenter(w.renderedBones,w.viewSlots,attachment);
});
const meshGenerateHint=computed(()=>t(w.meshGenerateProblem??'meshGenerateHint'));
const meshOutlineNewHint=computed(()=>t(w.meshOutlineProblem??'meshOutlineNewHint'));
const meshOutlineResetHint=computed(()=>t(w.meshOutlineProblem??'meshOutlineResetHint'));
const meshDisplayControls=[
 {key:'triangles',label:'meshDisplayTriangles',hint:'meshDisplayTrianglesHint'},
 {key:'dim',label:'meshDisplayDim',hint:'meshDisplayDimHint'},
 {key:'isolate',label:'meshDisplayIsolate',hint:'meshDisplayIsolateHint'},
] as const;
const displayedConstraint=computed(()=>w.treeFilters.constraint?w.selectedConstraint:null);
const displayedSlot=computed(()=>w.treeFilters.slot&&(!w.selectedAttachment||!w.treeFilters.attachment)?w.selectedSlotRaw:null);
const displayedBone=computed(()=>w.treeFilters.bone?w.selectedBone:null);
const selectedImage=computed(()=>w.library.images.find(image=>image.key===w.librarySelection)??null);
const imageTransforms=computed(()=>w.sceneEditing&&w.editMode==='images'&&w.selectedAttachmentIds.length>0);
const transformSelectionCount=computed(()=>imageTransforms.value?w.selectedAttachmentIds.length:w.selectedIds.length);
const hasPhysics=computed(()=>w.sceneEditing&&w.constraints.some(c=>c.type==='physics'));
const transformTools:ReadonlyArray<{id:EditorTool;label:string;key:string}>= [{id:'translate',label:'translate',key:'V'},{id:'rotate',label:'rotate',key:'C'},{id:'scale',label:'scale',key:'X'},{id:'shear',label:'shear',key:'Z'},{id:'pose',label:'pose',key:''},{id:'length',label:'lengthTool',key:'L'}];
const boneToolHistory=shallowRef<{current:EditorTool;previous:EditorTool|null}|null>(null);
const boneToolContext=computed(()=>{
  const bone=w.selectedBone;
  if(!w.canEdit||w.editMode!=='bones'||!w.treeFilters.bone||!bone||w.selectedIds.length!==1||w.selectedIds[0]!==bone.id||
    w.selectedSlotIds.length||w.selectedAttachmentIds.length||w.selectedConstraintIds.length||w.selectedEventId!==null||w.librarySelection!==null)return null;
  const clip=w.editorMode==='animate'?w.activeAnimation:null;
  if(w.editorMode==='animate'&&!clip)return null;
  return `${logicalDocumentKey(w.project)}:${w.editorMode}:${bone.id}:${clip?.id??''}`;
});
function compatibleBoneTool(tool:EditorTool){
  const family=tool==='pose'?'rotate':tool;
  return (family==='translate'||family==='rotate'||family==='scale'||family==='shear')&&
    (w.editorMode==='setup'||w.animationChannels.some(channel=>animationChannelFamily(channel)===family));
}
// Workspace can reset the active tool when changing mode or selecting an object.
// Only an explicit choice can carry the old tool forward after that reset.
watch([boneToolContext,()=>w.tool],()=>{boneToolHistory.value=null;},{flush:'sync'});
function chooseBoneTool(tool:EditorTool,context=boneToolContext.value){
  const history=boneToolHistory.value;
  w.tool=tool;
  if(!context||context!==boneToolContext.value||!compatibleBoneTool(tool))return;
  boneToolHistory.value=history?.current===tool?history:{
    current:tool,
    previous:history&&compatibleBoneTool(history.current)?history.current:null,
  };
}
const canSwapPreviousTool=computed(()=>{
  const history=boneToolHistory.value;
  return !!boneToolContext.value&&!!history?.previous&&history.current===w.tool&&
    compatibleBoneTool(history.current)&&compatibleBoneTool(history.previous)&&
    !w.busy&&!w.editing&&!w.openingProject&&!w.animationPlaying&&!w.timelineAdjustState.enabled&&!w.parentPicking&&
    !w.traceOpen&&!w.clippingDraft&&!w.meshOutlineDraft&&!w.pruneOpen&&!w.newDialog&&!w.discardDialog&&
    !transformInputModalOpen.value;
});
function swapPreviousTool(){
  const previous=boneToolHistory.value?.previous;
  if(!canSwapPreviousTool.value||!previous)return;
  const focus=document.activeElement;
  // An eligible right press preserves the field's focus. A field or invalid draft vetoes the swap on release.
  if(focus instanceof HTMLElement&&(focus.isContentEditable||focus.matches('input,textarea,select')))return;
  if(w.inspectorError||w.animationKeyError||w.eventKeyError||w.sequenceFieldError||w.attachmentColorError)return;
  chooseBoneTool(previous);
}
function useTool(tool:EditorTool){
  if(w.editorMode==='animate'&&tool!=='translate'&&tool!=='select'&&tool!=='pan'){
    const family=tool==='pose'?'rotate':tool;
    if((family!=='rotate'&&family!=='scale'&&family!=='shear')||!w.animationChannels.includes(family)){
      w.showNotice('This animation tool is not available yet.',true);
      return;
    }
  }
  const context=boneToolContext.value;
  const target=toolEditMode({mode:w.editMode,sceneEditing:w.sceneEditing,selectedAttachmentIds:w.selectedAttachmentIds},tool);
  if(target!==w.editMode)mode(target);
  chooseBoneTool(tool,context);
}
function rename(){if(!w.canEdit||w.busy)return;const field=document.querySelector<HTMLInputElement>(w.selectedConstraint?'[data-testid="constraint-name"]':w.selectedAttachment?'[data-testid="attachment-name"]':w.selectedSlot?'[data-testid="slot-name"]':'[data-testid="bone-name"]');field?.focus();field?.select();}
const nameValid = computed(() => validProjectName(name.value));
let cleanup: Array<() => void> = [];
let disposed = false;
const canExportAuthoredBundle = computed(() =>
  desktop && w.canEdit && w.sceneEditing && !w.busy && !w.inspectorError && !w.animationKeyError &&
  !w.eventKeyError && !w.sequenceFieldError && !w.attachmentColorError && !w.traceOpen &&
  !w.clippingDraft && !w.meshOutlineDraft && !creatorModalOpen.value,
);
const gifDialog = ref(false);
const gifError = ref('');
const canExportGif = computed(() => canExportAuthoredBundle.value && !!w.project?.animations?.length &&
  !w.newDialog && !w.discardDialog && !w.pruneOpen);
async function submitGif(options: GifExportOptions) {
  gifError.value = '';
  const exported = await w.exportGif(options);
  if (exported) gifDialog.value = false;
  else if (w.noticeError) gifError.value = w.notice;
}

function command(id: string) {
  const opensProject=id==='open'||id==='repair-linked-mesh-copy';
  const exportSpineBundle = id === 'export-spine-bundle';
  const exportGif = id === 'export-gif';
  if (gifDialog.value || (exportGif && (creatorModalOpen.value || !canExportGif.value))) return;
  if(updater.installing.value)return;
  if(findReplaceOpen.value){if(id==='quit')void closeTreeFindReplace();return;}
  if (w.pruneOpen) {
    if (w.busy || !(opensProject||['new', 'close', 'quit'].includes(id))) return;
    w.cancelPrune();
  }
  if(id==='mcp'){if(!creatorModalOpen.value)mcp.visible.value=true;return;}
  if(mcp.state.value.enabled||mcp.visible.value)return;
  if(id==='check-updates'){void updater.checkNow();return;}
  if(w.traceApplying)return;
  if(w.parentPicking)w.cancelParentPick();
  if(creatorModalOpen.value){if(exportSpineBundle||['save','copy','export-runtime','undo','redo','import', 'import-psd'].includes(id)||linkedMeshCreator.value&&(w.busy||w.editing))return;closeCreators();}
  if(w.meshOutlineDraft){
    if(exportSpineBundle||['save','copy','export-runtime','undo','redo','import','import-psd'].includes(id)){w.showNotice(t('meshOutlineFinishFirst'),true);return;}
    if(opensProject||['new','close','quit'].includes(id)){if(w.busy)return;w.cancelMeshOutline();}
  }
  if(w.clippingDraft){if(exportSpineBundle||['save','copy','undo','redo','import', 'import-psd'].includes(id)){w.showNotice(t('clippingFinishFirst'));return;}if(opensProject||['new','close','quit'].includes(id))w.cancelClipping();}
  document.querySelectorAll<HTMLDetailsElement>('details.editor-menu[open]').forEach(el=>{el.open=false;});
  if(w.traceOpen){if(exportSpineBundle||['save','copy','undo','redo','import', 'import-psd'].includes(id)){w.showNotice(t('traceFinishFirst'));return;}if(opensProject||['new','close','quit'].includes(id))w.cancelTrace();}
  if (exportSpineBundle && (w.newDialog || w.discardDialog)) return;
  if (w.newDialog && ['save', 'copy', 'undo', 'redo', 'import', 'import-psd'].includes(id)) return;
  if (w.discardDialog && ['undo', 'redo', 'import', 'import-psd'].includes(id)) return;
  const finishWheel=id==='save'||id==='copy'||id==='export-runtime'||exportSpineBundle||exportGif;
  const flushFocusedField=finishWheel||['undo','redo','import','import-psd'].includes(id);
  if(flushFocusedField||opensProject||['close','quit'].includes(id)){
    animationTools.value?.cancelNumericDrag();
    if(!finishWheel)animationTools.value?.cancelWheel();
  }
  if(flushFocusedField)(document.activeElement as HTMLElement|null)?.blur();
  // A hovered wheel adjustment need not have a focused field. Dispatch it before the command awaits the active edit.
  if(finishWheel)finishTransformWheel();
  if (id === 'undo' || id === 'redo') void w.editRig({ type: id });
  if(id==='new')openNew();
  if (opensProject||['close', 'quit'].includes(id)) void w.request(id as Intent);
  if (id === 'copy') void w.copy();
  if (id === 'save') void w.save();
  if (id === 'export-runtime') void w.exportRuntime();
  if (exportSpineBundle) void w.exportSpineBundle();
  if (exportGif) { gifError.value = ''; gifDialog.value = true; }
  if (id === 'import') void w.chooseImagesFolder();
  if (id === 'import-psd') void w.importPsd();
}
function handleWeightClipboard(event: KeyboardEvent, target: HTMLElement) {
  if (w.editorMode !== 'setup' || target !== document.activeElement || target.isContentEditable ||
      event.isComposing || event.altKey || event.shiftKey || event.ctrlKey === event.metaKey) return false;
  const key = event.key.toLowerCase();
  if (key !== 'c' && key !== 'v') return false;
  const inWeights = target.closest('[data-weights-clipboard-scope]');
  const inViewport = w.editMode === 'weights' && target.matches('[data-testid="viewport"]');
  if (!inWeights && !inViewport) return false;
  if (key === 'c' ? !w.canCopyWeights : !w.canPasteWeights) return false;
  event.preventDefault();
  if (!event.repeat) {
    if (key === 'c') w.copyWeights();
    else void w.pasteWeights();
  }
  return true;
}
function cancelTraceFromEscape(event:KeyboardEvent){
  event.preventDefault();
  event.stopPropagation();
  w.cancelTrace();
}
function keyboard(event: KeyboardEvent) {
  if (gifDialog.value) return;
  if(mcp.state.value.enabled||mcp.visible.value)return;
  if(updater.installing.value){event.preventDefault();return;}
  if(findReplaceOpen.value)return;
  if(event.defaultPrevented)return;
  if(w.traceApplying){
    if(event.key==='Escape')cancelTraceFromEscape(event);
    else if((event.ctrlKey||event.metaKey)&&['n','o','s','w','i','q','z','y'].includes(event.key.toLowerCase())){
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }
  if (w.pruneOpen) {
    if ((event.ctrlKey || event.metaKey) && ['n', 'o', 's', 'w'].includes(event.key.toLowerCase())) event.preventDefault();
    return;
  }
  if (linuxDesktop && event.ctrlKey && !event.altKey && !event.metaKey && !event.isComposing) {
    const key = event.key.toLowerCase();
    const action = event.shiftKey ? (key === 's' ? 'copy' : undefined) : linuxFileShortcuts[key];
    if (action) {
      event.preventDefault();
      if (!event.repeat && !w.newDialog && !w.discardDialog) command(action);
      return;
    }
  }
  if(w.parentPicking){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();w.cancelParentPick();}return;}
  if(creatorModalOpen.value){if(event.key==='Escape'){event.preventDefault();if(!linkedMeshCreator.value||!w.busy&&!w.editing)closeCreators();}return;}
  if(w.clippingDraft){if(event.key==='Escape'){event.preventDefault();w.cancelClipping();}else if(event.key==='Enter'){event.preventDefault();void w.finishClipping();}return;}
  if(w.traceOpen&&event.key==='Escape'){cancelTraceFromEscape(event);return;}
  const target = event.target as HTMLElement;
  if(w.meshOutlineDraft&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();if(!w.busy)w.cancelMeshOutline();return;
    }
    if(!event.isComposing&&!target.closest('input,textarea,select,[contenteditable="true"]')){
      if(event.key==='Backspace'){event.preventDefault();if(!event.repeat)w.removeLastMeshOutlinePoint();}
      if(event.key==='Enter'&&!target.closest('[data-testid="mesh-outline-draft-controls"] button')){
        event.preventDefault();if(!event.repeat)void w.finishMeshOutline();
      }
    }
    return;
  }
  if (target.closest('input, textarea, select, [contenteditable="true"]') || w.newDialog || w.discardDialog) return;
  if(w.traceOpen){
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();w.showNotice(t('traceFinishFirst'));}
    return;
  }
  if((event.key==='F3'||event.key==='Enter')&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.isComposing&&
    !transformInputModalOpen.value&&!projectViewport.value?.interactionActive()){
    const handled=event.key==='F3'
      ?sceneTree.value?.navigateSearch(event.shiftKey?-1:1)
      :!event.shiftKey&&!event.repeat&&(target===document.body||
        (target.matches('canvas')&&target.closest('[data-testid="viewport"]')))&&sceneTree.value?.focusSearch();
    if(handled){event.preventDefault();return;}
  }
  if(event.key==='F9'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.isComposing){
    if(event.repeat?dockedViewsToggleAvailable():toggleDockedViews())event.preventDefault();
    return;
  }
  if (handleWeightClipboard(event, target)) return;
  if(event.key.toLowerCase()==='g'){handleSetupWeightsShortcut(event,target);return;}
  if (!viewsMinimized.value&&w.editorMode==='animate'&&event.shiftKey&&!event.altKey&&event.key.toLowerCase()==='l'&&(event.ctrlKey||event.metaKey)) {
    const primary=appleDesktop ? event.metaKey&&!event.ctrlKey : event.ctrlKey&&!event.metaKey;
    if(primary){
      if (!event.repeat&&!event.isComposing&&!target.isContentEditable&&timeline.value?.keyShown()) event.preventDefault();
      return;
    }
  }
  if(w.editorMode==='animate'&&!event.ctrlKey&&!event.metaKey){
    if(event.key===' '){if(target.closest('button')){event.stopPropagation();return;}event.preventDefault();event.stopPropagation();if(w.animationPlaying)w.pauseAnimation();else w.playAnimation();return;}
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();w.seekAnimation(w.animationFrame+(event.key==='ArrowRight'?1:-1));return;}
    if(event.key.toLowerCase()==='k'){
      event.preventDefault();
      if(w.selectedEventId!==null)void w.insertEventAnimationKey(w.selectedEventId);
      else if(w.selectedConstraint){
        const {type,id}=w.selectedConstraint;
        if(type==='path'||w.selectedConstraints.some(constraint=>constraint.type==='path'))return;
        const kind=type==='transform'?'transformMix':type;
        if(w.selectedConstraints.length>1)void w.insertConstraintAnimationKeysBatch({constraintIds:w.selectedConstraintIds,kind});
        else void w.insertConstraintAnimationKeys({constraintId:id,kind});
      }else if(w.selectedAttachment?.sequence)void w.insertSequenceAnimationKey(w.selectedAttachment.id);
      else if(w.selectedSlotId!==null)void w.insertSlotAnimationKeys({slotId:w.selectedSlotId,channel:'attachment'});
      else void w.keyAnimationChanges(w.tool==='pose'||w.tool==='rotate'?'rotate':w.tool==='scale'?'scale':w.tool==='shear'?'shear':'translate');
      return;
    }
    if(['p','b','n','l'].includes(event.key.toLowerCase()))return;
    if(event.key==='Delete'||event.key==='Backspace')return;
  }
  if(event.key==='F2'){event.preventDefault();rename();return;}
  if(!event.ctrlKey&&!event.metaKey&&event.key.toLowerCase()==='p'){event.preventDefault();void w.beginParentPick();return;}
  if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
    event.preventDefault(); command(event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo');
  } else if (!desktop && (event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='i') {
    event.preventDefault();command('import');
  } else if (!desktop && (event.ctrlKey || event.metaKey)) {
    const map: Record<string, string> = { n: 'new', o: 'open', w: 'close', s: event.shiftKey ? 'copy' : 'save' };
    const id = map[event.key.toLowerCase()];
    if (id) { event.preventDefault(); command(id); }
  } else if (!event.ctrlKey && !event.metaKey) {
    const tools:Record<string,EditorTool>={v:'translate',c:'rotate',x:'scale',z:'shear',l:'length',b:'create',n:'create',h:'pan'};
    const tool=tools[event.key.toLowerCase()];
    if(tool&&(w.canEdit||tool==='pan')){event.preventDefault();useTool(tool);}
    else if(event.key==='Delete'||event.key==='Backspace'){if(w.canEdit){event.preventDefault();void w.removeSelection();}}
    else if(event.key.toLowerCase()==='f'){event.preventDefault();w.resetCount++;}
  }
}
async function create() { submitted.value = true; if (nameValid.value) await w.create(name.value); }
function openNew() {
  if(w.traceApplying)return;
  animationTools.value?.cancelNumericDrag();
  animationTools.value?.cancelWheel();
  if(w.traceOpen)w.cancelTrace();
  name.value=t('untitled');submitted.value=false;
  void w.request('new');
}

onMounted(async () => {
  document.addEventListener('keydown', keyboard);
  await w.initialize();
  if (desktop) {
    const handlers = await Promise.all([
      onEditorCommand(command),
      onMcpProjectChanged(()=>{void w.refreshFromMcp().catch(()=>{});}),
      nativeWindow().onCloseRequested((event) => { event.preventDefault(); command('quit'); }),
    ]);
    if (disposed) handlers.forEach((stop) => stop()); else cleanup = handlers;
  }
});
onBeforeUnmount(() => {
  animationTools.value?.cancelNumericDrag();
  stopTimelineResize?.();
  clearCompensationFeedback();
  w.resumeSimulation('mcp');w.resumeSimulation('creator-modal');w.stopAnimationAudio(); disposed = true; document.removeEventListener('keydown', keyboard); cleanup.forEach((stop) => stop()); });
</script>

<template>
  <div class="flex h-full min-h-0 flex-col select-none">
    <EditorTitleBar :title="w.project?.name??t('noProject')" :dirty="!!w.project?.dirty" :locked="updater.installing.value||mcp.state.value.enabled||findReplaceOpen" @close="command('quit')" @error="message=>w.showNotice(message,true)">
      <template #leading>
      <div class="mr-2 flex items-center gap-1.5 text-accent"><AppIcon name="logo" class="!size-5"/><span class="font-semibold tracking-wide text-ink">{{ t('appName') }}</span></div>
      <EditorFileMenu :inert="w.traceApplying"
        :can-save="!!w.project?.canSave&&!w.meshOutlineDraft" :can-copy="!!w.project?.canCopy&&!w.meshOutlineDraft" :can-close="!!w.project"
        :can-choose-images="desktop&&w.canEdit&&!w.busy&&!w.traceOpen&&!w.clippingDraft&&!w.meshOutlineDraft"
        :can-import-psd="w.canImportPsd"
        :can-export-runtime="canExportAuthoredBundle"
        :can-export-spine-bundle="canExportAuthoredBundle&&!w.newDialog&&!w.discardDialog&&!w.pruneOpen&&!constraintCreator&&!clippingCreator&&!eventCreator"
        :can-export-gif="canExportGif"
        @command="command"
      />
      <McpControl :controller="mcp"/>
      <AppButton variant="ghost" :disabled="w.busy||w.traceApplying" :aria-label="t('newProject')" :title="t('newProject')" @click="openNew"><AppIcon name="plus"/></AppButton>
      <AppButton variant="ghost" :disabled="w.busy||w.traceApplying" :aria-label="t('openProject')" :title="t('openProject')" @click="command('open')"><AppIcon name="folder"/></AppButton>
      <AppButton variant="ghost" :disabled="w.traceOpen||!!w.meshOutlineDraft||(w.busy&&!w.editing)||!(w.project?.canSave||w.project?.canCopy)" :aria-label="t('save')" :title="t('save')" @click="command(w.project?.canSave?'save':'copy')"><AppIcon name="save"/></AppButton>
      <span class="toolbar-separator"/>
      <AppButton variant="ghost" :disabled="w.traceOpen||!!w.meshOutlineDraft||w.busy||!w.project?.canUndo" :aria-label="t('undo')" :title="t('undo')+' (Ctrl+Z)'" @click="command('undo')"><AppIcon name="undo"/></AppButton>
      <AppButton variant="ghost" :disabled="w.traceOpen||!!w.meshOutlineDraft||w.busy||!w.project?.canRedo" :aria-label="t('redo')" :title="t('redo')+' (Ctrl+Shift+Z)'" @click="command('redo')"><AppIcon name="redo"/></AppButton>
      <span class="toolbar-separator"/>
      </template>
      <template #trailing>
      <UpdateNotice :updater="updater"/>
      <MinimizedDockedViews v-if="!viewsMinimized" :panels="panelsToRestore" :disabled="!canToggleDockedViews" @restore="setPanelMinimized($event,false)"/>
      <DockedViewsToggle :minimized="viewsMinimized" :disabled="!canToggleDockedViews" @toggle="toggleDockedViews"/>
      <details ref="viewsMenu" class="editor-menu"><summary @keydown.space.stop>{{ t('views') }}</summary><div class="menu-popover right-0">
        <label v-for="id in availableDockPanels" :key="id"><input type="checkbox" :checked="dockPanel(dockLayout,id).visible" :data-testid="'view-toggle-'+id" @change="showPanel(id,($event.target as HTMLInputElement).checked)"/>{{dockTitles[id]}}</label>
        <button v-if="w.editorMode==='animate'" type="button" data-testid="view-toggle-ghosting" @click="showGhosting">{{t('ghosting')}}</button>
        <hr/><ViewportToolbarAlignment :position="viewportToolbarPosition" :disabled="w.openingProject||w.traceApplying" @align="alignViewportToolbar"/>
        <fieldset class="min-w-0 px-2 pb-1" role="radiogroup" aria-labelledby="viewport-toolbar-labels-legend"
          :disabled="w.openingProject||w.traceApplying" data-testid="viewport-toolbar-labels">
          <legend id="viewport-toolbar-labels-legend" class="px-0 text-[11px] text-muted">{{t('viewportToolbarTextLabels')}}</legend>
          <div class="mt-1 grid grid-cols-3 gap-1">
            <label v-for="choice in viewportToolbarLabelChoices" :key="choice.mode"
              class="min-w-0 justify-center gap-1! rounded-sm border px-1! py-1! text-[11px] focus-within:border-accent"
              :class="viewportToolbarLabelMode===choice.mode?'border-line bg-raised text-ink':'border-transparent text-muted'">
              <input type="radio" class="size-3 shrink-0 accent-accent" name="viewport-toolbar-label-mode" :value="choice.mode"
                :checked="viewportToolbarLabelMode===choice.mode" :data-testid="`viewport-toolbar-labels-${choice.mode}`"
                @change="setViewportToolbarLabelMode(choice.mode)">
              {{t(choice.label)}}
            </label>
          </div>
        </fieldset>
        <hr/><button data-testid="reset-layout" @click="resetLayout">{{t('resetLayout')}}</button>
      </div></details>
      </template>
    </EditorTitleBar>
    <main class="flex min-h-0 flex-1 flex-col" :inert="updater.installing.value||mcp.state.value.enabled||findReplaceOpen" :aria-busy="w.busy||updater.installing.value">
    <div class="mode-toolbar">
      <div role="group" aria-label="Editor mode" class="mr-2 flex gap-0.5">
        <button class="dock-tab font-semibold" data-testid="editor-mode-setup" :class="{active:w.editorMode==='setup'}" :aria-pressed="w.editorMode==='setup'" :disabled="w.busy||w.traceApplying" @click="changeEditorMode('setup')">{{t('setup')}}</button>
        <button class="dock-tab font-semibold" data-testid="editor-mode-animate" :class="{active:w.editorMode==='animate'}" :aria-pressed="w.editorMode==='animate'" :disabled="!w.canEdit||w.busy||w.traceApplying" @click="changeEditorMode('animate')">{{t('animate')}}</button>
      </div>
      <div role="group" :aria-label="t('editingMode')" class="flex gap-0.5">
        <button v-for="item in (['bones','images','meshes','weights'] as const)" :key="item" class="dock-tab"
          :class="w.editMode===item||item==='meshes'&&w.editMode==='clipping'?'active':''"
          :aria-pressed="w.editMode===item||item==='meshes'&&w.editMode==='clipping'"
          :aria-keyshortcuts="item==='weights'&&canUseWeightsShortcut?'G':undefined"
          :title="item==='weights'&&canUseWeightsShortcut?`${t('weights')} (G)`:undefined"
          :disabled="w.traceApplying||(w.hasSelectedPath&&(item==='meshes'||item==='weights'))||(w.editorMode==='animate'&&item!=='bones'&&item!=='meshes')" @click="mode(item)"><AppIcon :name="item==='bones'?'bone':item==='images'?'image':item==='meshes'?'mesh':'weights'" class="!size-3.5"/>{{ t(item) }}</button>
      </div>
      <div class="ml-auto flex items-center gap-0.5">
        <GhostingControls v-if="w.editorMode==='animate'" ref="ghostingControls"/>
        <AppButton variant="ghost" :aria-label="t('grid')" :aria-pressed="w.grid" :title="t('grid')" @click="w.grid=!w.grid"><AppIcon name="grid" :class="w.grid?'text-accent':''"/></AppButton>
        <AppButton variant="ghost" :aria-label="t('resetView')" :title="t('resetView')+' (F)'" @click="w.resetCount++"><AppIcon name="reset"/></AppButton><span class="w-12 text-right tabular-nums text-muted">{{ w.zoom }}%</span>
      </div>
    </div>
    <div class="flex min-h-0 flex-1">
      <div class="animation-editor-stage">
      <ProjectViewport ref="projectViewport" class="editor-viewport min-w-48 flex-1" :snap-region-pixels="w.editorMode==='setup'&&viewportPixels" :scene-history-disabled="!canToggleDockedViews"
        :compensation="activeCompensation" :parent-translation="parentTranslation" :local-translation="localTranslation"
        :local-translation-unavailable="localTranslationUnavailable" :animate-weight-inspection="animateWeightInspection"
        :previous-tool-swap="canSwapPreviousTool" @swap-previous-tool="swapPreviousTool" @compensation-applied="showCompensationApplied"
        @viewport-selection="sceneTree?.revealViewportSelection($event)">
        <div v-if="w.openingProject" class="absolute inset-0 z-50 flex items-center justify-center bg-canvas/70 p-4" data-testid="project-opening" aria-hidden="true">
          <div class="flex max-w-sm items-start gap-3 rounded-sm border border-line bg-panel px-4 py-3 shadow-lg">
            <span aria-hidden="true" class="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"/>
            <div><p class="text-xs font-semibold text-ink">{{t('openingProject')}}</p><p class="mt-1 text-[11px] leading-4 text-muted">{{t('openingProjectDetail')}}</p></div>
          </div>
        </div>
        <div class="viewport-mode-label pointer-events-none absolute top-3 left-4 text-2xl font-light uppercase tracking-wide text-ink/35">{{ t(w.editorMode) }}</div>
        <div v-if="!w.project" class="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <section class="pointer-events-auto w-full max-w-sm rounded-sm border border-line bg-panel p-6 shadow-xl">
            <AppIcon name="logo" class="mb-4 !size-8 text-accent"/><h1 class="text-xl leading-tight font-semibold">{{ t('welcomeTitle') }}</h1><p class="mt-3 text-xs leading-5 text-muted">{{ t('welcomeText') }}</p>
            <div class="mt-5 flex gap-2"><AppButton variant="primary" :disabled="w.busy" @click="openNew"><AppIcon name="plus"/>{{ t('newProject') }}</AppButton><AppButton :disabled="w.busy" @click="command('open')">{{ t('openProject') }}</AppButton></div>
          </section>
        </div>
        <template v-else>
          <div v-if="w.parentPicking" class="viewport-top-control pointer-events-none absolute top-3 left-1/2 z-20 flex max-w-[95%] -translate-x-1/2 items-center gap-3 rounded-sm border border-accent bg-shell px-3 py-2 text-xs shadow-md" data-testid="parent-pick-hint"><span>{{t('parentPickHint')}}</span><button class="pointer-events-auto dock-tab" @click="w.cancelParentPick">{{t('cancel')}}</button></div>
          <PhysicsPreviewControls v-if="w.editorMode==='setup'&&hasPhysics&&!w.project.inspectionOnly" class="viewport-top-control pointer-events-auto absolute top-3 right-3 w-56 max-w-[calc(100%-2rem)]" :running="w.simulationRunning" :enabled="w.simulationIntent" :time="w.simulationTime" :error="w.simulationError" :disabled="w.busy||w.traceOpen||!!w.clippingDraft||!!w.meshOutlineDraft" @run="w.runSimulation" @pause="w.pauseSimulation" @step="w.stepSimulation" @reset="w.resetSimulation"/>
          <p v-if="w.editorMode==='animate'&&w.animationPhysicsError" role="alert" data-testid="animation-physics-viewport-error" class="viewport-top-control pointer-events-auto absolute top-3 right-3 max-w-64 rounded-sm border border-danger/50 bg-panel p-2 text-[11px] leading-4 text-danger">{{w.animationPhysicsError}}</p>
          <ProjectInspectionNotice v-if="w.project.inspectionOnly&&!w.openingProject" :name="w.project.name" :busy="w.busy" :can-copy="w.project.canCopy" :reason="w.project.inspectionReason" :can-repair-linked-mesh-copy="w.project.canRepairLinkedMeshCopy" @open="command('open')" @copy="command('copy')" @repair="command('repair-linked-mesh-copy')"/>
          <div class="viewport-tool-hud" :class="{'viewport-tool-hud--draft':w.traceOpen||w.clippingDraft||w.meshOutlineDraft}" data-testid="viewport-tool-hud">
          <ViewportToolbarLayout v-if="!w.traceOpen&&!w.clippingDraft&&!w.meshOutlineDraft" ref="viewportToolbarLayout"
            v-model:position="viewportToolbarPosition" v-model:locked="viewportToolbarLocked" :label-mode="viewportToolbarLabelMode"
            :context-key="`${w.project.documentId}:${w.editorMode}:${w.editMode}`" :disabled="w.openingProject||w.traceApplying">
          <template #path><ViewportSelectionPath v-if="w.viewportSelectionPath.length" :items="w.viewportSelectionPath"/></template>
          <ViewportAttachmentTransform v-if="w.editorMode==='setup'&&displayedAttachment"
            :transform-editor="attachmentTransformEditor" :mesh-hull-center="selectedMeshHullCenter"
            :clip-transform-tools="canChooseClippingTransform" @use-tool="chooseClippingTransform"/>
          <template v-if="w.editMode==='bones'||w.hasSelectedPath">
            <ViewportSelectionTools v-if="displayedAttachment||displayedSlot" :hide-selection-caption="w.viewportSelectionPath.length>0"
              @edit-mode="mode" @inspect-weights="inspectAnimateWeights"/>
            <AnimationTools v-else ref="animationTools" :editor="boneEditor" :suspend-wheel="transformInputModalOpen"
              @choose-tool="chooseBoneTool"
              :setup-transform-axes="setupTransformAxes" @transform-axes-change="setupTransformAxes=$event"
              :numeric-compensation="w.tool==='translate'&&compensationAvailable?compensation:undefined"
              :affine-compensation="affineCompensation" :can-compensate-affine="compensationAvailable"
              @parent-translation="parentTranslation=$event" @local-translation="setLocalTranslation" @compensation-applied="showCompensationApplied"/>
          </template>
          <div v-else-if="w.editorMode==='animate'" class="context-toolbar mesh-context" aria-label="Animation deformation tools">
            <div class="flex items-center gap-1"><AppIcon :name="w.selectedAttachment?.clipping?'grid':'mesh'" class="text-accent"/><span v-if="!w.selectedAttachment||!w.viewportSelectionPath.length" class="min-w-0 flex-1 truncate">{{w.selectedAttachment?.name??'Deform'}}</span><button class="dock-tab ml-auto" data-testid="viewport-deform-key" :disabled="!w.canEdit||w.busy||!w.activeAnimation||w.selectedDeformSourceId!==undefined||!(w.selectedAttachment?.mesh||w.selectedAttachment?.clipping)" aria-label="Key deformation" :title="w.selectedDeformSourceId===undefined?undefined:t('linkedMeshDeformReadOnly')" @click="w.selectedAttachment&&w.insertDeformKey(w.selectedAttachment.id)"><AppIcon name="key" class="!size-3"/></button></div>
            <div class="mt-1 flex flex-wrap items-center gap-1 border-t border-line pt-1">
              <AppButton v-if="w.selectedDeformSourceId!==undefined" variant="ghost" :disabled="!w.canEdit||w.busy||!w.activeAnimation" data-testid="viewport-edit-deform-source" @click="editDeformSource">{{t('editSourceMesh')}}</AppButton>
              <span v-else class="text-[10px] text-muted">Move vertices · Deform</span>
              <AppButton v-if="displayedAttachment?.mesh||displayedAttachment?.clipping" variant="ghost"
                :disabled="!w.animateWeightsTarget" :aria-label="t('inspectWeights')"
                :title="t(w.animateWeightsTarget?'inspectWeights':'animateWeightsUnavailable')"
                data-testid="weights-inspect" @keydown.space.stop @click="inspectAnimateWeights">
                <AppIcon name="weights" class="!size-3"/>{{t('weights')}}
              </AppButton>
              <button class="dock-tab ml-auto" @click="mode('bones')">{{t('done')}}</button>
            </div>
          </div>
          <div v-else-if="w.editMode==='clipping'&&w.selectedAttachment?.clipping" class="context-toolbar mesh-context" :aria-label="t('clippingEditToolbar')"><div class="flex items-center gap-1"><AppIcon name="grid" class="text-accent"/><span v-if="!w.viewportSelectionPath.length" class="max-w-32 truncate px-1 text-muted">{{w.selectedAttachment.name}}</span><button v-for="item in (['move','add','delete'] as const)" :key="item" class="dock-tab" :class="w.meshTool===item?'active':''" :aria-pressed="w.meshTool===item" :disabled="!w.canEdit||w.busy" @click="w.meshTool=item">{{t(item==='move'?'mesh_move':item==='add'?'mesh_draw':'mesh_delete')}}</button></div><div v-if="!hasClippingTransformRows" class="mt-1 flex items-center gap-0.5 border-t border-line pt-1" :aria-label="t('clippingWholeTransform')" :title="t('clippingWholeTransformHint')"><span class="mr-auto px-1 text-[10px] text-muted">{{t('clippingWholeTransform')}}</span><button v-for="item in transformTools.slice(0,3)" :key="item.id" class="dock-tab !px-1.5" :disabled="!w.canEdit||w.busy" :title="t(item.label)+(item.key?' ('+item.key+')':'')" :data-testid="'clipping-transform-'+item.id" @click="useTool(item.id)">{{t(item.label)}}</button></div><div class="mt-1 flex items-center gap-1 border-t border-line pt-1"><span class="text-[10px] text-muted">{{t('clippingEditHint')}}</span><AppButton class="ml-auto" :disabled="w.busy" @click="mode('images')">{{t('done')}}</AppButton></div></div>
          <div v-else-if="w.editMode==='meshes'&&w.selectedSlot?.mesh" class="context-toolbar mesh-context" :aria-label="t('meshEditToolbar')">
            <div class="flex items-center gap-1"><AppIcon name="mesh" class="text-accent"/><span v-if="!w.viewportSelectionPath.length" class="max-w-32 truncate px-1 text-muted">{{ displayedAttachment?.name ?? w.selectedSlot.name }}</span><span class="toolbar-separator"/>
              <button v-for="item in (['move','draw','delete'] as const)" :key="item" class="dock-tab" :class="w.meshTool===item?'active':''" :aria-pressed="w.meshTool===item" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="w.meshTool=item">{{ t('mesh_'+item) }}</button>
            </div>
            <div class="flex flex-wrap items-center gap-1 border-t border-line pt-1">
              <label class="flex items-center gap-1 px-1 text-muted"><input type="checkbox" :checked="!w.meshEditUvs" :disabled="w.busy||w.traceOpen" @change="w.meshEditUvs=!($event.target as HTMLInputElement).checked">{{ t('deformed') }}</label><span class="toolbar-separator"/>
              <span :title="meshOutlineNewHint">
                <AppButton variant="ghost" :disabled="!!w.meshOutlineProblem" aria-describedby="mesh-outline-new-hint"
                  data-testid="mesh-new-outline" @click="w.beginMeshOutline">{{ t('meshOutlineNew') }}</AppButton>
                <span id="mesh-outline-new-hint" class="sr-only">{{ meshOutlineNewHint }}</span>
              </span>
              <span :title="meshOutlineResetHint">
                <AppButton variant="ghost" :disabled="!!w.meshOutlineProblem" aria-describedby="mesh-outline-reset-hint"
                  data-testid="mesh-outline-reset" @click="w.resetMeshOutline">{{ t('meshOutlineReset') }}</AppButton>
                <span id="mesh-outline-reset-hint" class="sr-only">{{ meshOutlineResetHint }}</span>
              </span>
              <span :title="meshGenerateHint">
                <AppButton :disabled="!!w.meshGenerateProblem" aria-describedby="mesh-generate-hint"
                  data-testid="viewport-generate-mesh" @click="w.generateMeshVertices">{{ t('meshGenerate') }}</AppButton>
                <span id="mesh-generate-hint" class="sr-only">{{ meshGenerateHint }}</span>
              </span>
              <AppButton variant="ghost" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="w.openTrace(false)">{{ t('trace') }}</AppButton><AppButton variant="ghost" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="w.openTrace(true)">{{ t('innerTrace') }}</AppButton>
              <AppButton variant="ghost" :disabled="w.busy||w.traceOpen" @click="mode('images')">{{ t('done') }}</AppButton>
            </div>
            <div v-if="w.meshDisplay" class="flex flex-wrap items-center gap-1 border-t border-line pt-1" role="group" :aria-label="t('meshDisplay')">
              <button v-for="option in meshDisplayControls" :key="option.key" type="button" class="dock-tab"
                :class="{active:w.meshDisplay?.[option.key]}" :aria-pressed="!!w.meshDisplay?.[option.key]"
                :disabled="w.busy||w.openingProject" :title="t(option.hint)" :data-testid="`mesh-display-${option.key}`"
                @keydown.space.stop @click="w.toggleMeshDisplay(option.key)">{{ t(option.label) }}</button>
            </div>
          </div>
          <div v-else class="context-toolbar" :aria-label="t('transformTools')">
            <div v-if="!w.viewportSelectionPath.length" class="mb-1 flex items-center gap-1 border-b border-line pb-1 text-muted"><AppIcon :name="imageTransforms?(displayedAttachment?.clipping?'grid':'image'):'bone'"/><span class="max-w-40 truncate">{{ displayedAttachment?.name??displayedSlot?.name??displayedBone?.name??t('noSelection') }}</span><span v-if="transformSelectionCount>1" class="ml-auto text-[10px]">{{ t('selectedCount',{count:transformSelectionCount}) }}</span></div>
            <div v-if="!hasClippingTransformRows" class="grid grid-cols-3 gap-0.5"><button v-for="item in imageTransforms?transformTools.slice(0,3):transformTools" :key="item.id" class="dock-tab" :class="w.tool===item.id||(item.id==='translate'&&w.tool==='select')?'active':''" :aria-pressed="w.tool===item.id" :title="t(item.label)+(item.key?' ('+item.key+')':'')" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="useTool(item.id)">{{ t(item.label) }}</button></div>
            <div v-if="imageTransforms&&['rotate','scale'].includes(w.tool)" class="mt-1 flex items-center gap-1 border-t border-line px-1 pt-1 text-[10px] text-muted" :title="t('imageGroupPivotHint')"><span>{{t('transformPivot')}}</span><span class="ml-auto">{{t('group')}} · {{t('worldCoordinates')}}</span></div>
            <div v-else-if="w.tool==='rotate'" class="mt-1 flex items-center gap-0.5 border-t border-line pt-1" role="group" :aria-label="t('transformPivot')"><span class="mr-auto px-1 text-[10px] text-muted">{{ t('transformPivot') }}</span><button v-for="pivot in (['individual','group'] as const)" :key="pivot" class="dock-tab !px-1.5 !text-[10px]" :class="w.transformPivot===pivot?'active':''" :aria-pressed="w.transformPivot===pivot" :disabled="!w.canEdit||w.busy" :title="t(pivot==='individual'?'individualPivotHint':'groupPivotHint')" @click="w.transformPivot=pivot">{{ t(pivot) }}</button></div>
            <div v-else-if="['pose','scale','shear'].includes(w.tool)" class="mt-1 flex items-center gap-1 border-t border-line px-1 pt-1 text-[10px] text-muted"><span>{{ t('transformPivot') }}</span><span class="ml-auto">{{ t('individual') }}<template v-if="w.tool==='scale'"> · {{ t('localCoordinates') }}</template></span></div>
            <div class="mt-1 flex gap-1 border-t border-line pt-1"><AppButton variant="ghost" :disabled="!w.canEdit||w.busy||w.traceOpen" :aria-pressed="w.parentPicking" :title="t('setParent')+' (P)'" @click="w.beginParentPick">{{t('setParent')}}</AppButton><AppButton variant="ghost" class="flex-1" :disabled="!w.canEdit||w.busy||w.traceOpen" :aria-pressed="w.tool==='create'" :title="t('createBone')+' (B)'" @click="useTool('create')"><AppIcon name="bone"/>{{ t('createBone') }}</AppButton><AppButton variant="ghost" :aria-pressed="w.tool==='pan'" :aria-label="t('pan')" :title="t('pan')+' (H / Space)'" @click="w.tool='pan'"><AppIcon name="hand"/></AppButton></div>
            <ViewportSelectionTools v-if="w.editMode==='images'&&(displayedAttachment?.mesh||displayedAttachment?.clipping)" embedded @edit-mode="mode"/>
          </div>
          <div class="animation-tool-stack" role="group" :aria-label="t('viewportEditingOptions')">
            <button v-for="layer in (['bones','images'] as const)" :key="layer" type="button" :disabled="!canToggleCompensation(layer)"
              :class="{active:w.editorMode==='setup'&&compensation[layer],'ring-1 ring-inset ring-warning text-warning!':appliedCompensation?.[layer]}"
              :aria-pressed="w.editorMode==='setup'?compensation[layer]:undefined"
              :aria-label="w.editorMode==='setup'?t('viewportCompensateLayer',{layer:t(layer)}):t('viewportUnavailableOption',{option:t('viewportCompensateLayer',{layer:t(layer)})})"
              :title="compensationHint(layer)"
              :data-compensation-applied="appliedCompensation?.[layer]||undefined" :data-testid="`viewport-compensate-${layer}`"
              @keydown.space.stop @click="toggleCompensation(layer)">
              <AppIcon :name="layer==='bones'?'bone':'image'"/>{{t(layer)}}
            </button>
            <button v-if="w.editorMode==='animate'" type="button" :class="{active:w.animationAutoKey}" :aria-pressed="w.animationAutoKey"
              data-testid="animate-auto-key" @keydown.space.stop @click="w.animationAutoKey=!w.animationAutoKey"><AppIcon name="key"/>{{t('autoKey')}}</button>
            <button v-else type="button" :disabled="!w.canEdit||w.busy" :class="{active:viewportPixels}" :aria-pressed="viewportPixels"
              data-testid="viewport-pixels" :title="t('viewportPixelsHint')" @keydown.space.stop @click="viewportPixels=!viewportPixels">{{t('viewportPixels')}}</button>
            <span class="sr-only" role="status" data-testid="viewport-compensation-status">{{compensationAnnouncement}}</span>
          </div>
          <ViewportOptions/>
          </ViewportToolbarLayout>
          <ViewportOptions v-else/>
          </div>
          <TracePanel v-if="w.traceOpen"/>
          <div v-if="w.clippingDraft" class="pointer-events-auto absolute bottom-4 left-1/2 flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-sm border border-line bg-panel p-2 text-xs shadow-lg" data-testid="clipping-draft-controls"><span class="text-muted">{{t('clippingDrawHint')}} · {{w.clippingDraft.points.length}} {{t('vertices')}}</span><AppButton :disabled="w.clippingDraft.points.length<3||w.busy" @click="w.finishClipping">{{t('finishClipping')}}</AppButton><AppButton :disabled="w.busy" @click="w.cancelClipping">{{t('cancel')}}</AppButton></div>
          <div v-if="w.meshOutlineDraft" class="pointer-events-auto absolute bottom-4 left-1/2 flex w-max max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-sm border border-line bg-panel p-2 text-xs shadow-lg"
            role="group" :aria-label="t('meshOutlineNewHint')" :aria-busy="w.meshOutlineBusy||w.busy" data-testid="mesh-outline-draft-controls">
            <div class="min-w-0 text-[11px] leading-4 text-muted">
              <p>{{t(w.meshOutlineBusy?'working':'meshOutlineDrawHint')}}</p>
              <p v-if="!w.meshOutlineBusy">{{t('meshOutlineRemoveHint')}}</p>
            </div>
            <span class="whitespace-nowrap tabular-nums text-muted">{{w.meshOutlineDraft.points.length}} {{t('vertices')}}</span>
            <AppButton :disabled="w.meshOutlineBusy||w.meshOutlinePointGesture||w.busy||w.meshOutlineDraft.points.length<3" data-testid="mesh-outline-finish" @click="w.finishMeshOutline">{{t('meshOutlineFinish')}}</AppButton>
            <AppButton :disabled="w.busy" data-testid="mesh-outline-cancel" @click="w.cancelMeshOutline">{{t('cancel')}}</AppButton>
          </div>

        </template>
      </ProjectViewport>
      <template v-if="w.editorMode==='animate'&&w.project">
        <div v-show="!viewsMinimized" class="animation-resize-bar" role="separator" aria-label="Resize timeline" aria-orientation="horizontal" tabindex="0" data-testid="timeline-resize" @pointerdown="resizeTimeline" @keydown="timelineResizeKey"/>
        <div v-show="!viewsMinimized" ref="timelinePane" class="animation-bottom-pane" :style="{height:timelinePaneHeight+'px',minHeight:stackedTimelines?`min(${stackedTimelineMinHeight}px, 70%)`:undefined}">
          <AnimationTimeline ref="timeline" :document-key="logicalDocumentKey(w.project)" :animations="w.animations" :active-animation-id="w.animationId" :bones="w.project.bones" :selected-bone-ids="w.selectedSlotId===null?w.selectedIds:[]" :tracks="w.animationTracks" :slots="timelineSlots" :slot-tracks="w.animationSlotTracks" :sequence-tracks="w.animationSequenceTracks" :draw-order-keys="w.animationDrawOrderKeys" :deform-tracks="w.animationDeformTracks" :selected-slot-ids="w.selectedSlotIds" :constraints="w.animationTimelineConstraints" :selected-constraint-ids="timelineSelectedConstraints" :constraint-tracks="w.animationConstraintTracks" :events="w.eventDefinitions" :event-tracks="w.animationEventTracks" :current-frame="w.animationFrame" :duration-frames="w.animationDuration" :stored-duration-frames="w.animationStoredDuration" :preview-end-frames="w.animationPreviewEnd" :automatic-preview-end-frames="w.animationAutomaticPreviewEnd" :preview-budget-exceeded="w.animationPreviewExceedsBudget" :fps="w.animationFps" :playing="w.animationPlaying" :loop="w.animationLoop" :loop-start="w.animationLoopStart" :loop-end="w.animationLoopEnd" :auto-key="w.animationAutoKey" :disabled="w.busy||!w.canEdit" :supported-channels="w.animationChannels" :supported-interpolations="timelineInterpolations" :can-paste="w.animationCanPaste"
            :project-revision="w.project.revision" :stored-animation="w.project.storedAnimation" :transform-tool="w.tool" @graph-edit="edit=>w.editRig(edit,w.project?.revision)"
            @curve-edit="commitGraphCurveEdit" :key-shown-shortcut="keyShownShortcut" @key-shown="commitKeyShown"
            :suspended="viewsMinimized" :stacked="stackedTimelines" @update:stacked="setStackedTimelines"
            :navigation="timelineNavigation" @update-navigation="setTimelineNavigation"
            :adjust-viewport-available="w.timelineAdjustViewportAvailable" :adjust-dragging="w.timelineAdjustDragging"
            :adjust-working-pose="w.timelineAdjustWorkingPose" @adjust-state="w.setTimelineAdjustState"
            @offset-keys="w.offsetAnimationKeys" @reset-offset="w.resetAnimationOffset"
            @draft-validity="invalid=>w.animationKeyError=invalid?'Enter valid animation values before saving.':''" @select-animation="w.selectAnimation" @create-animation="w.createAnimation" @rename-animation="w.renameAnimation" @delete-animation="w.deleteAnimation" @duplicate-animation="w.duplicateAnimation" @copy-keys="w.copyAnimationKeys" @paste-keys="w.pasteAnimationKeys"
            @seek="w.seekAnimation" @play="w.playAnimation" @pause="w.pauseAnimation" @toggle-loop="w.animationLoop=!w.animationLoop" @toggle-auto-key="w.animationAutoKey=!w.animationAutoKey"
            @select-constraint="w.selectConstraint" @insert-constraint-keys="w.insertConstraintAnimationKeys" @update-constraint-key="w.updateConstraintAnimationKey" @select-sequence-attachment="w.selectAttachment" @insert-sequence-key="w.insertSequenceAnimationKey" @update-sequence-key="w.updateSequenceAnimationKey" @select-event="w.selectEvent" @insert-event-key="w.insertEventAnimationKey" @update-event-key="w.updateEventAnimationKey"
            @select-bone="timelineSelectBone" @select-shown-bones="timelineSelectShownBones" @select-slot="(id,additive)=>w.selectSlot(id,{toggle:additive})" @select-attachment="(id,additive)=>{w.selectAttachment(id,{toggle:additive});showMesh=true}" @insert-draw-order-key="w.insertDrawOrderKey" @update-draw-order-key="w.updateDrawOrderKey" @insert-deform-key="change=>w.insertDeformKey(change.attachmentId)" @update-deform-curve="w.updateDeformCurve" @insert-slot-keys="w.insertSlotAnimationKeys" @update-slot-key="w.updateSlotAnimationKey" @insert-keys="w.insertAnimationKeys" @move-keys="w.moveAnimationKeys" @scale-keys="w.scaleAnimationKeys" @delete-keys="w.deleteAnimationKeys" @set-interpolation="w.setAnimationInterpolation" @update-key="w.updateAnimationKey" @update-bezier="w.updateAnimationBezier" @update-bezier-group="w.updateAnimationBezierGroup" @set-fps="w.setAnimationFps" @loop-range="w.setAnimationLoopRange"/>
        </div>
      </template>
      </div>
      <DockWorkspace v-show="!viewsMinimized" v-model="dockLayout" :titles="dockTitles" :suspended="viewsMinimized"
        :minimized="minimizedPanels" :pane-actions-disabled="!canToggleDockedViews"
        @minimize="setPanelMinimized($event,true)" @close="closeDockedPanel">
       <template #weights><WeightsPanel ref="weightsPanel"/></template><template #mesh><MeshTools/></template>
       <template #tree-header="{disabled}">
        <TreeViewSettings v-model:hide-skeleton-names="hideTreeSkeletonNames" :supported="treeSkeletonName!==null" :disabled="disabled"/>
       </template>
       <template #tree><div class="flex min-h-0 flex-1 flex-col" :inert="w.traceApplying"><SceneTree ref="sceneTree" :hidden-skeleton-name="hideTreeSkeletonNames?treeSkeletonName:null" :find-replace-enabled="findReplaceEnabled" @find-replace="openTreeFindReplace" :dock-visible="panelOnScreen('tree')" :scene-history-disabled="!canToggleDockedViews" :filter-gesture-active="treeFilterGestureActive" @create-animation="newAnimation" @create-event="newEvent" @create-constraint="createConstraint" @create-clipping="clippingCreator=true" @create-linked-mesh="openLinkedMeshCreator"/><SlotInspector v-if="w.editorMode==='animate'&&w.selectedSlot" class="max-h-64 shrink-0 overflow-y-auto"/><ConstraintInspector v-else-if="w.editorMode==='animate'&&w.selectedConstraint" class="max-h-72 shrink-0 overflow-y-auto"/><EventInspector v-else-if="w.editorMode==='animate'&&w.selectedEvent" :definition="w.selectedEvent" :selected-key="w.currentEventKey" animate :busy="w.busy" :audio-root="w.audioLibrary.root" :audio-keys="w.audioLibrary.sounds.map(sound=>sound.key)" :audio-playable="w.selectedEventAudioPlayable" :playback-text="w.eventPlaybackText" @play-audio="w.previewEventAudio" :context-key="`${w.project?.documentId}:${w.animationId}:${w.animationFrame}`" class="max-h-72 shrink-0 overflow-y-auto" @manual-key="w.insertEventAnimationKey" @key-patch="w.updateEventAnimationKey" @draft-validity="invalid=>w.eventKeyError=invalid?'Enter valid event values before saving.':''"/></div></template>
       <template #properties><AnimationPreview v-if="w.editorMode==='animate'" :tracks="previewTracks" :visible="previewVisible" v-model:hide-controls="previewHideControls" v-model:show-bones="previewShowBones"/><div v-else class="min-h-0 flex-1 overflow-y-auto">
            <section v-if="selectedImage" class="p-3 text-xs">
              <div class="mb-3 flex items-center gap-2 text-accent"><AppIcon name="image"/><h3>{{ t('imageAsset') }}</h3></div>
              <p class="break-all text-ink">{{ selectedImage.key }}.png</p><p class="mt-2 text-muted">{{ selectedImage.width }} × {{ selectedImage.height }}</p>
              <p class="mt-4 text-[11px] leading-4 text-muted">{{ t('imageLibraryHint') }}</p><label class="mt-4 block text-muted">{{ t('imagesLibrary') }}<input class="editor-input mt-1 w-full" :value="w.library.root" readonly></label>
              <AppButton class="mt-2 w-full" :disabled="!w.canEdit||w.busy" @click="w.chooseImagesFolder">{{ t('chooseImagesFolder') }}</AppButton>
            </section><EventInspector v-else-if="w.selectedEvent" :definition="w.selectedEvent" :busy="w.busy" :audio-root="w.audioLibrary.root" :audio-keys="w.audioLibrary.sounds.map(sound=>sound.key)" :audio-playable="w.selectedEventAudioPlayable" :playback-text="w.eventPlaybackText" @play-audio="w.previewEventAudio" @choose-audio-folder="w.chooseAudioFolder" :context-key="String(w.project?.documentId)" @definition-patch="change=>w.patchEventDefinition(change.id,change.patch)" @draft-validity="invalid=>w.eventKeyError=invalid?'Enter valid event values before saving.':''"/><ConstraintInspector v-else-if="displayedConstraint"/><AttachmentInspector v-else-if="displayedAttachment" :transform-editor="attachmentTransformEditor"/><SlotInspector v-else-if="displayedSlot"/><BoneInspector v-else-if="displayedBone" :editor="boneEditor"/>
            <p v-if="!selectedImage&&!w.selectedEvent&&!displayedConstraint&&!displayedAttachment&&!displayedSlot&&!displayedBone" class="p-3 text-xs leading-5 text-muted">{{ t('noSelection') }}</p>
       </div></template>
       <template #preview><AnimationPreview v-if="w.editorMode==='setup'" :tracks="previewTracks" :visible="previewVisible" v-model:hide-controls="previewHideControls" v-model:show-bones="previewShowBones"/></template>
       <template #ik><ConstraintViewPanel type="ik" @create="createConstraint"/></template>
       <template #transform><ConstraintViewPanel type="transform" @create="createConstraint"/></template>
       <template #physics><ConstraintViewPanel type="physics" @create="createConstraint"/></template>
       <template #curves>
        <CurvesPanel v-if="curvesVisible" :selections="curvesSelections" :custom-presets="customCurvePresets" :disabled="!curvesEditable"
         @pause="w.pauseAnimation" @edit-handle="editCurveHandle" @edit-handle-group="editCurveHandleGroup"
         @set-interpolation="setCurveInterpolation" @apply-preset="applyCurvePreset"
         @save-custom-preset="saveCustomCurvePreset" @remove-custom-preset="removeCustomCurvePreset" @apply-custom-preset="applyCustomCurvePreset"/>
       </template>
      </DockWorkspace>
    </div>
    <footer class="editor-status"><span role="status">{{ w.busy?t('working'):t('statusReady') }}</span><span class="ml-3 min-w-0 flex-1 truncate text-muted">{{ w.project?t(w.editorMode==='animate'&&(w.editMode==='meshes'||w.editMode==='clipping')?'animationDeformHint':w.clippingDraft?'clippingDrawHint':w.editMode==='clipping'?'clippingEditHint':w.tool==='create'?'createHint':w.editMode==='meshes'?'meshHint_'+w.meshTool:w.editMode==='weights'?'paintHint':w.editMode==='images'?'imageViewportHint':'toolHint_'+(w.tool==='select'?'translate':w.tool)):t('local') }}</span><span class="ml-auto shrink-0 text-faint">{{ t('appVersion') }}</span></footer>

    <TreeFindReplace v-if="findReplaceProject" :project="findReplaceProject" :selected-bone-ids="findReplaceBoneIds"
      :busy="findReplaceApplying||w.busy" :error="findReplaceError" @cancel="closeTreeFindReplace" @apply="applyTreeFindReplace"/>
    <WeightsPrunePanel v-if="w.pruneOpen"/>
    <ConstraintCreator v-if="constraintCreator" :type="constraintCreator" @close="constraintCreator=null"/><ClippingCreator v-if="clippingCreator" @close="clippingCreator=false"/>
    <LinkedMeshCreator v-if="linkedMeshCreator" @close="linkedMeshCreator=false"/>
    <ModalDialog v-if="eventCreator" title="New event" :busy="w.busy" @cancel="eventCreator=false"><form @submit.prevent="submitEvent"><label class="block text-xs text-muted">Event name<input v-model="eventName" autofocus maxlength="120" aria-label="Event name" class="editor-input mt-2 w-full"/></label><div class="mt-4 flex justify-end gap-2"><AppButton type="button" @click="eventCreator=false">Cancel</AppButton><AppButton type="submit" variant="primary" :disabled="w.busy||!eventNameValid">Create event</AppButton></div></form></ModalDialog>
    <GifExportDialog v-if="gifDialog" :animations="w.project?.animations ?? []" :active-animation-id="w.activeAnimation?.id ?? null"
      :timeline-fps="w.project?.animationFps ?? 30" :busy="w.busy" :error="gifError" @cancel="gifDialog=false" @submit="submitGif"/>
    <ModalDialog v-if="w.newDialog" :title="t('newTitle')" :busy="w.busy" @cancel="w.newDialog = false">
      <form @submit.prevent="create"><p class="mb-5 text-sm leading-6 text-muted">{{ t('newHelp') }}</p><label for="project-name" class="mb-2 block text-xs font-medium">{{ t('projectName') }}</label><input id="project-name" v-model="name" maxlength="120" autocomplete="off" class="w-full rounded-md border border-line bg-shell px-3 py-2 text-sm outline-none focus:border-accent" :aria-invalid="submitted && !nameValid" :aria-describedby="submitted && !nameValid ? 'name-error' : 'draft-help'" :disabled="w.busy"><p v-if="submitted && !nameValid" id="name-error" class="mt-2 text-xs text-danger">{{ t('invalidName') }}</p><p id="draft-help" class="mt-3 text-xs leading-5 text-warning">{{ t(desktop ? 'draftNotice' : 'webPreview') }}</p><div class="mt-6 flex justify-end gap-3"><AppButton :disabled="w.busy" @click="w.newDialog = false">{{ t('cancel') }}</AppButton><AppButton type="submit" variant="primary" :disabled="w.busy">{{ w.busy ? t('working') : t('create') }}</AppButton></div></form>
    </ModalDialog>
    <ModalDialog v-if="w.discardDialog" :title="t('unsavedTitle')" :busy="w.busy" @cancel="w.cancelDiscard"><p class="text-sm leading-6 text-muted">{{ t('unsavedText') }}</p><div class="mt-6 flex justify-end gap-3"><AppButton :disabled="w.busy" @click="w.cancelDiscard">{{ t('cancel') }}</AppButton><AppButton :disabled="w.busy" @click="w.discardAndContinue">{{ t('discard') }}</AppButton><AppButton v-if="w.project?.canSave" variant="primary" :disabled="w.busy" @click="w.saveAndContinue">{{ t('saveAndContinue') }}</AppButton></div></ModalDialog>
    <div v-if="w.notice" role="alert" class="fixed right-5 bottom-12 z-40 flex max-w-lg items-start gap-4 rounded-lg border border-line bg-raised p-4 text-sm shadow-xl" :class="w.noticeError ? 'text-danger' : 'text-ink'"><span>{{ w.notice }}</span><button :aria-label="t('dismiss')" class="p-0.5 text-muted hover:text-ink" @click="w.notice = ''"><AppIcon name="close" /></button></div>
    </main>
  </div>
  <div v-if="w.openingProject" class="sr-only" data-testid="project-opening-announcement" role="status" aria-live="polite" aria-atomic="true">{{t('openingProject')}} {{t('openingProjectDetail')}}</div>
</template>
