<script setup lang="ts">
import { computed, ref, shallowRef, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { buildBoneRenamePreview } from '../../domain/boneRenamePreview';
import type { ProjectSummary } from '../../domain/project';
import AppButton from '../atoms/AppButton.vue';
import ModalDialog from '../molecules/ModalDialog.vue';

const props = defineProps<{
  project: ProjectSummary;
  selectedBoneIds: readonly number[];
  busy?: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  cancel: [];
  apply: [request: { documentId: number; revision: number; renames: { id: number; name: string }[] }];
}>();
const { t } = useI18n();
const descriptionId = useId();
const find = ref('');
const replacement = ref('');
const matchCase = ref(false);
const firstOccurrence = ref(false);
const scope = ref<'project' | 'selection'>('project');
const excludedIds = shallowRef<ReadonlySet<number>>(new Set());
watch([find, matchCase, scope, () => props.project.documentId], () => { excludedIds.value = new Set(); }, { flush: 'sync' });

const preview = computed(() => buildBoneRenamePreview(props.project.bones, {
  find: find.value,
  replacement: replacement.value,
  matchCase: matchCase.value,
  firstOccurrence: firstOccurrence.value,
  ...(scope.value === 'selection' ? { scopeIds: new Set(props.selectedBoneIds) } : {}),
  excludedIds: excludedIds.value,
}));
const includedCount = computed(() => preview.value.rows.filter(row => row.included).length);
const issueLabels = {
  empty: 'treeFindIssueEmpty',
  tooLong: 'treeFindIssueTooLong',
  duplicate: 'treeFindIssueDuplicate',
} as const;
const unavailableTypes = [
  'treeFindAllTypes', 'treeFindSlots', 'treeFindAttachments', 'treeFindConstraints',
  'treeFindAnimations', 'treeFindEvents', 'treeFindSkins',
] as const;

function unavailable(label: string) {
  return t('viewportUnavailableOption', { option: t(label) });
}

function setIncluded(id: number, event: Event) {
  if (props.busy) return;
  const next = new Set(excludedIds.value);
  if ((event.target as HTMLInputElement).checked) next.delete(id);
  else next.add(id);
  excludedIds.value = next;
}

function includeAll(included: boolean) {
  if (props.busy) return;
  excludedIds.value = new Set(included ? [] : preview.value.rows.map(row => row.id));
}

function apply() {
  const current = preview.value;
  if (props.busy || !current.valid) return;
  const { documentId, revision } = props.project;
  emit('apply', { documentId, revision, renames: current.renames });
}
</script>

<template>
  <ModalDialog :title="t('treeFindReplace')" wide isolate-keys :busy="busy" test-id="tree-find-replace-dialog" @cancel="emit('cancel')">
    <fieldset :disabled="busy" class="min-w-0 space-y-3">
      <div class="grid gap-2 sm:grid-cols-2">
        <label class="grid min-w-0 gap-1 text-xs text-muted">
          {{ t('treeFind') }}
          <input v-model="find" type="text" spellcheck="false" autocomplete="off" class="editor-input" data-testid="tree-find">
        </label>
        <label class="grid min-w-0 gap-1 text-xs text-muted">
          {{ t('treeReplace') }}
          <input v-model="replacement" type="text" spellcheck="false" autocomplete="off" class="editor-input" data-testid="tree-replace">
        </label>
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <label class="flex items-center gap-1.5">
          <input v-model="matchCase" type="checkbox" data-testid="tree-match-case"> {{ t('treeMatchCase') }}
        </label>
        <label class="flex items-center gap-1.5">
          <input v-model="firstOccurrence" type="checkbox" data-testid="tree-first-occurrence"> {{ t('treeFirstOccurrence') }}
        </label>
        <label class="flex items-center gap-1.5 text-muted" :title="t('treeFindUnavailable')">
          <input type="checkbox" disabled data-testid="tree-find-regex" :aria-description="t('treeFindUnavailable')"> {{ t('treeRegex') }}
        </label>
      </div>
      <div class="grid gap-2 rounded-sm border border-line bg-shell/60 p-2 sm:grid-cols-3">
        <label class="grid min-w-0 gap-1 text-xs text-muted">
          {{ t('treeFindScope') }}
          <select v-model="scope" class="editor-input" data-testid="tree-replace-scope">
            <option value="project">{{ t('treeFindProject') }}</option>
            <option value="selection" :disabled="!selectedBoneIds.length">{{ t('treeFindSelection') }}</option>
            <option value="skin" disabled>{{ unavailable('treeFindCurrentSkin') }}</option>
            <option value="skeletons" disabled>{{ unavailable('treeFindSelectedSkeletons') }}</option>
          </select>
        </label>
        <label class="grid min-w-0 gap-1 text-xs text-muted">
          {{ t('treeFindField') }}
          <select class="editor-input" data-testid="tree-find-field">
            <option value="name">{{ t('treeFindName') }}</option>
            <option value="path" disabled data-testid="tree-find-field-path">{{ unavailable('treeFindPath') }}</option>
          </select>
        </label>
        <label class="grid min-w-0 gap-1 text-xs text-muted">
          {{ t('treeFindType') }}
          <select class="editor-input" data-testid="tree-find-type">
            <option value="bone">{{ t('treeFindBones') }}</option>
            <option v-for="type in unavailableTypes" :key="type" :value="type" disabled>{{ unavailable(type) }}</option>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <p v-if="find" role="status" class="mr-auto text-xs text-muted" data-testid="tree-rename-count">
          {{ t('treeFindMatchCount', { count: preview.rows.length }) }}
        </p>
        <AppButton class="ml-auto" :disabled="includedCount === preview.rows.length" data-testid="tree-rename-include-all"
          @click="includeAll(true)">{{ t('treeFindIncludeAll') }}</AppButton>
        <AppButton :disabled="!includedCount" data-testid="tree-rename-include-none" @click="includeAll(false)">
          {{ t('treeFindIncludeNone') }}
        </AppButton>
      </div>
      <div class="max-h-[min(42vh,24rem)] min-h-16 overflow-auto rounded-sm border border-line bg-shell/60" data-testid="tree-rename-preview">
        <table v-if="preview.rows.length" class="w-full table-fixed text-left text-xs">
          <thead class="sticky top-0 bg-raised text-muted">
            <tr>
              <th scope="col" class="w-12 p-2 font-normal"><span class="sr-only">{{ t('treeFindIncluded') }}</span></th>
              <th scope="col" class="p-2 font-normal">{{ t('treeFindBefore') }}</th>
              <th scope="col" class="p-2 font-normal">{{ t('treeFindAfter') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in preview.rows" :key="row.id" class="border-t border-line align-top"
              :class="{ 'text-muted': !row.included }" :data-testid="`tree-rename-row-${row.id}`"
              :data-issue="row.issue ?? undefined">
              <td class="p-2 text-center">
                <input type="checkbox" :checked="row.included" :aria-label="t('treeFindIncludeRow', { name: row.name })"
                  :aria-describedby="row.issue ? `${descriptionId}-${row.id}` : undefined"
                  :data-testid="`tree-rename-include-${row.id}`" @change="setIncluded(row.id, $event)">
              </td>
              <th scope="row" class="break-all p-2 font-normal">{{ row.name }}</th>
              <td class="p-2">
                <span class="break-all">{{ row.replacement }}</span>
                <span v-if="row.issue" :id="`${descriptionId}-${row.id}`"
                  class="mt-0.5 block text-[11px]" :class="row.included ? 'text-danger' : 'text-muted'">
                  {{ t(issueLabels[row.issue]) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="p-3 text-xs text-muted">{{ t(find ? 'treeFindNoMatches' : 'treeFindEnterQuery') }}</p>
      </div>
    </fieldset>
    <p v-if="error" class="mt-2 text-xs text-danger" role="alert" data-testid="tree-replace-error">{{ error }}</p>
    <div class="mt-3 flex justify-end gap-2">
      <AppButton :disabled="busy" data-testid="tree-replace-cancel" @click="emit('cancel')">{{ t('cancel') }}</AppButton>
      <AppButton variant="primary" :disabled="busy || !preview.valid" data-testid="tree-replace-apply" @click="apply">
        {{ t('treeFindReplaceApply') }}
      </AppButton>
    </div>
  </ModalDialog>
</template>
