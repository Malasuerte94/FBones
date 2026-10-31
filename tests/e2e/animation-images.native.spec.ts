import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {AttachmentView,ProjectSummary,RigEdit} from '../../src/domain/project';
import {copyFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {inflateSync} from 'node:zlib';

const RED=[232,62,65],GREEN=[55,198,100];
async function edit(native:NativeSession,edit:RigEdit){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:(await native.snapshot())!.revision,edit});}
function attachment(p:ProjectSummary,id:number){return p.slots.flatMap(s=>s.attachments??[]).find(a=>a.id===id)!;}
function inventory(p:ProjectSummary){const names=new Map(p.bones.map(b=>[b.id,b.name]));return p.slots.map(s=>({name:s.name,bone:names.get(s.bone),visible:s.visible,blend:s.blend,color:s.color,active:s.attachments?.find(a=>a.id===s.activeAttachmentId)?.name,attachments:s.attachments?.map(a=>({name:a.name,type:a.type,region:a.region,mesh:a.mesh?{...a.mesh,bones:a.mesh.bones.map(b=>names.get(b))}:null}))}));}
async function fixture(native:NativeSession){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Moving art - Region and weighted Mesh',discardChanges:true});const root=p.bones[0]!.id;
 p=await edit(native,{type:'create',parent:root,x:0,y:0,rotation:0,length:70});const child=p.editedBone!;
 await native.queueDialog('folder','images');p=await native.invoke<ProjectSummary>('choose_images_folder',{expectedRevision:p.revision});
 const attached:number[]=[];
 for(const [name,key,x]of [['Red Region','red',-110],['Green weighted Mesh','green',110]]as const){
  p=await edit(native,{type:'createSlot',bone:child,name});const slot=p.editedSlot!;p=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:p.revision,slot,keys:[key]});const id=p.editedAttachment!;attached.push(id);p=await edit(native,{type:'updateAttachment',id,x,y:50,rotation:0,scaleX:1,scaleY:1});
  if(key==='green'){
   p=await edit(native,{type:'attachmentEdit',id,edit:{type:'convertMesh',id:slot}});p=await edit(native,{type:'bindAttachment',id,bones:[root,child]});
   for(let vertex=0;vertex<attachment(p,id).mesh!.vertices.length;vertex++)p=await edit(native,{type:'setAttachmentWeight',id,vertex,bone:child,value:1});
  }
 }
 const mesh=attachment(p,attached[1]!).mesh!;expect(mesh.weighted).toBe(true);expect(mesh.bones).toEqual([root,child]);expect(mesh.vertices.every(v=>v.weights[1]===1&&v.weights[0]===0)).toBe(true);
 return {child,red:attached[0]!,green:attached[1]!,before:p};
}
// Reuse the existing one-pixel PNG strategy: all PNG filters have zero predictors
// on the first pixel/row, so the inflated RGB is direct and independent of Pixi.
async function pixel(page:Page,x:number,y:number){
 const png=await page.screenshot({scale:'css',clip:{x:Math.floor(x),y:Math.floor(y),width:1,height:1}}),chunks:Buffer[]=[];
 for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);if(kind==='IDAT')chunks.push(png.subarray(offset+8,offset+8+size));offset+=size+12;}
 return [...inflateSync(Buffer.concat(chunks)).subarray(1,4)];
}
async function worldPixel(page:Page,x:number,y:number){const box=(await page.getByTestId('viewport').locator('canvas').boundingBox())!;return pixel(page,box.x+box.width/2+x,box.y+box.height/2-y);}
async function previewColors(page:Page){
 const preview=page.getByTestId('animation-preview');await expect(preview.getByRole('img',{name:'Live animation preview'})).toHaveAttribute('data-ready','true');await preview.getByRole('button',{name:'Fit preview',exact:true}).click();
 const box=(await preview.locator('canvas').boundingBox())!;
 await expect.poll(()=>pixel(page,box.x+box.width*.25,box.y+box.height*.5)).toEqual(RED);await expect.poll(()=>pixel(page,box.x+box.width*.75,box.y+box.height*.5)).toEqual(GREEN);
 await expect(preview.locator('p[role="status"]')).toHaveCount(0);
}
async function seek(page:Page,frame:number){await page.getByTestId('timeline-current').fill(String(frame));await page.getByTestId('timeline-current').press('Enter');}

