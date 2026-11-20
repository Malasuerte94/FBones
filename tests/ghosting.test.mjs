import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGhostingSampler, defaultGhostingSettings, MAX_GHOST_MOTION_VECTORS, planGhosting, planGhostingMotion,
  resolveGhostingBoneFilter, traceGhostingMotion,
} from '../src/domain/ghosting.ts';

const bones = [{id: 1}, {id: 2, parent: 1}, {id: 3}];

test('Ghosting selection starts disabled and follows only explicitly selected live bones', () => {
  assert.equal(defaultGhostingSettings().selectionOnly, false);
  assert.deepEqual(resolveGhostingBoneFilter(bones, [1, 1], null), new Set([1]));
  assert.deepEqual(resolveGhostingBoneFilter(bones, [2, 99, 3], null), new Set([2, 3]));
  assert.equal(resolveGhostingBoneFilter(bones, [], null), null);
  assert.equal(resolveGhostingBoneFilter(bones, [99], null), null);
});

test('Ghosting lock retains the captured membership and treats deleted owners as absent', () => {
  const captured = [1, 3];
  assert.deepEqual(resolveGhostingBoneFilter(bones, [2], captured), new Set([1, 3]));
  assert.deepEqual(resolveGhostingBoneFilter(bones.slice(1), [2], captured), new Set([3]));
  assert.deepEqual(resolveGhostingBoneFilter([bones[1]], [2], captured), new Set());
  assert.deepEqual(resolveGhostingBoneFilter(bones, [1, 3], [2]), new Set([2]));
  assert.equal(resolveGhostingBoneFilter(bones, [2], []), null);
  assert.deepEqual(captured, [1, 3]);
});

test('Motion vector spans ignore onion-skin spacing, clip at the animation edge and share the pose budget', () => {
  const settings = defaultGhostingSettings();
  assert.equal(settings.motionVectors.beforeEnabled, false);
  assert.equal(settings.motionVectors.afterEnabled, false);
  Object.assign(settings.motionVectors, {beforeEnabled: true, afterEnabled: true, before: 4, after: 7});
  settings.frames.step = 2;

  const plan = planGhostingMotion(settings, 5, 10, null, 3);
  assert.equal(plan.baseline.frame, 5);
  assert.deepEqual(plan.endpoints.map(({direction, sample}) => [direction, sample.frame, sample.delta, sample.color]), [
    [-1, 1, 0, 0xf07478], [1, 10, 0, 0x5aa9f0],
  ]);
  assert.equal(plan.reserved, 3);
  assert.equal(plan.limited, false);
  assert.deepEqual(planGhosting(settings, 5, [], 10, null, 4 - plan.reserved).samples.map(sample => sample.frame), [3]);

  const partial = planGhostingMotion(settings, 5, 10, null, 2);
  assert.deepEqual(partial.endpoints.map(({direction}) => direction), [-1]);
  assert.equal(partial.reserved, 2);
  assert.equal(partial.limited, true);
  assert.deepEqual(planGhostingMotion(settings, 5, 10, null, 1), {baseline: null, endpoints: [], reserved: 0, limited: true});
});

test('Motion vectors preserve chronological side across a Repeat seam and share identical endpoints', () => {
  const settings = defaultGhostingSettings();
  Object.assign(settings.motionVectors, {beforeEnabled: true, afterEnabled: true, before: 3, after: 3});
  settings.loop = true;
  const repeated = planGhostingMotion(settings, 3, 10, {start: 2, end: 8}, 2);
  assert.deepEqual(repeated.endpoints.map(({direction, sample}) => [direction, sample.frame]), [[-1, 6], [1, 6]]);
  assert.equal(repeated.reserved, 2);
  assert.equal(repeated.limited, false);
  assert.deepEqual(planGhostingMotion(settings, 0, 0, null, 2), {baseline: null, endpoints: [], reserved: 0, limited: false});
});

const quad = {name: 'image', image: 'image', x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 4, height: 2};
const slot = (id, attachment = id) => ({id, activeAttachmentId: attachment, name: 'slot', bone: 1, visible: true, region: quad});
const pose = (x, slots, color = 0xffffff) => ({
  frame: 0, bones: [{id: 1, parent: null, x, y: 0, rotation: 0, length: 0, name: 'root'}],
  slots, color, alpha: .4, offsetX: 999, offsetY: -999, fill: 'none', outline: 'none',
});

