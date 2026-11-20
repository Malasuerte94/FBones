import assert from 'node:assert/strict';
import {test} from 'node:test';
import {curveSegmentHandleChange, selectedCurveSegments} from '../src/domain/curveSegment.ts';
import {curvesHandleId, planCurvesHandleGroup} from '../src/domain/curvesHandleGroup.ts';

function fixture() {
  const tracks = [
    {id: 'rotate:4', channel: 'rotate', boneId: 4, keys: [
      {id: 31, frame: 4, values: [35], interpolation: 'bezier', controls: [[6.5, 32.125, 11.5, 17.75]]},
      {id: 32, frame: 14, values: [12], interpolation: 'linear'},
    ]},
    {id: 'deform:10', channel: 'deform', boneId: 4, attachmentId: 10, keys: [
      {id: 41, frame: 0, values: [], interpolation: 'bezier', progressControls: [8, -0, 16, 1.25]},
      {id: 42, frame: 24, values: [], interpolation: 'linear'},
    ]},
  ];
  return selectedCurveSegments(tracks, new Set([31, 41]))
    .map(segment => ({documentKey: 'project-3', revision: 7, animation: 1, segment}));
}

function member({segment}, control = 0) {
  return {trackId: segment.trackId, id: segment.key.id, nextId: segment.next.id, component: 0, control};
}

test('Curves group transfers normalized falling Rotate shape to Deform', () => {
  const selections = fixture();
  const [rotate, deform] = selections.map(selection => member(selection));
  assert.deepEqual(planCurvesHandleGroup(selections, [rotate, deform], curvesHandleId(rotate), {x: .5, y: .25}), [
    {id: 31, nextId: 32, component: 0, control: 0, frame: 9, value: 29.25},
    {id: 41, nextId: 42, component: 0, control: 0, frame: 12, value: .25},
  ]);
  const rotateIncoming = member(selections[0], 1), deformIncoming = member(selections[1], 1);
  assert.deepEqual(planCurvesHandleGroup(selections, [rotate, rotateIncoming, deformIncoming],
    curvesHandleId(rotate), {x: .5, y: .25}), [
    {id: 31, nextId: 32, component: 0, control: 0, frame: 9, value: 29.25},
    {id: 41, nextId: 42, component: 0, control: 1, frame: 18, value: .75},
  ]);

  const fromDeform = planCurvesHandleGroup(selections, [deform, rotate], curvesHandleId(deform), {x: .5, y: 0});
  assert.ok(Object.is(fromDeform[0].value, -0));
  assert.ok(Object.is(selections[1].segment.key.controls[0][1], -0));
});

test('Curves group rejects stale, ambiguous or incompatible peers and preserves f32 no-op', () => {
  const selections = fixture();
  const [rotate, deform] = selections.map(selection => member(selection));
  const origin = {x: .25 + 1e-10, y: .125};
  const active = curvesHandleId(rotate);
  assert.deepEqual(planCurvesHandleGroup(selections, [rotate, deform], active, origin), []);
  assert.equal(planCurvesHandleGroup(selections, [rotate, deform], active, {x: 1.1, y: .25}), null);
  assert.equal(planCurvesHandleGroup(selections, [rotate, deform], 'unknown', origin), null);
  assert.equal(planCurvesHandleGroup(selections, [rotate, {...deform, nextId: 43}], active, origin), null);
  assert.equal(planCurvesHandleGroup(selections, [rotate, {...deform, component: 1}], active, origin), null);
  assert.equal(planCurvesHandleGroup(selections, [rotate, {...deform, trackId: 'stale'}], active, origin), null);
  assert.equal(planCurvesHandleGroup(selections, [rotate, rotate], active, origin), null);
  assert.equal(planCurvesHandleGroup([selections[0], {...selections[1], revision: 8}], [rotate, deform], active, origin), null);
});

test('Curves group preserves a monotone negative Bone incoming time on a vertical drag', () => {
  const tracks = [
    {id: 'rotate:4', channel: 'rotate', boneId: 4, keys: [
      {id: 31, frame: 0, values: [10], interpolation: 'bezier', controls: [[.5, 12.5, -.2, 17.5]]},
      {id: 32, frame: 1, values: [20], interpolation: 'linear'},
    ]},
    {id: 'rotate:5', channel: 'rotate', boneId: 5, keys: [
      {id: 41, frame: 1, values: [30], interpolation: 'bezier', controls: [[2, 35, .6, 45]]},
      {id: 42, frame: 3, values: [50], interpolation: 'linear'},
    ]},
  ];
  const selections = selectedCurveSegments(tracks, new Set([31, 41]))
    .map(segment => ({documentKey: 'project-3', revision: 7, animation: 1, segment}));
  const handles = selections.map(selection => member(selection, 1));
  const point = {x: Math.fround(-.2), y: .65};
  assert.equal(curveSegmentHandleChange(selections[0].segment, 0, 1, point), null);
  assert.deepEqual(planCurvesHandleGroup(selections, handles, curvesHandleId(handles[0]), point), [
    {id: 31, nextId: 32, component: 0, control: 1, frame: Math.fround(-.2), value: 16.5},
    {id: 41, nextId: 42, component: 0, control: 1, frame: Math.fround(.6), value: 43},
  ]);
});
