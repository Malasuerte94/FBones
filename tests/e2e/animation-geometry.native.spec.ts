import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page,Locator} from '@playwright/test';
import type {AttachmentView,EvaluationSnapshot,ProjectSummary,RigEdit} from '../../src/domain/project';
import type {DeformKeyInput} from '../../src/domain/animationGeometry';
import {copyFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {inflateSync} from 'node:zlib';
const NAME='Geometry performance',RED=[232,62,65],GREEN=[55,198,100];
const DEFORM_END_OFFSETS = [2, -4, 8, -4, -6, 4, 12, 2, 4, 8, -8, 6, 10, -6, -4, -2];
async function edit(native:NativeSession,edit:RigEdit){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:(await native.snapshot())!.revision,edit});}
function clip(p:ProjectSummary){return p.animations!.find(a=>a.name===NAME)!;}
function attachment(p:ProjectSummary,id:number){return p.slots.flatMap(s=>s.attachments??[]).find(a=>a.id===id)!;}
function deformation(p:ProjectSummary,id:number){return clip(p).deformTracks!.find(t=>t.attachment===id)!;}
function authoring(native:NativeSession,start:number){return native.calls.slice(start).filter(c=>c.command==='edit_rig');}
function tree(page:Page,kind:string,id:number){return page.locator(`[data-tree-kind="${kind}"][data-tree-id="${id}"]`);}
function row(page:Page,id:number){return page.getByTestId('draw-order-slot-'+id);}
async function seek(page:Page,frame:number){await page.getByTestId('timeline-current').fill(String(frame));await page.getByTestId('timeline-current').press('Enter');await expect(page.getByTestId('timeline-current')).toHaveValue(String(frame));}
async function field(page:Page,locator:Locator,value:number){await locator.fill(String(value));await locator.press('Enter');}
async function drawList(page:Page){await page.getByRole('button',{name:'Draw order',exact:true}).click();await expect(page.getByTestId('draw-order-key')).toBeVisible();}
async function treeTab(page:Page){await page.getByRole('button',{name:'Tree',exact:true}).click();}
async function selectAttachment(page:Page,id:number,mesh=true){await treeTab(page);await tree(page,'attachment',id).getByRole('treeitem').click();if(mesh)await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Meshes',exact:true}).click();}
async function pixel(page:Page,x:number,y:number){const png=await page.screenshot({scale:'css',clip:{x:Math.floor(x),y:Math.floor(y),width:1,height:1}}),chunks:Buffer[]=[];for(let o=8;o<png.length;){const size=png.readUInt32BE(o);if(png.toString('ascii',o+4,o+8)==='IDAT')chunks.push(png.subarray(o+8,o+8+size));o+=size+12;}return [...inflateSync(Buffer.concat(chunks)).subarray(1,4)];}
async function screen(page:Page,x:number,y:number){const box=(await page.getByTestId('viewport').locator('canvas').boundingBox())!;return{x:box.x+box.width/2+x,y:box.y+box.height/2-y};}
async function worldPixel(page:Page,x:number,y:number){const point=await screen(page,x,y);return pixel(page,point.x,point.y);}
async function previewPixel(page:Page,side:'left'|'right'){const b=(await page.getByTestId('animation-preview').locator('canvas').boundingBox())!;return pixel(page,b.x+b.width*(side==='left'?.25:.75),b.y+b.height*.5);}
async function fitPreview(page:Page){await expect(page.getByTestId('animation-preview').getByRole('img',{name:'Live animation preview'})).toHaveAttribute('data-ready','true');await page.getByRole('button',{name:'Fit preview',exact:true}).click();await expect(page.getByTestId('animation-preview').locator('p[role=status]')).toHaveCount(0);}
async function evaluate(native:NativeSession,p:ProjectSummary,frame:number){return native.invoke<EvaluationSnapshot>('evaluate_project',{expectedRevision:p.revision,request:{mode:'none',time:frame/Math.fround(p.animationFps??30),animationId:clip(p).id}});}
async function vertices(native:NativeSession,id:number,frame:number){const p=(await native.snapshot())!,pose=await native.invoke<EvaluationSnapshot>('evaluate_project',{expectedRevision:p.revision,request:{mode:'none',time:frame/Math.fround(p.animationFps??30),animationId:clip(p).id,deformTargets:[id]}});return pose.deformPose!.find(p=>p.attachment===id)!.worldVertices!;}
function closestVertex(points:[number,number][],target:[number,number]){expect(points.length).toBeGreaterThan(0);expect(points.every(p=>p.every(Number.isFinite))).toBe(true);return points.reduce((best,p,index)=>Math.hypot(p[0]-target[0],p[1]-target[1])<Math.hypot(points[best]![0]-target[0],points[best]![1]-target[1])?index:best,0);}
async function controlledSeekDuringDrag(page:Page,frame:number){await page.evaluate(frame=>{const app=document.querySelector('#app') as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,{seekAnimation:(frame:number)=>void}>}}}}};app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!.seekAnimation(frame);},frame);}
function setup(p:ProjectSummary){const bones=new Map(p.bones.map(b=>[b.id,b.name])),slots=new Map(p.slots.map(s=>[s.id,s.name]));return{bones:p.bones.map(({id,parent,...b})=>({...b,parent:parent===null?null:bones.get(parent)})),slots:p.slots.map(s=>({name:s.name,bone:bones.get(s.bone),visible:s.visible,color:s.color,blend:s.blend,active:s.attachments?.find(a=>a.id===s.activeAttachmentId)?.name??null,attachments:s.attachments?.map(({id:_,slot:__,...a})=>({...a,mesh:a.mesh?{...a.mesh,bones:a.mesh.bones.map(b=>bones.get(b))}:null,clipping:a.clipping?{...a.clipping,endSlot:slots.get(a.clipping.endSlot),bones:a.clipping.bones.map(b=>bones.get(b))}:null}))}))};}
function semantics(p:ProjectSummary){const bones=new Map(p.bones.map(b=>[b.id,b.name])),slots=new Map(p.slots.map(s=>[s.id,s.name])),atts=new Map(p.slots.flatMap(s=>(s.attachments??[]).map(a=>[a.id,s.name+'/'+a.name]as const)));return p.animations!.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.map(t=>({...t,bone:bones.get(t.bone),keys:t.keys.map(({id:_,...k})=>k)})),slotTracks:a.slotTracks?.map(t=>({slot:slots.get(t.slot),channel:t.channel,keys:t.keys.map(({id:_,...k})=>'attachment'in k?{...k,attachment:k.attachment===null?null:atts.get(k.attachment)}:k)})),drawOrder:a.drawOrder?.map(({id:_,...k})=>({...k,order:k.order?.map(id=>slots.get(id))??null})),deformTracks:a.deformTracks?.map(t=>({attachment:atts.get(t.attachment),keys:t.keys.map(({id:_,...k})=>k)}))}));}
async function fixture(page:Page,native:NativeSession,seed?: (ids:{animation:number;mesh:number;clipping:number})=>Promise<ProjectSummary>){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own Draw Order and Deform',discardChanges:true});const root=p.bones[0]!.id;p=await edit(native,{type:'create',parent:root,x:0,y:0,rotation:0,length:25});const child=p.editedBone!;const slots:number[]=[];
 for(const [bone,name]of [[root,'Mask'],[child,'Red card'],[child,'Green card'],[child,'Sentinel']]as const){p=await edit(native,{type:'createSlot',bone,name});slots.push(p.editedSlot!);}const[mask,redSlot,greenSlot,sentinel]=slots as[number,number,number,number];
 await native.queueDialog('folder','images');p=await native.invoke<ProjectSummary>('choose_images_folder',{expectedRevision:p.revision});const art:number[]=[];
 for(const[slot,key,x]of [[redSlot,'red',-80],[greenSlot,'green',-80],[sentinel,'green',90]]as const){p=await native.invoke<ProjectSummary>('place_attachments',{expectedRevision:p.revision,slot,keys:[key]});const id=p.editedAttachment!;art.push(id);p=await edit(native,{type:'updateAttachment',id,x,y:55,rotation:0,scaleX:1,scaleY:1});}const mesh=art[1]!;p=await edit(native,{type:'attachmentEdit',id:mesh,edit:{type:'convertMesh',id:greenSlot}});
 p=await edit(native,{type:'createClipping',slot:mask,name:'Animated mask',endSlot:sentinel,vertices:[{x:-140,y:-10},{x:-140,y:120},{x:0,y:120},{x:0,y:-10}],convex:true,inverse:false});const clipping=p.editedAttachment!;
 for(const id of [mesh,clipping]){p=await edit(native,{type:'bindAttachment',id,bones:[root,child]});const count=(attachment(p,id).mesh??attachment(p,id).clipping)!.vertices.length;for(let vertex=0;vertex<count;vertex++)p=await edit(native,{type:'setAttachmentWeight',id,vertex,bone:child,value:1});}
 p=await edit(native,{type:'setActiveAttachment',slot:mask,attachment:null});const before=p;p=await edit(native,{type:'createAnimation',name:NAME});const animation=p.editedAnimation!;
 // Seed the unrelated bone/slot families and any case-specific native source curve.
 p=await edit(native,{type:'setAnimationKeyBatch',animation,boneKeys:[0,24].map(frame=>({bone:child,channel:'translate',frame,values:[0,0],curve:'linear'})),slotKeys:[0,24].map(frame=>({slot:sentinel,channel:'rgba',frame,values:[1,1,1,1],curve:'linear'}))});
 if(seed)await seed({animation,mesh,clipping});
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(animation));return{before,root,child,mask,redSlot,greenSlot,sentinel,mesh,clipping,animation};
}
async function dragOrder(page:Page,source:number,target:number){await row(page,source).dragTo(row(page,target),{sourcePosition:{x:45,y:12},targetPosition:{x:45,y:2}});}
async function dragVertex(page:Page,native:NativeSession,point:[number,number],delta:[number,number]){const from=await screen(page,...point),before=(await native.snapshot())!,start=native.calls.length;await page.mouse.move(from.x,from.y);await page.mouse.down();await expect.poll(()=>native.calls.slice(start).filter(c=>c.command==='evaluate_project'&&c.result!==undefined).length).toBe(1);const frozen=native.calls.slice(start).find(c=>c.command==='evaluate_project')!.result as EvaluationSnapshot;await page.mouse.move(from.x+delta[0],from.y-delta[1],{steps:7});expect(await native.snapshot()).toEqual(before);await page.mouse.up();await expect.poll(()=>authoring(native,start).length).toBe(1);const command=authoring(native,start)[0]!;expect((command.args.edit as RigEdit).type).toBe('setAnimationDeformVertices');expect(command.args.poseEpoch).toBe(frozen.poseEpoch);await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+1);return{before,after:(await native.snapshot())!,frozen};}
async function saveReopen(page:Page,native:NativeSession,path:string){await native.queueDialog('save',path);await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);const saved=(await native.snapshot())!;const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open',path);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();return{saved,reopened:(await native.snapshot())!};}
function dormantPreserved(p:ProjectSummary,id:number){for(const key of deformation(p,id).keys)for(let at=0;at<key.offsets.length;at+=4)expect(key.offsets.slice(at,at+2)).toEqual([0,0]);}

