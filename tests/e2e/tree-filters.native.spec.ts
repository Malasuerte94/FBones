import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test} from './fixtures/native-session';

test('@native Tree filter bypass restores saved categories and retains the inspected inactive mesh', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 840});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Tree filter bypass', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'createSlot', bone: root, name: 'Mesh owner'});
  const owner = project.editedSlot!;
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const place = async () => {
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot: owner, keys: ['board']});
    return project.editedAttachment!;
  };
  const region = await place();
  const mesh = await place();
  await edit({type: 'renameAttachment', id: mesh, name: 'Hidden mesh target'});
  await edit({type: 'attachmentEdit', id: mesh, edit: {type: 'convertMesh', id: owner}});
  await edit({type: 'setActiveAttachment', slot: owner, attachment: region});

  await openNativeEditor(page);
  const dock = page.getByTestId('dock-panel-tree');
  const sash = page.getByTestId('dock-width-scene');
  for (let index = 0; index < 7; index++) await sash.press('ArrowRight');
  await expect(sash).toHaveAttribute('aria-valuenow', '180');
  const trigger = dock.getByTestId('tree-filter-menu-trigger');
  const menu = page.getByTestId('tree-filter-menu');
  const bypass = menu.getByTestId('tree-filter-bypass');
  const reset = menu.getByTestId('tree-filter-reset');
  const textSearch = menu.getByTestId('tree-filter-text-search');
  const quick = (kind: string) => dock.getByTestId(`tree-filter-${kind}`);
  const saved = (kind: string) => menu.getByTestId(`tree-filter-menu-${kind}`);
  const search = dock.getByRole('searchbox');
  const meshRow = dock.locator(`[data-tree-kind="attachment"][data-tree-id="${mesh}"]`).getByRole('treeitem');
  const leaf = page.getByTestId('viewport-selection-path-leaf');
  const weights = page.getByTestId('viewport-edit-weights');
  const openMenu = async () => {
    await trigger.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
  };
  const kinds = ['bone', 'slot', 'attachment', 'constraint'];
  const effective = async (visible: readonly boolean[]) => {
    for (const [index, kind] of kinds.entries()) await expect(quick(kind)).toHaveAttribute('aria-pressed', String(visible[index]));
  };
  const selection = async () => {
    await expect(leaf).toHaveAttribute('data-kind', 'mesh');
    await expect(leaf).toHaveAttribute('data-selection-id', String(mesh));
    await expect(search).toHaveValue('hidden mesh');
  };
  const before = (await native.snapshot())!;
  expect(before.slots.find(slot => slot.id === owner)?.activeAttachmentId).toBe(region);
  const start = native.calls.length;

  await meshRow.click();
  await search.fill('hidden mesh');
  await expect(weights).toBeVisible();
  await quick('attachment').click();
  await quick('constraint').click();
  await effective([true, true, false, false]);
  await expect(meshRow).toHaveCount(0);
  await expect(weights).toBeHidden();
  await selection();

  await expect(trigger).toHaveAccessibleName('Tree filters');
  await openMenu();
  await expect(saved('bone')).toBeFocused();
  await expect(menu.getByTestId('tree-filter-menu-mesh')).toBeDisabled();
  await expect.poll(() => menu.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight;
  })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click({button: 'right'});
  await expect(trigger).toHaveAccessibleDescription('Type filters bypassed');
  await effective([true, true, true, true]);
  await expect(meshRow).toHaveAttribute('aria-selected', 'true');
  await expect(weights).toBeVisible();
  await selection();
  await openMenu();
  await expect(bypass).toHaveAttribute('aria-pressed', 'true');
  await expect(saved('attachment')).not.toBeChecked();
  await expect(saved('constraint')).not.toBeChecked();
  await saved('slot').uncheck();
  await effective([true, true, true, true]);
  await expect(meshRow).toHaveAttribute('aria-selected', 'true');
  await bypass.click();
  await expect(bypass).toHaveAttribute('aria-pressed', 'false');
  await effective([true, false, false, false]);
  await expect(meshRow).toHaveCount(0);
  await expect(weights).toBeHidden();
  await selection();
  await page.keyboard.press('Escape');

  await trigger.click({button: 'right'});
  await effective([true, true, true, true]);
  await quick('attachment').click();
  await effective([true, false, false, false]);
  await expect(meshRow).toHaveCount(0);
  await selection();
  await trigger.click({button: 'right'});
  await openMenu();
  await expect(bypass).toHaveAttribute('aria-pressed', 'true');
  await expect(textSearch).toBeChecked();
  await textSearch.uncheck();
  await reset.click();
  await expect(bypass).toHaveAttribute('aria-pressed', 'false');
  await expect(textSearch).not.toBeChecked();
  for (const kind of kinds) await expect(saved(kind)).toBeChecked();
  await effective([true, true, true, true]);
  await expect(meshRow).toHaveAttribute('aria-selected', 'true');
  await expect(weights).toBeVisible();
  await selection();

  await bypass.press('F9');
  await expect(dock).toBeHidden();
  await expect(menu).toBeHidden();
  await page.getByTestId('viewport').locator('canvas').press('F9');
  await expect(dock).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await selection();
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});

