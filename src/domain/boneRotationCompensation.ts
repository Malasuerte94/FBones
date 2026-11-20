import type {BoneView,RegionView,RigEdit,SlotView} from './project.ts';
import {composeAffine,type Affine} from './rig.ts';
import {finiteAffine,inverseDeterminant,previewCompensatedImages} from './boneCompensation.ts';

type RotationEdit = Extract<RigEdit,{type:'rotateBoneWithCompensation'}>;
type ScaleEdit = Extract<RigEdit,{type:'scaleBoneWithCompensation'}>;
type ShearEdit = Extract<RigEdit,{type:'shearBoneWithCompensation'}>;
type CompensationEdit = RotationEdit | ScaleEdit | ShearEdit;
type Point = {x:number;y:number};
type AxisSigns = readonly [number,number];
interface CompensationCorrection {
  oldBasis:Affine; newBasis:Affine; local:Affine;
  axisSigns:AxisSigns; shearMessage:string;
}
const IDENTITY:Affine={a:1,b:0,c:0,d:1,worldX:0,worldY:0};
const KEEP_SIGNS:AxisSigns=[1,1];
const FIELD_LIMIT=1_000_000;
const WORLD_TOLERANCE=0.001;
const ANGLE_ROUNDOFF=1e-10;
const RADIANS=Math.PI/180;
const DEGREES=180/Math.PI;

function stored(value:number,old:number):number {
  if(!Number.isFinite(value)||Math.abs(value)>FIELD_LIMIT){
    throw Error('Compensation exceeds the supported local transform range.');
  }
  const rounded=Math.fround(value);
  return rounded===old?old:rounded;
}

function storedAngle(value:number,old:number):number {
  return stored(Math.abs(value-old)<=ANGLE_ROUNDOFF?old:value,old);
}

function nearestAngle(angle:number,reference:number):number {
  const delta=angle-reference;
  if(delta>=-180&&delta<180)return angle;
  const shifted=(delta+180)%360;
  return reference+((shifted<0?shifted+360:shifted)-180);
}

export function normalizeWorldRotation(angle:number):number {
  const remainder=angle%360;
  const heading=remainder<0?remainder+360:remainder;
  return heading===0||heading===360?0:heading;
}

export function equivalentWorldRotation(angle:number,reference:number):boolean {
  const heading=normalizeWorldRotation(reference);
  return Math.abs(nearestAngle(normalizeWorldRotation(angle),heading)-heading)<=ANGLE_ROUNDOFF;
}

function signedMagnitude(length:number,reference:number){
  return reference<0||Object.is(reference,-0)?-length:length;
}

function inverseBasis(matrix:Affine):Affine {
  if(!finiteAffine(matrix))throw Error('The compensated bone transform cannot be inverted.');
  const det=inverseDeterminant(matrix);
  return {a:matrix.d/det,b:-matrix.b/det,c:-matrix.c/det,d:matrix.a/det,worldX:0,worldY:0};
}

function basis(matrix:Affine):Affine {
  return {...matrix,worldX:0,worldY:0};
}

function boneAffine(bone:BoneView):Affine {
  const x=(bone.rotation+(bone.shearX??0))*RADIANS;
  const y=(bone.rotation+90+(bone.shearY??0))*RADIANS;
  return {a:Math.cos(x)*(bone.scaleX??1),b:Math.sin(x)*(bone.scaleX??1),
    c:Math.cos(y)*(bone.scaleY??1),d:Math.sin(y)*(bone.scaleY??1),worldX:bone.x,worldY:bone.y};
}

function regionAffine(region:RegionView):Affine {
  const angle=region.rotation*RADIANS,cos=Math.cos(angle),sin=Math.sin(angle);
  return {a:cos*region.scaleX,b:sin*region.scaleX,c:-sin*region.scaleY,d:cos*region.scaleY,
    worldX:region.x,worldY:region.y};
}

function authoredFrames(bones:readonly BoneView[],selectedId:number){
  const worlds=new Map<number,Affine>();
  for(const bone of bones){
    const parent=bone.parent===null?IDENTITY:worlds.get(bone.parent);
    if(!parent)throw Error('Invalid bone hierarchy.');
    const selected=composeAffine(parent,basis(boneAffine(bone)));
    if(bone.id===selectedId)return {bone,parent,selected};
    worlds.set(bone.id,selected);
  }
  throw Error('The selected bone no longer exists.');
}

/** The authored, signed X column supplies the Setup World Rotate heading. */
export function worldRotationHeading(bones:readonly BoneView[],id:number):number|null {
  try{
    const {parent,selected}=authoredFrames(bones,id);
    inverseBasis(parent);
    inverseBasis(selected);
    return normalizeWorldRotation(Math.atan2(selected.b,selected.a)*DEGREES);
  }catch{
    return null;
  }
}

