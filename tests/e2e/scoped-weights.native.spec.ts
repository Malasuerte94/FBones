import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {AttachmentView,DenseBindingView,ProjectSummary,RigEdit} from '../../src/domain/project';
import type {Page} from '@playwright/test';
import {copyFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';

async function edit(native:NativeSession,operation:RigEdit){const before=(await native.snapshot())!;return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:before.revision,edit:operation});}
function item(p:ProjectSummary,id:number){return p.slots.flatMap(s=>s.attachments??[]).find(a=>a.id===id)!;}
function dense(p:ProjectSummary,id:number):DenseBindingView{const a=item(p,id);return (a.clipping??a.mesh)!;}
const states=(p:ProjectSummary)=>p.slots.map(s=>({id:s.id,active:s.activeAttachmentId}));
async function fixture(native:NativeSession,kind:'mesh'|'clipping'){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Scoped weights '+kind,discardChanges:true});const root=p.bones[0]!.id,bones:number[]=[];
 for(const[name,x]of[['Candidate A',0],['Candidate B',60],['Candidate C',120]] as const){p=await edit(native,{type:'create',parent:root,x,y:0,length:40,rotation:0});const id=p.editedBone!;bones.push(id);p=await edit(native,{...p.bones.find(b=>b.id===id)!,type:'update',name});}
 p=await edit(native,{type:'createSlot',bone:root,name:'Weights owner'});const owner=p.editedSlot!;
 p=await edit(native,{type:'createSlot',bone:root,name:'Mask end'});const end=p.editedSlot!;
 if(kind==='mesh'){await native.queueDialog('folder','images');p=await native.invoke<ProjectSummary>('choose_images_folder',{expectedRevision:p.revision});}
 const ids:number[]=[];
 for(let n=0;n<2;n++){
  if(kind==='mesh')p=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:p.revision,slot:owner,keys:['board']});
  else p=await edit(native,{type:'createClipping',slot:owner,name:n?'Inactive scoped mask':'Active scoped mask',endSlot:end,vertices:[{x:-70,y:-90},{x:140,y:-90},{x:140,y:90},{x:50,y:90},{x:50,y:20},{x:-70,y:20}],convex:false,inverse:false});
  const id=p.editedAttachment!;ids.push(id);
  if(kind==='mesh')p=await edit(native,{type:'attachmentEdit',id,edit:{type:'convertMesh',id:owner}});
  p=await edit(native,{type:'bindAttachment',id,bones});
  for(let vertex=0;vertex<dense(p,id).vertices.length;vertex++)p=await edit(native,{type:'setAttachmentWeight',id,vertex,bone:bones[1]!,value:vertex===1?.2:.4});
 }
 p=await edit(native,{type:'setActiveAttachment',slot:owner,attachment:ids[0]!});
 return{bones,active:ids[0]!,inactive:ids[1]!,owner,project:p};
}
async function weights(page:Page,id:number){
 await page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem').click();
 await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Weights',exact:true}).click();
 await page.getByTestId('weights-mode').selectOption('direct');
}
async function point(page:Page,p:ProjectSummary,id:number,vertex:number){
 // Fixture bones have identity linear axes and initialized bind coordinates.
 // Use the first binding column, not the implementation's skinning helper.
 const b=dense(p,id),origin=p.bones.find(x=>x.id===b.bones[0])!,row=b.vertices[vertex]!;
 const canvas=page.getByTestId('viewport').locator('canvas'),r=(await canvas.boundingBox())!,zoom=Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%',''))/100;
 return{x:r.x+r.width/2+(origin.x+row.positions[0]!)*zoom,y:r.y+r.height/2-(origin.y+row.positions[1]!)*zoom};
}
async function vertexClick(page:Page,p:ProjectSummary,id:number,vertex:number,toggle=false){const at=await point(page,p,id,vertex);if(toggle)await page.keyboard.down('Control');try{await page.mouse.click(at.x,at.y);}finally{if(toggle)await page.keyboard.up('Control');}}
function actions(native:NativeSession,start:number,type:string){return native.calls.slice(start).filter(call=>call.command==='edit_rig'&&(call.args.edit as {type:string}).type===type);}

