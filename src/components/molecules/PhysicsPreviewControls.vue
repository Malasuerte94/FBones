<script setup lang="ts">
import { computed } from 'vue';
import {useI18n} from 'vue-i18n';
import AppButton from '../atoms/AppButton.vue';
const props=defineProps<{running:boolean;enabled:boolean;time:number;error?:string;disabled?:boolean}>();
const emit=defineEmits<{run:[];pause:[];step:[];reset:[]}>();
const {t}=useI18n();
const elapsed=computed(()=>Number.isFinite(props.time)?`${Math.max(0,props.time).toFixed(3)} s`:'—');
</script>
<template>
  <section class="min-w-0 rounded-sm border border-line bg-panel p-2 text-[11px] text-ink shadow-lg" :aria-label="t('physicsPreview')" data-testid="physics-preview">
    <div class="mb-1.5 flex items-center justify-between gap-2 text-muted"><span>{{t('physicsPreview')}}</span><output class="whitespace-nowrap tabular-nums text-ink" :aria-label="t('previewTime')" data-testid="physics-preview-time">{{ elapsed }}</output></div>
    <div class="flex flex-wrap gap-1" role="group" :aria-label="t('physicsPreviewControls')">
      <label class="flex min-h-6 cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 font-medium focus-within:outline focus-within:outline-accent" :class="enabled?'border-accent/60 bg-accent-deep text-accent':'border-line bg-shell text-muted'" data-testid="physics-preview-run"><input type="checkbox" class="accent-accent" :checked="enabled" :disabled="disabled" :aria-label="t('simulatePhysics')" data-testid="physics-simulate" @change="($event.target as HTMLInputElement).checked?emit('run'):emit('pause')"/>{{t('simulatePhysics')}}</label>
      <AppButton variant="ghost" :disabled="disabled||enabled" :title="t('stepPhysicsPreview')" data-testid="physics-preview-step" @click="emit('step')">{{t('stepFrame')}}</AppButton>
      <AppButton class="!border-warning/40 !text-warning" :disabled="disabled" :title="t('resetPhysicsPreview')" data-testid="physics-preview-reset" @click="emit('reset')">{{t('resetPreview')}}</AppButton>
    </div>
    <p v-if="error" class="mt-1.5 break-words text-danger" role="alert">{{ error }}</p>
  </section>
</template>
