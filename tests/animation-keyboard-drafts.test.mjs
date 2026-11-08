// Transpile the actual App keyboard handler, then run production composables.
// The collecting publication sink below is a typed frontend reply fixture, not
// a native authoring engine or proof of browser input, history or binary save.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {effectScope,ref,shallowRef,proxyRefs} from 'vue';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';

const appScript=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
const ast=ts.createSourceFile('App.ts',appScript,ts.ScriptTarget.Latest,true),declaration=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='keyboard');
assert.ok(declaration,'the application keyboard entry point must be tested');
const handlerJs=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const keyboardFor=w=>new Function('w','constraintCreator','clippingCreator','eventCreator','desktop',handlerJs+';return keyboard;')(w,{value:null},{value:false},{value:false},true);
const copy=value=>JSON.parse(JSON.stringify(value));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function typedReply(source,command){
 const next=copy(source),clip=next.animations.find(a=>a.id===command.animation);assert.ok(clip,'fixture command must address an existing clip');
 const keys=command.type==='setAnimationKey'?[command]:command.type==='setAnimationKeys'?command.keys:command.type==='setAnimationKeyBatch'?command.boneKeys:[];
 assert.ok(['setAnimationKey','setAnimationKeys','setAnimationKeyBatch','setAnimationConstraintKeys','setAnimationSlotKeys','setAnimationDeformKeys','setAnimationDrawOrderKeys'].includes(command.type),'only explicitly arranged typed replies are supported by this collecting fixture');
 if(command.type==='setAnimationConstraintKeys')for(const key of command.keys){assert.equal(key.channel,'physics');const tracks=clip.constraintTracks??=[];let track=tracks.find(t=>t.constraint===key.constraint&&t.channel===key.channel&&t.property===key.property);if(!track){track={constraint:key.constraint,channel:key.channel,property:key.property,keys:[]};tracks.push(track);}track.keys.push({id:3000+track.keys.length,frame:key.frame,value:key.value,curve:key.curve,...(key.controls?{controls:copy(key.controls)}:{})});}
 if(command.type==='setAnimationDeformKeys')for(const key of command.keys){const tracks=clip.deformTracks??=[];let track=tracks.find(t=>t.attachment===key.attachment);if(!track){track={attachment:key.attachment,keys:[]};tracks.push(track);}track.keys.push({id:5000+track.keys.length,frame:key.frame,offsets:copy(key.offsets),curve:key.curve,...(key.dataPresent===undefined?{}:{dataPresent:key.dataPresent}),...(key.controls?{controls:copy(key.controls)}:{})});}
 if(command.type==='setAnimationDrawOrderKeys'){clip.drawOrder??=[];for(const key of command.keys)clip.drawOrder.push({id:6000+clip.drawOrder.length,frame:key.frame,order:copy(key.order)});}
 if(command.type==='setAnimationSlotKeys')for(const key of command.keys){assert.equal(key.channel,'attachment');const tracks=clip.slotTracks??=[];let track=tracks.find(t=>t.slot===key.slot&&t.channel===key.channel);if(!track){track={slot:key.slot,channel:key.channel,keys:[]};tracks.push(track);}track.keys.push({id:4000+track.keys.length,frame:key.frame,attachment:key.attachment});}
 for(const key of keys){let track=clip.tracks.find(t=>t.bone===key.bone&&t.channel===key.channel);if(!track){track={bone:key.bone,channel:key.channel,keys:[]};clip.tracks.push(track);}const existing=track.keys.find(k=>k.frame===key.frame),value={id:existing?.id??1000+track.keys.length+clip.tracks.length*100,frame:key.frame,values:copy(key.values),curve:key.curve,...(key.controls?{controls:copy(key.controls)}:{})};if(existing)Object.assign(existing,value);else track.keys.push(value);track.keys.sort((a,b)=>a.frame-b.frame);}
 next.revision++;return next;
}
function fixture(){
 const bone=(id,parent,x,rotation)=>({id,parent,name:'Own bone '+id,x,y:0,rotation,length:20,scaleX:1,scaleY:1,shearX:0,shearY:0});
 const region={name:'Own image',image:'own',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},mesh={weighted:false,bones:[0],vertices:[[0,0],[30,0],[0,20]].map(positions=>({weights:[1],positions})),uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3},attachment={id:9,slot:7,name:'Own mesh',type:'mesh',region,mesh,clipping:null,imageAvailable:true};
 const controls=[[20,25,25,28],[0,0,0,0]],clip={id:1,name:'Own clip1',duration:30,tracks:[{bone:0,channel:'rotate',keys:[{id:11,frame:0,values:[10,0],curve:'linear'},{id:12,frame:15,values:[20,0],curve:'bezier',controls},{id:13,frame:30,values:[30,0],curve:'linear'}]}]};
 const source={documentId:1,revision:1,bones:[bone(0,null,1,5),bone(1,0,20,-5)],slots:[{id:7,name:'Own slot',bone:0,visible:true,color:0xffffffff,region,mesh,activeAttachmentId:9,attachments:[attachment],imageAvailable:true},{id:8,name:'Own empty slot',bone:0,visible:false,color:0xffffffff,region:null,activeAttachmentId:null,attachments:[],imageAvailable:false}],constraints:[{id:31,type:'ik',name:'Own IK',bones:[1],target:0,order:0,mix:.5,softness:0,stretch:false,compress:false,bendPositive:true,uniform:false},{id:32,type:'physics',name:'Own Physics',bone:1,order:1,x:1,y:1,rotate:null,shearX:0,scaleX:0,step:1/60,inertia:1,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}],events:[{id:41,name:'Own event',int:0,float:0,string:'',audio:'',volume:1,balance:0}],animations:[clip,...Array.from({length:18},(_,i)=>({id:i+2,name:'Own clip'+(i+2),duration:30,tracks:[]}))],animationFps:30,animationChannels:['translate','rotate','scale','shear'],sceneEditing:true};
 const project=shallowRef(source),before=copy(source),selected=ref([0,1]),mode=ref('animate'),busy=ref(false),edits=[],notices=[],scope=effectScope();let w,nextGate=null;
 const edit=async command=>{const publish=w.prepareAnimationDraftCommit(command),reply=typedReply(project.value,command),gate=nextGate;nextGate=null;edits.push(copy(command));if(gate&&!(await gate.promise))return false;publish(()=>{project.value=reply;});return true;};
 w=scope.run(()=>useAnimationWorkspace({project,busy,selectedIds:selected,editorMode:mode,localBones:shallowRef([]),attachment:ref(9),edit,notice:message=>notices.push(message),changed(){}}));w.resetAnimationState();w.seekAnimation(15);w.animationAutoKey.value=false;
 const tool=ref('translate'),ui=proxyRefs({...w,tool,editorMode:mode,parentPicking:false,clippingDraft:null,newDialog:false,discardDialog:false,traceOpen:false,selectedEventId:null,selectedConstraint:null,selectedSlotId:null}),keyboard=keyboardFor(ui);
 return{w,ui,tool,project,before,selected,mode,busy,edits,notices,edit,stage(id,patch){const bones=w.animationBones.value;return w.boneAnimationEdit({...bones.find(b=>b.id===id),...patch,type:'update'},bones);},async press(extra={}){let prevented=false;keyboard({key:'k',defaultPrevented:false,ctrlKey:false,metaKey:false,target:{closest:()=>null},preventDefault(){prevented=true;},stopPropagation(){},...extra});await settle();return prevented;},defer(){let release;const promise=new Promise(resolve=>{release=resolve;});nextGate={promise};return release;},close(){scope.stop();}};
}
const keyList=command=>(command.type==='setAnimationKeyBatch'?command.boneKeys:command.keys).map(k=>({bone:k.bone,channel:k.channel,values:k.values})).sort((a,b)=>a.bone-b.bone||a.channel.localeCompare(b.channel));
const pose=e=>e.w.animationBones.value.map(b=>({id:b.id,x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY,shearX:b.shearX,shearY:b.shearY}));

