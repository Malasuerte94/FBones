<script setup lang="ts">
import {computed,ref,nextTick,onMounted,onBeforeUnmount,useId,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {canParent} from '../../domain/rig';
import {parseImageDropKeys} from '../../domain/imageSelection';
import {projectTree,treeKey,type ProjectTreeRow,type TreeKind,type TreeSlotNode} from '../../domain/treeProjection';
import {treeGuides} from '../../domain/treeGuides';
import AppIcon from '../atoms/AppIcon.vue';
import AppButton from '../atoms/AppButton.vue';
import TreeFilterMenu from '../molecules/TreeFilterMenu.vue';
import ImagesLibrary from './ImagesLibrary.vue';
import SlotHierarchy from './SlotHierarchy.vue';
const w=useWorkspace(),{t}=useI18n(),search=ref(''),tab=ref('tree'),collapsed=ref(new Set<string>());
const props=defineProps<{sceneHistoryDisabled?:boolean;dockVisible?:boolean;findReplaceEnabled?:boolean;filterGestureActive?:()=>boolean;hiddenSkeletonName?:string|null}>();
const filterKinds:readonly TreeKind[]=['bone','slot','attachment','constraint'];
const autoScroll=ref(false),treeScroll=ref<HTMLElement|null>(null);
const searchInput=ref<HTMLInputElement|null>(null);
const renaming=ref<number|null>(null),rename=ref(''),dropTarget=ref<string|null>(null),newMenu=ref(false);
interface TreeDisplaySlot extends TreeSlotNode {
  visible: boolean;
  activeAttachmentId: number|null;
}
// Sampled colors, transforms and mesh data do not affect these rows. Keep
// the sampled slot order and activation indicators as part of the comparison.
const treeSlots=computed<readonly TreeDisplaySlot[]>(previous=>{
  const slots=w.sceneSlots;
  if(previous?.length===slots.length&&slots.every((slot,index)=>{
    const prior=previous[index]!;
    return slot.id===prior.id&&slot.bone===prior.bone&&slot.name===prior.name&&slot.visible===prior.visible&&
      slot.activeAttachmentId===prior.activeAttachmentId&&slot.attachments.length===prior.attachments.length&&
      slot.attachments.every((attachment,attachmentIndex)=>{
        const before=prior.attachments[attachmentIndex]!;
        return attachment.id===before.id&&attachment.name===before.name&&attachment.type===before.type;
      });
  }))return previous;
  return slots.map(({id,bone,name,visible,activeAttachmentId,attachments})=>({
    id,bone,name,visible,activeAttachmentId,
    attachments:attachments.map(({id,name,type})=>({id,name,type})),
  }));
});
const treeSlotsById=computed(()=>new Map(treeSlots.value.map(slot=>[slot.id,slot])));
const projection=computed(()=>({bones:w.project?.bones??[],slots:treeSlots.value,constraints:w.project?.constraints??[]}));
const searchTerm=computed(()=>search.value.trim().toLocaleLowerCase());
const projectionSearch=computed(()=>w.treeTextSearchFilters?search.value:'');
const filteringSearch=computed(()=>w.treeTextSearchFilters&&!!searchTerm.value);
const matchesSearch=(name:string)=>name.toLocaleLowerCase().includes(searchTerm.value);
const highlightSearchMatch=(name:string)=>!w.treeTextSearchFilters&&!!searchTerm.value&&matchesSearch(name);
const searchMatchDescription=useId();
const fullNameDescription=useId();
const hiddenNamePrefix=computed(()=>props.hiddenSkeletonName?`${props.hiddenSkeletonName}/`:null);
function shortensName(name:string){
 const prefix=hiddenNamePrefix.value;
 return prefix!==null&&name.startsWith(prefix)&&name.length>prefix.length;
}
function displayName(name:string){
 const prefix=hiddenNamePrefix.value;
 return prefix!==null&&shortensName(name)?`...${name.slice(prefix.length)}`:name;
}
function fullNameId(key:string){return `${fullNameDescription}-${key}`;}
function nameDescription(name:string,key:string){
 const ids=[];
 if(shortensName(name))ids.push(fullNameId(key));
 if(highlightSearchMatch(name))ids.push(searchMatchDescription);
 return ids.length?ids.join(' '):undefined;
}
const rows=computed(()=>projectTree(projection.value,w.treeFilters,{search:projectionSearch.value,collapsed:collapsed.value}));
const constraintRows=computed(()=>rows.value.filter(row=>row.kind==='constraint'));
const objectRows=computed(()=>rows.value.filter(row=>row.kind!=='constraint'));
const displayedAnimations=computed(()=>collapsed.value.has('animations')?[]:
  filteringSearch.value?w.animations.filter(clip=>matchesSearch(clip.name)):w.animations);
const displayedEvents=computed(()=>collapsed.value.has('events')?[]:
  filteringSearch.value?w.eventDefinitions.filter(event=>matchesSearch(event.name)):w.eventDefinitions);
type SearchResult=ProjectTreeRow|{kind:'animation'|'event';id:number;name:string;key:string};
const searchResults=computed<SearchResult[]>(()=>{
 if(!searchTerm.value)return [];
 const results:SearchResult[]=rows.value.filter(row=>matchesSearch(row.name));
 for(const clip of displayedAnimations.value)if(matchesSearch(clip.name))results.push({kind:'animation',id:clip.id,name:clip.name,key:`animation:${clip.id}`});
 for(const event of displayedEvents.value)if(matchesSearch(event.name))results.push({kind:'event',id:event.id,name:event.name,key:`event:${event.id}`});
 return results;
});
const guides=computed(()=>new Map([...treeGuides(objectRows.value),...treeGuides(constraintRows.value,'group:constraints')]));
const newAnchor=ref<HTMLElement|null>(null),newPopup=ref<HTMLElement|null>(null),menuId=useId();
const menuPosition=ref({left:'0px',top:'0px',width:'224px',maxHeight:'240px'});
const menuItem='block w-full px-2 py-1.5 text-left text-xs hover:bg-raised focus-visible:bg-raised disabled:opacity-40';
const plannedItem='block w-full px-2 py-1 text-left text-xs text-muted';
const plannedAttachments=[
 ['path-attachment','newPathAttachment'],
 ['bounding-box','newBoundingBox'],
 ['point','newPoint'],
] as const;
const plannedConstraints=[
 ['path-constraint','newPathConstraint'],
 ['slider-constraint','newSliderConstraint'],
] as const;
const canMoveAttachment=computed(()=>w.sceneEditing&&w.canEdit&&!w.busy&&!w.traceOpen&&!w.clippingDraft&&!w.inspectorError);
const fixedAttachmentIds=computed(()=>new Set(w.sceneAttachments.filter(a=>a.linkedMeshSourceId!==undefined||a.type==='path').map(a=>a.id)));
function pathOwner(id:number){return treeSlotsById.value.get(id)?.attachments.some(attachment=>attachment.type==='path')??false;}
const canDeleteSelection=computed(()=>w.canEdit&&!w.busy&&w.selectedConstraintIds.length<=1&&(
  w.selectedConstraint?w.selectedConstraint.type!=='path':
    !!w.selectedEvent||!!w.selectedAttachment||!!w.selectedSlot&&!pathOwner(w.selectedSlot.id)||
    (w.selectedBone!==null&&w.selectedBone.parent!==null)
));
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
async function chooseAnimation(id:number,isCurrent=()=>true,preserveCurrent=false){
 await w.setEditorMode('animate');
 if(w.editorMode!=='animate'||!isCurrent())return false;
 if(!preserveCurrent||w.animationId!==id)w.selectAnimation(id);
 return w.animationId===id;
}
function toggle(key:string){const next=new Set(collapsed.value);if(next.has(key))next.delete(key);else next.add(key);collapsed.value=next;}
function constraintType(row:ProjectTreeRow){return w.constraints.find(c=>c.id===row.id)?.type??'ik';}
function constraintIcon(row:ProjectTreeRow){const type=constraintType(row);return type==='path'?'curve':type;}
function selected(row:ProjectTreeRow){if(row.kind==='constraint')return w.selectedConstraintIds.includes(row.id);if(row.kind==='attachment')return w.selectedAttachmentIds.includes(row.id);if(row.kind==='slot')return w.selectedSlotId===row.id&&(w.selectedAttachmentId===null||!w.treeFilters.attachment);return (w.editMode==='weights'&&w.influence===row.id)||(w.selectedAttachmentId===null&&w.selectedConstraintId===null&&w.selectedSlotId===null&&w.selectedIds.includes(row.id));}
function primaryTreeKey(){
 if(w.librarySelection!==null||w.selectedEventId!==null)return null;
 if(w.selectedConstraintId!==null)return treeKey('constraint',w.selectedConstraintId);
 if(w.selectedAttachmentId!==null)return treeKey('attachment',w.selectedAttachmentId);
 if(w.selectedSlotId!==null)return treeKey('slot',w.selectedSlotId);
 return w.selectedId!==null&&w.selectedIds.includes(w.selectedId)?treeKey('bone',w.selectedId):null;
}
const searchBlocked=computed(()=>!w.project||tab.value!=='tree'||props.dockVisible===false||!!props.sceneHistoryDisabled||
 w.busy||w.editing||w.openingProject||w.parentPicking||w.traceOpen||w.traceApplying||!!w.clippingDraft||!!w.meshOutlineDraft||w.pruneOpen||
 w.newDialog||w.discardDialog||renaming.value!==null||!!(w.inspectorError||w.animationKeyError||w.eventKeyError||w.sequenceFieldError||w.attachmentColorError));
const searchArrowsDisabled=computed(()=>searchBlocked.value||!searchResults.value.length);
const animationSearchHit=ref<{id:number;sceneKey:string|null}|null>(null),pendingSearchKey=ref<string|null>(null);
let searchRequest=0;
function resetSearchCursor(){searchRequest++;animationSearchHit.value=null;pendingSearchKey.value=null;}
watch([search,tab,()=>w.project?.documentId],resetSearchCursor,{flush:'sync'});
function searchSceneKey(){
 if(w.selectedEventId!==null)return `event:${w.selectedEventId}`;
 if(w.selectedAttachmentId!==null&&!w.treeFilters.attachment&&w.selectedSlotId!==null)return treeKey('slot',w.selectedSlotId);
 return primaryTreeKey();
}
function searchAnchor(){
 const sceneKey=searchSceneKey(),recent=animationSearchHit.value;
 const clipKey=w.editorMode==='animate'&&w.animationId!==null?`animation:${w.animationId}`:null;
 if(recent&&recent.id===w.animationId&&recent.sceneKey===sceneKey&&clipKey!==null&&searchResults.value.some(result=>result.key===clipKey))return clipKey;
 return searchResults.value.some(result=>result.key===sceneKey)?sceneKey:clipKey;
}
const searchStatus=computed(()=>{
 const key=searchAnchor(),index=searchResults.value.findIndex(result=>result.key===key);
 const result=searchResults.value[index];
 return result?t('treeSearchResultStatus',{name:result.name,index:index+1,count:searchResults.value.length}):'';
});
function activeSearchPane(allowCheckbox=false){
 const pane=treeScroll.value,focused=document.activeElement;
 if(searchBlocked.value||!pane?.isConnected||pane.clientHeight<=0)return null;
 if(focused!==searchInput.value&&focused instanceof HTMLElement&&
   (focused.isContentEditable||focused.matches('input,textarea,select'))&&!(allowCheckbox&&focused.matches('input[type="checkbox"]')))return null;
 return pane;
}
function applyFilterAction(action:()=>void){
 if(activeSearchPane(true)&&!props.filterGestureActive?.())action();
}
function toggleQuickTreeFilter(kind:TreeKind){applyFilterAction(()=>w.setTreeFilter(kind,!w.treeFilters[kind],true));}
function setTreeFilter(kind:TreeKind,checked:boolean){applyFilterAction(()=>w.setTreeFilter(kind,checked));}
function toggleTreeFiltersBypass(){applyFilterAction(w.toggleTreeFiltersBypass);}
function resetTreeFilters(){applyFilterAction(w.resetTreeFilters);}
function setTreeTextSearchFilters(checked:boolean){applyFilterAction(()=>w.setTreeTextSearchFilters(checked));}
function focusSearch(){
 const input=searchInput.value;
 if(!input||!activeSearchPane())return false;
 input.focus({preventScroll:true});
 return document.activeElement===input;
}
function isOnlySceneSelection(row:ProjectTreeRow){
 if(primaryTreeKey()!==row.key)return false;
 const counts={bone:w.selectedIds.length,slot:w.selectedSlotIds.length,
   attachment:w.selectedAttachmentIds.length,constraint:w.selectedConstraintIds.length};
 return counts[row.kind]===1;
}
function navigateSearch(direction:-1|1){
 const pane=activeSearchPane(),model=w.project,results=searchResults.value;
 if(!pane||!model||!results.length)return false;
 const anchor=pendingSearchKey.value??searchAnchor(),index=results.findIndex(result=>result.key===anchor);
 const result=results[index<0?(direction===1?0:results.length-1):(index+direction+results.length)%results.length]!;
 const request=++searchRequest,documentId=model.documentId,query=search.value,mode=w.editorMode,filters={...w.treeFilters};
 const textFilters=w.treeTextSearchFilters;
 pendingSearchKey.value=null;
 const sameRequest=()=>request===searchRequest&&w.project?.documentId===documentId&&
   search.value===query&&w.treeTextSearchFilters===textFilters&&filterKinds.every(kind=>w.treeFilters[kind]===filters[kind])&&
   searchResults.value.some(item=>item.key===result.key);
 const scrollResult=async()=>{
   await nextTick();
   if(!sameRequest()||activeSearchPane()!==pane||w.editorMode!==(result.kind==='animation'?'animate':mode)||searchAnchor()!==result.key)return;
   const selector=result.kind==='animation'||result.kind==='event'?`[data-testid="tree-${result.kind}-${result.id}"]`:
     `[data-tree-kind="${result.kind}"][data-tree-id="${result.id}"]`;
   const node=pane.querySelector<HTMLElement>(selector);
   if(node)scrollTreeRow(pane,node);
 };
 if(result.kind==='animation'){
   pendingSearchKey.value=result.key;
   // Setup may switch to an Animate layout with its Tree minimized.
   const canSelect=()=>sameRequest()&&(activeSearchPane()===pane||mode==='setup'&&w.editorMode==='animate');
   void chooseAnimation(result.id,canSelect,mode==='animate').then(applied=>{
     if(request!==searchRequest)return;
     pendingSearchKey.value=null;
     if(!applied||!sameRequest())return;
     animationSearchHit.value={id:result.id,sceneKey:searchSceneKey()};
     void scrollResult();
   });
 }else{
   animationSearchHit.value=null;
   if(result.kind==='event'){
     if(w.selectedEventId!==result.id)w.selectEvent(result.id);
   }else if('parent' in result&&!isOnlySceneSelection(result))choose(result,undefined,true);
   void scrollResult();
 }
 return true;
}
function searchKey(event:KeyboardEvent){
 if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.key==='Escape'&&!event.shiftKey&&search.value){
   event.preventDefault();event.stopPropagation();search.value='';return;
 }
 if((event.key==='F3'||event.key==='Enter'&&event.target===searchInput.value)&&navigateSearch(event.shiftKey?-1:1)){
   event.preventDefault();event.stopPropagation();
 }
}
function setBranchCollapse(collapse:boolean,branch:string|null){
 if(tab.value!=='tree'||props.dockVisible===false||filteringSearch.value)return;
 const expanded=projectTree(projection.value,w.treeFilters);
 const next=new Set(collapsed.value),inside=new Set<string>();
 // Preorder puts each ancestor before its descendants, including hidden rows.
 for(const row of expanded){
   if(!row.hasChildren)continue;
   if(branch!==null){
     if(row.key!==branch&&(row.parent===null||!inside.has(row.parent)))continue;
     inside.add(row.key);
   }
   if(collapse)next.add(row.key);else next.delete(row.key);
 }
 if(next.size!==collapsed.value.size)collapsed.value=next;
}
function changeSelectedBranches(event:MouseEvent,collapse:boolean){
 const branch=primaryTreeKey();
 if(event.detail>=2){setBranchCollapse(collapse,null);return;}
 if(branch===null&&(w.librarySelection!==null||w.selectedEventId!==null))return;
 setBranchCollapse(collapse,branch);
}
function toggleRowBranch(event:MouseEvent,row:ProjectTreeRow){
 if(!row.hasChildren||filteringSearch.value||event.target instanceof HTMLElement&&
   (event.target.isContentEditable||event.target.closest('input,textarea,select')))return;
 event.preventDefault();
 event.stopPropagation();
 setBranchCollapse(!collapsed.value.has(row.key),row.key);
}
async function revealSelection(automatic=false,expectedKey?:string){
 const pane=treeScroll.value,documentId=w.project?.documentId,mode=w.editorMode,key=primaryTreeKey();
 const query=search.value,projectedQuery=projectionSearch.value,filters={...w.treeFilters},textFilters=w.treeTextSearchFilters;
 if(documentId===undefined||!pane||key===null||(expectedKey!==undefined&&expectedKey!==key))return;
 const isCurrent=()=>props.dockVisible!==false&&!w.openingProject&&tab.value==='tree'&&pane===treeScroll.value&&
   pane.isConnected&&pane.clientHeight>0&&w.project?.documentId===documentId&&w.editorMode===mode&&
   primaryTreeKey()===key&&query===search.value&&w.treeTextSearchFilters===textFilters&&filterKinds.every(kind=>filters[kind]===w.treeFilters[kind])&&
   (!automatic||autoScroll.value);
 if(!isCurrent())return;
 await nextTick();
 if(!isCurrent())return;
 let row=rows.value.find(item=>item.key===key);
 if(!row){
   const expanded=projectTree(projection.value,filters,{search:projectedQuery});
   const byKey=new Map(expanded.map(item=>[item.key,item]));
   row=byKey.get(key);
   if(!row||!selected(row))return;
   const next=new Set(collapsed.value);
   let parent=row.parent;
   while(parent!==null){next.delete(parent);parent=byKey.get(parent)?.parent??null;}
   if(next.size!==collapsed.value.size)collapsed.value=next;
   await nextTick();
   if(!isCurrent()||!rows.value.some(item=>item.key===key))return;
 }
 if(!selected(row))return;
 const node=pane.querySelector<HTMLElement>(`[data-tree-kind="${row.kind}"][data-tree-id="${row.id}"]`);
 if(node)scrollTreeRow(pane,node);
}
function scrollTreeRow(pane:HTMLElement,node:HTMLElement){
 const viewTop=pane.getBoundingClientRect().top+pane.clientTop,viewBottom=viewTop+pane.clientHeight;
 const bounds=node.getBoundingClientRect();
 if(bounds.top<viewTop)pane.scrollTop+=bounds.top-viewTop;
 else if(bounds.bottom>viewBottom)pane.scrollTop+=bounds.bottom-viewBottom;
}
function revealViewportSelection(target:Readonly<{kind:TreeKind;id:number}>){
 if(autoScroll.value)return revealSelection(true,treeKey(target.kind,target.id));
}
defineExpose({revealViewportSelection,navigateSearch,focusSearch});
function choose(row:ProjectTreeRow,event?:MouseEvent,fromSearch=false){
 if(!fromSearch)resetSearchCursor();
 if(w.parentPicking){if(row.kind==='bone')void w.chooseParent(row.id);return;}
 newMenu.value=false;
 const modifiers={toggle:!!(event?.ctrlKey||event?.metaKey),shift:!!event?.shiftKey};
 if(!fromSearch&&row.kind==='bone'&&w.editMode==='weights'&&w.selectedBinding){
   w.chooseInfluence(row.id,modifiers);
   return;
 }
 w.withSceneSelectionHistory(()=>{
   if(row.kind==='constraint'){
     w.selectConstraint(row.id,{...modifiers,ordered:constraintRows.value.map(r=>r.id)});
     return;
   }
   if(row.kind==='attachment'){
     if(w.editorMode==='setup'&&w.editMode==='bones')w.setMode('images');
     w.selectAttachment(row.id,{...modifiers,ordered:rows.value.filter(r=>r.kind==='attachment').map(r=>r.id)});
     return;
   }
   if(row.kind==='slot'){
     w.librarySelection=null;
     if(w.editorMode==='setup'&&w.editMode==='bones')w.setMode('images');
     w.selectSlot(row.id);
     return;
   }
   w.librarySelection=null;
   w.setMode('bones');
   let ids=[row.id];
   if(modifiers.shift&&w.selectedId!==null){
     const ordered=rows.value.filter(r=>r.kind==='bone').map(r=>r.id),a=ordered.indexOf(w.selectedId),b=ordered.indexOf(row.id);
     if(a>=0)ids=ordered.slice(Math.min(a,b),Math.max(a,b)+1);
   }else if(modifiers.toggle)ids=w.selectedIds.includes(row.id)?w.selectedIds.filter(id=>id!==row.id):[...w.selectedIds,row.id];
   w.selectBones(ids,ids.includes(row.id)?row.id:ids.at(-1)??null);
 });
}
async function startRename(id:number){if(w.parentPicking)return;w.setMode('bones');w.selectBone(id);renaming.value=id;rename.value=w.selectedBone?.name??'';await nextTick();const input=document.querySelector<HTMLInputElement>('[data-tree-rename]');input?.focus();input?.select();}
async function commitRename(){const id=renaming.value,bone=w.project?.bones.find(b=>b.id===id);if(!bone||w.busy)return;const success=await w.editRig({...bone,type:'update',name:rename.value});if(success)renaming.value=null;}
function canDragRow(row:ProjectTreeRow){
 if(w.parentPicking||!w.canEdit||w.busy||renaming.value!==null)return false;
 if(row.kind==='attachment')return canMoveAttachment.value&&!fixedAttachmentIds.value.has(row.id);
 if(row.kind==='constraint')return constraintType(row)!=='path';
 return row.kind!=='slot'||!pathOwner(row.id);
}
function treeDrag(event:DragEvent,row:ProjectTreeRow){
 if(!canDragRow(row)){event.preventDefault();return;}
 if(row.kind==='attachment'){
   if(!w.project){event.preventDefault();return;}
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
     const attachment=w.sceneAttachments.find(a=>a.id===item.id);if(!attachment||attachment.slot===row.id||fixedAttachmentIds.value.has(attachment.id))return;
     await w.moveAttachment(attachment.id,row.id,item.revision as number);
   }catch{/* A foreign or malformed payload does not move an attachment. */}
   return;
 }
 try{const item=JSON.parse(event.dataTransfer?.getData('application/x-fbones-tree')??'');if(row.kind==='constraint'&&item.kind==='constraint'){const index=w.project?.constraints?.findIndex(c=>c.id===row.id)??-1;if(index>=0)await w.reorderConstraint(item.id,index);}
 else if(row.kind==='bone'&&item.kind==='bone'){if(canParent(w.project?.bones??[],item.id,row.id))await w.editRig({type:'reparent',id:item.id,parent:row.id});}
 else if(row.kind==='bone'&&item.kind==='slot'){const slot=w.sceneSlots.find(s=>s.id===item.id),r=slot?.region;if(slot&&!pathOwner(slot.id))await w.editRig({type:'updateSlot',id:slot.id,name:slot.name,bone:row.id,visible:slot.visible,x:r?.x??0,y:r?.y??0,rotation:r?.rotation??0,scaleX:r?.scaleX??1,scaleY:r?.scaleY??1});}}
 catch{/* Foreign drag payloads do not edit a project. */}
}
function navigate(event:KeyboardEvent){
 if(event.key==='PageDown'||event.key==='PageUp'){
   if(!props.sceneHistoryDisabled&&!event.defaultPrevented&&!event.isComposing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&
     event.target instanceof HTMLElement&&event.target.matches('[role="treeitem"]')&&
     w.visitSceneSelectionHistory(event.key==='PageDown'?-1:1))event.preventDefault();
   return;
 }
 if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
 const buttons=Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="treeitem"]'));
 const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
 const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowDown'?1:-1)));
 event.preventDefault();buttons[next]?.focus();
}
function leaveFocus(event:FocusEvent,id:number){if(!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node|null))clearTreeHover('tree-focus',id);}
function active(row:ProjectTreeRow){return row.slotId!==null&&treeSlotsById.value.get(row.slotId)?.activeAttachmentId===row.id;}
function slotVisible(row:ProjectTreeRow){return treeSlotsById.value.get(row.id)?.visible??false;}
function visibility(row:ProjectTreeRow){const slot=w.sceneSlots.find(s=>s.id===row.id);if(!slot)return;const r=slot.region;void w.editRig({type:'updateSlot',id:slot.id,name:slot.name,bone:slot.bone,visible:!slot.visible,x:r?.x??0,y:r?.y??0,rotation:r?.rotation??0,scaleX:r?.scaleX??1,scaleY:r?.scaleY??1});}
const emit=defineEmits<{createConstraint:[type:'ik'|'transform'|'physics'];createClipping:[];createLinkedMesh:[];createAnimation:[];createEvent:[];
 findReplace:[opener:HTMLButtonElement]}>();
