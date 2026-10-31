import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {AttachmentView,ProjectSummary,RigEdit} from '../../src/domain/project';
import type {Page} from '@playwright/test';
import {copyFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {inflateSync} from 'node:zlib';
// Different-size replacement is the recorded FBones policy. These tests do
// not claim original Spine path-swap gestures or dimension-adjustment parity.
async function edit(native:NativeSession,operation:RigEdit){const p=(await native.snapshot())!;return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:operation});}
function attachment(p:ProjectSummary,id:number){const a=p.slots.flatMap(s=>s.attachments??[]).find(a=>a.id===id);expect(a).toBeTruthy();return a!;}
function activation(p:ProjectSummary){return p.slots.map(s=>({id:s.id,active:s.activeAttachmentId}));}
function changes(native:NativeSession,start:number){return native.calls.slice(start).filter(c=>c.command==='edit_rig');}
function unchangedGeometry(before:ProjectSummary,after:ProjectSummary,id:number){
 const a=attachment(before,id),b=attachment(after,id);
 expect(b.name).toBe(a.name);expect(b.slot).toBe(a.slot);expect(b.type).toBe(a.type);expect(b.mesh).toEqual(a.mesh);
 const strip=(r:AttachmentView['region'])=>{const{image:_image,imagePath:_path,...geometry}=r!;return geometry;};
 expect(strip(b.region)).toEqual(strip(a.region));expect(after.bones).toEqual(before.bones);expect(activation(after)).toEqual(activation(before));
 expect(after.slots.map(({region:_r,mesh:_m,imageAvailable:_a,attachments:_items,...slot})=>slot)).toEqual(before.slots.map(({region:_r,mesh:_m,imageAvailable:_a,attachments:_items,...slot})=>slot));
 for(const other of before.slots.flatMap(s=>s.attachments??[]))if(other.id!==id)expect(attachment(after,other.id)).toEqual(other);
}
async function fixture(native:NativeSession){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Attachment image path acceptance',discardChanges:true});const root=p.bones[0]!.id;
 p=await edit(native,{type:'create',parent:root,x:40,y:0,length:40,rotation:0});const tip=p.editedBone!;
 p=await edit(native,{type:'createSlot',bone:root,name:'Alternatives'});const owner=p.editedSlot!;
 p=await edit(native,{type:'createSlot',bone:root,name:'Shared artwork'});const shared=p.editedSlot!;
 await native.queueDialog('folder','images');p=await native.invoke<ProjectSummary>('choose_images_folder',{expectedRevision:p.revision});
 p=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:p.revision,slot:owner,keys:['red','blue']});
 const red=p.slots.find(s=>s.id===owner)!.attachments!.find(a=>a.region?.image==='red')!.id,blue=p.slots.find(s=>s.id===owner)!.attachments!.find(a=>a.region?.image==='blue')!.id;
 p=await edit(native,{type:'updateAttachment',id:red,x:-130,y:80,rotation:0,scaleX:1,scaleY:1});
 p=await edit(native,{type:'updateAttachment',id:blue,x:120,y:80,rotation:0,scaleX:1,scaleY:1});
 p=await edit(native,{type:'attachmentEdit',id:blue,edit:{type:'convertMesh',id:owner}});
 p=await edit(native,{type:'bindAttachment',id:blue,bones:[root,tip]});
 for(let vertex=0;vertex<attachment(p,blue).mesh!.vertices.length;vertex++)p=await edit(native,{type:'setAttachmentWeight',id:blue,vertex,bone:tip,value:.2+vertex*.1});
 p=await edit(native,{type:'setActiveAttachment',slot:owner,attachment:red});
 p=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:p.revision,slot:shared,keys:['green']});const green=p.editedAttachment!;
 p=await edit(native,{type:'updateAttachment',id:green,x:130,y:-100,rotation:0,scaleX:1,scaleY:1});
 await native.queueDialog('save','image-path-fixture.fbones');p=await native.invoke<ProjectSummary>('save_project',{saveAs:true});
 // Additional original assets in this test's own native workspace, then the
 // real filesystem/cache scan. No DTO/resource model is injected into Vue.
 const images=join(dirname(p.path!),'images');await mkdir(join(images,'parts'),{recursive:true});
 await copyFile(join(images,'green.png'),join(images,'parts','skin.v2.png'));
 await copyFile(join(images,'blue.png'),join(images,'parts','exact.png.png'));
 p=await native.invoke<ProjectSummary>('refresh_images_folder',{expectedRevision:p.revision});
 expect(p.library!.images.some(i=>i.key==='parts/skin.v2')).toBe(true);expect(p.library!.images.some(i=>i.key==='parts/exact.png')).toBe(true);
 return{root,tip,owner,shared,red,blue,green,project:p};
}
async function select(page:Page,id:number){await page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem').click();await expect(page.getByTestId('attachment-image-path')).toBeVisible();}
async function path(page:Page,value:string){const field=page.getByTestId('attachment-image-path');await field.fill(value);await field.press('Enter');}
async function fileAction(page:Page,name:'Close project'|'Open project'|'Save as'){
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator('summary').click();await menu.getByRole('button',{name:new RegExp('^'+name)}).click();
}
async function colorAt(page:Page,x:number,y:number){
 const box=(await page.getByTestId('viewport').locator('canvas').boundingBox())!,scale=Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%',''))/100;
 const png=await page.screenshot({scale:'css',clip:{x:Math.floor(box.x+box.width/2+x*scale),y:Math.floor(box.y+box.height/2-y*scale),width:1,height:1}});
 const chunks:Buffer[]=[];let channels=0;
 for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+size);if(kind==='IHDR'){expect(data.readUInt32BE(0)).toBe(1);expect(data.readUInt32BE(4)).toBe(1);expect(data[8]).toBe(8);channels=data[9]===6?4:data[9]===2?3:0;}if(kind==='IDAT')chunks.push(data);offset+=size+12;}
 expect(channels).toBeGreaterThan(0);const bytes=inflateSync(Buffer.concat(chunks));expect(bytes[0]).toBeLessThanOrEqual(4);
 // A one-pixel, one-row PNG has zero left/up predictors for every filter.
 return [...bytes.subarray(1,4)];
}

