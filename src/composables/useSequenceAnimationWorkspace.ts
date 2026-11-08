import {computed,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {sampleSequencePoses,projectSequencePoses,validSequenceWorkingPose,type SequenceWorkingPose,type SequenceKeyInput} from '../domain/animationSequence.ts';
import type {AnimationView} from '../domain/animation.ts';
import type {ProjectSummary,RigEdit,SlotView} from '../domain/project.ts';
interface Options{
 project:ShallowRef<ProjectSummary|null>;active:Readonly<Ref<AnimationView|null>>;frame:Ref<number>;fps:Readonly<Ref<number>>;
 mode:Ref<'setup'|'animate'>;autoKey:Ref<boolean>;version:Ref<number>;slots:Readonly<Ref<SlotView[]>>;
 edit:(edit:RigEdit,expectedRevision?:number)=>Promise<boolean>;pause:()=>void;notice:(message:string,error?:boolean)=>void;
}
/** Sequence state is transient until a native key command succeeds. Image
 * selection never changes authored paths, geometry, activation or Setup. */
export function useSequenceAnimationWorkspace(o:Options){
 const sequenceDraft=shallowRef<ReadonlyMap<number,SequenceWorkingPose>>(new Map());
 watch(sequenceDraft,()=>{o.version.value++;},{flush:'sync'});
 const sequencePoses=computed(()=>sampleSequencePoses(o.mode.value==='animate'?o.slots.value:o.project.value?.slots??[],o.mode.value==='animate'?o.active.value?.sequenceTracks??[]:[],o.mode.value==='animate'?o.frame.value:0,o.fps.value,o.mode.value==='animate'?sequenceDraft.value:new Map()));
 const sequenceSlots=computed(()=>projectSequencePoses(o.mode.value==='animate'?o.slots.value:o.project.value?.slots??[],sequencePoses.value));
 const animationSequenceTracks=computed(()=>o.active.value?.sequenceTracks?.map(track=>({id:`sequence:${track.attachment}`,attachmentId:track.attachment,slotId:track.slot,keys:track.keys}))??[]);
 function attachment(id:number){return o.project.value?.slots?.flatMap(slot=>slot.attachments??[]).find(a=>a.id===id);}
 function sequenceWorkingPose(id:number):SequenceWorkingPose{
  const target=attachment(id);if(!target?.sequence)throw Error('Select an attachment with Sequence enabled.');
  const draft=sequenceDraft.value.get(id);if(draft)return{...draft};
  const track=o.active.value?.sequenceTracks?.find(t=>t.attachment===id),key=track?.keys.slice().reverse().find(k=>Math.fround(k.frame)<=o.frame.value);
  return{mode:key?.mode??0,index:sequencePoses.value.find(p=>p.attachment===id)?.index??target.sequence.setupIndex,delay:key?.delay??1/o.fps.value};
 }
 function current(){if(o.mode.value!=='animate'||!o.active.value)throw Error('Create or select an animation first.');return o.active.value;}
 function input(id:number,pose:SequenceWorkingPose):SequenceKeyInput{
  const target=attachment(id);if(!target?.sequence||!validSequenceWorkingPose(target.sequence,pose))throw Error('Use a valid Sequence mode, image index and positive seconds per image.');
  return{attachment:id,frame:o.frame.value,...pose};
 }
 async function perform(action:()=>Promise<boolean>):Promise<boolean>{try{return await action();}catch(error){o.notice(error instanceof Error?error.message:String(error),true);return false;}}
 async function setSequenceAnimationFields(id:number,pose:SequenceWorkingPose,expectedRevision?:number){return perform(async()=>{
  o.pause();const clip=current(),key=input(id,pose),before=sequenceWorkingPose(id);
  if(before.mode===pose.mode&&before.index===pose.index&&before.delay===pose.delay)return true;
  if(!o.autoKey.value){sequenceDraft.value=new Map(sequenceDraft.value).set(id,{mode:key.mode,index:key.index,delay:key.delay});return true;}
  return o.edit({type:'setAnimationSequenceKeys',animation:clip.id,keys:[key]},expectedRevision);
 });}
 async function insertSequenceAnimationKey(id:number){return perform(async()=>{o.pause();return o.edit({type:'setAnimationSequenceKeys',animation:current().id,keys:[input(id,sequenceWorkingPose(id))]});});}
 function sequenceKeysForIds(ids:readonly number[]):SequenceKeyInput[]{return(o.active.value?.sequenceTracks??[]).flatMap(track=>track.keys.filter(key=>ids.includes(key.id)).map(({id,...key})=>({...key,attachment:track.attachment,keyId:id})));}
 async function updateSequenceAnimationKey(change:{id:number}&SequenceWorkingPose){return perform(async()=>{
  o.pause();const key=sequenceKeysForIds([change.id])[0],target=key&&attachment(key.attachment);if(!key||!target?.sequence||!validSequenceWorkingPose(target.sequence,change))return false;
  return o.edit({type:'setAnimationSequenceKeys',animation:current().id,keys:[{...key,mode:change.mode,index:change.index,delay:change.delay}]});
 });}
 function clearSequenceAnimationDraft(){if(sequenceDraft.value.size)sequenceDraft.value=new Map();}
 watch(()=>[o.project.value?.documentId,o.project.value?.animations,o.active.value?.id,o.frame.value,o.mode.value],clearSequenceAnimationDraft,{flush:'sync'});
 return{sequenceDraft,sequencePoses,sequenceSlots,animationSequenceTracks,sequenceWorkingPose,setSequenceAnimationFields,insertSequenceAnimationKey,sequenceKeysForIds,updateSequenceAnimationKey,clearSequenceAnimationDraft};
}
