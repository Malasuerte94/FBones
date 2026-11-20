import type {ConstraintView,PathConstraintView,PathView,SlotView} from '../project.ts';
import {compose,degrees,determinant,heading,identity,localPose,affine,point,rotateBasis,setWorld} from './math.ts';
import {fail,type Affine,type Evaluation,type InternalScene,type SolveScene} from './types.ts';

type Point=[number,number];
type Cubic=[Point,Point,Point,Point];
type Influence={bone:number;x:number;y:number;weight:number};
type Sample={point:Point;angle:number};
const LENGTH_EPSILON=0.00001;
export interface PreparedPath {
 owner:number;
 vertices:Influence[][];
 closed:boolean;
 // Constant Speed measures the current world vertices. The other mode uses
 // the authored Setup lengths reproduced by the Spine JSON exporter.
 setupLengths:number[]|null;
}

function activePath(slot:SlotView|undefined):PathView|null {
 if(!slot||slot.activeAttachmentId==null)return null;
 return slot.attachments?.find(item=>item.id===slot.activeAttachmentId&&item.type==='path')?.path??null;
}

export function pathEvaluationWork(slots:readonly SlotView[],constraint:PathConstraintView,boneCount:number):number{
 const path=activePath(slots.find(slot=>slot.id===constraint.slot));
 if(!path)return 0;
 return path.vertices.length*(path.bones.length+14)+constraint.bones.length*boneCount;
}

export function pathInputSignature(scene:SolveScene):string {
 const inputs=(scene.constraints??[]).flatMap(c=>{
  if(c.type!=='path')return [];
  const slot=scene.slots?.find(item=>item.id===c.slot),path=activePath(slot);
  return [[slot?.id,slot?.activeAttachmentId,slot?.bone,path?.closed,path?.constantSpeed,path?.bones,path?.vertices]];
 });
 return inputs.length?JSON.stringify(inputs):'';
}

function transformVertices(vertices:Influence[][],world:(index:number)=>Affine):Point[] {
 return vertices.map(influences=>{
  let x=0,y=0;
  for(const influence of influences){
   const p=point(world(influence.bone),influence.x,influence.y);
   x+=p[0]*influence.weight;
   y+=p[1]*influence.weight;
  }
  return [x,y];
 });
}

function curves(vertices:Point[],closed:boolean):Cubic[] {
 const count=vertices.length/3-Number(!closed);
 return Array.from({length:count},(_,curve)=>{
  const start=1+curve*3;
  return [vertices[start]!,vertices[(start+1)%vertices.length]!,
          vertices[(start+2)%vertices.length]!,vertices[(start+3)%vertices.length]!];
 });
}

function at(curve:Cubic,t:number):Point {
 const [start,first,last,end]=curve,u=1-t;
 const a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;
 return [
  start[0]*a+first[0]*b+last[0]*c+end[0]*d,
  start[1]*a+first[1]*b+last[1]*c+end[1]*d,
 ];
}

function chordLengths(curve:Cubic,steps:number):number[] {
 let total=0,previous=curve[0];
 return Array.from({length:steps},(_,index)=>{
  const next=at(curve,(index+1)/steps);
  total+=Math.hypot(next[0]-previous[0],next[1]-previous[1]);
  previous=next;
  return total;
 });
}

function curveLengths(segments:Cubic[]):number[] {
 let total=0;
 return segments.map(segment=>total+=chordLengths(segment,4)[3]!);
}

