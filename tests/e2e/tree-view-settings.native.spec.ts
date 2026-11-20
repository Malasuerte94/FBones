import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test} from './fixtures/native-session';

test('@native Tree View Settings shorten exact skeleton prefixes while search and rename retain full names', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 800});
  const skeleton = 'Armature';
  let project = await native.invoke<ProjectSummary>('create_project', {name: skeleton, discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const addBone = async (name: string) => {
    await edit({type: 'create', parent: root, x: 24, y: 8, rotation: 13, length: 19});
    const bone = project.bones.find(entry => entry.id === project.editedBone)!;
    await edit({...bone, type: 'update', name});
    return bone.id;
  };
  const raw = `${skeleton}/arm/inside`;
  const rawSlot = `${skeleton}/art/sleeve`;
  const target = await addBone(raw);
  await edit({type: 'createSlot', bone: target, name: rawSlot});
  const slot = project.editedSlot!;
  const unchanged: [number, string][] = [];
  for (const name of ['armature/lower', 'Other Armature/inside', 'Armature2/neighbor', 'Armature/']) {
    unchanged.push([await addBone(name), name]);
  }

  await openNativeEditor(page);
  const dock = page.getByTestId('dock-panel-tree');
  const width = page.getByTestId('dock-width-scene');
  for (let index = 0; index < 7; index++) await width.press('ArrowRight');
  await expect(width).toHaveAttribute('aria-valuenow', '180');
  const trigger = dock.getByTestId('tree-view-settings');
  const menu = page.getByTestId('tree-view-settings-menu');
  const hide = menu.getByTestId('tree-hide-skeleton-names');
  const search = dock.getByRole('searchbox');
  const row = (kind: 'bone' | 'slot', id: number) => dock
    .locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const treeBone = row('bone', target);
  const treeSlot = row('slot', slot);
  const boneLabel = treeBone.locator('.tree-result-name');
  const leaf = page.getByTestId('viewport-selection-path-leaf');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const before = (await native.snapshot())!;
  expect(before.name).toBe(skeleton);
  const start = native.calls.length;

  await expect(trigger).toHaveAccessibleName('Tree View Settings');
  await expect.poll(() => dock.locator('header').first().getByRole('button').evaluateAll(buttons =>
    buttons.map(button => button.getAttribute('data-testid')))).toEqual(['dock-drag-tree', 'tree-view-settings', 'dock-pane-actions-tree']);
  await expect(boneLabel).toHaveText(raw);
  await expect(treeSlot.locator('.tree-result-name')).toHaveText(rawSlot);
  await trigger.press('Enter');
  await expect(menu).toHaveAccessibleName('Tree View Settings');
  await expect(hide).toHaveAccessibleName('Hide skeleton names');
  await expect(hide).toBeFocused();
  await expect(hide).not.toBeChecked();
  await expect.poll(() => menu.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight;
  })).toBe(true);
  for (const id of ['show-slot-folders-under-bones', 'show-slot-paths', 'show-all-skin-attachments', 'hide-skin-names', 'hide-skin-bones-and-constraints', 'hide-viewport-skin-bones']) {
    await expect(menu.getByTestId(`tree-view-settings-${id}`)).toBeDisabled();
  }
  await hide.press('Space');
  await expect(hide).toBeChecked();
  await hide.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(boneLabel).toHaveText('...arm/inside');
  await expect(treeBone).toHaveAccessibleDescription(raw);
  await expect(treeBone).toHaveAttribute('title', raw);
  await expect(treeSlot.locator('.tree-result-name')).toHaveText('...art/sleeve');
  await expect(treeSlot).toHaveAccessibleDescription(rawSlot);
  for (const [id, name] of unchanged) await expect(row('bone', id).locator('.tree-result-name')).toHaveText(name);

  await search.fill(`${skeleton}/arm/`);
  await expect(boneLabel).toHaveText('...arm/inside');
  await expect(row('bone', unchanged[0]![0])).toHaveCount(0);
  await search.press('Enter');
  await expect(treeBone).toHaveAttribute('aria-selected', 'true');
  await expect(leaf).toHaveText(raw);
  const findReplace = dock.getByTestId('tree-find-replace');
  await findReplace.click();
  const rename = page.getByTestId('tree-find-replace-dialog');
  await rename.getByTestId('tree-find').fill(`${skeleton}/arm/`);
  await rename.getByTestId('tree-replace').fill('changed/');
  const hit = rename.getByTestId(`tree-rename-row-${target}`);
  await expect(hit).toContainText(raw);
  await expect(hit).toContainText('changed/inside');
  await rename.getByTestId('tree-find').press('Escape');
  await expect(rename).toBeHidden();
  await expect(search).toHaveValue(`${skeleton}/arm/`);
  await search.clear();

  await page.getByTestId('editor-mode-animate').click();
  await expect(boneLabel).toHaveText('...arm/inside');
  await canvas.press('F9');
  await expect(dock).toBeHidden();
  await canvas.press('F9');
  await expect(boneLabel).toHaveText('...arm/inside');
  await page.getByTestId('editor-mode-setup').click();
  await trigger.press('Enter');
  await expect(hide).toBeChecked();
  await hide.press('Space');
  await expect(hide).not.toBeChecked();
  await hide.press('Escape');
  await expect(boneLabel).toHaveText(raw);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});
