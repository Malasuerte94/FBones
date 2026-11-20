import type { AnimationView } from './animation.ts';
import { deformSlots, orderSlots, sampleDeformPoses, sampleDrawOrder } from './animationGeometry.ts';
import { AnimationPhysicsPreview } from './animationPhysicsPreview.ts';
import { MAX_ANIMATION_PREVIEW_FRAME } from './animationPlayback.ts';
import { projectSequencePoses, sampleSequencePoses } from './animationSequence.ts';
import { projectSlotPoses, sampleSlotPoses } from './animationSlots.ts';
import { bindingPoints, type Point } from './binding.ts';
import { withEvaluatedPose } from './evaluatedPose.ts';
import { worldRegions } from './images.ts';
import type { BoneView, ProjectSummary, SlotView } from './project.ts';
import { transformPoint, worldBones, type WorldBone } from './rig.ts';
import { renderedAttachmentId } from './sceneSelection.ts';
import { pathEvaluationWork } from './solve/path.ts';

export const GHOST_FRAME_RANGE = 120;
export const GHOST_FRAME_STEP = .125;
export const GHOST_OFFSET_LIMIT = 1000;
export const GHOST_MOTION_THRESHOLD_LIMIT = 1000;
export const MAX_GHOST_MOTION_VECTORS = 2048;

const MAX_SAMPLES = 16;
const SAMPLE_WORK = 24_000;

export type GhostingFill = 'none' | 'images' | 'solid';
export type GhostingOutline = 'none' | 'silhouette' | 'xray';

interface GhostingAppearance {
  fill: GhostingFill;
  outline: GhostingOutline;
}

export function ghostingDisplaysAttachments(appearance: GhostingAppearance): boolean {
  return appearance.fill !== 'none' || appearance.outline !== 'none';
}

export interface GhostingRange extends GhostingAppearance {
  beforeEnabled: boolean;
  afterEnabled: boolean;
  before: number;
  after: number;
  step: number;
  beforeColor: string;
  afterColor: string;
  current: boolean;
}

export interface GhostingSettings {
  enabled: boolean;
  frames: GhostingRange;
  keyFrames: GhostingRange;
  motionVectors: Pick<GhostingRange, 'beforeEnabled' | 'afterEnabled' | 'before' | 'after' | 'beforeColor' | 'afterColor'> & { threshold: number };
  anchor: boolean;
  onTop: boolean;
  loop: boolean;
  offsetX: number;
  offsetY: number;
  opacity: number;
  bones: boolean;
  selectionOnly: boolean;
}

export interface GhostPose extends GhostingAppearance {
  frame: number;
  bones: readonly BoneView[];
  slots: readonly SlotView[];
  color: number;
  alpha: number;
  offsetX: number;
  offsetY: number;
}

export interface GhostVector {
  readonly bone: number;
  readonly from: Readonly<Point>;
  readonly to: Readonly<Point>;
  readonly color: number;
  readonly alpha: number;
}

export type GhostingUnavailable = 'mode' | 'animation' | 'physics' | 'unsupported' | 'budget';

export function defaultGhostingSettings(): GhostingSettings {
  return {
    enabled: false,
    frames: { beforeEnabled: true, afterEnabled: true, before: 4, after: 4, step: 2, beforeColor: '#61a8dd', afterColor: '#f39c72', current: false, fill: 'none', outline: 'none' },
    keyFrames: { beforeEnabled: false, afterEnabled: false, before: 4, after: 4, step: 1, beforeColor: '#a18cf0', afterColor: '#e6c565', current: false, fill: 'none', outline: 'none' },
    motionVectors: { beforeEnabled: false, afterEnabled: false, before: 3, after: 3, beforeColor: '#f07478', afterColor: '#5aa9f0', threshold: 0 },
    anchor: false,
    onTop: false,
    loop: false,
    offsetX: 0,
    offsetY: 0,
    opacity: .4,
    bones: true,
    selectionOnly: false,
  };
}

