import type {BoneView} from '../project.ts';
import {fail,type Affine,type Evaluation,type InternalScene,type LocalPose} from './types.ts';
export const identity:Affine={x:0,y:0,a:1,b:0,c:0,d:1};
export const radians=(n:number)=>n*Math.PI/180;
export const degrees=(n:number)=>n*180/Math.PI;
export function wrap(n:number):number{const v=((n+180)%360+360)%360-180;return v<=-180?180:v;}
export function localPose(b:BoneView):LocalPose{return{x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX??1,scaleY:b.scaleY??1,shearX:b.shearX??0,shearY:b.shearY??0};}
export function affine(p:LocalPose):Affine{const x=radians(p.rotation+p.shearX),y=radians(p.rotation+90+p.shearY);return{x:p.x,y:p.y,a:Math.cos(x)*p.scaleX,b:Math.sin(x)*p.scaleX,c:Math.cos(y)*p.scaleY,d:Math.sin(y)*p.scaleY};}
export function vector(m:Affine,x:number,y:number):[number,number]{return[m.a*x+m.c*y,m.b*x+m.d*y];}
export function point(m:Affine,x:number,y:number):[number,number]{const p=vector(m,x,y);return[p[0]+m.x,p[1]+m.y];}
export function compose(l:Affine,r:Affine):Affine{const[a,b]=vector(l,r.a,r.b),[c,d]=vector(l,r.c,r.d),[x,y]=point(l,r.x,r.y);return{a,b,c,d,x,y};}
export function determinant(m:Affine):number{return m.a*m.d-m.b*m.c;}
export function inverse(m:Affine):Affine{const det=determinant(m),norm=Math.max(Math.abs(m.a),Math.abs(m.b),Math.abs(m.c),Math.abs(m.d));if(!Number.isFinite(det)||norm===0||Math.abs(det)<=1e-12*norm*norm)fail('SingularTransform');const a=m.d/det,b=-m.b/det,c=-m.c/det,d=m.a/det;return{a,b,c,d,x:-a*m.x-c*m.y,y:-b*m.x-d*m.y};}
export function fromAffine(m:Affine,_reference:LocalPose):LocalPose{if(!finite(m))fail('NonFinite');const scaleX=Math.hypot(m.a,m.b),scaleY=Math.hypot(m.c,m.d)*(determinant(m)<0?-1:1),rotation=scaleX>0?heading(m):scaleY!==0?degrees(Math.atan2(m.d,m.c))-90:0,shearY=scaleX>0&&scaleY!==0?wrap(degrees(Math.atan2(m.d/scaleY,m.c/scaleY))-rotation-90):0;return{x:m.x,y:m.y,rotation,scaleX,scaleY,shearX:0,shearY};}
export function finite(value:Affine|LocalPose):boolean{return Object.values(value).every(Number.isFinite);}
export function heading(m:Affine):number{return degrees(Math.atan2(m.b,m.a));}
export function rotateBasis(m:Affine,angle:number):void{const s=Math.sin(radians(angle)),c=Math.cos(radians(angle));[m.a,m.b]=[c*m.a-s*m.b,s*m.a+c*m.b];[m.c,m.d]=[c*m.c-s*m.d,s*m.c+c*m.d];}
export function parentWorld(scene:InternalScene,frame:Evaluation,index:number):Affine{const p=scene.parents[index];return p===null?identity:frame.bones[p]!.world;}
export function recompute(scene:InternalScene,frame:Evaluation):void{for(let i=0;i<frame.bones.length;i++){const bone=frame.bones[i]!;bone.world=compose(parentWorld(scene,frame,i),affine(bone.applied));if(!finite(bone.world))fail('NonFinite');}}
export function setWorld(scene:InternalScene,frame:Evaluation,index:number,world:Affine):void{const bone=frame.bones[index]!;bone.applied=fromAffine(compose(inverse(parentWorld(scene,frame,index)),world),bone.applied);recompute(scene,frame);}
