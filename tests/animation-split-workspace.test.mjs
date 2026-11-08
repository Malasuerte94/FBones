// Actual production sampling/composables with collecting or explicitly arranged
// replies. These checks are not native persistence, browser input or GPU proof.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref,shallowRef} from 'vue';
import {animationBoneChannels,animationChannelDimensions,animationFamilyChannels,keyValues,sampleAnimation} from '../src/domain/animation.ts';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';
import {draftSummary} from '../src/domain/project.ts';

const copy=value=>structuredClone(value);
// A staged update may carry its collecting transport discriminator. Retention
// restores BoneView fields; that discriminator is not an authored pose field.
const bonePose=e=>copy(e.w.animationBones.value.map(({type:_,...b})=>b));
const bone=(id,parent,more={})=>({id,parent,name:'Own bone '+id,x:10*id,y:20*id,length:20,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0,...more});
const key=(id,frame,value,curve='linear',controls)=>({id,frame,values:Array.isArray(value)?value:[value,0],curve,...(controls?{controls}:{})});
function source(){
 return{...draftSummary('Own split-axis fixture'),sceneEditing:true,documentId:11,logicalDocumentId:31,revision:1,
  bones:[bone(0,null),bone(1,0),bone(2,0,{scaleX:2,scaleY:0}),bone(3,0,{scaleX:0,scaleY:-2})],
  animationChannels:['rotate','translate','scale','shear','translateX','translateY','scaleX','scaleY'],animationFps:24,
  animations:[{id:1,name:'Own asymmetric clip',duration:24,tracks:[
   {bone:0,channel:'translate',keys:[key(1,0,[1,2]),key(2,24,[25,50])]},
   {bone:1,channel:'translateX',keys:[key(3,0,2,'bezier',[[3,4,9,10],[0,0,0,0]]),key(4,12,14)]},
   {bone:1,channel:'translateY',keys:[key(5,4,5,'stepped'),key(6,18,20)]},
   {bone:2,channel:'scaleX',keys:[key(7,6,1),key(8,20,2)]},
   {bone:2,channel:'scaleY',keys:[key(9,2,.25),key(10,20,.75)]},
   {bone:3,channel:'scaleX',keys:[key(11,0,1),key(12,20,2)]},
   {bone:3,channel:'scaleY',keys:[key(13,0,1),key(14,20,-1)]},
  ]}]};
}
function fixture(partial=false){
 const scope=effectScope(),initial=source();
 if(partial){initial.animations[0].tracks=initial.animations[0].tracks.filter(t=>t.channel!=='translateY');initial.animations[0].splitModes=[{bone:1,mode:1},{bone:2,mode:2},{bone:3,mode:2}];}
 const project=shallowRef(initial),selected=ref([1]),mode=ref('animate'),edits=[],notices=[];
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:selected,editorMode:mode,localBones:shallowRef(project.value.bones),attachment:ref(null),edit:async edit=>{edits.push(copy(edit));return true;},notice:(message,error)=>notices.push({message,error}),changed(){}}));
 w.selectAnimation(1);w.seekAnimation(partial?31:8);w.animationAutoKey.value=false;
 return{w,project,selected,edits,notices,close:()=>scope.stop()};
}
function stage(e,id,fields){return e.w.boneAnimationEdit({type:'update',...e.w.animationBones.value.find(b=>b.id===id),...fields},e.w.animationBones.value);}
function nextWithScalar(e,channel,frame,value){
 const next=copy(e.project.value);next.revision++;
 let track=next.animations[0].tracks.find(t=>t.bone===1&&t.channel===channel);
 // Explicitly arranged first-Y reply; this fixture is not a persistence engine.
 if(!track){track={bone:1,channel,keys:[]};next.animations[0].tracks.push(track);}
 track.keys.push(key(99,frame,value));track.keys.sort((a,b)=>a.frame-b.frame);return next;
}

test('scalar samplers retain the untouched axis and own first/last times, including zero/negative scale',()=>{
 const p=source(),before=copy(p),clip=p.animations[0];
 assert.equal(animationChannelDimensions('translateY'),1);assert.equal(animationChannelDimensions('shear'),2);
 assert.deepEqual(animationFamilyChannels(['translateX','translateY'],'translate'),['translateX','translateY']);
 assert.deepEqual(animationBoneChannels(clip,1),['rotate','translateX','translateY','scale','shear']);
 const at0=sampleAnimation(p.bones,clip,0),at3=sampleAnimation(p.bones,clip,3),at8=sampleAnimation(p.bones,clip,8),at100=sampleAnimation(p.bones,clip,100);
 assert.equal(at0[1].x,12);assert.equal(at0[1].y,20);assert.equal(at3[1].y,20);assert.equal(at8[1].y,25);
 assert.equal(at100[1].x,24);assert.equal(at100[1].y,40);
 assert.equal(at3[2].scaleX,2);assert.equal(at3[2].scaleY,0);assert.equal(at100[2].scaleX,4);assert.equal(at100[2].scaleY,0);
 assert.equal(at0[3].scaleX,0);assert.equal(at0[3].scaleY,-2);assert.equal(at100[3].scaleY,2);
 assert.deepEqual(p,before,'sampling never authors Setup, modes or keys');
});

