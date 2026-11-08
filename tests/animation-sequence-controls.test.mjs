// Actual compiled Vue controls and production workspace. Custom host/collected
// intents do not prove browser layout, OS gestures, Rust encoding or original parity.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {build} from 'esbuild';
import {parse,compileScript} from 'vue/compiler-sfc';
import {createRenderer,h,nextTick,ref,shallowRef,effectScope} from 'vue';
import {createPinia} from 'pinia';
import {i18n} from '../src/i18n.ts';
const windowListeners=new Map();
globalThis.document={title:'',activeElement:null,addEventListener(){},removeEventListener(){}};
globalThis.window={innerWidth:1440,innerHeight:900,addEventListener(name,callback){if(!windowListeners.has(name))windowListeners.set(name,new Set());windowListeners.get(name).add(callback);},removeEventListener(name,callback){windowListeners.get(name)?.delete(callback);}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.Document=class{};globalThis.ShadowRoot=class{};
globalThis.__TAURI__={core:{invoke:async()=>{throw Error('No native API in compiled component check');}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../src/stores/workspace.ts');
const {draftSummary}=await import('../src/domain/project.ts');
const {useAnimationWorkspace}=await import('../src/composables/useAnimationWorkspace.ts');
mkdirSync('.local/animation-sequence-control-tests',{recursive:true});
async function compile(name,path){const outfile=`.local/animation-sequence-control-tests/${name}-${process.pid}.mjs`;await build({entryPoints:[path],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'vue-sfc',setup(builder){builder.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});builder.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]});const result=(await import(new URL('../'+outfile,import.meta.url))).default;unlinkSync(outfile);return result;}
const Inspector=await compile('Inspector','src/components/organisms/SequenceInspector.vue'),Timeline=await compile('Timeline','src/components/organisms/AnimationTimeline.vue');
function node(type,text=''){return{get options(){return this.children.flatMap(child=>child.tagName==='OPTION'?[child]:child.options??[]);},type,tagName:type.toUpperCase(),text,children:[],props:{},parent:null,listeners:new Map(),clientHeight:260,clientWidth:900,scrollLeft:0,scrollTop:0,
 getRootNode(){return document;},addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(callback);},removeEventListener(name,callback){this.listeners.get(name)?.delete(callback);},
 getBoundingClientRect(){return{x:0,y:0,left:0,top:0,width:900,height:260,right:900,bottom:260};},focus(){document.activeElement=this;},closest(selector){return selector==='.animation-timeline'?this:null;},querySelector(selector){return flatten(this).find(n=>String(n.props.class??'').includes(selector.slice(1)))??null;},querySelectorAll(selector){return selector==='[data-timeline-key-id]'?flatten(this).filter(n=>n.props['data-timeline-key-id']!==undefined):[];},
 get dataset(){return{timelineKeyId:this.props['data-timeline-key-id']};},matches(selector){return selector.split(',').includes(type);}};}