test('@native manual Mesh Deform Key splits progress at Current and retains the same-frame numeric vertex draft', async ({page, native}) => {
  const endOffsets = DEFORM_END_OFFSETS;
  const midpoint = endOffsets.map(offset => offset / 2);
  const f = await fixture(page, native, ({animation, mesh, clipping}) => edit(native, {type: 'setAnimationDeformKeys', animation, keys: [
    {attachment: mesh, frame: 0, offsets: Array(16).fill(0), dataPresent: false, curve: 'bezier', controls: [8, .25, 16, .75]},
    {attachment: mesh, frame: 24, offsets: endOffsets, dataPresent: true, curve: 'linear'},
    {attachment: clipping, frame: 0, offsets: Array(16).fill(0), dataPresent: false, curve: 'bezier',
      controls: [8, .25, 16, 0], controlsBits: [0x41000000, 0x3e800000, 0x41800000, 0x80000000]},
    {attachment: clipping, frame: 24, offsets: Array(16).fill(0), dataPresent: false, curve: 'linear'},
  ]}));
  await selectAttachment(page, f.mesh);
  await seek(page, 12);
  const baseline = (await native.snapshot())!;
  const [first, last] = deformation(baseline, f.mesh).keys;
  const current = page.getByTestId('timeline-current');
  const meshRow = tree(page, 'attachment', f.mesh).getByRole('treeitem');
  const vertexX = page.getByRole('spinbutton', {name: 'Vertex X', exact: true});
  const vertexY = page.getByRole('spinbutton', {name: 'Vertex Y', exact: true});
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const redo = page.getByRole('button', {name: 'Redo', exact: true});

  const frames = [6, 12, 18];
  const before: [number, number][][] = [];
  for (const frame of frames) before.push(await vertices(native, f.mesh, frame));
  const posed = before[1]!;
  const index = closestVertex(posed, [Math.min(...posed.map(point => point[0])), Math.max(...posed.map(point => point[1]))]);
  const corner = posed[index]!;
  const selected = await screen(page, ...corner);
  const pickStart = native.calls.length;
  await page.mouse.move(selected.x, selected.y);
  await page.mouse.down();
  await expect(vertexX).toBeEnabled();
  await expect.poll(async () => Number(await vertexX.inputValue())).toBeCloseTo(corner[0], 6);
  await page.mouse.up();
  expect(authoring(native, pickStart)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(baseline);

  async function selection(x: number) {
    await expect(current).toHaveValue('12');
    await expect(meshRow).toHaveAttribute('aria-selected', 'true');
    await expect(vertexX).toBeEnabled();
    await expect(vertexY).toBeEnabled();
    await expect.poll(async () => Number(await vertexX.inputValue())).toBeCloseTo(x, 6);
    await expect.poll(async () => Number(await vertexY.inputValue())).toBeCloseTo(corner[1], 6);
  }

  async function keyDeform(button: Locator, expectedOffsets: number[]) {
    const previous = (await native.snapshot())!;
    const start = native.calls.length;
    await button.click();
    await expect.poll(async () => deformation((await native.snapshot())!, f.mesh).keys.map(key => key.frame)).toEqual([0, 12, 24]);
    const result = (await native.snapshot())!;
    const calls = authoring(native, start);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args.poseEpoch).toBeUndefined();
    expect(calls[0]!.args).toMatchObject({expectedRevision: previous.revision, edit: {
      type: 'setAnimationDeformKeys', animation: f.animation, keys: [
        {attachment: f.mesh, keyId: first!.id, frame: 0, controls: [4, .25, 8, .625]},
        {attachment: f.mesh, frame: 12, controls: [16, .375, 20, .75]},
      ],
    }});
    expect(result.revision).toBe(previous.revision + 1);
    const [left, inserted, right] = deformation(result, f.mesh).keys;
    expect(left).toEqual({...first, controls: [4, .25, 8, .625]});
    expect(inserted).toMatchObject({frame: 12, offsets: expectedOffsets, dataPresent: true, curve: 'bezier', controls: [16, .375, 20, .75]});
    expect(right).toEqual(last);
    expect([first!.id, last!.id]).not.toContain(inserted!.id);
    expect(result.slots).toEqual(baseline.slots);
    expect(result.bones).toEqual(baseline.bones);
    const {deformTracks: _old, ...oldOther} = clip(baseline);
    const {deformTracks: _new, ...newOther} = clip(result);
    expect(newOther).toEqual(oldOther);
    expect(deformation(result, f.clipping)).toEqual(deformation(baseline, f.clipping));
    return result;
  }

  async function checkWorld(attachment: number, editedX: readonly number[]) {
    for (const [step, frame] of frames.entries()) {
      const actual = await vertices(native, attachment, frame);
      const expected = before[step]!;
      expect(actual).toHaveLength(expected.length);
      actual.forEach(([x, y], vertex) => {
        expect(x).toBeCloseTo(expected[vertex]![0] + (vertex === index ? editedX[step]! : 0), 6);
        expect(y).toBeCloseTo(expected[vertex]![1], 6);
      });
    }
  }

  const clean = await keyDeform(page.getByTestId('viewport-deform-key'), midpoint);
  await checkWorld(f.mesh, [0, 0, 0]);
  await selection(corner[0]);
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(baseline.animations);
  await redo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(clean.animations);
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(baseline.animations);
  await selection(corner[0]);

  const autoKey = page.getByTestId('timeline-auto-key');
  await autoKey.click();
  await expect(autoKey).toHaveAttribute('aria-pressed', 'false');
  const delta = 8;
  const beforeDraft = (await native.snapshot())!;
  const draftStart = native.calls.length;
  await field(page, vertexX, corner[0] + delta);
  await selection(corner[0] + delta);
  expect(authoring(native, draftStart)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(beforeDraft);
  const vertex = attachment(baseline, f.mesh).mesh!.vertices[index]!;
  expect(vertex.weights).toEqual([0, 1]);
  const changed = [...midpoint];
  changed[index * vertex.positions.length + 2]! += delta;
  const dirty = await keyDeform(page.getByTestId(`timeline-key-deform-${f.mesh}`), changed);
  const dirtyX = [3.625, delta, 3.625];
  await checkWorld(f.mesh, dirtyX);
  await selection(corner[0] + delta);
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(baseline.animations);
  await selection(corner[0]);
  await redo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(dirty.animations);
  await selection(corner[0] + delta);

  const clipOwner = deformation(baseline, f.clipping).keys[0]!;
  expect(clipOwner.controls![3]).toBe(-0);
  await selectAttachment(page, f.clipping, false);
  await page.getByTestId(`timeline-key-${clipOwner.id}`).press('Enter');
  await expect(page.getByTestId('timeline-deform-control-3')).toHaveValue('-0');
  const progressStart = native.calls.length;
  await field(page, page.getByTestId('timeline-deform-control-1'), .5);
  await expect.poll(async () => deformation((await native.snapshot())!, f.clipping).keys[0]!.controls).toEqual([8, .5, 16, -0]);
  const progressCalls = authoring(native, progressStart);
  expect(progressCalls).toHaveLength(1);
  expect(progressCalls[0]!.args.edit).toMatchObject({type: 'setAnimationDeformKeys', keys: [
    {attachment: f.clipping, keyId: clipOwner.id, controlsBits: [0x41000000, 0x3f000000, 0x41800000, 0x80000000]},
  ]});
  const {saved, reopened} = await saveReopen(page, native, 'deform-interior-keys.fbones');
  expect(semantics(reopened)).toEqual(semantics(saved));
  expect(setup(reopened)).toEqual(setup(baseline));
  const reopenedMesh = reopened.slots.find(slot => slot.name === 'Green card')!.attachments!.find(row => row.mesh)!;
  await checkWorld(reopenedMesh.id, dirtyX);
});

test('@native frozen Mesh drag and Clipping numeric Auto Key split Deform progress without changing clean coordinates', async ({page, native}) => {
  const f = await fixture(page, native, ({animation, mesh, clipping}) => edit(native, {
    type: 'setAnimationDeformKeys', animation, keys: [mesh, clipping].flatMap<DeformKeyInput>(attachment => [
      {attachment, frame: 0, offsets: Array(16).fill(0), dataPresent: false, curve: 'bezier', controls: [8, .25, 16, .75]},
      {attachment, frame: 24, offsets: DEFORM_END_OFFSETS, dataPresent: true, curve: 'linear'},
    ]),
  }));
  const baseline = (await native.snapshot())!;
  const frames = [6, 12, 18];
  const vertexX = page.getByRole('spinbutton', {name: 'Vertex X', exact: true});
  const vertexY = page.getByRole('spinbutton', {name: 'Vertex Y', exact: true});
  const current = page.getByTestId('timeline-current');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const redo = page.getByRole('button', {name: 'Redo', exact: true});
  await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed', 'true');
  await seek(page, 12);

  async function worldAt(owner: number) {
    const samples: [number, number][][] = [];
    for (const frame of frames) samples.push(await vertices(native, owner, frame));
    return samples;
  }

  async function frozenAfter(start: number, model: ProjectSummary, owner: number) {
    const evaluations = () => native.calls.slice(start).filter(call => call.command === 'evaluate_project');
    await expect.poll(() => evaluations().filter(call => call.result !== undefined).length).toBe(1);
    const calls = evaluations();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args).toMatchObject({expectedRevision: model.revision, request: {
      mode: 'none', time: 12 / Math.fround(model.animationFps ?? 30), animationId: f.animation, deformTargets: [owner],
    }});
    return calls[0]!.result as EvaluationSnapshot;
  }

  async function selection(owner: number, x: number, y: number) {
    await expect(tree(page, 'attachment', owner).getByRole('treeitem')).toHaveAttribute('aria-selected', 'true');
    await expect(current).toHaveValue('12');
    await expect(vertexX).toBeEnabled();
    await expect(vertexY).toBeEnabled();
    await expect.poll(async () => Number(await vertexX.inputValue())).toBeCloseTo(x, 3);
    await expect.poll(async () => Number(await vertexY.inputValue())).toBeCloseTo(y, 3);
  }

  async function checkSplice(model: ProjectSummary, owner: number, index: number, point: [number, number],
    delta: [number, number], samples: [number, number][][], start: number, epoch: number) {
    await expect.poll(async () => deformation((await native.snapshot())!, owner).keys.map(key => key.frame)).toEqual([0, 12, 24]);
    const result = (await native.snapshot())!;
    const writes = authoring(native, start);
    expect(writes).toHaveLength(1);
    expect(writes[0]!.args).toMatchObject({expectedRevision: model.revision, poseEpoch: epoch, edit: {
      type: 'setAnimationDeformVertices', animation: f.animation, attachment: owner, frame: 12, vertices: [{vertex: index}],
    }});
    const request = writes[0]!.args.edit as Extract<RigEdit, {type: 'setAnimationDeformVertices'}>;
    expect(request.vertices[0]!.x).toBeCloseTo(point[0] + delta[0], 6);
    expect(request.vertices[0]!.y).toBeCloseTo(point[1] + delta[1], 6);
    expect(request.curve).toBeUndefined();
    expect(result.revision).toBe(model.revision + 1);
    const [beforeFirst, beforeLast] = deformation(model, owner).keys;
    const [left, inserted, right] = deformation(result, owner).keys;
    const offsets = DEFORM_END_OFFSETS.map(value => value / 2);
    const target = attachment(model, owner);
    const picked = (target.mesh ?? target.clipping)!.vertices[index]!;
    expect(picked.weights).toEqual([0, 1]);
    offsets[index * 4 + 2]! += delta[0];
    offsets[index * 4 + 3]! += delta[1];
    expect(left).toEqual({...beforeFirst, controls: [4, .25, 8, .625]});
    expect(inserted).toMatchObject({frame: 12, offsets, dataPresent: true, curve: 'bezier', controls: [16, .375, 20, .75]});
    expect(right).toEqual(beforeLast);
    expect([beforeFirst!.id, beforeLast!.id]).not.toContain(inserted!.id);
    expect(result.slots).toEqual(model.slots);
    expect(result.bones).toEqual(model.bones);
    expect(clip(result).deformTracks!.filter(track => track.attachment !== owner))
      .toEqual(clip(model).deformTracks!.filter(track => track.attachment !== owner));
    const {deformTracks: _before, ...oldOther} = clip(model);
    const {deformTracks: _after, ...newOther} = clip(result);
    expect(newOther).toEqual(oldOther);

    const actual = await worldAt(owner);
    // Original progress is 29/128 and 99/128 at f6 and f18. The dirty
    // midpoint contributes 29/64 on both sides after normalizing the children.
    const moved = [29 / 64, 1, 29 / 64];
    for (const step of frames.keys()) {
      expect(actual[step]).toHaveLength(samples[step]!.length);
      actual[step]!.forEach(([x, y], vertex) => {
        const multiplier = vertex === index ? moved[step]! : 0;
        expect(x).toBeCloseTo(samples[step]![vertex]![0] + multiplier * delta[0], 6);
        expect(y).toBeCloseTo(samples[step]![vertex]![1] + multiplier * delta[1], 6);
      });
    }

    await selection(owner, point[0] + delta[0], point[1] + delta[1]);
    await undo.click();
    await expect.poll(async () => (await native.snapshot())!.animations).toEqual(model.animations);
    await selection(owner, ...point);
    await redo.click();
    await expect.poll(async () => (await native.snapshot())!.animations).toEqual(result.animations);
    await selection(owner, point[0] + delta[0], point[1] + delta[1]);
    return result;
  }

  await selectAttachment(page, f.mesh);
  const meshSamples = await worldAt(f.mesh);
  const corners = meshSamples[1]!;
  const meshIndex = closestVertex(corners, [Math.min(...corners.map(point => point[0])), Math.max(...corners.map(point => point[1]))]);
  const corner = corners[meshIndex]!;
  const meshDelta: [number, number] = [-30, 20];
  const outside: [number, number] = [corner[0] - 17, corner[1] + 10];
  await expect.poll(() => worldPixel(page, ...outside)).not.toEqual(GREEN);
  // The Mesh dock can resize Main after selecting the attachment. Sample the
  // pointer only after the renderer has caught up with the host dimensions.
  const canvas = page.getByTestId('viewport').locator('canvas');
  await expect.poll(() => canvas.evaluate(node => {
    const host = node.parentElement;
    return !!host && node.clientWidth === host.clientWidth && node.clientHeight === host.clientHeight;
  })).toBe(true);
  const cursor = await screen(page, ...corner);
  const dragStart = native.calls.length;
  await page.mouse.move(cursor.x, cursor.y);
  await page.mouse.down();
  const pose = await frozenAfter(dragStart, baseline, f.mesh);
  await selection(f.mesh, ...corner);
  await page.mouse.move(cursor.x + meshDelta[0], cursor.y - meshDelta[1], {steps: 6});
  await expect.poll(() => worldPixel(page, ...outside)).toEqual(GREEN);
  expect(await native.snapshot()).toEqual(baseline);
  expect(authoring(native, dragStart)).toHaveLength(0);
  await page.mouse.up();
  await checkSplice(baseline, f.mesh, meshIndex, corner, meshDelta, meshSamples, dragStart, pose.poseEpoch);

  await selectAttachment(page, f.clipping);
  const clipSamples = await worldAt(f.clipping);
  const clipIndex = closestVertex(clipSamples[1]!, [0, 120]);
  const point = clipSamples[1]![clipIndex]!;
  const at = await screen(page, ...point);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await selection(f.clipping, ...point);
  await page.mouse.up();
  const beforeNumeric = (await native.snapshot())!;
  const numericStart = native.calls.length;
  await field(page, vertexX, point[0] + 8);
  const numericPose = await frozenAfter(numericStart, beforeNumeric, f.clipping);
  expect(numericPose.poseEpoch).not.toBe(pose.poseEpoch);
  await checkSplice(beforeNumeric, f.clipping, clipIndex, point, [8, 0], clipSamples, numericStart, numericPose.poseEpoch);

  const {saved, reopened} = await saveReopen(page, native, 'world-vertex-deform-auto-key.fbones');
  expect(semantics(reopened)).toEqual(semantics(saved));
  expect(setup(reopened)).toEqual(setup(baseline));
});

