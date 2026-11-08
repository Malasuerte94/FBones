import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref,shallowRef} from 'vue';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';
import {validAnimationLoopRange} from '../src/domain/animationPlayback.ts';

function fixture(){
 const key=(id,frame)=>({id,frame,int:id,float:0,string:'cue',volume:1,balance:0});
 const source={documentId:1,revision:7,bones:[],slots:[],constraints:[],animations:[{id:1,name:'loop',duration:30,tracks:[],eventTracks:[{event:2,keys:[key(1,0),key(2,10),key(3,15),key(4,20),key(5,30)]}]}],animationFps:30,animationChannels:[],sceneEditing:true};
 const project=shallowRef(source),before=structuredClone(source),fired=[],notices=[],scope=effectScope();
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([]),editorMode:ref('animate'),localBones:shallowRef([]),attachment:ref(null),edit:async()=>{throw Error('Transport must not author');},notice:m=>notices.push(m),changed:()=>{},fireEvents:events=>fired.push(...events.map(event=>event.key.id))}));
 w.resetAnimationState();
 return {w,project,before,fired,notices,close:()=>scope.stop()};
}

test('Play enters a selected range before its first event and honors inclusive start on every restart',()=>{
 const f=fixture();try{
  const {w,fired}=f;w.setAnimationLoopRange({start:10,end:20});
  for(const frame of [0,9,20,30,100]){
   w.seekAnimation(frame);fired.length=0;w.playAnimation();
   assert.equal(w.animationFrame.value,10);assert.deepEqual(fired,[2]);assert.equal(w.animationPlaying.value,true);
   w.advanceAnimation(1/6);assert.equal(w.animationFrame.value,15);assert.deepEqual(fired,[2,3]);w.pauseAnimation();
  }
  w.seekAnimation(15);fired.length=0;w.playAnimation();assert.equal(w.animationFrame.value,15);assert.deepEqual(fired,[3]);
  w.advanceAnimation(1/6);assert.equal(w.animationFrame.value,10);assert.deepEqual(fired,[3,4,2]);
  assert.deepEqual(f.project.value,f.before);assert.deepEqual(f.notices,[]);
 }finally{f.close();}
});

test('loop validation uses implicit endpoints and rejects invalid or excessive bounds without altering accepted range',()=>{
 const f=fixture();try{
  const {w}=f;w.setAnimationLoopRange({start:10,end:20});w.playAnimation();
  for(const range of [{start:20,end:10},{start:30,end:null},{start:null,end:0},{start:-1,end:20},{start:NaN,end:20},{start:10,end:Infinity},{start:0,end:1_000_001}]){
   assert.equal(validAnimationLoopRange(range,30),false);w.setAnimationLoopRange(range);
   assert.equal(w.animationLoopStart.value,10);assert.equal(w.animationLoopEnd.value,20);assert.equal(w.animationPlaying.value,true);
  }
  w.setAnimationLoopRange({start:10,end:20});assert.equal(w.animationPlaying.value,true,'unchanged bounds leave Play running');
  w.setAnimationLoopRange({start:5,end:null});assert.equal(w.animationPlaying.value,false);assert.equal(w.animationFrame.value,10,'range change pauses without seeking');
  w.seekAnimation(0);w.playAnimation();assert.equal(w.animationFrame.value,5);
  w.setAnimationLoopRange({start:null,end:20});assert.equal(w.animationPlaying.value,false);w.seekAnimation(30);w.playAnimation();assert.equal(w.animationFrame.value,0);
  w.setAnimationLoopRange({start:null,end:null});assert.equal(w.animationLoopStart.value,null);assert.equal(w.animationLoopEnd.value,null);
  assert.deepEqual(f.project.value,f.before);assert.deepEqual(f.notices,[]);
 }finally{f.close();}
});

test('empty or shortened clips never play an invalid effective interval and clearing range stays available',()=>{
 const f=fixture();try{
  const {w}=f;w.setAnimationLoopRange({start:20,end:null});
  f.project.value={...f.project.value,animations:[{...f.project.value.animations[0],duration:10}]};
  w.playAnimation();assert.equal(w.animationPlaying.value,false);assert.equal(w.animationFrame.value,0);assert.deepEqual(f.fired,[]);
  f.project.value={...f.project.value,animations:[{...f.project.value.animations[0],duration:0,eventTracks:[]}]};
  w.setAnimationLoopRange({start:null,end:null});assert.equal(w.animationLoopStart.value,null);assert.equal(w.animationLoopEnd.value,null);
  w.playAnimation();assert.equal(w.animationPlaying.value,false);assert.equal(validAnimationLoopRange({start:null,end:null},0),true);
 }finally{f.close();}
});
