import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import {copyFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import type {BoneView,EvaluationSnapshot,ProjectSummary} from '../../src/domain/project';

type Workspace={renderedBones:BoneView[];simulationTime:number;simulationRunning:boolean;simulationError:string;advanceSimulation(dt:number):void};
async function rendered(page:Page,id:number){return page.evaluate(id=>{const app=document.querySelector('#app') as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,Workspace>}}}}};return app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!.renderedBones.find(b=>b.id===id)?.evaluatedWorld;},id);}
async function edit(native:NativeSession,p:ProjectSummary,command:unknown){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:command});}
async function fixture(page:Page,native:NativeSession){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Live Setup gravity',discardChanges:true});
 p=await edit(native,p,{type:'create',parent:p.bones[0]!.id,x:-100,y:0,rotation:0,length:80});const parent=p.editedBone!;
 p=await edit(native,p,{type:'create',parent,x:80,y:0,rotation:0,length:60});const child=p.editedBone!;
 p=await edit(native,p,{type:'addConstraint',constraint:{type:'physics',name:'Live gravity',bone:child,x:1,y:1,rotate:null,shearX:0,scaleX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}});
 await openNativeEditor(page);const id=p.constraints!.at(-1)!.id;await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();
 await expect(page.getByTestId('physics-simulate')).toBeChecked();await expect.poll(async()=>(await page.getByTestId('physics-preview-time').innerText())).not.toBe('0.000 s');
 const gravity=page.getByTestId('physics-gravity');await gravity.fill('10');await gravity.press('Enter');await expect.poll(async()=>{const c=(await native.snapshot())?.constraints?.find(c=>c.id===id);return c?.type==='physics'?c.gravity:null;}).toBe(10);
 await expect.poll(async()=>(await rendered(page,child))?.y).toBeLessThan(-.2);return {parent,child,id};
}
async function selectParent(page:Page,id:number){await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Bones',exact:true}).click();await page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem').click();await page.getByRole('button',{name:'Translate',exact:true}).click();}
async function startParentDrag(page:Page,id:number){
 await selectParent(page,id);const world=(await rendered(page,id))!,box=(await page.getByTestId('viewport').locator('canvas').boundingBox())!;
 const start={x:box.x+box.width/2+world.x,y:box.y+box.height/2-world.y};await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+80,start.y,{steps:8});return start;
}

test('@native Setup gravity is live by default during an actual parent drag and after release without Run or Play',async({page,native},testInfo)=>{
 const f=await fixture(page,native),before=(await native.snapshot())!,calls=native.calls.length;
 const start=await startParentDrag(page,f.parent);await expect.poll(async()=>(await rendered(page,f.parent))?.x).toBeCloseTo(-20,2);
 await expect.poll(async()=>{const child=(await rendered(page,f.child))!,parent=(await rendered(page,f.parent))!;return Math.abs(child.x-parent.x-80);}).toBeGreaterThan(2);
 expect(await native.snapshot()).toEqual(before);const held=(await rendered(page,f.child))!;
 await expect.poll(async()=>Math.abs((await rendered(page,f.child))!.x-held.x)).toBeGreaterThan(.5);expect((await rendered(page,f.child))!.y).toBeLessThan(-.2);
 await page.mouse.up();await expect.poll(async()=>(await native.snapshot())?.bones.find(b=>b.id===f.parent)?.x).toBeCloseTo(-20,2);
 const committed=(await native.snapshot())!;expect(committed.revision).toBe(before.revision+1);expect(committed.bones.find(b=>b.id===f.child)).toEqual(before.bones.find(b=>b.id===f.child));
 expect(native.calls.slice(calls).filter(c=>c.command==='edit_rig')).toHaveLength(1);expect(native.calls.slice(calls).filter(c=>c.command==='evaluate_project')).toHaveLength(0);
 const released=(await rendered(page,f.child))!;await expect.poll(async()=>Math.abs((await rendered(page,f.child))!.x-released.x)).toBeGreaterThan(.2);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.bones.find(b=>b.id===f.parent)?.x).toBe(-100);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.bones.find(b=>b.id===f.parent)?.x).toBeCloseTo(-20,2);
 const savedBones=(await native.snapshot())!.bones;await native.queueDialog('save','live-gravity.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
 const saved=(await native.snapshot())!,output=testInfo.outputPath('live-setup-gravity-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await cp(join(dirname(saved.path!),'images'),join(output,'images'),{recursive:true});await writeFile(join(output,'authored.json'),JSON.stringify({ids:f,before,committed,saved},null,2));await page.screenshot({path:join(output,'live-setup-gravity.png')});
 const file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await file.locator('summary').click();await file.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open','live-gravity.fbones');await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();
 expect((await native.snapshot())!.bones).toEqual(savedBones);await expect(page.getByTestId('physics-simulate')).toBeChecked();
 expect(start.x).toBeGreaterThan(0);
});

