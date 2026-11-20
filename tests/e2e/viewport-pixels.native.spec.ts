import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Setup Pixels previews and commits half-step Region translation', async ({page, native}, info) => {
  await page.setViewportSize({width: 1240, height: 850});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Region Pixels', discardChanges: true});
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'createSlot', bone: project.bones[0]!.id, name: 'Own artwork'});
  const slot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: ['green']});
  const attachment = project.editedAttachment!;
  const startX = -74.25, startY = 38.25;
  const dx = 14, dy = -9;
  await edit({type: 'updateAttachment', id: attachment, x: startX, y: startY, rotation: 0, scaleX: 1, scaleY: 1});
  const region = (snapshot: ProjectSummary) => snapshot.slots.find(item => item.id === slot)!.attachments!.find(item => item.id === attachment)!.region!;
  expect(region(project)).toMatchObject({x: startX, y: startY});

  await openNativeEditor(page);
  const imagesMode = page.getByRole('group', {name: 'Editing mode', exact: true}).getByRole('button', {name: 'Images', exact: true});
  const imageItem = page.locator(`[data-tree-kind="attachment"][data-tree-id="${attachment}"]`).getByRole('treeitem');
  await imagesMode.click();
  await imageItem.click();
  const pixels = page.getByTestId('viewport-pixels');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const names = page.getByTestId('viewport-names-images');
  const tag = page.getByTestId(`viewport-name-tag-images-${attachment}`);
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  await expect(pixels).toHaveAttribute('aria-pressed', 'false');
  await expect(pixels).toHaveAttribute('title', /half-pixel/);
  await names.press('Space');
  await expect(tag).toBeVisible();
  await expect(page.getByTestId('viewport-navigation').getByRole('slider')).toHaveValue('100');

  async function tagPosition() {
    return tag.evaluate(node => {
      const {left, top} = (node as HTMLElement).style;
      return {x: parseFloat(left), y: parseFloat(top)};
    });
  }
  async function imageOrigin() {
    const box = (await canvas.boundingBox())!;
    return {x: box.x + box.width / 2 + startX, y: box.y + box.height / 2 - startY};
  }
  async function moveRegion() {
    const from = await imageOrigin();
    await page.mouse.move(from.x, from.y);
    await expect(canvas).toHaveCSS('cursor', 'move');
    await page.mouse.down();
    await page.mouse.move(from.x + dx, from.y - dy, {steps: 4});
  }
  const editsSince = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  const initial = (await native.snapshot())!;
  const initialTag = await tagPosition();
  const continuous = native.calls.length;
  await moveRegion();
  await expect.poll(async () => (await tagPosition()).x - initialTag.x).toBeCloseTo(dx, 4);
  await expect.poll(async () => (await tagPosition()).y - initialTag.y).toBeCloseTo(-dy, 4);
  expect(await native.snapshot()).toEqual(initial);
  await page.mouse.up();
  await expect.poll(async () => region((await native.snapshot())!).x).toBe(startX + dx);
  expect(region((await native.snapshot())!).y).toBe(startY + dy);
  expect(editsSince(continuous)).toHaveLength(1);
  await undo.click();
  await expect.poll(async () => region((await native.snapshot())!)).toMatchObject({x: startX, y: startY});
  await imageItem.click();
  await expect.poll(tagPosition).toEqual(initialTag);

  const beforeSnap = (await native.snapshot())!;
  const changes = native.calls.length;
  await pixels.press('Space');
  await expect(pixels).toHaveAttribute('aria-pressed', 'true');
  const origin = await imageOrigin();
  await page.mouse.click(origin.x, origin.y);
  expect(await native.snapshot()).toEqual(beforeSnap);
  expect(editsSince(changes)).toHaveLength(0);
  await moveRegion();
  // These negative and positive quarter-pixel ties both round toward +infinity.
  const snappedX = -60, snappedY = 29.5;
  await expect.poll(async () => (await tagPosition()).x - initialTag.x).toBeCloseTo(snappedX - startX, 4);
  await expect.poll(async () => (await tagPosition()).y - initialTag.y).toBeCloseTo(startY - snappedY, 4);
  expect(await native.snapshot()).toEqual(beforeSnap);
  expect(editsSince(changes)).toHaveLength(0);
  await page.screenshot({path: info.outputPath('viewport-pixels-preview.png')});
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(tagPosition).toEqual(initialTag);
  expect(await native.snapshot()).toEqual(beforeSnap);
  expect(editsSince(changes)).toHaveLength(0);
  await moveRegion();
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(beforeSnap.revision + 1);
  const committed = (await native.snapshot())!;
  expect(region(committed)).toMatchObject({x: snappedX, y: snappedY, rotation: 0, scaleX: 1, scaleY: 1});
  expect(committed.bones).toEqual(beforeSnap.bones);
  expect(editsSince(changes)).toHaveLength(1);

  await page.getByTestId('editor-mode-animate').click();
  await expect(page.getByTestId('animate-auto-key')).toBeVisible();
  await expect(pixels).toHaveCount(0);
  await page.getByTestId('editor-mode-setup').click();
  await expect(pixels).toHaveAttribute('aria-pressed', 'true');
  expect(await native.snapshot()).toEqual(committed);

  await undo.click();
  await expect.poll(async () => region((await native.snapshot())!)).toMatchObject({x: startX, y: startY});
  await imagesMode.click();
  await imageItem.click();
  const beforeAxis = (await native.snapshot())!;
  const axisCalls = native.calls.length;
  const zoom = page.getByTestId('viewport-zoom');
  await zoom.fill('200');
  await expect(zoom).toHaveValue('200');
  const bounds = (await canvas.boundingBox())!;
  const axis = {x:bounds.x+bounds.width/2+startX*2,y:bounds.y+bounds.height/2-startY*2};
  await page.mouse.move(axis.x + 64, axis.y);
  await expect(canvas).toHaveCSS('cursor', 'ew-resize');
  await page.mouse.down();
  await page.mouse.move(axis.x + 64 + dx*2, axis.y + 11, {steps: 4});
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(beforeAxis.revision + 1);
  expect(region((await native.snapshot())!)).toMatchObject({x: snappedX, y: startY});
  expect(editsSince(axisCalls)).toHaveLength(1);
});
