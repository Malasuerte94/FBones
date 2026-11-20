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

test('@native Clipping HUD keeps numeric values unavailable while its whole-attachment tools edit the inactive contour', async ({page, native}) => {
  await page.setViewportSize({width: 960, height: 640});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own contextual clipping tools', discardChanges: true});
  const root = project.bones[0]!.id;
  project = await command(native, {type: 'createSlot', bone: root, name: 'Mask alternatives'});
  const slot = project.editedSlot!;
  project = await command(native, {type: 'createSlot', bone: root, name: 'End of mask range'});
  const endSlot = project.editedSlot!;
  project = await command(native, {type: 'createClipping', slot, name: 'Active sibling mask', endSlot, convex: true, inverse: false,
    vertices: [{x: 74, y: -37}, {x: 145, y: -37}, {x: 145, y: 36}, {x: 74, y: 36}]});
  const sibling = project.editedAttachment!;
  const polygon = [{x: -86, y: -14}, {x: 34, y: -14}, {x: 34, y: 26}, {x: -86, y: 66}];
  project = await command(native, {type: 'createClipping', slot, name: 'Inactive asymmetric contour', endSlot, convex: true,
    inverse: false, vertices: polygon});
  const id = project.editedAttachment!;
  await command(native, {type: 'setActiveAttachment', slot, attachment: sibling});
  project = await command(native, {type: 'createAnimation', name: 'Clipping Deform context'});
  const animation = project.editedAnimation!;

  await openNativeEditor(page);
  const read = async () => (await native.snapshot())!;
  const before = await read();
  const start = native.calls.length;
  const writes = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  const readOnlyCalls = (from: number) => native.calls.slice(from).filter(call =>
    call.command === 'edit_rig' || call.command === 'evaluate_project');
  const hud = page.getByTestId('viewport-tool-hud');
  const panel = hud.getByTestId('viewport-attachment-transform');
  const viewport = page.getByTestId('viewport');
  const tree = page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem');
  const editGeometry = hud.getByTestId('viewport-edit-geometry');
  const vertexTools = hud.locator('[aria-label="Clipping vertex tools"]');
  const hierarchyLeaf = hud.getByTestId('viewport-selection-path-leaf');
  const modes = page.getByRole('group', {name: 'Editing mode', exact: true});
  const images = modes.getByRole('button', {name: 'Images', exact: true});
  const reset = page.getByTestId('attachment-clipping-reset');
  const freeze = page.getByTestId('attachment-clipping-freeze');

  await tree.click();
  await expect(panel).toHaveAccessibleName('Attachment transform values');
  await expect(hierarchyLeaf).toHaveAttribute('data-kind', 'clipping');
  await expect(reset).toHaveAccessibleName('Reset');
  await expect(reset).toHaveAccessibleDescription('Reset is unavailable for clipping attachments.');
  await expect(reset).toBeDisabled();
  await expect(freeze).toHaveAccessibleName('Freeze');
  await expect(freeze).toHaveAccessibleDescription('Freeze is unavailable. It keeps vertex positions and resets rotation and scale.');
  await expect(freeze).toBeDisabled();
  for (const key of ['rotation', 'x', 'y', 'scaleX', 'scaleY', 'shearX', 'shearY']) {
    const field = panel.getByTestId('viewport-attachment-' + key);
    await expect(field).toBeDisabled();
    await expect(field).toHaveValue('');
    await expect(field).toHaveAttribute('placeholder', '—');
  }
  await expect(panel.getByTestId('viewport-attachment-x')).toHaveAccessibleDescription('The numeric clipping center is unavailable.');
  await expect(panel.getByTestId('viewport-mesh-hull-center')).toHaveCount(0);
  await expect(panel.getByTestId('clipping-transform-shear')).toBeDisabled();
  await expect.poll(async () => {
    const [stage, controls] = await Promise.all([viewport.boundingBox(), panel.boundingBox()]);
    return !!stage && !!controls && controls.x >= stage.x && controls.x + controls.width <= stage.x + stage.width;
  }).toBe(true);

  for (const [tool, name] of [['rotate', 'Rotate'], ['scale', 'Scale'], ['translate', 'Translate']] as const) {
    await editGeometry.click();
    await expect(vertexTools).toBeVisible();
    const button = panel.getByTestId('clipping-transform-' + tool);
    await expect(button).toHaveAccessibleName(name);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(images).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(vertexTools).toHaveCount(0);
    await expect(hud.getByRole('button', {name, exact: true})).toHaveCount(1);
    await expect(tree).toHaveAttribute('aria-selected', 'true');
  }
  expect(await read()).toEqual(before);
  expect(readOnlyCalls(start)).toHaveLength(0);

  const canvas = viewport.locator('canvas');
  await expect.poll(() => canvas.evaluate(node =>
    node.clientWidth === node.parentElement?.clientWidth && node.clientHeight === node.parentElement?.clientHeight)).toBe(true);
  // The existing FBones whole-contour gizmo is centered on these four points.
  // At this viewport size the HUD covers the initial center. Pan it into view.
  const center = await worldPoint(page, -26, 16);
  const panStart = {x: center.x, y: center.y - 80};
  const panEnd = {x: panStart.x, y: panStart.y - 120};
  const hitsCanvas = (point: {x: number; y: number}) => canvas.evaluate((node, at) =>
    document.elementFromPoint(at.x, at.y) === node, point);
  await expect.poll(() => hitsCanvas(panStart)).toBe(true);
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down({button: 'right'});
  await page.mouse.move(panEnd.x, panEnd.y, {steps: 6});
  await page.mouse.up({button: 'right'});
  const origin = {x: center.x, y: center.y + panEnd.y - panStart.y};
  await expect.poll(() => hitsCanvas(origin)).toBe(true);
  const dx = 19, dy = 13;
  await page.mouse.move(origin.x, origin.y);
  await expect(canvas).toHaveCSS('cursor', 'move');
  await page.mouse.down();
  await page.mouse.move(origin.x + dx, origin.y - dy, {steps: 6});
  expect(await read()).toEqual(before);
  expect(writes()).toHaveLength(0);
  await page.mouse.up();
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const moved = await read();
  expect(writes()).toHaveLength(1);
  expect(writes()[0]!.args).toMatchObject({expectedRevision: before.revision,
    edit: {type: 'transformAttachments', ids: [id], mode: 'translate', dx, dy}});
  expect(activation(moved)).toEqual(activation(before));
  expect(attachment(moved, sibling)).toEqual(attachment(before, sibling));
  const original = attachment(before, id);
  const translated = original.clipping!.vertices.map(vertex => ({...vertex,
    positions: [vertex.positions[0]! + dx, vertex.positions[1]! + dy]}));
  expect(attachment(moved, id)).toEqual({...original, clipping: {...original.clipping, vertices: translated}});
  await expect(tree).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read()).slots).toEqual(before.slots);
  await expect(tree).toHaveAttribute('aria-selected', 'true');
  expect(writes().map(call => (call.args.edit as RigEdit).type)).toEqual(['transformAttachments', 'undo']);
  const undone = await read();
  const afterUndo = native.calls.length;
  const filter = page.getByTestId('tree-filter-attachment');
  await filter.click();
  await expect(panel).toHaveCount(0);
  await expect(tree).toHaveCount(0);
  await expect(hierarchyLeaf).toHaveText('Inactive asymmetric contour');
  await filter.click();
  await expect(panel).toBeVisible();
  await expect(tree).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await tree.click();
  await modes.getByRole('button', {name: 'Meshes', exact: true}).click();
  await expect(hud.getByTestId('viewport-deform-key')).toBeEnabled();
  await expect(panel).toHaveCount(0);
  await expect(reset).toHaveCount(0);
  await expect(freeze).toHaveCount(0);
  expect(await read()).toEqual(undone);
  expect(readOnlyCalls(afterUndo)).toHaveLength(0);
});

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
