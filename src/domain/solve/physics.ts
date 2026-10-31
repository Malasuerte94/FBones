import type {PhysicsConstraintInput} from '../project.ts';
import {fail,type Affine,type Evaluation,type InternalScene,type StepMode} from './types.ts';
import {degrees,heading,radians,setWorld,wrap} from './math.ts';
interface Oscillator {position:number;velocity:number;lag:number}
interface Spring {lastTime:number|null;remaining:number;anchor:[number,number];origin:[number,number];tip:[number,number];channels:[Oscillator,Oscillator,Oscillator,Oscillator]}
const oscillator=():Oscillator=>({position:0,velocity:0,lag:0});
const spring=():Spring=>({lastTime:null,remaining:0,anchor:[0,0],origin:[0,0],tip:[0,0],channels:[oscillator(),oscillator(),oscillator(),oscillator()]});
const visible=(c:Oscillator,fraction:number)=>c.position-c.lag*Math.max(0,1-fraction);
function tick(c:Oscillator,force:number,strength:number,mass:number,step:number,retention:number):void{c.velocity+=(force-strength*c.position)*step/mass;c.position+=c.velocity*step;c.velocity*=retention;}
function cloneSpring(s:Spring):Spring{return{...s,anchor:[...s.anchor],origin:[...s.origin],tip:[...s.tip],channels:s.channels.map(c=>({...c})) as Spring['channels']};}
/** One instance per document/playback instance. A failed evaluation commits none of it. */
export class PhysicsState {
 private layout='';private springs:Spring[]=[];
 clear():void{this.layout='';this.springs=[];}
 clone():PhysicsState{const copy=new PhysicsState();copy.layout=this.layout;copy.springs=this.springs.map(cloneSpring);return copy;}
 commit(next:PhysicsState):void{this.layout=next.layout;this.springs=next.springs;}
 prepare(scene:InternalScene,mode:StepMode):void{
  if((mode.type==='reset'||mode.type==='update')&&(!Number.isFinite(mode.time)||mode.time<0))fail('InvalidTime');
  const layout=JSON.stringify([scene.bones.map(b=>b.id),scene.constraints]);
  const backwards=mode.type==='update'&&this.springs.some(s=>s.lastTime!==null&&mode.time<s.lastTime);
  if(this.layout!==layout||mode.type==='reset'||backwards){this.layout=layout;this.springs=scene.constraints.map(spring);}
 }
 resetConstraint(index:number):void{if(!Number.isInteger(index)||index<0||index>=this.springs.length)fail('InvalidConstraint');this.springs[index]=spring();}
 at(index:number):Spring{return this.springs[index]!;}
 finite():boolean{return this.springs.every(s=>[s.remaining,...s.anchor,...s.origin,...s.tip,...s.channels.flatMap(c=>[c.position,c.velocity,c.lag])].every(Number.isFinite));}
}
/** DTO coefficients are canonical raw UI values, not exported effective rotate/shear values. */
export function effectiveAngular(rotate:number|null,shear:number):[number,number]{
 if(rotate===null||(rotate===0&&shear===0))return[0,0];
 const a=Math.fround(rotate),b=Math.fround(shear),max=Math.max(a,b),denominator=Math.fround(Math.fround(a/max)+Math.fround(b/max));return[Math.fround(a/denominator),Math.fround(b/denominator)];
}
const clamp=(n:number,max:number)=>Math.max(-max,Math.min(max,n));
export function applyPhysics(scene:InternalScene,frame:Evaluation,c:PhysicsConstraintInput,state:PhysicsState,index:number,mode:StepMode):void{
 if(c.mix===0||mode.type==='none')return;
 const[r,s]=effectiveAngular(c.rotate,c.shearX),bone=scene.indices.get(c.bone)!,history=state.at(index),h=c.step,mix=c.mix,length=scene.bones[bone]!.length,world={...frame.bones[bone]!.world};
 if(mode.type==='reset'||mode.type==='update'){
  if(history.lastTime!==null){const delta=Math.max(0,mode.time-history.lastTime),oldFraction=history.remaining/h,total=history.remaining+delta,steps=Math.floor(total/h+1e-7);if(steps>4096)fail('StepLimit');
   const fraction=Math.max(0,total-steps*h)/h,maxMove=c.limit*delta;
   if(c.x>0){history.channels[0].position+=clamp((history.anchor[0]-world.x)*c.inertia,maxMove);history.anchor[0]=world.x;}
   if(c.y>0){history.channels[1].position+=clamp((history.anchor[1]-world.y)*c.inertia,maxMove);history.anchor[1]=world.y;}
   const retention=Math.pow(c.damping,60*h),before=[history.channels[0].position,history.channels[1].position];
   for(let n=0;n<steps;n++){if(c.x>0)tick(history.channels[0],100*c.wind,c.strength,c.mass,h,retention);if(c.y>0)tick(history.channels[1],-100*c.gravity,c.strength,c.mass,h,retention);}
   if(steps>0){history.channels[0].lag=history.channels[0].position-before[0]!;history.channels[1].lag=history.channels[1].position-before[1]!;}
   if(c.x>0)world.x+=visible(history.channels[0],fraction)*mix*c.x;if(c.y>0)world.y+=visible(history.channels[1],fraction)*mix*c.y;
   const angular=r>0||s>0;
   if(angular||c.scaleX>0){const dx=clamp(history.origin[0]-world.x,maxMove),dy=clamp(history.origin[1]-world.y,maxMove),base=radians(heading(world)),angleStrength=(r+s)*mix,oldAngle=visible(history.channels[2],oldFraction);let orientation=base;
    if(angular){const expected=Math.atan2(history.tip[1]+dy,history.tip[0]+dx);history.channels[2].position+=radians(wrap(degrees(expected-base-oldAngle*angleStrength)))*c.inertia;orientation=base+visible(history.channels[2],oldFraction)*angleStrength;}
    if(c.scaleX>0){let size=length*Math.hypot(world.a,world.b);if(!angular)size-=history.channels[3].lag*Math.max(0,1-oldFraction);if(size>1e-12)history.channels[3].position+=(dx*Math.cos(orientation)+dy*Math.sin(orientation))*c.inertia/size;}
    const beforeAngle=history.channels[2].position,beforeScale=history.channels[3].position;
    for(let n=0;n<steps;n++){const sin=Math.sin(orientation),cos=Math.cos(orientation);if(c.scaleX>0)tick(history.channels[3],c.wind*cos-c.gravity*sin,c.strength,c.mass,h,retention);if(angular){tick(history.channels[2],-(c.wind*sin+c.gravity*cos)*length/100,c.strength,c.mass,h,retention);orientation=base+history.channels[2].position*angleStrength;}}
    if(steps>0){history.channels[2].lag=history.channels[2].position-beforeAngle;history.channels[3].lag=history.channels[3].position-beforeScale;}
   }
   history.remaining=fraction*h;
  }else history.anchor=[world.x,world.y];
  history.lastTime=mode.time;history.origin=[world.x,world.y];
 }else if(mode.type==='pose'){const fraction=history.remaining/h;if(c.x>0)world.x+=visible(history.channels[0],fraction)*mix*c.x;if(c.y>0)world.y+=visible(history.channels[1],fraction)*mix*c.y;}
 basis(world,history,mix,r,s,c.scaleX,h);if(mode.type!=='pose')history.tip=[length*world.a,length*world.b];setWorld(scene,frame,bone,world);
}
function basis(world:Affine,spring:Spring,mix:number,rotate:number,shear:number,scale:number,step:number):void{
 const angle=visible(spring.channels[2],spring.remaining/step)*mix,rotateVector=(x:number,y:number,angle:number):[number,number]=>{const s=Math.sin(angle),c=Math.cos(angle);return[c*x-s*y,s*x+c*y];};
 [world.a,world.b]=rotateVector(world.a,world.b,angle*(rotate+shear));[world.c,world.d]=rotateVector(world.c,world.d,angle*rotate);
 if(scale>0){const factor=1+visible(spring.channels[3],spring.remaining/step)*mix*scale;world.a*=factor;world.b*=factor;}
}
