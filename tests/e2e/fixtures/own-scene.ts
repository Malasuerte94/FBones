import type {MeshView,ProjectSummary,AttachmentView} from '../../../src/domain/project';
import type {Page} from '@playwright/test';

/** Own in-memory display input, never a serialized file or mocked native save.
 * Four initialized influences and six asymmetric rows also support future
 * F302 view-selection tests after their separate reference gate. */
export function ownScopeScene():ProjectSummary{
  const offsets=[-90,-30,30,90],points=[[-100,-60],[0,-60],[100,-60],[100,60],[0,60],[-100,60]],weights=[[1,0,0,0],[.5,.25,.25,0],[.6,0,0,.4],[0,0,.5,.5],[.25,.25,.25,.25],[.1,.6,.2,.1]];
  const mesh:MeshView={weighted:true,bones:[1,2,3,4],vertices:points.map(([x,y],i)=>({weights:weights[i]!,positions:offsets.flatMap(offset=>[x!-offset,y!])})),uvs:[0,1,.5,1,1,1,1,0,.5,0,0,0],triangles:[0,1,5,1,4,5,1,2,4,2,3,4],edges:[0,1,1,2,2,3,3,4,4,5,5,0],hull:6};
  const region={image:'own-geometry-only',name:'Own mesh',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:200,height:120};
  const active:AttachmentView={id:40,slot:10,name:'Own mesh',type:'mesh',region,mesh,clipping:null,imageAvailable:false};
  const inactive:AttachmentView={...active,id:42,name:'Own inactive',region:{...region,name:'Own inactive'},mesh:{...mesh,vertices:mesh.vertices.map(v=>({...v,weights:[1,0,0,0]}))}};
  return{name:'Own F302 viewport fixture',path:null,dirty:false,inspectionOnly:false,canSave:false,canCopy:false,version:'4.3.26',compressedBytes:null,decodedBytes:null,boneCount:5,bones:[{id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0},...offsets.map((x,i)=>({id:i+1,parent:0,name:['A','B','C','D'][i]!,x,y:0,rotation:0,length:30}))],revision:0,canUndo:false,canRedo:false,editedBone:0,documentId:9001,slots:[{id:10,name:'Own slot',bone:0,visible:true,color:0xffffffff,blend:'normal',region,mesh,imageAvailable:false,activeAttachmentId:40,attachments:[active,inactive]}],editedSlot:null,editedAttachment:null,sceneEditing:true,constraints:[],library:{root:'',images:[],warnings:[]}};
}

export async function showOwnReadonlyScene(page:Page){
  await page.evaluate(scene=>{
    if((globalThis as {__TAURI__?:unknown}).__TAURI__)throw new Error('Readonly browser fixture cannot replace native session data.');
    const app=document.querySelector('#app') as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,{project:ProjectSummary;editMode:string;brushMode:string;resetCount:number;selectSceneAttachments(ids:number[],active:number|null):void}>}}}}};
    const workspace=app.__vue_app__.config.globalProperties.$pinia._s.get('workspace');if(!workspace)throw new Error('Workspace is not ready.');
    // Direct is a display input here; its disabled control is inspected rather
    // than pretending an editable native UI action occurred in browser preview.
    workspace.project=scene;workspace.editMode='images';workspace.brushMode='direct';workspace.selectSceneAttachments([],null);workspace.resetCount++;
  },ownScopeScene());
}
