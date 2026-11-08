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

globalThis.document={title:'',activeElement:null,addEventListener(){},removeEventListener(){}};
globalThis.window={innerWidth:1440,innerHeight:900,performance:globalThis.performance,addEventListener(){},removeEventListener(){}};
globalThis.Document=class{};globalThis.ShadowRoot=class{};
globalThis.__TAURI__={core:{invoke:async()=>{throw Error('Component checks must not invoke native APIs');}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const {i18n}=await import('../src/i18n.ts');
mkdirSync('.local/attachment-color-control-tests',{recursive:true});const outfile=`.local/attachment-color-control-tests/ColorEditor-${process.pid}.mjs`;
await build({entryPoints:['src/components/organisms/AttachmentColorEditor.vue'],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'vue-sfc',setup(builder){builder.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});}}]});
const ColorEditor=(await import(new URL('../'+outfile,import.meta.url))).default;unlinkSync(outfile);
function node(type,text=''){return{type,tagName:type.toUpperCase(),text,children:[],props:{},parent:null,listeners:{},setPointerCapture(id){this.pointer=id;},hasPointerCapture(id){return this.pointer===id;},releasePointerCapture(){this.pointer=null;},blur(){},getRootNode(){return document;},addEventListener(name,callback){this.listeners[name]=callback;},removeEventListener(name){delete this.listeners[name];},get options(){return this.children.flatMap(child=>child.tagName==='OPTION'?[child]:child.options??[]);}};}
const renderer=createRenderer({createElement:type=>node(type),createText:text=>node('#text',text),createComment:text=>node('#comment',text),setText:(n,text)=>n.text=text,setElementText:(n,text)=>{n.text=text;n.children=[];},patchProp:(n,key,_old,value)=>{n.props[key]=value;if(key==='value'){n._value=value;n.value=String(value);}else if(key==='multiple'||key==='type')n[key]=value;},parentNode:n=>n.parent,nextSibling:n=>{const at=n.parent?.children.indexOf(n)??-1;return n.parent?.children[at+1]??null;},insert(n,parent,anchor=null){if(n.parent){const at=n.parent.children.indexOf(n);if(at>=0)n.parent.children.splice(at,1);}n.parent=parent;const at=anchor?parent.children.indexOf(anchor):-1;if(at<0)parent.children.push(n);else parent.children.splice(at,0,n);},remove(n){const at=n.parent?.children.indexOf(n)??-1;if(at>=0)n.parent.children.splice(at,1);n.parent=null;}});
const flatten=n=>[n,...n.children.flatMap(flatten)];
const clone=value=>JSON.parse(JSON.stringify(value));
async function fixture(){
 const pinia=createPinia(),w=useWorkspace(pinia),region={name:'Own',image:'own',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},attachment=(id,color)=>({id,slot:7,name:'Own '+id,type:'region',region:{...region},mesh:null,clipping:null,imageAvailable:true,color,sequence:{start:0,count:2,digits:1,setupIndex:0}});
 w.project={...draftSummary('Own tint'),documentId:42,revision:1,sceneEditing:true,slots:[{id:7,bone:0,name:'Own slot',color:0x804020ff,visible:true,blend:'normal',region,mesh:null,imageAvailable:true,activeAttachmentId:9,attachments:[attachment(9,0xff80407f),attachment(10,undefined)]}],animations:[{id:1,name:'Own',duration:0,tracks:[]}]};w.selectAttachment(9);
 const edits=[];w.editRig=async(edit,revision)=>{edits.push({edit:clone(edit),revision});const next=clone(w.project);next.slots[0].attachments.find(a=>a.id===edit.id).color=edit.color;next.revision++;w.project=next;return true;};
 const target=node('root'),app=renderer.createApp({render:()=>h(ColorEditor,{attachment:w.selectedAttachment??w.sceneAttachments.find(a=>a.id===w.selectedSlot?.activeAttachmentId)??w.sceneAttachments[0]})});app.use(pinia);app.use(i18n);app.mount(target);await nextTick();return{w,edits,app,find:id=>flatten(target).find(n=>n.props['data-testid']===id)};
}
const event=(field,value)=>({target:field,currentTarget:field,pointerId:1,key:value,preventDefault(){},stopPropagation(){}});
async function opacity(e,value,key='Enter'){const field=e.find('attachment-color-opacity');field.props.onFocus();field.value=value;field.props.onInput(event(field));await nextTick();field.props.onKeydown(event(field,key));await nextTick();}

test('compiled attachment RGB preserves alpha and precision opacity commits one packed Setup color without changing slot keys or Sequence',async()=>{
 const e=await fixture();try{
  assert.equal(e.find('attachment-color-rgb').value,'#ff8040');assert.equal(e.find('attachment-color-opacity').value,String(127*100/255));const original=clone(e.w.project.slots[0]),rgb=e.find('attachment-color-rgb');rgb.props['onUpdate:modelValue']('#808080');await nextTick();await rgb.props.onChange();await nextTick();assert.deepEqual(e.edits[0],{edit:{type:'setAttachmentColor',id:9,color:0x8080807f},revision:1});
  await opacity(e,'50');assert.deepEqual(e.edits[1].edit,{type:'setAttachmentColor',id:9,color:0x80808080});const current=e.w.project.slots[0];assert.equal(current.color,original.color);assert.deepEqual(current.attachments[0].sequence,original.attachments[0].sequence);assert.deepEqual(current.attachments[0].region,original.attachments[0].region);assert.deepEqual(e.w.project.animations[0].tracks,[]);
  const range=e.find('attachment-color-opacity-slider');range.props.onPointerdown(event(range));for(const value of ['30','20','10']){range.value=value;range.props.onInput(event(range));await nextTick();}assert.equal(e.edits.length,2);range.props.onPointerup(event(range));await nextTick();assert.equal(e.edits.length,3);assert.equal(e.edits[2].edit.color,0x8080801a);
 }finally{e.app.unmount();}
});

test('compiled tint rejects invalid opacity, Escape cancels and stale readonly busy or Animate controls cannot edit',async()=>{
 const e=await fixture();try{
  await opacity(e,'101');assert.match(e.w.attachmentColorError,/0 to 100/);assert.equal(e.edits.length,0);await opacity(e,'80','Escape');assert.equal(e.w.attachmentColorError,'');assert.equal(e.find('attachment-color-opacity').value,String(127*100/255));assert.equal(e.edits.length,0);
  const old=e.find('attachment-color-rgb').props.onChange;e.w.selectAttachment(10);await nextTick();old();await nextTick();assert.equal(e.edits.length,0);assert.equal(e.find('attachment-color-rgb').value,'#ffffff');
  e.w.busy=true;await nextTick();assert.equal(e.find('attachment-color-rgb').props.disabled,true);e.find('attachment-color-rgb').props.onChange();assert.equal(e.edits.length,0);e.w.busy=false;e.w.project={...e.w.project,inspectionOnly:true};await nextTick();assert.equal(e.find('attachment-color-opacity').props.disabled,true);e.w.project={...e.w.project,inspectionOnly:false};await e.w.setEditorMode('animate');await nextTick();assert.ok(e.find('attachment-color-setup-hint'));assert.equal(e.find('attachment-color-rgb').props.disabled,true);e.find('attachment-color-rgb').props.onChange();assert.equal(e.edits.length,0);
 }finally{e.app.unmount();assert.equal(e.w.attachmentColorError,'');}
});
