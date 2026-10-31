// Exercise the real DOM gesture controller without requiring GPU/process IPC.
// Pixi startup/CSP is covered separately against the actual Pixi library.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import {worldBones} from '../src/domain/rig.ts';
const { outputFiles } = await build({
  stdin: { contents: "import {createViewport} from './src/viewport/createViewport.ts'; globalThis.factory=createViewport;", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2022',
  plugins: [{ name: 'test-renderer', setup(bundler) {
    bundler.onResolve({ filter: /^pixi\.js(?:\/unsafe-eval)?$/ }, args => ({ path: args.path, namespace: 'test-pixi' }));
    bundler.onLoad({ filter: /.*/, namespace: 'test-pixi' }, args => ({ contents: args.path.endsWith('unsafe-eval') ? '' : `
      export class Graphics { destroy(){} constructor(){this.circles=[];(globalThis.recordedGraphics??=[]).push(this)} clear(){this.circles=[];return this} rect(){return this} moveTo(){return this} lineTo(){return this} stroke(){return this} fill(){return this} circle(x,y,radius){this.circles.push({x,y,radius});return this} poly(){return this} }
      export class Container { children=[]; addChild(...items){this.children.push(...items)} setChildIndex(){} destroy(){} }
      export class BitmapText { position={set(){}}; constructor(options){this.text=options.text} }
      export class Texture { static from(){return {width:32,height:24,destroy(){}}} }
      export class Sprite { position={set(){}}; scale={set(){}}; constructor(options){this.texture=options.texture} destroy(){} }
      export class Matrix { }
      export class Mesh { }
      export class MeshGeometry { }
      export class Application {
        canvas=globalThis.testCanvas; stage={addChild(){}}; screen={width:800,height:600};
        renderer={resolution:1,resize:(width,height)=>{this.screen={width,height}}};
        async init(){} render(){} destroy(){}
      }` }));
  } }],
});
const bones = [
  { id: 0, parent: null, name: 'root', x: 0, y: 0, rotation: 0, length: 0 },
  { id: 1, parent: 0, name: 'bone1', x: 0, y: 0, rotation: 0, length: 100 },
];
async function setup(tool = 'select', options = {}) {
  const weightSelections=[], vertexSelections=[], slotSelections = [], groupSelections=[], imageSelections=[],drops=[], escapes=[], errors=[];
  const listeners = new Map(), keys = new Map(), captured = new Set(), commits = [], selections = [];
  const canvas = { style: {}, tabIndex: -1, focus(){}, getBoundingClientRect: () => ({ left: 0, top: 0 }),
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name),
    setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id),
    releasePointerCapture: id => { captured.delete(id); listeners.get('lostpointercapture')?.({ pointerId: id }); } };
  const context = vm.createContext({ testCanvas: canvas, console,
    window: { devicePixelRatio: 1, addEventListener: (name, fn) => keys.set(name, fn), removeEventListener: name => keys.delete(name) },
    ResizeObserver: class { observe(){} disconnect(){} },
  });
  vm.runInContext(outputFiles[0].text, context);
  const controller = await context.factory({ clientWidth: 800, clientHeight: 600, appendChild(){} }, () => {}, {
    onSelectVertices:(ids,active)=>{weightSelections.push({ids:Array.from(ids),active});vertexSelections.push(active);},onSelectVertex:index=>vertexSelections.push(index),onSelect: id => selections.push(id), onSelectBones:(ids,active)=>{groupSelections.push({ids:Array.from(ids),active});selections.push(active);},onSelectAttachments:(ids,active)=>imageSelections.push({ids:Array.from(ids),active}), onEscape:()=>escapes.push(true), onImageError:message=>errors.push(message), onDropImage:async(key,x,y)=>{drops.push({key,x,y});return true;}, onSelectSlot: id => slotSelections.push(id), onCommit: async (edit, revision,poseEpoch) => { commits.push({ ...edit, revision,...(poseEpoch===undefined?{}:{poseEpoch}) }); return true; },
    ...options,
  });
  const scene = { bones, selected: 1, tool, editable: true, busy: false, revision: 7 };
  controller.setScene(scene);
  const emit = (name, x, y, extra = {}) => listeners.get(name)?.({ pointerId: 1, button: 0, clientX: x, clientY: y, preventDefault(){}, ...extra });
  const key = (name, value) => keys.get(name)?.({ preventDefault(){}, target: { closest: () => null }, ...value });
  return { weightSelections, controller, graphics:context.recordedGraphics, scene, emit, key, commits, vertexSelections, selections, slotSelections, groupSelections,imageSelections, drops, escapes, errors, captured, listeners, keys, canvas };
}
test('bone dragging previews locally and sends exactly one world-space edit on release', async () => {
  const env = await setup();
  env.emit('pointerdown', 450, 300); env.emit('pointermove', 460, 310); env.emit('pointermove', 470, 320);
  assert.equal(env.commits.length, 0); assert.equal(env.captured.has(1), true);
  env.emit('pointerup', 470, 320); await Promise.resolve();
  assert.deepEqual(JSON.parse(JSON.stringify(env.commits)), [{type:'transformBones',ids:[1],mode:'translate',pivotX:0,pivotY:0,dx:20,dy:-20,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0,revision:7}]);
  assert.equal(env.captured.size, 0); env.controller.destroy();
  assert.equal(env.listeners.size, 0); assert.equal(env.keys.size, 0);
});
test('parent mode intercepts a bone click in every edit mode without selecting, creating, freezing or dragging',async()=>{
 for(const mode of ['bones','images','weights','meshes']){
  const picked=[];let prepared=0;const env=await setup('create',{onPickParent:id=>picked.push(id),onPrepareGeometry:async()=>{prepared++;return{bones,poseEpoch:1};}});
  env.controller.setScene({...env.scene,mode,parentPicking:true,hasConstraints:true});
  env.emit('pointerdown',450,300);env.emit('pointermove',470,320);env.emit('pointerup',470,320);await Promise.resolve();
  assert.deepEqual(picked,[1],mode);assert.equal(prepared,0);assert.deepEqual(env.commits,[]);assert.deepEqual(env.selections,[]);assert.equal(env.captured.size,0);env.controller.destroy();
 }
});
test('starting parent mode cancels an unfinished transform so release cannot commit the old drag',async()=>{
 const env=await setup('translate');env.emit('pointerdown',450,300);env.emit('pointermove',470,320);
 env.controller.setScene({...env.scene,parentPicking:true});env.emit('pointerup',470,320);await Promise.resolve();
 assert.deepEqual(env.commits,[]);assert.equal(env.captured.size,0);env.controller.destroy();
});
test('length is an explicit tool and cancelled captures never commit', async () => {
  const env = await setup('length');
  env.emit('pointerdown', 450, 300); env.emit('pointerup', 450, 300); assert.equal(env.commits.length, 0);
  env.emit('pointerdown', 450, 300); env.emit('pointermove', 470, 310); env.emit('pointercancel', 470, 310); env.emit('pointerup', 470, 310);
  assert.equal(env.commits.length, 0);
  env.emit('pointerdown', 500, 300); env.emit('pointermove', 500, 280); env.emit('pointerup', 500, 280); await Promise.resolve();
  assert.deepEqual(env.commits, [{ type: 'length', id: 1, x: 100, y: 20, revision: 7 }]); env.controller.destroy();
});
test('creation uses parent-local coordinates; Escape and revision changes cancel a draft', async () => {
  const env = await setup('create');
  env.controller.setScene({ ...env.scene, selected: 0 });
  env.emit('pointerdown', 400, 300); env.emit('pointermove', 480, 260); env.key('keydown', { key: 'Escape' }); env.emit('pointerup', 480, 260);
  assert.equal(env.commits.length, 0);
  env.controller.setScene({...env.scene,selected:0});
  env.emit('pointerdown', 400, 300); env.emit('pointermove', 480, 260); env.emit('pointerup', 480, 260); await Promise.resolve();
  assert.equal(env.commits[0].type, 'create'); assert.equal(env.commits[0].parent, 0);
  assert.equal(env.commits[0].x, 0); assert.equal(env.commits[0].y, 0);
  assert.ok(Math.abs(env.commits[0].length - Math.hypot(80,40)) < 0.0001);
  env.emit('pointerdown', 400, 300); env.emit('pointermove', 440, 300);
  env.controller.setScene({ ...env.scene, revision: 8 }); env.emit('pointerup', 440, 300);
  assert.equal(env.commits.length, 1); env.controller.destroy();
});
test('space and middle-button panning never alter bones', async () => {
  const env = await setup();
  env.key('keydown', { code: 'Space' }); env.emit('pointerdown', 450, 300); env.emit('pointermove', 470, 320); env.emit('pointerup', 470, 320); env.key('keyup', { code: 'Space' });
  env.emit('pointerdown', 450, 300, { button: 1 }); env.emit('pointermove', 470, 320); env.emit('pointerup', 470, 320);
  assert.equal(env.commits.length, 0); env.controller.destroy();
});

