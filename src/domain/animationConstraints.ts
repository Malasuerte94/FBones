import {bezierValue,type AnimationCurve} from './animation.ts';
import type {ConstraintView,PathConstraintView,TransformChannels} from './project.ts';

export const physicsProperties=['inertia','strength','damping','mass','wind','gravity','mix'] as const;
export type PhysicsProperty=typeof physicsProperties[number];
export type ScalarControls=[number,number,number,number];
export type IkControls=[ScalarControls,ScalarControls];
export type TransformMixControls=[ScalarControls,ScalarControls,ScalarControls,ScalarControls,ScalarControls,ScalarControls];
export type PathMixControls=[ScalarControls,ScalarControls,ScalarControls];
interface Key {id:number;frame:number}
export interface IkAnimationKey extends Key {mix:number;softness:number;stretch:boolean;compress:boolean;bendPositive:boolean;curve:AnimationCurve;controls?:IkControls|null}
export interface TransformMixKey extends Key {values:TransformChannels;curve:AnimationCurve;controls?:TransformMixControls|null}
export interface PhysicsAnimationKey extends Key {value:number;curve:AnimationCurve;controls?:ScalarControls|null}
export interface PhysicsResetKey extends Key {}
export interface PathScalarKey extends Key {values:[number];curve:AnimationCurve;controls?:[ScalarControls]|null}
export interface PathMixKey extends Key {values:[number,number,number];curve:AnimationCurve;controls?:PathMixControls|null}
export type PathAnimationTrack=
 | {channel:'pathPosition'|'pathSpacing';constraint:number;keys:PathScalarKey[]}
 | {channel:'pathMix';constraint:number;keys:PathMixKey[]};
export type KeyableConstraintAnimationTrack=
 | {channel:'ik';constraint:number;keys:IkAnimationKey[]}
 | {channel:'transformMix';constraint:number;keys:TransformMixKey[]}
 | {channel:'physics';constraint:number;property:PhysicsProperty;keys:PhysicsAnimationKey[]}
 | {channel:'physicsReset';constraint:number;keys:PhysicsResetKey[]};
export type ConstraintAnimationTrack=KeyableConstraintAnimationTrack|PathAnimationTrack;
export function isPathAnimationTrack(track:ConstraintAnimationTrack):track is PathAnimationTrack{
 return track.channel==='pathPosition'||track.channel==='pathSpacing'||track.channel==='pathMix';
}
type Input<K extends Key>=Omit<K,'id'>&{keyId?:number};
interface NumericBits {valueBits?:number[];controlsBits?:number[]|number[][]}
export type ConstraintKeyInput=
 | ({channel:'ik';constraint:number}&Input<IkAnimationKey>&NumericBits)
 | ({channel:'transformMix';constraint:number}&Input<TransformMixKey>&NumericBits)
 | ({channel:'physics';constraint:number;property:PhysicsProperty}&Input<PhysicsAnimationKey>&NumericBits)
 | ({channel:'physicsReset';constraint:number}&Input<PhysicsResetKey>);
export type ConstraintDraftPose=
 | {constraint:number;type:'ik';mix:number;softness:number;stretch:boolean;compress:boolean;bendPositive:boolean}
 | {constraint:number;type:'transform';mixes:TransformChannels}
 | ({constraint:number;type:'physics'}&Record<PhysicsProperty,number>);
export type PathMixValues=[number,number,number];
export type PathConstraintPose={constraint:number;type:'path';position:number;spacing:number;mixes:PathMixValues};
export type ConstraintPose=ConstraintDraftPose|PathConstraintPose;
export type AnimatedConstraintView=Exclude<ConstraintView,PathConstraintView>;
export function isAnimatedConstraint(constraint:ConstraintView):constraint is AnimatedConstraintView{
 return constraint.type!=='path';
}

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
export function constraintPose(constraint:AnimatedConstraintView):ConstraintDraftPose;
export function constraintPose(constraint:PathConstraintView):PathConstraintPose;
export function constraintPose(constraint:ConstraintView):ConstraintPose;
export function constraintPose(constraint:ConstraintView):ConstraintPose{
 if(constraint.type==='ik')return{constraint:constraint.id,type:'ik',mix:constraint.mix,softness:constraint.softness,stretch:constraint.stretch,compress:constraint.compress,bendPositive:constraint.bendPositive};
 if(constraint.type==='transform')return{constraint:constraint.id,type:'transform',mixes:[...constraint.mix]};
 if(constraint.type==='path')return{constraint:constraint.id,type:'path',position:constraint.position,spacing:constraint.spacing,mixes:[constraint.mixRotate,constraint.mixX,constraint.mixY]};
 return{constraint:constraint.id,type:'physics',inertia:constraint.inertia,strength:constraint.strength,damping:constraint.damping,mass:constraint.mass,wind:constraint.wind,gravity:constraint.gravity,mix:constraint.mix};
}
/** Sparse sampled values overlay the authored layout; membership and mappings
 * never become animation data. Physics Reset is a discrete crossing event. */
export function sampleConstraintPoses(constraints:readonly ConstraintView[],tracks:readonly ConstraintAnimationTrack[],frame:number,drafts:ReadonlyMap<number,ConstraintDraftPose>=new Map()):ConstraintPose[]{
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
  }else if(track.channel==='physics'){
   const value=segment(track.keys,frame);if(!value||current.type!=='physics')continue;const{left,right}=value;
   poses.set(track.constraint,{...current,[track.property]:numberAt(frame,left,right,left.value,right?.value,left.controls??undefined)});
  }else if(current.type==='path'){
   if(track.channel==='pathMix'){
    const value=segment(track.keys,frame);if(!value)continue;const{left,right}=value;
    const at=(axis:0|1|2)=>numberAt(frame,left,right,left.values[axis],right?.values[axis],left.controls?.[axis]);
    poses.set(track.constraint,{...current,mixes:[at(0),at(1),at(2)]});
   }else{
    const value=segment(track.keys,frame);if(!value)continue;const{left,right}=value;
    const field=track.channel==='pathPosition'?'position':'spacing';
    poses.set(track.constraint,{...current,[field]:numberAt(frame,left,right,left.values[0],right?.values[0],left.controls?.[0])});
   }
  }
 }
 for(const[id,value]of drafts)if(byId.get(id)?.type===value.type)poses.set(id,value);
 return[...poses.values()];
}
export function applyConstraintPoses(constraints:readonly ConstraintView[],poses:readonly ConstraintPose[]):ConstraintView[]{
 const byId=new Map(poses.map(value=>[value.constraint,value]));
 return constraints.map(constraint=>{
  const value=byId.get(constraint.id);if(!value||value.type!==constraint.type)return constraint;
  if(value.type==='transform'&&constraint.type==='transform')return{...constraint,mix:[...value.mixes]};
  if(value.type==='path'&&constraint.type==='path'){
   const [mixRotate,mixX,mixY]=value.mixes;
   return {...constraint,position:value.position,spacing:value.spacing,mixRotate,mixX,mixY};
  }
  const{constraint:_,type:__,...fields}=value;return{...constraint,...fields} as ConstraintView;
 });
}
export function physicsResetsBetween(tracks:readonly ConstraintAnimationTrack[],previous:number,current:number,includeStart=false):number[]{
 if(!Number.isFinite(previous)||!Number.isFinite(current)||current<previous)return[];
 return[...new Set(tracks.flatMap(track=>track.channel==='physicsReset'&&track.keys.some(key=>{const frame=Math.fround(key.frame);return frame<=current&&(frame>previous||includeStart&&frame===previous);})?[track.constraint]:[]))];
}
