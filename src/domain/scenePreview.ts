import {evaluate,PhysicsState,type Evaluation,type SolveScene} from './solve/index.ts';
import type {BoneView,ReplayLocalPose,ReplayMotion} from './project.ts';
const local=(b:BoneView):ReplayLocalPose=>({x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX??1,scaleY:b.scaleY??1,shearX:b.shearX??0,shearY:b.shearY??0});
const MAX_WINDOW_TICKS=7200,MAX_MOTION_POSES=262144,CHECKPOINT_TICKS=600;
/** Deterministic setup preview clock shared with the native gesture replay.
 * Repaints, hover and camera changes never advance it. No project is mutated. */
export class ScenePreview {
  private physics=new PhysicsState();
  private scene:SolveScene={bones:[],constraints:[]};
  private ticks=0;
  private windowStart=0;
  private draftBones:SolveScene['bones']|null=null;
  private initial:ReplayLocalPose[]=[];
  private changes:ReplayMotion['changes']=[];
  private lastPose='';
  frame:Evaluation={bones:[]};
  get tick(){return this.ticks;}
  get time(){return this.ticks/60;}
  get checkpointTick(){return this.windowStart;}
  get needsCheckpoint(){return this.ticks-this.windowStart>=CHECKPOINT_TICKS||(this.changes.length+3)*this.initial.length>MAX_MOTION_POSES;}
  /** Pause before a further tick could exceed the retained replay window.
   * Reserve a complete changed pose even if the current draft is unchanged. */
  get checkpointBlocked(){return this.ticks-this.windowStart>=MAX_WINDOW_TICKS||(this.changes.length+2)*this.initial.length>MAX_MOTION_POSES;}
  reset(scene:SolveScene=this.scene){
    const state=new PhysicsState(),frame=scene.bones.length?evaluate(scene,null,state,{type:'reset',time:0}):{bones:[]};
    this.scene=scene;this.physics=state;this.ticks=0;this.windowStart=0;this.draftBones=null;this.frame=frame;
    this.initial=scene.bones.map(local);this.lastPose=JSON.stringify(this.initial);this.changes=[];return frame;
  }
  step(){
    if(!Number.isSafeInteger(this.ticks+1))throw new Error('Setup preview clock reached its safe limit.');
    if(this.ticks-this.windowStart>=MAX_WINDOW_TICKS)throw new Error('Setup preview is waiting for its physics checkpoint.');
    const source=this.draftBones?{...this.scene,bones:this.draftBones}:this.scene;
    const poses=source.bones.map(local),key=JSON.stringify(poses);
    if(key!==this.lastPose&&(this.changes.length+2)*poses.length>MAX_MOTION_POSES)throw new Error('Physics preview is waiting for its motion checkpoint.');
    const frame=evaluate(source,null,this.physics,{type:'update',time:(this.ticks+1)/60});
    if(key!==this.lastPose){this.changes.push({tick:this.ticks+1,poses});this.lastPose=key;}
    this.ticks++;this.frame=frame;return frame;
  }
  /** Acknowledge only the native snapshot's captured tick, never the current tick.
   * The request may have been in flight while additional local motion advanced. */
  acknowledgeCheckpoint(tick:number):boolean{
    if(!Number.isSafeInteger(tick)||tick<this.windowStart||tick>this.ticks)return false;
    if(tick===this.windowStart)return true;
    let initial=this.initial,count=0;
    for(const change of this.changes){if(change.tick>tick)break;initial=change.poses;count++;}
    this.initial=initial.map(p=>({...p}));this.changes=this.changes.slice(count);this.windowStart=tick;
    return true;
  }
  previewBones(bones:SolveScene['bones']){
    const frame=evaluate({...this.scene,bones},null,this.physics.clone(),{type:'pose'});this.draftBones=bones;return frame;
  }
  get hasDraft(){return this.draftBones!==null;}
  adopt(scene:SolveScene):boolean{
    if(!scene.bones.length||JSON.stringify(scene.constraints??[])!==JSON.stringify(this.scene.constraints??[])||scene.bones.length!==this.scene.bones.length||scene.bones.some((b,i)=>b.id!==this.scene.bones[i]!.id||b.parent!==this.scene.bones[i]!.parent||b.length!==this.scene.bones[i]!.length))return false;
    const frame=evaluate(scene,null,this.physics.clone(),{type:'pose'});this.scene=scene;this.draftBones=null;this.frame=frame;return true;
  }
  clearDraft(){
    if(!this.draftBones)return;
    this.draftBones=null;this.frame=this.scene.bones.length?evaluate(this.scene,null,this.physics.clone(),{type:'pose'}):{bones:[]};
  }
  motion():ReplayMotion|undefined{
    if(!this.changes.length&&JSON.stringify(this.initial)===JSON.stringify(this.scene.bones.map(local)))return undefined;
    return {initial:this.initial.map(p=>({...p})),changes:this.changes.map(c=>({tick:c.tick,poses:c.poses.map(p=>({...p}))}))};
  }
}
