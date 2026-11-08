import type {IkConstraintInput,TransformConstraintInput} from '../project.ts';
import {channels,type Evaluation,type InternalScene} from './types.ts';
import {affine,degrees,determinant,heading,inverse,parentWorld,point,radians,recompute,rotateBasis,setWorld,vector,wrap} from './math.ts';
export function applyTransform(scene:InternalScene,frame:Evaluation,c:TransformConstraintInput):void{
 if(!c.properties.some(p=>p.to.some(to=>c.mix[channels.indexOf(to.property)]!==0)))return;
 const source=frame.bones[scene.indices.get(c.source)!]!,p=source.applied,w=source.world;
 let values:number[];
 if(c.localSource)values=[p.rotation,p.x,p.y,p.scaleX,p.scaleY,p.shearY].map((v,i)=>v+c.offsets[i]!);
 else{const[x,y]=point(w,c.offsets[1],c.offsets[2]);values=[((heading(w)+(determinant(w)>0?c.offsets[0]:-c.offsets[0]))%360+360)%360,x,y,Math.hypot(w.a,w.b)+c.offsets[3],Math.hypot(w.c,w.d)+c.offsets[4],degrees(Math.atan2(w.d,w.c))-heading(w)-90+c.offsets[5]];}
 for(const id of c.bones){const index=scene.indices.get(id)!,bone=frame.bones[index]!,local={...bone.applied},world={...bone.world};
  for(const from of c.properties){const relative=values[channels.indexOf(from.property)]!-from.offset;
   for(const to of from.to){let value=to.offset+relative*to.scale;if(c.clamp)value=Math.max(Math.min(to.offset,to.max),Math.min(Math.max(to.offset,to.max),value));const mix=c.mix[channels.indexOf(to.property)]!;if(mix===0)continue;
    if(c.localTarget){const key=to.property==='rotate'?'rotation':to.property,scale=key==='scaleX'||key==='scaleY';if(c.additive&&scale)local[key]*=1+(value-1)*mix;else if(!(scale&&local[key]===0))local[key]+=(c.additive?value:value-local[key])*mix;}
    else switch(to.property){
     case'rotate':rotateBasis(world,wrap(c.additive?value:value-heading(world))*mix);break;
     case'x':world.x+=(c.additive?value:value-world.x)*mix;break;
     case'y':world.y+=(c.additive?value:value-world.y)*mix;break;
     case'scaleX':case'scaleY':{const x=to.property==='scaleX',old=x?Math.hypot(world.a,world.b):Math.hypot(world.c,world.d),ratio=c.additive?1+(value-1)*mix:old>0?1+(value-old)*mix/old:1;if(x){world.a*=ratio;world.b*=ratio;}else{world.c*=ratio;world.d*=ratio;}break;}
     case'shearY':{const angle=degrees(Math.atan2(world.d,world.c)),delta=c.additive?value:wrap(value+90-angle+heading(world)),next=radians(angle+delta*mix),size=Math.hypot(world.c,world.d);world.c=Math.cos(next)*size;world.d=Math.sin(next)*size;break;}
    }
   }
  }
  if(c.localTarget){bone.applied=local;recompute(scene,frame,index);}else setWorld(scene,frame,index,world);
 }
}
function single(scene:InternalScene,frame:Evaluation,index:number,target:[number,number],compress:boolean,stretch:boolean,mix:number):void{
 const t=point(inverse(parentWorld(scene,frame,index)),...target),p=frame.bones[index]!.applied,dx=t[0]-p.x,dy=t[1]-p.y;
 const desired=degrees(Math.atan2(dy,dx))-p.shearX+(p.scaleX<0?180:0);p.rotation+=wrap(desired-p.rotation)*mix;
 const length=scene.bones[index]!.length*p.scaleX,distance=Math.hypot(dx,dy);
 if(length>1e-8&&((compress&&distance<length)||(stretch&&distance>length)))p.scaleX*=1+(distance/length-1)*mix;
 recompute(scene,frame,index);
}
export function applyIk(scene:InternalScene,frame:Evaluation,c:IkConstraintInput):void{
 if(c.mix===0)return;const t=frame.bones[scene.indices.get(c.target)!]!.world,target:[number,number]=[t.x,t.y],parent=scene.indices.get(c.bones[0]!)!;
 if(c.bones.length===1){single(scene,frame,parent,target,c.compress,c.stretch,c.mix);return;}
 const child=scene.indices.get(c.bones[1]!)!,upper={...frame.bones[parent]!.applied},lower={...frame.bones[child]!.applied};
 const[tx,ty]=point(inverse(parentWorld(scene,frame,parent)),...target);let dx=tx-upper.x,dy=ty-upper.y;
 const uniform=Math.abs(Math.abs(upper.scaleX)-Math.abs(upper.scaleY))<1e-6;if(!uniform||c.stretch)lower.y=0;
 const first=vector(affine(upper),lower.x,lower.y),l1=Math.hypot(...first);
 if(l1<1e-8){single(scene,frame,parent,target,false,c.stretch,c.mix);frame.bones[child]!.applied.rotation=0;recompute(scene,frame,child);return;}
 const second=scene.bones[child]!.length*Math.abs(lower.scaleX),reach=l1+second*Math.abs(upper.scaleX),initialDistance=Math.hypot(dx,dy),soft=c.softness*Math.abs(upper.scaleX)*(Math.abs(lower.scaleX)+1)/2;
 if(soft>0&&initialDistance>reach-soft&&initialDistance>0){const u=Math.max(0,Math.min(1,(initialDistance-reach+soft)/(2*soft))),eased=reach-soft+soft*(2*u-u*u);dx*=eased/initialDistance;dy*=eased/initialDistance;}
 const distance=Math.hypot(dx,dy);if(c.stretch&&uniform&&distance>reach&&reach>1e-8)upper.scaleX*=1+(distance/reach-1)*c.mix;
 const flip=upper.scaleX*upper.scaleY<0?-1:1,bend=c.bendPositive?1:-1,offset=Math.atan2(lower.y,lower.x),axis=(beta:number)=>offset+beta*bend*flip;
 const basis=affine({...upper,scaleX:frame.bones[parent]!.applied.scaleX,rotation:0}),endpoint=(beta:number)=>{const a=axis(beta);return vector(basis,lower.x+second*Math.cos(a),lower.y+second*Math.sin(a));},radius=(beta:number)=>Math.hypot(...endpoint(beta));
 let beta=0,best=Math.abs(radius(0)-distance),previous=radius(0)-distance;
 for(let k=1;k<=192;k++){const next=Math.PI*k/192,error=radius(next)-distance;if(Math.abs(error)<best){best=Math.abs(error);beta=next;}if(previous*error<0){let lo=Math.PI*(k-1)/192,hi=next,sign=previous;for(let n=0;n<48;n++){const mid=(lo+hi)/2,f=radius(mid)-distance;if(sign*f<=0)hi=mid;else{lo=mid;sign=f;}}beta=(lo+hi)/2;break;}previous=error;}
 const[qx,qy]=endpoint(beta),desiredParent=degrees(Math.atan2(dy,dx)-Math.atan2(qy,qx)),desiredChild=degrees(axis(beta))-lower.shearX+(lower.scaleX<0?180:0);
 upper.rotation+=wrap(desiredParent-upper.rotation)*c.mix;lower.rotation+=wrap(desiredChild-lower.rotation)*c.mix;frame.bones[parent]!.applied=upper;frame.bones[child]!.applied=lower;recompute(scene,frame,parent);
}
