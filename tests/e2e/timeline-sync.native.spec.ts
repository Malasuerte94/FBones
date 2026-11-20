import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native timeline Sync follows both sources and Key Shown edits only the visible lane', async ({page, native}, info) => {
  await page.setViewportSize({width: 1024, height: 800});
  const path = await native.invoke<string>('e2e_seed_split_fixture');
  await native.queueDialog('open', path);
  const loaded = await native.invoke<ProjectSummary>('open_project', {discardChanges: true});
  const animation = loaded.animations![0]!.id;
  const bone = loaded.animations![0]!.splitModes!.find(row => row.mode === 1)!.bone;
  const project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: loaded.revision, edit: {
    type: 'setAnimationKeys', animation, keys: [
      {bone, channel: 'rotate', frame: 7, values: [12, 0], curve: 'linear'},
      {bone, channel: 'rotate', frame: 23, values: [42, 0], curve: 'linear'},
    ],
  }});
  const clip = project.animations!.find(item => item.id === animation)!;
  const key = (channel: string, frame: number) => clip.tracks.find(track => track.bone === bone && track.channel === channel)!
    .keys.find(item => item.frame === frame)!;
  const rotate = key('rotate', 7), translateX = key('translateX', 12), translateY = key('translateY', 20);

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();

  const timeline = page.getByTestId('animation-timeline');
  const graph = page.getByTestId('timeline-tab-graph');
  const sheet = page.getByTestId('timeline-tab-dopesheet');
  const sync = page.getByRole('combobox', {name: 'Sync', exact: true});
  const filter = page.getByTestId('timeline-row-filter');
  const filterPanel = page.getByTestId('timeline-row-filters');
  const lock = page.getByTestId('timeline-row-lock');
  const refresh = page.getByTestId('timeline-row-refresh');
  const current = page.getByTestId('timeline-current');
  const boneRow = page.getByTestId(`timeline-bone-row-${bone}`);
  const sheetKey = (id: number) => page.getByTestId(`timeline-key-${id}`);
  const summary = (id: number) => timeline.locator(`.at-summary-key[data-timeline-key-id="${id}"]`);
  const curve = (channel: string) => page.getByTestId(`timeline-curve-${bone}:${channel}-0`);
  const graphY = page.getByTestId(`timeline-graph-visibility-${bone}:translateY`);
  const before = await native.snapshot();
  const start = native.calls.length;
  const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await expect(page.getByTestId('timeline-planned-tools').locator('select, button').first()).toHaveAttribute('data-testid', 'timeline-sync');
  await expect(sync).toHaveValue('off');
  await expect(sync.locator('option')).toHaveText(['Off', 'Graph → Dopesheet', 'Dopesheet → Graph']);
  await chooseFilter('rotate');
  await lock.press('Space');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await expect(sheetKey(rotate.id)).toBeVisible();
  await expect(sheetKey(translateX.id)).toHaveCount(0);

  await graph.click();
  await expect(sync).toHaveCount(0);
  await chooseFilter('translate');
  await expect(curve('translateX')).toBeVisible();
  await expect(curve('translateY')).toBeVisible();
  await expect(curve('rotate')).toHaveCount(0);
  await graphY.press('Space');
  await expect(graphY).toHaveAttribute('aria-pressed', 'false');
  await expect(curve('translateY')).toHaveCount(0);

  await sheet.click();
  await sheetKey(rotate.id).press('Enter');
  await expect(sheetKey(rotate.id)).toHaveAttribute('aria-pressed', 'true');
  await current.fill('9');
  await current.press('Enter');
  await expect(current).toHaveValue('9');
  await sync.selectOption('graph-to-dopesheet');
  await expect(sync).toHaveValue('graph-to-dopesheet');
  for (const control of [filter, lock, refresh]) await expect(control).toHaveCount(0);
  await expect(sheetKey(translateX.id)).toBeVisible();
  await expect(summary(translateX.id)).toHaveCount(2);
  for (const key of [translateY, rotate]) {
    await expect(sheetKey(key.id)).toHaveCount(0);
    await expect(summary(key.id)).toHaveCount(0);
  }
  await expect(page.getByTestId('timeline-delete-keys')).toBeDisabled();
  await boneRow.getByRole('button', {name: /^Collapse/}).click();
  await expect(sheetKey(translateX.id)).toHaveCount(0);
  await expect(summary(translateX.id)).toHaveCount(2);
  await expect(summary(translateY.id)).toHaveCount(0);
  await boneRow.getByRole('button', {name: /^Expand/}).click();
  await expect(sheetKey(translateX.id)).toBeVisible();
  await expect(current).toHaveValue('9');
  await timeline.press('Control+a');
  await expect(sheetKey(translateX.id)).toHaveAttribute('aria-pressed', 'true');
  await expect(timeline.getByRole('status').filter({hasText: /selected/})).toHaveText('3 selected');
  await expect(current).toHaveValue('9');
  await page.setViewportSize({width: 960, height: 760});
  await expect(sync).toBeInViewport();
  await page.screenshot({path: info.outputPath('dopesheet-sync-graph-source.png')});

  await graph.click();
  await expect(graphY).toHaveAttribute('aria-pressed', 'false');
  await expect(curve('translateY')).toHaveCount(0);
  await sheet.click();
  await sync.selectOption('off');
  await expect(filter).toHaveAttribute('aria-description', 'Row filters applied');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await expect(refresh).toBeEnabled();
  await expect(sheetKey(rotate.id)).toBeVisible();
  await expect(sheetKey(translateX.id)).toHaveCount(0);

  await timeline.press('Escape');
  await sync.selectOption('dopesheet-to-graph');
  await expect(filter).toBeVisible();
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await graph.click();
  await expect(page.getByText('Select keys in Dopesheet to show their curves here.', {exact: true})).toBeVisible();
  await expect(curve('translateX')).toHaveCount(0);
  for (const control of [filter, lock, refresh]) await expect(control).toHaveCount(0);
  await sheet.click();
  await sheetKey(rotate.id).press('Enter');
  await graph.click();
  await expect(page.getByText('Showing curves selected in Dopesheet.', {exact: true})).toBeVisible();
  await expect(curve('rotate')).toBeVisible();
  await expect(curve('translateX')).toHaveCount(0);
  await expect(curve('translateY')).toHaveCount(0);
  await page.screenshot({path: info.outputPath('graph-sync-dopesheet-source.png')});

  await sheet.click();
  await sync.selectOption('off');
  await graph.click();
  await expect(filter).toHaveAttribute('aria-description', 'Row filters applied');
  await expect(curve('translateX')).toBeVisible();
  await expect(graphY).toHaveAttribute('aria-pressed', 'false');
  await expect(curve('translateY')).toHaveCount(0);
  await expect(curve('rotate')).toHaveCount(0);
  expect(await native.snapshot()).toEqual(before);
  expect(edits()).toEqual([]);

  await sheet.click();
  await sync.selectOption('graph-to-dopesheet');
  await current.fill('9');
  await current.press('Enter');
  const keyShown = page.getByTestId('timeline-row-key-shown');
  await expect(keyShown).toBeEnabled();
  await keyShown.press('Enter');
  const currentClip = async () => (await native.snapshot())!.animations!.find(item => item.id === animation)!;
  const xTrack = (tracks: typeof clip.tracks) => tracks.find(track => track.bone === bone && track.channel === 'translateX')!;
  await expect.poll(async () => xTrack((await currentClip()).tracks).keys.some(key => key.frame === 9)).toBe(true);
  expect(edits()).toHaveLength(1);
  const edit = edits()[0]!.args.edit as Extract<RigEdit, {type: 'setAnimationKeyBatch'}>;
  expect(edit.type).toBe('setAnimationKeyBatch');
  expect(edit.boneKeys).toEqual([
    expect.objectContaining({bone, channel: 'translateX', keyId: key('translateX',0).id, curve: 'bezier'}),
    expect.objectContaining({bone, channel: 'translateX', frame: 9, curve: 'bezier'}),
  ]);
  const after = await currentClip();
  const otherTracks = (tracks: typeof clip.tracks) => tracks.filter(track => track !== xTrack(tracks));
  expect(otherTracks(after.tracks)).toEqual(otherTracks(clip.tracks));
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(currentClip).toEqual(clip);

  async function chooseFilter(category: string) {
    await filter.press('Enter');
    await page.getByTestId(`timeline-row-filter-${category}`).click();
    if (await filterPanel.isVisible()) await page.getByTestId('timeline-row-filter-close').click();
  }
});
