<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { invokeNative as invoke } from '../../services/bridge';
import {onMcpCapture,type McpCaptureRequest} from '../../services/bridge';
import { useWorkspace } from '../../stores/workspace';
import { desktop, imageData } from '../../services/desktop';
import { errorMessage, type AttachmentView, type DenseBindingView, type PruneWeightRow } from '../../domain/project';
import { meshOutlineSlots } from '../../domain/meshOutline';
import { createViewport, type ViewportController, type ViewportRulerFrame, type ViewportSelectionPhase } from '../../viewport/createViewport';
import type {AnimateWeightInspection} from '../../viewport/ImageLayer';
import type {ViewportNameTag,ViewportNameTagFrame} from '../../viewport/nameTags';
import type {CompensationOptions,LocalTranslationAxes} from '../../domain/boneCompensation';
import type {ParentTranslation} from '../../viewport/transformGizmo';
import ViewportNavigationRail from '../molecules/ViewportNavigationRail.vue';
import ViewportRulers from '../molecules/ViewportRulers.vue';
import ViewportNameTags from '../molecules/ViewportNameTags.vue';
const props = defineProps<{
  snapRegionPixels?:boolean;compensation?:CompensationOptions;parentTranslation?:ParentTranslation|null;
  localTranslation?:LocalTranslationAxes|null;localTranslationUnavailable?:boolean;
  animateWeightInspection?:AnimateWeightInspection|null;
  previousToolSwap?:boolean;
  sceneHistoryDisabled?:boolean;
}>();
type ViewportPickKind='bone'|'slot'|'attachment';
const emit = defineEmits<{
  compensationApplied:[layers:CompensationOptions];swapPreviousTool:[];
  viewportSelection:[selection:{kind:ViewportPickKind;id:number}];
}>();
const { t } = useI18n();
const workspace = useWorkspace();
const host = ref<HTMLElement>();
const error = ref<string | null>(null);
const loaded = ref(false);
const rulersVisible = ref(false);
const rulerFrame = shallowRef<ViewportRulerFrame | null>(null);
const nameTagFrame = shallowRef<ViewportNameTagFrame | null>(null);
const currentNameTagFrame = computed(() => !workspace.meshOutlineDraft && !workspace.meshOutlineBusy &&
  nameTagFrame.value?.documentId === workspace.project?.documentId ? nameTagFrame.value : null);
const animateWeightInspection=computed(()=>{
  const inspection=props.animateWeightInspection,attachment=workspace.selectedAttachment;
  return workspace.editorMode==='animate'&&workspace.sceneEditing&&workspace.treeFilters.attachment&&
    inspection&&attachment?.id===inspection.attachmentId&&attachment.mesh?.weighted&&
    Number.isInteger(inspection.vertex)&&inspection.vertex>=0&&inspection.vertex<attachment.mesh.vertices.length?inspection:null;
});
const weightViewportFocus = computed(() => loaded.value && workspace.canEdit && workspace.sceneEditing &&
  workspace.editorMode === 'setup' && workspace.editMode === 'weights');
