/** Tree filters project existing identities; they never change ownership or activation. */
export type TreeKind = 'bone' | 'slot' | 'attachment' | 'constraint';
export interface TreeFilterState { bone:boolean; slot:boolean; attachment:boolean; constraint:boolean }
export interface TreeBoneNode { id:number; parent:number|null; name:string }
export interface TreeAttachmentNode { id:number; name:string; type?:'region'|'mesh'|'clipping' }
export interface TreeSlotNode { id:number; bone:number; name:string; attachments:readonly TreeAttachmentNode[] }
export interface TreeConstraintNode { id:number; name:string }
export interface TreeProjectionInput {
  bones:readonly TreeBoneNode[];
  /** Canonical setup draw order: back to front. Flat Tree displays front first. */
  slots:readonly TreeSlotNode[];
  constraints?:readonly TreeConstraintNode[];
}
export interface ProjectTreeRow {
  key:string; kind:TreeKind; id:number; name:string; depth:number; parent:string|null;
  boneId:number|null; slotId:number|null; attachmentType?:TreeAttachmentNode['type'];
  hasChildren:boolean;
}
export const allTreeKinds = ():TreeFilterState => ({bone:true,slot:true,attachment:true,constraint:true});
export const treeKey = (kind:TreeKind,id:number) => `${kind}:${id}`;

export function projectTree(input:TreeProjectionInput, filters:TreeFilterState,
  options:{search?:string;collapsed?:ReadonlySet<string>}={}):ProjectTreeRow[] {
  const rows:ProjectTreeRow[]=[];
  const append=(kind:TreeKind,id:number,name:string,parent:string|null,boneId:number|null,
    slotId:number|null,attachmentType?:TreeAttachmentNode['type'])=>{
    const row:ProjectTreeRow={key:treeKey(kind,id),kind,id,name,parent,boneId,slotId,depth:0,hasChildren:false};
    if(attachmentType!==undefined)row.attachmentType=attachmentType;
    rows.push(row);return row.key;
  };
  function slotRows(slot:TreeSlotNode,parent:string|null){
    const slotKey=filters.slot?append('slot',slot.id,slot.name,parent,slot.bone,slot.id):parent;
    if(filters.attachment)for(const attachment of slot.attachments)
      append('attachment',attachment.id,attachment.name,slotKey,slot.bone,slot.id,attachment.type);
  }
  if(filters.bone){
    const byId=new Map(input.bones.map(bone=>[bone.id,bone])),visited=new Set<number>();
    function visit(bone:TreeBoneNode,parent:string|null){
      if(visited.has(bone.id))return;visited.add(bone.id);
      const key=append('bone',bone.id,bone.name,parent,bone.id,null);
      for(const slot of input.slots)if(slot.bone===bone.id)slotRows(slot,key);
      for(const child of input.bones)if(child.parent===bone.id)visit(child,key);
    }
    for(const bone of input.bones)if(bone.parent===null||!byId.has(bone.parent))visit(bone,null);
    // Inspection data must not hang the view if it has an invalid/cyclic parent graph.
    for(const bone of input.bones)if(!visited.has(bone.id))visit(bone,null);
  }else{
    for(const slot of [...input.slots].reverse())slotRows(slot,null);
  }
  if(filters.constraint)for(const constraint of input.constraints??[])
    append('constraint',constraint.id,constraint.name,null,null,null);
  const byKey=new Map(rows.map(row=>[row.key,row]));
  for(const row of rows){let parent=row.parent;while(parent!==null){row.depth++;parent=byKey.get(parent)?.parent??null;}}
  const query=options.search?.trim().toLocaleLowerCase()??'';
  let eligible=rows;
  if(query){
    const include=new Set<string>();
    for(const row of rows)if(row.name.toLocaleLowerCase().includes(query)){
      let key:string|null=row.key;while(key!==null){include.add(key);key=byKey.get(key)?.parent??null;}
    }
    eligible=rows.filter(row=>include.has(row.key));
  }
  const parentKeys=new Set(eligible.map(row=>row.parent));
  for(const row of eligible)row.hasChildren=parentKeys.has(row.key);
  if(!query&&options.collapsed?.size)eligible=eligible.filter(row=>{
    let parent=row.parent;while(parent!==null){if(options.collapsed!.has(parent))return false;parent=byKey.get(parent)?.parent??null;}return true;
  });
  return eligible;
}
