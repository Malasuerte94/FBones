// Install static Pixi shader/uniform implementations under the strict CSP.
import 'pixi.js/unsafe-eval';
import { Application, Graphics } from 'pixi.js';
import { ImageLayer, type AnimateWeightInspection } from './ImageLayer.ts';
import {GhostingLayer,type ViewportGhosting} from './GhostingLayer.ts';
import { meshPoints, nearestVertex, nearestEdge, previewVertices, previewWeights, withMesh, falloff } from '../domain/meshes.ts';
import { isolatedMeshSlot, meshDisplayClip, type MeshDisplay } from '../domain/meshDisplay.ts';
import { meshOutlineUv, meshOutlineWorldPoints } from '../domain/meshOutline.ts';
import { previewMeshEdit } from '../domain/meshEdit.ts';
import { imageAt, movedImage, worldRegions } from '../domain/images.ts';
import type { AttachmentView, BoneView, ClippingDraft, MeshOutlineDraft, RigEdit, SlotView, EditMode, DenseBindingView, TracePreview } from '../domain/project.ts';
import {bindingPoints,previewBindingVertices,previewBindingWeights,boundaryEdges,bindingNeighbors,nearestBindingEdge} from '../domain/binding.ts';
import { creation, previewEdit, previewTransformBones, segmentDistance, worldBones } from '../domain/rig.ts';
import type {TimelineAdjustState, TimelineAdjustTarget} from '../domain/timelineAdjust.ts';
import {localTranslationDisplacement,previewCompensatedTranslation,type CompensationOptions,type LocalTranslationAxes} from '../domain/boneCompensation.ts';
import {previewCompensatedRotation,previewCompensatedScale,previewCompensatedShear} from '../domain/boneRotationCompensation.ts';
import { parseImageDropKeys } from '../domain/imageSelection.ts';
import {boneHighlightStyle} from '../domain/boneHover.ts';
import {weightInfluenceColor} from '../domain/colors.ts';
import {selectedWeightHitRadius, type WeightDisplay} from './WeightPies.ts';
import {drawViewportBackdrop} from './viewportBackdrop.ts';
import { TransformGizmo } from './GizmoOverlay.ts';
import {activeAttachment,clippingPoints,clippingPolygon,clippingScopes,polygonContains} from '../domain/clipping.ts';
import {previewAttachmentTransform,previewAttachmentBinding,previewRegionPosition,renderedAttachmentId,resolveAttachment,
  selectedAttachmentGeometry,sceneImagesInBox,snapRegionTranslation,type RegionSnapTarget} from '../domain/sceneSelection.ts';
import {nameTagAnchors,type ViewportNameTag,type ViewportNameTagFrame,type ViewportNameTagLayer} from './nameTags.ts';
import { angleDelta, gizmoCursor, gizmoDelta, hitGizmo, localTranslationDelta, localTranslationScreenBasis, parentTranslationDelta, pointerAngle, scaleBasis, selectedTopBones, transformPivot,
  type GizmoBasis, type GizmoHandle, type GizmoTool, type ParentTranslation, type PivotMode } from './transformGizmo.ts';

export type ViewportTool = 'select' | 'pan' | 'create' | 'translate' | 'rotate' | 'scale' | 'shear' | 'pose' | 'length';
export const VIEWPORT_MIN_ZOOM_PERCENT = 10;
export const VIEWPORT_MAX_ZOOM_PERCENT = 800;
const FIT_MARGIN = 24;
const OUTLINE_POINT_RADIUS = 10;
const DRAG_THRESHOLD = 3;
export interface ViewportRulerFrame {
  readonly camera: Readonly<{width: number; height: number; originX: number; originY: number; zoom: number}>;
  readonly pointer: Readonly<{x: number; y: number; worldX: number; worldY: number}> | null;
}
export interface ViewportScene {
  ghosting?: ViewportGhosting;
  timelineAdjust?: TimelineAdjustState;
  bones: BoneView[]; selected: number | null; selectedBones?: number[]; tool: ViewportTool;
  authoredBones?:BoneView[];hasConstraints?:boolean;requiresBonePose?:boolean;poseKey?:string;
  boneColors?: Record<number,number>; imageKeys?: string[];
  hoveredBone?:number|null;
  parentPicking?:boolean;
  sceneEditing?:boolean;selectedAttachments?:number[];inspectedAttachment?:AttachmentView|null;clippingDraft?:ClippingDraft|null;
  snapRegionPixels?:boolean;
  compensation?:CompensationOptions;
  parentTranslation?:ParentTranslation;
  localTranslation?:LocalTranslationAxes;
  localTranslationUnavailable?:boolean;
  innerTrace?:TracePreview;
  meshDisplay?:MeshDisplay;
  meshWireframeAttachments?:ReadonlySet<number>;
  meshOutline?:MeshOutlineDraft|null;
  meshOutlineBusy?:boolean;
  previousToolSwap?:boolean;
  editable: boolean; busy: boolean; revision: number;
  slots?: SlotView[]; selectedSlot?: number | null; documentId?: number; mode?: EditMode; selectedVertex?: number | null; selectedVertices?:number[]; selectedInfluences?:number[]; lockedInfluences?:number[]; influence?: number | null;
  weightDisplay?: WeightDisplay;
  meshTool?: 'move' | 'add' | 'edge' | 'removeEdge' | 'draw' | 'delete'; meshEditUvs?:boolean; softSelection?: boolean; softSize?: number; softFeather?: number;
  brushMode?: 'direct' | 'add' | 'subtract' | 'replace' | 'smooth'; brushSize?: number; brushStrength?: number; brushFeather?: number;
}
export type ViewportSelectionPhase = 'preview' | 'complete';

interface Options {
  onSelect(id: number | null): void;
  onPickParent?(id:number):void;
  onSelectBones?(ids: number[], active: number | null, phase?: ViewportSelectionPhase): void;
  onHoverBone?(id:number|null):void;
  onClearHover?():void;
  onEscape?(event: KeyboardEvent): void;
  onVisitSceneSelectionHistory?(direction: -1 | 1): boolean;
  onPreviousToolSwap?():void;
  onDropImage?(key: string, x: number, y: number): Promise<boolean>;
  onDropImages?(keys: string[], x: number, y: number): Promise<boolean>;
  pivotMode?(): PivotMode;
  onSelectVertex?(index: number | null): void;
  onSelectVertices?(indices:number[],active:number|null,replaceOrder?:boolean):void;
  onSelectSlot?(id: number | null): void;
  onSelectAttachments?(ids:number[],active:number|null,phase?:ViewportSelectionPhase):void;
  onClippingPoint?(point:Point):void;
  onFinishClipping?():void;
  onMeshOutlinePoint?(uv:[number,number]):void;
  onFinishMeshOutline?(draft:MeshOutlineDraft):void;
  onMoveMeshOutlinePoint?(draft:MeshOutlineDraft,index:number,uv:[number,number]):void;
  onRemoveMeshOutlinePoint?(draft:MeshOutlineDraft,index:number):void;
  onMeshOutlinePointGesture?(active:boolean):void;
  onPrepareGeometry?(revision:number):Promise<{bones:BoneView[];poseEpoch?:number}>;
  onEndGeometry?():void;
  onPrepareAdjustment?(target:TimelineAdjustTarget,poseEpoch:number):ViewportAdjustment|null;
  onAdjustmentDragging?(dragging:boolean):void;
  onPauseSimulation?():void;
  onEndBonePreview?():void;
  previewBones?(bones:BoneView[]):BoneView[];
  onRulerFrame?(frame: ViewportRulerFrame): void;
  onNameTagFrame?(frame: ViewportNameTagFrame): void;
  loadImage?(documentId: number, name: string): Promise<string>;
  onImageError?(message: string): void;
  onCommit(edit: RigEdit, revision: number,poseEpoch?:number,compensationApplied?:CompensationOptions): Promise<boolean>;
}
export interface ViewportController {
  capture():Promise<{dataUrl:string;width:number;height:number;zoom:number;panX:number;panY:number}>;
  interactionActive(): boolean;
  setGrid(visible: boolean): void;
  setRulersVisible(visible: boolean): void;
  setLayerVisibility(visibility: {bones: boolean; images: boolean; others: boolean}): void;
  setLayerSelection(selection: {bones: boolean; images: boolean; others: boolean}): void;
  setNameTags(layers: Readonly<Record<ViewportNameTagLayer, boolean>>): void;
  setAnimateWeightInspection(inspection:AnimateWeightInspection|null):void;
  canSelectNameTag(tag: ViewportNameTag, documentId: number): boolean;
  wheelZoom(event: WheelEvent): void;
  panFromNameTag(event: PointerEvent): void;
  setScene(scene: ViewportScene): void;
  setZoom(percent: number): boolean;
  fit(): boolean;
  reset(): void; resize(): void; destroy(): void;
}
interface Point { x: number; y: number }
type BoneTransform = Extract<RigEdit,{type:'transformBones'}>;
type AdjustmentFeedback = Partial<Pick<BoneTransform,'dx'|'dy'|'scaleX'|'scaleY'|'shearX'|'shearY'>>;
interface ViewportAdjustment {
  preview(edit:BoneTransform):{bones:BoneView[];feedback?:AdjustmentFeedback};
  commit(edit:BoneTransform):Promise<boolean>;
}
interface OutlinePointGesture {
  draft: MeshOutlineDraft;
  index: number;
  offset: Point;
  shift: boolean;
  plain: boolean;
  previewUv?: [number,number] | null;
}
const attachmentSelectionKey=(ids:readonly number[]|undefined)=>[...new Set(ids??[])].sort((a,b)=>a-b).join(',');
interface Gesture {
  id: number; kind: 'pan' | 'move' | 'tip' | 'create' | 'slot' | 'vertex' | 'weights' | 'transform' | 'length' | 'box' | 'draw'|'imageBox'|'attachments'|'attachmentPivot'|'clipVertex'|'weightBox'|'outlinePoint'; start: Point; last: Point;
  bone: number; origin: Point; revision: number; base: BoneView[]; changed: boolean; slot?: SlotView; vertex?: number; coverage?: number[]; invalid?:boolean; errorReported?:boolean; ids?:number[]; transformMode?:'translate'|'rotate'|'scale'|'shear'|'pose'; pivot?:Point; pickParent?:boolean; additive?:boolean; fromVertex?:number|null;
  handle?: GizmoHandle; screenPivot?: Point; rotationPrevious?: number; rotationStart?: number; rotationTotal?: number; individual?: boolean;
  basis?:GizmoBasis;
  parentTranslation?:ParentTranslation;
  localTranslation?:LocalTranslationAxes;
  clip?:AttachmentView;slots?:SlotView[];
  weightVertices?:number[];weightLocks?:number[];binding?:DenseBindingView;weightAttachment?:number;weightBone?:number;weightNeighbors?:number[][];
  brush?:{mode:'direct'|'add'|'subtract'|'replace'|'smooth';strength:number;size:number;feather:number;directGain:number};
  previousAttachmentPivot?:Point|null;
  poseEpoch?:number;
  adjustment?:ViewportAdjustment;
  adjustmentFeedback?:AdjustmentFeedback;
  regionSnap?:RegionSnapTarget;
  regionSnapFeedback?:{dx:number;dy:number};
  compensation?:CompensationOptions;
  compensationApplied?:CompensationOptions;
  outlinePoint?:OutlinePointGesture;
  previousToolClick?:{eligible:boolean};
}

