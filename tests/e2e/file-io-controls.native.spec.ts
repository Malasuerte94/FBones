import type {ProjectSummary} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native File shows planned I/O without changing the project or playback', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 500});
  await page.clock.install();
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Planned File tools', discardChanges: false});
  project = await native.invoke<ProjectSummary>('edit_rig', {
    expectedRevision: project.revision,
    edit: {type: 'create', parent: project.bones[0]!.id, x: 20, y: 0, rotation: 0, length: 35},
  });
  const bone = project.editedBone!;
  project = await native.invoke<ProjectSummary>('edit_rig', {
    expectedRevision: project.revision,
    edit: {type: 'createAnimation', name: 'File menu playback'},
  });
  const animation = project.editedAnimation!;
  await native.invoke<ProjectSummary>('edit_rig', {
    expectedRevision: project.revision,
    edit: {type: 'setAnimationKeys', animation, keys: [
      {bone, channel: 'translate', frame: 0, values: [0, 0], curve: 'linear'},
      {bone, channel: 'translate', frame: 90, values: [90, 0], curve: 'linear'},
    ]},
  });

  await openNativeEditor(page);
  await expect(page.getByRole('heading', {name: 'Planned File tools', exact: true})).toBeVisible();
  const before = await native.snapshot();
  const initialCalls = native.calls.length;
  const toggle = page.getByTestId('file-menu-toggle');
  const panel = page.getByTestId('file-menu-panel');
  await toggle.press('Enter');
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.top >= 0 && bounds.left >= 0 && bounds.bottom <= innerHeight &&
      bounds.right <= innerWidth && element.scrollWidth <= element.clientWidth;
  })).toBe(true);

  const groups = [
    ['Project', ['package-project']],
    ['Import', ['import-project', 'import-data']],
    ['Export', ['export-png', 'export-video', 'export-json', 'export-binary', 'export-html', 'pack-atlas']],
  ] as const;
  for (const [label, entries] of groups) {
    const group = panel.getByRole('region', {name: label, exact: true});
    await expect(group).toBeVisible();
    for (const id of entries) {
      const button = group.getByTestId(`file-planned-${id}`);
      await expect(button).toHaveJSProperty('disabled', true);
      await expect(button).toHaveAccessibleDescription('This feature is planned.');
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
      await button.click({force: true});
      await expect(panel).toBeVisible();
    }
  }
  await expect(panel.getByTestId('import-psd')).toBeEnabled();
  await expect(panel.getByTestId('export-runtime')).toBeEnabled();

  await toggle.focus();
  const workingButtons = await panel.locator('button:enabled').all();
  expect(workingButtons.length).toBeGreaterThan(0);
  for (const button of workingButtons) {
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(panel.locator(':focus')).toHaveCount(0);

  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(initialCalls).map(call => call.command)).toEqual(['get_project']);

  await toggle.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
  await page.setViewportSize({width: 960, height: 720});
  await toggle.press('Enter');
  await expect(panel).toBeVisible();
  await page.screenshot({path: info.outputPath('file-io-controls.png')});
  await panel.getByTestId('export-runtime').press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();

  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const playback = page.getByTestId('timeline-play');
  const frame = page.getByTestId('timeline-current');
  await expect(playback).toHaveAccessibleName('Play');
  await toggle.press('Space');
  await expect(panel).toBeVisible();
  await expect(playback).toHaveAccessibleName('Play');
  await expect(panel.getByTestId('import-psd')).toBeDisabled();
  await expect(panel.getByTestId('export-runtime')).toBeEnabled();
  await toggle.press('Escape');
  await expect(panel).toBeHidden();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await playback.click();
  await expect(playback).toHaveAccessibleName('Pause');
  await page.clock.runFor(150);
  const playingFrame = Number(await frame.inputValue());
  await toggle.press('Space');
  await expect(panel).toBeVisible();
  await expect(playback).toHaveAccessibleName('Pause');
  await page.clock.runFor(150);
  await expect.poll(async () => Number(await frame.inputValue())).toBeGreaterThan(playingFrame);
  await toggle.press('Escape');
  await playback.click();
  await expect(playback).toHaveAccessibleName('Play');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(initialCalls).filter(call => !['get_project', 'evaluate_project'].includes(call.command))).toEqual([]);
});
