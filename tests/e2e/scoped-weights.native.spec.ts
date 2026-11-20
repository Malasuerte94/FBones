import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {AttachmentView,DenseBindingView,EvaluationSnapshot,ProjectSummary,PruneWeightPreview,PruneWeightRequest,RigEdit} from '../../src/domain/project';
import type {Page} from '@playwright/test';
import {copyFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {inflateSync} from 'node:zlib';

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

test('@native Setup G opens Weights for the inspected unbound Mesh or Clipping and reopens its pane', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 900});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Setup Weights shortcut', discardChanges: true});
  const root = project.bones[0]!;
  project = await edit(native, {type: 'createSlot', bone: root.id, name: 'Geometry owner'});
  const owner = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot: owner, keys: ['board']});
  const region = project.editedAttachment!;
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot: owner, keys: ['board']});
  const mesh = project.editedAttachment!;
  await edit(native, {type: 'renameAttachment', id: mesh, name: 'Geometry mesh'});
  await edit(native, {type: 'attachmentEdit', id: mesh, edit: {type: 'convertMesh', id: owner}});
  await edit(native, {type: 'setActiveAttachment', slot: owner, attachment: region});
  project = await edit(native, {type: 'createSlot', bone: root.id, name: 'Mask owner'});
  const mask = project.editedSlot!;
  project = await edit(native, {type: 'createSlot', bone: root.id, name: 'Mask end'});
  project = await edit(native, {type: 'createClipping', slot: mask, name: 'Shortcut mask', endSlot: project.editedSlot!,
    vertices: [{x: -70, y: -50}, {x: 110, y: -50}, {x: 40, y: 50}], convex: true});
  const clipping = project.editedAttachment!;
  await edit(native, {type: 'setActiveAttachment', slot: mask, attachment: clipping});

  await openNativeEditor(page);
  const before = (await native.snapshot())!;
  expect(dense(before, mesh).weighted).toBe(false);
  expect(before.slots.find(slot => slot.id === owner)?.activeAttachmentId).toBe(region);
  expect(before.slots.find(slot => slot.id === mask)?.activeAttachmentId).toBe(clipping);
  const start = native.calls.length;
  const tree = (kind: 'bone' | 'slot' | 'attachment', id: number) => page
    .locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const meshRow = tree('attachment', mesh);
  const regionRow = tree('attachment', region);
  const modes = page.getByRole('group', {name: 'Editing mode', exact: true});
  const tool = modes.getByRole('button', {name: 'Weights', exact: true});
  const dock = page.getByTestId('dock-panel-weights');
  const dockMask = page.getByTestId('minimize-docked-views');
  const restore = page.getByTestId('restore-dock-weights');
  const paneActions = page.getByTestId('dock-pane-actions-weights');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const expectClosed = async () => {
    await expect(tool).toHaveAttribute('aria-pressed', 'false');
    await expect(dock).toBeHidden();
  };

  for (const row of [tree('bone', root.id), tree('slot', mask), regionRow]) {
    await row.click();
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(tool).not.toHaveAttribute('aria-keyshortcuts', 'G');
    await row.press('g');
    await expectClosed();
  }
  await meshRow.click({modifiers: ['Control']});
  await expect(regionRow).toHaveAttribute('aria-selected', 'true');
  await expect(meshRow).toHaveAttribute('aria-selected', 'true');
  await expect(tool).not.toHaveAttribute('aria-keyshortcuts', 'G');
  await meshRow.press('g');
  await expectClosed();

  await meshRow.click();
  await expect(tool).toHaveAttribute('aria-keyshortcuts', 'G');
  const search = page.getByTestId('dock-panel-tree').getByRole('searchbox');
  await search.press('g');
  await expect(search).toHaveValue('g');
  await expect(search).toBeFocused();
  await expectClosed();
  await search.clear();
  await meshRow.press('Shift+g');
  await expectClosed();

  const stage = (await canvas.boundingBox())!;
  await page.mouse.move(stage.x + stage.width * .56, stage.y + stage.height * .62);
  await page.mouse.down({button: 'middle'});
  try {
    await expect(canvas).toBeFocused();
    await page.keyboard.press('g');
    await expectClosed();
  } finally {
    await page.mouse.up({button: 'middle'});
  }
  await canvas.press('F9');
  await expect(dockMask).toHaveAttribute('aria-pressed', 'true');
  await expect(tool).not.toHaveAttribute('aria-keyshortcuts', 'G');
  await canvas.press('g');
  await expectClosed();
  await canvas.press('F9');
  await expect(dockMask).toHaveAttribute('aria-pressed', 'false');
  await expectClosed();

  await meshRow.press('g');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await expect(meshRow).toBeFocused();
  await expect(meshRow).toHaveAttribute('aria-selected', 'true');
  await expect(dock).toBeVisible();
  await expect(dock.getByTestId('weights-target')).toHaveText('Geometry mesh');
  await expect(dock.getByRole('checkbox', {name: `Bind ${root.name}`, exact: true})).toBeEnabled();
  await expect(dock.getByTestId('weights-auto')).toBeDisabled();

  await paneActions.click({button: 'right'});
  await expect(restore).toBeVisible();
  await expect(dock).toBeHidden();
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await canvas.press('g');
  await expect(canvas).toBeFocused();
  await expect(restore).toHaveCount(0);
  await expect(dock).toBeVisible();
  await expect(dock.getByTestId('weights-target')).toHaveText('Geometry mesh');

  await paneActions.press('Enter');
  await page.getByTestId('dock-close-weights').press('Enter');
  await expect(dock).toBeHidden();
  await expect(restore).toHaveCount(0);
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await canvas.press('g');
  await expect(canvas).toBeFocused();
  await expect(dock).toBeVisible();
  await expect(dock.getByTestId('weights-target')).toHaveText('Geometry mesh');
  await expect(meshRow).toHaveAttribute('aria-selected', 'true');

  await modes.getByRole('button', {name: 'Images', exact: true}).click();
  const clipRow = tree('attachment', clipping);
  await clipRow.click();
  await expect(tool).toHaveAttribute('aria-keyshortcuts', 'G');
  await clipRow.press('g');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await expect(clipRow).toBeFocused();
  await expect(clipRow).toHaveAttribute('aria-selected', 'true');
  await expect(dock.getByTestId('weights-target')).toHaveText('Shortcut mask');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project'].includes(call.command))).toHaveLength(0);
});

