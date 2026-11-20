import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import {readFile} from 'node:fs/promises';
import type {ConstraintInput,ProjectSummary,RigEdit} from '../../src/domain/project';
import type {Locator,Page} from '@playwright/test';
async function edit(native:NativeSession,edit:RigEdit){const p=(await native.snapshot())!;return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit});}
async function fixture(native:NativeSession,constraints=true){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Docked constraint views',discardChanges:true});const root=p.bones[0]!.id;
 p=await edit(native,{type:'create',parent:root,x:35,y:0,rotation:0,length:30});const member=p.editedBone!;
 p=await edit(native,{type:'create',parent:root,x:-25,y:55,rotation:0,length:10});const source=p.editedBone!;
 if(constraints){
  const mapping:ConstraintInput={type:'transform',name:'Transform one',source,bones:[member],localSource:true,localTarget:true,additive:false,clamp:false,offsets:[0,0,0,0,0,0],mix:[0,0,0,0,0,0],properties:[{property:'x',offset:0,to:[{property:'rotate',offset:0,max:1,scale:1}]}]};
  for(const c of [mapping,{...mapping,name:'Transform two'},{type:'ik',name:'IK one',bones:[member],target:source,mix:0,softness:0,bendPositive:true,compress:false,stretch:false},{type:'physics',name:'Physics one',bone:member,x:0,y:0,scaleX:0,rotate:null,shearX:0,step:1/60,inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}] satisfies ConstraintInput[])p=await edit(native,{type:'addConstraint',constraint:c});
 }
 return{root,member,source,project:p};
}
async function views(page:Page){const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^Views$/})});if(!await menu.evaluate(e=>(e as HTMLDetailsElement).open))await menu.locator('summary').click();return menu;}
async function toggle(page:Page,id:string,checked=true){await views(page);await page.getByTestId('view-toggle-'+id).setChecked(checked);await page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^Views$/})}).locator('summary').click();}
const panel=(page:Page,id:string)=>page.getByTestId('dock-panel-'+id);
async function dragPanel(page:Page,id:string,target:string){
 const handle=page.getByTestId('dock-drag-'+id);await handle.scrollIntoViewIfNeeded();const b=(await handle.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-8,b.y+b.height/2+8,{steps:3});await expect(page.getByTestId('dock-drag-preview')).toBeVisible();
 const drop=page.getByTestId(target);await drop.scrollIntoViewIfNeeded();const destination=JSON.parse((await drop.getAttribute('data-dock-drop'))!) as {column:string;split?:string};const d=(await drop.boundingBox())!;await page.mouse.move(d.x+d.width/2,d.y+d.height/2,{steps:8});await page.mouse.up();await expect(page.getByTestId('dock-drag-preview')).toHaveCount(0);
 await expect(panel(page,id),'moved panel content remains connected to the document').toBeVisible();
 if(!destination.split)await expect(page.locator(`[data-dock-column="${destination.column}"]`).getByTestId('dock-panel-'+id),'content is inside the actual destination column').toBeVisible();
}
function changes(native:NativeSession,start:number){return native.calls.slice(start).filter(c=>c.command==='edit_rig');}

test('@native Views opens existing type panels without creating constraints or changing Tree selection; empty view has a real New flow',async({page,native})=>{
 const f=await fixture(native,false);await openNativeEditor(page);await page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`).getByRole('treeitem').click();const before=(await native.snapshot())!,start=native.calls.length;
 for(const type of ['ik','transform','physics']){await toggle(page,type);await expect(panel(page,type).getByText(`No ${type==='ik'?'IK constraint':type==='transform'?'Transform constraint':'Physics constraint'} exists in this project.`,{exact:true})).toBeVisible();}
 expect(await native.snapshot()).toEqual(before);expect(changes(native,start)).toHaveLength(0);await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`)).toHaveClass(/selected/);
 await panel(page,'physics').getByRole('button',{name:'New Physics constraint',exact:true}).last().click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>(await native.snapshot())!.constraints!.length).toBe(1);const added=(await native.snapshot())!;expect(added.constraints![0]!.type).toBe('physics');expect(added.constraints![0]!.type==='physics'&&added.constraints![0]!.bone).toBe(f.member);expect(added.revision).toBe(before.revision+1);expect(changes(native,start)).toHaveLength(1);expect((changes(native,start)[0]!.args.edit as {type:string}).type).toBe('addPhysicsToBones');expect(added.bones).toEqual(before.bones);
});

