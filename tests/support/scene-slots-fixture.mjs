// Actual components + production Pinia state; no DOM, renderer or native mutation.
import {readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {build} from 'esbuild';
import {parse,compileScript} from 'vue/compiler-sfc';
import {h,nextTick} from 'vue';
import {createPinia,disposePinia} from 'pinia';
import {renderer,node,flatten,windowListeners} from './scene-slots-host.mjs';
import {i18n} from '../../src/i18n.ts';
import {draftSummary} from '../../src/domain/project.ts';
export const nativeRequests=[];
globalThis.__TAURI__={core:{invoke:async(command,args)=>{nativeRequests.push({command,args});throw Error('Unexpected native request '+command);}},window:{getCurrentWindow:()=>({setTitle:async()=>{}})}};
const {useWorkspace}=await import('../../src/stores/workspace.ts');
const out=resolve('.local/scene-slots-control-tests');mkdirSync(out,{recursive:true});
export async function compile(path){const outfile=resolve(out,`${path.split('/').at(-1)}-${process.pid}.mjs`);await build({entryPoints:[path],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'actual-sfc',setup(b){b.onLoad({filter:/\.vue$/},({path})=>{const {descriptor}=parse(readFileSync(path,'utf8'),{filename:path});return{contents:compileScript(descriptor,{id:path,inlineTemplate:true}).content,loader:'ts',resolveDir:dirname(path)};});b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]});const c=(await import(outfile)).default;unlinkSync(outfile);return c;}
export const Tree=await compile('src/components/organisms/SceneTree.vue'),Hierarchy=await compile('src/components/organisms/SlotHierarchy.vue'),Timeline=await compile('src/components/organisms/AnimationTimeline.vue');
export function source(count=512,mixed=false){
 const base=2**32+1000,bone=base-1;
 const slots=Array.from({length:count},(_,i)=>{const id=base+i,attachment=base+10000+i,empty=mixed&&i===0,region={image:'own',name:'own',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:1,height:1};return{id,name:`Own slot ${String(i).padStart(3,'0')}`,bone,visible:!mixed||i%3!==0,color:0xffffffff,tintBlack:false,darkColor:0xff,blend:'normal',region:empty?null:region,mesh:null,imageAvailable:!empty,activeAttachmentId:empty||mixed&&i%3===0?null:attachment,attachments:empty?[]:[{id:attachment,slot:id,name:`Own attachment ${String(i).padStart(3,'0')}`,type:'region',region,mesh:null,clipping:null,imageAvailable:true}]};});
 return{...draftSummary('Own Scene slot UI'),documentId:51,logicalDocumentId:91,revision:3,sceneEditing:true,bones:[{id:bone,parent:null,name:'Own root',x:0,y:0,rotation:0,length:0,scaleX:1,scaleY:1,shearX:0,shearY:0}],slots,constraints:[],events:[],animationFps:30,animationChannels:['rotate','translate','scale','shear'],animations:[{id:base+20000,name:'Own clip',duration:20,tracks:[],slotTracks:[],drawOrder:[{id:base+30000,frame:5,order:slots.map(s=>s.id).reverse()},{id:base+30001,frame:20,order:null}]}],library:{root:'',images:[{key:'own',width:1,height:1}],warnings:[]},audioLibrary:{root:'',sounds:[],warnings:[]}};
}
export async function workspace(project=source(),animate=true){const pinia=createPinia(),w=useWorkspace(pinia);w.project=structuredClone(project);w.editorMode=animate?'animate':'setup';w.animationId=project.animations[0].id;w.animationAutoKey=false;w.pauseSimulation();w.escapeSelection();await nextTick();const apps=[];return{w,pinia,mount(component,props=()=>({})){const target=node('root'),app=renderer.createApp({render:()=>h(component,props())});app.use(pinia);app.use(i18n);app.mount(target);apps.push(app);return{target,all:()=>flatten(target),find:id=>flatten(target).find(n=>n.props['data-testid']===id)};},close(){for(const app of apps)app.unmount();disposePinia(pinia);if([...windowListeners.values()].some(s=>s.size))throw Error('Leaked window listeners');}};}
export function timelineProps(w,extra={}){return{animations:w.animations,activeAnimationId:w.animationId,bones:w.project.bones,selectedBoneIds:w.selectedIds,tracks:w.animationTracks,slots:w.sceneSlots.map(s=>({id:s.id,name:s.name,boneId:s.bone,tintBlack:s.tintBlack,attachments:s.attachments})),slotTracks:w.animationSlotTracks,drawOrderKeys:w.animationDrawOrderKeys,selectedSlotIds:w.selectedSlotIds,currentFrame:w.animationFrame,durationFrames:w.animationDuration,fps:w.animationFps,playing:false,loop:true,autoKey:false,supportedChannels:w.animationChannels,supportedInterpolations:['linear','stepped','bezier'],...extra};}
