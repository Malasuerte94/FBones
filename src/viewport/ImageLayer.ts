import { Container, Graphics, Sprite, Texture, Mesh, MeshGeometry, Matrix, Color, ColorMatrixFilter, type Filter } from 'pixi.js';
import type { AttachmentView, BoneView, ClippingView, DenseBindingView, MeshView, SlotView, TracePreview } from '../domain/project.ts';
import { worldRegions } from '../domain/images.ts';
import { transformPoint, worldBones, type WorldBone } from '../domain/rig.ts';
import {pixiSlotBlend} from '../domain/slotBlend.ts';
import {activeAttachment,clippingPolygon,clippingScopes} from '../domain/clipping.ts';
import {selectedAttachmentGeometry,renderedAttachmentId} from '../domain/sceneSelection.ts';
import {bindingPoints,type AttachmentGeometryContext,type Point} from '../domain/binding.ts';
import {activeAttachmentColor,slotAttachmentColor,slotTwoColorMatrix} from '../domain/attachmentColor.ts';
import { isolatedMeshSlot, meshDisplayClip, type MeshDisplay } from '../domain/meshDisplay.ts';
import {configureGhostArtworkFilter,createGhostArtworkFilter} from './GhostArtworkFilter.ts';
import { drawWeightVertices, type WeightDisplay } from './WeightPies.ts';
import { WeightOverlay } from './WeightOverlay.ts';

const WIREFRAME_COLOR = 0xb9a3d0;

export interface AnimateWeightInspection {
  readonly attachmentId:number;
  readonly vertex:number;
}

interface GhostTint {
  color:number;
  alpha:number;
  boneFilter:ReadonlySet<number>|null;
  effect:'images'|'solid'|'silhouette'|'xray';
}

interface SlotMask {
  graphics: Graphics;
  polygon: readonly number[];
  inverse: boolean;
}

function setArtworkFilter(node: Container, filter?: Filter) {
  const current = node.filters;
  if (filter) {
    if (!Array.isArray(current) || current.length !== 1 || current[0] !== filter) node.filters = [filter];
  } else if (Array.isArray(current) ? current.length > 0 : !!current) {
    node.filters = [];
  }
}

function drawMeshTriangles(graphics: Graphics, points: readonly Point[], mesh: MeshView, lines: boolean, fill: boolean) {
  if (!lines && !fill) return;
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const a = points[mesh.triangles[i]!]!, b = points[mesh.triangles[i + 1]!]!, c = points[mesh.triangles[i + 2]!]!;
    graphics.poly([a.x, a.y, b.x, b.y, c.x, c.y]);
    if (fill) graphics.fill({color: 0x49c3d2, alpha: 0.12});
    if (lines) graphics.stroke({color: 0x52c6dd, width: 1, alpha: 0.7});
  }
}

function drawMeshEdges(graphics: Graphics, points: readonly Point[], mesh: MeshView, color: number, alpha: number, hull: boolean) {
  const hullEdges = hull ? new Set<number>() : undefined;
  const line = (from: number, to: number) => {
    const a = points[from]!, b = points[to]!;
    graphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({color, width: 1.5, alpha});
  };
  for (let i = 0; i < mesh.edges.length; i += 2) {
    const a = mesh.edges[i]!, b = mesh.edges[i + 1]!;
    if (hullEdges) {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (hi < mesh.hull && hi === lo + 1) hullEdges.add(lo);
      else if (lo === 0 && hi === mesh.hull - 1) hullEdges.add(hi);
    }
    line(a, b);
  }
  if (hullEdges) {
    for (let i = 0; i < mesh.hull; i++) {
      if (!hullEdges.has(i)) line(i, (i + 1) % mesh.hull);
    }
  }
}

function drawVertexDots(graphics: Graphics, points: readonly Point[], color: number, selected: number | null = null) {
  points.forEach(({x, y}, index) => {
    graphics.circle(x, y, index === selected ? 5 : 3.5)
      .fill(index === selected ? 0xffffff : color).stroke({color:0x252728,width:1});
  });
}

/** Own textures rather than the global URL cache: a closed document can release
 * GPU memory even while a previous image load is still resolving. */
