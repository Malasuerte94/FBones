import {inflateSync} from 'node:zlib';
import type {Page} from '@playwright/test';
import type {MeshView, ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

type Point = [number, number];
type RGB = [number, number, number];
const blue: RGB = [55, 110, 225];

async function prepareMeshDisplay(native: NativeSession, name: string, options: {visitorMesh?: boolean; weightedActive?: boolean} = {}) {
  let project = await native.invoke<ProjectSummary>('create_project', {name, discardChanges: true});
  const bone = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone, name: 'Earlier mask'});
  const mask = project.editedSlot!;
  await edit({type: 'createSlot', bone, name: 'Mesh variants'});
  const owner = project.editedSlot!;
  await edit({type: 'createSlot', bone, name: 'Other artwork'});
  const visitor = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const ids: number[] = [];
  for (const [slot, image, x] of [[owner, 'red', -100], [owner, 'green', 30], [visitor, 'blue', 165]] as const) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: [image]});
    const id = project.editedAttachment!;
    ids.push(id);
    await edit({type: 'updateAttachment', id, x, y: 50, rotation: 0, scaleX: 1, scaleY: 1});
    if (slot === owner || options.visitorMesh) await edit({type: 'attachmentEdit', id, edit: {type: 'convertMesh', id: slot}});
  }
  const [active, inactive, unrelated] = ids as [number, number, number];
  const slotOf = (model: ProjectSummary, id: number) => model.slots.find(slot => slot.id === id)!;
  const meshOf = (model: ProjectSummary, id: number) => slotOf(model, owner).attachments!.find(item => item.id === id)!.mesh!;
  await edit({type: 'attachmentEdit', id: active, edit: {type: 'meshEdge', id: owner, a: 0, b: 2, remove: false}});
  await edit({type: 'generateMeshVertices', id: active});
  if (options.weightedActive) await edit({type: 'bindAttachment', id: active, bones: [bone]});
  await edit({type: 'setSlotColor', id: owner, color: 0xffffffcc});
  await edit({type: 'setAttachmentColor', id: active, color: 0xffffffbf});
  await edit({type: 'setActiveAttachment', slot: owner, attachment: active});
  await edit({type: 'createClipping', slot: mask, name: 'Cuts off upper mesh art', endSlot: owner, convex: true,
    vertices: [{x: -170, y: 0}, {x: 95, y: 0}, {x: 95, y: 72}, {x: -170, y: 72}]});
  const clip = project.editedAttachment!;
  await edit({type: 'setActiveAttachment', slot: mask, attachment: clip});
  return {project, bone, owner, active, inactive, unrelated, slotOf, meshOf};
}

function stageSamples(page: Page) {
  const canvas = page.getByTestId('viewport').locator('canvas');
  async function screen([x, y]: Point) {
    const box = (await canvas.boundingBox())!;
    const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
    return {x: box.x + box.width / 2 + x * zoom, y: box.y + box.height / 2 - y * zoom};
  }
  async function pixels(point: Point, size = 1) {
    const {x, y} = await screen(point);
    const half = Math.floor(size / 2);
    return screenshotRGB(await page.screenshot({scale: 'css', clip: {x: Math.floor(x) - half, y: Math.floor(y) - half, width: size, height: size}}));
  }
  const pixel = async (point: Point) => (await pixels(point))[0]!;
  const guide = async (point: Point) => (await pixels(point, 5)).some(([r, g, b]) => r < 185 && g > 110 && b > 115);
  return {screen, pixels, pixel, guide};
}

