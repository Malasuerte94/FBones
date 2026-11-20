import {inflateSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import type {Locator, Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

const RED = [232, 62, 65];
const GREEN = [55, 198, 100];

async function pixel(page: Page, x: number, y: number) {
  const png = await page.screenshot({scale: 'css', clip: {x: Math.floor(x), y: Math.floor(y), width: 1, height: 1}});
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const size = png.readUInt32BE(at);
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + size));
    at += size + 12;
  }
  return [...inflateSync(Buffer.concat(chunks)).subarray(1, 4)];
}

async function stagePoint(page: Page, x: number, y: number): Promise<[number, number]> {
  const stage = (await page.getByTestId('viewport').locator('canvas').boundingBox())!;
  return [stage.x + stage.width / 2 + x, stage.y + stage.height / 2 - y];
}

async function stagePixel(page: Page, x: number, y: number) {
  return pixel(page, ...await stagePoint(page, x, y));
}

async function previewPixel(page: Page, fraction: number) {
  const preview = (await page.getByTestId('animation-preview').locator('canvas').boundingBox())!;
  return pixel(page, preview.x + preview.width * fraction, preview.y + preview.height / 2);
}

test('@native Viewport Options hide each display layer independently and leave previews and authored data intact', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 640});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own viewport display options', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: -105, y: 34, rotation: 0, length: 55});
  const child = project.editedBone!;
  await edit({type: 'createSlot', bone: root, name: 'Mask'});
  const mask = project.editedSlot!;
  await edit({type: 'createSlot', bone: root, name: 'Artwork'});
  const artwork = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot: artwork, keys: ['red']});
  const region = project.editedAttachment!;
  await edit({type: 'updateAttachment', id: region, x: 75, y: 35, rotation: 0, scaleX: 1, scaleY: 1});
  await edit({type: 'createClipping', slot: mask, name: 'Left half', endSlot: artwork, convex: true, inverse: false,
    vertices: [{x: 20, y: -20}, {x: 20, y: 90}, {x: 75, y: 90}, {x: 75, y: -20}]});
  const clipping = project.editedAttachment!;
  await edit({type: 'createAnimation', name: 'Viewport context'});
  const animation = project.editedAnimation!;

  await openNativeEditor(page);
  const showImagePixel = () => stagePixel(page, 55, 35);
  const clippedPixel = () => stagePixel(page, 101, 35);
  const bonePixel = () => stagePixel(page, -84, 34);
  const outlinePixel = () => stagePixel(page, 20, 70);
  const clickScene = async (x: number, y: number) => { await page.mouse.click(...await stagePoint(page, x, y)); };
  const selectChildInBox = async () => {
    const [start, end] = await Promise.all([stagePoint(page, -116, 55), stagePoint(page, -70, 20)]);
    await page.keyboard.down('Control');
    await page.mouse.move(...start);
    await page.mouse.down();
    await page.mouse.move(...end, {steps: 4});
    await page.mouse.up();
    await page.keyboard.up('Control');
  };
  const treeItem = (kind: string, id: number) => page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  await expect.poll(showImagePixel).toEqual(RED);
  const originalClippedPixel = await clippedPixel();
  expect(originalClippedPixel).not.toEqual(RED);
  const originalBonePixel = await bonePixel();
  const before = await native.snapshot();
  const callsBefore = native.calls.length;

  const hud = page.getByTestId('viewport-tool-hud');
  const panel = page.getByTestId('viewport-options-panel');
  const bones = panel.getByTestId('viewport-show-bones');
  const images = panel.getByTestId('viewport-show-images');
  const others = panel.getByTestId('viewport-show-others');
  const selectBones = panel.getByTestId('viewport-select-bones');
  const selectImages = panel.getByTestId('viewport-select-images');
  const setShown = async (button: Locator, shown: boolean) => {
    await expect(button).toHaveAttribute('aria-pressed', String(!shown));
    await button.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', String(shown));
  };

  await expect(panel).toBeVisible();
  await expect.poll(() => hud.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.top >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight &&
      element.scrollWidth <= element.clientWidth;
  })).toBe(true);
  await expect.poll(async () => {
    const [navigation, tools] = await Promise.all([page.getByTestId('viewport-navigation').boundingBox(), hud.boundingBox()]);
    return !!navigation && !!tools && navigation.x + navigation.width <= tools.x;
  }).toBe(true);
  for (const layer of ['bones', 'images', 'others']) {
    const button = panel.getByTestId(`viewport-names-${layer}`);
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(panel.getByTestId('viewport-select-others')).toHaveAttribute('aria-pressed', 'true');
  await expect(hud.getByTestId('viewport-pixels')).toBeEnabled();
  await expect(hud.getByTestId('viewport-pixels')).toHaveAttribute('aria-pressed', 'false');
  await expect(hud.getByTestId('viewport-compensate-bones')).toHaveAttribute('aria-pressed', 'false');
  await expect(hud.getByTestId('viewport-compensate-images')).toHaveAttribute('aria-pressed', 'false');
  await bones.focus();
  await page.keyboard.press('Tab');
  await expect(panel.getByTestId('viewport-names-bones')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(selectImages).toBeFocused();
  await page.screenshot({path: info.outputPath('viewport-options-setup.png')});

  await setShown(bones, false);
  await expect.poll(bonePixel).not.toEqual(originalBonePixel);
  await expect.poll(showImagePixel).toEqual(RED);
  await expect.poll(clippedPixel).toEqual(originalClippedPixel);
  await setShown(bones, true);
  await expect.poll(bonePixel).toEqual(originalBonePixel);

  await setShown(images, false);
  await expect.poll(showImagePixel).not.toEqual(RED);
  await expect.poll(bonePixel).toEqual(originalBonePixel);
  await setShown(images, true);
  await expect.poll(showImagePixel).toEqual(RED);
  await expect.poll(clippedPixel).toEqual(originalClippedPixel);

  const originalOutline = await outlinePixel();
  await setShown(others, false);
  await expect.poll(outlinePixel).not.toEqual(originalOutline);
  await expect.poll(showImagePixel).toEqual(RED);
  await expect.poll(clippedPixel).toEqual(originalClippedPixel);
  await setShown(others, true);
  await expect.poll(outlinePixel).toEqual(originalOutline);

  await treeItem('bone', root).click();
  await expect(hud.getByTestId('viewport-compensate-bones')).toBeEnabled();
  await expect(hud.getByTestId('viewport-compensate-images')).toBeEnabled();
  await setShown(selectBones, false);
  await clickScene(-84, 34);
  await selectChildInBox();
  await expect(treeItem('bone', child)).toHaveAttribute('aria-selected', 'false');
  await expect(treeItem('bone', root)).toHaveAttribute('aria-selected', 'true');
  await treeItem('bone', child).click();
  await expect(treeItem('bone', child)).toHaveAttribute('aria-selected', 'true');
  await treeItem('bone', root).click();
  await setShown(selectBones, true);
  await selectChildInBox();
  await expect(treeItem('bone', child)).toHaveAttribute('aria-selected', 'true');
  await expect(treeItem('bone', root)).toHaveAttribute('aria-selected', 'true');

  await treeItem('slot', artwork).click();
  await setShown(selectImages, false);
  await clickScene(55, 35);
  await expect(treeItem('attachment', region)).toHaveAttribute('aria-selected', 'false');
  await treeItem('attachment', region).click();
  await expect(treeItem('attachment', region)).toHaveAttribute('aria-selected', 'true');
  await treeItem('slot', artwork).click();
  await setShown(selectImages, true);
  await clickScene(55, 35);
  await expect(treeItem('attachment', region)).toHaveAttribute('aria-selected', 'true');

  await setShown(images, false);
  await page.getByTestId('editor-mode-animate').click();
  await expect(page.getByTestId('editor-mode-animate')).toHaveAttribute('aria-pressed', 'true');
  await expect(hud.getByTestId('animate-auto-key')).toBeVisible();
  await expect(hud.getByTestId('viewport-compensate-bones')).toBeDisabled();
  await expect(hud.getByTestId('viewport-compensate-images')).toBeDisabled();
  await expect(hud.getByTestId('viewport-pixels')).toHaveCount(0);
  await expect(page.getByTestId('animation-preview').getByRole('img', {name: 'Live animation preview'})).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', {name: 'Fit preview', exact: true}).click();
  await expect.poll(showImagePixel).not.toEqual(RED);
  await expect.poll(() => previewPixel(page, 0.4)).toEqual(RED);
  expect(await previewPixel(page, 0.6)).not.toEqual(RED);
  await setShown(images, true);
  await expect.poll(showImagePixel).toEqual(RED);
  expect(await previewPixel(page, 0.4)).toEqual(RED);

  await page.getByTestId('animation-select').selectOption(String(animation));
  await treeItem('attachment', region).click();
  const selectionTools = hud.getByTestId('viewport-selection-tools');
  await expect(selectionTools.getByTestId('viewport-key-attachment')).toBeEnabled();
  await expect(selectionTools.getByTestId('viewport-key-rgba')).toBeEnabled();
  await expect(selectionTools.getByTestId('viewport-selection-key-deform')).toHaveCount(0);
  await expect(panel).toBeVisible();
  await treeItem('attachment', clipping).click();
  await expect(selectionTools.getByTestId('viewport-selection-key-deform')).toBeEnabled();
  await treeItem('bone', root).click();
  await expect(hud.getByTestId('animation-tools')).toBeVisible();
  await expect(panel).toBeVisible();
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(callsBefore).filter(call => call.command === 'edit_rig')).toHaveLength(0);

  await treeItem('attachment', region).click();
  await selectionTools.getByTestId('viewport-key-attachment').click();
  await expect.poll(async () => {
    const snapshot = await native.snapshot();
    const clip = snapshot?.animations?.find(item => item.id === animation);
    return clip?.slotTracks?.find(track => track.slot === artwork && track.channel === 'attachment')?.keys;
  }).toMatchObject([{frame: 0, attachment: region}]);
});

