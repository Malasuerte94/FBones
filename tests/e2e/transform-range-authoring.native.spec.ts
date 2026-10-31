import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Locator,Page} from '@playwright/test';
import type {ProjectSummary,TransformConstraintInput} from '../../src/domain/project';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const panel=(page:Page)=>page.getByTestId('constraint-inspector').first();
const cell=(page:Page,index:number)=>panel(page).getByTestId(`transform-range-${index}`);
async function model(native:NativeSession,id:number){const c=(await native.snapshot())!.constraints!.find(c=>c.id===id);if(c?.type!=='transform')throw Error('Range target missing');return c;}
async function select(page:Page,id:number){await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();await expect(panel(page)).toHaveAttribute('data-constraint-id',String(id));}
const bits=(value:number)=>{const data=new DataView(new ArrayBuffer(4));data.setFloat32(0,value,false);return data.getUint32(0,false);};
async function fixture(page:Page,native:NativeSession,mapped=false){
 const path=await native.invoke<string>('e2e_seed_transform_ranges');await native.queueDialog('open',path);let p=await native.invoke<ProjectSummary>('open_project',{discardChanges:true});
 const c=p.constraints!.find(c=>c.name==='Absent ranges');if(c?.type!=='transform')throw Error('Absent range seed missing');
 const{id,order:_order,editorRangeBits:_bits,editorRangeValues:_values,...input}=c;
 const properties:TransformConstraintInput['properties']=mapped?[
  {property:'x',offset:2,to:[{property:'rotate',offset:20,max:28,scale:2},{property:'y',offset:35,max:47,scale:3}]},
  {property:'scaleY',offset:.5,to:[{property:'scaleX',offset:1,max:3,scale:2},{property:'rotate',offset:20,max:28,scale:8}]},
 ]:[];
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'updateConstraint',id,constraint:{...input,localSource:true,localTarget:true,offsets:[7,11,-13,.2,-.1,19],properties}}});
 await openNativeEditor(page);await select(page,id);await expect(panel(page).getByTestId('transform-range-editor').locator('input')).toHaveCount(24);return{id,before:p};
}
async function enter(page:Page,native:NativeSession,id:number,index:number,text:string){await cell(page,index).fill(text);await cell(page,index).press('Enter');await expect.poll(async()=>(await model(native,id)).editorRangeBits![index]).toBe(bits(Number(text)));}
async function history(page:Page,native:NativeSession,id:number,action:'Undo'|'Redo'){const before=(await native.snapshot())!.revision;await page.getByRole('button',{name:action,exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.revision).toBeGreaterThan(before);await select(page,id);}
function changed(native:NativeSession,start:number){return native.calls.slice(start).filter(call=>call.command==='edit_rig');}
async function saveAs(page:Page,native:NativeSession,file:string){await native.queueDialog('save',file);const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);return menu;}

