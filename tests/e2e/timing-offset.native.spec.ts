import {copyFile} from 'node:fs/promises';
import type {Locator, Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

async function holdDrag(page: Page, key: Locator, frames: number) {
  await expect(key).toBeVisible();
  const mark = (await key.boundingBox())!;
  const zoom = Number(await page.getByTestId('timeline-zoom').inputValue());
  const x = mark.x + mark.width / 2;
  const y = mark.y + mark.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + frames * zoom, y, {steps: 6});
}

test('@native Timing Offset wraps a closed bone row and reuses the original Bézier seam', async ({page, native}, info) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Offset loop', discardChanges: true});
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  const bone = project.bones[0]!.id;
  await edit({type: 'update', id: bone, name: 'root', x: 0, y: 0, rotation: 0, length: 44});
  await edit({type: 'createAnimation', name: 'Offset loop'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'rotate', frame: 0, values: [10, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 6, values: [30, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 15, values: [70, 0], curve: 'bezier', controls: [[18, 97, 21, 72], [0, 0, 0, 0]]},
    {bone, channel: 'rotate', frame: 24, values: [40, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 30, values: [10, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 0, values: [7, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 12, values: [23, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 30, values: [7, 0], curve: 'linear'},
  ]});
  const clip = (state: ProjectSummary) => state.animations!.find(clip => clip.id === animation)!;
  const rotate = (state: ProjectSummary) => clip(state).tracks.find(track => track.channel === 'rotate')!;
  const translate = (state: ProjectSummary) => clip(state).tracks.find(track => track.channel === 'translate')!;
  const target = rotate(project).keys[2]!;
  const wrapped = rotate(project).keys[3]!;
  const read = async () => (await native.snapshot())!;
  const frames = async () => rotate(await read()).keys.map(key => key.frame);
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const key = page.getByTestId(`timeline-key-${target.id}`);
  await key.press('Enter');
  const offset = page.getByTestId('timeline-tool-offset');
  const shift = page.getByTestId('timeline-tool-shift');
  const status = page.getByTestId('timeline-offset-status');
  const before = await read();
  const firstCall = native.calls.length;
  const edits = () => native.calls.slice(firstCall).filter(call => call.command === 'edit_rig');
  await shift.press('Space');
  await expect(shift).toHaveAttribute('aria-pressed', 'true');
  await offset.press('Space');
  await expect(offset).toHaveAttribute('aria-pressed', 'true');
  await expect(shift).toHaveAttribute('aria-pressed', 'false');

  await holdDrag(page, key, 9);
  await expect(status).toContainText('+9');
  expect(await read()).toEqual(before);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(edits()).toHaveLength(0);

  await holdDrag(page, key, 9);
  await page.mouse.up();
  await expect.poll(frames).toEqual([0, 3, 9, 15, 24, 30]);
  const first = await read();
  const firstKeys = rotate(first).keys;
  expect(first.revision).toBe(before.revision + 1);
  expect(firstKeys[0]!.values[0]).toBeCloseTo(67.84998, 3);
  expect(firstKeys.at(-1)!.values).toEqual(firstKeys[0]!.values);
  expect(firstKeys[0]!.controls?.[0]?.[1]).toBeCloseTo(60.40554, 3);
  expect(firstKeys.find(key => key.id === target.id)?.controls?.[0]?.[3]).toBeCloseTo(82.73888, 3);
  expect(firstKeys.find(key => key.id === wrapped.id)?.frame).toBe(3);
  expect(translate(first)).toEqual(translate(before));
  expect(first.bones).toEqual(before.bones);
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({path: info.outputPath('offset-wrapped-dopesheet.png')});
  await native.queueDialog('save', 'offset-first.fbones');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await read()).dirty).toBe(false);
  const savedFirst = await read();
  await copyFile(savedFirst.path!, info.outputPath('offset-first.fbones'));

  await holdDrag(page, key, 3);
  await page.mouse.up();
  await expect.poll(frames).toEqual([0, 6, 12, 18, 27, 30]);
  const second = await read();
  const secondKeys = rotate(second).keys;
  expect(second.revision).toBe(savedFirst.revision + 1);
  expect(secondKeys[0]!.values[0]).toBeCloseTo(81.09, 3);
  expect(secondKeys.at(-1)!.values).toEqual(secondKeys[0]!.values);
  expect(translate(second)).toEqual(translate(before));
  expect(edits()).toHaveLength(2);
  expect(edits()[0]?.args.edit).toMatchObject({type: 'offsetAnimationKeys', animation, key: target.id, deltaFrames: 9});
  expect(edits()[1]?.args.edit).toMatchObject({type: 'offsetAnimationKeys', animation, key: target.id, deltaFrames: 3, continueOffset: true});

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => rotate(await read())).toEqual(rotate(first));
  await page.getByRole('button', {name: 'Redo', exact: true}).click();
  await expect.poll(async () => rotate(await read())).toEqual(rotate(second));
  await page.getByTestId('timeline-tab-graph').click();
  await expect(offset).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId(`timeline-graph-key-${target.id}-0`)).toBeVisible();
  await page.screenshot({path: info.outputPath('offset-repeated-graph.png')});
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await read()).dirty).toBe(false);
  await copyFile((await read()).path!, info.outputPath('offset-repeated.fbones'));
});

