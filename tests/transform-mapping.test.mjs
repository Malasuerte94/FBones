import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canMatchTransform,nextMappingProperty,transformProperties,retainedTransformMembers} from '../src/domain/transformMapping.ts';
test('Match supports normalized finite mixes while every hidden lane retains its extended authored value',()=>{
 const normalized=Object.freeze({mix:Object.freeze([-0,0,.25,.5,.75,1])});
 assert.equal(canMatchTransform(normalized),true);
 for(let lane=0;lane<6;lane++)for(const value of[-1,1.25,NaN,Infinity,-Infinity]){
  const mix=[...normalized.mix];mix[lane]=value;const before=[...mix];
  assert.equal(canMatchTransform({mix}),false);assert.deepEqual(mix,before);
 }
 assert.equal(canMatchTransform({mix:[]}),false);assert.equal(Object.is(normalized.mix[0],-0),true);
});
test('a Rotate destination can add each other channel once, then the mapping is full',()=>{
 const to=[{property:'rotate'}];
 assert.equal(nextMappingProperty(to),'x');to.push({property:'x'});
 assert.equal(nextMappingProperty(to),'y');
 while(nextMappingProperty(to))to.push({property:nextMappingProperty(to)});
 assert.equal(to.length,6);assert.equal(new Set(to.map(p=>p.property)).size,6);assert.equal(nextMappingProperty(to),null);
 const remaining=to.filter(p=>p.property!=='scaleY');assert.equal(nextMappingProperty(remaining),'scaleY');
 assert.equal(transformProperties.includes('shearY'),true);
});
test('membership edits preserve the first retained Transform target instead of sorting by DOM order',()=>{
 const previous=[8,3,5],selected=[1,3,5,8,10];
 assert.deepEqual(retainedTransformMembers(previous,selected),[8,3,5,1,10]);
 assert.deepEqual(retainedTransformMembers(previous,[3,5,8]),previous);
 assert.deepEqual(retainedTransformMembers(previous,[3,8]),[8,3]);
 assert.deepEqual(retainedTransformMembers(previous,[3,5]),[3,5]);
 assert.deepEqual(retainedTransformMembers(previous,[]),[]);
 assert.deepEqual(previous,[8,3,5]);assert.deepEqual(selected,[1,3,5,8,10]);
});
