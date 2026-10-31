import {reactive,watch,onBeforeUnmount} from 'vue';
import {createSceneFieldCommitter,type SceneFieldSnapshot,type SceneFieldValue} from '../domain/sceneFields';
import {useWorkspace} from '../stores/workspace';

const inspectorErrors=new WeakMap<object,Map<symbol,string>>();

export function useSceneFieldEditor(options:{
  current:()=>SceneFieldSnapshot|null;
  numeric:(key:string)=>boolean;
  invalidMessage:()=>string;
  edit:(key:string,value:SceneFieldValue,revision:number)=>Promise<boolean>;
}){
  const w=useWorkspace(),draft=reactive<Record<string,string>>({}),owner=Symbol('scene-field-editor');
  const errors=inspectorErrors.get(w)??new Map<symbol,string>();inspectorErrors.set(w,errors);
  let disposed=false;
  function publish(message:string){if(disposed)return;if(message)errors.set(owner,message);else errors.delete(owner);w.inspectorError=errors.values().next().value??'';if(message)w.showNotice(message,true);}
  const commit=createSceneFieldCommitter({...options,draft,error:publish,failure:()=>w.notice});
  onBeforeUnmount(()=>{publish('');disposed=true;});
  function reset(){const source=options.current();for(const key of Object.keys(draft))delete draft[key];for(const [key,value]of Object.entries(source?.values??{}))draft[key]=String(value??0);commit.reset();}
  watch(()=>options.current(),(source,previous)=>{
    if(!source||!previous||source.id!==previous.id||source.documentId!==previous.documentId){reset();return;}
    for(const key of Object.keys(draft))if(!(key in source.values))delete draft[key];
    for(const [key,value]of Object.entries(source.values))if(!(key in draft)||String(draft[key])===String(previous.values[key]??0)||String(draft[key])===String(value??0))draft[key]=String(value??0);
    commit.retainKeys(Object.keys(source.values));
  },{immediate:true});
  function enter(event:KeyboardEvent,key:string){void commit(key);(event.target as HTMLInputElement).blur();}
  function escape(event:KeyboardEvent){reset();event.stopPropagation();(event.target as HTMLInputElement).blur();}
  return {draft,commit,enter,escape,reset};
}
