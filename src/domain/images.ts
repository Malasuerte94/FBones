import type { BoneView, SlotView } from './project.ts';
import { meshContains } from './meshes.ts';
import { radians, localPoint, worldBones, composeAffine } from './rig.ts';
import {clippingAllows} from './clipping.ts';
export function worldRegions(bones: readonly BoneView[], slots: readonly SlotView[]) {
  const parents = new Map(worldBones(bones).map(b => [b.id, b]));
  return slots.flatMap(slot => {
    const parent = parents.get(slot.bone), region = slot.region;
    if (!region || !parent) return [];
    const a=radians(region.rotation),m=composeAffine(parent,{worldX:region.x,worldY:region.y,a:Math.cos(a)*region.scaleX,b:Math.sin(a)*region.scaleX,c:-Math.sin(a)*region.scaleY,d:Math.cos(a)*region.scaleY});
    return [{...slot,region,...m,angle:Math.atan2(m.b,m.a)*180/Math.PI}];
  });
}
export function imageAt(bones: readonly BoneView[], slots: readonly SlotView[], x: number, y: number) {
  return worldRegions(bones, slots).reverse().find(s => {
    if (!s.visible) return false;
    if(!clippingAllows(bones,slots,s.id,{x,y}))return false;
    if (s.mesh) return meshContains(bones, s.mesh, {x,y});
    if ( !s.region.scaleX || !s.region.scaleY) return false;
    try {const p=localPoint(s,x,y);return Math.abs(p.x)<=s.region.width/2&&Math.abs(p.y)<=s.region.height/2;}catch{return false;}
  });
}
export function movedImage(bones: readonly BoneView[], slot: SlotView, x: number, y: number) {
  const parent = worldBones(bones).find(b => b.id === slot.bone);
  const point = localPoint(parent, x, y), r = slot.region;
  return { type: 'updateSlot' as const, id: slot.id, name: slot.name, bone: slot.bone, visible: slot.visible,
    x: point.x, y: point.y, rotation: r?.rotation ?? 0, scaleX: r?.scaleX ?? 1, scaleY: r?.scaleY ?? 1 };
}
