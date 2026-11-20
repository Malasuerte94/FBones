import type {BoneView, MeshOutlineDraft, SlotView} from './project.ts';
import {meshPoints, type Point} from './meshes.ts';

function worldPlane(draft:MeshOutlineDraft,bones:readonly BoneView[]){
  const [origin,u,,v]=meshPoints(bones,draft.plane);
  if(!origin||!u||!v)return null;
  return {origin,ux:u.x-origin.x,uy:u.y-origin.y,vx:v.x-origin.x,vy:v.y-origin.y};
}

export function meshOutlineWorldPoints(draft:MeshOutlineDraft,bones:readonly BoneView[]):Point[] {
  const plane=worldPlane(draft,bones);
  if(!plane)return [];
  const {origin,ux,uy,vx,vy}=plane;
  return draft.points.map(([u,v])=>({x:origin.x+ux*u+vx*v,y:origin.y+uy*u+vy*v}));
}

export function meshOutlineUv(draft:MeshOutlineDraft,bones:readonly BoneView[],point:Point):[number,number]|null {
  const plane=worldPlane(draft,bones);
  if(!plane)return null;
  const {origin,ux,uy,vx,vy}=plane,det=ux*vy-uy*vx;
  if(!Number.isFinite(det)||Math.abs(det)<1e-12)return null;
  const x=point.x-origin.x,y=point.y-origin.y;
  const u=(x*vy-y*vx)/det,v=(y*ux-x*uy)/det;
  // Absorb subpixel arithmetic at the exact image border only.
  const epsilon=1e-7;
  if(!Number.isFinite(u)||!Number.isFinite(v)||u< -epsilon||v< -epsilon||u>1+epsilon||v>1+epsilon)return null;
  return [u,v].map(value=>Math.fround(Math.max(0,Math.min(1,value)))) as [number,number];
}

/** The full source texture is a temporary drawable, separate from authored slots. */
export function meshOutlineSlots(slots:readonly SlotView[],draft:MeshOutlineDraft):SlotView[]{
  return slots.map(slot=>{
    if(!slot.attachments?.some(attachment=>attachment.id===draft.attachmentId&&attachment.mesh))return slot;
    return {...slot,mesh:slot.activeAttachmentId===draft.attachmentId?draft.plane:slot.mesh,
      attachments:slot.attachments.map(attachment=>attachment.id===draft.attachmentId?{...attachment,mesh:draft.plane}:attachment)};
  });
}
