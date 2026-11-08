import {test,expect,openNativeEditor} from './fixtures/native-session';
import type {Page,Locator} from '@playwright/test';
import type {ProjectSummary} from '../../src/domain/project';
import {readFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';

// Own generated fixture + real Rust Session/codec. Unrun until the browser route
// executes; this does not establish private mascot pixels or original parity.
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function animationValues(value:unknown):unknown{if(Array.isArray(value))return value.map(animationValues);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='id').map(([key,value])=>[key,animationValues(value)]));return value;}
async function select(page:Page,kind:string,id:number){await page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem').click();}
async function field(page:Page,id:string,value:number){const input=page.getByTestId(id);await input.fill(String(value));await input.press('Enter');await expect(input).toHaveValue(String(value));}
async function file(page:Page,name:string){const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});if(!await menu.evaluate(n=>(n as HTMLDetailsElement).open))await menu.locator('summary').click();await menu.getByRole('button',{name:new RegExp('^'+name)}).click();}

// Only alpha-rename abstract alias groups for comparison. This is not a format
// parser/authoring engine; the values below come from the actual Rust codec.
function semanticMetadata(value:unknown):unknown{
 const groups=new Map<string,number>();
 function visit(value:unknown):unknown{
  if(Array.isArray(value))return value.map(visit);
  if(value&&typeof value==='object'){
   const row={...value} as Record<string,unknown>;
   if(typeof row.group==='number'&&'value'in row){const key=typeof row.value+':'+row.group;if(!groups.has(key))groups.set(key,groups.size);row.group=groups.get(key);}
   return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,visit(value)]));
  }
  return value;
 }
 return visit(value);
}
function rgbPixels(png:Buffer):number[][]{
 const chunks:Buffer[]=[];let width=0,height=0,channels=0;
 for(let at=8;at<png.length;){const n=png.readUInt32BE(at),kind=png.toString('ascii',at+4,at+8),data=png.subarray(at+8,at+8+n);if(kind==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);expect(data[8]).toBe(8);channels=data[9]===6?4:data[9]===2?3:0;}if(kind==='IDAT')chunks.push(data);at+=n+12;}
 expect(channels).toBeGreaterThan(0);const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels:number[][]=[];let previous=Buffer.alloc(stride);
 for(let y=0,at=0;y<height;y++){
  const filter=raw[at++]!,row=Buffer.alloc(stride);
  for(let x=0;x<stride;x++){const l=x>=channels?row[x-channels]!:0,u=previous[x]!,ul=x>=channels?previous[x-channels]!:0;let delta=0;if(filter===1)delta=l;else if(filter===2)delta=u;else if(filter===3)delta=Math.floor((l+u)/2);else if(filter===4){const p=l+u-ul,a=Math.abs(p-l),b=Math.abs(p-u),c=Math.abs(p-ul);delta=a<=b&&a<=c?l:b<=c?u:ul;}else expect(filter).toBe(0);row[x]=(raw[at++]!+delta)&255;}
  for(let x=0;x<stride;x+=channels)pixels.push([row[x]!,row[x+1]!,row[x+2]!]);previous=row;
 }
 return pixels;
}
async function ownArtPixels(canvas:Locator,palette:Set<string>){return rgbPixels(await canvas.screenshot({scale:'css'})).filter(rgb=>palette.has(rgb.join(','))).length;}

