import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {AttachmentView,DenseBindingView,ProjectSummary,RigEdit} from '../../src/domain/project';
import type {Page} from '@playwright/test';

// The five Direct/Auto rules below reuse the paired original4.3.26 audit.
// Brush explicit-target override and Normalize are bounded FBones policies;
// the original background brush controls were inconclusive, not parity proof.
async function edit(native:NativeSession,operation:RigEdit){
  const before=(await native.snapshot())!;
  return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:before.revision,edit:operation});
}
function attachment(p:ProjectSummary,id:number):AttachmentView{
  const value=p.slots.flatMap(slot=>slot.attachments??[]).find(item=>item.id===id);
  expect(value,'native attachment inventory contains the UI target').toBeTruthy();return value!;
}
function binding(p:ProjectSummary,id:number):DenseBindingView{return (attachment(p,id).clipping??attachment(p,id).mesh)!;}
function activation(p:ProjectSummary){return p.slots.map(slot=>({id:slot.id,active:slot.activeAttachmentId}));}
function weightCalls(native:NativeSession,start:number,type:string){
  return native.calls.slice(start).filter(call=>call.command==='edit_rig'&&(call.args.edit as {type:string}).type===type);
}
function preserved(before:ProjectSummary,after:ProjectSummary,id:number,changedRows:number[]){
  const old=binding(before,id),next=binding(after,id);
  expect(next.vertices.map(row=>row.positions),'all initialized and dormant binding coordinates').toEqual(old.vertices.map(row=>row.positions));
  expect({...next,vertices:old.vertices},'binding membership and clipping/mesh metadata').toEqual(old);
  old.vertices.forEach((row,index)=>{if(!changedRows.includes(index))expect(next.vertices[index],`untargeted vertex ${index}`).toEqual(row);});
  expect(after.bones).toEqual(before.bones);expect(activation(after)).toEqual(activation(before));
  for(const other of before.slots.flatMap(slot=>slot.attachments??[]))if(other.id!==id)expect(attachment(after,other.id)).toEqual(other);
}
async function fixture(native:NativeSession,noRecipient=false){
  let p=await native.invoke<ProjectSummary>('create_project',{name:'Native manual influence locks',discardChanges:true});
  const a=p.bones[0]!.id;
  p=await edit(native,{type:'update',id:a,name:'Influence A',x:0,y:0,rotation:0,length:40,scaleX:1,scaleY:1,shearX:0,shearY:0});
  const bones=[a];
  for(const[name,x,y]of[['Influence B',45,0],['Influence C',0,55],['Influence D',-40,10]] as const){
    p=await edit(native,{type:'create',parent:a,x,y,rotation:0,length:35});const id=p.editedBone!;bones.push(id);
    p=await edit(native,{...p.bones.find(bone=>bone.id===id)!,type:'update',name});
  }
  p=await edit(native,{type:'createSlot',bone:a,name:'Mask owner'});const owner=p.editedSlot!;
  p=await edit(native,{type:'createSlot',bone:a,name:'Mask end'});const end=p.editedSlot!;
  const ids:number[]=[];
  for(const name of ['Active lock mask','Inactive lock mask']){
    p=await edit(native,{type:'createClipping',slot:owner,name,endSlot:end,convex:false,inverse:false,
      vertices:[{x:-90,y:-70},{x:100,y:-70},{x:100,y:70},{x:-90,y:70}]});
    const id=p.editedAttachment!;ids.push(id);p=await edit(native,{type:'bindAttachment',id,bones});
    for(let vertex=0;vertex<binding(p,id).vertices.length;vertex++){
      // Actual native normalized setters create approximately [.4,.3,.2,.1].
      // Capture the resulting f32 values; never assume nominal .4 is exact.
      p=await edit(native,{type:'setAttachmentWeight',id,vertex,bone:bones[1]!,value:noRecipient ? .6 : .3/.7});
      if(!noRecipient){
        p=await edit(native,{type:'setAttachmentWeight',id,vertex,bone:bones[2]!,value:.2/.9});
        p=await edit(native,{type:'setAttachmentWeight',id,vertex,bone:bones[3]!,value:.1});
      }
    }
  }
  p=await edit(native,{type:'setActiveAttachment',slot:owner,attachment:ids[0]!});
  return{a,b:bones[1]!,c:bones[2]!,d:bones[3]!,bones,active:ids[0]!,inactive:ids[1]!,project:p};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function selectWeights(page:Page,f:Fixture,id=f.inactive){
  await page.locator(`[data-tree-kind="attachment"][data-tree-id="${id}"]`).getByRole('treeitem').click();
  await page.getByRole('group',{name:'Editing mode',exact:true}).getByRole('button',{name:'Weights',exact:true}).click();
  await page.getByTestId('weights-mode').selectOption('direct');
  await page.getByTestId('weights-influence').selectOption(String(f.b));
  await page.getByTestId('weights-vertex').selectOption('0');
}
async function number(page:Page,value:number){
  const field=page.getByTestId('weights-direct-number');await expect(field).toBeEnabled();await field.fill(String(value));await field.press('Enter');
}
async function lock(page:Page,bone:number){const button=page.getByTestId(`weights-lock-${bone}`);await button.click();await expect(button).toHaveAttribute('aria-pressed','true');}
async function point(page:Page,p:ProjectSummary,id:number){
  // Every fixture bone has identity linear axes and bind coordinates initialized
  // from the same world point. This independent first-column projection does
  // not call the production skinning/selection helper or a JS project model.
  const dense=binding(p,id),bone=p.bones.find(value=>value.id===dense.bones[0])!,row=dense.vertices[0]!;
  const canvas=page.getByTestId('viewport').locator('canvas'),box=(await canvas.boundingBox())!;
  const zoom=Number((await page.locator('.mode-toolbar .tabular-nums').innerText()).replace('%',''))/100;
  return{x:box.x+box.width/2+(bone.x+row.positions[0]!)*zoom,y:box.y+box.height/2-(bone.y+row.positions[1]!)*zoom};
}
async function fileAction(page:Page,name:'Close project'|'Open project'){
  const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});
  if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator('summary').click();
  await menu.getByRole('button',{name:new RegExp('^'+name)}).click();
}
function portableScene(p:ProjectSummary){
  const boneName=(id:number)=>p.bones.find(bone=>bone.id===id)!.name;
  return p.slots.map(slot=>({name:slot.name,bone:boneName(slot.bone),active:slot.attachments?.find(a=>a.id===slot.activeAttachmentId)?.name??null,
    attachments:(slot.attachments??[]).map(a=>{const dense=(a.clipping??a.mesh)!;return{name:a.name,type:a.type,bones:dense.bones.map(boneName),weighted:dense.weighted,vertices:dense.vertices,
      end:a.clipping?p.slots.find(value=>value.id===a.clipping!.endSlot)!.name:null,convex:a.clipping?.convex,inverse:a.clipping?.inverse,color:a.clipping?.color,edges:a.clipping?.edges};})}));
}

