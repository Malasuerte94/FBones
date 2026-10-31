<script setup lang="ts">
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
const props=defineProps<{bits?:readonly(number|null)[]}>();
const{t}=useI18n();
const channels=['rotate','x','y','scaleX','scaleY','shearY'] as const;
const columns=['sourceStart','sourceEnd','targetStart','targetEnd'] as const;
const rows=computed(()=>channels.map((channel,row)=>({channel,cells:columns.map((column,index)=>({column,index:row*4+index,bits:props.bits?.[row*4+index]??null}))})));
function display(bits:number|null){
 if(bits===null)return'—';
 const bytes=new DataView(new ArrayBuffer(4));bytes.setUint32(0,bits,false);
 const value=bytes.getFloat32(0,false);return Object.is(value,-0)?'-0':String(value);
}
</script>
<template>
 <details v-if="bits?.length===24" class="mt-2 border-t border-line pt-2" data-testid="transform-stored-ranges">
  <summary class="text-[11px] text-muted" data-testid="transform-stored-ranges-toggle">{{t('savedTransformRanges')}}</summary>
  <p class="my-2 text-[10px] leading-4 text-muted">{{t('savedTransformRangesHint')}}</p>
  <div class="overflow-x-auto">
   <table class="w-full table-fixed text-[10px] tabular-nums" :aria-label="t('savedTransformRanges')">
    <thead><tr class="text-muted"><th scope="col" class="w-18 px-1 py-1 text-left font-normal">{{t('transformRangeProperty')}}</th><th v-for="column in columns" :key="column" scope="col" class="px-1 py-1 text-right font-normal">{{t('storedRange_'+column)}}</th></tr></thead>
    <tbody><tr v-for="row in rows" :key="row.channel" class="border-t border-line/60">
     <th scope="row" class="truncate px-1 py-1 text-left font-normal text-muted">{{t('channel_'+row.channel)}}</th>
     <td v-for="cell in row.cells" :key="cell.column" class="truncate px-1 py-1 text-right" :data-testid="`transform-stored-cell-${cell.index}`" :data-range-bits="cell.bits===null?'absent':String(cell.bits)" :title="cell.bits===null?t('storedRangeAbsent'):display(cell.bits)"><span :aria-label="cell.bits===null?t('storedRangeAbsent'):undefined">{{display(cell.bits)}}</span></td>
    </tr></tbody>
   </table>
  </div>
 </details>
</template>
