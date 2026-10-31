<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import ModalDialog from '../molecules/ModalDialog.vue';
import AppButton from '../atoms/AppButton.vue';
const emit=defineEmits<{close:[]}>(),w=useWorkspace(),{t}=useI18n();
const slot=ref(w.selectedSlotId??w.sceneSlots[0]?.id??0),endSlot=ref(slot.value),name=ref('clipping'),convex=ref(true),inverse=ref(false);
watch(slot,(value,previous)=>{if(endSlot.value===previous)endSlot.value=value;});
const valid=computed(()=>w.sceneSlots.some(s=>s.id===slot.value)&&w.sceneSlots.some(s=>s.id===endSlot.value)&&name.value.trim());
function start(){if(!valid.value)return;if(w.beginClipping({slot:slot.value,endSlot:endSlot.value,name:name.value.trim(),convex:convex.value,inverse:inverse.value}))emit('close');}
</script>
<template><ModalDialog :title="t('newClipping')" :busy="w.busy" @cancel="emit('close')"><form class="space-y-4" @submit.prevent="start"><label class="block text-xs text-muted">{{t('attachmentName')}}<input v-model="name" class="editor-input mt-1 w-full" maxlength="120" required/></label><label class="block text-xs text-muted">{{t('ownerSlot')}}<select v-model="slot" class="editor-input mt-1 w-full"><option v-for="s in w.sceneSlots" :key="s.id" :value="s.id">{{s.name}}</option></select></label><label class="block text-xs text-muted">{{t('clipEnd')}}<select v-model="endSlot" class="editor-input mt-1 w-full"><option v-for="s in w.sceneSlots" :key="s.id" :value="s.id">{{s.name}}</option></select></label><div class="flex gap-4 text-xs"><label class="flex items-center gap-1"><input v-model="convex" type="checkbox" :disabled="inverse"/>{{t('convex')}}</label><label class="flex items-center gap-1"><input v-model="inverse" type="checkbox"/>{{t('inverse')}}</label></div><p class="text-xs leading-5 text-muted">{{t('clippingCreateHint')}}</p><div class="flex justify-end gap-2"><AppButton @click="emit('close')">{{t('cancel')}}</AppButton><AppButton type="submit" variant="primary" :disabled="!valid||!w.sceneEditing||w.busy">{{t('drawClipping')}}</AppButton></div></form></ModalDialog></template>
