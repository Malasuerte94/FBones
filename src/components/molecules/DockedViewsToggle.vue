<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';

defineProps<{ minimized: boolean; disabled?: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
const { t } = useI18n();
</script>

<template>
  <AppButton variant="ghost" class="relative size-7 p-0! focus-visible:outline focus-visible:outline-accent"
    :class="{ 'border-line! bg-accent-deep! text-ink!': minimized }"
    :disabled="disabled" :aria-pressed="minimized" :aria-label="t('minimizeDockedViews')" aria-keyshortcuts="F9"
    :title="`${t(minimized ? 'restoreDockedViews' : 'minimizeDockedViews')} (F9)`"
    data-testid="minimize-docked-views" @mousedown.prevent @keydown.space.stop @click="emit('toggle')">
    <AppIcon name="grid" class="size-3.5!"/>
    <span v-if="minimized" class="absolute h-px w-4 -rotate-45 bg-current" aria-hidden="true"/>
  </AppButton>
</template>
