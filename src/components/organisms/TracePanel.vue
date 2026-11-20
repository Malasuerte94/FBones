<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
const w=useWorkspace(),{t}=useI18n(),queued=ref(false);
const traceInputId=useId();
const outerControls=[
  {key:'alphaThreshold',label:'alphaThreshold',testId:'trace-alpha-threshold',min:0,max:254,numberStep:1,slider:{min:0,max:254,step:1}},
  {key:'padding',label:'tracePadding',testId:'trace-padding',min:0,max:32,numberStep:1,slider:{min:0,max:32,step:1}},
  {key:'tolerance',label:'traceOutlineTolerance',testId:'trace-tolerance',min:0,max:128,numberStep:'any',slider:{min:0.25,max:12,step:0.25}},
  {key:'spacing',label:'traceOutlineSpacing',testId:'trace-spacing',min:0.5,max:4096,numberStep:'any',slider:{min:2,max:100,step:1}},
  {key:'maxVertices',label:'vertexBudget',testId:'trace-vertex-budget',min:3,max:256,numberStep:1,slider:{min:16,max:256,step:8}},
] as const;
type OuterControl=typeof outerControls[number];
const plannedSettings=[
  {id:'detail',label:'traceDetail',description:'traceDetailDescription'},
  {id:'concavity',label:'traceConcavity',description:'traceConcavityDescription'},
  {id:'refinement',label:'traceRefinement',description:'traceRefinementDescription'},
] as const;
const drafts=reactive(Object.fromEntries(outerControls.map(control=>[control.key,String(w.traceOptions[control.key]??0)])) as Record<OuterControl['key'],string>);
const invalidControls=computed(()=>new Set(outerControls.filter(control=>{
  const draft=drafts[control.key];
  return !validOuterValue(control,draft===''?NaN:Number(draft));
}).map(control=>control.key)));
const hasInvalidDraft=computed(()=>invalidControls.value.size>0);
const canApply=computed(()=>!hasInvalidDraft.value&&!w.traceApplying&&!w.busy&&!w.traceBusy&&!queued.value&&!!w.tracePreview);
const status=computed(()=>{
  if(w.traceApplying)return t('traceApplying');
  if(hasInvalidDraft.value)return '';
  return t(w.traceBusy||queued.value?'traceWorking':'tracePreviewHint');
});
let timer:ReturnType<typeof setTimeout>|undefined,generation=0;

function validOuterValue(control:OuterControl,value:number){
  return Number.isFinite(value)&&value>=control.min&&value<=control.max&&(control.numberStep==='any'||Number.isInteger(value));
}

function setOuterControl(control:OuterControl,event:Event){
  const input=event.currentTarget as HTMLInputElement;
  const value=input.valueAsNumber;
  if(validOuterValue(control,value))w.traceOptions[control.key]=value;
  drafts[control.key]=input.value;
}

function outsideSlider(control:OuterControl){
  const value=w.traceOptions[control.key]??0;
  return value<control.slider.min||value>control.slider.max;
}

function schedule(invalid:boolean,wasInvalid:boolean){
  const request=++generation;
  clearTimeout(timer);
  timer=undefined;
  queued.value=!invalid;
  if(invalid){
    if(!wasInvalid)w.invalidateTracePreview();
    return;
  }
  timer=setTimeout(()=>{
    timer=undefined;
    void w.previewTrace().finally(()=>{if(request===generation)queued.value=false;});
  },200);
}

function apply(){
  if(canApply.value)void w.applyTrace();
}

