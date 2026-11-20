<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, shallowRef, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {timelineChannelColor, type GraphBezierGroupChange, type TimelineBezierControls, type TimelineInterpolation} from '../../domain/animationTimeline';
import {
  curveSegmentAllowsInterpolation, curveSegmentComponentCount,
  curveSegmentHandleChange, normalizeCurveSegment, type CurveSegment, type CurveSegmentSelection, type NormalizedCurveSegment,
} from '../../domain/curveSegment';
import {captureCurvePresetControls, maxCurvePresetNameLength, maxCurvePresets, normalizeCurvePresetName, type CurvePreset} from '../../domain/curvePresets';
import {curvesHandleId, planCurvesHandleGroup, type CurvesHandleGroupIntent, type CurvesHandleMember} from '../../domain/curvesHandleGroup';
import type {GraphPreset} from '../../domain/graphCurveTools';

type Point = {x: number; y: number};
type Handle = 0 | 1;
type Bounds = {left: number; right: number; bottom: number; top: number};

const props = defineProps<{selections: readonly CurveSegmentSelection[]; customPresets: readonly CurvePreset[]; disabled?: boolean}>();
const emit = defineEmits<{
  pause: [];
  editHandle: [change: {selection: CurveSegmentSelection; component: number; control: Handle; point: Point}];
  editHandleGroup: [intent: CurvesHandleGroupIntent];
  applyPreset: [change: {selections: readonly CurveSegmentSelection[]; preset: GraphPreset}];
  setInterpolation: [change: {selections: readonly CurveSegmentSelection[]; interpolation: TimelineInterpolation}];
  saveCustomPreset: [change: {name: string; replace: boolean; selection: CurveSegmentSelection; component: number}];
  removeCustomPreset: [change: {name: string}];
  applyCustomPreset: [change: {name: string; selections: readonly CurveSegmentSelection[]}];
}>();

const {t, locale} = useI18n();
const percent = computed(() => new Intl.NumberFormat(locale.value, {style: 'percent', maximumFractionDigits: 1}));
const frameNumber = computed(() => new Intl.NumberFormat(locale.value, {maximumFractionDigits: 3}));
const shapeOptions = [
  {id: 'stepped', label: 'animation_curveStepped', glyph: 'M3 17h10V7h8'},
  {id: 'linear', label: 'animation_curveLinear', glyph: 'M3 17 21 7'},
  {id: 'bezier', label: 'animation_curveBezier', glyph: 'M3 17C12 17 12 7 21 7'},
] as const;
const presets = [
  {id: 'flat', label: 'animation_curvePresetFlat', value: 'flat'},
  {id: 'ease-out', label: 'animation_curvePresetEaseOut', value: 'easeOut'},
  {id: 'ease-in', label: 'animation_curvePresetEaseIn', value: 'easeIn'},
  {id: 'automatic', label: 'animation_curvePresetAutomatic'},
  {id: 'separate', label: 'animation_curvePresetSeparate'},
  {id: 'bounce', label: 'animation_curvePresetBounce'},
] as const;
const keyboardVectors: Readonly<Record<string, readonly [number, number] | undefined>> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
};
const plot = shallowRef<SVGSVGElement | null>(null);
function segmentKey({trackId, key, next}: CurveSegment) {
  return JSON.stringify([trackId, key.id, next.id]);
}
const preferredSegment = shallowRef<string | null>(null);
const activeSegmentIndex = computed(() => Math.max(0, props.selections.findIndex(({segment}) => segmentKey(segment) === preferredSegment.value)));
const selection = computed(() => props.selections[activeSegmentIndex.value]);
const segment = computed(() => selection.value?.segment);
const selectionIdentity = computed(() => JSON.stringify(props.selections.map(({documentKey, revision, animation, segment}) => [
  documentKey, revision, animation, segmentKey(segment), segment.leftSelected, segment.rightSelected,
])));
const componentCount = computed(() => segment.value ? curveSegmentComponentCount(segment.value) : 0);
const twoColor = computed(() => segment.value?.kind === 'rgba' && segment.value.twoColor);
const componentFamily = computed(() => [segment.value?.channel, componentCount.value].join(':'));
const colorAxes = ['R', 'G', 'B', 'A', 'R', 'G', 'B'];
const components = computed(() => {
  let labels: string[];
  switch (segment.value?.kind) {
    case 'rgba':
      labels = colorAxes.map((axis, index) => twoColor.value
        ? t(index < 4 ? 'animation_lightComponent' : 'animation_darkComponent', {axis}) : axis);
      break;
    case 'ik': labels = [t('mix'), t('softness')]; break;
    case 'transformMix':
      labels = [t('rotate'), 'X', 'Y', t('animation_scaleX'), t('animation_scaleY'), `${t('shear')} Y`];
      break;
    default: labels = ['X', 'Y'];
  }
  return labels.slice(0, componentCount.value).map((label, index) => ({label, index}));
});
function channelName(source: CurveSegment) {
  switch (source.kind) {
    case 'deform': return t('viewportKeyDeformShort');
    case 'rgba': return t('color');
    case 'ik': return t('constraint_ik');
    case 'transformMix': return t('constraint_transform');
    case 'physics': return t(`physics_${source.property}`);
    case 'bone': {
      const name = source.channel;
      return t(name === 'translateX' || name === 'translateY' || name === 'scaleX' || name === 'scaleY' ? `animation_${name}` : name);
    }
  }
}
const channelLabel = computed(() => segment.value ? channelName(segment.value) : '');
const segmentOptions = computed(() => props.selections.map(({label, segment}, index) => ({
  index, key: segmentKey(segment), label: `${label || channelName(segment)} · ${segmentRange(segment.key.frame, segment.next.frame)}`,
})));
function segmentRange(first: number, last: number) {
  return `${frameNumber.value.format(first)}–${frameNumber.value.format(last)}`;
}
function chooseSegment(event: Event) {
  const option = segmentOptions.value[Number((event.currentTarget as HTMLSelectElement).value)];
  if (option) preferredSegment.value = option.key;
}
const componentGroups = computed(() => twoColor.value
  ? [{label: t('slotLightColor'), options: components.value.slice(0, 4)}, {label: t('slotDarkColor'), options: components.value.slice(4)}]
  : [{label: channelLabel.value, options: components.value}]);
