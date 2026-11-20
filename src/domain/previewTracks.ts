import { sampleTrack, type AnimationView } from './animation.ts';
import { constraintPose, isPathAnimationTrack, sampleConstraintPoses, type ConstraintPose } from './animationConstraints.ts';
import { deformSlots, orderSlots, sampleDeformPoses, sampleDrawOrder, type DeformPose } from './animationGeometry.ts';
import { MAX_ANIMATION_PREVIEW_FRAME } from './animationPlayback.ts';
import { projectSequencePoses, sampleSequencePoses } from './animationSequence.ts';
import { projectSlotPoses, sampleSlotColorTrack, sampleSlotPoses, type Rgb, type Rgba, type SlotAnimationPose, type SlotColorSample } from './animationSlots.ts';
import { clippingScopes } from './clipping.ts';
import { withEvaluatedPose } from './evaluatedPose.ts';
import type { BoneView, ConstraintView, ProjectSummary, SlotView } from './project.ts';
import { evaluateSampled, PhysicsState, type LocalPose } from './solve/index.ts';
import { localPose, wrap } from './solve/math.ts';
import { pathEvaluationWork } from './solve/path.ts';

export const MAX_PREVIEW_TRACKS = 15;
const MAX_PREVIEW_WORK = 100_000;

export interface PreviewClipSample { clip: AnimationView; frame: number; additive?: boolean }
export interface PreviewPoseTrack { current: PreviewClipSample | null; previous: PreviewClipSample | null; mix: number; alpha: number }
export class PreviewTrackBudgetError extends Error {
  constructor() {
    super('This Preview composition exceeds the playback budget.');
    this.name = 'PreviewTrackBudgetError';
  }
}

export function previewTrackSupportsClip(clip: AnimationView, index: number): boolean {
  if (!Number.isSafeInteger(index) || index < 0 || index >= MAX_PREVIEW_TRACKS) return false;
  return index === 0 || (!clip.slotTracks?.some(track => track.channel === 'attachment') &&
    !clip.drawOrder?.length && !clip.deformTracks?.length && !clip.sequenceTracks?.length &&
    !clip.constraintTracks?.some(track => track.channel === 'ik' || track.channel === 'transformMix' || isPathAnimationTrack(track)));
}

function unit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function interpolate(from: number, to: number, amount: number): number {
  if (amount === 0) return from;
  if (amount === 1) return to;
  return from + (to - from) * amount;
}

function blend(base: number, before: number | undefined, next: number | undefined, track: PreviewPoseTrack): number {
  if (before === undefined && next === undefined) return base;
  return interpolate(base, interpolate(before ?? base, next ?? base, track.mix), track.alpha);
}

function blendRotation(base: number, before: number | undefined, next: number | undefined, track: PreviewPoseTrack): number {
  if (before === undefined && next === undefined) return base;
  const from = before ?? base;
  const to = next ?? base;
  const target = track.mix === 1 ? to : from + wrap(to - from) * track.mix;
  return track.alpha === 1 ? target : base + wrap(target - base) * track.alpha;
}

function dominant(track: PreviewPoseTrack | undefined): PreviewClipSample | null {
  if (!track || track.alpha < .5) return null;
  return track.mix < .5 ? track.previous : track.current;
}

function previous(track: PreviewPoseTrack): PreviewClipSample | null {
  return track.mix < 1 ? track.previous : null;
}

function current(track: PreviewPoseTrack): PreviewClipSample | null {
  return track.mix > 0 ? track.current : null;
}

function clipWork(clip: AnimationView): number {
  const tracks = [...clip.tracks, ...(clip.slotTracks ?? []), ...(clip.deformTracks ?? []), ...(clip.constraintTracks ?? []), ...(clip.sequenceTracks ?? [])];
  return (clip.drawOrder?.length ?? 0) + tracks.reduce((work, track) => work + track.keys.length + 1, 0);
}

