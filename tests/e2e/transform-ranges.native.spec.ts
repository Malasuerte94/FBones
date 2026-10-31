import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {ProjectSummary,TransformConstraintView} from '../../src/domain/project';

// Independently specified expected wire bits, never inferred from the host DTO.
// Negative zero, subnormal, partial nulls and reversed endpoints are intentional.
const expectedBits:(number|null)[]=[
 null,null,null,null,
 0x80000000,0x3dcccccd,0x3eaaaaab,0x40000000,
 null,0x80000001,null,0x40800000,
 0x40000000,0xc0000000,0,0x3f800000,
 null,null,null,null,
 null,null,null,null,
];
type TransformView=TransformConstraintView&{id:number;order:number};
const transforms=(p:ProjectSummary)=>p.constraints!.filter((c):c is TransformView=>c.type==='transform');
const inspector=(page:Page)=>page.getByTestId('constraint-inspector').first();
async function select(page:Page,id:number){await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();await expect(inspector(page)).toHaveAttribute('data-constraint-id',String(id));}
async function fixture(page:Page,native:NativeSession){
 const path=await native.invoke<string>('e2e_seed_transform_ranges');await openNativeEditor(page);await native.queueDialog('open',path);
 await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(async()=>(await native.snapshot())?.constraints?.length).toBe(2);
 const constraint=transforms((await native.snapshot())!).find(c=>c.editorRangeBits?.[4]===0x80000000)!;expect(constraint).toBeTruthy();expect(constraint.editorRangeBits).toEqual(expectedBits);await select(page,constraint.id);await inspector(page).getByTestId('transform-advanced-connections').locator('summary').click();return constraint;
}
async function model(native:NativeSession,id:number){return transforms((await native.snapshot())!).find(c=>c.id===id)!;}
async function closeAndOpen(page:Page,native:NativeSession,path:string){
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
 await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();
 await native.queueDialog('open',path);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();
}

test('@native saved Transform range values show -0 and absent cells without changing native data on inspector focus or folding',async({page,native})=>{
 const c=await fixture(page,native),before=(await native.snapshot())!;const panel=inspector(page);
 await panel.getByTestId('transform-stored-ranges-toggle').click();await expect(panel.getByTestId('transform-stored-cell-4')).toHaveText('-0');
 await expect(panel.getByTestId('transform-stored-cell-4')).toHaveAttribute('data-range-bits','2147483648');
 await expect(panel.getByTestId('transform-stored-cell-0')).toHaveText('—');await expect(panel.getByTestId('transform-stored-cell-0')).toHaveAttribute('data-range-bits','absent');
 await expect(panel.getByTestId('transform-stored-cell-10')).toHaveText('—');
 await expect(panel.getByTestId('transform-stored-cell-14')).toHaveText('0');
 await expect(panel.getByTestId('transform-stored-cell-9')).toHaveAttribute('data-range-bits',String(0x80000001));
 expect(await panel.getByTestId('transform-stored-ranges').locator('input').count()).toBe(0);
 const start=panel.getByRole('spinbutton',{name:'Source range start',exact:true}).first();await start.focus();await panel.getByTestId('transform-stored-cell-4').click();
 await panel.getByTestId('transform-stored-ranges-toggle').click();await panel.getByTestId('transform-stored-ranges-toggle').click();
 expect(await native.snapshot()).toEqual(before);
 const other=transforms(before).find(v=>v.id!==c.id)!;await select(page,other.id);await select(page,c.id);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);expect((await native.snapshot())!.revision).toBe(before.revision);
});

