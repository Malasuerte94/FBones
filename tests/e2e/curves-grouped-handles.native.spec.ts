import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {preserveDeformKeyBits} from '../../src/domain/deformTransport';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Curves groups picked Rotate and Deform handles, cancels invalid previews and commits one Undo', async ({page, native}) => {
  await page.setViewportSize({width: 1120, height: 820});
  const source = await native.invoke<string>('e2e_seed_sequence_fixture');
  await native.queueDialog('open', source);
  let project = await native.invoke<ProjectSummary>('open_project', {discardChanges: true});
  const slot = project.slots.find(item => item.attachments?.some(attachment => attachment.mesh))!;
  const mesh = slot.attachments!.find(attachment => attachment.mesh)!;
  const bone = slot.bone;
  const offsets = [-0, 3, .5, 0, -2, -0, 4, .125];
  const terminalOffsets = [7, -8, 9, 0, 4, 5, 0, -1];
  const bits = (values: readonly number[]) => [...new Uint32Array(Float32Array.from(values).buffer)];
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createAnimation', name: 'Own grouped controls'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeyBatch', animation, slotKeys: [], boneKeys: [
    {bone, channel: 'rotate', frame: 4, values: [35, 0], curve: 'bezier', controls: [[8.5, 29.25, 11, 16], [0, 0, 0, 0]]},
    {bone, channel: 'rotate', frame: 14, values: [12, 0], curve: 'linear'},
  ], deformKeys: [
    preserveDeformKeyBits({attachment: mesh.id, frame: 0, offsets, dataPresent: true, curve: 'bezier', controls: [6, .625, 16, -0]}),
    {attachment: mesh.id, frame: 24, offsets: terminalOffsets, dataPresent: true, curve: 'linear'},
  ]});
  const clip = (snapshot: ProjectSummary) => snapshot.animations!.find(item => item.id === animation)!;
  const rotate = (snapshot: ProjectSummary) => clip(snapshot).tracks.find(track => track.bone === bone && track.channel === 'rotate')!.keys;
  const deform = (snapshot: ProjectSummary) => clip(snapshot).deformTracks!.find(track => track.attachment === mesh.id)!.keys;
  const [rotateOwner, rotateEnd] = rotate(project);
  const [meshOwner, meshEnd] = deform(project);
  expect(deform(project)[0]!.offsets).toEqual(offsets);
  expect(deform(project)[0]!.controls?.[3]).toBe(-0);

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(page.getByTestId('timeline-tab-dopesheet')).toHaveClass(/active/);
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const views = page.getByText('Views', {exact: true});
  await views.click();
  await page.getByTestId('view-toggle-curves').check();
  await views.click();
  const panel = page.getByTestId('curves-panel');
  const rotateMarker = page.getByTestId(`timeline-key-${rotateOwner!.id}`);
  const meshMarker = page.getByTestId(`timeline-key-${meshOwner!.id}`);
  await rotateMarker.press('Enter');
  await meshMarker.click({modifiers: ['Control']});
  const segment = panel.getByTestId('curves-segment-select');
  await expect(segment.getByRole('option')).toHaveCount(2);
  await segment.selectOption((await segment.getByRole('option').filter({hasText: 'Rotate'}).getAttribute('value'))!);
  const current = page.getByTestId('timeline-current');
  await current.fill('10');
  await current.press('Enter');

  const active = panel.getByTestId('curves-handle-0');
  const overlay = panel.getByTestId(`curves-overlay-handle-${meshOwner!.id}-0-0`);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const authored = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  await active.press('Control+Enter');
  await overlay.press('Control+Enter');
  await selected();
  await expect(active).toHaveAttribute('data-curve-time', '0.45');
  await expect(overlay).toHaveAttribute('data-curve-time', '0.25');
  expect(await native.snapshot()).toEqual(before);
  expect(authored()).toHaveLength(0);

  await active.scrollIntoViewIfNeeded();
  const origin = await active.evaluate(element => {
    const circle = element as unknown as SVGCircleElement;
    const transform = circle.getScreenCTM()!;
    const point = new DOMPoint(circle.cx.baseVal.value, circle.cy.baseVal.value).matrixTransform(transform);
    return {x: point.x, y: point.y, time: 214 * transform.a, progress: 102 * transform.d};
  });
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + .16 * origin.time, origin.y - .1 * origin.progress, {steps: 4});
  await expect.poll(async () => Number(await active.getAttribute('data-curve-time'))).toBeGreaterThan(.55);
  await expect.poll(async () => Number(await overlay.getAttribute('data-curve-time'))).toBeGreaterThan(.55);
  expect(await native.snapshot()).toEqual(before);
  expect(authored()).toHaveLength(0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await restored();

  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + .15 * origin.time, origin.y, {steps: 4});
  await expect.poll(async () => Number(await overlay.getAttribute('data-curve-time'))).toBeGreaterThan(.55);
  // At x≈1.06 the Rotate time cubic is still monotone with its unpicked
  // incoming control at .7. The corresponding Deform handle exceeds f24.
  await page.mouse.move(origin.x + .61 * origin.time, origin.y, {steps: 4});
  await restored();
  await page.mouse.up();
  await restored();

  await active.press('Shift+ArrowRight');
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
  const after = (await native.snapshot())!;
  expect(authored()).toHaveLength(1);
  expect(authored()[0]!.args.poseEpoch).toBeUndefined();
  const rotateControls = [[9, 29.25, 11, 16], [0, 0, 0, 0]];
  const progressControls = [12, .25, 16, -0];
  expect(authored()[0]!.args).toMatchObject({expectedRevision: before.revision, edit: {
    type: 'setAnimationKeyBatch', animation, slotKeys: [],
    boneKeys: [{bone, channel: 'rotate', frame: 4, keyId: rotateOwner!.id, values: [35, 0], curve: 'bezier', controls: rotateControls}],
    deformKeys: [{attachment: mesh.id, frame: 0, keyId: meshOwner!.id, dataPresent: true, curve: 'bezier',
      offsetBits: bits(offsets), controlsBits: bits(progressControls)}],
  }});
  expect(rotate(after)).toEqual([{...rotateOwner, controls: rotateControls}, rotateEnd]);
  expect(deform(after)).toEqual([{...meshOwner, controls: progressControls}, meshEnd]);
  expect(after.bones).toEqual(before.bones);
  expect(after.slots).toEqual(before.slots);
  expect(after.animations!.filter(item => item.id !== animation)).toEqual(before.animations!.filter(item => item.id !== animation));
  await selected();
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(before.animations);
  expect(authored().map(call => (call.args.edit as RigEdit).type)).toEqual(['setAnimationKeyBatch', 'undo']);
  await selected();
  await expect(active).toHaveAttribute('data-curve-time', '0.45');
  await expect(overlay).toHaveAttribute('data-curve-time', '0.25');

  const pointerBefore = (await native.snapshot())!;
  const pointerStart = authored().length;
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + .16 * origin.time, origin.y - .1 * origin.progress, {steps: 4});
  await expect.poll(async () => Number(await overlay.getAttribute('data-curve-time'))).toBeGreaterThan(.55);
  expect(authored().slice(pointerStart)).toEqual([]);
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(pointerBefore.revision + 1);
  const pointerAfter = (await native.snapshot())!;
  const rotatePoint = rotate(pointerAfter)[0]!.controls![0];
  const deformPoint = deform(pointerAfter)[0]!.controls!;
  expect((rotatePoint[0] - 4) / 10).toBeCloseTo(deformPoint[0] / 24, 6);
  expect((rotatePoint[1] - 35) / -23).toBeCloseTo(deformPoint[1], 6);
  expect(authored().slice(pointerStart).map(call => (call.args.edit as RigEdit).type)).toEqual(['setAnimationKeyBatch']);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(before.animations);
  await selected();

  async function selected() {
    await expect(active).toHaveAttribute('aria-pressed', 'true');
    await expect(overlay).toHaveAttribute('aria-pressed', 'true');
    await expect(rotateMarker).toHaveAttribute('aria-pressed', 'true');
    await expect(meshMarker).toHaveAttribute('aria-pressed', 'true');
    await expect(current).toHaveValue('10');
  }

  async function restored() {
    await selected();
    await expect(active).toHaveAttribute('data-curve-time', '0.45');
    await expect(overlay).toHaveAttribute('data-curve-time', '0.25');
    expect(await native.snapshot()).toEqual(before);
    expect(authored()).toHaveLength(0);
  }
});
