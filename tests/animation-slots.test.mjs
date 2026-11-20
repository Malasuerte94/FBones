import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleSlotPoses,sampleSlotRgba,projectSlotPoses,packRgba,unpackRgba} from '../src/domain/animationSlots.ts';
import {sameAnimationFrame} from '../src/domain/animation.ts';
import {splitShownBezierAxis} from '../src/domain/keyShownBone.ts';
import {planLightRgbaKeySubdivision} from '../src/domain/keyShownPose.ts';

const region={image:'red',name:'A',x:-15,y:0,rotation:0,scaleX:1,scaleY:1,width:20,height:16};
const mesh={weighted:true,bones:[1],uvs:[0,0,1,0,1,1],triangles:[0,1,2],edges:[],hull:3,vertices:[{weights:[1],positions:[-2,-2]},{weights:[1],positions:[2,-2]},{weights:[1],positions:[0,2]}]};
const attachments=[{id:10,slot:5,name:'A',type:'region',region,mesh:null,clipping:null,imageAvailable:true},{id:11,slot:5,name:'B',type:'mesh',region:{...region,image:'green',name:'B',x:20},mesh,clipping:null,imageAvailable:true}];
const slot={id:5,name:'art',bone:1,visible:true,color:0x204080c0,blend:'normal',activeAttachmentId:10,region,mesh:null,attachments,imageAvailable:true};
const activation={slot:5,channel:'attachment',keys:[{id:1,frame:6,attachment:11},{id:2,frame:12,attachment:null},{id:3,frame:24,attachment:10}]};
test('discrete animation switches complete Region/Mesh projections and none without changing inventory or Setup',()=>{
 const original=structuredClone(slot),tracks=[activation];
 for(const [frame,active]of [[0,10],[6,11],[11.9,11],[12,null],[23.9,null],[24,10],[100,10]]){
  const [projected]=projectSlotPoses([slot],sampleSlotPoses([slot],tracks,frame));assert.equal(projected.activeAttachmentId,active);assert.equal(projected.visible,active!==null);assert.equal(projected.imageAvailable,active!==null);assert.strictEqual(projected.attachments,attachments);
  assert.equal(projected.region?.image,active===11?'green':active===10?'red':undefined);assert.strictEqual(projected.mesh,active===11?mesh:null);
 }
 assert.deepEqual(slot,original);
});
test('floating RGBA, alpha zero, duplicate frames and explicit None remain independent states',()=>{
 const color=[.12345679,.8,.25,0],track={slot:5,channel:'rgba',keys:[{id:4,frame:0,values:[1,1,1,1],curve:'linear'},{id:5,frame:0,values:color,curve:'stepped'}]};
 const [pose]=sampleSlotPoses([slot],[track],0),[projected]=projectSlotPoses([slot],[pose]);
 assert.deepEqual(pose.color,color.map(Math.fround));assert.equal(projected.activeAttachmentId,10);assert.equal(projected.visible,true);assert.equal(projected.animatedColor[0],Math.fround(color[0]));assert.equal(projected.animatedColor[3],0);
 const drafts=new Map([[5,{attachment:null,color:[.2,.3,.4,.5]}]]),[draft]=sampleSlotPoses([slot],[track],0,drafts);assert.equal(draft.attachment,null);assert.deepEqual(draft.color,[.2,.3,.4,.5]);assert.equal(slot.activeAttachmentId,10);
 assert.equal(packRgba(unpackRgba(slot.color)),slot.color);assert.throws(()=>projectSlotPoses([slot],[{slot:5,attachment:99,color}]),/unavailable/);
});
test('four independent absolute Bezier axes and exact duplicate endpoints retain raw channel precision',()=>{
 const start=[0,.2,.4,1],end=[1,.6,.8,0],controls=[[10,0,20,1],[10,.2,20,.2],[10,.4,20,.4],[10,1,20,1]];
 const keys=[{id:1,frame:0,values:start,curve:'bezier',controls},{id:2,frame:30,values:end,curve:'linear'}],original=structuredClone(keys);
 const middle=sampleSlotRgba(keys,15);for(const [axis,value]of [.5,Math.fround(.2)*.875+Math.fround(.6)*.125,Math.fround(.4)*.875+Math.fround(.8)*.125,.875].entries())assert.ok(Math.abs(middle[axis]-value)<1e-12);
 assert.deepEqual(sampleSlotRgba(keys,0),start.map(Math.fround));assert.deepEqual(sampleSlotRgba(keys,30),end.map(Math.fround));assert.equal(sampleSlotRgba(keys,-1),null);assert.deepEqual(keys,original);
 const duplicates=[...keys,{id:3,frame:30,values:[.1,.2,.3,.4],curve:'linear'}];assert.deepEqual(sampleSlotRgba(duplicates,30),duplicates[2].values.map(Math.fround));
});
test('stored f32 decimal wire values and fractional authoring addresses recover native precision',()=>{
 assert.ok(sameAnimationFrame(.1+.2,.3));assert.ok(!sameAnimationFrame(.3,.3001));
 const keys=[{id:1,frame:.3,values:[.8156863,.2,.4,.6],curve:'linear'}];
 assert.deepEqual(sampleSlotRgba(keys,Math.fround(.3)),keys[0].values.map(Math.fround));
 assert.notEqual(sampleSlotRgba(keys,Math.fround(.3))[0],.8156863);
 assert.deepEqual(sampleSlotPoses([slot],[],0)[0].color,unpackRgba(slot.color));
});

