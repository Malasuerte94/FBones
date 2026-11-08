import assert from 'node:assert/strict';
import {FBonesPlayer, parseRuntimeData, createRuntimeData, RuntimeDataError, resourceKey} from '../dist/index.js';
import {FBonesView, runtimeImageKeys} from '../dist/pixi.js';
import {Texture, Mesh} from 'pixi.js';

const bone = (id=1,parent=null,x=10,y=20) => ({id,parent,name:`bone${id}`,x,y,rotation:0,length:10,scaleX:1,scaleY:1,shearX:0,shearY:0});
const key = (id,frame,x,y=0,curve='linear') => ({id,frame,values:[x,y],curve});
const clip = () => ({id:1,name:'move',duration:30,tracks:[{bone:1,channel:'translate',keys:[key(1,0,0,0),key(2,30,30,60)]}]});
const data = () => ({format:'fbones-runtime',version:1,fps:30,bones:[bone()],slots:[],constraints:[],events:[],animations:[clip()]});
const region = (image='head') => ({image,imagePath:'',name:image,x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:10,height:20});
const attachment = (id=1) => ({id,slot:1,name:'head',type:'region',region:region(),mesh:null,clipping:null,imageAvailable:true});
const slot = () => ({id:1,name:'head',bone:1,visible:true,blend:'normal',color:0xffffffff,region:region(),mesh:null,attachments:[attachment()],activeAttachmentId:1,imageAvailable:true});
const withArt = () => ({...data(),slots:[slot()]});
const event = (id=1) => ({id,name:'step',int:1,float:2,string:'hello',audio:'',volume:1,balance:0});
const eventKey = (id,frame) => ({id,frame,int:1,float:2,string:'hello',volume:1,balance:0});
const near = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
let passed=0;
async function test(name,run) {await run();passed++;console.log(`runtime ok ${passed} - ${name}`);}

