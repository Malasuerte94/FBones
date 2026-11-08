// Actual compiled Vue + production helpers. Synthetic host/events are not browser,
// GPU, OS input, Rust history/encoding or original-editor acceptance evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computed,shallowRef,ref,nextTick,effectScope} from 'vue';
import {source,workspace,Tree,Hierarchy,Timeline,timelineProps,nativeRequests} from './support/scene-slots-fixture.mjs';
import {flatten,event,dispatch} from './support/scene-slots-host.mjs';
import {sampleDrawOrder,orderSlots} from '../src/domain/animationGeometry.ts';
import {useGeometryAnimationWorkspace} from '../src/composables/useGeometryAnimationWorkspace.ts';
const call=(handler,value)=>[].concat(handler??[]).forEach(fn=>fn(value));
const row=(e,kind,id)=>e.all().find(n=>n.props['data-tree-kind']===kind&&n.props['data-tree-id']===id);
const item=(e,kind,id)=>flatten(row(e,kind,id)).find(n=>n.props.role==='treeitem');

test('512-slot production sampling retains full high-ID permutations and resets, rejecting incomplete/duplicate/foreign IDs',()=>{
 const p=source(),slots=p.slots,ids=slots.map(s=>s.id),keys=p.animations[0].drawOrder,before=JSON.stringify(p);assert.ok(ids[0]>2**32);assert.deepEqual(sampleDrawOrder(slots,keys,4),ids);assert.deepEqual(sampleDrawOrder(slots,keys,5),[...ids].reverse());assert.deepEqual(sampleDrawOrder(slots,keys,19),[...ids].reverse());assert.deepEqual(sampleDrawOrder(slots,keys,20),ids);
 for(const order of [ids,[...ids].reverse(),[...ids.slice(511),...ids.slice(0,511)]])assert.deepEqual(orderSlots(slots,order).map(s=>s.id),order);
 for(const bad of [ids.slice(1),[...ids,ids[0]],[...ids.slice(0,511),ids[0]],[...ids.slice(0,511),2**40]])assert.throws(()=>orderSlots(slots,bad),/every slot exactly once/);
 assert.equal(JSON.stringify(p),before);
});

test('actual geometry workspace stages/keys complete512 order, emits reset null and rejects invalid order without native mutation',async()=>{
 const p=source(),project=shallowRef(p),active=computed(()=>project.value.animations[0]),autoKey=ref(false),frame=ref(7),edits=[],notices=[],scope=effectScope(),before=JSON.stringify(p);let g;
 scope.run(()=>{g=useGeometryAnimationWorkspace({project,active,slots:computed(()=>project.value.slots),autoKey,frame,mode:ref('animate'),version:ref(0),attachment:ref(null),edit:async edit=>{edits.push(structuredClone(edit));return true;},pause(){},notice:message=>notices.push(message)});});
 try{const ids=p.slots.map(s=>s.id),cycle=[...ids.slice(511),...ids.slice(0,511)];assert.equal(await g.setAnimationDrawOrder(cycle),true);assert.deepEqual(g.animationDrawOrder.value,cycle);assert.equal(edits.length,0);assert.equal(await g.insertDrawOrderKey(),true);assert.deepEqual(edits[0],{type:'setAnimationDrawOrderKeys',animation:active.value.id,keys:[{frame:7,order:cycle}]});
  assert.equal(await g.setAnimationDrawOrder(ids.slice(1)),false);assert.deepEqual(g.animationDrawOrder.value,cycle);assert.equal(edits.length,1);assert.match(notices.at(-1),/every slot exactly once/);autoKey.value=true;assert.equal(await g.setAnimationDrawOrder(null),true);assert.deepEqual(edits[1].keys,[{frame:7,order:null}]);assert.equal(await g.setAnimationDrawOrder(ids),true);assert.equal(edits[2].keys[0].order,null);frame.value=20;assert.deepEqual(g.animationDrawOrder.value,ids);assert.equal(JSON.stringify(p),before);
 }finally{scope.stop();}
});

test('compiled Tree512 keeps inactive/None inventory, high-ID selection/search/collapse/clear without activation or native calls',async()=>{
 const e=await workspace(source(512,true)),tree=e.mount(Tree),before=JSON.stringify(e.w.project);await nextTick();try{
  assert.equal(tree.all().filter(n=>n.props['data-tree-kind']==='slot').length,512);assert.equal(tree.all().filter(n=>n.props['data-tree-kind']==='attachment').length,511);const last=e.w.project.slots.at(-1),inactive=e.w.project.slots[510];assert.equal(inactive.activeAttachmentId,null);item(tree,'slot',last.id).props.onClick(event());assert.equal(e.w.selectedSlotId,last.id);item(tree,'attachment',inactive.attachments[0].id).props.onClick(event());assert.equal(e.w.selectedAttachmentId,inactive.attachments[0].id);assert.equal(e.w.sceneSlots[510].activeAttachmentId,null);assert.equal(e.w.sceneSlots[510].visible,false);
  const search=()=>tree.all().find(n=>n.tagName==='INPUT'&&n.props.type==='search');search().props['onUpdate:modelValue'](inactive.attachments[0].name);await nextTick();assert.equal(tree.all().filter(n=>n.props['data-tree-kind']==='slot').length,1);assert.ok(row(tree,'attachment',inactive.attachments[0].id));search().props['onUpdate:modelValue']('');await nextTick();const root=e.w.project.bones[0];call(item(tree,'bone',root.id).props.onKeydown,event({key:'ArrowLeft'}));await nextTick();assert.equal(tree.all().filter(n=>n.props['data-tree-kind']==='slot').length,0);assert.equal(e.w.selectedAttachmentId,inactive.attachments[0].id);call(item(tree,'bone',root.id).props.onKeydown,event({key:'ArrowRight'}));await nextTick();assert.equal(tree.all().filter(n=>n.props['data-tree-kind']==='slot').length,512);e.w.escapeSelection();await nextTick();assert.equal(e.w.selectedAttachmentId,null);assert.equal(e.w.selectedSlotId,null);assert.equal(JSON.stringify(e.w.project),before);assert.deepEqual(nativeRequests,[]);
 }finally{e.close();}
});

