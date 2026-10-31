import {sampleAnimation,type AnimationView} from './animation.ts';
import {sampleConstraintPoses,type ConstraintPose} from './animationConstraints.ts';
import type {BoneView,ConstraintView} from './project.ts';
import {evaluateSampled,PhysicsState,type Evaluation,type LocalPose,type SolveScene,type StepMode} from './solve/index.ts';

interface Configuration {setupBones:readonly BoneView[];setupConstraints:readonly ConstraintView[];clip:AnimationView|null;fps:number;simulate?:boolean}
interface Config {scene:SolveScene;clip:AnimationView|null;fps:number;simulate:boolean}
interface State {physics:PhysicsState;tick:number;frame:Evaluation}
const fields=['x','y','rotation','scaleX','scaleY','shearX','shearY'] as const;
const MAX_TIME=120,MAX_FRAME=1_000_000;
function canonicalBone(input:BoneView):BoneView{
 const{evaluatedWorld:_,...bone}=input;
 return{...bone,x:Math.fround(bone.x),y:Math.fround(bone.y),rotation:Math.fround(bone.rotation),length:Math.fround(bone.length),scaleX:Math.fround(bone.scaleX??1),scaleY:Math.fround(bone.scaleY??1),shearX:Math.fround(bone.shearX??0),shearY:Math.fround(bone.shearY??0)};
}
/** Recover only stored f32 solver inputs. IDs, bit metadata and derived editor
 * endpoint diagnostics are not float channels and are deliberately untouched. */
function canonicalConstraint(input:ConstraintView):ConstraintView{
 const c=structuredClone(input);
 if(c.type==='ik')return{...c,mix:Math.fround(c.mix),softness:Math.fround(c.softness)};
 if(c.type==='transform')return{...c,offsets:c.offsets.map(Math.fround) as typeof c.offsets,mix:c.mix.map(Math.fround) as typeof c.mix,properties:c.properties.map(p=>({...p,offset:Math.fround(p.offset),to:p.to.map(t=>({...t,offset:Math.fround(t.offset),max:Math.fround(t.max),scale:Math.fround(t.scale)}))}))};
 return{...c,x:Math.fround(c.x),y:Math.fround(c.y),rotate:c.rotate===null?null:Math.fround(c.rotate),scaleX:Math.fround(c.scaleX),shearX:Math.fround(c.shearX),step:Math.fround(c.step),inertia:Math.fround(c.inertia),strength:Math.fround(c.strength),damping:Math.fround(c.damping),mass:Math.fround(c.mass),wind:Math.fround(c.wind),gravity:Math.fround(c.gravity),mix:Math.fround(c.mix),limit:Math.fround(c.limit)};
}
function local(bone:BoneView):LocalPose{return{x:bone.x,y:bone.y,rotation:bone.rotation,scaleX:bone.scaleX??1,scaleY:bone.scaleY??1,shearX:bone.shearX??0,shearY:bone.shearY??0};}
function tickCeil(time:number):number{const ticks=time*60;return Math.abs(ticks-Math.round(ticks))<=1e-7?Math.round(ticks):Math.ceil(ticks);}
function checkedTime(config:Config,frame:number):number{
 if(!Number.isFinite(frame)||frame<0||frame>MAX_FRAME)throw new Error('Use a finite animation frame between0 and1000000.');
 const time=frame/config.fps;
 if(config.simulate&&time>MAX_TIME)throw new Error('Animated Physics preview supports at most120 seconds. Turn Simulate off to inspect later keys.');
 return time;
}
function resetIds(config:Config,previous:number,now:number,initial=false):number[]{
 const ids=new Set<number>();
 for(const track of config.clip?.constraintTracks??[])if(track.channel==='physicsReset'&&track.keys.some(key=>{const t=Math.fround(key.frame)/config.fps;return t<=now&&(t>previous||initial&&t===0);}))ids.add(track.constraint);
 return [...ids];
}
function sampled(config:Config,time:number){return sampleAnimation(config.scene.bones,config.clip,time*config.fps);}
function apply(config:Config,physics:PhysicsState,time:number,mode:StepMode,previous:number,initial=false):Evaluation{
 if(!config.scene.bones.length)return{bones:[]};
 return evaluateSampled(config.scene,sampled(config,time).map(local),physics,mode,sampleConstraintPoses(config.scene.constraints??[],config.clip?.constraintTracks??[],time*config.fps),mode.type==='reset'||mode.type==='update'?resetIds(config,previous,time,initial):[]);
}
function initial(config:Config):State{const physics=new PhysicsState();return{physics,tick:0,frame:apply(config,physics,0,config.simulate?{type:'reset',time:0}:{type:'none'},0,true)};}
function locals(config:Config,frame:Evaluation):BoneView[]{return config.scene.bones.map((bone,index)=>({...bone,...frame.bones[index]!.authored}));}

