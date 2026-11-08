// Actual workspace resource actions and production draft/selection retention.
// Explicit typed transport replies test frontend policy; they do not prove native
// filesystem scans, renderer caches, binary persistence or browser gestures.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPinia} from 'pinia';
import {nextTick} from 'vue';

globalThis.document={title:''};
globalThis.window={innerWidth:1440,innerHeight:900,performance:globalThis.performance,addEventListener(){},removeEventListener(){}};
let invoke=async command=>{throw Error('Unexpected native request '+command);};
globalThis.__TAURI__={core:{invoke:(...args)=>invoke(...args)},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function source(){
 const region={name:'Own image',image:'own',imagePath:'',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},mesh={weighted:true,bones:[0,1],vertices:[[0,0],[30,0],[0,20]].map(([x,y])=>({weights:[.5,.5],positions:[x,y,x-40,y]})),uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3},attachment={id:9,slot:7,name:'Own mesh',type:'mesh',region,mesh,clipping:null,imageAvailable:true,color:0xffffffff,sequence:{start:0,count:3,digits:1,setupIndex:0},sequenceAvailableFrames:[0,1,2]};
 return{...draftSummary('Own saved working pose'),documentId:1,logicalDocumentId:101,revision:1,sceneEditing:true,path:'own-source.fbones',bones:[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:30,scaleX:1,scaleY:1,shearX:0,shearY:0},{id:1,parent:0,name:'child',x:40,y:0,rotation:0,length:20,scaleX:1,scaleY:1,shearX:0,shearY:0}],boneCount:2,slots:[{id:7,name:'Own mesh slot',bone:0,visible:true,color:0xffffffff,region,mesh,activeAttachmentId:9,attachments:[attachment,{...copy(attachment),id:10,name:'Own alternative'}],imageAvailable:true},{id:8,name:'Own empty slot',bone:0,visible:false,color:0xffffffff,region:null,activeAttachmentId:null,attachments:[],imageAvailable:false}],constraints:[{id:31,type:'ik',name:'Own IK',bones:[1],target:0,order:0,mix:.5,softness:0,stretch:false,compress:false,bendPositive:true}],events:[{id:41,name:'Own event',int:0,float:0,string:'',audio:'',volume:1,balance:0}],animations:Array.from({length:19},(_,i)=>({id:i+1,name:'Own clip '+(i+1),duration:30,tracks:i===0?[{bone:0,channel:'rotate',keys:[{id:11,frame:0,values:[0,0],curve:'linear'}]}]:[],sequenceTracks:i===0?[{attachment:9,slot:7,keys:[{id:91,frame:0,mode:0,index:0,delay:.125}]}]:[]})),animationFps:30,animationChannels:['translate','rotate','scale','shear'],library:{root:'./source-images/',images:[{key:'own',width:32,height:24}],warnings:[]},audioLibrary:{root:'./source-audio/',sounds:[],warnings:[]}};
}
async function fixture(twoColor=false){
 const pinia=createPinia(),w=useWorkspace(pinia),initial=source(),calls=[];let behavior='success',gate=null,editGate=null,editFailure=false,alter=()=>{},epoch=1000;
 if(twoColor){initial.slots[0].tintBlack=twoColor!=='disabled';initial.slots[0].darkColor=twoColor==='disabled'?0x336699ff:0x204080ff;}
 invoke=async(command,args={})=>{
  calls.push({command,args:copy(args)});
  if(command==='evaluate_project'){const p=w.project,bones=copy(w.animationBones);return{documentId:p.documentId,revision:p.revision,poseEpoch:epoch++,animationId:w.animationId,time:args.request.time,mode:args.request.mode,localBones:bones,bones:bones.map(b=>({id:b.id,world:{x:b.x,y:b.y,a:1,b:0,c:0,d:1}})),deformPose:copy(w.animationDeformPose),drawOrder:copy(w.animationDrawOrder)};}
  if(command==='edit_rig'){const next=copy(w.project),wait=editGate,fail=editFailure;editGate=null;editFailure=false;next.revision++;if(wait)await wait.promise;if(fail)throw Error('Own pending field failure');return next;} // Collect an already-arranged command, not a second authoring engine.
  assert.ok(['choose_images_folder','refresh_images_folder'].includes(command),'resource action may not author keys');
  const next=copy(w.project);next.documentId++;next.revision++;next.library={root:command==='choose_images_folder'?'./replacement-images/':next.library.root,images:[{key:'own0',width:32,height:24},{key:'own2',width:32,height:24}],warnings:['Own frame1 unavailable']};next.canUndo=true;next.dirty=true;for(const slot of next.slots){slot.imageAvailable=false;for(const a of slot.attachments??[]){a.imageAvailable=false;a.sequenceAvailableFrames=[0,2];}}
  const result=behavior,wait=gate,mutate=alter;behavior='success';gate=null;alter=()=>{};mutate(next);if(wait)await wait.promise;if(result==='cancel')return null;if(result==='fail')throw Error('Own resource failure');return next;
 };
 w.project=copy(initial);w.selectBone(0);await w.setEditorMode('animate');w.animationId=1;w.animationAutoKey=false;w.seekAnimation(15);w.pauseSimulation();await nextTick();
 return{w,initial,calls,setBehavior(v){behavior=v;},alterReply(fn){alter=fn;},defer(){let release;const promise=new Promise(resolve=>{release=resolve;});gate={promise};return release;},deferEdit(fail=false){let release;const promise=new Promise(resolve=>{release=resolve;});editGate={promise};editFailure=fail;return release;},close(){w.$dispose();pinia._s.clear();}};
}
async function stageAll(w){
 assert.equal(await w.editRig({...w.selectedBone,x:11,rotation:45,type:'update'}),true);assert.equal(await w.editRig({type:'setSlotColor',id:7,color:0x336699ff}),true);w.selectAttachment(9);assert.equal(await w.editRig({type:'moveMesh',id:7,dx:3,dy:4}),true);w.selectBone(0);assert.equal(await w.setAnimationDrawOrder([8,7]),true);assert.equal(await w.setConstraintAnimationFields(31,{mix:.75}),true);assert.equal(await w.setEventAnimationFields(41,{string:'Own working event'}),true);assert.equal(await w.setSequenceAnimationFields(9,{mode:0,index:2,delay:.25}),true);
}
function drafts(w){return{bone:copy(w.animationDraft?.map(({type:_,evaluatedWorld:__,...b})=>b)??null),slot:copy([...w.slotAnimationDraft]),deform:copy([...w.deformDraft]),order:copy(w.drawOrderDraft),constraint:copy([...w.constraintDraft]),event:copy([...w.eventDraft]),sequence:copy([...w.sequenceDraft])};}
function authoring(p){return copy({bones:p.bones,slots:p.slots.map(({imageAvailable:_,...s})=>({...s,attachments:s.attachments?.map(({imageAvailable:__,sequenceAvailableFrames:___,...a})=>a)})),constraints:p.constraints,events:p.events,animations:p.animations,animationFps:p.animationFps});}
function selection(w){return copy({bone:w.selectedId,bones:w.selectedIds,slot:w.selectedSlotId,slots:w.selectedSlotIds,attachment:w.selectedAttachmentId,attachments:w.selectedAttachmentIds,vertex:w.selectedVertex,vertices:w.weightVertices,weightBones:w.weightBones,locks:w.weightLocks,constraint:w.selectedConstraintId,event:w.selectedEventId});}
function prepareSelection(w){w.selectBones([0,1],1);w.selectSceneAttachments([9,10],9);w.selectWeightVertices([0,2],2);w.chooseInfluence(1);w.toggleWeightLock(1);}

