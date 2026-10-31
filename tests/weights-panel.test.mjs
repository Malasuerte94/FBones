// Actual compiled Vue controls; these checks do not replace native OS interaction.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {build} from 'esbuild';
import {parse,compileScript} from 'vue/compiler-sfc';
import {createRenderer,h,nextTick} from 'vue';
import {createPinia} from 'pinia';
const teleportBody=node('body');
globalThis.document={title:'',querySelector:selector=>selector==='body'?teleportBody:null,addEventListener(){},removeEventListener(){}};
globalThis.window={innerWidth:1440,innerHeight:900,performance:globalThis.performance,addEventListener(){},removeEventListener(){}};
globalThis.Document=class Document{};globalThis.ShadowRoot=class ShadowRoot{};
globalThis.__TAURI__={core:{invoke:async()=>{throw Error('Component routing must not directly invoke native APIs');}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const {i18n}=await import('../src/i18n.ts');
mkdirSync('.local/weights-panel-tests',{recursive:true});
const compiled=[];
for(const [name,path] of [['Panel','src/components/organisms/WeightsPanel.vue'],['Tree','src/components/organisms/SceneTree.vue']]){
 const outfile=`.local/weights-panel-tests/${name}-${process.pid}.mjs`;
 await build({entryPoints:[path],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'vue-sfc',setup(builder){builder.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});}}]});
 compiled.push((await import(new URL('../'+outfile,import.meta.url))).default);unlinkSync(outfile);
}
const [Panel,Tree]=compiled;
function node(type,text=''){return{type,tagName:type.toUpperCase(),text,children:[],props:{},parent:null,listeners:{},getRootNode(){return document;},addEventListener(name,handler){this.listeners[name]=handler;},removeEventListener(name){delete this.listeners[name];},get options(){return this.children.flatMap(child=>child.tagName==='OPTION'?[child]:child.options??[]);}};}
const renderer=createRenderer({querySelector:selector=>document.querySelector(selector),createElement:type=>node(type),createText:text=>node('#text',text),createComment:text=>node('#comment',text),setText:(n,text)=>n.text=text,setElementText:(n,text)=>{n.text=text;n.children=[];},patchProp:(n,key,_old,value)=>{n.props[key]=value;if(key==='value'){n._value=value;n.value=String(value);}else if(key==='multiple'||key==='type')n[key]=value;},parentNode:n=>n.parent,nextSibling:n=>{const at=n.parent?.children.indexOf(n)??-1;return n.parent?.children[at+1]??null;},insert(n,parent,anchor=null){if(n.parent){const at=n.parent.children.indexOf(n);if(at>=0)n.parent.children.splice(at,1);}n.parent=parent;const at=anchor?parent.children.indexOf(anchor):-1;if(at<0)parent.children.push(n);else parent.children.splice(at,0,n);},remove(n){const at=n.parent?.children.indexOf(n)??-1;if(at>=0)n.parent.children.splice(at,1);n.parent=null;}});
const flatten=n=>[n,...n.children.flatMap(flatten)];
function fixture(weighted=true){
 const dense={weighted,bones:weighted?[0,1]:[0],vertices:[[0,0],[40,0],[0,40]].map(([x,y])=>({weights:weighted?[.6,.4]:[1],positions:weighted?[x,y,x-20,y]:[x,y]})),edges:[0,1,1,2,2,0]};
 const clip=id=>({id,slot:7,name:`mask ${id}`,type:'clipping',region:null,mesh:null,imageAvailable:false,clipping:{...structuredClone(dense),endSlot:7,convex:false,inverse:false,color:0xce3a8bff}});
 const region={image:'active',name:'active',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:32};
 const active={id:9,slot:7,name:'active',type:'region',region,mesh:null,clipping:null,imageAvailable:true};
 return{...draftSummary('Weights controls'),documentId:42,revision:5,sceneEditing:true,dirty:false,boneCount:2,bones:[...draftSummary('root').bones,{id:1,parent:0,name:'child',x:20,y:0,length:30,rotation:0}],slots:[{id:7,name:'owner',bone:0,visible:true,blend:'normal',region,imageAvailable:true,activeAttachmentId:9,attachments:[active,clip(0),clip(1)]}]};
}
async function setup(model=fixture(),Component=Panel){const pinia=createPinia(),w=useWorkspace(pinia);w.project=model;w.selectAttachment(0);const calls=[],nativeEdit=w.editRig;w.editRig=async edit=>{calls.push(structuredClone(edit));return true;};const target=node('root'),app=renderer.createApp({render:()=>h(Component)});app.use(pinia);app.use(i18n);app.mount(target);await nextTick();return{w,calls,target,app,nativeEdit,find:id=>flatten(target).find(n=>n.props['data-testid']===id)};}
function row(env,id){return flatten(env.target).find(n=>n.props['data-weight-bone']===id);}
function checkbox(env,id){return flatten(row(env,id)).find(n=>n.props.type==='checkbox');}