export async function createViewport(host: HTMLElement, onZoom: (zoom: number) => void, options?: Options): Promise<ViewportController> {
  const app = new Application();
  await app.init({ preference: 'webgl', background: 0x000000, backgroundAlpha: 0, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 3), autoDensity: true,
    autoStart: false, width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) });
  const canvas = app.canvas;
  canvas.tabIndex = 0;
  canvas.style.display = 'block'; canvas.style.touchAction = 'none'; host.appendChild(canvas);
  const backdropGraphics=new Graphics(),gridGraphics = new Graphics(), bonesGraphics = new Graphics();
  let resourceEpoch=0;
  const imageLayer = options?.loadImage ? new ImageLayer(options.loadImage, () => {resourceEpoch++;draw();}, options.onImageError) : null;
  const ghostLayer = new GhostingLayer(imageLayer);
  app.stage.addChild(backdropGraphics,gridGraphics,ghostLayer.container);
  if (imageLayer) app.stage.addChild(imageLayer.container, imageLayer.guides);
  app.stage.addChild(bonesGraphics);
  const transformGizmo = new TransformGizmo();
  app.stage.addChild(transformGizmo.container);
  let zoom = 1, panX = 0, panY = 0, grid = true, destroyed = false, space = false;
  let layerVisibility = {bones: true, images: true, others: true};
  let layerSelection = {bones: true, images: true, others: true};
  let nameTagLayers = {bones: false, images: false, others: false};
  let animateWeightInspection:AnimateWeightInspection|null=null;
  let nameTagRequest: number | null = null;
  let nameTagPoses: ReturnType<typeof worldBones> = [];
  let backdropWidth=-1,backdropHeight=-1;
  let scene: ViewportScene = { bones: [], selected: null, tool: 'select', editable: false, busy: false, revision: 0 };
  let gesture: Gesture | null = null, preview: BoneView[] | null = null, pending = false;
  let previewAuthored:BoneView[]|null=null;
  let preparation=0,preparingPointer:number|null=null,preparedPose:{revision:number;documentId:number|undefined;poseEpoch?:number}|null=null;
  let previewSlots: SlotView[] | null = null;
  // Session-only origin. It is never a saved attachment transform or history edit.
  let attachmentPivot:Point|null=null;
  let edgeStart: number | null = null, hover:Point|null=null;
  let outlineTap:{draft:MeshOutlineDraft;index:number;repeated:boolean}|null=null;
  let viewportHoveredBone:number|null=null;
  function reportBoneHover(id:number|null){if(id===viewportHoveredBone)return false;viewportHoveredBone=id;options?.onHoverBone?.(id);return true;}
  let pivotMode: PivotMode = options?.pivotMode?.() ?? 'individual';
  const screen = (x: number, y: number): Point => ({ x: app.screen.width / 2 + panX + x * zoom, y: app.screen.height / 2 + panY - y * zoom });
  const world = (point: Point): Point => ({ x: (point.x - app.screen.width / 2 - panX) / zoom, y: (app.screen.height / 2 + panY - point.y) / zoom });
  const point = (event: Pick<PointerEvent,'clientX'|'clientY'>): Point => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  function displayedSlots(slots: readonly SlotView[]) {
    const isolated = isolatedMeshSlot(slots, scene.meshDisplay);
    return isolated ? [isolated] : slots;
  }
  function cancelNameTagFrame() {
    if (nameTagRequest !== null) cancelAnimationFrame(nameTagRequest);
    nameTagRequest = null;
  }
  function queueNameTagFrame() {
    const publish = options?.onNameTagFrame;
    if (!publish || nameTagRequest !== null || destroyed || scene.meshOutline || scene.meshOutlineBusy ||
      !(nameTagLayers.bones || nameTagLayers.images || nameTagLayers.others)) return;
    nameTagRequest = requestAnimationFrame(() => {
      nameTagRequest = null;
      const documentId = scene.documentId;
      if (destroyed || documentId === undefined || documentId < 0 || scene.meshOutline || scene.meshOutlineBusy) return;
      const {width, height} = app.screen;
      const tags = nameTagAnchors(nameTagPoses, preview ?? scene.bones, displayedSlots(previewSlots ?? scene.slots ?? []),
        nameTagLayers, scene.selectedSlot == null ? scene.selectedBones ?? [] : [], scene.selectedAttachments ?? [], screen);
      publish({documentId, width, height, tags});
    });
  }
  function canSelectNameTag(tag: ViewportNameTag, documentId: number) {
    if (destroyed || scene.documentId !== documentId || !nameTagLayers[tag.layer] || !layerSelection[tag.layer] ||
      gesture || pending || preparingPointer !== null || scene.busy || space || scene.tool === 'pan' ||
      scene.parentPicking || ownsDraftPose()) return false;
    if (tag.layer === 'bones') return scene.bones.some(bone => bone.id === tag.id);
    return displayedSlots(scene.slots ?? []).some(slot => renderedAttachmentId(slot) === tag.id &&
      (tag.layer === 'others' ? !!activeAttachment(slot)?.clipping : slot.visible && !!slot.region));
  }
  let rulersVisible = false, rulerRequest: number | null = null;
  let rulerClientPoint: {clientX: number; clientY: number} | null = null;
  let rulerFrame: ViewportRulerFrame | null = null;
  function queueRulerFrame() {
    const publish = options?.onRulerFrame;
    if (!rulersVisible || destroyed || !publish || rulerRequest !== null) return;
    rulerRequest = requestAnimationFrame(() => {
      rulerRequest = null;
      if (!rulersVisible || destroyed) return;
      const {width, height} = app.screen;
      const {x: originX, y: originY} = screen(0, 0);
      const priorCamera = rulerFrame?.camera;
      const camera = priorCamera && priorCamera.width === width && priorCamera.height === height &&
        priorCamera.originX === originX && priorCamera.originY === originY && priorCamera.zoom === zoom
        ? priorCamera : {width, height, originX, originY, zoom};
      let pointer: ViewportRulerFrame['pointer'] = null;
      if (rulerClientPoint) {
        const position = point(rulerClientPoint);
        if (position.x >= 0 && position.x < width && position.y >= 0 && position.y < height) {
          const location = world(position);
          pointer = {...position, worldX: location.x, worldY: location.y};
        }
      }
      const priorPointer = rulerFrame?.pointer;
      if (camera === priorCamera && (pointer === priorPointer || (pointer && priorPointer &&
        pointer.x === priorPointer.x && pointer.y === priorPointer.y &&
        pointer.worldX === priorPointer.worldX && pointer.worldY === priorPointer.worldY))) return;
      rulerFrame = {camera, pointer};
      publish(rulerFrame);
    });
  }
  function cancelRulerFrame() {
    if (rulerRequest !== null) cancelAnimationFrame(rulerRequest);
    rulerRequest = null;
  }
  function trackRulerPointer(event: Pick<PointerEvent, 'clientX' | 'clientY'>) {
    if (!options?.onRulerFrame) return;
    rulerClientPoint ??= {clientX: 0, clientY: 0};
    rulerClientPoint.clientX = event.clientX;
    rulerClientPoint.clientY = event.clientY;
    queueRulerFrame();
  }
  function clearRulerPointer() {
    rulerClientPoint = null;
    queueRulerFrame();
  }
  const cursor = () => {
    if(gesture?.kind==='pan'&&(!gesture.previousToolClick||gesture.changed)){canvas.style.cursor='grabbing';return;}
    if(scene.parentPicking){canvas.style.cursor='crosshair';return;}
    if(space){canvas.style.cursor='grab';return;}
    if(scene.meshOutline||scene.meshOutlineBusy){
      const draft=scene.meshOutline;
      if(scene.meshOutlineBusy||scene.busy)canvas.style.cursor='wait';
      else if(gesture?.outlinePoint)canvas.style.cursor='grabbing';
      else if(hover&&draft&&outlineUvAt(draft,scene.bones,hover)){
        const hit=nearestVertex(outlineScreenPoints(draft,scene.bones),hover,OUTLINE_POINT_RADIUS);
        canvas.style.cursor=hit===null?'crosshair':hit===0&&draft.points.length>=3?'pointer':'grab';
      }
      else canvas.style.cursor='default';
      return;
    }
    if(scene.tool==='pan'){canvas.style.cursor='grab';return;}
    if(gesture?.kind==='attachmentPivot'){canvas.style.cursor='grabbing';return;}
    if(scene.tool==='create'&&scene.editable){canvas.style.cursor='crosshair';return;}
    if(gesture?.handle){canvas.style.cursor=gesture.handle==='rotate'?'grabbing':gizmoCursor(gesture.handle,gesture.basis);return;}
    const imageState=imageGizmoState();
    if(imageState&&hover){
      canvas.style.cursor=atAttachmentPivot(imageState,hover)?'move':gizmoCursor(hitGizmo(imageState.tool,imageState.screenOrigin,hover));return;
    }
    const state=gizmoState();
    const hit=hover?selectableBoneAt(hover):null;
    const handle=state&&hover&&(!hit||state.ids.includes(hit.id))?hitGizmo(state.tool,state.screenOrigin,hover,state.basis):null;
    canvas.style.cursor=gizmoCursor(handle,state?.basis);
  };
  function gizmoState(bones:BoneView[]=preview??scene.bones) {
    if(!scene.editable||scene.selected===null||(scene.mode&&scene.mode!=='bones')||!['translate','rotate','scale','shear','pose'].includes(scene.tool))return null;
    const ids=selectedBones(),mode=scene.tool==='rotate'?pivotMode:'individual';
    const origin=transformPivot(bones,ids,scene.selected,mode);
    const parentTranslation=activeParentTranslation(ids,scene.selected);
    const localTranslation=parentTranslation?undefined:activeLocalTranslation(ids,scene.selected);
    if(scene.tool==='translate'&&(scene.localTranslationUnavailable||(scene.localTranslation&&!localTranslation&&!parentTranslation)))return null;
    const basis=scene.tool==='scale'?scaleBasis(bones,ids,scene.selected):localTranslation?localTranslationScreenBasis(localTranslation):parentTranslation?.basis;
    if(scene.tool==='scale'&&!basis)return null;
    const translationSpace:'Local'|'Parent'|undefined=localTranslation?'Local':parentTranslation?'Parent':undefined;
    return origin?{tool:scene.tool as GizmoTool,origin,screenOrigin:screen(origin.x,origin.y),ids,mode,basis:basis??undefined,translationSpace}:null;
  }
  function activeParentTranslation(ids:readonly number[],boneId:number) {
    const parent=scene.parentTranslation;
    return scene.tool==='translate'&&ids.length===1&&ids[0]===boneId&&parent?.boneId===boneId?parent:undefined;
  }
  function activeLocalTranslation(ids:readonly number[],boneId:number) {
    const local=scene.localTranslation;
    return scene.tool==='translate'&&ids.length===1&&ids[0]===boneId&&local?.boneId===boneId?local:undefined;
  }
  function boneGestureDelta(g:Gesture,handle:GizmoHandle,pivot:Point,current:Point) {
    const delta=gizmoDelta(handle,pivot,g.start,current,zoom,g.rotationTotal??0,g.basis);
    const projected=g.localTranslation?localTranslationDelta(g.localTranslation,handle,g.start,current,zoom):
      g.parentTranslation?parentTranslationDelta(g.parentTranslation,handle,g.start,current,zoom):null;
    return projected?{...delta,dx:projected.x,dy:projected.y}:delta;
  }
  function imageGizmoState(){
    if(!scene.editable||scene.mode!=='images'||!scene.selectedAttachments?.length||!['translate','rotate','scale'].includes(scene.tool))return null;
    const geometry=selectedAttachmentGeometry(preview??scene.bones,previewSlots??scene.slots??[],scene.selectedAttachments,scene.inspectedAttachment);
    const ids=geometry.map(item=>item.attachment.id),points=geometry.flatMap(item=>item.points);
    if(!points.length)return null;
    const origin=attachmentPivot??{x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length};
    return {origin,screenOrigin:screen(origin.x,origin.y),tool:scene.tool as 'translate'|'rotate'|'scale',ids,points};
  }
  function atAttachmentPivot(state:NonNullable<ReturnType<typeof imageGizmoState>>,p:Point){
    return state.tool!=='translate'&&Math.hypot(p.x-state.screenOrigin.x,p.y-state.screenOrigin.y)<=8;
  }
  function moveAttachmentPivot(g:Gesture,current:Point){
    const location=world(current),points=selectedAttachmentGeometry(g.base,g.slots??[],g.ids??[],scene.inspectedAttachment).flatMap(item=>item.points);
    let snap:Point|undefined,distance=9;
    for(const p of points){const pixel=screen(p.x,p.y),d=Math.hypot(pixel.x-current.x,pixel.y-current.y);if(d<distance){snap=p;distance=d;}}
    attachmentPivot=snap?{...snap}:location;
  }
  function drawGrid() {
    const { width, height } = app.screen, ox = width / 2 + panX, oy = height / 2 + panY;
    gridGraphics.clear();
    if (grid) {
      const step = 64 * zoom * (zoom < 0.3 ? 4 : zoom < 0.6 ? 2 : 1);
      for (let x = ((ox % step) + step) % step; x < width; x += step) gridGraphics.moveTo(x, 0).lineTo(x, height);
      for (let y = ((oy % step) + step) % step; y < height; y += step) gridGraphics.moveTo(0, y).lineTo(width, y);
      gridGraphics.stroke({ color: 0x454749, width: 1, alpha:0.2 });
    }
    gridGraphics.moveTo(0, oy).lineTo(width, oy).stroke({ color: 0x393435, width: 1 });
    gridGraphics.moveTo(ox, 0).lineTo(ox, height).stroke({ color: 0x343d3c, width: 1 });
    queueRulerFrame();
  }
  function outlineScreenPoints(draft:MeshOutlineDraft,bones:BoneView[]) {
    return meshOutlineWorldPoints(draft,bones).map(p=>screen(p.x,p.y));
  }
  function outlineUvAt(draft:MeshOutlineDraft,bones:BoneView[],at:Point) {
    if(at.x<0||at.y<0||at.x>=app.screen.width||at.y>=app.screen.height)return null;
    return meshOutlineUv(draft,bones,world(at));
  }
  function movedOutlineUv(pointDraft:OutlinePointGesture,bones:BoneView[],at:Point) {
    if(!outlineUvAt(pointDraft.draft,bones,at))return null;
    return meshOutlineUv(pointDraft.draft,bones,world({x:at.x+pointDraft.offset.x,y:at.y+pointDraft.offset.y}));
  }
  function unmodifiedPointer(event:Pick<MouseEvent,'shiftKey'|'ctrlKey'|'metaKey'|'altKey'>) {
    return !event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey;
  }
  function drawMeshOutline(draft:MeshOutlineDraft,bones:BoneView[]) {
    const quad=meshPoints(bones,draft.plane);
    if(quad.length===4)bonesGraphics.poly(quad.flatMap(p=>{const px=screen(p.x,p.y);return [px.x,px.y];}))
      .stroke({color:0xf0ce91,width:1,alpha:0.55});
    const held=gesture?.outlinePoint;
    const points=outlineScreenPoints(draft,bones);
    if(held?.draft===draft&&held.previewUv){
      const [moved]=outlineScreenPoints({...draft,points:[held.previewUv]},bones);
      if(moved)points[held.index]=moved;
    }
    const head=points[0];
    if(!head)return;
    const inside=!gesture&&hover&&outlineUvAt(draft,bones,hover)?hover:null;
    const hit=inside?nearestVertex(points,inside,OUTLINE_POINT_RADIUS):null;
    const ready=hit===0&&draft.points.length>=3;
    const next=ready?head:hit===null?inside:null;
    bonesGraphics.moveTo(head.x,head.y);
    for(const p of points.slice(1))bonesGraphics.lineTo(p.x,p.y);
    if(next)bonesGraphics.lineTo(next.x,next.y);
    if(points.length>1||next)bonesGraphics.stroke({color:0xf0ce91,width:2,join:'round'});
    points.forEach((p,i)=>bonesGraphics.circle(p.x,p.y,i===0?5:3.5)
      .fill(i===0||held?.index===i?0xffffff:0xf0ce91).stroke({color:0x303233,width:1}));
    const highlighted=points[held?.index??hit??-1];
    if(highlighted)bonesGraphics.circle(highlighted.x,highlighted.y,8)
      .stroke({color:ready||held?0xf0ce91:0xffffff,width:2});
  }
  function draw() {
    if (destroyed) return;
    if(previewAuthored&&scene.hasConstraints&&options?.previewBones)preview=options.previewBones(previewAuthored);
    bonesGraphics.clear();
    const renderBones = preview ?? scene.bones;
    const poses = worldBones(renderBones), byId = new Map(poses.map(bone => [bone.id, bone]));
    const renderSlots = previewSlots ?? scene.slots ?? [];
    const meshOutline=scene.meshOutlineBusy?null:scene.meshOutline;
    imageLayer?.draw(scene.documentId ?? -1, renderBones, renderSlots, scene.selectedSlot ?? null, screen, zoom, byId, scene.mode, scene.selectedVertex, scene.influence,
      {ids:scene.selectedAttachments,inspected:scene.inspectedAttachment,vertices:scene.selectedVertices,weightDisplay:scene.weightDisplay,innerTrace:scene.innerTrace,meshDisplay:scene.meshDisplay,meshOutline:!!meshOutline,
        meshWireframeAttachments:layerVisibility.images?scene.meshWireframeAttachments:undefined,
        animateWeightInspection:layerVisibility.images?animateWeightInspection??undefined:undefined});
    const inspected = scene.mode === 'weights' && scene.inspectedAttachment
      ? resolveAttachment(renderSlots, scene.inspectedAttachment.id, scene.inspectedAttachment)?.attachment
      : null;
    const weightBinding = inspected?.clipping ?? inspected?.mesh
      ?? (scene.mode === 'weights' && !scene.sceneEditing ? renderSlots.find(slot => slot.id === scene.selectedSlot)?.mesh : null);
    const weightColumns = weightBinding?.weighted
      ? new Map(weightBinding.bones.map((id, column) => [id, column])) : null;
    const ghostIndex=scene.ghosting?.onTop?app.stage.children.length-2:2;
    if(app.stage.getChildIndex(ghostLayer.container)!==ghostIndex)app.stage.setChildIndex(ghostLayer.container,ghostIndex);
    ghostLayer.draw(scene.documentId??-1,scene.ghosting,`${app.screen.width}:${app.screen.height}:${zoom}:${panX}:${panY}:${resourceEpoch}`,screen,zoom);
    nameTagPoses = poses;
    // Retain the temporary Create bone as tool feedback when the rig is hidden.
    const displayedBones = layerVisibility.bones ? poses : poses.filter(bone => bone.id === -1);
    for (const bone of displayedBones) {
      const parent = byId.get(bone.parent ?? -2);
      if (parent) {
        const a = screen(parent.tipX, parent.tipY), b = screen(bone.worldX, bone.worldY);
        bonesGraphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0x4b525e, width: 1 });
      }
    }
    for (const bone of displayedBones) {
      const a = screen(bone.worldX, bone.worldY), b = screen(bone.tipX, bone.tipY);
      const length = Math.hypot(b.x - a.x, b.y - a.y), selected = (scene.selectedBones??[scene.selected]).includes(bone.id) || bone.id === -1;
      const rgba=scene.boneColors?.[bone.id]??bone.color??0x9b9b9bff;
      const hovered=(scene.hoveredBone??viewportHoveredBone)===bone.id;
      const column = weightColumns?.get(bone.id);
      const colorForBone = column === undefined ? rgba >>> 8 : weightInfluenceColor(bone, column);
      const style=boneHighlightStyle(colorForBone,selected,scene.mode==='weights'&&scene.influence===bone.id,hovered);
      const color = bone.id === -1 ? 0xe9b869 : style.color;
      if(hovered){
        bonesGraphics.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:style.hoverColor,width:8,alpha:0.2});
        bonesGraphics.circle(a.x,a.y,bone.parent===null?10:7).stroke({color:style.hoverColor,width:2,alpha:0.95});
      }
      if (length > 1) {
        const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length, width = Math.min(9, Math.max(3, length * 0.12));
        const cx = a.x + (b.x - a.x) * 0.22, cy = a.y + (b.y - a.y) * 0.22;
        bonesGraphics.poly([a.x, a.y, cx + nx * width, cy + ny * width, b.x, b.y, cx - nx * width, cy - ny * width])
          .fill({ color, alpha:style.fillAlpha }).stroke({ color, width:style.width });
      }
      bonesGraphics.circle(a.x, a.y, bone.parent === null ? 7 : 4).fill(0x525455).stroke({ color, width:style.pinned||hovered?style.width:1.5 });
      if (selected && length > 1 && (scene.tool==='length'||scene.tool==='pose')) bonesGraphics.circle(b.x, b.y, 5).fill(0x525455).stroke({ color, width: 2 });
    }
    const gizmo=gizmoState();
    if(gizmo) {
      const g=gesture?.kind==='transform'?gesture:null;
      const h=hover?hitGizmo(gizmo.tool,gizmo.screenOrigin,hover,gizmo.basis):null;
      const top=new Set(selectedTopBones(preview??scene.bones,gizmo.ids));
      const satellites=gizmo.mode==='individual'?poses.filter(b=>top.has(b.id)).map(b=>screen(b.worldX,b.worldY)):[];
      const draft=g?.handle&&g.screenPivot?{handle:g.handle,startAngle:g.rotationStart??0,rotation:g.rotationTotal??0,
        delta:{...boneGestureDelta(g,g.handle,g.screenPivot,g.last),...g.adjustmentFeedback}}:undefined;
      transformGizmo.draw(gizmo.tool,gizmo.screenOrigin,h,gizmo.mode,gizmo.ids.length,satellites,draft,app.screen,gizmo.basis,'bones',false,gizmo.translationSpace);
    } else {
      const imageGizmo=imageGizmoState();
      if(imageGizmo){
        const g=gesture?.kind==='attachments'?gesture:null,h=hover?hitGizmo(imageGizmo.tool,imageGizmo.screenOrigin,hover):null;
        const draft=g?.handle&&g.screenPivot?{handle:g.handle,startAngle:g.rotationStart??0,rotation:g.rotationTotal??0,
          delta:{...gizmoDelta(g.handle,g.screenPivot,g.start,g.last,zoom,g.rotationTotal??0),...g.regionSnapFeedback}}:undefined;
        transformGizmo.draw(imageGizmo.tool,imageGizmo.screenOrigin,h,'group',imageGizmo.ids.length,[],draft,app.screen,undefined,'images',gesture?.kind==='attachmentPivot'||!!hover&&atAttachmentPivot(imageGizmo,hover));
      }else transformGizmo.hide();
    }
    if(scene.clippingDraft){
      const points=scene.clippingDraft.points.map(p=>screen(p.x,p.y));
      if(points.length){
        bonesGraphics.moveTo(points[0]!.x,points[0]!.y);for(const p of points.slice(1))bonesGraphics.lineTo(p.x,p.y);
        if(hover)bonesGraphics.lineTo(hover.x,hover.y);bonesGraphics.stroke({color:0x72dcca,width:2});
        points.forEach((p,i)=>bonesGraphics.circle(p.x,p.y,i===0?5:3.5).fill(i===0?0xffffff:0x72dcca));
      }
    }
    if(meshOutline)drawMeshOutline(meshOutline,renderBones);
    if(scene.mode==='weights' && scene.brushMode!=='direct' && hover && scene.editable && scene.tool!=='pan') {
      const radius=(scene.brushSize??80)/2;
      bonesGraphics.circle(hover.x,hover.y,radius).stroke({color:0xf0f0f0,width:1,alpha:0.8});
      const inner=radius*(1-(scene.brushFeather??0.6));if(inner>1)bonesGraphics.circle(hover.x,hover.y,inner).stroke({color:0xf0f0f0,width:1,alpha:0.3});
    }
    if(edgeStart!==null && scene.mode==='meshes'){
      const m=(scene.slots??[]).find(s=>s.id===scene.selectedSlot)?.mesh;
      const p=m?meshPoints(scene.bones,m)[edgeStart]:null;
      if(p){const sp=screen(p.x,p.y);bonesGraphics.circle(sp.x,sp.y,7).stroke({color:0xffffff,width:2});}
    }
    if(gesture?.kind==='box'||gesture?.kind==='imageBox'||gesture?.kind==='weightBox') {
      const a=gesture.start,b=gesture.last;
      bonesGraphics.poly([a.x,a.y,b.x,a.y,b.x,b.y,a.x,b.y]).fill({color:0x70d4e6,alpha:0.09}).stroke({color:0x70d4e6,width:1});
    }
    if(gesture?.kind==='draw') {
      const a=gesture.origin,b=world(gesture.last),sa=screen(a.x,a.y),sb=screen(b.x,b.y);
      bonesGraphics.moveTo(sa.x,sa.y).lineTo(sb.x,sb.y).stroke({color:0xffffff,width:2});
      bonesGraphics.circle(sb.x,sb.y,4).fill(0x70d4e6).stroke({color:0x303233,width:1});
    }
    app.render();
    queueNameTagFrame();
  }
  function resize() {
    if((gesture?.outlinePoint||gesture?.previousToolClick)&&
      (app.screen.width!==host.clientWidth||app.screen.height!==host.clientHeight))cancel(false);
    app.renderer.resolution = Math.min(window.devicePixelRatio || 1, 3);
    app.renderer.resize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    if(backdropWidth!==app.screen.width||backdropHeight!==app.screen.height){
      backdropWidth=app.screen.width;backdropHeight=app.screen.height;
      drawViewportBackdrop(backdropGraphics,backdropWidth,backdropHeight);
    }
    drawGrid(); draw();
  }
  function ownsDraftPose(){return !!(scene.clippingDraft||scene.meshOutline||scene.meshOutlineBusy);}
  function endIdleGeometry(){
    if(!gesture&&!pending&&preparingPointer===null&&!ownsDraftPose()){preparedPose=null;options?.onEndGeometry?.();}
  }
  function cancel(redraw=true) {
    if(gesture?.previousToolClick){
      const {id}=gesture;
      gesture=null;
      if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
      if(redraw){cursor();draw();}
      return;
    }
    if(preparingPointer!==null)pending=false;
    preparation++;preparingPointer=null;preparedPose=null;
    if(gesture?.kind==='attachmentPivot')attachmentPivot=gesture.previousAttachmentPivot??null;
    if(gesture?.adjustment)options?.onAdjustmentDragging?.(false);
    const id = gesture?.id,outlinePoint=gesture?.outlinePoint;
    gesture=null;outlineTap=null;
    if(outlinePoint)options?.onMeshOutlinePointGesture?.(false);
    if (!pending) { preview = null; previewSlots = null;previewAuthored=null;options?.onEndBonePreview?.(); }
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    endIdleGeometry();if(redraw){cursor();draw();}
  }
  function selectedBones() { return (scene.selectedBones??(scene.selected===null?[]:[scene.selected])).filter(id=>scene.bones.some(b=>b.id===id)); }
  function selectBones(ids:number[],active:number|null,phase?:ViewportSelectionPhase) {
    scene={...scene,selectedBones:ids,selected:active,selectedSlot:null};
    if(options?.onSelectBones) options.onSelectBones(ids,active,phase); else options?.onSelect(active);
  }
  function selectImages(ids:number[],active:number|null,phase?:ViewportSelectionPhase){
    if(attachmentSelectionKey(ids)!==attachmentSelectionKey(scene.selectedAttachments))attachmentPivot=null;
    const slots=scene.slots??[],resolved=active===null?null:resolveAttachment(slots,active,scene.inspectedAttachment),selectedSlot=resolved?.slot.id??null;
    scene={...scene,selectedAttachments:ids,selectedSlot,inspectedAttachment:resolved?.attachment??null,selectedVertex:null};
    if(options?.onSelectAttachments)options.onSelectAttachments(ids,active,phase);else options?.onSelectSlot?.(selectedSlot);
  }
  function editingSlot(){
    const slot=(scene.slots??[]).find(s=>s.id===scene.selectedSlot),attachment=scene.inspectedAttachment;
    return slot&&attachment?.slot===slot.id?{...slot,region:attachment.region,mesh:attachment.mesh,imageAvailable:attachment.imageAvailable}:slot;
  }
  function weightTarget(){
    const resolved=scene.sceneEditing&&scene.inspectedAttachment?resolveAttachment(scene.slots??[],scene.inspectedAttachment.id,scene.inspectedAttachment):null;
    const slot=resolved?.slot??(!scene.sceneEditing?editingSlot():undefined),attachment=resolved?.attachment;
    const binding=attachment?.clipping??attachment?.mesh??(!scene.sceneEditing?slot?.mesh:undefined)??undefined;
    return slot&&binding?{slot,attachment,binding}:null;
  }
  function selectedWeightVertices(binding:DenseBindingView){
    return [...new Set(scene.selectedVertices??(scene.selectedVertex===null||scene.selectedVertex===undefined?[]:[scene.selectedVertex]))].filter(i=>Number.isInteger(i)&&i>=0&&i<binding.vertices.length).sort((a,b)=>a-b);
  }
  function weightVertexAt(points: Point[], binding: DenseBindingView, location: Point) {
    const ordinary = nearestVertex(points, location, 10 / zoom);
    if (ordinary !== null || !binding.weighted || !scene.weightDisplay?.pies) return ordinary;

    let nearest: number | null = null;
    let distance = Infinity;
    for (const index of selectedWeightVertices(binding)) {
      const point = points[index]!;
      const candidate = Math.hypot(point.x - location.x, point.y - location.y);
      const radius = selectedWeightHitRadius(index === scene.selectedVertex) / zoom;
      if (candidate <= radius && candidate < distance) {
        nearest = index;
        distance = candidate;
      }
    }
    return nearest;
  }
  function selectWeightVertices(ids:number[],active:number|null,replaceOrder=false){
    const target=weightTarget();
    const valid=[...new Set(ids)].filter(i=>target&&Number.isInteger(i)&&i>=0&&i<target.binding.vertices.length).sort((a,b)=>a-b);
    const focused=active!==null&&valid.includes(active)?active:valid.at(-1)??null;
    scene={...scene,selectedVertices:valid,selectedVertex:focused};
    if(options?.onSelectVertices)options.onSelectVertices(valid,focused,replaceOrder);else options?.onSelectVertex?.(focused);
  }
  function boneAt(p:Point,selected?:ReadonlySet<number>) {
    return [...worldBones(scene.bones)].reverse().find(b=>(!selected||selected.has(b.id))&&segmentDistance(p.x,p.y,screen(b.worldX,b.worldY),screen(b.tipX,b.tipY))<=9);
  }
  function selectableBoneAt(p:Point) {
    if(layerSelection.bones)return boneAt(p);
    if(scene.selectedSlot!=null)return undefined;
    const selected=scene.selectedBones??(scene.selected===null?[]:[scene.selected]);
    return selected.length?boneAt(p,new Set(selected)):undefined;
  }
  function pointerBoneHover(p:Point) {
    if(scene.parentPicking||scene.mode==='weights')return boneAt(p)?.id??null;
    if(!scene.mode||scene.mode==='bones')return (scene.tool==='create'?boneAt(p):selectableBoneAt(p))?.id??null;
    return null;
  }
  function inBox(p:Point,a:Point,b:Point){return p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);}
  function boneInBox(b:ReturnType<typeof worldBones>[number],a:Point,c:Point){
    const p=screen(b.worldX,b.worldY),q=screen(b.tipX,b.tipY);
    if(inBox(p,a,c)||inBox(q,a,c))return true;
    const minX=Math.min(a.x,c.x),maxX=Math.max(a.x,c.x),minY=Math.min(a.y,c.y),maxY=Math.max(a.y,c.y);
    const dx=q.x-p.x,dy=q.y-p.y;
    let enter=0,exit=1;
    for(const [direction,distance] of [[-dx,p.x-minX],[dx,maxX-p.x],[-dy,p.y-minY],[dy,maxY-p.y]]){
      if(direction===0){if(distance!<0)return false;continue;}
      const t=distance!/direction!;
      if(direction!<0)enter=Math.max(enter,t);else exit=Math.min(exit,t);
      if(enter>exit)return false;
    }
    return true;
  }
  function selectedAttachmentAt(location: Point) {
    return selectedAttachmentGeometry(scene.bones, scene.slots ?? [], scene.selectedAttachments ?? [], scene.inspectedAttachment)
      .reverse().find(item => {
        const mesh = item.attachment.mesh;
        if (mesh) {
          for (let i = 0; i < mesh.triangles.length; i += 3) {
            if (polygonContains(mesh.triangles.slice(i, i + 3).map(vertex => item.points[vertex]!), location)) return true;
          }
          for (let i = 0; i < mesh.edges.length; i += 2) {
            if (segmentDistance(location.x, location.y, item.points[mesh.edges[i]!]!, item.points[mesh.edges[i + 1]!]!) <= 7 / zoom) return true;
          }
          return false;
        }
        return polygonContains(item.points, location) || item.points.some((point, index) =>
          segmentDistance(location.x, location.y, point, item.points[(index + 1) % item.points.length]!) <= 7 / zoom);
      });
  }
  function imageAtPointer(location: Point, slots: readonly SlotView[], isolated?: SlotView) {
    if (!isolated) return imageAt(scene.bones, slots, location.x, location.y);
    const clip = meshDisplayClip(clippingScopes(slots).masks.get(isolated.id), isolated.id, true);
    if (clip) {
      const polygon = clippingPolygon(scene.bones, clip);
      if (polygon.length >= 3 && polygonContains(polygon, location) === clip.inverse) return undefined;
    }
    return imageAt(scene.bones, [isolated], location.x, location.y);
  }
  function passiveClippingAt(start: Point, location: Point): number | null {
    if (!layerSelection.others || !layerVisibility.others || scene.mode !== 'images' ||
      !scene.sceneEditing || !options?.onSelectAttachments) return null;
    const slots = scene.slots ?? [];
    for (let i = slots.length - 1; i >= 0; i--) {
      const attachment = activeAttachment(slots[i]!);
      if (!attachment?.clipping || scene.selectedAttachments?.includes(attachment.id)) continue;
      const points = clippingPolygon(scene.bones, attachment.clipping).map(point => screen(point.x, point.y));
      if (points.length < 3 || !points.some((point, index) =>
        segmentDistance(start.x, start.y, point, points[(index + 1) % points.length]!) <= 6)) continue;
      const gizmo = imageGizmoState();
      if ((gizmo && (atAttachmentPivot(gizmo, start) || hitGizmo(gizmo.tool, gizmo.screenOrigin, start))) ||
        selectedAttachmentAt(location) || (layerSelection.images && imageAt(scene.bones, slots, location.x, location.y))) return null;
      return attachment.id;
    }
    return null;
  }
  function canSwapPreviousTool() {
    return !!options?.onPreviousToolSwap&&scene.previousToolSwap===true&&scene.editable&&!scene.busy&&
      !scene.parentPicking&&!scene.clippingDraft&&!scene.meshOutline&&!scene.meshOutlineBusy&&!scene.timelineAdjust?.enabled;
  }
  const down = (event: PointerEvent) => {
    if (gesture || pending || ![0, 1, 2].includes(event.button)) {
      if(gesture?.previousToolClick)gesture.previousToolClick.eligible=false;
      return;
    }
    const outlineActive=!!(scene.meshOutline||scene.meshOutlineBusy);
    const start = point(event), location = world(start);
    if(event.currentTarget===canvas&&event.pointerType==='mouse'&&event.button===2&&event.buttons===2&&
      !space&&unmodifiedPointer(event)&&canSwapPreviousTool()){
      event.preventDefault();
      reportBoneHover(null);
      gesture={id:event.pointerId,kind:'pan',start,last:start,bone:0,origin:location,
        revision:scene.revision,base:scene.bones,changed:false,previousToolClick:{eligible:true}};
      canvas.setPointerCapture(event.pointerId);
      cursor();draw();return;
    }
    canvas.focus({ preventScroll: true });
    reportBoneHover(null);
    const pan = event.button !== 0 || space || (!outlineActive&&!scene.parentPicking&&scene.tool==='pan');
    if (!pan && scene.busy) return;
    if(!pan&&outlineActive){
      const draft=scene.meshOutline;
      if(draft&&!scene.meshOutlineBusy&&scene.editable){
        const uv=outlineUvAt(draft,scene.bones,start);
        if(!uv){event.preventDefault();outlineTap=null;return;}
        const points=outlineScreenPoints(draft,scene.bones);
        const index=nearestVertex(points,start,OUTLINE_POINT_RADIUS);
        const marker=index===null?undefined:points[index];
        if(index===null||!marker){event.preventDefault();outlineTap=null;options?.onMeshOutlinePoint?.(uv);return;}
        if(outlineTap?.draft!==draft||outlineTap.index!==index)outlineTap=null;
        canvas.setPointerCapture(event.pointerId);
        hover=start;
        gesture={id:event.pointerId,kind:'outlinePoint',start,last:start,bone:0,origin:location,
          revision:scene.revision,base:scene.bones,changed:false,
          outlinePoint:{draft,index,offset:{x:marker.x-start.x,y:marker.y-start.y},
            shift:event.shiftKey,plain:unmodifiedPointer(event)}};
        options?.onMeshOutlinePointGesture?.(true);
        cursor();draw();
      }
      return;
    }
    if(outlineActive)outlineTap=null;
    if(scene.parentPicking&&!pan){event.preventDefault();const target=boneAt(start);if(target)options?.onPickParent?.(target.id);draw();return;}
    const additive=!!(event.ctrlKey||event.metaKey||event.shiftKey);
    if (!pan && !additive && !scene.clippingDraft && scene.tool !== 'create') {
      const clip = passiveClippingAt(start, location);
      if (clip !== null) {
        event.preventDefault();
        if (preparedPose) endIdleGeometry();
        selectImages([clip], clip);
        draw();
        return;
      }
    }
    // A blocked acquisition with nothing to edit needs no geometry lease.
    // A retry after a frozen pose still has to release its existing lease.
    if(!pan&&!scene.clippingDraft){
      const boneMode=!scene.mode||scene.mode==='bones';
      const imageMode=scene.mode==='images'&&scene.sceneEditing;
      const slotMode=scene.mode==='images'||scene.mode==='meshes';
      const blockedBones=boneMode&&!layerSelection.bones&&scene.tool!=='create'&&
        (additive||scene.selectedSlot!=null||!selectedBones().length);
      const blockedImages=slotMode&&!layerSelection.images&&
        (imageMode?!scene.selectedAttachments?.length:scene.selectedSlot==null);
      if(blockedBones||blockedImages){
        if(preparedPose)endIdleGeometry();
        return;
      }
    }
    // Documented selection gestures do not request an evaluated native pose.
    // Ordinary Direct pointerdown retains the existing single frozen-pose
    // preparation because it may immediately become an authored drag.
    const weightHit=scene.mode==='weights'&&scene.brushMode==='direct'?weightTarget():null;
    const selectingWeights=!!weightHit&&(!!(event.ctrlKey||event.metaKey)||weightVertexAt(bindingPoints(scene.bones,weightHit.binding),weightHit.binding,location)===null);
    if(!pan&&scene.editable&&!selectingWeights){
      if(scene.mode!=='bones')options?.onPauseSimulation?.();
      if(((scene.hasConstraints&&scene.mode!=='bones')||scene.requiresBonePose)&&options?.onPrepareGeometry&&(!preparedPose||preparedPose.revision!==scene.revision||preparedPose.documentId!==scene.documentId)){
        event.preventDefault();const token=++preparation,revision=scene.revision,documentId=scene.documentId;
        preparingPointer=event.pointerId;pending=true;
        void options.onPrepareGeometry(revision).then(snapshot=>{
          if(destroyed||token!==preparation||preparingPointer!==event.pointerId||scene.revision!==revision||scene.documentId!==documentId){if(token===preparation){pending=false;preparingPointer=null;}if(!destroyed)endIdleGeometry();return;}
          scene={...scene,bones:snapshot.bones,...(scene.requiresBonePose?{authoredBones:snapshot.bones}:{})};preparedPose={revision,documentId,poseEpoch:snapshot.poseEpoch};pending=false;preparingPointer=null;down(event);
        }).catch(error=>{if(token===preparation){pending=false;preparingPointer=null;options?.onImageError?.(error instanceof Error?error.message:String(error));}if(!destroyed)endIdleGeometry();}).finally(()=>{if(token===preparation){cursor();draw();}});
        return;
      }
    }
    if(!pan&&scene.clippingDraft){
      if(scene.editable){const first=scene.clippingDraft.points[0];if(first&&scene.clippingDraft.points.length>=3&&Math.hypot(screen(first.x,first.y).x-start.x,screen(first.x,first.y).y-start.y)<=10)options?.onFinishClipping?.();else options?.onClippingPoint?.(location);}
      event.preventDefault();draw();return;
    }
    let selectedSlot: SlotView | undefined;
    let vertex:number|undefined, fromVertex:number|null= null;
    let ids=selectedBones(), transformMode:Gesture['transformMode'], pivot:Point|undefined, pickParent=false;
    let handle:GizmoHandle|undefined;
    let regionSnap:RegionSnapTarget|undefined;
    let kind: Gesture['kind'] = 'pan', boneId = scene.selected ?? scene.bones[0]?.id ?? 0, origin = location;
    let clip:AttachmentView|undefined,binding:DenseBindingView|undefined,weightAttachment:number|undefined,weightNeighbors:number[][]|undefined;
    if (!pan) {
      const poses = worldBones(scene.bones), selected = poses.find(b => b.id === scene.selected);
      if(scene.mode==='weights'){
        const target=weightTarget();
        if(!scene.editable||!target)return;
        const {slot:current,attachment}=target;binding=target.binding;
        const points=bindingPoints(scene.bones,binding);
        vertex=weightVertexAt(points,binding,location)??undefined;
        selectedSlot=current;weightAttachment=attachment?.id;
        if(scene.brushMode==='direct'){
          const selected=selectedWeightVertices(binding),toggle=!!(event.ctrlKey||event.metaKey);
          if(vertex===undefined){kind='weightBox';ids=selected;if(!toggle)selectWeightVertices([],null);}
          else if(toggle){const next=selected.includes(vertex)?selected.filter(v=>v!==vertex):[...selected,vertex];selectWeightVertices(next,next.includes(vertex)?vertex:next.at(-1)??null);event.preventDefault();draw();return;}
          else{selectWeightVertices(selected.includes(vertex)?selected:[vertex],vertex);kind='weights';}
        }else{
          // A brush stroke respects the captured scope without turning its
          // nearest hit into an unintended new one-vertex Auto selection.
          options?.onSelectVertex?.(vertex??null);scene={...scene,selectedVertex:vertex??null};kind='weights';
        }
        if(kind==='weights'&&(!binding.weighted||binding.bones.length<2||scene.influence===null||scene.influence===undefined||!binding.bones.includes(scene.influence))){draw();return;}
        weightNeighbors=attachment?.clipping?bindingNeighbors(points.length,boundaryEdges(points.length)):bindingNeighbors(points.length,[],(attachment?.mesh??current.mesh)?.triangles??[]);
      }else if(scene.mode==='clipping'&&scene.inspectedAttachment?.clipping){
        if(!scene.editable)return;
        clip=scene.inspectedAttachment;const c=clip.clipping!,points=clippingPoints(scene.bones,c);
        vertex=nearestVertex(points,location,10/zoom)??undefined;
        const edge=nearestBindingEdge(boundaryEdges(points.length),points,location,8/zoom);
        options?.onSelectVertex?.(vertex??null);scene={...scene,selectedVertex:vertex??null};
        if(scene.meshTool==='delete'){if(vertex!==undefined)commit({type:'deleteClippingVertex',id:clip.id,vertex},scene.revision);return;}
        if(scene.meshTool==='add'&&vertex===undefined&&edge){commit({type:'insertClippingVertex',id:clip.id,index:edge[1]===0?points.length:edge[1],point:location},scene.revision);return;}
        if(vertex!==undefined){kind='clipVertex';origin=points[vertex]!;}
        else if(polygonContains(points,location)){kind='attachments';ids=[clip.id];pivot=location;handle='translate';}
        else{draw();return;}
      }else if(scene.mode==='images'&&scene.sceneEditing){
        const hit=layerSelection.images?imageAt(scene.bones,scene.slots??[],location.x,location.y):undefined;
        const gizmo=imageGizmoState(),pivotHit=!additive&&gizmo&&atAttachmentPivot(gizmo,start);
        handle=!additive&&gizmo&&!pivotHit?hitGizmo(gizmo.tool,gizmo.screenOrigin,start)??undefined:undefined;
        // An explicitly selected outline can be manipulated without activating it.
        // Visible unselected images keep normal picking priority elsewhere.
        const ghost=selectedAttachmentAt(location);
        const id=ghost?.attachment.id??(hit?renderedAttachmentId(hit):null);ids=[...(scene.selectedAttachments??[])];
        if(pivotHit){kind='attachmentPivot';ids=gizmo.ids;pivot=gizmo.origin;}
        else{
          // An already selected Clipping outline belongs to Others.
          if(!layerSelection.images&&!handle&&(id===null||(additive&&!ghost?.attachment.clipping))){
            endIdleGeometry();draw();return;
          }
          if(id!==null&&additive){
            ids=ids.includes(id)?ids.filter(v=>v!==id):[...ids,id];
            selectImages(ids,ids.includes(id)?id:ids.at(-1)??null);draw();return;
          }
          if(id===null&&!handle){kind='imageBox';if(!additive){ids=[];selectImages([],null,'preview');}}
          else{
            if(id!==null&&!handle&&!ids.includes(id)){ids=[id];selectImages(ids,id);}
            if(!scene.editable){draw();return;}
            const selectedGizmo=imageGizmoState();pivot=selectedGizmo?.origin??location;
            handle??=scene.tool==='rotate'?'rotate':scene.tool==='scale'?'scale':'translate';
            kind='attachments';
            if(scene.snapRegionPixels&&ids.length===1&&handle.startsWith('translate')){
              const target=resolveAttachment(scene.slots??[],ids[0]!);
              if(target?.slot.visible&&target.slot.activeAttachmentId===target.attachment.id&&target.attachment.type==='region'&&target.attachment.region){
                const owner=poses.find(pose=>pose.id===target.slot.bone);
                if(owner)regionSnap={id:target.attachment.id,region:target.attachment.region,owner};
              }
            }
          }
        }
      }else if (scene.mode && scene.mode !== 'bones' && scene.tool !== 'create') {
        const current=editingSlot();
        const mesh=current?.mesh;
        const points=mesh?meshPoints(scene.bones,mesh):[];
        vertex=mesh?nearestVertex(points,location,10/zoom)??undefined:undefined;
        const edge=mesh?nearestEdge(mesh,points,location,8/zoom):null;
        const slots=scene.slots??[],isolated=isolatedMeshSlot(slots,scene.meshDisplay);
        const editsCurrentMesh=vertex!==undefined||!!edge||(scene.meshTool==='draw'&&!!mesh);
        const hit=editsCurrentMesh?current:imageAtPointer(location,slots,isolated);
        if(isolated&&!hit){endIdleGeometry();draw();return;}
        if(!layerSelection.images&&(!hit||hit.id!==scene.selectedSlot||
          (!editsCurrentMesh&&scene.inspectedAttachment&&renderedAttachmentId(hit)!==scene.inspectedAttachment.id))){endIdleGeometry();draw();return;}
        if(hit?.id !== scene.selectedSlot) { edgeStart=null; scene={...scene,selectedSlot:hit?.id??null};options?.onSelectSlot?.(hit?.id??null); }
        if(!hit || !scene.editable){draw();return;}
        selectedSlot=hit;kind='slot';
        const regionHit=imageAt(scene.bones,[hit],location.x,location.y);
        origin=regionHit?{x:regionHit.worldX,y:regionHit.worldY}:location;
        if(hit.mesh && scene.mode==='meshes') {
          const previousVertex=scene.selectedVertex??null;
          options?.onSelectVertex?.(vertex??null);scene={...scene,selectedVertex:vertex??null};
          if(scene.meshTool==='delete') {
            if(vertex!==undefined)commit({type:'deleteVertex',id:hit.id,vertex},scene.revision);
            else if(edge)commit({type:'meshEdge',id:hit.id,a:edge[0],b:edge[1],remove:true},scene.revision);
            return;
          }
          if(scene.meshTool==='draw') {
            kind='draw';fromVertex=vertex??previousVertex;
            if(fromVertex!==null&&points[fromVertex])origin=points[fromVertex]!;else{fromVertex=null;origin=location;}
          }
          else if(scene.meshTool==='add') { commit({type:'addVertex',id:hit.id,...location,edgeA:edge?.[0]??null,edgeB:edge?.[1]??null},scene.revision);return; }
          else if(scene.meshTool==='edge' || scene.meshTool==='removeEdge') {
            if(vertex!==undefined){if(edgeStart!==null && edgeStart!==vertex){commit({type:'meshEdge',id:hit.id,a:edgeStart,b:vertex,remove:scene.meshTool==='removeEdge'},scene.revision);edgeStart=null;}else edgeStart=vertex;}
            draw();return;
          }
          else if(vertex!==undefined){kind='vertex';origin=points[vertex]!;}
        }
      } else if (scene.tool === 'create' && scene.editable && poses.length) {
        kind = 'create';
        const hit=selected&&Math.hypot(screen(selected.worldX,selected.worldY).x-start.x,screen(selected.worldX,selected.worldY).y-start.y)<=9?selected:boneAt(start),parent=hit??selected??poses[0]!;
        boneId=parent.id;pickParent=!!hit;
        if(hit) {ids=[hit.id];selectBones(ids,hit.id);}
        const tip = screen(parent.tipX, parent.tipY);
        if (Math.hypot(tip.x - start.x, tip.y - start.y) < 12) origin = { x: parent.tipX, y: parent.tipY };
      } else {
        const tipHit=scene.tool==='length'&&selected&&Math.hypot(screen(selected.tipX,selected.tipY).x-start.x,screen(selected.tipX,selected.tipY).y-start.y)<=12;
        const hit=tipHit?selected:selectableBoneAt(start);
        const gizmo=gizmoState(scene.bones);
        handle=!additive&&gizmo&&(!hit||ids.includes(hit.id))?hitGizmo(gizmo.tool,gizmo.screenOrigin,start,gizmo.basis)??undefined:undefined;
        if(!layerSelection.bones&&(additive||(!hit&&!handle))){endIdleGeometry();draw();return;}
        if(hit&&additive){
          ids=ids.includes(hit.id)?ids.filter(id=>id!==hit.id):[...ids,hit.id];
          selectBones(ids,ids.includes(hit.id)?hit.id:ids.at(-1)??null);draw();return;
        }
        if(!hit && !handle) {
          kind='box';if(!additive){ids=[];selectBones([],null,'preview');}
        } else {
          if(hit&&!handle){
            if(layerSelection.bones){if(!ids.includes(hit.id))ids=[hit.id];selectBones(ids,hit.id);}
            boneId=hit.id;
          }
          const active=poses.find(b=>b.id===boneId)??selected;
          if(!active||!scene.editable){draw();return;}
          origin={x:active.worldX,y:active.worldY};
          pivot=transformPivot(scene.bones,ids,active.id,scene.tool==='rotate'?pivotMode:'individual')??origin;
          if(scene.tool==='length'){kind='length';ids=[active.id];}
          else{
            kind='transform';transformMode=scene.tool==='rotate'||scene.tool==='scale'||scene.tool==='shear'?scene.tool:'translate';
            if(scene.tool==='pose') {
              const atOrigin=Math.hypot(screen(active.worldX,active.worldY).x-start.x,screen(active.worldX,active.worldY).y-start.y)<=9;
              transformMode=atOrigin?'translate':'pose';if(atOrigin)ids=[active.id];
            }
            handle??=transformMode==='rotate'||transformMode==='pose'?'rotate':transformMode==='scale'?'scale':transformMode==='shear'?'shearX':'translate';
            if(handle==='rotate'&&Math.hypot(start.x-screen(pivot.x,pivot.y).x,start.y-screen(pivot.x,pivot.y).y)<8){draw();return;}
          }
        }
      }
    }

    event.preventDefault();
    const screenPivot=pivot?screen(pivot.x,pivot.y):undefined;
    const rotationStart=screenPivot?pointerAngle(screenPivot,start):0;
    const individual=scene.tool!=='rotate'||pivotMode==='individual';
    const parentTranslation=kind==='transform'&&transformMode==='translate'?activeParentTranslation(ids,boneId):undefined;
    const localTranslation=kind==='transform'&&transformMode==='translate'&&!parentTranslation?activeLocalTranslation(ids,boneId):undefined;
    if(kind==='transform'&&scene.tool==='translate'&&transformMode==='translate'&&
      (scene.localTranslationUnavailable||(scene.localTranslation&&!localTranslation&&!parentTranslation))){
      if(scene.localTranslationUnavailable)options?.onImageError?.('Local Translate needs an invertible bone and parent transform.');
      endIdleGeometry();cursor();draw();return;
    }
    const basis=transformMode==='scale'?scaleBasis(scene.bones,ids,boneId)??undefined:
      localTranslation?localTranslationScreenBasis(localTranslation):parentTranslation?.basis;
    let adjustment:ViewportAdjustment|undefined;
    if(kind==='transform'&&scene.timelineAdjust?.enabled){
      const target=scene.timelineAdjust.target, epoch=preparedPose?.poseEpoch;
      if(target&&target.tool===transformMode&&ids.length===1&&ids[0]===target.bone&&epoch!==undefined)
        adjustment=options?.onPrepareAdjustment?.(target,epoch)??undefined;
      if(!adjustment){endIdleGeometry();cursor();draw();return;}
    }
    const armed=scene.compensation?.bones||scene.compensation?.images?scene.compensation:undefined;
    const singleSetupBone=ids.length===1&&scene.sceneEditing&&scene.selectedSlot==null&&!scene.hasConstraints&&!scene.requiresBonePose;
    const affineCompensation=transformMode==='rotate'||transformMode==='scale'||transformMode==='shear';
    if(armed&&kind==='transform'&&affineCompensation){
      const scaleBasisInvalid=transformMode==='scale'&&(!basis||![basis.x.x,basis.x.y,basis.y.x,basis.y.y].every(Number.isFinite));
      if(!singleSetupBone||ids[0]!==boneId||scaleBasisInvalid){
        const operation=transformMode==='scale'?'scaling':transformMode==='shear'?'shear':'rotation';
        options?.onImageError?.(scaleBasisInvalid?'Compensated scaling needs two finite local axes.':
          `Compensated ${operation} needs one editable Setup bone without constraints.`);
        endIdleGeometry();cursor();draw();return;
      }
    }
    const compensation=kind==='transform'&&(transformMode==='translate'||affineCompensation)&&singleSetupBone?armed:undefined;
    gesture = { id: event.pointerId, kind, start, last: start, bone: boneId, origin, revision: scene.revision, base:scene.mode==='bones'?(scene.authoredBones??scene.bones):scene.bones, changed: false, slot:selectedSlot, vertex, coverage:(binding??selectedSlot?.mesh)?.vertices.map(()=>0),weightVertices:binding?(scene.brushMode==='direct'?selectedWeightVertices(binding):[...(scene.selectedVertices??[])]):undefined,weightLocks:[...(scene.lockedInfluences??[])],binding,weightAttachment,weightBone:scene.influence??undefined,weightNeighbors,brush:{mode:scene.brushMode??'add',strength:scene.brushStrength??.5,size:scene.brushSize??80,feather:scene.brushFeather??.6,directGain:.005*(event.shiftKey?.1:1)},ids,transformMode,pivot,pickParent,fromVertex,additive:!!(event.ctrlKey||event.metaKey||(kind!=='weightBox'&&event.shiftKey)),handle,screenPivot,rotationStart,rotationPrevious:rotationStart,rotationTotal:0,individual,basis,parentTranslation,localTranslation,clip,slots:scene.slots,poseEpoch:preparedPose?.poseEpoch,adjustment,regionSnap,compensation,previousAttachmentPivot:attachmentPivot?{...attachmentPivot}:null };
    canvas.setPointerCapture(event.pointerId);
    if(adjustment)options?.onAdjustmentDragging?.(true);
    if(kind==='weights'&&gesture.brush?.mode!=='direct'){gesture.changed=true;const edit=safeEditFor(gesture,start);if(edit)safePreview(gesture,edit);}
    cursor(); draw();
  };
  function editFor(g: Gesture, current: Point): RigEdit | null {
    const location = world(current);
    if(g.kind==='clipVertex'&&g.clip&&g.vertex!==undefined)return {type:'moveClippingVertices',id:g.clip.id,vertices:[{vertex:g.vertex,x:g.origin.x+(current.x-g.start.x)/zoom,y:g.origin.y-(current.y-g.start.y)/zoom}]};
    if(g.kind==='attachments'&&g.handle){
      const pivot=g.pivot??g.origin,screenPivot=g.screenPivot??screen(pivot.x,pivot.y);
      if(g.handle==='rotate'&&Math.hypot(current.x-screenPivot.x,current.y-screenPivot.y)>2){const angle=pointerAngle(screenPivot,current);g.rotationTotal=(g.rotationTotal??0)+angleDelta(g.rotationPrevious??angle,angle);g.rotationPrevious=angle;}
      const delta=gizmoDelta(g.handle,screenPivot,g.start,current,zoom,g.rotationTotal??0);
      if(g.regionSnap){
        if(!g.changed){g.regionSnapFeedback={dx:0,dy:0};return null;}
        const axis=g.handle==='translateX'?'x':g.handle==='translateY'?'y':null;
        const snapped=snapRegionTranslation(g.regionSnap,{x:delta.dx,y:delta.dy},axis);
        g.regionSnapFeedback=snapped?.delta;
        if(snapped)return snapped.edit;
      }
      return{type:'transformAttachments',ids:g.ids??[],mode:g.handle==='rotate'?'rotate':g.handle.startsWith('scale')?'scale':'translate',pivotX:pivot.x,pivotY:pivot.y,dx:delta.dx,dy:delta.dy,rotation:delta.rotation,scaleX:delta.scaleX,scaleY:delta.scaleY};
    }
    if(g.kind==='weights'&&g.binding&&g.weightBone!==undefined&&g.brush){
      const m=g.binding,points=bindingPoints(g.base,m),column=m.bones.indexOf(g.weightBone),brush=g.brush,locks=g.weightLocks?.length?{lockedBones:[...g.weightLocks]}:{};
      if(brush.mode==='direct'){
        if(g.vertex===undefined)return null;
        // Documented vertical Direct interaction; 200 CSS pixels per unit and
        // captured Shift fine mode are FBones choices, not original gains.
        // A selected group receives the same clamped delta per original row;
        // that group transfer rule is our bounded interaction policy.
        const selected=g.weightVertices?.length?g.weightVertices:[g.vertex],delta=(g.start.y-current.y)*brush.directGain;
        const changes=selected.flatMap(vertex=>{const base=m.vertices[vertex]!.weights[column]??0,value=Math.max(0,Math.min(1,base+delta));return value===base?[]:[{vertex,value}];});
        if(!changes.length)return null;
        if(selected.length>1)return g.weightAttachment!==undefined?{type:'paintAttachmentWeights',id:g.weightAttachment,bone:g.weightBone,changes,...locks}:{type:'paintWeights',id:g.slot!.id,bone:g.weightBone,changes};
        const {vertex,value}=changes[0]!;
        return g.weightAttachment!==undefined?{type:'setAttachmentWeight',id:g.weightAttachment,bone:g.weightBone,vertex,value,...locks}:{type:'setWeight',id:g.slot!.id,bone:g.weightBone,vertex,value};
      }
      const changes=points.flatMap((p,i)=>{
        if(g.weightVertices?.length&&!g.weightVertices.includes(i))return[];
        const sp=screen(p.x,p.y),coverage=falloff(segmentDistance(sp.x,sp.y,g.last,current),brush.size/2,brush.feather);
        g.coverage![i]=Math.max(g.coverage![i]!,coverage);
        const covered=g.coverage![i]!,amount=covered*brush.strength,base=m.vertices[i]!.weights[column]??0;if(!covered||(brush.mode!=='replace'&&!amount))return[];
        let target=brush.mode==='subtract'?0:1;
        if(brush.mode==='smooth'){const neighbors=g.weightNeighbors?.[i]??[];target=neighbors.length?neighbors.reduce((sum,v)=>sum+(m.vertices[v]!.weights[column]??0),0)/neighbors.length:base;}
        // Strength is Replace's chosen value, not its approach-to-one rate.
        // Linear feather blending is FBones policy, not exact brush parity.
        const value=brush.mode==='replace'?base+(brush.strength-base)*covered:brush.mode==='add'?Math.min(1,base+amount):brush.mode==='subtract'?Math.max(0,base-amount):base+(target-base)*amount;
        return[{vertex:i,value}];
      });
      return changes.length?(g.weightAttachment!==undefined?{type:'paintAttachmentWeights',id:g.weightAttachment,bone:g.weightBone,changes,...locks}:{type:'paintWeights',id:g.slot!.id,bone:g.weightBone,changes}):null;
    }
    if(g.slot?.mesh) {
      const m=g.slot.mesh,points=meshPoints(g.base,m),dx=(current.x-g.start.x)/zoom,dy=-(current.y-g.start.y)/zoom;
      if(g.kind==='draw') {
        const target=nearestVertex(points,location,10/zoom), from=g.fromVertex??null;
        if(target!==null) {
          if(from!==null&&target!==from)return {type:'meshEdge',id:g.slot.id,a:from,b:target,remove:false};
          return null;
        }
        return {type:'meshStroke',id:g.slot.id,from,points:[location],editUvs:scene.meshEditUvs??true};
      }
      if(g.kind==='slot')return {type:'moveMesh',id:g.slot.id,dx,dy};
      if(g.kind==='vertex' && g.vertex!==undefined){
        const anchor=points[g.vertex]!;
        const vertices=points.flatMap((p,i)=>{const weight=i===g.vertex?1:scene.softSelection?falloff(Math.hypot(p.x-anchor.x,p.y-anchor.y)*zoom,scene.softSize??100,scene.softFeather??0.6):0;return weight?[{vertex:i,x:p.x+dx*weight,y:p.y+dy*weight}]:[];});
        return {type:'moveVertices',id:g.slot.id,vertices,editUvs:scene.meshEditUvs??true};
      }

    }
    if (g.kind === 'slot' && g.slot){const edit=movedImage(g.base, g.slot, g.origin.x + (current.x - g.start.x) / zoom, g.origin.y - (current.y - g.start.y) / zoom);return scene.sceneEditing&&scene.inspectedAttachment?.slot===g.slot.id?{type:'updateAttachment',id:scene.inspectedAttachment.id,x:edit.x,y:edit.y,rotation:edit.rotation,scaleX:edit.scaleX,scaleY:edit.scaleY}:edit;}
    if (g.kind === 'create') return creation(g.base, g.bone, g.origin, location);
    if(g.kind==='transform' && g.transformMode && g.handle) {
      const pivot=g.pivot??g.origin,screenPivot=g.screenPivot??screen(pivot.x,pivot.y);
      if(g.handle==='rotate'&&Math.hypot(current.x-screenPivot.x,current.y-screenPivot.y)>2) {
        const angle=pointerAngle(screenPivot,current);
        g.rotationTotal=(g.rotationTotal??0)+angleDelta(g.rotationPrevious??angle,angle);
        g.rotationPrevious=angle;
      }
      const delta=boneGestureDelta(g,g.handle,screenPivot,current);
      const local=g.localTranslation;
      if(local){
        if(!g.changed)return null;
        const x=local.position.x+delta.dx,y=local.position.y+delta.dy;
        if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Use finite Local Translate coordinates.');
        if(x===local.position.x&&y===local.position.y)return null;
        const center=g.handle==='translate';
        return {type:'setBoneLocalPosition',id:local.boneId,
          ...(center||x!==local.position.x?{x}:{}),...(center||y!==local.position.y?{y}:{}),
          ...(g.compensation?.bones?{compensateBones:true}:{}),...(g.compensation?.images?{compensateImages:true}:{})};
      }
      const parent=g.parentTranslation;
      if(parent){
        if(g.compensation&&!g.changed)return null;
        const bone=g.base.find(item=>item.id===parent.boneId);
        if(!bone)return null;
        const beforeX=Math.fround(bone.x),beforeY=Math.fround(bone.y);
        const x=Math.fround(beforeX+delta.dx),y=Math.fround(beforeY+delta.dy);
        if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1_000_000||Math.abs(y)>1_000_000)
          throw Error('Use finite coordinates within the supported bone position range.');
        if(x===beforeX&&y===beforeY)return null;
        return {type:'setBoneParentPosition',id:bone.id,...(x===beforeX?{}:{x}),...(y===beforeY?{}:{y}),
          ...(g.compensation?.bones?{compensateBones:true}:{}),...(g.compensation?.images?{compensateImages:true}:{})};
      }
      if(g.compensation){
        if(g.transformMode==='shear'){
          if(!g.changed||(g.handle!=='shearX'&&g.handle!=='shearY'))return null;
          const axis=g.handle==='shearX'?'x':'y';
          const angle=Math.fround(axis==='x'?delta.shearX:delta.shearY);
          if(!angle)return null;
          return {type:'shearBoneWithCompensation',id:g.bone,mode:'worldDelta',axis,angle,
            compensateBones:g.compensation.bones,compensateImages:g.compensation.images};
        }
        if(g.transformMode==='scale'){
          const x=Math.fround(delta.scaleX),y=Math.fround(delta.scaleY);
          if(!g.changed||(x===1&&y===1))return null;
          return {type:'scaleBoneWithCompensation',id:g.bone,mode:'localFactor',...(x===1?{}:{x}),...(y===1?{}:{y}),
            compensateBones:g.compensation.bones,compensateImages:g.compensation.images};
        }
        if(g.transformMode==='rotate'){
          if(!g.changed||!delta.rotation)return null;
          return {type:'rotateBoneWithCompensation',id:g.bone,mode:'worldDelta',angle:delta.rotation,
            compensateBones:g.compensation.bones,compensateImages:g.compensation.images};
        }
        if(!g.changed||(!delta.dx&&!delta.dy))return null;
        return {type:'translateBoneWithCompensation',id:g.ids?.[0]??g.bone,dx:delta.dx,dy:delta.dy,
          compensateBones:g.compensation.bones,compensateImages:g.compensation.images};
      }
      return {type:'transformBones',ids:g.ids??[g.bone],mode:g.transformMode,pivotX:pivot.x,pivotY:pivot.y,
        ...delta,...(g.transformMode==='translate'?{}:{individual:g.individual??true}),...(g.transformMode==='scale'?{localAxes:true}:{})};
    }
    if(g.kind==='length')return {type:'length',id:g.bone,...location};
    if (g.kind === 'move') return { type: 'move', id: g.bone, x: g.origin.x + (current.x - g.start.x) / zoom, y: g.origin.y - (current.y - g.start.y) / zoom };
    if (g.kind === 'tip') return { type: 'tip', id: g.bone, ...location };
    return null;
  }
  function safeEditFor(g:Gesture,current:Point):RigEdit|null {
    try{return editFor(g,current);}
    catch(error){g.invalid=true;if(!g.errorReported){g.errorReported=true;options?.onImageError?.(error instanceof Error?error.message:String(error));}return null;}
  }
  function previewOperation(g: Gesture, edit: RigEdit) {
    if(g.adjustment&&edit.type==='transformBones'){
      const {bones,feedback}=g.adjustment.preview(edit);
      previewAuthored=bones;preview=bones;g.adjustmentFeedback=feedback;
    }
    else if(edit.type==='rotateBoneWithCompensation'||edit.type==='scaleBoneWithCompensation'||edit.type==='shearBoneWithCompensation'){
      const slots=g.slots??[];
      const result=edit.type==='rotateBoneWithCompensation'?previewCompensatedRotation(g.base,slots,edit):
        edit.type==='scaleBoneWithCompensation'?previewCompensatedScale(g.base,slots,edit):previewCompensatedShear(g.base,slots,edit);
      previewAuthored=result.bones;preview=result.bones;previewSlots=result.slots;
      g.compensationApplied=result.applied;
      if(edit.type==='scaleBoneWithCompensation')g.adjustmentFeedback={scaleX:edit.x??1,scaleY:edit.y??1};
      if(edit.type==='shearBoneWithCompensation')g.adjustmentFeedback=edit.axis==='x'?{shearX:edit.angle}:{shearY:edit.angle};
    }
    else if(edit.type==='translateBoneWithCompensation'||edit.type==='setBoneLocalPosition'||(edit.type==='setBoneParentPosition'&&g.compensation)){
      const result=previewCompensatedTranslation(g.base,g.slots??[],edit);
      previewAuthored=result.bones;preview=result.bones;previewSlots=result.slots;
      g.compensationApplied=result.applied;
      if(edit.type==='setBoneLocalPosition'&&g.localTranslation){
        const {x,y}=localTranslationDisplacement(g.localTranslation,result.delta.dx,result.delta.dy);
        g.adjustmentFeedback={dx:x,dy:y};
      }else if(edit.type==='setBoneParentPosition'){
        const before=g.base.find(bone=>bone.id===edit.id);
        // Translate feedback uses the gizmo's Parent axes. The preview itself uses world displacement.
        g.adjustmentFeedback=before?{dx:edit.x===undefined?0:edit.x-Math.fround(before.x),
          dy:edit.y===undefined?0:edit.y-Math.fround(before.y)}:undefined;
      }else g.adjustmentFeedback=result.delta;
    }
    else if(edit.type==='transformAttachments')previewSlots=previewAttachmentTransform(g.base,g.slots??[],edit);
    else if(edit.type==='setRegionPosition')previewSlots=previewRegionPosition(g.slots??[],edit);
    else if((edit.type==='paintAttachmentWeights'||edit.type==='setAttachmentWeight')&&g.binding){const changes=edit.type==='paintAttachmentWeights'?edit.changes:[{vertex:edit.vertex,value:edit.value}];previewSlots=previewAttachmentBinding(g.slots??[],edit.id,previewBindingWeights(g.base,g.binding,edit.bone,changes,'scene',edit.lockedBones));}
    else if(edit.type==='setWeight'&&g.slot?.mesh)previewSlots=withMesh(g.slots??[],g.slot.id,previewBindingWeights(g.base,g.slot.mesh,edit.bone,[{vertex:edit.vertex,value:edit.value}],'legacy'));
    else if(edit.type==='moveClippingVertices'&&g.clip?.clipping){
      const c=g.clip.clipping,next=previewBindingVertices(g.base,c,edit.vertices);
      previewSlots=(g.slots??[]).map(s=>({...s,attachments:s.attachments?.map(a=>a.id===g.clip!.id?{...a,clipping:{...c,vertices:next.vertices}}:a)}));
    }
    else if(g.slot?.mesh && ['moveMesh','moveVertices','paintWeights'].includes(edit.type)) {
      const m=g.slot.mesh;
      const result=edit.type==='moveMesh'?previewVertices(g.base,m,meshPoints(g.base,m).map((p,vertex)=>({vertex,x:p.x+edit.dx,y:p.y+edit.dy})))
        :edit.type==='moveVertices'?previewMeshEdit(g.base,m,edit.vertices,edit.editUvs??true):edit.type==='paintWeights'?previewWeights(g.base,m,edit.bone,edit.changes):m;
      const attachmentId=scene.sceneEditing&&scene.inspectedAttachment?.mesh===m?scene.meshDisplay?.attachmentId:undefined;
      const slotId=g.slot.id,slots=scene.slots??[];
      previewSlots=attachmentId===undefined?withMesh(slots,slotId,result):slots.map(slot=>{
        if(slot.id!==slotId)return slot;
        return {...slot,mesh:slot.activeAttachmentId===attachmentId?result:slot.mesh,
          attachments:slot.attachments?.map(attachment=>attachment.id===attachmentId?{...attachment,mesh:result}:attachment)};
      });
    }
    else if (edit.type === 'updateSlot' && g.slot?.region) previewSlots = (scene.slots ?? []).map(s => s.id === edit.id ? { ...s, region: { ...g.slot!.region!, x:edit.x, y:edit.y } } : s);
    else{
      const authored=edit.type==='transformBones'?previewTransformBones(g.base,edit):previewEdit(g.base,edit);
      const evaluate=scene.hasConstraints||(scene.requiresBonePose&&scene.mode==='bones');
      previewAuthored=authored;
      preview=evaluate&&options?.previewBones?options.previewBones(authored):authored;
    }
  }
  function safePreview(g:Gesture,edit:RigEdit) {
    try{previewOperation(g,edit);g.invalid=false;return true;}
    catch(error){preview=null;previewSlots=null;previewAuthored=null;g.adjustmentFeedback=undefined;g.compensationApplied=undefined;g.invalid=true;if(!g.errorReported){g.errorReported=true;options?.onImageError?.(error instanceof Error?error.message:String(error));}return false;}
  }
  function panBy(from:Point,to:Point){
    if(from.x===to.x&&from.y===to.y)return;
    panX+=to.x-from.x;panY+=to.y-from.y;drawGrid();
  }
  function moveSecondaryPan(g:Gesture,current:Point,event:PointerEvent){
    if(!g.changed){
      const outside=(p:Point)=>Math.hypot(p.x-g.start.x,p.y-g.start.y)>=DRAG_THRESHOLD;
      g.changed=outside(current)||(event.getCoalescedEvents?.().some(sample=>outside(point(sample)))??false);
      if(!g.changed)return;
    }
    // Start from the original press on the first pan, including any motion below the threshold.
    panBy(g.last,current);
    g.last=current;
  }
  const move = (event: PointerEvent) => {
    trackRulerPointer(event);
    hover=point(event);
    const boneHoverChanged=!gesture&&reportBoneHover(pointerBoneHover(hover));
    if (!gesture || gesture.id !== event.pointerId) {cursor();if(boneHoverChanged||scene.mode==='weights'||gizmoState()||imageGizmoState()||scene.clippingDraft||scene.meshOutline)draw();return;}
    const current = hover, g = gesture;
    if(g.previousToolClick){
      if(event.buttons!==2||!unmodifiedPointer(event))g.previousToolClick.eligible=false;
      const wasPanning=g.changed;
      moveSecondaryPan(g,current,event);
      if(g.changed&&!wasPanning)cursor();
      draw();return;
    }
    g.changed ||= Math.hypot(current.x - g.start.x, current.y - g.start.y) >= DRAG_THRESHOLD;
    if (g.kind === 'pan') { panBy(g.last,current); }
    else if(g.outlinePoint){
      if(g.changed){outlineTap=null;g.outlinePoint.previewUv=movedOutlineUv(g.outlinePoint,g.base,current);}
    }
    else if(g.kind==='attachmentPivot'){if(g.changed)moveAttachmentPivot(g,current);}
    else {
      const edit=safeEditFor(g,current);
      if(edit)safePreview(g,edit);
      else if(g.compensation||g.localTranslation){
        preview=null;previewAuthored=null;previewSlots=null;g.compensationApplied=undefined;g.adjustmentFeedback={dx:0,dy:0};
      }else if(g.regionSnap)previewSlots=null;
      else if(g.parentTranslation){preview=null;previewAuthored=null;}
    }
    g.last = current; draw();
  };
  function commit(edit:RigEdit,revision:number,poseEpoch=preparedPose?.poseEpoch,adjustment?:ViewportAdjustment,compensationApplied?:CompensationOptions) {
    if(!options)return;
    pending=true;
    const operation=adjustment?(edit.type==='transformBones'?adjustment.commit(edit):Promise.resolve(false)):options.onCommit(edit,revision,poseEpoch,compensationApplied);
    void operation.finally(()=>{pending=false;preparedPose=null;preview=null;previewAuthored=null;previewSlots=null;options.onEndBonePreview?.();if(!ownsDraftPose())options.onEndGeometry?.();cursor();draw();});
  }
  function releaseOutlinePoint(g:Gesture,held:OutlinePointGesture,event:PointerEvent) {
    options?.onMeshOutlinePointGesture?.(false);
    const previousTap=outlineTap;
    outlineTap=null;
    const {draft,index}=held,current=point(event);
    hover=event.pointerType==='touch'?null:current;
    if(draft!==scene.meshOutline||scene.meshOutlineBusy||scene.busy||!scene.editable||event.button!==0)return;
    if(g.changed||Math.hypot(current.x-g.start.x,current.y-g.start.y)>=DRAG_THRESHOLD){
      const uv=movedOutlineUv(held,g.base,current);
      if(uv)options?.onMoveMeshOutlinePoint?.(draft,index,uv);
      return;
    }
    if(!outlineUvAt(draft,g.base,current)||nearestVertex(outlineScreenPoints(draft,g.base),current,OUTLINE_POINT_RADIUS)!==index)return;
    if(held.shift&&event.shiftKey){options?.onRemoveMeshOutlinePoint?.(draft,index);return;}
    if(!held.plain||!unmodifiedPointer(event))return;
    if(index===0&&draft.points.length>=3){options?.onFinishMeshOutline?.(draft);return;}
    outlineTap={draft,index,repeated:previousTap?.draft===draft&&previousTap.index===index};
  }
  const doubleClick = (event:MouseEvent) => {
    const tap=outlineTap;
    outlineTap=null;
    if(!tap?.repeated||tap.draft!==scene.meshOutline||gesture||scene.meshOutlineBusy||scene.busy||!scene.editable||!unmodifiedPointer(event))return;
    const at=point(event);
    if(!outlineUvAt(tap.draft,scene.bones,at)||nearestVertex(outlineScreenPoints(tap.draft,scene.bones),at,OUTLINE_POINT_RADIUS)!==tap.index)return;
    event.preventDefault();
    options?.onRemoveMeshOutlinePoint?.(tap.draft,tap.index);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerType === 'touch') clearRulerPointer();
    else trackRulerPointer(event);
    if(preparingPointer===event.pointerId){preparingPointer=null;preparation++;pending=false;options?.onEndGeometry?.();return;}
    if (!gesture || gesture.id !== event.pointerId){endIdleGeometry();return;}
    const g = gesture; gesture = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if(g.previousToolClick){
      moveSecondaryPan(g,point(event),event);
      if(g.previousToolClick.eligible&&!g.changed&&event.button===2&&event.buttons===0&&!space&&
        unmodifiedPointer(event)&&canSwapPreviousTool())options?.onPreviousToolSwap?.();
      cursor();draw();return;
    }
    if(g.outlinePoint){releaseOutlinePoint(g,g.outlinePoint,event);cursor();draw();return;}
    if(g.adjustment)options?.onAdjustmentDragging?.(false);
    if(g.kind==='attachmentPivot'){
      if(g.changed)moveAttachmentPivot(g,point(event));
      preparedPose=null;options?.onEndGeometry?.();cursor();draw();return;
    }
    if(g.kind==='box') {
      if(layerSelection.bones){
        const current=point(event),hits=g.changed?worldBones(g.base).filter(b=>boneInBox(b,g.start,current)).map(b=>b.id):[];
        const ids=g.additive?[...new Set([...(g.ids??[]),...hits])]:hits;
        selectBones(ids,ids.at(-1)??null,g.additive?undefined:'complete');
      }
      preview=null;previewSlots=null;endIdleGeometry();cursor();draw();return;
    }
    if(g.kind==='weightBox'&&g.binding){
      const current=point(event),hits=g.changed?bindingPoints(g.base,g.binding).flatMap((p,i)=>inBox(screen(p.x,p.y),g.start,current)?[i]:[]):[];
      const ids=g.additive?[...new Set([...(g.ids??[]),...hits])]:hits;
      selectWeightVertices(ids,ids.at(-1)??null,!g.additive);preview=null;previewSlots=null;preparedPose=null;options?.onEndGeometry?.();cursor();draw();return;
    }
    if(g.kind==='imageBox'){
      if(layerSelection.images){
        const hits=g.changed?sceneImagesInBox(g.base,g.slots??[],world(g.start),world(point(event))):[];
        const ids=g.additive?[...new Set([...(g.ids??[]),...hits])]:hits;
        selectImages(ids,ids.at(-1)??null,g.additive?undefined:'complete');
      }
      preview=null;previewSlots=null;endIdleGeometry();cursor();draw();return;
    }
    let edit = g.changed || g.kind==='draw' ? safeEditFor(g, point(event)) : null;
    if(g.kind==='create'&&!g.changed&&!g.pickParent) {
      const parent=worldBones(g.base).find(b=>b.id===g.bone),angle=(parent?.angle??0)*Math.PI/180;
      const end=screen(g.origin.x+Math.cos(angle)*12,g.origin.y+Math.sin(angle)*12);
      edit=safeEditFor(g,end);if(edit?.type==='create')edit={...edit,length:12,rotation:0};
    }
    if (edit && options) {
      if(safePreview(g,edit))commit(edit,g.revision,g.poseEpoch,g.adjustment,g.compensationApplied);else cancel();
    } else { preview = null;previewAuthored=null;options?.onEndBonePreview?.();previewSlots = null;preparedPose=null;if(!ownsDraftPose())options?.onEndGeometry?.();draw(); }
    cursor();
  };
  const lost = (event: PointerEvent) => { if(event.type==='pointercancel')clearRulerPointer();if (gesture?.id === event.pointerId||preparingPointer===event.pointerId) cancel();reportBoneHover(null); };
  const leave=()=>{hover=null;clearRulerPointer();reportBoneHover(null);cursor();draw();};
  function clampZoom(value: number) {
    return Math.max(VIEWPORT_MIN_ZOOM_PERCENT / 100, Math.min(VIEWPORT_MAX_ZOOM_PERCENT / 100, value));
  }
  function updateCamera(nextZoom: number, nextPanX: number, nextPanY: number) {
    if (![nextZoom, nextPanX, nextPanY].every(Number.isFinite)) return false;
    zoom = nextZoom; panX = nextPanX; panY = nextPanY;
    onZoom(Math.round(zoom * 100));
    drawGrid(); draw();
    return true;
  }
  function zoomAt(value: number, offsetX = 0, offsetY = 0) {
    if (destroyed || gesture || pending || preparingPointer !== null) return false;
    const next = clampZoom(value), ratio = next / zoom;
    return updateCamera(next, offsetX - (offsetX - panX) * ratio, offsetY - (offsetY - panY) * ratio);
  }
  function fit() {
    if (destroyed || gesture || pending || preparingPointer !== null || !scene.bones.length) return false;
    const { width, height } = app.screen;
    let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
    function include(x: number, y: number) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      left = Math.min(left, x); right = Math.max(right, x);
      bottom = Math.min(bottom, y); top = Math.max(top, y);
    }

    // Isolate frames the inspected mesh; normal Fit includes the current pose.
    // The extent of clipped artwork is conservative in both views.
    try {
      const slots = scene.slots ?? [], isolated = isolatedMeshSlot(slots, scene.meshDisplay);
      for (const bone of isolated ? [] : worldBones(scene.bones)) {
        include(bone.worldX, bone.worldY);
        include(bone.tipX, bone.tipY);
      }
      for (const slot of worldRegions(scene.bones, isolated ? [isolated] : slots)) {
        if (!slot.visible) continue;
        if (slot.mesh) {
          for (const vertex of meshPoints(scene.bones, slot.mesh)) include(vertex.x, vertex.y);
        } else {
          const w = slot.region.width / 2, h = slot.region.height / 2;
          const extentX = Math.abs(slot.a * w) + Math.abs(slot.c * h);
          const extentY = Math.abs(slot.b * w) + Math.abs(slot.d * h);
          include(slot.worldX - extentX, slot.worldY - extentY);
          include(slot.worldX + extentX, slot.worldY + extentY);
        }
      }
    } catch { return false; }
    if (!Number.isFinite(left)) return false;

    const spanX = right - left, spanY = top - bottom;
    const innerWidth = width - 2 * Math.min(FIT_MARGIN, width * 0.2);
    const innerHeight = height - 2 * Math.min(FIT_MARGIN, height * 0.2);
    const next = spanX === 0 && spanY === 0 ? 1 : clampZoom(Math.min(innerWidth / spanX, innerHeight / spanY));
    const centerX = left / 2 + right / 2, centerY = bottom / 2 + top / 2;
    return updateCamera(next, -centerX * next, centerY * next);
  }
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    trackRulerPointer(event);
    const pointer = point(event);
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? app.screen.height : 1;
    zoomAt(zoom * Math.exp(-event.deltaY * unit * 0.0015), pointer.x - app.screen.width / 2, pointer.y - app.screen.height / 2);
  };
  const dragover=(event:DragEvent)=>{
    if(scene.meshOutline||scene.meshOutlineBusy)return;
    const types=Array.from(event.dataTransfer?.types??[]);
    const own=types.includes('application/x-fbones-image')||types.includes('application/x-fbones-images');
    if(scene.parentPicking||(!options?.onDropImage&&!options?.onDropImages)||!scene.editable||scene.busy||pending||(!own&&!parseImageDropKeys(event.dataTransfer,scene.imageKeys??[])))return;
    event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='copy';
  };
  const drop=(event:DragEvent)=>{
    if(scene.meshOutline||scene.meshOutlineBusy)return;
    const keys=parseImageDropKeys(event.dataTransfer,scene.imageKeys??[]);
    if(scene.parentPicking||!keys||(!options?.onDropImage&&!options?.onDropImages)||!scene.editable||scene.busy||pending)return;
    if(keys.length>1&&!options?.onDropImages)return;
    event.preventDefault();cancel();const location=world(point(event));pending=true;
    const operation=options.onDropImages?options.onDropImages(keys,location.x,location.y):options.onDropImage!(keys[0]!,location.x,location.y);
    void operation.finally(()=>{pending=false;draw();});
  };
  const context = (event: MouseEvent) => event.preventDefault();
  const previousToolKey = (event: KeyboardEvent) => {
    const click=gesture?.previousToolClick;
    if(!click?.eligible||gesture?.changed)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();cancel();
    }else if(event.code==='Space'||!unmodifiedPointer(event))click.eligible=false;
  };
  function interactionActive() {
    return !destroyed&&(gesture!==null||pending||preparingPointer!==null||space);
  }
  const keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if(event.key==='PageDown'||event.key==='PageUp'){
      if(event.target===canvas&&!event.defaultPrevented&&!event.isComposing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&
        !interactionActive()&&options?.onVisitSceneSelectionHistory?.(event.key==='PageDown'?-1:1))event.preventDefault();
      return;
    }
    if(event.code==='Space'&&(event.target as HTMLElement|null)?.closest('button, a, [role="button"]'))return;
    if (event.code === 'Space') { event.preventDefault(); space = true;if(scene.mode==='weights'){cancel();selectWeightVertices([],null);draw();}cursor(); }
    // App owns outline shortcuts. Escape here only releases pointer capture.
    if(scene.meshOutline||scene.meshOutlineBusy){if(event.key==='Escape'&&gesture)cancel();return;}
    if(scene.mode==='weights'&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){
      const target=weightTarget();if(target){event.preventDefault();cancel();selectWeightVertices(target.binding.vertices.map((_,i)=>i),scene.selectedVertex??0,true);draw();}return;
    }
    if(scene.mode==='weights'&&event.key==='Escape'){
      event.preventDefault();cancel();reportBoneHover(null);options?.onClearHover?.();selectWeightVertices([],null);cursor();draw();return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if(gesture?.adjustment||gesture?.regionSnap||gesture?.compensation||gesture?.localTranslation||preparingPointer!==null&&scene.timelineAdjust?.enabled){cancel();return;}
      edgeStart=null;reportBoneHover(null);options?.onClearHover?.();cancel();
      attachmentPivot=null;
      scene={...scene,selected:null,selectedBones:[],selectedSlot:null,selectedAttachments:[],selectedVertex:null,tool:'translate'};
      if(options?.onEscape)options.onEscape(event);else{options?.onSelect(null);options?.onSelectSlot?.(null);options?.onSelectVertex?.(null);}
      cursor();draw();
    }
  };
  const keyup = (event: KeyboardEvent) => { if (event.code === 'Space') { space = false; cursor(); } };
  const blur = () => { space = false;hover=null;clearRulerPointer();reportBoneHover(null);options?.onClearHover?.();cancel(); };
  const observer = new ResizeObserver(resize);
  try { resize(); }
  catch (error) { app.destroy({ removeView: true }, { children: true }); throw error; }
  observer.observe(host); window.addEventListener('resize', resize); window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
  window.addEventListener('keydown',previousToolKey,true);
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', lost); canvas.addEventListener('lostpointercapture', lost);
  canvas.addEventListener('dblclick',doubleClick);
  canvas.addEventListener('pointerenter',trackRulerPointer); canvas.addEventListener('pointerleave',leave);
  canvas.addEventListener('dragover',dragover);canvas.addEventListener('drop',drop);
  canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('contextmenu', context);
  return {
    interactionActive,
    async capture() {
      const revision=scene.revision,documentId=scene.documentId,deadline=performance.now()+6000;
      while(imageLayer&&!imageLayer.ready(documentId??-1,scene.bones,scene.slots??[],scene.meshDisplay)){
        if(destroyed||scene.revision!==revision||scene.documentId!==documentId)throw Error('The viewport changed during capture.');
        if(performance.now()>deadline)throw Error('Visible image resources are not ready.');
        await new Promise(resolve=>setTimeout(resolve,25));
      }
      if(destroyed||gesture||pending||preparingPointer!==null||scene.revision!==revision||scene.documentId!==documentId)throw Error('The viewport is busy or changed.');
      const scale=Math.min(1,1024/Math.max(canvas.width,canvas.height));
      const output=document.createElement('canvas');output.width=Math.max(1,Math.round(canvas.width*scale));output.height=Math.max(1,Math.round(canvas.height*scale));
      const context=output.getContext('2d');if(!context)throw Error('Capture canvas is unavailable.');
      // Read the WebGL drawing buffer synchronously in the same task as render.
      draw();context.drawImage(canvas,0,0,output.width,output.height);
      return{dataUrl:output.toDataURL('image/png'),width:output.width,height:output.height,zoom,panX,panY};
    },
    setGrid(visible) { grid = visible; drawGrid(); draw(); },
    setRulersVisible(visible) {
      if (destroyed || rulersVisible === visible) return;
      rulersVisible = visible;
      if (visible) queueRulerFrame();
      else {
        cancelRulerFrame();
        rulerFrame = null;
      }
    },
    setLayerVisibility(visibility) {
      if (layerVisibility.bones === visibility.bones && layerVisibility.images === visibility.images && layerVisibility.others === visibility.others) return;
      layerVisibility = {...visibility};
      if (imageLayer) {
        imageLayer.container.renderable = visibility.images;
        imageLayer.showPassiveClippingOutlines = visibility.others;
      }
      draw();
    },
    setLayerSelection(selection) {
      const bonesChanged=layerSelection.bones!==selection.bones;
      if(!bonesChanged&&layerSelection.images===selection.images&&layerSelection.others===selection.others)return;
      layerSelection={...selection};
      if(bonesChanged&&hover&&!gesture)reportBoneHover(pointerBoneHover(hover));
      cursor();draw();
    },
    setNameTags(layers) {
      nameTagLayers = {...layers};
      if (layers.bones || layers.images || layers.others) queueNameTagFrame();
      else cancelNameTagFrame();
    },
    setAnimateWeightInspection(inspection) {
      if(inspection?.attachmentId===animateWeightInspection?.attachmentId&&inspection?.vertex===animateWeightInspection?.vertex)return;
      animateWeightInspection=inspection;
      draw();
    },
    canSelectNameTag,
    wheelZoom: wheel,
    panFromNameTag(event) { if (space || event.button === 1 || event.button === 2) down(event); },
    setScene(value) {
      if(value.documentId!==scene.documentId||!value.bones.some(b=>b.id===viewportHoveredBone))reportBoneHover(null);
      const nextPivotMode=options?.pivotMode?.()??'individual',selectionChanged=attachmentSelectionKey(value.selectedAttachments)!==attachmentSelectionKey(scene.selectedAttachments);
      const resetPivot=selectionChanged||value.documentId!==scene.documentId||value.mode!=='images'||value.revision!==scene.revision&&!pending;
      const weightSelectionChanged=attachmentSelectionKey(value.selectedVertices)!==attachmentSelectionKey(scene.selectedVertices)||attachmentSelectionKey(value.selectedInfluences)!==attachmentSelectionKey(scene.selectedInfluences)||attachmentSelectionKey(value.lockedInfluences)!==attachmentSelectionKey(scene.lockedInfluences);
      const adjustmentChanged=value.timelineAdjust!==scene.timelineAdjust||(scene.timelineAdjust?.enabled&&value.selected!==scene.selected);
      const compensationChanged=value.compensation?.bones!==scene.compensation?.bones||value.compensation?.images!==scene.compensation?.images
        ||!!gesture?.compensation&&attachmentSelectionKey(value.selectedBones)!==attachmentSelectionKey(scene.selectedBones);
      const parentAxesChanged=value.parentTranslation!==scene.parentTranslation
        ||!!gesture?.parentTranslation&&attachmentSelectionKey(value.selectedBones)!==attachmentSelectionKey(scene.selectedBones);
      const localAxesChanged=value.localTranslation!==scene.localTranslation||value.localTranslationUnavailable!==scene.localTranslationUnavailable
        ||!!gesture?.localTranslation&&attachmentSelectionKey(value.selectedBones)!==attachmentSelectionKey(scene.selectedBones);
      const outlineChanged=!!value.meshOutline!==!!scene.meshOutline||!!gesture?.outlinePoint&&(
        value.meshOutline!==gesture.outlinePoint.draft||value.bones!==gesture.base||value.meshOutlineBusy||value.busy||!value.editable);
      const toolContextChanged=value.requiresBonePose!==scene.requiresBonePose||value.parentPicking!==scene.parentPicking||
        selectionChanged||value.inspectedAttachment?.id!==scene.inspectedAttachment?.id||value.revision!==scene.revision||
        value.tool!==scene.tool||value.mode!==scene.mode||value.documentId!==scene.documentId||value.selectedSlot!==scene.selectedSlot;
      const boneSelectionChanged=!!gesture?.previousToolClick&&(value.selected!==scene.selected||
        attachmentSelectionKey(value.selectedBones)!==attachmentSelectionKey(scene.selectedBones));
      // A replacement marquee can clear the selected transform's axes before release.
      // Its pointer capture is independent of those transform controls.
      const selectingBox=gesture?.kind==='box'||gesture?.kind==='imageBox';
      const transformChanged=!selectingBox&&(adjustmentChanged||compensationChanged||parentAxesChanged||localAxesChanged);
      const changed = toolContextChanged||transformChanged||outlineChanged||value.snapRegionPixels!==scene.snapRegionPixels||value.poseKey!==scene.poseKey||weightSelectionChanged||nextPivotMode!==pivotMode||value.meshTool!==scene.meshTool||value.meshEditUvs!==scene.meshEditUvs||value.influence!==scene.influence;
      scene = value; pivotMode=nextPivotMode;
      if(gesture?.previousToolClick){
        // Animated poses can refresh behind a camera gesture without changing its tool context.
        if(toolContextChanged||boneSelectionChanged||!canSwapPreviousTool())cancel(false);
      }else if(changed){edgeStart=null;cancel(false);}
      if(resetPivot)attachmentPivot=null;
      cursor(); draw();
    },
    setZoom(percent) { return Number.isFinite(percent) && zoomAt(percent / 100); },
    fit,
    reset() { cancel(); updateCamera(1, 0, 0); },
    resize,
    destroy() {
      cancel();
      destroyed = true; cancelRulerFrame(); cancelNameTagFrame(); rulerClientPoint = null; rulerFrame = null;
      observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur);
      window.removeEventListener('keydown',previousToolKey,true);
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('dragover',dragover);canvas.removeEventListener('drop',drop);
      canvas.removeEventListener('pointercancel', lost); canvas.removeEventListener('lostpointercapture', lost); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', context);
      canvas.removeEventListener('dblclick',doubleClick);
      canvas.removeEventListener('pointerenter',trackRulerPointer);canvas.removeEventListener('pointerleave',leave);reportBoneHover(null);options?.onClearHover?.();
      ghostLayer.releaseImages();
      imageLayer?.destroy();
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