test('@native Name Tags track evaluated items and Others selects the active clipping outline without editing', async ({page, native}, info) => {
  await page.setViewportSize({width: 1280, height: 880});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own name tags', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: -140, y: 88, rotation: 0, length: 40});
  const child = project.editedBone!;
  const childName = project.bones.find(bone => bone.id === child)!.name;
  await edit({type: 'createSlot', bone: root, name: 'Artwork'});
  const artSlot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const art: number[] = [];
  for (const key of ['red', 'green']) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot: artSlot, keys: [key]});
    art.push(project.editedAttachment!);
    await edit({type: 'updateAttachment', id: art.at(-1)!, x: 27, y: 132, rotation: 0, scaleX: 1, scaleY: 1});
  }
  const [region, mesh] = art as [number, number];
  await edit({type: 'attachmentEdit', id: mesh, edit: {type: 'convertMesh', id: artSlot}});
  await edit({type: 'setActiveAttachment', slot: artSlot, attachment: region});
  await edit({type: 'createSlot', bone: root, name: 'Mask'});
  const clipSlot = project.editedSlot!;
  await edit({type: 'createClipping', slot: clipSlot, name: 'Mask contour', endSlot: clipSlot, convex: true, inverse: false,
    vertices: [{x: 140, y: 46}, {x: 140, y: 112}, {x: 224, y: 112}, {x: 224, y: 46}]});
  const clip = project.editedAttachment!;
  await edit({type: 'createAnimation', name: 'Move and switch'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: child, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: child, channel: 'translate', frame: 12, values: [42, 0], curve: 'linear'},
  ]});
  await edit({type: 'setAnimationSlotKeys', animation, keys: [
    {slot: artSlot, channel: 'attachment', frame: 0, attachment: region},
    {slot: artSlot, channel: 'attachment', frame: 12, attachment: mesh},
  ]});

  await openNativeEditor(page);
  const stage = page.getByTestId('viewport').locator('canvas');
  const options = page.getByTestId('viewport-options-panel');
  const tags = page.getByTestId('viewport-name-tags');
  const boneTag = tags.getByTestId(`viewport-name-tag-bones-${child}`);
  const regionTag = tags.getByTestId(`viewport-name-tag-images-${region}`);
  const meshTag = tags.getByTestId(`viewport-name-tag-images-${mesh}`);
  const clipTag = tags.getByTestId(`viewport-name-tag-others-${clip}`);
  const tree = (kind: string, id: number) => page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const before = await native.snapshot();
  const start = native.calls.length;
  await expect(tags).toHaveCount(0);
  for (const layer of ['bones', 'images', 'others']) await options.getByTestId(`viewport-names-${layer}`).press('Space');
  await expect(boneTag).toHaveAccessibleName(`Select bone ${childName}`);
  await expect(regionTag).toBeVisible();
  await expect(clipTag).toBeVisible();
  await expect(meshTag).toHaveCount(0);
  await boneTag.press('Enter');
  await expect(tree('bone', child)).toHaveAttribute('aria-selected', 'true');
  await expect(boneTag).toHaveAttribute('aria-pressed', 'true');

  await options.getByTestId('viewport-show-bones').press('Space');
  await expect(boneTag).toBeVisible();
  await options.getByTestId('viewport-select-bones').press('Space');
  await expect(boneTag).toBeDisabled();
  await options.getByTestId('viewport-select-bones').press('Space');
  await options.getByTestId('viewport-show-bones').press('Space');
  const slider = page.getByTestId('viewport-navigation').getByRole('slider');
  await boneTag.hover();
  await page.mouse.wheel(0, -90);
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(100);
  await stage.press('f');
  await expect(slider).toHaveValue('100');

  await regionTag.click();
  await expect(tree('attachment', region)).toHaveAttribute('aria-selected', 'true');
  const chooseOthers = options.getByTestId('viewport-select-others');
  await chooseOthers.press('Space');
  await expect(clipTag).toBeDisabled();
  await page.mouse.click(...await stagePoint(page, 140, 73));
  await expect(tree('attachment', clip)).toHaveAttribute('aria-selected', 'false');
  await chooseOthers.press('Space');
  await page.mouse.click(...await stagePoint(page, 180, 79));
  await expect(tree('attachment', clip)).toHaveAttribute('aria-selected', 'false');
  await page.mouse.click(...await stagePoint(page, 140, 73));
  await expect(tree('attachment', clip)).toHaveAttribute('aria-selected', 'true');
  await expect(clipTag).toHaveAttribute('aria-pressed', 'true');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).some(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toBe(false);

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(regionTag).toBeVisible();
  await expect(meshTag).toHaveCount(0);
  const boneX = (async () => (await boneTag.boundingBox())?.x ?? -1);
  const initialX = await boneX();
  const currentFrame = page.getByTestId('timeline-current');
  await currentFrame.fill('12');
  await currentFrame.press('Enter');
  await expect(meshTag).toBeVisible();
  await expect(regionTag).toHaveCount(0);
  await expect.poll(boneX).toBeCloseTo(initialX + 42, 0);
  await meshTag.press('Enter');
  await expect(tree('attachment', mesh)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('animation-preview').getByTestId('viewport-name-tags')).toHaveCount(0);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toHaveLength(0);
  await page.screenshot({path: info.outputPath('viewport-name-tags.png')});
});

