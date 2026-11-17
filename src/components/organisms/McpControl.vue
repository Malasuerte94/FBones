<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import AppButton from '../atoms/AppButton.vue';
import ModalDialog from '../molecules/ModalDialog.vue';
import type {McpController} from '../../composables/useMcp';
defineProps<{controller:McpController}>();
const{t}=useI18n();
</script>
<template>
 <AppButton variant="ghost" data-testid="mcp-toggle" :aria-expanded="controller.visible.value" @click="controller.visible.value=true">MCP<span v-if="controller.state.value.enabled" class="size-1.5 rounded-full bg-accent" :aria-label="t('mcpRunning')"/></AppButton>
 <Teleport to="body"><div v-if="controller.state.value.enabled&&!controller.visible.value" class="fixed top-9 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded border border-accent bg-panel px-3 py-1 text-xs shadow-lg" data-testid="mcp-active-banner"><span>{{t('mcpAiControl')}}</span><AppButton @click="controller.visible.value=true">MCP</AppButton><AppButton :disabled="controller.busy.value" @click="controller.stop()">{{t('mcpStop')}}</AppButton></div></Teleport>
 <ModalDialog v-if="controller.visible.value" title="MCP" :busy="controller.busy.value" @cancel="controller.visible.value=false">
  <div class="space-y-3 text-xs">
   <p role="status" aria-live="polite" data-testid="mcp-status">{{!controller.supported?t('mcpDesktop'):controller.state.value.enabled?t('mcpRunning'):t('mcpStopped')}}</p>
   <p class="leading-5 text-muted">{{t('mcpHint')}}</p>
   <p v-if="controller.error.value" role="alert" class="break-words text-danger" data-testid="mcp-error">{{controller.error.value}}</p>
   <template v-if="controller.config.value"><p class="break-all text-muted">{{controller.state.value.url}}</p><label class="block">{{t('mcpConfiguration')}}<textarea readonly :value="controller.config.value" rows="9" class="mt-1 w-full resize-none select-text rounded border border-line bg-shell p-2 font-mono text-[11px]" data-testid="mcp-config"/></label><AppButton data-testid="mcp-copy" @click="controller.copy()">{{controller.copied.value?t('mcpCopied'):t('mcpCopy')}}</AppButton><p class="text-[11px] leading-4 text-muted">{{t('mcpDocs')}}</p></template>
   <div class="flex flex-wrap gap-2"><AppButton v-if="controller.supported&&!controller.state.value.enabled" :disabled="controller.busy.value" data-testid="mcp-reset" @click="controller.reset()">{{t('mcpReset')}}</AppButton><AppButton v-if="!controller.state.value.enabled" variant="primary" :disabled="!controller.supported||controller.busy.value" data-testid="mcp-start" @click="controller.start()">{{t('mcpStart')}}</AppButton><AppButton v-else :disabled="controller.busy.value" data-testid="mcp-stop" @click="controller.stop()">{{t('mcpStop')}}</AppButton><AppButton :disabled="controller.busy.value" @click="controller.visible.value=false">{{t('close')}}</AppButton></div>
  </div>
 </ModalDialog>
</template>
