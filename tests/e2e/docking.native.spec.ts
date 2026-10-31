import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {ConstraintInput,ProjectSummary,RigEdit} from '../../src/domain/project';
import type {Locator,Page} from '@playwright/test';
async function edit(native:NativeSession,edit:RigEdit){const p=(await native.snapshot())!;return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit});}
async function fixture(native:NativeSession,constraints=true){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Docked constraint views',discardChanges:true});const root=p.bones[0]!.id;
 p=await edit(native,{type:'create',parent:root,x:35,y:0,rotation:0,length:30});const member=p.editedBone!;
 p=await edit(native,{type:'create',parent:root,x:-25,y:55,rotation:0,length:10});const source=p.editedBone!;
 if(constraints){
  const mapping:ConstraintInput={type:'transform',name:'Transform one',source,bones:[member],localSource:true,localTarget:true,additive:false,clamp:false,offsets:[0,0,0,0,0,0],mix:[0,0,0,0,0,0],properties:[{property:'x',offset:0,to:[{property:'rotate',offset:0,max:1,scale:1}]}]};
  for(const c of [mapping,{...mapping,name:'Transform two'},{type:'ik',name:'IK one',bones:[member],target:source,mix:0,softness:0,bendPositive:true,compress:false,stretch:false},{type:'physics',name:'Physics one',bone:member,x:0,y:0,scaleX:0,rotate:null,shearX:0,step:1/60,inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}] satisfies ConstraintInput[])p=await edit(native,{type:'addConstraint',constraint:c});
 }
 return{root,member,source,project:p};
}
async function views(page:Page){const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^Views$/})});if(!await menu.evaluate(e=>(e as HTMLDetailsElement).open))await menu.locator('summary').click();return menu;}
async function toggle(page:Page,id:string,checked=true){await views(page);await page.getByTestId('view-toggle-'+id).setChecked(checked);await page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^Views$/})}).locator('summary').click();}
const panel=(page:Page,id:string)=>page.getByTestId('dock-panel-'+id);
async function dragPanel(page:Page,id:string,target:string){
 const handle=page.getByTestId('dock-drag-'+id);await handle.scrollIntoViewIfNeeded();const b=(await handle.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-8,b.y+b.height/2+8,{steps:3});await expect(page.getByTestId('dock-drag-preview')).toBeVisible();
 const drop=page.getByTestId(target);await drop.scrollIntoViewIfNeeded();const destination=JSON.parse((await drop.getAttribute('data-dock-drop'))!) as {column:string;split?:string};const d=(await drop.boundingBox())!;await page.mouse.move(d.x+d.width/2,d.y+d.height/2,{steps:8});await page.mouse.up();await expect(page.getByTestId('dock-drag-preview')).toHaveCount(0);
 await expect(panel(page,id),'moved panel content remains connected to the document').toBeVisible();
 if(!destination.split)await expect(page.locator(`[data-dock-column="${destination.column}"]`).getByTestId('dock-panel-'+id),'content is inside the actual destination column').toBeVisible();
}
function changes(native:NativeSession,start:number){return native.calls.slice(start).filter(c=>c.command==='edit_rig');}

test('@native Views opens existing type panels without creating constraints or changing Tree selection; empty view has a real New flow',async({page,native})=>{
 const f=await fixture(native,false);await openNativeEditor(page);await page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`).getByRole('treeitem').click();const before=(await native.snapshot())!,start=native.calls.length;
 for(const type of ['ik','transform','physics']){await toggle(page,type);await expect(panel(page,type).getByText(`No ${type==='ik'?'IK constraint':type==='transform'?'Transform constraint':'Physics constraint'} exists in this project.`,{exact:true})).toBeVisible();}
 expect(await native.snapshot()).toEqual(before);expect(changes(native,start)).toHaveLength(0);await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`)).toHaveClass(/selected/);
 await panel(page,'physics').getByRole('button',{name:'New Physics constraint',exact:true}).last().click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>(await native.snapshot())!.constraints!.length).toBe(1);const added=(await native.snapshot())!;expect(added.constraints![0]!.type).toBe('physics');expect(added.constraints![0]!.type==='physics'&&added.constraints![0]!.bone).toBe(f.member);expect(added.revision).toBe(before.revision+1);expect(changes(native,start)).toHaveLength(1);expect((changes(native,start)[0]!.args.edit as {type:string}).type).toBe('addPhysicsToBones');expect(added.bones).toEqual(before.bones);
});

