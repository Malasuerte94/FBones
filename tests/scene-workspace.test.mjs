import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createPinia,setActivePinia} from 'pinia';
import {nextTick} from 'vue';
import {draftSummary} from '../src/domain/project.ts';
globalThis.document={title:''};
let model,calls,nextEditResult,nextEditNoop;
globalThis.__TAURI__={core:{invoke:async(command,args)=>{
  calls.push({command,args});
  if(command==='evaluate_project')return{revision:model.revision,documentId:model.documentId,poseEpoch:42,time:args.request.time,mode:args.request.mode,bones:model.bones.map(b=>({id:b.id,world:{x:10,y:0,a:1,b:0,c:0,d:1}}))};
  if(command==='edit_rig'){
    assert.equal(args.expectedRevision,model.revision);
    if(nextEditNoop){nextEditNoop=false;return model;}
    const edit=args.edit;
    if(nextEditResult){model=nextEditResult;nextEditResult=null;}
    if(edit.type==='setActiveAttachment')model={...model,slots:model.slots.map(s=>s.id===edit.slot?{...s,activeAttachmentId:edit.attachment,visible:edit.attachment!==null}:s)};
    model={...model,dirty:true,revision:model.revision+1,canUndo:true,editedSlot:0,editedAttachment:0};return model;
  }
  if(command==='preview_trace_attachment')return{attachmentId:args.id,slotId:0,...(args.poseEpoch===undefined?{}:{poseEpoch:args.poseEpoch}),expectedRevision:model.revision,mesh:{weighted:false,bones:[0],vertices:[],uvs:[],triangles:[],edges:[],hull:0},geometry:{}};
  throw Error(`Unexpected command: ${command}`);
}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const attachment=id=>({id,slot:0,name:`image${id}`,type:'region',region:{image:`image${id}`,name:`image${id}`,x:id*20,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:32},mesh:null,clipping:null,imageAvailable:true});
beforeEach(()=>{
  setActivePinia(createPinia());calls=[];nextEditResult=null;nextEditNoop=false;
  const attachments=[attachment(0),attachment(1)];
  model={...draftSummary('Scene'),documentId:42,sceneEditing:true,dirty:false,revision:5,constraints:[],editedAttachment:0,slots:[{id:0,name:'slot',bone:0,visible:true,blend:'normal',region:attachments[0].region,imageAvailable:true,attachments,activeAttachmentId:0}]};
});
test('inactive row selection and Ctrl/Shift ranges keep activation and persistence untouched',()=>{
  const w=useWorkspace();w.project=model;const before=JSON.stringify(model);
  w.selectAttachment(0);w.selectAttachment(1,{toggle:true});
  assert.deepEqual(w.selectedAttachmentIds,[0,1]);assert.equal(w.selectedAttachmentId,1);
  assert.equal(w.selectedAttachment.region.image,'image1');assert.equal(w.slots[0].activeAttachmentId,0);
  w.selectAttachment(0,{toggle:true});assert.deepEqual(w.selectedAttachmentIds,[1]);
  w.selectAttachment(0,{shift:true,ordered:[0,1]});assert.deepEqual(w.selectedAttachmentIds,[0,1]);
  assert.equal(JSON.stringify(model),before);assert.equal(calls.length,0);
  w.treeFilters.attachment=false;assert.equal(w.selectedAttachmentId,0);
});
test('paperclip activates/clears without selecting another inspected row',async()=>{
  const w=useWorkspace();w.project=model;w.selectAttachment(1);
  assert.equal(await w.toggleAttachment(0,0),true);
  assert.equal(w.slots[0].activeAttachmentId,null);assert.equal(w.selectedAttachmentId,1);
  assert.equal(await w.toggleAttachment(0,0),true);
  assert.equal(w.slots[0].activeAttachmentId,0);assert.equal(w.selectedAttachmentId,1);
  assert.equal(calls.filter(c=>c.command==='edit_rig').length,2);
});
test('inactive geometry edits target stable attachment while preview never replaces active pixels',async()=>{
  const w=useWorkspace();w.project=model;w.selectAttachment(1);
  assert.equal(await w.editRig({type:'convertMesh',id:0}),true);
  assert.deepEqual(calls.find(c=>c.command==='edit_rig').args.edit,{type:'attachmentEdit',id:1,edit:{type:'convertMesh',id:0}});
  w.openTrace();await w.previewTrace();await nextTick();
  assert.equal(w.tracePreview.attachmentId,1);
  assert.equal(w.viewSlots[0].mesh,undefined,'active A never renders preview for inactive B');
  assert.equal(w.viewSlots[0].attachments[0].mesh,null,'active inventory remains unchanged');
  assert.ok(w.viewSlots[0].attachments[1].mesh,'inactive preview is available to inventory-based ghosts');
  assert.equal(model.slots[0].attachments[1].mesh,null,'trace preview never changes authored inventory');
  assert.ok(w.selectedAttachment.mesh);
  w.cancelTrace();
});
test('selection pruning respects document replacement, library selection and zero IDs',async()=>{
  const w=useWorkspace();w.project={...model,library:{root:'./images/',warnings:[],images:[{key:'a',width:32,height:32}]}};
  w.selectAttachment(0);assert.equal(w.selectedAttachmentId,0);
  w.selectLibraryImage('a',['a']);assert.equal(w.selectedAttachmentId,null);assert.equal(w.selectedSlotId,null);
  w.selectAttachment(1);
  w.project={...w.project,revision:6,slots:w.slots.map(s=>({...s,attachments:s.attachments.slice(0,1)}))};assert.equal(w.selectedAttachmentId,null);
  w.selectAttachment(0);w.project={...w.project,documentId:43};assert.deepEqual(w.selectedAttachmentIds,[]);
  await nextTick();
});
test('constraint geometry uses a frozen native epoch and never saves evaluated channels',async()=>{
  const w=useWorkspace();
  model={...model,constraints:[{id:31,order:0,name:'spring',type:'physics',bone:0,x:1,y:0,scaleX:0,rotate:null,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:1,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}]};
  w.project=model;w.selectAttachment(1);w.stepSimulation();const revision=w.project.revision;
  const snapshot=await w.freezePose();assert.equal(snapshot.poseEpoch,42);assert.equal(w.renderedBones[0].evaluatedWorld.x,10);assert.equal(w.project.bones[0].x,0);assert.equal(w.project.revision,revision);
  w.openTrace();await w.previewTrace();assert.equal(w.tracePreview.poseEpoch,42);w.cancelTrace();
  assert.equal(await w.editRig({type:'moveVertices',id:0,vertices:[{vertex:0,x:30,y:40}]}),true);
  const edit=calls.filter(c=>c.command==='edit_rig').at(-1);assert.equal(edit.args.poseEpoch,42);assert.equal(edit.args.edit.type,'attachmentEdit');assert.equal(w.project.bones[0].x,0);assert.equal(w.frozenPose,null);
});
test('moving an inspected attachment follows its new owner while preserving its stable selection and destination activation',async()=>{
  const w=useWorkspace(),a=attachment(0);w.project=model;w.selectAttachment(0);
  nextEditResult={...model,slots:[{...model.slots[0],attachments:[attachment(1)],activeAttachmentId:null,region:null,visible:false},{...model.slots[0],id:9,name:'destination',attachments:[{...a,slot:9}],activeAttachmentId:null,region:null,visible:false}]};
  assert.equal(await w.moveAttachment(0,9,5),true);
  assert.equal(w.selectedAttachmentId,0);assert.equal(w.selectedSlotId,9);assert.deepEqual(w.selectedSlotIds,[9]);assert.equal(w.selectedSlotRaw.name,'destination');assert.equal(w.slots[1].activeAttachmentId,null);
  assert.deepEqual(calls.find(c=>c.command==='edit_rig').args.edit,{type:'moveAttachment',id:0,slot:9});
});

function addInactiveClip(weighted=true){
 const clip={id:2,slot:0,name:'inactive clip',type:'clipping',region:null,mesh:null,imageAvailable:false,clipping:{endSlot:0,convex:false,inverse:false,color:0xcc88aaff,weighted,bones:weighted?[0,1]:[0],vertices:[[0,0],[40,0],[40,40],[0,40]].map(([x,y])=>({weights:weighted?[.6,.4]:[1],positions:weighted?[x,y,x-30,y]:[x,y]})),edges:[0,1,1,2,2,3,3,0]}};
 model={...model,bones:[...model.bones,{id:1,parent:0,name:'tip',x:30,y:0,rotation:0,length:40}],slots:model.slots.map(s=>({...s,attachments:[...s.attachments,clip]}))};
 return clip;
}
test('real clip binding target, bound influence and weights mode are independent from image projection and active pointer',()=>{
 const clip=addInactiveClip(),w=useWorkspace();w.project=model;w.selectAttachment(2);
 assert.equal(w.selectedBinding,clip.clipping);assert.equal(w.selectedSlot.mesh,null);
 assert.equal(w.chooseInfluence(1),true);assert.equal(w.influence,1);assert.equal(w.chooseInfluence(9),false);
 const before=JSON.stringify(model);w.setMode('weights');
 assert.equal(w.selectedAttachmentId,2);assert.equal(w.slots[0].activeAttachmentId,0);assert.equal(JSON.stringify(model),before);assert.equal(calls.length,0);
 w.selectAttachment(0);assert.equal(w.selectedBinding,null,'a region is not a binding target');
});
test('rigid clip owner is geometry membership but cannot be chosen as a bound influence',()=>{
 addInactiveClip(false);const w=useWorkspace();w.project=model;w.selectAttachment(2);
 assert.equal(w.selectedBinding.weighted,false);assert.equal(w.chooseInfluence(0),false);assert.equal(w.influence,null);assert.equal(calls.length,0);
});
test('all typed attachment weight edits carry the actual inactive clip ID and frozen epoch without image wrappers',async()=>{
 addInactiveClip();model={...model,constraints:[{id:31,order:0,name:'spring',type:'physics',bone:0,x:1,y:0,scaleX:0,rotate:null,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:1,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}]};
 const w=useWorkspace();w.project=model;w.selectAttachment(2);w.setMode('weights');w.selectedVertex=1;
 const commands=[{type:'bindAttachment',id:2,bones:[0,1]},{type:'setAttachmentWeight',id:2,vertex:1,bone:1,value:.3},{type:'paintAttachmentWeights',id:2,bone:1,changes:[{vertex:1,value:.4}]},{type:'autoAttachmentWeights',id:2},{type:'normalizeAttachmentWeights',id:2}];
 for(const command of commands){
  const revision=w.project.revision;assert.equal(await w.editRig(command),true);
  const native=calls.filter(c=>c.command==='edit_rig').at(-1);
  assert.deepEqual(native.args.edit,command);assert.equal(native.args.expectedRevision,revision);assert.equal(native.args.poseEpoch,42);
  assert.equal(w.selectedAttachmentId,2);assert.equal(w.selectedVertex,1);assert.equal(w.slots[0].activeAttachmentId,0);assert.equal(w.frozenPose,null);
 }
 assert.equal(calls.filter(c=>c.command==='evaluate_project').length,commands.length);
 assert.equal(w.project.bones[0].x,0,'evaluated physics is never authored by weights');
});
test('a rejected sole-influence reduction keeps its selected clip vertex even when native last focus was a bone',async()=>{
 addInactiveClip();model={...model,dirty:false,editedSlot:null,editedAttachment:null,editedVertex:null,editedBone:1};
 model.slots[0].attachments.find(a=>a.id===2).clipping.vertices.forEach(row=>{row.weights=[1,0];});
 const w=useWorkspace();w.project=model;w.selectAttachment(2);w.selectedVertex=1;const before=JSON.stringify(model);nextEditNoop=true;
 assert.equal(await w.editRig({type:'setAttachmentWeight',id:2,vertex:1,bone:0,value:.5}),true);
 assert.equal(JSON.stringify(w.project),before,'native no-op never dirties or changes revision/history');
 assert.equal(w.selectedAttachmentId,2);assert.equal(w.selectedVertex,1,'unrelated native focus must not erase current Direct vertex');
});
test('unchanged Normalize cannot import another attachment native vertex into the inspected clip',async()=>{
 addInactiveClip();const other=model.slots[0].attachments.find(a=>a.id===1);
 other.type='mesh';other.mesh={weighted:false,bones:[0],vertices:[[0,0],[40,0],[40,40],[0,40]].map(positions=>({weights:[1],positions})),uvs:[0,0,1,0,1,1,0,1],edges:[0,1,1,2,2,3,3,0],triangles:[0,1,2,0,2,3],hull:4};
 model={...model,dirty:false,editedSlot:0,editedAttachment:1,editedVertex:3};
 const w=useWorkspace();w.project=model;w.selectAttachment(2);w.selectedVertex=1;const before=JSON.stringify(model);nextEditNoop=true;
 assert.equal(await w.editRig({type:'normalizeAttachmentWeights',id:2}),true);
 assert.equal(JSON.stringify(w.project),before);assert.equal(w.selectedVertex,1);assert.equal(w.selectedAttachmentId,2);
});
test('unchanged Normalize also preserves Direct vertex against stale focus in the same attachment',async()=>{
 addInactiveClip();model={...model,dirty:false,editedSlot:0,editedAttachment:2,editedVertex:3};
 const w=useWorkspace();w.project=model;w.selectAttachment(2);w.selectedVertex=1;nextEditNoop=true;
 assert.equal(await w.editRig({type:'normalizeAttachmentWeights',id:2}),true);
 assert.equal(w.selectedVertex,1,'native last edited vertex is not current Direct selection');
});

test('Auto candidates and explicit vertices are independent from brush focus and pending Bind membership',()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectAttachment(2);const before=JSON.stringify(model);
 w.selectedVertex=1;assert.deepEqual(w.weightVertices,[]);assert.equal(w.weightActiveVertex,1);
 assert.deepEqual(w.weightAutoEdit,{type:'autoAttachmentWeights',id:2});
 w.chooseInfluence(1);assert.deepEqual(w.weightBones,[1]);assert.equal(w.influence,1);
 w.chooseInfluence(0,{toggle:true});assert.deepEqual(w.weightBones,[0,1]);
 w.chooseInfluence(1,{toggle:true});assert.deepEqual(w.weightBones,[0]);
 w.chooseInfluence(0,{shift:true});assert.deepEqual(w.weightBones,[0,1]);
 w.selectWeightVertices([2,0,2,99],2);assert.deepEqual(w.weightVertices,[0,2]);assert.equal(w.weightActiveVertex,2);
 assert.deepEqual(w.weightAutoEdit,{type:'autoAttachmentWeights',id:2,scope:{vertices:[0,2],bones:[0,1]}});
 w.clearWeightBones();assert.deepEqual(w.weightAutoEdit,{type:'autoAttachmentWeights',id:2,scope:{vertices:[0,2]}});
 w.clearWeightVertices();assert.deepEqual(w.weightAutoEdit,{type:'autoAttachmentWeights',id:2});
 assert.equal(JSON.stringify(model),before);assert.deepEqual(calls,[]);
});
test('weight selections survive attachment and tool switches but clear on new document and Escape keeps the binding',()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectAttachment(2);w.setMode('weights');
 w.chooseInfluence(1);w.selectWeightVertices([0,2],2);
 w.selectAttachment(0);assert.deepEqual(w.weightVertices,[]);assert.deepEqual(w.weightBones,[]);
 w.selectAttachment(2);assert.deepEqual(w.weightVertices,[0,2]);assert.equal(w.weightActiveVertex,2);assert.deepEqual(w.weightBones,[1]);
 w.setMode('images');w.setMode('weights');assert.deepEqual(w.weightVertices,[0,2]);
 w.escapeSelection();assert.equal(w.selectedAttachmentId,2);assert.equal(w.editMode,'weights');assert.deepEqual(w.weightVertices,[]);assert.deepEqual(w.weightBones,[1]);
 w.selectWeightVertices([1],1);w.project={...w.project,documentId:43};assert.deepEqual(w.weightVertices,[]);assert.deepEqual(w.weightBones,[]);
 assert.deepEqual(calls,[]);
});
test('topology count changes invalidate transient row indices without resurrecting them after undo-sized geometry',()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectAttachment(2);w.chooseInfluence(1);w.selectWeightVertices([1,3],3);
 const replace=count=>{w.project={...w.project,revision:w.project.revision+1,slots:w.slots.map(s=>({...s,attachments:s.attachments.map(a=>a.id===2?{...a,clipping:{...a.clipping,vertices:a.clipping.vertices.slice(0,count)}}:a)}))};};
 const original=w.project;replace(3);assert.deepEqual(w.weightVertices,[]);assert.deepEqual(w.weightBones,[1]);
 w.project={...original,revision:7};assert.deepEqual(w.weightVertices,[],'invalidated indices cannot silently revive');assert.deepEqual(w.weightBones,[1]);
});

