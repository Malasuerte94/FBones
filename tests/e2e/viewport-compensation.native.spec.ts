import type {Locator} from '@playwright/test';
import type {EvaluationSnapshot, ProjectSummary, RegionView, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

type Layers = {bones: boolean; images: boolean};
type World = EvaluationSnapshot['bones'][number]['world'];
type Point = {x: number; y: number};

async function tagPosition(tag: Locator) {
  return tag.evaluate(node => {
    const {left, top} = (node as HTMLElement).style;
    return {x: parseFloat(left), y: parseFloat(top)};
  });
}

async function addCompensationDependents(native: NativeSession, initial: ProjectSummary, owner: number,
  {childPosition = {x: 20, y: 18}, inactiveRotation = 12}: {childPosition?: Point; inactiveRotation?: number} = {}) {
  let project = initial;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'create', parent: owner, ...childPosition, rotation: -20, length: 28});
  const child = project.editedBone!;
  await edit({type: 'createSlot', bone: owner, name: 'Own alternatives'});
  const slot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: ['green']});
  const active = project.editedAttachment!;
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: ['red']});
  const inactive = project.editedAttachment!;
  await edit({type: 'updateAttachment', id: active, x: 64, y: -36, rotation: 0, scaleX: 2, scaleY: 2});
  await edit({type: 'updateAttachment', id: inactive, x: -28, y: 17, rotation: inactiveRotation, scaleX: 1, scaleY: 1});
  await edit({type: 'setActiveAttachment', slot, attachment: active});
  const region = (snapshot: ProjectSummary, id: number) =>
    snapshot.slots.find(item => item.id === slot)!.attachments!.find(item => item.id === id)!.region!;
  return {child, slot, active, inactive, region};
}

async function arm(button: Locator, value: boolean) {
  if (await button.getAttribute('aria-pressed') !== String(value)) await button.press('Space');
  await expect(button).toHaveAttribute('aria-pressed', String(value));
}

function expectApplied(button: Locator, applied: boolean) {
  return applied ? expect(button).toHaveAttribute('data-compensation-applied', 'true')
    : expect(button).not.toHaveAttribute('data-compensation-applied', 'true');
}

test('@native Setup translation keeps child bones and Region artwork according to the two compensation controls', async ({page, native}, info) => {
  await page.setViewportSize({width: 1260, height: 850});
  const initial = await native.invoke<ProjectSummary>('create_project', {name: 'Own Setup compensation', discardChanges: true});
  const root = initial.bones[0]!;
  const project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: initial.revision,
    edit: {...root, type: 'update', x: 8, y: 4, rotation: 90}});
  const {child, active, inactive, region} = await addCompensationDependents(native, project, root.id);
  const bone = (snapshot: ProjectSummary, id: number) => snapshot.bones.find(item => item.id === id)!;

  await openNativeEditor(page);
  const treeItem = (kind: string, id: number) =>
    page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const editModes = page.getByRole('group', {name: 'Editing mode', exact: true});
  const selectBone = async () => {
    await editModes.getByRole('button', {name: 'Bones', exact: true}).click();
    await treeItem('bone', root.id).click();
    await page.getByTestId('bone-axes-world').press('Space');
    await expect(page.getByTestId('bone-axes-world')).toHaveAttribute('aria-pressed', 'true');
  };
  await selectBone();
  const canvas = page.getByTestId('viewport').locator('canvas');
  const bonesToggle = page.getByTestId('viewport-compensate-bones');
  const imagesToggle = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const childTag = page.getByTestId(`viewport-name-tag-bones-${child}`);
  const imageTag = page.getByTestId(`viewport-name-tag-images-${active}`);
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  await expect(bonesToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(imagesToggle).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('viewport-names-bones').press('Space');
  await page.getByTestId('viewport-names-images').press('Space');
  await expect(childTag).toBeVisible();
  await expect(imageTag).toBeVisible();

  function editsSince(start: number) {
    return native.calls.slice(start).filter(call => call.command === 'edit_rig');
  }
  const dx = 16, dy = -11;
  async function beginDrag(x: number, y: number) {
    const box = (await canvas.boundingBox())!;
    const from = {x: box.x + box.width / 2 + x, y: box.y + box.height / 2 - y};
    await page.mouse.move(from.x, from.y);
    await expect(canvas).toHaveCSS('cursor', 'move');
    await page.mouse.down();
    await page.mouse.move(from.x + dx, from.y - dy, {steps: 4});
  }
  async function expectTravel(tag: Locator, origin: {x: number; y: number}, moved: boolean) {
    await expect.poll(async () => (await tagPosition(tag)).x - origin.x).toBeCloseTo(moved ? dx : 0, 2);
    await expect.poll(async () => (await tagPosition(tag)).y - origin.y).toBeCloseTo(moved ? -dy : 0, 2);
  }

  const profiles: Layers[] = [{bones: false, images: false}, {bones: true, images: false},
    {bones: false, images: true}, {bones: true, images: true}];
  for (const layers of profiles) {
    await expect(status).toBeEmpty();
    const before = (await native.snapshot())!;
    const start = native.calls.length;
    const childStart = await tagPosition(childTag), imageStart = await tagPosition(imageTag);
    await arm(bonesToggle, layers.bones);
    await arm(imagesToggle, layers.images);
    expect(await native.snapshot()).toEqual(before);
    await beginDrag(8, 4);
    await expectTravel(childTag, childStart, !layers.bones);
    await expectTravel(imageTag, imageStart, !layers.images);
    expect(await native.snapshot()).toEqual(before);
    expect(editsSince(start)).toHaveLength(0);
    await page.mouse.up();
    if (layers.bones || layers.images) {
      const text = layers.bones && layers.images ? 'Kept child bones and attachments in place.'
        : layers.bones ? 'Kept child bones in place.' : 'Kept attachments in place.';
      await Promise.all([
        expect(status).toHaveText(text),
        expectApplied(bonesToggle, layers.bones),
        expectApplied(imagesToggle, layers.images),
      ]);
    } else {
      await expect(status).toBeEmpty();
    }
    await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
    const after = (await native.snapshot())!;
    expect(bone(after, root.id)).toMatchObject({x: 8 + dx, y: 4 + dy, rotation: 90});
    expect(bone(after, child)).toMatchObject({x: 20 + (layers.bones ? -dy : 0), y: 18 + (layers.bones ? dx : 0), rotation: -20});
    for (const id of [active, inactive]) {
      const previous = region(before, id);
      expect(region(after, id)).toMatchObject({...previous,
        x: previous.x + (layers.images ? -dy : 0), y: previous.y + (layers.images ? dx : 0)});
    }
    expect(editsSince(start)).toHaveLength(1);
    if (layers.bones || layers.images) {
      expect(editsSince(start)[0]?.args.edit).toMatchObject({type: 'translateBoneWithCompensation', id: root.id,
        compensateBones: layers.bones, compensateImages: layers.images});
    }
    if (layers.bones && layers.images) {
      await page.screenshot({path: info.outputPath('viewport-compensation.png')});
    }
    await undo.click();
    await expect.poll(async () => (await native.snapshot())!.bones).toEqual(before.bones);
    expect((await native.snapshot())!.slots).toEqual(before.slots);
    await selectBone();
    await expectTravel(childTag, childStart, false);
    await expectTravel(imageTag, imageStart, false);
  }

  await expect(status).toBeEmpty();
  const canceled=(await native.snapshot())!;
  const beginCancel=native.calls.length;
  await beginDrag(8,4);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(editsSince(beginCancel)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(canceled);
  await expect(status).toBeEmpty();

  await editModes.getByRole('button', {name: 'Images', exact: true}).click();
  await treeItem('attachment', active).click();
  await expect(bonesToggle).toBeDisabled();
  await expect(imagesToggle).toBeDisabled();
  await expect(bonesToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(imagesToggle).toHaveAttribute('aria-pressed', 'true');
  const beforeImage = (await native.snapshot())!;
  const imageCalls = native.calls.length;
  await beginDrag(44, 68);
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(beforeImage.revision + 1);
  const afterImage = (await native.snapshot())!;
  expect(region(afterImage, active).x).toBeCloseTo(64 + dy, 4);
  expect(region(afterImage, active).y).toBeCloseTo(-36 - dx, 4);
  expect(region(afterImage, inactive)).toEqual(region(beforeImage, inactive));
  expect(afterImage.bones).toEqual(beforeImage.bones);
  expect(editsSince(imageCalls)).toHaveLength(1);
  await expect(status).toBeEmpty();
  await selectBone();
  await expect(bonesToggle).toBeEnabled();
  await expect(imagesToggle).toBeEnabled();
  await expect(bonesToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(imagesToggle).toHaveAttribute('aria-pressed', 'true');
});

function regionCorners(owner: World, region: RegionView): Point[] {
  const angle = region.rotation * Math.PI / 180;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const x = sx! * region.width * region.scaleX / 2;
    const y = sy! * region.height * region.scaleY / 2;
    const localX = region.x + cosine * x - sine * y;
    const localY = region.y + sine * x + cosine * y;
    return {x: owner.x + owner.a * localX + owner.c * localY, y: owner.y + owner.b * localX + owner.d * localY};
  });
}

