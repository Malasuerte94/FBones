<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace, type Intent } from './stores/workspace';
import { desktop } from './services/desktop';
import { onEditorCommand, nativeWindow } from './services/bridge';
import { validProjectName, type EditMode } from './domain/project';
import AppButton from './components/atoms/AppButton.vue';
import AppIcon from './components/atoms/AppIcon.vue';
import ModalDialog from './components/molecules/ModalDialog.vue';
import PhysicsPreviewControls from './components/molecules/PhysicsPreviewControls.vue';
import ProjectInspectionNotice from './components/molecules/ProjectInspectionNotice.vue';
import ProjectViewport from './components/organisms/ProjectViewport.vue';
import AnimationTimeline from './components/organisms/AnimationTimeline.vue';
import AnimationTools from './components/organisms/AnimationTools.vue';
import AnimationPreview from './components/organisms/AnimationPreview.vue';
import SceneTree from './components/organisms/SceneTree.vue';
import MeshTools from './components/organisms/MeshTools.vue';
import WeightsPanel from './components/organisms/WeightsPanel.vue';
import DockWorkspace from './components/organisms/DockWorkspace.vue';
import ConstraintViewPanel from './components/organisms/ConstraintViewPanel.vue';
import {cloneDockLayout,defaultDockLayout,dockPanel,dockPanels,dockStorageKey,readDockLayout,type DockPanelId} from './domain/dockLayout';
import BoneInspector from './components/organisms/BoneInspector.vue';
import {useBoneFieldEditor} from './composables/useBoneFieldEditor';

import SlotInspector from './components/organisms/SlotInspector.vue';
import AttachmentInspector from './components/organisms/AttachmentInspector.vue';
import ConstraintInspector from './components/organisms/ConstraintInspector.vue';
import EventInspector from './components/organisms/EventInspector.vue';
import ConstraintCreator from './components/organisms/ConstraintCreator.vue';
import ClippingCreator from './components/organisms/ClippingCreator.vue';
import TracePanel from './components/organisms/TracePanel.vue';
import type { EditorTool } from './domain/project';
import { toolEditMode } from './domain/toolMode';

const { t } = useI18n();
const w = useWorkspace();
const timelineSlots=computed(()=>(w.project?.slots??[]).map(slot=>({id:slot.id,boneId:slot.bone,name:slot.name,tintBlack:slot.tintBlack,attachments:slot.attachments?.map(attachment=>({id:attachment.id,name:attachment.name,sequence:attachment.sequence}))??(slot.region?[{id:slot.id,name:slot.region.name}]:[])})));
const timelineSelectedConstraints=computed(()=>w.selectedConstraintId===null?[]:[w.selectedConstraintId]);
const timelineInterpolations:Array<'linear'|'stepped'|'bezier'>=['linear','stepped','bezier'];
const boneEditor=useBoneFieldEditor(()=>t('invalidTransform'));
const timeline=ref<InstanceType<typeof AnimationTimeline>>();
async function newAnimation(){await w.setEditorMode('animate');await nextTick();if(w.editorMode==='animate')timeline.value?.beginName('create');}
const eventCreator=ref(false),eventName=ref('event');
const eventNameValid=computed(()=>{const value=eventName.value.trim();return value.length>0&&[...value].length<=120&&!/\p{Cc}/u.test(value)&&!w.eventDefinitions.some(event=>event.name===value);});
function newEvent(){if(w.editorMode!=='setup')return;let value='event',index=2;while(w.eventDefinitions.some(event=>event.name===value))value='event '+index++;eventName.value=value;eventCreator.value=true;}
async function submitEvent(){if(eventNameValid.value&&await w.createEvent(eventName.value.trim()))eventCreator.value=false;}
const timelineHeight=ref(Math.round(window.innerHeight*.4));
try{const saved=Number(localStorage.getItem('fbones.animation-height'));if(Number.isFinite(saved)&&saved>=190)timelineHeight.value=saved;}catch{/* optional workspace preference */}
let stopTimelineResize:(()=>void)|null=null;
function resizeTimeline(event:PointerEvent){
 if(event.button!==0)return;event.preventDefault();const start=event.clientY,height=timelineHeight.value;
 const move=(e:PointerEvent)=>{timelineHeight.value=Math.max(190,Math.min(window.innerHeight*.7,height+start-e.clientY));};
 const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);stopTimelineResize=null;try{localStorage.setItem('fbones.animation-height',String(timelineHeight.value));}catch{/* optional */}};
 stopTimelineResize?.();window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);stopTimelineResize=finish;
}
function timelineResizeKey(event:KeyboardEvent){if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();timelineHeight.value=Math.max(190,Math.min(window.innerHeight*.7,timelineHeight.value+(event.key==='ArrowUp'?20:-20)));}}
function timelineSelectBone(id:number,additive:boolean){if(additive){const ids=w.selectedIds.includes(id)?w.selectedIds.filter(b=>b!==id):[...w.selectedIds,id];w.selectBones(ids,ids.includes(id)?id:ids.at(-1)??null);}else w.selectBone(id);}
function changeEditorMode(value:'setup'|'animate'){(document.activeElement as HTMLElement|null)?.blur();void w.setEditorMode(value);}
const name = ref('Untitled');
const submitted = ref(false);
const constraintCreator=ref<'ik'|'transform'|null>(null),clippingCreator=ref(false);
async function createConstraint(type:'ik'|'transform'|'physics'){
  if(type!=='physics'){constraintCreator.value=type;return;}
  const count=w.physicsBoneIds.length;
  if(!count){w.showNotice(t('selectPhysicsBones'),true);return;}
  (document.activeElement as HTMLElement|null)?.blur();
  if(await w.addPhysicsToSelectedBones())w.showNotice(t('physicsAdded',{count}));
}
watch(()=>!!constraintCreator.value||clippingCreator.value||eventCreator.value,open=>{if(open)w.suspendSimulation('creator-modal');else w.resumeSimulation('creator-modal');},{flush:'sync'});
function storedLayout(){try{return localStorage.getItem(dockStorageKey);}catch{return null;}}
const setupDockLayout=ref(readDockLayout(storedLayout(),window.innerWidth<1340));
const animateLayout=defaultDockLayout(window.innerWidth<1100);dockPanel(animateLayout,'mesh').visible=false;
const animationDockLayout=ref(animateLayout);
try{const saved=localStorage.getItem('fbones.animate-dock-layout.v1');if(saved)animationDockLayout.value=readDockLayout(saved,window.innerWidth<1100);}catch{/* optional workspace preference */}
const dockLayout=computed({get:()=>w.editorMode==='animate'?animationDockLayout.value:setupDockLayout.value,set:value=>{if(w.editorMode==='animate')animationDockLayout.value=value;else setupDockLayout.value=value;}});
const dockTitles=computed(()=>({weights:t('weights'),mesh:t('meshTools'),tree:t('tree'),properties:w.editorMode==='animate'?'Preview':t('properties'),ik:t('constraint_ik'),transform:t('constraint_transform'),physics:t('constraint_physics')}));
function showPanel(id:DockPanelId,visible=true){const copy=cloneDockLayout(dockLayout.value);dockPanel(copy,id).visible=visible;dockLayout.value=copy;}
const showWeights=computed({get:()=>dockPanel(dockLayout.value,'weights').visible,set:value=>showPanel('weights',value)});
const showMesh=computed({get:()=>dockPanel(dockLayout.value,'mesh').visible,set:value=>showPanel('mesh',value)});
watch(dockLayout,value=>{try{localStorage.setItem(w.editorMode==='animate'?'fbones.animate-dock-layout.v1':dockStorageKey,JSON.stringify(value));}catch{/* Workspace layout is optional local UI state. */}},{deep:true});
function resetLayout(){dockLayout.value=defaultDockLayout(window.innerWidth<1340);}