/** An empty live or deliberately empty capture shows all slot owners. An
 * originally nonempty capture can have no surviving owners after an edit. */
export function resolveGhostingBoneFilter(
  bones: readonly Pick<BoneView, 'id'>[],
  selected: readonly number[],
  captured: readonly number[] | null,
): ReadonlySet<number> | null {
  const ids = captured ?? selected;
  if (!ids.length) return null;
  const scope = new Set(ids);
  const surviving = new Set(bones.filter(({id}) => scope.has(id)).map(({id}) => id));
  return captured !== null || surviving.size ? surviving : null;
}

interface FrameRange { start: number; end: number }
interface Sample { frame: number; delta: number; color: number }
type GhostSample = Sample & GhostingAppearance;

export interface GhostingWorkBudget {
  work: number;
  poseCost: number;
  attachmentCost: number;
}
interface Candidate { frame: number; at: number }
type MotionEndpoint<T> = { direction: -1 | 1; sample: T };

function bounded(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : minimum;
}

function tint(value: string): number {
  return /^#[0-9a-f]{6}$/i.test(value) ? Number.parseInt(value.slice(1), 16) : 0xffffff;
}

function keyTracks(clip: AnimationView): ReadonlyArray<{ keys: readonly { frame: number }[] }> {
  return [
    ...clip.tracks,
    ...(clip.slotTracks ?? []),
    ...(clip.deformTracks ?? []),
    ...(clip.constraintTracks ?? []),
    ...(clip.eventTracks ?? []),
    ...(clip.sequenceTracks ?? []),
    { keys: clip.drawOrder ?? [] },
  ];
}

export function ghostingKeyFrames(clip: AnimationView): number[] {
  const frames = new Set<number>();
  for (const { keys } of keyTracks(clip)) {
    for (const key of keys) {
      const frame = Math.fround(key.frame);
      if (frame >= 0 && frame <= MAX_ANIMATION_PREVIEW_FRAME) frames.add(frame);
    }
  }
  return [...frames].sort((a, b) => a - b);
}

export function ghostingSampleBudget(project: ProjectSummary, clip: AnimationView) {
  const bones = project.bones.length;
  let poseCost = bones + keyTracks(clip).reduce((total, track) => total + track.keys.length + 1, 0);
  for (const constraint of project.constraints ?? []) {
    if (constraint.type === 'ik') poseCost += bones + (constraint.bones.length === 2 ? 240 : 1);
    if (constraint.type === 'transform') poseCost += constraint.bones.length * (bones + constraint.properties.reduce((total, from) => total + from.to.length, 0));
    if (constraint.type === 'physics') poseCost++;
    if (constraint.type === 'path') poseCost += pathEvaluationWork(project.slots, constraint, bones);
  }
  let attachmentCost = 0;
  for (const slot of project.slots ?? []) {
    attachmentCost += 2;
    for (const attachment of slot.attachments ?? []) {
      const binding = attachment.mesh ?? attachment.clipping;
      attachmentCost += 1 + (binding ? binding.vertices.length * Math.max(1, binding.bones.length) : 0);
    }
  }
  return { maxSamples: MAX_SAMPLES, work: SAMPLE_WORK, poseCost: Math.max(1, poseCost), attachmentCost };
}

function wrapFrame(frame: number, { start, end }: FrameRange): number {
  if (frame >= start && frame <= end) return frame;
  const span = end - start;
  return start + (((frame - start) % span) + span) % span;
}

function repeatRange(settings: GhostingSettings, frame: number, loop: FrameRange | null): FrameRange | null {
  return loop && settings.loop && Number.isFinite(loop.end) && loop.end <= MAX_ANIMATION_PREVIEW_FRAME
    && loop.end > loop.start && frame >= loop.start && frame <= loop.end ? loop : null;
}

