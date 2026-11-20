import {inflateSync} from 'node:zlib';
import type {Locator, Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

const green = [55, 198, 100];

async function previewPixel(page: Page, canvas: Locator, worldX: number) {
  const box = (await canvas.boundingBox())!;
  // The red and blue anchors keep the center and fit scale constant as the
  // green attachment moves. Each generated PNG is 96 units wide.
  const size = 96 * Math.fround(.2);
  const zoom = Math.min((box.width - 24) / (200 + size), (box.height - 24) / size);
  const png = await page.screenshot({scale: 'css', clip: {
    x: Math.floor(box.x + box.width / 2 + worldX * zoom),
    y: Math.floor(box.y + box.height / 2), width: 1, height: 1,
  }});
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  return [...inflateSync(Buffer.concat(chunks)).subarray(1, 4)];
}

async function seedPreviewScene(native: NativeSession, name: string) {
  let project = await native.invoke<ProjectSummary>('create_project', {name, discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
    return project;
  };
  const root = project.bones[0]!.id;
  await edit({type: 'create', parent: root, x: 0, y: 0, rotation: 0, length: 28});
  const actor = project.editedBone!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  for (const [key, bone, x] of [['red', root, -100], ['green', actor, 0], ['blue', root, 100]] as const) {
    project = await native.invoke<ProjectSummary>('place_images', {expectedRevision: project.revision, bone, x, y: 0, keys: [key]});
    await edit({type: 'updateAttachment', id: project.editedAttachment!, x, y: 0, rotation: 0, scaleX: .2, scaleY: .2});
  }
  return {actor, edit};
}

test('@native Preview blends independent tracks and crossfades without moving the editor', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 760});
  const {actor, edit} = await seedPreviewScene(native, 'Own independent Preview');
  const clips: number[] = [];
  for (const [name, x] of [['Center', 0], ['Move right', 80], ['Move left', -40]] as const) {
    const clip = (await edit({type: 'createAnimation', name})).editedAnimation!;
    clips.push(clip);
    await edit({type: 'setAnimationKeys', animation: clip, keys: [0, 30].map(frame => ({
      bone: actor, channel: 'translate', frame, values: [x, 0], curve: 'linear',
    }))});
  }
  const [center, right, left] = clips as [number, number, number];
  const sweep = (await edit({type: 'createAnimation', name: 'Sweep'})).editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: sweep, keys: [0, 30].map(frame => ({
    bone: actor, channel: 'translate', frame, values: [80 * frame / 30, 0], curve: 'linear',
  }))});
  const before = await native.snapshot();
  const firstCall = native.calls.length;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  const animation = page.getByTestId('animation-select');
  const current = page.getByTestId('timeline-current');
  const viewport = page.getByTestId('viewport').locator('canvas');
  const preview = page.getByTestId('animation-preview');
  const canvas = preview.locator('canvas');
  const follow = preview.getByTestId('preview-mode-follow');
  const tracks = preview.getByTestId('preview-mode-tracks');
  const play = preview.getByTestId('preview-playback');
  const pixel = (x: number) => previewPixel(page, canvas, x);
  await animation.selectOption(String(center));
  await current.fill('12'); await current.press('Enter');
  await expect(follow).toHaveAttribute('aria-pressed', 'true');
  await preview.getByRole('button', {name: 'Fit preview', exact: true}).click();
  await expect.poll(() => pixel(0)).toEqual(green);
  const beforeEditor = await viewport.screenshot();

  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await tracks.press('Enter');
  await expect(tracks).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByTestId('preview-track-0')).toHaveAttribute('aria-pressed', 'true');
  await preview.getByTestId(`preview-clip-${center}`).press('Space');
  await expect(play).toHaveAccessibleName('Pause preview');
  await expect(preview.getByTestId('preview-active-clip')).toContainText('Center');
  await expect(current).toHaveValue('12');
  await preview.getByTestId('preview-track-1').click();
  const settings = preview.getByTestId('preview-composition');
  await preview.getByTestId('preview-composition-toggle').click();
  await expect(settings).toHaveJSProperty('open', true);
  const alpha = preview.getByTestId('preview-alpha');
  await alpha.fill('50'); await alpha.press('Enter');
  await preview.getByTestId(`preview-clip-${right}`).click();
  await expect(preview.getByTestId('preview-active-clip')).toContainText('Move right');
  await preview.getByTestId('preview-fit').click();
  await expect.poll(() => pixel(40)).toEqual(green);
  expect(await pixel(0)).not.toEqual(green);
  const additive = preview.getByTestId('preview-additive');
  await expect(additive).not.toBeChecked();
  await page.screenshot({path: info.outputPath('preview-overlay-track.png')});

  const mix = preview.getByTestId('preview-mix-duration');
  await mix.fill('0'); await mix.press('Enter');
  await preview.getByTestId('preview-clear-track').click();
  await expect.poll(() => pixel(0)).toEqual(green);
  await preview.getByTestId('preview-track-0').click();
  await mix.fill('1'); await mix.press('Enter');
  await preview.getByTestId(`preview-clip-${right}`).click();
  await expect.poll(() => pixel(0)).toEqual(green);
  await page.clock.runFor(520);
  await expect.poll(() => pixel(40)).toEqual(green);
  const baseTrack = preview.getByTestId('preview-track-0');
  await baseTrack.click({button: 'right'});
  await expect(baseTrack).toHaveAttribute('data-muted', 'true');
  await expect(play).toBeDisabled();
  await expect.poll(() => pixel(0)).toEqual(green);
  await page.clock.runFor(800);
  await baseTrack.click({button: 'right'});
  await expect(baseTrack).toHaveAttribute('data-muted', 'false');
  await expect.poll(() => pixel(40)).toEqual(green);
  await page.clock.runFor(560);
  await expect.poll(() => pixel(80)).toEqual(green);
  await expect(additive).toHaveCount(0);

  await preview.getByTestId('preview-track-1').click();
  const leftClip = preview.getByTestId(`preview-clip-${left}`);
  await leftClip.click();
  await expect.poll(() => pixel(20)).toEqual(green);
  await additive.press('Space');
  await expect(additive).toBeChecked();
  await expect(preview.getByTestId('preview-next-assignment-hint')).toBeVisible();
  expect(await pixel(20)).toEqual(green);
  expect(await pixel(60)).not.toEqual(green);
  await leftClip.click();
  await leftClip.click();
  await expect.poll(() => pixel(60)).toEqual(green);
  expect(await pixel(20)).not.toEqual(green);
  await page.screenshot({path: info.outputPath('preview-additive-track.png')});
  await additive.press('Space');
  await expect(additive).not.toBeChecked();
  expect(await pixel(60)).toEqual(green);
  await preview.getByTestId('preview-clear-track').click();
  await expect.poll(() => pixel(80)).toEqual(green);
  await preview.getByTestId('preview-track-0').click();

  await expect(current).toHaveValue('12');
  await expect(animation).toHaveValue(String(center));
  await expect(page.getByTestId('timeline-play')).toHaveAccessibleName('Play');
  expect(await viewport.screenshot()).toEqual(beforeEditor);

  await mix.fill('0'); await mix.press('Enter');
  const speed = preview.getByTestId('preview-speed');
  await speed.fill('200'); await speed.press('Enter');
  await preview.getByTestId('preview-repeat').uncheck();
  await preview.getByTestId(`preview-clip-${center}`).click();
  await page.clock.runFor(300);
  await expect(play).toHaveAccessibleName('Pause preview');
  await page.clock.runFor(260);
  await expect(play).toHaveAccessibleName('Play preview');
  await expect(current).toHaveValue('12');
  await expect.poll(() => pixel(0)).toEqual(green);

  await preview.getByTestId('preview-track-4').click();
  await preview.getByTestId(`preview-clip-${center}`).click();
  await expect(preview.getByTestId('preview-track-9')).toBeVisible();
  await preview.getByTestId('preview-track-9').click();
  await preview.getByTestId(`preview-clip-${center}`).click();
  await expect(preview.getByTestId('preview-track-14')).toBeVisible();
  await expect(preview.getByTestId('preview-track-15')).toHaveCount(0);

  await preview.getByTestId(`preview-clip-row-${center}`).click({button: 'right'});
  await expect(current).toHaveValue('12');
  await preview.getByTestId(`preview-clip-row-${left}`).click({button: 'right'});
  await expect(animation).toHaveValue(String(left));
  await expect(preview.getByTestId('preview-track-9')).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByTestId('preview-active-clip')).toContainText('Center');
  await expect.poll(() => pixel(0)).toEqual(green);
  await preview.getByTestId('preview-track-0').click({button: 'middle'});
  await expect(animation).toHaveValue(String(center));
  await current.fill('12');
  await current.press('Enter');
  const highTrack = preview.getByTestId('preview-track-9');
  await expect(highTrack).toHaveAttribute('aria-pressed', 'true');

  await preview.getByTestId(`preview-clip-${sweep}`).click();
  await page.clock.runFor(520);
  await expect.poll(() => pixel(40)).toEqual(green);
  const steadyPhase = await canvas.screenshot();
  const lowerTrack = preview.getByTestId('preview-track-4');
  await lowerTrack.click();
  await highTrack.click({button: 'right'});
  await expect(highTrack).toHaveAttribute('data-muted', 'true');
  await expect(lowerTrack).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByTestId('preview-track-14')).toBeVisible();
  await expect.poll(() => pixel(0)).toEqual(green);
  await page.clock.runFor(720);
  await expect(play).toHaveAccessibleName('Pause preview');
  await highTrack.click({button: 'right'});
  await expect(highTrack).toHaveAttribute('data-muted', 'false');
  await expect(lowerTrack).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => canvas.screenshot()).toEqual(steadyPhase);

  await highTrack.click();
  const mute = preview.getByTestId('preview-track-mute');
  await play.click();
  await mute.press('Space');
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByTestId('preview-active-clip')).toContainText('Sweep');
  await expect(play).toHaveAccessibleName('Play preview');
  await expect.poll(() => pixel(0)).toEqual(green);
  await page.screenshot({path: info.outputPath('preview-muted-track.png')});
  await mute.press('Space');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await expect(play).toHaveAccessibleName('Play preview');
  await expect.poll(() => canvas.screenshot()).toEqual(steadyPhase);
  await mute.press('Space');
  await preview.getByTestId('preview-clear-track').click();
  await expect(highTrack).toHaveAttribute('data-muted', 'false');
  await expect(mute).toBeDisabled();
  await highTrack.click({button: 'right'});
  await expect(mute).toBeDisabled();
  await expect(current).toHaveValue('12');

  await follow.click();
  await expect.poll(() => pixel(0)).toEqual(green);
  await animation.selectOption(String(sweep));
  await preview.getByTestId('preview-fit').click();
  const draws = async () => Number(await canvas.getAttribute('data-preview-draws'));
  await canvas.evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) throw Error('Expected the existing Preview WebGL context.');
    const drawElements = gl.drawElements.bind(gl);
    let count = 0;
    canvas.setAttribute('data-preview-draws', '0');
    gl.drawElements = (...args) => {
      canvas.setAttribute('data-preview-draws', String(++count));
      drawElements(...args);
    };
  });
  const dock = page.getByTestId('dock-panel-properties');
  await dock.getByRole('button', {name: 'Panel actions for Preview', exact: true}).click();
  await page.getByRole('menuitem', {name: 'Minimize Preview panel', exact: true}).click();
  await expect(dock).toBeHidden();
  const beforeHidden = await draws();
  await page.getByTestId('timeline-play').click();
  await page.clock.runFor(520);
  await expect(current).not.toHaveValue('0');
  expect(await draws()).toBe(beforeHidden);
  await page.getByRole('button', {name: 'Restore Preview panel', exact: true}).click();
  await expect.poll(draws).toBeGreaterThan(beforeHidden);
  await expect.poll(() => pixel(40)).toEqual(green);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(firstCall).filter(call => ['edit_rig', 'save_project', 'evaluate_project'].includes(call.command))).toEqual([]);
});

