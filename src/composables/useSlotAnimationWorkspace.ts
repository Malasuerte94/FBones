import {computed,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {sameAnimationFrame,type AnimationView,type AnimationCurve} from '../domain/animation.ts';
import {sampleSlotPoses,projectSlotPoses,unpackRgba,type Rgba,type SlotAnimationDraft,type SlotAnimationKeyInput,type SlotAnimationChannel,type SlotBezierControls} from '../domain/animationSlots.ts';
import type {ProjectSummary,RigEdit} from '../domain/project.ts';

interface Options {
 project:ShallowRef<ProjectSummary|null>;active:Readonly<Ref<AnimationView|null>>;
 frame:Ref<number>;mode:Ref<'setup'|'animate'>;autoKey:Ref<boolean>;
 edit:(edit:RigEdit)=>Promise<boolean>;pause:()=>void;
}
export function shiftSlotAnimationKey(key:SlotAnimationKeyInput,delta:number,storedSource=false):SlotAnimationKeyInput {
 const frame=(value:number)=>storedSource?Math.fround(value):value;
 return key.channel==='attachment'?{...key,frame:frame(key.frame)+delta}:{...key,frame:frame(key.frame)+delta,...(key.controls?{controls:key.controls.map(axis=>[frame(axis[0])+delta,axis[1],frame(axis[2])+delta,axis[3]]) as SlotBezierControls}:{})};
}
export function useSlotAnimationWorkspace(o:Options){
 const slotAnimationDraft=shallowRef<ReadonlyMap<number,SlotAnimationDraft>>(new Map());
 const slotAnimationPose=computed(()=>sampleSlotPoses(o.project.value?.slots??[],o.active.value?.slotTracks??[],o.frame.value,slotAnimationDraft.value));
 const slotAnimationSlots=computed(()=>o.project.value?.sceneEditing?projectSlotPoses(o.project.value.slots??[],slotAnimationPose.value):o.project.value?.slots??[]);
 const animationSlotTracks=computed(()=>o.active.value?.slotTracks?.map(track=>track.channel==='attachment'?{id:`slot:${track.slot}:attachment`,slotId:track.slot,channel:track.channel,keys:track.keys.map(key=>({...key,values:[],interpolation:'stepped' as const}))}:{id:`slot:${track.slot}:rgba`,slotId:track.slot,channel:track.channel,keys:track.keys.map(key=>({...key,interpolation:key.curve}))})??[]);
 function clearSlotAnimationDraft(){if(slotAnimationDraft.value.size)slotAnimationDraft.value=new Map();}
 function animationSlotColor(slotId:number):Rgba{return [...(slotAnimationPose.value.find(p=>p.slot===slotId)?.color??unpackRgba(o.project.value?.slots?.find(s=>s.id===slotId)?.color??0xffffffff))];}
 function validColor(value:readonly number[]):Rgba {
  if(value.length!==4||value.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Use four finite RGBA values between 0 and 1.');
  return [...value] as Rgba;
 }
 function current(){if(o.mode.value!=='animate'||!o.active.value)throw new Error('Create or select an animation first.');return o.active.value;}
 function keyInput(slotId:number,channel:SlotAnimationChannel,color?:Rgba,attachment?:number|null):SlotAnimationKeyInput {
  const clip=current(),slot=o.project.value?.slots?.find(s=>s.id===slotId),pose=slotAnimationPose.value.find(s=>s.slot===slotId);
  if(!slot||!pose)throw new Error('Select an existing slot.');
  if(channel==='attachment'){
   const target=attachment===undefined?pose.attachment:attachment;
   if(target!==null&&!slot.attachments?.some(a=>a.id===target))throw new Error('The attachment must belong to this slot.');
   return {slot:slotId,channel,frame:o.frame.value,attachment:target};
  }
  const track=clip.slotTracks?.find(t=>t.slot===slotId&&t.channel==='rgba');
  const existing=track?.channel==='rgba'?track.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,o.frame.value)):undefined;
  return {slot:slotId,channel,frame:o.frame.value,values:validColor(color??pose.color),curve:existing?.curve??'linear',...(existing?.controls?{controls:existing.controls}:{})};
 }
 function slotAnimationEdit(edit:RigEdit):RigEdit|null {
  o.pause();const clip=current();
  const key=edit.type==='setActiveAttachment'?keyInput(edit.slot,'attachment',undefined,edit.attachment):edit.type==='setSlotColor'?keyInput(edit.id,'rgba',unpackRgba(edit.color)):null;
  if(!key)throw new Error('This edit is not an animated slot property.');
  if(!o.autoKey.value){const next=new Map(slotAnimationDraft.value),old=next.get(key.slot)??{};next.set(key.slot,key.channel==='attachment'?{...old,attachment:key.attachment}:{...old,color:[...key.values]});slotAnimationDraft.value=next;return null;}
  return {type:'setAnimationSlotKeys',animation:clip.id,keys:[key]};
 }
 async function setSlotAnimationColor(slotId:number,values:Rgba):Promise<boolean>{
  o.pause();const clip=current(),key=keyInput(slotId,'rgba',values);
  if(key.channel!=='rgba')return false;
  if(!o.autoKey.value){const next=new Map(slotAnimationDraft.value);next.set(slotId,{...next.get(slotId),color:[...key.values]});slotAnimationDraft.value=next;return true;}
  return o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[key]});
 }
 async function insertSlotAnimationKeys(change:{slotId:number;channel:SlotAnimationChannel}){
  o.pause();const clip=current();
  if(await o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[keyInput(change.slotId,change.channel)]}))clearSlotAnimationDraft();
 }
 function slotKeysForIds(ids:readonly number[]):SlotAnimationKeyInput[]{
  const keys:SlotAnimationKeyInput[]=[];
  for(const track of o.active.value?.slotTracks??[]){
   if(track.channel==='attachment')for(const key of track.keys){if(ids.includes(key.id))keys.push({slot:track.slot,channel:track.channel,keyId:key.id,frame:key.frame,attachment:key.attachment});}
   else for(const key of track.keys){if(ids.includes(key.id))keys.push({slot:track.slot,channel:track.channel,keyId:key.id,frame:key.frame,values:[...key.values],curve:key.curve,...(key.controls?{controls:structuredClone(key.controls)}:{})});}
  }
  return keys;
 }
 async function updateSlotAnimationKey(change:{id:number;attachment?:number|null;values?:number[]}){
  const clip=current(),key=slotKeysForIds([change.id])[0];if(!key)return;
  if(key.channel==='attachment'){if(change.attachment===undefined)return;key.attachment=change.attachment;}
  else{if(!change.values)return;key.values=validColor(change.values);}
  await o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[key]});
 }
 function slotInterpolationKeys(ids:readonly number[],curve:AnimationCurve):SlotAnimationKeyInput[]{
  const keys:SlotAnimationKeyInput[]=[];
  for(const track of o.active.value?.slotTracks??[]){if(track.channel!=='rgba')continue;
   for(const key of track.keys){if(!ids.includes(key.id))continue;const next=track.keys.find(k=>k.frame>key.frame);if(curve==='bezier'&&!next)continue;
    const span=(next?.frame??key.frame+1)-key.frame;
    const controls=key.values.map((value,axis)=>[key.frame+span/3,value+((next?.values[axis]??value)-value)/3,key.frame+span*2/3,value+((next?.values[axis]??value)-value)*2/3]) as SlotBezierControls;
    keys.push({slot:track.slot,channel:'rgba',keyId:key.id,frame:key.frame,values:[...key.values],curve,...(curve==='bezier'?{controls:key.controls??controls}:{})});
   }
  }
  return keys;
 }
 function slotBezierInput(change:{id:number;component:number;control:0|1;frame:number;value:number}):SlotAnimationKeyInput|null {
  if(!Number.isInteger(change.component)||change.component<0||change.component>3)return null;
  for(const track of o.active.value?.slotTracks??[]){if(track.channel!=='rgba')continue;const index=track.keys.findIndex(key=>key.id===change.id),key=track.keys[index],next=track.keys[index+1];if(!key?.controls||!next)continue;
   const controls=structuredClone(key.controls),axis=controls[change.component]!,offset=change.control*2;axis[offset]=Math.max(key.frame,Math.min(next.frame,change.frame));axis[offset+1]=change.value;
   return {slot:track.slot,channel:'rgba',keyId:key.id,frame:key.frame,values:[...key.values],curve:'bezier',controls};
  }
  return null;
 }
 watch(()=>[o.project.value?.documentId,o.project.value?.animations,o.active.value?.id,o.frame.value,o.mode.value],clearSlotAnimationDraft,{flush:'sync'});
 return {slotAnimationDraft,slotAnimationPose,slotAnimationSlots,animationSlotTracks,clearSlotAnimationDraft,animationSlotColor,setSlotAnimationColor,insertSlotAnimationKeys,slotAnimationEdit,slotKeysForIds,updateSlotAnimationKey,slotInterpolationKeys,slotBezierInput};
}
