import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleTrack} from '../src/domain/animation.ts';
import {planOrdinaryBoneKeySubdivision, planShownBoneKeys, splitShownBezierAxis} from '../src/domain/keyShownBone.ts';

const setup = {id: 1, parent: null, name: 'root', x: 30, y: 3, rotation: 23, length: 10, scaleX: -2, scaleY: 0};

test('Key Shown keeps original bits and IDs at an exact bone key', () => {
  const controls = [[0, -0, 7, 4], [1, 2, 5, 7]];
  const track = {bone: setup.id, channel: 'translate', keys: [
    {id: 19, frame: 0, values: [1, -0], curve: 'bezier', controls},
    {id: 20, frame: 12, values: [10, 9], curve: 'linear'},
  ]};
  const working = {...setup, x: 31};
  assert.deepEqual(planShownBoneKeys(track, 0, setup, working), []);
  const [edit] = planShownBoneKeys(track, 0, setup, {...working, x: 32});
  assert.deepEqual(edit, {bone: 1, channel: 'translate', keyId: 19, frame: 0, values: [2, -0], curve: 'bezier', controls});
  assert.notEqual(edit.controls, controls);
  assert.deepEqual(track.keys[0].values, [1, -0]);
});

test('Key Shown samples held, Setup and trailing bone values without inverting a clean zero scale', () => {
  const track = {bone: setup.id, channel: 'scale', keys: [
    {id: 19, frame: 4, values: [2, -0], curve: 'stepped'},
    {id: 20, frame: 12, values: [3, 7], curve: 'linear'},
  ]};
  assert.deepEqual(planShownBoneKeys(track, 0, setup), [{bone: 1, channel: 'scale', frame: 0, values: [1, 1], curve: 'stepped'}]);
  assert.deepEqual(planShownBoneKeys(track, 8, setup), [{bone: 1, channel: 'scale', frame: 8, values: [2, -0], curve: 'stepped'}]);
  assert.deepEqual(planShownBoneKeys(track, 13, setup), [{bone: 1, channel: 'scale', frame: 13, values: [3, 7], curve: 'linear'}]);
  const [changed] = planShownBoneKeys(track, 4, setup, {...setup, scaleX: -3, scaleY: -0});
  assert.deepEqual(changed.values, [1.5, -0]);
  assert.throws(() => planShownBoneKeys(track, 8, setup, {...setup, scaleY: 1}), /zero Setup scale/);
});

test('Key Shown splits the independent bone cubics and retains their sampled shape', () => {
  const track = {bone: setup.id, channel: 'translate', keys: [
    {id: 19, frame: 0, values: [0, 0], curve: 'bezier', controls: [[4, 30, 10, 60], [2, 50, 18, -10]]},
    {id: 20, frame: 20, values: [100, 60], curve: 'linear'},
  ]};
  const [first, second] = planShownBoneKeys(track, 7, setup);
  assert.equal(first.keyId, 19);
  assert.equal(second.keyId, undefined);
  assert.equal(first.frame, 0);
  assert.equal(second.frame, 7);
  assert.notEqual(first.controls[0][0], first.controls[1][0]);
  const split = {...track, keys: [{...first, id: 19}, {...second, id: 21}, track.keys[1]]};
  for (const frame of [0, 1, 3.5, 6, 7, 9, 13, 19, 20]) {
    const expected = sampleTrack(track, frame);
    const actual = sampleTrack(split, frame);
    for (const axis of [0, 1]) assert.ok(Math.abs(actual[axis] - expected[axis]) < 0.00001);
  }
  const timeOvershoot = splitShownBezierAxis(0, 8, 0, 8, [9, 4, 2, 6], 4);
  assert.ok(timeOvershoot.value > 0 && timeOvershoot.value < 8);
  assert.throws(() => splitShownBezierAxis(0, 8, 0, 8, [12, 4, 0, 6], 4), /time reverses/);
});

// The retained Rotate f6–f18 export supplies the asymmetric source curve.
// The expected controls are the analytic split of its f32 inputs.
const asymmetricControls = [7.5, 20.6, 14.148648, 67].map(Math.fround);
const asymmetricLeft = [6.843306541442871, 24.277482986450195, 9.313966751098633, 36.87581253051758];
const asymmetricRight = [14.091647148132324, 52.10134506225586, 16.31389617919922, 56.318115234375];
const asymmetricAt12 = 45.435672760009766;

