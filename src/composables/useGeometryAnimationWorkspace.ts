import {computed,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {sameAnimationFrame,type AnimationCurve,type AnimationView} from '../domain/animation.ts';
import {deformDimension,sampleDeformPoses,deformSlots,sampleDrawOrder,orderSlots,type DeformKeyInput,type DeformPose,type DrawOrderKeyInput} from '../domain/animationGeometry.ts';
import {bindingPoints,previewBindingVertices} from '../domain/binding.ts';
import type {BoneView,EvaluationSnapshot,ProjectSummary,RigEdit,SlotView} from '../domain/project.ts';

interface Options {
 project:ShallowRef<ProjectSummary|null>;active:Readonly<Ref<AnimationView|null>>;slots:Readonly<Ref<SlotView[]>>;
 frame:Ref<number>;mode:Ref<'setup'|'animate'>;autoKey:Ref<boolean>;version:Ref<number>;attachment:Ref<number|null>;
 edit:(edit:RigEdit)=>Promise<boolean>;pause:()=>void;notice:(message:string,error?:boolean)=>void;
}
export function shiftDeformKey(key:DeformKeyInput,delta:number,storedSource=false):DeformKeyInput{const frame=(value:number)=>storedSource?Math.fround(value):value;return {...key,frame:frame(key.frame)+delta,...(key.controls?{controls:[frame(key.controls[0])+delta,key.controls[1],frame(key.controls[2])+delta,key.controls[3]] as [number,number,number,number]}:{})};}
export function useGeometryAnimationWorkspace(o:Options){
 const drawOrderDraft=shallowRef<number[]|null|undefined>(),deformDraft=shallowRef<ReadonlyMap<number,number[]>>(new Map());
 const geometrySnapshot=shallowRef<{snapshot:EvaluationSnapshot;version:number}|null>(null);
 watch([drawOrderDraft,deformDraft],()=>{o.version.value++;},{flush:'sync'});
 const setupSlots=computed(()=>o.project.value?.slots??[]);
 const localOrder=computed(()=>drawOrderDraft.value===undefined?sampleDrawOrder(setupSlots.value,o.active.value?.drawOrder??[],o.frame.value):drawOrderDraft.value??setupSlots.value.map(s=>s.id));
 const localDeform=computed(()=>sampleDeformPoses(setupSlots.value,o.active.value?.deformTracks??[],o.frame.value,deformDraft.value));
 const frozen=computed(()=>{
  const value=geometrySnapshot.value,p=o.project.value;if(!value||!p)return null;const s=value.snapshot;
  return value.version===o.version.value&&s.documentId===p.documentId&&s.revision===p.revision&&s.animationId===o.active.value?.id?s:null;
 });
 const animationDeformPose=computed(()=>{const poses=new Map(localDeform.value.map(pose=>[pose.attachment,pose]));for(const pose of frozen.value?.deformPose??[])poses.set(pose.attachment,pose);return [...poses.values()];});
 const animationDrawOrder=computed(()=>frozen.value?.drawOrder??localOrder.value);
 const drawOrderSlots=computed(()=>o.project.value?.sceneEditing?orderSlots(deformSlots(o.slots.value,animationDeformPose.value),animationDrawOrder.value):o.slots.value);
 const animationDeformTracks=computed(()=>o.active.value?.deformTracks?.map(track=>({id:`deform:${track.attachment}`,attachmentId:track.attachment,slotId:setupSlots.value.find(s=>s.attachments?.some(a=>a.id===track.attachment))?.id??-1,keys:track.keys.map(key=>({...key}))}))??[]);
 const animationDrawOrderKeys=computed(()=>o.active.value?.drawOrder??[]);
 function clearGeometryAnimationDraft(){if(drawOrderDraft.value!==undefined)drawOrderDraft.value=undefined;if(deformDraft.value.size)deformDraft.value=new Map();}
 function releaseAnimationGeometrySnapshot(){if(geometrySnapshot.value)geometrySnapshot.value=null;}
 function setAnimationGeometrySnapshot(snapshot:EvaluationSnapshot,version:number){geometrySnapshot.value={snapshot,version};}
 function animationGeometryOverrides(){const target=setupSlots.value.flatMap(slot=>slot.attachments??[]).find(a=>a.id===o.attachment.value&&(a.mesh||a.clipping));return {...(target?{deformTargets:[target.id]}:{}),...(drawOrderDraft.value===undefined?{}:{drawOrderPose:[...localOrder.value]}),...(deformDraft.value.size?{deformPose:[...deformDraft.value].map(([attachment,offsets])=>({attachment,offsets:[...offsets]}))}:{})};}
 function current(){if(o.mode.value!=='animate'||!o.active.value)throw new Error('Create or select an animation first.');return o.active.value;}
 async function perform(action:()=>Promise<boolean>):Promise<boolean>{try{return await action();}catch(error){o.notice(error instanceof Error?error.message:String(error),true);return false;}}
 function normalizedOrder(order:number[]|null):number[]|null {
  if(order===null)return null;orderSlots(setupSlots.value,order);
  return order.every((id,index)=>setupSlots.value[index]!.id===id)?null:[...order];
 }
 async function setAnimationDrawOrder(order:number[]|null):Promise<boolean>{return perform(async()=>{
  o.pause();const clip=current(),value=normalizedOrder(order);
  if(!o.autoKey.value){drawOrderDraft.value=value;return true;}
  return o.edit({type:'setAnimationDrawOrderKeys',animation:clip.id,keys:[{frame:o.frame.value,order:value}]});
 });}
 async function insertDrawOrderKey():Promise<boolean>{return perform(async()=>{o.pause();const clip=current();return o.edit({type:'setAnimationDrawOrderKeys',animation:clip.id,keys:[{frame:o.frame.value,order:normalizedOrder(localOrder.value)}]});});}
 function deformInput(attachment:number):DeformKeyInput {
  const clip=current(),target=setupSlots.value.flatMap(slot=>slot.attachments??[]).find(a=>a.id===attachment),pose=animationDeformPose.value.find(p=>p.attachment===attachment)??(target&&(target.mesh||target.clipping)?{attachment,offsets:Array(deformDimension(target)).fill(0)}:null);
  if(!pose)throw new Error('Select a mesh or clipping attachment to key.');
  const existing=clip.deformTracks?.find(t=>t.attachment===attachment)?.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,o.frame.value));
  const hasData=pose.offsets.some(value=>value!==0);
  return {attachment,frame:o.frame.value,offsets:[...pose.offsets],curve:existing?.curve??'linear',...(existing?{dataPresent:hasData?true:existing.dataPresent}:{}),...(existing?.controls?{controls:[...existing.controls]}:{})};
 }
 async function insertDeformKey(attachment:number):Promise<boolean>{return perform(async()=>{o.pause();const clip=current();return o.edit({type:'setAnimationDeformKeys',animation:clip.id,keys:[deformInput(attachment)]});});}
 function geometryKeysForIds(ids:readonly number[]):{drawOrderKeys:DrawOrderKeyInput[];deformKeys:DeformKeyInput[]}{
  return {drawOrderKeys:(o.active.value?.drawOrder??[]).filter(k=>ids.includes(k.id)).map(key=>({keyId:key.id,frame:key.frame,order:key.order===null?null:[...key.order]})),deformKeys:(o.active.value?.deformTracks??[]).flatMap(track=>track.keys.filter(k=>ids.includes(k.id)).map(key=>({keyId:key.id,attachment:track.attachment,frame:key.frame,offsets:[...key.offsets],dataPresent:key.dataPresent,curve:key.curve,...(key.controls?{controls:[...key.controls] as [number,number,number,number]}:{})})))};
 }
 async function updateDrawOrderKey(change:{id:number;order:number[]|null}){return perform(async()=>{const key=geometryKeysForIds([change.id]).drawOrderKeys[0];if(!key)return false;return o.edit({type:'setAnimationDrawOrderKeys',animation:current().id,keys:[{...key,order:normalizedOrder(change.order)}]});});}
 async function updateDeformCurve(change:{id:number;curve:AnimationCurve;controls?:[number,number,number,number]}){return perform(async()=>{
  const key=geometryKeysForIds([change.id]).deformKeys[0];if(!key)return false;
  return o.edit({type:'setAnimationDeformKeys',animation:current().id,keys:[{...key,curve:change.curve,controls:change.curve==='bezier'?change.controls??key.controls:null}]});
 });}
 function geometryInterpolationKeys(ids:readonly number[],curve:AnimationCurve):DeformKeyInput[]{
  const result:DeformKeyInput[]=[];
  for(const track of o.active.value?.deformTracks??[])for(const key of track.keys){if(!ids.includes(key.id))continue;const next=track.keys.find(k=>k.frame>key.frame);if(curve==='bezier'&&!next)continue;
   const span=(next?.frame??key.frame+1)-key.frame;
   result.push({attachment:track.attachment,keyId:key.id,frame:key.frame,offsets:[...key.offsets],dataPresent:key.dataPresent,curve,...(curve==='bezier'?{controls:key.controls??[key.frame+span/3,1/3,key.frame+span*2/3,2/3]}:{})});
  }
  return result;
 }
 /** Native commits use the precise frozen cache. Auto Key-off reuses only the
  * existing scratch binding preview; it cannot write Setup or a project file. */
 function deformAnimationEdit(edit:RigEdit,bones:readonly BoneView[]):RigEdit|null {
  const body=edit.type==='attachmentEdit'?edit.edit:edit;
  if(body.type!=='moveVertex'&&body.type!=='moveVertices'&&body.type!=='moveMesh'&&body.type!=='moveClippingVertices'&&body.type!=='transformAttachments')throw new Error('Switch to Setup to change attachment topology or bindings.');
  if(body.type==='moveVertices'&&body.editUvs)throw new Error('UV editing belongs to Setup.');
  if(body.type==='transformAttachments'&&body.ids.length!==1)throw new Error('Select one mesh or clipping attachment to deform.');
  const attachment=edit.type==='attachmentEdit'?edit.id:body.type==='moveClippingVertices'?body.id:body.type==='transformAttachments'?body.ids[0]!:o.attachment.value;
  if(attachment===null)throw new Error('Select a mesh or clipping attachment.');
  const owner=drawOrderSlots.value.find(slot=>slot.attachments?.some(a=>a.id===attachment)),target=owner?.attachments?.find(a=>a.id===attachment);
  const initial=animationDeformPose.value.find(p=>p.attachment===attachment)?.offsets??(target?Array(deformDimension(target)).fill(0):[]);
  const sampled=owner&&target&&!animationDeformPose.value.some(p=>p.attachment===attachment)?deformSlots([owner],[{attachment,offsets:initial}])[0]!.attachments!.find(a=>a.id===attachment):target,binding=sampled?.mesh??sampled?.clipping;
  if(!binding)throw new Error('Select a mesh or clipping attachment.');
  const vertices=body.type==='moveVertex'?[{vertex:body.vertex,x:body.x,y:body.y}]:body.type==='moveMesh'?bindingPoints(bones,binding).map((point,vertex)=>({vertex,x:point.x+body.dx,y:point.y+body.dy})):body.type==='transformAttachments'?bindingPoints(bones,binding).map((point,vertex)=>{
   const x=point.x-body.pivotX,y=point.y-body.pivotY,angle=body.rotation*Math.PI/180,scaleX=body.mode==='scale'?body.scaleX:1,scaleY=body.mode==='scale'?body.scaleY:1,c=body.mode==='rotate'?Math.cos(angle):1,s=body.mode==='rotate'?Math.sin(angle):0;
   return {vertex,x:body.pivotX+x*scaleX*c-y*scaleY*s+body.dx,y:body.pivotY+x*scaleX*s+y*scaleY*c+body.dy};
  }):body.vertices;
  o.pause();const clip=current();
  if(o.autoKey.value)return {type:'setAnimationDeformVertices',animation:clip.id,attachment,frame:o.frame.value,vertices};
  const preview=previewBindingVertices(bones,binding,vertices),base=setupSlots.value.flatMap(slot=>slot.attachments??[]).find(a=>a.id===attachment),original=base?.mesh??base?.clipping;
  if(!original)throw new Error('The attachment binding no longer exists.');
  const offsets=[...initial],changed=new Set(vertices.map(vertex=>vertex.vertex));let cursor=0;
  for(const [index,row]of preview.vertices.entries()){if(changed.has(index))for(let column=0;column<row.weights.length;column++){if(!row.weights[column])continue;for(let axis=0;axis<2;axis++){const at=column*2+axis;offsets[cursor+at]!+=row.positions[at]!-binding.vertices[index]!.positions[at]!;}}cursor+=row.positions.length;}
  const next=new Map(deformDraft.value);next.set(attachment,offsets);deformDraft.value=next;return null;
 }
 watch(()=>[o.project.value?.documentId,o.project.value?.animations,o.active.value?.id,o.frame.value,o.mode.value],()=>{releaseAnimationGeometrySnapshot();clearGeometryAnimationDraft();},{flush:'sync'});
 watch(o.version,releaseAnimationGeometrySnapshot,{flush:'sync'});
 return {drawOrderDraft,deformDraft,animationDeformPose,animationDrawOrder,drawOrderSlots,animationDeformTracks,animationDrawOrderKeys,clearGeometryAnimationDraft,releaseAnimationGeometrySnapshot,setAnimationGeometrySnapshot,animationGeometryOverrides,setAnimationDrawOrder,insertDrawOrderKey,insertDeformKey,geometryKeysForIds,updateDrawOrderKey,updateDeformCurve,geometryInterpolationKeys,deformAnimationEdit};
}
