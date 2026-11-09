import type {TransformConstraintView,TransformProperty} from './project.ts';
export const transformProperties:readonly TransformProperty[]=['rotate','x','y','scaleX','scaleY','shearY'];
/** Match has a narrower supported profile than finite extended Setup mixes.
 * Include hidden lanes, matching the native guard without changing authoring. */
export function canMatchTransform(constraint:Pick<TransformConstraintView,'mix'>):boolean{
  return constraint.mix.length===6&&constraint.mix.every(value=>Number.isFinite(value)&&value>=0&&value<=1);
}
/** Mapping endpoints are unique within one source row. */
export function nextMappingProperty(used:readonly {property:TransformProperty}[]):TransformProperty|null{
  return transformProperties.find(property=>!used.some(endpoint=>endpoint.property===property))??null;
}
/** A membership change must not sort the retained first-target-sensitive list. */
export function retainedTransformMembers(previous:readonly number[],selected:readonly number[]):number[]{
  const remaining=new Set(selected);
  return [...previous.filter(id=>remaining.delete(id)),...remaining];
}