/** FBones displays world column lengths with the selected bone's authored axis signs. */
export function worldScaleProjection(bones:readonly BoneView[],id:number):Point|null {
  try{
    const {bone,selected}=authoredFrames(bones,id);
    const x=Math.hypot(selected.a,selected.b),y=Math.hypot(selected.c,selected.d);
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    return {x:signedMagnitude(x,bone.scaleX??1),y:signedMagnitude(y,bone.scaleY??1)};
  }catch{
    return null;
  }
}

function fitBone(old:BoneView,target:Affine,keepOrigin:boolean,axisSigns=KEEP_SIGNS):BoneView {
  const oldScaleX=old.scaleX??1,oldScaleY=old.scaleY??1,oldShearY=old.shearY??0;
  const lenX=Math.hypot(target.a,target.b),lenY=Math.hypot(target.c,target.d);
  const seedX=oldScaleX*axisSigns[0],seedY=oldScaleY*axisSigns[1];
  const signX=signedMagnitude(1,seedX),signY=signedMagnitude(1,seedY);
  const headingX=Math.atan2(target.b*signX,target.a*signX)*DEGREES;
  const headingY=Math.atan2(target.d*signY,target.c*signY)*DEGREES;
  const angle=lenX===0?old.rotation:nearestAngle(headingX-(old.shearX??0),old.rotation);
  const x=keepOrigin?old.x:stored(target.worldX,old.x);
  const y=keepOrigin?old.y:stored(target.worldY,old.y);
  const rotation=storedAngle(angle,old.rotation);
  const scaleX=stored(lenX*signX,seedX);
  const scaleY=stored(lenY*signY,seedY);
  const shearY=lenY===0?oldShearY:storedAngle(nearestAngle(headingY-angle-90,oldShearY),oldShearY);
  return x===old.x&&y===old.y&&rotation===old.rotation&&Object.is(scaleX,oldScaleX)&&Object.is(scaleY,oldScaleY)&&shearY===oldShearY
    ?old:{...old,x,y,rotation,scaleX,scaleY,shearY};
}

function close(dx:number,dy:number){
  return Math.hypot(dx,dy)<=WORLD_TOLERANCE;
}

function precisionError(){
  return Error('The compensated transform cannot be represented accurately.');
}

function basisFits(before:Affine,after:Affine){
  return close(before.a-after.a,before.b-after.b)&&close(before.c-after.c,before.d-after.d);
}

function reversedHandedness(before:Affine,after:Affine){
  return (before.a*before.d-before.b*before.c<0)!==(after.a*after.d-after.b*after.c<0);
}

function affineFits(before:Affine,after:Affine){
  return close(before.worldX-after.worldX,before.worldY-after.worldY)&&basisFits(before,after);
}

function regionFits(before:Affine,after:Affine,width:number,height:number){
  if(!affineFits(before,after))return false;
  for(const x of [-width/2,width/2])for(const y of [-height/2,height/2]){
    if(!close(before.a*x+before.c*y+before.worldX-(after.a*x+after.c*y+after.worldX),
      before.b*x+before.d*y+before.worldY-(after.b*x+after.d*y+after.worldY)))return false;
  }
  return true;
}