watch(()=>w.editMode,value=>{if(value==='weights')showWeights.value=true;});
function mode(value:EditMode){if(w.clippingDraft)w.cancelClipping();if(w.traceOpen)w.cancelTrace();const target=w.editorMode==='animate'&&value==='meshes'&&w.selectedAttachment?.clipping?'clipping':value;if(w.editMode!==target)w.setMode(target);if(value==='weights')showWeights.value=true;if(value==='meshes'||value==='clipping')showMesh.value=true;}
const displayedAttachment=computed(()=>w.treeFilters.attachment?w.selectedAttachment:null);
const displayedConstraint=computed(()=>w.treeFilters.constraint?w.selectedConstraint:null);
const displayedSlot=computed(()=>w.treeFilters.slot&&(!w.selectedAttachment||!w.treeFilters.attachment)?w.selectedSlotRaw:null);
const displayedBone=computed(()=>w.treeFilters.bone?w.selectedBone:null);
const selectedImage=computed(()=>w.library.images.find(image=>image.key===w.librarySelection)??null);
const imageTransforms=computed(()=>w.sceneEditing&&w.editMode==='images'&&w.selectedAttachmentIds.length>0);
const transformSelectionCount=computed(()=>imageTransforms.value?w.selectedAttachmentIds.length:w.selectedIds.length);
const hasPhysics=computed(()=>w.sceneEditing&&w.constraints.some(c=>c.type==='physics'));
const transformTools:ReadonlyArray<{id:EditorTool;label:string;key:string}>= [{id:'translate',label:'translate',key:'V'},{id:'rotate',label:'rotate',key:'C'},{id:'scale',label:'scale',key:'X'},{id:'shear',label:'shear',key:'Z'},{id:'pose',label:'pose',key:''},{id:'length',label:'lengthTool',key:'L'}];
function useTool(tool:EditorTool){if(w.editorMode==='animate'&&!(['translate','select','pan'].includes(tool)||(tool==='rotate'||tool==='pose'?w.animationChannels.includes('rotate'):tool==='scale'?w.animationChannels.includes('scale'):tool==='shear'?w.animationChannels.includes('shear'):false))){w.showNotice('This animation tool is not available yet.',true);return;}const target=toolEditMode({mode:w.editMode,sceneEditing:w.sceneEditing,selectedAttachmentIds:w.selectedAttachmentIds},tool);if(target!==w.editMode)mode(target);w.tool=tool;}
function rename(){if(!w.canEdit||w.busy)return;const field=document.querySelector<HTMLInputElement>(w.selectedConstraint?'[data-testid="constraint-name"]':w.selectedAttachment?'[data-testid="attachment-name"]':w.selectedSlot?'[data-testid="slot-name"]':'[data-testid="bone-name"]');field?.focus();field?.select();}
const nameValid = computed(() => validProjectName(name.value));
let cleanup: Array<() => void> = [];
let disposed = false;