test('@native Direct preserves another locked influence, dormant coordinates and one undo on an inactive attachment',async({page,native})=>{
  const f=await fixture(native);await openNativeEditor(page);await selectWeights(page,f);
  const before=(await native.snapshot())!,old=binding(before,f.inactive),start=native.calls.length;
  await lock(page,f.a);expect(await native.snapshot()).toEqual(before);
  await number(page,50);await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices[0]!.weights[1]).toBe(.5);
  const after=(await native.snapshot())!,row=binding(after,f.inactive).vertices[0]!.weights;
  expect(after.revision).toBe(before.revision+1);expect(row[0]).toBe(old.vertices[0]!.weights[0]);
  expect(row[2]!/row[3]!).toBeCloseTo(old.vertices[0]!.weights[2]!/old.vertices[0]!.weights[3]!,6);
  expect(row[2]!+row[3]!).toBeCloseTo(1-row[0]!-.5,6);preserved(before,after,f.inactive,[0]);
  expect(weightCalls(native,start,'setAttachmentWeight').map(call=>call.args.edit)).toEqual([{type:'setAttachmentWeight',id:f.inactive,vertex:0,bone:f.b,value:.5,lockedBones:[f.a]}]);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices).toEqual(old.vertices);
  await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices).toEqual(binding(after,f.inactive).vertices);
});

test('@native Direct request 90 is capped by captured locked mass rather than changing the protected weight',async({page,native})=>{
  const f=await fixture(native);await openNativeEditor(page);await selectWeights(page,f);await lock(page,f.a);
  const before=(await native.snapshot())!,rowBefore=binding(before,f.inactive).vertices[0]!.weights,start=native.calls.length;
  await number(page,90);await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices[0]!.weights[1]).toBeCloseTo(1-rowBefore[0]!,6);
  const after=(await native.snapshot())!,row=binding(after,f.inactive).vertices[0]!.weights;
  expect(row[0]).toBe(rowBefore[0]);expect(row.slice(2)).toEqual([0,0]);preserved(before,after,f.inactive,[0]);
  expect(weightCalls(native,start,'setAttachmentWeight').at(-1)!.args.edit).toEqual({type:'setAttachmentWeight',id:f.inactive,vertex:0,bone:f.b,value:.9,lockedBones:[f.a]});
  await expect(page.getByTestId('weights-direct-number')).toHaveValue((100*row[1]!).toFixed(1));
});

