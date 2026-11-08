import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createPinia,setActivePinia} from 'pinia';
import {draftSummary} from '../src/domain/project.ts';
globalThis.document={title:''};
let model,calls,pending,failEvaluation,cancelOpen,failCreate;
const snapshot=args=>({revision:args.expectedRevision,documentId:model.documentId,poseEpoch:100+calls.length,time:args.request.time,mode:'replay',bones:model.bones.map(b=>({id:b.id,world:{x:b.x,y:b.y,a:1,b:0,c:0,d:1}}))});
globalThis.__TAURI__={core:{invoke:async(command,args)=>{
 calls.push({command,args});
 if(command==='evaluate_project'){
  if(failEvaluation)throw Error('checkpoint failed');
  const result=snapshot(args);
  if(pending)return new Promise((resolve,reject)=>{pending.resolve=(overrides={})=>resolve({...result,...overrides});pending.reject=reject;});
  return result;
 }
 if(command==='save_project'){model={...model,revision:model.revision+1,dirty:false};return model;}
 if(command==='open_project'){if(cancelOpen)return null;model={...model,documentId:model.documentId+1,logicalDocumentId:model.logicalDocumentId+1,revision:model.revision+1,dirty:false};return model;}
 if(command==='create_project'){if(failCreate)throw Error('create failed');model={...model,documentId:model.documentId+1,logicalDocumentId:model.logicalDocumentId+1,revision:model.revision+1,name:args.name,dirty:false};return model;}
 if(command==='choose_images_folder'||command==='refresh_images_folder'){model={...model,documentId:model.documentId+1,revision:model.revision+1,dirty:command==='choose_images_folder'||model.dirty,canUndo:true,library:{root:'./other-images/',images:[],warnings:[]}};return model;}
 if(command==='edit_rig'&&args.edit.type==='undo'){model={...model,documentId:model.documentId+1,revision:model.revision+1,dirty:false,canUndo:false,canRedo:true,library:{root:'./images/',images:[],warnings:[]}};return model;}
 throw Error(`Unexpected ${command}`);
}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const physics={id:4,order:0,name:'spring',type:'physics',bone:0,x:0,y:1,scaleX:0,rotate:null,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:20,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}};
beforeEach(()=>{setActivePinia(createPinia());calls=[];pending=null;failEvaluation=false;cancelOpen=false;failCreate=false;model={...draftSummary('Live'),documentId:77,logicalDocumentId:11,revision:2,sceneEditing:true,dirty:false,constraints:[physics]};});
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();await new Promise(setImmediate);};
function seconds(w,n){for(let i=0;i<n*10;i++)w.advanceSimulation(.1);}
test('Setup starts live, idle physics never authors, temporary holds and reset preserve explicit user intent',()=>{
 const w=useWorkspace();w.project=model;assert.equal(w.simulationIntent,true);assert.equal(w.simulationRunning,true);
 const before=JSON.stringify(w.project);seconds(w,1);assert.ok(w.simulationTime>.9);assert.notEqual(w.renderedBones[0].evaluatedWorld.y,model.bones[0].y);assert.equal(JSON.stringify(w.project),before);assert.equal(calls.length,0);
 for(const reason of ['geometry','parent']){w.suspendSimulation(reason);assert.equal(w.simulationRunning,false);w.resumeSimulation(reason);assert.equal(w.simulationRunning,true);}
 w.pauseSimulation();w.resetSimulation();assert.equal(w.simulationIntent,false);assert.equal(w.simulationRunning,false);
 w.setPreviewVisible(false);w.setPreviewVisible(true);w.suspendSimulation('geometry');w.resumeSimulation('geometry');assert.equal(w.simulationRunning,false);
 w.stepSimulation();assert.ok(w.simulationTime>0);w.project={...model,documentId:78};assert.equal(w.simulationRunning,false,'native resource generation changes are not a new/open lifecycle');assert.equal(w.simulationTime,0);
});
test('hidden and modal time never backlogs and non-physics scenes never run',()=>{
 const w=useWorkspace();w.project=model;w.setPreviewVisible(false);w.advanceSimulation(40);assert.equal(w.simulationTime,0);w.setPreviewVisible(true);w.advanceSimulation(1/60);assert.equal(w.simulationTime,1/60);
 w.newDialog=true;w.advanceSimulation(40);assert.equal(w.simulationTime,1/60);w.newDialog=false;w.advanceSimulation(1/60);assert.equal(w.simulationTime,2/60);
 w.project={...model,constraints:[],revision:3};assert.equal(w.simulationRunning,false);
});
test('periodic continuation crosses120seconds without physical reset or per-frame IPC',async()=>{
 const w=useWorkspace();w.project=model;const reset=w.simulationReset;
 for(let i=0;i<13;i++){seconds(w,10);await flush();}
 assert.equal(w.simulationTime,130);assert.equal(w.simulationReset,reset);assert.equal(w.simulationError,'');assert.equal(w.project.revision,2);assert.equal(w.project.dirty,false);
 const evaluations=calls.filter(c=>c.command==='evaluate_project');assert.equal(evaluations.length,13);assert.equal(evaluations[0].args.request.fromPoseEpoch,undefined);assert.ok(evaluations.slice(1).every(c=>Number.isInteger(c.args.request.fromPoseEpoch)));
});
test('a pending compatible checkpoint acknowledges only its captured prefix; geometry freeze waits for it',async()=>{
 const w=useWorkspace();w.project=model;pending={};seconds(w,10);assert.equal(calls.length,1);
 const draft=model.bones.map(b=>({...b,x:b.x+10}));w.previewBonePose(draft);seconds(w,1);
 model={...model,revision:3,bones:draft};w.project=model;
 const frozen=w.freezePose();assert.equal(w.simulationIntent,true);assert.equal(w.simulationRunning,false);assert.equal(calls.length,1);
 const done=pending.resolve;pending=null;done();await flush();const result=await frozen;
 assert.equal(result.revision,3);assert.equal(calls.length,2);assert.equal(calls[1].args.request.time,11);assert.ok(calls[1].args.request.fromPoseEpoch);assert.equal(calls[1].args.request.motion.changes[0].tick,601);
 w.releasePose();assert.equal(w.simulationRunning,true);
});
test('failed checkpoint pauses visibly without losing intent; stale document checkpoint cannot contaminate next document',async()=>{
 const w=useWorkspace();w.project=model;failEvaluation=true;seconds(w,10);await flush();assert.match(w.simulationError,/checkpoint failed/);assert.equal(w.simulationRunning,false);assert.equal(w.simulationIntent,true);
 failEvaluation=false;w.resetSimulation();pending={};seconds(w,10);const old=pending.resolve;
 model={...model,documentId:78};w.project=model;assert.equal(w.simulationTime,0);pending=null;old();await flush();seconds(w,10);await flush();assert.equal(calls.at(-1).args.request.fromPoseEpoch,undefined);assert.equal(w.simulationError,'');
});

