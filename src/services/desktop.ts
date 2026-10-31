import { invokeNative as invoke, desktop } from './bridge.ts';
import {preserveDeformOffsetBits,preserveTemporaryDeformZeros} from '../domain/deformTransport.ts';
import {preserveConstraintKeyBits,preserveEventKeyBits,preserveEventPatchBits,preserveTemporaryConstraintZeros} from '../domain/constraintTransport.ts';
import type {ConstraintPose} from '../domain/animationConstraints.ts';
import { draftSummary, validProjectName, type ProjectSummary, type RigEdit, type TraceOptions, type TracePreview, type EvaluationSnapshot, type EvaluationMode, type ReplayMotion, type ReplayLocalPose } from '../domain/project.ts';

export { desktop };
let previewProject: ProjectSummary | null = null;

export async function getProject(): Promise<ProjectSummary | null> {
  return desktop ? invoke('get_project') : previewProject;
}
export async function createProject(name: string, discardChanges: boolean): Promise<ProjectSummary> {
  if (desktop) return invoke('create_project', { name, discardChanges });
  if (!validProjectName(name)) throw new Error('Enter a valid project name.');
  if (previewProject?.dirty && !discardChanges) throw new Error('The current project has unsaved changes.');
  previewProject = { ...draftSummary(name), canSave: false, canCopy: false };
  return previewProject;
}
export async function openProject(discardChanges: boolean): Promise<ProjectSummary | null> {
  if (!desktop) throw new Error('File operations are available in the desktop application.');
  return invoke('open_project', { discardChanges });
}
export async function closeProject(discardChanges: boolean): Promise<void> {
  if (desktop) return invoke('close_project', { discardChanges });
  if (previewProject?.dirty && !discardChanges) throw new Error('The current project has unsaved changes.');
  previewProject = null;
}
export async function saveProject(saveAs = false): Promise<ProjectSummary | null> {
  if (!desktop) throw new Error('File operations are available in the desktop application.');
  return invoke('save_project', { saveAs });
}
export async function editRig(edit: RigEdit, expectedRevision: number,poseEpoch?:number): Promise<ProjectSummary> {
  if (!desktop) throw new Error('Bone editing is available in the desktop application.');
  if(edit.type==='setAnimationDeformKeys')edit={...edit,keys:edit.keys.map(preserveDeformOffsetBits)};
  else if(edit.type==='setAnimationKeyBatch'&&edit.deformKeys)edit={...edit,deformKeys:edit.deformKeys.map(preserveDeformOffsetBits)};
  if(edit.type==='setAnimationConstraintKeys')edit={...edit,keys:edit.keys.map(preserveConstraintKeyBits)};
  else if(edit.type==='setAnimationEventKeys')edit={...edit,keys:edit.keys.map(preserveEventKeyBits)};
  else if(edit.type==='updateEvent')edit=preserveEventPatchBits(edit);
  else if(edit.type==='setAnimationKeyBatch')edit={...edit,...(edit.constraintKeys?{constraintKeys:edit.constraintKeys.map(preserveConstraintKeyBits)}:{}),...(edit.eventKeys?{eventKeys:edit.eventKeys.map(preserveEventKeyBits)}:{})};
  return invoke('edit_rig', { edit, expectedRevision,...(poseEpoch===undefined?{}:{poseEpoch}) });
}
export async function evaluateProject(expectedRevision:number,time:number,mode:EvaluationMode='replay',motion?:ReplayMotion,fromPoseEpoch?:number,animationId?:number,animationPose?:ReplayLocalPose[],geometry?:{constraintPose?:ConstraintPose[];deformTargets?:number[];drawOrderPose?:number[];deformPose?:{attachment:number;offsets:number[];negativeZeroIndices?:number[]}[]}):Promise<EvaluationSnapshot>{return invoke('evaluate_project',{expectedRevision,request:{mode,time,...(motion?{motion}:{}),...(fromPoseEpoch===undefined?{}:{fromPoseEpoch}),...(animationId===undefined?{}:{animationId}),...(animationPose===undefined?{}:{animationPose}),...geometry,...(geometry?.constraintPose?{constraintPose:geometry.constraintPose.map(preserveTemporaryConstraintZeros)}:{}),...(geometry?.deformPose?{deformPose:geometry.deformPose.map(preserveTemporaryDeformZeros)}:{})}});}
export async function importImage(bone: number, expectedRevision: number): Promise<ProjectSummary | null> {
  if (!desktop) throw new Error('Image import is available in the desktop application.');
  return invoke('import_image', { bone, expectedRevision });
}
export async function imageData(documentId: number, name: string): Promise<string> {
  if (!desktop) throw new Error('Image resources are available in the desktop application.');
  return invoke('get_image_data', { documentId, name });
}

export async function chooseImagesFolder(expectedRevision:number):Promise<ProjectSummary|null>{return invoke('choose_images_folder',{expectedRevision});}
export async function chooseAudioFolder(expectedRevision:number):Promise<ProjectSummary|null>{return invoke('choose_audio_folder',{expectedRevision});}
export async function audioData(documentId:number,key:string):Promise<string>{return invoke('get_audio_data',{documentId,key});}
export async function placeImage(key:string,bone:number,x:number,y:number,expectedRevision:number):Promise<ProjectSummary>{return invoke('place_image',{key,bone,x,y,expectedRevision});}
export async function placeImages(keys:string[],bone:number,x:number,y:number,expectedRevision:number,poseEpoch?:number):Promise<ProjectSummary>{return invoke('place_images',{keys,bone,x,y,expectedRevision,...(poseEpoch===undefined?{}:{poseEpoch})});}
export async function placeAttachments(keys:string[],slot:number,expectedRevision:number):Promise<ProjectSummary>{return invoke('place_attachments',{keys,slot,expectedRevision});}

export async function refreshImagesFolder(expectedRevision:number):Promise<ProjectSummary>{return invoke('refresh_images_folder',{expectedRevision});}

export async function previewTrace(id:number,options:TraceOptions,expectedRevision:number):Promise<TracePreview>{return invoke('preview_trace',{id,options,expectedRevision});}
export async function applyTrace(id:number,options:TraceOptions,expectedRevision:number):Promise<ProjectSummary>{return invoke('apply_trace',{id,options,expectedRevision});}
export async function previewTraceAttachment(id:number,options:TraceOptions,expectedRevision:number,poseEpoch?:number):Promise<TracePreview>{return invoke('preview_trace_attachment',{id,options,expectedRevision,...(poseEpoch===undefined?{}:{poseEpoch})});}
export async function applyTraceAttachment(id:number,options:TraceOptions,expectedRevision:number,poseEpoch?:number):Promise<ProjectSummary>{return invoke('apply_trace_attachment',{id,options,expectedRevision,...(poseEpoch===undefined?{}:{poseEpoch})});}
