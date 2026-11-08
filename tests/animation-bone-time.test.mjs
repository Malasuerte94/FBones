import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bezierTimeMonotone,sampleTrack} from '../src/domain/animation.ts';

test('time monotonicity admits valid outside/crossed polygons and exact stationary boundary without changing fields',()=>{
 const cases=[[0,1,1.125,.625],[0,1.5,2,1],[0,1,1,0],[0,1,0,1],[-2,-1,-.875,-1.375],[100,101,101.125,100.625]];
 for(const values of cases){const before=[...values];assert.equal(bezierTimeMonotone(...values),true,values.join(','));assert.deepEqual(values,before);}
});

test('negative derivative, reversed/zero extent, nonfinite and subnormal ambiguity reject exactly',()=>{
 const tiny=2**-149,cases=[[0,1,2,-1],[0,1,-.125,.5],[0,1,.5,1.125],[1,1,1,1],[1,0,1,0],[0,Infinity,0,1],[0,1,NaN,0],[tiny,1,1,0],[0,1,1,-tiny],[0,1.5,2,1-2**-24]];
 for(const values of cases)assert.equal(bezierTimeMonotone(...values),false,values.join(','));
 assert.equal(bezierTimeMonotone(0,tiny,tiny,0),true);assert.equal(bezierTimeMonotone(-tiny,0,0,-tiny),true);assert.equal(bezierTimeMonotone(-0,1,1,0),true);
 const max=(2-2**-23)*2**127;assert.equal(bezierTimeMonotone(-max,max,max,-max),true);
});

test('the existing bounded binary-search sampler inverts an admitted overshooting time cubic without clamping it',()=>{
 const curve=(a,b,c,d,t)=>((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d),track={bone:0,channel:'rotate',keys:[{id:1,frame:0,values:[0,0],curve:'bezier',controls:[[1.125,3,.625,7],[0,0,0,0]]},{id:2,frame:1,values:[10,0],curve:'linear'}]},before=structuredClone(track);
 assert.equal(bezierTimeMonotone(0,1,1.125,.625),true);
 for(let i=0;i<=100;i++){const t=i/100,frame=curve(0,1.125,.625,1,t),value=sampleTrack(track,frame)[0];assert(Math.abs(value-curve(0,3,7,10,t))<2e-12);}
 assert.deepEqual(track,before);
});
