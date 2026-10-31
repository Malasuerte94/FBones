import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Locator,Page} from '@playwright/test';
import type {ConstraintInput,EvaluationSnapshot,ProjectSummary,RigEdit,TransformConstraintView} from '../../src/domain/project';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const channels=['rotate','x','y','scaleX','scaleY','shearY'] as const;
async function edit(native:NativeSession,change:RigEdit){const p=(await native.snapshot())!;return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:change});}
async function model(native:NativeSession,id:number){const c=(await native.snapshot())!.constraints!.find(c=>c.id===id);if(c?.type!=='transform')throw Error('Own Match Transform missing');return c;}
async function fixture(native:NativeSession,localSource:boolean,localTarget:boolean,mix=0,singular=false){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Transform Match authoring',discardChanges:true});const root=p.bones[0]!.id;
 p=await edit(native,{...p.bones[0]!,type:'update',name:'Affine parent',x:11,y:-9,rotation:23,length:0,scaleX:singular?0:-1.3,scaleY:.8,shearX:7,shearY:-12});
 const ids:number[]=[];
 for(const[name,x,y,rotation,scaleX,scaleY,shearY]of [
  ['Source',13,-7,31,1.2,.8,17],['First target',70,35,-25,.9,1.3,-11],['Second target',-40,15,80,1.5,.6,9],
 ] as const){p=await edit(native,{type:'create',parent:root,x,y,rotation,length:35});const id=p.editedBone!;ids.push(id);p=await edit(native,{type:'update',id,name,x,y,rotation,length:35,scaleX,scaleY,shearX:0,shearY});}
 const[source,first,second]=ids as [number,number,number];
 const input:ConstraintInput={type:'transform',name:'Match this constraint',source,bones:[first,second],localSource,localTarget,additive:false,clamp:false,offsets:[7,11,-13,.2,-.1,19],mix:[mix,mix,mix,mix,mix,mix],properties:channels.map(property=>({property,offset:0,to:[{property,offset:0,max:1,scale:1}]}))};
 p=await edit(native,{type:'addConstraint',constraint:input});const c=p.constraints!.find(c=>c.name===input.name)!;if(c.type!=='transform')throw Error('Transform setup failed');
 return{root,source,first,second,id:c.id,before:p,constraint:c};
}
const inspector=(page:Page,id:number)=>page.locator(`[data-testid="constraint-inspector"][data-constraint-id="${id}"]`).first();
async function select(page:Page,id:number){await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();await expect(inspector(page,id)).toBeVisible();}
async function offsets(panel:Locator){const details=panel.getByTestId('transform-offset-controls').locator('..');if(!await details.evaluate(e=>(e as HTMLDetailsElement).open))await details.locator('summary').click();return details;}
const calls=(native:NativeSession,start:number)=>native.calls.slice(start).filter(c=>c.command==='edit_rig');
function matchCalls(native:NativeSession,start:number){return calls(native,start).filter(c=>(c.args.edit as {type?:string}).type==='matchTransform');}
function without(c:TransformConstraintView,...keys:string[]){const copy={...c} as Record<string,unknown>;for(const key of keys)delete copy[key];return copy;}
async function unchangedBones(native:NativeSession,p:ProjectSummary){const current=(await native.snapshot())!;expect(current.bones).toEqual(p.bones);expect(current.slots).toEqual(p.slots);}
async function saveAs(page:Page,native:NativeSession,path:string){const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await native.queueDialog('save',path);await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);return menu;}

