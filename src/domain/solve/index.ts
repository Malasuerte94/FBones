/** Pure non-destructive viewport evaluator. No IPC, browser globals or dynamic code. */
import type {ConstraintView} from '../project.ts';
import type {ConstraintPose} from '../animationConstraints.ts';
import {affine,compose,finite,localPose,parentWorld} from './math.ts';
import {applyIk,applyTransform} from './static.ts';
import {applyPhysics,PhysicsState} from './physics.ts';
import {channels,fail,type Evaluation,type InternalScene,type LocalPose,type SolveScene,type StepMode} from './types.ts';
export {PhysicsState,effectiveAngular} from './physics.ts';
export {SolveError} from './types.ts';
export type {Affine,BoneFrame,Evaluation,LocalPose,SolveErrorCode,SolveScene,StepMode} from './types.ts';

function prepare(scene:SolveScene):InternalScene{
 const count=scene.bones.length;if(count===0||count>4096)fail('InvalidGraph');
 const indices=new Map<number,number>(),parents:(number|null)[]=[],children:number[][]=Array.from({length:count},()=>[]);
 for(const [index,bone]of scene.bones.entries()){
  if(!Number.isSafeInteger(bone.id)||indices.has(bone.id)||!Number.isFinite(bone.length)||bone.length<0)fail('InvalidGraph');
  if(bone.parent!==null&&!indices.has(bone.parent))fail('InvalidGraph');const parent=bone.parent===null?null:indices.get(bone.parent)!;parents.push(parent);if(parent!==null)children[parent]!.push(index);indices.set(bone.id,index);
 }
 const constraints=[...(scene.constraints??[])].sort((a,b)=>a.order-b.order),names=new Set<string>(),ids=new Set<number>(),orders=new Set<number>();
 const allFinite=(values:readonly number[])=>values.every(Number.isFinite);
 for(const c of constraints){
  if(!c.name||names.has(c.name)||!Number.isSafeInteger(c.id)||ids.has(c.id)||!Number.isSafeInteger(c.order)||orders.has(c.order))fail('InvalidConstraint');names.add(c.name);ids.add(c.id);orders.add(c.order);
  if(c.type==='ik'||c.type==='transform'){
   if(c.bones.length===0||new Set(c.bones).size!==c.bones.length||c.bones.some(id=>!indices.has(id)))fail('InvalidConstraint');
  }
  switch(c.type){
   case'ik':{
    if(c.bones.length>2||!indices.has(c.target)||!allFinite([c.mix,c.softness])||c.mix<0||c.mix>1||c.softness<0||(c.bones.length===2&&scene.bones[indices.get(c.bones[1]!)!]!.parent!==c.bones[0]))fail('InvalidConstraint');
    let ancestor:number|null=c.target;while(ancestor!==null){if(c.bones.includes(ancestor))fail('InvalidConstraint');ancestor=scene.bones[indices.get(ancestor)!]!.parent;}break;
   }
   case'transform':{
    if(!indices.has(c.source)||c.offsets.length!==6||c.mix.length!==6||!allFinite([...c.offsets,...c.mix])||c.properties.length>6||new Set(c.properties.map(p=>p.property)).size!==c.properties.length)fail('InvalidConstraint');
    for(const p of c.properties){if(!channels.includes(p.property)||!Number.isFinite(p.offset)||p.to.length===0||p.to.length>6||new Set(p.to.map(t=>t.property)).size!==p.to.length||p.to.some(t=>!channels.includes(t.property)||!allFinite([t.offset,t.max,t.scale])))fail('InvalidConstraint');}break;
   }
   case'physics':if(!indices.has(c.bone)||!allFinite([c.x,c.y,c.scaleX,c.shearX,c.step,c.inertia,c.strength,c.damping,c.mass,c.wind,c.gravity,c.mix,c.limit])||(c.rotate!==null&&(!Number.isFinite(c.rotate)||c.rotate<0))||(c.rotate===null&&c.shearX!==0)||c.shearX<0||c.step<=0||c.mass<=0||c.limit<0||c.damping<0)fail('InvalidConstraint');break;
   default:fail('InvalidConstraint');
  }
 }
 return{bones:scene.bones,parents,children,constraints,indices};
}
/** Absolute seconds are explicit. Caller resets on deliberate setup changes/seek. */
export function evaluate(scene:SolveScene,authored:readonly LocalPose[]|null|undefined,physics:PhysicsState,mode:StepMode):Evaluation{return evaluateOrdered(scene,authored,physics,mode,null,[]);}
/** Authored constraints define spring layout; borrowed working coefficients only
 * affect application. Ordinary Setup callers retain the original path. */
