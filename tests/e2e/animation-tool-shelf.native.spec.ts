import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Animate controls are discoverable across Dopesheet, Graph and Preview without authoring', async ({page, native}, info) => {
  await page.clock.install();
  let project = await native.invoke<ProjectSummary>('create_project', {
    name: 'Own Animate tools', discardChanges: false,
  });
  async function edit(edit: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit});
  }
  await edit({type: 'create', parent: project.bones[0]!.id, x: 20, y: 0, rotation: 0, length: 35});
  const bone = project.editedBone!;
  await edit({type: 'createSlot', bone, name: 'Preview sprite'});
  const slot = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: ['green']});
  await edit({type: 'createAnimation', name: 'Turnaround'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 60, values: [60, 12], curve: 'linear'},
  ]});
  const key = project.animations!.find(clip => clip.id === animation)!.tracks[0]!.keys[0]!;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const preview = page.getByTestId('animation-preview');
  await expect(preview.getByRole('img', {name: 'Live animation preview'})).toHaveAttribute('data-ready', 'true');
  const dopesheetKey = page.getByTestId(`timeline-key-${key.id}`);
  await dopesheetKey.press('Enter');
  await expect(dopesheetKey).toHaveAttribute('aria-pressed', 'true');
  const current = page.getByTestId('timeline-current');
  await current.fill('12');
  await current.press('Enter');
  await expect(current).toHaveValue('12');
  const before = await native.snapshot();
  expect(before?.name).toBe('Own Animate tools');
  const firstCall = native.calls.length;

  const timelineShelf = page.getByTestId('timeline-planned-tools');
  await expect(timelineShelf).toBeVisible();
  const shift = page.getByTestId('timeline-tool-shift');
  await expect(shift).toBeEnabled();
  await shift.press('Enter');
  await expect(shift).toHaveAttribute('aria-pressed', 'true');
  await shift.press('Enter');
  await expect(shift).toHaveAttribute('aria-pressed', 'false');
  const offset = page.getByTestId('timeline-tool-offset');
  await expect(offset).toBeEnabled();
  await offset.press('Enter');
  await expect(page.getByTestId('timeline-offset-status')).toContainText(/closed|start and end|endpoints|matching/i);
  await offset.press('Enter');
  const adjust = page.getByTestId('timeline-tool-adjust');
  await expect(adjust).toBeVisible();
  await adjust.press('Space');
  await expect(adjust).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('timeline-adjust-status')).toContainText('current frame');
  await page.screenshot({path: info.outputPath('animate-timing-tools.png')});

  await page.getByTestId('timeline-tab-graph').click();
  await expect(timelineShelf).toBeVisible();
  await expect(page.getByTestId('timeline-tool-adjust')).toBeHidden();
  for (const tool of ['frame', 'auto-fit', 'store', 'favor', 'curve-presets']) {
    await expect(page.getByTestId(`timeline-tool-${tool}`)).toBeEnabled();
  }
  await expect(page.getByTestId('timeline-tool-swap')).toBeDisabled();
  const presets = page.getByTestId('timeline-tool-curve-presets');
  await presets.press('Space');
  await expect(page.getByTestId('timeline-curve-preset-automatic')).toBeDisabled();
  await expect(page.getByTestId('timeline-curve-preset-flat')).toBeEnabled();
  await page.getByTestId('timeline-curve-preset-flat').press('Escape');
  await expect(presets).toBeFocused();
  const graphKey = page.getByTestId(`timeline-graph-key-${key.id}-0`);
  await expect(graphKey).toHaveAttribute('aria-pressed', 'true');

  await expect(preview.getByTestId('preview-mode-follow')).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByTestId('preview-mode-tracks')).toBeEnabled();
  const play = page.getByTestId('timeline-play');
  await expect(play).toHaveAccessibleName('Play');
  await expect(current).toHaveValue('12');
  await page.setViewportSize({width: 960, height: 720});
  await expect(timelineShelf).toBeInViewport();
  await expect(preview.getByTestId('preview-mode-tracks')).toBeInViewport();
  await expect(play).toBeInViewport();
  const axis = page.getByTestId('timeline-graph-axis');
  const plot = page.getByTestId('timeline-scroll');
  async function expectAxisWithinPlot() {
    await expect.poll(async () => {
      const [scale, viewport] = await Promise.all([axis, plot].map(locator => locator.evaluate(element => ({
        top: element.getBoundingClientRect().top,
        height: element.clientHeight,
      }))));
      return {top: scale!.top - viewport!.top, height: scale!.height - viewport!.height};
    }).toEqual({top: 0, height: 0});
  }
  await expectAxisWithinPlot();
  const guides = page.getByTestId('timeline-graph-value-guides').locator('line');
  await expect(guides).toHaveCount(5);
  await expect.poll(async () => {
    const [lines, labels] = await Promise.all([
      guides.evaluateAll(elements => elements.map(line => line.getBoundingClientRect().y)),
      axis.locator('span').evaluateAll(elements => elements.map(label => {
        const bounds = label.getBoundingClientRect();
        return bounds.y + bounds.height / 2;
      })),
    ]);
    return Math.max(...lines.map((line, index) => Math.abs(line - labels[index]!)));
  }).toBeLessThan(1);
  await page.screenshot({path: info.outputPath('animate-curve-tools-and-playback-layers.png')});

  await expect(graphKey).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('12');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await play.click();
  await expect(play).toHaveAccessibleName('Pause');
  await page.clock.runFor(150);
  await expect.poll(async () => Number(await current.inputValue())).toBeGreaterThan(12);
  await play.click();
  await expect(play).toHaveAccessibleName('Play');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'edit_rig' || call.command === 'save_project')).toEqual([]);
});
