import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {BoneView,ProjectSummary,RigEdit,TransformConstraintInput,TransformConstraintView} from '../../src/domain/project';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

type NamedConstraint=Omit<TransformConstraintInput,'type'|'source'|'bones'>&{source:string;bones:string[];rangeCache:(number|null)[]};
interface Reference {
 schema:string;name:string;selectedConstraint:string;bones:(Required<Omit<BoneView,'id'|'parent'|'color'|'evaluatedWorld'>>&{parent?:string})[];
 constraintsBefore:NamedConstraint[];expectedPrimaryAfter:NamedConstraint;expectedRangeF32Bits:number[];
 expectedRuntimeScalars:{field:string;value:number;f32Bits:number}[];
}
const f32bits=(value:number)=>{const data=new DataView(new ArrayBuffer(4));data.setFloat32(0,value,false);return data.getUint32(0,false);};
async function edit(native:NativeSession,change:RigEdit){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:(await native.snapshot())!.revision,edit:change});}
function constraint(summary:ProjectSummary,id:number){const c=summary.constraints!.find(c=>c.id===id);if(c?.type!=='transform')throw Error('Own reference Transform missing');return c;}
function runtime(c:TransformConstraintView){return Object.fromEntries(c.properties.flatMap(from=>[
 [`${from.property}.offset`,f32bits(from.offset)],
 ...from.to.flatMap(to=>['offset','max','scale'].map(field=>[`${from.property}->${to.property}.${field}`,f32bits(to[field as 'offset'|'max'|'scale'])])),
]));}

test('@native Properties Match samples before its active effect and retains all48 original-reference scalars through Undo Redo Save Close Open',async({page,native},info)=>{
 const output=info.outputPath('active-properties-reference');await mkdir(output,{recursive:true});
 const reference=JSON.parse(await readFile(new URL('../../docs/research/fixtures/transform-match-active-properties-reference.json',import.meta.url),'utf8')) as Reference;
 expect(reference.schema).toBe('fbones-own-transform-active-properties-reference-v1');
 let summary=await native.invoke<ProjectSummary>('create_project',{name:reference.name,discardChanges:true});
 const ids=new Map<string,number>();
 for(const[index,bone]of reference.bones.entries()){
  const {parent,...pose}=bone;
  let id:number;
  if(index===0)id=summary.bones[0]!.id;
  else{const parentId=ids.get(parent!);if(parentId===undefined)throw Error('Own fixture parent missing');summary=await edit(native,{type:'create',parent:parentId,x:pose.x,y:pose.y,rotation:pose.rotation,length:pose.length});id=summary.editedBone!;}
  summary=await edit(native,{type:'update',id,...pose});ids.set(bone.name,id);
 }
 for(const named of reference.constraintsBefore){
  const {source,bones,rangeCache,...fields}=named;expect(rangeCache).toEqual(Array(24).fill(null));
  summary=await edit(native,{type:'addConstraint',constraint:{type:'transform',...fields,source:ids.get(source)!,bones:bones.map(name=>ids.get(name)!)}});
 }
 // This input is encoded by our real native Session; no original GUI metadata is stripped.
 await native.queueDialog('save','active-properties-before.fbones');summary=await native.invoke<ProjectSummary>('save_project',{saveAs:true});await copyFile(summary.path!,join(output,'ui-before.fbones'));
 const id=summary.constraints!.find(c=>c.name===reference.selectedConstraint)!.id,before=summary,prior=constraint(before,id);
 expect(before.constraints!.map(c=>c.name)).toEqual(['drive-source-x','active-sampling-match']);
 expect(prior.editorRangeBits).toEqual(Array(24).fill(null));
 await openNativeEditor(page);await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();
 const panel=page.locator(`[data-testid="constraint-inspector"][data-constraint-id="${id}"]`).first();await expect(panel).toBeVisible();
 const start=native.calls.length;await panel.getByTestId('transform-match-properties').click();
 await expect.poll(async()=>(await native.snapshot())!.revision).toBe(before.revision+1);
 const after=(await native.snapshot())!,matched=constraint(after,id);
 // Original full-frame target is65.5; original Properties Match stores pre-effect70.
 expect(matched.editorRangeValues![4]).toBe(39);expect(matched.editorRangeValues![6]).toBe(70);
 expect(matched.editorRangeBits).toEqual(reference.expectedRangeF32Bits);
 expect(runtime(matched)).toEqual(Object.fromEntries(reference.expectedRuntimeScalars.map(cell=>[cell.field,cell.f32Bits])));
 expect(matched.properties).toEqual(reference.expectedPrimaryAfter.properties);
 const unchanged=(c:TransformConstraintView)=>{const {properties:_properties,editorRangeBits:_bits,editorRangeValues:_values,...fields}=c;return fields;};
 expect(unchanged(matched)).toEqual(unchanged(prior));expect(after.constraints![0]).toEqual(before.constraints![0]);expect(after.bones).toEqual(before.bones);
 const matches=native.calls.slice(start).filter(c=>c.command==='edit_rig'&&(c.args.edit as {type?:string}).type==='matchTransform');expect(matches).toHaveLength(1);expect(matches[0]!.args.edit).toEqual({type:'matchTransform',id,section:'properties'});
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,id)).toEqual(prior);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>constraint((await native.snapshot())!,id)).toEqual(matched);
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})}),file='active-properties.fbones';
 await native.queueDialog('save',file);await menu.locator('summary').click();await menu.getByRole('button',{name:/^Save as/}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);
 const saved=(await native.snapshot())!;await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();
 await native.queueDialog('open',file);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();
 const reopened=(await native.snapshot())!;expect(reopened.constraints).toEqual(saved.constraints);expect(reopened.bones).toEqual(saved.bones);expect(constraint(reopened,id).editorRangeBits).toEqual(reference.expectedRangeF32Bits);
 await copyFile(saved.path!,join(output,'ui-authored.fbones'));await writeFile(join(output,'semantic-result.json'),JSON.stringify({before,after,saved,reopened,referenceSchema:reference.schema},null,2));
});
