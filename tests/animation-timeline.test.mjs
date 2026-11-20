import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timelineFrameAt,timelineMoveDelta,timelineCurvePath,timelineBezierSegments,timelineBezierDragPoint,timelineBoxSelection,timelineProgressPath} from '../src/domain/animationTimeline.ts';
import {graphFavorChanges,graphPresetChanges,groupedGraphBezierChanges} from '../src/domain/graphCurveTools.ts';
import {graphBoneValueProjection,graphDisplayValue,graphRawValueAfterDelta} from '../src/domain/graphValueProjection.ts';
import {graphViewBounds} from '../src/domain/graphView.ts';
import {preserveAnimationKeyZeros} from '../src/domain/animationTransport.ts';
import {graphKeyHolds,graphRepeatOffsets} from '../src/domain/graphRepeat.ts';

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

function outgoingBoneHandle(id, bounds, controls) {
  return {handleId: `${id}:0`, id, nextId: id + 1, component: 0, control: 0, bone: true, ...bounds, controls: Object.freeze(controls)};
}

test('grouped Bézier maps the corresponding source side to each selected peer', () => {
  const source = outgoingBoneHandle(1, {startFrame: 6, endFrame: 12, startValue: 17, endValue: -8}, [7.5, 12, 10.5, -3]);
  const peer = outgoingBoneHandle(3, {startFrame: 20, endFrame: 32, startValue: -20, endValue: 20}, [21, -15, 31, 15]);
  const sourceIncoming = {...source, handleId: '1:1', control: 1};
  const peerIncoming = {...peer, handleId: '3:1', control: 1};

  assert.deepEqual(groupedGraphBezierChanges(
    [source, sourceIncoming, peerIncoming, peer], source.handleId, {frame: 8.25, value: 14.5},
  ), [
    {id: 1, nextId: 2, component: 0, control: 0, frame: 8.25, value: 14.5},
    {id: 3, nextId: 4, component: 0, control: 1, frame: 29, value: 12},
    {id: 3, nextId: 4, component: 0, control: 0, frame: 24.5, value: -16},
  ]);
});

test('grouped Bézier transfers time when flat or collapsed lanes cannot transfer ordinates', () => {
  const source = outgoingBoneHandle(1, {startFrame: 0, endFrame: 8, startValue: 2, endValue: 10}, [2, 4, 6, 8]);
  const flat = outgoingBoneHandle(3, {startFrame: 10, endFrame: 26, startValue: 5, endValue: 5}, [14, -0, 22, 8]);
  const peer = outgoingBoneHandle(5, {startFrame: 30, endFrame: 42, startValue: 5, endValue: 17}, [33, -0, 39, 8]);
  const collapsed = {...peer, collapsedValue: true};
  const proposed = {frame: 4, value: 6};
  const sourceChange = {id: 1, nextId: 2, component: 0, control: 0, frame: 4, value: 6};
  const peerTimeOnly = {id: 5, nextId: 6, component: 0, control: 0, frame: 36, value: -0};

  assert.deepEqual(groupedGraphBezierChanges([source, flat, collapsed], source.handleId, proposed), [
    sourceChange,
    {id: 3, nextId: 4, component: 0, control: 0, frame: 18, value: -0},
    peerTimeOnly,
  ]);
  assert.deepEqual(groupedGraphBezierChanges([{...source, endValue: 2}, peer], source.handleId, proposed), [
    sourceChange,
    peerTimeOnly,
  ]);
  assert.deepEqual(groupedGraphBezierChanges([{...source, collapsedValue: true}, peer], source.handleId, proposed), [
    {...sourceChange, value: 4},
    peerTimeOnly,
  ]);
});

