#!/usr/bin/env node
/** Independent official-SDK acceptance against one dedicated live FBones editor.
 * Never run against a personal project: refuses any already-open document.
 * SDK is supplied separately; this adds no shipped dependency or alternate engine.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
const flags=new Map();for(let i=2;i<process.argv.length;i+=2)flags.set(process.argv[i],process.argv[i+1]);
const connectionPath=flags.get('--connection'),output=flags.get('--output'),sdkRoot=flags.get('--sdk-root')??process.env.FBONES_MCP_SDK_ROOT;
assert(connectionPath&&output&&sdkRoot,'Usage: --connection private.json --output private-directory --sdk-root installed-official-sdk');
const directory=await fs.realpath(output);assert(path.isAbsolute(directory));
const reportPath=path.join(directory,'client-acceptance.json');
try{await fs.stat(reportPath);throw Error('Refusing to overwrite an existing acceptance report.');}catch(error){if(error.code!=='ENOENT')throw error;}
const connection=JSON.parse(await fs.readFile(connectionPath,'utf8'));
const endpoint=new URL(connection.url);assert(endpoint.protocol==='http:'&&endpoint.hostname==='127.0.0.1'&&endpoint.pathname==='/mcp');assert(typeof connection.token==='string'&&connection.token.length>=32);
const sdkPackage=JSON.parse(await fs.readFile(path.join(sdkRoot,'package.json'),'utf8'));assert.equal(sdkPackage.name,'@modelcontextprotocol/sdk');assert.equal(sdkPackage.version,'1.32.1');
const {Client}=await import(pathToFileURL(path.join(sdkRoot,'dist/esm/client/index.js')).href);
const {StreamableHTTPClientTransport}=await import(pathToFileURL(path.join(sdkRoot,'dist/esm/client/streamableHttp.js')).href);
const client=new Client({name:'FBones independent acceptance',version:'1.0.0'});
const transport=new StreamableHTTPClientTransport(endpoint,{requestInit:{headers:{Authorization:`Bearer ${connection.token}`}}});
const calls=[],checks=[],toolsSeen=new Set();let project=null,revision=0;
function check(name){checks.push(name);}
async function tool(name,args={},expectError=false){
 const result=await client.callTool({name,arguments:args});toolsSeen.add(name);
 const entry={tool:name,success:!result.isError};if(result.structuredContent?.error)entry.error=result.structuredContent.error.code;calls.push(entry);
 if(expectError){assert.equal(result.isError,true,name+' unexpectedly succeeded');return result;}
 assert(!result.isError,name+': '+JSON.stringify(result.structuredContent??result.content));
 return result;
}
const data=result=>result.structuredContent?.result??JSON.parse(result.content.find(c=>c.type==='text').text);
async function read(){const value=data(await tool('fbones_get_project'));project=value.project;revision=value.revision;return project;}
async function mutate(name,args={}){const value=data(await tool(name,{...args,expectedRevision:revision}));if(value&&typeof value.revision==='number'){project=value;revision=value.revision;}else await read();return value;}
async function edit(edit,poseEpoch){return mutate('fbones_edit',{edit,...(poseEpoch===undefined?{}:{poseEpoch})});}
async function evaluate(request){return data(await tool('fbones_evaluate_project',{expectedRevision:revision,request}));}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Compare native authored DTOs across reload while allowing remapped Session IDs.
function semantics(p){
 const bone=id=>p.bones.find(b=>b.id===id)?.name??null;
 const mesh=m=>m?{...m,bones:m.bones.map(bone)}:null;
 const stripId=({id,...value})=>value;
 return {
  bones:p.bones.map(b=>({...stripId(b),parent:bone(b.parent)})),
  slots:p.slots.map(s=>({name:s.name,bone:bone(s.bone),visible:s.visible,color:s.color,blend:s.blend,tintBlack:s.tintBlack,darkColor:s.darkColor,region:s.region,mesh:mesh(s.mesh),activeAttachment:s.attachments.find(a=>a.id===s.activeAttachmentId)?.name??null,attachments:s.attachments.map(a=>{const {id,slot,...rest}=a;return {...rest,mesh:mesh(a.mesh)};})})),
  constraints:p.constraints.map(c=>{const v=stripId(c);if(v.bone!==undefined)v.bone=bone(v.bone);if(v.bones)v.bones=v.bones.map(bone);if(v.source!==undefined)v.source=bone(v.source);if(v.target!==undefined)v.target=bone(v.target);return v;}),
  animations:p.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.map(t=>({...t,bone:bone(t.bone),keys:t.keys.map(stripId)}))})),
  events:p.events.map(stripId),fps:p.animationFps,
 };
}
function u16(n){const b=Buffer.alloc(2);b.writeUInt16BE(n&65535);return b;}function u32(n){const b=Buffer.alloc(4);b.writeUInt32BE(n>>>0);return b;}
function section(b){return Buffer.concat([u32(b.length),b]);}
function png(){const width=32,height=32,raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*(width*4+1)+1+x*4;raw[i]=245;raw[i+1]=120;raw[i+2]=35;raw[i+3]=x>=3&&x<29&&y>=3&&y<29?255:0;}
 function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
 function chunk(type,data){const b=Buffer.concat([Buffer.from(type),data]);return Buffer.concat([u32(data.length),b,u32(crc(b))]);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
function wav(){const frames=80,data=Buffer.alloc(frames*2),out=Buffer.alloc(44+data.length);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(8000,24);out.writeUInt32LE(16000,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(data.length,40);data.copy(out,44);return out;}
function psd(){const width=4,height=4,planes=[210,50,70,255].map(c=>Buffer.concat([u16(0),Buffer.alloc(width*height,c)]));const name=Buffer.from([5,...Buffer.from('Layer'),0,0]);const extra=Buffer.concat([Buffer.alloc(8),name]);const descriptors=planes.map((p,i)=>Buffer.concat([u16(i===3?-1:i),u32(p.length)]));const record=Buffer.concat([u32(0),u32(0),u32(height),u32(width),u16(4),...descriptors,Buffer.from('8BIMnorm'),Buffer.from([255,0,0,0]),section(extra)]);let info=Buffer.concat([u16(1),record,...planes]);if(info.length%2)info=Buffer.concat([info,Buffer.alloc(1)]);const layers=Buffer.concat([section(info),u32(0)]);return Buffer.concat([Buffer.from('8BPS'),u16(1),Buffer.alloc(6),u16(4),u32(height),u32(width),u16(8),u16(3),Buffer.alloc(8),section(layers)]);}
async function writeNew(file,bytes){await fs.writeFile(file,bytes,{flag:'wx'});}
const images=path.join(directory,'source-images'),audio=path.join(directory,'source-audio'),portable=path.join(directory,'portable');
await fs.mkdir(images);await fs.mkdir(audio);await fs.mkdir(portable);await fs.mkdir(path.join(directory,'runtime-export'));
const savedPath=path.join(portable,'acceptance.fbones');
const pngBytes=png(),wavBytes=wav(),psdBytes=psd();
await writeNew(path.join(images,'square.png'),pngBytes);await writeNew(path.join(images,'alternative.png'),pngBytes);await writeNew(path.join(audio,'step.wav'),wavBytes);await writeNew(path.join(directory,'one-layer.psd'),psdBytes);
const started=new Date().toISOString();let finished=false;
try{
 await client.connect(transport);assert.equal(client.getServerVersion()?.name,'FBones');check('official-sdk initialize and initialized notification');
 const discovered=await client.listTools();assert.equal(discovered.tools.length,23);assert.equal(new Set(discovered.tools.map(t=>t.name)).size,23);
 await writeNew(path.join(directory,'tools.json'),JSON.stringify(discovered,null,2)+'\n');
 const resources=await client.listResources();assert(resources.resources.some(r=>r.uri==='fbones://guide'));assert(resources.resources.some(r=>r.uri==='fbones://edit-schema'));
 const guide=await client.readResource({uri:'fbones://guide'});assert(guide.contents[0].text.includes('expectedRevision'));
 const schema=JSON.parse((await client.readResource({uri:'fbones://edit-schema'})).contents[0].text);assert.equal(schema.$defs.rig__RigEdit.oneOf.length,86);
 const prompts=await client.listPrompts();assert(prompts.prompts.some(p=>p.name==='rig-image'));const prompt=await client.getPrompt({name:'rig-image'});assert(prompt.messages.length);check('23 discoverable tools,86 edit variants,resources and prompt');
 await read();assert.equal(project,null,'Refusing a live editor containing an existing project.');
 await mutate('fbones_create_project',{name:'MCP acceptance rig'});assert.equal(project.bones.length,1);const root=project.bones[0].id;
 const initialRevision=revision;
 await edit({type:'create',parent:root,x:20,y:0,rotation:0,length:20});assert.equal(project.bones.length,2);const child=project.bones[1].id;
 await edit({type:'undo'});assert.equal(project.bones.length,1);await edit({type:'redo'});assert.equal(project.bones[1].id,child);check('native bone authoring,one-step UndoRedo and stable IDs');
 await tool('fbones_edit',{expectedRevision:initialRevision,edit:{type:'undo'}},true);assert.equal((await read()).bones.length,2);
 await tool('fbones_close_project',{expectedRevision:revision},true);assert.equal((await read()).bones.length,2);
 await tool('fbones_edit',{expectedRevision:revision,edit:{type:'undo',unexpected:true}},true);assert.equal((await read()).bones.length,2);check('stale revision,dirty replacement and invalid-schema rejection preserve state');
 await mutate('fbones_choose_images_folder',{path:images});assert(project.library.images.some(i=>i.key==='square'));
 await mutate('fbones_refresh_images_folder');
 await mutate('fbones_place_image',{key:'square',bone:root,x:0,y:0});assert.equal(project.slots.length,1);await edit({type:'undo'});assert.equal(project.slots.length,0);
 await mutate('fbones_place_images',{keys:['square','alternative'],bone:root,x:0,y:0});assert.equal(project.slots.length,2);await edit({type:'undo'});assert.equal(project.slots.length,0);
 await mutate('fbones_import_image',{path:path.join(images,'square.png'),bone:root});assert.equal(project.slots.length,1);
 const slot=project.slots[0].id;let attachment=project.slots[0].activeAttachmentId;assert(Number.isInteger(attachment));
 await mutate('fbones_place_attachments',{keys:['alternative'],slot});assert.equal(project.slots[0].attachments.length,2);await edit({type:'undo'});assert.equal(project.slots[0].attachments.length,1);
 await mutate('fbones_save_project',{path:savedPath,saveAs:true});
 await mutate('fbones_import_psd',{path:path.join(directory,'one-layer.psd'),bone:root});assert.equal(project.slots.length,2);await edit({type:'undo'});assert.equal(project.slots.length,1);
 const image=await tool('fbones_get_image_data',{documentId:project.documentId,name:'square'});const imageBlock=image.content.find(c=>c.type==='image');assert.equal(imageBlock?.mimeType,'image/png');assert.deepEqual(Buffer.from(imageBlock.data,'base64'),pngBytes);check('image library,all placement routes,PNG/PSD import and real image content');
 await mutate('fbones_choose_audio_folder',{path:audio});assert(project.audioLibrary.sounds.some(s=>s.key==='step.wav'));
 const sound=await tool('fbones_get_audio_data',{documentId:project.documentId,key:'step.wav'});const audioBlock=sound.content.find(c=>c.type==='audio');assert.equal(audioBlock?.mimeType,'audio/wav');assert.deepEqual(Buffer.from(audioBlock.data,'base64'),wavBytes);
 await edit({type:'createEvent',name:'step'});await edit({type:'updateEvent',id:project.editedEvent,audio:'step.wav'});check('WAV library/audio blocks and authored event resource');
 const options={alphaThreshold:16,tolerance:2,spacing:24,inner:false,maxVertices:64};
 const slotPreview=data(await tool('fbones_preview_trace',{id:slot,options,expectedRevision:revision}));assert(slotPreview.geometry.uvs.length>=6);
 await mutate('fbones_apply_trace',{id:slot,options});assert(project.slots[0].mesh);await edit({type:'undo'});assert.equal(project.slots[0].mesh,null);
 let frozen=await evaluate({mode:'none',time:0});
 const preview=data(await tool('fbones_preview_trace_attachment',{id:attachment,options,expectedRevision:revision,poseEpoch:frozen.poseEpoch}));assert(preview.geometry.triangles.length>=3);const traceRevision=revision;
 assert.equal((await read()).revision,traceRevision,'Preview must not author');
 await mutate('fbones_apply_trace_attachment',{id:attachment,options,poseEpoch:frozen.poseEpoch});assert(project.slots[0].mesh);
 await tool('fbones_edit',{expectedRevision:revision,poseEpoch:frozen.poseEpoch,edit:{type:'bindAttachment',id:attachment,bones:[root,child]}},true);await read();assert(!project.slots[0].mesh.weighted);
 frozen=await evaluate({mode:'none',time:0});await edit({type:'bindAttachment',id:attachment,bones:[root,child]},frozen.poseEpoch);assert(project.slots[0].mesh.weighted);
 frozen=await evaluate({mode:'none',time:0});await edit({type:'autoAttachmentWeights',id:attachment},frozen.poseEpoch);
 for(const vertex of project.slots[0].mesh.vertices)assert(Math.abs(vertex.weights.reduce((a,b)=>a+b,0)-1)<1e-6);check('slot/attachment trace previews and commits,stale pose rejection,binding and normalized Auto Weights');
 await edit({type:'addPhysicsToBones',bones:[child]});assert.equal(project.constraints.length,1);assert.equal(project.constraints[0].type,'physics');
 const authoredBones=structuredClone(project.bones),physics=structuredClone(project.constraints);
 await evaluate({mode:'reset',time:0});await evaluate({mode:'update',time:0.25});await read();assert.deepEqual(project.bones,authoredBones);assert.deepEqual(project.constraints,physics);check('Physics creation/reset/update does not bake authored fields');
 await edit({type:'createAnimation',name:'AI motion'});const animation=project.editedAnimation;
 await edit({type:'setAnimationKeys',animation,keys:[{bone:root,channel:'translate',frame:0,values:[0,0],curve:'linear'},{bone:root,channel:'translate',frame:30,values:[30,0],curve:'linear'}]});
 const pose=await evaluate({mode:'replay',time:0.5,animationId:animation});assert(pose.bones.length===2);await read();assert.deepEqual(project.bones,authoredBones);assert.equal(project.animations.find(a=>a.id===animation).duration,30);check('animation key authoring and independent sampled pose without Setup baking');
 await mutate('fbones_export_runtime',{path:path.join(directory,'runtime-export')});
 await mutate('fbones_save_project',{path:savedPath,saveAs:true});assert.equal(project.dirty,false);
 const before=await fs.readFile(savedPath);assert(before.length>32&&before[0]!==123,'Save must be binary');
 const savedSemantics=semantics(project);
 const beforeSemantics={bones:project.bones.map(({id,parent,...b})=>b),slots:project.slots.length,constraints:project.constraints.length,animations:project.animations.map(a=>({name:a.name,duration:a.duration}))};
 await mutate('fbones_close_project');assert.equal(project,null);await mutate('fbones_open_project',{path:savedPath});assert.equal(project.name,'MCP acceptance rig');assert.equal(project.bones.length,2);assert.equal(project.slots.length,1);assert(project.slots[0].mesh.weighted);assert.equal(project.constraints.length,1);assert.equal(project.animations.find(a=>a.name==='AI motion').duration,30);
 assert.deepEqual(semantics(project),savedSemantics,'Authored bones,mesh,binding,constraints,keys and event payload must survive native reload');
 const referencedImage=project.slots[0].region.image;assert.equal(typeof referencedImage,'string');
 assert.deepEqual(await fs.readFile(savedPath),before);assert.deepEqual(await fs.readFile(path.join(portable,'images',referencedImage+'.png')),pngBytes);assert.deepEqual(await fs.readFile(path.join(portable,'images/square.png')),pngBytes);assert.deepEqual(await fs.readFile(path.join(portable,'audio/step.wav')),wavBytes);assert.deepEqual(await fs.readFile(path.join(directory,'one-layer.psd')),psdBytes);check('runtime export and binary/PNG/WAV SaveCloseOpen identity');
 const capture=await tool('fbones_capture_viewport',{expectedRevision:revision,documentId:project.documentId});const view=capture.content.find(c=>c.type==='image');assert.equal(view?.mimeType,'image/png');const captured=Buffer.from(view.data,'base64');assert.deepEqual([...captured.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert(captured.readUInt32BE(16)>0&&captured.readUInt32BE(20)>0);await writeNew(path.join(directory,'viewport.png'),captured);check('actual renderer viewport returned as MCP ImageContent');
 for(const t of discovered.tools)assert(toolsSeen.has(t.name),'Untested discovered tool '+t.name);
 finished=true;
 const report={status:'PASS',started,finished:new Date().toISOString(),sdk:{name:sdkPackage.name,version:sdkPackage.version},transport:'official SDK StreamableHTTPClientTransport',checks,tools:[...toolsSeen].sort(),calls,project:{name:project.name,revision,documentId:project.documentId,bones:project.bones.length,slots:project.slots.length,constraints:project.constraints.length,animations:project.animations.length,dirty:project.dirty},artifacts:{binary:{bytes:before.length,sha256:hash(before)},png:{bytes:pngBytes.length,sha256:hash(pngBytes)},wav:{bytes:wavBytes.length,sha256:hash(wavBytes)},viewport:{bytes:captured.length,sha256:hash(captured),width:captured.readUInt32BE(16),height:captured.readUInt32BE(20)}},beforeSemantics,verifiedAuthoredSemantics:true,referencedImage,limitations:['One dedicated Linux editor instance; not Windows/macOS native acceptance.','23 tool routes and representative native edits; not every numerical edge of all86 edit variants.','MCP exposure adds no new Spine fidelity claim.']};
 await writeNew(reportPath,JSON.stringify(report,null,2)+'\n');console.log(`Official MCP SDK ${sdkPackage.version}: ${checks.length} acceptance groups,${toolsSeen.size} tool routes PASS.`);
}catch(error){await writeNew(reportPath,JSON.stringify({status:'FAIL',started,finished:new Date().toISOString(),sdk:{name:sdkPackage.name,version:sdkPackage.version},checks,calls,error:error instanceof Error?error.message:String(error)},null,2)+'\n');throw error;}
finally{await client.close().catch(()=>{});if(!finished)process.exitCode=1;}
