import {test} from 'node:test';
import assert from 'node:assert/strict';
import {equivalentWorldRotation,normalizeWorldRotation,previewCompensatedRotation,previewCompensatedScale,
  previewCompensatedShear,worldRotationHeading,worldScaleProjection} from '../src/domain/boneRotationCompensation.ts';
import {imagePolygon} from '../src/domain/sceneSelection.ts';
import {worldBones} from '../src/domain/rig.ts';

const root={id:0,parent:null,name:'root',x:8,y:-0,rotation:0,length:10};
const child={...root,id:1,parent:0,name:'child',x:5,y:2,rotation:28,scaleX:-1.5,scaleY:.75,shearX:11,shearY:0};
const other={...root,id:2,name:'outside',x:30,y:30};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-5,`${actual} differs from ${expected}`);
const affineEqual=(actual,expected)=>{
  for(const field of ['worldX','worldY','a','b','c','d'])close(actual[field],expected[field]);
};
function regionSlot(bone,fields={}){
  const region={image:'region',name:'Region',x:3,y:-1,rotation:45,scaleX:-1,scaleY:.5,width:30,height:20,...fields};
  const attachment={id:10,slot:0,name:'Region',type:'region',region,mesh:null,clipping:null,imageAvailable:true};
  return {id:0,bone,name:'images',blend:'normal',visible:true,region,imageAvailable:true,attachments:[attachment],activeAttachmentId:10};
}
function sameCorners(rig,slot,result){
  const corners=imagePolygon(result.bones,result.slots[0]);
  imagePolygon(rig,slot).forEach((point,index)=>{
    close(corners[index].x,point.x);
    close(corners[index].y,point.y);
  });
}

test('World Rotate heading uses the signed authored X column under a reflected parent',()=>{
  const parent={...root,scaleX:-2};
  const selected={...child,rotation:30,scaleX:1,scaleY:1,shearX:0,shearY:0,
    evaluatedWorld:{a:1,b:0,c:0,d:1,x:0,y:0}};
  const tilt=Math.atan2(.5,Math.sqrt(3))*180/Math.PI;
  close(worldRotationHeading([parent,selected],selected.id),180-tilt);
  close(worldRotationHeading([parent,{...selected,scaleX:-1}],selected.id),360-tilt);
  assert.equal(worldRotationHeading([{...parent,scaleY:1e-13},selected],selected.id),null);
  assert.equal(worldRotationHeading([parent,{...selected,scaleX:0}],selected.id),null);
  assert.equal(worldRotationHeading([parent,selected],99),null);
});

test('World Rotate headings normalize and compare across full turns and the zero seam',()=>{
  assert.equal(normalizeWorldRotation(-20.25),339.75);
  assert.equal(normalizeWorldRotation(4*360+20.25),20.25);
  assert.equal(normalizeWorldRotation(-360),0);
  assert.equal(normalizeWorldRotation(-Number.MIN_VALUE),0);
  assert.ok(equivalentWorldRotation(-20.25,339.75));
  assert.ok(equivalentWorldRotation(1e-10,0));
  assert.ok(equivalentWorldRotation(-2e-11,0));
  assert.ok(!equivalentWorldRotation(-1e-8,0));
  assert.ok(!equivalentWorldRotation(Infinity,0));
});

test('World Scale measures both authored columns under reflected nonuniform ancestry',()=>{
  const parent={...root,scaleX:-2,scaleY:3};
  const selected={...child,rotation:30,scaleX:-.5,scaleY:2,shearX:0,shearY:0,
    evaluatedWorld:{a:1,b:0,c:0,d:1,x:0,y:0}};
  const {x,y}=worldScaleProjection([parent,selected],selected.id);
  assert.ok(Math.abs(x+Math.sqrt(21)/4)<1e-12);
  assert.ok(Math.abs(y-Math.sqrt(31))<1e-12);
});

test('World Scale displays singular and signed zero axes and rejects unavailable geometry',()=>{
  assert.deepEqual(worldScaleProjection([{...root,scaleX:-0,scaleY:2}],root.id),{x:-0,y:2});
  const parent={...root,scaleX:-2,scaleY:0};
  const selected={...child,rotation:0,scaleX:1,scaleY:-0,shearX:0,shearY:0};
  assert.deepEqual(worldScaleProjection([parent,selected],selected.id),{x:2,y:-0});
  assert.equal(worldScaleProjection([parent,selected],99),null);
  assert.equal(worldScaleProjection([{...root,scaleY:Infinity}],root.id),null);
  assert.equal(worldScaleProjection([selected],selected.id),null);
});

