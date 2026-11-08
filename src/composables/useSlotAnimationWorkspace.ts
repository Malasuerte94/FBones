import {computed,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {sameAnimationFrame,type AnimationView,type AnimationCurve} from '../domain/animation.ts';
import {sampleSlotPoses,projectSlotPoses,unpackRgba,type Rgba,type Rgb,type DarkBezierControls,type SlotAnimationDraft,type SlotAnimationKeyInput,type SlotAnimationChannel,type SlotBezierControls} from '../domain/animationSlots.ts';
import type {ProjectSummary,RigEdit} from '../domain/project.ts';

interface Options {
 project:ShallowRef<ProjectSummary|null>;active:Readonly<Ref<AnimationView|null>>;
 frame:Ref<number>;mode:Ref<'setup'|'animate'>;autoKey:Ref<boolean>;
 edit:(edit:RigEdit)=>Promise<boolean>;pause:()=>void;
}
export function shiftSlotAnimationKey(key:SlotAnimationKeyInput,delta:number,storedSource=false):SlotAnimationKeyInput {
 const frame=(value:number)=>storedSource?Math.fround(value):value;
 return key.channel==='attachment'?{...key,frame:frame(key.frame)+delta}:{...key,frame:frame(key.frame)+delta,...(key.controls?{controls:key.controls.map(axis=>[frame(axis[0])+delta,axis[1],frame(axis[2])+delta,axis[3]]) as SlotBezierControls}:{}),...(key.darkControls?{darkControls:key.darkControls.map(axis=>[frame(axis[0])+delta,axis[1],frame(axis[2])+delta,axis[3]]) as DarkBezierControls}:{})};
}
export function useSlotAnimationWorkspace(o:Options){
 const slotAnimationDraft=shallowRef<ReadonlyMap<number,SlotAnimationDraft>>(new Map());
 const slotAnimationPose=computed(()=>sampleSlotPoses(o.project.value?.slots??[],o.active.value?.slotTracks??[],o.frame.value,slotAnimationDraft.value));
 const slotAnimationSlots=computed(()=>o.project.value?.sceneEditing?projectSlotPoses(o.project.value.slots??[],slotAnimationPose.value):o.project.value?.slots??[]);
 const animationSlotTracks=computed(()=>o.active.value?.slotTracks?.map(track=>{
  if(track.channel==='attachment')return{id:`slot:${track.slot}:attachment`,slotId:track.slot,channel:track.channel,keys:track.keys.map(key=>({...key,values:[],interpolation:'stepped' as const}))};
  const enabled=o.project.value?.slots?.find(s=>s.id===track.slot)?.tintBlack;
  return{id:`slot:${track.slot}:rgba`,slotId:track.slot,channel:track.channel,keys:track.keys.map(key=>({...key,values:enabled?[...key.values,...(key.darkValues??[0,0,0])]:key.values,...(enabled&&key.controls&&key.darkControls?{controls:[...key.controls,...key.darkControls]}:{}),interpolation:key.curve}))};
 })??[]);
 function clearSlotAnimationDraft(){if(slotAnimationDraft.value.size)slotAnimationDraft.value=new Map();}
 function animationSlotColor(slotId:number):Rgba{return [...(slotAnimationPose.value.find(p=>p.slot===slotId)?.color??unpackRgba(o.project.value?.slots?.find(s=>s.id===slotId)?.color??0xffffffff))];}
 function animationSlotDarkColor(slotId:number):Rgb{return [...(slotAnimationPose.value.find(p=>p.slot===slotId)?.dark??unpackRgba(o.project.value?.slots?.find(s=>s.id===slotId)?.darkColor??0xff).slice(0,3))] as Rgb;}
 function validColor(value:readonly number[]):Rgba {
  if(value.length!==4||value.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Use four finite RGBA values between 0 and 1.');
  return [...value] as Rgba;
 }
 function validDark(value:readonly number[]):Rgb{
  if(value.length!==3||value.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Use three finite dark RGB values between 0 and 1.');
  return [...value] as Rgb;
 }
 function current(){if(o.mode.value!=='animate'||!o.active.value)throw new Error('Create or select an animation first.');return o.active.value;}
 function keyInput(slotId:number,channel:SlotAnimationChannel,color?:Rgba,attachment?:number|null,dark?:Rgb):SlotAnimationKeyInput {
  const clip=current(),slot=o.project.value?.slots?.find(s=>s.id===slotId),pose=slotAnimationPose.value.find(s=>s.slot===slotId);
  if(!slot||!pose)throw new Error('Select an existing slot.');
  if(channel==='attachment'){
   const target=attachment===undefined?pose.attachment:attachment;
   if(target!==null&&!slot.attachments?.some(a=>a.id===target))throw new Error('The attachment must belong to this slot.');
   return {slot:slotId,channel,frame:o.frame.value,attachment:target};
  }
  const track=clip.slotTracks?.find(t=>t.slot===slotId&&t.channel==='rgba');
  const existing=track?.channel==='rgba'?track.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,o.frame.value)):undefined;
  return {slot:slotId,channel,frame:o.frame.value,values:validColor(color??pose.color),...(dark!==undefined||pose.dark!==undefined||existing?.darkValues!==undefined?{darkValues:validDark(dark??pose.dark??[0,0,0])}:{}),curve:existing?.curve??'linear',...(existing?.controls?{controls:existing.controls}:{}),...(existing?.darkControls?{darkControls:existing.darkControls}:{})};
 }
 function slotAnimationEdit(edit:RigEdit):RigEdit|null {
  o.pause();const clip=current();
  if(edit.type==='setSlotDarkColor'){
   const slot=o.project.value?.slots?.find(s=>s.id===edit.id);
   if(!slot?.tintBlack||edit.enabled!==slot.tintBlack)throw new Error('Switch to Setup to enable or disable Tint Black.');
   if((edit.color&255)!==255)throw new Error('Dark color stores RGB with metadata alpha 255.');
  }
  const key=edit.type==='setActiveAttachment'?keyInput(edit.slot,'attachment',undefined,edit.attachment):edit.type==='setSlotColor'?keyInput(edit.id,'rgba',unpackRgba(edit.color)):edit.type==='setSlotDarkColor'?keyInput(edit.id,'rgba',undefined,undefined,unpackRgba(edit.color).slice(0,3) as Rgb):null;
  if(!key)throw new Error('This edit is not an animated slot property.');
  if(!o.autoKey.value){const next=new Map(slotAnimationDraft.value),old=next.get(key.slot)??{};next.set(key.slot,key.channel==='attachment'?{...old,attachment:key.attachment}:edit.type==='setSlotDarkColor'?{...old,dark:[...key.darkValues!]}:{...old,color:[...key.values]});slotAnimationDraft.value=next;return null;}
  return {type:'setAnimationSlotKeys',animation:clip.id,keys:[key]};
 }
 async function setSlotAnimationColor(slotId:number,values:Rgba):Promise<boolean>{
  o.pause();const clip=current(),key=keyInput(slotId,'rgba',values);
  if(key.channel!=='rgba')return false;
  if(!o.autoKey.value){const next=new Map(slotAnimationDraft.value);next.set(slotId,{...next.get(slotId),color:[...key.values]});slotAnimationDraft.value=next;return true;}
  return o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[key]});
 }
 async function setSlotAnimationDarkColor(slotId:number,values:Rgb):Promise<boolean>{
  o.pause();const clip=current();if(!o.project.value?.slots?.find(s=>s.id===slotId)?.tintBlack)throw new Error('Enable Tint Black in Setup before editing its animated RGB.');
  const key=keyInput(slotId,'rgba',undefined,undefined,validDark(values));if(key.channel!=='rgba')return false;
  if(!o.autoKey.value){slotAnimationDraft.value=new Map(slotAnimationDraft.value).set(slotId,{...slotAnimationDraft.value.get(slotId),dark:[...key.darkValues!]});return true;}
  return o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[key]});
 }
 async function insertSlotAnimationKeys(change:{slotId:number;channel:SlotAnimationChannel}){
  o.pause();const clip=current();
  await o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[keyInput(change.slotId,change.channel)]});
 }
 function slotKeysForIds(ids:readonly number[]):SlotAnimationKeyInput[]{
  const keys:SlotAnimationKeyInput[]=[];
  for(const track of o.active.value?.slotTracks??[]){
   if(track.channel==='attachment')for(const key of track.keys){if(ids.includes(key.id))keys.push({slot:track.slot,channel:track.channel,keyId:key.id,frame:key.frame,attachment:key.attachment});}
   else for(const key of track.keys){if(ids.includes(key.id))keys.push({slot:track.slot,channel:track.channel,keyId:key.id,frame:key.frame,values:[...key.values],...(key.darkValues?{darkValues:[...key.darkValues] as Rgb}:{}),curve:key.curve,...(key.controls?{controls:structuredClone(key.controls)}:{}),...(key.darkControls?{darkControls:structuredClone(key.darkControls)}:{})});}
  }
  return keys;
 }
 async function updateSlotAnimationKey(change:{id:number;attachment?:number|null;values?:number[]}){
  const clip=current(),key=slotKeysForIds([change.id])[0];if(!key)return;
  if(key.channel==='attachment'){if(change.attachment===undefined)return;key.attachment=change.attachment;}
  else{if(!change.values)return;if(change.values.length!==4&&change.values.length!==7)throw new Error('Use light RGBA or joint light RGBA and dark RGB values.');key.values=validColor(change.values.slice(0,4));if(change.values.length===7)key.darkValues=validDark(change.values.slice(4));}
  await o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[key]});
 }
 function slotInterpolationKeys(ids:readonly number[],curve:AnimationCurve):SlotAnimationKeyInput[]{
  const keys:SlotAnimationKeyInput[]=[];
  for(const track of o.active.value?.slotTracks??[]){if(track.channel!=='rgba')continue;
   if(o.project.value?.slots?.find(s=>s.id===track.slot)?.tintBlack&&curve!=='linear'&&track.keys.some(k=>ids.includes(k.id)))throw new Error('Two-color keys currently support linear interpolation.');
   for(const key of track.keys){if(!ids.includes(key.id))continue;const next=track.keys.find(k=>k.frame>key.frame);if(curve==='bezier'&&!next)continue;
    const span=(next?.frame??key.frame+1)-key.frame;
    const controls=key.values.map((value,axis)=>[key.frame+span/3,value+((next?.values[axis]??value)-value)/3,key.frame+span*2/3,value+((next?.values[axis]??value)-value)*2/3]) as SlotBezierControls;
    keys.push({slot:track.slot,channel:'rgba',keyId:key.id,frame:key.frame,values:[...key.values],...(key.darkValues?{darkValues:[...key.darkValues] as Rgb}:{}),curve,...(curve==='bezier'?{controls:key.controls??controls,...(key.darkControls?{darkControls:structuredClone(key.darkControls)}:{})}:{})});
   }
  }
  return keys;
 }
 function slotBezierInput(change:{id:number;component:number;control:0|1;frame:number;value:number}):SlotAnimationKeyInput|null {
  if(!Number.isInteger(change.component)||change.component<0||change.component>3)return null;
  for(const track of o.active.value?.slotTracks??[]){if(track.channel!=='rgba')continue;const index=track.keys.findIndex(key=>key.id===change.id),key=track.keys[index],next=track.keys[index+1];if(!key?.controls||!next)continue;
   const controls=structuredClone(key.controls),axis=controls[change.component]!,offset=change.control*2;axis[offset]=Math.max(key.frame,Math.min(next.frame,change.frame));axis[offset+1]=change.value;
   return {slot:track.slot,channel:'rgba',keyId:key.id,frame:key.frame,values:[...key.values],...(key.darkValues?{darkValues:[...key.darkValues] as Rgb}:{}),curve:'bezier',controls,...(key.darkControls?{darkControls:structuredClone(key.darkControls)}:{})};
  }
  return null;
 }
 watch(()=>[o.project.value?.documentId,o.project.value?.animations,o.active.value?.id,o.frame.value,o.mode.value],clearSlotAnimationDraft,{flush:'sync'});
 return {slotAnimationDraft,slotAnimationPose,slotAnimationSlots,animationSlotTracks,clearSlotAnimationDraft,animationSlotColor,animationSlotDarkColor,setSlotAnimationColor,setSlotAnimationDarkColor,insertSlotAnimationKeys,slotAnimationEdit,slotKeysForIds,updateSlotAnimationKey,slotInterpolationKeys,slotBezierInput};
}