test('actual K handler routes selected Sequence attachments to their discrete key command and leaves bone K context alone',async()=>{
 const e=fixture();try{const calls=[];e.ui.selectedAttachment={id:9,sequence:{start:0,count:3,digits:1,setupIndex:0}};e.ui.insertSequenceAnimationKey=async id=>{calls.push(id);return true;};assert.equal(await e.press(),true);assert.deepEqual(calls,[9]);assert.deepEqual(e.edits,[]);await e.press({target:{closest:()=>({})}});assert.deepEqual(calls,[9]);e.ui.selectedAttachment=null;e.stage(0,{x:11});await e.press();assert.equal(e.edits.length,1);assert.equal(e.edits[0].type,'setAnimationKeys');}finally{e.close();}
});

test('actual K handler atomically keys all selected dirty channels against saved samples across an own19-clip project',async()=>{
 const e=fixture();try{
  e.stage(0,{x:11,rotation:45});e.stage(1,{scaleX:1.5,shearY:20});e.tool.value='rotate';assert.equal(await e.press(),true);assert.equal(e.edits.length,1);assert.deepEqual(keyList(e.edits[0]),[{bone:0,channel:'rotate',values:[40,0]},{bone:0,channel:'translate',values:[10,0]},{bone:1,channel:'scale',values:[1.5,1]},{bone:1,channel:'shear',values:[0,20]}]);assert.deepEqual(e.project.value.bones,e.before.bones);assert.equal(e.project.value.animations.length,19);assert.deepEqual(e.project.value.animations.slice(1),e.before.animations.slice(1));const rotate=e.edits[0].keys.find(k=>k.bone===0&&k.channel==='rotate');assert.equal(rotate.curve,'bezier');assert.deepEqual(rotate.controls,e.before.animations[0].tracks[0].keys[1].controls);assert.equal(pose(e)[0].x,11);assert.equal(pose(e)[0].rotation,45);assert.equal(pose(e)[1].scaleX,1.5);
 }finally{e.close();}
});

