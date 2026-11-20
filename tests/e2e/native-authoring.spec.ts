import {test,expect,NativeSession,attachNativeSession,openNativeEditor,newNativeProject} from './fixtures/native-session';
import {readFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {inflateSync} from 'node:zlib';
import type {Locator,Page} from '@playwright/test';
import type {ProjectSummary,TraceOptions,TracePreview} from '../../src/domain/project';

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

async function prepareTraceMesh(native: NativeSession, name: string, file: string, image: string, png: string) {
  let project=await native.invoke<ProjectSummary>('create_project',{name,discardChanges:true});
  await native.queueDialog('save',file);
  project=await native.invoke<ProjectSummary>('save_project',{saveAs:true});
  await writeFile(join(dirname(project.path!),'images',`${image}.png`),Buffer.from(png,'base64'));
  await native.queueDialog('folder','images');
  project=await native.invoke<ProjectSummary>('choose_images_folder',{expectedRevision:project.revision});
  project=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:project.revision,
    edit:{type:'createSlot',bone:project.bones[0]!.id,name:'Own Trace slot'}});
  const slot=project.editedSlot!;
  project=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:project.revision,slot,keys:[image]});
  const id=project.editedAttachment!;
  await native.invoke('edit_rig',{expectedRevision:project.revision,edit:{type:'attachmentEdit',id,edit:{type:'convertMesh',id:slot}}});
  const attachment=(summary:ProjectSummary)=>summary.slots.find(item=>item.id===slot)!.attachments!.find(item=>item.id===id)!;
  return {id, attachment};
}

async function traceToolbar(page: Page, id: number) {
  await openNativeEditor(page);
  await page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem').click();
  await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Meshes',exact:true}).click();
  return page.getByTestId('viewport-tool-hud');
}

