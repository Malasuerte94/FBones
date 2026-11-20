import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Curves uses the previous segment for one terminal key and batches mixed selected segments', async ({page, native}, info) => {
  await page.setViewportSize({width: 980, height: 800});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own selected curves', discardChanges: true});
  const bone = project.bones[0]!.id, animation = project.animations![0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone, name: 'Glow'});
  const slot = project.editedSlot!;
  await edit({
    type: 'setAnimationKeyBatch', animation,
    boneKeys: [
      {bone, channel: 'rotate', frame: 4, values: [35, 0], curve: 'bezier', controls: [[7, 31, 10, 22], [0, 0, 0, 0]]},
      {bone, channel: 'rotate', frame: 14, values: [12, 0], curve: 'linear'},
    ],
    slotKeys: [
      {slot, channel: 'rgba', frame: 8, curve: 'linear', values: [.25, .75, .5, 1]},
      {slot, channel: 'rgba', frame: 18, curve: 'linear', values: [.75, .25, .5, 1]},
    ],
  });
  const snapshot = async () => {
    const clip = (await native.snapshot())!.animations!.find(item => item.id === animation)!;
    const color = clip.slotTracks!.find(track => track.slot === slot);
    if (color?.channel !== 'rgba') throw Error('Missing seeded color track');
    return {rotation: clip.tracks[0]!.keys, rgba: color.keys};
  };
  const baseline = await snapshot();
  const [first, last] = baseline.rotation;
  const firstColor = baseline.rgba[0]!;
  const marker = (id: number) => page.getByTestId('timeline-key-' + id);
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const panel = page.getByTestId('curves-panel');
  const focus = panel.getByTestId('curves-segment-select');
  const path = panel.getByTestId('curves-path');
  const overlays = panel.getByTestId('curves-overlay-path');
  const callsStart = native.calls.length;
  const authoring = () => native.calls.slice(callsStart)
    .filter(call => call.command === 'edit_rig' && (call.args.edit as RigEdit).type !== 'undo')
    .map(call => call.args.edit as RigEdit);

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const views = page.getByText('Views', {exact: true});
  await views.click();
  await page.getByTestId('view-toggle-curves').check();
  await views.click();
  await marker(last!.id).press('Enter');
  await expect(path).toHaveAttribute('d', /C/);
  await panel.getByTestId('curves-preset-flat').click();
  await expect.poll(async () => (await snapshot()).rotation[0]!.controls![0]).toEqual([7, 31, 10, 12]);
  expect(authoring()).toHaveLength(1);
  expect(authoring()[0]).toMatchObject({type: 'setAnimationKeys', keys: [{keyId: first!.id}]});
  expect((await snapshot()).rotation[1]).toEqual(last);
  await undo.click();
  await expect.poll(snapshot).toEqual(baseline);

  await marker(last!.id).press('Enter');
  await marker(firstColor.id).click({modifiers: ['Control']});
  await expect(path).toHaveAttribute('d', /L/);
  await expect(focus).toHaveCount(0);

  await marker(first!.id).click({modifiers: ['Control']});
  await expect(focus.getByRole('option')).toHaveCount(2);
  await expect(focus.getByRole('option').filter({hasText: 'Glow'})).toHaveCount(1);
  await expect(overlays).toHaveCount(1);
  await focus.selectOption({label: (await focus.getByRole('option').filter({hasText: 'Glow'}).textContent())!});
  await expect(path).toHaveAttribute('d', /L/);
  await expect(overlays.first()).toHaveAttribute('d', /C/);
  await page.screenshot({path: info.outputPath('curves-mixed-selection.png')});

  await panel.getByTestId('curves-interpolation-stepped').click();
  await expect.poll(async () => {
    const {rotation, rgba} = await snapshot();
    return [rotation[0]!.curve, rgba[0]!.curve];
  }).toEqual(['stepped', 'stepped']);
  expect(authoring()).toHaveLength(2);
  expect(authoring()[1]).toMatchObject({
    type: 'setAnimationKeyBatch', boneKeys: [{keyId: first!.id}], slotKeys: [{keyId: firstColor.id}],
  });
  await undo.click();
  await expect.poll(snapshot).toEqual(baseline);
  await expect(focus.getByRole('option').filter({hasText: 'Glow'})).toHaveJSProperty('selected', true);

  await panel.getByTestId('curves-preset-ease-in').click();
  await expect.poll(async () => {
    const {rotation, rgba} = await snapshot();
    return [rotation[0]!.controls?.[0][3], rgba[0]!.controls?.[1][3]];
  }).toEqual([12, baseline.rgba[1]!.values[1]]);
  expect(authoring()).toHaveLength(3);
  expect(authoring()[2]).toMatchObject({
    type: 'setAnimationKeyBatch', boneKeys: [{keyId: first!.id}], slotKeys: [{keyId: firstColor.id}],
  });
  const changed = await snapshot();
  expect(changed.rotation[1]).toEqual(last);
  expect(changed.rgba[1]).toEqual(baseline.rgba[1]);
  await undo.click();
  await expect.poll(snapshot).toEqual(baseline);
});
