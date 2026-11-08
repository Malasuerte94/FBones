// Production evaluator boundary regression, not an original solver oracle or
// browser/native rendering result. The simple local identity mapping has an
// independently specified arithmetic result and leaves every authored field frozen.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,evaluateSampled,PhysicsState} from '../src/domain/solve/index.ts';

function scene(){const bone=(id,parent,x,y)=>({id,parent,name:'Own bone '+id,x,y,rotation:0,length:10,scaleX:1,scaleY:1,shearX:0,shearY:0});return{bones:[bone(0,null,0,0),bone(1,0,10,20),bone(2,0,3,4)],constraints:[{id:31,order:0,type:'transform',name:'Own negative Setup mix',source:1,bones:[2],localSource:true,localTarget:true,additive:false,clamp:false,offsets:[0,0,0,0,0,0],mix:[0,-1,-1,0,0,0],properties:[{property:'x',offset:0,to:[{property:'x',offset:0,max:1,scale:1}]},{property:'y',offset:0,to:[{property:'y',offset:0,max:1,scale:1}]}],editorRangeBits:[0x80000000,...Array(23).fill(null)]}]};}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
// Fixed 1e-12 absolute tolerance covers the existing affine roundtrip in this
// tiny own scene; it is not an original numeric-fidelity claim.
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=1e-12,`${actual} ≠ ${expected}`);
const finiteFrame=frame=>frame.bones.every(b=>[...Object.values(b.authored),...Object.values(b.applied),...Object.values(b.world)].every(Number.isFinite));

test('finite negative Transform Setup mixes pass ordered None and pose preflight without mutating authored bones or metadata',()=>{
 const source=freeze(scene()),before=structuredClone(source);
 for(const type of ['none','pose']){const frame=evaluate(source,null,new PhysicsState(),{type});assert.equal(finiteFrame(frame),true);const target=frame.bones.find(b=>b.id===2);assert.equal(target.authored.x,3);assert.equal(target.authored.y,4);near(target.applied.x,-4);near(target.applied.y,-12);near(target.world.x,-4);near(target.world.y,-12);assert.deepEqual(source,before);}
});

test('Transform Setup nonfinite rejection stays atomic and separate IK and animation override bounds remain unchanged',()=>{
 for(const value of [NaN,Infinity,-Infinity]){const source=scene();source.constraints[0].mix[1]=value;const before=structuredClone(source);assert.throws(()=>evaluate(source,null,new PhysicsState(),{type:'none'}),e=>e.code==='InvalidConstraint');assert.deepEqual(source,before);}
 const ik=scene();ik.constraints=[{id:32,order:0,type:'ik',name:'Own still-invalid IK mix',bones:[2],target:1,mix:-1,softness:0,stretch:false,compress:false,bendPositive:true}];assert.throws(()=>evaluate(ik,null,new PhysicsState(),{type:'none'}),e=>e.code==='InvalidConstraint');
 const source=freeze(scene()),before=structuredClone(source);assert.throws(()=>evaluateSampled(source,null,new PhysicsState(),{type:'none'},[{constraint:31,type:'transform',mixes:[0,1_000_001,0,0,0,0]}]),e=>e.code==='InvalidConstraint');assert.deepEqual(source,before);
});
