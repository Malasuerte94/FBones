<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import ConstraintInspector from './ConstraintInspector.vue';
import AppButton from '../atoms/AppButton.vue';
const props=defineProps<{type:'ik'|'transform'|'physics'}>();
defineEmits<{create:[type:'ik'|'transform'|'physics']}>();
const w=useWorkspace(),{t}=useI18n(),target=ref<number|null>(null);
const choices=computed(()=>w.constraints.filter(c=>c.type===props.type));
const canCreate=computed(()=>w.editorMode==='setup'&&w.sceneEditing&&!w.busy&&(props.type!=='physics'||w.canAddPhysics));
watch(()=>[w.project?.documentId,props.type,choices.value.map(c=>c.id).join(',')] as const,(_current,previous)=>{
 if(!previous||previous[0]!==w.project?.documentId||!choices.value.some(c=>c.id===target.value))target.value=(w.selectedConstraint?.type===props.type?w.selectedConstraint.id:choices.value[0]?.id)??null;
},{immediate:true});
</script>
<template>
 <section class="flex min-h-0 flex-1 flex-col" :data-testid="`constraint-view-${type}`">
  <div class="flex items-center gap-1 border-b border-line p-2"><label class="min-w-0 flex-1 text-[10px] text-muted">{{t('constraintViewTarget')}}<select v-model.number="target" class="editor-input mt-1 w-full" :aria-label="t('constraintViewTarget')" :disabled="!choices.length||w.busy"><option v-for="constraint in choices" :key="constraint.id" :value="constraint.id">{{constraint.name}}</option></select></label><AppButton class="self-end" :disabled="!canCreate" :aria-label="t('newConstraintView',{name:t('constraint_'+type)})" @click="$emit('create',type)">+</AppButton></div>
  <div v-if="target!==null" class="min-h-0 flex-1 overflow-auto"><ConstraintInspector :key="`${w.project?.documentId}:${target}`" :constraint-id="target"/></div>
  <div v-else class="p-3 text-xs leading-5 text-muted"><p>{{t('constraintViewEmpty',{name:t('constraint_'+type)})}}</p><AppButton class="mt-3" :disabled="!canCreate" @click="$emit('create',type)">{{t('newConstraintView',{name:t('constraint_'+type)})}}</AppButton></div>
 </section>
</template>
