<script setup lang="ts">
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {useSceneFieldEditor} from '../../composables/useSceneFieldEditor';
import type {TransformFromView,TransformProperty} from '../../domain/project';
import {canMatchTransform,nextMappingProperty} from '../../domain/transformMapping';
import AppButton from '../atoms/AppButton.vue';
import TransformStoredRanges from './TransformStoredRanges.vue';
import TransformRangeEditor from './TransformRangeEditor.vue';
const props=defineProps<{constraintId?:number;matching?:boolean;matchDescriptionId?:string}>();
const emit=defineEmits<{match:[id:number]}>();
const w=useWorkspace(),{t}=useI18n();
const channels:TransformProperty[]=['rotate','x','y','scaleX','scaleY','shearY'];
const constraint=computed(()=>{const c=props.constraintId===undefined?w.selectedConstraint:w.constraints.find(c=>c.id===props.constraintId);return c?.type==='transform'?c:null;});
const matchSupported=computed(()=>!!constraint.value&&canMatchTransform(constraint.value));
function requestMatch(){const id=constraint.value?.id;if(id!==undefined&&matchSupported.value&&w.canEdit&&!w.busy&&!props.matching)emit('match',id);}
function edit(patch:{properties:TransformFromView[]},revision?:number){const id=constraint.value?.id;return id===undefined?Promise.resolve(false):w.editConstraintById(id,patch,revision);}
const properties=computed(()=>constraint.value?.properties??[]);
function values(){const values:Record<string,number>={};properties.value.forEach((from,i)=>{values[`from:${i}`]=from.offset;from.to.forEach((to,j)=>{for(const key of ['offset','max','scale'] as const)values[`to:${i}:${j}:${key}`]=to[key];});});return values;}
const editor=useSceneFieldEditor({current:()=>{const c=constraint.value,p=w.project;return c&&p?{id:c.id,documentId:p.documentId,revision:p.revision,editable:w.canEdit,values:values()}:null;},numeric:()=>true,invalidMessage:()=>t('invalidTransform'),edit:(key,value,revision)=>{const copy=properties.value.map(from=>({...from,to:from.to.map(to=>({...to}))})),[kind,i,j,field]=key.split(':');if(kind==='from')copy[Number(i)]!.offset=Number(value);else copy[Number(i)]!.to[Number(j)]![field as 'offset'|'max'|'scale']=Number(value);return edit({properties:copy},revision);}});
function update(change:(copy:TransformFromView[])=>void){const copy=properties.value.map(from=>({...from,to:from.to.map(to=>({...to}))}));change(copy);void edit({properties:copy});}
function property(event:Event,i:number,j?:number){const select=event.target as HTMLSelectElement,value=select.value as TransformProperty,from=properties.value[i];if(!from)return;const duplicate=j===undefined?properties.value.some((row,index)=>index!==i&&row.property===value):from.to.some((to,index)=>index!==j&&to.property===value);if(duplicate){select.value=j===undefined?from.property:from.to[j]!.property;return;}update(copy=>{if(j===undefined)copy[i]!.property=value;else copy[i]!.to[j]!.property=value;});}
function add(){const available=channels.find(channel=>!properties.value.some(from=>from.property===channel));if(available)update(copy=>copy.push({property:available,offset:0,to:[{property:available,offset:0,max:1,scale:1}]}));}
function addDestination(i:number){const property=nextMappingProperty(properties.value[i]?.to??[]);if(property)update(copy=>copy[i]!.to.push({property,offset:0,max:1,scale:1}));}
</script>
<template>
 <section v-if="constraint" class="mapping-editor border-t border-line pt-2" data-testid="transform-mappings">
  <div class="mb-2 flex items-center justify-between gap-2"><h4 class="text-[11px] font-medium text-ink">{{t('propertyMappings')}}</h4><AppButton type="button" :disabled="!w.canEdit||w.busy||matching||!matchSupported" :aria-label="t('matchTransformProperties')" :title="t(matchSupported?'matchTransformHint':'matchTransformMixUnsupported')" :aria-describedby="matchSupported?undefined:matchDescriptionId" data-testid="transform-match-properties" @pointerdown.prevent @click.stop.prevent="requestMatch">{{t('match')}}</AppButton></div>
  <TransformRangeEditor :constraint-id="constraint.id" :disabled="matching"/>
  <details class="mt-2 border-t border-line pt-2" data-testid="transform-advanced-connections"><summary class="text-[11px] text-muted">{{t('advancedConnections')}}</summary><p class="my-1 text-[10px] text-muted">{{t('runtimeRangeDiagnostics')}}</p>
  <div class="mb-1 grid grid-cols-2 text-center text-[10px] uppercase tracking-wide text-muted"><span>{{t('mappingFrom')}}</span><span>{{t('mappingTo')}}</span></div>
  <div v-for="(from,i) in properties" :key="i" class="mb-2 border border-line bg-shell/40 p-1.5">
   <div class="flex items-center gap-1"><select class="editor-input min-w-0 flex-1" :value="from.property" :aria-label="t('mappingFrom')" @change="property($event,i)"><option v-for="channel in channels" :key="channel" :value="channel" :disabled="properties.some((row,index)=>index!==i&&row.property===channel)">{{t('channel_'+channel)}}</option></select><label class="flex min-w-0 flex-1 items-center gap-1 text-[10px] text-muted">{{t('rangeStart')}}<input  :value="editor.draft[`from:${i}`]" readonly class="editor-input w-full min-w-0" type="number" step="any" :aria-label="t('sourceRangeStart')"/></label><button class="dock-tab !px-1" :aria-label="t('removeMapping')" @click="update(copy=>{copy.splice(i,1);})">×</button></div>
   <div v-for="(to,j) in from.to" :key="j" class="mapping-link relative mt-1 border-t border-line pt-1.5">
    <div class="flex items-center gap-1"><svg viewBox="0 0 72 20" class="h-5 w-12 shrink-0 text-accent" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="3" cy="15" r="2" fill="currentColor"/><path d="M5 15C30 15 40 5 66 5"/><circle cx="68" cy="5" r="2" fill="currentColor"/></svg><select class="editor-input min-w-0 flex-1" :value="to.property" :aria-label="t('mappingTo')" @change="property($event,i,j)"><option v-for="channel in channels" :key="channel" :value="channel" :disabled="from.to.some((endpoint,index)=>index!==j&&endpoint.property===channel)">{{t('channel_'+channel)}}</option></select><button class="dock-tab !px-1" :aria-label="t('removeDestination')" @click="update(copy=>{copy[i]!.to.splice(j,1);if(!copy[i]!.to.length)copy.splice(i,1);})">×</button></div>
    <div class="mt-1 grid grid-cols-3 gap-1"><label v-for="field in (['offset','max','scale'] as const)" :key="field" class="min-w-0 text-[10px] text-muted">{{t('mapping_'+field)}}<input :value="editor.draft[`to:${i}:${j}:${field}`]" readonly class="editor-input mt-0.5 w-full min-w-0" type="number" step="any" :aria-label="t('mapping_'+field)"/></label></div>
   </div><button class="dock-tab mt-1 w-full !text-[10px]" :disabled="!nextMappingProperty(from.to)" @click="addDestination(i)">+ {{t('addDestination')}}</button>
  </div><AppButton class="w-full" :disabled="properties.length>=channels.length" @click="add">{{t('addMapping')}}</AppButton>
  </details>
  <TransformStoredRanges :bits="constraint.editorRangeBits"/>
 </section>
</template>
