import {test,expect,openNativeEditor} from './fixtures/native-session';
import type {ProjectSummary} from '../../src/domain/project';
import type {Page} from '@playwright/test';
import {inflateSync} from 'node:zlib';

// This fixture is authored by our codec, with known layout/string provenance.
// Its pixels do not establish appearance of the private real-project corpus.
async function pixel(page:Page,x:number,y:number){
 const png=await page.screenshot({scale:'css',clip:{x:Math.floor(x),y:Math.floor(y),width:1,height:1}}),chunks:Buffer[]=[];
 for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(png.subarray(offset+8,offset+8+size));offset+=size+12;}
 return [...inflateSync(Buffer.concat(chunks)).subarray(1,4)];
}
async function greenMeshPixel(page:Page){const box=(await page.getByTestId('viewport').locator('canvas').boundingBox())!;return pixel(page,box.x+box.width/2+38,box.y+box.height/2-6);}
function translate(p:ProjectSummary){return p.animations!.find(a=>a.name==='first')!.tracks.find(t=>t.channel==='translate')!;}
function semantic(p:ProjectSummary){return p.animations!.map(({id:_,...clip})=>({...clip,tracks:clip.tracks.map(t=>({...t,keys:t.keys.map(({id:__,...key})=>key)})),slotTracks:clip.slotTracks?.map(t=>({...t,keys:t.keys.map(({id:__,...key})=>key)}))}));}

test('@native known wire provenance retains zero-metadata mesh pixels and safe key history through binary Save Close Open',async({page,native})=>{
 const path=await native.invoke<string>('e2e_seed_wire_fixture');await native.queueDialog('open',path);const opened=await native.invoke<ProjectSummary>('open_project',{discardChanges:true});
 expect(opened.inspectionOnly).toBe(false);expect(opened.bones).toHaveLength(3);expect(opened.slots).toHaveLength(2);
 const mesh=opened.slots.flatMap(s=>s.attachments??[]).find(a=>a.mesh)!;expect(mesh.region).toMatchObject({width:0,height:0});expect(mesh.mesh!.vertices.some(v=>v.positions.some(value=>value!==0))).toBe(true);
 await openNativeEditor(page);await page.locator(`[data-tree-kind="attachment"][data-tree-id="${mesh.id}"]`).getByRole('treeitem').click();await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Meshes',exact:true}).click();
 await expect(page.getByTestId('mesh-reset')).toBeDisabled();await expect(page.getByTestId('mesh-reset-unavailable')).toBeVisible();await expect.poll(()=>greenMeshPixel(page)).toEqual([55,198,100]);expect(await native.snapshot()).toEqual(opened);
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(opened.animations!.find(a=>a.name==='first')!.id));
 await expect(page.getByTestId('animation-preview').getByRole('img',{name:'Live animation preview'})).toHaveAttribute('data-ready','true');await page.getByRole('button',{name:'Fit preview',exact:true}).click();
 const preview=(await page.getByTestId('animation-preview').locator('canvas').boundingBox())!;await expect.poll(()=>pixel(page,preview.x+preview.width*.75,preview.y+preview.height*.5)).toEqual([55,198,100]);
 const red=opened.bones.find(b=>b.name==='red')!;await page.locator(`[data-tree-kind="bone"][data-tree-id="${red.id}"]`).getByRole('treeitem').click();
 await page.getByTestId('timeline-current').fill('15');await page.getByTestId('timeline-current').press('Enter');const calls=native.calls.length;
 await page.getByTestId('animate-bone-x').fill('-12.5');await page.getByTestId('animate-bone-x').press('Enter');
 await expect.poll(async()=>translate((await native.snapshot())!).keys.map(k=>k.frame)).toEqual([0,15,30]);const changed=(await native.snapshot())!;expect(translate(changed).keys[1]!.values).toEqual([17.5,5]);expect(changed.bones).toEqual(opened.bones);expect(changed.slots).toEqual(opened.slots);expect(native.calls.slice(calls).filter(call=>call.command==='edit_rig')).toHaveLength(1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>translate((await native.snapshot())!).keys.map(k=>k.frame)).toEqual([0,30]);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>translate((await native.snapshot())!).keys.map(k=>k.frame)).toEqual([0,15,30]);
 // The seed is already a saved .fbones file. Save As consumes the queued new
 // destination; ordinary Save correctly writes the seed's existing path.
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
 await native.queueDialog('save','wire-edited.fbones');await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);const saved=(await native.snapshot())!;expect(saved.path).toMatch(/wire-edited\.fbones$/);
 await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();
 await native.queueDialog('open','wire-edited.fbones');await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;
 expect(reopened.inspectionOnly).toBe(false);expect(reopened.bones).toEqual(saved.bones);expect(reopened.slots).toEqual(saved.slots);expect(semantic(reopened)).toEqual(semantic(saved));
});