test('image dragging selects frontmost visible slot and commits once in parent-local space', async () => {
  const env = await setup();
  const parent = [{id:0,parent:null,name:'root',x:0,y:0,rotation:90,length:0}];
  const slot = {id:10,name:'image',bone:0,visible:true,imageAvailable:false,region:{name:'image',image:'image',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:200,height:200}};
  env.controller.setScene({...env.scene,bones:parent,slots:[slot,{...slot,id:11}],selected:null,mode:'images'});
  env.emit('pointerdown', 400,300); env.emit('pointermove',410,310); env.emit('pointermove',420,320);
  assert.equal(env.commits.length,0); assert.equal(env.slotSelections.at(-1),11);
  env.emit('pointerup',420,320); await Promise.resolve();
  assert.equal(env.commits.length,1); assert.equal(env.commits[0].type,'updateSlot'); assert.equal(env.commits[0].id,11);
  assert.ok(Math.abs(env.commits[0].x + 20) < 1e-6); assert.ok(Math.abs(env.commits[0].y + 20) < 1e-6);
  env.controller.destroy();
});
const quad={weighted:true,bones:[0,1],uvs:[0,0,1,0,1,1,0,1],triangles:[0,1,2,2,3,0],edges:[0,1,1,2,2,3,3,0],hull:4,vertices:[[-100,100],[100,100],[100,-100],[-100,-100]].map(p=>({weights:[0.5,0.5],positions:[...p,...p]}))};
const meshSlot={id:9,name:'mesh',bone:0,visible:true,imageAvailable:false,region:{name:'mesh',image:'mesh',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:200,height:200},mesh:quad};
test('mesh vertex drag and soft selection produce one batch, with cancellation preserving the rig',async()=>{
 const env=await setup();env.controller.setScene({...env.scene,slots:[meshSlot],selectedSlot:9,mode:'meshes',softSelection:true,softSize:250,softFeather:1});
 env.emit('pointerdown',300,200);env.emit('pointermove',320,210);assert.equal(env.commits.length,0);
 env.emit('pointerup',320,210);await Promise.resolve();assert.equal(env.commits.length,1);const batch=env.commits[0];assert.equal(batch.type,'moveVertices');assert.equal(batch.vertices.length,3);assert.deepEqual({...batch.vertices[0]},{vertex:0,x:-80,y:90});
 env.emit('pointerdown',300,200);env.emit('pointermove',350,210);env.key('keydown',{key:'Escape'});env.emit('pointerup',350,210);assert.equal(env.commits.length,1);env.controller.destroy();
});
test('mesh edge insertion and painting commit only completed operations',async()=>{
 const env=await setup();const scene={...env.scene,slots:[meshSlot],selectedSlot:9,mode:'meshes',meshTool:'edge'};env.controller.setScene(scene);
 env.emit('pointerdown',300,200);assert.equal(env.commits.length,0);env.emit('pointerdown',500,400);await Promise.resolve();assert.equal(env.commits[0].type,'meshEdge');assert.equal(env.commits[0].a,0);assert.equal(env.commits[0].b,2);
 await new Promise(resolve=>setImmediate(resolve));env.controller.setScene({...scene,mode:'weights',influence:1,brushSize:80,brushStrength:0.25,brushFeather:0});
 env.emit('pointerdown',300,200);env.emit('pointermove',310,200);env.emit('pointermove',320,200);assert.equal(env.commits.length,1);env.emit('pointerup',320,200);await Promise.resolve();
 assert.equal(env.commits.length,2);assert.equal(env.commits[1].type,'paintWeights');assert.equal(env.commits[1].changes[0].value,0.75);env.controller.destroy();
});

