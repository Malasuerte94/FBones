// Actual Pinia lifecycle and updater controller, with command transport replies
// injected at the native boundary. This proves guard/routing, not OS installation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPinia,disposePinia} from 'pinia';
import {nextTick,toRaw} from 'vue';
let invoke=async command=>{throw Error('Unexpected native command '+command);};
globalThis.document={title:'',activeElement:null,querySelectorAll:()=>[],querySelector:()=>null};
globalThis.HTMLInputElement=class{constructor(onBlur){this.onBlur=onBlur;}blur(){document.activeElement=null;this.onBlur?.();}};
globalThis.HTMLTextAreaElement=class extends HTMLInputElement{};
globalThis.HTMLSelectElement=class extends HTMLInputElement{};
globalThis.__TAURI__={core:{invoke:(...args)=>invoke(...args)},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const {createAppUpdateController}=await import('../src/composables/useAppUpdater.ts');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const updateState=phase=>({phase,currentVersion:'0.9.5',version:'0.9.6',downloaded:20,total:20,error:null,supported:true});
function fixture(dirty=true){
 const pinia=createPinia(),w=useWorkspace(pinia),calls=[];
 w.project={...draftSummary('Own updater lifecycle'),documentId:44,logicalDocumentId:44,revision:9,dirty,canSave:true,canCopy:true,sceneEditing:true,constraints:[],animations:[]};
 w.pauseSimulation();
 const initial=structuredClone(toRaw(w.project));let saveReply=async()=>({...structuredClone(toRaw(w.project)),dirty:false,path:'own-updater.fbones'}),editReply=async()=>{throw Error('Unexpected own edit.');};
 invoke=async(command,args)=>{calls.push({command,args});if(command==='update_menu')return null;if(command==='save_project')return saveReply();if(command==='edit_rig')return editReply(args);if(command==='close_project')return null;throw Error('Unexpected native command '+command);};
 const controller=createAppUpdateController({beforeInstall:w.prepareForUpdate,expectedRevision:()=>w.project?.revision??null,transport:{invoke:async(command,args)=>{calls.push({command,args});return updateState(command==='install_app_update'?'installing':'ready');},listen:async()=>()=>{}},storage:{getItem:()=> 'false',setItem:()=>{}}});
 return{w,controller,calls,initial,setSave(fn){saveReply=fn;},setEdit(fn){editReply=fn;},close(){if(w.discardDialog)w.cancelDiscard();controller.dispose();disposePinia(pinia);document.activeElement=null;}};
}
const installs=e=>e.calls.filter(c=>c.command==='install_app_update');

test('actual workspace Cancel preserves the dirty project and never allows install/inert state',async()=>{
 const e=fixture();try{await e.controller.start();const pending=e.controller.install();await turn();assert.equal(e.w.discardDialog,true);assert.equal(e.controller.preparing.value,true);assert.equal(e.controller.installing.value,false);e.w.cancelDiscard();assert.equal(await pending,false);assert.deepEqual(e.w.project,e.initial);assert.equal(installs(e).length,0);}finally{e.close();}
});

test('actual workspace explicit Discard closes only after confirmation and passes a null revision to install',async()=>{
 const e=fixture();try{await e.controller.start();const pending=e.controller.install();await turn();assert.equal(e.w.discardDialog,true);assert.equal(e.controller.installing.value,false);await e.w.discardAndContinue();assert.equal(await pending,true);assert.equal(e.w.project,null);assert.deepEqual(e.calls.find(c=>c.command==='close_project').args,{discardChanges:true});assert.deepEqual(installs(e).map(c=>c.args),[{expectedRevision:null}]);}finally{e.close();}
});

test('actual workspace canceled/failed Save keeps the dirty modal usable and never installs',async()=>{
 for(const fail of [false,true]){
  const e=fixture();try{e.setSave(async()=>{if(fail)throw Error('Own save failure');return null;});await e.controller.start();const pending=e.controller.install();await turn();await e.w.saveAndContinue();assert.equal(e.w.discardDialog,true);assert.equal(e.controller.installing.value,false);assert.deepEqual(e.w.project,e.initial);assert.equal(installs(e).length,0);if(fail)assert.match(e.w.notice,/Own save failure/);e.w.cancelDiscard();assert.equal(await pending,false);}finally{e.close();}
 }
});

test('actual workspace invalid drafts and active geometry block installation without opening a discard prompt',async()=>{
 for(const error of ['inspectorError','animationKeyError','eventKeyError','sequenceFieldError','attachmentColorError']){
  const e=fixture(false);try{e.w[error]='Own invalid draft';await e.controller.start();assert.equal(await e.controller.install(),false);assert.equal(e.w.discardDialog,false);assert.equal(e.controller.installing.value,false);assert.equal(installs(e).length,0);assert.equal(e.w.notice,'Own invalid draft');}finally{e.close();}
 }
 const e=fixture(false);try{e.w.traceOpen=true;await e.controller.start();assert.equal(await e.controller.install(),false);assert.equal(installs(e).length,0);assert.match(e.w.notice,/geometry operation/);}finally{e.close();}
});

test('actual workspace blurs and awaits a focused field edit, then saves it before installing its resulting revision',async()=>{
 const e=fixture(false),editGate=deferred();try{
  e.setEdit(()=>editGate.promise);const root=e.w.project.bones[0];
  document.activeElement=new HTMLInputElement(()=>{void e.w.editRig({...root,type:'update',name:'Flushed own draft'});});
  await e.controller.start();const pending=e.controller.install();await turn();assert.equal(document.activeElement,null);assert.equal(e.w.busy,true);assert.equal(e.controller.installing.value,false);assert.equal(installs(e).length,0);
  editGate.resolve({...e.initial,revision:10,dirty:true,bones:e.initial.bones.map(b=>({...b,name:'Flushed own draft'}))});await turn();assert.equal(e.w.discardDialog,true);assert.equal(e.w.project.revision,10);assert.equal(e.controller.installing.value,false);
  await e.w.saveAndContinue();assert.equal(await pending,true);assert.equal(e.w.project.dirty,false);assert.equal(e.w.project.bones[0].name,'Flushed own draft');assert.deepEqual(installs(e).map(c=>c.args),[{expectedRevision:10}]);
  const order=e.calls.map(c=>c.command);assert(order.indexOf('edit_rig')<order.indexOf('save_project'));assert(order.indexOf('save_project')<order.indexOf('install_app_update'));
 }finally{e.close();}
});

test('actual workspace failed focused authoring edit aborts preparation and preserves the original project',async()=>{
 const e=fixture(false),editGate=deferred();try{
  e.setEdit(()=>editGate.promise);document.activeElement=new HTMLInputElement(()=>{void e.w.editRig({...e.w.project.bones[0],type:'update',name:'Rejected draft'});});
  await e.controller.start();const pending=e.controller.install();await turn();assert.equal(e.controller.installing.value,false);editGate.reject(Error('Own authoring failure'));assert.equal(await pending,false);assert.equal(installs(e).length,0);assert.deepEqual(e.w.project,e.initial);assert.match(e.w.notice,/Own authoring failure/);
 }finally{e.close();}
});