test('rigid clipping shows zero bound members and same-slot attachment changes discard pending membership',async()=>{
 const env=await setup(fixture(false));const {w,app,find}=env;const before=JSON.stringify(w.project);
 assert.equal(find('weights-target').text,'mask 0');assert.equal(checkbox(env,0).props.checked,false);assert.equal(checkbox(env,1).props.checked,false);
 assert.equal(find('weights-auto').props.disabled,true);assert.equal(find('weights-unbind').props.disabled,true);assert.equal(find('weights-normalize').props.disabled,true);
 checkbox(env,1).props.onChange({target:{checked:true}});await nextTick();assert.equal(checkbox(env,1).props.checked,true);
 w.selectAttachment(1);await nextTick();assert.equal(checkbox(env,1).props.checked,false);assert.equal(find('weights-target').text,'mask 1');
 assert.equal(w.influence,null);assert.equal(JSON.stringify(w.project),before);assert.deepEqual(env.calls,[]);app.unmount();
});
test('inactive clipping controls address its stable attachment ID for Bind Auto numeric Normalize and Unbind',async()=>{
 const env=await setup();const {w,calls,find,app}=env;const before=JSON.stringify(w.project);
 find('weights-bind').props.onClick();find('weights-auto').props.onClick();find('weights-normalize').props.onClick();find('weights-unbind').props.onClick();
 w.selectedVertex=0;await nextTick();const number=flatten(env.target).find(n=>n.props.type==='number'&&n.props['aria-label']==='Weight root');assert.ok(number);
 number.props.onChange({target:{value:'50'}});number.props.onChange({target:{value:'-1'}});assert.ok(w.inspectorError);number.props.onChange({target:{value:'50'}});assert.equal(w.inspectorError,'');
 assert.deepEqual(calls,[{type:'bindAttachment',id:0,bones:[0,1]},{type:'autoAttachmentWeights',id:0},{type:'normalizeAttachmentWeights',id:0},{type:'bindAttachment',id:0,bones:[]},{type:'setAttachmentWeight',id:0,vertex:0,bone:0,value:.5}]);
 assert.equal(JSON.stringify(w.project),before);assert.equal(w.slots[0].activeAttachmentId,9);assert.equal(w.selectedAttachmentId,0);app.unmount();
});
test('legacy mesh controls retain slot-addressed commands',async()=>{
 const model=fixture(),dense=model.slots[0].attachments[1].clipping;
 const mesh={weighted:true,bones:dense.bones,vertices:dense.vertices,edges:dense.edges,uvs:[0,0,1,0,0,1],triangles:[0,1,2],hull:3};
 model.sceneEditing=false;model.slots=[{id:7,name:'legacy',bone:0,visible:true,blend:'normal',region:model.slots[0].region,imageAvailable:true,mesh}];
 const env=await setup(model);env.w.selectSlot(7);await nextTick();env.find('weights-bind').props.onClick();env.find('weights-auto').props.onClick();env.find('weights-normalize').props.onClick();env.find('weights-unbind').props.onClick();
 assert.deepEqual(env.calls,[{type:'bindMesh',id:7,bones:[0,1]},{type:'autoWeights',id:7},{type:'normalizeWeights',id:7},{type:'bindMesh',id:7,bones:[]}]);env.app.unmount();
});
test('Weights Tree bone selection retains the clipping target and activation',async()=>{
 const env=await setup(fixture(),Tree);env.w.setMode('weights');await nextTick();const before=JSON.stringify(env.w.project);
 const bone=flatten(env.target).find(n=>n.props['data-tree-kind']==='bone'&&Number(n.props['data-tree-id'])===1);assert.ok(bone);flatten(bone).find(n=>n.props.role==='treeitem').props.onClick({ctrlKey:false,metaKey:false,shiftKey:false});await nextTick();
 assert.equal(env.w.influence,1);assert.equal(env.w.selectedAttachmentId,0);assert.equal(env.w.editMode,'weights');assert.equal(JSON.stringify(env.w.project),before);env.app.unmount();
});