async function pixel(page: Page, at: {x:number; y:number}) {
 const png=await page.screenshot({scale:'css',clip:{x:Math.floor(at.x),y:Math.floor(at.y),width:1,height:1}});
 const chunks:Buffer[]=[];
 for(let index=8;index<png.length;){
  const length=png.readUInt32BE(index);
  if(png.toString('ascii',index+4,index+8)==='IDAT')chunks.push(png.subarray(index+8,index+8+length));
  index+=length+12;
 }
 return [...inflateSync(Buffer.concat(chunks)).subarray(1,4)];
}

test('@native Weights Overlay interpolates vertex colors, filters selected bone mass and leaves authored data untouched',async({page,native})=>{
 const f=await fixture(native,'mesh'),id=f.active;
 await edit(native,{type:'autoAttachmentWeights',id,scope:{bones:[f.bones[0]!]}});
 const part=item((await native.snapshot())!,id).mesh!;
 const [primary,a,b]=part.triangles;
 await edit(native,{type:'autoAttachmentWeights',id,scope:{vertices:[primary!],bones:[f.bones[1]!]}});
 const before=(await native.snapshot())!;
 await openNativeEditor(page);
 await weights(page,id);
 const aColor=await page.getByTestId(`weights-lock-${f.bones[0]}`).evaluate(element=>getComputedStyle(element).backgroundColor.match(/\d+/g)!.map(Number));
 const bColor=await page.getByTestId(`weights-lock-${f.bones[1]}`).evaluate(element=>getComputedStyle(element).backgroundColor.match(/\d+/g)!.map(Number));
 const [first,left,right]=await Promise.all([primary!,a!,b!].map(vertex=>point(page,before,id,vertex)));
 function inside(amount:number){
  return {x:first!.x*amount+(left!.x+right!.x)*(1-amount)/2,y:first!.y*amount+(left!.y+right!.y)*(1-amount)/2};
 }
 function close(actual:number[],expected:number[]){
  expect(actual).toHaveLength(3);
  for(let index=0;index<3;index++)expect(Math.abs(actual[index]!-expected[index]!)).toBeLessThanOrEqual(4);
 }
 const pies=page.getByTestId('weights-pies'),overlay=page.getByTestId('weights-overlay'),selected=page.getByTestId('weights-pies-selected');
 await pies.uncheck();
 const art=await pixel(page,inside(.6));
 await overlay.check();
 await expect(selected).toBeEnabled();
 for(const amount of [.6,.2]) close(await pixel(page,inside(amount)),aColor.map((value,index)=>value*(1-amount)+bColor[index]!*amount));
 await page.locator(`[data-weight-bone="${f.bones[1]}"]`).getByRole('button',{name:'Candidate B',exact:true}).click();
 await selected.check();
 close(await pixel(page,inside(.6)),bColor.map(value=>value*.6));
 await overlay.uncheck();
 expect(await pixel(page,inside(.6))).toEqual(art);
 await expect(selected).toBeDisabled();
 expect(await native.snapshot()).toEqual(before);
});