test('@native a locked Direct target stays explicitly editable while other influences redistribute',async({page,native})=>{
  const f=await fixture(native);await openNativeEditor(page);await selectWeights(page,f);await lock(page,f.b);
  const before=(await native.snapshot())!,old=binding(before,f.inactive).vertices[0]!.weights,start=native.calls.length;
  await number(page,50);await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices[0]!.weights[1]).toBe(.5);
  const after=(await native.snapshot())!,row=binding(after,f.inactive).vertices[0]!.weights;
  for(const column of [0,2,3])expect(row[column]).toBeCloseTo(old[column]!/(1-old[1]!)*.5,6);
  preserved(before,after,f.inactive,[0]);await expect(page.getByTestId(`weights-lock-${f.b}`)).toHaveAttribute('aria-pressed','true');
  expect(weightCalls(native,start,'setAttachmentWeight').at(-1)!.args.edit).toEqual({type:'setAttachmentWeight',id:f.inactive,vertex:0,bone:f.b,value:.5,lockedBones:[f.b]});
});

test('@native Direct cannot decrease partial sole unlocked mass when there is no recipient',async({page,native})=>{
  const f=await fixture(native,true);await openNativeEditor(page);await selectWeights(page,f);await lock(page,f.a);
  const before=(await native.snapshot())!,start=native.calls.length,old=binding(before,f.inactive).vertices[0]!.weights;
  await number(page,50);await expect.poll(()=>weightCalls(native,start,'setAttachmentWeight').length).toBe(1);
  await expect(page.getByTestId('weights-direct-number')).toHaveValue((100*old[1]!).toFixed(1));
  expect(await native.snapshot()).toEqual(before);
  expect(weightCalls(native,start,'setAttachmentWeight')[0]!.args.edit).toEqual({type:'setAttachmentWeight',id:f.inactive,vertex:0,bone:f.b,value:.5,lockedBones:[f.a]});
});

test('@native Auto with only a locked candidate is a no-op and does not consume the preceding edit undo',async({page,native})=>{
  const f=await fixture(native);await openNativeEditor(page);await selectWeights(page,f);const original=(await native.snapshot())!;
  await number(page,50);await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices[0]!.weights[1]).toBe(.5);
  await lock(page,f.b);await page.locator(`[data-weight-bone="${f.b}"]`).getByRole('button',{name:'Influence B',exact:true}).click();
  await expect(page.getByTestId('weights-auto-scope')).toHaveText('Auto: 1 vertices · 1 influences');
  const before=(await native.snapshot())!,start=native.calls.length;await page.getByTestId('weights-auto').click();
  await expect.poll(()=>weightCalls(native,start,'autoAttachmentWeights').length).toBe(1);expect(await native.snapshot()).toEqual(before);
  expect(weightCalls(native,start,'autoAttachmentWeights')[0]!.args.edit).toEqual({type:'autoAttachmentWeights',id:f.inactive,scope:{vertices:[0],bones:[f.b],lockedBones:[f.b]}});
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices).toEqual(binding(original,f.inactive).vertices);
  await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices).toEqual(binding(before,f.inactive).vertices);
  preserved(before,(await native.snapshot())!,f.inactive,[0]);
});

test('@native locks are attachment-local, survive switches and Save, and clear on native Close/Open',async({page,native})=>{
  const f=await fixture(native);await openNativeEditor(page);await selectWeights(page,f);const initial=(await native.snapshot())!;
  await lock(page,f.a);await selectWeights(page,f,f.active);await expect(page.getByTestId(`weights-lock-${f.a}`)).toHaveAttribute('aria-pressed','false');
  await lock(page,f.b);await selectWeights(page,f);await expect(page.getByTestId(`weights-lock-${f.a}`)).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId(`weights-lock-${f.b}`)).toHaveAttribute('aria-pressed','false');expect(await native.snapshot()).toEqual(initial);
  const scene=portableScene(initial);await native.queueDialog('save','manual-locks.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);const saved=(await native.snapshot())!,savedA=saved.bones.find(bone=>bone.name==='Influence A')!.id;
  await expect(page.getByTestId('weights-target')).toHaveText('Inactive lock mask');await expect(page.getByTestId(`weights-lock-${savedA}`)).toHaveAttribute('aria-pressed','true');
  expect(portableScene(saved)).toEqual(scene);await fileAction(page,'Close project');await expect.poll(()=>native.snapshot()).toBeNull();
  await native.queueDialog('open','manual-locks.fbones');await fileAction(page,'Open project');await expect.poll(async()=>(await native.snapshot())?.name).toBe(initial.name);
  const reopened=(await native.snapshot())!;expect(portableScene(reopened)).toEqual(scene);
  const names=new Map(reopened.bones.map(bone=>[bone.name,bone.id]));
  for(const name of ['Inactive lock mask','Active lock mask']){
    const id=reopened.slots.flatMap(slot=>slot.attachments??[]).find(a=>a.name===name)!.id;
    const rebound={...f,a:names.get('Influence A')!,b:names.get('Influence B')!,c:names.get('Influence C')!,d:names.get('Influence D')!};
    await selectWeights(page,rebound,id);for(const bone of reopened.bones)await expect(page.getByTestId(`weights-lock-${bone.id}`)).toHaveAttribute('aria-pressed','false');
  }
});

