export type BoneHoverSource = 'tree-pointer' | 'tree-focus' | 'weights-pointer' | 'weights-focus' | 'viewport';
interface HoverClaim {id:number;order:number}
export interface BoneHoverState {claims:Partial<Record<BoneHoverSource,HoverClaim>>;sequence:number}
export const emptyBoneHover=():BoneHoverState=>({claims:{},sequence:0});
export function activeBoneHover(state:BoneHoverState):{source:BoneHoverSource;id:number}|null {
  let active:{source:BoneHoverSource;id:number;order:number}|null=null;
  for(const [source,claim] of Object.entries(state.claims) as [BoneHoverSource,HoverClaim][])
    if(!active||claim.order>active.order)active={source,id:claim.id,order:claim.order};
  return active?{source:active.source,id:active.id}:null;
}
export function claimBoneHover(state:BoneHoverState,source:BoneHoverSource,id:number):BoneHoverState {
  const current=activeBoneHover(state);
  if(current?.source===source&&current.id===id)return state;
  const sequence=state.sequence+1;
  return{sequence,claims:{...state.claims,[source]:{id,order:sequence}}};
}
/** Target guard prevents an old leave(A) from erasing a newer enter(B). */
export function releaseBoneHover(state:BoneHoverState,source?:BoneHoverSource,id?:number):BoneHoverState {
  if(source===undefined)return emptyBoneHover();
  const claim=state.claims[source];
  if(!claim||(id!==undefined&&claim.id!==id))return state;
  const claims={...state.claims};delete claims[source];return{...state,claims};
}
export function pruneBoneHover(state:BoneHoverState,ids:ReadonlySet<number>):BoneHoverState {
  let result=state;
  for(const [source,claim] of Object.entries(state.claims) as [BoneHoverSource,HoverClaim][])
    if(!ids.has(claim.id))result=releaseBoneHover(result,source,claim.id);
  return result;
}

/** Transient feedback colors never replace the persisted bone RGBA value. */
export function boneHighlightStyle(baseColor:number,selected:boolean,influence:boolean,hovered:boolean) {
  const pinned=selected||influence;
  return{color:pinned?0x68d7e7:hovered?0xffffff:baseColor,
    width:pinned?2.25:hovered?2:1.25,fillAlpha:pinned?0.5:hovered?0.4:0.25,
    hovered,selected,pinned,influence,hoverColor:0xffffff};
}