test('relative Scale uses only the addressed axis denominator',()=>{
 const p=source();assert.deepEqual(keyValues(p.bones[2],{...p.bones[2],scaleX:-6},'scaleX'),[-3,0]);
 assert.deepEqual(keyValues(p.bones[3],{...p.bones[3],scaleY:6},'scaleY'),[-3,0]);
 assert.throws(()=>keyValues(p.bones[2],p.bones[2],'scaleY'),/zero Setup scale on Y/);
 assert.throws(()=>keyValues(p.bones[3],p.bones[3],'scaleX'),/zero Setup scale on X/);
});

test('manual family keys mix combined and split representations in one command; axis row keys only itself',async()=>{
 const e=fixture();try{
  e.selected.value=[0,1];await e.w.insertAnimationKeys('translate');
  assert.deepEqual(e.edits[0].keys.map(k=>[k.bone,k.channel]),[[0,'translate'],[1,'translateX'],[1,'translateY']]);
  assert.equal(e.edits[0].type,'setAnimationKeys');
  e.selected.value=[1];await e.w.insertAnimationKeys('translateY');assert.deepEqual(e.edits[1].keys.map(k=>k.channel),['translateY']);
  e.selected.value=[0,1];await e.w.insertAnimationKeys('translateX');assert.equal(e.edits.length,2,'incompatible mixed scalar request is atomic before transport');assert.match(e.notices.at(-1).message,/existing separated channel/);
 }finally{e.close();}
});

test('dirty K and Auto Key route only changed scalar fields despite all eight capabilities',async()=>{
 const e=fixture();try{
  stage(e,1,{x:71});await e.w.keyAnimationChanges('rotate');assert.deepEqual(e.edits[0].keys.map(k=>[k.channel,k.values]),[['translateX',[61,0]]]);
  e.w.clearAnimationDraft();e.w.animationAutoKey.value=true;
  const y=stage(e,1,{y:81});assert.deepEqual(y.keys.map(k=>[k.channel,k.values]),[['translateY',[61,0]]]);
  const both=stage(e,1,{x:71,y:81});assert.deepEqual(both.keys.map(k=>k.channel),['translateX','translateY']);
  e.selected.value=[2];const scale=stage(e,2,{scaleX:-6});assert.deepEqual(scale.keys.map(k=>[k.channel,k.values]),[['scaleX',[-3,0]]]);
  e.selected.value=[3];const negative=stage(e,3,{scaleY:6});assert.deepEqual(negative.keys.map(k=>[k.channel,k.values]),[['scaleY',[-3,0]]]);
 }finally{e.close();}
});

test('manual keys on zero Setup report the addressed failure without consuming the working pose',async()=>{
 const e=fixture();try{
  e.selected.value=[2];await e.w.insertAnimationKeys('scaleX');assert.equal(e.edits.length,1);
  const pose=copy(e.w.animationBones.value);await e.w.insertAnimationKeys('scale');assert.equal(e.edits.length,1);assert.match(e.notices.at(-1).message,/zero Setup scale on Y/);assert.deepEqual(bonePose(e),pose);
 }finally{e.close();}
});

test('scalar Graph projection, numeric/curve edits and clipboard never expose or offset a padded axis',async()=>{
 const e=fixture();try{
  const track=e.w.animationTracks.value.find(t=>t.channel==='translateX');assert.equal(track.keys[0].values.length,1);assert.equal(track.keys[0].controls.length,1);
  e.w.copyAnimationKeys([3]);e.w.seekAnimation(2);await e.w.pasteAnimationKeys();const pasted=e.edits.at(-1).keys[0];assert.equal(pasted.channel,'translateX');assert.deepEqual(pasted.controls,[[5,4,11,10],[0,0,0,0]]);
  await e.w.updateAnimationKey({id:5,values:[17]});assert.deepEqual(e.edits.at(-1).values,[17,0]);assert.equal(e.edits.at(-1).channel,'translateY');
  await e.w.setAnimationInterpolation({ids:[5],interpolation:'bezier'});const bezier=e.edits.at(-1).keys[0];assert.equal(bezier.channel,'translateY');assert.deepEqual(bezier.controls[1],[0,0,0,0]);
  const count=e.edits.length;await e.w.updateAnimationBezier({id:3,component:1,control:0,frame:3,value:4});assert.equal(e.edits.length,count);assert.match(e.notices.at(-1).message,/component/);
 }finally{e.close();}
});