test('@native active Region path replacement changes actual texture pixels, keeps stored bounds and supports raw-empty fallback/history',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await select(page,f.red);const before=(await native.snapshot())!,start=native.calls.length;
 await expect.poll(()=>colorAt(page,-145,95)).toEqual([232,62,65]);
 await page.getByTestId('attachment-image-library').selectOption('strip');await expect.poll(async()=>attachment((await native.snapshot())!,f.red).region!.imagePath).toBe('strip');
 const swapped=(await native.snapshot())!;unchangedGeometry(before,swapped,f.red);expect(attachment(swapped,f.red).region!.width).toBe(96);expect(swapped.library!.images.find(i=>i.key==='strip')).toMatchObject({width:160,height:48});
 await expect.poll(()=>colorAt(page,-145,95)).toEqual([238,192,65]);
 // The new exact4.3.26 PNG oracle proves stored96x96 rendering despite its
 // runtime JSON reporting160x48. These points distinguish those two bounds;
 // x=-145 also avoids the selected image's Translate-Y axis at x=-130.
 // The earlier center sample alone lies inside both and cannot establish size.
 await expect.poll(()=>colorAt(page,-145,120)).toEqual([238,192,65]);
 await expect.poll(()=>colorAt(page,-195,80)).not.toEqual([238,192,65]);
 expect(changes(native,start)).toHaveLength(1);expect(native.calls.slice(start).some(c=>c.command==='evaluate_project')).toBe(false);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>colorAt(page,-145,95)).toEqual([232,62,65]);
 await select(page,f.red);await page.getByRole('button',{name:'Redo',exact:true}).click();await select(page,f.red);await expect.poll(()=>colorAt(page,-145,95)).toEqual([238,192,65]);
 await path(page,'');await expect.poll(async()=>attachment((await native.snapshot())!,f.red).region!.imagePath).toBe('');expect(attachment((await native.snapshot())!,f.red).region!.image).toBe('red');await expect(page.getByTestId('attachment-image-path')).toHaveValue('');await expect(page.getByTestId('attachment-image-path')).toHaveAttribute('placeholder','red');await expect.poll(()=>colorAt(page,-145,95)).toEqual([232,62,65]);
 const unchanged=(await native.snapshot())!,noOp=native.calls.length;await page.getByTestId('attachment-image-path').focus();await page.getByTestId('attachment-image-path').press('Enter');expect((await native.snapshot())!.revision).toBe(unchanged.revision);expect(changes(native,noOp)).toHaveLength(0);
});

