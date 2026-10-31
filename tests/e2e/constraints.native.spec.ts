import {test,expect,openNativeEditor,newNativeProject,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {BoneView,EvaluationSnapshot} from '../../src/domain/project';

const mode=(page:Page)=>page.getByRole('group',{name:'Editing mode',exact:true});
const boneRow=(page:Page,id:number)=>page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"] [role="treeitem"]`);
async function addBone(page:Page,native:NativeSession,name:string,parent:number,x:number,y:number,length:number){
  await mode(page).getByRole('button',{name:'Bones',exact:true}).click();await boneRow(page,parent).click();const count=(await native.snapshot())!.bones.length;
  await page.getByRole('button',{name:'Add bone',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.bones.length).toBe(count+1);
  const nameField=page.getByTestId('bone-name');await nameField.fill(name);await nameField.press('Enter');await expect.poll(async()=>(await native.snapshot())?.bones.some(b=>b.name===name)).toBe(true);
  for(const[field,value]of [['x',x],['y',y],['length',length]] as const){const input=page.getByTestId(`bone-${field}`);await input.fill(String(value));await input.press('Enter');await expect.poll(async()=>(await native.snapshot())?.bones.find(b=>b.name===name)?.[field]).toBe(value);}
  return (await native.snapshot())!.bones.find(b=>b.name===name)!.id;
}
async function createConstraint(page:Page,native:NativeSession,type:'ik'|'transform'|'physics',members:number[],reference?:number){
  const beforeCount=(await native.snapshot())!.constraints?.length??0;
  await mode(page).getByRole('button',{name:'Bones',exact:true}).click();await boneRow(page,members[0]!).click();for(const id of members.slice(1))await boneRow(page,id).click({modifiers:['Control']});
  await page.getByRole('button',{name:'New ▾',exact:true}).click();await page.getByRole('menuitem',{name:type==='ik'?'IK constraint':type==='transform'?'Transform constraint':'Physics constraint',exact:true}).click();
  const dialog=page.getByRole('dialog');
  if(type==='physics'){await expect(dialog).toHaveCount(0);await expect.poll(async()=>(await native.snapshot())?.constraints?.length).toBe(beforeCount+members.length);return (await native.snapshot())!.constraints!.at(-1)!;}
  await expect(dialog).toBeVisible();
  // The controls' accessible names exclude option text; getByLabel's implicit
  // label text also includes the nested options in this Vue template.
  await dialog.getByRole('listbox',{name:'Constrained bones',exact:true}).selectOption(members.map(String));await dialog.getByRole('combobox',{name:type==='transform'?'Source':'Target',exact:true}).selectOption(String(reference));
  const count=(await native.snapshot())!.constraints?.length??0;await dialog.getByRole('button',{name:'Create',exact:true}).click();await expect(dialog).toHaveCount(0);await expect.poll(async()=>(await native.snapshot())?.constraints?.length).toBe(count+1);
  return (await native.snapshot())!.constraints!.at(-1)!;
}
async function rendered(page:Page,id:number){
  return page.evaluate(id=>{const app=document.querySelector('#app') as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,{renderedBones:BoneView[]}>}}}}};return app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!.renderedBones.find(b=>b.id===id)?.evaluatedWorld;},id);
}
async function field(page:Page,testId:string,value:number){const input=page.getByTestId(testId);await input.fill(String(value));await input.press('Enter');}
async function closeAndOpen(page:Page,native:NativeSession,path:string){
  const file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
  if(!await file.evaluate(node=>(node as HTMLDetailsElement).open))await file.locator('summary').click();await file.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open',path);
  if(!await file.evaluate(node=>(node as HTMLDetailsElement).open))await file.locator('summary').click();await file.getByRole('button',{name:/^Open project/}).click();await expect.poll(()=>native.snapshot()).not.toBeNull();
}

test('@native two-link IK controls evaluate the visible chain without writing solved rotations into setup',async({page,native})=>{
  await openNativeEditor(page);await newNativeProject(page,'Linux IK chain');const upper=await addBone(page,native,'Upper',0,-80,0,60),lower=await addBone(page,native,'Lower',upper,60,0,50),target=await addBone(page,native,'Target',0,-20,70,10),before=(await native.snapshot())!.bones;
  const constraint=await createConstraint(page,native,'ik',[upper,lower],target);expect(constraint.type).toBe('ik');expect((await native.snapshot())!.bones).toEqual(before);
  await expect.poll(async()=>{const m=await rendered(page,lower);return m?m.x+m.a*50:null;}).toBeCloseTo(-20,3);await expect.poll(async()=>{const m=await rendered(page,lower);return m?m.y+m.b*50:null;}).toBeCloseTo(70,3);
  await field(page,'constraint-mix',0);await expect.poll(async()=>(await native.snapshot())?.constraints?.find(c=>c.type==='ik')?.mix).toBe(0);await expect.poll(async()=>(await rendered(page,upper))?.b).toBeCloseTo(0,5);expect((await native.snapshot())!.bones).toEqual(before);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.constraints?.find(c=>c.type==='ik')?.mix).toBe(1);
  await native.queueDialog('save','ik.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);await closeAndOpen(page,native,'ik.fbones');expect((await native.snapshot())!.constraints?.find(c=>c.type==='ik')?.bones.length).toBe(2);
});

