import type {BoneView} from './project.ts';
import type {SlotAnimationTrack} from './animationSlots.ts';
import type {DeformTrack,DrawOrderKey} from './animationGeometry.ts';
import type {ConstraintAnimationTrack} from './animationConstraints.ts';
import type {EventTrack} from './animationEvents.ts';
import type {SequenceTrack} from './animationSequence.ts';

/** Shared transform controls keep four families; stored tracks may split axes. */
export type AnimationFamily='rotate'|'translate'|'scale'|'shear';
export type AnimationChannel=AnimationFamily|'translateX'|'translateY'|'scaleX'|'scaleY';
export const animationFamilies:readonly AnimationFamily[]=['rotate','translate','scale','shear'];
export function animationChannelDimensions(channel:AnimationChannel):1|2{return channel==='translate'||channel==='scale'||channel==='shear'?2:1;}
export function animationChannelFamily(channel:AnimationChannel):AnimationFamily{
  if(channel==='translateX'||channel==='translateY')return 'translate';
  if(channel==='scaleX'||channel==='scaleY')return 'scale';
  return channel;
}
/** Native validation requires split Translate X, with optional Y; split Scale
 * retains both axes. X selects the existing family even when Y has no keys.
 * This helper exposes the empty Y row without authoring a track/configuration. */
export function animationFamilyChannels(stored:readonly AnimationChannel[],family:AnimationFamily):AnimationChannel[]{
  if(family==='translate'&&stored.some(channel=>channel==='translateX'||channel==='translateY'))return ['translateX','translateY'];
  if(family==='scale'&&stored.some(channel=>channel==='scaleX'||channel==='scaleY'))return ['scaleX','scaleY'];
  return [family];
}
export function animationBoneChannels(animation:AnimationView|null,bone:number):AnimationChannel[]{
  const stored=animation?.tracks.filter(track=>track.bone===bone).map(track=>track.channel)??[];
  return animationFamilies.flatMap(family=>animationFamilyChannels(stored,family));
}
export type AnimationCurve='linear'|'stepped'|'bezier';
export type BezierControls=[[number,number,number,number],[number,number,number,number]];
export interface AnimationKey {id:number;frame:number;values:[number,number];curve:AnimationCurve;controls?:BezierControls|null}
export interface AnimationTrack {bone:number;channel:AnimationChannel;keys:AnimationKey[]}
export interface AnimationView {id:number;name:string;duration:number;tracks:AnimationTrack[];splitModes?:{bone:number;mode:1|2}[];slotTracks?:SlotAnimationTrack[];drawOrder?:DrawOrderKey[];deformTracks?:DeformTrack[];constraintTracks?:ConstraintAnimationTrack[];eventTracks?:EventTrack[];sequenceTracks?:SequenceTrack[]}
export interface AnimationKeyInput {bone:number;channel:AnimationChannel;frame:number;values:[number,number];curve:AnimationCurve;controls?:BezierControls|null;keyId?:number}
/** Wire frame addresses are f32 even when a caller computed the same time in f64. */
export function sameAnimationFrame(a:number,b:number):boolean{return Math.fround(a)===Math.fround(b);}

/** Finite f32 as an exact signed integer in units of 2^-149. Used only for a
 * crossed control polygon outside the old sufficient interval rule. */
function f32TimeUnits(value:number):bigint{
 const view=new DataView(new ArrayBuffer(4));view.setFloat32(0,value);
 const bits=view.getUint32(0),exponent=(bits>>>23)&255;
 const magnitude=BigInt((bits&0x7fffff)|(exponent?0x800000:0))<<BigInt(exponent?exponent-1:0);
 return bits>>>31?-magnitude:magnitude;
}
/** Exact analytic monotonicity test on recovered f32 fields. Finite precision
 * subtraction/products can hide a subnormal negative derivative near equality;
 * exact dyadic products decide the extended case without an epsilon. Endpoint
 * extent makes inversion unique even at an isolated stationary point. */
export function bezierTimeMonotone(first:number,last:number,outgoing:number,incoming:number):boolean{
 const [x0,x3,x1,x2]=[first,last,outgoing,incoming].map(Math.fround) as [number,number,number,number];
 if(![x0,x1,x2,x3].every(Number.isFinite)||x3<=x0||x1<x0||x2>x3)return false;
 if(x2>=x1||x1<=x3&&x2>=x0)return true;
 const a=f32TimeUnits(x1)-f32TimeUnits(x0),c=f32TimeUnits(x3)-f32TimeUnits(x2),d=f32TimeUnits(x1)-f32TimeUnits(x2);
 return d*d<=a*c;
}