export class ImageLayer {
  readonly container = new Container();
  readonly guides = new Container();
  readonly overlay = new Graphics();
  showPassiveClippingOutlines = true;
  private textures = new Map<string, Texture>();
  private sprites = new Map<number, Sprite | Mesh<MeshGeometry>>();
  private readonly meshBufferSources = new WeakMap<MeshGeometry, { uvs: readonly number[]; triangles: readonly number[] }>();
  private darkFilters=new Map<number,ColorMatrixFilter>();
  private loading = new Set<string>();
  private masks=new Map<number,SlotMask>();
  private ghostFilter?:Filter;
  private weightOverlay?: WeightOverlay;
  private readonly ghostWrappers=new Map<number,Container>();
  private clippingIssue='';
  private documentId = -1;
  private epoch = 0;
  ready(documentId:number,bones:readonly BoneView[],slots:readonly SlotView[],meshDisplay?:MeshDisplay):boolean {
    const isolated = isolatedMeshSlot(slots, meshDisplay);
    return this.documentId===documentId&&worldRegions(bones,isolated?[isolated]:slots).every(slot=>
      !slot.visible || this.textures.has(slot.region.image) || (!!isolated && !slot.imageAvailable));
  }
  constructor(private load: (documentId: number, name: string) => Promise<string>, private invalidate: () => void,
    private onError?: (message: string) => void, private textureSource?: ImageLayer) {
    this.guides.addChild(this.overlay);
  }
  ghostLayer():ImageLayer { return new ImageLayer(this.load, this.invalidate, undefined, this); }
  drawGhost(documentId:number,bones:readonly BoneView[],slots:readonly SlotView[],screen:(x:number,y:number)=>{x:number;y:number},zoom:number,tint:GhostTint) {
    this.draw(documentId,bones,slots,null,screen,zoom,undefined,'images',null,null,{},tint);
  }
  private dispose(node: Sprite | Mesh<MeshGeometry>,id:number) {
    node.mask=null;setArtworkFilter(node);
    this.darkFilters.get(id)?.destroy();this.darkFilters.delete(id);
    if(node instanceof Mesh){
      this.meshBufferSources.delete(node.geometry);
      node.geometry.destroy();
    }
    node.destroy();
    this.ghostWrappers.get(id)?.destroy();
    this.ghostWrappers.delete(id);
  }

