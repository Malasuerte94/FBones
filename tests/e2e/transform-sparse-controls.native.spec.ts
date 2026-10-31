import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {ProjectSummary} from '../../src/domain/project';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Independent expected cache bits from the opt-in native seed; includes -0,
// a subnormal and absence. These are not writable JS numeric range values.
const rangeBits:(number|null)[]=[
 null,null,null,null,0x80000000,0x3dcccccd,0x3eaaaaab,0x40000000,
 null,0x80000001,null,0x40800000,0x40000000,0xc0000000,0,0x3f800000,
 null,null,null,null,null,null,null,null,
];
function floatBits(values:readonly number[]){return values.map(value=>{const bytes=new DataView(new ArrayBuffer(4));bytes.setFloat32(0,value,false);return bytes.getUint32(0,false);});}
async function current(native:NativeSession,id:number){const c=(await native.snapshot())!.constraints!.find(c=>c.id===id);if(c?.type!=='transform')throw Error('Own Transform fixture disappeared');return c;}
const panel=(page:Page)=>page.getByTestId('constraint-inspector').first();
async function select(page:Page,id:number){await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();await expect(panel(page)).toHaveAttribute('data-constraint-id',String(id));}
async function inspect(page:Page,id:number){await select(page,id);const details=panel(page).getByTestId('transform-offset-controls').locator('..');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator('summary').click();}
async function connections(page:Page){const advanced=panel(page).getByTestId('transform-advanced-connections');if(!await advanced.evaluate(node=>(node as HTMLDetailsElement).open))await advanced.locator('summary').click();}
function editCalls(native:NativeSession,start:number){return native.calls.slice(start).filter(call=>call.command==='edit_rig');}

