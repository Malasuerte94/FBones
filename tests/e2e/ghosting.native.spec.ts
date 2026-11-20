import {inflateSync} from 'node:zlib';
import type {Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

async function stagePixel(page: Page, x: number, y: number) {
  const stage = (await page.getByTestId('viewport').locator('canvas').boundingBox())!;
  const png = await page.screenshot({scale: 'css', clip: {
    x: Math.floor(stage.x + stage.width / 2 + x),
    y: Math.floor(stage.y + stage.height / 2 - y), width: 1, height: 1,
  }});
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  return [...inflateSync(Buffer.concat(chunks)).subarray(1, 4)];
}

test('@native Ghosting draws neighboring bones and tinted images without authoring or changing Preview', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 720});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Ghosting', discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: project.bones[0]!.id, x: 0, y: 68, rotation: 0, length: 43});
  const bone = project.editedBone!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_images', {expectedRevision: project.revision, bone, x: 0, y: 68, keys: ['red']});
  await edit({type: 'updateAttachment', id: project.editedAttachment!, x: 0, y: 0, rotation: 0, scaleX: .28, scaleY: .28});
  await edit({type: 'createAnimation', name: 'Cross the viewport'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'translate', frame: 0, values: [-120, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 4, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 8, values: [120, 0], curve: 'linear'},
  ]});
  const before = await native.snapshot();
  const startCalls = native.calls.length;
  await openNativeEditor(page);
  const toggle = page.getByTestId('ghosting-toggle');
  const panel = page.getByTestId('ghosting-panel');
  await expect(toggle).toBeHidden();
  const setupBackground = await stagePixel(page, -100, 68);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const frame = page.getByTestId('timeline-current');
  await frame.fill('4');
  await frame.press('Enter');
  const preview = page.getByTestId('animation-preview').locator('canvas');
  await expect(preview).toBeVisible();
  await expect.poll(() => stagePixel(page, 0, 75)).toEqual([232, 62, 65]);
  await expect.poll(() => native.calls.slice(startCalls).filter(call => call.command === 'get_image_data').length).toBe(2);
  const currentPreview = await preview.screenshot();
  const backgroundLeft = await stagePixel(page, -100, 68);
  const backgroundRight = await stagePixel(page, 140, 68);
  const backgroundMiddle = await stagePixel(page, -40, 68);
  const leftArtBackground = await stagePixel(page, -126, 75);
  const rightArtBackground = await stagePixel(page, 114, 75);

  await page.getByText('Views', {exact: true}).click();
  await page.getByTestId('view-toggle-ghosting').press('Enter');
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight && node.scrollWidth <= node.clientWidth;
  })).toBe(true);
  await expect.poll(() => panel.locator('.numeric-slider-label > span').evaluateAll(labels =>
    labels.every(label => label.scrollWidth <= label.clientWidth))).toBe(true);
  await expect(panel.getByTestId('ghosting-motion-vectors-toggle')).toBeVisible();
  const enabled = panel.getByTestId('ghosting-enabled');
  await enabled.press('Space');
  await panel.getByTestId('ghosting-frames-fill').selectOption('images');
  await page.screenshot({path: info.outputPath('ghosting-controls.png')});
  await enabled.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect.poll(() => stagePixel(page, -100, 68)).not.toEqual(backgroundLeft);
  await expect.poll(() => stagePixel(page, 140, 68)).not.toEqual(backgroundRight);
  const earlier = await stagePixel(page, -100, 68);
  const later = await stagePixel(page, 140, 68);
  expect(earlier[2]!).toBeGreaterThan(earlier[0]!);
  expect(later[0]!).toBeGreaterThan(later[2]!);
  expect(await stagePixel(page, -126, 75)).not.toEqual(leftArtBackground);
  expect(await stagePixel(page, 114, 75)).not.toEqual(rightArtBackground);
  expect(await stagePixel(page, 0, 75)).toEqual([232, 62, 65]);
  expect(await preview.screenshot()).toEqual(currentPreview);
  await page.screenshot({path: info.outputPath('ghosting-viewport.png')});

  await toggle.press('Enter');
  await panel.getByTestId('ghosting-frames-before-toggle').click();
  await panel.getByTestId('ghosting-frames-after-toggle').click();
  await panel.getByTestId('ghosting-key-frames-before-toggle').click();
  await enabled.press('Escape');
  await expect.poll(() => stagePixel(page, -100, 68)).not.toEqual(backgroundLeft);
  expect(await stagePixel(page, 140, 68)).toEqual(backgroundRight);
  expect(await stagePixel(page, -40, 68)).toEqual(backgroundMiddle);

  const play = page.getByTestId('timeline-play');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await play.click();
  await expect(play).toHaveAccessibleName('Pause');
  await page.clock.runFor(75);
  await expect.poll(async () => Number(await frame.inputValue())).toBeGreaterThan(4);
  await play.click();
  await expect(play).toHaveAccessibleName('Play');
  await page.getByTestId('editor-mode-setup').click();
  await expect(toggle).toBeHidden();
  expect(await stagePixel(page, -100, 68)).toEqual(setupBackground);
  expect(await native.snapshot()).toEqual(before);
  const calls = native.calls.slice(startCalls);
  expect(calls.filter(call => ['edit_rig', 'save_project', 'evaluate_project'].includes(call.command))).toEqual([]);
  expect(calls.filter(call => call.command === 'get_image_data')).toHaveLength(2);
});