test('@native simultaneous explicit constraint inspectors and nested mappings edit their own stable IDs while Tree selects a bone',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`).getByRole('treeitem').click();const before=(await native.snapshot())!;
 const transforms=before.constraints!.filter(c=>c.type==='transform');
 for(const type of ['ik','transform','physics'])await toggle(page,type);
 await panel(page,'transform').getByRole('combobox',{name:'Constraint',exact:true}).selectOption(String(transforms[1]!.id));
 const start=native.calls.length,field=panel(page,'transform').getByTestId('transform-mix-0');await field.fill('37');await field.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.id===transforms[1]!.id);return c?.type==='transform'?c.mix[0]:null;}).toBeCloseTo(.37,5);
 const from=panel(page,'transform').getByTestId('transform-range-4');await from.fill('12');await from.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.id===transforms[1]!.id);return c?.type==='transform'?c.properties[0]!.offset:null;}).toBe(12);
 const wind=panel(page,'physics').getByTestId('physics-wind');await wind.fill('9');await wind.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.type==='physics');return c?.type==='physics'?c.wind:null;}).toBe(9);
 const mix=panel(page,'ik').getByTestId('constraint-mix');await mix.fill('25');await mix.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.type==='ik');return c?.type==='ik'?c.mix:null;}).toBe(.25);
 expect((await native.snapshot())!.constraints!.find(c=>c.id===transforms[0]!.id)).toEqual(transforms[0]);await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`)).toHaveClass(/selected/);
 const ids=changes(native,start).map(c=>(c.args.edit as {id:number}).id);expect(ids.slice(0,2)).toEqual([transforms[1]!.id,transforms[1]!.id]);
});

test('@native panel header drag reorders/splits, both resize axes persist and Reset recovers without project edits',async({page,native})=>{
 await fixture(native,false);await openNativeEditor(page);await toggle(page,'weights');await toggle(page,'mesh');const before=(await native.snapshot())!,start=native.calls.length;
 await dragPanel(page,'mesh','dock-drop-before-tree');const order=await page.locator('[data-dock-column="scene"] [data-testid^="dock-panel-"]').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('data-testid')));expect(order).toEqual(['dock-panel-mesh','dock-panel-tree','dock-panel-properties']);
 await dragPanel(page,'weights','dock-drop-left-scene');await expect(page.locator('[data-dock-column="split-weights"]')).toBeVisible();
 const tree=panel(page,'tree'),height=(await tree.boundingBox())!.height,handle=page.getByTestId('dock-height-tree');await handle.scrollIntoViewIfNeeded();const hb=(await handle.boundingBox())!;await page.mouse.move(hb.x+30,hb.y+2);await page.mouse.down();await page.mouse.move(hb.x+30,hb.y+47,{steps:8});await page.mouse.up();await expect.poll(async()=>(await tree.boundingBox())!.height).toBeGreaterThan(height+25);
 const width=page.getByTestId('dock-width-scene'),oldWidth=await width.getAttribute('aria-valuenow');await width.focus();await page.keyboard.press('ArrowLeft');expect(Number(await width.getAttribute('aria-valuenow'))).toBe(Number(oldWidth)+16);
 const weightsColumn=page.locator('[data-dock-column="split-weights"]');
 const weightsWidth=page.getByTestId('dock-width-split-weights');
 await weightsWidth.press('ArrowLeft');
 const chosenWidth=await weightsWidth.getAttribute('aria-valuenow');
 const viewport=page.getByTestId('viewport');
 const stageWidth=(await viewport.boundingBox())!.width;
 const persisted=await page.evaluate(()=>localStorage.getItem('fbones.dock-layout.v1'));expect(persisted).toContain('split-weights');
 await page.getByTestId('dock-pane-actions-weights').click({button:'right'});
 await expect(weightsColumn).toHaveCount(0);
 await expect.poll(async()=>(await viewport.boundingBox())!.width).toBeGreaterThan(stageWidth+100);
 await page.getByTestId('restore-dock-weights').click();
 await expect(weightsColumn.getByTestId('dock-panel-weights')).toBeVisible();
 await expect(weightsWidth).toHaveAttribute('aria-valuenow',chosenWidth!);
 await expect.poll(async()=>(await viewport.boundingBox())!.width).toBeCloseTo(stageWidth,0);
 await page.reload();await expect(weightsColumn).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('fbones.dock-layout.v1'))).toBe(persisted);
 await views(page);await page.getByTestId('reset-layout').click();await expect(page.locator('[data-dock-column="scene"]')).toBeVisible();await expect(page.locator('[data-dock-column="split-weights"]')).toHaveCount(0);expect(await native.snapshot()).toEqual(before);expect(changes(native,start)).toHaveLength(0);
});