for(const[kind,target]of[['mesh','active'],['clipping','inactive']] as const)test(`@native scoped Auto ${kind}/${target} respects actual UI row and influence selection with dormant candidates`,async({page,native})=>{
 const f=await fixture(native,kind),id=f[target];await openNativeEditor(page);
 const before=(await native.snapshot())!,old=structuredClone(dense(before,id)),active=states(before),other=item(before,id===f.active?f.inactive:f.active),start=native.calls.length;
 if(kind==='clipping'){
   const modes=page.getByRole('group',{name:'Editing mode',exact:true});
   await modes.getByRole('button',{name:'Bones',exact:true}).click();
   const selected=page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem');
   await selected.click();
   const shortcut=page.getByTestId('viewport-edit-weights');
   await expect(shortcut).toBeEnabled();
   await shortcut.click();
   await expect(modes.getByRole('button',{name:'Weights',exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(page.getByTestId('weights-target')).toHaveText(item(before,id).name);
   await expect(selected).toHaveAttribute('aria-selected','true');
   expect(await native.snapshot()).toEqual(before);
   expect(native.calls.slice(start).filter(call=>call.command==='edit_rig')).toHaveLength(0);
   await page.getByTestId('weights-mode').selectOption('direct');
 }else await weights(page,id);
 const pies=page.getByTestId('weights-pies'),selectedPies=page.getByTestId('weights-pies-selected');
 await expect(pies).toBeChecked();
 await expect(page.getByTestId('weights-overlay')).not.toBeChecked();
 await expect(page.getByTestId('weights-overlay')).toBeEnabled();
 if(kind==='mesh'){
   const {x,y}=await point(page,before,id,0);
   const region={x:Math.floor(x)-9,y:Math.floor(y)-9,width:18,height:18};
   const withPies=await page.screenshot({clip:region,scale:'css'});
   await selectedPies.check();
   expect(await page.screenshot({clip:region,scale:'css'})).not.toEqual(withPies);
   await selectedPies.uncheck();
   await pies.uncheck();
   await expect(selectedPies).toBeDisabled();
   expect(await page.screenshot({clip:region,scale:'css'})).not.toEqual(withPies);
   await pies.check();
   expect(await native.snapshot()).toEqual(before);
 }else{
   const first=await point(page,before,id,0),second=await point(page,before,id,1);
   const zoom=(second.x-first.x)/210;
   const inside={x:first.x+150*zoom,y:first.y-135*zoom};
   const notch={x:first.x+30*zoom,y:first.y-150*zoom};
   const base=await pixel(page,inside),empty=await pixel(page,notch);
   const overlay=page.getByTestId('weights-overlay');
   await overlay.check();
   expect(await pixel(page,inside)).not.toEqual(base);
   expect(await pixel(page,notch)).toEqual(empty);
   await overlay.uncheck();
   expect(await native.snapshot()).toEqual(before);
 }
 const c=page.locator(`[data-weight-bone="${f.bones[2]}"]`).getByRole('button',{name:'Candidate C',exact:true});await c.click();await vertexClick(page,before,id,0);
 await expect(page.getByTestId('weights-auto-scope')).toHaveText('Auto: 1 vertices · 1 influences');expect(await native.snapshot()).toEqual(before);
 expect(native.calls.slice(start).filter(call=>call.command==='edit_rig')).toHaveLength(0);
 await page.getByTestId('weights-auto').click();await expect.poll(async()=>dense((await native.snapshot())!,id).vertices[0]!.weights).toEqual([0,0,1]);
 await expect(page.getByTestId('weights-auto-result')).toHaveText('Automatic weights applied for the selected bones.');
 const after=(await native.snapshot())!;expect(after.revision).toBe(before.revision+1);expect(states(after)).toEqual(active);expect(item(after,other.id)).toEqual(other);
 expect(dense(after,id).vertices.map(v=>v.positions)).toEqual(old.vertices.map(v=>v.positions));expect(dense(after,id).vertices.slice(1)).toEqual(old.vertices.slice(1));
 expect(actions(native,start,'autoAttachmentWeights').at(-1)!.args.edit).toEqual({type:'autoAttachmentWeights',id,scope:{vertices:[0],bones:[f.bones[2]]}});
 const selectedPoint=await point(page,after,id,0);
 await page.mouse.click(selectedPoint.x+11,selectedPoint.y);
 await expect(page.getByTestId('weights-auto-scope')).toHaveText('Auto: 1 vertices · 1 influences');
 expect(await native.snapshot()).toEqual(after);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>dense((await native.snapshot())!,id).vertices).toEqual(old.vertices);
 await page.getByTestId('weights-all-vertices').click();await page.getByTestId('weights-auto').click();await expect.poll(async()=>dense((await native.snapshot())!,id).vertices.every(v=>v.weights[2]===1)).toBe(true);
 expect(actions(native,start,'autoAttachmentWeights').at(-1)!.args.edit).toEqual({type:'autoAttachmentWeights',id,scope:{bones:[f.bones[2]]}});expect(states((await native.snapshot())!)).toEqual(active);
 const all=await native.snapshot();
 await page.getByTestId('weights-auto').click();
 await expect(page.getByTestId('weights-auto-result')).toHaveText('Auto made no weight changes.');
 expect(await native.snapshot()).toEqual(all);
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

test('@native pending scoped Auto keeps its geometry lease and saves the captured attachment',async({page,native})=>{
 const f=await fixture(native,'clipping'),id=f.inactive;
 await edit(native,{type:'addConstraint',constraint:{
  type:'physics',name:'Own Auto pose lease',bone:f.bones[0]!,x:1,y:1,rotate:null,shearX:0,scaleX:0,
  step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,
  globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false},
 }});
 await openNativeEditor(page);await weights(page,id);
 await page.getByTestId(`weights-lock-${f.bones[0]}`).click();
 await page.locator(`[data-weight-bone="${f.bones[2]}"]`).getByRole('button',{name:'Candidate C',exact:true}).click();
 await page.getByTestId('weights-vertex').selectOption('0');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+200));
 const before=(await native.snapshot())!,start=native.calls.length;
 await native.queueDialog('save','pending-auto.fbones');

 let releasePose!:()=>void,releaseEdit!:()=>void;
 const poseGate=new Promise<void>(resolve=>releasePose=resolve);
 const editGate=new Promise<void>(resolve=>releaseEdit=resolve);
 const invoke=native.invoke.bind(native);
 let heldPose:EvaluationSnapshot|undefined,capturePose=true;
 const pendingEdits:Record<string,unknown>[]=[];
 // Pause only delivery so the real Session computes the pose and applies Auto.
 native.invoke=async function<T=unknown>(command:string,args:Record<string,unknown>={}):Promise<T>{
  if(command==='evaluate_project'&&capturePose){
   capturePose=false;
   const snapshot=await invoke<T>(command,args);
   heldPose=snapshot as EvaluationSnapshot;
   await poseGate;
   return snapshot;
  }
  if(command==='edit_rig'&&(args.edit as RigEdit).type==='autoAttachmentWeights'){
   pendingEdits.push(structuredClone(args));
   await editGate;
  }
  return invoke<T>(command,args);
 };
 const auto=page.getByTestId('weights-auto'),save=page.getByRole('button',{name:'Save',exact:true});
 const undo=page.getByRole('button',{name:'Undo',exact:true});
 const status=page.locator('.editor-status').getByRole('status');
 const target=page.getByTestId('weights-target');
 try{
  await auto.click();
  await expect.poll(()=>heldPose?.poseEpoch).toBeGreaterThan(0);
  await expect(auto).toBeDisabled();
  await expect(undo).toBeDisabled();
  await expect(status).toHaveText('Working…');
  const canvas=page.getByTestId('viewport').locator('canvas'),box=(await canvas.boundingBox())!;
  await canvas.click({position:{x:box.width*.72,y:box.height*.62}});
  releasePose();
  await expect.poll(()=>pendingEdits.length).toBe(1);
  expect(pendingEdits[0]).toEqual({expectedRevision:before.revision,poseEpoch:heldPose!.poseEpoch,
   edit:{type:'autoAttachmentWeights',id,scope:{vertices:[0],bones:[f.bones[2]],lockedBones:[f.bones[0]]}}});

  const other=page.locator(`[data-tree-kind="attachment"][data-tree-id="${f.active}"]`).getByRole('treeitem');
  await other.click();
  await expect(target).toHaveText(item(before,f.active).name);
  await expect(auto).toBeDisabled();
  await expect(save).toBeEnabled();
  await save.click();
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call=>call.command==='save_project')).toHaveLength(0);

  releaseEdit();
  await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
  await expect(status).toHaveText('Ready');
  const saved=(await native.snapshot())!,old=dense(before,id),updated=dense(saved,id);
  const savedRow=updated.vertices[0]!.weights;
  expect(savedRow[0]).toBe(old.vertices[0]!.weights[0]);
  expect(savedRow[1]).toBe(0);
  expect(savedRow[2]).toBeCloseTo(1-savedRow[0]!,6);
  expect(updated.vertices.slice(1)).toEqual(old.vertices.slice(1));
  expect(updated.vertices.map(row=>row.positions)).toEqual(old.vertices.map(row=>row.positions));
  expect(item(saved,f.active)).toEqual(item(before,f.active));
  expect(states(saved)).toEqual(states(before));
  expect(native.calls.slice(start).filter(call=>['edit_rig','save_project'].includes(call.command)).map(call=>call.command)).toEqual(['edit_rig','save_project']);
  expect(pendingEdits).toHaveLength(1);
  await expect(other).toHaveAttribute('aria-selected','true');
  await expect(target).toHaveText(item(before,f.active).name);
  await expect(page.getByTestId('weights-auto-result')).toHaveText('');

  const time=page.getByTestId('physics-preview-time'),savedTime=await time.innerText();
  await page.clock.runFor(250);
  await expect(time).not.toHaveText(savedTime);
  await undo.click();
  await expect.poll(async()=>dense((await native.snapshot())!,id)).toEqual(old);
 }finally{
  releasePose();releaseEdit();native.invoke=invoke;
 }
});