test('@native Mesh display switches guides and inspected art without editing the scene or bypassing its clipping mask', async ({page, native}) => {
  const {project, owner, active, inactive, unrelated, slotOf, meshOf} = await prepareMeshDisplay(native, 'Own Mesh presentation');
  const {screen, pixel, guide} = stageSamples(page);
  const mesh = meshOf(project, active);
  const midpoint = (a: number, b: number): Point => [0, 1].map(axis => (mesh.vertices[a]!.positions[axis]! + mesh.vertices[b]!.positions[axis]!) / 2) as Point;
  const inside = derivedLine(mesh);
  const edge = midpoint(0, 2);
  const hull = midpoint(2, 3);
  const handle = mesh.vertices[2]!.positions as Point;
  const activeArt: Point = [-130, 25];
  const isolatedArt: Point = [42, 29];
  const clippedArt: Point = [42, 85];
  const otherArt: Point = [170, 35];
  await openNativeEditor(page);
  const modes = page.getByRole('group', {name: 'Editing mode', exact: true});
  const row = (id: number) => page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem');
  const resetDeformation = page.getByTestId('attachment-mesh-reset-deformation');
  const freeze = page.getByTestId('attachment-mesh-freeze');
  const triangles = page.getByTestId('mesh-display-triangles');
  const dim = page.getByTestId('mesh-display-dim');
  const isolate = page.getByTestId('mesh-display-isolate');
  const read = async () => (await native.snapshot())!;
  async function inspect(id: number) {
    await row(id).click();
    await modes.getByRole('button', {name: 'Meshes', exact: true}).click();
    await expect(row(id)).toHaveAttribute('aria-selected', 'true');
  }
  const edits = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  async function expectPlannedMeshActions() {
    await expect(resetDeformation).toBeVisible();
    await expect(resetDeformation).toBeDisabled();
    await expect(resetDeformation).toHaveAccessibleName('Reset deformation');
    await expect(resetDeformation).toHaveAccessibleDescription('Unavailable. Realigns vertices to their UVs and clears weights and Deform keys.');
    await expect(freeze).toBeVisible();
    await expect(freeze).toBeDisabled();
    await expect(freeze).toHaveAccessibleName('Freeze');
    await expect(freeze).toHaveAccessibleDescription('Unavailable. Keeps current vertex positions and resets rotation and scale.');
  }
  async function expectNoPlannedMeshActions() {
    await expect(resetDeformation).toHaveCount(0);
    await expect(freeze).toHaveCount(0);
  }
  async function settings(triangleState: boolean, dimState: boolean, isolateState: boolean) {
    await expect(triangles).toHaveAttribute('aria-pressed', String(triangleState));
    await expect(dim).toHaveAttribute('aria-pressed', String(dimState));
    await expect(isolate).toHaveAttribute('aria-pressed', String(isolateState));
  }

  await inspect(active);
  await expect(triangles).toHaveAccessibleName('Triangles');
  await expect(dim).toHaveAccessibleName('Dim');
  await expect(isolate).toHaveAccessibleName('Isolate');
  await settings(true, false, false);
  const before = await read();
  const start = native.calls.length;
  await expectPlannedMeshActions();
  await expect(page.getByTestId('mesh-outline-reset')).toHaveAccessibleName('Reset');
  await expect(page.getByTestId('mesh-outline-reset')).toBeEnabled();
  await expect.poll(() => pixel(otherArt)).toEqual(blue);
  await expect.poll(async () => (await pixel(activeArt))[0]).toBeGreaterThan(115);
  await expect.poll(() => guide(inside)).toBe(true);
  for (const point of [edge, hull, handle]) await expect.poll(() => guide(point)).toBe(true);

  await triangles.click();
  await settings(false, false, false);
  await expect.poll(() => guide(inside)).toBe(false);
  for (const point of [edge, hull, handle]) await expect.poll(() => guide(point)).toBe(true);
  const full = await pixel(activeArt);
  await dim.click();
  await settings(false, true, false);
  await expect.poll(async () => (await pixel(activeArt))[0]).toBeLessThan(full[0] - 30);
  const dimmed = await pixel(activeArt);
  expect(await pixel(otherArt)).toEqual(blue);

  await inspect(inactive);
  await expect.poll(() => pixel(activeArt)).toEqual(full);
  const empty = await pixel(isolatedArt);
  const clipped = await pixel(clippedArt);
  await isolate.click();
  await settings(false, true, true);
  await expect.poll(async () => (await pixel(isolatedArt))[1]).toBeGreaterThan(empty[1] + 35);
  await expect.poll(() => pixel(clippedArt)).toEqual(clipped);
  await expect.poll(() => pixel(otherArt)).not.toEqual(blue);
  const backdrop = await pixel(activeArt);
  expect(backdrop[0]).toBeLessThan(dimmed[0]);
  for (const [channel, value] of dimmed.entries()) {
    expect(Math.abs(value - (full[channel]! + backdrop[channel]!) / 2)).toBeLessThanOrEqual(2);
  }
  for (const point of [otherArt, activeArt]) {
    const {x, y} = await screen(point);
    await page.mouse.click(x, y);
    await expect(row(inactive)).toHaveAttribute('aria-selected', 'true');
    await expect(row(unrelated)).toHaveAttribute('aria-selected', 'false');
    await expect(row(active)).toHaveAttribute('aria-selected', 'false');
  }
  expect(await read()).toEqual(before);
  expect(edits(start)).toHaveLength(0);
  expect(slotOf(await read(), owner).activeAttachmentId).toBe(active);

  await modes.getByRole('button', {name: 'Images', exact: true}).click();
  await expect(isolate).toHaveCount(0);
  await expect.poll(() => pixel(activeArt)).toEqual(full);
  await expect.poll(() => pixel(otherArt)).toEqual(blue);
  await expect.poll(() => pixel(isolatedArt)).toEqual(empty);
  await expectPlannedMeshActions();

  await row(active).click({modifiers: ['Control']});
  await expect(row(inactive)).toHaveAttribute('aria-selected', 'true');
  await expect(row(active)).toHaveAttribute('aria-selected', 'true');
  await expectNoPlannedMeshActions();
  await row(unrelated).click();
  await expect(row(unrelated)).toHaveAttribute('aria-selected', 'true');
  await expectNoPlannedMeshActions();

  const animate = page.getByTestId('editor-mode-animate');
  await animate.click();
  await expect(animate).toHaveAttribute('aria-pressed', 'true');
  await row(inactive).click();
  await expect(row(inactive)).toHaveAttribute('aria-selected', 'true');
  await expectNoPlannedMeshActions();
  await page.getByTestId('editor-mode-setup').click();
  await inspect(inactive);
  await expectPlannedMeshActions();
  await settings(false, true, true);
  expect(await read()).toEqual(before);
  expect(edits(start)).toHaveLength(0);

  await native.queueDialog('save', 'mesh-display.fbones');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await read()).dirty).toBe(false);
  const saved = await read();
  expect(saved.logicalDocumentId).toBe(before.logicalDocumentId);
  expect(saved.slots).toEqual(before.slots);
  expect(saved.canUndo).toBe(before.canUndo);
  expect(saved.canRedo).toBe(before.canRedo);
  await settings(false, true, true);
  expect(edits(start)).toHaveLength(0);

  const file = page.locator('header details').filter({has: page.locator('summary').filter({hasText: /^File$/})});
  await file.locator('summary').click();
  await file.getByRole('button', {name: /^Close project/}).click();
  await expect.poll(() => native.snapshot()).toBeNull();
  await native.queueDialog('open', 'mesh-display.fbones');
  await page.getByRole('button', {name: 'Open project', exact: true}).first().click();
  await expect.poll(() => native.snapshot()).not.toBeNull();
  const reopened = await read();
  expect(reopened.logicalDocumentId).not.toBe(saved.logicalDocumentId);
  const reopenedMesh = reopened.slots.find(slot => slot.name === 'Mesh variants')!.attachments!.find(item => item.name === 'green')!;
  await inspect(reopenedMesh.id);
  await settings(true, false, false);
});

