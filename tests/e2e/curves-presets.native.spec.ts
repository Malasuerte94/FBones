import {curvePresetStorageKey, type CurvePreset} from '../../src/domain/curvePresets';
import type {EvaluationSnapshot, ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native named Curves presets survive reload and apply signed normalized handles in one Undo', async ({page, native}, info) => {
  await page.setViewportSize({width: 1000, height: 800});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own reusable curves', discardChanges: true});
  const bone = project.bones[0]!.id, animation = project.animations![0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'createSlot', bone, name: 'Glow'});
  const slot = project.editedSlot!;
  await edit({
    type: 'setAnimationKeyBatch', animation,
    boneKeys: [
      {bone, channel: 'rotate', frame: 3, values: [10, 0], curve: 'bezier', controls: [[5, 2, 11, 58], [0, 0, 0, 0]]},
      {bone, channel: 'rotate', frame: 13, values: [50, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 23, values: [20, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 30, values: [20, 0], curve: 'bezier', controls: [[41.25, 27, 37, 37], [0, 0, 0, 0]]},
      {bone, channel: 'rotate', frame: 40, values: [40, 0], curve: 'linear'},
    ],
    slotKeys: [
      {slot, channel: 'rgba', frame: 8, curve: 'linear', values: [.75, .25, .5, 1]},
      {slot, channel: 'rgba', frame: 18, curve: 'linear', values: [.25, .75, .5, 1]},
    ],
  });
  const snapshot = async () => {
    const clip = (await native.snapshot())!.animations!.find(item => item.id === animation)!;
    const color = clip.slotTracks!.find(track => track.slot === slot);
    if (color?.channel !== 'rgba') throw Error('Missing seeded color track');
    return {rotation: clip.tracks[0]!.keys, rgba: color.keys};
  };
  const library = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]') as CurvePreset[], curvePresetStorageKey);
  const baseline = await snapshot();
  const [source, destination] = baseline.rotation;
  const color = baseline.rgba[0]!;
  const name = 'Push and settle';
  const marker = (id: number) => page.getByTestId('timeline-key-' + id);
  const listed = page.getByTestId('curves-custom-list');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const callsStart = native.calls.length;
  const authoring = () => native.calls.slice(callsStart)
    .filter(call => call.command === 'edit_rig' && (call.args.edit as RigEdit).type !== 'undo')
    .map(call => call.args.edit as RigEdit);

  async function selectBone() {
    await page.getByTestId('editor-mode-animate').click();
    await page.getByTestId('animation-select').selectOption(String(animation));
    await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  }

  await openNativeEditor(page);
  await selectBone();
  const views = page.getByText('Views', {exact: true});
  await views.click();
  await page.getByTestId('view-toggle-curves').check();
  await views.click();
  await expect(page.getByTestId('curves-custom-save')).toBeDisabled();
  await marker(source!.id).press('Enter');
  await page.getByTestId('curves-custom-save').click();
  await page.getByTestId('curves-custom-name').fill(name);
  await page.getByTestId('curves-custom-create').click();
  await expect(listed).toHaveValue(name);
  expect(await library()).toEqual([{name, controls: [.2, -.2, .8, 1.2]}]);
  expect(await snapshot()).toEqual(baseline);
  expect(authoring()).toHaveLength(0);

  await page.getByTestId('curves-handle-0').press('ArrowUp');
  await expect.poll(async () => (await snapshot()).rotation[0]!.controls![0][1]).toBeCloseTo(2.4);
  const replacement = Math.fround((await snapshot()).rotation[0]!.controls![0][1]);
  await page.getByTestId('curves-custom-replace').click();
  const stored = [{name, controls: [.2, (replacement - 10) / 40, .8, 1.2]}];
  expect(await library()).toEqual(stored);
  const replacedSource = await snapshot();
  await page.getByTestId('curves-custom-apply').click();
  expect(await snapshot()).toEqual(replacedSource);
  expect(authoring()).toHaveLength(1);
  await undo.click();
  await expect.poll(snapshot).toEqual(baseline);
  expect(await library()).toEqual(stored);

  await page.reload();
  await selectBone();
  await listed.selectOption(name);
  await marker(destination!.id).press('Enter');
  await marker(color.id).click({modifiers: ['Control']});
  await expect(page.getByTestId('curves-segment-select').getByRole('option')).toHaveCount(2);
  expect(await snapshot()).toEqual(baseline);
  expect(authoring()).toHaveLength(1);
  await page.getByTestId('curves-custom-apply').click();
  const progress = stored[0]!.controls[1]!;
  await expect.poll(async () => {
    const {rotation, rgba} = await snapshot();
    return [rotation[1]!.controls?.[0], rgba[0]!.controls?.[0]];
  }).toEqual([[15, Math.fround(50 - 30 * progress), 21, 14],
    [10, Math.fround(.75 - .5 * progress), 16, Math.fround(.15)]]);
  expect(authoring()).toHaveLength(2);
  expect(authoring()[1]).toMatchObject({
    type: 'setAnimationKeyBatch', boneKeys: [{keyId: destination!.id}], slotKeys: [{keyId: color.id}],
  });
  const changed = await snapshot();
  expect(changed.rotation[0]).toEqual(source);
  expect(changed.rotation[2]).toEqual(baseline.rotation[2]);
  expect(changed.rgba[1]).toEqual(baseline.rgba[1]);
  expect(changed.rgba[0]!.controls![2].filter((_value, index) => index % 2)).toEqual([.5, .5]);
  await expect(page.getByTestId('curves-plot')).toBeInViewport({ratio: .98});
  await expect(page.getByTestId('curves-custom-apply')).toBeInViewport({ratio: .98});
  await page.screenshot({path: info.outputPath('curves-custom-presets.png')});
  await undo.click();
  await expect.poll(snapshot).toEqual(baseline);

  await page.getByTestId('curves-custom-remove').click();
  await expect(listed.getByRole('option', {name, exact: true})).toHaveCount(0);
  expect(await library()).toEqual([]);
  expect(await snapshot()).toEqual(baseline);
  expect(authoring()).toHaveLength(2);

  // A valid extended bone tangent has no unmodified RGBA representation.
  await marker(baseline.rotation[3]!.id).press('Enter');
  await page.getByTestId('curves-custom-save').click();
  await page.getByTestId('curves-custom-name').fill('Extended handle');
  await page.getByTestId('curves-custom-create').click();
  await expect(listed).toHaveValue('Extended handle');
  expect((await library())[0]!.controls[0]).toBe(1.125);
  await marker(destination!.id).press('Enter');
  await marker(color.id).click({modifiers: ['Control']});
  await page.getByTestId('curves-custom-apply').click();
  await expect(page.getByText('Selected curves cannot accept this preset without changing its shape', {exact: false})).toBeVisible();
  expect(await snapshot()).toEqual(baseline);
  expect(authoring()).toHaveLength(2);
});

