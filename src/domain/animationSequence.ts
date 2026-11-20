import {f32TimeUnits} from './animation.ts';
import {linkedTimelineSourceId,type SlotView} from './project.ts';

export const SEQUENCE_MODES=[0,1,2,3,4,5,6] as const;
export type SequenceMode=(typeof SEQUENCE_MODES)[number];
export interface SequenceSettings {start:number;count:number;digits:number;setupIndex:number}
export interface SequenceKey {id:number;frame:number;mode:SequenceMode;index:number;delay:number}
export interface SequenceKeyInput extends Omit<SequenceKey,'id'> {attachment:number;keyId?:number}
export interface SequenceTrack {attachment:number;slot:number;keys:SequenceKey[]}
export interface SequenceWorkingPose {mode:SequenceMode;index:number;delay:number}
export interface SequencePose {attachment:number;index:number;image:string;imageAvailable:boolean}

// Explicit FBones allocation/timing policies; the paired research notes retain
// the original4.3.26 evidence boundary and secondary public-runtime guidance.
export const MAX_SEQUENCE_COUNT=4096,MAX_SEQUENCE_DIGITS=10,SEQUENCE_INTERVAL_BIAS=.00001;
const MAX_SEQUENCE_NUMBER=0x7fffffff;
function integer(value:number,min:number,max:number):boolean{return Number.isInteger(value)&&value>=min&&value<=max;}
export function validSequenceSettings(value:SequenceSettings):boolean{
 return integer(value.start,0,MAX_SEQUENCE_NUMBER)&&integer(value.count,1,MAX_SEQUENCE_COUNT)&&integer(value.digits,0,MAX_SEQUENCE_DIGITS)&&integer(value.setupIndex,0,value.count-1)&&value.start+value.count-1<=MAX_SEQUENCE_NUMBER;
}
export function sequenceImageKey(base:string,settings:SequenceSettings,index:number):string{
 if(!validSequenceSettings(settings)||!integer(index,0,settings.count-1))throw new Error('The Sequence settings or frame index are invalid.');
 // Native resources own portable path and PNG safety. This operation only adds
 // a bounded decimal suffix; it never strips existing digits or appends .png.
 return base+String(settings.start+index).padStart(settings.digits,'0');
}
export function validSequenceWorkingPose(settings:SequenceSettings,value:SequenceWorkingPose):boolean{
 return validSequenceSettings(settings)&&integer(value.mode,0,SEQUENCE_MODES.length-1)&&integer(value.index,0,settings.count-1)&&Number.isFinite(value.delay)&&Number.isFinite(Math.fround(value.delay))&&Math.fround(value.delay)>0;
}
function validatePose(settings:SequenceSettings,value:SequenceWorkingPose){
 if(!validSequenceWorkingPose(settings,value))throw new Error('The Sequence key has an unsupported mode, index or delay.');
}
function sequenceIntervals(frame:number,start:number,fps:number,delay:number):number{
 return Math.floor((frame-start)/fps/delay+SEQUENCE_INTERVAL_BIAS);
}
export function sequenceKeyIndexForImage(count:number,mode:SequenceMode,imageIndex:number):number{
 return mode>=4?count-1-imageIndex:imageIndex;
}
function projectedIndex(count:number,mode:SequenceMode,index:number,intervals:number):number{
 if(count===1)return 0;
 const last=count-1;
 switch(mode){
  case 0:return Math.min(last,index);
  case 1:return Math.min(last,index+intervals);
  case 2:return (index+intervals%count)%count;
  case 4:return Math.max(0,last-index-intervals);
  case 5:return last-(index+intervals%count)%count;
  case 3:
  case 6:{
   const period=2*last;
   const phase=(index+intervals%period+(mode===6?last:0))%period;
   return Math.min(phase,period-phase);
  }
 }
}
/** Frame selection changes image content only. Stored f32 endpoints/delays are
 * recovered before f64 interval arithmetic, consistently with native sampling. */