test('light RGBA rejects a monotone subdivision whose child control exceeds the native time bounds', () => {
 const crossed = [16, .25, 0, .75];
 const regular = [5, .25, 11, .75];
 const track = {slot: slot.id, channel: 'rgba', keys: [
  {id: 1, frame: 0, values: [0, 0, 0, 0], curve: 'bezier', controls: [crossed, regular, regular, regular]},
  {id: 2, frame: 16, values: [1, 1, 1, 1], curve: 'linear'},
 ]};
 const original = structuredClone(track);
 const split = splitShownBezierAxis(0, 16, 0, 1, crossed, 9);
 assert.deepEqual([split.first[0], split.first[2]], [12, 6]);
 const desired = sampleSlotRgba(track.keys, 9);
 assert.throws(() => planLightRgbaKeySubdivision(track, 9, desired, false), /native RGBA control bounds/);
 assert.deepEqual(track, original);
});

test('light RGBA keeps the outgoing hold when a key is inserted strictly inside Stepped', () => {
 const held = [.125, .25, .5, .75];
 const track = {slot: slot.id, channel: 'rgba', keys: [
  {id: 1, frame: 4, values: held, curve: 'stepped'},
  {id: 2, frame: 12, values: [.5, .5, .5, 1], curve: 'linear'},
 ]};
 const [inserted] = planLightRgbaKeySubdivision(track, 8, sampleSlotRgba(track.keys, 8), false);
 assert.equal(inserted.keyId, undefined);
 assert.equal(inserted.controls, undefined);
 assert.deepEqual(
  [inserted.slot, inserted.channel, inserted.frame, inserted.values, inserted.curve, inserted.negativeZeroIndices],
  [slot.id, 'rgba', 8, held, 'stepped', []],
 );
 const withHold = [track.keys[0], {...inserted, id: 3}, track.keys[1]];
 for (const frame of [4, 7.75, 8, 11.75, 12]) {
  assert.deepEqual(sampleSlotRgba(withHold, frame), sampleSlotRgba(track.keys, frame));
 }
 assert.equal(planLightRgbaKeySubdivision(track, 8, held, true), null);
 assert.equal(planLightRgbaKeySubdivision(track, 13, held, false), null);
});

test('light RGBA exact f32 keys preserve signed values and untouched control words', () => {
 const frame = Math.fround(.3);
 const values = [.125, -0, .25, .75];
 const controls = [[.5, .25, .75, .375], [.5, -0, .75, -0], [.5, .25, .75, .25], [.5, .75, .75, .75]];
 const track = {slot: slot.id, channel: 'rgba', keys: [
  {id: 1, frame, values, curve: 'bezier', controls},
  {id: 2, frame: 1, values: [.5, -0, .25, .75], curve: 'linear'},
 ]};
 assert.deepEqual(planLightRgbaKeySubdivision(track, .1 + .2, values, false), []);
 const [changed] = planLightRgbaKeySubdivision(track, .1 + .2, [.375, -0, .25, .75], false);
 assert.equal(changed.keyId, 1);
 assert.ok(sameAnimationFrame(changed.frame, frame));
 assert.equal(changed.curve, 'bezier');
 assert.deepEqual(changed.values, [.375, -0, .25, .75]);
 assert.deepEqual(changed.controls, controls);
 assert.deepEqual(changed.negativeZeroIndices, [1, 9, 11]);
});