test('actual choose and refresh publish a verified cache generation while retaining all seven draft families and stable selection without keying',async()=>{
 for(const action of ['chooseImagesFolder','refreshImagesFolder']){const e=await fixture();try{
  await stageAll(e.w);prepareSelection(e.w);e.w.animationSpeed=1.5;e.w.setAnimationLoopRange({start:5,end:25});e.w.copyAnimationKeys([11,91]);const before=drafts(e.w),selected=selection(e.w),authored=authoring(e.w.project);assert.equal(e.w.animationCanPaste,true);await e.w[action]();await nextTick();assert.equal(e.w.project.documentId,2);assert.equal(e.w.project.logicalDocumentId,101);assert.equal(e.w.project.revision,2);assert.deepEqual(drafts(e.w),before);assert.deepEqual(selection(e.w),selected);assert.deepEqual(authoring(e.w.project),authored);assert.equal(e.w.simulationIntent,false);assert.equal(e.w.animationAutoKey,false);assert.equal(e.w.animationSpeed,1.5);assert.equal(e.w.animationLoopStart,5);assert.equal(e.w.animationLoopEnd,25);assert.equal(e.w.animationCanPaste,true);assert.equal(e.w.project.slots[0].attachments[0].imageAvailable,false);assert.equal(e.w.sequenceSlots.flatMap(s=>s.attachments??[]).find(a=>a.id===9).imageAvailable,true);assert.deepEqual(e.w.sceneAttachments[0].sequenceAvailableFrames,[0,2]);assert.deepEqual(e.calls.map(c=>c.command),[action==='chooseImagesFolder'?'choose_images_folder':'refresh_images_folder']);
  await e.w.pasteAnimationKeys();const command=e.calls.at(-1);assert.equal(command.command,'edit_rig');assert.equal(command.args.edit.type,'setAnimationKeyBatch');assert.equal(command.args.edit.boneKeys[0].bone,0);assert.equal(command.args.edit.sequenceKeys[0].attachment,9);
 }finally{e.close();}}
});

