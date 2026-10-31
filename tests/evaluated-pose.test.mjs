import {test}from'node:test';
import assert from'node:assert/strict';
import{withEvaluatedPose}from'../src/domain/evaluatedPose.ts';
const bones=[{id:2,parent:null,name:'root',x:5,y:8,rotation:12,length:0},{id:19,parent:2,name:'child',x:10,y:0,rotation:33,length:70,scaleX:-1.2,scaleY:.8,shearX:9,shearY:-7}];
const frames=[{id:19,world:{x:50,y:-20,a:-1.2,b:.6,c:.3,d:.8}},{id:2,world:{x:9,y:14,a:1,b:0,c:0,d:1}}];
test('evaluated render snapshots map stable IDs without changing authored fields or source matrices',()=>{
 const before=structuredClone(bones),input=structuredClone(frames),output=withEvaluatedPose(bones,frames);
 assert.deepEqual(bones,before);assert.deepEqual(frames,input);assert.equal(output[0].evaluatedWorld.x,9);assert.deepEqual(output[1].evaluatedWorld,frames[0].world);assert.ok(Object.isFrozen(output[1].evaluatedWorld));assert.ok(output[1].evaluatedWorld.a*output[1].evaluatedWorld.d-output[1].evaluatedWorld.b*output[1].evaluatedWorld.c<0);
 for(const[i,bone]of output.entries()){const{evaluatedWorld,...authored}=bone;assert.deepEqual(authored,bones[i]);assert.notEqual(bone,bones[i]);}
 frames[0].world.x=999;assert.equal(output[1].evaluatedWorld.x,50);assert.throws(()=>{output[1].evaluatedWorld.x=2;},TypeError);
});
test('finite collapsed/singular poses remain renderable; no inverse or authoring rewrite',()=>{
 const collapsed=withEvaluatedPose(bones,[{id:2,world:{x:0,y:0,a:0,b:0,c:0,d:0}},{id:19,world:{x:17,y:9,a:1,b:2,c:.5,d:1}}]);assert.equal(collapsed[0].evaluatedWorld.a,0);assert.equal(collapsed[1].evaluatedWorld.a*collapsed[1].evaluatedWorld.d-collapsed[1].evaluatedWorld.b*collapsed[1].evaluatedWorld.c,0);assert.equal(collapsed[1].rotation,33);
});
test('stale/missing/duplicate/unknown/nonfinite snapshots fail before partial attachment',()=>{
 const original=structuredClone(bones),valid=[{id:2,world:{x:0,y:0,a:1,b:0,c:0,d:1}},{id:19,world:{x:1,y:2,a:1,b:0,c:0,d:1}}];
 assert.throws(()=>withEvaluatedPose(bones,valid.slice(0,1)),/match/);assert.throws(()=>withEvaluatedPose(bones,[valid[0],valid[0]]),/duplicate/);assert.throws(()=>withEvaluatedPose(bones,[valid[0],{...valid[1],id:1000}]),/unknown/);assert.throws(()=>withEvaluatedPose([bones[0],bones[0]],valid),/Duplicate/);
 const bad=structuredClone(valid);bad[1].world.d=NaN;assert.throws(()=>withEvaluatedPose(bones,bad),/nonfinite/);assert.deepEqual(bones,original);assert.ok(!Object.hasOwn(bones[0],'evaluatedWorld'));
});
