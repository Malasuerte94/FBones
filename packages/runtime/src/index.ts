import {AnimationPhysicsPreview} from '../../../src/domain/animationPhysicsPreview.ts';
import {sampleSlotPoses, projectSlotPoses} from '../../../src/domain/animationSlots.ts';
import {sampleDeformPoses, deformSlots, sampleDrawOrder, orderSlots} from '../../../src/domain/animationGeometry.ts';
import {sampleSequencePoses, projectSequencePoses} from '../../../src/domain/animationSequence.ts';
import {animationPreviewEnd} from '../../../src/domain/animationPlayback.ts';
import {withEvaluatedPose} from '../../../src/domain/evaluatedPose.ts';
import {eventsBetween, type FiredEvent} from '../../../src/domain/animationEvents.ts';
import type {BoneView, SlotView} from '../../../src/domain/project.ts';
import type {AnimationView} from '../../../src/domain/animation.ts';
import {parseRuntimeData, RuntimeDataError, type RuntimeData} from './data.ts';
export {parseRuntimeData, createRuntimeData, RuntimeDataError, resourceKey} from './data.ts';
export type {RuntimeData} from './data.ts';
export type {BoneView, SlotView, AttachmentView, MeshView, RegionView, ConstraintView} from '../../../src/domain/project.ts';
export type {AnimationView, AnimationTrack, AnimationKey} from '../../../src/domain/animation.ts';
export type {EventDefinition, FiredEvent} from '../../../src/domain/animationEvents.ts';

export const runtimeCapabilities = Object.freeze({
  gameExportVersion: 1, projectBinaryLoading: false, animationMixing: false,
  boneChannels: ['rotate','translate','translateX','translateY','scale','scaleX','scaleY','shear'] as const,
  curves: ['linear','stepped','bezier'] as const,
  regions: true, weightedMeshes: true, clipping: true, slotColor: true, twoColor: true,
  drawOrder: true, deformation: true, sequences: true, events: true,
  constraints: 'FBones current bounded IK/Transform/Physics solver; no full Spine numeric parity claim',
  physicsTimeLimitSeconds: 120,
});

export interface RuntimeFrame {
  /** Presentation seconds and frame address, never stored authoring changes. */
  time: number;
  frame: number;
  animation: string | null;
  bones: BoneView[];
  slots: SlotView[];
  /** Forward update crossings only; seek never fires events/audio. */
  events: FiredEvent[];
}
export interface PlayerOptions {simulate?: boolean}
export interface PlayOptions {loop?: boolean}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

/** Independent, platform-free player. Call update(seconds) from your own game
 * loop; this class owns no timers, audio devices, DOM, native bridge or assets. */
export class FBonesPlayer {
  readonly data: RuntimeData;
  private preview = new AnimationPhysicsPreview();
  private clip: AnimationView | null = null;
  private simulate: boolean;
  private current: RuntimeFrame;
  private endFrame = 0;
  private running = false;
  private repeats = true;

  constructor(input: unknown, options: PlayerOptions = {}) {
    this.data = freeze(parseRuntimeData(input));
    this.simulate = (options.simulate ?? true) && this.data.constraints.some(c => c.type === 'physics');
    this.configure();
    this.current = this.render([]);
  }
  get frame(): RuntimeFrame {return this.current;}
  get playing(): boolean {return this.running;}
  get loop(): boolean {return this.repeats;}
  /** Sequence tails follow the existing FBones editor preview policy. */
  get duration(): number {return this.endFrame / this.data.fps;}
  get animationNames(): readonly string[] {return this.data.animations.map(clip => clip.name);}

  play(name: string, options: PlayOptions = {}): RuntimeFrame {
    const clip = this.data.animations.find(value => value.name === name);
    if (!clip) throw new RuntimeDataError(`Animation ${JSON.stringify(name)} does not exist.`);
    const end = animationPreviewEnd(clip, this.data.slots, this.data.fps);
    if (end.exceedsBudget || this.simulate && end.end / this.data.fps > 120) throw new RuntimeDataError('Animation playback exceeds the supported time budget.');
    const initialEvents = eventsBetween(clip.eventTracks ?? [], 0, 0, true);
    if (initialEvents.length > 4096) throw new RuntimeDataError('One update may deliver at most 4096 events.');
    this.clip = clip; this.endFrame = end.end; this.repeats = options.loop ?? true;
    this.configure();
    this.running = this.endFrame > 0;
    this.current = this.render(initialEvents);
    return this.current;
  }
  pause(): void {this.running = false;}
  resume(): void {if (this.clip && this.endFrame > 0 && (this.repeats || this.current.frame < this.endFrame)) this.running = true;}
  stop(): RuntimeFrame {this.running = false; return this.seek(0);}

