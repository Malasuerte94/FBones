import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSceneFieldCommitter} from '../src/domain/sceneFields.ts';
function fixture(edit){
 const state={id:5,documentId:9,revision:21,editable:true,values:{name:'spring',rotate:null,damping:15,from:3.7}},draft={name:'spring',rotate:'0',damping:'15',from:'3.7'},errors=[];
 return{state,draft,errors,commit:createSceneFieldCommitter({draft,current:()=>state,numeric:key=>key!=='name',invalidMessage:()=> 'Invalid number',error:message=>errors.push(message),failure:()=> 'Native rejected',edit})};
}
test('Scene Enter/change blur reentry starts synchronously and shares one history transaction',async()=>{
 let calls=0,finish,editor,reentered;
 editor=fixture((key,value,revision)=>{calls++;assert.equal(key,'damping');assert.equal(value,20);assert.equal(revision,21);reentered=editor.commit(key);return new Promise(resolve=>{finish=resolve;});});
 editor.draft.damping=20;const operation=editor.commit('damping');assert.equal(calls,1);assert.equal(operation,reentered);assert.equal(operation,editor.commit('damping'));finish(true);assert.equal(await operation,true);
});
test('Default physics null angular sentinel displays zero without rewriting it; finite validation guards Save',async()=>{
 let calls=0;const editor=fixture(async()=>{calls++;return true;});assert.equal(await editor.commit('rotate'),true);assert.equal(calls,0);
 for(const value of ['', '  ', 'NaN', 'Infinity']){editor.draft.damping=value;assert.equal(await editor.commit('damping'),false);assert.equal(editor.errors.at(-1),'Invalid number');}
 assert.equal(calls,0);editor.draft.damping='15';assert.equal(await editor.commit('damping'),true);assert.equal(editor.errors.at(-1),'');
});
test('Failed scene field does not contaminate a newly selected attachment or project',async()=>{
 let finish;const editor=fixture(()=>new Promise(resolve=>{finish=resolve;}));editor.draft.from='4';const pending=editor.commit('from');editor.state.id=6;finish(false);assert.equal(await pending,false);assert.equal(editor.errors.at(-1),'');
 const failed=fixture(async()=>false);failed.draft.name='new';assert.equal(await failed.commit('name'),false);assert.equal(failed.errors.at(-1),'Native rejected');
 const thrown=fixture(()=>{throw Error('transport');});thrown.draft.name='new';assert.equal(await thrown.commit('name'),false);assert.equal(thrown.errors.at(-1),'transport');
});
test('Inspection-only and unknown fields cannot dispatch mutations',async()=>{let calls=0;const editor=fixture(async()=>{calls++;return true;});editor.state.editable=false;editor.draft.name='new';assert.equal(await editor.commit('name'),false);editor.state.editable=true;assert.equal(await editor.commit('missing'),false);assert.equal(calls,0);});

test('An unrelated valid field cannot clear another invalid staged field',async()=>{
 const editor=fixture(async()=>true);editor.draft.damping='';assert.equal(await editor.commit('damping'),false);
 editor.draft.from='4';assert.equal(await editor.commit('from'),true);assert.equal(editor.errors.at(-1),'Invalid number');
 editor.draft.damping='15';assert.equal(await editor.commit('damping'),true);assert.equal(editor.errors.at(-1),'');
});
