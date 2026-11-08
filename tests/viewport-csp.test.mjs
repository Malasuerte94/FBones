import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

async function runUnderStrictCsp(contents) {
  const { outputFiles } = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'browser', format: 'iife',
    target: 'es2022', logLevel: 'silent',
  });
  const context = vm.createContext({
    console, navigator: { userAgent: 'FBones CSP regression' },
    setTimeout, clearTimeout, URL, performance,
  }, { codeGeneration: { strings: false, wasm: false } });
  assert.throws(() => vm.runInContext('new Function("return 1")', context), /Code generation from strings disallowed/);
  vm.runInContext(outputFiles[0].text, context);
  return context;
}

test('unpatched Pixi reproduces the application CSP failure without requiring a GPU', async () => {
  const context = await runUnderStrictCsp(`
    import { WebGLRenderer } from 'pixi.js';
    try { WebGLRenderer.prototype._unsafeEvalCheck.call({}); }
    catch (error) { globalThis.failure = error.message; }
  `);
  assert.match(context.failure, /Current environment does not allow unsafe-eval/);
});

test('the actual viewport entry installs static Pixi implementations under the shipped CSP', async () => {
  const config = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8'));
  const scripts = config.app.security.csp.split(';').find(d => d.trim().startsWith('script-src'));
  assert.ok(scripts);
  assert.equal(scripts.includes("'unsafe-eval'"), false);
  const context = await runUnderStrictCsp(`
    import { createViewport } from './src/viewport/createViewport.ts';
    import { WebGLRenderer } from 'pixi.js';
    globalThis.viewportFactory = createViewport;
    WebGLRenderer.prototype._unsafeEvalCheck.call({});
    globalThis.passed = true;
  `);
  assert.equal(typeof context.viewportFactory, 'function');
  assert.equal(context.passed, true);
});

test('actual Region and Mesh two-color filter construction and cleanup work with string code generation blocked',async()=>{
 // Actual Pixi8.8 classes/programs/uniform groups and ImageLayer, with only a
 // no-context canvas adapter. No WebGL/WebGPU draw or pixel proof is claimed.
 const context=await runUnderStrictCsp(`
  import {createViewport} from './src/viewport/createViewport.ts';
  import {ImageLayer} from './src/viewport/ImageLayer.ts';
  import {DOMAdapter,Texture,BufferImageSource,WebGLRenderer} from 'pixi.js';
  DOMAdapter.set({...DOMAdapter.get(),createCanvas:()=>({getContext:()=>null})});
  WebGLRenderer.prototype._unsafeEvalCheck.call({});
  const layer=new ImageLayer(async()=>{throw Error('No image request');},()=>{});
  const bones=[{id:0,parent:null,name:'own',x:0,y:0,rotation:0,length:0}];
  layer.draw(1,bones,[],null,(x,y)=>({x,y}),1);
  layer.textures.set('own',new Texture({source:new BufferImageSource({resource:new Uint8Array([0,0,0,255]),width:1,height:1})}));
  const region={name:'own',image:'own',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24};
  const mesh={weighted:false,bones:[0],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[],hull:3,vertices:[[0,0],[32,0],[0,24]].map(positions=>({weights:[1],positions}))};
  const slots=[null,mesh].map((value,id)=>({id,name:'own'+id,bone:0,blend:'additive',visible:true,imageAvailable:true,region,mesh:value,color:0x00000080,tintBlack:true,darkColor:0x008040ff}));
  layer.draw(1,bones,slots,null,(x,y)=>({x,y}),1);
  const filters=[...layer.darkFilters.values()];
  globalThis.filterCount=filters.length;
  globalThis.filterState=filters.map(f=>({matrix:[...f.matrix],blend:f.blendMode,gl:!!f.glProgram,gpu:!!f.gpuProgram}));
  layer.destroy();globalThis.remaining=layer.darkFilters.size;globalThis.passed=true;
 `);
 assert.equal(context.passed,true);assert.equal(context.filterCount,2);assert.equal(context.remaining,0);
 for(const filter of context.filterState){assert.equal(filter.blend,'add');assert.equal(filter.gl,true);assert.equal(filter.gpu,true);assert.equal(filter.matrix[9],128/255);assert.equal(filter.matrix[14],64/255);}
});
