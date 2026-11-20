import {computed} from 'vue';
import type {SceneFieldValue} from '../domain/sceneFields';
import {useWorkspace} from '../stores/workspace';
import {useSceneFieldEditor} from './useSceneFieldEditor';

export const attachmentTransformFields = ['x','y','rotation','scaleX','scaleY'] as const;

export function useAttachmentTransformEditor(invalidMessage:()=>string) {
  const w=useWorkspace();
  const target=computed(()=>{
    const attachment=w.selectedAttachment;
    if(w.editorMode!=='setup'||!w.treeFilters.attachment||attachment?.type!=='region'||!attachment.region)return null;
    if(w.sceneEditing&&(w.selectedAttachmentIds.length!==1||w.selectedAttachmentIds[0]!==attachment.id))return null;
    return attachment;
  });
  const targetId=computed(()=>target.value?.id??null);
  const canEdit=computed(()=>!!target.value&&w.canEdit&&!w.busy&&!w.openingProject&&!w.traceOpen&&!w.pruneOpen&&
    !w.clippingDraft&&!w.meshOutlineDraft&&!w.parentPicking&&!w.newDialog&&!w.discardDialog&&w.librarySelection===null);
  const editor=useSceneFieldEditor({
    current:()=>{
      const attachment=target.value,region=attachment?.region,project=w.project;
      if(!attachment||!region||!project)return null;
      return {id:attachment.id,documentId:project.documentId,revision:project.revision,editable:canEdit.value,
        values:{x:region.x,y:region.y,rotation:region.rotation,scaleX:region.scaleX,scaleY:region.scaleY}};
    },
    numeric:()=>true,
    invalidMessage,
    edit:applyField,
  });
  async function applyField(key:string,value:SceneFieldValue,revision:number):Promise<boolean>{
    const id=targetId.value,project=w.project;
    const field=attachmentTransformFields.find(field=>field===key);
    if(id===null||!field||typeof value!=='number'||!project||project.revision!==revision||!canEdit.value)return false;
    const submitted=editor.draft[field];
    const success=await w.editAttachmentTransform({[field]:value},revision,id);
    const after=w.project,region=target.value?.region;
    if(success&&after?.documentId===project.documentId&&(after.revision===revision||after.revision===revision+1)&&
      targetId.value===id&&region&&editor.draft[field]===submitted){
      editor.draft[field]=String(region[field]);
    }
    return success;
  }
  return {...editor,targetId,canEdit};
}

export type AttachmentTransformEditor=ReturnType<typeof useAttachmentTransformEditor>;