test('@native Setup Preview plays during rig edits and preserves the Animate timeline', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 760});
  const {actor, edit} = await seedPreviewScene(native, 'Own Setup Preview');
  const timelineClip = (await edit({type: 'createAnimation', name: 'Timeline clip'})).editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: timelineClip, keys: [{
    bone: actor, channel: 'translate', frame: 30, values: [0, 0], curve: 'linear',
  }]});
  const sweep = (await edit({type: 'createAnimation', name: 'Preview sweep'})).editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: sweep, keys: [0, 30].map(frame => ({
    bone: actor, channel: 'translate', frame, values: [60 * frame / 30, 0], curve: 'linear',
  }))});
  const before = await native.snapshot();
  const firstCall = native.calls.length;

  await openNativeEditor(page);
  const setup = page.getByTestId('editor-mode-setup');
  const animate = page.getByTestId('editor-mode-animate');
  const animation = page.getByTestId('animation-select');
  const current = page.getByTestId('timeline-current');
  const properties = page.getByTestId('dock-panel-properties');
  const dock = page.getByTestId('dock-panel-preview');
  const preview = page.getByTestId('animation-preview');
  const canvas = preview.locator('canvas');
  const play = preview.getByTestId('preview-playback');
  const fit = async () => {
    await preview.getByTestId('preview-fit').click();
    await canvas.scrollIntoViewIfNeeded();
  };
  const views = page.locator('header details > summary').filter({hasText: /^Views$/});
  const openPreview = async () => {
    await views.click();
    await page.getByTestId('view-toggle-preview').check();
    await views.click();
  };
  const pixel = (x: number) => previewPixel(page, canvas, x);
  await expect(dock).toBeHidden();
  await animate.click();
  await animation.selectOption(String(timelineClip));
  await current.fill('12');
  await current.press('Enter');
  await setup.click();
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${actor}"]`).getByRole('treeitem').click();
  await expect(properties.getByTestId('bone-name')).toBeVisible();
  await openPreview();
  await expect(dock.getByTestId('animation-preview')).toBeVisible();
  await expect(page.locator('[data-dock-column="scene"] [data-testid^="dock-panel-"]')).toHaveCount(3);
  await expect(preview.getByTestId('preview-mode-follow')).toHaveAccessibleName('Follow Setup');
  await expect(play).toHaveCount(0);
  await fit();
  await expect.poll(() => pixel(0)).toEqual(green);

  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await preview.getByTestId('preview-mode-tracks').click();
  await preview.getByTestId(`preview-clip-${sweep}`).click();
  await expect(play).toHaveAccessibleName('Pause preview');
  await page.clock.runFor(270);
  await fit();
  await expect.poll(() => pixel(15)).toEqual(green);
  expect(await pixel(0)).not.toEqual(green);

  const x = page.getByTestId('bone-x');
  await x.fill('36');
  await x.press('Enter');
  await expect.poll(async () => (await native.snapshot())?.bones.find(bone => bone.id === actor)?.x).toBe(36);
  await fit();
  await expect.poll(() => pixel(51)).toEqual(green);
  expect(await pixel(15)).not.toEqual(green);
  await preview.getByTestId(`preview-clip-row-${sweep}`).click({button: 'right'});
  await preview.getByTestId('preview-track-0').click({button: 'middle'});
  await expect(current).toHaveCount(0);
  await page.screenshot({path: info.outputPath('setup-preview.png')});

  await dock.getByRole('button', {name: 'Panel actions for Preview', exact: true}).click();
  await page.getByRole('menuitem', {name: 'Close Preview panel', exact: true}).click();
  await expect(dock).toBeHidden();
  await page.clock.runFor(520);
  await openPreview();
  await fit();
  await expect.poll(() => pixel(51)).toEqual(green);
  await animate.click();
  await expect(page.getByTestId('animation-preview')).toHaveCount(1);
  await expect(dock).toBeHidden();
  await expect(properties.getByTestId('preview-active-clip')).toContainText('Preview sweep');
  await expect(animation).toHaveValue(String(timelineClip));
  await expect(current).toHaveValue('12');
  await setup.click();
  await fit();
  await expect.poll(() => pixel(51)).toEqual(green);
  const height = dock.getByTestId('dock-height-preview');
  const oldHeight = Number(await height.getAttribute('aria-valuenow'));
  await height.press('ArrowDown');
  const resizedHeight = Number(await height.getAttribute('aria-valuenow'));
  expect(resizedHeight).toBeGreaterThan(oldHeight);

  const after = await native.snapshot();
  expect(after?.animations).toEqual(before?.animations);
  expect(after?.bones).toEqual(before?.bones.map(bone => bone.id === actor ? {...bone, x: 36} : bone));
  const mutations = native.calls.slice(firstCall).filter(call => ['edit_rig', 'save_project', 'evaluate_project'].includes(call.command));
  expect(mutations.map(call => call.command)).toEqual(['edit_rig']);
  await page.reload();
  await expect(dock.getByTestId('animation-preview')).toBeVisible();
  await expect(height).toHaveAttribute('aria-valuenow', String(resizedHeight));
  await expect(properties).toBeVisible();
});

