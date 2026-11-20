import {
  animationChannelDimensions,
  bezierTimeMonotone,
  type AnimationChannel,
  type AnimationKeyInput,
  type BezierControls,
} from './animation.ts';
import type {GraphBezierGroupChange,TimelineBezierControls,TimelineKey} from './animationTimeline.ts';

export interface GraphKeyTrack {
  bone: number;
  channel: AnimationChannel;
  /** The authored keys of one visible property, in native order. */
  keys: readonly TimelineKey[];
}

export type GraphFavorMode = 'favor' | 'blend';
export type GraphPreset = 'flat' | 'easeIn' | 'easeOut';

const MAX_KEY_FIELD = 1_000_000;
const MAX_KEY_BATCH = 4096;
type KeyValues = AnimationKeyInput['values'];

function validField(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MAX_KEY_FIELD;
}

function validFrame(frame: number): boolean {
  return frame >= 0 && validField(frame);
}

export interface GraphBezierDragHandle {
  readonly handleId: string;
  readonly id: number;
  readonly nextId: number;
  readonly component: number;
  readonly control: 0 | 1;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly startValue: number;
  readonly endValue: number;
  readonly controls: Readonly<TimelineBezierControls>;
  readonly bone: boolean;
  readonly collapsedValue?: boolean;
}

export type GraphBezierDragChange = GraphBezierGroupChange;

function validDragLane(handle: GraphBezierDragHandle, controls: Readonly<TimelineBezierControls>): boolean {
  const {startFrame, endFrame, startValue, endValue, bone} = handle;
  const [outgoing, , incoming] = controls;
  if (!validFrame(startFrame) || !validFrame(endFrame) || startFrame >= endFrame
    || !validField(startValue) || !validField(endValue) || !controls.every(validField)) return false;
  return bone ? bezierTimeMonotone(startFrame, endFrame, outgoing, incoming)
    : outgoing >= startFrame && outgoing <= endFrame && incoming >= startFrame && incoming <= endFrame;
}

function dragField(value: number, original: number): number {
  const rounded = Math.fround(value);
  return rounded === original ? original : rounded;
}

/** Copy the active segment's normalized shape to explicitly selected handles.
 * A null result rejects the whole candidate, and an empty result has no edit. */
export function groupedGraphBezierChanges(
  handles: readonly GraphBezierDragHandle[], activeHandleId: string,
  point: Readonly<{frame: number; value: number}>,
): GraphBezierDragChange[] | null {
  const active = handles.find(handle => handle.handleId === activeHandleId);
  if (!active) return null;
  const offset = active.control * 2;
  const donor: TimelineBezierControls = [...active.controls];
  donor[offset] = dragField(point.frame, donor[offset]!);
  if (!active.collapsedValue) donor[offset + 1] = dragField(point.value, donor[offset + 1]!);
  if (!validDragLane(active, donor)) return null;
  if (Object.is(donor[offset], active.controls[offset])
    && Object.is(donor[offset + 1], active.controls[offset + 1])) return [];

  const duration = active.endFrame - active.startFrame;
  const valueSpan = active.endValue - active.startValue;
  const lanes = new Map<string, {handle: GraphBezierDragHandle; controls: TimelineBezierControls}>();
  const selected = new Set<string>();
  const result: GraphBezierDragChange[] = [];
  const activeLane = `${active.id}:${active.component}`;
  for (const handle of handles) {
    const {id, nextId, component, control, startFrame, endFrame, startValue, endValue} = handle;
    const key = `${id}:${component}`, identity = `${key}:${control}`;
    if (selected.has(identity)) return null;
    selected.add(identity);
    const index = control * 2;
    let lane = lanes.get(key);
    if (lane) {
      const original = lane.handle;
      if (original.nextId !== nextId || original.bone !== handle.bone
        || original.startFrame !== startFrame || original.endFrame !== endFrame
        || original.startValue !== startValue || original.endValue !== endValue
        || !handle.controls.every((field, i) => Object.is(field, original.controls[i]))) return null;
    } else {
      lane = {handle, controls: [...handle.controls]};
      lanes.set(key, lane);
    }

    const originalFrame = handle.controls[index]!, originalValue = handle.controls[index + 1]!;
    let frame: number, value: number;
    if (key === activeLane) {
      if (handle.handleId !== activeHandleId) continue;
      frame = donor[index]!;
      value = donor[index + 1]!;
    } else {
      const time = (donor[index]! - active.startFrame) / duration;
      frame = dragField(startFrame + time * (endFrame - startFrame), originalFrame);
      const span = endValue - startValue;
      value = active.collapsedValue || handle.collapsedValue || valueSpan === 0 || span === 0 ? originalValue
        : dragField(startValue + (donor[index + 1]! - active.startValue) / valueSpan * span, originalValue);
    }
    lane.controls[index] = frame;
    lane.controls[index + 1] = value;
    if (!Object.is(frame, originalFrame) || !Object.is(value, originalValue)) {
      result.push({id, nextId, component, control, frame, value});
    }
  }
  for (const {handle, controls} of lanes.values()) {
    if (!validDragLane(handle, controls)) return null;
  }
  return result;
}