test('Direct mode exposes functional numeric and slider edits while hiding brush sliders',async()=>{
 const env=await setup();const {w,find,calls,app}=env;const before=JSON.stringify(w.project);
 w.brushMode='direct';w.selectedVertex=0;w.influence=1;await nextTick();
 find('weights-mode').props.onChange();await nextTick();assert.equal(w.editMode,'weights');assert.equal(w.selectedAttachmentId,0);
 assert.ok(find('weights-direct-control'));assert.equal(find('weights-direct-number').props.value,'40.0');
 assert.equal(flatten(env.target).some(n=>n.text==='Strength'),false);assert.equal(flatten(env.target).some(n=>n.text==='Feather'),false);
 find('weights-direct-number').props.onChange({target:{value:'55'}});find('weights-direct-slider').props.onChange({target:{value:'30'}});
 let blurred=false;find('weights-direct-number').props.onKeydown({key:'Enter',preventDefault(){},target:{blur(){blurred=true;}}});assert.equal(blurred,true);
 assert.deepEqual(calls,[{type:'setAttachmentWeight',id:0,vertex:0,bone:1,value:.55},{type:'setAttachmentWeight',id:0,vertex:0,bone:1,value:.3}]);
 assert.equal(JSON.stringify(w.project),before);w.brushMode='subtract';await nextTick();assert.equal(find('weights-direct-control'),undefined);assert.ok(flatten(env.target).some(n=>n.text==='Strength'));app.unmount();
});

test('pending Direct and per-bone numeric drafts survive hover repaint and old target handlers cannot edit a replacement',async()=>{
 const env=await setup();const {w,find,calls,app}=env;w.brushMode='direct';w.selectedVertex=0;w.influence=1;await nextTick();
 const direct=find('weights-direct-number');direct.props.onInput({target:{value:'37'}});
 row(env,0).props.onPointerenter();await nextTick();assert.equal(find('weights-direct-number').props.value,'37');assert.equal(w.influence,1);assert.equal(w.selectedVertex,0);
 const rootField=flatten(env.target).find(n=>n.props.type==='number'&&n.props['aria-label']==='Weight root');rootField.props.onInput({target:{value:'63'}});
 row(env,1).props.onPointerenter();await nextTick();assert.equal(flatten(env.target).find(n=>n.props.type==='number'&&n.props['aria-label']==='Weight root').props.value,'63');assert.equal(find('weights-direct-number').props.value,'37');
 const lateDirect=direct.props.onChange,lateRoot=rootField.props.onChange;w.selectAttachment(1);w.selectedVertex=0;await nextTick();
 lateDirect({target:{value:'11'}});lateRoot({target:{value:'12'}});await nextTick();assert.deepEqual(calls,[]);assert.equal(find('weights-direct-number').props.value,'40.0');app.unmount();
});
test('Enter change and blur share one synchronous edit and a successful sole-influence no-op restores authoritative text',async()=>{
 const model=fixture();for(const attachment of model.slots[0].attachments)if(attachment.clipping)attachment.clipping.vertices[0].weights=[1,0];
 const env=await setup(model);const {w,find,calls,app}=env;w.brushMode='direct';w.selectedVertex=0;w.influence=0;await nextTick();let finish;
 w.editRig=edit=>{calls.push(structuredClone(edit));return new Promise(resolve=>{finish=resolve;});};
 const field=find('weights-direct-number'),target={value:'50',blur(){field.props.onChange({target:this});field.props.onBlur();}};field.props.onInput({target});
 field.props.onKeydown({key:'Enter',preventDefault(){},target});assert.equal(calls.length,1,'native edit starts before Save/blur can run');assert.equal(calls[0].value,.5);
 finish(true);await new Promise(resolve=>setImmediate(resolve));await nextTick();assert.equal(find('weights-direct-number').props.value,'100.0');assert.equal(calls.length,1);app.unmount();
});
test('Escape and target changes cancel invalid drafts and clear only owned errors without native edits',async()=>{
 const env=await setup();const {w,find,calls,app}=env;w.brushMode='direct';w.selectedVertex=0;w.influence=1;await nextTick();
 let field=find('weights-direct-number');field.props.onInput({target:{value:''}});field.props.onBlur();await nextTick();assert.ok(w.inspectorError);assert.equal(find('weights-direct-number').props['aria-invalid'],true);
 const target={value:'',blur(){field.props.onChange({target:this});field.props.onBlur();}};field.props.onKeydown({key:'Escape',preventDefault(){},stopPropagation(){},target});await nextTick();assert.equal(w.inspectorError,'');assert.equal(find('weights-direct-number').props.value,'40.0');assert.deepEqual(calls,[]);
 field=find('weights-direct-number');field.props.onInput({target:{value:'101'}});field.props.onBlur();assert.ok(w.inspectorError);w.selectedVertex=1;await nextTick();assert.equal(w.inspectorError,'');
 field=find('weights-direct-number');field.props.onInput({target:{value:''}});field.props.onBlur();w.inspectorError='Other inspector failure';field.props.onKeydown({key:'Escape',preventDefault(){},stopPropagation(){},target:{value:'',blur(){}}});assert.equal(w.inspectorError,'Other inspector failure');assert.deepEqual(calls,[]);app.unmount();
});

