import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  captureCurvePresetControls,
  curvePresetStorageKey,
  maxCurvePresets,
  maxCurvePresetNameLength,
  normalizeCurvePresetName,
  projectCurvePresetControls,
  readCurvePresets,
} from '../src/domain/curvePresets.ts';
import { selectedCurveSegments } from '../src/domain/curveSegment.ts';

function segment(channel, startFrame, endFrame, start, end, controls = null, owner = {}) {
  return selectedCurveSegments([{
    id: channel,
    boneId: 1,
    channel,
    keys: [
      {id: 1, frame: startFrame, values: start, interpolation: controls ? 'bezier' : 'linear', controls},
      {id: 2, frame: endFrame, values: end, interpolation: 'linear'},
    ],
    ...owner,
  }], new Set([1]))[0];
}

test('Curve presets retain signed overshoot and replay relative handles over different frame and value spans', () => {
  const source = segment('rotate', 10, 20, [60], [20], [[21, 70, 15, 0]]);
  const controls = captureCurvePresetControls(source, 0);
  assert.deepEqual(controls, [1.1, -0.25, 0.5, 1.5]);
  assert.deepEqual(projectCurvePresetControls(source, 0, controls), [21, 70, 15, 0]);
  const destination = segment('translateX', 30, 50, [-5], [15]);
  assert.deepEqual(projectCurvePresetControls(destination, 0, controls), [52, -10, 40, 25]);
  assert.equal(captureCurvePresetControls(destination, 0), null);
  assert.equal(captureCurvePresetControls(source, 1), null);
});

test('Curve preset inverse respects family bounds and preserves coincident signed controls', () => {
  const color = segment('rgba', 0, 10, [0, 0, 0, 1], [1, 0, 0, 1], null, {slotId: 4});
  assert.deepEqual(projectCurvePresetControls(color, 0, [0.8, -0.25, 0.2, 1.5]), [8, -0.25, 2, 1.5]);
  assert.equal(projectCurvePresetControls(color, 0, [1.1, 0, 0.5, 1]), null);
  assert.equal(projectCurvePresetControls(color, 1, [0.25, 0.25, 0.75, 0.75]), null);
  const nearLimit = segment('rotate', 999_990, 1_000_000, [1], [2]);
  assert.equal(projectCurvePresetControls(nearLimit, 0, [1.1, 0, 0.5, 1]), null);
  assert.equal(projectCurvePresetControls(nearLimit, 0, [0.5, 1e7, 0.5, 1]), null);
  assert.equal(projectCurvePresetControls(nearLimit, 0, [0.5, NaN, 0.5, 1]), null);
  const source = segment('rotate', 0, 10, [-1], [1], [[5, -0, 10, 1]]);
  const shape = captureCurvePresetControls(source, 0);
  assert.deepEqual(projectCurvePresetControls(source, 0, shape), [5, -0, 10, 1]);
  assert.equal(projectCurvePresetControls(source, 0, [2, 0, 0.5, 1]), null);
});

test('Curve preset storage discards malformed entries and keeps first valid case-insensitive names in order', () => {
  const controls = [1.1, -0.25, 0.5, 1.5];
  const valid = {name: 'Overshoot', controls};
  assert.ok(curvePresetStorageKey.endsWith('.v1'));
  assert.equal(normalizeCurvePresetName('  Overshoot  '), valid.name);
  assert.equal(normalizeCurvePresetName('   '), null);
  assert.equal(normalizeCurvePresetName('a'.repeat(maxCurvePresetNameLength + 1)), null);
  const entries = [null, {}, {name: 'Overshoot', controls: [0.2, '0.2', 0.8, 0.8]},
    {...valid, name: '  Overshoot '}, {...valid, name: 'overshoot'}, {name: 'Bad time', controls: [-0.2, 0, 0.8, 1]},
    {name: 'Crossed', controls: [0.8, 0, 0.2, 1]}];
  const expected = [valid, entries[6]];
  assert.deepEqual(readCurvePresets(JSON.stringify(entries)), expected);
  assert.deepEqual(readCurvePresets(JSON.stringify(expected)), expected);
  for (const malformed of [null, '{', '{}', 'null', JSON.stringify([{name: 'x'.repeat(65_536), controls}])]) {
    assert.deepEqual(readCurvePresets(malformed), []);
  }
  const many = Array.from({length: maxCurvePresets + 1}, (_, i) => ({name: `Preset ${i}`, controls}));
  assert.deepEqual(readCurvePresets(JSON.stringify(many)), many.slice(0, maxCurvePresets));
});
