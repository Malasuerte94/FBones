<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; type?: 'button' | 'submit' }>(), { variant: 'secondary', type: 'button', disabled: false });
</script>
<template>
  <button :type="type" :disabled="disabled" class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm border px-2 py-0.5 min-h-6 text-xs font-normal transition-colors duration-100 disabled:opacity-40" :class="variant === 'primary' ? 'border-accent bg-accent text-shell hover:bg-ink' : variant === 'ghost' ? 'border-transparent text-muted hover:bg-raised hover:text-ink' : 'border-line bg-raised text-ink hover:border-faint'">
    <slot />
  </button>
</template>
