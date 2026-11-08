import type {AnimationChannel,AnimationKeyInput,AnimationView} from './animation.ts';
import type {Rgba,Rgb,SlotAnimationKeyInput,SlotAnimationPose} from './animationSlots.ts';
import type {DeformKeyInput,DeformPose,DrawOrderKeyInput} from './animationGeometry.ts';
import type {ConstraintKeyInput,ConstraintPose} from './animationConstraints.ts';
import type {EventDefinition,EventKeyInput,EventPatch} from './animationEvents.ts';
import type {SequenceSettings,SequenceKeyInput} from './animationSequence.ts';
import type {ConstraintBatchField} from './constraintBatch.ts';
export interface BoneView {
  id: number; parent: number | null; name: string;
  x: number; y: number; rotation: number; length: number;
  scaleX?:number; scaleY?:number; shearX?:number; shearY?:number; color?:number;
  /** Transient renderer-only matrix. Native authoring/saving never consumes it. */
  evaluatedWorld?:Readonly<{x:number;y:number;a:number;b:number;c:number;d:number}>;
}
export type EvaluationMode='reset'|'update'|'pose'|'none'|'replay';
export interface ReplayLocalPose {x:number;y:number;rotation:number;scaleX:number;scaleY:number;shearX:number;shearY:number}
export interface ReplayMotion {initial:ReplayLocalPose[];changes:{tick:number;poses:ReplayLocalPose[]}[]}
export interface EvaluationSnapshot {
  revision:number;documentId:number;poseEpoch:number;time:number;mode:EvaluationMode;
  bones:{id:number;world:{x:number;y:number;a:number;b:number;c:number;d:number}}[];
  localBones?:BoneView[];
  animationId?:number|null;
  slotPose?:SlotAnimationPose[];
  drawOrder?:number[];
  deformPose?:DeformPose[];
  constraintPose?:ConstraintPose[];
  sequencePose?:{attachment:number;slot:number;index:number;image:string}[];
}
export interface RegionView {
  /** Authored override; empty falls back to the attachment name. */
  imagePath?:string;
  image: string; name: string; x: number; y: number; rotation: number;
  scaleX: number; scaleY: number; width: number; height: number;
}
export interface DenseBindingView {
  weighted: boolean;
  bones: number[]; vertices: { weights: number[]; positions: number[] }[];
}
export interface MeshView extends DenseBindingView {
  uvs: number[]; triangles: number[]; edges: number[]; hull: number;
}
export type EditorTool = 'select'|'pan'|'create'|'translate'|'rotate'|'scale'|'shear'|'pose'|'length';
export interface LibraryImage {key:string;width:number;height:number}
export interface LibraryView {root:string;images:LibraryImage[];warnings:string[]}
export interface AudioSound {key:string;channels:number;sampleRate:number;frames:number;duration:number;peak:number}
export interface AudioLibraryView {root:string;sounds:AudioSound[];warnings:string[]}
export type EditMode = 'bones' | 'images' | 'meshes' | 'weights' | 'clipping';
export interface TraceOptions {alphaThreshold:number;tolerance:number;spacing:number;inner:boolean;innerThreshold:number;innerTolerance:number;innerSpacing:number;maxVertices:number}
export interface TraceGeometry {uvs:number[];triangles:number[];edges:number[];hull:number;innerCount:number;filledHoles:number;bridgedIslands:number;usedTolerance:number;usedSpacing:number;budgetAdjusted:boolean}
export interface TracePreview {slotId:number;attachmentId?:number;poseEpoch?:number;expectedRevision:number;mesh:MeshView;geometry:TraceGeometry}
export interface ClippingDraft {
  slot:number;name:string;endSlot:number;convex:boolean;inverse:boolean;
  points:{x:number;y:number}[];documentId:number;revision:number;
}
export interface SlotView {
  id: number; name: string; bone: number; visible: boolean;
  color?:number;
  /** Transient sampled light color, never Setup/persistence input. */
  animatedColor?:Rgba;
  /** Slot black-end remap is independent from light/attachment tint. The stored
   * darkColor alpha is metadataFF; animatedDarkColor contains only RGB. */
  tintBlack?:boolean;
  darkColor?:number;
  animatedDarkColor?:Rgb;
  blend: SlotBlendMode;
  region: RegionView | null; imageAvailable: boolean; mesh?: MeshView | null;
  attachments?: AttachmentView[];
  activeAttachmentId?: number | null;
}
export type SlotBlendMode = 'normal'|'additive'|'multiply'|'screen';
export interface ClippingView extends DenseBindingView {
  endSlot:number;convex:boolean;inverse:boolean;color:number;edges:number[];
}
export interface AttachmentView {
  id:number;slot:number;name:string;type:'region'|'mesh'|'clipping';
  /** Setup attachment tint, independent of animated slot light RGBA. */
  color?:number;
  region:RegionView|null;mesh:MeshView|null;clipping:ClippingView|null;imageAvailable:boolean;
  sequence?:SequenceSettings|null;
  sequenceAvailableFrames?:number[];
}
export type TransformProperty = 'rotate'|'x'|'y'|'scaleX'|'scaleY'|'shearY';
export type TransformChannels = [number,number,number,number,number,number];
export interface TransformToView {property:TransformProperty;offset:number;max:number;scale:number}
export interface TransformFromView {property:TransformProperty;offset:number;to:TransformToView[]}
export interface IkConstraintInput {
  type:'ik';name:string;bones:number[];target:number;mix:number;softness:number;
  bendPositive:boolean;compress:boolean;stretch:boolean;
}
export interface TransformConstraintInput {
  type:'transform';name:string;source:number;bones:number[];localSource:boolean;localTarget:boolean;
  additive:boolean;clamp:boolean;offsets:TransformChannels;mix:TransformChannels;properties:TransformFromView[];
}
export interface PhysicsConstraintInput {
  type:'physics';name:string;bone:number;x:number;y:number;scaleX:number;rotate:number|null;shearX:number;
  step:number;inertia:number;strength:number;damping:number;mass:number;wind:number;gravity:number;mix:number;limit:number;
  globals:{inertia:boolean;strength:boolean;damping:boolean;mass:boolean;wind:boolean;gravity:boolean;mix:boolean};
}
export type ConstraintInput = IkConstraintInput|TransformConstraintInput|PhysicsConstraintInput;
export interface TransformConstraintView extends TransformConstraintInput {
  /** Read-only native IEEE754 bits. Four nullable cells per Rotate/X/Y/ScaleX/ScaleY/ShearY row.
   * These are editor values, independent from runtime mapping fields; never echo them as input. */
  readonly editorRangeBits?:readonly (number|null)[];
  /** Read-only authoritative derived endpoints, in the same24-cell order. */
  readonly editorRangeValues?:readonly number[]|null;
}
export type ConstraintView = (IkConstraintInput|TransformConstraintView|PhysicsConstraintInput) & {id:number;order:number};
/** Ephemeral Auto scope. Bone references are stable session IDs, not columns. */
export interface AutoWeightScope {
  vertices?:number[];
  bones?:number[];
  lockedBones?:number[];
}
export type RigEdit =
  | {type:'createAnimation';name:string}
  | {type:'renameAnimation';id:number;name:string}
  | {type:'deleteAnimation';id:number}
  | {type:'duplicateAnimation';id:number;name:string}
  | {type:'setAnimationFps';fps:number}
  | ({type:'setAnimationKey';animation:number}&AnimationKeyInput)
  | {type:'setAnimationKeys';animation:number;keys:AnimationKeyInput[]}
  | {type:'setAnimationSlotKeys';animation:number;keys:SlotAnimationKeyInput[]}
  | {type:'setAnimationKeyBatch';animation:number;boneKeys:AnimationKeyInput[];slotKeys:SlotAnimationKeyInput[];drawOrderKeys?:DrawOrderKeyInput[];deformKeys?:DeformKeyInput[];constraintKeys?:ConstraintKeyInput[];eventKeys?:EventKeyInput[];sequenceKeys?:SequenceKeyInput[]}
  | {type:'setAttachmentSequence';id:number;sequence:SequenceSettings|null}
  | {type:'setAttachmentColor';id:number;color:number}
  | {type:'setAnimationSequenceKeys';animation:number;keys:SequenceKeyInput[]}
  | {type:'setAnimationConstraintKeys';animation:number;keys:ConstraintKeyInput[]}
  | {type:'setAnimationEventKeys';animation:number;keys:EventKeyInput[]}
  | {type:'createEvent';name:string}
  | {type:'renameEvent';id:number;name:string}
  | ({type:'updateEvent';id:number}&EventPatch)
  | {type:'deleteEvent';id:number}
  | {type:'setAnimationDrawOrderKeys';animation:number;keys:DrawOrderKeyInput[]}
  | {type:'setAnimationDeformKeys';animation:number;keys:DeformKeyInput[]}
  | {type:'setAnimationDeformVertices';animation:number;attachment:number;frame:number;vertices:{vertex:number;x:number;y:number}[];curve?:'linear'|'stepped'|'bezier';controls?:[number,number,number,number]}
  | {type:'deleteAnimationKeys';animation:number;keys:number[]}
  | {type:'moveAnimationKeys';animation:number;keys:number[];deltaFrames:number}
  | { type: 'create'; parent: number; x: number; y: number; rotation: number; length: number; color?:number }
  | { type: 'update'; id: number; name: string; x: number; y: number; rotation: number; length: number; scaleX?:number;scaleY?:number;shearX?:number;shearY?:number }
  | { type: 'move' | 'tip' | 'length'; id: number; x: number; y: number }
  | {type:'transformBones';ids:number[];mode:'translate'|'rotate'|'scale'|'shear'|'pose';individual?:boolean;localAxes?:boolean;pivotX:number;pivotY:number;dx:number;dy:number;rotation:number;scaleX:number;scaleY:number;shearX:number;shearY:number}
  | {type:'setBoneColors';colors:{id:number;color:number}[]}
  | {type:'setBoneColor'|'setSlotColor';id:number;color:number}
  | {type:'setSlotDarkColor';id:number;enabled:boolean;color:number}
  | {type:'setSlotBlend';id:number;blend:SlotBlendMode}
  | {type:'createSlot';bone:number;name?:string}
  | {type:'setActiveAttachment';slot:number;attachment:number|null}
  | {type:'renameAttachment';id:number;name:string}
  | {type:'moveAttachment';id:number;slot:number}
  | {type:'deleteAttachment';id:number}
  | {type:'updateAttachment';id:number;x:number;y:number;rotation:number;scaleX:number;scaleY:number}
  | {type:'setAttachmentImagePath';id:number;path:string}
  | {type:'transformAttachments';ids:number[];mode:'translate'|'rotate'|'scale';pivotX:number;pivotY:number;dx:number;dy:number;rotation:number;scaleX:number;scaleY:number}
  | {type:'attachmentEdit';id:number;edit:RigEdit}
  | {type:'createClipping';slot:number;name:string;endSlot:number;vertices:{x:number;y:number}[];convex?:boolean;inverse?:boolean}
  | {type:'setClipping';id:number;endSlot:number;convex:boolean;inverse:boolean;color:number}
  | {type:'moveClippingVertices';id:number;vertices:{vertex:number;x:number;y:number}[]}
  | {type:'insertClippingVertex';id:number;index:number;point:{x:number;y:number}}
  | {type:'deleteClippingVertex';id:number;vertex:number}
  | {type:'bindAttachment';id:number;bones:number[]}
  | {type:'setAttachmentWeight';id:number;vertex:number;bone:number;value:number;lockedBones?:number[]}
  | {type:'paintAttachmentWeights';id:number;bone:number;changes:{vertex:number;value:number}[];lockedBones?:number[]}
  | {type:'normalizeAttachmentWeights';id:number;lockedBones?:number[]}
  | {type:'autoAttachmentWeights';id:number;scope?:AutoWeightScope}
  | {type:'addConstraint';constraint:ConstraintInput}
  | {type:'addPhysicsToBones';bones:number[]}
  | {type:'updateConstraint';id:number;constraint:ConstraintInput}
  | {type:'patchConstraints';ids:number[];field:ConstraintBatchField;value:number|boolean|{bits:number}}
  | {type:'matchTransform';id:number;section:'offsets'|'properties'}
  | {type:'setTransformRange';id:number;index:number;bits:number|null}
  | {type:'deleteConstraint';id:number}
  | {type:'reorderConstraint';id:number;index:number}
  | {type:'setImagesRoot';path:string}
  | {type:'meshStroke';id:number;from:number|null;points:{x:number;y:number}[];editUvs:boolean}
  | { type: 'reparent'; id: number; parent: number }
  | {type:'reparentSelection';bones?:number[];attachments?:number[];parent:number}
  | { type: 'delete'; id: number }
  | { type: 'updateSlot'; id: number; name: string; bone: number; visible: boolean; x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  | { type: 'reorderSlot'; id: number; index: number }
  | { type: 'deleteSlot'; id: number }
  | { type: 'convertMesh' | 'triangulateMesh' | 'resetMesh' | 'autoWeights' | 'normalizeWeights'; id: number }
  | { type: 'moveMesh'; id: number; dx: number; dy: number }
  | { type: 'moveVertex'; id: number; vertex: number; x: number; y: number }
  | { type: 'moveVertices'; id: number; vertices: { vertex: number; x: number; y: number }[]; editUvs?:boolean }
  | { type: 'paintWeights'; id: number; bone: number; changes: { vertex: number; value: number }[] }
  | { type: 'addVertex'; id: number; x: number; y: number; edgeA: number | null; edgeB: number | null }
  | { type: 'deleteVertex'; id: number; vertex: number }
  | { type: 'meshEdge'; id: number; a: number; b: number; remove: boolean }
  | { type: 'bindMesh'; id: number; bones: number[] }
  | { type: 'setWeight'; id: number; vertex: number; bone: number; value: number }
  | { type: 'undo' | 'redo' };

export interface ProjectSummary {
  name: string;
  path: string | null;
  dirty: boolean;
  inspectionOnly: boolean;
  canSave: boolean;
  canCopy: boolean;
  version: string;
  compressedBytes: number | null;
  decodedBytes: number | null;
  boneCount: number | null;
  bones: BoneView[];
  revision: number;
  canUndo: boolean;
  canRedo: boolean;
  editedBone: number | null;
  documentId: number;
  /** Logical open document; resource documentId still guards images/evaluation. */
  logicalDocumentId?:number;
  slots: SlotView[];
  editedSlot: number | null;
  editedVertex?: number | null;
  library?:LibraryView;
  sceneEditing?:boolean;
  editedAttachment?:number|null;
  constraints?:ConstraintView[];
  animations?:AnimationView[];
  animationChannels?:AnimationChannel[];
  animationFps?:number;
  editedAnimation?:number|null;
  events?:EventDefinition[];
  audioRoot?:string;
  audioLibrary?:AudioLibraryView;
  editedEvent?:number|null;
}

export function validProjectName(name: string): boolean {
  const value = name.trim();
  return value.length > 0 && [...value].length <= 120
    && !/[\p{Cc}/\\:*?"<>|]/u.test(value) && !value.endsWith('.')
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value);
}

export function draftSummary(name: string): ProjectSummary {
  return {
    name: name.trim(), path: null, dirty: true, inspectionOnly: false,
    canSave: true, canCopy: true, version: '4.3.26',
    compressedBytes: null, decodedBytes: null, boneCount: 1,
    bones: [{ id: 0, parent: null, name: 'root', x: 0, y: 0, rotation: 0, length: 0 }],
    revision: 0, canUndo: false, canRedo: false, editedBone: 0, documentId: 0, slots: [], editedSlot: null,
  };
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return typeof error === 'string' ? error : 'The operation could not be completed.';
}
