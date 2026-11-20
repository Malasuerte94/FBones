import { bezierTimeMonotone } from './animation.ts';
import type { TimelineBezierControls } from './animationTimeline.ts';
import { curveSegmentAllowsInterpolation, normalizeCurveSegment, type CurveSegment } from './curveSegment.ts';

export interface CurvePreset {
  readonly name: string;
  readonly controls: Readonly<TimelineBezierControls>;
}

export const curvePresetStorageKey = 'fbones.curve-presets.v1';
export const maxCurvePresets = 64;
export const maxCurvePresetNameLength = 120;
const maxStorageLength = 65_536;
const maxHandleMagnitude = 1_000_000;

export function normalizeCurvePresetName(raw: string): string | null {
  const name = raw.trim();
  return name.length && name.length <= maxCurvePresetNameLength && !/\p{Cc}/u.test(name) ? name : null;
}

function isPresetControls(value: unknown): value is Readonly<TimelineBezierControls> {
  if (!Array.isArray(value) || value.length !== 4) return false;
  const [x1, y1, x2, y2] = value;
  return Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2)
    && x1 >= 0 && x2 <= 1;
}

export function readCurvePresets(raw: string | null): CurvePreset[] {
  if (!raw || raw.length > maxStorageLength) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const names = new Set<string>();
  const presets: CurvePreset[] = [];
  for (const item of data) {
    if (!item || typeof item.name !== 'string' || !isPresetControls(item.controls)) continue;
    const name = normalizeCurvePresetName(item.name);
    if (!name || names.has(name.toLowerCase())) continue;
    names.add(name.toLowerCase());
    presets.push({name, controls: item.controls});
    if (presets.length === maxCurvePresets) break;
  }
  return presets;
}

export function captureCurvePresetControls(
  segment: CurveSegment,
  component: number,
): Readonly<TimelineBezierControls> | null {
  if (!curveSegmentAllowsInterpolation(segment, 'bezier')) return null;
  const controls = normalizeCurveSegment(segment, component)?.controls;
  return isPresetControls(controls) ? controls : null;
}

/** Resolve a relative preset to the absolute controls for one native lane. */
export function projectCurvePresetControls(
  segment: CurveSegment,
  component: number,
  controls: Readonly<TimelineBezierControls>,
): TimelineBezierControls | null {
  if (!curveSegmentAllowsInterpolation(segment, 'bezier') || !isPresetControls(controls)) return null;
  const lane = normalizeCurveSegment(segment, component);
  if (!lane || lane.startValue === lane.endValue) return null;
  const {startFrame, endFrame, startValue, endValue} = lane;
  const previous = lane.controls && segment.key.controls?.[component];
  const duration = endFrame - startFrame;
  const span = endValue - startValue;
  const fields = [0, 1, 2, 3] as const;
  const projected = fields.map(field => {
    const position = controls[field];
    if (previous && position === lane.controls?.[field]) return Math.fround(previous[field]);
    const time = field % 2 === 0;
    const result = Math.fround(time ? startFrame + position * duration : startValue + position * span);
    return previous && result === previous[field] ? Math.fround(previous[field]) : result;
  }) as TimelineBezierControls;
  if (projected.some(value => !Number.isFinite(value) || Math.abs(value) > maxHandleMagnitude)) return null;
  const [x1, , x2] = projected;
  const validTime = segment.kind === 'bone'
    ? bezierTimeMonotone(startFrame, endFrame, x1, x2)
    : x1 >= startFrame && x1 <= endFrame && x2 >= startFrame && x2 <= endFrame;
  return validTime ? projected : null;
}
