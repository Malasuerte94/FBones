import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluate,PhysicsState,SolveError,effectiveAngular} from '../src/domain/solve/index.ts';
const corpus=JSON.parse(readFileSync(new URL('../src-tauri/src/solve/oracle.json',import.meta.url),'utf8'));
const f=Math.fround;
// Legacy object recipes stay unchanged; arrays retain explicit route order.
function propertyEntries(value){return Array.isArray(value)?value.map(row=>[row.property,row]):Object.entries(value);}
function recipe(item){
 const ids=new Map(item.bones.map((b,i)=>[b.name,17+i*13]));
 const bones=item.bones.map(b=>({id:ids.get(b.name),parent:b.parent===undefined?null:ids.get(b.parent),name:b.name,x:f(b.x??0),y:f(b.y??0),rotation:f(b.rotation??0),length:f(b.length??0),scaleX:f(b.scaleX??1),scaleY:f(b.scaleY??1),shearX:f(b.shearX??0),shearY:f(b.shearY??0)}));
 const constraints=item.constraints.map((c,i)=>{
  const base={type:c.type,name:c.name,id:100+i*19,order:i};
  if(c.type==='ik')return{...base,bones:c.bones.map(b=>ids.get(b)),target:ids.get(c.target),mix:f(c.mix??1),softness:f(c.softness??0),bendPositive:c.bendPositive??true,compress:c.compress??false,stretch:c.stretch??false};
  if(c.type==='transform')return{...base,bones:c.bones.map(b=>ids.get(b)),source:ids.get(c.source),localSource:c.localSource??false,localTarget:c.localTarget??false,additive:c.additive??false,clamp:c.clamp??false,offsets:['rotation','x','y','scaleX','scaleY','shearY'].map(k=>f(c[k]??0)),mix:['mixRotate','mixX','mixY','mixScaleX','mixScaleY','mixShearY'].map(k=>f(c[k]??1)),properties:propertyEntries(c.properties).map(([property,p])=>({property,offset:f(p.offset??0),to:propertyEntries(p.to).map(([property,t])=>({property,offset:f(t.offset??0),max:f(t.max??1),scale:f(t.scale??1)}))}))};
  const rotate=f(c.rotate??0),shear=f(c.shearX??0),k=rotate||shear?f(f(rotate+shear)/Math.max(rotate,shear)):0;
  return{...base,bone:ids.get(c.bone),x:f(c.x??0),y:f(c.y??0),scaleX:f(c.scaleX??0),rotate:rotate||shear?f(rotate*k):null,shearX:f(shear*k),step:f(1/(c.fps??60)),inertia:f(c.inertia??.5),strength:f(c.strength??100),damping:f(c.damping??.85),mass:f(c.mass??1),wind:f(c.wind??0),gravity:f(c.gravity??0),mix:f(c.mix??1),limit:f(c.limit??5000),globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}};
 });return{bones,constraints};
}
function pose(b){return{x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY,shearX:b.shearX,shearY:b.shearY};}
function markers(scene,frame,expected,position=.45,basis=.009){for(const[name,values]of Object.entries(expected.bones)){const i=scene.bones.findIndex(b=>b.name===name),w=frame.bones[i].world;for(const[j,value]of[w.x,w.y,w.a,w.b,w.c,w.d].entries())assert.ok(Math.abs(value-values[j])<(j<2?position:basis),`${name} channel${j}: ${value} != ${values[j]}`);}}
function animated(scene,item,sequence,time){const poses=scene.bones.map(pose);for(const[name,timelines]of Object.entries(item.animations[sequence]?.bones??{})){
 const i=scene.bones.findIndex(b=>b.name===name);let x=0,y=0;
 for(const[k,key]of(timelines.translate??[]).entries()){const start=key.time??0;if(start>time+1e-9)break;x=key.x??0;y=key.y??0;const next=timelines.translate[k+1],end=next?.time??0;if(next&&time+1e-9<end&&end>start&&key.curve!=='stepped'){const t=(time-start)/(end-start);x+=((next.x??0)-x)*t;y+=((next.y??0)-y)*t;}}
 poses[i].x+=x;poses[i].y+=y;
 }return poses;}