watch([()=>w.traceOptions,hasInvalidDraft],([,invalid],[,wasInvalid])=>schedule(invalid,wasInvalid),{deep:true,flush:'sync'});
onBeforeUnmount(()=>{generation++;clearTimeout(timer);});
</script>
<template>
  <section class="trace-panel" role="dialog" :aria-label="t('trace')" :aria-busy="w.traceApplying||w.traceBusy||queued" @keydown.esc.stop.prevent="w.cancelTrace()">
    <div class="dock-title">
      <AppIcon name="mesh"/><h2>{{ t('trace') }}</h2>
      <button type="button" class="ml-auto rounded-sm p-0.5 text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
        :aria-label="t('cancel')" :disabled="w.traceApplying" data-testid="trace-close" @click="w.cancelTrace()"><AppIcon name="close"/></button>
    </div>
    <div class="space-y-3 p-3">
      <p class="truncate text-xs text-muted">{{ w.selectedAttachment?.name ?? w.selectedSlot?.name }}</p>
      <fieldset :disabled="w.traceApplying" class="control-group min-w-0 space-y-2">
        <template v-for="control in outerControls" :key="control.key">
          <div class="control-row">
            <span><label :for="`${traceInputId}-${control.key}`">{{ t(control.label) }}</label></span>
            <input type="range" :min="control.slider.min" :max="control.slider.max" :step="control.slider.step"
              :value="w.traceOptions[control.key]??0"
              :aria-label="t('numericSlider',{name:t(control.label)})" :data-testid="`${control.testId}-slider`" @input="setOuterControl(control,$event)">
            <input :id="`${traceInputId}-${control.key}`" type="number" :min="control.min" :max="control.max" :step="control.numberStep"
              :value="drafts[control.key]" :aria-invalid="invalidControls.has(control.key)"
              :aria-describedby="invalidControls.has(control.key)?`${traceInputId}-${control.key}-error`:undefined"
              :title="outsideSlider(control)?t('outsideSliderRange'):undefined"
              class="editor-input w-16 min-w-0 shrink-0 text-right tabular-nums" :data-testid="control.testId" @input="setOuterControl(control,$event)">
          </div>
          <p v-if="invalidControls.has(control.key)" :id="`${traceInputId}-${control.key}-error`" class="text-[11px] leading-4 text-danger" role="alert">
            {{ control.key==='padding'?t('tracePaddingInvalid'):t(control.numberStep===1?'traceWholeNumberRange':'traceNumberRange',{min:control.min,max:control.max}) }}
          </p>
          <p v-if="control.key==='alphaThreshold'" class="text-[10px] leading-4 text-muted">{{ t('alphaThresholdHint') }}</p>
        </template>
      </fieldset>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm border border-line px-2 py-1"
        role="group" :aria-labelledby="`${traceInputId}-planned`" :aria-describedby="`${traceInputId}-planned-unavailable`" data-testid="trace-planned-controls">
        <span :id="`${traceInputId}-planned`" class="text-[11px] font-medium text-muted">{{ t('tracePlanned') }}</span>
        <span :id="`${traceInputId}-planned-unavailable`" class="sr-only">{{ t('tracePlannedUnavailable') }}</span>
        <ul role="list" class="flex min-w-0 flex-wrap gap-x-2 text-[11px] leading-4 text-muted">
          <li v-for="setting in plannedSettings" :key="setting.id" :data-testid="`trace-planned-${setting.id}`"
            :title="t(setting.description)" :aria-describedby="`${traceInputId}-planned-${setting.id}`">
            {{ t(setting.label) }}
          </li>
        </ul>
        <span v-for="setting in plannedSettings" :id="`${traceInputId}-planned-${setting.id}`" :key="setting.id" class="sr-only">{{ t(setting.description) }}</span>
        <span class="ml-auto" :title="t('traceRefreshUnavailable')">
          <AppButton variant="ghost" disabled :aria-describedby="`${traceInputId}-refresh-unavailable`" data-testid="trace-refresh">{{ t('traceRefresh') }}</AppButton>
          <span :id="`${traceInputId}-refresh-unavailable`" class="sr-only">{{ t('traceRefreshUnavailable') }}</span>
        </span>
      </div>
      <fieldset :disabled="w.traceApplying" class="control-group min-w-0 space-y-2">
        <label class="flex items-center gap-2"><input v-model="w.traceOptions.inner" type="checkbox">{{ t('traceInnerDetail') }}</label>
        <template v-if="w.traceOptions.inner">
          <label class="control-row"><span>{{ t('innerContrast') }}</span><input v-model.number="w.traceOptions.innerThreshold" type="range" min="0.02" max="1" step="0.01"><output>{{ Math.round(w.traceOptions.innerThreshold*100) }}%</output></label>
          <label class="control-row"><span>{{ t('traceTolerance') }}</span><input v-model.number="w.traceOptions.innerTolerance" type="range" min="0.5" max="12" step="0.25"><output>{{ w.traceOptions.innerTolerance }} px</output></label>
          <label class="control-row"><span>{{ t('traceSpacing') }}</span><input v-model.number="w.traceOptions.innerSpacing" type="range" min="4" max="100" step="1"><output>{{ w.traceOptions.innerSpacing }} px</output></label>
          <p class="text-[10px] leading-4 text-muted">{{ t('innerTraceHint') }}</p>
        </template>
      </fieldset>
      <div v-if="w.tracePreview" class="space-y-1 text-[11px] leading-4 text-muted">
        <p>{{ t('traceResult',{vertices:w.tracePreview.mesh.vertices.length,triangles:w.tracePreview.mesh.triangles.length/3}) }}</p>
        <p v-if="w.tracePreview.geometry.innerCount">{{ t('innerTraceResult',{count:w.tracePreview.geometry.innerCount}) }}</p>
        <p v-if="w.tracePreview.geometry.filledHoles" class="text-warning">{{ t('traceFilledHoles',{count:w.tracePreview.geometry.filledHoles}) }}</p>
        <p v-if="w.tracePreview.geometry.bridgedIslands" class="text-warning">{{ t('traceBridgedIslands',{count:w.tracePreview.geometry.bridgedIslands}) }}</p>
        <p v-if="w.tracePreview.geometry.budgetAdjusted" class="text-warning">{{ t('traceBudgetAdjusted',{tolerance:w.tracePreview.geometry.usedTolerance,spacing:w.tracePreview.geometry.usedSpacing}) }}</p>
      </div>
      <p v-if="w.selectedSlot?.mesh?.weighted" class="rounded-sm border border-line bg-shell p-2 text-[11px] leading-4 text-warning">{{ t('traceRebindNotice') }}</p>
      <div class="flex items-center gap-2 border-t border-line pt-2">
        <span role="status" class="min-w-0 flex-1 text-[11px] text-muted" data-testid="trace-status">{{ status }}</span>
        <AppButton :disabled="w.traceApplying" data-testid="trace-cancel" @click="w.cancelTrace()">{{ t('cancel') }}</AppButton>
        <AppButton variant="primary" :disabled="!canApply" data-testid="trace-apply" @click="apply">{{ t('apply') }}</AppButton>
      </div>
    </div>
  </section>
</template>