test('canceled folder choice and failed image actions leave summary, live overrides and selection untouched',async()=>{
 for(const [action,behavior]of [['chooseImagesFolder','cancel'],['chooseImagesFolder','fail'],['refreshImagesFolder','fail']]){const e=await fixture();try{await stageAll(e.w);prepareSelection(e.w);const before=copy(e.w.project),pose=drafts(e.w),selected=selection(e.w);e.setBehavior(behavior);await e.w[action]();assert.deepEqual(e.w.project,before);assert.deepEqual(drafts(e.w),pose);assert.deepEqual(selection(e.w),selected);assert.equal(e.w.simulationIntent,false);if(behavior==='fail')assert.match(e.w.notice,/Own resource failure/);}finally{e.close();}}
});

test('resource publication preserves newer live clean reverts and current selection instead of request-time snapshots',async()=>{
 const e=await fixture();try{await stageAll(e.w);prepareSelection(e.w);const release=e.defer(),pending=e.w.refreshImagesFolder();await settle();e.w.boneAnimationEdit({...e.w.animationBones[0],x:61,rotation:0,type:'update'},e.w.animationBones);e.w.slotAnimationEdit({type:'setSlotColor',id:7,color:0xffffffff});await e.w.setSequenceAnimationFields(9,{mode:0,index:0,delay:.125});e.w.selectAttachment(10);e.w.selectWeightVertices([1],1);const pose=drafts(e.w),selected=selection(e.w);release();await pending;assert.deepEqual(drafts(e.w),pose);assert.equal(e.w.animationBones[0].x,61);assert.equal(e.w.animationBones[0].rotation,0);assert.deepEqual(selection(e.w),selected);}finally{e.close();}
});

test('clip and explicit discard transitions during a resource action cannot resurrect old overrides, while new live context intent survives',async()=>{
 for(const transition of ['clip','discard','clip-new']){const e=await fixture();try{await stageAll(e.w);const release=e.defer(),pending=e.w.refreshImagesFolder();await settle();if(transition==='discard')e.w.clearAnimationDraft();else{e.w.selectAnimation(2);e.w.selectAnimation(1);}if(transition==='clip-new')e.w.boneAnimationEdit({...e.w.animationBones[0],x:77,type:'update'},e.w.animationBones);const pose=drafts(e.w);release();await pending;assert.deepEqual(drafts(e.w),pose);assert.equal(e.w.animationBones[0].x,transition==='clip-new'?77:0);}finally{e.close();}}
});

test('a stale document or revision and a mismatched logical identity cannot publish a late resource summary',async()=>{
 for(const guard of ['document','revision','logical','missing-logical']){const e=await fixture();try{await stageAll(e.w);const release=e.defer();if(guard==='logical')e.alterReply(p=>{p.logicalDocumentId=999;});if(guard==='missing-logical')e.alterReply(p=>{delete p.logicalDocumentId;});const pending=e.w.refreshImagesFolder();await settle();if(guard==='document')e.w.project={...e.w.project,documentId:99,logicalDocumentId:202};if(guard==='revision')e.w.project={...e.w.project,revision:9};const before=copy(e.w.project),pose=drafts(e.w);release();await pending;assert.deepEqual(e.w.project,before);assert.deepEqual(drafts(e.w),pose);}finally{e.close();}}
});

