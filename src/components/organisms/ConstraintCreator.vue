<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import type {ConstraintInput} from '../../domain/project';
import {canTargetIk,orderedIkMembers} from '../../domain/constraintSelection';
import ModalDialog from '../molecules/ModalDialog.vue';
import AppButton from '../atoms/AppButton.vue';
const props=defineProps<{type:'ik'|'transform'}>(),emit=defineEmits<{close:[]}>();
const w=useWorkspace(),{t}=useI18n();
const bones=computed(()=>w.project?.bones??[]);
const members=ref(w.selectedIds.length?[...w.selectedIds]:bones.value[0]?[bones.value[0].id]:[]);
const target=ref(bones.value.find(b=>!members.value.includes(b.id))?.id??bones.value[0]?.id??0);
const error=ref('');
const name=ref(props.type==='ik'?'ik':'transform');
const ikMembers=computed(()=>orderedIkMembers(bones.value,members.value));
const valid=computed(()=>name.value.trim()&&(props.type==='ik'?ikMembers.value&&canTargetIk(bones.value,ikMembers.value,target.value):members.value.length));
watch([members,bones],()=>{if(props.type==='ik'&&ikMembers.value&&!canTargetIk(bones.value,ikMembers.value,target.value)){const next=bones.value.find(b=>canTargetIk(bones.value,ikMembers.value!,b.id));if(next)target.value=next.id;}},{immediate:true});
async function create(){
 if(!valid.value)return;error.value='';
 const common={name:name.value.trim()};let input:ConstraintInput;
 if(props.type==='ik')input={...common,type:'ik',bones:ikMembers.value!,target:target.value,mix:1,softness:0,bendPositive:true,compress:false,stretch:false};
 else input={...common,type:'transform',bones:members.value,source:target.value,localSource:false,localTarget:false,additive:false,clamp:false,offsets:[0,0,0,0,0,0],mix:[1,1,1,1,1,1],properties:['rotate','x','y','scaleX','scaleY','shearY'].map(property=>({property:property as 'rotate'|'x'|'y'|'scaleX'|'scaleY'|'shearY',offset:0,to:[{property:property as 'rotate'|'x'|'y'|'scaleX'|'scaleY'|'shearY',offset:0,max:1,scale:1}]}))};
 if(await w.createConstraint(input))emit('close');else error.value=w.notice;
}
</script>
<template>
 <ModalDialog :title="t('newConstraintTitle',{type:t('constraint_'+type)})" :busy="w.busy" @cancel="emit('close')"><form class="space-y-4" @submit.prevent="create"><label class="block text-xs text-muted">{{t('constraintName')}}<input v-model="name" class="editor-input mt-1 w-full" maxlength="120" required :disabled="w.busy"/></label><label class="block text-xs text-muted">{{t('constrainedBones')}}<select v-model="members" multiple class="editor-input mt-1 w-full" :size="Math.min(5,bones.length)" :disabled="w.busy"><option v-for="bone in bones" :key="bone.id" :value="bone.id">{{bone.name}}</option></select></label><label class="block text-xs text-muted">{{t(type==='transform'?'constraintSource':'constraintTarget')}}<select v-model="target" class="editor-input mt-1 w-full" :disabled="w.busy"><option v-for="bone in bones" :key="bone.id" :value="bone.id" :disabled="type==='ik'&&!canTargetIk(bones,ikMembers??[],bone.id)">{{bone.name}}</option></select></label><p v-if="type==='ik'" class="text-xs leading-5 text-muted">{{t('ikChainHint')}}</p><p class="text-xs leading-5 text-muted">{{t('constraintEvaluationNotice')}}</p><p v-if="error" role="alert" class="text-xs text-danger">{{error}}</p><div class="flex justify-end gap-2"><AppButton :disabled="w.busy" @click="emit('close')">{{t('cancel')}}</AppButton><AppButton type="submit" variant="primary" :disabled="!valid||w.busy||!w.sceneEditing">{{t('createObject')}}</AppButton></div></form></ModalDialog>
</template>
