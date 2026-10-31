import type { BoneView, RigEdit } from './project.ts';

export const boneTransformFields = ['x','y','rotation','length','scaleX','scaleY','shearX','shearY'] as const;
export type BoneField = 'name' | typeof boneTransformFields[number];
// Vue's number inputs may produce numbers, including without v-model.number.
export type BoneDraft = Record<BoneField,string|number>;
export const boneFieldValue = (bone:BoneView,key:BoneField):string|number => bone[key] ?? (key==='scaleX'||key==='scaleY'?1:0);
interface Snapshot {bone:BoneView|null;documentId:number;revision:number;canEdit:boolean}
interface CommitOptions {
  draft:BoneDraft;current:()=>Snapshot;invalidMessage:()=>string;
  setError:(message:string)=>void;failureMessage:()=>string;
  edit:(edit:RigEdit,revision:number)=>Promise<boolean>;
}

export function createBoneFieldCommitter(options:CommitOptions){
  const pending=new Map<string,Promise<boolean>>();
  function commit(key:BoneField):Promise<boolean>{
    const {bone,documentId,revision,canEdit}=options.current();
    if(!bone||!canEdit)return Promise.resolve(false);
    const value=key==='name'?String(options.draft.name):Number(options.draft[key]);
    if(key!=='name'&&(!String(options.draft[key]).trim()||!Number.isFinite(value))){options.setError(options.invalidMessage());return Promise.resolve(false);}
    if(value===boneFieldValue(bone,key)){options.setError('');return Promise.resolve(true);}
    const token=`${documentId}:${bone.id}:${key}:${value}`,existing=pending.get(token);
    if(existing)return existing;
    let resolve!:(value:boolean)=>void;
    const result=new Promise<boolean>(done=>{resolve=done;});
    // Native busy/disabled changes can synchronously blur the same field.
    pending.set(token,result);options.setError('');
    const failed=(message:string)=>{const current=options.current();if(current.documentId===documentId&&current.bone?.id===bone.id)options.setError(message);};
    try{
      // Start synchronously: Save must see the store's in-flight field edit.
      void options.edit({...bone,[key]:value,type:'update'},revision).then(success=>{
        if(!success)failed(options.failureMessage());resolve(success);
      },error=>{failed(error instanceof Error?error.message:String(error));resolve(false);}).finally(()=>pending.delete(token));
    }catch(error){failed(error instanceof Error?error.message:String(error));pending.delete(token);resolve(false);}
    return result;
  }
  return commit;
}
