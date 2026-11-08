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
mkdirSync('.local/animation-timeline-control-tests',{recursive:true});
const outfile=`.local/animation-timeline-control-tests/Timeline-${process.pid}.mjs`;
await build({entryPoints:['src/components/organisms/AnimationTimeline.vue'],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'vue-sfc',setup(builder){builder.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});builder.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]});
const Timeline=(await import(new URL('../'+outfile,import.meta.url))).default;unlinkSync(outfile);
function node(type,text=''){return{type,tagName:type.toUpperCase(),text,children:[],props:{},parent:null,listeners:new Map(),clientHeight:260,clientWidth:900,scrollLeft:0,scrollTop:0,
 getRootNode(){return document;},addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(callback);},removeEventListener(name,callback){this.listeners.get(name)?.delete(callback);},
 getBoundingClientRect(){return{x:0,y:0,left:0,top:0,width:900,height:260,right:900,bottom:260};},focus(){document.activeElement=this;},closest(selector){return selector==='.animation-timeline'?this:null;},querySelector(selector){return flatten(this).find(n=>String(n.props.class??'').includes(selector.slice(1)))??null;},querySelectorAll(selector){return selector==='[data-timeline-key-id]'?flatten(this).filter(n=>n.props['data-timeline-key-id']!==undefined):[];},
 get dataset(){return{timelineKeyId:this.props['data-timeline-key-id']};},matches(selector){return selector.split(',').includes(type);}};}
const renderer=createRenderer({createElement:type=>node(type),createText:text=>node('#text',text),createComment:text=>node('#comment',text),setText:(n,text)=>n.text=text,setElementText:(n,text)=>{n.text=text;n.children=[];},patchProp:(n,key,_old,value)=>{n.propWrites=(n.propWrites??0)+1;n.props[key]=value;if(key==='value'){n._value=value;n.value=String(value);}else if(key==='multiple'||key==='type')n[key]=value;},parentNode:n=>n.parent,nextSibling:n=>{const at=n.parent?.children.indexOf(n)??-1;return n.parent?.children[at+1]??null;},insert(n,parent,anchor=null){if(n.parent){const at=n.parent.children.indexOf(n);if(at>=0)n.parent.children.splice(at,1);}n.parent=parent;const at=anchor?parent.children.indexOf(anchor):-1;if(at<0)parent.children.push(n);else parent.children.splice(at,0,n);},remove(n){const at=n.parent?.children.indexOf(n)??-1;if(at>=0)n.parent.children.splice(at,1);n.parent=null;}});
const flatten=n=>[n,...n.children.flatMap(flatten)];
const event=(extra={})=>({button:0,clientX:100,clientY:20,ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){},stopPropagation(){},...extra});
function dispatch(name,value=event()){for(const callback of [...windowListeners.get(name)??[]])callback(value);}
async function fixture(){
 const bone={id:0,parent:null,name:'root',x:0,y:0,length:20,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0};
 const keys=[{id:11,frame:0,values:[0,0],curve:'bezier',controls:[[10,10,20,20],[10,0,20,0]]},{id:12,frame:30,values:[30,0],curve:'linear'},{id:13,frame:60,values:[60,0],curve:'linear'}];
 const clip={id:1,name:'Own controls',duration:60,tracks:[{bone:0,channel:'translate',keys}]};
 const project=shallowRef({documentId:1,revision:1,bones:[bone],slots:[],constraints:[],animations:[clip,{id:2,name:'Empty',duration:0,tracks:[]}],animationFps:30,animationChannels:['translate','rotate','scale','shear'],sceneEditing:true}),before=structuredClone(project.value),edits=[],pauseCalls=[],busy=ref(false),scope=effectScope();
 const w=scope.run(()=>useAnimationWorkspace({project,busy,selectedIds:ref([0]),editorMode:ref('animate'),localBones:shallowRef([]),attachment:ref(null),edit:async edit=>{edits.push(JSON.parse(JSON.stringify(edit)));return true;},notice:message=>{throw Error(message);},changed(){}}));w.resetAnimationState();
 let app,target;const selectedBoneIds=[0],supportedInterpolations=['linear','stepped','bezier'];
 function mount(){target=node('root');app=renderer.createApp({render:()=>h(Timeline,{animations:w.animations.value,activeAnimationId:w.animationId.value,bones:project.value.bones,selectedBoneIds,tracks:w.animationTracks.value,currentFrame:w.animationFrame.value,durationFrames:w.animationDuration.value,fps:w.animationFps.value,playing:w.animationPlaying.value,loop:w.animationLoop.value,autoKey:true,disabled:busy.value,supportedChannels:project.value.animationChannels,supportedInterpolations,loopStart:w.animationLoopStart.value,loopEnd:w.animationLoopEnd.value,onLoopRange:w.setAnimationLoopRange,onPause:()=>{w.pauseAnimation();pauseCalls.push({frame:w.animationFrame.value,playing:w.animationPlaying.value});},onMoveKeys:w.moveAnimationKeys,onUpdateBezier:w.updateAnimationBezier,onPlay:w.playAnimation,onSeek:w.seekAnimation})});app.use(i18n);app.mount(target);}
 mount();await nextTick();
 const env={w,busy,project,before,edits,pauseCalls,get target(){return target;},find:id=>flatten(target).find(n=>n.props['data-testid']===id),async remount(){app.unmount();mount();await nextTick();},close(){app.unmount();scope.stop();assert.equal([...windowListeners.values()].reduce((sum,set)=>sum+set.size,0),0,'all gesture listeners released');}};
 return env;
}
async function input(env,id,value,key='Enter'){
 let field=env.find(id);assert.ok(field,id);field.props['onUpdate:modelValue'](value);await nextTick();field=env.find(id);for(const handler of [].concat(field.props.onKeydown))handler(event({key,target:field}));await nextTick();
}

