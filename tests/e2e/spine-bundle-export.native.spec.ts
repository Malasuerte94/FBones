import {readFile, readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test, type NativeSession} from './fixtures/native-session';

const clipName = 'Own bundle move';
const physicsName = 'Own downward gravity';
const gravityStep = Math.fround(0.05);
const green = [55, 198, 100, 255];
const translation = [24, -10] as const;
type BundleResult = {path: string; pageCount: number};

async function fixture(native: NativeSession) {
  let project = await native.invoke<ProjectSummary>('create_project', {
    name: 'Own Spine game bundle', discardChanges: true,
  });
  const edit = async (edit: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit});
  };
  const root = project.bones[0]!;
  await edit({type: 'create', parent: root.id, x: -37, y: 15, rotation: 37, length: 28});
  const parent = project.editedBone!;
  await edit({type: 'create', parent, x: 19, y: -11, rotation: -25, length: 19});
  const boneId = project.editedBone!;
  await edit({type: 'create', parent: root.id, x: 55, y: 12, rotation: 0, length: 11});
  const gravityBoneId = project.editedBone!;
  await edit({type: 'addConstraint', constraint: {
    type: 'physics', name: physicsName, bone: gravityBoneId,
    x: 0, y: 1, rotate: null, shearX: 0, scaleX: 0,
    step: gravityStep, inertia: 1, strength: 60, damping: 0.85, mass: 1,
    wind: 0, gravity: 10, mix: 1, limit: 5000,
    globals: {inertia: false, strength: false, damping: false, mass: false, wind: false, gravity: false, mix: false},
  }});
  await edit({type: 'createSlot', bone: boneId, name: 'Bundle display'});
  const slotId = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {
    expectedRevision: project.revision, slot: slotId, keys: ['green'],
  });
  await edit({type: 'updateAttachment', id: project.editedAttachment!, x: -8, y: 13, rotation: 18});
  await edit({type: 'createAnimation', name: clipName});
  const animationId = project.editedAnimation!;
  const fps = project.animationFps ?? 30;
  await edit({type: 'setAnimationKeys', animation: animationId, keys: [
    {bone: boneId, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: boneId, channel: 'translate', frame: fps, values: [...translation], curve: 'linear'},
  ]});
  const bone = project.bones.find(bone => bone.id === boneId)!;
  const gravityBone = project.bones.find(bone => bone.id === gravityBoneId)!;
  const parentBone = project.bones.find(bone => bone.id === parent)!;
  const slot = project.slots.find(slot => slot.id === slotId)!;
  const attachment = slot.attachments!.find(item => item.id === slot.activeAttachmentId)!;
  return {parentBone, bone, gravityBone, slot, attachment, animationId, fps};
}

async function requestBundle(page: Page, native: NativeSession, target: string | null) {
  const start = native.calls.length;
  await native.queueDialog('folder', target);
  const file = page.locator('header details').filter({has: page.locator('summary').filter({hasText: /^File$/})});
  await file.locator('summary').click();
  await file.getByTestId('export-spine-bundle').click();
  const calls = () => native.calls.slice(start).filter(call => call.command === 'export_spine_bundle');
  await expect.poll(() => calls()[0]?.result).not.toBeUndefined();
  expect(calls()).toHaveLength(1);
  return calls()[0]!;
}

async function pngSample(page: Page, png: Buffer, x: number, y: number) {
  return page.evaluate(async ({bytes, x, y}) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(bytes), ch => ch.charCodeAt(0))], {type: 'image/png'}));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, x, y, 1, 1, 0, 0, 1, 1);
      return {width: image.width, height: image.height, pixel: Array.from(ctx.getImageData(0, 0, 1, 1).data)};
    } finally {
      image.close();
    }
  }, {bytes: png.toString('base64'), x, y});
}

