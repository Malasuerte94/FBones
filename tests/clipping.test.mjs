import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clippingScopes,clippingPolygon,clippingAllows,polygonContains} from '../src/domain/clipping.ts';
const bones=[{id:0,parent:null,name:'root',x:10,y:20,rotation:0,length:0}];
const clip={endSlot:2,convex:false,inverse:false,color:0xffffffff,weighted:false,bones:[0],vertices:[[0,0],[10,0],[10,10],[5,3],[0,10]].map(positions=>({weights:[1],positions})),edges:[0,1,1,2,2,3,3,4,4,0]};
const attachment={id:30,slot:0,name:'cut',type:'clipping',clipping:clip,region:null,mesh:null,imageAvailable:false};
const slot=(id,attachments=[],activeAttachmentId=null)=>({id,name:`slot${id}`,bone:0,visible:true,blend:'normal',region:null,imageAvailable:false,attachments,activeAttachmentId});
const slots=[slot(0,[attachment],30),slot(1),slot(2),slot(3)];
test('clipping range includes end, self covers remaining slots, active-none does not mask',()=>{
  assert.deepEqual([...clippingScopes(slots).masks.keys()],[0,1,2]);
  const self={...attachment,clipping:{...clip,endSlot:0}};
  assert.deepEqual([...clippingScopes([slot(0,[self],30),...slots.slice(1)]).masks.keys()],[0,1,2,3]);
  assert.equal(clippingScopes([slot(0,[attachment]),...slots.slice(1)]).masks.size,0);
});
test('weighted affine boundary, concavity, convex and inverse respect actual binding',()=>{
  const polygon=clippingPolygon(bones,clip);
  assert.deepEqual(polygon[0],{x:10,y:20});
  assert.equal(polygonContains(polygon,{x:15,y:28}),false);
  assert.equal(polygonContains(polygon,{x:11,y:21}),true);
  assert.equal(polygonContains(polygon,{x:10,y:20}),true);
  assert.equal(clippingPolygon(bones,{...clip,convex:true}).length,4);
  assert.equal(clippingAllows(bones,slots,1,{x:15,y:28}),false);
  const inverse=[slot(0,[{...attachment,clipping:{...clip,inverse:true}}],30),...slots.slice(1)];
  assert.equal(clippingAllows(bones,inverse,1,{x:15,y:28}),false,'Inverse cuts the convex hull, including the concave notch');
  assert.equal(clippingAllows(bones,inverse,1,{x:25,y:35}),true);
  assert.equal(clippingAllows(bones,inverse,1,{x:11,y:21}),false);
  assert.equal(clippingAllows(bones,inverse,3,{x:11,y:21}),true);
});
test('nonoverlapping ranges stay independent and overlapping ranges are reported',()=>{
  const second={...attachment,id:31,slot:3,clipping:{...clip,endSlot:3}};
  const independent=[...slots.slice(0,3),slot(3,[second],31),slot(4)];
  assert.equal(clippingScopes(independent).masks.get(4).id,31);
  assert.deepEqual(clippingScopes(independent).issues,[]);
  const overlap=[slots[0],slot(1,[{...second,slot:1}],31),...slots.slice(2)];
  assert.equal(clippingScopes(overlap).issues.length,1);
});