test('weight locks are transient per binding and snapshots preserve their captured scope',()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectAttachment(2);
 const before=JSON.stringify(w.project);w.toggleWeightLock(0);w.toggleWeightLock(99);
 assert.deepEqual(w.weightLocks,[0]);assert.equal(JSON.stringify(w.project),before);assert.deepEqual(calls,[]);
 w.chooseInfluence(0);w.selectWeightVertices([1],1);const captured=w.weightAutoEdit;
 assert.deepEqual(captured,{type:'autoAttachmentWeights',id:2,scope:{vertices:[1],bones:[0],lockedBones:[0]}});
 w.toggleWeightLock(0);assert.deepEqual(w.weightLocks,[]);assert.deepEqual(captured.scope.lockedBones,[0]);
 w.toggleWeightLock(1);w.selectAttachment(0);assert.deepEqual(w.weightLocks,[]);
 w.selectAttachment(2);assert.deepEqual(w.weightLocks,[1]);
 w.project={...w.project,revision:6,dirty:false};assert.deepEqual(w.weightLocks,[1],'save-like updates retain session locks');
 w.project={...w.project,documentId:43};assert.deepEqual(w.weightLocks,[],'reopening creates a fresh lock session');
 assert.deepEqual(calls,[]);
});

test('changing binding membership clears transient weight locks without an authoring request',()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectAttachment(2);w.toggleWeightLock(0);
 w.project={...w.project,revision:6,slots:w.slots.map(s=>({...s,attachments:s.attachments.map(a=>a.id===2?{...a,clipping:{...a.clipping,bones:[0],weighted:false,vertices:a.clipping.vertices.map(v=>({weights:[1],positions:v.positions.slice(0,2)}))}}:a)}))};
 assert.deepEqual(w.weightLocks,[]);assert.deepEqual(calls,[]);
});

