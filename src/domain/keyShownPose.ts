import {sameAnimationFrame, type AnimationCurve} from './animation.ts';
import type {ConstraintAnimationTrack, ConstraintDraftPose, ConstraintKeyInput, ConstraintPose, IkControls, KeyableConstraintAnimationTrack, ScalarControls, TransformMixControls} from './animationConstraints.ts';
import {sampleSlotRgba, type Rgba, type SlotAnimationChannel, type SlotAnimationKeyInput, type SlotAnimationPose, type SlotAnimationTrack, type SlotBezierControls} from './animationSlots.ts';
import type {DrawOrderKey, DrawOrderKeyInput} from './animationGeometry.ts';
import {splitShownBezierAxis} from './keyShownBone.ts';

interface TimedCurve {id: number; frame: number; curve: AnimationCurve}
type LightSlotKey = Extract<SlotAnimationKeyInput, {channel: 'rgba'}>;
type LightSlotTrack = Extract<SlotAnimationTrack, {channel: 'rgba'}>;
type CurvePlan<K> = {
  existing?: K;
  curve: AnimationCurve;
  controls?: ScalarControls[];
  previous?: {key: K; controls: ScalarControls[]};
};

function keyAtAndAfter<K extends {frame:number}>(keys: readonly K[], frame: number) {
  const rightIndex = keys.findIndex(key => Math.fround(key.frame) > frame);
  const right = keys[rightIndex];
  const left = keys[(rightIndex < 0 ? keys.length : rightIndex) - 1];
  return {left, right};
}

function sameValues(a: readonly number[], b: readonly number[]) {
  return a.length === b.length && a.every((value, axis) => Object.is(Math.fround(value), Math.fround(b[axis]!)));
}

function planContinuous<K extends TimedCurve>(keys: readonly K[], frame: number, values: readonly number[],
  valuesOf: (key: K) => readonly number[], controlsOf: (key: K) => readonly ScalarControls[] | null | undefined,
  extrasMatch: (key: K) => boolean = () => true): CurvePlan<K> | null {
  const {left, right} = keyAtAndAfter(keys, frame);
  if (left && sameAnimationFrame(left.frame, frame)) {
    if (sameValues(valuesOf(left), values) && extrasMatch(left)) return null;
    return {existing: left, curve: left.curve, controls: controlsOf(left)?.slice()};
  }
  if (!left || !right || left.curve !== 'bezier') {
    return {curve: right && (!left || left.curve === 'stepped') ? 'stepped' : 'linear'};
  }
  const controls = controlsOf(left), before = valuesOf(left), after = valuesOf(right);
  if (!controls || controls.length !== values.length) throw new Error('Key Shown requires explicit Bézier controls for this track.');
  const first = Math.fround(left.frame), last = Math.fround(right.frame);
  const axes = controls.map((axis, index) => {
    const split = splitShownBezierAxis(first, last, before[index]!, after[index]!, axis, frame);
    const delta = Math.fround(values[index]!) - split.value;
    if (delta !== 0) {
      split.first[3] = Math.fround(split.first[3] + delta);
      split.second[1] = Math.fround(split.second[1] + delta);
    }
    return split;
  });
  return {curve: 'bezier', controls: axes.map(axis => axis.second), previous: {key: left, controls: axes.map(axis => axis.first)}};
}

function withLightZeroIndices(key: LightSlotKey): LightSlotKey {
  const negativeZero = (value: number) => Object.is(Math.fround(value), -0);
  if ([...(key.darkValues ?? []), ...(key.darkControls?.flat() ?? [])].some(negativeZero)) {
    throw new Error('Key Shown cannot rewrite signed-zero dark color data.');
  }
  const negativeZeroIndices = [...key.values, ...(key.controls?.flat() ?? [])]
    .flatMap((value, index) => negativeZero(value) ? [index] : []);
  return {...key, negativeZeroIndices};
}

function checkedLightColor(values: Rgba): Rgba {
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error('Use four finite RGBA key values between 0 and 1.');
  }
  return values;
}

function withinControlBounds(axis: ScalarControls, first: number, last: number): boolean {
  return axis.every(value => Number.isFinite(value) && Math.abs(value) <= 1_000_000)
    && axis[0] >= first && axis[0] <= last && axis[2] >= first && axis[2] <= last;
}

function moveSplitOrdinate(split: ReturnType<typeof splitShownBezierAxis>, value: number) {
  const delta = value - split.value;
  if (delta !== 0) {
    split.first[3] = Math.fround(split.first[3] + delta);
    split.second[1] = Math.fround(split.second[1] + delta);
  }
  return {...split, value};
}

