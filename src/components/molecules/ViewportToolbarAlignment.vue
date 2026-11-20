<script setup lang="ts">
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';

type Alignment = 0 | 0.5 | 1;
const props = defineProps<{ position: number; disabled?: boolean }>();
const emit = defineEmits<{ align: [position: Alignment] }>();
const { t } = useI18n();
const groupId = useId();
const choices = [
  { id: 'left', position: 0, label: 'viewportToolbarAlignLeft' },
  { id: 'center', position: 0.5, label: 'viewportToolbarAlignCenter' },
  { id: 'right', position: 1, label: 'viewportToolbarAlignRight' },
] as const;

function select(position: Alignment, event: Event) {
  if (!props.disabled && (event.target as HTMLInputElement).checked) emit('align', position);
}

function reapply(position: Alignment, event: KeyboardEvent) {
  if (props.disabled || props.position !== position) return;
  // A native radio already checked need not emit click on Space.
  event.preventDefault();
  event.stopPropagation();
  if (!event.repeat) emit('align', position);
}
</script>

<template>
  <fieldset class="min-w-0 px-2 pb-1" :class="{ 'opacity-50': disabled }" :disabled="disabled"
    role="radiogroup" :aria-labelledby="`${groupId}-label`" data-testid="viewport-toolbar-alignment">
    <legend :id="`${groupId}-label`" class="px-0 text-[11px] text-muted">{{ t('viewportToolbarAlignment') }}</legend>
    <div class="mt-1 grid grid-cols-3 gap-1">
      <label v-for="choice in choices" :key="choice.id"
        class="min-w-0 justify-center gap-1! rounded-sm border px-1! py-1! text-[11px] focus-within:border-accent"
        :class="position === choice.position ? 'border-line bg-raised text-ink' : 'border-transparent text-muted'">
        <input type="radio" class="size-3 shrink-0 accent-accent" :name="groupId" :value="choice.position"
          :checked="position === choice.position" :data-testid="`viewport-toolbar-align-${choice.id}`"
          @change="select(choice.position, $event)" @click="position === choice.position && select(choice.position, $event)"
          @keydown.space="reapply(choice.position, $event)">
        {{ t(choice.label) }}
      </label>
    </div>
  </fieldset>
</template>
