import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planGifFrames} from '../src/domain/gifExport.ts';

const plan = (options = {}, duration = 30) => planGifFrames({
  animationId: 1, customRange: false, startFrame: 0, endFrame: 0,
  fps: 30, repeat: true, includeLastFrame: false, ...options,
}, 30, duration);

test('full clip GIF matches measured Spine endpoint and centisecond cadence', () => {
  const regular = plan();
  assert.equal(regular.timesSeconds.length, 30);
  assert.equal(regular.timesSeconds.at(-1), 29 / 30);
  assert.deepEqual(regular.delayCentiseconds, Array(30).fill(3));
  assert.deepEqual(plan({includeLastFrame: true}).timesSeconds, [...regular.timesSeconds, 1]);
  assert.deepEqual(plan({}, 0).timesSeconds, [0]);
});

test('explicit GIF range includes interior endpoints and gates the clip endpoint separately', () => {
  const options = {customRange: true, startFrame: 2, endFrame: 6, fps: 20};
  const expected = {timesSeconds: [2, 3, 4, 5, 6].map(frame => frame / 20), delayCentiseconds: Array(5).fill(5)};
  assert.deepEqual(plan(options), expected);
  assert.deepEqual(plan({...options, includeLastFrame: true}), expected);
  assert.throws(() => plan({...options, endFrame: 21}), /valid GIF frame range/);
  const terminal = {...options, fps: 30, startFrame: 28, endFrame: 30};
  assert.deepEqual(plan(terminal).timesSeconds, [28 / 30, 29 / 30]);
  assert.deepEqual(plan({...terminal, includeLastFrame: true}).timesSeconds, [28 / 30, 29 / 30, 1]);
  assert.deepEqual(plan({...terminal, startFrame: 30}).timesSeconds, [29 / 30]);
  for (const includeLastFrame of [false, true]) {
    assert.deepEqual(plan({customRange: true, startFrame: 0, endFrame: 7, fps: 7, includeLastFrame}, 27),
      plan({fps: 7, includeLastFrame}, 27));
  }
});
