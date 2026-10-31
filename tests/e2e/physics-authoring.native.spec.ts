import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Locator,Page,TestInfo} from '@playwright/test';
import type {BoneView,PhysicsConstraintInput,ProjectSummary} from '../../src/domain/project';
import {copyFile,writeFile} from 'node:fs/promises';

type Physics=PhysicsConstraintInput&{id:number;order:number};
const physics=(p:ProjectSummary)=>p.constraints!.filter((c):c is Physics=>c.type==='physics');
const boneRow=(page:Page,id:number)=>page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
const constraintRow=(page:Page,id:number)=>page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem');
const edits=(native:NativeSession,start:number)=>native.calls.slice(start).filter(c=>c.command==='edit_rig');
async function edit(native:NativeSession,change:unknown){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:(await native.snapshot())!.revision,edit:change});}
async function chain(page:Page,native:NativeSession,lastLength=45){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Physics authoring chain',discardChanges:true});
 const ids:number[]=[p.bones[0]!.id];
 p=await edit(native,{type:'update',id:ids[0],name:'A',x:-150,y:0,rotation:0,length:80});
 for(const [name,x,length]of [['B',80,65],['C',65,55],['D',55,lastLength]] as const){
  p=await edit(native,{type:'create',parent:ids.at(-1)!,x,y:0,rotation:0,length});const id=p.editedBone!;ids.push(id);
  p=await edit(native,{type:'update',id,name,x,y:0,rotation:0,length});
 }
 await openNativeEditor(page);return{a:ids[0]!,b:ids[1]!,c:ids[2]!,d:ids[3]!};
}
async function selectBones(page:Page,ids:number[]){
 await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Bones',exact:true}).click();
 await boneRow(page,ids[0]!).click();for(const id of ids.slice(1))await boneRow(page,id).click({modifiers:['Control']});
}
async function newFromTree(page:Page){await page.getByRole('button',{name:'New ▾',exact:true}).click();await page.getByRole('menuitem',{name:'Physics constraint',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);}
async function physicsView(page:Page){
 const views=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^Views$/})});
 if(!await views.evaluate(e=>(e as HTMLDetailsElement).open))await views.locator('summary').click();
 await page.getByTestId('view-toggle-physics').check();await views.locator('summary').click();
 return page.getByTestId('dock-panel-physics');
}
async function inspect(page:Page,id:number){await constraintRow(page,id).click();const panel=page.locator(`[data-testid="constraint-inspector"][data-constraint-id="${id}"]`).first();await expect(panel).toBeVisible();return panel;}
async function renameBone(page:Page,native:NativeSession,id:number,name:string){
 await boneRow(page,id).click();const before=(await native.snapshot())!;const field=page.getByTestId('bone-name');await field.fill(name);await field.press('Enter');
 await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===id)!.name).toBe(name);
 expect((await native.snapshot())!.revision).toBe(before.revision+1);
}
async function save(page:Page,native:NativeSession,path:string){
 await native.queueDialog('save',path);const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
 await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);return(await native.snapshot())!;
}
async function reopen(page:Page,native:NativeSession,path:string){
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
 await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();
 await native.queueDialog('open',path);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();return(await native.snapshot())!;
}
async function artifact(page:Page,info:TestInfo,saved:ProjectSummary,observations:unknown){
 await copyFile(saved.path!,info.outputPath('ui-authored.fbones'));await writeFile(info.outputPath('authored.json'),JSON.stringify(observations,null,2));await page.screenshot({path:info.outputPath('physics-authoring.png')});
}
async function worlds(page:Page){
 return page.evaluate(()=>{const app=document.querySelector('#app') as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,{renderedBones:BoneView[]}>}}}}};return app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!.renderedBones.map(b=>({id:b.id,world:b.evaluatedWorld}));});
}
async function angles(page:Page,ids:number[]){const rendered=await worlds(page);return ids.map(id=>{const world=rendered.find(b=>b.id===id)?.world;if(!world)throw Error('Own rendered bone missing');return Math.abs(Math.atan2(world.b,world.a));});}
async function dragStart(page:Page,id:number,dy:number){
 await selectBones(page,[id]);await page.getByRole('button',{name:'Translate',exact:true}).click();
 const world=(await worlds(page)).find(b=>b.id===id)!.world!,box=(await page.getByTestId('viewport').locator('canvas').boundingBox())!;
 const x=box.x+box.width/2+world.x,y=box.y+box.height/2-world.y;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-dy,{steps:8});
}
async function sliderDrag(page:Page,slider:Locator,escape=false){
 await slider.scrollIntoViewIfNeeded();
 const box=(await slider.boundingBox())!;await page.mouse.move(box.x+box.width*.25,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height/2,{steps:8});
 if(escape)await page.keyboard.press('Escape');
}

