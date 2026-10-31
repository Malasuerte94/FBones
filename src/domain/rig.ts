import type { BoneView, RigEdit } from './project.ts';
export interface Affine {a:number;b:number;c:number;d:number;worldX:number;worldY:number}
export interface WorldBone extends BoneView,Affine {angle:number;tipX:number;tipY:number;depth:number}
export const radians=(angle:number)=>angle*Math.PI/180;
const identity:Affine={a:1,b:0,c:0,d:1,worldX:0,worldY:0};
export function transformPoint(m:Affine,x:number,y:number){return{x:m.worldX+m.a*x+m.c*y,y:m.worldY+m.b*x+m.d*y};}
export function inverseVector(m:Affine,x:number,y:number){const det=m.a*m.d-m.b*m.c;if(!Number.isFinite(det)||Math.abs(det)<1e-8)throw Error('This bone transform cannot be inverted. Use nonzero scale and nonparallel axes.');return{x:(m.d*x-m.c*y)/det,y:(-m.b*x+m.a*y)/det};}
export function composeAffine(p:Affine,m:Affine):Affine{const position=transformPoint(p,m.worldX,m.worldY);return{worldX:position.x,worldY:position.y,a:p.a*m.a+p.c*m.b,b:p.b*m.a+p.d*m.b,c:p.a*m.c+p.c*m.d,d:p.b*m.c+p.d*m.d};}
function localAffine(b:BoneView):Affine{const x=radians(b.rotation+(b.shearX??0)),y=radians(b.rotation+(b.shearY??0));return{worldX:b.x,worldY:b.y,a:Math.cos(x)*(b.scaleX??1),b:Math.sin(x)*(b.scaleX??1),c:-Math.sin(y)*(b.scaleY??1),d:Math.cos(y)*(b.scaleY??1)};}
export function worldBones(bones:readonly BoneView[]):WorldBone[]{const poses=new Map<number,WorldBone>();return bones.map(bone=>{const parent=bone.parent===null?undefined:poses.get(bone.parent);if(bone.parent!==null&&!parent)throw Error('Invalid bone hierarchy.');const w=bone.evaluatedWorld,m=w?{worldX:w.x,worldY:w.y,a:w.a,b:w.b,c:w.c,d:w.d}:composeAffine(parent??identity,localAffine(bone));const pose={...bone,...m,angle:Math.atan2(m.b,m.a)*180/Math.PI,tipX:m.worldX+m.a*bone.length,tipY:m.worldY+m.b*bone.length,depth:parent?parent.depth+1:0};poses.set(bone.id,pose);return pose;});}
export function localPoint(parent:Affine|undefined,x:number,y:number){if(!parent)return{x,y};return inverseVector(parent,x-parent.worldX,y-parent.worldY);}
export function creation(bones:readonly BoneView[],parentId:number,start:{x:number;y:number},end:{x:number;y:number}):RigEdit&{type:'create'}{const parent=worldBones(bones).find(b=>b.id===parentId);if(!parent)throw Error('Select a parent bone first.');const a=localPoint(parent,start.x,start.y),b=localPoint(parent,end.x,end.y);return{type:'create',parent:parentId,...a,rotation:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,length:Math.hypot(b.x-a.x,b.y-a.y)};}
type TransformEdit=Extract<RigEdit,{type:'transformBones'}>;
export function previewTransformBones(bones:readonly BoneView[],edit:TransformEdit):BoneView[]{
 if(edit.localAxes&&edit.mode!=='scale')throw Error('Local-axis factors are supported by Scale only.');
 const worlds=new Map(worldBones(bones).map(b=>[b.id,b])),selected=new Set(edit.ids);
 const top=new Set(edit.ids.filter(id=>{let p=worlds.get(id)?.parent;while(p!==null&&p!==undefined){if(selected.has(p))return false;p=worlds.get(p)?.parent;}return true;}));
 return bones.map(b=>{
  if(!top.has(b.id))return b;const world=worlds.get(b.id);if(!world)return b;const parent=worlds.get(b.parent??-1);
  if(edit.localAxes){
   const det=world.a*world.d-world.b*world.c;
   const nextDet=det*edit.scaleX*edit.scaleY;
   if(!Number.isFinite(nextDet)||Math.abs(det)<1e-8||Math.abs(nextDet)<1e-8||Math.abs(edit.scaleX)<1e-8||Math.abs(edit.scaleY)<1e-8)throw Error('Use nonzero scale factors and a nonsingular bone transform.');
   return{...b,scaleX:(b.scaleX??1)*edit.scaleX,scaleY:(b.scaleY??1)*edit.scaleY};
  }
  if(edit.mode==='translate')return{...b,...localPoint(parent,world.worldX+edit.dx,world.worldY+edit.dy)};
  let a:number,bb:number,c:number,d:number;
  if(edit.mode==='scale'){a=edit.scaleX;bb=0;c=0;d=edit.scaleY;}else if(edit.mode==='shear'){const x=radians(edit.shearX),y=radians(edit.shearY);a=Math.cos(x);bb=Math.sin(x);c=-Math.sin(y);d=Math.cos(y);}else{const angle=radians(edit.rotation);a=Math.cos(angle);bb=Math.sin(angle);c=-bb;d=a;}
  const ownOrigin=edit.mode==='pose'||edit.individual===true;
  const px=ownOrigin?world.worldX:edit.pivotX,py=ownOrigin?world.worldY:edit.pivotY;
  const changed=composeAffine({a,b:bb,c,d,worldX:px-a*px-c*py,worldY:py-bb*px-d*py},world);
  const origin=localPoint(parent,changed.worldX,changed.worldY),x=parent?inverseVector(parent,changed.a,changed.b):{x:changed.a,y:changed.b},y=parent?inverseVector(parent,changed.c,changed.d):{x:changed.c,y:changed.d};
  const sx=(b.scaleX??1)<0?-1:1,sy=(b.scaleY??1)<0?-1:1,ax=Math.atan2(x.y*sx,x.x*sx)*180/Math.PI,ay=Math.atan2(-y.x*sy,y.y*sy)*180/Math.PI;
  const rotation=ax-(b.shearX??0);return{...b,...origin,rotation,scaleX:Math.hypot(x.x,x.y)*sx,scaleY:Math.hypot(y.x,y.y)*sy,shearY:ay-rotation};
 });
}
export function previewEdit(bones:readonly BoneView[],edit:RigEdit):BoneView[]{
 if(edit.type==='transformBones')return previewTransformBones(bones,edit);
 if(edit.type==='create')return[...bones,{...edit,id:-1,name:'New bone',scaleX:1,scaleY:1,shearX:0,shearY:0}];
 if(!['move','tip','length'].includes(edit.type))return[...bones];
 if(edit.type!=='move'&&edit.type!=='tip'&&edit.type!=='length')return[...bones];
 const poses=worldBones(bones),bone=poses.find(b=>b.id===edit.id);if(!bone)return[...bones];
 if(edit.type==='length'){const axis=Math.hypot(bone.a,bone.b);if(axis<1e-8)throw Error('Use nonzero X scale before changing length.');const a=radians(bone.angle),length=Math.max(0,((edit.x-bone.worldX)*Math.cos(a)+(edit.y-bone.worldY)*Math.sin(a))/axis);return bones.map(b=>b.id===bone.id?{...b,length}:b);}
 const parent=poses.find(b=>b.id===bone.parent),target=localPoint(parent,edit.x,edit.y);
 if(edit.type==='move')return bones.map(b=>b.id===bone.id?{...b,...target}:b);
 const dx=target.x-bone.x,dy=target.y-bone.y,sx=bone.scaleX??1;if(Math.abs(sx)<1e-8)throw Error('Use nonzero X scale before changing length.');
 return bones.map(b=>b.id===bone.id?{...b,length:Math.hypot(dx,dy)/Math.abs(sx),rotation:Math.atan2(dy,dx)*180/Math.PI-(bone.shearX??0)-(sx<0?180:0)}:b);

}
export function hierarchy(bones: readonly BoneView[]): BoneView[] {
  const rows: BoneView[] = [];
  const visit = (parent: number | null) => {
    for (const bone of bones) if (bone.parent === parent) { rows.push(bone); visit(bone.id); }
  };
  visit(null); return rows;
}
export function canParent(bones: readonly BoneView[], id: number, parent: number): boolean {
  const map = new Map(bones.map(b => [b.id, b]));
  let next: number | null = parent;
  for (let count = 0; next !== null && count <= bones.length; count++) {
    if (next === id || !map.has(next)) return false;
    next = map.get(next)!.parent;
  }
  return next === null;
}
export function segmentDistance(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}
