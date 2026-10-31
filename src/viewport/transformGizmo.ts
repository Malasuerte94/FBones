import type { BoneView } from '../domain/project.ts';
import { worldBones } from '../domain/rig.ts';

export interface GizmoPoint { x: number; y: number }
export type GizmoTool = 'translate' | 'rotate' | 'scale' | 'shear' | 'pose';
export type GizmoHandle = 'translate' | 'translateX' | 'translateY' | 'rotate'
  | 'scale' | 'scaleX' | 'scaleY' | 'shearX' | 'shearY';
export type PivotMode = 'individual' | 'group';
export interface GizmoBasis { x: GizmoPoint; y: GizmoPoint }
export const WORLD_GIZMO_BASIS:GizmoBasis = { x:{x:1,y:0}, y:{x:0,y:-1} };
export const GIZMO_RADIUS = 48;
export const GIZMO_AXIS = 64;
export const GIZMO_HIT_PADDING = 7;

/** Geometry is in CSS screen pixels: zoom never changes visible or hit sizes. */
export function gizmoHandles(tool: GizmoTool, origin: GizmoPoint, basis:GizmoBasis=WORLD_GIZMO_BASIS) {
  const { x, y } = origin;
  if (tool === 'rotate' || tool === 'pose') return [
    { handle: 'rotate' as GizmoHandle, kind: 'ring' as const, x, y, radius: GIZMO_RADIUS },
  ];
  if (tool === 'shear') return [
    { handle: 'shearX' as GizmoHandle, kind: 'diamond' as const, x: x + GIZMO_AXIS, y, radius: 6 },
    { handle: 'shearY' as GizmoHandle, kind: 'diamond' as const, x, y: y - GIZMO_AXIS, radius: 6 },
  ];
  const prefix = tool === 'scale' ? 'scale' : 'translate';
  return [
    { handle: prefix as GizmoHandle, kind: 'square' as const, x, y, radius: 6 },
    { handle: `${prefix}X` as GizmoHandle, kind: 'axisX' as const, x: x + basis.x.x*GIZMO_AXIS, y:y+basis.x.y*GIZMO_AXIS, radius: 5 },
    { handle: `${prefix}Y` as GizmoHandle, kind: 'axisY' as const, x: x + basis.y.x*GIZMO_AXIS, y:y+basis.y.y*GIZMO_AXIS, radius: 5 },
  ];
}

export function hitGizmo(tool: GizmoTool, origin: GizmoPoint, point: GizmoPoint, basis:GizmoBasis=WORLD_GIZMO_BASIS): GizmoHandle | null {
  const handles=gizmoHandles(tool,origin,basis);
  // An explicit endpoint beats a nearby shaft when inherited shear brings axes close.
  const endpoints=handles.filter(h=>h.kind==='axisX'||h.kind==='axisY').filter(h=>
    Math.max(Math.abs(point.x-h.x),Math.abs(point.y-h.y))<=h.radius+2)
    .sort((a,b)=>Math.hypot(point.x-a.x,point.y-a.y)-Math.hypot(point.x-b.x,point.y-b.y));
  if(endpoints.length)return endpoints[0]!.handle;
  const shafts:{handle:GizmoHandle;distance:number}[]=[];
  for (const h of handles) {
    const dx = point.x - h.x, dy = point.y - h.y;
    if (h.kind === 'ring') {
      if (Math.abs(Math.hypot(dx, dy) - h.radius) <= GIZMO_HIT_PADDING) return h.handle;
    } else if (h.kind === 'diamond') {
      if (Math.abs(dx) + Math.abs(dy) <= h.radius + GIZMO_HIT_PADDING) return h.handle;
    } else if (h.kind === 'square') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= h.radius + 2) return h.handle;
    } else {
      const direction=h.kind==='axisX'?basis.x:basis.y;
      const vx=point.x-origin.x,vy=point.y-origin.y;
      const projection=vx*direction.x+vy*direction.y;
      const distance=Math.abs(vx*direction.y-vy*direction.x);
      if(projection>=14&&projection<=GIZMO_AXIS+10&&distance<=GIZMO_HIT_PADDING)shafts.push({handle:h.handle,distance});
    }
  }
  return shafts.sort((a,b)=>a.distance-b.distance)[0]?.handle??null;
}

export function gizmoCursor(handle: GizmoHandle | null): string {
  switch (handle) {
    case 'rotate': return 'grab';
    case 'translate': return 'move';
    case 'translateX': case 'scaleX': case 'shearY': return 'ew-resize';
    case 'translateY': case 'scaleY': case 'shearX': return 'ns-resize';
    case 'scale': return 'nwse-resize';
    default: return 'default';
  }
}

