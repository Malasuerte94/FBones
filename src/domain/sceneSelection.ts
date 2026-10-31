import type {BoneView,SlotView,AttachmentView,RigEdit,DenseBindingView} from './project.ts';
import {worldRegions} from './images.ts';
import {meshPoints,previewVertices,type Point} from './meshes.ts';
import {worldBones,localPoint,transformPoint} from './rig.ts';
import {polygonContains} from './clipping.ts';
import {bindingPoints,previewBindingVertices} from './binding.ts';

export function renderedAttachmentId(slot:SlotView):number|null{
  return slot.activeAttachmentId===undefined?(slot.visible&&slot.region?slot.id:null):slot.activeAttachmentId;
}
export interface ResolvedAttachment {slot:SlotView;attachment:AttachmentView}
/** Inventory is authoritative, especially when it contains a gesture preview.
 * An inspected object is only a fallback for an owner whose inventory is absent. */
export function resolveAttachment(slots:readonly SlotView[],id:number,inspected?:AttachmentView|null):ResolvedAttachment|null{
  for(const slot of slots){
    const attachment=slot.attachments?.find(a=>a.id===id);
    if(attachment)return{slot,attachment};
  }
  if(inspected?.id===id){const slot=slots.find(s=>s.id===inspected.slot&&s.attachments===undefined);if(slot)return{slot,attachment:inspected};}
  const slot=slots.find(s=>s.attachments===undefined&&renderedAttachmentId(s)===id&&s.region);
  return slot?.region?{slot,attachment:{id,slot:slot.id,name:slot.region.name,type:slot.mesh?'mesh':'region',region:slot.region,mesh:slot.mesh??null,clipping:null,imageAvailable:slot.imageAvailable}}:null;
}
/** Selection geometry is independent from activation, visibility and PNGs.
 * Clip handles use authored vertices, not its optional rendered convex hull. */
export function attachmentGeometry(bones:readonly BoneView[],slot:SlotView,attachment:AttachmentView):Point[]{
  if(attachment.clipping)return bindingPoints(bones,attachment.clipping);
  if(attachment.mesh)return meshPoints(bones,attachment.mesh);
  return attachment.region?imagePolygon(bones,{...slot,visible:true,region:attachment.region,mesh:null}):[];
}
export function selectedAttachmentGeometry(bones:readonly BoneView[],slots:readonly SlotView[],ids:readonly number[],inspected?:AttachmentView|null):Array<ResolvedAttachment&{points:Point[]}>{
  return [...new Set(ids)].flatMap(id=>{const resolved=resolveAttachment(slots,id,inspected);if(!resolved)return[];const points=attachmentGeometry(bones,resolved.slot,resolved.attachment);return points.length?[{...resolved,points}]:[];});
}
/** Replace only the addressed real binding; activation and sibling inventory
 * remain unchanged, including when the edited alternative is inactive. */
