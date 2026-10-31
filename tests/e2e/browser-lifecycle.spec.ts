import {test,expect,openBrowserEditor,createBrowserDraft} from './fixtures/browser';

test('production CSP starts real WebGL while self-hosted scripts still cannot use Function',async({page})=>{
  const response=await openBrowserEditor(page),csp=response.headers()['content-security-policy'];
  expect(csp).toBeTruthy();expect(csp).not.toContain("'unsafe-eval'");
  const gl=await page.getByTestId('viewport').locator('canvas').evaluate(canvas=>{
    const node=canvas as HTMLCanvasElement,context=node.getContext('webgl2')??node.getContext('webgl');
    return context?{version:context.getParameter(context.VERSION),renderer:context.getParameter(context.RENDERER),width:node.width,height:node.height}:null;
  });
  expect(gl).not.toBeNull();expect(gl!.width).toBeGreaterThan(100);expect(gl!.version).toMatch(/WebGL/);
  // This same-origin external script executes as page JavaScript, rather than
  // relying on DevTools evaluate's ability to bypass an eval restriction.
  await page.route('**/__e2e-csp-function-probe.js',route=>route.fulfill({contentType:'application/javascript',body:"try{new Function('return 1')();globalThis.__fbonesCspProbe='allowed';}catch(error){globalThis.__fbonesCspProbe=error.name;}"}));
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='/__e2e-csp-function-probe.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Same-origin CSP probe failed to load'));document.head.appendChild(script);}));
  expect(await page.evaluate(()=>(globalThis as {__fbonesCspProbe?:string}).__fbonesCspProbe)).toBe('EvalError');
});

test('New validates names and creates an in-memory browser draft without native save',async({page})=>{
  await openBrowserEditor(page);await page.getByRole('button',{name:'New project',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Start a new project'}),name=dialog.getByRole('textbox',{name:'Project name',exact:true});
  await expect(dialog.getByText('File operations are available in the desktop application.',{exact:true})).toBeVisible();
  for(const invalid of ['CON','bad/name']){
    await name.fill(invalid);await dialog.getByRole('button',{name:'Create project',exact:true}).click();await expect(name).toHaveAttribute('aria-invalid','true');await expect(dialog.getByText('Enter 1–120 characters without file path characters.',{exact:true})).toBeVisible();
  }
  await name.fill('Animație Ubuntu');await name.press('Enter');await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Animație Ubuntu',exact:true})).toBeVisible();await expect(page).toHaveTitle(/Animație Ubuntu/);await expect(page).toHaveTitle(/\*/);
  await expect(page.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
  await page.reload();await expect(page.getByRole('heading',{name:'A place to bring characters to life.',exact:true})).toBeVisible();
});

test('cancelled draft replacement preserves the previous browser project, then explicit discard replaces it',async({page})=>{
  await openBrowserEditor(page);await createBrowserDraft(page,'First Linux draft');
  await page.getByRole('button',{name:'New project',exact:true}).first().click();
  const discard=page.getByRole('dialog',{name:'Leave this project?'});
  await expect(discard).toBeVisible();await discard.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('heading',{name:'First Linux draft',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'New project',exact:true}).first().click();await discard.getByRole('button',{name:'Discard changes',exact:true}).click();
  const replacement=page.getByRole('dialog',{name:'Start a new project'});await replacement.getByRole('textbox',{name:'Project name',exact:true}).fill('Cancelled replacement');await replacement.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByRole('heading',{name:'First Linux draft',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'New project',exact:true}).first().click();await discard.getByRole('button',{name:'Discard changes',exact:true}).click();await replacement.getByRole('textbox',{name:'Project name',exact:true}).fill('Second Linux draft');await replacement.getByRole('button',{name:'Create project',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Second Linux draft',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'First Linux draft',exact:true})).toHaveCount(0);
});

test('File menu closes a browser draft only after explicit discard',async({page})=>{
  await openBrowserEditor(page);await createBrowserDraft(page,'Close Linux draft');
  const file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
  await file.locator('summary').click();await file.getByRole('button',{name:/^Close project/}).click();
  const dialog=page.getByRole('dialog',{name:'Leave this project?'});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Discard changes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'A place to bring characters to life.',exact:true})).toBeVisible();await expect(page).toHaveTitle('FBones');
});

test('real canvas wheel zoom, Reset view and grid toggle work in the browser',async({page})=>{
  await openBrowserEditor(page);const canvas=page.getByTestId('viewport').locator('canvas'),zoom=page.locator('.mode-toolbar .tabular-nums');
  await expect(zoom).toHaveText('100%');const box=await canvas.boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width*.85,box!.y+box!.height*.2);await page.mouse.wheel(0,240);await expect(zoom).not.toHaveText('100%');
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await expect(zoom).toHaveText('100%');
  const grid=page.getByRole('button',{name:'Toggle grid',exact:true});await expect(grid).toHaveAttribute('aria-pressed','true');const before=await canvas.screenshot();await grid.click();await expect(grid).toHaveAttribute('aria-pressed','false');
  expect((await canvas.screenshot()).equals(before),'Grid toggle must change the actual rendered viewport').toBe(false);
  await grid.click();await expect(grid).toHaveAttribute('aria-pressed','true');
});