test('a scalar publication consumes only its addressed intent and retains sibling/newer clean reverts',()=>{
 for(const newer of [false,true]){const e=fixture();try{
  stage(e,1,{x:71,y:81});
  const command={type:'setAnimationKeys',animation:1,keys:[{bone:1,channel:'translateX',frame:8,values:[61,0],curve:'linear'}]};
  const publish=e.w.prepareAnimationDraftCommit(command),next=nextWithScalar(e,'translateX',8,61);
  if(newer)stage(e,1,{x:sampleAnimation(e.project.value.bones,e.project.value.animations[0],8)[1].x});
  const before=copy(e.w.animationBones.value[1]);assert.equal(publish(()=>{e.project.value=next;}),true);
  const pose=e.w.animationBones.value[1];assert.equal(pose.y,81);assert.equal(pose.x,newer?before.x:71);
  assert.equal(next.animations[0].tracks.find(t=>t.channel==='translateY').keys.some(k=>k.frame===8),false);
 }finally{e.close();}}
});

test('Save and validated resource publication preserve independent scalar intent; scalar/mode mutation cannot masquerade as refresh',()=>{
 const e=fixture();try{
  stage(e,1,{x:71,y:81});const pose=bonePose(e);
  const save=e.w.prepareAnimationSave(),saved=copy(e.project.value);saved.revision++;assert.equal(save(()=>{e.project.value=saved;}),true);assert.deepEqual(bonePose(e),pose);
  const refresh=e.w.prepareAnimationResourceUpdate(),next=copy(e.project.value);next.revision++;next.documentId++;
  assert.equal(refresh(next,()=>{e.project.value=next;}),true);assert.deepEqual(bonePose(e),pose);
  for(const mutate of [p=>{p.animations[0].tracks[1].keys[0].values[0]++;},p=>{p.animations[0].splitModes=[{bone:1,mode:2}];}]){
   const reject=e.w.prepareAnimationResourceUpdate(),bad=copy(e.project.value);bad.revision++;bad.documentId++;mutate(bad);assert.equal(reject(bad,()=>{throw Error('must not publish');}),false);assert.deepEqual(bonePose(e),pose);
  }
 }finally{e.close();}
});

test('X-only mode keeps Setup Y at every sampled frame and exposes the existing split family without fabricating Y',()=>{
 const e=fixture(true);try{
  const before=copy(e.project.value);
  for(const frame of [0,3,8,12,31,100])assert.equal(sampleAnimation(e.project.value.bones,e.project.value.animations[0],frame)[1].y,20);
  assert.deepEqual(animationBoneChannels(e.project.value.animations[0],1),['rotate','translateX','translateY','scale','shear']);
  assert.equal(e.w.animationTracks.value.some(t=>t.channel==='translateY'),false);
  assert.deepEqual(e.project.value,before);assert.deepEqual(e.edits,[]);
 }finally{e.close();}
});

test('first Y manual key, family Key, dirty K and Auto Key use their intended axis on an X-only mode',async()=>{
 const e=fixture(true);try{
  await e.w.insertAnimationKeys('translateY');assert.deepEqual(e.edits.at(-1).keys.map(k=>[k.channel,k.values,k.frame]),[['translateY',[0,0],31]]);
  await e.w.insertAnimationKeys('translate');assert.deepEqual(e.edits.at(-1).keys.map(k=>k.channel),['translateX','translateY']);
  stage(e,1,{y:81});await e.w.keyAnimationChanges('rotate');assert.deepEqual(e.edits.at(-1).keys.map(k=>[k.channel,k.values]),[['translateY',[61,0]]]);
  e.w.clearAnimationDraft();e.w.animationAutoKey.value=true;const command=stage(e,1,{y:81});assert.deepEqual(command.keys.map(k=>[k.channel,k.values]),[['translateY',[61,0]]]);
  assert.equal(e.project.value.animations[0].tracks.some(t=>t.channel==='translateY'),false,'collecting commands do not invent a native result');
 }finally{e.close();}
});

test('X publication retains a missing-Y working intent and first-Y publication retains X without consuming either sibling',()=>{
 for(const channel of ['translateX','translateY']){const e=fixture(true);try{
  stage(e,1,{x:71,y:81});const value=61;
  const command={type:'setAnimationKeys',animation:1,keys:[{bone:1,channel,frame:31,values:[value,0],curve:'linear'}]},publish=e.w.prepareAnimationDraftCommit(command),next=nextWithScalar(e,channel,31,value);
  assert.equal(publish(()=>{e.project.value=next;}),true);assert.equal(e.w.animationBones.value[1].x,71);assert.equal(e.w.animationBones.value[1].y,81);
  assert.deepEqual(next.animations[0].splitModes,[{bone:1,mode:1},{bone:2,mode:2},{bone:3,mode:2}]);
  if(channel==='translateX')assert.equal(next.animations[0].tracks.some(t=>t.channel==='translateY'),false);
  else assert.equal(next.animations[0].tracks.find(t=>t.channel==='translateX').keys.some(k=>k.frame===31),false);
 }finally{e.close();}}
});

