import {computed,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {sameAnimationFrame,type AnimationCurve,type AnimationView} from '../domain/animation.ts';
import {applyConstraintPoses,constraintPose,physicsProperties,sampleConstraintPoses,type ConstraintAnimationTrack,type ConstraintKeyInput,type ConstraintPose,type IkControls,type PhysicsProperty,type ScalarControls,type TransformMixControls} from '../domain/animationConstraints.ts';
import type {EventKeyInput,EventPatch} from '../domain/animationEvents.ts';
import type {ConstraintView,ProjectSummary,RigEdit,TransformChannels} from '../domain/project.ts';
import type {TimelineConstraintKeyChange,TimelineConstraintTrack} from '../domain/animationTimeline.ts';

interface Options {
 project:ShallowRef<ProjectSummary|null>;active:Readonly<Ref<AnimationView|null>>;frame:Ref<number>;mode:Ref<'setup'|'animate'>;
 autoKey:Ref<boolean>;version:Ref<number>;edit:(edit:RigEdit,expectedRevision?:number)=>Promise<boolean>;
 pause:()=>void;notice:(message:string,error?:boolean)=>void;
}
export interface ConstraintAnimationPatch {mix?:number|TransformChannels;softness?:number;stretch?:boolean;compress?:boolean;bendPositive?:boolean;inertia?:number;strength?:number;damping?:number;mass?:number;wind?:number;gravity?:number}
export function shiftConstraintKey(key:ConstraintKeyInput,delta:number,storedSource=false):ConstraintKeyInput{
 const f=(value:number)=>storedSource?Math.fround(value):value,next={...key,frame:f(key.frame)+delta};
 if(key.channel==='physicsReset'||!key.controls)return next;
 const shift=(axis:ScalarControls):ScalarControls=>[f(axis[0])+delta,axis[1],f(axis[2])+delta,axis[3]];
 if(key.channel==='physics')return{...next,channel:'physics',constraint:key.constraint,property:key.property,value:key.value,curve:key.curve,controls:shift(key.controls)};
 return{...next,controls:key.controls.map(shift)} as ConstraintKeyInput;
}
export function useConstraintAnimationWorkspace(o:Options){
 const constraintDraft=shallowRef<ReadonlyMap<number,ConstraintPose>>(new Map()),eventDraft=shallowRef<ReadonlyMap<number,EventKeyInput>>(new Map());
 watch([constraintDraft,eventDraft],()=>{o.version.value++;},{flush:'sync'});
 const eventDefinitions=computed(()=>o.project.value?.events??[]);
 const animationConstraintPoses=computed(()=>sampleConstraintPoses(o.project.value?.constraints??[],o.active.value?.constraintTracks??[],o.frame.value,constraintDraft.value));
 const animationConstraints=computed(()=>applyConstraintPoses(o.project.value?.constraints??[],animationConstraintPoses.value));
 const animationTimelineConstraints=computed(()=>(o.project.value?.constraints??[]).map(c=>({id:c.id,name:c.name,type:c.type,boneId:c.type==='ik'?c.target:c.type==='transform'?c.source:c.bone})));
 const animationConstraintTracks=computed<TimelineConstraintTrack[]>(()=>(o.active.value?.constraintTracks??[]).map(track=>{
  const base={id:`constraint:${track.constraint}:${track.channel}${track.channel==='physics'?':'+track.property:''}`,constraintId:track.constraint};
  if(track.channel==='physicsReset')return{...base,kind:'physicsReset',keys:track.keys};
  if(track.channel==='ik')return{...base,kind:'ik',keys:track.keys.map(k=>({...k,interpolation:k.curve}))};
  if(track.channel==='transformMix')return{...base,kind:'transformMix',keys:track.keys.map(k=>({...k,interpolation:k.curve}))};
  return{...base,kind:'physics',property:track.property,keys:track.keys.map(k=>({...k,interpolation:k.curve}))};
 }));
 const animationEventTracks=computed(()=>(o.active.value?.eventTracks??[]).map(track=>({id:`event:${track.event}`,eventId:track.event,keys:track.keys})));
 function animationConstraint(id:number):ConstraintView|null{return(o.mode.value==='animate'?animationConstraints.value:o.project.value?.constraints??[]).find(c=>c.id===id)??null;}
 function clearConstraintAnimationDraft(){if(constraintDraft.value.size)constraintDraft.value=new Map();if(eventDraft.value.size)eventDraft.value=new Map();}
 function current(){if(o.mode.value!=='animate'||!o.active.value)throw new Error('Create or select an animation first.');return o.active.value;}
 async function perform(action:()=>Promise<boolean>):Promise<boolean>{try{return await action();}catch(error){o.notice(error instanceof Error?error.message:String(error),true);return false;}}
 function existing(constraint:number,channel:ConstraintAnimationTrack['channel'],property?:PhysicsProperty){return o.active.value?.constraintTracks?.find(track=>track.constraint===constraint&&track.channel===channel&&(track.channel!=='physics'||track.property===property));}
 function inputsForPose(pose:ConstraintPose,property?:PhysicsProperty):ConstraintKeyInput[]{
  const frame=o.frame.value;
  if(pose.type==='ik'){
   const track=existing(pose.constraint,'ik'),key=track?.channel==='ik'?track.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,frame)):undefined;
   const{constraint,type:_,...values}=pose;return[{channel:'ik',constraint,frame,...values,curve:key?.curve??'linear',...(key?.controls?{controls:key.controls}:{})}];
  }
  if(pose.type==='transform'){
   const track=existing(pose.constraint,'transformMix'),key=track?.channel==='transformMix'?track.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,frame)):undefined;
   return[{channel:'transformMix',constraint:pose.constraint,frame,values:[...pose.mixes],curve:key?.curve??'linear',...(key?.controls?{controls:key.controls}:{})}];
  }
  return(property?[property]:physicsProperties).map(property=>{
   const track=existing(pose.constraint,'physics',property),key=track?.channel==='physics'?track.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,frame)):undefined;
   return{channel:'physics',constraint:pose.constraint,property,frame,value:pose[property],curve:key?.curve??'linear',...(key?.controls?{controls:key.controls}:{})};
  });
 }
 async function setConstraintAnimationFields(id:number,patch:ConstraintAnimationPatch,expectedRevision?:number):Promise<boolean>{return perform(async()=>{
  o.pause();const clip=current(),view=animationConstraint(id);if(!view)throw new Error('Select a constraint to key.');const pose=constraintPose(view);
  let next:ConstraintPose;
  if(pose.type==='transform'){
   if(!Array.isArray(patch.mix)||patch.mix.length!==6||Object.keys(patch).some(key=>key!=='mix'))throw new Error('Only Transform mixes can animate.');next={...pose,mixes:[...patch.mix]};
  }else{
   const allowed=pose.type==='ik'?['mix','softness','stretch','compress','bendPositive']:physicsProperties;
   if(Object.keys(patch).some(key=>!allowed.includes(key as never)))throw new Error('This constraint setting belongs to Setup.');
   if(Array.isArray(patch.mix))throw new Error('Enter a numeric mix.');next={...pose,...patch} as ConstraintPose;
  }
  if(!o.autoKey.value){constraintDraft.value=new Map(constraintDraft.value).set(id,next);return true;}
  const keys=next.type==='physics'?Object.keys(patch).flatMap(property=>inputsForPose(next,property as PhysicsProperty)):inputsForPose(next);
  return keys.length?o.edit({type:'setAnimationConstraintKeys',animation:clip.id,keys},expectedRevision):false;
 });}
 async function insertConstraintAnimationKeys(value:{constraintId:number;kind:ConstraintAnimationTrack['channel'];property?:string}):Promise<boolean>{return perform(async()=>{
  o.pause();const clip=current(),view=animationConstraint(value.constraintId);if(!view)throw new Error('Select a constraint to key.');
  if(value.kind==='physicsReset'){if(view.type!=='physics')throw new Error('Only Physics constraints can reset.');return o.edit({type:'setAnimationConstraintKeys',animation:clip.id,keys:[{channel:'physicsReset',constraint:view.id,frame:o.frame.value}]});}
  const expected=view.type==='transform'?'transformMix':view.type;if(value.kind!==expected)throw new Error('Constraint key type does not match.');
  if(value.property&&!physicsProperties.includes(value.property as PhysicsProperty))throw new Error('Unknown Physics property.');
  return o.edit({type:'setAnimationConstraintKeys',animation:clip.id,keys:inputsForPose(constraintPose(view),value.property as PhysicsProperty|undefined)});
 });}
 function constraintKeysForIds(ids:readonly number[]):ConstraintKeyInput[]{
  const selected=new Set(ids),keys:ConstraintKeyInput[]=[];
  for(const track of o.active.value?.constraintTracks??[]){
   if(track.channel==='ik')for(const{id,...key}of track.keys){if(selected.has(id))keys.push({channel:'ik',constraint:track.constraint,...key,keyId:id});}
   else if(track.channel==='transformMix')for(const{id,...key}of track.keys){if(selected.has(id))keys.push({channel:'transformMix',constraint:track.constraint,...key,keyId:id});}
   else if(track.channel==='physics')for(const{id,...key}of track.keys){if(selected.has(id))keys.push({channel:'physics',constraint:track.constraint,property:track.property,...key,keyId:id});}
   else for(const{id,...key}of track.keys){if(selected.has(id))keys.push({channel:'physicsReset',constraint:track.constraint,...key,keyId:id});}
  }
  return keys;
 }
 async function updateConstraintAnimationKey(change:TimelineConstraintKeyChange):Promise<boolean>{return perform(async()=>{
  const key=constraintKeysForIds([change.id])[0];if(!key||key.channel!==change.kind)return false;const{id:_,kind:__,...patch}=change;
  return o.edit({type:'setAnimationConstraintKeys',animation:current().id,keys:[{...key,...patch} as ConstraintKeyInput]});
 });}
 function constraintInterpolationKeys(ids:readonly number[],curve:AnimationCurve):ConstraintKeyInput[]{
  return constraintKeysForIds(ids).flatMap((key):ConstraintKeyInput[]=>{
   if(key.channel==='physicsReset')return[];
   const track=existing(key.constraint,key.channel,key.channel==='physics'?key.property:undefined),next=track?.keys.find(k=>Math.fround(k.frame)>Math.fround(key.frame));
   if(curve==='bezier'&&!next)return[];
   if(curve!=='bezier')return[{...key,curve,controls:undefined}];
   if(key.controls)return[{...key,curve}];
   const first=Math.fround(key.frame),last=Math.fround(next!.frame),span=last-first;
   const axis=(a:number,b:number):ScalarControls=>[first+span/3,a+(b-a)/3,first+span*2/3,a+(b-a)*2/3];
   if(key.channel==='ik'&&track?.channel==='ik'){const right=track.keys.find(k=>Math.fround(k.frame)>first)!;return[{...key,curve,controls:[axis(key.mix,right.mix),axis(key.softness,right.softness)] as IkControls}];}
   if(key.channel==='transformMix'&&track?.channel==='transformMix'){const right=track.keys.find(k=>Math.fround(k.frame)>first)!;return[{...key,curve,controls:key.values.map((v,i)=>axis(v,right.values[i]!)) as TransformMixControls}];}
   if(key.channel==='physics'&&track?.channel==='physics'){const right=track.keys.find(k=>Math.fround(k.frame)>first)!;return[{...key,curve,controls:axis(key.value,right.value)}];}
   return[];
  });
 }
 function constraintBezierKey(change:{id:number;component:number;control:0|1;frame:number;value:number}):ConstraintKeyInput|null{
  const key=constraintKeysForIds([change.id])[0];if(!key||key.channel==='physicsReset'||!key.controls)return null;
  const next=existing(key.constraint,key.channel,key.channel==='physics'?key.property:undefined)?.keys.find(k=>Math.fround(k.frame)>Math.fround(key.frame));if(!next)return null;
  const controls=structuredClone(key.controls),axis=key.channel==='physics'?controls as ScalarControls:(controls as ScalarControls[])[change.component];if(!axis)return null;
  axis[change.control*2]=Math.max(Math.fround(key.frame),Math.min(Math.fround(next.frame),change.frame));axis[change.control*2+1]=change.value;
  return{...key,curve:'bezier',controls} as ConstraintKeyInput;
 }
 function eventInput(event:number):EventKeyInput{
  const definition=eventDefinitions.value.find(value=>value.id===event);if(!definition)throw new Error('Select an event.');
  const existing=o.active.value?.eventTracks?.find(track=>track.event===event)?.keys.slice().reverse().find(key=>sameAnimationFrame(key.frame,o.frame.value));
  const value=eventDraft.value.get(event)??existing??definition;
  return{event,frame:o.frame.value,int:value.int,float:value.float,string:value.string,volume:value.volume,balance:value.balance};
 }
 async function insertEventAnimationKey(event:number):Promise<boolean>{return perform(async()=>{o.pause();return o.edit({type:'setAnimationEventKeys',animation:current().id,keys:[eventInput(event)]});});}
 async function setEventAnimationFields(event:number,patch:EventPatch):Promise<boolean>{return perform(async()=>{
  o.pause();const clip=current(),key={...eventInput(event),...patch};
  if(!o.autoKey.value){eventDraft.value=new Map(eventDraft.value).set(event,key);return true;}
  return o.edit({type:'setAnimationEventKeys',animation:clip.id,keys:[key]});
 });}
 function eventKeysForIds(ids:readonly number[]):EventKeyInput[]{return(o.active.value?.eventTracks??[]).flatMap(track=>track.keys.filter(key=>ids.includes(key.id)).map(({id,...key})=>({...key,event:track.event,keyId:id})));}
 async function updateEventAnimationKey(change:{id:number;int:number;float:number;string:string;volume:number;balance:number}):Promise<boolean>{return perform(async()=>{
  const key=eventKeysForIds([change.id])[0];if(!key)return false;const{id:_,...patch}=change;return o.edit({type:'setAnimationEventKeys',animation:current().id,keys:[{...key,...patch}]});
 });}
 watch(()=>[o.project.value?.documentId,o.active.value?.id,o.frame.value,o.mode.value],clearConstraintAnimationDraft,{flush:'sync'});
 return{constraintDraft,eventDraft,eventDefinitions,animationConstraintPoses,animationConstraints,animationConstraintTracks,animationTimelineConstraints,animationEventTracks,animationConstraint,clearConstraintAnimationDraft,setConstraintAnimationFields,insertConstraintAnimationKeys,constraintKeysForIds,updateConstraintAnimationKey,constraintInterpolationKeys,constraintBezierKey,insertEventAnimationKey,setEventAnimationFields,eventInput,eventKeysForIds,updateEventAnimationKey};
}
