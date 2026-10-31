import {test} from 'node:test';
import assert from 'node:assert/strict';
import {worldBones,localPoint,creation,previewEdit,previewTransformBones} from '../src/domain/rig.ts';
import {meshPoints,previewVertices} from '../src/domain/meshes.ts';
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-5,`${x} != ${y}`);
const root={id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0};
const bone=(id,parent,x,y)=>({id,parent,name:`bone${id}`,x,y,rotation:0,length:40});
const transform=(ids,mode,values={})=>({type:'transformBones',ids,mode,pivotX:0,pivotY:0,dx:0,dy:0,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0,...values});
test('nonuniform scale and shear transform children, tips and image-mesh vertices in one affine space',()=>{
 const bones=[{...root,x:5,y:7,scaleX:2,scaleY:.5,shearX:30,shearY:-15},{...bone(1,0,10,0),rotation:90}];
 const poses=worldBones(bones);near(poses[1].worldX,22.3205080757);near(poses[1].worldY,17);near(poses[1].tipX,27.4968889778);near(poses[1].tipY,36.3185165258);
 const point=localPoint(poses[0],poses[1].worldX,poses[1].worldY);near(point.x,10);near(point.y,0);
 const mesh={bones:[1],vertices:[{weights:[1],positions:[40,0]}]};const rendered=meshPoints(bones,mesh)[0];near(rendered.x,poses[1].tipX);near(rendered.y,poses[1].tipY);
 const moved=previewVertices(bones,mesh,[{vertex:0,x:50,y:-10}]);near(meshPoints(bones,moved)[0].x,50);near(meshPoints(bones,moved)[0].y,-10);
 const created=creation(bones,0,{x:poses[1].worldX,y:poses[1].worldY},{x:poses[1].worldX+poses[0].a*20,y:poses[1].worldY+poses[0].b*20});near(created.length,20);near(created.rotation,0);
});
test('group operations transform selected ancestor chains once while pose preserves each origin',()=>{
 const bones=[root,bone(1,0,10,0),bone(2,1,10,0),bone(3,0,0,20)];
 const rotated=worldBones(previewTransformBones(bones,transform([1,2],'rotate',{rotation:90,pivotX:10})));
 near(rotated[1].worldX,10);near(rotated[1].worldY,0);near(rotated[2].worldX,10);near(rotated[2].worldY,10);near(rotated[2].x,10);near(rotated[1].length,40);near(rotated[3].worldY,20);
 const scaled=worldBones(previewTransformBones(bones,transform([1,2],'scale',{scaleX:2,scaleY:.5})));near(scaled[2].worldX,40);near(scaled[2].x,10);
 const posed=worldBones(previewTransformBones(bones,transform([1,3],'pose',{rotation:90})));near(posed[1].worldX,10);near(posed[1].worldY,0);near(posed[3].worldX,0);near(posed[3].worldY,20);near(posed[2].worldX,10);near(posed[2].worldY,10);
 assert.deepEqual(bones,[root,bone(1,0,10,0),bone(2,1,10,0),bone(3,0,0,20)]);
});
test('length editing preserves rotation and singular inverse operations fail explicitly',()=>{
 const bones=[root,{...bone(1,0,10,0),rotation:30,scaleX:2,shearX:10}];const p=worldBones(bones)[1];
 const changed=previewEdit(bones,{type:'length',id:1,x:p.worldX+p.a*70,y:p.worldY+p.b*70});near(changed[1].length,70);assert.equal(changed[1].rotation,30);assert.equal(changed[1].shearX,10);
 assert.throws(()=>localPoint(worldBones([{...root,scaleX:0}])[0],5,5),/cannot be inverted/);
});
