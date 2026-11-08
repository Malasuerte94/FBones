// Static Pixi implementations for production CSP. No unsafe-eval policy needed.
import 'pixi.js/unsafe-eval';
import {Assets, ColorMatrixFilter, Container, Graphics, Matrix, Mesh, MeshGeometry, Sprite, type Texture} from 'pixi.js';
import type {RuntimeData, RuntimeFrame} from './index.ts';
import {resourceKey, RuntimeDataError} from './data.ts';
import {worldRegions} from '../../../src/domain/images.ts';
import {meshPoints} from '../../../src/domain/meshes.ts';
import {clippingPolygon, clippingScopes} from '../../../src/domain/clipping.ts';
import {slotAttachmentColor, slotTwoColorMatrix} from '../../../src/domain/attachmentColor.ts';
import {pixiSlotBlend} from '../../../src/domain/slotBlend.ts';
import {sequenceImageKey} from '../../../src/domain/animationSequence.ts';

export type TextureResolver = (imageKey: string) => Texture | undefined;

/** Collect every inventory/sequence frame, including initially inactive art. */
export function runtimeImageKeys(data: RuntimeData): string[] {
  const keys = new Set<string>();
  for (const slot of data.slots) for (const attachment of slot.attachments ?? []) {
    if (!attachment.region) continue;
    const key = resourceKey(attachment.region.image);
    if (attachment.sequence) for (let index = 0; index < attachment.sequence.count; index++) keys.add(resourceKey(sequenceImageKey(resourceKey(attachment.region.imagePath || attachment.name), attachment.sequence, index)));
    else keys.add(key);
  }
  return [...keys];
}

/** Resolve keys under an explicit asset directory. Never use native source
 * roots. Assets owns the texture cache; views do not destroy caller textures. */
export async function loadRuntimeTextures(data: RuntimeData, imageBase: string | URL): Promise<Map<string, Texture>> {
  const base = new URL(String(imageBase));
  if (!base.pathname.endsWith('/')) throw new RuntimeDataError('The image base URL must end in /.');
  const textures = new Map<string, Texture>();
  const keys = runtimeImageKeys(data);
  if (keys.length > 4096) throw new RuntimeDataError('At most 4096 images can be loaded by one runtime view.');
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(8, keys.length)}, async () => {
    while (cursor < keys.length) {
      const key = keys[cursor++]!;
      const path = key.split('/').map(encodeURIComponent).join('/') + '.png';
      textures.set(key, await Assets.load<Texture>(new URL(path, base).href));
    }
  }));
  return textures;
}

/** Pixi8 view in ordinary screen coordinates: X right, Y down. The player uses
 * authored X right/Y up, so the conversion is performed once here. Position or
 * scale this Container normally. No editor overlays, IPC or RAF are installed. */
export class FBonesView extends Container {
  private nodes = new Map<number, Sprite | Mesh<MeshGeometry>>();
  private masks = new Map<number, Graphics>();
  private dark = new Map<number, ColorMatrixFilter>();
  private attachmentIds = new Map<number, number | null | undefined>();
  constructor(private readonly textureFor: TextureResolver) {super();}