  /** Deliberate seek resets deterministic Physics, suppresses event delivery and
   * clamps to this clip's preview duration. Setup is retained verbatim. */
  seek(seconds: number): RuntimeFrame {
    this.checkSeconds(seconds);
    const frame = this.clip ? Math.min(seconds * this.data.fps, this.endFrame) : 0;
    this.preview.seek(frame);
    this.current = this.render([]);
    return this.current;
  }

  update(deltaSeconds: number): RuntimeFrame {
    this.checkSeconds(deltaSeconds);
    if (!this.running || !this.clip || deltaSeconds === 0) {
      // Events belong to a crossing, not a cached frame seen again while paused.
      if (this.current.events.length) this.current = {...this.current, events: []};
      return this.current;
    }
    let remaining = deltaSeconds * this.data.fps;
    if (!Number.isFinite(remaining) || remaining / this.endFrame > 1024) throw new RuntimeDataError('One update may cross at most 1024 animation loops.');
    let cursor = this.current.frame;
    const fired: FiredEvent[] = [];
    let wrapped = false, running: boolean = this.running;
    const append = (events: FiredEvent[]) => {
      if (fired.length + events.length > 4096) throw new RuntimeDataError('One update may deliver at most 4096 events.');
      fired.push(...events);
    };
    while (remaining > 0) {
      const target = Math.min(this.endFrame, cursor + remaining);
      append(eventsBetween(this.clip.eventTracks ?? [], cursor, target));
      // Adding/subtracting decimal deltas can leave an unrepresentable residue
      // smaller than one ULP at the current frame. Finish the final segment
      // explicitly; otherwise a zero-progress loop would spin forever.
      remaining = target < this.endFrame ? 0 : Math.max(0, remaining - (target - cursor));
      cursor = target;
      if (cursor >= this.endFrame) {
        if (!this.repeats) {running = false; break;}
        // End events precede the new loop's frame-zero events, even at an exact
        // loop boundary. Every loop resets scratch Physics independently.
        wrapped = true; cursor = 0;
        append(eventsBetween(this.clip.eventTracks ?? [], 0, 0, true));
      }
    }
    // Event/time budgets are preflighted before touching the player clock.
    // Earlier complete loops cannot affect this loop's reset Physics state.
    if (wrapped) this.preview.seek(cursor); else this.preview.advanceTo(cursor);
    this.current = this.render(fired);
    this.running = running;
    return this.current;
  }
  private checkSeconds(value: number): void {
    if (!Number.isFinite(value) || value < 0) throw new RuntimeDataError('Time must be finite, nonnegative seconds.');
  }
  private configure(): void {
    this.preview.configure({setupBones: this.data.bones, setupConstraints: this.data.constraints, clip: this.clip, fps: this.data.fps, simulate: this.simulate});
  }
  private render(events: FiredEvent[]): RuntimeFrame {
    const frame = this.preview.animationFrame;
    const bones = withEvaluatedPose(this.preview.localBones, this.preview.frame.bones);
    let slots = projectSlotPoses(this.data.slots, sampleSlotPoses(this.data.slots, this.clip?.slotTracks ?? [], frame));
    slots = deformSlots(slots, sampleDeformPoses(slots, this.clip?.deformTracks ?? [], frame));
    slots = projectSequencePoses(slots, sampleSequencePoses(slots, this.clip?.sequenceTracks ?? [], frame, this.data.fps));
    slots = orderSlots(slots, sampleDrawOrder(slots, this.clip?.drawOrder ?? [], frame));
    return {time: frame / this.data.fps, frame, animation: this.clip?.name ?? null, bones, slots, events};
  }
}
