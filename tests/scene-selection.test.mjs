import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneImagesInBox,previewAttachmentTransform,previewRegionPosition,snapRegionTranslation,imagePolygon,resolveAttachment,attachmentGeometry,selectedAttachmentGeometry} from '../src/domain/sceneSelection.ts';
import {localTranslationAxes,localTranslationDisplacement,previewCompensatedTranslation} from '../src/domain/boneCompensation.ts';
import {isolatedMeshSlot,meshDisplayClip} from '../src/domain/meshDisplay.ts';
import {activeAttachmentColor} from '../src/domain/attachmentColor.ts';
import {worldBones} from '../src/domain/rig.ts';
const bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0},{id:1,parent:0,name:'affine',x:100,y:20,rotation:30,length:50,scaleX:1.2,scaleY:-.8,shearY:15}];
const make=(id,bone)=>{const region={image:`i${id}`,name:`i${id}`,x:0,y:0,rotation:10,scaleX:1,scaleY:1,width:40,height:20};const a={id:id+10,slot:id,name:region.name,type:'region',region,mesh:null,clipping:null,imageAvailable:true};return{id,bone,name:region.name,blend:'normal',visible:true,region,imageAvailable:true,attachments:[a],activeAttachmentId:a.id};};
const slots=[make(0,0),make(1,1)];

test('mesh isolation projects the inspected alternate and retains inherited clipping only',()=>{
  const base=slots[0],mesh={weighted:false,bones:[0],vertices:[],uvs:[],triangles:[],edges:[],hull:0};
  const alternate={...base.attachments[0],id:0,type:'mesh',mesh,color:0x83aad177,
    region:{...base.region,image:'alternate'},imageAvailable:false};
  const owner={...base,attachments:[...base.attachments,alternate]};
  const display={attachmentId:alternate.id,triangles:true,dim:false,isolate:true};
  const projected=isolatedMeshSlot([owner,slots[1]],display);
  assert.equal(projected.activeAttachmentId,alternate.id);
  assert.equal(projected.mesh,mesh);
  assert.equal(projected.region,alternate.region);
  assert.equal(projected.imageAvailable,false);
  assert.equal(activeAttachmentColor(projected),alternate.color);
  assert.equal(owner.activeAttachmentId,base.activeAttachmentId);
  assert.equal(isolatedMeshSlot([owner],{...display,isolate:false}),undefined);
  assert.equal(isolatedMeshSlot([owner],{...display,attachmentId:base.activeAttachmentId}),undefined);
  const legacy={...base,mesh,attachments:undefined,activeAttachmentId:undefined};
  assert.equal(isolatedMeshSlot([legacy],display).activeAttachmentId,legacy.id);

  const clipping={endSlot:owner.id,inverse:true};
  const clip={slot:15,clipping};
  assert.equal(meshDisplayClip(clip,owner.id,true),clipping);
  assert.equal(meshDisplayClip({...clip,slot:owner.id},owner.id,true),undefined);
  assert.equal(meshDisplayClip({...clip,slot:owner.id},owner.id,false),clipping);
});

