import { defineStore } from 'pinia';
import { computed, ref, reactive, shallowRef, watch, nextTick, type DeepReadonly } from 'vue';
import * as api from '../services/desktop.ts';
import { errorMessage, type ProjectSummary, type RigEdit, type EditMode, type EditorTool, type TraceOptions, type TracePreview, type PruneWeightOptions, type PruneWeightTarget, type PruneWeightRequest, type PruneWeightPreview, type AttachmentView, type ConstraintInput, type RegionView, type ClippingView, type ClippingDraft, type EvaluationSnapshot, type BoneView, type DenseBindingView, type MeshView, type MeshOutlineDraft } from '../domain/project.ts';
import {automaticColors,childColor} from '../domain/colors.ts';
import { selectImageKeys } from '../domain/imageSelection.ts';
import {activeBoneHover,claimBoneHover,emptyBoneHover,pruneBoneHover,releaseBoneHover,type BoneHoverSource} from '../domain/boneHover.ts';
import { nativeWindow } from '../services/bridge.ts';
import {allTreeKinds,type TreeFilterState,type TreeKind} from '../domain/treeProjection.ts';
import {selectionHierarchy,type ViewportSelectionPathItem} from '../domain/selectionHierarchy.ts';
import {createSceneSelectionHistory,type SceneHistorySelection} from '../domain/sceneSelectionHistory.ts';
import {ScenePreview} from '../domain/scenePreview.ts';
import {AnimationPhysicsPreview} from '../domain/animationPhysicsPreview.ts';
import {withEvaluatedPose} from '../domain/evaluatedPose.ts';
import {createGhostingSampler,defaultGhostingSettings,ghostingDisplaysAttachments,ghostingKeyFrames,ghostingSampleBudget,planGhosting,planGhostingMotion,resolveGhostingBoneFilter,traceGhostingMotion,type GhostingUnavailable,type GhostPose,type GhostVector} from '../domain/ghosting.ts';
import {MAX_ANIMATION_PREVIEW_FRAME} from '../domain/animationPlayback.ts';
import {worldBones,canParent,inverseVector} from '../domain/rig.ts';
import {sampleAnimation,sameAnimationFrame,type BoneAutoKey} from '../domain/animation.ts';
import {planTimelineAdjustKeys,prepareTimelineAdjust,type TimelineAdjustDelta,type TimelineAdjustState,type TimelineAdjustTarget} from '../domain/timelineAdjust.ts';
import {validWeightSelection,withWeightBone,withWeightVertices,type WeightSelection} from '../domain/weightSelection.ts';
import {useAnimationWorkspace} from '../composables/useAnimationWorkspace.ts';
import type {EventDefinition,EventPatch,FiredEvent} from '../domain/animationEvents.ts';
import type {ConstraintPose} from '../domain/animationConstraints.ts';
import {EventAudioPlayer,type AudioReceipt} from '../domain/eventAudio.ts';
import {evaluate as evaluateScene,PhysicsState} from '../domain/solve/index.ts';
import {logicalDocumentKey} from '../domain/resourceContinuity.ts';
import {batchField,batchFieldValue,sameBatchValue} from '../domain/constraintBatch.ts';
import {canMatchTransform} from '../domain/transformMapping.ts';
import type {MeshDisplay, MeshDisplayOptions} from '../domain/meshDisplay.ts';
import {createMeshOutlinePlane} from '../domain/meshEdit.ts';
import {meshOutlineUv, meshOutlineWorldPoints} from '../domain/meshOutline.ts';
import {i18n} from '../i18n.ts';
import {gifBase64, maxGifBytes, planGifFrames, type GifExportOptions} from '../domain/gifExport.ts';

export type Intent = 'new' | 'open' | 'close' | 'quit' | 'update' | 'repair-linked-mesh-copy';

interface PruneSession {
  documentId:number;
  revision:number;
  targets:PruneWeightTarget[];
  maxInfluences:number;
  selectionKey:string;
}
interface PruneDraft {session:PruneSession;request:PruneWeightRequest}
interface WeightClipboard {
  documentKey:string;
  bones:readonly number[];
  rows:readonly (readonly number[])[];
}
type AnimateWeightsTarget = Readonly<{attachmentId:number;name:string;binding:DeepReadonly<MeshView>}>;
type PasteWeightEdit = Extract<RigEdit,{type:'pasteAttachmentWeights'}>;
type WeightPastePlan = {reason:'noClipboard'|'target'|'count'|'bones'|'locks'} |
  {reason:null;edit:PasteWeightEdit;revision:number};
const defaultMeshDisplayOptions:MeshDisplayOptions={triangles:true,dim:false,isolate:false};
const emptyMeshWireframeAttachments:ReadonlySet<number>=new Set();

function sameMeshTopology(a:DeepReadonly<MeshView>,b:DeepReadonly<MeshView>):boolean {
  const same=(left:readonly number[],right:readonly number[])=>(left===right||
    left.length===right.length&&left.every((value,index)=>value===right[index]));
  return a===b||(a.vertices.length===b.vertices.length&&a.hull===b.hull&&
    same(a.uvs,b.uvs)&&same(a.triangles,b.triangles)&&same(a.edges,b.edges));
}

