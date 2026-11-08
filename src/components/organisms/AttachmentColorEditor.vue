<script setup lang="ts">
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import type {AttachmentView} from '../../domain/project';
import NumericSliderRow from '../molecules/NumericSliderRow.vue';
const props=defineProps<{attachment:AttachmentView}>(),w=useWorkspace(),{t}=useI18n();
const rgb=ref('#ffffff'),opacity=ref('100'),failure=ref('');
const packed=computed(()=>props.attachment.color??0xffffffff),animate=computed(()=>w.editorMode==='animate');
const disabled=computed(()=>animate.value||!w.canEdit||w.busy||w.traceOpen||!!w.clippingDraft);
const invalid=computed(()=>!/^#[\da-f]{6}$/i.test(rgb.value)||!opacity.value.trim()||!Number.isFinite(Number(opacity.value))||Number(opacity.value)<0||Number(opacity.value)>100);
const context=computed(()=>`${w.project?.documentId}:${props.attachment.id}:${w.editorMode}`);
let ownedError='';
function error(value:string){if(!w.attachmentColorError||w.attachmentColorError===ownedError)w.attachmentColorError=value;ownedError=value;}
function reset(){rgb.value='#'+(packed.value>>>8).toString(16).padStart(6,'0');opacity.value=String((packed.value&255)*100/255);failure.value='';error('');}
const pending=new Map<string,Promise<boolean>>();
const commit=computed(()=>{
 const documentId=w.project?.documentId,id=props.attachment.id;
 return():Promise<boolean>=>{
  if(disabled.value||invalid.value||!w.project||w.project.documentId!==documentId||props.attachment.id!==id)return Promise.resolve(false);
  const color=((Number.parseInt(rgb.value.slice(1),16)<<8)|Math.round(Number(opacity.value)*255/100))>>>0;
  failure.value='';error('');if(color===packed.value)return Promise.resolve(true);
  const revision=w.project.revision,signature=`${documentId}:${revision}:${id}:${color}`,existing=pending.get(signature);if(existing)return existing;
  const operation=w.editRig({type:'setAttachmentColor',id,color},revision).then(ok=>{if(!ok&&w.project?.documentId===documentId&&props.attachment.id===id){failure.value=w.notice;error(w.notice);}return ok;}).finally(()=>pending.delete(signature));pending.set(signature,operation);return operation;
 };
});
watch(()=>[context.value,packed.value],reset,{immediate:true});
watch(invalid,value=>error(value?t('attachmentColorInvalid'):''),{flush:'sync'});
onBeforeUnmount(()=>{if(w.attachmentColorError===ownedError)w.attachmentColorError='';});
</script>
<template>
 <section v-if="attachment.region" class="mt-2 border-t border-line pt-2" data-testid="attachment-color-editor">
  <label class="mb-1 flex items-center justify-between text-[10px] text-muted">{{t('attachmentColor')}}<input v-model="rgb" type="color" :disabled="disabled" :aria-label="t('attachmentColor')" data-testid="attachment-color-rgb" class="h-5 w-10 cursor-pointer rounded border border-line bg-panel" @change="commit()" @keydown.esc.stop.prevent="reset"/></label>
  <NumericSliderRow v-model="opacity" :label="t('attachmentOpacity')" test-id="attachment-color-opacity" :context-key="context" :min="0" :max="100" :step="1" :disabled="disabled" @commit="commit()" @cancel="reset"/>
  <p v-if="animate" class="mt-1 text-[10px] leading-4 text-muted" data-testid="attachment-color-setup-hint">{{t('attachmentColorSetupHint')}}</p>
  <p v-if="invalid||failure" role="status" class="mt-1 text-[10px] leading-4 text-danger">{{invalid?t('attachmentColorInvalid'):failure}}</p>
 </section>
</template>