export function preparePaths(scene:SolveScene,constraints:readonly ConstraintView[],indices:ReadonlyMap<number,number>,parents:readonly (number|null)[]):ReadonlyMap<number,PreparedPath> {
 const paths=new Map<number,PreparedPath>();
 let bindPose:Affine[]|undefined;
 for(const c of constraints){
  if(c.type!=='path'||paths.has(c.slot))continue;
  const slot=scene.slots?.find(item=>item.id===c.slot);
  const owner=slot&&indices.get(slot.bone);
  if(owner===undefined)fail('InvalidConstraint');
  const attachment=activePath(slot);
  if(!attachment)continue;
  const {bones,closed,constantSpeed,vertices,weighted}=attachment;
  if(!bones.length||new Set(bones).size!==bones.length||(!weighted&&(bones.length!==1||bones[0]!==slot!.bone))
    ||vertices.length<6||vertices.length>256||vertices.length%3!==0)fail('InvalidConstraint');
  const binding=bones.map(id=>indices.get(id)??fail('InvalidConstraint'));
  const influences=vertices.map(vertex=>{
   if(vertex.positions.length!==2*binding.length||vertex.weights.length!==binding.length)fail('InvalidConstraint');
   return binding.flatMap((bone,index)=>{
    const x=Math.fround(vertex.positions[index*2]!),y=Math.fround(vertex.positions[index*2+1]!);
    const weight=weighted?Math.fround(vertex.weights[index]!):1;
    if(![x,y,weight].every(Number.isFinite))fail('InvalidConstraint');
    return weight===0?[]:[{bone,x,y,weight}];
   });
  });
  let setupLengths:number[]|null=null;
  if(!constantSpeed){
   if(!bindPose){
    bindPose=[];
    for(const [index,bone] of scene.bones.entries()){
     const parent=parents[index]!;
     bindPose.push(compose(parent===null?identity:bindPose[parent]!,affine(localPose(bone))));
    }
   }
   const setupPoints=transformVertices(influences,index=>bindPose![index]!)
    .map(([x,y]):Point=>[Math.fround(x),Math.fround(y)]);
   setupLengths=curveLengths(curves(setupPoints,closed));
  }
  paths.set(c.slot,{owner,vertices:influences,closed,setupLengths});
 }
 return paths;
}

function pointAngle(from:Point,to:Point):number {
 return degrees(Math.atan2(to[1]-from[1],to[0]-from[0]));
}

function pointOnCurve(curve:Cubic,t:number):Sample {
 const [start,first,last,end]=curve;
 if(t<.001)return {point:at(curve,t),angle:pointAngle(start,first)};
 const u=1-t;
 const previous:Point=[
  u*u*start[0]+2*u*t*first[0]+t*t*last[0],
  u*u*start[1]+2*u*t*first[1]+t*t*last[1],
 ];
 const position=t===1?end:at(curve,t);
 return {point:position,angle:pointAngle(previous,position)};
}

function extend(origin:Point,angle:number,distance:number):Sample {
 const radians=angle*Math.PI/180;
 return {point:[origin[0]+Math.cos(radians)*distance,origin[1]+Math.sin(radians)*distance],angle};
}

function findSegment(lengths:readonly number[],distance:number,start:number):number {
 let first=start,last=lengths.length-1;
 while(first<last){
  const middle=(first+last)>>1;
  if(distance>lengths[middle]!)first=middle+1;
  else last=middle;
 }
 return first;
}

function segmentFraction(lengths:readonly number[],segment:number,distance:number):number {
 const start=lengths[segment-1]??0,width=lengths[segment]!-start;
 return width>0?(distance-start)/width:0;
}

function samplePath(vertices:Point[],path:PreparedPath,positionMode:PathConstraintView['positionMode'],position:number,spacingMode:PathConstraintView['spacingMode'],spaces:number[]):Sample[] {
 const segments=curves(vertices,path.closed),lengths=path.setupLengths??curveLengths(segments);
 const length=lengths.at(-1)!;
 if(!Number.isFinite(length))fail('NonFinite');
 if(positionMode==='percent')position*=length;
 const multiplier=spacingMode==='percent'?length:spacingMode==='proportional'?length/spaces.length:1;
 const subdivisions=new Map<number,number[]>();
 let curveIndex=0,subdivision=0;
 return spaces.map(space=>{
  position+=space*multiplier;
  let distance=position;
  if(path.closed){
   distance=length>0?distance%length:0;
   if(distance<0)distance+=length;
   curveIndex=0;subdivision=0;
  }else if(distance<0){
   const [start,first]=segments[0]!;
   return extend(start,pointAngle(start,first),distance);
  }else if(distance>length){
   const [,,last,end]=segments.at(-1)!;
   return extend(end,pointAngle(last,end),distance-length);
  }
  const index=findSegment(lengths,distance,curveIndex),curve=segments[index]!;
  if(index!==curveIndex)subdivision=0;
  curveIndex=index;
  let t=segmentFraction(lengths,index,distance);
  if(path.setupLengths===null){
   let chords=subdivisions.get(index);
   if(!chords){chords=chordLengths(curve,10);subdivisions.set(index,chords);}
   const offset=t*chords[9]!;
   subdivision=findSegment(chords,offset,subdivision);
   t=(subdivision+segmentFraction(chords,subdivision,offset))/10;
  }
  return pointOnCurve(curve,t);
 });
}

