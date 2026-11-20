import { animationChannelDimensions, bezierTimeMonotone, type AnimationChannel } from './animation.ts';
import {
  isTimelineBoneChannel,
  type TimelineBezierControls,
  type TimelineInterpolation,
  type TimelineIkFlags,
  type TimelineKey,
  type TimelinePhysicsProperty,
  type TimelineProperty,
} from './animationTimeline.ts';

export interface CurveSegmentTrack {
  readonly id: string;
  readonly boneId: number;
  readonly channel: TimelineProperty;
  readonly keys: readonly TimelineKey[];
  readonly slotId?: number;
  readonly attachmentId?: number;
  readonly twoColor?: boolean;
  readonly constraintId?: number;
  readonly physicsProperty?: TimelinePhysicsProperty;
}

export interface CurveSegmentKey {
  readonly id: number;
  readonly frame: number;
  readonly values: readonly number[];
  readonly interpolation: TimelineInterpolation;
  readonly controls: readonly Readonly<TimelineBezierControls>[] | null;
  readonly ikFlags?: Readonly<TimelineIkFlags>;
}

interface CurveSegmentKeys {
  readonly trackId: string;
  readonly key: CurveSegmentKey;
  readonly next: CurveSegmentKey;
  readonly leftSelected: boolean;
  readonly rightSelected: boolean;
}

type CurveSegmentTarget =
  | { readonly kind: 'bone'; readonly channel: AnimationChannel; readonly bone: number }
  | { readonly kind: 'rgba'; readonly channel: 'rgba'; readonly slot: number; readonly twoColor: boolean }
  | { readonly kind: 'deform'; readonly channel: 'deform'; readonly attachment: number }
  | { readonly kind: 'ik'; readonly channel: 'ik'; readonly constraint: number }
  | { readonly kind: 'transformMix'; readonly channel: 'transformMix'; readonly constraint: number }
  | { readonly kind: 'physics'; readonly channel: 'physics'; readonly constraint: number; readonly property: TimelinePhysicsProperty };

export type CurveSegment = CurveSegmentKeys & CurveSegmentTarget;

export interface CurveSegmentSelection {
  readonly documentKey: string;
  readonly revision: number;
  readonly animation: number;
  readonly label?: string;
  readonly segment: CurveSegment;
}

export interface NormalizedCurveSegment {
  readonly component: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly startValue: number;
  readonly endValue: number;
  readonly interpolation: TimelineInterpolation;
  readonly controls: Readonly<TimelineBezierControls> | null;
}

export interface CurveSegmentHandleChange {
  id: number;
  component: number;
  control: 0 | 1;
  frame: number;
  value: number;
}

function copyCurveKey(key: TimelineKey, progress?: 0 | 1): CurveSegmentKey {
  const controls = progress === undefined ? key.controls : key.progressControls && [key.progressControls];
  return {
    id: key.id,
    frame: key.frame,
    values: progress === undefined ? [...key.values] : [progress],
    interpolation: key.interpolation,
    controls: controls?.map(([x1, y1, x2, y2]) => [x1, y1, x2, y2] as const) ?? null,
    ...(key.ikFlags ? {ikFlags: {...key.ikFlags}} : {}),
  };
}

function curveTarget(track: CurveSegmentTrack, key: TimelineKey, next: TimelineKey): CurveSegmentTarget | null {
  const {channel, slotId, attachmentId, constraintId, physicsProperty} = track;
  if (isTimelineBoneChannel(channel)) return {kind: 'bone', channel, bone: track.boneId};
  if (channel === 'rgba' && slotId !== undefined) {
    const twoColor = track.twoColor === true || key.values.length === 7 || next.values.length === 7;
    return {kind: 'rgba', channel, slot: slotId, twoColor};
  }
  if (channel === 'deform' && attachmentId !== undefined) {
    return {kind: 'deform', channel, attachment: attachmentId};
  }
  if (constraintId === undefined) return null;
  switch (channel) {
    case 'ik': return {kind: 'ik', channel, constraint: constraintId};
    case 'transformMix': return {kind: 'transformMix', channel, constraint: constraintId};
    case 'physics': return physicsProperty === undefined
      ? null : {kind: 'physics', channel, constraint: constraintId, property: physicsProperty};
    default: return null;
  }
}

