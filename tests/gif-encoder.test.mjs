import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {GifEncoder} from '../src/domain/gifEncoder.ts';

// Use the GIF decoder already installed with Pixi as an independent reader.
const require = createRequire(import.meta.url);
const {parseGIF, decompressFrames} = createRequire(require.resolve('pixi.js'))('gifuct-js');

function encode(width, height, repeat, frames) {
  const encoder = new GifEncoder({width, height, repeat});
  const chunks = [encoder.header, ...frames.map(([rgba, delay]) => encoder.addFrame(rgba, delay)), encoder.finish()];
  return Uint8Array.from(Buffer.concat(chunks));
}

test('GIF89a frames decode with exact colors, transparency, delays and repeat extension', () => {
  const first = Uint8ClampedArray.of(0, 0, 0, 255, 25, 90, 194, 127);
  const second = Uint8Array.of(22, 73, 90, 0, 137, 31, 80, 128);
  const frames = [[first, 3], [second, 4]];
  const bytes = encode(2, 1, 7, frames);
  assert.equal(bytes.at(-1), 0x3b);
  const parsed = parseGIF(bytes.buffer);
  assert.equal(parsed.header.version, '89a');
  assert.equal(parsed.lsd.width, 2);
  assert.equal(parsed.lsd.height, 1);
  const loop = parsed.frames.find(frame => frame.application).application;
  assert.equal(loop.id, 'NETSCAPE2.0');
  assert.deepEqual([...loop.blocks], [1, 7, 0]);
  const decoded = decompressFrames(parsed, true);
  assert.deepEqual(decoded.map(frame => frame.delay), [30, 40]);
  assert.deepEqual(decoded.map(frame => frame.disposalType), [2, 2]);
  assert.deepEqual([...decoded[0].patch], [0, 0, 0, 255, 0, 0, 0, 0]);
  assert.deepEqual([...decoded[1].patch], [0, 0, 0, 0, 137, 31, 80, 255]);
  assert.equal(parseGIF(encode(2, 1, null, frames).buffer).frames.some(frame => frame.application), false);
  assert.deepEqual([...parseGIF(encode(2, 1, 0, frames).buffer).frames[0].application.blocks], [1, 0, 0]);
});

test('independent decoder recovers noisy exact-color frames through LZW width changes and clears', () => {
  const width = 128, height = 128;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let seed = 17;
  for (let i = 0; i < rgba.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const color = (seed >>> 16) % 255;
    rgba.set([color, 255 - color, color ^ 77, 255], i);
  }
  const [frame] = decompressFrames(parseGIF(encode(width, height, null, [[rgba, 5]]).buffer), true);
  assert.deepEqual(frame.patch, rgba);
});

test('adaptive palette deterministically decodes a frame with over 255 colors', () => {
  const width = 64, height = 64;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rgba.set([x * 4, y * 4, (x + y) * 2, 255], (y * width + x) * 4);
  }
  const frames = [[rgba, 4]];
  const bytes = encode(width, height, 0, frames);
  assert.deepEqual(encode(width, height, 0, frames), bytes);
  const [decoded] = decompressFrames(parseGIF(bytes.buffer), true);
  let error = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    for (let c = 0; c < 3; c++) error += Math.abs(decoded.patch[i + c] - rgba[i + c]);
    assert.equal(decoded.patch[i + 3], 255);
  }
  assert(error / (width * height * 3) < 10);
});

test('encoder rejects invalid ranges and incomplete streams', () => {
  assert.throws(() => new GifEncoder({width: 0, height: 1, repeat: null}), RangeError);
  assert.throws(() => new GifEncoder({width: 1, height: 1, repeat: -1}), RangeError);
  const encoder = new GifEncoder({width: 1, height: 1, repeat: null});
  assert.throws(() => encoder.finish(), /at least one frame/);
  assert.throws(() => encoder.addFrame(new Uint8Array(3), 1), RangeError);
  assert.throws(() => encoder.addFrame(new Uint8Array(4), 1.5), RangeError);
  encoder.addFrame(new Uint8Array(4), 1);
  encoder.finish();
  assert.throws(() => encoder.addFrame(new Uint8Array(4), 1), /already finished/);
  assert.throws(() => encoder.finish(), /already finished/);
});