  sync(frame: RuntimeFrame): void {
    const scopes = clippingScopes(frame.slots);
    if (scopes.issues.length) throw new RuntimeDataError(scopes.issues.join(' '));
    for (const node of this.nodes.values()) {node.visible = false; node.mask = null;}
    for (const mask of this.masks.values()) mask.clear();
    const usedMasks = new Set<number>(), usedNodes = new Set<number>();
    let order = 0;
    for (const slot of worldRegions(frame.bones, frame.slots)) {
      if (!slot.visible) continue;
      const texture = this.textureFor(slot.region.image);
      if (!texture || texture.destroyed) throw new RuntimeDataError(`Missing texture ${JSON.stringify(slot.region.image)}.`);
      let node = this.nodes.get(slot.id);
      if (node && ((node instanceof Mesh) !== !!slot.mesh || this.attachmentIds.get(slot.id) !== slot.activeAttachmentId)) {this.dispose(slot.id, node); node = undefined;}
      this.attachmentIds.set(slot.id, slot.activeAttachmentId);
      if (slot.mesh) {
        const points = meshPoints(frame.bones, slot.mesh);
        if (!node) {
          node = new Mesh({texture, geometry: new MeshGeometry({positions: new Float32Array(points.length * 2), uvs: new Float32Array(slot.mesh.uvs), indices: new Uint32Array(slot.mesh.triangles)})});
          this.nodes.set(slot.id, node); this.addChild(node);
        }
        const mesh = node as Mesh<MeshGeometry>;
        const positions = mesh.geometry.positions;
        for (let i = 0; i < points.length; i++) {positions[i * 2] = points[i]!.x; positions[i * 2 + 1] = -points[i]!.y;}
        mesh.geometry.getBuffer('aPosition').update();
      } else {
        if (!node) {node = new Sprite({texture, anchor: 0.5}); this.nodes.set(slot.id, node); this.addChild(node);}
        const region = slot.region;
        node.setFromMatrix(new Matrix(slot.a * region.width / texture.width, -slot.b * region.width / texture.width, -slot.c * region.height / texture.height, slot.d * region.height / texture.height, slot.worldX, -slot.worldY));
      }
      node.texture = texture; node.visible = true; usedNodes.add(slot.id);
      const clip = scopes.masks.get(slot.id)?.clipping;
      if (clip) {
        let mask = this.masks.get(slot.id);
        if (!mask) {mask = new Graphics(); this.masks.set(slot.id, mask); this.addChild(mask);}
        const polygon = clippingPolygon(frame.bones, clip);
        if (polygon.length < 3) throw new RuntimeDataError('A clipping polygon has fewer than three points.');
        mask.poly(polygon.flatMap(point => [point.x, -point.y])).fill(0xffffff);
        node.setMask({mask, inverse: clip.inverse}); usedMasks.add(slot.id);
      }
      const light = slotAttachmentColor(slot), matrix = slotTwoColorMatrix(slot), blend = pixiSlotBlend(slot.blend);
      if (matrix) {
        let filter = this.dark.get(slot.id);
        if (!filter) {filter = new ColorMatrixFilter({resolution: 'inherit', antialias: 'inherit'}); this.dark.set(slot.id, filter);}
        if (matrix.some((value, index) => value !== filter!.matrix[index])) {filter.matrix = matrix; filter.resources.colorMatrixUniforms.update();}
        node.tint = 0xffffff; node.blendMode = 'normal'; filter.blendMode = blend;
        if (!Array.isArray(node.filters) || node.filters[0] !== filter) node.filters = [filter];
      } else {
        node.filters = []; node.blendMode = blend;
        node.tint = (Math.round(light[0] * 255) << 16) | (Math.round(light[1] * 255) << 8) | Math.round(light[2] * 255);
      }
      node.alpha = light[3];
      if (this.getChildIndex(node) !== order) this.setChildIndex(node, order);
      order++;
    }
    for (const [id, mask] of this.masks) if (!usedMasks.has(id)) {mask.destroy(); this.masks.delete(id);}
    for (const [id, node] of this.nodes) if (!usedNodes.has(id)) {node.visible = false; node.filters = [];}
  }
  private dispose(id: number, node: Sprite | Mesh<MeshGeometry>): void {
    node.mask = null; node.filters = [];
    this.dark.get(id)?.destroy(); this.dark.delete(id);
    if (node instanceof Mesh) node.geometry.destroy();
    node.destroy(); this.nodes.delete(id);
    this.attachmentIds.delete(id);
  }
  override destroy(): void {
    for (const [id, node] of this.nodes) this.dispose(id, node);
    for (const mask of this.masks.values()) mask.destroy();
    this.masks.clear(); super.destroy();
  }
}