test('@native bulk Smooth averages the inactive mesh row with hull neighbors and preserves locks',async({page,native})=>{
 const f=await fixture(native,'mesh'),id=f.inactive,[a,b,c]=f.bones as [number,number,number];
 for(const [vertex,recipient] of [[0,b],[1,b],[2,c],[3,c]] as const){
  await edit(native,{type:'autoAttachmentWeights',id,scope:{vertices:[vertex],bones:[recipient]}});
  await edit(native,{type:'setAttachmentWeight',id,vertex,bone:a,value:.5});
 }
 await openNativeEditor(page);await weights(page,id);
 await page.getByTestId(`weights-lock-${a}`).click();
 const selected=page.locator(`[data-weight-bone="${c}"]`).getByRole('button',{name:'Candidate C',exact:true});
 await selected.click();
 await page.getByTestId('weights-vertex').selectOption('0');
 const before=(await native.snapshot())!,start=native.calls.length,old=item(before,id).mesh!;
 // The target and its hull neighbors give two B samples and one C sample.
 // Including vertex 2 via the triangulation-only 0–2 diagonal would tie them.
 expect(old.triangles).toEqual([0,1,2,2,3,0]);
 expect(old.edges).toEqual([0,3,0,1,1,2,2,3]);
 expect(old.vertices.map(row=>row.weights)).toEqual([[.5,.5,0],[.5,.5,0],[.5,0,.5],[.5,0,.5]]);
 const smooth=page.getByTestId('weights-smooth');
 await expect(smooth).toBeEnabled();
 await expect(smooth).toHaveAccessibleDescription('Smooth all unlocked weights at selected vertices, or at every vertex when none are selected.');
 await smooth.click();
 await expect.poll(async()=>(await native.snapshot())?.revision).toBe(before.revision+1);
 const after=(await native.snapshot())!,next=item(after,id).mesh!;
 expect(next).toEqual({...old,vertices:[{...old.vertices[0],weights:[.5,Math.fround(1/3),Math.fround(1/6)]},...old.vertices.slice(1)]});
 expect(item(after,f.active)).toEqual(item(before,f.active));
 expect(states(after)).toEqual(states(before));
 expect(actions(native,start,'smoothAttachmentWeights').map(call=>call.args)).toEqual([
  {expectedRevision:before.revision,edit:{type:'smoothAttachmentWeights',id,vertices:[0],lockedBones:[a]}},
 ]);
 await expect(selected).toHaveAttribute('aria-pressed','true');
 await expect(page.getByTestId('weights-target')).toHaveText(item(before,id).name);
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect.poll(async()=>item((await native.snapshot())!,id).mesh).toEqual(old);
});

