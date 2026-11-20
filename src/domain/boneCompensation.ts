import type {BoneView,DenseBindingView,RegionView,RigEdit,SlotView} from './project.ts';
import {composeAffine,worldBones,type Affine} from './rig.ts';

export type CompensationOptions=Readonly<{bones:boolean;images:boolean}>;
export type CompensatedTranslation=Extract<RigEdit,{type:'translateBoneWithCompensation'|'setBoneParentPosition'|'setBoneLocalPosition'}>;
type Point={x:number;y:number};
export interface LocalTranslationAxes {boneId:number;position:Point;worldBasis:Affine}
const IDENTITY:Affine={a:1,b:0,c:0,d:1,worldX:0,worldY:0};
const RADIANS=Math.PI/180;
const WORLD_TOLERANCE=.001;

function translated(position:number,delta:number){
  const candidate=position+delta;
  if(!Number.isFinite(candidate)||Math.abs(candidate)>1_000_000)throw Error('The compensated translation exceeds supported coordinates.');
  const next=Math.fround(candidate);
  return next===position?position:next;
}

export function inverseDeterminant(owner:Affine){
  const scale=Math.max(Math.abs(owner.a),Math.abs(owner.b),Math.abs(owner.c),Math.abs(owner.d));
  const det=owner.a*owner.d-owner.b*owner.c;
  if(!Number.isFinite(det)||!(scale>0)||Math.abs(det)<=1e-12*scale*scale){
    throw Error('The compensated bone transform cannot be inverted.');
  }
  return det;
}

function inverseLinear(owner:Affine,x:number,y:number,coefficientsFirst=false){
  const det=inverseDeterminant(owner);
  return coefficientsFirst
    ? {x:(owner.d/det)*x+(-owner.c/det)*y,y:(-owner.b/det)*x+(owner.a/det)*y}
    : {x:(owner.d*x-owner.c*y)/det,y:(owner.a*y-owner.b*x)/det};
}

export function finiteAffine(owner:Affine){
  return [owner.a,owner.b,owner.c,owner.d,owner.worldX,owner.worldY].every(Number.isFinite);
}

function localProjection(worldBasis:Affine,x:number,y:number):Point{
  const projection=inverseLinear(worldBasis,x,y,true);
  if(!Number.isFinite(projection.x)||!Number.isFinite(projection.y)){
    throw Error('The projected Local coordinates are not finite.');
  }
  return projection;
}

export function localTranslationDisplacement(axes:LocalTranslationAxes,dx:number,dy:number):Point{
  return localProjection(axes.worldBasis,dx,dy);
}

function sinCosDegrees(angle:number,exactCardinals:boolean):[number,number]{
  // Exact authored cardinals must display and round-trip a zero coordinate.
  if(exactCardinals)switch(angle%360){
    case 0:return [0,1];
    case 90:case -270:return [1,0];
    case 180:case -180:return [0,-1];
    case 270:case -90:return [-1,0];
  }
  return [Math.sin(angle*RADIANS),Math.cos(angle*RADIANS)];
}

function authoredTranslationFrame(bones:readonly BoneView[],id:number,exactCardinals:boolean){
  const frames=new Map<number,Affine>();
  for(const bone of bones){
    const parent=bone.parent===null?IDENTITY:frames.get(bone.parent);
    if(!parent)throw Error('Invalid bone hierarchy.');
    // Use the authored f64 basis and omit any transient evaluated matrix.
    const [sinX,cosX]=sinCosDegrees(bone.rotation+(bone.shearX??0),exactCardinals);
    const [sinY,cosY]=sinCosDegrees(bone.rotation+90+(bone.shearY??0),exactCardinals);
    const local:Affine={a:cosX*(bone.scaleX??1),b:sinX*(bone.scaleX??1),
      c:cosY*(bone.scaleY??1),d:sinY*(bone.scaleY??1),worldX:bone.x,worldY:bone.y};
    const world=composeAffine(parent,local);
    if(bone.id===id)return {parent,selected:{...bone,...world},local};
    frames.set(bone.id,world);
  }
  throw Error('The translated bone no longer exists.');
}

function validateParentFrame(parent:Affine,selected:Affine){
  if(!finiteAffine(parent)||!finiteAffine(selected))throw Error('The compensated bone transform cannot be inverted.');
  inverseDeterminant(parent);
}

