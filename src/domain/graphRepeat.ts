import type {TimelineKey} from './animationTimeline.ts';

const MIN_PERIOD_PIXELS = 4;
const MAX_REPEAT_COPIES = 192;

export function graphKeyHolds(
  keys: readonly TimelineKey[], component: number, setup: number | undefined,
  start: number, end: number,
): {from: number; to: number; value: number}[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return [];
  let first = Infinity, last = -Infinity;
  let lastValue: number | undefined;
  for (const key of keys) {
    const value = key.values[component];
    if (value === undefined || !Number.isFinite(value) || !Number.isFinite(key.frame)) continue;
    first = Math.min(first, key.frame);
    if (key.frame >= last) {
      last = key.frame;
      lastValue = value;
    }
  }
  if (lastValue === undefined) return [];
  const holds: {from: number; to: number; value: number}[] = [];
  const prefixEnd = Math.min(end, first);
  if (setup !== undefined && Number.isFinite(setup) && start < prefixEnd) {
    holds.push({from: start, to: prefixEnd, value: setup});
  }
  const suffixStart = Math.max(start, last);
  if (suffixStart < end) holds.push({from: suffixStart, to: end, value: lastValue});
  return holds;
}

/** Translation offsets for visible copies of the authored period. The base
 * period starts at originPixels and is rendered by the ordinary Graph path. */
export function graphRepeatOffsets(periodPixels: number, originPixels: number, startPixel: number, endPixel: number): number[] {
  if (![periodPixels, originPixels, startPixel, endPixel].every(Number.isFinite)
    || periodPixels < MIN_PERIOD_PIXELS || startPixel >= endPixel) return [];
  const first = Math.floor((startPixel - originPixels) / periodPixels);
  const last = Math.ceil((endPixel - originPixels) / periodPixels) - 1;
  const count = last - first + 1 - (first <= 0 && last >= 0 ? 1 : 0);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || count > MAX_REPEAT_COPIES) return [];
  const offsets: number[] = [];
  for (let cycle = first; cycle <= last; cycle++) {
    if (cycle === 0) continue;
    const offset = cycle * periodPixels;
    const start = originPixels + offset;
    if (Number.isFinite(offset) && start < endPixel && start + periodPixels > startPixel) offsets.push(offset);
  }
  return offsets;
}