test('Create clicks select an existing parent while an empty click creates a short child',async()=>{
 const env=await setup('create');
 env.emit('pointerdown',450,300);env.emit('pointerup',450,300);
 assert.equal(env.commits.length,0);assert.equal(env.selections.at(-1),1);
 env.emit('pointerdown',600,250);env.emit('pointerup',600,250);await Promise.resolve();
 assert.equal(env.commits.length,1);const edit=env.commits[0];assert.equal(edit.type,'create');assert.equal(edit.parent,1);assert.equal(edit.length,12);assert.equal(edit.rotation,0);assert.equal(edit.x,200);assert.equal(edit.y,50);
 env.controller.destroy();
});
test('Rotate and Pose keep length separate; Pose origin dragging translates',async()=>{
 const rotate=await setup('rotate');rotate.emit('pointerdown',450,300);rotate.emit('pointermove',400,250);rotate.emit('pointerup',400,250);await Promise.resolve();
 assert.equal(rotate.commits.length,1);assert.equal(rotate.commits[0].mode,'rotate');assert.equal(rotate.commits[0].rotation,90);assert.equal('length' in rotate.commits[0],false);rotate.controller.destroy();
 const pose=await setup('pose');pose.emit('pointerdown',450,300);pose.emit('pointermove',400,250);pose.emit('pointerup',400,250);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(pose.commits[0].mode,'pose');assert.equal(pose.commits[0].rotation,90);
 pose.emit('pointerdown',400,300);pose.emit('pointermove',420,320);pose.emit('pointerup',420,320);await Promise.resolve();
 assert.equal(pose.commits[1].mode,'translate');assert.equal(pose.commits[1].dx,20);assert.equal(pose.commits[1].dy,-20);pose.controller.destroy();
});
test('Ctrl selection and box selection share the group and a group drag commits once',async()=>{
 const env=await setup('translate');
 const branch=[bones[0],{...bones[1],x:20,length:60},{...bones[1],id:2,name:'other',x:20,y:80,length:60}];
 env.controller.setScene({...env.scene,bones:branch,selectedBones:[1]});
 env.emit('pointerdown',450,220,{ctrlKey:true});env.emit('pointerup',450,220,{ctrlKey:true});
 assert.deepEqual(env.groupSelections.at(-1),{ids:[1,2],active:2});assert.equal(env.commits.length,0);
 env.emit('pointerdown',450,300);env.emit('pointermove',470,310);assert.equal(env.commits.length,0);env.emit('pointerup',470,310);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(Array.from(env.commits[0].ids),[1,2]);assert.equal(env.commits[0].dx,20);assert.equal(env.commits[0].dy,-10);
 env.controller.setScene({...env.scene,bones:branch,tool:'select',selected:null,selectedBones:[]});
 env.emit('pointerdown',410,200);env.emit('pointermove',490,310);env.emit('pointerup',490,310);
 assert.deepEqual(env.groupSelections.at(-1),{ids:[1,2],active:2});assert.equal(env.commits.length,1);env.controller.destroy();
});
test('Escape cancels a creation and returns to translation with no accidental bone',async()=>{
 const env=await setup('create');env.emit('pointerdown',600,250);env.emit('pointermove',650,250);env.key('keydown',{key:'Escape'});env.emit('pointerup',650,250);
 assert.equal(env.commits.length,0);assert.equal(env.escapes.length,1);
 env.emit('pointerdown',450,300);env.emit('pointermove',460,300);env.emit('pointerup',460,300);await Promise.resolve();
 assert.equal(env.commits[0].mode,'translate');env.controller.destroy();
});
test('Scale and shear emit explicit affine group edits rather than resizing the bone',async()=>{
 const scale=await setup('scale');scale.emit('pointerdown',464,300);scale.emit('pointermove',528,300);scale.emit('pointerup',528,300);await Promise.resolve();
 assert.equal(scale.commits[0].mode,'scale');assert.equal(scale.commits[0].scaleX,2);assert.equal(scale.commits[0].scaleY,1);assert.equal('length' in scale.commits[0],false);scale.controller.destroy();
 const shear=await setup('shear');shear.emit('pointerdown',464,300);shear.emit('pointermove',464,268);shear.emit('pointerup',464,268);await Promise.resolve();
 assert.equal(shear.commits[0].mode,'shear');assert.ok(Math.abs(shear.commits[0].shearX-26.565051177)<1e-6);assert.equal(shear.commits[0].shearY,0);shear.controller.destroy();
});
test('mesh Create previews a connected stroke and commits its endpoint atomically',async()=>{
 const env=await setup();env.controller.setScene({...env.scene,slots:[meshSlot],selectedSlot:9,mode:'meshes',meshTool:'draw',meshEditUvs:true});
 env.emit('pointerdown',300,200);env.emit('pointermove',380,270);assert.equal(env.commits.length,0);env.emit('pointerup',400,280);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(JSON.parse(JSON.stringify(env.commits[0])),{type:'meshStroke',id:9,from:0,points:[{x:0,y:20}],editUvs:true,revision:7});
 env.emit('pointerdown',300,200);env.emit('pointermove',490,390);env.emit('pointerup',500,400);await Promise.resolve();
 assert.equal(env.commits[1].type,'meshEdge');assert.equal(env.commits[1].a,0);assert.equal(env.commits[1].b,2);env.controller.destroy();
});
test('library drag/drop places only known asset keys using viewport world coordinates',async()=>{
 const env=await setup();env.controller.setScene({...env.scene,imageKeys:['hero/head']});
 const transfer=data=>({types:Object.keys(data),getData:type=>data[type]??'',dropEffect:'none'});
 env.emit('drop',420,310,{dataTransfer:transfer({'application/x-fbones-image':'hero/head'})});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(env.drops,[{key:'hero/head',x:20,y:-10}]);
 env.emit('drop',400,300,{dataTransfer:transfer({'text/plain':'/unrelated/file.png'})});assert.equal(env.drops.length,1);
 env.emit('drop',400,300,{dataTransfer:transfer({'text/plain':'hero/head'})});await Promise.resolve();assert.deepEqual(env.drops[1],{key:'hero/head',x:0,y:0});
 assert.equal(env.commits.length,0);env.controller.destroy();
});
test('singular affine parents report one interaction error and never commit a corrupt draft',async()=>{
 const env=await setup('create');env.controller.setScene({...env.scene,bones:[{...bones[0],scaleX:0}],selected:0});
 env.emit('pointerdown',600,250);env.emit('pointermove',650,250);env.emit('pointerup',650,250);await Promise.resolve();
 assert.equal(env.commits.length,0);assert.equal(env.errors.length,1);assert.match(env.errors[0],/cannot be inverted/);assert.equal(env.captured.size,0);env.controller.destroy();
});

test('visible transform handles constrain axes, hover cursors and cancel without native edits',async()=>{
 const env=await setup('translate');
 env.emit('pointermove',464,300);assert.equal(env.canvas.style.cursor,'ew-resize');
 env.emit('pointerdown',464,300);env.emit('pointermove',494,270);assert.equal(env.commits.length,0);
 env.emit('pointerup',494,270);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(env.commits[0].dx,30);assert.equal(env.commits[0].dy,0);
 env.controller.setScene({...env.scene,tool:'scale'});
 env.emit('pointermove',400,236);assert.equal(env.canvas.style.cursor,'ns-resize');
 env.emit('pointerdown',400,236);env.emit('pointermove',420,204);env.emit('pointerup',420,204);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(env.commits[1].scaleX,1);assert.equal(env.commits[1].scaleY,1.5);
 env.emit('pointerdown',400,300);env.emit('pointermove',425,275);env.emit('pointerup',425,275);await new Promise(resolve=>setImmediate(resolve));
 assert.ok(Math.abs(env.commits[2].scaleX-Math.exp(.5))<1e-6);assert.equal(env.commits[2].scaleX,env.commits[2].scaleY);
 env.emit('pointerdown',464,300);env.emit('pointermove',500,300);env.key('keydown',{key:'Escape'});env.emit('pointerup',500,300);
 assert.equal(env.commits.length,3);assert.equal(env.captured.size,0);env.controller.destroy();
});

test('ring gesture crosses angle branch cut with one shared delta for different bone lengths',async()=>{
 const env=await setup('rotate');
 const branch=[bones[0],{...bones[1],x:-100,length:10},{...bones[1],id:2,x:100,length:300}];
 env.controller.setScene({...env.scene,bones:branch,selected:1,selectedBones:[1,2]});
 const at=angle=>({x:300+48*Math.cos(angle*Math.PI/180),y:300-48*Math.sin(angle*Math.PI/180)});
 const a=at(179),b=at(-179),c=at(-170);
 env.emit('pointerdown',a.x,a.y);env.emit('pointermove',b.x,b.y);env.emit('pointermove',c.x,c.y);
 assert.equal(env.commits.length,0);env.emit('pointerup',c.x,c.y);await Promise.resolve();
 assert.equal(env.commits.length,1);assert.deepEqual(Array.from(env.commits[0].ids),[1,2]);
 assert.ok(Math.abs(env.commits[0].rotation-11)<1e-6);assert.equal(env.commits[0].individual,true);
 env.controller.destroy();
});

test('Group uses a shared centroid and ring overlap preserves unselected bone picking',async()=>{
 const env=await setup('rotate',{pivotMode:()=> 'group'});
 const branch=[bones[0],{...bones[1],x:-100,y:80,length:10},{...bones[1],id:2,x:100,y:80,length:300},
  {...bones[1],id:3,x:40,y:0,length:30}];
 env.controller.setScene({...env.scene,bones:branch,selected:1,selectedBones:[1,2]});
 env.emit('pointerdown',448,220);env.emit('pointermove',400,172);env.emit('pointerup',400,172);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(env.commits[0].pivotX,0);assert.equal(env.commits[0].pivotY,80);assert.equal(env.commits[0].individual,false);
 assert.ok(Math.abs(env.commits[0].rotation-90)<1e-6);
 env.controller.setScene({...env.scene,bones:branch,selected:1,selectedBones:[1]});
 env.emit('pointerdown',450,300);env.emit('pointerup',450,300);
 assert.equal(env.selections.at(-1),3);assert.equal(env.commits.length,1);env.controller.destroy();
});

