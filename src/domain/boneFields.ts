import type { BoneView, RigEdit } from './project.ts';
import type { CompensationOptions } from './boneCompensation.ts';
import {equivalentWorldRotation,normalizeWorldRotation} from './boneRotationCompensation.ts';

export const boneTransformFields = ['x','y','rotation','length','scaleX','scaleY','shearX','shearY'] as const;
export type BoneField = 'name' | typeof boneTransformFields[number];
export type BoneTransformSpace = 'local'|'parent'|'world';
export type SetupBoneTransformAxes = Readonly<Record<'translate'|'rotate'|'scale',BoneTransformSpace>>;
// Vue's number inputs may produce numbers, including without v-model.number.
export type BoneDraft = Record<BoneField,string|number>;
export const boneFieldValue = (bone:BoneView,key:BoneField):string|number => bone[key] ?? (key==='scaleX'||key==='scaleY'?1:0);
export type BoneAffineCompensation = Readonly<{mode:'rotate'|'scale'|'shear';layers:CompensationOptions}>;
export function matchesAffineCompensation(field:BoneField, compensation?:BoneAffineCompensation):compensation is BoneAffineCompensation {
  if(!compensation||(!compensation.layers.bones&&!compensation.layers.images))return false;
  switch(compensation.mode){
    case 'rotate':return field==='rotation';
    case 'scale':return field==='scaleX'||field==='scaleY';
    case 'shear':return field==='shearX'||field==='shearY';
  }
}
interface Snapshot {
  bone:BoneView|null;documentId:number;revision:number;canEdit:boolean;
  worldPosition?:{x:number;y:number};localPosition?:{x:number;y:number};worldRotation?:number;
  parentPosition?:boolean;translationCompensation?:CompensationOptions;
  affineCompensation?:BoneAffineCompensation;
}
interface CommitOptions<Field extends BoneField> {
  draft:Record<Field,string|number>;current:()=>Snapshot;invalidMessage:()=>string;
  setError:(message:string)=>void;failureMessage:()=>string;
  edit:(edit:RigEdit,revision:number)=>Promise<boolean>;
  relative?:boolean;
}
function fieldMode(snapshot:Snapshot,key:BoneField){
  if(key==='x'||key==='y'){
    if(snapshot.worldPosition)return 'world';
    if(snapshot.localPosition)return 'local';
    return snapshot.parentPosition?'parent':undefined;
  }
  if(key==='rotation'&&snapshot.worldRotation!==undefined)return 'worldRotation';
  const affine=snapshot.affineCompensation;
  return matchesAffineCompensation(key,affine)?affine.mode:undefined;
}