test('@native real Region and child-bound Mesh animate in both GPU views, preserve bindings and reopen as a portable image demo',async({page,native},info)=>{
 const f=await fixture(native);await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.locator(`[data-tree-kind="bone"][data-tree-id="${f.child}"]`).getByRole('treeitem').click();await page.getByTestId('animation-create').click();await page.getByTestId('animation-name').fill('Moving art');await page.getByTestId('animation-name').press('Enter');await expect.poll(async()=>(await native.snapshot())!.animations!.some(a=>a.name==='Moving art')).toBe(true);
 await expect.poll(()=>worldPixel(page,-110,50)).toEqual(RED);await expect.poll(()=>worldPixel(page,110,50)).toEqual(GREEN);await previewColors(page);
 await page.getByTestId('timeline-key-translate').click();await expect.poll(async()=>(await native.snapshot())!.animations!.find(a=>a.name==='Moving art')!.tracks[0]?.keys.length).toBe(1);await seek(page,30);
 for(const [field,value]of [['x',60],['y',-20]]as const){const input=page.getByTestId('animate-bone-'+field);await input.fill(String(value));await input.press('Enter');}
 await expect.poll(async()=>(await native.snapshot())!.animations!.find(a=>a.name==='Moving art')!.tracks[0]!.keys.map(k=>k.frame)).toEqual([0,30]);
 await expect.poll(()=>worldPixel(page,-50,30)).toEqual(RED);await expect.poll(()=>worldPixel(page,170,30)).toEqual(GREEN);await expect.poll(()=>worldPixel(page,-110,50)).not.toEqual(RED);await expect.poll(()=>worldPixel(page,110,50)).not.toEqual(GREEN);await previewColors(page);
 const animated=(await native.snapshot())!;expect(animated.bones).toEqual(f.before.bones);expect(inventory(animated)).toEqual(inventory(f.before));expect(attachment(animated,f.green).mesh).toEqual(attachment(f.before,f.green).mesh);
 await seek(page,15);await expect.poll(()=>worldPixel(page,-80,40)).toEqual(RED);await expect.poll(()=>worldPixel(page,140,40)).toEqual(GREEN);
 await native.queueDialog('save','moving-art.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);const saved=(await native.snapshot())!;
 const bundle=info.outputPath('demo-bundle');await mkdir(bundle,{recursive:true});await copyFile(saved.path!,join(bundle,'Demo.fbones'));await cp(join(dirname(saved.path!),'images'),join(bundle,'images'),{recursive:true});await writeFile(join(bundle,'README.txt'),'Open Demo.fbones, choose Animate, select Moving art, and press Play. Red Region and green weighted Mesh move with the child bone. All PNG assets are our generated test artwork.');
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open','moving-art.fbones');await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;
 expect(reopened.bones).toEqual(saved.bones);expect(inventory(reopened)).toEqual(inventory(saved));expect(reopened.slots.every(s=>s.imageAvailable)).toBe(true);const moving=reopened.animations!.find(a=>a.name==='Moving art')!;expect(moving.tracks[0]!.keys.map(k=>({frame:k.frame,values:k.values}))).toEqual([{frame:0,values:[0,0]},{frame:30,values:[60,-20]}]);
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(moving.id));await seek(page,30);await expect.poll(()=>worldPixel(page,-50,30)).toEqual(RED);await expect.poll(()=>worldPixel(page,170,30)).toEqual(GREEN);await previewColors(page);await page.screenshot({path:info.outputPath('moving-art-and-preview.png')});await writeFile(info.outputPath('image-animation-semantic.json'),JSON.stringify({before:f.before,animated,saved,reopened},null,2));
});
