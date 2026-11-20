import {computed, onMounted, onScopeDispose, reactive, ref, shallowRef, watch} from 'vue';
import {animationPreviewEnd} from '../domain/animationPlayback';
import type {AnimationView} from '../domain/animation';
import {MAX_PREVIEW_TRACKS, PreviewTrackBudgetError, previewTrackSupportsClip, samplePreviewTracks, type PreviewClipSample} from '../domain/previewTracks';
import type {ProjectSummary} from '../domain/project';
import {logicalDocumentKey} from '../domain/resourceContinuity';

interface PreviewEntry {id:number;frame:number;repeat:boolean;additive:boolean}
interface TrackOptions {speed:number;mixDuration:number;alpha:number;repeat:boolean;additive:boolean}
interface PreviewTrack extends TrackOptions {
  entry:PreviewEntry|null;
  previous:PreviewEntry|null;
  elapsed:number;
  duration:number;
  muted:boolean;
}
interface ClipRange {clip:AnimationView;end:number}
type TrackStatus = 'unsupported'|'budget'|'invalid';
const trackGroupSize = 5;

function initialTracks():PreviewTrack[] {
  return Array.from({length:MAX_PREVIEW_TRACKS},()=>({entry:null,previous:null,elapsed:0,duration:0,speed:1,mixDuration:.25,alpha:1,repeat:true,additive:false,muted:false}));
}

function bounded(value:number|undefined,min:number,max:number,fallback:number) {
  return value!==undefined&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
}

