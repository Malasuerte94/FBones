import {
  animationChannelDimensions,
  animationChannelFamily,
  bezierParameterAtFrame,
  bezierTimeMonotone,
  sampleTrack,
  type AnimationChannel,
  type AnimationKeyInput,
  type AnimationTrack,
  type BezierControls,
} from './animation.ts';
import type {BoneView} from './project.ts';

const MAX_KEY_FIELD = 1_000_000;
type HandlePair = BezierControls[0];
type BoneComponent = 'rotation' | 'x' | 'y' | 'scaleX' | 'scaleY' | 'shearX' | 'shearY';
const components: Record<AnimationChannel, readonly BoneComponent[]> = {
  rotate: ['rotation'],
  translate: ['x', 'y'],
  translateX: ['x'],
  translateY: ['y'],
  scale: ['scaleX', 'scaleY'],
  scaleX: ['scaleX'],
  scaleY: ['scaleY'],
  shear: ['shearX', 'shearY'],
};

function checkedField(value: number): number {
  const stored = Math.fround(value);
  if (!Number.isFinite(stored) || Math.abs(stored) > MAX_KEY_FIELD) {
    throw new Error('Use finite key values and handles within the supported range.');
  }
  return stored;
}

function interpolate(start: number, end: number, t: number): number {
  return start === end ? start : start + (end - start) * t;
}

/** Split a cubic in double precision before the caller stores its controls. */
export function subdivideBezier(a: number, b: number, c: number, d: number, t: number) {
  const ab = interpolate(a, b, t), bc = interpolate(b, c, t), cd = interpolate(c, d, t);
  const abc = interpolate(ab, bc, t), bcd = interpolate(bc, cd, t);
  return {first: ab, second: abc, center: interpolate(abc, bcd, t), third: bcd, fourth: cd};
}

/** Subdivide one authored time/value cubic, then check the rounded native
 * handles. Each component has an independent time axis. */
export function splitShownBezierAxis(
  startFrame: number, endFrame: number, startValue: number, endValue: number,
  controls: readonly number[], frame: number,
): {first: HandlePair; second: HandlePair; value: number} {
  const firstFrame = checkedField(startFrame), lastFrame = checkedField(endFrame), cut = checkedField(frame);
  if (controls.length !== 4 || firstFrame < 0 || !(firstFrame < cut && cut < lastFrame)) {
    throw new Error('Choose a frame strictly inside the Bézier interval.');
  }
  const [x1, y1, x2, y2] = controls.map(checkedField) as HandlePair;
  if (!bezierTimeMonotone(firstFrame, lastFrame, x1, x2)) {
    throw new Error('The Bézier interval cannot be split because its time reverses.');
  }
  const t = bezierParameterAtFrame(cut, firstFrame, lastFrame, x1, x2);
  const x = subdivideBezier(firstFrame, x1, x2, lastFrame, t);
  const y = subdivideBezier(checkedField(startValue), y1, y2, checkedField(endValue), t);
  const first: HandlePair = [checkedField(x.first), checkedField(y.first), checkedField(x.second), checkedField(y.second)];
  const second: HandlePair = [checkedField(x.third), checkedField(y.third), checkedField(x.fourth), checkedField(y.fourth)];
  if (Math.fround(x.center) !== cut || !bezierTimeMonotone(firstFrame, cut, first[0], first[2])
    || !bezierTimeMonotone(cut, lastFrame, second[0], second[2])) {
    throw new Error('Both Bézier intervals must be representable at the selected frame.');
  }
  return {first, second, value: checkedField(y.center)};
}

function boneKeyNeighbors(track: AnimationTrack, time: number) {
  const nextIndex = track.keys.findIndex(key => Math.fround(key.frame) > time);
  const next = nextIndex === -1 ? undefined : track.keys[nextIndex];
  const previous = track.keys[(nextIndex === -1 ? track.keys.length : nextIndex) - 1];
  const existing = previous && Math.fround(previous.frame) === time ? previous : undefined;
  return {previous, next, existing};
}

