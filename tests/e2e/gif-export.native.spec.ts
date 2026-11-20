import {readFile} from 'node:fs/promises';
import {basename} from 'node:path';
import type {Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test, type NativeSession} from './fixtures/native-session';

const clipName = 'Own GIF motion';
const startFrame = 1;
const endFrame = 4;
const fps = 10;

async function createFixture(native: NativeSession) {
  let project = await native.invoke<ProjectSummary>('create_project', {
    name: 'Own GIF preview', discardChanges: true,
  });
  const edit = async (edit: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit});
  };
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const root = project.bones[0]!.id;
  const place = async (bone: number, image: 'red' | 'green', x: number, y: number) => {
    await edit({type: 'createSlot', bone, name: image + ' art'});
    project = await native.invoke<ProjectSummary>('place_attachments', {
      expectedRevision: project.revision, slot: project.editedSlot!, keys: [image],
    });
    await edit({type: 'updateAttachment', id: project.editedAttachment!, x, y, scaleX: 0.5, scaleY: 0.5});
  };
  await place(root, 'red', 0, -60);
  await edit({type: 'create', parent: root, x: -72, y: 60, rotation: 0, length: 20});
  const moving = project.editedBone!;
  await place(moving, 'green', 0, 0);
  await edit({type: 'setAnimationFps', fps: 30});
  await edit({type: 'createAnimation', name: 'Own GIF decoy'});
  const decoy = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: decoy, keys: [
    {bone: moving, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: moving, channel: 'translate', frame: 18, values: [-30, 0], curve: 'linear'},
  ]});
  await edit({type: 'createAnimation', name: clipName});
  const clip = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation: clip, keys: [
    {bone: moving, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: moving, channel: 'translate', frame: 18, values: [144, 72], curve: 'linear'},
  ]});
  return clip;
}

async function decodeGif(page: Page, gif: Buffer) {
  expect(gif.subarray(0, 6).toString()).toBe('GIF89a');
  return page.evaluate(async data => {
    const decoder = new ImageDecoder({
      data: Uint8Array.from(atob(data), char => char.charCodeAt(0)),
      type: 'image/gif',
      preferAnimation: true,
    });
    try {
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack!;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', {willReadFrequently: true})!;
      const frames = [];
      for (let index = 0; index < track.frameCount; index++) {
        const {image, complete} = await decoder.decode({frameIndex: index});
        try {
          const {displayWidth: width, displayHeight: height, duration, timestamp} = image;
          canvas.width = width;
          canvas.height = height;
          context.drawImage(image, 0, 0);
          const {data: pixels} = context.getImageData(0, 0, width, height);
          // Locate the interior of both independently colored fixture images.
          // Ignore antialiasing and small quantization changes at the edges.
          const red = {count: 0, sumX: 0, sumY: 0, left: width, right: -1};
          const green = {count: 0, sumX: 0, sumY: 0, left: width, right: -1};
          for (let offset = 0; offset < pixels.length; offset += 4) {
            if (pixels[offset + 3]! < 250) continue;
            const r = pixels[offset]!;
            const g = pixels[offset + 1]!;
            const b = pixels[offset + 2]!;
            const color = r > 180 && r - g > 90 && r - b > 90 ? red
              : g > 150 && g - r > 70 && g - b > 50 ? green : null;
            if (!color) continue;
            const x = (offset / 4) % width;
            const y = Math.floor(offset / 4 / width);
            color.count++;
            color.sumX += x;
            color.sumY += y;
            color.left = Math.min(color.left, x);
            color.right = Math.max(color.right, x);
          }
          const measure = (color: typeof red) => ({
            count: color.count,
            x: color.count ? color.sumX / color.count : null,
            y: color.count ? color.sumY / color.count : null,
            width: color.right - color.left + 1,
          });
          frames.push({width, height, duration, timestamp, complete, red: measure(red), green: measure(green)});
        } finally {
          image.close();
        }
      }
      return {animated: track.animated, loops: track.repetitionCount === Infinity, frames};
    } finally {
      decoder.close();
    }
  }, gif.toString('base64'));
}

