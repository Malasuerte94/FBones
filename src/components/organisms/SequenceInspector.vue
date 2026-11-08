<script setup lang="ts">
import {computed,reactive,ref,watch,onBeforeUnmount} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {validSequenceSettings,type SequenceSettings,type SequenceWorkingPose} from '../../domain/animationSequence';
import type {AttachmentView} from '../../domain/project';
import SequenceKeyEditor from '../molecules/SequenceKeyEditor.vue';
import AppIcon from '../atoms/AppIcon.vue';
const props=defineProps<{attachment:AttachmentView}>(),w=useWorkspace(),{t}=useI18n();
const animate=computed(()=>w.editorMode==='animate'),enabled=ref(false),draft=reactive({start:'0',count:'1',digits:'1',setupIndex:'0'}),keyInvalid=ref(false),failure=ref('');
const fields=['count','start','digits','setupIndex']as const;
const settings=computed<SequenceSettings>(()=>({start:Number(draft.start),count:Number(draft.count),digits:Number(draft.digits),setupIndex:Number(draft.setupIndex)}));
const setupInvalid=computed(()=>enabled.value&&(fields.some(field=>!String(draft[field]).trim())||!validSequenceSettings(settings.value)));
const disabled=computed(()=>!w.canEdit||w.busy||w.traceOpen||!!w.clippingDraft);
const keyPose=computed(()=>props.attachment.sequence?w.sequenceWorkingPose(props.attachment.id):null);
const sampled=computed(()=>w.sequencePoses.find(p=>p.attachment===props.attachment.id));
const context=computed(()=>`${w.project?.documentId}:${props.attachment.id}:${w.editorMode}:${w.animationId}:${w.animationFrame}`);
let ownedError='';
function publishError(message:string){if(!w.sequenceFieldError||w.sequenceFieldError===ownedError)w.sequenceFieldError=message;ownedError=message;}
function reset(){enabled.value=!!props.attachment.sequence;const value=props.attachment.sequence??{start:0,count:1,digits:1,setupIndex:0};for(const field of fields)draft[field]=String(value[field]);failure.value='';keyInvalid.value=false;publishError('');}
const pending=new Map<string,Promise<boolean>>();
function commitSetup():Promise<boolean>{
 if(animate.value||disabled.value||!w.project||setupInvalid.value)return Promise.resolve(false);
 failure.value='';publishError('');
 const id=props.attachment.id,documentId=w.project.documentId,revision=w.project.revision,sequence=enabled.value?settings.value:null;
 const current=props.attachment.sequence??null;
 // Native JSON field order can differ from this computed settings object.
 // A delayed change/blur after Enter must not start a second busy transaction.
 const unchanged=sequence===null?current===null:current!==null&&fields.every(field=>sequence[field]===current[field]);
 if(unchanged){failure.value='';return Promise.resolve(true);}
 const signature=`${documentId}:${revision}:${id}:${JSON.stringify(sequence)}`,existing=pending.get(signature);if(existing)return existing;
 const operation=w.editRig({type:'setAttachmentSequence',id,sequence},revision).then(success=>{if(!success&&w.project?.documentId===documentId&&props.attachment.id===id){failure.value=w.notice;publishError(w.notice);}return success;}).finally(()=>pending.delete(signature));pending.set(signature,operation);return operation;
}
async function commitKey(value:SequenceWorkingPose){if(disabled.value||!w.project)return;failure.value='';publishError('');const documentId=w.project.documentId,id=props.attachment.id;const ok=await w.setSequenceAnimationFields(id,value,w.project.revision);if(!ok&&w.project?.documentId===documentId&&props.attachment.id===id){failure.value=w.notice;publishError(w.notice);}}
watch(()=>[props.attachment.sequence,props.attachment.id,w.project?.documentId,w.editorMode],reset,{immediate:true,deep:true});
watch([setupInvalid,keyInvalid],([a,b])=>publishError(a?t('sequenceInvalidSettings'):b?t('sequenceInvalidKey'):''),{flush:'sync'});
onBeforeUnmount(()=>{if(w.sequenceFieldError===ownedError)w.sequenceFieldError='';});
</script>
<template>
 <section v-if="attachment.region" class="mt-2 border-t border-line pt-2 text-[10px]" data-testid="sequence-inspector">
  <div class="mb-1 flex items-center gap-1.5"><label v-if="!animate" class="flex items-center gap-1"><input v-model="enabled" type="checkbox" :disabled="disabled" data-testid="sequence-enabled" @change="commitSetup"/>{{t('sequence')}}</label><strong v-else class="font-medium text-accent">{{t('sequence')}}</strong><span class="min-w-0 flex-1 truncate text-muted">{{attachment.name}}</span><button v-if="animate&&attachment.sequence" class="dock-tab" :disabled="disabled||keyInvalid||!w.activeAnimation" :title="t('sequenceKey')" :aria-label="t('sequenceKey')" data-testid="sequence-manual-key" @click="w.insertSequenceAnimationKey(attachment.id)"><AppIcon name="key" class="size-3"/></button></div>
  <div v-if="!animate&&enabled" class="grid grid-cols-2 gap-1"><label v-for="field in fields" :key="field" class="flex min-w-0 items-center justify-between gap-1 text-muted">{{t('sequence_'+field)}}<input v-model="draft[field]" type="number" :min="field==='count'?1:0" :max="field==='count'?4096:field==='digits'?10:field==='setupIndex'?settings.count-1:2147483647" step="1" :disabled="disabled" :aria-label="t('sequence_'+field)" :aria-invalid="setupInvalid" :data-testid="'sequence-'+field" class="editor-input !min-h-5 !w-20 !min-w-0 !px-1 !py-0.5" @change="commitSetup" @keydown.enter.stop.prevent="commitSetup" @keydown.esc.stop.prevent="reset"/></label></div>
  <input v-if="!animate&&enabled" v-model="draft.setupIndex" type="range" min="0" :max="settings.count-1" step="1" :disabled="disabled||settings.count<2||setupInvalid" :aria-label="t('sequence_setupIndex')+' slider'" data-testid="sequence-setup-index-slider" class="mt-1 h-3 w-full" @change="commitSetup" @keydown.esc.stop.prevent="reset"/>
  <SequenceKeyEditor v-if="animate&&attachment.sequence&&keyPose" :value="keyPose" :settings="attachment.sequence" :context-key="context" :disabled="disabled||!w.activeAnimation" @pause="w.pauseAnimation" @commit="commitKey" @draft-validity="value=>keyInvalid=value"/>
  <p v-if="animate&&attachment.sequence&&!w.animationAutoKey" class="mt-1 leading-4 text-muted">{{t('sequenceWorkingHint')}}</p>
  <p v-if="animate&&!attachment.sequence" class="leading-4 text-muted">{{t('sequenceSetupHint')}}</p>
  <p v-if="sampled" class="mt-1 break-all text-muted" data-testid="sequence-sampled-frame">{{t('sequenceFrame')}} {{sampled.index}} · {{sampled.image}}.png<span v-if="!sampled.imageAvailable" class="ml-1 text-warning">{{t('missingImage')}}</span></p>
  <p v-if="setupInvalid||failure" role="status" class="mt-1 leading-4 text-danger">{{setupInvalid?t('sequenceInvalidSettings'):failure}}</p>
 </section>
</template>
