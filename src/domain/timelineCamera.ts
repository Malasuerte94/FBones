export interface TimelineTimeScale {
  readonly leadingPixels: number;
  readonly pixelsPerFrame: number;
}

export interface TimelineScrollport {
  readonly scrollWidth: number;
  readonly clientWidth: number;
}

export function timelineFramePixel(frame: number, leadingPixels: number, pixelsPerFrame: number): number {
  return leadingPixels + frame * pixelsPerFrame;
}

/** Convert a pixel measured from the start of the time content, excluding the gutter. */
export function timelineContentFrame(pixel: number, leadingPixels: number, pixelsPerFrame: number): number {
  return (pixel - leadingPixels) / pixelsPerFrame;
}

/** Keep one viewport pixel fixed on the same frame when the time scale changes. */
export function timelineScrollAtAnchor(
  left: number,
  anchor: number,
  previous: TimelineTimeScale,
  next: TimelineTimeScale,
): number {
  const frame = timelineContentFrame(left + anchor, previous.leadingPixels, previous.pixelsPerFrame);
  return timelineFramePixel(frame, next.leadingPixels, next.pixelsPerFrame) - anchor;
}

/** Both linked panes must be able to display the same scroll position. */
export function clampTimelineScrollLeft(left: number, viewports: readonly TimelineScrollport[]): number {
  let position = Number.isFinite(left) ? Math.max(0, left) : 0;
  for (const { scrollWidth, clientWidth } of viewports) {
    // A pane can briefly have no layout while the dock remounts.
    if (!Number.isFinite(clientWidth) || clientWidth <= 0 || !Number.isFinite(scrollWidth) || scrollWidth < 0) continue;
    position = Math.min(position, Math.max(0, scrollWidth - clientWidth));
  }
  return position;
}