function openFindReplace(event:MouseEvent){
 if(props.findReplaceEnabled&&event.currentTarget instanceof HTMLButtonElement)emit('findReplace',event.currentTarget);
}
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
 <div class="dock-title"><AppIcon name="tree"/><h2>{{t('tree')}}</h2><span class="ml-auto text-faint">{{w.project?.bones.length??0}} / {{treeSlots.length}}</span></div>
 <div class="flex items-center gap-1 border-b border-line p-1.5"><button v-for="item in ['tree','drawOrder']" :key="item" class="dock-tab" :class="tab===item?'active':''" :aria-pressed="tab===item" @click="tab=item">{{t(item)}}</button></div>
 <template v-if="tab==='tree'">
  <div class="flex flex-wrap items-center gap-1 p-1.5">
    <div class="flex min-w-0 flex-[1_1_6rem] items-center gap-0.5" @keydown="searchKey">
      <input ref="searchInput" v-model="search" type="search" :aria-label="t('searchTree')" :placeholder="t('searchTree')" class="editor-input min-w-0 flex-1"/>
      <button type="button" class="dock-tab !px-1" :disabled="searchArrowsDisabled" :aria-label="t('treeSearchPrevious')"
        :title="t('treeSearchPrevious')" data-testid="tree-search-previous" @mousedown="searchInput?.matches(':focus') && $event.preventDefault()" @keydown.space.stop
        @click="navigateSearch(-1)"><AppIcon name="treeSearchPrevious" class="!size-3.5"/></button>
      <button type="button" class="dock-tab !px-1" :disabled="searchArrowsDisabled" :aria-label="t('treeSearchNext')"
        :title="t('treeSearchNext')" data-testid="tree-search-next" @mousedown="searchInput?.matches(':focus') && $event.preventDefault()" @keydown.space.stop
        @click="navigateSearch(1)"><AppIcon name="treeSearchNext" class="!size-3.5"/></button>
      <span role="status" class="sr-only" data-testid="tree-search-result-status">{{searchStatus}}</span>
      <span :id="searchMatchDescription" class="sr-only">{{t('treeSearchMatch')}}</span>
    </div>
    <div class="flex shrink-0 items-center gap-0.5">
      <button v-for="kind in filterKinds" :key="kind" type="button" class="dock-tab !px-1"
        :class="w.treeFilters[kind]?'text-accent':'text-faint'" :aria-pressed="w.treeFilters[kind]"
        :aria-label="t('filter_'+kind)" :title="t('filter_'+kind)" :data-testid="`tree-filter-${kind}`"
        :disabled="searchBlocked" @mousedown.prevent @keydown.space.stop @click="toggleQuickTreeFilter(kind)">
        <AppIcon :name="kind==='bone'?'bone':kind==='slot'?'tree':kind==='attachment'?'image':'weights'" class="!size-3.5"/>
      </button>
      <TreeFilterMenu :selected="w.treeFilterPreferences" :bypassed="w.treeFiltersBypassed"
        :text-filters="w.treeTextSearchFilters" :disabled="searchBlocked" @set-type="setTreeFilter"
        @toggle-bypass="toggleTreeFiltersBypass" @reset="resetTreeFilters" @set-text-filters="setTreeTextSearchFilters"/>
    </div>
    <div class="ml-auto flex shrink-0 items-center gap-0.5">
      <button type="button" class="dock-tab !px-1" :class="autoScroll?'active text-accent':'text-faint'" :aria-label="t('treeAutoScroll')"
        :aria-pressed="autoScroll" :title="t('treeAutoScrollHint')" aria-keyshortcuts="Shift+Enter" data-testid="tree-auto-scroll"
        @mousedown.prevent @click="autoScroll=!autoScroll" @keydown.space.stop
        @contextmenu.prevent.stop="revealSelection()" @keydown.shift.enter.exact.prevent.stop="revealSelection()">
        <AppIcon name="locate" class="!size-3.5"/>
      </button>
      <button type="button" class="dock-tab !px-1" :disabled="!findReplaceEnabled" :aria-label="t('treeFindReplace')"
        :title="t(findReplaceEnabled?'treeFindReplace':'treeFindReplaceSetup')" data-testid="tree-find-replace"
        @keydown.space.stop @click="openFindReplace"><AppIcon name="findReplace" class="!size-3.5"/></button>
      <button type="button" class="dock-tab !px-1" :disabled="filteringSearch" :aria-label="t('treeCollapseBranches')"
        :title="`${t('treeCollapseBranches')} · ${t('treeBranchesAllHint')}`" data-testid="tree-collapse-branches"
        @mousedown.prevent @keydown.space.stop @click="changeSelectedBranches($event,true)"><AppIcon name="minus" class="!size-3.5"/></button>
      <button type="button" class="dock-tab !px-1" :disabled="filteringSearch" :aria-label="t('treeExpandBranches')"
        :title="`${t('treeExpandBranches')} · ${t('treeBranchesAllHint')}`" data-testid="tree-expand-branches"
        @mousedown.prevent @keydown.space.stop @click="changeSelectedBranches($event,false)"><AppIcon name="plus" class="!size-3.5"/></button>
    </div>
  </div>
  <div class="mx-2 flex items-center gap-2 border-b border-line px-1 pb-2 text-xs"><AppIcon name="file" class="text-accent"/><h3 class="truncate">{{w.project?.name??t('noProject')}}</h3></div>
  <div ref="treeScroll" role="tree" aria-multiselectable="true" :aria-label="t('hierarchy')" class="min-h-0 flex-1 overflow-auto px-1 py-1" @keydown="navigate">
   <template v-for="(group,index) in [objectRows,constraintRows]" :key="index">
    <div v-if="index===1&&group.length" class="mt-2 flex items-center gap-1 px-1 py-1 text-muted"><AppIcon name="weights" class="!size-3.5"/>{{t('constraints')}}</div>
    <div v-for="row in group" :key="row.key" class="tree-row" :class="[selected(row)?'selected':'',row.kind==='bone'&&w.hoveredBoneId===row.id?'outline outline-1 -outline-offset-1 outline-warning/80':'',w.parentPicking&&row.kind==='bone'?(w.canPickParent(row.id)?'cursor-crosshair hover:bg-accent/15':'opacity-45'):'']" :data-tree-kind="row.kind" :data-tree-id="row.id" :data-attachment-type="row.attachmentType" :data-tree-search-match="highlightSearchMatch(row.name)?'true':undefined" :data-constraint-type="row.kind==='constraint'?constraintType(row):undefined" :data-parent-candidate="w.parentPicking&&row.kind==='bone'?String(w.canPickParent(row.id)):undefined" :data-bone-hovered="row.kind==='bone'&&w.hoveredBoneId===row.id?'true':undefined" :draggable="canDragRow(row)" :title="row.kind==='attachment'&&w.sceneEditing&&!fixedAttachmentIds.has(row.id)?t('attachmentMoveTreeHint'):undefined" :style="dropTarget===row.key?{outline:'1px solid var(--color-accent)'}:undefined" @contextmenu="toggleRowBranch($event,row)" @dragstart="treeDrag($event,row)" @dragover="accepts($event,row)" @dragleave="dropTarget=null" @dragend="dropTarget=null" @drop="drop($event,row)" @pointerenter="row.kind==='bone'&&treeHover('tree-pointer',row.id)" @pointerleave="row.kind==='bone'&&clearTreeHover('tree-pointer',row.id)" @focusin="row.kind==='bone'&&treeHover('tree-focus',row.id)" @focusout="row.kind==='bone'&&leaveFocus($event,row.id)">
     <button v-if="row.kind==='attachment'" class="w-5 shrink-0 text-center" :class="active(row)?'text-ink':'text-faint'" :aria-label="t(active(row)?'deactivateAttachment':'activateAttachment',{name:row.name})" :aria-pressed="active(row)" :disabled="!w.canEdit||w.busy" data-testid="attachment-activation" @click="row.slotId!==null&&w.toggleAttachment(row.slotId,row.id)"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto size-3.5" aria-hidden="true"><path d="m7 12 5-5a2 2 0 0 1 3 3l-6 6a4 4 0 0 1-6-6l7-7a3 3 0 0 1 5 5l-6 6"/></svg></button>
     <button v-else-if="row.kind==='slot'&&!w.sceneEditing" class="w-5 shrink-0 text-muted" :aria-label="t(slotVisible(row)?'hideImage':'showImage')+' '+row.name" :disabled="!w.canEdit||w.busy||!treeSlotsById.get(row.id)?.attachments.length" @click="visibility(row)"><AppIcon name="eye" class="!size-3.5" :class="slotVisible(row)?'':'opacity-25'"/></button><span v-else class="w-5 shrink-0 text-center text-faint" :title="row.kind==='slot'?t(slotVisible(row)?'activeAttachment':'inactiveAttachment'):undefined">{{row.kind==='slot'&&slotVisible(row)?'●':'·'}}</span>
     <button role="treeitem" :aria-describedby="nameDescription(row.name,row.key)" :aria-label="row.kind==='constraint'?t('constraint_'+constraintType(row))+': '+displayName(row.name):undefined" :title="shortensName(row.name)?row.name:row.kind==='constraint'?t('constraint_'+constraintType(row)):undefined" :aria-level="(guides.get(row.key)?.depth??row.depth)+1" :aria-selected="selected(row)" :aria-expanded="row.hasChildren?!collapsed.has(row.key):undefined" class="relative flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left" :style="{paddingLeft:`${(guides.get(row.key)?.depth??row.depth)*13}px`}" @click="choose(row,$event)" @dblclick="row.kind==='bone'&&startRename(row.id)" @keydown.f2.prevent="row.kind==='bone'&&startRename(row.id)" @keydown.left.prevent="row.hasChildren&&!collapsed.has(row.key)&&toggle(row.key)" @keydown.right.prevent="collapsed.has(row.key)&&toggle(row.key)">
      <svg v-if="guides.get(row.key)?.depth" aria-hidden="true" data-testid="tree-guides" class="pointer-events-none absolute inset-y-0 left-0 h-full text-faint/60" :width="(guides.get(row.key)?.depth??0)*13" :viewBox="`0 0 ${(guides.get(row.key)?.depth??0)*13} 100`" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke">
       <line v-for="column in guides.get(row.key)?.continuations" :key="column" :x1="column*13+6" :x2="column*13+6" y1="0" y2="100" vector-effect="non-scaling-stroke"/>
       <path :d="`M${(guides.get(row.key)?.elbow??0)*13+6} 0V50H${(guides.get(row.key)?.depth??0)*13}`" vector-effect="non-scaling-stroke"/>
       <line v-if="!guides.get(row.key)?.last" :x1="(guides.get(row.key)?.elbow??0)*13+6" :x2="(guides.get(row.key)?.elbow??0)*13+6" y1="50" y2="100" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="w-3 shrink-0 text-center text-faint" @click.stop="row.hasChildren&&toggle(row.key)">{{row.hasChildren?(collapsed.has(row.key)?'▸':'▾'):''}}</span><AppIcon :name="row.kind==='bone'?'bone':row.kind==='slot'?'tree':row.kind==='constraint'?constraintIcon(row):row.attachmentType==='mesh'?'mesh':row.attachmentType==='clipping'?'grid':row.attachmentType==='path'?'curve':'image'" class="!size-3.5" :class="row.kind==='bone'?'text-bone':'text-accent'"/><span v-if="renaming!==row.id||row.kind!=='bone'" class="tree-result-name truncate">{{displayName(row.name)}}</span>
      <span v-if="shortensName(row.name)" :id="fullNameId(row.key)" hidden>{{row.name}}</span>
     </button><button v-if="w.editorMode==='animate'&&row.kind==='slot'" class="dock-tab !p-0.5" :data-testid="'tree-key-slot-'+row.id" :aria-label="'Key attachment '+row.name" :disabled="!w.canEdit||w.busy||!w.activeAnimation" @click="w.insertSlotAnimationKeys({slotId:row.id,channel:'attachment'})"><AppIcon name="key" class="!size-3"/></button><input v-if="row.kind==='bone'&&renaming===row.id" v-model="rename" data-tree-rename maxlength="120" :aria-label="t('renameBone')" class="editor-input mx-1 w-28" @keydown.enter.prevent="commitRename" @keydown.esc.prevent="renaming=null" @blur="commitRename"/>
    </div>
   </template>
   <div v-if="w.project&&w.treeFilters.bone" class="tree-row gap-1 px-1 text-muted">
    <button v-if="w.editorMode==='animate'" type="button" class="dock-tab !p-0.5" data-testid="tree-draw-order-key"
      :aria-label="t('keyDrawOrder')" :title="t('keyDrawOrder')" :disabled="!w.sceneEditing||!w.canEdit||w.busy||!w.activeAnimation"
      @keydown.space.stop @click="w.insertDrawOrderKey()"><AppIcon name="key" class="!size-3"/></button>
    <span>{{t('drawOrder')}}</span>
   </div>
   <section v-if="w.animations.length" class="mt-2" aria-label="Animations">
    <button class="tree-row w-full gap-1 px-1 text-muted" :aria-expanded="!collapsed.has('animations')" @click="toggle('animations')"><span class="w-3">{{collapsed.has('animations')?'▸':'▾'}}</span><span class="text-motion">⌁</span> Animations</button>
    <div v-if="!collapsed.has('animations')">
     <button v-for="animation in displayedAnimations" :key="animation.id" class="tree-row w-full gap-1 pl-6 text-left"
       :class="{selected:w.editorMode==='animate'&&w.animationId===animation.id}" :data-testid="'tree-animation-'+animation.id"
       :data-tree-search-match="highlightSearchMatch(animation.name)?'true':undefined"
       :aria-describedby="nameDescription(animation.name,`animation:${animation.id}`)"
       :title="shortensName(animation.name)?animation.name:undefined" @click="resetSearchCursor();chooseAnimation(animation.id)">
      <span class="text-motion">⌁</span><span class="tree-result-name truncate">{{displayName(animation.name)}}</span>
      <span v-if="shortensName(animation.name)" :id="fullNameId(`animation:${animation.id}`)" hidden>{{animation.name}}</span>
     </button>
    </div>
   </section>
   <section v-if="w.eventDefinitions.length" class="mt-2" aria-label="Events">
    <button class="tree-row w-full gap-1 px-1 text-muted" :aria-expanded="!collapsed.has('events')" @click="toggle('events')"><span class="w-3">{{collapsed.has('events')?'▸':'▾'}}</span><AppIcon name="key" class="!size-3 text-motion"/>Events</button>
    <div v-if="!collapsed.has('events')">
     <div v-for="event in displayedEvents" :key="event.id" class="tree-row flex w-full gap-1 pl-6" :class="{selected:w.selectedEventId===event.id}"
       :data-tree-search-match="highlightSearchMatch(event.name)?'true':undefined">
      <button class="flex min-w-0 flex-1 items-center gap-1 text-left" :data-testid="'tree-event-'+event.id"
        :aria-describedby="nameDescription(event.name,`event:${event.id}`)"
        :title="shortensName(event.name)?event.name:undefined" @click="resetSearchCursor();w.selectEvent(event.id)">
        <AppIcon name="key" class="!size-3 text-motion"/><span class="tree-result-name truncate">{{displayName(event.name)}}</span>
        <span v-if="shortensName(event.name)" :id="fullNameId(`event:${event.id}`)" hidden>{{event.name}}</span>
      </button>
      <button v-if="w.editorMode==='animate'" type="button" class="px-1 text-accent" :disabled="w.busy" :aria-label="'Key event '+event.name" @click="w.insertEventAnimationKey(event.id)"><AppIcon name="key" class="!size-3"/></button>
     </div>
    </div>
   </section>
   <ImagesLibrary/><p v-if="!rows.length&&!displayedAnimations.length&&!displayedEvents.length" class="p-3 leading-5 text-muted">{{t(w.project?'noMatches':'emptyHierarchy')}}</p>
  </div>
  <div class="flex gap-1 border-t border-line p-1.5"><AppButton :disabled="w.editorMode==='animate'||!w.canEdit||w.busy" :title="t('addBone')" :aria-label="t('addBone')" @click="w.addBone"><AppIcon name="bone"/><AppIcon name="plus" class="!size-3"/></AppButton><div ref="newAnchor" class="min-w-0 flex-1"><AppButton class="w-full" data-testid="tree-new" :disabled="!w.sceneEditing||w.busy" :aria-expanded="newMenu" aria-haspopup="menu" :aria-controls="newMenu?menuId:undefined" @click="toggleNew" @keydown.down.prevent="openNew">{{t('newObject')}} ▾</AppButton></div><AppButton :disabled="!canDeleteSelection" :title="w.selectedConstraintIds.length>1?t('constraintBatchIndividualAction'):undefined" :aria-label="t('deleteSelection')" @click="w.removeSelection"><AppIcon name="trash"/></AppButton></div>
  <Teleport to="body"><div v-if="newMenu" :id="menuId" ref="newPopup" role="menu" :aria-label="t('newObject')" data-testid="tree-new-menu" class="fixed z-80 overflow-y-auto rounded-sm border border-line bg-panel p-1 text-ink shadow-xl" :style="menuPosition" @keydown="menuKey">
   <button role="menuitem" :class="menuItem" data-testid="tree-new-animation" @click="closeNew();emit('createAnimation')">Animation</button>
   <button role="menuitem" :class="menuItem" data-testid="tree-new-event" :disabled="w.editorMode==='animate'" @click="closeNew();emit('createEvent')">Event</button>
   <hr class="my-1 border-line"/>
   <button role="menuitem" :class="menuItem" :disabled="w.editorMode==='animate'" @click="closeNew();w.createSlot()">{{t('newSlot')}}</button>
   <button role="menuitem" :class="menuItem" :disabled="w.editorMode==='animate'||!treeSlots.length" :title="!treeSlots.length?t('createSlotFirst'):undefined" @click="closeNew();emit('createClipping')">{{t('newClipping')}}</button>
   <button v-if="w.editorMode==='setup'" role="menuitem" :class="menuItem" data-testid="tree-new-linked-mesh"
    :disabled="sceneHistoryDisabled||!w.canEdit||w.editing||!!w.inspectorError||!w.linkedMeshCreationSources.length"
    :title="!w.linkedMeshCreationSources.length?t('linkedMeshSourceNeeded'):undefined" @click="closeNew(true);emit('createLinkedMesh')">{{t('newLinkedMesh')}}</button>
   <div v-if="w.editorMode==='setup'" role="group" :aria-label="t('treePlannedAttachments')" class="my-1 border-l border-accent-deep">
    <p aria-hidden="true" class="px-2 py-1 text-[10px] text-faint">{{t('treePlannedAttachments')}}</p>
    <button v-for="[id,label] in plannedAttachments" :key="id" type="button" role="menuitem" disabled :class="plannedItem" :data-testid="`tree-new-${id}`">{{t(label)}}</button>
   </div>
   <hr class="my-1 border-line"/>
   <button v-for="type in (['ik','transform','physics'] as const)" :key="type" role="menuitem" :class="menuItem" :disabled="w.editorMode==='animate'||type==='physics'&&!w.canAddPhysics" :title="type==='physics'&&!w.canAddPhysics?t('selectPhysicsBones'):undefined" @click="newConstraint(type)">{{t('constraint_'+type)}}</button>
   <div v-if="w.editorMode==='setup'" role="group" :aria-label="t('treePlannedConstraints')" class="mt-1 border-l border-accent-deep">
    <p aria-hidden="true" class="px-2 py-1 text-[10px] text-faint">{{t('treePlannedConstraints')}}</p>
    <button v-for="[id,label] in plannedConstraints" :key="id" type="button" role="menuitem" disabled :class="plannedItem" :data-testid="`tree-new-${id}`">{{t(label)}}</button>
   </div>
  </div></Teleport>
 </template><SlotHierarchy v-else/>
</template>

<style scoped>
[data-tree-search-match] .tree-result-name {
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.15em;
}
</style>