test('Frames and Key Frames carry independent display modes with Key Frames taking precedence', () => {
  const settings = defaultGhostingSettings();
  assert.deepEqual([settings.frames.fill, settings.frames.outline, settings.keyFrames.fill, settings.keyFrames.outline],
    ['none', 'none', 'none', 'none']);
  Object.assign(settings.frames, {afterEnabled: false, fill: 'images', outline: 'silhouette', current: true});
  Object.assign(settings.keyFrames, {beforeEnabled: true, fill: 'solid', outline: 'xray', current: true});
  const samples = planGhosting(settings, 6, [4, 5], 10, null, 16).samples;
  assert.deepEqual(samples.map(({frame, color, fill, outline}) => [frame, color, fill, outline]), [
    [2, 0x61a8dd, 'images', 'silhouette'],
    [4, 0xa18cf0, 'solid', 'xray'],
    [5, 0xa18cf0, 'solid', 'xray'],
    [6, 0xffffff, 'solid', 'xray'],
  ]);
  settings.bones = false;
  Object.assign(settings.keyFrames, {fill: 'none', outline: 'none'});
  assert.deepEqual(planGhosting(settings, 6, [4, 5], 10, null, 16).samples.map(sample => sample.frame), [2]);
});

test('Ghosting spends extra work only for samples with attachment paint or outlines', () => {
  const settings = defaultGhostingSettings();
  settings.frames.afterEnabled = false;
  Object.assign(settings.keyFrames, {beforeEnabled: true, outline: 'silhouette'});
  const samples = planGhosting(settings, 6, [5], 10, null, 16, {work: 7, poseCost: 2, attachmentCost: 3});
  assert.deepEqual(samples.samples.map(sample => sample.frame), [4, 5]);
  assert.equal(samples.limited, true);

  const model = pose(0, [slot(10)]);
  const sample = createGhostingSampler(model, {id: 1, name: 'Clip', duration: 10, tracks: []}, 30);
  const current = {frame: 0, delta: 0, color: 0xffffff};
  const bonesOnly = sample(current, settings);
  const outlined = sample({...current, outline: 'silhouette'}, settings);
  assert.deepEqual(bonesOnly.slots, []);
  assert.equal(outlined.bones, bonesOnly.bones);
  assert.equal(outlined.slots[0].id, 10);
  assert.equal(outlined.fill, 'none');
  assert.equal(outlined.outline, 'silhouette');
  assert.deepEqual(sample(current, settings).slots, []);
  assert.equal(sample(current, settings, true).slots, outlined.slots, 'motion may request cached geometry independently');
});

test('Region vectors compare world vertices in chronological order and apply a world-length threshold', () => {
  const baseline = pose(3, [slot(10), slot(11)]);
  const endpoints = [
    {direction: -1, sample: pose(-1, [slot(10), slot(11, 12)], 0xf07478)},
    {direction: 1, sample: pose(8, [slot(10), {...slot(11), visible: false}], 0x5aa9f0)},
  ];
  const {vectors, limited} = traceGhostingMotion(baseline, endpoints, 4);
  assert.equal(limited, false);
  assert.equal(vectors.length, 8, 'swapped and hidden attachments do not produce lines');
  assert.deepEqual(vectors[0], {bone: 1, from: {x: -3, y: -1}, to: {x: 1, y: -1}, color: 0xf07478, alpha: .4});
  assert.deepEqual(vectors[4], {bone: 1, from: {x: 1, y: -1}, to: {x: 6, y: -1}, color: 0x5aa9f0, alpha: .4});
  assert.deepEqual(traceGhostingMotion(baseline, endpoints, 4.125).vectors, vectors.slice(4));
});

test('Mesh vectors track matching deformed vertex indices and skip changes of topology', () => {
  const mesh = {
    bones: [1], weighted: false, triangles: [0, 1, 2],
    vertices: [[0, 0], [2, 0], [0, 2]].map(positions => ({weights: [1], positions})),
  };
  const from = pose(0, [{...slot(10), mesh}]);
  const deformed = {...mesh, vertices: [mesh.vertices[0], {weights: [1], positions: [5, 0]}, mesh.vertices[2]]};
  const later = pose(0, [{...slot(10), mesh: deformed}]);
  assert.deepEqual(traceGhostingMotion(from, [{direction: 1, sample: later}], 0).vectors, [
    {bone: 1, from: {x: 2, y: 0}, to: {x: 5, y: 0}, color: 0xffffff, alpha: .4},
  ]);
  const replaced = pose(0, [{...slot(10), mesh: {...deformed, triangles: [0, 2, 1]}}]);
  assert.deepEqual(traceGhostingMotion(from, [{direction: 1, sample: replaced}], 0).vectors, []);
});

test('Motion vector work stops at the segment limit and signals omitted lines', () => {
  const regions = Array.from({length: MAX_GHOST_MOTION_VECTORS / 4 + 1}, (_, index) => slot(index + 1));
  const result = traceGhostingMotion(pose(0, regions), [{direction: 1, sample: pose(1, regions)}], 0);
  assert.equal(result.vectors.length, MAX_GHOST_MOTION_VECTORS);
  assert.equal(result.limited, true);
});
