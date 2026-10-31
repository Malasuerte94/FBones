import {test,expect,openBrowserEditor} from './fixtures/browser';
import {showOwnReadonlyScene} from './fixtures/own-scene';

test('own readonly scene renders real geometry and preserves latent attachment selection through Tree filters',async({page},testInfo)=>{
  await openBrowserEditor(page);await showOwnReadonlyScene(page);
  await expect(page.getByRole('heading',{name:'Own F302 viewport fixture',exact:true})).toBeVisible();
  const row=page.locator('[data-tree-kind="attachment"][data-tree-id="40"] [role="treeitem"]');await row.click();await expect(row).toHaveAttribute('aria-selected','true');
  const filter=page.getByTestId('tree-filter-attachment');await filter.click();await expect(filter).toHaveAttribute('aria-pressed','false');await expect(row).toHaveCount(0);await filter.click();await expect(row).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
  const viewport=page.getByTestId('viewport').locator('canvas');await expect(viewport).toBeVisible();
  await testInfo.attach('own-readonly-scene',{body:await viewport.screenshot(),contentType:'image/png'});
});

test('readonly Weights target and hover act on real inventory without enabling native edits or activating alternatives',async({page})=>{
  await openBrowserEditor(page);await showOwnReadonlyScene(page);
  await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Weights',exact:true}).click();
  const inactive=page.locator('[data-tree-kind="attachment"][data-tree-id="42"]');await inactive.getByRole('treeitem').click();
  await expect(page.getByTestId('weights-target')).toHaveText('Own inactive');await expect(inactive.getByTestId('attachment-activation')).toHaveAttribute('aria-pressed','false');await expect(page.locator('[data-tree-kind="attachment"][data-tree-id="40"]').getByTestId('attachment-activation')).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('weights-bind')).toBeDisabled();await expect(page.getByTestId('weights-auto')).toBeDisabled();await expect(page.getByTestId('weights-direct-number')).toBeDisabled();
  const canvas=page.getByTestId('viewport').locator('canvas'),before=await canvas.screenshot(),influence=page.locator('[data-weight-bone="2"]');await influence.hover();await expect(influence).toHaveAttribute('data-bone-hovered','true');await expect(page.locator('[data-tree-kind="bone"][data-tree-id="2"]')).toHaveAttribute('data-bone-hovered','true');
  await expect.poll(async()=>(await canvas.screenshot()).equals(before)).toBe(false);
  await page.getByRole('button',{name:'Reset view',exact:true}).hover();await expect(influence).not.toHaveAttribute('data-bone-hovered','true');
  await expect(inactive.getByTestId('attachment-activation')).toHaveAttribute('aria-pressed','false');
});
