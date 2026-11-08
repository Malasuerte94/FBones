import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {ConstraintInput,PhysicsConstraintInput,ProjectSummary,RigEdit,TransformProperty} from '../../src/domain/project';
import {copyFile,writeFile} from 'node:fs/promises';

type Physics=PhysicsConstraintInput&{id:number;order:number};
const physics=(p:ProjectSummary)=>p.constraints!.filter((c):c is Physics=>c.type==='physics');
const row=(page:Page,id:number)=>page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem');
const edits=(native:NativeSession,start:number)=>native.calls.slice(start).filter(c=>c.command==='edit_rig');
async function edit(native:NativeSession,value:RigEdit){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:(await native.snapshot())!.revision,edit:value});}
async function bones(native:NativeSession){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own constraint multi-edit',discardChanges:true});const root=p.bones[0]!.id,ids:number[]=[];
 for(let i=0;i<5;i++){p=await edit(native,{type:'create',parent:root,x:i*30,y:0,rotation:0,length:25});ids.push(p.editedBone!);}
 return{root,ids};
}
async function physicsFixture(native:NativeSession){
 const f=await bones(native);let p=await edit(native,{type:'addPhysicsToBones',bones:f.ids});
 for(const [i,c]of physics(p).entries()){
  const{id:_,order:__,...input}=c;
  p=await edit(native,{type:'updateConstraint',id:c.id,constraint:{...input,gravity:i,wind:10+i,rotate:i===2?null:0,globals:{...input.globals,gravity:i%2===0}}});
 }
 return p;
}
async function select(page:Page,ids:number[]){await row(page,ids[0]!).click();for(const id of ids.slice(1))await row(page,id).click({modifiers:['Control']});return page.getByTestId('constraint-batch-inspector');}
async function field(page:Page,key:string,value:string){const input=page.getByTestId('constraint-batch-'+key);await input.fill(value);await input.press('Enter');}
async function saveReopen(page:Page,native:NativeSession,path:string){
 await native.queueDialog('save',path);await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);const saved=(await native.snapshot())!;
 const file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await file.locator('summary').click();await file.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();
 await native.queueDialog('open',path);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();return{saved,reopened:(await native.snapshot())!};
}

test('@native five Physics constraints use visible Ctrl/Shift selection, mixed fields, one atomic gravity edit and exact portable history',async({page,native},info)=>{
 const seeded=await physicsFixture(native),records=physics(seeded),ids=records.map(c=>c.id);await openNativeEditor(page);
 await row(page,ids[0]!).click();await row(page,ids[2]!).click({modifiers:['Control']});
 for(const id of [ids[0]!,ids[2]!])await expect(row(page,id)).toHaveAttribute('aria-selected','true');
 await row(page,ids[2]!).click({modifiers:['Control']});await expect(row(page,ids[2]!)).toHaveAttribute('aria-selected','false');
 await row(page,ids[0]!).click();await row(page,ids[4]!).click({modifiers:['Shift']});
 const panel=page.getByTestId('constraint-batch-inspector');await expect(panel).toHaveAttribute('data-selected-count','5');
 for(const id of ids){await expect(row(page,id)).toHaveAttribute('aria-selected','true');await expect(row(page,id)).toHaveAttribute('title','Physics constraint');}
 expect(await native.snapshot()).toEqual(seeded);
 const gravity=panel.getByTestId('constraint-batch-gravity'),wind=panel.getByTestId('constraint-batch-wind');
 await expect(gravity).toHaveValue('');await expect(gravity).toHaveAttribute('placeholder','Mixed');await expect(panel.getByTestId('constraint-batch-gravity-slider')).toBeDisabled();
 await expect(panel.getByTestId('constraint-batch-rotate')).toHaveAttribute('placeholder','Mixed');
 await expect(panel.getByTestId('constraint-batch-global:gravity')).toHaveAttribute('aria-checked','mixed');
 // An invalid field stays invalid when a different field is escaped; Save cannot run.
 const invalidStart=native.calls.length;await gravity.fill('invalid');await wind.focus();await wind.fill('invalid');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(panel.getByRole('alert')).toBeVisible();expect(await native.snapshot()).toEqual(seeded);
 await gravity.press('Escape');await expect(wind).toHaveValue('invalid');await expect(panel.getByRole('alert')).toBeVisible();
 await wind.press('Escape');await expect(panel.getByRole('alert')).toHaveCount(0);expect(native.calls.slice(invalidStart).filter(c=>c.command==='save_project')).toHaveLength(0);
 const start=native.calls.length;await field(page,'gravity','12.375');await expect.poll(async()=>physics((await native.snapshot())!).map(c=>c.gravity)).toEqual(Array(5).fill(12.375));
 const changed=(await native.snapshot())!;expect(changed.revision).toBe(seeded.revision+1);expect(edits(native,start)).toHaveLength(1);
 expect(physics(changed).map((c,i)=>({...c,gravity:records[i]!.gravity}))).toEqual(records);expect(changed.bones).toEqual(seeded.bones);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>physics((await native.snapshot())!)).toEqual(records);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>physics((await native.snapshot())!)).toEqual(physics(changed));
 const noOp=(await native.snapshot())!,noOpStart=native.calls.length;await field(page,'gravity','12.375');await wind.focus();expect(await native.snapshot()).toEqual(noOp);expect(edits(native,noOpStart)).toHaveLength(0);
 const globalStart=native.calls.length;await panel.getByTestId('constraint-batch-global:gravity').check();await expect.poll(async()=>physics((await native.snapshot())!).map(c=>c.globals.gravity)).toEqual(Array(5).fill(true));expect(edits(native,globalStart)).toHaveLength(1);
 const beforeSave=(await native.snapshot())!;await gravity.fill('21.125');const{saved,reopened}=await saveReopen(page,native,'multi-physics.fbones');
 expect(physics(saved).map(c=>c.gravity)).toEqual(Array(5).fill(21.125));expect(reopened.constraints).toEqual(saved.constraints);expect(saved.bones).toEqual(beforeSave.bones);
 await select(page,ids);const handle=page.getByTestId('dock-width-scene');await handle.focus();for(let i=0;i<6;i++)await handle.press('ArrowRight');
 await panel.getByTestId('constraint-batch-gravity-slider').scrollIntoViewIfNeeded();expect(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await copyFile(saved.path!,info.outputPath('multi-physics.fbones'));await writeFile(info.outputPath('multi-physics-semantic.json'),JSON.stringify({seeded,changed,saved,reopened},null,2));await page.screenshot({path:info.outputPath('constraint-multi-physics.png')});
});

