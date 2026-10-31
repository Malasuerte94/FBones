import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preserveDeformOffsetBits,preserveTemporaryDeformZeros} from '../src/domain/deformTransport.ts';

test('raw deformation carriers preserve dormant signed zero across actual JSON encoding',()=>{
 const key={attachment:7,frame:10,offsets:[1,-0,.123456789,0],dataPresent:true,curve:'linear'},before=structuredClone(key),wire=JSON.parse(JSON.stringify(preserveDeformOffsetBits(key)));
 assert.equal(Object.is(wire.offsets[1],-0),false);assert.deepEqual(wire.offsetBits,[0x3f800000,0x80000000,0x3dfcd6ea,0]);
 const view=new DataView(new ArrayBuffer(4));const recovered=wire.offsetBits.map(bits=>{view.setUint32(0,bits,false);return view.getFloat32(0,false);});assert.ok(Object.is(recovered[1],-0));assert.equal(recovered[2],Math.fround(key.offsets[2]));assert.deepEqual(key,before);
 const ordinary={...key,offsets:[1,0]};assert.strictEqual(preserveDeformOffsetBits(ordinary),ordinary);
});
test('temporary carriers preserve zero signs without reducing nonzero f64 pose precision',()=>{
 const pose={attachment:7,offsets:[.123456789012345,-0,0,1.123456789012345]},wire=JSON.parse(JSON.stringify(preserveTemporaryDeformZeros(pose)));
 assert.deepEqual(wire.negativeZeroIndices,[1]);assert.equal(wire.offsets[0],pose.offsets[0]);assert.notEqual(wire.offsets[0],Math.fround(pose.offsets[0]));assert.equal(wire.offsets[3],pose.offsets[3]);assert.ok(Object.is(pose.offsets[1],-0));
 const ordinary={attachment:7,offsets:[0,.123456789012345]};assert.strictEqual(preserveTemporaryDeformZeros(ordinary),ordinary);
});
