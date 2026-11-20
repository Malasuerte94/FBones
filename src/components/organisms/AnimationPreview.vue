<script setup lang="ts">
import 'pixi.js/unsafe-eval';
import {Application, Graphics} from 'pixi.js';
import {computed, onBeforeUnmount, onMounted, reactive, ref, useId, useTemplateRef, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import type {PreviewTracks} from '../../composables/usePreviewTracks';
import {useWorkspace} from '../../stores/workspace';
import {ImageLayer} from '../../viewport/ImageLayer';
import {imageData} from '../../services/desktop';
import {worldRegions} from '../../domain/images';
import {transformPoint, worldBones} from '../../domain/rig';
import {meshPoints} from '../../domain/meshes';
import AppIcon from '../atoms/AppIcon.vue';
import NumericSliderRow from '../molecules/NumericSliderRow.vue';
import PreviewViewSettings from '../molecules/PreviewViewSettings.vue';
import ViewportNavigationRail from '../molecules/ViewportNavigationRail.vue';

const props = defineProps<{tracks: PreviewTracks; visible: boolean}>();
const hideControls = defineModel<boolean>('hideControls', {required: true});
const showBones = defineModel<boolean>('showBones', {required: true});
const {t} = useI18n();
const w=useWorkspace(),host=ref<HTMLElement>(),error=ref(''),ready=ref(false);
const id = useId();
const settings = useTemplateRef<HTMLDetailsElement>('settings');
const settingsToggle = useTemplateRef<HTMLElement>('settingsToggle');
const navigationFooter = useTemplateRef<HTMLElement>('navigationFooter');
const drafts = reactive<Partial<Record<NumberOption, string>>>({});
const numberOptions = [
  {key: 'speed', id: 'speed', label: 'previewSpeedPercent', min: 10, max: 200, step: 5, scale: 100, icon: 'fps'},
  {key: 'mixDuration', id: 'mix-duration', label: 'previewMixSeconds', min: 0, max: 10, step: .05, scale: 1, icon: 'mix'},
  {key: 'alpha', id: 'alpha', label: 'previewAlphaPercent', min: 0, max: 100, step: 1, scale: 100, icon: 'mix'},
] as const;
type NumberOption = typeof numberOptions[number]['key'];
const trackOptions = computed(() => props.tracks.selectedIndex === 0 ? numberOptions.slice(0, 2) : numberOptions);
const statusLabels = {unsupported: 'previewTracksUnsupported', budget: 'previewTracksBudget', invalid: 'previewTracksInvalid'} as const;
const animateMode = computed(() => w.editorMode === 'animate');
const followingSetup = computed(() => props.tracks.followEditor && !animateMode.value);
const showPlaybackControls = computed(() => !hideControls.value && !followingSetup.value);
const clipTitles = computed(() => new Map(w.animations.map(clip => [clip.id, clip.name])));
const clips = computed(() => w.animations.map(({id, name}) => {
  const selectable = !followingSetup.value && (props.tracks.followEditor || props.tracks.supportsClip(id));
  const title = animateMode.value ? t(selectable ? 'previewClipEditorHint' : 'previewClipUnsupported', {name})
    : selectable ? name : t('previewClipUnavailable', {name});
  return {id, name, selectable, title};
}));
const trackStatus = computed(() => {
  if (!props.visible) return null;
  if (props.tracks.status) return statusLabels[props.tracks.status];
  if (clips.value.length && clips.value.every(clip => !clip.selectable)) return 'previewNoEligibleClips';
  return null;
});
const activeId = computed(() => props.tracks.followEditor ? w.animationId : props.tracks.selectedTrack.entry?.id);
const activeName = computed(() => {
  const track = props.tracks.selectedTrack;
  if (track.entry) return clipTitles.value.get(track.entry.id) ?? t('previewEmptyTrack');
  if (track.previous) return t('previewFadingOut', {name: clipTitles.value.get(track.previous.id) ?? ''});
  return t('previewEmptyTrack');
});
const playing = computed(() => props.tracks.followEditor ? animateMode.value && w.animationPlaying : props.tracks.playing);
const playingLabel = computed(() => props.tracks.followEditor
  ? t(playing.value ? 'previewPauseEditor' : 'previewPlayEditor')
  : t(playing.value ? 'previewPauseIndependent' : 'previewPlayIndependent'));
const emptyPose = {bones: [], slots: []};
const pose = computed(() => props.tracks.followEditor
  ? {bones: w.renderedBones, slots: w.viewSlots}
  : props.tracks.pose ?? emptyPose);

function chooseClip(clip: number) {
  if (!props.tracks.followEditor) props.tracks.toggleClip(clip);
  else if (animateMode.value) w.selectAnimation(clip);
}

function selectEditorClip(event: MouseEvent, clip?: number) {
  event.stopPropagation();
  event.preventDefault();
  if (animateMode.value && clip !== undefined && clip !== w.animationId) w.selectAnimation(clip);
}

function togglePlayback() {
  if (followingSetup.value) return;
  if (props.tracks.followEditor) {
    if (w.animationPlaying) w.pauseAnimation();
    else w.playAnimation();
  } else {
    props.tracks.togglePlayback();
  }
}

function fieldText(option: typeof numberOptions[number]) {
  return drafts[option.key] ?? String(Number((props.tracks.selectedTrack[option.key] * option.scale).toPrecision(14)));
}

function commitOption(option: typeof numberOptions[number]) {
  const draft = drafts[option.key];
  delete drafts[option.key];
  if (!draft?.trim()) return;
  const value = Number(draft);
  if (Number.isFinite(value) && value >= option.min && value <= option.max) {
    props.tracks.setOptions({[option.key]: value / option.scale});
  }
}

function localKeys(event: KeyboardEvent) {
  if ((!animateMode.value || !props.tracks.followEditor) && !event.ctrlKey && !event.metaKey) event.stopPropagation();
}

function closeSettings(event: KeyboardEvent) {
  if (!settings.value?.open) return;
  event.preventDefault();
  event.stopPropagation();
  for (const option of numberOptions) delete drafts[option.key];
  settings.value.open = false;
  settingsToggle.value?.focus();
}

let app:Application|undefined,layer:ImageLayer|undefined,boneOverlay:Graphics|undefined,observer:ResizeObserver|undefined,disposed=false;
let center={x:0,y:0},fittedDocument=-1,autoFit=true;
const previewMinZoom = 2, previewMaxZoom = 2000;
const zoom = ref(1);
const previewZoom = computed(() => {
  const percent = zoom.value * 100;
  return percent >= previewMinZoom && percent <= previewMaxZoom ? Math.round(percent) : Number(percent.toPrecision(4));
});
const compactNavigation = ref(true);
const panning = ref(false);
let pan: {id: number; button: number; x: number; y: number} | null = null;

function fit() {
  if(!props.visible || !app || pan)return;
  autoFit=true;
  const {bones, slots} = pose.value;
  let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
  function include(x: number, y: number) {
    if(!Number.isFinite(x) || !Number.isFinite(y))return;
    left = Math.min(left, x); right = Math.max(right, x);
    bottom = Math.min(bottom, y); top = Math.max(top, y);
  }
  for(const slot of worldRegions(bones, slots)) {
    if(!slot.visible)continue;
    const {width, height} = slot.region;
    const points = slot.mesh ? meshPoints(bones, slot.mesh) :
      [[-.5,-.5],[-.5,.5],[.5,.5],[.5,-.5]].map(([x,y]) => transformPoint(slot, x!*width, y!*height));
    for(const {x, y} of points)include(x, y);
  }
  if(left === Infinity && showBones.value) {
    for(const bone of worldBones(bones)) {
      include(bone.worldX, bone.worldY);
      include(bone.tipX, bone.tipY);
    }
  }
  if(left !== Infinity) {
    center = {x: left/2 + right/2, y: bottom/2 + top/2};
    // Fit retains the existing artwork scale even beyond the manual range.
    zoom.value = Math.min(Math.max(1, app.screen.width-24)/Math.max(1, right-left),
      Math.max(1, app.screen.height-24)/Math.max(1, top-bottom));
  } else {
    center = {x: 0, y: 0};
    zoom.value = 1;
  }
  draw();
}
function draw() {
  if(!props.visible||!app||!layer||disposed)return;
  const documentId=w.project?.documentId??-1;
  if(fittedDocument!==documentId){fittedDocument=documentId;error.value='';stopPan();fit();return;}
  const {width, height}=app.screen, scale=zoom.value;
  const screen=(x:number,y:number)=>({x:width/2+(x-center.x)*scale,y:height/2-(y-center.y)*scale});
  const {bones, slots} = pose.value;
  const overlayBones = boneOverlay && showBones.value ? worldBones(bones) : null;
  const byId = overlayBones ? new Map(overlayBones.map(bone => [bone.id, bone])) : undefined;
  layer.draw(documentId,bones,slots,null,screen,scale,byId);
  if(boneOverlay) {
    boneOverlay.visible = !!overlayBones;
    if(overlayBones) {
      boneOverlay.clear();
      for(const bone of overlayBones) {
        const origin = screen(bone.worldX, bone.worldY), tip = screen(bone.tipX, bone.tipY);
        if(![origin.x, origin.y, tip.x, tip.y].every(Number.isFinite))continue;
        const color = (bone.color ?? 0x9b9b9bff) >>> 8;
        if(bone.length)boneOverlay.moveTo(origin.x, origin.y).lineTo(tip.x, tip.y).stroke({color, width: 2, cap: 'round'});
        boneOverlay.circle(origin.x, origin.y, bone.parent === null ? 5 : 3).fill(0x525455).stroke({color, width: 1.5});
      }
    }
  }
  app.render();
}
function setZoom(percent: number) {
  if(!props.visible || !app || pan || Number.isNaN(percent))return;
  autoFit = false;
  zoom.value = Math.max(previewMinZoom, Math.min(previewMaxZoom, percent)) / 100;
  draw();
}
function wheel(event: WheelEvent) {
  event.preventDefault();
  setZoom(zoom.value * 100 * Math.exp(-event.deltaY * .001));
}
function startPan(event: PointerEvent) {
  if(!props.visible || !app || pan || (event.button !== 1 && event.button !== 2))return;
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  try { target.setPointerCapture(event.pointerId); }
  catch { return; }
  pan = {id: event.pointerId, button: event.button === 1 ? 4 : 2, x: event.clientX, y: event.clientY};
  panning.value = true;
}
function movePan(event: PointerEvent) {
  if(!pan || pan.id !== event.pointerId)return;
  if(!(event.buttons & pan.button)){stopPan();return;}
  const dx = event.clientX - pan.x, dy = event.clientY - pan.y;
  if(!dx && !dy)return;
  pan.x = event.clientX; pan.y = event.clientY;
  const x = center.x - dx / zoom.value, y = center.y + dy / zoom.value;
  if(!Number.isFinite(x) || !Number.isFinite(y))return;
  autoFit = false;
  center = {x, y};
  draw();
}
function stopPan() {
  if(!pan)return;
  const id = pan.id;
  pan = null;
  panning.value = false;
  if(host.value?.hasPointerCapture(id))host.value.releasePointerCapture(id);
}
function finishPan(event: PointerEvent) {
  if(pan?.id === event.pointerId)stopPan();
}
function resizePreview() {
  if(!props.visible || !app || !host.value)return false;
  const {clientWidth: width, clientHeight: height} = host.value;
  if(width === 0 || height === 0)return false;
  compactNavigation.value = width < 140 || height < 148;
  if(app.screen.width === width && app.screen.height === height)return false;
  app.renderer.resize(width, height);
  if(autoFit && !pan && fittedDocument === (w.project?.documentId ?? -1))fit();else draw();
  return true;
}
onMounted(async()=>{
  if(!host.value)return;
  const instance=new Application();
  try{
    await instance.init({width:Math.max(1,host.value.clientWidth),height:Math.max(1,host.value.clientHeight),backgroundAlpha:0,preference:'webgl',antialias:true,autoDensity:true,resolution:Math.min(window.devicePixelRatio||1,2),autoStart:false});
    if(disposed){instance.destroy(true,{children:true});return;}
    app=instance;host.value.append(instance.canvas);
    layer=new ImageLayer(imageData,draw,message=>{
      if(!disposed&&fittedDocument===(w.project?.documentId??-1))error.value=message;
    });
    instance.stage.addChild(layer.container);
    boneOverlay = instance.stage.addChild(new Graphics({eventMode: 'none'}));
    observer=new ResizeObserver(resizePreview);observer.observe(host.value);
    window.addEventListener('blur', stopPan);
    ready.value=true;
    if(!resizePreview())draw();
  }catch(reason){
    ready.value=false;
    observer?.disconnect();
    window.removeEventListener('blur',stopPan);
    error.value=reason instanceof Error?reason.message:String(reason);
    if(app){layer?.destroy();layer=undefined;app.destroy(true,{children:true});app=undefined;}else if(instance.renderer)instance.destroy(true,{children:true});
  }
});
// DockWorkspace keeps closed panels mounted. A closed Preview must stop
// observing the live pose and avoid resizing its camera to the hidden host.
watch(()=>props.visible?[pose.value,w.project?.documentId,showBones.value] as const:null,(frame,previous)=>{
  if(!frame){stopPan();return;}
  if(previous||!resizePreview())draw();
},{flush:'post'});
onBeforeUnmount(()=>{disposed=true;stopPan();window.removeEventListener('blur',stopPan);observer?.disconnect();layer?.destroy();app?.destroy(true,{children:true});app=undefined;});
</script>
<template>
 <section class="animation-preview" :aria-label="t('previewLabel')" data-testid="animation-preview" @keydown="localKeys">
  <div class="animation-preview-modes">
   <div v-show="!hideControls" class="flex flex-wrap gap-0.5" role="group" :aria-label="t('previewMode')">
    <button type="button" class="dock-tab" :class="{active:tracks.followEditor}" :aria-pressed="tracks.followEditor"
      data-testid="preview-mode-follow" @click="tracks.setFollowEditor(true)">{{ t(animateMode ? 'previewFollowEditor' : 'previewFollowSetup') }}</button>
    <button type="button" class="dock-tab" :class="{active:!tracks.followEditor}" :aria-pressed="!tracks.followEditor" :disabled="!tracks.available"
      :title="!tracks.available ? t('previewTracksUnsupported') : undefined"
      data-testid="preview-mode-tracks" @click="tracks.setFollowEditor(false)">{{ t('previewTracks') }}</button>
   </div>
   <PreviewViewSettings v-model:hide-controls="hideControls" v-model:show-bones="showBones"
     :play-current="tracks.playCurrent" :can-play-current="tracks.available || tracks.playCurrent"
     @update:play-current="tracks.setPlayCurrent"/>
  </div>
  <div class="animation-preview-content">
   <div class="relative flex min-h-0 min-w-0 flex-1">
    <div ref="host" class="animation-preview-canvas viewport-checker" :class="{'cursor-grabbing':panning}"
      :data-ready="ready" role="img" :aria-label="t('previewCanvas')" @wheel="wheel" @contextmenu.prevent @auxclick.prevent
      @pointerdown="startPan" @pointermove="movePan" @pointerup="finishPan" @pointercancel="finishPan" @lostpointercapture="finishPan">
     <p v-if="error" role="status" class="absolute inset-2 z-10 overflow-auto text-[10px] text-danger">{{error}}</p>
    </div>
    <Teleport :to="navigationFooter" :disabled="!compactNavigation || !navigationFooter">
     <ViewportNavigationRail v-if="ready" surface="preview" :zoom="previewZoom" :min-zoom="previewMinZoom" :max-zoom="previewMaxZoom"
       :horizontal="compactNavigation" :class="{'absolute bottom-1 left-1 z-10':!compactNavigation}" @zoom="setZoom" @fit="fit" />
    </Teleport>
   </div>
   <div v-if="showPlaybackControls" class="animation-preview-list" role="group" :aria-label="t('previewAnimations')">
    <div v-for="clip in clips" :key="clip.id" :title="clip.title"
      :data-testid="`preview-clip-row-${clip.id}`" @contextmenu="selectEditorClip($event,clip.id)">
     <button type="button" :class="{active:activeId===clip.id}" :disabled="!clip.selectable"
       :aria-pressed="activeId===clip.id" :data-testid="`preview-clip-${clip.id}`" @click="chooseClip(clip.id)">
       <span class="text-motion" aria-hidden="true">⌁</span> {{clip.name}}
     </button>
    </div>
   </div>
  </div>
  <div v-show="showPlaybackControls || (compactNavigation && ready)" class="animation-preview-controls" :class="{'is-compact-navigation':compactNavigation && ready}">
   <div v-show="compactNavigation && ready" ref="navigationFooter" class="preview-navigation-footer" />
   <label v-if="showPlaybackControls && tracks.followEditor && animateMode" class="animation-preview-follow-speed">
    <span>{{ t('previewSpeed') }}</span>
    <input v-model.number="w.animationSpeed" type="range" min="0.1" max="2" step="0.05" :aria-label="t('previewSpeedName')">
    <output>{{Math.round(w.animationSpeed*100)}}%</output>
   </label>
   <button v-if="showPlaybackControls" type="button" class="dock-tab animation-preview-play" :disabled="!tracks.followEditor&&!tracks.hasEntries&&!tracks.playing"
     :aria-label="playingLabel" :title="playingLabel" data-testid="preview-playback" @click="togglePlayback">
    <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span>
   </button>
  </div>
  <div v-if="!tracks.followEditor" v-show="!hideControls" class="animation-preview-tracks">
   <p v-if="trackStatus" class="px-1 pb-1 text-warning" role="status" data-testid="preview-status">{{ t(trackStatus) }}</p>
   <div class="animation-preview-track-strip" role="group" :aria-label="t('previewTrackList')">
    <button v-for="(track,index) in tracks.visibleTracks" :key="index" type="button" class="dock-tab" :class="{active:index===tracks.selectedIndex}"
      :aria-pressed="index===tracks.selectedIndex" :aria-label="t('previewTrackNumber',{index})"
      :aria-describedby="track.entry ? `${id}-track-${index}` : undefined"
      :title="track.entry ? t(animateMode ? 'previewTrackEditorHint' : 'previewTrackToggleHint',{name:clipTitles.get(track.entry.id) ?? ''}) : t('previewEmptyTrack')"
      :data-testid="`preview-track-${index}`" :data-muted="track.muted" @click="tracks.selectTrack(index)"
      @contextmenu.stop.prevent="tracks.toggleTrackMuted(index)"
      @mousedown.middle.prevent @auxclick.middle="selectEditorClip($event,track.entry?.id)">
     {{ index }}<span v-if="track.entry" :class="track.muted ? 'text-muted' : 'text-accent'" aria-hidden="true">{{ track.muted ? '−' : '•' }}</span>
    </button>
    <template v-for="(track,index) in tracks.visibleTracks" :key="index">
     <span v-if="track.entry" :id="`${id}-track-${index}`" class="sr-only">
      {{ track.muted ? t('previewMutedAnimation',{name:clipTitles.get(track.entry.id) ?? ''}) : clipTitles.get(track.entry.id) }}
     </span>
    </template>
   </div>
   <div class="animation-preview-active">
    <p class="min-w-0 truncate" :title="activeName" data-testid="preview-active-clip">{{ t('previewTrackNumber',{index:tracks.selectedIndex}) }} · {{ activeName }}</p>
    <div class="flex shrink-0 items-center gap-0.5">
     <button type="button" class="dock-tab" :disabled="!tracks.selectedTrack.entry" :aria-label="t('previewMuteTrack')"
       :aria-pressed="tracks.selectedTrack.muted" :title="t(tracks.selectedTrack.muted ? 'previewUnmuteTrack' : 'previewMuteTrack')"
       data-testid="preview-track-mute" @click="tracks.toggleTrackMuted(tracks.selectedIndex)">
      <span class="relative grid place-items-center" aria-hidden="true">
       <AppIcon name="eye" class="!size-3.5" />
       <span v-if="tracks.selectedTrack.muted" class="absolute h-px w-3.5 -rotate-45 bg-current" />
      </span>
     </button>
     <button type="button" class="dock-tab" :disabled="!tracks.selectedTrack.entry" :aria-label="t('previewClearTrack')"
       :title="t('previewClearTrack')" data-testid="preview-clear-track" @click="tracks.clearTrack()">{{ t('previewClear') }}</button>
    </div>
   </div>
   <details ref="settings" class="animation-preview-settings" data-testid="preview-composition" @keydown.esc.capture="closeSettings">
    <summary ref="settingsToggle" data-testid="preview-composition-toggle">
     <span aria-hidden="true">▶</span> {{ t('animation_playbackLayers') }}
    </summary>
    <div class="animation-preview-settings-body">
     <NumericSliderRow v-for="option in trackOptions" :key="option.key" :label="t(option.label)" :test-id="`preview-${option.id}`"
       :context-key="`${w.project?.documentId ?? -1}:${tracks.selectedIndex}`" :model-value="fieldText(option)"
       :min="option.min" :max="option.max" :step="option.step" :icon="option.icon"
       @update:model-value="value=>drafts[option.key]=value" @commit="commitOption(option)" @cancel="delete drafts[option.key]">
      <template v-if="option.key==='speed'" #trailing>
       <button type="button" class="dock-tab animation-preview-speed-reset" :aria-label="t('previewResetTrackSpeed')"
         :title="t('previewResetTrackSpeed')" data-testid="preview-speed-reset" @click="tracks.setOptions({speed:1})">
        <AppIcon name="reset" class="!size-3.5"/>
       </button>
      </template>
     </NumericSliderRow>
     <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
      <label class="inline-flex items-center gap-1.5" :title="t('previewNextAssignmentHint')">
       <input type="checkbox" class="accent-accent" :checked="tracks.selectedTrack.repeat" :aria-describedby="`${id}-assignment-hint`"
         data-testid="preview-repeat" @change="event=>tracks.setOptions({repeat:(event.target as HTMLInputElement).checked})">
       {{ t('previewRepeat') }}
      </label>
      <label v-if="tracks.selectedIndex > 0" class="inline-flex items-center gap-1.5" :title="t('previewNextAssignmentHint')">
       <input type="checkbox" class="accent-accent" :checked="tracks.selectedTrack.additive" :aria-describedby="`${id}-assignment-hint`"
         data-testid="preview-additive" @change="event=>tracks.setOptions({additive:(event.target as HTMLInputElement).checked})">
       {{ t('previewAdditive') }}
      </label>
      <span :id="`${id}-assignment-hint`" class="basis-full text-muted" :class="{'sr-only':tracks.selectedIndex === 0}"
        data-testid="preview-next-assignment-hint">{{ t('previewNextAssignmentHint') }}</span>
     </div>
    </div>
   </details>
  </div>
 </section>
</template>

<style scoped>
.animation-preview-controls.is-compact-navigation { flex-wrap: wrap; }
.animation-preview-list button:disabled { pointer-events: none; }
.preview-navigation-footer { flex: 0 0 min(100%, 138px); min-width: 0; }
.is-compact-navigation .animation-preview-follow-speed { min-width: 82px; }
</style>