test('parent picking captures selected stable IDs and only a valid target authors one group command',async()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectBones([1],1);
 const before=JSON.stringify(w.project);assert.equal(await w.beginParentPick(),true);assert.equal(w.parentPicking,true);
 assert.equal(w.canPickParent(1),false);assert.equal(await w.chooseParent(1),false);assert.equal(w.parentPicking,true);assert.equal(JSON.stringify(w.project),before);assert.deepEqual(calls,[]);
 assert.equal(await w.chooseParent(0),true);assert.equal(w.parentPicking,false);
 assert.deepEqual(calls.filter(c=>c.command==='edit_rig').map(c=>c.args.edit),[{type:'reparentSelection',bones:[1],attachments:[],parent:0}]);
 w.selectSceneAttachments([0,1],1);assert.equal(await w.beginParentPick(),true);
 assert.equal(await w.chooseParent(1),true);assert.deepEqual(calls.filter(c=>c.command==='edit_rig').at(-1).args.edit,{type:'reparentSelection',bones:[],attachments:[0,1],parent:1});
 assert.deepEqual(w.selectedAttachmentIds,[0,1]);
});
test('Escape, changed selection and stale revision cancel parent picking without editing the project',async()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectBones([1],1);
 assert.equal(await w.beginParentPick(),true);w.escapeSelection();assert.equal(w.parentPicking,false);assert.deepEqual(w.selectedIds,[1]);
 assert.equal(await w.beginParentPick(),true);w.project={...w.project,revision:6};assert.equal(w.parentPicking,false);assert.equal(await w.chooseParent(0),false);
 assert.equal(await w.beginParentPick(),true);w.selectAttachment(2);assert.equal(w.parentPicking,false);
 assert.deepEqual(calls,[]);assert.equal(w.project.dirty,false);
});
test('a pinned constraint panel edits and removes its explicit stable target independently from Tree selection',async()=>{
 addInactiveClip();model={...model,constraints:[{id:31,order:0,type:'ik',name:'pinned IK',bones:[1],target:0,mix:.5,softness:0,bendPositive:true,compress:false,stretch:false},{id:32,order:1,type:'physics',name:'other',bone:1,x:1,y:0,scaleX:0,rotate:null,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}]};
 const w=useWorkspace();w.project=model;w.selectAttachment(2);
 assert.equal(await w.editConstraintById(31,{mix:.75},5),true);const first=calls.find(c=>c.command==='edit_rig');assert.equal(first.args.edit.type,'updateConstraint');assert.equal(first.args.edit.id,31);assert.equal(first.args.edit.constraint.mix,.75);assert.equal(w.selectedAttachmentId,2);assert.equal(w.selectedConstraintId,null);
 assert.equal(await w.removeConstraintById(32,6),true);assert.deepEqual(calls.filter(c=>c.command==='edit_rig').at(-1).args.edit,{type:'deleteConstraint',id:32});
 assert.equal(await w.editConstraintById(99,{name:'missing'}),false);assert.equal(await w.removeConstraintById(99),false);assert.equal(calls.filter(c=>c.command==='edit_rig').length,2);
});
test('a completed parent request never restores its old attachment selection over a newer user choice',async()=>{
 addInactiveClip();const w=useWorkspace();w.project=model;w.selectSceneAttachments([0,1],1);assert.equal(await w.beginParentPick(),true);
 const invoke=globalThis.__TAURI__.core.invoke;let release;
 globalThis.__TAURI__.core.invoke=async(command,args)=>{if(command==='edit_rig')await new Promise(resolve=>{release=resolve;});return invoke(command,args);};
 try{const choosing=w.chooseParent(1);assert.equal(typeof release,'function');w.selectBones([1],1);release();assert.equal(await choosing,true);assert.deepEqual(w.selectedAttachmentIds,[]);assert.deepEqual(w.selectedIds,[1]);assert.equal(w.selectedSlotId,null);}
 finally{globalThis.__TAURI__.core.invoke=invoke;}
});