test('@native inactive weighted Mesh accepts shared and exact nested/dotted keys without activation, UV or dormant-binding changes',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await select(page,f.blue);const before=(await native.snapshot())!;
 await path(page,'red');await expect.poll(async()=>attachment((await native.snapshot())!,f.blue).region!.imagePath).toBe('red');unchangedGeometry(before,(await native.snapshot())!,f.blue);await expect.poll(()=>colorAt(page,-145,95)).toEqual([232,62,65]);
 await page.getByTestId('attachment-image-library').selectOption('parts/skin.v2');await expect.poll(async()=>attachment((await native.snapshot())!,f.blue).region!.imagePath).toBe('parts/skin.v2');unchangedGeometry(before,(await native.snapshot())!,f.blue);
 await path(page,'parts/exact.png');await expect.poll(async()=>attachment((await native.snapshot())!,f.blue).region!.imagePath).toBe('parts/exact.png');expect(attachment((await native.snapshot())!,f.blue).region!.image).toBe('parts/exact.png');unchangedGeometry(before,(await native.snapshot())!,f.blue);
 await select(page,f.red);await page.locator(`[data-tree-kind="attachment"][data-tree-id="${f.red}"]`).getByTestId('attachment-activation').click();await expect.poll(async()=>(await native.snapshot())!.slots.find(s=>s.id===f.owner)!.activeAttachmentId).toBeNull();
 const none=(await native.snapshot())!,pixel=await colorAt(page,-145,95);await select(page,f.blue);await path(page,'strip');await expect.poll(async()=>attachment((await native.snapshot())!,f.blue).region!.imagePath).toBe('strip');unchangedGeometry(none,(await native.snapshot())!,f.blue);expect(await colorAt(page,-145,95)).toEqual(pixel);
 // Make the previously inactive weighted mesh render, proving its cold
 // texture replacement rather than only observing the unchanged active Region.
 await page.locator(`[data-tree-kind="attachment"][data-tree-id="${f.blue}"]`).getByTestId('attachment-activation').click();await expect.poll(async()=>(await native.snapshot())!.slots.find(s=>s.id===f.owner)!.activeAttachmentId).toBe(f.blue);
 const activeMesh=(await native.snapshot())!;expect(attachment(activeMesh,f.blue).mesh).toEqual(attachment(before,f.blue).mesh);await expect.poll(()=>colorAt(page,105,95)).toEqual([238,192,65]);
 await path(page,'red');await expect.poll(async()=>attachment((await native.snapshot())!,f.blue).region!.imagePath).toBe('red');unchangedGeometry(activeMesh,(await native.snapshot())!,f.blue);await expect.poll(()=>colorAt(page,105,95)).toEqual([232,62,65]);
});

test('@native invalid path and cancelled drafts leave native history intact, recover errors and Save flushes the current target once',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await select(page,f.blue);const before=(await native.snapshot())!;
 await path(page,'missing-image');await expect(page.getByTestId('attachment-inspector').getByRole('alert')).toBeVisible();expect(await native.snapshot()).toEqual(before);
 const field=page.getByTestId('attachment-image-path');await field.focus();await field.press('Escape');await expect(page.getByTestId('attachment-inspector').getByRole('alert')).toHaveCount(0);await expect(field).toHaveValue(attachment(before,f.blue).region!.imagePath!);expect(await native.snapshot()).toEqual(before);
 await field.fill('parts/skin.v2');await field.press('Escape');expect(await native.snapshot()).toEqual(before);
 await field.fill('strip');const start=native.calls.length;await native.queueDialog('save','path-draft.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);expect(attachment((await native.snapshot())!,f.blue).region!.imagePath).toBe('strip');expect(changes(native,start)).toHaveLength(1);
});

test('@native UI-authored path swaps save portable raw/effective references and every initialized Mesh binding for original comparison',async({page,native},testInfo)=>{
 const f=await fixture(native);await openNativeEditor(page);const before=(await native.snapshot())!,start=native.calls.length;
 await select(page,f.red);await path(page,'strip');await expect.poll(async()=>attachment((await native.snapshot())!,f.red).region!.imagePath).toBe('strip');
 await select(page,f.blue);await path(page,'parts/skin.v2');await expect.poll(async()=>attachment((await native.snapshot())!,f.blue).region!.imagePath).toBe('parts/skin.v2');
 await select(page,f.green);await path(page,'');await expect.poll(async()=>attachment((await native.snapshot())!,f.green).region!.imagePath).toBe('');
 const swapped=(await native.snapshot())!;expect(activation(swapped)).toEqual(activation(before));expect(attachment(swapped,f.blue).mesh).toEqual(attachment(before,f.blue).mesh);
 await native.queueDialog('save','attachment-path-delivery.fbones');await fileAction(page,'Save as');
 await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);const saved=(await native.snapshot())!;expect(saved.inspectionOnly).toBe(false);
 const output=testInfo.outputPath('attachment-path-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await cp(join(dirname(saved.path!),'images'),join(output,'images'),{recursive:true});await writeFile(join(output,'authored.json'),JSON.stringify({before,swapped,saved,ids:f,actions:changes(native,start)},null,2));await page.screenshot({path:join(output,'attachment-path.png')});
 await fileAction(page,'Close project');await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open','attachment-path-delivery.fbones');await fileAction(page,'Open project');await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;
 for(const original of saved.slots.flatMap(s=>s.attachments??[])){const restored=reopened.slots.flatMap(s=>s.attachments??[]).find(a=>a.name===original.name)!;expect(restored.region).toEqual(original.region);expect(restored.mesh).toEqual(original.mesh);}
});
