import type {SequenceWorkingPose,SequenceKey} from './animationSequence.ts';
import {animationChannelDimensions,animationFamilyChannels,type AnimationChannel,type AnimationFamily,type AnimationView} from './animation.ts';
import type {PathAnimationTrack} from './animationConstraints.ts';
import type {AttachmentView,ConstraintView,SlotView} from './project.ts';
import type {GraphBoneSetup} from './graphValueProjection.ts';
/** Controlled timeline view data; native session owns identities and authoring. */
export type TimelineChannel=AnimationChannel;
export type TimelineFamily=AnimationFamily;
export type TimelineSlotChannel='attachment'|'rgba';
export type TimelinePathChannel=PathAnimationTrack['channel'];
export type TimelineProperty=TimelineChannel|TimelineSlotChannel|TimelinePathChannel|'drawOrder'|'deform'|'ik'|'transformMix'|'physics'|'physicsReset'|'event'|'sequence';
export type KeyShownTarget =
 | {kind:'bone';bone:number;channel:TimelineChannel}
 | {kind:'slot';slot:number;channel:TimelineSlotChannel}
 | {kind:'drawOrder'}
 | {kind:'deform';attachment:number}
 | {kind:'sequence';attachment:number}
 | {kind:'constraint';constraint:number;channel:'ik'|'transformMix'}
 | {kind:'constraint';constraint:number;channel:'physics';property:TimelinePhysicsProperty};
export interface KeyShownRequest {
 documentKey:string;
 revision:number;
 animation:number;
 frame:number;
 targets:KeyShownTarget[];
}
export type TimelineInterpolation='linear'|'stepped'|'bezier';
export interface TimelineAnimation {id:number;name:string}
export interface TimelineBone extends GraphBoneSetup {id:number;name:string}
/** Two absolute frame/value control points, belonging to the outgoing segment. */
export type TimelineBezierControls=[number,number,number,number];
export interface GraphBezierGroupChange {
 readonly id:number;
 readonly nextId:number;
 readonly component:number;
 readonly control:0|1;
 readonly frame:number;
 readonly value:number;
}
export interface GraphBezierGroupRequest {
 readonly documentKey:string;
 readonly revision:number;
 readonly animation:number;
 readonly changes:readonly GraphBezierGroupChange[];
}
export interface TimelineKey {id:number;frame:number;values:number[];interpolation:TimelineInterpolation;controls?:TimelineBezierControls[]|null;attachment?:number|null;order?:number[]|null;progressControls?:TimelineBezierControls|null;ikFlags?:TimelineIkFlags;eventPayload?:TimelineEventPayload;sequencePayload?:SequenceWorkingPose}
export interface TimelineTrack {id:string;boneId:number;channel:TimelineChannel;keys:TimelineKey[]}
export interface TimelineSlot {id:number;name:string;boneId:number;tintBlack?:boolean;attachments:Pick<AttachmentView,'id'|'name'|'sequence'|'linkedMeshSourceId'|'linkedMeshInheritsTimelines'>[]}
export type TimelineSlotTrack={id:string;slotId:number;channel:'attachment';keys:{id:number;frame:number;attachment:number|null}[]}|{id:string;slotId:number;channel:'rgba';keys:TimelineKey[]};
/** Four shared transform families; stored split axes only replace property rows. */
export const timelineChannels:TimelineFamily[]=['rotate','translate','scale','shear'];
export function timelineBoneChannels(storedChannels:readonly TimelineChannel[]):TimelineChannel[]{return timelineChannels.flatMap(family=>animationFamilyChannels(storedChannels,family));}
export function isTimelineBoneChannel(channel:TimelineProperty):channel is TimelineChannel{return ['rotate','translate','translateX','translateY','scale','scaleX','scaleY','shear'].includes(channel);}
export function isTimelinePathChannel(channel:TimelineProperty|undefined):channel is TimelinePathChannel{return channel==='pathPosition'||channel==='pathSpacing'||channel==='pathMix';}
export const timelineChannelColor:Record<TimelineProperty,string>={rotate:'#7ec958',translate:'#70c7e6',translateX:'#70c7e6',translateY:'#70c7e6',scale:'#ef7777',scaleX:'#ef7777',scaleY:'#ef7777',shear:'#e2cb60',attachment:'#bca3e5',rgba:'#e7a9cb',drawOrder:'#c4b6dd',deform:'#e78bb9',ik:'#e2cb60',transformMix:'#70c7e6',physics:'#d8af72',physicsReset:'#d8af72',event:'#bc90d7',sequence:'#9ac77a',pathPosition:'#70c7e6',pathSpacing:'#bca3e5',pathMix:'#7ec958'};
export function timelineFrameAt(clientX:number,left:number,scroll:number,pixelsPerFrame:number,snap=true):number{
 const frame=Math.max(0,(clientX-left+scroll)/pixelsPerFrame);
 return snap?Math.round(frame):Math.round(frame*1000)/1000;
}
export function timelineMoveDelta(delta:number,frames:number[],snap=true):number{
 if(!Number.isFinite(delta)||!frames.length)return 0;
 const offset=snap?Math.round(delta):Math.round(delta*1000)/1000;
 return Math.max(-Math.min(...frames),offset);
}