export function usePreviewTracks(project:()=>ProjectSummary|null, visible:()=>boolean, activeAnimationId:()=>number|null) {
  const followEditor=ref(true);
  const playCurrent=ref(false);
  const selectedIndex=ref(0);
  const tracks=shallowRef(initialTracks());
  const running=ref(true);
  const foreground=ref(true);
  const fps=computed(()=>Math.fround(project()?.animationFps??30));
  const available=computed(()=>{
    const model=project();
    return !!model&&!model.inspectionOnly&&model.bones.length>0;
  });
  const clips=computed(()=>{
    const model=project();
    const result=new Map<number,ClipRange>();
    if(!model||!available.value||followEditor.value)return result;
    for(const clip of model.animations??[]){
      try{
        const range=animationPreviewEnd(clip,model.slots,fps.value);
        if(!range.exceedsBudget)result.set(clip.id,{clip,end:range.end});
      }catch{/* A malformed or unavailable clip remains outside the Preview track selector. */}
    }
    return result;
  });

  function canUseClip(id:number,index:number) {
    const clip=clips.value.get(id)?.clip;
    return !!clip&&previewTrackSupportsClip(clip,index);
  }

  const selectedTrack=computed(()=>tracks.value[selectedIndex.value]!);
  const hasEntries=computed(()=>tracks.value.some(track=>!track.muted&&(track.entry||track.previous)));
  const visibleTracks=computed(()=>{
    let highest=selectedIndex.value;
    for(const [index,track] of tracks.value.entries())if(track.entry||track.previous)highest=Math.max(highest,index+1);
    return tracks.value.slice(0,Math.min(MAX_PREVIEW_TRACKS,(Math.floor(highest/trackGroupSize)+1)*trackGroupSize));
  });

  function advanceEntry(entry:PreviewEntry|null,delta:number):PreviewEntry|null {
    if(!entry)return null;
    const end=clips.value.get(entry.id)?.end??0;
    const next=entry.frame+delta;
    const frame=entry.repeat&&end>0?next%end:Math.min(next,end);
    return frame===entry.frame?entry:{...entry,frame};
  }

  function entryMotion(entry:PreviewEntry|null) {
    if(!entry)return false;
    const end=clips.value.get(entry.id)?.end??0;
    return end>0&&(entry.repeat||entry.frame<end);
  }

  const hasMotion=computed(()=>tracks.value.some(track=>!track.muted&&((track.previous!==null&&track.elapsed<track.duration)||entryMotion(track.entry))));
  const playing=computed(()=>!followEditor.value&&running.value&&hasMotion.value);
  let nextFrame:number|null=null;
  let previousTime:number|null=null;
  function tick(time:number) {
    nextFrame=null;
    if(!playing.value||!visible()||!foreground.value){previousTime=null;return;}
    if(previousTime!==null){
      const elapsed=Math.max(0,Math.min((time-previousTime)/1000,.25));
      if(elapsed>0)tracks.value=tracks.value.map(track=>{
        if(track.muted||!track.entry&&!track.previous)return track;
        const advance=elapsed*fps.value*track.speed;
        const entry=advanceEntry(track.entry,advance);
        const mixTime=Math.min(track.duration,track.elapsed+elapsed);
        const previous=mixTime<track.duration?advanceEntry(track.previous,advance):null;
        return entry===track.entry&&previous===track.previous&&mixTime===track.elapsed?track:{...track,entry,previous,elapsed:mixTime};
      });
    }
    previousTime=time;
    if(playing.value)nextFrame=requestAnimationFrame(tick);
  }

  function stopClock() {
    if(nextFrame!==null)cancelAnimationFrame(nextFrame);
    nextFrame=null;
    previousTime=null;
  }

  watch(()=>[playing.value,visible(),foreground.value] as const,([isPlaying,isVisible,isForeground])=>{
    stopClock();
    if(isPlaying&&isVisible&&isForeground)nextFrame=requestAnimationFrame(tick);
  });

  function visibilityChanged() { foreground.value=!document.hidden; }
  onMounted(()=>{
    visibilityChanged();
    document.addEventListener('visibilitychange',visibilityChanged);
  });
  onScopeDispose(()=>{
    document.removeEventListener('visibilitychange',visibilityChanged);
    stopClock();
  });

  function setFollowEditor(value:boolean) {
    if(value)playCurrent.value=false;
    if(value||available.value)followEditor.value=value;
  }

  function setPlayCurrent(value:boolean) {
    if(value===playCurrent.value||value&&!available.value)return;
    if(value){
      followEditor.value=false;
      running.value=true;
    }
    playCurrent.value=value;
  }

  function selectTrack(index:number) {
    if(Number.isInteger(index)&&index>=0&&index<visibleTracks.value.length)selectedIndex.value=index;
  }

  function replaceTrack(index:number, next:PreviewTrack) {
    const updated=[...tracks.value];
    updated[index]=next;
    tracks.value=updated;
  }

  function toggleTrackMuted(index:number) {
    if(followEditor.value||!Number.isInteger(index))return;
    const track=tracks.value[index];
    if(track?.entry)replaceTrack(index,{...track,muted:!track.muted});
  }

  function setEntry(index:number,entry:PreviewEntry|null) {
    const track=tracks.value[index]!;
    const duration=track.entry&&!track.muted?track.mixDuration:0;
    // Keep a single outgoing entry when a transition is interrupted.
    replaceTrack(index,{...track,entry,previous:duration>0?track.entry:null,elapsed:0,duration,muted:false});
  }

  const currentClipId=computed(()=>{
    if(!playCurrent.value)return null;
    const id=activeAnimationId();
    return id!==null&&canUseClip(id,0)?id:null;
  });
  watch([playCurrent,currentClipId],([enabled,id])=>{
    if(!enabled)return;
    const track=tracks.value[0]!;
    if((track.entry?.id??null)===id)return;
    setEntry(0,id===null?null:{id,frame:0,repeat:track.repeat,additive:false});
  });

  function clearTrack() {
    if(followEditor.value||!selectedTrack.value.entry)return;
    if(selectedIndex.value===0)playCurrent.value=false;
    setEntry(selectedIndex.value,null);
  }

  function toggleClip(id:number) {
    if(followEditor.value||!canUseClip(id,selectedIndex.value))return;
    const track=selectedTrack.value;
    if(track.entry?.id===id)clearTrack();
    else {
      if(selectedIndex.value===0)playCurrent.value=false;
      setEntry(selectedIndex.value,{id,frame:0,repeat:track.repeat,additive:track.additive});
    }
  }

  function togglePlayback() {
    if(followEditor.value||!hasEntries.value)return;
    if(playing.value){running.value=false;return;}
    if(!hasMotion.value)tracks.value=tracks.value.map(track=>track.entry&&!track.muted?{...track,entry:{...track.entry,frame:0}}:track);
    running.value=true;
  }

  function setOptions(patch:Partial<TrackOptions>) {
    if(followEditor.value)return;
    const track=selectedTrack.value;
    replaceTrack(selectedIndex.value,{...track,
      speed:bounded(patch.speed,.1,2,track.speed),
      mixDuration:bounded(patch.mixDuration,0,10,track.mixDuration),
      alpha:bounded(patch.alpha,0,1,track.alpha),
      repeat:patch.repeat??track.repeat,
      additive:selectedIndex.value>0&&(patch.additive??track.additive),
    });
  }

  watch(()=>logicalDocumentKey(project()),()=>{
    playCurrent.value=false;
    followEditor.value=true;
    selectedIndex.value=0;
    running.value=true;
    tracks.value=initialTracks();
  },{flush:'sync'});
  watch(clips,()=>{
    if(followEditor.value)return;
    tracks.value=tracks.value.map((track,index)=>{
      const entry=track.entry&&canUseClip(track.entry.id,index)?track.entry:null;
      const previous=track.previous&&canUseClip(track.previous.id,index)?track.previous:null;
      if(track.muted&&!entry)return {...track,entry:null,previous:null,elapsed:0,duration:0,muted:false};
      return entry===track.entry&&previous===track.previous?track:{...track,entry,previous};
    });
  },{flush:'sync'});

  function toSample(entry:PreviewEntry|null):PreviewClipSample|null {
    const range=entry?clips.value.get(entry.id):null;
    return entry&&range?{clip:range.clip,frame:Math.min(entry.frame,range.end),additive:entry.additive}:null;
  }

  const sample=computed<{pose:ReturnType<typeof samplePreviewTracks>|null;status:TrackStatus|null}>(()=>{
    if(followEditor.value)return {pose:null,status:null};
    const model=project();
    if(!model||!available.value)return {pose:null,status:'unsupported'};
    try{
      const requests=tracks.value.map((track,index)=>({
        current:track.muted?null:toSample(track.entry),previous:track.muted?null:toSample(track.previous),
        mix:track.duration>0?track.elapsed/track.duration:1,alpha:index===0?1:track.alpha,
      }));
      return {pose:samplePreviewTracks(model,requests),status:null};
    }catch(error){
      return {pose:null,status:error instanceof PreviewTrackBudgetError?'budget':'invalid'};
    }
  });

  return reactive({followEditor,playCurrent,available,playing,hasEntries,selectedIndex,selectedTrack,visibleTracks,
    pose:computed(()=>sample.value.pose),status:computed(()=>sample.value.status),
    setFollowEditor,setPlayCurrent,selectTrack,toggleTrackMuted,toggleClip,togglePlayback,clearTrack,setOptions,
    supportsClip:(id:number)=>canUseClip(id,selectedIndex.value),
  });
}

export type PreviewTracks=ReturnType<typeof usePreviewTracks>;
