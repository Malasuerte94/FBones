import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test} from './fixtures/native-session';

test('@native Tree search navigates literal displayed matches with local scroll, keyboard and typed selection', async ({page, native}) => {
  await page.setViewportSize({width: 1280, height: 720});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Tree search navigation', discardChanges: true});
  const root = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const addBone = async (name: string, x: number, parent = root) => {
    await edit({type: 'create', parent, x, y: 0, rotation: 0, length: 20});
    const bone = project.bones.find(entry => entry.id === project.editedBone)!;
    await edit({...bone, type: 'update', name});
    return bone.id;
  };
  const branch = await addBone('Visible ancestor context', -40);
  const first = await addBone('Needle.42 first', -28, branch);
  await edit({type: 'createSlot', bone: first, name: 'Needle.42 slot'});
  const slot = project.editedSlot!;
  const middle = await addBone('Needle.42 middle', -10, branch);
  for (let index = 0; index < 15; index++) await addBone(`Needle.42 filler ${index}`, 5 + index, branch);
  const near = await addBone('NeedleX42 near', 20, branch);
  const last = await addBone('Needle.42 last', 30, branch);

  await openNativeEditor(page);
  const dock = page.getByTestId('dock-panel-tree');
  const width = page.getByTestId('dock-width-scene');
  for (let index = 0; index < 7; index++) await width.press('ArrowRight');
  await expect(width).toHaveAttribute('aria-valuenow', '180');
  const hierarchy = dock.getByRole('tree');
  const search = dock.getByRole('searchbox', {name: 'Search tree…'});
  const previous = dock.getByTestId('tree-search-previous');
  const next = dock.getByTestId('tree-search-next');
  const slotFilter = dock.getByTestId('tree-filter-slot');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const leaf = page.getByTestId('viewport-selection-path-leaf');
  const row = (kind: 'bone' | 'slot', id: number) => hierarchy
    .locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');
  const check = async (kind: 'bone' | 'slot', id: number) => {
    await expect(row(kind, id)).toHaveAttribute('aria-selected', 'true');
    await expect(leaf).toHaveAttribute('data-kind', kind);
    await expect(leaf).toHaveAttribute('data-selection-id', String(id));
  };
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const outside = await page.evaluate(() => ({x: window.scrollX, y: window.scrollY}));
  await expect(previous).toHaveAccessibleName('Previous search result');
  await expect(next).toHaveAccessibleName('Next search result');
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await expect.poll(async () => {
    const [panel, input, back, forward] = await Promise.all([dock.boundingBox(), search.boundingBox(), previous.boundingBox(), next.boundingBox()]);
    return !!panel && !!input && !!back && !!forward && input.x >= panel.x &&
      input.x + input.width <= back.x + 1 && back.x + back.width <= forward.x + 1 &&
      forward.x + forward.width <= panel.x + panel.width + 1;
  }).toBe(true);

  await canvas.press('Enter');
  await expect(search).toBeFocused();
  await search.fill('needle.42');
  await expect(row('bone', branch)).toBeVisible();
  await expect(row('bone', near)).toHaveCount(0);
  await search.press('Enter');
  await check('bone', first);
  await search.press('Shift+Enter');
  await check('bone', last);
  await expect.poll(() => hierarchy.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(row('bone', last)).toBeInViewport();
  await search.press('F3');
  await check('bone', first);
  await search.press('F3');
  await check('slot', slot);
  await search.press('Shift+F3');
  await check('bone', first);

  await previous.click();
  await expect(search).toBeFocused();
  await check('bone', last);
  await next.click();
  await expect(search).toBeFocused();
  await check('bone', first);
  await row('slot', slot).click();
  await search.press('Enter');
  await check('bone', middle);

  await row('bone', first).click();
  await slotFilter.click();
  await expect(row('slot', slot)).toHaveCount(0);
  const otherInput = page.getByTestId('bone-name');
  await otherInput.press('F3');
  await expect(otherInput).toBeFocused();
  await check('bone', first);
  await canvas.press('F3');
  await expect(canvas).toBeFocused();
  await check('bone', middle);

  const rotate = page.getByTestId('animation-tools').getByRole('button', {name: 'Rotate', exact: true});
  await rotate.click();
  await search.fill('needle.42 middle');
  await search.press('Enter');
  await check('bone', middle);
  await expect(rotate).toHaveAttribute('aria-pressed', 'true');

  await search.fill('absent literal');
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await search.press('F3');
  await expect(leaf).toHaveAttribute('data-selection-id', String(middle));
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await check('bone', middle);

  await search.fill('needle.42');
  await canvas.press('F9');
  await expect(dock).toBeHidden();
  await canvas.press('Shift+F3');
  await canvas.press('Enter');
  await expect(canvas).toBeFocused();
  await expect(leaf).toHaveAttribute('data-selection-id', String(middle));
  await canvas.press('F9');
  await expect(search).toHaveValue('needle.42');
  await expect(row('slot', slot)).toHaveCount(0);
  await check('bone', middle);
  expect(await page.evaluate(() => ({x: window.scrollX, y: window.scrollY}))).toEqual(outside);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => ['edit_rig', 'evaluate_project', 'save_project'].includes(call.command))).toHaveLength(0);
});

test('@native Tree search follows visible animation and event results through their normal selection routes', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Tree search sections', discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'createAnimation', name: 'Pulse animation'});
  const animationId = project.editedAnimation!;
  await edit({type: 'createAnimation', name: 'Other animation'});
  const otherId = project.editedAnimation!;
  await edit({type: 'createEvent', name: 'Pulse event'});
  const eventId = project.editedEvent!;
  const before = await native.snapshot();

  await openNativeEditor(page);
  const tree = page.getByTestId('dock-panel-tree');
  const search = tree.getByRole('searchbox');
  const next = tree.getByTestId('tree-search-next');
  const animationGroup = tree.getByRole('button', {name: 'Animations', exact: false});
  const animation = tree.getByTestId(`tree-animation-${animationId}`);
  const event = tree.getByTestId(`tree-event-${eventId}`);
  const animate = page.getByTestId('editor-mode-animate');

  await animationGroup.click();
  await search.fill('pulse');
  await expect(animation).toHaveCount(0);
  await expect(next).toBeEnabled();
  await search.press('Enter');
  await expect(event.locator('..')).toHaveClass(/selected/);
  await expect(animate).toHaveAttribute('aria-pressed', 'false');

  await animationGroup.click();
  await search.press('Enter');
  await expect(animate).toHaveAttribute('aria-pressed', 'true');
  await expect(animation).toHaveClass(/selected/);
  await expect(search).toHaveValue('pulse');
  await expect(search).toBeFocused();
  await search.press('F3');
  await expect(event.locator('..')).toHaveClass(/selected/);

  await search.fill('other animation');
  await search.press('Enter');
  await expect(tree.getByTestId(`tree-animation-${otherId}`)).toHaveClass(/selected/);
  await page.getByTestId('dock-pane-actions-tree').press('Enter');
  await page.getByTestId('dock-minimize-tree').press('Enter');
  await expect(tree).toBeHidden();
  await page.getByTestId('editor-mode-setup').click();
  await expect(tree).toBeVisible();
  await search.fill('pulse animation');
  await search.press('Enter');
  await expect(animate).toHaveAttribute('aria-pressed', 'true');
  await expect(tree).toBeHidden();
  await page.getByTestId('restore-dock-tree').click();
  await expect(animation).toHaveClass(/selected/);
  expect(await native.snapshot()).toEqual(before);
});