test('image path edits capture the inspected inactive ID, preserve vertex focus and never request a geometry pose',async()=>{
 addInactiveClip();const a=model.slots[0].attachments[1];a.type='mesh';a.region.imagePath='';a.mesh={weighted:true,bones:[0,1],vertices:[{weights:[.6,.4],positions:[0,0,-30,0]},{weights:[1,0],positions:[40,0,10,0]},{weights:[1,0],positions:[0,40,-30,40]}],uvs:[0,0,1,0,0,1],edges:[0,1,1,2,2,0],triangles:[0,1,2],hull:3};
 model={...model,constraints:[{id:31,order:0,name:'spring',type:'physics',bone:0,x:1,y:0,scaleX:0,rotate:null,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}]};
 const w=useWorkspace();w.project=model;w.selectAttachment(1);w.selectedVertex=1;
 assert.equal(await w.setAttachmentImagePath('parts.v2/arm.final',5),true);assert.equal(w.selectedVertex,1);assert.equal(w.selectedAttachmentId,1);assert.equal(w.slots[0].activeAttachmentId,0);
 assert.deepEqual(calls.filter(c=>c.command==='edit_rig').map(c=>c.args),[{edit:{type:'setAttachmentImagePath',id:1,path:'parts.v2/arm.final'},expectedRevision:5}]);assert.equal(calls.filter(c=>c.command==='evaluate_project').length,0);
 assert.equal(await w.setAttachmentImagePath('',6),true);assert.deepEqual(calls.filter(c=>c.command==='edit_rig').at(-1).args.edit,{type:'setAttachmentImagePath',id:1,path:''});
 w.selectAttachment(2);assert.equal(await w.setAttachmentImagePath('blue'),false,'Clipping has no image reference');assert.equal(calls.filter(c=>c.command==='edit_rig').length,2);
});