async function prepareNumericCompensation(native: NativeSession, name: string, shear?: {shearX: number; shearY: number},
  rotation = 90, childPosition?: Point) {
  const initial = await native.invoke<ProjectSummary>('create_project', {name, discardChanges: true});
  const root = initial.bones[0]!;
  const withParent = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: initial.revision,
    edit: {...root, type: 'update', x: 38, y: -18, rotation: 30, scaleX: -2, scaleY: 3, ...shear}});
  const withMoving = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: withParent.revision,
    edit: {type: 'create', parent: root.id, x: 8, y: 4, rotation, length: 30}});
  const moving = withMoving.editedBone!;
  return {root, moving, ...await addCompensationDependents(native, withMoving, moving, {childPosition})};
}

async function evaluatedBones(native: NativeSession, model: ProjectSummary) {
  const snapshot = await native.invoke<EvaluationSnapshot>('evaluate_project', {expectedRevision: model.revision,
    request: {mode: 'none', time: 0}});
  return (id: number) => snapshot.bones.find(item => item.id === id)!.world;
}

function expectDisplacement(before: Point, after: Point, delta: Point) {
  expect(after.x - before.x).toBeCloseTo(delta.x, 3);
  expect(after.y - before.y).toBeCloseTo(delta.y, 3);
}

test('@native numeric Setup Parent Translate compensates exact child and artwork layers for each switch state', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const {root, moving, child, slot, active, inactive, region} = await prepareNumericCompensation(native, 'Own numeric compensation');
  const bone = (model: ProjectSummary, id: number) => model.bones.find(item => item.id === id)!;
  const editsSince = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);

  await openNativeEditor(page);
  const movingRow = page.locator(`[data-tree-kind="bone"][data-tree-id="${moving}"]`).getByRole('treeitem');
  const tools = page.getByTestId('animation-tools');
  await movingRow.click();
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  const parentAxis = tools.getByTestId('bone-axes-parent');
  await parentAxis.press('Space');
  await expect(parentAxis).toHaveAttribute('aria-pressed', 'true');
  const x = tools.getByTestId('bone-x'), y = tools.getByTestId('bone-y');
  await expect(x).toHaveValue('8');
  await expect(y).toHaveValue('4');
  const bonesToggle = page.getByTestId('viewport-compensate-bones');
  const imagesToggle = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});

  const original = (await native.snapshot())!;
  const canceled = native.calls.length;
  await x.fill('23');
  await x.press('Escape');
  await expect(x).toHaveValue('8');
  expect(editsSince(canceled)).toEqual([]);
  expect(await native.snapshot()).toEqual(original);

  const cases = [
    {bones: false, images: false, axis: 'x', value: -7.25, announcement: ''},
    {bones: true, images: false, axis: 'y', value: 19.25, announcement: 'Kept child bones in place.'},
    {bones: false, images: true, axis: 'x', value: 18.25, announcement: 'Kept attachments in place.'},
    {bones: true, images: true, axis: 'y', value: -2.5, announcement: 'Kept child bones and attachments in place.'},
  ] as const;
  for (const {bones, images, axis, value, announcement} of cases) {
    await expect(status).toBeEmpty();
    await arm(bonesToggle, bones);
    await arm(imagesToggle, images);
    const before = (await native.snapshot())!;
    const beforePose = await evaluatedBones(native, before);
    const parent = beforePose(root.id);
    expect(parent.a * parent.d - parent.b * parent.c).toBeLessThan(0);
    const amount = value - bone(before, moving)[axis];
    const delta = {x: (axis === 'x' ? parent.a : parent.c) * amount,
      y: (axis === 'x' ? parent.b : parent.d) * amount};
    const stay = {x: 0, y: 0};
    const mark = native.calls.length;
    const field = axis === 'x' ? x : y;
    await field.fill(String(value));
    expect(editsSince(mark)).toEqual([]);
    await field.press('Enter');
    await expect(field).not.toBeFocused();
    await Promise.all([expect(status).toHaveText(announcement), expectApplied(bonesToggle, bones), expectApplied(imagesToggle, images)]);
    await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
    const after = (await native.snapshot())!;
    const afterPose = await evaluatedBones(native, after);
    expect(bone(after, moving)).toEqual({...bone(before, moving), [axis]: value});
    expect(bone(after, root.id)).toEqual(bone(before, root.id));
    expectDisplacement(beforePose(moving), afterPose(moving), delta);
    expectDisplacement(beforePose(child), afterPose(child), bones ? stay : delta);
    for (const id of [active, inactive]) {
      const previous = region(before, id), next = region(after, id);
      expect(next).toEqual({...previous, x: next.x, y: next.y});
      const from = regionCorners(beforePose(moving), previous), to = regionCorners(afterPose(moving), next);
      from.forEach((corner, index) => expectDisplacement(corner, to[index]!, images ? stay : delta));
    }
    expect(after.slots.find(item => item.id === slot)!.activeAttachmentId).toBe(active);
    expect(editsSince(mark)).toEqual([{expectedRevision: before.revision, edit: {
      type: 'setBoneParentPosition', id: moving, [axis]: value,
      ...(bones ? {compensateBones: true} : {}), ...(images ? {compensateImages: true} : {}),
    }}]);
    await undo.click();
    await expect.poll(async () => (await native.snapshot())!.bones).toEqual(before.bones);
    expect((await native.snapshot())!.slots).toEqual(before.slots);
    expect(editsSince(mark).slice(1).map(args => args.edit)).toEqual([{type: 'undo'}]);
    await movingRow.click();
    await expect(parentAxis).toHaveAttribute('aria-pressed', 'true');
  }
});

