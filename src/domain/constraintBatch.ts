import type {ConstraintView} from './project.ts';

export const physicsBatchFields=['x','y','rotate','scaleX','shearX','limit','step','inertia','strength','damping','mass','wind','gravity','mix'] as const;
export const physicsBatchGlobals=['inertia','strength','damping','mass','wind','gravity','mix'] as const;
export const ikBatchFields=['mix','softness','bendPositive','compress','stretch'] as const;
export const transformBatchFlags=['localSource','localTarget','additive','clamp'] as const;
type Channel=0|1|2|3|4|5;
export type ConstraintBatchField=`physics.${typeof physicsBatchFields[number]}`|`physics.global:${typeof physicsBatchGlobals[number]}`|`ik.${typeof ikBatchFields[number]}`|`transform.${typeof transformBatchFlags[number]}`|`transform.offset:${Channel}`|`transform.mix:${Channel}`;

/** One authored field only. Identity, references, mappings and order cannot be
 * accidentally copied from the first member of a multiple selection. */
export function batchField(kind:ConstraintView['type'],field:string,value:number|boolean):ConstraintBatchField|null{
 let numeric=false,boolean=false,valid=false;
 if(kind==='physics'){
  numeric=(physicsBatchFields as readonly string[]).includes(field);
  boolean=field.startsWith('global:')&&(physicsBatchGlobals as readonly string[]).includes(field.slice(7));valid=numeric||boolean;
 }else if(kind==='ik'){
  valid=(ikBatchFields as readonly string[]).includes(field);numeric=field==='mix'||field==='softness';boolean=valid&&!numeric;
 }else{
  numeric=/^(offset|mix):[0-5]$/.test(field);boolean=(transformBatchFlags as readonly string[]).includes(field);valid=numeric||boolean;
 }
 if(!valid||numeric&&(typeof value!=='number'||!Number.isFinite(value))||boolean&&typeof value!=='boolean')return null;
 return `${kind}.${field}` as ConstraintBatchField;
}
export function batchFieldValue(c:ConstraintView,field:string):number|boolean|null|undefined{
 if(c.type==='physics'){
  if(field.startsWith('global:')){const key=field.slice(7);return (physicsBatchGlobals as readonly string[]).includes(key)?c.globals[key as typeof physicsBatchGlobals[number]]:undefined;}
  return (physicsBatchFields as readonly string[]).includes(field)?c[field as typeof physicsBatchFields[number]]??null:undefined;
 }
 if(c.type==='ik')return (ikBatchFields as readonly string[]).includes(field)?c[field as typeof ikBatchFields[number]]:undefined;
 if((transformBatchFlags as readonly string[]).includes(field))return c[field as typeof transformBatchFlags[number]];
 const match=/^(offset|mix):([0-5])$/.exec(field);return match?(match[1]==='offset'?c.offsets:c.mix)[Number(match[2])]:undefined;
}
export function sameBatchValue(left:number|boolean|null|undefined,right:number|boolean|null|undefined):boolean{
 return typeof left==='number'&&typeof right==='number'?Object.is(Math.fround(left),Math.fround(right)):Object.is(left,right);
}