export function applyPath(scene:InternalScene,frame:Evaluation,c:PathConstraintView):void {
 const path=scene.paths.get(c.slot);
 if(!path||c.mixRotate===0&&c.mixX===0&&c.mixY===0)return;
 const targets=c.bones.map(id=>{
  const index=scene.indices.get(id)!;
  return {index,length:scene.bones[index]!.length,world:{...frame.bones[index]!.world}};
 });
 const tangent=c.rotateMode==='tangent',scale=c.rotateMode==='chainScale';
 const spaces=[0],worldLengths=targets.map(({length,world})=>Math.hypot(world.a*length,world.b*length));
 let sum=0;
 for(let i=0;i<targets.length-Number(tangent);i++){
  const {length}=targets[i]!,worldLength=worldLengths[i]!;
  let spacing=c.spacing;
  if(c.spacingMode!=='percent'&&length>=LENGTH_EPSILON){
   if(c.spacingMode==='proportional'){spacing=worldLength;sum+=worldLength;}
   else spacing=(c.spacingMode==='length'?Math.max(0,length+spacing):spacing)*(worldLength/length);
  }
  spaces.push(spacing);
 }
 if(c.spacingMode==='proportional'&&sum>0){
  const ratio=spaces.length*c.spacing/sum;
  for(let i=1;i<spaces.length;i++)spaces[i]!*=ratio;
 }
 const vertices=transformVertices(path.vertices,index=>frame.bones[index]!.world);
 const samples=samplePath(vertices,path,c.positionMode,c.position,c.spacingMode,spaces);
 const tip=c.rotateMode==='chain'&&c.rotation===0;
 const offset=c.rotation*(determinant(frame.bones[path.owner]!.world)>0?1:-1);
 let origin=samples[0]!.point;
 for(const [i,target] of targets.entries()){
  const {length,world}=target;
  world.x+=(origin[0]-world.x)*c.mixX;
  world.y+=(origin[1]-world.y)*c.mixY;
  const next=samples[i+1]??samples[i]!;
  const dx=next.point[0]-origin[0],dy=next.point[1]-origin[1];
  if(scale&&(c.spacingMode==='percent'||length>=LENGTH_EPSILON)&&worldLengths[i]!==0){
   const factor=1+(Math.hypot(dx,dy)/worldLengths[i]!-1)*c.mixRotate;
   world.a*=factor;
   world.b*=factor;
  }
  origin=next.point;
  if(c.mixRotate>0){
   const desired=tangent?samples[i]!.angle:spaces[i+1]===0?next.angle:degrees(Math.atan2(dy,dx));
   let delta=desired-heading(world);
   if(tip){
    const radians=delta*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
    origin=[origin[0]+(length*(cos*world.a-sin*world.b)-dx)*c.mixRotate,
            origin[1]+(length*(sin*world.a+cos*world.b)-dy)*c.mixRotate];
   }else delta+=offset;
   if(delta>180)delta-=360;
   else if(delta< -180)delta+=360;
   rotateBasis(world,delta*c.mixRotate);
  }
 }
 targets.sort((a,b)=>a.index-b.index);
 for(const {index,world} of targets)setWorld(scene,frame,index,world);
}
