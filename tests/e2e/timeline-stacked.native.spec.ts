import type {Locator} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native stacked Graph and Dopesheet share time with Sync and commit one drag', async ({page, native}, info) => {
  await page.setViewportSize({width: 1200, height: 850});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own stacked timeline', discardChanges: true});
  const bone = project.bones[0]!.id;
  const animation = project.animations![0]!.id;
  project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: {
    type: 'setAnimationKeys', animation, keys: [
      {bone, channel: 'rotate', frame: 10, values: [5, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 20, values: [20, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 40, values: [50, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 80, values: [15, 0], curve: 'linear'},
    ],
  }});
  const keys = (project: ProjectSummary) => project.animations!.find(clip => clip.id === animation)!
    .tracks.find(track => track.bone === bone && track.channel === 'rotate')!.keys;
  const [, first, second] = keys(project);
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();

  const timeline = page.getByTestId('animation-timeline');
  const stack = page.getByTestId('timeline-stack');
  const graph = page.getByTestId('timeline-pane-graph');
  const sheet = page.getByTestId('timeline-pane-dopesheet');
  const graphTab = page.getByTestId('timeline-tab-graph');
  const sheetTab = page.getByTestId('timeline-tab-dopesheet');
  const graphRuler = graph.getByTestId('timeline-ruler');
  const sheetRuler = sheet.getByTestId('timeline-ruler');
  const graphScroll = graph.getByTestId('timeline-scroll');
  const sheetScroll = sheet.getByTestId('timeline-scroll');
  const zoom = page.getByTestId('timeline-zoom');
  const sync = page.getByTestId('timeline-sync');
  const current = page.getByTestId('timeline-current');
  const graphKey = (id: number) => graph.getByTestId(`timeline-graph-key-${id}-0`);
  const sheetKey = (id: number) => sheet.getByTestId(`timeline-key-${id}`);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await expect(stack).toHaveAttribute('aria-pressed', 'false');
  const singleHeight = (await timeline.boundingBox())!.height;
  await stack.press('Space');
  await expect(stack).toHaveAttribute('aria-pressed', 'true');
  await expect(graph).toBeVisible();
  await expect(sheet).toBeVisible();
  await expect(timeline.getByTestId('timeline-play')).toHaveCount(1);
  await expect(timeline.getByTestId('timeline-current')).toHaveCount(1);
  expect((await graphRuler.boundingBox())!.y).toBeLessThan((await sheetRuler.boundingBox())!.y);
  await sheetTab.click();
  await expect(sheet).toHaveAttribute('data-active', 'true');
  await expect(graph).toHaveAttribute('data-active', 'false');
  await sync.selectOption('graph-to-dopesheet');
  await expect(graphKey(first!.id)).toBeVisible();
  await expect(sheetKey(first!.id)).toBeVisible();
  await expectAligned();

  await graphTab.click();
  const autoFrame = page.getByTestId('timeline-tool-auto-fit');
  if (await autoFrame.getAttribute('aria-pressed') === 'true') await autoFrame.press('Space');
  await expect(graph).toHaveAttribute('data-active', 'true');
  await zoomByClick(.43);
  await expectAligned();
  await panFrom(graphScroll, graphRuler, 65);
  await expectAligned();

  await sheetTab.click();
  await expect(sheet).toHaveAttribute('data-active', 'true');
  await zoomByClick(.33);
  await expectAligned();
  await panFrom(sheetScroll, sheetRuler, 60);
  await expectAligned();
  await page.screenshot({path: info.outputPath('stacked-timelines-wide.png')});

  const leadIn = graph.getByTestId('timeline-graph-lead-in');
  await leadIn.press('Space');
  await expect(leadIn).toHaveAttribute('aria-pressed', 'true');
  await expectAligned();
  await page.setViewportSize({width: 960, height: 700});
  await expectAligned();
  const beforeResize = (await timeline.boundingBox())!.height;
  await page.getByTestId('timeline-resize').press('ArrowUp');
  await expect.poll(async () => (await timeline.boundingBox())!.height).toBeGreaterThan(beforeResize);
  await expectAligned();
  const narrowRuler = (await sheetRuler.boundingBox())!;
  const panToVisible = (await tickX(sheetRuler, 40)) - (narrowRuler.x + narrowRuler.width - 22);
  if (panToVisible > 0) await panFrom(sheetScroll, sheetRuler, Math.ceil(panToVisible));
  await expectAligned();
  await page.screenshot({path: info.outputPath('stacked-timelines-narrow.png')});

  await seekAt(graphRuler, 20);
  await expect(current).toHaveValue('20');
  await seekAt(sheetRuler, 40);
  await expect(current).toHaveValue('40');
  await expect.poll(async () => horizontalError(graph.locator('.at-playhead-line'), sheet.locator('.at-playhead-line'))).toBeLessThan(1);
  expect(await native.snapshot()).toEqual(before);
  expect(edits()).toEqual([]);

  await sheetTab.click();
  const marker = (await sheetKey(first!.id).boundingBox())!;
  const pixelsPerFrame = (await tickX(sheetRuler, 40) - await tickX(sheetRuler, 20)) / 20;
  const x = marker.x + marker.width / 2, y = marker.y + marker.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4 * pixelsPerFrame, y, {steps: 5});
  expect(await native.snapshot()).toEqual(before);
  expect(edits()).toEqual([]);
  await page.mouse.up();
  await expect.poll(async () => keys((await native.snapshot())!).find(key => key.id === first!.id)!.frame).toBe(24);
  expect(edits()).toHaveLength(1);
  expect(edits()[0]!.args.edit as RigEdit).toMatchObject({type: 'moveAnimationKeys', keys: [first!.id], deltaFrames: 4});
  await expect(current).toHaveValue('40');
  await expect.poll(() => horizontalError(graphKey(first!.id), sheetKey(first!.id))).toBeLessThan(1);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => keys((await native.snapshot())!)).toEqual(keys(before));

  await sheetTab.click();
  await timeline.press('Escape');
  await sync.selectOption('dopesheet-to-graph');
  await expect(graphKey(first!.id)).toHaveCount(0);
  await sheetKey(first!.id).press('Enter');
  await expect(graphKey(first!.id)).toBeVisible();
  await expectAligned();
  await graphKey(second!.id).press('Escape');
  await expect(graphKey(first!.id)).toBeVisible();
  await sheetKey(first!.id).press('Escape');
  await expect(graphKey(first!.id)).toHaveCount(0);

  await sheetTab.click();
  await sync.selectOption('off');
  const graphBeforePan = await tickX(graphRuler, 40);
  await panFrom(sheetScroll, sheetRuler, 42);
  await expect.poll(() => tickX(graphRuler, 40)).toBeCloseTo(graphBeforePan, 0);
  await stack.press('Space');
  await expect(stack).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('timeline-ruler')).toHaveCount(1);
  await expect.poll(async () => (await timeline.boundingBox())!.height).toBeCloseTo(singleHeight, 0);
  await stack.press('Space');
  await page.getByTestId('editor-mode-setup').click();
  await expect(timeline).toHaveCount(0);
  await page.getByTestId('editor-mode-animate').click();
  await expect(stack).toHaveAttribute('aria-pressed', 'true');
  await expect(graph).toBeVisible();
  await expect(sheet).toBeVisible();

  async function expectAligned() {
    for (const frame of [20, 40]) {
      await expect.poll(async () => Math.abs(await tickX(graphRuler, frame) - await tickX(sheetRuler, frame))).toBeLessThan(1);
    }
    for (const key of [first!, second!]) {
      await expect.poll(() => horizontalError(graphKey(key.id), sheetKey(key.id))).toBeLessThan(1);
    }
  }

  async function zoomByClick(fraction: number) {
    const previous = await zoom.inputValue();
    const slider = (await zoom.boundingBox())!;
    await zoom.click({position: {x: slider.width * fraction, y: slider.height / 2}});
    await expect(zoom).not.toHaveValue(previous);
  }

  async function panFrom(scroller: Locator, ruler: Locator, delta: number) {
    const box = (await scroller.boundingBox())!;
    const rulerBounds = (await ruler.boundingBox())!;
    const x = rulerBounds.x + Math.min(140, rulerBounds.width * .75);
    const y = box.y + box.height / 2;
    const previous = await scroller.evaluate(element => element.scrollLeft);
    await page.mouse.move(x, y);
    await page.mouse.down({button: 'right'});
    await page.mouse.move(x - delta, y, {steps: 4});
    await page.mouse.up({button: 'right'});
    await expect.poll(() => scroller.evaluate(element => element.scrollLeft)).toBeGreaterThan(previous + delta / 2);
  }

  async function seekAt(ruler: Locator, frame: number) {
    const box = (await ruler.boundingBox())!;
    const x = await tickX(ruler, frame);
    expect(x).toBeGreaterThan(box.x + 2);
    expect(x).toBeLessThan(box.x + box.width - 2);
    await page.mouse.click(x, box.y + box.height / 2);
  }
});

