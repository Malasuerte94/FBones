<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import { hierarchy, worldBones } from '../../domain/rig';
import AppIcon from '../atoms/AppIcon.vue';
import AppButton from '../atoms/AppButton.vue';
const w = useWorkspace(), { t } = useI18n();
const rows = computed(() => hierarchy(w.project?.bones ?? []));
const depths = computed(() => new Map(worldBones(w.project?.bones ?? []).map(b => [b.id, b.depth])));
function navigate(event: KeyboardEvent, id: number) {
  const index = rows.value.findIndex(b => b.id === id);
  const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : -1;
  if (next >= 0 && next < rows.value.length) { event.preventDefault(); w.selectBone(rows.value[next]!.id); (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')[next]?.focus(); }
}
</script>
<template>
  <div class="flex h-10 shrink-0 items-center justify-between border-b border-line px-4">
    <h2 class="text-xs font-semibold">{{ t('hierarchy') }}</h2><span class="text-xs text-faint">{{ w.project?.boneCount ?? 0 }}</span>
  </div>
  <template v-if="w.project">
    <button class="m-2 flex items-center gap-2 rounded-md bg-raised px-3 py-2 text-left text-xs" @click="w.selectBone(null)"><AppIcon name="file" class="text-accent" /><span class="truncate">{{ w.project.name }}</span></button>
    <div role="tree" :aria-label="t('bones')" class="min-h-0 flex-1 overflow-auto px-2 pb-3">
      <button v-for="bone in rows" :key="bone.id" role="treeitem" :aria-selected="w.selectedId === bone.id" :aria-level="(depths.get(bone.id) ?? 0) + 1" :tabindex="w.selectedId === bone.id || (w.selectedId === null && bone.parent === null) ? 0 : -1"
        class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs outline-none focus-visible:ring-1 focus-visible:ring-accent"
        :class="w.selectedId === bone.id ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-raised hover:text-ink'"
        :style="{ paddingLeft: `${12 + (depths.get(bone.id) ?? 0) * 14}px` }" @click="w.selectBone(bone.id)" @keydown="navigate($event, bone.id)">
        <AppIcon name="bone" /><span class="truncate">{{ bone.name }}</span>
      </button>
    </div>
    <div v-if="w.canEdit" class="flex shrink-0 gap-2 border-t border-line p-3">
      <AppButton class="flex-1" :disabled="w.busy || (w.project.boneCount ?? 0) >= 128" @click="w.addBone"><AppIcon name="plus" />{{ t('addBone') }}</AppButton>
      <AppButton :disabled="w.busy || !w.selectedBone || w.selectedBone.parent === null" :title="t('deleteBone')" :aria-label="t('deleteBone')" @click="w.removeBone"><AppIcon name="trash" /></AppButton>
    </div>
  </template>
  <div v-else class="flex-1 px-5 py-8 text-xs leading-5 text-muted">{{ t('emptyHierarchy') }}</div>
  <div class="mt-auto border-t border-line px-4 py-3 text-xs text-faint">{{ t('local') }}</div>
</template>