/** Plan a light color key at Current. A null result uses the legacy route. */
export function planLightRgbaKeySubdivision(
  track: LightSlotTrack, frame: number, desired: Readonly<Rgba>, tintBlack: boolean,
  setupColor?: Readonly<Rgba>,
): LightSlotKey[] | null {
  if (tintBlack) return null;
  const time = Math.fround(frame);
  const {left, right} = keyAtAndAfter(track.keys, time);
  if (!left) return null;
  const existing = sameAnimationFrame(left.frame, time);
  if (!existing && (!right || left.curve === 'linear')) return null;
  const address = {slot: track.slot, channel: track.channel};
  // Compare the working color at the displayed time, while committing at the
  // native f32 frame. Only genuine draft changes transfer to the new key.
  const displayed = sampleSlotRgba(track.keys, frame) ?? setupColor ?? left.values;
  const desiredAt = (axis: number, clean: number) => Object.is(desired[axis], displayed[axis])
    ? clean : Math.fround(desired[axis]!);
  if (existing) {
    const values = checkedLightColor(left.values.map((value, axis) => desiredAt(axis, value)) as Rgba);
    if (sameValues(values, left.values)) return [];
    const controls = left.controls?.map(axis => [...axis]) as SlotBezierControls | undefined;
    return [withLightZeroIndices({...address, frame: left.frame, keyId: left.id, curve: left.curve, values, controls})];
  }
  if (!right) return null;
  if (left.curve === 'stepped') {
    const values = checkedLightColor(left.values.map((value, axis) => desiredAt(axis, value)) as Rgba);
    return [withLightZeroIndices({...address, frame: time, curve: 'stepped', values})];
  }
  if (!left.controls) throw new Error('Light RGBA Bézier keys require their authored controls.');
  const first = Math.fround(left.frame), last = Math.fround(right.frame);
  const axes = left.controls.map((controls, axis) => {
    const split = splitShownBezierAxis(first, last, left.values[axis]!, right.values[axis]!, controls, time);
    const edited = moveSplitOrdinate(split, desiredAt(axis, split.value));
    if (!withinControlBounds(edited.first, first, time) || !withinControlBounds(edited.second, time, last)) {
      throw new Error('This Bézier split exceeds the native RGBA control bounds.');
    }
    return edited;
  });
  const values = checkedLightColor(axes.map(axis => axis.value) as Rgba);
  return [
    withLightZeroIndices({...address, frame: left.frame, keyId: left.id, curve: 'bezier',
      values: [...left.values], controls: axes.map(axis => axis.first) as SlotBezierControls}),
    withLightZeroIndices({...address, frame: time, curve: 'bezier', values,
      controls: axes.map(axis => axis.second) as SlotBezierControls}),
  ];
}

export function planShownSlotKeys(track: Extract<SlotAnimationTrack,{channel:SlotAnimationChannel}>, frame: number, pose: SlotAnimationPose, tintBlack: boolean): SlotAnimationKeyInput[] {
  const {slot, channel} = track;
  if (channel === 'attachment') {
    const {left} = keyAtAndAfter(track.keys, frame);
    if (left && sameAnimationFrame(left.frame, frame)) {
      if (left.attachment === pose.attachment) return [];
      return [{slot, channel, frame, attachment: pose.attachment, keyId: left.id}];
    }
    return [{slot, channel, frame, attachment: pose.attachment}];
  }
  const isSameDark = (key: typeof track.keys[number]) => sameValues(key.darkValues ?? [0, 0, 0], pose.dark ?? [0, 0, 0]);
  const plan = planContinuous(track.keys, frame, pose.color, key => key.values, key => key.controls, isSameDark);
  if (!plan) return [];
  // Active dark color requires linear interpolation in the native profile.
  if (!plan.existing && !plan.previous && tintBlack) plan.curve = 'linear';
  const current: LightSlotKey = {
    slot, channel, frame, values: pose.color,
    darkValues: plan.existing && isSameDark(plan.existing) ? undefined : pose.dark, curve: plan.curve,
    controls: plan.controls as SlotBezierControls | undefined,
    darkControls: plan.existing?.darkControls, keyId: plan.existing?.id,
  };
  const out: LightSlotKey[] = [];
  if (plan.previous) {
    const {key, controls} = plan.previous;
    out.push({slot, channel, frame:key.frame, values:key.values, curve:key.curve,
      controls: controls as SlotBezierControls, darkControls:key.darkControls, keyId:key.id});
  }
  out.push(current);
  return out.map(withLightZeroIndices);
}