test('@native Parent Translate keeps the reflected axis while Bones and Images compensation are armed', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const {root, moving, child, active, inactive, region} = await prepareNumericCompensation(
    native, 'Own armed Parent Translate', {shearX: 10, shearY: -15},
  );
  await openNativeEditor(page);
  const movingRow = page.locator(`[data-tree-kind="bone"][data-tree-id="${moving}"]`).getByRole('treeitem');
  await movingRow.click();
  const tools = page.getByTestId('animation-tools');
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  const parent = tools.getByTestId('bone-axes-parent');
  const world = tools.getByTestId('bone-axes-world');
  const local = tools.getByTestId('bone-axes-local');
  const x = tools.getByTestId('bone-x'), y = tools.getByTestId('bone-y');
  const bonesToggle = page.getByTestId('viewport-compensate-bones');
  const imagesToggle = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const read = async () => (await native.snapshot())!;
  const bone = (model: ProjectSummary) => model.bones.find(item => item.id === moving)!;
  const nativeEdits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);
  const translations = {type: 'setBoneParentPosition', id: moving, compensateBones: true, compensateImages: true};
  const stay = {x: 0, y: 0};

  async function expectFeedback() {
    await Promise.all([expect(status).toHaveText('Kept child bones and attachments in place.'),
      expectApplied(bonesToggle, true), expectApplied(imagesToggle, true)]);
  }
  async function expectFixed(before: ProjectSummary, from: Awaited<ReturnType<typeof evaluatedBones>>, after: ProjectSummary) {
    const to = await evaluatedBones(native, after);
    expectDisplacement(from(child), to(child), stay);
    for (const id of [active, inactive]) {
      const previous = regionCorners(from(moving), region(before, id));
      const current = regionCorners(to(moving), region(after, id));
      previous.forEach((corner, index) => expectDisplacement(corner, current[index]!, stay));
    }
    return to;
  }
  async function undoOnce(before: ProjectSummary, mark: number) {
    await undo.click();
    await expect.poll(async () => (await read()).bones).toEqual(before.bones);
    expect((await read()).slots).toEqual(before.slots);
    expect(nativeEdits(mark).slice(1).map(call => call.edit)).toEqual([{type: 'undo'}]);
    await movingRow.click();
  }

  await parent.press('Space');
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await arm(bonesToggle, true);
  await arm(imagesToggle, true);
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveAccessibleName('Parent X');
  await expect(y).toHaveAccessibleName('Parent Y');
  await expect(world).toBeEnabled();

  const beforeNumeric = await read();
  const beforeNumericPose = await evaluatedBones(native, beforeNumeric);
  const numericMark = native.calls.length;
  await y.fill('19.25');
  await y.press('Enter');
  await expectFeedback();
  await expect.poll(async () => (await read()).revision).toBe(beforeNumeric.revision + 1);
  const afterNumeric = await read();
  expect(bone(afterNumeric)).toEqual({...bone(beforeNumeric), y: 19.25});
  expect(nativeEdits(numericMark)).toEqual([{expectedRevision: beforeNumeric.revision, edit: {...translations, y: 19.25}}]);
  await expectFixed(beforeNumeric, beforeNumericPose, afterNumeric);
  await undoOnce(beforeNumeric, numericMark);
  await parent.press('Space');
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toBeEmpty();

  await page.getByTestId('viewport-names-bones').press('Space');
  await page.getByTestId('viewport-names-images').press('Space');
  const movingTag = page.getByTestId(`viewport-name-tag-bones-${moving}`);
  const childTag = page.getByTestId(`viewport-name-tag-bones-${child}`);
  const imageTag = page.getByTestId(`viewport-name-tag-images-${active}`);
  for (const tag of [movingTag, childTag, imageTag]) await expect(tag).toBeVisible();
  const before = await read();
  const from = await evaluatedBones(native, before);
  const basis = from(root.id);
  expect(basis.a * basis.d - basis.b * basis.c).toBeLessThan(0);
  expect(Math.abs(basis.a * basis.c + basis.b * basis.d)).toBeGreaterThan(1);
  const origin = from(moving);
  const box = (await page.getByTestId('viewport').locator('canvas').boundingBox())!;
  const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
  const length = Math.hypot(basis.a, basis.b);
  const direction = {x: basis.a / length, y: -basis.b / length};
  const start = {
    x: Math.round(box.x + box.width / 2 + origin.x * zoom + 64 * direction.x),
    y: Math.round(box.y + box.height / 2 - origin.y * zoom + 64 * direction.y),
  };
  const drag = {x: Math.round(34 * direction.x - 19 * direction.y), y: Math.round(34 * direction.y + 19 * direction.x)};
  const projection = drag.x * direction.x + drag.y * direction.y;
  const expectedX = Math.fround(bone(before).x + projection / (length * zoom));
  const expectedScreenTravel = {x: projection * direction.x, y: projection * direction.y};
  const baseTags = await Promise.all([movingTag, childTag, imageTag].map(tagPosition));
  async function expectTags(travel: Point) {
    for (const [index, tag] of [movingTag, childTag, imageTag].entries()) {
      const delta = index === 0 ? travel : stay;
      await expect.poll(async () => (await tagPosition(tag)).x - baseTags[index]!.x).toBeCloseTo(delta.x, 2);
      await expect.poll(async () => (await tagPosition(tag)).y - baseTags[index]!.y).toBeCloseTo(delta.y, 2);
    }
  }
  async function holdDrag(mark: number) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + drag.x, start.y + drag.y, {steps: 5});
    await expectTags(expectedScreenTravel);
    await expect(status).toBeEmpty();
    expect(await read()).toEqual(before);
    expect(native.calls.slice(mark).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toEqual([]);
  }
  const canceled = native.calls.length;
  await holdDrag(canceled);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expectTags(stay);
  expect(nativeEdits(canceled)).toEqual([]);
  expect(await read()).toEqual(before);

  const committed = native.calls.length;
  await holdDrag(committed);
  await page.mouse.up();
  await expectFeedback();
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const after = await read();
  const moved = bone(after);
  expect(moved.x).toBeCloseTo(expectedX, 4);
  expect(moved).toEqual({...bone(before), x: moved.x});
  expect(nativeEdits(committed)).toEqual([{expectedRevision: before.revision, edit: {...translations, x: moved.x}}]);
  await expectTags(expectedScreenTravel);
  const to = await expectFixed(before, from, after);
  expectDisplacement(origin, to(moving), {x: projection * direction.x / zoom, y: -projection * direction.y / zoom});
  await undoOnce(before, committed);
  await expectTags(stay);

  const switchStart = native.calls.length;
  await arm(bonesToggle, false);
  await arm(imagesToggle, false);
  await world.press('Space');
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await arm(bonesToggle, true);
  await expect(world).toBeEnabled();
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await expect(local).toHaveAttribute('aria-pressed', 'false');
  await arm(bonesToggle, false);
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  expect(nativeEdits(switchStart)).toEqual([]);
});

test('@native World Translate commits one precise axis with armed compensation and cancels a world-aligned preview', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const {moving, child, active, inactive, region} = await prepareNumericCompensation(
    native, 'Own armed World Translate', {shearX: 10, shearY: -15},
  );
  await openNativeEditor(page);
  const movingRow = page.locator(`[data-tree-kind="bone"][data-tree-id="${moving}"]`).getByRole('treeitem');
  await movingRow.click();
  const tools = page.getByTestId('animation-tools');
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  const world = tools.getByTestId('bone-axes-world');
  const x = tools.getByTestId('bone-x'), y = tools.getByTestId('bone-y');
  const bonesToggle = page.getByTestId('viewport-compensate-bones');
  const imagesToggle = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const read = async () => (await native.snapshot())!;
  const edits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);
  await world.press('Space');
  await arm(bonesToggle, true);
  await arm(imagesToggle, true);
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveAccessibleName('World X');
  await expect(y).toHaveAccessibleName('World Y');

  // Independent projection of authored (8, 4) through the two columns of
  // the rotated, reflected and sheared parent from prepareNumericCompensation.
  const xAngle = 40 * Math.PI / 180, yAngle = 105 * Math.PI / 180;
  const worldX = 38 - 16 * Math.cos(xAngle) + 12 * Math.cos(yAngle);
  const worldY = -18 - 16 * Math.sin(xAngle) + 12 * Math.sin(yAngle);
  await x.focus();
  const originalX = await x.inputValue();
  expect(Number(originalX)).toBeCloseTo(worldX, 10);
  expect(Number(await y.inputValue())).toBeCloseTo(worldY, 10);
  const before = await read();
  const noEditStart = native.calls.length;
  await x.fill(originalX);
  await x.press('Enter');
  await x.fill('45');
  await x.press('Escape');
  await expect(x).toHaveValue(originalX);
  expect(edits(noEditStart)).toEqual([]);
  expect(await read()).toEqual(before);

  const beforePose = await evaluatedBones(native, before);
  const mark = native.calls.length;
  const position = 32.875123456789;
  await x.fill(String(position));
  await x.press('Enter');
  await expect(x).not.toBeFocused();
  await Promise.all([expect(status).toHaveText('Kept child bones and attachments in place.'),
    expectApplied(bonesToggle, true), expectApplied(imagesToggle, true)]);
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const after = await read();
  const afterPose = await evaluatedBones(native, after);
  expect(afterPose(moving).x).toBeCloseTo(position, 3);
  expect(afterPose(moving).y).toBeCloseTo(worldY, 3);
  const fixed = {x: 0, y: 0};
  expectDisplacement(beforePose(child), afterPose(child), fixed);
  for (const id of [active, inactive]) {
    const previous = regionCorners(beforePose(moving), region(before, id));
    const current = regionCorners(afterPose(moving), region(after, id));
    previous.forEach((point, index) => expectDisplacement(point, current[index]!, fixed));
  }
  expect(edits(mark)).toEqual([{expectedRevision: before.revision, edit: {
    type: 'setBoneWorldPosition', id: moving, axis: 'x', position, compensateBones: true, compensateImages: true,
  }}]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read()).bones).toEqual(before.bones);
  expect((await read()).slots).toEqual(before.slots);
  expect(edits(mark).slice(1).map(call => call.edit)).toEqual([{type: 'undo'}]);

  await movingRow.click();
  await world.press('Space');
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toBeEmpty();
  await page.getByTestId('viewport-names-bones').press('Space');
  await page.getByTestId('viewport-names-images').press('Space');
  const tags = [page.getByTestId(`viewport-name-tag-bones-${moving}`), page.getByTestId(`viewport-name-tag-bones-${child}`),
    page.getByTestId(`viewport-name-tag-images-${active}`)];
  for (const tag of tags) await expect(tag).toBeVisible();
  const startTags = await Promise.all(tags.map(tagPosition));
  const canvas = page.getByTestId('viewport').locator('canvas');
  const box = (await canvas.boundingBox())!;
  const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
  const start = {x: Math.round(box.x + box.width / 2 + worldX * zoom + 64),
    y: Math.round(box.y + box.height / 2 - worldY * zoom)};
  const beforeDrag = await read();
  const dragMark = native.calls.length;
  await page.mouse.move(start.x, start.y);
  await expect(canvas).toHaveCSS('cursor', 'ew-resize');
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y + 18, {steps: 5});
  for (const [index, tag] of tags.entries()) {
    await expect.poll(async () => (await tagPosition(tag)).x - startTags[index]!.x).toBeCloseTo(index === 0 ? 30 : 0, 2);
    await expect.poll(async () => (await tagPosition(tag)).y - startTags[index]!.y).toBeCloseTo(0, 2);
  }
  expect(await read()).toEqual(beforeDrag);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(() => Promise.all(tags.map(tagPosition))).toEqual(startTags);
  await expect(status).toBeEmpty();
  expect(await read()).toEqual(beforeDrag);
  expect(native.calls.slice(dragMark).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toEqual([]);
});

