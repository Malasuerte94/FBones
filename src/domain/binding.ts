/** Actual dense attachment bindings. No image, UV or triangulation is required.
 * New Scene weight commands preserve all bind coordinates; legacy mesh edits
 * retain their older zero-row initialization policy explicitly. */
import type {BoneView,DenseBindingView} from './project.ts';
import {worldBones,transformPoint,inverseVector,localPoint,segmentDistance} from './rig.ts';
export interface Point {x:number;y:number}
export type WeightPreviewPolicy='scene'|'legacy';
type VertexMove={vertex:number;x:number;y:number};
type WeightChange={vertex:number;value:number};
function invalid(){return new Error('The binding contains an invalid vertex row or influence.');}
function bindingPoses(bones:readonly BoneView[],binding:DenseBindingView){
  const poses=new Map(worldBones(bones).map(b=>[b.id,b]));
  if(!binding.bones.length||new Set(binding.bones).size!==binding.bones.length)throw invalid();
  if(binding.bones.some(id=>!poses.has(id)))throw new Error('A binding influence bone no longer exists.');
  for(const row of binding.vertices){const sum=row.weights.reduce((a,b)=>a+b,0);if(row.weights.length!==binding.bones.length||row.positions.length!==binding.bones.length*2||!Number.isFinite(sum)||sum<=0||row.weights.some(w=>!Number.isFinite(w)||w<0)||row.positions.some(p=>!Number.isFinite(p)))throw invalid();}
  return poses;
}
export function bindingPoints(bones:readonly BoneView[],binding:DenseBindingView):Point[]{
  const poses=bindingPoses(bones,binding);
  return binding.vertices.map(row=>{
    let x=0,y=0;binding.bones.forEach((id,i)=>{const weight=row.weights[i]!;if(!weight)return;const p=transformPoint(poses.get(id)!,row.positions[i*2]!,row.positions[i*2+1]!);x+=p.x*weight;y+=p.y*weight;});
    if(!Number.isFinite(x)||!Number.isFinite(y))throw invalid();return{x,y};
  });
}
export function previewBindingVertices<T extends DenseBindingView>(bones:readonly BoneView[],binding:T,moves:readonly VertexMove[]):T{
  const points=bindingPoints(bones,binding),poses=bindingPoses(bones,binding),updates=new Map<number,VertexMove>();
  for(const move of moves){if(!Number.isInteger(move.vertex)||!points[move.vertex]||updates.has(move.vertex)||![move.x,move.y].every(v=>Number.isFinite(v)&&Math.abs(v)<=1_000_000))throw invalid();updates.set(move.vertex,move);}
  return{...binding,vertices:binding.vertices.map((row,index)=>{
    const move=updates.get(index);if(!move)return row;
    const sum=row.weights.reduce((a,b)=>a+b,0),dx=(move.x-points[index]!.x)/sum,dy=(move.y-points[index]!.y)/sum,positions=[...row.positions];
    binding.bones.forEach((id,i)=>{if(!row.weights[i])return;const delta=inverseVector(poses.get(id)!,dx,dy);positions[i*2]!+=delta.x;positions[i*2+1]!+=delta.y;});
    if(positions.some(p=>!Number.isFinite(p)))throw invalid();return{...row,positions};
  })};
}
export function previewBindingWeights<T extends DenseBindingView>(bones:readonly BoneView[],binding:T,bone:number,changes:readonly WeightChange[],policy:WeightPreviewPolicy='scene',lockedBones:readonly number[]=[]):T{
  const column=binding.bones.indexOf(bone);if(column<0){if(policy==='legacy')return binding;throw invalid();}
  const points=bindingPoints(bones,binding),poses=bindingPoses(bones,binding),updates=new Map<number,number>();
  for(const change of changes){if(!Number.isInteger(change.vertex)||!points[change.vertex]||updates.has(change.vertex)||!Number.isFinite(change.value)||change.value<0||change.value>1)throw invalid();updates.set(change.vertex,change.value);}
  // Legacy preview keeps its existing arithmetic/coordinate policy. Scene
  // manual locks protect OTHER influences; an explicit target overrides itself.
  const locks=new Set<number>();
  if(policy==='scene')for(const id of lockedBones){const i=binding.bones.indexOf(id);if(i<0||locks.has(i))throw invalid();locks.add(i);}
  locks.delete(column);
  return{...binding,vertices:binding.vertices.map((row,index)=>{
    const value=updates.get(index);if(value===undefined||row.weights.length===1)return row;
    if(locks.size){
      const other=row.weights.reduce((sum,w,i)=>sum+(i===column||locks.has(i)?0:w),0);
      if(other===0)return row;
      const protectedMass=row.weights.reduce((sum,w,i)=>locks.has(i)?Math.fround(sum+w):sum,0),available=Math.max(0,Math.fround(1-protectedMass)),wanted=Math.min(Math.fround(value),available);
      if(Object.is(wanted,row.weights[column]))return row;
      const remainder=Math.max(0,Math.fround(available-wanted)),weights=row.weights.map((w,i)=>i===column?wanted:locks.has(i)?w:Math.fround(w/other*remainder));
      let largest=-1;weights.forEach((w,i)=>{if(i!==column&&!locks.has(i)&&w>0&&(largest<0||w>=weights[largest]!))largest=i;});
      if(largest>=0){const sum=weights.reduce((a,b)=>Math.fround(a+b),0),residual=Math.fround(1-sum);weights[largest]=Math.fround(weights[largest]!+Math.max(-weights[largest]!,Math.min(1-weights[largest]!,residual)));}
      if(weights.some(w=>!Number.isFinite(w)||w<0)||Math.abs(weights.reduce((a,b)=>a+b,0)-1)>.0001)throw invalid();
      return{...row,weights};
    }
    const remaining=row.weights.reduce((sum,w,i)=>sum+(i===column?0:w),0);
    // Exact4.3.26 numeric boundary: there is no positive recipient for a sole
    // dominant influence's removed mass. Bind membership alone is insufficient.
    if(remaining===0)return row;
    const weights=row.weights.map((weight,i)=>i===column?value:remaining>0?weight*(1-value)/remaining:(i===(column===0?1:0)?1-value:0));
    if(policy==='scene')return{...row,weights};
    const positions=[...row.positions];
    weights.forEach((weight,i)=>{if(!weight){positions[i*2]=0;positions[i*2+1]=0;}else if(!row.weights[i]){const p=localPoint(poses.get(binding.bones[i]!),points[index]!.x,points[index]!.y);positions[i*2]=p.x;positions[i*2+1]=p.y;}});
    return{...row,weights,positions};
  })};
}
export function boundaryEdges(vertexCount:number):number[]{
  if(!Number.isInteger(vertexCount)||vertexCount<3||vertexCount>256)throw invalid();
  return Array.from({length:vertexCount},(_,i)=>[i,(i+1)%vertexCount]).flat();
}
export function bindingNeighbors(vertexCount:number,edges:readonly number[],triangles:readonly number[]=[]):number[][]{
  if(!Number.isInteger(vertexCount)||vertexCount<0||edges.length%2||triangles.length%3)throw invalid();
  const neighbors=Array.from({length:vertexCount},()=>new Set<number>());
  const connect=(a:number,b:number)=>{if(!Number.isInteger(a)||!Number.isInteger(b)||!neighbors[a]||!neighbors[b])throw invalid();if(a!==b){neighbors[a]!.add(b);neighbors[b]!.add(a);}};
  for(let i=0;i<edges.length;i+=2)connect(edges[i]!,edges[i+1]!);
  for(let i=0;i<triangles.length;i+=3){connect(triangles[i]!,triangles[i+1]!);connect(triangles[i+1]!,triangles[i+2]!);connect(triangles[i+2]!,triangles[i]!);}
  return neighbors.map(row=>[...row].sort((a,b)=>a-b));
}
export function nearestBindingEdge(edges:readonly number[],points:readonly Point[],point:Point,radius:number):[number,number]|null{
  let hit:[number,number]|null=null,distance=radius;
  for(let i=0;i<edges.length;i+=2){const a=edges[i]!,b=edges[i+1]!;if(!points[a]||!points[b])throw invalid();const d=segmentDistance(point.x,point.y,points[a]!,points[b]!);if(d<=distance){distance=d;hit=[a,b];}}return hit;
}
export function bindingWeightColor(weight:number):number{return(Math.round(255*weight)<<16)|(Math.round(70+140*(1-Math.abs(weight-.5)*2))<<8)|Math.round(255*(1-weight));}
