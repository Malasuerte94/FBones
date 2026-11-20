import { test } from 'node:test';
import assert from 'node:assert/strict';
import { samplePreviewTracks } from '../src/domain/previewTracks.ts';

const project = {
  sceneEditing: true,
  animationFps: 30,
  bones: [{id: 1, parent: null, name: 'root', x: 10, y: 20, rotation: 15, scaleX: -2, scaleY: 3, shearX: 2, shearY: -4, length: 0}],
  slots: [],
};

const boneTrack = (channel, values, frame = 0) => ({
  bone: 1, channel, keys: [{id: 1, frame, values, curve: 'linear'}],
});
const clip = (tracks, slotTracks = []) => ({id: 1, name: 'Preview clip', duration: 30, tracks, slotTracks});
const sample = (clip, additive = false, frame = 0) => ({clip, frame, additive});
const track = (current, previous = null, mix = 1, alpha = 1) => ({current, previous, mix, alpha});

const lower = clip([
  boneTrack('translate', [40, -5]), boneTrack('rotate', [30, 0]),
  boneTrack('scale', [2, .5]), boneTrack('shear', [-4, 2]),
]);

test('upper additive Preview applies authored deltas and signed Setup scale per axis', () => {
  const upper = clip([
    boneTrack('translateX', [20, 0]), boneTrack('translateY', [30, 0], 10), boneTrack('rotate', [270, 0]),
    boneTrack('scaleX', [.5, 0]), boneTrack('scaleY', [-1, 0]), boneTrack('shear', [10, -6]),
  ]);
  const before = structuredClone({project, lower, upper});
  const composition = [track(sample(lower)), track(sample(upper, true), null, 1, .5)];
  const {bones: [pose]} = samplePreviewTracks(project, composition);
  assert.equal(pose.x, 60);
  assert.equal(pose.y, 15, 'the additive Y row starts after the sampled frame');
  assert.equal(pose.rotation, 180, 'authored +270 contributes +135 degrees');
  assert.equal(pose.scaleX, -3.5);
  assert.equal(pose.scaleY, -1.5);
  assert.equal(pose.shearX, 3);
  assert.equal(pose.shearY, -5);
  assert.equal(samplePreviewTracks(project, composition).bones[0].x, 60, 'Additive does not accumulate between draws');
  assert.deepEqual({project, lower, upper}, before);
  const packed = clip([...upper.tracks.filter(({channel}) => channel !== 'scaleX' && channel !== 'scaleY'), boneTrack('scale', [.5, -1])]);
  assert.deepEqual(samplePreviewTracks(project, [track(sample(lower)), track(sample(packed, true), null, 1, .5)]).bones[0], pose);

  const ordinary = samplePreviewTracks(project, [track(sample(lower)), track(sample(upper), null, 1, .5)]).bones[0];
  assert.equal(ordinary.x, 40);
  assert.equal(ordinary.rotation, -15);
  assert.deepEqual(samplePreviewTracks(project, [track(sample(lower, true))]), samplePreviewTracks(project, [track(sample(lower))]));
});

test('Preview crossfades additive and replacement contributions over the same lower pose', () => {
  const additive = sample(clip([boneTrack('translate', [20, 12]), boneTrack('rotate', [270, 0])]), true);
  const replacement = sample(clip([boneTrack('translateX', [-20, 0]), boneTrack('rotate', [60, 0])]));
  const compose = overlay => samplePreviewTracks(project, [track(sample(lower)), overlay]).bones[0];

  const towardReplacement = compose(track(replacement, additive, .25, .5));
  assert.equal(towardReplacement.x, 50);
  assert.equal(towardReplacement.y, 19.5);
  assert.equal(towardReplacement.rotation, 150);
  assert.deepEqual(compose(track(additive, replacement, .75, .5)), towardReplacement);

  const fadingOut = compose(track(null, additive, .25, .5));
  assert.equal(fadingOut.x, 57.5);
  assert.equal(fadingOut.rotation, 146.25);
  assert.equal(compose(track(null, additive, 1, .5)).x, 50);
  assert.equal(compose(track(additive, null, 1, 0)).x, 50);
});

test('Preview Additive leaves light and dark slot colors in ordinary track blending', () => {
  const slot = {id: 2, name: 'Tint', bone: 1, visible: false, activeAttachmentId: null, attachments: [], tintBlack: true};
  const rgba = (values, darkValues) => ({slot: 2, channel: 'rgba', keys: [{id: 1, frame: 0, values, darkValues, curve: 'linear'}]});
  const baseColor = clip([], [rgba([.25, .25, .75, .5], [0, .5, .25])]);
  const overlay = clip([boneTrack('translateX', [10, 0])], [rgba([.75, .5, .25, 1], [.5, 0, .75])]);
  const render = additive => samplePreviewTracks({...project, slots: [slot]}, [track(sample(baseColor)), track(sample(overlay, additive), null, 1, .5)]);
  const tinted = render(true).slots[0];
  assert.deepEqual(tinted, render(false).slots[0]);
  assert.deepEqual(tinted.animatedColor, [.5, .375, .5, .75]);
  assert.deepEqual(tinted.animatedDarkColor, [.25, .25, .5]);
});