test('ordered library multiselection drops atomically and malformed batch cannot fall back',async()=>{
 const batch=[];
 const env=await setup('translate',{onDropImages:async(keys,x,y)=>{batch.push({keys:Array.from(keys),x,y});return true;}});
 env.controller.setScene({...env.scene,imageKeys:['one','parts/two','three']});
 const transfer=data=>({types:Object.keys(data),getData:type=>data[type]??'',dropEffect:'none'});
 env.emit('drop',430,280,{dataTransfer:transfer({'application/x-fbones-images':'["parts/two","one"]','application/x-fbones-image':'one'})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(batch,[{keys:['parts/two','one'],x:30,y:20}]);assert.equal(env.drops.length,0);
 env.emit('drop',400,300,{dataTransfer:transfer({'application/x-fbones-images':'invalid','application/x-fbones-image':'one'})});
 assert.equal(batch.length,1);assert.equal(env.commits.length,0);env.controller.destroy();
});

test('rotated/sheared-parent Scale uses projected local handles, preserves channel scope and ignores Group pivot',async()=>{
 const env=await setup('scale',{pivotMode:()=> 'group'});
 const branch=[{...bones[0],rotation:23,scaleX:1.8,scaleY:.7,shearX:10,shearY:-12},
  {...bones[1],x:45,y:20,rotation:30,scaleX:1.2,scaleY:.6,shearX:7,shearY:15},
  {...bones[1],id:2,x:-80,y:-20,rotation:-40,length:15}];
 const snapshot=structuredClone(branch);
 env.controller.setScene({...env.scene,bones:branch,selected:1,selectedBones:[1,2]});
 const p=worldBones(branch)[1],center={x:400+p.worldX,y:300-p.worldY};
 const xLength=Math.hypot(p.a,p.b),yLength=Math.hypot(p.c,p.d);
 const ux={x:p.a/xLength,y:-p.b/xLength},uy={x:p.c/yLength,y:-p.d/yLength};
 const start={x:center.x+ux.x*64,y:center.y+ux.y*64};
 const end={x:center.x+ux.x*96-ux.y*25,y:center.y+ux.y*96+ux.x*25};
 env.emit('pointerdown',start.x,start.y);env.emit('pointermove',end.x,end.y);assert.equal(env.commits.length,0);
 env.emit('pointerup',end.x,end.y);await new Promise(resolve=>setImmediate(resolve));
 const first=env.commits[0];assert.ok(first,'rotated local X handle remains interactive');
 assert.equal(first.mode,'scale');assert.equal(first.localAxes,true);assert.equal(first.individual,true);
 assert.ok(Math.abs(first.pivotX-p.worldX)<1e-6);assert.ok(Math.abs(first.pivotY-p.worldY)<1e-6);
 assert.ok(Math.abs(first.scaleX-1.5)<1e-6);assert.equal(first.scaleY,1);assert.deepEqual(Array.from(first.ids),[1,2]);
 const sy={x:center.x+uy.x*64,y:center.y+uy.y*64},ey={x:center.x+uy.x*128,y:center.y+uy.y*128};
 env.emit('pointerdown',sy.x,sy.y);env.emit('pointermove',ey.x,ey.y);env.emit('pointerup',ey.x,ey.y);await Promise.resolve();
 assert.equal(env.commits.length,2);assert.equal(env.commits[1].scaleX,1);assert.ok(Math.abs(env.commits[1].scaleY-2)<1e-6);
 assert.deepEqual(branch,snapshot);env.controller.destroy();
});

test('viewport hover emits stable IDs without edits and clears on leave, blur, deletion and destroy',async()=>{
 const hovering=[],clears=[];
 const env=await setup('create',{onHoverBone:id=>hovering.push(id),onClearHover:()=>clears.push(true)});
 env.emit('pointermove',450,300);env.emit('pointermove',460,300);
 assert.deepEqual(hovering,[1]);assert.equal(env.commits.length,0);
 env.emit('pointerleave',460,300);assert.deepEqual(hovering,[1,null]);
 env.emit('pointermove',450,300);env.key('blur',{});assert.equal(hovering.at(-1),null);assert.equal(clears.length,1);
 env.emit('pointermove',450,300);env.controller.setScene({...env.scene,bones:[bones[0]],revision:8});
 assert.equal(hovering.at(-1),null);
 env.controller.setScene({...env.scene,mode:'weights',influence:1,selected:null,hoveredBone:1});
 env.emit('pointermove',450,300);assert.equal(env.commits.length,0);
 env.controller.destroy();assert.equal(hovering.at(-1),null);assert.equal(clears.length,2);
 assert.equal(env.listeners.size,0);assert.equal(env.keys.size,0);
});

test('scene Ctrl/marquee selection uses attachment identities and group drag is one transaction',async()=>{
 const env=await setup('translate');
 const slots=[-80,80].map((x,i)=>({id:10+i,name:'image'+i,bone:0,visible:true,imageAvailable:false,region:{name:'image'+i,image:'image'+i,x,y:0,rotation:0,scaleX:1,scaleY:1,width:40,height:40},activeAttachmentId:30+i}));
 env.controller.setScene({...env.scene,sceneEditing:true,mode:'images',selected:null,selectedAttachments:[],slots});
 env.emit('pointerdown',320,300);env.emit('pointerup',320,300);
 env.emit('pointerdown',480,300,{ctrlKey:true});env.emit('pointerup',480,300,{ctrlKey:true});
 assert.deepEqual(env.imageSelections.at(-1),{ids:[30,31],active:31});
 env.emit('pointerdown',320,300);env.emit('pointermove',340,315);env.emit('pointerup',340,315);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);assert.equal(env.commits[0].type,'transformAttachments');assert.deepEqual(Array.from(env.commits[0].ids),[30,31]);assert.equal(env.commits[0].dx,20);assert.equal(env.commits[0].dy,-15);
 env.emit('pointerdown',250,230);env.emit('pointermove',550,370);env.emit('pointerup',550,370);
 assert.deepEqual(env.imageSelections.at(-1),{ids:[30,31],active:31});
 env.emit('pointerdown',320,300,{ctrlKey:true});env.emit('pointerup',320,300,{ctrlKey:true});assert.deepEqual(env.imageSelections.at(-1),{ids:[31],active:31});env.controller.destroy();
});
test('clipping draft clicks close at first point without creating temporary native geometry',async()=>{
 const draft={slot:10,name:'cut',endSlot:10,convex:true,inverse:false,documentId:1,revision:7,points:[]};let finishes=0;
 const env=await setup('translate',{onClippingPoint:p=>draft.points.push({...p}),onFinishClipping:()=>finishes++});
 env.controller.setScene({...env.scene,mode:'clipping',clippingDraft:draft});
 for(const[x,y]of[[400,300],[500,300],[500,200],[400,300]]){env.emit('pointerdown',x,y);env.emit('pointerup',x,y);}
 assert.deepEqual(draft.points,[{x:0,y:0},{x:100,y:0},{x:100,y:100}]);assert.equal(finishes,1);assert.equal(env.commits.length,0);env.controller.destroy();
});
test('constrained geometry freezes native matrices once and commits that epoch; released pending preparation cannot start a drag',async()=>{
 let resolvePose,prepared=0;
 const env=await setup('translate',{onPrepareGeometry:()=>{prepared++;return new Promise(r=>{resolvePose=r;});}});
 const matrix={x:50,y:0,a:1,b:0,c:0,d:1},posed=bones.map(b=>({...b,evaluatedWorld:{...matrix}}));
 const scene={...env.scene,mode:'meshes',slots:[meshSlot],selectedSlot:9,selected:null,hasConstraints:true,meshTool:'move'};
 env.controller.setScene(scene);env.emit('pointerdown',300,200);env.emit('pointerup',300,200);resolvePose({bones:posed,poseEpoch:42});await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,0);assert.equal(env.captured.size,0);
 env.emit('pointerdown',350,200);resolvePose({bones:posed,poseEpoch:43});await new Promise(r=>setImmediate(r));
 env.emit('pointermove',370,210);assert.equal(env.commits.length,0);env.emit('pointerup',370,210);await new Promise(r=>setImmediate(r));
 assert.equal(prepared,2);assert.equal(env.commits.length,1);assert.equal(env.commits[0].poseEpoch,43);assert.equal(env.commits[0].type,'moveVertices');assert.deepEqual({...env.commits[0].vertices[0]},{vertex:0,x:-30,y:90});env.controller.destroy();
});