function validateWork(project: ProjectSummary, tracks: readonly PreviewPoseTrack[]): void {
  if (tracks.length > MAX_PREVIEW_TRACKS) throw new Error(`Preview supports up to ${MAX_PREVIEW_TRACKS} tracks.`);
  const bones = project.bones.length;
  let work = bones + project.slots.length;
  for (const constraint of project.constraints ?? []) {
    if (constraint.type === 'ik') work += bones + (constraint.bones.length === 2 ? 240 : 1);
    if (constraint.type === 'transform') work += constraint.bones.length * (bones + constraint.properties.reduce((total, from) => total + from.to.length, 0));
    if (constraint.type === 'path') work += pathEvaluationWork(project.slots, constraint, bones);
  }
  for (const slot of project.slots) {
    for (const attachment of slot.attachments ?? []) {
      const binding = attachment.mesh ?? attachment.clipping;
      work += 1 + (binding ? binding.vertices.length * Math.max(1, binding.bones.length) : 0);
    }
  }
  for (const [index, track] of tracks.entries()) {
    if (!track) throw new Error('Preview tracks must be supplied in track order.');
    if (!unit(track.mix) || !unit(track.alpha)) throw new Error('Preview mix and alpha must be between 0 and 1.');
    for (const sample of [previous(track), current(track)]) {
      if (!sample) continue;
      if (!previewTrackSupportsClip(sample.clip, index)) throw new Error('This animation requires Preview track 0.');
      if (!Number.isFinite(sample.frame) || sample.frame < 0 || sample.frame > MAX_ANIMATION_PREVIEW_FRAME) throw new Error('The Preview frame is outside the supported range.');
      if (track.alpha > 0) work += clipWork(sample.clip);
    }
  }
  if (work > MAX_PREVIEW_WORK) throw new PreviewTrackBudgetError();
}

/** Ordinary lanes are absolute local values. Additive lanes are setup-relative deltas. */
function sampleBoneChannels(
  setup: ReadonlyMap<number, LocalPose>,
  sample: PreviewClipSample | null,
  additive: boolean,
): Map<number, Partial<LocalPose>> {
  const channels = new Map<number, Partial<LocalPose>>();
  if (!sample) return channels;
  const relative = (base: number, value: number) => additive ? value : base + value;
  const scale = (base: number, factor: number) => additive ? base * factor - base : base * factor;
  for (const track of sample.clip.tracks) {
    const bone = setup.get(track.bone);
    if (!bone) continue;
    const values = sampleTrack(track, sample.frame);
    if (!values) continue;
    const [x, y] = values;
    const pose = channels.get(track.bone) ?? {};
    switch (track.channel) {
      case 'translate': pose.x = relative(bone.x, x); pose.y = relative(bone.y, y); break;
      case 'translateX': pose.x = relative(bone.x, x); break;
      case 'translateY': pose.y = relative(bone.y, x); break;
      case 'rotate': pose.rotation = relative(bone.rotation, x); break;
      case 'scale': pose.scaleX = scale(bone.scaleX, x); pose.scaleY = scale(bone.scaleY, y); break;
      case 'scaleX': pose.scaleX = scale(bone.scaleX, x); break;
      case 'scaleY': pose.scaleY = scale(bone.scaleY, x); break;
      case 'shear': pose.shearX = relative(bone.shearX, x); pose.shearY = relative(bone.shearY, y); break;
    }
    channels.set(track.bone, pose);
  }
  return channels;
}

const linearBoneChannels = ['x', 'y', 'scaleX', 'scaleY', 'shearX', 'shearY'] as const;

function entryContribution(value: number | undefined, lower: number, additive: boolean, rotation: boolean): number {
  if (value === undefined) return 0;
  if (additive) return value;
  return rotation ? wrap(value - lower) : value - lower;
}

function blendBoneChannel(
  lower: number,
  from: number | undefined,
  to: number | undefined,
  track: PreviewPoseTrack,
  additive: { from: boolean; to: boolean },
  rotation = false,
): number {
  if (!(additive.from && from !== undefined) && !(additive.to && to !== undefined)) {
    return rotation ? blendRotation(lower, from, to, track) : blend(lower, from, to, track);
  }
  const start = entryContribution(from, lower, additive.from, rotation);
  const end = entryContribution(to, lower, additive.to, rotation);
  const delta = interpolate(start, end, track.mix) * track.alpha;
  return delta === 0 ? lower : lower + delta;
}