test('@native sparse Transform Offset and Mix controls keep canonical axes and hidden values through route edits, history and native save/reopen',async({page,native},info)=>{
 // Arrange only this fresh native Session. The production seed writes an own
 // canonical file, and the real native edit keeps its independent range bits.
 const path=await native.invoke<string>('e2e_seed_transform_ranges');await native.queueDialog('open',path);
 let project=await native.invoke<ProjectSummary>('open_project',{discardChanges:true});
 const seed=project.constraints!.find(c=>c.type==='transform'&&c.editorRangeBits?.[4]===0x80000000);
 if(seed?.type!=='transform')throw Error('Expected native range seed');
 expect(seed.editorRangeBits).toEqual(rangeBits);
 const{id,order:_order,editorRangeBits:_bits,...input}=seed;
 project=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:project.revision,edit:{type:'updateConstraint',id,constraint:{...input,localSource:false,localTarget:true,additive:false,clamp:false,
  offsets:[7,11,-13,.25,-.125,19],mix:[.125,.25,.375,.5,.625,.75],
  properties:[{property:'scaleY',offset:.6,to:[{property:'scaleX',offset:1.4,max:3.7,scale:-.75}]},{property:'x',offset:3.7,to:[{property:'rotate',offset:17,max:120,scale:2.3},{property:'y',offset:-23,max:47,scale:-.4}]}],
 }}});
 await openNativeEditor(page);await inspect(page,id);
 const offsets=panel(page).getByTestId('transform-offset-controls'),mixes=panel(page).getByTestId('transform-mix-controls');
 const initial=await current(native,id),bones=project.bones,other=project.constraints!.find(c=>c.id!==id);
 expect(initial.editorRangeBits).toEqual(rangeBits);await expect(offsets.locator('input')).toHaveCount(3);await expect(mixes.locator('input:not([type=range])')).toHaveCount(3);await expect(mixes.locator('input[type=range]')).toHaveCount(3);
 for(const index of[1,2,4])await expect(panel(page).getByTestId(`transform-offset-${index}`)).toHaveValue(String(initial.offsets[index]));
 for(const index of[0,3,5])await expect(panel(page).getByTestId(`transform-offset-${index}`)).toHaveCount(0);
 for(const index of[0,2,3])await expect(panel(page).getByTestId(`transform-mix-${index}`)).toHaveValue(String(initial.mix[index]!*100));
 for(const index of[1,4,5])await expect(panel(page).getByTestId(`transform-mix-${index}`)).toHaveCount(0);
 for(const[kind,index]of[['offset',3],['mix',1],['mix',4]] as const){const gap=panel(page).getByTestId(`transform-${kind}-gap-${index}`);await expect(gap).toBeVisible();await expect(gap).toHaveAttribute('aria-hidden','true');await expect(gap.locator('input')).toHaveCount(0);}

 let before=(await native.snapshot())!,start=native.calls.length;
 const offset=panel(page).getByTestId('transform-offset-4');await offset.fill('-0.375');await offset.press('Enter');
 await expect.poll(async()=>(await current(native,id)).offsets[4]).toBe(-.375);
 let changed=await current(native,id);const expectedOffset=[...initial.offsets];expectedOffset[4]=-.375;
 expect(floatBits(changed.offsets)).toEqual(floatBits(expectedOffset));expect({...changed,offsets:initial.offsets}).toEqual(initial);
 expect((await native.snapshot())!.revision).toBe(before.revision+1);expect(editCalls(native,start)).toHaveLength(1);expect((await native.snapshot())!.bones).toEqual(bones);

 before=(await native.snapshot())!;start=native.calls.length;
 const mix=panel(page).getByTestId('transform-mix-3');await mix.fill('37.5');await mix.press('Enter');
 await expect.poll(async()=>(await current(native,id)).mix[3]).toBe(.375);
 const afterValues=await current(native,id),expectedMix=[...initial.mix];expectedMix[3]=.375;
 expect(floatBits(afterValues.mix)).toEqual(floatBits(expectedMix));expect({...afterValues,mix:initial.mix}).toEqual(changed);
 expect((await native.snapshot())!.revision).toBe(before.revision+1);expect(editCalls(native,start)).toHaveLength(1);expect(afterValues.editorRangeBits).toEqual(rangeBits);

 // Source ScaleY→ScaleX changes the visible Offset axis, revealing the
 // existing stored X value; it must not copy the edited Y into X or zero Y.
 await connections(page);const from=panel(page).getByTestId('transform-mappings').getByRole('combobox',{name:'From',exact:true}).first();
 before=(await native.snapshot())!;start=native.calls.length;await from.selectOption('scaleX');
 await expect.poll(async()=>(await current(native,id)).properties[0]!.property).toBe('scaleX');
 await expect(panel(page).getByTestId('transform-offset-3')).toHaveValue('0.25');await expect(panel(page).getByTestId('transform-offset-4')).toHaveCount(0);await expect(panel(page).getByTestId('transform-offset-gap-4')).toBeVisible();
 changed=await current(native,id);expect(floatBits(changed.offsets)).toEqual(floatBits(expectedOffset));expect(floatBits(changed.mix)).toEqual(floatBits(expectedMix));expect(changed.editorRangeBits).toEqual(rangeBits);
 const expectedProperties=structuredClone(afterValues.properties);expectedProperties[0]!.property='scaleX';expect(changed.properties).toEqual(expectedProperties);
 expect((await native.snapshot())!.revision).toBe(before.revision+1);expect(editCalls(native,start)).toHaveLength(1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await current(native,id)).properties).toEqual(afterValues.properties);await inspect(page,id);await expect(panel(page).getByTestId('transform-offset-4')).toHaveValue('-0.375');await expect(panel(page).getByTestId('transform-offset-3')).toHaveCount(0);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await current(native,id)).properties).toEqual(expectedProperties);await inspect(page,id);await expect(panel(page).getByTestId('transform-offset-3')).toHaveValue('0.25');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await current(native,id)).properties).toEqual(afterValues.properties);await inspect(page,id);

 // The own empty-section policy exposes a hint, never invented zero inputs.
 await connections(page);for(let i=0;i<2;i++){const count=(await current(native,id)).properties.length;await panel(page).getByRole('button',{name:'Remove mapping',exact:true}).first().click();await expect.poll(async()=>(await current(native,id)).properties.length).toBe(count-1);}
 await expect(offsets.locator('input')).toHaveCount(0);await expect(mixes.locator('input')).toHaveCount(0);await expect(offsets.locator('p')).toBeVisible();await expect(mixes.locator('p')).toBeVisible();
 const empty=await current(native,id);expect(floatBits(empty.offsets)).toEqual(floatBits(expectedOffset));expect(floatBits(empty.mix)).toEqual(floatBits(expectedMix));expect(empty.editorRangeBits).toEqual(rangeBits);
 for(let count=1;count<=2;count++){await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await current(native,id)).properties.length).toBe(count);await inspect(page,id);}
 expect(await current(native,id)).toEqual(afterValues);expect((await native.snapshot())!.bones).toEqual(bones);expect((await native.snapshot())!.constraints!.find(c=>c.id!==id)).toEqual(other);

 const file='sparse-transform.fbones';await native.queueDialog('save',file);const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
 const saved=(await native.snapshot())!;await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open',file);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();
 const reopened=(await native.snapshot())!;expect(reopened.bones).toEqual(saved.bones);expect(reopened.constraints).toEqual(saved.constraints);const restored=reopened.constraints!.find(c=>c.name===afterValues.name);if(restored?.type!=='transform')throw Error('Saved sparse Transform missing');expect(floatBits(restored.offsets)).toEqual(floatBits(expectedOffset));expect(floatBits(restored.mix)).toEqual(floatBits(expectedMix));expect(restored.editorRangeBits).toEqual(rangeBits);
 await inspect(page,restored.id);await expect(panel(page).getByTestId('transform-offset-controls').locator('input')).toHaveCount(3);await expect(panel(page).getByTestId('transform-mix-controls').locator('input:not([type=range])')).toHaveCount(3);await expect(panel(page).getByTestId('transform-mix-controls').locator('input[type=range]')).toHaveCount(3);
 const output=info.outputPath('transform-sparse-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await writeFile(join(output,'authored.json'),JSON.stringify({initial,afterValues,saved,reopened,rangeBits},null,2));await page.screenshot({path:join(output,'transform-sparse-controls.png')});
});