test('grouped Bézier skips f32 no-ops and preserves signed zero when time changes', () => {
  const source = outgoingBoneHandle(1, {startFrame: 0, endFrame: 8, startValue: 0, endValue: 8}, [2, -0, 6, 6]);
  const peer = outgoingBoneHandle(3, {startFrame: 10, endFrame: 18, startValue: 4, endValue: 12}, [13, 7, 16, 10]);
  const roundoff = 2 ** -25;

  assert.deepEqual(groupedGraphBezierChanges([source, peer], source.handleId, {frame: 2 + roundoff, value: 0}), []);
  assert.deepEqual(groupedGraphBezierChanges(
    [{...source, controls: [2, 4, 6, 6]}, peer], source.handleId, {frame: 2 + roundoff, value: 4 + roundoff},
  ), []);
  assert.deepEqual(groupedGraphBezierChanges([source, peer], source.handleId, {frame: 4, value: 0}), [
    {id: 1, nextId: 2, component: 0, control: 0, frame: 4, value: -0},
    {id: 3, nextId: 4, component: 0, control: 0, frame: 14, value: 4},
  ]);
});

test('grouped Bézier rejects the whole batch when a peer time conflicts with its untouched control', () => {
  const source = outgoingBoneHandle(1, {startFrame: 0, endFrame: 10, startValue: 0, endValue: 10}, [4, 2, 5, 8]);
  const validPeer = outgoingBoneHandle(3, {startFrame: 40, endFrame: 50, startValue: 0, endValue: 10}, [44, 2, 45, 8]);
  const invalidPeer = outgoingBoneHandle(5, {startFrame: 20, endFrame: 30, startValue: 0, endValue: 10}, [24, 2, 20, 8]);
  const proposed = {frame: 11, value: 6};

  assert.deepEqual(groupedGraphBezierChanges([source, validPeer], source.handleId, proposed), [
    {id: 1, nextId: 2, component: 0, control: 0, frame: 11, value: 6},
    {id: 3, nextId: 4, component: 0, control: 0, frame: 51, value: 6},
  ]);
  assert.equal(groupedGraphBezierChanges([source, validPeer, invalidPeer], source.handleId, proposed), null);
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

test('Favor weights separate selected curves by neighbor distance while Blend keeps the same fraction', () => {
  const tracks = [
    {bone: 0, channel: 'rotate', keys: [
      {id: 1, frame: 10, values: [20, 0], interpolation: 'linear'},
      {id: 2, frame: 20, values: [60, 0], interpolation: 'linear'},
    ]},
    {bone: 1, channel: 'translateX', keys: [
      {id: 3, frame: 5, values: [10, 0], interpolation: 'stepped'},
      {id: 4, frame: 45, values: [50, 0], interpolation: 'linear'},
    ]},
  ];
  const selected = new Set([1, 3]);
  const weighted = graphFavorChanges(tracks, selected, 0, 50, 'favor');
  const uniform = graphFavorChanges(tracks, selected, 0, 50, 'blend');
  assert.deepEqual(weighted.map(({keyId, values, curve}) => [keyId, values, curve]), [[1, [40, 0], 'linear'], [3, [15, 0], 'stepped']]);
  assert.deepEqual(uniform.map(({values}) => values), [[40, 0], [30, 0]]);
  assert.deepEqual(graphFavorChanges(tracks.slice(1), new Set(), 10, 50, 'favor'), []);
});

test('Graph presets preserve untouched handles and the desktop carrier preserves signed zero in active bone lanes', () => {
  const keys = [
    {id: 1, frame: 0, values: [5, 3], interpolation: 'bezier', controls: [[1, 14, 6, 19], [2, 4, 5, 7]]},
    {id: 2, frame: 8, values: [30, 9], interpolation: 'linear'},
  ];
  const selected = new Set([2]);
  const [flat] = graphPresetChanges([{bone: 0, channel: 'translate', keys}], selected, 'flat');
  assert.deepEqual(flat.controls, [[1, 14, 6, 30], [2, 4, 5, 9]]);
  const [ease] = graphPresetChanges([{bone: 0, channel: 'translate', keys}], selected, 'easeIn');
  assert.equal(ease.controls[0][3], 30);
  assert.equal(ease.controls[1][3], 9);
  const signed = [{...keys[0], values: [5, -0]}, keys[1]];
  const [signedFlat] = graphPresetChanges([{bone: 0, channel: 'translate', keys: signed}], selected, 'flat');
  assert.ok(Object.is(signedFlat.values[1], -0));
  const desktop = preserveAnimationKeyZeros(signedFlat);
  const serialized = JSON.parse(JSON.stringify(desktop));
  assert.deepEqual(serialized.negativeZeroIndices, [1]);
  assert.deepEqual(serialized.values, [5, 0]);
  assert.equal(keys[0].controls[0][3], 19);
});

test('projected Graph values use local Setup and invert display motion with signed and collapsed scales', () => {
  const setup = {x: 19, y: -10, rotation: 23, shearX: 4, shearY: -7, scaleX: -2, scaleY: 0};
  assert.equal(graphDisplayValue(12, graphBoneValueProjection(setup, 'translateX', 0)), 31);
  assert.equal(graphDisplayValue(12, graphBoneValueProjection(setup, 'translateY', 0)), 2);
  assert.equal(graphDisplayValue(12, graphBoneValueProjection(setup, 'rotate', 0)), 35);
  assert.equal(graphDisplayValue(12, graphBoneValueProjection(setup, 'shear', 0)), 16);
  assert.equal(graphDisplayValue(12, graphBoneValueProjection(setup, 'shear', 1)), 5);
  const negative = graphBoneValueProjection(setup, 'scale', 0);
  const collapsed = graphBoneValueProjection(setup, 'scaleY', 0);
  assert.equal(graphDisplayValue(.75, negative), -150);
  assert.equal(graphRawValueAfterDelta(.75, 50, negative), .5);
  assert.equal(graphDisplayValue(1.2, collapsed), 0);
  assert.ok(Object.is(graphRawValueAfterDelta(-0, 20, collapsed), -0));
  assert.ok(Object.is(graphRawValueAfterDelta(-0, 0, negative), -0));
  assert.equal(graphBoneValueProjection(setup, 'scaleY', 1), undefined);

  const track = {keys: [
    {id: 1, frame: 0, values: [.5, 1], interpolation: 'bezier', controls: [[2, .25, 6, 2], [2, 1, 6, 1]]},
    {id: 2, frame: 8, values: [1.5, 1], interpolation: 'linear'},
  ]};
  assert.deepEqual(graphViewBounds([{track, component: 0, projection: negative}]), {minFrame: 0, maxFrame: 8, min: -435, max: -15});
  assert.deepEqual(track.keys.map(key => key.values), [[.5, 1], [1.5, 1]]);
});

test('Graph holds use the sparse lane endpoints and clip the raw values to the requested interval', () => {
  const keys = [
    {id: 1, frame: 8, values: [12], interpolation: 'bezier'},
    {id: 2, frame: 18, values: [18], interpolation: 'stepped'},
    {id: 3, frame: 18, values: [-0], interpolation: 'linear'},
  ];
  assert.deepEqual(graphKeyHolds(keys, 0, 1, 0, 30), [
    {from: 0, to: 8, value: 1}, {from: 18, to: 30, value: -0},
  ]);
  assert.deepEqual(graphKeyHolds(keys, 0, 1, 2, 7), [{from: 2, to: 7, value: 1}]);
  assert.deepEqual(graphKeyHolds(keys, 0, undefined, 20, 25), [{from: 20, to: 25, value: -0}]);
  assert.deepEqual(graphKeyHolds(keys, 0, undefined, 0, 18), []);
  assert.deepEqual(graphKeyHolds(keys, 1, 0, 0, 30), []);
});

test('Graph Repeat copies only the exterior periods intersecting the visible pixel interval', () => {
  assert.deepEqual(graphRepeatOffsets(100, 60, -65, 381), [-200, -100, 100, 200, 300]);
  assert.deepEqual(graphRepeatOffsets(100, 60, 60, 160), []);
  assert.deepEqual(graphRepeatOffsets(100, 60, 160, 260), [100]);
  assert.deepEqual(graphRepeatOffsets(100, 60, -40, 60), [-100]);
  assert.equal(graphRepeatOffsets(4, 0, 4, 772).length, 192);
  assert.deepEqual(graphRepeatOffsets(4, 0, 4, 776), []);
  assert.deepEqual(graphRepeatOffsets(3.999, 0, 0, 10), []);
  assert.deepEqual(graphRepeatOffsets(4, 0, 0, Infinity), []);
});