test('a resource response that changes authored IDs, transforms, topology, keys or Sequence settings is rejected atomically',async()=>{
 const mutations=[p=>{p.bones[0].x=99;},p=>{p.bones[0].x=-0;},p=>{p.slots[0].attachments[0].id=99;},p=>{p.slots[0].attachments[0].mesh.vertices[0].positions[0]=99;},p=>{p.animations[0].tracks[0].keys[0].values[0]=99;},p=>{p.slots[0].attachments[0].sequence.count=4;},p=>{p.slots[0].attachments[0].color=0x12345678;},p=>{p.animationFps=24;},p=>{p.constraints[0].mix=.9;},p=>{p.events[0].string='changed';}];
 for(const mutate of mutations){const e=await fixture();try{await stageAll(e.w);const before=copy(e.w.project),pose=drafts(e.w);e.alterReply(mutate);await e.w.refreshImagesFolder();assert.deepEqual(e.w.project,before);assert.deepEqual(drafts(e.w),pose);}finally{e.close();}}
});

test('all invalid raw-field flags block resource actions before transport and keep the working pose intact',async()=>{
 for(const action of ['chooseImagesFolder','refreshImagesFolder'])for(const error of ['inspectorError','animationKeyError','eventKeyError','sequenceFieldError','attachmentColorError']){const e=await fixture();try{await stageAll(e.w);const before=copy(e.w.project),pose=drafts(e.w);e.w[error]='Own invalid field';await e.w[action]();assert.deepEqual(e.calls,[]);assert.deepEqual(e.w.project,before);assert.deepEqual(drafts(e.w),pose);assert.equal(e.w[error],'Own invalid field');}finally{e.close();}}
});

test('resource actions wait for the pending field transaction and then request its accepted revision',async()=>{
 for(const action of ['chooseImagesFolder','refreshImagesFolder']){const e=await fixture();try{const release=e.deferEdit(),editing=e.w.editRig({type:'setAnimationKey',animation:1,bone:0,channel:'rotate',frame:15,values:[45,0],curve:'linear'});await settle();const resource=e.w[action]();await settle();assert.deepEqual(e.calls.map(c=>c.command),['edit_rig']);release();assert.equal(await editing,true);await resource;assert.equal(e.calls[1].command,action==='chooseImagesFolder'?'choose_images_folder':'refresh_images_folder');assert.equal(e.calls[1].args.expectedRevision,2);assert.equal(e.w.project.revision,3);}finally{e.close();}}
});

test('a failed pending field transaction prevents both queued resource actions and retains the working pose',async()=>{
 for(const action of ['chooseImagesFolder','refreshImagesFolder']){const e=await fixture();try{await stageAll(e.w);const before=copy(e.w.project),pose=drafts(e.w),release=e.deferEdit(true),editing=e.w.editRig({type:'setAnimationKey',animation:1,bone:0,channel:'rotate',frame:15,values:[45,0],curve:'linear'});await settle();const resource=e.w[action]();await settle();release();assert.equal(await editing,false);await resource;assert.deepEqual(e.calls.map(c=>c.command),['edit_rig']);assert.deepEqual(e.w.project,before);assert.deepEqual(drafts(e.w),pose);assert.match(e.w.notice,/pending field failure/);}finally{e.close();}}
});

test('retaining pose values across refresh still invalidates frozen geometry and rejects the previous epoch authoring lease',async()=>{
 const e=await fixture();try{await stageAll(e.w);e.w.selectAttachment(9);const snapshot=await e.w.freezePose();assert.ok(snapshot);assert.equal(e.w.frozenPose.poseEpoch,snapshot.poseEpoch);const pose=drafts(e.w);await e.w.refreshImagesFolder();assert.equal(e.w.frozenPose,null);assert.deepEqual(drafts(e.w),pose);const count=e.calls.length;assert.equal(await e.w.editRig({type:'moveMesh',id:7,dx:1,dy:0},e.w.project.revision,snapshot.poseEpoch),false);assert.equal(e.calls.length,count);assert.match(e.w.notice,/pose changed/);assert.equal(e.w.simulationIntent,false);}finally{e.close();}
});

