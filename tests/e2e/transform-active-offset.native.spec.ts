import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Locator,Page} from '@playwright/test';
import type {BoneView,ProjectSummary,RigEdit,TransformConstraintInput,TransformConstraintView} from '../../src/domain/project';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

type NamedConstraint=Omit<TransformConstraintInput,'type'|'source'|'bones'>&{source:string;bones:string[];rangeCache:(number|null)[]};
interface SceneReference {
 name:string;selectedConstraint:string;bones:(Required<Omit<BoneView,'id'|'parent'|'color'|'evaluatedWorld'>>&{parent?:string})[];
 constraintsBefore:NamedConstraint[];
}
interface OffsetReference {schema:string;sceneReference:string;selectedConstraint:string;expectedOffsetF32Bits:number[];expectedOffsetValues:number[]}
const bits=(value:number)=>{const view=new DataView(new ArrayBuffer(4));view.setFloat32(0,value,false);return view.getUint32(0,false);};
async function edit(native:NativeSession,change:RigEdit){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:(await native.snapshot())!.revision,edit:change});}
function constraint(summary:ProjectSummary,id:number){const c=summary.constraints!.find(c=>c.id===id);if(c?.type!=='transform')throw Error('Own active Offset Transform missing');return c;}
const inspector=(page:Page,id:number)=>page.locator(`[data-testid="constraint-inspector"][data-constraint-id="${id}"]`).first();
async function select(page:Page,id:number){await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();await expect(inspector(page,id)).toBeVisible();return inspector(page,id);}
async function expandOffsets(panel:Locator){const details=panel.getByTestId('transform-offset-controls').locator('..');if(!await details.evaluate(e=>(e as HTMLDetailsElement).open))await details.locator('summary').click();}
function unrelated(c:TransformConstraintView){const {offsets:_offsets,...rest}=c;return rest;}
const authoredEdits=(native:NativeSession,start:number)=>native.calls.slice(start).filter(c=>c.command==='edit_rig');
async function fixture(native:NativeSession){
 const reference=JSON.parse(await readFile(new URL('../../docs/research/fixtures/transform-match-active-offset-reference.json',import.meta.url),'utf8')) as OffsetReference;
 expect(reference.schema).toBe('fbones-own-transform-active-offset-reference-v1');
 const scene=JSON.parse(await readFile(new URL(`../../docs/research/fixtures/${reference.sceneReference}`,import.meta.url),'utf8')) as SceneReference;
 let summary=await native.invoke<ProjectSummary>('create_project',{name:scene.name,discardChanges:true});const ids=new Map<string,number>();
 for(const[index,bone]of scene.bones.entries()){
  const{parent,...pose}=bone;let id:number;
  if(index===0)id=summary.bones[0]!.id;
  else{const parentId=ids.get(parent!);if(parentId===undefined)throw Error('Own reference parent missing');summary=await edit(native,{type:'create',parent:parentId,x:pose.x,y:pose.y,rotation:pose.rotation,length:pose.length});id=summary.editedBone!;}
  summary=await edit(native,{type:'update',id,...pose});ids.set(bone.name,id);
 }
 for(const named of scene.constraintsBefore){const{source,bones,rangeCache,...fields}=named;expect(rangeCache).toEqual(Array(24).fill(null));summary=await edit(native,{type:'addConstraint',constraint:{type:'transform',...fields,source:ids.get(source)!,bones:bones.map(name=>ids.get(name)!)}});}
 await native.queueDialog('save','active-offset-before.fbones');summary=await native.invoke<ProjectSummary>('save_project',{saveAs:true});
 const id=summary.constraints!.find(c=>c.name===reference.selectedConstraint)!.id;
 expect(summary.constraints!.map(c=>c.name)).toEqual(['drive-source-x','active-sampling-match']);
 expect(constraint(summary,id).editorRangeBits).toEqual(Array(24).fill(null));return{reference,before:summary,id};
}
async function saveAs(page:Page,native:NativeSession,file:string){const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await native.queueDialog('save',file);await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);return{menu,saved:(await native.snapshot())!};}

