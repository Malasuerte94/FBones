<script setup lang="ts">
import {useWorkspace} from '../../stores/workspace';
import type {BoneFieldEditor} from '../../composables/useBoneFieldEditor';
import {animationChannelFamily,type AnimationFamily} from '../../domain/animation';
import type {BoneField} from '../../domain/boneFields';
import AppIcon from '../atoms/AppIcon.vue';
defineProps<{editor:BoneFieldEditor}>();
const w=useWorkspace();
function compact(value:string|number){const number=Number(value);return String(value).trim()&&Number.isFinite(number)?String(Number(number.toPrecision(6))):value;}
const rows: {channel:AnimationFamily;title:string;glyph:string;fields:BoneField[];tool:'rotate'|'translate'|'scale'|'shear'}[]=[
  {channel:'rotate',title:'Rotate',glyph:'↻',fields:['rotation'],tool:'rotate'},
  {channel:'translate',title:'Translate',glyph:'✣',fields:['x','y'],tool:'translate'},
  {channel:'scale',title:'Scale',glyph:'▣',fields:['scaleX','scaleY'],tool:'scale'},
  {channel:'shear',title:'Shear',glyph:'⌁',fields:['shearX','shearY'],tool:'shear'},
];
function allowed(family:AnimationFamily){return w.canEdit&&!w.busy&&!w.traceOpen&&!w.clippingDraft&&(w.editorMode==='setup'||w.animationChannels.some(channel=>animationChannelFamily(channel)===family)&&!!w.activeAnimation);}
</script>
<template>
 <div class="animation-tools" data-testid="animation-tools" :aria-label="w.editorMode==='animate'?'Animation transform tools':'Setup transform tools'">
  <div class="animation-tool-stack"><button :disabled="!allowed('rotate')" :class="{active:w.tool==='pose'}" @click="w.tool='pose'"><span class="text-motion">◇</span> Pose</button><button :disabled="w.editorMode==='animate'||!w.canEdit||w.busy" @click="w.setMode('weights')"><AppIcon name="weights"/> Weights</button><button :disabled="w.editorMode==='animate'||!w.canEdit||w.busy" :class="{active:w.tool==='create'}" @click="w.tool='create'"><AppIcon name="plus"/> Create</button></div>
  <div class="animation-transform-rows">
   <div v-for="row in rows" :key="row.channel" class="animation-transform-row" :data-channel="row.channel">
    <button class="animation-transform-name" :class="{active:w.tool===row.tool}" :disabled="!allowed(row.channel)" :aria-label="row.title" :aria-pressed="w.tool===row.tool" :title="row.title" @click="w.tool=row.tool"><span aria-hidden="true">{{row.glyph}}</span>{{row.title}}</button>
    <span v-for="field in row.fields" :key="field" class="animation-transform-cell" :class="{disabled:!allowed(row.channel)||!w.selectedBone}">
     <input :value="editor.draft[field]" @focus="w.pauseAnimation()" @input="editor.draft[field]=($event.target as HTMLInputElement).value" :aria-label="field" :data-testid="(w.editorMode==='animate'?'animate-bone-':'bone-')+field" type="number" step="any" :disabled="!allowed(row.channel)||!w.selectedBone" @change="editor.commit(field)" @keydown.enter.stop.prevent="editor.enter($event,field)" @keydown.esc.stop.prevent="editor.escape($event)">
     <span class="animation-transform-compact" aria-hidden="true">{{compact(editor.draft[field])}}</span>
    </span>
    <button v-if="w.editorMode==='animate'" class="animation-key-tool" :disabled="!allowed(row.channel)||!w.selectedBone||!w.selectedIds.length" :aria-label="'Key '+row.title" :title="'Key '+row.title" @click="w.insertAnimationKeys(row.channel)"><AppIcon name="key" class="!size-3"/></button>
   </div>
   <div v-if="w.editorMode==='setup'" class="animation-transform-row" data-channel="length"><button class="animation-transform-name" :class="{active:w.tool==='length'}" :disabled="!allowed('rotate')" @click="w.tool='length'">↔ Length</button><input v-model="editor.draft.length" data-testid="bone-length" aria-label="length" type="number" step="any" min="0" max="1000000" :disabled="!allowed('rotate')||!w.selectedBone" @change="editor.commit('length')" @keydown.enter.stop.prevent="editor.enter($event,'length')" @keydown.esc.stop.prevent="editor.escape($event)"></div>
   <div v-if="w.tool==='rotate'&&w.selectedIds.length>1" class="flex gap-1 pt-1" role="group" aria-label="Rotation pivot"><button v-for="pivot in (['individual','group'] as const)" :key="pivot" class="dock-tab flex-1 !text-[10px]" :class="{active:w.transformPivot===pivot}" :aria-pressed="w.transformPivot===pivot" :disabled="!allowed('rotate')" @click="w.transformPivot=pivot">{{pivot==='individual'?'Individual':'Group'}}</button></div>
   <p v-if="w.inspectorError" role="status" class="max-w-56 text-[10px] text-danger">{{w.inspectorError}}</p>
  </div>
  <div class="animation-tool-stack"><button class="active">◇ Local</button><button disabled>⌁ Parent</button><button disabled>◈ World</button></div>
  <div class="animation-tool-stack"><button class="active"><AppIcon name="bone"/> Bones</button><button :disabled="w.editorMode==='animate'||!w.canEdit||w.busy" @click="w.setMode('images')"><AppIcon name="image"/> Images</button><button v-if="w.editorMode==='animate'" :class="{active:w.animationAutoKey}" :aria-pressed="w.animationAutoKey" data-testid="animate-auto-key" @click="w.animationAutoKey=!w.animationAutoKey"><span class="text-accent">⌁</span> Auto Key</button></div>
 </div>
</template>