test('@native Rotate compensates the complete child and Region poses during pointer and numeric edits', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const initial = await native.invoke<ProjectSummary>('create_project', {name: 'Own Rotate compensation', discardChanges: true});
  const root = initial.bones[0]!;
  const owner = {x: 8, y: 4, length: 36};
  const setup = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: initial.revision,
    edit: {...root, ...owner, type: 'update', rotation: 0, scaleX: 1, scaleY: 1}});
  const {child, active, inactive, region} = await addCompensationDependents(native, setup, root.id, {childPosition: {x: 40, y: 75}});
  await openNativeEditor(page);
  const treeRow = page.locator(`[data-tree-kind="bone"][data-tree-id="${root.id}"]`).getByRole('treeitem');
  const tools = page.getByTestId('animation-tools');
  const rotateTool = tools.getByRole('button', {name: 'Rotate', exact: true});
  const rotation = tools.getByTestId('bone-rotation');
  const bonesToggle = page.getByTestId('viewport-compensate-bones');
  const imagesToggle = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const read = async () => (await native.snapshot())!;
  const edits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);
  const operation = {type: 'rotateBoneWithCompensation', id: root.id, compensateBones: true, compensateImages: true};
  const stationary = {x: 0, y: 0};
  async function selectRotate() {
    await treeRow.click();
    await rotateTool.click();
    await expect(rotateTool).toHaveAttribute('aria-pressed', 'true');
  }
  async function expectFeedback() {
    await Promise.all([expect(status).toHaveText('Kept child bones and attachments in place.'),
      expectApplied(bonesToggle, true), expectApplied(imagesToggle, true)]);
  }
  async function expectCompensated(before: ProjectSummary, from: Awaited<ReturnType<typeof evaluatedBones>>, angle: number) {
    await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
    const after = await read();
    const to = await evaluatedBones(native, after);
    const selected = after.bones.find(bone => bone.id === root.id)!;
    const prior = before.bones.find(bone => bone.id === root.id)!;
    expect(selected.rotation).toBeCloseTo(angle, 4);
    expect(selected).toMatchObject({x: prior.x, y: prior.y, length: prior.length, parent: prior.parent});
    const theta = angle * Math.PI / 180;
    expect(to(root.id).a).toBeCloseTo(Math.cos(theta), 4);
    expect(to(root.id).b).toBeCloseTo(Math.sin(theta), 4);
    expect(to(root.id).c).toBeCloseTo(-Math.sin(theta), 4);
    expect(to(root.id).d).toBeCloseTo(Math.cos(theta), 4);
    for (const component of ['x', 'y', 'a', 'b', 'c', 'd'] as const) {
      expect(to(child)[component]).toBeCloseTo(from(child)[component], 3);
    }
    for (const id of [active, inactive]) {
      const oldCorners = regionCorners(from(root.id), region(before, id));
      const newCorners = regionCorners(to(root.id), region(after, id));
      oldCorners.forEach((point, index) => expectDisplacement(point, newCorners[index]!, stationary));
    }
  }
  async function undoOnce(before: ProjectSummary, mark: number) {
    await undo.click();
    await expect.poll(async () => (await read()).bones).toEqual(before.bones);
    expect((await read()).slots).toEqual(before.slots);
    expect(edits(mark).slice(1).map(call => call.edit)).toEqual([{type: 'undo'}]);
    await selectRotate();
    await expect(rotation).toHaveValue('0');
  }

  await selectRotate();
  await arm(bonesToggle, true);
  await arm(imagesToggle, true);
  const beforeNumeric = await read();
  const canceledInput = native.calls.length;
  await rotation.fill('');
  await rotation.press('Enter');
  await expect(tools.getByRole('status')).toHaveText('Enter a finite number for this transform.');
  await rotation.press('Escape');
  await rotation.fill('17');
  await rotation.press('Escape');
  await expect(rotation).toHaveValue('0');
  expect(await read()).toEqual(beforeNumeric);
  expect(edits(canceledInput)).toEqual([]);
  const numericPose = await evaluatedBones(native, beforeNumeric);
  const numericMark = native.calls.length;
  await rotation.fill('-31.25');
  await rotation.press('Enter');
  await expectFeedback();
  await expectCompensated(beforeNumeric, numericPose, -31.25);
  expect(edits(numericMark)).toEqual([{expectedRevision: beforeNumeric.revision, edit: {
    ...operation, mode: 'localAbsolute', angle: -31.25,
  }}]);
  await undoOnce(beforeNumeric, numericMark);
  await expect(status).toBeEmpty();

  await page.getByTestId('viewport-names-bones').press('Space');
  await page.getByTestId('viewport-names-images').press('Space');
  const tags = [page.getByTestId(`viewport-name-tag-bones-${root.id}`), page.getByTestId(`viewport-name-tag-bones-${child}`),
    page.getByTestId(`viewport-name-tag-images-${active}`)];
  for (const tag of tags) await expect(tag).toBeVisible();
  const startingTags = await Promise.all(tags.map(tagPosition));
  const canvas = page.getByTestId('viewport').locator('canvas');
  const box = (await canvas.boundingBox())!;
  const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
  const pivot = {x: box.x + box.width / 2 + owner.x * zoom, y: box.y + box.height / 2 - owner.y * zoom};
  const down = {x: Math.round(pivot.x), y: Math.round(pivot.y + 48)};
  const right = {x: Math.round(pivot.x + 48), y: Math.round(pivot.y)};
  const screenAngle = (point: Point) => Math.atan2(pivot.y - point.y, point.x - pivot.x);
  const swept = screenAngle(right) - screenAngle(down);
  const degrees = swept * 180 / Math.PI;
  const halfLength = owner.length * zoom / 2;
  const movedTag = {x: (Math.cos(swept) - 1) * halfLength, y: -Math.sin(swept) * halfLength};
  async function expectTagTravel(travel: Point) {
    for (const [index, tag] of tags.entries()) {
      const delta = index === 0 ? travel : stationary;
      await expect.poll(async () => (await tagPosition(tag)).x - startingTags[index]!.x).toBeCloseTo(delta.x, 2);
      await expect.poll(async () => (await tagPosition(tag)).y - startingTags[index]!.y).toBeCloseTo(delta.y, 2);
    }
  }
  async function startRotation(target: Point) {
    await page.mouse.move(down.x, down.y);
    await expect(canvas).toHaveCSS('cursor', 'grab');
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, {steps: 5});
  }
  const before = await read();
  const pointerPose = await evaluatedBones(native, before);
  const cancelMark = native.calls.length;
  await startRotation(right);
  await expectTagTravel(movedTag);
  expect(await read()).toEqual(before);
  expect(native.calls.slice(cancelMark).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toEqual([]);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expectTagTravel(stationary);
  expect(await read()).toEqual(before);
  expect(edits(cancelMark)).toEqual([]);

  const pointerMark = native.calls.length;
  await startRotation(right);
  await expectTagTravel(movedTag);
  expect(edits(pointerMark)).toEqual([]);
  await page.mouse.up();
  await expectFeedback();
  await expectCompensated(before, pointerPose, degrees);
  expect(edits(pointerMark)).toEqual([{expectedRevision: before.revision, edit: {
    ...operation, mode: 'worldDelta', angle: expect.closeTo(degrees, 4),
  }}]);
  await undoOnce(before, pointerMark);
  await expectTagTravel(stationary);

  const scaleX = tools.getByTestId('bone-scaleX');
  await scaleX.fill('2');
  await scaleX.press('Enter');
  await expect.poll(async () => (await read()).bones.find(bone => bone.id === root.id)?.scaleX).toBe(2);
  await expect(status).toBeEmpty();
  const unsupported = await read();
  const unsupportedMark = native.calls.length;
  const diagonal = {x: Math.round(pivot.x + 34), y: Math.round(pivot.y + 34)};
  await startRotation(diagonal);
  await page.mouse.up();
  await expect(page.getByRole('alert')).toContainText('This image would require shear to compensate the rotation.');
  expect(edits(unsupportedMark)).toEqual([]);
  expect(await read()).toEqual(unsupported);
});

