import {watch,type Ref,type ShallowRef} from 'vue';
import {sampleAnimation,sameAnimationFrame,animationBoneChannels,type AnimationChannel,type AnimationView} from '../domain/animation.ts';
import {sampleSlotPoses} from '../domain/animationSlots.ts';
import {sampleDeformPoses,sampleDrawOrder,deformDimension} from '../domain/animationGeometry.ts';
import {constraintPose,physicsProperties,sampleConstraintPoses} from '../domain/animationConstraints.ts';
import type {BoneView,ProjectSummary,RigEdit} from '../domain/project.ts';
import type {useSlotAnimationWorkspace} from './useSlotAnimationWorkspace.ts';
import type {useGeometryAnimationWorkspace} from './useGeometryAnimationWorkspace.ts';
import type {useConstraintAnimationWorkspace} from './useConstraintAnimationWorkspace.ts';
import {validSequenceWorkingPose} from '../domain/animationSequence.ts';
import type {useSequenceAnimationWorkspace} from './useSequenceAnimationWorkspace.ts';
import {logicalDocumentKey,validImageResourceUpdate} from '../domain/resourceContinuity.ts';

export const boneChannelFields={translate:['x','y'],rotate:['rotation'],scale:['scaleX','scaleY'],shear:['shearX','shearY'],translateX:['x'],translateY:['y'],scaleX:['scaleX'],scaleY:['scaleY']} as const;
export function boneChannelValues(bone:BoneView,channel:AnimationChannel):number[]{return boneChannelFields[channel].map(field=>bone[field]??(field==='scaleX'||field==='scaleY'?1:0));}
const equal=(a:unknown,b:unknown)=>JSON.stringify(a,(_,value)=>Object.is(value,-0)?{negativeZero:true}:value)===JSON.stringify(b,(_,value)=>Object.is(value,-0)?{negativeZero:true}:value);
interface Field {key:string;value:unknown;restore:()=>void}
type Publication={kind:'edit';edit:RigEdit}|{kind:'save'}|{kind:'resources'};
interface Options {
 project:ShallowRef<ProjectSummary|null>;active:Readonly<Ref<AnimationView|null>>;frame:Ref<number>;mode:Ref<'setup'|'animate'>;epoch:Ref<number>;
 bones:ShallowRef<BoneView[]|null>;slots:ReturnType<typeof useSlotAnimationWorkspace>;geometry:ReturnType<typeof useGeometryAnimationWorkspace>;constraints:ReturnType<typeof useConstraintAnimationWorkspace>;
 sequences:ReturnType<typeof useSequenceAnimationWorkspace>;
}

/** Preserve only live unkeyed overrides across one native publication. This is
 * an FBones working-pose policy, not an original-editor gesture claim. */
