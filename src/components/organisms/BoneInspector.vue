<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import { canParent, hierarchy } from '../../domain/rig';
import type { BoneFieldEditor } from '../../composables/useBoneFieldEditor';
import AppIcon from '../atoms/AppIcon.vue';
const w = useWorkspace(), { t } = useI18n();
defineProps<{editor:BoneFieldEditor}>();
const parents = computed(() => hierarchy(w.project?.bones ?? []).filter(b => w.selectedBone && canParent(w.project!.bones, w.selectedBone.id, b.id)));
const color = computed(() => `#${((w.selectedBone?.color ?? 0x9b9b9bff) >>> 8).toString(16).padStart(6,'0')}`);
function reparent(event: Event) { if (w.selectedBone) void w.editRig({ type: 'reparent', id: w.selectedBone.id, parent: Number((event.target as HTMLSelectElement).value) }, w.project!.revision); }
function recolor(event: Event) {
  const bone=w.selectedBone;if(!bone)return;
  const rgb=Number.parseInt((event.target as HTMLInputElement).value.slice(1),16);
  if(!Number.isFinite(rgb))return;
  if(w.selectedIds.length>1){
    const selected=w.project?.bones.filter(b=>w.selectedIds.includes(b.id))??[];
    w.autoColor=false;
    void w.editRig({type:'setBoneColors',colors:selected.map(b=>({id:b.id,color:((rgb*256)+((b.color??0x9b9b9bff)&255))>>>0}))});
  }else void w.editRig({type:'setBoneColor',id:bone.id,color:((rgb*256)+((bone.color??0x9b9b9bff)&255))>>>0});
}
</script>
<template>
  <section v-if="w.selectedBone" class="inspector-form border-b border-line p-2">
    <div class="mb-4 flex items-center gap-2 text-xs font-medium text-accent"><AppIcon name="bone" />{{ t('boneProperties') }}</div>
    <fieldset :disabled="!w.canEdit || w.busy || w.editorMode==='animate'" class="space-y-4">
      <label class="block text-xs text-muted">{{ t('boneName') }}<input v-model="editor.draft.name" data-testid="bone-name" maxlength="120" class="mt-2 w-full rounded border border-line bg-shell px-2.5 py-2 text-ink outline-none focus:border-accent disabled:opacity-60" @change="editor.commit('name')" @keydown.enter.stop.prevent="editor.enter($event,'name')" @keydown.esc.stop.prevent="editor.escape($event)"></label>
      <label class="block text-xs text-muted">{{ t('parentBone') }}
        <select :value="w.selectedBone.parent ?? ''" :disabled="w.selectedBone.parent === null" data-testid="bone-parent" class="mt-2 w-full rounded border border-line bg-shell px-2.5 py-2 text-ink outline-none focus:border-accent disabled:opacity-60" @change="reparent">
          <option v-if="w.selectedBone.parent === null" value="">{{ t('rootBone') }}</option>
          <option v-for="bone in parents" :key="bone.id" :value="bone.id">{{ bone.name }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-xs text-muted"><input v-model="w.autoColor" type="checkbox" @change="w.applyAutoColors()">{{ t('autoColor') }}</label>
      <label class="control-row"><span>{{ t('color') }}</span><input type="color" :value="color" :aria-label="t('color')" class="h-6 min-w-0 flex-1 cursor-pointer rounded-sm border border-line bg-raised" @change="recolor"></label>
    </fieldset>
    <p class="mt-4 text-[11px] leading-5 text-faint">{{ t('bonePropertiesHint') }}</p>
  </section>
</template>
