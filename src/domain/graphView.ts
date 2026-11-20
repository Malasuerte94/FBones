import type { TimelineKey } from './animationTimeline.ts';
import { graphDisplayValue, type GraphValueProjection } from './graphValueProjection.ts';

export interface GraphViewSeries { track: { keys: readonly TimelineKey[] }; component: number; projection?: GraphValueProjection }
export interface GraphViewBounds { minFrame: number; maxFrame: number; min: number; max: number }

const MARGIN = 26;
const MAX_PIXELS_PER_FRAME = 40;
const MAX_PLOT_WIDTH = 8_000_000;
const PLOT_TAIL = 40;

function emptyBounds(): GraphViewBounds {
  return { minFrame: Infinity, maxFrame: -Infinity, min: Infinity, max: -Infinity };
}

function include(bounds: GraphViewBounds, frame: number, value: number): void {
  bounds.minFrame = Math.min(bounds.minFrame, frame);
  bounds.maxFrame = Math.max(bounds.maxFrame, frame);
  bounds.min = Math.min(bounds.min, value);
  bounds.max = Math.max(bounds.max, value);
}

function paddedBounds(bounds: GraphViewBounds): GraphViewBounds | null {
  if (bounds.minFrame === Infinity) return null;
  const padding = bounds.min === bounds.max ? Math.max(.5, Math.abs(bounds.min) * .05) : bounds.max * .1 - bounds.min * .1;
  return {
    ...bounds,
    min: Math.max(-Number.MAX_VALUE, bounds.min - padding),
    max: Math.min(Number.MAX_VALUE, bounds.max + padding),
  };
}

export function graphViewPointBounds(points: Iterable<{ frame: number; value: number }>): GraphViewBounds | null {
  const bounds = emptyBounds();
  for (const {frame, value} of points) {
    if (Number.isFinite(frame) && Number.isFinite(value)) include(bounds, frame, value);
  }
  return paddedBounds(bounds);
}

/** Stored tracks are in frame order. Include the control hull of drawable segments. */
export function graphViewBounds(series: readonly GraphViewSeries[], selected?: ReadonlySet<number>): GraphViewBounds | null {
  const all = emptyBounds();
  const selection = emptyBounds();
  for (const { track, component, projection } of series) {
    for (const [index, key] of track.keys.entries()) {
      const raw = key.values[component];
      if (raw === undefined || !Number.isFinite(raw) || !Number.isFinite(key.frame)) continue;
      const value = graphDisplayValue(raw, projection);
      if (!Number.isFinite(value)) continue;
      include(all, key.frame, value);
      const keySelected = selected?.has(key.id);
      if (keySelected) include(selection, key.frame, value);

      const controls = key.interpolation === 'bezier' ? key.controls?.[component] : null;
      const next = track.keys[index + 1];
      if (controls?.length !== 4 || !next || !Number.isFinite(next.frame) || next.frame <= key.frame || !Number.isFinite(next.values[component])) continue;
      const [firstFrame, firstRaw, secondFrame, secondRaw] = controls;
      const firstValue = graphDisplayValue(firstRaw, projection), secondValue = graphDisplayValue(secondRaw, projection);
      if (!Number.isFinite(firstFrame) || !Number.isFinite(firstValue) || !Number.isFinite(secondFrame) || !Number.isFinite(secondValue)) continue;
      include(all, firstFrame, firstValue);
      include(all, secondFrame, secondValue);
      if (keySelected || selected?.has(next.id)) {
        include(selection, firstFrame, firstValue);
        include(selection, secondFrame, secondValue);
      }
    }
  }

  return paddedBounds(selection.minFrame === Infinity ? all : selection);
}

/** `viewportWidth` excludes the row labels. `endFrame` includes trailing timeline frames. */
export function graphViewFit(bounds: GraphViewBounds, viewportWidth: number, endFrame: number, leadingPixels = 0): { pixelsPerFrame: number; scrollLeft: number } {
  const width = Number.isFinite(viewportWidth) ? Math.max(1, viewportWidth) : 1;
  const first = Math.max(0, bounds.minFrame);
  const last = Math.max(first, bounds.maxFrame);
  const end = Math.max(1, last, Number.isFinite(endFrame) ? endFrame : 0);
  const margin = Math.min(MARGIN, width / 4);
  const pixelsPerFrame = Math.min(MAX_PIXELS_PER_FRAME, (width - 2 * margin) / Math.max(1, last - first), (MAX_PLOT_WIDTH - PLOT_TAIL - leadingPixels) / end);
  const center = leadingPixels + (first + (last - first) / 2) * pixelsPerFrame;
  const maxScroll = Math.max(0, leadingPixels + end * pixelsPerFrame + PLOT_TAIL - width);
  const scrollLeft = Math.max(0, Math.min(maxScroll, center - width / 2));
  return { pixelsPerFrame, scrollLeft };
}
