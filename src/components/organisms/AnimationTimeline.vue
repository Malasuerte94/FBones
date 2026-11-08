<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {timelineChannels,timelineBoneChannels,isTimelineBoneChannel,timelineChannelColor,timelineFrameAt,timelineMoveDelta,timelineCurvePath,timelineBezierSegments,timelineBezierDragPoint,timelineBoxSelection,timelineProgressPath,type TimelineDeformTrack,type TimelineDrawOrderKey,type TimelineSelectionPoint,type TimelineAnimation,type TimelineBone,type TimelineChannel,type TimelineInterpolation,type TimelineKey,type TimelineTrack,type TimelineBezierControls,type TimelineSlot,type TimelineSlotTrack,type TimelineProperty,type TimelineConstraint,type TimelineConstraintTrack,type TimelineConstraintKeyChange,type TimelineEvent,type TimelineEventTrack,type TimelineEventPayload,type TimelineIkFlags} from '../../domain/animationTimeline';
import '../../animationTimeline.css';
import AppIcon from '../atoms/AppIcon.vue';
import EventInspector from './EventInspector.vue';
import SequenceKeyEditor from '../molecules/SequenceKeyEditor.vue';
import type {TimelineSequenceTrack} from '../../domain/animationTimeline';
import type {SequenceWorkingPose} from '../../domain/animationSequence';
import {validAnimationLoopRange} from '../../domain/animationPlayback';
import {animationChannelDimensions,animationChannelFamily} from '../../domain/animation';