test('compensated local Rotate keeps child bases, signed images and positive binding lanes in place',()=>{
  const rig=[root,child,other];
  const region={image:'region',name:'Region',x:3,y:-1,rotation:15,scaleX:-1,scaleY:.5,width:30,height:20};
  const mesh={weighted:true,bones:[0,2],vertices:[
    {weights:[.25,.75],positions:[1,2,3,4]},
    {weights:[-0,1],positions:[-0,7,8,9]},
  ],uvs:[],triangles:[],edges:[],hull:2};
  const image={id:10,slot:0,name:'Region',type:'region',region,mesh:null,clipping:null,imageAvailable:true};
  const binding={...image,id:11,slot:1,name:'Mesh',type:'mesh',mesh};
  const source=[
    {id:0,name:'images',bone:0,blend:'normal',visible:true,region,imageAvailable:true,attachments:[image],activeAttachmentId:10},
    {id:1,name:'binding',bone:2,blend:'normal',visible:true,region,mesh,imageAvailable:true,attachments:[binding],activeAttachmentId:11},
  ];
  const edit={type:'rotateBoneWithCompensation',id:0,mode:'localAbsolute',angle:90,compensateBones:true,compensateImages:true};
  const result=previewCompensatedRotation(rig,source,edit);
  assert.deepEqual(result.applied,{bones:true,images:true});
  assert.deepEqual(result.bones[0],{...root,rotation:90});
  assert.equal(result.bones[1].scaleX,child.scaleX);
  assert.equal(result.bones[1].scaleY,child.scaleY);
  assert.equal(result.bones[1].shearX,child.shearX);
  assert.equal(result.bones[1].shearY,child.shearY);
  affineEqual(worldBones(result.bones)[1],worldBones(rig)[1]);
  assert.equal(result.slots[0].region,result.slots[0].attachments[0].region);
  assert.equal(result.slots[0].region.scaleX,region.scaleX);
  assert.equal(result.slots[0].region.scaleY,region.scaleY);
  const polygon=imagePolygon(result.bones,result.slots[0]);
  imagePolygon(rig,source[0]).forEach((point,index)=>{
    close(polygon[index].x,point.x);
    close(polygon[index].y,point.y);
  });
  assert.deepEqual(result.slots[1].mesh.vertices[0].positions,[2,-1,3,4]);
  assert.equal(result.slots[1].mesh.vertices[1],mesh.vertices[1]);
  assert.deepEqual(mesh.vertices[0].positions,[1,2,3,4]);
  assert.equal(source[0].region,region);

  const fullTurn=previewCompensatedRotation(rig,source,{...edit,angle:360});
  assert.equal(fullTurn.bones[0].rotation,360);
  assert.equal(fullTurn.bones[1],child);
  assert.equal(fullTurn.slots,source);
  assert.deepEqual(fullTurn.applied,{bones:false,images:false});
  assert.throws(()=>previewCompensatedRotation([{...root,scaleX:2},child,other],source,{...edit,angle:45}),/require shear/);
});

test('compensated world Rotate realizes the desired basis under a reflected sheared parent',()=>{
  const rig=[{...root,rotation:32,scaleX:-1.75,scaleY:.625,shearY:14},child,
    {...other,parent:1,x:4,y:-1,rotation:-12}];
  const edit={type:'rotateBoneWithCompensation',id:1,mode:'worldDelta',angle:38,compensateBones:true,compensateImages:false};
  const result=previewCompensatedRotation(rig,[],edit);
  const [,before,dependent]=worldBones(rig),[,after,compensated]=worldBones(result.bones);
  const angle=38*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  affineEqual(after,{...before,a:cos*before.a-sin*before.b,b:sin*before.a+cos*before.b,
    c:cos*before.c-sin*before.d,d:sin*before.c+cos*before.d});
  affineEqual(compensated,dependent);
  assert.equal(result.bones[1].x,child.x);
  assert.equal(result.bones[1].y,child.y);
  assert.equal(result.bones[1].shearX,child.shearX);
  assert.ok(result.bones[1].scaleX<0&&result.bones[1].scaleY>0);
});