test('compensated drag keeps the source immutable and shifts only positive binding lanes of the moved bone',()=>{
  const rig=[{...bones[0],x:8,y:4,rotation:90},{...bones[1],x:5,y:2},{...bones[0],id:2,parent:1,x:30,y:-6}];
  const mesh={weighted:true,bones:[0,1],vertices:[
    {weights:[.25,.75],positions:[10,20,30,40]},
    {weights:[0,1],positions:[1,2,3,4]},
  ],uvs:[0,0,0,1],triangles:[],edges:[],hull:2};
  const outside={...slots[1],mesh,attachments:[{...slots[1].attachments[0],type:'mesh',mesh}]};
  const source=[slots[0],outside];
  const edit={type:'translateBoneWithCompensation',id:0,dx:6,dy:-4,compensateBones:true,compensateImages:true};
  const result=previewCompensatedTranslation(rig,source,edit);
  assert.deepEqual(result.applied,{bones:true,images:true});
  assert.deepEqual(result.bones[0],{...rig[0],x:14,y:0});
  assert.deepEqual(result.bones[1],{...rig[1],x:9,y:8});
  assert.equal(result.bones[2],rig[2]);
  assert.deepEqual(result.slots[0].region,{...slots[0].region,x:4,y:6});
  assert.deepEqual(result.slots[1].mesh.vertices[0].positions,[14,26,30,40]);
  assert.equal(result.slots[1].mesh.vertices[0].weights,mesh.vertices[0].weights);
  assert.equal(result.slots[1].mesh.vertices[1],mesh.vertices[1]);
  assert.equal(result.slots[1].mesh.uvs,mesh.uvs);
  assert.deepEqual(mesh.vertices[0].positions,[10,20,30,40]);
  const noOp=previewCompensatedTranslation(rig,source,{...edit,dx:0,dy:0});
  assert.equal(noOp.bones,rig);
  assert.equal(noOp.slots,source);
});

