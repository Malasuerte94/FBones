import {bezierValue,type AnimationCurve} from './animation.ts';
import type {ConstraintView,TransformChannels} from './project.ts';

export const physicsProperties=['inertia','strength','damping','mass','wind','gravity','mix'] as const;
export type PhysicsProperty=typeof physicsProperties[number];
export type ScalarControls=[number,number,number,number];
export type IkControls=[ScalarControls,ScalarControls];
export type TransformMixControls=[ScalarControls,ScalarControls,ScalarControls,ScalarControls,ScalarControls,ScalarControls];
interface Key {id:number;frame:number}
export interface IkAnimationKey extends Key {mix:number;softness:number;stretch:boolean;compress:boolean;bendPositive:boolean;curve:AnimationCurve;controls?:IkControls|null}
export interface TransformMixKey extends Key {values:TransformChannels;curve:AnimationCurve;controls?:TransformMixControls|null}
export interface PhysicsAnimationKey extends Key {value:number;curve:AnimationCurve;controls?:ScalarControls|null}
export interface PhysicsResetKey extends Key {}
export type ConstraintAnimationTrack=
 | {channel:'ik';constraint:number;keys:IkAnimationKey[]}
 | {channel:'transformMix';constraint:number;keys:TransformMixKey[]}
 | {channel:'physics';constraint:number;property:PhysicsProperty;keys:PhysicsAnimationKey[]}
 | {channel:'physicsReset';constraint:number;keys:PhysicsResetKey[]};
type Input<K extends Key>=Omit<K,'id'>&{keyId?:number};
interface NumericBits {valueBits?:number[];controlsBits?:number[]|number[][]}
export type ConstraintKeyInput=
 | ({channel:'ik';constraint:number}&Input<IkAnimationKey>&NumericBits)
 | ({channel:'transformMix';constraint:number}&Input<TransformMixKey>&NumericBits)
 | ({channel:'physics';constraint:number;property:PhysicsProperty}&Input<PhysicsAnimationKey>&NumericBits)
 | ({channel:'physicsReset';constraint:number}&Input<PhysicsResetKey>);
export type ConstraintPose=
 | {constraint:number;type:'ik';mix:number;softness:number;stretch:boolean;compress:boolean;bendPositive:boolean}
 | {constraint:number;type:'transform';mixes:TransformChannels}
 | ({constraint:number;type:'physics'}&Record<PhysicsProperty,number>);

/** Stored key addresses and values are f32; interpolation remains f64. */
function segment<K extends Key>(keys:readonly K[],frame:number):{left:K;right?:K}|null{
 if(!Number.isFinite(frame)||!keys.length||frame<Math.fround(keys[0]!.frame))return null;
 let left=keys[0]!;
 for(let index=1;index<keys.length;index++){const right=keys[index]!;if(frame<Math.fround(right.frame))return{left,right};left=right;}
 return{left};
}
function numberAt(frame:number,left:{frame:number;curve:AnimationCurve},right:{frame:number}|undefined,start:number,end:number|undefined,controls:readonly number[]|undefined):number{
 const a=Math.fround(start),first=Math.fround(left.frame);
 if(!right||frame===first||left.curve==='stepped')return a;
 const b=Math.fround(end!),last=Math.fround(right.frame);
 if(left.curve==='bezier'){
  if(!controls)throw new Error('Constraint Bézier controls are missing.');
  return bezierValue(frame,first,last,a,b,controls.map(Math.fround));
 }
 return a+(b-a)*(frame-first)/(last-first);
}
export function constraintPose(constraint:ConstraintView):ConstraintPose{
 if(constraint.type==='ik')return{constraint:constraint.id,type:'ik',mix:constraint.mix,softness:constraint.softness,stretch:constraint.stretch,compress:constraint.compress,bendPositive:constraint.bendPositive};
 if(constraint.type==='transform')return{constraint:constraint.id,type:'transform',mixes:[...constraint.mix]};
 return{constraint:constraint.id,type:'physics',inertia:constraint.inertia,strength:constraint.strength,damping:constraint.damping,mass:constraint.mass,wind:constraint.wind,gravity:constraint.gravity,mix:constraint.mix};
}
/** Sparse sampled values overlay the authored layout; membership and mappings
 * never become animation data. Physics Reset is a discrete crossing event. */
export function sampleConstraintPoses(constraints:readonly ConstraintView[],tracks:readonly ConstraintAnimationTrack[],frame:number,drafts:ReadonlyMap<number,ConstraintPose>=new Map()):ConstraintPose[]{
 const byId=new Map(constraints.map(value=>[value.id,value])),poses=new Map<number,ConstraintPose>();
 for(const track of tracks){
  if(track.channel==='physicsReset')continue;
  const setup=byId.get(track.constraint);if(!setup)continue;
  const current=poses.get(track.constraint)??constraintPose(setup);
  if(track.channel==='ik'){
   const value=segment(track.keys,frame);if(!value||current.type!=='ik')continue;const{left,right}=value;
   poses.set(track.constraint,{...current,mix:numberAt(frame,left,right,left.mix,right?.mix,left.controls?.[0]),softness:numberAt(frame,left,right,left.softness,right?.softness,left.controls?.[1]),stretch:left.stretch,compress:left.compress,bendPositive:left.bendPositive});
  }else if(track.channel==='transformMix'){
   const value=segment(track.keys,frame);if(!value||current.type!=='transform')continue;const{left,right}=value;
   poses.set(track.constraint,{...current,mixes:left.values.map((start,axis)=>numberAt(frame,left,right,start,right?.values[axis],left.controls?.[axis])) as TransformChannels});
  }else{
   const value=segment(track.keys,frame);if(!value||current.type!=='physics')continue;const{left,right}=value;
   poses.set(track.constraint,{...current,[track.property]:numberAt(frame,left,right,left.value,right?.value,left.controls??undefined)});
  }
 }
 for(const[id,value]of drafts)if(byId.has(id))poses.set(id,value);
 return[...poses.values()];
}
export function applyConstraintPoses(constraints:readonly ConstraintView[],poses:readonly ConstraintPose[]):ConstraintView[]{
 const byId=new Map(poses.map(value=>[value.constraint,value]));
 return constraints.map(constraint=>{
  const value=byId.get(constraint.id);if(!value||value.type!==constraint.type)return constraint;
  if(value.type==='transform'&&constraint.type==='transform')return{...constraint,mix:[...value.mixes]};
  const{constraint:_,type:__,...fields}=value;return{...constraint,...fields} as ConstraintView;
 });
}
export function physicsResetsBetween(tracks:readonly ConstraintAnimationTrack[],previous:number,current:number,includeStart=false):number[]{
 if(!Number.isFinite(previous)||!Number.isFinite(current)||current<previous)return[];
 return[...new Set(tracks.flatMap(track=>track.channel==='physicsReset'&&track.keys.some(key=>{const frame=Math.fround(key.frame);return frame<=current&&(frame>previous||includeStart&&frame===previous);})?[track.constraint]:[]))];
}