function command(id: string) {
  if(w.parentPicking)w.cancelParentPick();
  if(constraintCreator.value||clippingCreator.value||eventCreator.value){if(['save','copy','export-runtime','undo','redo','import'].includes(id))return;constraintCreator.value=null;clippingCreator.value=false;eventCreator.value=false;}
  if(w.clippingDraft){if(['save','copy','undo','redo','import'].includes(id)){w.showNotice(t('clippingFinishFirst'));return;}if(['new','open','close','quit'].includes(id))w.cancelClipping();}
  document.querySelectorAll<HTMLDetailsElement>('details.editor-menu[open]').forEach(el=>{el.open=false;});
  if(w.traceOpen){if(['save','copy','undo','redo','import'].includes(id)){w.showNotice(t('traceFinishFirst'));return;}if(['new','open','close','quit'].includes(id))w.cancelTrace();}
  if (w.newDialog && ['save', 'copy', 'undo', 'redo', 'import'].includes(id)) return;
  if (w.discardDialog && ['undo', 'redo', 'import'].includes(id)) return;
  if (['save', 'copy', 'export-runtime', 'undo', 'redo', 'import'].includes(id)) (document.activeElement as HTMLElement | null)?.blur();
  if (id === 'undo' || id === 'redo') void w.editRig({ type: id });
  if(id==='new')openNew();
  if (['open', 'close', 'quit'].includes(id)) void w.request(id as Intent);
  if (id === 'copy') void w.copy();
  if (id === 'save') void w.save();
  if (id === 'export-runtime') void w.exportRuntime();
  if (id === 'import') void w.chooseImagesFolder();
}
function keyboard(event: KeyboardEvent) {
  if(event.defaultPrevented)return;
  if(w.parentPicking){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();w.cancelParentPick();}return;}
  if(constraintCreator.value||clippingCreator.value||eventCreator.value){if(event.key==='Escape'){event.preventDefault();constraintCreator.value=null;clippingCreator.value=false;eventCreator.value=false;}return;}
  if(w.clippingDraft){if(event.key==='Escape'){event.preventDefault();w.cancelClipping();}else if(event.key==='Enter'){event.preventDefault();void w.finishClipping();}return;}
  const target = event.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable="true"]') || w.newDialog || w.discardDialog) return;
  if(w.traceOpen){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();w.cancelTrace();}
    else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();w.showNotice(t('traceFinishFirst'));}
    return;
  }
  if(w.editorMode==='animate'&&!event.ctrlKey&&!event.metaKey){
    if(event.key===' '){if(target.closest('button')){event.stopPropagation();return;}event.preventDefault();event.stopPropagation();if(w.animationPlaying)w.pauseAnimation();else w.playAnimation();return;}
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();w.seekAnimation(w.animationFrame+(event.key==='ArrowRight'?1:-1));return;}
    if(event.key.toLowerCase()==='k'){event.preventDefault();if(w.selectedEventId!==null)void w.insertEventAnimationKey(w.selectedEventId);else if(w.selectedConstraint)void w.insertConstraintAnimationKeys({constraintId:w.selectedConstraint.id,kind:w.selectedConstraint.type==='transform'?'transformMix':w.selectedConstraint.type});else if(w.selectedAttachment?.sequence)void w.insertSequenceAnimationKey(w.selectedAttachment.id);else if(w.selectedSlotId!==null)void w.insertSlotAnimationKeys({slotId:w.selectedSlotId,channel:'attachment'});else void w.keyAnimationChanges(w.tool==='pose'||w.tool==='rotate'?'rotate':w.tool==='scale'?'scale':w.tool==='shear'?'shear':'translate');return;}
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
function openNew() { if(w.traceOpen)w.cancelTrace(); name.value = t('untitled'); submitted.value = false; void w.request('new'); }

onMounted(async () => {
  document.addEventListener('keydown', keyboard);
  await w.initialize();
  if (desktop) {
    const handlers = await Promise.all([
      onEditorCommand(command),
      nativeWindow().onCloseRequested((event) => { event.preventDefault(); command('quit'); }),
    ]);
    if (disposed) handlers.forEach((stop) => stop()); else cleanup = handlers;
  }
});
onBeforeUnmount(() => {
  stopTimelineResize?.();
  w.resumeSimulation('creator-modal');w.stopAnimationAudio(); disposed = true; document.removeEventListener('keydown', keyboard); cleanup.forEach((stop) => stop()); });
</script>

