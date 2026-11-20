import type {Locator, Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

async function seedTimeline(page: Page, native: NativeSession) {
  await page.setViewportSize({width: 1140, height: 800});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own click navigation', discardChanges: true});
  const bone = project.bones[0]!.id;
  async function edit(edit: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit});
  }
  await edit({type: 'createAnimation', name: 'Click navigation'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'rotate', frame: 0, values: [5, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 6.25, values: [32, 0], curve: 'stepped'},
    {bone, channel: 'rotate', frame: 12, values: [45, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 120, values: [95, 0], curve: 'linear'},
  ]});
  const keys = project.animations!.find(clip => clip.id === animation)!.tracks[0]!.keys;
  await openNativeEditor(page);
  await enterAnimation(page, animation);
  return {animation, keys};
}

async function enterAnimation(page: Page, animation: number) {
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
}

async function seek(page: Page, frame: number) {
  const current = page.getByTestId('timeline-current');
  await current.fill(String(frame));
  await current.press('Enter');
  await expect(current).toHaveValue(String(frame));
}

async function center(mark: Locator) {
  await expect(mark).toBeVisible();
  const bounds = (await mark.boundingBox())!;
  return {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
}

async function openNavigation(page: Page) {
  const button = page.getByTestId('timeline-navigation-settings');
  const panel = page.getByTestId('timeline-navigation-settings-panel');
  await button.press('Enter');
  await expect(panel).toBeVisible();
  return {
    button,
    panel,
    key: page.getByTestId('timeline-jump-to-key'),
    frame: page.getByTestId('timeline-jump-to-frame'),
  };
}

async function gridPoint(page: Page, frame: number) {
  const ruler = page.getByTestId('timeline-ruler');
  const pane = page.getByTestId('timeline-scroll');
  const box = (await pane.boundingBox())!;
  const rulerBox = (await ruler.boundingBox())!;
  const origin = await ruler.locator('[data-timeline-frame="0"]').evaluate(element => parseFloat((element as HTMLElement).style.left));
  const zoom = Number(await page.getByTestId('timeline-zoom').inputValue());
  const scroll = await pane.evaluate(element => element.scrollLeft);
  const x = rulerBox.x + origin + frame * zoom - scroll;
  expect(x).toBeGreaterThan(rulerBox.x);
  expect(x).toBeLessThan(rulerBox.x + rulerBox.width);
  return {x, y: box.y + 10};
}

test('@native Dopesheet jump settings distinguish clicks from modified selections and zero-result timing drags', async ({page, native}) => {
  const {keys} = await seedTimeline(page, native);
  const timeline = page.getByTestId('animation-timeline');
  const current = page.getByTestId('timeline-current');
  const [zero, fractional, later] = [keys[0]!, keys[1]!, keys[2]!].map(key => page.getByTestId(`timeline-key-${key.id}`));
  const snapshot = await native.snapshot();
  const start = native.calls.length;
  await seek(page, 2);
  let settings = await openNavigation(page);
  await expect(settings.key).not.toBeChecked();
  await expect(settings.frame).not.toBeChecked();
  await settings.key.press('Escape');
  await expect(settings.panel).toHaveCount(0);
  await fractional.click();
  await expect(fractional).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('2');
  const empty = await gridPoint(page, 21);
  await page.mouse.click(empty.x, empty.y);
  await expect(current).toHaveValue('2');
  await expect(fractional).toHaveAttribute('aria-pressed', 'false');

  settings = await openNavigation(page);
  await settings.key.check();
  await settings.frame.check();
  await settings.frame.press('Escape');
  await expect(settings.panel).toHaveCount(0);
  await fractional.click();
  await expect(current).toHaveValue('6.25');
  await expect(fractional).toHaveAttribute('aria-pressed', 'true');

  const autoKey = page.getByTestId('timeline-auto-key');
  await autoKey.click();
  await expect(autoKey).toHaveAttribute('aria-pressed', 'false');
  const rotation = page.getByTestId('animate-bone-rotation');
  await rotation.fill('64');
  await rotation.press('Enter');
  await expect(rotation).toHaveValue('64');
  await fractional.click();
  await expect(current).toHaveValue('6.25');
  await expect(rotation).toHaveValue('64');
  await later.click({modifiers: ['Control']});
  await expect(later).toHaveAttribute('aria-pressed', 'true');
  await expect(fractional).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('6.25');
  await later.click({modifiers: ['Meta']});
  await expect(later).toHaveAttribute('aria-pressed', 'false');
  await later.click({modifiers: ['Shift']});
  await expect(later).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('6.25');
  await expect(rotation).toHaveValue('64');
  await timeline.press('Control+c');
  await expect(page.getByTestId('timeline-paste')).toBeEnabled();

  await seek(page, 2);
  await timeline.press('Escape');
  const first = await center(zero);
  const firstBox = (await zero.boundingBox())!;
  first.x = firstBox.x + firstBox.width - 1;
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(first.x - 20, first.y, {steps: 4});
  await page.mouse.up();
  await expect(zero).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('2');

  const laterPoint = await center(later);
  await page.mouse.move(laterPoint.x, laterPoint.y);
  await page.mouse.down();
  await page.mouse.move(laterPoint.x + 24, laterPoint.y, {steps: 4});
  await expect(current).toHaveValue('2');
  await page.mouse.move(laterPoint.x, laterPoint.y, {steps: 4});
  await page.mouse.up();
  await expect(current).toHaveValue('2');
  const zoom = Number(await page.getByTestId('timeline-zoom').inputValue());
  await page.mouse.move(laterPoint.x, laterPoint.y);
  await page.mouse.down();
  await page.mouse.move(laterPoint.x + zoom * 0.42, laterPoint.y);
  await page.mouse.up();
  await expect(current).toHaveValue('2');
  await page.mouse.move(laterPoint.x, laterPoint.y);
  await page.mouse.down();
  await page.mouse.move(laterPoint.x + 24, laterPoint.y, {steps: 4});
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(current).toHaveValue('2');

  const summary = timeline.locator(`.at-overview-row [data-timeline-key-id="${keys[2]!.id}"]`);
  await summary.click();
  await expect(current).toHaveValue('2');
  await page.mouse.click(empty.x, empty.y);
  await expect(current).toHaveValue('21');
  await expect(page.getByTestId('timeline-paste')).toBeEnabled();

  const offset = page.getByTestId('timeline-tool-offset');
  await offset.press('Enter');
  await later.click();
  await expect(later).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('12');
  await offset.press('Enter');
  expect(await native.snapshot()).toEqual(snapshot);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toEqual([]);

  await seek(page, 2);
  const move = await center(later);
  await page.mouse.move(move.x, move.y);
  await page.mouse.down();
  await page.mouse.move(move.x + zoom * 2, move.y, {steps:4});
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())?.animations?.flatMap(clip=>clip.tracks)
    .flatMap(track=>track.keys).find(key=>key.id===keys[2]!.id)?.frame).toBe(14);
  await expect(current).toHaveValue('2');
  expect(native.calls.slice(start).filter(call=>call.command==='edit_rig')).toHaveLength(1);
});