test('ProjectChanged checkpoint race retries a compatible current revision without dropping state or pausing intent',async()=>{
 const w=useWorkspace();w.project=model;pending={};seconds(w,10);const reject=pending.reject;
 model={...model,revision:3,bones:model.bones.map(b=>({...b,x:15}))};w.project=model;
 pending=null;reject({code:'ProjectChanged',message:'The project changed.'});await flush();
 assert.equal(calls.length,2);assert.equal(calls[1].args.expectedRevision,3);assert.equal(w.simulationError,'');assert.equal(w.simulationRunning,true);assert.equal(w.simulationTime,10);
 seconds(w,10);await flush();assert.ok(calls[2].args.request.fromPoseEpoch);assert.equal(w.simulationTime,20);
});
test('a slow native checkpoint holds at the bounded window then resumes without resetting physics',async()=>{
 const w=useWorkspace();w.project=model;pending={};seconds(w,130);assert.equal(w.simulationTime,120);assert.equal(w.simulationError,'');assert.equal(calls.length,1);
 const done=pending.resolve;pending=null;done();await flush();w.advanceSimulation(1/60);await flush();assert.ok(w.simulationTime>120);assert.equal(w.simulationError,'');assert.equal(w.project.revision,2);
});
test('reset retains an external modal hold and a failed geometry preparation releases only its temporary hold',async()=>{
 const w=useWorkspace();w.project=model;w.suspendSimulation('creator-modal');w.resetSimulation();assert.equal(w.simulationRunning,false);w.resumeSimulation('creator-modal');assert.equal(w.simulationRunning,true);
 failEvaluation=true;await assert.rejects(w.freezePose(),/checkpoint failed/);assert.equal(w.simulationIntent,true);assert.equal(w.simulationRunning,true);
 w.pauseSimulation();await assert.rejects(w.freezePose(),/checkpoint failed/);w.releasePose();assert.equal(w.simulationRunning,false);
});