test('@native Swap exchanges two unlocked columns on every vertex of the inspected inactive mesh', async ({page, native}) => {
 const f = await fixture(native, 'mesh');
 const id = f.inactive;
 const [a, b, c] = f.bones as [number, number, number];
 // Distinct columns on both the selected vertex and a vertex outside the selection.
 await edit(native, {type:'setAttachmentWeight', id, vertex:0, bone:b, value:.8});
 await edit(native, {type:'setAttachmentWeight', id, vertex:1, bone:c, value:.8});
 const before = (await native.snapshot())!;
 const old = item(before, id).mesh!;
 const start = native.calls.length;
 await openNativeEditor(page);
 await weights(page, id);

 const swap = page.getByTestId('weights-swap');
 const rowB = page.locator(`[data-weight-bone="${b}"]`).getByRole('button', {name:'Candidate B', exact:true});
 const rowC = page.locator(`[data-weight-bone="${c}"]`).getByRole('button', {name:'Candidate C', exact:true});
 const lockA = page.getByTestId(`weights-lock-${a}`);
 const lockB = page.getByTestId(`weights-lock-${b}`);
 const bindB = page.getByRole('checkbox', {name:'Bind Candidate B', exact:true});
 const vertex = page.getByTestId('weights-vertex');
 await expect(swap).toBeDisabled();
 await rowC.click();
 await expect(swap).toBeDisabled();
 await rowB.click({modifiers:['Control']});
 await expect(swap).toBeEnabled();
 await lockB.click();
 await expect(swap).toBeDisabled();
 await lockB.click();
 await lockA.click();
 await bindB.uncheck();
 await vertex.selectOption('0');
 await expect(swap).toBeEnabled();
 await expect(swap).toHaveAccessibleDescription('Exchange the two selected weights on every vertex of this attachment.');
 expect(await native.snapshot()).toEqual(before);
 expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toHaveLength(0);

 await swap.click();
 await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 1);
 const after = (await native.snapshot())!;
 expect(item(after, id).mesh).toEqual({
  ...old,
  vertices: old.vertices.map(row => ({
   ...row,
   weights: [row.weights[0], row.weights[2], row.weights[1]],
  })),
 });
 expect(item(after, f.active)).toEqual(item(before, f.active));
 expect(states(after)).toEqual(states(before));
 expect(native.calls.slice(start).filter(call => call.command === 'edit_rig').map(call => call.args)).toEqual([
  {expectedRevision:before.revision, edit:{type:'swapAttachmentWeights', id, bones:[b,c], lockedBones:[a]}},
 ]);
 await expect(page.getByTestId('weights-target')).toHaveText(item(before, id).name);
 await expect(rowB).toHaveAttribute('aria-pressed', 'true');
 await expect(rowC).toHaveAttribute('aria-pressed', 'true');
 await expect(lockA).toHaveAttribute('aria-pressed', 'true');
 await expect(bindB).not.toBeChecked();
 await expect(vertex).toHaveValue('0');

 await page.getByRole('button', {name:'Undo', exact:true}).click();
 await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 2);
 const undone = (await native.snapshot())!;
 expect(undone.slots).toEqual(before.slots);
 await expect(vertex).toHaveValue('0');
});

test('@native Undo and Redo discard stale vertex scope after tracing a same-count weighted mesh', async ({page, native}) => {
 const f = await fixture(native, 'mesh');
 const id = f.inactive;
 const [a, b, c] = f.bones as [number, number, number];
 // Inset one corner of the opaque board. Outline Trace restores its four
 // corners with the original membership and a different ordered UV array.
 const before = await edit(native, {type:'attachmentEdit', id, edit:{
  type:'moveVertices', id:f.owner, vertices:[{vertex:0, x:-140, y:100}], editUvs:true,
 }});
 const traced = await native.invoke<ProjectSummary>('apply_trace_attachment', {
  expectedRevision:before.revision, id, options:{inner:false, tolerance:0, spacing:1024, maxVertices:4},
 });
 const old = item(before, id).mesh!;
 const current = item(traced, id).mesh!;
 expect(old.vertices).toHaveLength(4);
 expect(current.vertices).toHaveLength(4);
 expect(current.uvs.slice(0, 2)).not.toEqual(old.uvs.slice(0, 2));
 expect(old.weighted).toBe(true);
 expect(current.weighted).toBe(true);
 expect(current.bones).toEqual(old.bones);

 await openNativeEditor(page);
 const scope = page.getByTestId('weights-auto-scope');
 const vertex = page.getByTestId('weights-vertex');
 const influence = (bone: number, name: string) =>
  page.locator(`[data-weight-bone="${bone}"]`).getByRole('button', {name, exact:true});
 const lock = (bone: number) => page.getByTestId(`weights-lock-${bone}`);
 await weights(page, f.active);
 await influence(b, 'Candidate B').click();
 await lock(c).click();
 await vertex.selectOption({value:'1'});
 await expect(vertex).toHaveValue('1');
 await weights(page, id);
 const target = page.getByTestId('weights-target');
 await influence(c, 'Candidate C').click();
 await lock(a).click();

 for (const [action, expected] of [['Undo', old], ['Redo', current]] as const) {
  await vertex.selectOption({value:'0'});
  await expect(scope).toHaveText('Auto: 1 vertices · 1 influences');
  await page.getByRole('button', {name:action, exact:true}).click();
  await expect.poll(async () => item((await native.snapshot())!, id).mesh).toEqual(expected);
  await expect(target).toHaveText(item(traced, id).name);
  await expect(scope).toHaveText('Auto: All vertices · 1 influences');
  await expect(vertex).toHaveValue('');
  await expect(influence(c, 'Candidate C')).toHaveAttribute('aria-pressed', 'true');
  await expect(lock(a)).toHaveAttribute('aria-pressed', 'true');
 }

 await weights(page, f.active);
 await expect(vertex).toHaveValue('1');
 await expect(scope).toHaveText('Auto: 1 vertices · 1 influences');
 await expect(influence(b, 'Candidate B')).toHaveAttribute('aria-pressed', 'true');
 await expect(lock(c)).toHaveAttribute('aria-pressed', 'true');
});

