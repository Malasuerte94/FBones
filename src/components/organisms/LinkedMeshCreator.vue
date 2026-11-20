<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import AppButton from '../atoms/AppButton.vue';
import ModalDialog from '../molecules/ModalDialog.vue';

const emit = defineEmits<{close: []}>();
const w = useWorkspace();
const {t} = useI18n();
const project = w.project;
const initialSource = w.linkedMeshCreationSources.find(attachment => attachment.id === w.selectedAttachmentId);
const sourceId = ref<number | null>(initialSource?.id ?? null);
const chosenSlot = ref<number | null>(null);
const nameDraft = ref<string | null>(null);
const submitting = ref(false);
const error = ref('');

const slots = computed(() => w.project?.slots ?? []);
const slotNames = computed(() => new Map(slots.value.map(slot => [slot.id, slot.name])));
const source = computed(() => w.linkedMeshCreationSources.find(attachment => attachment.id === sourceId.value));
const destination = computed(() => slots.value.find(slot => slot.id === (chosenSlot.value ?? source.value?.slot)));
const takenNames = computed(() => new Set(destination.value?.attachments?.map(attachment => attachment.name)));
const suggestedName = computed(() => {
  const mesh = source.value;
  if (!mesh || !destination.value) return '';
  for (let index = 0; ; index++) {
    const suffix = index ? `_linked_${index}` : '_linked';
    const prefix = mesh.name.slice(0, 120 - suffix.length).replace(/[\uD800-\uDBFF]$/u, '');
    const name = prefix + suffix;
    if (!takenNames.value.has(name)) return name;
  }
});
const name = computed(() => nameDraft.value ?? suggestedName.value);
const nameInUse = computed(() => takenNames.value.has(name.value.trim()));
const currentProject = computed(() => !!project && w.project?.documentId === project.documentId &&
  w.project.revision === project.revision && w.editorMode === 'setup');
const busy = computed(() => submitting.value || w.busy || w.editing);
const valid = computed(() => currentProject.value && w.sceneEditing && w.canEdit && !w.inspectorError &&
  !!source.value && !!destination.value && !!name.value.trim() && !nameInUse.value);
watch([sourceId, chosenSlot, nameDraft], () => { error.value = ''; });

function chooseSlot(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  chosenSlot.value = value ? Number(value) : null;
}

async function submit() {
  const mesh = source.value, slot = destination.value;
  if (!project || !mesh || !slot || !valid.value || busy.value) return;
  submitting.value = true;
  error.value = '';
  try {
    if (await w.editRig({type: 'createLinkedMesh', source: mesh.id, slot: slot.id, name: name.value.trim()}, project.revision)) {
      emit('close');
    } else {
      error.value = w.noticeError && w.notice ? w.notice : t('linkedMeshCreateFailed');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <ModalDialog :title="t('newLinkedMesh')" :busy="busy" test-id="linked-mesh-creator" isolate-keys @cancel="emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <label class="block text-xs text-muted">
        {{t('linkedMeshSourceLabel')}}
        <select v-model="sourceId" class="editor-input mt-1 w-full" data-testid="linked-mesh-create-source" :disabled="busy||!currentProject">
          <option :value="null" disabled>{{t('linkedMeshChooseSource')}}</option>
          <option v-for="item in w.linkedMeshCreationSources" :key="item.id" :value="item.id">{{slotNames.get(item.slot)}} / {{item.name}}</option>
        </select>
      </label>
      <label class="block text-xs text-muted">
        {{t('ownerSlot')}}
        <select :value="destination?.id??''" class="editor-input mt-1 w-full" data-testid="linked-mesh-create-slot"
          :disabled="busy||!currentProject||!source" @change="chooseSlot">
          <option value="" disabled>—</option>
          <option v-for="slot in slots" :key="slot.id" :value="slot.id">{{slot.name}}</option>
        </select>
      </label>
      <label class="block text-xs text-muted">
        {{t('attachmentName')}}
        <input :value="name" class="editor-input mt-1 w-full" maxlength="120" required autocomplete="off"
          data-testid="linked-mesh-create-name" :disabled="busy||!currentProject" :aria-invalid="nameInUse"
          @input="nameDraft=($event.target as HTMLInputElement).value"/>
      </label>
      <p v-if="!currentProject||nameInUse||error" role="alert" class="text-xs text-danger">
        {{!currentProject?t('linkedMeshCreateStale'):nameInUse?t('linkedMeshNameInUse'):error}}
      </p>
      <div class="flex justify-end gap-2">
        <AppButton :disabled="busy" @click="emit('close')">{{t('cancel')}}</AppButton>
        <AppButton type="submit" variant="primary" :disabled="busy||!valid">{{t('createObject')}}</AppButton>
      </div>
    </form>
  </ModalDialog>
</template>