/** Preview the native Shift expansion without adding its trailing keys to selection. */
export function timelineShiftKeyIds(tracks:readonly {keys:readonly Pick<TimelineKey,'id'|'frame'>[]}[],selected:ReadonlySet<number>):ReadonlySet<number>{
 const moving=new Set(selected);
 for(const {keys} of tracks){
  let first=Infinity;
  for(const key of keys)if(selected.has(key.id))first=Math.min(first,key.frame);
  if(first===Infinity)continue;
  for(const key of keys)if(key.frame>first)moving.add(key.id);
 }
 return moving;
}
/** Plot only the supplied stored interpolation; no synthetic key/curve engine. */
export function timelineCurvePath(keys:TimelineKey[],component:number,x:(frame:number)=>number,y:(value:number)=>number):string{
 const sorted=keys.filter(k=>Number.isFinite(k.values[component])).slice().sort((a,b)=>a.frame-b.frame);
 return sorted.map((key,index)=>{
  const previous=sorted[index-1],point=`${x(key.frame)},${y(key.values[component]!)}`;
  if(!previous)return `M${point}`;
  if(previous.interpolation==='bezier'){
   const controls=previous.controls?.[component];
   return controls?.length===4&&controls.every(Number.isFinite)?`C${x(controls[0])},${y(controls[1])} ${x(controls[2])},${y(controls[3])} ${point}`:`M${point}`;
  }
  return previous.interpolation==='stepped'?`H${x(key.frame)}V${y(key.values[component]!)}`:`L${point}`;
 }).join(' ');
}
export interface TimelineBezierSegment {key:TimelineKey;next:TimelineKey;controls:TimelineBezierControls}
export function timelineBezierSegments(keys:TimelineKey[],component:number):TimelineBezierSegment[]{
 const sorted=keys.slice().sort((a,b)=>a.frame-b.frame);
 return sorted.flatMap((key,index)=>{
  const next=sorted[index+1],controls=key.controls?.[component];
  return key.interpolation==='bezier'&&next&&next.frame>key.frame&&controls?.length===4&&controls.every(Number.isFinite)&&Number.isFinite(key.values[component])&&Number.isFinite(next.values[component])?[{key,next,controls}]:[];
 });
}
/** Screen deltas preserve the grabbed point; only time is bounded by its segment. */
export function timelineBezierDragPoint(point:{frame:number;value:number},delta:{x:number;y:number},pixelsPerFrame:number,height:number,range:{min:number;max:number},start:number,end:number):{frame:number;value:number}{
 return {frame:Math.max(start,Math.min(end,point.frame+delta.x/pixelsPerFrame)),value:point.value-delta.y/Math.max(20,height-40)*(range.max-range.min)};
}

/** Rendered mark centers in the scrollable timeline's content coordinates. */
export interface TimelineKeyMark<Id extends number|string=number> {id:Id;x:number;y:number}
export interface TimelineSelectionPoint {x:number;y:number}
/** A key may have several Graph components or summary marks, but one identity. */
export function timelineBoxSelection<Id extends number|string>(marks:readonly TimelineKeyMark<Id>[],start:TimelineSelectionPoint,end:TimelineSelectionPoint,previous:readonly Id[]=[]):Id[]{
 const result=new Set(previous);
 if(![start.x,start.y,end.x,end.y].every(Number.isFinite))return [...result];
 const left=Math.min(start.x,end.x),right=Math.max(start.x,end.x),top=Math.min(start.y,end.y),bottom=Math.max(start.y,end.y);
 for(const mark of marks)if(Number.isFinite(mark.x)&&Number.isFinite(mark.y)&&mark.x>=left&&mark.x<=right&&mark.y>=top&&mark.y<=bottom)result.add(mark.id);
 return [...result];
}

export interface TimelineDrawOrderKey {id:number;frame:number;order:number[]|null}
export interface TimelineDeformKey {id:number;frame:number;curve:TimelineInterpolation;controls?:TimelineBezierControls|null}
export interface TimelineDeformTrack {id:string;attachmentId:number;slotId:number;keys:TimelineDeformKey[]}
/** A selected deformation interval plots scalar interpolation progress, not offsets. */
export function timelineProgressPath(frame:number,next:number,curve:TimelineInterpolation,controls:TimelineBezierControls|null|undefined,x:(frame:number)=>number,y:(value:number)=>number):string{
 if(!Number.isFinite(frame)||!Number.isFinite(next)||next<=frame)return '';
 const start=`M${x(frame)},${y(0)}`,end=`${x(next)},${y(1)}`;
 if(curve==='stepped')return `${start}H${x(next)}V${y(1)}`;
 if(curve==='linear')return `${start}L${end}`;
 return controls?.length===4&&controls.every(Number.isFinite)?`${start}C${x(controls[0])},${y(controls[1])} ${x(controls[2])},${y(controls[3])} ${end}`:'';
}