test('@native simultaneous explicit constraint inspectors and nested mappings edit their own stable IDs while Tree selects a bone',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`).getByRole('treeitem').click();const before=(await native.snapshot())!;
 const transforms=before.constraints!.filter(c=>c.type==='transform');
 for(const type of ['ik','transform','physics'])await toggle(page,type);
 await panel(page,'transform').getByRole('combobox',{name:'Constraint',exact:true}).selectOption(String(transforms[1]!.id));
 const start=native.calls.length,field=panel(page,'transform').getByTestId('transform-mix-0');await field.fill('37');await field.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.id===transforms[1]!.id);return c?.type==='transform'?c.mix[0]:null;}).toBeCloseTo(.37,5);
 const from=panel(page,'transform').getByTestId('transform-range-4');await from.fill('12');await from.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.id===transforms[1]!.id);return c?.type==='transform'?c.properties[0]!.offset:null;}).toBe(12);
 const wind=panel(page,'physics').getByTestId('physics-wind');await wind.fill('9');await wind.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.type==='physics');return c?.type==='physics'?c.wind:null;}).toBe(9);
 const mix=panel(page,'ik').getByTestId('constraint-mix');await mix.fill('25');await mix.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())!.constraints!.find(c=>c.type==='ik');return c?.type==='ik'?c.mix:null;}).toBe(.25);
 expect((await native.snapshot())!.constraints!.find(c=>c.id===transforms[0]!.id)).toEqual(transforms[0]);await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${f.member}"]`)).toHaveClass(/selected/);
 const ids=changes(native,start).map(c=>(c.args.edit as {id:number}).id);expect(ids.slice(0,2)).toEqual([transforms[1]!.id,transforms[1]!.id]);
});

test('@native panel header drag reorders/splits, both resize axes persist and Reset recovers without project edits',async({page,native})=>{
 await fixture(native,false);await openNativeEditor(page);await toggle(page,'weights');await toggle(page,'mesh');const before=(await native.snapshot())!,start=native.calls.length;
 await dragPanel(page,'mesh','dock-drop-before-tree');const order=await page.locator('[data-dock-column="scene"] [data-testid^="dock-panel-"]').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('data-testid')));expect(order).toEqual(['dock-panel-mesh','dock-panel-tree','dock-panel-properties']);
 await dragPanel(page,'weights','dock-drop-left-scene');await expect(page.locator('[data-dock-column="split-weights"]')).toBeVisible();
 const tree=panel(page,'tree'),height=(await tree.boundingBox())!.height,handle=page.getByTestId('dock-height-tree');await handle.scrollIntoViewIfNeeded();const hb=(await handle.boundingBox())!;await page.mouse.move(hb.x+30,hb.y+2);await page.mouse.down();await page.mouse.move(hb.x+30,hb.y+47,{steps:8});await page.mouse.up();await expect.poll(async()=>(await tree.boundingBox())!.height).toBeGreaterThan(height+25);
 const width=page.getByTestId('dock-width-scene'),oldWidth=await width.getAttribute('aria-valuenow');await width.focus();await page.keyboard.press('ArrowLeft');expect(Number(await width.getAttribute('aria-valuenow'))).toBe(Number(oldWidth)+16);
 const persisted=await page.evaluate(()=>localStorage.getItem('fbones.dock-layout.v1'));expect(persisted).toContain('split-weights');await page.reload();await expect(page.locator('[data-dock-column="split-weights"]')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('fbones.dock-layout.v1'))).toBe(persisted);
 await views(page);await page.getByTestId('reset-layout').click();await expect(page.locator('[data-dock-column="scene"]')).toBeVisible();await expect(page.locator('[data-dock-column="split-weights"]')).toHaveCount(0);expect(await native.snapshot()).toEqual(before);expect(changes(native,start)).toHaveLength(0);
});

test('@native relocating a constraint panel flushes its active field once and Save waits; hiding and reopening retains the explicit target',async({page,native})=>{
 const f=await fixture(native);await openNativeEditor(page);await toggle(page,'transform');const ids=f.project.constraints!.filter(c=>c.type==='transform').map(c=>c.id);const view=panel(page,'transform');await view.getByRole('combobox',{name:'Constraint',exact:true}).selectOption(String(ids[1]));
 const field=view.getByTestId('constraint-name');await field.fill('Moved draft constraint');const start=native.calls.length;await dragPanel(page,'transform','dock-drop-before-tree');await expect.poll(async()=>(await native.snapshot())!.constraints!.find(c=>c.id===ids[1])?.name).toBe('Moved draft constraint');expect(changes(native,start)).toHaveLength(1);
 await toggle(page,'transform',false);await toggle(page,'transform',true);await expect(panel(page,'transform').getByTestId('constraint-name')).toHaveValue('Moved draft constraint');await expect(panel(page,'transform').getByRole('combobox',{name:'Constraint',exact:true})).toHaveValue(String(ids[1]));
 await native.queueDialog('save','docked-constraints.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);expect((await native.snapshot())!.constraints!.find(c=>c.id===ids[0])?.name).toBe('Transform one');
});
