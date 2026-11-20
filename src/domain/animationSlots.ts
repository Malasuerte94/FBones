import {bezierValue,type AnimationCurve} from './animation.ts';
import type {SlotView} from './project.ts';

export type Rgba=[number,number,number,number];
export type Rgb=[number,number,number];
type ColorBezierLane=[number,number,number,number];
export type SlotBezierControls=[ColorBezierLane,ColorBezierLane,ColorBezierLane,ColorBezierLane];
export type DarkBezierControls=[ColorBezierLane,ColorBezierLane,ColorBezierLane];
type Rgb2=[...Rgb,...Rgb];
type Rgb2BezierControls=[...DarkBezierControls,...DarkBezierControls];
export type SlotAnimationChannel='attachment'|'rgba';
export interface SlotAttachmentKey {id:number;frame:number;attachment:number|null}
export interface SlotRgbaKey {id:number;frame:number;values:Rgba;darkValues?:Rgb;curve:AnimationCurve;controls?:SlotBezierControls|null;darkControls?:DarkBezierControls|null}
export interface SlotRgb2Key {id:number;frame:number;values:Rgb2;curve:AnimationCurve;controls?:Rgb2BezierControls|null}
export interface SlotAlphaKey {id:number;frame:number;value:number;curve:AnimationCurve;controls?:ColorBezierLane|null}
export type SlotAnimationTrack=
 | {slot:number;channel:'attachment';keys:SlotAttachmentKey[]}
 | {slot:number;channel:'rgba';keys:SlotRgbaKey[]}
 | {slot:number;channel:'rgb2';keys:SlotRgb2Key[]}
 | {slot:number;channel:'alpha';keys:SlotAlphaKey[]};
export interface SlotSplitMode {slot:number;mode:'rgbAlpha'}
export type SlotAnimationKeyInput=
 | {slot:number;channel:'attachment';frame:number;attachment:number|null;keyId?:number}
 | {slot:number;channel:'rgba';frame:number;values:Rgba;darkValues?:Rgb;curve:AnimationCurve;controls?:SlotBezierControls|null;darkControls?:DarkBezierControls|null;keyId?:number;
   /** Explicit signs for four light values followed by sixteen light controls. */
   negativeZeroIndices?:number[]};
export interface SlotAnimationPose {slot:number;attachment:number|null;color:Rgba;dark?:Rgb}
export interface SlotAnimationDraft {attachment?:number|null;color?:Rgba;dark?:Rgb}
/** A split track samples only the color lanes it owns. */
export interface SlotColorSample {light:[number?,number?,number?,number?];dark?:Rgb}

export function hasSplitSlotColor(clip:{slotSplitModes?:readonly SlotSplitMode[];slotTracks?:readonly SlotAnimationTrack[]}|null|undefined,slot:number):boolean {
 return !!clip?.slotSplitModes?.some(mode=>mode.slot===slot)||
  !!clip?.slotTracks?.some(track=>track.slot===slot&&(track.channel==='rgb2'||track.channel==='alpha'));
}