test('@native F9 and the title control temporarily hide docked views without changing the saved layout or animation', async ({page, native}) => {
  const {member} = await fixture(native, false);
  let project = await edit(native, {type: 'createAnimation', name: 'Own minimized Graph'});
  const animation = project.editedAnimation!;
  project = await edit(native, {type: 'setAnimationKeys', animation, keys: [
    {bone: member, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: member, channel: 'translate', frame: 240, values: [60, 15], curve: 'linear'},
  ]});
  const firstKey = project.animations!.find(clip => clip.id === animation)!.tracks
    .find(track => track.bone === member && track.channel === 'translate')!.keys[0]!.id;

  await openNativeEditor(page);
  await native.queueDialog('save', 'minimized-docked-views.fbones');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())?.dirty).toBe(false);
  const saved = (await native.snapshot())!;
  const bytes = await readFile(saved.path!);
  const start = native.calls.length;
  const titleToggle = page.getByTestId('minimize-docked-views');
  const docks = page.getByTestId('dock-workspace');
  const viewport = page.getByTestId('viewport');
  const selectionPath = page.getByTestId('viewport-selection-path');
  const tree = page.locator(`[data-tree-kind="bone"][data-tree-id="${member}"]`).getByRole('treeitem');
  const sceneWidth = page.getByTestId('dock-width-scene');
  const box = async (item: Locator) => (await item.boundingBox())!;
  const layoutPrefs = () => page.evaluate(() => [
    localStorage.getItem('fbones.dock-layout.v1'),
    localStorage.getItem('fbones.animate-dock-layout.v1'),
    localStorage.getItem('fbones.animation-height'),
  ]);
  const isMinimized = async (minimized: boolean) => {
    await expect(titleToggle).toHaveAttribute('aria-pressed', String(minimized));
    await expect(titleToggle).toHaveAttribute('title', minimized ? 'Restore docked views (F9)' : 'Minimize docked views (F9)');
    if (minimized) await expect(docks).toBeHidden();
    else await expect(panel(page, 'tree')).toBeVisible();
    await expect(viewport.locator('canvas')).toBeVisible();
    await expect(selectionPath).toBeVisible();
  };

  await tree.click();
  await toggle(page, 'mesh', false);
  await sceneWidth.press('ArrowLeft');
  const setupWidth = await sceneWidth.getAttribute('aria-valuenow');
  const setupViewport = await box(viewport);
  const setupPrefs = (await layoutPrefs())[0];
  expect(setupPrefs).not.toBeNull();
  await expect(panel(page, 'mesh')).toBeHidden();
  await expect(titleToggle).toHaveAccessibleName('Minimize docked views');
  await expect(titleToggle).toHaveAttribute('aria-keyshortcuts', 'F9');
  await isMinimized(false);

  const rotation = page.getByTestId('animation-tools').getByTestId('bone-rotation');
  await rotation.fill('+2.5');
  await page.keyboard.press('F9');
  await isMinimized(false);
  await titleToggle.click();
  await isMinimized(false);
  await expect(rotation).toBeFocused();
  await expect(rotation).toHaveValue('+2.5');
  await rotation.press('Escape');
  await expect(rotation).toHaveValue('0');

  await titleToggle.click();
  await isMinimized(true);
  await expect.poll(async () => (await box(viewport)).width).toBeGreaterThan(setupViewport.width + 150);
  expect((await layoutPrefs())[0]).toBe(setupPrefs);
  await page.keyboard.down('F9');
  try {
    await isMinimized(false);
    await page.keyboard.down('F9');
    await isMinimized(false);
  } finally {
    await page.keyboard.up('F9');
  }
  await expect(sceneWidth).toHaveAttribute('aria-valuenow', setupWidth!);
  await expect(panel(page, 'mesh')).toBeHidden();
  await expect.poll(async () => (await box(viewport)).width).toBeCloseTo(setupViewport.width, 0);
  await expect(tree).toHaveAttribute('aria-selected', 'true');

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(panel(page, 'weights')).toBeVisible();
  await toggle(page, 'weights', false);
  await sceneWidth.press('ArrowLeft');
  await sceneWidth.press('ArrowLeft');
  const animateWidth = await sceneWidth.getAttribute('aria-valuenow');
  const timeline = page.getByTestId('animation-timeline');
  const graph = page.getByTestId('timeline-tab-graph');
  const key = page.getByTestId(`timeline-graph-key-${firstKey}-0`);
  const current = page.getByTestId('timeline-current');
  const play = page.getByTestId('timeline-play');
  const bar = page.getByTestId('timeline-resize');
  await graph.click();
  await key.press('Enter');
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await current.fill('11');
  await current.press('Enter');
  await expect(current).toHaveValue('11');
  await expect(play).toHaveAccessibleName('Play');
  const oldTimelineHeight = (await box(timeline)).height;
  const splitter = await box(bar);
  const splitterX = splitter.x + splitter.width / 2;
  const splitterY = splitter.y + splitter.height / 2;
  await page.mouse.move(splitterX, splitterY);
  await page.mouse.down();
  await page.mouse.move(splitterX, splitterY - 32, {steps: 6});
  await page.mouse.up();
  await expect.poll(async () => (await box(timeline)).height).toBeGreaterThan(oldTimelineHeight + 20);
  const animateTimeline = await box(timeline);
  const animateViewport = await box(viewport);
  const prefs = await layoutPrefs();
  expect(prefs.every(value => value !== null)).toBe(true);

  await titleToggle.focus();
  await page.keyboard.press('F9');
  await isMinimized(true);
  await expect(timeline).toHaveCount(1);
  await expect(timeline).toBeHidden();
  await expect(bar).toBeHidden();
  await expect(current).toHaveValue('11');
  await expect.poll(async () => (await box(viewport)).width).toBeGreaterThan(animateViewport.width + 150);
  await expect.poll(async () => (await box(viewport)).height).toBeGreaterThan(animateViewport.height + 50);
  expect(await layoutPrefs()).toEqual(prefs);
  await titleToggle.click();
  await isMinimized(false);
  await expect(sceneWidth).toHaveAttribute('aria-valuenow', animateWidth!);
  await expect(panel(page, 'weights')).toBeHidden();
  await expect(page.getByTestId('animation-preview')).toBeVisible();
  await expect(graph).toHaveClass(/active/);
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('11');
  await expect(play).toHaveAccessibleName('Play');
  await expect.poll(async () => (await box(timeline)).height).toBeCloseTo(animateTimeline.height, 0);
  await expect.poll(async () => (await box(viewport)).width).toBeCloseTo(animateViewport.width, 0);

  await play.click();
  await expect(play).toHaveAccessibleName('Pause');
  await page.keyboard.press('F9');
  await isMinimized(true);
  const hiddenFrame = Number(await current.inputValue());
  await expect.poll(async () => Number(await current.inputValue())).toBeGreaterThan(hiddenFrame);
  await titleToggle.click();
  await isMinimized(false);
  await expect(play).toHaveAccessibleName('Pause');
  await play.click();
  await expect(play).toHaveAccessibleName('Play');

  await page.keyboard.press('F9');
  await isMinimized(true);
  await page.getByTestId('editor-mode-setup').click();
  await isMinimized(true);
  await titleToggle.click();
  await isMinimized(false);
  await expect(sceneWidth).toHaveAttribute('aria-valuenow', setupWidth!);
  await expect(panel(page, 'mesh')).toBeHidden();
  await expect(tree).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => (await box(viewport)).width).toBeCloseTo(setupViewport.width, 0);
  expect(await layoutPrefs()).toEqual(prefs);
  expect(await native.snapshot()).toEqual(saved);
  expect(await readFile(saved.path!)).toEqual(bytes);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});