test('@native passive import metadata keeps visible editable art, key history and Simulate Off through resource refresh and portable reopen',async({page,native})=>{
 const source=await native.invoke<string>('e2e_seed_import_metadata_fixture');
 await native.queueDialog('open',source);const opened=await native.invoke<ProjectSummary>('open_project',{discardChanges:true});
 expect(opened.inspectionOnly).toBe(false);expect(opened.bones).toHaveLength(5);expect(opened.slots).toHaveLength(2);expect(opened.animations).toHaveLength(2);expect(opened.slots.every(s=>s.imageAvailable)).toBe(true);
 const metadata=await native.invoke<Record<string,unknown>>('e2e_import_metadata_state',{path:source});
 expect(metadata).toMatchObject({flag4:true,uint42:7,scalar8Bits:'3f666666',scalar34Bits:'80000000'});
 expect(metadata.sourceState).toMatchObject({skeleton126:true,bone126:[1,3],slot126:[0,1],boneLabels28:[[4,'ik']],animation3:[0],group2:[9,9,9,9,9],mesh19:[{slot:1,attachment:0,bits:'42cf0000'}]});
 expect(metadata.slotReferences8).toEqual([{slot:0,attachment:0},{slot:1,attachment:0}]);
 const sources=metadata.sources as Array<{path:{value:string;group:number};valuesBits:string[]}>;
 const imports=metadata.imports as Array<{paths:Array<{path:{value:string;group:number};stamp:string}>}>;
 expect(sources[0]!.valuesBits).toEqual(['80000000','3f666666']);expect(sources[0]!.path.group).toBe(imports[0]!.paths[0]!.path.group);expect(BigInt(imports[0]!.paths[0]!.stamp)).toBeGreaterThan(2n**32n);
 const sourcePath=opened.path!,directory=dirname(sourcePath),sourceHash=digest(await readFile(sourcePath)),assets=new Map<string,string>(),palette=new Set<string>();
 for(const image of opened.library!.images){const png=await readFile(join(directory,'source-images',image.key+'.png'));assets.set(image.key,digest(png));palette.add(rgbPixels(png)[0]!.join(','));}
 expect(assets.size).toBeGreaterThan(1);expect(existsSync(join(directory,'remembered-only'))).toBe(false);
 await openNativeEditor(page);await expect(page.getByTestId('project-inspection-notice')).toHaveCount(0);await expect(page.locator('[data-tree-kind="bone"]')).toHaveCount(5);await expect(page.locator('[data-tree-kind="slot"]')).toHaveCount(2);await expect(page.locator('.mode-toolbar')).toContainText('100%');
 await expect.poll(()=>ownArtPixels(page.getByTestId('viewport').locator('canvas'),palette)).toBeGreaterThan(4);
 await page.getByTestId('physics-simulate').uncheck();
 const bone=opened.slots[0]!.bone,setup=opened.bones.find(b=>b.id===bone)!;await select(page,'bone',bone);await field(page,'bone-x',setup.x+7);await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===bone)!.x).toBe(setup.x+7);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===bone)!.x).toBe(setup.x);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===bone)!.x).toBe(setup.x+7);
 const authored=(await native.snapshot())!,physics=authored.constraints!.find(c=>c.type==='physics')!.id;
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(authored.animations!.find(a=>a.name==='first')!.id));
 if(await page.getByTestId('timeline-auto-key').getAttribute('aria-pressed')==='true')await page.getByTestId('timeline-auto-key').click();
 await field(page,'timeline-current',21);await select(page,'bone',bone);const calls=native.calls.length;await field(page,'animate-bone-x',11);expect(await native.snapshot()).toEqual(authored);
 await select(page,'constraint',physics);await expect(page.getByTestId('animation-physics-simulate')).not.toBeChecked();await select(page,'bone',bone);
 await page.getByRole('button',{name:'Refresh images',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.documentId).not.toBe(authored.documentId);
 const refreshed=(await native.snapshot())!;expect(refreshed.logicalDocumentId).toBe(authored.logicalDocumentId);expect(refreshed.bones).toEqual(authored.bones);await expect(page.getByTestId('animate-bone-x')).toHaveValue('11');await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem')).toHaveAttribute('aria-selected','true');
 await select(page,'constraint',physics);await expect(page.getByTestId('animation-physics-simulate')).not.toBeChecked();await select(page,'bone',bone);
 await page.getByTestId('animation-tools').getByRole('button',{name:'Key Translate',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.animations!.find(a=>a.name==='first')!.tracks.some(t=>t.bone===bone&&t.channel==='translateY'&&t.keys.some(k=>k.frame===21))).toBe(true);
 const keyed=(await native.snapshot())!;expect(keyed.bones).toEqual(authored.bones);expect(native.calls.slice(calls).filter(c=>c.command==='edit_rig')).toHaveLength(1);
 const clip=keyed.animations!.find(a=>a.name==='first')!;for(const axis of ['translateX','translateY'])expect(clip.tracks.find(t=>t.bone===bone&&t.channel===axis)!.keys.some(k=>k.frame===21)).toBe(true);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.animations).toEqual(refreshed.animations);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.animations).toEqual(keyed.animations);
 const preview=page.getByTestId('animation-preview');await expect(preview.getByRole('img',{name:'Live animation preview'})).toHaveAttribute('data-ready','true');await preview.getByRole('button',{name:'Fit preview',exact:true}).click();for(const canvas of [page.getByTestId('viewport').locator('canvas'),preview.locator('canvas')])await expect.poll(()=>ownArtPixels(canvas,palette)).toBeGreaterThan(4);
 await mkdir(join(directory,'portable'),{recursive:true});const savedPath='import-metadata-fixture/portable/edited.fbones';await native.queueDialog('save',savedPath);await file(page,'Save as');await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);const saved=(await native.snapshot())!;
 expect(semanticMetadata(await native.invoke('e2e_import_metadata_state',{path:savedPath}))).toEqual(semanticMetadata(metadata));await select(page,'constraint',physics);await expect(page.getByTestId('animation-physics-simulate')).not.toBeChecked();
 expect(digest(await readFile(sourcePath))).toBe(sourceHash);for(const [key,hash]of assets){expect(digest(await readFile(join(directory,'source-images',key+'.png')))).toBe(hash);expect(digest(await readFile(join(dirname(saved.path!),'images',key+'.png')))).toBe(hash);}expect(existsSync(join(directory,'remembered-only'))).toBe(false);
 await file(page,'Close project');await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open',savedPath);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;
 expect(reopened.inspectionOnly).toBe(false);expect(reopened.bones).toEqual(saved.bones);expect(reopened.slots).toEqual(saved.slots);expect(animationValues(reopened.animations)).toEqual(animationValues(saved.animations));expect(reopened.slots.every(s=>s.imageAvailable)).toBe(true);expect(semanticMetadata(await native.invoke('e2e_import_metadata_state',{path:savedPath}))).toEqual(semanticMetadata(metadata));
});