<template>
  <main class="flex h-full min-h-0 flex-col select-none" :aria-busy="w.busy">
    <header class="editor-header">
      <div class="mr-2 flex items-center gap-1.5 text-accent"><AppIcon name="logo" class="!size-5"/><span class="font-semibold tracking-wide text-ink">{{ t('appName') }}</span></div>
      <details class="editor-menu"><summary>{{ t('fileMenu') }}</summary><div class="menu-popover">
        <button @click="openNew">{{ t('newProject') }}<span>Ctrl+N</span></button><button @click="command('open')">{{ t('openProject') }}<span>Ctrl+O</span></button><button :disabled="!w.project?.canSave" @click="command('save')">{{ t('save') }}<span>Ctrl+S</span></button><button :disabled="!w.project?.canCopy" @click="command('copy')">{{ t('saveAs') }}<span>Ctrl+Shift+S</span></button><button data-testid="export-runtime" :disabled="!desktop||!w.canEdit||!w.sceneEditing||w.busy||!!w.inspectorError||!!w.animationKeyError||!!w.eventKeyError||!!w.sequenceFieldError||!!w.attachmentColorError||w.traceOpen||!!w.clippingDraft" @click="command('export-runtime')">{{ t('exportRuntime') }}</button><hr/><button :disabled="!w.project" @click="command('close')">{{ t('closeProject') }}<span>Ctrl+W</span></button>
      </div></details>
      <AppButton variant="ghost" :disabled="w.busy" :aria-label="t('newProject')" :title="t('newProject')" @click="openNew"><AppIcon name="plus"/></AppButton>
      <AppButton variant="ghost" :disabled="w.busy" :aria-label="t('openProject')" :title="t('openProject')" @click="command('open')"><AppIcon name="folder"/></AppButton>
      <AppButton variant="ghost" :disabled="w.traceOpen||(w.busy&&!w.editing)||!(w.project?.canSave||w.project?.canCopy)" :aria-label="t('save')" :title="t('save')" @click="command(w.project?.canSave?'save':'copy')"><AppIcon name="save"/></AppButton>
      <span class="toolbar-separator"/>
      <AppButton variant="ghost" :disabled="w.traceOpen||w.busy||!w.project?.canUndo" :aria-label="t('undo')" :title="t('undo')+' (Ctrl+Z)'" @click="command('undo')"><AppIcon name="undo"/></AppButton>
      <AppButton variant="ghost" :disabled="w.traceOpen||w.busy||!w.project?.canRedo" :aria-label="t('redo')" :title="t('redo')+' (Ctrl+Shift+Z)'" @click="command('redo')"><AppIcon name="redo"/></AppButton>
      <span class="toolbar-separator"/>
      <span class="min-w-0 truncate text-xs text-muted">{{ w.project?.name??t('noProject') }}<span v-if="w.project?.dirty" class="ml-1 text-warning">*</span></span>
      <details class="editor-menu ml-auto"><summary>{{ t('views') }}</summary><div class="menu-popover right-0">
        <label v-for="id in dockPanels" :key="id"><input type="checkbox" :checked="dockPanel(dockLayout,id).visible" :data-testid="'view-toggle-'+id" @change="showPanel(id,($event.target as HTMLInputElement).checked)"/>{{dockTitles[id]}}</label><hr/><button data-testid="reset-layout" @click="resetLayout">{{t('resetLayout')}}</button>
      </div></details>
    </header>
    <div class="mode-toolbar">
      <div role="group" aria-label="Editor mode" class="mr-2 flex gap-0.5">
        <button class="dock-tab font-semibold" data-testid="editor-mode-setup" :class="{active:w.editorMode==='setup'}" :aria-pressed="w.editorMode==='setup'" :disabled="w.busy" @click="changeEditorMode('setup')">{{t('setup')}}</button>
        <button class="dock-tab font-semibold" data-testid="editor-mode-animate" :class="{active:w.editorMode==='animate'}" :aria-pressed="w.editorMode==='animate'" :disabled="!w.canEdit||w.busy" @click="changeEditorMode('animate')">{{t('animate')}}</button>
      </div>
      <div role="group" :aria-label="t('editingMode')" class="flex gap-0.5">
        <button v-for="item in (['bones','images','meshes','weights'] as const)" :key="item" class="dock-tab" :class="w.editMode===item||item==='meshes'&&w.editMode==='clipping'?'active':''" :aria-pressed="w.editMode===item||item==='meshes'&&w.editMode==='clipping'" :disabled="w.editorMode==='animate'&&item!=='bones'&&item!=='meshes'" @click="mode(item)"><AppIcon :name="item==='bones'?'bone':item==='images'?'image':item==='meshes'?'mesh':'weights'" class="!size-3.5"/>{{ t(item) }}</button>
      </div>
      <div class="ml-auto flex items-center gap-0.5">
        <AppButton variant="ghost" :aria-label="t('grid')" :aria-pressed="w.grid" :title="t('grid')" @click="w.grid=!w.grid"><AppIcon name="grid" :class="w.grid?'text-accent':''"/></AppButton>
        <AppButton variant="ghost" :aria-label="t('resetView')" :title="t('resetView')+' (F)'" @click="w.resetCount++"><AppIcon name="reset"/></AppButton><span class="w-12 text-right tabular-nums text-muted">{{ w.zoom }}%</span>
      </div>
    </div>
    <div class="flex min-h-0 flex-1">
      <div class="animation-editor-stage">
      <ProjectViewport class="editor-viewport min-w-48 flex-1">
        <div v-if="w.openingProject" class="absolute inset-0 z-50 flex items-center justify-center bg-canvas/70 p-4" data-testid="project-opening" aria-hidden="true">
          <div class="flex max-w-sm items-start gap-3 rounded-sm border border-line bg-panel px-4 py-3 shadow-lg">
            <span aria-hidden="true" class="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"/>
            <div><p class="text-xs font-semibold text-ink">{{t('openingProject')}}</p><p class="mt-1 text-[11px] leading-4 text-muted">{{t('openingProjectDetail')}}</p></div>
          </div>
        </div>
        <div class="pointer-events-none absolute top-3 left-4 text-2xl font-light uppercase tracking-wide text-ink/35">{{ t(w.editorMode) }}</div>
        <div v-if="!w.project" class="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <section class="pointer-events-auto w-full max-w-sm rounded-sm border border-line bg-panel p-6 shadow-xl">
            <AppIcon name="logo" class="mb-4 !size-8 text-accent"/><h1 class="text-xl leading-tight font-semibold">{{ t('welcomeTitle') }}</h1><p class="mt-3 text-xs leading-5 text-muted">{{ t('welcomeText') }}</p>
            <div class="mt-5 flex gap-2"><AppButton variant="primary" :disabled="w.busy" @click="openNew"><AppIcon name="plus"/>{{ t('newProject') }}</AppButton><AppButton :disabled="w.busy" @click="command('open')">{{ t('openProject') }}</AppButton></div>
          </section>
        </div>
        <template v-else>
          <div v-if="w.parentPicking" class="pointer-events-none absolute top-3 left-1/2 z-20 flex max-w-[95%] -translate-x-1/2 items-center gap-3 rounded-sm border border-accent bg-shell px-3 py-2 text-xs shadow-md" data-testid="parent-pick-hint"><span>{{t('parentPickHint')}}</span><button class="pointer-events-auto dock-tab" @click="w.cancelParentPick">{{t('cancel')}}</button></div>
          <PhysicsPreviewControls v-if="w.editorMode==='setup'&&hasPhysics&&!w.project.inspectionOnly" class="pointer-events-auto absolute top-3 right-3 w-56 max-w-[calc(100%-2rem)]" :running="w.simulationRunning" :enabled="w.simulationIntent" :time="w.simulationTime" :error="w.simulationError" :disabled="w.busy||w.traceOpen||!!w.clippingDraft" @run="w.runSimulation" @pause="w.pauseSimulation" @step="w.stepSimulation" @reset="w.resetSimulation"/>
          <p v-if="w.editorMode==='animate'&&w.animationPhysicsError" role="alert" data-testid="animation-physics-viewport-error" class="pointer-events-auto absolute top-3 right-3 max-w-64 rounded-sm border border-danger/50 bg-panel p-2 text-[11px] leading-4 text-danger">{{w.animationPhysicsError}}</p>
          <ProjectInspectionNotice v-if="w.project.inspectionOnly&&!w.openingProject" :name="w.project.name" :busy="w.busy" :can-copy="w.project.canCopy" @open="command('open')" @copy="command('copy')"/>
          <AnimationTools v-if="w.editMode==='bones'&&!w.traceOpen&&!w.clippingDraft" :editor="boneEditor"/>
          <div v-if="w.editMode!=='bones'&&!w.traceOpen&&!w.clippingDraft" class="viewport-controls">
          <div v-if="w.editorMode==='animate'" class="context-toolbar mesh-context" aria-label="Animation deformation tools"><div class="flex items-center gap-1"><AppIcon name="mesh" class="text-accent"/><span class="min-w-0 flex-1 truncate">{{w.selectedAttachment?.name??'Deform'}}</span><button class="dock-tab" data-testid="viewport-deform-key" :disabled="!w.canEdit||w.busy||!w.activeAnimation||!(w.selectedAttachment?.mesh||w.selectedAttachment?.clipping)" aria-label="Key deformation" @click="w.selectedAttachment&&w.insertDeformKey(w.selectedAttachment.id)"><AppIcon name="key" class="!size-3"/></button></div><div class="mt-1 flex items-center gap-1 border-t border-line pt-1"><span class="text-[10px] text-muted">Move vertices · Deform</span><button class="dock-tab ml-auto" @click="mode('bones')">{{t('done')}}</button></div></div>
          <div v-else-if="w.editMode==='clipping'&&w.selectedAttachment?.clipping" class="context-toolbar mesh-context" :aria-label="t('clippingEditToolbar')"><div class="flex items-center gap-1"><AppIcon name="grid" class="text-accent"/><span class="max-w-32 truncate px-1 text-muted">{{w.selectedAttachment.name}}</span><button v-for="item in (['move','add','delete'] as const)" :key="item" class="dock-tab" :class="w.meshTool===item?'active':''" :aria-pressed="w.meshTool===item" :disabled="!w.canEdit||w.busy" @click="w.meshTool=item">{{t(item==='move'?'mesh_move':item==='add'?'mesh_draw':'mesh_delete')}}</button></div><div class="mt-1 flex items-center gap-0.5 border-t border-line pt-1" :aria-label="t('clippingWholeTransform')" :title="t('clippingWholeTransformHint')"><span class="mr-auto px-1 text-[10px] text-muted">{{t('clippingWholeTransform')}}</span><button v-for="item in transformTools.slice(0,3)" :key="item.id" class="dock-tab !px-1.5" :disabled="!w.canEdit||w.busy" :title="t(item.label)+(item.key?' ('+item.key+')':'')" :data-testid="'clipping-transform-'+item.id" @click="useTool(item.id)">{{t(item.label)}}</button></div><div class="mt-1 flex items-center gap-1 border-t border-line pt-1"><span class="text-[10px] text-muted">{{t('clippingEditHint')}}</span><AppButton class="ml-auto" :disabled="w.busy" @click="mode('images')">{{t('done')}}</AppButton></div></div>
          <div v-else-if="w.editMode==='meshes'&&w.selectedSlot?.mesh" class="context-toolbar mesh-context" :aria-label="t('meshEditToolbar')">
            <div class="flex items-center gap-1"><AppIcon name="mesh" class="text-accent"/><span class="max-w-32 truncate px-1 text-muted">{{ w.selectedSlot.name }}</span><span class="toolbar-separator"/>
              <button v-for="item in (['move','draw','delete'] as const)" :key="item" class="dock-tab" :class="w.meshTool===item?'active':''" :aria-pressed="w.meshTool===item" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="w.meshTool=item">{{ t('mesh_'+item) }}</button>
            </div>
            <div class="flex flex-wrap items-center gap-1 border-t border-line pt-1">
              <label class="flex items-center gap-1 px-1 text-muted"><input type="checkbox" :checked="!w.meshEditUvs" :disabled="w.busy||w.traceOpen" @change="w.meshEditUvs=!($event.target as HTMLInputElement).checked">{{ t('deformed') }}</label><span class="toolbar-separator"/>
              <AppButton variant="ghost" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="w.openTrace(false)">{{ t('trace') }}</AppButton><AppButton variant="ghost" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="w.openTrace(true)">{{ t('innerTrace') }}</AppButton>
              <AppButton variant="ghost" :disabled="w.busy||w.traceOpen" @click="mode('images')">{{ t('done') }}</AppButton>
            </div>
          </div>
          <div v-else class="context-toolbar" :aria-label="t('transformTools')">
            <div class="mb-1 flex items-center gap-1 border-b border-line pb-1 text-muted"><AppIcon :name="imageTransforms?(displayedAttachment?.clipping?'grid':'image'):'bone'"/><span class="max-w-40 truncate">{{ displayedAttachment?.name??displayedSlot?.name??displayedBone?.name??t('noSelection') }}</span><span v-if="transformSelectionCount>1" class="ml-auto text-[10px]">{{ t('selectedCount',{count:transformSelectionCount}) }}</span></div>
            <div class="grid grid-cols-3 gap-0.5"><button v-for="item in imageTransforms?transformTools.slice(0,3):transformTools" :key="item.id" class="dock-tab" :class="w.tool===item.id||(item.id==='translate'&&w.tool==='select')?'active':''" :aria-pressed="w.tool===item.id" :title="t(item.label)+(item.key?' ('+item.key+')':'')" :disabled="!w.canEdit||w.busy||w.traceOpen" @click="useTool(item.id)">{{ t(item.label) }}</button></div>
            <div v-if="imageTransforms&&['rotate','scale'].includes(w.tool)" class="mt-1 flex items-center gap-1 border-t border-line px-1 pt-1 text-[10px] text-muted" :title="t('imageGroupPivotHint')"><span>{{t('transformPivot')}}</span><span class="ml-auto">{{t('group')}} · {{t('worldCoordinates')}}</span></div>
            <div v-else-if="w.tool==='rotate'" class="mt-1 flex items-center gap-0.5 border-t border-line pt-1" role="group" :aria-label="t('transformPivot')"><span class="mr-auto px-1 text-[10px] text-muted">{{ t('transformPivot') }}</span><button v-for="pivot in (['individual','group'] as const)" :key="pivot" class="dock-tab !px-1.5 !text-[10px]" :class="w.transformPivot===pivot?'active':''" :aria-pressed="w.transformPivot===pivot" :disabled="!w.canEdit||w.busy" :title="t(pivot==='individual'?'individualPivotHint':'groupPivotHint')" @click="w.transformPivot=pivot">{{ t(pivot) }}</button></div>
            <div v-else-if="['pose','scale','shear'].includes(w.tool)" class="mt-1 flex items-center gap-1 border-t border-line px-1 pt-1 text-[10px] text-muted"><span>{{ t('transformPivot') }}</span><span class="ml-auto">{{ t('individual') }}<template v-if="w.tool==='scale'"> · {{ t('localCoordinates') }}</template></span></div>
            <div class="mt-1 flex gap-1 border-t border-line pt-1"><AppButton variant="ghost" :disabled="!w.canEdit||w.busy||w.traceOpen" :aria-pressed="w.parentPicking" :title="t('setParent')+' (P)'" @click="w.beginParentPick">{{t('setParent')}}</AppButton><AppButton variant="ghost" class="flex-1" :disabled="!w.canEdit||w.busy||w.traceOpen" :aria-pressed="w.tool==='create'" :title="t('createBone')+' (B)'" @click="useTool('create')"><AppIcon name="bone"/>{{ t('createBone') }}</AppButton><AppButton variant="ghost" :aria-pressed="w.tool==='pan'" :aria-label="t('pan')" :title="t('pan')+' (H / Space)'" @click="w.tool='pan'"><AppIcon name="hand"/></AppButton></div>
          </div>
          </div>
          <TracePanel v-if="w.traceOpen"/>
          <div v-if="w.clippingDraft" class="pointer-events-auto absolute bottom-4 left-1/2 flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-sm border border-line bg-panel p-2 text-xs shadow-lg" data-testid="clipping-draft-controls"><span class="text-muted">{{t('clippingDrawHint')}} · {{w.clippingDraft.points.length}} {{t('vertices')}}</span><AppButton :disabled="w.clippingDraft.points.length<3||w.busy" @click="w.finishClipping">{{t('finishClipping')}}</AppButton><AppButton :disabled="w.busy" @click="w.cancelClipping">{{t('cancel')}}</AppButton></div>

        </template>
      </ProjectViewport>
      <template v-if="w.editorMode==='animate'&&w.project">
        <div class="animation-resize-bar" role="separator" aria-label="Resize timeline" aria-orientation="horizontal" tabindex="0" data-testid="timeline-resize" @pointerdown="resizeTimeline" @keydown="timelineResizeKey"/>
        <div class="animation-bottom-pane" :style="{height:timelineHeight+'px'}">
          <AnimationTimeline ref="timeline" :animations="w.animations" :active-animation-id="w.animationId" :bones="w.project.bones" :selected-bone-ids="w.selectedSlotId===null?w.selectedIds:[]" :tracks="w.animationTracks" :slots="timelineSlots" :slot-tracks="w.animationSlotTracks" :sequence-tracks="w.animationSequenceTracks" :draw-order-keys="w.animationDrawOrderKeys" :deform-tracks="w.animationDeformTracks" :selected-slot-ids="w.selectedSlotIds" :constraints="w.animationTimelineConstraints" :selected-constraint-ids="timelineSelectedConstraints" :constraint-tracks="w.animationConstraintTracks" :events="w.eventDefinitions" :event-tracks="w.animationEventTracks" :current-frame="w.animationFrame" :duration-frames="w.animationDuration" :stored-duration-frames="w.animationStoredDuration" :preview-end-frames="w.animationPreviewEnd" :automatic-preview-end-frames="w.animationAutomaticPreviewEnd" :preview-budget-exceeded="w.animationPreviewExceedsBudget" :fps="w.animationFps" :playing="w.animationPlaying" :loop="w.animationLoop" :loop-start="w.animationLoopStart" :loop-end="w.animationLoopEnd" :auto-key="w.animationAutoKey" :disabled="w.busy||!w.canEdit" :supported-channels="w.animationChannels" :supported-interpolations="timelineInterpolations" :can-paste="w.animationCanPaste"
            @draft-validity="invalid=>w.animationKeyError=invalid?'Enter valid animation values before saving.':''" @select-animation="w.selectAnimation" @create-animation="w.createAnimation" @rename-animation="w.renameAnimation" @delete-animation="w.deleteAnimation" @duplicate-animation="w.duplicateAnimation" @copy-keys="w.copyAnimationKeys" @paste-keys="w.pasteAnimationKeys"
            @seek="w.seekAnimation" @play="w.playAnimation" @pause="w.pauseAnimation" @toggle-loop="w.animationLoop=!w.animationLoop" @toggle-auto-key="w.animationAutoKey=!w.animationAutoKey"
            @select-constraint="w.selectConstraint" @insert-constraint-keys="w.insertConstraintAnimationKeys" @update-constraint-key="w.updateConstraintAnimationKey" @select-sequence-attachment="w.selectAttachment" @insert-sequence-key="w.insertSequenceAnimationKey" @update-sequence-key="w.updateSequenceAnimationKey" @select-event="w.selectEvent" @insert-event-key="w.insertEventAnimationKey" @update-event-key="w.updateEventAnimationKey"
            @select-bone="timelineSelectBone" @select-slot="(id,additive)=>w.selectSlot(id,{toggle:additive})" @select-attachment="(id,additive)=>{w.selectAttachment(id,{toggle:additive});showMesh=true}" @insert-draw-order-key="w.insertDrawOrderKey" @update-draw-order-key="w.updateDrawOrderKey" @insert-deform-key="change=>w.insertDeformKey(change.attachmentId)" @update-deform-curve="w.updateDeformCurve" @insert-slot-keys="w.insertSlotAnimationKeys" @update-slot-key="w.updateSlotAnimationKey" @insert-keys="w.insertAnimationKeys" @move-keys="w.moveAnimationKeys" @delete-keys="w.deleteAnimationKeys" @set-interpolation="w.setAnimationInterpolation" @update-key="w.updateAnimationKey" @update-bezier="w.updateAnimationBezier" @set-fps="w.setAnimationFps" @loop-range="w.setAnimationLoopRange"/>
        </div>
      </template>
      </div>
      <DockWorkspace v-model="dockLayout" :titles="dockTitles">
       <template #weights><WeightsPanel/></template><template #mesh><MeshTools/></template>
       <template #tree><div class="flex min-h-0 flex-1 flex-col"><SceneTree @create-animation="newAnimation" @create-event="newEvent" @create-constraint="createConstraint" @create-clipping="clippingCreator=true"/><SlotInspector v-if="w.editorMode==='animate'&&w.selectedSlot" class="max-h-64 shrink-0 overflow-y-auto"/><ConstraintInspector v-else-if="w.editorMode==='animate'&&w.selectedConstraint" class="max-h-72 shrink-0 overflow-y-auto"/><EventInspector v-else-if="w.editorMode==='animate'&&w.selectedEvent" :definition="w.selectedEvent" :selected-key="w.currentEventKey" animate :busy="w.busy" :audio-root="w.audioLibrary.root" :audio-keys="w.audioLibrary.sounds.map(sound=>sound.key)" :audio-playable="w.selectedEventAudioPlayable" :playback-text="w.eventPlaybackText" @play-audio="w.previewEventAudio" :context-key="`${w.project?.documentId}:${w.animationId}:${w.animationFrame}`" class="max-h-72 shrink-0 overflow-y-auto" @manual-key="w.insertEventAnimationKey" @key-patch="w.updateEventAnimationKey" @draft-validity="invalid=>w.eventKeyError=invalid?'Enter valid event values before saving.':''"/></div></template>
       <template #properties><AnimationPreview v-if="w.editorMode==='animate'"/><div v-else class="min-h-0 flex-1 overflow-y-auto">
            <section v-if="selectedImage" class="p-3 text-xs">
              <div class="mb-3 flex items-center gap-2 text-accent"><AppIcon name="image"/><h3>{{ t('imageAsset') }}</h3></div>
              <p class="break-all text-ink">{{ selectedImage.key }}.png</p><p class="mt-2 text-muted">{{ selectedImage.width }} × {{ selectedImage.height }}</p>
              <p class="mt-4 text-[11px] leading-4 text-muted">{{ t('imageLibraryHint') }}</p><label class="mt-4 block text-muted">{{ t('imagesLibrary') }}<input class="editor-input mt-1 w-full" :value="w.library.root" readonly></label>
              <AppButton class="mt-2 w-full" :disabled="!w.canEdit||w.busy" @click="w.chooseImagesFolder">{{ t('chooseImagesFolder') }}</AppButton>
            </section><EventInspector v-else-if="w.selectedEvent" :definition="w.selectedEvent" :busy="w.busy" :audio-root="w.audioLibrary.root" :audio-keys="w.audioLibrary.sounds.map(sound=>sound.key)" :audio-playable="w.selectedEventAudioPlayable" :playback-text="w.eventPlaybackText" @play-audio="w.previewEventAudio" @choose-audio-folder="w.chooseAudioFolder" :context-key="String(w.project?.documentId)" @definition-patch="change=>w.patchEventDefinition(change.id,change.patch)" @draft-validity="invalid=>w.eventKeyError=invalid?'Enter valid event values before saving.':''"/><ConstraintInspector v-else-if="displayedConstraint"/><AttachmentInspector v-else-if="displayedAttachment"/><SlotInspector v-else-if="displayedSlot"/><BoneInspector v-else-if="displayedBone" :editor="boneEditor"/>
            <p v-if="!selectedImage&&!w.selectedEvent&&!displayedConstraint&&!displayedAttachment&&!displayedSlot&&!displayedBone" class="p-3 text-xs leading-5 text-muted">{{ t('noSelection') }}</p>
       </div></template>
       <template #ik><ConstraintViewPanel type="ik" @create="createConstraint"/></template>
       <template #transform><ConstraintViewPanel type="transform" @create="createConstraint"/></template>
       <template #physics><ConstraintViewPanel type="physics" @create="createConstraint"/></template>
      </DockWorkspace>
    </div>
    <footer class="editor-status"><span role="status">{{ w.busy?t('working'):t('statusReady') }}</span><span class="ml-3 min-w-0 flex-1 truncate text-muted">{{ w.project?t(w.editorMode==='animate'&&(w.editMode==='meshes'||w.editMode==='clipping')?'animationDeformHint':w.clippingDraft?'clippingDrawHint':w.editMode==='clipping'?'clippingEditHint':w.tool==='create'?'createHint':w.editMode==='meshes'?'meshHint_'+w.meshTool:w.editMode==='weights'?'paintHint':w.editMode==='images'?'imageViewportHint':'toolHint_'+(w.tool==='select'?'translate':w.tool)):t('local') }}</span><span class="ml-auto shrink-0 text-faint">{{ t('appVersion') }}</span></footer>

    <ConstraintCreator v-if="constraintCreator" :type="constraintCreator" @close="constraintCreator=null"/><ClippingCreator v-if="clippingCreator" @close="clippingCreator=false"/>
    <ModalDialog v-if="eventCreator" title="New event" :busy="w.busy" @cancel="eventCreator=false"><form @submit.prevent="submitEvent"><label class="block text-xs text-muted">Event name<input v-model="eventName" autofocus maxlength="120" aria-label="Event name" class="editor-input mt-2 w-full"/></label><div class="mt-4 flex justify-end gap-2"><AppButton type="button" @click="eventCreator=false">Cancel</AppButton><AppButton type="submit" variant="primary" :disabled="w.busy||!eventNameValid">Create event</AppButton></div></form></ModalDialog>
    <ModalDialog v-if="w.newDialog" :title="t('newTitle')" :busy="w.busy" @cancel="w.newDialog = false">
      <form @submit.prevent="create"><p class="mb-5 text-sm leading-6 text-muted">{{ t('newHelp') }}</p><label for="project-name" class="mb-2 block text-xs font-medium">{{ t('projectName') }}</label><input id="project-name" v-model="name" maxlength="120" autocomplete="off" class="w-full rounded-md border border-line bg-shell px-3 py-2 text-sm outline-none focus:border-accent" :aria-invalid="submitted && !nameValid" :aria-describedby="submitted && !nameValid ? 'name-error' : 'draft-help'" :disabled="w.busy"><p v-if="submitted && !nameValid" id="name-error" class="mt-2 text-xs text-danger">{{ t('invalidName') }}</p><p id="draft-help" class="mt-3 text-xs leading-5 text-warning">{{ t(desktop ? 'draftNotice' : 'webPreview') }}</p><div class="mt-6 flex justify-end gap-3"><AppButton :disabled="w.busy" @click="w.newDialog = false">{{ t('cancel') }}</AppButton><AppButton type="submit" variant="primary" :disabled="w.busy">{{ w.busy ? t('working') : t('create') }}</AppButton></div></form>
    </ModalDialog>
    <ModalDialog v-if="w.discardDialog" :title="t('unsavedTitle')" :busy="w.busy" @cancel="w.cancelDiscard"><p class="text-sm leading-6 text-muted">{{ t('unsavedText') }}</p><div class="mt-6 flex justify-end gap-3"><AppButton :disabled="w.busy" @click="w.cancelDiscard">{{ t('cancel') }}</AppButton><AppButton :disabled="w.busy" @click="w.discardAndContinue">{{ t('discard') }}</AppButton><AppButton v-if="w.project?.canSave" variant="primary" :disabled="w.busy" @click="w.saveAndContinue">{{ t('saveAndContinue') }}</AppButton></div></ModalDialog>
    <div v-if="w.notice" role="alert" class="fixed right-5 bottom-12 z-40 flex max-w-lg items-start gap-4 rounded-lg border border-line bg-raised p-4 text-sm shadow-xl" :class="w.noticeError ? 'text-danger' : 'text-ink'"><span>{{ w.notice }}</span><button :aria-label="t('dismiss')" class="p-0.5 text-muted hover:text-ink" @click="w.notice = ''"><AppIcon name="close" /></button></div>
  </main>
  <div v-if="w.openingProject" class="sr-only" data-testid="project-opening-announcement" role="status" aria-live="polite" aria-atomic="true">{{t('openingProject')}} {{t('openingProjectDetail')}}</div>
</template>
