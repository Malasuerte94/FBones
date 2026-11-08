import type {ProjectSummary,SlotView} from './project.ts';

const identity=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
/** Session ownership, separate from image/evaluation generation. Tagged fallback
 * keeps older fixtures conservative without equating the two ID domains. */
export function logicalDocumentKey(project:ProjectSummary|null):string{
 if(!project)return 'none';
 return identity(project.logicalDocumentId)?`logical:${project.logicalDocumentId}`:`resource:${project.documentId}`;
}
function exact(a:unknown,b:unknown):boolean{
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((item,index)=>exact(item,b[index]));
 const left=Object.keys(a).sort(),right=Object.keys(b).sort();
 return left.length===right.length&&left.every((key,index)=>key===right[index]&&exact((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]));
}
function authoredSlot(slot:SlotView){
 const {imageAvailable:_,attachments,...fields}=slot;
 return{...fields,...(attachments===undefined?{}:{attachments:attachments.map(attachment=>{
  const{imageAvailable:__,sequenceAvailableFrames:___,...authored}=attachment;return authored;
 })})};
}
function authored(project:ProjectSummary){
 const{documentId:_,revision:__,dirty:___,canSave:____,canCopy:_____,canUndo:______,canRedo:_______,library:________,slots,...fields}=project;
 return{...fields,slots:slots.map(authoredSlot)};
}
/** Only known image-resource callbacks use this predicate. A stale edit/Save or
 * unrelated New/Open replacement never gains publication authority from it. */
export function validImageResourceUpdate(before:ProjectSummary,next:ProjectSummary):boolean{
 return !before.inspectionOnly&&!next.inspectionOnly&&identity(before.logicalDocumentId)&&next.logicalDocumentId===before.logicalDocumentId&&
  Number.isSafeInteger(before.documentId)&&Number.isSafeInteger(next.documentId)&&next.documentId===before.documentId+1&&
  Number.isSafeInteger(before.revision)&&Number.isSafeInteger(next.revision)&&next.revision===before.revision+1&&exact(authored(before),authored(next));
}
