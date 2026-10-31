import {reactive,watch} from 'vue';
import {useWorkspace} from '../stores/workspace';
import {boneFieldValue,boneTransformFields,createBoneFieldCommitter,type BoneDraft,type BoneField} from '../domain/boneFields';

export function useBoneFieldEditor(invalidMessage:()=>string){
  const w=useWorkspace();
  const draft=reactive<BoneDraft>({name:'',x:'',y:'',rotation:'',length:'',scaleX:'1',scaleY:'1',shearX:'0',shearY:'0'});
  function reset(){w.inspectorError='';const bone=w.selectedBone;if(bone)for(const field of ['name',...boneTransformFields] as const)draft[field]=String(boneFieldValue(bone,field));}
  watch(()=>[w.selectedId,w.selectedSlotId,w.project,w.editorMode,w.animationFrame,w.animationId,w.animationDraft],reset,{immediate:true});
  const commit=createBoneFieldCommitter({draft,current:()=>({bone:w.selectedBone,documentId:w.project?.documentId??-1,revision:w.project?.revision??-1,canEdit:w.canEdit}),invalidMessage,
    setError:message=>{w.inspectorError=message;if(message)w.showNotice(message,true);},failureMessage:()=>w.notice,edit:(edit,revision)=>w.editRig(edit,revision)});
  function enter(event:KeyboardEvent,field:BoneField){void commit(field);(event.target as HTMLInputElement).blur();}
  function escape(event:KeyboardEvent){reset();(event.target as HTMLInputElement).blur();}
  return {draft,commit,enter,escape};
}
export type BoneFieldEditor=ReturnType<typeof useBoneFieldEditor>;
