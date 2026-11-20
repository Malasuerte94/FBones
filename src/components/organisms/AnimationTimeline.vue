<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,reactive,ref,shallowReactive,shallowRef,useId,watch,type ObjectDirective} from 'vue';
import {useI18n} from 'vue-i18n';
import {timelineChannels,timelineBoneChannels,isTimelineBoneChannel,isTimelinePathChannel,timelineChannelColor,timelineFrameAt,timelineMoveDelta,timelineCurvePath,timelineBezierSegments,timelineBezierDragPoint,timelineBoxSelection,timelineProgressPath,type TimelineDeformTrack,type TimelineDrawOrderKey,type TimelineSelectionPoint,type TimelineAnimation,type TimelineBone,type TimelineChannel,type TimelineInterpolation,type TimelineKey,type TimelineTrack,type TimelineBezierControls,type TimelineSlot,type TimelineSlotTrack,type TimelineProperty,type TimelinePathChannel,type TimelineConstraint,type TimelineConstraintTrack,type TimelineConstraintKeyChange,type TimelineEvent,type TimelineEventTrack,type TimelineEventPayload,type TimelineIkFlags} from '../../domain/animationTimeline';
import '../../animationTimeline.css';
import AppIcon from '../atoms/AppIcon.vue';
import EventInspector from './EventInspector.vue';
import GraphVisibilityButton from '../molecules/GraphVisibilityButton.vue';
import GraphLeadInButton from '../molecules/GraphLeadInButton.vue';
import TimelineRowControls from '../molecules/TimelineRowControls.vue';
import TimelineRowFilters from '../molecules/TimelineRowFilters.vue';
import TimelineNavigationSettings from '../molecules/TimelineNavigationSettings.vue';
import TimelinePaneActions from '../molecules/TimelinePaneActions.vue';
import AnimationToolShelf from '../molecules/AnimationToolShelf.vue';
import GraphCurveControls from '../molecules/GraphCurveControls.vue';
import SequenceKeyEditor from '../molecules/SequenceKeyEditor.vue';
import type {KeyShownRequest,KeyShownTarget,TimelinePhysicsProperty,TimelineSequenceTrack} from '../../domain/animationTimeline';
import type {SequenceWorkingPose} from '../../domain/animationSequence';
import {linkedTimelineSourceId} from '../../domain/project';
import {MAX_ANIMATION_PREVIEW_FRAME,validAnimationLoopRange} from '../../domain/animationPlayback';
import {animationChannelDimensions,animationChannelFamily,sameAnimationFrame,type AnimationView} from '../../domain/animation';
import {MAX_ADJUST_KEYS,type TimelineAdjustState,type TimelineAdjustTarget} from '../../domain/timelineAdjust';
import {defaultTimelineNavigation,type TimelineNavigation,type TimelineNavigationOptions,type TimelineView} from '../../domain/timelineNavigation';
import {graphTrackIdsForDopesheetSelection,hasTimelineGraphCurves,syncedTimelineRows,type TimelineSyncMode} from '../../domain/dopesheetSync';
import {clampTimelineScrollLeft,timelineContentFrame,timelineFramePixel,timelineScrollAtAnchor} from '../../domain/timelineCamera';
import {normalizeTimelineBoneTrack,projectTimelineBoneTracks,projectTimelineConstraintTracks,projectTimelineDeformTracks,projectTimelineSlotTracks,timelineShiftKeyIds} from '../../domain/animationTimeline';
import type {AnimationOffsetRange,EditorTool,RigEdit} from '../../domain/project';
import {graphViewBounds,graphViewFit,graphViewPointBounds,type GraphViewSeries} from '../../domain/graphView';
import {selectedCurveSegments,type CurveSegmentSelection} from '../../domain/curveSegment';
import type {GraphBezierGroupChange,GraphBezierGroupRequest,TimelineBezierSegment} from '../../domain/animationTimeline';
import {graphBoneValueProjection,graphDisplayValue,graphRawValueAfterDelta} from '../../domain/graphValueProjection';
import {graphKeyHolds,graphRepeatOffsets} from '../../domain/graphRepeat';
import {canFavorGraphKeys,graphFavorChanges,graphPresetChanges,groupedGraphBezierChanges,type GraphBezierDragHandle,type GraphFavorMode,type GraphKeyTrack,type GraphPreset} from '../../domain/graphCurveTools';
import {rangeText} from '../../domain/transformRangeFields';

type GraphEdit=Extract<RigEdit,{type:'storeAnimationKeys'|'clearStoredAnimationKeys'|'swapStoredAnimationKeys'}>;
type ScaleKeys=Omit<Extract<RigEdit,{type:'scaleAnimationKeys'}>,'type'>;
const props=withDefaults(defineProps<{
 animations:TimelineAnimation[];activeAnimationId:number|null;documentKey?:string;projectRevision?:number;bones:TimelineBone[];selectedBoneIds:number[];tracks:TimelineTrack[];
 storedAnimation?:AnimationView;transformTool?:EditorTool;keyShownShortcut?:'Control+Shift+L'|'Meta+Shift+L';
 navigation?:TimelineNavigation;
 stacked?:boolean;
 adjustViewportAvailable?:boolean;adjustWorkingPose?:boolean;adjustDragging?:boolean;
 currentFrame:number;durationFrames:number;fps:number;playing:boolean;loop:boolean;autoKey:boolean;disabled?:boolean;suspended?:boolean;canPaste?:boolean;
 storedDurationFrames?:number;previewEndFrames?:number;automaticPreviewEndFrames?:number;previewBudgetExceeded?:boolean;
 loopStart?:number|null;loopEnd?:number|null;
 supportedChannels?:TimelineChannel[];supportedInterpolations?:TimelineInterpolation[];
 sequenceTracks?:TimelineSequenceTrack[];
 constraints?:TimelineConstraint[];constraintTracks?:TimelineConstraintTrack[];selectedConstraintIds?:number[];events?:TimelineEvent[];eventTracks?:TimelineEventTrack[];
 slots?:TimelineSlot[];slotTracks?:TimelineSlotTrack[];selectedSlotIds?:number[];drawOrderKeys?:TimelineDrawOrderKey[];deformTracks?:TimelineDeformTrack[];
}>(),{disabled:false,loopStart:null,loopEnd:null,sequenceTracks:()=>[],supportedChannels:()=>['translate'],supportedInterpolations:()=>['linear','stepped'],slots:()=>[],slotTracks:()=>[],selectedSlotIds:()=>[],drawOrderKeys:()=>[],deformTracks:()=>[],constraints:()=>[],constraintTracks:()=>[],selectedConstraintIds:()=>[],events:()=>[],eventTracks:()=>[]});
const emit=defineEmits<{
 selectAnimation:[id:number];createAnimation:[name:string];renameAnimation:[value:{id:number;name:string}];deleteAnimation:[id:number];duplicateAnimation:[id:number];copyKeys:[ids:number[]];pasteKeys:[];
 graphEdit:[edit:GraphEdit];
 curveEdit:[edit:Extract<RigEdit,{type:'setAnimationKeys'}>,expectedRevision:number];
 keyShown:[request:KeyShownRequest];
 adjustState:[state:TimelineAdjustState];
 updateNavigation:[view:TimelineView,key:keyof TimelineNavigationOptions,value:boolean];
 'update:stacked':[enabled:boolean];
 seek:[frame:number];play:[];pause:[];toggleLoop:[];toggleAutoKey:[];selectBone:[id:number,additive:boolean];selectShownBones:[ids:number[]];insertKeys:[channel:TimelineChannel];
 moveKeys:[value:{ids:number[];deltaFrames:number;shift?:boolean},expectedRevision?:number];deleteKeys:[ids:number[]];setInterpolation:[value:{ids:number[];interpolation:TimelineInterpolation}];
 scaleKeys:[value:ScaleKeys,expectedRevision?:number];
 offsetKeys:[value:{animation:number;key:number;deltaFrames:number;loopRange?:AnimationOffsetRange},expectedRevision?:number];resetOffset:[];
 updateKey:[value:{id:number;values:number[]}];loopRange:[value:{start:number|null;end:number|null}];
 draftValidity:[invalid:boolean];selectConstraint:[id:number];insertConstraintKeys:[value:{constraintId:number;kind:Exclude<TimelineConstraintTrack['kind'],TimelinePathChannel>;property?:string}];updateConstraintKey:[value:TimelineConstraintKeyChange];
 selectEvent:[id:number];insertEventKey:[eventId:number];updateEventKey:[value:{id:number}&TimelineEventPayload];
 updateBezier:[value:{id:number;component:number;control:0|1;frame:number;value:number},expectedRevision?:number];
 updateBezierGroup:[request:GraphBezierGroupRequest];
 setFps:[value:number];
 selectAttachment:[id:number,additive:boolean];insertDrawOrderKey:[];updateDrawOrderKey:[value:{id:number;order:number[]|null}];insertDeformKey:[value:{attachmentId:number}];updateDeformCurve:[value:{id:number;curve:TimelineInterpolation;controls?:TimelineBezierControls}];
 selectSequenceAttachment:[id:number];insertSequenceKey:[attachment:number];updateSequenceKey:[value:{id:number}&SequenceWorkingPose];
 selectSlot:[id:number,additive:boolean];insertSlotKeys:[value:{slotId:number;channel:'attachment'|'rgba'}];updateSlotKey:[value:{id:number;attachment?:number|null;values?:number[]}];
}>();
const {t,te,locale}=useI18n();
function label(key:string,fallback:string){const name='animation_'+key;return te(name)?t(name):fallback;}
const channelLabel=(channel:TimelineProperty)=>isTimelinePathChannel(channel)
 ?t({pathPosition:'pathConstraintPosition',pathSpacing:'pathConstraintSpacing',pathMix:'pathConstraintMix'}[channel])
 :label(channel,{rotate:'Rotate',translate:'Translate',translateX:'Translate X',translateY:'Translate Y',scale:'Scale',scaleX:'Scale X',scaleY:'Scale Y',shear:'Shear',attachment:'Attachment',rgba:'Color',drawOrder:'Draw Order',deform:'Deform',ik:'IK',transformMix:'Transform Mix',physics:'Physics',physicsReset:'Physics Reset',event:'Event',sequence:'Sequence'}[channel]);
const view=ref<TimelineView>('dopesheet');
const stackOrder:TimelineView[]=['graph','dopesheet'];
const panes=computed<TimelineView[]>(()=>props.stacked?stackOrder:[view.value]);
const graphMounted=computed(()=>props.stacked||view.value==='graph');
const panePlots=shallowReactive<Record<TimelineView,HTMLElement|null>>({graph:null,dopesheet:null});
const paneRulers=shallowReactive<Record<TimelineView,HTMLElement|null>>({graph:null,dopesheet:null});
const paneScroll=reactive({graph:0,dopesheet:0});
const paneTop=reactive({graph:0,dopesheet:0});
const scroller=computed(()=>panePlots[view.value]),ruler=computed(()=>paneRulers[view.value]);
const scroll=computed(()=>paneScroll[view.value]);
const syncMode=ref<TimelineSyncMode>('off');
const sheetScopeDriven=computed(()=>syncMode.value==='graph-to-dopesheet');
const graphScopeDriven=computed(()=>syncMode.value==='dopesheet-to-graph');
const graphDrivesSheet=computed(()=>view.value==='dopesheet'&&sheetScopeDriven.value);
const sheetDrivesGraph=computed(()=>view.value==='graph'&&graphScopeDriven.value);
const linkedTime=computed(()=>!!props.stacked&&syncMode.value!=='off');
const dopesheetSourceKeys=shallowRef<ReadonlySet<number>>(new Set());
const timelineOptions=computed(()=>props.navigation??defaultTimelineNavigation);
const navigationOptions=computed(()=>timelineOptions.value[view.value]);
const toolbarShown=computed(()=>panes.value.some(pane=>timelineOptions.value[pane].showToolbar));
const linkedGutter=computed(()=>linkedTime.value&&panes.value.some(pane=>timelineOptions.value[pane].showRows));
const hasRowGutter=(pane:TimelineView)=>linkedGutter.value||timelineOptions.value[pane].showRows;
function updateTimelineOption(option:keyof TimelineNavigationOptions,enabled:boolean){
 if(option==='showRows'||option==='showToolbar')stopGesture?.();
 emit('updateNavigation',view.value,option,enabled);
}
const adjustEnabled=ref(false),adjustStatusId=useId();
const adjustDisabled:TimelineAdjustState={enabled:false,target:null};
const filterPanelId=useId(),filterOpen=ref(false);
const filterCategories=['rotate','translate','scale','shear','attachment','rgba','deform','sequence','ik','transformMix','physics','path','event','drawOrder'] as const;
type FilterCategory = typeof filterCategories[number];
type FilterMode = 'categories'|'current-tool';
type RowFilter = {mode:FilterMode;categories:ReadonlySet<FilterCategory>;enabled:boolean};
const defaultRowFilter:RowFilter={mode:'categories',categories:new Set(filterCategories),enabled:true};
const rowFilters=shallowRef({graph:defaultRowFilter,dopesheet:defaultRowFilter});
const rowFilter=computed(()=>rowFilters.value[view.value]);
const currentTransform=computed(()=>{
 const tool=props.transformTool;
 return tool==='rotate'||tool==='translate'||tool==='scale'||tool==='shear'?tool:null;
});
function filterConfigured(filter:RowFilter){
 return filter.mode==='current-tool'?currentTransform.value!==null:filter.categories.size!==filterCategories.length;
}
const filterActive=computed(()=>rowFilter.value.enabled&&filterConfigured(rowFilter.value));
function matchesRowFilter(channel:TimelineProperty,filter=rowFilter.value){
 if(!filter.enabled||!filterConfigured(filter))return true;
 const category=isTimelineBoneChannel(channel)?animationChannelFamily(channel):channel==='physicsReset'?'physics':isTimelinePathChannel(channel)?'path':channel;
 return filter.mode==='current-tool'?category===currentTransform.value:filter.categories.has(category);
}
const filterOptions=computed(()=>filterCategories.map(id=>({id,label:id==='path'?t('constraint_path'):channelLabel(id),checked:rowFilter.value.categories.has(id)})));
function updateRowFilter(filter:RowFilter){
 stopGesture?.();
 rowFilters.value={...rowFilters.value,[view.value]:filter};
}
function selectFilterCategory(id:string,additive:boolean){
 const category=filterCategories.find(value=>value===id);
 if(!category)return;
 const categories=new Set<FilterCategory>(additive?rowFilter.value.categories:[]);
 if(additive&&categories.has(category))categories.delete(category);else categories.add(category);
 if(!categories.size)for(const value of filterCategories)categories.add(value);
 updateRowFilter({mode:'categories',categories,enabled:true});
}
function setFilterMode(mode:FilterMode){
 if(mode==='current-tool'&&currentTransform.value===null)return;
 updateRowFilter({...rowFilter.value,mode,enabled:true});
}
function toggleFiltering(){
 if(filterConfigured(rowFilter.value))updateRowFilter({...rowFilter.value,enabled:!rowFilter.value.enabled});
}
function closeRowFilters(){
 if(!filterOpen.value)return;
 filterOpen.value=false;
 commandBar.value?.querySelector<HTMLButtonElement>('[data-testid="timeline-row-filter"]')?.focus();
}
function setSyncMode(mode:TimelineSyncMode){
 if(view.value!=='dopesheet'||!editable.value||mode===syncMode.value)return;
 stopGesture?.();
 filterOpen.value=false;
 selectAllRow=null;
 selectionBoxes.value=[];
 syncMode.value=mode;
 dopesheetSourceKeys.value=mode==='dopesheet-to-graph'?new Set(selected.value):new Set();
}
const sheetZoom=ref(9.4),graphZoom=ref<number|null>(null);
const sharedZoom=ref(9.4);
const graphLeadIn=ref(false);
const graphLeadingPixels=computed(()=>graphLeadIn.value?144:24);
const savedScroll={dopesheet:0,graph:0};
const leadingFor=(pane:TimelineView)=>pane==='graph'||linkedTime.value?graphLeadingPixels.value:0;
const independentZoom=(pane:TimelineView)=>pane==='graph'?(graphZoom.value??sheetZoom.value):sheetZoom.value;
const zoomFor=(pane:TimelineView)=>linkedTime.value?sharedZoom.value:independentZoom(pane);
const leadingPixels=computed(()=>leadingFor(view.value));
const hiddenGraphTracks=shallowRef<ReadonlySet<string>>(new Set());
function setZoom(pane:TimelineView,zoom:number){
 if(linkedTime.value)sharedZoom.value=zoom;
 else if(pane==='graph')graphZoom.value=zoom;
 else sheetZoom.value=zoom;
}
const pixelsPerFrame=computed({
 get:()=>zoomFor(view.value),set:(value:number)=>setZoom(view.value,value),
});
function frameX(frame:number,pane=view.value){return timelineFramePixel(frame,leadingFor(pane),zoomFor(pane));}
const graphX=(frame:number)=>frameX(frame,'graph');
function laidOutPlot(pane:TimelineView){
 const element=panePlots[pane];
 return element&&element.clientWidth>0&&element.clientHeight>0?element:null;
}
function horizontalScroll(pane:TimelineView,left:number){
 if(props.suspended)return;
 const targets=(linkedTime.value?panes.value:[pane]).flatMap(mode=>{
  const element=laidOutPlot(mode);
  return element?[{mode,element}]:[];
 });
 const offset=clampTimelineScrollLeft(left,targets.map(({element})=>element));
 for(const {mode,element} of targets){
  if(element.scrollLeft!==offset)element.scrollLeft=offset;
  paneScroll[mode]=element.scrollLeft;
  if(!linkedTime.value)savedScroll[mode]=element.scrollLeft;
 }
}
watch(linkedTime,async linked=>{
 stopGesture?.();
 const source=view.value;
 if(linked){
  sharedZoom.value=independentZoom(source);
  const before={leadingPixels:source==='graph'?graphLeadingPixels.value:0,pixelsPerFrame:sharedZoom.value};
  const next={leadingPixels:graphLeadingPixels.value,pixelsPerFrame:sharedZoom.value};
  const left=savedScroll[source];
  await nextTick();
  if(linkedTime.value)horizontalScroll(source,left>0?timelineScrollAtAnchor(left,0,before,next):0);
 }else{
  await nextTick();
  if(!linkedTime.value)for(const pane of panes.value)horizontalScroll(pane,savedScroll[pane]);
 }
},{flush:'sync'});
async function toggleGraphLeadIn(){
 if(!graphMounted.value)return;
 stopGesture?.();
 const previousLeft=panePlots.graph?.scrollLeft??0,previousOrigin=graphLeadingPixels.value;
 graphLeadIn.value=!graphLeadIn.value;
 await nextTick();
 if(graphMounted.value)horizontalScroll('graph',previousLeft>0?previousLeft+graphLeadingPixels.value-previousOrigin:0);
}
function captureDopesheetSource(){
 if(view.value==='dopesheet'&&graphScopeDriven.value)dopesheetSourceKeys.value=new Set(selected.value);
}
async function selectView(next:TimelineView){
 if(view.value===next)return;
 stopGesture?.();
 adjustEnabled.value=false;
 filterOpen.value=false;
 if(!props.stacked&&next==='graph'&&graphScopeDriven.value)captureDopesheetSource();
 if(!props.stacked&&next==='graph'&&syncMode.value==='off'&&hiddenGraphTracks.value.size&&selected.value.size){
  // Explicitly choosing a key in Dopesheet should reveal its curve in Graph.
  const hidden=new Set(hiddenGraphTracks.value);
  for(const {track} of selectedKeys.value)if(matchesRowFilter(track.channel,rowFilters.value.graph))hidden.delete(graphTrackId(track));
  if(hidden.size!==hiddenGraphTracks.value.size)hiddenGraphTracks.value=hidden;
 }
 if(!linkedTime.value)savedScroll[view.value]=scroller.value?.scrollLeft??0;
 view.value=next;
 if(props.stacked)return;
 await nextTick();
 if(view.value!==next||props.stacked)return;
 if(next==='graph'&&autoGraphFrame.value)return;
 horizontalScroll(next,savedScroll[next]);
}
watch(()=>props.stacked,async enabled=>{
 stopGesture?.();
 filterOpen.value=false;
 selectionBoxes.value=[];
 if(enabled)captureDopesheetSource();
 await nextTick();
 if(props.stacked===enabled&&!linkedTime.value)for(const pane of panes.value)horizontalScroll(pane,savedScroll[pane]);
});
function focusPane(pane:TimelineView,event:Event){
 if(props.suspended||pane===view.value||!props.stacked)return;
 if(gestureActive.value){event.stopPropagation();return;}
 void selectView(pane);
}
const paneFocusEvents=['pointerdown','focusin'];
const paneFocusListeners:Record<TimelineView,EventListener>={
 graph:event=>focusPane('graph',event),
 dopesheet:event=>focusPane('dopesheet',event),
};
// A Vue capture listener can stamp the event before a newly mounted
// control receives it. Native capture leaves the control's listener intact.
const vPaneFocus:ObjectDirective<HTMLElement,TimelineView>={
 mounted(element,{value:pane}){
  for(const event of paneFocusEvents)element.addEventListener(event,paneFocusListeners[pane],true);
 },
 beforeUnmount(element,{value:pane}){
  for(const event of paneFocusEvents)element.removeEventListener(event,paneFocusListeners[pane],true);
 },
};
function guardPaneWheel(event:WheelEvent){
 if(linkedTime.value&&gestureActive.value)event.preventDefault();
}
const nameInput=ref<HTMLInputElement|null>(null);
const selected=ref(new Set<number>()),collapsed=ref(new Set<number>());
const handleSelection=shallowRef<{ids:ReadonlySet<string>;context:ReadonlySet<number>}|null>(null);
const syncedSheetCollapsed=ref(new Set<number>());
const collapsedFor=(pane:TimelineView)=>pane==='dopesheet'&&(props.stacked||sheetScopeDriven.value)?syncedSheetCollapsed.value:collapsed.value;
const collapsedHere=computed(()=>collapsedFor(view.value));
let selectAllRow:string|null=null;
const drag=ref<{moving:ReadonlySet<number>;delta:number}|null>(null);
const timingTool=ref<'move'|'shift'|'offset'>('move');
const shiftKeys=computed(()=>timingTool.value==='shift');
const offsetKeys=computed(()=>timingTool.value==='offset');
const offsetDrag=ref<{delta:number}|null>(null);
type SelectionBox={id:number;left:number;right:number;top:number;bottom:number;keys:number[];canScale:boolean};
type BoxEdge='left'|'right';
const selectionBoxes=shallowRef<SelectionBox[]>([]);
let nextSelectionBox=0;
const scaleDrag=shallowRef<{boxId:number;edge:BoxEdge;toEdgeFrame:number;frames:ReadonlyMap<number,number>}|null>(null);
const timingDragging=computed(()=>!!drag.value||!!offsetDrag.value||!!scaleDrag.value);
type ProgressSegment={track:DisplayTrack;key:TimelineKey;next:TimelineKey};
const marquee=ref<{kind:'keys'|'handles';start:TimelineSelectionPoint;end:TimelineSelectionPoint;progress?:ProgressSegment}|null>(null);
const marqueeStyle=computed(()=>marquee.value?{left:Math.min(marquee.value.start.x,marquee.value.end.x)+'px',top:Math.min(marquee.value.start.y,marquee.value.end.y)+'px',width:Math.abs(marquee.value.end.x-marquee.value.start.x)+'px',height:Math.abs(marquee.value.end.y-marquee.value.start.y)+'px'}:{});
const progressDrag=ref<{id:number;control:0|1;frame:number;value:number}|null>(null),progressDraft=ref<Array<string|number>>([]),progressError=ref(false),submittedProgress=ref('');
type BezierPointEdit=Omit<GraphBezierGroupChange,'nextId'>;
type BezierDragPreview={kind:'single';change:BezierPointEdit}|
 {kind:'group';byKey:ReadonlyMap<number,readonly GraphBezierGroupChange[]>};