test('@native endpoint authoring exposes aligned six-by-four editable fields and preserves all24 dormant bits through clear, history and binary save/reopen',async({page,native},info)=>{
 const f=await fixture(page,native),before=(await native.snapshot())!;await expect(panel(page).getByTestId('transform-advanced-connections')).not.toHaveAttribute('open','');
 await panel(page).getByTestId('transform-range-editor').scrollIntoViewIfNeeded();const boxes=await Promise.all(Array.from({length:24},(_,i)=>cell(page,i).boundingBox()));
 for(let row=0;row<6;row++)for(let column=0;column<4;column++){const box=boxes[row*4+column]!;expect(box).toBeTruthy();expect(box.width).toBeGreaterThan(20);expect(Math.abs(box.y-boxes[row*4]!.y)).toBeLessThan(.1);expect(Math.abs(box.x-boxes[column]!.x)).toBeLessThan(.1);if(row)expect(box.y).toBeGreaterThan(boxes[(row-1)*4+column]!.y+20);if(column)expect(box.x).toBeGreaterThan(boxes[row*4+column-1]!.x);}
 for(let i=0;i<24;i++){await expect(cell(page,i)).toBeEditable();await expect(cell(page,i)).toHaveValue('');await expect(cell(page,i)).toHaveAttribute('data-range-state','unmapped');}
 await cell(page,0).focus();await panel(page).getByText('Property mappings',{exact:true}).click();expect(await native.snapshot()).toEqual(before);
 const expected=Array<number|null>(24).fill(null),start=native.calls.length;
 for(let i=0;i<24;i++){const value=i===0?'-0':i===1?'1e-45':String(i+.25);await enter(page,native,f.id,i,value);expected[i]=i===0?0x80000000:i===1?1:bits(i+.25);}
 expect((await model(native,f.id)).editorRangeBits).toEqual(expected);expect((await model(native,f.id)).properties).toEqual([]);expect((await native.snapshot())!.bones).toEqual(before.bones);expect((await native.snapshot())!.constraints!.find(c=>c.id!==f.id)).toEqual(before.constraints!.find(c=>c.id!==f.id));expect(changed(native,start)).toHaveLength(24);expect(native.calls.slice(start).filter(call=>call.command==='evaluate_project')).toHaveLength(0);
 await expect(cell(page,0)).toHaveValue('-0');const noOp=(await native.snapshot())!;await enter(page,native,f.id,0,'-0');expect(await native.snapshot()).toEqual(noOp);
 await cell(page,1).focus();await panel(page).getByTestId('transform-range-clear').click();expected[1]=null;await expect.poll(async()=>(await model(native,f.id)).editorRangeBits).toEqual(expected);await expect(cell(page,1)).toHaveValue('');
 await history(page,native,f.id,'Undo');expected[1]=1;expect((await model(native,f.id)).editorRangeBits).toEqual(expected);await history(page,native,f.id,'Redo');expected[1]=null;expect((await model(native,f.id)).editorRangeBits).toEqual(expected);
 const file='all24-ranges.fbones',menu=await saveAs(page,native,file),saved=(await native.snapshot())!;await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open',file);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;expect(reopened.constraints).toEqual(saved.constraints);expect(reopened.bones).toEqual(saved.bones);expect((await model(native,f.id)).editorRangeBits).toEqual(expected);await select(page,f.id);
 const output=info.outputPath('transform-range-authoring-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await writeFile(join(output,'authored.json'),JSON.stringify({before,saved,reopened,expected},null,2));await page.screenshot({path:join(output,'range-authoring-all24.png')});
});

test('@native endpoint authoring resolves derived cells, materializes mapped peers and coherently updates fan-out/fan-in, clear and zero/reversed ranges in all spaces',async({page,native})=>{
 const f=await fixture(page,native,true);await expect(cell(page,4)).toHaveValue('2');await expect(cell(page,5)).toHaveValue('6');await expect(cell(page,5)).toHaveAttribute('data-range-state','derived');const before=(await native.snapshot())!;
 await cell(page,5).focus();await panel(page).getByText('Property mappings',{exact:true}).click();expect(await native.snapshot()).toEqual(before);
 await enter(page,native,f.id,5,'10');let c=await model(native,f.id);expect(c.properties[0]!.to.map(to=>to.scale)).toEqual([1,1.5]);expect(c.editorRangeBits!.flatMap((value,i)=>value===null?[]:[i])).toEqual([2,3,4,5,10,11,14,15,16,17]);
 const present=[...c.editorRangeBits!];await cell(page,5).focus();await panel(page).getByTestId('transform-range-clear').click();await expect.poll(async()=>(await model(native,f.id)).editorRangeBits![5]).toBeNull();present[5]=null;expect((await model(native,f.id)).editorRangeBits).toEqual(present);await expect(cell(page,5)).toHaveValue('10');await expect(cell(page,5)).toHaveAttribute('data-range-state','derived');await enter(page,native,f.id,5,'10');await expect(cell(page,5)).toHaveAttribute('data-range-state','explicit');
 const safe=(await native.snapshot())!,bad=native.calls.length;await cell(page,5).fill('2');await cell(page,5).press('Enter');await expect(panel(page).getByRole('alert')).toBeVisible();expect(await native.snapshot()).toEqual(safe);expect(changed(native,bad)).toHaveLength(1);expect(changed(native,bad)[0]!.error).toBeTruthy();await expect(cell(page,5)).toHaveValue('2');await cell(page,5).press('Escape');await expect(cell(page,5)).toHaveValue('10');
 await enter(page,native,f.id,3,'20');c=await model(native,f.id);expect(c.properties[0]!.to.find(t=>t.property==='rotate')!.scale).toBe(0);expect(c.properties[1]!.to.find(t=>t.property==='rotate')!.scale).toBe(0);
 await enter(page,native,f.id,2,'32');c=await model(native,f.id);expect(c.properties[0]!.to.find(t=>t.property==='rotate')!.scale).toBe(-1.5);expect(c.properties[1]!.to.find(t=>t.property==='rotate')!.scale).toBe(-12);
 for(const[step,[source,target]]of([[true,true],[false,false],[false,true],[true,false]] as const).entries()){
  await panel(page).getByRole('checkbox',{name:'Source local',exact:true}).setChecked(source);await expect.poll(async()=>(await model(native,f.id)).localSource).toBe(source);await panel(page).getByRole('checkbox',{name:'Targets local',exact:true}).setChecked(target);await expect.poll(async()=>(await model(native,f.id)).localTarget).toBe(target);
  await enter(page,native,f.id,11,String(48+step));expect((await model(native,f.id)).properties[0]!.to.find(t=>t.property==='y')!.scale).toBe((13+step)/8);
 }
 expect((await native.snapshot())!.bones).toEqual(before.bones);expect((await native.snapshot())!.slots).toEqual(before.slots);expect((await model(native,f.id)).offsets).toEqual((await modelFrom(before,f.id)).offsets);
});
function modelFrom(p:ProjectSummary,id:number){const c=p.constraints!.find(c=>c.id===id);if(c?.type!=='transform')throw Error('Transform missing');return c;}

test('@native endpoint authoring preserves another invalid draft when Escape cancels one field, blocks Save, then cancels safely',async({page,native})=>{
 const f=await fixture(page,native);await enter(page,native,f.id,0,'4');const before=(await native.snapshot())!,a=cell(page,0),b=cell(page,1);
 await a.fill('');await b.focus();await expect(panel(page).getByRole('alert')).toBeVisible();await b.fill('7');await b.press('Escape');await expect(b).toHaveValue('');await expect(a).toHaveValue('');await expect(panel(page).getByRole('alert')).toBeVisible();
 const start=native.calls.length;await page.getByRole('button',{name:'Save',exact:true}).click();expect(native.calls.slice(start).filter(call=>call.command==='save_project')).toHaveLength(0);expect(await native.snapshot()).toEqual(before);await expect(a).toHaveValue('');
 await a.press('Escape');await expect(a).toHaveValue('4');await expect(panel(page).getByRole('alert')).toHaveCount(0);await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);expect((await model(native,f.id)).editorRangeBits).toEqual((await modelFrom(before,f.id)).editorRangeBits);
});