test('@native Tree Ctrl/Shift selection creates independent B C D Physics in one action; bone rename follows automatic names and preserves custom names after reopen',async({page,native},info)=>{
 const ids=await chain(page,native),baseline=await save(page,native,'batch-before.fbones');await copyFile(baseline.path!,info.outputPath('ui-before.fbones'));await selectBones(page,[ids.b]);await boneRow(page,ids.d).click({modifiers:['Control']});
 await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${ids.b}"]`)).toHaveClass(/selected/);await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${ids.d}"]`)).toHaveClass(/selected/);
 await boneRow(page,ids.b).click({modifiers:['Shift']});for(const id of [ids.b,ids.c,ids.d])await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`)).toHaveClass(/selected/);
 const before=(await native.snapshot())!,start=native.calls.length;await newFromTree(page);await expect.poll(async()=>physics((await native.snapshot())!).length).toBe(3);
 const created=(await native.snapshot())!,records=physics(created);expect(created.revision).toBe(before.revision+1);expect(edits(native,start)).toHaveLength(1);expect(edits(native,start)[0]!.args.edit).toEqual({type:'addPhysicsToBones',bones:[ids.b,ids.c,ids.d]});
 expect(records.map(c=>[c.name,c.bone])).toEqual([['B_physics',ids.b],['C_physics',ids.c],['D_physics',ids.d]]);expect(created.bones).toEqual(before.bones);expect(created.slots).toEqual(before.slots);
 for(const c of records){expect(c.rotate).toBe(1);expect(c.x).toBe(0);expect(c.y).toBe(0);expect(c.inertia).toBe(1);expect(c.strength).toBe(100);expect(c.damping).toBeCloseTo(.85,6);expect(c.mass).toBe(1);expect(c.mix).toBe(1);expect(c.gravity).toBe(0);expect(c.wind).toBe(0);}
 await page.getByRole('button',{name:'New ▾',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Physics constraint',exact:true})).toBeDisabled();await page.getByRole('button',{name:'New ▾',exact:true}).click();expect(await native.snapshot()).toEqual(created);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>physics((await native.snapshot())!).length).toBe(0);expect((await native.snapshot())!.bones).toEqual(before.bones);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>physics((await native.snapshot())!)).toEqual(records);
 await renameBone(page,native,ids.b,'Tail');expect(physics((await native.snapshot())!)[0]!.name).toBe('Tail_physics');
 const custom=await inspect(page,records[1]!.id),field=custom.getByTestId('constraint-name');await field.fill('Cloth sway');await field.press('Enter');await expect.poll(async()=>physics((await native.snapshot())!)[1]!.name).toBe('Cloth sway');
 await renameBone(page,native,ids.c,'Middle');expect(physics((await native.snapshot())!)[1]!.name).toBe('Cloth sway');
 const saved=await save(page,native,'batch-physics.fbones'),opened=await reopen(page,native,'batch-physics.fbones');expect(opened.bones).toEqual(saved.bones);expect(opened.constraints).toEqual(saved.constraints);
 await renameBone(page,native,ids.d,'Tip');expect(physics((await native.snapshot())!).map(c=>c.name)).toEqual(['Tail_physics','Cloth sway','Tip_physics']);
 const final=await save(page,native,'renamed-batch-physics.fbones');await artifact(page,info,final,{before,created,saved,opened,final});
});

