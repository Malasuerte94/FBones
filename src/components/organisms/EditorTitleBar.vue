<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {errorMessage} from '../../domain/project';
import {desktop, macDesktop, nativeWindow} from '../../services/bridge';
import AppIcon from '../atoms/AppIcon.vue';

defineProps<{locked:boolean; title:string; dirty:boolean}>();
const emit = defineEmits<{close:[]; error:[reason:string]}>();
const {t} = useI18n();
const decorated = ref(true);
const maximized = ref(false);
const maximizeLabel = computed(() => t(maximized.value ? 'windowRestore' : 'windowMaximize'));
let disposed = false;
let stopResize: (() => void) | undefined;
let maximizeRequest = 0;

function report(reason: unknown) {
  if (!disposed) emit('error', errorMessage(reason));
}

async function syncMaximized() {
  const request = ++maximizeRequest;
  try {
    const value = await nativeWindow().isMaximized();
    if (!disposed && request === maximizeRequest) maximized.value = value;
  } catch (reason) {
    if (request === maximizeRequest) report(reason);
  }
}

async function minimize() {
  try {
    await nativeWindow().minimize();
  } catch (reason) {
    report(reason);
  }
}

async function toggleMaximized() {
  try {
    await nativeWindow().toggleMaximize();
    await syncMaximized();
  } catch (reason) {
    report(reason);
  }
}

onMounted(async () => {
  if (!desktop) return;
  try {
    const window = nativeWindow();
    const useNativeCaption = await window.isDecorated();
    if (disposed) return;
    decorated.value = useNativeCaption;
    if (useNativeCaption) return;
    const stop = await window.onResized(() => { void syncMaximized(); });
    if (disposed) {
      stop();
      return;
    }
    stopResize = stop;
    await syncMaximized();
  } catch (reason) {
    report(reason);
  }
});

onBeforeUnmount(() => {
  disposed = true;
  stopResize?.();
});
</script>

<template>
  <header class="editor-header" :class="{'editor-header-mac': macDesktop&&decorated}" data-testid="window-titlebar">
    <div class="editor-title-actions" :inert="locked"><slot name="leading"/></div>
    <div class="editor-title-drag" :data-tauri-drag-region="desktop?'':undefined" :title="title" data-testid="window-title-drag">
      <span class="truncate">{{title}}</span>
      <template v-if="dirty">
        <span class="text-warning" aria-hidden="true">*</span>
        <span class="sr-only">{{t('windowUnsaved')}}</span>
      </template>
    </div>
    <div class="editor-title-actions" :inert="locked"><slot name="trailing"/></div>
    <div v-if="!decorated" class="editor-caption" role="group" :aria-label="t('windowControls')">
      <button type="button" class="editor-caption-button" :aria-label="t('windowMinimize')" :title="t('windowMinimize')" data-testid="window-minimize" @click="minimize">
        <span class="editor-caption-minimize" aria-hidden="true"/>
      </button>
      <button type="button" class="editor-caption-button" :aria-label="maximizeLabel" :title="maximizeLabel" data-testid="window-maximize" @click="toggleMaximized">
        <span class="editor-caption-maximize" :class="{'editor-caption-restore': maximized}" aria-hidden="true"/>
      </button>
      <button type="button" class="editor-caption-button editor-caption-close" :aria-label="t('windowClose')" :title="t('windowClose')" :disabled="locked" data-testid="window-close" @click="emit('close')">
        <AppIcon name="close" class="!size-3.5"/>
      </button>
    </div>
  </header>
</template>
