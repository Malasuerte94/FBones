<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
defineProps<{name:string;busy:boolean;canCopy:boolean}>();
defineEmits<{open:[];copy:[]}>();
const {t}=useI18n();
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
    <section role="status" aria-live="polite" aria-atomic="true" data-testid="project-inspection-notice" class="pointer-events-auto w-full max-w-sm rounded-sm border border-warning/40 bg-panel p-4 shadow-lg">
      <div class="flex items-start gap-2"><AppIcon name="folder" class="mt-0.5 shrink-0 text-warning"/><div class="min-w-0"><h2 class="text-sm font-semibold text-ink">{{t('inspectionViewportTitle')}}</h2><p class="mt-1 truncate text-xs text-muted" :title="name">{{name}}</p></div></div>
      <p class="mt-3 text-xs leading-5 text-ink">{{t('inspectionViewportHelp')}}</p>
      <p class="mt-2 text-[11px] leading-4 text-muted">{{t(canCopy?'inspectionViewportPreserved':'inspectionHelp')}}</p>
      <div class="mt-4 flex flex-wrap gap-2"><AppButton :disabled="busy" @click="$emit('open')">{{t('openProject')}}</AppButton><AppButton v-if="canCopy" :disabled="busy" @click="$emit('copy')">{{t('saveCopy')}}</AppButton></div>
    </section>
  </div>
</template>