/** Timeline-owned absolute time, shared solver, no RAF/Event/audio side effects.
 * Only complete60Hz steps commit. A fractional presentation update is scratch
 * state and cannot influence the next requested time or a different RAF rate. */
export class AnimationPhysicsPreview{
 private config:Config|null=null;
 private committed:State={physics:new PhysicsState(),tick:0,frame:{bones:[]}};
 private endpointPhysics=new PhysicsState();
 private clean:Evaluation={bones:[]};
 private displayed:Evaluation={bones:[]};
 private currentTime=0;
 private currentFrame=0;
 get frame():Evaluation{return this.displayed;}
 get localBones():BoneView[]{return this.config?locals(this.config,this.displayed):[];}
 get time():number{return this.currentTime;}
 get animationFrame():number{return this.currentFrame;}
 configure(input:Configuration):void{
  const fps=Math.fround(input.fps);if(!Number.isFinite(fps)||fps<=0)throw new Error('Use a finite positive animation FPS.');
  const config:Config={scene:{bones:input.setupBones.map(canonicalBone),constraints:input.setupConstraints.map(canonicalConstraint)},clip:input.clip?structuredClone(input.clip):null,fps,simulate:input.simulate??true};
  const state=initial(config);this.config=config;this.committed=state;this.endpointPhysics=state.physics.clone();this.clean=state.frame;this.displayed=state.frame;this.currentTime=0;this.currentFrame=0;
 }
 seek(frame:number):Evaluation{return this.move(frame,true);}
 advanceTo(frame:number):Evaluation{return this.move(frame,false);}
 private move(frame:number,restart:boolean):Evaluation{
  const config=this.config;if(!config)throw new Error('Configure the animation preview first.');
  const time=checkedTime(config,frame);
  if(!config.simulate){const physics=new PhysicsState(),result=apply(config,physics,time,{type:'none'},time);this.committed={physics,tick:0,frame:result};this.endpointPhysics=physics.clone();this.clean=result;this.displayed=result;this.currentTime=time;this.currentFrame=frame;return result;}
  const state=restart||time<this.currentTime?initial(config):{physics:this.committed.physics.clone(),tick:this.committed.tick,frame:this.committed.frame};
  const end=tickCeil(time);
  while(state.tick<end&&(state.tick+1)/60<=time){const next=state.tick+1;state.frame=apply(config,state.physics,next/60,{type:'update',time:next/60},state.tick/60);state.tick=next;}
  const endpoint=state.physics.clone();
  const result=state.tick<end?apply(config,endpoint,time,{type:'update',time},state.tick/60):state.frame;
  this.committed=state;this.endpointPhysics=endpoint;this.clean=result;this.displayed=result;this.currentTime=time;this.currentFrame=frame;return result;
 }
 pose(endpointBoneDraft?:readonly BoneView[],constraintDraft?:readonly ConstraintPose[]):Evaluation{
  const config=this.config;if(!config)throw new Error('Configure the animation preview first.');
  if(endpointBoneDraft===undefined&&!constraintDraft?.length){this.displayed=this.clean;return this.clean;}
  const source=endpointBoneDraft??locals(config,this.clean);
  if(source.length!==config.scene.bones.length||source.some((b,i)=>b.id!==config.scene.bones[i]!.id||b.parent!==config.scene.bones[i]!.parent))throw new Error('Use a complete current animation bone draft.');
  const authored=source.map(local);if(authored.some(p=>fields.some(key=>!Number.isFinite(p[key])||Math.abs(p[key])>1_000_000)))throw new Error('Use a finite bounded animation working pose.');
  const poses=sampleConstraintPoses(config.scene.constraints??[],config.clip?.constraintTracks??[],this.currentTime*config.fps),byId=new Map(poses.map(p=>[p.constraint,p]));
  if(constraintDraft){const seen=new Set<number>();for(const pose of constraintDraft){if(seen.has(pose.constraint)||!config.scene.constraints?.some(c=>c.id===pose.constraint))throw new Error('Use distinct current constraint draft targets.');seen.add(pose.constraint);byId.set(pose.constraint,pose);}}
  const result=config.scene.bones.length?evaluateSampled(config.scene,authored,this.endpointPhysics.clone(),config.simulate?{type:'pose'}:{type:'none'},[...byId.values()]):{bones:[]};
  this.displayed=result;return result;
 }
}