test('@native Update bindings recaptures the entire inactive mesh from its frozen live Setup pose', async ({page, native}) => {
 const f = await fixture(native, 'mesh');
 const id = f.inactive;
 const [lockedBone, movingBone] = f.bones as [number, number, number];
 await edit(native, {type:'addConstraint', constraint:{
  type:'physics', name:'Binding capture gravity', bone:movingBone, x:1, y:1, rotate:null, shearX:0, scaleX:0,
  step:Math.fround(1/60), inertia:.5, strength:100, damping:.85, mass:1, wind:0, gravity:10, mix:1, limit:5000,
  globals:{inertia:false, strength:false, damping:false, mass:false, wind:false, gravity:false, mix:false},
 }});
 await openNativeEditor(page);
 await weights(page, id);
 const row = page.locator(`[data-weight-bone="${movingBone}"]`).getByRole('button', {name:'Candidate B', exact:true});
 const lock = page.getByTestId(`weights-lock-${lockedBone}`);
 const bindDraft = page.getByRole('checkbox', {name:'Bind Candidate C', exact:true});
 const vertex = page.getByTestId('weights-vertex');
 const time = page.getByTestId('physics-preview-time');
 await row.click();
 await lock.click();
 await bindDraft.uncheck();
 await vertex.selectOption({value:'0'});
 await expect.poll(async () => Number.parseFloat(await time.innerText())).toBeGreaterThan(.25);
 await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 200));

 const before = (await native.snapshot())!;
 const start = native.calls.length;
 const button = page.getByTestId('weights-update-bindings');
 await expect(button).toHaveAccessibleDescription('Recalculate binding positions from the current bone pose.');
 await button.click();
 await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 1);
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const after = (await native.snapshot())!;
 const edits = native.calls.slice(start).filter(call => call.command === 'edit_rig');
 expect(edits).toHaveLength(1);
 const epoch = edits[0]!.args.poseEpoch;
 expect(epoch).toBeGreaterThan(0);
 expect(edits[0]!.args).toEqual({
  expectedRevision:before.revision, poseEpoch:epoch, edit:{type:'updateAttachmentBindings', id},
 });
 const evaluations = native.calls.slice(start).filter(call => call.command === 'evaluate_project').map(call => call.result as EvaluationSnapshot | undefined);
 const snapshot = evaluations.find(result => result?.poseEpoch === epoch)!;
 expect(snapshot).toMatchObject({documentId:before.documentId, revision:before.revision, mode:'replay'});
 const poses = new Map(snapshot.bones.map(bone => [bone.id, bone.world]));
 expect(poses.get(movingBone)!.y).toBeLessThan(before.bones.find(bone => bone.id === movingBone)!.y - .2);

 const {vertices:oldRows, ...oldMesh} = item(before, id).mesh!;
 const {vertices:newRows, ...newMesh} = item(after, id).mesh!;
 expect(oldRows.every(vertex => vertex.weights[2] === 0)).toBe(true);
 expect(newMesh).toEqual(oldMesh);
 expect(newRows.map(vertex => vertex.weights)).toEqual(oldRows.map(vertex => vertex.weights));
 expect(item(after, f.active)).toEqual(item(before, f.active));
 expect(states(after)).toEqual(states(before));
 expect(after.bones).toEqual(before.bones);
 expect(after.constraints).toEqual(before.constraints);
 const world = (positions: number[], column: number) => {
  const {x, y, a, b, c, d} = poses.get(oldMesh.bones[column]!)!;
  const localX = positions[column * 2]!, localY = positions[column * 2 + 1]!;
  return [x + a * localX + c * localY, y + b * localX + d * localY] as const;
 };
 // Compare the original blended point with the recaptured point of each
 // column in the exact same pose, including the dormant bound influence.
 oldRows.forEach((old, index) => {
  const next = newRows[index]!;
  expect(next.positions).not.toEqual(old.positions);
  const mass = old.weights.reduce((total, weight) => total + weight, 0);
  const blended = old.weights.reduce<[number, number]>(([x, y], weight, column) => {
   const [px, py] = world(old.positions, column);
   return [x + weight * px, y + weight * py];
  }, [0, 0]);
  for (let column = 0; column < oldMesh.bones.length; column++) {
   const [x, y] = world(next.positions, column);
   expect(x).toBeCloseTo(blended[0] / mass, 3);
   expect(y).toBeCloseTo(blended[1] / mass, 3);
  }
 });
 await expect(page.getByTestId('weights-target')).toHaveText(item(before, id).name);
 await expect(row).toHaveAttribute('aria-pressed', 'true');
 await expect(lock).toHaveAttribute('aria-pressed', 'true');
 await expect(bindDraft).not.toBeChecked();
 await expect(vertex).toHaveValue('0');
 const frozenTime = await time.innerText();
 await page.clock.runFor(250);
 await expect(time).not.toHaveText(frozenTime);
 await expect(page.getByTestId('physics-simulate')).toBeChecked();

 await page.getByRole('button', {name:'Undo', exact:true}).click();
 await expect.poll(async () => (await native.snapshot())?.slots).toEqual(before.slots);
 const animate = page.getByTestId('editor-mode-animate');
 await animate.click();
 await expect(animate).toHaveAttribute('aria-pressed', 'true');
 await expect(button).toBeHidden();
});