  private ghostRoot(node:Sprite|Mesh<MeshGeometry>,id:number,filter:Filter|undefined) {
    let wrapper=this.ghostWrappers.get(id);
    if(filter){
      if(!wrapper){
        wrapper=new Container();
        this.ghostWrappers.set(id,wrapper);
        this.container.addChild(wrapper);
        wrapper.addChild(node);
      }
      setArtworkFilter(wrapper,filter);
      return wrapper;
    }
    if(wrapper){
      this.container.addChild(node);
      wrapper.destroy();
      this.ghostWrappers.delete(id);
    }
    return node;
  }
  private clear() {
    this.weightOverlay?.destroy();
    this.weightOverlay = undefined;
    for (const [id,sprite] of this.sprites) this.dispose(sprite,id);
    for (const texture of this.textures.values()) texture.destroy(true);
    for(const mask of this.masks.values())mask.graphics.destroy();this.masks.clear();
    this.sprites.clear(); this.textures.clear(); this.loading.clear(); this.overlay.clear();this.clippingIssue='';
  }
  private async request(name: string) {
    this.loading.add(name);
    const epoch = this.epoch;
    try {
      const url = await this.load(this.documentId, name);
      if (epoch !== this.epoch) return;
      const image = new Image(); image.src = url;
      await image.decode();
      if (epoch !== this.epoch) return;
      this.textures.set(name, Texture.from(image));
      this.invalidate();
    } catch (error) {
      if (epoch === this.epoch) this.onError?.(`Could not load ${name}.png: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  private useDocument(documentId: number) {
    if (documentId !== this.documentId) { this.epoch++; this.clear(); this.documentId = documentId; }
  }
  /** Offscreen export waits for exact resources before it renders any frame. */
  async preload(documentId: number, name: string): Promise<number> {
    this.useDocument(documentId);
    if (!this.textures.has(name)) await this.request(name);
    const texture = this.textures.get(name);
    if (!texture) throw new Error(`Could not load ${name}.png for GIF export.`);
    return texture.width * texture.height;
  }
  draw(documentId: number, bones: readonly BoneView[], slots: readonly SlotView[], selected: number | null,
    screen: (x: number, y: number) => { x: number; y: number }, zoom: number, evaluated?:ReadonlyMap<number,WorldBone>,
    mode = 'images', vertex: number | null = null, influence: number | null = null,
    selection:{ids?:readonly number[];inspected?:AttachmentView|null;vertices?:readonly number[];weightDisplay?:WeightDisplay;innerTrace?:TracePreview;meshDisplay?:MeshDisplay;meshOutline?:boolean;meshWireframeAttachments?:ReadonlySet<number>;animateWeightInspection?:AnimateWeightInspection}={},ghost?:GhostTint) {
    this.useDocument(documentId);
    const textureOwner = this.textureSource ?? this;
    const meshDisplay = mode === 'meshes' && !ghost ? selection.meshDisplay : undefined;
    const meshOutline = mode === 'meshes' && !ghost && selection.meshOutline;
    const isolated = isolatedMeshSlot(slots, meshDisplay);
    const displaySlots = isolated ? [isolated] : slots;
    const inspection=selection.animateWeightInspection;
    const weightInspection=!ghost&&!isolated&&inspection&&selection.inspected?.id===inspection.attachmentId&&
      selection.ids?.length===1&&selection.ids[0]===inspection.attachmentId?inspection:undefined;
    const wireframeIds = !ghost && !meshOutline ? selection.meshWireframeAttachments : undefined;
    const isolatedSource = wireframeIds?.size && isolated ? slots.find(slot => slot.id === isolated.id) : undefined;
    if(ghost){
      if(ghost.effect==='images')setArtworkFilter(this.container);
      else{
        this.ghostFilter??=createGhostArtworkFilter();
        configureGhostArtworkFilter(this.ghostFilter,ghost.color,ghost.effect!=='solid');
        setArtworkFilter(this.container,ghost.effect==='xray'?undefined:this.ghostFilter);
      }
    }
    const currentSlots = new Set(displaySlots.map(slot=>slot.id));
    // Keep the Pixi render group valid when a retained sprite stays visible.
    const unseenSprites = new Set<number>();
    for (const [id, sprite] of this.sprites) {
      if (!currentSlots.has(id)) { this.dispose(sprite,id); this.sprites.delete(id); }
      else unseenSprites.add(id);
    }
    this.overlay.clear();
    if (this.weightOverlay) this.weightOverlay.mesh.visible = false;
    const weightBones = mode === 'weights' ? new Map(bones.map(bone => [bone.id, bone])) : null;
    const selectedVertices = weightBones ? new Set(selection.vertices ?? (vertex === null ? [] : [vertex])) : null;
    const drawVertices = (points: readonly Point[], binding: MeshView | ClippingView, color: number) => {
      if (weightBones && selectedVertices) {
        const display = selection.weightDisplay;
        if (display?.overlay && binding.weighted && points.length >= 3) {
          if (!this.weightOverlay) {
            this.weightOverlay = new WeightOverlay();
            this.guides.addChildAt(this.weightOverlay.mesh, 0);
          }
          this.weightOverlay.draw(points, binding, weightBones, 'triangles' in binding ? binding.triangles : undefined,
            display.selectedOnly ? display.influences ?? [] : undefined);
        }
        drawWeightVertices(this.overlay, points, binding, weightBones, selectedVertices, vertex, influence, display);
        return;
      }
      drawVertexDots(this.overlay, points, color, vertex);
    };
    const world = evaluated ?? new Map(worldBones(bones).map(bone => [bone.id, bone]));
    // Draft and evaluated attachments may share IDs, so reuse only the actual binding within this draw.
    const pointsByBinding = new Map<DenseBindingView, Point[]>();
    const geometry: AttachmentGeometryContext = {
      evaluated: world,
      pointsFor(binding) {
        let points = pointsByBinding.get(binding);
        if (!points) {
          points = bindingPoints(bones, binding, world);
          pointsByBinding.set(binding, points);
        }
        return points;
      },
    };
    const polygons = new Map<ClippingView, number[]>();
    const toScreen = (point: Point) => screen(point.x, point.y);
    function clipPolygon(clip: ClippingView) {
      let polygon = polygons.get(clip);
      if (!polygon) {
        polygon = clippingPolygon(bones, clip, geometry).flatMap(point => {
          const { x, y } = toScreen(point);
          return [x, y];
        });
        polygons.set(clip, polygon);
      }
      return polygon;
    }
    const inspectedId = selection.inspected?.id;
    const selectedIds=isolated?[isolated.activeAttachmentId!]:[...new Set([...(selection.ids??[]),...(inspectedId===undefined?[]:[inspectedId])])];
    const selectedGeometry=meshOutline?[]:selectedAttachmentGeometry(bones,displaySlots,selectedIds,selection.inspected,geometry);
    const scope=clippingScopes(slots),issue=scope.issues.join(' ');
    if(issue&&issue!==this.clippingIssue)this.onError?.(issue);this.clippingIssue=issue;
    const selectionSlots=new Set(displaySlots.filter(s=>selection.ids?.includes(renderedAttachmentId(s)??s.id)).map(s=>s.id));
    if(selected!==null&&(inspectedId===undefined||displaySlots.some(s=>s.id===selected&&renderedAttachmentId(s)===inspectedId)))selectionSlots.add(selected);
    const usedMasks=new Set<number>();
    let inspectedWeightVertex:Point|undefined;
    let order = 0;
    const boneFilter=ghost?.boneFilter;
    const drawSlots=boneFilter?displaySlots.filter(slot=>boneFilter.has(slot.bone)):displaySlots;
    for (const slot of worldRegions(bones, drawSlots, world)) {
      const light=slotAttachmentColor(slot);
      if(ghost&&(!slot.visible||light[3]===0))continue;
      const r = slot.region, texture = textureOwner.textures.get(r.image), center = screen(slot.worldX, slot.worldY);
      if (!texture && slot.imageAvailable && !textureOwner.loading.has(r.image)) void textureOwner.request(r.image);
      if(ghost&&!texture)continue;
      const points = slot.mesh ? geometry.pointsFor(slot.mesh) : null;
      const attachmentId = renderedAttachmentId(slot);
      const display = slot.mesh && meshDisplay?.attachmentId === attachmentId ? meshDisplay : undefined;
      const meshEditing = mode === 'meshes' && (meshDisplay ? !!display : selected === slot.id);
      const weightEditing = mode === 'weights' && (slot.attachments ? inspectedId === attachmentId : selected === slot.id);
      const editing = meshEditing || weightEditing;
      const wireframe = !editing && attachmentId !== null && wireframeIds?.has(attachmentId)
        && (!isolated || isolatedSource?.visible && renderedAttachmentId(isolatedSource) === attachmentId);
      const meshOverlay = points && !ghost && !meshOutline && slot.visible && (wireframe || display || selectionSlots.has(slot.id) || !texture)
        ? points.map(toScreen) : null;
      if (texture) {
        unseenSprites.delete(slot.id);
        let node = this.sprites.get(slot.id);
        if (node && (!!slot.mesh !== (node instanceof Mesh))) { this.dispose(node,slot.id); this.sprites.delete(slot.id); node=undefined; }
        if (slot.mesh && points) {
          const positions = new Float32Array(points.length * 2);
          for (let i = 0; i < points.length; i++) {
            const { x, y } = meshOverlay?.[i] ?? toScreen(points[i]!);
            positions[i * 2] = x;
            positions[i * 2 + 1] = y;
          }
          const { uvs, triangles } = slot.mesh;
          if (!node) {
            const geometry = new MeshGeometry({ positions, uvs: new Float32Array(uvs), indices: new Uint32Array(triangles) });
            this.meshBufferSources.set(geometry, { uvs, triangles });
            node = new Mesh({ texture, geometry });
            this.sprites.set(slot.id, node);
            this.container.addChild(node);
          } else if (node instanceof Mesh) {
            const { geometry } = node;
            const sources = this.meshBufferSources.get(geometry)!;
            // Deform replaces vertex positions. Mesh edits replace the affected source arrays.
            if (sources.uvs !== uvs) {
              geometry.uvs = new Float32Array(uvs);
              sources.uvs = uvs;
            }
            const previous = geometry.positions;
            // Pixi dirties its position buffer on assignment, even with identical values.
            if (positions.length !== previous.length
              || positions.some((value, index) => !Number.isFinite(value) || !Object.is(value, previous[index]))) {
              geometry.positions = positions;
            }
            if (sources.triangles !== triangles) {
              geometry.indices = new Uint32Array(triangles);
              sources.triangles = triangles;
            }
          }
        } else {
          if(!node){node=new Sprite({texture,anchor:0.5});this.sprites.set(slot.id,node);this.container.addChild(node);}
          node.setFromMatrix(new Matrix(zoom*slot.a*r.width/texture.width,-zoom*slot.b*r.width/texture.width,-zoom*slot.c*r.height/texture.height,zoom*slot.d*r.height/texture.height,center.x,center.y));
        }
        node.texture=texture;node.visible=slot.visible;
        const clipping=meshDisplayClip(scope.masks.get(slot.id),slot.id,!!isolated);
        if(clipping){
          const polygon=clipPolygon(clipping);
          if(polygon.length>=6){
            let mask=this.masks.get(slot.id);
            let geometryChanged=false;
            if(!mask){
              const graphics=new Graphics().poly(polygon).fill(0xffffff);
              mask={graphics,polygon,inverse:clipping.inverse};
              this.masks.set(slot.id,mask);this.container.addChild(graphics);
            }else{
              const previous=mask.polygon;
              geometryChanged=previous.length!==polygon.length||polygon.some((value,index)=>value!==previous[index]);
              if(geometryChanged){mask.graphics.clear().poly(polygon).fill(0xffffff);mask.polygon=polygon;}
            }
            if(geometryChanged||node.mask!==mask.graphics||mask.inverse!==clipping.inverse){
              node.setMask({mask:mask.graphics,inverse:clipping.inverse});mask.inverse=clipping.inverse;
            }
            usedMasks.add(slot.id);
          }
        }
        if(!usedMasks.has(slot.id)&&node.mask)node.mask=null;
        if(ghost){
          const red=Math.round(light[0]*(ghost.color>>>16));
          const green=Math.round(light[1]*((ghost.color>>>8)&255));
          const blue=Math.round(light[2]*(ghost.color&255));
          node.tint=ghost.effect==='images'?(red<<16)|(green<<8)|blue:0xffffff;
          node.alpha=light[3]*ghost.alpha;
          node.blendMode='normal';
          const root=this.ghostRoot(node,slot.id,ghost.effect==='xray'?this.ghostFilter:undefined);
          this.container.setChildIndex(root,order++);
          continue;
        }
        const blend=pixiSlotBlend(slot.blend),color=slot.color??0xffffffff,matrix=slotTwoColorMatrix(slot);
        if(matrix){
          let filter=this.darkFilters.get(slot.id);
          if(!filter){filter=new ColorMatrixFilter({resolution:'inherit',antialias:'inherit'});this.darkFilters.set(slot.id,filter);}
          if(matrix.some((v,i)=>v!==filter!.matrix[i])){filter.matrix=matrix;filter.resources.colorMatrixUniforms.update();}
          // ColorMatrixFilter composites with its own blend state. The input
          // must be normal/white so it retains RGB even at a zero light channel.
          node.tint=0xffffff;node.blendMode='normal';filter.blendMode=blend;
          setArtworkFilter(node,filter);
        }else{
          setArtworkFilter(node);node.blendMode=blend;
          if(activeAttachmentColor(slot)===0xffffffff)node.tint=(color>>>8)&0xffffff;
          else{
            const rgb=Color.shared.setValue(light).toUint8RgbArray();
            node.tint=(rgb[0]!<<16)|(rgb[1]!<<8)|rgb[2]!;
          }
        }
        node.alpha=light[3]*(display?.dim ? 0.5 : 1);
        this.container.setChildIndex(node,order++);
      }
      if(ghost)continue;
      if(points && slot.mesh) {
        if(weightInspection&&slot.visible&&texture&&light[3]>0&&slot.mesh.weighted&&slot.activeAttachmentId===weightInspection.attachmentId){
          inspectedWeightVertex=points[weightInspection.vertex];
        }
        if(meshOverlay) {
          const m=slot.mesh, active=!!display||selectionSlots.has(slot.id);
          drawMeshTriangles(this.overlay,meshOverlay,m,!wireframe&&(editing||!texture)&&display?.triangles!==false,!texture);
          drawMeshEdges(this.overlay,meshOverlay,m,active?0x6ce1d9:wireframe?WIREFRAME_COLOR:0xa78baf,1,!!display||!!wireframe);
          if(editing) drawVertices(meshOverlay,m,0x6ce1d9);
          else if(wireframe) drawVertexDots(this.overlay,meshOverlay,WIREFRAME_COLOR);
        }
        continue;
      }
      if (slot.visible&&(!texture || selectionSlots.has(slot.id))) {
        const w=r.width/2,h=r.height/2;
        const corners=[[-w,-h],[-w,h],[w,h],[w,-h]].map(([x,y])=>{const p=transformPoint(slot,x!,y!);return screen(p.x,p.y);});
        const points = corners.flatMap(p => [p.x,p.y]);
        this.overlay.poly(points).fill({ color:0xb990c9, alpha: texture ? 0 : 0.12 }).stroke({ color:selectionSlots.has(slot.id) ? 0x71dac4 : 0xa78baf, width:selectionSlots.has(slot.id) ? 2 : 1 });
      }
    }
    for(const id of unseenSprites){
      const sprite=this.sprites.get(id)!;
      sprite.visible=false;if(sprite.mask)sprite.mask=null;
    }
    for(const[id,mask]of this.masks){if(!usedMasks.has(id)){mask.graphics.destroy();this.masks.delete(id);}}
    if(ghost)return;
    const clips=displaySlots.flatMap(s=>{const a=activeAttachment(s);return a?.clipping?[a]:[];});
    for(const {attachment} of selectedGeometry)if(attachment.clipping&&!clips.some(a=>a.id===attachment.id))clips.push(attachment);
    for(const attachment of clips){
      const selected=selectedIds.includes(attachment.id);
      if(!selected&&!this.showPassiveClippingOutlines)continue;
      const clip=attachment.clipping!,polygon=clipPolygon(clip);
      const color=selected?0x71dac4:(clip.color>>>8)&0xffffff;
      if(polygon.length>=6)this.overlay.poly(polygon).stroke({color,width:selected?2:1,alpha:selected?1:0.55});
      if(attachment.id===inspectedId&&(mode==='clipping'||mode==='weights')){
        // Handles follow the authored polygon, even when Convex displays its hull.
        const vertices=selectedGeometry.find(g=>g.attachment.id===attachment.id)?.points.map(toScreen)??[];
        if(mode==='weights'&&vertices.length)this.overlay.poly(vertices.flatMap(p=>[p.x,p.y])).stroke({color:0x71dac4,width:1,alpha:.7});
        drawVertices(vertices, clip, color);
      }
    }
    for(const {slot,attachment,points}of selectedGeometry){
      if(attachment.clipping||(slot.visible&&renderedAttachmentId(slot)===attachment.id))continue;
      const pixels=points.map(toScreen);
      if(attachment.mesh){
        const m=attachment.mesh;
        const display=meshDisplay?.attachmentId===attachment.id?meshDisplay:undefined;
        if(display?.triangles)drawMeshTriangles(this.overlay,pixels,m,true,false);
        drawMeshEdges(this.overlay,pixels,m,0x71dac4,0.7,!!display);
        if(display||(attachment.id===inspectedId&&(mode==='meshes'||mode==='weights')))drawVertices(pixels,m,0x71dac4);
      }else if(points.length)this.overlay.poly(pixels.flatMap(p=>[p.x,p.y])).stroke({color:0x71dac4,width:1.5,alpha:0.6});
    }
    if(inspectedWeightVertex){
      const {x,y}=toScreen(inspectedWeightVertex);
      this.overlay.circle(x,y,8).stroke({color:0x252728,width:4});
      this.overlay.circle(x,y,8).stroke({color:0xf0ce91,width:2.5});
    }
    const innerTrace = selection.innerTrace;
    if (!innerTrace) return;
    const {slotId, attachmentId} = innerTrace;
    if (isolated && (slotId !== isolated.id || (attachmentId ?? slotId) !== isolated.activeAttachmentId)) return;
    if (attachmentId === undefined ? selected !== slotId : !selectedIds.includes(attachmentId)) return;
    const slot = slots.find(item => item.id === slotId);
    const mesh = attachmentId === undefined ? slot?.mesh : slot?.attachments?.find(item => item.id === attachmentId)?.mesh;
    if (mesh !== innerTrace.mesh) return;
    const points = geometry.pointsFor(mesh);
    const {edges, hull} = innerTrace.geometry;
    // Trace emits the perimeter first, followed by explicit interior constraints.
    for (let i = 2 * hull; i + 1 < edges.length; i += 2) {
      const from = points[edges[i]!], to = points[edges[i + 1]!];
      if (!from || !to) continue;
      const a = toScreen(from), b = toScreen(to);
      this.overlay.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({color:0xf0ce91,width:2.5});
    }
  }
  destroy() { this.epoch++; this.clear(); this.ghostFilter?.destroy(); this.container.destroy(); this.guides.destroy({children:true}); }
}