test('@native individual pane minimization restores the same dock slot and stays separate from F9 and Close', async ({page, native}) => {
  await page.setViewportSize({width: 1440, height: 900});
  const {member} = await fixture(native, false);
  await openNativeEditor(page);
  await native.queueDialog('save', 'individual-minimized-view.fbones');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())?.dirty).toBe(false);
  const saved = (await native.snapshot())!;
  const memberName = saved.bones.find(bone => bone.id === member)!.name;
  const bytes = await readFile(saved.path!);
  const start = native.calls.length;
  const scene = page.locator('[data-dock-column="scene"]');
  const sceneWidth = page.getByTestId('dock-width-scene');
  const treePane = panel(page, 'tree');
  const properties = panel(page, 'properties');
  const memberRow = treePane.locator(`[data-tree-kind="bone"][data-tree-id="${member}"]`).getByRole('treeitem');
  const search = treePane.getByRole('searchbox');
  const name = properties.getByTestId('bone-name');
  const actions = (id: string) => page.getByTestId('dock-pane-actions-' + id);
  const minimize = page.getByTestId('dock-minimize-tree');
  const close = page.getByTestId('dock-close-tree');
  const strip = page.getByTestId('minimized-docked-views');
  const restore = strip.getByTestId('restore-dock-tree');
  const globalToggle = page.getByTestId('minimize-docked-views');
  const viewport = page.getByTestId('viewport');
  const path = page.getByTestId('viewport-selection-path-leaf');
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  const preference = () => page.evaluate(() => localStorage.getItem('fbones.dock-layout.v1'));
  const order = () => scene.locator('[data-testid^="dock-panel-"]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-testid')));

  await memberRow.click();
  await toggle(page, 'mesh');
  await actions('mesh').press('Enter');
  await page.getByTestId('dock-close-mesh').press('Enter');
  await expect(panel(page, 'mesh')).toBeHidden();
  await expect(page.getByTestId('restore-dock-mesh')).toHaveCount(0);
  await dragPanel(page, 'properties', 'dock-drop-before-tree');
  await page.getByTestId('dock-height-tree').press('ArrowUp');
  await sceneWidth.press('ArrowLeft');
  await search.fill(memberName);
  await expect(memberRow).toHaveAttribute('aria-selected', 'true');
  await expect(name).toHaveValue(memberName);
  await expect.poll(order).toEqual(['dock-panel-properties', 'dock-panel-tree']);
  const layouts = await preference();
  expect(layouts).not.toBeNull();
  const sibling = await box(properties);
  const height = (await box(treePane)).height;
  const width = await sceneWidth.getAttribute('aria-valuenow');
  const stageWidth = (await box(viewport)).width;
  const expectSiblings = async () => {
    await expect(properties).toBeVisible();
    await expect(name).toHaveValue(memberName);
    await expect(path).toHaveText(memberName);
    await expect.poll(() => box(properties)).toEqual(sibling);
    await expect(sceneWidth).toHaveAttribute('aria-valuenow', width!);
    await expect.poll(async () => (await box(viewport)).width).toBeCloseTo(stageWidth, 0);
    await expect(panel(page, 'mesh')).toBeHidden();
  };

  await expect(actions('tree')).toHaveAccessibleName('Panel actions for Tree');
  const rotation = page.getByTestId('animation-tools').getByTestId('bone-rotation');
  await rotation.fill('+2.5');
  await actions('tree').click();
  await expect(minimize).toHaveCount(0);
  await actions('tree').click({button: 'right'});
  await expect(treePane).toBeVisible();
  await expect(rotation).toBeFocused();
  await expect(rotation).toHaveValue('+2.5');
  await rotation.press('Escape');
  await actions('tree').press('Enter');
  const menu = page.getByRole('menu').filter({has: minimize});
  await expect(menu).toBeVisible();
  await expect(minimize).toHaveText('Minimize');
  await expect(minimize).toHaveAccessibleName('Minimize Tree panel');
  await expect(close).toHaveText('Close');
  await expect(close).toHaveAccessibleName('Close Tree panel');
  await page.keyboard.press('End');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(actions('tree')).toBeFocused();

  await actions('tree').press('Enter');
  await minimize.press('Enter');
  await expect(treePane).toBeHidden();
  await expect(strip).toHaveAccessibleName('Minimized panels');
  await expect(restore).toHaveAccessibleName('Restore Tree panel');
  await expect(restore).toBeFocused();
  await expect.poll(order).toEqual(['dock-panel-properties']);
  await expectSiblings();
  expect(await preference()).toBe(layouts);
  await page.keyboard.press('F9');
  await expect(globalToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(properties).toBeHidden();
  await expect(restore).toBeHidden();
  await page.keyboard.press('F9');
  await expect(globalToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(restore).toBeVisible();
  await expect(treePane).toBeHidden();
  await expectSiblings();
  expect(await preference()).toBe(layouts);
  await restore.press('Enter');
  await expect(actions('tree')).toBeFocused();
  await expect(restore).toHaveCount(0);
  await expect(search).toHaveValue(memberName);
  await expect(memberRow).toHaveAttribute('aria-selected', 'true');
  await expect.poll(order).toEqual(['dock-panel-properties', 'dock-panel-tree']);
  await expect.poll(async () => (await box(treePane)).height).toBeCloseTo(height, 0);
  await expectSiblings();

  await actions('tree').click({button: 'right'});
  await expect(restore).toBeFocused();
  await expect(treePane).toBeHidden();
  await page.getByTestId('editor-mode-animate').click();
  await expect(treePane).toBeVisible();
  await expect(restore).toHaveCount(0);
  await page.getByTestId('editor-mode-setup').click();
  await expect(treePane).toBeHidden();
  await expect(restore).toBeVisible();
  await views(page);
  await expect(page.getByTestId('view-toggle-tree')).toBeChecked();
  await toggle(page, 'tree', false);
  await expect(restore).toHaveCount(0);
  await expect(treePane).toBeHidden();
  expect(await preference()).not.toBe(layouts);
  await toggle(page, 'tree', true);
  await expect(treePane).toBeVisible();
  await expect(restore).toHaveCount(0);
  await expect.poll(order).toEqual(['dock-panel-properties', 'dock-panel-tree']);
  await expect.poll(async () => (await box(treePane)).height).toBeCloseTo(height, 0);
  await expect(memberRow).toHaveAttribute('aria-selected', 'true');
  await expectSiblings();
  expect(await preference()).toBe(layouts);
  expect(await native.snapshot()).toEqual(saved);
  expect(await readFile(saved.path!)).toEqual(bytes);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});

test('@native relocating a constraint panel flushes its active field once and Save waits; hiding and reopening retains the explicit target',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await toggle(page,'transform');const ids=f.project.constraints!.filter(c=>c.type==='transform').map(c=>c.id);const view=panel(page,'transform');await view.getByRole('combobox',{name:'Constraint',exact:true}).selectOption(String(ids[1]));
 const field=view.getByTestId('constraint-name');await field.fill('Moved draft constraint');const start=native.calls.length;await dragPanel(page,'transform','dock-drop-before-tree');await expect.poll(async()=>(await native.snapshot())!.constraints!.find(c=>c.id===ids[1])?.name).toBe('Moved draft constraint');expect(changes(native,start)).toHaveLength(1);
 await toggle(page,'transform',false);await toggle(page,'transform',true);await expect(panel(page,'transform').getByTestId('constraint-name')).toHaveValue('Moved draft constraint');await expect(panel(page,'transform').getByRole('combobox',{name:'Constraint',exact:true})).toHaveValue(String(ids[1]));
 await native.queueDialog('save','docked-constraints.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);expect((await native.snapshot())!.constraints!.find(c=>c.id===ids[0])?.name).toBe('Transform one');
});