const transformInputPattern=/^([+*/]?)([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)$/i;
function transformInput(raw:string|number,baseline:number,relativeEnabled:boolean){
  if(!relativeEnabled||typeof raw==='number')return {numeric:Number(raw),relative:false};
  const match=transformInputPattern.exec(raw.trim());
  if(!match)return {numeric:NaN,relative:false};
  const [,operator,operand]=match;
  const numeric=Number(operand);
  if(!operator)return {numeric,relative:false};
  if(!Number.isFinite(numeric)||!Number.isFinite(baseline))return {numeric:NaN,relative:true};
  switch(operator){
    case '+':return {numeric:operand?.startsWith('+')?NaN:baseline+numeric,relative:true};
    case '*':return {numeric:baseline*numeric,relative:true};
    default:return {numeric:numeric===0?NaN:baseline/numeric,relative:true};
  }
}

export function createBoneFieldCommitter<Field extends BoneField>(options:CommitOptions<Field>){
  const pending=new Map<string,Promise<boolean>>();
  function commit(key:Field):Promise<boolean>{
    const snapshot=options.current();
    const {bone,documentId,revision,canEdit,worldPosition,localPosition,worldRotation}=snapshot;
    if(!bone||!canEdit)return Promise.resolve(false);
    const raw=options.draft[key];
    const axis=key==='x'?'x':key==='y'?'y':null;
    const mode=fieldMode(snapshot,key);
    const affine=mode==='rotate'||mode==='scale'||mode==='shear';
    const useAffineCompensation=affine||mode==='worldRotation';
    const compensation=useAffineCompensation?snapshot.affineCompensation?.layers:snapshot.translationCompensation;
    const compensateBones=!!mode&&compensation?.bones===true;
    const compensateImages=!!mode&&compensation?.images===true;
    const preciseF32=mode==='parent'||affine;
    const authoredValue=boneFieldValue(bone,key);
    const projectedPosition=worldPosition??localPosition;
    const currentValue=projectedPosition&&axis?projectedPosition[axis]:mode==='worldRotation'?worldRotation:preciseF32?Math.fround(Number(authoredValue)):authoredValue;
    const {numeric,relative}=transformInput(raw,Number(currentValue),key!=='name'&&options.relative===true);
    const value=key==='name'?String(raw):mode==='worldRotation'?normalizeWorldRotation(numeric):preciseF32?Math.fround(numeric):numeric;
    if(key!=='name'&&(!String(raw).trim()||!Number.isFinite(value))){options.setError(options.invalidMessage());return Promise.resolve(false);}
    const unchangedRotation=mode==='worldRotation'&&worldRotation!==undefined&&equivalentWorldRotation(Number(value),worldRotation);
    if(value===currentValue||unchangedRotation){
      if(relative||mode==='worldRotation'||mode==='local')options.draft[key]=String(currentValue);
      options.setError('');
      return Promise.resolve(true);
    }
    const token=mode?`${documentId}:${revision}:${bone.id}:${key}:${mode}:${value}:${compensateBones}:${compensateImages}`:`${documentId}:${bone.id}:${key}:${value}`;
    const existing=pending.get(token);
    if(existing){
      if(relative)options.draft[key]=String(value);
      return existing;
    }
    let resolve!:(value:boolean)=>void;
    const result=new Promise<boolean>(done=>{resolve=done;});
    // Native busy/disabled changes can synchronously blur the same field.
    pending.set(token,result);
    // A working Animate pose can update before Enter's follow-up blur.
    if(relative)options.draft[key]=String(value);
    options.setError('');
    const failed=(message:string)=>{
      const current=options.current();
      if(current.documentId!==documentId||current.bone?.id!==bone.id)return;
      if(mode){
        const currentCompensation=useAffineCompensation?current.affineCompensation?.layers:current.translationCompensation;
        if(!current.canEdit||current.revision!==revision||fieldMode(current,key)!==mode||
          !!currentCompensation?.bones!==compensateBones||!!currentCompensation?.images!==compensateImages)return;
      }
      options.setError(message);
    };
    try{
      // Start synchronously: Save must see the store's in-flight field edit.
      const flags={...(compensateBones?{compensateBones}:{}),...(compensateImages?{compensateImages}:{})};
      let edit:RigEdit;
      if(mode==='world'&&axis){
        edit={type:'setBoneWorldPosition',id:bone.id,axis,position:Number(value),...flags};
      }else if(mode==='parent'&&axis){
        edit={type:'setBoneParentPosition',id:bone.id,[axis]:Number(value),...flags};
      }else if(mode==='local'&&axis){
        edit={type:'setBoneLocalPosition',id:bone.id,[axis]:Number(value),...flags};
      }else if(mode==='worldRotation'){
        edit={type:'setBoneWorldRotation',id:bone.id,angle:Number(value),...flags};
      }else if(mode==='rotate'){
        edit={type:'rotateBoneWithCompensation',id:bone.id,mode:'localAbsolute',angle:Number(value),compensateBones,compensateImages};
      }else if(mode==='scale'){
        const scaleAxis=key==='scaleX'?'x':'y';
        edit={type:'scaleBoneWithCompensation',id:bone.id,mode:'localAbsolute',[scaleAxis]:Number(value),compensateBones,compensateImages};
      }else if(mode==='shear'){
        const shearAxis=key==='shearX'?'x':'y';
        edit={type:'shearBoneWithCompensation',id:bone.id,mode:'localAbsolute',axis:shearAxis,angle:Number(value),compensateBones,compensateImages};
      }else{
        edit={...bone,[key]:value,type:'update'};
      }
      void options.edit(edit,revision).then(success=>{
        if(!success)failed(options.failureMessage());resolve(success);
      },error=>{failed(error instanceof Error?error.message:String(error));resolve(false);}).finally(()=>pending.delete(token));
    }catch(error){failed(error instanceof Error?error.message:String(error));pending.delete(token);resolve(false);}
    return result;
  }
  return commit;
}