test('@native pending endpoint draft flushes before Properties Match and Save without losing its requested native bits',async({page,native})=>{
 const f=await fixture(page,native,true),before=(await native.snapshot())!,start=native.calls.length;
 await cell(page,5).fill('10');await panel(page).getByTestId('transform-match-properties').click();await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+2);
 const edits=changed(native,start);expect(edits.map(c=>(c.args.edit as {type:string}).type)).toEqual(['setTransformRange','matchTransform']);expect(edits[0]!.args.edit).toEqual({type:'setTransformRange',id:f.id,index:5,bits:0x41200000});const staged=(edits[0]!.result as ProjectSummary).constraints!.find(c=>c.id===f.id);if(staged?.type!=='transform')throw Error('Staged range result missing');expect(staged.editorRangeBits![5]).toBe(0x41200000);expect(staged.properties[0]!.to.map(to=>to.scale)).toEqual([1,1.5]);
 const c=await model(native,f.id);expect(c.editorRangeValues![5]!-c.editorRangeValues![4]!).toBe(8);expect((await native.snapshot())!.bones).toEqual(before.bones);
 const savedBits=c.editorRangeBits;await cell(page,3).fill('9');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);expect((await model(native,f.id)).editorRangeBits![3]).toBe(bits(9));expect((await model(native,f.id)).editorRangeBits!.filter((_v,i)=>i!==3)).toEqual(savedBits!.filter((_v,i)=>i!==3));
});