test('a pending first-Y reply preserves a newer explicit revert to the old clean Setup Y',()=>{
 const e=fixture(true);try{
  stage(e,1,{y:81});const command={type:'setAnimationKeys',animation:1,keys:[{bone:1,channel:'translateY',frame:31,values:[61,0],curve:'linear'}]},publish=e.w.prepareAnimationDraftCommit(command),next=nextWithScalar(e,'translateY',31,61);
  stage(e,1,{y:20});assert.equal(publish(()=>{e.project.value=next;}),true);
  assert.equal(e.project.value.animations[0].tracks.find(t=>t.channel==='translateY').keys[0].values[0],61);assert.equal(e.w.animationBones.value[1].y,20,'newer clean revert survives first-track publication');
 }finally{e.close();}
});

test('a first-Y reply does not resurrect incidental clean Setup Y from a newer full X draft',()=>{
 const e=fixture(true);try{
  const command={type:'setAnimationKeys',animation:1,keys:[{bone:1,channel:'translateY',frame:31,values:[61,0],curve:'linear'}]},publish=e.w.prepareAnimationDraftCommit(command),next=nextWithScalar(e,'translateY',31,61);
  stage(e,1,{x:71});assert.equal(e.w.animationBones.value[1].y,20);assert.equal(publish(()=>{e.project.value=next;}),true);
  assert.equal(e.w.animationBones.value[1].x,71);assert.equal(e.w.animationBones.value[1].y,81,'untouched Y follows the new native first key');
 }finally{e.close();}
});

test('last-Y deletion follows Setup for an incidental Y field but retains an intentionally dirty Y',()=>{
 for(const dirty of [false,true]){const e=fixture();try{
  stage(e,1,{x:71,...(dirty?{y:81}:{})});const oldY=e.project.value.animations[0].tracks.find(t=>t.channel==='translateY'),command={type:'deleteAnimationKeys',animation:1,keys:oldY.keys.map(k=>k.id)},publish=e.w.prepareAnimationDraftCommit(command),next=copy(e.project.value);
  next.revision++;next.animations[0].tracks=next.animations[0].tracks.filter(t=>t.channel!=='translateY');assert.equal(publish(()=>{e.project.value=next;}),true);
  assert.equal(e.w.animationBones.value[1].x,71);assert.equal(e.w.animationBones.value[1].y,dirty?81:20);assert.equal(e.project.value.animations[0].tracks.some(t=>t.channel==='translateY'),false);
 }finally{e.close();}}
});

test('first-Y publication respects seek/discard epochs and stale document/revision ownership',()=>{
 for(const transition of ['seek','discard','revision','document']){const e=fixture(true);try{
  stage(e,1,{x:71,y:81});const command={type:'setAnimationKeys',animation:1,keys:[{bone:1,channel:'translateY',frame:31,values:[61,0],curve:'linear'}]},publish=e.w.prepareAnimationDraftCommit(command),next=nextWithScalar(e,'translateY',31,61);
  if(transition==='seek'){e.w.seekAnimation(30);e.w.seekAnimation(31);}else if(transition==='discard')e.w.clearAnimationDraft();else e.project.value={...e.project.value,...(transition==='revision'?{revision:2}:{documentId:12})};
  const before=copy(e.project.value);const accepted=publish(()=>{e.project.value=next;});
  if(transition==='revision'||transition==='document'){assert.equal(accepted,false);assert.deepEqual(e.project.value,before);}
  else{assert.equal(accepted,true);assert.equal(e.w.animationBones.value[1].x,24);assert.equal(e.w.animationBones.value[1].y,81);}
 }finally{e.close();}}
});

test('missing-Y drafts survive Save and verified refresh without becoming an authored timeline',()=>{
 const e=fixture(true);try{
  stage(e,1,{x:71,y:81});const expected=bonePose(e),before=copy(e.project.value.animations);
  const save=e.w.prepareAnimationSave(),next=copy(e.project.value);next.revision++;assert.equal(save(()=>{e.project.value=next;}),true);assert.deepEqual(bonePose(e),expected);assert.deepEqual(e.project.value.animations,before);
  const refresh=e.w.prepareAnimationResourceUpdate(),resources=copy(e.project.value);resources.documentId++;resources.revision++;assert.equal(refresh(resources,()=>{e.project.value=resources;}),true);assert.deepEqual(bonePose(e),expected);assert.deepEqual(e.project.value.animations,before);
  assert.equal(e.project.value.animations[0].tracks.some(t=>t.channel==='translateY'),false);
 }finally{e.close();}
});
