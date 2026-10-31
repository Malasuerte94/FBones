import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {pixiSlotBlend} from '../src/domain/slotBlend.ts';

test('the four proven slot modes map explicitly to standard Pixi modes; unknown modes never silently downgrade',()=>{
 assert.deepEqual(['normal','additive','multiply','screen'].map(pixiSlotBlend),['normal','add','multiply','screen']);
 assert.equal(pixiSlotBlend(undefined),'normal');
 assert.throws(()=>pixiSlotBlend('darken'),/Unsupported/);
});

const built=await build({stdin:{contents:"import {ImageLayer} from './src/viewport/ImageLayer.ts'; globalThis.Layer=ImageLayer;",resolveDir:process.cwd()},
 bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',plugins:[{name:'blend-renderer',setup(b){
  b.onResolve({filter:/^pixi\.js$/},()=>({path:'pixi',namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
   export class Container {children=[];addChild(...items){this.children.push(...items)}setChildIndex(node,index){this.children.splice(this.children.indexOf(node),1);this.children.splice(index,0,node)}destroy(){}}
   export class Graphics {clear(){return this}poly(){return this}fill(){return this}stroke(){return this}circle(){return this}moveTo(){return this}lineTo(){return this}destroy(){}}
   export class Texture {static from(){return {width:32,height:24,destroy(){}}}}
   export class Sprite {constructor(o){Object.assign(this,o)}setFromMatrix(matrix){this.matrix=matrix}destroy(){}}
   export class Mesh {constructor(o){Object.assign(this,o)}destroy(){}}
   export class MeshGeometry {constructor(o){Object.assign(this,o)}destroy(){}}
   export class Matrix {constructor(...values){this.values=values}}
  `}));
 }}]});
test('actual ImageLayer assigns region and mesh blends without regrouping draw order or changing tint/opacity',async()=>{
 const context=vm.createContext({Image:class {async decode(){}},console});
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