const cubic=(a:number,b:number,c:number,d:number,t:number)=>{const s=1-t;return s*s*s*a+3*s*s*t*b+3*s*t*t*c+t*t*t*d;};
/** Invert the stored absolute frame coordinate, then evaluate its value. */
export function bezierValue(frame:number,first:number,last:number,start:number,end:number,controls:readonly number[]):number{
  let low=0,high=1;
  for(let i=0;i<48;i++){const t=(low+high)/2;if(cubic(first,controls[0]!,controls[2]!,last,t)<frame)low=t;else high=t;}
  return cubic(start,controls[1]!,controls[3]!,end,(low+high)/2);
}

/** The accepted editor profile stores frame numbers, not runtime JSON seconds.
 * This sampler is only the transient viewport projection of native-owned keys.
 * Before the first key, the channel retains its Setup value. */
export function sampleTrack(track:AnimationTrack,frame:number):[number,number]|null{
  if(!Number.isFinite(frame)||!track.keys.length||frame<Math.fround(track.keys[0]!.frame))return null;
  let left=track.keys[0]!;
  for(let i=1;i<track.keys.length;i++){
    const right=track.keys[i]!;
    const first=Math.fround(left.frame),last=Math.fround(right.frame);
    if(frame<last){
      if(frame===first)return left.values.map(Math.fround) as [number,number];
      if(left.curve==='stepped')return left.values.map(Math.fround) as [number,number];
      if(left.curve==='bezier'){
        if(!left.controls)throw new Error('Bézier key controls are missing.');
        return [0,1].map(axis=>axis>=animationChannelDimensions(track.channel)?0:bezierValue(frame,first,last,Math.fround(left.values[axis]!),Math.fround(right.values[axis]!),left.controls![axis]!.map(Math.fround))) as [number,number];
      }
      const mix=(frame-first)/(last-first);
      return [0,1].map(axis=>Math.fround(left.values[axis]!)+(Math.fround(right.values[axis]!)-Math.fround(left.values[axis]!))*mix) as [number,number];
    }
    left=right;
  }
  return left.values.map(Math.fround) as [number,number];
}

export function sampleAnimation(bones:readonly BoneView[],animation:AnimationView|null,frame:number):BoneView[]{
  const result=bones.map(({evaluatedWorld:_,...bone})=>({...bone}));
  if(!animation)return result;
  const byId=new Map(result.map(bone=>[bone.id,bone]));
  for(const track of animation.tracks){
    const bone=byId.get(track.bone),value=sampleTrack(track,frame);
    if(!bone||!value)continue;
    if(track.channel==='translate'){bone.x+=value[0];bone.y+=value[1];}
    else if(track.channel==='translateX')bone.x+=value[0];
    else if(track.channel==='translateY')bone.y+=value[0];
    else if(track.channel==='rotate')bone.rotation+=value[0];
    else if(track.channel==='scale'){bone.scaleX=(bone.scaleX??1)*value[0];bone.scaleY=(bone.scaleY??1)*value[1];}
    else if(track.channel==='scaleX')bone.scaleX=(bone.scaleX??1)*value[0];
    else if(track.channel==='scaleY')bone.scaleY=(bone.scaleY??1)*value[0];
    else if(track.channel==='shear'){bone.shearX=(bone.shearX??0)+value[0];bone.shearY=(bone.shearY??0)+value[1];}
  }
  return result;
}

/** Stored key values are relative to Setup; scale uses a multiplicative basis. */
export function keyValues(setup:BoneView,posed:BoneView,channel:AnimationChannel):[number,number]{
  if(channel==='translate')return [posed.x-setup.x,posed.y-setup.y];
  if(channel==='translateX')return [posed.x-setup.x,0];
  if(channel==='translateY')return [posed.y-setup.y,0];
  if(channel==='rotate')return [posed.rotation-setup.rotation,0];
  if(channel==='shear')return [(posed.shearX??0)-(setup.shearX??0),(posed.shearY??0)-(setup.shearY??0)];
  const x=setup.scaleX??1,y=setup.scaleY??1;
  if(channel==='scaleX'){if(x===0)throw new Error('A zero Setup scale on X cannot produce a relative X scale key.');return [(posed.scaleX??1)/x,0];}
  if(channel==='scaleY'){if(y===0)throw new Error('A zero Setup scale on Y cannot produce a relative Y scale key.');return [(posed.scaleY??1)/y,0];}
  if(x===0||y===0)throw new Error('A zero Setup scale cannot produce a relative scale key.');
  return [(posed.scaleX??1)/x,(posed.scaleY??1)/y];
}