test('@native Scale compensates a reflected bone through signed input and one projected local-axis drag', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const initial = await native.invoke<ProjectSummary>('create_project', {name: 'Own Scale compensation', discardChanges: true});
  const root = initial.bones[0]!;
  const owner = {x: 8, y: 4, length: 36};
  const setup = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: initial.revision,
    edit: {...root, ...owner, type: 'update', rotation: 0, scaleX: -1, scaleY: 1}});
  const {child, active, inactive, region} = await addCompensationDependents(native, setup, root.id,
    {childPosition: {x: 40, y: 75}, inactiveRotation: 0});
  await openNativeEditor(page);
  const treeRow = page.locator(`[data-tree-kind="bone"][data-tree-id="${root.id}"]`).getByRole('treeitem');
  const tools = page.getByTestId('animation-tools');
  const scaleTool = tools.getByRole('button', {name: 'Scale', exact: true});
  const scaleX = tools.getByTestId('bone-scaleX'), scaleY = tools.getByTestId('bone-scaleY');
  const bonesToggle = page.getByTestId('viewport-compensate-bones');
  const imagesToggle = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const read = async () => (await native.snapshot())!;
  const edits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig');
  const operation = {type: 'scaleBoneWithCompensation', id: root.id, compensateBones: true, compensateImages: true};
  const stationary = {x: 0, y: 0};
  async function selectScale() {
    await treeRow.click();
    await scaleTool.click();
    await expect(scaleTool).toHaveAttribute('aria-pressed', 'true');
    await expect(scaleX).toHaveValue('-1');
    await expect(scaleY).toHaveValue('1');
  }
  async function expectFeedback() {
    await Promise.all([expect(status).toHaveText('Kept child bones and attachments in place.'),
      expectApplied(bonesToggle, true), expectApplied(imagesToggle, true)]);
  }
  async function expectCompensated(before: ProjectSummary, from: Awaited<ReturnType<typeof evaluatedBones>>, x: number) {
    await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
    const after = await read();
    const to = await evaluatedBones(native, after);
    const selected = after.bones.find(bone => bone.id === root.id)!;
    expect(selected.scaleX).toBeCloseTo(x, 5);
    expect(selected).toEqual({...before.bones.find(bone => bone.id === root.id)!, scaleX: selected.scaleX});
    expect(to(root.id).a).toBeCloseTo(x, 5);
    for (const component of ['x', 'y', 'b', 'c', 'd'] as const) {
      expect(to(root.id)[component]).toBeCloseTo(from(root.id)[component], 5);
    }
    for (const component of ['x', 'y', 'a', 'b', 'c', 'd'] as const) {
      expect(to(child)[component]).toBeCloseTo(from(child)[component], 3);
    }
    for (const id of [active, inactive]) {
      const previous = region(before, id), current = region(after, id);
      expect(Math.sign(current.scaleX)).toBe(Math.sign(previous.scaleX * from(root.id).a / x));
      expect(Math.sign(current.scaleY)).toBe(Math.sign(previous.scaleY));
      const beforeCorners = regionCorners(from(root.id), previous);
      const afterCorners = regionCorners(to(root.id), current);
      beforeCorners.forEach((point, index) => expectDisplacement(point, afterCorners[index]!, stationary));
    }
  }
  async function undoOnce(before: ProjectSummary, mark: number) {
    await undo.click();
    await expect.poll(async () => (await read()).bones).toEqual(before.bones);
    expect((await read()).slots).toEqual(before.slots);
    expect(edits(mark).slice(1).map(call => call.args.edit)).toEqual([{type: 'undo'}]);
    await selectScale();
  }

  await selectScale();
  await arm(bonesToggle, true);
  await arm(imagesToggle, true);
  const beforeNumeric = await read();
  const zeroMark = native.calls.length;
  await scaleX.fill('0');
  await scaleX.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Use nonzero finite scales within the supported range.');
  expect(edits(zeroMark).map(call => ({args: call.args, code: call.error?.code}))).toEqual([{
    args: {expectedRevision: beforeNumeric.revision, edit: {...operation, mode: 'localAbsolute', x: 0}}, code: 'InvalidSceneEdit',
  }]);
  expect(await read()).toEqual(beforeNumeric);
  await scaleX.press('Escape');
  await expect(scaleX).toHaveValue('-1');
  expect(edits(zeroMark)).toHaveLength(1);

  const fromNumeric = await evaluatedBones(native, beforeNumeric);
  const numericMark = native.calls.length;
  await scaleX.fill('1.75');
  await scaleX.press('Enter');
  await expectFeedback();
  await expectCompensated(beforeNumeric, fromNumeric, 1.75);
  expect(edits(numericMark).map(call => call.args)).toEqual([{expectedRevision: beforeNumeric.revision, edit: {
    ...operation, mode: 'localAbsolute', x: 1.75,
  }}]);
  await undoOnce(beforeNumeric, numericMark);
  await expect(status).toBeEmpty();

  await page.getByTestId('viewport-names-bones').press('Space');
  await page.getByTestId('viewport-names-images').press('Space');
  const tags = [page.getByTestId(`viewport-name-tag-bones-${root.id}`), page.getByTestId(`viewport-name-tag-bones-${child}`),
    page.getByTestId(`viewport-name-tag-images-${active}`)];
  for (const tag of tags) await expect(tag).toBeVisible();
  const startingTags = await Promise.all(tags.map(tagPosition));
  const canvas = page.getByTestId('viewport').locator('canvas');
  const box = (await canvas.boundingBox())!;
  const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
  const pivot = {x: box.x + box.width / 2 + owner.x * zoom, y: box.y + box.height / 2 - owner.y * zoom};
  const start = {x: Math.round(pivot.x - 64), y: Math.round(pivot.y)};
  const end = {x: start.x - 32, y: start.y + 18};
  const factor = (pivot.x - end.x) / (pivot.x - start.x);
  const previewTravel = (1 - factor) * owner.length * zoom / 2;
  async function expectTagTravel(travel: number) {
    for (const [index, tag] of tags.entries()) {
      await expect.poll(async () => (await tagPosition(tag)).x - startingTags[index]!.x).toBeCloseTo(index === 0 ? travel : 0, 2);
      await expect.poll(async () => (await tagPosition(tag)).y - startingTags[index]!.y).toBeCloseTo(0, 2);
    }
  }
  const before = await read();
  const pointerPose = await evaluatedBones(native, before);
  async function holdScale(mark: number) {
    await page.mouse.move(start.x, start.y);
    await expect(canvas).toHaveCSS('cursor', 'ew-resize');
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, {steps: 5});
    await expectTagTravel(previewTravel);
    await expect(status).toBeEmpty();
    expect(await read()).toEqual(before);
    expect(native.calls.slice(mark).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toEqual([]);
  }
  const canceled = native.calls.length;
  await holdScale(canceled);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expectTagTravel(0);
  expect(await read()).toEqual(before);
  expect(edits(canceled)).toEqual([]);

  const pointerMark = native.calls.length;
  await holdScale(pointerMark);
  await page.mouse.up();
  await expectFeedback();
  await expectCompensated(before, pointerPose, -factor);
  expect(edits(pointerMark).map(call => call.args)).toEqual([{expectedRevision: before.revision, edit: {
    ...operation, mode: 'localFactor', x: expect.closeTo(factor, 5),
  }}]);
  await undoOnce(before, pointerMark);
  await expectTagTravel(0);
});