function keyValues(track: GraphKeyTrack, key: TimelineKey): KeyValues | null {
  const values: KeyValues = [
    Math.fround(key.values[0]!),
    animationChannelDimensions(track.channel) === 2 ? Math.fround(key.values[1]!) : 0,
  ];
  return values.every(validField) ? values : null;
}

function keyControls(track: GraphKeyTrack, key: TimelineKey, next: TimelineKey): BezierControls | null {
  const controls: BezierControls = [[0, 0, 0, 0], [0, 0, 0, 0]];
  for (const axis of [0, 1] as const) {
    if (axis >= animationChannelDimensions(track.channel)) break;
    const authored = key.controls?.[axis];
    if (!authored || !authored.every(validField)) return null;
    const control = authored.map(Math.fround) as BezierControls[0];
    if (!bezierTimeMonotone(key.frame, next.frame, control[0], control[2])) return null;
    controls[axis] = control;
  }
  return controls;
}

interface FavorTarget {
  values: KeyValues;
  distance: number;
}

interface FavorCandidate {
  input: AnimationKeyInput;
  previous: FavorTarget | null;
  next: FavorTarget | null;
}

function sameValues(a: KeyValues, b: KeyValues): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function favorTarget(track: GraphKeyTrack, key: TimelineKey | undefined, frame: number, values: KeyValues): FavorTarget | null {
  if (!key || !validFrame(key.frame)) return null;
  const target = keyValues(track, key);
  if (!target || sameValues(values, target)) return null;
  return {values: target, distance: Math.abs(Math.fround(key.frame) - frame)};
}

function interpolateValue(start: number, end: number, fraction: number): number {
  if (start === end || fraction === 0) return start;
  return fraction === 1 ? end : Math.fround(start + (end - start) * fraction);
}

function interpolateValues(start: KeyValues, end: KeyValues, fraction: number): KeyValues {
  return [interpolateValue(start[0], end[0], fraction), interpolateValue(start[1], end[1], fraction)];
}

function firstKeyAtOrAfter(keys: readonly TimelineKey[], frame: number): number {
  let low = 0, high = keys.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (Math.fround(keys[middle]!.frame) < frame) low = middle + 1;
    else high = middle;
  }
  return low;
}

function favorCandidates(tracks: readonly GraphKeyTrack[], selected: ReadonlySet<number>, frame: number): FavorCandidate[] {
  const candidates: FavorCandidate[] = [];
  for (const track of tracks) {
    const position = {bone: track.bone, channel: track.channel};
    if (selected.size) {
      for (const [index, key] of track.keys.entries()) {
        if (!selected.has(key.id) || !validFrame(key.frame)) continue;
        const time = Math.fround(key.frame), previous = track.keys[index - 1], next = track.keys[index + 1];
        if ((previous && Math.fround(previous.frame) >= time) || (next && Math.fround(next.frame) <= time)) continue;
        const values = keyValues(track, key);
        if (!values) continue;
        const controls = key.interpolation === 'bezier' && next ? keyControls(track, key, next) : null;
        if (key.interpolation === 'bezier' && !controls) continue;
        const before = favorTarget(track, previous, time, values), after = favorTarget(track, next, time, values);
        if (before || after) candidates.push({
          input: {...position, frame: time, values, keyId: key.id, curve: key.interpolation, ...(controls ? {controls} : {})},
          previous: before,
          next: after,
        });
      }
      continue;
    }
    if (!validFrame(frame)) continue;
    const time = Math.fround(frame);
    const index = firstKeyAtOrAfter(track.keys, time);
    if (index === 0 || index === track.keys.length) continue;
    const previous = track.keys[index - 1]!, next = track.keys[index]!;
    const start = Math.fround(previous.frame), end = Math.fround(next.frame);
    if (previous.interpolation !== 'linear' || !validFrame(start) || !validFrame(end) || !(start < time && time < end)) continue;
    const startValues = keyValues(track, previous), endValues = keyValues(track, next);
    if (!startValues || !endValues || sameValues(startValues, endValues)) continue;
    const values = interpolateValues(startValues, endValues, (time - start) / (end - start));
    candidates.push({
      input: {...position, frame: time, values, curve: 'linear'},
      previous: favorTarget(track, previous, time, values),
      next: favorTarget(track, next, time, values),
    });
  }
  return candidates;
}