test('@native Ghosting filters by direct slot owner and draws bounded independent motion vectors', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 720});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Ghosting selection', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: 0, y: 92, rotation: 0, length: 24});
  const parent = project.editedBone!;
  await edit({type: 'create', parent, x: 0, y: -56, rotation: 0, length: 20});
  const child = project.editedBone!;
  const slots: number[] = [];
  for (const [bone, name] of [[root, 'Mask'], [parent, 'Parent art'], [root, 'Mask end'], [child, 'Child art']] as const) {
    await edit({type: 'createSlot', bone, name});
    slots.push(project.editedSlot!);
  }
  const [mask, parentSlot, maskEnd, childSlot] = slots as [number, number, number, number];
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  for (const [slot, key] of [[parentSlot, 'red'], [childSlot, 'blue']] as const) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: [key]});
    const attachment = project.editedAttachment!;
    await edit({type: 'updateAttachment', id: attachment, x: 0, y: 0, rotation: 0, scaleX: .25, scaleY: .25});
    if (slot === childSlot) await edit({type: 'attachmentEdit', id: attachment, edit: {type: 'convertMesh', id: slot}});
  }
  await edit({
    type: 'createClipping', slot: mask, name: 'Half of parent', endSlot: maskEnd, convex: true, inverse: false,
    vertices: [{x: -145, y: 72}, {x: -145, y: 112}, {x: -120, y: 112}, {x: -120, y: 72}],
  });
  await edit({type: 'createAnimation', name: 'Move both'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: parent, channel: 'translate', frame: 0, values: [-120, 0], curve: 'linear'},
    {bone: parent, channel: 'translate', frame: 4, values: [0, 0], curve: 'linear'},
    {bone: parent, channel: 'translate', frame: 8, values: [120, 0], curve: 'linear'},
  ]});
  const snapshot = await native.snapshot(), firstCall = native.calls.length;
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const frame = page.getByTestId('timeline-current');
  await frame.fill('4');
  await frame.press('Enter');
  const viewport = page.getByTestId('viewport').locator('canvas');
  const preview = page.getByTestId('animation-preview').locator('canvas');
  await expect.poll(() => stagePixel(page, -7, 42)).toEqual([55, 110, 225]);
  const currentPreview = await preview.screenshot();
  const parentPoint = () => stagePixel(page, -126, 98);
  const clippedPoint = () => stagePixel(page, -114, 98);
  const childPoint = () => stagePixel(page, -126, 42);
  const parentBackground = await parentPoint();
  const clippedBackground = await clippedPoint();
  const childBackground = await childPoint();
  const choose = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const launch = page.getByTestId('ghosting-toggle');
  const panel = page.getByTestId('ghosting-panel');
  const enabled = panel.getByTestId('ghosting-enabled');
  const selection = panel.getByTestId('ghosting-selection');
  const lock = panel.getByTestId('ghosting-lock-selection');
  const refresh = panel.getByTestId('ghosting-refresh-selection');
  const close = () => enabled.press('Escape');

  await choose(parent).click();
  await launch.click();
  await expect(lock).toBeDisabled();
  await enabled.check();
  await panel.getByTestId('ghosting-frames-fill').selectOption('images');
  await panel.getByTestId('ghosting-bones').uncheck();
  await selection.check();
  await expect(refresh).toBeDisabled();
  await close();
  await expect.poll(parentPoint).not.toEqual(parentBackground);
  expect(await clippedPoint()).toEqual(clippedBackground);
  expect(await childPoint()).toEqual(childBackground);

  await launch.click();
  await lock.press('Space');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await close();
  await choose(child).click();
  await expect.poll(parentPoint).not.toEqual(parentBackground);
  expect(await childPoint()).toEqual(childBackground);
  await launch.click();
  await refresh.click();
  await close();
  await expect.poll(childPoint).not.toEqual(childBackground);
  expect(await parentPoint()).toEqual(parentBackground);
  await launch.click();
  await lock.click();
  await close();
  await choose(parent).click();
  await expect.poll(parentPoint).not.toEqual(parentBackground);
  expect(await childPoint()).toEqual(childBackground);
  await viewport.press('Escape');
  await expect.poll(childPoint).not.toEqual(childBackground);
  expect(await parentPoint()).not.toEqual(parentBackground);
  expect(await clippedPoint()).toEqual(clippedBackground);

  const earlierLine = () => stagePixel(page, -60, 104);
  const laterLine = () => stagePixel(page, 60, 104);
  const childLine = () => stagePixel(page, -60, 48);
  const earlierBackground = await earlierLine(), laterBackground = await laterLine(), childLineBackground = await childLine();
  await launch.click();
  await panel.getByTestId('ghosting-frames-fill').selectOption('none');
  await panel.getByTestId('ghosting-motion-vectors-toggle').click();
  await panel.getByTestId('ghosting-motion-vectors-before-toggle').check();
  const beforeFrames = panel.getByTestId('ghosting-motion-vectors-before');
  const threshold = panel.getByTestId('ghosting-motion-vectors-threshold');
  await beforeFrames.fill('4');
  await beforeFrames.press('Enter');
  await threshold.fill('120');
  await threshold.press('Enter');
  await panel.screenshot({path: info.outputPath('ghosting-motion-controls.png')});
  await close();
  await expect.poll(earlierLine).not.toEqual(earlierBackground);
  await expect.poll(childLine).not.toEqual(childLineBackground);
  expect(await laterLine()).toEqual(laterBackground);
  expect(await parentPoint()).toEqual(parentBackground);
  expect(await childPoint()).toEqual(childBackground);
  await page.screenshot({path: info.outputPath('ghosting-motion-viewport.png')});
  await choose(child).click();
  await expect.poll(earlierLine).toEqual(earlierBackground);
  expect(await childLine()).not.toEqual(childLineBackground);
  await viewport.press('Escape');
  await expect.poll(earlierLine).not.toEqual(earlierBackground);

  await launch.click();
  await panel.getByTestId('ghosting-motion-vectors-toggle').click();
  await threshold.fill('121');
  await threshold.press('Enter');
  await close();
  await expect.poll(earlierLine).toEqual(earlierBackground);

  await launch.click();
  await panel.getByTestId('ghosting-motion-vectors-toggle').click();
  await threshold.fill('0');
  await threshold.press('Enter');
  await panel.getByTestId('ghosting-motion-vectors-before-toggle').uncheck();
  await panel.getByTestId('ghosting-motion-vectors-after-toggle').check();
  await close();
  await expect.poll(laterLine).not.toEqual(laterBackground);
  expect(await earlierLine()).toEqual(earlierBackground);
  expect(await preview.screenshot()).toEqual(currentPreview);
  expect(await native.snapshot()).toEqual(snapshot);
  expect(native.calls.slice(firstCall).filter(call => ['edit_rig', 'save_project', 'evaluate_project'].includes(call.command))).toEqual([]);
});