test('@native the Timeline pane menu preserves the active clip, key, and layout', async ({page, native}) => {
  await page.setViewportSize({width: 1440, height: 900});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Timeline pane menu', discardChanges: true});
  const empty = project.animations![0]!.id;
  const bone = project.bones[0]!.id;
  project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision,
    edit: {type: 'createAnimation', name: 'Pane menu keys'}});
  const animation = project.editedAnimation!;
  project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision,
    edit: {type: 'setAnimationKeys', animation, keys: [
      {bone, channel: 'rotate', frame: 10, values: [15, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 30, values: [32, 0], curve: 'linear'},
    ]}});
  const key = project.animations!.find(clip => clip.id === animation)!.tracks[0]!.keys[0]!;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  const timeline = page.getByTestId('animation-timeline');
  const clip = timeline.getByTestId('animation-select');
  const actions = timeline.getByTestId('timeline-pane-actions');
  const menu = timeline.getByTestId('timeline-pane-actions-menu');
  const graph = timeline.getByTestId('timeline-pane-graph');
  const sheet = timeline.getByTestId('timeline-pane-dopesheet');
  const graphTab = timeline.getByTestId('timeline-tab-graph');
  const stack = timeline.getByTestId('timeline-stack');
  const current = timeline.getByTestId('timeline-current');
  const marker = graph.getByTestId(`timeline-graph-key-${key.id}-0`);
  const before = (await native.snapshot())!;
  const start = native.calls.length;

  async function openPaneMenu() {
    await expect(actions).toHaveCount(1);
    await actions.press('Enter');
    await expect(actions).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('role', 'menu');
    await expect(menu).toHaveAccessibleName('Timeline pane actions');
    await expect(actions).toHaveAttribute('aria-controls', (await menu.getAttribute('id'))!);
    const minimize = menu.getByRole('menuitem', {name: 'Minimize', exact: true});
    const close = menu.getByRole('menuitem', {name: 'Close', exact: true});
    await expect(minimize).toHaveAttribute('data-testid', 'timeline-pane-minimize');
    await expect(close).toHaveAttribute('data-testid', 'timeline-pane-close');
    await expect(minimize).toBeDisabled();
    await expect(close).toBeDisabled();
    await expect(minimize).toHaveAccessibleDescription('These actions are unavailable for the timeline pane.');
    await expect(minimize).toBeFocused();
  }

  async function dismissPaneMenu() {
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(actions).toHaveAttribute('aria-expanded', 'false');
    await expect(actions).toBeFocused();
  }

  await clip.selectOption(String(empty));
  await expect(timeline.locator('[data-timeline-key-id]')).toHaveCount(0);
  await expect(actions).toHaveAttribute('aria-haspopup', 'menu');
  await expect(actions).toHaveAccessibleName('Timeline pane actions');
  const lastClipAction = timeline.getByTestId('animation-delete');
  await expect.poll(async () => {
    const [clipBounds, menuBounds] = await Promise.all([lastClipAction.boundingBox(), actions.boundingBox()]);
    return !!clipBounds && !!menuBounds && menuBounds.x > clipBounds.x;
  }).toBe(true);
  await openPaneMenu();
  await dismissPaneMenu();
  await expect(clip).toHaveValue(String(empty));

  await clip.selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  await graphTab.click();
  await marker.press('Enter');
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await current.fill('17');
  await current.press('Enter');
  await openPaneMenu();
  await dismissPaneMenu();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('17');
  await expect(clip).toHaveValue(String(animation));
  await expect(stack).toHaveAttribute('aria-pressed', 'false');

  await stack.press('Space');
  await expect(graph).toBeVisible();
  await expect(sheet).toBeVisible();
  await openPaneMenu();
  await page.keyboard.press('F9');
  await expect(timeline).toBeHidden();
  await page.getByTestId('minimize-docked-views').press('F9');
  await expect(timeline).toBeVisible();
  await expect(menu).toBeHidden();
  await expect(actions).toHaveAttribute('aria-expanded', 'false');
  await expect(graph).toBeVisible();
  await expect(sheet).toBeVisible();
  await expect(stack).toHaveAttribute('aria-pressed', 'true');
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('17');
  await expect(clip).toHaveValue(String(animation));
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toEqual([]);
});

async function tickX(ruler: Locator, frame: number) {
  return ruler.locator(`[data-timeline-frame="${frame}"]`).evaluate(node => {
    const tick = node as HTMLElement;
    return tick.parentElement!.getBoundingClientRect().left + Number.parseFloat(tick.style.left);
  });
}

async function horizontalError(first: Locator, second: Locator) {
  const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  if (!a || !b) return Infinity;
  return Math.abs(a.x + a.width / 2 - (b.x + b.width / 2));
}
