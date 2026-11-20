import type { TimelineKey, TimelineProperty } from './animationTimeline.ts';

export type TimelineSyncMode = 'off' | 'graph-to-dopesheet' | 'dopesheet-to-graph';

type GraphCurveTrack = {
  channel: TimelineProperty;
  keys: readonly Pick<TimelineKey, 'id'>[];
};
type LiveTrack = GraphCurveTrack & { id: string };
type TimelineRow = { bone?: { id: number }; track?: LiveTrack };

const nonCurveProperties = new Set<TimelineProperty>([
  'attachment', 'drawOrder', 'deform', 'physicsReset', 'event', 'sequence',
]);

export function hasTimelineGraphCurves(track: GraphCurveTrack): boolean {
  return track.keys.length > 0 && !nonCurveProperties.has(track.channel);
}

/** Inherit only live curve rows, keeping their order and represented groups. */
export function syncedTimelineRows<Row extends TimelineRow>(
  scopedRows: readonly Row[],
  visibleTrackIds: ReadonlySet<string>,
): Row[] {
  const includedRows = new Set<Row>();
  const includedBones = new Set<number>();
  for (const row of scopedRows) {
    if (row.track && visibleTrackIds.has(row.track.id) && hasTimelineGraphCurves(row.track)) {
      includedRows.add(row);
      if (row.bone) includedBones.add(row.bone.id);
    }
  }
  return scopedRows.filter(row => row.track
    ? includedRows.has(row)
    : row.bone !== undefined && includedBones.has(row.bone.id));
}

/** Every live curve track containing a key selected in Dopesheet can appear in Graph. */
export function graphTrackIdsForDopesheetSelection(
  tracks: readonly LiveTrack[],
  selectedKeys: ReadonlySet<number>,
): Set<string> {
  const result = new Set<string>();
  if (!selectedKeys.size) return result;
  for (const track of tracks) {
    if (hasTimelineGraphCurves(track) && track.keys.some(key => selectedKeys.has(key.id))) {
      result.add(track.id);
    }
  }
  return result;
}