const nameTagsSelectable = computed(() => {
  const mode = workspace.editMode;
  const available = !workspace.busy && !workspace.openingProject && !workspace.traceOpen &&
    !workspace.parentPicking && !workspace.clippingDraft && !workspace.pruneOpen && workspace.tool !== 'pan' &&
    (mode === 'bones' || mode === 'images');
  return {bones: available && workspace.viewportSelection.bones,
    images: available && workspace.viewportSelection.images, others: available && workspace.viewportSelection.others};
});
let controller: ViewportController | undefined;
let disposed = false;
let stopCapture:(()=>void)|undefined;
function interactionActive(){
  return controller?.interactionActive()??false;
}
defineExpose({interactionActive});
function focusWeightViewport(event: PointerEvent) {
  if (weightViewportFocus.value && event.button === 0 && !workspace.pruneOpen && !workspace.traceOpen) {
    host.value?.focus({preventScroll: true});
  }
}
function zoomViewport(percent: number) {
  controller?.setZoom(percent);
}
function fitViewport() {
  controller?.fit();
}
function toggleRulers() {
  rulersVisible.value = !rulersVisible.value;
  if (!rulersVisible.value) rulerFrame.value = null;
  controller?.setRulersVisible(rulersVisible.value);
}
function rememberSelection(action:()=>void,phase?:ViewportSelectionPhase){
  if(props.sceneHistoryDisabled)action();
  else workspace.withSceneSelectionHistory(action,phase);
}
function canRevealViewportPick(){
  return !props.sceneHistoryDisabled&&!workspace.openingProject&&!workspace.busy&&!workspace.editing&&
    !workspace.parentPicking&&!workspace.traceOpen&&!workspace.traceApplying&&!workspace.pruneOpen&&
    !workspace.clippingDraft&&!workspace.meshOutlineDraft&&!workspace.meshOutlineBusy&&!workspace.timelineAdjustState.enabled&&
    (workspace.editMode==='bones'||workspace.editMode==='images')&&workspace.tool!=='create'&&workspace.tool!=='pan';
}
function rememberViewportPick(kind:ViewportPickKind,action:()=>void,phase?:ViewportSelectionPhase,deselect=false){
  const reveal=phase!=='preview'&&!deselect&&canRevealViewportPick();
  rememberSelection(action,phase);
  if(!reveal||!canRevealViewportPick())return;
  const id=kind==='bone'?workspace.selectedId:kind==='slot'?workspace.selectedSlotId:workspace.selectedAttachmentId;
  if(id===null)return;
  const objects=kind==='bone'?workspace.project?.bones:kind==='slot'?workspace.sceneSlots:workspace.sceneAttachments;
  if(objects?.some(object=>object.id===id))emit('viewportSelection',{kind,id});
}
function removesViewportPick(ids:readonly number[],previous:readonly number[],phase?:ViewportSelectionPhase){
  return phase!=='complete'&&ids.length<previous.length&&ids.every(id=>previous.includes(id));
}
function selectNameTag(tag: ViewportNameTag, event: MouseEvent) {
  const frame = currentNameTagFrame.value;
  if (!frame || !nameTagsSelectable.value[tag.layer] || !controller?.canSelectNameTag(tag, frame.documentId)) return;
  const toggle = event.ctrlKey || event.metaKey;
  const kind=tag.layer==='bones'?'bone':'attachment';
  const selected=kind==='bone'?workspace.selectedIds:workspace.selectedAttachmentIds;
  rememberViewportPick(kind,() => {
    if (tag.layer === 'bones') {
      if (workspace.editMode !== 'bones') workspace.setMode('bones');
      if (!toggle) workspace.selectBone(tag.id);
      else {
        const ids = workspace.selectedIds.includes(tag.id)
          ? workspace.selectedIds.filter(id => id !== tag.id) : [...workspace.selectedIds, tag.id];
        workspace.selectBones(ids, ids.includes(tag.id) ? tag.id : ids.at(-1) ?? null);
      }
    } else {
      if (workspace.editorMode === 'setup' && workspace.editMode === 'bones') workspace.setMode('images');
      workspace.selectAttachment(tag.id, {toggle});
    }
  },undefined,toggle&&selected.includes(tag.id));
}
function zoomFromNameTag(event: WheelEvent) {
  controller?.wheelZoom(event);
}
function panFromNameTag(event: PointerEvent) {
  controller?.panFromNameTag(event);
}
async function captureViewport(request:McpCaptureRequest){
  try{
    await workspace.refreshFromMcp();await nextTick();
    if(disposed||!controller||workspace.project?.revision!==request.expectedRevision||workspace.project.documentId!==request.documentId)throw Error('The project changed.');
    syncScene();const image=await controller.capture();
    if(disposed||workspace.project?.revision!==request.expectedRevision||workspace.project.documentId!==request.documentId)throw Error('The project changed.');
    await invoke('mcp_capture_reply',{requestId:request.requestId,result:{...image,revision:request.expectedRevision,documentId:request.documentId,editorMode:workspace.editorMode,animationId:workspace.animationId,frame:workspace.animationFrame},error:null});
  }catch{
    if(!disposed)await invoke('mcp_capture_reply',{requestId:request.requestId,result:null,error:'Viewport capture failed.'}).catch(()=>{});
  }
}
let animationFrame:number|null=null,previousFrame:number|null=null;
function tick(time:number){
  if(disposed)return;
  if(previousFrame!==null){if(workspace.simulationRunning)workspace.advanceSimulation((time-previousFrame)/1000);if(workspace.editorMode==='animate'&&!document.hidden)workspace.advanceAnimation((time-previousFrame)/1000);}
  previousFrame=time;animationFrame=requestAnimationFrame(tick);
}
function visibility(){workspace.setPreviewVisible(!document.hidden);previousFrame=null;}
async function reportReady(renderer: 'webgl' | 'unavailable') {
  if (!desktop) return;
  try { await invoke('frontend_ready', { renderer }); }
  catch (reason) {
    // Readiness reporting is separate from rendering; an IPC failure must not
    // hide a successfully running viewport behind a graphics error overlay.
    console.warn('Could not report viewport readiness:', reason);
  }
}
onMounted(async () => {
  if (!host.value) return;
  try {
    controller = await createViewport(host.value, (zoom) => { workspace.zoom = zoom; }, {
      onSelect: id => rememberViewportPick('bone',() => workspace.selectBone(id)),
      onPickParent:id=>{void workspace.chooseParent(id);},
      onSelectBones: (ids,active,phase) => rememberViewportPick('bone',() => workspace.selectBones(ids,active),phase,
        removesViewportPick(ids,workspace.selectedIds,phase)),
      onHoverBone: id => id===null?workspace.clearBoneHover('viewport'):workspace.hoverBone('viewport',id),
      onClearHover: () => workspace.clearBoneHover(),
      onPreviousToolSwap: () => emit('swapPreviousTool'),
      onRulerFrame: frame => { if (rulersVisible.value) rulerFrame.value = frame; },
      onNameTagFrame: frame => { nameTagFrame.value = frame; },
      onVisitSceneSelectionHistory: direction => !props.sceneHistoryDisabled&&workspace.visitSceneSelectionHistory(direction),
      onEscape: event => {
        const target=event.target;
        const selectionFocus=target instanceof HTMLElement&&
          (target instanceof HTMLCanvasElement&&host.value?.contains(target)||target.matches('[role="treeitem"]')&&target.closest('[role="tree"]'));
        if(selectionFocus)rememberSelection(() => workspace.escapeSelection());
        else workspace.escapeSelection();
      },
      onDropImage: (key,x,y) => workspace.placeImage(key,x,y,workspace.project?.bones[0]?.id),
      onDropImages: (keys,x,y) => workspace.placeImages(keys,x,y,workspace.project?.bones[0]?.id),
      pivotMode: () => workspace.transformPivot,
      onSelectVertex: index => { workspace.selectedVertex = index; },
      onSelectVertices:(ids,active,replaceOrder)=>{if(workspace.editMode==='weights')workspace.selectWeightVertices(ids,active,replaceOrder);},
      onSelectSlot: id => rememberViewportPick('slot',() => workspace.selectSlot(id)),
      onSelectAttachments: (ids,active,phase) => rememberViewportPick('attachment',() => workspace.selectSceneAttachments(ids,active),phase,
        removesViewportPick(ids,workspace.selectedAttachmentIds,phase)),
      onClippingPoint:point=>workspace.appendClippingPoint(point),
      onFinishClipping:()=>{void workspace.finishClipping();},
      onMeshOutlinePoint:uv=>workspace.appendMeshOutlinePoint(uv),
      onFinishMeshOutline:draft=>{if(workspace.meshOutlineDraft===draft)void workspace.finishMeshOutline();},
      onMoveMeshOutlinePoint:(draft,index,uv)=>workspace.moveMeshOutlinePoint(draft,index,uv),
      onRemoveMeshOutlinePoint:(draft,index)=>workspace.removeMeshOutlinePoint(draft,index),
      onMeshOutlinePointGesture:active=>workspace.setMeshOutlinePointGesture(active),
      onPauseSimulation:()=>workspace.suspendSimulation('geometry'),
      onEndBonePreview:()=>workspace.endBonePreview(),
      onPrepareGeometry:async(revision)=>{const snapshot=await workspace.freezePose();if(workspace.project?.revision!==revision)throw new Error('The project changed. Start the drag again.');return{bones:workspace.renderedBones,poseEpoch:snapshot?.poseEpoch};},
      onPrepareAdjustment:workspace.prepareTimelineViewportAdjustment,
      onAdjustmentDragging:dragging=>{workspace.timelineAdjustDragging=dragging;},
      onEndGeometry:workspace.releaseViewportPose,
      previewBones:bones=>workspace.previewBonePose(bones),
      loadImage: imageData,
      onImageError: message => workspace.showNotice(message, true),
      onCommit: async (edit,revision,poseEpoch,layers) => {
        const documentId=workspace.project?.documentId;
        const applied=await workspace.editRig(edit,revision,poseEpoch);
        if(applied&&(edit.type==='translateBoneWithCompensation'||edit.type==='setBoneParentPosition'||edit.type==='setBoneLocalPosition'
          ||edit.type==='rotateBoneWithCompensation'||edit.type==='scaleBoneWithCompensation'||edit.type==='shearBoneWithCompensation')
          &&(layers?.bones||layers?.images)&&!disposed
          &&workspace.project?.documentId===documentId&&workspace.project?.revision===revision+1){
          emit('compensationApplied',layers);
        }
        return applied;
      },
    });
    if (disposed) { controller.destroy(); return; }
    controller.setGrid(workspace.grid);
    controller.setLayerVisibility(workspace.viewportVisibility);
    controller.setLayerSelection(workspace.viewportSelection);
    controller.setNameTags(workspace.viewportNameTags);
    syncScene(); loaded.value = true;
    controller.setAnimateWeightInspection(animateWeightInspection.value);
    workspace.setPreviewVisible(!document.hidden);animationFrame=requestAnimationFrame(tick);document.addEventListener('visibilitychange',visibility);
  } catch (reason) {
    controller?.destroy(); controller = undefined;
    if (disposed) return;
    error.value = errorMessage(reason).trim() || t('viewportError');
    console.error('Viewport startup failed:', reason);
    void reportReady('unavailable');
    return;
  }
  if(desktop){const stop=await onMcpCapture(request=>{void captureViewport(request);});if(disposed)stop();else stopCapture=stop;}
  void reportReady('webgl');
});
watch(() => workspace.grid, (value) => controller?.setGrid(value));
watch(() => [workspace.viewportVisibility.bones, workspace.viewportVisibility.images, workspace.viewportVisibility.others] as const,
  ([bones, images, others]) => controller?.setLayerVisibility({bones, images, others}));
