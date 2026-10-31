import { computed, onBeforeUnmount, reactive, watch } from 'vue';
import { useWorkspace } from '../stores/workspace';

export interface WeightFieldSource {
  documentId: number; id: number; revision: number; vertex: number;
  scene: boolean; editable: boolean; bones: readonly number[]; weights: readonly number[];
  vertices?:readonly number[];
  mixed?:readonly boolean[];
  lockedBones?:readonly number[];
}

/** Draft text belongs to a stable binding row, independently from hover repaint. */
export function useWeightFieldEditor(options: {
  current: () => WeightFieldSource | null;
  invalidMessage: () => string;
  edit: (source: WeightFieldSource, bone: number, value: number) => Promise<boolean>;
}) {
  const w=useWorkspace(), source=computed(options.current),draft=reactive<Record<string,string>>({});
  const errors=reactive(new Map<string,string>()),pending=new Map<string,Promise<boolean>>();
  let ownError='',disposed=false;
  const identity=(s:WeightFieldSource)=>`${s.documentId}:${s.scene?'attachment':'slot'}:${s.id}:${s.vertices?.join(',')??s.vertex}`;
  const keyFor=(s:WeightFieldSource,bone:number)=>`${identity(s)}:${bone}`;
  const formatted=(s:WeightFieldSource,bone:number)=>s.mixed?.[s.bones.indexOf(bone)]?'':(100*(s.weights[s.bones.indexOf(bone)]??0)).toFixed(1);
  function publish() {
    const message=errors.values().next().value??'';
    if(message)w.inspectorError=message;
    else if(w.inspectorError===ownError)w.inspectorError='';
    ownError=message;
  }
  function validKey(key:string,s=source.value):s is WeightFieldSource {
    return !!s&&s.bones.some(bone=>keyFor(s,bone)===key);
  }
  function reset() {
    for(const key of Object.keys(draft))delete draft[key];
    errors.clear();publish();
    const s=source.value;if(s)for(const bone of s.bones)draft[keyFor(s,bone)]=formatted(s,bone);
  }
  watch(source,(s,previous)=>{
    if(!s||!previous||identity(s)!==identity(previous)){reset();return;}
    const keys=new Set(s.bones.map(bone=>keyFor(s,bone)));
    for(const key of Object.keys(draft))if(!keys.has(key)){delete draft[key];errors.delete(key);}
    for(const bone of s.bones){const key=keyFor(s,bone),next=formatted(s,bone);if(!(key in draft)||draft[key]===formatted(previous,bone)||draft[key]===next)draft[key]=next;}
    publish();
  },{immediate:true,flush:'sync'});
  function commit(key:string):Promise<boolean> {
    const s=source.value;
    if(disposed||!validKey(key,s)||!s.editable)return Promise.resolve(false);
    const bone=s.bones.find(bone=>keyFor(s,bone)===key)!,raw=draft[key]??'',percent=Number(raw);
    // Empty is the untouched/mixed display, not a numeric zero request. Escape
    // may restore it before change/blur reentry; neither should edit or error.
    if(raw===''&&s.mixed?.[s.bones.indexOf(bone)]){errors.delete(key);publish();return Promise.resolve(true);}
    if(!raw.trim()||!Number.isFinite(percent)||percent<0||percent>100){errors.set(key,options.invalidMessage());publish();return Promise.resolve(false);}
    errors.delete(key);publish();
    // Display precision is not authoring precision. Merely leaving an input
    // (including Escape's restored display) must not round the native weight.
    if(raw===formatted(s,bone)||percent===100*s.weights[s.bones.indexOf(bone)]!){draft[key]=formatted(s,bone);return Promise.resolve(true);}
    const token=JSON.stringify([key,percent]),existing=pending.get(token);if(existing)return existing;
    // Calling edit before returning makes native editFlight visible to Save blur.
    const flight=options.edit({...s,bones:[...s.bones],weights:[...s.weights],...(s.vertices?{vertices:[...s.vertices]}:{}),...(s.mixed?{mixed:[...s.mixed]}:{}),...(s.lockedBones?{lockedBones:[...s.lockedBones]}:{})},bone,percent/100);
    const result=flight.then(success=>{
      const current=source.value;
      if(!disposed&&validKey(key,current)&&draft[key]===raw){
        if(success){draft[key]=formatted(current,bone);errors.delete(key);}
        else errors.set(key,w.notice||options.invalidMessage());
        publish();
      }
      return success;
    },error=>{
      if(!disposed&&validKey(key)){errors.set(key,error instanceof Error?error.message:options.invalidMessage());publish();}
      return false;
    }).finally(()=>pending.delete(token));
    pending.set(token,result);return result;
  }
  function field(bone:number|null) {
    const s=source.value,key=s&&bone!==null?keyFor(s,bone):'';
    const read=(event:Event)=>{if(validKey(key))draft[key]=(event.target as HTMLInputElement).value;};
    return {
      value:draft[key]??'','aria-invalid':errors.has(key)||undefined,placeholder:s?.mixed?.[s.bones.indexOf(bone??-1)]?'*':undefined,
      onInput:read,
      onChange:(event:Event)=>{read(event);void commit(key);},
      onBlur:()=>{void commit(key);},
      onKeydown:(event:KeyboardEvent)=>{
        if(event.key==='Enter'){event.preventDefault();void commit(key);(event.target as HTMLInputElement).blur();}
        if(event.key==='Escape'){
          event.preventDefault();event.stopPropagation();const current=source.value;
          if(validKey(key,current)&&bone!==null){draft[key]=formatted(current,bone);errors.delete(key);publish();(event.target as HTMLInputElement).value=draft[key]!;}
          (event.target as HTMLInputElement).blur();
        }
      },
    };
  }
  onBeforeUnmount(()=>{disposed=true;errors.clear();publish();});
  return {field,key:(bone:number|null)=>{const s=source.value;return s&&bone!==null?keyFor(s,bone):'none';}};
}
