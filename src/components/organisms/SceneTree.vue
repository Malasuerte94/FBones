<script setup lang="ts">
import {computed,ref,nextTick,onMounted,onBeforeUnmount,useId,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {canParent} from '../../domain/rig';
import {parseImageDropKeys} from '../../domain/imageSelection';
import {projectTree,type ProjectTreeRow,type TreeKind} from '../../domain/treeProjection';
import {treeGuides} from '../../domain/treeGuides';
import AppIcon from '../atoms/AppIcon.vue';
import AppButton from '../atoms/AppButton.vue';
import ImagesLibrary from './ImagesLibrary.vue';
import SlotHierarchy from './SlotHierarchy.vue';
const w=useWorkspace(),{t}=useI18n(),search=ref(''),tab=ref('tree'),collapsed=ref(new Set<string>());
const renaming=ref<number|null>(null),rename=ref(''),dropTarget=ref<string|null>(null),newMenu=ref(false);
const rows=computed(()=>projectTree({bones:w.project?.bones??[],slots:w.sceneSlots,constraints:w.project?.constraints??[]},w.treeFilters,{search:search.value,collapsed:collapsed.value}));
const constraintRows=computed(()=>rows.value.filter(row=>row.kind==='constraint'));
const objectRows=computed(()=>rows.value.filter(row=>row.kind!=='constraint'));
const guides=computed(()=>new Map([...treeGuides(objectRows.value),...treeGuides(constraintRows.value,'group:constraints')]));
const newAnchor=ref<HTMLElement|null>(null),newPopup=ref<HTMLElement|null>(null),menuId=useId();
const menuPosition=ref({left:'0px',top:'0px',width:'224px',maxHeight:'240px'});
const menuItem='block w-full px-2 py-1.5 text-left text-xs hover:bg-raised focus-visible:bg-raised disabled:opacity-40';
const canMoveAttachment=computed(()=>w.sceneEditing&&w.canEdit&&!w.busy&&!w.traceOpen&&!w.clippingDraft&&!w.inspectorError);
let pointerBoneId:number|null=null,focusBoneId:number|null=null;
function treeHover(source:'tree-pointer'|'tree-focus',id:number){if(source==='tree-pointer')pointerBoneId=id;else focusBoneId=id;w.hoverBone(source,id);}
function clearTreeHover(source:'tree-pointer'|'tree-focus',id:number){if(source==='tree-pointer'&&pointerBoneId===id)pointerBoneId=null;if(source==='tree-focus'&&focusBoneId===id)focusBoneId=null;w.clearBoneHover(source,id);}
watch(()=>[w.project?.documentId,tab.value==='tree'?rows.value.map(row=>`${row.key}:${row.depth}`).join('|'):'drawOrder'] as const,(current,previous)=>{
 if(previous&&current[0]===previous[0]&&current[1]===previous[1])return;
 // Removing/reordering rows can happen without a pointerleave on their DOM.
 if(pointerBoneId!==null)clearTreeHover('tree-pointer',pointerBoneId);
 const visible=tab.value==='tree'?new Set(rows.value.filter(row=>row.kind==='bone').map(row=>row.id)):new Set<number>();
 if(focusBoneId!==null&&(!previous||current[0]!==previous[0]||!visible.has(focusBoneId)))clearTreeHover('tree-focus',focusBoneId);
});
async function chooseAnimation(id:number){await w.setEditorMode('animate');if(w.editorMode==='animate')w.selectAnimation(id);}
function toggle(key:string){const next=new Set(collapsed.value);if(next.has(key))next.delete(key);else next.add(key);collapsed.value=next;}
function selected(row:ProjectTreeRow){if(row.kind==='constraint')return w.selectedConstraintId===row.id;if(row.kind==='attachment')return w.selectedAttachmentIds.includes(row.id);if(row.kind==='slot')return w.selectedSlotId===row.id&&(w.selectedAttachmentId===null||!w.treeFilters.attachment);return (w.editMode==='weights'&&w.influence===row.id)||(w.selectedAttachmentId===null&&w.selectedConstraintId===null&&w.selectedSlotId===null&&w.selectedIds.includes(row.id));}
function choose(row:ProjectTreeRow,event?:MouseEvent){
 if(w.parentPicking){if(row.kind==='bone')void w.chooseParent(row.id);return;}
 newMenu.value=false;
 if(row.kind==='constraint'){w.selectConstraint(row.id);return;}
 if(row.kind==='attachment'){
   if(w.editMode==='bones')w.setMode('images');
   w.selectAttachment(row.id,{toggle:!!(event?.ctrlKey||event?.metaKey),shift:!!event?.shiftKey,ordered:rows.value.filter(r=>r.kind==='attachment').map(r=>r.id)});
   return;
 }
 if(row.kind==='slot'){w.librarySelection=null;if(w.editMode==='bones')w.setMode('images');w.selectSlot(row.id);return;}
 if(w.editMode==='weights'&&w.selectedBinding){w.chooseInfluence(row.id,{toggle:!!(event?.ctrlKey||event?.metaKey),shift:!!event?.shiftKey});return;}
 w.librarySelection=null;w.setMode('bones');let ids=[row.id];
 if(event?.shiftKey&&w.selectedId!==null){const ordered=rows.value.filter(r=>r.kind==='bone').map(r=>r.id),a=ordered.indexOf(w.selectedId),b=ordered.indexOf(row.id);if(a>=0)ids=ordered.slice(Math.min(a,b),Math.max(a,b)+1);}
 else if(event?.ctrlKey||event?.metaKey)ids=w.selectedIds.includes(row.id)?w.selectedIds.filter(id=>id!==row.id):[...w.selectedIds,row.id];
 w.selectBones(ids,ids.includes(row.id)?row.id:ids.at(-1)??null);
}
async function startRename(id:number){if(w.parentPicking)return;w.setMode('bones');w.selectBone(id);renaming.value=id;rename.value=w.selectedBone?.name??'';await nextTick();const input=document.querySelector<HTMLInputElement>('[data-tree-rename]');input?.focus();input?.select();}
async function commitRename(){const id=renaming.value,bone=w.project?.bones.find(b=>b.id===id);if(!bone||w.busy)return;const success=await w.editRig({...bone,type:'update',name:rename.value});if(success)renaming.value=null;}
function treeDrag(event:DragEvent,row:ProjectTreeRow){
 if(w.parentPicking||renaming.value!==null){event.preventDefault();return;}
 if(row.kind==='attachment'){
   if(!canMoveAttachment.value||!w.project){event.preventDefault();return;}
   if(w.editMode==='bones')w.setMode('images');
   // This command moves one attachment. Make that scope visible before dragging.
   w.selectAttachment(row.id);
   event.dataTransfer?.setData('application/x-fbones-attachment',JSON.stringify({id:row.id,documentId:w.project.documentId,revision:w.project.revision}));
 }else event.dataTransfer?.setData('application/x-fbones-tree',JSON.stringify({kind:row.kind,id:row.id}));
 if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
}
function accepts(event:DragEvent,row:ProjectTreeRow){if(!w.canEdit||w.busy)return;const types=event.dataTransfer?.types??[],image=types.includes('application/x-fbones-image')||types.includes('application/x-fbones-images'),attachment=types.includes('application/x-fbones-attachment');if((attachment&&canMoveAttachment.value&&row.kind==='slot')||(image&&(row.kind==='bone'||(row.kind==='slot'&&w.sceneEditing)))||(!image&&!attachment&&types.includes('application/x-fbones-tree')&&(row.kind==='bone'||row.kind==='constraint'))){event.preventDefault();dropTarget.value=row.key;if(event.dataTransfer)event.dataTransfer.dropEffect=image?'copy':'move';}}
async function drop(event:DragEvent,row:ProjectTreeRow){
 event.preventDefault();dropTarget.value=null;if(!w.canEdit||w.busy)return;
 const keys=parseImageDropKeys(event.dataTransfer,w.library.images.map(image=>image.key));
 if(keys){if(row.kind==='slot'&&w.sceneEditing){await w.placeAttachments(row.id,keys);return;}if(row.kind==='bone')await w.placeImages(keys,0,0,row.id,true);return;}
 const attachmentData=event.dataTransfer?.getData('application/x-fbones-attachment');
 if(attachmentData){
   if(!canMoveAttachment.value||row.kind!=='slot'||!w.project)return;
   try{
     const item=JSON.parse(attachmentData) as {id?:unknown;documentId?:unknown;revision?:unknown};
     if(!Number.isSafeInteger(item.id)||!Number.isSafeInteger(item.documentId)||!Number.isSafeInteger(item.revision))return;
     if(item.documentId!==w.project.documentId||item.revision!==w.project.revision){w.showNotice(t('attachmentDragStale'),true);return;}
     const attachment=w.sceneAttachments.find(a=>a.id===item.id);if(!attachment||attachment.slot===row.id)return;
     await w.moveAttachment(attachment.id,row.id,item.revision as number);
   }catch{/* A foreign or malformed payload does not move an attachment. */}
   return;
 }
 try{const item=JSON.parse(event.dataTransfer?.getData('application/x-fbones-tree')??'');if(row.kind==='constraint'&&item.kind==='constraint'){const index=w.project?.constraints?.findIndex(c=>c.id===row.id)??-1;if(index>=0)await w.reorderConstraint(item.id,index);}
 else if(row.kind==='bone'&&item.kind==='bone'){if(canParent(w.project?.bones??[],item.id,row.id))await w.editRig({type:'reparent',id:item.id,parent:row.id});}
 else if(row.kind==='bone'&&item.kind==='slot'){const slot=w.sceneSlots.find(s=>s.id===item.id),r=slot?.region;if(slot)await w.editRig({type:'updateSlot',id:slot.id,name:slot.name,bone:row.id,visible:slot.visible,x:r?.x??0,y:r?.y??0,rotation:r?.rotation??0,scaleX:r?.scaleX??1,scaleY:r?.scaleY??1});}}
 catch{/* Foreign drag payloads do not edit a project. */}
}
function navigate(event:KeyboardEvent){if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const buttons=Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="treeitem"]'));const index=buttons.indexOf(document.activeElement as HTMLButtonElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowDown'?1:-1)));event.preventDefault();buttons[next]?.focus();}
function leaveFocus(event:FocusEvent,id:number){if(!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node|null))clearTreeHover('tree-focus',id);}
function active(row:ProjectTreeRow){return row.slotId!==null&&w.sceneSlots.find(s=>s.id===row.slotId)?.activeAttachmentId===row.id;}
function slotVisible(row:ProjectTreeRow){return w.sceneSlots.find(s=>s.id===row.id)?.visible??false;}
function visibility(row:ProjectTreeRow){const slot=w.sceneSlots.find(s=>s.id===row.id);if(!slot)return;const r=slot.region;void w.editRig({type:'updateSlot',id:slot.id,name:slot.name,bone:slot.bone,visible:!slot.visible,x:r?.x??0,y:r?.y??0,rotation:r?.rotation??0,scaleX:r?.scaleX??1,scaleY:r?.scaleY??1});}
const emit=defineEmits<{createConstraint:[type:'ik'|'transform'|'physics'];createClipping:[];createAnimation:[];createEvent:[]}>();
function newConstraint(type:'ik'|'transform'|'physics'){newMenu.value=false;emit('createConstraint',type);}
function menuButtons(){return Array.from(newPopup.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);}
function closeNew(restore=false){newMenu.value=false;if(restore)newAnchor.value?.querySelector('button')?.focus();}
function positionNew(){
 if(!newMenu.value||!newAnchor.value||!newPopup.value)return;
 const rect=newAnchor.value.getBoundingClientRect(),margin=8,gap=4;
 const width=Math.max(0,Math.min(Math.max(224,rect.width),window.innerWidth-margin*2));
 const above=Math.max(0,rect.top-margin-gap),below=Math.max(0,window.innerHeight-rect.bottom-margin-gap);
 const height=Math.min(newPopup.value.scrollHeight,Math.max(above,below));
 const top=above>=height||above>=below?Math.max(margin,rect.top-gap-height):rect.bottom+gap;
 menuPosition.value={left:`${Math.max(margin,Math.min(rect.left,window.innerWidth-width-margin))}px`,top:`${top}px`,width:`${width}px`,maxHeight:`${Math.max(0,Math.max(above,below))}px`};
}
async function openNew(){if(!w.sceneEditing||w.busy)return;newMenu.value=true;await nextTick();positionNew();menuButtons()[0]?.focus();}
function toggleNew(){if(newMenu.value)closeNew();else void openNew();}
function menuKey(event:KeyboardEvent){
 if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
 event.preventDefault();const buttons=menuButtons(),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
 const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
 buttons[next]?.focus();
}
function outsideNew(event:Event){if(newMenu.value&&!newPopup.value?.contains(event.target as Node)&&!newAnchor.value?.contains(event.target as Node))closeNew();}
function escapeNew(event:KeyboardEvent){if(newMenu.value&&event.key==='Escape'){event.preventDefault();event.stopPropagation();closeNew(true);}}
watch(()=>[w.project?.documentId,tab.value,w.sceneEditing,w.busy,w.parentPicking],()=>closeNew());
onMounted(()=>{document.addEventListener('pointerdown',outsideNew,true);document.addEventListener('focusin',outsideNew);window.addEventListener('keydown',escapeNew,true);window.addEventListener('resize',positionNew);window.addEventListener('scroll',positionNew,true);});
onBeforeUnmount(()=>{document.removeEventListener('pointerdown',outsideNew,true);document.removeEventListener('focusin',outsideNew);window.removeEventListener('keydown',escapeNew,true);window.removeEventListener('resize',positionNew);window.removeEventListener('scroll',positionNew,true);w.clearBoneHover('tree-pointer');w.clearBoneHover('tree-focus');});
</script>
<template>
 <div class="dock-title"><AppIcon name="tree"/><h2>{{t('tree')}}</h2><span class="ml-auto text-faint">{{w.project?.bones.length??0}} / {{w.sceneSlots.length}}</span></div>
 <div class="flex items-center gap-1 border-b border-line p-1.5"><button v-for="item in ['tree','drawOrder']" :key="item" class="dock-tab" :class="tab===item?'active':''" :aria-pressed="tab===item" @click="tab=item">{{t(item)}}</button></div>
 <template v-if="tab==='tree'">
  <div class="flex items-center gap-1 p-1.5"><input v-model="search" type="search" :aria-label="t('searchTree')" :placeholder="t('searchTree')" class="editor-input min-w-0 flex-1"/><button v-for="kind in (['bone','slot','attachment','constraint'] as TreeKind[])" :key="kind" class="dock-tab !px-1" :class="w.treeFilters[kind]?'text-accent':'text-faint'" :aria-pressed="w.treeFilters[kind]" :aria-label="t('filter_'+kind)" :title="t('filter_'+kind)" :data-testid="`tree-filter-${kind}`" @click="w.treeFilters[kind]=!w.treeFilters[kind]"><AppIcon :name="kind==='bone'?'bone':kind==='slot'?'tree':kind==='attachment'?'image':'weights'" class="!size-3.5"/></button></div>
  <div class="mx-2 flex items-center gap-2 border-b border-line px-1 pb-2 text-xs"><AppIcon name="file" class="text-accent"/><h3 class="truncate">{{w.project?.name??t('noProject')}}</h3></div>
  <div role="tree" :aria-label="t('hierarchy')" class="min-h-0 flex-1 overflow-auto px-1 py-1" @keydown="navigate">
   <template v-for="(group,index) in [objectRows,constraintRows]" :key="index">
    <div v-if="index===1&&group.length" class="mt-2 flex items-center gap-1 px-1 py-1 text-muted"><AppIcon name="weights" class="!size-3.5"/>{{t('constraints')}}</div>
    <div v-for="row in group" :key="row.key" class="tree-row" :class="[selected(row)?'selected':'',row.kind==='bone'&&w.hoveredBoneId===row.id?'outline outline-1 -outline-offset-1 outline-warning/80':'',w.parentPicking&&row.kind==='bone'?(w.canPickParent(row.id)?'cursor-crosshair hover:bg-accent/15':'opacity-45'):'']" :data-tree-kind="row.kind" :data-tree-id="row.id" :data-parent-candidate="w.parentPicking&&row.kind==='bone'?String(w.canPickParent(row.id)):undefined" :data-bone-hovered="row.kind==='bone'&&w.hoveredBoneId===row.id?'true':undefined" :draggable="!w.parentPicking&&w.canEdit&&!w.busy&&renaming===null&&(row.kind!=='attachment'||canMoveAttachment)" :title="row.kind==='attachment'&&w.sceneEditing?t('attachmentMoveTreeHint'):undefined" :style="dropTarget===row.key?{outline:'1px solid var(--color-accent)'}:undefined" @dragstart="treeDrag($event,row)" @dragover="accepts($event,row)" @dragleave="dropTarget=null" @dragend="dropTarget=null" @drop="drop($event,row)" @pointerenter="row.kind==='bone'&&treeHover('tree-pointer',row.id)" @pointerleave="row.kind==='bone'&&clearTreeHover('tree-pointer',row.id)" @focusin="row.kind==='bone'&&treeHover('tree-focus',row.id)" @focusout="row.kind==='bone'&&leaveFocus($event,row.id)">
     <button v-if="row.kind==='attachment'" class="w-5 shrink-0 text-center" :class="active(row)?'text-ink':'text-faint'" :aria-label="t(active(row)?'deactivateAttachment':'activateAttachment',{name:row.name})" :aria-pressed="active(row)" :disabled="!w.canEdit||w.busy" data-testid="attachment-activation" @click="row.slotId!==null&&w.toggleAttachment(row.slotId,row.id)"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto size-3.5" aria-hidden="true"><path d="m7 12 5-5a2 2 0 0 1 3 3l-6 6a4 4 0 0 1-6-6l7-7a3 3 0 0 1 5 5l-6 6"/></svg></button>
     <button v-else-if="row.kind==='slot'&&!w.sceneEditing" class="w-5 shrink-0 text-muted" :aria-label="t(slotVisible(row)?'hideImage':'showImage')+' '+row.name" :disabled="!w.canEdit||w.busy||!w.sceneSlots.find(s=>s.id===row.id)?.attachments.length" @click="visibility(row)"><AppIcon name="eye" class="!size-3.5" :class="slotVisible(row)?'':'opacity-25'"/></button><span v-else class="w-5 shrink-0 text-center text-faint" :title="row.kind==='slot'?t(slotVisible(row)?'activeAttachment':'inactiveAttachment'):undefined">{{row.kind==='slot'&&slotVisible(row)?'●':'·'}}</span>
     <button role="treeitem" :aria-level="(guides.get(row.key)?.depth??row.depth)+1" :aria-selected="selected(row)" :aria-expanded="row.hasChildren?!collapsed.has(row.key):undefined" class="relative flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left" :style="{paddingLeft:`${(guides.get(row.key)?.depth??row.depth)*13}px`}" @click="choose(row,$event)" @dblclick="row.kind==='bone'&&startRename(row.id)" @keydown.f2.prevent="row.kind==='bone'&&startRename(row.id)" @keydown.left.prevent="row.hasChildren&&!collapsed.has(row.key)&&toggle(row.key)" @keydown.right.prevent="collapsed.has(row.key)&&toggle(row.key)">
      <svg v-if="guides.get(row.key)?.depth" aria-hidden="true" data-testid="tree-guides" class="pointer-events-none absolute inset-y-0 left-0 h-full text-faint/60" :width="(guides.get(row.key)?.depth??0)*13" :viewBox="`0 0 ${(guides.get(row.key)?.depth??0)*13} 100`" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke">
       <line v-for="column in guides.get(row.key)?.continuations" :key="column" :x1="column*13+6" :x2="column*13+6" y1="0" y2="100" vector-effect="non-scaling-stroke"/>
       <path :d="`M${(guides.get(row.key)?.elbow??0)*13+6} 0V50H${(guides.get(row.key)?.depth??0)*13}`" vector-effect="non-scaling-stroke"/>
       <line v-if="!guides.get(row.key)?.last" :x1="(guides.get(row.key)?.elbow??0)*13+6" :x2="(guides.get(row.key)?.elbow??0)*13+6" y1="50" y2="100" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="w-3 shrink-0 text-center text-faint" @click.stop="row.hasChildren&&toggle(row.key)">{{row.hasChildren?(collapsed.has(row.key)?'▸':'▾'):''}}</span><AppIcon :name="row.kind==='bone'?'bone':row.kind==='slot'?'tree':row.kind==='constraint'?'weights':row.attachmentType==='mesh'?'mesh':row.attachmentType==='clipping'?'grid':'image'" class="!size-3.5" :class="row.kind==='bone'?'text-bone':'text-accent'"/><span v-if="renaming!==row.id||row.kind!=='bone'" class="truncate">{{row.name}}</span>
     </button><button v-if="w.editorMode==='animate'&&row.kind==='slot'" class="dock-tab !p-0.5" :data-testid="'tree-key-slot-'+row.id" :aria-label="'Key attachment '+row.name" :disabled="!w.canEdit||w.busy||!w.activeAnimation" @click="w.insertSlotAnimationKeys({slotId:row.id,channel:'attachment'})"><AppIcon name="key" class="!size-3"/></button><input v-if="row.kind==='bone'&&renaming===row.id" v-model="rename" data-tree-rename maxlength="120" :aria-label="t('renameBone')" class="editor-input mx-1 w-28" @keydown.enter.prevent="commitRename" @keydown.esc.prevent="renaming=null" @blur="commitRename"/>
    </div>
   </template>
   <section v-if="w.animations.length" class="mt-2" aria-label="Animations">
    <button class="tree-row w-full gap-1 px-1 text-muted" :aria-expanded="!collapsed.has('animations')" @click="toggle('animations')"><span class="w-3">{{collapsed.has('animations')?'▸':'▾'}}</span><span class="text-motion">⌁</span> Animations</button>
    <div v-if="!collapsed.has('animations')">
     <button v-for="animation in w.animations.filter(a=>!search||a.name.toLowerCase().includes(search.toLowerCase()))" :key="animation.id" class="tree-row w-full gap-1 pl-6 text-left" :class="{selected:w.editorMode==='animate'&&w.animationId===animation.id}" :data-testid="'tree-animation-'+animation.id" @click="chooseAnimation(animation.id)"><span class="text-motion">⌁</span><span class="truncate">{{animation.name}}</span></button>
    </div>
   </section>
   <section v-if="w.eventDefinitions.length" class="mt-2" aria-label="Events">
    <button class="tree-row w-full gap-1 px-1 text-muted" :aria-expanded="!collapsed.has('events')" @click="toggle('events')"><span class="w-3">{{collapsed.has('events')?'▸':'▾'}}</span><AppIcon name="key" class="!size-3 text-motion"/>Events</button>
    <div v-if="!collapsed.has('events')"><div v-for="event in w.eventDefinitions.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase()))" :key="event.id" class="tree-row flex w-full gap-1 pl-6" :class="{selected:w.selectedEventId===event.id}"><button class="flex min-w-0 flex-1 items-center gap-1 text-left" :data-testid="'tree-event-'+event.id" @click="w.selectEvent(event.id)"><AppIcon name="key" class="!size-3 text-motion"/><span class="truncate">{{event.name}}</span></button><button v-if="w.editorMode==='animate'" type="button" class="px-1 text-accent" :disabled="w.busy" :aria-label="'Key event '+event.name" @click="w.insertEventAnimationKey(event.id)"><AppIcon name="key" class="!size-3"/></button></div></div>
   </section>
   <ImagesLibrary/><p v-if="!rows.length" class="p-3 leading-5 text-muted">{{t(w.project?'noMatches':'emptyHierarchy')}}</p>
  </div>
  <div class="flex gap-1 border-t border-line p-1.5"><AppButton :disabled="w.editorMode==='animate'||!w.canEdit||w.busy" :title="t('addBone')" :aria-label="t('addBone')" @click="w.addBone"><AppIcon name="bone"/><AppIcon name="plus" class="!size-3"/></AppButton><div ref="newAnchor" class="min-w-0 flex-1"><AppButton class="w-full" data-testid="tree-new" :disabled="!w.sceneEditing||w.busy" :aria-expanded="newMenu" aria-haspopup="menu" :aria-controls="newMenu?menuId:undefined" @click="toggleNew" @keydown.down.prevent="openNew">{{t('newObject')}} ▾</AppButton></div><AppButton :disabled="!w.canEdit||w.busy||(!w.selectedEvent&&!w.selectedAttachment&&!w.selectedConstraint&&!w.selectedSlot&&(!w.selectedBone||w.selectedBone.parent===null))" :aria-label="t('deleteSelection')" @click="w.removeSelection"><AppIcon name="trash"/></AppButton></div>
  <Teleport to="body"><div v-if="newMenu" :id="menuId" ref="newPopup" role="menu" :aria-label="t('newObject')" data-testid="tree-new-menu" class="fixed z-80 overflow-y-auto rounded-sm border border-line bg-panel p-1 text-ink shadow-xl" :style="menuPosition" @keydown="menuKey">
   <button role="menuitem" :class="menuItem" data-testid="tree-new-animation" @click="closeNew();emit('createAnimation')">Animation</button><button role="menuitem" :class="menuItem" data-testid="tree-new-event" :disabled="w.editorMode==='animate'" @click="closeNew();emit('createEvent')">Event</button><hr class="my-1 border-line"/><button role="menuitem" :class="menuItem" :disabled="w.editorMode==='animate'" @click="closeNew();w.createSlot()">{{t('newSlot')}}</button><button role="menuitem" :class="menuItem" :disabled="w.editorMode==='animate'||!w.sceneSlots.length" :title="!w.sceneSlots.length?t('createSlotFirst'):undefined" @click="closeNew();emit('createClipping')">{{t('newClipping')}}</button><hr class="my-1 border-line"/><button v-for="type in (['ik','transform','physics'] as const)" :key="type" role="menuitem" :class="menuItem" :disabled="w.editorMode==='animate'||type==='physics'&&!w.canAddPhysics" :title="type==='physics'&&!w.canAddPhysics?t('selectPhysicsBones'):undefined" @click="newConstraint(type)">{{t('constraint_'+type)}}</button>
  </div></Teleport>
 </template><SlotHierarchy v-else/>
</template>