test('@native GIF preview exports the selected clip range and preserves the project', async ({page, native}) => {
  const clip = await createFixture(native);
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(clip));
  const playhead = page.getByTestId('timeline-current');
  await playhead.fill('18');
  await playhead.press('Enter');
  await expect(playhead).toHaveValue('18');
  const before = await native.snapshot();
  expect(before?.dirty).toBe(true);
  const file = page.locator('header details').filter({has: page.locator('summary').filter({hasText: /^File$/})});
  const dialog = page.getByTestId('gif-export-dialog');
  await file.locator('summary').click();
  await file.getByTestId('export-gif').click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('gif-export-animation')).toHaveValue(String(clip));
  await dialog.getByTestId('gif-export-fps').fill(String(fps));
  await dialog.getByTestId('gif-export-custom-range').check();
  await dialog.getByTestId('gif-export-start').fill(String(startFrame));
  await dialog.getByTestId('gif-export-end').fill(String(endFrame));
  await dialog.getByTestId('gif-export-repeat').setChecked(true);
  const submit = async (path: string | null) => {
    await native.queueDialog('save', path);
    const since = native.calls.length;
    await dialog.getByTestId('gif-export-submit').click();
    const calls = () => native.calls.slice(since).filter(call => call.command === 'save_gif_export');
    await expect.poll(() => calls()[0]?.result).not.toBeUndefined();
    expect(calls()).toHaveLength(1);
    expect(calls()[0]!.args).toMatchObject({
      expectedRevision: before!.revision, documentId: before!.documentId, suggestedName: clipName,
    });
    return calls()[0]!.result as {path: string} | null;
  };

  expect(await submit(null)).toBeNull();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('gif-export-submit')).toBeEnabled();
  await expect(dialog.getByTestId('gif-export-custom-range')).toBeChecked();
  await expect(dialog.getByTestId('gif-export-start')).toHaveValue(String(startFrame));
  await expect(dialog.getByTestId('gif-export-end')).toHaveValue(String(endFrame));
  await expect(page.getByText(/^GIF exported to /)).toHaveCount(0);
  expect(await native.snapshot()).toEqual(before);
  await expect(playhead).toHaveValue('18');

  const result = await submit('selected-preview');
  expect(result).not.toBeNull();
  await expect(dialog).toBeHidden();
  expect(basename(result!.path)).toBe('selected-preview.gif');
  await expect(page.getByText(`GIF exported to ${result!.path}.`, {exact: true})).toBeVisible();
  expect(await native.snapshot()).toEqual(before);
  await expect(page.getByTestId('animation-select')).toHaveValue(String(clip));
  await expect(playhead).toHaveValue('18');

  const decoded = await decodeGif(page, await readFile(result!.path));
  expect(decoded.animated).toBe(true);
  expect(decoded.loops).toBe(true);
  expect(decoded.frames).toHaveLength(4);
  expect(decoded.frames.map(frame => frame.duration)).toEqual([100000, 100000, 100000, 100000]);
  expect(decoded.frames.map(frame => frame.timestamp)).toEqual([0, 100000, 200000, 300000]);
  // Export frames 1 through 4 mean authored poses at 0.1 through 0.4 seconds.
  // These offsets from the stationary marker come from the fixture keys.
  const expectedOffsets = [[-48, 132], [-24, 144], [0, 156], [24, 168]] as const;
  const first = decoded.frames[0]!;
  for (const [index, frame] of decoded.frames.entries()) {
    expect(frame.complete).toBe(true);
    expect(frame.width).toBe(first.width);
    expect(frame.height).toBe(first.height);
    expect(frame.red.count).toBeGreaterThan(100);
    expect(frame.green.count).toBeGreaterThan(100);
    expect(Math.abs(frame.red.x! - first.red.x!)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.red.y! - first.red.y!)).toBeLessThanOrEqual(1);
    const scale = frame.red.width / 48;
    const [authoredX, authoredY] = expectedOffsets[index]!;
    expect(Math.abs((frame.green.x! - frame.red.x!) / scale - authoredX)).toBeLessThanOrEqual(4);
    expect(Math.abs((frame.red.y! - frame.green.y!) / scale - authoredY)).toBeLessThanOrEqual(4);
  }
});