test('world Rotate rejects a rounded basis with opposite handedness',()=>{
  const rig=[{...root,scaleX:-2},
    {...child,rotation:0,scaleX:1,scaleY:1,shearX:27.500001907348633,shearY:117.50000762939453}];
  assert.throws(()=>previewCompensatedRotation(rig,[],{type:'rotateBoneWithCompensation',id:1,
    mode:'worldDelta',angle:-97,compensateBones:true,compensateImages:false}),/cannot be represented/);
});

test('compensated world Rotate admits a Region when f32 decomposition leaves only a harmless direction error',()=>{
  const rig=[{...root,scaleX:2,scaleY:.5},
    {...child,rotation:0,scaleX:.5,scaleY:2,shearX:0,shearY:0}];
  const slot=regionSlot(1);
  // This parent makes the old selected world basis uniform. The quantized
  // counter-rotation has a local direction error above 1e-8, yet fits in world space.
  const result=previewCompensatedRotation(rig,[slot],{type:'rotateBoneWithCompensation',id:1,
    mode:'worldDelta',angle:38,compensateBones:false,compensateImages:true});
  assert.deepEqual(result.applied,{bones:false,images:true});
  sameCorners(rig,slot,result);
});

test('uniform Scale tolerates distinct rounded axis ratios while actual Region shear rejects',()=>{
  const rig=[{...root,scaleX:Math.fround(.7),scaleY:Math.fround(1.6)}];
  const slot=regionSlot(0);
  const edit={type:'scaleBoneWithCompensation',id:0,mode:'localFactor',x:1.1,y:1.1,
    compensateBones:false,compensateImages:true};
  const result=previewCompensatedScale(rig,[slot],edit);
  assert.equal(result.bones[0].scaleX,Math.fround(rig[0].scaleX*Math.fround(1.1)));
  assert.equal(result.bones[0].scaleY,Math.fround(rig[0].scaleY*Math.fround(1.1)));
  assert.notEqual(rig[0].scaleX/result.bones[0].scaleX,rig[0].scaleY/result.bones[0].scaleY);
  sameCorners(rig,slot,result);
  assert.throws(()=>previewCompensatedScale(rig,[slot],{...edit,x:2,y:undefined}),/require shear/);
  const nearLimit=[{...root,scaleX:999999.3125}];
  const atLimit=previewCompensatedScale(nearLimit,[],{...edit,x:1+6*2**-23,y:undefined});
  assert.equal(atLimit.bones[0].scaleX,1_000_000);
});

test('compensated Scale can fit the Y axis when the preferred X fit moves tall Region corners',()=>{
  const rig=[root];
  const slot=regionSlot(0,{x:0,y:0,rotation:35,scaleX:1,scaleY:2,width:16,height:600});
  const result=previewCompensatedScale(rig,[slot],{type:'scaleBoneWithCompensation',id:0,
    mode:'localAbsolute',x:1.01,y:1.01001,compensateBones:false,compensateImages:true});
  const before=imagePolygon(rig,slot),after=imagePolygon(result.bones,result.slots[0]);
  for(const [i,p] of before.entries()){
    assert.ok(Math.hypot(p.x-after[i].x,p.y-after[i].y)<.0001);
  }
});

test('sparse absolute Scale puts a reflection into dependent signed X axes, including zero',()=>{
  const rig=[{...root,scaleX:-1,scaleY:.5},
    {...child,rotation:0,shearX:0}, {...other,parent:0,scaleX:-0}];
  const slot=regionSlot(0,{rotation:0});
  const edit={type:'scaleBoneWithCompensation',id:0,mode:'localAbsolute',x:2,
    compensateBones:true,compensateImages:true};
  const result=previewCompensatedScale(rig,[slot],edit);
  assert.equal(result.bones[0].scaleX,2);
  assert.equal(result.bones[0].scaleY,rig[0].scaleY);
  assert.equal(result.bones[0].y,-0);
  assert.equal(result.bones[1].scaleX,.75);
  assert.equal(result.bones[2].scaleX,0);
  assert.equal(result.slots[0].region.scaleX,.5);
  affineEqual(worldBones(result.bones)[1],worldBones(rig)[1]);
  sameCorners(rig,slot,result);
  assert.throws(()=>previewCompensatedScale(rig,[slot],{...edit,x:-0}),/nonzero/);
});

