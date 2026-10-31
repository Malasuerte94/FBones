<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { invokeNative as invoke } from '../../services/bridge';
import { useWorkspace } from '../../stores/workspace';
import { desktop, imageData } from '../../services/desktop';
import { errorMessage } from '../../domain/project';
import { createViewport, type ViewportController } from '../../viewport/createViewport';
const { t } = useI18n();
const workspace = useWorkspace();
const host = ref<HTMLElement>();
const error = ref<string | null>(null);
const loaded = ref(false);
let controller: ViewportController | undefined;
let disposed = false;
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
      onSelect: id => workspace.selectBone(id),
      onPickParent:id=>{void workspace.chooseParent(id);},
      onSelectBones: (ids,active) => workspace.selectBones(ids,active),
      onHoverBone: id => id===null?workspace.clearBoneHover('viewport'):workspace.hoverBone('viewport',id),
      onClearHover: () => workspace.clearBoneHover(),
      onEscape: () => workspace.escapeSelection(),
      onDropImage: (key,x,y) => workspace.placeImage(key,x,y,workspace.project?.bones[0]?.id),
      onDropImages: (keys,x,y) => workspace.placeImages(keys,x,y,workspace.project?.bones[0]?.id),
      pivotMode: () => workspace.transformPivot,
      onSelectVertex: index => { workspace.selectedVertex = index; },
      onSelectVertices:(ids,active)=>{if(workspace.editMode==='weights')workspace.selectWeightVertices(ids,active);},
      onSelectSlot: id => workspace.selectSlot(id),
      onSelectAttachments:(ids,active)=>workspace.selectSceneAttachments(ids,active),
      onClippingPoint:point=>workspace.appendClippingPoint(point),
      onFinishClipping:()=>{void workspace.finishClipping();},
      onPauseSimulation:()=>workspace.suspendSimulation('geometry'),
      onEndBonePreview:()=>workspace.endBonePreview(),
      onPrepareGeometry:async(revision)=>{const snapshot=await workspace.freezePose();if(workspace.project?.revision!==revision)throw new Error('The project changed. Start the drag again.');return{bones:workspace.renderedBones,poseEpoch:snapshot?.poseEpoch};},
      onEndGeometry:()=>{if(!workspace.traceOpen&&!workspace.clippingDraft){workspace.releasePose();workspace.resumeSimulation('geometry');}},
      previewBones:bones=>workspace.previewBonePose(bones),
      loadImage: imageData,
      onImageError: message => workspace.showNotice(message, true),
      onCommit: (edit, revision,poseEpoch) => workspace.editRig(edit, revision,poseEpoch),
    });
    if (disposed) { controller.destroy(); return; }
    controller.setGrid(workspace.grid); syncScene(); loaded.value = true;
    workspace.setPreviewVisible(!document.hidden);animationFrame=requestAnimationFrame(tick);document.addEventListener('visibilitychange',visibility);
  } catch (reason) {
    controller?.destroy(); controller = undefined;
    if (disposed) return;
    error.value = errorMessage(reason).trim() || t('viewportError');
    console.error('Viewport startup failed:', reason);
    void reportReady('unavailable');
    return;
  }
  void reportReady('webgl');
});
watch(() => workspace.grid, (value) => controller?.setGrid(value));
function syncScene() {
  controller?.setScene({ bones: workspace.renderedBones,authoredBones:workspace.editorMode==='animate'?(workspace.frozenPose?.localBones??workspace.animationBones):workspace.project?.bones??[],requiresBonePose:workspace.editorMode==='animate',poseKey:workspace.editorMode==='animate'?`${workspace.animationId}:${workspace.animationFrame}:${workspace.animationDraftVersion}:${workspace.simulationIntent}:${workspace.animationPhysicsGeneration}`:undefined,hasConstraints:workspace.constraints.length>0, hoveredBone:workspace.hoveredBoneId,selectedBones:workspace.editMode==='bones'&&workspace.treeFilters.bone?workspace.selectedIds:[],imageKeys:workspace.library.images.map(image=>image.key),selected: workspace.editMode === 'bones'&&workspace.treeFilters.bone ? workspace.selectedId : null,
    parentPicking:workspace.parentPicking,sceneEditing:workspace.sceneEditing,selectedAttachments:workspace.treeFilters.attachment?workspace.selectedAttachmentIds:[],inspectedAttachment:workspace.treeFilters.attachment?workspace.selectedAttachment:null,clippingDraft:workspace.clippingDraft,
    slots: workspace.viewSlots, selectedSlot:workspace.treeFilters.slot||workspace.treeFilters.attachment?workspace.selectedSlotId:null, mode:workspace.editMode, documentId:workspace.project?.documentId ?? -1,
    selectedVertex:workspace.editMode==='weights'?workspace.weightActiveVertex:workspace.selectedVertex,selectedVertices:workspace.editMode==='weights'?workspace.weightVertices:[],selectedInfluences:workspace.editMode==='weights'?workspace.weightBones:[],lockedInfluences:workspace.editMode==='weights'?workspace.weightLocks:[],influence:workspace.influence,meshTool:workspace.meshTool,meshEditUvs:workspace.meshEditUvs,
    softSelection:workspace.softSelection,softSize:workspace.softSize,softFeather:workspace.softFeather,
    brushMode:workspace.brushMode,brushStrength:workspace.brushStrength,brushSize:workspace.brushSize,brushFeather:workspace.brushFeather,
    tool: workspace.tool, editable: workspace.canEdit&&!workspace.traceOpen&&!(workspace.editorMode==='animate'?workspace.animationPhysicsError:workspace.simulationError), busy: workspace.busy||workspace.traceOpen, revision: workspace.project?.revision ?? -1 });
}
watch(() => [workspace.parentPicking,workspace.project,workspace.editorMode,workspace.animationBones,workspace.animationDraftVersion,workspace.renderedBones,workspace.simulationError,workspace.animationPhysicsError,workspace.animationPhysicsGeneration,workspace.simulationIntent,workspace.viewSlots,workspace.traceOpen, workspace.selectedId, workspace.selectedIds,workspace.hoveredBoneId,workspace.library,workspace.selectedSlotId,workspace.selectedAttachmentIds,workspace.selectedAttachment,workspace.treeFilters.bone,workspace.treeFilters.slot,workspace.treeFilters.attachment,workspace.clippingDraft,workspace.clippingDraft?.points.length, workspace.editMode, workspace.tool, workspace.transformPivot, workspace.busy,workspace.selectedVertex,workspace.weightActiveVertex,workspace.weightVertices,workspace.weightBones,workspace.weightLocks,workspace.influence,workspace.meshTool,workspace.meshEditUvs,workspace.softSelection,workspace.softSize,workspace.softFeather,workspace.brushMode,workspace.brushStrength,workspace.brushSize,workspace.brushFeather], syncScene);
watch(() => workspace.resetCount, () => controller?.reset());
onBeforeUnmount(() => { disposed = true;if(animationFrame!==null)cancelAnimationFrame(animationFrame);document.removeEventListener('visibilitychange',visibility);controller?.destroy();workspace.clearBoneHover();workspace.setPreviewVisible(false); });
</script>
<template>
  <div class="relative min-h-0 min-w-0 overflow-hidden bg-canvas viewport-checker">
    <div ref="host" class="absolute inset-0" role="img" :aria-label="t('viewport')" data-testid="viewport" />
    <div v-if="!loaded && !error" role="status" class="absolute inset-0 flex items-center justify-center text-muted">{{ t('loading') }}</div>
    <div v-if="error" role="alert" class="absolute inset-0 flex items-center justify-center p-8 text-center">
      <div class="max-w-lg select-text"><p class="text-danger">{{ t('viewportError') }}</p><p class="mt-3 text-xs leading-5 break-words text-muted">{{ error }}</p></div>
    </div>
    <slot v-if="loaded" />

  </div>
</template>
