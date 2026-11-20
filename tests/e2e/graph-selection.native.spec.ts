import type {Locator, Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

async function openGraphFixture(page: Page, native: NativeSession, includeSlotCurve = false) {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph selection', discardChanges: true});
  const bone = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'createAnimation', name: 'Graph key and handle scope'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'translate', frame: 0, values: [6, 40], curve: 'bezier', controls: [[2, 10, 6, 20], [3, 46, 7, 53]]},
    {bone, channel: 'translate', frame: 10, values: [30, 60], curve: 'bezier', controls: [[12, 32, 16, 37], [13, 63, 17, 67]]},
    {bone, channel: 'translate', frame: 20, values: [40, 70], curve: 'linear'},
    {bone, channel: 'rotate', frame: 2, values: [-20, 0], curve: 'bezier', controls: [[5, -18, 15, -12], [0, 0, 0, 0]]},
    {bone, channel: 'rotate', frame: 18, values: [-10, 0], curve: 'linear'},
    {bone, channel: 'scale', frame: 3, values: [1.1, .7], curve: 'bezier', controls: [[7, 1.3, 17, 1.4], [8, .72, 16, .76]]},
    {bone, channel: 'scale', frame: 23, values: [1.5, .8], curve: 'linear'},
  ]});
  if (includeSlotCurve) {
    await edit({type:'createSlot', bone, name:'Grouped Bézier color'});
    const slot = project.editedSlot!;
    await edit({type:'setAnimationSlotKeys', animation, keys:[
      {slot, channel:'rgba', frame:4, values:[.125, .375, .5, .75], curve:'bezier',
        controls:[[9, .625, 17, .75], [8, .375, 16, .375], [9, .5, 18, .5], [10, .8, 15, .9]]},
      {slot, channel:'rgba', frame:20, values:[.875, .375, .5, 1], curve:'linear'},
    ]});
  }
  const clip = project.animations!.find(item => item.id === animation)!;
  const trackKeys = (channel: 'rotate' | 'translate' | 'scale') => clip.tracks.find(track => track.channel === channel)!.keys;
  const translate = trackKeys('translate'), rotate = trackKeys('rotate'), scale = trackKeys('scale');

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  return {bone, animation, translate, rotate, scale, color:clip.slotTracks?.find(track => track.channel === 'rgba')};
}

