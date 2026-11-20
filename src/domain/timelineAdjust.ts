import {
  animationChannelDimensions,
  animationChannelFamily,
  sameAnimationFrame,
  type AnimationChannel,
  type AnimationKeyInput,
  type AnimationView,
} from './animation.ts';

export type TimelineAdjustTool = 'rotate' | 'translate' | 'scale';

export interface TimelineAdjustTarget {
  readonly documentKey: string;
  readonly revision: number;
  readonly animation: number;
  readonly frame: number;
  readonly bone: number;
  readonly tool: TimelineAdjustTool;
  readonly keyIds: readonly number[];
}

export type TimelineAdjustState = {enabled: boolean; target: TimelineAdjustTarget | null};

export type TimelineAdjustDelta =
  | {tool: 'rotate'; degrees: number}
  | {tool: 'translate'; x: number; y: number}
  | {tool: 'scale'; x: number; y: number};

interface TimelineAdjustKey {
  readonly id: number;
  readonly channel: AnimationChannel;
  readonly frame: number;
  readonly values: readonly [number, number];
  readonly curve: 'linear' | 'stepped';
}

export interface TimelineAdjustPlan {
  readonly animation: number;
  readonly bone: number;
  readonly frame: number;
  readonly tool: TimelineAdjustTool;
  readonly keyIds: readonly number[];
  readonly axes: Readonly<{x: boolean; y: boolean}>;
  readonly keys: readonly TimelineAdjustKey[];
}

const MAX_KEY_FIELD = 1_000_000;
export const MAX_ADJUST_KEYS = 4096;

function yOnly(channel: AnimationChannel): boolean {
  return channel === 'translateY' || channel === 'scaleY';
}

/** Capture the selected authored rows for the pointer gesture. Each selected
 * row must include its current sampled key so the live drag agrees with the
 * committed pose on release. */
export function prepareTimelineAdjust(
  clip: AnimationView, keyIds: readonly number[], bone: number, frame: number, tool: TimelineAdjustTool,
): TimelineAdjustPlan | null {
  const time = Math.fround(frame);
  if (!Number.isFinite(time) || time < 0 || time > MAX_KEY_FIELD || !keyIds.length || keyIds.length > MAX_ADJUST_KEYS) return null;
  const wanted = new Set(keyIds);
  if (wanted.size !== keyIds.length) return null;
  const keys: TimelineAdjustKey[] = [];
  const axes = {x: false, y: false};
  for (const track of clip.tracks) {
    if (track.bone !== bone || animationChannelFamily(track.channel) !== tool) continue;
    const start = keys.length;
    let current: number | undefined;
    for (const [index, key] of track.keys.entries()) {
      if (sameAnimationFrame(key.frame, time)) current = key.id;
      if (!wanted.has(key.id)) continue;
      // Keep the absolute controls of any neighboring Bézier untouched. Its
      // endpoint rules are outside the initial relative-adjustment policy.
      if (key.curve === 'bezier' || track.keys[index - 1]?.curve === 'bezier') return null;
      keys.push({
        id: key.id, channel: track.channel, frame: key.frame,
        values: [...key.values], curve: key.curve,
      });
    }
    if (start === keys.length) continue;
    if (current === undefined || !wanted.has(current)) return null;
    const onlyY = yOnly(track.channel);
    axes.x ||= !onlyY;
    axes.y ||= onlyY || animationChannelDimensions(track.channel) === 2;
  }
  if (keys.length !== keyIds.length) return null;
  return {animation: clip.id, bone, frame: time, tool, keyIds: [...keyIds], axes, keys};
}

/** Plan one existing-key batch from a local viewport delta. Scale uses the
 * same positive factors as the local scale gizmo. */
export function planTimelineAdjustKeys(plan: TimelineAdjustPlan, delta: TimelineAdjustDelta): AnimationKeyInput[] {
  if (delta.tool !== plan.tool) throw new Error('The Adjust transform changed. Start the drag again.');
  const [x, y] = delta.tool === 'rotate' ? [delta.degrees, 0] : [delta.x, delta.y];
  const scale = delta.tool === 'scale';
  if ([x, y].some(value => !Number.isFinite(value) || Math.abs(value) > MAX_KEY_FIELD || (scale && value <= 0))) {
    throw new Error('Use a supported finite Adjust delta or scale factor.');
  }
  const inputs: AnimationKeyInput[] = [];
  for (const key of plan.keys) {
    const [previousX, previousY] = key.values;
    const width = animationChannelDimensions(key.channel);
    const values: [number, number] = [
      adjustedValue(previousX, yOnly(key.channel) ? y : x, scale),
      width === 2 ? adjustedValue(previousY, y, scale) : 0,
    ];
    if (Object.is(values[0], previousX) && Object.is(values[1], previousY)) continue;
    inputs.push({
      bone: plan.bone, channel: key.channel, keyId: key.id, frame: key.frame, values, curve: key.curve,
    });
  }
  return inputs;
}

function adjustedValue(previous: number, amount: number, scale: boolean): number {
  const value = Math.fround(scale ? previous * amount : previous + amount);
  if (!Number.isFinite(value) || Math.abs(value) > MAX_KEY_FIELD) {
    throw new Error('An adjusted key value is outside the native key range.');
  }
  return value === previous ? previous : value;
}