test('Transform edits send runtime inputs without echoing read-only nullable range bits',async()=>{
 const bits=Array(24).fill(null);bits.splice(4,4,0x80000000,0x3dcccccd,0x3eaaaaab,0x40000000);
 const c={id:91,order:0,type:'transform',name:'Saved ranges',source:0,bones:[0],localSource:true,localTarget:true,additive:false,clamp:false,offsets:[0,0,0,0,0,0],mix:[0,0,0,0,0,0],properties:[{property:'x',offset:0,to:[{property:'x',offset:0,max:1,scale:1}]}],editorRangeBits:bits,editorRangeValues:Array(24).fill(1)};
 model={...model,constraints:[c]};const w=useWorkspace();w.project=model;w.selectConstraint(91);
 assert.equal(await w.editConstraintById(91,{name:'Renamed ranges'},5),true);
 const request=calls.find(call=>call.command==='edit_rig').args.edit;
 assert.equal(request.type,'updateConstraint');assert.equal(request.id,91);
 assert.equal(request.constraint.name,'Renamed ranges');assert.equal('editorRangeBits' in request.constraint,false);
 assert.deepEqual(request.constraint.properties,c.properties);assert.deepEqual(c.editorRangeBits,bits);
 assert.equal(c.editorRangeBits[4],0x80000000,'negative-zero wire bits remain native view data');
 assert.equal(await w.editConstraintById(91,{...c,name:'Copied view draft'}),true);
 const copied=calls.filter(call=>call.command==='edit_rig').at(-1).args.edit.constraint;
 assert.equal(copied.name,'Copied view draft');
 for(const key of ['editorRangeBits','editorRangeValues','id','order'])assert.equal(key in copied,false,'view metadata never leaks through a full DTO patch');
 assert.equal(calls.filter(call=>call.command==='evaluate_project').length,0);
});