const bezierDrag=shallowRef<BezierDragPreview|null>(null);
const loopStartDraft=ref<string|number>(''),loopEndDraft=ref<string|number>(''),currentDraft=ref<string|number>(String(props.currentFrame));
const fpsDraft=ref<string|number>(String(props.fps)),fpsError=ref(false),submittedFps=ref<number|null>(null);
const nameEditor=ref<'create'|'rename'|null>(null),nameDraft=ref('');
const active=computed(()=>props.animations.find(a=>a.id===props.activeAnimationId));
const storedDuration=computed(()=>props.storedDurationFrames??props.durationFrames);
const effectivePreviewEnd=computed(()=>props.loopEnd??props.previewEndFrames??props.durationFrames);
const previewBudgetWarning=computed(()=>props.loopEnd===null&&!!props.previewBudgetExceeded);
const showPreviewRangeHint=computed(()=>!!active.value&&(previewBudgetWarning.value||effectivePreviewEnd.value!==storedDuration.value));
const frameText=(frame:number)=>String(Number(frame.toPrecision(7)));
const editable=computed(()=>!!active.value&&!props.disabled&&!props.suspended);
const constraintOnly=computed(()=>props.selectedConstraintIds.length>0),slotOnly=computed(()=>props.selectedSlotIds.length>0&&!constraintOnly.value);
type RowScope = {boneIds:ReadonlySet<number>;slotIds:ReadonlySet<number>;constraintIds:ReadonlySet<number>};
const liveRowScope=computed<RowScope>(()=>{
 const constraintIds=new Set(props.selectedConstraintIds),slotIds=new Set(props.selectedSlotIds);
 const boneIds=new Set([
  ...(slotOnly.value||constraintOnly.value?[]:props.selectedBoneIds),
  ...props.slots.filter(slot=>slotIds.has(slot.id)).map(slot=>slot.boneId),
  ...props.constraints.filter(constraint=>constraintIds.has(constraint.id)).map(constraint=>constraint.boneId),
 ]);
 return {boneIds:boneIds.size?boneIds:new Set(props.bones.map(bone=>bone.id)),slotIds,constraintIds};
});
const lockedRowScope=shallowRef<RowScope|null>(null);
const locked=computed(()=>lockedRowScope.value!==null);
const rowScope=computed(()=>lockedRowScope.value??liveRowScope.value);
const rowConstraintOnly=computed(()=>rowScope.value.constraintIds.size>0);
const rowSlotOnly=computed(()=>rowScope.value.slotIds.size>0&&!rowConstraintOnly.value);
const shownBones=computed(()=>props.bones.filter(bone=>rowScope.value.boneIds.has(bone.id)));
function toggleLock(){
 if(!editable.value)return;
 stopGesture?.();
 lockedRowScope.value=locked.value?null:liveRowScope.value;
}
function refreshRows(){
 if(!editable.value||!locked.value)return;
 stopGesture?.();
 lockedRowScope.value=liveRowScope.value;
}
const constraintDisplayTracks=computed<TimelineConstraintTrack[]>(()=>{const tracks=[...props.constraintTracks];for(const constraint of props.constraints.filter(c=>rowScope.value.constraintIds.has(c.id))){if(constraint.type==='ik'&&!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='ik'))tracks.push({id:`constraint-${constraint.id}-ik`,constraintId:constraint.id,kind:'ik',keys:[]});else if(constraint.type==='transform'&&!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='transformMix'))tracks.push({id:`constraint-${constraint.id}-transformMix`,constraintId:constraint.id,kind:'transformMix',keys:[]});else if(constraint.type==='physics'){for(const property of ['inertia','strength','damping','mass','wind','gravity','mix']as const)if(!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='physics'&&t.property===property))tracks.push({id:`constraint-${constraint.id}-physics-${property}`,constraintId:constraint.id,kind:'physics',property,keys:[]});if(!tracks.some(t=>t.constraintId===constraint.id&&t.kind==='physicsReset'))tracks.push({id:`constraint-${constraint.id}-physicsReset`,constraintId:constraint.id,kind:'physicsReset',keys:[]});}}return tracks;});
const eventDisplayTracks=computed<TimelineEventTrack[]>(()=>props.events.map(event=>props.eventTracks.find(track=>track.eventId===event.id)??{id:`event-${event.id}`,eventId:event.id,keys:[]}));
const sequenceDisplayTracks=computed(()=>{const tracks=[...props.sequenceTracks];for(const slot of props.slots.filter(s=>rowScope.value.slotIds.has(s.id)))for(const attachment of slot.attachments)if(attachment.sequence&&linkedTimelineSourceId(attachment)===undefined&&!tracks.some(t=>t.attachmentId===attachment.id))tracks.push({id:`sequence:${attachment.id}`,attachmentId:attachment.id,slotId:slot.id,keys:[]});return tracks;});
type DisplayTrack=Omit<TimelineTrack,'channel'>&{channel:TimelineProperty;slotId?:number;twoColor?:boolean;attachmentId?:number;constraintId?:number;constraintKind?:TimelineConstraintTrack['kind'];physicsProperty?:TimelinePhysicsProperty;eventId?:number};
function displayConstraintTrack(track:TimelineConstraintTrack):DisplayTrack{
 const base={id:track.id,boneId:props.constraints.find(c=>c.id===track.constraintId)?.boneId??-1,constraintId:track.constraintId,constraintKind:track.kind,channel:track.kind};
 if(track.kind==='ik')return {...base,keys:track.keys.map(key=>({...key,values:[key.mix,key.softness],ikFlags:{stretch:key.stretch,compress:key.compress,bendPositive:key.bendPositive}}))};
 if(track.kind==='physics')return {...base,physicsProperty:track.property,keys:track.keys.map(key=>({...key,values:[key.value],controls:key.controls?[key.controls]:null}))};
 if(track.kind==='physicsReset')return {...base,keys:track.keys.map(key=>({...key,values:[],interpolation:'stepped'}))};
 return {...base,keys:track.keys};
}
function displaySlotTrack(track:TimelineSlotTrack):DisplayTrack{
 const slot=props.slots.find(slot=>slot.id===track.slotId);
 const base={id:track.id,boneId:slot?.boneId??-1,slotId:track.slotId,twoColor:!!slot?.tintBlack,channel:track.channel};
 return {...base,keys:track.channel==='attachment'?track.keys.map(key=>({...key,values:[],interpolation:'stepped'})):track.keys};
}
function displayDeformTrack(track:TimelineDeformTrack):DisplayTrack{
 return {id:track.id,boneId:props.slots.find(slot=>slot.id===track.slotId)?.boneId??-1,slotId:track.slotId,attachmentId:track.attachmentId,channel:'deform',
  keys:track.keys.map(key=>({id:key.id,frame:key.frame,values:[],interpolation:key.curve,progressControls:key.controls}))};
}
const storedForClip=computed(()=>props.storedAnimation?.id===props.activeAnimationId?props.storedAnimation:null);
const storedGraphTracks=computed<DisplayTrack[]>(()=>{
 const clip=storedForClip.value;
 return clip?[
  ...projectTimelineBoneTracks(clip),
  ...projectTimelineConstraintTracks(clip).map(displayConstraintTrack),
  ...projectTimelineSlotTracks(clip,props.slots).map(displaySlotTrack),
  ...projectTimelineDeformTracks(clip,props.slots).map(displayDeformTrack),
 ]:[];
});
const storedLastFrame=computed(()=>storedGraphTracks.value.reduce((end,track)=>track.keys.reduce((last,key)=>Math.max(last,key.frame+20),end),0));
const allTracks=computed<DisplayTrack[]>(()=>[
 ...props.tracks.map(normalizeTimelineBoneTrack),
 ...constraintDisplayTracks.value.map(displayConstraintTrack),
 ...eventDisplayTracks.value.map(track=>({id:track.id,boneId:-1,channel:'event'as const,eventId:track.eventId,keys:track.keys.map(key=>({...key,values:[],interpolation:'stepped'as const,eventPayload:{int:key.int,float:key.float,string:key.string,volume:key.volume,balance:key.balance}}))})),
 ...props.slotTracks.map(displaySlotTrack),
 ...sequenceDisplayTracks.value.map(track=>({id:track.id,boneId:props.slots.find(slot=>slot.id===track.slotId)?.boneId??-1,slotId:track.slotId,attachmentId:track.attachmentId,channel:'sequence'as const,keys:track.keys.map(key=>({id:key.id,frame:key.frame,values:[],interpolation:'stepped'as const,sequencePayload:{mode:key.mode,index:key.index,delay:key.delay}}))})),
 ...props.deformTracks.map(displayDeformTrack),
 {id:'global:drawOrder',boneId:-1,channel:'drawOrder',keys:props.drawOrderKeys.map(key=>({...key,values:[],interpolation:'stepped' as const}))},
]);
const allKeys=computed(()=>allTracks.value.flatMap(track=>track.keys.map(key=>({track,key}))));
const canShiftKeys=computed(()=>editable.value&&(shiftKeys.value||allKeys.value.length>0));
const canOffsetKeys=computed(()=>editable.value&&(offsetKeys.value||allKeys.value.length>0));
const selectedKeys=computed(()=>allKeys.value.filter(item=>selected.value.has(item.key.id)));
const singleKey=computed(()=>selectedKeys.value.length===1?selectedKeys.value[0]:undefined);
const hasSelectedPathKeys=computed(()=>selectedKeys.value.some(({track})=>isTimelinePathChannel(track.channel)));
const canCopySelection=computed(()=>editable.value&&selected.value.size>0&&!hasSelectedPathKeys.value);
const offsetLoopRange=computed(()=>{
 const {loopStart,loopEnd}=props;
 if(loopStart===null||loopEnd===null)return undefined;
 return {start:Math.fround(loopStart),end:Math.fround(loopEnd)};
});
const offsetProblem=computed(()=>{
 const range=offsetLoopRange.value;
 if(!range&&(props.loopStart!==null||props.loopEnd!==null))return 'animation_offsetRange';
 const picked=singleKey.value;
 if(!picked||!isTimelineBoneChannel(picked.track.channel))return 'animation_offsetSelection';
 const {track,key}=picked,duration=Math.fround(storedDuration.value);
 if(range&&(!Number.isFinite(range.start)||!Number.isFinite(range.end)||!Number.isFinite(duration)
   ||range.start<0||range.start>=range.end||range.end>duration))return 'animation_offsetRangeBounds';
 const start=range?.start??0,end=range?.end??duration;
 const keys=range?track.keys.filter(candidate=>{
  const frame=Math.fround(candidate.frame);
  return frame>=start&&frame<=end;
 }):track.keys;
 const first=keys[0],last=keys.at(-1);
 if(!first||!last||!Number.isFinite(duration)||duration<=0||!sameAnimationFrame(first.frame,start)||!sameAnimationFrame(last.frame,end)
   ||first.values.length!==last.values.length||first.values.some((value,index)=>!Object.is(Math.fround(value),Math.fround(last.values[index]!)))){
  return range?'animation_offsetOpenRange':'animation_offsetOpenLoop';
 }
 if(keys.some((key,index)=>index>0&&Math.fround(keys[index-1]!.frame)>=Math.fround(key.frame))){
  return 'animation_offsetDistinctFrames';
 }
 const frame=Math.fround(key.frame);
 if(range&&!(frame>start&&frame<end))return 'animation_offsetInterior';
 return null;
});
const offsetStatus=computed(()=>{
 if(offsetDrag.value){
  const delta=offsetDrag.value.delta;
  return t('animation_offsetDragging',{delta:(delta>0?'+':'')+frameText(delta)});
 }
 if(offsetProblem.value)return t(offsetProblem.value);
 const range=offsetLoopRange.value;
 return range?t('animation_offsetRangeReady',{start:frameText(range.start),end:frameText(range.end)}):t('animation_offsetReady');
});
const eventError=ref(false),sequenceError=ref(false);
const keyDraft=ref<Array<string|number>>([]),valueError=ref(false),submittedValue=ref('');
const invalidDraft=computed(()=>valueError.value||fpsError.value||progressError.value||eventError.value||sequenceError.value);
type Row={id:string;bone?:TimelineBone;track?:DisplayTrack;slot?:TimelineSlot;deform?:TimelineDeformTrack;sequence?:TimelineSequenceTrack;constraint?:TimelineConstraint;event?:TimelineEvent};
const scopedRows=computed<Row[]>(()=>{const result=shownBones.value.flatMap<Row>(bone=>{
 const result:Row[]=[{id:'bone-'+bone.id,bone}];
 if(!rowSlotOnly.value&&!rowConstraintOnly.value)for(const channel of timelineBoneChannels(props.tracks.filter(track=>track.boneId===bone.id).map(track=>track.channel))){
  const track=allTracks.value.find(track=>track.boneId===bone.id&&track.channel===channel);
  result.push({id:track?.id??`${bone.id}-${channel}`,bone,track:track??{id:`${bone.id}-${channel}`,boneId:bone.id,channel,keys:[]}});
 }
 for(const slot of props.slots.filter(slot=>slot.boneId===bone.id&&(!rowSlotOnly.value||rowScope.value.slotIds.has(slot.id)))){
  const tracks=allTracks.value.filter(track=>track.slotId===slot.id);
  if(rowScope.value.slotIds.has(slot.id)||tracks.some(track=>track.keys.length))for(const channel of ['attachment','rgba']as const){const track=tracks.find(track=>track.channel===channel);result.push({id:track?.id??`slot-${slot.id}-${channel}`,bone,slot,track:track??{id:`slot-${slot.id}-${channel}`,boneId:bone.id,slotId:slot.id,channel,keys:[]}});}
  for(const sequence of sequenceDisplayTracks.value.filter(t=>t.slotId===slot.id))result.push({id:sequence.id,bone,slot,sequence,track:allTracks.value.find(t=>t.id===sequence.id)});
 }
 for(const track of props.deformTracks.filter(track=>props.slots.some(slot=>slot.id===track.slotId&&slot.boneId===bone.id)&&(!rowSlotOnly.value||rowScope.value.slotIds.has(track.slotId))))result.push({id:track.id,bone,slot:props.slots.find(slot=>slot.id===track.slotId),deform:track,track:allTracks.value.find(t=>t.id===track.id)});
 for(const constraint of props.constraints.filter(c=>c.boneId===bone.id&&(!rowConstraintOnly.value||rowScope.value.constraintIds.has(c.id))))for(const track of allTracks.value.filter(t=>t.constraintId===constraint.id))result.push({id:track.id,bone,constraint,track});
 return result;
});for(const track of allTracks.value.filter(t=>t.channel==='event'))result.push({id:track.id,event:props.events.find(e=>e.id===track.eventId),track});if(active.value&&props.drawOrderKeys.length)result.push({id:'global:drawOrder',track:allTracks.value.find(t=>t.channel==='drawOrder')});return result;});
const manualGraphRows=computed(()=>scopedRows.value.filter(row=>!row.track||matchesRowFilter(row.track.channel,rowFilters.value.graph)));
const manualSheetRows=computed(()=>scopedRows.value.filter(row=>!row.track||matchesRowFilter(row.track.channel,rowFilters.value.dopesheet)));
const manualGraphLiveTracks=computed(()=>manualGraphRows.value.flatMap(({track,bone})=>track
 &&(!bone||!collapsed.value.has(bone.id))&&hasTimelineGraphCurves(track)&&graphTrackShown(track)?[track]:[]));
const drivenGraphRows=computed(()=>{
 const tracks=manualSheetRows.value.flatMap(row=>row.track?[row.track]:[]);
 return syncedTimelineRows(manualSheetRows.value,graphTrackIdsForDopesheetSelection(tracks,dopesheetSourceKeys.value));
});
const graphFilteredRows=computed(()=>graphScopeDriven.value?drivenGraphRows.value:manualGraphRows.value);
const sheetFilteredRows=computed(()=>sheetScopeDriven.value
 ?syncedTimelineRows(manualGraphRows.value,new Set(manualGraphLiveTracks.value.map(track=>track.id))):manualSheetRows.value);
const filteredFor=(pane:TimelineView)=>pane==='graph'?graphFilteredRows.value:sheetFilteredRows.value;
const visibleRows=(pane:TimelineView)=>pane==='graph'&&graphScopeDriven.value?filteredFor(pane)
 :filteredFor(pane).filter(row=>!row.track||!row.bone||!collapsedFor(pane).has(row.bone.id));
