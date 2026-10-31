<script setup lang="ts">
import 'pixi.js/unsafe-eval';
import {Application} from 'pixi.js';
import {onBeforeUnmount,onMounted,ref,watch} from 'vue';
import {useWorkspace} from '../../stores/workspace';
import {ImageLayer} from '../../viewport/ImageLayer';
import {imageData} from '../../services/desktop';
import {worldRegions} from '../../domain/images';
import {transformPoint} from '../../domain/rig';
import {meshPoints} from '../../domain/meshes';
const w=useWorkspace(),host=ref<HTMLElement>(),error=ref(''),ready=ref(false);
let app:Application|undefined,layer:ImageLayer|undefined,observer:ResizeObserver|undefined,disposed=false;
let zoom=1,center={x:0,y:0},fittedDocument=-1,autoFit=true;
function fit(){
  if(!app)return;
  autoFit=true;
  const points=worldRegions(w.renderedBones,w.viewSlots).filter(slot=>slot.visible).flatMap(slot=>slot.mesh?meshPoints(w.renderedBones,slot.mesh):[[-.5,-.5],[-.5,.5],[.5,.5],[.5,-.5]].map(([x,y])=>transformPoint(slot,x!*slot.region.width,y!*slot.region.height)));
  if(points.length){const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);center={x:(left+right)/2,y:(bottom+top)/2};zoom=Math.min(Math.max(1,app.screen.width-24)/Math.max(1,right-left),Math.max(1,app.screen.height-24)/Math.max(1,top-bottom));}
  else{center={x:0,y:0};zoom=1;}
  draw();
}
function draw(){
  if(!app||!layer||disposed)return;
  const documentId=w.project?.documentId??-1;
  if(fittedDocument!==documentId){fittedDocument=documentId;fit();return;}
  const screen=(x:number,y:number)=>({x:app!.screen.width/2+(x-center.x)*zoom,y:app!.screen.height/2-(y-center.y)*zoom});
  layer.draw(w.project?.documentId??-1,w.renderedBones,w.viewSlots,null,screen,zoom);
  app.render();
}
function wheel(event:WheelEvent){event.preventDefault();autoFit=false;zoom=Math.max(.02,Math.min(20,zoom*Math.exp(-event.deltaY*.001)));draw();}
onMounted(async()=>{
  if(!host.value)return;
  const instance=new Application();
  try{
    await instance.init({width:Math.max(1,host.value.clientWidth),height:Math.max(1,host.value.clientHeight),backgroundAlpha:0,preference:'webgl',antialias:true,autoDensity:true,resolution:Math.min(window.devicePixelRatio||1,2),autoStart:false});
    if(disposed){instance.destroy(true,{children:true});return;}
    app=instance;host.value.append(instance.canvas);layer=new ImageLayer(imageData,draw,message=>{error.value=message;});instance.stage.addChild(layer.container);
    observer=new ResizeObserver(()=>{if(app&&host.value){app.renderer.resize(Math.max(1,host.value.clientWidth),Math.max(1,host.value.clientHeight));if(autoFit)fit();else draw();}});observer.observe(host.value);
    ready.value=true;draw();
  }catch(reason){error.value=reason instanceof Error?reason.message:String(reason);if(app){layer?.destroy();app.destroy(true,{children:true});app=undefined;}else if(instance.renderer)instance.destroy(true,{children:true});}
});
watch(()=>[w.renderedBones,w.viewSlots,w.project?.documentId],draw);
onBeforeUnmount(()=>{disposed=true;observer?.disconnect();layer?.destroy();app?.destroy(true,{children:true});app=undefined;});
</script>
<template>
 <section class="animation-preview" aria-label="Animation preview" data-testid="animation-preview">
  <div class="animation-preview-content">
   <div ref="host" class="animation-preview-canvas viewport-checker" :data-ready="ready" role="img" aria-label="Live animation preview" @wheel="wheel"><p v-if="error" role="status" class="absolute inset-2 z-10 overflow-auto text-[10px] text-danger">{{error}}</p></div>
   <div class="animation-preview-list"><button v-for="clip in w.animations" :key="clip.id" :class="{active:w.animationId===clip.id}" @click="w.selectAnimation(clip.id)"><span class="text-motion">⌁</span> {{clip.name}}</button></div>
  </div>
  <div class="animation-preview-controls"><button aria-label="Fit preview" title="Fit preview" @click="fit">⊞</button><span>Speed</span><input v-model.number="w.animationSpeed" type="range" min="0.1" max="2" step="0.05" aria-label="Animation preview speed"><output>{{Math.round(w.animationSpeed*100)}}%</output><button :aria-label="w.animationPlaying?'Pause':'Play'" @click="w.animationPlaying?w.pauseAnimation():w.playAnimation()">{{w.animationPlaying?'Ⅱ':'▶'}}</button></div>
 </section>
</template>
