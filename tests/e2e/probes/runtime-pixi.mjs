// Own fixture, using the actual shipped bundles. This is renderer regression
// evidence; it does not establish .fbones loading or original-editor fidelity.
import {FBonesPlayer} from '../../../packages/runtime/dist/index.js';
import {FBonesView,runtimeImageKeys} from '../../../packages/runtime/dist/pixi.js';
import {Application,Texture,Rectangle,Mesh} from 'pixi.js';

const background=[16,24,32,255];
const bone=(id,parent,x,y)=>({id,parent,name:'Own bone '+id,x,y,rotation:0,length:0,scaleX:1,scaleY:1,shearX:0,shearY:0,color:0xffffffff});
const region=(image,x,y,width=24,height=24)=>({image,imagePath:'',name:image,x,y,width,height,rotation:0,scaleX:1,scaleY:1});
const binding=(points,weighted=false)=>({weighted,bones:weighted?[0,1]:[0],vertices:points.map(([x,y])=>({weights:weighted?[.25,.75]:[1],positions:weighted?[x,y,x-80,y+70]:[x,y]}))});
const mesh=(points,triangles,weighted=false)=>({...binding(points,weighted),uvs:points.length===4?[0,0,1,0,1,1,0,1]:[0,0,1,0,0,1],triangles,edges:[],hull:points.length});
const attachment=(id,slot,image,x,y,extra={})=>({id,slot,name:image,type:'region',region:region(image,x,y),mesh:null,clipping:null,color:0xffffffff,imageAvailable:true,...extra});
const slot=(id,attachments,extra={})=>({id,name:'Own slot '+id,bone:0,visible:true,color:0xffffffff,blend:'normal',tintBlack:false,darkColor:255,region:attachments[0].region,mesh:attachments[0].mesh,imageAvailable:true,activeAttachmentId:attachments[0].id,attachments,...extra});
const mask={id:30,slot:3,name:'Own clipping',type:'clipping',region:null,mesh:null,clipping:{...binding([[145,-20],[165,-20],[165,-60],[145,-60]]),endSlot:4,convex:false,inverse:false},color:0xffffffff,imageAvailable:false};
const meshA=attachment(60,6,'red',0,0,{type:'mesh',mesh:mesh([[80,-90],[120,-90],[120,-130],[80,-130]],[0,1,2,0,2,3])});
const meshB=attachment(61,6,'cyan',0,0,{type:'mesh',mesh:mesh([[80,-90],[120,-90],[80,-130]],[0,1,2])});
const sequence=attachment(50,5,'sequence',40,-110,{region:{...region('seq01',40,-110),imagePath:'seq'},sequence:{start:1,count:2,digits:2,setupIndex:0},sequenceAvailableFrames:[0,1]});
const data={format:'fbones-runtime',version:1,fps:1,bones:[bone(0,null,0,0),bone(1,0,80,-70)],constraints:[],events:[],slots:[
 slot(1,[attachment(10,1,'red',40,-40)]),
 slot(2,[attachment(20,2,'green',0,0,{type:'mesh',mesh:mesh([[80,-20],[120,-20],[120,-60],[80,-60]],[0,1,2,0,2,3],true)})]),
 slot(3,[mask]),slot(4,[attachment(40,4,'green',165,-40,{region:region('green',165,-40,60,40)})]),
 slot(5,[sequence]),slot(6,[meshA,meshB]),
 slot(7,[attachment(70,7,'black',200,-110)],{tintBlack:true,darkColor:0x00ff00ff}),
],animations:[{id:1,name:'Own GPU swap',duration:2,tracks:[{bone:1,channel:'translate',keys:[{id:1,frame:0,values:[0,0],curve:'linear'},{id:2,frame:1,values:[10,0],curve:'linear'}]}],slotTracks:[{slot:6,channel:'attachment',keys:[{id:3,frame:0,attachment:60},{id:4,frame:1,attachment:61}]}],sequenceTracks:[{attachment:50,slot:5,keys:[{id:5,frame:0,mode:0,index:0,delay:1},{id:6,frame:1,mode:0,index:1,delay:1}]}]}]};

async function run(){
 const app=new Application();await app.init({width:256,height:192,resolution:1,antialias:false,background:0x101820,preference:'webgl',autoStart:false,sharedTicker:false});
 document.body.style.margin='0';document.body.append(app.canvas);app.canvas.dataset.testid='runtime-pixi-canvas';
 const textures=new Map();
 for(const [key,color]of Object.entries({red:'#ff0000',green:'#00ff00',cyan:'#00ffff',black:'#000000',seq01:'#0000ff',seq02:'#ffff00'})){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const context=canvas.getContext('2d');context.fillStyle=color;context.fillRect(0,0,2,2);textures.set(key,Texture.from(canvas));
 }
 const player=new FBonesPlayer(data),view=new FBonesView(key=>textures.get(key));app.stage.addChild(view);
 const points={region:[40,40],weightedInside:[100,40],weightedLeft:[83,40],weightedRight:[125,40],clipInside:[155,40],clipOutside:[180,40],sequence:[40,110],swapInside:[87,97],swapOutside:[110,120],twoColor:[200,110],background:[230,160]};
 function snapshot(){
  view.sync(player.frame);app.render();
  const {pixels,width}=app.renderer.extract.pixels({target:app.stage,frame:new Rectangle(0,0,256,192),resolution:1,clearColor:0x101820,antialias:false});
  return{pixels:Object.fromEntries(Object.entries(points).map(([name,[x,y]])=>[name,Array.from(pixels.slice((y*width+x)*4,(y*width+x)*4+4))])),meshVertices:view.children.filter(node=>node instanceof Mesh).map(node=>node.geometry.positions.length/2).sort(),frame:player.frame.frame};
 }
 player.play('Own GPU swap',{loop:false});const before=snapshot(),oldMeshes=view.children.filter(node=>node instanceof Mesh);
 player.seek(1);const after=snapshot(),destroyedOldMesh=oldMeshes.some(node=>node.destroyed);
 window.__fbonesRuntimeProbe={status:'ready',before,after,imageKeys:runtimeImageKeys(player.data).sort(),destroyedOldMesh,background,renderer:app.renderer.name};
 window.__fbonesRuntimeProbeCleanup=()=>{view.destroy();const texturesRetained=[...textures.values()].every(texture=>!texture.destroyed);app.destroy({removeView:true},{children:true});for(const texture of textures.values())texture.destroy(true);return{texturesRetained};};
}
run().catch(error=>{window.__fbonesRuntimeProbe={status:'failed',message:error.stack??String(error)};});