const props=withDefaults(defineProps<{
 animations:TimelineAnimation[];activeAnimationId:number|null;bones:TimelineBone[];selectedBoneIds:number[];tracks:TimelineTrack[];
 currentFrame:number;durationFrames:number;fps:number;playing:boolean;loop:boolean;autoKey:boolean;disabled?:boolean;canPaste?:boolean;
 storedDurationFrames?:number;previewEndFrames?:number;automaticPreviewEndFrames?:number;previewBudgetExceeded?:boolean;
 loopStart?:number|null;loopEnd?:number|null;
 supportedChannels?:TimelineChannel[];supportedInterpolations?:TimelineInterpolation[];
 sequenceTracks?:TimelineSequenceTrack[];
 constraints?:TimelineConstraint[];constraintTracks?:TimelineConstraintTrack[];selectedConstraintIds?:number[];events?:TimelineEvent[];eventTracks?:TimelineEventTrack[];
 slots?:TimelineSlot[];slotTracks?:TimelineSlotTrack[];selectedSlotIds?:number[];drawOrderKeys?:TimelineDrawOrderKey[];deformTracks?:TimelineDeformTrack[];
}>(),{disabled:false,loopStart:null,loopEnd:null,sequenceTracks:()=>[],supportedChannels:()=>['translate'],supportedInterpolations:()=>['linear','stepped'],slots:()=>[],slotTracks:()=>[],selectedSlotIds:()=>[],drawOrderKeys:()=>[],deformTracks:()=>[],constraints:()=>[],constraintTracks:()=>[],selectedConstraintIds:()=>[],events:()=>[],eventTracks:()=>[]});
const emit=defineEmits<{
 selectAnimation:[id:number];createAnimation:[name:string];renameAnimation:[value:{id:number;name:string}];deleteAnimation:[id:number];duplicateAnimation:[id:number];copyKeys:[ids:number[]];pasteKeys:[];
 seek:[frame:number];play:[];pause:[];toggleLoop:[];toggleAutoKey:[];selectBone:[id:number,additive:boolean];insertKeys:[channel:TimelineChannel];
 moveKeys:[value:{ids:number[];deltaFrames:number}];deleteKeys:[ids:number[]];setInterpolation:[value:{ids:number[];interpolation:TimelineInterpolation}];
 updateKey:[value:{id:number;values:number[]}];loopRange:[value:{start:number|null;end:number|null}];
 draftValidity:[invalid:boolean];selectConstraint:[id:number];insertConstraintKeys:[value:{constraintId:number;kind:TimelineConstraintTrack['kind'];property?:string}];updateConstraintKey:[value:TimelineConstraintKeyChange];
 selectEvent:[id:number];insertEventKey:[eventId:number];updateEventKey:[value:{id:number}&TimelineEventPayload];
 updateBezier:[value:{id:number;component:number;control:0|1;frame:number;value:number}];
 setFps:[value:number];
 selectAttachment:[id:number,additive:boolean];insertDrawOrderKey:[];updateDrawOrderKey:[value:{id:number;order:number[]|null}];insertDeformKey:[value:{attachmentId:number}];updateDeformCurve:[value:{id:number;curve:TimelineInterpolation;controls?:TimelineBezierControls}];
 selectSequenceAttachment:[id:number];insertSequenceKey:[attachment:number];updateSequenceKey:[value:{id:number}&SequenceWorkingPose];
 selectSlot:[id:number,additive:boolean];insertSlotKeys:[value:{slotId:number;channel:'attachment'|'rgba'}];updateSlotKey:[value:{id:number;attachment?:number|null;values?:number[]}];
}>();
const {t,te,locale}=useI18n();
function label(key:string,fallback:string){const name='animation_'+key;return te(name)?t(name):fallback;}
const channelLabel=(channel:TimelineProperty)=>label(channel,{rotate:'Rotate',translate:'Translate',translateX:'Translate X',translateY:'Translate Y',scale:'Scale',scaleX:'Scale X',scaleY:'Scale Y',shear:'Shear',attachment:'Attachment',rgba:'Color',drawOrder:'Draw Order',deform:'Deform',ik:'IK',transformMix:'Transform Mix',physics:'Physics',physicsReset:'Physics Reset',event:'Event',sequence:'Sequence'}[channel]);
const view=ref<'dopesheet'|'graph'>('dopesheet'),pixelsPerFrame=ref(9.4),locked=ref(false),scroll=ref(0),scroller=ref<HTMLElement|null>(null),ruler=ref<HTMLElement|null>(null);
const lockedBoneIds=ref<number[]>([]),nameInput=ref<HTMLInputElement|null>(null);
const selected=ref(new Set<number>()),collapsed=ref(new Set<number>()),drag=ref<{ids:number[];x:number;frames:number[];delta:number}|null>(null);
type ProgressSegment={track:DisplayTrack;key:TimelineKey;next:TimelineKey};
const marquee=ref<{start:TimelineSelectionPoint;end:TimelineSelectionPoint;before:number[];progress?:ProgressSegment}|null>(null);
const marqueeStyle=computed(()=>marquee.value?{left:Math.min(marquee.value.start.x,marquee.value.end.x)+'px',top:Math.min(marquee.value.start.y,marquee.value.end.y)+'px',width:Math.abs(marquee.value.end.x-marquee.value.start.x)+'px',height:Math.abs(marquee.value.end.y-marquee.value.start.y)+'px'}:{});
const progressDrag=ref<{id:number;control:0|1;frame:number;value:number}|null>(null),progressDraft=ref<Array<string|number>>([]),progressError=ref(false),submittedProgress=ref('');
const bezierDrag=ref<{id:number;component:number;control:0|1;frame:number;value:number}|null>(null);
const loopStartDraft=ref<string|number>(''),loopEndDraft=ref<string|number>(''),currentDraft=ref<string|number>(String(props.currentFrame));
const fpsDraft=ref<string|number>(String(props.fps)),fpsError=ref(false),submittedFps=ref<number|null>(null);
const nameEditor=ref<'create'|'rename'|null>(null),nameDraft=ref('');
const active=computed(()=>props.animations.find(a=>a.id===props.activeAnimationId));
const storedDuration=computed(()=>props.storedDurationFrames??props.durationFrames);
const effectivePreviewEnd=computed(()=>props.loopEnd??props.previewEndFrames??props.durationFrames);
const previewBudgetWarning=computed(()=>props.loopEnd===null&&!!props.previewBudgetExceeded);
const showPreviewRangeHint=computed(()=>!!active.value&&(previewBudgetWarning.value||effectivePreviewEnd.value!==storedDuration.value));
const frameText=(frame:number)=>String(Number(frame.toPrecision(7)));
const editable=computed(()=>!!active.value&&!props.disabled);
const constraintDisplayTracks=computed<TimelineConstraintTrack[]>(()=>{const tracks=[...props.constraintTracks];for(const constraint of props.constraints.filter(c=>props.selectedConstraintIds.includes(c.id))){if(constraint.type==='ik'&&!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='ik'))tracks.push({id:`constraint-${constraint.id}-ik`,constraintId:constraint.id,kind:'ik',keys:[]});else if(constraint.type==='transform'&&!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='transformMix'))tracks.push({id:`constraint-${constraint.id}-transformMix`,constraintId:constraint.id,kind:'transformMix',keys:[]});else if(constraint.type==='physics'){for(const property of ['inertia','strength','damping','mass','wind','gravity','mix']as const)if(!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='physics'&&t.property===property))tracks.push({id:`constraint-${constraint.id}-physics-${property}`,constraintId:constraint.id,kind:'physics',property,keys:[]});if(!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='physicsReset'))tracks.push({id:`constraint-${constraint.id}-physicsReset`,constraintId:constraint.id,kind:'physicsReset',keys:[]});}}return tracks;});
const eventDisplayTracks=computed<TimelineEventTrack[]>(()=>props.events.map(event=>props.eventTracks.find(track=>track.eventId===event.id)??{id:`event-${event.id}`,eventId:event.id,keys:[]}));
const sequenceDisplayTracks=computed(()=>{const tracks=[...props.sequenceTracks];for(const slot of props.slots.filter(s=>props.selectedSlotIds.includes(s.id)))for(const attachment of slot.attachments)if(attachment.sequence&&!tracks.some(t=>t.attachmentId===attachment.id))tracks.push({id:`sequence:${attachment.id}`,attachmentId:attachment.id,slotId:slot.id,keys:[]});return tracks;});
type DisplayTrack=Omit<TimelineTrack,'channel'>&{channel:TimelineProperty;slotId?:number;attachmentId?:number;constraintId?:number;constraintKind?:TimelineConstraintTrack['kind'];physicsProperty?:string;eventId?:number};
const allTracks=computed<DisplayTrack[]>(()=>[
 ...props.tracks.map(track=>({...track,keys:track.keys.map(key=>({...key,values:key.values.slice(0,animationChannelDimensions(track.channel)),controls:key.controls?.slice(0,animationChannelDimensions(track.channel))??key.controls}))})),
 ...constraintDisplayTracks.value.map(track=>({id:track.id,boneId:props.constraints.find(c=>c.id===track.constraintId)?.boneId??-1,constraintId:track.constraintId,constraintKind:track.kind,channel:track.kind,physicsProperty:track.kind==='physics'?track.property:undefined,keys:track.kind==='ik'?track.keys.map(key=>({...key,values:[key.mix,key.softness],ikFlags:{stretch:key.stretch,compress:key.compress,bendPositive:key.bendPositive}})):track.kind==='physics'?track.keys.map(key=>({...key,values:[key.value],controls:key.controls?[key.controls]:null})):track.kind==='physicsReset'?track.keys.map(key=>({...key,values:[],interpolation:'stepped'as const})):track.keys})),
 ...eventDisplayTracks.value.map(track=>({id:track.id,boneId:-1,channel:'event'as const,eventId:track.eventId,keys:track.keys.map(key=>({...key,values:[],interpolation:'stepped'as const,eventPayload:{int:key.int,float:key.float,string:key.string,volume:key.volume,balance:key.balance}}))})),
 ...props.slotTracks.map(track=>({id:track.id,boneId:props.slots.find(slot=>slot.id===track.slotId)?.boneId??-1,slotId:track.slotId,channel:track.channel,keys:track.channel==='attachment'?track.keys.map(key=>({...key,values:[],interpolation:'stepped' as const})):track.keys})),
 ...sequenceDisplayTracks.value.map(track=>({id:track.id,boneId:props.slots.find(slot=>slot.id===track.slotId)?.boneId??-1,slotId:track.slotId,attachmentId:track.attachmentId,channel:'sequence'as const,keys:track.keys.map(key=>({id:key.id,frame:key.frame,values:[],interpolation:'stepped'as const,sequencePayload:{mode:key.mode,index:key.index,delay:key.delay}}))})),
 ...props.deformTracks.map(track=>({id:track.id,boneId:props.slots.find(slot=>slot.id===track.slotId)?.boneId??-1,slotId:track.slotId,attachmentId:track.attachmentId,channel:'deform' as const,keys:track.keys.map(key=>({id:key.id,frame:key.frame,values:[],interpolation:key.curve,progressControls:key.controls}))})),
 {id:'global:drawOrder',boneId:-1,channel:'drawOrder',keys:props.drawOrderKeys.map(key=>({...key,values:[],interpolation:'stepped' as const}))},
]);
const allKeys=computed(()=>allTracks.value.flatMap(track=>track.keys.map(key=>({track,key}))));
const selectedKeys=computed(()=>allKeys.value.filter(item=>selected.value.has(item.key.id)));
const singleKey=computed(()=>selectedKeys.value.length===1?selectedKeys.value[0]:undefined);
const eventError=ref(false),sequenceError=ref(false);
const keyDraft=ref<Array<string|number>>([]),valueError=ref(false),submittedValue=ref('');
const constraintOnly=computed(()=>props.selectedConstraintIds.length>0),slotOnly=computed(()=>props.selectedSlotIds.length>0&&!constraintOnly.value);
const shownBones=computed(()=>{if(locked.value)return props.bones.filter(b=>lockedBoneIds.value.includes(b.id));const ids=new Set([...props.constraints.filter(c=>props.selectedConstraintIds.includes(c.id)).map(c=>c.boneId),...((slotOnly.value||constraintOnly.value)?[]:props.selectedBoneIds),...props.slots.filter(s=>props.selectedSlotIds.includes(s.id)).map(s=>s.boneId)]);return ids.size?props.bones.filter(b=>ids.has(b.id)):props.bones;});
function toggleLock(){if(!locked.value)lockedBoneIds.value=shownBones.value.map(b=>b.id);locked.value=!locked.value;}
type Row={id:string;bone?:TimelineBone;track?:DisplayTrack;slot?:TimelineSlot;deform?:TimelineDeformTrack;sequence?:TimelineSequenceTrack;constraint?:TimelineConstraint;event?:TimelineEvent};
const rows=computed<Row[]>(()=>{const result=shownBones.value.flatMap<Row>(bone=>{
 const result:Row[]=[{id:'bone-'+bone.id,bone}];
 if(!collapsed.value.has(bone.id)&&!slotOnly.value&&!constraintOnly.value)for(const channel of timelineBoneChannels(props.tracks.filter(track=>track.boneId===bone.id).map(track=>track.channel))){
  const track=allTracks.value.find(track=>track.boneId===bone.id&&track.channel===channel);
  result.push({id:track?.id??`${bone.id}-${channel}`,bone,track:track??{id:`${bone.id}-${channel}`,boneId:bone.id,channel,keys:[]}});
 }
 if(!collapsed.value.has(bone.id))for(const slot of props.slots.filter(slot=>slot.boneId===bone.id&&(!slotOnly.value||props.selectedSlotIds.includes(slot.id)))){
  const tracks=allTracks.value.filter(track=>track.slotId===slot.id);
  if(props.selectedSlotIds.includes(slot.id)||tracks.some(track=>track.keys.length))for(const channel of ['attachment','rgba']as const){const track=tracks.find(track=>track.channel===channel);result.push({id:track?.id??`slot-${slot.id}-${channel}`,bone,slot,track:track??{id:`slot-${slot.id}-${channel}`,boneId:bone.id,slotId:slot.id,channel,keys:[]}});}
  for(const sequence of sequenceDisplayTracks.value.filter(t=>t.slotId===slot.id))result.push({id:sequence.id,bone,slot,sequence,track:allTracks.value.find(t=>t.id===sequence.id)});
 }
 for(const track of props.deformTracks.filter(track=>props.slots.some(slot=>slot.id===track.slotId&&slot.boneId===bone.id)&&(!slotOnly.value||props.selectedSlotIds.includes(track.slotId))))if(!collapsed.value.has(bone.id))result.push({id:track.id,bone,slot:props.slots.find(slot=>slot.id===track.slotId),deform:track,track:allTracks.value.find(t=>t.id===track.id)});
 if(!collapsed.value.has(bone.id))for(const constraint of props.constraints.filter(c=>c.boneId===bone.id&&(!constraintOnly.value||props.selectedConstraintIds.includes(c.id))))for(const track of allTracks.value.filter(t=>t.constraintId===constraint.id))result.push({id:track.id,bone,constraint,track});
 return result;
});for(const track of allTracks.value.filter(t=>t.channel==='event'))result.push({id:track.id,event:props.events.find(e=>e.id===track.eventId),track});if(active.value&&props.drawOrderKeys.length)result.push({id:'global:drawOrder',track:allTracks.value.find(t=>t.channel==='drawOrder')});return result;});
const lastFrame=computed(()=>Math.max(160,props.durationFrames+30,...allKeys.value.map(item=>item.key.frame+20)));
const gridWidth=computed(()=>lastFrame.value*pixelsPerFrame.value+40);
const majorStep=computed(()=>pixelsPerFrame.value<5?20:pixelsPerFrame.value>16?5:10);
const ticks=computed(()=>Array.from({length:Math.floor(lastFrame.value/majorStep.value)+1},(_,i)=>i*majorStep.value));
const visibleTracks=computed(()=>rows.value.flatMap(row=>row.track?[row.track]:[]));
const overviewFrames=computed(()=>[...new Set(visibleTracks.value.flatMap(track=>track.keys.map(key=>key.frame)))].sort((a,b)=>a-b));
function displayedFrame(key:TimelineKey){return key.frame+(drag.value?.ids.includes(key.id)?drag.value.delta:0);}
function keysForBone(id:number){return visibleTracks.value.filter(t=>t.boneId===id).flatMap(t=>t.keys);}
function connections(track:DisplayTrack){
 const sorted=track.keys.slice().sort((a,b)=>a.frame-b.frame);
 return sorted.flatMap((key,index)=>{const next=sorted[index+1];return next&&key.values.some((v,i)=>v!==next.values[i])?[{key,next}]:[];});
}
function connectionPath(key:TimelineKey,next:TimelineKey){const start=displayedFrame(key)*pixelsPerFrame.value,end=displayedFrame(next)*pixelsPerFrame.value;if(key.interpolation==='stepped')return `M${start},12H${end}`;return key.interpolation==='bezier'?`M${start},16C${start+4},16 ${start+4},9 ${Math.min(start+8,end)},9H${end}`:`M${start},16L${Math.min(start+8,end)},9H${end}`;}
function toggleBone(id:number){const next=new Set(collapsed.value);next.has(id)?next.delete(id):next.add(id);collapsed.value=next;}
function chooseBone(event:MouseEvent,boneId:number){emit('selectBone',boneId,event.ctrlKey||event.metaKey||event.shiftKey);}
function chooseRow(event:MouseEvent,row:Row){if(row.constraint)emit('selectConstraint',row.constraint.id);else if(row.event)emit('selectEvent',row.event.id);else if(row.sequence)emit('selectSequenceAttachment',row.sequence.attachmentId);else if(row.deform)emit('selectAttachment',row.deform.attachmentId,event.ctrlKey||event.metaKey||event.shiftKey);else if(row.slot)emit('selectSlot',row.slot.id,event.ctrlKey||event.metaKey||event.shiftKey);else if(row.bone)chooseBone(event,row.bone!.id);}
function insertRow(row:Row){if(!editable.value||!row.track)return;if(row.constraint)emit('insertConstraintKeys',{constraintId:row.constraint.id,kind:row.track.constraintKind!,property:row.track.physicsProperty});else if(row.event)emit('insertEventKey',row.event.id);else if(row.track.channel==='drawOrder')emit('insertDrawOrderKey');else if(row.sequence)emit('insertSequenceKey',row.sequence.attachmentId);else if(row.deform)emit('insertDeformKey',{attachmentId:row.deform.attachmentId});else if(row.slot)emit('insertSlotKeys',{slotId:row.slot.id,channel:row.track.channel as 'attachment'|'rgba'});else insert(row.track.channel as TimelineChannel,row.bone?.id);}
function canInsertRow(row:Row){if(row.sequence&&!row.slot?.attachments.find(a=>a.id===row.sequence!.attachmentId)?.sequence)return false;return editable.value&&!!row.track&&(!!row.constraint||!!row.event||row.track.channel==='drawOrder'||!!row.deform||!!row.slot||channelSupported(row.track.channel as TimelineChannel));}
function attachmentName(track:DisplayTrack,key:TimelineKey){return key.attachment==null?label('none','None'):props.slots.find(slot=>slot.id===track.slotId)?.attachments.find(a=>a.id===key.attachment)?.name??label('missingAttachment','Missing attachment');}
function rowName(row:Row){return row.constraint?.name??row.event?.name??row.slot?.name??row.bone?.name??channelLabel('drawOrder');}
function deformName(row:Row){return row.slot?.attachments.find(a=>a.id===row.deform?.attachmentId)?.name??label('attachment','Attachment');}
function sequenceName(row:Row){return row.slot?.attachments.find(a=>a.id===row.sequence?.attachmentId)?.name??label('attachment','Attachment');}
function keyLabel(track:DisplayTrack,key:TimelineKey){if(track.channel==='sequence'){const pose=key.sequencePayload;return pose?label('sequenceMode'+pose.mode,['Hold','Once','Loop'][pose.mode]!)+' · '+pose.index+' · '+pose.delay+' s':label('sequence','Sequence');}if(track.channel==='event')return key.eventPayload?.string??label('event','Event');if(track.channel==='physicsReset')return label('reset','Reset');if(track.channel==='drawOrder')return key.order===null?label('setupOrder','Setup order'):label('customOrder','Custom order');if(track.channel==='deform')return label('deform','Deform')+' '+key.interpolation;return track.channel==='attachment'?attachmentName(track,key):key.values.join(', ');}
function chooseKey(key:TimelineKey,additive:boolean){
 const next=additive?new Set(selected.value):new Set<number>();
 if(additive&&next.has(key.id))next.delete(key.id);else next.add(key.id);
 selected.value=next;
}
let stopGesture:(()=>void)|null=null;
function gesture(move:(event:PointerEvent)=>void,finish:(cancel:boolean)=>void){
 stopGesture?.();
 const up=()=>{cleanup();finish(false);},cancel=()=>{cleanup();finish(true);};
 const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);stopGesture=null;};
 window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);
 stopGesture=()=>{cleanup();finish(true);};
}
function startMarquee(event:PointerEvent,clickedKey?:TimelineKey){
 const pane=scroller.value;if(event.button!==0||!editable.value||!pane)return;
 const bounds=pane.getBoundingClientRect(),gutter=pane.querySelector('.at-track-label')?.getBoundingClientRect().width??250;
 if(event.clientX<bounds.left+gutter||event.clientX>=bounds.left+pane.clientWidth||event.clientY<bounds.top||event.clientY>=bounds.top+pane.clientHeight)return;
 emit('pause');
 stopGesture?.();event.preventDefault();event.stopPropagation();
 (pane.closest('.animation-timeline') as HTMLElement|null)?.focus({preventScroll:true});
 const position=(pointer:PointerEvent)=>{const box=pane.getBoundingClientRect();return{x:Math.max(gutter,Math.min(pane.clientWidth,pointer.clientX-box.left))+pane.scrollLeft,y:Math.max(0,Math.min(pane.clientHeight,pointer.clientY-box.top))+pane.scrollTop};};
 const start=position(event),before=[...selected.value],additive=event.ctrlKey||event.metaKey;let moved=false;
 const marks=Array.from(pane.querySelectorAll<HTMLElement|SVGElement>('[data-timeline-key-id]')).flatMap(element=>{const box=element.getBoundingClientRect();return box.width&&box.height?[{id:Number(element.dataset.timelineKeyId),x:box.x+box.width/2-bounds.left+pane.scrollLeft,y:box.y+box.height/2-bounds.top+pane.scrollTop}]:[];});
 const progress=currentProgress.value;marquee.value={start,end:start,before,progress};
 const update=(pointer:PointerEvent)=>{if(!marquee.value)return;marquee.value.end=position(pointer);if(!moved&&Math.hypot(marquee.value.end.x-start.x,marquee.value.end.y-start.y)<3)return;moved=true;selected.value=new Set(timelineBoxSelection(marks,start,marquee.value.end,additive?before:[]));};
 selected.value=new Set(additive?before:[]);
 gesture(update,cancel=>{const prior=marquee.value?.before;marquee.value=null;if(cancel&&prior)selected.value=new Set(prior);else if(!moved&&clickedKey)chooseKey(clickedKey,true);});
}
function gridPointer(event:PointerEvent){if(event.button===2){pan(event);return;}if((event.target as Element).closest('.at-track-label,input,select,button,circle'))return;startMarquee(event);}
function dragKey(event:PointerEvent,key:TimelineKey){
 if(event.button!==0||!editable.value)return;
 if(event.ctrlKey||event.metaKey){startMarquee(event,key);return;}
 emit('pause');
 event.preventDefault();
 const additive=event.shiftKey;
 if(additive||!selected.value.has(key.id))chooseKey(key,additive);
 if(!selected.value.has(key.id))return;
 const ids=[...selected.value],frames=allKeys.value.filter(item=>ids.includes(item.key.id)).map(item=>item.key.frame);
 drag.value={ids,x:event.clientX,frames,delta:0};
 gesture(move=>{if(drag.value)drag.value.delta=timelineMoveDelta((move.clientX-drag.value.x)/pixelsPerFrame.value,frames,!move.shiftKey);},cancel=>{
  const completed=drag.value;drag.value=null;
  if(!cancel&&completed?.delta&&editable.value)emit('moveKeys',{ids:completed.ids,deltaFrames:completed.delta});
 });
}
function seekPointer(event:PointerEvent){
 if(event.button!==0||!active.value||props.disabled)return;
 event.preventDefault();const bounds=ruler.value?.getBoundingClientRect();if(!bounds)return;
 const seek=(move:PointerEvent)=>emit('seek',timelineFrameAt(move.clientX,bounds.left,scroll.value,pixelsPerFrame.value,!move.shiftKey));
 seek(event);gesture(seek,()=>{});
}
function pan(event:PointerEvent){
 if(event.button!==2||!scroller.value)return;
 const pane=scroller.value,x=event.clientX,y=event.clientY,left=pane.scrollLeft,top=pane.scrollTop;
 gesture(move=>{pane.scrollLeft=left+x-move.clientX;pane.scrollTop=top+y-move.clientY;},()=>{});
}
function commitCurrent(){const frame=Number(currentDraft.value);if(String(currentDraft.value).trim()&&Number.isFinite(frame)&&frame>=0)emit('seek',frame);else currentDraft.value=String(props.currentFrame);}
function validateFps(){const value=Number(fpsDraft.value);fpsError.value=!String(fpsDraft.value).trim()||!Number.isFinite(value)||value<1||value>240;return !fpsError.value;}
function commitFps(){if(props.disabled||!active.value||!validateFps())return;const value=Number(fpsDraft.value);if(value!==props.fps&&value!==submittedFps.value){submittedFps.value=value;emit('setFps',value);}}
function resetFps(){fpsDraft.value=String(props.fps);fpsError.value=false;submittedFps.value=null;}
function resetLoopDrafts(){loopStartDraft.value=props.loopStart??'';loopEndDraft.value=props.loopEnd??'';}
function changeLoop(which:'start'|'end',value:string){
 if(!active.value||props.disabled)return;
 const parsed=value.trim()?Number(value):null,range={start:props.loopStart,end:props.loopEnd,[which]:parsed};
 if(validAnimationLoopRange(range,props.automaticPreviewEndFrames??props.storedDurationFrames??props.durationFrames))emit('loopRange',range);
 else resetLoopDrafts();
}
function setLoop(which:'start'|'end'){changeLoop(which,String(props.currentFrame));}
function beginName(kind:'create'|'rename'){nameEditor.value=kind;nameDraft.value=kind==='rename'?active.value?.name??'':'';}
function submitName(){const name=nameDraft.value.trim();if(!name)return;if(nameEditor.value==='rename'&&active.value)emit('renameAnimation',{id:active.value.id,name});else emit('createAnimation',name);nameEditor.value=null;}
const continuousSelection=computed(()=>selectedKeys.value.length>0&&selectedKeys.value.every(item=>!['attachment','drawOrder','physicsReset','event','sequence'].includes(item.track.channel)));
function twoColorTrack(track:DisplayTrack){return track.channel==='rgba'&&(props.slots.find(slot=>slot.id===track.slotId)?.tintBlack||track.keys.some(key=>key.values.length===7));}
const twoColorSelection=computed(()=>selectedKeys.value.some(item=>twoColorTrack(item.track)));
function allowedInterpolation(value:TimelineInterpolation){return props.supportedInterpolations.includes(value)&&(!twoColorSelection.value||value==='linear');}
function interpolation(value:TimelineInterpolation){if(editable.value&&continuousSelection.value&&allowedInterpolation(value))emit('setInterpolation',{ids:[...selected.value],interpolation:value});}
function removeSelected(){if(editable.value&&selected.value.size)emit('deleteKeys',[...selected.value]);}
function keydown(event:KeyboardEvent){
 if(!(event.target as HTMLElement).matches('input,select,textarea')&&(event.ctrlKey||event.metaKey)){
  if(event.key.toLowerCase()==='c'&&selected.value.size){event.preventDefault();event.stopPropagation();emit('copyKeys',[...selected.value]);return;}
  if(event.key.toLowerCase()==='v'&&props.canPaste){event.preventDefault();event.stopPropagation();emit('pasteKeys');return;}
 }
 if((event.target as HTMLElement).matches('input,select,textarea'))return;
 if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();event.stopPropagation();removeSelected();}
 if(event.key==='Escape'){event.stopPropagation();if(marquee.value)stopGesture?.();else{stopGesture?.();selected.value=new Set();}}
 if(event.key===' '){event.stopPropagation();if(active.value&&event.target===event.currentTarget){event.preventDefault();if(props.playing)emit('pause');else emit('play');}}
}
function channelSupported(channel:TimelineChannel){return props.supportedChannels.includes(channel)||timelineChannels.some(family=>family===channel)&&props.supportedChannels.some(supported=>animationChannelFamily(supported)===channel);}
function insert(channel:TimelineChannel,boneId?:number){if(!editable.value||!channelSupported(channel))return;if(boneId!==undefined)emit('selectBone',boneId,false);emit('insertKeys',channel);}
function validateValues(){
 valueError.value=!!singleKey.value&&!['attachment','drawOrder','deform','physicsReset','event','sequence'].includes(singleKey.value.track.channel)&&(keyDraft.value.some(v=>!String(v).trim())||keyDraft.value.map(Number).some(v=>!Number.isFinite(v)||(singleKey.value?.track.channel==='rgba'&&(v<0||v>1))));
 return !valueError.value;
}
function commitValues(){
 const item=singleKey.value;if(!item||!editable.value)return;
 if(!validateValues())return;const values=keyDraft.value.map(Number);
 const signature=item.key.id+':'+values.join(',');if(signature===submittedValue.value||values.every((v,i)=>v===item.key.values[i]))return;
 submittedValue.value=signature;if(item.track.constraintKind==='ik')emit('updateConstraintKey',{id:item.key.id,kind:'ik',mix:values[0],softness:values[1]});else if(item.track.constraintKind==='transformMix')emit('updateConstraintKey',{id:item.key.id,kind:'transformMix',values});else if(item.track.constraintKind==='physics')emit('updateConstraintKey',{id:item.key.id,kind:'physics',value:values[0]!});else if(item.track.slotId!==undefined)emit('updateSlotKey',{id:item.key.id,values});else emit('updateKey',{id:item.key.id,values});
}
function resetValues(){keyDraft.value=singleKey.value?.key.values.map(String)??[];valueError.value=false;submittedValue.value='';}
function axisLabel(track:DisplayTrack,index:number){if(track.channel==='translateY'||track.channel==='scaleY')return 'Y';if(track.channel==='ik')return [label('mix','Mix'),label('softness','Softness')][index]??String(index+1);if(track.channel==='transformMix')return ['Rotate','X','Y','Scale X','Scale Y','Shear Y'][index]??String(index+1);if(track.channel==='physics')return physicsLabel(track.physicsProperty);if(track.channel==='rgba'){const axis=['R','G','B','A','R','G','B'][index]??String(index+1);return twoColorTrack(track)?t(index<4?'animation_lightComponent':'animation_darkComponent',{axis}):axis;}return index===0?'X':index===1?'Y':String(index+1);}
function changeAttachment(value:string){if(singleKey.value?.track.channel==='attachment'&&editable.value)emit('updateSlotKey',{id:singleKey.value.key.id,attachment:value===''?null:Number(value)});}
function physicsLabel(value?:string){return value?label('physics_'+value,value[0]!.toUpperCase()+value.slice(1)):label('physics','Physics');}
function changeIkFlag(key:keyof TimelineIkFlags,event:Event){const item=singleKey.value;if(item?.track.channel==='ik'&&editable.value)emit('updateConstraintKey',{id:item.key.id,kind:'ik',[key]:(event.target as HTMLInputElement).checked});}
const selectedEvent=computed(()=>props.events.find(event=>event.id===singleKey.value?.track.eventId));
const selectedEventKey=computed(()=>{const item=singleKey.value;return item?.track.channel==='event'&&item.key.eventPayload?{id:item.key.id,frame:item.key.frame,...item.key.eventPayload}:null;});
const selectedSlot=computed(()=>props.slots.find(slot=>slot.id===singleKey.value?.track.slotId));
const selectedSequenceSettings=computed(()=>selectedSlot.value?.attachments.find(a=>a.id===singleKey.value?.track.attachmentId)?.sequence??null);
function commitSequenceKey(value:SequenceWorkingPose){const item=singleKey.value;if(item?.track.channel==='sequence'&&editable.value)emit('updateSequenceKey',{id:item.key.id,...value});}
const currentProgress=computed<ProgressSegment|undefined>(()=>{const item=selectedKeys.value.find(item=>item.track.channel==='deform');if(!item)return;const next=item.track.keys.find(key=>key.frame>item.key.frame);return next?{...item,next}:undefined;});
const graphProgress=computed(()=>marquee.value?marquee.value.progress:currentProgress.value);
const progressControls=computed(()=>{const controls=graphProgress.value?.key.progressControls;if(!controls)return;const result=[...controls] as TimelineBezierControls,preview=progressDrag.value;if(preview?.id===graphProgress.value?.key.id){result[preview.control*2]=preview.frame;result[preview.control*2+1]=preview.value;}return result;});
const plotted=computed(()=>graphProgress.value?[]:allTracks.value.filter(track=>!['attachment','drawOrder','deform','physicsReset','event','sequence'].includes(track.channel)&&rows.value.some(row=>row.track?.id===track.id)).flatMap(track=>{
 const count=isTimelineBoneChannel(track.channel)?(track.keys.length?animationChannelDimensions(track.channel):0):Math.max(0,...track.keys.map(k=>k.values.length));
 return Array.from({length:count},(_,component)=>({id:track.id+'-'+component,track,component,color:track.channel==='rgba'?['#ef7777','#7ec958','#70c7e6','#e0e3e6','#ef7777','#7ec958','#70c7e6'][component]!:component===1?'#e2cb60':timelineChannelColor[track.channel],dark:track.channel==='rgba'&&component>=4}));
}));
const graphRange=computed(()=>{const progress=graphProgress.value;const values=progress?[0,1,...(progress.key.progressControls?[progress.key.progressControls[1],progress.key.progressControls[3]]:[])]:plotted.value.flatMap(s=>s.track.keys.flatMap(k=>[k.values[s.component]!,...(k.interpolation==='bezier'&&k.controls?.[s.component]?[k.controls[s.component]![1],k.controls[s.component]![3]]:[])])).filter(Number.isFinite);const min=Math.min(0,...values),max=Math.max(1,...values),padding=(max-min)*.1;return {min:min-padding,max:max+padding};});
const graphTicks=computed(()=>Array.from({length:5},(_,i)=>graphRange.value.min+(graphRange.value.max-graphRange.value.min)*i/4));
const graphHeight=ref(260);let resize:ResizeObserver|null=null;
watch(scroller,element=>{resize?.disconnect();if(element){graphHeight.value=element.clientHeight;resize=new ResizeObserver(()=>graphHeight.value=element.clientHeight);resize.observe(element);}});
function graphY(value:number){const range=graphRange.value;return graphHeight.value-20-(value-range.min)/(range.max-range.min)*Math.max(20,graphHeight.value-40);}
function graphKeys(track:DisplayTrack){return track.keys.map(key=>{
 const preview=bezierDrag.value,controls=key.controls?.map(axis=>[...axis] as TimelineBezierControls);
 if(controls&&preview?.id===key.id&&controls[preview.component]){controls[preview.component]![preview.control*2]=preview.frame;controls[preview.component]![preview.control*2+1]=preview.value;}
 return {...key,frame:displayedFrame(key),controls};
});}
function graphPath(track:DisplayTrack,component:number){return timelineCurvePath(graphKeys(track),component,frame=>frame*pixelsPerFrame.value,graphY);}
function selectedSegments(track:DisplayTrack,component:number){return timelineBezierSegments(graphKeys(track),component).filter(segment=>selected.value.has(segment.key.id)||selected.value.has(segment.next.id));}
function progressPath(){const segment=graphProgress.value;return segment?timelineProgressPath(segment.key.frame,segment.next.frame,segment.key.interpolation,progressControls.value,frame=>frame*pixelsPerFrame.value,graphY):'';}
function resetProgress(){progressDraft.value=singleKey.value?.track.channel==='deform'?singleKey.value.key.progressControls?.map(String)??[]:[];progressError.value=false;submittedProgress.value='';}
function validateProgress(){const item=singleKey.value,segment=currentProgress.value;progressError.value=!!item&&item.track.channel==='deform'&&item.key.interpolation==='bezier'&&(progressDraft.value.length!==4||progressDraft.value.some(v=>!String(v).trim()||!Number.isFinite(Number(v)))||!!segment&&[0,2].some(index=>Number(progressDraft.value[index])<item.key.frame||Number(progressDraft.value[index])>segment.next.frame));return !progressError.value;}
function commitProgress(){const item=singleKey.value;if(!item||item.track.channel!=='deform'||!editable.value||!validateProgress())return;const controls=progressDraft.value.map(Number) as TimelineBezierControls,signature=item.key.id+':'+controls.join(',');if(signature===submittedProgress.value||controls.every((v,i)=>v===item.key.progressControls?.[i]))return;submittedProgress.value=signature;emit('updateDeformCurve',{id:item.key.id,curve:'bezier',controls});}
function dragProgress(event:PointerEvent,control:0|1){
 const segment=graphProgress.value,controls=progressControls.value;if(event.button!==0||!editable.value||!segment||!controls)return;
 emit('pause');
 event.preventDefault();event.stopPropagation();const initial={frame:controls[control*2]!,value:controls[control*2+1]!},screen={x:event.clientX,y:event.clientY},range={...graphRange.value},height=graphHeight.value;
 progressDrag.value={id:segment.key.id,control,...initial};
 gesture(move=>{if(progressDrag.value)progressDrag.value={id:segment.key.id,control,...timelineBezierDragPoint(initial,{x:move.clientX-screen.x,y:move.clientY-screen.y},pixelsPerFrame.value,height,range,segment.key.frame,segment.next.frame)};},cancel=>{const completed=progressDrag.value;progressDrag.value=null;if(cancel||!completed||!editable.value||completed.frame===initial.frame&&completed.value===initial.value)return;const result=[...controls] as TimelineBezierControls;result[control*2]=completed.frame;result[control*2+1]=completed.value;emit('updateDeformCurve',{id:segment.key.id,curve:'bezier',controls:result});});
}
function dragHandle(event:PointerEvent,key:TimelineKey,next:TimelineKey,component:number,control:0|1,controls:TimelineBezierControls){
 if(event.button!==0||!editable.value)return;
 emit('pause');
 event.preventDefault();event.stopPropagation();
 const initial={frame:controls[control*2]!,value:controls[control*2+1]!},screen={x:event.clientX,y:event.clientY},range={...graphRange.value},height=graphHeight.value;
 const track=allTracks.value.find(track=>track.keys.some(item=>item.id===key.id)),bone=!!track&&isTimelineBoneChannel(track.channel);
 // A valid monotone bone time cubic may have handles beyond the far key.
 // Keep other families' established segment-local editing bounds unchanged.
 const timeStart=bone&&control===1?0:key.frame,timeEnd=bone&&control===0?1_000_000:next.frame;
 bezierDrag.value={id:key.id,component,control,...initial};
 gesture(move=>{if(!bezierDrag.value)return;const point=timelineBezierDragPoint(initial,{x:move.clientX-screen.x,y:move.clientY-screen.y},pixelsPerFrame.value,height,range,timeStart,timeEnd);bezierDrag.value={id:key.id,component,control,...point};},cancel=>{
  const completed=bezierDrag.value;bezierDrag.value=null;
  if(!cancel&&editable.value&&completed&&(completed.frame!==initial.frame||completed.value!==initial.value))emit('updateBezier',completed);
 });
}
watch(()=>props.currentFrame,value=>{if(marquee.value||progressDrag.value||bezierDrag.value||drag.value)stopGesture?.();currentDraft.value=String(Math.round(value*1000)/1000);});
watch(()=>props.fps,resetFps);
watch([view,pixelsPerFrame,rows],()=>{if(marquee.value||progressDrag.value||bezierDrag.value||drag.value)stopGesture?.();});
watch(fpsDraft,validateFps,{flush:'sync'});
watch(()=>props.activeAnimationId,()=>{stopGesture?.();selected.value=new Set();collapsed.value=new Set();locked.value=false;});
watch(()=>[props.loopStart,props.loopEnd,props.activeAnimationId],resetLoopDrafts,{immediate:true});
watch(nameEditor,async value=>{if(value){await nextTick();nameInput.value?.focus();}});
watch(()=>singleKey.value?.key,()=>{resetValues();resetProgress();},{immediate:true,deep:true});
watch(keyDraft,validateValues,{deep:true,flush:'sync'});
watch(progressDraft,validateProgress,{deep:true,flush:'sync'});
watch([valueError,fpsError,progressError,eventError,sequenceError],()=>emit('draftValidity',valueError.value||fpsError.value||progressError.value||eventError.value||sequenceError.value),{flush:'sync'});
watch(()=>[props.tracks,props.slotTracks,props.deformTracks,props.drawOrderKeys,props.constraintTracks,props.eventTracks,props.sequenceTracks],()=>{if(drag.value||bezierDrag.value||progressDrag.value||marquee.value)stopGesture?.();const ids=new Set(allKeys.value.map(item=>item.key.id));selected.value=new Set([...selected.value].filter(id=>ids.has(id)));},{deep:true});
watch(()=>props.disabled,value=>{if(value)stopGesture?.();else{submittedValue.value='';submittedProgress.value='';submittedFps.value=null;}});
onBeforeUnmount(()=>{stopGesture?.();resize?.disconnect();emit('draftValidity',false);});
defineExpose({beginName});
</script>

