import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref,shallowRef} from 'vue';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';

test('short native f32 decimals share one four-family clipboard origin and retain relative f64 control offsets',async()=>{
 const bone={id:1,parent:null,name:'root',x:0,y:0,rotation:0,length:20,scaleX:1,scaleY:1,shearX:0,shearY:0};
 const controls=[[.4,1.2,.5,7.3],[.4,0,.5,0]],curve={frame:.3,curve:'bezier',controls},ids=[101,102,201,202,211,212,301,401,402];
 const clip={id:8,name:'native shortest decimal transport',duration:.6,
  tracks:[{bone:1,channel:'translate',keys:[{...curve,id:101,values:[0,0]},{id:102,frame:.6,curve:'linear',values:[20,0]}]}],
  slotTracks:[{slot:10,channel:'attachment',keys:[{id:201,frame:.3,attachment:7},{id:202,frame:.6,attachment:null}]},{slot:10,channel:'rgba',keys:[{id:211,frame:.3,values:[1,1,1,1],curve:'linear'},{id:212,frame:.6,values:[.2,.3,.4,.5],curve:'linear'}]}],
  drawOrder:[{id:301,frame:.3,order:null}],deformTracks:[{attachment:7,keys:[{id:401,frame:.3,offsets:[0,0],dataPresent:true,curve:'bezier',controls:[.4,0,.5,1]},{id:402,frame:.6,offsets:[10,20],dataPresent:true,curve:'linear'}]}]};
 const project=shallowRef({documentId:1,revision:1,bones:[bone],slots:[],animations:[clip],animationFps:30,animationChannels:['translate','rotate','scale','shear'],sceneEditing:true}),before=structuredClone(project.value),edits=[],scope=effectScope();
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([1]),editorMode:ref('animate'),localBones:shallowRef([]),attachment:ref(null),edit:async edit=>{edits.push(structuredClone(edit));return true;},notice:()=>{},changed:()=>{}}));
 try{
  w.resetAnimationState();w.copyAnimationKeys(ids);w.seekAnimation(0);await w.pasteAnimationKeys();
  const value=edits.at(-1);assert.equal(value.type,'setAnimationKeyBatch');for(const family of ['boneKeys','slotKeys','drawOrderKeys','deformKeys'])assert.equal(Math.min(...value[family].map(key=>key.frame)),0,family);
  const relative=Math.fround(.4)-Math.fround(.3);assert.equal(value.boneKeys[0].controls[0][0],relative);assert.equal(value.deformKeys[0].controls[0],relative);assert.equal(value.boneKeys[0].controls[0][1],1.2);assert.equal(value.deformKeys[0].dataPresent,true);
  w.animationFrame.value=.1+.2;w.animationPlaying.value=true;await w.pasteAnimationKeys();assert.equal(w.animationPlaying.value,false);for(const family of ['boneKeys','slotKeys','drawOrderKeys','deformKeys'])assert.equal(Math.min(...edits.at(-1)[family].map(key=>key.frame)),Math.fround(.3),family);
  assert.deepEqual(project.value,before);
 }finally{scope.stop();}
});