test('@native Graph selects a curve then shown keys or handles without editing native keys', async ({page, native}, info) => {
  await page.setViewportSize({width: 1120, height: 820});
  const {bone, translate, rotate, scale} = await openGraphFixture(page, native);
  const timeline = page.getByTestId('animation-timeline');
  const graph = page.getByTestId('timeline-pane-graph');
  const graphTab = page.getByTestId('timeline-tab-graph');
  const sheetTab = page.getByTestId('timeline-tab-dopesheet');
  const current = page.getByTestId('timeline-current');
  const plot = graph.getByTestId('timeline-scroll');
  const curve = (channel: string, component = 0) => graph.getByTestId(`timeline-curve-${bone}:${channel}-${component}`);
  const mark = (id: number, component = 0) => graph.getByTestId(`timeline-graph-key-${id}-${component}`);
  const toggle = (channel: string) => graph.getByTestId(`timeline-graph-visibility-${bone}:${channel}`);
  const handle = (id: number, component: number, control = 0) => graph.getByTestId(`timeline-bezier-${id}-${component}-${control}`);
  const selectedKeys = graph.locator('[data-testid^="timeline-graph-key-"][aria-pressed="true"]');
  const selectedHandles = graph.locator('[data-testid^="timeline-bezier-"][aria-pressed="true"]');
  const copy = page.getByTestId('timeline-copy');
  const paste = page.getByTestId('timeline-paste');
  const deleteKeys = page.getByTestId('timeline-delete-keys');
  const before = await native.snapshot();
  const callsStart = native.calls.length;

  await graphTab.click();
  await current.fill('7');
  await current.press('Enter');
  await expect(current).toHaveValue('7');
  await expect(curve('scale')).toBeVisible();
  await expect(curve('scale', 1)).toBeVisible();
  const layout = await plot.boundingBox();
  await toggle('scale').press('Space');
  await expect(toggle('scale')).toHaveAttribute('aria-pressed', 'false');
  await expect(curve('scale')).toHaveCount(0);
  await toggle('scale').click({button: 'right'});
  await expect(toggle('scale')).toHaveAttribute('aria-pressed', 'true');
  await expect(curve('scale')).toBeVisible();
  await toggle('scale').click({button: 'right'});
  await expect(toggle('scale')).toHaveAttribute('aria-pressed', 'false');
  await expect(curve('scale')).toHaveCount(0);
  await expect(curve('scale', 1)).toHaveCount(0);
  await expect(toggle('translate')).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle('rotate')).toHaveAttribute('aria-pressed', 'true');
  await expect(curve('translate')).toBeVisible();
  await expect(curve('translate', 1)).toBeVisible();
  await expect(curve('rotate')).toBeVisible();
  expect(await plot.boundingBox()).toEqual(layout);

  const firstKey = mark(translate[0]!.id);
  await firstKey.press('Enter');
  await expect(selectedKeys).toHaveCount(2);
  await firstKey.press('Control+a');
  await expect(selectedKeys).toHaveCount(6);
  for (const key of translate) {
    await expect(mark(key.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(mark(key.id, 1)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(mark(rotate[0]!.id)).toHaveAttribute('aria-pressed', 'false');
  await firstKey.press('Control+a');
  await expect(selectedKeys).toHaveCount(8);
  await expect(mark(rotate[1]!.id)).toHaveAttribute('aria-pressed', 'true');
  for (const key of scale) await expect(mark(key.id)).toHaveCount(0);
  await expect(current).toHaveValue('7');

  await sheetTab.click();
  await expect(timeline.getByRole('status').filter({hasText: /selected/})).toHaveText('5 selected');
  await expect(timeline.getByTestId(`timeline-key-${scale[0]!.id}`)).toHaveAttribute('aria-pressed', 'false');
  await graphTab.click();
  await expect(selectedKeys).toHaveCount(8);

  const firstHandle = handle(translate[0]!.id, 0);
  const secondComponent = handle(translate[0]!.id, 1);
  const rotateHandle = handle(rotate[0]!.id, 0);
  const handleBox = (await firstHandle.boundingBox())!;
  const x = handleBox.x + handleBox.width / 2, y = handleBox.y + handleBox.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 1, y);
  await page.mouse.up();
  await expect(firstHandle).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedHandles).toHaveCount(1);
  await expect(selectedKeys).toHaveCount(0);
  await expect(page.getByTestId('timeline-key-inspector')).toHaveCount(0);
  await firstHandle.press('Control+a');
  await expect(selectedHandles).toHaveCount(4);
  for (const key of translate.slice(0, 2)) {
    await expect(handle(key.id, 0, 0)).toHaveAttribute('aria-pressed', 'true');
    await expect(handle(key.id, 0, 1)).toHaveAttribute('aria-pressed', 'true');
  }
  await firstHandle.press('Control+a');
  await expect(selectedHandles).toHaveCount(10);
  await expect(secondComponent).toHaveAttribute('aria-pressed', 'true');
  await expect(rotateHandle).toHaveAttribute('aria-pressed', 'true');
  await expect(handle(scale[0]!.id, 0)).toHaveCount(0);
  await expect(selectedKeys).toHaveCount(0);
  await expect(copy).toBeDisabled();
  await expect(paste).toBeDisabled();
  await expect(deleteKeys).toBeDisabled();
  await firstHandle.press('Control+c');
  await firstHandle.press('Delete');
  await expect(paste).toBeDisabled();
  await expect(current).toHaveValue('7');
  await page.setViewportSize({width: 960, height: 740});
  await page.screenshot({path: info.outputPath('graph-handle-selection.png')});

  await timeline.press('Escape');
  await expect(selectedHandles).toHaveCount(0);
  await expect(selectedKeys).toHaveCount(0);
  await firstKey.press('Enter');
  await firstHandle.press('Enter');
  await expect(firstHandle).toBeFocused();
  await expect(firstHandle).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedKeys).toHaveCount(0);
  await timeline.press('Escape');
  await firstKey.press('Enter');
  await secondComponent.press('Space');
  await expect(secondComponent).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedHandles).toHaveCount(1);
  await expect(selectedKeys).toHaveCount(0);
  await timeline.press('Escape');
  await expect(selectedHandles).toHaveCount(0);
  await expect(current).toHaveValue('7');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(callsStart).filter(call => call.command === 'edit_rig')).toEqual([]);

  await firstKey.press('Enter');
  await secondComponent.press('Enter');
  const handleValue = Number(await secondComponent.getAttribute('data-graph-display-value'));
  const axis = graph.getByTestId('timeline-graph-axis').locator('[data-graph-value]');
  const axisBounds = async () => [Number(await axis.first().getAttribute('data-graph-value')),
    Number(await axis.last().getAttribute('data-graph-value'))] as const;
  const [initialMin, initialMax] = await axisBounds();
  await page.getByTestId('timeline-tool-frame').press('Enter');
  await expect.poll(async () => {
    const [min, max] = await axisBounds();
    return min < handleValue && max > handleValue && max - min < (initialMax - initialMin) / 4;
  }).toBe(true);
  await expect(current).toHaveValue('7');
  expect(await native.snapshot()).toEqual(before);
});