for (const [incoming, outgoing] of [[4, 26], [5, 27]] as const) {
  test(`@native Timing Offset uses Loop 6–24 and rebuilds exterior controls from ${incoming}/${outgoing}`, async ({page, native}) => {
    let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own explicit Loop Offset', discardChanges: true});
    const bone = project.bones[0]!.id;
    async function edit(change: RigEdit) {
      project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
    }
    await edit({type: 'createAnimation', name: 'Explicit Offset range'});
    const animation = project.editedAnimation!;
    // Paired owned exports in TIMING-OFFSET-2026-11-18.md differ only in
    // the two near exterior control times. Times below are 30 FPS frames.
    await edit({type: 'setAnimationKeys', animation, keys: [
      {bone, channel: 'rotate', frame: 0, values: [-34, 0], curve: 'bezier', controls: [[2, -20, incoming, -2], [0, 0, 0, 0]]},
      {bone, channel: 'rotate', frame: 6, values: [10, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 12, values: [40, 0], curve: 'bezier', controls: [[15, 97, 18, 72], [0, 0, 0, 0]]},
      {bone, channel: 'rotate', frame: 21, values: [70, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 24, values: [10, 0], curve: 'bezier', controls: [[outgoing, 33, 28, 75], [0, 0, 0, 0]]},
      {bone, channel: 'rotate', frame: 30, values: [101, 0], curve: 'linear'},
      {bone, channel: 'translate', frame: 0, values: [7, 0], curve: 'linear'},
      {bone, channel: 'translate', frame: 12, values: [23, 0], curve: 'linear'},
      {bone, channel: 'translate', frame: 30, values: [7, 0], curve: 'linear'},
    ]});
    const clip = (state: ProjectSummary) => state.animations!.find(item => item.id === animation)!;
    const rotate = (state: ProjectSummary) => clip(state).tracks.find(track => track.channel === 'rotate')!.keys;
    const translate = (state: ProjectSummary) => clip(state).tracks.find(track => track.channel === 'translate')!;
    const target = rotate(project)[3]!;
    const read = async () => (await native.snapshot())!;
    await openNativeEditor(page);
    await page.getByTestId('editor-mode-animate').click();
    await page.getByTestId('animation-select').selectOption(String(animation));
    await expect(page.getByTestId('timeline-repeat')).toHaveAttribute('aria-pressed', 'true');
    const begin = page.getByTestId('timeline-loop-start');
    const end = page.getByTestId('timeline-loop-end');
    const current = page.getByTestId('timeline-current');
    const key = page.getByTestId(`timeline-key-${target.id}`);
    const offset = page.getByTestId('timeline-tool-offset');
    const status = page.getByTestId('timeline-offset-status');
    async function enter(field: Locator, text: string) {
      await field.fill(text);
      await field.press('Enter');
      await expect(field).toHaveValue(text);
    }
    await enter(begin, '6');
    await enter(end, '24');
    await key.press('Enter');
    await enter(current, '24');
    await offset.press('Space');
    await expect(offset).toHaveAttribute('aria-pressed', 'true');
    const before = await read();
    const start = native.calls.length;
    const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');

    await holdDrag(page, key, 6);
    await expect(status).toContainText('+6');
    expect(await read()).toEqual(before);
    expect(edits()).toHaveLength(0);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect(await read()).toEqual(before);
    expect(edits()).toHaveLength(0);
    await expect(key).toHaveAttribute('aria-pressed', 'true');

    await holdDrag(page, key, 6);
    await expect(status).toContainText('+6');
    await enter(end, '25');
    await expect(status).not.toContainText('+6');
    await page.mouse.up();
    expect(await read()).toEqual(before);
    expect(edits()).toHaveLength(0);
    await expect(current).toHaveValue('24');
    await enter(end, '24');
    await expect(key).toHaveAttribute('aria-pressed', 'true');

    await holdDrag(page, key, 6);
    await expect(status).toContainText('+6');
    expect(await read()).toEqual(before);
    expect(edits()).toHaveLength(0);
    await page.mouse.up();
    await expect.poll(async () => rotate(await read()).map(key => key.frame)).toEqual([0, 6, 9, 12, 18, 24, 30]);

    const after = await read();
    expect(edits()).toHaveLength(1);
    expect(after.revision).toBe(before.revision + 1);
    expect(edits()[0]!.args).toMatchObject({expectedRevision: before.revision, edit: {
      type: 'offsetAnimationKeys', animation, key: target.id, deltaFrames: 6, loopRange: {start: 6, end: 24},
    }});
    const rows = rotate(after);
    const values = [-34, 75.69, 70, 10, 40, 75.69, 101];
    const controls = [
      [2, -20, 4, 79.46777], [7, 73.80112, 8, 70.66666], null, null,
      [20, 78, 22, 79.46778], [26, 71.91222, 28, 75], null,
    ];
    for (const [index, row] of rows.entries()) {
      const curve = controls[index];
      expect(Math.abs(row.values[0] - values[index]!), `Rotate f${row.frame} value`).toBeLessThanOrEqual(5e-5);
      expect(row.values[1]).toBe(0);
      expect(row.curve).toBe(curve ? 'bezier' : 'linear');
      if (curve) {
        for (const [component, expected] of curve.entries()) {
          expect(Math.abs(row.controls![0][component]! - expected), `Rotate f${row.frame} control ${component}`).toBeLessThanOrEqual(5e-5);
        }
        expect(row.controls![1]).toEqual([0, 0, 0, 0]);
      } else expect(row.controls ?? null).toBeNull();
    }
    expect(rows[1]!.values).toEqual(rows[5]!.values);
    expect(rows[2]!.id).toBe(target.id);
    expect(rows[0]!.id).toBe(rotate(before)[0]!.id);
    expect(rows[6]!.id).toBe(rotate(before)[5]!.id);
    expect(translate(after)).toEqual(translate(before));
    expect(after.bones).toEqual(before.bones);
    expect(after.slots).toEqual(before.slots);
    await transportAndSelection();

    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect.poll(async () => (await read()).animations).toEqual(before.animations);
    expect(edits().map(call => (call.args.edit as RigEdit).type)).toEqual(['offsetAnimationKeys', 'undo']);
    await transportAndSelection();

    async function transportAndSelection() {
      await expect(current).toHaveValue('24');
      await expect(begin).toHaveValue('6');
      await expect(end).toHaveValue('24');
      await expect(key).toHaveAttribute('aria-pressed', 'true');
    }
  });
}
