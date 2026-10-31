import {test} from 'node:test';
import assert from 'node:assert/strict';
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
