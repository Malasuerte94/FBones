// Install static Pixi shader/uniform implementations under the strict CSP.
import 'pixi.js/unsafe-eval';
import { Application, Graphics } from 'pixi.js';
import { ImageLayer } from './ImageLayer.ts';
import { meshPoints, nearestVertex, nearestEdge, previewVertices, previewWeights, withMesh, falloff } from '../domain/meshes.ts';
import { previewMeshEdit } from '../domain/meshEdit.ts';
import { imageAt, movedImage } from '../domain/images.ts';
import type { AttachmentView, BoneView, ClippingDraft, RigEdit, SlotView, EditMode, DenseBindingView } from '../domain/project.ts';
import {bindingPoints,previewBindingVertices,previewBindingWeights,boundaryEdges,bindingNeighbors,nearestBindingEdge} from '../domain/binding.ts';
import { creation, previewEdit, previewTransformBones, segmentDistance, worldBones } from '../domain/rig.ts';
import { parseImageDropKeys } from '../domain/imageSelection.ts';
import {boneHighlightStyle} from '../domain/boneHover.ts';
import {drawViewportBackdrop} from './viewportBackdrop.ts';
import { TransformGizmo } from './GizmoOverlay.ts';
import {clippingPoints,polygonContains} from '../domain/clipping.ts';
import {previewAttachmentTransform,previewAttachmentBinding,renderedAttachmentId,resolveAttachment,selectedAttachmentGeometry,sceneImagesInBox} from '../domain/sceneSelection.ts';
import { angleDelta, gizmoCursor, gizmoDelta, hitGizmo, pointerAngle, scaleBasis, selectedTopBones, transformPivot,
  type GizmoBasis, type GizmoHandle, type GizmoTool, type PivotMode } from './transformGizmo.ts';

