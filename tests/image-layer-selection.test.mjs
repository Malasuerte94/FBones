// Exercise the actual ImageLayer draw path; a Pixi recorder replaces only GPU
// allocation. Actual WebView pixels and mouse interaction remain Windows gates.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {Color} from 'pixi.js';
import {previewAttachmentTransform,previewAttachmentBinding} from '../src/domain/sceneSelection.ts';
import {previewBindingWeights,bindingWeightColor} from '../src/domain/binding.ts';
import {weightInfluenceColor} from '../src/domain/colors.ts';

const built=await build({stdin:{contents:"import {ImageLayer} from './src/viewport/ImageLayer.ts'; globalThis.Layer=ImageLayer;",resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',plugins:[{name:'selection-recorder',setup(b){
 b.onResolve({filter:/^pixi\.js$/},()=>({path:'pixi',namespace:'recorder'}));
 b.onLoad({filter:/.*/,namespace:'recorder'},()=>({contents:`
  export const Color=globalThis.ActualPixiColor;
  export class ColorMatrixFilter {}
  export class Container {children=[];addChild(...items){this.children.push(...items)}setChildIndex(node,index){this.children.splice(this.children.indexOf(node),1);this.children.splice(index,0,node)}destroy(){}}
  export class Graphics {ops=[];clear(){this.ops=[];return this}poly(points){this.ops.push({kind:'poly',points:[...points]});return this}fill(style){this.ops.push({kind:'fill',style});return this}stroke(style){this.ops.push({kind:'stroke',style});return this}circle(x,y,radius){this.ops.push({kind:'circle',x,y,radius});return this}moveTo(x,y){this.ops.push({kind:'moveTo',x,y});return this}lineTo(x,y){this.ops.push({kind:'lineTo',x,y});return this}arc(x,y,radius,start,end){this.ops.push({kind:'arc',x,y,radius,start,end});return this}closePath(){return this}destroy(){}}
  export class Texture {static from(){return {width:20,height:20,destroy(){}}}}
  export class Sprite {maskUpdates=0;constructor(o){Object.assign(this,o)}setFromMatrix(matrix){this.matrix=matrix}setMask(o){this.mask=o.mask;this.maskUpdates++}destroy(){}}
  export class Mesh {constructor(o){Object.assign(this,o)}setMask(o){this.mask=o.mask}destroy(){}}
  export class MeshGeometry {constructor(o){Object.assign(this,o)}destroy(){}}
  export class Matrix {constructor(...values){this.values=values}}
 `}));
}}]});
const bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0},{id:7,parent:0,name:'tip',x:40,y:0,rotation:0,length:20}];
function region(id,x,slot=0){return{id,slot,name:'part'+id,type:'region',region:{image:'part'+id,name:'part'+id,x,y:0,rotation:0,scaleX:1,scaleY:1,width:20,height:20},mesh:null,clipping:null,imageAvailable:true};}
function clip(id,x){return{id,slot:0,name:'mask'+id,type:'clipping',region:null,mesh:null,imageAvailable:false,clipping:{endSlot:1,convex:true,inverse:false,color:0x8040ffff,weighted:false,bones:[0],vertices:[[x,0],[x+20,0],[x+20,20],[x,20]].map(positions=>({weights:[1],positions})),edges:[0,1,1,2,2,3,3,0]}};}
const plain=value=>JSON.parse(JSON.stringify(value));
function setup(slots){
 const context=vm.createContext({console,ActualPixiColor:Color}),requests=[];vm.runInContext(built.outputFiles[0].text,context);
 const layer=new context.Layer(async(name)=>{requests.push(name);throw new Error('Unexpected image request');},()=>{});
 // Establish the document once, then inject the one active texture. Inactive
 // selection must neither allocate sprites nor attempt a resource load.
 layer.draw(1,bones,[],null,(x,y)=>({x,y}),1);
 for(const slot of slots)if(slot.region)layer.textures.set(slot.region.image,{width:20,height:20,destroy(){}});
 const draw=(items,ids,inspected,mode='images',influence=null,view={})=>layer.draw(1,bones,items,inspected?.slot??null,(x,y)=>({x,y}),1,undefined,mode,view.activeVertex??null,influence,{ids,inspected,...view});
 return{layer,draw,requests};
}
test('every inactive/hidden selected ghost follows preview inventory while stale inspection cannot activate or duplicate it',()=>{
 const a=region(10,0),b=region(11,100),c=region(12,200),slot={id:0,name:'slot',bone:0,blend:'normal',visible:true,imageAvailable:true,region:a.region,mesh:null,attachments:[a,b,c],activeAttachmentId:10};
 const edit={type:'transformAttachments',ids:[11,12],mode:'translate',pivotX:0,pivotY:0,dx:50,dy:7,rotation:0,scaleX:1,scaleY:1},preview=previewAttachmentTransform(bones,[slot],edit),snapshot=JSON.stringify(preview);
 const {layer,draw,requests}=setup([slot]);draw(preview,[11,12,11],b);
 const outlineStarts=plain(layer.overlay.ops.filter(op=>op.kind==='moveTo').map(({x,y})=>[x,y]));
 assert.deepEqual(outlineStarts,[[140,-3],[140,17],[160,17],[160,-3],[240,-3],[240,17],[260,17],[260,-3]],'both preview quad ghosts use transformed inventory, not the old inspected B');
 assert.equal(layer.sprites.size,1);assert.equal(layer.container.children.filter(node=>'texture'in node).length,1);assert.equal(layer.masks.size,0);assert.deepEqual(requests,[]);assert.equal(preview[0].activeAttachmentId,10);assert.equal(JSON.stringify(preview),snapshot);
 draw([{...preview[0],visible:false}],[10,11],b);
 assert.equal(layer.sprites.get(0).visible,false);assert.equal(layer.overlay.ops.filter(op=>op.kind==='poly').length,1);assert.equal(layer.overlay.ops.filter(op=>op.kind==='moveTo').length,4,'hidden active A and inactive preview B each retain a selected outline');
 draw(preview,[10,11],b);assert.equal(layer.overlay.ops.filter(op=>op.kind==='poly').length,1);assert.equal(layer.overlay.ops.filter(op=>op.kind==='moveTo').length,4,'active selection is drawn once alongside one inactive preview ghost');
 draw([{...slot,attachments:[a]}],[11],b);assert.equal(layer.overlay.ops.filter(op=>op.kind==='poly').length,0,'stale inspected B cannot revive an attachment removed from explicit inventory');layer.destroy();
});