const renderer=createRenderer({createElement:type=>node(type),createText:text=>node('#text',text),createComment:text=>node('#comment',text),setText:(n,text)=>n.text=text,setElementText:(n,text)=>{n.text=text;n.children=[];},patchProp:(n,key,_old,value)=>{n.props[key]=value;if(key==='value'){n._value=value;n.value=String(value);}else if(key==='multiple'||key==='type')n[key]=value;},parentNode:n=>n.parent,nextSibling:n=>{const at=n.parent?.children.indexOf(n)??-1;return n.parent?.children[at+1]??null;},insert(n,parent,anchor=null){if(n.parent){const at=n.parent.children.indexOf(n);if(at>=0)n.parent.children.splice(at,1);}n.parent=parent;const at=anchor?parent.children.indexOf(anchor):-1;if(at<0)parent.children.push(n);else parent.children.splice(at,0,n);},remove(n){const at=n.parent?.children.indexOf(n)??-1;if(at>=0)n.parent.children.splice(at,1);n.parent=null;}});
const flatten=n=>[n,...n.children.flatMap(flatten)];
const event=(extra={})=>({button:0,clientX:100,clientY:20,ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){},stopPropagation(){},...extra});
function dispatch(name,value=event()){for(const callback of [...windowListeners.get(name)??[]])callback(value);}
const clone=value=>JSON.parse(JSON.stringify(value));
function model(){const region={name:'Own',image:'own/frame',imagePath:'own/frame',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24},settings={start:7,count:3,digits:2,setupIndex:1},attachment={id:9,slot:7,name:'Own frames',type:'region',region,mesh:null,clipping:null,imageAvailable:true,sequence:settings,sequenceAvailableFrames:[0,1,2]};return{...draftSummary('Own Sequence'),documentId:42,revision:1,sceneEditing:true,slots:[{id:7,name:'Own slot',bone:0,visible:true,blend:'normal',region,mesh:null,imageAvailable:true,activeAttachmentId:9,attachments:[attachment]}],animations:[{id:1,name:'Own clip',duration:30,tracks:[],sequenceTracks:[{slot:7,attachment:9,keys:[{id:91,frame:0,mode:0,index:0,delay:.125},{id:92,frame:15,mode:2,index:1,delay:.25}]}]}],animationChannels:['translate','rotate','scale','shear'],animationFps:30};}
function mount(component,props,pinia=createPinia()){const target=node('root'),app=renderer.createApp({render:()=>h(component,props())});app.use(pinia);app.use(i18n);app.mount(target);return{target,app,find:id=>flatten(target).find(n=>n.props['data-testid']===id)};}
async function input(e,id,value,key='Enter'){let field=e.find(id);assert.ok(field,id);field.props['onUpdate:modelValue'](value);await nextTick();field=e.find(id);for(const handler of [].concat(field.props.onKeydown??[]))handler(event({key,target:field}));await nextTick();}
const nativeSettingsOrder=sequence=>sequence?{count:sequence.count,digits:sequence.digits,setupIndex:sequence.setupIndex,start:sequence.start}:null;
async function inspector(nativeOrder=false){const pinia=createPinia(),w=useWorkspace(pinia),edits=[];w.project=model();if(nativeOrder)w.project.slots[0].attachments[0].sequence=nativeSettingsOrder(w.project.slots[0].attachments[0].sequence);w.selectAttachment(9);w.editRig=async(edit,revision)=>{edits.push({edit:clone(edit),revision});if(edit.type==='setAttachmentSequence'){const next=clone(w.project);next.slots[0].attachments[0].sequence=nativeOrder?nativeSettingsOrder(edit.sequence):edit.sequence;next.revision++;w.project=next;}return true;};const e=mount(Inspector,()=>({attachment:w.project.slots[0].attachments[0]}),pinia);await nextTick();return{...e,w,edits};}

test('compiled Setup Sequence treats native-ordered settings as a semantic no-op before and after Enter',async()=>{
 const e=await inspector(true);try{
  const before=clone(e.w.project);let field=e.find('sequence-setupIndex');
  await field.props.onChange(event({target:field}));await nextTick();
  assert.deepEqual(e.edits,[],'unchanged native field order cannot start an authoring transaction');assert.deepEqual(e.w.project,before);
  await input(e,'sequence-setupIndex','2');assert.equal(e.edits.length,1);assert.equal(e.w.project.revision,before.revision+1);
  assert.deepEqual(Object.keys(e.w.project.slots[0].attachments[0].sequence),['count','digits','setupIndex','start']);
  const changed=clone(e.w.project);field=e.find('sequence-setupIndex');
  await field.props.onChange(event({target:field}));await nextTick();
  assert.equal(e.edits.length,1,'a delayed blur/change after Enter cannot reissue equal settings');assert.deepEqual(e.w.project,changed);assert.equal(e.w.sequenceFieldError,'');
 }finally{e.app.unmount();}
});

