import { defineStore } from 'pinia';
import { computed, ref, reactive, shallowRef, watch, nextTick } from 'vue';
import * as api from '../services/desktop.ts';
import { errorMessage, type ProjectSummary, type RigEdit, type EditMode, type EditorTool, type TraceOptions, type TracePreview, type AttachmentView, type ConstraintInput, type RegionView, type ClippingView, type ClippingDraft, type EvaluationSnapshot, type BoneView, type DenseBindingView } from '../domain/project.ts';
import {automaticColors,childColor} from '../domain/colors.ts';
import { selectImageKeys } from '../domain/imageSelection.ts';
import {activeBoneHover,claimBoneHover,emptyBoneHover,pruneBoneHover,releaseBoneHover,type BoneHoverSource} from '../domain/boneHover.ts';
import { nativeWindow } from '../services/bridge.ts';
import {allTreeKinds} from '../domain/treeProjection.ts';
import {ScenePreview} from '../domain/scenePreview.ts';
import {AnimationPhysicsPreview} from '../domain/animationPhysicsPreview.ts';
import {withEvaluatedPose} from '../domain/evaluatedPose.ts';
import {worldBones,canParent} from '../domain/rig.ts';
import {validWeightSelection,withWeightBone,withWeightVertices,type WeightSelection} from '../domain/weightSelection.ts';
import {useAnimationWorkspace} from '../composables/useAnimationWorkspace.ts';
import type {EventDefinition,EventPatch,FiredEvent} from '../domain/animationEvents.ts';
import {EventAudioPlayer,type AudioReceipt} from '../domain/eventAudio.ts';
import {evaluate as evaluateScene,PhysicsState} from '../domain/solve/index.ts';
import {logicalDocumentKey} from '../domain/resourceContinuity.ts';
import {batchField,batchFieldValue,sameBatchValue} from '../domain/constraintBatch.ts';
import {canMatchTransform} from '../domain/transformMapping.ts';
import {i18n} from '../i18n.ts';

