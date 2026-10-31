import {test,expect,NativeSession,attachNativeSession,openNativeEditor,newNativeProject} from './fixtures/native-session';
import {readFileSync} from 'node:fs';
import type {Page} from '@playwright/test';

async function fileAction(page:Page,name:'Close project'|'Open project'){
  const file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
  if(!await file.evaluate(node=>(node as HTMLDetailsElement).open))await file.locator('summary').click();await file.getByRole('button',{name:new RegExp('^'+name)}).click();
}

test('@native real Rust sessions isolate state and propagate errors under the exact production HTTP CSP',async({request})=>{
  const a=await NativeSession.create(request),b=await NativeSession.create(request);
  try{
    expect(a.identity.id).not.toBe(b.identity.id);expect(a.identity.token).not.toBe(b.identity.token);await a.invoke('create_project',{name:'Isolated first',discardChanges:false});expect(await b.snapshot()).toBeNull();
    await expect(b.invoke('open_project',{discardChanges:false})).rejects.toMatchObject({code:'DialogMissing'});expect(await b.snapshot()).toBeNull();expect((await a.snapshot())?.name).toBe('Isolated first');
    const rejected=await request.post('/__e2e/rpc',{headers:{'x-fbones-session':a.identity.id,'x-fbones-token':b.identity.token},data:{command:'get_project',args:{}}});expect(rejected.status()).toBe(403);
    const response=await request.get('/'),config=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8'));expect(response.headers()['content-security-policy']).toBe(config.app.security.csp);
  }finally{await a.close();await b.close();}
});

test('@native two real browser contexts keep independent UI and Rust projects',async({browser,request})=>{
  const a=await NativeSession.create(request),b=await NativeSession.create(request),contexts=await Promise.all([browser.newContext({viewport:{width:1440,height:900}}),browser.newContext({viewport:{width:1440,height:900}})]),errors:string[]=[];
  try{
    const pages=await Promise.all(contexts.map(context=>context.newPage()));for(const page of pages)page.on('pageerror',error=>errors.push(error.message));
    await attachNativeSession(pages[0]!,a);await attachNativeSession(pages[1]!,b);await Promise.all(pages.map(openNativeEditor));
    await newNativeProject(pages[0]!,'First isolated UI');await expect(pages[1]!.getByRole('heading',{name:'A place to bring characters to life.',exact:true})).toBeVisible();expect(await b.snapshot()).toBeNull();
    await newNativeProject(pages[1]!,'Second isolated UI');expect((await a.snapshot())?.name).toBe('First isolated UI');expect((await b.snapshot())?.name).toBe('Second isolated UI');await expect(pages[0]!).toHaveTitle(/First isolated UI/);await expect(pages[1]!).toHaveTitle(/Second isolated UI/);expect(errors).toEqual([]);
  }finally{await Promise.all(contexts.map(context=>context.close()));await a.close();await b.close();}
});

test('@native UI bone properties Enter, Undo and save/close/reopen execute the real Rust Session',async({page,native})=>{
  await openNativeEditor(page);await newNativeProject(page,'Native Ubuntu bones');
  await page.getByRole('button',{name:'Add bone',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.bones.length).toBe(2);
  const name=page.getByTestId('bone-name');await name.fill('Arm Ubuntu');await name.press('Enter');await expect.poll(async()=>(await native.snapshot())?.bones.some(b=>b.name==='Arm Ubuntu')).toBe(true);
  const x=page.getByTestId('bone-x');await x.fill('37');await x.press('Enter');await expect.poll(async()=>(await native.snapshot())?.bones.find(b=>b.name==='Arm Ubuntu')?.x).toBe(37);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.bones.find(b=>b.name==='Arm Ubuntu')?.x).not.toBe(37);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.bones.find(b=>b.name==='Arm Ubuntu')?.x).toBe(37);
  await native.queueDialog('save','bones.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
  await fileAction(page,'Close project');await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open','bones.fbones');await fileAction(page,'Open project');await expect.poll(async()=>(await native.snapshot())?.name).toBe('Native Ubuntu bones');
  expect((await native.snapshot())?.bones.find(b=>b.name==='Arm Ubuntu')?.x).toBe(37);expect((await native.snapshot())?.dirty).toBe(false);
});

test('@native real HTML5 PNG drop, Mesh Bind/Auto/Direct and native persistence use no JS project model',async({page,native})=>{
  await openNativeEditor(page);await newNativeProject(page,'Native Ubuntu mesh');await page.getByRole('button',{name:'Add bone',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.bones.length).toBe(2);
  await native.queueDialog('folder','images');await page.getByRole('button',{name:'Choose images folder…',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.library?.images.length).toBe(5);
  const image=page.getByRole('treeitem',{name:'red.png',exact:true}),canvas=page.getByTestId('viewport').locator('canvas');await expect(image).toHaveAttribute('draggable','true');const box=await canvas.boundingBox();expect(box).not.toBeNull();
  await image.dragTo(canvas,{targetPosition:{x:box!.width*.55,y:box!.height*.4}});await expect.poll(async()=>(await native.snapshot())?.slots.length).toBe(1);
  await page.getByRole('button',{name:'Convert to mesh',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.slots[0]?.attachments?.[0]?.type).toBe('mesh');
  const mode=page.getByRole('group',{name:'Editing mode',exact:true});await mode.getByRole('button',{name:'Weights',exact:true}).click();
  const initial=(await native.snapshot())!;for(const bone of initial.bones)await page.locator(`[data-weight-bone="${bone.id}"] input[type="checkbox"]`).check();await page.getByTestId('weights-bind').click();
  await expect.poll(async()=>(await native.snapshot())?.slots[0]?.attachments?.[0]?.mesh?.bones.length).toBe(2);await page.getByTestId('weights-auto').click();await expect.poll(async()=>(await native.snapshot())?.slots[0]?.attachments?.[0]?.mesh?.vertices[0]?.weights.filter(value=>value>0).length).toBe(2);
  await page.getByTestId('weights-mode').selectOption('direct');await page.getByTestId('weights-vertex').selectOption('0');await page.getByTestId('weights-influence').selectOption(String(initial.bones[1]!.id));const direct=page.getByTestId('weights-direct-number');await expect(direct).toBeEnabled();await direct.fill('37');await page.locator(`[data-weight-bone="${initial.bones[0]!.id}"]`).hover();await expect(direct).toHaveValue('37');await direct.press('Enter');
  await expect.poll(async()=>(await native.snapshot())?.slots[0]?.attachments?.[0]?.mesh?.vertices[0]?.weights[1]).toBeCloseTo(.37,5);
  const before=(await native.snapshot())!;await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.slots[0]?.attachments?.[0]?.mesh?.vertices[0]?.weights[1]).toBeCloseTo(.37,5);
  await native.queueDialog('save','mesh.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);await fileAction(page,'Close project');await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open','mesh.fbones');await fileAction(page,'Open project');
  const reopened=(await native.snapshot())!;expect(reopened.slots[0]?.attachments?.[0]?.mesh?.vertices).toEqual(before.slots[0]?.attachments?.[0]?.mesh?.vertices);expect(reopened.dirty).toBe(false);
});
