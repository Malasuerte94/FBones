import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref,shallowRef} from 'vue';
import {batchField,batchFieldValue,sameBatchValue} from '../src/domain/constraintBatch.ts';
import {useConstraintAnimationWorkspace} from '../src/composables/useConstraintAnimationWorkspace.ts';

function fixture(){
 const physics=Array.from({length:5},(_,i)=>({id:i+1,order:i,type:'physics',name:'Own Physics '+i,bone:i,x:1,y:1,rotate:i?0:null,scaleX:0,shearX:0,limit:5000,step:1/60,inertia:1,strength:50,damping:.8,mass:1,wind:i,gravity:i,mix:1,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}));
 const transforms=[7,8].map((id,i)=>({id,order:id,type:'transform',name:'Own Transform '+id,source:0,bones:[i+1],localSource:false,localTarget:false,additive:false,clamp:false,offsets:[0,0,-0,0,0,0],mix:[i+.1,i+.2,i+.3,i+.4,i+.5,i+.6],properties:[]}));
 const source={documentId:1,revision:9,constraints:[...physics,...transforms]},project=shallowRef(source),before=structuredClone(source),active=shallowRef({id:3,name:'Own cohort',duration:30,tracks:[],constraintTracks:physics.map((c,i)=>({channel:'physics',constraint:c.id,property:'gravity',keys:[{id:100+i,frame:12,value:i,curve:i%2?'stepped':'linear'}]}))});
 const autoKey=ref(true),mode=ref('animate'),frame=ref(12),version=ref(0),edits=[],notices=[],scope=effectScope();
 const w=scope.run(()=>useConstraintAnimationWorkspace({project,active,frame,mode,autoKey,version,edit:async(edit,expectedRevision)=>{edits.push({edit,expectedRevision});return true;},pause(){},notice:message=>notices.push(message)}));
 return{w,source,before,autoKey,mode,project,edits,notices,close(){scope.stop();}};
}

test('batch wire allows only scalar/flag cells and retains nullable and signed f32 distinctions',()=>{
 assert.equal(batchField('physics','gravity',12),'physics.gravity');
 assert.equal(batchField('physics','global:gravity',true),'physics.global:gravity');
 assert.equal(batchField('transform','mix:5',.4),'transform.mix:5');
 for(const [kind,key,value]of[['physics','name',1],['physics','global:gravity',1],['ik','mix',true],['physics','gravity',Infinity],['transform','mix:6',.2],['ik','target',0]])assert.equal(batchField(kind,key,value),null);
 assert(sameBatchValue(.1,Math.fround(.1)));assert(!sameBatchValue(-0,0));assert(!sameBatchValue(null,0));
 const e=fixture();try{assert.equal(batchFieldValue(e.source.constraints[0],'rotate'),null);assert(Object.is(batchFieldValue(e.source.constraints[5],'offset:2'),-0));}finally{e.close();}
});

test('five Auto Key-off drafts publish together; rejected cohorts leave every draft and Setup intact',async()=>{
 const e=fixture();try{
  e.autoKey.value=false;
  assert(await e.w.setConstraintAnimationFieldBatch([1,2,3,4,5],'gravity',17.25,9));
  assert.equal(e.w.constraintDraft.value.size,5);assert.equal(e.edits.length,0);
  assert.deepEqual([1,2,3,4,5].map(id=>e.w.animationConstraint(id).gravity),Array(5).fill(17.25));
  const drafts=structuredClone([...e.w.constraintDraft.value]);
  for(const [ids,key,value,revision]of[[[1,2,3,4,5],'mass',0,9],[[1,2,7],'gravity',20,9],[[1,1],'gravity',20,9],[[1,2],'x',1,9],[[1,2],'gravity',20,8]])assert.equal(await e.w.setConstraintAnimationFieldBatch(ids,key,value,revision),false);
  assert.deepEqual([...e.w.constraintDraft.value],drafts);assert.equal(e.edits.length,0);assert.deepEqual(e.source,e.before);
 }finally{e.close();}
});

test('Auto Key produces one native edit for all five fields while preserving each own curve',async()=>{
 const e=fixture();try{
  assert(await e.w.setConstraintAnimationFieldBatch([1,2,3,4,5],'gravity',22.5,9));
  assert.equal(e.edits.length,1);const {edit,expectedRevision}=e.edits[0];assert.equal(expectedRevision,9);assert.equal(edit.type,'setAnimationConstraintKeys');assert.equal(edit.keys.length,5);
  assert.deepEqual(edit.keys.map(k=>[k.constraint,k.property,k.value,k.curve]),[1,2,3,4,5].map((id,i)=>[id,'gravity',22.5,i%2?'stepped':'linear']));assert.deepEqual(e.source,e.before);
  assert(await e.w.setConstraintAnimationFieldBatch([1,2,3,4,5],'wind',-0,9));assert(e.edits[1].edit.keys.every(k=>Object.is(k.value,-0)));
 }finally{e.close();}
});

test('Transform group changes only the requested mix axis on each independent pose',async()=>{
 const e=fixture();try{
  assert(await e.w.setConstraintAnimationFieldBatch([7,8],'mix:0',.625,9));assert.equal(e.edits.length,1);
  const keys=e.edits[0].edit.keys;assert.equal(keys.length,2);
  for(const [i,key]of keys.entries())assert.deepEqual(key.values,[.625,...e.before.constraints[5+i].mix.slice(1)]);
  assert.deepEqual(e.source,e.before);
  assert.equal(await e.w.setConstraintAnimationFieldBatch([7,8],'offset:0',2,9),false);assert.equal(e.edits.length,1);
 }finally{e.close();}
});

test('manual group keys commit all draft properties once, or only one chosen Physics row',async()=>{
 const e=fixture();try{
  e.autoKey.value=false;await e.w.setConstraintAnimationFieldBatch([1,2,3,4,5],'gravity',19.5,9);
  assert(await e.w.insertConstraintAnimationKeysBatch({constraintIds:[1,2,3,4,5],kind:'physics'}));assert.equal(e.edits.length,1);assert.equal(e.edits[0].edit.keys.length,35);
  assert(e.edits[0].edit.keys.filter(k=>k.property==='gravity').every(k=>k.value===19.5));
  assert(await e.w.insertConstraintAnimationKeysBatch({constraintIds:[1,2,3,4,5],kind:'physics',property:'gravity'}));assert.equal(e.edits.length,2);assert.equal(e.edits[1].edit.keys.length,5);
  assert.equal(await e.w.insertConstraintAnimationKeysBatch({constraintIds:[1,7],kind:'physics'}),false);assert.equal(e.edits.length,2);assert.deepEqual(e.source,e.before);
 }finally{e.close();}
});