test('@native viewport selection path keeps explicit authored ancestry through Animate, filters, and a narrow HUD', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own selection ancestry', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const addBone = async (parent: number, name: string, x: number, y: number) => {
    await edit({type: 'create', parent, x, y, rotation: 0, length: 20});
    const id = project.editedBone!;
    await edit({type: 'update', id, name, x, y, rotation: 0, length: 20});
    return {kind: 'bone', id, name};
  };
  const parent = await addBone(root.id, 'Main character mount and shoulder articulation', -78, 40);
  const child = await addBone(parent.id, 'Forearm silhouette and prop attachment anchor', 20, 10);
  const influence = await addBone(root.id, 'Independent binding influence', 125, -25);
  const slotName = 'Primary artwork and alternate costume geometry';
  await edit({type: 'createSlot', bone: child.id, name: slotName});
  const slot = {kind: 'slot', id: project.editedSlot!, name: slotName};
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const art: number[] = [];
  for (const key of ['red', 'green']) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot: slot.id, keys: [key]});
    art.push(project.editedAttachment!);
  }
  const region = {kind: 'region', id: art[0]!, name: 'Visible Region'};
  const mesh = {kind: 'mesh', id: art[1]!, name: 'Weighted traveling contour with a different influence'};
  await edit({type: 'renameAttachment', id: region.id, name: region.name});
  await edit({type: 'renameAttachment', id: mesh.id, name: mesh.name});
  await edit({type: 'attachmentEdit', id: mesh.id, edit: {type: 'convertMesh', id: slot.id}});
  await edit({type: 'bindAttachment', id: mesh.id, bones: [influence.id]});
  await edit({type: 'setActiveAttachment', slot: slot.id, attachment: region.id});
  await edit({type: 'createAnimation', name: 'Switch selection target visibility'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationSlotKeys', animation, keys: [
    {slot: slot.id, channel: 'attachment', frame: 0, attachment: region.id},
    {slot: slot.id, channel: 'attachment', frame: 12, attachment: mesh.id},
  ]});

  await openNativeEditor(page);
  const before = (await native.snapshot())!;
  const authoredSlot = before.slots.find(item => item.id === slot.id)!;
  expect(authoredSlot.activeAttachmentId).toBe(region.id);
  expect(authoredSlot.attachments!.find(item => item.id === mesh.id)!.mesh!.bones).toEqual([influence.id]);
  const start = native.calls.length;
  const path = page.getByTestId('viewport-selection-path');
  const leaf = path.getByTestId('viewport-selection-path-leaf');
  const tree = (kind: string, id: number) => page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const bonePath = [{kind: 'bone', id: root.id, name: root.name}, parent, child];
  const slotPath = [...bonePath, slot];
  const meshPath = [...slotPath, mesh];
  const fullPath = (items: {name: string}[]) => items.map(item => item.name).join(' › ');
  const checkPath = async (items: {kind: string; id: number; name: string}[]) => {
    await expect(path).toBeVisible();
    await expect(path).toHaveAccessibleName('Selection path');
    await expect(path).toHaveAccessibleDescription(fullPath(items));
    await expect(path).toHaveAttribute('title', fullPath(items));
    await expect.poll(() => path.locator('[data-selection-id]').evaluateAll(nodes =>
      nodes.map(node => [node.getAttribute('data-kind'), Number(node.getAttribute('data-selection-id'))])))
      .toEqual(items.map(({kind, id}) => [kind, id]));
    await expect(leaf).toHaveText(items.at(-1)!.name);
    await expect(path.locator('button, a[href], [tabindex="0"]')).toHaveCount(0);
  };

  await tree('bone', child.id).click();
  await checkPath(bonePath);
  await tree('slot', slot.id).click();
  await checkPath(slotPath);
  await tree('attachment', region.id).click();
  await checkPath([...slotPath, region]);
  await tree('attachment', mesh.id).click();
  await checkPath(meshPath);

  await page.setViewportSize({width: 960, height: 640});
  await checkPath(meshPath);
  const viewport = page.getByTestId('viewport');
  await expect.poll(async () => {
    const [stage, badge] = await Promise.all([viewport.boundingBox(), path.boundingBox()]);
    return !!stage && !!badge && badge.x >= stage.x && badge.x + badge.width <= stage.x + stage.width;
  }).toBe(true);
  await expect.poll(() => path.locator('.truncate').evaluateAll(names =>
    names.some(name => name.scrollWidth > name.clientWidth))).toBe(true);
  await page.setViewportSize({width: 1280, height: 880});

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await tree('attachment', mesh.id).click();
  const options = page.getByTestId('viewport-options-panel');
  await options.getByTestId('viewport-names-images').press('Space');
  await expect(page.getByTestId(`viewport-name-tag-images-${region.id}`)).toBeVisible();
  await expect(page.getByTestId(`viewport-name-tag-images-${mesh.id}`)).toHaveCount(0);
  await checkPath(meshPath);
  const current = page.getByTestId('timeline-current');
  await current.fill('12');
  await current.press('Enter');
  await expect(page.getByTestId(`viewport-name-tag-images-${mesh.id}`)).toBeVisible();
  await expect(page.getByTestId(`viewport-name-tag-images-${region.id}`)).toHaveCount(0);
  await checkPath(meshPath);
  const showImages = options.getByTestId('viewport-show-images');
  await showImages.press('Space');
  await expect(showImages).toHaveAttribute('aria-pressed', 'false');
  await checkPath(meshPath);
  await showImages.press('Space');

  const attachmentsFilter = page.getByTestId('tree-filter-attachment');
  await attachmentsFilter.click();
  await expect(tree('attachment', mesh.id)).toHaveCount(0);
  await checkPath(meshPath);
  await attachmentsFilter.click();
  await expect(tree('attachment', mesh.id)).toHaveAttribute('aria-selected', 'true');
  await tree('attachment', region.id).click({modifiers: ['Control']});
  await expect(tree('attachment', mesh.id)).toHaveAttribute('aria-selected', 'true');
  await expect(tree('attachment', region.id)).toHaveAttribute('aria-selected', 'true');
  await expect(path).toHaveCount(0);
  await tree('bone', child.id).click();
  await checkPath(bonePath);
  await tree('bone', child.id).click({modifiers: ['Control']});
  await expect(path).toHaveCount(0);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native contextual attachment values edit only the inspected Region and read the posed Mesh hull', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own contextual attachment values', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: -95, y: 45, rotation: 0, length: 20});
  const ownerBone = project.editedBone!;
  await edit({type: 'create', parent: root, x: 135, y: -20, rotation: 0, length: 20});
  const influence = project.editedBone!;
  const influenceName = project.bones.find(bone => bone.id === influence)!.name;
  await edit({type: 'createSlot', bone: ownerBone, name: 'Artwork alternatives'});
  const slot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const ids: number[] = [];
  for (const key of ['red', 'green', 'blue']) {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: [key]});
    ids.push(project.editedAttachment!);
  }
  const [active, region, mesh] = ids as [number, number, number];
  await edit({type: 'updateAttachment', id: active, x: -29, y: 16, rotation: -27, scaleX: 2, scaleY: .75});
  await edit({type: 'updateAttachment', id: region, x: 13.123456, y: -7.15625, rotation: 23.625033, scaleX: 1.2345679, scaleY: 1.625});
  await edit({type: 'updateAttachment', id: mesh, x: 27.5, y: 14.25, rotation: 0, scaleX: 1, scaleY: 1});
  await edit({type: 'attachmentEdit', id: mesh, edit: {type: 'convertMesh', id: slot}});
  await edit({type: 'attachmentEdit', id: mesh, edit: {type: 'addVertex', id: slot, x: -54.5, y: 66.25, edgeA: null, edgeB: null}});
  await edit({type: 'bindAttachment', id: mesh, bones: [influence]});
  await edit({type: 'update', id: influence, name: influenceName, x: 149, y: -30, rotation: 0, length: 20});
  await edit({type: 'setActiveAttachment', slot, attachment: active});

  const owner = (model: ProjectSummary) => model.slots.find(item => item.id === slot)!;
  const attachment = (model: ProjectSummary, id: number) => owner(model).attachments!.find(item => item.id === id)!;
  const read = async () => (await native.snapshot())!;
  await openNativeEditor(page);
  const before = await read();
  const original = attachment(before, region).region!;
  const tree = (id: number) => page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem');
  const panel = page.getByTestId('viewport-attachment-transform');
  const field = (key: string) => panel.getByTestId('viewport-attachment-' + key);
  const inspector = (key: string) => page.getByTestId('attachment-' + key);
  const edits = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  const firstCall = native.calls.length;

  await tree(region).click();
  await expect(panel).toHaveAccessibleName('Attachment transform values');
  await expect(field('x')).toHaveAccessibleName('Owner-local X');
  await expect(field('shearX')).toBeDisabled();
  await expect(field('shearY')).toBeDisabled();
  for (const key of ['x', 'y', 'rotation', 'scaleX', 'scaleY'] as const) {
    await field(key).focus();
    await expect.poll(async () => Number(await field(key).inputValue())).toBe(original[key]);
    await expect.poll(async () => Number(await inspector(key).inputValue())).toBe(original[key]);
  }
  await field('x').focus();
  await field('x').press('Enter');
  await field('x').fill('99.125');
  await field('x').press('Escape');
  await field('x').focus();
  await expect.poll(async () => Number(await field('x').inputValue())).toBe(original.x);
  await expect(tree(region)).toHaveAttribute('aria-selected', 'true');
  expect(await read()).toEqual(before);
  expect(edits(firstCall)).toHaveLength(0);

  const requestedScale = -1.3750137;
  await field('scaleX').fill(String(requestedScale));
  await expect(inspector('scaleX')).toHaveValue(String(requestedScale));
  expect(await read()).toEqual(before);
  await field('scaleX').press('Enter');
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const after = await read();
  const calls = edits(firstCall);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.args).toEqual({expectedRevision: before.revision, edit: {type: 'updateAttachment', id: region, scaleX: requestedScale}});
  expect(owner(after).activeAttachmentId).toBe(active);
  expect(owner(after).attachments!.filter(item => item.id !== region))
    .toEqual(owner(before).attachments!.filter(item => item.id !== region));
  expect(attachment(after, region)).toEqual({...attachment(before, region), region: {...original, scaleX: Math.fround(requestedScale)}});
  await expect.poll(async () => Number(await inspector('scaleX').inputValue())).toBe(Math.fround(requestedScale));
  await expect(tree(region)).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read()).slots).toEqual(before.slots);
  await expect.poll(async () => Number(await inspector('scaleX').inputValue())).toBe(original.scaleX);
  await field('scaleX').focus();
  await expect.poll(async () => Number(await field('scaleX').inputValue())).toBe(original.scaleX);
  await expect(tree(region)).toHaveAttribute('aria-selected', 'true');
  expect(edits(firstCall).map(call => (call.args.edit as RigEdit).type)).toEqual(['updateAttachment', 'undo']);

  const restored = await read();
  const binding = attachment(restored, mesh).mesh!;
  expect(binding.weighted).toBe(true);
  expect(binding.bones).toEqual([influence]);
  expect(binding.hull).toBe(4);
  expect(binding.vertices).toHaveLength(5);
  // The independent influence moved by (+14, -10) after binding. The fifth
  // point contributes a further (+13, +7) divided by five to the all-row mean.
  const afterUndo = native.calls.length;
  await tree(mesh).click();
  await expect(tree(mesh)).toHaveAttribute('aria-selected', 'true');
  const center = panel.getByTestId('viewport-mesh-hull-center');
  await expect(center).toBeVisible();
  for (const [axis, value] of [['x', -53.5], ['y', 49.25]] as const) {
    const output = center.getByTestId('viewport-mesh-hull-center-' + axis);
    await expect.poll(async () => Number(await output.getAttribute('data-value'))).toBeCloseTo(value, 10);
    await expect(output).toContainText(String(value));
  }
  for (const key of ['rotation', 'scaleX', 'scaleY', 'shearX', 'shearY']) await expect(field(key)).toBeDisabled();
  expect(await read()).toEqual(restored);
  expect(native.calls.slice(afterUndo).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native the floating toolbar locks, moves with its selection path, and stays in bounds across editor modes', async ({page, native}) => {
  await page.setViewportSize({width: 1920, height: 900});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own movable toolbar', discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: project.bones[0]!.id, x: -120, y: 90, rotation: 0, length: 45});
  const bone = project.editedBone!;
  await edit({type: 'update', id: bone, name: 'Toolbar witness', x: -120, y: 90, rotation: 0, length: 45});
  await edit({type: 'createAnimation', name: 'Toolbar mode continuity'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 24, values: [24, 4], curve: 'linear'},
  ]});
  await openNativeEditor(page);
  const before = (await native.snapshot())!;
  const firstCall = native.calls.length;
  const viewport = page.getByTestId('viewport');
  const canvas = viewport.locator('canvas');
  const hud = page.getByTestId('viewport-tool-hud');
  const track = page.getByTestId('viewport-toolbar-layout');
  const group = track.getByTestId('viewport-toolbar-group');
  const lock = group.getByTestId('viewport-toolbar-lock');
  const grip = group.getByTestId('viewport-toolbar-grip');
  const controls = group.getByTestId('animation-tools');
  const path = group.getByTestId('viewport-selection-path');
  const witness = page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem');
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  const value = () => grip.getAttribute('aria-valuenow');
  const checkPosition = async (percent: number) => {
    await expect.poll(async () => {
      const [available, moving] = await Promise.all([box(track), box(group)]);
      const expectedX = available.x + Math.max(0, available.width - moving.width) * percent / 100;
      return Math.abs(moving.x - expectedX);
    }).toBeLessThan(2);
  };
  const checkNoHorizontalOverflow = async () => {
    await expect.poll(() => hud.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  };
  const gripPoint = async () => {
    const bounds = await box(grip);
    return {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
  };

  await witness.click();
  await expect(path.getByTestId('viewport-selection-path-leaf')).toHaveText('Toolbar witness');
  await expect(lock).toHaveAccessibleName('Lock viewport toolbar');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await expect(grip).toHaveAccessibleName('Viewport toolbar position');
  await expect(grip).toBeDisabled();
  await expect(grip).toHaveAttribute('tabindex', '-1');
  await expect(grip).toHaveAttribute('aria-valuenow', '50');
  await checkPosition(50);

  await lock.click();
  await expect(lock).toHaveAttribute('aria-pressed', 'false');
  await expect(grip).toBeEnabled();
  await expect(grip).toHaveAttribute('tabindex', '0');
  const [trackBefore, groupBefore, controlBefore, pathBefore, lockBefore] = await Promise.all([
    box(track), box(group), box(controls), box(path), box(lock),
  ]);
  const travel = Math.floor((trackBefore.width - groupBefore.width) / 2);
  const dx = Math.min(132, travel - 8);
  expect(dx).toBeGreaterThan(45);
  const anchor = await gripPoint();
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + dx, anchor.y - 32, {steps: 6});
  await page.mouse.up();
  const verifyDelta = async (item: Locator, original: {x: number; y: number}, delta: number) => {
    await expect.poll(async () => Math.abs((await box(item)).x - original.x - delta)).toBeLessThan(2);
    await expect.poll(async () => Math.abs((await box(item)).y - original.y)).toBeLessThan(1);
  };
  await verifyDelta(controls, controlBefore, dx);
  await verifyDelta(path, pathBefore, dx);
  const vacated = {x: lockBefore.x + lockBefore.width / 2, y: lockBefore.y + lockBefore.height / 2};
  await expect.poll(() => canvas.evaluate((node, point) => document.elementFromPoint(point.x, point.y) === node, vacated)).toBe(true);
  const committedPosition = await value();
  const settled = await box(group);
  const second = await gripPoint();
  const cancelledDx = -Math.floor(dx / 2);
  await page.mouse.move(second.x, second.y);
  await page.mouse.down();
  await page.mouse.move(second.x + cancelledDx, second.y - 16, {steps: 6});
  await verifyDelta(group, settled, cancelledDx);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await verifyDelta(group, settled, 0);
  await expect(grip).toHaveAttribute('aria-valuenow', committedPosition!);
  await expect(witness).toHaveAttribute('aria-selected', 'true');

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(lock).toHaveAttribute('aria-pressed', 'false');
  await expect(grip).toHaveAttribute('aria-valuenow', committedPosition!);
  await expect(path.getByTestId('viewport-selection-path-leaf')).toHaveText('Toolbar witness');
  const current = page.getByTestId('timeline-current');
  await current.fill('11');
  await current.press('Enter');
  await grip.press('End');
  await expect(grip).toHaveAttribute('aria-valuenow', '100');
  await checkPosition(100);
  await checkNoHorizontalOverflow();
  const right = await box(group);
  await grip.press('ArrowLeft');
  await verifyDelta(group, right, -16);
  await grip.press('Home');
  await expect(grip).toHaveAttribute('aria-valuenow', '0');
  await checkPosition(0);
  const left = await box(group);
  await grip.press('ArrowRight');
  await verifyDelta(group, left, 16);
  await expect(current).toHaveValue('11');

  await grip.press('End');
  await expect(grip).toHaveAttribute('aria-valuenow', '100');
  await page.setViewportSize({width: 960, height: 640});
  await checkPosition(100);
  const rail = page.getByTestId('viewport-navigation');
  const trackXWithoutRuler = (await box(track)).x;
  await rail.getByTestId('viewport-rulers').press('Space');
  await expect(page.getByTestId('viewport-rulers-overlay')).toBeVisible();
  await expect.poll(async () => (await box(track)).x).toBeGreaterThan(trackXWithoutRuler);
  await checkPosition(100);
  await checkNoHorizontalOverflow();
  await expect.poll(async () => {
    const [stage, moving, navigation] = await Promise.all([box(viewport), box(group), box(rail)]);
    return moving.x >= navigation.x + navigation.width && moving.x + moving.width <= stage.x + stage.width;
  }).toBe(true);
  await lock.press('Space');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await expect(lock).toBeFocused();
  await expect(grip).toBeDisabled();
  await expect(grip).toHaveAttribute('aria-valuenow', '100');
  await checkPosition(100);
  await expect(current).toHaveValue('11');

  await page.getByTestId('editor-mode-setup').click();
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await expect(grip).toHaveAttribute('aria-valuenow', '100');
  await checkPosition(100);
  await expect(witness).toHaveAttribute('aria-selected', 'true');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native Views toolbar alignment keeps measured placement independent of the lock and scene', async ({page, native}) => {
  const wide = {width: 1920, height: 900};
  await page.setViewportSize(wide);
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own toolbar alignment', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: -120, y: 85, rotation: 0, length: 42});
  const bone = project.editedBone!;
  await edit({type: 'update', id: bone, name: 'Alignment witness', x: -120, y: 85, rotation: 0, length: 42});
  await edit({type: 'createAnimation', name: 'Measure toolbar during Animate'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 24, values: [24, 6], curve: 'linear'},
  ]});
  await openNativeEditor(page);
  const witness = page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem');
  const hud = page.getByTestId('viewport-tool-hud');
  const track = hud.getByTestId('viewport-toolbar-layout');
  const group = track.getByTestId('viewport-toolbar-group');
  const lock = group.getByTestId('viewport-toolbar-lock');
  const grip = group.getByTestId('viewport-toolbar-grip');
  const path = group.getByTestId('viewport-selection-path');
  const controls = group.getByTestId('animation-tools');
  const rail = page.getByTestId('viewport-navigation');
  const zoom = rail.getByTestId('viewport-zoom');
  const rootTag = page.getByTestId(`viewport-name-tag-bones-${root}`);
  const views = page.locator('header details').filter({has: page.locator('summary').filter({hasText: /^Views$/})});
  const summary = views.locator('summary');
  const presets = views.getByRole('radiogroup', {name: 'Toolbar alignment'});
  const names = ['Left', 'Center', 'Right'] as const;
  const radio = (name: typeof names[number]) => presets.getByRole('radio', {name, exact: true});
  const percent = {Left: 0, Center: 50, Right: 100};
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  const travel = async () => (await box(track)).width - (await box(group)).width;
  const openViews = async () => {
    if (!await views.evaluate(node => (node as HTMLDetailsElement).open)) await summary.click();
    await expect(presets).toBeVisible();
  };
  const checkPosition = async (name: typeof names[number]) => {
    await expect.poll(async () => {
      const [available, moving] = await Promise.all([box(track), box(group)]);
      return Math.abs(moving.x - available.x - Math.max(0, available.width - moving.width) * percent[name] / 100);
    }).toBeLessThan(2);
    await expect(grip).toHaveAttribute('aria-valuenow', String(percent[name]));
    await expect(path.getByTestId('viewport-selection-path-leaf')).toHaveText('Alignment witness');
  };
  const choose = async (name: typeof names[number]) => {
    await openViews();
    await radio(name).click();
    await expect(radio(name)).toBeChecked();
    await checkPosition(name);
  };
  const beginDrag = async () => {
    const {x, y, width, height} = await box(grip);
    const at = {x: x + width / 2, y: y + height / 2};
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x - 64, at.y - 10, {steps: 6});
  };

  await witness.click();
  await rail.getByTestId('viewport-rulers').press('Space');
  await expect(page.getByTestId('viewport-rulers-overlay')).toBeVisible();
  await rail.getByTestId('viewport-zoom-in').click();
  await expect(zoom).toHaveValue('125');
  await page.getByTestId('viewport-names-bones').press('Space');
  await expect(rootTag).toBeVisible();
  await native.queueDialog('save', 'toolbar-alignment.fbones');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())?.dirty).toBe(false);
  const before = (await native.snapshot())!;
  const authoredBytes = await readFile(before.path!);
  const setupCamera = await box(rootTag);
  const start = native.calls.length;
  await openViews();
  await expect(radio('Center')).toBeChecked();
  await checkPosition('Center');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(travel).toBeGreaterThan(150);
  await choose('Left');
  const [left, pathLeft] = await Promise.all([box(controls), box(path)]);
  await radio('Left').press('ArrowRight');
  await expect(radio('Center')).toBeFocused();
  await expect(radio('Center')).toBeChecked();
  await checkPosition('Center');
  await page.keyboard.press('ArrowRight');
  await expect(radio('Right')).toBeFocused();
  await expect(radio('Right')).toBeChecked();
  await checkPosition('Right');
  const [right, pathRight] = await Promise.all([box(controls), box(path)]);
  const measuredTravel = await travel();
  expect(right.x - left.x).toBeCloseTo(measuredTravel, 0);
  expect(pathRight.x - pathLeft.x).toBeCloseTo(measuredTravel, 0);
  expect(right.y).toBe(left.y);
  expect(pathRight.y).toBe(pathLeft.y);
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  expect(await box(rootTag)).toEqual(setupCamera);

  await lock.click();
  await expect(lock).toHaveAttribute('aria-pressed', 'false');
  await expect(grip).toBeEnabled();
  await choose('Right');
  await radio('Right').focus();
  const fullRight = await box(group);
  await beginDrag();
  await expect.poll(async () => (await box(group)).x).toBeLessThan(fullRight.x - 55);
  await expect(radio('Right')).toBeFocused();
  // The already checked preset must still cancel the real held grip.
  await page.keyboard.press('Space');
  await checkPosition('Right');
  await page.mouse.up();
  await checkPosition('Right');
  await beginDrag();
  await page.mouse.up();
  await expect.poll(async () => (await box(group)).x).toBeLessThan(fullRight.x - 55);
  for (const name of names) await expect(radio(name)).not.toBeChecked();
  await choose('Left');
  await expect(lock).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const current = page.getByTestId('timeline-current');
  await current.fill('11');
  await current.press('Enter');
  await checkPosition('Left');
  await expect(rootTag).toBeVisible();
  await expect(zoom).toHaveValue('125');
  const animateCamera = await box(rootTag);
  await page.setViewportSize({width: 760, height: 640});
  await expect.poll(travel).toBeLessThanOrEqual(1);
  await expect(grip).toBeDisabled();
  await expect(page.getByTestId('viewport-rulers-overlay')).toBeVisible();
  await openViews();
  await expect(radio('Right')).toBeEnabled();
  await choose('Right');
  await expect.poll(() => hud.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await expect(lock).toHaveAttribute('aria-pressed', 'false');
  await page.setViewportSize(wide);
  await expect.poll(travel).toBeGreaterThan(150);
  await checkPosition('Right');
  await expect(grip).toBeEnabled();
  await expect(zoom).toHaveValue('125');
  await expect.poll(() => box(rootTag)).toEqual(animateCamera);
  await expect(current).toHaveValue('11');
  await expect(witness).toHaveAttribute('aria-selected', 'true');
  await openViews();
  await views.getByTestId('reset-layout').click();
  await checkPosition('Center');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await openViews();
  await expect(radio('Center')).toBeChecked();
  await expect(current).toHaveValue('11');
  expect(await native.snapshot()).toEqual(before);
  expect(await readFile(before.path!)).toEqual(authoredBytes);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});