test('@native named Curves preset projects to Deform progress and Rotate in one mixed edit', async ({page, native}) => {
  await page.setViewportSize({width: 1100, height: 810});
  const source = await native.invoke<string>('e2e_seed_sequence_fixture');
  await native.queueDialog('open', source);
  let project = await native.invoke<ProjectSummary>('open_project', {discardChanges: true});
  const meshSlot = project.slots.find(slot => slot.attachments?.some(attachment => attachment.type === 'mesh'))!;
  const mesh = meshSlot.attachments!.find(attachment => attachment.type === 'mesh')!;
  const hiddenSlot = project.slots.find(slot => slot.bone !== meshSlot.bone)!;
  const bone = meshSlot.bone;
  async function edit(change: RigEdit, poseEpoch?: number) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change, poseEpoch});
  }
  const setupPose = await native.invoke<EvaluationSnapshot>('evaluate_project', {
    expectedRevision: project.revision, request: {mode: 'none', time: 0},
  });
  await edit({type: 'createClipping', slot: hiddenSlot.id, name: 'Hidden clip', endSlot: meshSlot.id,
    vertices: [{x: -40, y: -30}, {x: -40, y: 30}, {x: 40, y: 30}, {x: 40, y: -30}], convex: true, inverse: false}, setupPose.poseEpoch);
  const hidden = project.editedAttachment!;
  await edit({type: 'createAnimation', name: 'Mixed Deform preset'});
  const animation = project.editedAnimation!;
  const startOffsets = [-0, 3, .5, 0, -2, -0, 4, .125];
  const endOffsets = [7, -8, 9, 0, 4, 5, 0, -1];
  const bits = (values: readonly number[]) => [...new Uint32Array(Float32Array.from(values).buffer)];
  const oldProgress = [8, .25, 16, -0] as const;
  await edit({type: 'setAnimationKeyBatch', animation, slotKeys: [], boneKeys: [
    {bone, channel: 'rotate', frame: 4, values: [12, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 20, values: [44, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 30, values: [20, 0], curve: 'bezier', controls: [[34, 10, 42, 70], [0, 0, 0, 0]]},
    {bone, channel: 'rotate', frame: 46, values: [60, 0], curve: 'linear'},
  ], deformKeys: [
    {attachment: mesh.id, frame: 0, offsets: startOffsets, offsetBits: bits(startOffsets), dataPresent: true,
      curve: 'bezier', controls: [...oldProgress], controlsBits: [0x41000000, 0x3e800000, 0x41800000, 0x80000000]},
    {attachment: mesh.id, frame: 24, offsets: endOffsets, dataPresent: true, curve: 'linear'},
    {attachment: hidden, frame: 0, offsets: Array(8).fill(0), dataPresent: false, curve: 'stepped'},
    {attachment: hidden, frame: 24, offsets: [3, -2, 1, 4, 5, -6, 7, 8], dataPresent: true, curve: 'linear'},
  ]});
  const clip = (state: ProjectSummary) => state.animations!.find(item => item.id === animation)!;
  const deform = (state: ProjectSummary, id: number) => clip(state).deformTracks!.find(track => track.attachment === id)!;
  const before = project;
  const [meshStart, meshEnd] = deform(before, mesh.id).keys;
  const [rotateStart, rotateEnd, rotateDonor] = clip(before).tracks[0]!.keys;
  expect(bits(meshStart!.offsets)).toEqual(bits(startOffsets));
  expect(Object.is(meshStart!.controls?.[3], -0)).toBe(true);

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const views = page.getByText('Views', {exact: true});
  await views.click();
  await page.getByTestId('view-toggle-curves').check();
  await views.click();
  const panel = page.getByTestId('curves-panel');
  const marker = (id: number) => page.getByTestId(`timeline-key-${id}`);
  const start = native.calls.length;
  const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  const presetName = 'Overshoot both ends';

  await marker(rotateDonor!.id).press('Enter');
  await panel.getByTestId('curves-custom-save').click();
  await panel.getByTestId('curves-custom-name').fill(presetName);
  await panel.getByTestId('curves-custom-create').click();
  await expect(panel.getByTestId('curves-custom-list')).toHaveValue(presetName);
  expect(edits()).toHaveLength(0);

  await marker(rotateStart!.id).press('Enter');
  await marker(meshStart!.id).click({modifiers: ['Control']});
  await expect(marker(deform(before, hidden).keys[0]!.id)).toHaveCount(0);
  const segmentOptions = panel.getByTestId('curves-segment-select').getByRole('option');
  await expect(segmentOptions).toHaveCount(2);
  await expect(segmentOptions.filter({hasText: 'Deform'})).toHaveCount(1);
  await expect(segmentOptions.filter({hasText: 'Rotate'})).toHaveCount(1);
  await panel.getByTestId('curves-custom-apply').click();

  await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
  expect(edits()).toHaveLength(1);
  expect(edits()[0]!.args.expectedRevision).toBe(before.revision);
  expect(edits()[0]!.args.poseEpoch).toBeUndefined();
  const progress = [6, -.25, 18, 1.25];
  const rotateControls = [[8, 4, 16, 52], [0, 0, 0, 0]];
  expect(edits()[0]!.args.edit).toMatchObject({type: 'setAnimationKeyBatch', animation, slotKeys: [],
    boneKeys: [{bone, channel: 'rotate', frame: 4, keyId: rotateStart!.id, curve: 'bezier', controls: rotateControls}],
    deformKeys: [{attachment: mesh.id, frame: 0, keyId: meshStart!.id, dataPresent: true, curve: 'bezier', controls: progress}],
  });
  const after = (await native.snapshot())!;
  const [changedMesh, unchangedEnd] = deform(after, mesh.id).keys;
  expect(changedMesh).toEqual({...meshStart, controls: progress});
  expect(bits(changedMesh!.offsets)).toEqual(bits(startOffsets));
  expect(unchangedEnd).toEqual(meshEnd);
  expect(deform(after, hidden)).toEqual(deform(before, hidden));
  expect(clip(after).tracks[0]!.keys).toEqual([
    {...rotateStart, curve: 'bezier', controls: rotateControls}, rotateEnd, ...clip(before).tracks[0]!.keys.slice(2),
  ]);
  expect(after.slots).toEqual(before.slots);
  expect(after.animations!.filter(item => item.id !== animation)).toEqual(before.animations!.filter(item => item.id !== animation));
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => clip((await native.snapshot())!)).toEqual(clip(before));
});