function regularSamples(frame: number, direction: -1 | 1, limit: number, step: number, range: FrameRange, anchor: boolean, repeat: boolean): Candidate[] {
  const origin = anchor ? 0 : frame;
  const low = repeat ? frame - limit : Math.max(range.start, frame - limit);
  const high = repeat ? frame + limit : Math.min(range.end, frame + limit);
  const from = direction < 0 ? Math.min(frame, high) : Math.max(frame, low);
  const index = (from - origin) / step;
  let n = direction < 0 ? Math.floor(index) : Math.ceil(index);
  const result: Candidate[] = [];
  const epsilon = 1e-8;
  while (result.length <= MAX_SAMPLES) {
    const at = origin + n * step;
    if (at < low - epsilon || at > high + epsilon) break;
    if ((at - frame) * direction > epsilon && Math.fround(at) !== Math.fround(frame)) {
      result.push({ at, frame: repeat ? wrapFrame(at, range) : bounded(at, range.start, range.end) });
    }
    n += direction;
  }
  return result;
}

function lowerBound(keys: readonly number[], frame: number): number {
  let low = 0;
  let high = keys.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (keys[mid]! < frame) low = mid + 1;
    else high = mid;
  }
  return low;
}

function keyedSamples(keys: readonly number[], frame: number, direction: -1 | 1, limit: number, step: number, range: FrameRange, repeat: boolean): Candidate[] {
  const result: Candidate[] = [];
  const shifts = repeat ? [0, direction * (range.end - range.start)] : [0];
  for (const shift of shifts) {
    const low = Math.max(range.start, frame - (direction < 0 ? limit : 0) - shift);
    const high = Math.min(range.end, frame + (direction > 0 ? limit : 0) - shift);
    if (low > high) continue;
    let index = lowerBound(keys, direction < 0 ? high : low);
    if (direction < 0 && (keys[index] ?? Infinity) > high) index--;
    index = (direction < 0 ? Math.floor(index / step) : Math.ceil(index / step)) * step;
    while (result.length <= MAX_SAMPLES && index >= 0 && index < keys.length) {
      const key = keys[index]!;
      if (key < low || key > high) break;
      const at = key + shift;
      if ((at - frame) * direction > 0 && Math.fround(at) !== Math.fround(frame)) result.push({ at, frame: key });
      index += direction * step;
    }
  }
  return result;
}

export function planGhosting(settings: GhostingSettings, frame: number, keys: readonly number[], end: number, loop: FrameRange | null, limit: number, budget?: GhostingWorkBudget) {
  const repeated = repeatRange(settings, frame, loop);
  const repeat = repeated !== null;
  const range = repeated ?? { start: 0, end };
  const samples = new Map<string, GhostSample>();
  const addRange = (group: GhostingRange, keyed: boolean) => {
    for (const direction of [-1, 1] as const) {
      if (!(direction < 0 ? group.beforeEnabled : group.afterEnabled)) continue;
      const distance = bounded(direction < 0 ? group.before : group.after, 0, GHOST_FRAME_RANGE);
      const extent = repeat ? Math.min(distance, range.end - range.start) : distance;
      if (!extent) continue;
      const candidates = keyed
        ? keyedSamples(keys, frame, direction, extent, Math.floor(bounded(group.step, 1, GHOST_FRAME_RANGE)), range, repeat)
        : regularSamples(frame, direction, extent, bounded(group.step, GHOST_FRAME_STEP, GHOST_FRAME_RANGE), range, settings.anchor, repeat);
      const color = tint(direction < 0 ? group.beforeColor : group.afterColor);
      for (const candidate of candidates) {
        const position = Math.fround(candidate.frame);
        const delta = candidate.at - frame;
        samples.set(`${position}:${Math.fround(delta)}`, { frame: position, delta, color, fill: group.fill, outline: group.outline });
      }
    }
  };
  addRange(settings.frames, false);
  addRange(settings.keyFrames, true);
  const current = settings.keyFrames.current ? settings.keyFrames : settings.frames.current ? settings.frames : null;
  if (current) samples.set('current', { frame, delta: 0, color: 0xffffff, fill: current.fill, outline: current.outline });
  const nearest = [...samples.values()].filter(sample => settings.bones || ghostingDisplaysAttachments(sample))
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
  if (!budget) return { samples: nearest.slice(0, limit).reverse(), limited: nearest.length > limit };
  const planned: GhostSample[] = [];
  let remaining = budget.work;
  for (const sample of nearest) {
    if (planned.length >= limit) break;
    const cost = budget.poseCost + (ghostingDisplaysAttachments(sample) ? budget.attachmentCost : 0);
    if (cost > remaining) continue;
    planned.push(sample);
    remaining -= cost;
  }
  return { samples: planned.reverse(), limited: nearest.length > planned.length };
}

