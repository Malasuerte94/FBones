import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyConstraintPoses,sampleConstraintPoses,physicsResetsBetween} from '../src/domain/animationConstraints.ts';
import {eventsBetween} from '../src/domain/animationEvents.ts';
import {preserveConstraintKeyBits,preserveEventKeyBits,preserveEventPatchBits,preserveTemporaryConstraintZeros} from '../src/domain/constraintTransport.ts';
import {splitShownBezierAxis} from '../src/domain/keyShownBone.ts';
import {planConstraintKeySubdivision} from '../src/domain/keyShownPose.ts';

const ik={id:7,order:0,type:'ik',name:'aim',bones:[1,2],target:3,mix:.75,softness:3,stretch:false,compress:false,bendPositive:true};
test('IK uses two independent numeric Bezier axes and holds all three flags discretely without changing Setup',()=>{
 const tracks=[{channel:'ik',constraint:7,keys:[{id:1,frame:6,mix:0,softness:10,stretch:false,compress:true,bendPositive:false,curve:'bezier',controls:[[14,0,22,1],[14,10,22,10]]},{id:2,frame:30,mix:1,softness:50,stretch:true,compress:false,bendPositive:true,curve:'linear'}]}];
 const before=structuredClone(ik);assert.deepEqual(sampleConstraintPoses([ik],tracks,0),[]);
 const [middle]=sampleConstraintPoses([ik],tracks,18);assert.ok(Math.abs(middle.mix-.5)<1e-12);assert.ok(Math.abs(middle.softness-15)<1e-12);assert.equal(middle.compress,true);assert.equal(middle.stretch,false);assert.equal(middle.bendPositive,false);
 const [last]=sampleConstraintPoses([ik],tracks,30);assert.equal(last.mix,1);assert.equal(last.softness,50);assert.equal(last.compress,false);assert.equal(last.stretch,true);
 const[posed]=applyConstraintPoses([ik],[middle]);assert.strictEqual(posed.bones,ik.bones);assert.equal(posed.target,ik.target);assert.deepEqual(ik,before);
});
test('Transform six-axis mixes and Physics properties overlay independently; reset crossings are discrete',()=>{
 const transform={id:8,order:1,type:'transform',name:'follow',source:3,bones:[1],mix:[0,0,0,0,0,0],offsets:[1,2,3,4,5,6],properties:[],localSource:true,localTarget:true,additive:false,clamp:false};
 const physics={id:9,order:2,type:'physics',name:'spring',bone:2,inertia:.8,strength:20,damping:.4,mass:2,wind:2,gravity:-5,mix:.25};
 const values=[.1,.2,.3,.4,.5,.6],end=[.7,.8,.9,1,1.1,1.2];
 const tracks=[{channel:'transformMix',constraint:8,keys:[{id:1,frame:0,values,curve:'linear'},{id:2,frame:24,values:end,curve:'linear'}]},{channel:'physics',constraint:9,property:'wind',keys:[{id:3,frame:0,value:2,curve:'linear'},{id:4,frame:24,value:6,curve:'linear'}]},{channel:'physics',constraint:9,property:'gravity',keys:[{id:5,frame:0,value:-5,curve:'stepped'},{id:6,frame:24,value:5,curve:'linear'}]},{channel:'physicsReset',constraint:9,keys:[{id:7,frame:0},{id:8,frame:12}]}];
 const original=structuredClone([transform,physics]),sample=sampleConstraintPoses([transform,physics],tracks,12),[a,b]=applyConstraintPoses([transform,physics],sample);
 values.forEach((value,i)=>assert.equal(a.mix[i],Math.fround(value)+(Math.fround(end[i])-Math.fround(value))*.5));assert.strictEqual(a.offsets,transform.offsets);assert.strictEqual(a.properties,transform.properties);assert.equal(b.wind,4);assert.equal(b.gravity,-5);assert.equal(b.mass,2);assert.equal(b.mix,.25);assert.deepEqual([transform,physics],original);
 assert.deepEqual(physicsResetsBetween(tracks,0,12),[9]);assert.deepEqual(physicsResetsBetween(tracks,12,24),[]);assert.deepEqual(physicsResetsBetween(tracks,0,0,true),[9]);assert.deepEqual(physicsResetsBetween(tracks,24,0),[]);
});
test('JSON carriers retain negative-zero keys and partial Event defaults without duplicating ordinary input',()=>{
 const key={channel:'ik',constraint:7,frame:0,mix:-0,softness:2,stretch:true,compress:false,bendPositive:true,curve:'bezier',controls:[[1,-0,2,1],[1,2,2,3]]};
 const wire=JSON.parse(JSON.stringify(preserveConstraintKeyBits(key)));assert.equal(Object.is(wire.mix,-0),false);assert.equal(wire.valueBits[0],0x80000000);assert.equal(wire.controlsBits[0][1],0x80000000);
 const ordinary={...key,mix:0,controls:[[1,0,2,1],[1,2,2,3]]};assert.strictEqual(preserveConstraintKeyBits(ordinary),ordinary);
 const event={event:1,frame:0,int:-2147483648,float:-0,string:'marker',volume:1,balance:-0},raw=JSON.parse(JSON.stringify(preserveEventKeyBits(event)));assert.deepEqual(raw.payloadBits,[0x80000000,0x3f800000,0x80000000]);
 const patch=preserveEventPatchBits({float:-0});assert.equal(patch.floatBits,0x80000000);assert.equal('volume'in patch,false);assert.equal('balance'in patch,false);
 const pose={type:'ik',constraint:7,mix:-0,softness:2.000000000001,stretch:false,compress:true,bendPositive:true},temporary=JSON.parse(JSON.stringify(preserveTemporaryConstraintZeros(pose)));
 assert.deepEqual(temporary.negativeZeroIndices,[0]);assert.equal(temporary.softness,pose.softness);assert.notEqual(temporary.softness,Math.fround(pose.softness));
});
test('Event playback crossings keep ordered discrete payloads and do not fire while scrubbing backwards',()=>{
 const key=(id,frame)=>({id,frame,int:id,float:-0,string:'cue '+id,volume:.6,balance:-.25});
 const tracks=[{event:10,keys:[key(4,0),key(9,12)]},{event:11,keys:[key(8,12),key(10,24)]}],before=structuredClone(tracks);
 assert.deepEqual(eventsBetween(tracks,0,12).map(e=>[e.event,e.key.id]),[[11,8],[10,9]]);assert.deepEqual(eventsBetween(tracks,0,0,true).map(e=>e.key.id),[4]);assert.deepEqual(eventsBetween(tracks,24,0),[]);assert.deepEqual(eventsBetween(tracks,12,12),[]);assert.deepEqual(tracks,before);
});