for(const[kind,target]of[['mesh','active'],['clipping','inactive']] as const)test(`@native scoped Auto ${kind}/${target} respects actual UI row and influence selection with dormant candidates`,async({page,native})=>{
 const f=await fixture(native,kind),id=f[target];await openNativeEditor(page);await weights(page,id);const before=(await native.snapshot())!,old=structuredClone(dense(before,id)),active=states(before),other=item(before,id===f.active?f.inactive:f.active),start=native.calls.length;
 const c=page.locator(`[data-weight-bone="${f.bones[2]}"]`).getByRole('button',{name:'Candidate C',exact:true});await c.click();await vertexClick(page,before,id,0);
 await expect(page.getByTestId('weights-auto-scope')).toHaveText('Auto: 1 vertices · 1 influences');expect(await native.snapshot()).toEqual(before);
 expect(native.calls.slice(start).filter(call=>call.command==='edit_rig')).toHaveLength(0);
 await page.getByTestId('weights-auto').click();await expect.poll(async()=>dense((await native.snapshot())!,id).vertices[0]!.weights).toEqual([0,0,1]);
 const after=(await native.snapshot())!;expect(after.revision).toBe(before.revision+1);expect(states(after)).toEqual(active);expect(item(after,other.id)).toEqual(other);
 expect(dense(after,id).vertices.map(v=>v.positions)).toEqual(old.vertices.map(v=>v.positions));expect(dense(after,id).vertices.slice(1)).toEqual(old.vertices.slice(1));
 expect(actions(native,start,'autoAttachmentWeights').at(-1)!.args.edit).toEqual({type:'autoAttachmentWeights',id,scope:{vertices:[0],bones:[f.bones[2]]}});
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>dense((await native.snapshot())!,id).vertices).toEqual(old.vertices);
 await page.getByTestId('weights-all-vertices').click();await page.getByTestId('weights-auto').click();await expect.poll(async()=>dense((await native.snapshot())!,id).vertices.every(v=>v.weights[2]===1)).toBe(true);
 expect(actions(native,start,'autoAttachmentWeights').at(-1)!.args.edit).toEqual({type:'autoAttachmentWeights',id,scope:{bones:[f.bones[2]]}});expect(states((await native.snapshot())!)).toEqual(active);
});

test('@native Ctrl selections, group Direct/mixed numeric/brush and Escape use one transaction and preserve the inspected inactive clip',async({page,native})=>{
 const f=await fixture(native,'clipping'),id=f.inactive;await openNativeEditor(page);await weights(page,id);await page.getByTestId('weights-influence').selectOption(String(f.bones[1]));
 const before=(await native.snapshot())!,start=native.calls.length;await vertexClick(page,before,id,0);await vertexClick(page,before,id,1,true);
 await expect(page.getByTestId('weights-auto-scope')).toHaveText('Auto: 2 vertices · All influences');expect(await native.snapshot()).toEqual(before);
 const number=page.getByTestId('weights-direct-number');await expect(number).toHaveValue('');await expect(number).toHaveAttribute('placeholder','*');await number.focus();await page.getByTestId('weights-target').click();expect(await native.snapshot()).toEqual(before);
 await number.fill('37');await number.press('Enter');await expect.poll(async()=>dense((await native.snapshot())!,id).vertices.slice(0,2).map(v=>v.weights[1])).toEqual([Math.fround(.37),Math.fround(.37)]);
 let p=(await native.snapshot())!;expect(p.revision).toBe(before.revision+1);expect(actions(native,start,'paintAttachmentWeights').at(-1)!.args.edit).toEqual({type:'paintAttachmentWeights',id,bone:f.bones[1],changes:[{vertex:0,value:.37},{vertex:1,value:.37}]});
 const at=await point(page,p,id,0),revision=p.revision;await page.mouse.move(at.x,at.y);await page.mouse.down();await page.mouse.move(at.x,at.y-20,{steps:8});await page.mouse.up();
 await expect.poll(async()=>dense((await native.snapshot())!,id).vertices.slice(0,2).map(v=>v.weights[1])).toEqual([Math.fround(.47),Math.fround(.47)]);
 p=(await native.snapshot())!;expect(p.revision).toBe(revision+1);expect(dense(p,id).vertices.slice(2)).toEqual(dense(before,id).vertices.slice(2));
 await page.getByTestId('weights-mode').selectOption('replace');const strength=page.locator('label').filter({hasText:/^Strength/}).locator('input[type="range"]');await strength.press('End');const r=(await native.snapshot())!.revision;
 const outside=await point(page,p,id,2);await page.mouse.click(outside.x,outside.y);expect((await native.snapshot())!.revision).toBe(r);expect(dense((await native.snapshot())!,id).vertices[2]).toEqual(dense(before,id).vertices[2]);
 await page.getByTestId('weights-mode').selectOption('direct');await page.getByTestId('viewport').locator('canvas').press('Control+a');await expect(page.getByTestId('weights-auto-scope')).toHaveText('Auto: 6 vertices · All influences');
 await page.getByTestId('viewport').locator('canvas').press('Escape');await expect(page.getByTestId('weights-auto-scope')).toHaveText('Auto: All vertices · All influences');await expect(page.getByTestId('weights-target')).toHaveText('Inactive scoped mask');
 expect(states((await native.snapshot())!)).toEqual(states(before));expect(dense((await native.snapshot())!,id).vertices.map(v=>v.positions)).toEqual(dense(before,id).vertices.map(v=>v.positions));
});