test('@native Physics slider stages one gesture, Escape cancels, extended precise entry and pending Save preserve native values',async({page,native},info)=>{
 const ids=await chain(page,native);await selectBones(page,[ids.b]);await newFromTree(page);await expect.poll(async()=>physics((await native.snapshot())!).length).toBe(1);
 const id=physics((await native.snapshot())!)[0]!.id;let panel=await inspect(page,id);const before=(await native.snapshot())!,start=native.calls.length;
 await sliderDrag(page,panel.getByTestId('physics-gravity-slider'));expect(await native.snapshot()).toEqual(before);expect(edits(native,start)).toHaveLength(0);
 await page.mouse.up();await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+1);const changed=(await native.snapshot())!;expect(physics(changed)[0]!.gravity).not.toBe(0);expect(edits(native,start)).toHaveLength(1);expect(changed.bones).toEqual(before.bones);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>physics((await native.snapshot())!)).toEqual(physics(before));panel=await inspect(page,id);
 const cancel=(await native.snapshot())!,cancelCalls=native.calls.length;await sliderDrag(page,panel.getByTestId('physics-gravity-slider'),true);await page.mouse.up();expect(await native.snapshot()).toEqual(cancel);expect(edits(native,cancelCalls)).toHaveLength(0);
 const slider=panel.getByTestId('physics-gravity-slider'),keyboardStart=native.calls.length;await slider.focus();
 for(let i=0;i<3;i++){const revision=(await native.snapshot())!.revision;await slider.press('ArrowRight');await expect.poll(async()=>(await native.snapshot())!.revision).toBe(revision+1);await expect(slider).toBeFocused();}
 expect(edits(native,keyboardStart)).toHaveLength(3);
 const gravity=panel.getByTestId('physics-gravity'),wind=panel.getByTestId('physics-wind'),invalidBefore=(await native.snapshot())!,invalidCalls=native.calls.length;
 await gravity.fill('');await wind.focus();await wind.fill('');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(panel.getByRole('alert')).toBeVisible();expect(await native.snapshot()).toEqual(invalidBefore);expect(native.calls.slice(invalidCalls).filter(call=>call.command==='save_project')).toHaveLength(0);
 await gravity.press('Escape');await expect(gravity).not.toHaveValue('');await expect(wind).toHaveValue('');await expect(panel.getByRole('alert')).toBeVisible();await page.getByRole('button',{name:'Save',exact:true}).click();expect(native.calls.slice(invalidCalls).filter(call=>call.command==='save_project')).toHaveLength(0);
 await wind.press('Escape');await expect(panel.getByRole('alert')).toHaveCount(0);expect(await native.snapshot()).toEqual(invalidBefore);expect(edits(native,invalidCalls)).toHaveLength(0);
 await gravity.fill('1234.125');await gravity.press('Enter');await expect.poll(async()=>physics((await native.snapshot())!)[0]!.gravity).toBe(1234.125);await expect(gravity).toHaveValue('1234.125');
 // Focus/blur of an extended value must never clamp it to a useful slider range.
 await gravity.focus();await gravity.press('Tab');expect(physics((await native.snapshot())!)[0]!.gravity).toBe(1234.125);
 await gravity.fill('12.375');const saved=await save(page,native,'slider-physics.fbones');expect(physics(saved)[0]!.gravity).toBe(12.375);expect(saved.bones).toEqual(before.bones);
 const opened=await reopen(page,native,'slider-physics.fbones');expect(opened.constraints).toEqual(saved.constraints);expect(opened.bones).toEqual(saved.bones);panel=await inspect(page,id);
 const widthHandle=page.getByTestId('dock-width-scene');await widthHandle.focus();for(let i=0;i<6;i++)await widthHandle.press('ArrowRight');
 const number=panel.getByTestId('physics-gravity'),range=panel.getByTestId('physics-gravity-slider');await range.scrollIntoViewIfNeeded();const bounds=(await panel.boundingBox())!;
 for(const control of [number,range]){const box=(await control.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(bounds.x);expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);expect(box.width).toBeGreaterThan(35);}
 expect(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect(await native.snapshot()).toEqual(opened);
 await artifact(page,info,saved,{before,changed,cancel,saved,opened});
});

