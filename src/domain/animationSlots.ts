import {bezierValue,type AnimationCurve} from './animation.ts';
import type {SlotView} from './project.ts';

export type Rgba=[number,number,number,number];
export type SlotBezierControls=[Rgba,Rgba,Rgba,Rgba];
export type SlotAnimationChannel='attachment'|'rgba';
export interface SlotAttachmentKey {id:number;frame:number;attachment:number|null}
export interface SlotRgbaKey {id:number;frame:number;values:Rgba;curve:AnimationCurve;controls?:SlotBezierControls|null}
export type SlotAnimationTrack={slot:number;channel:'attachment';keys:SlotAttachmentKey[]}|{slot:number;channel:'rgba';keys:SlotRgbaKey[]};
export type SlotAnimationKeyInput={slot:number;channel:'attachment';frame:number;attachment:number|null;keyId?:number}|{slot:number;channel:'rgba';frame:number;values:Rgba;curve:AnimationCurve;controls?:SlotBezierControls|null;keyId?:number};
export interface SlotAnimationPose {slot:number;attachment:number|null;color:Rgba}
export interface SlotAnimationDraft {attachment?:number|null;color?:Rgba}

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
/** Working slot state follows keyed activation and light color, never inventory. */
export function sampleSlotPoses(slots:readonly SlotView[],tracks:readonly SlotAnimationTrack[],frame:number,drafts:ReadonlyMap<number,SlotAnimationDraft>=new Map()):SlotAnimationPose[]{
 const poses=slots.map(slot=>({slot:slot.id,attachment:slot.activeAttachmentId===undefined?(slot.visible?slot.attachments?.[0]?.id??null:null):slot.activeAttachmentId,color:unpackRgba(slot.color??0xffffffff)}));
 const byId=new Map(poses.map(pose=>[pose.slot,pose]));
 for(const track of tracks){
  const pose=byId.get(track.slot);if(!pose)continue;
  if(track.channel==='rgba'){const color=sampleSlotRgba(track.keys,frame);if(color)pose.color=color;}
  else for(const key of track.keys){if(Math.fround(key.frame)>frame)break;pose.attachment=key.attachment;}
 }
 for(const [slot,draft]of drafts){const pose=byId.get(slot);if(!pose)continue;if(draft.attachment!==undefined)pose.attachment=draft.attachment;if(draft.color)pose.color=[...draft.color];}
 return poses;
}
/** Rebuild flattened geometry together with the pointer; never leave stale art. */
export function projectSlotPoses(slots:readonly SlotView[],poses:readonly SlotAnimationPose[]):SlotView[]{
 const byId=new Map(poses.map(pose=>[pose.slot,pose]));
 return slots.map(slot=>{
  const pose=byId.get(slot.id);if(!pose)return slot;
  const attachment=pose.attachment===null?null:slot.attachments?.find(a=>a.id===pose.attachment);
  if(pose.attachment!==null&&!attachment)throw new Error('An animation refers to an unavailable slot attachment.');
  return {...slot,color:packRgba(pose.color),animatedColor:[...pose.color],activeAttachmentId:pose.attachment,visible:attachment!==null,region:attachment?.region??null,mesh:attachment?.mesh??null,imageAvailable:attachment?.imageAvailable??false};
 });
}
