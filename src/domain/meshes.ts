import type { BoneView, MeshView, SlotView } from './project.ts';
import {bindingPoints,previewBindingVertices,previewBindingWeights,nearestBindingEdge,type Point} from './binding.ts';
export type {Point} from './binding.ts';
export const meshPoints=(bones:readonly BoneView[],mesh:MeshView):Point[]=>bindingPoints(bones,mesh);
export function inTriangle(p:Point,a:Point,b:Point,c:Point) {
  const cross = (a:Point,b:Point) => (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
  const d=[cross(a,b),cross(b,c),cross(c,a)];
  const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  return Math.abs(area)>1e-10 && (d.every(v=>v>=-1e-6) || d.every(v=>v<=1e-6));
}
export function meshContains(bones:readonly BoneView[],mesh:MeshView,p:Point) {
  const points=meshPoints(bones,mesh);
  for(let i=0;i<mesh.triangles.length;i+=3) if(inTriangle(p,points[mesh.triangles[i]!]!,points[mesh.triangles[i+1]!]!,points[mesh.triangles[i+2]!]!)) return true;
  return false;
}
export function nearestVertex(points:Point[], p:Point, radius:number) {
  let hit:number|null=null, distance=radius;
  points.forEach((v,i)=>{const d=Math.hypot(v.x-p.x,v.y-p.y);if(d<=distance){distance=d;hit=i;}});
  return hit;
}
export const nearestEdge=(mesh:MeshView,points:Point[],point:Point,radius:number)=>nearestBindingEdge(mesh.edges,points,point,radius);
/** Legacy image previews keep their established public behavior. */
export const previewVertices=(bones:readonly BoneView[],mesh:MeshView,moves:{vertex:number;x:number;y:number}[]):MeshView=>previewBindingVertices(bones,mesh,moves);
export const previewWeights=(bones:readonly BoneView[],mesh:MeshView,bone:number,changes:{vertex:number;value:number}[]):MeshView=>previewBindingWeights(bones,mesh,bone,changes,'legacy');
export const withMesh=(slots:readonly SlotView[],id:number,mesh:MeshView)=>slots.map(s=>s.id===id?{...s,mesh}:s);
export function falloff(distance:number,radius:number,feather:number){return distance>radius?0:distance<=radius*(1-feather)?1:Math.max(0,(radius-distance)/Math.max(1e-9,radius*feather));}
