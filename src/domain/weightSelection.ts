/** Transient editor selection. It never becomes project/attachment wire data. */
export interface WeightSelection {
  vertices:number[];
  active:number|null;
  bones:number[];
  anchor:number|null;
  vertexCount:number;
  locks:number[];
}
export function emptyWeightSelection(vertexCount=0):WeightSelection{return{vertices:[],active:null,bones:[],anchor:null,vertexCount,locks:[]};}
export function validWeightSelection(value:WeightSelection|undefined,count:number,bones:readonly number[]):WeightSelection{
  const previous=value??emptyWeightSelection(count),allowed=new Set(bones);
  const vertices=previous.vertexCount===count?previous.vertices.filter(i=>Number.isSafeInteger(i)&&i>=0&&i<count):[];
  return{vertices,active:vertices.includes(previous.active??-1)?previous.active:vertices.at(-1)??null,bones:previous.bones.filter(id=>allowed.has(id)),anchor:allowed.has(previous.anchor??-1)?previous.anchor:null,vertexCount:count,locks:previous.locks.filter(id=>allowed.has(id))};
}
export function withWeightVertices(value:WeightSelection,ids:readonly number[],active:number|null,count:number):WeightSelection{
  const vertices=[...new Set(ids)].filter(i=>Number.isSafeInteger(i)&&i>=0&&i<count).sort((a,b)=>a-b);
  return{...value,vertices,active:vertices.includes(active??-1)?active:vertices.at(-1)??null,vertexCount:count};
}
/** The range follows the actual visible influence rows, independently of Bind. */
export function withWeightBone(value:WeightSelection,id:number,ordered:readonly number[],modifiers:{toggle?:boolean;shift?:boolean}={}):WeightSelection{
  if(!ordered.includes(id))return value;
  const selected=new Set(value.bones.filter(bone=>ordered.includes(bone)));
  if(modifiers.shift&&value.anchor!==null&&ordered.includes(value.anchor)){
    if(!modifiers.toggle)selected.clear();
    const a=ordered.indexOf(value.anchor),b=ordered.indexOf(id);
    for(const bone of ordered.slice(Math.min(a,b),Math.max(a,b)+1))selected.add(bone);
    return{...value,bones:ordered.filter(bone=>selected.has(bone))};
  }
  if(modifiers.toggle){if(selected.has(id))selected.delete(id);else selected.add(id);}
  else{selected.clear();selected.add(id);}
  return{...value,bones:ordered.filter(bone=>selected.has(bone)),anchor:id};
}
