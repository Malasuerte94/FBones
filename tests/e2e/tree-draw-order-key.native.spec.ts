import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test} from './fixtures/native-session';

test('@native Tree Draw Order keys the paused working order in one edit and one Undo', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {
    name: 'Own Tree Draw Order', discardChanges: true,
  });
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const root = project.bones[0]!.id;
  await edit({type: 'createSlot', bone: root, name: 'Rear artwork'});
  await edit({type: 'createSlot', bone: root, name: 'Front artwork'});
  const setupOrder = project.slots.map(slot => slot.id);
  const expectedOrder = [...setupOrder].reverse();
  const target = setupOrder[0]!;
  await edit({type: 'createAnimation', name: 'Draw order working pose'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: root, channel: 'rotate', frame: 24, values: [15, 0], curve: 'linear'},
  ]});

  await openNativeEditor(page);
  const dock = page.getByTestId('dock-panel-tree');
  const treeTab = dock.getByRole('button', {name: 'Tree', exact: true});
  const orderTab = dock.getByRole('button', {name: 'Draw order', exact: true});
  const treeKey = dock.getByTestId('tree-draw-order-key');
  const tabKey = dock.getByTestId('draw-order-key');
  const slotRow = dock.locator(`[data-tree-kind="slot"][data-tree-id="${target}"]`).getByRole('treeitem');
  const current = page.getByTestId('timeline-current');
  const clip = (state: ProjectSummary) => state.animations!.find(item => item.id === animation)!;
  const editsSince = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await expect(treeKey).toHaveCount(0);
  await orderTab.click();
  await expect(dock.getByRole('listbox', {name: 'Draw order'})).toBeVisible();
  await expect(tabKey).toHaveCount(0);
  await treeTab.click();

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(page.getByTestId('timeline-play')).toHaveAccessibleName('Play');
  await page.getByTestId('timeline-auto-key').click();
  await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed', 'false');
  await current.fill('12');
  await current.press('Enter');
  await expect(current).toHaveValue('12');
  await slotRow.click();
  await expect(slotRow).toHaveAttribute('aria-selected', 'true');

  const before = (await native.snapshot())!;
  const start = native.calls.length;
  await orderTab.click();
  await expect(tabKey).toBeEnabled();
  const move = dock.getByTestId(`draw-order-slot-${target}`).getByRole('button', {name: 'Bring forward'});
  await expect(move).toBeEnabled();
  await move.click();
  await expect(move).toBeDisabled();
  expect(editsSince(start)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(before);

  await treeTab.click();
  await expect(slotRow).toHaveAttribute('aria-selected', 'true');
  await expect(treeKey).toHaveAccessibleName('Key draw order');
  await expect(treeKey).toBeEnabled();
  await treeKey.press('Enter');
  const key = {frame: 12, order: expectedOrder};
  await expect.poll(async () => clip((await native.snapshot())!).drawOrder).toEqual([{id: expect.any(Number), ...key}]);
  const keyed = (await native.snapshot())!;
  const calls = editsSince(start);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.args).toMatchObject({expectedRevision: before.revision, edit: {
    type: 'setAnimationDrawOrderKeys', animation, keys: [key],
  }});
  expect(calls[0]!.args.poseEpoch).toBeUndefined();
  expect(keyed.revision).toBe(before.revision + 1);
  expect(keyed.bones).toEqual(before.bones);
  expect(keyed.slots).toEqual(before.slots);
  expect(clip(keyed).tracks).toEqual(clip(before).tracks);
  await expect(slotRow).toHaveAttribute('aria-selected', 'true');
  await expect(current).toHaveValue('12');

  const undoStart = native.calls.length;
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(before.animations);
  expect(editsSince(undoStart).map(call => call.args.edit)).toEqual([{type: 'undo'}]);
  const undone = (await native.snapshot())!;
  expect(undone.bones).toEqual(before.bones);
  expect(undone.slots).toEqual(before.slots);
  await expect(slotRow).toHaveAttribute('aria-selected', 'true');
  await expect(current).toHaveValue('12');
});
