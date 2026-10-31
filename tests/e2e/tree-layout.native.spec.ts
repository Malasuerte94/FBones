import {test,expect,openNativeEditor,newNativeProject} from './fixtures/native-session';

test('@native Tree New opens a visible usable menu and starts the selected creation flow',async({page,native})=>{
 await openNativeEditor(page);await newNativeProject(page,'Tree menu regression');
 expect((await native.snapshot())?.sceneEditing).toBe(true);
 const button=page.getByRole('button',{name:'New ▾',exact:true});await button.click();
 await expect(button).toHaveAttribute('aria-expanded','true');
 const item=page.getByRole('menuitem',{name:'IK constraint',exact:true});await expect(item).toBeVisible();
 const hit=await item.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{inside:r.top>=0&&r.bottom<=innerHeight,receivesInput:hit===node||node.contains(hit)};});
 expect(hit).toEqual({inside:true,receivesInput:true});await item.click();
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 await button.press('ArrowDown');await expect(page.getByTestId('tree-new-menu')).toBeVisible();
 await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name:'Physics constraint',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByTestId('tree-new-menu')).toHaveCount(0);await expect(button).toBeFocused();
 const before=await native.snapshot();await button.click();await page.getByTestId('viewport').locator('canvas').click({position:{x:20,y:20}});
 await expect(page.getByTestId('tree-new-menu')).toHaveCount(0);expect(await native.snapshot()).toEqual(before);
});