test('@native Trace keeps the outline and publishes optional curved detail with Undo and portable reopen', async ({page,native}) => {
  const size=128,radius=34;
  // Sample the own grayscale disk at pixel centers so the PNG has a hard, weak rim.
  const png=await page.evaluate(({size,radius})=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const context=canvas.getContext('2d')!;
    const pixels=context.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const tone=Math.hypot(x+.5-size/2,y+.5-size/2)<=radius?168:108;
      pixels.data.set([tone,tone,tone,255],4*(y*size+x));
    }
    context.putImageData(pixels,0,0);
    return canvas.toDataURL('image/png').split(',')[1]!;
  },{size,radius});
  const {id, attachment}=await prepareTraceMesh(native,'Own contrast trace','trace-source.fbones','own-trace-curve',png);
  const tools=await traceToolbar(page,id);
  const panel=page.getByRole('dialog',{name:'Trace',exact:true});
  const addDetail=panel.getByRole('checkbox',{name:'Add inner detail',exact:true});
  const contrast=panel.getByRole('slider',{name:/^Contrast/});
  const spacing=panel.getByRole('slider',{name:/^Spacing/});
  const tolerance=panel.getByRole('slider',{name:/^Tolerance/});
  const apply=panel.getByRole('button',{name:'Apply',exact:true});
  const before=(await native.snapshot())!,start=native.calls.length;

  async function setSlider(slider:Locator,value:number) {
    const steps=Math.round((value-Number(await slider.inputValue()))/Number(await slider.getAttribute('step')));
    for(let step=0;step<Math.abs(steps);step++)await slider.press(steps>0?'ArrowRight':'ArrowLeft');
    await expect(slider).toHaveValue(String(value));
  }

  async function previewAfter(mark:number,inner:boolean) {
    const reply=()=>native.calls.slice(mark).find(call=>{
      if(call.command!=='preview_trace_attachment'||call.result===undefined)return false;
      const options=call.args.options as TraceOptions;
      return options.inner===inner&&options.spacing===24&&options.tolerance===1.5
        &&(!inner||(options.innerSpacing===16&&options.innerThreshold===.2&&options.innerTolerance===1.5));
    });
    await expect.poll(()=>Boolean(reply())).toBe(true);
    await expect(apply).toBeEnabled();
    const call=reply()!;
    expect(call.args).toMatchObject({id,expectedRevision:before.revision});
    return {args:call.args, preview:call.result as TracePreview};
  }

  await tools.getByRole('button',{name:'Trace',exact:true}).click();
  await expect(panel.getByText(attachment(before).name,{exact:true})).toBeVisible();
  await expect(addDetail).not.toBeChecked();
  await expect(contrast).toHaveCount(0);
  await setSlider(spacing,24);
  await setSlider(tolerance,1.5);
  const outline=(await previewAfter(start,false)).preview;
  expect(outline.geometry.innerCount).toBe(0);
  let mark=native.calls.length;
  await addDetail.check();
  await expect(contrast).toBeVisible();
  await setSlider(contrast,.2);
  await setSlider(spacing.nth(1),16);
  await setSlider(tolerance.nth(1),1.5);
  const detail=(await previewAfter(mark,true)).preview;
  expect(detail.geometry.innerCount).toBeGreaterThan(0);
  expect(detail.mesh.hull).toBe(outline.mesh.hull);
  expect(detail.mesh.uvs.slice(0,2*outline.mesh.hull)).toEqual(outline.mesh.uvs);
  expect(detail.mesh.edges.slice(0,outline.mesh.edges.length)).toEqual(outline.mesh.edges);
  const nearRim=(x:number,y:number)=>Math.abs(Math.hypot(x-size/2,y-size/2)-radius)<=3;
  const rimPoint=(vertex:number)=>[detail.mesh.uvs[vertex*2]!*size,detail.mesh.uvs[vertex*2+1]!*size] as const;
  const rimDegree=new Map<number,number>();
  const rimEdges:[number,number][]=[];
  for(let at=outline.mesh.edges.length;at<detail.mesh.edges.length;at+=2){
    const a=detail.mesh.edges[at]!,b=detail.mesh.edges[at+1]!;
    const [ax,ay]=rimPoint(a),[bx,by]=rimPoint(b);
    if(nearRim(ax,ay)&&nearRim(bx,by)&&nearRim((ax+bx)/2,(ay+by)/2)){
      rimEdges.push([a,b]);
      rimDegree.set(a,(rimDegree.get(a)??0)+1);
      rimDegree.set(b,(rimDegree.get(b)??0)+1);
    }
  }
  expect([...rimDegree.values()].some(degree=>degree>=2)).toBe(true);

  // This fixture has one identity bone. Sample the posed midpoint of a real
  // authored edge, clear of the panel and its vertex handles.
  const stage=(await page.getByTestId('viewport').locator('canvas').boundingBox())!;
  const panelBox=(await panel.boundingBox())!;
  const zoom=Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%',''))/100;
  const sample=rimEdges.map(([a,b])=>{
    const [ax,ay]=detail.mesh.vertices[a]!.positions,[bx,by]=detail.mesh.vertices[b]!.positions;
    return {x:Math.floor(stage.x+stage.width/2+(ax!+bx!)*zoom/2),
      y:Math.floor(stage.y+stage.height/2-(ay!+by!)*zoom/2),length:Math.hypot(ax!-bx!,ay!-by!)*zoom};
  }).find(({x,y,length})=>length>=8&&(x<panelBox.x-4||y>panelBox.y+panelBox.height+4));
  expect(sample).toBeDefined();
  async function showsWarmPreviewEdge() {
    const {x,y}=sample!;
    const png=await page.screenshot({scale:'css',clip:{x,y,width:1,height:1}});
    const chunks:Buffer[]=[];
    for(let at=8;at<png.length;){
      const bytes=png.readUInt32BE(at);
      if(png.toString('ascii',at+4,at+8)==='IDAT')chunks.push(png.subarray(at+8,at+8+bytes));
      at+=bytes+12;
    }
    const rgb=inflateSync(Buffer.concat(chunks)).subarray(1,4);
    return rgb.length===3&&rgb.every((value,channel)=>Math.abs(value-[240,206,145][channel]!)<=12);
  }
  await expect.poll(showsWarmPreviewEdge).toBe(true);

  mark=native.calls.length;
  await addDetail.uncheck();
  await expect(contrast).toHaveCount(0);
  expect((await previewAfter(mark,false)).preview).toEqual(outline);
  await expect.poll(showsWarmPreviewEdge).toBe(false);
  expect(await native.snapshot()).toEqual(before);
  await addDetail.press('Escape');
  await expect(panel).toHaveCount(0);
  mark=native.calls.length;
  await tools.getByRole('button',{name:'Inner trace',exact:true}).click();
  await expect(addDetail).toBeChecked();
  const shortcut=await previewAfter(mark,true);
  expect(shortcut.preview).toEqual(detail);
  await expect.poll(showsWarmPreviewEdge).toBe(true);

  await apply.click();
  await expect(panel).toHaveCount(0);
  await expect.poll(async()=>(await native.snapshot())?.revision).toBe(before.revision+1);
  expect(attachment((await native.snapshot())!).mesh).toEqual(detail.mesh);
  expect(native.calls.slice(start).filter(call=>call.command==='apply_trace_attachment').map(call=>call.args)).toEqual([shortcut.args]);
  await expect.poll(showsWarmPreviewEdge).toBe(false);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect.poll(async()=>attachment((await native.snapshot())!).mesh).toEqual(attachment(before).mesh);
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  await expect.poll(async()=>attachment((await native.snapshot())!).mesh).toEqual(detail.mesh);
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
  await fileAction(page,'Close project');
  await expect.poll(()=>native.snapshot()).toBeNull();
  await native.queueDialog('open','trace-source.fbones');
  await fileAction(page,'Open project');
  await expect.poll(async()=>(await native.snapshot())?.name).toBe(before.name);
  const reopened=(await native.snapshot())!;
  const restored=reopened.slots.flatMap(item=>item.attachments??[]).find(item=>item.name===attachment(before).name)!.mesh!;
  const {bones:_previewBones,...previewShape}=detail.mesh;
  const {bones:_restoredBones,...restoredShape}=restored;
  expect(restoredShape).toEqual(previewShape);
});