test('@native Ghosting fills and outlines clipped overlapping attachments per range', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 720});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Ghost outlines', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: 0, y: 84, rotation: 0, length: 24});
  const actor = project.editedBone!;
  const slots: number[] = [];
  for (const [bone, name] of [[root, 'Clip'], [actor, 'Red'], [actor, 'Blue'], [actor, 'Transparent']] as const) {
    await edit({type: 'createSlot', bone, name});
    slots.push(project.editedSlot!);
  }
  const [mask, red, blue, invisible] = slots as [number, number, number, number];
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  for (const [slot, key, x, y] of [[red, 'red', -5, 0], [blue, 'blue', 7, 0], [invisible, 'green', -40, 0]] as const) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: [key]});
    const attachment = project.editedAttachment!;
    await edit({type: 'updateAttachment', id: attachment, x, y, rotation: 0, scaleX: slot === blue ? -.25 : .25, scaleY: .25});
    if (slot === blue) await edit({type: 'attachmentEdit', id: attachment, edit: {type: 'convertMesh', id: slot}});
  }
  await edit({type: 'setSlotColor', id: invisible, color: 0xffffff00});
  await edit({
    type: 'createClipping', slot: mask, name: 'Art bounds', endSlot: blue, convex: true, inverse: false,
    vertices: [{x: -133, y: 68}, {x: -133, y: 102}, {x: 180, y: 102}, {x: 180, y: 68}],
  });
  await edit({type: 'createAnimation', name: 'Crosses'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: actor, channel: 'translate', frame: 0, values: [-120, 0], curve: 'linear'},
    {bone: actor, channel: 'translate', frame: 4, values: [0, 0], curve: 'linear'},
    {bone: actor, channel: 'translate', frame: 8, values: [120, 0], curve: 'linear'},
  ]});
  const firstCall = native.calls.length, baseline = await native.snapshot();
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const frame = page.getByTestId('timeline-current');
  await frame.fill('4');
  await frame.press('Enter');
  await expect.poll(() => stagePixel(page, -10, 89)).toEqual([232, 62, 65]);
  const preview = page.getByTestId('animation-preview').locator('canvas');
  const previewBaseline = await preview.screenshot();
  const launch = page.getByTestId('ghosting-toggle');
  const panel = page.getByTestId('ghosting-panel');
  const enabled = panel.getByTestId('ghosting-enabled');
  const fill = panel.getByTestId('ghosting-frames-fill');
  const outline = panel.getByTestId('ghosting-frames-outline');
  const keyFill = panel.getByTestId('ghosting-key-frames-fill');
  const close = () => enabled.press('Escape');
  const seam = () => stagePixel(page, -126, 89);
  const edge = () => stagePixel(page, -100, 89);
  const interiorRed = () => stagePixel(page, -130, 89);
  const interiorBlue = () => stagePixel(page, -107, 89);
  const clipped = () => stagePixel(page, -137, 89);
  const transparentEdge = () => stagePixel(page, -173, 89);
  const keyGhost = () => stagePixel(page, 109, 89);
  const baseSeam = await seam(), baseEdge = await edge(), baseRed = await interiorRed(), baseClipped = await clipped();
  const baseTransparent = await transparentEdge(), baseKey = await keyGhost();

  await launch.click();
  await enabled.check();
  await panel.getByTestId('ghosting-bones').uncheck();
  await panel.getByTestId('ghosting-frames-after-toggle').uncheck();
  const opacity = panel.getByTestId('ghosting-opacity');
  await opacity.fill('100');
  await opacity.press('Enter');
  await fill.selectOption('images');
  await close();
  await expect.poll(interiorRed).not.toEqual(baseRed);
  expect(await interiorRed()).not.toEqual(await interiorBlue());

  await launch.click();
  await fill.selectOption('solid');
  await panel.getByTestId('ghosting-key-frames-after-toggle').check();
  await keyFill.selectOption('images');
  await close();
  await expect.poll(interiorRed).toEqual([97, 168, 221]);
  expect(await interiorBlue()).toEqual([97, 168, 221]);
  expect(await clipped()).toEqual(baseClipped);
  expect(await keyGhost()).not.toEqual(baseKey);
  const keyImage = await keyGhost();

  // The solid current ghost exactly overlaps the opaque red artwork.
  const overlap = () => stagePixel(page, -10, 89);
  const currentGhost = panel.getByTestId('ghosting-frames-current');
  const onTop = panel.getByTestId('ghosting-on-top');
  await launch.click();
  await currentGhost.check();
  await close();
  await expect.poll(overlap).toEqual([232, 62, 65]);

  await launch.click();
  await onTop.check();
  await close();
  await expect.poll(overlap).toEqual([255, 255, 255]);

  await launch.click();
  await onTop.uncheck();
  await close();
  await expect.poll(overlap).toEqual([232, 62, 65]);

  await launch.click();
  await currentGhost.uncheck();
  await fill.selectOption('none');
  await outline.selectOption('silhouette');
  await close();
  await expect.poll(edge).not.toEqual(baseEdge);
  expect(await interiorRed()).toEqual(baseRed);
  expect(await seam()).toEqual(baseSeam);
  expect(await transparentEdge()).toEqual(baseTransparent);
  expect(await keyGhost()).toEqual(keyImage);
  await page.screenshot({path: info.outputPath('ghosting-silhouette.png')});

  await launch.click();
  await outline.selectOption('xray');
  await close();
  await expect.poll(seam).not.toEqual(baseSeam);
  expect(await transparentEdge()).toEqual(baseTransparent);
  expect(await keyGhost()).toEqual(keyImage);
  await page.screenshot({path: info.outputPath('ghosting-xray.png')});

  await launch.click();
  await fill.selectOption('solid');
  await close();
  await expect.poll(interiorRed).toEqual([97, 168, 221]);
  expect(await edge()).not.toEqual(baseEdge);
  expect(await preview.screenshot()).toEqual(previewBaseline);
  expect(await native.snapshot()).toEqual(baseline);
  expect(native.calls.slice(firstCall).filter(call => ['edit_rig', 'save_project', 'evaluate_project'].includes(call.command))).toEqual([]);
});
