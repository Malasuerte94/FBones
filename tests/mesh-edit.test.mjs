import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {previewMeshEdit,retriangulate} from '../src/domain/meshEdit.ts';
import {meshPoints} from '../src/domain/meshes.ts';
const bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0}];
const quad={weighted:false,bones:[0],uvs:[0,0,1,0,1,1,0,1],triangles:[0,1,2,2,3,0],edges:[0,1,1,2,2,3,3,0],hull:4,vertices:[[-50,50],[50,50],[50,-50],[-50,-50]].map(p=>({weights:[1],positions:p}))};
const edgeSet=triangles=>new Set(triangles.flatMap((_,i)=>i%3?[]:[0,1,2].map(j=>{const a=triangles[i+j],b=triangles[i+(j+1)%3];return`${Math.min(a,b)}:${Math.max(a,b)}`;})));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
test('setup preview follows image pixels while deformation preserves UVs and topology',()=>{
 const before=structuredClone(quad),setup=previewMeshEdit(bones,quad,[{vertex:0,x:-30,y:40}]);
 near(setup.uvs[0],.2);near(setup.uvs[1],.1);const point=meshPoints(bones,setup)[0];near(point.x,-30);near(point.y,40);
 const deformed=previewMeshEdit(bones,quad,[{vertex:0,x:-80,y:80}],false);assert.deepEqual(deformed.uvs,quad.uvs);assert.deepEqual(deformed.triangles,quad.triangles);near(meshPoints(bones,deformed)[0].x,-80);assert.deepEqual(quad,before);
 assert.equal(previewMeshEdit(bones,quad,[{vertex:0,x:50,y:-50}]),quad);
});
test('free diagonal quality follows posed geometry and explicit constraints remain fixed',()=>{
 const uvs=[0,0,1,0,1,1,0,1],world=[{x:0,y:0},{x:100,y:0},{x:100,y:10},{x:0,y:100}];
 assert.ok(edgeSet(retriangulate(uvs,4,[],world)).has('0:2'));
 assert.ok(edgeSet(retriangulate(uvs,4,[1,3],world)).has('1:3'));
 assert.throws(()=>retriangulate(uvs,4,[0,2,1,3]),/Crossed/);
 assert.throws(()=>retriangulate([...uvs,2,2],4,[]),/outside/);
});
test('constrained live retessellation covers jittered surfaces without inverted or missing faces',()=>{
 let seed=8;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let sample=0;sample<12;sample++){
  const uvs=[0,0,1,0,1,1,0,1];for(let y=1;y<=4;y++)for(let x=1;x<=4;x++)uvs.push(x/5+(random()-.5)*.07,y/5+(random()-.5)*.07);
  const triangles=retriangulate(uvs,4,[4,5,5,6,6,7]);assert.equal(triangles.length/3,2*(uvs.length/2)-6);
  let area=0;for(let i=0;i<triangles.length;i+=3){const[a,b,c]=triangles.slice(i,i+3);const cross=(uvs[b*2]-uvs[a*2])*(uvs[c*2+1]-uvs[a*2+1])-(uvs[b*2+1]-uvs[a*2+1])*(uvs[c*2]-uvs[a*2]);assert.ok(cross>0);area+=cross/2;}
  near(area,1);const edges=edgeSet(triangles);for(const edge of ['4:5','5:6','6:7'])assert.ok(edges.has(edge));
 }
});

test('setup preview uses full affine bones and collapsed deformation drafts stay safe',()=>{
 const affine=[{...bones[0],x:12,y:-7,rotation:30,scaleX:1.7,scaleY:.8,shearX:20,shearY:-10}];
 const source=structuredClone(quad),world=meshPoints(affine,quad);
 const target={x:world[0].x*.7+world[1].x*.2+world[3].x*.1,y:world[0].y*.7+world[1].y*.2+world[3].y*.1};
 const result=previewMeshEdit(affine,source,[{vertex:0,...target}]);near(result.uvs[0],.2);near(result.uvs[1],.1);near(meshPoints(affine,result)[0].x,target.x);near(meshPoints(affine,result)[0].y,target.y);
 assert.equal(previewMeshEdit([{...bones[0],scaleX:0}],quad,[{vertex:0,x:10,y:10}],false),quad);
});

