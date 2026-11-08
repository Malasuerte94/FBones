import {computed,ref,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {keyValues,sampleAnimation,sameAnimationFrame,bezierTimeMonotone,animationChannelDimensions,animationChannelFamily,animationBoneChannels,type AnimationFamily,type AnimationChannel,type AnimationCurve,type AnimationKeyInput,type BezierControls} from '../domain/animation.ts';
import type {BoneView,ProjectSummary,RigEdit} from '../domain/project.ts';
import {previewEdit} from '../domain/rig.ts';
import {useSlotAnimationWorkspace,shiftSlotAnimationKey} from './useSlotAnimationWorkspace.ts';
import type {SlotAnimationKeyInput} from '../domain/animationSlots.ts';
import {useGeometryAnimationWorkspace,shiftDeformKey} from './useGeometryAnimationWorkspace.ts';
import type {DeformKeyInput,DrawOrderKeyInput} from '../domain/animationGeometry.ts';
import {useConstraintAnimationWorkspace,shiftConstraintKey} from './useConstraintAnimationWorkspace.ts';
import type {ConstraintKeyInput} from '../domain/animationConstraints.ts';
import {eventsBetween,type EventKeyInput,type FiredEvent} from '../domain/animationEvents.ts';
import {animationPreviewEnd as previewEnd,MAX_ANIMATION_PREVIEW_FRAME,validAnimationLoopRange} from '../domain/animationPlayback.ts';
import {boneChannelValues,useAnimationDraftRetention} from './useAnimationDraftRetention.ts';
import {useSequenceAnimationWorkspace} from './useSequenceAnimationWorkspace.ts';
import type {SequenceKeyInput} from '../domain/animationSequence.ts';
import {logicalDocumentKey} from '../domain/resourceContinuity.ts';

interface AnimationWorkspaceOptions {
  project:ShallowRef<ProjectSummary|null>;busy:Ref<boolean>;selectedIds:Ref<number[]>;
  editorMode:Ref<'setup'|'animate'>;localBones:ShallowRef<BoneView[]>;attachment:Ref<number|null>;
  edit:(edit:RigEdit,expectedRevision?:number)=>Promise<boolean>;notice:(message:string,error?:boolean)=>void;
  changed:()=>void;
  startPlayback?:()=>void;stopPlayback?:()=>void;fireEvents?:(events:FiredEvent[])=>void;
}
export function useAnimationWorkspace(o:AnimationWorkspaceOptions){
  const animationId=ref<number|null>(null),animationFrame=ref(0),animationPlaying=ref(false);
  const animationSpeed=ref(1);
  const animationLoop=ref(true),animationAutoKey=ref(true),animationLoopStart=ref<number|null>(null),animationLoopEnd=ref<number|null>(null);
  const animationDraft=shallowRef<BoneView[]|null>(null);
  const animationDraftVersion=ref(0);
  const animationDraftEpoch=ref(0);
  watch(()=>[logicalDocumentKey(o.project.value),animationId.value,animationFrame.value,o.editorMode.value],(value,previous)=>{if(!previous||value.some((item,index)=>item!==previous[index]))animationDraftEpoch.value++;},{flush:'sync'});
  watch(animationDraft,()=>{animationDraftVersion.value++;},{flush:'sync'});
  const animationClipboard=shallowRef<{documentKey:string;keys:AnimationKeyInput[];slotKeys:SlotAnimationKeyInput[];drawOrderKeys:DrawOrderKeyInput[];deformKeys:DeformKeyInput[];constraintKeys:ConstraintKeyInput[];eventKeys:EventKeyInput[];sequenceKeys:SequenceKeyInput[]}|null>(null);
  const animationCanPaste=computed(()=>{const clipboard=animationClipboard.value;return !!clipboard&&clipboard.documentKey===logicalDocumentKey(o.project.value)&&!!(clipboard.keys.length||clipboard.slotKeys.length||clipboard.drawOrderKeys.length||clipboard.deformKeys.length||clipboard.constraintKeys.length||clipboard.eventKeys.length||clipboard.sequenceKeys.length);});
  const animations=computed(()=>o.project.value?.animations??[]);
  const activeAnimation=computed(()=>animations.value.find(a=>a.id===animationId.value)??null);
  const animationChannels=computed(()=>o.project.value?.animationChannels??[]);
  const animationFps=computed(()=>o.project.value?.animationFps??30);
  const animationStoredDuration=computed(()=>Math.fround(activeAnimation.value?.duration??0));
  const animationPreview=computed(()=>previewEnd(activeAnimation.value,o.project.value?.slots??[],animationFps.value));
  const animationAutomaticPreviewEnd=computed(()=>animationPreview.value.end);
  const animationPreviewEnd=computed(()=>animationLoopEnd.value??animationAutomaticPreviewEnd.value);
  const animationPreviewExceedsBudget=computed(()=>animationPreviewEnd.value>MAX_ANIMATION_PREVIEW_FRAME);
  // Keep unbounded derived candidates out of the ruler; authoring data and the
  // explicit user range remain separate from this bounded display extent.
  const animationDuration=computed(()=>Math.min(MAX_ANIMATION_PREVIEW_FRAME,animationPreviewExceedsBudget.value?animationStoredDuration.value:animationPreviewEnd.value));
  const animationBones=computed(()=>animationDraft.value??sampleAnimation(o.project.value?.bones??[],activeAnimation.value,animationFrame.value));
  const animationTracks=computed(()=>activeAnimation.value?.tracks.map(track=>({id:`${track.bone}:${track.channel}`,boneId:track.bone,channel:track.channel,keys:track.keys.map(key=>({...key,values:key.values.slice(0,animationChannelDimensions(track.channel)),controls:key.controls?.slice(0,animationChannelDimensions(track.channel)),interpolation:key.curve}))}))??[]);
  const slotAnimation=useSlotAnimationWorkspace({project:o.project,active:activeAnimation,frame:animationFrame,mode:o.editorMode,autoKey:animationAutoKey,edit:o.edit,pause:pauseAnimation});
  watch(slotAnimation.slotAnimationDraft,()=>{animationDraftVersion.value++;},{flush:'sync'});
  const geometryAnimation=useGeometryAnimationWorkspace({project:o.project,active:activeAnimation,slots:slotAnimation.slotAnimationSlots,frame:animationFrame,mode:o.editorMode,autoKey:animationAutoKey,version:animationDraftVersion,attachment:o.attachment,edit:o.edit,pause:pauseAnimation,notice:o.notice});
  const constraintAnimation=useConstraintAnimationWorkspace({project:o.project,active:activeAnimation,frame:animationFrame,mode:o.editorMode,autoKey:animationAutoKey,version:animationDraftVersion,edit:o.edit,pause:pauseAnimation,notice:o.notice});
  const sequenceAnimation=useSequenceAnimationWorkspace({project:o.project,active:activeAnimation,frame:animationFrame,fps:animationFps,mode:o.editorMode,autoKey:animationAutoKey,version:animationDraftVersion,slots:geometryAnimation.drawOrderSlots,edit:o.edit,pause:pauseAnimation,notice:o.notice});
  const draftRetention=useAnimationDraftRetention({project:o.project,active:activeAnimation,frame:animationFrame,mode:o.editorMode,epoch:animationDraftEpoch,bones:animationDraft,slots:slotAnimation,geometry:geometryAnimation,constraints:constraintAnimation,sequences:sequenceAnimation});
  function pauseAnimation(){animationPlaying.value=false;o.stopPlayback?.();}
  function resetDrafts(){animationDraft.value=null;slotAnimation.clearSlotAnimationDraft();geometryAnimation.clearGeometryAnimationDraft();constraintAnimation.clearConstraintAnimationDraft();sequenceAnimation.clearSequenceAnimationDraft();}
  function clearAnimationDraft(){animationDraftEpoch.value++;resetDrafts();}
  function seekAnimation(frame:number){
    if(!Number.isFinite(frame)||o.busy.value)return;
    pauseAnimation();clearAnimationDraft();animationFrame.value=Math.fround(Math.max(0,Math.min(1_000_000,frame)));
  }
  function selectAnimation(id:number|null){if(id!==null&&!animations.value.some(a=>a.id===id))return;pauseAnimation();clearAnimationDraft();animationId.value=id;animationFrame.value=0;animationLoopStart.value=null;animationLoopEnd.value=null;}
  function resetAnimationState(){selectAnimation(animations.value[0]?.id??null);animationClipboard.value=null;}
  function playAnimation(){
    if(!activeAnimation.value||o.busy.value||o.editorMode.value!=='animate')return;
    const start=animationLoopStart.value??0,end=animationPreviewEnd.value;
    if(animationPreviewExceedsBudget.value){o.notice('The automatic Sequence preview exceeds the frame limit. Set an explicit Loop End.',true);return;}
    if(!validAnimationLoopRange({start,end},end))return;
    const position=animationFrame.value<start||animationFrame.value>=end?start:animationFrame.value;
    const events=eventsBetween(activeAnimation.value.eventTracks??[],position,position,true);
    if(events.length>4096){o.notice('There are too many events in this playback interval.',true);return;}
    clearAnimationDraft();animationFrame.value=position;
    o.startPlayback?.();animationPlaying.value=true;o.fireEvents?.(events);
  }
  function advanceAnimation(elapsed:number){
    if(!animationPlaying.value||o.busy.value||!Number.isFinite(elapsed)||elapsed<0)return;
    const start=animationLoopStart.value??0,end=animationPreviewEnd.value;
    if(!validAnimationLoopRange({start,end},end)){pauseAnimation();return;}
    const previous=animationFrame.value,tracks=activeAnimation.value?.eventTracks??[];
    let next=previous+Math.min(elapsed,.25)*Math.fround(animationFps.value)*animationSpeed.value,events:FiredEvent[];
    if(next>=end&&animationLoop.value){
      const cycles=Math.floor((next-start)/(end-start));
      if(tracks.length&&cycles>256){pauseAnimation();o.notice('The playback range is too short for event preview.',true);return;}
      events=eventsBetween(tracks,previous,end);
      if(tracks.length)for(let cycle=1;cycle<cycles;cycle++){const batch=eventsBetween(tracks,start,end,true);if(events.length+batch.length>4096){pauseAnimation();o.notice('There are too many events in this playback interval.',true);return;}events.push(...batch);}
      next=start+(next-start)%(end-start);const head=eventsBetween(tracks,start,next,true);if(events.length+head.length>4096){pauseAnimation();o.notice('There are too many events in this playback interval.',true);return;}events.push(...head);
    }else{if(next>=end){next=end;pauseAnimation();}events=eventsBetween(tracks,previous,next);}
    if(events.length>4096){pauseAnimation();o.notice('There are too many events in this playback interval.',true);return;}
    animationFrame.value=next;
    o.fireEvents?.(events);
  }
  function setAnimationLoopRange(range:{start:number|null;end:number|null}){
    const {start,end}=range;
    if(!validAnimationLoopRange(range,animationAutomaticPreviewEnd.value))return;
    if(start===animationLoopStart.value&&end===animationLoopEnd.value)return;
    pauseAnimation();
    animationLoopStart.value=start;animationLoopEnd.value=end;
  }
  async function createAnimation(name:string){if(await o.edit({type:'createAnimation',name})){selectAnimation(o.project.value?.editedAnimation??animations.value.at(-1)?.id??null);}}
  async function renameAnimation(change:{id:number;name:string}){await o.edit({type:'renameAnimation',...change});}
  async function deleteAnimation(id:number){await o.edit({type:'deleteAnimation',id});}
  async function setAnimationFps(fps:number){pauseAnimation();await o.edit({type:'setAnimationFps',fps});}
  async function duplicateAnimation(id:number){
    const source=animations.value.find(a=>a.id===id);if(!source)return;
    let name=source.name+' copy',index=2;while(animations.value.some(a=>a.name===name))name=source.name+' copy '+index++;
    if(await o.edit({type:'duplicateAnimation',id,name}))selectAnimation(o.project.value?.editedAnimation??animations.value.at(-1)?.id??null);
  }
  function copyAnimationKeys(ids:number[]){
    const clip=activeAnimation.value,model=o.project.value;if(!clip||!model)return;
    const chosen=clip.tracks.flatMap(track=>track.keys.filter(key=>ids.includes(key.id)).map(key=>({bone:track.bone,channel:track.channel,frame:Math.fround(key.frame),values:[...key.values] as [number,number],curve:key.curve,...(key.controls?{controls:key.controls.map(axis=>[Math.fround(axis[0]),axis[1],Math.fround(axis[2]),axis[3]]) as BezierControls}:{})})));
    const slots=slotAnimation.slotKeysForIds(ids).map(({keyId:_,...key})=>shiftSlotAnimationKey(key as SlotAnimationKeyInput,0,true));
    const geometry=geometryAnimation.geometryKeysForIds(ids),drawOrderKeys=geometry.drawOrderKeys.map(({keyId:_,...key})=>({...key,frame:Math.fround(key.frame)})),deformKeys=geometry.deformKeys.map(({keyId:_,...key})=>shiftDeformKey(key,0,true));
    const constraintKeys=constraintAnimation.constraintKeysForIds(ids).map(({keyId:_,...key})=>shiftConstraintKey(key,0,true));
    const eventKeys=constraintAnimation.eventKeysForIds(ids).map(({keyId:_,...key})=>({...key,frame:Math.fround(key.frame)}));
    const sequenceKeys=sequenceAnimation.sequenceKeysForIds(ids).map(({keyId:_,...key})=>({...key,frame:Math.fround(key.frame)}));
    if(!chosen.length&&!slots.length&&!drawOrderKeys.length&&!deformKeys.length&&!constraintKeys.length&&!eventKeys.length&&!sequenceKeys.length)return;
    const start=Math.min(...chosen.map(key=>key.frame),...slots.map(key=>key.frame),...drawOrderKeys.map(key=>key.frame),...deformKeys.map(key=>key.frame),...constraintKeys.map(key=>key.frame),...eventKeys.map(key=>key.frame),...sequenceKeys.map(key=>key.frame));
    animationClipboard.value={documentKey:logicalDocumentKey(model),keys:chosen.map(key=>({...key,frame:key.frame-start,...(key.controls?{controls:key.controls.map((axis,index)=>index>=animationChannelDimensions(key.channel)?[0,0,0,0]:[axis[0]-start,axis[1],axis[2]-start,axis[3]]) as BezierControls}:{})})),slotKeys:slots.map(key=>shiftSlotAnimationKey(key,-start)),drawOrderKeys:drawOrderKeys.map(key=>({...key,frame:key.frame-start})),deformKeys:deformKeys.map(key=>shiftDeformKey(key,-start)),constraintKeys:constraintKeys.map(key=>shiftConstraintKey(key,-start)),eventKeys:eventKeys.map(key=>({...key,frame:key.frame-start})),sequenceKeys:sequenceKeys.map(key=>({...key,frame:key.frame-start}))};
  }
  async function pasteAnimationKeys(){
    pauseAnimation();
    if(!animationCanPaste.value||!activeAnimation.value||!animationClipboard.value)return;
    const origin=Math.fround(animationFrame.value);
    const keys=animationClipboard.value.keys.map(key=>({...key,frame:key.frame+origin,...(key.controls?{controls:key.controls.map((axis,index)=>index>=animationChannelDimensions(key.channel)?[0,0,0,0]:[axis[0]+origin,axis[1],axis[2]+origin,axis[3]]) as BezierControls}:{})}));
    const slotKeys=animationClipboard.value.slotKeys.map(key=>shiftSlotAnimationKey(key,origin));
    const drawOrderKeys=animationClipboard.value.drawOrderKeys.map(key=>({...key,frame:key.frame+origin})),deformKeys=animationClipboard.value.deformKeys.map(key=>shiftDeformKey(key,origin));
    const constraintKeys=animationClipboard.value.constraintKeys.map(key=>shiftConstraintKey(key,origin)),eventKeys=animationClipboard.value.eventKeys.map(key=>({...key,frame:key.frame+origin}));
    const sequenceKeys=animationClipboard.value.sequenceKeys.map(key=>({...key,frame:key.frame+origin}));
    await o.edit(slotKeys.length||drawOrderKeys.length||deformKeys.length||constraintKeys.length||eventKeys.length||sequenceKeys.length?{type:'setAnimationKeyBatch',animation:activeAnimation.value.id,boneKeys:keys,slotKeys,drawOrderKeys,deformKeys,constraintKeys,eventKeys,...(sequenceKeys.length?{sequenceKeys}:{})}:{type:'setAnimationKeys',animation:activeAnimation.value.id,keys});
  }
  function boneKey(bone:BoneView,channel:AnimationChannel):AnimationKeyInput{
    const base=o.project.value!.bones.find(item=>item.id===bone.id)!;
    const current=activeAnimation.value!.tracks.find(track=>track.bone===bone.id&&track.channel===channel)?.keys.slice().reverse().find(key=>sameAnimationFrame(key.frame,animationFrame.value));
    return {bone:bone.id,channel,frame:animationFrame.value,values:keyValues(base,bone,channel),curve:current?.curve??'linear',...(current?.controls?{controls:current.controls}:{})};
  }
  function supportsBoneChannel(channel:AnimationChannel):boolean{return animationChannels.value.includes(channel)||animationChannels.value.includes(animationChannelFamily(channel));}
  async function insertAnimationKeys(channel:AnimationChannel='translate'){
    pauseAnimation();const clip=activeAnimation.value;if(!clip||!supportsBoneChannel(channel))return;
    const keys:AnimationKeyInput[]=[];
    try{
      for(const bone of animationBones.value.filter(b=>o.selectedIds.value.includes(b.id))){
        const stored=animationBoneChannels(clip,bone.id),family=animationChannelFamily(channel);
        const channels=channel===family?stored.filter(item=>animationChannelFamily(item)===family):stored.filter(item=>item===channel);
        if(!channels.length)throw new Error('This axis requires an existing separated channel. The animation was retained.');
        for(const actual of channels){if(!supportsBoneChannel(actual))throw new Error('This animation channel is not available yet.');keys.push(boneKey(bone,actual));}
      }
    }catch(error){o.notice(error instanceof Error?error.message:String(error),true);return;}
    if(!keys.length){o.notice('Select a bone to key.',true);return;}
    await o.edit({type:'setAnimationKeys',animation:clip.id,keys});
  }
  async function keyAnimationChanges(fallback:AnimationFamily='translate'){
    pauseAnimation();const clip=activeAnimation.value;if(!clip)return;
    const saved=new Map(sampleAnimation(o.project.value!.bones,clip,animationFrame.value).map(bone=>[bone.id,bone]));
    const keys:AnimationKeyInput[]=[];
    try{
      for(const bone of animationBones.value.filter(b=>o.selectedIds.value.includes(b.id))){
        const before=saved.get(bone.id);if(!before)continue;
        for(const channel of animationBoneChannels(clip,bone.id)){
          if(!supportsBoneChannel(channel))continue;
          const a=boneChannelValues(before,channel),b=boneChannelValues(bone,channel);
          if(b.some((value,index)=>value!==a[index]))keys.push(boneKey(bone,channel));
        }
      }
    }catch(error){o.notice(error instanceof Error?error.message:String(error),true);return;}
    if(keys.length)await o.edit({type:'setAnimationKeys',animation:clip.id,keys});
    else await insertAnimationKeys(fallback);
  }
  async function updateAnimationKey(change:{id:number;values:number[]}){
    const clip=activeAnimation.value;if(!clip)return;
    for(const track of clip.tracks){const key=track.keys.find(k=>k.id===change.id);if(key){await o.edit({type:'setAnimationKey',keyId:key.id,animation:clip.id,bone:track.bone,channel:track.channel,frame:key.frame,values:[change.values[0]??0,animationChannelDimensions(track.channel)===1?0:change.values[1]??0],curve:key.curve,...(key.controls?{controls:key.controls}:{})});return;}}
  }
  async function moveAnimationKeys(change:{ids:number[];deltaFrames:number}){if(activeAnimation.value)await o.edit({type:'moveAnimationKeys',animation:activeAnimation.value.id,keys:change.ids,deltaFrames:change.deltaFrames});}
  async function deleteAnimationKeys(ids:number[]){if(activeAnimation.value&&ids.length)await o.edit({type:'deleteAnimationKeys',animation:activeAnimation.value.id,keys:ids});}
  async function setAnimationInterpolation(change:{ids:number[];interpolation:string}){
    const clip=activeAnimation.value;if(!clip||!['linear','stepped','bezier'].includes(change.interpolation))return;
    const keys:AnimationKeyInput[]=clip.tracks.flatMap(track=>track.keys.filter(k=>change.ids.includes(k.id)&&(change.interpolation!=='bezier'||track.keys.some(next=>next.frame>k.frame))).map(key=>{
      const next=track.keys.find(k=>k.frame>key.frame),span=(next?.frame??key.frame+1)-key.frame;
      const controls:BezierControls=[0,1].map(axis=>[key.frame+span/3,key.values[axis]!+((next?.values[axis]??key.values[axis]!)-key.values[axis]!)/3,key.frame+span*2/3,key.values[axis]!+((next?.values[axis]??key.values[axis]!)-key.values[axis]!)*2/3]) as BezierControls;
      if(animationChannelDimensions(track.channel)===1)controls[1]=[0,0,0,0];
      return {keyId:key.id,bone:track.bone,channel:track.channel,frame:key.frame,values:key.values,curve:change.interpolation as AnimationCurve,...(change.interpolation==='bezier'?{controls:key.controls??controls}:{})};
    }));
    const slotKeys=slotAnimation.slotInterpolationKeys(change.ids,change.interpolation as AnimationCurve);
    const deformKeys=geometryAnimation.geometryInterpolationKeys(change.ids,change.interpolation as AnimationCurve);
    const constraintKeys=constraintAnimation.constraintInterpolationKeys(change.ids,change.interpolation as AnimationCurve);
    if(slotKeys.length||deformKeys.length||constraintKeys.length)await o.edit({type:'setAnimationKeyBatch',animation:clip.id,boneKeys:keys,slotKeys,deformKeys,constraintKeys});
    else if(keys.length)await o.edit({type:'setAnimationKeys',animation:clip.id,keys});
  }
  async function updateAnimationBezier(change:{id:number;component:number;control:0|1;frame:number;value:number}){
    const clip=activeAnimation.value;if(!clip)return;
    for(const track of clip.tracks){const index=track.keys.findIndex(key=>key.id===change.id),key=track.keys[index];if(!key?.controls)continue;
      const next=track.keys[index+1];if(!next)return;
      if(!Number.isInteger(change.component)||change.component<0||change.component>=animationChannelDimensions(track.channel)){o.notice('The selected curve component does not belong to this bone channel.',true);return;}
      const controls=structuredClone(key.controls);const axis=change.component===1?1:0,offset=change.control*2;
      controls[axis][offset]=change.control===0?Math.max(key.frame,Math.min(1_000_000,change.frame)):Math.max(0,Math.min(next.frame,change.frame));controls[axis][offset+1]=change.value;
      if(!bezierTimeMonotone(key.frame,next.frame,controls[axis][0],controls[axis][2])){o.notice('The bone Bézier time curve must remain monotone. The stored handles were retained.',true);return;}
      await o.edit({type:'setAnimationKey',keyId:key.id,animation:clip.id,bone:track.bone,channel:track.channel,frame:key.frame,values:key.values,curve:'bezier',controls});return;
    }
    const slotKey=slotAnimation.slotBezierInput(change);
    if(slotKey){await o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[slotKey]});return;}
    const constraintKey=constraintAnimation.constraintBezierKey(change);
    if(constraintKey)await o.edit({type:'setAnimationConstraintKeys',animation:clip.id,keys:[constraintKey]});
  }
  /** Translate/field gestures author keys, never the Setup document. Unkeyed
   * edits with Auto Key off are a transient pose discarded on scrub/clip change. */
  function boneAnimationEdit(edit:RigEdit,bones:BoneView[]):RigEdit|null{
    const clip=activeAnimation.value;if(!clip)throw new Error('Create or select an animation first.');
    pauseAnimation();
    const posed=edit.type==='update'?bones.map(b=>b.id===edit.id?{...b,...edit}:b):previewEdit(bones,edit);
    const setup=new Map(o.project.value!.bones.map(b=>[b.id,b])),before=new Map(bones.map(b=>[b.id,b]));
    const keys:AnimationKeyInput[]=[];
    for(const bone of posed){
      const previous=before.get(bone.id)!,base=setup.get(bone.id)!;
      if(bone.name!==previous.name||bone.length!==previous.length)throw new Error('Switch to Setup to change bone names or lengths.');
      for(const channel of animationBoneChannels(clip,bone.id)){
        const a=boneChannelValues(previous,channel),b=boneChannelValues(bone,channel);
        if(b.every((value,index)=>value===a[index]))continue;
        const values=keyValues(base,bone,channel);
        if(!supportsBoneChannel(channel))throw new Error('This animation channel is not available yet.');
        const current=clip.tracks.find(t=>t.bone===bone.id&&t.channel===channel)?.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,animationFrame.value));
        keys.push({bone:bone.id,channel,frame:animationFrame.value,values,curve:current?.curve??'linear',...(current?.controls?{controls:current.controls}:{})});
      }
    }
    if(!keys.length)return null;
    if(!animationAutoKey.value){animationDraft.value=posed.map(({evaluatedWorld:_,...b})=>b);return null;}
    return {type:'setAnimationKeys',animation:clip.id,keys};
  }
  watch(()=>o.project.value?.animations,()=>{
    if(!animations.value.some(a=>a.id===animationId.value))animationId.value=animations.value[0]?.id??null;
    resetDrafts();
  },{flush:'sync'});
  watch(()=>[o.editorMode.value,animationBones.value,constraintAnimation.animationConstraintPoses.value] as const,()=>{o.localBones.value=animationBones.value;if(o.editorMode.value==='animate')o.changed();},{flush:'sync'});
  watch(o.editorMode,mode=>{pauseAnimation();clearAnimationDraft();if(mode==='animate'&&animationId.value===null)animationId.value=animations.value[0]?.id??null;});
  return {...slotAnimation,...geometryAnimation,...constraintAnimation,...sequenceAnimation,...draftRetention,keyAnimationChanges,animationSpeed,animationId,animationFrame,animationPlaying,animationLoop,animationAutoKey,animationLoopStart,animationLoopEnd,animations,activeAnimation,animationChannels,animationFps,animationDuration,animationStoredDuration,animationAutomaticPreviewEnd,animationPreviewEnd,animationPreviewExceedsBudget,animationBones,animationTracks,animationDraft,animationDraftVersion,animationCanPaste,copyAnimationKeys,pasteAnimationKeys,duplicateAnimation,setAnimationFps,
    pauseAnimation,seekAnimation,selectAnimation,resetAnimationState,playAnimation,advanceAnimation,setAnimationLoopRange,createAnimation,renameAnimation,deleteAnimation,insertAnimationKeys,updateAnimationKey,moveAnimationKeys,deleteAnimationKeys,setAnimationInterpolation,updateAnimationBezier,boneAnimationEdit,clearAnimationDraft};
}