export function evaluateSampled(scene:SolveScene,authored:readonly LocalPose[]|null|undefined,physics:PhysicsState,mode:StepMode,poses:readonly ConstraintPose[],resetIds:readonly number[]=[]):Evaluation{return evaluateOrdered(scene,authored,physics,mode,poses,resetIds);}
function overlay(setup:ConstraintView,pose:ConstraintPose):ConstraintView{
 const finite=(values:readonly number[])=>values.every(v=>Number.isFinite(v)&&Math.abs(v)<=1_000_000);
 if(setup.type!==pose.type)fail('InvalidConstraint');
 if(setup.type==='ik'&&pose.type==='ik'){
  if(!finite([pose.mix,pose.softness])||pose.mix<0||pose.mix>1||pose.softness<0||[pose.stretch,pose.compress,pose.bendPositive].some(v=>typeof v!=='boolean'))fail('InvalidConstraint');
  return{...setup,mix:pose.mix,softness:pose.softness,stretch:pose.stretch,compress:pose.compress,bendPositive:pose.bendPositive};
 }
 if(setup.type==='transform'&&pose.type==='transform'){if(pose.mixes.length!==6||!finite(pose.mixes))fail('InvalidConstraint');return{...setup,mix:[...pose.mixes]};}
 if(setup.type==='physics'&&pose.type==='physics'){
  const{inertia,strength,damping,mass,wind,gravity,mix}=pose;if(!finite([inertia,strength,damping,mass,wind,gravity,mix])||damping<0||mass<=0)fail('InvalidConstraint');return{...setup,inertia,strength,damping,mass,wind,gravity,mix};
 }
 return fail('InvalidConstraint');
}
function evaluateOrdered(scene:SolveScene,authored:readonly LocalPose[]|null|undefined,physics:PhysicsState,mode:StepMode,poses:readonly ConstraintPose[]|null,resetIds:readonly number[]):Evaluation{
 if(authored&&authored.length!==scene.bones.length)fail('InvalidPoseCount');
 const internal=prepare(scene),frame:Evaluation={bones:[]};
 for(let i=0;i<scene.bones.length;i++){const pose={...(authored?.[i]??localPose(scene.bones[i]!))};if(!finite(pose))fail('NonFinite');const world=compose(parentWorld(internal,frame,i),affine(pose));frame.bones.push({id:scene.bones[i]!.id,authored:{...pose},applied:pose,world});}
 const values=new Map<number,ConstraintView>();
 if(poses)for(const pose of poses){const setup=internal.constraints.find(c=>c.id===pose.constraint);if(!setup||values.has(pose.constraint))fail('InvalidConstraint');values.set(pose.constraint,overlay(setup,pose));}
 if(new Set(resetIds).size!==resetIds.length)fail('InvalidConstraint');
 const resets=resetIds.map(id=>{const index=internal.constraints.findIndex(c=>c.id===id&&c.type==='physics');if(index<0)fail('InvalidConstraint');return index;});
 const candidate=physics.clone();candidate.prepare(internal,mode);for(const index of resets)candidate.resetConstraint(index);
 for(const[index,setup]of internal.constraints.entries()){
  const c=values.get(setup.id)??setup;
  switch(c.type){case'ik':applyIk(internal,frame,c);break;case'transform':applyTransform(internal,frame,c);break;case'physics':applyPhysics(internal,frame,c,candidate,index,mode);break;}
 }
 if(frame.bones.some(b=>!finite(b.applied)||!finite(b.world))||!candidate.finite())fail('NonFinite');physics.commit(candidate);return frame;
}
// Keep this type assertion visible to prevent accidentally accepting a slot-only model.
export type OrderedConstraint=ConstraintView;
