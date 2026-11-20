// Production workspace + actual App status fragment/command. Synthetic transport
// and Vue host prove frontend lifecycle/routing, not native import, paint or OS UI.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {parse,compileScript} from 'vue/compiler-sfc';
import {build,transform} from 'esbuild';
import ts from 'typescript';
import {h,nextTick,reactive} from 'vue';
import {createPinia,disposePinia} from 'pinia';
import {renderer,node,flatten} from './support/scene-slots-host.mjs';
import {i18n} from '../src/i18n.ts';
let invoke=async name=>{throw Error('Unexpected native call '+name);};
globalThis.__TAURI__={core:{invoke:(...args)=>invoke(...args)},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
document.querySelectorAll=()=>[];
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const appSource=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8'),descriptor=parse(appSource).descriptor;
function findById(n,id){if(n.props?.some(p=>p.type===6&&p.name==='data-testid'&&p.value?.content===id))return n;for(const child of n.children??[]){const found=findById(child,id);if(found)return found;}}
const opening=findById(descriptor.template.ast,'project-opening'),announcement=findById(descriptor.template.ast,'project-opening-announcement');assert.ok(opening&&announcement,'compile the actual App opening status');assert.ok(descriptor.template.ast.children.includes(announcement),'live announcement must be a sibling outside the busy main');
const statusSource=`<script setup>import {useI18n} from 'vue-i18n';const {t}=useI18n();defineProps({w:Object});</script><template>${opening.loc.source}${announcement.loc.source}</template>`;
const script=compileScript(parse(statusSource).descriptor,{id:'own-opening-status',inlineTemplate:true}).content;
mkdirSync('.local/workspace-loading-tests',{recursive:true});const outfile=`.local/workspace-loading-tests/status-${process.pid}.mjs`;
writeFileSync(outfile,(await transform(script,{loader:'ts',format:'esm'})).code);
const Status=(await import(new URL('../'+outfile,import.meta.url))).default;unlinkSync(outfile);
const noticeOutput=`.local/workspace-loading-tests/inspection-${process.pid}.mjs`;
await build({entryPoints:['src/components/molecules/ProjectInspectionNotice.vue'],outfile:noticeOutput,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'actual-sfc',setup(b){b.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});}}]});
const InspectionNotice=(await import(new URL('../'+noticeOutput,import.meta.url))).default;unlinkSync(noticeOutput);
const ast=ts.createSourceFile('App.ts',descriptor.scriptSetup.content,ts.ScriptTarget.Latest,true),command=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='command');
const commandJs=ts.transpileModule(command.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const appCommand=(w,animationTools,creator={value:false},gifDialog={value:false})=>new Function('w','creatorModalOpen','linkedMeshCreator','closeCreators','findReplaceOpen','document','updater','mcp','animationTools','gifDialog','canExportGif',commandJs+';return command;')(
  w,creator,creator,()=>{creator.value=false;},{value:false},document,{installing:{value:false},checkNow:async()=>{}},
  {state:{value:{enabled:false}},visible:{value:false}},animationTools,gifDialog,{value:true});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const model=name=>({...draftSummary(name),dirty:false,sceneEditing:true,documentId:name==='Old'?1:2,logicalDocumentId:name==='Old'?11:12,revision:1,animations:[],constraints:[]});
function fixture(){const pinia=createPinia(),w=useWorkspace(pinia),calls=[];w.project=model('Old');w.pauseSimulation();let release,reject;const gate=new Promise((resolve,fail)=>{release=resolve;reject=fail;});invoke=async(name,args)=>{calls.push({name,args});if(name==='open_project'||name==='repair_linked_mesh_copy')return gate;if(name==='close_project')return null;throw Error('Unexpected native call '+name);};return{w,calls,release,reject,close:()=>disposePinia(pinia)};}
function mount(w){const target=node('root'),app=renderer.createApp({render:()=>h(Status,{w})});app.use(i18n);app.mount(target);return{target,find:()=>flatten(target).find(n=>n.props['data-testid']==='project-opening'),close:()=>app.unmount()};}

test('opening status publishes before transport and remains through delayed reply/publication, clearing old notice only after success',async()=>{
 const e=fixture(),ui=mount(e.w);try{e.w.showNotice('Old resource error',true);const pending=e.w.request('open');assert.equal(e.w.openingProject,true);assert.equal(e.w.busy,true);assert.equal(e.calls.length,0,'Vue gets a flush before native dispatch');await nextTick();assert.ok(ui.find());await settle();assert.deepEqual(e.calls,[{name:'open_project',args:{discardChanges:false}}]);assert.equal(e.w.project.name,'Old');assert.equal(e.w.notice,'Old resource error');await e.w.request('open');assert.equal(e.calls.length,1,'duplicate Open uses the existing busy guard');e.release(model('New'));await pending;await nextTick();assert.equal(e.w.project.name,'New');assert.equal(e.w.openingProject,false);assert.equal(e.w.busy,false);assert.equal(ui.find(),undefined);assert.equal(e.w.notice,'');assert.equal(e.w.noticeError,false);}finally{ui.close();e.close();}
});

test('cancel and failed Open clear loading while retaining old authored document and reporting only the relevant notice',async()=>{
 for(const failure of [false,true]){const e=fixture(),ui=mount(e.w);try{const before=structuredClone(e.w.project);e.w.showNotice('Prior message',true);const pending=e.w.request('open');await settle();assert.ok(ui.find());if(failure)e.reject(Error('Own import failure'));else e.release(null);await pending;await nextTick();assert.deepEqual(e.w.project,before);assert.equal(e.w.openingProject,false);assert.equal(e.w.busy,false);assert.equal(ui.find(),undefined);assert.equal(e.w.notice,failure?'Own import failure':'Prior message');assert.equal(e.w.noticeError,true);}finally{ui.close();e.close();}}
});

test('dirty/discard routing starts loading only for the confirmed Open and forwards discard intent once',async()=>{
 const e=fixture();try{e.w.project={...e.w.project,dirty:true};await e.w.request('open');assert.equal(e.w.discardDialog,true);assert.equal(e.w.openingProject,false);assert.deepEqual(e.calls,[]);e.w.cancelDiscard();assert.equal(e.w.project.name,'Old');await e.w.request('open');const pending=e.w.discardAndContinue();assert.equal(e.w.openingProject,true);await settle();assert.deepEqual(e.calls,[{name:'open_project',args:{discardChanges:true}}]);e.release(null);await pending;assert.equal(e.w.project.dirty,true);assert.equal(e.w.openingProject,false);}finally{e.close();}
});

test('a non-Open operation never renders project-opening feedback and read-only replies still finish loading normally',async()=>{
 const e=fixture();try{await e.w.request('close');assert.equal(e.w.openingProject,false);assert.equal(e.w.project,null);e.calls.length=0;const pending=e.w.request('open');await settle();const inspected={...model('Own unsupported'),inspectionOnly:true,canSave:false,canCopy:true,bones:[],slots:[],boneCount:null};e.release(inspected);await pending;assert.deepEqual(e.w.project,inspected);assert.equal(e.w.openingProject,false);assert.equal(e.w.canEdit,false);}finally{e.close();}
});

test('actual App Open command reaches the same delayed workspace route used by File and native editor commands',async()=>{
 const e=fixture();
 try{
  const canceled=[];
  appCommand(e.w,{value:{
    cancelNumericDrag(){assert.equal(e.w.openingProject,false);canceled.push('drag');},
    cancelWheel(){assert.equal(e.w.openingProject,false);canceled.push('wheel');},
  }})('open');
  assert.deepEqual(canceled,['drag','wheel']);
  await settle();assert.equal(e.w.openingProject,true);assert.equal(e.calls.length,1);assert.equal(e.calls[0].name,'open_project');
  e.release(model('New'));await settle();assert.equal(e.w.project.name,'New');assert.equal(e.w.openingProject,false);
 }finally{e.close();}
});

test('actual App GIF export command leaves the Linked Mesh creator open',()=>{
 const e=fixture(),creator={value:true},gifDialog={value:false};
 try{
  appCommand(e.w,{value:undefined},creator,gifDialog)('export-gif');
  assert.equal(creator.value,true);
  assert.equal(gifDialog.value,false);
  assert.deepEqual(e.calls,[]);
 }finally{e.close();}
});

test('repair routes the checked revision through the usual project opening lifecycle',async()=>{
 for(const outcome of ['cancel','failure','open']){
  const e=fixture();
  const inspected={...model('Own chain'),revision:9,sceneEditing:false,bones:[],inspectionOnly:true,canSave:false,inspectionReason:{kind:'linkedMeshChain'}};
  try{
   e.w.project=inspected;
   await e.w.request('repair-linked-mesh-copy');
   assert.deepEqual(e.calls,[],'a diagnosis alone never starts a repair');
   const source={...inspected,canRepairLinkedMeshCopy:true};
   e.w.project=source;
   const cmd=appCommand(e.w,{value:undefined});
   cmd('repair-linked-mesh-copy');
   await settle();
   assert.equal(e.w.openingProject,true);assert.equal(e.w.busy,true);
   assert.deepEqual(e.calls,[{name:'repair_linked_mesh_copy',args:{expectedRevision:9}}]);
   await e.w.request('repair-linked-mesh-copy');assert.equal(e.calls.length,1);
   const repaired={...model('Own repaired'),documentId:3,logicalDocumentId:3,revision:10};
   if(outcome==='failure')e.reject(Error('Choose a new file in this folder.'));
   else e.release(outcome==='open'?repaired:null);
   await settle();
   assert.equal(e.w.openingProject,false);assert.equal(e.w.busy,false);
   assert.deepEqual(e.w.project,outcome==='open'?repaired:source);
   assert.equal(e.w.canEdit,outcome==='open');
   assert.equal(e.w.noticeError,outcome==='failure');
   if(outcome==='open')assert.equal(e.w.notice,'Repaired copy opened.');
  }finally{e.close();}
 }
});

test('actual App status has localized live text, decorative reduced-motion spinner and no false percentage or abort action',async()=>{
 const w=reactive({openingProject:false}),ui=mount(w);try{assert.equal(ui.find(),undefined);w.openingProject=true;await nextTick();const status=ui.find(),live=flatten(ui.target).find(n=>n.props['data-testid']==='project-opening-announcement');assert.equal(status.props['aria-hidden'],'true');assert.equal(live.props.role,'status');assert.equal(live.props['aria-live'],'polite');assert.equal(live.props['aria-atomic'],'true');const spinner=flatten(status).find(n=>String(n.props.class??'').includes('animate-spin'));assert.equal(spinner.props['aria-hidden'],'true');assert.match(spinner.props.class,/motion-reduce:animate-none/);assert.equal(flatten(status).some(n=>n.tagName==='BUTTON'),false);assert.equal(flatten(status).some(n=>n.props['aria-valuenow']!==undefined),false);assert.match(flatten(status).map(n=>n.text).join(' '),/Opening project…/);i18n.global.locale.value='ro';await nextTick();assert.match(flatten(ui.find()).map(n=>n.text).join(' '),/Se deschide proiectul…/);w.openingProject=false;await nextTick();assert.equal(ui.find(),undefined);}finally{i18n.global.locale.value='en';ui.close();}
});

test('actual inspection notice explains the blank canvas, emits existing Open/copy intents and respects busy/copy capability',async()=>{
 const props=reactive({name:'Own unsupported source',busy:false,canCopy:true}),intents=[],target=node('root'),app=renderer.createApp({render:()=>h(InspectionNotice,{...props,onOpen:()=>intents.push('open'),onCopy:()=>intents.push('copy')})});app.use(i18n);app.mount(target);await nextTick();const nodes=()=>flatten(target),text=n=>flatten(n).map(n=>n.text).join(' '),button=label=>nodes().find(n=>n.tagName==='BUTTON'&&text(n).includes(label));try{const status=nodes().find(n=>n.props['data-testid']==='project-inspection-notice');assert.equal(status.props.role,'status');assert.match(text(status),/cannot display or edit yet/);assert.match(text(status),/original file is preserved/);assert.match(text(status),/Own unsupported source/);button('Open project').props.onClick();button('Save a copy').props.onClick();assert.deepEqual(intents,['open','copy']);props.busy=true;await nextTick();assert.equal(button('Open project').props.disabled,true);assert.equal(button('Save a copy').props.disabled,true);props.busy=false;props.canCopy=false;await nextTick();assert.equal(button('Save a copy'),undefined);assert.doesNotMatch(text(target),/save an unchanged copy/);assert.equal(button('Open project').props.disabled,false);}finally{app.unmount();}
});

test('inspection notice localizes typed reasons and shows a decoded byte only for a known mismatch',async()=>{
 const props=reactive({name:'Own inspected project',busy:false,canCopy:true,reason:undefined});
 const target=node('root'),app=renderer.createApp({render:()=>h(InspectionNotice,{...props})});
 const diagnostic=()=>flatten(target).find(n=>n.props['data-testid']==='project-inspection-reason');
 app.use(i18n);app.mount(target);
 try{
  for(const [kind,message] of [
   ['unsupportedStructure',/file structures/],['linkedMeshChain',/another linked mesh/],
   ['roundtripMismatch',/byte for byte/],['clippingScopes',/clipping ranges/],
   ['attachmentProfile',/editing profile/],['imageResources',/image references/],
   ['unsafeImagePath',/unsafe or unsupported/],['ambiguousImagePath',/letter case/],
  ]){
   props.reason={kind};await nextTick();
   assert.match(diagnostic().text,message);assert.match(diagnostic().text,/canvas is unavailable/);
   assert.doesNotMatch(diagnostic().text,/decoded byte/);
  }
  props.reason={kind:'roundtripMismatch',offset:0};await nextTick();
  assert.match(diagnostic().text,/decoded byte 0/);
  i18n.global.locale.value='ro';await nextTick();
  assert.match(diagnostic().text,/Prima diferență apare în datele decodate, la octetul 0/);
  props.reason={kind:'futureCode',offset:87};await nextTick();
  assert.equal(diagnostic(),undefined);
  assert.match(flatten(target).map(n=>n.text).join(' '),/încă nu le poate afișa sau edita/);
 }finally{i18n.global.locale.value='en';app.unmount();}
});

test('inspection notice offers the distinct repair action only with a proven capability',async()=>{
 const props=reactive({name:'Own chain',busy:false,canCopy:true,reason:{kind:'linkedMeshChain'},canRepairLinkedMeshCopy:false});
 const actions=[],target=node('root'),app=renderer.createApp({render:()=>h(InspectionNotice,{...props,onRepair:()=>actions.push('repair'),onCopy:()=>actions.push('copy')})});
 const repair=()=>flatten(target).find(n=>n.props['data-testid']==='project-inspection-repair');
 app.use(i18n);app.mount(target);
 try{
  assert.equal(repair(),undefined);
  props.canRepairLinkedMeshCopy=true;await nextTick();
  assert.match(flatten(repair()).map(n=>n.text).join(' '),/Open a repaired copy/);
  assert.match(flatten(target).map(n=>n.text).join(' '),/new .fbones file in this folder/);
  repair().props.onClick();
  const copy=flatten(target).find(n=>n.tagName==='BUTTON'&&flatten(n).map(n=>n.text).join(' ').includes('Save a copy'));
  copy.props.onClick();assert.deepEqual(actions,['repair','copy']);
  props.busy=true;await nextTick();assert.equal(repair().props.disabled,true);
  i18n.global.locale.value='ro';await nextTick();
  assert.match(flatten(repair()).map(n=>n.text).join(' '),/Deschide o copie reparată/);
 }finally{i18n.global.locale.value='en';app.unmount();}
});
