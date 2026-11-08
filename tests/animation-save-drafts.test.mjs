// Actual workspace Save/Save As + production per-field draft retention. Native
// replies are explicitly typed fixtures: these checks do not write a project,
// replace binary codec tests, or prove OS dialogs/browser/native rendering.
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
 const region={name:'Own image',image:'own',imagePath:'',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},mesh={weighted:false,bones:[0],vertices:[[0,0],[30,0],[0,20]].map(positions=>({weights:[1],positions})),uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3},attachment={id:9,slot:7,name:'Own mesh',type:'mesh',region,mesh,clipping:null,imageAvailable:true};
 return{...draftSummary('Own saved working pose'),documentId:1,revision:1,sceneEditing:true,path:'own-source.fbones',bones:[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:30,scaleX:1,scaleY:1,shearX:0,shearY:0},{id:1,parent:0,name:'child',x:40,y:0,rotation:0,length:20,scaleX:1,scaleY:1,shearX:0,shearY:0}],boneCount:2,slots:[{id:7,name:'Own mesh slot',bone:0,visible:true,color:0xffffffff,region,mesh,activeAttachmentId:9,attachments:[attachment],imageAvailable:true},{id:8,name:'Own empty slot',bone:0,visible:false,color:0xffffffff,region:null,activeAttachmentId:null,attachments:[],imageAvailable:false}],constraints:[{id:31,type:'ik',name:'Own IK',bones:[1],target:0,order:0,mix:.5,softness:0,stretch:false,compress:false,bendPositive:true}],events:[{id:41,name:'Own event',int:0,float:0,string:'',audio:'',volume:1,balance:0}],animations:Array.from({length:19},(_,i)=>({id:i+1,name:'Own clip '+(i+1),duration:30,tracks:[]})),animationFps:30,animationChannels:['translate','rotate','scale','shear'],library:{root:'./source-images/',images:[{key:'own',width:32,height:24}],warnings:[]},audioLibrary:{root:'./source-audio/',sounds:[],warnings:[]}};
}
async function fixture(){
 const pinia=createPinia(),w=useWorkspace(pinia),initial=source(),calls=[],savedReplies=[];let behavior='success',gate=null;
 invoke=async(command,args)=>{
  calls.push({command,args:copy(args??{})});
  if(command==='close_project')return;
  assert.equal(command,'save_project','unkeyed working edits must not invoke authoring commands');
  const reply=copy(initial);reply.revision++;reply.dirty=false;if(args.saveAs){reply.path='own-copy.fbones';reply.library.root='./images/';reply.audioLibrary.root='./audio';}
  const result=behavior,wait=gate;behavior='success';gate=null;if(wait)await wait.promise;
  if(result==='cancel')return null;if(result==='fail')throw Error('Own Save failure');savedReplies.push(copy(reply));return reply;
 };
 w.project=copy(initial);w.selectBone(0);await w.setEditorMode('animate');w.animationId=1;w.animationAutoKey=false;w.seekAnimation(15);await nextTick();
 return{w,initial,calls,savedReplies,setBehavior(value){behavior=value;},defer(){let release;const promise=new Promise(resolve=>{release=resolve;});gate={promise};return release;},close(){w.$dispose();pinia._s.clear();}};
}
async function stageAll(w){
 assert.equal(await w.editRig({...w.selectedBone,x:11,rotation:45,type:'update'}),true);
 assert.equal(await w.editRig({type:'setSlotColor',id:7,color:0x336699ff}),true);
 w.selectAttachment(9);assert.equal(await w.editRig({type:'moveMesh',id:7,dx:3,dy:4}),true);w.selectBone(0);
 assert.equal(await w.setAnimationDrawOrder([8,7]),true);assert.equal(await w.setConstraintAnimationFields(31,{mix:.75}),true);assert.equal(await w.setEventAnimationFields(41,{string:'Own working event'}),true);
}
function drafts(w){return{bone:copy(w.animationDraft?.map(({type:_,evaluatedWorld:__,...bone})=>bone)??null),slot:copy([...w.slotAnimationDraft]),deform:copy([...w.deformDraft]),order:copy(w.drawOrderDraft),constraint:copy([...w.constraintDraft]),event:copy([...w.eventDraft])};}
function authored(p){return copy({bones:p.bones,slots:p.slots,constraints:p.constraints,events:p.events,animations:p.animations});}