const spring = {id: 9, type: 'physics', inertia: .8, strength: 20, damping: .4, mass: 2, wind: 2, gravity: -5, mix: .25};

test('constraint key rejects a monotone Bézier split outside native child time bounds', () => {
 const controls = [16, -4, 0, 4];
 const track = {channel: 'physics', constraint: spring.id, property: 'gravity', keys: [
  {id: 1, frame: 0, value: -5, curve: 'bezier', controls},
  {id: 2, frame: 16, value: 5, curve: 'linear'},
 ]};
 const baseline = structuredClone(track);
 const [sampled] = sampleConstraintPoses([spring], [track], 9);
 const split = splitShownBezierAxis(0, 16, -5, 5, controls, 9);
 assert.deepEqual([split.first[0], split.first[2]], [12, 6]);
 assert.throws(() => planConstraintKeySubdivision(track, 9, sampled, sampled), /native constraint control bounds/);
 assert.deepEqual(track, baseline);
});

test('IK key subdivides clean Softness separately from dirty Mix and discrete flags', () => {
 const first = {id: 1, frame: 0, mix: .125, softness: 2, stretch: false, compress: false, bendPositive: false,
  curve: 'bezier', controls: [[8, .25, 16, .5], [6, 2.5, 18, 5.5]]};
 const last = {id: 2, frame: 24, mix: .625, softness: 6, stretch: true, compress: false, bendPositive: true, curve: 'linear'};
 const track = {channel: 'ik', constraint: ik.id, keys: [first, last]};
 const [sampled] = sampleConstraintPoses([ik], [track], 12);
 const [previous, inserted] = planConstraintKeySubdivision(track, 12, {...sampled, mix: .5, compress: true}, sampled);
 assert.deepEqual(
  [previous.keyId, previous.frame, previous.mix, previous.softness, previous.stretch, previous.compress, previous.bendPositive],
  [first.id, 0, .125, 2, false, false, false],
 );
 assert.deepEqual(
  [inserted.keyId, inserted.frame, inserted.mix, inserted.softness, inserted.stretch, inserted.compress, inserted.bendPositive],
  [undefined, 12, .5, 4, false, true, false],
 );
 assert.equal(previous.curve, 'bezier');
 assert.equal(inserted.curve, 'bezier');
 assert.deepEqual(previous.controls, [[4, .1875, 8, .40625], [3, 2.25, 7.5, 3.125]]);
 assert.deepEqual(inserted.controls, [[16, .59375, 20, .5625], [16.5, 4.875, 21, 5.75]]);
});

