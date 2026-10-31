import {computed,reactive,watch} from 'vue';
import {useWorkspace} from '../stores/workspace';
import {useSceneFieldEditor} from './useSceneFieldEditor';
import {parseRangeBits,rangeBitsText,rangeText} from '../domain/transformRangeFields';
import type {TransformConstraintView} from '../domain/project';

type Target=TransformConstraintView&{id:number};
export function useTransformRangeFields(current:()=>Target|null,disabled:()=>boolean,invalid:()=>string){
 const w=useWorkspace(),draft=reactive<Record<number,string>>({}),dirty=reactive(new Set<number>());
 const versions=new Map<number,number>(),revisions=new Map<number,number>(),pending=new Map<number,Promise<boolean>>();
 const channels=['rotate','x','y','scaleX','scaleY','shearY'] as const;
 const ready=computed(()=>current()?.editorRangeValues?.length===24);
 function linked(index:number){const c=current(),property=channels[Math.floor(index/4)]!;return !!c&&(index%4<2?c.properties.some(from=>from.property===property):c.properties.some(from=>from.to.some(to=>to.property===property)));}
 function text(index:number){const c=current(),bits=c?.editorRangeBits?.[index];if(bits!==null&&bits!==undefined)return rangeBitsText(bits);return ready.value&&linked(index)?rangeText(c!.editorRangeValues![index]!):'';}
 // Reuse shared field-error ownership and synchronous Save-flight semantics.
 // -1 is an INTERNAL absent sentinel, never a native range bit. It avoids the
 // generic null→0 display no-op rule; every real u32 is nonnegative/exact in JS.
 const bridge=useSceneFieldEditor({current:()=>{const c=current(),p=w.project;return c&&p?{id:c.id,documentId:p.documentId,revision:p.revision,editable:w.canEdit&&!disabled()&&ready.value,values:Object.fromEntries(Array.from({length:24},(_,i)=>[String(i),c.editorRangeBits?.[i]??-1]))}:null;},numeric:()=>true,invalidMessage:invalid,edit:(key,value,revision)=>{const c=current(),index=Number(key);return c?w.editTransformRange(c.id,index,Number(value)===-1?null:Number(value),revisions.get(index)??revision):Promise.resolve(false);}});
 watch(()=>{const c=current();return{document:w.project?.documentId,id:c?.id,text:Array.from({length:24},(_,i)=>text(i))};},(next,previous)=>{
  if(!previous||next.document!==previous.document||next.id!==previous.id){dirty.clear();revisions.clear();versions.clear();for(let i=0;i<24;i++)draft[i]=next.text[i]!;return;}
  for(let i=0;i<24;i++)if(!dirty.has(i))draft[i]=next.text[i]!;
 },{immediate:true});
 function input(index:number,value:string){draft[index]=value;dirty.add(index);versions.set(index,(versions.get(index)??0)+1);if(!revisions.has(index)&&w.project)revisions.set(index,w.project.revision);}
 function submit(index:number,bits:number|null){
  const existing=pending.get(index);if(existing)return existing;
  const c=current(),document=w.project?.documentId,id=c?.id,version=versions.get(index)??0;
  bridge.draft[String(index)]=String(bits??-1);
  const operation=bridge.commit(String(index)).then(success=>{if(success&&current()?.id===id&&w.project?.documentId===document&&(versions.get(index)??0)===version){dirty.delete(index);revisions.delete(index);draft[index]=text(index);}return success;}).finally(()=>{if(pending.get(index)===operation)pending.delete(index);});
  pending.set(index,operation);return operation;
 }
 function commit(index:number){
  if(pending.has(index))return pending.get(index)!;
  if(!dirty.has(index))return Promise.resolve(true);
  const bits=parseRangeBits(draft[index]??'');
  if(bits===null){bridge.draft[String(index)]='';return bridge.commit(String(index));}
  return submit(index,bits);
 }
 function clear(index:number){if(w.project)revisions.set(index,w.project.revision);versions.set(index,(versions.get(index)??0)+1);return submit(index,null);}
 function escape(event:KeyboardEvent,index:number){
  dirty.delete(index);revisions.delete(index);versions.set(index,(versions.get(index)??0)+1);draft[index]=text(index);
  // The generic Escape resets every key. Commit this exact stored intent as a
  // no-op instead, clearing only this cell's error and preserving other drafts.
  bridge.draft[String(index)]=String(current()?.editorRangeBits?.[index]??-1);void bridge.commit(String(index));
  event.stopPropagation();(event.target as HTMLInputElement).blur();
 }
 function enter(event:KeyboardEvent,index:number){void commit(index);(event.target as HTMLInputElement).blur();}
 return{draft,ready,linked,input,commit,clear,escape,enter};
}