function composeBones(bones: readonly BoneView[], tracks: readonly PreviewPoseTrack[]): LocalPose[] {
  const setup = new Map(bones.map(bone => {
    const pose = localPose(bone);
    for (const key of linearBoneChannels) pose[key] = Math.fround(pose[key]);
    pose.rotation = Math.fround(pose.rotation);
    return [bone.id, pose] as const;
  }));
  const result = new Map([...setup].map(([id, pose]) => [id, { ...pose }]));
  for (const [index, track] of tracks.entries()) {
    if (track.alpha === 0) continue;
    const fromSample = previous(track), toSample = current(track);
    const additive = { from: index > 0 && fromSample?.additive === true, to: index > 0 && toSample?.additive === true };
    const before = sampleBoneChannels(setup, fromSample, additive.from);
    const next = sampleBoneChannels(setup, toSample, additive.to);
    for (const id of new Set([...before.keys(), ...next.keys()])) {
      const pose = result.get(id)!;
      const from = before.get(id);
      const to = next.get(id);
      for (const key of linearBoneChannels) pose[key] = blendBoneChannel(pose[key], from?.[key], to?.[key], track, additive);
      pose.rotation = blendBoneChannel(pose.rotation, from?.rotation, to?.rotation, track, additive, true);
    }
  }
  return [...result.values()];
}

function sampleColors(poses: ReadonlyMap<number, SlotAnimationPose>, sample: PreviewClipSample | null): Map<number, SlotColorSample> {
  const result = new Map<number, SlotColorSample>();
  if (!sample) return result;
  for (const track of sample.clip.slotTracks ?? []) {
    const pose = poses.get(track.slot);
    if (track.channel === 'attachment' || !pose) continue;
    const color = sampleSlotColorTrack(track, sample.frame, pose.dark !== undefined);
    if (!color) continue;
    const prior = result.get(track.slot);
    if (!prior) {
      result.set(track.slot, color);
      continue;
    }
    const [r, g, b, a] = color.light;
    const [pr, pg, pb, pa] = prior.light;
    prior.light = [r ?? pr, g ?? pg, b ?? pb, a ?? pa];
    if (color.dark) prior.dark = color.dark;
  }
  return result;
}

function blendColor<T extends Rgb | Rgba>(base: T, from: SlotColorSample['light'] | undefined, to: SlotColorSample['light'] | undefined, track: PreviewPoseTrack): T {
  return base.map((value, index) => blend(value, from?.[index], to?.[index], track)) as T;
}

function composeColors(poses: SlotAnimationPose[], tracks: readonly PreviewPoseTrack[]): void {
  const byId = new Map(poses.map(pose => [pose.slot, pose]));
  for (const track of tracks) {
    if (track.alpha === 0) continue;
    const before = sampleColors(byId, previous(track));
    const next = sampleColors(byId, current(track));
    for (const id of new Set([...before.keys(), ...next.keys()])) {
      const pose = byId.get(id)!;
      const from = before.get(id);
      const to = next.get(id);
      pose.color = blendColor(pose.color, from?.light, to?.light, track);
      if (from?.dark || to?.dark) pose.dark = blendColor(pose.dark ?? [0, 0, 0], from?.dark, to?.dark, track);
    }
  }
}

function composeDeforms(slots: readonly SlotView[], track: PreviewPoseTrack | undefined): DeformPose[] {
  if (!track || track.alpha === 0) return [];
  const sample = (value: PreviewClipSample | null) => value && sampleDeformPoses(slots, value.clip.deformTracks ?? [], value.frame);
  const before = new Map((sample(previous(track)) ?? []).map(row => [row.attachment, row.offsets]));
  const next = new Map((sample(current(track)) ?? []).map(row => [row.attachment, row.offsets]));
  return [...new Set([...before.keys(), ...next.keys()])].map(attachment => {
    const from = before.get(attachment);
    const to = next.get(attachment);
    const offsets = (from ?? to)!.map((_, index) => blend(0, from?.[index], to?.[index], track));
    return { attachment, offsets };
  });
}

function composeSlots(project: ProjectSummary, tracks: readonly PreviewPoseTrack[], fps: number): SlotView[] {
  const setup = project.slots;
  const base = dominant(tracks[0]);
  const frame = base?.frame ?? 0;
  let slots = setup;
  if (project.sceneEditing) {
    const poses = sampleSlotPoses(setup, base?.clip.slotTracks?.filter(track => track.channel === 'attachment') ?? [], frame);
    composeColors(poses, tracks);
    slots = projectSlotPoses(setup, poses);
    slots = deformSlots(slots, composeDeforms(setup, tracks[0]));
    slots = orderSlots(slots, sampleDrawOrder(setup, base?.clip.drawOrder ?? [], frame));
  }
  slots = projectSequencePoses(slots, sampleSequencePoses(slots, base?.clip.sequenceTracks ?? [], frame, fps));
  const { issues } = clippingScopes(slots);
  if (issues.length) throw new Error(issues.join(' '));
  return slots;
}

