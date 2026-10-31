import {computed,ref,shallowRef,watch,type Ref,type ShallowRef} from 'vue';
import {keyValues,sampleAnimation,sameAnimationFrame,type AnimationChannel,type AnimationCurve,type AnimationKeyInput,type BezierControls} from '../domain/animation.ts';
import type {BoneView,ProjectSummary,RigEdit} from '../domain/project.ts';
import {previewEdit} from '../domain/rig.ts';
import {useSlotAnimationWorkspace,shiftSlotAnimationKey} from './useSlotAnimationWorkspace.ts';
import type {SlotAnimationKeyInput} from '../domain/animationSlots.ts';
import {useGeometryAnimationWorkspace,shiftDeformKey} from './useGeometryAnimationWorkspace.ts';
import type {DeformKeyInput,DrawOrderKeyInput} from '../domain/animationGeometry.ts';
import {useConstraintAnimationWorkspace,shiftConstraintKey} from './useConstraintAnimationWorkspace.ts';
import type {ConstraintKeyInput} from '../domain/animationConstraints.ts';
import {eventsBetween,type EventKeyInput,type FiredEvent} from '../domain/animationEvents.ts';

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
  watch(animationDraft,()=>{animationDraftVersion.value++;},{flush:'sync'});
  const animationClipboard=shallowRef<{documentId:number;keys:AnimationKeyInput[];slotKeys:SlotAnimationKeyInput[];drawOrderKeys:DrawOrderKeyInput[];deformKeys:DeformKeyInput[];constraintKeys:ConstraintKeyInput[];eventKeys:EventKeyInput[]}|null>(null);
  const animationCanPaste=computed(()=>{const clipboard=animationClipboard.value;return !!clipboard&&clipboard.documentId===o.project.value?.documentId&&!!(clipboard.keys.length||clipboard.slotKeys.length||clipboard.drawOrderKeys.length||clipboard.deformKeys.length||clipboard.constraintKeys.length||clipboard.eventKeys.length);});
  const animations=computed(()=>o.project.value?.animations??[]);
  const activeAnimation=computed(()=>animations.value.find(a=>a.id===animationId.value)??null);
  const animationChannels=computed(()=>o.project.value?.animationChannels??[]);
  const animationFps=computed(()=>o.project.value?.animationFps??30);
  const animationDuration=computed(()=>activeAnimation.value?.duration??0);
  const animationBones=computed(()=>animationDraft.value??sampleAnimation(o.project.value?.bones??[],activeAnimation.value,animationFrame.value));
  const animationTracks=computed(()=>activeAnimation.value?.tracks.map(track=>({id:`${track.bone}:${track.channel}`,boneId:track.bone,channel:track.channel,keys:track.keys.map(key=>({...key,values:track.channel==='rotate'?[key.values[0]]:key.values,interpolation:key.curve}))}))??[]);
  const slotAnimation=useSlotAnimationWorkspace({project:o.project,active:activeAnimation,frame:animationFrame,mode:o.editorMode,autoKey:animationAutoKey,edit:o.edit,pause:pauseAnimation});
  watch(slotAnimation.slotAnimationDraft,()=>{animationDraftVersion.value++;},{flush:'sync'});
  const geometryAnimation=useGeometryAnimationWorkspace({project:o.project,active:activeAnimation,slots:slotAnimation.slotAnimationSlots,frame:animationFrame,mode:o.editorMode,autoKey:animationAutoKey,version:animationDraftVersion,attachment:o.attachment,edit:o.edit,pause:pauseAnimation,notice:o.notice});
  const constraintAnimation=useConstraintAnimationWorkspace({project:o.project,active:activeAnimation,frame:animationFrame,mode:o.editorMode,autoKey:animationAutoKey,version:animationDraftVersion,edit:o.edit,pause:pauseAnimation,notice:o.notice});
  function pauseAnimation(){animationPlaying.value=false;o.stopPlayback?.();}
  function clearAnimationDraft(){animationDraft.value=null;slotAnimation.clearSlotAnimationDraft();geometryAnimation.clearGeometryAnimationDraft();constraintAnimation.clearConstraintAnimationDraft();}
  function seekAnimation(frame:number){
    if(!Number.isFinite(frame)||o.busy.value)return;
    pauseAnimation();clearAnimationDraft();animationFrame.value=Math.fround(Math.max(0,Math.min(1_000_000,frame)));
  }
  function selectAnimation(id:number|null){if(id!==null&&!animations.value.some(a=>a.id===id))return;pauseAnimation();clearAnimationDraft();animationId.value=id;animationFrame.value=0;animationLoopStart.value=null;animationLoopEnd.value=null;}
  function resetAnimationState(){selectAnimation(animations.value[0]?.id??null);animationClipboard.value=null;}
  function playAnimation(){if(!activeAnimation.value||o.busy.value||o.editorMode.value!=='animate')return;clearAnimationDraft();const end=animationLoopEnd.value??animationDuration.value;if(end<=0)return;if(animationFrame.value>=end)animationFrame.value=animationLoopStart.value??0;const events=eventsBetween(activeAnimation.value.eventTracks??[],animationFrame.value,animationFrame.value,true);if(events.length>4096){o.notice('There are too many events in this playback interval.',true);return;}o.startPlayback?.();animationPlaying.value=true;o.fireEvents?.(events);}
  function advanceAnimation(elapsed:number){
    if(!animationPlaying.value||o.busy.value||!Number.isFinite(elapsed)||elapsed<0)return;
    const start=animationLoopStart.value??0,end=animationLoopEnd.value??animationDuration.value;
    if(end<=start){pauseAnimation();return;}
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
    if((start!==null&&(!Number.isFinite(start)||start<0))||(end!==null&&(!Number.isFinite(end)||end<0))||(start!==null&&end!==null&&end<=start))return;
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
    if(!chosen.length&&!slots.length&&!drawOrderKeys.length&&!deformKeys.length&&!constraintKeys.length&&!eventKeys.length)return;
    const start=Math.min(...chosen.map(key=>key.frame),...slots.map(key=>key.frame),...drawOrderKeys.map(key=>key.frame),...deformKeys.map(key=>key.frame),...constraintKeys.map(key=>key.frame),...eventKeys.map(key=>key.frame));
    animationClipboard.value={documentId:model.documentId,keys:chosen.map(key=>({...key,frame:key.frame-start,...(key.controls?{controls:key.controls.map((axis,index)=>key.channel==='rotate'&&index===1?[0,0,0,0]:[axis[0]-start,axis[1],axis[2]-start,axis[3]]) as BezierControls}:{})})),slotKeys:slots.map(key=>shiftSlotAnimationKey(key,-start)),drawOrderKeys:drawOrderKeys.map(key=>({...key,frame:key.frame-start})),deformKeys:deformKeys.map(key=>shiftDeformKey(key,-start)),constraintKeys:constraintKeys.map(key=>shiftConstraintKey(key,-start)),eventKeys:eventKeys.map(key=>({...key,frame:key.frame-start}))};
  }
  async function pasteAnimationKeys(){
    pauseAnimation();
    if(!animationCanPaste.value||!activeAnimation.value||!animationClipboard.value)return;
    const origin=Math.fround(animationFrame.value);
    const keys=animationClipboard.value.keys.map(key=>({...key,frame:key.frame+origin,...(key.controls?{controls:key.controls.map((axis,index)=>key.channel==='rotate'&&index===1?[0,0,0,0]:[axis[0]+origin,axis[1],axis[2]+origin,axis[3]]) as BezierControls}:{})}));
    const slotKeys=animationClipboard.value.slotKeys.map(key=>shiftSlotAnimationKey(key,origin));
    const drawOrderKeys=animationClipboard.value.drawOrderKeys.map(key=>({...key,frame:key.frame+origin})),deformKeys=animationClipboard.value.deformKeys.map(key=>shiftDeformKey(key,origin));
    const constraintKeys=animationClipboard.value.constraintKeys.map(key=>shiftConstraintKey(key,origin)),eventKeys=animationClipboard.value.eventKeys.map(key=>({...key,frame:key.frame+origin}));
    await o.edit(slotKeys.length||drawOrderKeys.length||deformKeys.length||constraintKeys.length||eventKeys.length?{type:'setAnimationKeyBatch',animation:activeAnimation.value.id,boneKeys:keys,slotKeys,drawOrderKeys,deformKeys,constraintKeys,eventKeys}:{type:'setAnimationKeys',animation:activeAnimation.value.id,keys});
  }
  async function insertAnimationKeys(channel:AnimationChannel='translate'){
    pauseAnimation();if(!activeAnimation.value||!animationChannels.value.includes(channel))return;
    const setup=new Map(o.project.value!.bones.map(b=>[b.id,b]));
    const keys:AnimationKeyInput[]=animationBones.value.filter(b=>o.selectedIds.value.includes(b.id)).map(bone=>{
      const current=activeAnimation.value!.tracks.find(track=>track.bone===bone.id&&track.channel===channel)?.keys.slice().reverse().find(key=>sameAnimationFrame(key.frame,animationFrame.value));
      return {bone:bone.id,channel,frame:animationFrame.value,values:keyValues(setup.get(bone.id)!,bone,channel),curve:current?.curve??'linear',...(current?.controls?{controls:current.controls}:{})};
    });
    if(!keys.length){o.notice('Select a bone to key.',true);return;}
    if(await o.edit({type:'setAnimationKeys',animation:activeAnimation.value.id,keys}))clearAnimationDraft();
  }
  async function updateAnimationKey(change:{id:number;values:number[]}){
    const clip=activeAnimation.value;if(!clip)return;
    for(const track of clip.tracks){const key=track.keys.find(k=>k.id===change.id);if(key){await o.edit({type:'setAnimationKey',keyId:key.id,animation:clip.id,bone:track.bone,channel:track.channel,frame:key.frame,values:[change.values[0]??0,change.values[1]??0],curve:key.curve,...(key.controls?{controls:key.controls}:{})});return;}}
  }
  async function moveAnimationKeys(change:{ids:number[];deltaFrames:number}){if(activeAnimation.value)await o.edit({type:'moveAnimationKeys',animation:activeAnimation.value.id,keys:change.ids,deltaFrames:change.deltaFrames});}
  async function deleteAnimationKeys(ids:number[]){if(activeAnimation.value&&ids.length)await o.edit({type:'deleteAnimationKeys',animation:activeAnimation.value.id,keys:ids});}
  async function setAnimationInterpolation(change:{ids:number[];interpolation:string}){
    const clip=activeAnimation.value;if(!clip||!['linear','stepped','bezier'].includes(change.interpolation))return;
    const keys:AnimationKeyInput[]=clip.tracks.flatMap(track=>track.keys.filter(k=>change.ids.includes(k.id)&&(change.interpolation!=='bezier'||track.keys.some(next=>next.frame>k.frame))).map(key=>{
      const next=track.keys.find(k=>k.frame>key.frame),span=(next?.frame??key.frame+1)-key.frame;
      const controls:BezierControls=[0,1].map(axis=>[key.frame+span/3,key.values[axis]!+((next?.values[axis]??key.values[axis]!)-key.values[axis]!)/3,key.frame+span*2/3,key.values[axis]!+((next?.values[axis]??key.values[axis]!)-key.values[axis]!)*2/3]) as BezierControls;
      if(track.channel==='rotate')controls[1]=[0,0,0,0];
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
      const controls=structuredClone(key.controls);const axis=change.component===1?1:0,offset=change.control*2;
      controls[axis][offset]=Math.max(key.frame,Math.min(next.frame,change.frame));controls[axis][offset+1]=change.value;
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
      for(const channel of ['translate','rotate','scale','shear'] as const){
        const fields=channel==='translate'?['x','y'] as const:channel==='rotate'?['rotation'] as const:channel==='scale'?['scaleX','scaleY'] as const:['shearX','shearY'] as const;
        if(fields.every(field=>previous[field]===bone[field]))continue;
        const a=keyValues(base,previous,channel),b=keyValues(base,bone,channel);
        if(a[0]===b[0]&&a[1]===b[1])continue;
        if(!animationChannels.value.includes(channel))throw new Error('This animation channel is not available yet.');
        const current=clip.tracks.find(t=>t.bone===bone.id&&t.channel===channel)?.keys.slice().reverse().find(k=>sameAnimationFrame(k.frame,animationFrame.value));
        keys.push({bone:bone.id,channel,frame:animationFrame.value,values:b,curve:current?.curve??'linear',...(current?.controls?{controls:current.controls}:{})});
      }
    }
    if(!keys.length)return null;
    if(!animationAutoKey.value){animationDraft.value=posed.map(({evaluatedWorld:_,...b})=>b);return null;}
    return {type:'setAnimationKeys',animation:clip.id,keys};
  }
  watch(()=>o.project.value?.animations,()=>{
    if(!animations.value.some(a=>a.id===animationId.value))animationId.value=animations.value[0]?.id??null;
    clearAnimationDraft();
  },{flush:'sync'});
  watch(()=>[o.editorMode.value,animationBones.value,constraintAnimation.animationConstraintPoses.value] as const,()=>{o.localBones.value=animationBones.value;if(o.editorMode.value==='animate')o.changed();},{flush:'sync'});
  watch(o.editorMode,mode=>{pauseAnimation();clearAnimationDraft();if(mode==='animate'&&animationId.value===null)animationId.value=animations.value[0]?.id??null;});
  return {...slotAnimation,...geometryAnimation,...constraintAnimation,animationSpeed,animationId,animationFrame,animationPlaying,animationLoop,animationAutoKey,animationLoopStart,animationLoopEnd,animations,activeAnimation,animationChannels,animationFps,animationDuration,animationBones,animationTracks,animationDraft,animationDraftVersion,animationCanPaste,copyAnimationKeys,pasteAnimationKeys,duplicateAnimation,setAnimationFps,
    pauseAnimation,seekAnimation,selectAnimation,resetAnimationState,playAnimation,advanceAnimation,setAnimationLoopRange,createAnimation,renameAnimation,deleteAnimation,insertAnimationKeys,updateAnimationKey,moveAnimationKeys,deleteAnimationKeys,setAnimationInterpolation,updateAnimationBezier,boneAnimationEdit,clearAnimationDraft};
}