test('@native Shear compensates child and weighted Mesh poses for a local field and a world-axis gesture', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const initial = await native.invoke<ProjectSummary>('create_project', {name: 'Own Shear compensation', discardChanges: true});
  const parent = initial.bones[0]!;
  const wide = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: initial.revision,
    edit: {...parent, type: 'update', scaleX: 2, scaleY: 1}});
  const owner = {x: 8, y: 4, length: 36};
  const selected = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: wide.revision,
    edit: {type: 'create', parent: parent.id, ...owner, rotation: 0}});
  const moving = selected.editedBone!;
  const {child, slot, active, inactive} = await addCompensationDependents(native, selected, moving, {childPosition: {x: 40, y: 75}});
  const read = async () => (await native.snapshot())!;
  let project = await read();
  for (const id of [active, inactive]) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision,
      edit: {type: 'attachmentEdit', id, edit: {type: 'convertMesh', id: slot}}});
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision,
      edit: {type: 'bindAttachment', id, bones: [moving]}});
  }
  const mesh = (model: ProjectSummary, id: number) =>
    model.slots.find(item => item.id === slot)!.attachments!.find(item => item.id === id)!.mesh!;
  function worldPoints(model: ProjectSummary, id: number, transform: World): Point[] {
    const binding = mesh(model, id);
    expect(binding.bones).toEqual([moving]);
    return binding.vertices.map(({positions: [x, y], weights}) => {
      expect(weights).toEqual([1]);
      return {x: transform.x + transform.a * x! + transform.c * y!, y: transform.y + transform.b * x! + transform.d * y!};
    });
  }

  await openNativeEditor(page);
  const row = page.locator(`[data-tree-kind="bone"][data-tree-id="${moving}"]`).getByRole('treeitem');
  const tools = page.getByTestId('animation-tools');
  const shearTool = tools.getByRole('button', {name: 'Shear', exact: true});
  const shearX = tools.getByTestId('bone-shearX'), shearY = tools.getByTestId('bone-shearY');
  const bonesToggle = page.getByTestId('viewport-compensate-bones');
  const imagesToggle = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const edits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);
  const operation = {type: 'shearBoneWithCompensation', id: moving, compensateBones: true, compensateImages: true};
  async function selectShear() {
    await row.click();
    await shearTool.click();
    await expect(shearTool).toHaveAttribute('aria-pressed', 'true');
    await expect(shearX).toHaveValue('0');
    await expect(shearY).toHaveValue('0');
  }
  async function expectFeedback() {
    await Promise.all([expect(status).toHaveText('Kept child bones and attachments in place.'),
      expectApplied(bonesToggle, true), expectApplied(imagesToggle, true)]);
  }
  async function expectCompensated(before: ProjectSummary, from: Awaited<ReturnType<typeof evaluatedBones>>) {
    await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
    const after = await read();
    const to = await evaluatedBones(native, after);
    expectDisplacement(from(moving), to(moving), {x: 0, y: 0});
    for (const component of ['x', 'y', 'a', 'b', 'c', 'd'] as const) {
      expect(to(child)[component]).toBeCloseTo(from(child)[component], 3);
    }
    for (const id of [active, inactive]) {
      const original = worldPoints(before, id, from(moving)), changed = worldPoints(after, id, to(moving));
      expect(changed).toHaveLength(original.length);
      original.forEach((point, index) => expectDisplacement(point, changed[index]!, {x: 0, y: 0}));
    }
    expect(after.slots.find(item => item.id === slot)!.activeAttachmentId).toBe(active);
    return to(moving);
  }
  async function undoOnce(before: ProjectSummary, mark: number) {
    await undo.click();
    await expect.poll(async () => (await read()).bones).toEqual(before.bones);
    expect((await read()).slots).toEqual(before.slots);
    expect(edits(mark).slice(1).map(call => call.edit)).toEqual([{type: 'undo'}]);
    await selectShear();
  }

  await selectShear();
  await arm(bonesToggle, true);
  await arm(imagesToggle, true);
  const beforeNumeric = await read();
  const canceledInput = native.calls.length;
  await shearY.fill('-10');
  await shearY.press('Escape');
  await expect(shearY).toHaveValue('0');
  expect(await read()).toEqual(beforeNumeric);
  expect(edits(canceledInput)).toEqual([]);
  const fromNumeric = await evaluatedBones(native, beforeNumeric);
  const numericMark = native.calls.length;
  const localAngle = 15.25;
  await shearY.fill(String(localAngle));
  await shearY.press('Enter');
  await expectFeedback();
  const local = await expectCompensated(beforeNumeric, fromNumeric);
  const localTheta = localAngle * Math.PI / 180;
  expect(local.a).toBeCloseTo(2, 4);
  expect(local.b).toBeCloseTo(0, 4);
  expect(local.c).toBeCloseTo(-2 * Math.sin(localTheta), 4);
  expect(local.d).toBeCloseTo(Math.cos(localTheta), 4);
  expect(edits(numericMark)).toEqual([{expectedRevision: beforeNumeric.revision, edit: {
    ...operation, mode: 'localAbsolute', axis: 'y', angle: localAngle,
  }}]);
  await undoOnce(beforeNumeric, numericMark);
  await expect(status).toBeEmpty();

  await page.getByTestId('viewport-names-bones').press('Space');
  await page.getByTestId('viewport-names-images').press('Space');
  const tags = [page.getByTestId(`viewport-name-tag-bones-${moving}`), page.getByTestId(`viewport-name-tag-bones-${child}`),
    page.getByTestId(`viewport-name-tag-images-${active}`)];
  for (const tag of tags) await expect(tag).toBeVisible();
  const startingTags = await Promise.all(tags.map(tagPosition));
  const canvas = page.getByTestId('viewport').locator('canvas');
  const box = (await canvas.boundingBox())!;
  const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
  const pivot = {x: box.x + box.width / 2 + 2 * owner.x * zoom, y: box.y + box.height / 2 - owner.y * zoom};
  const start = {x: Math.round(pivot.x + 64), y: Math.round(pivot.y)};
  const end = {x: Math.round(pivot.x + 56), y: Math.round(pivot.y - 32)};
  const angle = (point: Point) => Math.atan2(pivot.y - point.y, point.x - pivot.x);
  const worldAngle = Math.fround((angle(end) - angle(start)) * 180 / Math.PI);
  const worldTheta = worldAngle * Math.PI / 180;
  const travel = {x: (Math.cos(worldTheta) - 1) * owner.length * zoom, y: -Math.sin(worldTheta) * owner.length * zoom};
  const before = await read();
  const from = await evaluatedBones(native, before);
  async function holdShear(mark: number) {
    await page.mouse.move(start.x, start.y);
    await expect(canvas).toHaveCSS('cursor', 'ns-resize');
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, {steps: 5});
    for (const [index, tag] of tags.entries()) {
      await expect.poll(async () => (await tagPosition(tag)).x - startingTags[index]!.x).toBeCloseTo(index === 0 ? travel.x : 0, 2);
      await expect.poll(async () => (await tagPosition(tag)).y - startingTags[index]!.y).toBeCloseTo(index === 0 ? travel.y : 0, 2);
    }
    await expect(status).toBeEmpty();
    expect(await read()).toEqual(before);
    expect(native.calls.slice(mark).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toEqual([]);
  }
  const canceled = native.calls.length;
  await holdShear(canceled);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(() => Promise.all(tags.map(tagPosition))).toEqual(startingTags);
  expect(await read()).toEqual(before);
  expect(edits(canceled)).toEqual([]);

  const pointer = native.calls.length;
  await holdShear(pointer);
  await page.mouse.up();
  await expectFeedback();
  const world = await expectCompensated(before, from);
  expect(world.a).toBeCloseTo(2 * Math.cos(worldTheta), 4);
  expect(world.b).toBeCloseTo(2 * Math.sin(worldTheta), 4);
  expect(world.c).toBeCloseTo(0, 4);
  expect(world.d).toBeCloseTo(1, 4);
  expect(edits(pointer)).toEqual([{expectedRevision: before.revision, edit: {
    ...operation, mode: 'worldDelta', axis: 'x', angle: expect.closeTo(worldAngle, 4),
  }}]);
  await undoOnce(before, pointer);
  await expect.poll(() => Promise.all(tags.map(tagPosition))).toEqual(startingTags);
});

test('@native Setup Rotate remembers its axis mode and commits one precise world heading with Bones compensation', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const authored = -17.125;
  const {root, moving, child} = await prepareNumericCompensation(
    native, 'Own Rotate numeric axes', {shearX: 10, shearY: -15}, authored,
  );
  await openNativeEditor(page);
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${moving}"]`).getByRole('treeitem').click();
  const tools = page.getByTestId('animation-tools');
  const rotate = tools.getByRole('button', {name: 'Rotate', exact: true});
  const translate = tools.getByRole('button', {name: 'Translate', exact: true});
  const local = tools.getByTestId('bone-axes-local');
  const parent = tools.getByTestId('bone-axes-parent');
  const world = tools.getByTestId('bone-axes-world');
  const rotation = tools.getByTestId('bone-rotation');
  const bones = page.getByTestId('viewport-compensate-bones');
  const images = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const read = async () => (await native.snapshot())!;
  const edits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);
  const before = await read();
  const untouched = native.calls.length;

  await translate.click();
  await parent.press('Space');
  await expect(tools.getByTestId('bone-x')).toHaveAccessibleName('Parent X');
  await rotate.click();
  await expect(local).toHaveAttribute('aria-pressed', 'true');
  await expect(rotation).toHaveValue(String(authored));
  await parent.press('Space');
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await expect(rotation).toHaveAccessibleName('rotation');
  await expect(rotation).toHaveValue(String(authored));
  await world.press('Space');
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await expect(rotation).toHaveAccessibleName('World rotation');

  // The selected X column combines both columns of the reflected/sheared parent.
  const radians = Math.PI / 180;
  const angle = authored * radians;
  const a = -2 * Math.cos(40 * radians) * Math.cos(angle) + 3 * Math.cos(105 * radians) * Math.sin(angle);
  const b = -2 * Math.sin(40 * radians) * Math.cos(angle) + 3 * Math.sin(105 * radians) * Math.sin(angle);
  const heading = (Math.atan2(b, a) / radians + 360) % 360;
  await rotation.focus();
  const displayed = await rotation.inputValue();
  expect(Number(displayed)).toBeCloseTo(heading, 10);
  await rotation.fill(String(Number(displayed) + 360));
  await rotation.press('Enter');
  await expect(rotation).toHaveValue(displayed);
  await rotation.fill('77');
  await rotation.press('Escape');
  await expect(rotation).toHaveValue(displayed);

  await translate.click();
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await expect(tools.getByTestId('bone-x')).toHaveAccessibleName('Parent X');
  await rotate.click();
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await expect(rotation).toHaveValue(displayed);
  await page.getByTestId('editor-mode-animate').click();
  await expect(world).toBeDisabled();
  await expect(parent).toBeDisabled();
  await expect(local).toHaveAttribute('aria-pressed', 'true');
  await expect(tools.getByTestId('animate-bone-rotation')).toHaveValue(String(authored));
  await page.getByTestId('editor-mode-setup').click();
  await rotate.click();
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await expect(rotation).toHaveValue(displayed);
  expect(edits(untouched)).toEqual([]);
  expect(await read()).toEqual(before);

  await arm(bones, true);
  await expect(images).toHaveAttribute('aria-pressed', 'false');
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  const from = await evaluatedBones(native, before);
  const marked = native.calls.length;
  const target = 34.125123456789;
  await rotation.fill(String(target));
  await rotation.press('Enter');
  await expect(rotation).not.toBeFocused();
  await Promise.all([expect(status).toHaveText('Kept child bones in place.'), expectApplied(bones, true), expectApplied(images, false)]);
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  const after = await read();
  const to = await evaluatedBones(native, after);
  expectDisplacement(from(moving), to(moving), {x: 0, y: 0});
  expect(Math.atan2(to(moving).b, to(moving).a) / radians).toBeCloseTo(target, 4);
  const difference = (target - heading) * radians;
  for (const [first, second] of [['a', 'b'], ['c', 'd']] as const) {
    expect(to(moving)[first]).toBeCloseTo(from(moving)[first] * Math.cos(difference) - from(moving)[second] * Math.sin(difference), 3);
    expect(to(moving)[second]).toBeCloseTo(from(moving)[first] * Math.sin(difference) + from(moving)[second] * Math.cos(difference), 3);
  }
  for (const component of ['x', 'y', 'a', 'b', 'c', 'd'] as const) {
    expect(to(child)[component]).toBeCloseTo(from(child)[component], 3);
  }
  expect(after.bones.find(bone => bone.id === root.id)).toEqual(before.bones.find(bone => bone.id === root.id));
  expect(after.slots).toEqual(before.slots);
  expect(edits(marked)).toEqual([{expectedRevision: before.revision, edit: {
    type: 'setBoneWorldRotation', id: moving, angle: target, compensateBones: true,
  }}]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read()).bones).toEqual(before.bones);
  expect((await read()).slots).toEqual(before.slots);
  expect(edits(marked).slice(1).map(call => call.edit)).toEqual([{type: 'undo'}]);
});