function localTranslationFrame(bones:readonly BoneView[],id:number){
  const {parent,selected,local}=authoredTranslationFrame(bones,id,true);
  validateParentFrame(parent,selected);
  const lenX=Math.hypot(selected.a,selected.b),lenY=Math.hypot(selected.c,selected.d);
  if(!(lenX>0)||!(lenY>0)||!Number.isFinite(lenX)||!Number.isFinite(lenY)){
    throw Error('The compensated bone transform cannot be inverted.');
  }
  const worldBasis:Affine={a:selected.a/lenX,b:selected.b/lenX,c:selected.c/lenY,d:selected.d/lenY,worldX:0,worldY:0};
  // Only the displacement from the parent pivot contributes Local X/Y.
  const {x,y}=selected;
  const position=localProjection(worldBasis,parent.a*x+parent.c*y,parent.b*x+parent.d*y);
  const axes:LocalTranslationAxes={boneId:id,position,worldBasis};
  return {axes,parent,selected,a:local.a/lenX,b:local.b/lenX,c:local.c/lenY,d:local.d/lenY};
}

/** Coordinates in the signed unit world axes of the authored bone. */
export function localTranslationAxes(bones:readonly BoneView[],id:number):LocalTranslationAxes|null{
  try{return localTranslationFrame(bones,id).axes;}
  catch{return null;}
}

function parentCoordinate(value:number|undefined,unchanged:number){
  if(value===undefined)return unchanged;
  const stored=Math.fround(value);
  if(!Number.isFinite(stored)||Math.abs(stored)>1_000_000){
    throw Error('Choose a finite parent-space coordinate within ±1,000,000.');
  }
  return stored;
}

function shiftBinding<T extends DenseBindingView>(binding:T,id:number,shift:(position:Point)=>Point):T{
  const column=binding.bones.indexOf(id);
  if(column<0)return binding;
  const xIndex=column*2,yIndex=xIndex+1;
  let changed=false;
  const vertices=binding.vertices.map(vertex=>{
    if(!(vertex.weights[column]!>0))return vertex;
    const {x,y}=shift({x:vertex.positions[xIndex]!,y:vertex.positions[yIndex]!});
    if(x===vertex.positions[xIndex]&&y===vertex.positions[yIndex])return vertex;
    changed=true;
    const positions=vertex.positions.slice();
    positions[xIndex]=x;positions[yIndex]=y;
    return {...vertex,positions};
  });
  return changed?{...binding,vertices}:binding;
}

export function previewCompensatedImages(slots:SlotView[],id:number,shift:(point:Point)=>Point,transformRegion:(region:RegionView)=>RegionView){
  let applied=false;
  const changedSlots=slots.map(slot=>{
    let changed=false;
    const attachments=slot.attachments?.map(attachment=>{
      const mesh=attachment.mesh?shiftBinding(attachment.mesh,id,shift):attachment.mesh;
      const clipping=attachment.clipping?shiftBinding(attachment.clipping,id,shift):attachment.clipping;
      const region=attachment.type==='region'&&attachment.region&&slot.bone===id
        ?transformRegion(attachment.region):attachment.region;
      if(region===attachment.region&&mesh===attachment.mesh&&clipping===attachment.clipping)return attachment;
      changed=true;
      return {...attachment,region,mesh,clipping};
    });
    if(!changed)return slot;
    applied=true;
    const active=attachments?.find(attachment=>attachment.id===slot.activeAttachmentId);
    return {...slot,attachments,...(active?{region:active.region,mesh:active.mesh}:{})};
  });
  return {slots:changedSlots,applied};
}

