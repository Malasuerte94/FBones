import {inflateSync} from 'node:zlib';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

type UV = [number, number];

test('@native Mesh New stages point edits over the full texture and commits one ordered outline with Undo and Reset', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own mesh outline', discardChanges: true});
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone: project.bones[0]!.id, name: 'Outline variants'});
  const slot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const center = {x: -100, y: 50};
  const size = 96;
  const ids: number[] = [];
  for (const [image, x] of [['red', 90], ['green', center.x]] as const) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: [image]});
    const id = project.editedAttachment!;
    ids.push(id);
    await edit({type: 'updateAttachment', id, x, y: center.y, rotation: 0, scaleX: 1, scaleY: 1});
    await edit({type: 'attachmentEdit', id, edit: {type: 'convertMesh', id: slot}});
  }
  const [active, target] = ids as [number, number];
  const owner = (model: ProjectSummary) => model.slots.find(item => item.id === slot)!;
  const attachment = (model: ProjectSummary, id: number) => owner(model).attachments!.find(item => item.id === id)!;
  const crop: UV[] = [[.25, .25], [.75, .25], [.75, .75], [.25, .75]];
  const world = ([u, v]: UV) => ({x: center.x + (u - .5) * size, y: center.y + (.5 - v) * size});
  await edit({type: 'attachmentEdit', id: target, edit: {type: 'moveVertices', id: slot, editUvs: true,
    vertices: crop.map((uv, vertex) => ({vertex, ...world(uv)}))}});
  await edit({type: 'setActiveAttachment', slot, attachment: active});
  expect(attachment(project, target).mesh!.uvs).toEqual(crop.flat());

  await openNativeEditor(page);
  const row = page.locator(`[data-tree-kind="attachment"][data-tree-id="${target}"]`).getByRole('treeitem');
  await row.click();
  await page.getByRole('group', {name: 'Editing mode', exact: true}).getByRole('button', {name: 'Meshes', exact: true}).click();
  await expect(row).toHaveAttribute('aria-selected', 'true');
  const fresh = page.getByTestId('mesh-new-outline');
  const reset = page.getByTestId('mesh-outline-reset');
  const draft = page.getByTestId('mesh-outline-draft-controls');
  const finish = draft.getByTestId('mesh-outline-finish');
  await expect(fresh).toHaveAccessibleName('New');
  await expect(reset).toHaveAccessibleName('Reset');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const read = async () => (await native.snapshot())!;
  const baseline = await read();
  const edits = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  async function screen(uv: UV) {
    const point = world(uv);
    const box = (await canvas.boundingBox())!;
    const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
    return {x: box.x + box.width / 2 + point.x * zoom, y: box.y + box.height / 2 - point.y * zoom};
  }
  async function mark(uv: UV) {
    const {x, y} = await screen(uv);
    await page.mouse.click(x, y);
  }
  async function texturePixel(uv: UV = [.875, .375]) {
    const {x, y} = await screen(uv);
    const png = await page.screenshot({scale: 'css', clip: {x: Math.floor(x), y: Math.floor(y), width: 1, height: 1}});
    const data: Buffer[] = [];
    for (let at = 8; at < png.length;) {
      const size = png.readUInt32BE(at);
      if (png.toString('ascii', at + 4, at + 8) === 'IDAT') data.push(png.subarray(at + 8, at + 8 + size));
      at += size + 12;
    }
    return [...inflateSync(Buffer.concat(data)).subarray(1, 4)];
  }

  const green = [55, 198, 100];
  // In the full texture but outside the authored 25–75% crop.
  const outside = await texturePixel();
  expect(outside).not.toEqual(green);
  const draftStart = native.calls.length;
  await fresh.click();
  await expect(draft).toContainText('0 vertices');
  await expect(finish).toBeDisabled();
  await expect(draft.getByTestId('mesh-outline-cancel')).toHaveAccessibleName('Cancel');
  await expect.poll(texturePixel).toEqual(green);
  await mark([1.125, .5]);
  await expect(draft).toContainText('0 vertices');
  for (const uv of [[.125, .125], [.875, .875], [.875, .125], [.125, .875]] as UV[]) await mark(uv);
  await expect(draft).toContainText('4 vertices');
  expect(await read()).toEqual(baseline);
  expect(edits(draftStart)).toHaveLength(0);

  const rejectionStart = native.calls.length;
  await page.keyboard.press('Enter');
  await expect.poll(() => edits(rejectionStart).find(call => call.error)?.error?.message).toBeTruthy();
  const [rejected] = edits(rejectionStart);
  expect(edits(rejectionStart)).toHaveLength(1);
  expect(rejected?.args).toMatchObject({expectedRevision: baseline.revision, edit: {type: 'replaceMeshOutline', id: target}});
  expect(rejected!.error!.message).toContain('simple closed outline');
  expect(rejected!.result).toBeUndefined();
  await expect(page.getByRole('alert').filter({hasText: rejected!.error!.message})).toBeVisible();
  await expect(draft).toContainText('4 vertices');
  expect(await read()).toEqual(baseline);
  const heldPoint = await screen([.125, .125]);
  const draggedPoint = await screen([.375, .25]);
  await page.mouse.move(heldPoint.x, heldPoint.y);
  await page.mouse.down();
  await page.mouse.move(draggedPoint.x, draggedPoint.y, {steps: 4});
  await expect(finish).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(draft).toHaveCount(0);
  await expect.poll(texturePixel).toEqual(outside);
  expect(await read()).toEqual(baseline);
  expect(edits(draftStart)).toHaveLength(1);

  const initialFirst: UV = [.0625, .5];
  const movedFirst: UV = [.25, .5];
  const source: UV[] = [[.125, .125], [.875, .125], [.875, .375], [.875, .625], [.625, .625], [.125, .875]];
  const movedFourth: UV = [.4375, .4375];
  // Removing the temporary first point leaves source order 0, 1, 3, 4′, 5.
  const concave = [source[0]!, source[1]!, source[3]!, movedFourth, source[5]!];
  const commitStart = native.calls.length;
  await fresh.click();
  await expect(draft).toContainText('0 vertices');
  for (const uv of [initialFirst, ...source]) await mark(uv);
  await expect(draft).toContainText('7 vertices');
  await expect.poll(() => texturePixel(initialFirst)).toEqual([255, 255, 255]);

  async function dragPoint(from: UV, to: UV) {
    const start = await screen(from), end = await screen(to);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, {steps: 6});
    await expect(draft).toContainText('7 vertices');
    expect(await read()).toEqual(baseline);
    expect(edits(commitStart)).toHaveLength(0);
    await page.mouse.up();
  }

  await dragPoint(initialFirst, movedFirst);
  await expect.poll(() => texturePixel(movedFirst)).toEqual([255, 255, 255]);
  await expect.poll(() => texturePixel(initialFirst)).not.toEqual([255, 255, 255]);
  await dragPoint(source[4]!, [1.125, .875]);
  await dragPoint(source[4]!, movedFourth);
  const removed = await screen(source[2]!);
  await page.mouse.dblclick(removed.x, removed.y);
  await expect(draft).toContainText('6 vertices');
  await page.keyboard.down('Shift');
  try { await mark(movedFirst); }
  finally { await page.keyboard.up('Shift'); }
  await expect(draft).toContainText('5 vertices');
  await expect(finish).toBeEnabled();
  expect(await read()).toEqual(baseline);
  expect(edits(commitStart)).toHaveLength(0);
  await mark(concave[0]!);
  await expect(draft).toHaveCount(0);
  await expect.poll(async () => (await read()).revision).toBe(baseline.revision + 1);
  const result = await read();
  const [committed] = edits(commitStart);
  expect(edits(commitStart)).toHaveLength(1);
  expect(committed!.args.expectedRevision).toBe(baseline.revision);
  expect(committed!.args.poseEpoch).toBeUndefined();
  const command = committed!.args.edit as RigEdit;
  if (command.type !== 'replaceMeshOutline') throw Error('Outline must use the attachment-addressed native edit');
  expect(command.id).toBe(target);
  expect(command.uvs).toHaveLength(5);
  command.uvs.forEach((uv, index) => uv.forEach((value, axis) => expect(Math.abs(value - concave[index]![axis]!)).toBeLessThan(1 / size)));
  const mesh = attachment(result, target).mesh!;
  expect(mesh.hull).toBe(5);
  expect(mesh.vertices).toHaveLength(5);
  expect(mesh.triangles).toHaveLength(9);
  expect(mesh.uvs).toEqual(command.uvs.flat().map(Math.fround));
  mesh.vertices.forEach((vertex, index) => {
    const expected = world(command.uvs[index]!);
    expect(Math.abs(vertex.positions[0]! - expected.x)).toBeLessThanOrEqual(1e-4);
    expect(Math.abs(vertex.positions[1]! - expected.y)).toBeLessThanOrEqual(1e-4);
  });
  expect(owner(result).activeAttachmentId).toBe(active);
  expect(attachment(result, active)).toEqual(attachment(baseline, active));
  expect(result.bones).toEqual(baseline.bones);
  expect(result.animations).toEqual(baseline.animations);
  await expect(row).toHaveAttribute('aria-selected', 'true');

  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  await undo.click();
  await expect.poll(async () => (await read()).slots).toEqual(baseline.slots);
  expect(edits(commitStart).map(call => (call.args.edit as RigEdit).type)).toEqual(['replaceMeshOutline', 'undo']);
  await expect(row).toHaveAttribute('aria-selected', 'true');

  const resetBefore = await read();
  const resetStart = native.calls.length;
  await reset.click();
  await expect.poll(async () => attachment(await read(), target).mesh!.uvs).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
  expect(edits(resetStart)).toHaveLength(1);
  expect(edits(resetStart)[0]!.args).toMatchObject({expectedRevision: resetBefore.revision,
    edit: {type: 'attachmentEdit', id: target, edit: {type: 'resetMesh', id: slot}}});
  expect(owner(await read()).activeAttachmentId).toBe(active);
  expect(attachment(await read(), active)).toEqual(attachment(baseline, active));
  await undo.click();
  await expect.poll(async () => (await read()).slots).toEqual(baseline.slots);
  expect(edits(resetStart).map(call => (call.args.edit as RigEdit).type)).toEqual(['attachmentEdit', 'undo']);
});