export function sampleSequenceIndex(settings:SequenceSettings,keys:readonly SequenceKey[],frame:number,fps:number,working?:SequenceWorkingPose,keySettings=settings):number{
 if(!validSequenceSettings(settings))throw new Error('The Sequence settings are invalid.');
 if(!Number.isFinite(frame)||frame<0||frame>1_000_000||!Number.isFinite(fps)||!Number.isFinite(Math.fround(fps))||Math.fround(fps)<=0)throw new Error('Enter a valid Sequence frame and project FPS.');
 if(working){validatePose(keySettings,working);return projectedIndex(settings.count,working.mode,working.index,0);}
 let key:SequenceKey|undefined;
 for(const candidate of keys){if(Math.fround(candidate.frame)>frame)break;key=candidate;}
 if(!key)return settings.setupIndex;
 validatePose(keySettings,key);
 if(key.mode===0)return projectedIndex(settings.count,key.mode,key.index,0);
 const intervals=sequenceIntervals(frame,Math.fround(key.frame),Math.fround(fps),Math.fround(key.delay));
 if(!Number.isFinite(intervals)||intervals<0)throw new Error('The Sequence preview interval is out of range.');
 return projectedIndex(settings.count,key.mode,key.index,intervals);
}

function frameBefore(frame:number):number{
 const view=new DataView(new ArrayBuffer(8));
 view.setFloat64(0,frame);
 view.setBigUint64(0,view.getBigUint64(0)-1n);
 return view.getFloat64(0);
}

/** Capture the shown image without moving any subsequent transition. An
 * explicit draft authors its own phase, just like the ordinary Sequence Key. */