test('Save waits for the real workspace edit started by a numeric blur and rejects an invalid pending draft',async()=>{
 const env=await setup();const {w,find,app}=env;w.editRig=env.nativeEdit;w.brushMode='direct';w.selectedVertex=0;w.influence=1;await nextTick();
 const originalInvoke=globalThis.__TAURI__.core.invoke;let release,editStarted=false,saveStarted=false,model=JSON.parse(JSON.stringify(w.project));
 globalThis.__TAURI__.core.invoke=async(command,args)=>{
  if(command==='edit_rig'){
   editStarted=true;assert.equal(args.edit.type,'setAttachmentWeight');assert.equal(args.edit.id,0);assert.equal(args.edit.value,.37);assert.equal(args.expectedRevision,5);
   await new Promise(resolve=>{release=resolve;});model=JSON.parse(JSON.stringify(model));model.slots[0].attachments[1].clipping.vertices[0].weights=[.63,.37];model.revision++;model.dirty=true;return model;
  }
  if(command==='save_project'){saveStarted=true;assert.equal(editStarted,true);model={...model,dirty:false};return model;}
  throw Error('Unexpected native command '+command);
 };
 try{
  let field=find('weights-direct-number');field.props.onInput({target:{value:'37'}});field.props.onBlur();const saving=w.save();assert.equal(editStarted,true);assert.equal(saveStarted,false);
  release();assert.equal(await saving,true);await nextTick();assert.equal(saveStarted,true);assert.equal(find('weights-direct-number').props.value,'37.0');
  saveStarted=false;field=find('weights-direct-number');field.props.onInput({target:{value:''}});field.props.onBlur();assert.equal(await w.save(),false);assert.equal(saveStarted,false);assert.ok(w.inspectorError);
 }finally{globalThis.__TAURI__.core.invoke=originalInvoke;app.unmount();}
});

test('untouched formatted fractional weights and Escape never round native precision on blur',async()=>{
 const model=fixture(),fraction=Math.fround(.37123456);for(const a of model.slots[0].attachments)if(a.clipping)a.clipping.vertices[0].weights=[Math.fround(1-fraction),fraction];
 const env=await setup(model);const {w,find,calls,app}=env;w.brushMode='direct';w.selectedVertex=0;w.influence=1;await nextTick();
 let field=find('weights-direct-number');assert.equal(field.props.value,'37.1');field.props.onBlur();await nextTick();assert.deepEqual(calls,[],'untouched rounded display is not an edit');
 field=find('weights-direct-number');field.props.onInput({target:{value:'11'}});const target={value:'11',blur(){field.props.onChange({target:this});field.props.onBlur();}};
 field.props.onKeydown({key:'Escape',preventDefault(){},stopPropagation(){},target});await nextTick();assert.deepEqual(calls,[],'Escape restoration cannot round authoring weights');assert.equal(find('weights-direct-number').props.value,'37.1');
 field=find('weights-direct-number');field.props.onInput({target:{value:'37'}});field.props.onChange({target:{value:'37'}});assert.equal(calls.length,1);assert.equal(calls[0].value,.37);app.unmount();
});

