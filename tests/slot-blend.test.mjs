import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {pixiSlotBlend} from '../src/domain/slotBlend.ts';
import {Color} from 'pixi.js';

test('the four proven slot modes map explicitly to standard Pixi modes; unknown modes never silently downgrade',()=>{
 assert.deepEqual(['normal','additive','multiply','screen'].map(pixiSlotBlend),['normal','add','multiply','screen']);
 assert.equal(pixiSlotBlend(undefined),'normal');
 assert.throws(()=>pixiSlotBlend('darken'),/Unsupported/);
});

const built=await build({stdin:{contents:"import {ImageLayer} from './src/viewport/ImageLayer.ts'; globalThis.Layer=ImageLayer;",resolveDir:process.cwd()},
 bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',plugins:[{name:'blend-renderer',setup(b){
  b.onResolve({filter:/^pixi\.js$/},()=>({path:'pixi',namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
   export const Color=globalThis.ActualPixiColor;
   export class ColorMatrixFilter {matrix=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0];resources={colorMatrixUniforms:{update(){}}};constructor(options){this.options=options}destroy(){this.destroyed=true}}
   export class Container {children=[];addChild(...items){this.children.push(...items)}setChildIndex(node,index){this.children.splice(this.children.indexOf(node),1);this.children.splice(index,0,node)}destroy(){}}
   export class Graphics {clear(){return this}poly(){return this}fill(){return this}stroke(){return this}circle(){return this}moveTo(){return this}lineTo(){return this}destroy(){}}
   export class Texture {static from(){return {width:32,height:24,destroy(){}}}}
   export class Sprite {constructor(o){Object.assign(this,o)}setFromMatrix(matrix){this.matrix=matrix}setMask(o){this.mask=o.mask;this.inverseMask=o.inverse}destroy(){}}
   export class Mesh {constructor(o){Object.assign(this,o)}setMask(o){this.mask=o.mask;this.inverseMask=o.inverse}destroy(){}}
   export class MeshGeometry {constructor(o){Object.assign(this,o)}destroy(){}}
   export class Matrix {constructor(...values){this.values=values}}
  `}));
 }}]});
test('actual ImageLayer assigns region and mesh blends without regrouping draw order or changing tint/opacity',async()=>{
 const context=vm.createContext({Image:class {async decode(){}},console,ActualPixiColor:Color});
 vm.runInContext(built.outputFiles[0].text,context);
 const layer=new context.Layer(async()=> 'owned-test-image',()=>{});
 const bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0}];
 const mesh={weighted:false,bones:[0],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3,
  vertices:[[-16,12],[16,12],[-16,-12]].map(positions=>({weights:[1],positions}))};
 const slots=['normal','additive','multiply','screen'].map((blend,i)=>({id:i,name:`slot${i}`,bone:0,blend,color:0x4488cc80,
  visible:true,imageAvailable:true,region:{image:'owned',name:'owned',x:i*40,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},mesh:i===2?mesh:null}));
 const draw=items=>layer.draw(1,bones,items,null,(x,y)=>({x,y}),1);
 draw(slots);await new Promise(resolve=>setImmediate(resolve));draw(slots);
 const nodes=Array.from(layer.container.children);assert.equal(nodes.length,4);
 assert.deepEqual(nodes.map(n=>n.blendMode),['normal','add','multiply','screen']);
 assert.ok(nodes[2].geometry,'mesh path uses the same slot blend');
 for(const node of nodes){assert.equal(node.tint,0x4488cc);assert.equal(node.alpha,128/255);}
 draw([slots[3],slots[1],slots[0],slots[2]]);
 assert.deepEqual(Array.from(layer.container.children),[nodes[3],nodes[1],nodes[0],nodes[2]],'modes cannot reorder authoritative draw order');
 draw(slots.map((s,i)=>({...s,blend:'normal',color:i===0?0x4488cc00:0x4488ccff,visible:i!==3})));
 assert.equal(nodes[0].alpha,0);assert.equal(nodes[1].alpha,1);assert.equal(nodes[3].visible,false);
 assert.ok(nodes.every(n=>n.blendMode==='normal'),'changing an existing node resets its prior mode');
 assert.equal(slots[0].color,0x4488cc80);layer.destroy();
});

test('actual ImageLayer applies independent active attachment tint to Region and Mesh and clears it on activation changes',async()=>{
 const context=vm.createContext({Image:class {async decode(){}},console,ActualPixiColor:Color});vm.runInContext(built.outputFiles[0].text,context);
 const layer=new context.Layer(async()=> 'own-tinted-image',()=>{}),bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0}];
 const region={image:'owned',name:'owned',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24};
 const mesh={weighted:false,bones:[0],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[],hull:3,vertices:[[-16,12],[16,12],[-16,-12]].map(positions=>({weights:[1],positions}))};
 const slots=[false,true].map((isMesh,i)=>({id:i,name:'tinted'+i,bone:0,blend:'normal',color:0xffffffff,animatedColor:[.5,.25,1,.123456789],visible:true,imageAvailable:true,region,mesh:isMesh?mesh:null,activeAttachmentId:10+i*2,attachments:[{id:10+i*2,slot:i,name:'active',type:isMesh?'mesh':'region',region,mesh:isMesh?mesh:null,clipping:null,imageAvailable:true,color:0x8040ff80},{id:11+i*2,slot:i,name:'inactive',type:'region',region,mesh:null,clipping:null,imageAvailable:true,color:0xffffffff}]}));
 const draw=items=>layer.draw(1,bones,items,null,(x,y)=>({x,y}),1);draw(slots);await new Promise(resolve=>setImmediate(resolve));draw(slots);
 const nodes=Array.from(layer.container.children);assert.equal(nodes.length,2);assert.ok(nodes[1].geometry);
 for(const node of nodes){assert.equal(node.tint,0x4010ff);assert.equal(node.alpha,.123456789*128/255);}
 const untinted=slots.map(s=>({...s,activeAttachmentId:s.activeAttachmentId+1,color:0x4488cc80,animatedColor:undefined,mesh:null}));draw(untinted);
 const activeNodes=Array.from(layer.container.children).filter(node=>node.visible);assert.equal(activeNodes.length,2);
 for(const node of activeNodes){assert.equal(node.tint,0x4488cc);assert.equal(node.alpha,128/255);}
 assert.equal(slots[0].attachments[0].color,0x8040ff80);layer.destroy();
});

test('actual two-color Region and Mesh path owns per-slot filters, preserves masks/order/output blends and releases them with nodes',async()=>{
 const context=vm.createContext({Image:class{async decode(){}},console,ActualPixiColor:Color});vm.runInContext(built.outputFiles[0].text,context);
 const layer=new context.Layer(async()=> 'own-two-color-image',()=>{}),bones=[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0}],region={image:'owned',name:'owned',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24};
 const mesh={weighted:false,bones:[0],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[],hull:3,vertices:[[-16,12],[16,12],[-16,-12]].map(positions=>({weights:[1],positions}))};
 const slots=['normal','additive','multiply','screen'].map((blend,i)=>({id:i+1,name:'dark'+i,bone:0,blend,color:0xffffffff,animatedColor:[0,.5,.75,.25],tintBlack:true,darkColor:0xffffffff,animatedDarkColor:[1,.25,.5],region,mesh:i===2?mesh:null,visible:true,imageAvailable:true,activeAttachmentId:10+i,attachments:[{id:10+i,slot:i+1,name:'own',type:i===2?'mesh':'region',region,mesh:i===2?mesh:null,clipping:null,imageAvailable:true,color:0x0000ff80}]}));
 const clipping={id:99,slot:0,name:'own mask',type:'clipping',region:null,mesh:null,clipping:{endSlot:4,convex:true,inverse:true,color:0xffffffff,weighted:false,bones:[0],vertices:[[-20,-20],[20,-20],[20,20],[-20,20]].map(positions=>({weights:[1],positions})),edges:[]}},maskSlot={id:0,name:'mask',bone:0,blend:'normal',region:null,visible:true,imageAvailable:false,activeAttachmentId:99,attachments:[clipping]};
 const draw=items=>layer.draw(1,bones,[maskSlot,...items],null,(x,y)=>({x,y}),1);draw(slots);await new Promise(resolve=>setImmediate(resolve));draw(slots);
 const nodes=slots.map(s=>layer.sprites.get(s.id)),filters=nodes.map(n=>n.filters[0]);assert.equal(layer.darkFilters.size,4);assert.ok(nodes[2].geometry);
 for(let i=0;i<4;i++){const node=nodes[i],filter=filters[i];assert.equal(node.tint,0xffffff,'zero attachment/light RGB must not destroy the source before dark remap');assert.equal(node.alpha,.25*128/255);assert.equal(node.blendMode,'normal');assert.equal(filter.blendMode,['normal','add','multiply','screen'][i]);assert.deepEqual(JSON.parse(JSON.stringify(filter.options)),{resolution:'inherit',antialias:'inherit'});assert.ok(node.mask);assert.equal(node.inverseMask,true);assert.equal(filter.matrix[4],1);assert.equal(filter.matrix[9],.25);assert.equal(filter.matrix[14],.5);}
 draw([slots[3],slots[1],slots[0],slots[2]]);assert.deepEqual(Array.from(layer.container.children).filter(n=>n.texture),[nodes[3],nodes[1],nodes[0],nodes[2]]);assert.deepEqual(nodes.map(n=>n.filters[0]),filters,'redraw keeps per-node resources');
 draw(slots.map(s=>({...s,tintBlack:false,color:0x4488cc80,animatedColor:undefined,attachments:s.attachments.map(a=>({...a,color:0xffffffff}))})));for(let i=0;i<4;i++){assert.equal(nodes[i].filters.length,0);assert.equal(nodes[i].tint,0x4488cc);assert.equal(nodes[i].blendMode,['normal','add','multiply','screen'][i]);}
 draw(slots);assert.deepEqual(nodes.map(n=>n.filters[0]),filters);layer.destroy();assert.equal(layer.darkFilters.size,0);assert.ok(filters.every(f=>f.destroyed));
});