function compensatedRegion(region:RegionView,correction:CompensationCorrection):RegionView {
  const {oldBasis,newBasis,axisSigns,shearMessage}=correction;
  const local=regionAffine(region),target=composeAffine(correction.local,local);
  const lenX=Math.hypot(target.a,target.b),lenY=Math.hypot(target.c,target.d);
  const seedX=region.scaleX*axisSigns[0],seedY=region.scaleY*axisSigns[1];
  const signX=signedMagnitude(1,seedX),signY=signedMagnitude(1,seedY);
  const yAngle=lenY>0?Math.atan2(target.d*signY,target.c*signY)*DEGREES-90:region.rotation;
  const angle=lenX>0?Math.atan2(target.b*signX,target.a*signX)*DEGREES:yAngle;
  const x=stored(target.worldX,region.x),y=stored(target.worldY,region.y);
  const rotation=storedAngle(nearestAngle(angle,region.rotation),region.rotation);
  const scaleX=stored(lenX*signX,seedX);
  const scaleY=stored(lenY*signY,seedY);
  let next={...region,x,y,rotation,scaleX,scaleY};
  const before=composeAffine(oldBasis,local);
  const fits=(candidate:RegionView)=>regionFits(before,composeAffine(newBasis,regionAffine(candidate)),region.width,region.height);
  const bothColumns=lenX>0&&lenY>0;
  let fitsRegion=fits(next);
  if(!fitsRegion&&bothColumns){
    // Try the other column, then share the direction error between the axes.
    const midpoint=angle+(nearestAngle(yAngle,angle)-angle)/2;
    for(const candidate of [yAngle,midpoint]){
      const alternateAngle=nearestAngle(candidate,region.rotation);
      const word=Math.abs(alternateAngle-region.rotation)<=ANGLE_ROUNDOFF?region.rotation:alternateAngle;
      if(!(Math.abs(word)<=FIELD_LIMIT))continue;
      const alternate={...next,rotation:stored(word,region.rotation)};
      if(alternate.rotation!==rotation&&fits(alternate)){
        next=alternate;
        fitsRegion=true;
        break;
      }
    }
  }
  if(!fitsRegion){
    if(bothColumns&&!(Math.hypot(target.c*signY/lenY+target.b*signX/lenX,
      target.d*signY/lenY-target.a*signX/lenX)<=1e-8)){
      throw Error(shearMessage);
    }
    throw precisionError();
  }
  return x===region.x&&y===region.y&&next.rotation===region.rotation&&Object.is(scaleX,region.scaleX)&&Object.is(scaleY,region.scaleY)?region:next;
}

function correctedPreview(bones:BoneView[],slots:SlotView[],edit:CompensationEdit,changed:BoneView,correction:CompensationCorrection){
  const applied={bones:false,images:false};
  const {oldBasis,newBasis,local,axisSigns}=correction;
  const nextBones=bones.map(child=>{
    if(child.id===edit.id)return changed;
    if(!edit.compensateBones||child.parent!==edit.id)return child;
    const childLocal=boneAffine(child);
    const next=fitBone(child,composeAffine(local,childLocal),false,axisSigns);
    if(!affineFits(composeAffine(oldBasis,childLocal),composeAffine(newBasis,boneAffine(next)))){
      throw precisionError();
    }
    if(next!==child)applied.bones=true;
    return next;
  });
  if(!edit.compensateImages)return {bones:nextBones,slots,applied};
  const shifted=(old:Point):Point=>{
    const {x,y}=old;
    const next={x:stored(local.a*x+local.c*y,x),y:stored(local.b*x+local.d*y,y)};
    if(!close(newBasis.a*next.x+newBasis.c*next.y-(oldBasis.a*x+oldBasis.c*y),
      newBasis.b*next.x+newBasis.d*next.y-(oldBasis.b*x+oldBasis.d*y))){
      throw precisionError();
    }
    return next;
  };
  const images=previewCompensatedImages(slots,edit.id,shifted,region=>compensatedRegion(region,correction));
  return {bones:nextBones,slots:images.slots,applied:{...applied,images:images.applied}};
}

/** Use the relative correction between the authored and realized bases. */
export function previewCompensatedRotation(bones:BoneView[],slots:SlotView[],edit:RotationEdit){
  const applied={bones:false,images:false};
  if(!edit.compensateBones&&!edit.compensateImages)throw Error('Enable Bones or Images compensation.');
  if(!Number.isFinite(edit.angle)||Math.abs(edit.angle)>FIELD_LIMIT)throw Error('Choose a finite bounded rotation.');
  const {bone,parent,selected:oldBasis}=authoredFrames(bones,edit.id);
  const turn=edit.angle%360;
  const absolute=edit.mode==='localAbsolute'?Math.fround(edit.angle):undefined;
  if(absolute===undefined?turn===0:Object.is(absolute,bone.rotation))return {bones,slots,applied};
  const parentInverse=inverseBasis(parent);
  inverseBasis(oldBasis);

  let changed:BoneView;
  let desired:Affine|undefined;
  if(absolute!==undefined){
    changed={...bone,rotation:absolute};
    if((absolute-bone.rotation)%360===0){
      return {bones:bones.map(row=>row===bone?changed:row),slots,applied};
    }
  }else{
    const angle=turn*RADIANS,cos=Math.cos(angle),sin=Math.sin(angle);
    desired=composeAffine({a:cos,b:sin,c:-sin,d:cos,worldX:0,worldY:0},oldBasis);
    changed=fitBone(bone,composeAffine(parentInverse,desired),true);
  }
  const newBasis=composeAffine(parent,basis(boneAffine(changed)));
  const newInverse=inverseBasis(newBasis);
  if(desired&&(!basisFits(desired,newBasis)||reversedHandedness(oldBasis,newBasis)))throw precisionError();
  if(changed===bone)return {bones,slots,applied};
  return correctedPreview(bones,slots,edit,changed,{oldBasis,newBasis,
    local:composeAffine(newInverse,oldBasis),axisSigns:KEEP_SIGNS,
    shearMessage:'This image would require shear to compensate the rotation.'});
}