test('compensated Parent Translate uses the stored axis and realized reflected world motion',()=>{
  const rig=[{...bones[0],x:8,y:4,rotation:29,scaleX:-1.75,scaleY:.75,shearY:37},
    {...bones[1],x:5,y:-0},{...bones[0],id:2,parent:1,x:30,y:-6}];
  const source=[make(3,1),make(4,0)];
  const edit={type:'setBoneParentPosition',id:1,x:7.25+2**-27,compensateBones:true,compensateImages:true};
  const result=previewCompensatedTranslation(rig,source,edit);
  assert.deepEqual(result.applied,{bones:true,images:true});
  assert.equal(result.bones[1].x,7.25);
  assert.equal(result.bones[1].y,-0);
  assert.equal(rig[1].x,5);
  assert.equal(source[0].region.x,0);
  assert.equal(result.slots[1],source[1]);

  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} differs from ${b}`);
  const [parent,before,child]=worldBones(rig);
  const [,after,compensatedChild]=worldBones(result.bones);
  close(result.delta.dx,parent.a*2.25);
  close(result.delta.dy,parent.b*2.25);
  assert.ok(result.delta.dx<0&&result.delta.dy<0);
  close(after.worldX-before.worldX,result.delta.dx);
  close(after.worldY-before.worldY,result.delta.dy);
  close(compensatedChild.worldX,child.worldX);
  close(compensatedChild.worldY,child.worldY);
  const artwork=imagePolygon(result.bones,result.slots[0]);
  for(const [index,point] of imagePolygon(rig,source[0]).entries()){
    close(artwork[index].x,point.x);
    close(artwork[index].y,point.y);
  }

  const noOp=previewCompensatedTranslation(rig,source,{...edit,x:5+2**-27});
  assert.equal(noOp.bones,rig);
  assert.equal(noOp.slots,source);
  const zeroSign=previewCompensatedTranslation(rig,source,{...edit,x:undefined,y:0});
  assert.equal(zeroSign.bones[1].y,0);
  assert.equal(zeroSign.bones[2],rig[2]);
  assert.equal(zeroSign.slots,source);
  assert.deepEqual(zeroSign.applied,{bones:false,images:false});
});

test('armed Parent Translate rejects a relatively singular parent or selected transform',()=>{
  const edit={type:'setBoneParentPosition',id:1,y:6,compensateImages:true};
  const nearSingular=bone=>({...bone,scaleY:1e-14});
  assert.throws(()=>previewCompensatedTranslation([nearSingular(bones[0]),bones[1]],slots,edit),/cannot be inverted/);
  assert.throws(()=>previewCompensatedTranslation([bones[0],nearSingular(bones[1])],slots,edit),/cannot be inverted/);
  assert.throws(()=>previewCompensatedTranslation(bones,slots,{...edit,y:Infinity}),/finite parent-space/);
});

test('Local Translate projects authored displacement in its axes independently of Parent and World',()=>{
  const parent={...bones[0],x:10,y:4,rotation:90};
  const selected={...bones[1],x:5,y:2,rotation:90,scaleX:1,scaleY:1,shearY:0};
  const rig=[parent,selected];
  const axes=localTranslationAxes(rig,selected.id);
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);
  close(axes.position.x,2);
  close(axes.position.y,-5);
  const [,world]=worldBones(rig);
  assert.deepEqual([selected.x,selected.y],[5,2]);
  close(world.worldX,8);
  close(world.worldY,9);
  const local=previewCompensatedTranslation(rig,[],{type:'setBoneLocalPosition',id:selected.id,x:axes.position.x+2});
  const parentMove=previewCompensatedTranslation(rig,[],{type:'setBoneParentPosition',id:selected.id,x:7});
  const worldMove=previewCompensatedTranslation(rig,[],{type:'translateBoneWithCompensation',id:selected.id,dx:2,dy:0,
    compensateBones:true,compensateImages:false});
  close(local.delta.dx,-2);
  close(local.delta.dy,0);
  close(parentMove.delta.dx,0);
  close(parentMove.delta.dy,2);
  close(worldMove.delta.dx,2);
  close(worldMove.delta.dy,0);

  const root={...parent,x:5,y:2,scaleX:4,scaleY:.5};
  const rootAxes=localTranslationAxes([root],root.id);
  close(rootAxes.position.x,2);
  close(rootAxes.position.y,-5);
  const far={...parent,x:900_000,y:900_000,rotation:0};
  const tiny={...selected,x:2**-42,y:0,rotation:0,evaluatedWorld:{a:0,b:0,c:0,d:0,x:0,y:0}};
  assert.equal(localTranslationAxes([far,tiny],tiny.id).position.x,tiny.x);
});

test('oblique Local Translate solves both basis directions and compensates realized motion',()=>{
  const parent={...bones[0],scaleX:-2,scaleY:3};
  const selected={...bones[1],x:5,y:2,rotation:0,scaleX:-1,scaleY:1,shearY:30};
  const rig=[parent,selected,{...bones[0],id:2,parent:1,x:3,y:1}];
  const source=[slots[1]],axes=localTranslationAxes(rig,selected.id);
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} differs from ${b}`);
  close(axes.position.x,-10-4/Math.sqrt(3));
  close(axes.position.y,2*Math.sqrt(31/3));
  const input={type:'setBoneLocalPosition',id:selected.id,x:axes.position.x+2,compensateBones:true,compensateImages:true};
  const result=previewCompensatedTranslation(rig,source,input);
  assert.deepEqual(result.applied,{bones:true,images:true});
  assert.equal(result.bones[1].x,4);
  assert.equal(result.bones[1].y,selected.y);
  assert.deepEqual(localTranslationDisplacement(axes,result.delta.dx,result.delta.dy),{x:2,y:0});
  const before=worldBones(rig)[2],after=worldBones(result.bones)[2];
  close(after.worldX,before.worldX);
  close(after.worldY,before.worldY);
  const image=imagePolygon(result.bones,result.slots[0]);
  imagePolygon(rig,source[0]).forEach((point,i)=>{close(image[i].x,point.x);close(image[i].y,point.y);});
});

test('Local Translate retains rounding ties and rejects omitted-axis drift',()=>{
  const root={...bones[0],x:900_000.0625,y:-0};
  const rig=[root],source=[];
  const edit={type:'setBoneLocalPosition',id:root.id,x:root.x+.03125};
  assert.equal(Math.fround(edit.x),900_000.125);
  const noOp=previewCompensatedTranslation(rig,source,edit);
  assert.equal(noOp.bones,rig);
  assert.equal(noOp.slots,source);
  assert.deepEqual(noOp.delta,{dx:0,dy:0});
  assert.equal(noOp.bones[0].y,-0);

  const parent={...bones[0],scaleX:-2,scaleY:3};
  const selected={...bones[1],x:0,y:131072,rotation:0,scaleX:1,scaleY:1,shearX:45,shearY:0};
  const angled=[parent,selected],axes=localTranslationAxes(angled,selected.id);
  assert.throws(()=>previewCompensatedTranslation(angled,[],{...edit,id:selected.id,x:axes.position.x+.005}),/other bone axis/);
  assert.equal(localTranslationAxes([{...root,scaleY:0}],root.id),null);
});

