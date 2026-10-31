import type {BoneView} from './project.ts';
export function orderedIkMembers(bones:readonly BoneView[],ids:readonly number[]):number[]|null{
  if(ids.length<1||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!bones.some(b=>b.id===id)))return null;
  if(ids.length===1)return[ids[0]!];
  const a=bones.find(b=>b.id===ids[0])!,b=bones.find(b=>b.id===ids[1])!;
  return b.parent===a.id?[a.id,b.id]:a.parent===b.id?[b.id,a.id]:null;
}
/** An IK target must not move as a descendant of any constrained member. */
export function canTargetIk(bones:readonly BoneView[],ids:readonly number[],target:number):boolean{
  if(!orderedIkMembers(bones,ids))return false;
  const byId=new Map(bones.map(b=>[b.id,b])),seen=new Set<number>();
  let id:number|null=target;
  while(id!==null){if(ids.includes(id)||seen.has(id)||!byId.has(id))return false;seen.add(id);id=byId.get(id)!.parent;}
  return true;
}
