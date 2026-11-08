import type { BoneView, MeshView } from './project.ts';
import { meshPoints, previewVertices } from './meshes.ts';
type Point=[number,number];
type Triangle=[number,number,number];
const EPS=1e-10;
const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const key=(a:number,b:number)=>`${Math.min(a,b)}:${Math.max(a,b)}`;
const vertex=(points:Point[],i:number)=>points[i]!;
function barycentric(p:Point,a:Point,b:Point,c:Point):Point3|null {
  const area=cross(a,b,c);if(Math.abs(area)<1e-12)return null;
  const x=cross(p,b,c)/area,y=cross(a,p,c)/area;return [x,y,1-x-y];
}
type Point3=[number,number,number];
function face(points:Point[],triangles:readonly number[],p:Point):[Triangle,Point3]|null{
  for(let i=triangles.length-3;i>=0;i-=3){const t:Triangle=[triangles[i]!,triangles[i+1]!,triangles[i+2]!];
    const b=barycentric(p,vertex(points,t[0]),vertex(points,t[1]),vertex(points,t[2]));if(b&&b.every(v=>v>=-1e-8))return[t,b];
  }return null;
}
function interpolate(values:Point[],t:Triangle,b:Point3):Point{
  const point:Point=[0,0];for(let i=0;i<3;i++){const p=vertex(values,t[i]!);point[0]+=p[0]*b[i]!;point[1]+=p[1]*b[i]!;}return point;
}
function fitPlane(uvs:Point[],world:Point[]){
  const m=Array.from({length:3},()=>Array<number>(5).fill(0));
  uvs.forEach((p,index)=>{const q=world[index]!,v=[p[0],p[1],1];for(let i=0;i<3;i++){for(let j=0;j<3;j++)m[i]![j]!+=v[i]!*v[j]!;m[i]![3]!+=v[i]!*q[0];m[i]![4]!+=v[i]!*q[1];}});
  for(let col=0;col<3;col++){
    let pivot=col;for(let i=col+1;i<3;i++)if(Math.abs(m[i]![col]!)>Math.abs(m[pivot]![col]!))pivot=i;
    [m[col],m[pivot]]=[m[pivot]!,m[col]!];const divisor=m[col]![col]!;if(!Number.isFinite(divisor)||Math.abs(divisor)<1e-12)throw Error('Collapsed image plane');
    for(let j=col;j<5;j++)m[col]![j]!/=divisor;
    for(let i=0;i<3;i++){if(i===col)continue;const factor=m[i]![col]!;for(let j=col;j<5;j++)m[i]![j]!-=factor*m[col]![j]!;}
  }
  const x:Point3=[m[0]![3]!,m[1]![3]!,m[2]![3]!],y:Point3=[m[0]![4]!,m[1]![4]!,m[2]![4]!];
  return {point:(p:Point):Point=>[x[0]*p[0]+x[1]*p[1]+x[2],y[0]*p[0]+y[1]*p[1]+y[2]],
    inverse:(p:Point):Point=>{const det=x[0]*y[1]-x[1]*y[0];if(!Number.isFinite(det)||Math.abs(det)<1e-12)throw Error('Collapsed image plane');const u=p[0]-x[2],v=p[1]-y[2];return[(u*y[1]-v*x[1])/det,(v*x[0]-u*y[0])/det];}};
}
function intersects(a:Point,b:Point,c:Point,d:Point){const u=cross(a,b,c),v=cross(a,b,d),s=cross(c,d,a),t=cross(c,d,b);return((u>EPS&&v< -EPS)||(u< -EPS&&v>EPS))&&((s>EPS&&t< -EPS)||(s< -EPS&&t>EPS));}
function oriented(t:Triangle,points:Point[]):Triangle{return cross(vertex(points,t[0]),vertex(points,t[1]),vertex(points,t[2]))<0?[t[0],t[2],t[1]]:t;}
function adjacency(triangles:Triangle[]){
  const map=new Map<string,{u:number;v:number;faces:number[]}>();
  triangles.forEach((t,i)=>{for(let j=0;j<3;j++){const a=t[j]!,b=t[(j+1)%3]!,id=key(a,b);let edge=map.get(id);if(!edge){edge={u:Math.min(a,b),v:Math.max(a,b),faces:[]};map.set(id,edge);}edge.faces.push(i);}});
  return [...map.values()].sort((a,b)=>a.u-b.u||a.v-b.v);
}
function angle(t:Triangle,points:Point[]){let minimum=Infinity;for(let i=0;i<3;i++){const a=vertex(points,t[i]!),b=vertex(points,t[(i+1)%3]!),c=vertex(points,t[(i+2)%3]!);const ux=b[0]-a[0],uy=b[1]-a[1],vx=c[0]-a[0],vy=c[1]-a[1];minimum=Math.min(minimum,Math.atan2(Math.abs(ux*vy-uy*vx),ux*vx+uy*vy));}return minimum;}
function improve(triangles:Triangle[],points:Point[],fixed:Set<string>,measured:Point[]){
  type Edge={u:number;v:number;faces:number[]};
  const edges=new Map<number,Edge>(),pending=new Set<number>(),heap:number[]=[];
  // Preserve lexicographic edge priority without aliasing indices above255.
  const encode=(u:number,v:number)=>Math.min(u,v)*points.length+Math.max(u,v);
  const enqueue=(id:number)=>{if(pending.has(id))return;pending.add(id);let i=heap.length;heap.push(id);while(i>0){const parent=(i-1)>>1;if(heap[parent]!<=id)break;heap[i]=heap[parent]!;i=parent;heap[i]=id;}};
  const pop=()=>{const value=heap[0]!,last=heap.pop()!;pending.delete(value);if(heap.length){heap[0]=last;let i=0;while(true){const left=i*2+1,right=left+1;if(left>=heap.length)break;let child=right<heap.length&&heap[right]!<heap[left]!?right:left;if(heap[i]!<=heap[child]!)break;[heap[i],heap[child]]=[heap[child]!,heap[i]!];i=child;}}return value;};
  const add=(face:number,t:Triangle)=>{for(let i=0;i<3;i++){const a=t[i]!,b=t[(i+1)%3]!,id=encode(a,b);let e=edges.get(id);if(!e){e={u:Math.min(a,b),v:Math.max(a,b),faces:[]};edges.set(id,e);}e.faces.push(face);e.faces.sort((a,b)=>a-b);enqueue(id);}};
  const remove=(face:number,t:Triangle)=>{for(let i=0;i<3;i++){const id=encode(t[i]!,t[(i+1)%3]!),e=edges.get(id);if(!e)continue;e.faces=e.faces.filter(i=>i!==face);if(!e.faces.length)edges.delete(id);}};
  triangles.forEach((t,i)=>add(i,t));
  const quality=triangles.map(t=>angle(t,measured));let flips=0;
  while(heap.length&&flips<points.length*points.length*2){
    const e=edges.get(pop());if(!e||e.faces.length!==2||fixed.has(key(e.u,e.v)))continue;const{u,v,faces}=e,firstIndex=faces[0]!,secondIndex=faces[1]!,a=triangles[firstIndex]!,b=triangles[secondIndex]!,p=a.find(i=>i!==u&&i!==v)!,q=b.find(i=>i!==u&&i!==v)!;
    if(p===q||edges.has(encode(p,q))||!intersects(vertex(points,p),vertex(points,q),vertex(points,u),vertex(points,v))||!intersects(vertex(measured,p),vertex(measured,q),vertex(measured,u),vertex(measured,v)))continue;
    const first=oriented([p,q,u],points),second=oriented([q,p,v],points),qa=angle(first,measured),qb=angle(second,measured);
    const before=Math.min(quality[firstIndex]!,quality[secondIndex]!),after=Math.min(qa,qb);
    if(!(after>before+1e-9 || (Math.abs(after-before)<=1e-9&&encode(p,q)<encode(u,v))))continue;
    remove(firstIndex,a);remove(secondIndex,b);triangles[firstIndex]=first;triangles[secondIndex]=second;quality[firstIndex]=qa;quality[secondIndex]=qb;add(firstIndex,first);add(secondIndex,second);flips++;
  }
}
function measuredQuality(triangles:Triangle[],points:Point[],fixed:Set<string>,world?:readonly {x:number;y:number}[]){
  improve(triangles,points,fixed,points);
  if(world){if(world.length!==points.length||world.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Invalid measured vertices');const xmin=Math.min(...world.map(p=>p.x)),ymin=Math.min(...world.map(p=>p.y)),scale=Math.max(Math.max(...world.map(p=>p.x))-xmin,Math.max(...world.map(p=>p.y))-ymin);if(scale<=0)throw Error('Collapsed geometry');const measured:Point[]=world.map(p=>[(p.x-xmin)/scale,(p.y-ymin)/scale]);improve(triangles,points,fixed,measured);}
}
/** Pure bounded constrained triangulation used only for live viewport previews.
 * Rust repeats authoritative validation on release; no IPC occurs per frame. */
export function retriangulate(uvs:readonly number[],hull:number,constraints:readonly number[],world?:readonly {x:number;y:number}[]):number[]{
  const n=uvs.length/2;if(!Number.isInteger(n)||n<3||n>512||hull<3||hull>n||constraints.length%2||uvs.some(v=>!Number.isFinite(v)))throw Error('Invalid mesh');
  const points:Point[]=Array.from({length:n},(_,i)=>[uvs[i*2]!,uvs[i*2+1]!]);
  for(let i=0;i<n;i++)for(let j=0;j<i;j++)if(Math.abs(points[i]![0]-points[j]![0])<EPS&&Math.abs(points[i]![1]-points[j]![1])<EPS)throw Error('Duplicate vertex');
  const requested:Array<[number,number]>=Array.from({length:hull},(_,i)=>[i,(i+1)%hull]);
  for(let i=0;i<constraints.length;i+=2){const a=constraints[i]!,b=constraints[i+1]!;if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=n||b>=n||a===b)throw Error('Invalid edge');requested.push([a,b]);}
  for(const[a,b]of requested)for(const[c,d]of requested)if(intersects(vertex(points,a),vertex(points,b),vertex(points,c),vertex(points,d)))throw Error('Crossed constraints');
  const area=points.slice(0,hull).reduce((s,p,i)=>{const q=points[(i+1)%hull]!;return s+p[0]*q[1]-p[1]*q[0];},0);if(Math.abs(area)<EPS)throw Error('Collapsed boundary');
  const polygon=Array.from({length:hull},(_,i)=>i);if(area<0)polygon.reverse();const triangles:Triangle[]=[];
  while(polygon.length>3){let found=false;for(let i=0;i<polygon.length;i++){
    const a=polygon[(i+polygon.length-1)%polygon.length]!,b=polygon[i]!,c=polygon[(i+1)%polygon.length]!;if(cross(vertex(points,a),vertex(points,b),vertex(points,c))<=EPS)continue;
    if(polygon.some(j=>{if(j===a||j===b||j===c)return false;const w=barycentric(vertex(points,j),vertex(points,a),vertex(points,b),vertex(points,c));return w&&w.every(v=>v>=-EPS);}))continue;
    triangles.push([a,b,c]);polygon.splice(i,1);found=true;break;
  }if(!found)throw Error('Invalid boundary');}
  triangles.push(oriented([polygon[0]!,polygon[1]!,polygon[2]!],points));
  for(let index=hull;index<n;index++){
    let found:[number,Triangle,Point3]|null=null;for(let i=0;i<triangles.length;i++){const t=triangles[i]!,w=barycentric(vertex(points,index),vertex(points,t[0]),vertex(points,t[1]),vertex(points,t[2]));if(w&&w.every(v=>v>=-EPS)){found=[i,t,w];break;}}
    if(!found)throw Error('Vertex outside boundary');const [i,t,bary]=found,zero=bary.findIndex(v=>Math.abs(v)<EPS);
    if(zero>=0){const a=t[(zero+1)%3]!,b=t[(zero+2)%3]!,next:Triangle[]=[];for(const tri of triangles){if(tri.includes(a)&&tri.includes(b)){const c=tri.find(v=>v!==a&&v!==b)!;next.push(oriented([a,index,c],points),oriented([index,b,c],points));}else next.push(tri);}triangles.splice(0,triangles.length,...next);}
    else{triangles.splice(i,1);for(let j=0;j<3;j++)triangles.push(oriented([t[j]!,t[(j+1)%3]!,index],points));}
  }
  const fixed=new Set<string>();
  for(const[a,b]of requested){const pa=vertex(points,a),pb=vertex(points,b),dx=pb[0]-pa[0],dy=pb[1]-pa[1],length=dx*dx+dy*dy;
    const chain=points.flatMap((p,i)=>{const t=((p[0]-pa[0])*dx+(p[1]-pa[1])*dy)/length;return t>=-EPS&&t<=1+EPS&&Math.abs(cross(pa,pb,p))<EPS?[{t,i}]:[];}).sort((a,b)=>a.t-b.t);
    for(let i=0;i<chain.length-1;i++){const start=chain[i]!.i,end=chain[i+1]!.i,id=key(start,end),seen=new Set<string>();let completed=false;
      for(let step=0;step<n*n*4;step++){
        const adjacent=adjacency(triangles);if(adjacent.some(e=>key(e.u,e.v)===id)){fixed.add(id);completed=true;break;}
        const signature=adjacent.map(e=>key(e.u,e.v)).join(';');if(seen.has(signature))throw Error('Cannot insert edge');seen.add(signature);
        const choices:Array<{crossing:boolean;first:number;second:number;p:number;q:number;u:number;v:number}>=[];
        for(const{u,v,faces}of adjacent){if(faces.length!==2||fixed.has(key(u,v))||!intersects(vertex(points,start),vertex(points,end),vertex(points,u),vertex(points,v)))continue;
          const p=triangles[faces[0]!]!.find(i=>i!==u&&i!==v)!,q=triangles[faces[1]!]!.find(i=>i!==u&&i!==v)!;if(p===q||!intersects(vertex(points,p),vertex(points,q),vertex(points,u),vertex(points,v)))continue;
          if([...fixed].some(k=>{const[a,b]=k.split(':').map(Number);return intersects(vertex(points,p),vertex(points,q),vertex(points,a!),vertex(points,b!));}))continue;
          choices.push({crossing:intersects(vertex(points,start),vertex(points,end),vertex(points,p),vertex(points,q)),first:faces[0]!,second:faces[1]!,p,q,u,v});
        }
        choices.sort((a,b)=>Number(a.crossing)-Number(b.crossing));const choice=choices[0];if(!choice)throw Error('Cannot insert edge');triangles[choice.first]=oriented([choice.p,choice.q,choice.u],points);triangles[choice.second]=oriented([choice.q,choice.p,choice.v],points);
      }if(!completed)throw Error('Edge insertion limit exceeded');
    }
  }
  measuredQuality(triangles,points,fixed,world);
  return triangles.flat();
}
function retessellateExisting(mesh:MeshView,uvs:number[],world:readonly {x:number;y:number}[]):number[]{
  const points:Point[]=Array.from({length:uvs.length/2},(_,i)=>[uvs[i*2]!,uvs[i*2+1]!]);
  const triangles:Triangle[]=Array.from({length:mesh.triangles.length/3},(_,i)=>[mesh.triangles[i*3]!,mesh.triangles[i*3+1]!,mesh.triangles[i*3+2]!]);
  if(triangles.some(t=>cross(vertex(points,t[0]),vertex(points,t[1]),vertex(points,t[2]))<=EPS))return retriangulate(uvs,mesh.hull,mesh.edges,world);
  const fixed=new Set<string>(),present=new Set(adjacency(triangles).map(e=>key(e.u,e.v)));
  for(let i=0;i<mesh.hull;i++)fixed.add(key(i,(i+1)%mesh.hull));for(let i=0;i<mesh.edges.length;i+=2)fixed.add(key(mesh.edges[i]!,mesh.edges[i+1]!));
  if([...fixed].some(k=>!present.has(k)))return retriangulate(uvs,mesh.hull,mesh.edges,world);
  measuredQuality(triangles,points,fixed,world);return triangles.flat();
}
/** Setup changes UVs to follow image pixels and retessellates live; deformation
 * deliberately keeps UVs/topology. Invalid drafts keep the last valid mesh. */
export function previewMeshEdit(bones:readonly BoneView[],mesh:MeshView,moves:readonly{vertex:number;x:number;y:number}[],editUvs=true):MeshView{
  try{
    if(!editUvs)return previewVertices(bones,mesh,[...moves]);
    const uvs:Point[]=Array.from({length:mesh.uvs.length/2},(_,i)=>[mesh.uvs[i*2]!,mesh.uvs[i*2+1]!]),world:Point[]=meshPoints(bones,mesh).map(p=>[p.x,p.y]);const plane=fitPlane(uvs,world),nextUvs=[...mesh.uvs];
    const mapped=moves.map(m=>{if(m.vertex<0||m.vertex>=mesh.vertices.length||!Number.isFinite(m.x)||!Number.isFinite(m.y))throw Error('Invalid vertex');const p:Point=[m.x,m.y],f=face(world,mesh.triangles,p),uv=(f?interpolate(uvs,...f):plane.inverse(p)).map(v=>Math.min(1,Math.max(0,v)))as Point;nextUvs[m.vertex*2]=Math.fround(uv[0]);nextUvs[m.vertex*2+1]=Math.fround(uv[1]);const t=face(uvs,mesh.triangles,uv),point=t?interpolate(world,...t):plane.point(uv);return{vertex:m.vertex,x:point[0],y:point[1]};});
    const result=previewVertices(bones,mesh,mapped);result.uvs=nextUvs;result.triangles=retessellateExisting(mesh,nextUvs,meshPoints(bones,result));return result;
  }catch{return mesh;}
}
