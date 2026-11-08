import type {SlotView} from './project.ts';

export type SequenceMode=0|1|2;
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
 return validSequenceSettings(settings)&&integer(value.mode,0,2)&&integer(value.index,0,settings.count-1)&&Number.isFinite(value.delay)&&Number.isFinite(Math.fround(value.delay))&&Math.fround(value.delay)>0;
}
function validatePose(settings:SequenceSettings,value:SequenceWorkingPose){
 if(!validSequenceWorkingPose(settings,value))throw new Error('The Sequence key has an unsupported mode, index or delay.');
}
/** Frame selection changes image content only. Stored f32 endpoints/delays are
 * recovered before f64 interval arithmetic, consistently with native sampling. */
export function sampleSequenceIndex(settings:SequenceSettings,keys:readonly SequenceKey[],frame:number,fps:number,working?:SequenceWorkingPose):number{
 if(!validSequenceSettings(settings))throw new Error('The Sequence settings are invalid.');
 if(!Number.isFinite(frame)||frame<0||frame>1_000_000||!Number.isFinite(fps)||!Number.isFinite(Math.fround(fps))||Math.fround(fps)<=0)throw new Error('Enter a valid Sequence frame and project FPS.');
 if(working){validatePose(settings,working);return working.index;}
 let key:SequenceKey|undefined;
 for(const candidate of keys){if(Math.fround(candidate.frame)>frame)break;key=candidate;}
 if(!key)return settings.setupIndex;
 validatePose(settings,key);
 if(key.mode===0)return key.index;
 const intervals=Math.floor((frame-Math.fround(key.frame))/Math.fround(fps)/Math.fround(key.delay)+SEQUENCE_INTERVAL_BIAS);
 if(!Number.isFinite(intervals)||intervals<0)throw new Error('The Sequence preview interval is out of range.');
 if(key.mode===1)return Math.min(settings.count-1,key.index+intervals);
 return(key.index+intervals%settings.count)%settings.count;
}
export function sampleSequencePoses(slots:readonly SlotView[],tracks:readonly SequenceTrack[],frame:number,fps:number,drafts:ReadonlyMap<number,SequenceWorkingPose>=new Map()):SequencePose[]{
 const byId=new Map(tracks.map(track=>[track.attachment,track]));
 if(byId.size!==tracks.length)throw new Error('A Sequence attachment has duplicate tracks.');
 return slots.flatMap(slot=>(slot.attachments??[]).flatMap(attachment=>{
  const settings=attachment.sequence,region=attachment.region;if(!settings||!region)return[];
  const track=byId.get(attachment.id);if(track&&track.slot!==slot.id)throw new Error('The Sequence track does not belong to this attachment slot.');
  const index=sampleSequenceIndex(settings,track?.keys??[],frame,fps,drafts.get(attachment.id));
  return[{attachment:attachment.id,index,image:sequenceImageKey(region.imagePath||attachment.name,settings,index),imageAvailable:attachment.sequenceAvailableFrames?.includes(index)??false}];
 }));
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