test('@native attachment Wireframe displays only opted-in visible meshes and resets on reopen', async ({page, native}) => {
  const {project, bone, active, inactive, unrelated, meshOf} = await prepareMeshDisplay(
    native, 'Own Mesh wireframe', {visitorMesh: true, weightedActive: true},
  );
  const {pixels, pixel, guide} = stageSamples(page);
  const mesh = meshOf(project, active);
  expect(mesh.weighted).toBe(true);
  const inside = derivedLine(mesh);
  const activeHull: Point = [-100, 98];
  const activeEdge: Point = [-100, 50];
  const activeDot: Point = [-150, 100];
  const activeArt: Point = [-130, 25];
  const clippedArt: Point = [-140, 82];
  const otherArt: Point = [170, 35];
  const otherHull: Point = [165, 98];
  const inactiveHull: Point = [30, 98];
  const lavender: RGB = [185, 163, 208];
  const wireframeAt = async (point: Point) => (await pixels(point, 5)).some(rgb => {
    const [r, g, b] = rgb;
    // A 1.5-pixel stroke may be antialiased throughout its cross-section.
    return r - g >= 10 && b - r >= 15 &&
      rgb.every((channel, index) => Math.abs(channel - lavender[index]!) <= 34);
  });

  await openNativeEditor(page);
  const modes = page.getByRole('group', {name: 'Editing mode', exact: true});
  const setMode = (name: 'Images' | 'Meshes') => modes.getByRole('button', {name, exact: true}).click();
  const row = (kind: 'bone' | 'attachment', id: number) =>
    page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const wireframe = page.getByTestId('attachment-mesh-wireframe');
  const triangles = page.getByTestId('mesh-display-triangles');
  const isolate = page.getByTestId('mesh-display-isolate');
  const showImages = page.getByTestId('viewport-show-images');
  const read = async () => (await native.snapshot())!;
  async function deselectMesh() {
    await row('bone', bone).click();
    await expect(wireframe).toHaveCount(0);
  }
  await setMode('Images');
  await deselectMesh();
  await expect.poll(() => pixel(otherArt)).toEqual(blue);
  await expect.poll(async () => (await pixel(activeArt))[0]).toBeGreaterThan(115);
  expect(await wireframeAt(activeHull)).toBe(false);
  const visibleRed = await pixel(activeArt);
  const maskedRed = await pixel(clippedArt);
  expect(maskedRed[0]).toBeLessThan(visibleRed[0]);
  const baselineOther = await pixels(otherHull, 5);
  const baselineInactive = await pixels(inactiveHull, 5);
  const before = await read();
  const start = native.calls.length;

  await row('attachment', active).click();
  await expect(wireframe).toHaveAccessibleName('Wireframe');
  await expect(wireframe).not.toBeChecked();
  await wireframe.check();
  await row('attachment', inactive).click();
  await expect(wireframe).not.toBeChecked();
  await wireframe.check();
  await deselectMesh();
  await expect.poll(() => wireframeAt(activeHull)).toBe(true);
  expect(await wireframeAt(activeEdge)).toBe(true);
  expect(await pixel(activeDot)).toEqual(lavender);
  expect(await wireframeAt(inside)).toBe(false);
  expect(await pixel(activeArt)).toEqual(visibleRed);
  expect(await pixel(clippedArt)).toEqual(maskedRed);
  expect(await pixels(otherHull, 5)).toEqual(baselineOther);
  expect(await pixels(inactiveHull, 5)).toEqual(baselineInactive);

  await showImages.press('Space');
  await expect(showImages).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => wireframeAt(activeHull)).toBe(false);
  await expect.poll(() => pixel(otherArt)).not.toEqual(blue);
  await showImages.press('Space');
  await expect(showImages).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => wireframeAt(activeHull)).toBe(true);

  await row('attachment', active).click();
  await setMode('Meshes');
  await expect(triangles).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => guide(inside)).toBe(true);
  await expect.poll(() => wireframeAt(activeHull)).toBe(false);
  await triangles.click();
  await expect.poll(() => guide(inside)).toBe(false);
  expect(await guide(activeEdge)).toBe(true);
  await setMode('Images');
  await expect(wireframe).toBeChecked();
  await deselectMesh();
  await expect.poll(() => wireframeAt(activeHull)).toBe(true);

  await row('attachment', unrelated).click();
  await expect(wireframe).not.toBeChecked();
  await setMode('Meshes');
  await isolate.click();
  await expect(isolate).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => wireframeAt(activeHull)).toBe(false);
  expect(await pixel(otherArt)).toEqual(blue);
  expect(await pixel(activeArt)).not.toEqual(visibleRed);
  await isolate.click();
  await expect.poll(() => wireframeAt(activeHull)).toBe(true);
  expect(await read()).toEqual(before);

  await native.queueDialog('save', 'mesh-wireframe.fbones');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await read()).dirty).toBe(false);
  const saved = await read();
  expect(saved.logicalDocumentId).toBe(before.logicalDocumentId);
  expect(saved.slots).toEqual(before.slots);
  expect(saved.canUndo).toBe(before.canUndo);
  expect(saved.canRedo).toBe(before.canRedo);
  expect(await wireframeAt(activeHull)).toBe(true);

  const file = page.locator('header details').filter({has: page.locator('summary').filter({hasText: /^File$/})});
  await file.locator('summary').click();
  await file.getByRole('button', {name: /^Close project/}).click();
  await expect.poll(() => native.snapshot()).toBeNull();
  await native.queueDialog('open', 'mesh-wireframe.fbones');
  await page.getByRole('button', {name: 'Open project', exact: true}).first().click();
  await expect.poll(() => native.snapshot()).not.toBeNull();
  const reopened = await read();
  expect(reopened.logicalDocumentId).not.toBe(saved.logicalDocumentId);
  const reopenedMesh = reopened.slots.find(slot => slot.name === 'Mesh variants')!.attachments!.find(item => item.name === 'red')!;
  await setMode('Images');
  await row('attachment', reopenedMesh.id).click();
  await expect(wireframe).not.toBeChecked();
  await row('bone', reopened.bones[0]!.id).click();
  await expect.poll(() => wireframeAt(activeHull)).toBe(false);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toHaveLength(0);
});

