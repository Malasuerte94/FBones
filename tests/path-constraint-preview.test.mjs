import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleConstraintPoses} from '../src/domain/animationConstraints.ts';
import {AnimationPhysicsPreview} from '../src/domain/animationPhysicsPreview.ts';
import {previewTrackSupportsClip,samplePreviewTracks} from '../src/domain/previewTracks.ts';
import {ScenePreview} from '../src/domain/scenePreview.ts';
import {evaluate,PhysicsState} from '../src/domain/solve/index.ts';

function fixture(override={}){
 const bones=[
  {id:1,name:'root',parent:null,x:0,y:0,rotation:0,length:0},
  {id:10,name:'first',parent:1,x:-6,y:10,rotation:0,length:10},
  {id:20,name:'second',parent:1,x:-9,y:12,rotation:0,length:20},
 ];
 const path={
  constantSpeed:false,closed:false,color:0,weighted:false,bones:[1],edges:[1,4],lengths:[15,24],
  vertices:[[-1,-1],[0,0],[10,40/3],[20,80/3],[30,40],[31,41]]
   .map(positions=>({positions,weights:[1]})),
 };
 const slots=[{id:100,name:'guide',bone:1,activeAttachmentId:200,
  attachments:[{id:200,slot:100,name:'guide',type:'path',path}]}];
 const constraints=[{
  type:'path',id:300,order:0,name:'follow',slot:100,bones:[10,20],rotation:0,
  positionMode:'fixed',position:12.5,spacingMode:'fixed',spacing:10,rotateMode:'tangent',
  mixRotate:1,mixX:1,mixY:1,...override,
 }];
 return {bones,slots,constraints};
}

function near(value,expected){
 assert.ok(Math.abs(value-expected)<.00002,`${value} != ${expected}`);
}
function origin(matrix,x,y){
 near(matrix.x,x);
 near(matrix.y,y);
}

test('static Path samples measured tangent, spacing, chain scale and dormant activation',()=>{
 const evaluateSetup=scene=>evaluate(scene,null,new PhysicsState(),{type:'none'}).bones;
 const scene=fixture(),before=structuredClone(scene);
 const [first,second]=evaluateSetup(scene).slice(1);
 origin(first.world,7.5,10);
 origin(second.world,13.5,18);
 near(first.world.a,.6);
 near(first.world.b,.8);
 assert.deepEqual(scene,before);
 assert.equal(first.authored.x,-6);
 const [percent]=evaluateSetup(fixture({positionMode:'percent',position:.25,spacingMode:'percent',spacing:.2})).slice(1);
 origin(percent.world,7.5,10);
 const [lengthFirst,lengthSecond]=evaluateSetup(fixture({spacingMode:'length'})).slice(1);
 origin(lengthFirst.world,7.5,10);
 origin(lengthSecond.world,19.5,26);
 const [scaleFirst,scaleSecond]=evaluateSetup(fixture({rotateMode:'chainScale',spacing:5})).slice(1);
 origin(scaleSecond.world,10.5,14);
 near(Math.hypot(scaleFirst.world.a,scaleFirst.world.b),.5);
 near(Math.hypot(scaleSecond.world.a,scaleSecond.world.b),.25);
 const hidden={...scene,slots:[{...scene.slots[0],activeAttachmentId:null}]};
 origin(evaluateSetup(hidden)[1].world,-6,10);
});

test('Setup draft and Animate playback hold nonconstant authored lengths while the target geometry moves',()=>{
 const scene=fixture(),setup=new ScenePreview();
 setup.reset(scene);
 const draft=scene.bones.map((bone,index)=>index?bone:{...bone,scaleX:2});
 origin(setup.previewBones(draft).bones[1].world,15,10);
 origin(setup.step().bones[1].world,15,10);
 setup.clearDraft();
 origin(setup.frame.bones[1].world,7.5,10);
 assert.equal(setup.adopt({...scene,slots:[{...scene.slots[0],activeAttachmentId:null}]}),false);

 const clip={id:400,name:'move guide',duration:24,tracks:[
  {bone:1,channel:'scale',keys:[
   {id:501,frame:0,values:[1,1],curve:'linear'},
   {id:502,frame:24,values:[2,1],curve:'linear'},
  ]},
 ]};
 const playback=new AnimationPhysicsPreview();
 playback.configure({setupBones:scene.bones,setupConstraints:scene.constraints,setupSlots:scene.slots,clip,fps:30,simulate:false});
 origin(playback.advanceTo(24).bones[1].world,15,10);
 origin(playback.seek(0).bones[1].world,7.5,10);
 assert.equal(playback.localBones[1].x,-6);
});

test('Path animation uses each lane’s Setup value before its first key and samples independent absolute controls',()=>{
 const scene=fixture();
 const clip={id:401,name:'path values',duration:24,tracks:[],constraintTracks:[
  {channel:'pathPosition',constraint:300,keys:[
   {id:510,frame:6,values:[15],curve:'stepped'},
   {id:511,frame:18,values:[25],curve:'linear'},
  ]},
  {channel:'pathSpacing',constraint:300,keys:[
   {id:512,frame:12,values:[20],curve:'linear'},
   {id:513,frame:24,values:[0],curve:'linear'},
  ]},
  {channel:'pathMix',constraint:300,keys:[
   {id:514,frame:12,values:[0,.25,.5],curve:'bezier',
    controls:[[14,.25,22,.75],[13,.25,23,.25],[12,1,24,1]]},
   {id:515,frame:24,values:[1,.75,1],curve:'linear'},
  ]},
 ]};
 const sample=frame=>sampleConstraintPoses(scene.constraints,clip.constraintTracks,frame);
 assert.deepEqual(sample(5),[]);
 assert.deepEqual(sample(12-1),[{type:'path',constraint:300,position:15,spacing:10,mixes:[1,1,1]}]);
 assert.deepEqual(sample(12),[{type:'path',constraint:300,position:15,spacing:20,mixes:[0,.25,.5]}]);
 const [pose]=sample(18);
 assert.equal(pose.position,25);
 assert.equal(pose.spacing,10);
 near(pose.mixes[0],.5);
 near(pose.mixes[1],.3125);
 near(pose.mixes[2],.9375);
 assert.deepEqual(sample(24),[{type:'path',constraint:300,position:25,spacing:0,mixes:[1,.75,1]}]);

 const playback=new AnimationPhysicsPreview();
 const input={setupBones:scene.bones,setupConstraints:scene.constraints,setupSlots:scene.slots,fps:30,simulate:false};
 playback.configure({...input,clip});
 origin(playback.advanceTo(18).bones[1].world,.5625,19.375);
 assert.equal(playback.localBones[1].x,-6);
 assert.throws(()=>playback.pose(undefined,[pose]),/constraint draft targets/);
 playback.configure({...input,clip:{...clip,constraintTracks:[]}});
 origin(playback.advanceTo(18).bones[1].world,7.5,10);

 assert.equal(previewTrackSupportsClip(clip,0),true);
 assert.equal(previewTrackSupportsClip(clip,1),false);
 const preview=(from,to,mix,alpha=1)=>samplePreviewTracks(scene,[{previous:from,current:to,mix,alpha}]).bones[1].evaluatedWorld;
 origin(preview(null,{clip,frame:18},1),.5625,19.375);
 origin(preview({clip,frame:18},null,1),7.5,10);
 origin(preview(null,{clip,frame:8,additive:true},1),16.5,22);
});