test('@native distinct IK and Transform groups edit only common fields and mixed constraint kinds remain explicitly read-only',async({page,native})=>{
 const f=await bones(native),ikIds:number[]=[],transformIds:number[]=[];let p=(await native.snapshot())!;
 for(let i=0;i<2;i++){
  const constraint:ConstraintInput={type:'ik',name:'Own IK '+i,bones:[f.ids[i]!],target:f.root,mix:i?.75:.25,softness:0,stretch:false,compress:false,bendPositive:true};p=await edit(native,{type:'addConstraint',constraint});ikIds.push(p.constraints!.at(-1)!.id);
 }
 const channels:TransformProperty[]=['rotate','x','y','scaleX','scaleY','shearY'];
 for(let i=0;i<2;i++){
  p=await edit(native,{type:'addConstraint',constraint:{type:'transform',name:'Own Transform '+i,source:f.root,bones:[f.ids[i+2]!],localSource:false,localTarget:false,additive:false,clamp:false,offsets:[i,0,0,0,0,0],mix:[i?.8:.2,0,0,0,0,0],properties:channels.map(property=>({property,offset:0,to:[{property,offset:0,max:1,scale:1}]}))}});transformIds.push(p.constraints!.at(-1)!.id);
 }
 p=await edit(native,{type:'addPhysicsToBones',bones:[f.ids[4]!]});const physicsId=p.constraints!.at(-1)!.id;
 await openNativeEditor(page);let panel=await select(page,ikIds);await expect(panel).toHaveAttribute('data-constraint-type','ik');await expect(panel.getByTestId('constraint-batch-mix')).toHaveAttribute('placeholder','Mixed');
 const glyphs=await Promise.all([ikIds[0]!,transformIds[0]!,physicsId].map(id=>row(page,id).locator('svg').last().locator('path').getAttribute('d')));expect(glyphs.every(Boolean)).toBe(true);expect(new Set(glyphs).size).toBe(3);
 let before=(await native.snapshot())!,start=native.calls.length;await field(page,'mix','37.5');await expect.poll(async()=>(await native.snapshot())!.constraints!.filter(c=>c.type==='ik').map(c=>c.mix)).toEqual([.375,.375]);expect(edits(native,start)).toHaveLength(1);
 let after=(await native.snapshot())!;expect(after.constraints!.filter(c=>c.type==='transform')).toEqual(before.constraints!.filter(c=>c.type==='transform'));
 panel=await select(page,transformIds);await expect(panel).toHaveAttribute('data-constraint-type','transform');before=(await native.snapshot())!;start=native.calls.length;
 await field(page,'mix:0','62.5');await expect.poll(async()=>(await native.snapshot())!.constraints!.filter(c=>c.type==='transform').map(c=>c.mix[0])).toEqual([.625,.625]);expect(edits(native,start)).toHaveLength(1);
 after=(await native.snapshot())!;expect(after.constraints!.filter(c=>c.type==='transform').map((c,i)=>({...c,mix:(before.constraints!.filter(c=>c.type==='transform')[i]!).mix}))).toEqual(before.constraints!.filter(c=>c.type==='transform'));
 await row(page,ikIds[0]!).click({modifiers:['Control']});await expect(panel).toHaveAttribute('data-constraint-type','mixed');await expect(panel.getByTestId('constraint-batch-mixed-types')).toBeVisible();await expect(panel.locator('input')).toHaveCount(0);expect(await native.snapshot()).toEqual(after);
 for(const [id,type]of [[ikIds[0]!,'ik'],[transformIds[0]!,'transform']]as const)await expect(page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`)).toHaveAttribute('data-constraint-type',type);
});

test('@native Animate Physics group drafts and Auto Key author all five supported channels together without touching Setup',async({page,native})=>{
 let p=await physicsFixture(native);p=await edit(native,{type:'createAnimation',name:'Own batch animation'});const ids=physics(p).map(c=>c.id),clipId=p.animations!.at(-1)!.id;await openNativeEditor(page);
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clipId));const panel=await select(page,ids);
 await expect(panel.getByTestId('constraint-batch-x')).toBeDisabled();await expect(panel.getByTestId('constraint-batch-global:gravity')).toBeDisabled();
 const auto=page.getByTestId('timeline-auto-key');if(await auto.getAttribute('aria-pressed')!=='false')await auto.click();
 const before=(await native.snapshot())!,start=native.calls.length;await field(page,'gravity','17.25');await expect(panel.getByTestId('constraint-batch-gravity')).toHaveValue('17.25');expect(await native.snapshot()).toEqual(before);expect(edits(native,start)).toHaveLength(0);
 const manualStart=native.calls.length;await page.keyboard.press('k');
 await expect.poll(async()=>{const clip=(await native.snapshot())!.animations!.find(c=>c.id===clipId)!;return clip.constraintTracks?.filter(t=>t.channel==='physics').reduce((sum,t)=>sum+t.keys.length,0)??0;}).toBe(35);
 const manual=(await native.snapshot())!;expect(edits(native,manualStart)).toHaveLength(1);expect(manual.constraints).toEqual(before.constraints);
 expect(manual.animations!.find(c=>c.id===clipId)!.constraintTracks!.filter(t=>t.channel==='physics'&&t.property==='gravity').map(t=>t.channel==='physics'?t.keys.at(-1)!.value:NaN)).toEqual(Array(5).fill(17.25));
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.animations!.find(c=>c.id===clipId)!.constraintTracks?.length??0).toBe(0);
 await field(page,'gravity','19.5');const rowKeyStart=native.calls.length;await panel.getByTestId('constraint-batch-key-gravity').click();
 await expect.poll(async()=>(await native.snapshot())!.animations!.find(c=>c.id===clipId)!.constraintTracks?.length??0).toBe(5);expect(edits(native,rowKeyStart)).toHaveLength(1);
 expect((await native.snapshot())!.constraints).toEqual(before.constraints);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.animations!.find(c=>c.id===clipId)!.constraintTracks?.length??0).toBe(0);
 await auto.click();const keyStart=native.calls.length;await field(page,'gravity','22.5');
 await expect.poll(async()=>{const current=(await native.snapshot())!,clip=current.animations!.find(c=>c.id===clipId)!;return clip.constraintTracks?.filter(t=>t.channel==='physics'&&t.property==='gravity').length??0;}).toBe(5);
 const keyed=(await native.snapshot())!;expect(keyed.constraints).toEqual(before.constraints);expect(keyed.bones).toEqual(before.bones);expect(edits(native,keyStart)).toHaveLength(1);
 expect(keyed.animations!.find(c=>c.id===clipId)!.constraintTracks!.filter(t=>t.channel==='physics'&&t.property==='gravity').map(t=>t.channel==='physics'?t.keys.at(-1)!.value:NaN)).toEqual(Array(5).fill(22.5));
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.animations!.find(c=>c.id===clipId)!.constraintTracks?.length??0).toBe(0);expect((await native.snapshot())!.constraints).toEqual(before.constraints);
});