function planBoneKeys(
  track: AnimationTrack, frame: number, setup: BoneView, working?: BoneView,
  neighbors?: ReturnType<typeof boneKeyNeighbors>, draftFrame?: number,
): AnimationKeyInput[] {
  if (!track.keys.length) return [];
  if (setup.id !== track.bone || (working && working.id !== setup.id)) {
    throw new Error('The selected bone could not be found in the current project.');
  }
  const time = checkedField(frame);
  if (time < 0) throw new Error('Choose a nonnegative key frame.');
  const {previous, next, existing} = neighbors ?? boneKeyNeighbors(track, time);
  const scale = animationChannelFamily(track.channel) === 'scale';
  const dimensions = animationChannelDimensions(track.channel);
  const setupValue = scale ? 1 : 0;
  const segment = previous ? {...track, keys: next ? [previous, next] : [previous]} : null;
  const sample = existing?.values ?? (segment && sampleTrack(segment, time));
  // A working draft can have been created at a fractional playback frame.
  // Compare it with that sample while subdividing at the native f32 frame.
  const draftSample = working && segment && draftFrame !== undefined && draftFrame !== time
    ? sampleTrack(segment, draftFrame) : sample;
  const values: AnimationKeyInput['values'] = [0, 0];
  const changedLanes = [false, false];
  for (const axis of [0, 1] as const) {
    if (axis >= dimensions) break;
    const component = components[track.channel][axis]!;
    const raw = checkedField(sample?.[axis] ?? setupValue);
    values[axis] = raw;
    if (!working) continue;
    const base = setup[component] ?? setupValue;
    const draft = working[component] ?? setupValue;
    const local = draftSample ? (scale ? base * draftSample[axis] : base + draftSample[axis]) : base;
    if (Object.is(draft, local) || (scale && base === 0 && draft === local)) continue;
    if (scale && base === 0) throw new Error('Keying a changed axis requires nonzero Setup scale.');
    const value = checkedField(scale ? draft / base : draft - base);
    // The native scalar upsert deliberately retains the sign of an existing
    // numeric zero when no magnitude changed in a split-axis value.
    if (existing && dimensions === 1 && track.channel !== 'rotate' && value === raw) continue;
    values[axis] = value;
    changedLanes[axis] = !Object.is(value, raw);
  }
  const address = {bone: track.bone, channel: track.channel};
  if (existing) {
    if (!changedLanes.some(Boolean)) return [];
    const controls: BezierControls | undefined = existing.controls ? [[...existing.controls[0]], [...existing.controls[1]]] : undefined;
    return [{
      ...address, keyId: existing.id, frame: existing.frame, values, curve: existing.curve,
      ...(controls ? {controls} : {}),
    }];
  }
  if (!previous || !next || previous.curve !== 'bezier') {
    const curve = next && (!previous || previous.curve === 'stepped') ? 'stepped' : 'linear';
    return [{...address, frame: time, values, curve}];
  }
  if (!previous.controls) throw new Error('The Bézier interval is missing its handles.');
  const first: BezierControls = [[0, 0, 0, 0], [0, 0, 0, 0]];
  const second: BezierControls = [[0, 0, 0, 0], [0, 0, 0, 0]];
  for (const axis of [0, 1] as const) {
    if (axis >= dimensions) break;
    const split = splitShownBezierAxis(previous.frame, next.frame, previous.values[axis], next.values[axis], previous.controls[axis], time);
    if (!changedLanes[axis]) values[axis] = split.value;
    const delta = values[axis] - split.value;
    if (delta !== 0) {
      // An edited ordinate changes the curve. Carry each adjacent handle
      // with that ordinate so the new key retains the split tangent.
      split.first[3] = checkedField(split.first[3] + delta);
      split.second[1] = checkedField(split.second[1] + delta);
    }
    first[axis] = split.first;
    second[axis] = split.second;
  }
  return [
    {...address, keyId: previous.id, frame: previous.frame, values: [...previous.values], curve: 'bezier', controls: first},
    {...address, frame: time, values, curve: 'bezier', controls: second},
  ];
}

/** Plan changes for exactly one already-keyed bone row in native key order.
 * The optional working bone contains authored local fields from the draft. */
export function planShownBoneKeys(
  track: AnimationTrack, frame: number, setup: BoneView, working?: BoneView,
): AnimationKeyInput[] {
  return planBoneKeys(track, frame, setup, working);
}

/** Plan an ordinary key strictly inside an authored Bézier or Stepped span.
 * Other positions use the ordinary upsert, including an existing f32 key. */
export function planOrdinaryBoneKeySubdivision(
  track: AnimationTrack, frame: number, setup: BoneView, working?: BoneView,
): AnimationKeyInput[] | null {
  const time = Math.fround(frame);
  const neighbors = boneKeyNeighbors(track, time);
  const {previous, next, existing} = neighbors;
  if (!previous || !next || existing || previous.curve === 'linear') return null;
  return planBoneKeys(track, time, setup, working, neighbors, frame);
}
