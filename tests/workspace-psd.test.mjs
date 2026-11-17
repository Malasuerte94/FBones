import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createPinia,setActivePinia,disposePinia} from 'pinia';
import {draftSummary} from '../src/domain/project.ts';

globalThis.document={title:''};
let pinia,calls,invoke;
globalThis.__TAURI__={core:{invoke:async(command,args)=>{calls.push({command,args});return invoke(command,args);}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const source=()=>({...draftSummary('Own PSD'),documentId:21,logicalDocumentId:21,revision:3,sceneEditing:true,dirty:false,bones:[...draftSummary('').bones,{id:7,parent:0,name:'target',x:30,y:10,rotation:45,length:20}],constraints:[],animations:[],imageRoot:'./images/'});
function imported(model){
 const region={image:'layer',name:'layer',x:23,y:-17,rotation:0,scaleX:1,scaleY:1,width:10,height:20};
 const attachment={id:17,slot:12,name:'layer',type:'region',region,mesh:null,clipping:null,imageAvailable:true};
 return {...model,revision:model.revision+1,dirty:true,canUndo:true,editedSlot:12,editedAttachment:17,slots:[...model.slots,{id:12,name:'layer',bone:7,visible:true,blend:'normal',region,imageAvailable:true,attachments:[attachment],activeAttachmentId:17}]};
}
beforeEach(()=>{pinia=createPinia();setActivePinia(pinia);calls=[];invoke=async()=>{throw Error('Unexpected native call');};});
afterEach(()=>disposePinia(pinia));
function workspace(){const w=useWorkspace();w.project=source();w.pauseSimulation();w.selectBone(7);return w;}

test('PSD imports once into the selected bone, publishes native order/positions and selects the new attachment',async()=>{
 const w=workspace(),before=w.project;invoke=async command=>{assert.equal(command,'import_psd');return imported(before);};
 assert.equal(await w.importPsd(),true);
 assert.deepEqual(calls,[{command:'import_psd',args:{bone:7,expectedRevision:3}}]);
 assert.equal(w.project.revision,4);assert.equal(w.project.canUndo,true);assert.equal(w.selectedAttachmentId,17);assert.deepEqual(w.selectedSlotIds,[12]);
 assert.deepEqual(w.project.slots[0].region,{image:'layer',name:'layer',x:23,y:-17,rotation:0,scaleX:1,scaleY:1,width:10,height:20});
 assert.equal(w.editMode,'images');assert.equal(w.simulationIntent,false);assert.equal(w.busy,false);assert.equal(w.editing,false);
});

test('PSD waits for a valid field commit and captures its resulting revision',async()=>{
 const w=workspace();let release;invoke=async(command)=>{if(command==='edit_rig')return new Promise(resolve=>{release=()=>resolve({...w.project,revision:4});;});if(command==='import_psd')return imported(w.project);throw Error(command);};
 const field=w.editRig({type:'update',id:7,fields:{x:40}});await settle();
 const pending=w.importPsd();await settle();assert.equal(calls.some(c=>c.command==='import_psd'),false);
 release();await field;assert.equal(await pending,true);assert.equal(calls.at(-1).args.expectedRevision,4);
});

test('PSD blocks invalid drafts and unsupported editor contexts before opening the picker',async()=>{
 for(const change of [w=>w.inspectorError='Invalid X',w=>w.animationKeyError='Invalid key',w=>w.attachmentColorError='Invalid opacity',w=>w.editorMode='animate',w=>w.project={...w.project,inspectionOnly:true},w=>w.project={...w.project,sceneEditing:false},w=>w.newDialog=true,w=>w.discardDialog=true,w=>w.traceOpen=true]){
  const w=workspace();change(w);assert.equal(w.canImportPsd&&w.editorMode==='animate',false);assert.equal(await w.importPsd(),false);
 }
 assert.equal(calls.length,0);
});

test('PSD cancellation and unsupported input errors preserve document and selection',async()=>{
 for(const fail of [false,true]){
  const w=workspace(),before=w.project;invoke=async()=>{if(fail)throw Error('Unsupported PSD: groups. Rasterize the layers first.');return null;};
  assert.equal(await w.importPsd(),false);assert.equal(w.project,before);assert.equal(w.selectedId,7);assert.equal(w.selectedAttachmentId,null);assert.equal(w.busy,false);assert.equal(w.editing,false);
  if(fail){assert.match(w.notice,/Unsupported PSD/);assert.equal(w.noticeError,true);}
 }
});

test('PSD rejects duplicate requests and late replies for a replaced document',async()=>{
 const w=workspace(),before=w.project;let release;invoke=async()=>new Promise(resolve=>{release=resolve;});
 const first=w.importPsd();await settle();assert.equal(w.canImportPsd,false);assert.equal(await w.importPsd(),false);assert.equal(calls.length,1);
 const replacement={...source(),documentId:22,logicalDocumentId:22,name:'Replacement'};w.project=replacement;release(imported(before));
 assert.equal(await first,false);assert.equal(w.project,replacement);assert.equal(w.selectedAttachmentId,null);assert.equal(w.busy,false);
});

test('PSD keeps a newer revision when an obsolete same-document reply arrives',async()=>{
 const w=workspace(),before=w.project;let release;invoke=async()=>new Promise(resolve=>{release=resolve;});
 const pending=w.importPsd();await settle();const newer={...before,revision:8};w.project=newer;release(imported(before));
 assert.equal(await pending,false);assert.equal(w.project,newer);assert.equal(w.selectedAttachmentId,null);
});


test('PSD stops after a failed pending field instead of importing with its old revision',async()=>{
 const w=workspace();let reject;invoke=async command=>{assert.equal(command,'edit_rig');return new Promise((_,fail)=>{reject=fail;});};
 const field=w.editRig({type:'update',id:7,fields:{x:40}});await settle();const pending=w.importPsd();await settle();reject(Error('Field rejected'));
 assert.equal(await field,false);assert.equal(await pending,false);assert.equal(calls.length,1);assert.equal(w.project.revision,3);assert.equal(w.notice,'Field rejected');
});

test('PSD uses the selected slot owner independently of the last selected bone',async()=>{
 const w=workspace();w.project=imported(w.project);w.selectBone(0);w.selectSlot(12);const before=w.project;invoke=async()=>imported(before);
 assert.equal(await w.importPsd(),true);assert.equal(calls[0].args.bone,7);
});
