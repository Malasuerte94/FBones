import type {Locator, Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

async function keyCenter(key: Locator) {
  await expect(key).toBeVisible();
  const box = (await key.boundingBox())!;
  return {x: box.x + box.width / 2, y: box.y + box.height / 2};
}

async function dragThreeFrames(page: Page, key: Locator) {
  const start = await keyCenter(key);
  const zoom = Number(await page.getByTestId('timeline-zoom').inputValue());
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 3 * zoom, start.y, {steps: 5});
  return zoom;
}

test('@native Timing Shift previews a row suffix and authors once through Dopesheet and Graph', async ({page, native}, info) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Timing Shift', discardChanges: true});
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  const root = project.bones[0]!.id;
  await edit({type: 'create', parent: root, x: 40, y: 0, rotation: 0, length: 30});
  const boneA = project.editedBone!;
  await edit({type: 'create', parent: root, x: -40, y: 0, rotation: 0, length: 30});
  const boneB = project.editedBone!;
  await edit({type: 'createEvent', name: 'Pulse'});
  const event = project.editedEvent!;
  await edit({type: 'createAnimation', name: 'Timing scope'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeyBatch', animation, boneKeys: [
    {bone: boneA, channel: 'translate', frame: 3, values: [11, 0], curve: 'linear'},
    {bone: boneA, channel: 'translate', frame: 9, values: [22, 0], curve: 'bezier', controls: [[11, 24, 16, 30], [11, 0, 16, 0]]},
    {bone: boneA, channel: 'translate', frame: 18, values: [33, 0], curve: 'linear'},
    ...[6, 12, 21].map((frame, i) => ({bone: boneA, channel: 'rotate' as const, frame, values: [[7, 19, 31][i]!, 0] as [number, number], curve: 'linear' as const})),
    ...[0, 15, 24].map((frame, i) => ({bone: boneB, channel: 'translate' as const, frame, values: [100 + 20 * i, 0] as [number, number], curve: 'linear' as const})),
  ], slotKeys: [], eventKeys: [6, 18, 27].map(frame => ({event, frame, int: frame * 10, float: 0, string: '', volume: 1, balance: 0}))});
  const clip = (state: ProjectSummary) => state.animations!.find(item => item.id === animation)!;
  const track = (state: ProjectSummary) => clip(state).tracks.find(item => item.bone === boneA && item.channel === 'translate')!;
  const target = track(project).keys[1]!;
  const later = track(project).keys[2]!;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const treeBone = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  await treeBone(boneA).click();
  await treeBone(boneB).click({modifiers: ['Control']});
  const shift = page.getByTestId('timeline-tool-shift');
  const timeline = page.getByTestId('animation-timeline');
  const sheetKey = (id: number) => page.getByTestId(`timeline-key-${id}`);
  const graphKey = (id: number) => page.getByTestId(`timeline-graph-key-${id}-0`);
  const baseline = (await native.snapshot())!;
  const firstCall = native.calls.length;
  const editCalls = () => native.calls.slice(firstCall).filter(call => call.command === 'edit_rig');
  const read = async () => (await native.snapshot())!;
  const frames = async () => track(await read()).keys.map(key => key.frame);
  await expect(shift).toHaveAttribute('aria-pressed', 'false');
  await shift.press('Space');
  await expect(shift).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('timeline-tool-offset')).toHaveAttribute('aria-pressed', 'false');

  const laterStart = await keyCenter(sheetKey(later.id));
  await timeline.focus();
  const zoom = await dragThreeFrames(page, sheetKey(target.id));
  await expect.poll(async () => (await keyCenter(sheetKey(later.id))).x - laterStart.x).toBeCloseTo(zoom * 3, 0);
  await expect(sheetKey(later.id)).toHaveAttribute('aria-pressed', 'false');
  expect(await read()).toEqual(baseline);
  expect(editCalls()).toHaveLength(0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(async () => (await keyCenter(sheetKey(later.id))).x - laterStart.x).toBeCloseTo(0, 0);
  expect(editCalls()).toHaveLength(0);

  await dragThreeFrames(page, sheetKey(target.id));
  await page.mouse.up();
  await expect.poll(frames).toEqual([3, 12, 21]);
  const shifted = await read();
  expect(shifted.revision).toBe(baseline.revision + 1);
  expect(shifted.bones).toEqual(baseline.bones);
  expect(clip(shifted).tracks.filter(item => item !== track(shifted))).toEqual(clip(baseline).tracks.filter(item => item !== track(baseline)));
  expect(clip(shifted).eventTracks).toEqual(clip(baseline).eventTracks);
  expect(track(shifted).keys[1]!.controls).toEqual([[14, 24, 19, 30], [14, 0, 19, 0]]);
  expect(editCalls()[0]?.args.edit).toMatchObject({type: 'moveAnimationKeys', animation, keys: [target.id], deltaFrames: 3, shift: true});
  await page.screenshot({path: info.outputPath('timing-shift-dopesheet.png')});

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(frames).toEqual([3, 9, 18]);
  await page.getByTestId('timeline-tab-graph').click();
  await expect(shift).toHaveAttribute('aria-pressed', 'true');
  await graphKey(target.id).press('Enter');
  await dragThreeFrames(page, graphKey(target.id));
  await page.mouse.up();
  await expect.poll(frames).toEqual([3, 12, 21]);
  expect(clip(await read())).toEqual(clip(shifted));
  await expect(shift).toHaveAttribute('aria-pressed', 'true');
  const moves = editCalls().filter(call => (call.args.edit as RigEdit).type === 'moveAnimationKeys');
  expect(moves).toHaveLength(2);
  expect(moves[1]?.args.edit).toEqual(moves[0]?.args.edit);
  await page.screenshot({path: info.outputPath('timing-shift-graph.png')});
});