test('Local Translate preserves cardinal zero without authoring a trig residual',()=>{
  const root={...bones[0],x:0,y:2};
  const rig=[root];
  assert.deepEqual(localTranslationAxes(rig,root.id).position,{x:0,y:2});
  const noOp=previewCompensatedTranslation(rig,[],{type:'setBoneLocalPosition',id:root.id,x:0});
  assert.equal(noOp.bones,rig);
});

test('Region snapping uses the frozen owner and respects a locked viewport axis',()=>{
  const target={id:10,region:{x:0.25,y:-0.125},owner:{worldX:97,worldY:13,a:0,b:2,c:-1,d:0}};
  assert.deepEqual(snapRegionTranslation(target,{x:2,y:0},'x'),{
    delta:{dx:1.875,dy:0},edit:{type:'setRegionPosition',id:10,y:-2},
  });
  assert.deepEqual(snapRegionTranslation(target,{x:0,y:0},null),{delta:{dx:0,dy:0},edit:null});
  const oblique={...target,owner:{...target.owner,a:2,b:1,c:0.5,d:2}};
  assert.equal(snapRegionTranslation(oblique,{x:1.75,y:0},'x'),undefined);
  assert.throws(()=>snapRegionTranslation({...target,owner:{...target.owner,b:0}},{x:3,y:4},null),/cannot be inverted/);
});

test('Region position preview preserves active representation and unrelated alternatives',()=>{
  const active=slots[0].attachments[0],alternative={...active,id:99,region:{...active.region,x:6}};
  const before={...slots[0],attachments:[active,alternative]};
  const edited=previewRegionPosition([before,slots[1]],{type:'setRegionPosition',id:active.id,x:8.5});
  assert.deepEqual(edited[0].region,{...active.region,x:8.5});
  assert.equal(edited[0].attachments[0].region,edited[0].region);
  assert.equal(edited[0].attachments[0].type,'region');
  assert.equal(edited[0].attachments[0].mesh,null);
  assert.equal(edited[0].attachments[1],alternative);
  assert.equal(edited[1],slots[1]);
  assert.equal(before.region.x,0);
});
test('marquee includes polygon crossings, excludes inactive/hidden images and respects affine owners',()=>{
  assert.deepEqual(sceneImagesInBox(bones,slots,{x:-100,y:-100},{x:200,y:100}),[10,11]);
  assert.deepEqual(sceneImagesInBox(bones,slots,{x:-1,y:-100},{x:1,y:100}),[10]);
  assert.deepEqual(sceneImagesInBox(bones,[{...slots[0],visible:false},{...slots[1],activeAttachmentId:null}],{x:-100,y:-100},{x:200,y:100}),[]);
});
test('atomic group preview transforms each image once under reflected affine owners',()=>{
  const original=JSON.stringify(slots),edit={type:'transformAttachments',ids:[10,11],mode:'rotate',pivotX:50,pivotY:0,dx:0,dy:0,rotation:90,scaleX:1,scaleY:1};
  const next=previewAttachmentTransform(bones,slots,edit);
  for(let i=0;i<slots.length;i++){
    const before=imagePolygon(bones,slots[i]),after=imagePolygon(bones,next[i]);
    for(let j=0;j<before.length;j++){assert.ok(Math.abs(after[j].x-(50-before[j].y))<1e-8);assert.ok(Math.abs(after[j].y-(before[j].x-50))<1e-8);}
  }
  assert.equal(JSON.stringify(slots),original);
});
test('mesh marquee tests rendered triangles instead of treating unordered/interior vertices as a boundary',()=>{
 const mesh={weighted:false,bones:[0],vertices:[[0,0],[10,0],[0,10],[100,100]].map(positions=>({weights:[1],positions})),uvs:[0,0,1,0,0,1,.5,.5],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3};
 const s={...slots[0],mesh};
 assert.deepEqual(sceneImagesInBox(bones,[s],{x:1,y:1},{x:2,y:2}),[10]);
 assert.deepEqual(sceneImagesInBox(bones,[s],{x:70,y:70},{x:80,y:80}),[]);
});
test('inactive and hidden geometry resolves current inventory once without changing activation or resurrecting stale inspection',()=>{
 const active=slots[0].attachments[0],inactive={...active,id:35,name:'alternative',region:{...active.region,x:140}},slot={...slots[0],visible:false,attachments:[active,inactive]};
 const stale={...inactive,region:{...inactive.region,x:500}},before=JSON.stringify(slot);
 const geometry=selectedAttachmentGeometry(bones,[slot],[35,35,999],stale);
 assert.equal(geometry.length,1);assert.equal(geometry[0].attachment,inactive);assert.equal(geometry[0].slot,slot);
 assert.equal(geometry[0].points.length,4);assert.ok(Math.abs(geometry[0].points.reduce((n,p)=>n+p.x,0)/4-140)<1e-9);
 assert.equal(resolveAttachment([{...slot,attachments:[]}],35,stale),null,'authoritative empty inventory rejects stale inspected objects');
 assert.equal(resolveAttachment([{...slot,attachments:[active]}],35,stale),null,'authoritative missing inventory item cannot be revived');
 assert.equal(resolveAttachment([],35,stale),null,'missing owner never gets a synthetic slot');
 assert.equal(resolveAttachment([{...slot,attachments:undefined}],35,stale).attachment,stale,'inspection fallback is limited to legacy absent inventory');
 const legacy={...slot,attachments:undefined,activeAttachmentId:90};
 assert.equal(resolveAttachment([legacy],90).attachment.id,90);assert.equal(resolveAttachment([legacy],91),null);
 assert.equal(JSON.stringify(slot),before);assert.equal(slot.activeAttachmentId,active.id);
 assert.equal(selectedAttachmentGeometry(bones,[{...slot,activeAttachmentId:null}],[35]).length,1);
});

