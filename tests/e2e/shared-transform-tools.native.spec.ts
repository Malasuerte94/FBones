import {test,expect,openNativeEditor} from './fixtures/native-session';
import type {BoneView, ProjectSummary, RigEdit} from '../../src/domain/project';

test('@native central transform rows work in Setup and Animate with separate authoring and no duplicate HUD',async({page,native},info)=>{
 let project=await native.invoke<ProjectSummary>('create_project',{name:'Own shared transform tools',discardChanges:true});
 project=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:project.revision,edit:{type:'create',parent:project.bones[0]!.id,x:31,y:8,rotation:17,length:45}});
 const id=project.editedBone!;await openNativeEditor(page);await page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem').click();
 const tools=page.getByTestId('animation-tools');await expect(tools).toHaveAttribute('aria-label','Setup transform tools');await expect(tools.locator('.animation-transform-row')).toHaveCount(5);await expect(page.getByTestId('bone-x')).toHaveCount(1);await expect(page.getByTestId('animate-auto-key')).toHaveCount(0);await expect(tools.getByRole('button',{name:'Key Translate',exact:true})).toHaveCount(0);
 await tools.getByTestId('bone-axes-parent').press('Space');await expect(page.getByTestId('bone-x')).toHaveAccessibleName('Parent X');
 for(const [field,value]of [['x',47.25],['length',55],['scaleX',1.375]]as const){const input=page.getByTestId('bone-'+field);await input.fill(String(value));await input.press('Enter');await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===id)![field]).toBe(value);}
 const setup=(await native.snapshot())!;await page.screenshot({path:info.outputPath('setup-shared-transform-tools.png')});
 await page.getByTestId('editor-mode-animate').click();await expect(tools).toHaveAttribute('aria-label','Animation transform tools');await expect(tools.locator('.animation-transform-row')).toHaveCount(4);await expect(page.getByTestId('animate-bone-x')).toHaveValue('47.25');await tools.getByRole('button',{name:'Key Translate',exact:true}).click();
 const frame=page.getByTestId('timeline-current');await frame.fill('10');await frame.press('Enter');const x=page.getByTestId('animate-bone-x');await x.fill('72.25');await x.press('Enter');await expect.poll(async()=>(await native.snapshot())!.animations![0]!.tracks[0]!.keys.length).toBe(2);expect((await native.snapshot())!.bones).toEqual(setup.bones);
 await page.getByTestId('editor-mode-setup').click();await expect(tools).toHaveAttribute('aria-label','Setup transform tools');await expect(page.getByTestId('bone-x')).toHaveValue('47.25');await expect(page.getByTestId('bone-length')).toHaveValue('55');await expect(page.getByTestId('bone-scaleX')).toHaveValue('1.375');expect((await native.snapshot())!.bones).toEqual(setup.bones);await expect(page.getByTestId('animation-timeline')).toHaveCount(0);
 const viewport=(await page.getByTestId('viewport').boundingBox())!,hud=(await tools.boundingBox())!;expect(hud.x).toBeGreaterThanOrEqual(viewport.x);expect(hud.x+hud.width).toBeLessThanOrEqual(viewport.x+viewport.width+1);await expect(tools.getByRole('button',{name:'Create',exact:true})).toBeEnabled();
});

test('@native fractional frame seek and manual key preserve the exact f32 bone endpoint and outgoing Bezier',async({page,native})=>{
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own fractional frame identity',discardChanges:true});const root=p.bones[0]!.id;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'createAnimation',name:'Fractional'}});const animation=p.editedAnimation!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'setAnimationKeys',animation,keys:[{bone:root,channel:'translate',frame:.3,values:[17.75,0],curve:'bezier',controls:[[.4,17.75,.5,100000],[.4,0,.5,0]]},{bone:root,channel:'translate',frame:.6,values:[100000,0],curve:'linear'}]}});
 const authored=p.animations!.find(a=>a.id===animation)!.tracks[0]!.keys;
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(animation));await page.locator(`[data-tree-kind="bone"][data-tree-id="${root}"]`).getByRole('treeitem').click();const frame=page.getByTestId('timeline-current');await frame.fill(String(.1+.2));await frame.press('Enter');await expect(frame).toHaveValue('0.3');await expect(page.getByTestId('animate-bone-x')).toHaveValue('17.75');
 const before=(await native.snapshot())!;await page.getByTestId('animation-tools').getByRole('button',{name:'Key Translate',exact:true}).click();await expect(page.getByTestId('animation-tools').getByRole('button',{name:'Key Translate',exact:true})).toBeEnabled();const after=(await native.snapshot())!;expect(after.revision).toBe(before.revision);expect(after.animations!.find(a=>a.id===animation)!.tracks[0]!.keys).toEqual(authored);expect(after.bones).toEqual(before.bones);
});

