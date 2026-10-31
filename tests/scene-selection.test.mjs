import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneImagesInBox,previewAttachmentTransform,imagePolygon,resolveAttachment,attachmentGeometry,selectedAttachmentGeometry} from '../src/domain/sceneSelection.ts';
const bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0},{id:1,parent:0,name:'affine',x:100,y:20,rotation:30,length:50,scaleX:1.2,scaleY:-.8,shearY:15}];
const make=(id,bone)=>{const region={image:`i${id}`,name:`i${id}`,x:0,y:0,rotation:10,scaleX:1,scaleY:1,width:40,height:20};const a={id:id+10,slot:id,name:region.name,type:'region',region,mesh:null,clipping:null,imageAvailable:true};return{id,bone,name:region.name,blend:'normal',visible:true,region,imageAvailable:true,attachments:[a],activeAttachmentId:a.id};};
const slots=[make(0,0),make(1,1)];
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