test('ordinary Bone Key subdivides the asymmetric Rotate cubic at the requested time', () => {
  const track = {bone: setup.id, channel: 'rotate', keys: [
    {id: 19, frame: 6, values: [29, 0], curve: 'bezier', controls: [asymmetricControls, [0, 0, 0, 0]]},
    {id: 20, frame: 18, values: [48, 0], curve: 'linear'},
  ]};
  const edits = planOrdinaryBoneKeySubdivision(track, 12, setup);
  assert.deepEqual(edits, [
    {bone: 1, channel: 'rotate', keyId: 19, frame: 6, values: [29, 0], curve: 'bezier', controls: [asymmetricLeft, [0, 0, 0, 0]]},
    {bone: 1, channel: 'rotate', frame: 12, values: [asymmetricAt12, 0], curve: 'bezier', controls: [asymmetricRight, [0, 0, 0, 0]]},
  ]);
  const [previous, inserted] = edits;
  const split = {...track, keys: [{...previous, id: 19}, {...inserted, id: 21}, track.keys[1]]};
  for (const [frame, expected] of [[9, 34.700406833592], [15, 52.198174355178]]) {
    assert.ok(Math.abs(sampleTrack(split, frame)[0] - expected) < 0.00001);
  }
  assert.deepEqual(track.keys[0].controls[0], [7.5, 20.6, 14.148648, 67].map(Math.fround));
});

test('ordinary Bone Key moves only the dirty lane controls adjoining the inserted value', () => {
  const track = {bone: setup.id, channel: 'translate', keys: [
    {id: 19, frame: 6, values: [29, 5], curve: 'bezier', controls: [asymmetricControls, [8, 10, 16, 40]]},
    {id: 20, frame: 18, values: [48, 60], curve: 'linear'},
  ]};
  const sampledY = 26.875;
  const playbackFrame = 12 + 3 * 2 ** -23;
  const workingY = setup.y + sampleTrack(track, playbackFrame)[1];
  assert.equal(Math.fround(playbackFrame), 12);
  assert.notEqual(Math.fround(workingY - setup.y), sampledY);
  const [previous, inserted] = planOrdinaryBoneKeySubdivision(track, playbackFrame, setup, {
    ...setup, x: setup.x + 52, y: workingY,
  });
  assert.deepEqual(previous.values, [29, 5]);
  assert.deepEqual(previous.controls, [
    [...asymmetricLeft.slice(0, 3), 43.44013977050781],
    [7, 7.5, 9.5, 16.25],
  ]);
  assert.deepEqual(inserted.values, [52, sampledY]);
  assert.deepEqual(inserted.controls, [
    [asymmetricRight[0], 58.665672302246094, ...asymmetricRight.slice(2)],
    [14.5, 37.5, 17, 50],
  ]);
});

test('ordinary Bone Key inserts a Stepped key inside a strict hold', () => {
  const track = {bone: setup.id, channel: 'translate', keys: [
    {id: 19, frame: 4, values: [2, -0], curve: 'stepped'},
    {id: 20, frame: 12, values: [20, 15], curve: 'linear'},
  ]};
  const held = {bone: 1, channel: 'translate', frame: 8, values: [2, -0], curve: 'stepped'};
  assert.deepEqual(planOrdinaryBoneKeySubdivision(track, 8, setup), [held]);
  assert.deepEqual(planOrdinaryBoneKeySubdivision(track, 8, setup, {...setup, x: setup.x + 4}), [
    {...held, values: [4, -0]},
  ]);
});

test('ordinary Bone Key keeps existing, exterior, linear and empty-track upserts', () => {
  const first = {id: 19, frame: 6, values: [29, 0], curve: 'bezier', controls: [asymmetricControls, [0, 0, 0, 0]]};
  const last = {id: 20, frame: 18, values: [48, 0], curve: 'linear'};
  const track = {bone: setup.id, channel: 'rotate', keys: [first, last]};
  for (const frame of [5, 6, 6 + 2 ** -26, 18, 19]) {
    assert.equal(planOrdinaryBoneKeySubdivision(track, frame, setup), null);
  }
  assert.equal(planOrdinaryBoneKeySubdivision({...track, keys: [{...first, curve: 'linear'}, last]}, 12, setup), null);
  assert.equal(planOrdinaryBoneKeySubdivision({...track, keys: []}, 12, setup), null);
});