/** Motion vectors have their own spans. Reserve the current pose once, then
 * prefer the earlier side if the remaining work budget allows only one. */
export function planGhostingMotion(settings: GhostingSettings, frame: number, end: number, loop: FrameRange | null, limit: number) {
  const motion = settings.motionVectors;
  const repeated = repeatRange(settings, frame, loop);
  const range = repeated ?? { start: 0, end };
  const baseline = Math.fround(frame);
  const frames = new Set([baseline]);
  const endpoints: MotionEndpoint<Sample>[] = [];
  let limited = false;
  for (const direction of [-1, 1] as const) {
    if (!(direction < 0 ? motion.beforeEnabled : motion.afterEnabled)) continue;
    const distance = bounded(direction < 0 ? motion.before : motion.after, 0, GHOST_FRAME_RANGE);
    const extent = repeated ? Math.min(distance, range.end - range.start) : distance;
    if (!extent) continue;
    const at = frame + direction * extent;
    if (!repeated && (direction < 0 ? at > range.end : at < range.start)) continue;
    const endpoint = Math.fround(repeated ? wrapFrame(at, range) : bounded(at, range.start, range.end));
    if (endpoint === baseline || (!repeated && direction * (endpoint - baseline) < 0)) continue;
    if (!frames.has(endpoint) && frames.size >= limit) {
      limited = true;
      continue;
    }
    frames.add(endpoint);
    endpoints.push({ direction, sample: {
      frame: endpoint, delta: 0, color: tint(direction < 0 ? motion.beforeColor : motion.afterColor),
    } });
  }
  return {
    baseline: endpoints.length ? { frame: baseline, delta: 0, color: 0xffffff } : null,
    endpoints,
    reserved: endpoints.length ? frames.size : 0,
    limited,
  };
}

type MotionRegion = ReturnType<typeof worldRegions>[number];

function motionGeometry(pose: GhostPose) {
  const regions = new Map(worldRegions(pose.bones, pose.slots)
    .filter(slot => slot.visible && renderedAttachmentId(slot) !== null)
    .map(slot => [slot.id, slot] as const));
  const points = new Map<number, readonly Point[]>();
  let evaluated: ReadonlyMap<number, WorldBone> | undefined;
  function pointsFor(slot: MotionRegion): readonly Point[] {
    const cached = points.get(slot.id);
    if (cached) return cached;
    let sampled: Point[];
    if (slot.mesh) {
      evaluated ??= new Map(worldBones(pose.bones).map(bone => [bone.id, bone]));
      sampled = bindingPoints(pose.bones, slot.mesh, evaluated);
    } else {
      const {width, height} = slot.region;
      sampled = [[-width, -height], [-width, height], [width, height], [width, -height]]
        .map(([x, y]) => transformPoint(slot, x! / 2, y! / 2));
    }
    points.set(slot.id, sampled);
    return sampled;
  }
  return {regions, pointsFor};
}

function sameMotionTopology(a: MotionRegion, b: MotionRegion): boolean {
  const first = a.mesh, last = b.mesh;
  if (!first || !last) return !first && !last;
  return first.vertices.length === last.vertices.length && first.triangles.length === last.triangles.length
    && first.triangles.every((index, i) => index === last.triangles[i]);
}

