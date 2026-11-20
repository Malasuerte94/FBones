import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Curves follows Dopesheet and Graph with normalized handles and one native history action', async ({page, native}, info) => {
  await page.setViewportSize({width: 1120, height: 820});
  const fresh = await native.invoke<ProjectSummary>('create_project', {name: 'Own normalized curves', discardChanges: true});
  const bone = fresh.bones[0]!.id;
  const animation = fresh.animations![0]!.id;
  const seeded = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: fresh.revision, edit: {
    type: 'setAnimationKeys', animation, keys: [
      {bone, channel: 'translate', frame: 5, values: [20, 2], curve: 'bezier', controls: [[8, 35, 12, 55], [8, 4, 12, 7]]},
      {bone, channel: 'translate', frame: 15, values: [70, 10], curve: 'bezier', controls: [[15.9, 97, 22.8, 72], [16.5, 20, 21.5, -0]]},
      {bone, channel: 'translate', frame: 24, values: [40, 10], curve: 'linear'},
      {bone, channel: 'translate', frame: 32, values: [55, 14], curve: 'linear'},
    ],
  }});
  const track = (project: ProjectSummary) => project.animations!.find(clip => clip.id === animation)!.tracks[0]!;
  const source = track(seeded).keys[1]!;
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const views = page.getByText('Views', {exact: true});
  const panel = page.getByTestId('curves-panel');
  const dock = page.getByTestId('dock-panel-curves');
  const graph = page.getByTestId('timeline-tab-graph');
  const current = page.getByTestId('timeline-current');
  const handle = panel.getByTestId('curves-handle-0');
  const path = panel.getByTestId('curves-path');
  const preset = panel.getByTestId('curves-preset-ease-in');
  const before = (await native.snapshot())!;
  const callsStart = native.calls.length;
  const authored = () => native.calls.slice(callsStart).filter(call =>
    call.command === 'edit_rig' && (call.args.edit as RigEdit).type !== 'undo',
  );

  await current.fill('12');
  await current.press('Enter');
  await openCurves();
  await expect(panel.getByTestId('curves-empty')).toBeVisible();
  await page.getByTestId(`timeline-key-${source.id}`).press('Enter');
  await expect(handle).toBeVisible();
  await expect(path).toHaveAttribute('d', /C/);
  expect(Number(await handle.getAttribute('data-curve-time'))).toBeCloseTo(.1, 4);
  expect(Number(await handle.getAttribute('data-curve-progress'))).toBeCloseTo(-.9, 4);
  await panel.getByTestId('curves-component-1').click();
  await expect(panel.getByTestId('curves-equal')).toBeVisible();
  await expect(handle).toHaveCount(0);
  await panel.getByTestId('curves-component-0').click();
  expect(await native.snapshot()).toEqual(before);
  expect(authored()).toHaveLength(0);

  await handle.press('ArrowUp');
  await expect.poll(async () => track((await native.snapshot())!).keys[1]!.controls![0][1]).toBeCloseTo(96.7, 4);
  const keyed = track((await native.snapshot())!).keys;
  expect(authored()).toHaveLength(1);
  expect(authored()[0]!.args.edit as RigEdit).toMatchObject({type: 'setAnimationKey', keyId: source.id});
  expect(keyed[1]!.controls![0].slice(2)).toEqual(source.controls![0].slice(2));
  expect(keyed[1]!.controls![1]).toEqual(source.controls![1]);
  expect(keyed.filter(key => key.id !== source.id)).toEqual(track(before).keys.filter(key => key.id !== source.id));

  await preset.click();
  await expect.poll(async () => track((await native.snapshot())!).keys[1]!.controls![0][3]).toBe(40);
  expect(authored()).toHaveLength(2);
  expect(track((await native.snapshot())!).keys[1]!.controls![1]).toEqual(source.controls![1]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => track((await native.snapshot())!).keys).toEqual(keyed);
  await expect(current).toHaveValue('12');

  await graph.click();
  await page.getByTestId(`timeline-graph-key-${source.id}-0`).press('Enter');
  await expect(handle).toBeVisible();
  await handle.scrollIntoViewIfNeeded();
  const bounds = (await handle.boundingBox())!;
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  const beforeDrag = await native.snapshot();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 12, {steps: 4});
  await expect.poll(async () => Number(await handle.getAttribute('data-curve-progress'))).toBeGreaterThan(-.89);
  expect(await native.snapshot()).toEqual(beforeDrag);
  await dock.getByRole('button', {name: 'Panel actions for Curves', exact: true}).press('Enter');
  await page.getByRole('menuitem', {name: 'Close Curves panel', exact: true}).press('Enter');
  await expect(panel).toHaveCount(0);
  await page.mouse.up();
  expect(await native.snapshot()).toEqual(beforeDrag);
  expect(authored()).toHaveLength(2);

  await page.setViewportSize({width: 960, height: 740});
  await openCurves();
  await expect(handle).toBeVisible();
  await page.screenshot({path: info.outputPath('curves-dock.png')});
  await handle.scrollIntoViewIfNeeded();
  const reopened = (await handle.boundingBox())!;
  const reopenedX = reopened.x + reopened.width / 2, reopenedY = reopened.y + reopened.height / 2;
  await page.mouse.move(reopenedX, reopenedY);
  await page.mouse.down();
  await page.mouse.move(reopenedX, reopenedY - 10, {steps: 4});
  const proposed = Number(await handle.getAttribute('data-curve-progress'));
  expect(proposed).toBeGreaterThan(-.89);
  expect(await native.snapshot()).toEqual(beforeDrag);
  await page.mouse.up();
  await expect.poll(async () => track((await native.snapshot())!).keys[1]!.controls![0][1]).toBeCloseTo(70 - 30 * proposed, 4);
  expect(authored()).toHaveLength(3);
  expect(track((await native.snapshot())!).keys[1]!.controls![1]).toEqual(source.controls![1]);
  await panel.getByTestId('curves-interpolation-stepped').click();
  await expect.poll(async () => track((await native.snapshot())!).keys[1]!.curve).toBe('stepped');
  expect(authored()).toHaveLength(4);
  await expect(path).toHaveAttribute('d', /H.*V/);
  await expect(current).toHaveValue('12');

  async function openCurves() {
    await views.click();
    await page.getByTestId('view-toggle-curves').check();
    await views.click();
    await expect(panel).toBeVisible();
  }
});