export type TimelinePhysicsProperty='inertia'|'strength'|'damping'|'mass'|'wind'|'gravity'|'mix';
export interface TimelineConstraint {id:number;name:string;type:ConstraintView['type'];boneId:number}
export interface TimelineIkFlags {stretch:boolean;compress:boolean;bendPositive:boolean}
export interface TimelineIkKey extends TimelineIkFlags {id:number;frame:number;mix:number;softness:number;interpolation:TimelineInterpolation;controls?:TimelineBezierControls[]|null}
export type TimelineConstraintTrack=
 |{id:string;constraintId:number;kind:'ik';keys:TimelineIkKey[]}
 |{id:string;constraintId:number;kind:'transformMix';keys:TimelineKey[]}
 |{id:string;constraintId:number;kind:TimelinePathChannel;keys:TimelineKey[]}
 |{id:string;constraintId:number;kind:'physics';property:TimelinePhysicsProperty;keys:{id:number;frame:number;value:number;interpolation:TimelineInterpolation;controls?:TimelineBezierControls|null}[]}
 |{id:string;constraintId:number;kind:'physicsReset';keys:{id:number;frame:number}[]};
export type TimelineConstraintKeyChange=
 |({id:number;kind:'ik'}&Partial<{mix:number;softness:number}&TimelineIkFlags>)
 |{id:number;kind:'transformMix';values:number[]}
 |{id:number;kind:'physics';value:number};
export interface TimelineEventPayload {int:number;float:number;string:string;volume:number;balance:number}
export interface TimelineEvent extends TimelineEventPayload {id:number;name:string;audio:string}
export interface TimelineEventKey extends TimelineEventPayload {id:number;frame:number}
export interface TimelineEventTrack {id:string;eventId:number;keys:TimelineEventKey[]}

export interface TimelineSequenceTrack {id:string;slotId:number;attachmentId:number;keys:SequenceKey[]}

export function normalizeTimelineBoneTrack(track:TimelineTrack):TimelineTrack{
 const dimensions=animationChannelDimensions(track.channel);
 if(track.keys.every(key=>key.values.length<=dimensions&&(key.controls?.length??0)<=dimensions))return track;
 return {...track,keys:track.keys.map(key=>({
  ...key,values:key.values.slice(0,dimensions),controls:key.controls?.slice(0,dimensions)??key.controls,
 }))};
}

export function projectTimelineBoneTracks(clip:AnimationView|null|undefined):TimelineTrack[]{
 return (clip?.tracks??[]).map(track=>normalizeTimelineBoneTrack({
  id:`${track.bone}:${track.channel}`,boneId:track.bone,channel:track.channel,
  keys:track.keys.map(key=>({...key,interpolation:key.curve})),
 }));
}

export function projectTimelineSlotTracks(clip:AnimationView|null|undefined,slots:readonly Pick<SlotView,'id'|'tintBlack'>[]):TimelineSlotTrack[]{
 return (clip?.slotTracks??[]).flatMap((track):TimelineSlotTrack[]=>{
  const base={id:`slot:${track.slot}:${track.channel}`,slotId:track.slot};
  if(track.channel==='attachment')return [{...base,channel:track.channel,keys:track.keys.map(key=>({...key,values:[],interpolation:'stepped' as const}))}];
  if(track.channel!=='rgba')return [];
  const tintBlack=slots.find(slot=>slot.id===track.slot)?.tintBlack;
  return [{...base,channel:track.channel,keys:track.keys.map(key=>({
   ...key,values:tintBlack?[...key.values,...(key.darkValues??[0,0,0])]:key.values,
   ...(tintBlack&&key.controls&&key.darkControls?{controls:[...key.controls,...key.darkControls]}:{}),interpolation:key.curve,
  }))}];
 });
}

export function projectTimelineConstraintTracks(clip:AnimationView|null|undefined):TimelineConstraintTrack[]{
 return (clip?.constraintTracks??[]).map(track=>{
  const base={id:`constraint:${track.constraint}:${track.channel}${track.channel==='physics'?':'+track.property:''}`,constraintId:track.constraint};
  if(track.channel==='physicsReset')return {...base,kind:'physicsReset',keys:track.keys};
  if(track.channel==='ik')return {...base,kind:'ik',keys:track.keys.map(key=>({...key,interpolation:key.curve}))};
  if(track.channel==='physics')return {...base,kind:'physics',property:track.property,keys:track.keys.map(key=>({...key,interpolation:key.curve}))};
  return {...base,kind:track.channel,keys:track.keys.map(key=>({...key,interpolation:key.curve}))};
 });
}

export function projectTimelineDeformTracks(clip:AnimationView|null|undefined,slots:readonly {id:number;attachments?:readonly {id:number}[]}[]):TimelineDeformTrack[]{
 return (clip?.deformTracks??[]).map(track=>({
  id:`deform:${track.attachment}`,attachmentId:track.attachment,
  slotId:slots.find(slot=>slot.attachments?.some(attachment=>attachment.id===track.attachment))?.id??-1,
  keys:track.keys.map(key=>({...key})),
 }));
}