test('actual Save and Save As preserve all live working families without authoring keys or changing stored Setup',async()=>{
 for(const saveAs of [false,true]){const e=await fixture();try{
  await stageAll(e.w);const before=drafts(e.w);assert.equal(e.calls.length,0);assert.equal(await e.w.save(saveAs),true);assert.deepEqual(drafts(e.w),before);assert.deepEqual(authored(e.w.project),authored(e.initial));assert.deepEqual(authored(e.savedReplies[0]),authored(e.initial));assert.equal(e.w.project.dirty,false);assert.equal(e.w.project.revision,2);assert.equal(e.w.animationFrame,15);assert.equal(e.w.animationId,1);assert.deepEqual(e.calls,[{command:'save_project',args:{saveAs}}]);if(saveAs){assert.equal(e.w.project.library.root,'./images/');assert.equal(e.w.project.audioLibrary.root,'./audio');}
 }finally{e.close();}}
});

test('canceled and failed Save or Save As leave the current summary and working pose untouched',async()=>{
 for(const saveAs of [false,true])for(const behavior of ['cancel','fail']){const e=await fixture();try{
  await stageAll(e.w);const before=drafts(e.w),summary=copy(e.w.project);e.setBehavior(behavior);assert.equal(await e.w.save(saveAs),false);assert.deepEqual(drafts(e.w),before);assert.deepEqual(e.w.project,summary);assert.equal(e.savedReplies.length,0);if(behavior==='fail')assert.match(e.w.notice,/Own Save failure/);
 }finally{e.close();}}
});

test('Save publication retains newer live intent and clean reverts rather than its request-time whole pose',async()=>{
 const e=await fixture();try{
  await stageAll(e.w);const release=e.defer(),pending=e.w.save();await settle();assert.equal(e.w.busy,true);
  // Arrange a newer working-state edit while the typed Save reply is delayed;
  // actual browser fields are disabled during Save, so this is not input proof.
  e.w.boneAnimationEdit({...e.w.animationBones[0],x:61,rotation:0,type:'update'},e.w.animationBones);e.w.slotAnimationEdit({type:'setSlotColor',id:7,color:0xffffffff});const live=drafts(e.w);release();assert.equal(await pending,true);assert.deepEqual(drafts(e.w),live);assert.equal(e.w.animationBones[0].x,61);assert.equal(e.w.animationBones[0].rotation,0);assert.deepEqual(authored(e.savedReplies[0]),authored(e.initial));
 }finally{e.close();}
});

test('Save after clip or explicit discard transitions cannot resurrect old working fields',async()=>{
 for(const transition of ['clip','discard']){const e=await fixture();try{
  await stageAll(e.w);const release=e.defer(),pending=e.w.save();await settle();if(transition==='clip'){e.w.selectAnimation(2);e.w.selectAnimation(1);}else e.w.clearAnimationDraft();const discarded=drafts(e.w);release();assert.equal(await pending,true);assert.deepEqual(drafts(e.w),discarded);assert.equal(e.w.animationDraft,null);assert.deepEqual(authored(e.w.project),authored(e.initial));
 }finally{e.close();}}
});

test('a stale Save reply cannot overwrite a newer revision or document or its current working state',async()=>{
 for(const transition of ['revision','document']){const e=await fixture();try{
  await stageAll(e.w);const release=e.defer(),pending=e.w.save();await settle();e.w.project={...e.w.project,revision:7,...(transition==='document'?{documentId:2}:{})};await nextTick();const protectedSummary=copy(e.w.project),protectedDrafts=drafts(e.w);release();assert.equal(await pending,false);assert.deepEqual(e.w.project,protectedSummary);assert.deepEqual(drafts(e.w),protectedDrafts);
 }finally{e.close();}}
});

test('Save and continue retains the explicit project-close lifecycle discard after success',async()=>{
 const e=await fixture();try{
  await stageAll(e.w);await e.w.request('close');assert.equal(e.w.discardDialog,true);await e.w.saveAndContinue();await nextTick();assert.equal(e.w.project,null);assert.equal(e.w.editorMode,'setup');assert.equal(e.w.animationDraft,null);assert.deepEqual(e.calls.map(call=>call.command),['save_project','close_project']);assert.deepEqual(authored(e.savedReplies[0]),authored(e.initial));
 }finally{e.close();}
});
