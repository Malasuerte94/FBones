// Real workspace preview/freeze/commit routing with typed native replies. This
// proves frontend command intent, not native history, binary IO or OS input.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPinia} from 'pinia';
import {nextTick} from 'vue';
import {previewTransformBones,worldBones} from '../src/domain/rig.ts';
import {keyValues} from '../src/domain/animation.ts';
import {evaluate as evaluateScene} from '../src/domain/solve/index.ts';
import {PhysicsState} from '../src/domain/solve/physics.ts';

globalThis.document={title:''};
globalThis.window={innerWidth:1440,innerHeight:900,performance:globalThis.performance,addEventListener(){},removeEventListener(){}};
let invoke=async command=>{throw Error('Unexpected native request '+command);};
globalThis.__TAURI__={core:{invoke:(...args)=>invoke(...args)},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const copy=value=>JSON.parse(JSON.stringify(value));
const fields=['x','y','rotation','scaleX','scaleY','shearX','shearY'];
const pose=bones=>bones.map(bone=>fields.map(field=>bone[field]));
const closeTo=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-5,`${actual} != ${expected}`);
async function fixture(autoKey){
 const pinia=createPinia(),w=useWorkspace(pinia),bone=(id,parent,x,y,rotation)=>({id,parent,name:'Own '+id,x,y,rotation,length:20,scaleX:1,scaleY:1,shearX:0,shearY:0});
 const initial={...draftSummary('Own release test'),documentId:1,revision:1,sceneEditing:true,bones:[bone(0,null,13,-11,30),bone(1,0,40,17,-20),bone(2,0,110,25,0)],boneCount:3,
  constraints:[{id:31,type:'ik',name:'Own inactive IK',bones:[1],target:2,order:0,mix:0,softness:0,stretch:false,compress:false,bendPositive:true,uniform:false}],
  animations:[{id:1,name:'Own animated parent',duration:30,tracks:[{bone:0,channel:'rotate',keys:[{id:1,frame:0,values:[15,0],curve:'linear'}]},{bone:1,channel:'translate',keys:[{id:2,frame:0,values:[3,-2],curve:'linear'}]}]}],animationFps:30,animationChannels:['translate','rotate','scale','shear']};
 const calls=[];let epoch=1;
 invoke=async(command,args)=>{
  if(command==='evaluate_project'){
   const localBones=copy(w.animationBones),evaluation=evaluateScene({bones:localBones,constraints:w.constraints},null,new PhysicsState(),{type:'none'});
   return{documentId:w.project.documentId,revision:w.project.revision,poseEpoch:epoch++,animationId:w.animationId,time:args.request.time,mode:args.request.mode,localBones,bones:evaluation.bones};
  }
  assert.equal(command,'edit_rig');const edit=args.edit;assert.equal(edit.type,'setAnimationKeys');calls.push(copy(edit));
  const next=copy(w.project),clip=next.animations[0];
  for(const input of edit.keys){let track=clip.tracks.find(t=>t.bone===input.bone&&t.channel===input.channel);if(!track){track={bone:input.bone,channel:input.channel,keys:[]};clip.tracks.push(track);}track.keys.push({id:100+track.keys.length,frame:input.frame,values:copy(input.values),curve:input.curve});}
  next.revision++;return next;
 };
 w.project=copy(initial);w.selectBone(1);await w.setEditorMode('animate');w.animationId=1;w.animationAutoKey=autoKey;w.seekAnimation(15);await nextTick();
 return{w,initial,calls,close(){w.$dispose();pinia._s.clear();}};
}
const transform=(mode,delta={})=>({type:'transformBones',ids:[1],mode,pivotX:0,pivotY:0,dx:0,dy:0,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0,individual:true,...delta});