function weightedClipScene(env,patch={}){
 const clipping={endSlot:90,convex:false,inverse:false,color:0xff44aaff,weighted:true,bones:[0,1],vertices:[[-100,100],[100,100],[100,-100],[-100,-100]].map(([x,y])=>({weights:[.5,.5],positions:[x,y,x,y]})),edges:[0,1,1,2,2,3,3,0]};
 const inactive={id:404,slot:90,name:'inactive mask',type:'clipping',region:null,mesh:null,imageAvailable:false,clipping},active={...inactive,id:403,name:'active mask'},slot={id:90,name:'masks',bone:0,visible:true,region:null,mesh:null,imageAvailable:false,blend:'normal',activeAttachmentId:403,attachments:[active,inactive]};
 return{...env.scene,selected:null,selectedSlot:90,mode:'weights',sceneEditing:true,selectedAttachments:[404],inspectedAttachment:inactive,slots:[slot],influence:1,brushMode:'add',brushStrength:.2,brushSize:40,brushFeather:0,...patch};
}
test('inactive real clip brush captures stable attachment and max coverage, then commits exactly once without a PNG projection',async()=>{
 const env=await setup('translate'),scene=weightedClipScene(env),before=structuredClone(scene.slots);env.controller.setScene(scene);
 env.emit('pointerdown',300,200);assert.equal(env.vertexSelections.at(-1),0);
 for(let i=0;i<8;i++)env.emit('pointermove',305,200);
 assert.equal(env.commits.length,0);env.emit('pointerup',305,200);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);const edit=env.commits[0];assert.equal(edit.type,'paintAttachmentWeights');assert.equal(edit.id,404);assert.equal(edit.bone,1);assert.equal(edit.changes.length,1);assert.equal(edit.changes[0].vertex,0);assert.ok(Math.abs(edit.changes[0].value-.7)<1e-9);assert.equal(scene.slots[0].activeAttachmentId,403);assert.deepEqual(scene.slots,before);env.controller.destroy();
});
test('clip brushes Add/Remove/Replace/Smooth use captured values and Smooth uses perimeter neighbors only',async()=>{
 for(const[mode,expected]of[['add',.7],['subtract',.3],['replace',.2],['smooth',.4]]){
  const env=await setup('translate'),scene=weightedClipScene(env,{brushMode:mode,brushStrength:mode==='smooth'?1:.2});
  if(mode==='smooth'){for(const[i,value]of[[0,.8],[1,.2],[2,1],[3,.6]])scene.inspectedAttachment.clipping.vertices[i].weights=[1-value,value];}
  env.controller.setScene(scene);env.emit('pointerdown',300,200);env.emit('pointerup',300,200);await new Promise(r=>setImmediate(r));assert.equal(env.commits.length,1,mode);assert.ok(Math.abs(env.commits[0].changes[0].value-expected)<1e-8,mode);env.controller.destroy();
 }
});
test('Direct click selects only; vertical drag changes one captured clip row with explicit gain and captured Shift fine mode',async()=>{
 const env=await setup('translate'),scene=weightedClipScene(env,{brushMode:'direct',brushSize:1000,brushStrength:1});env.controller.setScene(scene);
 env.emit('pointerdown',300,200);env.emit('pointerup',300,200);await Promise.resolve();assert.equal(env.vertexSelections.at(-1),0);assert.equal(env.commits.length,0);
 env.emit('pointerdown',400,300);env.emit('pointermove',400,200);env.emit('pointerup',400,200);await Promise.resolve();assert.equal(env.commits.length,0,'non-vertex Direct pointer never paints');
 env.emit('pointerdown',300,200);env.emit('pointermove',300,160);assert.equal(env.commits.length,0);env.emit('pointerup',300,160);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);assert.equal(env.commits[0].type,'setAttachmentWeight');assert.equal(env.commits[0].id,404);assert.equal(env.commits[0].vertex,0);assert.ok(Math.abs(env.commits[0].value-.7)<1e-9);assert.equal(env.commits[0].changes,undefined,'Direct is not a radius brush batch');
 env.emit('pointerdown',300,200,{shiftKey:true});env.emit('pointermove',300,160);env.emit('pointerup',300,160);await Promise.resolve();assert.ok(Math.abs(env.commits[1].value-.52)<1e-9);env.controller.destroy();
});
test('clip stroke cancels on selection/influence change and Escape without a late old-target commit',async()=>{
 for(const mode of ['selection','influence','escape']){
  const env=await setup('translate'),scene=weightedClipScene(env);env.controller.setScene(scene);env.emit('pointerdown',300,200);env.emit('pointermove',310,200);
  if(mode==='selection')env.controller.setScene({...scene,selectedAttachments:[403],inspectedAttachment:scene.slots[0].attachments[0]});else if(mode==='influence')env.controller.setScene({...scene,influence:0});else env.key('keydown',{key:'Escape'});
  env.emit('pointerup',310,200);await Promise.resolve();assert.equal(env.commits.length,0,mode);assert.equal(env.captured.size,0);env.controller.destroy();
 }
});
test('clip weight brush freezes one native pose epoch and released pending freeze never starts a stroke',async()=>{
 let resolvePose,prepared=0;const env=await setup('translate',{onPrepareGeometry:()=>{prepared++;return new Promise(r=>{resolvePose=r;});}}),scene=weightedClipScene(env,{hasConstraints:true}),posed=bones.map(b=>({...b,evaluatedWorld:{x:50,y:0,a:1,b:0,c:0,d:1}}));env.controller.setScene(scene);
 env.emit('pointerdown',350,200);env.emit('pointerup',350,200);resolvePose({bones:posed,poseEpoch:87});await new Promise(r=>setImmediate(r));assert.equal(env.commits.length,0);assert.equal(env.captured.size,0);
 env.emit('pointerdown',350,200);resolvePose({bones:posed,poseEpoch:88});await new Promise(r=>setImmediate(r));env.emit('pointermove',355,200);assert.equal(env.commits.length,0);env.emit('pointerup',355,200);await new Promise(r=>setImmediate(r));
 assert.equal(prepared,2);assert.equal(env.commits.length,1);assert.equal(env.commits[0].poseEpoch,88);assert.equal(env.commits[0].type,'paintAttachmentWeights');assert.equal(env.commits[0].id,404);assert.equal(env.commits[0].changes[0].vertex,0);env.controller.destroy();
});
test('legacy image brush and Direct retain legacy slot command addressing through shared binding previews',async()=>{
 for(const mode of ['add','direct']){
  const env=await setup('translate'),scene=weightedClipScene(env),binding=scene.inspectedAttachment.clipping,mesh={...binding,uvs:[0,0,1,0,1,1,0,1],triangles:[0,1,2,0,2,3],hull:4};
  env.controller.setScene({...scene,sceneEditing:false,inspectedAttachment:null,selectedAttachments:[],brushMode:mode,slots:[{...scene.slots[0],mesh,attachments:undefined,activeAttachmentId:undefined}]});env.emit('pointerdown',300,200);env.emit('pointermove',300,160);env.emit('pointerup',300,160);await new Promise(r=>setImmediate(r));assert.equal(env.commits.length,1);assert.equal(env.commits[0].type,mode==='direct'?'setWeight':'paintWeights');assert.equal(env.commits[0].id,90);env.controller.destroy();
 }
});
test('Replace targets Strength from either side, including feathered and zero-strength strokes in Scene and legacy',async()=>{
 for(const legacy of [false,true])for(const[base,strength,offset,expected]of[[.4,.5,0,.5],[.8,.5,0,.5],[.4,.5,10,.45],[.4,0,0,0]]){
  const env=await setup('translate'),scene=weightedClipScene(env,{brushMode:'replace',brushStrength:strength,brushSize:40,brushFeather:1});
  for(const row of scene.inspectedAttachment.clipping.vertices)row.weights=[1-base,base];
  if(legacy){const mesh={...scene.inspectedAttachment.clipping,uvs:[0,0,1,0,1,1,0,1],triangles:[0,1,2,0,2,3],hull:4};Object.assign(scene,{sceneEditing:false,inspectedAttachment:null,selectedAttachments:[],slots:[{...scene.slots[0],mesh,attachments:undefined,activeAttachmentId:undefined}]});}
  env.controller.setScene(scene);env.emit('pointerdown',300+offset,200);assert.equal(env.commits.length,0);env.emit('pointerup',300+offset,200);await new Promise(r=>setImmediate(r));assert.equal(env.commits.length,1);const edit=env.commits[0];assert.equal(edit.type,legacy?'paintWeights':'paintAttachmentWeights');assert.ok(Math.abs(edit.changes[0].value-expected)<1e-9,JSON.stringify({legacy,base,strength,offset,expected,actual:edit.changes[0].value}));env.controller.destroy();
 }
});
test('Direct renderer omits radius and feather circles that remain visible for actual brushes',async()=>{
 const env=await setup('translate'),scene=weightedClipScene(env,{brushMode:'direct',brushSize:80,brushFeather:.5});env.controller.setScene(scene);env.emit('pointermove',300,200);
 const atHover=()=>env.graphics.flatMap(g=>g.circles).filter(c=>c.x===300&&c.y===200);
 assert.equal(atHover().length,0,'Direct must not display irrelevant radius/feather');env.controller.setScene({...scene,brushMode:'add'});env.emit('pointermove',300,200);assert.deepEqual(Array.from(atHover(),c=>c.radius).sort((a,b)=>a-b),[20,40]);env.controller.destroy();
});
test('Direct Ctrl/Cmd toggle and box selection keep the attachment and never request pose RPC or authoring',async()=>{
 let prepares=0;const env=await setup('translate',{onPrepareGeometry:async()=>{prepares++;return{bones,poseEpoch:99};}}),scene=weightedClipScene(env,{brushMode:'direct',selectedVertices:[],hasConstraints:true});env.controller.setScene(scene);
 env.emit('pointerdown',300,200,{ctrlKey:true});env.emit('pointerup',300,200,{ctrlKey:true});
 assert.deepEqual(env.weightSelections.at(-1),{ids:[0],active:0});
 env.emit('pointerdown',500,200,{metaKey:true});env.emit('pointerup',500,200,{metaKey:true});
 assert.deepEqual(env.weightSelections.at(-1),{ids:[0,1],active:1});
 env.emit('pointerdown',300,200,{ctrlKey:true});assert.deepEqual(env.weightSelections.at(-1),{ids:[1],active:1});
 env.emit('pointerdown',280,380,{ctrlKey:true});env.emit('pointermove',520,420,{ctrlKey:true});env.emit('pointerup',520,420,{ctrlKey:true});
 assert.deepEqual(env.weightSelections.at(-1),{ids:[1,2,3],active:3});
 env.emit('pointerdown',280,180);env.emit('pointermove',520,220);env.emit('pointerup',520,220);
 assert.deepEqual(env.weightSelections.at(-1),{ids:[0,1],active:1});
 env.key('keydown',{key:'a',ctrlKey:true});assert.deepEqual(env.weightSelections.at(-1),{ids:[0,1,2,3],active:1});
 env.key('keydown',{key:'Escape'});assert.deepEqual(env.weightSelections.at(-1),{ids:[],active:null});
 env.emit('pointerdown',400,300);env.emit('pointerup',400,300);assert.deepEqual(env.weightSelections.at(-1),{ids:[],active:null});
 assert.equal(prepares,0);assert.equal(env.commits.length,0);assert.equal(env.imageSelections.length,0);assert.equal(env.slotSelections.length,0);assert.equal(env.escapes.length,0,'Weights Escape preserves the targeted binding');assert.equal(env.captured.size,0);env.controller.destroy();
});
test('Direct dragging an already-selected row preserves the group and batches independent row deltas once',async()=>{
 for(const legacy of [false,true]){
  const env=await setup('translate'),scene=weightedClipScene(env,{brushMode:'direct',selectedVertices:[0,2],selectedVertex:2});
  scene.inspectedAttachment.clipping.vertices[0].weights=[.8,.2];scene.inspectedAttachment.clipping.vertices[2].weights=[.3,.7];
  if(legacy){const mesh={...scene.inspectedAttachment.clipping,triangles:[0,1,2,0,2,3],uvs:[0,0,1,0,1,1,0,1],hull:4};Object.assign(scene,{sceneEditing:false,inspectedAttachment:null,selectedAttachments:[],slots:[{...scene.slots[0],attachments:undefined,activeAttachmentId:undefined,mesh}]});}
  env.controller.setScene(scene);env.emit('pointerdown',300,200);assert.deepEqual(env.weightSelections.at(-1),{ids:[0,2],active:0});
  for(const y of [190,180,170,160])env.emit('pointermove',300,y);
  assert.equal(env.commits.length,0);env.emit('pointerup',300,160);await new Promise(r=>setImmediate(r));
  assert.equal(env.commits.length,1);const edit=env.commits[0];assert.equal(edit.type,legacy?'paintWeights':'paintAttachmentWeights');assert.equal(edit.id,legacy?90:404);
  assert.deepEqual(Array.from(edit.changes,c=>c.vertex),[0,2]);assert.ok(Math.abs(edit.changes[0].value-.4)<1e-9);assert.ok(Math.abs(edit.changes[1].value-.9)<1e-9);assert.equal(env.captured.size,0);env.controller.destroy();
 }
});
test('brush scope is captured independently from nearest numeric focus and excludes unselected covered vertices',async()=>{
 const env=await setup('translate'),scene=weightedClipScene(env,{selectedVertices:[1,3],selectedVertex:0,brushSize:2000,brushStrength:.2,brushFeather:0});env.controller.setScene(scene);
 env.emit('pointerdown',300,200);env.emit('pointermove',310,210);env.emit('pointerup',310,210);await new Promise(r=>setImmediate(r));
 assert.equal(env.weightSelections.length,0,'A brush must not replace the explicit selection with its nearest vertex');assert.equal(env.vertexSelections.at(-1),0);
 assert.equal(env.commits.length,1);assert.deepEqual(Array.from(env.commits[0].changes,c=>c.vertex),[1,3]);assert.ok(env.commits[0].changes.every(c=>Math.abs(c.value-.7)<1e-9));env.controller.destroy();
});
test('vertex/candidate/lock changes cancel captured group edits and constrained Direct keeps one frozen epoch',async()=>{
 for(const field of ['selectedVertices','selectedInfluences','lockedInfluences']){
  const env=await setup('translate'),scene=weightedClipScene(env,{brushMode:'direct',selectedVertices:[0,1],selectedInfluences:[1]});env.controller.setScene(scene);
  env.emit('pointerdown',300,200);env.emit('pointermove',300,160);env.controller.setScene({...scene,[field]:field==='selectedVertices'?[0]:[0,1]});env.emit('pointerup',300,160);assert.equal(env.commits.length,0,field);assert.equal(env.captured.size,0);env.controller.destroy();
 }
 let resolvePose,prepares=0;const env=await setup('translate',{onPrepareGeometry:()=>{prepares++;return new Promise(resolve=>{resolvePose=resolve;});}}),scene=weightedClipScene(env,{brushMode:'direct',selectedVertices:[0,2],hasConstraints:true});env.controller.setScene(scene);
 env.emit('pointerdown',300,200);resolvePose({bones,poseEpoch:123});await new Promise(r=>setImmediate(r));env.emit('pointermove',300,160);env.emit('pointerup',300,160);await new Promise(r=>setImmediate(r));
 assert.equal(prepares,1);assert.equal(env.commits.length,1);assert.equal(env.commits[0].poseEpoch,123);assert.deepEqual(Array.from(env.commits[0].changes,c=>c.vertex),[0,2]);env.controller.destroy();
});
test('weight gestures capture locks and Space clears row selection before panning without authoring',async()=>{
 const env=await setup('translate'),scene=weightedClipScene(env,{brushMode:'direct',selectedVertices:[0,2],lockedInfluences:[0]});env.controller.setScene(scene);
 env.emit('pointerdown',300,200);env.emit('pointermove',300,160);env.emit('pointerup',300,160);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);assert.deepEqual(Array.from(env.commits[0].lockedBones),[0]);
 env.key('keydown',{code:'Space'});assert.deepEqual(env.weightSelections.at(-1),{ids:[],active:null});
 env.emit('pointerdown',300,200);env.emit('pointermove',320,220);env.emit('pointerup',320,220);env.key('keyup',{code:'Space'});
 assert.equal(env.commits.length,1,'panning is not a weight edit');env.controller.destroy();
});
test('weight rings show every selected inactive clip row while a numeric focus alone creates no selection ring',async()=>{
 const env=await setup('translate',{loadImage:async()=>''}),scene=weightedClipScene(env,{brushMode:'direct',selectedVertices:[0,2],selectedVertex:2});env.controller.setScene(scene);
 const rings=()=>Array.from(env.graphics).flatMap(g=>Array.from(g.circles??[])).filter(c=>c.radius===8.5||c.radius===9.5);
 assert.deepEqual(rings().map(c=>({...c})),[{x:300,y:200,radius:8.5},{x:500,y:400,radius:9.5}]);
 env.controller.setScene({...scene,selectedVertices:[],selectedVertex:0});assert.equal(rings().length,0);env.controller.destroy();
});

