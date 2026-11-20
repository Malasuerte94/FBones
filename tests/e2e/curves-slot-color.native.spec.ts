import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Curves edits a descending RGBA control and inspects seven linear two-color channels', async ({page, native}, info) => {
  await page.setViewportSize({width: 1120, height: 820});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own color curves', discardChanges: true});
  const animation = project.animations![0]!.id, bone = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone, name: 'Light slot'});
  const light = project.editedSlot!;
  await edit({type: 'createSlot', bone, name: 'Tinted slot'});
  const tint = project.editedSlot!;
  await edit({type: 'setSlotDarkColor', id: tint, enabled: true, color: 0x000000ff});
  await edit({type: 'setAnimationSlotKeys', animation, keys: [
    {slot: light, channel: 'rgba', frame: 6, curve: 'bezier', values: [.1254902, .6901961, .4, 1],
      controls: [[7.5, .23843138, 10.5, .3890196], [7.5, .5584314, 10.5, .38274508], [8, .08, 10, .65], [8, 1, 10, 1]]},
    {slot: light, channel: 'rgba', frame: 12, curve: 'linear', values: [.5019608, .2509804, .4, 1]},
    {slot: tint, channel: 'rgba', frame: 6, curve: 'linear', values: [.5, .6, .7, 1], darkValues: [.1, .2, .3]},
    {slot: tint, channel: 'rgba', frame: 12, curve: 'linear', values: [.6, .7, .8, 1], darkValues: [.3, .4, .5]},
  ]});
  const keys = (source: ProjectSummary, slot: number) => {
    const track = source.animations!.find(clip => clip.id === animation)!.slotTracks!.find(item => item.slot === slot);
    if (track?.channel !== 'rgba') throw Error('RGBA fixture missing');
    return track.keys;
  };

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const views = page.getByText('Views', {exact: true});
  await views.click();
  await page.getByTestId('view-toggle-curves').check();
  await views.click();
  const panel = page.getByTestId('curves-panel');
  const component = panel.getByTestId('curves-component-select');
  const handle = panel.getByTestId('curves-handle-0');
  const pointer = page.getByTestId('timeline-current');
  await pointer.fill('9');
  await pointer.press('Enter');
  const before = (await native.snapshot())!;
  const left = keys(before, light)[0]!;

  await chooseSlot(light, left.id);
  await expect(component.getByRole('option')).toHaveCount(4);
  await component.selectOption('1');
  expect(Number(await handle.getAttribute('data-curve-progress'))).toBeCloseTo(.3, 5);
  const start = native.calls.length;
  await handle.press('ArrowUp');
  const expected = left.values[1] + .31 * (keys(before, light)[1]!.values[1] - left.values[1]);
  await expect.poll(async () => keys((await native.snapshot())!, light)[0]!.controls![1][1]).toBeCloseTo(expected, 6);
  const edited = keys((await native.snapshot())!, light)[0]!;
  expect([edited.controls![0], edited.controls![2], edited.controls![3]])
    .toEqual([left.controls![0], left.controls![2], left.controls![3]]);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toHaveLength(1);

  await panel.getByTestId('curves-preset-ease-in').click();
  await expect.poll(async () => keys((await native.snapshot())!, light)[0]!.controls![1][3])
    .toBe(keys(before, light)[1]!.values[1]);
  expect(keys((await native.snapshot())!, light)[0]!.controls![2]).toEqual(left.controls![2]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => keys((await native.snapshot())!, light)[0]).toEqual(edited);

  const beforeInspect = await native.snapshot();
  await chooseSlot(tint, keys(before, tint)[0]!.id);
  await expect(component.getByRole('option')).toHaveCount(7);
  await component.selectOption('6');
  await expect(panel.getByTestId('curves-linear-only')).toBeVisible();
  await expect(panel.getByTestId('curves-interpolation-bezier')).toBeDisabled();
  await expect(panel.getByTestId('curves-interpolation-stepped')).toBeDisabled();
  await expect(panel.getByTestId('curves-preset-flat')).toBeDisabled();
  await expect(panel.getByTestId('curves-path')).toHaveAttribute('d', /L/);
  await expect(handle).toHaveCount(0);
  await expect(pointer).toHaveValue('9');
  expect(await native.snapshot()).toEqual(beforeInspect);
  await page.screenshot({path: info.outputPath('curves-two-color.png')});

  async function chooseSlot(slot: number, key: number) {
    await page.locator(`[data-tree-kind="slot"][data-tree-id="${slot}"]`).getByRole('treeitem').click();
    await page.getByTestId(`timeline-key-${key}`).press('Enter');
  }
});
