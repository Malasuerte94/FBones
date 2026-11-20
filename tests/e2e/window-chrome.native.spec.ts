import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native title bar keeps window controls and routes dirty Close through the Session', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 640});
  await openNativeEditor(page);
  const name = 'Own window frame with a long document name to exercise title truncation';
  await page.keyboard.press('Control+n');
  const create = page.getByRole('dialog', {name: 'Start a new project'});
  await create.getByRole('textbox', {name: 'Project name', exact: true}).fill(name);
  await create.getByRole('button', {name: 'Create project', exact: true}).click();
  await expect(create).toBeHidden();
  const header = page.getByTestId('window-titlebar');
  const drag = header.getByTestId('window-title-drag');
  const close = header.getByTestId('window-close');
  const maximize = header.getByTestId('window-maximize');
  await expect(drag).toContainText(name);
  await expect(drag).toHaveAttribute('data-tauri-drag-region');
  await expect.poll(() => header.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await expect(header.getByTestId('window-minimize')).toHaveAccessibleName('Minimize window');
  await expect(maximize).toHaveAccessibleName('Maximize window');
  await maximize.press('Space');
  await expect(maximize).toHaveAccessibleName('Restore window');
  await maximize.click();
  await expect(maximize).toHaveAccessibleName('Maximize window');

  const root = (await native.snapshot())!.bones[0]!;
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${root.id}"]`).getByRole('treeitem').click();
  await native.queueDialog('save', null);
  const x = page.getByTestId('bone-x');
  await x.fill('23.25');
  await x.press('Control+s');
  await expect.poll(() => native.calls.filter(call => call.command === 'save_project').length).toBe(1);
  const before = await native.snapshot();
  expect(before?.bones[0]?.x).toBe(23.25);
  expect(before?.dirty).toBe(true);
  await native.queueDialog('folder', null);
  const file = header.getByTestId('file-menu-toggle');
  await file.press('Enter');
  await expect(page.getByTestId('file-choose-images')).toBeEnabled();
  await page.getByTestId('file-choose-images').click();
  await expect.poll(() => native.calls.filter(call => call.command === 'choose_images_folder').length).toBe(1);
  await expect(page.getByTestId('file-menu-panel')).toBeHidden();
  await expect(close).toHaveAccessibleName('Close window');
  await page.screenshot({path: info.outputPath('window-titlebar.png')});

  const dirty = page.getByRole('dialog', {name: 'Leave this project?'});
  await page.keyboard.press('Control+w');
  await expect(dirty).toBeVisible();
  await dirty.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(dirty).toBeHidden();
  expect(await native.snapshot()).toEqual(before);

  await close.press('Enter');
  await expect(dirty).toBeVisible();
  await dirty.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(dirty).toBeHidden();
  expect(await native.snapshot()).toEqual(before);

  await close.click();
  await dirty.getByRole('button', {name: 'Discard changes', exact: true}).click();
  await expect.poll(() => native.snapshot()).toBeNull();
  expect(native.calls.filter(call => call.command === 'close_project').map(call => call.args)).toEqual([{discardChanges: true}]);
});
