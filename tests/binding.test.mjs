import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindingPoints,previewBindingVertices,previewBindingWeights,boundaryEdges,bindingNeighbors,nearestBindingEdge} from '../src/domain/binding.ts';
import {previewAttachmentBinding} from '../src/domain/sceneSelection.ts';

const bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0,evaluatedWorld:{x:20,y:-10,a:2,b:.5,c:.3,d:1}},{id:7,parent:0,name:'tip',x:0,y:0,rotation:0,length:20,evaluatedWorld:{x:-8,y:30,a:0,b:-1,c:3,d:.2}}];
const binding={weighted:true,bones:[0,7],vertices:[{weights:[.25,.75],positions:[1,2,7,9]},{weights:[1,0],positions:[-0,4,0,-0]},{weights:[.8,.2],positions:[20,0,-5,6]}]};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('real dense binding points and affine deltas preserve noncoincident offsets and dormant signed-zero coordinates',()=>{
 const before=structuredClone(binding),points=bindingPoints(bones,binding);
 near(points[0].x,.25*(20+2+.6)+.75*(-8+27));near(points[0].y,.25*(-10+.5+2)+.75*(30-7+1.8));
 const next=previewBindingVertices(bones,binding,[{vertex:0,x:41,y:-26}]);
 near(bindingPoints(bones,next)[0].x,41);near(bindingPoints(bones,next)[0].y,-26);
 assert.equal(next.vertices[0].weights,binding.vertices[0].weights);assert.equal(next.vertices[1],binding.vertices[1]);assert.equal(next.vertices[2],binding.vertices[2]);assert.deepEqual(binding,before);assert.ok(Object.is(next.vertices[1].positions[3],-0));
});
test('Scene weights preserve all coordinate bits across positive→zero and dormant zero→positive; legacy rebasing remains explicit',()=>{
 const all={...binding,vertices:[{weights:[.4,.6],positions:[-0,3,17,-0]}]},zero=previewBindingWeights(bones,all,7,[{vertex:0,value:0}]);
 assert.deepEqual(zero.vertices[0].weights,[1,0]);assert.equal(zero.vertices[0].positions,all.vertices[0].positions);assert.ok(Object.is(zero.vertices[0].positions[3],-0));
 const revived=previewBindingWeights(bones,zero,7,[{vertex:0,value:.75}]);assert.deepEqual(revived.vertices[0].weights,[.25,.75]);assert.equal(revived.vertices[0].positions,all.vertices[0].positions);
 const scene=previewBindingWeights(bones,{...binding,vertices:[binding.vertices[1]]},7,[{vertex:0,value:.5}]),legacy=previewBindingWeights(bones,{...binding,vertices:[binding.vertices[1]]},7,[{vertex:0,value:.5}],'legacy');
 assert.equal(scene.vertices[0].positions,binding.vertices[1].positions);assert.notDeepEqual(bindingPoints(bones,scene),bindingPoints(bones,{...binding,vertices:[binding.vertices[1]]}));
 const old=bindingPoints(bones,{...binding,vertices:[binding.vertices[1]]})[0],same=bindingPoints(bones,legacy)[0];near(old.x,same.x);near(old.y,same.y);
});
test('dominant100% cannot decrease with no positive recipient in either weight policy',()=>{
 const source={...binding,vertices:[binding.vertices[1]]};
 for(const policy of ['scene','legacy'])for(const value of [.2,0])assert.deepEqual(previewBindingWeights(bones,source,0,[{vertex:0,value}],policy),source);
});
test('boundary Smooth graph follows actual concave perimeter while old image triangle adjacency stays explicit',()=>{
 const edges=boundaryEdges(5),boundary=bindingNeighbors(5,edges),mesh=bindingNeighbors(5,[],[0,1,3,1,2,3,0,3,4]);
 assert.deepEqual(edges,[0,1,1,2,2,3,3,4,4,0]);assert.deepEqual(boundary[0],[1,4]);assert.deepEqual(boundary[3],[2,4]);assert.deepEqual(mesh[0],[1,3,4]);
 const points=[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:10,y:5},{x:0,y:20}];
 assert.deepEqual(nearestBindingEdge(edges,points,{x:10,y:0},.5),[0,1]);assert.throws(()=>bindingNeighbors(5,[0,9]));assert.throws(()=>bindingNeighbors(5,[0]));
});
test('generic binding failures are atomic and never invent absent influences or nonfinite rows',()=>{
 for(const act of [()=>previewBindingWeights(bones,binding,99,[{vertex:0,value:.4}]),()=>previewBindingWeights(bones,binding,7,[{vertex:0,value:.4},{vertex:0,value:.5}]),()=>previewBindingWeights(bones,binding,7,[{vertex:1,value:NaN}]),()=>previewBindingVertices(bones,binding,[{vertex:7,x:0,y:0}]),()=>previewBindingVertices(bones,binding,[{vertex:0,x:Infinity,y:0}]),()=>previewBindingVertices([{...bones[0],evaluatedWorld:{x:0,y:0,a:0,b:0,c:0,d:0}},bones[1]],binding,[{vertex:0,x:0,y:0}]),()=>bindingPoints(bones,{...binding,vertices:[{weights:[0,0],positions:[0,0,0,0]}]})]){const before=structuredClone(binding);assert.throws(act);assert.deepEqual(binding,before);}
});
test('binding preview inventory addresses inactive clip without altering active projection or any clip metadata',()=>{
 const clip={...binding,endSlot:2,convex:false,inverse:true,color:0xff2080ff,edges:boundaryEdges(3)},a={id:30,slot:10,name:'mask',type:'clipping',clipping:clip,region:null,mesh:null,imageAvailable:false},active={...a,id:31,name:'other',clipping:{...clip,color:0xffffffff}},slot={id:10,bone:0,name:'owner',blend:'normal',visible:true,region:null,mesh:null,imageAvailable:false,attachments:[a,active],activeAttachmentId:31};
 const changed=previewBindingWeights(bones,clip,7,[{vertex:0,value:.9}]),next=previewAttachmentBinding([slot],30,changed);
 assert.equal(next[0].activeAttachmentId,31);assert.equal(next[0].attachments[1],active);assert.equal(next[0].region,null);assert.equal(next[0].mesh,null);assert.equal(next[0].attachments[0].clipping.endSlot,2);assert.equal(next[0].attachments[0].clipping.inverse,true);assert.equal(next[0].attachments[0].clipping.color,clip.color);assert.equal(next[0].attachments[0].clipping.edges,clip.edges);assert.equal(next[0].attachments[0].clipping.vertices[0].positions,clip.vertices[0].positions);
});
test('manual Scene lock preview protects other influences, clamps available mass and overrides its own explicit target lock',()=>{
 const rig=[...bones,{...bones[0],id:20,parent:0},{...bones[1],id:25,parent:0}],f32=v=>Math.fround(v);
 for(const[weights,target,value,locks,expected]of[
  [[.4,.3,.2,.1],7,.5,[0],[.4,.5,1/15,1/30]],
  [[.4,.3,.2,.1],7,.9,[0],[.4,.6,0,0]],
  [[.4,.3,.2,.1],7,.5,[7],[2/7,.5,1/7,1/14]],
  [[.6,0,0,.4],20,.2,[0],[.6,0,.2,.2]],
 ]){
  const source={weighted:true,bones:[0,7,20,25],vertices:[{weights:weights.map(f32),positions:[-0,1,2,3,4,5,6,-0]}, {weights:[1,0,0,0],positions:[0,1,2,3,4,5,6,7]}]},before=structuredClone(source);
  const next=previewBindingWeights(rig,source,target,[{vertex:0,value}],'scene',locks);
  next.vertices[0].weights.forEach((w,i)=>assert.ok(Math.abs(w-expected[i])<1e-6));
  for(const id of locks)if(id!==target){const i=source.bones.indexOf(id);assert.ok(Object.is(next.vertices[0].weights[i],source.vertices[0].weights[i]));}
  assert.equal(next.vertices[0].positions,source.vertices[0].positions);assert.equal(next.vertices[1],source.vertices[1]);assert.deepEqual(source,before);
 }
});
test('partial-mass no-recipient and malformed lock lists leave every source row and signed zero intact',()=>{
 const rig=[...bones,{...bones[0],id:20,parent:0},{...bones[1],id:25,parent:0}],source={weighted:true,bones:[0,7,20,25],vertices:[{weights:[Math.fround(.4),Math.fround(.6),-0,0],positions:[-0,1,2,3,4,5,6,-0]}]},before=structuredClone(source);
 const next=previewBindingWeights(rig,source,7,[{vertex:0,value:.5}],'scene',[0]);assert.equal(next.vertices[0],source.vertices[0]);assert.ok(Object.is(next.vertices[0].weights[2],-0));
 for(const locks of [[0,0],[99]])assert.throws(()=>previewBindingWeights(rig,source,7,[{vertex:0,value:.5}],'scene',locks));
 assert.deepEqual(source,before);
 const normal=previewBindingWeights(rig,source,20,[{vertex:0,value:.2}]);assert.deepEqual(previewBindingWeights(rig,source,20,[{vertex:0,value:.2}],'scene',[]),normal);
});