test('resource publication preserves independent light and dark intent, including a newer clean dark revert',async()=>{
 const e=await fixture(true);try{await stageAll(e.w);await e.w.setSlotAnimationDarkColor(7,[.2,.4,.6]);const initial=drafts(e.w);await e.w.refreshImagesFolder();assert.deepEqual(drafts(e.w),initial);assert.deepEqual(e.w.animationSlotDarkColor(7),[.2,.4,.6]);assert.deepEqual(e.w.slotAnimationDraft.get(7).color,initial.slot[0][1].color);
  const release=e.defer(),pending=e.w.chooseImagesFolder();await settle();const clean=[32/255,64/255,128/255];await e.w.setSlotAnimationDarkColor(7,clean);const live=drafts(e.w);release();await pending;assert.deepEqual(drafts(e.w),live);assert.deepEqual(e.w.animationSlotDarkColor(7),clean);assert.deepEqual(e.w.slotAnimationDraft.get(7).dark,clean);assert.equal(e.calls.filter(c=>c.command==='edit_rig').length,0);
 }finally{e.close();}
});

test('light-only native publications preserve unrelated dark overrides, while a joint color key consumes supplied light and dark once',async()=>{
 const e=await fixture(true);try{await stageAll(e.w);await e.w.setSlotAnimationDarkColor(7,[.2,.4,.6]);assert.equal(await e.w.editRig({type:'setAnimationSlotKeys',animation:1,keys:[{slot:7,channel:'rgba',frame:15,values:[.1,.2,.3,1],curve:'linear'}]}),true);assert.equal(e.w.slotAnimationDraft.get(7).color,undefined);assert.deepEqual(e.w.slotAnimationDraft.get(7).dark,[.2,.4,.6]);
  await e.w.setSlotAnimationColor(7,[.4,.5,.6,.7]);await e.w.insertSlotAnimationKeys({slotId:7,channel:'rgba'});const sent=e.calls.at(-1).args.edit.keys[0];assert.deepEqual(sent.values,[.4,.5,.6,.7]);assert.deepEqual(sent.darkValues,[.2,.4,.6]);assert.equal(e.w.slotAnimationDraft.has(7),false);assert(e.w.animationDraft);assert(e.w.deformDraft.size);assert(e.w.sequenceDraft.size);
 }finally{e.close();}
});

test('pending joint color key cannot consume newer independent clean dark intent or mutate Setup enablement from Animate',async()=>{
 const e=await fixture(true);try{await e.w.setSlotAnimationDarkColor(7,[.2,.4,.6]);const release=e.deferEdit(),pending=e.w.editRig({type:'setAnimationSlotKeys',animation:1,keys:[{slot:7,channel:'rgba',frame:15,values:[.1,.2,.3,1],darkValues:[.2,.4,.6],curve:'linear'}]});await settle();const clean=[32/255,64/255,128/255];await e.w.setSlotAnimationDarkColor(7,clean);release();assert.equal(await pending,true);assert.deepEqual(e.w.slotAnimationDraft.get(7).dark,clean);
  const count=e.calls.length,before=copy(e.w.project);assert.equal(await e.w.editRig({type:'setSlotDarkColor',id:7,enabled:false,color:0x204080ff}),false);assert.equal(e.calls.length,count);assert.deepEqual(e.w.project,before);assert.match(e.w.notice,/Switch to Setup/);
 }finally{e.close();}
});

test('light manual and Auto Key on disabled Tint Black never promote retained dormant Setup RGB into keyed dark values',async()=>{
 const e=await fixture('disabled');try{assert.deepEqual(e.w.animationSlotDarkColor(7),[0,0,0]);await e.w.setSlotAnimationColor(7,[.1,.2,.3,.4]);await e.w.insertSlotAnimationKeys({slotId:7,channel:'rgba'});assert.deepEqual(e.calls.at(-1).args.edit.keys[0].darkValues,[0,0,0]);assert.equal(e.w.project.slots[0].darkColor,0x336699ff);
  e.w.animationAutoKey=true;await e.w.setSlotAnimationColor(7,[.2,.3,.4,.5]);assert.deepEqual(e.calls.at(-1).args.edit.keys[0].darkValues,[0,0,0]);assert.equal(e.w.project.slots[0].tintBlack,false);assert.equal(e.w.project.slots[0].darkColor,0x336699ff);
 }finally{e.close();}
});