const preferredComponent = shallowRef(0);
const component = computed(() => preferredComponent.value < componentCount.value ? preferredComponent.value : 0);
const normalized = computed(() => segment.value && normalizeCurveSegment(segment.value, component.value));
const overlays = computed(() => props.selections.flatMap((source, index) => {
  if (index === activeSegmentIndex.value) return [];
  const {segment} = source;
  const lane = normalizeCurveSegment(segment, component.value < curveSegmentComponentCount(segment) ? component.value : 0);
  return lane && isPlottable(lane) ? [{key: segmentKey(segment), source, lane, overlay: true}] : [];
}));
const equal = computed(() => !!normalized.value && normalized.value.startValue === normalized.value.endValue);
const shape = computed(() => normalized.value?.interpolation);
function isPlottable(lane: NormalizedCurveSegment) {
  return lane.interpolation !== 'bezier' || !!lane.controls;
}
const focusedEqualBezier = computed(() => equal.value && shape.value === 'bezier');
const plotVisible = computed(() => (!!normalized.value && isPlottable(normalized.value)) || overlays.value.length > 0);
const canEdit = computed(() => props.selections.length > 0 && !props.disabled);
function allowsInterpolation(interpolation: TimelineInterpolation) {
  return props.selections.some(({segment}) => curveSegmentAllowsInterpolation(segment, interpolation));
}
function shapePressed(interpolation: TimelineInterpolation): boolean | 'mixed' {
  const count = props.selections.filter(({segment}) => segment.key.interpolation === interpolation).length;
  return count > 0 && count < props.selections.length ? 'mixed' : count > 0;
}
const canApplyPreset = computed(() => canEdit.value && props.selections.some(({segment}) => {
  if (!curveSegmentAllowsInterpolation(segment, 'bezier')) return false;
  return segment.key.values.slice(0, curveSegmentComponentCount(segment)).some((value, index) => value !== segment.next.values[index]);
}));
const componentColor = computed(() => {
  const source = segment.value;
  if (!source) return 'var(--color-accent)';
  if (source.kind === 'rgba') {
    return {R: 'var(--color-danger)', G: 'var(--color-motion)', B: 'var(--color-accent)', A: 'var(--color-ink)'}[
      colorAxes[component.value] as 'R' | 'G' | 'B' | 'A'];
  }
  if (source.kind === 'transformMix') {
    return [timelineChannelColor.rotate, timelineChannelColor.translate, timelineChannelColor.translate,
      timelineChannelColor.scale, timelineChannelColor.scale, timelineChannelColor.shear][component.value];
  }
  return component.value === 1 ? 'var(--color-bone)' : timelineChannelColor[source.channel];
});

function setComponent(event: Event) {
  preferredComponent.value = Number((event.currentTarget as HTMLSelectElement).value);
}

