import type {BoneView} from './project.ts';
import type {SlotAnimationTrack} from './animationSlots.ts';
import type {DeformTrack,DrawOrderKey} from './animationGeometry.ts';
import type {ConstraintAnimationTrack} from './animationConstraints.ts';
import type {EventTrack} from './animationEvents.ts';

export type AnimationChannel='rotate'|'translate'|'scale'|'shear';
export type AnimationCurve='linear'|'stepped'|'bezier';
export type BezierControls=[[number,number,number,number],[number,number,number,number]];
export interface AnimationKey {id:number;frame:number;values:[number,number];curve:AnimationCurve;controls?:BezierControls|null}
export interface AnimationTrack {bone:number;channel:AnimationChannel;keys:AnimationKey[]}
export interface AnimationView {id:number;name:string;duration:number;tracks:AnimationTrack[];slotTracks?:SlotAnimationTrack[];drawOrder?:DrawOrderKey[];deformTracks?:DeformTrack[];constraintTracks?:ConstraintAnimationTrack[];eventTracks?:EventTrack[]}
export interface AnimationKeyInput {bone:number;channel:AnimationChannel;frame:number;values:[number,number];curve:AnimationCurve;controls?:BezierControls|null;keyId?:number}
/** Wire frame addresses are f32 even when a caller computed the same time in f64. */
export function sameAnimationFrame(a:number,b:number):boolean{return Math.fround(a)===Math.fround(b);}

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
        return [0,1].map(axis=>bezierValue(frame,first,last,Math.fround(left.values[axis]!),Math.fround(right.values[axis]!),left.controls![axis]!.map(Math.fround))) as [number,number];
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
    else if(track.channel==='rotate')bone.rotation+=value[0];
    else if(track.channel==='scale'){bone.scaleX=(bone.scaleX??1)*value[0];bone.scaleY=(bone.scaleY??1)*value[1];}
    else{bone.shearX=(bone.shearX??0)+value[0];bone.shearY=(bone.shearY??0)+value[1];}
  }
  return result;
}

/** Stored key values are relative to Setup; scale uses a multiplicative basis. */
export function keyValues(setup:BoneView,posed:BoneView,channel:AnimationChannel):[number,number]{
  if(channel==='translate')return [posed.x-setup.x,posed.y-setup.y];
  if(channel==='rotate')return [posed.rotation-setup.rotation,0];
  if(channel==='shear')return [(posed.shearX??0)-(setup.shearX??0),(posed.shearY??0)-(setup.shearY??0)];
  const x=setup.scaleX??1,y=setup.scaleY??1;
  if(x===0||y===0)throw new Error('A zero Setup scale cannot produce a relative scale key.');
  return [(posed.scaleX??1)/x,(posed.scaleY??1)/y];
}