// Own deterministic surfaces; no source-project geometry or extracted fixtures.
function grid(count){
 let seed=819;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;},uvs=[0,0,1,0,1,1,0,1],columns=Math.ceil(Math.sqrt(count-4)),rows=Math.ceil((count-4)/columns);
 for(let i=0;i<count-4;i++)uvs.push(((i%columns)+1+(random()-.5)*.2)/(columns+1),(Math.floor(i/columns)+1+(random()-.5)*.2)/(rows+1));
 return surface(uvs,4);
}
function convex(count){return surface(Array.from({length:count},(_,i)=>{const angle=i/count*Math.PI*2;return[.5+Math.cos(angle)*.49,.5+Math.sin(angle)*.49];}).flat(),count);}
function surface(uvs,hull){return{uvs,hull,world:Array.from({length:uvs.length/2},(_,i)=>({x:uvs[i*2]*100+uvs[i*2+1]*13,y:uvs[i*2+1]*70}))};}
function verifySurface(shape,triangles,constraints=[]){
 const n=shape.uvs.length/2,used=new Set(),unique=new Set();assert.equal(triangles.length/3,2*n-shape.hull-2);let area=0;
 for(let i=0;i<triangles.length;i+=3){const [a,b,c]=triangles.slice(i,i+3);for(const index of [a,b,c]){assert.ok(Number.isInteger(index)&&index>=0&&index<n);used.add(index);}assert.equal(new Set([a,b,c]).size,3);const id=[a,b,c].sort((a,b)=>a-b).join(':');assert.equal(unique.has(id),false);unique.add(id);const cross=(shape.uvs[b*2]-shape.uvs[a*2])*(shape.uvs[c*2+1]-shape.uvs[a*2+1])-(shape.uvs[b*2+1]-shape.uvs[a*2+1])*(shape.uvs[c*2]-shape.uvs[a*2]);assert.ok(cross>0);area+=cross/2;}
 assert.equal(used.size,n);let hullArea=0;for(let i=0;i<shape.hull;i++){const j=(i+1)%shape.hull;hullArea+=shape.uvs[i*2]*shape.uvs[j*2+1]-shape.uvs[i*2+1]*shape.uvs[j*2];}near(area,Math.abs(hullArea)/2);const edges=edgeSet(triangles);for(let i=0;i<constraints.length;i+=2)assert.ok(edges.has(`${Math.min(constraints[i],constraints[i+1])}:${Math.max(constraints[i],constraints[i+1])}`));
}

test('live edge priority retains exact old 256-vertex convex and grid topology',()=>{
 // Frozen from the actual production helper before the capacity/stride edit.
 for(const [shape,expected]of [[grid(256),'23c274fc57696cda453f88a82906c5688460a864500acff64e43656fa2110d6a'],[convex(256),'ae0e7322fd2184869e55871d37ea2cf3334308e58ce13ee3ef58a1df35364fe7']]){
  const triangles=retriangulate(shape.uvs,shape.hull,[],shape.world);assert.equal(createHash('sha256').update(JSON.stringify(triangles)).digest('hex'),expected);verifySurface(shape,triangles);
 }
});

test('large convex and jittered surfaces use every high-index vertex with complete positive-area coverage through 512',()=>{
 for(const count of [257,301,308,512])for(const shape of [grid(count),convex(count)]){const before=structuredClone(shape),triangles=retriangulate(shape.uvs,shape.hull,[],shape.world);verifySurface(shape,triangles);assert.ok(triangles.includes(count-1));assert.deepEqual(shape,before);assert.ok(triangles.length<=3072);}
 const tooLarge=grid(513);assert.throws(()=>retriangulate(tooLarge.uvs,tooLarge.hull,[],tooLarge.world),/Invalid mesh/);
});

test('distinct high-index constrained edges survive quality improvement without the old radix collision',()=>{
 const uvs=grid(308).uvs;for(const axis of [0,1])[uvs[8+axis],uvs[516+axis]]=[uvs[516+axis],uvs[8+axis]];const shape=surface(uvs,4),constraints=[0,258,1,2],before=structuredClone(shape);assert.equal(0*256+258,1*256+2,'the old edge IDs alias distinct edges');const triangles=retriangulate(shape.uvs,shape.hull,constraints,shape.world);verifySurface(shape,triangles,constraints);assert.deepEqual(retriangulate(shape.uvs,shape.hull,constraints,shape.world),triangles,'fixed-edge and quality order is deterministic');assert.deepEqual(shape,before);
});

test('weighted affine Modify at vertex307 and full512-row deformation retain every untouched row, weight and UV policy',()=>{
 const shape=grid(512),mesh={weighted:true,bones:[0,1],uvs:shape.uvs,triangles:retriangulate(shape.uvs,4,[]),edges:[],hull:4,vertices:Array.from({length:512},(_,i)=>({weights:[.25,.75],positions:[shape.uvs[i*2]*100,shape.uvs[i*2+1]*100,shape.uvs[i*2]*100-20,shape.uvs[i*2+1]*100-7]}))},poses=[{...bones[0],x:10,y:5,rotation:15,scaleX:1.2,scaleY:.8,shearX:5,shearY:-7},{id:1,parent:0,name:'Own child',x:20,y:7,length:10,rotation:-10,scaleX:.9,scaleY:1.1,shearX:0,shearY:2}],before=structuredClone(mesh),points=meshPoints(poses,mesh),target={x:points[307].x*.98+points[0].x*.02,y:points[307].y*.98+points[0].y*.02};
 const modified=previewMeshEdit(poses,mesh,[{vertex:307,...target}]);assert.notEqual(modified,mesh);near(meshPoints(poses,modified)[307].x,target.x);near(meshPoints(poses,modified)[307].y,target.y);assert.notDeepEqual(modified.uvs.slice(614,616),mesh.uvs.slice(614,616));assert.deepEqual(modified.vertices[307].weights,mesh.vertices[307].weights);for(let i=0;i<512;i++)if(i!==307)assert.deepEqual(modified.vertices[i],mesh.vertices[i]);verifySurface({...shape,uvs:modified.uvs},modified.triangles);
 const all=previewMeshEdit(poses,mesh,points.map((p,vertex)=>({vertex,x:p.x+2,y:p.y-3})),false),moved=meshPoints(poses,all);for(let i=0;i<512;i++){near(moved[i].x,points[i].x+2);near(moved[i].y,points[i].y-3);assert.deepEqual(all.vertices[i].weights,mesh.vertices[i].weights);}assert.deepEqual(all.uvs,mesh.uvs);assert.deepEqual(all.triangles,mesh.triangles);assert.deepEqual(mesh,before);
});
