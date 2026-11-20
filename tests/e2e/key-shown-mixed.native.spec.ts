import type {Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

async function openDopesheet(page: Page, animation: number) {
  await page.setViewportSize({width: 1180, height: 820});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(page.getByTestId('timeline-tab-dopesheet')).toHaveClass(/active/);
}

async function seek(page: Page, frame: number) {
  const current = page.getByTestId('timeline-current');
  await current.fill(String(frame));
  await current.press('Enter');
  await expect(current).toHaveValue(String(frame));
}

function authoring(native: NativeSession, start: number) {
  return native.calls.slice(start).filter(call => call.command === 'edit_rig');
}

function treeBone(page: Page, id: number) {
  return page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
}

test('@native Dopesheet Key Shown commits one mixed pose batch from collapsed locked rows', async ({page, native}, info) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own mixed Key Shown', discardChanges: true});
  const root = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'create', parent: root, x: 55, y: 12, rotation: 0, length: 28});
  const otherBone = project.editedBone!;
  await edit({type: 'createSlot', bone: root, name: 'Display slot'});
  const slot = project.editedSlot!;
  await edit({type: 'createSlot', bone: otherBone, name: 'Draw order sentinel'});
  const otherSlot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: ['green']});
  const attachment = project.editedAttachment!;
  await edit({type: 'attachmentEdit', id: attachment, edit: {type: 'convertMesh', id: slot}});
  await edit({type: 'bindAttachment', id: attachment, bones: [root, otherBone]});
  await edit({type: 'setActiveAttachment', slot, attachment});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot: otherSlot, keys: ['red']});
  const hiddenAttachment = project.editedAttachment!;
  await edit({type: 'attachmentEdit', id: hiddenAttachment, edit: {type: 'convertMesh', id: otherSlot}});
  await edit({type: 'bindAttachment', id: hiddenAttachment, bones: [root, otherBone]});
  await edit({type: 'addConstraint', constraint: {
    type: 'physics', name: 'Own gravity', bone: root, x: 1, y: 1, rotate: null, scaleX: 0, shearX: 0,
    step: Math.fround(1 / 60), inertia: .5, strength: 60, damping: .85, mass: 1, wind: 0, gravity: 10, mix: 1, limit: 5000,
    globals: {inertia: false, strength: false, damping: false, mass: false, wind: false, gravity: false, mix: false},
  }});
  const physics = project.constraints!.at(-1)!.id;
  await edit({type: 'createEvent', name: 'Own pulse'});
  const event = project.editedEvent!;
  await edit({type: 'createAnimation', name: 'Mixed keyed pose'});
  const animation = project.editedAnimation!;
  const setupOrder = project.slots.map(item => item.id);
  expect(setupOrder).toEqual(expect.arrayContaining([slot, otherSlot]));
  const reversedOrder = setupOrder.slice().reverse();
  const offsets = [2, -4, 8, -4, -6, 4, 12, 2, 4, 8, -8, 6, 10, -6, -4, -2];
  const midpoint = offsets.map(value => value / 2);
  await edit({type: 'setAnimationKeyBatch', animation, boneKeys: [
    {bone: root, channel: 'rotate', frame: 0, values: [5, 0], curve: 'linear'},
    {bone: root, channel: 'rotate', frame: 20, values: [25, 0], curve: 'linear'},
    {bone: otherBone, channel: 'translate', frame: 0, values: [10, 3], curve: 'linear'},
    {bone: otherBone, channel: 'translate', frame: 20, values: [20, 9], curve: 'linear'},
  ], slotKeys: [
    {slot, channel: 'rgba', frame: 0, values: [.125, .25, .375, .5], curve: 'linear'},
    {slot, channel: 'rgba', frame: 20, values: [.875, .75, .625, 1], curve: 'linear'},
    {slot, channel: 'attachment', frame: 0, attachment: null},
    {slot, channel: 'attachment', frame: 20, attachment},
  ], drawOrderKeys: [{frame: 0, order: reversedOrder}, {frame: 20, order: null}], constraintKeys: [
    {channel: 'physics', constraint: physics, property: 'gravity', frame: 0, value: 4, curve: 'linear'},
    {channel: 'physics', constraint: physics, property: 'gravity', frame: 20, value: 12, curve: 'linear'},
    {channel: 'physicsReset', constraint: physics, frame: 4},
  ], eventKeys: [{event, frame: 6, int: 19, float: .25, string: 'Pulse', volume: .5, balance: 0}], deformKeys: [
    {attachment, frame: 0, offsets: Array(16).fill(0), dataPresent: false, curve: 'bezier', controls: [5, .25, 15, .75]},
    {attachment, frame: 20, offsets, dataPresent: true, curve: 'linear'},
    {attachment: hiddenAttachment, frame: 0, offsets: Array(16).fill(0), dataPresent: false, curve: 'linear'},
    {attachment: hiddenAttachment, frame: 20, offsets: offsets.map(value => value * 2), dataPresent: true, curve: 'linear'},
  ]});

  await openDopesheet(page, animation);
  await treeBone(page, root).click();
  const lock = page.getByTestId('timeline-row-lock');
  await lock.press('Enter');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await treeBone(page, otherBone).click();
  await expect(page.getByTestId(`timeline-key-deform-${attachment}`)).toBeVisible();
  await expect(page.getByTestId(`timeline-key-deform-${hiddenAttachment}`)).toHaveCount(0);
  const rootRow = page.getByTestId('timeline-bone-row-'+root);
  await rootRow.getByRole('button', {name: /^Collapse/}).click();
  await expect(rootRow.getByRole('button', {name: /^Expand/})).toBeVisible();
  await expect(page.getByTestId('timeline-bone-row-'+otherBone)).toHaveCount(0);
  await expect(page.getByTestId('timeline-key-slot-'+slot+'-rgba')).toHaveCount(0);
  await expect(page.getByTestId(`timeline-key-deform-${attachment}`)).toHaveCount(0);
  const keyShown = page.getByTestId('timeline-row-key-shown');
  await expect(keyShown).toBeEnabled();
  await seek(page, 10);

  const before = (await native.snapshot())!;
  const clip = (snapshot: ProjectSummary) => snapshot.animations!.find(item => item.id === animation)!;
  const oldClip = clip(before);
  const oldDeform = oldClip.deformTracks!.find(track => track.attachment === attachment)!;
  const start = native.calls.length;
  await keyShown.press('Space');
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
  const [call] = authoring(native, start);
  expect(authoring(native, start)).toHaveLength(1);
  expect(call?.args.expectedRevision).toBe(before.revision);
  const batch = call!.args.edit as RigEdit;
  if (batch.type !== 'setAnimationKeyBatch') throw new Error('Key Shown must author one mixed batch');
  expect(batch.animation).toBe(animation);
  expect(batch.boneKeys).toEqual([{bone: root, channel: 'rotate', frame: 10, values: [15, 0], curve: 'linear'}]);
  expect(batch.slotKeys).toEqual(expect.arrayContaining([
    {slot, channel: 'attachment', frame: 10, attachment: null},
    expect.objectContaining({slot, channel: 'rgba', frame: 10, values: [.5, .5, .5, .75], curve: 'linear'}),
  ]));
  expect(batch.slotKeys).toHaveLength(2);
  expect(batch.drawOrderKeys).toEqual([{frame: 10, order: reversedOrder}]);
  expect(batch.constraintKeys).toMatchObject([{channel: 'physics', constraint: physics, property: 'gravity', frame: 10, value: 8, curve: 'linear'}]);
  expect(batch.eventKeys).toBeUndefined();
  expect(batch.deformKeys).toMatchObject([
    {attachment, keyId: oldDeform.keys[0]!.id, frame: 0, offsets: Array(16).fill(0), dataPresent: false,
      curve: 'bezier', controls: [2.5, .25, 6.25, .625]},
    {attachment, frame: 10, offsets: midpoint, curve: 'bezier', controls: [13.75, .375, 17.5, .75]},
  ]);

  const after = (await native.snapshot())!;
  const newClip = clip(after);
  expect(newClip.tracks.find(track => track.bone === root)?.keys[1]).toMatchObject({frame: 10, values: [15, 0]});
  expect(newClip.tracks.find(track => track.bone === otherBone)).toEqual(oldClip.tracks.find(track => track.bone === otherBone));
  expect(newClip.slotTracks?.find(track => track.channel === 'rgba')?.keys[1]).toMatchObject({frame: 10, values: [.5, .5, .5, .75]});
  expect(newClip.slotTracks?.find(track => track.channel === 'attachment')?.keys[1]).toMatchObject({frame: 10, attachment: null});
  expect(newClip.drawOrder?.[1]).toMatchObject({frame: 10, order: reversedOrder});
  expect(newClip.constraintTracks?.find(track => track.channel === 'physics')?.keys[1]).toMatchObject({frame: 10, value: 8});
  expect(newClip.constraintTracks?.find(track => track.channel === 'physicsReset')).toEqual(oldClip.constraintTracks?.find(track => track.channel === 'physicsReset'));
  expect(newClip.eventTracks).toEqual(oldClip.eventTracks);
  const visibleDeform = newClip.deformTracks!.find(track => track.attachment === attachment)!;
  expect(visibleDeform.keys.map(key => key.frame)).toEqual([0, 10, 20]);
  expect(visibleDeform.keys[0]).toEqual({...oldDeform.keys[0], controls: [2.5, .25, 6.25, .625]});
  expect(visibleDeform.keys[1]).toMatchObject({frame: 10, offsets: midpoint, dataPresent: true, curve: 'bezier', controls: [13.75, .375, 17.5, .75]});
  expect(visibleDeform.keys[2]).toEqual(oldDeform.keys[1]);
  expect(newClip.deformTracks!.find(track => track.attachment === hiddenAttachment))
    .toEqual(oldClip.deformTracks!.find(track => track.attachment === hiddenAttachment));
  await expect(page.getByTestId('timeline-current')).toHaveValue('10');
  expect(after.slots).toEqual(before.slots);
  expect(after.constraints).toEqual(before.constraints);

  await expect(keyShown).toBeEnabled();
  const repeat = native.calls.length;
  await keyShown.press('Enter');
  expect(await native.snapshot()).toEqual(after);
  expect(authoring(native, repeat)).toHaveLength(0);
  await page.screenshot({path: info.outputPath('key-shown-collapsed-dopesheet.png')});

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(before.animations);
  expect(authoring(native, start).map(call => (call.args.edit as RigEdit).type)).toEqual(['setAnimationKeyBatch', 'undo']);
});