function inactiveScene(env,tool='rotate'){
 const region=(id,x)=>({id,slot:10,name:'image'+id,type:'region',region:{name:'image'+id,image:'image'+id,x,y:0,rotation:0,scaleX:1,scaleY:1,width:40,height:40},mesh:null,clipping:null,imageAvailable:false});
 const active=region(30,-160),inactive=region(31,80);
 const slot={id:10,bone:0,name:'alternatives',visible:true,imageAvailable:false,region:active.region,mesh:null,activeAttachmentId:30,attachments:[active,inactive]};
 return{...env.scene,documentId:42,sceneEditing:true,mode:'images',tool,selected:null,selectedBones:[],selectedSlot:10,selectedAttachments:[31],inspectedAttachment:inactive,slots:[slot]};
}
test('inactive-only selection has a ring and independent scale axes without activating its image',async()=>{
 const env=await setup('rotate'),scene=inactiveScene(env),before=JSON.stringify(scene.slots);
 env.controller.setScene(scene);
 env.emit('pointermove',528,300);assert.equal(env.canvas.style.cursor,'grab');
 env.emit('pointerdown',528,300);env.emit('pointermove',480,252);assert.equal(env.commits.length,0);
 env.emit('pointerup',480,252);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);assert.deepEqual(Array.from(env.commits[0].ids),[31]);
 assert.equal(env.commits[0].mode,'rotate');assert.equal(env.commits[0].pivotX,80);assert.equal(env.commits[0].pivotY,0);assert.equal(env.commits[0].rotation,90);
 env.controller.setScene({...scene,tool:'scale'});env.emit('pointermove',544,300);assert.equal(env.canvas.style.cursor,'ew-resize');
 env.emit('pointerdown',544,300);env.emit('pointermove',576,300);env.emit('pointerup',576,300);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits[1].scaleX,1.5);assert.equal(env.commits[1].scaleY,1);assert.equal(env.commits[1].mode,'scale');
 assert.equal(JSON.stringify(scene.slots),before);assert.equal(env.imageSelections.length,0);env.controller.destroy();
});
test('clip and inactive image share real geometry pivot and commit one group transform',async()=>{
 const env=await setup('rotate'),scene=inactiveScene(env),clip={id:40,slot:11,name:'cut',type:'clipping',region:null,mesh:null,imageAvailable:false,clipping:{name:'cut',endSlot:11,convex:true,inverse:false,color:0x83dbe8ff,weighted:false,bones:[0],vertices:[[-100,-20],[-60,-20],[-60,20],[-100,20]].map(positions=>({weights:[1],positions})),edges:[0,1,1,2,2,3,3,0]}};
 scene.slots.push({id:11,bone:0,name:'clip owner',visible:false,imageAvailable:false,region:null,mesh:null,activeAttachmentId:null,attachments:[clip]});
 scene.selectedAttachments=[31,40];scene.inspectedAttachment=clip;scene.selectedSlot=11;
 env.controller.setScene(scene);env.emit('pointerdown',448,300);env.emit('pointermove',400,252);env.emit('pointerup',400,252);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);assert.deepEqual(Array.from(env.commits[0].ids),[31,40]);assert.equal(env.commits[0].pivotX,0);assert.equal(env.commits[0].pivotY,0);assert.equal(env.commits[0].rotation,90);
 assert.equal(scene.slots[0].activeAttachmentId,30);assert.equal(scene.slots[1].activeAttachmentId,null);env.controller.destroy();
});
test('attachment origin snaps to actual vertices with no commit and survives tool changes; cancellation restores it',async()=>{
 const env=await setup('rotate'),scene=inactiveScene(env);env.controller.setScene(scene);
 env.emit('pointermove',480,300);assert.equal(env.canvas.style.cursor,'move');
 env.emit('pointerdown',480,300);env.emit('pointermove',502,318);env.emit('pointerup',502,318);
 assert.equal(env.commits.length,0,'pivot is transient');
 // Snaps to bottom-right corner (100,-20), even though release is two pixels away.
 env.emit('pointerdown',548,320);env.emit('pointermove',500,272);env.emit('pointerup',500,272);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);assert.equal(env.commits[0].pivotX,100);assert.equal(env.commits[0].pivotY,-20);assert.equal(env.commits[0].rotation,90);
 env.controller.setScene({...scene,tool:'scale'});
 env.emit('pointerdown',500,320);env.emit('pointermove',430,270);env.emit('pointercancel',430,270);
 env.emit('pointerdown',564,320);env.emit('pointermove',596,320);env.emit('pointerup',596,320);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,2);assert.equal(env.commits[1].pivotX,100);assert.equal(env.commits[1].pivotY,-20);assert.equal(env.commits[1].scaleX,1.5);assert.equal(env.commits[1].scaleY,1);
 env.controller.destroy();
});
test('selection-only changes cancel old attachment gestures and reset custom origin',async()=>{
 const env=await setup('rotate'),scene=inactiveScene(env);env.controller.setScene(scene);
 env.emit('pointerdown',480,300);env.emit('pointermove',500,320);env.emit('pointerup',500,320);
 env.emit('pointerdown',548,320);env.emit('pointermove',500,272);
 env.controller.setScene({...scene,selectedAttachments:[30],inspectedAttachment:scene.slots[0].attachments[0]});
 env.emit('pointerup',500,272);assert.equal(env.commits.length,0);assert.equal(env.captured.size,0);
 env.emit('pointerdown',288,300);env.emit('pointermove',240,252);env.emit('pointerup',240,252);await new Promise(r=>setImmediate(r));
 assert.equal(env.commits.length,1);assert.equal(env.commits[0].pivotX,-160);assert.deepEqual(Array.from(env.commits[0].ids),[30]);
 env.controller.destroy();
});
test('inactive attachment handles freeze the displayed epoch and cannot commit across document or revision changes',async()=>{
 let epoch=70,prepares=0;
 const posed=bones.map(b=>({...b,evaluatedWorld:{x:50,y:10,a:1,b:0,c:0,d:1}}));
 const env=await setup('scale',{onPrepareGeometry:async()=>{prepares++;return{bones:posed,poseEpoch:++epoch};}}),scene={...inactiveScene(env,'scale'),hasConstraints:true};
 env.controller.setScene(scene);env.emit('pointerdown',594,290);await new Promise(r=>setImmediate(r));
 env.emit('pointermove',626,290);env.emit('pointerup',626,290);await new Promise(r=>setImmediate(r));
 assert.equal(prepares,1);assert.equal(env.commits.length,1);assert.equal(env.commits[0].poseEpoch,71);assert.equal(env.commits[0].pivotX,130);assert.equal(env.commits[0].pivotY,10);assert.equal(env.commits[0].scaleX,1.5);
 env.controller.setScene({...scene,bones:posed,hasConstraints:false});env.emit('pointerdown',530,290);env.emit('pointermove',550,310);env.emit('pointerup',550,310);
 env.emit('pointerdown',614,310);env.emit('pointermove',646,310);env.controller.setScene({...scene,bones:posed,hasConstraints:false,revision:8});env.emit('pointerup',646,310);assert.equal(env.commits.length,1);
 env.emit('pointerdown',594,290);env.emit('pointermove',626,290);env.controller.setScene({...scene,bones:posed,hasConstraints:false,revision:8,documentId:43});env.emit('pointerup',626,290);assert.equal(env.commits.length,1);assert.equal(env.captured.size,0);
 env.controller.destroy();
});

