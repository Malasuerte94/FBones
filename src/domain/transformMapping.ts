import type {TransformProperty} from './project.ts';
export const transformProperties:readonly TransformProperty[]=['rotate','x','y','scaleX','scaleY','shearY'];
/** Mapping endpoints are unique within one source row. */
export function nextMappingProperty(used:readonly {property:TransformProperty}[]):TransformProperty|null{
  return transformProperties.find(property=>!used.some(endpoint=>endpoint.property===property))??null;
}
/** A membership change must not sort the retained first-target-sensitive list. */
export function retainedTransformMembers(previous:readonly number[],selected:readonly number[]):number[]{
  const remaining=new Set(selected);
  return [...previous.filter(id=>remaining.delete(id)),...remaining];
}