test('@native Key Shown rejects an overshooting color sample without partially keying the bone', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own rejected Key Shown', discardChanges: true});
  const bone = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone, name: 'Overshoot color'});
  const slot = project.editedSlot!;
  await edit({type: 'createAnimation', name: 'Overshoot'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeyBatch', animation, boneKeys: [
    {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 20, values: [20, 8], curve: 'linear'},
  ], slotKeys: [
    {slot, channel: 'rgba', frame: 0, values: [.5, .5, .5, 1], curve: 'bezier',
      controls: [[5, 2, 15, 2], [5, .5, 15, .5], [5, .5, 15, .5], [5, 1, 15, 1]]},
    {slot, channel: 'rgba', frame: 20, values: [.5, .5, .5, 1], curve: 'linear'},
  ]});
  await openDopesheet(page, animation);
  await treeBone(page, bone).click();
  await seek(page, 10);
  const before = await native.snapshot();
  const start = native.calls.length;
  await page.getByTestId('timeline-row-key-shown').click();
  await expect(page.getByRole('alert').filter({hasText: 'RGBA key values must be finite between zero and one.'})).toBeVisible();
  const [call] = authoring(native, start);
  expect(authoring(native, start)).toHaveLength(1);
  expect(call?.error?.message).toContain('RGBA key values');
  expect(call?.args.edit).toMatchObject({type: 'setAnimationKeyBatch', animation,
    boneKeys: [{bone, channel: 'translate', frame: 10, values: [10, 4]}],
    slotKeys: expect.arrayContaining([expect.objectContaining({slot, channel: 'rgba', frame: 10, values: [1.625, .5, .5, 1]})]),
  });
  expect(await native.snapshot()).toEqual(before);
});