await test('headless Node uses setup-relative sampling and does not mutate input', () => {
  const input=data(),before=JSON.stringify(input),player=new FBonesPlayer(input);
  player.play('move',{loop:false});player.update(.5);
  near(player.frame.bones[0].x,25);near(player.frame.bones[0].y,50);
  near(player.frame.bones[0].evaluatedWorld.x,25);
  assert.equal(JSON.stringify(input),before);assert.equal(player.data.bones[0].x,10);
  assert.throws(()=>{player.data.bones[0].x=100;},TypeError);
});
await test('fractional seconds, pause, resume, seek and nonloop endpoint', () => {
  const p=new FBonesPlayer(data());p.play('move',{loop:false});p.update(.25);p.pause();p.update(10);near(p.frame.time,.25);
  p.resume();p.update(2);near(p.frame.time,1);assert.equal(p.playing,false);
  p.seek(.5);p.resume();p.update(.25);near(p.frame.bones[0].x,32.5);
  p.stop();near(p.frame.time,0);assert.equal(p.playing,false);
});
await test('frame zero/end event ordering over several loops and silent seek', () => {
  const input=data();input.events=[event()];input.animations[0].eventTracks=[{event:1,keys:[eventKey(1,0),eventKey(2,15),eventKey(3,30)]}];
  const p=new FBonesPlayer(input);assert.deepEqual(p.play('move').events.map(e=>e.key.id),[1]);
  assert.deepEqual(p.update(2).events.map(e=>e.key.id),[2,3,1,2,3,1]);near(p.frame.time,0);
  assert.deepEqual(p.seek(.5).events,[]);p.pause();assert.deepEqual(p.update(1).events,[]);
});
await test('event and loop budgets fail before advancing the pose', () => {
  const input=data();input.events=[event()];input.animations[0].eventTracks=[{event:1,keys:Array.from({length:10},(_,index)=>eventKey(index,index*3))}];
  const p=new FBonesPlayer(input);p.play('move');const previous=p.frame;
  assert.throws(()=>p.update(500),/4096 events/);assert.equal(p.frame,previous);
  assert.throws(()=>p.update(1025),/1024 animation loops/);assert.equal(p.frame,previous);
  assert.throws(()=>p.update(NaN),RuntimeDataError);p.update(.5);near(p.frame.time,.5);
});
await test('all bone channel families retain relative and multiplicative conventions', () => {
  const input=data();input.bones[0]={...bone(),rotation:5,scaleX:2,scaleY:3,shearX:1,shearY:2};
  input.animations[0].tracks=[['translateX',5,0],['translateY',7,0],['rotate',10,0],['scaleX',2,0],['scaleY',3,0],['shear',4,5]].map(([channel,x,y],index)=>({bone:1,channel,keys:[key(index,0,x,y)]}));
  const p=new FBonesPlayer(input);const b=p.play('move').bones[0];
  assert.deepEqual([b.x,b.y,b.rotation,b.scaleX,b.scaleY,b.shearX,b.shearY],[15,27,15,4,9,5,7]);
});
await test('before first key, last duplicate, stepped and absolute-frame Bezier', () => {
  const input=data();input.animations[0].tracks[0].keys=[key(1,10,10,20,'stepped'),key(2,20,30,40),key(3,20,50,60),key(4,30,70,80)];
  const p=new FBonesPlayer(input);p.play('move',{loop:false});p.seek(0);near(p.frame.bones[0].x,10);
  p.seek(.5);near(p.frame.bones[0].x,20);p.seek(20/30);near(p.frame.bones[0].x,60);
  const bez=data();bez.animations[0].tracks[0].keys[0]={...key(1,0,0,0,'bezier'),controls:[[10,10,20,20],[10,20,20,40]]};
  const b=new FBonesPlayer(bez);b.play('move');b.seek(.5);near(b.frame.bones[0].x,25);near(b.frame.bones[0].y,50);
});
await test('inventory activation, light RGBA and draw order project together', () => {
  const input=withArt();input.slots.push({...slot(),id:2,name:'other',activeAttachmentId:3,attachments:[{...attachment(3),slot:2}]});
  input.slots[0].attachments.push({...attachment(2),name:'other',region:region('other')});
  input.animations[0].slotTracks=[{slot:1,channel:'attachment',keys:[{id:1,frame:0,attachment:2},{id:2,frame:20,attachment:null}]},{slot:1,channel:'rgba',keys:[{id:3,frame:0,values:[.2,.4,.6,.8],curve:'linear'}]}];
  input.animations[0].drawOrder=[{id:1,frame:0,order:[2,1]}];
  const p=new FBonesPlayer(input);p.play('move');assert.deepEqual(p.frame.slots.map(s=>s.id),[2,1]);
  assert.equal(p.frame.slots[1].region.image,'other');near(p.frame.slots[1].animatedColor[3],Math.fround(.8));
  p.seek(1);assert.equal(p.frame.slots[1].activeAttachmentId,null);assert.equal(p.frame.slots[1].visible,false);
});
await test('weighted mesh deformation samples in world coordinates without authoring changes', () => {
  const input=withArt(),mesh={weighted:true,bones:[1],vertices:[{weights:[1],positions:[0,0]},{weights:[1],positions:[10,0]},{weights:[1],positions:[0,10]}],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3};
  input.slots[0].attachments[0]={...attachment(),type:'mesh',mesh,region:{...region(),width:0,height:0}};
  input.animations[0].deformTracks=[{attachment:1,keys:[{id:1,frame:0,offsets:[2,3,0,0,0,0],dataPresent:true,curve:'linear'}]}];
  const p=new FBonesPlayer(input);p.play('move');assert.deepEqual(p.frame.slots[0].mesh.vertices[0].positions,[2,3]);assert.deepEqual(input.slots[0].attachments[0].mesh.vertices[0].positions,[0,0]);
});
await test('sequence keys preload correct unsuffixed base and extend playback tail', () => {
  const input=withArt(),a=input.slots[0].attachments[0];a.name='run';a.region={...region('run01'),imagePath:'run'};a.sequence={start:1,count:3,digits:2,setupIndex:0};a.sequenceAvailableFrames=[0,1,2];
  input.animations[0].duration=0;input.animations[0].tracks=[];
  input.animations[0].sequenceTracks=[{attachment:1,slot:1,keys:[{id:1,frame:0,mode:2,index:0,delay:.1}]}];
  assert.deepEqual(runtimeImageKeys(input),['run01','run02','run03']);
  const p=new FBonesPlayer(input);p.play('move');p.update(.1);assert.equal(p.frame.slots[0].region.image,'run02');near(p.duration,Math.fround(.1)*3);
});
await test('IK setup and animated mix use the shared bounded constraint solver', () => {
  const input=data();input.bones=[bone(1,null,10,20),bone(2,1,10,0),bone(3,null,10,30)];
  input.constraints=[{id:1,order:0,name:'aim',type:'ik',bones:[1],target:3,mix:1,softness:0,stretch:false,compress:false,bendPositive:true}];
  input.animations[0].tracks=[];
  input.animations[0].constraintTracks=[{channel:'ik',constraint:1,keys:[{id:1,frame:0,mix:0,softness:0,stretch:false,compress:false,bendPositive:true,curve:'linear'},{id:2,frame:30,mix:1,softness:0,stretch:false,compress:false,bendPositive:true,curve:'linear'}]}];
  const p=new FBonesPlayer(input);near(p.frame.bones[0].evaluatedWorld.a,0);near(p.frame.bones[1].evaluatedWorld.y,30);
  p.play('move',{loop:false});near(p.frame.bones[0].evaluatedWorld.a,1);p.seek(.5);near(p.frame.bones[0].evaluatedWorld.a,Math.SQRT1_2);
  delete input.animations[0].constraintTracks[0].keys[0].mix;assert.throws(()=>parseRuntimeData(input),RuntimeDataError);
});
await test('Physics update schedules and loop resets agree with deterministic seek', () => {
  const input=data();input.bones=[bone(1),bone(2,1,10,0)];
  input.constraints=[{id:1,order:0,name:'spring',type:'physics',bone:2,x:1,y:1,scaleX:0,rotate:null,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:2,gravity:3,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}];
  input.animations[0].constraintTracks=[{channel:'physics',constraint:1,property:'gravity',keys:[{id:1,frame:0,value:3,curve:'linear'},{id:2,frame:30,value:8,curve:'linear'}]},{channel:'physicsReset',constraint:1,keys:[{id:3,frame:15}]}];
  const direct=new FBonesPlayer(input),frequent=new FBonesPlayer(input),looped=new FBonesPlayer(input);
  for(const p of [direct,frequent,looped])p.play('move');direct.seek(.751);for(let i=0;i<75;i++)frequent.update(.01);frequent.update(.001);looped.update(1.751);
  for(const p of [frequent,looped])for(let i=0;i<2;i++)for(const field of ['x','y','a','b','c','d'])near(p.frame.bones[i].evaluatedWorld[field],direct.frame.bones[i].evaluatedWorld[field]);
  input.animations[0].duration=3630;const bounded=new FBonesPlayer(input);assert.throws(()=>bounded.play('move'),/time budget/);
  const off=new FBonesPlayer(input,{simulate:false});off.play('move');off.seek(121);near(off.frame.time,121);
  delete input.animations[0].constraintTracks[0].keys[0].value;assert.throws(()=>parseRuntimeData(input),RuntimeDataError);
});
await test('strict invalid-data table rejects malformed/unsupported fields', () => {
  const changes=[
    d=>{d.version=2;},d=>{d.fps=NaN;},d=>{d.bones[0].evaluatedWorld={x:0,y:0,a:1,b:0,c:0,d:1};},
    d=>{d.bones.push(bone());},d=>{d.bones[0].parent=99;},d=>{d.bones[0].inherit='none';},
    d=>{d.animations[0].tracks[0].bone=999;},d=>{d.animations[0].tracks[0].channel='path';},
    d=>{d.animations[0].pathTracks=[];},d=>{d.animations[0].tracks[0].keys[0].values=[1];},
    d=>{d.animations[0].tracks[0].keys[0].curve='bezier';},
    d=>{d.constraints=[{id:3,type:'path'}];},d=>{d.constraints=[{id:3,type:'physics'}];},d=>{d.events=[{id:2}];},
    d=>{d.events=[event()];d.animations[0].eventTracks=[{event:1,keys:[{id:1,frame:0}]}];},
  ];
  for(const change of changes){const input=data();change(input);assert.throws(()=>parseRuntimeData(input),RuntimeDataError);}
  let accessorCalled=false;const input=data();Object.defineProperty(input,'format',{enumerable:true,get(){accessorCalled=true;return 'fbones-runtime';}});
  assert.throws(()=>parseRuntimeData(input),RuntimeDataError);assert.equal(accessorCalled,false);
});
await test('strict sequence/resource keys reject unsafe paths and invalid indices/delay', () => {
  for(const value of ['../head','/head','C:/head','file://x','head\\x','head?x','head#x','a//b'])assert.throws(()=>resourceKey(value),RuntimeDataError);
  assert.equal(resourceKey('café/eye left'),'café/eye left');
  const input=withArt(),a=input.slots[0].attachments[0];a.sequence={start:1,count:3,digits:2,setupIndex:0};a.region.imagePath='../bad';
  assert.throws(()=>parseRuntimeData(input),RuntimeDataError);a.region.imagePath='run';
  for(const patch of [{delay:0},{index:-1},{index:3}]){input.animations[0].sequenceTracks=[{attachment:1,slot:1,keys:[{id:1,frame:0,mode:1,index:0,delay:.1,...patch}]}];assert.throws(()=>parseRuntimeData(input),RuntimeDataError);}
});
await test('game export helper strips transient matrices and refuses inspection-only projects', () => {
  const input=withArt();input.bones[0].evaluatedWorld={x:1000,y:0,a:1,b:0,c:0,d:1};input.slots[0].animatedColor=[1,0,0,1];
  input.bones[0].x=-0;input.bones[0].color=undefined;
  const exported=createRuntimeData({...input,inspectionOnly:false,animationFps:30});assert.equal('evaluatedWorld' in exported.bones[0],false);assert.equal('animatedColor' in exported.slots[0],false);
  assert.equal(Object.is(exported.bones[0].x,-0),true);assert.equal('color' in exported.bones[0],false);
  assert.throws(()=>createRuntimeData({...input,inspectionOnly:true}),RuntimeDataError);
});
await test('Pixi region matrix uses one Y conversion and keeps caller textures', () => {
  const p=new FBonesPlayer(withArt()),view=new FBonesView(()=>Texture.EMPTY);view.sync(p.frame);
  const node=view.children.find(child=>'texture' in child);near(node.x,10);near(node.y,-20);near(node.scale.x,10);near(node.scale.y,20);
  view.destroy();assert.equal(Texture.EMPTY.destroyed,false);
});
await test('Pixi mesh activation recreates geometry/UV/indices and updates vertex buffer', () => {
  const input=withArt();
  const geometry=(count)=>({weighted:true,bones:[1],vertices:Array.from({length:count},(_,i)=>({weights:[1],positions:[i,i*2]})),uvs:Array.from({length:count*2},(_,i)=>i/count),triangles:count===3?[0,1,2]:[0,1,2,0,2,3],edges:[],hull:count});
  input.slots[0].attachments=[{...attachment(1),type:'mesh',mesh:geometry(3)},{...attachment(2),type:'mesh',mesh:geometry(4)}];
  input.animations[0].slotTracks=[{slot:1,channel:'attachment',keys:[{id:1,frame:0,attachment:1},{id:2,frame:15,attachment:2}]}];
  const p=new FBonesPlayer(input);p.play('move');const view=new FBonesView(()=>Texture.EMPTY);view.sync(p.frame);const first=view.children.find(n=>n instanceof Mesh);
  assert.equal(first.geometry.positions.length,6);p.seek(.5);view.sync(p.frame);const second=view.children.find(n=>n instanceof Mesh);
  assert.notEqual(first,second);assert.equal(first.destroyed,true);assert.equal(second.geometry.positions.length,8);assert.equal(second.geometry.indices.length,6);near(second.geometry.positions[0],25);
  view.destroy();assert.equal(Texture.EMPTY.destroyed,false);
});
console.log(`Runtime: ${passed} tests passed; Node/model/Pixi object checks only, GPU pixels verified separately.`);
