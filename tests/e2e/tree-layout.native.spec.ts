import {test,expect,openNativeEditor,newNativeProject} from './fixtures/native-session';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';

test('@native Tree New opens a visible usable menu and starts the selected creation flow',async({page,native})=>{
 await openNativeEditor(page);await newNativeProject(page,'Tree menu regression');
 expect((await native.snapshot())?.sceneEditing).toBe(true);
 const button=page.getByRole('button',{name:'New ▾',exact:true});await button.click();
 await expect(button).toHaveAttribute('aria-expanded','true');
 const item=page.getByRole('menuitem',{name:'IK constraint',exact:true});await expect(item).toBeVisible();
 const hit=await item.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{inside:r.top>=0&&r.bottom<=innerHeight,receivesInput:hit===node||node.contains(hit)};});
 expect(hit).toEqual({inside:true,receivesInput:true});await item.click();
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 await button.press('ArrowDown');await expect(page.getByTestId('tree-new-menu')).toBeVisible();
 await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name:'Physics constraint',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByTestId('tree-new-menu')).toHaveCount(0);await expect(button).toBeFocused();
 const before=await native.snapshot();await button.click();await page.getByTestId('viewport').locator('canvas').click({position:{x:20,y:20}});
 await expect(page.getByTestId('tree-new-menu')).toHaveCount(0);expect(await native.snapshot()).toEqual(before);
});

test('@native Tree New exposes planned Setup entries without invoking native authoring', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 640});
  await openNativeEditor(page);
  await newNativeProject(page, 'Planned Setup tools');
  const before = await native.snapshot();
  expect(before?.sceneEditing).toBe(true);
  const firstCall = native.calls.length;

  const trigger = page.getByTestId('tree-new');
  const menu = page.getByTestId('tree-new-menu');
  await trigger.press('ArrowDown');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.top >= 0 && bounds.left >= 0 && bounds.bottom <= innerHeight && bounds.right <= innerWidth;
  })).toBe(true);

  const animation = menu.getByRole('menuitem', {name: 'Animation', exact: true});
  const physics = menu.getByRole('menuitem', {name: 'Physics constraint', exact: true});
  await expect(animation).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(physics).toBeFocused();
  await page.keyboard.press('Home');
  await expect(animation).toBeFocused();
  for (const name of ['Event', 'Slot', 'IK constraint', 'Transform constraint', 'Physics constraint']) {
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', {name, exact: true})).toBeFocused();
  }
  await page.keyboard.press('ArrowDown');
  await expect(animation).toBeFocused();

  const groups = [
    ['Planned attachments', [
      ['path-attachment', 'Path attachment'], ['bounding-box', 'Bounding Box'],
      ['point', 'Point'],
    ]],
    ['Planned constraints', [
      ['path-constraint', 'Path constraint'], ['slider-constraint', 'Slider constraint'],
    ]],
  ] as const;
  const linkedMesh = menu.getByRole('menuitem', {name: 'Linked Mesh', exact: true});
  await expect(linkedMesh).toHaveAttribute('data-testid', 'tree-new-linked-mesh');
  await expect(linkedMesh).toBeDisabled();
  await linkedMesh.click({force: true});
  await expect(page.getByTestId('linked-mesh-creator')).toHaveCount(0);
  for (const [label, entries] of groups) {
    const group = menu.getByRole('group', {name: label, exact: true});
    await expect(group).toBeVisible();
    for (const [id, name] of entries) {
      const item = group.getByRole('menuitem', {name, exact: true});
      await expect(item).toHaveAttribute('data-testid', `tree-new-${id}`);
      await expect(item).toHaveJSProperty('disabled', true);
      await item.scrollIntoViewIfNeeded();
      await expect(item).toBeInViewport();
      await item.click({force: true});
      await expect(menu).toBeVisible();
    }
  }
  await page.screenshot({path: info.outputPath('tree-new-planned-setup.png')});
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(firstCall).map(call => call.command)).toEqual(['get_project']);

  const animate = page.getByTestId('editor-mode-animate');
  await animate.click();
  await expect(animate).toHaveAttribute('aria-pressed', 'true');
  await trigger.press('ArrowDown');
  await expect(animation).toBeFocused();
  await expect(linkedMesh).toHaveCount(0);
  for (const [label] of groups) await expect(menu.getByRole('group', {name: label, exact: true})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  expect(await native.snapshot()).toEqual(before);
});

