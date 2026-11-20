<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import AppIcon from '../atoms/AppIcon.vue';

defineProps<{expanded: boolean}>();
const emit = defineEmits<{toggle: []}>();
const {t} = useI18n();
</script>

<template>
  <button type="button" class="at-graph-lead-in" data-testid="timeline-graph-lead-in"
    :class="{active: expanded}" :aria-pressed="expanded"
    :aria-label="t('animation_graphLeadIn')" :title="t('animation_graphLeadIn')"
    @pointerdown.stop @keydown.space.stop @click.stop="emit('toggle')">
    <AppIcon name="chevron" class="at-graph-lead-in-icon" />
  </button>
</template>

<style scoped>
.animation-timeline button.at-graph-lead-in {
  position: absolute;
  left: var(--at-gutter);
  bottom: var(--at-lead-in-bottom, 8px);
  z-index: 8;
  width: 20px;
  height: 20px;
  padding: 0;
  background: var(--color-shell);
}

.animation-timeline button.at-graph-lead-in.active {
  background: var(--color-accent-deep);
}

.animation-timeline button.at-graph-lead-in:hover {
  border-color: var(--color-accent);
}

.animation-timeline button.at-graph-lead-in:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.at-graph-lead-in-icon {
  width: 12px;
  height: 12px;
  transform: rotate(180deg);
}

.at-graph-lead-in.active .at-graph-lead-in-icon {
  transform: none;
}
</style>
