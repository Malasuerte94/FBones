// Actual compiled Vue + production animation composable behavior. The custom
// host and synthetic events do not prove browser layout, OS input or Rust persistence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {build} from 'esbuild';
import {parse,compileScript} from 'vue/compiler-sfc';
import {createRenderer,h,nextTick,effectScope,ref,shallowRef} from 'vue';
import {useAnimationWorkspace} from '../src/composables/useAnimationWorkspace.ts';
import {i18n} from '../src/i18n.ts';

const windowListeners=new Map();
globalThis.document={activeElement:null,addEventListener(){},removeEventListener(){}};
globalThis.window={addEventListener(name,callback){if(!windowListeners.has(name))windowListeners.set(name,new Set());windowListeners.get(name).add(callback);},removeEventListener(name,callback){windowListeners.get(name)?.delete(callback);}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.Document=class{};globalThis.ShadowRoot=class{};
mkdirSync('.local/animation-bone-handle-tests',{recursive:true});
const outfile=`.local/animation-bone-handle-tests/Timeline-${process.pid}.mjs`;
await build({entryPoints:['src/components/organisms/AnimationTimeline.vue'],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'vue-sfc',setup(builder){builder.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});builder.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]});
const Timeline=(await import(new URL('../'+outfile,import.meta.url))).default;unlinkSync(outfile);
function node(type,text=''){return{type,tagName:type.toUpperCase(),text,children:[],props:{},parent:null,listeners:new Map(),clientHeight:260,clientWidth:900,scrollLeft:0,scrollTop:0,
 getRootNode(){return document;},addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(callback);},removeEventListener(name,callback){this.listeners.get(name)?.delete(callback);},
 getBoundingClientRect(){return{x:0,y:0,left:0,top:0,width:900,height:260,right:900,bottom:260};},focus(){document.activeElement=this;},closest(selector){return selector==='.animation-timeline'?this:null;},querySelector(selector){return flatten(this).find(n=>String(n.props.class??'').includes(selector.slice(1)))??null;},querySelectorAll(selector){return selector==='[data-timeline-key-id]'?flatten(this).filter(n=>n.props['data-timeline-key-id']!==undefined):[];},
 get dataset(){return{timelineKeyId:this.props['data-timeline-key-id']};},matches(selector){return selector.split(',').includes(type);}};}
const renderer=createRenderer({createElement:type=>node(type),createText:text=>node('#text',text),createComment:text=>node('#comment',text),setText:(n,text)=>n.text=text,setElementText:(n,text)=>{n.text=text;n.children=[];},patchProp:(n,key,_old,value)=>{n.props[key]=value;if(key==='value'){n._value=value;n.value=String(value);}else if(key==='multiple'||key==='type')n[key]=value;},parentNode:n=>n.parent,nextSibling:n=>{const at=n.parent?.children.indexOf(n)??-1;return n.parent?.children[at+1]??null;},insert(n,parent,anchor=null){if(n.parent){const at=n.parent.children.indexOf(n);if(at>=0)n.parent.children.splice(at,1);}n.parent=parent;const at=anchor?parent.children.indexOf(anchor):-1;if(at<0)parent.children.push(n);else parent.children.splice(at,0,n);},remove(n){const at=n.parent?.children.indexOf(n)??-1;if(at>=0)n.parent.children.splice(at,1);n.parent=null;}});
const flatten=n=>[n,...n.children.flatMap(flatten)];
const event=(extra={})=>({button:0,clientX:100,clientY:20,ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){},stopPropagation(){},...extra});
function dispatch(name,value=event()){for(const callback of [...windowListeners.get(name)??[]])callback(value);}
async function fixture(slotCurve=false){
 const bone={id:0,parent:null,name:'Own bone',x:0,y:0,length:20,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0},keys=slotCurve?[{id:11,frame:0,values:[0,0,0,1],curve:'bezier',controls:[[10,.1,20,.2],[10,.1,20,.2],[10,.1,20,.2],[10,1,20,1]]},{id:12,frame:30,values:[1,1,1,1],curve:'linear'}]:[{id:11,frame:348,values:[0,0],curve:'bezier',controls:[[353.4671936035156,10,351.08648681640625,20],[0,0,0,0]]},{id:12,frame:353,values:[30,0],curve:'linear'}],slot={id:7,bone:0,name:'Own slot',visible:false,blend:'normal',color:0xffffffff,region:null,imageAvailable:false,activeAttachmentId:null,attachments:[]};
 const project=shallowRef({documentId:1,revision:1,bones:[bone],slots:slotCurve?[slot]:[],constraints:[],animations:[{id:1,name:'Own Graph',duration:slotCurve?30:353,tracks:slotCurve?[]:[{bone:0,channel:'rotate',keys}],slotTracks:slotCurve?[{slot:7,channel:'rgba',keys}]:[]}],animationChannels:['translate','rotate','scale','shear'],animationFps:30,sceneEditing:true}),before=JSON.stringify(project.value),edits=[],notices=[],scope=effectScope();
 const w=scope.run(()=>useAnimationWorkspace({project,busy:ref(false),selectedIds:ref([0]),editorMode:ref('animate'),localBones:shallowRef([]),attachment:ref(null),edit:async edit=>{edits.push(JSON.parse(JSON.stringify(edit)));return true;},notice:message=>notices.push(message),changed(){}}));w.resetAnimationState();
 const target=node('root'),app=renderer.createApp({render:()=>h(Timeline,{animations:w.animations.value,activeAnimationId:w.animationId.value,bones:project.value.bones,selectedBoneIds:slotCurve?[]:[0],tracks:w.animationTracks.value,slots:slotCurve?[{id:7,name:slot.name,boneId:0,attachments:[]}]:[],slotTracks:w.animationSlotTracks.value,selectedSlotIds:slotCurve?[7]:[],currentFrame:w.animationFrame.value,durationFrames:w.animationDuration.value,fps:30,playing:w.animationPlaying.value,loop:true,autoKey:true,supportedChannels:project.value.animationChannels,supportedInterpolations:['linear','stepped','bezier'],onPause:w.pauseAnimation,onUpdateBezier:w.updateAnimationBezier})});app.use(i18n);app.mount(target);await nextTick();const find=id=>flatten(target).find(n=>n.props['data-testid']===id);find('timeline-key-11').props.onPointerdown(event());dispatch('pointerup');find('timeline-tab-graph').props.onClick();await nextTick();
 return{w,project,before,edits,notices,find,close(){app.unmount();scope.stop();}};
}

