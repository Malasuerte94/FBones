<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
const props=withDefaults(defineProps<{
 modelValue:string;label:string;testId:string;contextKey:string;min:number;max:number;step?:number;
 tone?:'accent'|'motion'|'bone'|'warning'|'danger'|'muted'|'inertia';icon?:string;disabled?:boolean;locked?:boolean;mixed?:boolean;
}>(),{step:0.1,tone:'accent',icon:'mix',disabled:false,locked:false});
const emit=defineEmits<{'update:modelValue':[value:string];begin:[];commit:[];cancel:[]}>();
const {t}=useI18n();
const active=ref(false),dirty=ref(false),keyboardActive=ref(false);let startContext='',pointer:number|null=null;
const numeric=computed(()=>props.modelValue.trim()?Number(props.modelValue):NaN);
const finite=computed(()=>Number.isFinite(numeric.value));
const outside=computed(()=>finite.value&&(numeric.value<props.min||numeric.value>props.max));
const sliderValue=computed(()=>finite.value?Math.min(props.max,Math.max(props.min,numeric.value)):props.min);
const percent=computed(()=>`${100*(sliderValue.value-props.min)/(props.max-props.min||1)}%`);
const symbols:Record<string,string>={
 x:'M3 12h18m-4-4 4 4-4 4M7 8l-4 4 4 4',y:'M12 3v18m-4-4 4 4 4-4M8 7l4-4 4 4',
 rotate:'M5 9a7 7 0 1 1 0 6M5 4v5h5',scaleX:'M3 6v12m18-12v12M5 12h14m-3-3 3 3-3 3M8 9l-3 3 3 3',
 shearX:'M7 4h13l-3 16H4L7 4Zm-4 0h4m10 16h4',limit:'M5 4v16m14-16v16M8 12h8',
 fps:'M5 6h14v14H5zM8 3v6m8-6v6M8 13h8m-8 4h5',inertia:'M4 15h13m-4-4 4 4-4 4M4 6h7m-7 4h5',
 strength:'m3 13 4-6 4 10 4-10 4 6h2',damping:'M3 12c3-13 5 13 8 0s5 5 7 0h3',
 mass:'M7 7h10l4 13H3L7 7Zm2 0V5a3 3 0 0 1 6 0v2',wind:'M3 8h13a3 3 0 1 0-3-3M3 12h17M3 16h10a3 3 0 1 1-3 3',
 gravity:'M12 3v15m-5-5 5 5 5-5M5 22h14',mix:'M4 7h16M4 17h16M8 4v6m8 4v6',
};
function begin(){if(props.disabled||props.locked||active.value)return;active.value=true;dirty.value=false;startContext=props.contextKey;emit('begin');}
function stage(event:Event){if(props.locked){const input=event.target as HTMLInputElement;input.value=input.type==='range'?String(sliderValue.value):props.modelValue;return;}begin();if(!active.value)return;dirty.value=true;emit('update:modelValue',(event.target as HTMLInputElement).value);}
function finish(){if(!active.value)return;const valid=startContext===props.contextKey,changed=dirty.value;active.value=false;dirty.value=false;keyboardActive.value=false;pointer=null;if(!valid){emit('cancel');return;}if(changed)emit('commit');}
function cancel(){active.value=false;dirty.value=false;keyboardActive.value=false;pointer=null;emit('cancel');}
function pointerDown(event:PointerEvent){if(props.locked){event.preventDefault();return;}begin();if(!active.value)return;pointer=event.pointerId;(event.currentTarget as HTMLInputElement).setPointerCapture(event.pointerId);}
function pointerUp(event:PointerEvent){if(pointer!==event.pointerId)return;finish();const input=event.currentTarget as HTMLInputElement;if(input.hasPointerCapture(event.pointerId))input.releasePointerCapture(event.pointerId);}
function keydown(event:KeyboardEvent){
 if(props.locked&&event.key!=='Escape'&&event.key!=='Tab'){event.preventDefault();event.stopPropagation();return;}
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();return;}
 if(event.key==='Enter'){event.preventDefault();event.stopPropagation();finish();(event.target as HTMLInputElement).blur();return;}
 if((event.target as HTMLInputElement).type==='range'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)){begin();keyboardActive.value=true;}
}
function keyup(event:KeyboardEvent){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)){keyboardActive.value=false;finish();}}
watch(()=>props.contextKey,(next,previous)=>{if(next!==previous&&active.value)cancel();});
watch(()=>props.disabled||props.locked,unavailable=>{if(unavailable&&active.value)cancel();});
</script>
<template>
 <div class="numeric-slider-row" :class="`numeric-slider-row--${tone}`" :data-testid="`${testId}-row`" :data-outside-range="outside||undefined" :aria-busy="locked||undefined" :style="{'--numeric-fill':percent}">
  <span class="numeric-slider-label" :title="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="symbols[icon]??symbols.mix"/></svg><span>{{label}}</span></span>
  <input :value="modelValue" type="text" inputmode="decimal" class="editor-input numeric-slider-number" :aria-label="t('numericValue',{name:label})" :data-testid="testId" :disabled="disabled" :readonly="locked" :placeholder="mixed?t('mixedValue'):undefined" :title="outside?t('outsideSliderRange'):undefined" @focus="begin" @input="stage" @change="finish" @blur="finish" @keydown="keydown"/>
  <input :value="sliderValue" type="range" :min="min" :max="max" :step="step" class="numeric-slider-track" :aria-label="t('numericSlider',{name:label})" :aria-valuetext="mixed&&!finite?t('mixedValue'):modelValue" :data-testid="`${testId}-slider`" :disabled="disabled||!finite" :aria-disabled="disabled||locked||!finite" @pointerdown="pointerDown" @pointerup="pointerUp" @pointercancel="cancel" @lostpointercapture="active&&pointer!==null&&cancel()" @input="stage" @change="!keyboardActive&&pointer===null&&finish()" @blur="finish" @keydown="keydown" @keyup="keyup"/>
  <span v-if="$slots.trailing" class="numeric-slider-trailing"><slot name="trailing"/></span>
 </div>
</template>