const view = {left: 34, right: 248, top: 10, bottom: 112};
const handleIndices = [0, 1] as const;
const bounds = computed<Bounds>(() => {
  let left = 0, right = 1, bottom = 0, top = 1;
  for (const lane of [normalized.value, ...overlays.value.map(({lane}) => lane)]) {
    const c = lane?.controls;
    if (!c) continue;
    left = Math.min(left, c[0], c[2]);
    right = Math.max(right, c[0], c[2]);
    bottom = Math.min(bottom, c[1], c[3]);
    top = Math.max(top, c[1], c[3]);
  }
  return {left: left - .06 * (right - left), right: right + .06 * (right - left),
    bottom: bottom - .1 * (top - bottom), top: top + .1 * (top - bottom)};
});

type HandleGroup = Omit<CurvesHandleGroupIntent, 'point'>;
interface PlotHandle {
  id: string;
  member: CurvesHandleMember;
  source: CurveSegmentSelection;
  lane: NormalizedCurveSegment;
  overlay: boolean;
  point: Point;
}

interface Drag {
  pointerId: number;
  handle: PlotHandle;
  group: HandleGroup | null;
  identity: string;
  start: Point;
  screen: Point;
  inverse: DOMMatrix;
  bounds: Bounds;
  travelled: boolean;
}
interface DragPreview {
  point: Point;
  changes?: readonly GraphBezierGroupChange[];
}

const selectedHandles = shallowRef<ReadonlySet<string>>(new Set());
const drag = shallowRef<Drag | null>(null);
const dragPreview = shallowRef<DragPreview | null>(null);
const plotBounds = computed(() => drag.value?.bounds ?? bounds.value);
const presetList = shallowRef<HTMLSelectElement | null>(null);
const saveButton = shallowRef<HTMLButtonElement | null>(null);
const nameField = shallowRef<HTMLInputElement | null>(null);
const selectedPresetName = shallowRef('');
const pendingPresetName = shallowRef('');
const draftName = shallowRef('');
const namingPreset = shallowRef(false);
const selectedPreset = computed(() => props.customPresets.find(({name}) => name === selectedPresetName.value));
const normalizedDraftName = computed(() => normalizeCurvePresetName(draftName.value));
const duplicateName = computed(() => {
  const name = normalizedDraftName.value?.toLowerCase();
  return !!name && props.customPresets.some(preset => preset.name.toLowerCase() === name);
});
const canCapturePreset = computed(() => !!segment.value && canEdit.value && !drag.value &&
  !!captureCurvePresetControls(segment.value, component.value));
const canCreatePreset = computed(() => canCapturePreset.value && props.customPresets.length < maxCurvePresets);

function x(time: number) {
  const {left, right} = plotBounds.value;
  return view.left + (time - left) / (right - left) * (view.right - view.left);
}
function y(progress: number) {
  const {bottom, top} = plotBounds.value;
  return view.bottom - (progress - bottom) / (top - bottom) * (view.bottom - view.top);
}
const xy = ({x: time, y: progress}: Point) => `${x(time)} ${y(progress)}`;
function handlePoint(controls: Readonly<TimelineBezierControls>, control: Handle): Point {
  return {x: controls[control * 2]!, y: controls[control * 2 + 1]!};
}
const handles = computed<PlotHandle[]>(() => {
  const active = selection.value && normalized.value ? [{source: selection.value, lane: normalized.value, overlay: false}] : [];
  return [...overlays.value, ...active].flatMap(({source, lane, overlay}) => {
    const controls = lane.controls;
    if (!controls || !curveSegmentAllowsInterpolation(source.segment, 'bezier')) return [];
    const {trackId, key, next} = source.segment;
    return handleIndices.map(control => {
      const member = {trackId, id: key.id, nextId: next.id, component: lane.component, control};
      return {id: curvesHandleId(member), member, source, lane, overlay, point: handlePoint(controls, control)};
    });
  });
});
const groupChangesByKey = computed(() => {
  const byKey = new Map<number, GraphBezierGroupChange[]>();
  for (const change of dragPreview.value?.changes ?? []) {
    const changes = byKey.get(change.id);
    if (changes) changes.push(change);
    else byKey.set(change.id, [change]);
  }
  return byKey;
});
function shownControls(source: CurveSegmentSelection, lane: NormalizedCurveSegment) {
  const {controls, startFrame, endFrame, startValue, endValue} = lane;
  const preview = dragPreview.value;
  if (!controls || !preview) return controls;
  const id = source.segment.key.id;
  if (preview.changes) {
    const changes = groupChangesByKey.value.get(id);
    if (!changes) return controls;
    const updated: TimelineBezierControls = [...controls];
    for (const change of changes) {
      if (change.component !== lane.component) continue;
      updated[change.control * 2] = (change.frame - startFrame) / (endFrame - startFrame);
      updated[change.control * 2 + 1] = (change.value - startValue) / (endValue - startValue);
    }
    return updated;
  }
  const edited = drag.value?.handle.member;
  if (!edited || edited.id !== id || edited.component !== lane.component) return controls;
  const updated: TimelineBezierControls = [...controls];
  updated[edited.control * 2] = preview.point.x;
  updated[edited.control * 2 + 1] = preview.point.y;
  return updated;
}
const shownHandles = computed(() => handles.value.map(handle => ({
  ...handle, displayed: handlePoint(shownControls(handle.source, handle.lane)!, handle.member.control),
})));
function handleLabel(handle: PlotHandle, point: Point) {
  const label = t('animation_curveHandle', {
    index: handle.member.control + 1, time: percent.value.format(point.x), progress: percent.value.format(point.y),
  });
  if (!handle.overlay) return label;
  const {source} = handle;
  const {segment} = source;
  return `${source.label || channelName(segment)} · ${segmentRange(segment.key.frame, segment.next.frame)} · ${label}`;
}
const start = {x: 0, y: 0};
const end = computed(() => ({x: 1, y: equal.value ? 0 : 1}));
function lanePath(lane: NormalizedCurveSegment, controls = lane.controls) {
  if (!isPlottable(lane)) return '';
  const finish = {x: 1, y: lane.startValue === lane.endValue ? 0 : 1};
  const prefix = `M${xy(start)}`;
  if (lane.interpolation === 'stepped') return `${prefix} H${x(1)} V${y(finish.y)}`;
  if (controls) return `${prefix} C${x(controls[0])} ${y(controls[1])} ${x(controls[2])} ${y(controls[3])} ${xy(finish)}`;
  return `${prefix} L${xy(finish)}`;
}
const path = computed(() => selection.value && normalized.value
  ? lanePath(normalized.value, shownControls(selection.value, normalized.value)) : '');
