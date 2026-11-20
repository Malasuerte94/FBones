<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { hasSplitSlotColor, type SlotAnimationChannel } from '../../domain/animationSlots';
import { linkedTimelineSourceId, type EditMode } from '../../domain/project';
import { useWorkspace } from '../../stores/workspace';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';

defineProps<{ embedded?: boolean; hideSelectionCaption?: boolean }>();
const emit = defineEmits<{ editMode: [mode: EditMode]; inspectWeights: [] }>();
const w = useWorkspace();
const { t } = useI18n();

const attachment = computed(() => w.treeFilters.attachment ? w.selectedAttachment : null);
const linkedMesh = computed(() => attachment.value?.linkedMeshSourceId !== undefined);
const deformSource = computed(() => attachment.value ? w.selectedDeformSourceId : undefined);
const slot = computed(() => (attachment.value || w.treeFilters.slot) ? w.selectedSlotRaw : null);
const selectionCount = computed(() => w.selectedAttachmentIds.length || w.selectedSlotIds.length || (slot.value ? 1 : 0));
const selectionName = computed(() => attachment.value?.name ?? slot.value?.name);
const selectionType = computed(() => linkedMesh.value ? 'newLinkedMesh' : attachment.value ? `attachment_${attachment.value.type}` : 'newSlot');
const selectionIcon = computed(() => {
  if (!attachment.value) return 'tree';
  if (attachment.value.type === 'path') return 'curve';
  if (attachment.value.clipping) return 'grid';
  return attachment.value.mesh ? 'mesh' : 'image';
});

const animate = computed(() => w.editorMode === 'animate');
const editable = computed(() => selectionCount.value === 1 && w.canEdit && !w.busy && !w.editing &&
  !w.traceOpen && !w.clippingDraft && !w.parentPicking && !w.newDialog && !w.discardDialog);
const canKey = computed(() => animate.value && w.sceneEditing && editable.value && !!w.activeAnimation);
const splitSlotColor = computed(() => !!slot.value && hasSplitSlotColor(w.activeAnimation, slot.value.id));
const canKeyColor = computed(() => canKey.value && !w.inspectorError && !splitSlotColor.value);
const sequenceTarget = computed(() => {
  if (w.selectedAttachment || !w.treeFilters.attachment) return attachment.value;
  const owner = slot.value;
  return owner?.attachments.find(item => item.id === owner.activeAttachmentId);
});
const inheritedSequence = computed(() => linkedTimelineSourceId(sequenceTarget.value) !== undefined);
const canKeySequence = computed(() => canKey.value && !w.sequenceFieldError && !inheritedSequence.value);
const geometryMode = computed(() => {
  if (attachment.value?.clipping) return 'clipping';
  return attachment.value?.mesh ? 'meshes' : null;
});
const geometryEditable = computed(() => editable.value && !w.hasSelectedPath && !(animate.value ? deformSource.value !== undefined : linkedMesh.value) && !!geometryMode.value);
const canInspectWeights = computed(() => animate.value && !!attachment.value
  && w.animateWeightsTarget?.attachmentId === attachment.value.id);
const inspectWeightsHint = computed(() => t(canInspectWeights.value ? 'inspectWeights' : 'animateWeightsUnavailable'));

function keySlot(channel: SlotAnimationChannel) {
  const owner = slot.value;
  if (!owner || !canKey.value || (channel === 'rgba' && !canKeyColor.value)) return;
  void w.insertSlotAnimationKeys({ slotId: owner.id, channel });
}

function keySequence() {
  const target = sequenceTarget.value;
  if (canKeySequence.value && target?.sequence) void w.insertSequenceAnimationKey(target.id);
}

function keyDeform() {
  const target = attachment.value;
  if (canKey.value && target && geometryEditable.value) void w.insertDeformKey(target.id);
}

function editDeformSource() {
  const source = deformSource.value;
  if (!canKey.value || source === undefined) return;
  w.selectAttachment(source);
  emit('editMode', 'meshes');
}

function editImages() {
  if (!animate.value && editable.value) emit('editMode', 'images');
}

function editGeometry() {
  const mode = geometryMode.value;
  if (animate.value || !geometryEditable.value || !mode) return;
  w.meshTool = 'move';
  emit('editMode', mode);
}

function openWeights() {
  if (!animate.value && geometryEditable.value) emit('editMode', 'weights');
}

function inspectWeights() {
  if (canInspectWeights.value) emit('inspectWeights');
}
</script>