export function curveSegmentComponentCount(segment: CurveSegment): number {
  switch (segment.kind) {
    case 'bone': return animationChannelDimensions(segment.channel);
    case 'rgba': return segment.twoColor ? 7 : 4;
    case 'ik': return 2;
    case 'transformMix': return 6;
    case 'physics':
    case 'deform': return 1;
  }
}

export function curveSegmentAllowsInterpolation(segment: CurveSegment, interpolation: TimelineInterpolation): boolean {
  return segment.kind !== 'rgba' || !segment.twoColor || interpolation === 'linear';
}

function validInterval(startFrame: number, endFrame: number): boolean {
  return Number.isFinite(startFrame) && Number.isFinite(endFrame) && startFrame >= 0 && endFrame > startFrame;
}

/** Read accessible live tracks in their authored order. Selecting only the
 * last key of a row uses its incoming segment. */
export function selectedCurveSegments(
  tracks: readonly CurveSegmentTrack[],
  selected: ReadonlySet<number>,
): CurveSegment[] {
  if (!selected.size) return [];
  const single = selected.size === 1;
  const segments: CurveSegment[] = [];
  const owners = new Set<number>();
  for (const track of tracks) {
    const {keys} = track;
    for (let index = 0; index + 1 < keys.length; index++) {
      const key = keys[index]!, next = keys[index + 1]!;
      const leftSelected = selected.has(key.id), rightSelected = selected.has(next.id);
      if (!leftSelected && !(single && rightSelected && index + 2 === keys.length)) continue;
      if (owners.has(key.id) || !validInterval(Math.fround(key.frame), Math.fround(next.frame))) continue;
      const target = curveTarget(track, key, next);
      if (!target) continue;
      owners.add(key.id);
      segments.push({
        ...target,
        trackId: track.id,
        key: copyCurveKey(key, target.kind === 'deform' ? 0 : undefined),
        next: copyCurveKey(next, target.kind === 'deform' ? 1 : undefined),
        leftSelected,
        rightSelected,
      });
    }
  }
  return segments;
}

const MAX_KEY_FIELD = 1_000_000;

/** An equal-ended component retains its interpolation label but has no
 * normalized value coordinate for the outgoing controls. */