test('@native Setup Scale shows a signed world readout and edits only the focused local scale', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Scale numeric axes', discardChanges: true});
  const root = project.bones[0]!;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({...root, type: 'update', rotation: 0, scaleX: -2, scaleY: 3});
  await edit({type: 'create', parent: root.id, x: 8, y: 4, rotation: 30, length: 30});
  const moving = project.editedBone!;
  await edit({...project.bones.find(bone => bone.id === moving)!, type: 'update', scaleX: -.5, scaleY: 2});
  await edit({type: 'create', parent: moving, x: 14, y: -9, rotation: 27, length: 26});
  const child = project.editedBone!;

  await openNativeEditor(page);
  const row = page.locator(`[data-tree-kind="bone"][data-tree-id="${moving}"]`).getByRole('treeitem');
  await row.click();
  const tools = page.getByTestId('animation-tools');
  const scale = tools.getByRole('button', {name: 'Scale', exact: true});
  const translate = tools.getByRole('button', {name: 'Translate', exact: true});
  const local = tools.getByTestId('bone-axes-local');
  const parent = tools.getByTestId('bone-axes-parent');
  const world = tools.getByTestId('bone-axes-world');
  const x = tools.getByTestId('bone-scaleX'), y = tools.getByTestId('bone-scaleY');
  const readoutX = tools.getByTestId('world-scale-x-readout'), readoutY = tools.getByTestId('world-scale-y-readout');
  const bones = page.getByTestId('viewport-compensate-bones');
  const images = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const read = async () => (await native.snapshot())!;
  const getBone = (model: ProjectSummary) => model.bones.find(bone => bone.id === moving)!;
  const edits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);
  const expectedWorldX = -Math.sqrt(21) / 4, expectedWorldY = Math.sqrt(31);
  async function expectWorldReadout(scaleX: number, scaleY: number) {
    await expect(world).toHaveAttribute('aria-pressed', 'true');
    await expect(readoutX).toBeVisible();
    await expect(readoutY).toBeVisible();
    expect(Number(await readoutX.innerText())).toBeCloseTo(scaleX, 4);
    expect(Number(await readoutY.innerText())).toBeCloseTo(scaleY, 4);
  }
  async function undoOnce(before: ProjectSummary, mark: number) {
    await undo.click();
    await expect.poll(async () => (await read()).bones).toEqual(before.bones);
    expect(edits(mark).slice(1).map(call => call.edit)).toEqual([{type: 'undo'}]);
    await row.click();
    await scale.click();
    await expectWorldReadout(expectedWorldX, expectedWorldY);
  }

  const before = await read();
  const untouched = native.calls.length;
  await translate.click();
  await parent.press('Space');
  await expect(tools.getByTestId('bone-x')).toHaveAccessibleName('Parent X');
  await scale.click();
  await expect(local).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveValue('-0.5');
  await expect(y).toHaveValue('2');
  await parent.press('Space');
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveValue('-0.5');
  await expect(y).toHaveValue('2');
  await expect(readoutX).toHaveCount(0);
  await world.press('Space');
  await expectWorldReadout(expectedWorldX, expectedWorldY);

  await x.focus();
  await expect(x).toHaveAccessibleName('Local scale X');
  await expect(x).toHaveAccessibleDescription(/^World scale X is -1\.14564\d*\. Edit the local value\. Use \+5 to add, \+-5 to subtract, \*2 to multiply, or \/2 to divide\.$/);
  await expect(x).toHaveValue('-0.5');
  await expect(readoutX).not.toBeVisible();
  await expect(local).toHaveAttribute('data-scale-local-editing', 'scaleX');
  await expect(local).toHaveAttribute('aria-pressed', 'false');
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await x.blur();
  await expectWorldReadout(expectedWorldX, expectedWorldY);
  await y.fill('3');
  await expect(y).toHaveAccessibleName('Local scale Y');
  await expect(local).toHaveAttribute('data-scale-local-editing', 'scaleY');
  await y.press('Escape');
  await expect(y).toHaveValue('2');
  await expectWorldReadout(expectedWorldX, expectedWorldY);

  await translate.click();
  await expect(parent).toHaveAttribute('aria-pressed', 'true');
  await scale.click();
  await expectWorldReadout(expectedWorldX, expectedWorldY);
  await page.getByTestId('editor-mode-animate').click();
  await expect(world).toBeDisabled();
  await expect(local).toHaveAttribute('aria-pressed', 'true');
  await expect(tools.getByTestId('animate-bone-scaleX')).toHaveValue('-0.5');
  await page.getByTestId('editor-mode-setup').click();
  await scale.click();
  await expectWorldReadout(expectedWorldX, expectedWorldY);
  expect(await read()).toEqual(before);
  expect(edits(untouched)).toEqual([]);

  const unarmed = native.calls.length;
  await y.fill('2.5');
  await y.press('Enter');
  await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
  expect(getBone(await read())).toEqual({...getBone(before), scaleY: 2.5});
  expect(edits(unarmed)).toHaveLength(1);
  expect(edits(unarmed)[0]?.edit).toMatchObject({type: 'update', id: moving, scaleX: -.5, scaleY: 2.5});
  await expectWorldReadout(expectedWorldX, 1.25 * expectedWorldY);
  await undoOnce(before, unarmed);

  await arm(bones, true);
  await expect(images).toHaveAttribute('aria-pressed', 'false');
  await expectWorldReadout(expectedWorldX, expectedWorldY);
  const beforeFlip = await read();
  const from = await evaluatedBones(native, beforeFlip);
  const mark = native.calls.length;
  await x.fill('0.5');
  await x.press('Enter');
  await Promise.all([expect(status).toHaveText('Kept child bones in place.'), expectApplied(bones, true), expectApplied(images, false)]);
  await expect.poll(async () => (await read()).revision).toBe(beforeFlip.revision + 1);
  const after = await read();
  const to = await evaluatedBones(native, after);
  expect(getBone(after)).toEqual({...getBone(beforeFlip), scaleX: .5});
  expectDisplacement(from(moving), to(moving), {x: 0, y: 0});
  expect(to(moving).a).toBeCloseTo(-from(moving).a, 5);
  expect(to(moving).b).toBeCloseTo(-from(moving).b, 5);
  expect(to(moving).c).toBeCloseTo(from(moving).c, 5);
  expect(to(moving).d).toBeCloseTo(from(moving).d, 5);
  for (const component of ['x', 'y', 'a', 'b', 'c', 'd'] as const) {
    expect(to(child)[component]).toBeCloseTo(from(child)[component], 3);
  }
  await expectWorldReadout(-expectedWorldX, expectedWorldY);
  expect(edits(mark)).toEqual([{expectedRevision: beforeFlip.revision,
    edit: {type: 'scaleBoneWithCompensation', id: moving, mode: 'localAbsolute', x: .5, compensateBones: true, compensateImages: false},
  }]);
  await undoOnce(beforeFlip, mark);
});

