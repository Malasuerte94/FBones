export interface BoneRenamePreviewOptions {
  find:string;
  replacement:string;
  matchCase:boolean;
  firstOccurrence:boolean;
  scopeIds?:ReadonlySet<number>;
  excludedIds?:ReadonlySet<number>;
}

export interface BoneRenamePreviewRow {
  id:number;
  name:string;
  replacement:string;
  included:boolean;
  issue:'empty'|'tooLong'|'duplicate'|null;
}

interface BoneRenamePreview {
  rows:BoneRenamePreviewRow[];
  renames:{id:number;name:string}[];
  valid:boolean;
}

const maxNameBytes=1024;
const utf8=new TextEncoder();
// Rust str::trim uses Unicode White_Space. JavaScript trim also drops BOMs and keeps NEL.
const trimBoneName=(name:string)=>name.replace(/^\p{White_Space}+|\p{White_Space}+$/gu,'');

export function buildBoneRenamePreview(
  bones:readonly {id:number;name:string}[],
  options:BoneRenamePreviewOptions,
):BoneRenamePreview {
  const {find,replacement,matchCase,firstOccurrence,scopeIds,excludedIds}=options;
  if(!find)return {rows:[],renames:[],valid:false};
  const literal=find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp(literal,`u${matchCase?'':'i'}${firstOccurrence?'':'g'}`);
  const rows:BoneRenamePreviewRow[]=[];
  const finalNames=new Map<string,number>();

  for(const {id,name} of bones){
    const changed=scopeIds&&!scopeIds.has(id)?name:name.replace(pattern,()=>replacement);
    const next=changed===name?name:trimBoneName(changed);
    let finalName=name;
    if(changed!==name&&next!==trimBoneName(name)){
      const included=!excludedIds?.has(id);
      let issue:BoneRenamePreviewRow['issue']=null;
      if(!next)issue='empty';
      else if(next.length>maxNameBytes||utf8.encode(next).byteLength>maxNameBytes)issue='tooLong';
      rows.push({id,name,replacement:next,included,issue});
      if(included)finalName=next;
    }
    finalNames.set(finalName,(finalNames.get(finalName)??0)+1);
  }

  const renames:BoneRenamePreview['renames']=[];
  let valid=true;
  for(const row of rows){
    if(!row.included)continue;
    if(!row.issue&&(finalNames.get(row.replacement)??0)>1)row.issue='duplicate';
    if(row.issue)valid=false;
    else renames.push({id:row.id,name:row.replacement});
  }
  valid=valid&&renames.length>0;
  return {rows,renames:valid?renames:[],valid};
}
