import {bezierValue,type AnimationCurve} from './animation.ts';
import type {SlotView} from './project.ts';

export type Rgba=[number,number,number,number];
export type Rgb=[number,number,number];
export type SlotBezierControls=[Rgba,Rgba,Rgba,Rgba];
export type DarkBezierControls=[Rgba,Rgba,Rgba];
export type SlotAnimationChannel='attachment'|'rgba';
export interface SlotAttachmentKey {id:number;frame:number;attachment:number|null}
export interface SlotRgbaKey {id:number;frame:number;values:Rgba;darkValues?:Rgb;curve:AnimationCurve;controls?:SlotBezierControls|null;darkControls?:DarkBezierControls|null}
export type SlotAnimationTrack={slot:number;channel:'attachment';keys:SlotAttachmentKey[]}|{slot:number;channel:'rgba';keys:SlotRgbaKey[]};
export type SlotAnimationKeyInput={slot:number;channel:'attachment';frame:number;attachment:number|null;keyId?:number}|{slot:number;channel:'rgba';frame:number;values:Rgba;darkValues?:Rgb;curve:AnimationCurve;controls?:SlotBezierControls|null;darkControls?:DarkBezierControls|null;keyId?:number};
export interface SlotAnimationPose {slot:number;attachment:number|null;color:Rgba;dark?:Rgb}
export interface SlotAnimationDraft {attachment?:number|null;color?:Rgba;dark?:Rgb}

export function unpackRgba(value:number):Rgba{return [(value>>>24)/255,((value>>>16)&255)/255,((value>>>8)&255)/255,(value&255)/255];}
/** The render tint has byte RGB; retain floating alpha separately in the view. */
export function packRgba(value:Rgba):number {const bytes=value.map(v=>Math.round(Math.min(1,Math.max(0,v))*255));return ((bytes[0]!<<24)|(bytes[1]!<<16)|(bytes[2]!<<8)|bytes[3]!)>>>0;}
export function sampleSlotRgba(keys:readonly SlotRgbaKey[],frame:number):Rgba|null {
 if(!Number.isFinite(frame)||!keys.length||frame<Math.fround(keys[0]!.frame))return null;
 let left=keys[0]!;
 for(let i=1;i<keys.length;i++){
  const right=keys[i]!;
  const first=Math.fround(left.frame),last=Math.fround(right.frame);
  if(frame<last){
   if(frame===first||left.curve==='stepped')return left.values.map(Math.fround) as Rgba;
   if(left.curve==='bezier'){
    if(!left.controls)throw new Error('RGBA Bézier controls are missing.');
    return left.values.map((value,axis)=>bezierValue(frame,first,last,Math.fround(value),Math.fround(right.values[axis]!),left.controls![axis]!.map(Math.fround))) as Rgba;
   }
   const mix=(frame-first)/(last-first);
   return left.values.map((value,axis)=>Math.fround(value)+(Math.fround(right.values[axis]!)-Math.fround(value))*mix) as Rgba;
  }
  left=right;
 }
 return left.values.map(Math.fround) as Rgba;
}
/** The admitted active-dark profile is linear. Disabled legacy light tracks have
 * canonical zero dark lanes; their independent light curves remain unchanged. */
export function sampleSlotDark(keys:readonly SlotRgbaKey[],frame:number):Rgb|null{
 if(!Number.isFinite(frame)||!keys.length||frame<Math.fround(keys[0]!.frame))return null;
 const values=(key:SlotRgbaKey)=>(key.darkValues??[0,0,0]).map(Math.fround) as Rgb;
 let left=keys[0]!;
 for(let i=1;i<keys.length;i++){
  const right=keys[i]!,first=Math.fround(left.frame),last=Math.fround(right.frame);
  if(frame<last){
   const a=values(left),b=values(right);
   if(frame===first)return a;
   if(left.curve!=='linear'){
    if(a.some(v=>v!==0)||b.some(v=>v!==0)||left.darkControls)throw new Error('Curved two-color animation is outside the supported profile.');
    return [0,0,0];
   }
   const mix=(frame-first)/(last-first);return a.map((v,axis)=>v+(b[axis]!-v)*mix) as Rgb;
  }
  left=right;
 }
 return values(left);
}
/** Working slot state follows keyed activation and joint light/dark color,
 * never attachment inventory or Setup enablement. */
export function sampleSlotPoses(slots:readonly SlotView[],tracks:readonly SlotAnimationTrack[],frame:number,drafts:ReadonlyMap<number,SlotAnimationDraft>=new Map()):SlotAnimationPose[]{
 const poses:SlotAnimationPose[]=slots.map(slot=>({slot:slot.id,attachment:slot.activeAttachmentId===undefined?(slot.visible?slot.attachments?.[0]?.id??null:null):slot.activeAttachmentId,color:unpackRgba(slot.color??0xffffffff),...(slot.tintBlack!==undefined||slot.darkColor!==undefined?{dark:slot.tintBlack?unpackRgba(slot.darkColor??0xff).slice(0,3) as Rgb:[0,0,0] as Rgb}:{})}));
 const byId=new Map(poses.map(pose=>[pose.slot,pose]));
 for(const track of tracks){
  const pose=byId.get(track.slot);if(!pose)continue;
  if(track.channel==='rgba'){const color=sampleSlotRgba(track.keys,frame);if(color)pose.color=color;if(pose.dark!==undefined||track.keys.some(k=>k.darkValues!==undefined)){const dark=sampleSlotDark(track.keys,frame);if(dark)pose.dark=dark;}}
  else for(const key of track.keys){if(Math.fround(key.frame)>frame)break;pose.attachment=key.attachment;}
 }
 for(const [slot,draft]of drafts){const pose=byId.get(slot);if(!pose)continue;if(draft.attachment!==undefined)pose.attachment=draft.attachment;if(draft.color)pose.color=[...draft.color];if(draft.dark)pose.dark=[...draft.dark];}
 return poses;
}
/** Rebuild flattened geometry together with the pointer; never leave stale art. */
export function projectSlotPoses(slots:readonly SlotView[],poses:readonly SlotAnimationPose[]):SlotView[]{
 const byId=new Map(poses.map(pose=>[pose.slot,pose]));
 return slots.map(slot=>{
  const pose=byId.get(slot.id);if(!pose)return slot;
  const attachment=pose.attachment===null?null:slot.attachments?.find(a=>a.id===pose.attachment);
  if(pose.attachment!==null&&!attachment)throw new Error('An animation refers to an unavailable slot attachment.');
  return {...slot,color:packRgba(pose.color),animatedColor:[...pose.color],...(pose.dark?{animatedDarkColor:[...pose.dark] as Rgb}:{}),activeAttachmentId:pose.attachment,visible:attachment!==null,region:attachment?.region??null,mesh:attachment?.mesh??null,imageAvailable:attachment?.imageAvailable??false};
 });
}
