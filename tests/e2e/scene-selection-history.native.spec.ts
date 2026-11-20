import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test} from './fixtures/native-session';

test('@native Setup selection history connects Tree and viewport picks, restores groups, and discards a forward branch', async ({page, native}) => {
  await page.setViewportSize({width: 1440, height: 900});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Setup selection history', discardChanges: true});
  const root = project.bones[0]!.id;
  const addBone = async (x: number, y: number) => {
    const edit: RigEdit = {type: 'create', parent: root, x, y, rotation: 0, length: 36};
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit});
    return project.editedBone!;
  };
  const a = await addBone(-134, 47);
  const b = await addBone(87, 47);
  const c = await addBone(-114, -58);

  await openNativeEditor(page);
  const canvas = page.getByTestId('viewport').locator('canvas');
  const tree = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const leaf = page.getByTestId('viewport-selection-path-leaf');
  const point = async (x: number, y: number): Promise<[number, number]> => {
    const box = (await canvas.boundingBox())!;
    return [box.x + box.width / 2 + x, box.y + box.height / 2 - y];
  };
  const selectedBones = () => page.locator('[data-tree-kind="bone"]').evaluateAll(rows => rows
    .filter(row => row.querySelector('[role="treeitem"][aria-selected="true"]'))
    .map(row => Number(row.getAttribute('data-tree-id'))).sort((left, right) => left - right));
  const checkSelection = async (...ids: number[]) => {
    await expect.poll(selectedBones).toEqual([...ids].sort((left, right) => left - right));
    if (ids.length === 1) await expect(leaf).toHaveAttribute('data-selection-id', String(ids[0]));
    else await expect(leaf).toBeHidden();
  };
  const before = (await native.snapshot())!;
  const start = native.calls.length;

  await checkSelection(root);
  await tree(root).press('PageDown');
  await checkSelection(root);
  await tree(a).click();
  await checkSelection(a);
  await tree(a).press('Enter');
  await page.mouse.click(...await point(108, 47));
  await expect(canvas).toBeFocused();
  await checkSelection(b);
  await page.keyboard.press('Escape');
  await checkSelection();

  await tree(a).press('PageDown');
  await expect(tree(a)).toBeFocused();
  await checkSelection(b);
  await canvas.press('PageDown');
  await checkSelection(a);
  await canvas.press('PageDown');
  await checkSelection(root);
  await canvas.press('PageUp');
  await checkSelection(a);
  await canvas.press('PageUp');
  await checkSelection(b);
  await canvas.press('PageUp');
  await checkSelection();

  await canvas.press('PageDown');
  await checkSelection(b);
  await canvas.press('PageDown');
  await checkSelection(a);
  await tree(c).click();
  await checkSelection(c);
  await tree(c).press('PageUp');
  await checkSelection(c);

  await page.mouse.move(...await point(-150, 67));
  await page.mouse.down();
  try {
    await page.mouse.move(...await point(-62, -78), {steps: 5});
    const duringDrag = await selectedBones();
    await page.keyboard.press('PageDown');
    await expect.poll(selectedBones).toEqual(duringDrag);
  } finally {
    await page.mouse.up();
  }
  await checkSelection(a, c);
  await canvas.press('PageDown');
  await checkSelection(c);
  await canvas.press('PageUp');
  await checkSelection(a, c);
  await canvas.press('PageDown');
  await checkSelection(c);

  const field = page.getByTestId('bone-x');
  await field.focus();
  const value = await field.inputValue();
  await field.fill('+3.25');
  await field.press('PageDown');
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('+3.25');
  await checkSelection(c);
  await field.press('Escape');
  await expect(field).toHaveValue(value);
  await canvas.press('PageDown');
  await checkSelection(a);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.bones).toEqual(before.bones.filter(bone => bone.id !== c));
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')
    .map(call => (call.args.edit as RigEdit).type)).toEqual(['undo']);
});

test('@native Setup selection history skips a deleted slot and keeps the live constraint entry', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own stale scene selection', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: 32, y: 18, rotation: 0, length: 28});
  const child = project.editedBone!;
  await edit({type: 'createSlot', bone: child, name: 'Slot to remove'});
  const slot = project.editedSlot!;
  await edit({type: 'addConstraint', constraint: {
    type: 'ik', name: 'Live constraint', bones: [child], target: root, mix: 0, softness: 0,
    bendPositive: true, compress: false, stretch: false,
  }});
  const constraint = project.constraints!.at(-1)!.id;

  await openNativeEditor(page);
  const tree = (kind: 'bone' | 'slot' | 'constraint', id: number) => page
    .locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const boneRow = tree('bone', root);
  const slotRow = tree('slot', slot);
  const constraintRow = tree('constraint', constraint);
  const deleteSelection = page.getByTestId('dock-panel-tree').getByRole('button', {name: 'Delete selection', exact: true});
  const leaf = page.getByTestId('viewport-selection-path-leaf');
  const calls = native.calls.length;
  await boneRow.click();
  await expect(boneRow).toHaveAttribute('aria-selected', 'true');
  await slotRow.click();
  await expect(slotRow).toHaveAttribute('aria-selected', 'true');
  await expect(leaf).toHaveAttribute('data-kind', 'slot');
  await constraintRow.click();
  await expect(constraintRow).toHaveAttribute('aria-selected', 'true');

  await constraintRow.press('PageDown');
  await expect(slotRow).toHaveAttribute('aria-selected', 'true');
  await expect(constraintRow).toHaveAttribute('aria-selected', 'false');
  await expect(leaf).toHaveAttribute('data-kind', 'slot');
  await expect(leaf).toHaveAttribute('data-selection-id', String(slot));
  await deleteSelection.click();
  await expect.poll(async () => (await native.snapshot())!.slots.some(entry => entry.id === slot)).toBe(false);
  await expect(slotRow).toHaveCount(0);
  const afterDelete = (await native.snapshot())!;
  expect(afterDelete.constraints).toEqual(project.constraints);
  expect(afterDelete.bones).toEqual(project.bones);

  await boneRow.press('PageUp');
  await expect(constraintRow).toHaveAttribute('aria-selected', 'true');
  await expect(boneRow).toHaveAttribute('aria-selected', 'false');
  await constraintRow.press('PageDown');
  await expect(boneRow).toHaveAttribute('aria-selected', 'true');
  await expect(constraintRow).toHaveAttribute('aria-selected', 'false');
  await expect(leaf).toHaveAttribute('data-kind', 'bone');
  await expect(leaf).toHaveAttribute('data-selection-id', String(root));
  expect(await native.snapshot()).toEqual(afterDelete);
  expect(native.calls.slice(calls).filter(call => call.command === 'edit_rig').map(call => call.args.edit))
    .toEqual([{type: 'deleteSlot', id: slot}]);
});