test('compiled bone Graph value-only drag retains a loaded monotone overshooting time and Escape leaves every stored handle untouched',async()=>{
 const e=await fixture();try{const handle=e.find('timeline-bezier-11-0-0');assert.ok(handle);e.w.seekAnimation(350);e.w.playAnimation();await nextTick();e.find('timeline-bezier-11-0-0').props.onPointerdown(event());assert.equal(e.w.animationPlaying.value,false);dispatch('pointermove',event({clientY:10}));dispatch('pointerup');await nextTick();assert.equal(e.edits.length,1);const key=e.edits[0];assert.equal(key.type,'setAnimationKey');assert.equal(key.keyId,11);assert.equal(Math.fround(key.controls[0][0]),Math.fround(353.4671936035156));assert.ok(key.controls[0][1]>10);assert.deepEqual(key.controls[0].slice(2),[351.08648681640625,20]);assert.deepEqual(key.controls[1],[0,0,0,0]);e.find('timeline-bezier-11-0-0').props.onPointerdown(event());dispatch('pointermove',event({clientY:5}));e.find('animation-timeline').props.onKeydown(event({key:'Escape',target:node('section')}));dispatch('pointerup');assert.equal(e.edits.length,1);assert.equal(JSON.stringify(e.project.value),e.before);}finally{e.close();}
});

test('compiled bone Graph nonmonotone release is rejected by the real composable without IPC or source changes',async()=>{
 const e=await fixture();try{e.find('timeline-bezier-11-0-0').props.onPointerdown(event());dispatch('pointermove',event({clientX:10000}));dispatch('pointerup');await nextTick();assert.deepEqual(e.edits,[]);assert.ok(e.notices.some(message=>/monoton/i.test(message)));assert.equal(JSON.stringify(e.project.value),e.before);}finally{e.close();}
});

test('ordinary slot color Graph handles retain their existing segment bound despite the broader bone-only domain',async()=>{
 const e=await fixture(true);try{e.find('timeline-bezier-11-0-0').props.onPointerdown(event());dispatch('pointermove',event({clientX:1500,clientY:10}));dispatch('pointerup');await nextTick();assert.equal(e.edits.length,1);const command=e.edits[0];assert.equal(command.type,'setAnimationSlotKeys');assert.equal(command.keys[0].controls[0][0],30);assert.deepEqual(command.keys[0].controls[0].slice(2),[20,.2]);assert.equal(JSON.stringify(e.project.value),e.before);}finally{e.close();}
});
