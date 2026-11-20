import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  curveSegmentAllowsInterpolation,
  curveSegmentCanEditHandles,
  curveSegmentComponentCount,
  curveSegmentHandleChange,
  normalizeCurveSegment,
  selectedCurveSegments,
} from '../src/domain/curveSegment.ts';

const key = (id, frame, values, interpolation = 'linear', controls = null) => ({
  id, frame, values, interpolation, controls,
});
const track = (channel, keys, owner = {}) => ({ id: 'track-4-' + channel, boneId: 4, channel, keys, ...owner });
const outgoing = (channel, first, next, owner) => selectedCurveSegments([track(channel, [first, next], owner)], new Set([first.id]))[0] ?? null;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);

test('Curves captures one live bone key and its immediate outgoing segment independently of future track mutations', () => {
  const first = key(1, 0, [10, 7], 'bezier', [[5, 12, 15, -2], [6, 10, 14, 3]]);
  const next = key(2, 20, [0, 7]);
  const last = key(3, 30, [15, 6]);
  const rows = [track('event', [key(4, 0, []), key(5, 20, [])]), track('translate', [first, next, last])];
  const [selected] = selectedCurveSegments(rows, new Set([1]));
  assert.equal(selected.trackId, 'track-4-translate');
  assert.equal(selected.bone, 4);
  assert.equal(selected.next.id, 2);
  first.values[0] = 50;
  first.controls[0][0] = 9;
  next.values[0] = 30;
  assert.deepEqual(selected.key.values, [10, 7]);
  assert.deepEqual(selected.key.controls[0], [5, 12, 15, -2]);
  assert.deepEqual(selected.next.values, [0, 7]);
  for (const ids of [[], [4], [99]]) {
    assert.deepEqual(selectedCurveSegments(rows, new Set(ids)), []);
  }
  const tied = track('rotate', [key(6, 10, [0, 0]), key(7, 10 + 1e-9, [20, 0]), key(8, 20, [30, 0])]);
  assert.deepEqual(selectedCurveSegments([tied], new Set([6])), []);
});

test('A single terminal key exposes the preceding outgoing owner and its incoming side', () => {
  const row = track('rotate', [
    key(5, 0, [10, 0]),
    key(6, 10, [20, 0], 'bezier', [[13, 25, 17, 34], [0, 0, 0, 0]]),
    key(7, 20, [40, 0], 'stepped'),
  ]);
  const [segment, extra] = selectedCurveSegments([row], new Set([7]));
  assert.equal(extra, undefined);
  assert.equal(segment.key.id, 6);
  assert.equal(segment.next.id, 7);
  assert.equal(segment.key.interpolation, 'bezier');
  assert.equal(segment.leftSelected, false);
  assert.equal(segment.rightSelected, true);
  assert.deepEqual(curveSegmentHandleChange(segment, 0, 1, {x: 0.8, y: 0.6}), {
    id: 6, component: 0, control: 1, frame: 18, value: 32,
  });
});

test('Multiple selected keys keep outgoing segments in row order and deduplicate owners', () => {
  const translate = track('translate', [key(1, 0, [0, 0]), key(2, 5, [1, 0]), key(3, 10, [2, 0])]);
  const rotate = track('rotate', [key(4, 0, [10, 0]), key(5, 5, [20, 0])]);
  const color = track('rgba', [key(6, 0, [0, 0, 0, 1]), key(7, 5, [1, 1, 1, 1])], {slotId: 4});
  const event = track('event', [key(8, 0, []), key(9, 5, [])]);
  const rows = [translate, rotate, {...translate, id: 'alias'}, color, event];
  const segments = selectedCurveSegments(rows, new Set([8, 6, 5, 3, 1, 2]));
  assert.deepEqual(segments.map(segment => [
    segment.trackId, segment.key.id, segment.next.id, segment.leftSelected, segment.rightSelected,
  ]), [
    [translate.id, 1, 2, true, true],
    [translate.id, 2, 3, true, true],
    [color.id, 6, 7, true, false],
  ]);
  assert.deepEqual(selectedCurveSegments(rows, new Set([5, 8])), []);
  assert.deepEqual(selectedCurveSegments(rows, new Set([3, 5])), []);
});

test('A terminal fallback never skips a tied immediate neighbor or invents a one-key segment', () => {
  const row = track('scaleX', [key(1, 1, [1, 0]), key(2, 10, [2, 0]), key(3, 10 + 1e-9, [3, 0])]);
  assert.deepEqual(selectedCurveSegments([row], new Set([3])), []);
  assert.deepEqual(selectedCurveSegments([track('scaleX', [key(3, 10, [3, 0])])], new Set([3])), []);
});