test('constraint key uses the rightmost existing f32 address and preserves untouched signed values', () => {
 const frame = Math.fround(.3);
 const address = frame + 2 ** -30;
 const first = {id: 1, frame, mix: .125, softness: 2, stretch: false, compress: false, bendPositive: true, curve: 'linear'};
 const controls = [[.5, -0, .75, -0], [.5, .5, .75, .5]];
 const rightmost = {...first, id: 2, mix: -0, softness: .5, bendPositive: false, curve: 'bezier', controls};
 const last = {...first, id: 3, frame: 1, mix: -0, softness: .5};
 const track = {channel: 'ik', constraint: ik.id, keys: [first, rightmost, last]};
 assert.equal(Math.fround(address), frame);
 const [sampled] = sampleConstraintPoses([ik], [track], address);
 assert.deepEqual(planConstraintKeySubdivision(track, address, sampled, sampled), []);
 const [changed] = planConstraintKeySubdivision(track, address, {...sampled, stretch: true}, sampled);
 assert.equal(changed.keyId, rightmost.id);
 assert.equal(changed.frame, frame);
 assert.ok(Object.is(changed.mix, -0));
 assert.equal(changed.softness, rightmost.softness);
 assert.equal(changed.stretch, true);
 assert.equal(changed.bendPositive, false);
 assert.equal(changed.curve, 'bezier');
 assert.deepEqual(changed.controls, controls);
});

test('Physics key retains the strict Stepped hold and enforces the scalar range', () => {
 const track = {channel: 'physics', constraint: spring.id, property: 'mass', keys: [
  {id: 1, frame: 4, value: 2, curve: 'stepped'},
  {id: 2, frame: 12, value: 4, curve: 'linear'},
 ]};
 const [sampled] = sampleConstraintPoses([spring], [track], 8);
 const [inserted] = planConstraintKeySubdivision(track, 8, sampled, sampled);
 assert.deepEqual(
  [inserted.channel, inserted.constraint, inserted.property, inserted.keyId, inserted.frame, inserted.value, inserted.curve, inserted.controls],
  ['physics', spring.id, 'mass', undefined, 8, 2, 'stepped', undefined],
 );
 assert.throws(() => planConstraintKeySubdivision(track, 8, {...sampled, mass: 0}, sampled), /supported constraint timeline values/);
 assert.equal(planConstraintKeySubdivision(track, 13, sampled, sampled), null);
});