test('@native Transform unrelated edits preserve stored bits and endpoint authoring retains exact intended bits through Undo Redo and native SaveAs Close Open',async({page,native},testInfo)=>{
 const c=await fixture(page,native),panel=inspector(page);let before=(await native.snapshot())!;
 const name=panel.getByTestId('constraint-name');await name.fill('Range-preserving edit');await name.press('Enter');await expect.poll(async()=>(await model(native,c.id)).name).toBe('Range-preserving edit');
 expect((await native.snapshot())!.revision).toBe(before.revision+1);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);
 const mix=panel.getByTestId('transform-mix-1');await mix.fill('25');await mix.press('Enter');await expect.poll(async()=>(await model(native,c.id)).mix[1]).toBe(.25);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);
 const raw=panel.getByRole('spinbutton',{name:'To end',exact:true}).first();await expect(raw).toHaveAttribute('readonly','');const end=panel.getByTestId('transform-range-7');const editedBits=[...expectedBits];editedBits[7]=0x40180000;editedBits[8]=0;editedBits[10]=0;const oldEnd=(await model(native,c.id)).properties[0]!.to[0]!.max;
 before=(await native.snapshot())!;await end.fill('2.375');await end.press('Enter');await expect.poll(async()=>(await model(native,c.id)).properties[0]!.to[0]!.max).toBe(2.375);
 expect((await native.snapshot())!.revision).toBe(before.revision+1);expect((await model(native,c.id)).editorRangeBits).toEqual(editedBits);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await model(native,c.id)).properties[0]!.to[0]!.max).toBe(oldEnd);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await model(native,c.id)).properties[0]!.to[0]!.max).toBe(2.375);expect((await model(native,c.id)).editorRangeBits).toEqual(editedBits);
 const file='range-roundtrip.fbones';await native.queueDialog('save',file);const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);expect((await native.snapshot())!.path).toContain(file);
 const saved=(await native.snapshot())!;await closeAndOpen(page,native,file);const reopened=(await native.snapshot())!;
 const restored=transforms(reopened).find(v=>v.name==='Range-preserving edit')!;expect(restored.editorRangeBits).toEqual(editedBits);expect(restored.properties).toEqual(transforms(saved).find(v=>v.id===c.id)!.properties);expect(restored.mix[1]).toBe(.25);
 await select(page,restored.id);await inspector(page).getByTestId('transform-stored-ranges-toggle').click();await expect(inspector(page).getByTestId('transform-stored-cell-4')).toHaveText('-0');
 const output=testInfo.outputPath('transform-range-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await writeFile(join(output,'authored.json'),JSON.stringify({initial:c,saved,reopened,expectedBits,editedBits},null,2));await page.screenshot({path:join(output,'transform-ranges.png')});
});

test('@native Transform drafts Escape and Save flush preserve nullable ranges and independent constraints across reorder',async({page,native})=>{
 const c=await fixture(page,native),panel=inspector(page);const before=(await native.snapshot())!;const mix=panel.getByTestId('transform-mix-1');
 await mix.fill('71');await mix.press('Escape');expect(await native.snapshot()).toEqual(before);
 await mix.fill('37.5');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
 expect((await model(native,c.id)).mix[1]).toBe(.375);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);
 const edits=native.calls.filter(call=>call.command==='edit_rig'&&(call.args.edit as {type?:string}).type==='updateConstraint');expect(edits).toHaveLength(1);expect((edits[0]!.result as ProjectSummary).revision).toBe(before.revision+1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await model(native,c.id)).mix[1]).toBe(0);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await model(native,c.id)).mix[1]).toBe(.375);
 await select(page,c.id);const earlier=panel.getByRole('button',{name:'Evaluate earlier',exact:true}),later=panel.getByRole('button',{name:'Evaluate later',exact:true});if(await later.isEnabled())await later.click();else await earlier.click();
 await expect.poll(async()=>(await model(native,c.id)).order).not.toBe(c.order);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);
 const other=transforms((await native.snapshot())!).find(v=>v.id!==c.id)!;expect(other.editorRangeBits).toEqual(Array(24).fill(null));
 await select(page,other.id);await select(page,c.id);expect((await model(native,c.id)).editorRangeBits).toEqual(expectedBits);
});