test('@native replacing a compact fractional value after focus commits exactly the typed local working value',async({page,native})=>{
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own precise focus replacement',discardChanges:true});
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'create',parent:p.bones[0]!.id,x:-30,y:0,rotation:0,length:30}});const bone=p.editedBone!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'createAnimation',name:'Own repeating decimal sample'}});const animation=p.editedAnimation!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'setAnimationKeys',animation,keys:[{bone,channel:'translate',frame:0,values:[0,0],curve:'linear'},{bone,channel:'translate',frame:30,values:[20,10],curve:'linear'}]}});
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(animation));await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();await page.getByTestId('timeline-auto-key').click();
 const frame=page.getByTestId('timeline-current');await frame.fill('8');await frame.press('Enter');const x=page.getByTestId('animate-bone-x'),y=page.getByTestId('animate-bone-y'),canvas=page.getByTestId('viewport').locator('canvas');
 await expect(x).toHaveValue(String(-30+20*(8/30)));await expect(x.locator('..').locator('.animation-transform-compact')).toHaveText('-24.6667');await canvas.focus();const before=(await native.snapshot())!,calls=native.calls.length;
 // fill selects the previous contents immediately after focus. An asynchronous
 // compact→precise value rewrite used to erase that selection and append11.
 await x.fill('11');await expect(x).toHaveValue('11');await x.press('Enter');await expect(x).toHaveValue('11');
 await y.focus();await expect(y).toHaveValue(String(10*8/30));await expect(y.locator('..').locator('.animation-transform-compact')).toBeHidden();await canvas.focus();await expect(y).toHaveValue(String(10*8/30));await expect(y.locator('..').locator('.animation-transform-compact')).toHaveText('2.66667');await expect(y.locator('..').locator('.animation-transform-compact')).toBeVisible();
 await x.fill('999');await x.press('Escape');await expect(x).toHaveValue('11');expect(await native.snapshot()).toEqual(before);expect(native.calls.slice(calls).filter(call=>call.command==='edit_rig')).toHaveLength(0);
});

