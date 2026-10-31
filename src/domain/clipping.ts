import type { AttachmentView, BoneView, ClippingView, SlotView } from './project.ts';
import { bindingPoints, type Point } from './binding.ts';

export function activeAttachment(slot:SlotView):AttachmentView|null {
  return slot.attachments?.find(a=>a.id===slot.activeAttachmentId)??null;
}

/** A clipping binding has geometry, never a synthetic image or UV rectangle. */
export function clippingPoints(bones:readonly BoneView[],clip:ClippingView):Point[]{
  return bindingPoints(bones,clip);
}

export function convexHull(points:readonly Point[]):Point[]{
  const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y).filter((p,i,all)=>i===0||p.x!==all[i-1]!.x||p.y!==all[i-1]!.y);
  if(sorted.length<3)return sorted;
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const half=(values:Point[])=>{const result:Point[]=[];for(const p of values){while(result.length>1&&cross(result.at(-2)!,result.at(-1)!,p)<=0)result.pop();result.push(p);}return result;};
  const lower=half(sorted),upper=half([...sorted].reverse());lower.pop();upper.pop();return [...lower,...upper];
}

export function clippingPolygon(bones:readonly BoneView[],clip:ClippingView):Point[]{
  const points=clippingPoints(bones,clip);
  // Exact4.3.26 PNG oracle: Inverse uses the convex hull even when its stored
  // Convex checkbox is false/disabled. Both inverse flag combinations matched.
  return clip.convex||clip.inverse?convexHull(points):points;
}

export function polygonContains(points:readonly Point[],point:Point):boolean{
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[j]!,b=points[i]!;
    const area=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);
    if(Math.abs(area)<1e-7&&point.x>=Math.min(a.x,b.x)-1e-7&&point.x<=Math.max(a.x,b.x)+1e-7&&point.y>=Math.min(a.y,b.y)-1e-7&&point.y<=Math.max(a.y,b.y)+1e-7)return true;
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}

/** Documented draw order: owner starts a range, end is inclusive; self means
 * the remaining order. Overlap is invalid and reported, never nested silently. */
export function clippingScopes(slots:readonly SlotView[]){
  const masks=new Map<number,AttachmentView>(),issues:string[]=[];
  let active:AttachmentView|null=null;
  for(const slot of slots){
    const attachment=activeAttachment(slot);
    if(attachment?.clipping){
      if(active)issues.push(`Clipping ranges overlap at ${slot.name}.`);
      else active=attachment;
    }
    if(active)masks.set(slot.id,active);
    if(active?.clipping?.endSlot===slot.id&&active.slot!==slot.id)active=null;
  }
  return {masks,issues};
}

export function clippingAllows(bones:readonly BoneView[],slots:readonly SlotView[],slot:number,point:Point):boolean{
  const clip=clippingScopes(slots).masks.get(slot)?.clipping;
  if(!clip)return true;
  const inside=polygonContains(clippingPolygon(bones,clip),point);
  return clip.inverse?!inside:inside;
}
