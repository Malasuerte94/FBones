<script setup lang="ts">
import AppIcon from '../atoms/AppIcon.vue';

defineProps<{
  id: string;
  label: string;
  pressed: boolean | 'mixed';
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <button type="button" class="graph-visibility-button" :aria-label="label" :title="label"
    :aria-pressed="pressed" :data-testid="`timeline-graph-visibility-${id}`"
    @pointerdown.stop @keydown.space.stop @click.stop="emit('toggle')" @contextmenu.stop.prevent="emit('toggle')">
    <AppIcon name="eye" class="graph-visibility-icon" />
  </button>
</template>

<style scoped>
button.graph-visibility-button {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 20px;
  height: 18px;
  margin-inline-start: auto;
  padding: 0;
  border-color: transparent;
  background: var(--color-shell);
  color: var(--color-ink);
}

.at-row-key-button + button.graph-visibility-button {
  margin-inline-start: 0;
}

button.graph-visibility-button:hover,
button.graph-visibility-button:focus-visible {
  border-color: var(--color-accent);
  outline-offset: -1px;
}

.graph-visibility-icon {
  width: 13px;
  height: 13px;
}

button.graph-visibility-button[aria-pressed='false'] {
  color: var(--color-muted);
}

button.graph-visibility-button[aria-pressed='false']::after,
button.graph-visibility-button[aria-pressed='mixed']::after {
  position: absolute;
  content: '';
  background: currentColor;
}

button.graph-visibility-button[aria-pressed='false']::after {
  top: 50%;
  left: 50%;
  width: 13px;
  height: 1px;
  transform: translate(-50%, -50%) rotate(-45deg);
}

button.graph-visibility-button[aria-pressed='mixed']::after {
  right: 2px;
  bottom: 2px;
  width: 6px;
  height: 2px;
}
</style>