test('Animate release commits the captured baseline once after preview publication for signed XY drags and all transform modes',async()=>{
 for(const autoKey of [false,true])for(const edit of [transform('translate',{dx:26,dy:19}),transform('translate',{dx:-31,dy:-14}),transform('translate',{dx:0,dy:23}),transform('rotate',{rotation:25}),transform('scale',{scaleX:1.2,scaleY:.7,localAxes:true}),transform('shear',{shearX:8,shearY:-5})]){
  const e=await fixture(autoKey);try{
   const snapshot=await e.w.freezePose(),baseline=e.w.renderedBones,expected=previewTransformBones(baseline,edit),target=worldBones(e.w.previewBonePose(expected))[1];
   assert.equal(await e.w.editRig(edit,e.w.project.revision,snapshot.poseEpoch),true);e.w.endBonePreview();
   const actual=worldBones(e.w.renderedBones)[1];closeTo(actual.worldX,target.worldX);closeTo(actual.worldY,target.worldY);
   for(const field of fields)closeTo(e.w.animationBones[1][field],expected[1][field]);
   assert.deepEqual(e.w.project.bones,e.initial.bones,'Setup must remain untouched');
   assert.equal(e.calls.length,autoKey?1:0,'one completed gesture creates at most one key batch');
   if(autoKey){for(const key of e.calls[0].keys){const expectedValues=keyValues(e.initial.bones[key.bone],expected[key.bone],key.channel);key.values.forEach((value,index)=>closeTo(value,expectedValues[index]));}assert.equal(e.w.animationDraft,null);}
   else assert.deepEqual(e.w.project.animations,e.initial.animations);
  }finally{e.close();}
 }
});

test('canceling a preview restores the sampled pose and subsequent numeric edits use the current working baseline',async()=>{
 const e=await fixture(false);try{
  await e.w.freezePose();const before=pose(e.w.animationBones);e.w.previewBonePose(previewTransformBones(e.w.renderedBones,transform('translate',{dx:34,dy:-21})));e.w.endBonePreview();e.w.releasePose();
  assert.deepEqual(pose(e.w.animationBones),before);assert.deepEqual(e.calls,[]);
  const bone=e.w.animationBones[1];assert.equal(await e.w.editRig({...bone,type:'update',x:bone.x+9,y:bone.y-7}),true);assert.equal(e.w.animationBones[1].x,bone.x+9);assert.equal(e.w.animationBones[1].y,bone.y-7);
  assert.deepEqual(e.w.project.bones,e.initial.bones);
 }finally{e.close();}
});

test('a stale frozen gesture is rejected before applying its transform or authoring keys',async()=>{
 const e=await fixture(true);try{
  const snapshot=await e.w.freezePose();e.w.previewBonePose(previewTransformBones(e.w.renderedBones,transform('translate',{dx:12,dy:8})));e.w.seekAnimation(16);
  assert.equal(await e.w.editRig(transform('translate',{dx:12,dy:8}),e.w.project.revision,snapshot.poseEpoch),false);assert.deepEqual(e.calls,[]);assert.deepEqual(e.w.project.bones,e.initial.bones);assert.match(e.w.notice,/pose changed/);
 }finally{e.close();}
});

test('successive grouped drags rebase onto the last unkeyed pose and transform a selected parent with its child only once',async()=>{
 const e=await fixture(false);try{
  for(const delta of [{dx:12,dy:-8},{dx:-5,dy:16}]){
   const snapshot=await e.w.freezePose(),baseline=e.w.renderedBones,edit={...transform('translate',delta),ids:[0,1]},expected=previewTransformBones(baseline,edit);
   e.w.previewBonePose(expected);assert.equal(await e.w.editRig(edit,e.w.project.revision,snapshot.poseEpoch),true);e.w.endBonePreview();e.w.releasePose();
   for(const [index,bone]of expected.entries())for(const field of fields)closeTo(e.w.animationBones[index][field],bone[field]);
  }
  const sampledRoot=e.initial.bones[0];closeTo(e.w.animationBones[0].x,sampledRoot.x+7);closeTo(e.w.animationBones[0].y,sampledRoot.y+8);
  assert.deepEqual(e.calls,[]);assert.deepEqual(e.w.project.bones,e.initial.bones);assert.deepEqual(e.w.project.animations,e.initial.animations);
 }finally{e.close();}
});
