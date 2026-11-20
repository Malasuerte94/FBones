import {computed,ref,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {keyValues,sampleAnimation,sameAnimationFrame,bezierTimeMonotone,animationChannelDimensions,animationChannelFamily,animationBoneChannels,type AnimationFamily,type AnimationChannel,type AnimationCurve,type AnimationKeyInput,type AnimationView,type BezierControls,type BoneAutoKey} from '../domain/animation.ts';
import {linkedTimelineSourceId,type BoneView,type ProjectSummary,type RigEdit} from '../domain/project.ts';
import {previewEdit} from '../domain/rig.ts';
import {useSlotAnimationWorkspace,shiftSlotAnimationKey} from './useSlotAnimationWorkspace.ts';
import type {SlotAnimationKeyInput,SlotBezierControls} from '../domain/animationSlots.ts';
import {useGeometryAnimationWorkspace,shiftDeformKey} from './useGeometryAnimationWorkspace.ts';
import {deformDimension,type DeformKeyInput,type DrawOrderKeyInput} from '../domain/animationGeometry.ts';
import {planDeformKey} from '../domain/deformKey.ts';
import {useConstraintAnimationWorkspace,shiftConstraintKey} from './useConstraintAnimationWorkspace.ts';
import {constraintPose,isAnimatedConstraint,isPathAnimationTrack,type ConstraintKeyInput,type IkControls,type TransformMixControls} from '../domain/animationConstraints.ts';
import {eventsBetween,type EventKeyInput,type FiredEvent} from '../domain/animationEvents.ts';
import {animationPreviewEnd as previewEnd,MAX_ANIMATION_PREVIEW_FRAME,validAnimationLoopRange} from '../domain/animationPlayback.ts';
import {boneChannelFields,boneChannelValues,useAnimationDraftRetention} from './useAnimationDraftRetention.ts';
import {useSequenceAnimationWorkspace} from './useSequenceAnimationWorkspace.ts';
import {planShownSequenceKey,type SequenceKeyInput} from '../domain/animationSequence.ts';
import {logicalDocumentKey} from '../domain/resourceContinuity.ts';
import {projectTimelineBoneTracks,type GraphBezierGroupChange,type GraphBezierGroupRequest,type KeyShownRequest,type TimelineBezierControls} from '../domain/animationTimeline.ts';
import {planOrdinaryBoneKeySubdivision,planShownBoneKeys} from '../domain/keyShownBone.ts';
import {planShownConstraintKeys,planShownDrawOrder,planShownSlotKeys} from '../domain/keyShownPose.ts';
import {curveSegmentAllowsInterpolation,curveSegmentComponentCount,type CurveSegmentSelection} from '../domain/curveSegment.ts';
import {projectCurvePresetControls} from '../domain/curvePresets.ts';
import {presetBezierAxis,type GraphPreset} from '../domain/graphCurveTools.ts';

function mergeBezierGroup(
  changes: readonly GraphBezierGroupChange[],
  baseline: readonly TimelineBezierControls[],
  first: number,
  next: {id:number;frame:number}|undefined,
  family: 'bone'|'rgba'|'constraint'|'deform',
): TimelineBezierControls[]|null {
  const start=Math.fround(first),end=Math.fround(next?.frame??NaN);
  if(!next||!(end>start))throw new Error('A selected Bézier segment has changed.');
  const axes=baseline.map(axis=>[...axis] as TimelineBezierControls);
  const addressed=new Set<number>(), touched=new Set<number>();
  let changed=false;
  for(const {nextId,component,control,frame,value} of changes){
    const axis=axes[component],offset=control*2;
    const address=component*2+control;
    if(next.id!==nextId||!Number.isInteger(component)||!axis||(control!==0&&control!==1)||addressed.has(address)){
      throw new Error('A selected Bézier handle has changed.');
    }
    addressed.add(address);
    const time=Math.fround(frame),ordinate=Math.fround(value);
    const min=family==='bone'&&control===1?-1_000_000:start;
    const max=family==='bone'&&control===0?1_000_000:end;
    if(!Number.isFinite(time)||Math.abs(time)>1_000_000||time<min||time>max||
      !Number.isFinite(ordinate)||Math.abs(ordinate)>1_000_000){
      throw new Error('The selected Bézier handles exceed the supported curve bounds.');
    }
    // Preserve an equal authored word, including signed zero. New RGBA zeros
    // use positive zero, as for the existing curve preset path.
    if(time!==Math.fround(axis[offset]!)){axis[offset]=family==='rgba'&&time===0?0:time;changed=true;}
    if(ordinate!==Math.fround(axis[offset+1]!)){axis[offset+1]=family==='rgba'&&ordinate===0?0:ordinate;changed=true;}
    touched.add(component);
  }
  if(family==='bone'&&[...touched].some(component=>{
    const axis=axes[component]!;
    return !bezierTimeMonotone(start,end,axis[0],axis[2]);
  }))throw new Error('The bone Bézier time curve must remain monotone. The stored handles were retained.');
  return changed?axes:null;
}

interface AnimationWorkspaceOptions {
  project:ShallowRef<ProjectSummary|null>;busy:Ref<boolean>;selectedIds:Ref<number[]>;
  editorMode:Ref<'setup'|'animate'>;localBones:ShallowRef<BoneView[]>;attachment:Ref<number|null>;
  edit:(edit:RigEdit,expectedRevision?:number,options?:{keepWorkingPose?:boolean})=>Promise<boolean>;notice:(message:string,error?:boolean)=>void;
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
  const animationTracks=computed(()=>projectTimelineBoneTracks(activeAnimation.value));
  const slotAnimation=useSlotAnimationWorkspace({project:o.project,active:activeAnimation,frame:animationFrame,mode:o.editorMode,autoKey:animationAutoKey,edit:o.edit,pause:pauseAnimation,notice:o.notice});
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
    resetAnimationOffset();
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
  function ordinaryBoneKeyInputs(model:ProjectSummary,clip:AnimationView,bone:BoneView,
    channel:AnimationChannel,frame:number):AnimationKeyInput[]{
    const setup=model.bones.find(item=>item.id===bone.id);
    if(!setup)throw new Error('The selected bone no longer exists.');
    const track=clip.tracks.find(item=>item.bone===bone.id&&item.channel===channel);
    if(track){
      const draft=animationDraft.value?.find(item=>item.id===bone.id);
      const subdivision=planOrdinaryBoneKeySubdivision(track,frame,setup,draft);
      if(subdivision)return subdivision;
    }
    const current=track?.keys.slice().reverse().find(key=>sameAnimationFrame(key.frame,frame));
    return [{bone:bone.id,channel,frame,values:keyValues(setup,bone,channel),curve:current?.curve??'linear',...(current?.controls?{controls:current.controls}:{})}];
  }
  function supportsBoneChannel(channel:AnimationChannel):boolean{return animationChannels.value.includes(channel)||animationChannels.value.includes(animationChannelFamily(channel));}
  async function keyShownAnimationTracks(request: KeyShownRequest): Promise<boolean> {
    const model = o.project.value, clip = activeAnimation.value;
    if (!model || !clip || o.busy.value || o.editorMode.value !== 'animate' || !request.targets.length
      || request.documentKey !== logicalDocumentKey(model) || request.revision !== model.revision
      || request.animation !== clip.id || !sameAnimationFrame(request.frame, animationFrame.value)) return false;
    pauseAnimation();
    const rawFrame = animationFrame.value, frame = Math.fround(rawFrame);
    const boneKeys: AnimationKeyInput[] = [], slotKeys: SlotAnimationKeyInput[] = [];
    const drawOrderKeys: DrawOrderKeyInput[] = [], constraintKeys: ConstraintKeyInput[] = [];
    const deformKeys: DeformKeyInput[] = [], sequenceKeys: SequenceKeyInput[] = [];
    try {
      const workingBones = new Map(animationDraft.value?.map(bone => [bone.id, bone]));
      const bones = new Map(model.bones.map(bone => [bone.id, bone]));
      const slots = new Map(model.slots?.map(slot => [slot.id, slot]));
      const attachments = new Map((model.slots ?? []).flatMap(slot => (slot.attachments ?? [])
        .map(attachment => [attachment.id, {attachment, slot: slot.id}] as const)));
      const slotPoses = new Map(slotAnimation.slotAnimationPose.value.map(pose => [pose.slot, pose]));
      const constraints = new Map(model.constraints?.map(constraint => [constraint.id, constraint]));
      const constraintPoses = new Map(constraintAnimation.animationConstraintPoses.value.map(pose => [pose.constraint, pose]));
      for (const target of request.targets) {
        switch (target.kind) {
          case 'bone': {
            const track = clip.tracks.find(item => item.bone === target.bone && item.channel === target.channel);
            const bone = bones.get(target.bone);
            if (!track?.keys.length || !bone || !supportsBoneChannel(target.channel)) throw new Error('A shown bone track is no longer available.');
            boneKeys.push(...planShownBoneKeys(track, frame, bone, workingBones.get(target.bone)));
            break;
          }
          case 'slot': {
            const track = clip.slotTracks?.find(item => item.slot === target.slot && item.channel === target.channel);
            const pose = slotPoses.get(target.slot), slot = slots.get(target.slot);
            if (!track?.keys.length || (track.channel!=='attachment'&&track.channel!=='rgba') || !pose || !slot) throw new Error('A shown slot track is no longer available.');
            slotKeys.push(...planShownSlotKeys(track, frame, pose, !!slot.tintBlack));
            break;
          }
          case 'drawOrder': {
            if (!clip.drawOrder?.length) throw new Error('The shown draw order track is no longer available.');
            drawOrderKeys.push(...planShownDrawOrder(clip.drawOrder, frame, geometryAnimation.localDrawOrderKey().order));
            break;
          }
          case 'deform': {
            const track = clip.deformTracks?.find(item => item.attachment === target.attachment);
            const attachment = attachments.get(target.attachment)?.attachment;
            if (!track?.keys.length || !attachment || (!attachment.mesh && !attachment.clipping)) {
              throw new Error('A shown deform track is no longer available.');
            }
            const draft = geometryAnimation.deformDraft.value.get(target.attachment);
            deformKeys.push(...planDeformKey(track, rawFrame, deformDimension(attachment), draft));
            break;
          }
          case 'sequence': {
            const track = clip.sequenceTracks?.find(item => item.attachment === target.attachment);
            const owner = attachments.get(target.attachment);
            const attachment = owner?.attachment;
            const label = attachment ? `“${attachment.name}”` : `attachment ${target.attachment}`;
            const context = `Sequence for ${label} at frame ${frame}`;
            if (!track?.keys.length || track.slot !== owner?.slot || !attachment?.region
              || !attachment.sequence || attachment.type === 'clipping') {
              throw new Error(`The shown ${context} is no longer available.`);
            }
            if (linkedTimelineSourceId(attachment)!==undefined) break;
            const draft = sequenceAnimation.sequenceDraft.value.get(target.attachment);
            const receivers = [...attachments.values()].flatMap(({attachment: child})=>
              child.sequence&&linkedTimelineSourceId(child)===target.attachment?[child.sequence]:[]);
            try {
              sequenceKeys.push(...planShownSequenceKey(attachment.sequence, track, frame, Math.fround(animationFps.value), draft, receivers));
            } catch (error) {
              throw new Error(`Could not key the ${context}. ${error instanceof Error ? error.message : String(error)}`);
            }
            break;
          }
          case 'constraint': {
            const track = clip.constraintTracks?.find(item => item.constraint === target.constraint && item.channel === target.channel
              && (item.channel !== 'physics' || (target.channel === 'physics' && item.property === target.property)));
            const setup = constraints.get(target.constraint);
            if (track && isPathAnimationTrack(track)) throw new Error('Imported Path constraint keys are read-only.');
            if (!track?.keys.length || !setup || !isAnimatedConstraint(setup)) throw new Error('A shown constraint track is no longer available.');
            constraintKeys.push(...planShownConstraintKeys(track, frame, constraintPoses.get(target.constraint) ?? constraintPose(setup)));
            break;
          }
        }
      }
    } catch (error) {
      o.notice(error instanceof Error ? error.message : String(error), true);
      return false;
    }
    if (!boneKeys.length && !slotKeys.length && !drawOrderKeys.length && !constraintKeys.length
      && !deformKeys.length && !sequenceKeys.length) return true;
    return o.edit({type: 'setAnimationKeyBatch', animation: clip.id, boneKeys, slotKeys, drawOrderKeys, constraintKeys,
      ...(deformKeys.length ? {deformKeys} : {}), ...(sequenceKeys.length ? {sequenceKeys} : {})}, model.revision);
  }
  async function insertAnimationKeys(channel:AnimationChannel='translate'){
    pauseAnimation();
    const model=o.project.value,clip=activeAnimation.value,frame=animationFrame.value;
    if(!model||!clip||!supportsBoneChannel(channel))return;
    const keys:AnimationKeyInput[]=[];
    try{
      for(const bone of animationBones.value.filter(b=>o.selectedIds.value.includes(b.id))){
        const stored=animationBoneChannels(clip,bone.id),family=animationChannelFamily(channel);
        const channels=channel===family?stored.filter(item=>animationChannelFamily(item)===family):stored.filter(item=>item===channel);
        if(!channels.length)throw new Error('This axis requires an existing separated channel. The animation was retained.');
        for(const actual of channels){
          if(!supportsBoneChannel(actual))throw new Error('This animation channel is not available yet.');
          keys.push(...ordinaryBoneKeyInputs(model,clip,bone,actual,frame));
        }
      }
    }catch(error){o.notice(error instanceof Error?error.message:String(error),true);return;}
    if(!keys.length){o.notice('Select a bone to key.',true);return;}
    await o.edit({type:'setAnimationKeys',animation:clip.id,keys},model.revision);
  }
  async function keyAnimationChanges(fallback:AnimationFamily='translate'){
    pauseAnimation();
    const model=o.project.value,clip=activeAnimation.value,frame=animationFrame.value;
    if(!model||!clip)return;
    const saved=new Map(sampleAnimation(model.bones,clip,frame).map(bone=>[bone.id,bone]));
    const keys:AnimationKeyInput[]=[];
    try{
      for(const bone of animationBones.value.filter(b=>o.selectedIds.value.includes(b.id))){
        const before=saved.get(bone.id);if(!before)continue;
        for(const channel of animationBoneChannels(clip,bone.id)){
          if(!supportsBoneChannel(channel))continue;
          const a=boneChannelValues(before,channel),b=boneChannelValues(bone,channel);
          if(b.some((value,index)=>value!==a[index]))keys.push(...ordinaryBoneKeyInputs(model,clip,bone,channel,frame));
        }
      }
    }catch(error){o.notice(error instanceof Error?error.message:String(error),true);return;}
    if(keys.length)await o.edit({type:'setAnimationKeys',animation:clip.id,keys},model.revision);
    else await insertAnimationKeys(fallback);
  }
  async function updateAnimationKey(change:{id:number;values:number[]}){
    const clip=activeAnimation.value;if(!clip)return;
    for(const track of clip.tracks){const key=track.keys.find(k=>k.id===change.id);if(key){await o.edit({type:'setAnimationKey',keyId:key.id,animation:clip.id,bone:track.bone,channel:track.channel,frame:key.frame,values:[change.values[0]??0,animationChannelDimensions(track.channel)===1?0:change.values[1]??0],curve:key.curve,...(key.controls?{controls:key.controls}:{})});return;}}
  }
  async function moveAnimationKeys(change:{ids:number[];deltaFrames:number;shift?:boolean},expectedRevision?:number){
    if(activeAnimation.value)await o.edit({
      type:'moveAnimationKeys',animation:activeAnimation.value.id,keys:change.ids,deltaFrames:change.deltaFrames,
      ...(change.shift?{shift:true}:{}),
    },expectedRevision);
  }
  async function scaleAnimationKeys(change:Omit<Extract<RigEdit,{type:'scaleAnimationKeys'}>,'type'>,expectedRevision?:number){
    if(activeAnimation.value?.id===change.animation)await o.edit({type:'scaleAnimationKeys',...change},expectedRevision);
  }
  let offsetSelectionEpoch=0;
  let offsetContinuation:{document:number;revision:number;animation:number;key:number}|null=null;
  function resetAnimationOffset(){
    offsetSelectionEpoch++;
    offsetContinuation=null;
  }
  function retainAnimationOffsetAfterSave(before:ProjectSummary|null,after:ProjectSummary){
    const continuation=offsetContinuation;
    if(before&&continuation&&continuation.document===before.documentId&&continuation.revision===before.revision
      &&logicalDocumentKey(before)===logicalDocumentKey(after)&&activeAnimation.value?.id===continuation.animation){
      offsetContinuation={...continuation,document:after.documentId,revision:after.revision};
    }
  }
  async function offsetAnimationKeys(change:Omit<Extract<RigEdit,{type:'offsetAnimationKeys'}>,'type'|'continueOffset'>,expectedRevision?:number){
    const before=o.project.value,clip=activeAnimation.value;
    if(!before||!clip||clip.id!==change.animation)return;
    const start=animationLoopStart.value,end=animationLoopEnd.value;
    if(change.loopRange){
      if(start===null||end===null||change.loopRange.start!==Math.fround(start)||change.loopRange.end!==Math.fround(end))return;
    }else if(start!==null||end!==null)return;
    if(expectedRevision!==undefined&&expectedRevision!==before.revision)return;
    const epoch=offsetSelectionEpoch,continuation=offsetContinuation;
    const continueOffset=continuation?.document===before.documentId&&continuation.revision===before.revision
      &&continuation.animation===clip.id&&continuation.key===change.key;
    const succeeded=await o.edit({
      type:'offsetAnimationKeys',...change,...(continueOffset?{continueOffset:true}:{}),
    },before.revision);
    const after=o.project.value;
    if(succeeded&&after?.documentId===before.documentId&&after.revision!==before.revision
      &&activeAnimation.value?.id===clip.id&&epoch===offsetSelectionEpoch){
      offsetContinuation={document:after.documentId,revision:after.revision,animation:clip.id,key:change.key};
    }
  }
  async function deleteAnimationKeys(ids:number[]){if(activeAnimation.value&&ids.length)await o.edit({type:'deleteAnimationKeys',animation:activeAnimation.value.id,keys:ids});}
  async function setAnimationInterpolation(change:{ids:number[];interpolation:string},expectedRevision?:number){
    const clip=activeAnimation.value;
    if(!clip||!['linear','stepped','bezier'].includes(change.interpolation)||
      expectedRevision!==undefined&&o.project.value?.revision!==expectedRevision)return;
    const selected=new Set(change.ids);
    const keys:AnimationKeyInput[]=clip.tracks.flatMap(track=>track.keys.filter(k=>selected.has(k.id)&&(change.interpolation!=='bezier'||track.keys.some(next=>next.frame>k.frame))).map(key=>{
      const next=track.keys.find(k=>k.frame>key.frame),span=(next?.frame??key.frame+1)-key.frame;
      const controls:BezierControls=[0,1].map(axis=>[key.frame+span/3,key.values[axis]!+((next?.values[axis]??key.values[axis]!)-key.values[axis]!)/3,key.frame+span*2/3,key.values[axis]!+((next?.values[axis]??key.values[axis]!)-key.values[axis]!)*2/3]) as BezierControls;
      if(animationChannelDimensions(track.channel)===1)controls[1]=[0,0,0,0];
      return {keyId:key.id,bone:track.bone,channel:track.channel,frame:key.frame,values:key.values,curve:change.interpolation as AnimationCurve,...(change.interpolation==='bezier'?{controls:key.controls??controls}:{})};
    }));
    const slotKeys=slotAnimation.slotInterpolationKeys(change.ids,change.interpolation as AnimationCurve);
    const deformKeys=geometryAnimation.geometryInterpolationKeys(change.ids,change.interpolation as AnimationCurve);
    const constraintKeys=constraintAnimation.constraintInterpolationKeys(change.ids,change.interpolation as AnimationCurve);
    if(slotKeys.length||deformKeys.length||constraintKeys.length)await o.edit({type:'setAnimationKeyBatch',animation:clip.id,boneKeys:keys,slotKeys,deformKeys,constraintKeys},
      expectedRevision,deformKeys.length?{keepWorkingPose:true}:undefined);
    else if(keys.length)await o.edit({type:'setAnimationKeys',animation:clip.id,keys},expectedRevision);
  }
  async function updateAnimationBezier(change:{id:number;component:number;control:0|1;frame:number;value:number},expectedRevision?:number){
    const clip=activeAnimation.value;if(!clip||expectedRevision!==undefined&&o.project.value?.revision!==expectedRevision)return;
    for(const track of clip.tracks){const index=track.keys.findIndex(key=>key.id===change.id),key=track.keys[index];if(!key?.controls)continue;
      const next=track.keys[index+1];if(!next)return;
      if(!Number.isInteger(change.component)||change.component<0||change.component>=animationChannelDimensions(track.channel)){o.notice('The selected curve component does not belong to this bone channel.',true);return;}
      const controls=structuredClone(key.controls);const axis=change.component===1?1:0,offset=change.control*2;
      controls[axis][offset]=change.control===0?Math.max(key.frame,Math.min(1_000_000,change.frame)):Math.max(0,Math.min(next.frame,change.frame));controls[axis][offset+1]=change.value;
      if(!bezierTimeMonotone(key.frame,next.frame,controls[axis][0],controls[axis][2])){o.notice('The bone Bézier time curve must remain monotone. The stored handles were retained.',true);return;}
      await o.edit({type:'setAnimationKey',keyId:key.id,animation:clip.id,bone:track.bone,channel:track.channel,frame:key.frame,values:key.values,curve:'bezier',controls},expectedRevision,{keepWorkingPose:true});return;
    }
    const slotKey=slotAnimation.slotBezierInput(change);
    if(slotKey){await o.edit({type:'setAnimationSlotKeys',animation:clip.id,keys:[slotKey]},expectedRevision,{keepWorkingPose:true});return;}
    const constraintKey=constraintAnimation.constraintBezierKey(change);
    if(constraintKey){await o.edit({type:'setAnimationConstraintKeys',animation:clip.id,keys:[constraintKey]},expectedRevision,{keepWorkingPose:true});return;}
    if(expectedRevision===undefined||o.editorMode.value!=='animate'||change.component!==0||(change.control!==0&&change.control!==1))return;
    const deformKey=geometryAnimation.geometryKeysForIds([change.id]).deformKeys[0];
    if(deformKey?.curve!=='bezier'||!deformKey.controls)return;
    const controls:TimelineBezierControls=[...deformKey.controls];
    const offset=change.control*2;
    const frame=Math.fround(change.frame),value=Math.fround(change.value);
    if(Object.is(controls[offset],frame)&&Object.is(controls[offset+1],value))return;
    controls[offset]=frame;
    controls[offset+1]=value;
    await o.edit({type:'setAnimationDeformKeys',animation:clip.id,keys:[{...deformKey,controls}]},
      expectedRevision,{keepWorkingPose:true});
  }
  async function updateAnimationBezierGroup(request:GraphBezierGroupRequest):Promise<boolean>{
    const model=o.project.value,clip=activeAnimation.value;
    const {documentKey,revision,animation,changes}=request;
    if(!model||!clip||clip.id!==animation||model.revision!==revision||
      logicalDocumentKey(model)!==documentKey||o.editorMode.value!=='animate'||o.busy.value||!changes.length)return false;

    const pending=new Map<number,GraphBezierGroupChange[]>();
    for(const change of changes){
      const members=pending.get(change.id);
      if(members)members.push(change);
      else pending.set(change.id,[change]);
    }
    const successors=new Map<number,{id:number;frame:number}>();
    for(const track of [...(clip.slotTracks??[]),...(clip.constraintTracks??[]),...(clip.deformTracks??[])]){
      for(const [index,key] of track.keys.entries()){
        const next=track.keys[index+1];
        if(pending.has(key.id)&&next)successors.set(key.id,next);
      }
    }
    const boneKeys:AnimationKeyInput[]=[];
    const slotKeys:SlotAnimationKeyInput[]=[];
    const constraintKeys:ConstraintKeyInput[]=[];
    const deformKeys:DeformKeyInput[]=[];
    try{
      for(const track of clip.tracks){
        for(const [index,key] of track.keys.entries()){
          const members=pending.get(key.id);
          if(!members)continue;
          if(key.curve!=='bezier'||!key.controls)throw new Error('A selected Bézier segment has changed.');
          const baseline=key.controls.slice(0,animationChannelDimensions(track.channel));
          const controls=mergeBezierGroup(members,baseline,key.frame,track.keys[index+1],'bone');
          if(controls)boneKeys.push({keyId:key.id,bone:track.bone,channel:track.channel,
            frame:key.frame,values:key.values,curve:'bezier',controls:[controls[0]!,controls[1]??key.controls[1]]});
          pending.delete(key.id);
        }
      }

      for(const key of slotAnimation.slotKeysForIds([...pending.keys()])){
        const id=key.keyId;
        const members=id===undefined?undefined:pending.get(id);
        if(id===undefined||!members)continue;
        if(key.channel!=='rgba'||key.curve!=='bezier'||!key.controls||key.darkControls||
          model.slots?.some(slot=>slot.id===key.slot&&slot.tintBlack)){
          throw new Error('Choose handles on a supported light RGBA curve.');
        }
        const controls=mergeBezierGroup(members,key.controls,key.frame,successors.get(id),'rgba');
        if(controls)slotKeys.push({...key,controls:controls as SlotBezierControls});
        pending.delete(id);
      }

      for(const key of constraintAnimation.constraintKeysForIds([...pending.keys()])){
        const id=key.keyId;
        const members=id===undefined?undefined:pending.get(id);
        if(id===undefined||!members)continue;
        if(key.channel==='physicsReset'||key.curve!=='bezier'||!key.controls){
          throw new Error('A selected Bézier segment has changed.');
        }
        const baseline=key.channel==='physics'?[key.controls]:key.controls;
        const controls=mergeBezierGroup(members,baseline,key.frame,successors.get(id),'constraint');
        if(controls){
          if(key.channel==='physics')constraintKeys.push({...key,controls:controls[0]!});
          else if(key.channel==='ik')constraintKeys.push({...key,controls:controls as IkControls});
          else constraintKeys.push({...key,controls:controls as TransformMixControls});
        }
        pending.delete(id);
      }
      if(pending.size){
        const stored=geometryAnimation.geometryKeysForIds([...pending.keys()]).deformKeys;
        for(const key of stored){
          const id=key.keyId;
          const members=id===undefined?undefined:pending.get(id);
          if(id===undefined||!members)continue;
          if(key.curve!=='bezier'||!key.controls)throw new Error('A selected Bézier segment has changed.');
          const controls=mergeBezierGroup(members,[key.controls],key.frame,successors.get(id),'deform');
          if(controls)deformKeys.push({...key,controls:controls[0]!});
          pending.delete(id);
        }
      }
      if(pending.size)throw new Error('A selected Bézier segment has changed.');
      if([boneKeys,slotKeys,constraintKeys,deformKeys].some(keys=>keys.length>4096)){
        throw new Error('Choose fewer Bézier handles for one edit.');
      }
    }catch(error){
      o.notice(error instanceof Error?error.message:String(error),true);
      return false;
    }
    if(!boneKeys.length&&!slotKeys.length&&!constraintKeys.length&&!deformKeys.length)return false;
    pauseAnimation();
    return o.edit({type:'setAnimationKeyBatch',animation,boneKeys,slotKeys,constraintKeys,...(deformKeys.length?{deformKeys}:{})},
      revision,{keepWorkingPose:true});
  }
  async function applyAnimationCurvePreset(selections:readonly CurveSegmentSelection[],preset:GraphPreset|Readonly<TimelineBezierControls>){
    const first=selections[0],clip=activeAnimation.value;
    if(!first)return;
    const {documentKey,revision,animation}=first;
    if(!clip||clip.id!==animation||o.project.value?.revision!==revision||logicalDocumentKey(o.project.value)!==documentKey||
      o.editorMode.value!=='animate'||selections.some(item=>item.documentKey!==documentKey||
        item.revision!==revision||item.animation!==animation))return;

    const segments=selections.map(item=>item.segment);
    const boneIds=new Set(segments.filter(segment=>segment.kind==='bone').map(segment=>segment.key.id));
    const slotIds=segments.filter(segment=>segment.kind==='rgba').map(segment=>segment.key.id);
    const deformIds=segments.filter(segment=>segment.kind==='deform').map(segment=>segment.key.id);
    const constraintIds=segments.filter(segment=>segment.kind==='ik'||segment.kind==='transformMix'||segment.kind==='physics')
      .map(segment=>segment.key.id);
    const storedBoneKeys=new Map(clip.tracks.flatMap(track=>track.keys.flatMap(key=>
      boneIds.has(key.id)?[[key.id,{track,key}] as const]:[])));
    const storedSlotKeys=new Map(slotIds.length?slotAnimation.slotKeysForIds(slotIds).map(key=>[key.keyId,key] as const):[]);
    const storedDeformKeys=new Map(deformIds.length?geometryAnimation.geometryKeysForIds(deformIds).deformKeys
      .map(key=>[key.keyId,key] as const):[]);
    const storedConstraintKeys=new Map(constraintIds.length?constraintAnimation.constraintKeysForIds(constraintIds)
      .map(key=>[key.keyId,key] as const):[]);
    const boneKeys:AnimationKeyInput[]=[],slotKeys:SlotAnimationKeyInput[]=[],deformKeys:DeformKeyInput[]=[],constraintKeys:ConstraintKeyInput[]=[];
    for(const segment of segments){
      if(!curveSegmentAllowsInterpolation(segment,'bezier'))continue;
      const {key,next,leftSelected,rightSelected}=segment,count=curveSegmentComponentCount(segment);
      const start=key.values.slice(0,count).map(Math.fround),end=next.values.slice(0,count).map(Math.fround);
      if(!start.some((value,axis)=>value!==end[axis]))continue;
      const controls:TimelineBezierControls[]=[];
      for(const [axis,value] of start.entries()){
        const last=end[axis]!,prior=key.interpolation==='bezier'?key.controls?.[axis]:undefined;
        if(value===last&&prior){
          controls.push([...prior]);
          continue;
        }
        let candidate:TimelineBezierControls;
        if(typeof preset!=='string'&&value!==last){
          const projected=projectCurvePresetControls(segment,axis,preset);
          if(!projected)return 'incompatible' as const;
          candidate=[...projected];
        }else{
          candidate=presetBezierAxis(Math.fround(key.frame),Math.fround(next.frame),value,last,
            typeof preset==='string'?preset:'flat',leftSelected,rightSelected,prior);
        }
        if(segment.kind==='rgba'||segment.kind==='deform'){
          // Keep an authored zero sign when a preset lands on the same coordinate.
          for(const field of [0,1,2,3] as const){
            if(candidate[field]===0)candidate[field]=prior?.[field]===0?prior[field]:0;
          }
        }
        controls.push(candidate);
      }
      if(key.interpolation==='bezier'&&controls.every((axis,index)=>axis.every((value,field)=>{
        const stored=key.controls?.[index]?.[field];
        return stored!==undefined&&Object.is(Math.fround(value),Math.fround(stored));
      })))continue;
      if(segment.kind==='bone'){
        const stored=storedBoneKeys.get(key.id);
        if(!stored||stored.track.bone!==segment.bone||stored.track.channel!==segment.channel)return;
        const axes:BezierControls=[[...controls[0]!],controls[1]?[...controls[1]]:[0,0,0,0]];
        boneKeys.push({bone:segment.bone,channel:segment.channel,
          keyId:key.id,frame:stored.key.frame,values:stored.key.values,curve:'bezier',controls:axes});
      }else if(segment.kind==='rgba'){
        const stored=storedSlotKeys.get(key.id);
        if(stored?.channel!=='rgba'||stored.slot!==segment.slot)return;
        slotKeys.push({...stored,curve:'bezier',controls:controls.map(axis=>[...axis]) as SlotBezierControls});
      }else if(segment.kind==='deform'){
        const stored=storedDeformKeys.get(key.id);
        if(!stored||stored.attachment!==segment.attachment||stored.frame!==key.frame)return;
        deformKeys.push({...stored,curve:'bezier',controls:[...controls[0]!]});
      }else{
        const stored=storedConstraintKeys.get(key.id);
        if(!stored||stored.constraint!==segment.constraint||stored.channel!==segment.kind)return;
        if(stored.channel==='ik'){
          constraintKeys.push({...stored,curve:'bezier',controls:controls.map(axis=>[...axis]) as IkControls});
        }else if(stored.channel==='transformMix'){
          constraintKeys.push({...stored,curve:'bezier',controls:controls.map(axis=>[...axis]) as TransformMixControls});
        }else if(stored.channel==='physics'&&segment.kind==='physics'&&stored.property===segment.property){
          constraintKeys.push({...stored,curve:'bezier',controls:[...controls[0]!]});
        }else return;
      }
    }
    const families=[boneKeys,slotKeys,deformKeys,constraintKeys].filter(keys=>keys.length).length;
    if(!families)return;
    let edit:RigEdit;
    if(families>1)edit={type:'setAnimationKeyBatch',animation,boneKeys,slotKeys,constraintKeys,...(deformKeys.length?{deformKeys}:{})};
    else if(boneKeys.length)edit={type:'setAnimationKeys',animation,keys:boneKeys};
    else if(slotKeys.length)edit={type:'setAnimationSlotKeys',animation,keys:slotKeys};
    else if(deformKeys.length)edit={type:'setAnimationDeformKeys',animation,keys:deformKeys};
    else edit={type:'setAnimationConstraintKeys',animation,keys:constraintKeys};
    pauseAnimation();
    await o.edit(edit,revision,{keepWorkingPose:true});
  }
  function boneAnimationEditPlan(edit:RigEdit,bones:BoneView[],intent?:{source:BoneAutoKey['source'];frame:number}):
    {edit:Extract<RigEdit,{type:'setAnimationKeys'}>;boneAutoKey?:BoneAutoKey}|null{
    const clip=activeAnimation.value;if(!clip)throw new Error('Create or select an animation first.');
    pauseAnimation();
    const posed=edit.type==='update'?bones.map(b=>b.id===edit.id?{...b,...edit}:b):previewEdit(bones,edit);
    const model=o.project.value!,setup=new Map(model.bones.map(b=>[b.id,b])),before=new Map(bones.map(b=>[b.id,b]));
    const autoKey=animationAutoKey.value;
    const nativeIntent=autoKey?intent:undefined;
    const viewportDraft=!autoKey&&intent?.source==='viewportPose'?new Map<number,Partial<BoneView>>():null;
    const working=nativeIntent&&animationDraft.value?new Map(animationDraft.value.map(bone=>[bone.id,bone])):null;
    const authored=working?new Map(sampleAnimation(model.bones,clip,animationFrame.value).map(bone=>[bone.id,bone])):null;
    const keys:AnimationKeyInput[]=[];
    const lanes:BoneAutoKey['lanes']=[];
    let changed=false;
    for(const bone of posed){
      const previous=before.get(bone.id)!,base=setup.get(bone.id)!;
      if(bone.name!==previous.name||bone.length!==previous.length)throw new Error('Switch to Setup to change bone names or lengths.');
      for(const channel of animationBoneChannels(clip,bone.id)){
        const a=boneChannelValues(previous,channel),b=boneChannelValues(bone,channel);
        const touched=b.map((value,index)=>intent?.source==='viewportPose'
          ? Math.fround(value)!==Math.fround(a[index]!)
          : nativeIntent?!Object.is(value,a[index]):value!==a[index]);
        if(!touched.some(Boolean))continue;
        if(!supportsBoneChannel(channel))throw new Error('This animation channel is not available yet.');
        changed=true;
        if(!autoKey){
          if(viewportDraft){
            const patch:Partial<BoneView>=viewportDraft.get(bone.id)??{};
            for(const [axis,field] of boneChannelFields[channel].entries())if(touched[axis])patch[field]=b[axis]!;
            viewportDraft.set(bone.id,patch);
          }
          continue;
        }
        if(!nativeIntent){
          const current=clip.tracks.find(t=>t.bone===bone.id&&t.channel===channel)?.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,animationFrame.value));
          keys.push({bone:bone.id,channel,frame:animationFrame.value,values:keyValues(base,bone,channel),curve:current?.curve??'linear',...(current?.controls?{controls:current.controls}:{})});
          continue;
        }
        const draft=working?.get(bone.id),sample=authored?.get(bone.id);
        const draftValues=draft&&boneChannelValues(draft,channel),sampleValues=sample&&boneChannelValues(sample,channel);
        const setupValues=boneChannelValues(base,channel),scale=animationChannelFamily(channel)==='scale';
        const mask:[boolean,boolean]=[false,false],values:[number,number]=[0,0];
        for(const axis of [0,1] as const){
          if(axis>=b.length)continue;
          const draftValue=draftValues?.[axis];
          const local=touched[axis]?b[axis]:draftValue!==undefined&&sampleValues&&!Object.is(draftValue,sampleValues[axis])?draftValue:undefined;
          if(local===undefined)continue;
          const setupValue=setupValues[axis]!;
          if(scale&&setupValue===0)throw new Error('Keying a changed axis requires nonzero Setup scale.');
          const value=Math.fround(scale?local/setupValue:local-setupValue);
          if(!Number.isFinite(value))throw new Error('Use finite key values within the supported range.');
          mask[axis]=true;
          values[axis]=value;
        }
        lanes.push(mask);
        keys.push({bone:bone.id,channel,frame:nativeIntent.frame,values,curve:'linear'});
      }
    }
    if(!changed)return null;
    if(!autoKey){
      // A native viewport sample rounds every local field. Retain the working
      // values on untouched lanes so they do not become dirty siblings later.
      const draft=viewportDraft?animationBones.value.map(bone=>({...bone,...viewportDraft.get(bone.id)})):posed;
      animationDraft.value=draft.map(({evaluatedWorld:_,...bone})=>bone);
      return null;
    }
    return {edit:{type:'setAnimationKeys',animation:clip.id,keys},...(nativeIntent?{boneAutoKey:{source:nativeIntent.source,lanes}}:{})};
  }
  /** Keep the ordinary raw-key contract available to callers without a native authoring intent. */
  function boneAnimationEdit(edit:RigEdit,bones:BoneView[]):RigEdit|null{
    return boneAnimationEditPlan(edit,bones)?.edit??null;
  }
  watch(()=>o.project.value?.animations,()=>{
    if(!animations.value.some(a=>a.id===animationId.value))animationId.value=animations.value[0]?.id??null;
    resetDrafts();
  },{flush:'sync'});
  watch(()=>[o.editorMode.value,animationBones.value,constraintAnimation.animationConstraintPoses.value] as const,()=>{o.localBones.value=animationBones.value;if(o.editorMode.value==='animate')o.changed();},{flush:'sync'});
  watch(o.editorMode,mode=>{pauseAnimation();clearAnimationDraft();if(mode==='animate'&&animationId.value===null)animationId.value=animations.value[0]?.id??null;});
  return {...slotAnimation,...geometryAnimation,...constraintAnimation,...sequenceAnimation,...draftRetention,keyAnimationChanges,animationSpeed,animationId,animationFrame,animationPlaying,animationLoop,animationAutoKey,animationLoopStart,animationLoopEnd,animations,activeAnimation,animationChannels,animationFps,animationDuration,animationStoredDuration,animationAutomaticPreviewEnd,animationPreviewEnd,animationPreviewExceedsBudget,animationBones,animationTracks,animationDraft,animationDraftVersion,animationDraftEpoch,animationCanPaste,copyAnimationKeys,pasteAnimationKeys,duplicateAnimation,setAnimationFps,
    pauseAnimation,seekAnimation,selectAnimation,resetAnimationState,playAnimation,advanceAnimation,setAnimationLoopRange,createAnimation,renameAnimation,deleteAnimation,insertAnimationKeys,keyShownAnimationTracks,updateAnimationKey,moveAnimationKeys,scaleAnimationKeys,offsetAnimationKeys,resetAnimationOffset,retainAnimationOffsetAfterSave,deleteAnimationKeys,setAnimationInterpolation,updateAnimationBezier,updateAnimationBezierGroup,applyAnimationCurvePreset,boneAnimationEdit,boneAnimationEditPlan,clearAnimationDraft};
}
