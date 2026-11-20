import {bezierParameterAtFrame} from './animation.ts';
import {sampleDeform, type DeformKeyInput, type DeformTrack} from './animationGeometry.ts';
import {subdivideBezier} from './keyShownBone.ts';

const MAX_FIELD = 1_000_000;
const MAX_DIMENSION = 4_194_304;
type ProgressControls = NonNullable<DeformKeyInput['controls']>;
type ProgressCurve = Pick<DeformKeyInput, 'curve' | 'controls'>;

function validField(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MAX_FIELD;
}

function withinProgressBounds(controls: ProgressControls, first: number, last: number): boolean {
  return controls.every(validField) && controls[0] >= first && controls[0] <= last
    && controls[2] >= first && controls[2] <= last;
}

function splitChild(controls: ProgressControls, first: number, last: number, constantClean: boolean): ProgressCurve {
  const stored = controls.map(Math.fround) as ProgressControls;
  if (withinProgressBounds(stored, first, last)) return {curve: 'bezier', controls: stored};
  if (constantClean) return {curve: 'linear'};
  throw new Error('The deformation Bézier split exceeds the native progress control bounds.');
}

function interpolateOffset(before: number, after: number, progress: number): number {
  return Object.is(before, after) ? before : before + (after - before) * progress;
}

function sameOffsets(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, axis) => Object.is(value, Math.fround(b[axis]!)));
}

/** Plan one ordinary Deform Key in the authored offset layout at Current. */
export function planDeformKey(
  track: DeformTrack, frame: number, dimension: number, draft?: readonly number[],
): DeformKeyInput[] {
  const position = Math.fround(frame);
  const time = position === 0 ? 0 : position;
  if (!validField(time) || time < 0) throw new Error('Use a finite deformation key frame between 0 and 1000000.');
  if (!Number.isInteger(dimension) || dimension < 1 || dimension > MAX_DIMENSION
    || (draft && draft.length !== dimension)) {
    throw new Error('The deformation offsets must match the attachment binding.');
  }
  const rightIndex = track.keys.findIndex(key => Math.fround(key.frame) > time);
  const right = track.keys[rightIndex];
  const left = track.keys[(rightIndex < 0 ? track.keys.length : rightIndex) - 1];
  const exact = left && Math.fround(left.frame) === time ? left : undefined;
  const address = {attachment: track.attachment};
  const displayed = draft ? sampleDeform(track.keys, frame, dimension) : undefined;
  const edited = (axis: number) => !!draft && Math.fround(draft[axis]!) !== Math.fround(displayed![axis]!);
  const currentOffsets = (clean: readonly number[]) => {
    if (clean.length !== dimension) throw new Error('The deformation offsets must match the attachment binding.');
    const offsets = clean.map((value, axis) => Math.fround(edited(axis) ? draft![axis]! : value));
    if (!offsets.every(validField)) throw new Error('Use finite deformation offsets within the native coordinate bounds.');
    if (offsets.every(value => value === 0) && offsets.some(value => Object.is(value, -0))) {
      throw new Error('An all-zero deformation cannot store signed-zero offsets.');
    }
    return offsets;
  };

  if (exact) {
    const offsets = currentOffsets(exact.offsets);
    if (sameOffsets(offsets, exact.offsets)) return [];
    return [{...address, frame: exact.frame, keyId: exact.id, offsets, curve: exact.curve,
      dataPresent: exact.dataPresent || offsets.some(value => value !== 0),
      ...(exact.controls ? {controls: [...exact.controls]} : {})}];
  }
  if (!left || !right || left.curve !== 'bezier') {
    const curve = right && left?.curve === 'stepped' ? 'stepped' : 'linear';
    const clean = sampleDeform(track.keys, time, dimension);
    if (left?.curve === 'linear' && right) {
      for (const [axis, value] of left.offsets.entries()) {
        const before = Math.fround(value);
        if (Object.is(before, Math.fround(right.offsets[axis]!))) clean[axis] = before;
      }
    }
    const offsets = currentOffsets(clean);
    const held = curve === 'stepped' && left && sameOffsets(offsets, left.offsets);
    return [{...address, frame: time, offsets, curve, ...(held ? {dataPresent: left.dataPresent} : {})}];
  }

  const first = Math.fround(left.frame), last = Math.fround(right.frame);
  const controls = left.controls?.map(Math.fround) as ProgressControls | undefined;
  if (!controls || !withinProgressBounds(controls, first, last)) {
    throw new Error('Use valid authored deformation Bézier controls.');
  }
  if (left.offsets.length !== dimension || right.offsets.length !== dimension) {
    throw new Error('The deformation offsets must match the attachment binding.');
  }
  const [x1, y1, x2, y2] = controls;
  const parameter = bezierParameterAtFrame(time, first, last, x1, x2, true);
  const x = subdivideBezier(first, x1, x2, last, parameter);
  const y = subdivideBezier(0, y1, y2, 1, parameter);
  const progress = y.center;
  let constantClean = true;
  const clean = left.offsets.map((value, axis) => {
    const before = Math.fround(value), after = Math.fround(right.offsets[axis]!);
    const center = interpolateOffset(before, after, progress);
    if (!edited(axis) && before !== after) {
      constantClean = false;
      if (Math.fround(center) === before || Math.fround(center) === after) {
        throw new Error('The deformation split cannot represent a varying coordinate on both sides of Current.');
      }
    }
    return center;
  });
  const offsets = currentOffsets(clean);
  let beforeCurve: ProgressCurve = {curve: 'linear'}, afterCurve: ProgressCurve = {curve: 'linear'};
  if (Math.fround(x.center) === time) {
    // Normalize each child against its own progress endpoints before f32 storage.
    beforeCurve = splitChild([x.first, y.first / progress, x.second, y.second / progress], first, time, constantClean);
    afterCurve = splitChild([x.third, (y.third - progress) / (1 - progress),
      x.fourth, (y.fourth - progress) / (1 - progress)], time, last, constantClean);
  } else if (!constantClean) {
    throw new Error('The deformation Bézier split exceeds the native time precision.');
  }
  return [
    {...address, frame: left.frame, keyId: left.id, offsets: [...left.offsets], dataPresent: left.dataPresent, ...beforeCurve},
    {...address, frame: time, offsets, ...afterCurve},
  ];
}