/** Smallest signed increment prevents the +180/-180 pointer branch-cut jump. */
export function angleDelta(previous: number, next: number): number {
  return Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
}
export function pointerAngle(origin: GizmoPoint, point: GizmoPoint): number {
  return Math.atan2(origin.y - point.y, point.x - origin.x);
}

export function selectedTopBones(bones: readonly BoneView[], ids: readonly number[]): number[] {
  const byId = new Map(bones.map(b => [b.id, b]));
  const selected = new Set(ids);
  return [...new Set(ids)].filter(id => {
    if (!byId.has(id)) return false;
    let parent = byId.get(id)!.parent;
    while (parent !== null) {
      if (selected.has(parent)) return false;
      parent = byId.get(parent)?.parent ?? null;
    }
    return true;
  });
}

export function transformPivot(bones: readonly BoneView[], ids: readonly number[], active: number,
  mode: PivotMode): GizmoPoint | null {
  const poses = worldBones(bones);
  const selected = new Set(selectedTopBones(bones, ids));
  const top = poses.filter(b => selected.has(b.id));
  const bone = poses.find(b => b.id === active);
  if (mode === 'individual') {
    if (!bone) return null;
    let pivot = bone;
    let parent = bone.parent;
    while (parent !== null) {
      const ancestor = poses.find(b => b.id === parent);
      if (!ancestor) break;
      if (selected.has(parent)) pivot = ancestor;
      parent = ancestor.parent;
    }
    return { x: pivot.worldX, y: pivot.worldY };
  }
  if (!top.length) return null;
  return { x: top.reduce((sum, b) => sum + b.worldX, 0) / top.length,
    y: top.reduce((sum, b) => sum + b.worldY, 0) / top.length };
}

/** Scale manipulates local channels; inherited world columns orient its screen handles. */
export function scaleBasis(bones:readonly BoneView[],ids:readonly number[],active:number):GizmoBasis|null {
  const poses=worldBones(bones),top=new Set(selectedTopBones(bones,ids));
  let bone=poses.find(b=>b.id===active);
  if(!bone)return null;
  let parent=bone.parent;
  while(parent!==null){const ancestor=poses.find(b=>b.id===parent);if(!ancestor)break;if(top.has(parent))bone=ancestor;parent=ancestor.parent;}
  const xLength=Math.hypot(bone.a,bone.b),yLength=Math.hypot(bone.c,bone.d);
  if(xLength<1e-8||yLength<1e-8)return null;
  return{x:{x:bone.a/xLength,y:-bone.b/xLength},y:{x:bone.c/yLength,y:-bone.d/yLength}};
}

const clampScale = (value: number) => Math.max(0.01, Math.min(100, value));
const clampShear = (value: number) => Math.max(-85, Math.min(85, value));

export function gizmoDelta(handle: GizmoHandle, origin: GizmoPoint, start: GizmoPoint,
  current: GizmoPoint, zoom: number, rotation: number,basis:GizmoBasis=WORLD_GIZMO_BASIS) {
  const dx = current.x - start.x, dy = start.y - current.y;
  const result = { dx: 0, dy: 0, rotation: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 };
  if (handle === 'translate' || handle === 'translateX') result.dx = dx / zoom;
  if (handle === 'translate' || handle === 'translateY') result.dy = dy / zoom;
  if (handle === 'rotate') result.rotation = rotation * 180 / Math.PI;
  if (handle === 'scale') result.scaleX = result.scaleY = clampScale(Math.exp((dx + dy) / 100));
  if (handle === 'scaleX') {
    const distance = (start.x-origin.x)*basis.x.x+(start.y-origin.y)*basis.x.y;
    const next = (current.x-origin.x)*basis.x.x+(current.y-origin.y)*basis.x.y;
    result.scaleX = clampScale(Math.abs(distance) > 8 ? next / distance : 1 + (next-distance) / GIZMO_AXIS);
  }
  if (handle === 'scaleY') {
    const distance = (start.x-origin.x)*basis.y.x+(start.y-origin.y)*basis.y.y;
    const next = (current.x-origin.x)*basis.y.x+(current.y-origin.y)*basis.y.y;
    result.scaleY = clampScale(Math.abs(distance) > 8 ? next / distance : 1 + (next-distance) / GIZMO_AXIS);
  }
  if (handle === 'shearX' || handle === 'shearY') {
    const shear = clampShear(angleDelta(pointerAngle(origin, start), pointerAngle(origin, current)) * 180 / Math.PI);
    if (handle === 'shearX') result.shearX = shear;
    else result.shearY = shear;
  }
  return result;
}
