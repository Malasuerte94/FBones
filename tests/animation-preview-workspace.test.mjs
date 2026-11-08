// Real production composable and sampling. These checks never author a native
// project and do not establish original editor timing or OS input behavior.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref,shallowRef} from 'vue';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';

function fixture({mode=2,index=0,delay=.125,keyFrame=0,duration=0,sequence=true,events=[]}={}){
 const region={image:'gem',imagePath:'',name:'gem',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},settings={start:7,count:3,digits:1,setupIndex:1};
 const source={documentId:1,logicalDocumentId:41,revision:1,bones:[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:20}],slots:[{id:7,name:'Own slot',bone:0,visible:true,region,imageAvailable:true,activeAttachmentId:10,attachments:[{id:10,slot:7,name:'gem',type:'region',region,mesh:null,clipping:null,imageAvailable:true,sequence:settings,sequenceAvailableFrames:[0,1,2]}]}],constraints:[],animationFps:24,animationChannels:['translate','rotate','scale','shear'],animations:[{id:1,name:'Own preview',duration,tracks:[],sequenceTracks:sequence?[{slot:7,attachment:10,keys:[{id:91,frame:keyFrame,mode,index,delay}]}]:[],eventTracks:events}]};
 const project=shallowRef(source),before=structuredClone(source),scope=effectScope(),notices=[],fired=[];
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([0]),editorMode:ref('animate'),localBones:shallowRef([]),attachment:ref(10),edit:async()=>{throw Error('Preview cannot author');},notice:(message,error)=>notices.push({message,error}),changed(){},fireEvents:events=>fired.push(...events.map(event=>event.key.id))}));w.resetAnimationState();w.animationAutoKey.value=false;
 return{w,project,before,notices,fired,stageBone(){w.boneAnimationEdit({...w.animationBones.value[0],type:'update',x:11},w.animationBones.value);},close(){scope.stop();}};
}

test('single Loop key0 plays a full automatic cycle without changing its stored zero duration or project',()=>{
 const e=fixture();try{
  const {w}=e;assert.equal(w.animationStoredDuration.value,0);assert.equal(w.animationPreviewEnd.value,9);assert.equal(w.animationDuration.value,9);
  assert.equal(w.sequencePoses.value[0].image,'gem7');w.playAnimation();assert.equal(w.animationPlaying.value,true);w.advanceAnimation(.125);assert.equal(w.animationFrame.value,3);assert.equal(w.sequencePoses.value[0].image,'gem8');w.advanceAnimation(.25);assert.equal(w.animationFrame.value,0);assert.equal(w.sequencePoses.value[0].image,'gem7');assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});

test('Once preview includes the remaining images and final hold, with nonrepeat stopping at the derived end',()=>{
 const e=fixture({mode:1,index:1});try{
  const {w}=e;assert.equal(w.animationDuration.value,6);w.animationLoop.value=false;w.playAnimation();w.advanceAnimation(.25);assert.equal(w.animationPlaying.value,false);assert.equal(w.animationFrame.value,6);assert.equal(w.sequencePoses.value[0].index,2);assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});

test('a final running Sequence at a nonzero stored last key gets a transient tail too',()=>{
 const e=fixture({keyFrame:10,duration:10});try{const{w}=e;assert.equal(w.animationStoredDuration.value,10);assert.equal(w.animationDuration.value,19);w.seekAnimation(10);w.playAnimation();w.advanceAnimation(.25);assert.equal(w.animationFrame.value,16);assert.equal(w.sequencePoses.value[0].index,2);assert.deepEqual(e.project.value,e.before);}finally{e.close();}
});

test('explicit loop endpoints override automatic preview and clearing them restores the automatic end',()=>{
 const e=fixture();try{const{w}=e;w.setAnimationLoopRange({start:1,end:4});assert.equal(w.animationPreviewEnd.value,4);assert.equal(w.animationDuration.value,4);w.playAnimation();assert.equal(w.animationFrame.value,1);w.advanceAnimation(.125);assert.equal(w.animationFrame.value,1);w.setAnimationLoopRange({start:null,end:null});assert.equal(w.animationPlaying.value,false);assert.equal(w.animationPreviewEnd.value,9);assert.deepEqual(e.project.value,e.before);}finally{e.close();}
});

test('budget-rejected automatic Play preserves all working intent and keeps huge ends out of the ruler',async()=>{
 const e=fixture({delay:1e10});try{
  const{w}=e;e.stageBone();await w.setSequenceAnimationFields(10,{mode:0,index:2,delay:.125});const bone=structuredClone(w.animationDraft.value),sequence=structuredClone([...w.sequenceDraft.value]);assert(w.animationPreviewEnd.value>1_000_000);assert.equal(w.animationPreviewExceedsBudget.value,true);assert.equal(w.animationDuration.value,0);
  w.playAnimation();assert.equal(w.animationPlaying.value,false);assert.deepEqual(w.animationDraft.value,bone);assert.deepEqual([...w.sequenceDraft.value],sequence);assert.match(e.notices[0].message,/explicit Loop End/);
  w.setAnimationLoopRange({start:0,end:12});w.playAnimation();assert.equal(w.animationPlaying.value,true);assert.equal(w.animationPreviewEnd.value,12);assert.equal(w.animationDraft.value,null);assert.equal(w.sequenceDraft.value.size,0);assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});

test('zero extent and initial event-budget rejection are no-ops for unkeyed pose values',()=>{
 for(const excessive of [false,true]){const events=excessive?[{event:1,keys:Array.from({length:4097},(_,id)=>({id,frame:0,int:0,float:0,string:'',volume:1,balance:0}))}]:[];const e=fixture({sequence:false,duration:excessive?1:0,events});try{e.stageBone();const before=structuredClone(e.w.animationDraft.value);e.w.playAnimation();assert.equal(e.w.animationPlaying.value,false);assert.deepEqual(e.w.animationDraft.value,before);assert.deepEqual(e.project.value,e.before);assert.equal(e.notices.length,excessive?1:0);}finally{e.close();}}
});

test('stored f32 duration recovery allows the terminal fractional event to fire before nonrepeat stops',()=>{
 const events=[{event:1,keys:[{id:9,frame:.3,int:0,float:0,string:'end',volume:1,balance:0}]}],e=fixture({sequence:false,duration:.3,events});try{const{w}=e;w.animationLoop.value=false;assert.equal(w.animationDuration.value,Math.fround(.3));w.playAnimation();w.advanceAnimation(.1);assert.equal(w.animationPlaying.value,false);assert.equal(w.animationFrame.value,Math.fround(.3));assert.deepEqual(e.fired,[9]);assert.deepEqual(e.project.value,e.before);}finally{e.close();}
});
