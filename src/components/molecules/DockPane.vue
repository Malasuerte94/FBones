<script setup lang="ts">
import { nextTick, ref, shallowRef, useId, watch } from 'vue';
import {useI18n} from 'vue-i18n';
import type {DockPanelId} from '../../domain/dockLayout';
const props=defineProps<{id:DockPanelId;title:string;height:number;maxHeight:number;actionsDisabled?:boolean}>();
const emit=defineEmits<{drag:[event:PointerEvent];resize:[event:PointerEvent|KeyboardEvent,axis:'height'|'both'];minimize:[];close:[]}>();
const{t}=useI18n();
const trigger=ref<HTMLButtonElement>();
const menu=ref<HTMLElement>();
const menuId=useId();
const menuOpen=ref(false);
const menuPosition=shallowRef({left:'0px',top:'0px',width:'0px',maxHeight:'0px'});

function closeMenu(restoreFocus=false){
  menuOpen.value=false;
  if(restoreFocus&&!props.actionsDisabled&&trigger.value?.getClientRects().length)trigger.value.focus({preventScroll:true});
}
function positionMenu(){
  const anchor=trigger.value,popup=menu.value;
  if(!menuOpen.value||!anchor||!popup)return;
  const rect=anchor.getBoundingClientRect();
  if(!rect.height||rect.bottom<=0||rect.top>=window.innerHeight){closeMenu();return;}
  const margin=8,gap=4;
  const width=Math.max(0,Math.min(160,window.innerWidth-margin*2));
  popup.style.width=`${width}px`;
  const above=Math.max(0,rect.top-gap-margin),below=Math.max(0,window.innerHeight-rect.bottom-gap-margin);
  const height=popup.scrollHeight+2;
  const opensAbove=height>below&&above>below;
  const available=opensAbove?above:below;
  const top=opensAbove?rect.top-gap-Math.min(height,available):rect.bottom+gap;
  menuPosition.value={left:`${Math.max(margin,Math.min(rect.right-width,window.innerWidth-width-margin))}px`,
    top:`${top}px`,width:`${width}px`,maxHeight:`${available}px`};
}
function menuItems(){return Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('button')??[]);}
async function openMenu(last=false){
  if(props.actionsDisabled)return;
  const focus=document.activeElement;
  if(focus instanceof HTMLElement&&(focus.isContentEditable||focus.matches('input,textarea,select')))return;
  menuOpen.value=true;
  await nextTick();
  positionMenu();
  await nextTick();
  if(menuOpen.value)menuItems().at(last?-1:0)?.focus({preventScroll:true});
}
function toggleMenu(){
  if(menuOpen.value)closeMenu(true);
  else void openMenu();
}
function chooseAction(action:'minimize'|'close'){
  if(props.actionsDisabled)return;
  closeMenu();
  if(action==='minimize')emit('minimize');
  else emit('close');
}
function triggerKey(event:KeyboardEvent){
  if(event.key==='Escape'&&menuOpen.value){
    event.preventDefault();
    event.stopPropagation();
    closeMenu(true);
    return;
  }
  if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
  event.preventDefault();
  event.stopPropagation();
  void openMenu(event.key==='ArrowUp');
}
function menuKey(event:KeyboardEvent){
  if(event.key==='F9')return;
  event.stopPropagation();
  if(event.key==='Escape'||event.key==='Tab'){
    if(event.key==='Escape')event.preventDefault();
    closeMenu(true);
    return;
  }
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  event.preventDefault();
  const items=menuItems(),current=items.indexOf(document.activeElement as HTMLButtonElement);
  const index=event.key==='Home'?0:event.key==='End'?items.length-1:
    (current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
  items[index]?.focus({preventScroll:true});
}
function dismissOutside(event:Event){
  if(event.target instanceof Node&&!trigger.value?.contains(event.target)&&!menu.value?.contains(event.target))closeMenu();
}
watch(menuOpen,(open,_previous,onCleanup)=>{
  if(!open)return;
  document.addEventListener('pointerdown',dismissOutside,true);
  document.addEventListener('focusin',dismissOutside);
  window.addEventListener('resize',positionMenu);
  window.addEventListener('scroll',positionMenu,true);
  onCleanup(()=>{
    document.removeEventListener('pointerdown',dismissOutside,true);
    document.removeEventListener('focusin',dismissOutside);
    window.removeEventListener('resize',positionMenu);
    window.removeEventListener('scroll',positionMenu,true);
  });
},{flush:'sync'});
watch(()=>props.actionsDisabled,disabled=>{if(disabled)closeMenu();},{flush:'sync'});
</script>
<template>
 <aside class="dock-pane h-full w-full" :data-testid="`dock-panel-${id}`" :aria-label="title">
  <header class="dock-title !px-1">
   <button class="min-w-0 flex-1 cursor-grab truncate px-1 text-left active:cursor-grabbing" :data-testid="`dock-drag-${id}`" :aria-label="t('movePanel',{name:title})" :title="t('movePanelHint')" style="touch-action:none" @pointerdown="$emit('drag',$event)">{{title}}</button>
   <slot name="header-actions"/>
   <button ref="trigger" type="button" class="dock-tab !min-h-5 !px-1.5" :id="`dock-pane-actions-${id}`"
     :data-testid="`dock-pane-actions-${id}`" :disabled="actionsDisabled" :aria-label="t('dockPanelActions',{name:title})"
     :title="t('dockPanelActions',{name:title})" aria-haspopup="menu" :aria-expanded="menuOpen" :aria-controls="menuOpen?menuId:undefined"
     @mousedown.prevent @keydown="triggerKey" @click="toggleMenu" @contextmenu.prevent.stop="chooseAction('minimize')">
     <span class="leading-none" aria-hidden="true">⋯</span>
   </button>
  </header>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto" :data-testid="`dock-content-${id}`"><slot/></div>
  <div class="relative h-1.5 shrink-0 bg-line">
   <div role="separator" aria-orientation="horizontal" tabindex="0" :aria-label="t('resizePanelHeight',{name:title})" :aria-valuenow="Math.round(height)" :aria-valuemin="112" :aria-valuemax="Math.round(maxHeight)" :data-testid="`dock-height-${id}`" class="h-full cursor-row-resize hover:bg-accent/60" style="touch-action:none" @pointerdown="$emit('resize',$event,'height')" @keydown.up.prevent="$emit('resize',$event,'height')" @keydown.down.prevent="$emit('resize',$event,'height')"/>
   <div class="absolute bottom-0 right-0 size-3 cursor-nwse-resize border-r-2 border-b-2 border-faint/70 hover:border-accent" :data-testid="`dock-corner-${id}`" :title="t('resizePanel',{name:title})" style="touch-action:none" @pointerdown.stop="$emit('resize',$event,'both')"/>
  </div>
 </aside>
 <Teleport to="body">
  <div v-if="menuOpen" :id="menuId" ref="menu" role="menu" :aria-labelledby="`dock-pane-actions-${id}`"
    class="fixed z-80 overflow-auto rounded-sm border border-line bg-panel p-1 text-ink shadow-xl" :style="menuPosition" @keydown="menuKey">
   <button type="button" role="menuitem" tabindex="-1" class="block w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-raised focus-visible:bg-raised focus-visible:outline focus-visible:outline-accent"
     :aria-label="t('minimizePanel',{name:title})" :data-testid="`dock-minimize-${id}`" @click="chooseAction('minimize')">{{t('minimizeView')}}</button>
   <button type="button" role="menuitem" tabindex="-1" class="block w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-raised focus-visible:bg-raised focus-visible:outline focus-visible:outline-accent"
     :aria-label="t('closePanel',{name:title})" :data-testid="`dock-close-${id}`" @click="chooseAction('close')">{{t('close')}}</button>
  </div>
 </Teleport>
</template>