test('compiled512 draw-order controls send full order, Setup reset and high-ID intents; stale drops are ignored',async()=>{
 const e=await workspace(),list=e.mount(Hierarchy),sent=[],keyed=[];e.w.setAnimationDrawOrder=async order=>{sent.push(order);return true;};e.w.insertDrawOrderKey=async()=>{keyed.push(true);return true;};await nextTick();try{
  const ids=e.w.project.slots.map(s=>s.id),before=JSON.stringify(e.w.project),rows=()=>list.all().filter(n=>String(n.props['data-testid']??'').startsWith('draw-order-slot-'));assert.equal(rows().length,512);assert.equal(rows()[0].props['data-testid'],`draw-order-slot-${ids.at(-1)}`);const first=list.find(`draw-order-slot-${ids[0]}`),option=flatten(first).find(n=>n.props.role==='option');option.props.onClick();await nextTick();assert.equal(e.w.selectedSlotId,ids[0]);assert.equal(option.props['aria-selected'],true);
  flatten(first).find(n=>n.props['aria-label']==='Bring forward').props.onClick();const expected=[...ids];[expected[0],expected[1]]=[expected[1],expected[0]];assert.deepEqual(sent[0],expected);list.find('draw-order-key').props.onClick();assert.equal(keyed.length,1);list.find('draw-order-setup').props.onClick();assert.equal(sent[1],null);
  const data=new Map(),transfer={setData:(type,value)=>data.set(type,value),getData:type=>data.get(type),types:['application/x-fbones-draw-order']};first.props.onDragstart(event({dataTransfer:transfer}));const payload=JSON.parse([...data.values()][0]);assert.equal(payload.id,ids[0]);const target=list.find(`draw-order-slot-${ids.at(-1)}`);await target.props.onDrop(event({dataTransfer:transfer,currentTarget:target,clientY:0}));assert.deepEqual(sent[2],[...ids.slice(1),ids[0]]);
  for(const change of [{revision:2},{documentId:99},{mode:'setup'},{animation:-1},{frame:9},{id:2**40}]){transfer.setData(transfer.types[0],JSON.stringify({...payload,...change}));await target.props.onDrop(event({dataTransfer:transfer,currentTarget:target}));}assert.equal(sent.length,3);e.w.busy=true;await nextTick();assert.equal(list.find('draw-order-key').props.disabled,true);assert.equal(rows()[0].props.draggable,false);assert.equal(JSON.stringify(e.w.project),before);assert.deepEqual(nativeRequests,[]);
 }finally{e.close();}
});

test('compiled Timeline512 selected slots shows1024 property rows plus one discrete whole-order row, preserving high-ID key/reset addresses',async()=>{
 const e=await workspace(),inserted=[],reset=[],keys=[];e.w.selectedSlotIds=e.w.project.slots.map(s=>s.id);const timeline=e.mount(Timeline,()=>timelineProps(e.w,{onInsertSlotKeys:value=>inserted.push(value),onInsertDrawOrderKey:()=>keys.push(true),onUpdateDrawOrderKey:value=>reset.push(value)}));await nextTick();try{
  const labels=()=>timeline.all().filter(n=>String(n.props.class??'').split(' ').includes('at-track-label'));assert.equal(labels().length,1027);const last=e.w.project.slots.at(-1);timeline.find(`timeline-key-slot-${last.id}-attachment`).props.onClick(event());timeline.find(`timeline-key-slot-${last.id}-rgba`).props.onClick(event());assert.deepEqual(inserted,[{slotId:last.id,channel:'attachment'},{slotId:last.id,channel:'rgba'}]);timeline.find('timeline-key-draw-order').props.onClick(event());assert.equal(keys.length,1);
  const id=e.w.project.animations[0].drawOrder[0].id;timeline.find(`timeline-key-${id}`).props.onPointerdown(event());dispatch('pointerup');await nextTick();assert.equal(timeline.find('timeline-key-value-0'),undefined);timeline.find('timeline-draw-order-reset').props.onClick();assert.deepEqual(reset,[{id,order:null}]);e.w.selectedSlotIds=[];await nextTick();assert.equal(labels().length,7);timeline.find('timeline-tab-graph').props.onClick();await nextTick();assert.equal(timeline.all().filter(n=>String(n.props['data-testid']??'').startsWith('timeline-curve-')).length,0,'discrete order has no fabricated scalar Graph');assert.deepEqual(nativeRequests,[]);
 }finally{e.close();}
});