test('@native default batch Physics reacts on B C D while parent A is dragged in Setup without Play, then settles; save never bakes child poses',async({page,native},info)=>{
 const ids=await chain(page,native),children=[ids.b,ids.c,ids.d];await selectBones(page,children);await newFromTree(page);await expect.poll(async()=>physics((await native.snapshot())!).length).toBe(3);await expect(page.getByTestId('physics-simulate')).toBeChecked();
 const baseline=await save(page,native,'live-batch-before.fbones');await copyFile(baseline.path!,info.outputPath('ui-before.fbones'));
 const before=(await native.snapshot())!,start=native.calls.length;await dragStart(page,ids.a,80);
 await expect.poll(async()=>Math.min(...await angles(page,children))).toBeGreaterThan(.005);
 const held=await worlds(page);expect(await native.snapshot()).toEqual(before);expect(edits(native,start)).toHaveLength(0);
 await page.mouse.up();await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===ids.a)!.y).toBeCloseTo(80,2);
 const committed=(await native.snapshot())!;expect(committed.revision).toBe(before.revision+1);expect(edits(native,start)).toHaveLength(1);
 expect(native.calls.slice(start).filter(c=>c.command==='evaluate_project').length).toBeLessThanOrEqual(2);
 for(const id of children)expect(committed.bones.find(b=>b.id===id)).toEqual(before.bones.find(b=>b.id===id));
 const released=await worlds(page);expect(Math.max(...await angles(page,children))).toBeGreaterThan(.005);
 // Settling must happen from the running simulation alone, before Save or Reset.
 await expect.poll(async()=>Math.max(...await angles(page,children)),{timeout:10000}).toBeLessThan(.01);expect(await native.snapshot()).toEqual(committed);const settled=await worlds(page);
 const saved=await save(page,native,'live-batch-physics.fbones');expect(saved.bones).toEqual(committed.bones);expect(saved.constraints).toEqual(committed.constraints);
 const opened=await reopen(page,native,'live-batch-physics.fbones');expect(opened.bones).toEqual(committed.bones);expect(opened.constraints).toEqual(committed.constraints);await expect(page.getByTestId('physics-simulate')).toBeChecked();
 await artifact(page,info,saved,{before,held,committed,released,settled,saved,opened});
});

test('@native Physics View creates zero-length XY fallback on its active bone selection and preserves explicit Simulate Off through creation Reset drag and Save',async({page,native},info)=>{
 const ids=await chain(page,native,0);await selectBones(page,[ids.b]);await newFromTree(page);await expect.poll(async()=>physics((await native.snapshot())!).length).toBe(1);await page.getByTestId('physics-simulate').uncheck();
 const view=await physicsView(page);await expect(view.getByRole('button',{name:'New Physics constraint',exact:true}).first()).toBeDisabled();await selectBones(page,[ids.d]);const before=(await native.snapshot())!,start=native.calls.length;
 await view.getByRole('button',{name:'New Physics constraint',exact:true}).first().click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>physics((await native.snapshot())!).length).toBe(2);
 const created=(await native.snapshot())!,zero=physics(created).find(c=>c.bone===ids.d)!;expect(zero.x).toBe(1);expect(zero.y).toBe(1);expect(zero.rotate??0).toBe(0);expect(zero.name).toBe('D_physics');expect(created.revision).toBe(before.revision+1);expect(edits(native,start)).toHaveLength(1);await expect(page.getByTestId('physics-simulate')).not.toBeChecked();
 await page.getByTestId('physics-preview-reset').click();await expect(page.getByTestId('physics-simulate')).not.toBeChecked();const frozen=(await native.snapshot())!;await dragStart(page,ids.a,50);expect(await native.snapshot()).toEqual(frozen);await page.mouse.up();
 await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===ids.a)!.y).toBeCloseTo(50,2);await expect(page.getByTestId('physics-simulate')).not.toBeChecked();expect(Math.max(...await angles(page,[ids.b,ids.c,ids.d]))).toBeLessThan(.0001);
 const authored=(await native.snapshot())!,saved=await save(page,native,'explicit-off-physics.fbones');expect(saved.bones).toEqual(authored.bones);expect(saved.constraints).toEqual(authored.constraints);await expect(page.getByTestId('physics-simulate')).not.toBeChecked();await artifact(page,info,saved,{before,created,frozen,authored,saved});
});
