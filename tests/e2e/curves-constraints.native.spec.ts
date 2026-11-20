import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Curves edits IK, Transform and Physics segments through one addressed command each', async ({page, native}) => {
  await page.setViewportSize({width: 1100, height: 810});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own constraint curves', discardChanges: true});
  const root = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'create', parent: root, x: 28, y: 5, rotation: 0, length: 30});
  const ikBone = project.editedBone!;
  await edit({type: 'create', parent: root, x: -26, y: 12, rotation: 0, length: 25});
  const transformBone = project.editedBone!;
  await edit({type: 'addConstraint', constraint: {
    type: 'ik', name: 'Own curve IK', bones: [ikBone], target: root, mix: .8, softness: 8,
    stretch: false, compress: false, bendPositive: true,
  }});
  const ik = project.constraints!.at(-1)!.id;
  await edit({type: 'addConstraint', constraint: {
    type: 'transform', name: 'Own curve Transform', source: root, bones: [transformBone],
    localSource: true, localTarget: true, additive: false, clamp: false,
    offsets: [0, 0, 0, 0, 0, 0], mix: [0, 0, 0, 0, 0, 0],
    properties: [{property: 'x', offset: 0, to: [{property: 'rotate', offset: 0, max: 1, scale: 1}]}],
  }});
  const transform = project.constraints!.at(-1)!.id;
  await edit({type: 'addConstraint', constraint: {
    type: 'physics', name: 'Own curve Physics', bone: root, x: 1, y: 1, rotate: null, scaleX: 0, shearX: 0,
    step: Math.fround(1 / 60), inertia: .5, strength: 60, damping: .85, mass: 1, wind: 0, gravity: 10, mix: 1, limit: 5000,
    globals: {inertia: false, strength: false, damping: false, mass: false, wind: false, gravity: false, mix: false},
  }});
  const physics = project.constraints!.at(-1)!.id;
  const animation = project.animations![0]!.id;
  await edit({type: 'setAnimationConstraintKeys', animation, keys: [
    {channel: 'ik', constraint: ik, frame: 6, mix: .81, softness: 8.25, stretch: true, compress: false, bendPositive: false,
      curve: 'bezier', controls: [[7.5, .67, 10.5, .49], [7.5, 7, 10.5, 4.75]]},
    {channel: 'ik', constraint: ik, frame: 12, mix: .34, softness: 3.75, stretch: false, compress: true, bendPositive: true, curve: 'stepped'},
    {channel: 'ik', constraint: ik, frame: 18, mix: .5, softness: 5, stretch: false, compress: false, bendPositive: true, curve: 'linear'},
    {channel: 'transformMix', constraint: transform, frame: 4, curve: 'bezier', values: [.2, .3, .4, .5, .6, .875],
      controls: [[7, .225, 13, .275], [7, .325, 13, .375], [7, .425, 13, .475],
        [7, .525, 13, .575], [7, .625, 13, .675], [7, .75, 13, .5]]},
    {channel: 'transformMix', constraint: transform, frame: 16, curve: 'linear', values: [.3, .4, .5, .6, .7, .375]},
    {channel: 'physics', constraint: physics, property: 'gravity', frame: 3, value: 4, curve: 'linear'},
    {channel: 'physics', constraint: physics, property: 'gravity', frame: 15, value: 12, curve: 'linear'},
    {channel: 'physicsReset', constraint: physics, frame: 9},
  ]});
  const tracks = (snapshot: ProjectSummary) => snapshot.animations!.find(clip => clip.id === animation)!.constraintTracks!;
  const ikTrack = (snapshot: ProjectSummary) => tracks(snapshot).find(track => track.channel === 'ik')!;
  const transformTrack = (snapshot: ProjectSummary) => tracks(snapshot).find(track => track.channel === 'transformMix')!;
  const gravityTrack = (snapshot: ProjectSummary) => tracks(snapshot).find(track => track.channel === 'physics' && track.property === 'gravity')!;
  const originalIk = ikTrack(project).keys[0]!, originalTransform = transformTrack(project).keys[0]!, originalGravity = gravityTrack(project).keys[0]!;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(page.getByTestId('timeline-tab-dopesheet')).toHaveClass(/active/);
  const views = page.getByText('Views', {exact: true});
  await views.click();
  await page.getByTestId('view-toggle-curves').check();
  await views.click();
  const panel = page.getByTestId('curves-panel');
  const current = page.getByTestId('timeline-current');
  const handle = panel.getByTestId('curves-handle-0');
  const selector = panel.getByTestId('curves-component-select');
  await current.fill('5');
  await current.press('Enter');
  await expect(current).toHaveValue('5');
  await expect(panel.getByTestId('curves-empty')).toBeVisible();

  await selectKey(ik, originalIk.id);
  await expect(panel.getByTestId('curves-component-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByTestId('curves-component-1')).toHaveText('Softness');
  await panel.getByTestId('curves-component-1').click();
  await expect.poll(async () => Number(await handle.getAttribute('data-curve-progress'))).toBeCloseTo(5 / 18, 5);
  await panel.getByTestId('curves-component-0').click();
  const ikAfter = await commit(() => handle.press('ArrowUp'), 'ik', ik, originalIk.id);
  const updatedIk = ikTrack(ikAfter).keys[0]!;
  expect(updatedIk.controls![0][1]).toBeCloseTo(.6653, 5);
  expect(updatedIk.controls![0].slice(2)).toEqual(originalIk.controls![0].slice(2));
  expect(updatedIk.controls![1]).toEqual(originalIk.controls![1]);
  expect(updatedIk).toMatchObject({mix: originalIk.mix, softness: originalIk.softness, stretch: true, compress: false, bendPositive: false});
  expect(ikTrack(ikAfter).keys.slice(1)).toEqual(ikTrack(project).keys.slice(1));

  await selectKey(transform, originalTransform.id);
  await expect(selector.locator('option')).toHaveText(['Rotate', 'X', 'Y', 'Scale X', 'Scale Y', 'Shear Y']);
  await selector.selectOption('5');
  await expect.poll(async () => Number(await handle.getAttribute('data-curve-progress'))).toBeCloseTo(.25, 5);
  const transformAfter = await commit(() => handle.press('Shift+ArrowUp'), 'transformMix', transform, originalTransform.id);
  const updatedTransform = transformTrack(transformAfter).keys[0]!;
  expect(updatedTransform.controls![5]).toEqual([7, Math.fround(.725), 13, .5]);
  expect(updatedTransform.controls!.slice(0, 5)).toEqual(originalTransform.controls!.slice(0, 5));
  expect(updatedTransform.values).toEqual(originalTransform.values);
  expect(ikTrack(transformAfter)).toEqual(ikTrack(ikAfter));

  await selectKey(physics, originalGravity.id);
  await expect(panel.getByText(/Gravity/)).toBeVisible();
  await expect(selector).toHaveCount(0);
  await expect(panel.getByTestId('curves-component-0')).toHaveCount(0);
  await expect(panel.getByTestId('curves-interpolation-linear')).toHaveAttribute('aria-pressed', 'true');
  const physicsAfter = await commit(() => panel.getByTestId('curves-preset-ease-in').press('Enter'), 'physics', physics, originalGravity.id);
  expect(gravityTrack(physicsAfter).keys[0]).toMatchObject({value: 4, curve: 'bezier', controls: [7, Math.fround(4 + 8 / 3), 11, 12]});
  expect(tracks(physicsAfter).filter(track => track !== gravityTrack(physicsAfter)))
    .toEqual(tracks(transformAfter).filter(track => track !== gravityTrack(transformAfter)));
  expect(physicsAfter.constraints).toEqual(project.constraints);
  expect(physicsAfter.bones).toEqual(project.bones);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => tracks((await native.snapshot())!)).toEqual(tracks(transformAfter));
  await expect(current).toHaveValue('5');

  async function selectKey(constraint: number, keyId: number) {
    await page.locator(`[data-tree-kind="constraint"][data-tree-id="${constraint}"]`).getByRole('treeitem').click();
    await page.getByTestId(`timeline-key-${keyId}`).press('Enter');
    await expect(panel.getByTestId('curves-plot')).toBeVisible();
  }

  async function commit(action: () => Promise<void>, channel: string, constraint: number, keyId: number) {
    const before = (await native.snapshot())!;
    const start = native.calls.length;
    await action();
    await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
    const calls = native.calls.slice(start).filter(call => call.command === 'edit_rig');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args.expectedRevision).toBe(before.revision);
    expect(calls[0]!.args.edit).toMatchObject({type: 'setAnimationConstraintKeys', animation, keys: [{channel, constraint, keyId}]});
    await expect(current).toHaveValue('5');
    return (await native.snapshot())!;
  }
});