test('@native Tree Auto scroll reveals deliberate canvas picks and keeps one-shot reveal local to Tree', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 820});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Tree reveal', discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const addBone = async (parent: number, x: number, y: number, length = 24) => {
    await edit({type: 'create', parent, x, y, rotation: 0, length});
    return project.editedBone!;
  };
  const root = project.bones[0]!.id;
  const unrelated = await addBone(root, -110, -61);
  await edit({...project.bones.find(bone => bone.id === unrelated)!, type: 'update', name: 'Independent branch'});
  await addBone(unrelated, 29, 0);
  for (let index = 0; index < 25; index++) await addBone(root, -205, -70 + index * 5, 12);
  const outer = await addBone(root, 63, 46);
  const inner = await addBone(outer, 23, 0);
  const target = await addBone(inner, 24, 0, 30);

  await openNativeEditor(page);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const dock = page.getByTestId('dock-panel-tree');
  const hierarchy = dock.getByRole('tree');
  const auto = dock.getByTestId('tree-auto-scroll');
  const leaf = page.getByTestId('viewport-selection-path-leaf');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const zoom = page.locator('.mode-toolbar .tabular-nums');
  const boneRow = (id: number) => hierarchy.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const outerRow = boneRow(outer);
  const innerRow = boneRow(inner);
  const targetRow = boneRow(target);
  const unrelatedRow = boneRow(unrelated);
  const scroll = () => hierarchy.evaluate(element => element.scrollTop);
  const otherScroll = () => hierarchy.evaluate(element => {
    const positions: number[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) positions.push(parent.scrollTop, parent.scrollLeft);
    return {positions, x: window.scrollX, y: window.scrollY};
  });
  const pickTarget = async () => {
    const stage = (await canvas.boundingBox())!;
    await page.mouse.click(stage.x + stage.width / 2 + 129, stage.y + stage.height / 2 - 46);
    await expect(canvas).toBeFocused();
    await expect(leaf).toHaveAttribute('data-selection-id', String(target));
  };
  const concealTarget = async () => {
    await innerRow.press('ArrowLeft');
    await expect(innerRow).toHaveAttribute('aria-expanded', 'false');
    await outerRow.press('ArrowLeft');
    await expect(outerRow).toHaveAttribute('aria-expanded', 'false');
    await expect(targetRow).toHaveCount(0);
    await hierarchy.evaluate(element => {element.scrollTop = 0;});
    await expect.poll(scroll).toBe(0);
    await expect.poll(async () => {
      const [view, row] = await Promise.all([hierarchy.boundingBox(), outerRow.boundingBox()]);
      return !!view && !!row && row.y >= view.y + view.height;
    }).toBe(true);
  };
  const expectReveal = async () => {
    await expect(outerRow).toHaveAttribute('aria-expanded', 'true');
    await expect(innerRow).toHaveAttribute('aria-expanded', 'true');
    await expect(targetRow).toHaveAttribute('aria-selected', 'true');
    await expect(unrelatedRow).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(scroll).toBeGreaterThan(0);
    await expect.poll(async () => {
      const [view, row] = await Promise.all([hierarchy.boundingBox(), targetRow.boundingBox()]);
      return !!view && !!row && row.y >= view.y - 1 && row.y + row.height <= view.y + view.height + 1;
    }).toBe(true);
  };

  await expect(auto).toHaveAccessibleName('Auto scroll');
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await expect(auto).toHaveAttribute('aria-keyshortcuts', 'Shift+Enter');
  const originalZoom = await zoom.innerText();
  await unrelatedRow.press('ArrowLeft');
  await expect(unrelatedRow).toHaveAttribute('aria-expanded', 'false');
  await concealTarget();
  const originalScroll = await otherScroll();
  await pickTarget();
  await expect(targetRow).toHaveCount(0);
  expect(await scroll()).toBe(0);

  await auto.click({button: 'right'});
  await expectReveal();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await expect(canvas).toBeFocused();
  expect(await otherScroll()).toEqual(originalScroll);
  await expect(zoom).toHaveText(originalZoom);

  await concealTarget();
  await auto.press('Shift+Enter');
  await expectReveal();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await expect(auto).toBeFocused();

  await concealTarget();
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(targetRow).toHaveCount(0);
  await canvas.press('Escape');
  await pickTarget();
  await expectReveal();
  await expect(canvas).toBeFocused();
  await expect(zoom).toHaveText(originalZoom);

  await concealTarget();
  const search = dock.getByRole('searchbox');
  await search.fill('Independent branch');
  await expect(unrelatedRow).toBeVisible();
  await canvas.press('Escape');
  await pickTarget();
  await auto.click({button: 'right'});
  await expect(canvas).toBeFocused();
  await expect(search).toHaveValue('Independent branch');
  await expect(targetRow).toHaveCount(0);
  expect(await scroll()).toBe(0);
  await search.clear();
  await expect(outerRow).toHaveAttribute('aria-expanded', 'false');
  await expect(targetRow).toHaveCount(0);

  await canvas.press('Escape');
  await canvas.press('F9');
  await expect(dock).toBeHidden();
  await pickTarget();
  await canvas.press('F9');
  await expect(dock).toBeVisible();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(outerRow).toHaveAttribute('aria-expanded', 'false');
  await expect(targetRow).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await expect(zoom).toHaveText(originalZoom);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});