test('shared original4.3.26 numeric corpus:37 static IK/Transform/fullaffine/order cases, stable IDs and authored immutability',()=>{
 let count=0;for(const item of corpus.cases){if(item.expected.length!==1)continue;const scene=recipe(item),before=structuredClone(scene);const frame=evaluate(scene,null,new PhysicsState(),{type:'none'});markers(scene,frame,item.expected[0]);assert.deepEqual(scene,before,item.name);assert.deepEqual(frame.bones.map(b=>b.id),scene.bones.map(b=>b.id));count++;}assert.equal(count,37);
});
test('shared original4.3.26 active Transform graph: two targets and ordered fan-in preserve setup and match measured origins, bases and 16-unit endpoints',()=>{
 const data=JSON.parse(readFileSync(new URL('../src-tauri/src/solve/active_graph_oracle.json',import.meta.url),'utf8'));
 assert.deepEqual(data.bounds,{worldOrigin:.25,worldBasis:.009,worldSixteenUnitPatchEndpoint:.25});assert.equal(data.cases.length,2);
 let targets=0;
 for(const[caseIndex,item]of data.cases.entries()){
  const scene=recipe(item),before=structuredClone(scene),c=scene.constraints[0];assert.equal(scene.constraints.length,1);assert.equal(c.type,'transform');assert.equal(c.bones.length,2);
  assert.deepEqual(c.properties.map(row=>row.property),['x','scaleY']);assert.deepEqual(c.properties[0].to.map(to=>to.property),['rotate','y']);assert.deepEqual(c.properties[1].to.map(to=>to.property),caseIndex===0?['scaleX']:['scaleX','rotate']);
  const frame=evaluate(scene,null,new PhysicsState(),{type:'none'}),expected=item.expected[0];assert.equal(Object.keys(expected.bones).length,2);markers(scene,frame,expected,data.bounds.worldOrigin,data.bounds.worldBasis);
  for(const id of c.bones){const bone=scene.bones.find(b=>b.id===id),index=scene.bones.indexOf(bone),world=frame.bones[index].world,patches=expected.patches[bone.name];assert.equal(patches.length,3);
   for(const[i,[x,y]]of [[0,0],[16,0],[0,16]].entries()){
    const point=[world.x+world.a*x+world.c*y,world.y+world.b*x+world.d*y];
    for(const[axis,value]of point.entries())assert.ok(Math.abs(value-patches[i][axis])<=data.bounds.worldSixteenUnitPatchEndpoint,`${item.name}/${bone.name}/patch${i}/axis${axis}: ${value} != ${patches[i][axis]}`);
   }targets++;
  }
  assert.deepEqual(scene,before,item.name);assert.deepEqual(frame.bones.map(b=>b.id),scene.bones.map(b=>b.id));assert.deepEqual(frame.bones.map(b=>b.authored),scene.bones.map(pose));
 }assert.equal(targets,4);
});
function physicsCases(teleportOnly){let frames=0;for(const item of corpus.cases){if(item.expected.length===1||item.name.startsWith('physics-teleport')!==teleportOnly)continue;const scene=recipe(item),step=scene.constraints.find(c=>c.type==='physics').step,state=new PhysicsState();let sequence='',clock=0,frame;
 for(const sample of item.expected){if(sequence!==sample.sequence){sequence=sample.sequence;clock=0;frame=evaluate(scene,animated(scene,item,sequence,0),state,{type:'reset',time:0});}
 const time=Math.max(0,sample.time-step);while(time-clock>1e-10){clock=Math.min(clock+1/60,time);frame=evaluate(scene,animated(scene,item,sequence,clock+step),state,{type:'update',time:clock});}markers(scene,frame,sample,.25,.012);frames++;}
 }return frames;}