const graphRows=computed(()=>visibleRows('graph')),sheetRows=computed(()=>visibleRows('dopesheet'));
const paneRows=computed(()=>({graph:graphRows.value,dopesheet:sheetRows.value}));
const rows=computed(()=>view.value==='graph'?graphRows.value:sheetRows.value);
const filteredRows=computed(()=>filteredFor(view.value));
const filteredTracks=computed(()=>filteredRows.value.flatMap(row=>row.track?[row.track]:[]));
const visibleTracks=computed(()=>rows.value.flatMap(row=>row.track?[row.track]:[]));
const graphRowTracks=computed(()=>graphRows.value.flatMap(row=>row.track?[row.track]:[]));
const selectableShownBones=computed(()=>graphDrivesSheet.value||sheetDrivesGraph.value
 ? filteredRows.value.flatMap(row=>!row.track&&row.bone?[row.bone]:[])
 :shownBones.value);
const canSelectShown=computed(()=>editable.value&&selectableShownBones.value.length>0);
function selectShownBones(){
 if(canSelectShown.value)emit('selectShownBones',selectableShownBones.value.map(bone=>bone.id));
}
watch([filteredRows,view,syncMode,collapsedHere],()=>{
 selectAllRow=null;
 if(timingDragging.value||bezierDrag.value||progressDrag.value||marquee.value)stopGesture?.();
 if(!selected.value.size)return;
 const tracks=view.value==='graph'&&!sheetDrivesGraph.value?visibleTracks.value.filter(graphTrackShown):filteredTracks.value;
 const accessible=new Set(tracks.flatMap(track=>track.keys.map(key=>key.id)));
 const retained=new Set([...selected.value].filter(id=>accessible.has(id)));
 if(retained.size!==selected.value.size)selected.value=retained;
},{flush:'sync'});
const liveLastFrame=computed(()=>allKeys.value.reduce((end,item)=>Math.max(end,item.key.frame+20),Math.max(160,props.durationFrames+30)));
function cameraFor(pane:TimelineView){
 const lastFrame=pane==='graph'||linkedTime.value?Math.max(liveLastFrame.value,storedLastFrame.value):liveLastFrame.value;
 const zoom=zoomFor(pane),origin=leadingFor(pane);
 const preferred=zoom<2?Math.ceil(55/zoom):zoom<5?20:zoom>16?5:10;
 const majorStep=Math.max(preferred,Math.ceil(lastFrame/2000));
 const first=Math.ceil(-origin/zoom/majorStep);
 return {lastFrame,zoom,origin,majorStep,width:timelineFramePixel(lastFrame,origin,zoom)+40,
  gridOrigin:origin%(zoom*majorStep),ticks:Array.from({length:Math.floor(lastFrame/majorStep)-first+1},(_,index)=>(first+index)*majorStep)};
}
const cameras=computed(()=>({graph:cameraFor('graph'),dopesheet:cameraFor('dopesheet')}));
const graphCamera=computed(()=>cameras.value.graph);
const paneSummaryTracks=computed(()=>({graph:graphRowTracks.value,dopesheet:sheetFilteredRows.value.flatMap(row=>row.track?[row.track]:[])}));
const paneSummaryKeys=computed(()=>({graph:paneSummaryTracks.value.graph.flatMap(track=>track.keys),
 dopesheet:paneSummaryTracks.value.dopesheet.flatMap(track=>track.keys)}));