export function normalizeCurveSegment(segment: CurveSegment, component: number): NormalizedCurveSegment | null {
  if (!Number.isInteger(component) || component < 0 || component >= curveSegmentComponentCount(segment)) return null;
  const { key, next } = segment;
  const startFrame = Math.fround(key.frame), endFrame = Math.fround(next.frame);
  const startValue = Math.fround(key.values[component]!), endValue = Math.fround(next.values[component]!);
  if (!validInterval(startFrame, endFrame) || !Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;

  let controls: TimelineBezierControls | null = null;
  if (key.interpolation === 'bezier' && startValue !== endValue) {
    const stored = key.controls?.[component];
    if (!stored || !stored.every(Number.isFinite)) return null;
    const duration = endFrame - startFrame, valueSpan = endValue - startValue;
    const [x1, y1, x2, y2] = stored.map(Math.fround) as TimelineBezierControls;
    if (segment.kind === 'deform' && ([x1, y1, x2, y2].some(value => Math.abs(value) > MAX_KEY_FIELD)
      || x1 < startFrame || x1 > endFrame || x2 < startFrame || x2 > endFrame)) return null;
    const timeOrigin = segment.kind === 'deform' && startFrame === 0 ? 0 : startFrame;
    controls = [
      (x1 - timeOrigin) / duration,
      (y1 - startValue) / valueSpan,
      (x2 - timeOrigin) / duration,
      (y2 - startValue) / valueSpan,
    ];
    if (!controls.every(Number.isFinite)) return null;
  }
  return {component, startFrame, endFrame, startValue, endValue, interpolation: key.interpolation, controls};
}

export function curveSegmentCanEditHandles(segment: CurveSegment, component?: number): boolean {
  if (segment.key.interpolation !== 'bezier' || !curveSegmentAllowsInterpolation(segment, 'bezier')) return false;
  if (component !== undefined) return !!normalizeCurveSegment(segment, component)?.controls;
  for (let index = 0; index < curveSegmentComponentCount(segment); index++) {
    if (normalizeCurveSegment(segment, index)?.controls) return true;
  }
  return false;
}

/** Resolve a normalized handle against native bounds, including a f32 no-op. */
export function resolveCurveSegmentHandle(
  segment: CurveSegment,
  component: number,
  control: 0 | 1,
  point: { readonly x: number; readonly y: number },
  options?: {readonly extendedBoneIncoming?: boolean},
): CurveSegmentHandleChange | null {
  if ((control !== 0 && control !== 1) || !curveSegmentAllowsInterpolation(segment, 'bezier')) return null;
  const normalized = normalizeCurveSegment(segment, component);
  const stored = segment.key.controls?.[component];
  if (!normalized?.controls || !stored || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;

  const { startFrame, endFrame, startValue, endValue, controls } = normalized;
  const offset = control * 2;
  const originalFrame = Math.fround(stored[offset]!), originalValue = Math.fround(stored[offset + 1]!);
  const relativeFrame = point.x * (endFrame - startFrame);
  const absoluteFrame = segment.kind === 'deform' && startFrame === 0 ? relativeFrame : startFrame + relativeFrame;
  const absoluteValue = segment.kind === 'deform' ? point.y : startValue + point.y * (endValue - startValue);
  const frame = point.x === controls[offset] ? originalFrame : Math.fround(absoluteFrame);
  const value = point.y === controls[offset + 1] ? originalValue : Math.fround(absoluteValue);
  if (frame === originalFrame && value === originalValue) {
    return {id: segment.key.id, component, control, frame: originalFrame, value: originalValue};
  }
  const bone = segment.kind === 'bone';
  const minFrame = bone && control === 1 ? (options?.extendedBoneIncoming ? -MAX_KEY_FIELD : 0) : startFrame;
  const maxFrame = bone && control === 0 ? MAX_KEY_FIELD : Math.min(endFrame, MAX_KEY_FIELD);
  if (!Number.isFinite(frame) || frame < minFrame || frame > maxFrame
    || !Number.isFinite(value) || Math.abs(value) > MAX_KEY_FIELD) return null;
  if (bone) {
    const outgoing = control === 0 ? frame : stored[0], incoming = control === 1 ? frame : stored[2];
    if (!bezierTimeMonotone(startFrame, endFrame, outgoing, incoming)) return null;
  }
  // Native restores unchanged RGBA controls by value. This bridge has no
  // side channel for writing a new negative-zero control.
  if (segment.kind === 'rgba' && (Object.is(frame, -0) && frame !== originalFrame
    || Object.is(value, -0) && value !== originalValue)) return null;
  return {
    id: segment.key.id,
    component,
    control,
    frame: frame === originalFrame ? originalFrame : frame,
    value: value === originalValue ? originalValue : value,
  };
}

/** Return only changes for the existing single-handle Graph command. */
export function curveSegmentHandleChange(
  segment: CurveSegment,
  component: number,
  control: 0 | 1,
  point: { readonly x: number; readonly y: number },
): CurveSegmentHandleChange | null {
  const resolved = resolveCurveSegmentHandle(segment, component, control, point);
  const stored = segment.key.controls?.[component];
  if (!resolved || !stored) return null;
  const offset = control * 2;
  return resolved.frame === Math.fround(stored[offset]!) && resolved.value === Math.fround(stored[offset + 1]!)
    ? null : resolved;
}
