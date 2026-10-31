import {test as base,expect,type Page} from '@playwright/test';

/** Real Linux Chromium. No native bridge is installed in these preview tests. */
export const test=base.extend<{runtimeErrors:void}>({
  runtimeErrors:[async({page},use)=>{
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await use();
    expect(errors,'Unhandled browser runtime errors').toEqual([]);
  },{auto:true}],
});
export{expect};

export async function openBrowserEditor(page:Page){
  const response=await page.goto('/');
  expect(response?.ok()).toBe(true);
  await expect(page.getByTestId('viewport').locator('canvas')).toBeVisible();
  await expect(page.getByText('Opening workspace…',{exact:true})).toHaveCount(0);
  await expect(page.getByText('The viewport could not start.',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>typeof (globalThis as {__TAURI__?:unknown}).__TAURI__)).toBe('undefined');
  return response!;
}

export async function createBrowserDraft(page:Page,name:string){
  await page.getByRole('button',{name:'New project',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Start a new project'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox',{name:'Project name',exact:true}).fill(name);
  await dialog.getByRole('button',{name:'Create project',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(name));
}