test('Stock nonlinear decreasing Rotate preserves the signed normalized overshoot', () => {
  const curve = outgoing('rotate',
    key(20, 15, [70, 0], 'bezier', [[Math.fround(0.53 * 30), 97, Math.fround(0.76 * 30), 72], [0, 0, 0, 0]]),
    key(21, 24, [40, 0]));
  const normalized = normalizeCurveSegment(curve, 0);
  assert.equal(normalized.startValue, 70);
  assert.equal(normalized.endValue, 40);
  for (const [index, expected] of [0.1, -0.9, 13 / 15, -1 / 15].entries()) {
    close(normalized.controls[index], expected);
  }
  assert.equal(normalizeCurveSegment(curve, 1), null);
  assert.deepEqual(curveSegmentHandleChange(curve, 0, 0, {x: 1 / 3, y: 0.5}), {
    id: 20, component: 0, control: 0, frame: 18, value: 55,
  });
  assert.equal(curveSegmentHandleChange(curve, 0, 1, {x: normalized.controls[2], y: normalized.controls[3]}), null);
});

test('Equal endpoints expose the interpolation without inventing editable absolute controls', () => {
  const first = key(1, 0, [10, 7], 'bezier', [[5, 12, 15, -2], [6, 10, 14, 3]]);
  const next = key(2, 20, [0, 7]);
  const curve = outgoing('translate', first, next);
  assert.deepEqual(normalizeCurveSegment(curve, 0).controls, [0.25, -0.2, 0.75, 1.2]);
  assert.deepEqual(normalizeCurveSegment(curve, 1), {
    component: 1, startFrame: 0, endFrame: 20, startValue: 7, endValue: 7, interpolation: 'bezier', controls: null,
  });
  assert.equal(curveSegmentHandleChange(curve, 1, 0, {x: 0.3, y: 0.4}), null);
  assert.deepEqual(curve.key.controls[1], [6, 10, 14, 3]);
  for (const interpolation of ['linear', 'stepped']) {
    const flat = outgoing('translateY', key(3, 0, [7, 0], interpolation), key(4, 20, [7, 0]));
    assert.equal(normalizeCurveSegment(flat, 0).interpolation, interpolation);
    assert.equal(normalizeCurveSegment(flat, 0).controls, null);
  }
});

test('Normalized inverse keeps untouched signed zero and accepts only representable monotone writes', () => {
  const curve = outgoing('rotate',
    key(1, 0, [20, 0], 'bezier', [[4, -0, 15, 0], [0, 0, 0, 0]]),
    key(2, 20, [-20, 0]));
  const moved = curveSegmentHandleChange(curve, 0, 0, {x: 1.1, y: 0.5});
  assert.equal(moved.frame, 22, 'a monotone outgoing control can extend beyond the end key');
  assert.ok(Object.is(moved.value, -0));
  assert.equal(curveSegmentHandleChange(curve, 0, 0, {x: 0.2 + 1e-10, y: 0.5}), null);
  assert.equal(curveSegmentHandleChange(curve, 0, 0, {x: -0.01, y: 0.5}), null);
  assert.equal(curveSegmentHandleChange(curve, 0, 0, {x: 1.9, y: 0.5}), null);
  assert.equal(curveSegmentHandleChange(curve, 0, 1, {x: 1.1, y: 0.5}), null);
  assert.equal(curveSegmentHandleChange(curve, 0, 1, {x: 0.5, y: 1e6}), null);
  assert.equal(curveSegmentHandleChange(curve, 0, 1, {x: NaN, y: 0.5}), null);
  assert.equal(curveSegmentHandleChange(curve, 0, 2, {x: 0.5, y: 0.5}), null);
});

test('Stock light RGBA has four signed spans and an interval-bound inverse', () => {
  const start = [0.125490203499794, 0.6901960968971252, 0.3764705955982208, 0.501960813999176];
  const end = [0.501960813999176, 0.250980406999588, 0.8156862854957581, 0.7529411911964417];
  const curve = outgoing('rgba', key(1, 6, start, 'bezier', [
    [7.5, 0.23843137919902802, 10.5, 0.38901960849761963],
    [7.5, 0.5584313869476318, 10.5, 0.38274508714675903],
    [7.5, 0.5082352757453918, 10.5, 0.6839215755462646],
    [7.5, 0.5772548913955688, 10.5, 0.677647054195404],
  ]), key(2, 12, end), {slotId: 6});
  assert.equal(curve.kind, 'rgba');
  assert.equal(curve.slot, 6);
  assert.equal(curve.twoColor, false);
  assert.equal(curveSegmentComponentCount(curve), 4);
  assert.equal(curveSegmentCanEditHandles(curve), true);
  assert.equal(curveSegmentAllowsInterpolation(curve, 'stepped'), true);
  for (const lane of [0, 1, 2, 3]) {
    const normalized = normalizeCurveSegment(curve, lane);
    for (const [index, expected] of [0.25, 0.3, 0.75, 0.7].entries()) {
      close(normalized.controls[index], expected);
    }
  }
  assert.deepEqual(curveSegmentHandleChange(curve, 1, 0, {x: 0.5, y: 2}), {
    id: 1, component: 1, control: 0, frame: 9, value: Math.fround(start[1] + 2 * (end[1] - start[1])),
  });
  assert.equal(curveSegmentHandleChange(curve, 1, 0, {x: 1.1, y: 0.3}), null);
  assert.equal(curveSegmentHandleChange(curve, 1, 1, {x: -0.1, y: 0.7}), null);
});

