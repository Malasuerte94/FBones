<script setup lang="ts">
import {useId, useTemplateRef} from 'vue';
import {useI18n} from 'vue-i18n';
import {macDesktop} from '../../services/bridge';

defineProps<{
  canSave: boolean;
  canCopy: boolean;
  canClose: boolean;
  canChooseImages: boolean;
  canImportPsd: boolean;
  canExportRuntime: boolean;
  canExportSpineBundle: boolean;
  canExportGif: boolean;
}>();
const emit = defineEmits<{
  command: [id: 'new' | 'open' | 'save' | 'copy' | 'close' | 'import' | 'import-psd' | 'export-runtime' | 'export-spine-bundle' | 'export-gif'];
}>();
const {t} = useI18n();
const modifier = macDesktop ? 'Cmd' : 'Ctrl';
const menu = useTemplateRef<HTMLDetailsElement>('menu');
const trigger = useTemplateRef<HTMLElement>('trigger');
const id = useId();

const groups = [
  {id: 'project', label: 'fileProjectGroup', planned: [['package-project', 'filePackageProject']]},
  {id: 'import', label: 'fileImportGroup', planned: [
    ['import-project', 'fileImportProject'], ['import-data', 'fileImportData'],
  ]},
  {id: 'export', label: 'fileExportGroup', planned: [
    ['export-png', 'fileExportPng'], ['export-video', 'fileExportVideo'],
    ['export-json', 'fileExportJson'], ['export-binary', 'fileExportBinary'],
    ['export-html', 'fileExportHtml'], ['pack-atlas', 'filePackAtlas'],
  ]},
] as const;

function closeOnEscape(event: KeyboardEvent) {
  if (!menu.value?.open) return;
  event.preventDefault();
  event.stopPropagation();
  menu.value.open = false;
  trigger.value?.focus();
}
</script>

<template>
  <details ref="menu" class="editor-menu" @keydown.esc="closeOnEscape">
    <summary ref="trigger" data-testid="file-menu-toggle" @keydown.space.stop>{{t('fileMenu')}}</summary>
    <div class="menu-popover max-h-[calc(100dvh-2.75rem)] w-64 overflow-y-auto overscroll-contain" data-testid="file-menu-panel">
      <p :id="`${id}-planned`" class="sr-only">{{t('filePlannedDescription')}}</p>
      <section v-for="group in groups" :key="group.id" :aria-labelledby="`${id}-${group.id}`" class="border-b border-line pb-1 last:border-b-0 last:pb-0">
        <h2 :id="`${id}-${group.id}`" class="px-2 pt-1.5 pb-0.5 text-[10px] text-accent">{{t(group.label)}}</h2>
        <template v-if="group.id === 'project'">
          <button type="button" @click="emit('command', 'new')">{{t('newProject')}}<span>{{modifier}}+N</span></button>
          <button type="button" @click="emit('command', 'open')">{{t('openProject')}}<span>{{modifier}}+O</span></button>
          <button type="button" :disabled="!canSave" @click="emit('command', 'save')">{{t('save')}}<span>{{modifier}}+S</span></button>
          <button type="button" :disabled="!canCopy" @click="emit('command', 'copy')">{{t('saveAs')}}<span>{{modifier}}+Shift+S</span></button>
          <button type="button" :disabled="!canClose" @click="emit('command', 'close')">{{t('closeProject')}}<span>{{modifier}}+W</span></button>
        </template>
        <template v-else-if="group.id === 'import'">
          <button type="button" data-testid="file-choose-images" :disabled="!canChooseImages" @click="emit('command', 'import')">{{t('chooseImagesFolder')}}<span>{{modifier}}+I</span></button>
          <button type="button" data-testid="import-psd" :disabled="!canImportPsd" :title="t('importPsdHint')" @click="emit('command', 'import-psd')">{{t('importPsd')}}</button>
        </template>
        <template v-else>
          <button type="button" data-testid="export-spine-bundle" :disabled="!canExportSpineBundle" @click="emit('command', 'export-spine-bundle')">{{t('exportSpineBundle')}}</button>
          <button type="button" data-testid="export-gif" :disabled="!canExportGif" @click="emit('command', 'export-gif')">{{t('exportGif')}}</button>
          <button type="button" data-testid="export-runtime" :disabled="!canExportRuntime" @click="emit('command', 'export-runtime')">{{t('exportRuntime')}}</button>
        </template>
        <button v-for="[action, label] in group.planned" :key="action" type="button" disabled :aria-describedby="`${id}-planned`" :data-testid="`file-planned-${action}`" class="text-muted disabled:opacity-100 disabled:hover:bg-transparent">
          {{t(label)}}<span aria-hidden="true" class="text-faint">{{t('filePlanned')}}</span>
        </button>
      </section>
    </div>
  </details>
</template>
