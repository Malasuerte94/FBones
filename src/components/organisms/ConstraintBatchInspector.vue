<script setup lang="ts">
import {computed,onBeforeUnmount,reactive,ref,watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import type {ConstraintView} from '../../domain/project';
import AppIcon from '../atoms/AppIcon.vue';
import AppButton from '../atoms/AppButton.vue';
import NumericSliderRow from '../molecules/NumericSliderRow.vue';

type Tone='accent'|'motion'|'bone'|'warning'|'danger'|'muted'|'inertia';
interface Field {key:string;label:string;icon:string;tone:Tone;setupOnly:boolean;slider:boolean;group:'setup'|'values';min:number;max:number;step:number}
interface Capture {context:string;revision:number;ids:number[]}
const w=useWorkspace(),{t}=useI18n();
const animate=computed(()=>w.editorMode==='animate');
const constraints=computed(()=>w.selectedConstraints.map(c=>animate.value?w.animationConstraint(c.id)??c:c));
const kind=computed(()=>{const first=constraints.value[0]?.type;return first&&constraints.value.every(c=>c.type===first)?first:null;});
const ids=computed(()=>constraints.value.map(c=>c.id));
const context=computed(()=>`${w.project?.documentId}:${ids.value.join(',')}:${w.editorMode}:${w.animationId}:${w.animationFrame}`);
const fieldContext=computed(()=>`${context.value}:${w.project?.revision}`);
const draft=reactive<Record<string,string>>({});
const changed=new Set<string>(),captures=new Map<string,Capture>(),errors=new Map<string,string>(),pending=new Map<string,Promise<boolean>>();
let ownError='';
const errorMessage=ref('');
function report(key:string,message:string){
 if(message)errors.set(key,message);else errors.delete(key);
 const next=errors.values().next().value??'';
 if(next)w.inspectorError=next;else if(w.inspectorError===ownError)w.inspectorError='';
 ownError=next;
 errorMessage.value=next;
}
onBeforeUnmount(()=>{errors.clear();if(w.inspectorError===ownError)w.inspectorError='';});
function raw(c:ConstraintView,key:string):number|boolean|null {
 if(c.type==='physics'){
  if(key.startsWith('global:'))return c.globals[key.slice(7) as keyof typeof c.globals];
  return c[key as 'gravity'];
 }
 if(c.type==='transform'){
  if(key.startsWith('offset:'))return c.offsets[Number(key.slice(7))]!;
  if(key.startsWith('mix:'))return c.mix[Number(key.slice(4))]!;
  return c[key as 'localSource'];
 }
 return c[key as 'mix'];
}
function mixed(key:string){const first=constraints.value[0];return !!first&&constraints.value.some(c=>!Object.is(raw(c,key),raw(first,key)));}
function displayed(key:string,value:number|boolean|null){
 const n=Number(value);
 if(Object.is(n,-0)&&key!=='damping'&&key!=='step')return -0;
 if(kind.value==='physics'){
  if(key==='step')return Number((1/n).toPrecision(8));
  if(key==='damping')return Number(((1-n)*100).toPrecision(8));
  if(['x','y','rotate','scaleX','shearX','inertia','mass','mix'].includes(key))return Number((n*100).toPrecision(8));
 }
 if(kind.value==='ik'&&key==='mix'||kind.value==='transform'&&key.startsWith('mix:'))return Number((n*100).toPrecision(8));
 return n;
}
function text(key:string){const first=constraints.value[0];if(!first||mixed(key))return'';const value=displayed(key,raw(first,key));return Object.is(value,-0)?'-0':String(value);}
function authored(key:string,value:number){
 if(kind.value==='physics'){
  if(key==='step')return 1/value;
  if(key==='damping')return 1-value/100;
  if(['x','y','rotate','scaleX','shearX','inertia','mass','mix'].includes(key))return value/100;
 }
 return kind.value==='ik'&&key==='mix'||kind.value==='transform'&&key.startsWith('mix:')?value/100:value;
}
const physicsSetup=['x','y','rotate','scaleX','shearX','limit','step'];
const physicsDynamic=['inertia','strength','damping','mass','wind','gravity','mix'];
const channels=['rotate','x','y','scaleX','scaleY','shearY'];
const tones:Record<string,Tone>={x:'accent',y:'accent',rotate:'motion',scaleX:'danger',scaleY:'danger',shearX:'bone',shearY:'bone',limit:'warning',step:'muted',inertia:'inertia',strength:'motion',damping:'warning',mass:'accent',wind:'accent',gravity:'accent',mix:'inertia'};
function physicsRange(key:string){
 const magnitude=Math.max(0,...constraints.value.map(c=>Math.abs(displayed(key,raw(c,key)))));
 if(['x','y','rotate','scaleX','shearX','inertia','damping','mix'].includes(key))return{min:0,max:100,step:0.1};
 if(key==='wind'||key==='gravity'){const span=Math.max(100,Math.ceil(magnitude/100)*100);return{min:-span,max:span,step:0.1};}
 if(key==='step')return{min:1,max:Math.max(120,Math.ceil(magnitude/60)*60),step:1};
 const base=key==='limit'?5000:key==='mass'?500:200;
 return{min:key==='mass'?0.1:0,max:Math.max(base,Math.ceil(magnitude/base)*base),step:key==='mass'?0.1:1};
}
function transformEligible(index:number,offset:boolean){return constraints.value.every(c=>{
 if(c.type!=='transform')return false;
 const used=new Set(offset?c.properties.map(p=>p.property):c.properties.flatMap(p=>p.to.map(to=>to.property)));
 if(offset&&(used.has('x')||used.has('y'))){used.add('x');used.add('y');}
 return used.has(channels[index] as 'rotate');
});}
const fields=computed<Field[]>(()=>{
 if(kind.value==='physics')return [...physicsSetup,...physicsDynamic].map((key):Field=>({key,label:t('physics_'+(key==='step'?'fps':key)),icon:key==='step'?'fps':key,tone:tones[key]??'accent',setupOnly:physicsSetup.includes(key),slider:true,group:physicsSetup.includes(key)?'setup':'values',...physicsRange(key)}));
 if(kind.value==='ik')return [{key:'mix',label:t('mix'),icon:'mix',tone:'inertia',setupOnly:false,slider:true,group:'values',min:0,max:100,step:0.1},...(constraints.value.every(c=>c.type==='ik'&&c.bones.length===2)?[{key:'softness',label:t('softness'),icon:'mix',tone:'accent',setupOnly:false,slider:false,group:'values',min:0,max:100,step:0.1} as Field]:[])];
 if(kind.value==='transform')return [true,false].flatMap(offset=>channels.flatMap((channel,index)=>transformEligible(index,offset)?[{key:`${offset?'offset':'mix'}:${index}`,label:t('channel_'+channel)+(offset?'':' %'),icon:channel==='shearY'?'shearX':channel==='scaleY'?'scaleX':channel,tone:tones[channel]??'accent',setupOnly:offset,slider:!offset,group:offset?'setup':'values',min:0,max:100,step:0.1} as Field]:[]));
 return[];
});
const groups=computed(()=>[
 {id:'setup',label:kind.value==='transform'?t('constraintOffsets'):t('setup'),fields:fields.value.filter(f=>f.group==='setup')},
 {id:'values',label:kind.value==='transform'?t('constraintMixes'):t('constraint_'+kind.value),fields:fields.value.filter(f=>f.group==='values')},
].filter(g=>g.fields.length));
const toggles=computed(()=>{
 if(kind.value==='physics')return physicsDynamic.map(key=>({key:'global:'+key,label:t('globalProperty',{name:t('physics_'+key)}),setupOnly:true}));
 if(kind.value==='transform')return ['localSource','localTarget','additive','clamp'].map(key=>({key,label:t(key),setupOnly:true}));
 if(kind.value==='ik')return ['stretch',...(constraints.value.every(c=>c.type==='ik'&&c.bones.length===1)?['compress']:[]),...(constraints.value.every(c=>c.type==='ik'&&c.bones.length===2)?['bendPositive']:[])].map(key=>({key,label:t(key),setupOnly:false}));
 return[];
});
const currentValues=computed(()=>Object.fromEntries(fields.value.map(f=>[f.key,text(f.key)])));
watch(context,()=>{changed.clear();captures.clear();errors.clear();if(w.inspectorError===ownError)w.inspectorError='';ownError='';errorMessage.value='';for(const key of Object.keys(draft))delete draft[key];for(const [key,value]of Object.entries(currentValues.value))draft[key]=value;},{immediate:true});
watch(currentValues,(next,previous)=>{
 for(const key of Object.keys(draft))if(!(key in next)){delete draft[key];changed.delete(key);}
 for(const [key,value]of Object.entries(next))if(!changed.has(key)||draft[key]===previous?.[key]||draft[key]===value)draft[key]=value;
});
function capture(key:string){const revision=w.project?.revision;if(revision!==undefined)captures.set(key,{context:context.value,revision,ids:[...ids.value]});}
function stage(key:string,value:string){draft[key]=value;changed.add(key);}
function cancel(key:string){draft[key]=currentValues.value[key]??'';changed.delete(key);captures.delete(key);report(key,'');}
function disabled(field:{setupOnly:boolean}){return !w.canEdit||!!(animate.value&&field.setupOnly)||(w.busy&&!w.editing);}
function commit(key:string):Promise<boolean>{
 const field=fields.value.find(f=>f.key===key),frozen=captures.get(key);
 if(!field||disabled(field)||!changed.has(key))return Promise.resolve(false);
 if(!frozen||frozen.context!==context.value){cancel(key);return Promise.resolve(false);}
 const value=Number(draft[key]);
 if(!draft[key]?.trim()||!Number.isFinite(value)||key==='step'&&value<=0){report(key,key==='step'?t('invalidPhysicsRate'):t('invalidTransform'));return Promise.resolve(false);}
 // Explicitly typing zero into a common None rotation materializes Some(0).
 // Merely focusing/blur has no changed draft and never reaches this branch.
 if(!mixed(key)&&raw(constraints.value[0]!,key)!==null&&draft[key]===text(key)){cancel(key);return Promise.resolve(true);}
 const token=JSON.stringify([frozen.context,key,value]),existing=pending.get(token);if(existing)return existing;
 report(key,'');
 const operation=w.editSelectedConstraintField(key,authored(key,value),frozen.revision,frozen.ids).then(success=>{
  if(frozen.context===context.value){if(success)cancel(key);else report(key,w.notice||t('invalidTransform'));}
  return success;
 },error=>{if(frozen.context===context.value)report(key,error instanceof Error?error.message:String(error));return false;}).finally(()=>pending.delete(token));
 pending.set(token,operation);return operation;
}
function enter(event:KeyboardEvent,key:string){void commit(key);(event.target as HTMLInputElement).blur();}
function escape(event:KeyboardEvent,key:string){event.stopPropagation();cancel(key);(event.target as HTMLInputElement).blur();}
function toggle(key:string,event:Event){
 if(w.busy||!w.canEdit||animate.value&&toggles.value.find(f=>f.key===key)?.setupOnly)return;
 const frozen={context:context.value,revision:w.project?.revision,ids:[...ids.value]};
 void w.editSelectedConstraintField(key,(event.target as HTMLInputElement).checked,frozen.revision,frozen.ids).then(success=>{if(!success&&frozen.context===context.value)report(key,w.notice||t('invalidTransform'));});
}
function checked(key:string){return !!constraints.value[0]&&raw(constraints.value[0],key)===true&&!mixed(key);}
function insertKey(property?:string){
 if(!kind.value||!animate.value||!w.canEdit||w.busy||w.inspectorError||!w.activeAnimation)return;
 return w.insertConstraintAnimationKeysBatch({constraintIds:[...ids.value],kind:kind.value==='transform'?'transformMix':kind.value,...(property?{property}:{})});
}
</script>
<template>
 <section class="inspector-form min-w-0 border-b border-line p-2" data-testid="constraint-batch-inspector" :data-constraint-type="kind??'mixed'" :data-selected-count="constraints.length">
  <h3 class="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent"><AppIcon v-if="kind" :name="kind" class="!size-3.5"/><span>{{kind?t('constraintBatchTitle',{count:constraints.length,type:t('constraint_'+kind)}):t('constraintSelectionCount',{count:constraints.length})}}</span></h3>
  <p class="mb-2 truncate text-[10px] text-muted" :title="constraints.map(c=>c.name).join(', ')">{{constraints.map(c=>c.name).join(', ')}}</p>
  <p v-if="!kind" class="text-[11px] leading-4 text-muted" data-testid="constraint-batch-mixed-types">{{t('constraintBatchMixedTypes')}}</p>
  <template v-else>
   <p class="mb-2 text-[10px] leading-4 text-muted">{{t('constraintBatchHint')}}</p>
   <p v-if="animate" class="mb-2 text-[10px] leading-4 text-muted">{{t('constraintBatchAnimateHint')}}</p>
   <details v-for="group in groups" :key="group.id" :open="group.id==='values'||kind==='physics'" class="mb-2 numeric-slider-stack">
    <summary class="mb-1 text-xs text-muted">{{group.label}}</summary>
    <div class="space-y-0.5">
     <template v-for="field in group.fields" :key="field.key">
      <NumericSliderRow v-if="field.slider" :model-value="draft[field.key]??''" :label="field.label" :test-id="`constraint-batch-${field.key}`" :context-key="fieldContext" :min="field.min" :max="field.max" :step="field.step" :tone="field.tone" :icon="field.icon" :mixed="mixed(field.key)" :disabled="disabled(field)" :locked="w.busy" @begin="capture(field.key)" @update:model-value="stage(field.key,$event)" @commit="commit(field.key)" @cancel="cancel(field.key)"><template v-if="animate&&kind==='physics'&&!field.setupOnly" #trailing><button type="button" class="dock-tab !p-0.5" :disabled="!w.canEdit||w.busy||!!w.inspectorError||!w.activeAnimation" :aria-label="t('constraintBatchKey',{name:field.label})" :data-testid="`constraint-batch-key-${field.key}`" @click="insertKey(field.key)"><AppIcon name="key" class="!size-3"/></button></template></NumericSliderRow>
      <label v-else class="flex min-w-0 items-center justify-between gap-2 py-0.5 text-[11px] text-muted"><span>{{field.label}}</span><input :value="draft[field.key]??''" type="text" inputmode="decimal" class="editor-input w-24 min-w-0" :placeholder="mixed(field.key)?t('mixedValue'):undefined" :aria-label="t('numericValue',{name:field.label})" :data-testid="`constraint-batch-${field.key}`" :disabled="disabled(field)" :readonly="w.busy" @focus="capture(field.key)" @input="stage(field.key,($event.target as HTMLInputElement).value)" @change="commit(field.key)" @blur="commit(field.key)" @keydown.enter.prevent="enter($event,field.key)" @keydown.esc.prevent="escape($event,field.key)"/></label>
     </template>
    </div>
   </details>
   <div v-if="toggles.length" class="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-line py-1.5">
    <label v-for="field in toggles" :key="field.key" class="flex min-w-0 items-center gap-1 text-[10px] text-muted"><input type="checkbox" :checked="checked(field.key)" :indeterminate.prop="mixed(field.key)" :aria-checked="mixed(field.key)?'mixed':checked(field.key)" :data-testid="`constraint-batch-${field.key}`" :disabled="!w.canEdit||w.busy||animate&&field.setupOnly" @change="toggle(field.key,$event)"/><span>{{field.label}}</span></label>
   </div>
   <p v-if="!fields.length&&!toggles.length" class="text-[11px] text-muted">{{t('constraintBatchNoSharedFields')}}</p>
   <AppButton v-if="animate&&kind!=='physics'" class="mt-1 w-full" :disabled="!w.canEdit||w.busy||!!w.inspectorError||!w.activeAnimation" data-testid="constraint-batch-key-all" @click="insertKey()"><AppIcon name="key" class="!size-3"/>{{t('constraintBatchKey',{name:t('constraint_'+kind)})}}</AppButton>
  </template>
  <p v-if="errorMessage" role="alert" class="mt-2 text-xs text-danger">{{errorMessage}}</p>
 </section>
</template>
