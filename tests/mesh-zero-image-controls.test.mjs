// Actual compiled Vue controls + production geometry helpers. The custom host,
// synthetic events and collected command intents are not browser/native proof.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {build} from 'esbuild';
import {parse,compileScript} from 'vue/compiler-sfc';
import {createRenderer,h,nextTick} from 'vue';
import {createPinia} from 'pinia';
import {meshPoints} from '../src/domain/meshes.ts';
import {imageAt} from '../src/domain/images.ts';
import {imagePolygon} from '../src/domain/sceneSelection.ts';

globalThis.document={title:'',activeElement:null,addEventListener(){},removeEventListener(){}};
globalThis.window={innerWidth:1440,innerHeight:900,performance:globalThis.performance,addEventListener(){},removeEventListener(){}};
globalThis.Document=class{};globalThis.ShadowRoot=class{};
globalThis.__TAURI__={core:{invoke:async()=>{throw Error('Component checks must not invoke native APIs');}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const {i18n}=await import('../src/i18n.ts');
mkdirSync('.local/mesh-zero-image-control-tests',{recursive:true});const outfile=`.local/mesh-zero-image-control-tests/MeshTools-${process.pid}.mjs`;
await build({entryPoints:['src/components/organisms/MeshTools.vue'],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'vue-sfc',setup(builder){builder.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});}}]});
const MeshTools=(await import(new URL('../'+outfile,import.meta.url))).default;unlinkSync(outfile);
function node(type,text=''){return{type,tagName:type.toUpperCase(),text,children:[],props:{},parent:null,listeners:{},getRootNode(){return document;},addEventListener(name,callback){this.listeners[name]=callback;},removeEventListener(name){delete this.listeners[name];},get options(){return this.children.flatMap(child=>child.tagName==='OPTION'?[child]:child.options??[]);}};}
const renderer=createRenderer({createElement:type=>node(type),createText:text=>node('#text',text),createComment:text=>node('#comment',text),setText:(n,text)=>n.text=text,setElementText:(n,text)=>{n.text=text;n.children=[];},patchProp:(n,key,_old,value)=>{n.props[key]=value;if(key==='value'){n._value=value;n.value=String(value);}else if(key==='multiple'||key==='type')n[key]=value;},parentNode:n=>n.parent,nextSibling:n=>{const at=n.parent?.children.indexOf(n)??-1;return n.parent?.children[at+1]??null;},insert(n,parent,anchor=null){if(n.parent){const at=n.parent.children.indexOf(n);if(at>=0)n.parent.children.splice(at,1);}n.parent=parent;const at=anchor?parent.children.indexOf(anchor):-1;if(at<0)parent.children.push(n);else parent.children.splice(at,0,n);},remove(n){const at=n.parent?.children.indexOf(n)??-1;if(at>=0)n.parent.children.splice(at,1);n.parent=null;}});
const flatten=n=>[n,...n.children.flatMap(flatten)];
function model(width=0,height=0){
 const region={name:'Own mesh image',image:'own',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width,height};
 const mesh={weighted:false,bones:[0],vertices:[[-16,-12],[-16,12],[16,12],[16,-12]].map(positions=>({weights:[1],positions})),uvs:[0,1,0,0,1,0,1,1],triangles:[0,1,2,0,2,3],edges:[0,1,1,2,2,3,3,0],hull:4};
 const attachment=id=>({id,slot:7,name:'Own mesh '+id,type:'mesh',region:{...region},mesh:structuredClone(mesh),clipping:null,imageAvailable:true});
 return{...draftSummary('Own zero metadata'),documentId:42,revision:5,sceneEditing:true,slots:[{id:7,name:'Own slot',bone:0,visible:true,blend:'normal',region,mesh,imageAvailable:true,activeAttachmentId:9,attachments:[attachment(9),attachment(10)]}],animations:[{id:1,name:'Own deformation',duration:30,tracks:[]}],animationChannels:['translate','rotate','scale','shear'],animationFps:30};
}
async function setup(source=model()){
 const pinia=createPinia(),w=useWorkspace(pinia);w.project=source;w.selectAttachment(9);w.selectedVertex=0;const edits=[],keys=[];w.editRig=async edit=>{edits.push(JSON.parse(JSON.stringify(edit)));return true;};w.insertDeformKey=async id=>{keys.push(id);return true;};
 const target=node('root'),app=renderer.createApp({render:()=>h(MeshTools)});app.use(pinia);app.use(i18n);app.mount(target);await nextTick();
 return{w,edits,keys,target,app,find:id=>flatten(target).find(n=>n.props['data-testid']===id)};
}

