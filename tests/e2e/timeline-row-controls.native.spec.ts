import type {Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor, type NativeSession} from './fixtures/native-session';

async function edit(native: NativeSession, project: ProjectSummary, edit: RigEdit) {
  return native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit});
}

function treeItem(page: Page, kind: 'bone' | 'slot' | 'constraint', id: number) {
  return page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
}

test('@native timeline row Lock freezes the selected detail scope and Refresh and Select reuse current Tree selection', async ({page, native}) => {
  await page.setViewportSize({width: 1140, height: 800});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own locked timeline rows', discardChanges: true});
  const root = project.bones[0]!.id;
  const defaultAnimation = project.animations![0]!.id;
  project = await edit(native, project, {type: 'create', parent: root, x: 40, y: 10, rotation: 0, length: 30});
  const member = project.editedBone!;
  project = await edit(native, project, {type: 'createSlot', bone: member, name: 'First slot'});
  const firstSlot = project.slots!.at(-1)!.id;
  project = await edit(native, project, {type: 'createSlot', bone: member, name: 'Second slot'});
  const secondSlot = project.slots!.at(-1)!.id;
  project = await edit(native, project, {type: 'addConstraint', constraint: {
    type: 'ik', name: 'Timeline IK', bones: [member], target: root, mix: 0, softness: 0,
    stretch: false, compress: false, bendPositive: true,
  }});
  const constraint = project.constraints!.at(-1)!.id;
  project = await edit(native, project, {type: 'createAnimation', name: 'Locked rows'});
  const animation = project.editedAnimation!;
  await edit(native, project, {type: 'setAnimationKeys', animation, keys: [
    {bone: root, channel: 'rotate', frame: 8, values: [12, 0], curve: 'linear'},
    {bone: member, channel: 'scale', frame: 42, values: [1.2, .9], curve: 'linear'},
  ]});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await treeItem(page, 'bone', root).click();

  const lock = page.getByTestId('timeline-row-lock');
  const refresh = page.getByTestId('timeline-row-refresh');
  const select = page.getByTestId('timeline-row-select');
  const rootRotate = page.getByTestId(`timeline-key-bone-${root}-rotate`);
  const memberScale = page.getByTestId(`timeline-key-bone-${member}-scale`);
  const firstSlotColor = page.getByTestId(`timeline-key-slot-${firstSlot}-rgba`);
  const secondSlotColor = page.getByTestId(`timeline-key-slot-${secondSlot}-rgba`);
  const ik = page.getByTestId(`timeline-key-constraint-${constraint}-ik`);
  const before = await native.snapshot();
  const start = native.calls.length;
  await expect(rootRotate).toBeVisible();
  await expect(refresh).toBeDisabled();
  await lock.press('Space');
  await expect(lock).toHaveAttribute('aria-pressed', 'true');
  await treeItem(page, 'slot', firstSlot).click();
  await expect(rootRotate).toBeVisible();
  await expect(firstSlotColor).toHaveCount(0);

  await refreshScope();
  await expect(firstSlotColor).toBeVisible();
  await expect(rootRotate).toHaveCount(0);
  await expect(memberScale).toHaveCount(0);
  await treeItem(page, 'slot', secondSlot).click();
  await expect(firstSlotColor).toBeVisible();
  await expect(secondSlotColor).toHaveCount(0);

  await treeItem(page, 'constraint', constraint).click();
  await expect(firstSlotColor).toBeVisible();
  await refreshScope();
  await expect(ik).toBeVisible();
  await expect(firstSlotColor).toHaveCount(0);
  // IK rows are represented under the target bone in FBones.
  await expect(page.getByTestId(`timeline-bone-row-${root}`)).toBeVisible();
  await treeItem(page, 'bone', member).click();
  await expect(ik).toBeVisible();
  await select.press('Space');
  await expect(treeItem(page, 'bone', root)).toHaveAttribute('aria-selected', 'true');
  await expect(treeItem(page, 'bone', member)).toHaveAttribute('aria-selected', 'false');

  await treeItem(page, 'slot', firstSlot).click();
  await refreshScope();
  await treeItem(page, 'bone', root).click();
  await expect(firstSlotColor).toBeVisible();
  await select.press('Space');
  await expect(treeItem(page, 'bone', member)).toHaveAttribute('aria-selected', 'true');
  await expect(treeItem(page, 'bone', root)).toHaveAttribute('aria-selected', 'false');
  await expect(firstSlotColor).toBeVisible();
  await expect(memberScale).toHaveCount(0);

  await lock.press('Enter');
  await expect(lock).toHaveAttribute('aria-pressed', 'false');
  await expect(memberScale).toBeVisible();
  await treeItem(page, 'bone', root).click();
  await expect(rootRotate).toBeVisible();
  await expect(memberScale).toHaveCount(0);
  await lock.press('Enter');
  await page.getByTestId('animation-select').selectOption(String(defaultAnimation));
  await expect(lock).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(rootRotate).toBeVisible();
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toEqual([]);

  async function refreshScope() {
    await refresh.press('Enter');
    await expect(lock).toHaveAttribute('aria-pressed', 'true');
  }
});