test('@native relative Setup transforms use the active axis and preserve drafts through Tab, Escape, and Save', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own relative Setup transforms', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({...root, type: 'update', x: 19.25, y: -10.5, rotation: 90, scaleX: 3, scaleY: 2});
  await edit({type: 'create', parent: root.id, x: 3, y: 4.5, rotation: 7.5, length: 28});
  const id = project.editedBone!;
  const bone = (snapshot: ProjectSummary) => snapshot.bones.find(item => item.id === id)!;
  await edit({...bone(project), type: 'update', scaleX: -1.25});

  await openNativeEditor(page);
  const selected = page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  await selected.click();
  const tools = page.getByTestId('animation-tools');
  const world = tools.getByTestId('bone-axes-world');
  const x = tools.getByTestId('bone-x');
  const y = tools.getByTestId('bone-y');
  const save = page.getByRole('button', {name: 'Save', exact: true});
  const read = async () => (await native.snapshot())!;
  const changes = (from: number) => native.calls.slice(from).filter(call => call.command === 'edit_rig');
  const expectCoordinate = async (locator: typeof x, value: number) => {
    await expect.poll(async () => Number(await locator.inputValue())).toBeCloseTo(value, 6);
  };
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  await world.press('Space');
  await expect(x).toHaveAccessibleName('World X');
  await expect(y).toHaveAccessibleName('World Y');
  // The nonuniform parent maps child (3, 4.5) to world (10.25, -1.5).
  await expectCoordinate(x, 10.25);
  await expectCoordinate(y, -1.5);
  const before = await read();
  const firstCall = native.calls.length;
  const rotation = tools.getByTestId('bone-rotation');
  await rotation.fill('45');
  await rotation.fill('+0');
  await rotation.press('Enter');
  await expect(rotation).toHaveValue('7.5');
  expect(changes(firstCall)).toHaveLength(0);
  await x.fill('+2.5');
  await x.press('Tab');
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const moved = await read();
  expect(changes(firstCall).map(call => call.args)).toEqual([
    {expectedRevision: before.revision, edit: {type: 'setBoneWorldPosition', id, axis: 'x', position: 12.75}},
  ]);
  expect(moved.bones).toEqual(before.bones.map(item => item.id === id ? {...item, y: 3.25} : item));
  await expectCoordinate(x, 12.75);
  await expectCoordinate(y, -1.5);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read()).bones).toEqual(before.bones);
  await expectCoordinate(x, 10.25);
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  expect(changes(firstCall).map(call => (call.args.edit as RigEdit).type)).toEqual(['setBoneWorldPosition', 'undo']);

  await native.queueDialog('save', 'relative-setup.fbones');
  const restored = await read();
  const invalidStart = native.calls.length;
  await x.fill('/0');
  await x.press('Tab');
  const error = tools.getByText('Enter a finite number or one operation such as +5, +-5, *2, or /2. Use a nonzero divisor.', {exact: true});
  await expect(error).toBeVisible();
  await expect(y).toBeFocused();
  await save.click();
  await expect(error).toBeVisible();
  await expect(x).toHaveValue('/0');
  expect(await read()).toEqual(restored);
  expect(native.calls.slice(invalidStart).filter(call => call.command === 'edit_rig' || call.command === 'save_project')).toHaveLength(0);
  await x.press('Escape');
  await expect(error).toHaveCount(0);
  await expectCoordinate(x, 10.25);

  await tools.getByRole('button', {name: 'Scale', exact: true}).click();
  await world.press('Space');
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  const scaleX = tools.getByTestId('bone-scaleX');
  await expect(scaleX).toHaveAccessibleName('Local scale X');
  const worldReadout = tools.getByTestId('world-scale-x-readout');
  await expect(worldReadout).toBeVisible();
  await expect(worldReadout).not.toHaveText('-1.25');
  await expect(scaleX).toHaveValue('-1.25');
  const scaleStart = native.calls.length;
  await scaleX.fill('*2');
  await save.click();
  await expect.poll(async () => (await read()).dirty).toBe(false);
  const saved = await read();
  expect(saved.bones).toEqual(restored.bones.map(item => item.id === id ? {...item, scaleX: -2.5} : item));
  const authorSave = native.calls.slice(scaleStart).filter(call => call.command === 'edit_rig' || call.command === 'save_project');
  expect(authorSave.map(call => call.command)).toEqual(['edit_rig', 'save_project']);
  expect(authorSave[0]!.args).toMatchObject({expectedRevision: restored.revision, edit: {type: 'update', id, scaleX: -2.5}});
  expect((authorSave[0]!.result as ProjectSummary).revision).toBe(restored.revision + 1);
  await expect(scaleX).toHaveValue('-2.5');

  const stepStart = native.calls.length;
  await scaleX.press('ArrowUp');
  await expect.poll(async () => bone(await read()).scaleX).toBe(-1.5);
  await expect(scaleX).toHaveValue('-1.5');
  await scaleX.focus();
  await scaleX.hover();
  await page.mouse.wheel(0, 120);
  await expect.poll(async () => bone(await read()).scaleX).toBe(-2.5);
  expect(changes(stepStart).map(call => (call.args.edit as {scaleX: number}).scaleX)).toEqual([-1.5, -2.5]);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native Animate Local Rotate preserves full turns from relative drafts through Key, Auto Key, and reopen', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own relative full turns', discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: project.bones[0]!.id, x: 22, y: 4, rotation: 17.125, length: 36});
  const id = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Own full turns clip'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: id, channel: 'rotate', frame: 0, values: [5.375, 0], curve: 'linear'},
    {bone: id, channel: 'rotate', frame: 24, values: [5.375, 0], curve: 'linear'},
  ]});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem').click();
  const tools = page.getByTestId('animation-tools');
  await tools.getByRole('button', {name: 'Rotate', exact: true}).click();
  await expect(tools.getByTestId('bone-axes-local')).toHaveAttribute('aria-pressed', 'true');
  const auto = page.getByTestId('timeline-auto-key');
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await auto.click();
  const current = page.getByTestId('timeline-current');
  const seek = async (frame: number) => {
    await current.fill(String(frame));
    await current.press('Enter');
    await expect(current).toHaveValue(String(frame));
  };
  const rotation = tools.getByTestId('animate-bone-rotation');
  const read = async () => (await native.snapshot())!;
  const keys = (model: ProjectSummary) => model.animations!.find(clip => clip.name === 'Own full turns clip')!
    .tracks.find(track => track.channel === 'rotate')!.keys;
  const writes = (from: number) => native.calls.slice(from).filter(call => call.command === 'edit_rig');
  await seek(12);
  await expect(rotation).toHaveValue('22.5');
  const before = await read();
  const start = native.calls.length;
  for (const expected of ['382.5', '742.5']) {
    await rotation.fill('+360');
    await rotation.press('Enter');
    await expect(rotation).toHaveValue(expected);
    expect(await read()).toEqual(before);
    expect(writes(start)).toHaveLength(0);
  }

  await tools.getByRole('button', {name: 'Key Rotate', exact: true}).click();
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const manual = await read();
  const manualCalls = writes(start);
  expect(manualCalls).toHaveLength(1);
  expect(manualCalls[0]!.args).toMatchObject({expectedRevision: before.revision,
    edit: {type: 'setAnimationKeys', animation, keys: [{bone: id, channel: 'rotate', frame: 12, values: [725.375, 0]}]}});
  expect(manualCalls[0]!.args.poseEpoch).toBeUndefined();
  expect(manualCalls[0]!.args.boneAutoKey).toBeUndefined();
  expect(keys(manual).filter(key => key.frame !== 12)).toEqual(keys(before));
  expect(keys(manual).find(key => key.frame === 12)?.values).toEqual([725.375, 0]);
  expect(manual.bones).toEqual(before.bones);
  await seek(0);
  await expect(rotation).toHaveValue('22.5');
  await seek(12);
  await expect(rotation).toHaveValue('742.5');

  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  const autoStart = native.calls.length;
  await rotation.fill('+360');
  await rotation.press('Enter');
  await expect.poll(async () => (await read()).revision).toBe(manual.revision + 1);
  const keyed = await read();
  const autoCalls = writes(autoStart);
  expect(autoCalls).toHaveLength(1);
  expect(autoCalls[0]!.args).toMatchObject({expectedRevision: manual.revision,
    boneAutoKey: {source: 'numericField', lanes: [[true, false]]},
    edit: {type: 'setAnimationKeys', animation, keys: [{bone: id, channel: 'rotate', frame: 12, values: [1085.375, 0]}]}});
  expect(autoCalls[0]!.args.poseEpoch).toBeUndefined();
  expect(keys(keyed)).toEqual(keys(manual).map(key => key.frame === 12 ? {...key, values: [1085.375, 0]} : key));
  expect(keyed.bones).toEqual(before.bones);
  await expect(rotation).toHaveValue('1102.5');
  await expect(current).toHaveValue('12');
  expect(native.calls.slice(start).filter(call => call.command === 'evaluate_project')).toHaveLength(0);

  await native.queueDialog('save', 'relative-rotation.fbones');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await read()).dirty).toBe(false);
  const menu = page.locator('header details').filter({has: page.locator('summary').filter({hasText: /^File$/})});
  await menu.locator('summary').click();
  await menu.getByRole('button', {name: /^Close project/}).click();
  await expect.poll(() => native.snapshot()).toBeNull();
  await native.queueDialog('open', 'relative-rotation.fbones');
  await page.getByRole('button', {name: 'Open project', exact: true}).first().click();
  await expect.poll(() => native.snapshot()).not.toBeNull();
  const reopened = await read();
  expect(keys(reopened).map(({id: _id, ...key}) => key)).toEqual(keys(keyed).map(({id: _id, ...key}) => key));
  expect(reopened.bones.find(item => item.name === before.bones.find(candidate => candidate.id === id)!.name)?.rotation).toBe(17.125);
});