test('actual K handler uses the active bone tool only when selected bones have no dirty channels and respects input guards',async()=>{
 for(const [tool,channel]of [['pose','rotate'],['rotate','rotate'],['scale','scale'],['shear','shear'],['translate','translate']]){const e=fixture();try{e.tool.value=tool;await e.press();assert.equal(e.edits.length,1);assert.ok(keyList(e.edits[0]).every(key=>key.channel===channel));}finally{e.close();}}
 const e=fixture();try{e.stage(0,{rotation:45});await e.press({target:{closest:()=>({})}});await e.press({defaultPrevented:true});await e.press({ctrlKey:true});assert.deepEqual(e.edits,[]);assert.equal(pose(e)[0].rotation,45);}finally{e.close();}
});

test('per-channel manual keying consumes only its committed channel and retains unselected bone drafts after publication',async()=>{
 const e=fixture();try{
  e.stage(0,{x:11,rotation:45});e.stage(1,{x:37});e.selected.value=[0];await e.w.insertAnimationKeys('rotate');assert.equal(e.edits.length,1);assert.deepEqual(keyList(e.edits[0]),[{bone:0,channel:'rotate',values:[40,0]}]);assert.equal(pose(e)[0].x,11);assert.equal(pose(e)[0].rotation,45);assert.equal(pose(e)[1].x,37);assert.deepEqual(e.project.value.bones,e.before.bones);
  await e.press();assert.equal(e.edits.length,2);assert.deepEqual(keyList(e.edits[1]),[{bone:0,channel:'translate',values:[10,0]}]);assert.equal(pose(e)[1].x,37,'unselected working bone remains unkeyed');
 }finally{e.close();}
});

test('Auto Key rotation after an unkeyed translation preserves the unrelated working channel',async()=>{
 const e=fixture();try{
  e.stage(0,{x:11,rotation:45});e.w.animationAutoKey.value=true;const command=e.stage(0,{rotation:60});assert.deepEqual(keyList(command),[{bone:0,channel:'rotate',values:[55,0]}]);await e.edit(command);assert.equal(pose(e)[0].rotation,60);assert.equal(pose(e)[0].x,11);assert.deepEqual(e.project.value.bones,e.before.bones);
 }finally{e.close();}
});

async function familyDrafts(e){
 e.w.slotAnimationEdit({type:'setSlotColor',id:7,color:0x336699ff});e.w.deformAnimationEdit({type:'moveMesh',id:7,dx:3,dy:4},e.w.animationBones.value);await e.w.setAnimationDrawOrder([8,7]);await e.w.setConstraintAnimationFields(31,{mix:.75});await e.w.setEventAnimationFields(41,{string:'Own working event'});
 return{slot:copy([...e.w.slotAnimationDraft.value]),deform:copy([...e.w.deformDraft.value]),order:copy(e.w.drawOrderDraft.value),constraint:copy([...e.w.constraintDraft.value]),event:copy([...e.w.eventDraft.value])};
}
function families(e){return{slot:copy([...e.w.slotAnimationDraft.value]),deform:copy([...e.w.deformDraft.value]),order:copy(e.w.drawOrderDraft.value),constraint:copy([...e.w.constraintDraft.value]),event:copy([...e.w.eventDraft.value])};}

test('bone-only K publication preserves slot deformation draw-order constraint and Event working drafts',async()=>{
 const e=fixture();try{const before=await familyDrafts(e);e.stage(0,{rotation:45});await e.press();assert.equal(e.edits.length,1);assert.deepEqual(families(e),before);assert.deepEqual(e.project.value.slots,e.before.slots);assert.deepEqual(e.project.value.constraints,e.before.constraints);assert.deepEqual(e.project.value.events,e.before.events);}finally{e.close();}
});

