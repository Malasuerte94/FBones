<script setup lang="ts">
import {computed,reactive,watch,onBeforeUnmount} from 'vue';
import {useI18n} from 'vue-i18n';
import {validSequenceWorkingPose,type SequenceSettings,type SequenceWorkingPose} from '../../domain/animationSequence';
const props=withDefaults(defineProps<{value:SequenceWorkingPose;settings:SequenceSettings;disabled?:boolean;contextKey:string;testId?:string}>(),{disabled:false,testId:'sequence-key'});
const emit=defineEmits<{commit:[value:SequenceWorkingPose];pause:[];draftValidity:[invalid:boolean]}>();
const {t}=useI18n(),draft=reactive({mode:'0',index:'0',delay:''});
const value=computed<SequenceWorkingPose>(()=>({mode:Number(draft.mode)as SequenceWorkingPose['mode'],index:Number(draft.index),delay:Number(draft.delay)}));
const invalid=computed(()=>[draft.index,draft.delay].some(v=>!String(v).trim())||!validSequenceWorkingPose(props.settings,value.value));
function reset(){draft.mode=String(props.value.mode);draft.index=String(props.value.index);draft.delay=String(props.value.delay);}
function commit(){if(!props.disabled&&!invalid.value)emit('commit',value.value);}
watch(()=>[props.value,props.contextKey],reset,{immediate:true,deep:true});
watch(invalid,value=>emit('draftValidity',value),{immediate:true,flush:'sync'});
onBeforeUnmount(()=>emit('draftValidity',false));
</script>
<template>
 <div class="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px]" :data-testid="testId+'-editor'" @focusin="emit('pause')">
  <label class="flex items-center gap-1">{{t('sequenceMode')}}<select v-model="draft.mode" :disabled="disabled" :aria-label="t('sequenceMode')" :data-testid="testId+'-mode'" class="editor-input !min-h-5 !w-20 !px-1 !py-0.5" @change="commit" @keydown.esc.stop.prevent="reset"><option v-for="mode in [0,1,2]" :key="mode" :value="String(mode)">{{t('sequenceMode'+mode)}}</option></select></label>
  <label class="flex items-center gap-1">{{t('sequenceIndex')}}<input v-model="draft.index" type="number" min="0" :max="settings.count-1" step="1" :disabled="disabled" :aria-label="t('sequenceIndex')" :aria-invalid="invalid" :data-testid="testId+'-index'" class="editor-input !min-h-5 !w-14 !px-1 !py-0.5" @change="commit" @keydown.enter.stop.prevent="commit" @keydown.esc.stop.prevent="reset"/></label>
  <input v-model="draft.index" type="range" min="0" :max="settings.count-1" step="1" :disabled="disabled||settings.count<2" :aria-label="t('sequenceIndex')+' slider'" :data-testid="testId+'-index-slider'" class="h-3 w-20 min-w-0" @change="commit" @keydown.esc.stop.prevent="reset"/>
  <label class="flex items-center gap-1">{{t('sequenceDelay')}}<input v-model="draft.delay" type="number" min="0" step="any" :disabled="disabled" :aria-label="t('sequenceDelay')" :aria-invalid="invalid" :data-testid="testId+'-delay'" class="editor-input !min-h-5 !w-24 !px-1 !py-0.5" @change="commit" @keydown.enter.stop.prevent="commit" @keydown.esc.stop.prevent="reset"/></label>
  <span v-if="invalid" role="status" class="text-danger">{{t('sequenceInvalidKey')}}</span>
 </div>
</template>