<template>
  <div v-if="selectionName" :class="embedded ? 'mt-1' : 'context-toolbar min-w-0 gap-1'" role="group"
    :aria-label="t('selectionTools')" data-testid="viewport-selection-tools">
    <div v-if="!embedded && !hideSelectionCaption" class="flex min-w-0 items-center gap-1.5 px-1">
      <AppIcon :name="selectionIcon" class="!size-3.5 text-accent" />
      <span class="shrink-0 text-[10px] text-muted">{{ t(selectionType) }}</span>
      <span class="min-w-0 truncate font-medium" :title="selectionName">{{ selectionName }}</span>
      <span v-if="selectionCount > 1" class="ml-auto shrink-0 text-[10px] text-muted">
        {{ t('selectedCount', { count: selectionCount }) }}
      </span>
    </div>
    <div v-if="animate && slot" class="flex flex-wrap gap-1" :class="hideSelectionCaption ? undefined : 'border-t border-line pt-1'">
      <AppButton variant="ghost" :disabled="!canKey" :aria-label="t('viewportKeyAttachment')"
        :title="t('viewportKeyAttachment')" data-testid="viewport-key-attachment" @click="keySlot('attachment')">
        <AppIcon name="key" class="!size-3 text-accent" />{{ t('viewportKeyAttachmentShort') }}
      </AppButton>
      <AppButton v-if="attachment?.type!=='path'" variant="ghost" :disabled="!canKeyColor" :aria-label="t('viewportKeyColor')"
        :title="t(splitSlotColor ? 'slotSplitColorReadOnly' : 'viewportKeyColor')" data-testid="viewport-key-rgba" @click="keySlot('rgba')">
        <AppIcon name="key" class="!size-3 text-accent" />{{ t('color') }}
      </AppButton>
      <AppButton v-if="sequenceTarget?.sequence" variant="ghost" :disabled="!canKeySequence"
        :aria-label="t('sequenceKey')" :title="t(inheritedSequence?'linkedMeshSequenceReadOnly':'sequenceKey')" data-testid="viewport-key-sequence" @click="keySequence">
        <AppIcon name="key" class="!size-3 text-accent" />{{ t('sequence') }}
      </AppButton>
      <AppButton v-if="geometryMode" variant="ghost" :disabled="!canKey || !geometryEditable" :aria-label="t('viewportKeyDeform')"
        :title="t(deformSource!==undefined ? 'linkedMeshDeformReadOnly' : 'viewportKeyDeform')" data-testid="viewport-selection-key-deform" @click="keyDeform">
        <AppIcon name="key" class="!size-3 text-accent" />{{ t('viewportKeyDeformShort') }}
      </AppButton>
      <AppButton v-if="deformSource!==undefined" variant="ghost" :disabled="!canKey" data-testid="viewport-selection-edit-deform-source" @click="editDeformSource">{{t('editSourceMesh')}}</AppButton>
      <AppButton v-if="geometryMode" variant="ghost" :disabled="!canInspectWeights" :aria-label="t('inspectWeights')"
        :aria-description="!canInspectWeights ? inspectWeightsHint : undefined" :title="inspectWeightsHint"
        data-testid="weights-inspect" @keydown.space.stop @click="inspectWeights">
        <AppIcon name="weights" class="!size-3" /><span data-toolbar-action-label>{{ t('weights') }}</span>
      </AppButton>
    </div>
    <div v-else-if="!animate&&!w.hasSelectedPath" class="flex flex-wrap gap-1" :class="hideSelectionCaption ? undefined : 'border-t border-line pt-1'">
      <AppButton v-if="!embedded" variant="ghost" :disabled="!editable" :aria-label="t('images')" :title="t('images')"
        data-testid="viewport-edit-images" @click="editImages">
        <AppIcon name="image" class="!size-3" /><span data-toolbar-action-label>{{ t('images') }}</span>
      </AppButton>
      <AppButton v-if="geometryMode" variant="ghost" :disabled="!geometryEditable"
        :aria-label="t(geometryMode === 'clipping' ? 'editClipping' : 'editMesh')" :title="t(geometryMode === 'clipping' ? 'editClipping' : 'editMesh')"
        data-testid="viewport-edit-geometry" @click="editGeometry">
        <AppIcon :name="selectionIcon" class="!size-3" /><span data-toolbar-action-label>{{ t(geometryMode === 'clipping' ? 'editClipping' : 'editMesh') }}</span>
      </AppButton>
      <AppButton v-if="geometryMode" variant="ghost" :disabled="!geometryEditable" :aria-label="t('weights')" :title="t('weights')"
        data-testid="viewport-edit-weights" @keydown.space.stop @click="openWeights">
        <AppIcon name="weights" class="!size-3" /><span data-toolbar-action-label>{{ t('weights') }}</span>
      </AppButton>
    </div>
  </div>
</template>