const grid = [0, .25, .5, .75, 1];

function releaseDrag() {
  const pointerId = drag.value?.pointerId;
  drag.value = null;
  dragPreview.value = null;
  if (pointerId !== undefined && plot.value?.hasPointerCapture(pointerId)) plot.value.releasePointerCapture(pointerId);
}

function cancelPointer(event: PointerEvent) {
  if (event.pointerId === drag.value?.pointerId) releaseDrag();
}

function cancelWithEscape(event: KeyboardEvent) {
  if (!drag.value && !namingPreset.value) return;
  event.stopPropagation();
  event.preventDefault();
  if (drag.value) releaseDrag();
  if (namingPreset.value) closePresetName();
}

function selectHandle(handle: PlotHandle, additive: boolean) {
  const selected = new Set(additive ? selectedHandles.value : []);
  if (additive && selected.has(handle.id)) selected.delete(handle.id);
  else selected.add(handle.id);
  selectedHandles.value = selected;
}

function clickHandle(event: MouseEvent, handle: PlotHandle) {
  if (!canEdit.value || drag.value || !(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  selectHandle(handle, true);
}

function selectedGroup(handle: PlotHandle): HandleGroup | null | false {
  const selected = selectedHandles.value;
  if (selected.size < 2 || !selected.has(handle.id)) return null;
  const live = handles.value.filter(item => selected.has(item.id));
  if (live.length !== selected.size) return false;
  return {
    selections: props.selections,
    handles: live.map(item => item.member),
    activeHandleId: handle.id,
  };
}

function handleCandidate(handle: PlotHandle, group: HandleGroup | null, point: Point): DragPreview | null {
  if (group) {
    const changes = planCurvesHandleGroup(group.selections, group.handles, group.activeHandleId, point);
    return changes?.length ? {point, changes} : null;
  }
  const {source, member} = handle;
  return curveSegmentHandleChange(source.segment, member.component, member.control, point) ? {point} : null;
}

function commitHandle(handle: PlotHandle, group: HandleGroup | null, point: Point) {
  if (group) emit('editHandleGroup', {...group, point});
  else emit('editHandle', {selection: handle.source, component: handle.member.component, control: handle.member.control, point});
}

function startDrag(event: PointerEvent, handle: PlotHandle) {
  const svg = plot.value;
  if (event.button !== 0 || drag.value || !canEdit.value || !svg) return;
  const target = event.currentTarget as SVGElement;
  if (event.ctrlKey || event.metaKey) {
    target.focus({preventScroll: true});
    return;
  }
  const group = selectedGroup(handle);
  if (group === false) return;
  const inverse = svg.getScreenCTM()?.inverse();
  if (!inverse || !Number.isFinite(inverse.a)) return;
  try { svg.setPointerCapture(event.pointerId); } catch { return; }
  event.preventDefault();
  target.focus({preventScroll: true});
  const screen = {x: event.clientX, y: event.clientY};
  const start = new DOMPoint(screen.x, screen.y).matrixTransform(inverse);
  drag.value = {pointerId: event.pointerId, handle, group, identity: selectionIdentity.value,
    start, screen, inverse, bounds: bounds.value, travelled: false};
  emit('pause');
}

function dragPosition(event: PointerEvent, active: Drag): Point {
  const pos = new DOMPoint(event.clientX, event.clientY).matrixTransform(active.inverse);
  const {left, right, bottom, top} = active.bounds;
  return {x: active.handle.point.x + (pos.x - active.start.x) * (right - left) / (view.right - view.left),
    y: active.handle.point.y - (pos.y - active.start.y) * (top - bottom) / (view.bottom - view.top)};
}

function moveDrag(event: PointerEvent) {
  const active = drag.value;
  if (!active || event.pointerId !== active.pointerId) return;
  active.travelled ||= Math.hypot(event.clientX - active.screen.x, event.clientY - active.screen.y) >= 3;
  if (!active.travelled) return;
  dragPreview.value = handleCandidate(active.handle, active.group, dragPosition(event, active));
}

function finishDrag(event: PointerEvent) {
  const active = drag.value;
  if (!active || event.pointerId !== active.pointerId) return;
  moveDrag(event);
  const preview = dragPreview.value;
  releaseDrag();
  if (!canEdit.value || selectionIdentity.value !== active.identity) return;
  if (!active.travelled) selectHandle(active.handle, false);
  else if (preview) commitHandle(active.handle, active.group, preview.point);
}

function keyHandle(event: KeyboardEvent, handle: PlotHandle) {
  if ((event.key === 'Enter' || event.key === ' ') && !event.altKey) {
    event.preventDefault();
    event.stopPropagation();
    if (canEdit.value && !drag.value && !event.repeat) selectHandle(handle, event.ctrlKey || event.metaKey);
    return;
  }
  const vector = keyboardVectors[event.key];
  if (!vector || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  if (!canEdit.value || drag.value || event.repeat) return;
  const step = event.shiftKey ? .05 : .01;
  const {point} = handle;
  const changed = {x: point.x + vector[0] * step, y: point.y + vector[1] * step};
  const group = selectedGroup(handle);
  if (group === false || !handleCandidate(handle, group, changed)) return;
  emit('pause');
  commitHandle(handle, group, changed);
}

function recordShape(interpolation: TimelineInterpolation) {
  if (canEdit.value && !drag.value && props.selections.some(({segment}) =>
    segment.key.interpolation !== interpolation && curveSegmentAllowsInterpolation(segment, interpolation))) {
    emit('setInterpolation', {selections: props.selections, interpolation});
  }
}

function recordPreset(preset: GraphPreset) {
  if (canApplyPreset.value && !drag.value) emit('applyPreset', {selections: props.selections, preset});
}

async function openPresetName() {
  if (!canCreatePreset.value) return;
  draftName.value = '';
  namingPreset.value = true;
  await nextTick();
  nameField.value?.focus();
}

function closePresetName(restoreFocus = true) {
  if (!namingPreset.value) return;
  namingPreset.value = false;
  draftName.value = '';
  if (restoreFocus) saveButton.value?.focus({preventScroll: true});
}

async function createCustomPreset() {
  const name = normalizedDraftName.value, source = selection.value;
  if (!name || duplicateName.value || !source || !canCreatePreset.value || !namingPreset.value) return;
  pendingPresetName.value = name;
  emit('saveCustomPreset', {name, replace: false, selection: source, component: component.value});
  closePresetName(false);
  await nextTick();
  if (pendingPresetName.value === name) pendingPresetName.value = '';
  if (selectedPresetName.value === name) presetList.value?.focus({preventScroll: true});
  else saveButton.value?.focus({preventScroll: true});
}

function replaceCustomPreset() {
  const preset = selectedPreset.value, source = selection.value;
  if (!preset || !source || !canCapturePreset.value || namingPreset.value) return;
  emit('saveCustomPreset', {name: preset.name, replace: true, selection: source, component: component.value});
}

function removeCustomPreset() {
  const preset = selectedPreset.value;
  if (preset && !drag.value && !namingPreset.value) emit('removeCustomPreset', {name: preset.name});
}

function applyCustomPreset() {
  const preset = selectedPreset.value;
  if (preset && canApplyPreset.value && !drag.value && !namingPreset.value) {
    emit('applyCustomPreset', {name: preset.name, selections: props.selections});
  }
}

watch(() => props.customPresets.map(({name}) => name), names => {
  if (pendingPresetName.value && names.includes(pendingPresetName.value)) {
    selectedPresetName.value = pendingPresetName.value;
    pendingPresetName.value = '';
  } else if (!names.includes(selectedPresetName.value)) selectedPresetName.value = '';
});
watch(selectionIdentity, () => {
  if (!props.selections.some(({segment}) => segmentKey(segment) === preferredSegment.value)) preferredSegment.value = null;
}, {flush: 'sync'});
watch(componentFamily, () => { preferredComponent.value = 0; }, {flush: 'sync'});
watch([selectionIdentity, activeSegmentIndex, component, () => props.disabled], () => {
  releaseDrag();
  closePresetName(false);
}, {flush: 'sync'});
watch(() => props.selections[0]?.documentKey, () => {
  selectedHandles.value = new Set();
}, {flush: 'sync'});
watch(handles, current => {
  if (!selectedHandles.value.size) return;
  const live = new Set(current.map(handle => handle.id));
  const retained = new Set([...selectedHandles.value].filter(id => live.has(id)));
  if (retained.size !== selectedHandles.value.size) selectedHandles.value = retained;
}, {flush: 'sync'});
watch(selectedHandles, releaseDrag, {flush: 'sync'});
onBeforeUnmount(releaseDrag);
</script>

<template>
  <div class="curves-panel" data-testid="curves-panel" @keydown.space.stop @keydown.esc="cancelWithEscape">
    <div class="curve-tools">
      <div class="curve-buttons" role="group" :aria-label="t('animation_curveTools')">
        <button v-for="option in shapeOptions" :key="option.id" type="button"
          :aria-label="t(option.label)" :title="t(option.label)" :aria-pressed="shapePressed(option.id)"
          :disabled="!canEdit || !!drag || !allowsInterpolation(option.id)"
          :data-testid="'curves-interpolation-' + option.id" @click="recordShape(option.id)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="option.glyph" /></svg>
        </button>
      </div>
      <select v-if="segmentOptions.length > 1" class="curve-select curve-segment-select" :aria-label="t('animation_curvesSegment')"
        :value="activeSegmentIndex" data-testid="curves-segment-select" @change="chooseSegment">
        <option v-for="option in segmentOptions" :key="option.key" :value="option.index">{{ option.label }}</option>
      </select>
      <span v-else-if="normalized" class="curve-span" :title="channelLabel" data-testid="curves-segment-span">
        {{ channelLabel }} · {{ segmentRange(normalized.startFrame, normalized.endFrame) }}
      </span>
      <div v-if="normalized && components.length === 2" class="curve-buttons curve-components" role="group" :aria-label="t('animation_curvesComponent')">
        <button v-for="{label, index} in components" :key="index" type="button" :aria-pressed="component === index"
          :data-testid="'curves-component-' + index" @click="preferredComponent = index">{{ label }}</button>
      </div>
      <select v-else-if="normalized && components.length > 2" class="curve-select curve-components"
        :aria-label="t('animation_curvesComponent')" :value="component" data-testid="curves-component-select" @change="setComponent">
        <optgroup v-for="group in componentGroups" :key="group.label" :label="group.label">
          <option v-for="{label, index} in group.options" :key="index" :value="index" :data-testid="'curves-component-' + index">{{ label }}</option>
        </optgroup>
      </select>
    </div>
    <p v-if="twoColor" class="curve-limit" data-testid="curves-linear-only">{{ t('slotTwoColorLinearOnly') }}</p>
    <div class="curve-body">
      <div class="curve-chart" :style="{'--curve-ink': componentColor}">
        <p v-if="focusedEqualBezier || !plotVisible" role="status" :data-testid="focusedEqualBezier ? 'curves-equal' : 'curves-empty'">
          {{ t(focusedEqualBezier ? 'animation_curvesEqual' : 'animation_curvesPickSegment') }}
        </p>
        <svg v-if="plotVisible" ref="plot" viewBox="0 0 264 134" role="group" :aria-label="t('animation_curvesPlot')" data-testid="curves-plot"
          @pointermove="moveDrag" @pointerup="finishDrag" @pointercancel="cancelPointer" @lostpointercapture="cancelPointer">
          <g class="curve-grid" aria-hidden="true">
            <path v-for="tick in grid" :key="tick" :d="`M${x(tick)} ${view.top}V${view.bottom}M${view.left} ${y(tick)}H${view.right}`" />
            <text :x="x(0)" y="127" text-anchor="middle">0%</text>
            <text v-if="x(1)-x(0)>28" :x="x(1)" y="127" text-anchor="middle">100%</text>
            <text v-if="x(1)-x(0)>90" :x="(x(0)+x(1))/2" y="127" text-anchor="middle">{{ t('animation_curvesTime') }}</text>
            <text x="28" :y="y(0)+3" text-anchor="end">0%</text>
            <text v-if="y(0)-y(1)>15" x="28" :y="y(1)+3" text-anchor="end">100%</text>
            <text transform="rotate(-90 11 62)" x="11" y="62" text-anchor="middle">{{ t('animation_curvesProgress') }}</text>
          </g>
          <path v-for="overlay in overlays" :key="overlay.key" class="curve-overlay" :d="lanePath(overlay.lane, shownControls(overlay.source, overlay.lane))"
            aria-hidden="true" data-testid="curves-overlay-path" vector-effect="non-scaling-stroke" />
          <path v-if="path" class="segment-path" :d="path" data-testid="curves-path" vector-effect="non-scaling-stroke" />
          <g v-if="path" aria-hidden="true" class="curve-endpoints">
            <circle :cx="x(start.x)" :cy="y(start.y)" r="3" />
            <circle :cx="x(end.x)" :cy="y(end.y)" r="3" />
          </g>
          <g v-for="handle in shownHandles" :key="handle.id">
            <path :d="`M${xy(handle.member.control===0?start:{x:1,y:1})}L${xy(handle.displayed)}`"
              class="handle-link" :class="{'overlay-link':handle.overlay}" vector-effect="non-scaling-stroke" aria-hidden="true" />
            <circle class="curve-handle" :class="{'overlay-handle':handle.overlay}"
              :cx="x(handle.displayed.x)" :cy="y(handle.displayed.y)" :r="handle.overlay?4:5"
              :tabindex="canEdit ? 0 : -1" role="button" :aria-disabled="!canEdit" :aria-pressed="selectedHandles.has(handle.id)"
              :aria-label="handleLabel(handle, handle.displayed)"
              :data-testid="handle.overlay?`curves-overlay-handle-${handle.member.id}-${handle.member.component}-${handle.member.control}`:`curves-handle-${handle.member.control}`"
              :data-curve-time="handle.displayed.x" :data-curve-progress="handle.displayed.y"
              vector-effect="non-scaling-stroke" @pointerdown.stop="startDrag($event,handle)"
              @click.stop="clickHandle($event,handle)" @keydown="keyHandle($event,handle)" />
          </g>
        </svg>
      </div>
      <div class="curve-sidebar">
        <div class="curve-presets" role="group" :aria-label="t('animation_curvePresets')"
          :title="t(selections.length > 1 ? 'animation_curvesPresetScopeMultiple' : 'animation_curvesPresetScope')">
          <button v-for="preset in presets" :key="preset.id" type="button"
            :disabled="!('value' in preset) || !canApplyPreset || !!drag" :title="'value' in preset ? undefined : t('animation_plannedControls')"
            :data-testid="'curves-preset-' + preset.id" @click="'value' in preset && recordPreset(preset.value)">
            {{ t(preset.label) }}
          </button>
        </div>
        <div class="custom-presets" role="group" :aria-label="t('animation_curvesCustomPresets')">
          <div class="custom-preset-picker">
            <select ref="presetList" v-model="selectedPresetName" :aria-label="t('animation_curvesCustomPresets')"
              :disabled="!customPresets.length" data-testid="curves-custom-list">
              <option v-if="!customPresets.length" value="">{{ t('animation_curvesNoCustomPresets') }}</option>
              <option v-else value="" disabled>{{ t('animation_curvesCustomPresets') }}</option>
              <option v-for="preset in customPresets" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
            </select>
            <button type="button" :disabled="!selectedPreset || !canApplyPreset || !!drag || namingPreset"
              data-testid="curves-custom-apply" @click="applyCustomPreset">{{ t('animation_curvesApplyCustomPreset') }}</button>
          </div>
          <div class="custom-preset-actions">
            <button ref="saveButton" type="button" :disabled="!canCreatePreset" :aria-expanded="namingPreset"
              data-testid="curves-custom-save" @click="namingPreset ? closePresetName() : openPresetName()">
              {{ t('animation_curvesSaveCustomPreset') }}
            </button>
            <button type="button" :disabled="!selectedPreset || !canCapturePreset || namingPreset"
              data-testid="curves-custom-replace" @click="replaceCustomPreset">{{ t('animation_curvesReplaceCustomPreset') }}</button>
            <button type="button" :disabled="!selectedPreset || !!drag || namingPreset"
              data-testid="curves-custom-remove" @click="removeCustomPreset">{{ t('animation_curvesRemoveCustomPreset') }}</button>
          </div>
          <form v-if="namingPreset" class="custom-preset-name" @submit.prevent="createCustomPreset">
            <input ref="nameField" v-model="draftName" required :maxlength="maxCurvePresetNameLength" :aria-invalid="duplicateName"
              :aria-label="t('animation_curvesPresetName')" :placeholder="t('animation_curvesPresetName')" data-testid="curves-custom-name" />
            <p v-if="duplicateName" role="status">{{ t('animation_curvesPresetNameTaken') }}</p>
            <div class="custom-preset-actions">
              <button type="submit" :disabled="!normalizedDraftName || duplicateName || !canCreatePreset"
                data-testid="curves-custom-create">{{ t('save') }}</button>
              <button type="button" data-testid="curves-custom-cancel" @click="closePresetName()">{{ t('cancel') }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.curves-panel {
  container-type: inline-size;
  display: grid;
  align-content: start;
  min-width: 0;
  gap: 5px;
  padding: 5px;
  font-size: 11px;
}

.curve-tools, .curve-buttons, .curve-presets { display: flex; gap: 3px; }
.curve-tools { flex-wrap: wrap; align-items: center; }
.curve-span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-muted); }
.curve-components { margin-inline-start: auto; }
.curve-select {
  min-width: 0;
  max-width: 100%;
  height: 22px;
  padding: 1px 4px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  background: var(--color-raised);
  color: var(--color-ink);
}
.curve-segment-select { flex: 1 1 126px; }
.curve-limit { margin: 0; color: var(--color-muted); }
.curves-panel button {
  min-width: 24px;
  min-height: 22px;
  padding: 1px 5px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  background: var(--color-raised);
  color: var(--color-ink);
}
.curves-panel button:hover:not(:disabled) { border-color: var(--color-accent); }
.curves-panel button:disabled { opacity: .5; }
.curves-panel button[aria-pressed=true] { border-color: var(--color-accent); background: var(--color-accent-deep); }
.curves-panel button[aria-pressed=mixed] { border-style: dashed; border-color: var(--color-faint); }
.curve-buttons svg { display: block; width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; }
.curve-body { display: grid; gap: 5px; min-width: 0; }
.curve-chart {
  --curve-ink: var(--color-accent);
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 81px;
  border: 1px solid var(--color-line);
  border-radius: 4px;
  background: var(--color-shell);
}
.curve-chart > svg { display: block; width: 100%; max-height: 150px; }
.curve-chart p { margin: 0; padding: 8px; text-align: center; color: var(--color-muted); }
.curve-grid { pointer-events: none; }
.curve-grid path { fill: none; stroke: var(--color-line); stroke-width: 1; }
.curve-grid text { fill: var(--color-muted); font: 10px var(--font-sans); }
.curve-overlay { fill: none; stroke: var(--color-faint); stroke-width: 1.3; stroke-dasharray: 3 2; pointer-events: none; }
.segment-path { fill: none; stroke: var(--curve-ink); stroke-width: 1.7; }
.curve-endpoints { fill: var(--curve-ink); pointer-events: none; }
.handle-link { fill: none; stroke: var(--color-faint); stroke-width: 1; pointer-events: none; }
.handle-link.overlay-link { stroke-dasharray: 2 2; }
.curve-handle { fill: var(--color-shell); stroke: var(--curve-ink); stroke-width: 1.5; touch-action: none; }
.curve-handle.overlay-handle { stroke: var(--color-faint); }
.curve-handle[aria-pressed=true] { fill: var(--curve-ink); stroke: var(--curve-ink); }
.curve-handle:not([aria-disabled=true]) { cursor: move; }
.curve-handle:focus-visible { outline: none; }
.curve-handle:is(:hover,:focus-visible):not([aria-disabled=true]) { fill: var(--curve-ink); stroke: var(--color-ink); }
.curve-presets { flex-wrap: wrap; align-content: start; }
.curve-sidebar, .custom-presets, .custom-preset-picker, .custom-preset-name { display: grid; gap: 4px; min-width: 0; }
.curve-sidebar { align-content: start; }
.custom-presets { margin-top: 2px; padding-top: 5px; border-top: 1px solid var(--color-line); }
.custom-preset-picker { grid-template-columns: minmax(0, 1fr) auto; }
.custom-preset-picker select, .custom-preset-name input {
  width: 100%;
  min-width: 0;
  min-height: 22px;
  padding: 2px 4px;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  background: var(--color-shell);
  color: var(--color-ink);
  font: inherit;
}
.custom-preset-picker select:disabled { color: var(--color-muted); }
.custom-preset-actions { display: flex; flex-wrap: wrap; gap: 3px; }
.custom-preset-name p { margin: 0; color: var(--color-warning); }
@container (max-width: 329px) {
  .curve-chart > svg { max-height: 125px; }
}
@container (min-width: 330px) {
  .curve-body { grid-template-columns: minmax(0, 1fr) minmax(132px, 37%); align-items: start; }
  .custom-preset-picker { grid-template-columns: minmax(0, 1fr); }
}
</style>
