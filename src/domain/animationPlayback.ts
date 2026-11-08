import type {AnimationView} from './animation.ts';
import type {SlotView} from './project.ts';
import {validSequenceWorkingPose} from './animationSequence.ts';

export interface AnimationLoopRange {start:number|null;end:number|null}
export interface AnimationPreviewEnd {end:number;extended:boolean;exceedsBudget:boolean}
export const MAX_ANIMATION_PREVIEW_FRAME=1_000_000;

/** FBones preview policy, not a serialized animation duration. Only the final
 * running key per attachment contributes a tail; earlier keys are superseded.
 * A budget-exceeded end stays uncapped so callers cannot silently cut a cycle. */
export function animationPreviewEnd(animation:AnimationView|null,slots:readonly SlotView[],fps:number):AnimationPreviewEnd{
  if(!animation)return{end:0,extended:false,exceedsBudget:false};
  const baseline=Math.fround(animation.duration),clock=Math.fround(fps);
  if(!Number.isFinite(baseline)||baseline<0||!Number.isFinite(clock)||clock<=0)throw new Error('The animation preview extent or FPS is invalid.');
  let end=baseline;
  const attachments=new Map(slots.flatMap(slot=>(slot.attachments??[]).map(attachment=>[attachment.id,{attachment,slot:slot.id}] as const))),seen=new Set<number>();
  for(const track of animation.sequenceTracks??[]){
    if(seen.has(track.attachment))throw new Error('A Sequence attachment has duplicate tracks.');
    seen.add(track.attachment);
    const target=attachments.get(track.attachment),key=track.keys.at(-1);
    if(!target?.attachment.sequence||!target.attachment.region||target.slot!==track.slot||!key)throw new Error('The Sequence preview target or final key is unavailable.');
    const settings=target.attachment.sequence,frame=Math.fround(key.frame);
    if(!Number.isFinite(frame)||frame<0||frame>MAX_ANIMATION_PREVIEW_FRAME||!validSequenceWorkingPose(settings,key))throw new Error('The final Sequence key has an unsupported frame, mode, index or delay.');
    if(key.mode===0)continue;
    const interval=Math.fround(key.delay)*clock;
    let tail=(key.mode===2?settings.count:settings.count-key.index)*interval;
    if(key.mode===2&&tail<1)tail*=Math.ceil(1/tail);
    tail=Math.max(1,tail);
    const candidate=frame+tail;
    if(!Number.isFinite(candidate))throw new Error('The Sequence preview extent is not finite.');
    end=Math.max(end,candidate);
  }
  return{end,extended:end>baseline,exceedsBudget:end>MAX_ANIMATION_PREVIEW_FRAME};
}

/** Preview range policy; these values never author animation data. */
export function validAnimationLoopRange({start,end}:AnimationLoopRange,duration:number):boolean{
  if([start,end].some(value=>value!==null&&(!Number.isFinite(value)||value<0||value>MAX_ANIMATION_PREVIEW_FRAME)))return false;
  // An empty clip still needs to be able to clear its preview range.
  return start===null&&end===null||(end??duration)>(start??0);
}
