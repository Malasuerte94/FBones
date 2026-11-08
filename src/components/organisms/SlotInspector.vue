<script setup lang="ts">
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWorkspace } from '../../stores/workspace';
import {useSceneFieldEditor} from '../../composables/useSceneFieldEditor';
import NumericSliderRow from '../molecules/NumericSliderRow.vue';
import AppIcon from '../atoms/AppIcon.vue';
import SequenceInspector from './SequenceInspector.vue';
import AttachmentColorEditor from './AttachmentColorEditor.vue';
import type {SlotBlendMode} from '../../domain/project';
const w = useWorkspace(), { t } = useI18n();
const animate=computed(()=>w.editorMode==='animate');
const sequenceTarget=computed(()=>w.selectedAttachment??w.sceneAttachments.find(a=>a.id===w.selectedSlot?.activeAttachmentId));
const components=['R','G','B','A'] as const;
const animateColor=computed<[number,number,number,number]>(()=>w.selectedSlot?w.animationSlotColor(w.selectedSlot.id):[1,1,1,1] as [number,number,number,number]);
const colorMessage=()=>t('invalidTransform');
const colorEditor=useSceneFieldEditor({
 current:()=>w.selectedSlot&&animate.value&&w.project?{id:w.selectedSlot.id,documentId:w.project.documentId,revision:w.project.revision,editable:w.canEdit&&!w.busy,values:Object.fromEntries(components.map((_,i)=>[String(i),animateColor.value[i]!]))}:null,
 numeric:()=>true,invalidMessage:colorMessage,
 edit:(_key,value)=>{const slot=w.selectedSlot;if(!slot)return Promise.resolve(false);const values=[...animateColor.value] as [number,number,number,number];values[Number(_key)]=Number(value);if(values.some(v=>!Number.isFinite(v)||v<0||v>1)){w.showNotice(colorMessage(),true);return Promise.resolve(false);}return w.setSlotAnimationColor(slot.id,values);},
});
const animateDark=computed<[number,number,number]>(()=>w.selectedSlot?w.animationSlotDarkColor(w.selectedSlot.id):[0,0,0]);
const darkEditor=useSceneFieldEditor({
 current:()=>w.selectedSlot?.tintBlack&&animate.value&&w.project?{id:w.selectedSlot.id,documentId:w.project.documentId,revision:w.project.revision,editable:w.canEdit&&!w.busy,values:Object.fromEntries(components.slice(0,3).map((_,i)=>[String(i),animateDark.value[i]!]))}:null,
 numeric:()=>true,invalidMessage:colorMessage,
 edit:(key,value)=>{const slot=w.selectedSlot;if(!slot?.tintBlack)return Promise.resolve(false);const values=[...animateDark.value]as[number,number,number];values[Number(key)]=Number(value);if(values.some(v=>!Number.isFinite(v)||v<0||v>1)){w.showNotice(colorMessage(),true);return Promise.resolve(false);}return w.setSlotAnimationDarkColor(slot.id,values);},
});
watch(()=>[w.animationId,w.animationFrame,w.editorMode,w.selectedSlotId],()=>{colorEditor.reset();darkEditor.reset();});
const colorInvalid=computed(()=>animate.value&&components.some((_,i)=>{const value=String(colorEditor.draft[String(i)]??'');return !value.trim()||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1;}));
const darkInvalid=computed(()=>animate.value&&w.selectedSlot?.tintBlack&&components.slice(0,3).some((_,i)=>{const value=String(darkEditor.draft[String(i)]??'');return !value.trim()||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1;}));
let colorDisposed=false;
watch([colorInvalid,darkInvalid,()=>w.inspectorError],([light,dark])=>{if(!colorDisposed&&(light||dark)&&w.inspectorError!==colorMessage())w.inspectorError=colorMessage();},{flush:'sync'});
function cancelColor(index:number){colorEditor.draft[String(index)]=String(animateColor.value[index]);void colorEditor.commit(String(index));if(!colorInvalid.value&&!darkInvalid.value&&w.inspectorError===colorMessage())w.inspectorError='';}
function escapeColor(event:KeyboardEvent,index:number){cancelColor(index);event.stopPropagation();(event.target as HTMLInputElement).blur();}
function escapeDark(event:KeyboardEvent,index:number){darkEditor.draft[String(index)]=String(animateDark.value[index]);void darkEditor.commit(String(index));if(!colorInvalid.value&&!darkInvalid.value&&w.inspectorError===colorMessage())w.inspectorError='';event.stopPropagation();(event.target as HTMLInputElement).blur();}
onBeforeUnmount(()=>{colorDisposed=true;if(w.inspectorError===colorMessage())w.inspectorError='';});
const colorHex=computed(()=> '#'+animateColor.value.slice(0,3).map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join(''));
const darkHex=computed(()=> '#'+animateDark.value.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join(''));
function animateDarkSwatch(event:Event){const slot=w.selectedSlot;if(!slot?.tintBlack||!w.canEdit||w.busy||colorInvalid.value||darkInvalid.value)return;const rgb=(event.target as HTMLInputElement).value.slice(1);void w.setSlotAnimationDarkColor(slot.id,[0,2,4].map(i=>Number.parseInt(rgb.slice(i,i+2),16)/255)as[number,number,number]);}
const darkSetupFailure=ref('');
const darkSetupActions=computed(()=>{
 const slot=w.selectedSlot,documentId=w.project?.documentId;
 async function apply(event:Event,enabled:boolean,color:number){
  if(!slot||!w.project||animate.value||!w.canEdit||w.busy||w.traceOpen||w.clippingDraft||w.project?.documentId!==documentId||w.selectedSlotId!==slot.id)return;
  darkSetupFailure.value='';const ok=await w.editRig({type:'setSlotDarkColor',id:slot.id,enabled,color},w.project.revision);
  if(!ok&&w.project?.documentId===documentId&&w.selectedSlotId===slot.id){darkSetupFailure.value=w.notice;const field=event.target as HTMLInputElement;if(field.type==='checkbox')field.checked=!!w.selectedSlot?.tintBlack;else field.value='#'+((w.selectedSlot?.darkColor??255)>>>8).toString(16).padStart(6,'0');}
 }
 return{toggle:(event:Event)=>apply(event,(event.target as HTMLInputElement).checked,slot?.darkColor??255),color:(event:Event)=>apply(event,!!slot?.tintBlack,((Number.parseInt((event.target as HTMLInputElement).value.slice(1),16)<<8)|((slot?.darkColor??255)&255))>>>0)};
});
watch(()=>[w.selectedSlotId,w.editorMode,w.project?.documentId,w.selectedSlot?.tintBlack,w.selectedSlot?.darkColor],()=>{darkSetupFailure.value='';});
function animateSwatch(event:Event){if(!w.selectedSlot||w.busy)return;const rgb=(event.target as HTMLInputElement).value.slice(1);const values=[0,2,4].map(i=>Number.parseInt(rgb.slice(i,i+2),16)/255);void w.setSlotAnimationColor(w.selectedSlot.id,[values[0]!,values[1]!,values[2]!,animateColor.value[3]]);}
const fields = ['x', 'y', 'rotation', 'scaleX', 'scaleY'] as const;
const draft = reactive({ name: '', x: '', y: '', rotation: '', scaleX: '', scaleY: '' });
function reset() {
  if(!animate.value)w.inspectorError = '';
  const slot = w.selectedSlot;
  draft.name = slot?.name ?? '';
  for (const field of fields) draft[field] = String(slot?.region?.[field] ?? (field.startsWith('scale') ? 1 : 0));
}
watch(() => [w.selectedSlotId, w.project], reset, { immediate: true });
async function commit(key: keyof typeof draft | 'bone' | 'visible', value?: number | boolean) {
  const slot = w.selectedSlot;
  if (!slot || !w.canEdit || w.busy) return;
  const patch = key === 'bone' || key === 'visible' ? value : key === 'name' ? draft.name : Number(draft[key]);
  if (fields.includes(key as typeof fields[number]) && (!String(draft[key as typeof fields[number]]).trim() || !Number.isFinite(patch))) {
    w.inspectorError = t('invalidTransform'); w.showNotice(w.inspectorError, true); return;
  }
  const region = slot.region;
  w.inspectorError = '';
  const succeeded = await w.editRig({ type: 'updateSlot', id: slot.id, name: slot.name, bone: slot.bone, visible: slot.visible,
    x: region?.x ?? 0, y: region?.y ?? 0, rotation: region?.rotation ?? 0, scaleX: region?.scaleX ?? 1, scaleY: region?.scaleY ?? 1, [key]: patch }, w.project!.revision);
  if (!succeeded && w.selectedSlotId === slot.id) w.inspectorError = w.notice;
}
function setColor(event:Event){const slot=w.selectedSlot;if(!slot)return;const rgb=Number.parseInt((event.target as HTMLInputElement).value.slice(1),16);void w.editRig({type:'setSlotColor',id:slot.id,color:((rgb<<8)|((slot.color??0xffffffff)&255))>>>0});}
function setOpacity(event:Event){const slot=w.selectedSlot;if(!slot)return;const alpha=Math.max(0,Math.min(255,Math.round(Number((event.target as HTMLInputElement).value)*255)));void w.editRig({type:'setSlotColor',id:slot.id,color:(((slot.color??0xffffffff)&0xffffff00)|alpha)>>>0});}
function setBlend(event:Event){const slot=w.selectedSlot;if(!slot||!w.canEdit||w.busy)return;const blend=(event.target as HTMLSelectElement).value as SlotBlendMode;void w.editRig({type:'setSlotBlend',id:slot.id,blend});}
function escape(event: KeyboardEvent) { reset(); (event.target as HTMLInputElement).blur(); }
</script>
<template>
  <section v-if="w.selectedSlot" class="inspector-form border-b border-line p-2" :class="{'slot-animation-inspector':animate}" :data-testid="animate?'animation-slot-inspector':'slot-inspector'">
    <h3 :class="animate?'mb-1':'mb-4'" class=" text-xs font-medium text-accent">{{ t(w.sceneEditing?'slotProperties':'imageProperties') }}</h3>
    <div v-if="animate" class="space-y-1.5" @focusin="w.pauseAnimation">
      <div class="flex items-center gap-2 text-xs"><span class="min-w-0 flex-1 truncate" :title="w.selectedSlot.name">{{w.selectedSlot.name}}</span><label>{{t(w.selectedSlot.tintBlack?'slotLightColor':'color')}} <input type="color" :value="colorHex" :disabled="!w.canEdit||w.busy" data-testid="animation-slot-color" @change="animateSwatch"/></label><button class="dock-tab" :disabled="!w.canEdit||w.busy||colorInvalid||darkInvalid" data-testid="animation-slot-key-rgba" :aria-label="t('color')+' key'" title="Key slot color" @click="w.insertSlotAnimationKeys({slotId:w.selectedSlot.id,channel:'rgba'})"><AppIcon name="key" class="size-3"/></button></div>
      <NumericSliderRow v-model="colorEditor.draft['3']!" :label="t('opacity')" test-id="animation-slot-opacity" :context-key="`${w.project?.documentId}:${w.selectedSlot.id}:${w.animationId}:${w.animationFrame}`" :min="0" :max="1" :step="0.001" :disabled="!w.canEdit" :locked="w.busy" @commit="colorEditor.commit('3')" @cancel="cancelColor(3)"/>
      <div class="grid grid-cols-3 gap-1"><label v-for="(component,index) in components.slice(0,3)" :key="component" class="text-[10px] text-muted">{{component}}<input v-model="colorEditor.draft[String(index)]" type="text" inputmode="decimal" :disabled="!w.canEdit||w.busy" :aria-label="'Slot '+component" :aria-invalid="colorInvalid" :data-testid="'animation-slot-color-'+component.toLowerCase()" class="editor-input w-full min-w-0" @change="colorEditor.commit(String(index))" @keydown.enter.prevent="colorEditor.enter($event,String(index))" @keydown.esc.prevent="escapeColor($event,index)"/></label></div>
      <div v-if="w.selectedSlot.tintBlack" class="space-y-1" data-testid="animation-slot-dark-editor">
       <label class="flex items-center justify-between text-[10px] text-muted">{{t('slotDarkColor')}}<input type="color" :value="darkHex" :disabled="!w.canEdit||w.busy||colorInvalid||darkInvalid" :aria-label="t('slotDarkColor')" data-testid="animation-slot-dark-color" @change="animateDarkSwatch"/></label>
       <div class="grid grid-cols-3 gap-1"><label v-for="(component,index) in components.slice(0,3)" :key="component" class="min-w-0 text-[10px] text-muted">{{component}}<input v-model="darkEditor.draft[String(index)]" type="text" inputmode="decimal" :disabled="!w.canEdit||w.busy" :aria-label="t('slotDarkColor')+' '+component" :aria-invalid="darkInvalid" :data-testid="'animation-slot-dark-'+component.toLowerCase()" class="editor-input w-full min-w-0" @change="darkEditor.commit(String(index))" @keydown.enter.prevent="darkEditor.enter($event,String(index))" @keydown.esc.prevent="escapeDark($event,index)"/></label></div>
       <p class="text-[10px] leading-4 text-muted" data-testid="slot-two-color-limit">{{t('slotTwoColorLinearOnly')}}</p>
      </div>
      <p v-if="colorInvalid||darkInvalid" class="text-[10px] text-danger" role="status">{{colorMessage()}}</p>
    </div>
    <fieldset v-else :disabled="!w.canEdit || w.busy" class="space-y-4">
      <label class="block text-xs text-muted">{{ t('slotName') }}<input v-model="draft.name" data-testid="slot-name" maxlength="120" class="mt-2 w-full rounded border border-line bg-shell px-2.5 py-2 text-ink outline-none focus:border-accent" @change="commit('name')" @keydown.enter.prevent="commit('name')" @keydown.esc.prevent="escape"></label>
      <label class="block text-xs text-muted">{{ t('boundBone') }}<select :value="w.selectedSlot.bone" class="mt-2 w-full rounded border border-line bg-shell px-2.5 py-2 text-ink outline-none focus:border-accent" @change="commit('bone', Number(($event.target as HTMLSelectElement).value))"><option v-for="bone in w.project?.bones" :key="bone.id" :value="bone.id">{{ bone.name }}</option></select></label>
      <label v-if="!animate&&!w.sceneEditing" class="flex items-center gap-2 text-xs text-muted"><input type="checkbox" :checked="w.selectedSlot.visible" :disabled="!w.selectedSlot.region" @change="commit('visible', ($event.target as HTMLInputElement).checked)">{{ t('visible') }}</label>
      <div class="flex items-center gap-2"><label class="flex items-center gap-2 text-xs text-muted">{{ t('color') }}<input type="color" :value="'#'+((w.selectedSlot.color??0xffffffff)>>>8).toString(16).padStart(6,'0')" @change="setColor"/></label><label class="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted">{{ t('opacity') }}<input type="range" min="0" max="1" step="0.01" :value="((w.selectedSlot.color??0xffffffff)&255)/255" @change="setOpacity"/></label></div>
      <div class="space-y-1" data-testid="slot-dark-setup"><div class="flex flex-wrap items-center justify-between gap-1 text-xs text-muted"><label class="flex items-center gap-1"><input type="checkbox" :checked="!!w.selectedSlot.tintBlack" :disabled="!w.canEdit||w.busy" data-testid="slot-tint-black" :onChange="darkSetupActions.toggle"/>{{t('slotTintBlack')}}</label><label class="flex items-center gap-1">{{t('slotDarkColor')}}<input type="color" :value="'#'+((w.selectedSlot.darkColor??255)>>>8).toString(16).padStart(6,'0')" :disabled="!w.canEdit||w.busy||!w.selectedSlot.tintBlack" :aria-label="t('slotDarkColor')" data-testid="slot-dark-color" :onChange="darkSetupActions.color"/></label></div><p v-if="darkSetupFailure" role="status" class="text-[10px] text-danger">{{darkSetupFailure}}</p></div>
      <label class="block text-xs text-muted">{{ t('slotBlending') }}<select :value="w.selectedSlot.blend" data-testid="slot-blend" class="editor-input mt-2 w-full" @change="setBlend"><option v-for="blend in (['normal','additive','multiply','screen'] as const)" :key="blend" :value="blend">{{ t('blend_'+blend) }}</option></select></label>
      <div v-if="!animate&&!w.sceneEditing && w.selectedSlot.region && !w.selectedSlot.mesh" class="grid grid-cols-2 gap-3">
        <label v-for="field in fields" :key="field" class="block text-xs text-muted">{{ t(field) }}<input v-model="draft[field]" :data-testid="`slot-${field}`" type="number" step="any" min="-1000000" max="1000000" required class="mt-2 w-full min-w-0 rounded border border-line bg-shell px-2.5 py-2 tabular-nums text-ink outline-none focus:border-accent" @change="commit(field)" @keydown.enter.prevent="commit(field)" @keydown.esc.prevent="escape"></label>
      </div>
    </fieldset>
    <AttachmentColorEditor v-if="animate&&sequenceTarget?.region" :attachment="sequenceTarget"/><SequenceInspector v-if="animate&&sequenceTarget?.region" :attachment="sequenceTarget"/>
    <p v-if="!animate&&!w.sceneEditing&&w.selectedSlot.region" class="mt-4 break-all text-[11px] text-muted">{{ w.selectedSlot.region.image }}.png · {{ w.selectedSlot.region.width }} × {{ w.selectedSlot.region.height }}</p>
    <p v-if="!animate&&!w.sceneEditing&&w.selectedSlot.region && !w.selectedSlot.imageAvailable" role="status" class="mt-2 text-xs leading-5 text-warning">{{ t('missingImage') }}</p>
    <p v-if="!animate&&!w.sceneEditing" class="mt-4 text-[11px] leading-5 text-faint">{{ t(w.selectedSlot.mesh?'meshPropertiesHint':'imagePropertiesHint') }}</p>
    <button v-if="!animate&&!w.sceneEditing&&w.selectedSlot.region" class="dock-tab mt-3 w-full" :disabled="!w.canEdit||w.busy" @click="w.selectedSlot.mesh?w.setMode('meshes'):(w.editRig({type:'convertMesh',id:w.selectedSlot.id}),w.setMode('meshes'))">{{ t(w.selectedSlot.mesh?'editMesh':'convertMesh') }}</button>
  </section>
</template>
