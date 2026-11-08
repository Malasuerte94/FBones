<script setup lang="ts">
import {computed,onBeforeUnmount,onMounted,ref,useId,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import type {AppUpdater} from '../../composables/useAppUpdater';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
const props=defineProps<{updater:AppUpdater}>();
const {t,locale}=useI18n(),expanded=ref(false),root=ref<HTMLElement|null>(null),panelId=useId();
const state=computed(()=>props.updater.snapshot.value);
const percent=computed(()=>props.updater.percent.value);
const busy=computed(()=>props.updater.busy.value);
const autoEnabled=computed(()=>props.updater.autoEnabled.value);
watch(()=>props.updater.visible.value,value=>{if(value)expanded.value=true;},{immediate:true});
const status=computed(()=>{
 const value=state.value;
 if(props.updater.preparing.value&&!props.updater.installing.value)return t('updatePreparing');
 return t({idle:'updateIdle',checking:'updateChecking',upToDate:'updateUpToDate',available:'updateAvailable',downloading:'updateDownloading',ready:'updateReady',installing:'updateInstalling',error:'updateError',unsupported:'updateUnsupported'}[value.phase],{version:value.version??''});
});
function bytes(value:number){const scale=value>=1_048_576?1_048_576:value>=1024?1024:1;return new Intl.NumberFormat(locale.value,{maximumFractionDigits:1}).format(value/scale)+' '+(scale===1_048_576?'MiB':scale===1024?'KiB':'B');}
const progressText=computed(()=>`${bytes(state.value.downloaded)}${state.value.total===null?'':' / '+bytes(state.value.total)}`);
function close(){if(props.updater.installing.value)return;expanded.value=false;props.updater.dismiss();}
function outside(event:PointerEvent){if(expanded.value&&!root.value?.contains(event.target as Node))close();}
onMounted(()=>document.addEventListener('pointerdown',outside));
onBeforeUnmount(()=>document.removeEventListener('pointerdown',outside));
</script>
<template>
 <section ref="root" class="relative min-w-0" data-testid="app-updater" :data-phase="state.phase" @keydown.esc.prevent.stop="close">
  <button type="button" class="dock-tab flex items-center gap-1.5" :aria-expanded="expanded" :aria-controls="panelId" data-testid="app-updates-toggle" @click="expanded?close():expanded=true"><AppIcon name="reset" class="!size-3.5"/><span>{{t('updateTitle')}}</span><span v-if="state.phase==='ready'" class="size-1.5 rounded-full bg-accent" :aria-label="t('updateReady',{version:state.version??''})"/><span v-else-if="state.phase==='downloading'" class="text-[10px] tabular-nums text-muted">{{percent===null?progressText:`${Math.floor(percent)}%`}}</span></button>
  <div v-if="expanded" :id="panelId" role="region" :aria-label="t('updateTitle')" class="absolute right-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-1rem)] space-y-2 rounded border border-line bg-panel p-2 shadow-lg" data-testid="app-update-panel">
   <div class="flex items-start justify-between gap-2"><p role="status" aria-live="polite" class="min-w-0 text-xs leading-4" data-testid="app-update-status">{{status}}</p><button type="button" class="dock-tab !p-0.5" :disabled="updater.installing.value" :aria-label="t('close')" @click="close"><AppIcon name="close" class="!size-3"/></button></div>
   <p v-if="state.currentVersion" class="text-[10px] text-muted">{{t('updateCurrentVersion',{version:state.currentVersion})}}</p>
   <template v-if="state.phase==='downloading'"><progress :value="percent??undefined" max="100" class="h-1.5 w-full accent-accent" :aria-label="t('updateDownloadProgress')" data-testid="app-update-progress"/><p class="text-[10px] tabular-nums text-muted">{{progressText}}</p></template>
   <p v-if="state.phase==='error'&&state.error" role="alert" class="break-words text-[11px] leading-4 text-danger" data-testid="app-update-error">{{state.error}}</p>
   <p v-if="!state.supported&&state.phase!=='checking'" class="text-[11px] leading-4 text-muted" data-testid="app-update-first-installer">{{t('updateInitialInstaller')}}</p>
   <div class="flex flex-wrap gap-1.5">
    <AppButton v-if="state.phase==='ready'" :disabled="busy" data-testid="app-update-install" @click="updater.install()">{{t('updateInstallRestart')}}</AppButton>
    <AppButton v-else-if="state.phase==='available'" :disabled="busy" data-testid="app-update-download" @click="updater.download()">{{t('updateDownload')}}</AppButton>
    <AppButton v-else-if="state.phase==='error'" :disabled="busy" data-testid="app-update-retry" @click="updater.retry()">{{t('updateRetry')}}</AppButton>
    <AppButton :disabled="busy" data-testid="app-update-check" @click="updater.checkNow()">{{t('updateCheck')}}</AppButton>
    <AppButton :disabled="updater.installing.value" @click="close">{{t('updateLater')}}</AppButton>
   </div>
   <label class="flex items-start gap-1.5 border-t border-line pt-2 text-[11px] leading-4 text-muted"><input type="checkbox" class="mt-0.5" :checked="autoEnabled" :disabled="updater.installing.value" data-testid="app-update-auto" @change="updater.setAutoEnabled(($event.target as HTMLInputElement).checked)"/><span>{{t('updateAuto')}}</span></label>
   <a href="https://github.com/Malasuerte94/FBones/releases" target="_blank" rel="noopener noreferrer" class="inline-block text-[11px] text-accent underline underline-offset-2">{{t('updateReleaseNotes')}}</a>
  </div>
 </section>
</template>
