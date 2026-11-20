<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
const props = defineProps<{ title: string; busy?: boolean; placement?: 'side'; testId?: string; wide?: boolean; isolateKeys?: boolean }>();
const emit = defineEmits<{ cancel: [] }>();
const panel = ref<HTMLElement>();
const titleId = useId();
let previousFocus: HTMLElement | null = null;
function keydown(event: KeyboardEvent) {
  if (props.placement === 'side' || props.isolateKeys) event.stopPropagation();
  if (event.key === 'Escape') { event.preventDefault(); if (!props.busy) emit('cancel'); }
  if (event.key !== 'Tab' || !panel.value) return;
  const items = Array.from(panel.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'));
  const first = items[0], last = items[items.length - 1];
  if (!first || !panel.value.contains(document.activeElement) || document.activeElement === panel.value) {
    event.preventDefault();
    ((event.shiftKey ? last : first) ?? panel.value).focus();
  }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
onMounted(async () => {
  previousFocus = document.activeElement as HTMLElement;
  document.addEventListener('keydown', keydown);
  await nextTick(); panel.value?.querySelector<HTMLElement>('input, button')?.focus();
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', keydown);
  if (props.placement === 'side') {
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) previousFocus?.focus();
    });
  } else previousFocus?.focus();
});
</script>
<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex"
      :class="placement==='side' ? 'items-start justify-end p-3 pt-12' : 'items-center justify-center bg-black/55 p-6'">
      <section ref="panel" role="dialog" aria-modal="true" tabindex="-1" :data-testid="testId"
        :aria-labelledby="titleId" :aria-busy="busy" class="w-full border border-line bg-panel shadow-2xl"
        :class="placement==='side' ? 'max-h-full max-w-72 overflow-y-auto rounded-md p-3' :
          wide ? 'max-h-full max-w-3xl overflow-y-auto rounded-xl p-4 sm:p-5' : 'max-w-md rounded-xl p-6'">
        <h2 :id="titleId" class="font-semibold" :class="placement==='side' ? 'mb-1 text-sm' : 'mb-4 text-lg'">{{ title }}</h2>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