test('@native Prune previews both selected meshes and applies only the current options in one Undo step', async ({page, native}) => {
 const f = await fixture(native, 'mesh');
 const [a, b, c] = f.bones as [number, number, number];
 // At 25%, B falls out of inactive row 1. On active row 1 it is the
 // only editable recipient because A is locked. A cap of two hits both row 0s.
 await edit(native, {type:'setAttachmentWeight', id:f.active, vertex:0, bone:c, value:.30});
 for (const vertex of [0, 1]) {
  await edit(native, {type:'setAttachmentWeight', id:f.inactive, vertex, bone:c, value:.10});
 }
 const before = (await native.snapshot())!;
 const start = native.calls.length;
 await openNativeEditor(page);
 await weights(page, f.active);
 await page.getByTestId(`weights-lock-${a}`).click();
 const tree = (id: number) => page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem');
 await tree(f.inactive).click({modifiers:['Control']});
 const lock = page.getByTestId(`weights-lock-${c}`);
 const influence = page.locator(`[data-weight-bone="${b}"]`).getByRole('button', {name:'Candidate B', exact:true});
 const vertex = page.getByTestId('weights-vertex');
 await lock.click();
 await influence.click();
 await vertex.selectOption({value:'0'});
 await page.getByTestId('weights-pies').uncheck();
 await page.getByTestId('weights-overlay').check();

 const [left, upper, lower] = await Promise.all([0, 1, 2].map(index => point(page, before, f.inactive, index)));
 const sample = {x:.15 * left!.x + .7 * upper!.x + .15 * lower!.x, y:.15 * left!.y + .7 * upper!.y + .15 * lower!.y};
 const baseline = await pixel(page, sample);
 const opener = page.getByTestId('weights-prune');
 const dialog = page.getByTestId('weights-prune-dialog');
 const cap = dialog.getByTestId('weights-prune-max');
 const threshold = dialog.getByTestId('weights-prune-threshold');
 const status = dialog.getByTestId('weights-prune-status');
 const apply = dialog.getByTestId('weights-prune-apply');
 const commits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');
 await opener.click();
 await expect(cap).toHaveValue('3');
 await expect(threshold).toHaveValue('0');
 await expect(status).toHaveText('No influences to remove');
 await expect(apply).toBeDisabled();
 await threshold.fill('25');
 await expect(status).toHaveText('1 influence to remove');
 const thresholdPreview = native.calls.slice(start).filter(call => call.command === 'preview_prune_weights').at(-1)!.result as PruneWeightPreview;
 expect(thresholdPreview.targets.map(target => ({id:target.id, vertices:target.rows.map(row => row.vertex)}))).toEqual([
  {id:f.inactive, vertices:[1]},
 ]);
 await expect(apply).toBeEnabled();
 await expect.poll(() => pixel(page, sample)).not.toEqual(baseline);
 expect(await native.snapshot()).toEqual(before);
 expect(commits()).toHaveLength(0);
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 await expect.poll(() => pixel(page, sample)).toEqual(baseline);
 expect(await native.snapshot()).toEqual(before);

 let releaseStale!: () => void, releaseCurrent!: () => void;
 const staleGate = new Promise<void>(resolve => { releaseStale = resolve; });
 const currentGate = new Promise<void>(resolve => { releaseCurrent = resolve; });
 let staleReady = false, currentReady = false;
 let candidate: PruneWeightPreview | undefined;
 const invoke = native.invoke.bind(native);
 // Delay only delivery. Both preview results come from the same real Session.
 native.invoke = async function<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  const result = await invoke<T>(command, args);
  if (command === 'preview_prune_weights') {
   const request = args.request as PruneWeightRequest;
   if (request.maxInfluences === 3 && request.threshold === .25) {
    staleReady = true;
    await staleGate;
   } else if (request.maxInfluences === 2 && request.threshold === 0) {
    currentReady = true;
    await currentGate;
   }
  }
  return result;
 };
 try {
  await opener.click();
  await expect(status).toHaveText('No influences to remove');
  await threshold.fill('25');
  await expect.poll(() => staleReady).toBe(true);
  await cap.fill('2');
  await threshold.fill('0');
  await expect(apply).toBeDisabled();
  releaseStale();
  await expect.poll(() => currentReady).toBe(true);
  await expect(status).not.toHaveText('1 influence to remove');
  await expect(apply).toBeDisabled();
  releaseCurrent();
  await expect(status).toHaveText('3 influences to remove');
  await expect(apply).toBeEnabled();
  expect(await native.snapshot()).toEqual(before);
  expect(commits()).toHaveLength(0);

  const preview = native.calls.slice(start).filter(call => call.command === 'preview_prune_weights').at(-1)!;
  const request = preview.args.request as PruneWeightRequest;
  candidate = preview.result as PruneWeightPreview;
  expect(candidate).toMatchObject({documentId:before.documentId, revision:before.revision, removed:3});
  expect(preview.args.expectedRevision).toBe(before.revision);
  expect({...request, targets:[...request.targets].sort((x, y) => x.id - y.id)}).toEqual({
   targets:[{id:f.active, lockedBones:[a]}, {id:f.inactive, lockedBones:[c]}],
   maxInfluences:2, threshold:0,
  });
  await apply.click();
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 1);
  expect(commits().map(call => call.args)).toEqual([
   {expectedRevision:before.revision, edit:{type:'pruneAttachmentWeights', request}},
  ]);
 } finally {
  releaseStale();
  releaseCurrent();
  native.invoke = invoke;
 }

 const after = (await native.snapshot())!;
 expect(states(after)).toEqual(states(before));
 for (const [id, prunedRows, keeper, protectedColumn] of [[f.active, [0], 2, 0], [f.inactive, [0, 1], 0, 2]] as const) {
  const old = item(before, id).mesh!;
  const weightsAfter = old.vertices.map((row, index) => {
   if (!(prunedRows as readonly number[]).includes(index)) return row;
   const weights = [...row.weights];
   weights[keeper] = Math.fround(weights[keeper]! + weights[1]!);
   weights[1] = 0;
   return {...row, weights};
  });
  const current = item(after, id).mesh!;
  expect(current).toEqual({...old, vertices:weightsAfter});
  expect(current.vertices.map(row => row.weights[protectedColumn])).toEqual(old.vertices.map(row => row.weights[protectedColumn]));
  expect(candidate?.targets.find(target => target.id === id)?.rows).toEqual(prunedRows.map(vertex => ({
   vertex, weights:current.vertices[vertex]!.weights,
  })));
 }
 await expect(tree(f.active)).toHaveAttribute('aria-selected', 'true');
 await expect(tree(f.inactive)).toHaveAttribute('aria-selected', 'true');
 await expect(page.getByTestId('weights-target')).toHaveText(item(before, f.inactive).name);
 await expect(lock).toHaveAttribute('aria-pressed', 'true');
 await expect(influence).toHaveAttribute('aria-pressed', 'true');
 await expect(vertex).toHaveValue('0');
 await page.getByRole('button', {name:'Undo', exact:true}).click();
 await expect.poll(async () => (await native.snapshot())?.slots).toEqual(before.slots);
});