test('@native timeline property filters retain independent view choices and protect hidden keys and duration', async ({page, native}, info) => {
  await page.setViewportSize({width: 1140, height: 800});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own timeline filters', discardChanges: true});
  const root = project.bones[0]!;
  project = await edit(native, project, {type: 'createAnimation', name: 'Independent filters'});
  const animation = project.editedAnimation!;
  project = await edit(native, project, {type: 'setAnimationKeys', animation, keys: [
    {bone: root.id, channel: 'rotate', frame: 8, values: [16, 0], curve: 'linear'},
    {bone: root.id, channel: 'rotate', frame: 120, values: [95, 0], curve: 'linear'},
    {bone: root.id, channel: 'translate', frame: 12, values: [21, -11], curve: 'linear'},
    {bone: root.id, channel: 'scale', frame: 16, values: [1.4, .8], curve: 'linear'},
    {bone: root.id, channel: 'shear', frame: 20, values: [18, -8], curve: 'linear'},
  ]});
  const clip = project.animations!.find(clip => clip.id === animation)!;
  const key = (channel: string) => clip.tracks.find(track => track.channel === channel)!.keys[0]!.id;
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));

  const timeline = page.getByTestId('animation-timeline');
  const graph = page.getByTestId('timeline-tab-graph');
  const dopesheet = page.getByTestId('timeline-tab-dopesheet');
  const filter = page.getByTestId('timeline-row-filter');
  const filterPanel = page.getByTestId('timeline-row-filters');
  const currentTool = page.getByTestId('timeline-row-filter-current-tool');
  const transformTools = page.getByTestId('animation-tools');
  const reset = page.getByTestId('timeline-row-filter-reset');
  const close = page.getByTestId('timeline-row-filter-close');
  const graphKey = (channel: string) => page.getByTestId(`timeline-graph-key-${key(channel)}-0`);
  const sheetKey = (channel: string) => page.getByTestId(`timeline-key-${key(channel)}`);
  const category = (id: string) => page.getByTestId(`timeline-row-filter-${id}`);
  const storedRotate = page.getByTestId(`timeline-stored-curve-${root.id}:rotate-0`);
  await graph.click();
  await page.getByTestId('timeline-tool-store').click();
  await expect(storedRotate).toBeVisible();
  const before = await native.snapshot();
  const start = native.calls.length;

  await graphKey('rotate').press('Enter');
  await expect(graphKey('rotate')).toHaveAttribute('aria-pressed', 'true');
  await filter.press('Enter');
  await expect(filterPanel).toBeVisible();
  await category('translate').click();
  await expect(graphKey('translate')).toBeVisible();
  await expect(graphKey('rotate')).toHaveCount(0);
  await expect(graphKey('scale')).toHaveCount(0);
  await expect(storedRotate).toHaveCount(0);
  await expect(page.getByTestId('timeline-key-inspector')).toHaveCount(0);
  await expect(page.getByTestId('timeline-delete-keys')).toBeDisabled();
  await timeline.press('Delete');
  expect(await native.snapshot()).toEqual(before);

  await addCategory('scale', 'Control');
  await expect(graphKey('translate')).toBeVisible();
  await expect(graphKey('scale')).toBeVisible();
  await addCategory('shear', 'Meta');
  await expect(graphKey('shear')).toBeVisible();
  await addCategory('shear', 'Shift');
  await expect(graphKey('shear')).toHaveCount(0);
  await expect(graphKey('scale')).toBeVisible();
  if (await filterPanel.isVisible()) await close.click();

  await dopesheet.click();
  await expect(sheetKey('rotate')).toBeVisible();
  await expect(sheetKey('translate')).toBeVisible();
  await expect(sheetKey('scale')).toBeVisible();
  await filter.press('Space');
  await category('scale').click();
  await expect(sheetKey('rotate')).toHaveCount(0);
  await expect(sheetKey('translate')).toHaveCount(0);
  await expect(sheetKey('scale')).toBeVisible();
  if (await filterPanel.isVisible()) await close.click();
  await page.getByRole('button', {name: `Collapse ${root.name}`, exact: true}).click();
  await expect(sheetKey('scale')).toHaveCount(0);
  await expect(timeline.locator(`.at-summary-key[data-timeline-key-id="${key('scale')}"]`)).toHaveCount(2);
  await expect(timeline.locator(`.at-summary-key[data-timeline-key-id="${key('rotate')}"]`)).toHaveCount(0);
  await page.getByRole('button', {name: `Expand ${root.name}`, exact: true}).click();
  await expect(sheetKey('scale')).toBeVisible();

  await graph.click();
  await expect(graphKey('translate')).toBeVisible();
  await expect(graphKey('scale')).toBeVisible();
  await expect(graphKey('rotate')).toHaveCount(0);
  await filter.click({button: 'right'});
  await expect(graphKey('rotate')).toBeVisible();
  await filter.click({button: 'right'});
  await expect(graphKey('rotate')).toHaveCount(0);
  await filter.press('Enter');
  await currentTool.press('Enter');
  await expect(currentTool).toHaveAttribute('aria-pressed', 'true');
  await transformTools.getByRole('button', {name: 'Rotate', exact: true}).click();
  await expect(graphKey('rotate')).toBeVisible();
  await expect(graphKey('translate')).toHaveCount(0);
  await expect(graphKey('scale')).toHaveCount(0);
  await transformTools.getByRole('button', {name: 'Scale', exact: true}).click();
  await expect(graphKey('scale')).toBeVisible();
  await expect(graphKey('rotate')).toHaveCount(0);
  if (await filterPanel.isHidden()) await filter.press('Enter');
  await currentTool.press('Space');
  await expect(currentTool).toHaveAttribute('aria-pressed', 'false');
  await expect(graphKey('translate')).toBeVisible();
  await expect(graphKey('scale')).toBeVisible();
  await expect(graphKey('rotate')).toHaveCount(0);

  await page.setViewportSize({width: 960, height: 740});
  await expect(filterPanel).toBeVisible();
  await page.screenshot({path: info.outputPath('timeline-row-filters.png')});
  await page.setViewportSize({width: 1140, height: 800});
  await reset.press('Space');
  await expect(graphKey('rotate')).toBeVisible();
  await expect(storedRotate).toBeVisible();
  if (await filterPanel.isVisible()) await close.click();

  await graphKey('rotate').press('Enter');
  await expect(graphKey('rotate')).toHaveAttribute('aria-pressed', 'true');
  await dopesheet.click();
  await expect(sheetKey('rotate')).toHaveCount(0);
  await expect(sheetKey('scale')).toBeVisible();
  await expect(page.getByTestId('timeline-delete-keys')).toBeDisabled();
  await timeline.press('Delete');
  await timeline.getByRole('button', {name: 'Last frame', exact: true}).press('Enter');
  await expect(page.getByTestId('timeline-current')).toHaveValue('120');
  expect((await native.snapshot())?.animations?.find(item => item.id === animation)?.duration).toBe(120);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig')).toEqual([]);

  async function addCategory(id: string, modifier: 'Control' | 'Meta' | 'Shift') {
    if (await filterPanel.isHidden()) await filter.press('Enter');
    await category(id).click({modifiers: [modifier]});
  }
});