test('shared original4.3.26 physics:990 frames, fullchannels/mass/damping/step/reset/order/outputsampling',()=>assert.equal(physicsCases(false),990));
test('original4.3.26 movingparent exportclock phase remains pending; same120frames as native regression',{skip:'Original free-teleport recovery phase unresolved; do not widen tolerance.'},()=>assert.equal(physicsCases(true),120));
test('rawAngularDTO coefficient conversion, inertial impulse/limit, repeatedPose and atomic failures',()=>{
 assert.deepEqual(effectiveAngular(null,0),[0,0]);const effective=effectiveAngular(.7,.525);assert.ok(Math.abs(effective[0]-.4)<1e-7);assert.ok(Math.abs(effective[1]-.3)<1e-7);
 const item=corpus.cases.find(c=>c.name==='physics-teleport-free'),scene=recipe(item),state=new PhysicsState(),h=scene.constraints[0].step;
 evaluate(scene,null,state,{type:'reset',time:0});const poses=scene.bones.map(pose);poses[1].x+=80;const frame=evaluate(scene,poses,state,{type:'update',time:h}),upper=scene.bones.findIndex(b=>b.name==='upper');assert.equal(frame.bones[upper].world.x,40);
 for(let i=0;i<3;i++)assert.deepEqual(evaluate(scene,poses,state,{type:'pose'}),frame);
 assert.throws(()=>evaluate(scene,poses,state,{type:'update',time:1000}),e=>e instanceof SolveError&&e.code==='StepLimit');assert.deepEqual(evaluate(scene,poses,state,{type:'pose'}),frame);
 assert.throws(()=>evaluate(scene,[],state,{type:'none'}),e=>e.code==='InvalidPoseCount');assert.throws(()=>evaluate(scene,poses,state,{type:'update',time:NaN}),e=>e.code==='InvalidTime');
 assert.deepEqual(evaluate(scene,null,state,{type:'update',time:0}).bones[upper].world.x,0);
});
test('IK rejects self/deep-descendant targets at every mix before committing spring state; ancestors remain valid',()=>{
 const base=recipe(corpus.cases.find(c=>c.name==='physics-y-trajectory')),state=new PhysicsState();evaluate(base,null,state,{type:'reset',time:0});const before=state.clone();
 const member=base.bones[1].id,child=base.bones[2].id,deep=999;
 const bones=[...base.bones,{...base.bones[2],id:deep,parent:child,name:'deep descendant',x:20}];
 for(const target of [member,child,deep])for(const mix of [0,1]){
  const ik={id:200,order:1,type:'ik',name:'feedback',bones:[member],target,mix,softness:0,bendPositive:true,compress:false,stretch:false};
  assert.throws(()=>evaluate({...base,bones,constraints:[...base.constraints,ik]},null,state,{type:'update',time:1/60}),e=>e.code==='InvalidConstraint');assert.deepEqual(state,before);
 }
 const valid={id:200,order:1,type:'ik',name:'ancestor',bones:[member],target:bones[0].id,mix:1,softness:0,bendPositive:true,compress:false,stretch:false};
 assert.doesNotThrow(()=>evaluate({...base,bones,constraints:[...base.constraints,valid]},null,state,{type:'update',time:1/60}));
});
test('physics rejects negative damping without a new upper bound or mutation',()=>{
 const base=recipe(corpus.cases.find(c=>c.name==='physics-wind-x'));
 for(const damping of [-.1,0,1,1.1]){const state=new PhysicsState(),scene={...base,constraints:[{...base.constraints[0],damping}]};if(damping<0){assert.throws(()=>evaluate(scene,null,state,{type:'reset',time:0}),e=>e.code==='InvalidConstraint');assert.deepEqual(state,new PhysicsState());}else assert.doesNotThrow(()=>evaluate(scene,null,state,{type:'reset',time:0}));}
});
test('local applied source after world constraint is canonically decomposed; inactiveTransform preserves zeroScale',()=>{
 const item=corpus.cases.find(c=>c.name==='order-world-local-source-reflected'),scene=recipe(item),frame=evaluate(scene,null,new PhysicsState(),{type:'none'});assert.equal(frame.bones[1].applied.shearX,0);assert.ok(frame.bones[1].applied.scaleX>0);assert.ok(frame.bones[1].applied.scaleY<0);assert.equal(frame.bones[1].authored.shearX,20);assert.equal(frame.bones[1].authored.scaleX,-1);
 const inactive=recipe(corpus.cases.find(c=>c.name==='transform-rotate-evaluated'));inactive.bones[1].scaleX=0;inactive.constraints[0].mix=[0,0,0,0,0,0];const plain={...inactive,constraints:[]};assert.deepEqual(evaluate(inactive,null,new PhysicsState(),{type:'none'}),evaluate(plain,null,new PhysicsState(),{type:'none'}));
 const invalid=structuredClone(scene);invalid.bones.reverse();assert.throws(()=>evaluate(invalid,null,new PhysicsState(),{type:'none'}),e=>e.code==='InvalidGraph');
 const duplicate=structuredClone(scene);duplicate.constraints[0].bones.push(duplicate.constraints[0].bones[0]);assert.throws(()=>evaluate(duplicate,null,new PhysicsState(),{type:'none'}),e=>e.code==='InvalidConstraint');
});