test('@native scrolled stacked Graph box-selects only visible Bézier handles without editing or seeking', async ({page, native}) => {
  await page.setViewportSize({width: 1440, height: 960});
  const {bone, translate, scale} = await openGraphFixture(page, native);
  const timeline = page.getByTestId('animation-timeline');
  const graph = page.getByTestId('timeline-pane-graph');
  const sheet = page.getByTestId('timeline-pane-dopesheet');
  const plot = graph.getByTestId('timeline-scroll');
  const current = page.getByTestId('timeline-current');
  const first = translate[0]!.id, next = translate[1]!.id;
  const key = (id: number) => graph.getByTestId(`timeline-graph-key-${id}-0`);
  const handle = (component: number, control: number) => graph.getByTestId(`timeline-bezier-${first}-${component}-${control}`);
  const selectedHandles = graph.locator('[data-graph-handle-id][aria-pressed="true"]');
  const selectedKeys = graph.locator('[data-timeline-key-id][aria-pressed="true"]');
  const sheetKeys = sheet.locator('[data-timeline-key-id][aria-pressed="true"]');
  const marquee = graph.getByTestId('timeline-marquee');
  const autoFrame = timeline.getByTestId('timeline-tool-auto-fit');

  await timeline.getByTestId('timeline-stack').press('Space');
  await timeline.getByTestId('timeline-tab-graph').click();
  await expect(graph).toHaveAttribute('data-active', 'true');
  await expect(sheet).toBeVisible();
  await current.fill('7');
  await current.press('Enter');
  if (await autoFrame.getAttribute('aria-pressed') === 'true') await autoFrame.press('Space');
  const hideScale = graph.getByTestId(`timeline-graph-visibility-${bone}:scale`);
  if (await hideScale.getAttribute('aria-pressed') === 'true') await hideScale.press('Space');
  await graph.getByTestId('timeline-graph-lead-in').press('Space');
  await timeline.getByTestId('timeline-zoom').press('End');
  const repeat = timeline.getByTestId('timeline-repeat');
  if (await repeat.getAttribute('aria-pressed') !== 'true') await repeat.press('Space');
  const repeats = graph.getByTestId('timeline-graph-repeats');
  await expect(repeats.locator('use').first()).toBeAttached();
  await timeline.getByTestId('timeline-tool-store').press('Space');
  const stored = graph.getByTestId(`timeline-stored-curve-${bone}:translate-0`);
  await expect(stored).toBeVisible();
  const storedPath = await stored.getAttribute('d');
  const before = await native.snapshot();
  const start = native.calls.length;

  type Point = {x:number; y:number};
  async function center(mark: Locator): Promise<Point> {
    const box = (await mark.boundingBox())!;
    return {x:box.x + box.width / 2, y:box.y + box.height / 2};
  }
  async function drag(from: Point, to: Point, modified: boolean, during?: () => Promise<void>) {
    await page.mouse.move(from.x, from.y);
    if (modified) await page.keyboard.down('Control');
    await page.mouse.down();
    try {
      await page.mouse.move(to.x, to.y, {steps:5});
      await expect(marquee).toBeVisible();
      await during?.();
    } finally {
      await page.mouse.up();
      if (modified) await page.keyboard.up('Control');
    }
    await expect(marquee).toBeHidden();
  }

  const ordinary = await center(key(next));
  await drag({x:ordinary.x - 8, y:ordinary.y - 8}, {x:ordinary.x + 8, y:ordinary.y + 8}, false);
  await expect(key(next)).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.getByTestId(`timeline-key-${next}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedHandles).toHaveCount(0);
  await expect(current).toHaveValue('7');
  await key(first).press('Enter');
  const seed = handle(0, 0), incomingX = handle(0, 1), incomingY = handle(1, 1), outgoingY = handle(1, 0);
  await seed.press('Enter');
  await expect(seed).toHaveAttribute('aria-pressed', 'true');

  await plot.evaluate(node => { node.scrollLeft = 24; });
  await expect.poll(() => plot.evaluate(node => node.scrollLeft)).toBe(24);
  const [seedPoint, xIn, yIn, yOut, keyPoint] = await Promise.all([seed, incomingX, incomingY, outgoingY, key(next)].map(center));
  const blank = {x:(seedPoint!.x + xIn!.x) / 2, y:Math.min(xIn!.y, yIn!.y, keyPoint!.y) - 7};
  // The box includes frame 10's key and the unmounted next segment's
  // frame-12 X handle location. Only the rendered incoming handles qualify.
  const end = {x:keyPoint!.x + (xIn!.x - seedPoint!.x) * .625, y:Math.max(xIn!.y, yIn!.y, keyPoint!.y) + 7};
  const expectedThree = [seed, incomingX, incomingY];
  const assertHandles = async (expected: Locator[]) => {
    await expect(selectedHandles).toHaveCount(expected.length);
    for (const mark of expected) await expect(mark).toHaveAttribute('aria-pressed', 'true');
    await expect(selectedKeys).toHaveCount(0);
    await expect(sheetKeys).toHaveCount(0);
  };
  await drag(blank, end, true, () => assertHandles(expectedThree));
  await assertHandles(expectedThree);
  await expect(outgoingY).toHaveAttribute('aria-pressed', 'false');
  await expect(graph.getByTestId(`timeline-bezier-${next}-0-0`)).toHaveCount(0);
  await expect(graph.getByTestId(`timeline-bezier-${scale[0]!.id}-0-0`)).toHaveCount(0);
  await expect(repeats.locator('[data-graph-handle-id], [aria-pressed]')).toHaveCount(0);
  await expect(stored).toHaveAttribute('d', storedPath!);

  const toOutgoingY = {x:yOut!.x - 6, y:yOut!.y - 6};
  const expectedFour = [...expectedThree, outgoingY];
  await drag(keyPoint!, toOutgoingY, true, async () => {
    await assertHandles(expectedFour);
    await page.keyboard.press('Escape');
    await expect(marquee).toBeHidden();
    await assertHandles(expectedThree);
  });
  await assertHandles(expectedThree);
  await drag(xIn!, toOutgoingY, true);
  await assertHandles(expectedFour);

  const ticks = graph.getByTestId('timeline-graph-axis').locator('[data-graph-value]');
  const axis = async () => [Number(await ticks.first().getAttribute('data-graph-value')), Number(await ticks.last().getAttribute('data-graph-value'))] as const;
  const [initialMin, initialMax] = await axis();
  await timeline.getByTestId('timeline-tool-frame').press('Enter');
  await expect.poll(async () => {
    const [min, max] = await axis();
    return min < 10 && max > 53 && max - min < initialMax - initialMin;
  }).toBe(true);
  await assertHandles(expectedFour);
  await timeline.press('Escape');
  await expect(selectedHandles).toHaveCount(0);
  await expect(current).toHaveValue('7');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toEqual([]);
});

test('@native grouped Graph drag transfers Bézier shape across bone and slot spans in one undoable batch', async ({page, native}) => {
  await page.setViewportSize({width:1280, height:900});
  const {bone, animation, translate, color} = await openGraphFixture(page, native, true);
  const graph = page.getByTestId('timeline-pane-graph');
  const current = page.getByTestId('timeline-current');
  const selected = graph.locator('[data-graph-handle-id][aria-pressed="true"]');
  const [first, next] = translate;
  const [colorFirst, colorNext] = color!.keys;
  const key = (id: number) => graph.getByTestId(`timeline-graph-key-${id}-0`);
  const handle = (id: number, component: number, side: number) => graph.getByTestId(`timeline-bezier-${id}-${component}-${side}`);
  const xOut = handle(first!.id, 0, 0), xIn = handle(first!.id, 0, 1);
  const yOut = handle(first!.id, 1, 0), yIn = handle(first!.id, 1, 1);
  const redOut = handle(colorFirst!.id, 0, 0);
  await page.getByTestId('timeline-tab-graph').click();
  await key(first!.id).press('Enter');
  await key(colorFirst!.id).press('Control+Enter');
  await xOut.press('Enter');
  for (const mark of [yOut, yIn, redOut]) await mark.press('Control+Enter');
  await expect(selected).toHaveCount(4);
  for (const mark of [xOut, yOut, yIn, redOut]) await expect(mark).toHaveAttribute('aria-pressed', 'true');
  await expect(xIn).toHaveAttribute('aria-pressed', 'false');
  await current.fill('7');
  await current.press('Enter');
  await expect(current).toHaveValue('7');

  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  const clip = (p: ProjectSummary) => p.animations!.find(item => item.id === animation)!;
  const base = clip(before);
  const left = Number(await key(first!.id).getAttribute('x')) + 3;
  const right = Number(await key(next!.id).getAttribute('x')) + 3;
  const pixelsPerFrame = (right - left) / (next!.frame - first!.frame);
  const guides = graph.getByTestId('timeline-graph-value-guides').locator('line');
  const displaySpan = Number(await guides.last().getAttribute('data-graph-value')) - Number(await guides.first().getAttribute('data-graph-value'));
  const pixelSpan = Number(await guides.first().getAttribute('y1')) - Number(await guides.last().getAttribute('y1'));
  const pointerDelta = {x:Math.round(pixelsPerFrame * 1.5), y:-Math.max(6, Math.round(pixelSpan * 6 / displaySpan))};
  const rendered = async (mark: Locator) => ({
    frame:Math.fround(first!.frame + (Number(await mark.getAttribute('cx')) - left) / pixelsPerFrame),
    value:Math.fround(Number(await mark.getAttribute('data-graph-display-value'))),
  });
  const markers = [xOut, xIn, yOut, yIn, redOut];
  const original = await Promise.all(markers.map(rendered));
  async function moveGroup() {
    const box = (await xOut.boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + pointerDelta.x, y + pointerDelta.y, {steps:4});
    await expect.poll(async () => (await rendered(xOut)).frame).toBeGreaterThan(original[0]!.frame + .5);
    const controls = await Promise.all(markers.map(rendered));
    expect(controls[1]).toEqual(original[1]);
    const normalized = ({frame, value}: {frame:number; value:number}) => ({
      time:(frame - first!.frame) / (next!.frame - first!.frame),
      height:(value - first!.values[0]) / (next!.values[0] - first!.values[0]),
    });
    const outgoing = normalized(controls[0]!);
    const incoming = normalized(controls[1]!);
    expect(controls[2]!.frame).toBeCloseTo(first!.frame + outgoing.time * 10, 5);
    expect(controls[2]!.value).toBeCloseTo(first!.values[1] + outgoing.height * 20, 5);
    expect(controls[3]!.frame).toBeCloseTo(first!.frame + incoming.time * 10, 5);
    expect(controls[3]!.value).toBeCloseTo(first!.values[1] + incoming.height * 20, 5);
    const colorSpan = colorNext!.frame - colorFirst!.frame;
    const redSpan = colorNext!.values[0] - colorFirst!.values[0];
    expect(controls[4]!.frame).toBeCloseTo(colorFirst!.frame + outgoing.time * colorSpan, 5);
    expect(controls[4]!.value).toBeCloseTo(colorFirst!.values[0] + outgoing.height * redSpan, 5);
    const move = controls[0]!.frame - original[0]!.frame;
    expect(Math.abs(controls[4]!.frame - (original[4]!.frame + move))).toBeGreaterThan(.5);
    expect(Math.abs(controls[4]!.frame - (original[4]!.frame + move * colorSpan / 10))).toBeGreaterThan(.5);
    expect(await native.snapshot()).toEqual(before);
    expect(edits()).toHaveLength(0);
    return controls;
  }

  await graph.evaluate(node => {
    node.addEventListener('pointerdown', event => node.setAttribute('data-e2e-pointer', String((event as PointerEvent).pointerId)),
      {capture:true, once:true});
  });
  await moveGroup();
  const pointerId = Number(await graph.getAttribute('data-e2e-pointer'));
  expect(pointerId).toBeGreaterThan(0);
  await graph.evaluate((node, id) => {
    node.removeAttribute('data-e2e-pointer');
    node.dispatchEvent(new PointerEvent('pointercancel', {pointerId:id, pointerType:'mouse', bubbles:true}));
  }, pointerId);
  await page.mouse.up();
  await expect.poll(() => Promise.all(markers.map(rendered))).toEqual(original);
  await expect(selected).toHaveCount(4);
  expect(await native.snapshot()).toEqual(before);
  expect(edits()).toHaveLength(0);

  const [active, opposite, peer, oppositePeer, colorPeer] = await moveGroup();
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(before.revision + 1);
  expect(edits()).toHaveLength(1);
  const call = edits()[0]!;
  expect(call.args.expectedRevision).toBe(before.revision);
  expect(call.args.poseEpoch).toBeUndefined();
  const batch = call.args.edit as RigEdit;
  if (batch.type !== 'setAnimationKeyBatch') throw new Error('Grouped Bézier edits must commit one key batch.');
  expect(batch.animation).toBe(animation);
  expect(batch.constraintKeys ?? []).toEqual([]);
  const axes = [[active!.frame, active!.value, opposite!.frame, opposite!.value],
    [peer!.frame, peer!.value, oppositePeer!.frame, oppositePeer!.value]];
  expect(batch.boneKeys).toEqual([{
    bone, channel:'translate', keyId:first!.id, frame:first!.frame, values:first!.values, curve:'bezier', controls:axes,
  }]);
  const redControls = [[colorPeer!.frame, colorPeer!.value, ...colorFirst!.controls![0].slice(2)],
    ...colorFirst!.controls!.slice(1)];
  expect(batch.slotKeys).toHaveLength(1);
  expect(batch.slotKeys[0]).toMatchObject({
    slot:color!.slot, channel:'rgba', keyId:colorFirst!.id, frame:colorFirst!.frame,
    values:colorFirst!.values, curve:'bezier', controls:redControls,
  });
  const expected = {
    ...base,
    tracks:base.tracks.map(track => ({...track, keys:track.keys.map(key => key.id === first!.id ? {...key, controls:axes} : key)})),
    slotTracks:base.slotTracks!.map(track => ({...track, keys:track.keys.map(key => key.id === colorFirst!.id ? {...key, controls:redControls} : key)})),
  };
  expect(clip((await native.snapshot())!)).toEqual(expected);
  await expect(current).toHaveValue('7');
  await page.getByRole('button', {name:'Undo', exact:true}).click();
  await expect.poll(async () => clip((await native.snapshot())!)).toEqual(base);
  await page.getByRole('button', {name:'Redo', exact:true}).click();
  await expect.poll(async () => clip((await native.snapshot())!)).toEqual(expected);
  await expect(current).toHaveValue('7');
});