watch(() => [workspace.viewportSelection.bones, workspace.viewportSelection.images, workspace.viewportSelection.others] as const,
  ([bones, images, others]) => controller?.setLayerSelection({bones, images, others}));
watch(() => [workspace.viewportNameTags.bones, workspace.viewportNameTags.images, workspace.viewportNameTags.others] as const,
  ([bones, images, others]) => {
    if (!bones && !images && !others) nameTagFrame.value = null;
    controller?.setNameTags({bones, images, others});
  });
function withPrunedRows<T extends DenseBindingView>(binding: T, rows: readonly PruneWeightRow[]): T {
  const vertices = [...binding.vertices];
  for (const {vertex, weights} of rows) {
    const original = vertices[vertex];
    if (original?.weights.length === weights.length) vertices[vertex] = {...original, weights};
  }
  return {...binding, vertices};
}
const viewportAttachmentPreview = computed(() => {
  const slots = workspace.viewSlots;
  const inspected = workspace.selectedAttachment;
  const preview = workspace.prunePreview;
  const project = workspace.project;
  if (!workspace.pruneOpen || !preview?.targets.length || !project || preview.documentId !== project.documentId ||
      preview.revision !== project.revision) return {slots, inspected};
  const rowsById = new Map(preview.targets.map(target => [target.id, target.rows]));
  let previewInspected = inspected;
  const previewSlots = slots.map(slot => {
    let activeMesh = slot.mesh;
    let changed = false;
    const attachments = slot.attachments?.map(attachment => {
      const rows = rowsById.get(attachment.id);
      if (!rows) return attachment;
      const candidate: AttachmentView = attachment.mesh ? {...attachment, mesh: withPrunedRows(attachment.mesh, rows)} :
        attachment.clipping ? {...attachment, clipping: withPrunedRows(attachment.clipping, rows)} : attachment;
      changed ||= candidate !== attachment;
      if (candidate.id === inspected?.id) previewInspected = candidate;
      if (candidate.id === slot.activeAttachmentId && candidate.mesh) activeMesh = candidate.mesh;
      return candidate;
    });
    return changed ? {...slot, mesh: activeMesh, attachments} : slot;
  });
  return {slots: previewSlots, inspected: previewInspected};
});
function syncScene() {
  if(!controller)return;
  const poses=workspace.ghostingPoses,vectors=workspace.ghostingVectors;
  const {bones,onTop}=workspace.ghostingSettings;
  const ghosting=poses.length||vectors.length?{poses,vectors,bones,onTop,boneFilter:workspace.ghostingBoneFilter}:undefined;
  const trace=workspace.tracePreview;
  const innerTrace=workspace.editorMode==='setup'&&workspace.traceOpen&&workspace.traceOptions.inner&&trace
    &&trace.expectedRevision===workspace.project?.revision&&trace.slotId===workspace.selectedSlotId
    &&(trace.attachmentId===undefined||trace.attachmentId===workspace.selectedAttachmentId)?trace:undefined;
  const {slots, inspected}=viewportAttachmentPreview.value;
  const draft=workspace.meshOutlineDraft;
  const meshOutline=workspace.editorMode==='setup'&&workspace.editMode==='meshes'&&draft
    &&draft.documentId===workspace.project?.documentId&&draft.revision===workspace.project?.revision
    &&draft.attachmentId===inspected?.id?draft:null;
  const outlineVisible=!!meshOutline&&!workspace.meshOutlineBusy;
  const inheritedDeform=workspace.editorMode==='animate'&&workspace.editMode!=='bones'&&workspace.selectedDeformSourceId!==undefined;
  const poseKey=workspace.editorMode==='animate'
    ?`${workspace.animationId}:${workspace.animationFrame}:${workspace.animationDraftVersion}:${workspace.simulationIntent}:${workspace.animationPhysicsGeneration}`
    :workspace.pruneOpen?'prune':undefined;
  controller.setScene({ ghosting:outlineVisible?undefined:ghosting,timelineAdjust:workspace.editorMode==='animate'?workspace.timelineAdjustState:undefined,bones: workspace.renderedBones,authoredBones:workspace.editorMode==='animate'?(workspace.frozenPose?.localBones??workspace.animationBones):workspace.project?.bones??[],requiresBonePose:workspace.editorMode==='animate',poseKey,hasConstraints:workspace.constraints.length>0, hoveredBone:workspace.hoveredBoneId,selectedBones:workspace.editMode==='bones'&&workspace.treeFilters.bone?workspace.selectedIds:[],imageKeys:workspace.library.images.map(image=>image.key),selected: workspace.editMode === 'bones'&&workspace.treeFilters.bone ? workspace.selectedId : null,
    parentPicking:workspace.parentPicking,sceneEditing:workspace.sceneEditing,snapRegionPixels:props.snapRegionPixels,compensation:props.compensation,parentTranslation:props.parentTranslation??undefined,
    localTranslation:props.localTranslation??undefined,localTranslationUnavailable:props.localTranslationUnavailable,previousToolSwap:props.previousToolSwap,innerTrace,
    selectedAttachments:workspace.treeFilters.attachment?workspace.selectedAttachmentIds:[],inspectedAttachment:workspace.treeFilters.attachment?inspected:null,clippingDraft:workspace.clippingDraft,
    meshOutline,meshOutlineBusy:workspace.meshOutlineBusy,
    meshWireframeAttachments:workspace.editorMode==='setup'?workspace.meshWireframeAttachments:undefined,
    meshDisplay:outlineVisible&&meshOutline?{attachmentId:meshOutline.attachmentId,triangles:false,dim:false,isolate:true}:workspace.meshDisplay,
    slots:outlineVisible&&meshOutline?meshOutlineSlots(slots,meshOutline):slots,
    selectedSlot:workspace.treeFilters.slot||workspace.treeFilters.attachment?workspace.selectedSlotId:null, mode:workspace.editMode, documentId:workspace.project?.documentId ?? -1,
    selectedVertex:workspace.editMode==='weights'?workspace.weightActiveVertex:workspace.selectedVertex,selectedVertices:workspace.editMode==='weights'?workspace.weightVertices:[],selectedInfluences:workspace.editMode==='weights'?workspace.weightBones:[],lockedInfluences:workspace.editMode==='weights'?workspace.weightLocks:[],influence:workspace.influence,meshTool:workspace.meshTool,meshEditUvs:workspace.meshEditUvs,
    weightDisplay: workspace.editMode==='weights' ? {...workspace.weightDisplay,
      influences: workspace.sceneEditing ? workspace.weightBones : workspace.influence === null ? [] : [workspace.influence]} : undefined,
    softSelection:workspace.softSelection,softSize:workspace.softSize,softFeather:workspace.softFeather,
    brushMode:workspace.brushMode,brushStrength:workspace.brushStrength,brushSize:workspace.brushSize,brushFeather:workspace.brushFeather,
    tool: workspace.tool, editable: workspace.canEdit&&(workspace.editMode==='bones'||!workspace.hasSelectedPath)&&!inheritedDeform&&!workspace.traceOpen&&!workspace.pruneOpen&&!(workspace.editorMode==='animate'?workspace.animationPhysicsError:workspace.simulationError), busy: workspace.busy||workspace.traceOpen||workspace.pruneOpen, revision: workspace.project?.revision ?? -1 });
}
watch(() => [props.snapRegionPixels,props.compensation,workspace.timelineAdjustState,workspace.ghostingPoses,workspace.ghostingVectors,workspace.ghostingBoneFilter,workspace.ghostingSettings.onTop,workspace.ghostingSettings.bones,workspace.parentPicking,workspace.project,workspace.editorMode,workspace.animationBones,workspace.animationDraftVersion,workspace.renderedBones,workspace.simulationError,workspace.animationPhysicsError,workspace.animationPhysicsGeneration,workspace.simulationIntent,viewportAttachmentPreview.value,workspace.pruneOpen,workspace.traceOpen,workspace.tracePreview,workspace.traceOptions.inner, workspace.selectedId, workspace.selectedIds,workspace.hoveredBoneId,workspace.library,workspace.selectedSlotId,workspace.selectedAttachmentIds,workspace.treeFilters.bone,workspace.treeFilters.slot,workspace.treeFilters.attachment,workspace.clippingDraft,workspace.clippingDraft?.points.length, workspace.editMode, workspace.tool, workspace.transformPivot,workspace.busy,workspace.selectedVertex,workspace.weightActiveVertex,workspace.weightVertices,workspace.weightBones,workspace.weightLocks,workspace.influence,workspace.meshTool,workspace.meshEditUvs,workspace.meshDisplay,workspace.softSelection,workspace.softSize,workspace.softFeather,workspace.brushMode,workspace.brushStrength,workspace.brushSize,workspace.brushFeather], syncScene);
watch(() => [workspace.meshOutlineDraft,workspace.meshOutlineDraft?.points.length,workspace.meshOutlineBusy], syncScene);
watch(() => workspace.meshWireframeAttachments, syncScene);
watch(animateWeightInspection, value => controller?.setAnimateWeightInspection(value));
watch(() => workspace.resetCount, () => controller?.reset());
watch(() => [props.parentTranslation,props.localTranslation,props.localTranslationUnavailable,props.previousToolSwap], syncScene);
watch(() => [workspace.weightDisplay.pies, workspace.weightDisplay.overlay, workspace.weightDisplay.selectedOnly], syncScene);
onBeforeUnmount(() => { disposed = true;stopCapture?.();if(animationFrame!==null)cancelAnimationFrame(animationFrame);document.removeEventListener('visibilitychange',visibility);controller?.destroy();workspace.clearBoneHover();workspace.setPreviewVisible(false); });
</script>
<template>
  <div class="relative min-h-0 min-w-0 overflow-hidden bg-canvas viewport-checker" :class="{'viewport-rulers-on':rulersVisible}">
    <div ref="host" class="absolute inset-0 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent"
      role="img" :aria-label="t('viewport')" :tabindex="weightViewportFocus ? 0 : undefined"
      data-testid="viewport" @pointerdown.capture="focusWeightViewport" />
    <div v-if="!loaded && !error" role="status" class="absolute inset-0 flex items-center justify-center text-muted">{{ t('loading') }}</div>
    <div v-if="error" role="alert" class="absolute inset-0 flex items-center justify-center p-8 text-center">
      <div class="max-w-lg select-text"><p class="text-danger">{{ t('viewportError') }}</p><p class="mt-3 text-xs leading-5 break-words text-muted">{{ error }}</p></div>
    </div>
    <slot v-if="loaded" />
    <ViewportNameTags v-if="currentNameTagFrame" :frame="currentNameTagFrame" :rulers-visible="rulersVisible"
      :selectable="nameTagsSelectable" @select="selectNameTag" @wheel="zoomFromNameTag" @pan="panFromNameTag" />
    <ViewportRulers v-if="rulersVisible && rulerFrame" class="z-[8]" :frame="rulerFrame" />
    <div v-if="loaded" class="viewport-navigation-position">
      <ViewportNavigationRail :zoom="workspace.zoom" :can-fit="workspace.renderedBones.length>0"
        :rulers-visible="rulersVisible" :disabled="workspace.openingProject||workspace.busy||workspace.traceOpen"
        @zoom="zoomViewport" @fit="fitViewport" @toggle-rulers="toggleRulers" />
    </div>
  </div>
</template>
