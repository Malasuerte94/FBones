<script setup lang="ts">
import {computed,ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {useTransformRangeFields} from '../../composables/useTransformRangeFields';
import AppButton from '../atoms/AppButton.vue';
const props=defineProps<{constraintId:number;disabled?:boolean}>();
const w=useWorkspace(),{t}=useI18n(),active=ref<number|null>(null);
const channels=['rotate','x','y','scaleX','scaleY','shearY'] as const;
const columns=['sourceStart','sourceEnd','targetStart','targetEnd'] as const;
const colors=['text-green-400','text-cyan-400','text-sky-500','text-red-400','text-rose-500','text-yellow-400'];
const constraint=computed(()=>{const c=w.constraints.find(c=>c.id===props.constraintId);return c?.type==='transform'?c:null;});
const fields=useTransformRangeFields(()=>constraint.value,()=>!!props.disabled||w.busy,()=>t('invalidRange'));
const unavailable=computed(()=>!w.canEdit||w.busy||props.disabled||!fields.ready.value);
const links=computed(()=>constraint.value?.properties.flatMap(from=>from.to.map(to=>({source:channels.indexOf(from.property),target:channels.indexOf(to.property)})))??[]);
function label(index:number){return t('transformRangeCell',{channel:t('channel_'+channels[Math.floor(index/4)]!),endpoint:t('storedRange_'+columns[index%4]!)});}
function state(index:number){return constraint.value?.editorRangeBits?.[index]!=null?'explicit':fields.linked(index)?'derived':'unmapped';}
</script>
<template>
 <section data-testid="transform-range-editor" :aria-label="t('transformEditableRanges')">
  <div class="overflow-x-auto"><div class="grid min-w-64 grid-cols-[4rem_minmax(2.25rem,1fr)_minmax(2.25rem,1fr)_1.5rem_minmax(2.25rem,1fr)_minmax(2.25rem,1fr)] items-center gap-x-0.5 gap-y-1 text-[10px] tabular-nums">
   <span/><span class="col-span-2 text-center text-muted">{{t('mappingFrom')}}</span><span/><span class="col-span-2 text-center text-muted">{{t('mappingTo')}}</span>
   <span/><span v-for="column in ['sourceStart','sourceEnd']" :key="column" class="text-center text-muted">{{t(column.endsWith('Start')?'rangeStart':'rangeEnd')}}</span><span/><span v-for="column in ['targetStart','targetEnd']" :key="column" class="text-center text-muted">{{t(column.endsWith('Start')?'rangeStart':'rangeEnd')}}</span>
   <template v-for="(channel,row) in channels" :key="channel">
    <span class="truncate text-muted" :title="t('channel_'+channel)">{{t('channel_'+channel)}}</span>
    <template v-for="column in 4" :key="column">
     <input :value="fields.draft[row*4+column-1]" type="text" inputmode="decimal" class="editor-input h-6 w-full min-w-0 !px-1 text-right" :class="{'text-muted':state(row*4+column-1)==='derived'}" :disabled="unavailable" :aria-label="label(row*4+column-1)" :title="state(row*4+column-1)==='derived'?t('rangeAutomatic'):state(row*4+column-1)==='unmapped'?t('rangeUnmapped'):undefined" :placeholder="t(column%2?'rangeStart':'rangeEnd')" :data-testid="`transform-range-${row*4+column-1}`" :data-range-state="state(row*4+column-1)" @focus="active=row*4+column-1" @input="fields.input(row*4+column-1,($event.target as HTMLInputElement).value)" @change="fields.commit(row*4+column-1)" @blur="fields.commit(row*4+column-1)" @keydown.enter.prevent="fields.enter($event,row*4+column-1)" @keydown.esc.prevent="fields.escape($event,row*4+column-1)" @keydown.alt.backspace.prevent="fields.clear(row*4+column-1)"/>
    </template>
   </template>
   <svg viewBox="0 0 24 164" preserveAspectRatio="none" class="pointer-events-none col-start-4 row-start-3 row-span-6 h-full w-full" fill="none" aria-hidden="true"><path v-for="(link,i) in links" :key="i" :d="`M2 ${12+link.source*28} C10 ${12+link.source*28} 14 ${12+link.target*28} 22 ${12+link.target*28}`" :class="colors[link.source]" stroke="currentColor" stroke-width="1"/><template v-for="(_,i) in channels" :key="i"><circle cx="2" :cy="12+i*28" r="2" :class="colors[i]" fill="currentColor"/><circle cx="22" :cy="12+i*28" r="2" :class="colors[i]" fill="currentColor"/></template></svg>
  </div></div>
  <div class="mt-1 flex items-center gap-2 text-[10px] text-muted"><span class="min-w-0 flex-1">{{active===null?t('rangeEditHint'):label(active)}}</span><AppButton type="button" :disabled="unavailable||active===null" :title="t('rangeAutomaticShortcut')" data-testid="transform-range-clear" @pointerdown.prevent @click.stop.prevent="active!==null&&fields.clear(active)">{{t('rangeUseAutomatic')}}</AppButton></div>
  <p v-if="!fields.ready.value" class="mt-1 text-[10px] text-muted">{{t('rangeUnavailable')}}</p>
 </section>
</template>
