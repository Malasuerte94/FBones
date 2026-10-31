import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {ProjectSummary,RigEdit} from '../../src/domain/project';
import type {Page} from '@playwright/test';

const points=[{x:-80,y:-60},{x:100,y:-60},{x:100,y:80},{x:30,y:80},{x:30,y:10},{x:-80,y:10}];
async function command(native:NativeSession,edit:RigEdit){
  const before=(await native.snapshot())!;
  return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:before.revision,edit});
}
function attachment(project:ProjectSummary,id:number){return project.slots.flatMap(slot=>slot.attachments??[]).find(item=>item.id===id)!;}
function activation(project:ProjectSummary){return project.slots.map(slot=>({id:slot.id,active:slot.activeAttachmentId}));}
function persistedScene(project:ProjectSummary){return project.slots.map(slot=>({name:slot.name,active:slot.attachments?.find(a=>a.id===slot.activeAttachmentId)?.name??null,attachments:slot.attachments?.map(({id:_id,slot:_slot,...a})=>a)}));}
async function setup(native:NativeSession){
  let p=await native.invoke<ProjectSummary>('create_project',{name:'Ubuntu weighted clipping',discardChanges:true});
  const root=p.bones[0]!.id;
  p=await command(native,{type:'create',parent:root,x:50,y:0,length:40,rotation:0});
  const tip=p.editedBone!;
  p=await command(native,{type:'createSlot',bone:root,name:'Mask'});const maskSlot=p.editedSlot!;
  p=await command(native,{type:'createSlot',bone:root,name:'Paint'});const paintSlot=p.editedSlot!;
  await native.queueDialog('folder','images');
  p=await native.invoke<ProjectSummary>('choose_images_folder',{expectedRevision:p.revision});
  p=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:p.revision,slot:paintSlot,keys:['red']});
  const clips:number[]=[];
  for(const name of ['Active mask','Inactive mask']){
    p=await command(native,{type:'createClipping',slot:maskSlot,name,endSlot:paintSlot,vertices:points,convex:false,inverse:false});
    const id=p.editedAttachment!;clips.push(id);
    await command(native,{type:'bindAttachment',id,bones:[root,tip]});
    await command(native,{type:'autoAttachmentWeights',id});
    // Native fixture setup: no JS project model. Both influences already have
    // positive mass, so these edits use the actual normalized weight command.
    for(let vertex=0;vertex<points.length;vertex++)await command(native,{type:'setAttachmentWeight',id,vertex,bone:tip,value:.4});
  }
  await command(native,{type:'setActiveAttachment',slot:maskSlot,attachment:clips[0]!});
  return{root,tip,active:clips[0]!,inactive:clips[1]!};
}
async function selectWeights(page:Page,id:number,tip:number){
  await page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem').click();
  await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Weights',exact:true}).click();
  await page.getByTestId('weights-mode').selectOption('direct');
  await page.getByTestId('weights-influence').selectOption(String(tip));
  await page.getByTestId('weights-vertex').selectOption('0');
}
async function worldPoint(page:Page,x:number,y:number){
  const canvas=page.getByTestId('viewport').locator('canvas'),box=await canvas.boundingBox();expect(box).not.toBeNull();
  const zoom=await page.locator('.mode-toolbar .tabular-nums').innerText(),scale=Number(zoom.replace('%',''))/100;
  return{x:box!.x+box!.width/2+x*scale,y:box!.y+box!.height/2-y*scale};
}
async function fileAction(page:Page,name:'Close project'|'Open project'){
  const file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
  if(!await file.evaluate(node=>(node as HTMLDetailsElement).open))await file.locator('summary').click();
  await file.getByRole('button',{name:new RegExp('^'+name)}).click();
}

for(const target of ['active','inactive'] as const)test(`@native ${target} weighted clipping Direct drag, brush, undo and binary save/reopen use real Rust`,async({page,native})=>{
  const ids=await setup(native),id=ids[target];await openNativeEditor(page);await selectWeights(page,id,ids.tip);
  const initial=(await native.snapshot())!,bindings=structuredClone(attachment(initial,id).clipping!),activeBefore=activation(initial);
  await expect(page.getByTestId('weights-target')).toHaveText(target==='active'?'Active mask':'Inactive mask');
  const direct=page.getByTestId('weights-direct-number');await expect(direct).toBeEnabled();await direct.fill('37');await direct.press('Enter');
  await expect.poll(async()=>attachment((await native.snapshot())!,id).clipping!.vertices[0]!.weights[1]).toBeCloseTo(.37,6);
  let before=(await native.snapshot())!;
  // A real Playwright mouse gesture through the rendered canvas; no constructed
  // DOM PointerEvents and no Windows OS/native-WebView interaction claim.
  const start=await worldPoint(page,points[0]!.x,points[0]!.y);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x,start.y-20,{steps:8});await page.mouse.up();
  await expect.poll(async()=>attachment((await native.snapshot())!,id).clipping!.vertices[0]!.weights[1]).toBeCloseTo(.47,5);
  let after=(await native.snapshot())!;expect(after.revision).toBe(before.revision+1);
  expect(attachment(after,id).clipping!.vertices.map(v=>v.positions)).toEqual(bindings.vertices.map(v=>v.positions));expect(activation(after)).toEqual(activeBefore);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect.poll(async()=>attachment((await native.snapshot())!,id).clipping!.vertices[0]!.weights[1]).toBeCloseTo(.37,6);
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  await expect.poll(async()=>attachment((await native.snapshot())!,id).clipping!.vertices[0]!.weights[1]).toBeCloseTo(.47,5);
  await page.getByTestId('weights-mode').selectOption('replace');before=(await native.snapshot())!;
  await page.mouse.click(start.x,start.y);
  await expect.poll(async()=>attachment((await native.snapshot())!,id).clipping!.vertices[0]!.weights[1]).toBeCloseTo(.5,6);
  after=(await native.snapshot())!;expect(after.revision).toBe(before.revision+1);expect(activation(after)).toEqual(activeBefore);
  expect(attachment(after,id).clipping!.vertices.map(v=>v.positions)).toEqual(bindings.vertices.map(v=>v.positions));
  const other=id===ids.active?ids.inactive:ids.active;
  expect(attachment(after,other)).toEqual(attachment(initial,other));
  await native.queueDialog('save','clipping.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
  await fileAction(page,'Close project');await expect.poll(()=>native.snapshot()).toBeNull();
  await native.queueDialog('open','clipping.fbones');await fileAction(page,'Open project');
  await expect.poll(async()=>(await native.snapshot())?.name).toBe(initial.name);
  const reopened=(await native.snapshot())!;
  // Attachment IDs belong to the session. Reopening may allocate them in a
  // different order; compare ownership/inventory/active names and actual data.
  expect(persistedScene(reopened)).toEqual(persistedScene(after));expect(reopened.dirty).toBe(false);
});