const summaryTracks=computed(()=>paneSummaryTracks.value[view.value]);
const summaryKeys=computed(()=>paneSummaryKeys.value[view.value]);
function markerFrames(keys:readonly TimelineKey[],displayed=false){
 return [...new Set(keys.map(key=>displayed?displayedFrame(key):key.frame))].sort((a,b)=>a-b);
}
const overviewFrames=computed(()=>markerFrames(summaryKeys.value));
const paneOverviewFrames=computed(()=>{
 const moving=!!drag.value?.delta||!!scaleDrag.value;
 return {graph:markerFrames(paneSummaryKeys.value.graph,moving),dopesheet:markerFrames(paneSummaryKeys.value.dopesheet,moving)};
});
function displayedFrame(key:TimelineKey){
 const scaled=scaleDrag.value?.frames.get(key.id);
 if(scaled!==undefined)return scaled;
 const move=drag.value;
 return move?.delta&&move.moving.has(key.id)?Math.fround(Math.fround(key.frame)+Math.fround(move.delta)):key.frame;
}
function previewHandleFrames(controls:TimelineBezierControls,key:TimelineKey,next:TimelineKey|undefined):TimelineBezierControls {
 const movedTime=(time:number,endpoint:TimelineKey)=>{
  const frame=displayedFrame(endpoint);
  return frame===endpoint.frame?time:Math.fround(time+Math.fround(frame-Math.fround(endpoint.frame)));
 };
 return [movedTime(controls[0],key),controls[1],next?movedTime(controls[2],next):controls[2],controls[3]];
}
function keysForBone(id:number,pane:TimelineView){return paneSummaryTracks.value[pane].filter(t=>t.boneId===id).flatMap(t=>t.keys);}
function connections(track:DisplayTrack){
 const sorted=track.keys.slice().sort((a,b)=>displayedFrame(a)-displayedFrame(b));
 return sorted.flatMap((key,index)=>{const next=sorted[index+1];return next&&key.values.some((v,i)=>v!==next.values[i])?[{key,next}]:[];});
}
function connectionPath(key:TimelineKey,next:TimelineKey,pane:TimelineView){const start=frameX(displayedFrame(key),pane),end=frameX(displayedFrame(next),pane);if(key.interpolation==='stepped')return `M${start},12H${end}`;return key.interpolation==='bezier'?`M${start},16C${start+4},16 ${start+4},9 ${Math.min(start+8,end)},9H${end}`:`M${start},16L${Math.min(start+8,end)},9H${end}`;}
function toggleBone(id:number,pane:TimelineView){
 if(pane==='graph'&&graphScopeDriven.value)return;
 const target=pane==='dopesheet'&&(props.stacked||sheetScopeDriven.value)?syncedSheetCollapsed:collapsed;
 const next=new Set(target.value);
 if(next.has(id))next.delete(id);else next.add(id);
 target.value=next;
}
function chooseBone(event:MouseEvent,boneId:number){emit('selectBone',boneId,event.ctrlKey||event.metaKey||event.shiftKey);}
function chooseRow(event:MouseEvent,row:Row){if(row.constraint)emit('selectConstraint',row.constraint.id);else if(row.event)emit('selectEvent',row.event.id);else if(row.sequence)emit('selectSequenceAttachment',row.sequence.attachmentId);else if(row.deform)emit('selectAttachment',row.deform.attachmentId,event.ctrlKey||event.metaKey||event.shiftKey);else if(row.slot)emit('selectSlot',row.slot.id,event.ctrlKey||event.metaKey||event.shiftKey);else if(row.bone)chooseBone(event,row.bone!.id);}
function insertRow(row:Row){if(!editable.value||!row.track)return;if(row.constraint){const kind=row.track.constraintKind;if(kind&&!isTimelinePathChannel(kind))emit('insertConstraintKeys',{constraintId:row.constraint.id,kind,property:row.track.physicsProperty});}else if(row.event)emit('insertEventKey',row.event.id);else if(row.track.channel==='drawOrder')emit('insertDrawOrderKey');else if(row.sequence)emit('insertSequenceKey',row.sequence.attachmentId);else if(row.deform)emit('insertDeformKey',{attachmentId:row.deform.attachmentId});else if(row.slot)emit('insertSlotKeys',{slotId:row.slot.id,channel:row.track.channel as 'attachment'|'rgba'});else insert(row.track.channel as TimelineChannel,row.bone?.id);}
function canInsertRow(row:Row){
 if(isTimelinePathChannel(row.track?.channel))return false;
 if(row.sequence){
  const target=row.slot?.attachments.find(a=>a.id===row.sequence!.attachmentId);
  if(!target?.sequence||linkedTimelineSourceId(target)!==undefined)return false;
 }
 return editable.value&&!!row.track&&(!!row.constraint||!!row.event||row.track.channel==='drawOrder'||!!row.deform||!!row.slot||channelSupported(row.track.channel as TimelineChannel));
}
function attachmentName(track:DisplayTrack,key:TimelineKey){return key.attachment==null?label('none','None'):props.slots.find(slot=>slot.id===track.slotId)?.attachments.find(a=>a.id===key.attachment)?.name??label('missingAttachment','Missing attachment');}
function rowName(row:Row){return row.constraint?.name??row.event?.name??row.slot?.name??row.bone?.name??channelLabel('drawOrder');}
function deformName(row:Row){return row.slot?.attachments.find(a=>a.id===row.deform?.attachmentId)?.name??label('attachment','Attachment');}
function sequenceName(row:Row){return row.slot?.attachments.find(a=>a.id===row.sequence?.attachmentId)?.name??label('attachment','Attachment');}
function keyLabel(track:DisplayTrack,key:TimelineKey){if(track.channel==='sequence'){const pose=key.sequencePayload;return pose?t('sequenceMode'+pose.mode)+' · '+pose.index+' · '+pose.delay+' s':t('sequence');}if(track.channel==='event')return key.eventPayload?.string??label('event','Event');if(track.channel==='physicsReset')return label('reset','Reset');if(track.channel==='drawOrder')return key.order===null?label('setupOrder','Setup order'):label('customOrder','Custom order');if(track.channel==='deform')return label('deform','Deform')+' '+key.interpolation;return track.channel==='attachment'?attachmentName(track,key):key.values.join(', ');}
function chooseKey(key:TimelineKey,additive:boolean){
 handleSelection.value=null;
 selectAllRow=null;
 const next=additive?new Set(selected.value):new Set<number>();
 if(additive&&next.has(key.id))next.delete(key.id);else next.add(key.id);
 selected.value=next;
 if(props.stacked)captureDopesheetSource();
}
type ClickModifiers=Pick<MouseEvent,'altKey'|'ctrlKey'|'metaKey'|'shiftKey'>;
function modifiedClick(event:ClickModifiers){return event.ctrlKey||event.metaKey||event.altKey;}
function plainKeyClick(event:ClickModifiers){return !modifiedClick(event)&&!event.shiftKey;}
function jumpToFrame(frame:number){
 if(!editable.value||!Number.isFinite(frame))return;
 const target=Math.fround(Math.min(MAX_ANIMATION_PREVIEW_FRAME,Math.max(0,frame)));
 if(!sameAnimationFrame(target,props.currentFrame))emit('seek',target);
}
function activateKey(key:TimelineKey,event:KeyboardEvent){
 if(event.key!=='Enter'&&event.key!==' ')return;
 event.preventDefault();event.stopPropagation();
 if(!editable.value)return;
 chooseKey(key,event.ctrlKey||event.metaKey);
 if(navigationOptions.value.jumpToKey&&plainKeyClick(event))jumpToFrame(key.frame);
}
function captureClickJump(option:'jumpToKey'|'jumpToFrame'){
 if(!navigationOptions.value[option])return undefined;
 const mode=view.value, {documentKey,projectRevision,activeAnimationId,currentFrame}=props;
 return (frame:number)=>{
  if(navigationOptions.value[option]&&view.value===mode&&props.documentKey===documentKey&&props.projectRevision===projectRevision
     &&props.activeAnimationId===activeAnimationId&&sameAnimationFrame(props.currentFrame,currentFrame))jumpToFrame(frame);
 };
}
function captureKeyJump(event:PointerEvent,key:TimelineKey){
 const jump=plainKeyClick(event)?captureClickJump('jumpToKey'):undefined;
 return jump?(tap:PointerEvent|null)=>{if(tap&&plainKeyClick(tap))jump(key.frame);}:undefined;
}
let stopGesture:(()=>void)|null=null;
const gestureActive=ref(false);
function gesture(origin:PointerEvent,move:(event:PointerEvent)=>void,finish:(cancel:boolean,tap:PointerEvent|null,release?:PointerEvent)=>void,capture?:HTMLElement){
 if(props.suspended)return;
 stopGesture?.();
 let travelled=false;
 const moved=(event:PointerEvent)=>Math.hypot(event.clientX-origin.clientX,event.clientY-origin.clientY)>=3;
 const tracking=(event:PointerEvent)=>{if(event.pointerId===origin.pointerId){travelled||=moved(event);move(event);}};
 const cancel=()=>{cleanup();finish(true,null);};
 const pointerCancel=(event:PointerEvent)=>{if(event.pointerId===origin.pointerId)cancel();};
 const up=(event:PointerEvent)=>{
  if(event.pointerId!==origin.pointerId)return;
  if(event.button!==origin.button){cancel();return;}
  cleanup();finish(false,travelled||moved(event)?null:event,event);
 };
 const cleanup=()=>{
  window.removeEventListener('pointermove',tracking);window.removeEventListener('pointerup',up);
  window.removeEventListener('pointercancel',pointerCancel);window.removeEventListener('blur',cancel);
  capture?.removeEventListener('lostpointercapture',pointerCancel);
  if(capture?.hasPointerCapture(origin.pointerId))capture.releasePointerCapture(origin.pointerId);
  stopGesture=null;gestureActive.value=false;
 };
 window.addEventListener('pointermove',tracking);window.addEventListener('pointerup',up);
 window.addEventListener('pointercancel',pointerCancel);window.addEventListener('blur',cancel);
 stopGesture=cancel;
 gestureActive.value=true;
 if(capture){
  capture.addEventListener('lostpointercapture',pointerCancel);
  try{capture.setPointerCapture(origin.pointerId);}catch{/* Window pointer handlers remain active. */}
 }
}
function toggleTimingTool(tool:'shift'|'offset'){
 stopGesture?.();
 timingTool.value=timingTool.value===tool?'move':tool;
}
const boxPauseMs=280;
function keepSelectionBox(start:TimelineSelectionPoint,end:TimelineSelectionPoint,gutter:number,keys:number[],snap:boolean){
 const zoom=pixelsPerFrame.value;
 const from=timelineContentFrame(Math.min(start.x,end.x)-gutter,leadingPixels.value,zoom);
 const to=timelineContentFrame(Math.max(start.x,end.x)-gutter,leadingPixels.value,zoom);
 const ids=new Set(keys);
 let first=Infinity,last=-Infinity,canScale=keys.length<=4096;
 for(const {key,track} of selectedKeys.value){
  if(!ids.has(key.id))continue;
  first=Math.min(first,key.frame);
  last=Math.max(last,key.frame);
  canScale&&=isTimelineBoneChannel(track.channel);
 }
 if(first===Infinity)return;
 const left=Math.fround(Math.max(0,Math.min(first,snap?Math.floor(from):from)));
 const right=Math.fround(Math.min(MAX_ANIMATION_PREVIEW_FRAME,Math.max(last,snap?Math.ceil(to):to)));
 const box:SelectionBox={id:nextSelectionBox++,left,right,top:Math.min(start.y,end.y),bottom:Math.max(start.y,end.y),keys,canScale:canScale&&first<last};
 selectionBoxes.value=[...selectionBoxes.value,box];
}
function boxStyle(box:SelectionBox){
 const preview=scaleDrag.value?.boxId===box.id?scaleDrag.value:null;
 const moved=preview?.edge==='left'?preview.toEdgeFrame:box.left;
 const fixed=preview?.edge==='right'?preview.toEdgeFrame:box.right;
 return {left:`calc(var(--at-gutter) + ${frameX(Math.min(moved,fixed))}px)`,width:Math.abs(moved-fixed)*pixelsPerFrame.value+'px',
  top:box.top+'px',height:Math.max(3,box.bottom-box.top)+'px'};
}
function scaleSelection(box:SelectionBox,edge:BoxEdge,toEdgeFrame:number){
 const anchorFrame=edge==='left'?box.right:box.left,fromEdgeFrame=box[edge],animation=props.activeAnimationId;
 if(!box.canScale||animation===null||!Number.isFinite(toEdgeFrame)||toEdgeFrame===anchorFrame
    ||toEdgeFrame<0||toEdgeFrame>MAX_ANIMATION_PREVIEW_FRAME)return null;
 const factor=(toEdgeFrame-anchorFrame)/(fromEdgeFrame-anchorFrame),frames=new Map<number,number>();
 const keys=new Set(box.keys);
 for(const {key} of selectedKeys.value){
  if(!keys.has(key.id))continue;
  const frame=key.frame===fromEdgeFrame?toEdgeFrame:Math.fround(anchorFrame+(key.frame-anchorFrame)*factor);
  if(!Number.isFinite(frame)||frame<0||frame>MAX_ANIMATION_PREVIEW_FRAME)return null;
  frames.set(key.id,frame);
 }
 if(frames.size!==box.keys.length)return null;
 return {change:{animation,keys:box.keys,anchorFrame,fromEdgeFrame,toEdgeFrame},frames};
}
function commitScale(box:SelectionBox,edge:BoxEdge,frame:number,revision=props.projectRevision){
 if(!editable.value||invalidDraft.value||props.projectRevision!==revision)return;
 const scale=scaleSelection(box,edge,frame);
 if(scale&&selectedKeys.value.some(({key})=>scale.frames.has(key.id)&&scale.frames.get(key.id)!==key.frame)){
  emit('scaleKeys',scale.change,revision);
 }
}
function startScale(event:PointerEvent,box:SelectionBox,edge:BoxEdge){
 if(event.button!==0||!editable.value||invalidDraft.value||!box.canScale||event.ctrlKey||event.metaKey)return;
 const pane=scroller.value;if(!pane)return;
 event.preventDefault();
 stopGesture?.();
 emit('pause');
 (pane.closest('.animation-timeline') as HTMLElement|null)?.focus({preventScroll:true});
 const {documentKey,projectRevision,activeAnimationId}=props;
 const initialScroll=pane.scrollLeft;
 const toFrame=(pointer:PointerEvent)=>{
  const delta=(pointer.clientX-event.clientX+pane.scrollLeft-initialScroll)/pixelsPerFrame.value;
  const frame=box[edge]+delta;
  return Math.fround(pointer.shiftKey?frame:Math.round(frame));
 };
 const update=(pointer:PointerEvent)=>{
  const toEdgeFrame=toFrame(pointer),scale=scaleSelection(box,edge,toEdgeFrame);
  scaleDrag.value={boxId:box.id,edge,toEdgeFrame,frames:scale?.frames??new Map()};
 };
 gesture(event,update,(cancel,tap,release)=>{
  scaleDrag.value=null;
  if(!cancel&&!tap&&release&&props.documentKey===documentKey&&props.activeAnimationId===activeAnimationId){
   commitScale(box,edge,toFrame(release),projectRevision);
  }
 });
 scaleDrag.value={boxId:box.id,edge,toEdgeFrame:box[edge],frames:new Map()};
}
function scaleEdgeByKey(event:KeyboardEvent,box:SelectionBox,edge:BoxEdge){
 if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
 event.preventDefault();event.stopPropagation();
 if(event.repeat||modifiedClick(event))return;
 const step=(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?0.125:1);
 commitScale(box,edge,Math.fround(box[edge]+step));
}
function startMarquee(event:PointerEvent,clickedKey?:TimelineKey,clickedHandle?:string){
 const pane=scroller.value,axis=ruler.value;if(event.button!==0||!editable.value||!pane||!axis)return;
 const bounds=pane.getBoundingClientRect();
 const gutter=Math.max(0,axis.getBoundingClientRect().left-bounds.left);
 if(event.clientX<bounds.left+gutter||event.clientX>=bounds.left+pane.clientWidth||event.clientY<bounds.top||event.clientY>=bounds.top+pane.clientHeight)return;
 emit('pause');
 stopGesture?.();event.preventDefault();event.stopPropagation();
 (pane.closest('.animation-timeline') as HTMLElement|null)?.focus({preventScroll:true});
 const position=(pointer:PointerEvent)=>{const box=pane.getBoundingClientRect();return{x:Math.max(gutter,Math.min(pane.clientWidth,pointer.clientX-box.left))+pane.scrollLeft,y:Math.max(0,Math.min(pane.clientHeight,pointer.clientY-box.top))+pane.scrollTop};};
 const start=position(event),before=[...selected.value],additive=event.ctrlKey||event.metaKey;
 const previousBoxes=selectionBoxes.value,previousHandles=handleSelection.value,previousSelectAllRow=selectAllRow;
 const selectHandles=view.value==='graph'&&additive&&!!previousHandles?.ids.size;
 const {documentKey,projectRevision,activeAnimationId}=props;
 const height=graphHeight.value;
 const liveOrigin=()=>!(selectHandles||clickedHandle)||editable.value&&view.value==='graph'&&scroller.value===pane&&
  props.documentKey===documentKey&&props.projectRevision===projectRevision&&props.activeAnimationId===activeAnimationId&&graphHeight.value===height;
 if(!additive)selectionBoxes.value=[];
 if(!selectHandles&&!clickedHandle)handleSelection.value=null;
 let moved=false,lastMove=event.timeStamp;
 const blank=!clickedKey&&!clickedHandle&&!(event.target as Element).closest('[data-timeline-key-id]');
 const jump=blank&&!modifiedClick(event)?captureClickJump('jumpToFrame'):undefined;
 const center=(element:Element)=>{
  const box=element.getBoundingClientRect();
  return box.width&&box.height?{x:box.x+box.width/2-bounds.left+pane.scrollLeft,y:box.y+box.height/2-bounds.top+pane.scrollTop}:null;
 };
 const marks=selectHandles?[]:Array.from(pane.querySelectorAll<HTMLElement|SVGElement>('[data-timeline-key-id]')).flatMap(element=>{
  const point=center(element);return point?[{id:Number(element.dataset.timelineKeyId),...point}]:[];
 });
 const handleMarks=selectHandles?Array.from(pane.querySelectorAll<SVGCircleElement>('circle[data-graph-handle-id]')).flatMap(element=>{
  const id=element.dataset.graphHandleId,point=center(element);return id&&point?[{id,...point}]:[];
 }):[];
 const progress=currentProgress.value;marquee.value={kind:selectHandles?'handles':'keys',start,end:start,progress};
 const update=(pointer:PointerEvent)=>{
  const box=marquee.value;if(!box||!liveOrigin())return;
  const end=position(pointer);
  if(end.x===box.end.x&&end.y===box.end.y)return;
  box.end=end;
  const distance=selectHandles?Math.hypot(pointer.clientX-event.clientX,pointer.clientY-event.clientY):Math.hypot(end.x-start.x,end.y-start.y);
  if(!moved&&distance<3)return;
  moved=true;lastMove=pointer.timeStamp;
  if(selectHandles&&previousHandles){
   handleSelection.value={...previousHandles,ids:new Set(timelineBoxSelection(handleMarks,start,end,[...previousHandles.ids]))};
   selectAllRow=null;
  }else{
   handleSelection.value=null;
   selected.value=new Set(timelineBoxSelection(marks,start,end,additive?before:[]));
  }
 };
 if(!selectHandles)selected.value=new Set(additive?before:[]);
 gesture(event,update,(cancel,tap,release)=>{
  const rollback=cancel||!liveOrigin();
  if(!rollback&&release&&!tap)update(release);
  const box=marquee.value;marquee.value=null;
  if(rollback){
   selected.value=new Set(before);handleSelection.value=previousHandles;
   selectionBoxes.value=previousBoxes;selectAllRow=previousSelectAllRow;
  }
  else if(moved&&box&&release&&view.value==='dopesheet'&&(!navigationOptions.value.boxSelectPause||release.timeStamp-lastMove>=boxPauseMs)){
   keepSelectionBox(start,box.end,gutter,timelineBoxSelection(marks,start,box.end,[]),!release.shiftKey);
  }
  else if(tap&&!moved&&clickedHandle)chooseGraphHandle(clickedHandle,true);
  else if(tap&&!moved&&clickedKey)chooseKey(clickedKey,true);
  else if(tap&&!moved&&jump&&!modifiedClick(tap)&&scroller.value===pane){
   const plot=pane.getBoundingClientRect(),axis=ruler.value?.getBoundingClientRect();
   if(axis&&tap.clientX>=axis.left&&tap.clientX<plot.left+pane.clientWidth&&tap.clientY>=plot.top&&tap.clientY<plot.top+pane.clientHeight){
    jump(timelineFrameAt(tap.clientX,axis.left+leadingPixels.value,pane.scrollLeft,pixelsPerFrame.value,!tap.shiftKey));
   }
  }
  if(!rollback&&!selectHandles&&props.stacked)captureDopesheetSource();
 },selectHandles?pane:undefined);
}
function gridPointer(event:PointerEvent){if(event.button===2){pan(event);return;}if((event.target as Element).closest('.at-track-label,input,select,button,circle'))return;startMarquee(event);}
function dragOffset(event:PointerEvent,key:TimelineKey){
 const animation=props.activeAnimationId;
 const jump=captureKeyJump(event,key);
 if(offsetProblem.value||animation===null||singleKey.value?.key.id!==key.id){
  if(jump)gesture(event,()=>{},(_cancel,tap)=>jump(tap));
  return;
 }
 const {documentKey,projectRevision:revision,loopStart,loopEnd}=props;
 const loopRange=offsetLoopRange.value,x=event.clientX,pane=scroller.value,left=pane?.scrollLeft??0;
 const deltaAt=(pointer:PointerEvent)=>{
  const delta=(pointer.clientX-x+(pane?.scrollLeft??left)-left)/pixelsPerFrame.value,steps=pointer.shiftKey?1000:1;
  return Number.isFinite(delta)?Math.round(delta*steps)/steps:0;
 };
 offsetDrag.value={delta:0};
 gesture(event,move=>{
  if(offsetDrag.value)offsetDrag.value.delta=deltaAt(move);
 },(cancel,tap)=>{
  const delta=offsetDrag.value?.delta;
  offsetDrag.value=null;
  if(cancel)return;
  if(delta&&editable.value&&!offsetProblem.value&&singleKey.value?.key.id===key.id
    &&props.documentKey===documentKey&&props.projectRevision===revision&&props.activeAnimationId===animation
    &&props.loopStart===loopStart&&props.loopEnd===loopEnd){
   emit('offsetKeys',{animation,key:key.id,deltaFrames:delta,...(loopRange?{loopRange}:{})},revision);
  }else if(!delta)jump?.(tap);
 });
}
function dragKey(event:PointerEvent,key:TimelineKey){
 if(event.button!==0||!editable.value)return;
 if(event.ctrlKey||event.metaKey){startMarquee(event,key);return;}
 stopGesture?.();
 selectionBoxes.value=[];
 emit('pause');
 event.preventDefault();
 (scroller.value?.closest('.animation-timeline') as HTMLElement|null)?.focus({preventScroll:true});
 const additive=event.shiftKey;
 if(additive||!selected.value.has(key.id))chooseKey(key,additive);
 if(!selected.value.has(key.id))return;
 if(props.stacked)captureDopesheetSource();
 if(offsetKeys.value){dragOffset(event,key);return;}
 const source=new Set(selected.value),ids=[...source],shift=shiftKeys.value;
 const moving=shift?timelineShiftKeyIds(allTracks.value,source):source;
 const minimumFrame=[selectedKeys.value.reduce((min,item)=>Math.min(min,item.key.frame),key.frame)];
 const documentKey=props.documentKey,revision=props.projectRevision,animation=props.activeAnimationId,x=event.clientX,pane=scroller.value,left=pane?.scrollLeft??0;
 const jump=captureKeyJump(event,key);
 drag.value={moving,delta:0};
 gesture(event,move=>{if(drag.value)drag.value.delta=timelineMoveDelta((move.clientX-x+(pane?.scrollLeft??left)-left)/pixelsPerFrame.value,minimumFrame,!move.shiftKey);},(cancel,tap)=>{
  const completed=drag.value;drag.value=null;
  if(!cancel&&completed?.delta&&editable.value&&props.documentKey===documentKey&&props.projectRevision===revision&&props.activeAnimationId===animation){
   emit('moveKeys',{ids,deltaFrames:completed.delta,...(shift?{shift:true}:{})},revision);
  }else if(!completed?.delta)jump?.(tap);
 });
}
function seekPointer(event:PointerEvent){
 if(event.button!==0||!editable.value)return;
 event.preventDefault();const bounds=ruler.value?.getBoundingClientRect();if(!bounds)return;
 const seek=(move:PointerEvent)=>emit('seek',timelineFrameAt(move.clientX,bounds.left+leadingPixels.value,scroll.value,pixelsPerFrame.value,!move.shiftKey));
 seek(event);gesture(event,seek,()=>{});
}
function pan(event:PointerEvent){
 if(event.button!==2||!scroller.value)return;
 const pane=scroller.value,mode=view.value,x=event.clientX,y=event.clientY,left=pane.scrollLeft,top=pane.scrollTop;
 gesture(event,move=>{horizontalScroll(mode,left+x-move.clientX);pane.scrollTop=top+y-move.clientY;},()=>{});
}
function commitCurrent(){const frame=Number(currentDraft.value);if(String(currentDraft.value).trim()&&Number.isFinite(frame)&&frame>=0)emit('seek',frame);else currentDraft.value=String(props.currentFrame);}
function validateFps(){const value=Number(fpsDraft.value);fpsError.value=!String(fpsDraft.value).trim()||!Number.isFinite(value)||value<1||value>240;return !fpsError.value;}
function commitFps(){if(props.disabled||!active.value||!validateFps())return;const value=Number(fpsDraft.value);if(value!==props.fps&&value!==submittedFps.value){submittedFps.value=value;emit('setFps',value);}}
function resetFps(){fpsDraft.value=String(props.fps);fpsError.value=false;submittedFps.value=null;}
function resetLoopDrafts(){loopStartDraft.value=props.loopStart??'';loopEndDraft.value=props.loopEnd??'';}
function changeLoop(which:'start'|'end',value:string){
 if(!active.value||props.disabled)return;
 const parsed=value.trim()?Number(value):null,range={start:props.loopStart,end:props.loopEnd,[which]:parsed};
 if(validAnimationLoopRange(range,props.automaticPreviewEndFrames??props.storedDurationFrames??props.durationFrames)){
  if(offsetDrag.value&&(range.start!==props.loopStart||range.end!==props.loopEnd))stopGesture?.();
  emit('loopRange',range);
 }else resetLoopDrafts();
}
function setLoop(which:'start'|'end'){changeLoop(which,String(props.currentFrame));}
function beginName(kind:'create'|'rename'){nameEditor.value=kind;nameDraft.value=kind==='rename'?active.value?.name??'':'';}
function submitName(){const name=nameDraft.value.trim();if(!name)return;if(nameEditor.value==='rename'&&active.value)emit('renameAnimation',{id:active.value.id,name});else emit('createAnimation',name);nameEditor.value=null;}
const continuousSelection=computed(()=>selectedKeys.value.length>0&&!hasSelectedPathKeys.value&&selectedKeys.value.every(item=>!['attachment','drawOrder','physicsReset','event','sequence'].includes(item.track.channel)));
function twoColorTrack(track:DisplayTrack){return track.channel==='rgba'&&(props.slots.find(slot=>slot.id===track.slotId)?.tintBlack||track.keys.some(key=>key.values.length===7));}
const twoColorSelection=computed(()=>selectedKeys.value.some(item=>twoColorTrack(item.track)));
function allowedInterpolation(value:TimelineInterpolation){return props.supportedInterpolations.includes(value)&&(!twoColorSelection.value||value==='linear');}
function interpolation(value:TimelineInterpolation){if(editable.value&&continuousSelection.value&&allowedInterpolation(value))emit('setInterpolation',{ids:[...selected.value],interpolation:value});}
function copySelected(){if(canCopySelection.value)emit('copyKeys',[...selected.value]);}
function removeSelected(){if(editable.value&&selected.value.size)emit('deleteKeys',[...selected.value]);}
function selectAllDopesheetKeys(){
 selectionBoxes.value=[];
 const picked=selectedKeys.value,track=picked[0]?.track;
 const row=track&&selectAllRow!==track.id&&summaryTracks.value.includes(track)&&picked.every(item=>item.track.id===track.id)
  ?track:null;
 selected.value=new Set((row?.keys??summaryKeys.value).map(key=>key.id));
 selectAllRow=row?.id??null;
 if(props.stacked)captureDopesheetSource();
}
function keydown(event:KeyboardEvent){
 if(props.suspended)return;
 if(event.key==='Escape'&&(marquee.value?.kind==='handles'||bezierDrag.value?.kind==='group')){
  event.preventDefault();event.stopPropagation();stopGesture?.();return;
 }
 if(event.key==='Escape'&&filterOpen.value){event.stopPropagation();closeRowFilters();return;}
 const target=event.target as HTMLElement;
 const graph=view.value==='graph';
 const hasSelectAllTargets=graph?(handleSelection.value?.ids.size||graphKeyTracks.value.length):summaryKeys.value.length;
 if(editable.value&&!gestureActive.value&&hasSelectAllTargets&&event.key.toLowerCase()==='a'
   &&event.ctrlKey!==event.metaKey&&!event.shiftKey&&!event.altKey&&!event.isComposing&&!event.defaultPrevented
   &&!target.closest('input,select,textarea')&&!target.isContentEditable){
  event.preventDefault();event.stopPropagation();
  if(!event.repeat){
   if(graph)selectAllGraph();
   else selectAllDopesheetKeys();
  }
  return;
 }
 if(!(event.target as HTMLElement).matches('input,select,textarea')&&(event.ctrlKey||event.metaKey)){
  if(event.key.toLowerCase()==='c'&&selected.value.size){event.preventDefault();event.stopPropagation();copySelected();return;}
  if(event.key.toLowerCase()==='v'&&props.canPaste){event.preventDefault();event.stopPropagation();emit('pasteKeys');return;}
 }
 if((event.target as HTMLElement).matches('input,select,textarea'))return;
 if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();event.stopPropagation();removeSelected();}
 if(event.key==='Escape'){
  event.stopPropagation();
  if(marquee.value||scaleDrag.value||(offsetDrag.value&&offsetLoopRange.value))stopGesture?.();
  else{stopGesture?.();selectionBoxes.value=[];handleSelection.value=null;selected.value=new Set();if(props.stacked)captureDopesheetSource();}
 }
 if(event.key===' '){event.stopPropagation();if(active.value&&event.target===event.currentTarget){event.preventDefault();if(props.playing)emit('pause');else emit('play');}}
}
function channelSupported(channel:TimelineChannel){return props.supportedChannels.includes(channel)||timelineChannels.some(family=>family===channel)&&props.supportedChannels.some(supported=>animationChannelFamily(supported)===channel);}
function insert(channel:TimelineChannel,boneId?:number){if(!editable.value||!channelSupported(channel))return;if(boneId!==undefined)emit('selectBone',boneId,false);emit('insertKeys',channel);}
function validateValues(){
 valueError.value=!!singleKey.value&&!isTimelinePathChannel(singleKey.value.track.channel)&&!['attachment','drawOrder','deform','physicsReset','event','sequence'].includes(singleKey.value.track.channel)&&(keyDraft.value.some(v=>!String(v).trim())||keyDraft.value.map(Number).some(v=>!Number.isFinite(v)||(singleKey.value?.track.channel==='rgba'&&(v<0||v>1))));
 return !valueError.value;
}
function commitValues(){
 const item=singleKey.value;if(!item||!editable.value||isTimelinePathChannel(item.track.channel))return;
 if(!validateValues())return;const values=keyDraft.value.map(Number);
 const signature=item.key.id+':'+values.join(',');if(signature===submittedValue.value||values.every((v,i)=>v===item.key.values[i]))return;
 submittedValue.value=signature;if(item.track.constraintKind==='ik')emit('updateConstraintKey',{id:item.key.id,kind:'ik',mix:values[0],softness:values[1]});else if(item.track.constraintKind==='transformMix')emit('updateConstraintKey',{id:item.key.id,kind:'transformMix',values});else if(item.track.constraintKind==='physics')emit('updateConstraintKey',{id:item.key.id,kind:'physics',value:values[0]!});else if(item.track.slotId!==undefined)emit('updateSlotKey',{id:item.key.id,values});else emit('updateKey',{id:item.key.id,values});
}
function resetValues(){keyDraft.value=singleKey.value?.key.values.map(String)??[];valueError.value=false;submittedValue.value='';}
function axisLabel(track:DisplayTrack,index:number){if(track.channel==='translateY'||track.channel==='scaleY')return 'Y';if(track.channel==='ik')return [label('mix','Mix'),label('softness','Softness')][index]??String(index+1);if(track.channel==='transformMix')return ['Rotate','X','Y','Scale X','Scale Y','Shear Y'][index]??String(index+1);if(track.channel==='physics')return physicsLabel(track.physicsProperty);if(track.channel==='pathMix')return t(['pathConstraintMixRotate','pathConstraintMixX','pathConstraintMixY'][index]??'pathConstraintMix');if(isTimelinePathChannel(track.channel))return channelLabel(track.channel);if(track.channel==='rgba'){const axis=['R','G','B','A','R','G','B'][index]??String(index+1);return twoColorTrack(track)?t(index<4?'animation_lightComponent':'animation_darkComponent',{axis}):axis;}return index===0?'X':index===1?'Y':String(index+1);}
function changeAttachment(value:string){if(singleKey.value?.track.channel==='attachment'&&editable.value)emit('updateSlotKey',{id:singleKey.value.key.id,attachment:value===''?null:Number(value)});}
function physicsLabel(value?:string){return value?label('physics_'+value,value[0]!.toUpperCase()+value.slice(1)):label('physics','Physics');}
function changeIkFlag(key:keyof TimelineIkFlags,event:Event){const item=singleKey.value;if(item?.track.channel==='ik'&&editable.value)emit('updateConstraintKey',{id:item.key.id,kind:'ik',[key]:(event.target as HTMLInputElement).checked});}
const selectedEvent=computed(()=>props.events.find(event=>event.id===singleKey.value?.track.eventId));
const selectedEventKey=computed(()=>{const item=singleKey.value;return item?.track.channel==='event'&&item.key.eventPayload?{id:item.key.id,frame:item.key.frame,...item.key.eventPayload}:null;});
const selectedSlot=computed(()=>props.slots.find(slot=>slot.id===singleKey.value?.track.slotId));
const selectedSequenceSettings=computed(()=>selectedSlot.value?.attachments.find(a=>a.id===singleKey.value?.track.attachmentId)?.sequence??null);
function commitSequenceKey(value:SequenceWorkingPose){const item=singleKey.value;if(item?.track.channel==='sequence'&&editable.value)emit('updateSequenceKey',{id:item.key.id,...value});}
const currentProgress=computed<ProgressSegment|undefined>(()=>{const item=selectedKeys.value.find(item=>item.track.channel==='deform');if(!item)return;const next=item.track.keys.find(key=>key.frame>item.key.frame);return next?{...item,next}:undefined;});
const graphProgress=computed(()=>graphScopeDriven.value?undefined:marquee.value?marquee.value.progress:currentProgress.value);
const progressControls=computed(()=>{
 const segment=graphProgress.value,controls=segment?.key.progressControls;
 if(!segment||!controls)return;
 const result=previewHandleFrames(controls,segment.key,segment.next),preview=progressDrag.value;
 if(preview?.id===segment.key.id){result[preview.control*2]=preview.frame;result[preview.control*2+1]=preview.value;}
 return result;
});
const setupBonesById=computed(()=>new Map(props.bones.map(bone=>[bone.id,bone])));
function graphSeries(track:DisplayTrack){
 if(!hasTimelineGraphCurves(track))return [];
 const {channel}=track;
 const boneChannel=isTimelineBoneChannel(channel)?channel:undefined;
 const setup=boneChannel===undefined?undefined:setupBonesById.value.get(track.boneId);
 const count=boneChannel!==undefined
  ? animationChannelDimensions(boneChannel)
  : track.keys.reduce((size,key)=>Math.max(size,key.values.length),0);
 return Array.from({length:count},(_,component)=>({
  id:track.id+'-'+component,track,component,
  projection:boneChannel===undefined?undefined:graphBoneValueProjection(setup,boneChannel,component),
  color:channel==='rgba'?['#ef7777','#7ec958','#70c7e6','#e0e3e6','#ef7777','#7ec958','#70c7e6'][component]!:channel==='pathMix'?['#7ec958','#ef7777','#70c7e6'][component]!:component===1?'#e2cb60':timelineChannelColor[channel],
  dark:channel==='rgba'&&component>=4,
 }));
}
type PlottedSeries=ReturnType<typeof graphSeries>[number];
function graphTrackId(track:DisplayTrack){
 // Empty transform/constraint row placeholders use different display IDs.
 if(track.constraintId!==undefined)return `constraint:${track.constraintId}:${track.channel}${track.physicsProperty?':'+track.physicsProperty:''}`;
 if(track.slotId!==undefined)return track.id;
 return `${track.boneId}:${track.channel}`;
}
const visibleStoredGraphTracks=computed(()=>{
 if(!storedGraphTracks.value.length)return [];
 if(graphScopeDriven.value){
  const selectedTracks=new Set(graphRowTracks.value.map(graphTrackId));
  return storedGraphTracks.value.filter(track=>selectedTracks.has(graphTrackId(track)));
 }
 const shown=new Set(shownBones.value.filter(bone=>!collapsed.value.has(bone.id)).map(bone=>bone.id));
 return storedGraphTracks.value.filter(track=>{
  if(!shown.has(track.boneId)||!matchesRowFilter(track.channel,rowFilters.value.graph))return false;
  if(track.constraintId!==undefined)return !rowConstraintOnly.value||rowScope.value.constraintIds.has(track.constraintId);
  if(track.slotId!==undefined)return !rowSlotOnly.value||rowScope.value.slotIds.has(track.slotId);
  return !rowConstraintOnly.value&&!rowSlotOnly.value;
 });
});
const graphTrackScopes=computed(()=>{
 const ids=new Set<string>(),byBone=new Map<number,string[]>();
 if(graphScopeDriven.value)return {ids,byBone};
 for(const track of [...graphRowTracks.value,...visibleStoredGraphTracks.value]){
  if(!hasTimelineGraphCurves(track))continue;
  const id=graphTrackId(track);
  if(ids.has(id))continue;
  ids.add(id);
  const group=byBone.get(track.boneId);
  if(group)group.push(id);else byBone.set(track.boneId,[id]);
 }
 return {ids,byBone};
});
function graphVisibility(ids:Iterable<string>):boolean|'mixed'|undefined{
 let shown=false,hidden=false;
 for(const id of ids){
  if(hiddenGraphTracks.value.has(id))hidden=true;else shown=true;
  if(shown&&hidden)return 'mixed';
 }
 return shown?true:hidden?false:undefined;
}
function rowGraphIds(row:Row){
 if(row.track){
  const id=graphTrackId(row.track);
  return graphTrackScopes.value.ids.has(id)?[id]:[];
 }
 return row.bone?graphTrackScopes.value.byBone.get(row.bone.id)??[]:[];
}
function rowGraphVisibility(row:Row){
 if(!row.track)return graphVisibility(rowGraphIds(row));
 const id=graphTrackId(row.track);
 return graphTrackScopes.value.ids.has(id)?!hiddenGraphTracks.value.has(id):undefined;
}
function rowGraphLabel(row:Row){
 if(!row.track)return t('animation_graphVisibilityBone',{bone:row.bone?.name??''});
 const property=row.track.channel==='physics'?physicsLabel(row.track.physicsProperty):channelLabel(row.track.channel);
 return t('animation_graphVisibilityProperty',{property,object:rowName(row)});
}
function toggleGraphTracks(ids:Iterable<string>){
 if(view.value!=='graph'||sheetDrivesGraph.value)return;
 const targets=new Set(ids),state=graphVisibility(targets);
 if(state===undefined)return;
 stopGesture?.();
 selectAllRow=null;
 frameEpoch++;
 const hidden=new Set(hiddenGraphTracks.value);
 if(state===true){
  for(const id of targets)hidden.add(id);
  // Selection commands and the footer edit the shared native key IDs.
  // Drop keys whose curves were just hidden before those commands can run.
  if(selected.value.size){
   const next=new Set(selected.value);
   for(const {track,key} of selectedKeys.value)if(targets.has(graphTrackId(track)))next.delete(key.id);
   if(next.size!==selected.value.size)selected.value=next;
  }
 }else for(const id of targets)hidden.delete(id);
 hiddenGraphTracks.value=hidden;
}
function graphTrackShown(track:DisplayTrack){return !hiddenGraphTracks.value.has(graphTrackId(track));}
const visibleGraphTracks=computed(()=>graphProgress.value?[]:graphScopeDriven.value?graphRowTracks.value:manualGraphLiveTracks.value);
const plotted=computed(()=>visibleGraphTracks.value.flatMap(graphSeries));
const graphKeyTracks=computed(()=>[...new Set(plotted.value.map(series=>series.track))]);
const curveSegmentSelections=computed<readonly CurveSegmentSelection[]>(()=>{
 const {documentKey,projectRevision:revision,activeAnimationId:animation}=props;
 if(!documentKey||revision===undefined||animation===null||gestureActive.value||!selected.value.size)return [];
 let tracks=summaryTracks.value;
 if(view.value==='graph'){
  const progressId=graphProgress.value?.track.id;
  const deformTracks=graphRowTracks.value.filter(track=>{
   if(track.channel!=='deform')return false;
   if(track.id===progressId)return true;
   const terminal=track.keys.at(-1);
   return selected.value.size===1&&track.keys.length>1&&terminal!==undefined&&selected.value.has(terminal.id);
  });
  tracks=[...graphKeyTracks.value,...deformTracks];
 }
 const segments=selectedCurveSegments(tracks,selected.value);
 if(!segments.length)return [];
 const rowsByTrack=new Map(filteredRows.value.flatMap(row=>row.track?[[row.track.id,row] as const]:[]));
 return segments.map(segment=>{
  const row=rowsByTrack.get(segment.trackId);
  if(segment.kind==='deform'){
   const property=t('viewportKeyDeformShort');
   return {documentKey,revision,animation,segment,label:row?deformName(row)+' · '+property:property};
  }
  const property=segment.kind==='physics'?physicsLabel(segment.property):channelLabel(segment.channel);
  return {documentKey,revision,animation,segment,label:row?rowName(row)+' · '+property:property};
 });
});
const graphControls=[0,1] as const;
function graphHandleId(series:PlottedSeries,segment:TimelineBezierSegment,control:0|1){
 return `${series.id}:${segment.key.id}:${segment.next.id}:${control}`;
}
function liveGraphHandles(){
 return plotted.value.filter(series=>!isTimelinePathChannel(series.track.channel)).flatMap(series=>
  timelineBezierSegments(series.track.keys,series.component).flatMap(segment=>graphControls.map(control=>({
   id:graphHandleId(series,segment,control),
   curve:series.id,
   frame:segment.controls[control*2]!,
   value:graphDisplayValue(segment.controls[control*2+1]!,series.projection),
  }))),
 );
}
function captureGraphHandleGroup(ids:ReadonlySet<string>):GraphBezierDragHandle[]|null {
 const handles:GraphBezierDragHandle[]=[];
 for(const series of plotted.value){
  const {component,track,projection}=series,bone=isTimelineBoneChannel(track.channel);
  for(const segment of timelineBezierSegments(track.keys,component))for(const control of graphControls){
   const handleId=graphHandleId(series,segment,control);
   if(!ids.has(handleId))continue;
   if(!bone&&!(track.channel==='rgba'&&component<4&&!twoColorTrack(track))&&
      track.channel!=='ik'&&track.channel!=='transformMix'&&track.channel!=='physics')return null;
   handles.push({handleId,id:segment.key.id,nextId:segment.next.id,component,control,
    startFrame:segment.key.frame,endFrame:segment.next.frame,
    startValue:segment.key.values[component]!,endValue:segment.next.values[component]!,
    controls:[...segment.controls],bone,collapsedValue:projection?.factor===0});
  }
 }
 return handles.length===ids.size?handles:null;
}
function selectAllGraph(){
 selectionBoxes.value=[];
 const handles=handleSelection.value;
 if(handles?.ids.size){
  const marks=liveGraphHandles();
  const picked=marks.filter(mark=>handles.ids.has(mark.id));
  const curve=picked[0]?.curve;
  const scope=curve&&selectAllRow!==curve&&picked.every(mark=>mark.curve===curve)?curve:null;
  handleSelection.value={...handles,ids:new Set(marks.filter(mark=>!scope||mark.curve===scope).map(mark=>mark.id))};
  selectAllRow=scope;
  return;
 }
 handleSelection.value=null;
 const picked=selectedKeys.value,track=picked[0]?.track;
 const scope=track&&selectAllRow!==track.id&&graphKeyTracks.value.includes(track)&&picked.every(item=>item.track===track)
  ?track:null;
 selected.value=new Set((scope?[scope]:graphKeyTracks.value).flatMap(track=>track.keys.map(key=>key.id)));
 selectAllRow=scope?.id??null;
}
function chooseGraphHandle(id:string,additive:boolean){
 const previous=handleSelection.value;
 const ids=new Set(additive?previous?.ids:undefined);
 if(additive&&ids.has(id))ids.delete(id);else ids.add(id);
 handleSelection.value={ids,context:previous?.context??new Set(selected.value)};
 selected.value=new Set();
 selectionBoxes.value=[];
 selectAllRow=null;
}
function activateGraphHandle(event:KeyboardEvent,series:PlottedSeries,segment:TimelineBezierSegment,control:0|1){
 if(event.key!=='Enter'&&event.key!==' ')return;
 event.preventDefault();event.stopPropagation();
 if(editable.value&&!event.repeat)chooseGraphHandle(graphHandleId(series,segment,control),event.ctrlKey||event.metaKey);
}
function retainLiveGraphHandles(){
 selectAllRow=null;
 const handles=handleSelection.value;
 if(!handles)return;
 const live=new Set(liveGraphHandles().map(mark=>mark.id));
 const ids=new Set([...handles.ids].filter(id=>live.has(id)));
 const keys=new Set(plotted.value.flatMap(series=>series.track.keys.map(key=>key.id)));
 const context=new Set([...handles.context].filter(id=>keys.has(id)));
 if(ids.size!==handles.ids.size||context.size!==handles.context.size)handleSelection.value=ids.size?{ids,context}:null;
}
watch(plotted,()=>{
 if(marquee.value?.kind==='handles'||bezierDrag.value?.kind==='group')stopGesture?.();
 retainLiveGraphHandles();
});
watch(view,()=>{handleSelection.value=null;},{flush:'sync'});
watch(handleSelection,()=>{if(bezierDrag.value?.kind==='group')stopGesture?.();},{flush:'sync'});
type CurveControl = 'favor' | 'presets';
const curveControl=ref<CurveControl|null>(null),curveControlsId=useId(),commandBar=ref<HTMLElement|null>(null);
const favorMode=ref<GraphFavorMode>('favor'),favorAmount=ref(0);
function keyShownTarget(track:DisplayTrack):KeyShownTarget|null {
 const {channel,boneId,slotId,attachmentId,constraintId,physicsProperty}=track;
 if(!track.keys.length)return null;
 if(isTimelineBoneChannel(channel)&&(props.supportedChannels.includes(channel)||props.supportedChannels.includes(animationChannelFamily(channel)))){
  return {kind:'bone',bone:boneId,channel};
 }
 if(slotId!==undefined&&(channel==='rgba'||channel==='attachment'))return {kind:'slot',slot:slotId,channel};
 if(channel==='drawOrder')return {kind:'drawOrder'};
 if(channel==='deform'&&attachmentId!==undefined)return {kind:'deform',attachment:attachmentId};
 if(channel==='sequence'&&attachmentId!==undefined){
  const attachment=props.slots.find(slot=>slot.id===slotId)?.attachments.find(item=>item.id===attachmentId);
  return linkedTimelineSourceId(attachment)===undefined?{kind:'sequence',attachment:attachmentId}:null;
 }
 if(constraintId!==undefined){
  if(channel==='ik'||channel==='transformMix')return {kind:'constraint',constraint:constraintId,channel};
  if(channel==='physics'&&physicsProperty)return {kind:'constraint',constraint:constraintId,channel,property:physicsProperty};
 }
 return null;
}
const keyShownTargets=computed(()=>{
 let tracks:DisplayTrack[];
 if(view.value==='graph'){
  const progressId=graphProgress.value?.track.id;
  const curves=progressId?graphRowTracks.value.filter(track=>track.id===progressId):visibleGraphTracks.value;
  const included=new Set(curves.map(track=>track.id));
  tracks=[...curves,...graphRowTracks.value.filter(track=>track.channel==='sequence'&&!included.has(track.id))];
 }else tracks=filteredTracks.value;
 return tracks.map(keyShownTarget).filter((target):target is KeyShownTarget=>target!==null);
});
const keyShownRequest=computed<KeyShownRequest|null>(()=>{
 const {documentKey,projectRevision:revision,activeAnimationId:animation,currentFrame:frame}=props;
 if(!editable.value||!documentKey||revision===undefined||animation===null||!Number.isFinite(frame)||frame<0
    ||gestureActive.value||invalidDraft.value||nameEditor.value||favorAmount.value!==0||!keyShownTargets.value.length)return null;
 return {documentKey,revision,animation,frame,targets:keyShownTargets.value};
});
function keyShown():boolean {
 const request=keyShownRequest.value;
 if(!request)return false;
 emit('keyShown',request);
 return true;
}
const canToggleAdjust=computed(()=>view.value==='dopesheet'&&(editable.value||adjustEnabled.value));
function toggleAdjust(){
 if(!canToggleAdjust.value)return;
 stopGesture?.();
 adjustEnabled.value=!adjustEnabled.value;
}
const adjustEligibility=computed<{target:TimelineAdjustTarget}|{hint:string}>(()=>{
 const {documentKey,projectRevision:revision,activeAnimationId:animation,currentFrame:frame}=props;
 if(!editable.value||!documentKey||revision===undefined||animation===null||gestureActive.value||invalidDraft.value||nameEditor.value){
  return {hint:'animation_adjustFinishEdit'};
 }
 if(props.playing)return {hint:'animation_adjustPause'};
 const keys=selectedKeys.value,first=keys[0]?.track;
 if(!first||!isTimelineBoneChannel(first.channel)||keys.length!==selected.value.size)return {hint:'animation_adjustSelectKeys'};
 const bone=first.boneId,tool=animationChannelFamily(first.channel);
 const tracks=new Set(keys.map(item=>item.track)),shown=new Set(filteredTracks.value);
 if(tool==='shear'||[...tracks].some(track=>!shown.has(track)||track.boneId!==bone||!isTimelineBoneChannel(track.channel)
   ||animationChannelFamily(track.channel)!==tool))return {hint:'animation_adjustSelectKeys'};
 if(keys.length>MAX_ADJUST_KEYS)return {hint:'animation_adjustLimit'};
 const current=Math.fround(frame);
 if(!Number.isFinite(current)||current<0||current>MAX_ANIMATION_PREVIEW_FRAME)return {hint:'animation_adjustSelectCurrent'};
 for(const track of tracks){
  let currentId:number|undefined;
  for(const [index,key] of track.keys.entries()){
   if(sameAnimationFrame(key.frame,current))currentId=key.id;
   if(selected.value.has(key.id)&&(key.interpolation==='bezier'||track.keys[index-1]?.interpolation==='bezier')){
    return {hint:'animation_adjustBezier'};
   }
  }
  if(currentId===undefined||!selected.value.has(currentId))return {hint:'animation_adjustSelectCurrent'};
 }
 if(props.transformTool!==tool)return {hint:'animation_adjustMatchingTool'};
 if(props.selectedBoneIds.length!==1||props.selectedBoneIds[0]!==bone)return {hint:'animation_adjustMatchingBone'};
 return {target:{documentKey,revision,animation,frame:current,bone,tool,keyIds:keys.map(item=>item.key.id)}};
});
const adjustState=computed<TimelineAdjustState>(()=>{
 if(props.suspended||!adjustEnabled.value||view.value!=='dopesheet')return adjustDisabled;
 const eligibility=adjustEligibility.value;
 return {enabled:true,target:'target'in eligibility?eligibility.target:null};
});
const adjustStatus=computed(()=>{
 if(props.adjustDragging)return t('animation_adjustDragging');
 const eligibility=adjustEligibility.value;
 if('hint'in eligibility)return t(eligibility.hint);
 if(props.adjustWorkingPose)return t('animation_adjustWorkingPose');
 if(props.adjustViewportAvailable===false)return t('animation_adjustViewport');
 return t('animation_adjustReady',{tool:t(eligibility.target.tool)});
});
const visibleBoneCurves=computed<GraphKeyTrack[]>(()=>graphRowTracks.value.flatMap(track=>
 (graphScopeDriven.value||graphTrackShown(track))&&isTimelineBoneChannel(track.channel)&&track.keys.length
  ?[{bone:track.boneId,channel:track.channel,keys:track.keys}]:[]));