export const useWorkspace = defineStore('workspace', () => {
  const project = shallowRef<ProjectSummary | null>(null);
  const editorMode=ref<'setup'|'animate'>('setup');
  const animationLocalBones=shallowRef<BoneView[]>([]);
  const busy = ref(false);
  const openingProject = ref(false);
  const editing = ref(false);
  const ready = ref(false);
  const newDialog = ref(false);
  const discardDialog = ref(false);
  const notice = ref('');
  const noticeError = ref(false);
  const inspectorError = ref('');
  const animationKeyError=ref('');
  const eventKeyError=ref('');
  const sequenceFieldError=ref(''),attachmentColorError=ref('');
  const grid = ref(true);
  const viewportVisibility = reactive({bones:true, images:true, others:true});
  const viewportSelection = reactive({bones:true, images:true, others:true});
  const viewportNameTags = reactive({bones:false, images:false, others:false});
  const ghostingSettings = reactive(defaultGhostingSettings());
  const zoom = ref(100);
  const resetCount = ref(0);
  const tool=ref<EditorTool>('translate');
  const transformPivot=ref<'individual'|'group'>('individual');
  const selectedIds=ref<number[]>([0]);
  const autoColor=ref(false);
  try{autoColor.value=localStorage.getItem('fbones.auto-color')==='true';}catch{/* optional view preference */}
  watch(autoColor,value=>{try{localStorage.setItem('fbones.auto-color',String(value));}catch{/* optional */}});
  const selectedId = ref<number | null>(0);
  const boneHover=shallowRef(emptyBoneHover());
  const hoveredBoneId=computed(()=>activeBoneHover(boneHover.value)?.id??null);
  function hoverBone(source:BoneHoverSource,id:number){
    if(project.value?.bones.some(b=>b.id===id))boneHover.value=claimBoneHover(boneHover.value,source,id);
  }
  function clearBoneHover(source?:BoneHoverSource,id?:number){boneHover.value=releaseBoneHover(boneHover.value,source,id);}
  watch(()=>[project.value?.documentId,project.value?.bones] as const,(value,previous)=>{
    if(!previous||value[0]!==previous[0])clearBoneHover();
    else boneHover.value=pruneBoneHover(boneHover.value,new Set(value[1]?.map(b=>b.id)??[]));
  },{flush:'sync'});
  const selectedSlotId = ref<number | null>(null);
  const selectedSlotIds=ref<number[]>([]);
  const selectedAttachmentId=ref<number|null>(null),selectedAttachmentIds=ref<number[]>([]);
  const selectedConstraintId=ref<number|null>(null);
  const selectedConstraintIds=ref<number[]>([]),constraintSelectionAnchor=ref<number|null>(null);
  watch(selectedConstraintId,id=>{if(id===null){selectedConstraintIds.value=[];constraintSelectionAnchor.value=null;}else if(!selectedConstraintIds.value.includes(id))selectedConstraintIds.value=[id];},{flush:'sync'});
  const selectedEventId=ref<number|null>(null);
  const selectedEvent=computed(()=>project.value?.events?.find(event=>event.id===selectedEventId.value)??null);
  const audioLibrary=computed(()=>project.value?.audioLibrary??{root:project.value?.audioRoot??'./audio',sounds:[],warnings:[]});
  const audioPlayer=new EventAudioPlayer(api.audioData);
  const eventPlaybackCount=ref(0),audioPlaybackCount=ref(0);
  const lastAnimationEvent=shallowRef<{eventId:number;frame:number;serial:number}|null>(null);
  const lastAudioPlayback=shallowRef<(AudioReceipt&{eventId:number;frame:number|null})|null>(null);
  const audioErrors=new Set<string>();
  const selectedEventAudioPlayable=computed(()=>audioPlayer.supported&&!!selectedEvent.value?.audio&&audioLibrary.value.sounds.some(sound=>sound.key===selectedEvent.value?.audio));
  const eventPlaybackText=computed(()=>{
    const definition=selectedEvent.value,event=lastAnimationEvent.value,audio=lastAudioPlayback.value;
    if(!definition)return'';
    if(event?.eventId===definition.id){if(!definition.audio||audio?.eventId===definition.id&&audio.frame===event.frame)return`${definition.name} · Frame ${event.frame}`;return'';}
    return audio?.eventId===definition.id?`${definition.name} · Preview audio`:'';
  });
  watch(()=>project.value?.documentId,id=>{audioPlayer.reset(id??null);audioErrors.clear();eventPlaybackCount.value=0;audioPlaybackCount.value=0;lastAnimationEvent.value=null;lastAudioPlayback.value=null;},{flush:'sync'});
  function stopAnimationAudio(){audioPlayer.stop();}
  function startAnimationAudio(){
    lastAnimationEvent.value=null;
    const documentId=project.value?.documentId;
    if(project.value?.events?.some(event=>event.audio&&audioLibrary.value.sounds.some(sound=>sound.key===event.audio)))void audioPlayer.unlock().catch(error=>{if(project.value?.documentId===documentId&&animation.animationPlaying.value)showNotice(errorMessage(error),true);});
  }
  async function playEventAudio(definition:EventDefinition,frame:number|null,volume:number,balance:number){
    const model=project.value,sound=audioLibrary.value.sounds.find(sound=>sound.key===definition.audio);if(!model||!definition.audio)return;
    try{
      if(!sound)throw new Error(`Audio resource “${definition.audio}” is unavailable. Choose its Audio folder.`);
      const receipt=await audioPlayer.play(model.documentId,sound,Math.fround(volume),Math.fround(balance));
      if(receipt&&project.value?.documentId===model.documentId){audioPlaybackCount.value++;lastAudioPlayback.value={...receipt,eventId:definition.id,frame};}
    }catch(error){const key=`${model.documentId}:${definition.audio}`;if(!audioErrors.has(key)){audioErrors.add(key);showNotice(errorMessage(error),true);}}
  }
  function fireAnimationEvents(events:FiredEvent[]){
    for(const event of events){const definition=project.value?.events?.find(definition=>definition.id===event.event);if(!definition)continue;eventPlaybackCount.value++;lastAnimationEvent.value={eventId:event.event,frame:Math.fround(event.key.frame),serial:eventPlaybackCount.value};if(definition.audio)void playEventAudio(definition,Math.fround(event.key.frame),event.key.volume,event.key.balance);}
  }
  async function previewEventAudio(id:number){const definition=project.value?.events?.find(event=>event.id===id);if(!definition)return;const key=selectedEventId.value===id?currentEventKey.value:null;lastAnimationEvent.value=null;await playEventAudio(definition,null,key?.volume??definition.volume,key?.balance??definition.balance);}
  const allTreeFilters=Object.freeze(allTreeKinds());
  const treeFilterState=shallowRef<{saved:Readonly<TreeFilterState>;bypassed:boolean}>({saved:allTreeFilters,bypassed:false});
  const treeFilterPreferences=computed(()=>treeFilterState.value.saved);
  const treeFiltersBypassed=computed(()=>treeFilterState.value.bypassed);
  const treeFilters=computed(()=>{
    const {saved,bypassed}=treeFilterState.value;
    return bypassed?allTreeFilters:saved;
  });
  const treeTextSearchFilters=ref(true);
  function setTreeFilter(kind:TreeKind,checked:boolean,resumeFilters=false){
    const {saved,bypassed}=treeFilterState.value;
    const nextBypassed=bypassed&&!resumeFilters;
    if(saved[kind]===checked&&bypassed===nextBypassed)return;
    const nextSaved=saved[kind]===checked?saved:Object.freeze({...saved,[kind]:checked});
    treeFilterState.value={saved:nextSaved,bypassed:nextBypassed};
  }
  function toggleTreeFiltersBypass(){
    const {saved,bypassed}=treeFilterState.value;
    treeFilterState.value={saved,bypassed:!bypassed};
  }
  function resetTreeFilters(){
    if(treeFilterPreferences.value===allTreeFilters&&!treeFiltersBypassed.value)return;
    treeFilterState.value={saved:allTreeFilters,bypassed:false};
  }
  function setTreeTextSearchFilters(checked:boolean){treeTextSearchFilters.value=checked;}
  const editMode = ref<EditMode>('bones');
  const selectedVertex = ref<number | null>(null);
  const meshTool = ref<'move' | 'add' | 'edge' | 'removeEdge' | 'draw' | 'delete'>('move');
  const meshEditUvs=ref(true);
  const library=computed(()=>project.value?.library??{root:'./images/',images:[],warnings:[]});
  const librarySelectedKeys=ref<string[]>([]);
  const libraryAnchor=ref<string|null>(null);
  const libraryActiveKey=ref<string|null>(null);
  const librarySelection=computed<string|null>({
    get:()=>libraryActiveKey.value!==null&&librarySelectedKeys.value.includes(libraryActiveKey.value)?libraryActiveKey.value:librarySelectedKeys.value.at(-1)??null,
    set:key=>{librarySelectedKeys.value=key===null?[]:[key];libraryAnchor.value=key;libraryActiveKey.value=key;},
  });
  watch(()=>library.value.images,images=>{
    const valid=new Set(images.map(image=>image.key));
    librarySelectedKeys.value=librarySelectedKeys.value.filter(key=>valid.has(key));
    if(libraryAnchor.value!==null&&!valid.has(libraryAnchor.value))libraryAnchor.value=null;
  });
  function selectLibraryImage(key:string,ordered:string[],modifiers:{shift?:boolean;toggle?:boolean}={}){
    if(traceApplying.value)return;
    const result=selectImageKeys({keys:librarySelectedKeys.value,anchor:libraryAnchor.value},key,ordered,modifiers);
    selectionEpoch++;librarySelectedKeys.value=result.keys;libraryAnchor.value=result.anchor;libraryActiveKey.value=result.keys.includes(key)?key:result.keys.at(-1)??null;
    clearObjectSelection();selectedSlotId.value=null;selectedVertex.value=null;inspectorError.value='';
  }
  const traceOpen=ref(false),traceBusy=ref(false),traceApplying=ref(false),tracePreview=shallowRef<TracePreview|null>(null);
  const pruneSession=shallowRef<PruneSession|null>(null);
  const pruneOpen=computed(()=>pruneSession.value!==null);
  const traceOptions=reactive<TraceOptions>({alphaThreshold:16,tolerance:1,spacing:24,padding:0,inner:false,innerThreshold:0.15,innerTolerance:2,innerSpacing:24,maxVertices:192});
  const viewSlots=computed(()=>{
    const current=animation.sequenceSlots.value;
    const preview=tracePreview.value;
    if(!preview||project.value?.revision!==preview.expectedRevision)return current;
    return current.map(s=>{
      if(s.id!==preview.slotId)return s;
      const active=preview.attachmentId===undefined||s.activeAttachmentId===preview.attachmentId;
      return {...s,...(active?{mesh:preview.mesh}:{}),...(preview.attachmentId===undefined?{}:{attachments:s.attachments?.map(a=>a.id===preview.attachmentId?{...a,mesh:preview.mesh}:a)})};
    });
  });
  let traceGeneration=0,tracePending=false,traceFlight:Promise<void>|null=null;
  const influence = ref<number | null>(null);
  const softSelection = ref(false), softSize = ref(100), softFeather = ref(0.6);
  const brushMode = ref<'direct' | 'add' | 'subtract' | 'replace' | 'smooth'>('add');
  const brushStrength = ref(0.5), brushSize = ref(80), brushFeather = ref(0.6);
  const weightDisplay = reactive({pies: true, overlay: false, selectedOnly: false});
  const slots = computed(() => project.value?.slots ?? []);
  const linkedMeshCreationSources = computed(() => slots.value.flatMap(slot => slot.attachments ?? []).filter(attachment =>
    !!attachment.mesh && attachment.linkedMeshSourceId === undefined &&
    !!attachment.region && attachment.region.width > 0 && attachment.region.height > 0));
  const sceneEditing=computed(()=>project.value?.sceneEditing===true);
  const constraints=computed(()=>project.value?.constraints??[]);
  const sceneSlots=computed(()=>(editorMode.value==='animate'?viewSlots.value:slots.value).map(slot=>{
    const attachments:AttachmentView[]=slot.attachments??(slot.region?[{id:slot.id,slot:slot.id,name:slot.region.name,type:slot.mesh?'mesh':'region',region:slot.region,mesh:slot.mesh??null,clipping:null,imageAvailable:slot.imageAvailable}]:[]);
    return{...slot,attachments,activeAttachmentId:slot.activeAttachmentId===undefined?(slot.visible?attachments[0]?.id??null:null):slot.activeAttachmentId};
  }));
  const sceneAttachments=computed(()=>sceneSlots.value.flatMap(slot=>slot.attachments));
  const selectedAttachment=computed(()=>{
    const attachment=sceneAttachments.value.find(a=>a.id===selectedAttachmentId.value)??null,preview=tracePreview.value;
    return attachment&&preview?.attachmentId===attachment.id&&preview.expectedRevision===project.value?.revision?{...attachment,mesh:preview.mesh}:attachment;
  });
  const hasSelectedPath=computed(()=>selectedAttachmentIds.value.length>0&&slots.value.some(slot=>slot.attachments?.some(
    attachment=>attachment.type==='path'&&selectedAttachmentIds.value.includes(attachment.id),
  )));
  const selectedDeformSourceId=computed(()=>selectedAttachmentId.value===null?undefined:animation.inheritedDeformSource(selectedAttachmentId.value));
  const selectedRegionTransform=computed(()=>{
    const attachment=selectedAttachment.value;
    if(editorMode.value!=='setup'||attachment?.type!=='region'||!attachment.region||attachment.mesh)return null;
    if(sceneEditing.value&&(selectedAttachmentIds.value.length!==1||selectedAttachmentIds.value[0]!==attachment.id))return null;
    return {attachment,region:attachment.region};
  });
  const selectedSlotRaw=computed(()=>sceneSlots.value.find(s=>s.id===selectedSlotId.value)??null);
  const selectedConstraint=computed(()=>constraints.value.find(c=>c.id===selectedConstraintId.value)??null);
  const selectedConstraints=computed(()=>selectedConstraintIds.value.flatMap(id=>{const c=constraints.value.find(c=>c.id===id);return c?[c]:[];}));
  const selectedSlot = computed(() => {
    const slot=selectedSlotRaw.value,attachment=selectedAttachment.value;
    return slot&&attachment?.slot===slot.id?{...slot,region:attachment.region,mesh:attachment.mesh,imageAvailable:attachment.imageAvailable}:slot;
  });
  const selectedBinding=computed<DenseBindingView|null>(()=>{
    if(!sceneEditing.value)return selectedSlot.value?.mesh??null;
    const attachment=selectedAttachment.value;
    return attachment?.clipping??attachment?.mesh??null;
  });
  const animateWeightsTarget=computed<AnimateWeightsTarget|null>(()=>{
    const id=selectedAttachmentId.value;
    if(editorMode.value!=='animate'||!treeFilters.value.attachment||id===null||
      selectedAttachmentIds.value.length!==1||selectedAttachmentIds.value[0]!==id)return null;
    // The dock reads stored rows. The viewport resolves this ID in the sampled
    // slots, where Deform and animation activation affect rendering.
    for(const slot of slots.value){
      const attachment=slot.attachments?.find(item=>item.id===id);
      if(!attachment)continue;
      const binding=attachment.mesh;
      return attachment.type==='mesh'&&binding?.weighted&&binding.bones.length&&binding.vertices.length
        ?{attachmentId:id,name:attachment.name,binding}:null;
    }
    return null;
  });
  const animateWeightsPick=ref<number|null>(null);
  const animateWeightsVertex=computed(()=>animateWeightsPick.value);
  function selectAnimateWeightsVertex(index:number|null){
    const target=animateWeightsTarget.value;
    if(index===null){animateWeightsPick.value=null;return;}
    if(target&&Number.isInteger(index)&&index>=0&&index<target.binding.vertices.length){
      animateWeightsPick.value=index;
    }
  }
  watch(()=>[logicalDocumentKey(project.value),animateWeightsTarget.value] as const,([key,target],[previousKey,previous])=>{
    if(animateWeightsPick.value===null)return;
    if(key!==previousKey||!target||!previous||target.attachmentId!==previous.attachmentId||
      !sameMeshTopology(target.binding,previous.binding))animateWeightsPick.value=null;
  },{flush:'sync'});
  const weightSelections=shallowRef(new Map<string,WeightSelection>());
  const weightClipboard=shallowRef<WeightClipboard|null>(null);
  function weightTargetKey(model: ProjectSummary, id: number) {
    return `${logicalDocumentKey(model)}:${model.sceneEditing ? 'attachment' : 'slot'}:${id}`;
  }
  const weightSelectionKey=computed(()=>{
    if(!project.value||!selectedBinding.value)return null;
    const id = sceneEditing.value ? selectedAttachmentId.value : selectedSlotId.value;
    return id === null ? null : weightTargetKey(project.value, id);
  });
  const weightSelection=computed(()=>validWeightSelection(weightSelectionKey.value===null?undefined:weightSelections.value.get(weightSelectionKey.value),selectedBinding.value?.vertices.length??0,selectedBinding.value?.weighted?selectedBinding.value.bones:[]));
  const weightVertices=computed(()=>weightSelection.value.vertices);
  const weightBones=computed(()=>weightSelection.value.bones);
  const weightLocks=computed(()=>sceneEditing.value?weightSelection.value.locks:[]);
  const weightActiveVertex=computed(()=>weightSelection.value.active??(selectedVertex.value!==null&&selectedBinding.value?.vertices[selectedVertex.value]?selectedVertex.value:null));
  function storeWeightSelection(value:WeightSelection){const key=weightSelectionKey.value;if(key===null)return;const next=new Map(weightSelections.value);next.set(key,value);weightSelections.value=next;}
  function selectWeightVertices(ids:number[],active:number|null=null,replaceOrder=false){
    const next=withWeightVertices(weightSelection.value,ids,active,selectedBinding.value?.vertices.length??0,replaceOrder);
    storeWeightSelection(next);selectedVertex.value=next.active;
  }
  function clearWeightVertices(){selectWeightVertices([],null);}
  function clearWeightBones(){storeWeightSelection({...weightSelection.value,bones:[],anchor:null});}
  function toggleWeightLock(id:number){if(!sceneEditing.value||!selectedBinding.value?.weighted||!selectedBinding.value.bones.includes(id)||busy.value)return;const locks=new Set(weightLocks.value);if(locks.has(id))locks.delete(id);else locks.add(id);storeWeightSelection({...weightSelection.value,locks:selectedBinding.value.bones.filter(bone=>locks.has(bone))});}
  function invalidateWeightVertices(key=weightSelectionKey.value){if(key===null)return;const value=weightSelections.value.get(key);if(!value)return;const next=new Map(weightSelections.value);next.set(key,{...value,vertices:[],vertexOrder:[],active:null});weightSelections.value=next;}
  function committedWeightDomains(model: ProjectSummary) {
    const domains = new Map<string, MeshView | ClippingView>();
    for (const slot of model.slots) {
      if (model.sceneEditing) {
        for (const attachment of slot.attachments ?? []) {
          const binding = attachment.mesh ?? attachment.clipping;
          if (binding) domains.set(weightTargetKey(model, attachment.id), binding);
        }
      } else if (slot.mesh) {
        domains.set(weightTargetKey(model, slot.id), slot.mesh);
      }
    }
    return domains;
  }
  function invalidateHistoryWeightVertices(before: ProjectSummary, next: ProjectSummary) {
    const changed = new Set<string>();
    if (before.revision === next.revision || logicalDocumentKey(before) !== logicalDocumentKey(next)) return changed;
    // Use domain size and committed mesh UV rows, including on inactive attachments.
    const previous = committedWeightDomains(before);
    const restored = committedWeightDomains(next);
    for (const [key, binding] of previous) {
      const other = restored.get(key);
      if (!other || binding.vertices.length !== other.vertices.length || ('uvs' in binding) !== ('uvs' in other) ||
          ('uvs' in binding && 'uvs' in other && (binding.uvs.length !== other.uvs.length ||
            binding.uvs.some((uv, index) => uv !== other.uvs[index])))) changed.add(key);
    }
    for (const key of restored.keys()) {
      if (!previous.has(key)) changed.add(key);
    }
    let selections: Map<string, WeightSelection> | undefined;
    for (const key of changed) {
      const selection = weightSelections.value.get(key);
      if (!selection || (!selection.vertices.length && selection.active === null)) continue;
      selections ??= new Map(weightSelections.value);
      selections.set(key, {...selection, vertices: [], vertexOrder: [], active: null});
    }
    if (selections) weightSelections.value = selections;
    return changed;
  }
  watch(()=>logicalDocumentKey(project.value),(id,previous)=>{
    if(id===previous)return;
    weightSelections.value=new Map();
    weightClipboard.value=null;
  },{flush:'sync'});
  watch(()=>[weightSelectionKey.value,selectedBinding.value?.vertices.length] as const,(current,previous)=>{if(previous&&current[0]!==null&&current[0]===previous[0]&&current[1]!==previous[1])invalidateWeightVertices(current[0]);},{flush:'sync'});
  // Bind changes membership explicitly; lock protection is for ordinary weight
  // edits. Reset locks on membership changes (FBones session policy).
  watch(()=>[weightSelectionKey.value,selectedBinding.value?.weighted?selectedBinding.value.bones.join(','):''] as const,(current,previous)=>{if(previous&&current[0]!==null&&current[0]===previous[0]&&current[1]!==previous[1])storeWeightSelection({...weightSelection.value,locks:[]});},{flush:'sync'});
  const selectedBone = computed(() => selectedSlotId.value === null&&selectedConstraintId.value===null&&selectedEventId.value===null ? (editorMode.value==='animate'?animationLocalBones.value:project.value?.bones)?.find(b => b.id === selectedId.value) ?? null : null);
  const physicsBoneIds=computed(()=>selectedBone.value&&librarySelection.value===null&&!selectedAttachmentIds.value.length?(project.value?.bones??[]).filter(bone=>selectedIds.value.includes(bone.id)).map(bone=>bone.id):[]);
  const canAddPhysics=computed(()=>canEdit.value&&sceneEditing.value&&physicsBoneIds.value.length>0&&!busy.value&&!inspectorError.value&&!newDialog.value&&!discardDialog.value&&!traceOpen.value&&!clippingDraft.value&&!parentPicking.value);
  function chooseInfluence(id:number,modifiers:{toggle?:boolean;shift?:boolean}={}):boolean{
    if(!selectedBinding.value?.bones.includes(id)||(sceneEditing.value&&!selectedBinding.value.weighted))return false;
    if(sceneEditing.value){const ordered=(project.value?.bones??[]).filter(b=>selectedBinding.value!.bones.includes(b.id)).map(b=>b.id);storeWeightSelection(withWeightBone(weightSelection.value,id,ordered,modifiers));}
    influence.value=id;return true;
  }
  const weightAutoEdit=computed<RigEdit|null>(()=>{
    if(sceneEditing.value){
      const id=selectedAttachmentId.value;if(id===null)return null;
      const vertices=[...weightVertices.value],bones=[...weightBones.value],lockedBones=[...weightLocks.value];
      const scope={...(vertices.length?{vertices}:{}),...(bones.length?{bones}:{}),...(lockedBones.length?{lockedBones}:{})};
      return {type:'autoAttachmentWeights',id,...(vertices.length||bones.length||lockedBones.length?{scope}:{})};
    }
    return selectedSlot.value?{type:'autoWeights',id:selectedSlot.value.id}:null;
  });
  const canEdit = computed(() => api.desktop && !!project.value && !project.value.inspectionOnly);
  const parentPick=shallowRef<{documentId:number;revision:number;bones:number[];attachments:number[];active:number|null;selection:string}|null>(null);
  const parentPicking=computed(()=>parentPick.value!==null);
  const weightClipboardTarget = computed(() => {
    const model = project.value, attachment = selectedAttachment.value, binding = selectedBinding.value;
    const vertices = weightSelection.value.vertexOrder;
    if (!model || !canEdit.value || !sceneEditing.value || editorMode.value !== 'setup' || selectedAttachmentIds.value.length > 1 ||
        !attachment || !binding?.weighted || !binding.bones.length || !vertices.length || busy.value || editing.value ||
        openingProject.value || traceOpen.value || pruneOpen.value || clippingDraft.value || parentPicking.value ||
        newDialog.value || discardDialog.value) return null;
    return {model, id: attachment.id, binding, vertices};
  });
  const weightClipboardCount = computed(() => weightClipboard.value?.rows.length ?? 0);
  const canCopyWeights = computed(() => weightClipboardTarget.value !== null);
  const weightWord = new DataView(new ArrayBuffer(4));
  function weightBits(value:number):number {
    weightWord.setFloat32(0,value);
    return weightWord.getUint32(0);
  }
  function copyWeights():boolean {
    const target = weightClipboardTarget.value;
    if (!target) return false;
    weightClipboard.value = {documentKey: logicalDocumentKey(target.model), bones: [...target.binding.bones],
      rows: target.vertices.map(vertex => target.binding.vertices[vertex]!.weights.map(weightBits))};
    return true;
  }
  const weightPastePlan = computed<WeightPastePlan>(() => {
    const clipboard = weightClipboard.value;
    const target = weightClipboardTarget.value;
    if (!clipboard || clipboard.documentKey !== logicalDocumentKey(project.value)) return {reason: 'noClipboard'};
    if (!target) return {reason: 'target'};
    if (target.vertices.length !== clipboard.rows.length) return {reason: 'count'};
    const sourceColumns = new Map(clipboard.bones.map((id, column) => [id, column]));
    const targetBones = target.binding.bones;
    if (targetBones.length !== clipboard.bones.length || targetBones.some(id => !sourceColumns.has(id))) return {reason: 'bones'};
    const lockedBones = [...weightLocks.value];
    const lockedColumns = lockedBones.map(id => ({source: sourceColumns.get(id)!, target: targetBones.indexOf(id)}));
    const rows: PasteWeightEdit['rows'] = [];
    for (const [index, vertex] of target.vertices.entries()) {
      const source = clipboard.rows[index]!;
      const destination = target.binding.vertices[vertex]!.weights;
      if (lockedColumns.some(column => source[column.source] !== weightBits(destination[column.target]!))) return {reason: 'locks'};
      rows.push({vertex, weightBits: [...source]});
    }
    return {reason: null, revision: target.model.revision, edit: {type: 'pasteAttachmentWeights', id: target.id,
      bones: [...clipboard.bones], rows, ...(lockedBones.length ? {lockedBones} : {})}};
  });
  const weightPasteUnavailable = computed(() => weightPastePlan.value.reason);
  const canPasteWeights = computed(() => weightPasteUnavailable.value === null);
  async function pasteWeights():Promise<boolean> {
    const plan = weightPastePlan.value;
    return plan.reason === null && editRig(plan.edit, plan.revision);
  }
  const parentSelectionKey=computed(()=>`${selectedSlotId.value}:${selectedAttachmentId.value}:${selectedAttachmentIds.value.join(',')}:${selectedIds.value.join(',')}:${selectedConstraintIds.value.join(',')}:${editMode.value}:${librarySelection.value}`);
  function cancelParentPick(){parentPick.value=null;resumeSimulation('parent');clearBoneHover();}
  async function beginParentPick():Promise<boolean>{
    if(editFlight&&!(await editFlight))return false;
    const model=project.value;
    if(!model||!canEdit.value||!sceneEditing.value||busy.value||inspectorError.value||traceOpen.value||clippingDraft.value||meshOutlineDraft.value||newDialog.value||discardDialog.value||librarySelection.value!==null||selectedConstraintId.value!==null)return false;
    const attachments=[...selectedAttachmentIds.value],bones=attachments.length||selectedSlotId.value!==null?[]:[...selectedIds.value];
    if(hasSelectedPath.value||!attachments.length&&!bones.length)return false;
    if(bones.some(id=>model.bones.find(b=>b.id===id)?.parent===null)){showNotice('The root bone cannot be reparented.',true);return false;}
    suspendSimulation('parent');endBonePreview();
    parentPick.value={documentId:model.documentId,revision:model.revision,bones,attachments,active:selectedAttachmentId.value,selection:parentSelectionKey.value};return true;
  }
  function canPickParent(id:number):boolean{
    const pick=parentPick.value,model=project.value;
    return !!pick&&!!model&&!busy.value&&pick.documentId===model.documentId&&pick.revision===model.revision&&model.bones.some(b=>b.id===id)&&pick.bones.every(source=>canParent(model.bones,source,id));
  }
  async function chooseParent(id:number):Promise<boolean>{
    const pick=parentPick.value;if(!pick||!canPickParent(id))return false;
    const selectionAtPick=selectionEpoch;
    parentPick.value=null;resumeSimulation('parent');
    const success=await editRig({type:'reparentSelection',bones:[...pick.bones],attachments:[...pick.attachments],parent:id},pick.revision);
    if(success&&selectionAtPick===selectionEpoch&&project.value?.documentId===pick.documentId&&pick.attachments.length)selectSceneAttachments(pick.attachments,pick.active);
    return success;
  }
  watch(()=>[project.value?.documentId,project.value?.revision,parentSelectionKey.value] as const,()=>{const pick=parentPick.value;if(pick&&(pick.documentId!==project.value?.documentId||pick.revision!==project.value?.revision||pick.selection!==parentSelectionKey.value))cancelParentPick();},{flush:'sync'});
  const clippingDraft=ref<ClippingDraft|null>(null);
  const meshOutlineDraft=shallowRef<MeshOutlineDraft|null>(null),meshOutlineBusy=ref(false);
  const viewportSelectionPath=computed<readonly ViewportSelectionPathItem[]>(()=>{
    const model=project.value;
    if(!model||openingProject.value||librarySelection.value!==null||selectedConstraintId.value!==null||
        selectedConstraintIds.value.length||selectedEventId.value!==null||traceOpen.value||clippingDraft.value||
        meshOutlineDraft.value||parentPicking.value)return [];

    const attachment=selectedAttachmentId.value;
    if(attachment!==null||selectedAttachmentIds.value.length){
      if(attachment===null||selectedAttachmentIds.value.length!==1||selectedAttachmentIds.value[0]!==attachment)return [];
      return selectionHierarchy(model,{kind:'attachment',id:attachment});
    }
    const slot=selectedSlotId.value;
    if(slot!==null||selectedSlotIds.value.length){
      if(slot===null||selectedSlotIds.value.length!==1||selectedSlotIds.value[0]!==slot)return [];
      return selectionHierarchy(model,{kind:'slot',id:slot});
    }
    const bone=selectedId.value;
    if(bone===null||selectedIds.value.length!==1||selectedIds.value[0]!==bone)return [];
    return selectionHierarchy(model,{kind:'bone',id:bone});
  });
  const meshOutlinePointGesture=ref(false);
  let meshOutlinePoseEpoch:number|undefined;
  const meshDisplayOptions=shallowRef<MeshDisplayOptions>(defaultMeshDisplayOptions);
  const meshDisplay=computed<MeshDisplay|undefined>(()=>{
    if(!project.value||editorMode.value!=='setup'||editMode.value!=='meshes'||traceOpen.value||pruneOpen.value||clippingDraft.value||meshOutlineDraft.value)return;
    if(sceneEditing.value){
      const attachment=selectedAttachment.value;
      if(!treeFilters.value.attachment||selectedAttachmentIds.value.length!==1||
        selectedAttachmentIds.value[0]!==attachment?.id||!attachment?.mesh||!attachment.region)return;
      return {attachmentId:attachment.id,...meshDisplayOptions.value};
    }
    const slot=selectedSlotRaw.value;
    if(!(treeFilters.value.slot||treeFilters.value.attachment)||selectedSlotIds.value.length!==1||
      selectedSlotIds.value[0]!==slot?.id||!slot?.visible||!slot.mesh||!slot.region)return;
    return {attachmentId:slot.id,...meshDisplayOptions.value};
  });
  function toggleMeshDisplay(option:keyof MeshDisplayOptions){
    if(!meshDisplay.value||busy.value||openingProject.value)return;
    meshDisplayOptions.value={...meshDisplayOptions.value,[option]:!meshDisplayOptions.value[option]};
  }
  const meshWireframePreferences=shallowRef(emptyMeshWireframeAttachments);
  const meshWireframeAttachments=computed<ReadonlySet<number>>(()=>editorMode.value==='setup'&&sceneEditing.value
    ?meshWireframePreferences.value:emptyMeshWireframeAttachments);
  const meshWireframeTargetId=computed(()=>{
    if(!sceneEditing.value||editorMode.value!=='setup'||!treeFilters.value.attachment||selectedAttachmentIds.value.length!==1)return null;
    const attachment=selectedAttachment.value;
    return attachment?.type==='mesh'&&attachment.mesh&&selectedAttachmentIds.value[0]===attachment.id?attachment.id:null;
  });
  function setMeshWireframe(id:number,enabled:boolean){
    const current=meshWireframePreferences.value;
    if(meshWireframeTargetId.value!==id||openingProject.value||current.has(id)===enabled)return;
    const next=new Set(current);
    if(enabled)next.add(id);
    else next.delete(id);
    meshWireframePreferences.value=next;
  }
  const renderedBones=shallowRef<BoneView[]>([]),frozenPose=shallowRef<EvaluationSnapshot|null>(null);
  const appliedAnimationFrame=shallowRef<{
    documentId:number;revision:number;animationId:number;frame:number;
    boneDraft:BoneView[]|null;constraintDraft:ReadonlyMap<number,ConstraintPose>;
    rendered:BoneView[];bones:ReadonlyArray<EvaluationSnapshot['bones'][number]>;poseEpoch?:number;
  }|null>(null);
  const simulationIntent=ref(true),simulationVisible=ref(true),simulationHolds=ref<string[]>([]);
  const simulationTime=ref(0),simulationReset=ref(0),simulationStep=ref(0),simulationError=ref('');
  const meshTopologyProblem=computed(()=>{
    const model=project.value,attachment=selectedAttachment.value;
    if(!model||!canEdit.value||!sceneEditing.value||editorMode.value!=='setup'||editMode.value!=='meshes')return 'Setup';
    if(!treeFilters.value.attachment||selectedAttachmentIds.value.length!==1||selectedAttachmentIds.value[0]!==attachment?.id||!attachment?.mesh)return 'Selection';
    if(busy.value||editing.value||openingProject.value||newDialog.value||discardDialog.value||traceOpen.value||traceBusy.value||pruneOpen.value||clippingDraft.value||meshOutlineDraft.value||parentPicking.value||simulationHolds.value.length||
      inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value)return 'Busy';
    if(attachment.mesh.weighted)return 'Weighted';
    const clips=[...(model.animations??[]),model.storedAnimation];
    if(clips.some(clip=>clip?.deformTracks?.some(track=>track.attachment===attachment.id&&track.keys.length)))return 'Deform';
    return null;
  });
  const meshGenerateProblem=computed(()=>{
    const problem=meshTopologyProblem.value;
    if(problem)return `meshGenerate${problem}` as const;
    const mesh=selectedAttachment.value!.mesh!;
    // One eligible face adds one vertex and replaces three indices with nine.
    if(mesh.vertices.length>=1024||mesh.triangles.length+6>6144)return 'meshGenerateCapacity';
    return null;
  });
  const meshOutlineProblem=computed(()=>{
    const problem=meshTopologyProblem.value;
    if(problem)return `meshOutline${problem}` as const;
    const image=selectedAttachment.value?.region;
    if(!image||!Number.isFinite(image.width)||!Number.isFinite(image.height)||image.width<=0||image.height<=0)return 'meshOutlineImageSize';
    return null;
  });
  function generateMeshVertices():Promise<boolean>{
    const model=project.value,attachment=selectedAttachment.value;
    if(!model||!attachment||meshGenerateProblem.value)return Promise.resolve(false);
    return editRig({type:'generateMeshVertices',id:attachment.id},model.revision);
  }
  const simulationRunning=computed(()=>editorMode.value==='setup'&&!!project.value&&!project.value.inspectionOnly&&constraints.value.some(c=>c.type==='physics')&&simulationIntent.value&&simulationVisible.value&&!simulationHolds.value.length&&!busy.value&&!newDialog.value&&!discardDialog.value&&!traceOpen.value&&!clippingDraft.value&&!parentPicking.value&&!simulationError.value);
  const previewRuntime=new ScenePreview();let previewAccumulator=0,poseFlight:Promise<EvaluationSnapshot|null>|null=null;
  const animationPhysicsRuntime=new AnimationPhysicsPreview();
  const animationPhysicsError=ref(''),animationPhysicsGeneration=ref(0);
  let animationPhysicsKey='',animationBonePreview=false;
  let animationFreezeLease:{epoch:number;generation:number;documentId:number;revision:number;animationId:number;frame:number;version:number;mode:'none'|'replay'}|null=null;
  let poseFlightKey='',geometryGeneration=0;
  let previewGeneration=0,checkpointEpoch:number|undefined,checkpointFlight:Promise<EvaluationSnapshot|null>|null=null;
  const animation=useAnimationWorkspace({project,busy,selectedIds,editorMode,attachment:selectedAttachmentId,localBones:animationLocalBones,edit:(edit,revision,options)=>editRig(edit,revision,undefined,options),notice:showNotice,changed:publishAnimationPose,startPlayback:startAnimationAudio,stopPlayback:stopAnimationAudio,fireEvents:fireAnimationEvents});
  const animationPhysicsTime=computed(()=>animation.animationFrame.value/Math.fround(animation.animationFps.value));
  function usesAnimatedPhysics(){return editorMode.value==='animate'&&simulationIntent.value&&!!animation.activeAnimation.value&&!project.value?.inspectionOnly&&constraints.value.some(c=>c.type==='physics');}
  const capturedGhostingBones=shallowRef<readonly number[]|null>(null);
  const ghostingSelectionLocked=computed(()=>capturedGhostingBones.value!==null);
  const liveGhostingBones=computed(()=>{
    // Other Tree selections can retain a bone as the next transform target.
    if(selectedSlotId.value!==null||selectedConstraintId.value!==null||selectedEventId.value!==null||librarySelection.value!==null)return [];
    return selectedIds.value;
  });
  const ghostingBoneFilter=computed(()=>{
    if(!ghostingSettings.selectionOnly)return null;
    const captured=capturedGhostingBones.value;
    return resolveGhostingBoneFilter(project.value?.bones??[],captured===null?liveGhostingBones.value:[],captured);
  });
  function captureGhostingSelection(){
    capturedGhostingBones.value=[...(resolveGhostingBoneFilter(project.value?.bones??[],liveGhostingBones.value,null)??[])];
  }
  function setGhostingSelectionLocked(locked:boolean){
    if(!locked){capturedGhostingBones.value=null;return;}
    if(ghostingSettings.selectionOnly&&project.value&&!ghostingSelectionLocked.value)captureGhostingSelection();
  }
  function refreshGhostingSelection(){
    if(ghostingSettings.selectionOnly&&project.value&&ghostingSelectionLocked.value)captureGhostingSelection();
  }
  watch(()=>logicalDocumentKey(project.value),()=>{capturedGhostingBones.value=null;},{flush:'sync'});
  const ghostingPrerequisite=computed<GhostingUnavailable|null>(()=>{
    if(editorMode.value!=='animate')return 'mode';
    if(!project.value||!animation.activeAnimation.value)return 'animation';
    if(project.value.inspectionOnly||!project.value.bones.length)return 'unsupported';
    if(usesAnimatedPhysics())return 'physics';
    return null;
  });
  const ghostingMotionEnabled=computed(()=>{
    const motion=ghostingSettings.motionVectors;
    return (motion.beforeEnabled&&motion.before>0)||(motion.afterEnabled&&motion.after>0);
  });
  const ghostingSampleSource=computed(()=>{
    const model=project.value,clip=animation.activeAnimation.value;
    if(ghostingPrerequisite.value||!model||!clip)return null;
    return {model,clip,budget:ghostingSampleBudget(model,clip)};
  });
  const ghostingKeys=computed(()=>{
    const clip=animation.activeAnimation.value;
    return clip?ghostingKeyFrames(clip):[];
  });
  const ghostingSampler=computed(()=>{
    const source=ghostingSampleSource.value;
    return source&&createGhostingSampler(source.model,source.clip,animation.animationFps.value);
  });
  const ghostingResult=computed<{poses:readonly GhostPose[];vectors:readonly GhostVector[];limited:boolean;reason:GhostingUnavailable|null}>(()=>{
    const reason=ghostingPrerequisite.value;
    if(reason)return {poses:[],vectors:[],limited:false,reason};
    const showPoses=ghostingSettings.bones||ghostingDisplaysAttachments(ghostingSettings.frames)||ghostingDisplaysAttachments(ghostingSettings.keyFrames);
    const showMotion=ghostingMotionEnabled.value;
    if(!ghostingSettings.enabled||(!showPoses&&!showMotion)||ghostingSettings.opacity===0)return {poses:[],vectors:[],limited:false,reason:null};
    const source=ghostingSampleSource.value;
    if(!source||source.budget.poseCost>source.budget.work)return {poses:[],vectors:[],limited:true,reason:'budget'};
    try{
      const end=Math.min(animation.animationAutomaticPreviewEnd.value,MAX_ANIMATION_PREVIEW_FRAME);
      const loop=ghostingSettings.loop&&animation.animationLoop.value?{start:animation.animationLoopStart.value??0,end:animation.animationPreviewEnd.value}:null;
      const frame=animation.animationFrame.value;
      const budget=source.budget, motionCost=budget.poseCost+budget.attachmentCost;
      const motion=showMotion?planGhostingMotion(ghostingSettings,frame,end,loop,Math.min(budget.maxSamples,Math.floor(budget.work/motionCost))):null;
      const keys=showPoses&&(ghostingSettings.keyFrames.beforeEnabled||ghostingSettings.keyFrames.afterEnabled)?ghostingKeys.value:[];
      const reserved=motion?.reserved??0;
      const plan=showPoses?planGhosting(ghostingSettings,frame,keys,end,loop,budget.maxSamples-reserved,{...budget,work:budget.work-reserved*motionCost}):null;
      const sample=plan?.samples.length||motion?.baseline?ghostingSampler.value:null;
      const poses=sample&&plan?plan.samples.map(frame=>sample(frame,ghostingSettings)):[];
      const vectorResult=sample&&motion?.baseline?traceGhostingMotion(sample(motion.baseline,ghostingSettings,true),
        motion.endpoints.map(({direction,sample: endpoint})=>({direction,sample:sample(endpoint,ghostingSettings,true)})),ghostingSettings.motionVectors.threshold):null;
      const limited=!!(plan?.limited||motion?.limited||vectorResult?.limited);
      return {poses,vectors:vectorResult?.vectors??[],limited,reason:limited&&!sample?'budget':null};
    }catch{return {poses:[],vectors:[],limited:false,reason:'unsupported'};}
  });
  const ghostingAvailability=computed(()=>ghostingResult.value.reason);
  const ghostingPoses=computed(()=>ghostingResult.value.poses);
  const ghostingVectors=computed(()=>ghostingResult.value.vectors);
  const ghostingLimited=computed(()=>ghostingResult.value.limited);
  const animationPhysicsSupported=computed(()=>!!animation.activeAnimation.value&&!!project.value&&!project.value.inspectionOnly&&Number.isFinite(animationPhysicsTime.value)&&(!usesAnimatedPhysics()||animationPhysicsTime.value<=120));
  function configureAnimationPhysics(){
    const model=project.value,simulate=usesAnimatedPhysics();
    const key=`${model?.documentId}:${model?.revision}:${animation.animationId.value}:${Math.fround(animation.animationFps.value)}:${simulate}`;
    if(key!==animationPhysicsKey){animationPhysicsRuntime.configure({setupBones:model?.bones??[],setupConstraints:constraints.value,setupSlots:model?.slots,clip:animation.activeAnimation.value,fps:animation.animationFps.value,simulate});animationPhysicsKey=key;}
  }
  function evaluateAnimationFrame(boneDraft?:readonly BoneView[]){
    configureAnimationPhysics();animationPhysicsRuntime.advanceTo(animation.animationFrame.value);
    const drafts=[...animation.constraintDraft.value.values()];
    const frame=animationPhysicsRuntime.pose(boneDraft??animation.animationDraft.value??undefined,drafts.length?drafts:undefined);
    return {rendered:withEvaluatedPose(animationPhysicsRuntime.localBones,frame.bones),bones:frame.bones};
  }
  function retainAppliedAnimationFrame(bones:ReadonlyArray<EvaluationSnapshot['bones'][number]>,poseEpoch?:number){
    const model=project.value,animationId=animation.activeAnimation.value?.id;
    appliedAnimationFrame.value=model&&animationId!==undefined?{
      documentId:model.documentId,revision:model.revision,animationId,frame:animation.animationFrame.value,
      boneDraft:animation.animationDraft.value,constraintDraft:animation.constraintDraft.value,
      rendered:renderedBones.value,bones,poseEpoch,
    }:null;
  }
  function validAnimationLease(epoch:number):boolean{
    const model=project.value,lease=animationFreezeLease,snapshot=frozenPose.value;
    return !!model&&!!lease&&!!snapshot&&lease.epoch===epoch&&snapshot.poseEpoch===epoch&&lease.generation===geometryGeneration&&lease.documentId===model.documentId&&lease.revision===model.revision&&lease.animationId===animation.animationId.value&&lease.frame===animation.animationFrame.value&&lease.version===animation.animationDraftVersion.value&&lease.mode===(usesAnimatedPhysics()?'replay':'none')&&snapshot.mode===lease.mode;
  }
  const constrainedAnimationRotation=computed<number|null>(()=>{
    const sample=appliedAnimationFrame.value,model=project.value,id=selectedId.value;
    // A viewport scratch update can replace the rendered frame without publishing applied locals.
    if(!sample||!model?.sceneEditing||model.inspectionOnly||editorMode.value!=='animate'||editMode.value!=='bones'||
        !treeFilters.value.bone||openingProject.value||animationPhysicsError.value||id===null||selectedBone.value?.id!==id||
        selectedIds.value.length!==1||selectedIds.value[0]!==id||selectedAttachmentIds.value.length||librarySelection.value!==null||
        sample.rendered!==renderedBones.value||sample.documentId!==model.documentId||sample.revision!==model.revision||
        sample.animationId!==animation.activeAnimation.value?.id||sample.frame!==animation.animationFrame.value||
        sample.boneDraft!==animation.animationDraft.value||sample.constraintDraft!==animation.constraintDraft.value)return null;
    if(sample.poseEpoch!==undefined){
      const snapshot=frozenPose.value,time=animationPhysicsTime.value;
      if(!snapshot||!validAnimationLease(sample.poseEpoch)||snapshot.documentId!==sample.documentId||
          snapshot.revision!==sample.revision||snapshot.animationId!==sample.animationId||!Number.isFinite(snapshot.time)||
          Math.abs(snapshot.time-time)>Math.abs(time)*Number.EPSILON*2)return null;
    }
    if(!constraints.value.some(constraint=>constraint.type==='ik'&&constraint.bones.includes(id)))return null;
    const rotation=sample.bones.find(bone=>bone.id===id)?.applied?.rotation;
    return rotation!==undefined&&Number.isFinite(rotation)?rotation:null;
  });
  const timelineAdjustState=shallowRef<TimelineAdjustState>({enabled:false,target:null});
  const timelineAdjustDragging=ref(false);
  function setTimelineAdjustState(state:TimelineAdjustState){
    const current=timelineAdjustState.value, a=current.target, b=state.target;
    if(current.enabled===state.enabled&&(a===b||(a&&b&&a.documentKey===b.documentKey&&a.revision===b.revision
      &&a.animation===b.animation&&a.frame===b.frame&&a.bone===b.bone&&a.tool===b.tool
      &&a.keyIds.length===b.keyIds.length&&a.keyIds.every((id,index)=>id===b.keyIds[index]))))return;
    timelineAdjustState.value=state;
  }
  function timelineAdjustBasis(bones:readonly BoneView[], id:number, mode:string){
    const world=worldBones(bones), bone=world.find(item=>item.id===id);
    if(!bone||!['rotate','scale','translate'].includes(mode))return null;
    const parent=bone.parent===null?undefined:world.find(item=>item.id===bone.parent);
    if(mode==='rotate'&&parent){
      const scale=Math.hypot(parent.a,parent.b);
      if(scale<=1e-8||Math.hypot(parent.a-parent.d,parent.b+parent.c)>scale*1e-6)return null;
    }
    const axis=mode==='scale'?bone:parent;
    if(axis&&!(Math.abs(axis.a*axis.d-axis.b*axis.c)>=1e-8))return null;
    return {parent};
  }
  const timelineAdjustViewportAvailable=computed(()=>{
    if(!timelineAdjustState.value.enabled)return true;
    return editorMode.value==='animate'&&editMode.value==='bones'&&treeFilters.value.bone&&selectedIds.value.length===1&&selectedId.value!==null
      &&!constraints.value.length&&!!timelineAdjustBasis(renderedBones.value,selectedId.value,tool.value);
  });
  const timelineAdjustPlan=computed(()=>{
    const target=timelineAdjustState.value.target,clip=animation.activeAnimation.value;
    return target&&clip&&target.animation===clip.id?prepareTimelineAdjust(clip,target.keyIds,target.bone,target.frame,target.tool):null;
  });
  const timelineAdjustWorkingPose=computed(()=>{
    const plan=timelineAdjustPlan.value,model=project.value,clip=animation.activeAnimation.value;
    if(!plan||!model||!clip)return false;
    const draft=animation.animationDraft.value?.find(bone=>bone.id===plan.bone);
    if(!draft)return false;
    const sampled=sampleAnimation(model.bones,clip,plan.frame).find(bone=>bone.id===plan.bone);
    if(!sampled)return true;
    if(plan.tool==='rotate')return draft.rotation!==sampled.rotation;
    if(plan.tool==='scale')return (plan.axes.x&&(draft.scaleX??1)!==(sampled.scaleX??1))||(plan.axes.y&&(draft.scaleY??1)!==(sampled.scaleY??1));
    return (plan.axes.x&&draft.x!==sampled.x)||(plan.axes.y&&draft.y!==sampled.y);
  });
  function prepareTimelineViewportAdjustment(target:TimelineAdjustTarget, poseEpoch:number){
    const model=project.value,clip=animation.activeAnimation.value,snapshot=frozenPose.value;
    const canUse=()=>timelineAdjustState.value.enabled&&timelineAdjustState.value.target===target&&editorMode.value==='animate'
      &&editMode.value==='bones'&&treeFilters.value.bone&&selectedIds.value.length===1&&selectedId.value===target.bone&&tool.value===target.tool
      &&!constraints.value.length&&!busy.value&&!inspectorError.value&&!animationKeyError.value&&!attachmentColorError.value
      &&!eventKeyError.value&&!sequenceFieldError.value&&validAnimationLease(poseEpoch);
    if(!model||!clip||!snapshot?.localBones||!canUse()||target.documentKey!==logicalDocumentKey(model)
      ||target.revision!==model.revision||target.animation!==clip.id||!sameAnimationFrame(target.frame,animation.animationFrame.value))return null;
    const plan=timelineAdjustPlan.value;
    if(!plan)return null;
    const frozen=withEvaluatedPose(snapshot.localBones,snapshot.bones);
    const basis=timelineAdjustBasis(frozen,target.bone,target.tool);
    if(!basis)return null;
    if(timelineAdjustWorkingPose.value)return null;
    const base=snapshot.localBones,axes=plan.axes,parent=basis.parent;
    type BoneEdit=Extract<RigEdit,{type:'transformBones'}>;
    function localDelta(edit:BoneEdit):TimelineAdjustDelta{
      if(edit.mode!==target.tool||edit.ids.length!==1||edit.ids[0]!==target.bone)throw new Error('The Adjust gesture changed. Start the drag again.');
      if(edit.mode==='rotate')return {tool:'rotate',degrees:edit.rotation};
      if(edit.mode==='scale')return {tool:'scale',x:axes.x?edit.scaleX:1,y:axes.y?edit.scaleY:1};
      const local=parent?inverseVector(parent,edit.dx,edit.dy):{x:edit.dx,y:edit.dy};
      return {tool:'translate',x:axes.x?local.x:0,y:axes.y?local.y:0};
    }
    return {
      preview(edit:BoneEdit){
        const delta=localDelta(edit);
        const bones=base.map(bone=>{
          if(bone.id!==target.bone)return bone;
          if(delta.tool==='rotate')return {...bone,rotation:bone.rotation+delta.degrees};
          if(delta.tool==='scale')return {...bone,scaleX:(bone.scaleX??1)*delta.x,scaleY:(bone.scaleY??1)*delta.y};
          return {...bone,x:bone.x+delta.x,y:bone.y+delta.y};
        });
        const feedback=delta.tool==='scale'?{scaleX:delta.x,scaleY:delta.y}:delta.tool==='translate'?{
          dx:parent?parent.a*delta.x+parent.c*delta.y:delta.x,
          dy:parent?parent.b*delta.x+parent.d*delta.y:delta.y,
        }:undefined;
        return {bones,feedback};
      },
      async commit(edit:BoneEdit):Promise<boolean>{
        if(!canUse()||project.value?.revision!==target.revision)return false;
        try{
          const keys=planTimelineAdjustKeys(plan,localDelta(edit));
          return !!keys.length&&await editRig({type:'setAnimationKeys',animation:target.animation,keys},target.revision,undefined,{keepWorkingPose:true});
        }catch(error){showNotice(errorMessage(error),true);return false;}
      },
    };
  }
  async function resetAnimationPhysicsPreview():Promise<boolean>{
    if(editFlight)await editFlight;
    if(editorMode.value!=='animate'||busy.value||inspectorError.value||animationKeyError.value||eventKeyError.value||!animationPhysicsSupported.value)return false;
    animation.pauseAnimation();animationPhysicsKey='';animationPhysicsGeneration.value++;releasePose();publishAnimationPose();return !animationPhysicsError.value;
  }
  watch(()=>project.value?.documentId,()=>{animationPhysicsKey='';animationBonePreview=false;animationFreezeLease=null;animationPhysicsGeneration.value++;animationPhysicsRuntime.configure({setupBones:[],setupConstraints:[],clip:null,fps:30,simulate:false});animationPhysicsError.value='';},{flush:'sync'});
  watch(simulationIntent,()=>{if(editorMode.value!=='animate')return;animationPhysicsKey='';animationPhysicsGeneration.value++;releasePose();publishAnimationPose();},{flush:'sync'});
  const currentEventKey=computed(()=>{
    if(editorMode.value!=='animate'||selectedEventId.value===null)return null;
    return animation.activeAnimation.value?.eventTracks?.find(track=>track.event===selectedEventId.value)?.keys.slice().reverse().find(key=>Math.fround(key.frame)===Math.fround(animation.animationFrame.value))??null;
  });
  function selectEvent(id:number|null){if(traceApplying.value)return;selectionEpoch++;clearObjectSelection();selectedEventId.value=project.value?.events?.some(event=>event.id===id)?id:null;selectedId.value=null;selectedIds.value=[];selectedSlotId.value=null;selectedVertex.value=null;librarySelection.value=null;inspectorError.value='';}
  async function createEvent(name:string):Promise<boolean>{const result=await editRig({type:'createEvent',name});if(result)selectEvent(project.value?.editedEvent??null);return result;}
  async function patchEventDefinition(id:number,patch:Partial<Omit<EventDefinition,'id'>>):Promise<boolean>{
    if(editorMode.value==='animate'){showNotice('Event definitions belong to Setup.',true);return false;}
    const {name,...fields}=patch;
    if(name!==undefined){if(Object.keys(fields).length){showNotice('Rename an event separately from its defaults.',true);return false;}return editRig({type:'renameEvent',id,name});}
    return editRig({type:'updateEvent',id,...fields as EventPatch});
  }
  function publishAnimationPose(){
    if(editorMode.value!=='animate')return;
    frozenPose.value=null;animationFreezeLease=null;geometryGeneration++;
    try{
      const frame=evaluateAnimationFrame();
      renderedBones.value=frame.rendered;
      retainAppliedAnimationFrame(frame.bones);
      animationPhysicsError.value='';
    }
    catch(error){
      appliedAnimationFrame.value=null;
      animationPhysicsError.value=errorMessage(error);
      const bones=animation.animationBones.value;
      try{renderedBones.value=bones.length?withEvaluatedPose(bones,evaluateScene({bones,constraints:animation.animationConstraints.value,slots:project.value?.slots},null,new PhysicsState(),{type:'none'}).bones):[];}catch{renderedBones.value=bones;}
    }
  }
  async function setEditorMode(mode:'setup'|'animate'){
    if(mode===editorMode.value||busy.value||traceOpen.value||pruneOpen.value||clippingDraft.value||inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value)return;
    if(editFlight&&!(await editFlight))return;
    animation.pauseAnimation();releasePose();cancelParentPick();
    editorMode.value=mode;
    if(mode==='animate'){editMode.value='bones';tool.value='translate';selectBone(selectedId.value??project.value?.bones[0]?.id??null);publishAnimationPose();}
    else resetSimulation();
  }
  function suspendSimulation(reason:string){if(!simulationHolds.value.includes(reason))simulationHolds.value=[...simulationHolds.value,reason];previewAccumulator=0;}
  function resumeSimulation(reason:string){simulationHolds.value=simulationHolds.value.filter(value=>value!==reason);previewAccumulator=0;}
  function setPreviewVisible(visible:boolean){simulationVisible.value=visible;previewAccumulator=0;}
  function publishPreview(){
    if(editorMode.value==='animate'){publishAnimationPose();return;}
    const model=project.value;
    renderedBones.value=model?.bones.length?withEvaluatedPose(model.bones,previewRuntime.frame.bones):[];
    simulationTime.value=previewRuntime.time;
  }
  function resetSimulation(){
    appliedAnimationFrame.value=null;
    previewGeneration++;geometryGeneration++;checkpointEpoch=undefined;simulationError.value='';frozenPose.value=null;simulationHolds.value=simulationHolds.value.filter(reason=>reason!=='geometry'&&reason!=='parent');previewAccumulator=0;simulationReset.value++;
    try{previewRuntime.reset({bones:project.value?.bones??[],constraints:constraints.value,slots:project.value?.slots});publishPreview();}
    catch(error){renderedBones.value=project.value?.bones??[];simulationError.value=errorMessage(error);}
  }
  function runSimulation(){if(editorMode.value==='animate'){if(!busy.value)simulationIntent.value=true;return;}if(traceOpen.value||pruneOpen.value||clippingDraft.value||meshOutlineDraft.value||busy.value||simulationError.value)return;releasePose();simulationIntent.value=true;previewAccumulator=0;}
  function pauseSimulation(){simulationIntent.value=false;previewAccumulator=0;}
  function requestCheckpoint():Promise<EvaluationSnapshot|null>{
    if(checkpointFlight)return checkpointFlight;
    if(!project.value||!sceneEditing.value)return Promise.resolve(null);
    const generation=previewGeneration,previousPose=poseFlight;
    let model:ProjectSummary|null=null;
    let retryRevision=false;
    const operation=(async()=>{
      if(previousPose)await previousPose.catch(()=>null);
      if(generation!==previewGeneration||!project.value||!sceneEditing.value)return null;
      model=project.value;
      const time=previewRuntime.time,tick=previewRuntime.tick;
      const snapshot=await api.evaluateProject(model.revision,time,'replay',previewRuntime.motion(),checkpointEpoch);
      if(generation!==previewGeneration||project.value?.documentId!==model.documentId)return null;
      if(snapshot.documentId!==model.documentId||snapshot.revision!==model.revision||Math.abs(snapshot.time-time)>1e-6)throw new Error('Physics checkpoint returned a different pose. Reset the simulation to continue.');
      if(checkpointEpoch!==undefined&&snapshot.poseEpoch<checkpointEpoch)throw new Error('Physics checkpoint returned an older pose. Try again.');
      if(!previewRuntime.acknowledgeCheckpoint(tick))throw new Error('Physics checkpoint no longer matches the preview window. Reset the simulation to continue.');checkpointEpoch=snapshot.poseEpoch;return snapshot;
    })().catch(error=>{if(model&&generation===previewGeneration&&project.value?.documentId===model.documentId){
      const staleRevision=typeof error==='object'&&error!==null&&'code' in error&&error.code==='ProjectChanged'&&project.value.revision!==model.revision;
      if(staleRevision)retryRevision=true;else simulationError.value=errorMessage(error);
    }return null;}).finally(()=>{if(checkpointFlight===operation)checkpointFlight=null;if(retryRevision)queueMicrotask(()=>{if(model&&generation===previewGeneration&&project.value?.documentId===model.documentId&&!poseFlight&&previewRuntime.needsCheckpoint)void requestCheckpoint();});});
    checkpointFlight=operation;return operation;
  }
  function stepSimulation(){
    if(simulationIntent.value||simulationError.value||busy.value||newDialog.value||discardDialog.value||traceOpen.value||clippingDraft.value||simulationHolds.value.length||!project.value?.bones.length)return;
    if(previewRuntime.checkpointBlocked){void requestCheckpoint();return;}
    releasePose();try{previewRuntime.step();publishPreview();simulationStep.value++;if(previewRuntime.needsCheckpoint)void requestCheckpoint();}catch(error){simulationError.value=errorMessage(error);}
  }
  function advanceSimulation(elapsed:number){
    if(!simulationRunning.value||frozenPose.value)return;
    if(!Number.isFinite(elapsed)||elapsed<0)return;
    previewAccumulator+=Math.min(elapsed,.1);
    try{let changed=false;while(previewAccumulator+1e-10>=1/60){if(previewRuntime.checkpointBlocked){previewAccumulator=0;void requestCheckpoint();break;}previewRuntime.step();previewAccumulator-=1/60;changed=true;}if(changed)publishPreview();if(previewRuntime.needsCheckpoint)void requestCheckpoint();}
    catch(error){simulationError.value=errorMessage(error);}
  }
  let rigEditOwnsPose = false;
  function releasePose(){
    geometryGeneration++;
    animationFreezeLease=null;
    animation.releaseAnimationGeometrySnapshot();
    const hadPose=!!frozenPose.value;frozenPose.value=null;resumeSimulation('geometry');
    if(hadPose)try{publishPreview();}catch(error){simulationError.value=errorMessage(error);}
  }
  function releaseViewportPose() {
    // Idle canvas events must leave an in-flight rig edit's pose available.
    if (rigEditOwnsPose || traceOpen.value || pruneOpen.value || clippingDraft.value || meshOutlineDraft.value) return;
    releasePose();
  }
  function previewBonePose(bones:BoneView[]):BoneView[]{
    if(editorMode.value!=='animate')return withEvaluatedPose(bones,previewRuntime.previewBones(bones).bones);
    const {rendered:value}=evaluateAnimationFrame(bones);animationBonePreview=true;
    // draw() can request the same preview again after this publication. Avoid
    // publishing identical matrices back into that render callback loop.
    const same=value.length===renderedBones.value.length&&value.every((bone,index)=>{const before=renderedBones.value[index];return before?.id===bone.id&&(['x','y','a','b','c','d'] as const).every(key=>Object.is(before.evaluatedWorld?.[key],bone.evaluatedWorld?.[key]));});
    if(!same)renderedBones.value=value;
    return value;
  }
  function endBonePreview(){if(editorMode.value==='animate'){if(animationBonePreview){animationBonePreview=false;publishAnimationPose();}return;}if(!previewRuntime.hasDraft)return;try{previewRuntime.clearDraft();publishPreview();}catch(error){simulationError.value=errorMessage(error);}}
  function freezePose():Promise<EvaluationSnapshot|null>{
    const model=project.value;
    if(editorMode.value==='animate'){
      if(!model||animation.animationId.value===null)return Promise.resolve(null);
      animation.pauseAnimation();
      if(animationPhysicsError.value)return Promise.reject(new Error(animationPhysicsError.value));
      const id=animation.animationId.value,frame=animation.animationFrame.value,version=animation.animationDraftVersion.value,generation=++geometryGeneration,mode=usesAnimatedPhysics()?'replay':'none';
      const draft=animation.animationDraft.value?.map(b=>({x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX??1,scaleY:b.scaleY??1,shearX:b.shearX??0,shearY:b.shearY??0}));
      return api.evaluateProject(model.revision,frame/Math.fround(animation.animationFps.value),mode,undefined,undefined,id,draft,{...animation.animationGeometryOverrides(),...(animation.constraintDraft.value.size?{constraintPose:[...animation.constraintDraft.value.values()]}:{})}).then(snapshot=>{
        if(generation!==geometryGeneration||editorMode.value!=='animate'||project.value?.documentId!==model.documentId||project.value.revision!==model.revision||animation.animationId.value!==id||animation.animationFrame.value!==frame||animation.animationDraftVersion.value!==version||(usesAnimatedPhysics()?'replay':'none')!==mode)throw new Error('The animation pose changed. Start the gesture again.');
        if(!snapshot.localBones)throw new Error('The native animation pose is unavailable.');
        animation.setAnimationGeometrySnapshot(snapshot,version);renderedBones.value=withEvaluatedPose(snapshot.localBones,snapshot.bones);frozenPose.value=snapshot;animationFreezeLease={epoch:snapshot.poseEpoch,generation,documentId:model.documentId,revision:model.revision,animationId:id,frame,version,mode};
        retainAppliedAnimationFrame(snapshot.bones,snapshot.poseEpoch);
        return snapshot;
      });
    }
    if(!model||!sceneEditing.value||!constraints.value.length)return Promise.resolve(null);
    suspendSimulation('geometry');
    if(frozenPose.value?.revision===model.revision&&frozenPose.value.documentId===model.documentId)return Promise.resolve(frozenPose.value);
    const currentFlightKey=`${model.documentId}:${model.revision}:${previewGeneration}:${geometryGeneration}`;
    if(poseFlight&&poseFlightKey===currentFlightKey)return poseFlight;
    const token=++geometryGeneration,flightKey=`${model.documentId}:${model.revision}:${previewGeneration}:${token}`;
    const generation=previewGeneration,previousPose=poseFlight,previousCheckpoint=checkpointFlight;poseFlightKey=flightKey;
    const operation=(async()=>{
      if(previousPose)await previousPose.catch(()=>null);
      if(previousCheckpoint)await previousCheckpoint;
      if(generation!==previewGeneration||project.value?.documentId!==model.documentId||project.value.revision!==model.revision)throw new Error('The project changed while preparing the geometry pose. Try again.');
      if(token!==geometryGeneration)throw new Error('Geometry pose preparation was canceled. Start the gesture again.');
      if(simulationError.value)throw new Error(simulationError.value);
      const time=previewRuntime.time,tick=previewRuntime.tick;
      const snapshot=await api.evaluateProject(model.revision,time,'replay',previewRuntime.motion(),checkpointEpoch);
      if(generation!==previewGeneration||project.value?.documentId!==model.documentId||snapshot.documentId!==model.documentId||snapshot.revision!==model.revision||Math.abs(snapshot.time-time)>1e-6)throw new Error('The project changed while preparing the geometry pose. Try again.');
      if(checkpointEpoch!==undefined&&snapshot.poseEpoch<checkpointEpoch)throw new Error('The geometry pose returned an older checkpoint. Try again.');
      if(!previewRuntime.acknowledgeCheckpoint(tick))throw new Error('The geometry pose no longer matches the preview window. Try again.');checkpointEpoch=snapshot.poseEpoch;
      if(token!==geometryGeneration)throw new Error('Geometry pose preparation was canceled. Start the gesture again.');
      if(project.value.revision!==model.revision)throw new Error('The project changed while preparing the geometry pose. Try again.');
      renderedBones.value=withEvaluatedPose(model.bones,snapshot.bones);frozenPose.value=snapshot;return snapshot;
    })().catch(error=>{if(generation===previewGeneration&&token===geometryGeneration)resumeSimulation('geometry');throw error;}).finally(()=>{if(poseFlight===operation)poseFlight=null;});poseFlight=operation;return operation;
  }
  watch(simulationRunning,()=>{previewAccumulator=0;},{flush:'sync'});
  const geometryTypes=new Set(['bindAttachment','updateAttachmentBindings','setAttachmentWeight','paintAttachmentWeights','normalizeAttachmentWeights','autoAttachmentWeights','pruneAttachmentWeights','pasteAttachmentWeights','transformAttachments','setRegionPosition','moveAttachment','createClipping','attachmentEdit','moveClippingVertices','insertClippingVertex','deleteClippingVertex','convertMesh','triangulateMesh','resetMesh','generateMeshVertices','replaceMeshOutline','autoWeights','normalizeWeights','moveMesh','moveVertex','moveVertices','paintWeights','addVertex','deleteVertex','meshEdge','bindMesh','setWeight','meshStroke']);
  let selectionEpoch=0;
  const sceneSelectionHistory=createSceneSelectionHistory();
  let sceneSelectionPreview:{document:string;revision:number|undefined;before:SceneHistorySelection|null}|null=null;
  watch([()=>logicalDocumentKey(project.value),editorMode],()=>{
    sceneSelectionHistory.reset();
    sceneSelectionPreview=null;
  },{flush:'sync'});
  let editFlight: Promise<boolean> | null = null;
  let pendingIntent: Intent | null = null;
  let discardOnCreate = false;
  let resolveUpdatePreparation:((ready:boolean)=>void)|null=null;

  function showNotice(message: string, error = false) { notice.value = message; noticeError.value = error; }
  async function run(operation: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    try { await operation(); }
    catch (error) { showNotice(errorMessage(error), true); }
    finally { busy.value = false; }
  }
  async function initialize() {
    await run(async () => { project.value = await api.getProject(); });
    ready.value = true;
  }
  async function prepareForMcp():Promise<boolean>{
    const focused=document.activeElement;
    if(focused instanceof HTMLInputElement||focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)focused.blur();
    await nextTick();
    if(editFlight&&!(await editFlight))return false;
    if(busy.value||newDialog.value||discardDialog.value||traceOpen.value||pruneOpen.value||clippingDraft.value||meshOutlineDraft.value||parentPicking.value)return false;
    const invalid=inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value;
    if(invalid){showNotice(invalid,true);return false;}
    if(editorMode.value!=='setup'){showNotice(i18n.global.t('mcpSetupFirst'),true);return false;}
    animation.pauseAnimation();return true;
  }
  let mcpRefreshPending=false,mcpRefreshFlight:Promise<void>|null=null;
  function refreshFromMcp():Promise<void>{
    mcpRefreshPending=true;
    if(mcpRefreshFlight)return mcpRefreshFlight;
    const operation=(async()=>{
      while(mcpRefreshPending){
        mcpRefreshPending=false;
        const value=await api.getProject();
        if(value?.documentId!==project.value?.documentId){animation.pauseAnimation();editorMode.value='setup';animation.resetAnimationState();}
        project.value=value;
        selectedIds.value=selectedIds.value.filter(id=>value?.bones.some(bone=>bone.id===id));
        if(selectedId.value!==null&&!value?.bones.some(bone=>bone.id===selectedId.value))selectedId.value=selectedIds.value.at(-1)??null;
      }
    })().catch(error=>{showNotice(errorMessage(error),true);throw error;}).finally(()=>{if(mcpRefreshFlight===operation)mcpRefreshFlight=null;});
    mcpRefreshFlight=operation;return operation;
  }
  function installOpenedProject(opened: ProjectSummary) {
    editorMode.value='setup';
    animation.pauseAnimation();
    simulationIntent.value=true;
    project.value=opened;
    animation.resetAnimationState();
    selectBone(opened.bones[0]?.id??null);
    const lastSlot=opened.slots?.at(-1);
    editMode.value=lastSlot?'images':'bones';
    if(lastSlot)selectSlot(lastSlot.id);
    resetCount.value++;
    showNotice('');
  }
  async function perform(intent: Intent, discardChanges: boolean) {
    if(intent==='update'){
      let allowed=false;
      await run(async()=>{
        if(discardChanges&&project.value){await api.closeProject(true);animation.pauseAnimation();editorMode.value='setup';project.value=null;}
        allowed=!project.value?.dirty;
      });
      const resolve=resolveUpdatePreparation;resolveUpdatePreparation=null;resolve?.(allowed);return;
    }
    if (intent === 'new') { discardOnCreate = discardChanges; newDialog.value = true; return; }
    const repair=intent==='repair-linked-mesh-copy',source=project.value;
    if(repair&&(!source?.inspectionOnly||!source.canRepairLinkedMeshCopy||source.dirty))return;
    await run(async () => {
      if (intent === 'open' || repair) {
        openingProject.value=true;
        try {
          await nextTick();
          const opened = repair ? await api.repairLinkedMeshCopy(source!.revision) : await api.openProject(discardChanges);
          if (opened) {
            installOpenedProject(opened);
            if(repair)showNotice(i18n.global.t('inspectionRepairOpened'));
          }
        } finally { openingProject.value=false; }
      } else if (intent === 'close') {
        await api.closeProject(discardChanges); animation.pauseAnimation();editorMode.value='setup';project.value = null;
      } else if (api.desktop) {
        await api.closeProject(discardChanges);
        await nativeWindow().destroy();
      }
    });
  }
  async function request(intent: Intent) {
    if (traceApplying.value) return;
    if (editFlight && !(await editFlight)) return;
    if (busy.value || newDialog.value || discardDialog.value) return;
    cancelPrune();
    cancelMeshOutline();
    if(clippingDraft.value){showNotice('Finish or cancel the clipping polygon first.',true);return;}
    if (intent!=='repair-linked-mesh-copy'&&project.value?.dirty) { pendingIntent = intent; discardDialog.value = true; }
    else await perform(intent, false);
  }
  async function discardAndContinue() {
    const intent = pendingIntent;
    pendingIntent = null; discardDialog.value = false;
    if (intent) await perform(intent, true);
  }
  function cancelDiscard() { pendingIntent = null; discardDialog.value = false;const resolve=resolveUpdatePreparation;resolveUpdatePreparation=null;resolve?.(false); }
  async function prepareForUpdate():Promise<boolean>{
    const focused=document.activeElement;
    if(focused instanceof HTMLInputElement||focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)focused.blur();
    await nextTick();
    if(editFlight&&!(await editFlight))return false;
    if(busy.value||newDialog.value||discardDialog.value||resolveUpdatePreparation)return false;
    if(clippingDraft.value||traceOpen.value||pruneOpen.value||meshOutlineDraft.value){showNotice('Finish or cancel the current geometry operation before updating.',true);return false;}
    const invalid=inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value;
    if(invalid){showNotice(invalid,true);return false;}
    animation.pauseAnimation();
    if(project.value?.dirty)return new Promise(resolve=>{resolveUpdatePreparation=resolve;pendingIntent='update';discardDialog.value=true;});
    return true;
  }
  async function create(name: string) {
    await run(async () => {
      librarySelection.value=null;
      const created=await api.createProject(name, discardOnCreate);
      editorMode.value='setup';animation.pauseAnimation();simulationIntent.value=true;project.value=created;animation.resetAnimationState();
      selectedId.value = project.value.bones[0]?.id ?? null;selectedIds.value=selectedId.value===null?[]:[selectedId.value];
      selectedSlotId.value = null; selectedVertex.value = null; editMode.value = 'bones';
      newDialog.value = false; resetCount.value++;
    });
  }
  async function copy() {
    return save(true);
  }
  async function exportAuthoredBundle(
    exportBundle:(revision:number)=>Promise<{path:string}|null>,
    successNotice:(path:string)=>string,
  ):Promise<boolean>{
    if(editFlight&&!(await editFlight))return false;
    if(busy.value||!canEdit.value||!sceneEditing.value||!project.value||newDialog.value||discardDialog.value)return false;
    if(clippingDraft.value||traceOpen.value||pruneOpen.value||meshOutlineDraft.value){showNotice('Finish or cancel the current geometry operation before exporting.',true);return false;}
    const invalid=inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value;
    if(invalid){showNotice(invalid,true);return false;}
    animation.pauseAnimation();
    let exported=false;
    await run(async()=>{
      const result=await exportBundle(project.value!.revision);
      if(result){exported=true;showNotice(successNotice(result.path));}
    });
    return exported;
  }
  function exportRuntime():Promise<boolean>{
    return exportAuthoredBundle(api.exportRuntime,path=>`Runtime bundle exported to ${path}. Only Setup and saved keys are exported.`);
  }
  function exportSpineBundle():Promise<boolean>{
    return exportAuthoredBundle(api.exportSpineBundle,path=>i18n.global.t('exportSpineBundleSuccess',{path}));
  }
  function exportGif(options: GifExportOptions): Promise<boolean> {
    return exportAuthoredBundle(async revision => {
      const model = project.value!;
      const clip = model.animations?.find(item => item.id === options.animationId);
      if (!clip) throw new Error('Choose an animation to export.');
      const {timesSeconds, delayCentiseconds} = planGifFrames(options, model.animationFps ?? 30, clip.duration);
      const [{GifEncoder}, {renderGifFrames}] = await Promise.all([
        import('../domain/gifEncoder.ts'), import('../viewport/gifFrames.ts'),
      ]);
      const chunks: Uint8Array[] = [];
      let size = 0;
      let encoder: InstanceType<typeof GifEncoder> | undefined;
      const append = (chunk: Uint8Array) => {
        size += chunk.length;
        if (size > maxGifBytes) throw new Error('The GIF exceeds 16 MiB. Choose a shorter range.');
        chunks.push(chunk);
      };
      await renderGifFrames(model, clip.id, {timesSeconds}, async ({width, height, rgba, index}) => {
        if (!encoder) {
          encoder = new GifEncoder({width, height, repeat: options.repeat ? 0 : null});
          append(encoder.header);
        }
        append(encoder.addFrame(rgba, delayCentiseconds[index]!));
      });
      if (!encoder) throw new Error('The animation has no frames to export.');
      append(encoder.finish());
      return api.saveGifExport(revision, model.documentId, gifBase64(chunks), clip.name);
    }, path => i18n.global.t('gifExportSuccess', {path}));
  }
  async function save(as = false): Promise<boolean> {
    if(pruneOpen.value)return false;
    if(meshOutlineDraft.value){showNotice(i18n.global.t('meshOutlineFinishFirst'),true);return false;}
    if(clippingDraft.value){showNotice('Finish or cancel the clipping polygon before saving.',true);return false;}
    if(traceOpen.value){showNotice('Apply or cancel Trace before saving.',true);return false;}
    if (editFlight && !(await editFlight)) return false;
    if (inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value) { showNotice(inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value, true); return false; }
    if (busy.value || !(as ? project.value?.canCopy : project.value?.canSave)) return false;
    const before=project.value;
    const publishAnimationSave=animation.prepareAnimationSave();
    let saved = false;
    await run(async () => {
      const result = await api.saveProject(as);
      if (result&&publishAnimationSave(()=>{project.value=result;})) {
        animation.retainAnimationOffsetAfterSave(before,result);
        saved = true;
        showNotice(result.inspectionOnly ? 'Project copy saved.' : 'Project saved.');
      }
    });
    return saved;
  }
  async function saveAndContinue() {
    if (!(await save())) return;
    const intent = pendingIntent;
    pendingIntent = null; discardDialog.value = false;
    if (intent) await perform(intent, false);
  }
  async function editRig(edit: RigEdit, expectedRevision?: number,poseEpoch?:number, options?:{keepWorkingPose?:boolean;attachmentField?:boolean}): Promise<boolean> {
    const expectedDocument=project.value?.documentId;
    const numericBone=edit.type==='update';
    const numericDeform=edit.type==='moveVertices'||edit.type==='moveClippingVertices';
    const numericContext=sceneEditing.value&&editorMode.value==='animate'&&(numericBone||numericDeform)&&poseEpoch===undefined
      ? {animation:animation.animationId.value,frame:animation.animationFrame.value,revision:expectedRevision??project.value?.revision,
        epoch:animation.animationDraftEpoch.value,version:animation.animationDraftVersion.value,autoKey:animation.animationAutoKey.value,
        attachment:selectedAttachmentId.value,vertex:selectedVertex.value}
      : null;
    const numericBoneContext=numericBone?numericContext:null;
    if (editFlight) await editFlight;
    if(project.value?.documentId!==expectedDocument)return false;
    if (busy.value || !canEdit.value || !project.value) return false;
    if(options?.attachmentField&&edit.type==='updateAttachment'&&
      (project.value.revision!==expectedRevision||selectedRegionTransform.value?.attachment.id!==edit.id))return false;
    if(numericContext&&(editorMode.value!=='animate'||project.value.revision!==numericContext.revision||
        animation.animationId.value!==numericContext.animation||animation.animationFrame.value!==numericContext.frame||
        animation.animationDraftEpoch.value!==numericContext.epoch||animation.animationDraftVersion.value!==numericContext.version||
        animation.animationAutoKey.value!==numericContext.autoKey||
        numericDeform&&(selectedAttachmentId.value!==numericContext.attachment||selectedVertex.value!==numericContext.vertex))){
      showNotice('The animation pose changed. Edit the field again.',true);return false;
    }
    if(pruneOpen.value&&edit.type!=='pruneAttachmentWeights')return false;
    const outline=meshOutlineDraft.value;
    if(outline&&(edit.type!=='replaceMeshOutline'||edit.id!==outline.attachmentId||expectedRevision!==outline.revision||meshOutlineBusy.value||meshOutlinePointGesture.value)){
      showNotice(i18n.global.t('meshOutlineFinishFirst'),true);return false;
    }
    if(attachmentColorError.value&&edit.type==='setAttachmentColor'){showNotice(attachmentColorError.value,true);return false;}
    if(sequenceFieldError.value&&(edit.type==='setAnimationSequenceKeys'||edit.type==='setAttachmentSequence')){showNotice(sequenceFieldError.value,true);return false;}
    if (newDialog.value || discardDialog.value) return false;
    const deformKeys=edit.type==='setAnimationDeformKeys'?edit.keys:edit.type==='setAnimationKeyBatch'?edit.deformKeys:undefined;
    if((edit.type==='setAnimationDeformVertices'&&animation.inheritedDeformSource(edit.attachment)!==undefined)||
      deformKeys?.some(key=>animation.inheritedDeformSource(key.attachment)!==undefined)){
      showNotice(i18n.global.t('linkedMeshDeformReadOnly'),true);return false;
    }
    if(editorMode.value==='animate'&&poseEpoch!==undefined&&!validAnimationLease(poseEpoch)){showNotice('The animation pose changed. Start the gesture again.',true);return false;}
    if(clippingDraft.value&&edit.type!=='createClipping'){showNotice('Finish or cancel the clipping polygon first.',true);return false;}
    if (edit.type === 'undo' && !project.value.canUndo) return false;
    if (edit.type === 'redo' && !project.value.canRedo) return false;
    if(edit.type==='storeAnimationKeys'||edit.type==='clearStoredAnimationKeys'||edit.type==='swapStoredAnimationKeys'){
      if(editorMode.value!=='animate'||edit.animation!==animation.animationId.value)return false;
      const invalid=inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value;
      if(edit.type==='swapStoredAnimationKeys'&&invalid){showNotice(invalid,true);return false;}
    }
    let boneAutoKey:BoneAutoKey|undefined;
    let keyDeformFromCurrent=false;
    if(editorMode.value==='animate'){
      if(edit.type!=='storeAnimationKeys'&&edit.type!=='clearStoredAnimationKeys')animation.pauseAnimation();
      if(['move','transformBones','update'].includes(edit.type)){
        // A viewport gesture publishes its transient preview into renderedBones.
        // Its edit still describes a delta from the frozen pointerdown sample;
        // applying it to that preview would move/rotate/scale the bones twice.
        const snapshot=poseEpoch===undefined?null:frozenPose.value;
        const baseline=snapshot?.localBones
          ?withEvaluatedPose(snapshot.localBones,snapshot.bones)
          :numericBoneContext?animation.animationBones.value:renderedBones.value;
        const intent=sceneEditing.value&&snapshot?.localBones
          ? {source:'viewportPose' as const,frame:Math.fround(snapshot.time*Math.fround(animation.animationFps.value))}
          :numericBoneContext?{source:'numericField' as const,frame:Math.fround(numericBoneContext.frame)}:undefined;
        try{
          const plan=animation.boneAnimationEditPlan(edit,baseline,intent);
          if(!plan)return true;
          edit=plan.edit;boneAutoKey=plan.boneAutoKey;
        }
        catch(error){showNotice(errorMessage(error),true);return false;}
      }else if(edit.type==='setActiveAttachment'||edit.type==='setSlotColor'||edit.type==='setSlotDarkColor'){
        try{const keyed=animation.slotAnimationEdit(edit);if(!keyed)return true;edit=keyed;}
        catch(error){showNotice(errorMessage(error),true);return false;}
      }else if(edit.type==='moveVertex'||edit.type==='moveVertices'||edit.type==='moveMesh'||edit.type==='moveClippingVertices'||edit.type==='transformAttachments'||edit.type==='attachmentEdit'){
        try{
          const keyed=animation.deformAnimationEdit(edit,renderedBones.value);
          if(!keyed)return true;
          keyDeformFromCurrent=keyed.type==='setAnimationDeformVertices';
          edit=keyed;
        }
        catch(error){showNotice(errorMessage(error),true);return false;}
      }else if(!['createAnimation','renameAnimation','deleteAnimation','duplicateAnimation','storeAnimationKeys','clearStoredAnimationKeys','swapStoredAnimationKeys','setAnimationFps','setAnimationKey','setAnimationKeys','setAnimationSlotKeys','setAnimationKeyBatch','setAnimationDrawOrderKeys','setAnimationDeformKeys','setAnimationDeformVertices','setAnimationConstraintKeys','setAnimationEventKeys','setAnimationSequenceKeys','createEvent','renameEvent','updateEvent','deleteEvent','moveAnimationKeys','scaleAnimationKeys','offsetAnimationKeys','deleteAnimationKeys','undo','redo'].includes(edit.type)){
        showNotice('Switch to Setup to change the skeleton structure.',true);return false;
      }
    }
    let succeeded = false;
    const selectionAtStart=selectionEpoch,originalType=edit.type,weightKeyAtStart=weightSelectionKey.value;
    const scopedMeshEdits=new Set(['convertMesh','triangulateMesh','resetMesh','autoWeights','normalizeWeights','moveMesh','moveVertex','moveVertices','paintWeights','addVertex','deleteVertex','meshEdge','bindMesh','setWeight','meshStroke']);
    if(sceneEditing.value&&selectedAttachmentId.value!==null&&scopedMeshEdits.has(edit.type))edit={type:'attachmentEdit',id:selectedAttachmentId.value,edit};
    const publishAnimationEdit=animation.prepareAnimationDraftCommit(edit,options?.keepWorkingPose);
    const needsEvaluatedPose=geometryTypes.has(edit.type)||edit.type==='matchTransform'||edit.type==='setAnimationDeformVertices'||((edit.type==='setAnimationKeys'||edit.type==='setAnimationKey')&&poseEpoch!==undefined);
    const needsPoseSnapshot = needsEvaluatedPose && poseEpoch === undefined &&
      (constraints.value.length > 0 || edit.type === 'setAnimationDeformVertices');
    rigEditOwnsPose = needsPoseSnapshot || (needsEvaluatedPose && poseEpoch !== undefined);
    editing.value = true;
    const operation = run(async () => {
      if(edit.type==='create'&&autoColor.value){const parent=edit.parent;edit={...edit,color:childColor(project.value!.bones.find(b=>b.id===parent))};}
      if(edit.type==='setBoneColor')autoColor.value=false;
      const snapshot = needsPoseSnapshot ? await freezePose() : null;
      const editEpoch=needsEvaluatedPose?poseEpoch??snapshot?.poseEpoch:undefined;
      if(editorMode.value==='animate'&&editEpoch!==undefined&&!validAnimationLease(editEpoch))throw new Error('The animation pose changed. Start the gesture again.');
      let request=edit;
      if(keyDeformFromCurrent&&request.type==='setAnimationDeformVertices'){
        const ownedPose=snapshot??frozenPose.value;
        if(editEpoch===undefined||!ownedPose||ownedPose.poseEpoch!==editEpoch||ownedPose.animationId!==request.animation)
          throw new Error('The animation pose changed. Start the gesture again.');
        // Use the same seconds-to-frame conversion as native lease validation.
        request={...request,frame:Math.fround(ownedPose.time*Math.fround(animation.animationFps.value))};
      }
      const beforeHistory = originalType === 'undo' || originalType === 'redo' ? project.value : null;
      const result = await api.editRig(request, expectedRevision ?? project.value!.revision,editEpoch,boneAutoKey);
      if(!publishAnimationEdit(()=>{project.value=result;}))return;
      if(originalType==='renameBones'){
        succeeded=true;
        return;
      }
      const changedWeightDomains = beforeHistory && invalidateHistoryWeightVertices(beforeHistory, result);
      if(['convertMesh','resetMesh','replaceMeshOutline','addVertex','deleteVertex','meshStroke','insertClippingVertex','deleteClippingVertex'].includes(originalType)||
        request.type==='attachmentEdit'&&request.edit.type==='resetMesh')invalidateWeightVertices(weightKeyAtStart);
      if(selectionAtStart===selectionEpoch){
        const preserveAnimationSelection=editorMode.value==='animate'&&['undo','redo'].includes(originalType);
        const focusHistory=!preserveAnimationSelection&&['undo','redo'].includes(originalType),focusCreation=['create','createSlot','createClipping','addConstraint','addPhysicsToBones'].includes(originalType);
        const sameSlot = selectedSlotId.value === result.editedSlot;
        if(originalType==='createLinkedMesh'&&result.editedAttachment!=null){
          selectAttachment(result.editedAttachment);
        }else if(!sceneEditing.value||focusHistory&&selectedConstraintIds.value.length<2||focusCreation){
          selectedSlotId.value=result.editedSlot??null;
          if(sceneEditing.value){
            selectedAttachmentId.value=result.editedAttachment??null;
            selectedAttachmentIds.value=selectedAttachmentId.value===null?[]:[selectedAttachmentId.value];
            selectedSlotIds.value=selectedSlotId.value===null?[]:[selectedSlotId.value];
            clearConstraintSelection();
          }
        }
        // Weight edits never change vertex inventory. Keep the current Direct
        // selection independent from native history focus, which may be stale
        // even within this attachment when an operation is a genuine no-op.
        const weightEdit=['bindAttachment','updateAttachmentBindings','setAttachmentWeight','paintAttachmentWeights','autoAttachmentWeights','normalizeAttachmentWeights','smoothAttachmentWeights','swapAttachmentWeights','pruneAttachmentWeights','pasteAttachmentWeights'].includes(originalType);
        const weightTarget = sceneEditing.value ? selectedAttachmentId.value : selectedSlotId.value;
        if (weightTarget !== null && changedWeightDomains?.has(weightTargetKey(result, weightTarget))) {
          selectedVertex.value = null;
        } else if(editorMode.value==='animate'){
          // Keep the Animate pick local to the viewport instead of importing a stale Setup focus.
          if(selectedVertex.value!==null&&!selectedBinding.value?.vertices[selectedVertex.value])selectedVertex.value=null;
        }else if(!weightEdit&&originalType!=='setAttachmentImagePath'&&originalType!=='generateMeshVertices')selectedVertex.value=result.editedVertex??(sameSlot&&['moveVertices','paintWeights','bindMesh','autoWeights','normalizeWeights','triangulateMesh'].includes(originalType)?selectedVertex.value:null);
        if(preserveAnimationSelection){
          selectedIds.value=selectedIds.value.filter(id=>result.bones.some(b=>b.id===id));
          if(selectedId.value!==null&&!result.bones.some(b=>b.id===selectedId.value))selectedId.value=selectedIds.value.at(-1)??null;
        }else{
          if (['create', 'delete', 'undo', 'redo'].includes(originalType) || !result.bones.some(b => b.id === selectedId.value)) selectedId.value = result.editedBone;
          selectedIds.value=selectedIds.value.filter(id=>result.bones.some(b=>b.id===id));
          if(['create','undo','redo'].includes(originalType))selectedIds.value=selectedId.value===null?[]:[selectedId.value];
        }
        if(originalType==='addConstraint'||originalType==='addPhysicsToBones'){const id=result.constraints?.at(-1)?.id??null;selectConstraint(id);}
      }else{
        selectedIds.value=selectedIds.value.filter(id=>result.bones.some(b=>b.id===id));
        if(!result.bones.some(b=>b.id===selectedId.value))selectedId.value=selectedIds.value.at(-1)??null;
        if(!result.slots?.some(s=>s.id===selectedSlotId.value)){selectedSlotId.value=null;selectedVertex.value=null;}
        else if (changedWeightDomains) {
          const weightTarget = sceneEditing.value ? selectedAttachmentId.value : selectedSlotId.value;
          if (weightTarget !== null && changedWeightDomains.has(weightTargetKey(result, weightTarget))) selectedVertex.value = null;
        }
      }
      succeeded = true;
    }).then(() => succeeded);
    editFlight = operation;
    try { return await operation; }
    finally {
      if (editFlight === operation) {
        editFlight = null;
        rigEditOwnsPose = false;
        editing.value = false;
        if (!traceOpen.value && !pruneOpen.value && !clippingDraft.value && !meshOutlineDraft.value) releasePose();
      }
    }
  }
  async function addBone() {
    if (editFlight) await editFlight;
    const parent = selectedBone.value ?? project.value?.bones[0];
    if (parent) await editRig({ type: 'create', parent: parent.id, x: parent.length, y: 0, rotation: 0, length: 12 });
  }
  async function removeBone() {
    if (editFlight) await editFlight;
    if (selectedBone.value?.parent !== null && selectedBone.value) await editRig({ type: 'delete', id: selectedBone.value.id });
  }
  function clearObjectSelection(){selectedAttachmentId.value=null;selectedAttachmentIds.value=[];selectedSlotIds.value=[];clearConstraintSelection();selectedEventId.value=null;}
  function selectBone(id: number | null) { if(traceApplying.value)return;selectionEpoch++;clearObjectSelection(); librarySelection.value=null; selectedIds.value=id===null?[]:[id]; selectedId.value = id; selectedSlotId.value = null; selectedVertex.value = null; inspectorError.value = ''; }
  function applySlotSelection(ids:number[],active:number|null,clearVertex:boolean){
    selectionEpoch++;librarySelection.value=null;selectedAttachmentId.value=null;selectedAttachmentIds.value=[];clearConstraintSelection();selectedEventId.value=null;
    if(clearVertex)selectedVertex.value=null;
    selectedSlotIds.value=ids.filter(id=>slots.value.some(s=>s.id===id));
    selectedSlotId.value=active!==null&&selectedSlotIds.value.includes(active)?active:selectedSlotIds.value.at(-1)??null;
    inspectorError.value='';
  }
  function selectSlot(id: number | null,modifiers:{toggle?:boolean;shift?:boolean;ordered?:number[]}={}) {
    if(traceApplying.value)return;
    let ids=id===null?[]:[id];
    if(id!==null&&modifiers.shift&&modifiers.ordered&&selectedSlotId.value!==null){const a=modifiers.ordered.indexOf(selectedSlotId.value),b=modifiers.ordered.indexOf(id);if(a>=0&&b>=0)ids=modifiers.ordered.slice(Math.min(a,b),Math.max(a,b)+1);}
    else if(id!==null&&modifiers.toggle)ids=selectedSlotIds.value.includes(id)?selectedSlotIds.value.filter(v=>v!==id):[...selectedSlotIds.value,id];
    applySlotSelection(ids,id,id!==selectedSlotId.value);
  }
  function selectSceneAttachments(ids:number[],active:number|null){
    if(traceApplying.value)return;
    selectionEpoch++;librarySelection.value=null;clearConstraintSelection();selectedEventId.value=null;
    const valid=new Set(sceneAttachments.value.map(a=>a.id));selectedAttachmentIds.value=[...new Set(ids)].filter(id=>valid.has(id));
    selectedAttachmentId.value=active!==null&&selectedAttachmentIds.value.includes(active)?active:selectedAttachmentIds.value.at(-1)??null;
    selectedSlotIds.value=[...new Set(sceneAttachments.value.filter(a=>selectedAttachmentIds.value.includes(a.id)).map(a=>a.slot))];
    selectedSlotId.value=sceneAttachments.value.find(a=>a.id===selectedAttachmentId.value)?.slot??null;selectedVertex.value=null;inspectorError.value='';
    if(hasSelectedPath.value&&editMode.value!=='bones'&&editMode.value!=='images'){
      editMode.value=editorMode.value==='setup'?'images':'bones';
      tool.value='translate';
    }
  }
  function selectAttachment(id:number,modifiers:{toggle?:boolean;shift?:boolean;ordered?:number[]}={}){
    let ids=[id];
    if(modifiers.shift&&modifiers.ordered&&selectedAttachmentId.value!==null){const a=modifiers.ordered.indexOf(selectedAttachmentId.value),b=modifiers.ordered.indexOf(id);if(a>=0&&b>=0)ids=modifiers.ordered.slice(Math.min(a,b),Math.max(a,b)+1);}
    else if(modifiers.toggle)ids=selectedAttachmentIds.value.includes(id)?selectedAttachmentIds.value.filter(v=>v!==id):[...selectedAttachmentIds.value,id];
    selectSceneAttachments(ids,ids.includes(id)?id:ids.at(-1)??null);
  }
  function clearConstraintSelection(){selectedConstraintId.value=null;selectedConstraintIds.value=[];constraintSelectionAnchor.value=null;}
  function applyConstraintSelection(ids:number[],active:number|null,anchor:number|null){
    selectionEpoch++;clearObjectSelection();selectedConstraintIds.value=ids;selectedConstraintId.value=active;constraintSelectionAnchor.value=anchor;
    selectedSlotId.value=null;librarySelection.value=null;selectedVertex.value=null;inspectorError.value='';
  }
  function selectConstraint(id:number|null,modifiers:{toggle?:boolean;shift?:boolean;ordered?:number[]}={}){
    if(traceApplying.value)return;
    const valid=new Set(constraints.value.map(c=>c.id)),current=selectedConstraintIds.value.filter(id=>valid.has(id)),active=selectedConstraintId.value,anchor=constraintSelectionAnchor.value;
    let ids:number[]=[],nextAnchor=anchor;
    if(id!==null&&valid.has(id)){
      const ordered=[...new Set(modifiers.ordered??[...valid])].filter(value=>valid.has(value));
      if(modifiers.shift&&anchor!==null&&ordered.includes(anchor)&&ordered.includes(id)){
        const a=ordered.indexOf(anchor),b=ordered.indexOf(id),range=ordered.slice(Math.min(a,b),Math.max(a,b)+1);ids=modifiers.toggle?[...new Set([...current,...range])]:range;
      }else{ids=modifiers.toggle?(current.includes(id)?current.filter(value=>value!==id):[...current,id]):[id];nextAnchor=id;}
    }
    applyConstraintSelection(ids,id!==null&&ids.includes(id)?id:active!==null&&ids.includes(active)?active:ids.at(-1)??null,ids.length?nextAnchor:null);
  }
  function selectBones(ids:number[],active:number|null){
    if(traceApplying.value)return;
    selectionEpoch++;
    clearObjectSelection();
    librarySelection.value=null;
    selectedIds.value=[...new Set(ids)].filter(id=>project.value?.bones.some(b=>b.id===id));selectedId.value=active!==null&&selectedIds.value.includes(active)?active:selectedIds.value.at(-1)??null;selectedSlotId.value=null;selectedVertex.value=null;inspectorError.value='';
  }
  function sceneSelectionHistoryAvailable(){
    return editorMode.value==='setup'&&sceneEditing.value&&canEdit.value&&
      (editMode.value==='bones'||editMode.value==='images')&&!busy.value&&!editing.value&&!openingProject.value&&
      !newDialog.value&&!discardDialog.value&&!traceOpen.value&&!traceApplying.value&&!pruneOpen.value&&
      !clippingDraft.value&&!meshOutlineDraft.value&&!parentPicking.value&&
      simulationHolds.value.every(reason=>reason==='geometry');
  }
  function currentSceneSelection():SceneHistorySelection|null{
    const mode=editMode.value;
    if((mode!=='bones'&&mode!=='images')||librarySelection.value!==null||selectedEventId.value!==null)return null;
    if(selectedConstraintId.value!==null)return {kind:'constraint',mode,ids:[...selectedConstraintIds.value],active:selectedConstraintId.value,anchor:constraintSelectionAnchor.value};
    if(selectedAttachmentId.value!==null)return {kind:'attachment',mode,ids:[...selectedAttachmentIds.value],active:selectedAttachmentId.value};
    if(selectedSlotId.value!==null)return {kind:'slot',mode,ids:[...selectedSlotIds.value],active:selectedSlotId.value};
    // Images selection keeps a bone ID as a fallback for the next bone tool.
    if(mode==='bones'&&selectedId.value!==null)return {kind:'bone',mode,ids:[...selectedIds.value],active:selectedId.value};
    return {kind:'none',mode};
  }
  function liveSceneSelection(entry:SceneHistorySelection):boolean{
    const model=project.value;
    if(!model)return false;
    if(entry.kind==='none')return true;
    if(!entry.ids.includes(entry.active))return false;
    const targets=entry.kind==='bone'?model.bones:entry.kind==='slot'?model.slots:
      entry.kind==='constraint'?constraints.value:model.slots.flatMap(slot=>slot.attachments??[]);
    const live=new Set(targets.map(target=>target.id));
    return entry.ids.every(id=>live.has(id));
  }
  function withSceneSelectionHistory(action:()=>void,phase?:'preview'|'complete'){
    const document=logicalDocumentKey(project.value);
    const revision=project.value?.revision;
    const available=sceneSelectionHistoryAvailable();
    const current=available?currentSceneSelection():null;
    const preview=sceneSelectionPreview?.document===document&&sceneSelectionPreview.revision===revision?sceneSelectionPreview:null;
    const before=phase==='complete'&&preview?preview.before:current;
    sceneSelectionPreview=phase==='preview'&&available?{document,revision,before}:null;
    action();
    if(phase==='preview'||!available||document!==logicalDocumentKey(project.value)||revision!==project.value?.revision||
      !sceneSelectionHistoryAvailable())return;
    const after=currentSceneSelection();
    // An abandoned marquee may have cleared the display on press, without making a selection.
    const comparableBefore=phase===undefined&&preview&&before?.kind==='none'?preview.before:before;
    if(after&&liveSceneSelection(after))sceneSelectionHistory.record(comparableBefore&&liveSceneSelection(comparableBefore)?comparableBefore:null,after);
  }
  function visitSceneSelectionHistory(direction:-1|1):boolean{
    if(!sceneSelectionHistoryAvailable()||simulationHolds.value.length||frozenPose.value||poseFlight||previewRuntime.hasDraft||
      inspectorError.value||librarySelection.value!==null||selectedEventId.value!==null)return false;
    sceneSelectionPreview=null;
    const entry=sceneSelectionHistory.visit(direction,currentSceneSelection(),liveSceneSelection);
    if(!entry)return false;
    // setMode also changes tool and can choose an object implicitly.
    editMode.value=entry.mode;
    switch(entry.kind){
      case 'none':selectBones([],null);break;
      case 'bone':selectBones([...entry.ids],entry.active);break;
      case 'slot':applySlotSelection([...entry.ids],entry.active,true);break;
      case 'attachment':selectSceneAttachments([...entry.ids],entry.active);break;
      case 'constraint':applyConstraintSelection([...entry.ids],entry.active,entry.anchor??null);break;
    }
    return true;
  }
  function escapeSelection(){if(traceApplying.value)return;if(parentPicking.value){cancelParentPick();return;}if(clippingDraft.value){cancelClipping();return;}if(editMode.value==='weights'&&selectedBinding.value){clearWeightVertices();clearBoneHover();return;}if(editMode.value==='clipping')editMode.value='images';clearBoneHover();selectBones([],null);selectSlot(null);selectedVertex.value=null;tool.value='translate';meshTool.value='move';}
  async function applyAutoColors(){if(autoColor.value&&project.value)await editRig({type:'setBoneColors',colors:automaticColors(project.value.bones)});}
  async function createSlot(name?:string){const bone=selectedBone.value?.id??project.value?.bones[0]?.id;if(sceneEditing.value&&bone!==undefined)return editRig({type:'createSlot',bone,...(name?{name}:{})});return false;}
  async function toggleAttachment(slot:number,id:number){
    const model=sceneSlots.value.find(s=>s.id===slot);if(!model?.attachments.some(a=>a.id===id))return false;
    if(sceneEditing.value)return editRig({type:'setActiveAttachment',slot,attachment:model.activeAttachmentId===id?null:id});
    const r=model.region;return editRig({type:'updateSlot',id:model.id,name:model.name,bone:model.bone,visible:!model.visible,x:r?.x??0,y:r?.y??0,rotation:r?.rotation??0,scaleX:r?.scaleX??1,scaleY:r?.scaleY??1});
  }
  async function renameAttachment(name:string,revision?:number){const a=selectedAttachment.value;return sceneEditing.value&&a?editRig({type:'renameAttachment',id:a.id,name},revision):false;}
  async function setAttachmentImagePath(path:string,revision?:number){const a=selectedAttachment.value;return sceneEditing.value&&a?.region?editRig({type:'setAttachmentImagePath',id:a.id,path},revision):false;}
  async function removeAttachment(){const a=selectedAttachment.value;return sceneEditing.value&&a?editRig({type:'deleteAttachment',id:a.id}):false;}
  async function moveAttachment(id:number,slot:number,revision?:number){return sceneEditing.value?editRig({type:'moveAttachment',id,slot},revision):false;}
  async function editAttachmentTransform(patch:Partial<Pick<RegionView,'x'|'y'|'rotation'|'scaleX'|'scaleY'>>,
    revision=project.value?.revision,attachmentId=selectedAttachmentId.value){
    const target=selectedRegionTransform.value;
    if(!target||target.attachment.id!==attachmentId||revision!==project.value?.revision||
      !Object.values(patch).some(value=>value!==undefined))return false;
    if(sceneEditing.value)return editRig({type:'updateAttachment',id:target.attachment.id,...patch},revision,undefined,{attachmentField:true});
    const s=selectedSlotRaw.value,r=target.region;
    return s?editRig({type:'updateSlot',id:s.id,name:s.name,bone:s.bone,visible:s.visible,
      x:patch.x??r.x,y:patch.y??r.y,rotation:patch.rotation??r.rotation,scaleX:patch.scaleX??r.scaleX,scaleY:patch.scaleY??r.scaleY},revision):false;
  }
  async function createConstraint(constraint:ConstraintInput){return sceneEditing.value?editRig({type:'addConstraint',constraint}):false;}
  async function addPhysicsToSelectedBones(){
    const documentId=project.value?.documentId,selection=selectionEpoch,bones=[...physicsBoneIds.value];
    if(editFlight&&!(await editFlight))return false;
    if(documentId!==project.value?.documentId||selection!==selectionEpoch||!canAddPhysics.value||!bones.length)return false;
    return editRig({type:'addPhysicsToBones',bones});
  }
  async function editConstraintById(id:number,patch:Partial<ConstraintInput>,revision?:number){
    const c=constraints.value.find(value=>value.id===id);if(!sceneEditing.value||!c||c.type==='path')return false;
    const{id:_id,order:_order,...fields}={...c,...patch};
    // Range bits are view-only. Native retains the authoritative editor values,
    // including absent cells and -0, while ordinary runtime fields are edited.
    const{editorRangeBits:_ranges,editorRangeValues:_resolved,...input}=fields as typeof fields & {editorRangeBits?:readonly(number|null)[];editorRangeValues?:readonly number[]|null};
    const constraint=input as ConstraintInput;
    return editRig({type:'updateConstraint',id:c.id,constraint},revision);
  }
  async function editSelectedConstraintField(field:string,value:number|boolean,expectedRevision?:number,frozenIds:readonly number[]=[...selectedConstraintIds.value]):Promise<boolean>{
    const model=project.value,ids=[...frozenIds];
    if(!model||!sceneEditing.value||!canEdit.value||!ids.length||new Set(ids).size!==ids.length)return false;
    const selected=ids.map(id=>constraints.value.find(c=>c.id===id));
    if(selected.some(c=>!c||c.type==='path')||!selected[0]||selected.some(c=>c!.type!==selected[0]!.type))return false;
    const wireField=batchField(selected[0].type,field,value);if(!wireField)return false;
    if(expectedRevision!==undefined&&expectedRevision!==model.revision){showNotice('The project changed. Start the constraint edit again.',true);return false;}
    if(editorMode.value==='animate')return animation.setConstraintAnimationFieldBatch(ids,field,value,expectedRevision);
    if(selected.every(c=>sameBatchValue(batchFieldValue(c!,field),value)))return true;
    return editRig({type:'patchConstraints',ids,field:wireField,value:typeof value==='number'&&Object.is(value,-0)?{bits:0x80000000}:value},expectedRevision??model.revision);
  }
  async function editConstraint(patch:Partial<ConstraintInput>,revision?:number){return selectedConstraintId.value===null?false:editConstraintById(selectedConstraintId.value,patch,revision);}
  async function editTransformRange(id:number,index:number,bits:number|null,revision?:number):Promise<boolean>{
    if(!sceneEditing.value||!constraints.value.some(c=>c.id===id&&c.type==='transform'))return false;
    return editRig({type:'setTransformRange',id,index,bits},revision);
  }
  async function matchTransform(id:number,section:'offsets'|'properties'):Promise<boolean>{
    const expectedDocument=project.value?.documentId;
    const focused=document.activeElement;
    if(focused instanceof HTMLInputElement||focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)focused.blur();
    await nextTick();
    if(editFlight&&!(await editFlight))return false;
    if(inspectorError.value){showNotice(inspectorError.value,true);return false;}
    const model=project.value;
    if(!sceneEditing.value||!model||model.documentId!==expectedDocument)return false;
    const constraint=model.constraints?.find(c=>c.id===id);
    if(constraint?.type!=='transform')return false;
    if(!canMatchTransform(constraint)){showNotice(i18n.global.t('matchTransformMixUnsupported'),true);return false;}
    return editRig({type:'matchTransform',id,section},model.revision);
  }
  async function removeConstraintById(id:number,revision?:number){return sceneEditing.value&&constraints.value.some(c=>c.id===id&&c.type!=='path')?editRig({type:'deleteConstraint',id},revision):false;}
  async function removeConstraint(){return selectedConstraintId.value===null?false:removeConstraintById(selectedConstraintId.value);}
  async function reorderConstraint(id:number,index:number){return sceneEditing.value&&constraints.value.find(c=>c.id===id)?.type!=='path'?editRig({type:'reorderConstraint',id,index}):false;}
  async function createClipping(input:Omit<Extract<RigEdit,{type:'createClipping'}>,'type'>){return sceneEditing.value?editRig({type:'createClipping',...input}):false;}
  async function editClipping(patch:Partial<Pick<ClippingView,'endSlot'|'convex'|'inverse'|'color'>>,revision?:number){const a=selectedAttachment.value,c=a?.clipping;return sceneEditing.value&&a&&c?editRig({type:'setClipping',id:a.id,endSlot:c.endSlot,convex:c.convex,inverse:c.inverse,color:c.color,...patch},revision):false;}
  function beginClipping(input:Pick<ClippingDraft,'slot'|'name'|'endSlot'|'convex'|'inverse'>){
    const model=project.value;
    if(!sceneEditing.value||!canEdit.value||busy.value||editing.value||meshOutlineDraft.value||!model||!slots.value.some(s=>s.id===input.slot)||!slots.value.some(s=>s.id===input.endSlot))return false;
    cancelTrace();selectSlot(input.slot);editMode.value='clipping';tool.value='translate';
    clippingDraft.value={...input,points:[],documentId:model.documentId,revision:model.revision};return true;
  }
  function appendClippingPoint(point:{x:number;y:number}){
    const draft=clippingDraft.value;if(!draft||draft.points.length>=256||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    draft.points.push({...point});
  }
  function cancelClipping(){clippingDraft.value=null;releasePose();editMode.value='images';selectedVertex.value=null;}
  async function finishClipping(){
    if(editing.value||busy.value)return false;
    const draft=clippingDraft.value,model=project.value;
    if(!draft||draft.points.length<3||!model)return false;
    if(draft.documentId!==model.documentId||draft.revision!==model.revision){cancelClipping();showNotice('The project changed. Draw the clipping polygon again.',true);return false;}
    const success=await editRig({type:'createClipping',slot:draft.slot,name:draft.name,endSlot:draft.endSlot,convex:draft.convex,inverse:draft.inverse,vertices:draft.points.map(p=>({...p}))},draft.revision);
    if(success){clippingDraft.value=null;editMode.value='clipping';}return success;
  }
  function beginClippingEdit(id:number){const a=sceneAttachments.value.find(a=>a.id===id);if(!a?.clipping||clippingDraft.value)return false;selectAttachment(id);editMode.value='clipping';meshTool.value='move';return true;}
  async function beginMeshOutline():Promise<boolean>{
    const model=project.value,attachment=selectedAttachment.value;
    if(!model||!attachment?.mesh||meshOutlineProblem.value)return false;
    let plane:MeshView;
    try{plane=createMeshOutlinePlane(attachment.mesh);}
    catch(error){showNotice(errorMessage(error),true);return false;}
    const draft:MeshOutlineDraft={attachmentId:attachment.id,documentId:model.documentId,revision:model.revision,plane,points:[]};
    meshOutlineBusy.value=true;
    meshOutlineDraft.value=draft;
    suspendSimulation('geometry');
    try{
      const snapshot=await freezePose();
      if(meshOutlineDraft.value!==draft)return false;
      const [center]=meshOutlineWorldPoints({...draft,points:[[0.5,0.5]]},renderedBones.value);
      if(!center||!meshOutlineUv(draft,renderedBones.value,center))throw new Error(i18n.global.t('meshOutlineCollapsed'));
      meshOutlinePoseEpoch=snapshot?.poseEpoch;
      return true;
    }catch(error){
      if(meshOutlineDraft.value===draft){cancelMeshOutline();showNotice(errorMessage(error),true);}
      return false;
    }finally{
      if(meshOutlineDraft.value===draft)meshOutlineBusy.value=false;
    }
  }
  function setMeshOutlinePointGesture(active:boolean){
    meshOutlinePointGesture.value=active&&!!meshOutlineDraft.value&&!meshOutlineBusy.value&&!busy.value&&!editing.value;
  }
  function validMeshOutlineUv(uv:[number,number]):boolean{
    return uv.length===2&&uv.every(value=>Number.isFinite(value)&&value>=0&&value<=1);
  }
  function canEditMeshOutlinePoints(draft:MeshOutlineDraft):boolean{
    return meshOutlineDraft.value===draft&&!meshOutlineBusy.value&&!meshOutlinePointGesture.value&&!busy.value&&!editing.value;
  }
  function appendMeshOutlinePoint(uv:[number,number]){
    const draft=meshOutlineDraft.value;
    if(!draft||!canEditMeshOutlinePoints(draft)||draft.points.length>=256||!validMeshOutlineUv(uv))return;
    meshOutlineDraft.value={...draft,points:[...draft.points,[Math.fround(uv[0]),Math.fround(uv[1])]]};
  }
  function moveMeshOutlinePoint(draft:MeshOutlineDraft,index:number,uv:[number,number]){
    if(!canEditMeshOutlinePoints(draft)||!Number.isInteger(index)||index<0||index>=draft.points.length||!validMeshOutlineUv(uv))return;
    const current=draft.points[index]!,point:[number,number]=[Math.fround(uv[0]),Math.fround(uv[1])];
    if(point[0]===current[0]&&point[1]===current[1])return;
    const points=[...draft.points];points[index]=point;
    meshOutlineDraft.value={...draft,points};
  }
  function removeMeshOutlinePoint(draft:MeshOutlineDraft,index:number){
    if(!canEditMeshOutlinePoints(draft)||!Number.isInteger(index)||index<0||index>=draft.points.length)return;
    meshOutlineDraft.value={...draft,points:draft.points.filter((_,position)=>position!==index)};
  }
  function removeLastMeshOutlinePoint(){
    const draft=meshOutlineDraft.value;
    if(draft)removeMeshOutlinePoint(draft,draft.points.length-1);
  }
  function cancelMeshOutline(){
    if(!meshOutlineDraft.value)return;
    meshOutlinePointGesture.value=false;meshOutlineDraft.value=null;meshOutlineBusy.value=false;meshOutlinePoseEpoch=undefined;releasePose();
  }
  async function finishMeshOutline():Promise<boolean>{
    const draft=meshOutlineDraft.value;
    if(!draft||!canEditMeshOutlinePoints(draft))return false;
    if(draft.points.length<3){showNotice(i18n.global.t('meshOutlineNeedsPoints'),true);return false;}
    const success=await editRig({type:'replaceMeshOutline',id:draft.attachmentId,uvs:draft.points},draft.revision,meshOutlinePoseEpoch);
    if(success&&meshOutlineDraft.value===draft)cancelMeshOutline();
    return success;
  }
  function resetMeshOutline():Promise<boolean>{
    const model=project.value,attachment=selectedAttachment.value;
    if(!model||!attachment||meshOutlineProblem.value)return Promise.resolve(false);
    return editRig({type:'attachmentEdit',id:attachment.id,edit:{type:'resetMesh',id:attachment.slot}},model.revision);
  }
  watch(()=>[project.value?.documentId,project.value?.revision,editorMode.value,editMode.value,selectedAttachmentId.value,
    selectedAttachmentIds.value.length,treeFilters.value.attachment],()=>{
    const draft=meshOutlineDraft.value;
    if(draft&&(project.value?.documentId!==draft.documentId||project.value.revision!==draft.revision||editorMode.value!=='setup'||
      editMode.value!=='meshes'||selectedAttachmentId.value!==draft.attachmentId||selectedAttachmentIds.value.length!==1||!treeFilters.value.attachment))cancelMeshOutline();
  },{flush:'sync'});
  async function chooseImagesFolder(){
    const document=project.value?.documentId;
    if(editFlight&&!(await editFlight))return;
    if(project.value?.documentId!==document||!canUpdateImageResources())return;
    animation.pauseAnimation();const model=project.value!,publish=animation.prepareAnimationResourceUpdate();
    editing.value=true;let success=false;
    const operation=run(async()=>{const result=await api.chooseImagesFolder(model.revision);if(result&&publish(result,()=>{project.value=result;})){librarySelection.value=null;success=true;}}).then(()=>success);
    editFlight=operation;try{await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  async function chooseAudioFolder(){
    if(editFlight)await editFlight;
    if(editorMode.value!=='setup'||!canEdit.value||busy.value||!project.value||meshOutlineDraft.value||inspectorError.value||eventKeyError.value)return;
    const selected=selectedEventId.value;editing.value=true;let success=false;
    const operation=run(async()=>{const result=await api.chooseAudioFolder(project.value!.revision);if(result){project.value=result;if(selected!==null&&result.events?.some(event=>event.id===selected))selectEvent(selected);success=true;if(result.audioLibrary?.warnings.length)showNotice(result.audioLibrary.warnings[0]!,true);}}).then(()=>success);
    editFlight=operation;try{await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  function invalidateTracePreview() {
    tracePreview.value = null;
    tracePending = false;
    traceGeneration++;
  }
  function closeTrace(){traceOpen.value=false;invalidateTracePreview();releasePose();}
  function cancelTrace(){if(!traceApplying.value)closeTrace();}
  function openTrace(inner=false){if(traceApplying.value||!selectedSlot.value?.region||!canEdit.value||meshOutlineDraft.value)return;traceOptions.inner=inner;traceOpen.value=true;void previewTrace();}
  function previewTrace(): Promise<void> {
    if (!traceOpen.value || traceApplying.value || !selectedSlot.value || !project.value) return Promise.resolve();
    traceGeneration++;
    tracePending = true;
    if (traceFlight) return traceFlight;
    traceBusy.value = true;
    const operation = (async () => {
      try {
        while (tracePending && traceOpen.value) {
          tracePending = false;
          const request = traceGeneration, slot = selectedSlot.value, model = project.value;
          if (!slot || !model) break;
          const options = {...traceOptions}, attachmentId = selectedAttachmentId.value;
          try {
            const snapshot = await freezePose();
            if (request !== traceGeneration) continue;
            const preview = sceneEditing.value && attachmentId !== null
              ? await api.previewTraceAttachment(attachmentId, options, model.revision, snapshot?.poseEpoch)
              : await api.previewTrace(slot.id, options, model.revision);
            if (request === traceGeneration && JSON.stringify(options) === JSON.stringify(traceOptions) &&
                project.value?.documentId === model.documentId && project.value.revision === model.revision &&
                selectedSlotId.value === slot.id && selectedAttachmentId.value === attachmentId) {
              tracePreview.value = preview;
            }
          } catch (error) {
            if (request === traceGeneration) {
              tracePreview.value = null;
              showNotice(errorMessage(error), true);
            }
          }
        }
      } finally {
        traceBusy.value = false;
        traceFlight = null;
      }
    })();
    traceFlight = operation;
    return operation;
  }
  async function applyTrace() {
    const preview = tracePreview.value, model = project.value;
    if (editFlight || !traceOpen.value || traceBusy.value || traceApplying.value || busy.value || inspectorError.value ||
        !preview || !model || model.revision !== preview.expectedRevision) return;
    const options = {...traceOptions}, weightKey = weightSelectionKey.value;
    const targetSlot = selectedSlotId.value, targetAttachment = selectedAttachmentId.value;
    const projectIsCurrent = () => project.value?.documentId === model.documentId && project.value.revision === model.revision;
    const targetIsCurrent = () => selectedSlotId.value === targetSlot && selectedAttachmentId.value === targetAttachment;
    traceApplying.value = true;
    editing.value = true;
    let success = false;
    const operation = run(async () => {
      try {
        const result = preview.attachmentId !== undefined
          ? await api.applyTraceAttachment(preview.attachmentId, options, preview.expectedRevision, preview.poseEpoch)
          : await api.applyTrace(preview.slotId, options, preview.expectedRevision);
        if (projectIsCurrent()) {
          const restoreMeshTools = targetIsCurrent();
          project.value = result;
          invalidateWeightVertices(weightKey);
          if (restoreMeshTools) {
            selectedSlotId.value = preview.slotId;
            selectedVertex.value = null;
            editMode.value = 'meshes';
            tool.value = 'translate';
            meshTool.value = 'move';
            meshEditUvs.value = true;
          }
        }
        success = true;
        closeTrace();
      } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
        if (!projectIsCurrent() || !targetIsCurrent()) closeTrace();
        else if (code === 'ProjectChanged' || code === 'NoProject' || code === 'StalePose' || code === 'InvalidPose') {
          invalidateTracePreview();
          releasePose();
        }
        throw error;
      }
    }).then(() => success);
    editFlight = operation;
    try { await operation; }
    finally {
      if (editFlight === operation) {editFlight = null;editing.value = false;}
      traceApplying.value = false;
    }
  }
  watch(traceOptions,invalidateTracePreview,{deep:true,flush:'sync'});
  watch(()=>[project.value?.revision,project.value?.documentId,selectedSlotId.value,selectedAttachmentId.value],(current,previous)=>{if(traceOpen.value&&previous&&current.some((value,i)=>value!==previous[i]))cancelTrace();},{flush:'sync'});

  const pruneTargets = computed(() => {
    const model = project.value;
    if (!model || !sceneEditing.value) return null;
    const inspected = selectedAttachmentId.value;
    const ids = selectedAttachmentIds.value.length ? selectedAttachmentIds.value : inspected === null ? [] : [inspected];
    if (!ids.length) return null;
    const attachments = new Map(sceneAttachments.value.map(attachment => [attachment.id, attachment]));
    const targets: PruneWeightTarget[] = [];
    let maxInfluences = 0;
    for (const id of ids) {
      const attachment = attachments.get(id);
      const binding = attachment?.type === 'mesh' ? attachment.mesh : attachment?.type === 'clipping' ? attachment.clipping : null;
      if (!binding?.weighted || !binding.bones.length) return null;
      const saved = weightSelections.value.get(weightTargetKey(model, id));
      const lockedBones = binding.bones.filter(bone => saved?.locks.includes(bone));
      targets.push(lockedBones.length ? {id, lockedBones} : {id});
      maxInfluences = Math.max(maxInfluences, binding.bones.length);
    }
    return {targets, maxInfluences};
  });
  const canPruneWeights = computed(() => !!pruneTargets.value && canEdit.value && editorMode.value === 'setup' &&
    !busy.value && !editing.value && !openingProject.value && !traceOpen.value && !clippingDraft.value &&
    !parentPicking.value && !newDialog.value && !discardDialog.value);
  const pruneTargetCount = computed(() => (pruneSession.value ?? pruneTargets.value)?.targets.length ?? 0);
  const pruneMaxInfluences = computed(() => (pruneSession.value ?? pruneTargets.value)?.maxInfluences ?? 1);
  const pruneDraft = shallowRef<PruneDraft|null>(null);
  const prunePreview = shallowRef<PruneWeightPreview|null>(null);
  const pruneError = ref<string|null>(null);
  const pruneBusy = computed(() => !!pruneDraft.value && !prunePreview.value && !pruneError.value);
  const canApplyPrune = computed(() => {
    const preview = prunePreview.value;
    return !!preview && preview.removed > 0 && !!pruneDraft.value && !inspectorError.value &&
      canPruneWeights.value && preview.poseEpoch === frozenPose.value?.poseEpoch;
  });
  let pruneTimer: ReturnType<typeof setTimeout>|undefined;
  let pruneFlight: Promise<void>|null = null;
  let prunePending: PruneDraft|null = null;

  function openPrune() {
    const model = project.value;
    const picked = pruneTargets.value;
    if (pruneOpen.value || !canPruneWeights.value || !model || !picked) return;
    suspendSimulation('prune');
    pruneSession.value = {documentId: model.documentId, revision: model.revision, selectionKey: JSON.stringify(picked), ...picked};
  }
  function cancelPrune() {
    if (!pruneSession.value) return;
    pruneSession.value = null;
    setPruneDraft(null);
    if (!rigEditOwnsPose) releasePose();
    resumeSimulation('prune');
  }
  function setPruneDraft(draft: PruneDraft|null) {
    clearTimeout(pruneTimer);
    pruneTimer = undefined;
    prunePending = null;
    pruneDraft.value = draft;
    prunePreview.value = null;
    pruneError.value = null;
    if (draft) pruneTimer = setTimeout(() => {
      pruneTimer = undefined;
      queuePrunePreview(draft);
    }, 120);
  }
  function setPruneOptions(options: PruneWeightOptions|null) {
    const session = pruneSession.value;
    if (!session || busy.value) return;
    if (!options || !Number.isInteger(options.maxInfluences) || options.maxInfluences < 1 ||
        options.maxInfluences > session.maxInfluences || !Number.isFinite(options.threshold) || options.threshold < 0 || options.threshold > 1) {
      setPruneDraft(null);
      return;
    }
    setPruneDraft({session, request: {...options, targets: session.targets}});
  }
  function currentPrune(draft: PruneDraft) {
    return pruneDraft.value === draft && pruneSession.value === draft.session && editorMode.value === 'setup' &&
      project.value?.documentId === draft.session.documentId && project.value.revision === draft.session.revision;
  }
  function queuePrunePreview(draft: PruneDraft) {
    if (!currentPrune(draft)) return;
    if (pruneFlight) {
      prunePending = draft;
      return;
    }
    const operation = (async () => {
      try {
        const snapshot = await freezePose();
        if (!currentPrune(draft)) return;
        const epoch = snapshot?.poseEpoch;
        const result = await api.previewPruneWeights(draft.request, draft.session.revision, epoch);
        if (!currentPrune(draft)) return;
        if (result.documentId !== draft.session.documentId || result.revision !== draft.session.revision ||
            result.poseEpoch !== epoch || epoch !== frozenPose.value?.poseEpoch) {
          throw new Error('The project changed while preparing the weights preview. Try again.');
        }
        prunePreview.value = result;
      } catch (error) {
        if (currentPrune(draft)) pruneError.value = errorMessage(error);
      }
    })().finally(() => {
      pruneFlight = null;
      const next = prunePending;
      prunePending = null;
      if (next) queuePrunePreview(next);
    });
    pruneFlight = operation;
  }
  async function applyPrune(): Promise<boolean> {
    const draft = pruneDraft.value;
    const preview = prunePreview.value;
    if (!draft || !preview || !currentPrune(draft) || !canApplyPrune.value) return false;
    const applied = await editRig({type: 'pruneAttachmentWeights', request: draft.request}, preview.revision, preview.poseEpoch);
    if (applied && pruneSession.value === draft.session) cancelPrune();
    else if (!applied && currentPrune(draft)) {
      prunePreview.value = null;
      pruneError.value = notice.value || errorMessage(null);
    }
    return applied;
  }
  watch(() => [project.value?.documentId, project.value?.revision, editorMode.value, editMode.value, selectedAttachmentId.value,
    newDialog.value, discardDialog.value, openingProject.value,
    traceOpen.value, clippingDraft.value, parentPicking.value, simulationReset.value], (current, previous) => {
    if (pruneOpen.value && current.some((value, index) => value !== previous[index])) cancelPrune();
  }, {flush: 'sync'});
  watch(() => pruneOpen.value ? JSON.stringify(pruneTargets.value) : null, (key) => {
    if (pruneSession.value && key !== pruneSession.value.selectionKey) cancelPrune();
  }, {flush: 'sync'});
  watch(frozenPose, (pose, previous) => {
    if (pruneOpen.value && previous && pose?.poseEpoch !== previous.poseEpoch) cancelPrune();
  }, {flush: 'sync'});

  function canUpdateImageResources(){
    const error=inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value;
    if(error){showNotice(error,true);return false;}
    return canEdit.value&&!busy.value&&!!project.value&&!newDialog.value&&!discardDialog.value&&!traceOpen.value&&!pruneOpen.value&&!clippingDraft.value&&!meshOutlineDraft.value&&!parentPicking.value;
  }
  async function refreshImagesFolder(){
    const document=project.value?.documentId;
    if(editFlight&&!(await editFlight))return;if(project.value?.documentId!==document||!canUpdateImageResources())return;
    animation.pauseAnimation();const model=project.value!,publish=animation.prepareAnimationResourceUpdate();
    editing.value=true;let success=false;
    const operation=run(async()=>{const result=await api.refreshImagesFolder(model.revision);success=publish(result,()=>{project.value=result;});}).then(()=>success);
    editFlight=operation;try{await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  async function placeImages(keys:string[],x:number,y:number,bone?:number,centerOnBone=false):Promise<boolean>{
    if(editorMode.value==='animate'){showNotice('Switch to Setup to add image attachments.',true);return false;}
    if(editFlight)await editFlight;
    if(!canEdit.value||busy.value||!project.value||inspectorError.value||traceOpen.value||pruneOpen.value||clippingDraft.value||!keys.length)return false;
    const activeBone=project.value.bones.find(candidate=>candidate.id===selectedId.value)?.id;
    const parent=bone??activeBone??project.value.bones[0]?.id;if(parent===undefined)return false;
    let success=false;editing.value=true;
    const operation=run(async()=>{const snapshot=await freezePose();if(centerOnBone){const pose=worldBones(renderedBones.value).find(b=>b.id===parent);if(!pose)throw new Error('The destination bone changed.');x=pose.worldX;y=pose.worldY;}const result=await api.placeImages(keys,parent,x,y,project.value!.revision,snapshot?.poseEpoch);project.value=result;selectedId.value=parent;selectedIds.value=[parent];selectedSlotId.value=result.editedSlot;selectedSlotIds.value=selectedSlotId.value===null?[]:[selectedSlotId.value];selectedAttachmentId.value=result.editedAttachment??null;selectedAttachmentIds.value=selectedAttachmentId.value===null?[]:[selectedAttachmentId.value];clearConstraintSelection();selectedVertex.value=null;editMode.value='images';tool.value='translate';success=true;}).then(()=>success);
    editFlight=operation;try{return await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  async function placeImage(key:string,x:number,y:number,bone?:number):Promise<boolean>{return placeImages([key],x,y,bone);}
  async function placeAttachments(slot:number,keys:string[]):Promise<boolean>{
    if(editorMode.value==='animate'){showNotice('Switch to Setup to add image attachments.',true);return false;}
    if(editFlight)await editFlight;
    if(!sceneEditing.value||!canEdit.value||busy.value||!project.value||traceOpen.value||pruneOpen.value||clippingDraft.value||inspectorError.value||!keys.length)return false;
    let success=false;editing.value=true;
    const operation=run(async()=>{const result=await api.placeAttachments(keys,slot,project.value!.revision);project.value=result;selectedSlotId.value=slot;selectedSlotIds.value=[slot];selectedAttachmentId.value=result.editedAttachment??null;selectedAttachmentIds.value=selectedAttachmentId.value===null?[]:[selectedAttachmentId.value];clearConstraintSelection();selectedVertex.value=null;editMode.value='images';success=true;}).then(()=>success);
    editFlight=operation;try{return await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  function setMode(mode: EditMode) {
    if(traceApplying.value)return;
    if(hasSelectedPath.value&&mode!=='bones'&&mode!=='images')return;
    if(editorMode.value==='animate'){
      if(!['bones','meshes','clipping'].includes(mode)){showNotice('Switch to Setup to change attachment structure or weights.',true);return;}
      if(mode==='meshes'&&selectedAttachment.value?.clipping)mode='clipping';
      if(mode==='meshes'||mode==='clipping'){
        if(selectedAttachmentId.value===null){const active=selectedSlotRaw.value?.attachments.find(a=>a.id===selectedSlotRaw.value?.activeAttachmentId&&(a.mesh||a.clipping));if(active)selectAttachment(active.id);}
        if(mode==='meshes'&&selectedAttachment.value?.clipping)mode='clipping';
        meshTool.value='move';meshEditUvs.value=false;animation.pauseAnimation();
      }
    }
    editMode.value = mode;
    if (mode === 'bones') {if(selectedSlotId.value!==null)selectBone(selectedId.value);}
    else if(selectedAttachmentId.value===null)selectSlot(selectedSlotId.value ?? slots.value.at(-1)?.id ?? null);
    tool.value = 'translate';
  }
  const canImportPsd=computed(()=>canEdit.value&&sceneEditing.value&&editorMode.value==='setup'&&!busy.value&&!newDialog.value&&!discardDialog.value&&!traceOpen.value&&!clippingDraft.value&&!meshOutlineDraft.value&&!parentPicking.value);
  let psdImportPending=false;
  async function importPsd():Promise<boolean>{
    if(psdImportPending)return false;
    psdImportPending=true;
    try{
      const documentId=project.value?.documentId;
      // The shared command blurs the field; let its commit register before awaiting it.
      await nextTick();
      if(editFlight){if(busy.value&&!editing.value)return false;if(!(await editFlight))return false;}
      if(editorMode.value!=='setup'){showNotice(i18n.global.t('importPsdSetup'),true);return false;}
      if(project.value?.documentId!==documentId||!canImportPsd.value||!canUpdateImageResources())return false;
      const model=project.value!;
      const bone=selectedSlot.value?.bone??selectedBone.value?.id??model.bones[0]?.id;
      if(bone===undefined)return false;
      animation.pauseAnimation();
      editing.value=true;let imported=false;
      const operation=run(async()=>{
        const result=await api.importPsd(bone,model.revision);
        if(!result||project.value?.documentId!==model.documentId||project.value?.revision!==model.revision||result.documentId!==model.documentId)return;
        project.value=result;
        selectedId.value=bone;selectedIds.value=[bone];
        const attachment=result.editedAttachment??null;
        selectSceneAttachments(attachment===null?[]:[attachment],attachment);
        if(attachment===null){selectedSlotId.value=result.editedSlot;selectedSlotIds.value=result.editedSlot===null?[]:[result.editedSlot];}
        editMode.value='images';tool.value='translate';imported=true;
        showNotice(i18n.global.t('importPsdImported',{count:result.slots.length-model.slots.length}));
      }).then(()=>imported);
      editFlight=operation;
      try{return await operation;}
      finally{if(editFlight===operation){editFlight=null;editing.value=false;if(!traceOpen.value&&!clippingDraft.value)releasePose();}}
    }finally{psdImportPending=false;}
  }
  async function importImage() {
    if(editorMode.value==='animate'){showNotice('Switch to Setup to add image attachments.',true);return;}
    if (editFlight) await editFlight;
    if (!canEdit.value || busy.value || !project.value || inspectorError.value || newDialog.value || discardDialog.value) return;
    const bone = selectedSlot.value?.bone ?? selectedBone.value?.id ?? project.value.bones[0]?.id;
    if (bone === undefined) return;
    editing.value = true;
    let imported = false;
    const operation = run(async () => {
      const result = await api.importImage(bone, project.value!.revision);
      if (!result) return;
      project.value = result; selectedSlotId.value = result.editedSlot;
      editMode.value = 'images'; tool.value = 'translate'; imported = true;
    }).then(() => imported);
    editFlight = operation;
    try { await operation; }
    finally { if (editFlight === operation) { editFlight = null; editing.value = false;if(!traceOpen.value&&!clippingDraft.value)releasePose(); } }
  }
  async function removeSelection() {
    if(selectedConstraintIds.value.length>1){showNotice('Select an individual constraint to delete it.',true);return;}

    if (editFlight) await editFlight;
    if(selectedEvent.value){if(await editRig({type:'deleteEvent',id:selectedEvent.value.id}))selectEvent(null);return;}
    if(editMode.value==='clipping'&&selectedAttachment.value?.clipping&&selectedVertex.value!==null)await editRig({type:'deleteClippingVertex',id:selectedAttachment.value.id,vertex:selectedVertex.value});
    else if (editMode.value === 'meshes' && selectedSlot.value?.mesh && selectedVertex.value !== null) await editRig({ type:'deleteVertex', id:selectedSlot.value.id, vertex:selectedVertex.value });
    else if(selectedConstraint.value)await removeConstraint();
    else if(sceneEditing.value&&selectedAttachment.value)await removeAttachment();
    else if (selectedSlot.value) await editRig({ type: 'deleteSlot', id: selectedSlot.value.id });
    else await removeBone();
  }
  watch(project, async (value) => {
    const title = `${value ? value.name + (value.dirty ? ' *' : '') + ' — ' : ''}FBones`;
    document.title = title;
    if (api.desktop) {
      try { await nativeWindow().setTitle(title); }
      catch (error) { showNotice(errorMessage(error), true); }
    }
  });
  watch(()=>[project.value?.documentId,project.value?.revision,logicalDocumentKey(project.value)],(current,previous)=>{
    const compatible=!!previous&&current[0]===previous[0]&&previewRuntime.adopt({bones:project.value?.bones??[],constraints:constraints.value,slots:project.value?.slots});
    if(compatible){frozenPose.value=null;resumeSimulation('geometry');publishPreview();}else resetSimulation();
    if(!previous||current[2]!==previous[2]){
      clearObjectSelection();clippingDraft.value=null;meshDisplayOptions.value=defaultMeshDisplayOptions;
      meshWireframePreferences.value=emptyMeshWireframeAttachments;
    }
    else{
      const wireframes=meshWireframePreferences.value;
      if(wireframes.size){
        const meshes=new Set<number>();
        for(const slot of slots.value){
          for(const attachment of slot.attachments??[]){
            if(attachment.type==='mesh'&&attachment.mesh&&wireframes.has(attachment.id))meshes.add(attachment.id);
          }
        }
        if(meshes.size!==wireframes.size)meshWireframePreferences.value=meshes;
      }
      const valid=new Set(sceneAttachments.value.map(a=>a.id));
      selectedAttachmentIds.value=selectedAttachmentIds.value.filter(id=>valid.has(id));
      if(selectedAttachmentId.value!==null&&!valid.has(selectedAttachmentId.value))selectedAttachmentId.value=selectedAttachmentIds.value.at(-1)??null;
      if(selectedAttachmentId.value!==null){selectedSlotId.value=sceneAttachments.value.find(a=>a.id===selectedAttachmentId.value)?.slot??null;selectedSlotIds.value=[...new Set(sceneAttachments.value.filter(a=>selectedAttachmentIds.value.includes(a.id)).map(a=>a.slot))];}
      selectedSlotIds.value=selectedSlotIds.value.filter(id=>slots.value.some(s=>s.id===id));
      if(selectedSlotId.value!==null&&!slots.value.some(s=>s.id===selectedSlotId.value)){selectedSlotId.value=null;selectedVertex.value=null;}
      selectedConstraintIds.value=selectedConstraintIds.value.filter(id=>constraints.value.some(c=>c.id===id));
      if(!selectedConstraintIds.value.includes(selectedConstraintId.value??-1))selectedConstraintId.value=selectedConstraintIds.value.at(-1)??null;
      if(!selectedConstraintIds.value.length)constraintSelectionAnchor.value=null;
      if(!project.value?.events?.some(event=>event.id===selectedEventId.value))selectedEventId.value=null;
    }
  },{flush:'sync'});

  return { ...animation,editorMode,setEditorMode,animationLocalBones,project, busy, openingProject, editing, ready,prepareForUpdate, newDialog, discardDialog, notice, noticeError, inspectorError,animationKeyError,eventKeyError,sequenceFieldError,attachmentColorError,
    timelineAdjustState,timelineAdjustDragging,timelineAdjustViewportAvailable,timelineAdjustWorkingPose,setTimelineAdjustState,prepareTimelineViewportAdjustment,
    animationPhysicsTime,animationPhysicsError,animationPhysicsSupported,animationPhysicsGeneration,resetAnimationPhysicsPreview,
    renderedBones,constrainedAnimationRotation,frozenPose,freezePose,releaseViewportPose,releasePose,previewBonePose,endBonePreview,simulationIntent,simulationRunning,simulationTime,simulationError,simulationReset,simulationStep,runSimulation,pauseSimulation,stepSimulation,resetSimulation,advanceSimulation,suspendSimulation,resumeSimulation,setPreviewVisible,
    sceneEditing,sceneSlots,sceneAttachments,linkedMeshCreationSources,selectedSlotRaw,selectedSlotIds,selectedAttachmentId,selectedAttachmentIds,selectedAttachment,hasSelectedPath,selectedDeformSourceId,selectedBinding,selectAttachment,selectSceneAttachments,
    selectedConstraintId,selectedConstraintIds,selectedConstraints,selectedConstraint,constraints,selectConstraint,selectedEventId,selectedEvent,currentEventKey,selectEvent,createEvent,patchEventDefinition,audioLibrary,chooseAudioFolder,selectedEventAudioPlayable,previewEventAudio,stopAnimationAudio,eventPlaybackText,eventPlaybackCount,audioPlaybackCount,lastAudioPlayback,lastAnimationEvent,
    treeFilters,treeFilterPreferences,treeFiltersBypassed,treeTextSearchFilters,setTreeFilter,toggleTreeFiltersBypass,resetTreeFilters,setTreeTextSearchFilters,
    parentPicking,beginParentPick,cancelParentPick,canPickParent,chooseParent,
    createSlot,toggleAttachment,renameAttachment,setAttachmentImagePath,removeAttachment,moveAttachment,editAttachmentTransform,placeAttachments,
    createConstraint,physicsBoneIds,canAddPhysics,addPhysicsToSelectedBones,editConstraint,editConstraintById,editSelectedConstraintField,editTransformRange,matchTransform,removeConstraint,removeConstraintById,reorderConstraint,createClipping,editClipping,
    clippingDraft,beginClipping,appendClippingPoint,finishClipping,cancelClipping,beginClippingEdit,
    meshOutlineDraft,meshOutlineBusy,meshOutlineProblem,meshOutlinePointGesture,beginMeshOutline,setMeshOutlinePointGesture,
    appendMeshOutlinePoint,moveMeshOutlinePoint,removeMeshOutlinePoint,removeLastMeshOutlinePoint,finishMeshOutline,cancelMeshOutline,resetMeshOutline,
    hoveredBoneId,hoverBone,clearBoneHover,chooseInfluence,
    animateWeightsTarget,animateWeightsVertex,selectAnimateWeightsVertex,
    weightVertices,weightBones,weightLocks,toggleWeightLock,weightActiveVertex,selectWeightVertices,clearWeightVertices,clearWeightBones,weightAutoEdit,
    canCopyWeights,canPasteWeights,weightClipboardCount,weightPasteUnavailable,copyWeights,pasteWeights,
    grid, viewportVisibility, viewportSelection, viewportNameTags, viewportSelectionPath, meshDisplay, toggleMeshDisplay, meshWireframeAttachments, meshWireframeTargetId, setMeshWireframe,
    ghostingSettings, ghostingAvailability, ghostingPoses,ghostingVectors, ghostingLimited,
    ghostingBoneFilter,ghostingSelectionLocked,setGhostingSelectionLocked,refreshGhostingSelection,
    zoom, resetCount, tool, transformPivot, initialize, prepareForMcp, refreshFromMcp, request, create, copy, showNotice,
    save, exportRuntime, exportSpineBundle, exportGif, saveAndContinue, discardAndContinue, cancelDiscard,
    traceOpen,traceBusy,traceApplying,traceOptions,tracePreview,viewSlots,openTrace,previewTrace,invalidateTracePreview,applyTrace,cancelTrace,meshGenerateProblem,generateMeshVertices,
    canPruneWeights,pruneOpen,pruneBusy,pruneError,prunePreview,pruneTargetCount,pruneMaxInfluences,canApplyPrune,openPrune,setPruneOptions,applyPrune,cancelPrune,
    selectedIds,selectBones,escapeSelection,withSceneSelectionHistory,visitSceneSelectionHistory,autoColor,applyAutoColors,meshEditUvs,library,librarySelection,librarySelectedKeys,selectLibraryImage,chooseImagesFolder,refreshImagesFolder,placeImage,placeImages,
    selectedId, selectedBone, canEdit, editRig, addBone, removeBone,
    selectedVertex, meshTool, influence, softSelection, softSize, softFeather, brushMode, brushStrength, brushSize, brushFeather, weightDisplay,
    slots, selectedSlotId, selectedSlot, editMode, selectBone, selectSlot, setMode, importImage, importPsd, canImportPsd, removeSelection };
});
