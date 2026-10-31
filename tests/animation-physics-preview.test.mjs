import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AnimationPhysicsPreview} from '../src/domain/animationPhysicsPreview.ts';
import {evaluateSampled,PhysicsState} from '../src/domain/solve/index.ts';
const setupBones=[{id:100000007,parent:null,name:'root',x:0.1,y:0,rotation:0,length:40},{id:900000009,parent:100000007,name:'spring',x:40.1,y:0,rotation:0,length:30}];
const setupConstraints=[{id:31,order:0,name:'spring',type:'physics',bone:900000009,x:1,y:1,scaleX:0,rotate:null,shearX:0,step:.016666668,inertia:.5,strength:100,damping:.85,mass:1,wind:2,gravity:3,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}];
const clip={id:7,name:'Own preview',duration:60,tracks:[{bone:100000007,channel:'translate',keys:[{id:1,frame:0,values:[0,0],curve:'linear'},{id:2,frame:30,values:[80,15],curve:'linear'}]}],constraintTracks:[{channel:'physics',constraint:31,property:'gravity',keys:[{id:3,frame:0,value:3,curve:'linear'},{id:4,frame:30,value:8,curve:'linear'}]},{channel:'physicsReset',constraint:31,keys:[{id:5,frame:0},{id:6,frame:7.5}]}]};
const configuration={setupBones,setupConstraints,clip,fps:30};
function preview(config=configuration){const p=new AnimationPhysicsPreview();p.configure(config);return p;}
function nextDown(x){const b=new ArrayBuffer(8),v=new DataView(b);v.setFloat64(0,x);v.setBigUint64(0,v.getBigUint64(0)-1n);return v.getFloat64(0);}
test('Animate Physics commits only full ticks and is independent of fractional RAF schedule',()=>{
 for(const fps of[24,30])for(const step of[1/64,.016666668]){
  const config={...configuration,fps,setupConstraints:[{...setupConstraints[0],step}]};
  const direct=preview(config),frequent=preview(config);
  for(const seconds of[0,.001,1/60,nextDown(23/60),23/60,.4,.501,1,2]){
   const end=seconds*fps;
   for(let frame=frequent.animationFrame+.113;frame<end;frame+=.113)frequent.advanceTo(frame);
   frequent.advanceTo(end);direct.seek(end);assert.deepEqual(frequent.frame,direct.frame,`fps=${fps} step=${step} t=${seconds}`);
  }
  const at=structuredClone(direct.frame);direct.advanceTo(2*fps);assert.deepEqual(direct.frame,at);direct.seek(0);direct.advanceTo(2*fps);assert.deepEqual(direct.frame,at);
 }
});
test('private native-f32 recovery leaves source metadata intact and matches exact stored solver values',()=>{
 const input=structuredClone(configuration);input.setupBones[0].color=0xf1234567;
 const original=structuredClone(input),a=preview(input),b=preview({...input,setupBones:input.setupBones.map(v=>({...v,x:Math.fround(v.x),y:Math.fround(v.y),length:Math.fround(v.length)})),setupConstraints:input.setupConstraints.map(v=>({...v,step:Math.fround(v.step),damping:Math.fround(v.damping)}))});
 a.seek(15.25);b.seek(15.25);assert.deepEqual(a.frame,b.frame);assert.equal(a.localBones[0].id,100000007);assert.equal(a.localBones[0].color,0xf1234567);assert.deepEqual(input,original);
});
test('endpoint drafts are one scratch Pose over clean state and clearing never adds another Pose',()=>{
 const a=preview(),control=preview();a.seek(15.25);control.seek(15.25);const clean=a.frame;
 const bones=a.localBones.map((b,i)=>i?b:{...b,x:80.123456789123});
 const constraint={constraint:31,type:'physics',inertia:.5,strength:100,damping:.85,mass:1,wind:2,gravity:-0,mix:1};
 const posed=a.pose(bones,[constraint]);assert.equal(posed.bones[0].authored.x,80.123456789123);assert.notDeepEqual(posed,clean);
 assert.deepEqual(a.pose(bones,[constraint]),posed);assert.equal(a.time,15.25/30);
 assert.equal(a.pose(),clean);assert.equal(a.pose(undefined,[]),clean);
 a.advanceTo(20);control.advanceTo(20);assert.deepEqual(a.frame,control.frame);
});
test('invalid inputs reject atomically; Simulate off permits the full authoring time range',()=>{
 const p=preview();p.seek(3);const clean=p.frame;
 for(const frame of[-1,NaN,Infinity,3600.00001,1_000_001]){assert.throws(()=>p.seek(frame));assert.equal(p.frame,clean);assert.equal(p.animationFrame,3);}
 assert.throws(()=>p.pose([]));assert.equal(p.frame,clean);
 assert.throws(()=>p.pose(p.localBones,[{constraint:31,type:'physics',inertia:.5,strength:100,damping:.85,mass:0,wind:2,gravity:3,mix:1}]));assert.equal(p.frame,clean);
 assert.throws(()=>p.configure({...configuration,fps:NaN}));assert.equal(p.frame,clean);
 p.seek(3600);assert.equal(p.time,120);
 const off=preview({...configuration,simulate:false});off.seek(3630);assert.equal(off.time,121);assert.equal(off.frame.bones[1].world.x,Math.fround(0.1)+80+Math.fround(40.1));
});
test('sampled working coefficients retain spring layout and targeted Reset is explicit',()=>{
 const bones=setupBones.map(b=>({...b,x:Math.fround(b.x)})),scene={bones,constraints:setupConstraints.map(c=>({...c,step:Math.fround(c.step),damping:Math.fround(c.damping)}))};
 const a=new PhysicsState(),b=new PhysicsState();evaluateSampled(scene,null,a,{type:'reset',time:0},[]);evaluateSampled(scene,null,b,{type:'reset',time:0},[]);
 for(let i=1;i<=20;i++){const pose={constraint:31,type:'physics',inertia:.5,strength:100,damping:Math.fround(.85),mass:1,wind:2,gravity:i/2,mix:1};evaluateSampled(scene,null,a,{type:'update',time:i/60},[pose]);evaluateSampled(scene,null,b,{type:'update',time:i/60},[pose]);}
 const posed=evaluateSampled(scene,null,a,{type:'pose'},[]);const reset=evaluateSampled(scene,null,b,{type:'pose'},[],[31]);assert.notDeepEqual(posed,reset);
});
