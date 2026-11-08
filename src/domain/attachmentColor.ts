import type {SlotView} from './project.ts';
import {unpackRgba,type Rgba,type Rgb} from './animationSlots.ts';

/** Attachment Setup tint is independent from slot light RGBA and activation.
 * Legacy flattened views have no attachment tint and retain white. */
export function activeAttachmentColor(slot:SlotView):number{
 return slot.attachments?.find(attachment=>attachment.id===slot.activeAttachmentId)?.color??0xffffffff;
}
/** Straight light components; Pixi retains ownership of shader premultiplication.
 * Sampled alpha stays precise instead of passing through a packed byte again. */
export function slotAttachmentColor(slot:SlotView):Rgba{
 const light=slot.animatedColor??unpackRgba(slot.color??0xffffffff),tint=unpackRgba(activeAttachmentColor(slot));
 return light.map((value,index)=>Math.max(0,Math.min(1,value*tint[index]!))) as Rgba;
}

/** Dark RGB remaps the texture's black end; it is not multiplied by attachment
 * RGB. Stored dark alpha is editor metadata, never another opacity. */
export function slotDarkColor(slot:SlotView):Rgb{
 return slot.tintBlack?[...(slot.animatedDarkColor??unpackRgba(slot.darkColor??0xff).slice(0,3))] as Rgb:[0,0,0];
}

/** Pixi8.8 ColorMatrixFilter unpremultiplies its input and premultiplies the
 * result. Feed it a WHITE-tinted image with combined light/attachment opacity;
 * this matrix maps straight RGB to c*light+(1-c)*dark and retains that alpha.
 * A zero dark contribution keeps the original one-pass render path. */
export type SlotColorMatrix=[...Rgba,number,...Rgba,number,...Rgba,number,...Rgba,number];
export function slotTwoColorMatrix(slot:SlotView):SlotColorMatrix|null{
 const dark=slotDarkColor(slot);if(dark.every(v=>v===0))return null;
 const light=slotAttachmentColor(slot);
 return[light[0]-dark[0],0,0,0,dark[0],0,light[1]-dark[1],0,0,dark[1],0,0,light[2]-dark[2],0,dark[2],0,0,0,1,0];
}
