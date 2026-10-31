import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref,shallowRef} from 'vue';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';

test('real animation clock fires forward events and loop boundaries without firing on seek or changing the document',()=>{
 const key=(id,frame)=>({id,frame,int:id,float:0,string:'cue',volume:1,balance:0});
 const clip={id:1,name:'events',duration:24,tracks:[],eventTracks:[{event:7,keys:[key(11,0),key(12,12),key(13,24)]}]};
 const source={documentId:1,revision:1,bones:[],slots:[],constraints:[],animations:[clip],animationFps:24,animationChannels:[],sceneEditing:true},project=shallowRef(source),before=structuredClone(source),fired=[],actions=[],scope=effectScope();
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([]),editorMode:ref('animate'),localBones:shallowRef([]),attachment:ref(null),edit:async()=>{throw Error('Playback must not author');},notice:message=>{throw Error(message);},changed:()=>{},startPlayback:()=>actions.push('start'),stopPlayback:()=>actions.push('stop'),fireEvents:events=>{for(const event of events){fired.push(event.key.id);actions.push('event:'+event.key.frame);}}}));
 try{
  w.resetAnimationState();w.seekAnimation(12);assert.deepEqual(fired,[]);w.seekAnimation(0);w.playAnimation();assert.deepEqual(fired,[11]);
  w.advanceAnimation(10);assert.equal(w.animationFrame.value,6);assert.deepEqual(fired,[11]);w.advanceAnimation(.25);assert.deepEqual(fired,[11,12]);w.advanceAnimation(.25);w.advanceAnimation(.25);assert.equal(w.animationFrame.value,0);assert.deepEqual(fired,[11,12,13,11]);
  w.pauseAnimation();w.seekAnimation(0);fired.length=0;w.animationLoop.value=false;w.playAnimation();for(let i=0;i<4;i++)w.advanceAnimation(.25);
  assert.equal(w.animationPlaying.value,false);assert.equal(w.animationFrame.value,24);assert.deepEqual(fired,[11,12,13]);assert.deepEqual(actions.slice(-2),['stop','event:24'],'The end event survives the deliberate transport stop');
  w.seekAnimation(6);w.animationLoop.value=true;w.setAnimationLoopRange({start:6,end:18});fired.length=0;w.playAnimation();w.advanceAnimation(.25);w.advanceAnimation(.25);assert.deepEqual(fired,[12]);assert.equal(w.animationFrame.value,6);assert.deepEqual(project.value,before);
 }finally{scope.stop();}
});
test('dense loop events pause before any batch or frame is published when total work exceeds the preview bound',()=>{
 const keys=Array.from({length:100},(_,index)=>({id:index+1,frame:.5,int:0,float:0,string:'cue',volume:1,balance:0}));keys.push({...keys[0],id:101,frame:1});
 const clip={id:1,name:'dense event loop',duration:1,tracks:[],eventTracks:[{event:7,keys}]},project=shallowRef({documentId:1,revision:1,bones:[],slots:[],constraints:[],animations:[clip],animationFps:240,animationChannels:[],sceneEditing:true}),fired=[],notices=[],scope=effectScope();
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([]),editorMode:ref('animate'),localBones:shallowRef([]),attachment:ref(null),edit:async()=>{throw Error('Preview cannot author');},notice:message=>notices.push(message),changed:()=>{},fireEvents:events=>fired.push(...events)}));
 try{w.resetAnimationState();w.playAnimation();w.advanceAnimation(.25);assert.equal(w.animationPlaying.value,false);assert.equal(w.animationFrame.value,0);assert.deepEqual(fired,[]);assert.equal(notices.length,1);assert.match(notices[0],/too many events/);assert.equal(project.value.revision,1);}finally{scope.stop();}
});