for(const[localSource,localTarget,mix]of[[true,true,0],[false,false,.25],[false,true,.5],[true,false,0]] as const){
 test(`@native both Match buttons author the intended fields in ${localSource?'Local':'World'}/${localTarget?'Local':'World'} at mix${mix}, preserving bones and one Undo transaction`,async({page,native})=>{
  const f=await fixture(native,localSource,localTarget,mix);await openNativeEditor(page);await select(page,f.id);const panel=inspector(page,f.id),details=panel.getByTestId('transform-offset-controls').locator('..');
  const original=await model(native,f.id),before=(await native.snapshot())!,start=native.calls.length;
  // The header action must work even while the Offset foldout is closed.
  await expect(details).not.toHaveAttribute('open','');await panel.getByRole('button',{name:'Match offsets',exact:true}).click();
  await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+1);const matched=await model(native,f.id);
  expect(matched.offsets).not.toEqual(original.offsets);expect(without(matched,'offsets')).toEqual(without(original,'offsets'));await unchangedBones(native,before);
  await expect(details).not.toHaveAttribute('open','');expect(matchCalls(native,start)).toHaveLength(1);
  const call=matchCalls(native,start)[0]!,evaluations=native.calls.slice(start).filter(c=>c.command==='evaluate_project');expect(evaluations.length).toBeGreaterThan(0);expect(call.args.poseEpoch).toBe((evaluations.at(-1)!.result as EvaluationSnapshot).poseEpoch);expect(call.args.edit).toEqual({type:'matchTransform',id:f.id,section:'offsets'});
  if(localSource&&localTarget&&mix===0){
   const source=before.bones.find(b=>b.id===f.source)!,target=before.bones.find(b=>b.id===f.first)!;
   expect(matched.offsets).toEqual([Math.fround(target.rotation-source.rotation),Math.fround(target.x-source.x),Math.fround(target.y-source.y),Math.fround(target.scaleX!-source.scaleX!),Math.fround(target.scaleY!-source.scaleY!),Math.fround(target.shearY!-source.shearY!)]);
   // With zero mixes the same native snapshot gives a genuine repeat no-op.
   const noOp=(await native.snapshot())!;await panel.getByTestId('transform-match-offsets').click();await expect.poll(()=>native.calls.filter(c=>c.command==='edit_rig'&&(c.args.edit as {type?:string}).type==='matchTransform').length).toBe(2);expect(await native.snapshot()).toEqual(noOp);
  }
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>model(native,f.id)).toEqual(original);await select(page,f.id);
  const propStart=native.calls.length,prior=(await native.snapshot())!;await panel.getByRole('button',{name:'Match properties',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.revision).toBe(prior.revision+1);
  const properties=await model(native,f.id);expect(properties.properties).not.toEqual(original.properties);expect(properties.editorRangeBits).toHaveLength(24);expect(properties.editorRangeBits!.every(v=>v!==null)).toBe(true);expect(without(properties,'properties','editorRangeBits','editorRangeValues')).toEqual(without(original,'properties','editorRangeBits','editorRangeValues'));expect(properties.editorRangeValues).toEqual(properties.editorRangeBits!.map(bits=>{const data=new DataView(new ArrayBuffer(4));data.setUint32(0,bits!,false);return data.getFloat32(0,false);}));await unchangedBones(native,before);expect(matchCalls(native,propStart)).toHaveLength(1);
  if(localSource&&localTarget&&mix===0){expect(properties.properties.find(p=>p.property==='x')!.offset).toBe(2);expect(properties.properties.find(p=>p.property==='y')!.offset).toBe(6);expect(properties.properties.find(p=>p.property==='shearY')!.offset).toBe(-73);}
  await panel.getByTestId('transform-stored-ranges-toggle').click();await expect(panel.getByTestId('transform-stored-cell-4')).not.toHaveText('—');
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>model(native,f.id)).toEqual(original);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(()=>model(native,f.id)).toEqual(properties);
 });
}