test('@native Simulate off, Reset and temporary geometry holds preserve intent and do not bake gravity',async({page,native})=>{
 const f=await fixture(page,native);await page.getByTestId('physics-simulate').uncheck();const before=(await native.snapshot())!;
 await page.getByTestId('physics-preview-reset').click();await expect(page.getByTestId('physics-simulate')).not.toBeChecked();await expect(page.getByTestId('physics-preview-time')).toHaveText('0.000 s');
 await page.getByTestId('physics-preview-step').click();await expect(page.getByTestId('physics-preview-time')).not.toHaveText('0.000 s');expect(await native.snapshot()).toEqual(before);
 // Reset starts a new preview epoch; compare resumed motion with its paused Step pose.
 await expect(page.getByTestId('physics-simulate')).not.toBeChecked();const stepped=(await rendered(page,f.child))!;
 await page.getByTestId('physics-simulate').check();await expect.poll(async()=>(await rendered(page,f.child))!.y).toBeLessThan(stepped.y-.01);
 // An Images geometry gesture freezes exactly one authoritative native pose.
 await native.queueDialog('folder','images');await page.getByRole('button',{name:'Choose images folder…',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.library?.images.length).toBe(5);
 const canvas=page.getByTestId('viewport').locator('canvas'),box=(await canvas.boundingBox())!,start=native.calls.length;
 await page.getByRole('treeitem',{name:'blue.png',exact:true}).dragTo(canvas,{targetPosition:{x:box.width/2+100,y:box.height/2-100}});await expect.poll(async()=>(await native.snapshot())?.slots.length).toBe(1);
 await expect(page.getByTestId('physics-simulate')).toBeChecked();const tick=await page.getByTestId('physics-preview-time').innerText();await expect(page.getByTestId('physics-preview-time')).not.toHaveText(tick);
 const evaluation=native.calls.slice(start).filter(c=>c.command==='evaluate_project'),place=native.calls.slice(start).find(c=>c.command==='place_images');expect(evaluation).toHaveLength(1);expect(place?.args.poseEpoch).toBe((evaluation[0]!.result as EvaluationSnapshot).poseEpoch);
 // Selection-only gestures must release their temporary geometry lease too.
 const selectedBefore=(await native.snapshot())!;
 await page.mouse.move(box.x+box.width/2+180,box.y+box.height/2+70);await page.mouse.down();await page.mouse.move(box.x+box.width/2+220,box.y+box.height/2+100);await page.mouse.up();
 let resumed=await page.getByTestId('physics-preview-time').innerText();await expect(page.getByTestId('physics-preview-time')).not.toHaveText(resumed);
 await page.keyboard.down('Control');await page.mouse.click(box.x+box.width/2+100,box.y+box.height/2-100);await page.keyboard.up('Control');
 resumed=await page.getByTestId('physics-preview-time').innerText();await expect(page.getByTestId('physics-preview-time')).not.toHaveText(resumed);expect(await native.snapshot()).toEqual(selectedBefore);
 const stable=(await native.snapshot())!;await page.getByTestId('physics-simulate').uncheck();await page.getByRole('treeitem',{name:'green.png',exact:true}).dragTo(canvas,{targetPosition:{x:box.width/2+150,y:box.height/2-100}});await expect.poll(async()=>(await native.snapshot())?.slots.length).toBe(2);await expect(page.getByTestId('physics-simulate')).not.toBeChecked();
 expect((await native.snapshot())!.bones).toEqual(stable.bones);
});

test('@native default live gravity continues past two minutes with bounded native checkpoints and unchanged authoring',async({page,native})=>{
 const f=await fixture(page,native),before=(await native.snapshot())!,start=native.calls.length;
 // Accelerate only the production preview clock; real Rust receives its normal
 // bounded checkpoint RPCs. There is no alternate spring or JS persistence model.
 await page.evaluate(async()=>{
  const app=document.querySelector('#app') as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,Workspace>}}}}};const w=app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!;
  for(let second=0;second<135;second++){for(let tick=0;tick<60;tick++)w.advanceSimulation(1/60);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
 });
 await expect.poll(async()=>Number((await page.getByTestId('physics-preview-time').innerText()).split(' ')[0])).toBeGreaterThan(120);
 await expect(page.getByTestId('physics-simulate')).toBeChecked();expect(await native.snapshot()).toEqual(before);
 const evaluations=native.calls.slice(start).filter(c=>c.command==='evaluate_project');expect(evaluations.length).toBeGreaterThanOrEqual(2);expect(evaluations.length).toBeLessThan(25);expect(evaluations.some(c=>(c.args.request as {fromPoseEpoch?:number}).fromPoseEpoch!==undefined)).toBe(true);
 expect(evaluations.every(c=>!c.error)).toBe(true);await expect.poll(async()=>(await rendered(page,f.child))?.y).toBeLessThan(-.2);
 expect(await page.getByTestId('viewport').locator('canvas').count()).toBe(1);
});