test('failed bone keying consumes no draft and a successful late reply after frame or clip away-back cannot resurrect old drafts',async()=>{
 const failed=fixture();try{failed.stage(0,{x:11,rotation:45});const before=pose(failed),family=await familyDrafts(failed),release=failed.defer(),pending=failed.w.keyAnimationChanges('rotate');release(false);await pending;assert.deepEqual(pose(failed),before);assert.deepEqual(families(failed),family);assert.deepEqual(failed.project.value,failed.before);}finally{failed.close();}
 for(const transition of ['frame','clip']){const e=fixture();try{
  e.stage(0,{x:11,rotation:45});const release=e.defer(),pending=e.w.insertAnimationKeys('rotate');if(transition==='frame'){e.w.seekAnimation(16);e.w.seekAnimation(15);}else{e.w.selectAnimation(2);e.w.selectAnimation(1);e.w.seekAnimation(15);}assert.equal(pose(e)[0].x,1);release(true);await pending;assert.equal(pose(e)[0].x,1,'late success cannot restore old unkeyed translation');assert.equal(pose(e)[0].rotation,45,'the accepted typed reply still contains its authored rotation');assert.deepEqual(e.project.value.bones,e.before.bones);
 }finally{e.close();}}
});


test('a newer live channel edit during pending publication survives, including after frame away-back',async()=>{
 for(const away of [false,true]){const e=fixture();try{
  e.stage(0,{x:11,rotation:45});const release=e.defer(),pending=e.w.insertAnimationKeys('rotate');if(away){e.w.seekAnimation(16);e.w.seekAnimation(15);}e.stage(0,{x:61,rotation:75});release(true);await pending;assert.equal(pose(e)[0].rotation,75);assert.equal(pose(e)[0].x,61);assert.equal(e.project.value.animations[0].tracks[0].keys.find(k=>k.frame===15).values[0],40,'the accepted reply remains Rotate45 while the newer unkeyed pose stays Rotate75');assert.deepEqual(e.project.value.bones,e.before.bones);
 }finally{e.close();}}
});

test('Physics gravity-only and slot attachment-only publications consume only the keyed property',async()=>{
 const physics=fixture();try{
  await physics.w.setConstraintAnimationFields(32,{gravity:5,wind:2,mix:.8});physics.w.animationAutoKey.value=true;await physics.w.setConstraintAnimationFields(32,{gravity:7});assert.equal(physics.edits.length,1);assert.deepEqual(physics.edits[0].keys.map(k=>[k.property,k.value]),[['gravity',7]]);const pose=physics.w.animationConstraintPoses.value.find(p=>p.constraint===32);assert.equal(pose.gravity,7);assert.equal(pose.wind,2);assert.equal(pose.mix,.8);assert.deepEqual(physics.project.value.constraints,physics.before.constraints);
 }finally{physics.close();}
 const slot=fixture();try{
  slot.w.slotAnimationEdit({type:'setSlotColor',id:7,color:0x336699ff});slot.w.slotAnimationEdit({type:'setActiveAttachment',slot:7,attachment:null});const color=slot.w.animationSlotColor(7);await slot.w.insertSlotAnimationKeys({slotId:7,channel:'attachment'});assert.equal(slot.edits.length,1);assert.equal(slot.edits[0].keys[0].attachment,null);assert.deepEqual(slot.w.animationSlotColor(7),color);assert.equal(slot.w.slotAnimationPose.value.find(p=>p.slot===7).attachment,null);assert.deepEqual(slot.project.value.slots,slot.before.slots);
 }finally{slot.close();}
});


test('a newer bone edit reverting to the old saved sample survives while unchanged clean fields follow intentional native edits',async()=>{
 const e=fixture();try{
  assert.equal(pose(e)[0].rotation,25);e.stage(0,{rotation:45});const release=e.defer(),pending=e.w.insertAnimationKeys('rotate');e.stage(0,{rotation:25});release(true);await pending;assert.equal(e.project.value.animations[0].tracks[0].keys.find(k=>k.frame===15).values[0],40);assert.equal(pose(e)[0].rotation,25,'the newer explicit revert remains visible after old Rotate45 commits');
 }finally{e.close();}
 const clean=fixture();try{
  clean.stage(0,{rotation:45});await clean.edit({type:'setAnimationKeys',animation:1,keys:[{bone:0,channel:'translate',frame:15,values:[10,0],curve:'linear'}]});assert.equal(pose(clean)[0].x,11,'an untouched clean X is not restored over a deliberate native key edit');assert.equal(pose(clean)[0].rotation,45);
 }finally{clean.close();}
});