test('compiled Sequence Setup fields send one current settings transaction and invalid input Escape readonly guards work',async()=>{
 const e=await inspector();try{
  await input(e,'sequence-count','4');assert.deepEqual(e.edits,[{edit:{type:'setAttachmentSequence',id:9,sequence:{start:7,count:4,digits:2,setupIndex:1}},revision:1}]);assert.equal(e.w.project.slots[0].attachments[0].region.imagePath,'own/frame');
  await input(e,'sequence-setupIndex','4');assert.match(e.w.sequenceFieldError,/valid integer/);assert.equal(e.edits.length,1);assert.equal(e.find('sequence-setupIndex').props['aria-invalid'],true);await input(e,'sequence-setupIndex','3','Escape');assert.equal(e.find('sequence-setupIndex').value,'1');assert.equal(e.w.sequenceFieldError,'');
  e.w.project={...e.w.project,inspectionOnly:true};await nextTick();assert.equal(e.find('sequence-count').props.disabled,true);await input(e,'sequence-count','8');assert.equal(e.edits.length,1);
 }finally{e.app.unmount();assert.equal(e.w.sequenceFieldError,'');}
});

test('compiled Animate Sequence fields stage real working frames, validate and cancel without keys or Setup changes',async()=>{
 const e=await inspector();try{
  const source=clone(e.w.project.slots);await e.w.setEditorMode('animate');e.w.animationAutoKey=false;await nextTick();
  await input(e,'sequence-key-index','2');assert.equal(e.w.sequenceSlots[0].region.image,'own/frame09');assert.equal(e.edits.length,0);assert.deepEqual(e.w.project.slots,source);
  await input(e,'sequence-key-delay','0');assert.match(e.w.sequenceFieldError,/positive/);assert.equal(e.find('sequence-manual-key').props.disabled,true);await input(e,'sequence-key-delay','.25','Escape');assert.equal(e.w.sequenceFieldError,'');assert.equal(e.find('sequence-key-delay').value,'0.125');
  const keys=[];e.w.insertSequenceAnimationKey=async id=>{keys.push(id);return true;};e.find('sequence-manual-key').props.onClick();assert.deepEqual(keys,[9]);
  e.w.busy=true;await nextTick();assert.equal(e.find('sequence-key-index').props.disabled,true);await input(e,'sequence-key-index','1');assert.equal(e.w.sequenceSlots[0].region.image,'own/frame09');
 }finally{e.app.unmount();}
});

test('compiled Sequence timeline keeps discrete keys in Graph and routes stable payload, copy, move and delete intents',async()=>{
 const source=model(),events=[],disabled=ref(false),e=mount(Timeline,()=>({animations:source.animations,activeAnimationId:1,bones:source.bones,selectedBoneIds:[],tracks:[],currentFrame:0,durationFrames:30,fps:30,playing:true,loop:true,autoKey:false,disabled:disabled.value,slots:[{id:7,name:'Own slot',boneId:0,attachments:source.slots[0].attachments}],selectedSlotIds:[7],sequenceTracks:[{id:'sequence:9',slotId:7,attachmentId:9,keys:source.animations[0].sequenceTracks[0].keys}],onPause:()=>events.push(['pause']),onInsertSequenceKey:id=>events.push(['insert',id]),onUpdateSequenceKey:value=>events.push(['update',value]),onCopyKeys:ids=>events.push(['copy',ids]),onMoveKeys:value=>events.push(['move',value]),onDeleteKeys:ids=>events.push(['delete',ids])}));await nextTick();try{
  e.find('timeline-key-sequence-9').props.onClick(event());assert.deepEqual(events.shift(),['insert',9]);e.find('timeline-key-92').props.onPointerdown(event());dispatch('pointerup');await nextTick();assert.deepEqual(events.shift(),['pause']);
  await input(e,'timeline-sequence-index','2');assert.deepEqual(events.shift(),['update',{id:92,mode:2,index:2,delay:.25}]);assert.equal(e.find('timeline-key-value-0'),undefined);
  e.find('timeline-tab-graph').props.onClick();await nextTick();assert.ok(e.find('timeline-key-92'));assert.equal(e.find('timeline-graph-key-92-0'),undefined);assert.equal(e.find('timeline-bezier-92-0-0'),undefined);
  e.find('animation-timeline').props.onKeydown(event({key:'c',ctrlKey:true,target:node('section')}));assert.deepEqual(events.shift(),['copy',[92]]);
  e.find('timeline-key-92').props.onPointerdown(event());dispatch('pointermove',event({clientX:147}));dispatch('pointerup');await nextTick();assert.deepEqual(events.shift(),['pause']);assert.deepEqual(events.shift(),['move',{ids:[92],deltaFrames:5}]);
  e.find('animation-timeline').props.onKeydown(event({key:'Delete',target:node('section')}));assert.deepEqual(events.shift(),['delete',[92]]);disabled.value=true;await nextTick();assert.equal(e.find('timeline-key-sequence-9').props.disabled,true);assert.equal(e.find('timeline-sequence-index').props.disabled,true);
 }finally{e.app.unmount();}
});