test('constrained image Ctrl selection and marquee release temporary physics holds without authoring',async()=>{
 let held=false,prepares=0;
 const env=await setup('translate',{onPauseSimulation:()=>{held=true;},onEndGeometry:()=>{held=false;},onPrepareGeometry:async()=>{prepares++;return{bones,poseEpoch:prepares};}});
 const slots=[-80,80].map((x,i)=>({id:10+i,name:'image'+i,bone:0,visible:true,imageAvailable:false,region:{name:'image'+i,image:'image'+i,x,y:0,rotation:0,scaleX:1,scaleY:1,width:40,height:40},activeAttachmentId:30+i}));
 env.controller.setScene({...env.scene,sceneEditing:true,mode:'images',selected:null,selectedAttachments:[],slots,hasConstraints:true});
 env.emit('pointerdown',320,300,{ctrlKey:true});await new Promise(r=>setImmediate(r));assert.equal(held,true);env.emit('pointerup',320,300,{ctrlKey:true});assert.equal(held,false);assert.deepEqual(env.imageSelections.at(-1),{ids:[30],active:30});
 env.emit('pointerdown',250,230);await new Promise(r=>setImmediate(r));env.emit('pointermove',550,370);assert.equal(held,true);env.emit('pointerup',550,370);assert.equal(held,false);assert.deepEqual(env.imageSelections.at(-1),{ids:[30,31],active:31});assert.equal(prepares,2);assert.equal(env.commits.length,0);env.controller.destroy();
});
test('failed, canceled and stale geometry preparation release only an idle hold and never start a late gesture',async()=>{
 let held=false,resolvePose,rejectPose;
 const env=await setup('translate',{onPauseSimulation:()=>{held=true;},onEndGeometry:()=>{held=false;},onPrepareGeometry:()=>new Promise((resolve,reject)=>{resolvePose=resolve;rejectPose=reject;})});
 const scene={...env.scene,mode:'meshes',slots:[meshSlot],selectedSlot:9,selected:null,hasConstraints:true,meshTool:'move'};env.controller.setScene(scene);
 env.emit('pointerdown',300,200);assert.equal(held,true);rejectPose(Error('native pose rejected'));await new Promise(r=>setImmediate(r));assert.equal(held,false);assert.match(env.errors.at(-1),/native pose rejected/);
 env.emit('pointerdown',300,200);env.emit('pointercancel',300,200);assert.equal(held,false);resolvePose({bones,poseEpoch:71});await new Promise(r=>setImmediate(r));assert.equal(held,false);assert.equal(env.captured.size,0);
 env.emit('pointerdown',300,200);env.controller.setScene({...scene,revision:8});assert.equal(held,false);resolvePose({bones,poseEpoch:72});await new Promise(r=>setImmediate(r));env.emit('pointerup',320,210);assert.equal(held,false);assert.equal(env.commits.length,0);env.controller.destroy();
});
test('late canceled preparation cannot release a newer gesture hold or a pending real commit',async()=>{
 let held=false,finishCommit;const preparations=[];
 const env=await setup('translate',{onPauseSimulation:()=>{held=true;},onEndGeometry:()=>{held=false;},onPrepareGeometry:()=>new Promise(resolve=>preparations.push(resolve)),onCommit:()=>new Promise(resolve=>{finishCommit=resolve;})});
 const scene={...env.scene,mode:'meshes',slots:[meshSlot],selectedSlot:9,selected:null,hasConstraints:true,meshTool:'move'};env.controller.setScene(scene);
 env.emit('pointerdown',300,200);env.emit('pointerup',300,200);assert.equal(held,false);
 env.emit('pointerdown',300,200);preparations[0]({bones,poseEpoch:71});await new Promise(r=>setImmediate(r));assert.equal(held,true,'older completion must not release newer preparation');
 preparations[1]({bones,poseEpoch:72});await new Promise(r=>setImmediate(r));env.emit('pointermove',320,210);env.emit('pointerup',320,210);assert.equal(held,true);
 env.emit('pointerup',320,210);env.controller.setScene({...scene,revision:8});assert.equal(held,true,'idle up or revision update cannot end pending native commit');finishCommit(true);await new Promise(r=>setImmediate(r));assert.equal(held,false);env.controller.destroy();
});
test('idle clipping creation keeps its geometry suspension until draft ownership ends',async()=>{
 let held=false;const draft={slot:10,name:'cut',endSlot:10,convex:true,inverse:false,documentId:1,revision:7,points:[]};
 const env=await setup('translate',{onPauseSimulation:()=>{held=true;},onEndGeometry:()=>{held=false;},onClippingPoint:p=>draft.points.push({...p})});
 env.controller.setScene({...env.scene,mode:'clipping',clippingDraft:draft});env.emit('pointerdown',400,300);env.emit('pointerup',400,300);assert.equal(held,true);assert.equal(draft.points.length,1);assert.equal(env.commits.length,0);env.controller.setScene({...env.scene,mode:'images',clippingDraft:null});assert.equal(held,false);env.controller.destroy();
});