const canEditCurves=computed(()=>view.value==='graph'&&editable.value&&!graphProgress.value&&!invalidDraft.value&&
 !timingDragging.value&&!bezierDrag.value&&!marquee.value);
const hasSupportedCurveSelection=computed(()=>{
 if(!selected.value.size)return false;
 let count=0;
 for(const track of visibleBoneCurves.value)for(const key of track.keys)if(selected.value.has(key.id))count++;
 return count===selected.value.size;
});
const canFavor=computed(()=>canEditCurves.value&&(!selected.value.size||hasSupportedCurveSelection.value)&&
 canFavorGraphKeys(visibleBoneCurves.value,selected.value,props.currentFrame));
const canApplyPreset=computed(()=>canEditCurves.value&&hasSupportedCurveSelection.value&&allowedInterpolation('bezier')&&
 visibleBoneCurves.value.some(track=>track.keys.length>=2&&track.keys.some(key=>selected.value.has(key.id))));
const favorChanges=computed(()=>curveControl.value==='favor'&&canFavor.value&&favorAmount.value!==0
 ?graphFavorChanges(visibleBoneCurves.value,selected.value,props.currentFrame,favorAmount.value,favorMode.value):[]);
function stageFavor(amount:number){
 if(!canFavor.value||curveControl.value!=='favor')return;
 if(amount!==0&&favorAmount.value===0)emit('pause');
 favorAmount.value=amount;
}
function changeFavorMode(mode:GraphFavorMode){favorAmount.value=0;favorMode.value=mode;}
function commitCurveKeys(keys:Extract<RigEdit,{type:'setAnimationKeys'}>['keys']){
 if(!keys.length||!canEditCurves.value||props.activeAnimationId===null||props.projectRevision===undefined)return;
 emit('pause');
 emit('curveEdit',{type:'setAnimationKeys',animation:props.activeAnimationId,keys},props.projectRevision);
}
function applyFavor(){const changes=favorChanges.value;favorAmount.value=0;commitCurveKeys(changes);}
function applyPreset(preset:GraphPreset){
 if(curveControl.value==='presets'&&canApplyPreset.value)commitCurveKeys(graphPresetChanges(visibleBoneCurves.value,selected.value,preset));
}
function toggleCurveControl(control:CurveControl){
 favorAmount.value=0;
 curveControl.value=curveControl.value===control?null:control;
}
function closeCurveControls(){
 const open=curveControl.value;
 if(!open)return;
 favorAmount.value=0;curveControl.value=null;
 const testId=open==='favor'?'timeline-tool-favor':'timeline-tool-curve-presets';
 commandBar.value?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.focus();
}
watch(()=>[props.documentKey,props.projectRevision,props.activeAnimationId,props.currentFrame,view.value,visibleBoneCurves.value,canFavor.value],()=>{
 favorAmount.value=0;
 if(view.value!=='graph')curveControl.value=null;
},{flush:'sync'});
watch(selected,(next,previous)=>{
 if(next.size!==previous.size||[...next].some(id=>!previous.has(id)))favorAmount.value=0;
},{flush:'sync'});
const favorPreviewTracks=computed(()=>{
 const editsByTrack=new Map<string,typeof favorChanges.value>();
 for(const edit of favorChanges.value){
  const id=`${edit.bone}:${edit.channel}`;
  const edits=editsByTrack.get(id);
  if(edits)edits.push(edit);else editsByTrack.set(id,[edit]);
 }
 return graphRowTracks.value.flatMap(track=>{
  const edits=editsByTrack.get(graphTrackId(track));
  if(!edits)return [];
  const editsById=new Map(edits.flatMap(edit=>edit.keyId===undefined?[]:[[edit.keyId,edit] as const]));
  const keys=track.keys.map(key=>{
   const edit=editsById.get(key.id);
   return edit?{...key,values:edit.values,interpolation:edit.curve,controls:edit.controls}:key;
  });
  for(const edit of edits)if(edit.keyId===undefined)keys.push({id:-1,frame:edit.frame,values:edit.values,interpolation:edit.curve,controls:edit.controls});
  keys.sort((first,second)=>first.frame-second.frame);
  return graphSeries({...track,keys});
 });
});
const storedPlotted=computed(()=>graphProgress.value?[]:visibleStoredGraphTracks.value.filter(track=>graphScopeDriven.value||graphTrackShown(track)).flatMap(graphSeries));
const storedProgress=computed<ProgressSegment|undefined>(()=>{
 const progress=graphProgress.value;
 const track=progress&&storedGraphTracks.value.find(track=>track.id===progress.track.id);
 const key=track?.keys.find(item=>item.id===progress?.key.id);
 const next=key&&track?.keys.find(item=>item.frame>key.frame);
 return track&&key&&next?{track,key,next}:undefined;
});
function progressSeries(segment:ProgressSegment):GraphViewSeries{
 const {key,next}=segment;
 const keys=[{...key,values:[0],controls:key.progressControls?[key.progressControls]:null},{...next,values:[1],controls:null}];
 return {track:{keys},component:0};
}
const liveFitSeries=computed<readonly GraphViewSeries[]>(()=>graphProgress.value?[progressSeries(graphProgress.value)]:plotted.value);
const storedFitSeries=computed<readonly GraphViewSeries[]>(()=>storedProgress.value?[progressSeries(storedProgress.value)]:storedPlotted.value);
const allFitBounds=computed(()=>graphMounted.value?graphViewBounds([...liveFitSeries.value,...storedFitSeries.value]):null);
const graphRangeOverride=shallowRef<{min:number;max:number}|null>(null);
const graphRange=computed(()=>{
 if(graphRangeOverride.value)return graphRangeOverride.value;
 let min=0,max=1;
 for(const {track,component,projection} of [...liveFitSeries.value,...storedFitSeries.value])for(const key of track.keys){
  const handles=key.interpolation==='bezier'?key.controls?.[component]:undefined;
  for(const raw of [key.values[component],handles?.[1],handles?.[3]])if(raw!==undefined){
   const displayed=graphDisplayValue(raw,projection);
   if(Number.isFinite(displayed)){min=Math.min(min,displayed);max=Math.max(max,displayed);}
  }
 }
 const padding=(max-min)*.1;
 return {min:min-padding,max:max+padding};
});
const graphHeight=ref(260),graphWidth=ref(0);let resize:ResizeObserver|null=null;
watch([()=>panePlots.graph,()=>paneRulers.graph],([element,axis])=>{
 resize?.disconnect();
 if(!element||!axis)return;
 const measure=()=>{
  const height=element.clientHeight,width=axis.clientWidth;
  if(!props.suspended&&height>0&&width>0){graphHeight.value=height;graphWidth.value=width;}
 };
 measure();resize=new ResizeObserver(measure);resize.observe(element);
 resize.observe(axis);
});
const autoGraphFrame=ref(false);
const hasPathKeys=computed(()=>allTracks.value.some(track=>isTimelinePathChannel(track.channel)&&track.keys.length>0));
const canStoreGraph=computed(()=>view.value==='graph'&&editable.value&&(!!storedForClip.value||!hasPathKeys.value&&allKeys.value.length>0));
const canSwapGraph=computed(()=>view.value==='graph'&&editable.value&&!!storedForClip.value
 &&!hasPathKeys.value&&!storedGraphTracks.value.some(track=>isTimelinePathChannel(track.channel))
 &&!valueError.value&&!fpsError.value&&!progressError.value&&!eventError.value&&!sequenceError.value);