test('@native Preview view settings change only the local canvas and keep hidden playback running', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 760});
  const {actor, edit} = await seedPreviewScene(native, 'Own Preview view settings');
  const timelineClip = (await edit({type: 'createAnimation', name: 'Settings timeline'})).editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: timelineClip, keys: [{
    bone: actor, channel: 'translate', frame: 30, values: [0, 0], curve: 'linear',
  }]});
  const sweep = (await edit({type: 'createAnimation', name: 'Settings sweep'})).editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: sweep, keys: [0, 30].map(frame => ({
    bone: actor, channel: 'translate', frame, values: [60 * frame / 30, 0], curve: 'linear',
  }))});
  const before = await native.snapshot();
  const firstCall = native.calls.length;
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  const timeline = page.getByTestId('animation-select');
  const current = page.getByTestId('timeline-current');
  await timeline.selectOption(String(timelineClip));
  await current.fill('12');
  await current.press('Enter');

  const mainBones = page.getByTestId('viewport-show-bones');
  await mainBones.press('Space');
  await expect(mainBones).toHaveAttribute('aria-pressed', 'false');
  const viewport = page.getByTestId('viewport').locator('canvas');
  const preview = page.getByTestId('animation-preview');
  const canvas = preview.locator('canvas');
  const gear = preview.getByTestId('preview-view-settings');
  const settings = preview.getByTestId('preview-view-settings-panel');
  const hide = preview.getByTestId('preview-hide-controls');
  const bones = preview.getByTestId('preview-show-bones');
  const play = preview.getByTestId('preview-playback');
  const pixel = (x: number) => previewPixel(page, canvas, x);
  const fit = async () => {
    await preview.getByTestId('preview-fit').click();
    await canvas.scrollIntoViewIfNeeded();
  };
  const openSettings = async () => {
    await gear.press('Enter');
    await expect(settings).toBeVisible();
  };
  const closeSettings = async (from: Locator) => {
    await from.press('Escape');
    await expect(settings).toBeHidden();
    await expect(gear).toBeFocused();
  };

  await fit();
  await expect.poll(() => pixel(0)).toEqual(green);
  const mainImage = await viewport.screenshot();
  await openSettings();
  await expect(hide).not.toBeChecked();
  await expect(bones).not.toBeChecked();
  await expect(preview.getByTestId('preview-play-current')).not.toBeChecked();
  await bones.press('Space');
  await expect(bones).toBeChecked();
  await closeSettings(bones);
  await expect.poll(() => pixel(0)).not.toEqual(green);
  await expect(mainBones).toHaveAttribute('aria-pressed', 'false');
  expect(await viewport.screenshot()).toEqual(mainImage);

  await openSettings();
  await bones.press('Space');
  await closeSettings(bones);
  await expect.poll(() => pixel(0)).toEqual(green);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await preview.getByTestId('preview-mode-tracks').click();
  const clip = preview.getByTestId(`preview-clip-${sweep}`);
  await clip.click();
  await expect(play).toHaveAccessibleName('Pause preview');
  await fit();
  const originalWidth = (await canvas.boundingBox())!.width;
  await openSettings();
  await hide.press('Space');
  await expect(hide).toBeChecked();
  await closeSettings(hide);
  await expect(clip).toBeHidden();
  await expect(play).toBeHidden();
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(originalWidth + 20);
  await fit();
  await expect.poll(() => pixel(0)).toEqual(green);
  await page.clock.runFor(340);
  await expect.poll(() => pixel(20)).toEqual(green);
  expect(await pixel(0)).not.toEqual(green);
  await expect(timeline).toHaveValue(String(timelineClip));
  await expect(current).toHaveValue('12');
  await expect(page.getByTestId('timeline-play')).toHaveAccessibleName('Play');
  expect(await viewport.screenshot()).toEqual(mainImage);
  await page.screenshot({path: info.outputPath('preview-view-settings-hidden.png')});

  await openSettings();
  await bones.press('Space');
  await closeSettings(bones);
  await page.getByTestId('editor-mode-setup').click();
  const views = page.locator('header details > summary').filter({hasText: /^Views$/});
  await views.click();
  await page.getByTestId('view-toggle-preview').check();
  await views.click();
  await expect(page.getByTestId('dock-panel-preview').getByTestId('animation-preview')).toBeVisible();
  await openSettings();
  await expect(bones).toBeChecked();
  await expect(hide).toBeChecked();
  await hide.press('Space');
  await closeSettings(hide);
  await expect(preview.getByTestId('preview-active-clip')).toContainText('Settings sweep');
  await expect(play).toHaveAccessibleName('Pause preview');
  expect(await native.snapshot()).toEqual(before);
  const mutations = native.calls.slice(firstCall).filter(call => ['edit_rig', 'save_project', 'evaluate_project'].includes(call.command));
  expect(mutations).toEqual([]);
});

