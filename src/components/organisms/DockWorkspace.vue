<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,onMounted,ref,useId,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {cloneDockLayout,dockPanels,moveDockPanel,type DockLayout,type DockPanelId,type DockTarget} from '../../domain/dockLayout';
import DockPane from '../molecules/DockPane.vue';
const props=defineProps<{modelValue:DockLayout;titles:Record<DockPanelId,string>}>();
const emit=defineEmits<{'update:modelValue':[layout:DockLayout]}>();
const{t}=useI18n(),host=ref<HTMLElement|null>(null),height=ref(600),prefix='dock-'+useId().replace(/[^a-z0-9_-]/gi,'_');
const columns=computed(()=>props.modelValue.columns.filter(c=>c.panels.some(p=>p.visible)));
const active=ref<DockPanelId[]>(dockPanels.filter(id=>props.modelValue.columns.some(c=>c.panels.some(p=>p.id===id&&p.visible))));
watch(()=>props.modelValue,layout=>{for(const c of layout.columns)for(const p of c.panels)if(p.visible&&!active.value.includes(p.id))active.value.push(p.id);},{deep:true});
watch(()=>dockPanels.filter(id=>props.modelValue.columns.some(c=>c.panels.some(p=>p.id===id&&p.visible))).join(','),async(value,previous)=>{
 const opened=value.split(',').find(id=>id&&!previous?.split(',').includes(id));if(!opened)return;await nextTick();document.getElementById(targetId(opened as DockPanelId))?.scrollIntoView({block:'nearest',inline:'nearest'});
});
function targetId(id:DockPanelId){
 // Moving between columns recreates the host DOM node. A panel-only selector
 // would stay unchanged and leave Teleport pointing at the detached old host.
 const column=props.modelValue.columns.find(c=>c.panels.some(p=>p.id===id));
 return`${prefix}-${column?.id??'none'}-${id}`;
}
function visible(id:DockPanelId){return columns.value.some(c=>c.panels.some(p=>p.id===id&&p.visible));}
function panelHeight(id:DockPanelId){return Math.max(112,(props.modelValue.columns.flatMap(c=>c.panels).find(p=>p.id===id)?.height??1)*height.value);}
function close(id:DockPanelId){const layout=cloneDockLayout(props.modelValue);for(const c of layout.columns)for(const p of c.panels)if(p.id===id)p.visible=false;emit('update:modelValue',layout);}
const drag=ref<{id:DockPanelId;x:number;y:number;target:DockTarget|null}|null>(null);
const previewStyle=computed(()=>({left:Math.max(8,Math.min((drag.value?.x??0)+12,window.innerWidth-180))+'px',top:Math.max(8,Math.min((drag.value?.y??0)+12,window.innerHeight-40))+'px'}));
let cleanup=()=>{};
function capture(event:PointerEvent,move:(e:PointerEvent)=>void,finish:(commit:boolean)=>void){
 cleanup();const element=event.currentTarget as HTMLElement;try{element.setPointerCapture(event.pointerId);}catch{/* Window listeners retain cancellation when capture is unavailable. */}
 const up=()=>stop(true),cancel=()=>stop(false),key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();stop(false);}};
 function stop(commit:boolean){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);try{element.releasePointerCapture(event.pointerId);}catch{}cleanup=()=>{};finish(commit);}
 window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);cleanup=cancel;
}
function startDrag(event:PointerEvent,id:DockPanelId){
 if(event.button!==0)return;event.preventDefault();const x=event.clientX,y=event.clientY;
 capture(event,e=>{
  if(!drag.value&&Math.hypot(e.clientX-x,e.clientY-y)<4)return;
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-dock-drop]');
  drag.value={id,x:e.clientX,y:e.clientY,target:target?JSON.parse(target.dataset.dockDrop!):null};
 },commit=>{const state=drag.value;drag.value=null;if(commit&&state?.target){
  // Native field commits start synchronously on blur, before any portal move.
  // Relocating an active input directly can otherwise lose its browser change.
  const focused=document.activeElement;if(focused instanceof HTMLInputElement||focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)focused.blur();
  emit('update:modelValue',moveDockPanel(props.modelValue,id,state.target));
 }});
}
function resize(event:PointerEvent|KeyboardEvent,id:DockPanelId,axis:'height'|'both'){
 const initial=cloneDockLayout(props.modelValue),column=initial.columns.find(c=>c.panels.some(p=>p.id===id));if(!column)return;
 const panel=column.panels.find(p=>p.id===id)!,viewportHeight=Math.max(120,height.value);
 function update(dx:number,dy:number){const layout=cloneDockLayout(initial),c=layout.columns.find(c=>c.id===column!.id)!;c.width=Math.max(180,Math.min(520,column!.width+dx));c.panels.find(p=>p.id===id)!.height=Math.max(.15,Math.min(2,panel.height+dy/viewportHeight));emit('update:modelValue',layout);}
 if(event instanceof KeyboardEvent){update(0,event.key==='ArrowUp'?-16:16);return;}
 if(event.button!==0)return;event.preventDefault();const x=event.clientX,y=event.clientY;
 capture(event,e=>update(axis==='both'?e.clientX-x:0,e.clientY-y),commit=>{if(!commit)emit('update:modelValue',initial);});
}
function resizeWidth(event:PointerEvent|KeyboardEvent,columnId:string){
 const initial=cloneDockLayout(props.modelValue),column=initial.columns.find(c=>c.id===columnId);if(!column)return;
 function update(delta:number){const layout=cloneDockLayout(initial);layout.columns.find(c=>c.id===columnId)!.width=Math.max(180,Math.min(520,column!.width+delta));emit('update:modelValue',layout);}
 if(event instanceof KeyboardEvent){update(event.key==='ArrowLeft'?16:-16);return;}
 if(event.button!==0)return;event.preventDefault();const x=event.clientX;
 capture(event,e=>update(x-e.clientX),commit=>{if(!commit)emit('update:modelValue',initial);});
}
const matches=(target:DockTarget)=>JSON.stringify(target)===JSON.stringify(drag.value?.target);
let observer:ResizeObserver|undefined;
onMounted(async()=>{await nextTick();observer=new ResizeObserver(()=>{height.value=host.value?.clientHeight??600;});if(host.value){height.value=host.value.clientHeight;observer.observe(host.value);}});
onBeforeUnmount(()=>{cleanup();observer?.disconnect();});
</script>
<template>
 <div ref="host" class="dock-workspace" data-testid="dock-workspace" :style="{width:columns.reduce((sum,c)=>sum+c.width+4,0)+'px'}">
  <div v-for="column in columns" :key="column.id" class="relative flex min-h-0 shrink-0" :style="{width:column.width+4+'px'}" :data-dock-column="column.id">
   <div role="separator" aria-orientation="vertical" tabindex="0" :aria-label="t('resizeColumn')" :aria-valuenow="column.width" :aria-valuemin="180" :aria-valuemax="520" :data-testid="`dock-width-${column.id}`" class="dock-divider" @pointerdown="resizeWidth($event,column.id)" @keydown.left.prevent="resizeWidth($event,column.id)" @keydown.right.prevent="resizeWidth($event,column.id)"/>
   <div class="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
    <template v-for="panel in column.panels.filter(p=>p.visible)" :key="panel.id">
     <div class="relative shrink-0" :style="{height:Math.max(112,panel.height*height)+'px'}">
      <div :id="targetId(panel.id)" class="h-full min-h-0"/>
      <div v-if="drag" :data-dock-drop="JSON.stringify({column:column.id,before:panel.id})" :data-testid="`dock-drop-before-${panel.id}`" class="absolute inset-x-4 top-0 z-50 h-7 rounded-sm border border-accent" :class="matches({column:column.id,before:panel.id})?'bg-accent/45':'bg-accent/15'"/>
     </div>
    </template>
    <div v-if="drag" :data-dock-drop="JSON.stringify({column:column.id})" :data-testid="`dock-drop-end-${column.id}`" class="sticky bottom-0 z-50 h-7 border border-accent" :class="matches({column:column.id})?'bg-accent/45':'bg-accent/15'"/>
   </div>
   <template v-if="drag"><div v-for="side in (['left','right'] as const)" :key="side" :data-dock-drop="JSON.stringify({column:column.id,split:side})" :data-testid="`dock-drop-${side}-${column.id}`" class="absolute inset-y-0 z-60 w-4 border border-accent" :class="[side==='left'?'left-0':'right-0',matches({column:column.id,split:side})?'bg-accent/45':'bg-accent/10']"/></template>
  </div>
  <div :id="prefix+'-hidden'" hidden/>
  <Teleport v-for="id in active" :key="id" defer :to="'#'+(visible(id)?targetId(id):prefix+'-hidden')">
   <DockPane :id="id" :title="titles[id]" :height="panelHeight(id)" :max-height="height*2" @close="close(id)" @drag="startDrag($event,id)" @resize="(event,axis)=>resize(event,id,axis)"><slot :name="id"/></DockPane>
  </Teleport>
  <Teleport to="body"><div v-if="drag" class="pointer-events-none fixed z-90 rounded-sm border border-accent bg-panel px-2 py-1 text-xs text-accent shadow-lg" :style="previewStyle" data-testid="dock-drag-preview">{{titles[drag.id]}} · {{t('dropPanel')}}</div></Teleport>
 </div>
</template>