test('native SaveAs-style compatible revision preserves explicit off and reset; reopen defaults on',async()=>{
 const w=useWorkspace();model={...model,canCopy:true,canSave:true};w.project=model;w.pauseSimulation();w.stepSimulation();const time=w.simulationTime;
 assert.equal(await w.save(true),true);assert.equal(calls.at(-1).command,'save_project');assert.equal(w.project.documentId,77);assert.equal(w.simulationTime,time);assert.equal(w.simulationIntent,false);w.resetSimulation();assert.equal(w.simulationIntent,false);
 await w.request('open');assert.equal(w.simulationIntent,true);assert.equal(w.simulationRunning,true);
});
test('native asset generation changes from folder selection, refresh and folder Undo preserve explicit Simulate off',async()=>{
 const w=useWorkspace();w.project=model;w.pauseSimulation();const firstId=w.project.documentId,logicalId=w.project.logicalDocumentId;
 await w.chooseImagesFolder();assert.equal(calls.at(-1).command,'choose_images_folder');assert.equal(w.project.documentId,firstId+1);assert.equal(w.project.logicalDocumentId,logicalId);assert.equal(w.simulationIntent,false);assert.equal(w.simulationRunning,false);
 w.advanceSimulation(1);assert.equal(w.simulationTime,0,'choosing a library must not silently restart physics');
 await w.editRig({type:'undo'});assert.equal(w.project.documentId,firstId+2);assert.equal(w.project.logicalDocumentId,logicalId);assert.equal(w.simulationIntent,false);assert.equal(w.project.library.root,'./images/');
 await w.refreshImagesFolder();assert.equal(w.project.documentId,firstId+3);assert.equal(w.project.logicalDocumentId,logicalId);assert.equal(w.simulationIntent,false);assert.equal(w.simulationRunning,false);
 w.runSimulation();await w.refreshImagesFolder();assert.equal(w.simulationIntent,true);assert.equal(w.project.logicalDocumentId,logicalId);assert.equal(w.simulationRunning,true,'resource refresh preserves enabled intent too');
});
test('only successful New/Open operations default Simulate on; canceled or failed operations preserve the old intent',async()=>{
 const w=useWorkspace();w.project=model;w.pauseSimulation();cancelOpen=true;await w.request('open');assert.equal(w.simulationIntent,false);assert.equal(w.project.documentId,77);assert.equal(w.project.logicalDocumentId,11);
 cancelOpen=false;await w.request('open');assert.equal(w.simulationIntent,true);assert.equal(w.project.documentId,78);assert.equal(w.project.logicalDocumentId,12);
 w.pauseSimulation();failCreate=true;await w.create('New live project');assert.equal(w.simulationIntent,false);assert.equal(w.project.documentId,78);assert.equal(w.project.logicalDocumentId,12);
 failCreate=false;await w.create('New live project');assert.equal(w.simulationIntent,true);assert.equal(w.project.documentId,79);assert.equal(w.project.logicalDocumentId,13);
});
test('canceling a pending geometry freeze cannot restore old matrices or secretly stop default live physics',async()=>{
 const w=useWorkspace();w.project=model;w.advanceSimulation(.1);pending={};const preparing=w.freezePose();const rejected=assert.rejects(preparing,/canceled/),done=pending.resolve;
 assert.equal(w.simulationRunning,false);w.releasePose();w.advanceSimulation(1/60);const time=w.simulationTime,frame=structuredClone(w.renderedBones);
 pending=null;done();await rejected;assert.equal(w.frozenPose,null);assert.deepEqual(w.renderedBones,frame);assert.equal(w.simulationTime,time);assert.equal(w.simulationRunning,true);
 w.advanceSimulation(1/60);assert.ok(w.simulationTime>time);assert.equal(w.project.dirty,false);
});
test('a replacement geometry freeze waits for canceled native work and owns its own hold and epoch',async()=>{
 const w=useWorkspace();w.project=model;w.advanceSimulation(.1);pending={};const first=w.freezePose(),rejected=assert.rejects(first,/canceled/),doneFirst=pending.resolve;
 w.releasePose();w.advanceSimulation(1/60);const time=w.simulationTime;pending={};const second=w.freezePose();assert.equal(calls.length,1);
 doneFirst();await rejected;await flush();assert.equal(calls.length,2);assert.equal(calls[1].args.request.fromPoseEpoch,101);assert.equal(calls[1].args.request.time,time);assert.equal(w.frozenPose,null);assert.equal(w.simulationRunning,false,'old request cannot release the new geometry hold');
 const doneSecond=pending.resolve;pending=null;doneSecond();const fresh=await second;assert.equal(fresh.poseEpoch,102);assert.equal(w.frozenPose.poseEpoch,102);w.releasePose();assert.equal(w.simulationRunning,true);
});
test('background checkpoint and replacement freeze serialize after cancellation without losing live tail',async()=>{
 const w=useWorkspace();w.project=model;w.advanceSimulation(.1);pending={};const old=w.freezePose(),rejected=assert.rejects(old,/canceled/),doneOld=pending.resolve;
 w.releasePose();seconds(w,10);const time=w.simulationTime;assert.equal(calls.length,1,'periodic request waits for the native geometry RPC');
 const replacement=w.freezePose();pending={};doneOld();await rejected;await flush();assert.equal(calls.length,2);assert.equal(calls[1].args.request.fromPoseEpoch,101);assert.equal(calls[1].args.request.time,time);
 const doneCheckpoint=pending.resolve;pending={};doneCheckpoint();await flush();assert.equal(calls.length,3);assert.equal(calls[2].args.request.fromPoseEpoch,102);assert.equal(w.simulationRunning,false);
 const doneGeometry=pending.resolve;pending=null;doneGeometry();const result=await replacement;assert.equal(result.poseEpoch,103);assert.equal(w.frozenPose.poseEpoch,103);assert.equal(w.simulationTime,time);assert.equal(w.simulationError,'');
 w.releasePose();w.advanceSimulation(1/60);assert.ok(w.simulationTime>time);
});
test('a regressing native epoch is rejected without replacing the current live frame',async()=>{
 const w=useWorkspace();w.project=model;seconds(w,10);await flush();const frame=structuredClone(w.renderedBones);pending={};const frozen=w.freezePose(),rejected=assert.rejects(frozen,/older checkpoint/),done=pending.resolve;
 pending=null;done({poseEpoch:100});await rejected;assert.equal(w.frozenPose,null);assert.deepEqual(w.renderedBones,frame);assert.equal(w.simulationRunning,true);assert.equal(w.simulationError,'');
 const valid=await w.freezePose();assert.equal(calls.at(-1).args.request.fromPoseEpoch,101,'failed old result cannot replace the retained native epoch');assert.ok(valid.poseEpoch>101);w.releasePose();
});
test('a compatible revision replacement owns a fresh geometry lease even without an explicit cancel',async()=>{
 const w=useWorkspace();w.project=model;w.advanceSimulation(.1);pending={};const first=w.freezePose(),rejected=assert.rejects(first,/canceled|project changed/i),doneFirst=pending.resolve;
 model={...model,revision:3,bones:model.bones.map(b=>({...b,x:15}))};w.project=model;pending={};const second=w.freezePose();assert.equal(calls.length,1);
 doneFirst();await rejected;await flush();assert.equal(calls.length,2);assert.equal(calls[1].args.expectedRevision,3);assert.equal(w.simulationRunning,false,'stale prior revision must not release replacement hold');
 const doneSecond=pending.resolve;pending=null;doneSecond();const result=await second;assert.equal(result.revision,3);assert.equal(w.frozenPose.revision,3);w.releasePose();assert.equal(w.simulationRunning,true);
});