test('@native Match flushes a valid field, blocks an invalid draft, and native Save Close Open preserves both action results',async({page,native},info)=>{
 const f=await fixture(native,true,true);await openNativeEditor(page);await select(page,f.id);const panel=inspector(page,f.id);await offsets(panel);
 const input=panel.getByTestId('transform-offset-1'),before=(await native.snapshot())!,blocked=native.calls.length;
 await input.fill('');await panel.getByTestId('transform-match-properties').click();await expect(panel.getByRole('alert')).toBeVisible();expect(matchCalls(native,blocked)).toHaveLength(0);expect(await native.snapshot()).toEqual(before);await expect(input).toHaveValue('');await input.press('Escape');
 const start=native.calls.length;await input.fill('5.5');await panel.getByTestId('transform-match-properties').click();await native.queueDialog('save','match-immediate.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);await expect.poll(async()=>(await model(native,f.id)).properties.find(p=>p.property==='x')?.offset).toBe(7.5);
 const edits=calls(native,start);expect(edits.map(c=>(c.args.edit as {type:string}).type)).toEqual(['updateConstraint','matchTransform']);expect((await model(native,f.id)).offsets[1]).toBe(5.5);expect((edits[1]!.result as ProjectSummary).revision).toBe(before.revision+2);const firstSave=native.calls.slice(start).find(c=>c.command==='save_project');expect(firstSave).toBeTruthy();expect((firstSave!.result as ProjectSummary).constraints!.find(c=>c.id===f.id)).toEqual(await model(native,f.id));
 const afterProperties=await model(native,f.id);await panel.getByTestId('transform-offset-1').fill('9');await panel.getByTestId('transform-offset-1').press('Enter');await expect.poll(async()=>(await model(native,f.id)).offsets[1]).toBe(9);
 // Save observes the pending field flight, including after Match refreshed ranges.
 await panel.getByTestId('transform-mix-0').fill('37.5');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);expect((await model(native,f.id)).mix[0]).toBe(.375);expect((await model(native,f.id)).editorRangeBits).toEqual(afterProperties.editorRangeBits);
 // Persist the actual results of BOTH header actions, after the independent draft checks.
 const priorFinal=(await native.snapshot())!;await panel.getByTestId('transform-match-offsets').click();await expect.poll(async()=>(await native.snapshot())!.revision).toBe(priorFinal.revision+1);const finalOffsets=(await model(native,f.id)).offsets;
 await panel.getByTestId('transform-match-properties').click();await expect.poll(async()=>(await native.snapshot())!.revision).toBe(priorFinal.revision+2);expect((await model(native,f.id)).offsets).toEqual(finalOffsets);await unchangedBones(native,before);const finalMatched=await model(native,f.id);
 const file='match-actions.fbones',menu=await saveAs(page,native,file),saved=(await native.snapshot())!;await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open',file);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;expect(reopened.constraints).toEqual(saved.constraints);expect(reopened.bones).toEqual(saved.bones);
 const output=info.outputPath('transform-match-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'accepted-ui.fbones'));await writeFile(join(output,'authored.json'),JSON.stringify({before,afterProperties,finalMatched,saved,reopened},null,2));await select(page,f.id);await offsets(inspector(page,f.id));await page.screenshot({path:join(output,'transform-match-actions.png')});
});

test('@native dedicated Transform view matches its explicit stable constraint while Tree selects an unrelated bone',async({page,native})=>{
 const f=await fixture(native,true,true);const {id:_id,order:_order,editorRangeBits:_bits,...input}=f.constraint;await edit(native,{type:'addConstraint',constraint:{...input,name:'Unrelated Transform'}});await openNativeEditor(page);
 await page.locator(`[data-tree-kind="bone"][data-tree-id="${f.root}"]`).getByRole('treeitem').click();const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^Views$/})});await menu.locator('summary').click();await page.getByTestId('view-toggle-transform').check();await menu.locator('summary').click();
 const view=page.getByTestId('dock-panel-transform');await view.getByRole('combobox',{name:'Constraint',exact:true}).selectOption(String(f.id));const before=(await native.snapshot())!,start=native.calls.length;await view.getByTestId('transform-match-properties').click();await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+1);
 expect(matchCalls(native,start)).toHaveLength(1);expect((matchCalls(native,start)[0]!.args.edit as {id:number}).id).toBe(f.id);expect((await native.snapshot())!.constraints!.find(c=>c.name==='Unrelated Transform')).toEqual(before.constraints!.find(c=>c.name==='Unrelated Transform'));await expect(page.locator(`[data-tree-kind="bone"][data-tree-id="${f.root}"]`)).toHaveClass(/selected/);await unchangedBones(native,before);
});

test('@native singular Match error and stale native revision are atomic and leave authored state unchanged',async({page,native},info)=>{
 const f=await fixture(native,false,false,0,true);await openNativeEditor(page);await select(page,f.id);const before=(await native.snapshot())!,start=native.calls.length;
 await inspector(page,f.id).getByTestId('transform-match-offsets').click();
 await expect.poll(()=>matchCalls(native,start).some(call=>'result' in call||'error' in call)).toBe(true);
 const after=(await native.snapshot())!;await info.attach('singular-match-native-diagnostic',{body:JSON.stringify({before,after,calls:native.calls.slice(start)},null,2),contentType:'application/json'});
 expect(after).toEqual(before);expect(matchCalls(native,start)).toHaveLength(1);expect(matchCalls(native,start)[0]!.error).toBeTruthy();await expect(page.getByRole('alert').first()).toBeVisible();
 const pose=await native.invoke<EvaluationSnapshot>('evaluate_project',{expectedRevision:before.revision,request:{time:0,mode:'pose'}});
 await expect(native.invoke('edit_rig',{expectedRevision:before.revision-1,poseEpoch:pose.poseEpoch,edit:{type:'matchTransform',id:f.id,section:'properties'}})).rejects.toThrow();expect(await native.snapshot()).toEqual(before);
});
