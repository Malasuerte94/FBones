// Production Sequence/animation composables with explicit typed reply fixtures.
// These checks prove routing/projection/draft behavior, not native encoding or pixels.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref,shallowRef,nextTick} from 'vue';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const bone={id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:20,scaleX:1,scaleY:1,shearX:0,shearY:0},settings={start:7,count:3,digits:2,setupIndex:1};
 const region={name:'region',image:'frames/foo',imagePath:'frames/foo',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},mesh={weighted:false,bones:[0],vertices:[[0,0],[30,0],[0,20]].map(positions=>({weights:[1],positions})),uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3};
 const attachments=[{id:9,slot:7,name:'region',type:'region',region,mesh:null,clipping:null,imageAvailable:true,sequence:settings,sequenceAvailableFrames:[0,1,2]},{id:10,slot:7,name:'mesh',type:'mesh',region:{...region,name:'mesh',image:'mesh',imagePath:''},mesh,clipping:null,imageAvailable:true,sequence:{...settings},sequenceAvailableFrames:[0,1,2]}];
 const source={documentId:1,revision:1,bones:[bone],slots:[{id:7,name:'slot',bone:0,visible:true,region,mesh:null,activeAttachmentId:9,attachments,imageAvailable:true}],constraints:[],animations:[{id:1,name:'Own Sequence',duration:30,tracks:[{bone:0,channel:'translate',keys:[{id:11,frame:.3,values:[1,0],curve:'linear'}]}],sequenceTracks:[{slot:7,attachment:9,keys:[{id:91,frame:.3,mode:0,index:0,delay:.037037037},{id:92,frame:12,mode:2,index:1,delay:.125}]}]},{id:2,name:'Own copy target',duration:0,tracks:[]}],animationFps:30,animationChannels:['translate','rotate','scale','shear'],sceneEditing:true};
 const project=shallowRef(source),before=clone(source),mode=ref('setup'),scope=effectScope(),edits=[],notices=[];let w,reply='success';
 const edit=async command=>{edits.push(clone(command));if(reply==='fail'){reply='success';return false;}const publish=w.prepareAnimationDraftCommit(command),next=clone(project.value),clip=next.animations.find(a=>a.id===command.animation);const keys=command.type==='setAnimationSequenceKeys'?command.keys:command.type==='setAnimationKeyBatch'?command.sequenceKeys??[]:[];for(const key of keys){clip.sequenceTracks??=[];let track=clip.sequenceTracks.find(t=>t.attachment===key.attachment);if(!track){track={attachment:key.attachment,slot:7,keys:[]};clip.sequenceTracks.push(track);}const old=track.keys.find(k=>k.frame===key.frame),value={id:old?.id??1000+track.keys.length,frame:key.frame,mode:key.mode,index:key.index,delay:key.delay};if(old)Object.assign(old,value);else track.keys.push(value);track.keys.sort((a,b)=>a.frame-b.frame);}next.revision++;publish(()=>{project.value=next;});return true;};
 w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([0]),editorMode:mode,localBones:shallowRef([]),attachment:ref(9),edit,notice:message=>notices.push(message),changed(){}}));w.resetAnimationState();
 return{w,mode,project,before,edits,notices,async animate(){mode.value='animate';await nextTick();},failNext(){reply='fail';},close(){scope.stop();}};
}

