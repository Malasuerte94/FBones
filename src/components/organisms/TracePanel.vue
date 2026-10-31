<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
const w=useWorkspace(),{t}=useI18n(),queued=ref(false);
let timer:ReturnType<typeof setTimeout>|undefined,generation=0;
function schedule(){
  const request=++generation;queued.value=true;
  if(timer)clearTimeout(timer);
  timer=setTimeout(()=>{timer=undefined;void w.previewTrace().finally(()=>{if(request===generation)queued.value=false;});},200);
}
watch(()=>[w.traceOptions.alphaThreshold,w.traceOptions.tolerance,w.traceOptions.spacing,w.traceOptions.inner,w.traceOptions.innerThreshold,w.traceOptions.innerTolerance,w.traceOptions.innerSpacing,w.traceOptions.maxVertices],schedule);
onBeforeUnmount(()=>{generation++;if(timer)clearTimeout(timer);});
</script>
<template>
  <section class="trace-panel" role="dialog" :aria-label="t(w.traceOptions.inner?'innerTrace':'trace')" :aria-busy="w.traceBusy||queued" @keydown.esc.stop.prevent="w.cancelTrace()">
    <div class="dock-title"><AppIcon name="mesh"/><h2>{{ t(w.traceOptions.inner?'innerTrace':'trace') }}</h2><button class="ml-auto rounded-sm p-0.5 text-muted hover:text-ink" :aria-label="t('cancel')" @click="w.cancelTrace()"><AppIcon name="close"/></button></div>
    <div class="space-y-3 p-3">
      <p class="truncate text-xs text-muted">{{ w.selectedSlot?.name }}</p>
      <div class="control-group space-y-2">
        <label class="control-row"><span>{{ t('alphaThreshold') }}</span><input v-model.number="w.traceOptions.alphaThreshold" type="range" min="0" max="254" step="1"><output>{{ w.traceOptions.alphaThreshold }}</output></label>
        <p class="text-[10px] leading-4 text-muted">{{ t('alphaThresholdHint') }}</p>
        <label class="control-row"><span>{{ t('traceTolerance') }}</span><input v-model.number="w.traceOptions.tolerance" type="range" min="0.25" max="12" step="0.25"><output>{{ w.traceOptions.tolerance }} px</output></label>
        <label class="control-row"><span>{{ t('traceSpacing') }}</span><input v-model.number="w.traceOptions.spacing" type="range" min="2" max="100" step="1"><output>{{ w.traceOptions.spacing }} px</output></label>
        <label class="control-row"><span>{{ t('vertexBudget') }}</span><input v-model.number="w.traceOptions.maxVertices" type="range" min="16" max="256" step="8"><output>{{ w.traceOptions.maxVertices }}</output></label>
      </div>
      <div class="control-group space-y-2">
        <label class="flex items-center gap-2"><input v-model="w.traceOptions.inner" type="checkbox">{{ t('innerTrace') }}</label>
        <template v-if="w.traceOptions.inner">
          <label class="control-row"><span>{{ t('innerContrast') }}</span><input v-model.number="w.traceOptions.innerThreshold" type="range" min="0.02" max="1" step="0.01"><output>{{ Math.round(w.traceOptions.innerThreshold*100) }}%</output></label>
          <label class="control-row"><span>{{ t('traceTolerance') }}</span><input v-model.number="w.traceOptions.innerTolerance" type="range" min="0.5" max="12" step="0.25"><output>{{ w.traceOptions.innerTolerance }} px</output></label>
          <label class="control-row"><span>{{ t('traceSpacing') }}</span><input v-model.number="w.traceOptions.innerSpacing" type="range" min="4" max="100" step="1"><output>{{ w.traceOptions.innerSpacing }} px</output></label>
          <p class="text-[10px] leading-4 text-muted">{{ t('innerTraceHint') }}</p>
        </template>
      </div>
      <div v-if="w.tracePreview" class="space-y-1 text-[11px] leading-4 text-muted">
        <p>{{ t('traceResult',{vertices:w.tracePreview.mesh.vertices.length,triangles:w.tracePreview.mesh.triangles.length/3}) }}</p>
        <p v-if="w.tracePreview.geometry.innerCount">{{ t('innerTraceResult',{count:w.tracePreview.geometry.innerCount}) }}</p>
        <p v-if="w.tracePreview.geometry.filledHoles" class="text-warning">{{ t('traceFilledHoles',{count:w.tracePreview.geometry.filledHoles}) }}</p>
        <p v-if="w.tracePreview.geometry.bridgedIslands" class="text-warning">{{ t('traceBridgedIslands',{count:w.tracePreview.geometry.bridgedIslands}) }}</p>
        <p v-if="w.tracePreview.geometry.budgetAdjusted" class="text-warning">{{ t('traceBudgetAdjusted',{tolerance:w.tracePreview.geometry.usedTolerance,spacing:w.tracePreview.geometry.usedSpacing}) }}</p>
      </div>
      <p v-if="w.selectedSlot?.mesh?.weighted" class="rounded-sm border border-line bg-shell p-2 text-[11px] leading-4 text-warning">{{ t('traceRebindNotice') }}</p>
      <div class="flex items-center gap-2 border-t border-line pt-2"><span role="status" class="min-w-0 flex-1 text-[11px] text-muted">{{ t(w.traceBusy||queued?'traceWorking':'tracePreviewHint') }}</span><AppButton :disabled="w.busy" @click="w.cancelTrace()">{{ t('cancel') }}</AppButton><AppButton variant="primary" :disabled="w.busy||w.traceBusy||queued||!w.tracePreview" @click="w.applyTrace()">{{ t('apply') }}</AppButton></div>
    </div>
  </section>
</template>