test('@native Animate weights inspect stored influences and follow evaluated Mesh without selecting a Deform vertex', async ({page, native}) => {
  const f = await fixture(page, native, async ({animation, mesh}) => {
    const initial = (await native.snapshot())!;
    const root = initial.bones.find(bone => bone.parent === null)!.id;
    const slot = attachment(initial, mesh).slot;
    await edit(native, {type: 'setAttachmentWeight', id: mesh, vertex: 1, bone: root, value: .375});
    await edit(native, {type: 'setAttachmentWeight', id: mesh, vertex: 2, bone: root, value: .75});
    await edit(native, {type: 'setAnimationSlotKeys', animation, keys: [
      {slot, channel: 'attachment', frame: 0, attachment: mesh},
      {slot, channel: 'attachment', frame: 24, attachment: null},
    ]});
    return edit(native, {type: 'setAnimationDeformKeys', animation, keys: [
      {attachment: mesh, frame: 0, offsets: Array(16).fill(0), dataPresent: false, curve: 'linear'},
      {attachment: mesh, frame: 24, offsets: Array.from({length: 16}, (_, index) => index % 2 === 0 ? 24 : 0),
        dataPresent: true, curve: 'linear'},
    ]});
  });
  const before = (await native.snapshot())!;
  const mesh = attachment(before, f.mesh);
  expect(mesh.mesh!.vertices[1]!.weights).toEqual([.375, .625]);
  expect(mesh.mesh!.vertices[2]!.weights).toEqual([.75, .25]);
  const frame0 = await vertices(native, f.mesh, 0);
  const frame12 = await vertices(native, f.mesh, 12);
  const frame24 = [frame12[1]![0] + 12, frame12[1]![1]] as const;
  expect(frame12[1]![0] - frame0[1]![0]).toBeCloseTo(12, 5);

  const inspect = page.getByRole('button', {name: 'Inspect weights', exact: true});
  const panel = page.getByTestId('animate-weights-panel');
  const picker = panel.getByRole('combobox', {name: 'Vertex', exact: true});
  const dock = page.getByTestId('dock-panel-weights');
  const modes = page.getByRole('group', {name: 'Editing mode', exact: true});
  const vertexX = page.getByRole('spinbutton', {name: 'Vertex X', exact: true});
  const vertexY = page.getByRole('spinbutton', {name: 'Vertex Y', exact: true});
  const influence = (id: number) => panel.getByTestId('animate-weights-influence-' + id);
  const readOnlyCalls = (start: number) => native.calls.slice(start).filter(call =>
    call.command === 'edit_rig' || call.command === 'evaluate_project');
  const markerAt = async ([x, y]: readonly [number, number]) => {
    const rgb = await worldPixel(page, x + 8, y);
    return [240, 206, 145].every((component, index) => Math.abs(rgb[index]! - component) <= 12);
  };

  await selectAttachment(page, f.mesh, false);
  await seek(page, 0);
  await dock.getByRole('button', {name: 'Panel actions for Weights', exact: true}).press('Enter');
  await page.getByRole('menuitem', {name: 'Close Weights panel', exact: true}).click();
  await expect(dock).toBeHidden();
  await expect(inspect).toHaveCount(1);
  const openStart = native.calls.length;
  await inspect.click();
  await expect(dock).toBeVisible();
  await expect(picker).toBeFocused();
  await expect(panel.getByTestId('animate-weights-target')).toHaveText(mesh.name);
  await expect(panel.getByText('Read only', {exact: true})).toBeVisible();
  await expect(modes.getByRole('button', {name: 'Bones', exact: true})).toHaveAttribute('aria-pressed', 'true');
  expect(readOnlyCalls(openStart)).toHaveLength(0);

  await modes.getByRole('button', {name: 'Meshes', exact: true}).click();
  await expect(page.getByTestId('viewport-deform-key')).toBeEnabled();
  await expect(inspect).toHaveCount(1);
  const canvas = page.getByTestId('viewport').locator('canvas');
  await expect.poll(() => canvas.evaluate(node =>
    node.clientWidth === node.parentElement?.clientWidth && node.clientHeight === node.parentElement?.clientHeight)).toBe(true);
  const deformPoint = await screen(page, ...frame0[0]!);
  await page.mouse.move(deformPoint.x, deformPoint.y);
  await page.mouse.down();
  await expect.poll(async () => Number(await vertexX.inputValue())).toBeCloseTo(frame0[0]![0], 4);
  await expect.poll(async () => Number(await vertexY.inputValue())).toBeCloseTo(frame0[0]![1], 4);
  await page.mouse.up();
  const inspectStart = native.calls.length;
  await inspect.click();
  await expect(picker).toBeFocused();
  await picker.selectOption('3');
  await expect(influence(f.root)).toContainText('75%');
  await expect(influence(f.child)).toContainText('25%');
  await picker.selectOption('2');
  await expect(influence(f.root)).toContainText(before.bones.find(bone => bone.id === f.root)!.name);
  await expect(influence(f.root)).toContainText('37.5%');
  await expect(influence(f.child)).toContainText(before.bones.find(bone => bone.id === f.child)!.name);
  await expect(influence(f.child)).toContainText('62.5%');
  await expect.poll(async () => Number(await vertexX.inputValue())).toBeCloseTo(frame0[0]![0], 4);
  await expect.poll(async () => Number(await vertexY.inputValue())).toBeCloseTo(frame0[0]![1], 4);
  await expect(modes.getByRole('button', {name: 'Meshes', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('weights-auto')).toHaveCount(0);
  await expect.poll(() => markerAt(frame0[1]!)).toBe(true);

  await seek(page, 12);
  await expect(picker).toHaveValue('2');
  await expect.poll(() => markerAt(frame12[1]!)).toBe(true);
  await expect.poll(() => markerAt(frame0[1]!)).toBe(false);
  await seek(page, 24);
  await expect(picker).toHaveValue('2');
  await expect(influence(f.child)).toContainText('62.5%');
  await expect.poll(() => markerAt(frame24)).toBe(false);
  await expect.poll(() => markerAt(frame12[1]!)).toBe(false);
  await expect(tree(page, 'attachment', f.mesh).getByRole('treeitem')).toHaveAttribute('aria-selected', 'true');
  expect(readOnlyCalls(inspectStart)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(before);

  await page.getByTestId('editor-mode-setup').click();
  await modes.getByRole('button', {name: 'Bones', exact: true}).click();
  await selectAttachment(page, f.mesh, false);
  await expect(inspect).toHaveCount(0);
  await expect(panel).toHaveCount(0);
  await page.getByTestId('viewport-edit-weights').click();
  await expect(page.getByTestId('weights-auto')).toBeEnabled();
  expect(authoring(native, inspectStart)).toHaveLength(0);
});

test('@native Draw Order drag changes both GPU views, rejects a stale-frame drop and preserves reset/nonempty keys through history and binary reopen',async({page,native},info)=>{
 const f=await fixture(page,native);await drawList(page);await page.getByTestId('draw-order-key').click();await expect.poll(async()=>clip((await native.snapshot())!).drawOrder?.map(k=>k.order)).toEqual([null]);await fitPreview(page);await expect.poll(()=>worldPixel(page,-93,60)).toEqual(GREEN);await expect.poll(()=>previewPixel(page,'left')).toEqual(GREEN);
 await seek(page,12);const start=native.calls.length;await dragOrder(page,f.redSlot,f.greenSlot);await expect.poll(async()=>clip((await native.snapshot())!).drawOrder?.map(k=>k.frame)).toEqual([0,12]);expect(authoring(native,start)).toHaveLength(1);const changed=(await native.snapshot())!,order=[f.mask,f.greenSlot,f.redSlot,f.sentinel];expect(clip(changed).drawOrder![1]!.order).toEqual(order);expect((await evaluate(native,changed,12)).drawOrder).toEqual(order);expect(setup(changed)).toEqual(setup(f.before));await expect.poll(()=>worldPixel(page,-93,60)).toEqual(RED);await expect.poll(()=>previewPixel(page,'left')).toEqual(RED);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>worldPixel(page,-93,60)).toEqual(GREEN);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(()=>worldPixel(page,-93,60)).toEqual(RED);
 // Read actual native HTML5 drag events; never construct synthetic DragEvents.
 await seek(page,18);const stable=(await native.snapshot())!,source=row(page,f.greenSlot),target=row(page,f.redSlot);await source.evaluate(el=>el.addEventListener('dragstart',()=>el.setAttribute('data-test-drag-started','true'),{once:true}));await target.evaluate(el=>el.addEventListener('drop',()=>el.setAttribute('data-test-dropped','true'),{once:true}));const a=(await source.boundingBox())!,b=(await target.boundingBox())!;await page.mouse.move(a.x+45,a.y+12);await page.mouse.down();await page.mouse.move(a.x+55,a.y+4,{steps:3});await expect(source).toHaveAttribute('data-test-drag-started','true');// Chromium's native HTML5 drag loop suppresses document keyboard input.
 await controlledSeekDuringDrag(page,19);await expect(page.getByTestId('timeline-current')).toHaveValue('19');await page.mouse.move(b.x+45,b.y+2,{steps:5});await page.mouse.up();await expect(target).toHaveAttribute('data-test-dropped','true');expect(await native.snapshot()).toEqual(stable);await writeFile(info.outputPath('draw-order-stale-drag-context.json'),JSON.stringify({actualMouseDragStart:true,actualMouseDrop:true,frameChange:'Controlled production workspace.seekAnimation during native HTML5 drag; no keyboard delivery claim',from:18,to:19},null,2));
 await page.getByTestId('timeline-auto-key').click();await seek(page,24);const draft=(await native.snapshot())!;await row(page,f.greenSlot).getByRole('button',{name:'Bring forward',exact:true}).click();await expect.poll(()=>worldPixel(page,-93,60)).toEqual(GREEN);expect(await native.snapshot()).toEqual(draft);await page.getByTestId('draw-order-key').click();await expect.poll(async()=>clip((await native.snapshot())!).drawOrder?.at(-1)?.frame).toBe(24);expect(clip((await native.snapshot())!).drawOrder!.at(-1)!.order).toBeNull();await page.getByTestId('timeline-auto-key').click();
 // Setup reordering may make an existing nonempty order equal to Setup. Undo
 // must restore the original explicit key and its stable identity; do not drop it.
 await page.getByTestId('editor-mode-setup').click();const keyId=clip((await native.snapshot())!).drawOrder![1]!.id;await dragOrder(page,f.redSlot,f.greenSlot);await expect.poll(async()=>(await native.snapshot())!.slots.map(s=>s.id)).toEqual(order);expect(clip((await native.snapshot())!).drawOrder!.some(k=>k.id===keyId&&k.frame===12)).toBe(true);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.slots.map(s=>s.id)).toEqual(f.before.slots.map(s=>s.id));expect(clip((await native.snapshot())!).drawOrder![1]!.order).toEqual(order);
 const authored=(await native.snapshot())!,{saved,reopened}=await saveReopen(page,native,'draw-order-ui.fbones');expect(setup(reopened)).toEqual(setup(f.before));expect(semantics(reopened)).toEqual(semantics(saved));await writeFile(info.outputPath('draw-order-semantic.json'),JSON.stringify({before:f.before,authored,saved,reopened},null,2));
});

test('@native weighted Mesh corner gestures freeze the native pose, preserve dormant binding columns and expose real scalar Bezier progress and Auto Key-off drafts',async({page,native},info)=>{
 const f=await fixture(page,native);await selectAttachment(page,f.mesh);await page.getByTestId('viewport-deform-key').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh)?.keys.length).toBe(1);const points=await vertices(native,f.mesh,0),index=closestVertex(points,[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]),corner=points[index]!;await writeFile(info.outputPath('mesh-native-initial-pose.json'),JSON.stringify({points,index,corner},null,2));await seek(page,24);await expect.poll(()=>worldPixel(page,corner[0]-17,corner[1]+10)).not.toEqual(GREEN);const moved=await dragVertex(page,native,corner,[-30,20]);await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys.map(k=>k.frame)).toEqual([0,24]);await expect.poll(()=>worldPixel(page,corner[0]-17,corner[1]+10)).toEqual(GREEN);expect(setup(moved.after)).toEqual(setup(f.before));dormantPreserved(moved.after,f.mesh);
 await seek(page,12);const mid=await vertices(native,f.mesh,12);expect(mid[index]![0]).toBeCloseTo(corner[0]-15,5);expect(mid[index]![1]).toBeCloseTo(corner[1]+10,5);await expect.poll(()=>worldPixel(page,corner[0]-7,corner[1]+4)).toEqual(GREEN);
 await seek(page,36);await page.getByTestId('timeline-auto-key').click();const beforeDraft=(await native.snapshot())!,start=native.calls.length,vertexX=page.getByRole('spinbutton',{name:'Vertex X',exact:true});await field(page,vertexX,corner[0]-20);await expect.poll(async()=>Number(await vertexX.inputValue())).toBeCloseTo(corner[0]-20,4);expect(await native.snapshot()).toEqual(beforeDraft);expect(authoring(native,start)).toHaveLength(0);await seek(page,0);await expect.poll(async()=>Number(await vertexX.inputValue())).toBeCloseTo(corner[0],4);await seek(page,36);await field(page,vertexX,corner[0]-20);await page.getByTestId('viewport-deform-key').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys.map(k=>k.frame)).toEqual([0,24,36]);expect(authoring(native,start)).toHaveLength(1);await page.getByTestId('timeline-auto-key').click();dormantPreserved((await native.snapshot())!,f.mesh);
 const first=deformation((await native.snapshot())!,f.mesh).keys[0]!;await page.getByTestId('timeline-key-'+first.id).click();await page.getByTestId('timeline-interpolation-bezier').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys[0]!.curve).toBe('bezier');await page.getByTestId('timeline-tab-graph').click();await expect(page.getByTestId('timeline-deform-progress-path')).toHaveAttribute('d',/C/);await expect(page.getByTestId('timeline-deform-controls').locator('input')).toHaveCount(4);const handle=page.getByTestId(`timeline-deform-handle-${first.id}-0`),bounds=(await handle.boundingBox())!,before=(await native.snapshot())!,controls=deformation(before,f.mesh).keys[0]!.controls!,handleStart=native.calls.length;
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+9,bounds.y+bounds.height/2-7,{steps:4});expect(await native.snapshot()).toEqual(before);await page.mouse.up();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys[0]!.controls).not.toEqual(controls);const changed=(await native.snapshot())!,newControls=deformation(changed,f.mesh).keys[0]!.controls!;expect(authoring(native,handleStart)).toHaveLength(1);expect(newControls.slice(2)).toEqual(controls.slice(2));expect(deformation(changed,f.mesh).keys[0]!.offsets).toEqual(first.offsets);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys[0]!.controls).toEqual(controls);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys[0]!.controls).toEqual(newControls);const stable=(await native.snapshot())!,bad=page.getByTestId('timeline-deform-control-0'),invalid=native.calls.length;await bad.fill('-1');await expect(bad).toHaveAttribute('aria-invalid','true');await page.getByRole('button',{name:'Save',exact:true}).click();expect(await native.snapshot()).toEqual(stable);expect(native.calls.slice(invalid).filter(c=>c.command==='save_project')).toHaveLength(0);await bad.press('Escape');await expect(bad).toHaveAttribute('aria-invalid','false');expect(setup((await native.snapshot())!)).toEqual(setup(f.before));await page.screenshot({path:info.outputPath('deform-progress-and-mesh.png')});
});