export function canFavorGraphKeys(tracks: readonly GraphKeyTrack[], selected: ReadonlySet<number>, frame: number): boolean {
  const candidates = favorCandidates(tracks, selected, frame);
  for (const direction of ['previous', 'next'] as const) {
    const count = candidates.filter(candidate => candidate[direction]).length;
    if (count > 0 && count <= MAX_KEY_BATCH) return true;
  }
  return false;
}

export function graphFavorChanges(
  tracks: readonly GraphKeyTrack[], selected: ReadonlySet<number>, frame: number,
  amount: number, mode: GraphFavorMode,
): AnimationKeyInput[] {
  if (!Number.isFinite(amount) || amount === 0) return [];
  const direction = amount < 0 ? 'previous' : 'next';
  const changes = favorCandidates(tracks, selected, frame).flatMap(candidate => {
    const target = candidate[direction];
    return target ? [{input: candidate.input, target}] : [];
  });
  if (changes.length > MAX_KEY_BATCH) return [];
  const closest = changes.reduce((distance, change) => Math.min(distance, change.target.distance), Infinity);
  const fraction = Math.min(Math.abs(amount), 100) / 100;
  const inputs = changes.flatMap(({input, target}) => {
    // FBones Favor weights each key by the closest relative frame distance.
    // Blend gives the same fraction to every key. Existing handles stay put.
    const mix = mode === 'favor' && selected.size > 1 ? fraction * (closest / target.distance) : fraction;
    const values = interpolateValues(input.values, target.values, mix);
    return sameValues(input.values, values) ? [] : [{...input, values}];
  });
  return inputs;
}

export function graphPresetChanges(
  tracks: readonly GraphKeyTrack[], selected: ReadonlySet<number>, preset: GraphPreset,
): AnimationKeyInput[] {
  const inputs: AnimationKeyInput[] = [];
  for (const track of tracks) {
    for (const [index, key] of track.keys.entries()) {
      const next = track.keys[index + 1];
      if (!next) continue;
      const leftSelected = selected.has(key.id), rightSelected = selected.has(next.id);
      const loneTerminal = rightSelected && selected.size === 1 && index + 2 === track.keys.length;
      if (!leftSelected && !(preset === 'flat' ? rightSelected : loneTerminal)) continue;
      const first = Math.fround(key.frame), last = Math.fround(next.frame);
      if (!validFrame(first) || !validFrame(last) || first >= last) continue;
      const start = keyValues(track, key), end = keyValues(track, next);
      if (!start || !end) continue;
      const original = key.interpolation === 'bezier' ? keyControls(track, key, next) : null;
      if (key.interpolation === 'bezier' && !original) continue;
      const controls: BezierControls = [[0, 0, 0, 0], [0, 0, 0, 0]];
      for (const axis of [0, 1] as const) {
        if (axis >= animationChannelDimensions(track.channel)) break;
        controls[axis] = presetBezierAxis(first, last, start[axis], end[axis], preset, leftSelected, rightSelected, original?.[axis]);
      }
      if (original?.every((axis, i) => axis.every((value, j) => value === controls[i]![j]))) continue;
      inputs.push({
        bone: track.bone, channel: track.channel, keyId: key.id, frame: first,
        values: start, curve: 'bezier', controls,
      });
      if (inputs.length > MAX_KEY_BATCH) return [];
    }
  }
  return inputs;
}

export function presetBezierAxis(
  first: number, last: number, startValue: number, endValue: number, preset: GraphPreset,
  leftSelected: boolean, rightSelected: boolean, original?: Readonly<TimelineBezierControls>,
): TimelineBezierControls {
  const span = last - first;
  const existing = preset === 'flat' ? original : undefined;
  return [
    existing?.[0] ?? Math.fround(first + span / 3),
    (preset === 'flat' ? leftSelected : preset === 'easeOut')
      ? startValue : existing?.[1] ?? interpolateValue(startValue, endValue, 1 / 3),
    existing?.[2] ?? Math.fround(last - span / 3),
    (preset === 'flat' ? rightSelected : preset === 'easeIn')
      ? endValue : existing?.[3] ?? interpolateValue(startValue, endValue, 2 / 3),
  ];
}