test('@native Transform offset and mix controls change evaluated output and survive native save/reopen',async({page,native})=>{
  await openNativeEditor(page);await newNativeProject(page,'Linux Transform controls');const member=await addBone(page,native,'Mapped',0,-70,0,60),source=await addBone(page,native,'Source',0,60,50,20),before=(await native.snapshot())!.bones;
  await createConstraint(page,native,'transform',[member],source);await expect(page.getByTestId('transform-mappings')).toBeVisible();
  await expect.poll(async()=>(await rendered(page,member))?.x).toBeCloseTo(60,3);await expect.poll(async()=>(await rendered(page,member))?.y).toBeCloseTo(50,3);
  await field(page,'transform-mix-1',0);await expect.poll(async()=>(await native.snapshot())?.constraints?.find(c=>c.type==='transform')?.mix[1]).toBe(0);await expect.poll(async()=>(await rendered(page,member))?.x).toBeCloseTo(-70,3);
  await field(page,'transform-mix-1',100);await page.getByText('Offsets',{exact:true}).click();await field(page,'transform-offset-1',12);await expect.poll(async()=>(await rendered(page,member))?.x).toBeCloseTo(72,3);expect((await native.snapshot())!.bones).toEqual(before);
  await native.queueDialog('save','transform.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);await closeAndOpen(page,native,'transform.fbones');expect((await native.snapshot())!.constraints?.find(c=>c.type==='transform')?.offsets[1]).toBe(12);
});

test('@native Physics Simulate/Step stays transient and a real PNG drop commits the frozen pose epoch',async({page,native})=>{
  await openNativeEditor(page);await newNativeProject(page,'Linux Physics preview');await createConstraint(page,native,'physics',[0]);
  await field(page,'physics-x',100);await field(page,'physics-wind',10);await field(page,'physics-strength',20);await expect.poll(async()=>(await native.snapshot())?.constraints?.find(c=>c.type==='physics')?.strength).toBe(20);
  const authored=(await native.snapshot())!,simulate=page.getByTestId('physics-simulate'),time=page.getByTestId('physics-preview-time');await expect(simulate).toBeChecked();await expect.poll(async()=>Number((await time.innerText()).split(' ')[0])).toBeGreaterThan(.05);await simulate.uncheck();await expect(simulate).not.toBeChecked();
  expect(await native.snapshot()).toEqual(authored);await expect.poll(async()=>(await rendered(page,0))?.x).toBeGreaterThan(0);const paused=Number((await time.innerText()).split(' ')[0]);await page.getByTestId('physics-preview-step').click();await expect.poll(async()=>Number((await time.innerText()).split(' ')[0])).toBeGreaterThan(paused);expect(await native.snapshot()).toEqual(authored);
  await native.queueDialog('folder','images');await page.getByRole('button',{name:'Choose images folder…',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.library?.images.length).toBe(5);const frozenTime=await time.innerText(),start=native.calls.length;
  const canvas=page.getByTestId('viewport').locator('canvas'),box=(await canvas.boundingBox())!;await page.getByRole('treeitem',{name:'blue.png',exact:true}).dragTo(canvas,{targetPosition:{x:box.width/2+60,y:box.height/2+30}});await expect.poll(async()=>(await native.snapshot())?.slots.length).toBe(1);
  const calls=native.calls.slice(start),evaluation=calls.filter(c=>c.command==='evaluate_project'),placement=calls.find(c=>c.command==='place_images');expect(evaluation).toHaveLength(1);expect(placement).toBeTruthy();const pose=evaluation[0]!.result as EvaluationSnapshot;expect(placement!.args.poseEpoch).toBe(pose.poseEpoch);
  const root=pose.bones.find(b=>b.id===0)!.world,region=(await native.snapshot())!.slots[0]!.region!;expect(root.x+root.a*region.x+root.c*region.y).toBeCloseTo(60,3);expect(root.y+root.b*region.x+root.d*region.y).toBeCloseTo(-30,3);expect((await native.snapshot())!.bones[0]!.x).toBe(0);await expect(time).toHaveText(frozenTime);
  await native.queueDialog('save','physics.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);await closeAndOpen(page,native,'physics.fbones');await expect(simulate).toBeChecked();expect((await native.snapshot())!.bones[0]!.x).toBe(0);expect((await native.snapshot())!.constraints?.[0]?.type).toBe('physics');
});
