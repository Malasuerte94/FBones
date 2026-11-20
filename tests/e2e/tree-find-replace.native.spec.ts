import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test} from './fixtures/native-session';

test('@native Tree Find and Replace validates and applies included literal bone names in one Undo action', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 840});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Tree Find and Replace', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const bone = async (name: string, x: number, parent = root) => {
    await edit({type: 'create', parent, x, y: 6, rotation: 13, length: 25});
    const created = project.bones.find(item => item.id === project.editedBone)!;
    await edit({...created, type: 'update', name});
    return created.id;
  };
  const left = await bone('Arm.01 Left', -82);
  const right = await bone('Arm.01 Right', 32);
  const spare = await bone('Arm.01 Spare', 31, right);
  const near = await bone('ArmX01 Left', -36);
  const collision = await bone('Wing Left', 79);
  await edit({type: 'createAnimation', name: 'Retain the renamed bone tracks'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: right, channel: 'rotate', frame: 0, values: [15, 0], curve: 'linear'},
    {bone: spare, channel: 'translate', frame: 8, values: [12, 4], curve: 'linear'},
  ]});

  await openNativeEditor(page);
  const tree = page.getByTestId('dock-panel-tree');
  const treeRow = (id: number) => tree.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  const open = tree.getByTestId('tree-find-replace');
  const dialog = page.getByTestId('tree-find-replace-dialog');
  const find = dialog.getByTestId('tree-find');
  const replace = dialog.getByTestId('tree-replace');
  const scope = dialog.getByTestId('tree-replace-scope');
  const apply = dialog.getByTestId('tree-replace-apply');
  const cancel = dialog.getByRole('button', {name: 'Cancel', exact: true});
  const preview = (id: number) => dialog.getByTestId(`tree-rename-row-${id}`);
  const include = (id: number) => dialog.getByTestId(`tree-rename-include-${id}`);
  const titleToggle = page.getByTestId('minimize-docked-views');
  const create = page.getByTestId('animation-tools').getByRole('button', {name: 'Create', exact: true});
  const leaf = page.getByTestId('viewport-selection-path-leaf');
  await treeRow(right).click();
  await expect(treeRow(right)).toHaveAttribute('aria-selected', 'true');
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await expect(open).toHaveAccessibleName('Find and Replace');
  await open.press('Enter');
  await expect(dialog).toHaveAccessibleName('Find and Replace');
  await expect(find).toBeFocused();
  await find.press('Shift+Tab');
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await expect(find).not.toBeFocused();
  await page.keyboard.press('Tab');
  await expect(find).toBeFocused();
  await cancel.press('F9');
  await cancel.press('b');
  await expect(dialog).toBeVisible();
  await cancel.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await expect(titleToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(create).toHaveAttribute('aria-pressed', 'false');

  await open.click();
  await expect(find).toBeFocused();
  await expect(dialog.getByTestId('tree-find-field-path')).toHaveJSProperty('disabled', true);
  await expect(dialog.getByTestId('tree-find-regex')).toBeDisabled();
  await expect(scope).toHaveValue('project');
  await find.fill('Arm.01');
  await replace.fill('Wing');
  await expect(preview(left)).toContainText('Arm.01 Left');
  await expect(preview(left)).toContainText('Wing Left');
  await expect(preview(right)).toContainText('Wing Right');
  await expect(preview(spare)).toContainText('Wing Spare');
  await expect(preview(near)).toHaveCount(0);
  await expect(preview(collision)).toHaveCount(0);
  await expect(preview(left)).toHaveAttribute('data-issue', 'duplicate');
  await expect(include(left)).toHaveAccessibleDescription('Another bone would have the same name.');
  await expect(apply).toBeDisabled();

  await scope.selectOption('selection');
  await expect(preview(left)).toHaveCount(0);
  await expect(preview(spare)).toHaveCount(0);
  await expect(include(right)).toBeChecked();
  await expect(apply).toBeEnabled();
  await scope.selectOption('project');
  await expect(apply).toBeDisabled();
  await include(left).uncheck();
  await expect(include(right)).toBeChecked();
  await expect(include(spare)).toBeChecked();
  await expect(apply).toBeEnabled();
  await replace.press('Enter');
  await expect(dialog).toBeVisible();
  expect(edits()).toHaveLength(0);
  expect(await native.snapshot()).toEqual(before);

  await apply.click();
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await expect(treeRow(right)).toHaveAttribute('aria-selected', 'true');
  await expect(leaf).toHaveAttribute('data-selection-id', String(right));
  await expect(leaf).toHaveText('Wing Right');
  const renames = [{id: right, name: 'Wing Right'}, {id: spare, name: 'Wing Spare'}];
  const names = new Map(renames.map(entry => [entry.id, entry.name]));
  const renamedBones = before.bones.map(item => ({...item, name: names.get(item.id) ?? item.name}));
  const after = (await native.snapshot())!;
  expect(after.revision).toBe(before.revision + 1);
  expect(after.bones).toEqual(renamedBones);
  expect(after.animations).toEqual(before.animations);
  expect(edits().map(call => call.args)).toEqual([{expectedRevision: before.revision, edit: {type: 'renameBones', renames}}]);

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.bones).toEqual(before.bones);
  await page.getByRole('button', {name: 'Redo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.bones).toEqual(renamedBones);
  expect((await native.snapshot())!.animations).toEqual(before.animations);
  expect(edits().map(call => (call.args.edit as RigEdit).type)).toEqual(['renameBones', 'undo', 'redo']);
});