test('@native Key Shown rejects an unrepresentable Deform split before authoring any visible row', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own unrepresentable Deform Key Shown', discardChanges: true});
  const bone = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone, name: 'Exact float boundary'});
  const slot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: ['green']});
  const attachment = project.editedAttachment!;
  await edit({type: 'attachmentEdit', id: attachment, edit: {type: 'convertMesh', id: slot}});
  await edit({type: 'createAnimation', name: 'No dense midpoint'});
  const animation = project.editedAnimation!;
  // There is no stored f32 value strictly between these authored endpoints.
  const adjacent = 1 + 2 ** -23;
  await edit({type: 'setAnimationKeyBatch', animation, boneKeys: [
    {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 20, values: [20, 8], curve: 'linear'},
  ], slotKeys: [], deformKeys: [
    {attachment, frame: 0, offsets: [1, 0, 0, 0, 0, 0, 0, 0], curve: 'bezier', controls: [5, .25, 15, .75]},
    {attachment, frame: 20, offsets: [adjacent, 0, 0, 0, 0, 0, 0, 0], curve: 'linear'},
  ]});
  await openDopesheet(page, animation);
  await treeBone(page, bone).click();
  await expect(page.getByTestId(`timeline-key-deform-${attachment}`)).toBeVisible();
  await expect(page.getByTestId(`timeline-key-bone-${bone}-translate`)).toBeVisible();
  await seek(page, 10);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  await page.getByTestId('timeline-row-key-shown').click();
  await expect(page.getByRole('alert').filter({hasText: 'The deformation split cannot represent a varying coordinate on both sides of Current.'})).toBeVisible();
  expect(authoring(native, start)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(before);
  await expect(page.getByTestId('timeline-current')).toHaveValue('10');
});
