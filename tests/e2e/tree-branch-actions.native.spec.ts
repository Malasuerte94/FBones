import {defaultDockLayout, dockStorageKey} from '../../src/domain/dockLayout';
import type {ProjectSummary} from '../../src/domain/project';
import {expect, openNativeEditor, test} from './fixtures/native-session';

test('@native Tree branch actions recurse in their addressed scope without authoring', async ({page, native}) => {
  await page.setViewportSize({width: 960, height: 720});
  const layout = defaultDockLayout(true);
  layout.columns.find(column => column.id === 'scene')!.width = 180;
  await page.addInitScript(({key, layout}) => localStorage.setItem(key, JSON.stringify(layout)), {
    key: dockStorageKey, layout,
  });

  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own branch actions', discardChanges: true});
  const root = project.bones[0]!.id;
  const add = async (parent: number, x: number, y: number) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision,
      edit: {type: 'create', parent, x, y, rotation: 0, length: 24}});
    return project.bones.find(bone => bone.id === project.editedBone)!;
  };
  const a = await add(root, -56, 40);
  const aChild = await add(a.id, 20, 0);
  const aLeaf = await add(aChild.id, 22, 0);
  const b = await add(root, 68, -38);
  const bChild = await add(b.id, 18, 0);
  const bLeaf = await add(bChild.id, 21, 0);

  await openNativeEditor(page);
  const dock = page.getByTestId('dock-panel-tree');
  const row = (id: number) => dock.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const collapse = dock.getByTestId('tree-collapse-branches');
  const expand = dock.getByTestId('tree-expand-branches');
  const search = dock.getByRole('searchbox');
  const before = (await native.snapshot())!;
  const start = native.calls.length;

  await expect(page.getByTestId('dock-width-scene')).toHaveAttribute('aria-valuenow', '180');
  await expect(collapse).toHaveAccessibleName('Collapse branches');
  await expect(expand).toHaveAccessibleName('Expand branches');
  for (const button of [collapse, expand]) {
    await expect(button).toBeVisible();
    await expect.poll(async () => {
      const [control, panel] = await Promise.all([button.boundingBox(), dock.boundingBox()]);
      return !!control && !!panel && control.x >= panel.x && control.x + control.width <= panel.x + panel.width + 1;
    }).toBe(true);
  }

  // Make A primary with its own descendant and sibling B still selected.
  await row(b.id).click();
  await row(aLeaf.id).click({modifiers: ['Control']});
  await row(a.id).click({modifiers: ['Control']});
  await collapse.click();
  await expect(row(a.id)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(a.id)).toHaveAttribute('aria-selected', 'true');
  await expect(row(aLeaf.id)).toHaveCount(0);
  await expect(row(b.id)).toHaveAttribute('aria-selected', 'true');
  await expect(row(bLeaf.id)).toBeVisible();
  await row(a.id).press('ArrowRight');
  await expect(row(aChild.id)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(aLeaf.id)).toHaveCount(0);
  await expand.click();
  await expect(row(aChild.id)).toHaveAttribute('aria-expanded', 'true');
  await expect(row(aLeaf.id)).toHaveAttribute('aria-selected', 'true');

  // Right-click on B addresses that branch while A remains the primary selection.
  await row(b.id).click({button: 'right'});
  await expect(row(b.id)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(b.id)).toHaveAttribute('aria-selected', 'true');
  await expect(row(aLeaf.id)).toBeVisible();
  await row(b.id).press('ArrowRight');
  await expect(row(bChild.id)).toHaveAttribute('aria-expanded', 'false');
  await row(b.id).press('ArrowLeft');
  await row(b.id).click({button: 'right'});
  await expect(row(bLeaf.id)).toBeVisible();

  await collapse.dblclick();
  await expect(row(root)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(b.id)).toHaveCount(0);
  await expand.dblclick();
  await expect(row(aLeaf.id)).toHaveAttribute('aria-selected', 'true');
  await expect(row(bLeaf.id)).toBeVisible();
  await expect(row(b.id)).toHaveAttribute('aria-selected', 'true');

  await page.getByTestId('viewport').locator('canvas').press('Escape');
  await expect(dock.getByRole('treeitem', {selected: true})).toHaveCount(0);
  await collapse.click();
  await expect(row(root)).toHaveAttribute('aria-expanded', 'false');
  await search.fill(aLeaf.name);
  await expect(collapse).toBeDisabled();
  await expect(expand).toBeDisabled();
  await expect(row(aLeaf.id)).toBeVisible();
  await search.clear();
  await expect(row(root)).toHaveAttribute('aria-expanded', 'false');
  await expand.click();
  await expect(row(aLeaf.id)).toBeVisible();
  await expect(row(bLeaf.id)).toBeVisible();
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toEqual([]);
});
