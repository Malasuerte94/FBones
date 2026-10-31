import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoneFieldCommitter} from '../src/domain/boneFields.ts';

const bone={id:4,parent:0,name:'arm',x:2,y:3,rotation:20,length:50,scaleX:1,scaleY:1,shearX:0,shearY:0};
function fixture(edit){
 const state={bone:{...bone},documentId:7,revision:12,canEdit:true},draft={...bone},errors=[];
 return {state,draft,errors,commit:createBoneFieldCommitter({draft,current:()=>state,invalidMessage:()=> 'Invalid value',setError:m=>errors.push(m),failureMessage:()=> 'Native rejected',edit})};
}
test('numeric Vue model values commit synchronously and Enter/blur reentry shares one edit',async()=>{
 let calls=0,finish,editor,reentered;
 editor=fixture((edit,revision)=>{calls++;assert.equal(edit.scaleX,1.25);assert.equal(edit.shearY,0);assert.equal(revision,12);reentered=editor.commit('scaleX');return new Promise(r=>{finish=r;});});
 editor.draft.scaleX=1.25;
 const operation=editor.commit('scaleX');
 assert.equal(calls,1,'Save observes the edit immediately');assert.equal(operation,reentered);assert.equal(operation,editor.commit('scaleX'));finish(true);assert.equal(await operation,true);
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
