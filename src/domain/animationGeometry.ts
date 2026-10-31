import {bezierValue,type AnimationCurve} from './animation.ts';
import type {AttachmentView,SlotView} from './project.ts';

export interface DrawOrderKey {id:number;frame:number;order:number[]|null}
export interface DrawOrderKeyInput {frame:number;order:number[]|null;keyId?:number}
/** Deformation has one progress curve for the complete dense offset vector. */
export interface DeformKey {id:number;frame:number;offsets:number[];dataPresent:boolean;curve:AnimationCurve;controls?:[number,number,number,number]|null}
export interface DeformTrack {attachment:number;keys:DeformKey[]}
export interface DeformKeyInput {attachment:number;frame:number;offsets:number[];offsetBits?:number[];dataPresent?:boolean;curve:AnimationCurve;controls?:[number,number,number,number]|null;keyId?:number}
export interface DeformPose {attachment:number;offsets:number[];worldVertices?:[number,number][]}

export function sampleDrawOrder(slots:readonly SlotView[],keys:readonly DrawOrderKey[],frame:number):number[]{
 let order:number[]|null=null;
 for(const key of keys){if(Math.fround(key.frame)>frame)break;order=key.order;}
 return [...(order??slots.map(slot=>slot.id))];
}
export function orderSlots(slots:readonly SlotView[],order:readonly number[]):SlotView[]{
 const byId=new Map(slots.map(slot=>[slot.id,slot]));
 if(order.length!==slots.length||new Set(order).size!==order.length||order.some(id=>!byId.has(id)))throw new Error('Animation draw order must contain every slot exactly once.');
 return order.map(id=>byId.get(id)!);
}
export function sampleDeform(keys:readonly DeformKey[],frame:number,dimension:number):number[]{
 if(!keys.length||frame<Math.fround(keys[0]!.frame))return Array(dimension).fill(0);
 let left=keys[0]!;
 for(let i=1;i<keys.length;i++){
  const right=keys[i]!,first=Math.fround(left.frame),last=Math.fround(right.frame);
  if(frame<last){
   if(left.offsets.length!==dimension||right.offsets.length!==dimension)throw new Error('Animation deformation no longer matches the attachment binding.');
   if(frame===first||left.curve==='stepped')return left.offsets.map(Math.fround);
   const progress=left.curve==='bezier'?(left.controls?bezierValue(frame,first,last,0,1,left.controls.map(Math.fround)):(()=>{throw new Error('Deformation Bézier controls are missing.');})()):(frame-first)/(last-first);
   return left.offsets.map((value,axis)=>Math.fround(value)+(Math.fround(right.offsets[axis]!)-Math.fround(value))*progress);
  }
  left=right;
 }
 if(left.offsets.length!==dimension)throw new Error('Animation deformation no longer matches the attachment binding.');
 return left.offsets.map(Math.fround);
}
export function deformDimension(attachment:AttachmentView):number {
 const binding=attachment.mesh??attachment.clipping;
 return binding?.vertices.reduce((sum,vertex)=>sum+vertex.positions.length,0)??0;
}
export function sampleDeformPoses(slots:readonly SlotView[],tracks:readonly DeformTrack[],frame:number,drafts:ReadonlyMap<number,readonly number[]>=new Map()):DeformPose[]{
 const byId=new Map(tracks.map(track=>[track.attachment,track]));
 return slots.flatMap(slot=>(slot.attachments??[]).filter(a=>(a.mesh||a.clipping)&&(byId.has(a.id)||drafts.has(a.id))).map(attachment=>({attachment:attachment.id,offsets:drafts.has(attachment.id)?[...drafts.get(attachment.id)!]:sampleDeform(byId.get(attachment.id)?.keys??[],frame,deformDimension(attachment))})));
}
/** Keep dense dormant columns, UVs and weights. Only render-time positions change. */
export function deformSlots(slots:readonly SlotView[],poses:readonly DeformPose[]):SlotView[]{
 const byId=new Map(poses.map(pose=>[pose.attachment,pose.offsets]));
 return slots.map(slot=>{
  if(!slot.attachments?.some(attachment=>byId.has(attachment.id)))return slot;
  const attachments=slot.attachments.map(attachment=>{
   const offsets=byId.get(attachment.id),binding=attachment.mesh??attachment.clipping;if(!offsets||!binding)return attachment;
   if(offsets.length!==deformDimension(attachment)||offsets.some(v=>!Number.isFinite(v)))throw new Error('Animation deformation no longer matches the attachment binding.');
   let cursor=0;
   const vertices=binding.vertices.map(vertex=>({...vertex,weights:vertex.weights.map(Math.fround),positions:vertex.positions.map(value=>Math.fround(value)+offsets[cursor++]!)}));
   return {...attachment,...(attachment.mesh?{mesh:{...attachment.mesh,vertices}}:{clipping:{...attachment.clipping!,vertices}})};
  });
  const active=attachments.find(a=>a.id===slot.activeAttachmentId);
  return {...slot,attachments,region:active?.region??slot.region,mesh:active?.mesh??null};
 });
}