test('@native hovering transform fields groups wheel steps, cancels stale previews, and flushes them before Save', async ({page, native}) => {
  await page.clock.install();
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own hovered transforms', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({...root, type: 'update', x: 19.25, y: -10.5, rotation: 90, scaleX: 3, scaleY: 2});
  await edit({type: 'create', parent: root.id, x: 3, y: 4.5, rotation: 7.5, length: 28});
  const moving = project.editedBone!;
  await edit({type: 'create', parent: root.id, x: -4, y: 4.5, rotation: 5, length: 22});
  const other = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Own hovered Rotate Auto Key'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: moving, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: moving, channel: 'translate', frame: 24, values: [24, 6], curve: 'linear'},
  ]});

  await openNativeEditor(page);
  const tools = page.getByTestId('animation-tools');
  const x = tools.getByTestId('bone-x');
  const y = tools.getByTestId('bone-y');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const zoom = page.getByTestId('viewport-zoom');
  const tree = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const read = async () => (await native.snapshot())!;
  const writes = (from: number) => native.calls.slice(from).filter(call => call.command === 'edit_rig');
  const expectNumber = async (input: typeof x, expected: number) => {
    await expect.poll(async () => Number(await input.inputValue())).toBeCloseTo(expected, 5);
  };
  const preview = (input: typeof x) => input.locator('..').getAttribute('data-wheel-preview');
  const expectPreview = async (input: typeof x, expected: number) => {
    await expect.poll(async () => Number(await preview(input))).toBeCloseTo(expected, 7);
  };
  const tick = async () => page.clock.runFor(160);
  const wheel = async (input: typeof x, deltaY = -120) => {
    await input.hover();
    await page.mouse.wheel(0, deltaY);
  };

  await tree(moving).click();
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  await tools.getByTestId('bone-axes-world').press('Space');
  await expect(x).toHaveAccessibleName('World X');
  await expectNumber(x, 10.25);
  await expectNumber(y, -1.5);
  await page.getByTestId('viewport-names-bones').press('Space');
  const rootTag = page.getByTestId(`viewport-name-tag-bones-${root.id}`);
  await expect(rootTag).toBeVisible();
  await canvas.focus();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  const before = await read();
  const start = native.calls.length;
  const initialCamera = await rootTag.boundingBox();
  const initialZoom = await zoom.inputValue();
  await wheel(x);
  await expectPreview(x, 11.25);
  await wheel(x);
  await expectPreview(x, 12.25);
  await page.keyboard.down('Shift');
  await wheel(x);
  await page.keyboard.up('Shift');
  await expectPreview(x, 12.35);
  await expectNumber(x, 10.25);
  await expectNumber(y, -1.5);
  await expect(canvas).toBeFocused();
  await page.clock.runFor(20);
  await expect(zoom).toHaveValue(initialZoom);
  expect(await rootTag.boundingBox()).toEqual(initialCamera);
  expect(await read()).toEqual(before);
  expect(writes(start)).toHaveLength(0);

  await tick();
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const moved = await read();
  const editCalls = writes(start);
  expect(editCalls).toHaveLength(1);
  expect(editCalls[0]!.args).toMatchObject({expectedRevision: before.revision,
    edit: {type: 'setBoneWorldPosition', id: moving, axis: 'x'}});
  expect((editCalls[0]!.args.edit as {position: number}).position).toBeCloseTo(12.35, 7);
  expect(editCalls[0]!.args.poseEpoch).toBeUndefined();
  const localYBefore = before.bones.find(bone => bone.id === moving)!.y;
  expect(moved.bones.map(bone => bone.id === moving ? {...bone, y: localYBefore} : bone)).toEqual(before.bones);
  await expectNumber(x, 12.35);
  await expectNumber(y, -1.5);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read()).bones).toEqual(before.bones);
  expect(writes(start).map(call => (call.args.edit as RigEdit).type)).toEqual(['setBoneWorldPosition', 'undo']);
  await expectNumber(x, 10.25);

  await canvas.focus();
  const undone = await read();
  const cancelStart = native.calls.length;
  await wheel(x);
  await expectPreview(x, 11.25);
  await page.keyboard.press('Escape');
  await expect.poll(() => preview(x)).toBeNull();
  await expect(tree(moving)).toHaveAttribute('aria-selected', 'true');
  await expect(canvas).toBeFocused();
  await tick();
  await wheel(x);
  await expectPreview(x, 11.25);
  await tree(other).press('Enter');
  await expect.poll(() => preview(x)).toBeNull();
  await tick();
  await expect(tree(other)).toHaveAttribute('aria-selected', 'true');
  await expectNumber(x, 10.25);
  await expectNumber(y, -22.5);
  expect(await read()).toEqual(undone);
  expect(writes(cancelStart)).toHaveLength(0);

  await tree(moving).click();
  await expectNumber(x, 10.25);
  await native.queueDialog('save', 'hovered-transforms.fbones');
  const saveStart = native.calls.length;
  await wheel(x, 120);
  await expectPreview(x, 9.25);
  expect(writes(saveStart)).toHaveLength(0);
  await page.getByRole('button', {name: 'Save', exact: true}).press('Enter');
  await expect.poll(async () => (await read()).dirty).toBe(false);
  await tick();
  const saveCalls = native.calls.slice(saveStart).filter(call => call.command === 'edit_rig' || call.command === 'save_project');
  expect(saveCalls.map(call => call.command)).toEqual(['edit_rig', 'save_project']);
  expect(saveCalls[0]!.args).toMatchObject({expectedRevision: undone.revision,
    edit: {type: 'setBoneWorldPosition', id: moving, axis: 'x', position: 9.25}});
  await expectNumber(x, 9.25);
  const saved = await read();

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await tools.getByRole('button', {name: 'Rotate', exact: true}).click();
  await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed', 'true');
  const frame = page.getByTestId('timeline-current');
  await frame.fill('12');
  await frame.press('Enter');
  await canvas.focus();
  const rotation = tools.getByTestId('animate-bone-rotation');
  await expectNumber(rotation, 7.5);
  const keyStart = native.calls.length;
  await wheel(rotation);
  await expectPreview(rotation, 8.5);
  expect(writes(keyStart)).toHaveLength(0);
  await tick();
  await expect.poll(async () => (await read()).revision).toBe(saved.revision + 1);
  const autoKey = writes(keyStart);
  expect(autoKey).toHaveLength(1);
  expect(autoKey[0]!.args).toMatchObject({expectedRevision: saved.revision,
    boneAutoKey: {source: 'numericField', lanes: [[true, false]]},
    edit: {type: 'setAnimationKeys', animation, keys: [{bone: moving, channel: 'rotate', frame: 12, values: [1, 0]}]}});
  expect(autoKey[0]!.args.poseEpoch).toBeUndefined();
  await expect(frame).toHaveValue('12');
  await expect(canvas).toBeFocused();
  expect((await read()).bones).toEqual(saved.bones);
  expect(native.calls.slice(start).filter(call => call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native vertical numeric drag preserves text selection and commits only the captured transform field', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own vertical numeric drag', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({...root, type: 'update', x: 19.25, y: -10.5, rotation: 90, scaleX: 3, scaleY: 2});
  await edit({type: 'create', parent: root.id, x: 3, y: 4.5, rotation: 17.125, length: 28});
  const moving = project.editedBone!;
  await edit({type: 'create', parent: root.id, x: -4, y: 4.5, rotation: 5, length: 22});
  const other = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Own equal-angle frames'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: moving, channel: 'rotate', frame: 0, values: [5.375, 0], curve: 'linear'},
    {bone: moving, channel: 'rotate', frame: 24, values: [5.375, 0], curve: 'linear'},
  ]});

  await openNativeEditor(page);
  const tools = page.getByTestId('animation-tools');
  const x = tools.getByTestId('bone-x');
  const y = tools.getByTestId('bone-y');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const tree = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const read = async () => (await native.snapshot())!;
  const edits = (from: number) => native.calls.slice(from).filter(call => call.command === 'edit_rig');
  const numeric = async (input: typeof x, expected: number) => {
    await expect.poll(async () => Number(await input.inputValue())).toBeCloseTo(expected, 6);
  };
  const preview = (input: typeof x) => input.locator('..').getAttribute('data-drag-preview');
  const staged = async (input: typeof x, expected: number) => {
    await expect.poll(async () => Number(await preview(input))).toBeCloseTo(expected, 7);
  };
  const cleared = async (input: typeof x) => {
    await expect.poll(() => preview(input)).toBeNull();
  };
  const press = async (input: typeof x) => {
    const box = (await input.boundingBox())!;
    const at = {x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2)};
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    return at;
  };
  const lift = (at: {x: number; y: number}, distance: number) => page.mouse.move(at.x, at.y - distance, {steps: 8});
  // Keep the captured field focused to distinguish changing context from blur cancellation.
  const changeWhileHeld = (kind: 'bone' | 'frame', value: number) => page.evaluate(({kind, value}) => {
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__: {config: {globalProperties: {$pinia: {
        _s: Map<string, {selectBone: (id: number) => void; seekAnimation: (frame: number) => void}>;
      }}}};
    };
    const workspace = app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!;
    if (kind === 'bone') workspace.selectBone(value);
    else workspace.seekAnimation(value);
  }, {kind, value});

  await tree(moving).click();
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  await tools.getByTestId('bone-axes-world').press('Space');
  await expect(x).toHaveAccessibleName('World X');
  await numeric(x, 10.25);
  await numeric(y, -1.5);
  const start = native.calls.length;
  const before = await read();
  const textSelectionLength = () => x.evaluate(node => {
    const field = node as HTMLInputElement;
    return (field.selectionEnd ?? 0) - (field.selectionStart ?? 0);
  });
  await x.click();
  await expect(x).toBeFocused();
  expect(await textSelectionLength()).toBe(0);
  const fieldBox = (await x.boundingBox())!;
  const line = fieldBox.y + fieldBox.height / 2;
  await page.mouse.move(fieldBox.x + fieldBox.width - 3, line);
  await page.mouse.down();
  await page.mouse.move(fieldBox.x + 3, line, {steps: 8});
  await page.mouse.up();
  await expect.poll(textSelectionLength).toBeGreaterThan(0);
  await cleared(x);
  expect(await read()).toEqual(before);

  const normal = await press(x);
  await page.mouse.move(normal.x, normal.y - 3);
  await cleared(x);
  await lift(normal, 20);
  await staged(x, 12.25);
  await numeric(x, 10.25);
  expect(edits(start)).toHaveLength(0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await cleared(x);
  await expect(tree(moving)).toHaveAttribute('aria-selected', 'true');
  expect(await read()).toEqual(before);

  const fine = await press(x);
  await page.keyboard.down('Shift');
  await lift(fine, 50);
  await staged(x, 10.75);
  await numeric(y, -1.5);
  expect(await read()).toEqual(before);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const moved = await read();
  const expectedBone = before.bones.find(bone => bone.id === moving)!;
  expect(moved.bones).toEqual(before.bones.map(bone => bone.id === moving ? {...expectedBone, y: 4.25} : bone));
  expect(edits(start).map(call => call.args)).toEqual([
    {expectedRevision: before.revision, edit: {type: 'setBoneWorldPosition', id: moving, axis: 'x', position: 10.75}},
  ]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read()).bones).toEqual(before.bones);
  await numeric(x, 10.25);
  const restored = await read();
  const cancellationStart = native.calls.length;

  await x.evaluate(node => node.addEventListener('pointerdown', event => {
    node.setAttribute('data-test-numeric-pointer', String((event as PointerEvent).pointerId));
  }, {once: true}));
  const captured = await press(x);
  await lift(captured, 20);
  await staged(x, 12.25);
  await x.evaluate(node => {
    const id = Number(node.getAttribute('data-test-numeric-pointer'));
    if (!node.hasPointerCapture(id)) throw new Error('The input never captured its actual numeric drag pointer.');
    node.releasePointerCapture(id);
  });
  await page.mouse.move(captured.x, captured.y - 21);
  await cleared(x);
  await page.mouse.up();
  const staleBone = await press(x);
  await lift(staleBone, 20);
  await staged(x, 12.25);
  await changeWhileHeld('bone', other);
  await cleared(x);
  await expect(x).toBeFocused();
  await page.mouse.up();
  await expect(tree(other)).toHaveAttribute('aria-selected', 'true');
  await numeric(x, 10.25);
  await numeric(y, -22.5);
  expect(edits(cancellationStart)).toHaveLength(0);
  expect(await read()).toEqual(restored);

  await tree(moving).click();
  await native.queueDialog('save', 'vertical-drag-interruption.fbones');
  const heldSave = await press(x);
  await lift(heldSave, 20);
  await staged(x, 12.25);
  const saveStart = native.calls.length;
  await page.getByRole('button', {name: 'Save', exact: true}).press('Enter');
  await expect.poll(async () => (await read()).dirty).toBe(false);
  await cleared(x);
  await page.mouse.up();
  const saved = await read();
  expect(saved.bones).toEqual(restored.bones);
  expect(saved.animations).toEqual(restored.animations);
  expect(native.calls.slice(saveStart).filter(call => call.command === 'edit_rig' || call.command === 'save_project')
    .map(call => call.command)).toEqual(['save_project']);

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await tools.getByRole('button', {name: 'Rotate', exact: true}).click();
  const frame = page.getByTestId('timeline-current');
  const seek = async (value: string) => {
    await frame.fill(value);
    await frame.press('Enter');
    await expect(frame).toHaveValue(value);
  };
  await seek('12');
  await canvas.focus();
  const rotation = tools.getByTestId('animate-bone-rotation');
  await numeric(rotation, 22.5);
  await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed', 'true');
  const keyStart = native.calls.length;
  const staleFrame = await press(rotation);
  await lift(staleFrame, 20);
  await staged(rotation, 24.5);
  await changeWhileHeld('frame', 13);
  await expect(frame).toHaveValue('13');
  await cleared(rotation);
  await expect(rotation).toBeFocused();
  await page.mouse.up();
  await numeric(rotation, 22.5);
  expect(edits(keyStart)).toHaveLength(0);

  await canvas.focus();
  const keyGesture = await press(rotation);
  await lift(keyGesture, 20);
  await staged(rotation, 24.5);
  expect(await read()).toEqual(saved);
  await page.mouse.up();
  await expect.poll(async () => (await read()).revision).toBe(saved.revision + 1);
  const auto = edits(keyStart);
  expect(auto).toHaveLength(1);
  expect(auto[0]!.args).toMatchObject({expectedRevision: saved.revision,
    boneAutoKey: {source: 'numericField', lanes: [[true, false]]},
    edit: {type: 'setAnimationKeys', animation, keys: [{bone: moving, channel: 'rotate', frame: 13, values: [7.375, 0]}]}});
  expect(auto[0]!.args.poseEpoch).toBeUndefined();
  await numeric(rotation, 24.5);
  await expect(frame).toHaveValue('13');
  expect((await read()).bones).toEqual(saved.bones);
  expect(native.calls.slice(start).filter(call => call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native Setup World Translate projects one bone and restores the prior position on Undo', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own World Translate', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({...root, type: 'update', x: 10, y: -20, rotation: 90, scaleX: 2, scaleY: 3});
  await edit({type: 'create', parent: root.id, x: 5, y: 7, rotation: 10, length: 28});
  const child = project.editedBone!;
  await edit({type: 'create', parent: root.id, x: -8, y: 2, rotation: -20, length: 21});
  const sibling = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Own local working pose'});

  await openNativeEditor(page);
  await page.getByRole('group', {name: 'Editing mode', exact: true}).getByRole('button', {name: 'Bones', exact: true}).click();
  const tree = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  await tree(child).click();
  const tools = page.getByTestId('animation-tools');
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  const world = tools.getByTestId('bone-axes-world');
  const x = tools.getByTestId('bone-x');
  const y = tools.getByTestId('bone-y');
  const expectCoordinates = async (worldX: number, worldY: number) => {
    await expect.poll(async () => Number(await x.inputValue())).toBeCloseTo(worldX, 4);
    await expect.poll(async () => Number(await y.inputValue())).toBeCloseTo(worldY, 4);
  };
  const bone = (snapshot: ProjectSummary) => snapshot.bones.find(item => item.id === child)!;
  const before = (await native.snapshot())!;
  const firstCall = native.calls.length;
  await expect(world).toBeEnabled();
  await expect(world).toHaveAttribute('aria-pressed', 'false');
  await tools.getByTestId('bone-axes-parent').press('Space');
  await expectCoordinates(5, 7);
  await world.press('Space');
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveAccessibleName('World X');
  await expect(y).toHaveAccessibleName('World Y');
  // The parent's 90-degree basis sends local (x, y) to world (10 - 3y, -20 + 2x).
  await expectCoordinates(-11, -10);
  expect(await native.snapshot()).toEqual(before);

  await x.fill('4'); await x.press('Enter');
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 1);
  const afterX = (await native.snapshot())!;
  expect(bone(afterX).x).toBeCloseTo(5, 4);
  expect(bone(afterX).y).toBeCloseTo(2, 4);
  await expectCoordinates(4, -10);

  await y.fill('6'); await y.press('Enter');
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 2);
  const afterY = (await native.snapshot())!;
  expect(bone(afterY).x).toBeCloseTo(13, 4);
  expect(bone(afterY).y).toBeCloseTo(2, 4);
  expect(afterY.bones.filter(item => item.id !== child)).toEqual(before.bones.filter(item => item.id !== child));
  expect(afterY.animations).toEqual(before.animations);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'edit_rig')).toHaveLength(2);
  await expectCoordinates(4, 6);

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())?.bones).toEqual(afterX.bones);
  await expectCoordinates(4, -10);
  const undone = await native.snapshot();

  await tree(sibling).click({modifiers: ['Control']});
  await expect(tree(child)).toHaveAttribute('aria-selected', 'true');
  await expect(tree(sibling)).toHaveAttribute('aria-selected', 'true');
  await expect(world).toBeDisabled();
  await tree(child).click();
  await expect(world).toBeEnabled();
  await page.getByTestId('editor-mode-animate').click();
  await expect(world).toBeDisabled();
  await expect.poll(async () => Number(await tools.getByTestId('animate-bone-x').inputValue())).toBeCloseTo(5, 4);
  await expect.poll(async () => Number(await tools.getByTestId('animate-bone-y').inputValue())).toBeCloseTo(2, 4);
  await page.getByTestId('editor-mode-setup').click();
  await expect(world).toBeEnabled();
  await expectCoordinates(4, -10);
  expect(await native.snapshot()).toEqual(undone);
});