test('compiled Sequence timeline with the production workspace ignores delayed change and equal f32 delays after native publication',async()=>{
 const project=shallowRef(model()),mode=ref('animate'),scope=effectScope(),edits=[],notices=[];
 const edit=async command=>{edits.push(clone(command));const next=clone(project.value),input=command.keys[0],key=next.animations[0].sequenceTracks[0].keys.find(k=>k.id===input.keyId);Object.assign(key,{mode:input.mode,index:input.index,delay:Math.fround(input.delay)});next.revision++;project.value=next;return true;};
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([]),editorMode:mode,localBones:shallowRef([]),attachment:ref(9),edit,notice:message=>notices.push(message),changed(){}}));w.resetAnimationState();
 const e=mount(Timeline,()=>({animations:w.animations.value,activeAnimationId:w.animationId.value,bones:project.value.bones,selectedBoneIds:[],tracks:[],currentFrame:0,durationFrames:30,fps:30,playing:false,loop:true,autoKey:false,slots:project.value.slots.map(s=>({id:s.id,name:s.name,boneId:s.bone,attachments:s.attachments})),selectedSlotIds:[7],sequenceTracks:w.animationSequenceTracks.value,onPause:w.pauseAnimation,onUpdateSequenceKey:w.updateSequenceAnimationKey}));await nextTick();try{
  e.find('timeline-key-92').props.onPointerdown(event());dispatch('pointerup');await nextTick();
  let field=e.find('timeline-sequence-index');await field.props.onChange(event({target:field}));await nextTick();assert.equal(edits.length,0,'an unchanged selected key cannot start a busy native transaction');
  await input(e,'timeline-sequence-index','2');assert.equal(edits.length,1);assert.equal(project.value.animations[0].sequenceTracks[0].keys[1].index,2);
  field=e.find('timeline-sequence-index');await field.props.onChange(event({target:field}));await nextTick();assert.equal(edits.length,1,'delayed change after Enter/publication cannot consume the following Undo click');
  await input(e,'timeline-sequence-delay','.1');assert.equal(edits.length,2);assert.equal(project.value.animations[0].sequenceTracks[0].keys[1].delay,Math.fround(.1));
  await input(e,'timeline-sequence-delay','.100000001');assert.equal(edits.length,2,'different decimal text with the same authored f32 delay is unchanged');
  await input(e,'timeline-sequence-delay','.10000001');assert.equal(edits.length,3,'a different representable f32 delay remains editable');assert.equal(edits[2].keys[0].keyId,92);assert.equal(edits[2].keys[0].frame,15);assert.deepEqual(notices,[]);
 }finally{e.app.unmount();scope.stop();}
});

