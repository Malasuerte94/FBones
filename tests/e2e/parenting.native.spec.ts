import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {ProjectSummary,RigEdit} from '../../src/domain/project';
import type {Page} from '@playwright/test';
import {copyFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';

async function edit(native:NativeSession,operation:RigEdit){const p=(await native.snapshot())!;return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:operation});}
async function fixture(native:NativeSession){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Parent picking regression',discardChanges:true});const root=p.bones[0]!.id;
 p=await edit(native,{type:'create',parent:root,x:-120,y:20,length:40,rotation:0});const a=p.editedBone!;
 p=await edit(native,{...p.bones.find(b=>b.id===a)!,type:'update',name:'Source A'});
 p=await edit(native,{type:'create',parent:a,x:-70,y:20,length:30,rotation:0});const b=p.editedBone!;
 p=await edit(native,{...p.bones.find(bone=>bone.id===b)!,type:'update',name:'Source B'});
 p=await edit(native,{type:'create',parent:root,x:100,y:70,length:35,rotation:0});const target=p.editedBone!;
 p=await edit(native,{...p.bones.find(b=>b.id===target)!,type:'update',name:'Destination'});
 return{a,b,target,root,project:p};
}
function world(p:ProjectSummary){
 // Dedicated fixture has zero rotations/shears and unit scales. Independent
 // parent-position sums suffice here; native affine cases are separate tests.
 const result=new Map<number,{x:number;y:number}>();
 for(const b of p.bones){expect(b.rotation).toBe(0);const parent=b.parent===null?{x:0,y:0}:result.get(b.parent)!;result.set(b.id,{x:parent.x+b.x,y:parent.y+b.y});}
 return Object.fromEntries(result);
}
async function tree(page:Page,kind:'bone'|'attachment',id:number,toggle=false){const row=page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`).getByRole('treeitem');await row.click({modifiers:toggle?['Control']:[]});}
function calls(native:NativeSession,start:number){return native.calls.slice(start).filter(call=>call.command==='edit_rig');}
async function pick(page:Page){await page.keyboard.press('p');await expect(page.getByTestId('parent-pick-hint')).toBeVisible();}

test('@native P reparents a bone group from Tree atomically, rejects a descendant and preserves world positions',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await tree(page,'bone',f.a);await tree(page,'bone',f.b,true);
 const before=(await native.snapshot())!,start=native.calls.length;await pick(page);
 await tree(page,'bone',f.b);await expect(page.getByTestId('parent-pick-hint')).toBeVisible();expect(await native.snapshot()).toEqual(before);expect(calls(native,start)).toHaveLength(0);
 await tree(page,'bone',f.target);await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+1);
 const after=(await native.snapshot())!;expect(after.bones.find(b=>b.id===f.a)!.parent).toBe(f.target);expect(after.bones.find(b=>b.id===f.b)!.parent).toBe(f.a);expect(world(after)).toEqual(world(before));
 expect(calls(native,start).map(call=>call.args.edit)).toEqual([{type:'reparentSelection',bones:[f.a,f.b],attachments:[],parent:f.target}]);await expect(page.getByTestId('parent-pick-hint')).toHaveCount(0);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.bones).toEqual(before.bones);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.bones).toEqual(after.bones);
 await tree(page,'bone',f.a);await pick(page);await page.keyboard.press('Escape');await expect(page.getByTestId('parent-pick-hint')).toHaveCount(0);expect((await native.snapshot())!.bones).toEqual(after.bones);
});

test('@native image P viewport pick isolates an inactive alternative, then whole-owner parenting saves and reopens',async({page,native},testInfo)=>{
 const f=await fixture(native);let p=f.project;
 await native.queueDialog('folder','images');p=await native.invoke<ProjectSummary>('choose_images_folder',{expectedRevision:p.revision});
 p=await edit(native,{type:'createSlot',bone:f.root,name:'Shared images'});const slot=p.editedSlot!;
 p=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:p.revision,slot,keys:['red','blue','green']});
 const source=p.slots.find(s=>s.id===slot)!,red=source.attachments!.find(a=>a.region!.image==='red')!,blue=source.attachments!.find(a=>a.region!.image==='blue')!,green=source.attachments!.find(a=>a.region!.image==='green')!;
 p=await edit(native,{type:'attachmentEdit',id:blue.id,edit:{type:'convertMesh',id:slot}});
 p=await edit(native,{type:'bindAttachment',id:blue.id,bones:[f.a,f.b]});
 p=await edit(native,{type:'setAttachmentWeight',id:blue.id,vertex:0,bone:f.b,value:.4});
 p=await edit(native,{type:'setActiveAttachment',slot,attachment:red.id});await openNativeEditor(page);await tree(page,'attachment',blue.id);
 await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Images',exact:true}).click();const before=(await native.snapshot())!,start=native.calls.length;
 await pick(page);const canvas=page.getByTestId('viewport').locator('canvas'),box=(await canvas.boundingBox())!,zoom=Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%',''))/100;
 const target=world(before)[f.target]!;await page.mouse.click(box.x+box.width/2+(target.x+15)*zoom,box.y+box.height/2-target.y*zoom);
 await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+1);
 const split=(await native.snapshot())!,oldSlot=split.slots.find(s=>s.id===slot)!,newSlot=split.slots.find(s=>s.attachments?.some(a=>a.id===blue.id))!;
 expect(split.slots).toHaveLength(before.slots.length+1);expect(oldSlot.activeAttachmentId).toBe(red.id);expect(oldSlot.attachments!.map(a=>a.id)).toEqual([red.id,green.id]);expect(newSlot.bone).toBe(f.target);expect(newSlot.activeAttachmentId).toBeNull();
 expect(oldSlot.attachments).toEqual(before.slots.find(s=>s.id===slot)!.attachments!.filter(a=>a.id!==blue.id));
 const moved=newSlot.attachments![0]!,originalBlue=before.slots.find(s=>s.id===slot)!.attachments!.find(a=>a.id===blue.id)!;expect(moved.id).toBe(blue.id);expect(moved.name).toBe(blue.name);expect(moved.mesh).toEqual(originalBlue.mesh);expect(moved.region).toEqual(originalBlue.region);
 await expect(page.getByTestId('attachment-name')).toHaveValue(blue.name);expect(calls(native,start)).toHaveLength(1);
 await tree(page,'attachment',red.id);await tree(page,'attachment',green.id,true);const previous=(await native.snapshot())!;await pick(page);await tree(page,'bone',f.target);
 await expect.poll(async()=>(await native.snapshot())!.revision).toBe(previous.revision+1);
 const whole=(await native.snapshot())!,retained=whole.slots.find(s=>s.id===slot)!;expect(whole.slots).toHaveLength(split.slots.length);expect(retained.bone).toBe(f.target);expect(retained.activeAttachmentId).toBe(red.id);
 for(const a of retained.attachments!){const original=before.slots.find(s=>s.id===slot)!.attachments!.find(item=>item.id===a.id)!;expect(a.region!.x+target.x).toBe(original.region!.x);expect(a.region!.y+target.y).toBe(original.region!.y);}
 await native.queueDialog('save','parenting.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);
 const saved=(await native.snapshot())!,output=testInfo.outputPath('parenting-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await cp(join(dirname(saved.path!),'images'),join(output,'images'),{recursive:true});await writeFile(join(output,'authored.json'),JSON.stringify({before,split,whole,saved},null,2));await page.screenshot({path:join(output,'parenting.png')});
 await native.invoke('close_project',{discardChanges:true});await native.queueDialog('open','parenting.fbones');const reopened=await native.invoke<ProjectSummary>('open_project',{discardChanges:true});
 expect(reopened.slots.map(s=>({name:s.name,bone:reopened.bones.find(b=>b.id===s.bone)!.name,active:s.attachments?.find(a=>a.id===s.activeAttachmentId)?.name??null,names:s.attachments?.map(a=>a.name)}))).toEqual(saved.slots.map(s=>({name:s.name,bone:saved.bones.find(b=>b.id===s.bone)!.name,active:s.attachments?.find(a=>a.id===s.activeAttachmentId)?.name??null,names:s.attachments?.map(a=>a.name)})));
});