test('@native automatic toolbar labels follow the rendered viewport width and keep icon actions usable', async ({page, native}) => {
  await page.setViewportSize({width: 1440, height: 900});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own automatic toolbar labels', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: -72, y: 51, rotation: 0, length: 37});
  const bone = project.editedBone!;
  await edit({type: 'update', id: bone, name: 'Label witness', x: -72, y: 51, rotation: 0, length: 37});
  await edit({type: 'createAnimation', name: 'Own compact controls frame'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 24, values: [24, 6], curve: 'linear'},
  ]});

  await openNativeEditor(page);
  const witness = page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem');
  await witness.click();
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const frame = page.getByTestId('timeline-current');
  await frame.fill('11');
  await frame.press('Enter');
  await expect(frame).toHaveValue('11');
  const before = await native.snapshot();
  const start = native.calls.length;

  const viewport = page.getByTestId('viewport');
  const track = page.getByTestId('viewport-tool-hud').getByTestId('viewport-toolbar-layout');
  const group = track.getByTestId('viewport-toolbar-group');
  const tools = group.getByTestId('animation-tools');
  const rotate = tools.getByRole('button', {name: 'Rotate', exact: true});
  const rotateLabel = rotate.locator('[data-toolbar-action-label]');
  const translate = tools.getByRole('button', {name: 'Translate', exact: true});
  const pose = tools.getByRole('button', {name: 'Pose', exact: true});
  const value = tools.getByTestId('animate-bone-x');
  const leaf = group.getByTestId('viewport-selection-path-leaf');
  const options = group.getByTestId('viewport-options-panel');
  const lock = group.getByTestId('viewport-toolbar-lock');
  const grip = group.getByTestId('viewport-toolbar-grip');
  const views = page.locator('header details').filter({has: page.locator('summary').filter({hasText: /^Views$/})});
  const labels = views.getByTestId('viewport-toolbar-labels');
  const automatic = labels.getByTestId('viewport-toolbar-labels-automatic');
  const text = labels.getByTestId('viewport-toolbar-labels-text');
  const icons = labels.getByTestId('viewport-toolbar-labels-icons');
  const openViews = async () => {
    if (!await views.evaluate(node => (node as HTMLDetailsElement).open)) await views.locator('summary').click();
    await expect(labels).toBeVisible();
  };
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  const column = (id: string) => page.getByTestId('dock-width-' + id);
  const width = async (id: string) => Number(await column(id).getAttribute('aria-valuenow'));
  const resizeColumn = async (id: string, target: number) => {
    const separator = column(id);
    const {x, y, width: w, height: h} = await box(separator);
    const at = {x: Math.round(x + w / 2), y: Math.round(y + h / 2)};
    const delta = await width(id) - target;
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + delta, at.y, {steps: 8});
    await page.mouse.up();
    await expect(separator).toHaveAttribute('aria-valuenow', String(target));
  };
  const compact = () => group.evaluate(node => node.getAttribute('data-toolbar-compact') === 'true');
  const expectLabels = async (hidden: boolean) => {
    await expect.poll(compact).toBe(hidden);
    await expect(rotateLabel).toHaveCount(1);
    if (hidden) await expect(rotateLabel).toBeHidden();
    else await expect(rotateLabel).toBeVisible();
    await expect(rotate).toHaveAccessibleName('Rotate');
    await expect(rotate).toBeEnabled();
  };
  const stableOverFrames = async (hidden: boolean) => {
    const readings = await group.evaluate(async node => {
      const result: boolean[] = [];
      for (let count = 0; count < 12; count++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        result.push(node.getAttribute('data-toolbar-compact') === 'true');
      }
      return result;
    });
    expect(readings).toEqual(Array(12).fill(hidden));
  };
  const preservedControls = async () => {
    await expect(value).toBeVisible();
    await expect(value).toBeEditable();
    await expect(value).toHaveValue('-61');
    await expect(leaf).toBeVisible();
    await expect(leaf).toHaveText('Label witness');
    for (const heading of ['Select', 'Show', 'Tags', 'Bones', 'Images', 'Others']) {
      await expect(options.getByText(heading, {exact: true})).toBeVisible();
    }
    await expect(lock).toHaveAttribute('aria-pressed', 'true');
    await expect(grip).toHaveAttribute('aria-valuenow', '100');
    await expect(frame).toHaveValue('11');
    await expect.poll(async () => {
      const [available, moving] = await Promise.all([box(track), box(group)]);
      return Math.abs(available.x + available.width - moving.x - moving.width);
    }).toBeLessThan(2);
  };

  await openViews();
  await expect(labels).toHaveAccessibleName('Toolbar text labels');
  await expect(automatic).toHaveAccessibleName('Automatic');
  await expect(text).toHaveAccessibleName('Show');
  await expect(icons).toHaveAccessibleName('Hide');
  await expect(automatic).toBeChecked();
  await views.getByTestId('viewport-toolbar-align-right').click();
  await views.locator('summary').click();
  await expectLabels(false);
  await preservedControls();
  const windowWidth = await page.evaluate(() => innerWidth);
  const viewportWidth = (await box(viewport)).width;
  const sceneWidth = await width('scene');
  const weightsWidth = await width('weights');
  await resizeColumn('scene', 520);
  await resizeColumn('weights', 430);
  expect(await page.evaluate(() => innerWidth)).toBe(windowWidth);
  await expect.poll(async () => (await box(viewport)).width).toBeLessThan(viewportWidth - 300);
  await expectLabels(true);
  await stableOverFrames(true);
  await preservedControls();
  await expect(pose.locator('[data-toolbar-action-label]')).toBeHidden();
  await expect(pose.locator('svg[aria-hidden="true"]')).toBeVisible();
  await pose.press('Enter');
  await expect(pose).toHaveAttribute('aria-pressed', 'true');
  await rotate.press('Enter');
  await expect(rotate).toHaveAttribute('aria-pressed', 'true');
  await expect(translate).toHaveAttribute('aria-pressed', 'false');
  await expectLabels(true);
  await preservedControls();

  await openViews();
  await text.click();
  await expect(text).toBeChecked();
  await expectLabels(false);
  await preservedControls();
  await automatic.click();
  await expect(automatic).toBeChecked();
  await views.locator('summary').click();
  await expectLabels(true);
  await resizeColumn('weights', weightsWidth);
  await resizeColumn('scene', sceneWidth);
  expect(await page.evaluate(() => innerWidth)).toBe(windowWidth);
  await expect.poll(async () => (await box(viewport)).width).toBeCloseTo(viewportWidth, 0);
  await expectLabels(false);
  await stableOverFrames(false);

  await openViews();
  await icons.click();
  await expect(icons).toBeChecked();
  await expectLabels(true);
  await preservedControls();
  await automatic.click();
  await expect(automatic).toBeChecked();
  await expectLabels(false);
  await preservedControls();
  await expect(witness).toHaveAttribute('aria-selected', 'true');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native secondary taps swap the previous viewport tool while secondary drags pan without changing the scene', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 860});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own previous viewport tool', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: root, x: -94, y: 62, rotation: 0, length: 36});
  const bone = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Own secondary tap and pan'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 24, values: [24, 6], curve: 'linear'},
  ]});
  await openNativeEditor(page);
  const before = (await native.snapshot())!;
  const firstCall = native.calls.length;
  const canvas = page.getByTestId('viewport').locator('canvas');
  const tree = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const tools = page.getByTestId('viewport-tool-hud').getByTestId('animation-tools');
  const tool = (name: string) => tools.getByRole('button', {name, exact: true});
  const tag = page.getByTestId(`viewport-name-tag-bones-${bone}`);
  const tagBox = async () => (await tag.boundingBox())!;
  const canvasOrigin = async () => {
    const box = (await canvas.boundingBox())!;
    const point = {x: Math.round(box.x + .78 * box.width), y: Math.round(box.y + .25 * box.height)};
    await expect.poll(() => canvas.evaluate((node, at) => node === document.elementFromPoint(at.x, at.y), point)).toBe(true);
    return point;
  };
  const begin = async () => {
    const point = await canvasOrigin();
    await page.mouse.move(point.x, point.y);
    await page.mouse.down({button: 'right'});
    return point;
  };
  const end = () => page.mouse.up({button: 'right'});
  const tap = async (dx = 0, dy = 0) => {
    const point = await begin();
    if (dx || dy) await page.mouse.move(point.x + dx, point.y + dy);
    await end();
  };
  const cameraDelta = async (base: {x: number; y: number}, dx: number, dy: number) => {
    await expect.poll(async () => {
      const at = await tagBox();
      return Math.max(Math.abs(at.x - base.x - dx), Math.abs(at.y - base.y - dy));
    }).toBeLessThan(1);
  };

  await tree(bone).click();
  await page.getByTestId('viewport-names-bones').press('Space');
  await expect(tag).toBeVisible();
  const camera = await tagBox();
  await tool('Rotate').click();
  await tap();
  await expect(tool('Rotate')).toHaveAttribute('aria-pressed', 'true');
  await tool('Translate').click();
  await begin();
  await expect(tool('Translate')).toHaveAttribute('aria-pressed', 'true');
  await end();
  await expect(tool('Rotate')).toHaveAttribute('aria-pressed', 'true');
  await tap(1, 1);
  await expect(tool('Translate')).toHaveAttribute('aria-pressed', 'true');
  await cameraDelta(camera, 0, 0);
  await tool('Scale').click();
  await tap();
  await expect(tool('Translate')).toHaveAttribute('aria-pressed', 'true');
  await tap();
  await expect(tool('Scale')).toHaveAttribute('aria-pressed', 'true');

  const pan = await begin();
  await page.mouse.move(pan.x + 36, pan.y + 20, {steps: 5});
  await cameraDelta(camera, 36, 20);
  await end();
  await cameraDelta(camera, 36, 20);
  await expect(tool('Scale')).toHaveAttribute('aria-pressed', 'true');
  const settled = await tagBox();
  const returnPan = await begin();
  await page.mouse.move(returnPan.x + 31, returnPan.y - 13, {steps: 5});
  await cameraDelta(settled, 31, -13);
  await page.mouse.move(returnPan.x, returnPan.y, {steps: 5});
  await cameraDelta(settled, 0, 0);
  await end();
  await expect(tool('Scale')).toHaveAttribute('aria-pressed', 'true');

  await begin();
  await page.keyboard.press('Escape');
  await end();
  await expect(tool('Scale')).toHaveAttribute('aria-pressed', 'true');
  await expect(tree(bone)).toHaveAttribute('aria-selected', 'true');
  await cameraDelta(settled, 0, 0);

  const rotation = tools.getByTestId('bone-rotation');
  await rotation.fill('47.8125');
  await tap();
  await expect(tool('Scale')).toHaveAttribute('aria-pressed', 'true');
  await expect(rotation).toBeFocused();
  await expect(rotation).toHaveValue('47.8125');
  await rotation.press('Escape');

  await tree(root).click({modifiers: ['Control']});
  await expect(tree(root)).toHaveAttribute('aria-selected', 'true');
  await expect(tree(bone)).toHaveAttribute('aria-selected', 'true');
  // Tree selection resets the active tool before the multi-bone interaction begins.
  await expect(tool('Translate')).toHaveAttribute('aria-pressed', 'true');
  await tool('Rotate').click();
  await tool('Scale').click();
  await tap();
  await expect(tool('Scale')).toHaveAttribute('aria-pressed', 'true');
  const multiCamera = await tagBox();
  const multiPan = await begin();
  await page.mouse.move(multiPan.x - 22, multiPan.y + 12, {steps: 4});
  await end();
  await cameraDelta(multiCamera, -22, 12);
  await expect(tree(root)).toHaveAttribute('aria-selected', 'true');
  await expect(tree(bone)).toHaveAttribute('aria-selected', 'true');
  await tree(bone).click();
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const frame = page.getByTestId('timeline-current');
  await frame.fill('11');
  await frame.press('Enter');
  await tool('Rotate').click();
  await tap();
  await expect(tool('Rotate')).toHaveAttribute('aria-pressed', 'true');
  await tool('Translate').click();
  await tap();
  await expect(tool('Rotate')).toHaveAttribute('aria-pressed', 'true');
  await expect(frame).toHaveValue('11');
  await expect(tree(bone)).toHaveAttribute('aria-selected', 'true');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toHaveLength(0);
});

