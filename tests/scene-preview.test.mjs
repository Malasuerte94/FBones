import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ScenePreview} from '../src/domain/scenePreview.ts';
import {withEvaluatedPose} from '../src/domain/evaluatedPose.ts';
import {worldBones} from '../src/domain/rig.ts';
import {meshPoints} from '../src/domain/meshes.ts';
const scene={bones:[{id:7,parent:null,name:'root',x:0,y:0,rotation:0,length:80}],constraints:[{id:31,order:0,name:'spring',type:'physics',bone:7,x:1,y:1,scaleX:0,rotate:null,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:2,gravity:3,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}]};
test('setup preview advances only explicit fixed ticks; reset replays and never writes authoring data',()=>{
 const original=structuredClone(scene),a=new ScenePreview(),b=new ScenePreview();a.reset(scene);b.reset(scene);
 for(let i=0;i<60;i++)a.step();
 assert.equal(a.time,1);assert.notEqual(a.frame.bones[0].world.x,0);
 for(let i=0;i<60;i++){b.previewBones(scene.bones);b.step();}
 assert.deepEqual(a.frame,b.frame);assert.deepEqual(scene,original);
 const end=structuredClone(a.frame);a.reset(scene);for(let i=0;i<60;i++)a.step();assert.deepEqual(a.frame,end);
 const clock=a.time;a.previewBones([{...scene.bones[0],rotation:40}]);assert.equal(a.time,clock);assert.deepEqual(a.frame,end);
});
test('all viewport/skinning world consumers honor the exact frozen matrix without composing its parent again',()=>{
 const bones=[scene.bones[0],{id:9,parent:7,name:'child',x:80,y:0,rotation:0,length:20}],frames=[{id:7,world:{x:100,y:200,a:0,b:2,c:-1,d:0}},{id:9,world:{x:110,y:220,a:-2,b:0,c:0,d:1}}];
 const rendered=withEvaluatedPose(bones,frames),poses=worldBones(rendered);
 assert.equal(poses[1].worldX,110);assert.equal(poses[1].tipX,70);assert.equal(poses[1].depth,1);
 const points=meshPoints(rendered,{bones:[9],vertices:[{weights:[1],positions:[10,5]}]});assert.deepEqual(points,[{x:90,y:225}]);
 assert.deepEqual(bones[1],{id:9,parent:7,name:'child',x:80,y:0,rotation:0,length:20});
});
test('live parent preview carries physical state across one native commit and records only changed fixed ticks for exact replay',()=>{
 const base={bones:[{...scene.bones[0],x:0}],constraints:scene.constraints},runtime=new ScenePreview();runtime.reset(base);
 for(let i=0;i<10;i++)runtime.step();
 const next=[{...base.bones[0],x:80}];runtime.previewBones(next);runtime.step();
 assert.notEqual(runtime.frame.bones[0].world.x,80,'Live inertia responds to parent movement');
 const time=runtime.time,posed=structuredClone(runtime.frame),authored={...base,bones:next};
 assert.equal(runtime.adopt(authored),true);assert.equal(runtime.time,time);assert.deepEqual(runtime.frame,posed);
 for(let i=0;i<10;i++)runtime.step();
 const motion=runtime.motion();assert.equal(motion.initial[0].x,0);assert.equal(motion.changes.length,1);assert.equal(motion.changes[0].tick,11);assert.equal(motion.changes[0].poses[0].x,80);
 motion.initial[0].x=999;assert.equal(runtime.motion().initial[0].x,0);
 runtime.reset(authored);assert.equal(runtime.motion(),undefined);assert.equal(runtime.time,0);
});
test('recorded moving setup pose matches the shared native f32-freeze contract, including a paused current-pose edit',async()=>{
 const {readFileSync}=await import('node:fs');const f=JSON.parse(readFileSync(new URL('../src-tauri/src/solve/setup-preview-motion.json',import.meta.url),'utf8'));
 const runtime=new ScenePreview();runtime.reset(f.scene);
 for(let tick=1;tick<=f.freezeTick;tick++){
  const change=f.motion.changes.find(c=>c.tick===tick);
  if(change){const next={...f.scene,bones:f.scene.bones.map((b,i)=>({...b,...change.poses[i]}))};runtime.previewBones(next.bones);runtime.adopt(next);}
  runtime.step();
 }
 const current={...f.scene,bones:f.scene.bones.map((b,i)=>i===0?{...b,x:f.pausedCurrentRootX}:b)};runtime.previewBones(current.bones);assert.equal(runtime.adopt(current),true);
 assert.ok(Math.abs(runtime.frame.bones[1].world.x-f.expectedFreezeX)<f.positionTolerance);
 assert.deepEqual(runtime.motion(),f.motion);runtime.step();assert.ok(Math.abs(runtime.frame.bones[1].world.x-f.expectedNextTickX)<f.positionTolerance);
});
test('geometry-only native revisions preserve the paused physical pose and time instead of jumping to setup',()=>{
 const runtime=new ScenePreview();runtime.reset(scene);for(let i=0;i<60;i++)runtime.step();
 const frame=structuredClone(runtime.frame),time=runtime.time;
 assert.equal(runtime.hasDraft,false);assert.equal(runtime.adopt(structuredClone(scene)),true);assert.equal(runtime.time,time);assert.deepEqual(runtime.frame,frame);
 assert.equal(runtime.adopt({...scene,bones:[{...scene.bones[0],length:90}]}),false,'a changed physical layout requires an explicit reset');
});
test('native checkpoint acknowledgements preserve live gravity and motion beyond 120 seconds',()=>{
 const before=structuredClone(scene),frequent=new ScenePreview(),delayed=new ScenePreview();frequent.reset(scene);delayed.reset(scene);
 for(let tick=1;tick<=8100;tick++){
  if(tick%270===0){const bones=scene.bones.map(b=>({...b,x:tick%540?80:0}));frequent.previewBones(bones);delayed.previewBones(bones);}
  frequent.step();delayed.step();
  assert.deepEqual(frequent.frame,delayed.frame);
  if(tick%600===0){
   assert.equal(frequent.needsCheckpoint,true);const frame=frequent.frame,time=frequent.time;
   assert.equal(frequent.acknowledgeCheckpoint(tick),true);assert.equal(frequent.frame,frame);assert.equal(frequent.time,time);assert.equal(frequent.needsCheckpoint,false);
  }
  if(tick===7000)assert.equal(delayed.acknowledgeCheckpoint(tick),true);
 }
 assert.equal(frequent.tick,8100);assert.equal(frequent.time,135);assert.equal(frequent.checkpointTick,7800);
 assert.notEqual(frequent.frame.bones[0].world.y,0,'settled force offset must not reset with a checkpoint');
 assert.deepEqual(scene,before);
});
test('an asynchronous acknowledgement prunes only its prefix and preserves drafts and later absolute motion ticks',()=>{
 const a=new ScenePreview(),b=new ScenePreview();a.reset(scene);b.reset(scene);
 for(let i=0;i<10;i++){a.step();b.step();}
 for(const x of[80,90,100]){const bones=[{...scene.bones[0],x}];a.previewBones(bones);b.previewBones(bones);a.step();b.step();}
 const frame=a.frame,tailBefore=a.motion().changes.find(c=>c.tick===13);
 assert.equal(a.acknowledgeCheckpoint(11),true);assert.equal(a.checkpointTick,11);assert.equal(a.tick,13);assert.equal(a.frame,frame);assert.equal(a.hasDraft,true);
 const motion=a.motion();assert.equal(motion.initial[0].x,80);assert.deepEqual(motion.changes.map(c=>c.tick),[12,13]);assert.deepEqual(motion.changes.at(-1),tailBefore);
 motion.initial[0].x=999;motion.changes[0].poses[0].x=999;assert.equal(a.motion().initial[0].x,80);assert.equal(a.motion().changes[0].poses[0].x,90);
 a.step();b.step();assert.deepEqual(a.frame,b.frame);assert.deepEqual(a.motion().changes.map(c=>c.tick),[12,13],'unchanged draft is not spuriously recorded again after pruning');
});
test('stale, future and malformed acknowledgements are atomic; duplicate acknowledgement is idempotent',()=>{
 const runtime=new ScenePreview();runtime.reset(scene);runtime.previewBones([{...scene.bones[0],x:60}]);for(let i=0;i<20;i++)runtime.step();assert.equal(runtime.acknowledgeCheckpoint(10),true);
 const frame=runtime.frame,motion=runtime.motion(),time=runtime.time;
 for(const invalid of[-1,9,21,1.5,NaN,Infinity])assert.equal(runtime.acknowledgeCheckpoint(invalid),false);
 assert.equal(runtime.acknowledgeCheckpoint(10),true);assert.equal(runtime.frame,frame);assert.equal(runtime.time,time);assert.deepEqual(runtime.motion(),motion);
});
test('checkpoint baseline uses the recorded pose at its tick, not a later compatible authored pose',async()=>{
 const{readFileSync}=await import('node:fs');const f=JSON.parse(readFileSync(new URL('../src-tauri/src/solve/setup-preview-motion.json',import.meta.url),'utf8'));
 const runtime=new ScenePreview();runtime.reset(f.scene);
 for(let tick=1;tick<=f.freezeTick;tick++){
  const change=f.motion.changes.find(c=>c.tick===tick);
  if(change){const next={...f.scene,bones:f.scene.bones.map((b,i)=>({...b,...change.poses[i]}))};runtime.previewBones(next.bones);runtime.adopt(next);}
  runtime.step();
 }
 const current={...f.scene,bones:f.scene.bones.map((b,i)=>i===0?{...b,x:f.pausedCurrentRootX}:b)};runtime.previewBones(current.bones);assert.equal(runtime.adopt(current),true);
 const frame=runtime.frame;assert.equal(runtime.acknowledgeCheckpoint(11),true);assert.equal(runtime.frame,frame);assert.equal(runtime.motion().initial[0].x,80,'native checkpoint saw80, while current authored pose is90');assert.deepEqual(runtime.motion().changes,[]);
 assert.ok(Math.abs(runtime.frame.bones[1].world.x-f.expectedFreezeX)<f.positionTolerance);
 assert.equal(runtime.adopt(structuredClone(current)),true);assert.equal(runtime.checkpointTick,11);runtime.step();assert.ok(Math.abs(runtime.frame.bones[1].world.x-f.expectedNextTickX)<f.positionTolerance);assert.equal(runtime.motion().changes[0].tick,22);
});
test('replay bounds apply to the unacknowledged window and reject before mutating live physics',()=>{
 const runtime=new ScenePreview(),baseline=new ScenePreview();runtime.reset(scene);baseline.reset(scene);for(let i=0;i<7200;i++){runtime.step();baseline.step();}
 const frame=runtime.frame;assert.throws(()=>runtime.step(),/checkpoint/);assert.equal(runtime.tick,7200);assert.equal(runtime.frame,frame);
 assert.equal(runtime.checkpointBlocked,true);assert.equal(runtime.acknowledgeCheckpoint(6000),true);assert.equal(runtime.checkpointBlocked,false);assert.equal(baseline.acknowledgeCheckpoint(7200),true);runtime.step();baseline.step();assert.equal(runtime.tick,7201);assert.deepEqual(runtime.frame,baseline.frame);
 runtime.reset(scene);assert.equal(runtime.tick,0);assert.equal(runtime.checkpointTick,0);assert.equal(runtime.needsCheckpoint,false);assert.equal(runtime.motion(),undefined);
});
test('dense motion stays bounded while acknowledged windows release capacity without changing offsets',()=>{
 const bones=Array.from({length:128},(_,i)=>i?{id:100+i,parent:7,name:`child${i}`,x:0,y:i,rotation:0,length:10}:{...scene.bones[0]});
 const runtime=new ScenePreview();runtime.reset({...scene,bones});
 for(let tick=1;tick<=2047;tick++){runtime.previewBones(bones.map((b,i)=>i?b:{...b,x:tick%2}));runtime.step();}
 assert.equal(runtime.needsCheckpoint,true);assert.equal(runtime.checkpointBlocked,true);runtime.previewBones(bones.map((b,i)=>i?b:{...b,x:0}));const frame=runtime.frame;
 assert.throws(()=>runtime.step(),/motion checkpoint/);assert.equal(runtime.tick,2047);assert.equal(runtime.frame,frame);
 assert.equal(runtime.acknowledgeCheckpoint(2000),true);assert.equal(runtime.checkpointBlocked,false);assert.ok(runtime.motion().changes.every(c=>c.tick>2000));runtime.step();assert.equal(runtime.tick,2048);assert.ok(runtime.motion().changes.length<60);
});