test('Sequence projection handles Setup and animated active/inactive images without changing paths bounds Mesh geometry or activation',async()=>{
 const e=fixture();try{
  assert.equal(e.w.sequenceSlots.value[0].region.image,'frames/foo08');assert.equal(e.w.sequenceSlots.value[0].attachments[1].region.image,'mesh08');await e.animate();e.w.seekAnimation(16.5);assert.equal(e.w.sequenceSlots.value[0].region.image,'frames/foo09');assert.equal(e.w.sequenceSlots.value[0].activeAttachmentId,9);assert.deepEqual(e.w.sequenceSlots.value[0].attachments[1].mesh,e.before.slots[0].attachments[1].mesh);assert.equal(e.w.sequenceSlots.value[0].region.width,32);assert.equal(e.w.sequenceSlots.value[0].region.imagePath,'frames/foo');assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});

test('manual and Auto Key Sequence commands consume their working state and preserve unrelated bone drafts',async()=>{
 const e=fixture();try{
  await e.animate();e.w.seekAnimation(15);e.w.animationAutoKey.value=false;e.w.boneAnimationEdit({...e.w.animationBones.value[0],x:11,type:'update'},e.w.animationBones.value);assert.equal(await e.w.setSequenceAnimationFields(9,{mode:0,index:2,delay:.25}),true);assert.equal(e.edits.length,0);assert.equal(e.w.sequenceSlots.value[0].region.image,'frames/foo09');await e.w.insertSequenceAnimationKey(9);assert.equal(e.edits.length,1);assert.deepEqual(e.edits[0],{type:'setAnimationSequenceKeys',animation:1,keys:[{attachment:9,frame:15,mode:0,index:2,delay:.25}]});assert.equal(e.w.sequenceDraft.value.size,0);assert.equal(e.w.animationBones.value[0].x,11);
  e.w.animationAutoKey.value=true;assert.equal(await e.w.setSequenceAnimationFields(9,{mode:1,index:0,delay:.125}),true);assert.equal(e.edits.length,2);assert.equal(e.w.sequenceSlots.value[0].region.image,'frames/foo07');assert.equal(e.w.animationBones.value[0].x,11);assert.deepEqual(e.project.value.bones,e.before.bones);assert.deepEqual(e.project.value.slots,e.before.slots);
 }finally{e.close();}
});

test('mixed bone and Sequence clipboard has one f32 origin and retains discrete payloads across another clip',async()=>{
 const e=fixture();try{
  await e.animate();e.w.copyAnimationKeys([11,91]);e.w.selectAnimation(2);e.w.seekAnimation(5);await e.w.pasteAnimationKeys();assert.equal(e.edits.length,1);assert.equal(e.edits[0].type,'setAnimationKeyBatch');assert.equal(e.edits[0].boneKeys[0].frame,5);assert.deepEqual(e.edits[0].sequenceKeys,[{attachment:9,frame:5,mode:0,index:0,delay:.037037037}]);assert.equal('keyId'in e.edits[0].sequenceKeys[0],false);assert.deepEqual(e.project.value.slots,e.before.slots);
 }finally{e.close();}
});

test('Sequence key updates are stable-ID addressed and invalid mode index or delay cannot send authoring commands',async()=>{
 const e=fixture();try{
  await e.animate();await e.w.updateSequenceAnimationKey({id:91,mode:0,index:2,delay:.25});assert.equal(e.edits[0].keys[0].keyId,91);assert.equal(e.edits[0].keys[0].frame,.3);assert.equal(e.project.value.animations[0].sequenceTracks[0].keys[0].id,91);
  const count=e.edits.length;for(const value of [{mode:3,index:0,delay:.1},{mode:0,index:3,delay:.1},{mode:0,index:0,delay:0}])assert.equal(await e.w.setSequenceAnimationFields(9,value),false);assert.equal(e.edits.length,count);assert.equal(e.notices.length,3);
 }finally{e.close();}
});

test('Sequence drafts survive Save publication and unrelated native edits but failure and a seek cannot consume or resurrect them',async()=>{
 const e=fixture();try{
  await e.animate();e.w.seekAnimation(15);e.w.animationAutoKey.value=false;await e.w.setSequenceAnimationFields(9,{mode:0,index:2,delay:.25});const before=clone([...e.w.sequenceDraft.value]);await e.w.insertAnimationKeys('rotate');assert.deepEqual(clone([...e.w.sequenceDraft.value]),before,'unrelated bone-key publication retains Sequence intent');const publish=e.w.prepareAnimationSave(),saved=clone(e.project.value);saved.revision++;publish(()=>{e.project.value=saved;});assert.deepEqual(clone([...e.w.sequenceDraft.value]),before);e.failNext();await e.w.insertSequenceAnimationKey(9);assert.deepEqual(clone([...e.w.sequenceDraft.value]),before);
  const stale=e.w.prepareAnimationDraftCommit({type:'setAnimationSequenceKeys',animation:1,keys:[{attachment:9,frame:15,mode:0,index:2,delay:.25}]}),next=clone(e.project.value);next.revision++;e.w.seekAnimation(16);e.w.seekAnimation(15);stale(()=>{e.project.value=next;});assert.equal(e.w.sequenceDraft.value.size,0);
 }finally{e.close();}
});