test('@native viewport Fit and actual size keep their camera independent from Preview and project data', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 880});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own viewport navigation', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const offset = 700;
  for (const [key, x] of [['red', -offset], ['green', offset]] as const) {
    await edit({type: 'createSlot', bone: root, name: key});
    project = await native.invoke<ProjectSummary>('place_attachments', {
      expectedRevision: project.revision, slot: project.editedSlot!, keys: [key],
    });
    await edit({type: 'updateAttachment', id: project.editedAttachment!, x, y: 0, rotation: 0, scaleX: 1, scaleY: 1});
  }
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  const preview = page.getByTestId('animation-preview');
  await expect(preview.getByRole('img', {name: 'Live animation preview'})).toHaveAttribute('data-ready', 'true');
  await preview.getByRole('button', {name: 'Fit preview', exact: true}).click();
  const previewImage = async () => {
    const bounds = (await preview.locator('canvas').boundingBox())!;
    const inset = 44; // Exclude the floating controls and their focus outline.
    return page.screenshot({scale: 'css', clip: {x: bounds.x + inset, y: bounds.y, width: bounds.width - inset, height: bounds.height}});
  };
  await expect.poll(async () => {
    const bounds = (await preview.locator('canvas').boundingBox())!;
    const scale = Math.min(Math.max(1, bounds.width - 24) / (2 * offset + 96), Math.max(1, bounds.height - 24) / 96);
    return previewPixel(page, .5 + offset * scale / bounds.width);
  }).toEqual(GREEN);
  const previewBefore = await previewImage();
  const snapshot = await native.snapshot();
  const firstCall = native.calls.length;
  const rail = page.getByTestId('viewport-navigation');
  const zoom = rail.getByTestId('viewport-zoom');

  await expect(zoom).toHaveValue('100');
  await rail.getByTestId('viewport-fit').press('Enter');
  const fitted = Number(await zoom.inputValue()) / 100;
  expect(fitted).toBeGreaterThan(.1);
  expect(fitted).toBeLessThan(1);
  await expect.poll(() => stagePixel(page, -offset * fitted, 0)).toEqual(RED);
  await expect.poll(() => stagePixel(page, offset * fitted, 0)).toEqual(GREEN);

  const [centerX, centerY] = await stagePoint(page, 0, 0);
  await page.mouse.move(centerX, centerY);
  await page.mouse.down({button: 'right'});
  await page.mouse.move(centerX - offset * fitted, centerY, {steps: 4});
  await page.mouse.up({button: 'right'});
  await expect.poll(() => stagePixel(page, 0, 0)).toEqual(GREEN);
  await rail.getByTestId('viewport-zoom-actual-size').press('Enter');
  await expect(zoom).toHaveValue('100');
  await expect.poll(() => stagePixel(page, 0, 0)).toEqual(GREEN);

  await page.getByTestId('viewport').locator('canvas').press('f');
  await expect(zoom).toHaveValue('100');
  await expect.poll(() => stagePixel(page, 0, 0)).not.toEqual(GREEN);
  expect((await previewImage()).equals(previewBefore)).toBe(true);

  const previewNavigation = preview.getByTestId('preview-navigation');
  const previewZoom = previewNavigation.getByTestId('preview-zoom');
  await expect(previewNavigation).toBeVisible();
  await expect(previewNavigation.getByTestId('preview-rulers')).toHaveCount(0);
  const originalPreviewZoom = await previewZoom.inputValue();
  const previewCanvas = (await preview.locator('canvas').boundingBox())!;
  const previewCenterX = previewCanvas.x + previewCanvas.width / 2;
  const previewCenterY = previewCanvas.y + previewCanvas.height / 2;
  await page.mouse.move(previewCenterX, previewCenterY);
  await page.mouse.down({button: 'right'});
  await page.mouse.move(previewCenterX + Math.min(32, previewCanvas.width / 4), previewCenterY, {steps: 4});
  await page.mouse.up({button: 'right'});
  await expect.poll(async () => (await previewImage()).equals(previewBefore)).toBe(false);
  await expect(previewZoom).toHaveValue(originalPreviewZoom);
  await previewNavigation.getByTestId('preview-zoom-actual-size').press('Enter');
  await expect(previewZoom).toHaveValue('100');
  await expect(zoom).toHaveValue('100');
  await previewNavigation.getByTestId('preview-fit').press('Enter');
  await expect.poll(async () => (await previewImage()).equals(previewBefore)).toBe(true);
  expect(await native.snapshot()).toEqual(snapshot);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'edit_rig')).toEqual([]);
});