function nextScale(value:number|undefined,old:number,mode:ScaleEdit['mode']):number {
  if(value===undefined)return old;
  const operand=Math.fround(value);
  if(mode==='localFactor'&&!(operand>=Math.fround(.01)&&operand<=100)){
    throw Error('Choose a finite scale factor from 0.01 to 100.');
  }
  const candidate=mode==='localFactor'?old*operand:operand;
  const result=Math.fround(candidate);
  if(!Number.isFinite(result)||Math.abs(result)>FIELD_LIMIT||result===0){
    throw Error('Choose finite nonzero scales within the supported transform range.');
  }
  return result;
}

export function previewCompensatedScale(bones:BoneView[],slots:SlotView[],edit:ScaleEdit){
  const applied={bones:false,images:false};
  if(!edit.compensateBones&&!edit.compensateImages)throw Error('Enable Bones or Images compensation.');
  if(edit.x===undefined&&edit.y===undefined)throw Error('Choose at least one local scale axis.');
  const {bone,parent,selected:oldBasis}=authoredFrames(bones,edit.id);
  const oldX=bone.scaleX??1,oldY=bone.scaleY??1;
  const scaleX=nextScale(edit.x,oldX,edit.mode),scaleY=nextScale(edit.y,oldY,edit.mode);
  const changed={...bone,...(edit.x===undefined?{}:{scaleX}),...(edit.y===undefined?{}:{scaleY})};
  const newBasis=composeAffine(parent,basis(boneAffine(changed)));
  inverseBasis(parent);
  inverseBasis(oldBasis);
  inverseBasis(newBasis);
  if(Object.is(scaleX,oldX)&&Object.is(scaleY,oldY))return {bones,slots,applied};

  const ratioX=oldX/scaleX,ratioY=oldY/scaleY;
  return correctedPreview(bones,slots,edit,changed,{oldBasis,newBasis,
    local:{...IDENTITY,a:ratioX,d:ratioY},axisSigns:[Math.sign(ratioX),Math.sign(ratioY)],
    shearMessage:'This image would require shear to compensate the scale.'});
}

export function previewCompensatedShear(bones:BoneView[],slots:SlotView[],edit:ShearEdit){
  const applied={bones:false,images:false};
  if(!edit.compensateBones&&!edit.compensateImages)throw Error('Enable Bones or Images compensation.');
  const local=edit.mode==='localAbsolute',angle=Math.fround(edit.angle);
  if(!Number.isFinite(angle)||Math.abs(angle)>(local?FIELD_LIMIT:85)){
    throw Error(local?'Choose a finite local shear angle within ±1,000,000.':'Choose a finite world shear delta within ±85°.');
  }
  const {bone,parent,selected:oldBasis}=authoredFrames(bones,edit.id);
  const parentInverse=inverseBasis(parent);
  inverseBasis(oldBasis);

  let changed:BoneView;
  let desired:Affine|undefined;
  let metadataOnly=false;
  if(local){
    const lane=edit.axis==='x'?'shearX':'shearY',previous=bone[lane]??0;
    if(Object.is(angle,previous))return {bones,slots,applied};
    changed={...bone,[lane]:angle};
    metadataOnly=(angle-previous)%360===0;
  }else{
    if(angle===0)return {bones,slots,applied};
    const sin=Math.sin(angle*RADIANS),cos=Math.cos(angle*RADIANS);
    const delta=edit.axis==='x'?{...IDENTITY,a:cos,b:sin}:{...IDENTITY,c:-sin,d:cos};
    desired=composeAffine(delta,oldBasis);
    changed=fitBone(bone,composeAffine(parentInverse,desired),true);
  }
  const newBasis=composeAffine(parent,basis(boneAffine(changed)));
  const newInverse=inverseBasis(newBasis);
  const reversed=reversedHandedness(oldBasis,newBasis);
  if(desired&&(reversed||!basisFits(desired,newBasis)))throw precisionError();
  if(changed===bone)return {bones,slots,applied};
  if(metadataOnly)return {bones:bones.map(row=>row===bone?changed:row),slots,applied};
  const axisSigns:AxisSigns=reversed?(edit.axis==='x'?[-1,1]:[1,-1]):KEEP_SIGNS;
  return correctedPreview(bones,slots,edit,changed,{oldBasis,newBasis,
    local:composeAffine(newInverse,oldBasis),axisSigns,
    shearMessage:'This image would require shear to stay in place.'});
}
