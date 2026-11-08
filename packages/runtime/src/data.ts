import {animationChannelDimensions, bezierTimeMonotone, type AnimationView} from '../../../src/domain/animation.ts';
import type {BoneView, ConstraintView, ProjectSummary, SlotView} from '../../../src/domain/project.ts';
import type {EventDefinition} from '../../../src/domain/animationEvents.ts';
import {validSequenceSettings, validSequenceWorkingPose, sequenceImageKey} from '../../../src/domain/animationSequence.ts';
import {worldBones} from '../../../src/domain/rig.ts';
import {bindingPoints} from '../../../src/domain/binding.ts';
import {sampleSlotDark} from '../../../src/domain/animationSlots.ts';
import {evaluate, PhysicsState} from '../../../src/domain/solve/index.ts';

/** Game exchange data. This is deliberately separate from binary .fbones projects. */
export interface RuntimeData {
  format: 'fbones-runtime';
  version: 1;
  fps: number;
  bones: BoneView[];
  slots: SlotView[];
  animations: AnimationView[];
  constraints: ConstraintView[];
  events: EventDefinition[];
}

export class RuntimeDataError extends Error {
  constructor(message: string) {super(`FBones runtime: ${message}`); this.name = 'RuntimeDataError';}
}
function fail(message: string): never {throw new RuntimeDataError(message);}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const id = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const channels = ['rotate','translate','translateX','translateY','scale','scaleX','scaleY','shear'];
const constraintChannels = ['ik','transformMix','physics','physicsReset'];

/** Resource keys are logical, relative PNG/WAV keys, never native paths or URLs. */
export function resourceKey(key: string): string {
  if (typeof key !== 'string' || !key || key.length > 4096 || key.includes('\\') || /[:\x00-\x1f\x7f?#]/.test(key) || key.split('/').some(part => !part || part === '.' || part === '..')) fail('Resource keys must be portable relative names.');
  return key;
}

function array(value: unknown, name: string, max = 65536): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`${name} is missing or exceeds its supported budget.`);
}
function ids(values: readonly {id: number}[], name: string): Set<number> {
  const result = new Set<number>();
  for (const value of values) {
    if (!object(value) || !id(value.id) || result.has(value.id)) fail(`${name} must have distinct nonnegative IDs.`);
    result.add(value.id);
  }
  return result;
}
function numbers(value: unknown, count: number, name: string): asserts value is number[] {
  if (!Array.isArray(value) || value.length !== count || value.some(n => !finite(n))) fail(`${name} must contain ${count} finite numbers.`);
}
function curves(keys: readonly {frame:number;curve?:string;controls?:unknown}[], dimensions: number, scalar = false) {
  keys.forEach((key, index) => {
    if (!['linear','stepped','bezier'].includes(key.curve ?? '')) fail('An unsupported interpolation curve was supplied.');
    if (key.curve !== 'bezier') return;
    const controls = scalar ? [key.controls] : key.controls;
    if (!Array.isArray(controls) || controls.length < dimensions) fail('Bézier controls are missing.');
    for (const lane of controls.slice(0, dimensions)) {
      numbers(lane, 4, 'Bézier lane');
      const next = keys[index + 1];
      if (next && !bezierTimeMonotone(key.frame, next.frame, lane[0]!, lane[2]!)) fail('A reversing Bézier time curve is unsupported.');
    }
  });
}
function keys(track: {keys: {id:number;frame:number}[]}, duration: number) {
  array(track.keys, 'Timeline keys', 262144);
  ids(track.keys, 'Timeline keys');
  let previous = -1;
  for (const key of track.keys) {
    if (!finite(key.frame) || key.frame < previous || key.frame < 0 || key.frame > duration) fail('Keys must be ordered and within animation duration.');
    previous = key.frame;
  }
}

/** Validate plain exported data before creating a player. Unknown timelines fail
 * rather than disappearing. No filesystem/network or original code is involved. */
