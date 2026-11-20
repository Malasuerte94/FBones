<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import AppIcon from '../atoms/AppIcon.vue';

defineProps<{
  mode: 'dopesheet' | 'graph';
  canFrame?: boolean;
  autoFrame?: boolean;
  canStore?: boolean;
  hasStored?: boolean;
  canSwap?: boolean;
  canShift?: boolean;
  shiftKeys?: boolean;
  canOffset?: boolean;
  offsetKeys?: boolean;
  offsetDragging?: boolean;
  canAdjust?: boolean;
  adjustEnabled?: boolean;
  adjustStatusId?: string;
  openCurveControl?: 'favor' | 'presets' | null;
  curveControlsId?: string;
  canFavor?: boolean;
  canPresets?: boolean;
}>();
const emit = defineEmits<{
  frame: []; toggleAuto: []; toggleStore: []; swap: []; toggleShift: []; toggleOffset: []; toggleAdjust: [];
  toggleCurveControl: [kind: 'favor' | 'presets'];
}>();
const {t} = useI18n();
</script>

<template>
  <div role="group" :aria-label="t('animation_timingTools')" class="at-tool-group" @keydown.space.stop>
    <button type="button" :class="{active:shiftKeys}" :disabled="!canShift" :aria-pressed="!!shiftKeys"
      :title="t('animation_shiftKeysHint')" data-testid="timeline-tool-shift" @click="emit('toggleShift')">{{t('animation_shiftKeys')}}</button>
    <button type="button" :class="{active:offsetKeys,'!text-warning':offsetDragging}"
      :disabled="!canOffset" :aria-pressed="!!offsetKeys" :title="t('animation_offsetKeysHint')"
      data-testid="timeline-tool-offset" @click="emit('toggleOffset')">{{t('animation_offsetKeys')}}</button>
    <button v-if="mode==='dopesheet'" type="button" :class="{active:adjustEnabled}" :disabled="!canAdjust"
      :aria-pressed="!!adjustEnabled" :aria-describedby="adjustEnabled?adjustStatusId:undefined"
      :title="t('animation_adjustHint')" data-testid="timeline-tool-adjust" @click="emit('toggleAdjust')">
      <span aria-hidden="true">✎</span>{{t('animation_adjustKeys')}}
    </button>
  </div>
  <div v-if="mode==='graph'" role="group" :aria-label="t('animation_curveTools')" class="at-tool-group" @keydown.space.stop>
    <button type="button" :disabled="!canFrame" :aria-label="t('animation_frameCurves')" :title="t('animation_frameCurves')"
      data-testid="timeline-tool-frame" @click="emit('frame')">
      <AppIcon name="reset" class="!size-3"/><span class="timeline-command-label">{{t('animation_frameCurves')}}</span>
    </button>
    <button type="button" :class="{active:autoFrame}" :disabled="!canFrame&&!autoFrame" :aria-pressed="!!autoFrame"
      :aria-label="t('animation_autoFitCurves')" :title="t('animation_autoFitCurves')"
      data-testid="timeline-tool-auto-fit" @click="emit('toggleAuto')">
      <span aria-hidden="true">⟳</span><span class="timeline-command-label">{{t('animation_autoFitCurves')}}</span>
    </button>
    <button type="button" :disabled="!canFavor && openCurveControl !== 'favor'" :class="{active:openCurveControl==='favor'}"
      :aria-expanded="openCurveControl === 'favor'" :aria-controls="openCurveControl === 'favor' ? curveControlsId : undefined"
      :aria-label="t('animation_favorKeys')" :title="t('animation_favorKeys')"
      data-testid="timeline-tool-favor" @click="emit('toggleCurveControl', 'favor')"><span aria-hidden="true">♥</span></button>
    <button type="button" :disabled="!canPresets && openCurveControl !== 'presets'" :class="{active:openCurveControl==='presets'}"
      :aria-expanded="openCurveControl === 'presets'" :aria-controls="openCurveControl === 'presets' ? curveControlsId : undefined"
      :aria-label="t('animation_curvePresets')" :title="t('animation_curvePresets')"
      data-testid="timeline-tool-curve-presets" @click="emit('toggleCurveControl', 'presets')"><span aria-hidden="true">⌁</span></button>
    <button type="button" :class="{active:hasStored}" :disabled="!canStore" :aria-pressed="!!hasStored"
      :aria-label="t('animation_storeCurve')" :title="t('animation_storeCurve')"
      data-testid="timeline-tool-store" @click="emit('toggleStore')">
      <AppIcon name="save" class="!size-3"/><span class="timeline-command-label">{{t('animation_storeCurve')}}</span>
    </button>
    <button type="button" :disabled="!canSwap" :aria-label="t('animation_swapCurves')" :title="t('animation_swapCurves')"
      data-testid="timeline-tool-swap" @click="emit('swap')">
      <span aria-hidden="true">⇄</span><span class="timeline-command-label">{{t('animation_swapCurves')}}</span>
    </button>
  </div>
</template>
