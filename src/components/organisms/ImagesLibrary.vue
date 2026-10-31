<script setup lang="ts">
import {computed,ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import {imageDragKeys} from '../../domain/imageSelection';
import AppIcon from '../atoms/AppIcon.vue';
const w=useWorkspace(),{t}=useI18n(),open=ref(true),closed=ref(new Set<string>());
const rows=computed(()=>{
 const entries=new Map<string,{key:string;label:string;depth:number;folder:boolean}>();
 for(const image of w.library.images){const parts=image.key.split('/');for(let i=0;i<parts.length;i++){const key=parts.slice(0,i+1).join('/');entries.set((i===parts.length-1?'i:':'d:')+key,{key,label:parts[i]!+(i===parts.length-1?'.png':''),depth:i+1,folder:i<parts.length-1});}}
 return [...entries.values()].sort((a,b)=>{const aa=a.key.split('/'),bb=b.key.split('/');for(let i=0;i<Math.min(aa.length,bb.length);i++){if(aa[i]!==bb[i])return aa[i]!.localeCompare(bb[i]!); }return aa.length-bb.length;}).filter(row=>{const parts=row.key.split('/');return !parts.slice(0,-1).some((_,i)=>closed.value.has(parts.slice(0,i+1).join('/')));});
});
function toggle(key:string){const value=new Set(closed.value);if(value.has(key))value.delete(key);else value.add(key);closed.value=value;}
const imageKeys=computed(()=>rows.value.filter(row=>!row.folder).map(row=>row.key));
function drag(event:DragEvent,key:string){
 const keys=imageDragKeys(w.librarySelectedKeys,key,w.library.images.map(image=>image.key));
 if(!keys.length||!event.dataTransfer){event.preventDefault();return;}
 if(!w.librarySelectedKeys.includes(key))w.selectLibraryImage(key,imageKeys.value);
 event.dataTransfer.setData('application/x-fbones-images',JSON.stringify(keys));
 event.dataTransfer.setData('application/x-fbones-image',key);
 event.dataTransfer.setData('text/plain',keys.join('\n'));
 event.dataTransfer.effectAllowed='copy';
}
function select(key:string,event:MouseEvent){w.selectLibraryImage(key,imageKeys.value,{shift:event.shiftKey,toggle:event.ctrlKey||event.metaKey});}
</script>
<template>
 <section class="mt-2 border-t border-line pt-1" :aria-label="t('imagesLibrary')">
  <div class="flex items-center gap-1 px-1 py-1">
   <button class="flex min-w-0 flex-1 items-center gap-1 text-left" :aria-expanded="open" @click="open=!open" @dblclick="w.chooseImagesFolder"><span class="w-3 text-faint">{{ open?'▾':'▸' }}</span><AppIcon name="folder" class="!size-3.5 text-warning"/><span>{{ t('images') }}</span><span class="ml-auto text-[10px] text-muted">{{ w.library.images.length }}</span></button>
   <button class="dock-tab !px-1" :disabled="!w.canEdit||w.busy" :aria-label="t('refreshImages')" :title="t('refreshImages')" @click="w.refreshImagesFolder"><AppIcon name="reset" class="!size-3.5"/></button>
   <button class="dock-tab !px-1" :disabled="!w.canEdit||w.busy" :title="t('chooseImagesFolder')" :aria-label="t('chooseImagesFolder')" @click="w.chooseImagesFolder"><AppIcon name="folder" class="!size-3.5"/></button>
  </div>
  <template v-if="open">
   <button class="mx-1 mb-1 max-w-full truncate px-4 py-0.5 text-left text-[10px] text-muted hover:text-ink" :disabled="!w.canEdit||w.busy" :title="w.library.root" @click="w.chooseImagesFolder">{{ w.library.root }}</button>
   <button v-for="row in rows" :key="(row.folder?'d:':'i:')+row.key" role="treeitem" :aria-level="row.depth+1" :aria-selected="!row.folder&&w.librarySelectedKeys.includes(row.key)" :aria-expanded="row.folder?!closed.has(row.key):undefined" :draggable="!row.folder&&!w.busy&&w.canEdit" class="tree-row w-full gap-1.5 pr-2 text-left" :class="!row.folder&&w.librarySelectedKeys.includes(row.key)?'selected':''" :style="{paddingLeft:`${14+row.depth*13}px`}" :title="row.key" @dragstart="!row.folder&&drag($event,row.key)" @click="row.folder?toggle(row.key):select(row.key,$event)">
    <span v-if="row.folder" class="w-2 text-faint">{{ closed.has(row.key)?'▸':'▾' }}</span><AppIcon :name="row.folder?'folder':'image'" class="!size-3.5" :class="row.folder?'text-warning':'text-accent'"/><span class="truncate">{{ row.label }}</span>
   </button>
   <p v-if="!rows.length" class="px-4 py-2 text-[11px] leading-4 text-muted">{{ t('imagesFolderEmpty') }}</p>
   <p v-else class="px-4 py-2 text-[10px] leading-4 text-muted">{{ t('imageLibraryHint') }}</p>
   <p v-if="w.library.warnings.length" class="px-4 pb-2 text-[10px] text-warning" :title="w.library.warnings.join('\n')">{{ t('imageLibraryWarnings',{count:w.library.warnings.length}) }}</p>
  </template>
 </section>
</template>
