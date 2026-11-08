import { Container, Graphics, Sprite, Texture, Mesh, MeshGeometry, Matrix, Color, ColorMatrixFilter } from 'pixi.js';
import type { AttachmentView, BoneView, SlotView } from '../domain/project.ts';
import { worldRegions } from '../domain/images.ts';
import { meshPoints } from '../domain/meshes.ts';
import { transformPoint } from '../domain/rig.ts';
import {pixiSlotBlend} from '../domain/slotBlend.ts';
import {activeAttachment,clippingPolygon,clippingScopes} from '../domain/clipping.ts';
import {selectedAttachmentGeometry,renderedAttachmentId} from '../domain/sceneSelection.ts';
import {bindingWeightColor} from '../domain/binding.ts';
import {activeAttachmentColor,slotAttachmentColor,slotTwoColorMatrix} from '../domain/attachmentColor.ts';

/** Own textures rather than the global URL cache: a closed document can release
 * GPU memory even while a previous image load is still resolving. */
export class ImageLayer {
  readonly container = new Container();
  readonly overlay = new Graphics();
  private textures = new Map<string, Texture>();
  private sprites = new Map<number, Sprite | Mesh<MeshGeometry>>();
  private darkFilters=new Map<number,ColorMatrixFilter>();
  private loading = new Set<string>();
  private masks=new Map<number,Graphics>();
  private clippingIssue='';
  private documentId = -1;
  private epoch = 0;
  constructor(private load: (documentId: number, name: string) => Promise<string>, private invalidate: () => void,
    private onError?: (message: string) => void) {}
  private dispose(node: Sprite | Mesh<MeshGeometry>,id:number) { node.mask=null;node.filters=[];this.darkFilters.get(id)?.destroy();this.darkFilters.delete(id);if(node instanceof Mesh) node.geometry.destroy(); node.destroy(); }
  private clear() {
    for (const [id,sprite] of this.sprites) this.dispose(sprite,id);
    for (const texture of this.textures.values()) texture.destroy(true);
    for(const mask of this.masks.values())mask.destroy();this.masks.clear();
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
  draw(documentId: number, bones: readonly BoneView[], slots: readonly SlotView[], selected: number | null,
    screen: (x: number, y: number) => { x: number; y: number }, zoom: number, mode = 'images', vertex: number | null = null, influence: number | null = null,
    selection:{ids?:readonly number[];inspected?:AttachmentView|null;vertices?:readonly number[]}={}) {
    if (documentId !== this.documentId) { this.epoch++; this.clear(); this.documentId = documentId; }
    for (const [id, sprite] of this.sprites) {
      if (!slots.some(s => s.id === id)) { this.dispose(sprite,id); this.sprites.delete(id); }
      else sprite.visible = false;
      sprite.mask=null;
    }
    for(const mask of this.masks.values()){mask.clear();mask.includeInBuild=false;}
    this.overlay.clear();
    const selectedVertices=new Set(selection.vertices??(vertex===null?[]:[vertex]));
    const vertexRing=(p:{x:number;y:number},index:number)=>{
      if(mode==='weights'&&selectedVertices.has(index))this.overlay.circle(p.x,p.y,index===vertex?9.5:8.5).stroke({color:index===vertex?0xffffff:0x71dac4,width:1.5,alpha:1});
    };
    const selectedIds=[...new Set([...(selection.ids??[]),...(selection.inspected?[selection.inspected.id]:[])])];
    const selectedGeometry=selectedAttachmentGeometry(bones,slots,selectedIds,selection.inspected);
    const scope=clippingScopes(slots),issue=scope.issues.join(' ');
    if(issue&&issue!==this.clippingIssue)this.onError?.(issue);this.clippingIssue=issue;
    const selectionSlots=new Set(slots.filter(s=>selection.ids?.includes(s.activeAttachmentId??s.id)).map(s=>s.id));
    if(selected!==null&&(!selection.inspected||slots.some(s=>s.id===selected&&s.activeAttachmentId===selection.inspected?.id)))selectionSlots.add(selected);
    const usedMasks=new Set<number>();
    let order = 0;
    for (const slot of worldRegions(bones, slots)) {
      const r = slot.region, texture = this.textures.get(r.image), center = screen(slot.worldX, slot.worldY);
      if (!texture && slot.imageAvailable && !this.loading.has(r.image)) void this.request(r.image);
      const points = slot.mesh ? meshPoints(bones,slot.mesh).map(p=>screen(p.x,p.y)) : null;
      if (texture) {
        let node = this.sprites.get(slot.id);
        if (node && (!!slot.mesh !== (node instanceof Mesh))) { this.dispose(node,slot.id); this.sprites.delete(slot.id); node=undefined; }
        if (slot.mesh && points) {
          const positions = new Float32Array(points.flatMap(p=>[p.x,p.y]));
          if(!node) { node=new Mesh({texture,geometry:new MeshGeometry({positions,uvs:new Float32Array(slot.mesh.uvs),indices:new Uint32Array(slot.mesh.triangles)})}); this.sprites.set(slot.id,node);this.container.addChild(node); }
          else if(node instanceof Mesh) {
            node.geometry.uvs=new Float32Array(slot.mesh.uvs);
            node.geometry.positions=positions;
            node.geometry.indices=new Uint32Array(slot.mesh.triangles);
          }
        } else {
          if(!node){node=new Sprite({texture,anchor:0.5});this.sprites.set(slot.id,node);this.container.addChild(node);}
          node.setFromMatrix(new Matrix(zoom*slot.a*r.width/texture.width,-zoom*slot.b*r.width/texture.width,-zoom*slot.c*r.height/texture.height,zoom*slot.d*r.height/texture.height,center.x,center.y));
        }
        node.texture=texture;node.visible=slot.visible;
        const clipping=scope.masks.get(slot.id)?.clipping;
        if(clipping){
          let mask=this.masks.get(slot.id);
          if(!mask){mask=new Graphics();this.masks.set(slot.id,mask);this.container.addChild(mask);}
          const polygon=clippingPolygon(bones,clipping).map(p=>screen(p.x,p.y));
          if(polygon.length>=3){mask.poly(polygon.flatMap(p=>[p.x,p.y])).fill(0xffffff);node.setMask({mask,inverse:clipping.inverse});usedMasks.add(slot.id);}
        }
        const blend=pixiSlotBlend(slot.blend),color=slot.color??0xffffffff,light=slotAttachmentColor(slot),matrix=slotTwoColorMatrix(slot);
        if(matrix){
          let filter=this.darkFilters.get(slot.id);
          if(!filter){filter=new ColorMatrixFilter({resolution:'inherit',antialias:'inherit'});this.darkFilters.set(slot.id,filter);}
          if(matrix.some((v,i)=>v!==filter!.matrix[i])){filter.matrix=matrix;filter.resources.colorMatrixUniforms.update();}
          // ColorMatrixFilter composites with its own blend state. The input
          // must be normal/white so it retains RGB even at a zero light channel.
          node.tint=0xffffff;node.blendMode='normal';filter.blendMode=blend;
          if(!Array.isArray(node.filters)||node.filters[0]!==filter)node.filters=[filter];
        }else{
          node.filters=[];node.blendMode=blend;
          if(activeAttachmentColor(slot)===0xffffffff)node.tint=(color>>>8)&0xffffff;
          else{
            const rgb=Color.shared.setValue(light).toUint8RgbArray();
            node.tint=(rgb[0]!<<16)|(rgb[1]!<<8)|rgb[2]!;
          }
        }
        node.alpha=light[3];
        this.container.setChildIndex(node,order++);
      }
      if(points && slot.mesh) {
        if(slot.visible && (selectionSlots.has(slot.id) || !texture)) {
          const m=slot.mesh, active=selectionSlots.has(slot.id), editing=selected===slot.id && (mode==='meshes'||mode==='weights');
          if(editing || !texture) {
            for(let i=0;i<m.triangles.length;i+=3){const a=points[m.triangles[i]!]!,b=points[m.triangles[i+1]!]!,c=points[m.triangles[i+2]!]!;this.overlay.poly([a.x,a.y,b.x,b.y,c.x,c.y]).fill({color:0x49c3d2,alpha:texture?0:0.12}).stroke({color:0x52c6dd,width:1,alpha:0.7});}
          }
          for(let i=0;i<m.edges.length;i+=2){const a=points[m.edges[i]!]!,b=points[m.edges[i+1]!]!;this.overlay.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:active?0x6ce1d9:0xa78baf,width:1.5});}
          if(editing) points.forEach((p,i)=>{
            const w=m.vertices[i]!.weights[m.bones.indexOf(influence??-1)]??0;
            const color=mode==='weights' ? bindingWeightColor(w) : i===vertex?0xffffff:0x6ce1d9;
            this.overlay.circle(p.x,p.y,mode==='weights'?6:i===vertex?5:3.5).fill({color,alpha:0.95}).stroke({color:0x252728,width:1});vertexRing(p,i);
          });
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
    for(const[id,mask]of this.masks){if(!usedMasks.has(id)){mask.destroy();this.masks.delete(id);}}
    const clips=slots.flatMap(s=>{const a=activeAttachment(s);return a?.clipping?[a]:[];});
    for(const {attachment} of selectedGeometry)if(attachment.clipping&&!clips.some(a=>a.id===attachment.id))clips.push(attachment);
    const inspectedId=selection.inspected?.id;
    for(const attachment of clips){
      const clip=attachment.clipping!,points=clippingPolygon(bones,clip).map(p=>screen(p.x,p.y)),selected=selectedIds.includes(attachment.id);
      const color=selected?0x71dac4:(clip.color>>>8)&0xffffff;
      if(points.length>=3)this.overlay.poly(points.flatMap(p=>[p.x,p.y])).stroke({color,width:selected?2:1,alpha:selected?1:0.55});
      if(attachment.id===inspectedId&&(mode==='clipping'||mode==='weights')){
        // Handles follow the authored polygon, even when Convex displays its hull.
        const vertices=selectedGeometry.find(g=>g.attachment.id===attachment.id)?.points.map(p=>screen(p.x,p.y))??[];
        if(mode==='weights'&&vertices.length)this.overlay.poly(vertices.flatMap(p=>[p.x,p.y])).stroke({color:0x71dac4,width:1,alpha:.7});
        vertices.forEach((p,i)=>{const weight=clip.vertices[i]!.weights[clip.bones.indexOf(influence??-1)]??0,c=mode==='weights'?bindingWeightColor(weight):i===vertex?0xffffff:color;this.overlay.circle(p.x,p.y,mode==='weights'?6:i===vertex?5:3.5).fill(c).stroke({color:0x252728,width:1});vertexRing(p,i);});
      }
    }
    for(const {slot,attachment,points}of selectedGeometry){
      if(attachment.clipping||(slot.visible&&renderedAttachmentId(slot)===attachment.id))continue;
      const pixels=points.map(p=>screen(p.x,p.y));
        if(attachment.mesh){
          const m=attachment.mesh;
          for(let i=0;i<m.edges.length;i+=2){const a=pixels[m.edges[i]!]!,b=pixels[m.edges[i+1]!]!;this.overlay.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:0x71dac4,width:1.5,alpha:.7});}
          if(attachment.id===inspectedId&&(mode==='meshes'||mode==='weights'))pixels.forEach((p,i)=>{const weight=m.vertices[i]!.weights[m.bones.indexOf(influence??-1)]??0,color=mode==='weights'?bindingWeightColor(weight):i===vertex?0xffffff:0x71dac4;this.overlay.circle(p.x,p.y,mode==='weights'?6:i===vertex?5:3.5).fill(color).stroke({color:0x252728,width:1});vertexRing(p,i);});
        }else if(points.length)this.overlay.poly(pixels.flatMap(p=>[p.x,p.y])).stroke({color:0x71dac4,width:1.5,alpha:0.6});
    }
  }
  destroy() { this.epoch++; this.clear(); this.container.destroy(); this.overlay.destroy(); }
}
