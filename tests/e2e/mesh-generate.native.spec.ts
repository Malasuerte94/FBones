import type {MeshView, ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Mesh Generate preserves the inspected inactive mesh boundaries and rejects weighted or animated targets', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own mesh generation', discardChanges: true});
  const bone = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone, name: 'Own mesh variants'});
  const slot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const ids: number[] = [];
  for (const image of ['red', 'board', 'green', 'blue']) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: [image]});
    const id = project.editedAttachment!;
    ids.push(id);
    await edit({type: 'attachmentEdit', id, edit: {type: 'convertMesh', id: slot}});
  }
  const [active, target, weighted, keyed] = ids as [number, number, number, number];
  const owner = (model: ProjectSummary) => model.slots.find(item => item.id === slot)!;
  const attachment = (model: ProjectSummary, id: number) => owner(model).attachments!.find(item => item.id === id)!;
  const mesh = (model: ProjectSummary, id: number) => attachment(model, id).mesh!;
  const source = mesh(project, target);
  expect(source.vertices).toHaveLength(4);
  const [a, b] = source.triangles.slice(0, 3).filter(index => source.triangles.slice(3).includes(index));
  await edit({type: 'attachmentEdit', id: target, edit: {type: 'meshEdge', id: slot, a: a!, b: b!, remove: false}});
  expect(mesh(project, target).edges.length).toBeGreaterThan(source.edges.length);
  await edit({type: 'bindAttachment', id: weighted, bones: [bone]});
  await edit({type: 'createAnimation', name: 'Deform protection'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationDeformKeys', animation, keys: [
    {attachment: keyed, frame: 0, offsets: Array(8).fill(0), dataPresent: true, curve: 'linear'},
  ]});
  await edit({type: 'setActiveAttachment', slot, attachment: active});

  await openNativeEditor(page);
  const meshes = page.getByRole('group', {name: 'Editing mode', exact: true}).getByRole('button', {name: 'Meshes', exact: true});
  const row = (id: number) => page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem');
  const button = page.getByTestId('viewport-tool-hud').getByTestId('viewport-generate-mesh');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const read = async () => (await native.snapshot())!;
  async function choose(id: number) {
    await row(id).click();
    await meshes.click();
    await expect(row(id)).toHaveAttribute('aria-selected', 'true');
  }
  await choose(target);
  await expect(button).toHaveAccessibleName('Generate');
  const baseline = await read();
  const start = native.calls.length;

  async function generate(before: ProjectSummary) {
    const begin = native.calls.length;
    await expect(button).toBeEnabled();
    await button.click();
    await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
    const after = await read();
    const calls = native.calls.slice(begin).filter(call => call.command === 'edit_rig');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args.expectedRevision).toBe(before.revision);
    expect(calls[0]!.args.poseEpoch).toBeUndefined();
    expect(calls[0]!.args.edit).toEqual({type: 'generateMeshVertices', id: target});
    expect(owner(after).activeAttachmentId).toBe(active);
    expect(owner(after).attachments!.filter(item => item.id !== target)).toEqual(owner(before).attachments!.filter(item => item.id !== target));
    expect(after.bones).toEqual(before.bones);
    expect(after.animations).toEqual(before.animations);
    expect(attachment(after, target)).toEqual({...attachment(before, target), mesh: mesh(after, target)});
    checkInterior(mesh(before, target), mesh(after, target));
    await expect(row(target)).toHaveAttribute('aria-selected', 'true');
    return after;
  }

  const first = await generate(baseline);
  await generate(first);
  await undo.click();
  await expect.poll(async () => (await read()).slots).toEqual(first.slots);
  await undo.click();
  await expect.poll(async () => (await read()).slots).toEqual(baseline.slots);
  const history = native.calls.slice(start).filter(call => call.command === 'edit_rig').map(call => (call.args.edit as RigEdit).type);
  expect(history).toEqual(['generateMeshVertices', 'generateMeshVertices', 'undo', 'undo']);

  const guards = await read();
  const guardStart = native.calls.length;
  await choose(weighted);
  expect(mesh(guards, weighted).weighted).toBe(true);
  await expect(button).toBeDisabled();
  await choose(keyed);
  expect(mesh(guards, keyed).weighted).toBe(false);
  await expect(button).toBeDisabled();
  await choose(target);
  await expect(button).toBeEnabled();
  await page.getByTestId('editor-mode-animate').click();
  await meshes.click();
  await expect(page.getByTestId('viewport-deform-key')).toBeVisible();
  await expect(button).toHaveCount(0);
  expect(await read()).toEqual(guards);
  expect(native.calls.slice(guardStart).filter(call => call.command === 'edit_rig')).toHaveLength(0);
});

function checkInterior(before: MeshView, after: MeshView) {
  const start = before.vertices.length;
  expect(after.vertices.length).toBeGreaterThan(start);
  expect(after.vertices.slice(0, start)).toEqual(before.vertices);
  expect(after.uvs.slice(0, 2 * start)).toEqual(before.uvs);
  expect(after.edges).toEqual(before.edges);
  expect(after.hull).toBe(before.hull);
  expect(after.bones).toEqual(before.bones);
  expect(after.weighted).toBe(false);

  type Point = [number, number];
  const uv = (mesh: MeshView, index: number): Point => [mesh.uvs[2 * index]!, mesh.uvs[2 * index + 1]!];
  const area = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let index = start; index < after.vertices.length; index++) {
    const point = uv(after, index);
    let containing: {ids: number[]; mix: number[]} | undefined;
    for (let corner = 0; corner < before.triangles.length; corner += 3) {
      const ids = before.triangles.slice(corner, corner + 3);
      const [a, b, c] = ids.map(id => uv(before, id));
      const total = area(a!, b!, c!);
      const mix = [area(point, b!, c!) / total, area(a!, point, c!) / total, area(a!, b!, point) / total];
      if (mix.every(value => value > 1e-5)) {
        containing = {ids, mix};
        break;
      }
    }
    expect(containing, `new vertex ${index} lies inside one original face`).toBeDefined();
    for (const axis of [0, 1]) {
      const expected = containing!.ids.reduce((sum, id, lane) => sum + containing!.mix[lane]! * before.vertices[id]!.positions[axis]!, 0);
      expect(Math.abs(after.vertices[index]!.positions[axis]! - expected)).toBeLessThanOrEqual(1e-4);
    }
  }
}