export type ViewportTool = 'select' | 'pan' | 'create' | 'translate' | 'rotate' | 'scale' | 'shear' | 'pose' | 'length';
export interface ViewportScene {
  bones: BoneView[]; selected: number | null; selectedBones?: number[]; tool: ViewportTool;
  authoredBones?:BoneView[];hasConstraints?:boolean;requiresBonePose?:boolean;poseKey?:string;
  boneColors?: Record<number,number>; imageKeys?: string[];
  hoveredBone?:number|null;
  parentPicking?:boolean;
  sceneEditing?:boolean;selectedAttachments?:number[];inspectedAttachment?:AttachmentView|null;clippingDraft?:ClippingDraft|null;
  editable: boolean; busy: boolean; revision: number;
  slots?: SlotView[]; selectedSlot?: number | null; documentId?: number; mode?: EditMode; selectedVertex?: number | null; selectedVertices?:number[]; selectedInfluences?:number[]; lockedInfluences?:number[]; influence?: number | null;
  meshTool?: 'move' | 'add' | 'edge' | 'removeEdge' | 'draw' | 'delete'; meshEditUvs?:boolean; softSelection?: boolean; softSize?: number; softFeather?: number;
  brushMode?: 'direct' | 'add' | 'subtract' | 'replace' | 'smooth'; brushSize?: number; brushStrength?: number; brushFeather?: number;
}
interface Options {
  onSelect(id: number | null): void;
  onPickParent?(id:number):void;
  onSelectBones?(ids: number[], active: number | null): void;
  onHoverBone?(id:number|null):void;
  onClearHover?():void;
  onEscape?(): void;
  onDropImage?(key: string, x: number, y: number): Promise<boolean>;
  onDropImages?(keys: string[], x: number, y: number): Promise<boolean>;
  pivotMode?(): PivotMode;
  onSelectVertex?(index: number | null): void;
  onSelectVertices?(indices:number[],active:number|null):void;
  onSelectSlot?(id: number | null): void;
  onSelectAttachments?(ids:number[],active:number|null):void;
  onClippingPoint?(point:Point):void;
  onFinishClipping?():void;
  onPrepareGeometry?(revision:number):Promise<{bones:BoneView[];poseEpoch?:number}>;
  onEndGeometry?():void;
  onPauseSimulation?():void;
  onEndBonePreview?():void;
  previewBones?(bones:BoneView[]):BoneView[];
  loadImage?(documentId: number, name: string): Promise<string>;
  onImageError?(message: string): void;
  onCommit(edit: RigEdit, revision: number,poseEpoch?:number): Promise<boolean>;
}
export interface ViewportController {
  setGrid(visible: boolean): void;
  setScene(scene: ViewportScene): void;
  reset(): void; resize(): void; destroy(): void;
}
interface Point { x: number; y: number }
const attachmentSelectionKey=(ids:readonly number[]|undefined)=>[...new Set(ids??[])].sort((a,b)=>a-b).join(',');
interface Gesture {
  id: number; kind: 'pan' | 'move' | 'tip' | 'create' | 'slot' | 'vertex' | 'weights' | 'transform' | 'length' | 'box' | 'draw'|'imageBox'|'attachments'|'attachmentPivot'|'clipVertex'|'weightBox'; start: Point; last: Point;
  bone: number; origin: Point; revision: number; base: BoneView[]; changed: boolean; slot?: SlotView; vertex?: number; coverage?: number[]; invalid?:boolean; errorReported?:boolean; ids?:number[]; transformMode?:'translate'|'rotate'|'scale'|'shear'|'pose'; pivot?:Point; pickParent?:boolean; additive?:boolean; fromVertex?:number|null;
  handle?: GizmoHandle; screenPivot?: Point; rotationPrevious?: number; rotationStart?: number; rotationTotal?: number; individual?: boolean;
  basis?:GizmoBasis;
  clip?:AttachmentView;slots?:SlotView[];
  weightVertices?:number[];weightLocks?:number[];binding?:DenseBindingView;weightAttachment?:number;weightBone?:number;weightNeighbors?:number[][];
  brush?:{mode:'direct'|'add'|'subtract'|'replace'|'smooth';strength:number;size:number;feather:number;directGain:number};
  previousAttachmentPivot?:Point|null;
  poseEpoch?:number;
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
  const imageLayer = options?.loadImage ? new ImageLayer(options.loadImage, () => draw(), options.onImageError) : null;
  app.stage.addChild(backdropGraphics,gridGraphics);
  if (imageLayer) app.stage.addChild(imageLayer.container, imageLayer.overlay);
  app.stage.addChild(bonesGraphics);
  const transformGizmo = new TransformGizmo();
  app.stage.addChild(transformGizmo.container);
  let zoom = 1, panX = 0, panY = 0, grid = true, destroyed = false, space = false;
  let backdropWidth=-1,backdropHeight=-1;
  let scene: ViewportScene = { bones: [], selected: null, tool: 'select', editable: false, busy: false, revision: 0 };
  let gesture: Gesture | null = null, preview: BoneView[] | null = null, pending = false;
  let previewAuthored:BoneView[]|null=null;
  let preparation=0,preparingPointer:number|null=null,preparedPose:{revision:number;documentId:number|undefined;poseEpoch?:number}|null=null;
  let previewSlots: SlotView[] | null = null;
  // Session-only origin. It is never a saved attachment transform or history edit.
  let attachmentPivot:Point|null=null;
  let edgeStart: number | null = null, hover:Point|null=null;
  let viewportHoveredBone:number|null=null;
  function reportBoneHover(id:number|null){if(id===viewportHoveredBone)return false;viewportHoveredBone=id;options?.onHoverBone?.(id);return true;}
  let pivotMode: PivotMode = options?.pivotMode?.() ?? 'individual';
  const screen = (x: number, y: number): Point => ({ x: app.screen.width / 2 + panX + x * zoom, y: app.screen.height / 2 + panY - y * zoom });
  const world = (point: Point): Point => ({ x: (point.x - app.screen.width / 2 - panX) / zoom, y: (app.screen.height / 2 + panY - point.y) / zoom });
  const point = (event: Pick<PointerEvent,'clientX'|'clientY'>): Point => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const cursor = () => {
    if(gesture?.kind==='pan'){canvas.style.cursor='grabbing';return;}
    if(scene.parentPicking){canvas.style.cursor='crosshair';return;}
    if(space||scene.tool==='pan'){canvas.style.cursor='grab';return;}
    if(gesture?.kind==='attachmentPivot'){canvas.style.cursor='grabbing';return;}
    if(scene.tool==='create'&&scene.editable){canvas.style.cursor='crosshair';return;}
    if(gesture?.handle){canvas.style.cursor=gesture.handle==='rotate'?'grabbing':gizmoCursor(gesture.handle);return;}
    const imageState=imageGizmoState();
    if(imageState&&hover){
      canvas.style.cursor=atAttachmentPivot(imageState,hover)?'move':gizmoCursor(hitGizmo(imageState.tool,imageState.screenOrigin,hover));return;
    }
    const state=gizmoState();
    const hit=hover?boneAt(hover):null;
    const handle=state&&hover&&(!hit||state.ids.includes(hit.id))?hitGizmo(state.tool,state.screenOrigin,hover,state.basis):null;
    canvas.style.cursor=gizmoCursor(handle);
  };
  function gizmoState(bones:BoneView[]=preview??scene.bones) {
    if(!scene.editable||scene.selected===null||(scene.mode&&scene.mode!=='bones')||!['translate','rotate','scale','shear','pose'].includes(scene.tool))return null;
    const ids=selectedBones(),mode=scene.tool==='rotate'?pivotMode:'individual';
    const origin=transformPivot(bones,ids,scene.selected,mode);
    const basis=scene.tool==='scale'?scaleBasis(bones,ids,scene.selected):undefined;
    if(scene.tool==='scale'&&!basis)return null;
    return origin?{tool:scene.tool as GizmoTool,origin,screenOrigin:screen(origin.x,origin.y),ids,mode,basis:basis??undefined}:null;
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
  }
  function draw() {
    if (destroyed) return;
    if(previewAuthored&&scene.hasConstraints&&options?.previewBones)preview=options.previewBones(previewAuthored);
    bonesGraphics.clear();
    imageLayer?.draw(scene.documentId ?? -1, preview ?? scene.bones, previewSlots ?? scene.slots ?? [], scene.selectedSlot ?? null, screen, zoom, scene.mode, scene.selectedVertex, scene.influence,{ids:scene.selectedAttachments,inspected:scene.inspectedAttachment,vertices:scene.selectedVertices});
    const poses = worldBones(preview ?? scene.bones), byId = new Map(poses.map(b => [b.id, b]));
    for (const bone of poses) {
      const parent = byId.get(bone.parent ?? -2);
      if (parent) {
        const a = screen(parent.tipX, parent.tipY), b = screen(bone.worldX, bone.worldY);
        bonesGraphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0x4b525e, width: 1 });
      }
    }
    for (const bone of poses) {
      const a = screen(bone.worldX, bone.worldY), b = screen(bone.tipX, bone.tipY);
      const length = Math.hypot(b.x - a.x, b.y - a.y), selected = (scene.selectedBones??[scene.selected]).includes(bone.id) || bone.id === -1;
      const rgba=scene.boneColors?.[bone.id]??bone.color??0x9b9b9bff;
      const hovered=(scene.hoveredBone??viewportHoveredBone)===bone.id;
      const style=boneHighlightStyle(rgba>>>8,selected,scene.mode==='weights'&&scene.influence===bone.id,hovered);
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
        delta:gizmoDelta(g.handle,g.screenPivot,g.start,g.last,zoom,g.rotationTotal??0,g.basis)}:undefined;
      transformGizmo.draw(gizmo.tool,gizmo.screenOrigin,h,gizmo.mode,gizmo.ids.length,satellites,draft,app.screen,gizmo.basis);
    } else {
      const imageGizmo=imageGizmoState();
      if(imageGizmo){
        const g=gesture?.kind==='attachments'?gesture:null,h=hover?hitGizmo(imageGizmo.tool,imageGizmo.screenOrigin,hover):null;
        const draft=g?.handle&&g.screenPivot?{handle:g.handle,startAngle:g.rotationStart??0,rotation:g.rotationTotal??0,delta:gizmoDelta(g.handle,g.screenPivot,g.start,g.last,zoom,g.rotationTotal??0)}:undefined;
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
  }
  function resize() {
    app.renderer.resolution = Math.min(window.devicePixelRatio || 1, 3);
    app.renderer.resize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    if(backdropWidth!==app.screen.width||backdropHeight!==app.screen.height){
      backdropWidth=app.screen.width;backdropHeight=app.screen.height;
      drawViewportBackdrop(backdropGraphics,backdropWidth,backdropHeight);
    }
    drawGrid(); draw();
  }
  function endIdleGeometry(){
    if(!gesture&&!pending&&preparingPointer===null&&!scene.clippingDraft){preparedPose=null;options?.onEndGeometry?.();}
  }
  function cancel(redraw=true) {
    if(preparingPointer!==null)pending=false;
    preparation++;preparingPointer=null;preparedPose=null;
    if(gesture?.kind==='attachmentPivot')attachmentPivot=gesture.previousAttachmentPivot??null;
    const id = gesture?.id; gesture = null;
    if (!pending) { preview = null; previewSlots = null;previewAuthored=null;options?.onEndBonePreview?.(); }
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    endIdleGeometry();if(redraw){cursor();draw();}
  }
  function selectedBones() { return (scene.selectedBones??(scene.selected===null?[]:[scene.selected])).filter(id=>scene.bones.some(b=>b.id===id)); }
  function selectBones(ids:number[],active:number|null) {
    scene={...scene,selectedBones:ids,selected:active,selectedSlot:null};
    if(options?.onSelectBones) options.onSelectBones(ids,active); else options?.onSelect(active);
  }
  function selectImages(ids:number[],active:number|null){
    if(attachmentSelectionKey(ids)!==attachmentSelectionKey(scene.selectedAttachments))attachmentPivot=null;
    const slots=scene.slots??[],resolved=active===null?null:resolveAttachment(slots,active,scene.inspectedAttachment),selectedSlot=resolved?.slot.id??null;
    scene={...scene,selectedAttachments:ids,selectedSlot,inspectedAttachment:resolved?.attachment??null,selectedVertex:null};
    if(options?.onSelectAttachments)options.onSelectAttachments(ids,active);else options?.onSelectSlot?.(selectedSlot);
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
  function selectWeightVertices(ids:number[],active:number|null){
    const target=weightTarget();
    const valid=[...new Set(ids)].filter(i=>target&&Number.isInteger(i)&&i>=0&&i<target.binding.vertices.length).sort((a,b)=>a-b);
    const focused=active!==null&&valid.includes(active)?active:valid.at(-1)??null;
    scene={...scene,selectedVertices:valid,selectedVertex:focused};
    if(options?.onSelectVertices)options.onSelectVertices(valid,focused);else options?.onSelectVertex?.(focused);
  }
  function boneAt(p:Point) {
    return [...worldBones(scene.bones)].reverse().find(b=>segmentDistance(p.x,p.y,screen(b.worldX,b.worldY),screen(b.tipX,b.tipY))<=9);
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
  const down = (event: PointerEvent) => {
    if (gesture || pending || ![0, 1, 2].includes(event.button)) return;
    canvas.focus({ preventScroll: true });
    reportBoneHover(null);
    const start = point(event), location = world(start), pan = event.button !== 0 || space || (!scene.parentPicking&&scene.tool === 'pan');
    if (!pan && scene.busy) return;
    if(scene.parentPicking&&!pan){event.preventDefault();const target=boneAt(start);if(target)options?.onPickParent?.(target.id);draw();return;}
    // Documented selection gestures do not request an evaluated native pose.
    // Ordinary Direct pointerdown retains the existing single frozen-pose
    // preparation because it may immediately become an authored drag.
    const weightHit=scene.mode==='weights'&&scene.brushMode==='direct'?weightTarget():null;
    const selectingWeights=!!weightHit&&(!!(event.ctrlKey||event.metaKey)||nearestVertex(bindingPoints(scene.bones,weightHit.binding),location,10/zoom)===null);
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
    let kind: Gesture['kind'] = 'pan', boneId = scene.selected ?? scene.bones[0]?.id ?? 0, origin = location;
    let clip:AttachmentView|undefined,binding:DenseBindingView|undefined,weightAttachment:number|undefined,weightNeighbors:number[][]|undefined;
    if (!pan) {
      const poses = worldBones(scene.bones), selected = poses.find(b => b.id === scene.selected);
      if(scene.mode==='weights'){
        const target=weightTarget();
        if(!scene.editable||!target)return;
        const {slot:current,attachment}=target;binding=target.binding;
        const points=bindingPoints(scene.bones,binding);
        vertex=nearestVertex(points,location,10/zoom)??undefined;
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
        const hit=imageAt(scene.bones,scene.slots??[],location.x,location.y),additive=!!(event.ctrlKey||event.metaKey||event.shiftKey);
        const gizmo=imageGizmoState(),pivotHit=!additive&&gizmo&&atAttachmentPivot(gizmo,start);
        handle=!additive&&gizmo&&!pivotHit?hitGizmo(gizmo.tool,gizmo.screenOrigin,start)??undefined:undefined;
        // An explicitly selected outline can be manipulated without activating it.
        // Visible unselected images keep normal picking priority elsewhere.
        const ghost=selectedAttachmentGeometry(scene.bones,scene.slots??[],scene.selectedAttachments??[],scene.inspectedAttachment)
          .reverse().find(item=>{
            const mesh=item.attachment.mesh;
            if(mesh){
              for(let i=0;i<mesh.triangles.length;i+=3){if(polygonContains(mesh.triangles.slice(i,i+3).map(v=>item.points[v]!),location))return true;}
              for(let i=0;i<mesh.edges.length;i+=2){if(segmentDistance(location.x,location.y,item.points[mesh.edges[i]!]!,item.points[mesh.edges[i+1]!]!)<=7/zoom)return true;}
              return false;
            }
            return polygonContains(item.points,location)||item.points.some((p,i)=>segmentDistance(location.x,location.y,p,item.points[(i+1)%item.points.length]!)<=7/zoom);
          });
        const id=ghost?.attachment.id??(hit?renderedAttachmentId(hit):null);ids=[...(scene.selectedAttachments??[])];
        if(pivotHit){kind='attachmentPivot';ids=gizmo.ids;pivot=gizmo.origin;}
        else{
        if(id!==null&&additive){ids=ids.includes(id)?ids.filter(v=>v!==id):[...ids,id];selectImages(ids,ids.includes(id)?id:ids.at(-1)??null);draw();return;}
        if(id===null&&!handle){kind='imageBox';if(!additive){ids=[];selectImages([],null);}}
        else{
          if(id!==null&&!handle&&!ids.includes(id)){ids=[id];selectImages(ids,id);}
          if(!scene.editable){draw();return;}
          const selectedGizmo=imageGizmoState();pivot=selectedGizmo?.origin??location;
          handle??=scene.tool==='rotate'?'rotate':scene.tool==='scale'?'scale':'translate';
          kind='attachments';
        }
        }
      }else if (scene.mode && scene.mode !== 'bones' && scene.tool !== 'create') {
        const current=editingSlot();
        const mesh=current?.mesh;
        const points=mesh?meshPoints(scene.bones,mesh):[];
        vertex=mesh?nearestVertex(points,location,10/zoom)??undefined:undefined;
        const edge=mesh?nearestEdge(mesh,points,location,8/zoom):null;
        const hit=vertex!==undefined || edge || (scene.meshTool==='draw' && mesh) ? current : imageAt(scene.bones,scene.slots??[],location.x,location.y);
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
        const hit=scene.tool==='length'&&selected&&Math.hypot(screen(selected.tipX,selected.tipY).x-start.x,screen(selected.tipX,selected.tipY).y-start.y)<=12?selected:boneAt(start), additive=!!(event.ctrlKey||event.metaKey||event.shiftKey);
        const gizmo=gizmoState(scene.bones);
        handle=!additive&&gizmo&&(!hit||ids.includes(hit.id))?hitGizmo(gizmo.tool,gizmo.screenOrigin,start,gizmo.basis)??undefined:undefined;
        if(hit&&additive){
          ids=ids.includes(hit.id)?ids.filter(id=>id!==hit.id):[...ids,hit.id];
          selectBones(ids,ids.includes(hit.id)?hit.id:ids.at(-1)??null);draw();return;
        }
        if(!hit && !handle) {
          kind='box';if(!additive){ids=[];selectBones([],null);}
        } else {
          if(hit&&!handle){if(!ids.includes(hit.id))ids=[hit.id];selectBones(ids,hit.id);boneId=hit.id;}
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
    const basis=transformMode==='scale'?scaleBasis(scene.bones,ids,boneId)??undefined:undefined;
    gesture = { id: event.pointerId, kind, start, last: start, bone: boneId, origin, revision: scene.revision, base:scene.mode==='bones'?(scene.authoredBones??scene.bones):scene.bones, changed: false, slot:selectedSlot, vertex, coverage:(binding??selectedSlot?.mesh)?.vertices.map(()=>0),weightVertices:binding?(scene.brushMode==='direct'?selectedWeightVertices(binding):[...(scene.selectedVertices??[])]):undefined,weightLocks:[...(scene.lockedInfluences??[])],binding,weightAttachment,weightBone:scene.influence??undefined,weightNeighbors,brush:{mode:scene.brushMode??'add',strength:scene.brushStrength??.5,size:scene.brushSize??80,feather:scene.brushFeather??.6,directGain:.005*(event.shiftKey?.1:1)},ids,transformMode,pivot,pickParent,fromVertex,additive:!!(event.ctrlKey||event.metaKey||(kind!=='weightBox'&&event.shiftKey)),handle,screenPivot,rotationStart,rotationPrevious:rotationStart,rotationTotal:0,individual,basis,clip,slots:scene.slots,poseEpoch:preparedPose?.poseEpoch,previousAttachmentPivot:attachmentPivot?{...attachmentPivot}:null };
    canvas.setPointerCapture(event.pointerId);
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
      const delta=gizmoDelta(g.handle,screenPivot,g.start,current,zoom,g.rotationTotal??0,g.basis);
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
    if(edit.type==='transformAttachments')previewSlots=previewAttachmentTransform(g.base,g.slots??[],edit);
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
      previewSlots=withMesh(scene.slots??[],g.slot.id,result);
    }
    else if (edit.type === 'updateSlot' && g.slot?.region) previewSlots = (scene.slots ?? []).map(s => s.id === edit.id ? { ...s, region: { ...g.slot!.region!, x:edit.x, y:edit.y } } : s);
    else{const authored=edit.type==='transformBones'?previewTransformBones(g.base,edit):previewEdit(g.base, edit);previewAuthored=authored;preview=scene.hasConstraints&&options?.previewBones?options.previewBones(authored):authored;}
  }
  function safePreview(g:Gesture,edit:RigEdit) {
    try{previewOperation(g,edit);g.invalid=false;return true;}
    catch(error){preview=null;previewSlots=null;g.invalid=true;if(!g.errorReported){g.errorReported=true;options?.onImageError?.(error instanceof Error?error.message:String(error));}return false;}
  }
  const move = (event: PointerEvent) => {
    hover=point(event);
    const boneHoverChanged=!gesture&&reportBoneHover((scene.parentPicking||!scene.mode||scene.mode==='bones'||scene.mode==='weights')?boneAt(hover)?.id??null:null);
    if (!gesture || gesture.id !== event.pointerId) {cursor();if(boneHoverChanged||scene.mode==='weights'||gizmoState()||imageGizmoState()||scene.clippingDraft)draw();return;}
    const current = hover, g = gesture;
    g.changed ||= Math.hypot(current.x - g.start.x, current.y - g.start.y) >= 3;
    if (g.kind === 'pan') { panX += current.x - g.last.x; panY += current.y - g.last.y; drawGrid(); }
    else if(g.kind==='attachmentPivot'){if(g.changed)moveAttachmentPivot(g,current);}
    else { const edit = safeEditFor(g, current); if (edit) safePreview(g, edit); }
    g.last = current; draw();
  };
  function commit(edit:RigEdit,revision:number,poseEpoch=preparedPose?.poseEpoch) {
    if(!options)return;
    pending=true;
    void options.onCommit(edit,revision,poseEpoch).finally(()=>{pending=false;preparedPose=null;preview=null;previewAuthored=null;previewSlots=null;options.onEndBonePreview?.();if(!scene.clippingDraft)options.onEndGeometry?.();cursor();draw();});
  }
  const up = (event: PointerEvent) => {
    if(preparingPointer===event.pointerId){preparingPointer=null;preparation++;pending=false;options?.onEndGeometry?.();return;}
    if (!gesture || gesture.id !== event.pointerId){endIdleGeometry();return;}
    const g = gesture; gesture = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if(g.kind==='attachmentPivot'){
      if(g.changed)moveAttachmentPivot(g,point(event));
      preparedPose=null;options?.onEndGeometry?.();cursor();draw();return;
    }
    if(g.kind==='box') {
      const current=point(event),hits=g.changed?worldBones(g.base).filter(b=>boneInBox(b,g.start,current)).map(b=>b.id):[];
      const ids=g.additive?[...new Set([...(g.ids??[]),...hits])]:hits;
      selectBones(ids,ids.at(-1)??null);preview=null;previewSlots=null;cursor();draw();return;
    }
    if(g.kind==='weightBox'&&g.binding){
      const current=point(event),hits=g.changed?bindingPoints(g.base,g.binding).flatMap((p,i)=>inBox(screen(p.x,p.y),g.start,current)?[i]:[]):[];
      const ids=g.additive?[...new Set([...(g.ids??[]),...hits])]:hits;
      selectWeightVertices(ids,ids.at(-1)??null);preview=null;previewSlots=null;preparedPose=null;options?.onEndGeometry?.();cursor();draw();return;
    }
    if(g.kind==='imageBox'){
      const hits=g.changed?sceneImagesInBox(g.base,g.slots??[],world(g.start),world(point(event))):[];
      const ids=g.additive?[...new Set([...(g.ids??[]),...hits])]:hits;
      selectImages(ids,ids.at(-1)??null);preview=null;previewSlots=null;endIdleGeometry();cursor();draw();return;
    }
    let edit = g.changed || g.kind==='draw' ? safeEditFor(g, point(event)) : null;
    if(g.kind==='create'&&!g.changed&&!g.pickParent) {
      const parent=worldBones(g.base).find(b=>b.id===g.bone),angle=(parent?.angle??0)*Math.PI/180;
      const end=screen(g.origin.x+Math.cos(angle)*12,g.origin.y+Math.sin(angle)*12);
      edit=safeEditFor(g,end);if(edit?.type==='create')edit={...edit,length:12,rotation:0};
    }
    if (edit && options) {
      if(safePreview(g,edit))commit(edit,g.revision,g.poseEpoch);else cancel();
    } else { preview = null;previewAuthored=null;options?.onEndBonePreview?.();previewSlots = null;preparedPose=null;if(!scene.clippingDraft)options?.onEndGeometry?.();draw(); }
    cursor();
  };
  const lost = (event: PointerEvent) => { if (gesture?.id === event.pointerId||preparingPointer===event.pointerId) cancel();reportBoneHover(null); };
  const leave=()=>{hover=null;reportBoneHover(null);cursor();draw();};
  const wheel = (event: WheelEvent) => {
    event.preventDefault(); if (gesture || pending) return;
    const rect = canvas.getBoundingClientRect(), mx = event.clientX - rect.left - app.screen.width / 2, my = event.clientY - rect.top - app.screen.height / 2;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? app.screen.height : 1;
    const next = Math.min(8, Math.max(0.1, zoom * Math.exp(-event.deltaY * unit * 0.0015))), ratio = next / zoom;
    panX = mx - (mx - panX) * ratio; panY = my - (my - panY) * ratio;
    zoom = next; onZoom(Math.round(zoom * 100)); drawGrid(); draw();
  };
  const dragover=(event:DragEvent)=>{
    const types=Array.from(event.dataTransfer?.types??[]);
    const own=types.includes('application/x-fbones-image')||types.includes('application/x-fbones-images');
    if(scene.parentPicking||(!options?.onDropImage&&!options?.onDropImages)||!scene.editable||scene.busy||pending||(!own&&!parseImageDropKeys(event.dataTransfer,scene.imageKeys??[])))return;
    event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='copy';
  };
  const drop=(event:DragEvent)=>{
    const keys=parseImageDropKeys(event.dataTransfer,scene.imageKeys??[]);
    if(scene.parentPicking||!keys||(!options?.onDropImage&&!options?.onDropImages)||!scene.editable||scene.busy||pending)return;
    if(keys.length>1&&!options?.onDropImages)return;
    event.preventDefault();cancel();const location=world(point(event));pending=true;
    const operation=options.onDropImages?options.onDropImages(keys,location.x,location.y):options.onDropImage!(keys[0]!,location.x,location.y);
    void operation.finally(()=>{pending=false;draw();});
  };
  const context = (event: MouseEvent) => event.preventDefault();
  const keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if(event.code==='Space'&&(event.target as HTMLElement|null)?.closest('button, a, [role="button"]'))return;
    if (event.code === 'Space') { event.preventDefault(); space = true;if(scene.mode==='weights'){cancel();selectWeightVertices([],null);draw();}cursor(); }
    if(scene.mode==='weights'&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){
      const target=weightTarget();if(target){event.preventDefault();cancel();selectWeightVertices(target.binding.vertices.map((_,i)=>i),scene.selectedVertex??0);draw();}return;
    }
    if(scene.mode==='weights'&&event.key==='Escape'){
      event.preventDefault();cancel();reportBoneHover(null);options?.onClearHover?.();selectWeightVertices([],null);cursor();draw();return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();edgeStart=null;reportBoneHover(null);options?.onClearHover?.();cancel();
      attachmentPivot=null;
      scene={...scene,selected:null,selectedBones:[],selectedSlot:null,selectedAttachments:[],selectedVertex:null,tool:'translate'};
      if(options?.onEscape)options.onEscape();else{options?.onSelect(null);options?.onSelectSlot?.(null);options?.onSelectVertex?.(null);}
      cursor();draw();
    }
  };
  const keyup = (event: KeyboardEvent) => { if (event.code === 'Space') { space = false; cursor(); } };
  const blur = () => { space = false;hover=null;reportBoneHover(null);options?.onClearHover?.();cancel(); };
  const observer = new ResizeObserver(resize);
  try { resize(); }
  catch (error) { app.destroy({ removeView: true }, { children: true }); throw error; }
  observer.observe(host); window.addEventListener('resize', resize); window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', lost); canvas.addEventListener('lostpointercapture', lost);
  canvas.addEventListener('pointerleave',leave);
  canvas.addEventListener('dragover',dragover);canvas.addEventListener('drop',drop);
  canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('contextmenu', context);
  return {
    setGrid(visible) { grid = visible; drawGrid(); draw(); },
    setScene(value) {
      if(value.documentId!==scene.documentId||!value.bones.some(b=>b.id===viewportHoveredBone))reportBoneHover(null);
      const nextPivotMode=options?.pivotMode?.()??'individual',selectionChanged=attachmentSelectionKey(value.selectedAttachments)!==attachmentSelectionKey(scene.selectedAttachments);
      const resetPivot=selectionChanged||value.documentId!==scene.documentId||value.mode!=='images'||value.revision!==scene.revision&&!pending;
      const weightSelectionChanged=attachmentSelectionKey(value.selectedVertices)!==attachmentSelectionKey(scene.selectedVertices)||attachmentSelectionKey(value.selectedInfluences)!==attachmentSelectionKey(scene.selectedInfluences)||attachmentSelectionKey(value.lockedInfluences)!==attachmentSelectionKey(scene.lockedInfluences);
      const changed = value.poseKey!==scene.poseKey||value.requiresBonePose!==scene.requiresBonePose||value.parentPicking!==scene.parentPicking||weightSelectionChanged||selectionChanged||value.inspectedAttachment?.id!==scene.inspectedAttachment?.id||nextPivotMode!==pivotMode || value.revision !== scene.revision || value.tool !== scene.tool || value.mode !== scene.mode || value.documentId !== scene.documentId || value.selectedSlot !== scene.selectedSlot || value.meshTool !== scene.meshTool || value.meshEditUvs !== scene.meshEditUvs || value.influence !== scene.influence;
      scene = value; pivotMode=nextPivotMode;if(changed){edgeStart=null;cancel(false);}if(resetPivot)attachmentPivot=null;
      cursor(); draw();
    },
    reset() { cancel(); zoom = 1; panX = 0; panY = 0; onZoom(100); drawGrid(); draw(); },
    resize,
    destroy() {
      cancel();
      destroyed = true; observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur);
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('dragover',dragover);canvas.removeEventListener('drop',drop);
      canvas.removeEventListener('pointercancel', lost); canvas.removeEventListener('lostpointercapture', lost); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', context);
      canvas.removeEventListener('pointerleave',leave);reportBoneHover(null);options?.onClearHover?.();
      imageLayer?.destroy();
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