test('@native brush lock protection and explicit locked-target override follow the bounded FBones policy',async({page,native})=>{
  const f=await fixture(native);await openNativeEditor(page);await selectWeights(page,f);await lock(page,f.a);
  const before=(await native.snapshot())!,start=native.calls.length;await page.getByTestId('weights-mode').selectOption('replace');
  await expect(page.locator('label').filter({hasText:/^Strength/}).locator('input[type="range"]')).toHaveValue('0.5');
  const at=await point(page,before,f.inactive);await page.mouse.move(at.x,at.y);await page.mouse.down();await page.mouse.move(at.x+3,at.y,{steps:4});await page.mouse.up();
  await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices[0]!.weights[1]).toBe(.5);
  const protectedAfter=(await native.snapshot())!;expect(protectedAfter.revision).toBe(before.revision+1);
  expect(binding(protectedAfter,f.inactive).vertices[0]!.weights[0]).toBe(binding(before,f.inactive).vertices[0]!.weights[0]);preserved(before,protectedAfter,f.inactive,[0]);
  const paint=weightCalls(native,start,'paintAttachmentWeights');expect(paint).toHaveLength(1);expect(paint[0]!.args.edit).toMatchObject({type:'paintAttachmentWeights',id:f.inactive,bone:f.b,lockedBones:[f.a]});
  expect((paint[0]!.args.edit as Extract<RigEdit,{type:'paintAttachmentWeights'}>).changes).toEqual([{vertex:0,value:.5}]);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices).toEqual(binding(before,f.inactive).vertices);
  // Undo may restore native history focus to the other attachment. Return via
  // the actual Tree/Weights controls; the inactive attachment's lock cache must
  // survive that focus change before starting the second, separate stroke.
  await selectWeights(page,f);await page.getByTestId('weights-mode').selectOption('replace');
  await expect(page.getByTestId(`weights-lock-${f.a}`)).toHaveAttribute('aria-pressed','true');
  await page.getByTestId(`weights-lock-${f.a}`).click();await lock(page,f.b);
  const targetBefore=(await native.snapshot())!,next=native.calls.length;await page.mouse.move(at.x,at.y);await page.mouse.down();await page.mouse.move(at.x+3,at.y,{steps:4});await page.mouse.up();
  await expect.poll(async()=>binding((await native.snapshot())!,f.inactive).vertices[0]!.weights[1]).toBe(.5);
  const targetAfter=(await native.snapshot())!;expect(targetAfter.revision).toBe(targetBefore.revision+1);preserved(targetBefore,targetAfter,f.inactive,[0]);
  expect(weightCalls(native,next,'paintAttachmentWeights')).toHaveLength(1);
  expect(weightCalls(native,next,'paintAttachmentWeights')[0]!.args.edit).toMatchObject({type:'paintAttachmentWeights',id:f.inactive,bone:f.b,lockedBones:[f.b]});
});

test('@native Normalize sends flat stable lock IDs and preserves protected columns and every binding coordinate',async({page,native})=>{
  const f=await fixture(native);await openNativeEditor(page);await selectWeights(page,f);await lock(page,f.a);
  const before=(await native.snapshot())!,start=native.calls.length;await page.getByTestId('weights-normalize').click();
  await expect.poll(()=>weightCalls(native,start,'normalizeAttachmentWeights').length).toBe(1);
  expect(weightCalls(native,start,'normalizeAttachmentWeights')[0]!.args.edit).toEqual({type:'normalizeAttachmentWeights',id:f.inactive,lockedBones:[f.a]});
  const after=(await native.snapshot())!;
  binding(after,f.inactive).vertices.forEach((row,index)=>expect(row.weights[0]).toBe(binding(before,f.inactive).vertices[index]!.weights[0]));
  preserved(before,after,f.inactive,[0,1,2,3]);
});