test('parented compensated Shear distinguishes authored axes from the world gesture',()=>{
  const rig=[{...root,scaleX:2},
    {...child,rotation:0,scaleX:1,scaleY:1,shearX:-0,shearY:-0,y:-0},
    {...other,parent:1,x:4,y:-1,rotation:-12}];
  const edit={type:'shearBoneWithCompensation',id:1,mode:'localAbsolute',angle:30,
    compensateBones:true,compensateImages:false};
  const original=worldBones(rig);
  for(const [axis,field,authored,gesture] of [['x','b',.5,1],['y','c',-1,-.5]]){
    const local=previewCompensatedShear(rig,[],{...edit,axis});
    const world=previewCompensatedShear(rig,[],{...edit,axis,mode:'worldDelta'});
    const [,afterLocal,localChild]=worldBones(local.bones),[,afterWorld,worldChild]=worldBones(world.bones);
    const changed=axis==='x'?'shearX':'shearY',untouched=axis==='x'?'shearY':'shearX';
    assert.deepEqual(local.bones[1],{...rig[1],[changed]:30});
    assert.equal(local.bones[1][untouched],-0);
    assert.equal(world.bones[1].x,rig[1].x);
    assert.equal(world.bones[1].y,-0);
    close(afterLocal[field],authored);
    close(afterWorld[field],gesture);
    close(afterLocal.worldX,original[1].worldX);
    close(afterWorld.worldY,original[1].worldY);
    affineEqual(localChild,original[2]);
    affineEqual(worldChild,original[2]);
  }
});

test('compensated Shear fits a representable Region and rejects a singular basis or true image shear',()=>{
  const rig=[{...root,scaleX:2},{...child,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0}];
  const edit={type:'shearBoneWithCompensation',id:1,mode:'localAbsolute',axis:'x',angle:30,
    compensateBones:false,compensateImages:true};
  const slot=regionSlot(1,{rotation:-30}),unfit=regionSlot(1,{rotation:0});
  const result=previewCompensatedShear(rig,[slot],edit);
  assert.deepEqual(result.applied,{bones:false,images:true});
  sameCorners(rig,slot,result);
  assert.throws(()=>previewCompensatedShear(rig,[unfit],edit),/require shear/);
  assert.throws(()=>previewCompensatedShear(rig,[slot],{...edit,angle:90}),/cannot be inverted/);
  assert.throws(()=>previewCompensatedShear(rig,[slot],{...edit,mode:'worldDelta',angle:85.01}),/±85°/);

  const slots=[unfit],fullTurn=previewCompensatedShear(rig,slots,{...edit,angle:360});
  assert.deepEqual(fullTurn.bones[1],{...rig[1],shearX:360});
  assert.equal(fullTurn.slots,slots);
  assert.deepEqual(fullTurn.applied,{bones:false,images:false});
});

test('compensated Shear can share a small Region fitting error between both axes',()=>{
  const rig=[root],slot=regionSlot(0,{x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:200,height:200});
  const result=previewCompensatedShear(rig,[slot],{type:'shearBoneWithCompensation',id:0,
    mode:'localAbsolute',axis:'x',angle:.00075,compensateBones:false,compensateImages:true});
  assert.ok(Math.abs(result.slots[0].region.rotation+.000375)<1e-8);
  const before=imagePolygon(rig,slot),after=imagePolygon(result.bones,result.slots[0]);
  for(const [i,p] of before.entries())assert.ok(Math.hypot(p.x-after[i].x,p.y-after[i].y)<.001);
});

test('handedness reversal from authored Shear uses the edited dependent scale sign',()=>{
  const rig=[root,child];
  const result=previewCompensatedShear(rig,[],{type:'shearBoneWithCompensation',id:0,
    mode:'localAbsolute',axis:'x',angle:120,compensateBones:true,compensateImages:false});
  assert.ok(result.bones[1].scaleX>0&&result.bones[1].scaleY>0);
  assert.equal(result.bones[1].shearX,child.shearX);
  affineEqual(worldBones(result.bones)[1],worldBones(rig)[1]);
});

test('world Shear rejects rounded handedness reversal even when its basis residual is small',()=>{
  const rig=[{...root,scaleX:-2},
    {...child,rotation:0,scaleX:1,scaleY:1,shearX:27.500001907348633,shearY:117.50000762939453}];
  assert.throws(()=>previewCompensatedShear(rig,[],{type:'shearBoneWithCompensation',id:1,
    mode:'worldDelta',axis:'x',angle:-80,compensateBones:true,compensateImages:false}),/cannot be represented/);
});
