import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoneFieldCommitter} from '../src/domain/boneFields.ts';

const bone={id:4,parent:0,name:'arm',x:2,y:3,rotation:20,length:50,scaleX:1,scaleY:1,shearX:0,shearY:0};
function fixture(edit,{relative=false}={}){
 const state={bone:{...bone},documentId:7,revision:12,canEdit:true},draft={...bone},errors=[];
 return {state,draft,errors,commit:createBoneFieldCommitter({draft,current:()=>state,invalidMessage:()=> 'Invalid value',setError:m=>errors.push(m),failureMessage:()=> 'Native rejected',edit,relative})};
}
test('numeric Vue model values commit synchronously and Enter/blur reentry shares one edit',async()=>{
 let calls=0,finish,editor,reentered;
 editor=fixture((edit,revision)=>{calls++;assert.equal(edit.scaleX,1.25);assert.equal(edit.shearY,0);assert.equal(revision,12);reentered=editor.commit('scaleX');return new Promise(r=>{finish=r;});});
 editor.draft.scaleX=1.25;
 const operation=editor.commit('scaleX');
 assert.equal(calls,1,'Save observes the edit immediately');assert.equal(operation,reentered);assert.equal(operation,editor.commit('scaleX'));finish(true);assert.equal(await operation,true);
});
test('compensated numeric position rounds only the addressed axis and shares the pending edit',async()=>{
 let finish,reentered;
 const edits=[];
 const editor=fixture((edit,revision)=>{
  edits.push({edit,revision});
  reentered=editor.commit('x');
  return new Promise(resolve=>{finish=resolve;});
 });
 editor.state.parentPosition=true;
 editor.state.translationCompensation={bones:true,images:false};
 editor.state.bone.y=-0;
 editor.draft.x=2+2**-30;
 assert.equal(await editor.commit('x'),true);
 assert.deepEqual(edits,[]);

 editor.draft.x='3.3333333333';
 const operation=editor.commit('x');
 assert.equal(operation,reentered);
 assert.deepEqual(edits,[{edit:{type:'setBoneParentPosition',id:bone.id,x:Math.fround(3.3333333333),compensateBones:true},revision:12}]);
 finish(true);
 assert.equal(await operation,true);
});
test('World position keeps a sub-f32 edit on one axis and ignores a late failure after leaving World',async()=>{
 let finish,reentered;
 const edits=[];
 const editor=fixture((edit,revision)=>{
  edits.push({edit,revision});
  reentered=editor.commit('x');
  return new Promise(resolve=>{finish=resolve;});
 });
 const displayed=500000.001953125,requested=500000.00390625;
 assert.equal(Math.fround(displayed),Math.fround(requested));
 editor.state.worldPosition={x:displayed,y:16.00123456789};
 editor.state.translationCompensation={bones:false,images:true};
 editor.draft.x=String(displayed);
 assert.equal(await editor.commit('x'),true);
 assert.deepEqual(edits,[]);

 editor.draft.x=String(requested);
 const operation=editor.commit('x');
 assert.equal(operation,reentered);
 assert.deepEqual(edits,[{edit:{type:'setBoneWorldPosition',id:bone.id,axis:'x',position:requested,compensateImages:true},revision:12}]);
 editor.state.worldPosition=undefined;
 editor.state.parentPosition=true;
 finish(false);
 assert.equal(await operation,false);
 assert.equal(editor.errors.at(-1),'');
});
test('Local position preserves one projected f64 axis and discards unchanged text',async()=>{
 let finish,reentered;
 const edits=[];
 const editor=fixture((edit,revision)=>{
  edits.push({edit,revision});
  reentered=editor.commit('y');
  return new Promise(resolve=>{finish=resolve;});
 });
 const original=500000.001953125,requested=500000.00390625;
 assert.equal(Math.fround(original),Math.fround(requested));
 editor.state.localPosition={x:-3.3123456789,y:original};
 editor.state.translationCompensation={bones:true,images:false};
 editor.draft.y='500000.0019531250';
 assert.equal(await editor.commit('y'),true);
 assert.equal(editor.draft.y,String(original));
 assert.deepEqual(edits,[]);

 editor.draft.y=String(requested);
 const operation=editor.commit('y');
 assert.equal(operation,reentered);
 assert.deepEqual(edits,[{edit:{type:'setBoneLocalPosition',id:bone.id,y:requested,compensateBones:true},revision:12}]);
 finish(true);
 assert.equal(await operation,true);
});
test('World rotation restores the canonical heading for a wrapped no-op and sends precise edits once',async()=>{
 let finish,reentered;
 const edits=[];
 const editor=fixture((edit,revision)=>{
  edits.push({edit,revision});
  reentered=editor.commit('rotation');
  return new Promise(resolve=>{finish=resolve;});
 });
 const angle=12.12500001;
 editor.state.worldRotation=12.125;
 editor.state.affineCompensation={mode:'rotate',layers:{bones:true,images:false}};
 editor.draft.rotation='372.125';
 assert.equal(await editor.commit('rotation'),true);
 assert.equal(editor.draft.rotation,'12.125');
 assert.deepEqual(edits,[]);

 editor.draft.rotation=String(angle);
 const operation=editor.commit('rotation');
 assert.equal(operation,reentered);
 assert.deepEqual(edits,[{edit:{type:'setBoneWorldRotation',id:bone.id,angle,compensateBones:true},revision:12}]);
 finish(true);
 assert.equal(await operation,true);
});
test('blank/nonfinite drafts block native writes and retain the validation error',async()=>{
 let calls=0;const editor=fixture(async()=>{calls++;return true;});
 for(const value of['','  ','not a number',Infinity]){editor.draft.x=value;assert.equal(await editor.commit('x'),false);assert.equal(editor.errors.at(-1),'Invalid value');}
 assert.equal(calls,0);
 editor.draft.x=2;assert.equal(await editor.commit('x'),true);assert.equal(calls,0);assert.equal(editor.errors.at(-1),'');
});
test('failed field edits report errors only for the same live bone and document',async()=>{
 let finish;const editor=fixture(()=>new Promise(r=>{finish=r;}));editor.draft.rotation=45;
 const operation=editor.commit('rotation');editor.state.documentId=8;editor.state.bone={...bone};finish(false);assert.equal(await operation,false);assert.equal(editor.errors.at(-1),'');
 const rejected=fixture(async()=>false);rejected.draft.x=20;assert.equal(await rejected.commit('x'),false);assert.equal(rejected.errors.at(-1),'Native rejected');
 const thrown=fixture(()=>{throw Error('native transport failed');});thrown.draft.y=5;assert.equal(await thrown.commit('y'),false);assert.equal(thrown.errors.at(-1),'native transport failed');
});
test('name edits use the same committer and preserve all transform channels',async()=>{
 let saved;const editor=fixture(async(edit)=>{saved=edit;return true;});editor.draft.name='Braț principal';assert.equal(await editor.commit('name'),true);assert.deepEqual(saved,{...bone,name:'Braț principal',type:'update'});
});