test('newer Physics and slot attachment reverts to old saved values survive their pending older replies',async()=>{
 const physics=fixture();try{
  await physics.w.setConstraintAnimationFields(32,{gravity:5});const release=physics.defer(),pending=physics.w.insertConstraintAnimationKeys({constraintId:32,kind:'physics',property:'gravity'});await physics.w.setConstraintAnimationFields(32,{gravity:0});release(true);await pending;assert.equal(physics.project.value.animations[0].constraintTracks.find(t=>t.property==='gravity').keys[0].value,5);assert.equal(physics.w.animationConstraintPoses.value.find(p=>p.constraint===32).gravity,0);
 }finally{physics.close();}
 const slot=fixture();try{
  slot.w.slotAnimationEdit({type:'setActiveAttachment',slot:7,attachment:null});const release=slot.defer(),pending=slot.w.insertSlotAnimationKeys({slotId:7,channel:'attachment'});slot.w.slotAnimationEdit({type:'setActiveAttachment',slot:7,attachment:9});release(true);await pending;assert.equal(slot.project.value.animations[0].slotTracks[0].keys[0].attachment,null);assert.equal(slot.w.slotAnimationPose.value.find(p=>p.slot===7).attachment,9);
 }finally{slot.close();}
});

test('newer explicit zero deform offsets and Setup draw-order revert survive pending nonzero replies',async()=>{
 const deform=fixture();try{
  deform.w.deformAnimationEdit({type:'moveMesh',id:7,dx:3,dy:4},deform.w.animationBones.value);const before=copy(deform.w.deformDraft.value.get(9));assert.ok(before.some(value=>value!==0));const release=deform.defer(),pending=deform.w.insertDeformKey(9);
  // Arrange an exact explicit zero-offset draft at the public working-state
  // boundary; this checks retention, not a browser vertex gesture or inverse math.
  deform.w.deformDraft.value=new Map([[9,before.map(()=>0)]]);release(true);await pending;assert.deepEqual(deform.project.value.animations[0].deformTracks[0].keys[0].offsets,before);assert.deepEqual(deform.w.animationDeformPose.value.find(p=>p.attachment===9).offsets,before.map(()=>0));
 }finally{deform.close();}
 const order=fixture();try{
  await order.w.setAnimationDrawOrder([8,7]);const release=order.defer(),pending=order.w.insertDrawOrderKey();await order.w.setAnimationDrawOrder(null);release(true);await pending;assert.deepEqual(order.project.value.animations[0].drawOrder[0].order,[8,7]);assert.deepEqual(order.w.animationDrawOrder.value,[7,8]);
 }finally{order.close();}
});

test('a newer revert expressed after a draft-free key edit begins survives its older reply',async()=>{
 const e=fixture();try{
  assert.equal(e.w.animationDraft.value,null);const release=e.defer(),pending=e.w.updateAnimationKey({id:12,values:[40,0]});e.stage(0,{rotation:75});e.stage(0,{rotation:25});release(true);await pending;assert.equal(pose(e)[0].rotation,25,'newer explicit revert is not lost just because invocation had no draft');assert.equal(e.project.value.animations[0].tracks[0].keys.find(k=>k.frame===15).values[0],40);
 }finally{e.close();}
});

test('a new X-only draft after frame away-back does not retain an incidental old sampled rotation',async()=>{
 const e=fixture();try{
  e.stage(0,{rotation:45});const release=e.defer(),pending=e.w.insertAnimationKeys('rotate');e.w.seekAnimation(16);e.w.seekAnimation(15);e.stage(0,{x:61});release(true);await pending;assert.equal(pose(e)[0].x,61);assert.equal(pose(e)[0].rotation,45,'only the explicitly edited new X survives; sampled Rotate25 follows the native45 reply');assert.deepEqual(e.project.value.bones,e.before.bones);
 }finally{e.close();}
});


test('a reply prepared for an old revision or document cannot publish over a newer summary or alter its working state',async()=>{
 for(const transition of ['revision','document']){const e=fixture();try{
  e.stage(0,{rotation:45});const release=e.defer(),pending=e.w.insertAnimationKeys('rotate');e.project.value={...e.project.value,revision:2,...(transition==='document'?{documentId:2}:{})};const protectedSummary=copy(e.project.value),protectedPose=pose(e);release(true);await pending;assert.deepEqual(e.project.value,protectedSummary);assert.deepEqual(pose(e),protectedPose);assert.equal(e.project.value.animations[0].tracks[0].keys.find(k=>k.frame===15).values[0],20,'older Rotate45 publication must not overwrite the newer summary');
 }finally{e.close();}}
});
