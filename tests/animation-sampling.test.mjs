import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleAnimation,sampleTrack,keyValues} from '../src/domain/animation.ts';
const bone={id:7,parent:null,name:'root',x:11,y:-9,rotation:23,length:35,scaleX:1.2,scaleY:.8,shearX:7,shearY:-12};
const keys=[{id:1,frame:6,values:[10,-20],curve:'linear'},{id:2,frame:30,values:[34,4],curve:'linear'}];
const track={bone:7,channel:'translate',keys};
const clip={id:2,name:'walk',duration:30,tracks:[track]};
test('animation preview retains Setup before first key, interpolates offsets and holds last without baking',()=>{
 const original=structuredClone(bone),saved=structuredClone(clip);
 assert.deepEqual(sampleTrack(track,0),null);
 assert.equal(sampleAnimation([bone],clip,0)[0].x,11);
 assert.deepEqual(sampleTrack(track,18),[22,-8]);
 const posed=sampleAnimation([bone],clip,18)[0];assert.equal(posed.x,33);assert.equal(posed.y,-17);
 assert.deepEqual(keyValues(bone,posed,'translate'),[22,-8]);
 assert.deepEqual(sampleTrack(track,90),[34,4]);assert.deepEqual(bone,original);assert.deepEqual(clip,saved);
});
test('stepped transitions change at the exact key and retain fractional frame sampling',()=>{
 const stepped={...track,keys:[{...keys[0],curve:'stepped'},keys[1]]};
 assert.deepEqual(sampleTrack(stepped,29.999),[10,-20]);assert.deepEqual(sampleTrack(stepped,30),[34,4]);
 assert.deepEqual(sampleTrack(track,6.5),[10.5,-19.5]);
});
test('all four sampled channels are relative to nonzero Setup and preserve the authored graph',()=>{
 const tracks=[
  {bone:7,channel:'translate',keys:[{id:1,frame:0,values:[3,-2],curve:'linear'}]},
  {bone:7,channel:'rotate',keys:[{id:2,frame:0,values:[45,0],curve:'linear'}]},
  {bone:7,channel:'scale',keys:[{id:3,frame:0,values:[2,.5],curve:'linear'}]},
  {bone:7,channel:'shear',keys:[{id:4,frame:0,values:[-4,8],curve:'linear'}]},
 ];
 const source=structuredClone(bone),posed=sampleAnimation([bone],{id:2,name:'pose',duration:0,tracks},0)[0];
 assert.equal(posed.x,14);assert.equal(posed.y,-11);assert.equal(posed.rotation,68);assert.equal(posed.scaleX,2.4);assert.equal(posed.scaleY,.4);assert.equal(posed.shearX,3);assert.equal(posed.shearY,-4);assert.deepEqual(bone,source);
 for(const channel of ['translate','rotate','scale','shear'])assert.deepEqual(keyValues(bone,posed,channel),tracks.find(t=>t.channel===channel).keys[0].values);
});
test('absolute-frame Bézier handles invert time before evaluating each independent value axis',()=>{
 const curved={bone:7,channel:'translate',keys:[{id:1,frame:0,values:[0,10],curve:'bezier',controls:[[10,0,20,100],[10,10,20,30]]},{id:2,frame:30,values:[100,30],curve:'linear'}]};
 const result=sampleTrack(curved,7.5);assert.ok(Math.abs(result[0]-15.625)<1e-10);assert.ok(Math.abs(result[1]-13.125)<1e-10);
 assert.throws(()=>sampleTrack({...curved,keys:[{...curved.keys[0],controls:null},curved.keys[1]]},15),/controls are missing/);
});
test('fractional native f32 frame endpoints retain exact values instead of interpolating from shortest JSON decimals',()=>{
 const fractional={bone:7,channel:'translate',keys:[{id:1,frame:.3,values:[0,1.2],curve:'linear'},{id:2,frame:.6,values:[1e6,3.4],curve:'linear'}]};
 assert.deepEqual(sampleTrack(fractional,Math.fround(.3)),[0,Math.fround(1.2)]);
 assert.deepEqual(sampleTrack(fractional,Math.fround(.6)),[1e6,Math.fround(3.4)]);
 const mid=(Math.fround(.3)+Math.fround(.6))/2;assert.deepEqual(sampleTrack(fractional,mid),[500000,(Math.fround(1.2)+Math.fround(3.4))/2]);
});
