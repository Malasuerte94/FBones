<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
const props = defineProps<{ title: string; busy?: boolean }>();
const emit = defineEmits<{ cancel: [] }>();
const panel = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); if (!props.busy) emit('cancel'); }
  if (event.key !== 'Tab' || !panel.value) return;
  const items = Array.from(panel.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'));
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
onMounted(async () => {
  previousFocus = document.activeElement as HTMLElement;
  document.addEventListener('keydown', keydown);
  await nextTick(); panel.value?.querySelector<HTMLElement>('input, button')?.focus();
});
onBeforeUnmount(() => { document.removeEventListener('keydown', keydown); previousFocus?.focus(); });
</script>
<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6">
      <section ref="panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title" :aria-busy="busy" class="w-full max-w-md rounded-xl border border-line bg-panel p-6 shadow-2xl">
        <h2 id="dialog-title" class="mb-4 text-lg font-semibold">{{ title }}</h2>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