function toggleStoreGraph(){
 if(!canStoreGraph.value||props.activeAnimationId===null)return;
 emit('graphEdit',{type:storedForClip.value?'clearStoredAnimationKeys':'storeAnimationKeys',animation:props.activeAnimationId});
}
function swapStoredGraph(){
 if(canSwapGraph.value&&props.activeAnimationId!==null)emit('graphEdit',{type:'swapStoredAnimationKeys',animation:props.activeAnimationId});
}
let frameEpoch=0;
async function applyGraphFrame(bounds:ReturnType<typeof graphViewBounds>){
 if(props.suspended||!graphMounted.value||!bounds||!laidOutPlot('graph')||!graphWidth.value||gestureActive.value)return;
 const fit=graphViewFit(bounds,Math.max(1,graphWidth.value-18),graphCamera.value.lastFrame,graphCamera.value.origin);
 const epoch=++frameEpoch;
 graphRangeOverride.value={min:bounds.min,max:bounds.max};
 setZoom('graph',fit.pixelsPerFrame);
 await nextTick();
 const pane=laidOutPlot('graph');
 if(props.suspended||epoch!==frameEpoch||!pane||gestureActive.value)return;
 horizontalScroll('graph',fit.scrollLeft);
 const focusedRow=document.activeElement?.closest('.at-track-label');
 // Auto framing must keep a keyboard-operated curve visibility button in view.
 if(!focusedRow||!pane.contains(focusedRow))pane.scrollTop=0;
 paneTop.graph=pane.scrollTop;
}
function frameGraph(){
 const handles=handleSelection.value;
 if(handles?.ids.size){
  void applyGraphFrame(graphViewPointBounds(liveGraphHandles().filter(mark=>handles.ids.has(mark.id))));
  return;
 }
 const hasVisibleSelection=liveFitSeries.value.some(({track})=>track.keys.some(key=>selected.value.has(key.id)));
 void applyGraphFrame(hasVisibleSelection?graphViewBounds(liveFitSeries.value,selected.value):allFitBounds.value);
}
function toggleAutoFrame(){autoGraphFrame.value=!autoGraphFrame.value;}
let queuedAutoFrame=false;
watch([graphMounted,autoGraphFrame,graphWidth,()=>allFitBounds.value?.minFrame,()=>allFitBounds.value?.maxFrame,()=>allFitBounds.value?.min,()=>allFitBounds.value?.max],()=>{
 if(!autoGraphFrame.value){queuedAutoFrame=false;return;}
 if(gestureActive.value){queuedAutoFrame=true;return;}
 void applyGraphFrame(allFitBounds.value);
});
watch(gestureActive,activeGesture=>{
 if(activeGesture||!queuedAutoFrame)return;
 queuedAutoFrame=false;
 if(autoGraphFrame.value)void applyGraphFrame(allFitBounds.value);
});
watch(()=>props.suspended,async suspended=>{
 if(suspended){
  stopGesture?.();frameEpoch++;
  for(const mode of panes.value){
   const plot=laidOutPlot(mode);
   if(!plot)continue;
   paneScroll[mode]=plot.scrollLeft;
   if(!linkedTime.value)savedScroll[mode]=plot.scrollLeft;
   paneTop[mode]=plot.scrollTop;
  }
  return;
 }
 await nextTick();
 if(props.suspended)return;
 // Hidden scroll elements can report zero until their layout is restored.
 for(const mode of panes.value){
  const plot=laidOutPlot(mode);
  if(!plot)continue;
  horizontalScroll(mode,paneScroll[mode]);
  plot.scrollTop=paneTop[mode];
  paneTop[mode]=plot.scrollTop;
 }
},{flush:'sync'});
watch([()=>props.documentKey,()=>props.activeAnimationId],()=>{
 stopGesture?.();
 adjustEnabled.value=false;
 selected.value=new Set();
 handleSelection.value=null;
 collapsed.value=new Set();
 syncedSheetCollapsed.value=new Set();
 dopesheetSourceKeys.value=new Set();
 lockedRowScope.value=null;
 frameEpoch++;
 hiddenGraphTracks.value=new Set();
 graphRangeOverride.value=null;
 if(autoGraphFrame.value)void applyGraphFrame(allFitBounds.value);
});
const graphTicks=computed(()=>Array.from({length:5},(_,i)=>graphRange.value.min+(graphRange.value.max-graphRange.value.min)*i/4));
function graphY(value:number){const range=graphRange.value;return graphHeight.value-20-(value-range.min)/(range.max-range.min)*Math.max(20,graphHeight.value-40);}
function updateScroll(mode:TimelineView,event:Event){
 const plot=event.currentTarget as HTMLElement;
 if(props.suspended||plot.clientWidth<=0||plot.clientHeight<=0)return;
 paneTop[mode]=plot.scrollTop;
 if(linkedTime.value)horizontalScroll(mode,plot.scrollLeft);
 else savedScroll[mode]=paneScroll[mode]=plot.scrollLeft;
}
function graphKeys(track:DisplayTrack){return track.keys.map((key,index)=>{
 const preview=bezierDrag.value,controls=key.controls?.map(axis=>previewHandleFrames(axis,key,track.keys[index+1]));
 const changes=preview?.kind==='group'?preview.byKey.get(key.id):
  preview?.change.id===key.id?[preview.change]:undefined;
 if(changes&&controls)for(const {component,control,frame,value} of changes){
  const axis=controls[component];
  if(axis){axis[control*2]=frame;axis[control*2+1]=value;}
 }
 return {...key,frame:displayedFrame(key),controls};
});}
function seriesY(series:PlottedSeries,raw:number){return graphY(graphDisplayValue(raw,series.projection));}
function seriesValueLabel(series:PlottedSeries,raw:number){
 return frameText(graphDisplayValue(raw,series.projection))+(series.projection?.unit??'');
}
function graphPath(series:PlottedSeries){return timelineCurvePath(graphKeys(series.track),series.component,graphX,raw=>seriesY(series,raw));}
function storedGraphPath(series:PlottedSeries){return timelineCurvePath(series.track.keys,series.component,graphX,raw=>seriesY(series,raw));}
function selectedSegments(series:PlottedSeries){
 if(isTimelinePathChannel(series.track.channel))return [];
 const handles=handleSelection.value,keys=handles?.context??selected.value;
 return timelineBezierSegments(graphKeys(series.track),series.component).filter(segment=>
  keys.has(segment.key.id)||keys.has(segment.next.id)||graphControls.some(control=>handles?.ids.has(graphHandleId(series,segment,control))),
 );
}
function progressPath(){const segment=graphProgress.value;return segment?timelineProgressPath(displayedFrame(segment.key),displayedFrame(segment.next),segment.key.interpolation,progressControls.value,graphX,graphY):'';}
function storedProgressPath(){const segment=storedProgress.value;return segment?timelineProgressPath(segment.key.frame,segment.next.frame,segment.key.interpolation,segment.key.progressControls,graphX,graphY):'';}
const graphContextId=useId(),graphContextClipId=`${graphContextId}-clipped`,graphRepeatSourceId=`${graphContextId}-period`;
const repeatPeriod=computed(()=>props.loop&&Number.isFinite(storedDuration.value)&&storedDuration.value>0?storedDuration.value:0);
const graphContextWindow=computed(()=>({start:Math.max(0,paneScroll.graph-48),end:Math.min(graphCamera.value.width,paneScroll.graph+graphWidth.value+48)}));
const repeatOffsets=computed(()=>graphRepeatOffsets(repeatPeriod.value*graphCamera.value.zoom,graphCamera.value.origin,
 graphContextWindow.value.start,graphContextWindow.value.end));
const graphEdgePaths=computed(()=>{
 const {origin,zoom,width}=graphCamera.value;
 const start=repeatPeriod.value?0:-origin/zoom;
 const end=repeatPeriod.value||(width-origin)/zoom;
 return plotted.value.flatMap(series=>{
  const channel=series.track.channel;
  const setup=isTimelineBoneChannel(channel)?(animationChannelFamily(channel)==='scale'?1:0):undefined;
  return graphKeyHolds(series.track.keys,series.component,setup,start,end).map(span=>({
   id:`${series.id}:${span.from}`,color:series.color,d:`M${graphX(span.from)},${seriesY(series,span.value)}H${graphX(span.to)}`,
  }));
 });
});
const graphRepeatPaths=computed(()=>repeatPeriod.value>0?plotted.value.map(series=>({
 id:series.id,color:series.color,d:storedGraphPath(series),
})):[]);
function resetProgress(){progressDraft.value=singleKey.value?.track.channel==='deform'?singleKey.value.key.progressControls?.map(rangeText)??[]:[];progressError.value=false;submittedProgress.value='';}
function validateProgress(){const item=singleKey.value,segment=currentProgress.value;progressError.value=!!item&&item.track.channel==='deform'&&item.key.interpolation==='bezier'&&(progressDraft.value.length!==4||progressDraft.value.some(v=>!String(v).trim()||!Number.isFinite(Number(v)))||!!segment&&[0,2].some(index=>Number(progressDraft.value[index])<item.key.frame||Number(progressDraft.value[index])>segment.next.frame));return !progressError.value;}
function commitProgress(){
 const item=singleKey.value;
 if(!item||item.track.channel!=='deform'||!editable.value||!validateProgress())return;
 const controls=progressDraft.value.map(Number) as TimelineBezierControls;
 const signature=item.key.id+':'+controls.map(rangeText).join(',');
 if(signature===submittedProgress.value||controls.every((value,index)=>Object.is(value,item.key.progressControls?.[index])))return;
 submittedProgress.value=signature;
 emit('updateDeformCurve',{id:item.key.id,curve:'bezier',controls});
}
function dragProgress(event:PointerEvent,control:0|1){
 const segment=graphProgress.value,controls=progressControls.value;if(event.button!==0||!editable.value||!segment||!controls)return;
 if((event.ctrlKey||event.metaKey)&&handleSelection.value?.ids.size){startMarquee(event);return;}
 emit('pause');
 event.preventDefault();event.stopPropagation();const initial={frame:controls[control*2]!,value:controls[control*2+1]!},screen={x:event.clientX,y:event.clientY},range={...graphRange.value},height=graphHeight.value;
 progressDrag.value={id:segment.key.id,control,...initial};
 gesture(event,move=>{if(progressDrag.value)progressDrag.value={id:segment.key.id,control,...timelineBezierDragPoint(initial,{x:move.clientX-screen.x,y:move.clientY-screen.y},pixelsPerFrame.value,height,range,segment.key.frame,segment.next.frame)};},cancel=>{const completed=progressDrag.value;progressDrag.value=null;if(cancel||!completed||!editable.value||completed.frame===initial.frame&&completed.value===initial.value)return;const result=[...controls] as TimelineBezierControls;result[control*2]=completed.frame;result[control*2+1]=completed.value;emit('updateDeformCurve',{id:segment.key.id,curve:'bezier',controls:result});});
}
function dragHandle(event:PointerEvent,series:PlottedSeries,segment:TimelineBezierSegment,control:0|1){
 if(event.button!==0||!editable.value||isTimelinePathChannel(series.track.channel))return;
 const id=graphHandleId(series,segment,control);
 if(event.ctrlKey||event.metaKey){startMarquee(event,undefined,id);return;}
 stopGesture?.();
 emit('pause');
 event.preventDefault();event.stopPropagation();
 (scroller.value?.closest('.animation-timeline') as HTMLElement|null)?.focus({preventScroll:true});
 const liveSeries=plotted.value.find(candidate=>candidate.id===series.id);
 const liveSegment=liveSeries&&timelineBezierSegments(liveSeries.track.keys,liveSeries.component)
  .find(candidate=>candidate.key.id===segment.key.id&&candidate.next.id===segment.next.id);
 if(!liveSeries||!liveSegment)return;
 const {key,next,controls}=liveSegment;
 const {documentKey,projectRevision:revision,activeAnimationId:animation}=props;
 const height=graphHeight.value;
 const canFinish=()=>editable.value&&view.value==='graph'&&props.documentKey===documentKey&&
  props.projectRevision===revision&&props.activeAnimationId===animation&&graphHeight.value===height;
 const {component,projection,track}=liveSeries,bone=isTimelineBoneChannel(track.channel);
 const initial={frame:controls[control*2]!,value:controls[control*2+1]!};
 const origin={x:event.clientX,y:event.clientY},range={...graphRange.value},zoom=pixelsPerFrame.value;
 // A valid monotone bone time cubic may have handles beyond the far key.
 // Keep other families' established segment-local editing bounds unchanged.
 const timeStart=bone&&control===1?0:key.frame,timeEnd=bone&&control===0?1_000_000:next.frame;
 const pointAt=(pointer:PointerEvent,scrollX=0,scrollY=0)=>{
  const delta={x:pointer.clientX-origin.x+scrollX,y:pointer.clientY-origin.y+scrollY};
  const point=timelineBezierDragPoint({frame:initial.frame,value:0},delta,zoom,height,range,timeStart,timeEnd);
  return {frame:point.frame,value:graphRawValueAfterDelta(initial.value,point.value,projection)};
 };
 const selection=handleSelection.value;
 if(!event.altKey&&!event.shiftKey&&selection&&selection.ids.size>1&&selection.ids.has(id)){
  const surface=scroller.value,handles=captureGraphHandleGroup(selection.ids),seriesAtStart=plotted.value;
  const scrollLeft=surface?.scrollLeft??0,scrollTop=surface?.scrollTop??0,width=graphWidth.value;
  const scopeIsCurrent=()=>canFinish()&&scroller.value===surface&&handleSelection.value===selection&&plotted.value===seriesAtStart&&
   pixelsPerFrame.value===zoom&&graphWidth.value===width&&graphRange.value.min===range.min&&graphRange.value.max===range.max;
  const changesAt=(pointer:PointerEvent)=>{
   if(!handles||!surface||!scopeIsCurrent())return null;
   const scrollX=surface.scrollLeft-scrollLeft;
   const point=pointAt(pointer,scrollX,surface.scrollTop-scrollTop);
   if(pointer.clientX-origin.x+scrollX===0)point.frame=initial.frame;
   return groupedGraphBezierChanges(handles,id,point);
  };
  let moved=false;
  bezierDrag.value={kind:'group',byKey:new Map()};
  gesture(event,move=>{
   moved ||= Math.hypot(move.clientX-origin.x,move.clientY-origin.y)>=3;
   if(!moved)return;
   const byKey=new Map<number,GraphBezierGroupChange[]>();
   for(const change of changesAt(move)??[]){
    const changes=byKey.get(change.id);
    if(changes)changes.push(change);else byKey.set(change.id,[change]);
   }
   bezierDrag.value={kind:'group',byKey};
  },(cancel,tap,release)=>{
   bezierDrag.value=null;
   if(cancel||!scopeIsCurrent())return;
   if(tap){chooseGraphHandle(id,false);return;}
   const changes=release?changesAt(release):null;
   if(changes?.length&&documentKey&&revision!==undefined&&animation!==null){
    emit('updateBezierGroup',{documentKey,revision,animation,changes});
   }
  },surface??undefined);
  return;
 }
 const changeAt=(pointer:PointerEvent):BezierPointEdit=>({id:key.id,component,control,...pointAt(pointer)});
 bezierDrag.value={kind:'single',change:{id:key.id,component,control,...initial}};
 gesture(event,move=>{bezierDrag.value={kind:'single',change:changeAt(move)};},(cancel,tap)=>{
  const completed=bezierDrag.value?.kind==='single'?bezierDrag.value.change:null;
  bezierDrag.value=null;
  if(cancel||!canFinish())return;
  if(tap){chooseGraphHandle(id,false);return;}
  if(completed&&(completed.frame!==initial.frame||completed.value!==initial.value))emit('updateBezier',completed,revision);
 });
}
watch(()=>props.currentFrame,value=>{if(marquee.value||progressDrag.value||bezierDrag.value||timingDragging.value)stopGesture?.();currentDraft.value=String(Math.round(value*1000)/1000);});
watch(()=>props.fps,resetFps);
watch([view,pixelsPerFrame,rows],()=>{
 if(marquee.value||progressDrag.value||bezierDrag.value||timingDragging.value)stopGesture?.();
 selectionBoxes.value=[];
},{flush:'sync'});
watch([setupBonesById,graphHeight],()=>{if(bezierDrag.value)stopGesture?.();});
watch([graphHeight,graphWidth,()=>graphRange.value.min,()=>graphRange.value.max],()=>{
 if(marquee.value?.kind==='handles'||bezierDrag.value?.kind==='group')stopGesture?.();
},{flush:'sync'});
watch(fpsDraft,validateFps,{flush:'sync'});
watch(()=>[props.documentKey,props.projectRevision,props.activeAnimationId,props.loopStart,props.loopEnd],()=>{
 if(timingDragging.value||bezierDrag.value||marquee.value?.kind==='handles')stopGesture?.();
 if(handleSelection.value)retainLiveGraphHandles();
 selectionBoxes.value=[];
});
watch(selected,(next,previous)=>{
 if(next.size===previous.size&&[...next].every(id=>previous.has(id)))return;
 selectAllRow=null;
 if(selectionBoxes.value.some(box=>box.keys.some(id=>!next.has(id)))){
  selectionBoxes.value=selectionBoxes.value.filter(box=>box.keys.every(id=>next.has(id)));
 }
 if(offsetDrag.value)stopGesture?.();
 emit('resetOffset');
},{flush:'sync'});
watch(()=>[props.loopStart,props.loopEnd,props.activeAnimationId],resetLoopDrafts,{immediate:true});
watch([()=>props.loopStart,()=>props.loopEnd],()=>{if(offsetDrag.value)stopGesture?.();},{flush:'sync'});
watch(nameEditor,async value=>{if(value){await nextTick();nameInput.value?.focus();}});
watch(()=>singleKey.value?.key,()=>{resetValues();resetProgress();},{immediate:true,deep:true});
watch(keyDraft,validateValues,{deep:true,flush:'sync'});
watch(progressDraft,validateProgress,{deep:true,flush:'sync'});
watch(invalidDraft,invalid=>emit('draftValidity',invalid),{flush:'sync'});
watch(()=>[props.tracks,props.slotTracks,props.deformTracks,props.drawOrderKeys,props.constraintTracks,props.eventTracks,props.sequenceTracks],()=>{if(timingDragging.value||bezierDrag.value||progressDrag.value||marquee.value)stopGesture?.();const ids=new Set(allKeys.value.map(item=>item.key.id));selected.value=new Set([...selected.value].filter(id=>ids.has(id)));},{deep:true});
watch(()=>props.disabled,value=>{if(value)stopGesture?.();else{submittedValue.value='';submittedProgress.value='';submittedFps.value=null;}});
watch(adjustState,state=>emit('adjustState',state),{immediate:true});
watch(toolbarShown,visible=>{
 if(visible)return;
 filterOpen.value=false;
 curveControl.value=null;
 favorAmount.value=0;
});
onBeforeUnmount(()=>{stopGesture?.();resize?.disconnect();emit('draftValidity',false);emit('resetOffset');emit('adjustState',adjustDisabled);});
defineExpose({beginName,keyShown,curveSegmentSelections});
</script>

