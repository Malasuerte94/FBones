import type {AttachmentView,ProjectSummary} from './project.ts';

export interface ViewportSelectionPathItem {
  kind:'bone'|'slot'|AttachmentView['type'];
  id:number;
  name:string;
}

export function selectionHierarchy(
  project:Pick<ProjectSummary,'bones'|'slots'|'sceneEditing'>,
  target:{kind:'bone'|'slot'|'attachment';id:number},
):ViewportSelectionPathItem[] {
  const path:ViewportSelectionPathItem[]=[];
  let boneId:number|null=target.id;

  if(target.kind==='slot'){
    const slot=project.slots.find(slot=>slot.id===target.id);
    if(!slot)return [];
    path.push({kind:'slot',id:slot.id,name:slot.name});
    boneId=slot.bone;
  }else if(target.kind==='attachment'){
    if(!project.sceneEditing)return [];
    const slot=project.slots.find(slot=>slot.attachments?.some(attachment=>attachment.id===target.id));
    const attachment=slot?.attachments?.find(attachment=>attachment.id===target.id);
    if(!slot||!attachment||attachment.slot!==slot.id)return [];
    path.push({kind:attachment.type,id:attachment.id,name:attachment.name});
    path.push({kind:'slot',id:slot.id,name:slot.name});
    boneId=slot.bone;
  }

  const bonesById=new Map(project.bones.map(bone=>[bone.id,bone]));
  const visited=new Set<number>();
  while(boneId!==null){
    const bone=bonesById.get(boneId);
    if(!bone||visited.has(boneId))return [];
    visited.add(boneId);
    path.push({kind:'bone',id:bone.id,name:bone.name});
    boneId=bone.parent;
  }
  return path.reverse();
}