test('Light RGBA can retain existing signed controls and rejects a newly authored negative zero', () => {
  const curve = outgoing('rgba', key(1, 0, [0, 0.25, 0.5, 1], 'bezier', [
    [2, -0, 8, 0.75], [2, 0.25, 8, 0.25], [2, 0.5, 8, 0.5], [2, 1, 8, 1],
  ]), key(2, 10, [1, 0.25, 0.5, 1]), {slotId: 5});
  assert.equal(curveSegmentCanEditHandles(curve, 0), true);
  assert.equal(curveSegmentCanEditHandles(curve, 1), false);
  const existing = curveSegmentHandleChange(curve, 0, 0, {x: 0.3, y: 0});
  assert.equal(existing.frame, 3);
  assert.ok(Object.is(existing.value, -0));
  assert.equal(curveSegmentHandleChange(curve, 0, 1, {x: 0.8, y: -Number.MIN_VALUE}), null);
  assert.ok(Object.is(curveSegmentHandleChange(curve, 0, 1, {x: 0.8, y: 0}).value, 0));
});

test('Two-color RGBA exposes seven Linear lanes and constraint tracks retain native identity metadata', () => {
  const twoColor = outgoing('rgba', key(1, 0, [0, 0, 0, 1, 0.1, 0.2, 0.3]), key(2, 12, [0, 0, 0, 1, 0.3, 0.5, 0.6]), {slotId: 0});
  assert.equal(twoColor.twoColor, true);
  assert.equal(curveSegmentComponentCount(twoColor), 7);
  assert.equal(curveSegmentAllowsInterpolation(twoColor, 'linear'), true);
  assert.equal(curveSegmentAllowsInterpolation(twoColor, 'stepped'), false);
  assert.equal(curveSegmentAllowsInterpolation(twoColor, 'bezier'), false);
  assert.equal(curveSegmentCanEditHandles(twoColor), false);
  assert.equal(normalizeCurveSegment(twoColor, 6).endValue, Math.fround(0.6));
  assert.equal(normalizeCurveSegment(twoColor, 7), null);

  const transform = outgoing('transformMix', key(1, 0, [1, 0, 0, 1, 1, 0.5]), key(2, 12, [1, 1, 1, 1, 1, 0.25]), {constraintId: 3});
  assert.equal(transform.kind, 'transformMix');
  assert.equal(transform.constraint, 3);
  assert.equal(curveSegmentComponentCount(transform), 6);
  assert.equal(normalizeCurveSegment(transform, 5).endValue, 0.25);

  const mass = outgoing('physics', key(1, 0, [2], 'bezier', [[2, 1.5, 8, 0.75]]), key(2, 10, [1]), {constraintId: 4, physicsProperty: 'mass'});
  assert.equal(mass.kind, 'physics');
  assert.equal(mass.property, 'mass');
  assert.equal(curveSegmentComponentCount(mass), 1);
  assert.deepEqual(curveSegmentHandleChange(mass, 0, 1, {x: 0.6, y: 3}), {
    id: 1, component: 0, control: 1, frame: 6, value: -1,
  });
  assert.equal(outgoing('physicsReset', key(1, 0, []), key(2, 12, []), {constraintId: 4}), null);
  assert.equal(outgoing('physics', key(1, 0, [2]), key(2, 12, [1]), {constraintId: 4}), null);
});