test('Transform range intents preserve requested bits and explicit null without a geometry epoch or DTO echo',async()=>{
 const c={id:91,order:0,type:'transform',name:'Range authoring',source:0,bones:[0],localSource:false,localTarget:false,additive:false,clamp:false,offsets:[0,0,0,0,0,0],mix:[0,0,0,0,0,0],properties:[],editorRangeBits:Array(24).fill(null),editorRangeValues:Array(24).fill(0)};
 model={...model,constraints:[c]};const w=useWorkspace();w.project=model;
 assert.equal(await w.editTransformRange(91,4,0x80000000,5),true);
 assert.equal(await w.editTransformRange(91,4,null,6),true);
 const edits=calls.filter(c=>c.command==='edit_rig');
 assert.deepEqual(edits.map(c=>c.args),[
  {edit:{type:'setTransformRange',id:91,index:4,bits:0x80000000},expectedRevision:5},
  {edit:{type:'setTransformRange',id:91,index:4,bits:null},expectedRevision:6},
 ]);
 assert.equal(calls.filter(c=>c.command==='evaluate_project').length,0);
 assert.equal(await w.editTransformRange(92,4,0,7),false,'A stale inspector ID cannot target another constraint');
 assert.equal(calls.filter(c=>c.command==='edit_rig').length,2);
});
