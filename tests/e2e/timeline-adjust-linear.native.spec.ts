import type {Locator, Page} from '@playwright/test';
import type {AnimationChannel} from '../../src/domain/animation';
import type {EvaluationSnapshot, ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

function authoredCalls(native: NativeSession, start: number) {
  return native.calls.slice(start).filter(call => call.command === 'edit_rig');
}

async function seek(page: Page, frame: number) {
  const input = page.getByTestId('timeline-current');
  await input.fill(String(frame));
  await input.press('Enter');
  await expect(input).toHaveValue(String(frame));
}

async function tagPosition(tag: Locator) {
  await expect(tag).toBeVisible();
  return tag.evaluate(node => {
    const {left, top} = (node as HTMLElement).style;
    return {x: parseFloat(left), y: parseFloat(top)};
  });
}

test('@native Adjust applies split Translate and Scale through the masked local viewport drag', async ({page, native}, info) => {
  await page.setViewportSize({width: 1360, height: 900});
  const path = await native.invoke<string>('e2e_seed_split_fixture');
  await native.queueDialog('open', path);
  let project = await native.invoke<ProjectSummary>('open_project', {discardChanges: true});
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  for (const clip of project.animations ?? []) {
    const keys = clip.constraintTracks?.flatMap(track => track.keys.map(key => key.id)) ?? [];
    if (keys.length) await edit({type: 'deleteAnimationKeys', animation: clip.id, keys});
  }
  for (const constraint of project.constraints ?? []) await edit({type: 'deleteConstraint', id: constraint.id});
  expect(project.constraints ?? []).toEqual([]);

  const animation = project.animations![0]!.id;
  const clip = (state: ProjectSummary) => state.animations!.find(item => item.id === animation)!;
  const track = (state: ProjectSummary, bone: number, channel: AnimationChannel) =>
    clip(state).tracks.find(item => item.bone === bone && item.channel === channel)!;
  const translateBone = clip(project).splitModes!.find(row => row.mode === 1)!.bone;
  const scaleBone = clip(project).splitModes!.find(row => row.mode === 2)!.bone;
  const parentId = project.bones.find(bone => bone.id === translateBone)!.parent!;
  const parent = project.bones.find(bone => bone.id === parentId)!;
  await edit({...parent, type: 'update', rotation: 30, scaleX: 2, scaleY: .75});
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: translateBone, channel: 'translateX', frame: 36, values: [10, 0], curve: 'linear'},
  ]});

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.getByTestId('viewport-names-bones').press('Enter');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const adjust = page.getByTestId('timeline-tool-adjust');
  const status = page.getByTestId('timeline-adjust-status');
  const tools = page.getByTestId('animation-tools');

  async function selectKeys(bone: number, frames: readonly number[], channel: AnimationChannel) {
    await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
    const selected = track((await native.snapshot())!, bone, channel).keys.filter(key => frames.includes(key.frame));
    expect(selected.map(key => key.frame)).toEqual(frames);
    for (const [index, key] of selected.entries()) {
      const mark = page.getByTestId(`timeline-key-${key.id}`);
      await mark.press(index === 0 ? 'Enter' : 'Control+Enter');
      await expect(mark).toHaveAttribute('aria-pressed', 'true');
    }
    return selected;
  }

  async function evaluateFrame(frame: number, snapshot: ProjectSummary) {
    return native.invoke<EvaluationSnapshot>('evaluate_project', {expectedRevision: snapshot.revision,
      request: {mode: 'none', time: frame / (snapshot.animationFps ?? 30), animationId: animation}});
  }

  async function startDrag(world: {x: number; y: number}, expectedCursor: string) {
    const box = (await canvas.boundingBox())!;
    const point = {x: box.x + box.width / 2 + world.x, y: box.y + box.height / 2 - world.y};
    await page.mouse.move(point.x, point.y);
    await expect(canvas).toHaveCSS('cursor', expectedCursor);
    await page.mouse.down();
    await expect(status).toContainText('Release to apply Adjust');
    return point;
  }

  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  const translation = await selectKeys(translateBone, [24, 36], 'translateX');
  await seek(page, 24);
  await adjust.press('Space');
  await expect(adjust).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText('Drag with Translate');
  const translateBefore = (await native.snapshot())!;
  const translatePose = await evaluateFrame(24, translateBefore);
  const parentWorld = translatePose.bones.find(bone => bone.id === parentId)!.world;
  const translateWorld = translatePose.bones.find(bone => bone.id === translateBone)!.world;
  expect(parentWorld.b).toBeCloseTo(1, 4);
  expect(parentWorld.c).toBeCloseTo(-.375, 4);
  const dx = 24, dy = 8;
  const localX = (parentWorld.d * dx - parentWorld.c * dy) / (parentWorld.a * parentWorld.d - parentWorld.b * parentWorld.c);
  const translateTag = page.getByTestId(`viewport-name-tag-bones-${translateBone}`);
  const originalTag = await tagPosition(translateTag);
  const translateStart = native.calls.length;
  const translatePointer = await startDrag(translateWorld, 'move');
  await page.mouse.move(translatePointer.x + dx, translatePointer.y - dy, {steps: 4});
  await expect.poll(async () => (await tagPosition(translateTag)).x - originalTag.x).toBeCloseTo(parentWorld.a * localX, 1);
  await expect.poll(async () => (await tagPosition(translateTag)).y - originalTag.y).toBeCloseTo(-parentWorld.b * localX, 1);
  expect(await native.snapshot()).toEqual(translateBefore);
  expect(authoredCalls(native, translateStart)).toHaveLength(0);
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(translateBefore.revision + 1);
  const afterTranslate = (await native.snapshot())!;
  const translated = track(afterTranslate, translateBone, 'translateX');
  expect(translated.keys.map(({id, frame, curve}) => ({id, frame, curve}))).toEqual(
    track(translateBefore, translateBone, 'translateX').keys.map(({id, frame, curve}) => ({id, frame, curve})),
  );
  for (const key of translation) {
    expect(translated.keys.find(item => item.id === key.id)?.values[0]).toBeCloseTo(Math.fround(key.values[0] + localX), 4);
  }
  expect(translated.keys.slice(0, 2)).toEqual(track(translateBefore, translateBone, 'translateX').keys.slice(0, 2));
  expect(track(afterTranslate, translateBone, 'translateY')).toEqual(track(translateBefore, translateBone, 'translateY'));
  expect(authoredCalls(native, translateStart)).toHaveLength(1);
  expect(authoredCalls(native, translateStart)[0]?.args.edit).toMatchObject({type: 'setAnimationKeys', animation,
    keys: translation.map(({id, frame}) => ({keyId: id, frame, bone: translateBone, channel: 'translateX'}))});
  await expect(adjust).toHaveAttribute('aria-pressed', 'true');

  const scaling = await selectKeys(scaleBone, [2, 10], 'scaleX');
  await seek(page, 10);
  await tools.getByRole('button', {name: 'Scale', exact: true}).click();
  await expect(status).toContainText('Drag with Scale');
  const scaleBefore = (await native.snapshot())!;
  const scaleWorld = (await evaluateFrame(10, scaleBefore)).bones.find(bone => bone.id === scaleBone)!.world;
  const scaleLength = scaleBefore.bones.find(bone => bone.id === scaleBone)!.length;
  const scaleTag = page.getByTestId(`viewport-name-tag-bones-${scaleBone}`);
  const oldScaleTag = await tagPosition(scaleTag);
  const scaleStart = native.calls.length;
  const scalePointer = await startDrag(scaleWorld, 'nwse-resize');
  const factor = Math.exp(.35);
  await page.mouse.move(scalePointer.x + 30, scalePointer.y - 5, {steps: 4});
  await expect.poll(async () => (await tagPosition(scaleTag)).x - oldScaleTag.x)
    .toBeCloseTo(scaleWorld.a * scaleLength * (factor - 1) / 2, 1);
  await expect.poll(async () => (await tagPosition(scaleTag)).y - oldScaleTag.y)
    .toBeCloseTo(-scaleWorld.b * scaleLength * (factor - 1) / 2, 1);
  expect(await native.snapshot()).toEqual(scaleBefore);
  await page.screenshot({path: info.outputPath('adjust-scale-local-preview.png')});
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(scaleBefore.revision + 1);
  const afterScale = (await native.snapshot())!;
  const scaled = track(afterScale, scaleBone, 'scaleX');
  for (const key of scaling) {
    expect(scaled.keys.find(item => item.id === key.id)?.values[0]).toBeCloseTo(Math.fround(key.values[0] * factor), 4);
  }
  expect(track(afterScale, scaleBone, 'scaleY')).toEqual(track(scaleBefore, scaleBone, 'scaleY'));
  expect(afterScale.bones).toEqual(translateBefore.bones);
  expect(authoredCalls(native, scaleStart)).toHaveLength(1);
  expect(authoredCalls(native, scaleStart)[0]?.args.edit).toMatchObject({type: 'setAnimationKeys', animation,
    keys: scaling.map(({id, frame}) => ({keyId: id, frame, bone: scaleBone, channel: 'scaleX'}))});

  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(afterTranslate.animations);
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(translateBefore.animations);
});
