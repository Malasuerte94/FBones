/** Ephemeral render snapshots. Never feed evaluated channels into saved authoring data. */
import type {BoneView} from './project.ts';
import type {Affine} from './solve/types.ts';
export interface EvaluatedFrame {readonly id:number;readonly world:Readonly<Affine>}
export type EvaluatedBoneView=BoneView&{readonly evaluatedWorld:Readonly<Affine>};

/** Accepts both pure evaluator frames and native f32 geometry-boundary frames.
 * A complete ID mapping prevents combining snapshots from different revisions.
 * Finite singular matrices are valid render poses; this helper never inverts.
 */
export function withEvaluatedPose(bones:readonly BoneView[],frames:readonly EvaluatedFrame[]):EvaluatedBoneView[]{
 if(bones.length!==frames.length)throw new Error('Evaluated pose does not match the current bones.');
 const expected=new Set(bones.map(b=>b.id));
 if(expected.size!==bones.length)throw new Error('Duplicate authored bone identity.');
 const matrices=new Map<number,Readonly<Affine>>();
 for(const frame of frames){
  if(!expected.has(frame.id)||matrices.has(frame.id))throw new Error('Evaluated pose has an unknown or duplicate bone identity.');
  const {x,y,a,b,c,d}=frame.world;
  if(![x,y,a,b,c,d].every(Number.isFinite))throw new Error('Evaluated pose contains a nonfinite matrix.');
  matrices.set(frame.id,Object.freeze({x,y,a,b,c,d}));
 }
 return bones.map(bone=>({...bone,evaluatedWorld:matrices.get(bone.id)!}));
}