export function planShownSequenceKey(
 settings:SequenceSettings,track:SequenceTrack,frame:number,fps:number,draft?:SequenceWorkingPose,
 receivers:readonly SequenceSettings[]=[],
):SequenceKeyInput[]{
 const storedFrame=Math.fround(frame), time=storedFrame===0?0:storedFrame, storedFps=Math.fround(fps);
 const shown=sampleSequenceIndex(settings,track.keys,time,storedFps);
 const nextIndex=track.keys.findIndex(key=>Math.fround(key.frame)>time);
 const next=track.keys[nextIndex];
 const left=track.keys[(nextIndex<0?track.keys.length:nextIndex)-1];
 const exact=left&&Math.fround(left.frame)===time?left:undefined;
 const address={attachment:track.attachment,frame:time};
 if(draft){
  validatePose(settings,draft);
  const {mode,index}=draft,delay=Math.fround(draft.delay);
  if(exact&&mode===exact.mode&&index===exact.index&&delay===Math.fround(exact.delay))return [];
  return [{...address,mode,index,delay,...(exact?{keyId:exact.id}:{})}];
 }
 if(exact)return [];
 const mode=left?.mode??0,delay=Math.fround(left?.delay??1/storedFps);
 const modes:SequenceMode[]=mode===3?[3,6]:mode===6?[6,3]:[mode];
 const receiverFrames=receivers.map(receiver=>({count:receiver.count,index:sampleSequenceIndex(receiver,track.keys,time,storedFps,undefined,settings)}));
 const candidates=modes.map(mode=>({mode,index:sequenceKeyIndexForImage(settings.count,mode,shown),delay})).filter(
  pose=>receiverFrames.every(({count,index})=>index===projectedIndex(count,pose.mode,pose.index,0)),
 );
 if(!candidates.length)throw new Error('This key would change an inheriting mesh’s Sequence frame.');
 const pose=candidates[0],counts=[settings.count,...receiverFrames.map(receiver=>receiver.count)];
 validatePose(settings,pose);
 const maxCount=Math.max(...counts);
 if(!left||mode===0||maxCount===1||((mode===1||mode===4)&&pose.index===maxCount-1))return [{...address,...pose}];

 const first=Math.fround(left.frame);
 // The gap uses one factor of 2^-149, and the period uses two.
 const phaseNumerator=(f32TimeUnits(time)-f32TimeUnits(first))<<149n;
 const period=f32TimeUnits(storedFps)*f32TimeUnits(delay);
 const intervals=sequenceIntervals(time,first,storedFps,delay);
 const aligned=Number.isSafeInteger(intervals)&&phaseNumerator%period===0n
  &&phaseNumerator/period===BigInt(intervals);
 if(aligned){
  // On a ping-pong leg the same image can lead in either direction. For
  // each receiving count, the current and next samples identify the leg
  // and phase, including shared turnarounds and single-frame sequences.
  const continuation=candidates.find(candidate=>counts.every(count=>
   projectedIndex(count,mode,left.index,intervals+1)===projectedIndex(count,candidate.mode,candidate.index,1),
  ));
  if(continuation)return [{...address,...continuation}];
 }

 // The next key takes over at its exact frame. Check the last f64 frame
 // beforehand with the same bias and arithmetic used during playback.
 if(next&&Number.isSafeInteger(intervals)){
  const beforeNext=frameBefore(Math.fround(next.frame));
  if(sequenceIntervals(beforeNext,first,storedFps,delay)===intervals
   &&sequenceIntervals(beforeNext,time,storedFps,delay)===0)return [{...address,...pose}];
 }
 throw new Error('This frame would change the Sequence phase before the next key.');
}
export function sampleSequencePoses(slots:readonly SlotView[],tracks:readonly SequenceTrack[],frame:number,fps:number,drafts:ReadonlyMap<number,SequenceWorkingPose>=new Map()):SequencePose[]{
 const byId=new Map(tracks.map(track=>[track.attachment,track]));
 if(byId.size!==tracks.length)throw new Error('A Sequence attachment has duplicate tracks.');
 const attachments=new Map(slots.flatMap(slot=>(slot.attachments??[]).map(attachment=>[attachment.id,{attachment,slot:slot.id}] as const)));
 return [...attachments.values()].flatMap(({attachment})=>{
  const settings=attachment.sequence,region=attachment.region;if(!settings||!region)return[];
  const ownerId=linkedTimelineSourceId(attachment)??attachment.id,owner=attachments.get(ownerId);
  const track=byId.get(ownerId),draft=drafts.get(ownerId),keySettings=owner?.attachment.sequence;
  if(track&&track.slot!==owner?.slot)throw new Error('The Sequence track does not belong to its owner’s slot.');
  if((track||draft)&&!keySettings)throw new Error('The Sequence owner has no image sequence.');
  const index=sampleSequenceIndex(settings,track?.keys??[],frame,fps,draft,keySettings??settings);
  return[{attachment:attachment.id,index,image:sequenceImageKey(region.imagePath||attachment.name,settings,index),imageAvailable:attachment.sequenceAvailableFrames?.includes(index)??false}];
 });
}
/** Shared Setup/Main/Preview projection, including inactive alternatives. Keep
 * authored path/name/dimensions, Mesh/Clip geometry, and slot activation exact. */
export function projectSequencePoses(slots:readonly SlotView[],poses:readonly SequencePose[]):SlotView[]{
 const byId=new Map(poses.map(pose=>[pose.attachment,pose]));
 return slots.map(slot=>{
  if(!slot.attachments?.some(a=>byId.has(a.id)))return slot;
  const attachments=slot.attachments.map(attachment=>{
   const pose=byId.get(attachment.id);if(!pose||!attachment.region)return attachment;
   return{...attachment,region:{...attachment.region,image:pose.image},imageAvailable:pose.imageAvailable};
  });
  const active=attachments.find(a=>a.id===slot.activeAttachmentId);
  return{...slot,attachments,...(active?{region:active.region,imageAvailable:active.imageAvailable}:{})};
 });
}