test('@native Setup Local Translate measures signed oblique bone axes and compensates exact numeric and pointer edits', async ({page, native}) => {
  await page.setViewportSize({width: 1260, height: 850});
  const ownerRotation = -17.125;
  const {root, moving, child, active, inactive, region} = await prepareNumericCompensation(
    native, 'Own signed oblique Local Translate', {shearX: 10, shearY: -15}, ownerRotation, {x: 40, y: 75},
  );
  await openNativeEditor(page);
  const row = page.locator(`[data-tree-kind="bone"][data-tree-id="${moving}"]`).getByRole('treeitem');
  await row.click();
  const tools = page.getByTestId('animation-tools');
  await tools.getByRole('button', {name: 'Translate', exact: true}).click();
  const local = tools.getByTestId('bone-axes-local');
  const parent = tools.getByTestId('bone-axes-parent');
  const world = tools.getByTestId('bone-axes-world');
  const x = tools.getByTestId('bone-x'), y = tools.getByTestId('bone-y');
  const bones = page.getByTestId('viewport-compensate-bones');
  const images = page.getByTestId('viewport-compensate-images');
  const status = page.getByTestId('viewport-compensation-status');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const read = async () => (await native.snapshot())!;
  const edits = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'edit_rig').map(call => call.args);
  const operation = {type: 'setBoneLocalPosition', id: moving, compensateBones: true, compensateImages: true};
  const stationary = {x: 0, y: 0};

  // Independently compose the fixture's authored parent columns with the
  // selected bone rotation. The displacement origin is the parent's origin.
  const radians = Math.PI / 180;
  const parentX = {x: -2 * Math.cos(40 * radians), y: -2 * Math.sin(40 * radians)};
  const parentY = {x: 3 * Math.cos(105 * radians), y: 3 * Math.sin(105 * radians)};
  const cos = Math.cos(ownerRotation * radians), sin = Math.sin(ownerRotation * radians);
  function unit(vector: Point): Point {
    const length = Math.hypot(vector.x, vector.y);
    return {x: vector.x / length, y: vector.y / length};
  }
  const axisX = unit({x: parentX.x * cos + parentY.x * sin, y: parentX.y * cos + parentY.y * sin});
  const axisY = unit({x: -parentX.x * sin + parentY.x * cos, y: -parentX.y * sin + parentY.y * cos});
  const det = axisX.x * axisY.y - axisX.y * axisY.x;
  expect(det).toBeLessThan(0);
  expect(Math.abs(axisX.x * axisY.x + axisX.y * axisY.y)).toBeGreaterThan(.4);
  function localCoefficients(displacement: Point): Point {
    return {x: (axisY.y * displacement.x - axisY.x * displacement.y) / det,
      y: (-axisX.y * displacement.x + axisX.x * displacement.y) / det};
  }
  const displacement = {x: 8 * parentX.x + 4 * parentY.x, y: 8 * parentX.y + 4 * parentY.y};
  const origin = {x: 38 + displacement.x, y: -18 + displacement.y};
  const coefficients = localCoefficients(displacement);
  async function expectFields(position: Point, precision = 9) {
    await expect.poll(async () => Number(await x.inputValue())).toBeCloseTo(position.x, precision);
    await expect.poll(async () => Number(await y.inputValue())).toBeCloseTo(position.y, precision);
  }
  async function expectFeedback() {
    await Promise.all([expect(status).toHaveText('Kept child bones and attachments in place.'),
      expectApplied(bones, true), expectApplied(images, true)]);
  }
  async function expectCompensated(before: ProjectSummary, from: Awaited<ReturnType<typeof evaluatedBones>>, target: number) {
    await expect.poll(async () => (await read()).revision).toBe(before.revision + 1);
    const after = await read();
    const to = await evaluatedBones(native, after);
    const distance = target - coefficients.x;
    expectDisplacement(from(moving), to(moving), {x: axisX.x * distance, y: axisX.y * distance});
    const projected = localCoefficients({x: to(moving).x - to(root.id).x, y: to(moving).y - to(root.id).y});
    expect(projected.x).toBeCloseTo(target, 4);
    expect(projected.y).toBeCloseTo(coefficients.y, 4);
    for (const component of ['x', 'y', 'a', 'b', 'c', 'd'] as const) {
      expect(to(child)[component]).toBeCloseTo(from(child)[component], 3);
    }
    for (const id of [active, inactive]) {
      const previous = regionCorners(from(moving), region(before, id));
      const current = regionCorners(to(moving), region(after, id));
      previous.forEach((point, index) => expectDisplacement(point, current[index]!, stationary));
    }
    await expectFields({x: target, y: coefficients.y}, 4);
  }
  async function undoOnce(before: ProjectSummary, mark: number) {
    await undo.click();
    await expect.poll(async () => (await read()).bones).toEqual(before.bones);
    expect((await read()).slots).toEqual(before.slots);
    expect(edits(mark).slice(1).map(call => call.edit)).toEqual([{type: 'undo'}]);
    await row.click();
    await local.press('Space');
    await expectFields(coefficients);
  }

  const beforeNumeric = await read();
  const untouched = native.calls.length;
  await expect(local).toHaveAttribute('aria-pressed', 'true');
  await expect(x).toHaveAccessibleName('Local X');
  await expect(y).toHaveAccessibleName('Local Y');
  await expectFields(coefficients);
  await parent.press('Space');
  await expectFields({x: 8, y: 4});
  await world.press('Space');
  await expectFields(origin);
  await local.press('Space');
  await arm(bones, true);
  await arm(images, true);
  await expect(local).toHaveAttribute('aria-pressed', 'true');
  await x.fill('45');
  await x.press('Escape');
  await expectFields(coefficients);
  expect(await read()).toEqual(beforeNumeric);
  expect(edits(untouched)).toEqual([]);

  const numericFrom = await evaluatedBones(native, beforeNumeric);
  const numericMark = native.calls.length;
  const target = 29.125123456789;
  await x.fill(String(target));
  await x.press('Enter');
  await expect(x).not.toBeFocused();
  await expectFeedback();
  await expectCompensated(beforeNumeric, numericFrom, target);
  expect(edits(numericMark)).toEqual([{expectedRevision: beforeNumeric.revision, edit: {...operation, x: target}}]);
  await undoOnce(beforeNumeric, numericMark);
  await expect(status).toBeEmpty();

  await page.getByTestId('viewport-names-bones').press('Space');
  await page.getByTestId('viewport-names-images').press('Space');
  const tags = [page.getByTestId(`viewport-name-tag-bones-${moving}`), page.getByTestId(`viewport-name-tag-bones-${child}`),
    page.getByTestId(`viewport-name-tag-images-${active}`)];
  for (const tag of tags) await expect(tag).toBeVisible();
  const startingTags = await Promise.all(tags.map(tagPosition));
  const box = (await page.getByTestId('viewport').locator('canvas').boundingBox())!;
  const zoom = Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%', '')) / 100;
  const screen = {x: axisX.x, y: -axisX.y};
  const start = {x: Math.round(box.x + box.width / 2 + origin.x * zoom + 64 * screen.x),
    y: Math.round(box.y + box.height / 2 - origin.y * zoom + 64 * screen.y)};
  const drag = {x: Math.round(28 * screen.x - 15 * screen.y), y: Math.round(28 * screen.y + 15 * screen.x)};
  const projection = drag.x * screen.x + drag.y * screen.y;
  const pointerX = coefficients.x + projection / zoom;
  const travel = {x: projection * screen.x, y: projection * screen.y};
  const before = await read();
  const from = await evaluatedBones(native, before);
  async function holdLocal(mark: number) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + drag.x, start.y + drag.y, {steps: 5});
    for (const [index, tag] of tags.entries()) {
      const delta = index === 0 ? travel : stationary;
      await expect.poll(async () => (await tagPosition(tag)).x - startingTags[index]!.x).toBeCloseTo(delta.x, 2);
      await expect.poll(async () => (await tagPosition(tag)).y - startingTags[index]!.y).toBeCloseTo(delta.y, 2);
    }
    await expect(status).toBeEmpty();
    expect(await read()).toEqual(before);
    expect(native.calls.slice(mark).filter(call => call.command === 'edit_rig' || call.command === 'evaluate_project')).toEqual([]);
  }
  const canceled = native.calls.length;
  await holdLocal(canceled);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(() => Promise.all(tags.map(tagPosition))).toEqual(startingTags);
  expect(await read()).toEqual(before);
  expect(edits(canceled)).toEqual([]);

  const mark = native.calls.length;
  await holdLocal(mark);
  await page.mouse.up();
  await expectFeedback();
  await expectCompensated(before, from, pointerX);
  expect(edits(mark)).toEqual([{expectedRevision: before.revision, edit: {...operation, x: expect.closeTo(pointerX, 8)}}]);
  await undoOnce(before, mark);
  await expect.poll(() => Promise.all(tags.map(tagPosition))).toEqual(startingTags);
});