test('clip selection geometry uses authored dense vertices and evaluated affine matrices independently of hull display',()=>{
 const evaluated=[{...bones[0],evaluatedWorld:{x:20,y:-10,a:2,b:0,c:0,d:1}},{...bones[1],evaluatedWorld:{x:-8,y:30,a:0,b:-1,c:3,d:0}}];
 const rows=[[0,0],[10,0],[3,3],[10,10],[0,10]].map(([x,y])=>({weights:[.25,.75],positions:[x,y,x+2,y-3]}));
 const clip={endSlot:0,convex:true,inverse:true,color:0x8040ffff,weighted:true,bones:[0,1],vertices:rows,edges:[0,1,1,2,2,3,3,4,4,0]},attachment={id:45,slot:0,name:'clip',type:'clipping',clipping:clip,region:null,mesh:null,imageAvailable:false};
 const slot={...slots[0],visible:false,activeAttachmentId:null,attachments:[attachment]},points=attachmentGeometry(evaluated,slot,attachment);
 assert.equal(points.length,5,'concave authored point is retained even when the visual mask is a hull');
 rows.forEach((row,i)=>{const [x,y,u,v]=row.positions;assert.deepEqual(points[i],{x:.25*(20+2*x)+.75*(-8+3*v),y:.25*(-10+y)+.75*(30-u)});});
 assert.equal(clip.vertices,rows);assert.equal(attachment.region,null);assert.equal(attachment.mesh,null);
});