<template>
 <section class="animation-timeline" data-testid="animation-timeline" :aria-label="label('timeline','Animation timeline')" tabindex="0" @keydown="keydown">
  <span v-if="view==='dopesheet'" class="sr-only" role="status">{{ t('selectedCount',{count:selected.size}) }}</span>
  <span v-else-if="handleSelection?.ids.size" class="sr-only" role="status">{{ t('animation_selectedHandles',handleSelection.ids.size) }}</span>
  <header class="at-tabs">
   <div class="at-header-scroller">
    <button :class="{active:view==='graph'}" data-testid="timeline-tab-graph" @click="selectView('graph')">⌁ {{ label('graph','Graph') }}</button>
    <button :class="{active:view==='dopesheet'}" data-testid="timeline-tab-dopesheet" @click="selectView('dopesheet')">▦ {{ label('dopesheet','Dopesheet') }}</button>
    <button type="button" class="at-stack-toggle" :class="{active:stacked}" :aria-pressed="!!stacked"
     :aria-label="t('animation_stackTimelines')" :title="t('animation_stackTimelines')" data-testid="timeline-stack"
     @click="emit('update:stacked',!stacked)">▤</button>
    <span class="at-header-spacer" />
    <template v-if="nameEditor">
     <form class="at-animation-name" @submit.prevent="submitName"><input ref="nameInput" v-model="nameDraft" data-testid="animation-name" :aria-label="label('name','Animation name')" @keydown.esc="nameEditor=null"/><button type="submit">✓</button><button type="button" @click="nameEditor=null">×</button></form>
    </template>
    <template v-else>
     <select :value="activeAnimationId??''" :disabled="disabled||!animations.length" data-testid="animation-select" :aria-label="label('active','Active animation')" @change="emit('selectAnimation',Number(($event.target as HTMLSelectElement).value))"><option v-if="!animations.length" value="">{{ label('noAnimation','No animation') }}</option><option v-for="animation in animations" :key="animation.id" :value="animation.id">{{ animation.name }}</option></select>
     <button :disabled="disabled" data-testid="animation-create" :title="label('new','New animation')" :aria-label="label('new','New animation')" @click="beginName('create')">＋</button>
     <button class="at-clip-action" :disabled="!editable" data-testid="animation-rename" :title="label('rename','Rename animation')" :aria-label="label('rename','Rename animation')" @click="beginName('rename')">✎</button>
     <button class="at-clip-action" :disabled="!editable" data-testid="animation-duplicate" :title="label('duplicate','Duplicate animation')" :aria-label="label('duplicate','Duplicate animation')" @click="active&&emit('duplicateAnimation',active.id)">⧉</button>
     <button class="at-clip-action" :disabled="!editable" data-testid="animation-delete" :title="label('deleteAnimation','Delete animation')" :aria-label="label('deleteAnimation','Delete animation')" @click="active&&emit('deleteAnimation',active.id)">×</button>
    </template>
   </div>
   <TimelineNavigationSettings :view="view" :options="navigationOptions" @update="updateTimelineOption"/>
   <TimelinePaneActions v-if="!suspended"/>
  </header>
  <div v-if="toolbarShown" ref="commandBar" class="at-toolbar at-command-bar" data-testid="timeline-planned-tools">
   <TimelineRowControls :locked="locked" :can-lock="editable" :can-refresh="editable&&locked"
    :sync-mode="view==='dopesheet'?syncMode:undefined" :can-sync="editable" :scope-driven="sheetDrivesGraph"
    :can-select="canSelectShown" :filter-open="filterOpen" :filter-active="filterActive" :filter-panel-id="filterPanelId"
    :can-key-shown="!!keyShownRequest" :key-shown-shortcut="keyShownShortcut"
    @toggle-filter="filterOpen=!filterOpen" @toggle-filtering="toggleFiltering" @toggle-lock="toggleLock"
    @refresh="refreshRows" @select="selectShownBones" @key-shown="keyShown" @set-sync-mode="setSyncMode"/>
   <div class="at-tool-group"><button :disabled="!canCopySelection" aria-label="Copy keys" title="Copy selected keys (Ctrl+C)" data-testid="timeline-copy" @click="copySelected">⧉</button><button :disabled="!canPaste||!editable" aria-label="Paste keys" title="Paste keys at current frame (Ctrl+V)" data-testid="timeline-paste" @click="emit('pasteKeys')">▣</button><button :disabled="!selected.size||!editable" :title="label('deleteKeys','Delete selected keys')" :aria-label="label('deleteKeys','Delete selected keys')" data-testid="timeline-delete-keys" @click="removeSelected">⌫</button></div>
   <div class="at-tool-group at-interpolation"><button v-for="curve in (['linear','stepped','bezier'] as const)" :key="curve" :class="{active:selectedKeys.length&&selectedKeys.every(k=>k.key.interpolation===curve)}" :disabled="!editable||!continuousSelection||!allowedInterpolation(curve)" :title="twoColorSelection&&curve!=='linear'?t('slotTwoColorLinearOnly'):supportedInterpolations.includes(curve)?label(curve,curve):label('unavailable','Not available for this animation profile')" :aria-label="label(curve,curve)" :data-testid="'timeline-interpolation-'+curve" @click="interpolation(curve)">{{ curve==='linear'?'╱':curve==='stepped'?'⌜':'⌁' }}</button></div>
   <AnimationToolShelf :mode="view" :can-frame="!!allFitBounds" :auto-frame="autoGraphFrame"
    :can-store="canStoreGraph" :has-stored="!!storedForClip" :can-swap="canSwapGraph"
    :open-curve-control="curveControl" :curve-controls-id="curveControlsId" :can-favor="canFavor" :can-presets="canApplyPreset"
    :can-shift="canShiftKeys" :shift-keys="shiftKeys" @toggle-shift="toggleTimingTool('shift')"
    :can-offset="canOffsetKeys" :offset-keys="offsetKeys" :offset-dragging="!!offsetDrag" @toggle-offset="toggleTimingTool('offset')"
    :can-adjust="canToggleAdjust" :adjust-enabled="adjustEnabled" :adjust-status-id="adjustStatusId" @toggle-adjust="toggleAdjust"
    @frame="frameGraph" @toggle-auto="toggleAutoFrame" @toggle-store="toggleStoreGraph" @swap="swapStoredGraph" @toggle-curve-control="toggleCurveControl"/>
   <div class="at-tool-group at-channel-buttons"><button v-for="channel in timelineChannels" :key="channel" :style="{color:timelineChannelColor[channel]}" :disabled="!editable||!channelSupported(channel)||!selectedBoneIds.length||slotOnly" :title="channelSupported(channel)?label('key','Key')+' '+channelLabel(channel):label('unavailableChannel','This channel is not yet supported by the animation format profile')" :aria-label="label('key','Key')+' '+channelLabel(channel)" :data-testid="'timeline-key-'+channel" @click="insert(channel)">{{ channel==='rotate'?'⟳':channel==='translate'?'✥':channel==='scale'?'▣':'⌁' }}<span>{{ channelLabel(channel) }}</span><i><AppIcon name="key" class="!size-3"/></i></button></div>
   <div class="at-tool-group"><button :class="{active:autoKey}" :disabled="!editable" :aria-pressed="autoKey" data-testid="timeline-auto-key" @click="emit('toggleAutoKey')">◉ {{ label('autoKey','Auto Key') }}</button></div>
   <div class="at-tool-group at-current"><label for="animation-current">{{ label('current','Current') }}</label><input id="animation-current" v-model="currentDraft" type="number" min="0" step="1" :disabled="!active||disabled" data-testid="timeline-current" @focus="emit('pause')" @change="commitCurrent" @keydown.enter.prevent="commitCurrent" @keydown.esc="currentDraft=String(currentFrame)"/></div>
   <div class="at-tool-group at-loop-range"><button :disabled="!active||disabled" @click="emit('pause');setLoop('start')">{{ label('loopStart','Loop Start') }}</button><input v-model="loopStartDraft" :disabled="!active||disabled" type="number" min="0" step="any" :aria-label="label('loopStart','Loop Start')" data-testid="timeline-loop-start" @focus="emit('pause')" @change="changeLoop('start',String(loopStartDraft))" @keydown.enter.stop.prevent="changeLoop('start',String(loopStartDraft))" @keydown.esc.stop.prevent="resetLoopDrafts"/><button :disabled="!active||disabled" @click="emit('pause');setLoop('end')">{{ label('end','End') }}</button><input v-model="loopEndDraft" :disabled="!active||disabled" type="number" min="0" step="any" :aria-label="label('end','End')" data-testid="timeline-loop-end" @focus="emit('pause')" @change="changeLoop('end',String(loopEndDraft))" @keydown.enter.stop.prevent="changeLoop('end',String(loopEndDraft))" @keydown.esc.stop.prevent="resetLoopDrafts"/></div>
  </div>
  <TimelineRowFilters v-if="toolbarShown&&filterOpen" :id="filterPanelId" :options="filterOptions" :mode="rowFilter.mode"
   :can-use-current-tool="currentTransform!==null" :can-reset="rowFilter.mode!=='categories'||rowFilter.categories.size!==filterCategories.length"
   @mode="setFilterMode" @category="selectFilterCategory" @reset="updateRowFilter(defaultRowFilter)" @close="closeRowFilters"/>
  <GraphCurveControls v-if="toolbarShown&&view==='graph'&&curveControl" :id="curveControlsId" :kind="curveControl"
    :favor-mode="favorMode" :favor-amount="favorAmount" :can-apply-favor="!!favorChanges.length" :can-apply-preset="canApplyPreset"
    :disabled="curveControl==='favor'&&!canFavor" @keydown.esc.capture.stop.prevent="closeCurveControls"
    @update:favor-mode="changeFavorMode" @update:favor-amount="stageFavor" @apply-favor="applyFavor" @apply-preset="applyPreset" @cancel-favor="favorAmount=0"/>
  <p v-if="offsetKeys" class="shrink-0 px-2 text-[10px] leading-4 text-muted" :class="{'text-warning!':offsetDrag||offsetProblem}"
   role="status" :aria-live="offsetDrag?'off':'polite'" data-testid="timeline-offset-status">{{offsetStatus}}</p>
  <p v-if="adjustEnabled" :id="adjustStatusId" class="shrink-0 px-2 text-[10px] leading-4 text-muted"
   role="status" data-testid="timeline-adjust-status">{{adjustStatus}}</p>
  <p v-if="sheetDrivesGraph" class="shrink-0 px-2 text-[10px] leading-4 text-muted"
   role="status" data-testid="timeline-sync-graph-scope">{{t(visibleGraphTracks.length?'animation_syncGraphScope':'animation_syncGraphEmpty')}}</p>
  <div class="at-panes" :class="{'is-stacked':stacked,'has-linked-time':linkedTime}">
  <section v-for="pane in panes" :key="pane" v-pane-focus="pane" class="at-pane" :data-testid="'timeline-pane-'+pane"
   :class="{'is-gutterless':!hasRowGutter(pane),'has-hidden-labels':!timelineOptions[pane].showRows}"
   :data-active="pane===view" :aria-label="stacked?t('animation_stackTimelinePane',{view:pane==='graph'?label('graph','Graph'):label('dopesheet','Dopesheet')}):undefined"
   @wheel.capture="guardPaneWheel">
  <div class="at-ruler-row" :class="{'has-transport':!stacked||pane==='graph'}">
   <div v-if="!stacked||pane==='graph'" class="at-transport">
    <button :disabled="!active||disabled" :title="label('first','First frame')" :aria-label="label('first','First frame')" @click="emit('seek',0)">|◀</button>
    <button :disabled="!active||disabled" :title="label('previousKey','Previous key')" :aria-label="label('previousKey','Previous key')" @click="emit('seek',[...overviewFrames].reverse().find(f=>f<currentFrame-.001)??0)">◀|</button>
    <button :disabled="!active||disabled" :title="label('previousFrame','Previous frame')" :aria-label="label('previousFrame','Previous frame')" @click="emit('seek',Math.max(0,Math.ceil(currentFrame)-1))">◀</button>
    <button :disabled="!active||disabled" :title="playing?label('pause','Pause'):label('play','Play')" :aria-label="playing?label('pause','Pause'):label('play','Play')" data-testid="timeline-play" :class="{active:playing}" @click="playing?emit('pause'):emit('play')">{{ playing?'Ⅱ':'▶' }}</button>
    <button :disabled="!active||disabled" :title="label('nextFrame','Next frame')" :aria-label="label('nextFrame','Next frame')" @click="emit('seek',Math.floor(currentFrame)+1)">▶|</button>
    <button :disabled="!active||disabled" :title="label('nextKey','Next key')" :aria-label="label('nextKey','Next key')" @click="emit('seek',overviewFrames.find(f=>f>currentFrame+.001)??durationFrames)">|▶</button>
    <button :disabled="!active||disabled" :title="label('last','Last frame')" :aria-label="label('last','Last frame')" @click="emit('seek',durationFrames)">▶|</button>
    <button :disabled="!active||disabled" :class="{active:loop}" :aria-pressed="loop" :title="label('repeat','Repeat')" :aria-label="label('repeat','Repeat')" data-testid="timeline-repeat" @click="emit('toggleLoop')">⟳</button>
   </div>
   <button v-else-if="hasRowGutter(pane)" type="button" class="at-pane-title" :aria-pressed="view===pane"
    @click="selectView(pane)">{{label('dopesheet','Dopesheet')}}</button>
   <div :ref="element=>{paneRulers[pane]=element as HTMLElement|null}" class="at-ruler" data-testid="timeline-ruler" @pointerdown="seekPointer">
    <div class="at-ruler-content" :style="{width:cameras[pane].width+'px',transform:`translateX(${-paneScroll[pane]}px)`,backgroundSize:cameras[pane].zoom+'px 12px',backgroundPosition:`${cameras[pane].origin%cameras[pane].zoom}px bottom`}">
     <span v-for="frame in cameras[pane].ticks" :key="frame" class="at-ruler-label" :data-timeline-frame="frame" :style="{left:frameX(frame,pane)+'px'}">{{ frame }}</span>
     <span v-for="frame in paneOverviewFrames[pane]" :key="'key-'+frame" class="at-overview-diamond" :style="{left:frameX(frame,pane)+'px'}"/>
     <span class="at-playhead-tip" :style="{left:frameX(currentFrame,pane)+'px'}"><b>{{ Math.round(currentFrame*100)/100 }}</b>▼</span>
    </div>
   </div>
  </div>
  <p v-if="pane===view&&twoColorSelection" role="status" class="px-2 text-[10px] leading-4 text-muted" data-testid="timeline-two-color-limit">{{t('slotTwoColorLinearOnly')}}</p>
  <div class="at-plot">
  <div  :ref="element=>{panePlots[pane]=element as HTMLElement|null}" class="at-scroller" :class="{'is-graph':pane==='graph'}" data-testid="timeline-scroll" @scroll="updateScroll(pane,$event)" @pointerdown="gridPointer" @contextmenu.prevent>
   <div class="at-track-area" data-testid="timeline-track-area" :style="{width:`calc(var(--at-gutter) + ${cameras[pane].width}px)`,minHeight:pane==='graph'?graphHeight+'px':undefined}">
    <div class="at-track-row at-overview-row">
     <div v-if="timelineOptions[pane].showRows" class="at-track-label">♧ <span>{{ active?.name??label('noAnimation','No animation') }}</span>
      <GraphVisibilityButton v-if="pane==='graph'&&graphTrackScopes.ids.size" id="overview"
       :label="t('animation_graphVisibilityAll')" :pressed="graphVisibility(graphTrackScopes.ids)??false"
       @toggle="toggleGraphTracks(graphTrackScopes.ids)"/>
     </div>
     <div v-if="pane==='dopesheet'" v-memo="[paneSummaryKeys[pane],selected,drag?.delta,drag?.moving,scaleDrag,cameras[pane].origin,cameras[pane].zoom]" class="at-time-cells"><i v-for="item in paneSummaryKeys[pane]" :key="item.id" class="at-summary-key" :class="{selected:selected.has(item.id)}" :data-timeline-key-id="item.id" :style="{left:frameX(displayedFrame(item),pane)+'px'}"/></div>
    </div>
    <div v-for="row in paneRows[pane]" :key="row.id" v-memo="[row,pane,timelineOptions[pane].showRows,selected,drag?.delta,drag?.moving,scaleDrag,cameras[pane].origin,cameras[pane].zoom,cameras[pane].majorStep,cameras[pane].width,canInsertRow(row),pane==='graph'?rowGraphVisibility(row):undefined,!row.track?paneSummaryTracks[pane]:undefined,collapsedFor(pane).has(row.bone?.id??-1),(pane==='graph'&&graphScopeDriven),selectedBoneIds.includes(row.bone?.id??-1),selectedSlotIds.includes(row.slot?.id??-1),selectedConstraintIds.includes(row.constraint?.id??-1),locale]" class="at-track-row" :data-testid="row.track?'timeline-property-row-'+row.track.id:'timeline-bone-row-'+row.bone?.id" :class="{'at-bone-row':!row.track,'at-property-row':!!row.track&&row.track.channel!=='drawOrder','at-global-row':row.track?.channel==='drawOrder'}">
     <div v-if="timelineOptions[pane].showRows" class="at-track-label" :class="{selected:row.constraint?selectedConstraintIds.includes(row.constraint.id):row.slot?selectedSlotIds.includes(row.slot.id):selectedBoneIds.includes(row.bone?.id??-1)}" @click="chooseRow($event,row)">
      <button v-if="!row.track&&!(pane==='graph'&&graphScopeDriven)" class="at-collapse" :aria-label="(collapsedFor(pane).has(row.bone!.id)?label('expand','Expand'):label('collapse','Collapse'))+' '+row.bone!.name" @click.stop="toggleBone(row.bone!.id,pane)">{{ collapsedFor(pane).has(row.bone!.id)?'+':'−' }}</button>
      <span v-else-if="row.track" class="at-property-icon" :style="{color:timelineChannelColor[row.track.channel]}">{{ row.track.channel==='rotate'?'⟳':row.track.channel==='translate'?'✥':row.track.channel==='scale'?'▣':row.track.channel==='attachment'?'◇':row.track.channel==='rgba'?'●':row.track.channel==='deform'?'◇':row.track.channel==='drawOrder'?'☷':'⌁' }}</span>
      <span>{{ row.track?(row.constraint?row.constraint.name+' · ':row.event?row.event.name+' · ':row.slot?row.slot.name+' · ':'')+(row.deform?deformName(row)+' · ':row.sequence?sequenceName(row)+' · ':'')+(row.track.channel==='physics'?physicsLabel(row.track.physicsProperty):channelLabel(row.track.channel)):row.bone!.name }}</span>
      <button v-if="row.track" class="at-row-key-button" :disabled="!canInsertRow(row)" :title="isTimelinePathChannel(row.track.channel)?t('pathAnimationReadOnly'):canInsertRow(row)?label('key','Key'):label('unavailableChannel','This channel is not yet supported by the animation format profile')" :aria-label="label('key','Key')+' '+rowName(row)+' '+channelLabel(row.track.channel)" :data-testid="row.constraint?`timeline-key-constraint-${row.constraint.id}-${row.track.constraintKind}${row.track.physicsProperty?'-'+row.track.physicsProperty:''}`:row.event?`timeline-key-event-${row.event.id}`:row.track.channel==='drawOrder'?'timeline-key-draw-order':row.deform?`timeline-key-deform-${row.deform.attachmentId}`:row.sequence?`timeline-key-sequence-${row.sequence.attachmentId}`:row.slot?`timeline-key-slot-${row.slot.id}-${row.track.channel}`:`timeline-key-bone-${row.bone!.id}-${row.track.channel}`" @click.stop="insertRow(row)"><AppIcon name="key" class="!size-3"/></button>
      <GraphVisibilityButton v-if="pane==='graph'&&rowGraphVisibility(row)!==undefined"
       :id="row.track?graphTrackId(row.track):row.id" :label="rowGraphLabel(row)"
       :pressed="rowGraphVisibility(row)??false" @toggle="toggleGraphTracks(rowGraphIds(row))"/>
     </div>
     <div v-if="pane==='dopesheet'||row.track?.channel==='sequence'" class="at-time-cells" :style="{backgroundSize:`${cameras[pane].zoom*cameras[pane].majorStep}px 100%`,backgroundPositionX:`${cameras[pane].gridOrigin}px`}">
      <template v-if="row.track"><svg class="at-row-connections" :width="cameras[pane].width" height="23" aria-hidden="true"><path v-for="connection in connections(row.track)" :key="connection.key.id" :d="connectionPath(connection.key,connection.next,pane)" :stroke="timelineChannelColor[row.track.channel]" :stroke-dasharray="connection.key.interpolation==='stepped'?'2 3':undefined" fill="none"/></svg><button v-for="key in row.track.keys" :key="key.id" class="at-key" :data-timeline-key-id="key.id" :class="{selected:selected.has(key.id),'at-attachment-key':['attachment','drawOrder','physicsReset','event','sequence'].includes(row.track.channel)}" :title="keyLabel(row.track,key)" :style="{left:frameX(displayedFrame(key),pane)+'px',color:timelineChannelColor[row.track.channel]}" :aria-label="rowName(row)+' '+channelLabel(row.track.channel)+' '+label('frame','frame')+' '+key.frame+' '+keyLabel(row.track,key)" :aria-pressed="selected.has(key.id)" :data-testid="'timeline-key-'+key.id" @pointerdown.stop="dragKey($event,key)" @keydown="activateKey(key,$event)"/></template>
      <template v-else><i v-for="key in keysForBone(row.bone!.id,pane)" :key="key.id" class="at-summary-key" :class="{selected:selected.has(key.id)}" :data-timeline-key-id="key.id" :style="{left:frameX(displayedFrame(key),pane)+'px'}"/></template>
     </div>
    </div>
    <div v-if="pane==='graph'" v-memo="[plotted,storedPlotted,storedProgress,graphProgress,progressControls,graphRange,graphHeight,cameras[pane].width,cameras[pane].zoom,cameras[pane].majorStep,cameras[pane].origin,paneScroll[pane],selected,handleSelection,drag?.delta,drag?.moving,bezierDrag,favorPreviewTracks,graphEdgePaths,graphRepeatPaths,repeatOffsets,graphContextWindow,locale]" class="at-graph"
     :style="{width:cameras[pane].width+'px',height:graphHeight+'px',backgroundSize:`${cameras[pane].zoom*cameras[pane].majorStep}px 100%`,backgroundPositionX:`${cameras[pane].gridOrigin}px`}">
     <svg v-if="graphEdgePaths.length||repeatOffsets.length&&graphRepeatPaths.length" class="at-graph-context"
      :width="cameras[pane].width" :height="graphHeight" aria-hidden="true" data-testid="timeline-graph-context">
      <defs>
       <clipPath :id="graphContextClipId"><rect :x="graphContextWindow.start" y="0"
        :width="Math.max(0,graphContextWindow.end-graphContextWindow.start)" :height="graphHeight"/></clipPath>
       <g v-if="graphRepeatPaths.length" :id="graphRepeatSourceId">
        <path v-for="path in graphEdgePaths" :key="path.id" :d="path.d" :stroke="path.color"/>
        <path v-for="path in graphRepeatPaths" :key="path.id" :d="path.d" :stroke="path.color"/>
       </g>
      </defs>
      <g :clip-path="`url(#${graphContextClipId})`">
       <g class="at-graph-holds" data-testid="timeline-graph-edge-holds">
        <path v-for="path in graphEdgePaths" :key="path.id" :d="path.d" :stroke="path.color"/>
       </g>
       <g v-if="graphRepeatPaths.length" class="at-graph-repeats" data-testid="timeline-graph-repeats">
        <use v-for="offset in repeatOffsets" :key="offset" :href="`#${graphRepeatSourceId}`" :x="offset" :data-repeat-offset="offset"/>
       </g>
      </g>
     </svg>
     <svg :width="cameras[pane].width" :height="graphHeight" :aria-label="label('curves','Key value curves')">
      <g class="at-graph-guides" aria-hidden="true" data-testid="timeline-graph-value-guides">
       <line v-for="value in graphTicks" :key="value" x1="0" :x2="cameras[pane].width" :y1="graphY(value)" :y2="graphY(value)" :data-graph-value="value"/>
      </g>
      <g v-if="storedPlotted.length||storedProgress" class="at-stored-curves" aria-hidden="true">
       <path v-if="storedProgress" :d="storedProgressPath()" :stroke="timelineChannelColor.deform" data-testid="timeline-stored-deform"/>
       <path v-for="series in storedPlotted" :key="series.id" :d="storedGraphPath(series)" :stroke="series.color" :data-testid="'timeline-stored-curve-'+series.id"/>
      </g>
      <g v-if="graphProgress" class="at-deform-progress" data-testid="timeline-deform-progress" :style="{color:timelineChannelColor.deform}">
       <path :d="progressPath()" :stroke="timelineChannelColor.deform" fill="none" stroke-width="1.5" data-testid="timeline-deform-progress-path"/>
       <text :x="Math.max(paneScroll[pane]+8,graphX(displayedFrame(graphProgress.key))+6)" y="16">{{label('deformProgress','Deform progress')}} · {{frameText(displayedFrame(graphProgress.key))}}–{{frameText(displayedFrame(graphProgress.next))}}</text>
       <template v-if="graphProgress.key.interpolation==='bezier'&&progressControls">
        <line :x1="graphX(displayedFrame(graphProgress.key))" :y1="graphY(0)" :x2="graphX(progressControls[0])" :y2="graphY(progressControls[1])"/>
        <line :x1="graphX(displayedFrame(graphProgress.next))" :y1="graphY(1)" :x2="graphX(progressControls[2])" :y2="graphY(progressControls[3])"/>
        <circle v-for="control in ([0,1] as const)" :key="control" :cx="graphX(progressControls[control*2]!)" :cy="graphY(progressControls[control*2+1]!)" r="4" :data-testid="`timeline-deform-handle-${graphProgress.key.id}-${control}`" :aria-label="label('deformProgress','Deform progress')+' '+label('handle','Handle')+' '+(control+1)" @pointerdown.stop="dragProgress($event,control)"/>
       </template>
       <rect v-for="(key,index) in [graphProgress.key,graphProgress.next]" :key="key.id" :x="frameX(displayedFrame(key),pane)-3" :y="graphY(index)-3" width="6" height="6" :data-timeline-key-id="key.id" :aria-pressed="selected.has(key.id)" :fill="selected.has(key.id)?timelineChannelColor.deform:'#252728'" :stroke="timelineChannelColor.deform" tabindex="0" role="button" :aria-label="label('deformProgress','Deform progress')+' '+key.frame" @pointerdown.stop="dragKey($event,key)" @keydown="activateKey(key,$event)"/>
      </g>
      <g v-for="series in plotted" :key="series.id">
       <path :d="graphPath(series)" :data-testid="'timeline-curve-'+series.id" :stroke="series.color" :stroke-dasharray="series.dark?'4 2':undefined" :aria-label="channelLabel(series.track.channel)+' '+axisLabel(series.track,series.component)" fill="none" stroke-width="1.25"/>
       <g v-for="segment in selectedSegments(series)" :key="'handles-'+segment.key.id" class="at-curve-handles" :style="{color:series.color}">
        <line :x1="graphX(segment.key.frame)" :y1="seriesY(series,segment.key.values[series.component]!)" :x2="graphX(segment.controls[0])" :y2="seriesY(series,segment.controls[1])"/>
        <line :x1="graphX(segment.next.frame)" :y1="seriesY(series,segment.next.values[series.component]!)" :x2="graphX(segment.controls[2])" :y2="seriesY(series,segment.controls[3])"/>
        <circle v-for="control in graphControls" :key="control" :cx="graphX(segment.controls[control*2]!)"
         :cy="seriesY(series,segment.controls[control*2+1]!)" r="4"
         role="button" tabindex="0" :aria-pressed="handleSelection?.ids.has(graphHandleId(series,segment,control))??false"
         :data-graph-handle-id="graphHandleId(series,segment,control)"
         :aria-label="channelLabel(series.track.channel)+' '+axisLabel(series.track,series.component)+' '+label('handle','Handle')+' '+(control+1)+' '+seriesValueLabel(series,segment.controls[control*2+1]!)"
         :data-graph-display-value="graphDisplayValue(segment.controls[control*2+1]!,series.projection)"
         :data-testid="`timeline-bezier-${segment.key.id}-${series.component}-${control}`"
         @pointerdown.stop="dragHandle($event,series,segment,control)" @keydown="activateGraphHandle($event,series,segment,control)"/>
       </g>
       <rect v-for="key in series.track.keys" :key="key.id" :data-timeline-key-id="key.id" :data-testid="`timeline-graph-key-${key.id}-${series.component}`"
        :data-graph-display-value="graphDisplayValue(key.values[series.component]!,series.projection)"
        :aria-pressed="selected.has(key.id)" :x="frameX(displayedFrame(key),pane)-3" :y="seriesY(series,key.values[series.component]!)-3"
        width="6" height="6" :fill="selected.has(key.id)?series.color:'#252728'" :stroke="series.color" tabindex="0" role="button"
        :aria-label="axisLabel(series.track,series.component)+' '+label('frame','Frame')+' '+key.frame+' '+seriesValueLabel(series,key.values[series.component]!)"
        @pointerdown.stop="dragKey($event,key)" @keydown="activateKey(key,$event)"/>
      </g>
      <g v-if="favorPreviewTracks.length" class="at-favor-preview" data-testid="timeline-favor-preview" aria-hidden="true">
       <path v-for="series in favorPreviewTracks" :key="series.id" :d="storedGraphPath(series)" :stroke="series.color"/>
      </g>
     </svg>
    </div>
    <div v-if="pane===view&&marquee" class="at-marquee" :style="marqueeStyle" data-testid="timeline-marquee" aria-hidden="true"/>
    <div v-for="box in (pane===view?selectionBoxes:[])" :key="box.id" class="at-marquee at-selection-box"
      :style="boxStyle(box)" data-testid="timeline-selection-box" :data-box-left="box.left" :data-box-right="box.right">
     <button v-for="edge in (['left','right'] as const)" :key="edge" type="button" class="at-scale-edge"
      :data-edge="scaleDrag?.boxId===box.id&&((scaleDrag.edge==='left'&&scaleDrag.toEdgeFrame>box.right)||(scaleDrag.edge==='right'&&scaleDrag.toEdgeFrame<box.left))?(edge==='left'?'right':'left'):edge"
      :data-testid="'timeline-scale-edge-'+edge" :disabled="!editable||invalidDraft||!box.canScale"
      :aria-label="t(edge==='left'?'animation_scaleBoxLeft':'animation_scaleBoxRight')"
      :title="t(box.canScale?(edge==='left'?'animation_scaleBoxLeft':'animation_scaleBoxRight'):'animation_scaleBoxUnsupported')"
      @pointerdown.stop="startScale($event,box,edge)" @keydown="scaleEdgeByKey($event,box,edge)"/>
    </div>
    <span v-if="active" class="at-playhead-line" :style="{left:`calc(var(--at-gutter) + ${frameX(currentFrame,pane)}px)`}"/>
   </div>
   <div v-if="!active" class="at-empty">{{ label('createHint','Create an animation to start setting keys.') }}</div>
  </div>
   <div v-if="pane==='graph'" class="at-graph-axis" :style="{height:graphHeight+'px'}" data-testid="timeline-graph-axis"><span v-for="value in graphTicks" :key="value" :style="{top:graphY(value)-paneTop.graph+'px'}" :data-graph-value="value">{{ Number(value.toPrecision(4)) }}</span></div>
   <GraphLeadInButton v-if="pane==='graph'" :expanded="graphLeadIn" @toggle="toggleGraphLeadIn"/>
  </div>
  </section>
  </div>
  <div v-if="singleKey?.track.channel==='deform'&&singleKey.key.interpolation==='bezier'" class="at-progress-controls" data-testid="timeline-deform-controls">
   <span>{{label('deformProgress','Deform progress')}}</span><label v-for="(name,index) in ['Frame 1','Progress 1','Frame 2','Progress 2']" :key="index">{{name}}<input v-model="progressDraft[index]" type="number" step="any" :disabled="!editable" :aria-label="'Deform '+name" :aria-invalid="progressError" :data-testid="'timeline-deform-control-'+index" @change="commitProgress" @keydown.enter.stop.prevent="commitProgress" @keydown.esc.stop.prevent="resetProgress"/></label>
  </div>
  <SequenceKeyEditor v-if="selectedSequenceSettings&&singleKey?.track.channel==='sequence'&&singleKey.key.sequencePayload" class="at-event-key-inspector" :value="singleKey.key.sequencePayload" :settings="selectedSequenceSettings" :context-key="`${activeAnimationId}:${singleKey.key.id}`" :disabled="!editable" test-id="timeline-sequence" @pause="emit('pause')" @commit="commitSequenceKey" @draft-validity="value=>sequenceError=value"/>
  <EventInspector v-if="selectedEvent&&selectedEventKey" class="at-event-key-inspector" compact :definition="selectedEvent" :selected-key="selectedEventKey" animate :busy="disabled" :context-key="`${activeAnimationId}:${currentFrame}`" @key-patch="value=>emit('updateEventKey',value)" @manual-key="id=>emit('insertEventKey',id)" @draft-validity="value=>eventError=value"/>
  <footer class="at-footer" :class="{'flex-wrap':singleKey&&twoColorTrack(singleKey.track)}"><span>−</span><input v-model.number="pixelsPerFrame" type="range" :min="view==='graph'||linkedTime?Math.min(.01,pixelsPerFrame):2" max="40" :step="view==='graph'||linkedTime?'any':'.2'" :aria-label="label('zoom','Timeline zoom')" data-testid="timeline-zoom"/><span>＋</span><label class="at-fps"><input v-model="fpsDraft" type="number" min="1" max="240" step="any" :disabled="!editable" :aria-label="label('fps','Animation FPS')" :aria-invalid="fpsError" data-testid="timeline-fps" @change="commitFps" @keydown.enter.prevent="commitFps" @keydown.esc.prevent="resetFps"/> fps</label><div v-if="singleKey" class="at-key-inspector" :class="{'flex-1 flex-wrap !gap-1':twoColorTrack(singleKey.track)}" data-testid="timeline-key-inspector"><span>{{ label('key','Key') }} {{ singleKey.key.frame }}</span><template v-if="singleKey.track.channel==='drawOrder'"><span>{{keyLabel(singleKey.track,singleKey.key)}}</span><button :disabled="!editable||singleKey.key.order===null" data-testid="timeline-draw-order-reset" @click="emit('updateDrawOrderKey',{id:singleKey.key.id,order:null})">{{label('setupOrder','Setup order')}}</button></template><span v-else-if="singleKey.track.channel==='sequence'">{{keyLabel(singleKey.track,singleKey.key)}}</span><span v-else-if="singleKey.track.channel==='event'">{{selectedEvent?.name}}</span><span v-else-if="singleKey.track.channel==='physicsReset'">{{label('reset','Reset')}}</span><span v-else-if="singleKey.track.channel==='deform'">{{label('deform','Deform')}} · {{label('progress','Progress')}}</span><label v-else-if="singleKey.track.channel==='attachment'">{{ channelLabel('attachment') }}<select :value="singleKey.key.attachment??''" :disabled="!editable" data-testid="timeline-key-attachment" @change="changeAttachment(($event.target as HTMLSelectElement).value)"><option value="">{{ label('none','None') }}</option><option v-for="attachment in selectedSlot?.attachments??[]" :key="attachment.id" :value="attachment.id">{{attachment.name}}</option></select></label><template v-else><label v-for="(_,index) in singleKey.key.values" :key="index">{{ axisLabel(singleKey.track,index) }}<input v-model="keyDraft[index]" type="number" step="any" :disabled="!editable||isTimelinePathChannel(singleKey.track.channel)" :aria-label="label('keyValue','Key value')+' '+axisLabel(singleKey.track,index)" :title="isTimelinePathChannel(singleKey.track.channel)?t('pathAnimationReadOnly'):view==='graph'&&isTimelineBoneChannel(singleKey.track.channel)?t('animation_storedKeyUnits'):undefined" :aria-invalid="valueError" :data-testid="'timeline-key-value-'+index" @change="commitValues" @keydown.enter.prevent="commitValues" @keydown.esc.prevent="resetValues"/></label></template><template v-if="singleKey.track.channel==='ik'"><label v-for="key in (['stretch','compress','bendPositive']as const)" :key="key"><input type="checkbox" :checked="singleKey.key.ikFlags?.[key]" :disabled="!editable" :data-testid="'timeline-ik-'+key" @change="changeIkFlag(key,$event)"/>{{label(key,key)}}</label></template></div><span v-if="showPreviewRangeHint" class="at-duration" :class="{'!text-warning':previewBudgetWarning}" :role="previewBudgetWarning?'status':undefined" :title="t('animation_previewRangePolicy')" data-testid="timeline-preview-range-hint"><span>{{t('animation_storedDuration')}} {{frameText(storedDuration)}}</span> · <span v-if="previewBudgetWarning">{{t('animation_previewRangeBudget')}}</span><span v-else>{{t('animation_previewEnd')}} {{frameText(effectivePreviewEnd)}}</span></span><span v-else class="at-duration">{{ label('end','End') }} {{ durationFrames }}</span></footer>
 </section>
</template>

<style scoped>
.at-summary-key.selected {
  z-index: 1;
  outline: 1px solid var(--color-ink);
  outline-offset: 1px;
}

.at-command-bar {
  container-type: inline-size;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 3px 6px;
  height: auto;
  max-height: 70px;
  overflow: auto;
  scrollbar-width: thin;
}

.at-command-bar :deep(.at-tool-group button:focus-visible) {
  outline-offset: -2px;
}

@container (max-width: 740px) {
  .at-command-bar :deep(.timeline-command-label) {
    display: none;
  }

  .at-command-bar .at-channel-buttons button {
    width: 28px;
    padding-inline: 3px;
  }

  .at-command-bar .at-channel-buttons button span {
    display: none;
  }
}
</style>
