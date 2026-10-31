/** One field transaction for Enter/change/blur, including synchronous Save guards. */
export type SceneFieldValue=string|number|boolean|null;
export interface SceneFieldSnapshot {id:number;documentId:number;revision:number;editable:boolean;values:Record<string,SceneFieldValue>}
export interface SceneFieldOptions {
  current:()=>SceneFieldSnapshot|null;
  draft:Record<string,string>;
  numeric:(key:string)=>boolean;
  invalidMessage:()=>string;
  error:(message:string)=>void;
  failure:()=>string;
  edit:(key:string,value:SceneFieldValue,revision:number)=>Promise<boolean>;
}
export function createSceneFieldCommitter(options:SceneFieldOptions){
  const pending=new Map<string,Promise<boolean>>(),errors=new Map<string,string>();
  function report(key:string,message:string){if(message)errors.set(key,message);else errors.delete(key);options.error(errors.values().next().value??'');}
  function commit(key:string):Promise<boolean>{
    const current=options.current();
    const snapshot=current?{...current,values:{...current.values}}:null;
    if(!snapshot?.editable||!(key in snapshot.values))return Promise.resolve(false);
    const raw=String(options.draft[key]??'');
    const value=options.numeric(key)?Number(raw):raw;
    if(options.numeric(key)&&(!raw.trim()||!Number.isFinite(value))){report(key,options.invalidMessage());return Promise.resolve(false);}
    if(value===snapshot.values[key]||(value===0&&snapshot.values[key]===null)){report(key,'');return Promise.resolve(true);}
    const token=JSON.stringify([snapshot.documentId,snapshot.id,key,value]);
    const existing=pending.get(token);if(existing)return existing;
    let resolve!:(success:boolean)=>void;
    const promise=new Promise<boolean>(done=>{resolve=done;});
    pending.set(token,promise);report(key,'');
    const failed=(message:string)=>{const active=options.current();if(active?.id===snapshot.id&&active.documentId===snapshot.documentId)report(key,message);};
    try{
      // Invoke before yielding so toolbar Save observes the native in-flight edit.
      void options.edit(key,value,snapshot.revision).then(success=>{if(!success)failed(options.failure());resolve(success);},error=>{failed(error instanceof Error?error.message:String(error));resolve(false);}).finally(()=>pending.delete(token));
    }catch(error){failed(error instanceof Error?error.message:String(error));pending.delete(token);resolve(false);}
    return promise;
  }
  return Object.assign(commit,{reset(){errors.clear();options.error('');},retainKeys(keys:string[]){for(const key of errors.keys())if(!keys.includes(key))errors.delete(key);options.error(errors.values().next().value??'');}});
}