test('Auto panel uses explicit vertex/candidate scopes while Bind checkboxes stay independent',async()=>{
 const env=await setup(),{w,find,calls,app}=env;
 w.selectWeightVertices([0,2],2);w.chooseInfluence(1);await nextTick();
 assert.ok(find('weights-auto-scope').text.includes('2 vertices'));assert.ok(find('weights-auto-scope').text.includes('1 influences'));
 checkbox(env,0).props.onChange({target:{checked:false}});find('weights-auto').props.onClick();
 assert.deepEqual(calls,[{type:'autoAttachmentWeights',id:0,scope:{vertices:[0,2],bones:[1]}}]);
 assert.deepEqual(w.selectedBinding.bones,[0,1]);find('weights-all-vertices').props.onClick();find('weights-all-influences').props.onClick();await nextTick();
 find('weights-auto').props.onClick();assert.deepEqual(calls.at(-1),{type:'autoAttachmentWeights',id:0});app.unmount();
});
test('mixed group numeric input commits one captured batch and old-group handlers cannot touch a new selection',async()=>{
 const model=fixture();for(const a of model.slots[0].attachments)if(a.clipping)a.clipping.vertices[1].weights=[.2,.8];
 const env=await setup(model),{w,find,calls,app}=env;w.brushMode='direct';w.influence=1;w.selectWeightVertices([0,1],1);await nextTick();
 let field=find('weights-direct-number');assert.equal(field.props.value,'');assert.equal(field.props.placeholder,'*');assert.equal(find('weights-direct-slider').props.disabled,true);
 field.props.onBlur();assert.equal(w.inspectorError,'');assert.deepEqual(calls,[]);
 field.props.onInput({target:{value:'37'}});const target={value:'37',blur(){field.props.onChange({target:this});field.props.onBlur();}};
 field.props.onKeydown({key:'Enter',preventDefault(){},target});
 assert.deepEqual(calls,[{type:'paintAttachmentWeights',id:0,bone:1,changes:[{vertex:0,value:.37},{vertex:1,value:.37}]}]);
 const late=field.props.onChange;w.selectWeightVertices([1,2],2);await nextTick();late({target:{value:'12'}});assert.equal(calls.length,1);
 field=find('weights-direct-number');field.props.onInput({target:{value:'11'}});const cancel={value:'11',blur(){field.props.onChange({target:this});field.props.onBlur();}};
 field.props.onKeydown({key:'Escape',preventDefault(){},stopPropagation(){},target:cancel});await nextTick();assert.equal(w.inspectorError,'');assert.equal(calls.length,1);app.unmount();
});

test('locked direct targets remain editable while manual Normalize and Auto capture protection',async()=>{
 const {w,find,calls,app}=await setup();w.brushMode='direct';w.influence=1;w.selectWeightVertices([0],0);await nextTick();
 find('weights-lock-1').props.onClick();await nextTick();assert.equal(find('weights-lock-1').props['aria-pressed'],true);
 assert.deepEqual(calls,[]);const field=find('weights-direct-number');assert.equal(field.props.disabled,false);
 field.props.onInput({target:{value:'50'}});field.props.onChange({target:{value:'50'}});
 assert.deepEqual(calls.at(-1),{type:'setAttachmentWeight',id:0,vertex:0,bone:1,value:.5,lockedBones:[1]});
 find('weights-normalize').props.onClick();assert.deepEqual(calls.at(-1),{type:'normalizeAttachmentWeights',id:0,lockedBones:[1]});
 w.chooseInfluence(1);await nextTick();find('weights-auto').props.onClick();
 assert.deepEqual(calls.at(-1),{type:'autoAttachmentWeights',id:0,scope:{vertices:[0],bones:[1],lockedBones:[1]}});
 app.unmount();
});
