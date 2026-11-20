import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planTimelineAdjustKeys, prepareTimelineAdjust} from '../src/domain/timelineAdjust.ts';

function key(id, frame, values, curve = 'linear') {
  return {id, frame, values, curve};
}

function clip(...tracks) {
  return {id: 82, name: 'Adjust', duration: 120, tracks};
}

test('Adjust captures only selected native keys and preserves turns, frames and interpolation', () => {
  const source = clip(
    {bone: 2, channel: 'rotate', keys: [
      key(10, 0, [0, 0]), key(11, 15, [50, 0], 'stepped'),
      key(12, 45, [85, 0]), key(13, 60, [320, 0]),
    ]},
    {bone: 3, channel: 'rotate', keys: [key(14, 15, [120, 0])]},
  );
  const selected = [10, 11, 12];
  const plan = prepareTimelineAdjust(source, selected, 2, 15, 'rotate');
  assert.ok(plan);
  assert.deepEqual(plan.axes, {x: true, y: false});
  assert.equal(plan.animation, 82);
  assert.equal(plan.frame, 15);
  assert.deepEqual(plan.keys.map(({id}) => id), [10, 11, 12]);
  const edits = planTimelineAdjustKeys(plan, {tool: 'rotate', degrees: 375});
  assert.deepEqual(edits, [
    {bone: 2, channel: 'rotate', keyId: 10, frame: 0, values: [375, 0], curve: 'linear'},
    {bone: 2, channel: 'rotate', keyId: 11, frame: 15, values: [425, 0], curve: 'stepped'},
    {bone: 2, channel: 'rotate', keyId: 12, frame: 45, values: [460, 0], curve: 'linear'},
  ]);
  selected.push(13);
  source.tracks[0].keys[0].values[0] = 100;
  assert.deepEqual(plan.keyIds, [10, 11, 12]);
  assert.deepEqual(planTimelineAdjustKeys(plan, {tool: 'rotate', degrees: 375}), edits);
  assert.deepEqual(planTimelineAdjustKeys(plan, {tool: 'rotate', degrees: 0}), []);
});

test('Adjust maps local translation and scale factors across combined and separated rows', () => {
  const split = clip(
    {bone: 2, channel: 'translateX', keys: [key(10, 0, [1, 0]), key(11, 15, [2, 0])]},
    {bone: 2, channel: 'translateY', keys: [key(12, 0, [3, 0]), key(13, 15, [4, 0])]},
  );
  const combined = clip({bone: 2, channel: 'scale', keys: [
    key(20, 0, [1.25, -0]), key(21, 15, [-2, .5]),
  ]});
  const onlyY = prepareTimelineAdjust(split, [12, 13], 2, 15, 'translate');
  assert.deepEqual(onlyY.axes, {x: false, y: true});
  assert.deepEqual(planTimelineAdjustKeys(onlyY, {tool: 'translate', x: 50, y: -2}).map(({values}) => values), [[1, 0], [2, 0]]);
  const both = prepareTimelineAdjust(split, [10, 11, 12, 13], 2, 15, 'translate');
  assert.deepEqual(both.axes, {x: true, y: true});
  assert.deepEqual(planTimelineAdjustKeys(both, {tool: 'translate', x: 2, y: -2}).map(({values}) => values), [[3, 0], [4, 0], [1, 0], [2, 0]]);
  const scale = prepareTimelineAdjust(combined, [20, 21], 2, 15, 'scale');
  assert.deepEqual(planTimelineAdjustKeys(scale, {tool: 'scale', x: 2, y: 4}).map(({values}) => values), [[2.5, -0], [-4, 2]]);
  assert.deepEqual(planTimelineAdjustKeys(scale, {tool: 'scale', x: 1, y: 1}), []);
});

test('Adjust rejects stale or unsupported key scope and leaves invalid numeric batches unplanned', () => {
  const source = clip(
    {bone: 2, channel: 'rotate', keys: [
      key(10, 0, [1, 0], 'bezier'), key(11, 15, [2, 0]),
      key(12, 30, [3, 0]), key(13, 30, [4, 0]), key(14, 45, [1_000_000, 0]),
    ]},
    {bone: 3, channel: 'rotate', keys: [key(20, 30, [6, 0])]},
  );
  assert.equal(prepareTimelineAdjust(source, [10], 2, 0, 'rotate'), null);
  assert.equal(prepareTimelineAdjust(source, [11], 2, 15, 'rotate'), null);
  for (const selected of [[12], [12, 14], [13, 20], [13, 13], [13, 99]]) {
    assert.equal(prepareTimelineAdjust(source, selected, 2, 30, 'rotate'), null);
  }
  const plan = prepareTimelineAdjust(source, [13, 14], 2, 30, 'rotate');
  assert.ok(plan);
  assert.throws(() => planTimelineAdjustKeys(plan, {tool: 'rotate', degrees: 15}), /native key range/);
  assert.throws(() => planTimelineAdjustKeys(plan, {tool: 'rotate', degrees: Infinity}), /finite/);
  assert.throws(() => planTimelineAdjustKeys(plan, {tool: 'scale', x: 2, y: 2}), /transform changed/);
  assert.equal(source.tracks[0].keys[4].values[0], 1_000_000);
});