export type Intent = 'new' | 'open' | 'close' | 'quit' | 'update';

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
  const treeFilters=reactive(allTreeKinds());
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
    const result=selectImageKeys({keys:librarySelectedKeys.value,anchor:libraryAnchor.value},key,ordered,modifiers);
    selectionEpoch++;librarySelectedKeys.value=result.keys;libraryAnchor.value=result.anchor;libraryActiveKey.value=result.keys.includes(key)?key:result.keys.at(-1)??null;
    clearObjectSelection();selectedSlotId.value=null;selectedVertex.value=null;inspectorError.value='';
  }
  const traceOpen=ref(false),traceBusy=ref(false),tracePreview=shallowRef<TracePreview|null>(null);
  const traceOptions=reactive<TraceOptions>({alphaThreshold:16,tolerance:1,spacing:24,inner:false,innerThreshold:0.15,innerTolerance:2,innerSpacing:24,maxVertices:192});
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
  const slots = computed(() => project.value?.slots ?? []);
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
  const weightSelections=shallowRef(new Map<string,WeightSelection>());
  const weightSelectionKey=computed(()=>{
    if(!project.value||!selectedBinding.value)return null;
    const id=sceneEditing.value?selectedAttachmentId.value:selectedSlotId.value;
    return id===null?null:`${logicalDocumentKey(project.value)}:${sceneEditing.value?'attachment':'slot'}:${id}`;
  });
  const weightSelection=computed(()=>validWeightSelection(weightSelectionKey.value===null?undefined:weightSelections.value.get(weightSelectionKey.value),selectedBinding.value?.vertices.length??0,selectedBinding.value?.weighted?selectedBinding.value.bones:[]));
  const weightVertices=computed(()=>weightSelection.value.vertices);
  const weightBones=computed(()=>weightSelection.value.bones);
  const weightLocks=computed(()=>sceneEditing.value?weightSelection.value.locks:[]);
  const weightActiveVertex=computed(()=>weightSelection.value.active??(selectedVertex.value!==null&&selectedBinding.value?.vertices[selectedVertex.value]?selectedVertex.value:null));
  function storeWeightSelection(value:WeightSelection){const key=weightSelectionKey.value;if(key===null)return;const next=new Map(weightSelections.value);next.set(key,value);weightSelections.value=next;}
  function selectWeightVertices(ids:number[],active:number|null=null){
    const next=withWeightVertices(weightSelection.value,ids,active,selectedBinding.value?.vertices.length??0);
    storeWeightSelection(next);selectedVertex.value=next.active;
  }
  function clearWeightVertices(){selectWeightVertices([],null);}
  function clearWeightBones(){storeWeightSelection({...weightSelection.value,bones:[],anchor:null});}
  function toggleWeightLock(id:number){if(!sceneEditing.value||!selectedBinding.value?.weighted||!selectedBinding.value.bones.includes(id)||busy.value)return;const locks=new Set(weightLocks.value);if(locks.has(id))locks.delete(id);else locks.add(id);storeWeightSelection({...weightSelection.value,locks:selectedBinding.value.bones.filter(bone=>locks.has(bone))});}
  function invalidateWeightVertices(key=weightSelectionKey.value){if(key===null)return;const value=weightSelections.value.get(key);if(!value)return;const next=new Map(weightSelections.value);next.set(key,{...value,vertices:[],active:null});weightSelections.value=next;}
  watch(()=>logicalDocumentKey(project.value),(id,previous)=>{if(id!==previous)weightSelections.value=new Map();},{flush:'sync'});
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
  const parentSelectionKey=computed(()=>`${selectedSlotId.value}:${selectedAttachmentId.value}:${selectedAttachmentIds.value.join(',')}:${selectedIds.value.join(',')}:${selectedConstraintIds.value.join(',')}:${editMode.value}:${librarySelection.value}`);
  function cancelParentPick(){parentPick.value=null;resumeSimulation('parent');clearBoneHover();}
  async function beginParentPick():Promise<boolean>{
    if(editFlight&&!(await editFlight))return false;
    const model=project.value;
    if(!model||!canEdit.value||!sceneEditing.value||busy.value||inspectorError.value||traceOpen.value||clippingDraft.value||newDialog.value||discardDialog.value||librarySelection.value!==null||selectedConstraintId.value!==null)return false;
    const attachments=[...selectedAttachmentIds.value],bones=attachments.length||selectedSlotId.value!==null?[]:[...selectedIds.value];
    if(!attachments.length&&!bones.length)return false;
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
  const renderedBones=shallowRef<BoneView[]>([]),frozenPose=shallowRef<EvaluationSnapshot|null>(null);
  const simulationIntent=ref(true),simulationVisible=ref(true),simulationHolds=ref<string[]>([]);
  const simulationTime=ref(0),simulationReset=ref(0),simulationStep=ref(0),simulationError=ref('');
  const simulationRunning=computed(()=>editorMode.value==='setup'&&!!project.value&&!project.value.inspectionOnly&&constraints.value.some(c=>c.type==='physics')&&simulationIntent.value&&simulationVisible.value&&!simulationHolds.value.length&&!busy.value&&!newDialog.value&&!discardDialog.value&&!traceOpen.value&&!clippingDraft.value&&!parentPicking.value&&!simulationError.value);
  const previewRuntime=new ScenePreview();let previewAccumulator=0,poseFlight:Promise<EvaluationSnapshot|null>|null=null;
  const animationPhysicsRuntime=new AnimationPhysicsPreview();
  const animationPhysicsError=ref(''),animationPhysicsGeneration=ref(0);
  let animationPhysicsKey='',animationBonePreview=false;
  let animationFreezeLease:{epoch:number;generation:number;documentId:number;revision:number;animationId:number;frame:number;version:number;mode:'none'|'replay'}|null=null;
  let poseFlightKey='',geometryGeneration=0;
  let previewGeneration=0,checkpointEpoch:number|undefined,checkpointFlight:Promise<EvaluationSnapshot|null>|null=null;
  const animation=useAnimationWorkspace({project,busy,selectedIds,editorMode,attachment:selectedAttachmentId,localBones:animationLocalBones,edit:(edit,revision)=>editRig(edit,revision),notice:showNotice,changed:publishAnimationPose,startPlayback:startAnimationAudio,stopPlayback:stopAnimationAudio,fireEvents:fireAnimationEvents});
  const animationPhysicsTime=computed(()=>animation.animationFrame.value/Math.fround(animation.animationFps.value));
  function usesAnimatedPhysics(){return editorMode.value==='animate'&&simulationIntent.value&&!!animation.activeAnimation.value&&!project.value?.inspectionOnly&&constraints.value.some(c=>c.type==='physics');}
  const animationPhysicsSupported=computed(()=>!!animation.activeAnimation.value&&!!project.value&&!project.value.inspectionOnly&&Number.isFinite(animationPhysicsTime.value)&&(!usesAnimatedPhysics()||animationPhysicsTime.value<=120));
  function configureAnimationPhysics(){
    const model=project.value,simulate=usesAnimatedPhysics();
    const key=`${model?.documentId}:${model?.revision}:${animation.animationId.value}:${Math.fround(animation.animationFps.value)}:${simulate}`;
    if(key!==animationPhysicsKey){animationPhysicsRuntime.configure({setupBones:model?.bones??[],setupConstraints:constraints.value,clip:animation.activeAnimation.value,fps:animation.animationFps.value,simulate});animationPhysicsKey=key;}
  }
  function evaluatedAnimationBones(boneDraft?:readonly BoneView[]):BoneView[]{
    configureAnimationPhysics();animationPhysicsRuntime.advanceTo(animation.animationFrame.value);
    const drafts=[...animation.constraintDraft.value.values()];
    const frame=animationPhysicsRuntime.pose(boneDraft??animation.animationDraft.value??undefined,drafts.length?drafts:undefined);
    return withEvaluatedPose(animationPhysicsRuntime.localBones,frame.bones);
  }
  function validAnimationLease(epoch:number):boolean{
    const model=project.value,lease=animationFreezeLease,snapshot=frozenPose.value;
    return !!model&&!!lease&&!!snapshot&&lease.epoch===epoch&&snapshot.poseEpoch===epoch&&lease.generation===geometryGeneration&&lease.documentId===model.documentId&&lease.revision===model.revision&&lease.animationId===animation.animationId.value&&lease.frame===animation.animationFrame.value&&lease.version===animation.animationDraftVersion.value&&lease.mode===(usesAnimatedPhysics()?'replay':'none')&&snapshot.mode===lease.mode;
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
  function selectEvent(id:number|null){selectionEpoch++;clearObjectSelection();selectedEventId.value=project.value?.events?.some(event=>event.id===id)?id:null;selectedId.value=null;selectedIds.value=[];selectedSlotId.value=null;selectedVertex.value=null;librarySelection.value=null;inspectorError.value='';}
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
    try{renderedBones.value=evaluatedAnimationBones();animationPhysicsError.value='';}
    catch(error){
      animationPhysicsError.value=errorMessage(error);
      const bones=animation.animationBones.value;
      try{renderedBones.value=bones.length?withEvaluatedPose(bones,evaluateScene({bones,constraints:animation.animationConstraints.value},null,new PhysicsState(),{type:'none'}).bones):[];}catch{renderedBones.value=bones;}
    }
  }
  async function setEditorMode(mode:'setup'|'animate'){
    if(mode===editorMode.value||busy.value||traceOpen.value||clippingDraft.value||inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value)return;
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
    previewGeneration++;geometryGeneration++;checkpointEpoch=undefined;simulationError.value='';frozenPose.value=null;simulationHolds.value=simulationHolds.value.filter(reason=>reason!=='geometry'&&reason!=='parent');previewAccumulator=0;simulationReset.value++;
    try{previewRuntime.reset({bones:project.value?.bones??[],constraints:constraints.value});publishPreview();}
    catch(error){renderedBones.value=project.value?.bones??[];simulationError.value=errorMessage(error);}
  }
  function runSimulation(){if(editorMode.value==='animate'){if(!busy.value)simulationIntent.value=true;return;}if(traceOpen.value||clippingDraft.value||busy.value||simulationError.value)return;releasePose();simulationIntent.value=true;previewAccumulator=0;}
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
  function releasePose(){
    geometryGeneration++;
    animationFreezeLease=null;
    animation.releaseAnimationGeometrySnapshot();
    const hadPose=!!frozenPose.value;frozenPose.value=null;resumeSimulation('geometry');
    if(hadPose)try{publishPreview();}catch(error){simulationError.value=errorMessage(error);}
  }
  function previewBonePose(bones:BoneView[]):BoneView[]{
    if(editorMode.value!=='animate')return withEvaluatedPose(bones,previewRuntime.previewBones(bones).bones);
    const value=evaluatedAnimationBones(bones);animationBonePreview=true;
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
        animation.setAnimationGeometrySnapshot(snapshot,version);renderedBones.value=withEvaluatedPose(snapshot.localBones,snapshot.bones);frozenPose.value=snapshot;animationFreezeLease={epoch:snapshot.poseEpoch,generation,documentId:model.documentId,revision:model.revision,animationId:id,frame,version,mode};return snapshot;
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
  const geometryTypes=new Set(['bindAttachment','setAttachmentWeight','paintAttachmentWeights','normalizeAttachmentWeights','autoAttachmentWeights','transformAttachments','moveAttachment','createClipping','attachmentEdit','moveClippingVertices','insertClippingVertex','deleteClippingVertex','convertMesh','triangulateMesh','resetMesh','autoWeights','normalizeWeights','moveMesh','moveVertex','moveVertices','paintWeights','addVertex','deleteVertex','meshEdge','bindMesh','setWeight','meshStroke']);
  let selectionEpoch=0;
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
    await run(async () => {
      if (intent === 'open') {
        openingProject.value=true;
        try {
          await nextTick();
          const opened = await api.openProject(discardChanges);
          if (opened) { editorMode.value='setup';animation.pauseAnimation();simulationIntent.value=true;project.value = opened;animation.resetAnimationState(); selectBone(opened.bones[0]?.id ?? null); editMode.value = opened.slots?.length ? 'images' : 'bones'; if (opened.slots?.length) selectSlot(opened.slots.at(-1)!.id); resetCount.value++; notice.value='';noticeError.value=false; }
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
    if (editFlight && !(await editFlight)) return;
    if (busy.value || newDialog.value || discardDialog.value) return;
    if(clippingDraft.value){showNotice('Finish or cancel the clipping polygon first.',true);return;}
    if (project.value?.dirty) { pendingIntent = intent; discardDialog.value = true; }
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
    if(clippingDraft.value||traceOpen.value){showNotice('Finish or cancel the current geometry operation before updating.',true);return false;}
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
  async function exportRuntime():Promise<boolean>{
    if(editFlight&&!(await editFlight))return false;
    if(busy.value||!canEdit.value||!sceneEditing.value||!project.value||newDialog.value||discardDialog.value)return false;
    if(clippingDraft.value||traceOpen.value){showNotice('Finish or cancel the current geometry operation before exporting.',true);return false;}
    const invalid=inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value;
    if(invalid){showNotice(invalid,true);return false;}
    animation.pauseAnimation();
    let exported=false;
    await run(async()=>{
      const result=await api.exportRuntime(project.value!.revision);
      if(result){exported=true;showNotice(`Runtime bundle exported to ${result.path}. Only Setup and saved keys are exported.`);}
    });
    return exported;
  }
  async function save(as = false): Promise<boolean> {
    if(clippingDraft.value){showNotice('Finish or cancel the clipping polygon before saving.',true);return false;}
    if(traceOpen.value){showNotice('Apply or cancel Trace before saving.',true);return false;}
    if (editFlight && !(await editFlight)) return false;
    if (inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value) { showNotice(inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value, true); return false; }
    if (busy.value || !(as ? project.value?.canCopy : project.value?.canSave)) return false;
    const publishAnimationSave=animation.prepareAnimationSave();
    let saved = false;
    await run(async () => {
      const result = await api.saveProject(as);
      if (result&&publishAnimationSave(()=>{project.value=result;})) {
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
  async function editRig(edit: RigEdit, expectedRevision?: number,poseEpoch?:number): Promise<boolean> {
    const expectedDocument=project.value?.documentId;
    if (editFlight) await editFlight;
    if(project.value?.documentId!==expectedDocument)return false;
    if (busy.value || !canEdit.value || !project.value) return false;
    if(attachmentColorError.value&&edit.type==='setAttachmentColor'){showNotice(attachmentColorError.value,true);return false;}
    if(sequenceFieldError.value&&(edit.type==='setAnimationSequenceKeys'||edit.type==='setAttachmentSequence')){showNotice(sequenceFieldError.value,true);return false;}
    if (newDialog.value || discardDialog.value) return false;
    if(editorMode.value==='animate'&&poseEpoch!==undefined&&!validAnimationLease(poseEpoch)){showNotice('The animation pose changed. Start the gesture again.',true);return false;}
    if(clippingDraft.value&&edit.type!=='createClipping'){showNotice('Finish or cancel the clipping polygon first.',true);return false;}
    if (edit.type === 'undo' && !project.value.canUndo) return false;
    if (edit.type === 'redo' && !project.value.canRedo) return false;
    if(editorMode.value==='animate'){
      animation.pauseAnimation();
      if(['move','transformBones','update'].includes(edit.type)){
        // A viewport gesture publishes its transient preview into renderedBones.
        // Its edit still describes a delta from the frozen pointerdown sample;
        // applying it to that preview would move/rotate/scale the bones twice.
        const baseline=poseEpoch!==undefined&&frozenPose.value?.localBones
          ?withEvaluatedPose(frozenPose.value.localBones,frozenPose.value.bones)
          :renderedBones.value;
        try{const keyed=animation.boneAnimationEdit(edit,baseline);if(!keyed)return true;edit=keyed;}
        catch(error){showNotice(errorMessage(error),true);return false;}
      }else if(edit.type==='setActiveAttachment'||edit.type==='setSlotColor'||edit.type==='setSlotDarkColor'){
        try{const keyed=animation.slotAnimationEdit(edit);if(!keyed)return true;edit=keyed;}
        catch(error){showNotice(errorMessage(error),true);return false;}
      }else if(edit.type==='moveVertex'||edit.type==='moveVertices'||edit.type==='moveMesh'||edit.type==='moveClippingVertices'||edit.type==='transformAttachments'||edit.type==='attachmentEdit'){
        try{const keyed=animation.deformAnimationEdit(edit,renderedBones.value);if(!keyed)return true;edit=keyed;}
        catch(error){showNotice(errorMessage(error),true);return false;}
      }else if(!['createAnimation','renameAnimation','deleteAnimation','duplicateAnimation','setAnimationFps','setAnimationKey','setAnimationKeys','setAnimationSlotKeys','setAnimationKeyBatch','setAnimationDrawOrderKeys','setAnimationDeformKeys','setAnimationDeformVertices','setAnimationConstraintKeys','setAnimationEventKeys','setAnimationSequenceKeys','createEvent','renameEvent','updateEvent','deleteEvent','moveAnimationKeys','deleteAnimationKeys','undo','redo'].includes(edit.type)){
        showNotice('Switch to Setup to change the skeleton structure.',true);return false;
      }
    }
    let succeeded = false;
    const selectionAtStart=selectionEpoch,originalType=edit.type,weightKeyAtStart=weightSelectionKey.value;
    const scopedMeshEdits=new Set(['convertMesh','triangulateMesh','resetMesh','autoWeights','normalizeWeights','moveMesh','moveVertex','moveVertices','paintWeights','addVertex','deleteVertex','meshEdge','bindMesh','setWeight','meshStroke']);
    if(sceneEditing.value&&selectedAttachmentId.value!==null&&scopedMeshEdits.has(edit.type))edit={type:'attachmentEdit',id:selectedAttachmentId.value,edit};
    const publishAnimationEdit=animation.prepareAnimationDraftCommit(edit);
    editing.value = true;
    const operation = run(async () => {
      if(edit.type==='create'&&autoColor.value){const parent=edit.parent;edit={...edit,color:childColor(project.value!.bones.find(b=>b.id===parent))};}
      if(edit.type==='setBoneColor')autoColor.value=false;
      const needsEvaluatedPose=geometryTypes.has(edit.type)||edit.type==='matchTransform'||edit.type==='setAnimationDeformVertices'||((edit.type==='setAnimationKeys'||edit.type==='setAnimationKey')&&poseEpoch!==undefined);
      const snapshot=needsEvaluatedPose&&(constraints.value.length||edit.type==='setAnimationDeformVertices')&&poseEpoch===undefined?await freezePose():null;
      const editEpoch=needsEvaluatedPose?poseEpoch??snapshot?.poseEpoch:undefined;
      if(editorMode.value==='animate'&&editEpoch!==undefined&&!validAnimationLease(editEpoch))throw new Error('The animation pose changed. Start the gesture again.');
      const result = await api.editRig(edit, expectedRevision ?? project.value!.revision,editEpoch);
      if(!publishAnimationEdit(()=>{project.value=result;}))return;
      if(['convertMesh','resetMesh','addVertex','deleteVertex','meshStroke','insertClippingVertex','deleteClippingVertex'].includes(originalType))invalidateWeightVertices(weightKeyAtStart);
      if(selectionAtStart===selectionEpoch){
        const preserveAnimationSelection=editorMode.value==='animate'&&['undo','redo'].includes(originalType);
        const focusHistory=!preserveAnimationSelection&&['undo','redo'].includes(originalType),focusCreation=['create','createSlot','createClipping','addConstraint','addPhysicsToBones'].includes(originalType);
        const sameSlot = selectedSlotId.value === result.editedSlot;
        if(!sceneEditing.value||focusHistory&&selectedConstraintIds.value.length<2||focusCreation){
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
        const weightEdit=['bindAttachment','setAttachmentWeight','paintAttachmentWeights','autoAttachmentWeights','normalizeAttachmentWeights'].includes(originalType);
        // Animate edits cannot change topology. Keep the vertex actually picked
        // in this viewport instead of importing old Setup/history focus (which
        // is absent after Open and may refer to a different vertex before it).
        if(editorMode.value==='animate'){
          if(selectedVertex.value!==null&&!selectedBinding.value?.vertices[selectedVertex.value])selectedVertex.value=null;
        }else if(!weightEdit&&originalType!=='setAttachmentImagePath')selectedVertex.value=result.editedVertex??(sameSlot&&['moveVertices','paintWeights','bindMesh','autoWeights','normalizeWeights','triangulateMesh'].includes(originalType)?selectedVertex.value:null);
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
      }
      succeeded = true;
    }).then(() => succeeded);
    editFlight = operation;
    try { return await operation; }
    finally { if (editFlight === operation) { editFlight = null; editing.value = false;if(!traceOpen.value&&!clippingDraft.value)releasePose(); } }
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
  function selectBone(id: number | null) { selectionEpoch++;clearObjectSelection(); librarySelection.value=null; selectedIds.value=id===null?[]:[id]; selectedId.value = id; selectedSlotId.value = null; selectedVertex.value = null; inspectorError.value = ''; }
  function selectSlot(id: number | null,modifiers:{toggle?:boolean;shift?:boolean;ordered?:number[]}={}) {
    selectionEpoch++;librarySelection.value=null;selectedAttachmentId.value=null;selectedAttachmentIds.value=[];clearConstraintSelection();selectedEventId.value=null;
    if(id !== selectedSlotId.value)selectedVertex.value=null;
    let ids=id===null?[]:[id];
    if(id!==null&&modifiers.shift&&modifiers.ordered&&selectedSlotId.value!==null){const a=modifiers.ordered.indexOf(selectedSlotId.value),b=modifiers.ordered.indexOf(id);if(a>=0&&b>=0)ids=modifiers.ordered.slice(Math.min(a,b),Math.max(a,b)+1);}
    else if(id!==null&&modifiers.toggle)ids=selectedSlotIds.value.includes(id)?selectedSlotIds.value.filter(v=>v!==id):[...selectedSlotIds.value,id];
    selectedSlotIds.value=ids.filter(id=>slots.value.some(s=>s.id===id));selectedSlotId.value=id!==null&&selectedSlotIds.value.includes(id)?id:selectedSlotIds.value.at(-1)??null;inspectorError.value='';
  }
  function selectSceneAttachments(ids:number[],active:number|null){
    selectionEpoch++;librarySelection.value=null;clearConstraintSelection();selectedEventId.value=null;
    const valid=new Set(sceneAttachments.value.map(a=>a.id));selectedAttachmentIds.value=[...new Set(ids)].filter(id=>valid.has(id));
    selectedAttachmentId.value=active!==null&&selectedAttachmentIds.value.includes(active)?active:selectedAttachmentIds.value.at(-1)??null;
    selectedSlotIds.value=[...new Set(sceneAttachments.value.filter(a=>selectedAttachmentIds.value.includes(a.id)).map(a=>a.slot))];
    selectedSlotId.value=sceneAttachments.value.find(a=>a.id===selectedAttachmentId.value)?.slot??null;selectedVertex.value=null;inspectorError.value='';
  }
  function selectAttachment(id:number,modifiers:{toggle?:boolean;shift?:boolean;ordered?:number[]}={}){
    let ids=[id];
    if(modifiers.shift&&modifiers.ordered&&selectedAttachmentId.value!==null){const a=modifiers.ordered.indexOf(selectedAttachmentId.value),b=modifiers.ordered.indexOf(id);if(a>=0&&b>=0)ids=modifiers.ordered.slice(Math.min(a,b),Math.max(a,b)+1);}
    else if(modifiers.toggle)ids=selectedAttachmentIds.value.includes(id)?selectedAttachmentIds.value.filter(v=>v!==id):[...selectedAttachmentIds.value,id];
    selectSceneAttachments(ids,ids.includes(id)?id:ids.at(-1)??null);
  }
  function clearConstraintSelection(){selectedConstraintId.value=null;selectedConstraintIds.value=[];constraintSelectionAnchor.value=null;}
  function selectConstraint(id:number|null,modifiers:{toggle?:boolean;shift?:boolean;ordered?:number[]}={}){
    const valid=new Set(constraints.value.map(c=>c.id)),current=selectedConstraintIds.value.filter(id=>valid.has(id)),active=selectedConstraintId.value,anchor=constraintSelectionAnchor.value;
    let ids:number[]=[],nextAnchor=anchor;
    if(id!==null&&valid.has(id)){
      const ordered=[...new Set(modifiers.ordered??[...valid])].filter(value=>valid.has(value));
      if(modifiers.shift&&anchor!==null&&ordered.includes(anchor)&&ordered.includes(id)){
        const a=ordered.indexOf(anchor),b=ordered.indexOf(id),range=ordered.slice(Math.min(a,b),Math.max(a,b)+1);ids=modifiers.toggle?[...new Set([...current,...range])]:range;
      }else{ids=modifiers.toggle?(current.includes(id)?current.filter(value=>value!==id):[...current,id]):[id];nextAnchor=id;}
    }
    selectionEpoch++;clearObjectSelection();selectedConstraintIds.value=ids;selectedConstraintId.value=id!==null&&ids.includes(id)?id:active!==null&&ids.includes(active)?active:ids.at(-1)??null;constraintSelectionAnchor.value=ids.length?nextAnchor:null;
    selectedSlotId.value=null;librarySelection.value=null;selectedVertex.value=null;inspectorError.value='';
  }
  function selectBones(ids:number[],active:number|null){
    selectionEpoch++;
    clearObjectSelection();
    librarySelection.value=null;
    selectedIds.value=[...new Set(ids)].filter(id=>project.value?.bones.some(b=>b.id===id));selectedId.value=active!==null&&selectedIds.value.includes(active)?active:selectedIds.value.at(-1)??null;selectedSlotId.value=null;selectedVertex.value=null;inspectorError.value='';
  }
  function escapeSelection(){if(parentPicking.value){cancelParentPick();return;}if(clippingDraft.value){cancelClipping();return;}if(editMode.value==='weights'&&selectedBinding.value){clearWeightVertices();clearBoneHover();return;}if(editMode.value==='clipping')editMode.value='images';clearBoneHover();selectBones([],null);selectSlot(null);selectedVertex.value=null;tool.value='translate';meshTool.value='move';}
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
  async function editAttachmentTransform(patch:Partial<Pick<RegionView,'x'|'y'|'rotation'|'scaleX'|'scaleY'>>,revision?:number){
    const a=selectedAttachment.value,r=a?.region;if(!a||!r||a.mesh)return false;
    const fields={x:r.x,y:r.y,rotation:r.rotation,scaleX:r.scaleX,scaleY:r.scaleY,...patch};
    if(sceneEditing.value)return editRig({type:'updateAttachment',id:a.id,...fields},revision);
    const s=selectedSlotRaw.value;return s?editRig({type:'updateSlot',id:s.id,name:s.name,bone:s.bone,visible:s.visible,...fields},revision):false;
  }
  async function createConstraint(constraint:ConstraintInput){return sceneEditing.value?editRig({type:'addConstraint',constraint}):false;}
  async function addPhysicsToSelectedBones(){
    const documentId=project.value?.documentId,selection=selectionEpoch,bones=[...physicsBoneIds.value];
    if(editFlight&&!(await editFlight))return false;
    if(documentId!==project.value?.documentId||selection!==selectionEpoch||!canAddPhysics.value||!bones.length)return false;
    return editRig({type:'addPhysicsToBones',bones});
  }
  async function editConstraintById(id:number,patch:Partial<ConstraintInput>,revision?:number){
    const c=constraints.value.find(value=>value.id===id);if(!sceneEditing.value||!c)return false;
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
    if(selected.some(c=>!c)||!selected[0]||selected.some(c=>c!.type!==selected[0]!.type))return false;
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
  async function removeConstraintById(id:number,revision?:number){return sceneEditing.value&&constraints.value.some(c=>c.id===id)?editRig({type:'deleteConstraint',id},revision):false;}
  async function removeConstraint(){return selectedConstraintId.value===null?false:removeConstraintById(selectedConstraintId.value);}
  async function reorderConstraint(id:number,index:number){return sceneEditing.value?editRig({type:'reorderConstraint',id,index}):false;}
  async function createClipping(input:Omit<Extract<RigEdit,{type:'createClipping'}>,'type'>){return sceneEditing.value?editRig({type:'createClipping',...input}):false;}
  async function editClipping(patch:Partial<Pick<ClippingView,'endSlot'|'convex'|'inverse'|'color'>>,revision?:number){const a=selectedAttachment.value,c=a?.clipping;return sceneEditing.value&&a&&c?editRig({type:'setClipping',id:a.id,endSlot:c.endSlot,convex:c.convex,inverse:c.inverse,color:c.color,...patch},revision):false;}
  function beginClipping(input:Pick<ClippingDraft,'slot'|'name'|'endSlot'|'convex'|'inverse'>){
    const model=project.value;
    if(!sceneEditing.value||!canEdit.value||busy.value||editing.value||!model||!slots.value.some(s=>s.id===input.slot)||!slots.value.some(s=>s.id===input.endSlot))return false;
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
    if(editorMode.value!=='setup'||!canEdit.value||busy.value||!project.value||inspectorError.value||eventKeyError.value)return;
    const selected=selectedEventId.value;editing.value=true;let success=false;
    const operation=run(async()=>{const result=await api.chooseAudioFolder(project.value!.revision);if(result){project.value=result;if(selected!==null&&result.events?.some(event=>event.id===selected))selectEvent(selected);success=true;if(result.audioLibrary?.warnings.length)showNotice(result.audioLibrary.warnings[0]!,true);}}).then(()=>success);
    editFlight=operation;try{await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  function cancelTrace(){traceOpen.value=false;tracePreview.value=null;tracePending=false;traceGeneration++;releasePose();}
  function openTrace(inner=false){if(!selectedSlot.value?.region||!canEdit.value)return;traceOptions.inner=inner;traceOpen.value=true;void previewTrace();}
  function previewTrace():Promise<void>{
    traceGeneration++;tracePending=true;if(traceFlight)return traceFlight;
    traceBusy.value=true;
    const operation=(async()=>{try{while(tracePending&&traceOpen.value){tracePending=false;const request=traceGeneration,slot=selectedSlot.value,model=project.value,options={...traceOptions};if(!slot||!model)break;
      const attachmentId=selectedAttachmentId.value;
      try{const snapshot=await freezePose();const preview=await(sceneEditing.value&&attachmentId!==null?api.previewTraceAttachment(attachmentId,options,model.revision,snapshot?.poseEpoch):api.previewTrace(slot.id,options,model.revision));if(request===traceGeneration&&JSON.stringify(options)===JSON.stringify(traceOptions)&&project.value?.documentId===model.documentId&&project.value?.revision===model.revision&&selectedSlotId.value===slot.id&&selectedAttachmentId.value===attachmentId)tracePreview.value=preview;}catch(error){if(request===traceGeneration){tracePreview.value=null;showNotice(errorMessage(error),true);}}
    }}finally{traceBusy.value=false;traceFlight=null;}})();
    traceFlight=operation;return operation;
  }
  async function applyTrace(){
    if(editFlight)await editFlight;if(!tracePreview.value||!project.value||traceBusy.value||busy.value||inspectorError.value)return;
    const preview=tracePreview.value,weightKey=weightSelectionKey.value;editing.value=true;let success=false;
    const operation=run(async()=>{project.value=await(preview.attachmentId!==undefined?api.applyTraceAttachment(preview.attachmentId,{...traceOptions},preview.expectedRevision,preview.poseEpoch):api.applyTrace(preview.slotId,{...traceOptions},preview.expectedRevision));invalidateWeightVertices(weightKey);selectedSlotId.value=preview.slotId;selectedVertex.value=null;editMode.value='meshes';tool.value='translate';meshTool.value='move';meshEditUvs.value=true;cancelTrace();success=true;}).then(()=>success);
    editFlight=operation;try{await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  watch(traceOptions,()=>{tracePreview.value=null;traceGeneration++;},{deep:true,flush:'sync'});
  watch(()=>[project.value?.revision,project.value?.documentId,selectedSlotId.value,selectedAttachmentId.value],(current,previous)=>{if(traceOpen.value&&previous&&current.some((value,i)=>value!==previous[i]))cancelTrace();},{flush:'sync'});

  function canUpdateImageResources(){
    const error=inspectorError.value||animationKeyError.value||eventKeyError.value||sequenceFieldError.value||attachmentColorError.value;
    if(error){showNotice(error,true);return false;}
    return canEdit.value&&!busy.value&&!!project.value&&!newDialog.value&&!discardDialog.value&&!traceOpen.value&&!clippingDraft.value&&!parentPicking.value;
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
    if(!canEdit.value||busy.value||!project.value||inspectorError.value||traceOpen.value||clippingDraft.value||!keys.length)return false;
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
    if(!sceneEditing.value||!canEdit.value||busy.value||!project.value||traceOpen.value||clippingDraft.value||inspectorError.value||!keys.length)return false;
    let success=false;editing.value=true;
    const operation=run(async()=>{const result=await api.placeAttachments(keys,slot,project.value!.revision);project.value=result;selectedSlotId.value=slot;selectedSlotIds.value=[slot];selectedAttachmentId.value=result.editedAttachment??null;selectedAttachmentIds.value=selectedAttachmentId.value===null?[]:[selectedAttachmentId.value];clearConstraintSelection();selectedVertex.value=null;editMode.value='images';success=true;}).then(()=>success);
    editFlight=operation;try{return await operation;}finally{if(editFlight===operation){editFlight=null;editing.value=false;}}
  }
  function setMode(mode: EditMode) {
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
    const compatible=!!previous&&current[0]===previous[0]&&previewRuntime.adopt({bones:project.value?.bones??[],constraints:constraints.value});
    if(compatible){frozenPose.value=null;resumeSimulation('geometry');publishPreview();}else resetSimulation();
    if(!previous||current[2]!==previous[2]){clearObjectSelection();clippingDraft.value=null;}
    else{
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
    animationPhysicsTime,animationPhysicsError,animationPhysicsSupported,animationPhysicsGeneration,resetAnimationPhysicsPreview,
    renderedBones,frozenPose,freezePose,releasePose,previewBonePose,endBonePreview,simulationIntent,simulationRunning,simulationTime,simulationError,simulationReset,simulationStep,runSimulation,pauseSimulation,stepSimulation,resetSimulation,advanceSimulation,suspendSimulation,resumeSimulation,setPreviewVisible,
    sceneEditing,sceneSlots,sceneAttachments,selectedSlotRaw,selectedSlotIds,selectedAttachmentId,selectedAttachmentIds,selectedAttachment,selectedBinding,selectAttachment,selectSceneAttachments,
    selectedConstraintId,selectedConstraintIds,selectedConstraints,selectedConstraint,constraints,selectConstraint,treeFilters,selectedEventId,selectedEvent,currentEventKey,selectEvent,createEvent,patchEventDefinition,audioLibrary,chooseAudioFolder,selectedEventAudioPlayable,previewEventAudio,stopAnimationAudio,eventPlaybackText,eventPlaybackCount,audioPlaybackCount,lastAudioPlayback,lastAnimationEvent,
    parentPicking,beginParentPick,cancelParentPick,canPickParent,chooseParent,
    createSlot,toggleAttachment,renameAttachment,setAttachmentImagePath,removeAttachment,moveAttachment,editAttachmentTransform,placeAttachments,
    createConstraint,physicsBoneIds,canAddPhysics,addPhysicsToSelectedBones,editConstraint,editConstraintById,editSelectedConstraintField,editTransformRange,matchTransform,removeConstraint,removeConstraintById,reorderConstraint,createClipping,editClipping,
    clippingDraft,beginClipping,appendClippingPoint,finishClipping,cancelClipping,beginClippingEdit,
    hoveredBoneId,hoverBone,clearBoneHover,chooseInfluence,
    weightVertices,weightBones,weightLocks,toggleWeightLock,weightActiveVertex,selectWeightVertices,clearWeightVertices,clearWeightBones,weightAutoEdit,
    grid, zoom, resetCount, tool, transformPivot, initialize, request, create, copy, showNotice,
    save, exportRuntime, saveAndContinue, discardAndContinue, cancelDiscard,
    traceOpen,traceBusy,traceOptions,tracePreview,viewSlots,openTrace,previewTrace,applyTrace,cancelTrace,
    selectedIds,selectBones,escapeSelection,autoColor,applyAutoColors,meshEditUvs,library,librarySelection,librarySelectedKeys,selectLibraryImage,chooseImagesFolder,refreshImagesFolder,placeImage,placeImages,
    selectedId, selectedBone, canEdit, editRig, addBone, removeBone,
    selectedVertex, meshTool, influence, softSelection, softSize, softFeather, brushMode, brushStrength, brushSize, brushFeather,
    slots, selectedSlotId, selectedSlot, editMode, selectBone, selectSlot, setMode, importImage, removeSelection };
});
