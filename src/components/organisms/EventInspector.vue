<script setup lang="ts">
import {computed,onBeforeUnmount,reactive,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import type {TimelineEvent,TimelineEventKey,TimelineEventPayload} from '../../domain/animationTimeline';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
import NumericSliderRow from '../molecules/NumericSliderRow.vue';
const props=withDefaults(defineProps<{definition:TimelineEvent|null;selectedKey?:TimelineEventKey|null;animate?:boolean;busy?:boolean;contextKey?:string;audioPlayable?:boolean;audioRoot?:string;audioKeys?:string[];playbackText?:string;compact?:boolean}>(),{selectedKey:null,animate:false,busy:false,contextKey:'',audioPlayable:false,audioRoot:'',audioKeys:()=>[],playbackText:'',compact:false});
const emit=defineEmits<{
 definitionPatch:[change:{id:number;patch:Partial<Omit<TimelineEvent,'id'>>}];
 keyPatch:[change:{id:number}&TimelineEventPayload];manualKey:[eventId:number];draftValidity:[invalid:boolean];playAudio:[eventId:number];chooseAudioFolder:[];
}>();
const {t,te}=useI18n(),draft=reactive<Record<string,string|number>>({}),invalid=ref(false),audioDraft=reactive<Record<'volume'|'balance',string>>({volume:'',balance:''});let submitted='';
const text=(key:string,fallback:string)=>te('animation_'+key)?t('animation_'+key):fallback;
const fieldString=(value:unknown)=>typeof value==='number'&&Object.is(value,-0)?'-0':String(value??'');
const source=computed(()=>props.selectedKey??props.definition);
const canEdit=computed(()=>!!props.definition&&!props.busy&&(!props.animate||!!props.selectedKey));
const numeric=['int','float','volume','balance']as const;
const payloadFields=['int','float','string','volume','balance']as const;
const labels={name:'Name',int:'Integer',float:'Float',string:'String',audio:'Audio path',volume:'Volume',balance:'Balance'};
function assignPayload(key:typeof payloadFields[number],value:unknown){draft[key]=fieldString(value);if(key==='volume'||key==='balance')audioDraft[key]=fieldString(Number(value)*100);}
function stageAudio(key:'volume'|'balance',value:string){audioDraft[key]=value;draft[key]=value.trim()&&Number.isFinite(Number(value))?fieldString(Number(value)/100):value;}
function cancelAudio(key:'volume'|'balance'){assignPayload(key,source.value?.[key]??0);submitted='';}
function reset(){for(const key of Object.keys(draft))delete draft[key];if(props.definition){draft.name=props.definition.name;draft.audio=props.definition.audio;}for(const key of payloadFields)assignPayload(key,source.value?.[key]??(key==='string'?'':0));invalid.value=false;submitted='';}
function validate(){invalid.value=!!props.definition&&numeric.some(key=>{const raw=String(draft[key]??''),value=Number(raw);return !raw.trim()||!Number.isFinite(value)||(key==='int'&&(!Number.isInteger(value)||value< -2147483648||value>2147483647));});return !invalid.value;}
function commit(key:keyof typeof labels){if(!canEdit.value||!props.definition||!validate())return;const value=numeric.includes(key as typeof numeric[number])?Number(draft[key]):String(draft[key]??''),signature=`${props.contextKey}:${props.definition.id}:${props.selectedKey?.id}:${key}:${fieldString(value)}`;if(signature===submitted)return;
 if(key==='name'||key==='audio'){if(props.animate||value===props.definition[key])return;submitted=signature;emit('definitionPatch',{id:props.definition.id,patch:{[key]:value}});return;}
 if(Object.is(value,source.value?.[key]))return;submitted=signature;const payload={int:Number(draft.int),float:Number(draft.float),string:String(draft.string??''),volume:Number(draft.volume),balance:Number(draft.balance)};
 if(props.animate&&props.selectedKey)emit('keyPatch',{id:props.selectedKey.id,...payload});else emit('definitionPatch',{id:props.definition.id,patch:{[key]:value}});
}
function enter(key:keyof typeof labels,event:KeyboardEvent){commit(key);(event.target as HTMLInputElement).blur();}
function escape(event:KeyboardEvent){event.stopPropagation();reset();(event.target as HTMLInputElement).blur();}
watch(()=>[props.definition?.id,props.selectedKey?.id,props.contextKey],reset,{immediate:true});
watch(source,(next,previous)=>{if(!next)return;for(const key of payloadFields)if(fieldString(draft[key])===fieldString(previous?.[key]??'')||fieldString(draft[key])===fieldString(next[key]))assignPayload(key,next[key]);},{deep:true});
watch(()=>props.definition,(next,previous)=>{if(next)for(const key of ['name','audio']as const)if(String(draft[key])===fieldString(previous?.[key]??''))draft[key]=next[key];},{deep:true});
watch(draft,validate,{deep:true,flush:'sync'});watch(invalid,value=>emit('draftValidity',value),{flush:'sync'});watch(()=>props.busy,value=>{if(!value)submitted='';});
onBeforeUnmount(()=>emit('draftValidity',false));
</script>
<template>
 <section v-if="definition" class="inspector-form border-b border-line p-2" data-testid="event-inspector">
  <h3 class="mb-2 flex items-center gap-1.5 text-xs text-accent"><AppIcon name="key" class="!size-3.5"/>{{text('event','Event')}}<span class="ml-1 text-ink">{{definition.name}}</span><span v-if="selectedKey" class="ml-auto text-muted">{{text('frame','Frame')}} {{selectedKey.frame}}</span></h3>
  <label v-if="!compact" class="mb-2 block text-[11px] text-muted">{{text('name',labels.name)}}<input v-model="draft.name" :disabled="busy||animate" maxlength="120" class="editor-input mt-1 w-full" data-testid="event-name" @change="commit('name')" @keydown.enter.prevent="enter('name',$event)" @keydown.esc.prevent="escape"/></label>
  <div class="space-y-1.5">
   <template v-for="key in (['int','float','string']as const)" :key="key"><label class="control-row"><span>{{text('event_'+key,labels[key])}}</span><input v-model="draft[key]" :disabled="!canEdit" :type="key==='string'?'text':'number'" :step="key==='int'?1:'any'" class="editor-input min-w-0 w-full" :aria-label="text('event_'+key,labels[key])" :aria-invalid="key!=='string'&&invalid" :data-testid="'event-'+key" @change="commit(key)" @keydown.enter.prevent="enter(key,$event)" @keydown.esc.prevent="escape"/></label></template>
   <div v-if="!compact" class="flex min-w-0 items-center gap-1 text-[11px] text-muted"><span class="shrink-0">{{text('audioFolder','Audio folder')}}</span><span class="min-w-0 flex-1 truncate text-right" :title="audioRoot" data-testid="event-audio-root">{{audioRoot||'—'}}</span><AppButton :disabled="busy||animate" :aria-label="text('chooseAudioFolder','Choose audio folder…')" :title="text('chooseAudioFolder','Choose audio folder…')" data-testid="event-audio-folder" @click="emit('chooseAudioFolder')"><AppIcon name="folder" class="!size-3"/></AppButton></div>
   <label v-if="!compact" class="block text-[11px] text-muted">{{text('event_audio',labels.audio)}}<input v-model="draft.audio" :list="'event-audio-keys-'+definition.id" :disabled="busy||animate" class="editor-input mt-1 w-full" data-testid="event-audio" @change="commit('audio')" @keydown.enter.prevent="enter('audio',$event)" @keydown.esc.prevent="escape"/><datalist :id="'event-audio-keys-'+definition.id"><option v-for="key in audioKeys" :key="key" :value="key"/></datalist></label>
   <template v-if="definition.audio"><div v-for="key in (['volume','balance']as const)" :key="key" class="numeric-slider-stack"><NumericSliderRow :model-value="audioDraft[key]" :label="text('event_'+key,labels[key])+' %'" :test-id="'event-'+key" :context-key="`${contextKey}:${definition.id}:${selectedKey?.id}`" :min="key==='volume'?0:-100" :max="100" :step="0.1" :disabled="!definition||(animate&&!selectedKey)" :locked="busy" :tone="key==='volume'?'motion':'accent'" icon="mix" @update:model-value="value=>stageAudio(key,value)" @commit="commit(key)" @cancel="cancelAudio(key)"/></div><AppButton v-if="audioPlayable" :disabled="busy" class="w-full" data-testid="event-play-audio" @click="emit('playAudio',definition.id)">▶ {{text('event_previewAudio','Preview audio')}}</AppButton></template>
  </div>
  <output v-if="playbackText" data-testid="animation-event-fired" class="mt-1 block text-[11px] text-accent">{{playbackText}}</output>
  <p v-if="invalid" role="alert" class="mt-2 text-[11px] text-danger">{{text('invalidEvent','Enter finite values and a signed 32-bit integer.')}}</p>
  <AppButton v-if="animate" :disabled="busy" class="mt-2 w-full" data-testid="event-manual-key" @click="emit('manualKey',definition.id)"><AppIcon name="key" class="!size-3"/>{{text('keyEvent','Key event')}}</AppButton>
 </section>
</template>