test('relative bone entry resolves authored channels and preserves absolute negative numbers',async()=>{
 const edits=[];
 const editor=fixture(async edit=>{edits.push(edit);return true;},{relative:true});
 editor.state.bone.scaleX=-1.25;
 for(const [field,text,value] of [
  ['x',' +-30 ',-28],
  ['y','*-2.5e-1',-.75],
  ['rotation','-30',-30],
  ['scaleX','/+2',-.625],
 ]){
  editor.draft[field]=text;
  assert.equal(await editor.commit(field),true);
  assert.deepEqual(edits.at(-1),{...editor.state.bone,[field]:value,type:'update'});
 }
 const plain=fixture(async edit=>{edits.push(edit);return true;});
 plain.draft.rotation='+360';
 assert.equal(await plain.commit('rotation'),true);
 assert.equal(edits.at(-1).rotation,360);
});

test('relative numeric entry uses the active projected axis at full precision',async()=>{
 const edits=[];
 const editor=fixture(async (edit,revision)=>{edits.push({edit,revision});return true;},{relative:true});
 const baseline=500000.001953125,offset=1.953125e-3,requested=baseline+offset;
 assert.equal(Math.fround(baseline),Math.fround(requested));
 editor.state.localPosition={x:-15,y:baseline};
 editor.draft.y='+1.953125e-3';
 assert.equal(await editor.commit('y'),true);
 editor.state.localPosition=undefined;
 editor.state.worldPosition={x:baseline,y:8};
 editor.draft.x='+1.953125e-3';
 assert.equal(await editor.commit('x'),true);
 editor.state.worldRotation=350.25;
 editor.draft.rotation='+25.5';
 assert.equal(await editor.commit('rotation'),true);
 assert.deepEqual(edits,[
  {edit:{type:'setBoneLocalPosition',id:bone.id,y:requested},revision:12},
  {edit:{type:'setBoneWorldPosition',id:bone.id,axis:'x',position:requested},revision:12},
  {edit:{type:'setBoneWorldRotation',id:bone.id,angle:15.75},revision:12},
 ]);
});

test('a relative Rotate draft is consumed once when committing synchronously updates the working pose',async()=>{
 const edits=[];
 let editor,reentered;
 editor=fixture(async (edit,revision)=>{
  edits.push({angle:edit.rotation,revision});
  editor.state.bone={...editor.state.bone,rotation:edit.rotation};
  if(edits.length===1)reentered=editor.commit('rotation');
  return true;
 },{relative:true});
 editor.draft.rotation='+360';
 assert.equal(await editor.commit('rotation'),true);
 assert.equal(await reentered,true);
 assert.equal(await editor.commit('rotation'),true);
 assert.deepEqual(edits,[{angle:380,revision:12}]);
 assert.equal(editor.draft.rotation,'380');

 editor.draft.rotation='+360';
 assert.equal(await editor.commit('rotation'),true);
 assert.deepEqual(edits,[{angle:380,revision:12},{angle:740,revision:12}]);
});

test('invalid relative syntax, division by signed zero, and nonfinite arithmetic keep the draft',async()=>{
 let calls=0;
 const editor=fixture(async()=>{calls++;return true;},{relative:true});
 for(const text of ['++2','+=2','* 2','2*3','/0','/-0','*1e309','*1e308']){
  editor.draft.x=text;
  assert.equal(await editor.commit('x'),false,text);
  assert.equal(editor.draft.x,text);
  assert.equal(editor.errors.at(-1),'Invalid value');
 }
 assert.equal(calls,0);
});
