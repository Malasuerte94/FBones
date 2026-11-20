<script setup lang="ts">
import {nextTick, ref, useId, watch} from 'vue';
import {useI18n} from 'vue-i18n';

const {t}=useI18n();
const id=useId(),triggerId=`${id}-trigger`,menuId=`${id}-menu`,reasonId=`${id}-reason`;
const root=ref<HTMLElement|null>(null),trigger=ref<HTMLButtonElement|null>(null),menu=ref<HTMLElement|null>(null);
const open=ref(false);

function items(){return Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')??[]);}
function close(restoreFocus=false){
  open.value=false;
  if(restoreFocus)trigger.value?.focus({preventScroll:true});
}
async function show(last=false){
  const focus=document.activeElement;
  if(focus instanceof HTMLElement&&(focus.isContentEditable||focus.matches('input,textarea,select')))return;
  open.value=true;
  await nextTick();
  if(open.value)items().at(last?-1:0)?.focus({preventScroll:true});
}
function toggle(){
  if(open.value)close(true);
  else void show();
}
function keydown(event:KeyboardEvent){
  if(event.key==='F9')return;
  event.stopPropagation();
  if(!open.value){
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      void show(event.key==='ArrowUp');
    }
    return;
  }
  if(event.key==='Escape'||event.key==='Tab'){
    if(event.key==='Escape')event.preventDefault();
    close(true);
    return;
  }
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  const controls=items();
  if(!controls.length)return;
  event.preventDefault();
  const current=controls.indexOf(document.activeElement as HTMLButtonElement);
  const last=controls.length-1;
  const index=event.key==='Home'?0:event.key==='End'?last:
    current<0?(event.key==='ArrowDown'?0:last):
    (current+(event.key==='ArrowDown'?1:-1)+controls.length)%controls.length;
  controls[index]?.focus({preventScroll:true});
}
function dismissOutside(event:Event){
  if(event.target instanceof Node&&!root.value?.contains(event.target))close();
}
watch(open,(visible,_previous,onCleanup)=>{
  if(!visible)return;
  document.addEventListener('pointerdown',dismissOutside,true);
  document.addEventListener('focusin',dismissOutside);
  onCleanup(()=>{
    document.removeEventListener('pointerdown',dismissOutside,true);
    document.removeEventListener('focusin',dismissOutside);
  });
},{flush:'sync'});
</script>

<template>
  <div ref="root" class="relative z-12 shrink-0 self-center" @keydown="keydown">
    <button :id="triggerId" ref="trigger" type="button" class="pane-actions-trigger"
      :class="{active:open}" :aria-label="t('timelinePaneActions')" :title="t('timelinePaneActions')"
      aria-haspopup="menu" :aria-expanded="open" :aria-controls="open?menuId:undefined"
      data-testid="timeline-pane-actions" @mousedown.prevent @click="toggle">
      <span aria-hidden="true">⋯</span>
    </button>
    <div v-if="open" class="absolute end-0 top-full mt-1 w-40 rounded-sm border border-line bg-panel p-1 shadow-lg">
      <div :id="menuId" ref="menu" role="menu" :aria-labelledby="triggerId" :aria-describedby="reasonId"
        data-testid="timeline-pane-actions-menu">
        <button type="button" role="menuitem" aria-disabled="true" tabindex="-1" :aria-describedby="reasonId"
          class="pane-action" data-testid="timeline-pane-minimize" @click.prevent.stop>{{t('minimizeView')}}</button>
        <button type="button" role="menuitem" aria-disabled="true" tabindex="-1" :aria-describedby="reasonId"
          class="pane-action" data-testid="timeline-pane-close" @click.prevent.stop>{{t('close')}}</button>
      </div>
      <p :id="reasonId" class="mt-1 border-t border-line px-1.5 pt-1 text-muted">{{t('timelinePaneActionsUnavailable')}}</p>
    </div>
  </div>
</template>

<style scoped>
button.pane-actions-trigger {
  width: 24px;
  height: 22px;
  padding: 0;
  font-size: 15px;
}

button.pane-action {
  display: flex;
  width: 100%;
  justify-content: flex-start;
  border-color: transparent;
  background: transparent;
  color: var(--color-muted);
  cursor: default;
}

button.pane-action:hover {
  background: transparent;
}

button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
</style>