export function parseRuntimeData(input: unknown): RuntimeData {
  try {return parseData(input);} catch (error) {
    if (error instanceof RuntimeDataError) throw error;
    throw new RuntimeDataError(error instanceof Error ? error.message : 'Invalid game-export data.');
  }
}
function parseData(input: unknown): RuntimeData {
  if (typeof input === 'string') {
    if (input.length > 32 * 1024 * 1024) fail('The game export exceeds the 32 MiB text budget.');
    try {input = JSON.parse(input);} catch {fail('The game export is invalid JSON.');}
  }
  // Plain JSON only; avoid cycles, undefined, getters/prototypes in the retained
  // data and reject nonfinite scalars before JSON can turn them into nulls.
  let count = 0;
  const inspect = (value: unknown, depth: number): void => {
    if (++count > 2_000_000 || depth > 40) fail('The game export exceeds the structural budget.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number') {if (!Number.isFinite(value)) fail('Nonfinite game data is unsupported.'); return;}
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) fail('Game export arrays must be plain JSON arrays.');
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (key === 'length') continue;
        if (descriptor.get || descriptor.set || !/^(0|[1-9][0-9]*)$/.test(key)) fail('Game export arrays must not contain accessors or named properties.');
        inspect(descriptor.value, depth + 1);
      }
      return;
    }
    if (!object(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('Game export must contain plain JSON data.');
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) fail('Game export must not contain accessors.');
      if (['__proto__','prototype','constructor','evaluatedWorld','animatedColor','animatedDarkColor'].includes(key)) fail('Transient or unsafe fields are not game-export data.');
      inspect(descriptor.value, depth + 1);
    }
  };
  inspect(input, 0);
  if (!object(input) || input.format !== 'fbones-runtime' || input.version !== 1) fail('Use a supported FBones game export (version 1), not a .fbones/.spine project.');
  const allowed = new Set(['format','version','fps','bones','slots','animations','constraints','events']);
  if (Object.keys(input).some(key => !allowed.has(key))) fail('Unknown game-export fields require a newer runtime.');
  for (const name of ['bones','slots','animations','constraints','events'] as const) array(input[name], name, name === 'bones' || name === 'slots' || name === 'constraints' ? 4096 : 65536);
  if (!finite(input.fps) || input.fps <= 0 || input.fps > 1000) fail('FPS must be finite and between 0 and 1000.');
  const data = structuredClone(input) as unknown as RuntimeData;
  const bones = ids(data.bones, 'Bones'), slots = ids(data.slots, 'Slots'), constraints = ids(data.constraints, 'Constraints'), events = ids(data.events, 'Events');
  if (!bones.size) fail('At least one bone is required.');
  for (const bone of data.bones) {
    if (typeof bone.name !== 'string' || ![bone.x,bone.y,bone.rotation,bone.length,bone.scaleX??1,bone.scaleY??1,bone.shearX??0,bone.shearY??0].every(finite) || bone.length < 0) fail('Invalid authored bone fields.');
    if ('inherit' in bone || 'transform' in bone) fail('Nondefault inheritance is outside this runtime profile.');
  }
  worldBones(data.bones); // Parent-before-child graph, no evaluated-matrix bypass.
  const attachments = new Map<number, number>();
  const images = new Set<string>();
  let sequenceFrames = 0;
  const image = (key: string) => {images.add(resourceKey(key)); if (images.size > 4096) fail('At most 4096 images are supported per game export.');};
  for (const slot of data.slots) {
    if (!bones.has(slot.bone) || !['normal','additive','multiply','screen'].includes(slot.blend) || typeof slot.visible !== 'boolean') fail('Invalid slot binding/blend/visibility.');
    array(slot.attachments, 'Attachment inventory');
    for (const attachment of slot.attachments) {
      if (!object(attachment) || !id(attachment.id) || attachments.has(attachment.id) || attachment.slot !== slot.id || !['region','mesh','clipping'].includes(attachment.type)) fail('Invalid attachment ownership/type.');
      attachments.set(attachment.id, slot.id);
      if (attachment.type === 'clipping' ? !attachment.clipping || attachment.region !== null || attachment.mesh !== null : !attachment.region || attachment.clipping !== null || (attachment.type === 'mesh') !== !!attachment.mesh) fail('Attachment geometry does not match its declared type.');
      if (attachment.region) {
        const region = attachment.region;
        if (!attachment.sequence) image(region.image);
        // Native Mesh DTO carries a texture reference with zero rectangle size;
        // its actual geometry is the dense binding/UVs, not a Region rectangle.
        if (![region.x,region.y,region.rotation,region.scaleX,region.scaleY,region.width,region.height].every(finite) || (attachment.type === 'region' ? region.width <= 0 || region.height <= 0 : region.width < 0 || region.height < 0)) fail('Invalid region geometry.');
      }
      const binding = attachment.mesh ?? attachment.clipping;
      if (binding) {
        array(binding.vertices, 'Binding vertices', 65536);
        array(binding.bones, 'Binding columns', 4096);
        if (binding.vertices.length < 3) fail('A mesh/mask needs at least three vertices.');
        bindingPoints(data.bones, binding);
        if (attachment.mesh) {
          numbers(attachment.mesh.uvs, binding.vertices.length * 2, 'Mesh UVs');
          const triangles = attachment.mesh.triangles;
          array(triangles, 'Mesh triangles', 393216);
          if (triangles.length % 3 || triangles.some(v => !id(v) || v >= binding.vertices.length)) fail('Invalid mesh triangle indices.');
        }
        if (attachment.clipping && (!slots.has(attachment.clipping.endSlot) || typeof attachment.clipping.convex !== 'boolean' || typeof attachment.clipping.inverse !== 'boolean')) fail('Invalid clipping range.');
      }
      if (attachment.sequence) {
        if (!attachment.region || !validSequenceSettings(attachment.sequence)) fail('Unsupported image sequence settings.');
        sequenceFrames += attachment.sequence.count;
        if (sequenceFrames > 65536) fail('The image sequence inventory exceeds its supported budget.');
        const base = resourceKey(attachment.region.imagePath || attachment.name);
        for (let index = 0; index < attachment.sequence.count; index++) image(sequenceImageKey(base, attachment.sequence, index));
      }
    }
    if (slot.activeAttachmentId !== null && (!id(slot.activeAttachmentId) || attachments.get(slot.activeAttachmentId) !== slot.id)) fail('The active attachment must belong to its slot.');
  }
  evaluate({bones: data.bones, constraints: data.constraints}, null, new PhysicsState(), {type: 'none'});
  const animationNames = new Set<string>();
  ids(data.animations, 'Animations');
  for (const clip of data.animations) {
    if (typeof clip.name !== 'string' || !clip.name || animationNames.has(clip.name)) fail('Animation names must be distinct and nonempty.');
    animationNames.add(clip.name);
    if (!finite(clip.duration) || clip.duration < 0 || clip.duration > 1_000_000) fail('Animation duration is out of range.');
    const allowedClip = new Set(['id','name','duration','tracks','splitModes','slotTracks','drawOrder','deformTracks','constraintTracks','eventTracks','sequenceTracks']);
    if (Object.keys(clip).some(key => !allowedClip.has(key))) fail('Unknown animation timelines require a newer runtime.');
    array(clip.tracks, 'Bone tracks');
    for (const name of ['slotTracks','drawOrder','deformTracks','constraintTracks','eventTracks','sequenceTracks'] as const) if (clip[name] !== undefined) array(clip[name], name);
    const trackIdentities = new Set<string>();
    const unique = (target: number, channel: string, kind: string) => {const key = `${kind}:${target}:${channel}`; if (trackIdentities.has(key)) fail('Duplicate timeline channel.'); trackIdentities.add(key);};
    for (const track of clip.tracks) {
      if (!bones.has(track.bone) || !channels.includes(track.channel)) fail('Unsupported bone timeline target/channel.');
      unique(track.bone, track.channel, 'bone'); keys(track, clip.duration);
      for (const key of track.keys) numbers(key.values, 2, 'Bone key');
      curves(track.keys, animationChannelDimensions(track.channel));
    }
    for (const bone of bones) for (const family of ['translate','scale']) {
      const own = clip.tracks.filter(track => track.bone === bone).map(track => track.channel as string);
      if (own.includes(family) && (own.includes(family + 'X') || own.includes(family + 'Y'))) fail('Combined and split channels cannot overlap for the same bone.');
    }
    for (const track of clip.slotTracks ?? []) {
      if (!slots.has(track.slot) || !['rgba','attachment'].includes(track.channel)) fail('Unsupported slot timeline target/channel.');
      unique(track.slot, track.channel, 'slot'); keys(track, clip.duration);
      if (track.channel === 'attachment') {
        for (const key of track.keys) if (key.attachment !== null && attachments.get(key.attachment) !== track.slot) fail('A keyed attachment must belong to its slot.');
      } else {
        for (const key of track.keys) {numbers(key.values, 4, 'RGBA key'); if (key.darkValues) numbers(key.darkValues, 3, 'Dark key');}
        curves(track.keys, 4);
        for (let i = 0; i + 1 < track.keys.length; i++) sampleSlotDark(track.keys, (track.keys[i]!.frame + track.keys[i + 1]!.frame) / 2);
      }
    }
    if (clip.drawOrder) {
      keys({keys: clip.drawOrder}, clip.duration);
      for (const key of clip.drawOrder) if (key.order !== null && (!Array.isArray(key.order) || key.order.length !== slots.size || new Set(key.order).size !== slots.size || key.order.some(s => !slots.has(s)))) fail('A draw order must contain every slot exactly once.');
    }
    for (const track of clip.deformTracks ?? []) {
      if (!attachments.has(track.attachment)) fail('Unknown deformation target.');
      const attachment = data.slots.flatMap(s => s.attachments!).find(a => a.id === track.attachment)!;
      const binding = attachment.mesh ?? attachment.clipping;
      if (!binding) fail('Only bound geometry can deform.');
      unique(track.attachment, '', 'deform'); keys(track, clip.duration); curves(track.keys, 1, true);
      const dimension = binding.vertices.reduce((sum, row) => sum + row.positions.length, 0);
      for (const key of track.keys) numbers(key.offsets, dimension, 'Deformation offsets');
    }
    for (const track of clip.constraintTracks ?? []) {
      if (!constraints.has(track.constraint) || !constraintChannels.includes(track.channel)) fail('Unsupported constraint timeline target/channel.');
      const constraint = data.constraints.find(c => c.id === track.constraint)!;
      if ((track.channel === 'ik' && constraint.type !== 'ik') || (track.channel === 'transformMix' && constraint.type !== 'transform') || (track.channel.startsWith('physics') && constraint.type !== 'physics')) fail('Constraint timeline type mismatch.');
      unique(track.constraint, track.channel + ('property' in track ? track.property : ''), 'constraint'); keys(track, clip.duration);
      if (track.channel === 'ik') curves(track.keys, 2);
      if (track.channel === 'transformMix') {curves(track.keys, 6); for (const key of track.keys) numbers(key.values, 6, 'Transform mix key');}
      if (track.channel === 'physics') {
        if (!['inertia','strength','damping','mass','wind','gravity','mix'].includes(track.property)) fail('Unsupported physics coefficient.');
        curves(track.keys, 1, true);
        for (const key of track.keys) if (!finite(key.value) || Math.abs(key.value) > 1_000_000 || track.property === 'mass' && key.value <= 0 || track.property === 'damping' && key.value < 0) fail('A physics coefficient key requires a finite valid value.');
      }
      if (track.channel === 'ik') for (const key of track.keys) if (![key.mix,key.softness].every(finite) || key.mix < 0 || key.mix > 1 || key.softness < 0 || [key.stretch,key.compress,key.bendPositive].some(value => typeof value !== 'boolean')) fail('Invalid IK key coefficients/flags.');
    }
    for (const track of clip.eventTracks ?? []) {
      if (!events.has(track.event)) fail('Unknown event target.'); unique(track.event, '', 'event'); keys(track, clip.duration);
      for (const key of track.keys) validateEventPayload(key);
    }
    for (const track of clip.sequenceTracks ?? []) {
      if (attachments.get(track.attachment) !== track.slot) fail('Unknown image sequence target.');
      const attachment = data.slots.flatMap(s => s.attachments!).find(a => a.id === track.attachment)!;
      if (!attachment.sequence) fail('Image sequence settings are missing.');
      unique(track.attachment, '', 'sequence'); keys(track, clip.duration);
      for (const key of track.keys) if (!validSequenceWorkingPose(attachment.sequence, key)) fail('Unsupported image sequence key.');
    }
  }
  for (const event of data.events) {
    validateEventPayload(event);
    if (typeof event.name !== 'string' || !event.name || typeof event.audio !== 'string') fail('Invalid event definition.');
    if (event.audio) resourceKey(event.audio);
  }
  return data;
}