test('@native weighted Clip vertices alter mask pixels and mixed bone slot draw-order Mesh Clip keys paste atomically and reopen as one real UI-authored geometry bundle',async({page,native},info)=>{
 const f=await fixture(page,native);await drawList(page);await page.getByTestId('draw-order-key').click();await seek(page,12);await dragOrder(page,f.redSlot,f.greenSlot);await expect.poll(async()=>clip((await native.snapshot())!).drawOrder?.length).toBe(2);
 await selectAttachment(page,f.mesh);await seek(page,0);await page.getByTestId('viewport-deform-key').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh)?.keys.length).toBe(1);const meshPoints=await vertices(native,f.mesh,0),meshIndex=closestVertex(meshPoints,[Math.min(...meshPoints.map(p=>p[0])),Math.max(...meshPoints.map(p=>p[1]))]);await writeFile(info.outputPath('combined-mesh-native-initial-pose.json'),JSON.stringify({points:meshPoints,index:meshIndex},null,2));await seek(page,24);await dragVertex(page,native,meshPoints[meshIndex]!,[-12,8]);const meshFirst=deformation((await native.snapshot())!,f.mesh).keys[0]!;await page.getByTestId('timeline-key-'+meshFirst.id).click();await page.getByTestId('timeline-interpolation-bezier').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys[0]!.controls?.length).toBe(4);
 await selectAttachment(page,f.clipping);await seek(page,0);await tree(page,'attachment',f.clipping).getByTestId('attachment-activation').click();await page.getByTestId('viewport-deform-key').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.clipping)?.keys.length).toBe(1);await expect.poll(()=>worldPixel(page,75,85)).not.toEqual(GREEN);const maskPoints=await vertices(native,f.clipping,0),maskIndex=closestVertex(maskPoints,[0,120]);expect(Math.hypot(maskPoints[maskIndex]![0],maskPoints[maskIndex]![1]-120)).toBeLessThan(1e-5);await writeFile(info.outputPath('clip-native-initial-pose.json'),JSON.stringify({points:maskPoints,index:maskIndex},null,2));await seek(page,24);await dragVertex(page,native,maskPoints[maskIndex]!,[180,0]);await expect.poll(()=>worldPixel(page,75,85)).toEqual(GREEN);await expect.poll(()=>worldPixel(page,120,10)).not.toEqual(GREEN);const maskFirst=deformation((await native.snapshot())!,f.clipping).keys[0]!;await page.getByTestId('timeline-key-'+maskFirst.id).click();await page.getByTestId('timeline-interpolation-bezier').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.clipping).keys[0]!.controls?.length).toBe(4);const authored=(await native.snapshot())!;expect(setup(authored)).toEqual(setup(f.before));dormantPreserved(authored,f.mesh);dormantPreserved(authored,f.clipping);
 // Show both owners; select every actual native key including complete Bezier
 // intervals. Copy preserves flags, while paste shifts only frames/handle times.
 await tree(page,'bone',f.root).getByRole('treeitem').click();await tree(page,'bone',f.child).getByRole('treeitem').click({modifiers:['Control']});const keys=[...clip(authored).tracks.flatMap(t=>t.keys.map(k=>({id:k.id,frame:k.frame}))),...clip(authored).slotTracks!.flatMap(t=>t.keys.map(k=>({id:k.id,frame:k.frame}))),...clip(authored).drawOrder!,...clip(authored).deformTracks!.flatMap(t=>t.keys.map(k=>({id:k.id,frame:k.frame})))];expect(new Set(keys.map(k=>k.id)).size).toBe(keys.length);
 for(let i=0;i<keys.length;i++){const key=page.getByTestId('timeline-key-'+keys[i]!.id);await key.scrollIntoViewIfNeeded();await key.click(i?{modifiers:['Control']}:{});}await page.getByTestId('timeline-copy').click();await seek(page,60);const paste=native.calls.length;await page.getByTestId('timeline-paste').click();await expect.poll(async()=>deformation((await native.snapshot())!,f.mesh).keys.map(k=>k.frame)).toEqual([0,24,60,84]);expect(authoring(native,paste)).toHaveLength(1);expect((authoring(native,paste)[0]!.args.edit as RigEdit).type).toBe('setAnimationKeyBatch');const pasted=(await native.snapshot())!;
 for(const id of [f.mesh,f.clipping]){const old=deformation(authored,id).keys,newer=deformation(pasted,id).keys.filter(k=>k.frame>=60);expect(newer.map(k=>k.dataPresent)).toEqual(old.map(k=>k.dataPresent));expect(newer.map(k=>k.offsets)).toEqual(old.map(k=>k.offsets));expect(newer[0]!.controls).toEqual(old[0]!.controls!.map((v,i)=>i%2===0?v+60:v));}
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>semantics((await native.snapshot())!)).toEqual(semantics(authored));await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>semantics((await native.snapshot())!)).toEqual(semantics(pasted));const{saved,reopened}=await saveReopen(page,native,'geometry-animation-ui.fbones');expect(setup(reopened)).toEqual(setup(f.before));expect(semantics(reopened)).toEqual(semantics(saved));expect(reopened.slots.flatMap(s=>s.attachments??[]).filter(a=>a.region).every(a=>a.imageAvailable)).toBe(true);
 const bundle=info.outputPath('geometry-demo');await mkdir(bundle,{recursive:true});await copyFile(saved.path!,join(bundle,'Geometry.fbones'));await cp(join(dirname(saved.path!),'images'),join(bundle,'images'),{recursive:true});await copyFile(saved.path!,info.outputPath('ui-authored-geometry.fbones'));await writeFile(info.outputPath('geometry-semantic.json'),JSON.stringify({before:f.before,authored,pasted,saved,reopened},null,2));await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip(reopened).id));await seek(page,24);await expect.poll(()=>worldPixel(page,75,85)).toEqual(GREEN);await fitPreview(page);await page.screenshot({path:info.outputPath('draw-order-mesh-clip-and-preview.png')});
});