test('viewport teardown cancels a pending geometry preparation without resurrecting a late gesture',async()=>{
 let held=false,resolvePose;const env=await setup('translate',{onPauseSimulation:()=>{held=true;},onEndGeometry:()=>{held=false;},onPrepareGeometry:()=>new Promise(resolve=>{resolvePose=resolve;})});
 env.controller.setScene({...env.scene,mode:'meshes',slots:[meshSlot],selectedSlot:9,selected:null,hasConstraints:true,meshTool:'move'});env.emit('pointerdown',300,200);assert.equal(held,true);env.controller.destroy();assert.equal(held,false);resolvePose({bones,poseEpoch:81});await new Promise(r=>setImmediate(r));assert.equal(held,false);assert.equal(env.commits.length,0);assert.equal(env.captured.size,0);assert.equal(env.listeners.size,0);
});
test('teardown releases an active geometry drag but leaves pending native commits and clipping ownership intact',async()=>{
 let held=false,finishCommit;const env=await setup('translate',{onPauseSimulation:()=>{held=true;},onEndGeometry:()=>{held=false;},onCommit:()=>new Promise(resolve=>{finishCommit=resolve;})});
 env.controller.setScene({...env.scene,mode:'meshes',slots:[meshSlot],selectedSlot:9,selected:null,meshTool:'move'});env.emit('pointerdown',300,200);env.emit('pointermove',320,210);assert.equal(held,true);env.emit('pointerup',320,210);env.controller.destroy();assert.equal(held,true,'destroy cannot release a pending authored commit');finishCommit(true);await new Promise(r=>setImmediate(r));assert.equal(held,false);
 let draftHeld=false;const draft={slot:10,name:'cut',endSlot:10,convex:true,inverse:false,documentId:1,revision:7,points:[]};const clipping=await setup('translate',{onPauseSimulation:()=>{draftHeld=true;},onEndGeometry:()=>{draftHeld=false;}});clipping.controller.setScene({...clipping.scene,mode:'clipping',clippingDraft:draft});clipping.emit('pointerdown',400,300);clipping.controller.destroy();assert.equal(draftHeld,true,'clipping draft owns its suspension until canceled by workspace');
 const active=await setup('translate',{onPauseSimulation:()=>{held=true;},onEndGeometry:()=>{held=false;}});active.controller.setScene({...active.scene,mode:'meshes',slots:[meshSlot],selectedSlot:9,selected:null,meshTool:'move'});active.emit('pointerdown',300,200);active.emit('pointermove',320,210);assert.equal(held,true);active.controller.destroy();assert.equal(held,false);assert.equal(active.captured.size,0);assert.equal(active.commits.length,0);
});