test('mixed inactive mesh, region and weighted clip previews share one pivot and preserve metadata and unrelated inventory',()=>{
 const mesh={weighted:true,bones:[0,1],vertices:[[0,0],[20,0],[0,20]].map(([x,y])=>({weights:[.3,.7],positions:[x,y,x-30,y+4]})),uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3};
 const a={...slots[0].attachments[0],id:60,type:'mesh',mesh},c={id:61,slot:1,name:'mask',type:'clipping',region:null,mesh:null,imageAvailable:false,clipping:{endSlot:1,convex:false,inverse:false,color:0x8040ffff,weighted:true,bones:[0,1],vertices:structuredClone(mesh.vertices),edges:[0,1,1,2,2,0]}};
 const inventory=[{...slots[0],attachments:[slots[0].attachments[0],a]},{...slots[1],visible:false,attachments:[slots[1].attachments[0],c]}],ids=[60,11,61],snapshot=JSON.stringify(inventory);
 const rotation={type:'transformAttachments',ids,mode:'rotate',pivotX:23,pivotY:-17,rotation:63,scaleX:1,scaleY:1,dx:0,dy:0},scale={...rotation,mode:'scale',scaleX:1.7,scaleY:1};
 const rotated=previewAttachmentTransform(bones,inventory,rotation),scaled=previewAttachmentTransform(bones,rotated,scale),r=63*Math.PI/180;
 for(const id of ids){
  const before=selectedAttachmentGeometry(bones,inventory,[id])[0],after=selectedAttachmentGeometry(bones,scaled,[id])[0];
  before.points.forEach((p,i)=>{const x=p.x-23,y=p.y+17,expectedX=23+1.7*(x*Math.cos(r)-y*Math.sin(r)),expectedY=-17+x*Math.sin(r)+y*Math.cos(r);assert.ok(Math.abs(after.points[i].x-expectedX)<1e-8);assert.ok(Math.abs(after.points[i].y-expectedY)<1e-8);});
 }
 assert.equal(scaled[0].activeAttachmentId,10);assert.equal(scaled[1].activeAttachmentId,11);assert.equal(scaled[0].attachments[0],inventory[0].attachments[0]);
 assert.equal(scaled[0].attachments[1].mesh.vertices[0].weights,mesh.vertices[0].weights);
 const nextClip=scaled[1].attachments[1].clipping;assert.equal(nextClip.bones,c.clipping.bones);assert.equal(nextClip.edges,c.clipping.edges);assert.equal(nextClip.endSlot,1);assert.equal(nextClip.color,c.clipping.color);assert.equal(nextClip.convex,false);assert.equal(nextClip.inverse,false);
 assert.equal(JSON.stringify(inventory),snapshot,'previews cannot mutate authoritative input');
});
test('clip preview rejects zero/nonfinite rows and missing/singular positive influences without mutating source',()=>{
 const clip={endSlot:0,convex:true,inverse:false,color:0xffffffff,weighted:true,bones:[0,1],vertices:[[0,0],[10,0],[0,10]].map(([x,y])=>({weights:[.25,.75],positions:[x,y,x,y]})),edges:[0,1,1,2,2,0]},attachment={id:62,slot:0,name:'mask',type:'clipping',region:null,mesh:null,imageAvailable:false,clipping:clip};
 const slot={...slots[0],attachments:[attachment],activeAttachmentId:null},edit={type:'transformAttachments',ids:[62],mode:'rotate',pivotX:3,pivotY:4,rotation:35,scaleX:1,scaleY:1,dx:0,dy:0};
 for(const [poses,mutate,pattern]of[
  [bones,c=>{c.vertices[0].weights=[0,0];},/invalid vertex row/],
  [bones,c=>{c.vertices[0].weights=[NaN,.75];},/invalid vertex row/],
  [bones,c=>{c.vertices[0].positions[0]=Infinity;},/invalid vertex row/],
  [[bones[0]],()=>{},/no longer exists/],
  [[bones[0],{...bones[1],scaleX:0}],()=>{},/cannot be inverted/],
 ]){const source=structuredClone(slot);mutate(source.attachments[0].clipping);const before=structuredClone(source);assert.throws(()=>previewAttachmentTransform(poses,[source],edit),pattern);assert.deepEqual(source,before);}
});
