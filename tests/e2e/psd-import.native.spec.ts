import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {ProjectSummary} from '../../src/domain/project';
import {readFile,writeFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';

async function file(page:Page,name:string){
  const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
  if(!await menu.evaluate(n=>(n as HTMLDetailsElement).open))await menu.locator('summary').click();
  await menu.getByRole('button',{name:new RegExp('^'+name)}).click();
}
function layers(p:ProjectSummary){return p.slots.map(s=>({
  name:s.name,bone:s.bone,visible:s.visible,color:s.color,
  region:s.attachments![0]!.region,active:s.activeAttachmentId!==null,
}));}
async function worldPixel(page:Page,x:number,y:number){
  const box=(await page.getByTestId('viewport').locator('canvas').boundingBox())!;
  const zoom=Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%',''))/100;
  const bytes=await page.screenshot({scale:'css',clip:{x:Math.floor(box.x+box.width/2+x*zoom),y:Math.floor(box.y+box.height/2-y*zoom),width:1,height:1}});
  const chunks:Buffer[]=[];
  for(let at=8;at<bytes.length;){const n=bytes.readUInt32BE(at);if(bytes.toString('ascii',at+4,at+8)==='IDAT')chunks.push(bytes.subarray(at+8,at+8+n));at+=n+12;}
  return [...inflateSync(Buffer.concat(chunks)).subarray(1,4)];
}
async function createSaved(native:NativeSession){
  await native.invoke('create_project',{name:'Own PSD collage',discardChanges:true});
  await native.queueDialog('save','own-collage.fbones');
  return native.invoke<ProjectSummary>('save_project',{saveAs:true});
}

test('@native PSD layers retain shared coordinates and GPU depth order with one Undo and portable Save Close Open',async({page,native},info)=>{
  const initial=await createSaved(native);await openNativeEditor(page);
  const emptyHiddenPixel=await worldPixel(page,-74,45);
  await native.queueDialog('open','own-layers.psd');await file(page,'Import PSD');
  await expect.poll(async()=>(await native.snapshot())!.slots.length).toBe(3);
  const imported=(await native.snapshot())!;
  // Inspect pixels with the same root selection as the baseline. The importer
  // selects the hidden inventory item and its center gizmo is still visible.
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${initial.bones[0]!.id}"]`).getByRole('treeitem').click();
  expect(imported.revision).toBe(initial.revision+1);
  expect(layers(imported).map(({name,visible,color,active,region})=>({name,visible,color,active,x:region!.x,y:region!.y,width:region!.width,height:region!.height}))).toEqual([
    {name:'Back red',visible:true,color:0xffffffff,active:true,x:-20,y:10,width:80,height:80},
    {name:'Front blue',visible:true,color:0xffffffff,active:true,x:20,y:-10,width:80,height:80},
    {name:'Hidden green',visible:false,color:0xffffff80,active:false,x:-74.5,y:45.5,width:21,height:19},
  ]);
  await expect.poll(()=>worldPixel(page,-45,35)).toEqual([232,62,65]);
  await expect.poll(()=>worldPixel(page,45,-35)).toEqual([55,110,225]);
  // The overlap is blue even though alphabetical Images order differs.
  await expect.poll(()=>worldPixel(page,10,20)).toEqual([55,110,225]);
  await expect.poll(()=>worldPixel(page,-74,45)).toEqual(emptyHiddenPixel);
  const urls=await Promise.all(imported.slots.map(s=>native.invoke<string>('get_image_data',{documentId:imported.documentId,name:s.attachments![0]!.region!.image})));
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect.poll(async()=>(await native.snapshot())!.slots.length).toBe(0);
  expect((await native.snapshot())!.dirty).toBe(false);
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  await expect.poll(async()=>(await native.snapshot())!.slots).toEqual(imported.slots);
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);
  const saved=(await native.snapshot())!,binary=await readFile(saved.path!);
  expect(binary.subarray(0,1).toString()).not.toBe('{');
  await file(page,'Close project');await expect.poll(()=>native.snapshot()).toBeNull();
  await native.queueDialog('open','own-collage.fbones');await page.getByRole('button',{name:'Open project',exact:true}).first().click();
  await expect.poll(async()=>(await native.snapshot())?.slots.length).toBe(3);
  const reopened=(await native.snapshot())!;
  expect(layers(reopened)).toEqual(layers(saved));
  expect(await Promise.all(reopened.slots.map(s=>native.invoke<string>('get_image_data',{documentId:reopened.documentId,name:s.attachments![0]!.region!.image})))).toEqual(urls);
  await expect.poll(()=>worldPixel(page,10,20)).toEqual([55,110,225]);
  await writeFile(info.outputPath('psd-collage.json'),JSON.stringify({initial,imported,saved,reopened},null,2));
  await page.screenshot({path:info.outputPath('psd-collage.png')});
});

test('@native PSD cancellation and unsupported data are atomic; Animate and invalid drafts block import',async({page,native})=>{
  const initial=await createSaved(native);await openNativeEditor(page);
  await native.queueDialog('open',null);await file(page,'Import PSD');
  await expect.poll(()=>native.calls.filter(c=>c.command==='import_psd').length).toBe(1);
  await expect.poll(()=>native.snapshot()).toEqual(initial);
  await native.queueDialog('open','unsupported-layers.psd');await file(page,'Import PSD');
  await expect.poll(()=>native.calls.filter(c=>c.command==='import_psd'&&c.error).length).toBe(1);
  expect(await native.snapshot()).toEqual(initial);
  const invalid=page.getByTestId('bone-x');await invalid.fill('');
  const calls=native.calls.filter(c=>c.command==='import_psd').length;
  // command() blurs, flushes and rejects the invalid pending field before IPC.
  await file(page,'Import PSD');expect(native.calls.filter(c=>c.command==='import_psd')).toHaveLength(calls);
  await invalid.press('Escape');
  await page.getByTestId('editor-mode-animate').click();
  const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();
  await expect(page.getByTestId('import-psd')).toBeDisabled();
  expect(await native.snapshot()).toEqual(initial);
});