function emitContinuous<K extends TimedCurve, I>(plan: CurvePlan<K> | null,
  current: (curve: AnimationCurve, axes: ScalarControls[] | undefined, id: number | undefined) => I,
  previous: (key: K, axes: ScalarControls[]) => I): I[] {
  if (!plan) return [];
  return [
    ...(plan.previous ? [previous(plan.previous.key, plan.previous.controls)] : []),
    current(plan.curve, plan.controls, plan.existing?.id),
  ];
}

type ContinuousConstraintTrack = Exclude<KeyableConstraintAnimationTrack, {channel: 'physicsReset'}>;
type ConstraintSubdivision<K> = CurvePlan<K> & {left: K; frame: number; values: number[]};

function planConstraintCurve<K extends TimedCurve>(keys: readonly K[], frame: number,
  desired: readonly number[], sampled: readonly number[], valuesOf: (key: K) => readonly number[],
  controlsOf: (key: K) => readonly ScalarControls[] | null | undefined): ConstraintSubdivision<K> | null {
  const time = Math.fround(frame);
  const {left, right} = keyAtAndAfter(keys, time);
  if (!left) return null;
  const desiredAt = (axis: number, clean: number) => Math.fround(Object.is(desired[axis], sampled[axis]) ? clean : desired[axis]!);
  const before = valuesOf(left);
  if (sameAnimationFrame(left.frame, time)) {
    return {left, existing: left, frame: left.frame, curve: left.curve,
      values: before.map((value, axis) => desiredAt(axis, value)),
      controls: controlsOf(left)?.map(axis => [...axis])};
  }
  if (!right || left.curve === 'linear') return null;
  if (left.curve === 'stepped') {
    return {left, frame: time, curve: 'stepped', values: before.map((value, axis) => desiredAt(axis, value))};
  }
  const controls = controlsOf(left), after = valuesOf(right);
  if (!controls || controls.length !== before.length) throw new Error('Constraint Bézier keys require their authored controls.');
  const first = Math.fround(left.frame), last = Math.fround(right.frame);
  const axes = controls.map((controls, axis) => {
    const split = splitShownBezierAxis(first, last, before[axis]!, after[axis]!, controls, time);
    const edited = moveSplitOrdinate(split, desiredAt(axis, split.value));
    if (!withinControlBounds(edited.first, first, time) || !withinControlBounds(edited.second, time, last)) {
      throw new Error('This Bézier split exceeds the native constraint control bounds.');
    }
    return edited;
  });
  return {left, frame: time, curve: 'bezier', values: axes.map(axis => axis.value),
    controls: axes.map(axis => axis.second), previous: {key: left, controls: axes.map(axis => axis.first)}};
}

function checkConstraintValues(track: ContinuousConstraintTrack, values: readonly number[]) {
  const first = values[0]!;
  if (values.some(value => !Number.isFinite(value) || Math.abs(value) > 1_000_000)
    || (track.channel === 'ik' && (first < 0 || first > 1 || values[1]! < 0))
    || (track.channel === 'physics' && (track.property === 'mass' && first <= 0 || track.property === 'damping' && first < 0))) {
    throw new Error('Use finite supported constraint timeline values.');
  }
}

/** Plan ordinary and Auto Key from a working pose and its authored sample.
 * An empty plan is a no-op. A null plan uses the existing upsert path. */
