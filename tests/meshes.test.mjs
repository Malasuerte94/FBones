import {test} from 'node:test';
import assert from 'node:assert/strict';
import {meshPoints,meshContains,previewVertices,previewWeights,nearestVertex,nearestEdge,falloff} from '../src/domain/meshes.ts';
const bones=[{id:0,parent:null,name:'root',x:10,y:20,rotation:90,length:0},{id:7,parent:0,name:'arm',x:30,y:0,rotation:-90,length:100}];
const mesh={weighted:true,bones:[0,7],vertices:[{weights:[0.25,0.75],positions:[0,0,-10,-30]},{weights:[0.25,0.75],positions:[0,20,-30,-30]},{weights:[0.25,0.75],positions:[20,0,-10,-10]}],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('weighted mesh preview keeps bind offsets and moves by weighted bone transforms',()=>{
 const original=structuredClone(mesh),points=meshPoints(bones,mesh);
 const posed=meshPoints(bones.map(b=>b.id===7?{...b,x:b.x+40}:b),mesh);
 near(posed[0].y-points[0].y,30);
 const moved=previewVertices(bones,mesh,[{vertex:0,x:50,y:-30}]);
 near(meshPoints(bones,moved)[0].x,50);near(meshPoints(bones,moved)[0].y,-30);
 assert.deepEqual(mesh,original);
 const weighted=previewWeights(bones,mesh,7,[{vertex:0,value:0.9}]);near(weighted.vertices[0].weights[0],0.1);near(weighted.vertices[0].weights[1],0.9);
});
test('UV topology hit testing distinguishes faces, edges and vertices',()=>{
 const m={...mesh,bones:[0],vertices:[{weights:[1],positions:[0,0]},{weights:[1],positions:[20,0]},{weights:[1],positions:[0,20]}]};
 const points=meshPoints(bones,m);
 assert.equal(meshContains(bones,m,{x:5,y:25}),true);assert.equal(meshContains(bones,m,{x:50,y:50}),false);
 assert.equal(nearestVertex(points,points[1],1),1);assert.deepEqual(nearestEdge(m,points,{x:10,y:30},1),[0,1]);
 assert.equal(falloff(0,100,0.6),1);near(falloff(70,100,0.6),0.5);assert.equal(falloff(101,100,0.6),0);
});
test('activating a zero influence initializes it at the current world pose',()=>{
 const m={...mesh,bones:[0,7,8],vertices:[{weights:[1,0,0],positions:[2,3,0,0,0,0]}]};
 const bs=[...bones,{id:8,parent:0,name:'other',x:-10,y:0,rotation:15,length:1}];
 const before=meshPoints(bs,m)[0],updated=previewWeights(bs,m,7,[{vertex:0,value:0.7}]);
 near(updated.vertices[0].weights[0],.3);near(updated.vertices[0].weights[1],.7);assert.equal(updated.vertices[0].weights[2],0);
 const after=meshPoints(bs,updated)[0];near(before.x,after.x);near(before.y,after.y);
});
test('a sole dominant influence cannot lose weight merely because other bones are bound',()=>{
 const m={...mesh,vertices:[{weights:[1,0],positions:[2,3,70,80]}]};
 assert.deepEqual(previewWeights(bones,m,0,[{vertex:0,value:.3}]),m);
});