test('@native Trace Padding expands the texture hull only in preview until a valid Apply and one Undo', async ({page, native}) => {
  await page.clock.install();
  const texture = {width: 68, height: 60};
  const png = await page.evaluate(({width, height}) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#90c8e0';
    context.fillRect(20, 18, 28, 24);
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, texture);
  const {id, attachment} = await prepareTraceMesh(native, 'Own Trace padding', 'trace-padding.fbones', 'own-padded-shape', png);
  const tools = await traceToolbar(page, id);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  await tools.getByRole('button', {name: 'Trace', exact: true}).click();
  const panel = page.getByRole('dialog', {name: 'Trace', exact: true});
  const padding = panel.getByTestId('trace-padding');
  const slider = panel.getByTestId('trace-padding-slider');
  const apply = panel.getByRole('button', {name: 'Apply', exact: true});

  async function previewAfter(mark: number, px: number) {
    const latest = () => native.calls.slice(mark).reverse().find(call => call.command === 'preview_trace_attachment'
      && call.result !== undefined && (call.args.options as TraceOptions).padding === px);
    await expect.poll(() => !!latest()).toBe(true);
    await expect(apply).toBeEnabled();
    const call = latest()!;
    expect(call.args).toMatchObject({id, expectedRevision: before.revision, options: {padding: px, inner: false}});
    return {args: call.args, preview: call.result as TracePreview};
  }

  function bounds({geometry}: TracePreview) {
    const x: number[] = [], y: number[] = [];
    for (let index = 0; index < geometry.hull; index++) {
      x.push(geometry.uvs[2 * index]! * texture.width);
      y.push(geometry.uvs[2 * index + 1]! * texture.height);
    }
    expect(x.length).toBeGreaterThanOrEqual(3);
    return {left: Math.min(...x), top: Math.min(...y), right: Math.max(...x), bottom: Math.max(...y)};
  }

  for (const input of [padding, slider]) {
    await expect(input).toHaveValue('0');
    await expect(input).toHaveAttribute('min', '0');
    await expect(input).toHaveAttribute('max', '32');
    await expect(input).toHaveAttribute('step', '1');
  }
  const baseline = await previewAfter(start, 0);
  const zero = bounds(baseline.preview);
  expect(zero.left).toBeCloseTo(20, 0);
  expect(zero.top).toBeCloseTo(18, 0);
  expect(zero.right).toBeCloseTo(48, 0);
  expect(zero.bottom).toBeCloseTo(42, 0);

  const planned = panel.getByTestId('trace-planned-controls');
  const refresh = planned.getByTestId('trace-refresh');
  await expect(planned).toHaveAccessibleName('Planned');
  await expect(planned).toHaveAccessibleDescription('These options are currently unavailable.');
  await expect(planned.getByRole('listitem')).toHaveCount(3);
  for (const [setting, label, description] of [
    ['detail', 'Detail', 'Controls the number of vertices in the outline.'],
    ['concavity', 'Concavity', 'Prioritizes vertices where the outline bends inward.'],
    ['refinement', 'Refinement', 'Controls how much time is spent searching for an outline.'],
  ] as const) {
    const item = planned.getByTestId(`trace-planned-${setting}`);
    await expect(item).toHaveText(label);
    await expect(item).toHaveAccessibleDescription(description);
    expect(baseline.args.options).not.toHaveProperty(setting);
  }
  await expect(planned.locator('input, [role="slider"], [role="spinbutton"]')).toHaveCount(0);
  await expect(refresh).toHaveAccessibleName('Refresh');
  await expect(refresh).toHaveAccessibleDescription('Unavailable. Generate another outline with the same settings.');
  await expect(refresh).toBeDisabled();

  const originalViewport = page.viewportSize()!;
  const originalPanelWidth = (await panel.boundingBox())!.width;
  await page.setViewportSize({width: 1024, height: 720});
  await expect.poll(() => planned.evaluate((group, fullWidth) => {
    const dialog = group.closest<HTMLElement>('[role="dialog"]')!;
    const bounds = dialog.getBoundingClientRect();
    const groupBounds = group.getBoundingClientRect();
    return bounds.width < fullWidth && bounds.left >= 0 && bounds.right <= innerWidth &&
      groupBounds.left >= bounds.left && groupBounds.right <= bounds.right &&
      group.scrollWidth <= group.clientWidth && dialog.scrollWidth <= dialog.clientWidth;
  }, originalPanelWidth)).toBe(true);
  const unavailableStart = native.calls.length;
  await refresh.click({force: true});
  await page.clock.runFor(250);
  await expect(apply).toBeEnabled();
  expect(native.calls.slice(unavailableStart).filter(call =>
    call.command === 'preview_trace_attachment' || call.command === 'apply_trace_attachment' || call.command === 'edit_rig',
  )).toEqual([]);
  expect(await native.snapshot()).toEqual(before);
  await page.setViewportSize(originalViewport);

  const sliderStart = native.calls.length;
  await slider.press('ArrowRight');
  await expect(padding).toHaveValue('1');
  await previewAfter(sliderStart, 1);
  const invalidStart = native.calls.length;
  await padding.fill('33');
  await expect(padding).toHaveAttribute('aria-invalid', 'true');
  await expect(apply).toBeDisabled();
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(invalidStart).filter(call => call.command === 'preview_trace_attachment' || call.command === 'apply_trace_attachment')).toEqual([]);

  const finalStart = native.calls.length;
  await padding.fill('8');
  await expect(padding).toHaveAttribute('aria-invalid', 'false');
  await expect(slider).toHaveValue('8');
  const padded = await previewAfter(finalStart, 8);
  const expanded = bounds(padded.preview);
  expect(expanded.left).toBeLessThan(zero.left - 4);
  expect(expanded.top).toBeLessThan(zero.top - 4);
  expect(expanded.right).toBeGreaterThan(zero.right + 4);
  expect(expanded.bottom).toBeGreaterThan(zero.bottom + 4);
  expect(padded.preview.geometry.uvs.every(value => value >= 0 && value <= 1)).toBe(true);
  expect(await native.snapshot()).toEqual(before);
  expect(native.calls.slice(start).filter(call => call.command === 'apply_trace_attachment' || call.command === 'edit_rig')).toEqual([]);

  await apply.click();
  await expect(panel).toHaveCount(0);
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
  expect(attachment((await native.snapshot())!).mesh).toEqual(padded.preview.mesh);
  expect(native.calls.slice(start).filter(call => call.command === 'apply_trace_attachment').map(call => call.args)).toEqual([padded.args]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.slots).toEqual(before.slots);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig').map(call => call.args.edit)).toEqual([{type: 'undo'}]);
});

