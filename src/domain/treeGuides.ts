/** Presentation for already-filtered Tree rows; never reads authored ownership. */
export interface GuideRow {key:string;parent:string|null}
export interface TreeGuide {
  depth:number;
  /** Columns continuing to a later visible sibling of an ancestor. */
  continuations:number[];
  /** The current row's elbow column, absent for an ungrouped root. */
  elbow:number|null;
  last:boolean;
}
export function treeGuides(rows:readonly GuideRow[], group?:string):Map<string,TreeGuide> {
  const parents=new Map(rows.map(row=>[row.key,row.parent??group??null]));
  if(group)parents.set(group,null);
  const lastChildren=new Map<string|null,string>();
  for(const row of rows)lastChildren.set(parents.get(row.key)??null,row.key);
  const result=new Map<string,TreeGuide>();
  for(const row of rows){
    const ancestors:string[]=[],seen=new Set([row.key]);
    let parent=parents.get(row.key)??null;
    while(parent!==null&&parents.has(parent)&&!seen.has(parent)){
      ancestors.unshift(parent);seen.add(parent);parent=parents.get(parent)??null;
    }
    const depth=ancestors.length,continuations:number[]=[];
    // The first ancestor is an unconnected root/header, not a sibling branch.
    ancestors.slice(1).forEach((key,index)=>{
      if(lastChildren.get(parents.get(key)??null)!==key)continuations.push(index);
    });
    result.set(row.key,{depth,continuations,elbow:depth?depth-1:null,last:lastChildren.get(parents.get(row.key)??null)===row.key});
  }
  return result;
}