test('@native highlight-only Tree search keeps unmatched rows and navigates only visible direct matches', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own highlight-only Tree search', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const create = async (name: string, parent = root) => {
    await edit({type: 'create', parent, x: 12, y: 8, rotation: 0, length: 18});
    const bone = project.bones.find(entry => entry.id === project.editedBone)!;
    await edit({...bone, type: 'update', name});
    return bone.id;
  };
  const first = await create('Needle first');
  const unmatched = await create('Unrelated visible row');
  const branch = await create('Latent branch');
  const hidden = await create('Needle nested', branch);
  const last = await create('Needle last');

  await openNativeEditor(page);
  const dock = page.getByTestId('dock-panel-tree');
  const search = dock.getByRole('searchbox');
  const trigger = dock.getByTestId('tree-filter-menu-trigger');
  const menu = page.getByTestId('tree-filter-menu');
  const filter = menu.getByTestId('tree-filter-text-search');
  const row = (id: number) => dock.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`);
  const item = (id: number) => row(id).getByRole('treeitem');
  const selected = (id: number) => expect(item(id)).toHaveAttribute('aria-selected', 'true');
  const before = (await native.snapshot())!;
  const start = native.calls.length;

  await item(branch).press('ArrowLeft');
  await expect(item(branch)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(hidden)).toHaveCount(0);
  await search.fill('needle');
  await expect(row(unmatched)).toHaveCount(0);
  await expect(row(hidden)).toBeVisible();
  await trigger.press('Enter');
  await filter.uncheck();
  await expect(search).toHaveValue('needle');
  await expect(row(unmatched)).toBeVisible();
  await expect(row(hidden)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(item(branch)).toHaveAttribute('aria-expanded', 'false');
  for (const id of [first, last]) await expect(row(id)).toHaveAttribute('data-tree-search-match', 'true');
  for (const id of [root, unmatched, branch]) await expect(row(id)).not.toHaveAttribute('data-tree-search-match', 'true');
  await item(unmatched).click();
  await search.press('Enter');
  await selected(first);
  await search.press('F3');
  await selected(last);
  await search.press('Shift+Enter');
  await selected(first);
  await expect(search).toBeFocused();

  await trigger.press('Enter');
  await filter.check();
  await expect(row(unmatched)).toHaveCount(0);
  await expect(row(hidden)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('needle');
  await search.press('F3');
  await selected(hidden);
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(row(unmatched)).toBeVisible();
  await expect(item(branch)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(hidden)).toHaveCount(0);
  await expect(page.getByTestId('viewport-selection-path-leaf')).toHaveAttribute('data-selection-id', String(hidden));
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});
