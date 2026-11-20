import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Dopesheet select all expands a row to the shown keys without advancing Current', async ({page, native}) => {
  await page.setViewportSize({width: 1120, height: 820});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own keyboard timeline selection', discardChanges: true});
  const root = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'create', parent: root, x: 32, y: 18, rotation: 0, length: 30});
  const child = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Selection rows'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: root, channel: 'rotate', frame: 8, values: [15, 0], curve: 'linear'},
    {bone: root, channel: 'translate', frame: 10, values: [1, 2], curve: 'linear'},
    {bone: root, channel: 'translate', frame: 30, values: [11, -3], curve: 'linear'},
    {bone: root, channel: 'scale', frame: 16, values: [1.25, .75], curve: 'linear'},
    {bone: child, channel: 'translate', frame: 18, values: [6, 1], curve: 'linear'},
    {bone: child, channel: 'translate', frame: 32, values: [10, 4], curve: 'linear'},
  ]});
  const clip = project.animations!.find(item => item.id === animation)!;
  const rotation = clip.tracks.find(track => track.channel === 'rotate')!.keys[0]!;
  const scale = clip.tracks.find(track => track.channel === 'scale')!.keys[0]!;
  const rootTranslate = clip.tracks.find(track => track.channel === 'translate' && track.bone === root)!.keys;
  const childTranslate = clip.tracks.find(track => track.channel === 'translate' && track.bone === child)!.keys;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.getByTestId('viewport').locator('canvas').press('Escape');
  const timeline = page.getByTestId('animation-timeline');
  const current = page.getByTestId('timeline-current');
  const filter = page.getByTestId('timeline-row-filter');
  const navigation = page.getByTestId('timeline-navigation-settings');
  const key = (id: number) => page.getByTestId(`timeline-key-${id}`);
  const childRow = page.getByTestId(`timeline-bone-row-${child}`);
  const summaries = childRow.locator('.at-summary-key.selected');
  const selectionStatus = timeline.getByRole('status').filter({hasText: /selected/});
  const before = await native.snapshot();
  const callsStart = native.calls.length;

  await childRow.getByRole('button', {name: /^Collapse/}).click();
  await filter.press('Enter');
  await page.getByTestId('timeline-row-filter-rotate').click();
  await page.getByTestId('timeline-row-filter-translate').click({modifiers: ['Control']});
  await filter.press('Escape');
  await expect(key(scale.id)).toHaveCount(0);
  await expect(key(childTranslate[0]!.id)).toHaveCount(0);
  await navigation.press('Space');
  await page.getByTestId('timeline-jump-to-key').check();
  await page.getByTestId('timeline-jump-to-key').press('Escape');
  await key(rotation.id).press('Enter');
  await expect(current).toHaveValue('8');
  await current.fill('4');
  await current.press('Enter');
  await expect(current).toHaveValue('4');
  await key(rotation.id).focus();

  // The row already has only one key. A repeat from the same keydown still
  // belongs to the first stage and must leave other rows unselected.
  await page.keyboard.down('Control');
  await page.keyboard.down('a');
  await page.keyboard.down('a');
  await page.keyboard.up('a');
  await page.keyboard.up('Control');
  await expect(selectionStatus).toHaveText('1 selected');
  for (const item of rootTranslate) await expect(key(item.id)).toHaveAttribute('aria-pressed', 'false');
  await expect(summaries).toHaveCount(0);
  await expect(current).toHaveValue('4');

  await key(rotation.id).press('Control+a');
  await expect(selectionStatus).toHaveText('5 selected');
  for (const item of rootTranslate) await expect(key(item.id)).toHaveAttribute('aria-pressed', 'true');
  await expect(summaries).toHaveCount(2);
  await expect(summaries.first()).toHaveCSS('outline-style', 'solid');
  await expect(current).toHaveValue('4');

  const translate = key(rootTranslate[0]!.id);
  await translate.press('Enter');
  await expect(current).toHaveValue('10');
  await translate.press('Control+a');
  await expect(selectionStatus).toHaveText('2 selected');
  await expect(key(rootTranslate[1]!.id)).toHaveAttribute('aria-pressed', 'true');
  await expect(key(rotation.id)).toHaveAttribute('aria-pressed', 'false');
  await expect(summaries).toHaveCount(0);
  await expect(current).toHaveValue('10');

  await page.getByTestId('animation-rename').click();
  const name = page.getByTestId('animation-name');
  await name.press('Control+a');
  expect(await name.evaluate(node => {
    const field = node as HTMLInputElement;
    return [field.selectionStart, field.selectionEnd];
  })).toEqual([0, 'Selection rows'.length]);
  await name.press('Escape');
  await expect(selectionStatus).toHaveText('2 selected');

  await filter.press('Enter');
  await page.getByTestId('timeline-row-filter-reset').click();
  await filter.press('Escape');
  await expect(key(scale.id)).toHaveAttribute('aria-pressed', 'false');
  await expect(selectionStatus).toHaveText('2 selected');
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(callsStart).filter(call => call.command === 'edit_rig')).toEqual([]);
});