type StaticPose = Exclude<ConstraintPose, { type: 'physics' }>;

function pathPosition(setup: number, pose: ConstraintPose | undefined, sample: PreviewClipSample | null): number | undefined {
  if (pose?.type !== 'path') return undefined;
  const additive = sample?.additive && sample.clip.constraintTracks?.some(track =>
    track.channel === 'pathPosition' && track.constraint === pose.constraint &&
    track.keys[0] && sample.frame >= Math.fround(track.keys[0].frame));
  return additive ? setup + pose.position : pose.position;
}

function composeConstraints(constraints: readonly ConstraintView[], track: PreviewPoseTrack | undefined): StaticPose[] {
  if (!track || track.alpha === 0) return [];
  const sample = (value: PreviewClipSample | null) => value ? sampleConstraintPoses(constraints, value.clip.constraintTracks?.filter(key => key.channel !== 'physics' && key.channel !== 'physicsReset') ?? [], value.frame) : [];
  const beforeClip = previous(track), nextClip = current(track);
  const before = new Map(sample(beforeClip).map(pose => [pose.constraint, pose]));
  const next = new Map(sample(nextClip).map(pose => [pose.constraint, pose]));
  const discrete = track.alpha < .5 ? null : track.mix < .5 ? before : next;
  const result: StaticPose[] = [];
  for (const row of constraints) {
    const from = before.get(row.id);
    const to = next.get(row.id);
    if (!from && !to) continue;
    const setup = constraintPose(row);
    if (setup.type === 'ik') {
      const switched = discrete?.get(row.id);
      result.push({
        ...(switched?.type === 'ik' ? switched : setup),
        mix: blend(setup.mix, from?.type === 'ik' ? from.mix : undefined, to?.type === 'ik' ? to.mix : undefined, track),
        softness: blend(setup.softness, from?.type === 'ik' ? from.softness : undefined, to?.type === 'ik' ? to.softness : undefined, track),
      });
    }
    if (setup.type === 'transform') {
      const mixes = setup.mixes.map((value, axis) => blend(value, from?.type === 'transform' ? from.mixes[axis] : undefined, to?.type === 'transform' ? to.mixes[axis] : undefined, track)) as typeof setup.mixes;
      result.push({ ...setup, mixes });
    }
    if (setup.type === 'path') {
      const mixes = setup.mixes.map((value, axis) => blend(value, from?.type === 'path' ? from.mixes[axis] : undefined, to?.type === 'path' ? to.mixes[axis] : undefined, track)) as typeof setup.mixes;
      result.push({
        ...setup, mixes,
        position: blend(setup.position, pathPosition(setup.position, from, beforeClip), pathPosition(setup.position, to, nextClip), track),
        spacing: blend(setup.spacing, from?.type === 'path' ? from.spacing : undefined, to?.type === 'path' ? to.spacing : undefined, track),
      });
    }
  }
  return result;
}

/** Independent Preview only. Pose tracks never invoke editor animation state or a native lease. */
export function samplePreviewTracks(project: ProjectSummary, tracks: readonly PreviewPoseTrack[]): { bones: BoneView[]; slots: SlotView[] } {
  if (project.inspectionOnly || !project.bones.length) throw new Error('Open an editable project to use Preview tracks.');
  validateWork(project, tracks);
  const constraints = project.constraints ?? [];
  const fps = Math.fround(project.animationFps ?? 30);
  if (!Number.isFinite(fps) || fps <= 0) throw new Error('Preview requires a finite positive project FPS.');
  const local = composeBones(project.bones, tracks);
  const evaluated = evaluateSampled({ bones: project.bones, constraints, slots: project.slots }, local, new PhysicsState(), { type: 'none' }, composeConstraints(constraints, tracks[0]));
  const bones = project.bones.map((bone, index) => ({ ...bone, ...local[index]! }));
  return { bones: withEvaluatedPose(bones, evaluated.bones), slots: composeSlots(project, tracks, fps) };
}