function derivedLine(mesh: MeshView): Point {
  const point = (index: number) => mesh.vertices[index]!.positions as Point;
  const key = (a: number, b: number) => `${Math.min(a, b)}:${Math.max(a, b)}`;
  const explicit = new Set<string>();
  for (let at = 0; at < mesh.edges.length; at += 2) explicit.add(key(mesh.edges[at]!, mesh.edges[at + 1]!));
  for (let at = 0; at < mesh.triangles.length; at += 3) {
    const triangle = mesh.triangles.slice(at, at + 3);
    for (const [corner, a] of triangle.entries()) {
      const b = triangle[(corner + 1) % 3]!;
      if (explicit.has(key(a, b))) continue;
      const [ax, ay] = point(a), [bx, by] = point(b);
      const midpoint: Point = [(ax + bx) / 2, (ay + by) / 2];
      // Avoid masking edges, the explicit diagonal, the art probe, and handles.
      const [x, y] = midpoint;
      if (y > 10 && y < 62 && x > -138 && x < -62 && Math.abs((x + 100) + (y - 50)) > 10) return midpoint;
    }
  }
  throw Error('Missing a visible generated interior guide in the owned fixture');
}

function screenshotRGB(png: Buffer): RGB[] {
  const chunks: Buffer[] = [];
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  const lanes = png[25] === 6 ? 4 : 3;
  for (let offset = 8; offset < png.length;) {
    const size = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * lanes;
  let previous = Buffer.alloc(stride), offset = 0;
  const pixels: RGB[] = [];
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++]!;
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= lanes ? row[x - lanes]! : 0;
      const up = previous[x]!;
      const corner = x >= lanes ? previous[x - lanes]! : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = (left + up) >> 1;
      if (filter === 4) {
        const estimate = left + up - corner;
        const pa = Math.abs(estimate - left), pb = Math.abs(estimate - up), pc = Math.abs(estimate - corner);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
      }
      row[x] = (raw[offset++]! + predictor) & 255;
    }
    for (let x = 0; x < stride; x += lanes) pixels.push([row[x]!, row[x + 1]!, row[x + 2]!]);
    previous = row;
  }
  return pixels;
}
