<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {boneTransformFields} from '../../domain/boneFields';
import type {BoneFieldEditor} from '../../composables/useBoneFieldEditor';
import AppIcon from '../atoms/AppIcon.vue';
defineProps<{editor:BoneFieldEditor}>();
const w=useWorkspace(),{t}=useI18n();
</script>
<template>
  <section v-if="w.selectedBone&&w.editMode==='bones'" class="bone-transform-hud" :aria-label="t('boneTransforms')">
    <div class="flex min-w-0 items-center gap-1.5 border-b border-line pb-1 text-xs text-muted">
      <AppIcon name="bone" class="!size-3.5 text-accent"/><span class="min-w-0 flex-1 truncate text-ink">{{ w.selectedBone.name }}</span>
      <span class="shrink-0 text-[10px]" :title="t('localTransformHint')">{{ t('localCoordinates') }}</span>
    </div>
    <p v-if="w.selectedIds.length>1" class="mt-1 text-[10px] text-muted">{{ t('activeBoneFields',{count:w.selectedIds.length}) }}</p>
    <fieldset class="bone-transform-grid" :disabled="!w.canEdit||w.busy||w.traceOpen">
      <label v-for="field in boneTransformFields" :key="field" class="bone-transform-field">
        <span :title="t(field)">{{ t(field) }}</span>
        <input v-model="editor.draft[field]" :data-testid="`bone-${field}`" :aria-label="t(field)" type="number" step="any" :min="field==='length'?0:-1000000" max="1000000" required class="editor-input tabular-nums" @change="editor.commit(field)" @keydown.enter.stop.prevent="editor.enter($event,field)" @keydown.esc.stop.prevent="editor.escape($event)">
      </label>
    </fieldset>
    <p v-if="w.inspectorError" role="status" class="mt-1 text-[10px] leading-4 text-danger">{{ w.inspectorError }}</p>
  </section>
</template>