test('@native Setup Parent Translate uses the reflected parent axis for pointer and numeric edits', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own reflected Parent Translate', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({...root, type: 'update', x: 38, y: -18, rotation: 30, scaleX: -2, scaleY: 3});
  await edit({type: 'create', parent: root.id, x: 11, y: 17, rotation: 25, length: 23});
  const child = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Own Parent Translate clip'});

  await openNativeEditor(page);
  await page.getByRole('group', {name: 'Editing mode', exact: true}).getByRole('button', {name: 'Bones', exact: true}).click();
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${child}"]`).getByRole('treeitem').click();
  const tools = page.getByTestId('animation-tools');
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  const parent = tools.getByTestId('bone-axes-parent');
  const x = tools.getByTestId('bone-x'), y = tools.getByTestId('bone-y');
  const bone = (state: ProjectSummary) => state.bones.find(item => item.id === child)!;
  const before = (await native.snapshot())!, start = native.calls.length;
  await expect(parent).toBeEnabled();
  await parent.press('Space');
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveAccessibleName('Parent X');
  await expect(y).toHaveAccessibleName('Parent Y');
  await expect(x).toHaveValue('11');
  await expect(y).toHaveValue('17');
  expect(await native.snapshot()).toEqual(before);

  await y.fill('19.25'); await y.press('Enter');
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 1);
  const afterNumeric = (await native.snapshot())!;
  expect(bone(afterNumeric)).toEqual({...bone(before), y: 19.25});

  const canvas = page.getByTestId('viewport').locator('canvas'), box = (await canvas.boundingBox())!;
  const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
  // Rotation +30 degrees and scale (-2, 3) send local (x, y) through
  // world columns (-sqrt(3), -1) and (-1.5, 3sqrt(3)/2). Positive Parent X
  // points left and down in the viewport.
  const worldX = 38 - Math.sqrt(3) * 11 - 1.5 * 19.25;
  const worldY = -18 - 11 + 1.5 * Math.sqrt(3) * 19.25;
  const axisX = {x: -Math.sqrt(3) / 2, y: .5};
  const pointer = {
    x: box.x + box.width / 2 + worldX * zoom + 64 * axisX.x,
    y: box.y + box.height / 2 - worldY * zoom + 64 * axisX.y,
  };
  const screenDelta = {x: -40, y: -20};
  const expectedX = 11 + (screenDelta.x * axisX.x + screenDelta.y * axisX.y) / (2 * zoom);
  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  await page.mouse.move(pointer.x + screenDelta.x, pointer.y + screenDelta.y, {steps: 6});
  expect(await native.snapshot()).toEqual(afterNumeric);
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 2);
  const afterDrag = (await native.snapshot())!, moved = bone(afterDrag);
  expect(moved.x).toBeCloseTo(expectedX, 3);
  expect(moved).toEqual({...bone(afterNumeric), x: moved.x});
  expect(afterDrag.bones.find(item => item.id === root.id)).toEqual(before.bones.find(item => item.id === root.id));
  expect(afterDrag.animations).toEqual(before.animations);
  const edits = native.calls.slice(start).filter(call => call.command === 'edit_rig');
  expect(edits.map(call => call.args.edit)).toEqual([
    {type: 'setBoneParentPosition', id: child, y: 19.25},
    {type: 'setBoneParentPosition', id: child, x: expect.closeTo(expectedX, 3)},
  ]);

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())?.bones).toEqual(afterNumeric.bones);
  const undone = await native.snapshot();
  await page.getByTestId('editor-mode-animate').click();
  await expect(parent).toBeDisabled();
  await expect(tools.getByTestId('animate-bone-x')).toHaveValue('11');
  await expect(tools.getByTestId('animate-bone-y')).toHaveValue('19.25');
  await page.getByTestId('editor-mode-setup').click();
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveAccessibleName('Parent X');
  expect(await native.snapshot()).toEqual(undone);
});