test('compiled loop controls follow accepted composable bounds through Enter invalid input Escape remount and clip change without authoring',async()=>{
 const e=await fixture();try{
  await input(e,'timeline-loop-start','10');await input(e,'timeline-loop-end','20');assert.equal(e.w.animationLoopStart.value,10);assert.equal(e.w.animationLoopEnd.value,20);
  await input(e,'timeline-loop-end','5');assert.equal(String(e.find('timeline-loop-end').value),'20');assert.equal(e.w.animationLoopEnd.value,20);
  await input(e,'timeline-loop-start','20');assert.equal(String(e.find('timeline-loop-start').value),'10');await input(e,'timeline-loop-start','12.5','Escape');assert.equal(String(e.find('timeline-loop-start').value),'10');
  await input(e,'timeline-loop-end','');assert.equal(e.w.animationLoopEnd.value,null);await input(e,'timeline-loop-start','61');assert.equal(String(e.find('timeline-loop-start').value),'10');await input(e,'timeline-loop-end','1000001');assert.equal(e.find('timeline-loop-end').value,'');
  await input(e,'timeline-loop-end','20');await e.remount();assert.equal(String(e.find('timeline-loop-start').value),'10');assert.equal(String(e.find('timeline-loop-end').value),'20');
  e.w.seekAnimation(0);e.find('timeline-play').props.onClick();assert.equal(e.w.animationFrame.value,10);assert.equal(e.w.animationPlaying.value,true);
  e.find('timeline-loop-start').props.onFocus();assert.equal(e.w.animationPlaying.value,false);
  e.w.selectAnimation(2);await nextTick();assert.equal(e.find('timeline-loop-start').value,'');assert.equal(e.find('timeline-loop-end').value,'');assert.deepEqual(e.edits,[]);assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});

test('compiled key pointer handler pauses the real clock before drag and commits one intent while Escape cancels the next',async()=>{
 const e=await fixture();try{
  e.w.seekAnimation(15);e.w.playAnimation();await nextTick();const key=e.find('timeline-key-12');assert.ok(key);key.props.onPointerdown(event());assert.deepEqual(e.pauseCalls,[{frame:15,playing:false}]);e.w.advanceAnimation(.1);assert.equal(e.w.animationFrame.value,15);
  dispatch('pointermove',event({clientX:147}));await nextTick();assert.deepEqual(e.edits,[]);dispatch('pointerup');await nextTick();assert.deepEqual(e.edits,[{type:'moveAnimationKeys',animation:1,keys:[12],deltaFrames:5}]);
  e.w.playAnimation();await nextTick();e.find('timeline-key-12').props.onPointerdown(event());dispatch('pointermove',event({clientX:194}));await nextTick();e.find('animation-timeline').props.onKeydown(event({key:'Escape',target:node('section')}));dispatch('pointerup');await nextTick();assert.equal(e.edits.length,1);assert.equal(e.w.animationPlaying.value,false);assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});

test('compiled Graph handle pauses before tangent preview Escape cancels and one release preserves untouched controls',async()=>{
 const e=await fixture();try{
  e.find('timeline-key-11').props.onPointerdown(event());dispatch('pointerup');e.find('timeline-tab-graph').props.onClick();await nextTick();const handleId='timeline-bezier-11-0-0';assert.ok(e.find(handleId));
  e.w.seekAnimation(15);e.w.playAnimation();await nextTick();e.find(handleId).props.onPointerdown(event());e.w.advanceAnimation(.1);assert.equal(e.w.animationFrame.value,15);assert.equal(e.w.animationPlaying.value,false);dispatch('pointermove',event({clientX:120,clientY:12}));await nextTick();assert.deepEqual(e.edits,[]);e.find('animation-timeline').props.onKeydown(event({key:'Escape',target:node('section')}));dispatch('pointerup');assert.deepEqual(e.edits,[]);
  e.find('timeline-graph-key-11-0').props.onPointerdown(event());dispatch('pointerup');await nextTick();e.w.playAnimation();await nextTick();e.find(handleId).props.onPointerdown(event());dispatch('pointermove',event({clientX:120,clientY:12}));dispatch('pointerup');await nextTick();assert.equal(e.edits.length,1);const patch=e.edits[0];assert.equal(patch.type,'setAnimationKey');assert.equal(patch.keyId,11);assert.ok(patch.controls[0][0]>10);assert.ok(patch.controls[0][1]>10);assert.deepEqual(patch.controls[0].slice(2),[20,20]);assert.deepEqual(patch.controls[1],[10,0,20,0]);assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});


test('compiled seek guard still cancels a stale drag and disabled controls cannot pause or submit edits',async()=>{
 const e=await fixture();try{
  e.w.seekAnimation(15);await nextTick();e.find('timeline-key-12').props.onPointerdown(event());dispatch('pointermove',event({clientX:147}));await nextTick();assert.deepEqual(e.edits,[]);
  e.w.seekAnimation(18);await nextTick();dispatch('pointerup');await nextTick();assert.deepEqual(e.edits,[]);assert.equal([...windowListeners.values()].reduce((sum,set)=>sum+set.size,0),0,'a genuine seek discards the old-frame gesture');
  e.busy.value=true;await nextTick();const pauses=e.pauseCalls.length;assert.equal(e.find('timeline-loop-start').props.disabled,true);e.find('timeline-key-12').props.onPointerdown(event());dispatch('pointermove',event({clientX:147}));dispatch('pointerup');await nextTick();assert.equal(e.pauseCalls.length,pauses);assert.deepEqual(e.edits,[]);assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});

test('playhead updates reuse stored key rendering while selection drag zoom locale and authored keys invalidate it',async()=>{
 const e=await fixture(),locale=i18n.global.locale.value,ro=i18n.global.getLocaleMessage('ro');
 try{
  const key=e.find('timeline-key-12'),writes=key.propWrites;const playhead=()=>flatten(e.target).find(n=>String(n.props.class??'').includes('at-playhead-line'));
  const initial=playhead().props.style.left;e.w.playAnimation();await nextTick();for(let i=0;i<12;i++){e.w.advanceAnimation(1/60);await nextTick();}
  assert.equal(key.propWrites,writes,'unchanged key rows do not patch during playback');assert.notEqual(playhead().props.style.left,initial);
  key.props.onPointerdown(event());dispatch('pointerup');await nextTick();assert.equal(e.find('timeline-key-12').props['aria-pressed'],true);
  const left=e.find('timeline-key-12').props.style.left;e.find('timeline-key-12').props.onPointerdown(event());dispatch('pointermove',event({clientX:147}));await nextTick();assert.notEqual(e.find('timeline-key-12').props.style.left,left);dispatch('pointerup');await nextTick();
  const beforeZoom=e.find('timeline-key-12').props.style.left;e.find('timeline-zoom').props['onUpdate:modelValue'](18.8);await nextTick();assert.notEqual(e.find('timeline-key-12').props.style.left,beforeZoom);
  i18n.global.mergeLocaleMessage('ro',{animation_frame:'Cadru QA'});i18n.global.locale.value='ro';await nextTick();assert.match(e.find('timeline-key-12').props['aria-label'],/Cadru QA/);
  const project=e.project.value;e.project.value={...project,revision:2,animations:project.animations.map(clip=>({...clip,tracks:clip.tracks.map(track=>({...track,keys:track.keys.map(k=>k.id===12?{...k,values:[77,9]}:k)}))}))};await nextTick();assert.equal(e.find('timeline-key-12').props.title,'77, 9');
  e.busy.value=true;await nextTick();assert.equal(e.find('timeline-key-bone-0-translate').props.disabled,true);
  assert.equal(e.edits.length,1);
 }finally{i18n.global.locale.value=locale;i18n.global.setLocaleMessage('ro',ro);e.close();}
});

test('Graph playback reuses stored curves while zoom and tangent preview still redraw and Escape restores the curve',async()=>{
 const e=await fixture();try{
  e.find('timeline-key-11').props.onPointerdown(event());dispatch('pointerup');e.find('timeline-tab-graph').props.onClick();await nextTick();
  const curve=()=>e.find('timeline-curve-0:translate-0'),key=e.find('timeline-graph-key-11-0'),writes=key.propWrites,path=curve().props.d;
  e.w.playAnimation();await nextTick();for(let i=0;i<12;i++){e.w.advanceAnimation(1/60);await nextTick();}assert.equal(key.propWrites,writes);assert.equal(curve().props.d,path);
  e.find('timeline-zoom').props['onUpdate:modelValue'](18.8);await nextTick();const zoomed=curve().props.d;assert.notEqual(zoomed,path);const graph=()=>flatten(e.target).find(n=>String(n.props.class??'')==='at-graph');const width=graph().props.style.width;e.w.setAnimationLoopRange({start:null,end:300});await nextTick();assert.notEqual(graph().props.style.width,width);
  e.find('timeline-bezier-11-0-0').props.onPointerdown(event());dispatch('pointermove',event({clientX:120,clientY:12}));await nextTick();assert.notEqual(curve().props.d,zoomed);
  e.find('animation-timeline').props.onKeydown(event({key:'Escape',target:node('section')}));dispatch('pointerup');await nextTick();assert.equal(curve().props.d,zoomed);assert.deepEqual(e.edits,[]);assert.deepEqual(e.project.value,e.before);
 }finally{e.close();}
});