function validateEventPayload(event: {int:number;float:number;string:string;volume:number;balance:number}): void {
  if (!Number.isInteger(event.int) || event.int < -2147483648 || event.int > 2147483647 || ![event.float,event.volume,event.balance].every(finite) || typeof event.string !== 'string' || event.volume < 0 || event.balance < -1 || event.balance > 1) fail('Invalid event payload.');
}

/** Helper for integrations which already hold a native-authored summary. Native
 * export owns filesystem/resource safety; this helper never saves projects. */
export function createRuntimeData(project: Pick<ProjectSummary,'bones'|'slots'|'constraints'|'animations'|'animationFps'|'events'|'inspectionOnly'>): RuntimeData {
  if (project.inspectionOnly) fail('Inspection-only projects cannot be exported as playable data.');
  const source = {format:'fbones-runtime',version:1,fps:project.animationFps??30,bones:project.bones.map(({evaluatedWorld:_,...bone})=>bone),slots:project.slots.map(({animatedColor:_,animatedDarkColor:__,...slot})=>slot),constraints:project.constraints??[],animations:project.animations??[],events:project.events??[]};
  // Omit absent optional fields without JSON's lossy conversion of -0 or NaN.
  // This helper consumes a typed native summary; the public parser owns bounds.
  function clean(value: unknown, depth = 0): unknown {
    if (depth > 40) fail('The game export exceeds the structural budget.');
    if (Array.isArray(value)) return value.map(child => clean(child, depth + 1));
    if (object(value)) return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined).map(([key, child]) => [key, clean(child, depth + 1)]));
    return value;
  }
  return parseRuntimeData(clean(source));
}
