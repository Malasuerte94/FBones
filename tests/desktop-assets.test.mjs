import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { draftSummary } from '../src/domain/project.ts';
globalThis.document={title:''};
let calls=[],failure=false;
const initial={...draftSummary('assets'),revision:8,bones:[...draftSummary('assets').bones,{id:7,parent:0,name:'arm',x:20,y:30,rotation:0,length:50}],
 library:{root:'./images/',warnings:[],images:[{key:'arm',width:32,height:24},{key:'parts/hand',width:16,height:16}]}};
globalThis.__TAURI__={core:{async invoke(command,args){
 calls.push([command,args]);
 if(command==='get_project')return initial;
 if(command==='place_images'||command==='place_image'){
  if(failure)throw new Error('Project changed');
  return {...initial,revision:9,editedSlot:3,slots:[{id:3,name:'hand',bone:7,visible:true,imageAvailable:true,region:null}]};
 }
 throw new Error(`Unexpected command ${command}`);
}},window:{getCurrentWindow:()=>({async setTitle(){}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const api=await import('../src/services/desktop.ts');
test('asset batch uses one revision-checked RPC under the selected bone and retains the dragged selection',async()=>{
 setActivePinia(createPinia());const w=useWorkspace();await w.initialize();w.selectBone(7);
 w.selectLibraryImage('arm',['arm','parts/hand']);w.selectLibraryImage('parts/hand',['arm','parts/hand'],{toggle:true});
 assert.equal(await w.placeImages([...w.librarySelectedKeys],100,-50),true);
 assert.deepEqual(calls.filter(([command])=>command==='place_images'),[['place_images',{keys:['arm','parts/hand'],bone:7,x:100,y:-50,expectedRevision:8}]]);
 assert.deepEqual(w.librarySelectedKeys,['arm','parts/hand']);assert.equal(w.project.revision,9);
 // The new slot is selected after placement; it must not hide the retained
 // destination bone on another drag of the unchanged asset selection.
 assert.equal(w.selectedBone,null);assert.equal(w.selectedId,7);
 assert.equal(await w.placeImages([...w.librarySelectedKeys],200,-75),true);
 assert.deepEqual(calls.filter(([command])=>command==='place_images').at(-1),['place_images',{keys:['arm','parts/hand'],bone:7,x:200,y:-75,expectedRevision:9}]);
 assert.equal(await w.placeImages(['arm'],10,20,0),true);
 assert.deepEqual(calls.filter(([command])=>command==='place_images').at(-1),['place_images',{keys:['arm'],bone:0,x:10,y:20,expectedRevision:9}]);
 assert.equal(w.selectedId,0);assert.deepEqual(w.selectedIds,[0]);
 assert.deepEqual(w.librarySelectedKeys,['arm','parts/hand']);
 const before=w.project;failure=true;
 assert.equal(await w.placeImages(['arm'],0,0,7),false);assert.equal(w.project,before);
 assert.deepEqual(w.librarySelectedKeys,['arm','parts/hand']);assert.equal(w.notice,'Project changed');
 failure=false;await api.placeImage('arm',7,0,0,9);
 assert.deepEqual(calls.at(-1),['place_image',{key:'arm',bone:7,x:0,y:0,expectedRevision:9}]);
});