export function unpackRgba(value:number):Rgba{return [(value>>>24)/255,((value>>>16)&255)/255,((value>>>8)&255)/255,(value&255)/255];}
/** The render tint has byte RGB; retain floating alpha separately in the view. */
export function packRgba(value:Rgba):number {const bytes=value.map(v=>Math.round(Math.min(1,Math.max(0,v))*255));return ((bytes[0]!<<24)|(bytes[1]!<<16)|(bytes[2]!<<8)|bytes[3]!)>>>0;}
function sampleColorKeys<Key extends {frame:number;curve:AnimationCurve},Value>(keys:readonly Key[],frame:number,
 authored:(key:Key)=>Value,interpolate:(left:Key,right:Key,first:number,last:number)=>Value):Value|null {
 if(!Number.isFinite(frame)||!keys.length||frame<Math.fround(keys[0]!.frame))return null;
 let left=keys[0]!;
 for(let i=1;i<keys.length;i++){
  const right=keys[i]!;
  const first=Math.fround(left.frame),last=Math.fround(right.frame);
  if(frame<last)return frame===first||left.curve==='stepped'?authored(left):interpolate(left,right,first,last);
  left=right;
 }
 return authored(left);
}
function sampleColorLane(from:number,to:number,frame:number,first:number,last:number,curve:AnimationCurve,controls?:ColorBezierLane|null):number {
 const a=Math.fround(from),b=Math.fround(to);
 if(curve!=='bezier')return a+(b-a)*((frame-first)/(last-first));
 if(!controls)throw new Error('Slot color Bézier controls are missing.');
 return bezierValue(frame,first,last,a,b,controls.map(Math.fround));
}
function sampleColorVector<Values extends Rgba|Rgb2>(
 keys:readonly {frame:number;values:Values;curve:AnimationCurve;controls?:readonly ColorBezierLane[]|null}[],frame:number,
):Values|null {
 return sampleColorKeys(keys,frame,key=>key.values.map(Math.fround) as Values,(left,right,first,last)=>
  left.values.map((value,axis)=>sampleColorLane(value,right.values[axis]!,frame,first,last,left.curve,left.controls?.[axis])) as Values);
}
export function sampleSlotRgba(keys:readonly SlotRgbaKey[],frame:number):Rgba|null {
 return sampleColorVector(keys,frame);
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
export function sampleSlotColorTrack(track:Exclude<SlotAnimationTrack,{channel:'attachment'}>,frame:number,darkEnabled:boolean):SlotColorSample|null {
 if(track.channel==='rgba'){
  const light=sampleSlotRgba(track.keys,frame);
  if(!light)return null;
  const dark=darkEnabled||track.keys.some(key=>key.darkValues!==undefined)?sampleSlotDark(track.keys,frame):null;
  return {light,...(dark?{dark}:{})};
 }
 if(track.channel==='rgb2'){
  const colors=sampleColorVector(track.keys,frame);
  if(!colors)return null;
  const [r,g,b,dr,dg,db]=colors;
  return {light:[r,g,b],dark:[dr,dg,db]};
 }
 const alpha=sampleColorKeys(track.keys,frame,key=>Math.fround(key.value),(left,right,first,last)=>
  sampleColorLane(left.value,right.value,frame,first,last,left.curve,left.controls));
 return alpha===null?null:{light:[undefined,undefined,undefined,alpha]};
}
/** Working slot state follows keyed activation and color,
 * never attachment inventory or Setup enablement. */
export function sampleSlotPoses(slots:readonly SlotView[],tracks:readonly SlotAnimationTrack[],frame:number,drafts:ReadonlyMap<number,SlotAnimationDraft>=new Map()):SlotAnimationPose[]{
 const poses:SlotAnimationPose[]=slots.map(slot=>({slot:slot.id,attachment:slot.activeAttachmentId===undefined?(slot.visible?slot.attachments?.[0]?.id??null:null):slot.activeAttachmentId,color:unpackRgba(slot.color??0xffffffff),...(slot.tintBlack!==undefined||slot.darkColor!==undefined?{dark:slot.tintBlack?unpackRgba(slot.darkColor??0xff).slice(0,3) as Rgb:[0,0,0] as Rgb}:{})}));
 const byId=new Map(poses.map(pose=>[pose.slot,pose]));
 for(const track of tracks){
  const pose=byId.get(track.slot);if(!pose)continue;
  if(track.channel==='attachment'){
   for(const key of track.keys){if(Math.fround(key.frame)>frame)break;pose.attachment=key.attachment;}
  }else{
   const color=sampleSlotColorTrack(track,frame,pose.dark!==undefined);if(!color)continue;
   const [r,g,b,a]=color.light;
   pose.color=[r??pose.color[0],g??pose.color[1],b??pose.color[2],a??pose.color[3]];
   if(color.dark)pose.dark=color.dark;
  }
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
