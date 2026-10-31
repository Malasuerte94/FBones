import type {BoneView,ConstraintView,ProjectSummary} from '../project.ts';
export type SolveScene=Pick<ProjectSummary,'bones'|'constraints'>;
export interface LocalPose {x:number;y:number;rotation:number;scaleX:number;scaleY:number;shearX:number;shearY:number}
export interface Affine {x:number;y:number;a:number;b:number;c:number;d:number}
export interface BoneFrame {id:number;authored:LocalPose;applied:LocalPose;world:Affine}
export interface Evaluation {bones:BoneFrame[]}
export type StepMode={type:'reset'|'update';time:number}|{type:'pose'|'none'};
export type SolveErrorCode='InvalidGraph'|'InvalidPoseCount'|'NonFinite'|'SingularTransform'|'InvalidConstraint'|'InvalidTime'|'StepLimit';
export class SolveError extends Error {readonly code:SolveErrorCode;constructor(code:SolveErrorCode){super(`Constraint evaluation: ${code}`);this.code=code;this.name='SolveError';}}
export interface InternalScene {bones:readonly BoneView[];parents:(number|null)[];constraints:readonly ConstraintView[];indices:Map<number,number>}
export function fail(code:SolveErrorCode):never{throw new SolveError(code);}
export const channels=['rotate','x','y','scaleX','scaleY','shearY'] as const;