export function planConstraintKeySubdivision(
  track: ContinuousConstraintTrack, frame: number, desired: ConstraintDraftPose, sampled: ConstraintDraftPose,
): ConstraintKeyInput[] | null {
  const {constraint, channel} = track;
  if (desired.constraint !== constraint || sampled.constraint !== constraint) {
    throw new Error('Choose the matching constraint track and working pose.');
  }
  if (channel === 'ik' && desired.type === 'ik' && sampled.type === 'ik') {
    const valuesOf = (source: {mix: number; softness: number}) => [source.mix, source.softness];
    const plan = planConstraintCurve(track.keys, frame, valuesOf(desired), valuesOf(sampled), valuesOf, key => key.controls);
    if (!plan) return null;
    checkConstraintValues(track, plan.values);
    const {left} = plan;
    const stretch = desired.stretch === sampled.stretch ? left.stretch : desired.stretch;
    const compress = desired.compress === sampled.compress ? left.compress : desired.compress;
    const bendPositive = desired.bendPositive === sampled.bendPositive ? left.bendPositive : desired.bendPositive;
    if (plan.existing && sameValues(plan.values, valuesOf(left)) && stretch === left.stretch
      && compress === left.compress && bendPositive === left.bendPositive) return [];
    return emitContinuous(plan,
      (curve, axes, keyId) => ({channel, constraint, frame: plan.frame, keyId, mix: plan.values[0]!, softness: plan.values[1]!,
        stretch, compress, bendPositive, curve, controls: axes as IkControls | undefined}),
      ({id, ...key}, axes) => ({channel, constraint, ...key, keyId: id, controls: axes as IkControls}));
  }
  if (channel === 'transformMix' && desired.type === 'transform' && sampled.type === 'transform') {
    const plan = planConstraintCurve(track.keys, frame, desired.mixes, sampled.mixes, key => key.values, key => key.controls);
    if (!plan) return null;
    checkConstraintValues(track, plan.values);
    if (plan.existing && sameValues(plan.values, plan.existing.values)) return [];
    return emitContinuous(plan,
      (curve, axes, keyId) => ({channel, constraint, frame: plan.frame, keyId, values: plan.values as typeof desired.mixes,
        curve, controls: axes as TransformMixControls | undefined}),
      ({id, ...key}, axes) => ({channel, constraint, ...key, keyId: id, controls: axes as TransformMixControls}));
  }
  if (channel === 'physics' && desired.type === 'physics' && sampled.type === 'physics') {
    const {property} = track;
    const plan = planConstraintCurve(track.keys, frame, [desired[property]], [sampled[property]], key => [key.value],
      key => key.controls ? [key.controls] : undefined);
    if (!plan) return null;
    checkConstraintValues(track, plan.values);
    const value = plan.values[0]!;
    if (plan.existing && Object.is(value, Math.fround(plan.existing.value))) return [];
    return emitContinuous(plan,
      (curve, axes, keyId) => ({channel, property, constraint, frame: plan.frame, keyId, value, curve, controls: axes?.[0]}),
      ({id, ...key}, axes) => ({channel, property, constraint, ...key, keyId: id, controls: axes[0]}));
  }
  throw new Error('Choose the matching constraint track and working pose.');
}

export function planShownConstraintKeys(track: ConstraintAnimationTrack, frame: number, pose: ConstraintPose): ConstraintKeyInput[] {
  const {constraint, channel} = track;
  if (channel === 'ik' && pose.type === 'ik') {
    const {mix, softness, stretch, compress, bendPositive} = pose;
    const plan = planContinuous(track.keys, frame, [mix, softness], key => [key.mix, key.softness], key => key.controls,
      key => key.stretch === stretch && key.compress === compress && key.bendPositive === bendPositive);
    return emitContinuous(plan,
      (curve, axes, keyId) => ({channel, constraint, frame, keyId, mix, softness, stretch, compress, bendPositive, curve, controls: axes as IkControls | undefined}),
      ({id, ...key}, axes) => ({channel, constraint, ...key, keyId: id, controls: axes as IkControls}));
  }
  if (channel === 'transformMix' && pose.type === 'transform') {
    const plan = planContinuous(track.keys, frame, pose.mixes, key => key.values, key => key.controls);
    return emitContinuous(plan,
      (curve, axes, keyId) => ({channel, constraint, frame, keyId, values: pose.mixes, curve, controls: axes as TransformMixControls | undefined}),
      ({id, ...key}, axes) => ({channel, constraint, ...key, keyId: id, controls: axes as TransformMixControls}));
  }
  if (channel === 'physics' && pose.type === 'physics') {
    const {property} = track, value = pose[property];
    const plan = planContinuous(track.keys, frame, [value], key => [key.value], key => key.controls ? [key.controls] : undefined);
    return emitContinuous(plan,
      (curve, axes, keyId) => ({channel, property, constraint, frame, keyId, value, curve, controls: axes?.[0]}),
      ({id, ...key}, axes) => ({channel, property, constraint, ...key, keyId: id, controls: axes[0]}));
  }
  throw new Error('Key Shown requires a supported constraint parameter track.');
}

export function planShownDrawOrder(keys: readonly DrawOrderKey[], frame: number, order: number[] | null): DrawOrderKeyInput[] {
  const {left} = keyAtAndAfter(keys, frame);
  if (!left || !sameAnimationFrame(left.frame, frame)) return [{frame, order}];
  const same = left.order === order || (left.order !== null && order !== null
    && left.order.length === order.length && left.order.every((id, index) => id === order[index]));
  return same ? [] : [{frame, order, keyId: left.id}];
}