test('pies use the inspected sibling binding and expose the actual color, selected radius and filtered points',()=>{
 const mesh=(id,x)=>{
   const attachment=region(id,0), points=[[x,10],[x+20,10],[x,30]];
   return {...attachment,type:'mesh',mesh:{weighted:true,bones:[0,7],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3,
     vertices:points.map(([px,py],index)=>({weights:index===1?[1,0]:[.25,.75],positions:[px,py,px-40,py]}))}};
 };
 const active=mesh(10,0),inactive=mesh(11,100);
 const slots=[{id:0,name:'siblings',bone:0,blend:'normal',visible:true,imageAvailable:true,region:active.region,
   mesh:active.mesh,attachments:[active,inactive],activeAttachmentId:10}];
 const {layer,draw,requests}=setup(slots);
 const view={activeVertex:0,vertices:[0],weightDisplay:{pies:true,selectedOnly:true,influences:[7]}};
 const snapshot=JSON.stringify(slots);
 draw(slots,[10,11],inactive,'weights',7,view);
 const arcs=plain(layer.overlay.ops.filter(op=>op.kind==='arc'));
 assert.deepEqual(arcs.map(({x,y,radius})=>[x,y,radius]),[[100,30,6],[100,30,7.5],[100,10,10],[100,10,11.5]]);
 for (const op of arcs.filter((_,index)=>index%2===0)) assert.equal(op.end-op.start,Math.PI/2);
 const sliceColors=layer.overlay.ops.flatMap((op,index)=>op.kind==='arc'?[layer.overlay.ops[index+1].style]:[]);
 assert.deepEqual(plain(sliceColors),[weightInfluenceColor(bones[0],0),weightInfluenceColor(bones[1],1),
   weightInfluenceColor(bones[0],0),weightInfluenceColor(bones[1],1)]);
 assert.ok(layer.overlay.ops.some(op=>op.kind==='circle'&&op.x===120&&op.radius===3.5));
 draw(slots,[10,11],inactive,'weights',7,{...view,weightDisplay:{...view.weightDisplay,pies:false}});
 assert.ok(layer.overlay.ops.every(op=>op.kind!=='arc'));
 assert.ok(layer.overlay.ops.some(op=>op.kind==='circle'&&op.x===100&&op.y===10&&op.radius===9.5));
 assert.deepEqual(requests,[]);
 assert.equal(JSON.stringify(slots),snapshot);
 layer.destroy();
});
test('inactive clipping preview moves its selected outline and vertex handles without altering active mask geometry',()=>{
 const active=clip(20,0),inactive=clip(21,100),image=region(30,0,1),slots=[{id:0,name:'masks',bone:0,blend:'normal',visible:true,imageAvailable:false,region:null,mesh:null,attachments:[active,inactive],activeAttachmentId:20},{id:1,name:'image',bone:0,blend:'normal',visible:true,imageAvailable:true,region:image.region,mesh:null,attachments:[image],activeAttachmentId:30}];
 const edit={type:'transformAttachments',ids:[21],mode:'translate',pivotX:0,pivotY:0,dx:50,dy:7,rotation:0,scaleX:1,scaleY:1},preview=previewAttachmentTransform(bones,slots,edit),{layer,draw,requests}=setup(slots);
 draw(slots,[21],inactive,'clipping');const sprite=layer.sprites.get(1),maskOperations=sprite.mask.ops,originalMask=plain(maskOperations);draw(preview,[21,21],inactive,'clipping');
 assert.equal(sprite.maskUpdates,1,'unchanged mask must stay bound');assert.equal(sprite.mask.ops,maskOperations,'unchanged mask geometry must stay built');
 assert.deepEqual(plain(layer.sprites.get(1).mask.ops),originalMask,'only active clip controls the image mask');assert.equal(layer.masks.size,1);assert.equal(layer.sprites.size,1);assert.deepEqual(requests,[]);
 const outlines=plain(layer.overlay.ops.filter(op=>op.kind==='poly'));assert.equal(outlines.length,2,'active context clip plus exactly one selected inactive clip');
 assert.deepEqual(outlines[1].points,[150,7,170,7,170,27,150,27]);
 assert.deepEqual(plain(layer.overlay.ops.filter(op=>op.kind==='circle').map(({x,y})=>[x,y])),[[150,7],[170,7],[170,27],[150,27]],'vertex handles resolve the new inventory instead of stale inspected coordinates');
 const strokes=plain(layer.overlay.ops.filter(op=>op.kind==='stroke'));assert.equal(strokes[1].style.color,0x71dac4);assert.equal(strokes[1].style.width,2);
 assert.equal(preview[0].activeAttachmentId,20);assert.equal(preview[0].attachments[0],active);layer.destroy();
});
test('real weighted clip overlay uses selected influence colors and authored bind offsets while only active mask deforms',()=>{
 const active=clip(20,0),inactive=clip(21,100),image=region(30,0,1),trail=region(31,105,2);
 for(const a of [active,inactive]){a.clipping.weighted=true;a.clipping.bones=[0,7];a.clipping.vertices=a.clipping.vertices.map(row=>({weights:[.5,.5],positions:[...row.positions,row.positions[0]-20,row.positions[1]+10]}));}
 const slots=[{id:0,name:'masks',bone:0,blend:'normal',visible:true,imageAvailable:false,region:null,mesh:null,attachments:[active,inactive],activeAttachmentId:20},{id:1,name:'image',bone:0,blend:'normal',visible:true,imageAvailable:true,region:image.region,mesh:null,attachments:[image],activeAttachmentId:30},{id:2,name:'trail',bone:0,blend:'normal',visible:true,imageAvailable:true,region:trail.region,mesh:null,attachments:[trail],activeAttachmentId:31}],{layer,draw,requests}=setup(slots);
 draw(slots,[21],inactive,'weights',7);const originalMask=plain(layer.sprites.get(1).mask.ops);
 const changed=previewBindingWeights(bones,inactive.clipping,7,[{vertex:0,value:.75}]),preview=previewAttachmentBinding(slots,21,changed);draw(preview,[21],inactive,'weights',7);
 const ops=plain(layer.overlay.ops),circles=ops.filter(op=>op.kind==='circle');assert.equal(circles.length,4);assert.deepEqual(circles[0],{kind:'circle',x:115,y:7.5,radius:6});
 const index=ops.findIndex(op=>op.kind==='circle');assert.equal(ops[index+1].kind,'fill');assert.equal(ops[index+1].style,bindingWeightColor(.75));
 assert.deepEqual(plain(layer.sprites.get(1).mask.ops),originalMask,'inactive painted clip cannot change active mask');assert.deepEqual(requests,[]);assert.equal(Boolean(layer.sprites.get(2).mask),false);assert.equal(layer.masks.has(2),false,'attachment after end slot remains unmasked');
 const changedActive=previewBindingWeights(bones,active.clipping,7,[{vertex:0,value:.75}]);draw(previewAttachmentBinding(slots,20,changedActive),[20],active,'weights',7);
 assert.notDeepEqual(plain(layer.sprites.get(1).mask.ops),originalMask,'active painted dense rows must reach the real mask');
 const mask=plain(layer.sprites.get(1).mask.ops.find(op=>op.kind==='poly').points),pairs=Array.from({length:mask.length/2},(_,i)=>mask.slice(i*2,i*2+2));assert.ok(pairs.some(([x,y])=>x===15&&y===7.5),'new mask uses unchanged noncoincident bind offsets');assert.equal(Boolean(layer.sprites.get(2).mask),false);assert.equal(layer.masks.has(2),false);layer.destroy();
});