function findGameSpineCore(): string | null {
  const override = process.env.FBONES_E2E_SPINE_GAME_DIR;
  const game = resolve(override ?? '../slot-dice-drop/web-sdk/apps/dice-drop');
  try {
    const fromGame = createRequire(join(game, 'package.json'));
    const pixi = fromGame.resolve('@esotericsoftware/spine-pixi-v8/package.json');
    const canvas = createRequire(pixi).resolve('@esotericsoftware/spine-canvas/package.json');
    return createRequire(canvas).resolve('@esotericsoftware/spine-core/package.json');
  } catch (error) {
    if (!override && (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') return null;
    throw error;
  }
}

test('@native File exports three Spine bundle files without mutating the project', async ({page, native}) => {
  const f = await fixture(native);
  await openNativeEditor(page);
  const before = (await native.snapshot())!;
  expect(before.dirty).toBe(true);
  const cancelled = await requestBundle(page, native, null);
  expect(cancelled.args).toEqual({expectedRevision: before.revision});
  expect(cancelled.result).toBeNull();
  expect(await native.snapshot()).toEqual(before);

  // Export with a sampled animated pose on screen. The game bundle must contain
  // the authored Setup position and the actual keys, not the displayed pose.
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(f.animationId));
  const frame = page.getByTestId('timeline-current');
  await frame.fill(String(f.fps / 2));
  await frame.press('Enter');
  await expect(frame).toHaveValue(String(f.fps / 2));
  const request = await requestBundle(page, native, 'images');
  expect(request.args).toEqual({expectedRevision: before.revision});
  const result = request.result as BundleResult;
  expect(result.pageCount).toBe(1);
  await expect(page.getByText(`Spine game bundle exported to ${result.path}.`, {exact: true})).toBeVisible();
  expect((await readdir(result.path)).sort()).toEqual(['skeleton.atlas', 'skeleton.json', 'skeleton.png']);
  const json = JSON.parse(await readFile(join(result.path, 'skeleton.json'), 'utf8'));
  expect(json.skeleton.spine).toBe('4.3.26');
  const bone = json.bones.find((bone: {name: string}) => bone.name === f.bone.name);
  expect(bone).toMatchObject({parent: f.parentBone.name, x: f.bone.x, y: f.bone.y, rotation: f.bone.rotation});
  expect(json.animations[clipName]).toBeDefined();
  const physics = json.constraints.find((constraint: {name: string}) => constraint.name === physicsName);
  expect(physics).toMatchObject({type: 'physics', bone: f.gravityBone.name, x: 0, y: 1, gravity: 10});
  expect(physics.fps).toBeCloseTo(20, 5);
  const atlas = await readFile(join(result.path, 'skeleton.atlas'), 'utf8');
  expect(atlas.split(/\r?\n/)).toContain('skeleton.png');
  expect(atlas.split(/\r?\n/)).toContain('green');
  expect(atlas.split(/\r?\n/)).not.toContain('red');
  const png = await readFile(join(result.path, 'skeleton.png'));
  const image = await pngSample(page, png, 0, 0);
  expect(image.width).toBeGreaterThanOrEqual(96);
  expect(image.height).toBeGreaterThanOrEqual(96);
  expect(await native.snapshot()).toEqual(before);
});

test('@native Spine game bundle opens and plays in the game’s installed spine-core 4.3.13', async ({page, native}) => {
  const packagePath = findGameSpineCore();
  test.skip(!packagePath, 'Needs the adjacent Dice Drop install or FBONES_E2E_SPINE_GAME_DIR pointing to the installed game.');
  const {main, version} = JSON.parse(await readFile(packagePath!, 'utf8')) as {main: string; version: string};
  expect(version).toBe('4.3.13');
  const spine = await import(pathToFileURL(join(dirname(packagePath!), main)).href);
  const f = await fixture(native);
  await openNativeEditor(page);
  const {path, pageCount} = (await requestBundle(page, native, 'images')).result as BundleResult;

  const atlas = new spine.TextureAtlas(await readFile(join(path, 'skeleton.atlas'), 'utf8'));
  expect(atlas.pages).toHaveLength(pageCount);
  const region = atlas.findRegion('green');
  expect(region).not.toBeNull();
  expect(region.width).toBe(96);
  expect(region.height).toBe(96);
  const png = await readFile(join(path, region.page.name));
  const image = await pngSample(page, png, region.x + 48, region.y + 48);
  expect(image.pixel).toEqual(green);
  expect(image.width).toBe(region.page.width);
  expect(image.height).toBe(region.page.height);

  // The browser decoded the emitted PNG above. Headless runtime sampling needs
  // only the texture dimensions and the genuine atlas-derived region metadata.
  class HeadlessTexture extends spine.Texture {
    constructor(width: number, height: number) { super({width, height}); }
    setFilters() {}
    setWraps() {}
    dispose() {}
  }
  region.page.setTexture(new HeadlessTexture(image.width, image.height));
  const data = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas))
    .readSkeletonData(await readFile(join(path, 'skeleton.json'), 'utf8'));
  const physics = data.constraints.find((constraint: {name: string}) => constraint.name === physicsName);
  expect(physics).toBeInstanceOf(spine.PhysicsConstraintData);
  expect(physics.bone.name).toBe(f.gravityBone.name);
  expect(physics.x).toBe(0);
  expect(physics.y).toBe(1);
  expect(physics.setupPose.gravity).toBe(10);
  expect(physics.step).toBeCloseTo(gravityStep, 8);
  const skeleton = new spine.Skeleton(data);
  const bone = skeleton.findBone(f.bone.name);
  expect(bone.parent.data.name).toBe(f.parentBone.name);
  expect(bone.pose.x).toBeCloseTo(f.bone.x, 5);
  expect(bone.pose.y).toBeCloseTo(f.bone.y, 5);
  const attachment = skeleton.findSlot(f.slot.name).pose.attachment;
  expect(attachment).toBeInstanceOf(spine.RegionAttachment);
  expect(attachment.name).toBe(f.attachment.name);
  expect(attachment.path).toBe(region.name);
  expect(attachment.x).toBeCloseTo(-8, 5);
  expect(attachment.y).toBeCloseTo(13, 5);
  expect(data.findAnimation(clipName).duration).toBeCloseTo(1, 5);

  const state = new spine.AnimationState(new spine.AnimationStateData(data));
  state.setAnimation(0, clipName, false);
  state.update(0.5);
  expect(state.apply(skeleton)).toBe(true);
  skeleton.updateWorldTransform(spine.Physics.none);
  expect(bone.pose.x).toBeCloseTo(f.bone.x + translation[0] / 2, 5);
  expect(bone.pose.y).toBeCloseTo(f.bone.y + translation[1] / 2, 5);
  atlas.dispose();
});