test('@native Play current animation updates independent Preview track 0 and preserves the editor', async ({page, native}) => {
  await page.setViewportSize({width: 960, height: 760});
  const {actor, edit} = await seedPreviewScene(native, 'Own Preview current animation');
  const sweep = (await edit({type: 'createAnimation', name: 'Current sweep'})).editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: sweep, keys: [0, 30].map(frame => ({
    bone: actor, channel: 'translate', frame, values: [60 * frame / 30, 0], curve: 'linear',
  }))});
  const left = (await edit({type: 'createAnimation', name: 'Current left'})).editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: left, keys: [0, 30].map(frame => ({
    bone: actor, channel: 'translate', frame, values: [-60, 0], curve: 'linear',
  }))});
  const before = await native.snapshot();
  const firstCall = native.calls.length;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  const animation = page.getByTestId('animation-select');
  const current = page.getByTestId('timeline-current');
  const editor = page.getByTestId('viewport').locator('canvas');
  const preview = page.getByTestId('animation-preview');
  const canvas = preview.locator('canvas');
  const pixel = (x: number) => previewPixel(page, canvas, x);
  const tracks = preview.getByTestId('preview-mode-tracks');
  const base = preview.getByTestId('preview-track-0');
  const upper = preview.getByTestId('preview-track-1');
  const activeClip = preview.getByTestId('preview-active-clip');
  const settings = preview.getByTestId('preview-view-settings');
  const playCurrent = preview.getByTestId('preview-play-current');
  await animation.selectOption(String(sweep));
  await current.fill('12'); await current.press('Enter');
  await preview.getByTestId('preview-fit').click();
  await expect.poll(() => pixel(24)).toEqual(green);
  const editorAtTwelve = await editor.screenshot();

  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await tracks.click();
  const previewLeft = preview.getByTestId(`preview-clip-${left}`);
  await previewLeft.click();
  await upper.click();
  await previewLeft.click();
  await upper.click({button: 'right'});
  await preview.getByTestId('preview-fit').click();
  await expect.poll(() => pixel(-60)).toEqual(green);

  await settings.press('Enter');
  await expect(playCurrent).toBeEnabled();
  await expect(playCurrent).not.toBeChecked();
  await playCurrent.press('Space');
  await expect(playCurrent).toBeChecked();
  await playCurrent.press('Escape');
  await expect(upper).toHaveAttribute('aria-pressed', 'true');
  await expect(upper).toHaveAttribute('data-muted', 'true');
  await expect(activeClip).toContainText('Current left');
  await base.click();
  await expect(activeClip).toContainText('Current sweep');
  await page.clock.runFor(320);
  await expect.poll(() => pixel(18)).toEqual(green);
  await expect(current).toHaveValue('12');
  await expect(animation).toHaveValue(String(sweep));
  await expect(page.getByTestId('timeline-play')).toHaveAccessibleName('Play');
  expect(await editor.screenshot()).toEqual(editorAtTwelve);

  await current.fill('18'); await current.press('Enter');
  await page.clock.runFor(230);
  await expect.poll(() => pixel(32)).toEqual(green);
  await expect(current).toHaveValue('18');

  await animation.selectOption(String(left));
  await expect(activeClip).toContainText('Current left');
  await page.clock.runFor(320);
  await expect.poll(() => pixel(-60)).toEqual(green);
  await expect(upper).toHaveAttribute('data-muted', 'true');

  await settings.press('Enter');
  await expect(playCurrent).toBeChecked();
  await playCurrent.press('Space');
  await expect(playCurrent).not.toBeChecked();
  await playCurrent.press('Escape');
  await animation.selectOption(String(sweep));
  await page.clock.runFor(320);
  await expect(activeClip).toContainText('Current left');
  await expect.poll(() => pixel(-60)).toEqual(green);
  await expect(page.getByTestId('timeline-play')).toHaveAccessibleName('Play');
  expect(await native.snapshot()).toEqual(before);
  const mutations = native.calls.slice(firstCall).filter(call => ['edit_rig', 'save_project', 'evaluate_project'].includes(call.command));
  expect(mutations).toEqual([]);
});