test('@native Animate Rotate pin reads the constrained pose while keeping sampled FK and history separate', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own constrained rotation readout', discardChanges: true});
  const root = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'create', parent: root, x: 0, y: 0, rotation: 17.125, length: 40});
  const aimed = project.editedBone!;
  await edit({type: 'create', parent: root, x: 64, y: 0, rotation: 0, length: 10});
  const target = project.editedBone!;
  await edit({type: 'addConstraint', constraint: {type: 'ik', name: 'Own full-mix aim', bones: [aimed], target,
    mix: 1, softness: 0, stretch: false, compress: false, bendPositive: true}});
  await edit({type: 'createAnimation', name: 'Own moving aim'});
  const animation = project.editedAnimation!;
  // Setup is 17.125°, FK is a constant 23.375°, and the sibling target
  // crosses 0°, 45° and 90° at frames 0, 12 and 24.
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: aimed, channel: 'rotate', frame: 0, values: [6.25, 0], curve: 'linear'},
    {bone: aimed, channel: 'rotate', frame: 24, values: [6.25, 0], curve: 'linear'},
    {bone: target, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: target, channel: 'translate', frame: 24, values: [-64, 64], curve: 'linear'},
  ]});

  const evaluated = () => page.evaluate(id => {
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__: {config: {globalProperties: {$pinia: {_s: Map<string, {renderedBones: BoneView[]}>}}}};
    };
    return app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!.renderedBones.find(bone => bone.id === id)?.evaluatedWorld;
  }, aimed);
  async function expectPose(degrees: number) {
    await expect.poll(async () => {
      const matrix = await evaluated();
      return matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : null;
    }).toBeCloseTo(degrees, 4);
    return (await evaluated())!;
  }
  const current = page.getByTestId('timeline-current');
  async function seek(frame: number) {
    await current.fill(String(frame));
    await current.press('Enter');
    await expect(current).toHaveValue(String(frame));
  }
  const tools = page.getByTestId('animation-tools');
  const rotate = tools.getByRole('button', {name: 'Rotate', exact: true});
  const pin = tools.getByTestId('bone-axes-constrained-rotation');
  const local = tools.getByTestId('bone-axes-local');
  const fk = tools.getByTestId('animate-bone-rotation');
  const readout = tools.getByTestId('constrained-rotation-readout');
  async function expectPinned(degrees: number) {
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await expect(local).toHaveAttribute('aria-pressed', 'true');
    await expect(readout).toHaveAccessibleName('Constrained rotation');
    await expect.poll(async () => Number.parseFloat((await readout.getAttribute('data-value')) ?? '')).toBeCloseTo(degrees, 4);
    await expect(readout.getByText('Read only', {exact: true})).toBeVisible();
    await expect(fk).toHaveCount(0);
    await expect(tools.getByRole('button', {name: 'Key FK rotation', exact: true})).toBeEnabled();
  }

  await openNativeEditor(page);
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${aimed}"]`).getByRole('treeitem').click();
  await rotate.click();
  await expect(pin).toHaveAccessibleName('Show constrained rotation');
  await expect(pin).toBeDisabled();
  await expect(tools.getByTestId('bone-rotation')).toHaveValue('17.125');
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await rotate.click();
  await seek(0);
  await expect(pin).toBeEnabled();
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
  await expect(fk).toBeEditable();
  await expect(fk).toHaveValue('23.375');
  const atZero = await expectPose(0);
  const before = await native.snapshot();
  const mark = native.calls.length;

  await fk.fill('31.125');
  await expect(fk).toHaveValue('31.125');
  await expect(pin).toBeDisabled();
  await fk.press('Escape');
  await expect(fk).toHaveValue('23.375');
  await expect(pin).toBeEnabled();
  expect(await evaluated()).toEqual(atZero);

  await pin.press('Space');
  await expectPinned(0);
  expect(await evaluated()).toEqual(atZero);
  await seek(24);
  await expectPinned(90);
  const atEnd = await expectPose(90);
  await pin.press('Space');
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
  await expect(readout).toHaveCount(0);
  await expect(fk).toBeEditable();
  await expect(fk).toHaveValue('23.375');
  expect(await evaluated()).toEqual(atEnd);

  await seek(12);
  await expect(fk).toHaveValue('23.375');
  const halfway = await expectPose(45);
  await pin.click();
  await expectPinned(45);
  expect(await evaluated()).toEqual(halfway);

  await page.setViewportSize({width: 960, height: 640});
  const parentAxis = tools.getByTestId('bone-axes-parent');
  await expect.poll(async () => {
    const [parentBox, pinBox, viewportBox] = await Promise.all([
      parentAxis.boundingBox(), pin.boundingBox(), page.getByTestId('viewport').boundingBox(),
    ]);
    return !!parentBox && !!pinBox && !!viewportBox &&
      parentBox.x + parentBox.width <= pinBox.x &&
      pinBox.x >= viewportBox.x && pinBox.x + pinBox.width <= viewportBox.x + viewportBox.width;
  }).toBe(true);
  await expect(parentAxis).toBeDisabled();
  await pin.focus();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
  await expect(fk).toHaveValue('23.375');
  await pin.press('Space');
  await expectPinned(45);
  expect(await evaluated()).toEqual(halfway);

  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(mark).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toEqual([]);

  await page.getByTestId('editor-mode-setup').click();
  await expect(pin).toBeDisabled();
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
  await expect(readout).toHaveCount(0);
  await expect(tools.getByTestId('bone-rotation')).toHaveValue('17.125');
  expect(await native.snapshot()).toEqual(before);

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await rotate.click();
  await seek(12);
  await pin.press('Space');
  await expectPinned(45);
  const keyMark = native.calls.length;
  await tools.getByRole('button', {name: 'Key FK rotation', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(before!.revision + 1);
  const keyed = (await native.snapshot())!.animations!.find(clip => clip.id === animation)!.tracks.find(
    track => track.bone === aimed && track.channel === 'rotate',
  )!;
  expect(keyed.keys.map(key => key.frame)).toEqual([0, 12, 24]);
  expect(keyed.keys.find(key => key.frame === 12)!.values).toEqual([6.25, 0]);
  expect(native.calls.slice(keyMark).filter(call => call.command === 'edit_rig')).toHaveLength(1);
});