test('@native precise Trace outline inputs preserve exact options and reject a late preview while invalid', async ({page, native}) => {
  const texture = {width: 48, height: 32};
  const png = await page.evaluate(({width, height}) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    const pixels = context.createImageData(width, height);
    for (let y = 8; y < 24; y++) {
      for (let x = 8; x < 24; x++) pixels.data.set([96, 144, 192, 255], 4 * (y * width + x));
    }
    // The separate tab shares a full edge with the opaque body.
    for (let y = 13; y < 19; y++) {
      for (let x = 24; x < 32; x++) pixels.data.set([96, 144, 192, 128], 4 * (y * width + x));
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, texture);
  const {id, attachment} = await prepareTraceMesh(native, 'Own precise Trace', 'trace-precise.fbones', 'own-alpha-128-tab', png);
  const tools = await traceToolbar(page, id);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  await tools.getByRole('button', {name: 'Trace', exact: true}).click();
  const panel = page.getByRole('dialog', {name: 'Trace', exact: true});
  const alpha = panel.getByTestId('trace-alpha-threshold');
  const alphaSlider = panel.getByTestId('trace-alpha-threshold-slider');
  const tolerance = panel.getByTestId('trace-tolerance');
  const spacing = panel.getByTestId('trace-spacing');
  const budget = panel.getByTestId('trace-vertex-budget');
  const apply = panel.getByRole('button', {name: 'Apply', exact: true});
  const result = panel.getByText(/^\d+ vertices · \d+ triangles$/);
  const previewsAfter = (mark: number) => native.calls.slice(mark).filter(call => call.command === 'preview_trace_attachment');
  async function previewAfter(mark: number, alphaThreshold: number) {
    const latest = () => previewsAfter(mark).reverse().find(call =>
      call.result !== undefined && (call.args.options as TraceOptions).alphaThreshold === alphaThreshold,
    );
    await expect.poll(() => !!latest()).toBe(true);
    await expect(apply).toBeEnabled();
    const call = latest()!;
    expect(call.args).toMatchObject({id, expectedRevision: before.revision, options: {
      alphaThreshold, tolerance: 0, spacing: .5, maxVertices: 173, padding: 0, inner: false,
    }});
    return {args: call.args, preview: call.result as TracePreview};
  }
  const right = ({geometry}: TracePreview) => Math.max(...Array.from({length: geometry.hull},
    (_, index) => geometry.uvs[2 * index]! * texture.width,
  ));

  await expect(apply).toBeEnabled();
  const preciseStart = native.calls.length;
  await tolerance.fill('0');
  await spacing.fill('0.5');
  await budget.fill('173');
  await alpha.fill('127');
  await expect(alphaSlider).toHaveValue('127');
  const withTab = await previewAfter(preciseStart, 127);
  expect(right(withTab.preview)).toBeCloseTo(32, 3);
  expect(withTab.preview.geometry.usedTolerance).toBe(0);
  expect(withTab.preview.geometry.usedSpacing).toBe(.5);

  const invoke = native.invoke.bind(native);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let held = false;
  // Delay delivery of one real native response without changing its payload.
  native.invoke = async function<T = unknown>(command: string, args: Record<string, unknown> = {}): Promise<T> {
    const reply = await invoke<T>(command, args);
    if (!held && command === 'preview_trace_attachment' && (args.options as TraceOptions).alphaThreshold === 128) {
      held = true;
      await gate;
    }
    return reply;
  };
  try {
    await alphaSlider.press('ArrowRight');
    await expect(alpha).toHaveValue('128');
    await expect.poll(() => held).toBe(true);
    const invalidStart = native.calls.length;
    await alpha.fill('255');
    await expect(alpha).toHaveAttribute('aria-invalid', 'true');
    await expect(apply).toBeDisabled();
    release();
    await expect(panel).toHaveAttribute('aria-busy', 'false');
    await expect(result).toHaveCount(0);
    await expect(apply).toBeDisabled();

    await spacing.fill('');
    await alpha.fill('128');
    await expect(spacing).toHaveAttribute('aria-invalid', 'true');
    await expect(apply).toBeDisabled();
    expect(previewsAfter(invalidStart)).toHaveLength(0);
    expect(await native.snapshot()).toEqual(before);
  } finally {
    release();
    native.invoke = invoke;
  }

  const recoveryStart = native.calls.length;
  await spacing.fill('0.5');
  const withoutTab = await previewAfter(recoveryStart, 128);
  expect(right(withoutTab.preview)).toBeCloseTo(24, 3);
  expect(await native.snapshot()).toEqual(before);
  const applies = () => native.calls.slice(start).filter(call => call.command === 'apply_trace_attachment').map(call => call.args);
  expect(applies()).toEqual([]);
  await apply.click();
  await expect(panel).toHaveCount(0);
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(before.revision + 1);
  expect(attachment((await native.snapshot())!).mesh).toEqual(withoutTab.preview.mesh);
  expect(applies()).toEqual([withoutTab.args]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await native.snapshot())!.slots).toEqual(before.slots);
  expect(native.calls.slice(start).filter(call => call.command === 'edit_rig').map(call => call.args.edit)).toEqual([{type: 'undo'}]);
});

