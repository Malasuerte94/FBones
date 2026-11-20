import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sampleDeform} from '../src/domain/animationGeometry.ts';
import {planDeformKey} from '../src/domain/deformKey.ts';

function bezierTrack(before, after, controls = [8, .25, 16, .75], end = 24) {
  return {attachment: 13, keys: [
    {id: 21, frame: 0, offsets: before, dataPresent: true, curve: 'bezier', controls},
    {id: 22, frame: end, offsets: after, dataPresent: true, curve: 'linear'},
  ]};
}

test('Deform Key normalizes child progress and preserves clean signed offset lanes', () => {
  const track = bezierTrack([0, 1, -0, 4], [8, 5, -0, 4]);
  const [first, center] = planDeformKey(track, 12, 4);
  assert.deepEqual(first, {attachment: 13, keyId: 21, frame: 0, offsets: [0, 1, -0, 4],
    dataPresent: true, curve: 'bezier', controls: [4, .25, 8, .625]});
  assert.deepEqual(center, {attachment: 13, frame: 12, offsets: [4, 3, -0, 4],
    curve: 'bezier', controls: [16, .375, 20, .75]});

  const subdivided = [{...first, id: 21}, {...center, id: 23}, track.keys[1]];
  for (const frame of [6, 12, 18]) {
    const before = sampleDeform(track.keys, frame, 4);
    const after = sampleDeform(subdivided, frame, 4);
    assert.ok(after.every((value, axis) => Math.abs(value - before[axis]) < 1e-12));
  }
  const [draftFirst, draftCenter] = planDeformKey(track, 12, 4, [6, 3, 0, 4]);
  assert.deepEqual(draftFirst, first);
  assert.deepEqual(draftCenter, {...center, offsets: [6, 3, -0, 4]});
  assert.deepEqual(track.keys[0].controls, [8, .25, 16, .75]);
});

test('Deform Key keeps overshoot and rejects a varying clean half that cannot be stored', () => {
  const overshoot = bezierTrack([0, 2], [8, 2], [8, -2, 16, -2]);
  const [first, center] = planDeformKey(overshoot, 12, 2);
  assert.deepEqual(center.offsets, [-11, 2]);
  assert.ok(first.controls[3] > 1);

  const constant = bezierTrack([2, -0], [2, -0], [8, 0, 16, -1]);
  const [constantFirst, constantCenter] = planDeformKey(constant, 18, 2);
  assert.equal(constantFirst.curve, 'linear');
  assert.deepEqual(constantCenter.offsets, [2, -0]);
  assert.deepEqual(constantCenter.controls, [20, .1875, 22, .5]);
  assert.throws(() => planDeformKey(bezierTrack([2, 0], [8, 0], [8, 0, 16, -1]), 18, 2),
    /cannot represent a varying coordinate/);

  const collapsed = bezierTrack([1, 2], [1 + 2 ** -23, 2], [8, 100000, 16, -100000]);
  assert.throws(() => planDeformKey(collapsed, 12, 2), /cannot represent a varying coordinate/);
  const crossedTime = bezierTrack([0, 2], [8, 2], [16, .25, 0, .75], 16);
  assert.throws(() => planDeformKey(crossedTime, 9, 2), /native progress control bounds/);
});

test('Deform Key addresses the rightmost exact f32 key and preserves Stepped presence', () => {
  const track = {attachment: 13, keys: [
    {id: 1, frame: 4, offsets: [2, -0], dataPresent: true, curve: 'linear'},
    {id: 2, frame: 4, offsets: [0, 0], dataPresent: true, curve: 'stepped'},
    {id: 3, frame: 8, offsets: [3, -0], dataPresent: true, curve: 'linear'},
  ]};
  const sameFrame = 4 + 2 ** -24;
  assert.deepEqual(planDeformKey(track, sameFrame, 2), []);
  assert.deepEqual(planDeformKey(track, sameFrame, 2, [1, -0]), [{attachment: 13, frame: 4,
    keyId: 2, offsets: [1, 0], dataPresent: true, curve: 'stepped'}]);
  assert.deepEqual(planDeformKey(track, 6, 2), [{attachment: 13, frame: 6, offsets: [0, 0],
    dataPresent: true, curve: 'stepped'}]);
  assert.equal(planDeformKey(track, 2, 2)[0].curve, 'linear');
});