test('compiled timeline distinguishes stored duration from effective preview End, gives budget guidance and keeps explicit End authoritative',async()=>{
 const values=ref({durationFrames:60}),e=mount(Timeline,()=>({animations:[{id:1,name:'Own clip',duration:60}],activeAnimationId:1,bones:model().bones,selectedBoneIds:[],tracks:[],currentFrame:0,fps:30,playing:false,loop:true,autoKey:false,...values.value})),contents=n=>flatten(n).map(child=>child.text).join(' ');await nextTick();try{
  assert.equal(e.find('timeline-preview-range-hint'),undefined,'old callers retain their unchanged footer');
  values.value={durationFrames:9,storedDurationFrames:0,previewEndFrames:9};await nextTick();let hint=e.find('timeline-preview-range-hint');assert.match(contents(hint),/Stored duration 0/);assert.match(contents(hint),/Preview End 9/);assert.match(hint.props.title,/does not change stored duration/);
  values.value={durationFrames:0,storedDurationFrames:0,previewEndFrames:2e15,previewBudgetExceeded:true};await nextTick();hint=e.find('timeline-preview-range-hint');assert.equal(hint.props.role,'status');assert.ok(flatten(e.target).filter(n=>n.props.class==='at-ruler-label').length<100,'blocked automatic range does not create an enormous ruler');assert.match(contents(hint),/Set Loop End to preview/);assert.doesNotMatch(contents(hint),/2000000000000000|2e\+15|Preview End/);
  values.value={...values.value,durationFrames:4,loopEnd:4};await nextTick();hint=e.find('timeline-preview-range-hint');assert.match(contents(hint),/Preview End 4/);assert.doesNotMatch(contents(hint),/Set Loop End/);assert.equal(hint.props.role,undefined);
  i18n.global.locale.value='ro';await nextTick();assert.match(contents(e.find('timeline-preview-range-hint')),/Durată stocată 0/);assert.match(contents(e.find('timeline-preview-range-hint')),/Sfârșit previzualizare 4/);i18n.global.locale.value='en';
  values.value={durationFrames:9,storedDurationFrames:9,previewEndFrames:9};await nextTick();assert.equal(e.find('timeline-preview-range-hint'),undefined);values.value={durationFrames:9,storedDurationFrames:0,previewEndFrames:9,activeAnimationId:null};await nextTick();assert.equal(e.find('timeline-preview-range-hint'),undefined);
 }finally{i18n.global.locale.value='en';e.app.unmount();}
});

test('compiled loop clear validates the automatic fallback with the real workspace and keeps rejected fields authoritative',async()=>{
 const pinia=createPinia(),w=useWorkspace(pinia),p=model();p.animationFps=24;p.animations=[{id:1,name:'Own Loop',duration:0,tracks:[],sequenceTracks:[{slot:7,attachment:9,keys:[{id:91,frame:0,mode:2,index:0,delay:.125}]}]}];w.project=p;await w.setEditorMode('animate');w.setAnimationLoopRange({start:10,end:12});const ranges=[],before=clone(w.project),e=mount(Timeline,()=>({animations:w.animations,activeAnimationId:w.animationId,bones:w.project.bones,selectedBoneIds:[],tracks:[],currentFrame:w.animationFrame,durationFrames:w.animationDuration,storedDurationFrames:w.animationStoredDuration,previewEndFrames:w.animationPreviewEnd,automaticPreviewEndFrames:w.animationAutomaticPreviewEnd,previewBudgetExceeded:w.animationPreviewExceedsBudget,fps:w.animationFps,playing:w.animationPlaying,loop:true,autoKey:false,loopStart:w.animationLoopStart,loopEnd:w.animationLoopEnd,onLoopRange:range=>{ranges.push(range);w.setAnimationLoopRange(range);}}),pinia);await nextTick();try{
  assert.equal(w.animationAutomaticPreviewEnd,9);assert.equal(String(e.find('timeline-loop-end').value),'12');await input(e,'timeline-loop-end','');assert.equal(w.animationLoopEnd,12);assert.equal(String(e.find('timeline-loop-end').value),'12','invalid clear restores the accepted explicit End');assert.deepEqual(ranges,[],'component rejects the same invalid fallback range as the store');
  await input(e,'timeline-loop-start','8');assert.equal(w.animationLoopStart,8);await input(e,'timeline-loop-end','');assert.equal(w.animationLoopEnd,null);assert.equal(e.find('timeline-loop-end').value,'');assert.equal(w.animationPreviewEnd,9);await input(e,'timeline-loop-start','10');assert.equal(w.animationLoopStart,8);assert.equal(String(e.find('timeline-loop-start').value),'8');
  await input(e,'timeline-loop-start','');assert.equal(w.animationLoopStart,null);assert.equal(w.animationLoopEnd,null);assert.equal(e.find('timeline-loop-start').value,'');assert.deepEqual(w.project,before);
 }finally{e.app.unmount();w.$dispose();}
});