export function previewAttachmentBinding(slots:readonly SlotView[],id:number,binding:DenseBindingView):SlotView[]{
  return slots.map(slot=>{
    let changed=false;
    const attachments=slot.attachments?.map(a=>{if(a.id!==id)return a;changed=true;const data={weighted:binding.weighted,bones:binding.bones,vertices:binding.vertices};if(a.clipping)return{...a,clipping:{...a.clipping,...data}};if(a.mesh)return{...a,mesh:{...a.mesh,...data}};throw new Error('Select a mesh or clipping binding.');});
    if(!changed)return slot;
    const active=attachments?.find(a=>a.id===slot.activeAttachmentId);
    return{...slot,attachments,...(active?{region:active.region,mesh:active.mesh}:{})};
  });
}
export function imagePolygon(bones:readonly BoneView[],slot:SlotView):Point[]{
  if(slot.mesh)return meshPoints(bones,slot.mesh);
  const region=worldRegions(bones,[slot])[0];if(!region)return [];
  const w=region.region.width/2,h=region.region.height/2;
  return[[-w,-h],[-w,h],[w,h],[w,-h]].map(([x,y])=>transformPoint(region,x!,y!));
}
export function polygonInBox(points:readonly Point[],a:Point,b:Point):boolean{
  if(!points.length)return false;
  const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),bottom=Math.min(a.y,b.y),top=Math.max(a.y,b.y);
  const inside=(p:Point)=>p.x>=left&&p.x<=right&&p.y>=bottom&&p.y<=top;
  if(points.some(inside))return true;
  const corners=[{x:left,y:bottom},{x:right,y:bottom},{x:right,y:top},{x:left,y:top}];
  if(corners.some(p=>polygonContains(points,p)))return true;
  for(let i=0;i<points.length;i++){
    const p=points[i]!,q=points[(i+1)%points.length]!,dx=q.x-p.x,dy=q.y-p.y;
    let enter=0,exit=1,valid=true;
    for(const [direction,distance]of[[-dx,p.x-left],[dx,right-p.x],[-dy,p.y-bottom],[dy,top-p.y]]){
      if(direction===0){if(distance!<0)valid=false;continue;}
      const t=distance!/direction!;if(direction!<0)enter=Math.max(enter,t);else exit=Math.min(exit,t);
    }
    if(valid&&enter<=exit)return true;
  }
  return false;
}
export function sceneImagesInBox(bones:readonly BoneView[],slots:readonly SlotView[],a:Point,b:Point):number[]{
  return slots.flatMap(s=>{
    const id=renderedAttachmentId(s);if(id===null||!s.visible||!s.region)return[];
    const points=imagePolygon(bones,s);
    if(s.mesh){for(let i=0;i<s.mesh.triangles.length;i+=3){const triangle=s.mesh.triangles.slice(i,i+3).map(index=>points[index]!);if(polygonInBox(triangle,a,b))return[id];}return[];}
    return polygonInBox(points,a,b)?[id]:[];
  });
}
export type AttachmentTransform=Extract<RigEdit,{type:'transformAttachments'}>;
export function transformAttachmentPoint(point:Point,edit:AttachmentTransform):Point{
  if(edit.mode==='translate')return{x:point.x+edit.dx,y:point.y+edit.dy};
  if(edit.mode==='scale')return{x:edit.pivotX+(point.x-edit.pivotX)*edit.scaleX,y:edit.pivotY+(point.y-edit.pivotY)*edit.scaleY};
  const angle=edit.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const x=point.x-edit.pivotX,y=point.y-edit.pivotY;
  return {x:edit.pivotX+x*c-y*s,y:edit.pivotY+x*s+y*c};
}
/** Preview geometry only. Native commits decide if transformed image metadata
 * remains representable or must become a canonical quad mesh. */
export function previewAttachmentTransform(bones:readonly BoneView[],slots:readonly SlotView[],edit:AttachmentTransform):SlotView[]{
  const poses=new Map(worldBones(bones).map(b=>[b.id,b]));
  function attachment(a:AttachmentView,owner:SlotView):AttachmentView{
    if(!edit.ids.includes(a.id))return a;
    if(a.clipping){
      const clip=a.clipping,points=bindingPoints(bones,clip);
      return{...a,clipping:previewBindingVertices(bones,clip,points.map((p,vertex)=>({vertex,...transformAttachmentPoint(p,edit)})))};
    }
    let mesh=a.mesh;
    if(!mesh&&a.region){
      const image={...owner,visible:true,region:a.region,mesh:null},positions=imagePolygon(bones,image).flatMap(p=>{const local=localPoint(poses.get(owner.bone),p.x,p.y);return[local.x,local.y];});
      mesh={weighted:false,bones:[owner.bone],vertices:Array.from({length:4},(_,i)=>({weights:[1],positions:positions.slice(i*2,i*2+2)})),uvs:[0,1,0,0,1,0,1,1],triangles:[0,1,2,0,2,3],edges:[0,1,1,2,2,3,3,0],hull:4};
    }
    if(!mesh)return a;
    const next=previewVertices(bones,mesh,meshPoints(bones,mesh).map((p,vertex)=>({vertex,...transformAttachmentPoint(p,edit)})));
    return {...a,mesh:next};
  }
  return slots.map(slot=>{
    const inventory=slot.attachments??(slot.region?[{id:slot.id,slot:slot.id,name:slot.region.name,type:slot.mesh?'mesh' as const:'region' as const,region:slot.region,mesh:slot.mesh??null,clipping:null,imageAvailable:slot.imageAvailable}]:[]);
    const attachments=inventory.map(a=>attachment(a,slot)),active=attachments.find(a=>a.id===renderedAttachmentId(slot));
    return {...slot,attachments,...(active?{region:active.region,mesh:active.mesh}:{} )};
  });
}
