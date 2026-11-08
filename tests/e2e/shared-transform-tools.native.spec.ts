import {test,expect,openNativeEditor} from './fixtures/native-session';
import type {ProjectSummary} from '../../src/domain/project';

test('@native central transform rows work in Setup and Animate with separate authoring and no duplicate HUD',async({page,native},info)=>{
 let project=await native.invoke<ProjectSummary>('create_project',{name:'Own shared transform tools',discardChanges:true});
 project=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:project.revision,edit:{type:'create',parent:project.bones[0]!.id,x:31,y:8,rotation:17,length:45}});
 const id=project.editedBone!;await openNativeEditor(page);await page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem').click();
 const tools=page.getByTestId('animation-tools');await expect(tools).toHaveAttribute('aria-label','Setup transform tools');await expect(tools.locator('.animation-transform-row')).toHaveCount(5);await expect(page.getByTestId('bone-x')).toHaveCount(1);await expect(page.getByTestId('animate-auto-key')).toHaveCount(0);await expect(tools.getByRole('button',{name:'Key Translate',exact:true})).toHaveCount(0);
 for(const [field,value]of [['x',47.25],['length',55],['scaleX',1.375]]as const){const input=page.getByTestId('bone-'+field);await input.fill(String(value));await input.press('Enter');await expect.poll(async()=>(await native.snapshot())!.bones.find(b=>b.id===id)![field]).toBe(value);}
 const setup=(await native.snapshot())!;await page.screenshot({path:info.outputPath('setup-shared-transform-tools.png')});
 await page.getByTestId('editor-mode-animate').click();await expect(tools).toHaveAttribute('aria-label','Animation transform tools');await expect(tools.locator('.animation-transform-row')).toHaveCount(4);await expect(page.getByTestId('animate-bone-x')).toHaveValue('47.25');await tools.getByRole('button',{name:'Key Translate',exact:true}).click();
 const frame=page.getByTestId('timeline-current');await frame.fill('10');await frame.press('Enter');const x=page.getByTestId('animate-bone-x');await x.fill('72.25');await x.press('Enter');await expect.poll(async()=>(await native.snapshot())!.animations![0]!.tracks[0]!.keys.length).toBe(2);expect((await native.snapshot())!.bones).toEqual(setup.bones);
 await page.getByTestId('editor-mode-setup').click();await expect(tools).toHaveAttribute('aria-label','Setup transform tools');await expect(page.getByTestId('bone-x')).toHaveValue('47.25');await expect(page.getByTestId('bone-length')).toHaveValue('55');await expect(page.getByTestId('bone-scaleX')).toHaveValue('1.375');expect((await native.snapshot())!.bones).toEqual(setup.bones);await expect(page.getByTestId('animation-timeline')).toHaveCount(0);
 const viewport=(await page.getByTestId('viewport').boundingBox())!,hud=(await tools.boundingBox())!;expect(hud.x).toBeGreaterThanOrEqual(viewport.x);expect(hud.x+hud.width).toBeLessThanOrEqual(viewport.x+viewport.width+1);await expect(tools.getByRole('button',{name:'Create',exact:true})).toBeEnabled();
});

test('@native fractional frame seek and manual key preserve the exact f32 bone endpoint and outgoing Bezier',async({page,native})=>{
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own fractional frame identity',discardChanges:true});const root=p.bones[0]!.id;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'createAnimation',name:'Fractional'}});const animation=p.editedAnimation!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'setAnimationKeys',animation,keys:[{bone:root,channel:'translate',frame:.3,values:[17.75,0],curve:'bezier',controls:[[.4,17.75,.5,100000],[.4,0,.5,0]]},{bone:root,channel:'translate',frame:.6,values:[100000,0],curve:'linear'}]}});
 const authored=p.animations!.find(a=>a.id===animation)!.tracks[0]!.keys;
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(animation));await page.locator(`[data-tree-kind="bone"][data-tree-id="${root}"]`).getByRole('treeitem').click();const frame=page.getByTestId('timeline-current');await frame.fill(String(.1+.2));await frame.press('Enter');await expect(frame).toHaveValue('0.3');await expect(page.getByTestId('animate-bone-x')).toHaveValue('17.75');
 const before=(await native.snapshot())!;await page.getByTestId('animation-tools').getByRole('button',{name:'Key Translate',exact:true}).click();await expect(page.getByTestId('animation-tools').getByRole('button',{name:'Key Translate',exact:true})).toBeEnabled();const after=(await native.snapshot())!;expect(after.revision).toBe(before.revision);expect(after.animations!.find(a=>a.id===animation)!.tracks[0]!.keys).toEqual(authored);expect(after.bones).toEqual(before.bones);
});

test('@native replacing a compact fractional value after focus commits exactly the typed local working value',async({page,native})=>{
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own precise focus replacement',discardChanges:true});
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'create',parent:p.bones[0]!.id,x:-30,y:0,rotation:0,length:30}});const bone=p.editedBone!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'createAnimation',name:'Own repeating decimal sample'}});const animation=p.editedAnimation!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'setAnimationKeys',animation,keys:[{bone,channel:'translate',frame:0,values:[0,0],curve:'linear'},{bone,channel:'translate',frame:30,values:[20,10],curve:'linear'}]}});
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(animation));await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();await page.getByTestId('timeline-auto-key').click();
 const frame=page.getByTestId('timeline-current');await frame.fill('8');await frame.press('Enter');const x=page.getByTestId('animate-bone-x'),y=page.getByTestId('animate-bone-y'),canvas=page.getByTestId('viewport').locator('canvas');
 await expect(x).toHaveValue(String(-30+20*(8/30)));await expect(x.locator('..').locator('.animation-transform-compact')).toHaveText('-24.6667');await canvas.focus();const before=(await native.snapshot())!,calls=native.calls.length;
 // fill selects the previous contents immediately after focus. An asynchronous
 // compact→precise value rewrite used to erase that selection and append11.
 await x.fill('11');await expect(x).toHaveValue('11');await x.press('Enter');await expect(x).toHaveValue('11');
 await y.focus();await expect(y).toHaveValue(String(10*8/30));await expect(y.locator('..').locator('.animation-transform-compact')).toBeHidden();await canvas.focus();await expect(y).toHaveValue(String(10*8/30));await expect(y.locator('..').locator('.animation-transform-compact')).toHaveText('2.66667');await expect(y.locator('..').locator('.animation-transform-compact')).toBeVisible();
 await x.fill('999');await x.press('Escape');await expect(x).toHaveValue('11');expect(await native.snapshot()).toEqual(before);expect(native.calls.slice(calls).filter(call=>call.command==='edit_rig')).toHaveLength(0);
});