test('zero Mesh image metadata retains authored geometry and only Reset to quad is unavailable',async()=>{
 for(const [width,height]of [[0,0],[0,24],[32,0]]){
  const source=model(width,height),before=JSON.stringify(source),e=await setup(source);try{
   const points=meshPoints(e.w.renderedBones,e.w.selectedSlot.mesh);assert.deepEqual(points,[{x:-16,y:-12},{x:-16,y:12},{x:16,y:12},{x:16,y:-12}]);assert.deepEqual(imagePolygon(e.w.renderedBones,e.w.selectedSlot),points);assert.equal(imageAt(e.w.renderedBones,[e.w.selectedSlot],10,8)?.id,7);
   assert.equal(e.find('mesh-reset').props.disabled,true);assert.match(e.find('mesh-reset-unavailable').text,/nonzero image width and height/);assert.equal(e.find('mesh-reset').props.title,e.find('mesh-reset-unavailable').text);e.find('mesh-reset').props.onClick();assert.deepEqual(e.edits,[]);
   const edit=flatten(e.target).find(n=>n.type==='button'&&flatten(n).some(child=>child.text==='Edit mesh'));assert.ok(edit);assert.equal(edit.props.disabled,false);assert.equal(JSON.stringify(source),before);
  }finally{e.app.unmount();}
 }
});

test('zero Mesh image metadata still permits Animate vertex deformation and manual deformation key routing',async()=>{
 const e=await setup();try{
  e.w.editorMode='animate';e.w.animationId=1;e.w.selectedVertex=0;await nextTick();assert.equal(e.find('mesh-reset'),undefined);const key=e.find('deform-key');assert.ok(key);assert.equal(key.props.disabled,false);key.props.onClick();assert.deepEqual(e.keys,[9]);
  const field=flatten(e.target).find(n=>n.tagName==='INPUT'&&n.props['aria-label']===i18n.global.t('vertex')+' '+i18n.global.t('x'));assert.ok(field);assert.equal(field.props.disabled,false);field.props.onChange({target:{value:'-11'}});await nextTick();assert.deepEqual(e.edits,[{type:'moveVertices',id:7,vertices:[{vertex:0,x:-11,y:-12}],editUvs:false}]);assert.equal(e.w.project.slots[0].region.width,0);assert.equal(e.w.project.slots[0].region.height,0);
 }finally{e.app.unmount();}
});

test('positive metadata Reset sends one current-target command and stale readonly or busy handlers cannot reset',async()=>{
 const e=await setup(model(32,24));try{
  let reset=e.find('mesh-reset');assert.equal(reset.props.disabled,false);assert.equal(e.find('mesh-reset-unavailable'),undefined);reset.props.onClick();assert.deepEqual(e.edits,[{type:'resetMesh',id:7}]);const stale=reset.props.onClick;e.w.selectAttachment(10);await nextTick();stale();assert.equal(e.edits.length,1,'old attachment callback cannot reset a replacement');
  e.w.busy=true;await nextTick();reset=e.find('mesh-reset');assert.equal(reset.props.disabled,true);reset.props.onClick();assert.equal(e.edits.length,1);e.w.busy=false;e.w.project={...e.w.project,inspectionOnly:true};await nextTick();reset=e.find('mesh-reset');assert.equal(reset.props.disabled,true);reset.props.onClick();assert.equal(e.edits.length,1);
 }finally{e.app.unmount();}
});
