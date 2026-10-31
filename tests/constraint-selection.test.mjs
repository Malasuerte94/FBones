import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderedIkMembers,canTargetIk} from '../src/domain/constraintSelection.ts';
const bones=[{id:8,parent:null},{id:11,parent:8},{id:23,parent:11},{id:39,parent:23},{id:51,parent:8}];
test('IK member ordering follows the direct chain even when clicked child first',()=>{
 assert.deepEqual(orderedIkMembers(bones,[23,11]),[11,23]);
 assert.deepEqual(orderedIkMembers(bones,[11]),[11]);
 assert.equal(orderedIkMembers(bones,[11,51]),null);
 assert.equal(orderedIkMembers(bones,[11,11]),null);
 assert.equal(orderedIkMembers(bones,[99]),null);
});
test('IK target cannot be a constrained member or any of its descendants',()=>{
 for(const ids of [[11],[11,23]]){
  assert.equal(canTargetIk(bones,ids,8),true);assert.equal(canTargetIk(bones,ids,51),true);
  for(const target of[11,23,39])assert.equal(canTargetIk(bones,ids,target),false);
  assert.equal(canTargetIk(bones,ids,99),false);
 }
 assert.equal(canTargetIk(bones,[8],51),false);
 assert.equal(canTargetIk([{id:8,parent:8}],[11],8),false);
});