test('@native Trace locks one Apply in flight, retries before dispatch and leaves preview-only cancellation available', async ({page, native}) => {
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 56;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#90c8e0';
    context.fillRect(17, 12, 39, 31);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  const {id, attachment} = await prepareTraceMesh(native, 'Own Trace Apply', 'trace-apply.fbones', 'own-apply-shape', png);
  const tools = await traceToolbar(page, id);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const open = tools.getByRole('button', {name: 'Inner trace', exact: true});
  const panel = page.getByRole('dialog', {name: 'Trace', exact: true});
  const close = panel.getByTestId('trace-close');
  const cancel = panel.getByTestId('trace-cancel');
  const apply = panel.getByTestId('trace-apply');
  const status = panel.getByTestId('trace-status');
  const contrast = panel.getByRole('slider', {name: /^Contrast/});
  const result = panel.getByText(/^\d+ vertices · \d+ triangles$/);
  const selected = page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`);
  const rootRow = page.locator(`[data-tree-kind="bone"][data-tree-id="${before.bones[0]!.id}"]`).getByRole('treeitem');
  const rootBox = (await rootRow.boundingBox())!;
  const modes = page.getByRole('group', {name: 'Editing mode', exact: true});
  const nativeApplies = () => native.calls.slice(start).filter(call => call.command === 'apply_trace_attachment');
  const previews = () => native.calls.slice(start).filter(call => call.command === 'preview_trace_attachment');

  async function expectApplying() {
    await expect(panel).toHaveAttribute('aria-busy', 'true');
    await expect(status).toHaveText('Applying trace…');
    for (const button of [close, cancel, apply]) await expect(button).toBeDisabled();
    await expect(contrast).toBeVisible();
    await expect(panel.locator('input:enabled')).toHaveCount(0);
  }

  const attempts: Record<string, unknown>[] = [];
  const transportError = 'The owned Trace Apply request failed before dispatch.';
  let releasePreview!: () => void;
  let releaseFailure!: () => void;
  let releaseSuccess!: () => void;
  const previewGate = new Promise<void>(resolve => { releasePreview = resolve; });
  const failureGate = new Promise<void>(resolve => { releaseFailure = resolve; });
  const successGate = new Promise<void>(resolve => { releaseSuccess = resolve; });
  const invoke = native.invoke.bind(native);
  let heldPreview = false;
  native.invoke = async function<T = unknown>(command: string, args: Record<string, unknown> = {}): Promise<T> {
    if (command === 'apply_trace_attachment') {
      attempts.push(structuredClone(args));
      if (attempts.length === 1) {
        await failureGate;
        throw new Error(transportError);
      }
      const reply = await invoke<T>(command, args);
      await successGate;
      return reply;
    }
    const reply = await invoke<T>(command, args);
    if (command === 'preview_trace_attachment' && !heldPreview) {
      heldPreview = true;
      await previewGate;
    }
    return reply;
  };
  try {
    await open.click();
    await expect.poll(() => heldPreview).toBe(true);
    await expect(panel).toHaveAttribute('aria-busy', 'true');
    await expect(close).toBeEnabled();
    await expect(cancel).toBeEnabled();
    await close.click();
    await expect(panel).toHaveCount(0);
    releasePreview();
    expect(await native.snapshot()).toEqual(before);

    await open.click();
    await expect(apply).toBeEnabled();
    expect(previews()).toHaveLength(2);
    const accepted = previews().at(-1)!;
    const candidate = accepted.result as TracePreview;
    expect(accepted.args).toMatchObject({id, expectedRevision: before.revision, options: {inner: true}});
    expect(candidate.mesh).not.toEqual(attachment(before).mesh);
    const previewText = await result.innerText();

    await apply.click();
    await expectApplying();
    expect(attempts).toEqual([accepted.args]);
    expect(nativeApplies()).toHaveLength(0);
    expect(await native.snapshot()).toEqual(before);
    releaseFailure();
    await expect(page.getByRole('alert').getByText(transportError, {exact: true})).toBeVisible();
    await expect(panel).toHaveAttribute('aria-busy', 'false');
    for (const button of [close, cancel, apply]) await expect(button).toBeEnabled();
    await expect(panel.locator('input:disabled')).toHaveCount(0);
    await expect(result).toHaveText(previewText);
    expect(await native.snapshot()).toEqual(before);
    expect(previews()).toHaveLength(2);

    await apply.click();
    await expectApplying();
    await expect.poll(() => nativeApplies()[0]?.result !== undefined).toBe(true);
    const committed = (await native.snapshot())!;
    expect(committed.revision).toBe(before.revision + 1);
    expect(attachment(committed).mesh).toEqual(candidate.mesh);

    // The locked dialog has no focusable controls. Exercise its own Escape
    // listener, then send Escape with actual keyboard focus outside it.
    await panel.dispatchEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    await expect(panel).toBeVisible();
    await apply.click({force: true});
    await modes.getByRole('button', {name: 'Images', exact: true}).click({force: true});
    await expect(modes.getByRole('button', {name: 'Meshes', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.click(rootBox.x + rootBox.width / 2, rootBox.y + rootBox.height / 2);
    expect(await panel.evaluate(dialog => dialog.contains(document.activeElement))).toBe(false);
    await page.keyboard.press('Escape');
    await expect(selected.locator('[role="treeitem"]')).toHaveAttribute('aria-selected', 'true');
    await expectApplying();
    expect(attempts).toEqual([accepted.args, accepted.args]);
    expect(nativeApplies().map(call => call.args)).toEqual([accepted.args]);
    expect(previews()).toHaveLength(2);
    expect(await native.snapshot()).toEqual(committed);

    releaseSuccess();
    await expect(panel).toHaveCount(0);
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect.poll(async () => (await native.snapshot())!.slots).toEqual(before.slots);
    expect(native.calls.slice(start).filter(call => call.command === 'edit_rig').map(call => call.args.edit)).toEqual([{type: 'undo'}]);
  } finally {
    releasePreview();
    releaseFailure();
    releaseSuccess();
    native.invoke = invoke;
  }

  await open.click();
  await expect(apply).toBeEnabled();
  const stale = (await native.snapshot())!;
  const changed = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: stale.revision,
    edit: {type: 'setAttachmentColor', id, color: 0xffd0ffff}});
  expect(changed.revision).toBe(stale.revision + 1);
  const staleMessage = 'The project changed before tracing.';
  // The browser harness serializes Errors as message/stack. Restore the
  // structured form Tauri delivers for this independently verified code.
  await page.evaluate(message => {
    type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    const {core} = (window as Window & typeof globalThis & {__TAURI__: {core: {invoke: Invoke}}}).__TAURI__;
    const call = core.invoke;
    core.invoke = async (command, args) => {
      try { return await call(command, args); }
      catch (error) {
        if (command === 'apply_trace_attachment' && error instanceof Error && error.message === message) {
          throw {code: 'ProjectChanged', message};
        }
        throw error;
      }
    };
  }, staleMessage);
  await apply.click();
  await expect.poll(() => nativeApplies().at(-1)?.error?.code).toBe('ProjectChanged');
  await expect(panel).toHaveAttribute('aria-busy', 'false');
  await expect(result).toHaveCount(0);
  await expect(apply).toBeDisabled();
  await expect(cancel).toBeEnabled();
  expect(await native.snapshot()).toEqual(changed);
  expect(nativeApplies()).toHaveLength(2);
  await cancel.click();
  await expect(panel).toHaveCount(0);
});