test('Deform projects an independent scalar on the immediate selected interval', () => {
  const first = {...key(30, 0, [4, -7, 20], 'bezier', [[0, 99, 0, 99]]), progressControls: [8, .25, 16, -.5]};
  const last = key(31, 24, [4, -7, 20]);
  const row = track('deform', [first, last], {attachmentId: 12});
  const [segment] = selectedCurveSegments([row], new Set([last.id]));
  assert.equal(segment.kind, 'deform');
  assert.equal(segment.channel, 'deform');
  assert.equal(segment.attachment, 12);
  assert.equal(segment.key.id, first.id);
  assert.equal(segment.next.id, last.id);
  assert.equal(segment.leftSelected, false);
  assert.equal(segment.rightSelected, true);
  assert.deepEqual(segment.key.values, [0]);
  assert.deepEqual(segment.next.values, [1]);
  assert.equal(curveSegmentComponentCount(segment), 1);
  assert.equal(curveSegmentCanEditHandles(segment), true);
  for (const mode of ['linear', 'stepped', 'bezier']) assert.equal(curveSegmentAllowsInterpolation(segment, mode), true);
  assert.equal(normalizeCurveSegment(segment, 1), null);
  first.progressControls[1] = .75;
  assert.deepEqual(segment.key.controls, [[8, .25, 16, -.5]]);
  assert.deepEqual(normalizeCurveSegment(segment, 0).controls, [1 / 3, .25, 2 / 3, -.5]);
  assert.deepEqual(selectedCurveSegments([track('deform', [first, last])], new Set([first.id])), []);

  const tied = track('deform', [first, last, key(32, 24 + 1e-9, [])], {attachmentId: 12});
  assert.deepEqual(selectedCurveSegments([tied], new Set([32])), []);
  assert.deepEqual(selectedCurveSegments([row], new Set([31, 999])), []);
});

test('Deform controls retain signed zero and enforce native time and magnitude bounds', () => {
  const first = {...key(30, -0, [], 'bezier'), progressControls: [-0, -0, 16, 1.25]};
  const last = key(31, 24, []);
  const segment = outgoing('deform', first, last, {attachmentId: 12});
  const normalized = normalizeCurveSegment(segment, 0);
  assert.ok(Object.is(normalized.controls[0], -0));
  assert.ok(Object.is(normalized.controls[1], -0));
  assert.equal(normalized.controls[3], 1.25);
  assert.equal(curveSegmentHandleChange(segment, 0, 0, {x: -0, y: -0}), null);
  assert.deepEqual(curveSegmentHandleChange(segment, 0, 0, {x: .25, y: 0}), {
    id: 30, component: 0, control: 0, frame: 6, value: -0,
  });
  assert.deepEqual(curveSegmentHandleChange(segment, 0, 1, {x: .75, y: -Number.MIN_VALUE}), {
    id: 30, component: 0, control: 1, frame: 18, value: -0,
  });
  assert.deepEqual(curveSegmentHandleChange(segment, 0, 1, {x: 1, y: -2}), {
    id: 30, component: 0, control: 1, frame: 24, value: -2,
  });
  assert.equal(curveSegmentHandleChange(segment, 0, 1, {x: 1.001, y: 1}), null);
  assert.equal(curveSegmentHandleChange(segment, 0, 0, {x: -.01, y: 0}), null);
  assert.equal(curveSegmentHandleChange(segment, 0, 1, {x: .75, y: 1_000_001}), null);
  for (const invalid of [[8, .25, 25, .75], [8, .25, 16, 1_000_001]]) {
    const malformed = outgoing('deform', {...first, progressControls: invalid}, last, {attachmentId: 12});
    assert.equal(normalizeCurveSegment(malformed, 0), null);
    assert.equal(curveSegmentCanEditHandles(malformed), false);
  }
});

test('Stock IK controls belong to the outgoing ease and keep key flags independent', () => {
  const flags = {stretch: true, compress: false, bendPositive: true};
  const first = {
    ...key(1, 6, [0.81, 8.25], 'bezier', [[7.5, 0.67, 10.5, 0.49], [7.5, 7, 10.5, 4.75]]),
    ikFlags: flags,
  };
  const next = key(2, 12, [0.34, 3.75], 'stepped');
  const curve = outgoing('ik', first, next, {constraintId: 2});
  assert.equal(curve.kind, 'ik');
  assert.equal(curveSegmentComponentCount(curve), 2);
  flags.stretch = false;
  assert.deepEqual(curve.key.ikFlags, {stretch: true, compress: false, bendPositive: true});
  assert.equal(curve.next.interpolation, 'stepped');
  const softness = normalizeCurveSegment(curve, 1);
  for (const [index, expected] of [0.25, 5 / 18, 0.75, 7 / 9].entries()) close(softness.controls[index], expected);
  assert.equal(curveSegmentHandleChange(curve, 1, 1, {x: 1.001, y: 0.6}), null);
  assert.deepEqual(curveSegmentHandleChange(curve, 1, 1, {x: 1, y: 1.5}), {
    id: 1, component: 1, control: 1, frame: 12, value: 1.5,
  });
});