export function useAnimationDraftRetention(o:Options){
 function capture(includeClean=false):Field[]{
  const model=o.project.value,clip=o.active.value,frame=o.frame.value,fields:Field[]=[];
  if(!model||!clip||o.mode.value!=='animate')return fields;
  const add=(key:string,value:unknown,restore:()=>void)=>fields.push({key,value,restore});
  const savedBones=new Map(sampleAnimation(model.bones,clip,frame).map(bone=>[bone.id,bone]));
  for(const bone of o.bones.value??[]){const saved=savedBones.get(bone.id);if(!saved)continue;
   for(const channel of animationBoneChannels(clip,bone.id)){
    const values=boneChannelValues(bone,channel);if(!includeClean&&equal(values,boneChannelValues(saved,channel)))continue;
    add(`bone:${bone.id}:${channel}`,values,()=>{
     const current=o.project.value;if(!current)return;
     const bones=o.bones.value??sampleAnimation(current.bones,o.active.value,o.frame.value);
     o.bones.value=bones.map(item=>{if(item.id!==bone.id)return item;const patch=Object.fromEntries(boneChannelFields[channel].map((field,index)=>[field,values[index]]));const{evaluatedWorld:_,...base}=item;return{...base,...patch};});
    });
   }
  }
  const savedSlots=new Map(sampleSlotPoses(model.slots??[],clip.slotTracks??[],frame).map(pose=>[pose.slot,pose]));
  for(const[id,draft]of o.slots.slotAnimationDraft.value){const saved=savedSlots.get(id);if(!saved)continue;
   if(draft.attachment!==undefined&&(includeClean||draft.attachment!==saved.attachment)){const value=draft.attachment;add(`slot:${id}:attachment`,value,()=>{
    if(!o.project.value?.slots?.some(slot=>slot.id===id&&(value===null||slot.attachments?.some(a=>a.id===value))))return;
    o.slots.slotAnimationDraft.value=new Map(o.slots.slotAnimationDraft.value).set(id,{...o.slots.slotAnimationDraft.value.get(id),attachment:value});
   });}
   if(draft.color&&(includeClean||!equal(draft.color,saved.color))){const color=[...draft.color] as typeof draft.color;add(`slot:${id}:rgba`,color,()=>{
    if(o.project.value?.slots?.some(slot=>slot.id===id))o.slots.slotAnimationDraft.value=new Map(o.slots.slotAnimationDraft.value).set(id,{...o.slots.slotAnimationDraft.value.get(id),color});
   });}
   if(draft.dark&&(includeClean||!equal(draft.dark,saved.dark??[0,0,0]))){const dark=[...draft.dark] as typeof draft.dark;add(`slot:${id}:dark`,dark,()=>{
    if(o.project.value?.slots?.some(slot=>slot.id===id&&slot.tintBlack))o.slots.slotAnimationDraft.value=new Map(o.slots.slotAnimationDraft.value).set(id,{...o.slots.slotAnimationDraft.value.get(id),dark});
   });}
  }
  const order=o.geometry.drawOrderDraft.value;
  if(order!==undefined&&(includeClean||!equal(order??model.slots?.map(slot=>slot.id)??[],sampleDrawOrder(model.slots??[],clip.drawOrder??[],frame))))add('drawOrder',order,()=>{
   const ids=o.project.value?.slots?.map(slot=>slot.id)??[];if(order===null||order.length===ids.length&&order.every(id=>ids.includes(id)))o.geometry.drawOrderDraft.value=order;
  });
  const savedDeform=new Map(sampleDeformPoses(model.slots??[],clip.deformTracks??[],frame).map(pose=>[pose.attachment,pose.offsets]));
  for(const[id,offsets]of o.geometry.deformDraft.value){
   if(!includeClean&&equal(offsets,savedDeform.get(id)??offsets.map(()=>0)))continue;
   add(`deform:${id}`,offsets,()=>{const target=o.project.value?.slots?.flatMap(slot=>slot.attachments??[]).find(a=>a.id===id);if(target&&deformDimension(target)===offsets.length)o.geometry.deformDraft.value=new Map(o.geometry.deformDraft.value).set(id,offsets);});
  }
  const sampled=new Map(sampleConstraintPoses(model.constraints??[],clip.constraintTracks??[],frame).map(pose=>[pose.constraint,pose]));
  for(const[id,pose]of o.constraints.constraintDraft.value){
   const setup=model.constraints?.find(c=>c.id===id),saved=sampled.get(id)??(setup?constraintPose(setup):null);if(!saved||saved.type!==pose.type)continue;
   const restore=(apply:(base:typeof pose)=>typeof pose)=>{
    const view=o.constraints.animationConstraint(id);if(!view||view.type!==pose.type)return;
    const base=o.constraints.constraintDraft.value.get(id)??constraintPose(view);
    o.constraints.constraintDraft.value=new Map(o.constraints.constraintDraft.value).set(id,apply(base));
   };
   if(pose.type==='physics'&&saved.type==='physics')for(const property of physicsProperties){
    const value=pose[property];if(!includeClean&&Object.is(value,saved[property]))continue;
    add(`constraint:${id}:physics:${property}`,value,()=>restore(base=>base.type==='physics'?{...base,[property]:value}:base));
   }
   else if(includeClean||!equal(pose,saved))add(`constraint:${id}:${pose.type}`,pose,()=>restore(()=>pose));
  }
  for(const[id,value]of o.constraints.eventDraft.value)add(`event:${id}`,value,()=>{if(o.project.value?.events?.some(event=>event.id===id))o.constraints.eventDraft.value=new Map(o.constraints.eventDraft.value).set(id,value);});
  for(const[id,value]of o.sequences.sequenceDraft.value){
   add(`sequence:${id}`,value,()=>{const target=o.project.value?.slots?.flatMap(slot=>slot.attachments??[]).find(a=>a.id===id);if(target?.sequence&&validSequenceWorkingPose(target.sequence,value))o.sequences.sequenceDraft.value=new Map(o.sequences.sequenceDraft.value).set(id,value);});
  }
  return fields;
 }
 // Full bone/constraint drafts contain unchanged sampled properties as well as
 // user edits. Track each property's actual working changes, so a newer clean
 // revert is distinguishable from those incidental unchanged fields.
 let publishing=false,generation=0,seen=new Map<string,unknown>();
 let intents=new Map<string,number>();
 watch(o.epoch,()=>{seen=new Map();intents=new Map();},{flush:'sync'});
 watch([o.bones,o.slots.slotAnimationDraft,o.geometry.drawOrderDraft,o.geometry.deformDraft,o.constraints.constraintDraft,o.constraints.eventDraft,o.sequences.sequenceDraft],()=>{
  if(publishing)return;
  const next=capture(true),dirty=new Set(capture().map(field=>field.key));
  for(const field of next){
   if(seen.has(field.key)?!equal(seen.get(field.key),field.value):dirty.has(field.key))intents.set(field.key,++generation);
  }
  seen=new Map(next.map(field=>[field.key,field.value]));
  for(const key of intents.keys())if(!seen.has(key))intents.delete(key);
 },{flush:'sync'});
 function affected(edit:RigEdit):Set<string>{
  const keys=new Set<string>(),clip=o.active.value;if(!clip||!('animation'in edit)||edit.animation!==clip.id)return keys;
  const at=(frame:number)=>sameAnimationFrame(frame,o.frame.value);
  const bone=(key:{bone:number;channel:string;frame:number})=>{if(at(key.frame))keys.add(`bone:${key.bone}:${key.channel}`);};
  const slot=(key:{slot:number;channel:string;frame:number;darkValues?:unknown})=>{if(at(key.frame)){keys.add(`slot:${key.slot}:${key.channel}`);if(key.channel==='rgba'&&key.darkValues!==undefined)keys.add(`slot:${key.slot}:dark`);}};
  const deform=(key:{attachment:number;frame:number})=>{if(at(key.frame))keys.add(`deform:${key.attachment}`);};
  const constraint=(key:{constraint:number;channel:string;property?:string;frame:number})=>{if(at(key.frame)&&key.channel!=='physicsReset')keys.add(`constraint:${key.constraint}:${key.channel==='transformMix'?'transform':key.channel}${key.channel==='physics'?':'+key.property:''}`);};
  const event=(key:{event:number;frame:number})=>{if(at(key.frame))keys.add(`event:${key.event}`);};
  const order=(key:{frame:number})=>{if(at(key.frame))keys.add('drawOrder');};
  const sequence=(key:{attachment:number;frame:number})=>{if(at(key.frame))keys.add(`sequence:${key.attachment}`);};
  if(edit.type==='setAnimationKey')bone(edit);
  if(edit.type==='setAnimationKeys')edit.keys.forEach(bone);
  if(edit.type==='setAnimationSlotKeys')edit.keys.forEach(slot);
  if(edit.type==='setAnimationDeformKeys')edit.keys.forEach(deform);
  if(edit.type==='setAnimationDeformVertices')deform(edit);
  if(edit.type==='setAnimationDrawOrderKeys')edit.keys.forEach(order);
  if(edit.type==='setAnimationConstraintKeys')edit.keys.forEach(constraint);
  if(edit.type==='setAnimationEventKeys')edit.keys.forEach(event);
  if(edit.type==='setAnimationSequenceKeys')edit.keys.forEach(sequence);
  if(edit.type==='setAnimationKeyBatch'){edit.boneKeys.forEach(bone);edit.slotKeys.forEach(slot);edit.deformKeys?.forEach(deform);edit.drawOrderKeys?.forEach(order);edit.constraintKeys?.forEach(constraint);edit.eventKeys?.forEach(event);edit.sequenceKeys?.forEach(sequence);}
  return keys;
 }
 function preparePublication(publication:Publication):(publish:()=>void,nextResource?:ProjectSummary)=>boolean{
  const model=o.project.value,logical=logicalDocumentKey(model);
  const document=o.project.value?.documentId,revision=o.project.value?.revision,epoch=o.epoch.value;
  const before=new Map(intents),consume=publication.kind==='edit'?affected(publication.edit):new Set<string>();
  // History and clip lifecycle transitions intentionally discard working poses.
  const preserve=publication.kind!=='edit'||publication.edit.type.startsWith('setAnimation')||publication.edit.type==='moveAnimationKeys'||publication.edit.type==='deleteAnimationKeys'||publication.edit.type==='renameAnimation';
  return (publish,nextResource)=>{
   if(o.project.value?.documentId!==document||o.project.value?.revision!==revision)return false;
   if(publication.kind==='resources'&&(!model||!nextResource||!validImageResourceUpdate(model,nextResource)))return false;
   const currentEpoch=o.epoch.value;
   const dirty=new Set(preserve?capture().map(field=>field.key):[]);
   // A newer explicit revert can equal the OLD sample. Its intent generation
   // survives, while untouched fields of a newly created full draft do not.
   const live=preserve?capture(true).filter(field=>{
    const intent=intents.get(field.key),unchanged=intent===before.get(field.key);
    const newer=intent!==undefined&&!unchanged;
    return(dirty.has(field.key)||newer)&&!(epoch===currentEpoch&&revision===o.project.value?.revision&&consume.has(field.key)&&unchanged);
   }):[];
   const retainedIntents=new Map(live.flatMap(field=>{const intent=intents.get(field.key);return intent===undefined?[]:[[field.key,intent] as const];}));
   publishing=true;
   try{
    publish();
    const sameDocument=publication.kind==='resources'?logicalDocumentKey(o.project.value)===logical&&o.project.value?.documentId===nextResource?.documentId:o.project.value?.documentId===document;
    if(sameDocument&&o.epoch.value===currentEpoch){for(const field of live)field.restore();intents=retainedIntents;}
    else intents=new Map();
   }finally{publishing=false;seen=new Map(capture(true).map(field=>[field.key,field.value]));}
   return true;
  };
 }
 function prepareAnimationDraftCommit(edit:RigEdit){return preparePublication({kind:'edit',edit});}
 function prepareAnimationSave(){return preparePublication({kind:'save'});}
 function prepareAnimationResourceUpdate(){const commit=preparePublication({kind:'resources'});return(next:ProjectSummary,publish:()=>void)=>commit(publish,next);}
 return{prepareAnimationDraftCommit,prepareAnimationSave,prepareAnimationResourceUpdate};
}
