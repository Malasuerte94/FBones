export type TimelineView = 'graph' | 'dopesheet';

export interface TimelineNavigationOptions {
  readonly jumpToKey: boolean;
  readonly jumpToFrame: boolean;
  readonly boxSelectPause: boolean;
  readonly showRows: boolean;
  readonly showToolbar: boolean;
}

export type TimelineNavigation = Readonly<Record<TimelineView, TimelineNavigationOptions>>;

export const defaultTimelineNavigation: TimelineNavigation = {
  graph: {jumpToKey: false, jumpToFrame: false, boxSelectPause: true, showRows: true, showToolbar: true},
  dopesheet: {jumpToKey: false, jumpToFrame: false, boxSelectPause: true, showRows: true, showToolbar: true},
};

export function readTimelineNavigation(serialized: string | null): TimelineNavigation {
  if (!serialized) return defaultTimelineNavigation;
  try {
    const data = JSON.parse(serialized) as Partial<Record<TimelineView, Partial<TimelineNavigationOptions>>> | null;
    const options = (view: TimelineView) => ({
      jumpToKey: data?.[view]?.jumpToKey === true,
      jumpToFrame: data?.[view]?.jumpToFrame === true,
      boxSelectPause: data?.[view]?.boxSelectPause !== false,
      showRows: data?.[view]?.showRows !== false,
      showToolbar: data?.[view]?.showToolbar !== false,
    });
    return {graph: options('graph'), dopesheet: options('dopesheet')};
  } catch {
    return defaultTimelineNavigation;
  }
}
