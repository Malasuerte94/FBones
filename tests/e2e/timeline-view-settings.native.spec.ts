import type {Locator} from '@playwright/test';
import type {ProjectSummary} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native timeline view settings reclaim space without losing keys, selection or the shared time axis', async ({page, native}, info) => {
  await page.setViewportSize({width: 1200, height: 850});
  await page.addInitScript(() => {
    const key = 'fbones.timeline-navigation.v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({dopesheet: {jumpToFrame: true}}));
  });
  const created = await native.invoke<ProjectSummary>('create_project', {name: 'Own timeline view settings', discardChanges: true});
  const bone = created.bones[0]!.id, animation = created.animations![0]!.id;
  const project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: created.revision, edit: {
    type: 'setAnimationKeys', animation, keys: [0, 10, 20, 40].map(frame => ({
      bone, channel: 'rotate', frame, values: [frame, 0], curve: 'linear',
    })),
  }});
  const key = project.animations!.find(clip => clip.id === animation)!.tracks[0]!.keys.find(key => key.frame === 10)!;
  await enterAnimate();

  const gear = page.getByTestId('timeline-navigation-settings');
  const popup = page.getByTestId('timeline-navigation-settings-panel');
  const toolbar = page.getByTestId('timeline-planned-tools');
  const play = page.getByTestId('timeline-play');
  const sheet = page.getByTestId('timeline-pane-dopesheet');
  const graph = page.getByTestId('timeline-pane-graph');
  const sheetTab = page.getByTestId('timeline-tab-dopesheet');
  const graphTab = page.getByTestId('timeline-tab-graph');
  const sheetRuler = sheet.getByTestId('timeline-ruler');
  const graphRuler = graph.getByTestId('timeline-ruler');
  const sheetKey = sheet.getByTestId(`timeline-key-${key.id}`);
  const graphKey = graph.getByTestId(`timeline-graph-key-${key.id}-0`);
  const rowsOption = page.getByTestId('timeline-show-rows');
  const toolbarOption = page.getByTestId('timeline-show-toolbar');
  const snapshot = await native.snapshot();
  const firstAction = native.calls.length;

  await sheetKey.press('Enter');
  await expect(sheetKey).toHaveAttribute('aria-pressed', 'true');
  const originalWidth = (await sheetRuler.boundingBox())!.width;
  await openSettings();
  await expect(rowsOption).toBeChecked();
  await expect(toolbarOption).toBeChecked();
  await expect(page.getByTestId('timeline-jump-to-frame')).toBeChecked();
  await rowsOption.press('Space');
  await expect(sheet.locator('.at-track-label')).toHaveCount(0);
  await expect.poll(async () => (await sheetRuler.boundingBox())!.width).toBeGreaterThan(originalWidth + 100);
  const beforeToolbar = (await sheet.getByTestId('timeline-scroll').boundingBox())!.height;
  await toolbarOption.press('Space');
  await expect(toolbar).toHaveCount(0);
  await expect.poll(async () => (await sheet.getByTestId('timeline-scroll').boundingBox())!.height).toBeGreaterThan(beforeToolbar + 20);
  await closeSettings();
  await expect(sheetKey).toHaveAttribute('aria-pressed', 'true');
  await expect(play).toBeVisible();

  await graphTab.click();
  await openSettings();
  await expect(rowsOption).toBeChecked();
  await expect(toolbarOption).toBeChecked();
  await closeSettings();
  await expect(graphKey).toBeVisible();
  await page.getByTestId('timeline-stack').press('Space');
  await sheetTab.click();
  await page.getByTestId('timeline-sync').selectOption('graph-to-dopesheet');
  await expect(sheet.locator('.at-track-label')).toHaveCount(0);
  await expect(graph.locator('.at-track-label').first()).toBeVisible();
  await expectAligned();
  const commonGutterWidth = (await graphRuler.boundingBox())!.width;

  await graphTab.click();
  await openSettings();
  await rowsOption.press('Space');
  await expect(graph.locator('.at-track-label')).toHaveCount(0);
  await expectAligned();
  await expect.poll(async () => (await graphRuler.boundingBox())!.width).toBeGreaterThan(commonGutterWidth + 100);
  await toolbarOption.press('Space');
  await expect(toolbar).toHaveCount(0);
  await closeSettings();
  await expect(play).toHaveCount(1);
  await expectAligned();

  await page.setViewportSize({width: 960, height: 700});
  await expectAligned();
  await sheetTab.click();
  await openSettings();
  await expect(popup).toBeInViewport({ratio: 1});
  await page.screenshot({path: info.outputPath('timeline-view-settings.png')});
  await closeSettings();
  const scroll = (await sheet.getByTestId('timeline-scroll').boundingBox())!;
  const mark = (await sheetKey.boundingBox())!;
  await page.getByTestId('animation-timeline').press('Escape');
  await page.mouse.move((await sheetRuler.boundingBox())!.x + 8, mark.y - 2);
  await page.mouse.down();
  await page.mouse.move(mark.x + mark.width + 8, Math.min(mark.y + mark.height + 2, scroll.y + scroll.height - 1), {steps: 4});
  await expect(sheetKey).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.up();
  await expect(graphKey).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('editor-mode-setup').click();
  await page.getByTestId('editor-mode-animate').click();
  await expect(toolbar).toHaveCount(0);
  await expect(sheet.locator('.at-track-label')).toHaveCount(0);
  await enterAnimate();
  await openSettings();
  await expect(rowsOption).not.toBeChecked();
  await expect(toolbarOption).not.toBeChecked();
  await expect(page.getByTestId('timeline-jump-to-frame')).toBeChecked();
  await rowsOption.press('Space');
  await toolbarOption.press('Space');
  await closeSettings();
  await expect(sheet.locator('.at-track-label').first()).toBeVisible();
  await expect(toolbar).toBeVisible();
  await graphTab.click();
  await openSettings();
  await expect(rowsOption).not.toBeChecked();
  await expect(toolbarOption).not.toBeChecked();
  expect(await native.snapshot()).toEqual(snapshot);
  expect(native.calls.slice(firstAction).filter(call => call.command === 'edit_rig')).toHaveLength(0);

  async function enterAnimate() {
    await openNativeEditor(page);
    await page.getByTestId('editor-mode-animate').click();
    await page.getByTestId('animation-select').selectOption(String(animation));
    await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  }

  async function openSettings() {
    await gear.press('Enter');
    await expect(popup).toBeVisible();
  }

  async function closeSettings() {
    await rowsOption.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(gear).toBeFocused();
  }

  async function expectAligned() {
    for (const frame of [10, 20]) {
      const x = (ruler: Locator) => ruler.locator(`[data-timeline-frame="${frame}"]`).evaluate(tick =>
        tick.parentElement!.getBoundingClientRect().left + Number.parseFloat((tick as HTMLElement).style.left),
      );
      await expect.poll(async () => Math.abs(await x(graphRuler) - await x(sheetRuler))).toBeLessThan(1);
    }
    await expect.poll(async () => {
      const [a, b] = await Promise.all([graphKey.boundingBox(), sheetKey.boundingBox()]);
      return a && b ? Math.abs(a.x + a.width / 2 - b.x - b.width / 2) : Infinity;
    }).toBeLessThan(1);
  }
});