test('@native weight clipboard pastes rows in viewport selection order across reordered bindings', async ({page, native}) => {
 const f = await fixture(native, 'mesh');
 const [a, b, c] = f.bones as [number, number, number];
 await edit(native, {type:'setAttachmentWeight', id:f.active, vertex:2, bone:b, value:.75});
 await edit(native, {type:'setAttachmentWeight', id:f.active, vertex:2, bone:c, value:.125});
 await edit(native, {type:'setAttachmentWeight', id:f.inactive, vertex:1, bone:c, value:.125});
 await edit(native, {type:'bindAttachment', id:f.inactive, bones:[c,a,b]});
 const before = (await native.snapshot())!;
 const source = item(before, f.active).mesh!, target = item(before, f.inactive).mesh!;
 expect(source.bones).toEqual([a,b,c]);
 expect(target.bones).toEqual([c,a,b]);
 expect(source.vertices[2]!.weights).not.toEqual(source.vertices[0]!.weights);
 const start = native.calls.length;
 const commits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');

 await openNativeEditor(page);
 await weights(page, f.active);
 await vertexClick(page, before, f.active, 2);
 await vertexClick(page, before, f.active, 0, true);
 const viewport = page.getByTestId('viewport');
 const copy = page.getByTestId('weights-copy');
 const paste = page.getByTestId('weights-paste');
 const scope = page.getByTestId('weights-auto-scope');
 await expect(scope).toHaveText('Auto: 2 vertices · All influences');
 await expect(copy).toBeEnabled();
 await page.getByTestId('weights-direct-number').press('Control+c');
 await expect(paste).toBeDisabled();
 await viewport.press('Control+c');
 await expect(page.getByTestId('weights-clipboard-status')).toHaveText('2 vertices copied');
 await expect(paste).toBeEnabled();
 expect(await native.snapshot()).toEqual(before);
 expect(commits()).toHaveLength(0);

 await weights(page, f.inactive);
 const preserved = page.getByTestId(`weights-lock-${c}`);
 await preserved.click();
 await vertexClick(page, before, f.inactive, 1);
 await expect(paste).toBeDisabled();
 await expect(paste).toHaveAccessibleDescription('Select 2 vertices to paste.');
 await viewport.press('Control+v');
 expect(await native.snapshot()).toEqual(before);
 expect(commits()).toHaveLength(0);
 await vertexClick(page, before, f.inactive, 3, true);
 await expect(scope).toHaveText('Auto: 2 vertices · All influences');
 await expect(paste).toBeEnabled();
 await viewport.press('Control+v');
 await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 1);

 const weightBits = (weights: number[]) => Array.from(new Uint32Array(Float32Array.from(weights).buffer));
 expect(commits().map(call => call.args)).toEqual([{
  expectedRevision:before.revision,
  edit:{
   type:'pasteAttachmentWeights', id:f.inactive, bones:source.bones, lockedBones:[c],
   rows:[
    {vertex:1, weightBits:weightBits(source.vertices[2]!.weights)},
    {vertex:3, weightBits:weightBits(source.vertices[0]!.weights)},
   ],
  },
 }]);
 const after = (await native.snapshot())!;
 const sourceColumn = target.bones.map(bone => source.bones.indexOf(bone));
 const pastedRows = new Map([[1, source.vertices[2]!], [3, source.vertices[0]!]]);
 expect(item(after, f.inactive).mesh).toEqual({
  ...target,
  vertices:target.vertices.map((row, index) => {
   const pasted = pastedRows.get(index);
   return pasted ? {...row, weights:sourceColumn.map(column => pasted.weights[column])} : row;
  }),
 });
 expect(item(after, f.active)).toEqual(item(before, f.active));
 expect(states(after)).toEqual(states(before));
 await expect(page.getByTestId('weights-target')).toHaveText(item(before, f.inactive).name);
 await expect(preserved).toHaveAttribute('aria-pressed', 'true');
 await expect(scope).toHaveText('Auto: 2 vertices · All influences');
 await expect(page.getByTestId('weights-vertex')).toHaveValue('3');
 await page.getByRole('button', {name:'Undo', exact:true}).click();
 await expect.poll(async () => (await native.snapshot())?.slots).toEqual(before.slots);
});