test('@native UI-authored scoped and locked mesh saves a portable original-comparison artifact',async({page,native},testInfo)=>{
 const f=await fixture(native,'mesh'),id=f.inactive;await openNativeEditor(page);await weights(page,id);
 const before=(await native.snapshot())!,start=native.calls.length;
 await page.getByTestId(`weights-lock-${f.bones[0]}`).click();
 await page.locator(`[data-weight-bone="${f.bones[2]}"]`).getByRole('button',{name:'Candidate C',exact:true}).click();
 await vertexClick(page,before,id,0);await page.getByTestId('weights-auto').click();
 await expect.poll(async()=>dense((await native.snapshot())!,id).vertices[0]!.weights[1]).toBe(0);
 const scoped=(await native.snapshot())!,protectedWeight=dense(before,id).vertices[0]!.weights[0]!;
 expect(dense(scoped,id).vertices[0]!.weights[0]).toBe(protectedWeight);
 expect(dense(scoped,id).vertices[0]!.weights[2]).toBeCloseTo(1-protectedWeight,6);
 await page.getByTestId('weights-influence').selectOption(String(f.bones[1]));
 const field=page.getByTestId('weights-direct-number');await field.fill('20');await field.press('Enter');
 await expect.poll(async()=>dense((await native.snapshot())!,id).vertices[0]!.weights[1]).toBe(Math.fround(.2));
 const authored=(await native.snapshot())!;expect(dense(authored,id).vertices[0]!.weights[0]).toBe(protectedWeight);
 expect(dense(authored,id).vertices.map(v=>v.positions)).toEqual(dense(before,id).vertices.map(v=>v.positions));
 expect(dense(authored,id).vertices.slice(1)).toEqual(dense(before,id).vertices.slice(1));expect(states(authored)).toEqual(states(before));
 await native.queueDialog('save','scoped-delivery.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
 const saved=(await native.snapshot())!;expect(saved.path).toBeTruthy();expect(saved.inspectionOnly).toBe(false);
 const output=testInfo.outputPath('original-comparison');await mkdir(output,{recursive:true});
 await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await cp(join(dirname(saved.path!),'images'),join(output,'images'),{recursive:true});
 await writeFile(join(output,'authored.json'),JSON.stringify({before,scoped,authored,saved,actions:native.calls.slice(start).filter(call=>call.command==='edit_rig')},null,2));
 await page.screenshot({path:join(output,'scoped-weights.png')});
 await testInfo.attach('scoped-authoring',{path:join(output,'authored.json'),contentType:'application/json'});
 // A real Session close/reopen exercises the saved codec rather than a JS DTO.
 await native.invoke('close_project',{discardChanges:true});await native.queueDialog('open','scoped-delivery.fbones');
 const reopened=await native.invoke<ProjectSummary>('open_project',{discardChanges:true});
 const restored=reopened.slots.flatMap(s=>s.attachments??[]).find(a=>a.name===item(saved,id).name&&a.slot===reopened.slots.find(s=>s.name==='Weights owner')!.id)!;
 expect((restored.mesh??restored.clipping)!.vertices).toEqual(dense(saved,id).vertices);
});