<template>
 <section class="animation-timeline" data-testid="animation-timeline" :aria-label="label('timeline','Animation timeline')" tabindex="0" @keydown="keydown">
  <header class="at-tabs">
   <button :class="{active:view==='graph'}" data-testid="timeline-tab-graph" @click="view='graph'">⌁ {{ label('graph','Graph') }}</button>
   <button :class="{active:view==='dopesheet'}" data-testid="timeline-tab-dopesheet" @click="view='dopesheet'">▦ {{ label('dopesheet','Dopesheet') }}</button>
   <span class="at-header-spacer" />
   <template v-if="nameEditor">
    <form class="at-animation-name" @submit.prevent="submitName"><input ref="nameInput" v-model="nameDraft" data-testid="animation-name" :aria-label="label('name','Animation name')" @keydown.esc="nameEditor=null"/><button type="submit">✓</button><button type="button" @click="nameEditor=null">×</button></form>
   </template>
   <template v-else>
    <select :value="activeAnimationId??''" :disabled="disabled||!animations.length" data-testid="animation-select" :aria-label="label('active','Active animation')" @change="emit('selectAnimation',Number(($event.target as HTMLSelectElement).value))"><option v-if="!animations.length" value="">{{ label('noAnimation','No animation') }}</option><option v-for="animation in animations" :key="animation.id" :value="animation.id">{{ animation.name }}</option></select>
    <button :disabled="disabled" data-testid="animation-create" :title="label('new','New animation')" :aria-label="label('new','New animation')" @click="beginName('create')">＋</button>
    <button :disabled="!editable" data-testid="animation-rename" :title="label('rename','Rename animation')" :aria-label="label('rename','Rename animation')" @click="beginName('rename')">✎</button>
    <button :disabled="!editable" data-testid="animation-duplicate" :title="label('duplicate','Duplicate animation')" :aria-label="label('duplicate','Duplicate animation')" @click="active&&emit('duplicateAnimation',active.id)">⧉</button>
    <button :disabled="!editable" data-testid="animation-delete" :title="label('deleteAnimation','Delete animation')" :aria-label="label('deleteAnimation','Delete animation')" @click="active&&emit('deleteAnimation',active.id)">×</button>
   </template>
  </header>
  <div class="at-toolbar">
   <div class="at-tool-group"><button :class="{active:locked}" :title="label('lockRows','Lock displayed bone rows')" :aria-pressed="locked" @click="toggleLock">{{ locked?'▣':'▢' }}</button><button :disabled="!selected.size||!editable" :title="label('deleteKeys','Delete selected keys')" :aria-label="label('deleteKeys','Delete selected keys')" data-testid="timeline-delete-keys" @click="removeSelected">⌫</button></div>
   <div class="at-tool-group"><button :disabled="!selected.size||!editable" aria-label="Copy keys" title="Copy selected keys (Ctrl+C)" data-testid="timeline-copy" @click="emit('copyKeys',[...selected])">⧉</button><button :disabled="!canPaste||!editable" aria-label="Paste keys" title="Paste keys at current frame (Ctrl+V)" data-testid="timeline-paste" @click="emit('pasteKeys')">▣</button></div>
   <div class="at-tool-group at-interpolation"><button v-for="curve in (['linear','stepped','bezier'] as const)" :key="curve" :class="{active:selectedKeys.length&&selectedKeys.every(k=>k.key.interpolation===curve)}" :disabled="!editable||!continuousSelection||!allowedInterpolation(curve)" :title="twoColorSelection&&curve!=='linear'?t('slotTwoColorLinearOnly'):supportedInterpolations.includes(curve)?label(curve,curve):label('unavailable','Not available for this animation profile')" :aria-label="label(curve,curve)" :data-testid="'timeline-interpolation-'+curve" @click="interpolation(curve)">{{ curve==='linear'?'╱':curve==='stepped'?'⌜':'⌁' }}</button></div>
   <div class="at-tool-group at-channel-buttons"><button v-for="channel in timelineChannels" :key="channel" :style="{color:timelineChannelColor[channel]}" :disabled="!editable||!channelSupported(channel)||!selectedBoneIds.length||slotOnly" :title="channelSupported(channel)?label('key','Key')+' '+channelLabel(channel):label('unavailableChannel','This channel is not yet supported by the animation format profile')" :aria-label="label('key','Key')+' '+channelLabel(channel)" :data-testid="'timeline-key-'+channel" @click="insert(channel)">{{ channel==='rotate'?'⟳':channel==='translate'?'✥':channel==='scale'?'▣':'⌁' }}<span>{{ channelLabel(channel) }}</span><i><AppIcon name="key" class="!size-3"/></i></button></div>
   <div class="at-tool-group"><button :class="{active:autoKey}" :disabled="!editable" :aria-pressed="autoKey" data-testid="timeline-auto-key" @click="emit('toggleAutoKey')">◉ {{ label('autoKey','Auto Key') }}</button></div>
   <div class="at-tool-group at-current"><label for="animation-current">{{ label('current','Current') }}</label><input id="animation-current" v-model="currentDraft" type="number" min="0" step="1" :disabled="!active||disabled" data-testid="timeline-current" @focus="emit('pause')" @change="commitCurrent" @keydown.enter.prevent="commitCurrent" @keydown.esc="currentDraft=String(currentFrame)"/></div>
   <div class="at-tool-group at-loop-range"><button :disabled="!active||disabled" @click="emit('pause');setLoop('start')">{{ label('loopStart','Loop Start') }}</button><input v-model="loopStartDraft" :disabled="!active||disabled" type="number" min="0" step="any" :aria-label="label('loopStart','Loop Start')" data-testid="timeline-loop-start" @focus="emit('pause')" @change="changeLoop('start',String(loopStartDraft))" @keydown.enter.stop.prevent="changeLoop('start',String(loopStartDraft))" @keydown.esc.stop.prevent="resetLoopDrafts"/><button :disabled="!active||disabled" @click="emit('pause');setLoop('end')">{{ label('end','End') }}</button><input v-model="loopEndDraft" :disabled="!active||disabled" type="number" min="0" step="any" :aria-label="label('end','End')" data-testid="timeline-loop-end" @focus="emit('pause')" @change="changeLoop('end',String(loopEndDraft))" @keydown.enter.stop.prevent="changeLoop('end',String(loopEndDraft))" @keydown.esc.stop.prevent="resetLoopDrafts"/></div>
  </div>
  <div class="at-ruler-row">
   <div class="at-transport">
    <button :disabled="!active||disabled" :title="label('first','First frame')" :aria-label="label('first','First frame')" @click="emit('seek',0)">|◀</button>
    <button :disabled="!active||disabled" :title="label('previousKey','Previous key')" :aria-label="label('previousKey','Previous key')" @click="emit('seek',[...overviewFrames].reverse().find(f=>f<currentFrame-.001)??0)">◀|</button>
    <button :disabled="!active||disabled" :title="label('previousFrame','Previous frame')" :aria-label="label('previousFrame','Previous frame')" @click="emit('seek',Math.max(0,Math.ceil(currentFrame)-1))">◀</button>
    <button :disabled="!active||disabled" :title="playing?label('pause','Pause'):label('play','Play')" :aria-label="playing?label('pause','Pause'):label('play','Play')" data-testid="timeline-play" :class="{active:playing}" @click="playing?emit('pause'):emit('play')">{{ playing?'Ⅱ':'▶' }}</button>
    <button :disabled="!active||disabled" :title="label('nextFrame','Next frame')" :aria-label="label('nextFrame','Next frame')" @click="emit('seek',Math.floor(currentFrame)+1)">▶|</button>
    <button :disabled="!active||disabled" :title="label('nextKey','Next key')" :aria-label="label('nextKey','Next key')" @click="emit('seek',overviewFrames.find(f=>f>currentFrame+.001)??durationFrames)">|▶</button>
    <button :disabled="!active||disabled" :title="label('last','Last frame')" :aria-label="label('last','Last frame')" @click="emit('seek',durationFrames)">▶|</button>
    <button :disabled="!active||disabled" :class="{active:loop}" :aria-pressed="loop" :title="label('repeat','Repeat')" :aria-label="label('repeat','Repeat')" data-testid="timeline-repeat" @click="emit('toggleLoop')">⟳</button>
   </div>
   <div ref="ruler" class="at-ruler" data-testid="timeline-ruler" @pointerdown="seekPointer">
    <div class="at-ruler-content" :style="{width:gridWidth+'px',transform:`translateX(${-scroll}px)`,backgroundSize:pixelsPerFrame+'px 12px'}"><span v-for="frame in ticks" :key="frame" class="at-ruler-label" :style="{left:frame*pixelsPerFrame+'px'}">{{ frame }}</span><span v-for="frame in overviewFrames" :key="'key-'+frame" class="at-overview-diamond" :style="{left:frame*pixelsPerFrame+'px'}"/><span class="at-playhead-tip" :style="{left:currentFrame*pixelsPerFrame+'px'}"><b>{{ Math.round(currentFrame*100)/100 }}</b>▼</span></div>
   </div>
  </div>
  <p v-if="twoColorSelection" role="status" class="px-2 text-[10px] leading-4 text-muted" data-testid="timeline-two-color-limit">{{t('slotTwoColorLinearOnly')}}</p>
  <div ref="scroller" class="at-scroller" :class="{'is-graph':view==='graph'}" data-testid="timeline-scroll" @scroll="scroll=($event.target as HTMLElement).scrollLeft" @pointerdown="gridPointer" @contextmenu.prevent>
   <div class="at-track-area" data-testid="timeline-track-area" :style="{width:`calc(var(--at-gutter) + ${gridWidth}px)`,minHeight:view==='graph'?graphHeight+'px':undefined}">
    <div class="at-track-row at-overview-row"><div class="at-track-label">♧ <span>{{ active?.name??label('noAnimation','No animation') }}</span></div><div v-if="view==='dopesheet'" class="at-time-cells"><i v-for="item in visibleTracks.flatMap(track=>track.keys)" :key="item.id" class="at-summary-key" :data-timeline-key-id="item.id" :style="{left:item.frame*pixelsPerFrame+'px'}"/></div></div>
    <div v-for="row in rows" :key="row.id" v-memo="[row,view,selected,drag?.delta,drag?.ids,pixelsPerFrame,majorStep,gridWidth,canInsertRow(row),selectedBoneIds.includes(row.bone?.id??-1),selectedSlotIds.includes(row.slot?.id??-1),selectedConstraintIds.includes(row.constraint?.id??-1),locale]" class="at-track-row" :class="{'at-bone-row':!row.track,'at-property-row':!!row.track&&row.track.channel!=='drawOrder','at-global-row':row.track?.channel==='drawOrder'}">
     <div class="at-track-label" :class="{selected:row.constraint?selectedConstraintIds.includes(row.constraint.id):row.slot?selectedSlotIds.includes(row.slot.id):selectedBoneIds.includes(row.bone?.id??-1)}" @click="chooseRow($event,row)">
      <button v-if="!row.track" class="at-collapse" :aria-label="(collapsed.has(row.bone!.id)?label('expand','Expand'):label('collapse','Collapse'))+' '+row.bone!.name" @click.stop="toggleBone(row.bone!.id)">{{ collapsed.has(row.bone!.id)?'+':'−' }}</button>
      <span v-else class="at-property-icon" :style="{color:timelineChannelColor[row.track.channel]}">{{ row.track.channel==='rotate'?'⟳':row.track.channel==='translate'?'✥':row.track.channel==='scale'?'▣':row.track.channel==='attachment'?'◇':row.track.channel==='rgba'?'●':row.track.channel==='deform'?'◇':row.track.channel==='drawOrder'?'☷':'⌁' }}</span>
      <span>{{ row.track?(row.constraint?row.constraint.name+' · ':row.event?row.event.name+' · ':row.slot?row.slot.name+' · ':'')+(row.deform?deformName(row)+' · ':row.sequence?sequenceName(row)+' · ':'')+(row.track.channel==='physics'?physicsLabel(row.track.physicsProperty):channelLabel(row.track.channel)):row.bone!.name }}</span>
      <button v-if="row.track" class="at-row-key-button" :disabled="!canInsertRow(row)" :title="canInsertRow(row)?label('key','Key'):label('unavailableChannel','This channel is not yet supported by the animation format profile')" :aria-label="label('key','Key')+' '+rowName(row)+' '+channelLabel(row.track.channel)" :data-testid="row.constraint?`timeline-key-constraint-${row.constraint.id}-${row.track.constraintKind}${row.track.physicsProperty?'-'+row.track.physicsProperty:''}`:row.event?`timeline-key-event-${row.event.id}`:row.track.channel==='drawOrder'?'timeline-key-draw-order':row.deform?`timeline-key-deform-${row.deform.attachmentId}`:row.sequence?`timeline-key-sequence-${row.sequence.attachmentId}`:row.slot?`timeline-key-slot-${row.slot.id}-${row.track.channel}`:`timeline-key-bone-${row.bone!.id}-${row.track.channel}`" @click.stop="insertRow(row)"><AppIcon name="key" class="!size-3"/></button>
     </div>
     <div v-if="view==='dopesheet'||row.track?.channel==='sequence'" class="at-time-cells" :style="{backgroundSize:`${pixelsPerFrame*majorStep}px 100%`}">
      <template v-if="row.track"><svg class="at-row-connections" :width="gridWidth" height="23" aria-hidden="true"><path v-for="connection in connections(row.track)" :key="connection.key.id" :d="connectionPath(connection.key,connection.next)" :stroke="timelineChannelColor[row.track.channel]" :stroke-dasharray="connection.key.interpolation==='stepped'?'2 3':undefined" fill="none"/></svg><button v-for="key in row.track.keys" :key="key.id" class="at-key" :data-timeline-key-id="key.id" :class="{selected:selected.has(key.id),'at-attachment-key':['attachment','drawOrder','physicsReset','event','sequence'].includes(row.track.channel)}" :title="keyLabel(row.track,key)" :style="{left:displayedFrame(key)*pixelsPerFrame+'px',color:timelineChannelColor[row.track.channel]}" :aria-label="rowName(row)+' '+channelLabel(row.track.channel)+' '+label('frame','frame')+' '+key.frame+' '+keyLabel(row.track,key)" :aria-pressed="selected.has(key.id)" :data-testid="'timeline-key-'+key.id" @pointerdown.stop="dragKey($event,key)" @keydown.enter.stop.prevent="chooseKey(key,$event.ctrlKey||$event.metaKey)"/></template>
      <template v-else><i v-for="key in keysForBone(row.bone!.id)" :key="key.id" class="at-summary-key" :data-timeline-key-id="key.id" :style="{left:displayedFrame(key)*pixelsPerFrame+'px'}"/></template>
     </div>
    </div>
    <div v-if="view==='graph'" v-memo="[plotted,graphProgress,progressControls,graphRange,graphHeight,gridWidth,pixelsPerFrame,majorStep,scroll,selected,drag?.delta,drag?.ids,bezierDrag,bezierDrag?.frame,bezierDrag?.value,locale]" class="at-graph" :style="{width:gridWidth+'px',height:graphHeight+'px',backgroundSize:`${pixelsPerFrame*majorStep}px 25%`}">
     <svg :width="gridWidth" :height="graphHeight" :aria-label="label('curves','Key value curves')">
      <g v-if="graphProgress" class="at-deform-progress" data-testid="timeline-deform-progress" :style="{color:timelineChannelColor.deform}">
       <path :d="progressPath()" :stroke="timelineChannelColor.deform" fill="none" stroke-width="1.5" data-testid="timeline-deform-progress-path"/>
       <text :x="Math.max(scroll+8,graphProgress.key.frame*pixelsPerFrame+6)" y="16">{{label('deformProgress','Deform progress')}} · {{graphProgress.key.frame}}–{{graphProgress.next.frame}}</text>
       <template v-if="graphProgress.key.interpolation==='bezier'&&progressControls">
        <line :x1="graphProgress.key.frame*pixelsPerFrame" :y1="graphY(0)" :x2="progressControls[0]*pixelsPerFrame" :y2="graphY(progressControls[1])"/>
        <line :x1="graphProgress.next.frame*pixelsPerFrame" :y1="graphY(1)" :x2="progressControls[2]*pixelsPerFrame" :y2="graphY(progressControls[3])"/>
        <circle v-for="control in ([0,1] as const)" :key="control" :cx="progressControls[control*2]!*pixelsPerFrame" :cy="graphY(progressControls[control*2+1]!)" r="4" :data-testid="`timeline-deform-handle-${graphProgress.key.id}-${control}`" :aria-label="label('deformProgress','Deform progress')+' '+label('handle','Handle')+' '+(control+1)" @pointerdown.stop="dragProgress($event,control)"/>
       </template>
       <rect v-for="(key,index) in [graphProgress.key,graphProgress.next]" :key="key.id" :x="key.frame*pixelsPerFrame-3" :y="graphY(index)-3" width="6" height="6" :data-timeline-key-id="key.id" :aria-pressed="selected.has(key.id)" :fill="selected.has(key.id)?timelineChannelColor.deform:'#252728'" :stroke="timelineChannelColor.deform" tabindex="0" role="button" :aria-label="label('deformProgress','Deform progress')+' '+key.frame" @pointerdown.stop="dragKey($event,key)" @keydown.enter.stop.prevent="chooseKey(key,$event.ctrlKey||$event.metaKey)"/>
      </g>
      <g v-for="series in plotted" :key="series.id">
       <path :d="graphPath(series.track,series.component)" :data-testid="'timeline-curve-'+series.track.id+'-'+series.component" :stroke="series.color" :stroke-dasharray="series.dark?'4 2':undefined" :aria-label="channelLabel(series.track.channel)+' '+axisLabel(series.track,series.component)" fill="none" stroke-width="1.25"/>
       <g v-for="segment in selectedSegments(series.track,series.component)" :key="'handles-'+segment.key.id" class="at-curve-handles" :style="{color:series.color}">
        <line :x1="segment.key.frame*pixelsPerFrame" :y1="graphY(segment.key.values[series.component]!)" :x2="segment.controls[0]*pixelsPerFrame" :y2="graphY(segment.controls[1])"/>
        <line :x1="segment.next.frame*pixelsPerFrame" :y1="graphY(segment.next.values[series.component]!)" :x2="segment.controls[2]*pixelsPerFrame" :y2="graphY(segment.controls[3])"/>
        <circle v-for="control in ([0,1] as const)" :key="control" :cx="segment.controls[control*2]!*pixelsPerFrame" :cy="graphY(segment.controls[control*2+1]!)" r="4" :aria-label="channelLabel(series.track.channel)+' '+axisLabel(series.track,series.component)+' '+label('handle','Handle')+' '+(control+1)" :data-testid="`timeline-bezier-${segment.key.id}-${series.component}-${control}`" @pointerdown.stop="dragHandle($event,segment.key,segment.next,series.component,control,segment.controls)"/>
       </g>
       <rect v-for="key in series.track.keys" :key="key.id" :data-timeline-key-id="key.id" :data-testid="`timeline-graph-key-${key.id}-${series.component}`" :aria-pressed="selected.has(key.id)" :x="displayedFrame(key)*pixelsPerFrame-3" :y="graphY(key.values[series.component]!)-3" width="6" height="6" :fill="selected.has(key.id)?series.color:'#252728'" :stroke="series.color" tabindex="0" role="button" :aria-label="axisLabel(series.track,series.component)+' '+label('frame','Frame')+' '+key.frame+' '+key.values[series.component]" @pointerdown.stop="dragKey($event,key)" @keydown.enter.stop.prevent="chooseKey(key,$event.ctrlKey||$event.metaKey)"/>
      </g>
     </svg>
    </div>
    <div v-if="marquee" class="at-marquee" :style="marqueeStyle" data-testid="timeline-marquee" aria-hidden="true"/>
    <span v-if="active" class="at-playhead-line" :style="{left:`calc(var(--at-gutter) + ${currentFrame*pixelsPerFrame}px)`}"/>
   </div>
   <div v-if="!active" class="at-empty">{{ label('createHint','Create an animation to start setting keys.') }}</div>
  </div>
   <div v-if="view==='graph'" class="at-graph-axis"><span v-for="value in graphTicks" :key="value" :style="{top:graphY(value)+'px'}">{{ Number(value.toPrecision(4)) }}</span></div>
  <div v-if="singleKey?.track.channel==='deform'&&singleKey.key.interpolation==='bezier'" class="at-progress-controls" data-testid="timeline-deform-controls">
   <span>{{label('deformProgress','Deform progress')}}</span><label v-for="(name,index) in ['Frame 1','Progress 1','Frame 2','Progress 2']" :key="index">{{name}}<input v-model="progressDraft[index]" type="number" step="any" :disabled="!editable" :aria-label="'Deform '+name" :aria-invalid="progressError" :data-testid="'timeline-deform-control-'+index" @change="commitProgress" @keydown.enter.stop.prevent="commitProgress" @keydown.esc.stop.prevent="resetProgress"/></label>
  </div>
  <SequenceKeyEditor v-if="selectedSequenceSettings&&singleKey?.track.channel==='sequence'&&singleKey.key.sequencePayload" class="at-event-key-inspector" :value="singleKey.key.sequencePayload" :settings="selectedSequenceSettings" :context-key="`${activeAnimationId}:${singleKey.key.id}`" :disabled="!editable" test-id="timeline-sequence" @pause="emit('pause')" @commit="commitSequenceKey" @draft-validity="value=>sequenceError=value"/>
  <EventInspector v-if="selectedEvent&&selectedEventKey" class="at-event-key-inspector" compact :definition="selectedEvent" :selected-key="selectedEventKey" animate :busy="disabled" :context-key="`${activeAnimationId}:${currentFrame}`" @key-patch="value=>emit('updateEventKey',value)" @manual-key="id=>emit('insertEventKey',id)" @draft-validity="value=>eventError=value"/>
  <footer class="at-footer" :class="{'flex-wrap':singleKey&&twoColorTrack(singleKey.track)}"><span>−</span><input v-model.number="pixelsPerFrame" type="range" min="2" max="40" step=".2" :aria-label="label('zoom','Timeline zoom')" data-testid="timeline-zoom"/><span>＋</span><label class="at-fps"><input v-model="fpsDraft" type="number" min="1" max="240" step="any" :disabled="!editable" :aria-label="label('fps','Animation FPS')" :aria-invalid="fpsError" data-testid="timeline-fps" @change="commitFps" @keydown.enter.prevent="commitFps" @keydown.esc.prevent="resetFps"/> fps</label><div v-if="singleKey" class="at-key-inspector" :class="{'flex-1 flex-wrap !gap-1':twoColorTrack(singleKey.track)}" data-testid="timeline-key-inspector"><span>{{ label('key','Key') }} {{ singleKey.key.frame }}</span><template v-if="singleKey.track.channel==='drawOrder'"><span>{{keyLabel(singleKey.track,singleKey.key)}}</span><button :disabled="!editable||singleKey.key.order===null" data-testid="timeline-draw-order-reset" @click="emit('updateDrawOrderKey',{id:singleKey.key.id,order:null})">{{label('setupOrder','Setup order')}}</button></template><span v-else-if="singleKey.track.channel==='sequence'">{{keyLabel(singleKey.track,singleKey.key)}}</span><span v-else-if="singleKey.track.channel==='event'">{{selectedEvent?.name}}</span><span v-else-if="singleKey.track.channel==='physicsReset'">{{label('reset','Reset')}}</span><span v-else-if="singleKey.track.channel==='deform'">{{label('deform','Deform')}} · {{label('progress','Progress')}}</span><label v-else-if="singleKey.track.channel==='attachment'">{{ channelLabel('attachment') }}<select :value="singleKey.key.attachment??''" :disabled="!editable" data-testid="timeline-key-attachment" @change="changeAttachment(($event.target as HTMLSelectElement).value)"><option value="">{{ label('none','None') }}</option><option v-for="attachment in selectedSlot?.attachments??[]" :key="attachment.id" :value="attachment.id">{{attachment.name}}</option></select></label><template v-else><label v-for="(_,index) in singleKey.key.values" :key="index">{{ axisLabel(singleKey.track,index) }}<input v-model="keyDraft[index]" type="number" step="any" :disabled="!editable" :aria-label="label('keyValue','Key value')+' '+axisLabel(singleKey.track,index)" :aria-invalid="valueError" :data-testid="'timeline-key-value-'+index" @change="commitValues" @keydown.enter.prevent="commitValues" @keydown.esc.prevent="resetValues"/></label></template><template v-if="singleKey.track.channel==='ik'"><label v-for="key in (['stretch','compress','bendPositive']as const)" :key="key"><input type="checkbox" :checked="singleKey.key.ikFlags?.[key]" :disabled="!editable" :data-testid="'timeline-ik-'+key" @change="changeIkFlag(key,$event)"/>{{label(key,key)}}</label></template></div><span v-if="showPreviewRangeHint" class="at-duration" :class="{'!text-warning':previewBudgetWarning}" :role="previewBudgetWarning?'status':undefined" :title="t('animation_previewRangePolicy')" data-testid="timeline-preview-range-hint"><span>{{t('animation_storedDuration')}} {{frameText(storedDuration)}}</span> · <span v-if="previewBudgetWarning">{{t('animation_previewRangeBudget')}}</span><span v-else>{{t('animation_previewEnd')}} {{frameText(effectivePreviewEnd)}}</span></span><span v-else class="at-duration">{{ label('end','End') }} {{ durationFrames }}</span></footer>
 </section>
</template>