/** Keep the source pose and attachment inventory immutable for the entire drag. */
export function previewCompensatedTranslation(bones:BoneView[],slots:SlotView[],edit:CompensatedTranslation){
  const applied={bones:false,images:false};
  if(edit.type==='setBoneLocalPosition'&&((edit.x===undefined&&edit.y===undefined)||
    (edit.x!==undefined&&!Number.isFinite(edit.x))||(edit.y!==undefined&&!Number.isFinite(edit.y)))){
    throw Error('Choose at least one finite Local coordinate.');
  }
  const standardLocal=edit.type==='setBoneLocalPosition'?authoredTranslationFrame(bones,edit.id,false):undefined;
  if(standardLocal)validateParentFrame(standardLocal.parent,standardLocal.selected);
  const localFrame=edit.type==='setBoneLocalPosition'?localTranslationFrame(bones,edit.id):undefined;
  const poses=localFrame?undefined:new Map(worldBones(bones).map(bone=>[bone.id,bone]));
  const selected=localFrame?.selected??poses?.get(edit.id);
  if(!selected)throw Error('The translated bone no longer exists.');
  const parent=localFrame?.parent??(selected.parent===null?undefined:poses?.get(selected.parent));
  const worldDelta=edit.type==='translateBoneWithCompensation';
  const compensating=worldDelta||edit.compensateBones||edit.compensateImages;
  let desiredLocal:(Point&{error:number})|undefined;
  let position:Point;
  if(edit.type==='setBoneLocalPosition'){
    const {a,b,c,d,axes}=localFrame!;
    const x=edit.x===undefined?0:edit.x-axes.position.x;
    const y=edit.y===undefined?0:edit.y-axes.position.y;
    const error=Math.hypot(x,y);
    if(!Number.isFinite(error))throw Error('The bone-axis position is outside the supported range.');
    desiredLocal={x,y,error};
    position={x:translated(selected.x,a*x+c*y),y:translated(selected.y,b*x+d*y)};
  }else if(edit.type==='setBoneParentPosition'){
    if(edit.x===undefined&&edit.y===undefined)throw Error('Choose at least one parent-space coordinate.');
    position={x:parentCoordinate(edit.x,selected.x),y:parentCoordinate(edit.y,selected.y)};
    if(compensating){
      if(!finiteAffine(selected)||(parent&&!finiteAffine(parent))){
        throw Error('The compensated bone transform cannot be inverted.');
      }
      if(parent)inverseDeterminant(parent);
    }
  }else{
    const {dx,dy}=edit;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>1_000_000||Math.abs(dy)>1_000_000){
      throw Error('The compensated translation exceeds supported coordinates.');
    }
    const local=parent?inverseLinear(parent,dx,dy):{x:dx,y:dy};
    position={x:translated(selected.x,local.x),y:translated(selected.y,local.y)};
  }
  const lx=position.x-selected.x,ly=position.y-selected.y;
  const delta=parent?{dx:parent.a*lx+parent.c*ly,dy:parent.b*lx+parent.d*ly}:{dx:lx,dy:ly};
  if(edit.type==='setBoneLocalPosition'&&desiredLocal){
    const realized=localTranslationDisplacement(localFrame!.axes,delta.dx,delta.dy);
    if((edit.x===undefined&&Math.abs(realized.x)>WORLD_TOLERANCE)||
      (edit.y===undefined&&Math.abs(realized.y)>WORLD_TOLERANCE)){
      throw Error('The stored position cannot preserve the other bone axis.');
    }
    const error=Math.hypot(edit.x===undefined?0:desiredLocal.x-realized.x,
      edit.y===undefined?0:desiredLocal.y-realized.y);
    if(!(error<desiredLocal.error)){
      return {bones,slots,applied,delta:{dx:0,dy:0}};
    }
  }
  if(Object.is(position.x,selected.x)&&Object.is(position.y,selected.y))return {bones,slots,applied,delta};
  const compensationBasis=standardLocal?.selected??selected;
  const compensationMotion=standardLocal?{
    dx:standardLocal.parent.a*lx+standardLocal.parent.c*ly,
    dy:standardLocal.parent.b*lx+standardLocal.parent.d*ly,
  }:delta;
  // Absolute positions use the native inverse coefficient order. An explicit
  // signed-zero change still updates the authored bone without moving dependents.
  const offset=compensating?inverseLinear(compensationBasis,-compensationMotion.dx,-compensationMotion.dy,!worldDelta):undefined;
  if(!offset||(lx===0&&ly===0)){
    return {bones:bones.map(bone=>bone.id===edit.id?{...bone,...position}:bone),slots,applied,delta};
  }
  const shifted=(point:Point)=>{
    const x=translated(point.x,offset.x),y=translated(point.y,offset.y);
    const mx=x-point.x,my=y-point.y;
    const residual=Math.hypot(compensationBasis.a*mx+compensationBasis.c*my+compensationMotion.dx,
      compensationBasis.b*mx+compensationBasis.d*my+compensationMotion.dy);
    if(!Number.isFinite(residual)||residual>WORLD_TOLERANCE)throw Error('The compensated position cannot be represented accurately.');
    return {x,y};
  };
  const nextBones=bones.map(bone=>{
    if(bone.id===edit.id)return {...bone,...position};
    if(!edit.compensateBones||bone.parent!==edit.id)return bone;
    const {x,y}=shifted(bone);
    if(x===bone.x&&y===bone.y)return bone;
    applied.bones=true;
    return {...bone,x,y};
  });
  if(!edit.compensateImages)return {bones:nextBones,slots,applied,delta};
  const images=previewCompensatedImages(slots,edit.id,shifted,region=>{
    const {x,y}=shifted(region);
    return x===region.x&&y===region.y?region:{...region,x,y};
  });
  return {bones:nextBones,slots:images.slots,applied:{...applied,images:images.applied},delta};
}