/** Compare committed world-space vertices before presentation offsets. */
export function traceGhostingMotion(
  baseline: GhostPose,
  endpoints: readonly MotionEndpoint<GhostPose>[],
  threshold: number,
): { vectors: readonly GhostVector[]; limited: boolean } {
  const minimum = bounded(threshold, 0, GHOST_MOTION_THRESHOLD_LIMIT);
  const origin = motionGeometry(baseline);
  const vectors: GhostVector[] = [];
  for (const {direction, sample} of endpoints) {
    const endpoint = motionGeometry(sample);
    for (const [id, slot] of origin.regions) {
      const next = endpoint.regions.get(id);
      if (!next || renderedAttachmentId(slot) !== renderedAttachmentId(next) || !sameMotionTopology(slot, next)) continue;
      const currentPoints = origin.pointsFor(slot);
      const nextPoints = endpoint.pointsFor(next);
      const [starts, ends] = direction < 0 ? [nextPoints, currentPoints] : [currentPoints, nextPoints];
      for (const [index, from] of starts.entries()) {
        const to = ends[index]!;
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        if (!Number.isFinite(length) || length === 0 || length < minimum) continue;
        if (vectors.length >= MAX_GHOST_MOTION_VECTORS) return {vectors, limited: true};
        vectors.push({bone: slot.bone, from, to, color: sample.color, alpha: sample.alpha});
      }
    }
  }
  return {vectors, limited: false};
}

/** The sampler owns only scratch state and a bounded cache for anchored poses. */
export function createGhostingSampler(project: ProjectSummary, clip: AnimationView, fps: number) {
  const runtime = new AnimationPhysicsPreview();
  runtime.configure({ setupBones: project.bones, setupConstraints: project.constraints ?? [], setupSlots: project.slots, clip, fps, simulate: false });
  const cache = new Map<number, { bones: readonly BoneView[]; slots?: readonly SlotView[] }>();
  const setupSlots = project.slots ?? [];
  return (sample: Sample & Partial<GhostingAppearance>, settings: GhostingSettings, motion = false): GhostPose => {
    const { fill = 'none', outline = 'none' } = sample;
    const sampleAttachments = motion || ghostingDisplaysAttachments({fill, outline});
    let pose = cache.get(sample.frame);
    if (!pose) {
      const frame = runtime.advanceTo(sample.frame);
      pose = { bones: withEvaluatedPose(runtime.localBones, frame.bones) };
      if (cache.size >= MAX_SAMPLES * 2) cache.delete(cache.keys().next().value!);
      cache.set(sample.frame, pose);
    }
    if (sampleAttachments && !pose.slots) {
      let slots = setupSlots;
      if (project.sceneEditing) {
        slots = projectSlotPoses(slots, sampleSlotPoses(setupSlots, clip.slotTracks ?? [], sample.frame));
        slots = deformSlots(slots, sampleDeformPoses(setupSlots, clip.deformTracks ?? [], sample.frame));
        slots = orderSlots(slots, sampleDrawOrder(setupSlots, clip.drawOrder ?? [], sample.frame));
      }
      pose.slots = projectSequencePoses(slots, sampleSequencePoses(slots, clip.sequenceTracks ?? [], sample.frame, fps));
    }
    return {
      bones: pose.bones,
      slots: sampleAttachments ? pose.slots! : [],
      fill,
      outline,
      frame: sample.frame,
      color: sample.color,
      alpha: bounded(settings.opacity, 0, 1),
      offsetX: bounded(settings.offsetX, -GHOST_OFFSET_LIMIT, GHOST_OFFSET_LIMIT) * sample.delta,
      offsetY: bounded(settings.offsetY, -GHOST_OFFSET_LIMIT, GHOST_OFFSET_LIMIT) * sample.delta,
    };
  };
}