test('@native Graph jump settings preserve their own selection behavior and seek through a scrolled lead-in', async ({page, native}, info) => {
  const {animation, keys} = await seedTimeline(page, native);
  const graph = page.getByTestId('timeline-tab-graph');
  const dopesheet = page.getByTestId('timeline-tab-dopesheet');
  const current = page.getByTestId('timeline-current');
  const fractional = page.getByTestId(`timeline-graph-key-${keys[1]!.id}-0`);
  const later = page.getByTestId(`timeline-graph-key-${keys[2]!.id}-0`);
  const pane = page.getByTestId('timeline-scroll');
  const snapshot = await native.snapshot();
  const start = native.calls.length;

  let settings = await openNavigation(page);
  await settings.key.check();
  await settings.key.press('Escape');
  await graph.click();
  settings = await openNavigation(page);
  await expect(settings.key).not.toBeChecked();
  await expect(settings.frame).not.toBeChecked();
  await settings.frame.check();
  await settings.frame.press('Escape');
  await seek(page, 2);
  await fractional.click();
  await expect(fractional).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('2');

  settings = await openNavigation(page);
  await settings.key.check();
  await settings.key.press('Escape');
  await fractional.press('Enter');
  await expect(current).toHaveValue('6.25');
  await later.press('Space');
  await expect(later).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('12');
  await fractional.press('Control+Enter');
  await expect(fractional).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('12');
  await fractional.press('Meta+Enter');
  await expect(fractional).toHaveAttribute('aria-pressed', 'false');
  await expect(current).toHaveValue('12');

  const mark = await center(fractional);
  await page.mouse.move(mark.x - 10, mark.y - 10);
  await page.mouse.down();
  await page.mouse.move(mark.x + 10, mark.y + 10, {steps: 4});
  await expect(page.getByTestId('timeline-marquee')).toBeVisible();
  await page.mouse.up();
  await expect(fractional).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('12');
  await page.keyboard.down('Control');
  await page.mouse.click(mark.x - 10, mark.y - 10);
  await page.keyboard.up('Control');
  await expect(fractional).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('12');

  await page.getByTestId('timeline-graph-lead-in').click();
  await pane.evaluate(element => {element.scrollLeft = 340;});
  await expect.poll(() => pane.evaluate(element => element.scrollLeft)).toBeGreaterThan(300);
  let point = await gridPoint(page, 45);
  await page.mouse.click(point.x, point.y);
  await expect(current).toHaveValue('45');
  point = await gridPoint(page, 48.25);
  await page.keyboard.down('Shift');
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up('Shift');
  await expect.poll(async () => Math.abs(Number(await current.inputValue()) - 48.25)).toBeLessThan(.12);
  const displayFrame = Number(await current.inputValue());
  expect(Number.isInteger(displayFrame)).toBe(false);

  settings = await openNavigation(page);
  await expect(settings.panel).toBeVisible();
  await page.screenshot({path: info.outputPath('timeline-jump-settings.png')});
  await settings.frame.press('Escape');
  await dopesheet.click();
  settings = await openNavigation(page);
  await expect(settings.key).toBeChecked();
  await expect(settings.frame).not.toBeChecked();
  await settings.frame.press('Escape');
  await page.getByTestId('editor-mode-setup').click();
  await enterAnimation(page, animation);
  settings = await openNavigation(page);
  await expect(settings.key).toBeChecked();
  await expect(settings.frame).not.toBeChecked();
  await settings.frame.press('Escape');

  await openNativeEditor(page);
  await enterAnimation(page, animation);
  await graph.click();
  settings = await openNavigation(page);
  await expect(settings.key).toBeChecked();
  await expect(settings.frame).toBeChecked();
  expect(await native.snapshot()).toEqual(snapshot);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toEqual([]);
});
