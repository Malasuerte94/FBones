import type { BoneView, DenseBindingView, SlotView } from '../domain/project';
import { bindingPoints } from '../domain/binding';
import { activeAttachment } from '../domain/clipping';
import { renderedAttachmentId } from '../domain/sceneSelection';
import { transformPoint, type WorldBone } from '../domain/rig';

export type ViewportNameTagLayer = 'bones' | 'images' | 'others';

export interface ViewportNameTag {
  layer: ViewportNameTagLayer;
  id: number;
  name: string;
  x: number;
  y: number;
  selected: boolean;
}

export interface ViewportNameTagFrame {
  documentId: number;
  width: number;
  height: number;
  tags: ViewportNameTag[];
}

interface Point { x: number; y: number }

function bindingCenter(bones: readonly BoneView[], binding: DenseBindingView, poses: ReadonlyMap<number, WorldBone>): Point | null {
  let points: Point[];
  try { points = bindingPoints(bones, binding, poses); }
  catch { return null; }
  let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
  for (const {x, y} of points) {
    left = Math.min(left, x); right = Math.max(right, x);
    bottom = Math.min(bottom, y); top = Math.max(top, y);
  }
  if (left === Infinity) return null;
  return {x: left / 2 + right / 2, y: bottom / 2 + top / 2};
}

export function nameTagAnchors(
  poses: readonly WorldBone[], bones: readonly BoneView[], slots: readonly SlotView[],
  layers: Readonly<Record<ViewportNameTagLayer, boolean>>,
  selectedBones: Iterable<number>, selectedAttachments: Iterable<number>,
  screen: (x: number, y: number) => Point,
): ViewportNameTag[] {
  if (!layers.bones && !layers.images && !layers.others) return [];
  const byId = new Map(poses.map(pose => [pose.id, pose]));
  const chosenBones = new Set(selectedBones), chosenAttachments = new Set(selectedAttachments);
  const tags: ViewportNameTag[] = [];
  function add(layer: ViewportNameTagLayer, id: number, name: string, anchor: Point, selected: boolean) {
    if (!name) return;
    const {x, y} = screen(anchor.x, anchor.y);
    if (Number.isFinite(x) && Number.isFinite(y)) tags.push({layer, id, name, x, y, selected});
  }

  if (layers.bones) for (const bone of bones) {
    const pose = byId.get(bone.id);
    if (bone.id < 0 || !pose) continue;
    const anchor = {x: pose.worldX / 2 + pose.tipX / 2, y: pose.worldY / 2 + pose.tipY / 2};
    add('bones', bone.id, bone.name, anchor, chosenBones.has(bone.id));
  }

  if (layers.images || layers.others) for (const slot of slots) {
    if (!slot.visible) continue;
    const attachment = activeAttachment(slot);
    if (attachment?.clipping) {
      if (!layers.others) continue;
      // The optional convex hull has the same axis-aligned bounds as its points.
      const anchor = bindingCenter(bones, attachment.clipping, byId);
      if (anchor) add('others', attachment.id, attachment.name, anchor, chosenAttachments.has(attachment.id));
      continue;
    }
    const id = renderedAttachmentId(slot), owner = byId.get(slot.bone);
    if (!layers.images || id === null || !slot.region || !owner) continue;
    const anchor = slot.mesh ? bindingCenter(bones, slot.mesh, byId) : transformPoint(owner, slot.region.x, slot.region.y);
    if (anchor) add('images', id, attachment?.name ?? slot.region.name, anchor, chosenAttachments.has(id));
  }

  return tags;
}
