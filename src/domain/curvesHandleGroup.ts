import type {GraphBezierGroupChange, TimelineBezierControls} from './animationTimeline.ts';
import {
  curveSegmentAllowsInterpolation,
  normalizeCurveSegment,
  resolveCurveSegmentHandle,
  type CurveSegment,
  type CurveSegmentSelection,
} from './curveSegment.ts';
import {groupedGraphBezierChanges, type GraphBezierDragHandle} from './graphCurveTools.ts';

export interface CurvesHandleMember {
  readonly trackId: string;
  readonly id: number;
  readonly nextId: number;
  readonly component: number;
  readonly control: 0 | 1;
}

export interface CurvesHandleGroupIntent {
  readonly selections: readonly CurveSegmentSelection[];
  readonly handles: readonly CurvesHandleMember[];
  readonly activeHandleId: string;
  readonly point: Readonly<{x: number; y: number}>;
}

export function curvesHandleId(member: CurvesHandleMember): string {
  return JSON.stringify([member.trackId, member.id, member.nextId, member.component, member.control]);
}

/** Resolve only explicit editable handles in the selected live Curves scope. */
export function planCurvesHandleGroup(
  selections: CurvesHandleGroupIntent['selections'], handles: CurvesHandleGroupIntent['handles'],
  activeHandleId: string, point: CurvesHandleGroupIntent['point'],
): GraphBezierGroupChange[] | null {
  const first = selections[0];
  if (!first || handles.length < 2 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const segments = new Map<number, CurveSegment>();
  for (const {documentKey, revision, animation, segment} of selections) {
    if (documentKey !== first.documentKey || revision !== first.revision || animation !== first.animation
      || segments.has(segment.key.id)) return null;
    segments.set(segment.key.id, segment);
  }

  const members = new Map<string, GraphBezierDragHandle>();
  for (const handle of handles) {
    const {trackId, id, nextId, component, control} = handle;
    const segment = segments.get(id);
    if (!segment || segment.trackId !== trackId || segment.next.id !== nextId || (control !== 0 && control !== 1)
      || !curveSegmentAllowsInterpolation(segment, 'bezier')) return null;
    const lane = normalizeCurveSegment(segment, component);
    const controls = segment.key.controls?.[component];
    const handleId = curvesHandleId(handle);
    if (!lane?.controls || !controls || members.has(handleId)) return null;
    members.set(handleId, {
      handleId, id, nextId, component, control,
      startFrame: lane.startFrame, endFrame: lane.endFrame, startValue: lane.startValue, endValue: lane.endValue,
      controls: controls.map(Math.fround) as TimelineBezierControls, bone: segment.kind === 'bone',
    });
  }

  const active = members.get(activeHandleId);
  if (!active) return null;
  const raw = resolveCurveSegmentHandle(segments.get(active.id)!, active.component, active.control, point,
    {extendedBoneIncoming: true});
  if (!raw) return null;
  const group = [...members.values()];
  const changes = groupedGraphBezierChanges(group, activeHandleId, raw);
  // Graph can return immediately for an unmoved active handle. Every picked
  // lane must still be valid even when there is no change to publish.
  if (changes?.length === 0 && group.some(handle => groupedGraphBezierChanges([handle], handle.handleId, {
    frame: handle.controls[handle.control * 2]!, value: handle.controls[handle.control * 2 + 1]!,
  }) === null)) return null;
  return changes;
}
