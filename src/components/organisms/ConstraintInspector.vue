<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {useSceneFieldEditor} from '../../composables/useSceneFieldEditor';
import type {ConstraintView,ConstraintInput,TransformChannels,PhysicsConstraintInput} from '../../domain/project';
import type {SceneFieldValue} from '../../domain/sceneFields';
import {canTargetIk,orderedIkMembers} from '../../domain/constraintSelection';
import {canMatchTransform,retainedTransformMembers} from '../../domain/transformMapping';
import TransformMappingEditor from './TransformMappingEditor.vue';
import AppButton from '../atoms/AppButton.vue';
import AppIcon from '../atoms/AppIcon.vue';
import NumericSliderRow from '../molecules/NumericSliderRow.vue';
import ConstraintBatchInspector from './ConstraintBatchInspector.vue';
const props=defineProps<{constraintId?:number}>();
const w=useWorkspace(),{t,te}=useI18n(),animate=computed(()=>w.editorMode==='animate'),setupConstraint=computed(()=>props.constraintId===undefined?w.selectedConstraint:w.constraints.find(c=>c.id===props.constraintId)??null),constraint=computed<ConstraintView|null>(()=>{const c=setupConstraint.value;return c&&animate.value?w.animationConstraint(c.id):c;});
const batch=computed(()=>props.constraintId===undefined&&w.selectedConstraintIds.length>1);
const batchKey=computed(()=>`${w.project?.documentId}:${w.selectedConstraintIds.join(',')}`);
const matching=ref(false);
const matchSupportId=useId(),matchSupported=computed(()=>constraint.value?.type==='transform'&&canMatchTransform(constraint.value));
const matchHint=computed(()=>t(matchSupported.value?'matchTransformHint':'matchTransformMixUnsupported'));
const animationText=(key:string,fallback:string)=>te('animation_'+key)?t('animation_'+key):fallback;
const animationElapsed=computed(()=>Number.isFinite(w.animationPhysicsTime)?`${Math.max(0,w.animationPhysicsTime).toFixed(3)} s`:'—');
async function match(section:'offsets'|'properties',id=constraint.value?.id){
 if(id===undefined||matching.value||!w.canEdit||w.busy)return;
 matching.value=true;
 try{await w.matchTransform(id,section);}finally{matching.value=false;}
}
function edit(patch:Partial<ConstraintInput>,revision?:number){const id=constraint.value?.id;return id===undefined?Promise.resolve(false):animate.value?w.setConstraintAnimationFields(id,patch,revision):w.editConstraintById(id,patch,revision);}
const channelNames=['rotate','x','y','scaleX','scaleY','shearY'] as const;
function transformRows(kind:'offset'|'mix'){
 const c=constraint.value;if(c?.type!=='transform')return[];
 const used=new Set(kind==='offset'?c.properties.map(from=>from.property):c.properties.flatMap(from=>from.to.map(to=>to.property)));
 // The original sparse Offset inspector keeps the Translate pair together.
 if(kind==='offset'&&(used.has('x')||used.has('y'))){used.add('x');used.add('y');}
 return [[0],[1,2],[3,4],[5]].map(indices=>indices.map(index=>({index,channel:channelNames[index]!,visible:used.has(channelNames[index]!)}))).filter(row=>row.some(cell=>cell.visible));
}
const offsetRows=computed(()=>transformRows('offset')),mixRows=computed(()=>transformRows('mix'));
const physicsSetup=['x','y','rotate','scaleX','shearX','limit','fps'] as const;
const physicsDynamic=['inertia','strength','damping','mass','wind','gravity','mix'] as const;
const display=(value:number)=>Number(value.toPrecision(8));
const fieldContext=computed(()=>`${w.project?.documentId}:${constraint.value?.id}:${w.project?.revision}:${w.editorMode}:${w.animationId}:${w.animationFrame}`);
function insertAnimationKey(property?:typeof physicsDynamic[number]|'reset'){const c=constraint.value;if(!c)return;return w.insertConstraintAnimationKeys({constraintId:c.id,kind:c.type==='ik'?'ik':c.type==='transform'?'transformMix':property==='reset'?'physicsReset':'physics',...(property&&property!=='reset'?{property}:{})});}
const physicsColor:Record<string,'accent'|'motion'|'bone'|'warning'|'danger'|'muted'|'inertia'>={x:'accent',y:'accent',rotate:'motion',scaleX:'danger',shearX:'bone',limit:'warning',fps:'muted',inertia:'inertia',strength:'motion',damping:'warning',mass:'accent',wind:'accent',gravity:'accent',mix:'inertia'};
function physicsRange(key:string):{min:number;max:number;step:number}{
 const value=Number(fieldValues()[key]),magnitude=Number.isFinite(value)?Math.abs(value):0;
 if(['x','y','rotate','scaleX','shearX','inertia','damping','mix'].includes(key))return{min:0,max:100,step:0.1};
 if(key==='wind'||key==='gravity'){const span=Math.max(100,Math.ceil(magnitude/100)*100);return{min:-span,max:span,step:0.1};}
 if(key==='fps')return{min:1,max:Math.max(120,Math.ceil(magnitude/60)*60),step:1};
 const base=key==='limit'?5000:key==='mass'?500:200;
 return{min:key==='mass'?0.1:0,max:Math.max(base,Math.ceil(magnitude/base)*base),step:key==='mass'?0.1:1};
}
function cancelSlider(key:string){editor.draft[key]=String(fieldValues()[key]??0);void editor.commit(key);}
const physicsInactive=computed(()=>{const c=constraint.value;return c?.type==='physics'&&[c.x,c.y,c.rotate??0,c.scaleX,c.shearX].every(v=>v===0);});
const physicsZeroLength=computed(()=>{const c=constraint.value;return c?.type==='physics'&&(c.rotate??0)+c.scaleX+c.shearX>0&&w.project?.bones.find(b=>b.id===c.bone)?.length===0;});
function fieldValues():Record<string,SceneFieldValue>{
 const c=constraint.value;if(!c)return{};const values:Record<string,SceneFieldValue>={name:c.name};
 if(c.type==='ik'){values.mix=display(c.mix*100);values.softness=c.softness;}
 else if(c.type==='transform'){c.offsets.forEach((value,i)=>{values[`offset:${i}`]=value;});c.mix.forEach((value,i)=>{values[`mix:${i}`]=display(value*100);});}
 else{for(const field of physicsSetup)values[field]=field==='fps'?display(1/c.step):field==='limit'?c.limit:display((c[field]??0)*100);for(const field of physicsDynamic)values[field]=display(field==='damping'?(1-c.damping)*100:['inertia','mass','mix'].includes(field)?c[field]*100:c[field]);}
 return values;
}
function targetAllowed(id:number){const c=constraint.value;return c?.type!=='ik'||canTargetIk(w.project?.bones??[],c.bones,id);}
function patchField(key:string,value:SceneFieldValue):Partial<ConstraintInput>{
 const c=constraint.value;if(!c)return{};if(key==='name')return{name:String(value)};
 const n=Number(value);
 if(c.type==='ik')return key==='mix'?{mix:n/100}:{softness:n};
 if(c.type==='transform'){const[kind,index]=key.split(':'),copy=[...(kind==='offset'?c.offsets:c.mix)] as TransformChannels;copy[Number(index)]=kind==='mix'?n/100:n;return kind==='offset'?{offsets:copy}:{mix:copy};}
 if(key==='fps')return{step:1/n};
 return{[key]:key==='damping'?1-n/100:key==='limit'||['strength','wind','gravity'].includes(key)?n:n/100};
}
const editor=useSceneFieldEditor({current:()=>{if(batch.value)return null;const c=constraint.value,p=w.project;return c&&p?{id:c.id,documentId:p.documentId,revision:p.revision,editable:w.canEdit,values:fieldValues()}:null;},numeric:key=>key!=='name',invalidMessage:()=>t('invalidTransform'),edit:(key,value,revision)=>{if(key==='fps'&&Number(value)<=0){w.inspectorError=t('invalidPhysicsRate');w.showNotice(w.inspectorError,true);return Promise.resolve(false);}return edit(patchField(key,value),revision);}});
watch(()=>[w.editorMode,w.animationId,w.animationFrame],()=>editor.reset());
function boolean(key:string,event:Event){void edit({[key]:(event.target as HTMLInputElement).checked});}
async function member(event:Event){const select=event.target as HTMLSelectElement,c=constraint.value,ids=Array.from(select.selectedOptions,option=>Number(option.value)),next=c?.type==='ik'?orderedIkMembers(w.project?.bones??[],ids)??ids:c?.type==='transform'?retainedTransformMembers(c.bones,ids):ids;if(!await edit({bones:next})){const current=constraint.value;if(current?.id===c?.id)for(const option of select.options)option.selected=current?.type!=='physics'&&!!current?.bones.includes(Number(option.value));}}
function reference(key:'target'|'source'|'bone',event:Event){void edit({[key]:Number((event.target as HTMLSelectElement).value)});}
function global(field:typeof physicsDynamic[number],event:Event){const c=constraint.value;if(c?.type!=='physics')return;const globals:PhysicsConstraintInput['globals']={...c.globals,[field]:(event.target as HTMLInputElement).checked};void edit({globals});}
</script>
<template>
 <ConstraintBatchInspector v-if="batch" :key="batchKey"/>
 <section v-else-if="constraint" class="inspector-form border-b border-line p-2" data-testid="constraint-inspector" :data-constraint-id="constraint.id">
  <h3 class="mb-3 flex items-center gap-1.5 text-xs font-medium text-accent"><AppIcon :name="constraint.type" class="!size-3.5"/>{{t('constraint_'+constraint.type)}}</h3>
  <fieldset :disabled="!w.canEdit||(w.busy&&!w.editing)||matching" class="space-y-3">
   <label class="block text-xs text-muted">{{t('constraintName')}}<input :disabled="w.busy||animate" v-model="editor.draft.name" class="editor-input mt-1 w-full" maxlength="120" data-testid="constraint-name" @change="editor.commit('name')" @keydown.enter.prevent="editor.enter($event,'name')" @keydown.esc.prevent="editor.escape"/></label>
   <label class="block text-xs text-muted">{{t(constraint.type==='physics'?'physicsBone':constraint.type==='transform'?'constraintSource':'constraintTarget')}}<select :disabled="w.busy||animate" :value="constraint.type==='physics'?constraint.bone:constraint.type==='transform'?constraint.source:constraint.target" class="editor-input mt-1 w-full" data-testid="constraint-reference" @change="reference(constraint.type==='physics'?'bone':constraint.type==='transform'?'source':'target',$event)"><option v-for="bone in w.project?.bones" :key="bone.id" :value="bone.id" :disabled="!targetAllowed(bone.id)">{{bone.name}}</option></select></label>
   <label v-if="constraint.type!=='physics'" class="block text-xs text-muted">{{t('constrainedBones')}}<select :disabled="w.busy||animate" multiple class="editor-input mt-1 w-full" :size="Math.min(4,w.project?.bones.length??1)" :aria-label="t('constrainedBones')" data-testid="constraint-members" @change="member"><option v-for="bone in w.project?.bones" :key="bone.id" :value="bone.id" :selected="constraint.bones.includes(bone.id)">{{bone.name}}</option></select></label>
   <template v-if="constraint.type==='ik'">
    <div class="flex flex-wrap gap-3 text-xs"><label v-for="key in (constraint.bones.length===1?['compress','stretch'] as const:['bendPositive','stretch'] as const)" :key="key" class="flex items-center gap-1"><input :disabled="w.busy" type="checkbox" :checked="constraint[key]" @change="boolean(key,$event)"/>{{t(key)}}</label></div>
    <div class="numeric-slider-stack"><NumericSliderRow v-model="editor.draft.mix!" :label="t('mix')" test-id="constraint-mix" :context-key="fieldContext" :min="0" :max="100" tone="inertia" icon="mix" :disabled="!w.canEdit||(w.busy&&!w.editing)" :locked="w.busy" @commit="editor.commit('mix')" @cancel="cancelSlider('mix')"/></div>
    <label v-if="constraint.bones.length===2" class="flex items-center justify-between gap-2 text-xs text-muted">{{t('softness')}}<input :disabled="w.busy" v-model="editor.draft.softness" type="number" step="any" class="editor-input w-24 min-w-0" :aria-label="t('softness')" data-testid="constraint-softness" @change="editor.commit('softness')" @keydown.enter.prevent="editor.enter($event,'softness')" @keydown.esc.prevent="editor.escape"/></label><p class="text-[10px] leading-4 text-muted">{{t('ikChainHint')}}</p>
   </template>
   <template v-else-if="constraint.type==='physics'">
    <fieldset :disabled="animate"><details open class="numeric-slider-stack"><summary class="mb-1 text-xs text-muted">{{t('setup')}}</summary><div class="space-y-0.5"><NumericSliderRow v-for="key in physicsSetup" :key="key" v-model="editor.draft[key]!" :label="t('physics_'+key)" :test-id="`physics-${key}`" :context-key="fieldContext" v-bind="physicsRange(key)" :tone="physicsColor[key]" :icon="key" :disabled="!w.canEdit||(w.busy&&!w.editing)" :locked="w.busy" @commit="editor.commit(key)" @cancel="cancelSlider(key)"/></div></details></fieldset>
    <div class="numeric-slider-stack space-y-0.5 border-t border-line pt-1.5"><NumericSliderRow v-for="key in physicsDynamic" :key="key" v-model="editor.draft[key]!" :label="t('physics_'+key)" :test-id="`physics-${key}`" :context-key="fieldContext" v-bind="physicsRange(key)" :tone="physicsColor[key]" :icon="key" :disabled="!w.canEdit||(w.busy&&!w.editing)" :locked="w.busy" @commit="editor.commit(key)" @cancel="cancelSlider(key)"><template #trailing><button v-if="animate" type="button" class="dock-tab !p-0.5" :disabled="w.busy" :aria-label="'Key '+t('physics_'+key)" :data-testid="'physics-key-'+key" @click="insertAnimationKey(key)"><AppIcon name="key" class="!size-3"/></button><input v-else :disabled="w.busy" type="checkbox" :checked="constraint.globals[key]" :aria-label="t('globalProperty',{name:t('physics_'+key)})" :title="t('globalProperty',{name:t('physics_'+key)})" @change="global(key,$event)"/></template></NumericSliderRow></div>
    <AppButton v-if="animate" class="w-full" :disabled="w.busy||!w.activeAnimation" data-testid="physics-reset-key" @click="insertAnimationKey('reset')"><AppIcon name="key" class="!size-3"/>Key physics reset</AppButton>
    <p v-if="physicsInactive" class="flex gap-1 text-[10px] text-warning" data-testid="physics-inactive-hint"><span aria-hidden="true">◇</span>{{t('physicsInactiveHint')}}</p>
    <p v-if="physicsZeroLength" class="text-[10px] text-warning" data-testid="physics-zero-length-hint">{{t('physicsZeroLengthHint')}}</p>
    <p v-if="!w.simulationIntent" class="text-[10px] text-muted" data-testid="physics-simulation-off-hint">{{t('physicsOffHint')}}</p>
    <section v-if="animate" class="control-group space-y-1.5 p-1.5 text-[11px]" data-testid="animation-physics-preview" :aria-label="animationText('physicsPreview','Animation physics preview')">
     <div class="flex items-center justify-between gap-2"><label class="flex items-center gap-1.5"><input type="checkbox" :checked="w.simulationIntent" :disabled="w.busy||!w.activeAnimation" data-testid="animation-physics-simulate" @change="($event.target as HTMLInputElement).checked?w.runSimulation():w.pauseSimulation()"/>{{t('simulatePhysics')}}</label><output class="tabular-nums text-muted" data-testid="animation-physics-time" :data-supported="w.animationPhysicsSupported">{{animationElapsed}}</output></div>
     <AppButton class="w-full" :disabled="w.busy||!w.activeAnimation||!w.animationPhysicsSupported" data-testid="animation-physics-reset" :title="animationText('rebuildPhysicsHint','Reconstruct saved motion from animation start at this frame. Creates no key.')" @click="w.resetAnimationPhysicsPreview()">{{animationText('rebuildPhysics','Rebuild preview')}}</AppButton>
     <p v-if="w.animationPhysicsError" role="alert" class="text-danger" data-testid="animation-physics-error">{{w.animationPhysicsError}}</p>
     <p class="text-[10px] leading-4 text-muted">{{animationText('physicsTimelineHint','Physics follows animation time. Preview state is not saved.')}}</p>
    </section>
    <p v-else class="text-[10px] leading-4 text-muted">{{t('physicsAuthoringOnly')}}</p>
   </template>
   <template v-else>
    <div class="grid grid-cols-2 gap-1 text-[11px]"><label v-for="key in (['localSource','localTarget','additive','clamp'] as const)" :key="key" class="flex items-center gap-1"><input :disabled="w.busy||animate" type="checkbox" :checked="constraint[key]" @change="boolean(key,$event)"/>{{t(key)}}</label></div>
    <fieldset :disabled="animate"><details><summary class="mb-2 text-xs text-muted"><span class="inline-flex w-[calc(100%-1rem)] items-center justify-between gap-2"><span>{{t('constraintOffsets')}}</span><AppButton type="button" :disabled="animate||!w.canEdit||w.busy||matching||!matchSupported" :aria-label="t('matchTransformOffsets')" :title="matchHint" :aria-describedby="!animate&&!matchSupported?matchSupportId:undefined" data-testid="transform-match-offsets" @pointerdown.prevent @click.stop.prevent="match('offsets')">{{t('match')}}</AppButton></span></summary><div class="space-y-1" data-testid="transform-offset-controls"><div v-for="row in offsetRows" :key="row[0]!.index" class="grid grid-cols-2 gap-1"><template v-for="cell in row" :key="cell.index"><label v-if="cell.visible" class="min-w-0 text-[10px] text-muted" :class="{'col-span-2':row.length===1}">{{t('channel_'+cell.channel)}}<input :disabled="w.busy||animate" v-model="editor.draft[`offset:${cell.index}`]" :data-testid="`transform-offset-${cell.index}`" type="number" step="any" class="editor-input mt-1 w-full min-w-0" @change="editor.commit(`offset:${cell.index}`)" @keydown.enter.prevent="editor.enter($event,`offset:${cell.index}`)" @keydown.esc.prevent="editor.escape"/></label><span v-else class="h-6 self-end border border-line bg-shell/40" aria-hidden="true" :data-testid="`transform-offset-gap-${cell.index}`"/></template></div><p v-if="!offsetRows.length" class="text-[10px] text-muted">{{t('noMappedChannels')}}</p></div></details></fieldset>
    <p v-if="!animate&&!matchSupported" :id="matchSupportId" class="text-[10px] leading-4 text-muted" data-testid="transform-match-unavailable">{{t('matchTransformMixUnsupported')}}</p>
    <details open><summary class="mb-2 text-xs text-muted">{{t('constraintMixes')}}</summary><div class="space-y-1" data-testid="transform-mix-controls"><div v-for="row in mixRows" :key="row[0]!.index" class="grid grid-cols-2 gap-1"><template v-for="cell in row" :key="cell.index"><div v-if="cell.visible" class="numeric-slider-stack min-w-0" :class="{'col-span-2':row.length===1}"><NumericSliderRow v-model="editor.draft[`mix:${cell.index}`]!" :label="`${t('channel_'+cell.channel)} %`" :test-id="`transform-mix-${cell.index}`" :context-key="fieldContext" :min="0" :max="100" :tone="physicsColor[cell.channel]??'danger'" :icon="cell.channel==='shearY'?'shearX':cell.channel==='scaleY'?'scaleX':cell.channel" :disabled="!w.canEdit||(w.busy&&!w.editing)" :locked="w.busy" @commit="editor.commit(`mix:${cell.index}`)" @cancel="cancelSlider(`mix:${cell.index}`)"/></div><span v-else class="h-6 self-end border border-line bg-shell/40" aria-hidden="true" :data-testid="`transform-mix-gap-${cell.index}`"/></template></div><p v-if="!mixRows.length" class="text-[10px] text-muted">{{t('noMappedChannels')}}</p></div></details>
    <fieldset :disabled="w.busy||animate"><TransformMappingEditor :constraint-id="constraint.id" :matching="matching" :match-description-id="animate?undefined:matchSupportId" @match="id=>match('properties',id)"/></fieldset>
   </template>
   <AppButton v-if="animate&&constraint.type!=='physics'" class="w-full" :disabled="w.busy||!w.activeAnimation" data-testid="constraint-animation-key" @click="insertAnimationKey()"><AppIcon name="key" class="!size-3"/>Key {{t('constraint_'+constraint.type)}}</AppButton>
   <p class="text-[10px] leading-4 text-muted">{{t('constraintEvaluationNotice')}}</p>
   <div class="flex items-center gap-1 text-[11px] text-muted"><span class="mr-auto">{{t('evaluationOrder')}} {{constraint.order+1}}</span><AppButton :disabled="animate||w.busy||constraint.order===0" :aria-label="t('evaluateEarlier')" @click="w.reorderConstraint(constraint.id,constraint.order-1)">↑</AppButton><AppButton :disabled="animate||w.busy||constraint.order>=(w.project?.constraints?.length??0)-1" :aria-label="t('evaluateLater')" @click="w.reorderConstraint(constraint.id,constraint.order+1)">↓</AppButton></div>
   <AppButton class="w-full" :disabled="w.busy||animate" @click="w.removeConstraintById(constraint.id)">{{t('deleteConstraint')}}</AppButton>
  </fieldset><p v-if="w.inspectorError" role="alert" class="mt-2 text-xs text-danger">{{w.inspectorError}}</p>
 </section>
</template>