test('@native active Offset Match retains all six original prefix bits and unrelated fields through one history action and binary Save Close Open',async({page,native},info)=>{
 const f=await fixture(native),prior=constraint(f.before,f.id),output=info.outputPath('active-offset-reference');await mkdir(output,{recursive:true});await copyFile(f.before.path!,join(output,'ui-before.fbones'));
 await openNativeEditor(page);const panel=await select(page,f.id),details=panel.getByTestId('transform-offset-controls').locator('..');
 // Header actions work without opening the foldout, independently from Properties Match.
 await expect(details).not.toHaveAttribute('open','');const start=native.calls.length;
 await panel.getByTestId('transform-match-offsets').click();await expect.poll(async()=>(await native.snapshot())!.revision).toBe(f.before.revision+1);
 const after=(await native.snapshot())!,matched=constraint(after,f.id);
 expect(matched.offsets[1]).toBe(20);expect(matched.offsets.map(bits)).toEqual(f.reference.expectedOffsetF32Bits);
 expect(unrelated(matched)).toEqual(unrelated(prior));expect(after.constraints![0]).toEqual(f.before.constraints![0]);expect(after.bones).toEqual(f.before.bones);expect(after.slots).toEqual(f.before.slots);
 expect(authoredEdits(native,start)).toHaveLength(1);expect(authoredEdits(native,start)[0]!.args.edit).toEqual({type:'matchTransform',id:f.id,section:'offsets'});
 await expect(details).not.toHaveAttribute('open','');await expandOffsets(panel);
 for(const[index,value]of matched.offsets.entries())await expect(panel.getByTestId(`transform-offset-${index}`)).toHaveValue(String(value));
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,f.id)).toEqual(prior);expect((await native.snapshot())!.canUndo).toBe(f.before.canUndo);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,f.id)).toEqual(matched);
 const file='active-offset-matched.fbones',{menu,saved}=await saveAs(page,native,file);
 await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();
 await native.queueDialog('open',file);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;
 expect(reopened.constraints).toEqual(saved.constraints);expect(reopened.bones).toEqual(saved.bones);expect(constraint(reopened,f.id).offsets.map(bits)).toEqual(f.reference.expectedOffsetF32Bits);
 await copyFile(saved.path!,join(output,'ui-authored.fbones'));await writeFile(join(output,'semantic-result.json'),JSON.stringify({before:f.before,after,saved,reopened,referenceSchema:f.reference.schema},null,2));
});

test('@native active Offset Match blocks invalid drafts and flushes a pending field before its single action and immediate Save',async({page,native},info)=>{
 const f=await fixture(native);await openNativeEditor(page);const panel=await select(page,f.id);await expandOffsets(panel);
 const field=panel.getByTestId('transform-offset-1'),before=(await native.snapshot())!,blocked=native.calls.length;
 await field.fill('');await panel.getByTestId('transform-match-offsets').click();await expect(panel.getByRole('alert')).toBeVisible();expect(authoredEdits(native,blocked)).toHaveLength(0);expect(await native.snapshot()).toEqual(before);
 await page.getByRole('button',{name:'Save',exact:true}).click();expect(await native.snapshot()).toEqual(before);expect(native.calls.slice(blocked).some(c=>c.command==='save_project')).toBe(false);await field.press('Escape');
 const start=native.calls.length;
 await field.fill('5.5');await panel.getByTestId('transform-match-offsets').click();await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);
 const saved=(await native.snapshot())!,matched=constraint(saved,f.id),edits=authoredEdits(native,start);
 expect(edits.map(c=>(c.args.edit as {type:string}).type)).toEqual(['updateConstraint','matchTransform']);expect(edits[1]!.args.edit).toEqual({type:'matchTransform',id:f.id,section:'offsets'});
 // Session Save advances revision without adding an authoring-history entry.
 const fieldResponse=edits[0]!.result as ProjectSummary,matchResponse=edits[1]!.result as ProjectSummary;
 expect(fieldResponse.revision).toBe(before.revision+1);expect(matchResponse.revision).toBe(before.revision+2);
 expect(matched.offsets.map(bits)).toEqual(f.reference.expectedOffsetF32Bits);expect(unrelated(matched)).toEqual(unrelated(constraint(before,f.id)));expect(saved.constraints![0]).toEqual(before.constraints![0]);expect(saved.bones).toEqual(before.bones);
 const saves=native.calls.slice(start).filter(c=>c.command==='save_project');expect(saves).toHaveLength(1);const saveResponse=saves[0]!.result as ProjectSummary;
 expect(saveResponse.revision).toBe(matchResponse.revision+1);expect(saved).toEqual(saveResponse);expect(constraint(saveResponse,f.id).offsets.map(bits)).toEqual(f.reference.expectedOffsetF32Bits);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,f.id).offsets[1]).toBe(5.5);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,f.id)).toEqual(constraint(before,f.id));
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,f.id).offsets[1]).toBe(5.5);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,f.id).offsets.map(bits)).toEqual(f.reference.expectedOffsetF32Bits);
 const output=info.outputPath('active-offset-pending');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'ui-authored.fbones'));await writeFile(join(output,'semantic-result.json'),JSON.stringify({before,saved,referenceSchema:f.reference.schema},null,2));
});
