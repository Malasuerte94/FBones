import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timelineFrameAt,timelineMoveDelta,timelineCurvePath,timelineBezierSegments,timelineBezierDragPoint,timelineBoxSelection,timelineProgressPath} from '../src/domain/animationTimeline.ts';

test('timeline scrubbing uses the scrolled ruler origin and supports fractional frames without negative time',()=>{
 assert.equal(timelineFrameAt(120,100,20,10),4);
 assert.equal(timelineFrameAt(124,100,20,10),4);
 assert.equal(timelineFrameAt(124,100,20,10,false),4.4);
 assert.equal(timelineFrameAt(50,100,0,10,false),0);
});
test('Bezier graph uses absolute frame/value controls independently for both axes',()=>{
 const keys=[{id:1,frame:4,values:[10,-8],interpolation:'bezier',controls:[[6,16,10,26],[5,-14,11,2]]},{id:2,frame:12,values:[30,4],interpolation:'linear'}];
 const x=v=>v*2,y=v=>100-v;
 assert.equal(timelineCurvePath(keys,0,x,y),'M8,90 C12,84 20,74 24,70');
 assert.equal(timelineCurvePath(keys,1,x,y),'M8,108 C10,114 22,98 24,96');
 assert.deepEqual(timelineBezierSegments(keys,1).map(s=>[s.key.id,s.next.id,s.controls]),[[1,2,[5,-14,11,2]]]);
 assert.equal(timelineBezierSegments([{...keys[0],controls:null},keys[1]],0).length,0);
 assert.equal(timelineBezierSegments([keys[0]],0).length,0);
});
test('Bezier tangent dragging keeps the grabbed point, bounds only its segment time and allows overshoot values',()=>{
 const point={frame:6,value:16},range={min:0,max:100};
 assert.deepEqual(timelineBezierDragPoint(point,{x:0,y:0},10,240,range,4,12),point);
 assert.deepEqual(timelineBezierDragPoint(point,{x:20,y:-40},10,240,range,4,12),{frame:8,value:36});
 assert.deepEqual(timelineBezierDragPoint(point,{x:-100,y:100},10,240,range,4,12),{frame:4,value:-34});
 assert.equal(point.frame,6);assert.equal(point.value,16);
});
test('group key movement preserves relative timing at frame zero and fractional snapping',()=>{
 assert.equal(timelineMoveDelta(-7,[3,10]),-3);
 assert.equal(timelineMoveDelta(2.4,[3,10]),2);
 assert.equal(timelineMoveDelta(2.4,[3,10],false),2.4);
 assert.equal(timelineMoveDelta(NaN,[3,10]),0);
});
test('graph plots stored linear or stepped interpolation and never fabricates missing Bezier handles',()=>{
 const keys=[{id:2,frame:10,values:[8],interpolation:'linear'},{id:1,frame:0,values:[2],interpolation:'linear'}];
 const x=v=>v*2,y=v=>100-v;
 assert.equal(timelineCurvePath(keys,0,x,y),'M0,98 L20,92');
 assert.equal(timelineCurvePath([{...keys[1],interpolation:'stepped'},keys[0]],0,x,y),'M0,98 H20V92');
 assert.equal(timelineCurvePath([{...keys[1],interpolation:'bezier'},keys[0]],0,x,y),'M0,98 M20,92');
 assert.deepEqual(keys.map(k=>k.id),[2,1]);
});

// One RGBA key has four Graph marks, and summary rows duplicate native IDs.
test('marquee deduplicates mixed native IDs and preserves additive selections in reversed scrolled boxes',()=>{
 const marks=[{id:7,x:310,y:90},{id:7,x:310,y:140},{id:7,x:310,y:190},{id:7,x:310,y:240},{id:8,x:365,y:140},{id:9,x:430,y:140}];
 assert.deepEqual(timelineBoxSelection(marks,{x:370,y:245},{x:300,y:80}),[7,8]);
 assert.deepEqual(timelineBoxSelection(marks,{x:300,y:80},{x:370,y:245},[9,7]),[9,7,8]);
 assert.deepEqual(timelineBoxSelection(marks,{x:310,y:90},{x:310,y:90}),[7]);
 assert.deepEqual(timelineBoxSelection(marks,{x:0,y:0},{x:1,y:1}),[]);
 assert.deepEqual(timelineBoxSelection(marks,{x:NaN,y:0},{x:1,y:1},[9]),[9]);
 assert.deepEqual(marks.map(mark=>mark.id),[7,7,7,7,8,9]);
});

test('deform progress plots its real scalar interval with absolute controls without treating dense offsets as values',()=>{
 const controls=[7.5,.2,10.5,.8],x=v=>v*2,y=v=>100-v*100;
 assert.equal(timelineProgressPath(6,12,'bezier',controls,x,y),'M12,100C15,80 21,20 24,0');
 assert.equal(timelineProgressPath(6,12,'stepped',null,x,y),'M12,100H24V0');
 assert.equal(timelineProgressPath(6,12,'linear',null,x,y),'M12,100L24,0');
 assert.equal(timelineProgressPath(6,12,'bezier',null,x,y),'');
 assert.equal(timelineProgressPath(6,6,'linear',null,x,y),'');
 assert.deepEqual(controls,[7.5,.2,10.5,.8]);
});
