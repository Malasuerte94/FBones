import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
const schema=JSON.parse(readFileSync(new URL('../src-tauri/src/mcp_edits.json',import.meta.url)));
const catalog=JSON.parse(readFileSync(new URL('../src-tauri/src/mcp_catalog.json',import.meta.url)));
// Small independent validator for the JSON Schema vocabulary emitted here.
function accepts(s,value,root=s){
 if(s.$ref)return accepts(root.$defs[s.$ref.split('/').at(-1)],value,root);
 if(s.oneOf)return s.oneOf.filter(v=>accepts(v,value,root)).length===1;
 if(s.anyOf)return s.anyOf.some(v=>accepts(v,value,root));
 if(s.const!==undefined&&s.const!==value)return false;
 if(s.enum&&!s.enum.includes(value))return false;
 if(s.type==='null')return value===null;
 if(s.type==='string')return typeof value==='string';
 if(s.type==='boolean')return typeof value==='boolean';
 if(s.type==='number'||s.type==='integer')return typeof value==='number'&&Number.isFinite(value)&&(s.type!=='integer'||Number.isInteger(value))&&(s.minimum===undefined||value>=s.minimum)&&(s.maximum===undefined||value<=s.maximum);
 if(s.type==='array')return Array.isArray(value)&&(s.minItems===undefined||value.length>=s.minItems)&&(s.maxItems===undefined||value.length<=s.maxItems)&&value.every(v=>accepts(s.items,v,root));
 if(s.type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value)&&(s.required??[]).every(k=>Object.hasOwn(value,k))&&Object.entries(value).every(([k,v])=>s.properties[k]?accepts(s.properties[k],v,root):s.additionalProperties!==false);
 throw Error('Unrecognized schema '+JSON.stringify(s));
}
const edit=value=>accepts(schema,value);
test('MCP schemas remain generated from the current native serde inputs',()=>{
 const result=spawnSync(process.execPath,['scripts/generate-mcp-schema.mjs','--check'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
 const variants=schema.$defs.rig__RigEdit.oneOf.map(s=>s.properties.type.const);
 assert.equal(new Set(variants).size,110);
 for(const skipped of ['addImage','addImages','addAttachments','replaceMesh'])assert(!variants.includes(skipped));
 for(const required of ['renameBones','addPhysicsToBones','setAnimationKeyBatch','scaleAnimationKeys','setRegionPosition','setBoneParentPosition','setBoneWorldPosition','translateBoneWithCompensation','patchConstraints','autoAttachmentWeights','smoothAttachmentWeights','setAudioRoot','setLinkedMeshInheritance','attachmentEdit','undo','redo'])assert(variants.includes(required));
 const inherit={type:'setLinkedMeshInheritance',id:7};
 assert(edit({...inherit,inheritTimelines:false}));
 assert(edit({...inherit,inheritTimelines:true}));
 assert(!edit(inherit));
 assert(!edit({...inherit,inheritTimelines:'false'}));
 const linkedMesh={type:'createLinkedMesh',source:7,slot:3,name:'Banner Variant'};
 assert(edit(linkedMesh));
 assert(!edit({...linkedMesh,source:'7'}));
 assert(!edit({...linkedMesh,slot:undefined}));
 const parent={type:'setBoneParentPosition',id:4},smooth={type:'smoothAttachmentWeights',id:7};
 assert(edit({...parent,x:1.25}));
 assert(edit({...parent,y:-2}));
 assert(!edit({...parent,x:'1.25'}));
 assert(edit({...parent,x:1.25,compensateBones:true}));
 assert(edit({...parent,y:-2,compensateImages:true}));
 assert(edit({...parent,x:1.25,compensateBones:true,compensateImages:true}));
 assert(edit({...parent,y:-2,compensateBones:false,compensateImages:false}));
 for(const flag of ['compensateBones','compensateImages']){
  for(const value of [1,'true',null])assert(!edit({...parent,x:1.25,[flag]:value}));
 }
 const world={type:'setBoneWorldPosition',id:4,axis:'x',position:30.250000001};
 assert(edit(world));
 assert(edit({...world,axis:'y',compensateBones:true,compensateImages:true}));
 assert(!edit({...world,axis:'z'}));
 assert(!edit({...world,position:'30.25'}));
 assert(!edit({...world,y:899998.75}));
 const local={type:'setBoneLocalPosition',id:4,x:22.500000001};
 assert(edit(local));
 assert(edit({...local,y:-3.25,compensateBones:true,compensateImages:false}));
 assert(edit({type:local.type,id:4,y:12,compensateImages:true}));
 assert(!edit({...local,x:'22.5'}));
 assert(!edit({...local,axis:'x'}));
 assert(!edit({...local,compensateImages:'true'}));
 const rotate={type:'rotateBoneWithCompensation',id:4,mode:'worldDelta',angle:12.500000001,compensateBones:true,compensateImages:false};
 assert(edit(rotate));
 assert(edit({...rotate,mode:'localAbsolute',angle:-30,compensateBones:false,compensateImages:true}));
 assert(!edit({...rotate,mode:'world'}));
 assert(!edit({...rotate,angle:'12.5'}));
 assert(!edit({...rotate,compensateImages:undefined}));
 const scale={type:'scaleBoneWithCompensation',id:4,mode:'localFactor',x:1.5,compensateBones:false,compensateImages:true};
 assert(edit(scale));
 assert(edit({...scale,mode:'localAbsolute',x:-2,y:1}));
 assert(edit({type:scale.type,id:4,mode:'localAbsolute',y:-0.5,compensateBones:true,compensateImages:false}));
 assert(!edit({...scale,mode:'worldFactor'}));
 assert(!edit({...scale,x:'1.5'}));
 assert(!edit({...scale,compensateBones:undefined}));
 const shear={type:'shearBoneWithCompensation',id:4,mode:'worldDelta',axis:'x',angle:27.5,compensateBones:true,compensateImages:false};
 assert(edit(shear));
 assert(edit({...shear,mode:'localAbsolute',axis:'y',angle:-12.5}));
 assert(!edit({...shear,mode:'world'}));
 assert(!edit({...shear,axis:'z'}));
 assert(!edit({...shear,angle:'27.5'}));
 assert(!edit({...shear,axis:undefined}));
 const worldRotation={type:'setBoneWorldRotation',id:4,angle:315.000000001};
 assert(edit(worldRotation));
 assert(edit({...worldRotation,angle:-45,compensateBones:true,compensateImages:false}));
 assert(!edit({...worldRotation,angle:'315'}));
 assert(!edit({...worldRotation,compensateImages:'true'}));
 assert(!edit({...worldRotation,mode:'worldDelta'}));
 const region={type:'updateAttachment',id:7};
 for(const lane of ['x','y','rotation','scaleX','scaleY']){
  assert(edit({...region,[lane]:-2.5}));
  assert(!edit({...region,[lane]:'-2.5'}));
 }
 assert(edit({...region,rotation:25,scaleX:-2}));
 assert(edit({...region,x:1,y:2,rotation:3,scaleX:-1,scaleY:2}));
 assert(!edit({...region,x:3,shearY:2}));
 assert(edit({...smooth,vertices:[0,2],lockedBones:[4]}));
 assert(!edit({...smooth,scope:{vertices:[0,2]}}));
 const updateBindings={type:'updateAttachmentBindings',id:7};
 assert(edit(updateBindings));
 assert(!edit({type:updateBindings.type}));
 assert(!edit({...updateBindings,vertices:[0]}));
 const generate={type:'generateMeshVertices',id:7};
 assert(edit(generate));
 assert(!edit({type:generate.type}));
 assert(!edit({...generate,id:-1}));
 assert(!edit({...generate,slot:3}));
 const outline={type:'replaceMeshOutline',id:7,uvs:[[0,0],[1,0],[0,1]]};
 assert(edit(outline));
 assert(!edit({...outline,uvs:[[0,0],[1,0],[0,1,0]]}));
 assert(!edit({...outline,uvs:[[0,0],[1,0],{x:0,y:1}]}));
 assert(!edit({...outline,uvs:[[0,0],[1,0]]}));
 assert(!edit({...outline,uvs:[[0,0],[1.01,0],[0,1]]}));
 assert(!edit({...outline,uvs:Array.from({length:257},()=>[0,0])}));
 assert(!edit({type:outline.type,id:outline.id}));
 const swap={type:'swapAttachmentWeights',id:7,bones:[4,2]};
 assert(edit(swap));
 assert(edit({...swap,lockedBones:[9]}));
 assert(!edit({...swap,bones:[4]}));
 assert(!edit({...swap,bones:[4,2,9]}));
 assert(!edit({...swap,vertices:[0,2]}));
 const paste={type:'pasteAttachmentWeights',id:7,bones:[4,2],rows:[{vertex:0,weightBits:[2147483648,1065353216]}]};
 assert(edit({...paste,lockedBones:[4]}));
 assert(!edit({...paste,rows:[{vertex:0,weightBits:[4294967296,1065353216]}]}));
 assert(!edit({...paste,rows:[{vertex:0,weights:[0,1]}]}));
 const prune={type:'pruneAttachmentWeights',request:{targets:[{id:7,lockedBones:[9]},{id:11}],maxInfluences:2,threshold:0.125}};
 assert(edit(prune));
 assert(!edit({type:prune.type,id:7}));
 assert(!edit({...prune,request:{...prune.request,targets:[{id:7,vertices:[0]}]}}));
 assert(!edit({...prune,request:{...prune.request,maxInfluences:1.5}}));
});
test('MCP drift check accepts a real CRLF checkout but rejects semantic and other text drift',t=>{
 const checkout=mkdtempSync(join(tmpdir(),'fbones-mcp-schema-checkout-'));
 t.after(()=>rmSync(checkout,{recursive:true,force:true}));
 const projectRoot=fileURLToPath(new URL('../',import.meta.url));
 mkdirSync(join(checkout,'scripts'),{recursive:true});
 mkdirSync(join(checkout,'src-tauri/src'),{recursive:true});
 const checkoutFiles=['scripts/generate-mcp-schema.mjs',...readdirSync(join(projectRoot,'src-tauri/src')).filter(f=>f.endsWith('.rs')).map(f=>'src-tauri/src/'+f),'src-tauri/src/mcp_edits.json','src-tauri/src/mcp_catalog.json'];
 for(const relative of checkoutFiles){
  const source=readFileSync(join(projectRoot,relative),'utf8');
  writeFileSync(join(checkout,relative),source.replace(/\r?\n/g,'\r\n'));
 }
 const run=()=>spawnSync(process.execPath,[join(checkout,'scripts/generate-mcp-schema.mjs'),'--check'],{cwd:checkout,encoding:'utf8'});
 const schemaFiles=['mcp_edits.json','mcp_catalog.json'];
 const original=new Map(schemaFiles.map(name=>[name,readFileSync(join(checkout,'src-tauri/src',name),'utf8')]));
 const accepted=run();assert.equal(accepted.status,0,accepted.stdout+accepted.stderr);
 for(const name of schemaFiles)assert.equal(readFileSync(join(checkout,'src-tauri/src',name),'utf8'),original.get(name),'--check must not rewrite checkout');
 for(const name of schemaFiles){
  const changed=JSON.parse(original.get(name));
  if(name==='mcp_edits.json')changed.$defs.rig__RigEdit.oneOf[0].properties.type.const+='Changed';
  else changed[0].description+=' changed semantic description';
  writeFileSync(join(checkout,'src-tauri/src',name),(JSON.stringify(changed,null,2)+'\n').replace(/\n/g,'\r\n'));
  const rejected=run();assert.notEqual(rejected.status,0,'Changed '+name+' must be rejected');assert(rejected.stderr.includes(name+' is stale'));
  writeFileSync(join(checkout,'src-tauri/src',name),original.get(name));
 }
 const edits=join(checkout,'src-tauri/src/mcp_edits.json');
 for(const changed of [original.get('mcp_edits.json').replace('\r\n','\r'),original.get('mcp_edits.json').replace('  "$schema"','   "$schema"')]){
  writeFileSync(edits,changed);const rejected=run();assert.notEqual(rejected.status,0,'Only checkout CRLF pairs may be normalized');assert(rejected.stderr.includes('mcp_edits.json is stale'));
 }
});
test('MCP edit contract validates required nullable and exact-bit input fields',()=>{
 assert(edit({type:'setTransformRange',id:2,index:0,bits:null}));
 assert(!edit({type:'setTransformRange',id:2,index:0}));
 assert(edit({type:'setActiveAttachment',slot:3,attachment:null}));
 assert(edit({type:'patchConstraints',ids:[1],field:'physics.gravity',value:{bits:2147483648}}));
 assert(!edit({type:'patchConstraints',ids:[1],field:'physics.unknown',value:1}));
 assert(!edit({type:'patchConstraints',ids:[1],field:'physics.gravity',value:{bits:4294967296}}));
});
test('MCP nested constraints, nullable defaults and recursive attachment operations are typed',()=>{
 assert(edit({type:'addConstraint',constraint:{type:'physics',name:'fall',bone:1}}));
 assert(!edit({type:'addConstraint',constraint:{type:'physics',name:'fall'}}));
 assert(edit({type:'attachmentEdit',id:2,edit:{type:'moveVertices',id:3,vertices:[{vertex:0,x:12,y:14}]}}));
 assert(!edit({type:'attachmentEdit',id:2,edit:{type:'moveVertices',id:3,vertices:[{x:12,y:14}]}}));
 assert(edit({type:'autoAttachmentWeights',id:2,scope:{bones:[1,3],lockedBones:[1],vertices:[0]}}));
 assert(!edit({type:'autoAttachmentWeights',id:2,scope:{bones:'all'}}));
});
test('MCP animation schemas preserve flattened keys, array widths and required null payloads',()=>{
 const key={type:'setAnimationKey',animation:2,bone:1,channel:'translate',frame:0,values:[1,2],curve:'linear'};
 assert(edit(key));assert(!edit({...key,values:[1]}));assert(!edit({...key,key:{bone:1}}));
 assert(edit({type:'setAnimationSlotKeys',animation:2,keys:[{channel:'attachment',slot:3,frame:0,attachment:null}]}));
 assert(!edit({type:'setAnimationSlotKeys',animation:2,keys:[{channel:'attachment',slot:3,frame:0}]}));
 assert(edit({type:'setAnimationDrawOrderKeys',animation:2,keys:[{frame:0,order:null}]}));
 assert(!edit({type:'setAnimationDrawOrderKeys',animation:2,keys:[{frame:0}]}));
 assert(edit({type:'setAnimationConstraintKeys',animation:2,keys:[{channel:'physicsReset',constraint:3,frame:0}]}));
 const sequenceKey=mode=>({attachment:3,frame:0,mode,index:0,delay:.125});
 assert(edit({type:'setAnimationSequenceKeys',animation:2,keys:[3,4,5,6].map(sequenceKey)}));
 assert(!edit({type:'setAnimationKeyBatch',animation:2,sequenceKeys:[sequenceKey(7)]}));
 assert(edit({type:'updateEvent',id:1,floatBits:2147483648,float:0,string:'step'}));
 const move={type:'moveAnimationKeys',animation:2,keys:[7],deltaFrames:3};
 assert(edit(move));assert(edit({...move,shift:true}));assert(!edit({...move,shift:'on'}));
 const offset={type:'offsetAnimationKeys',animation:2,key:7,deltaFrames:9};
 assert(edit(offset));assert(edit({...offset,continueOffset:true}));assert(!edit({...offset,key:undefined}));
 for(const type of ['storeAnimationKeys','swapStoredAnimationKeys','clearStoredAnimationKeys']){
  assert(edit({type,animation:2}));assert(!edit({type}));assert(!edit({type,animation:2,keys:[]}));
 }
});
test('MCP discovery has unique typed tools and no unresolved schema references',()=>{
 assert.equal(catalog.length,24);assert.equal(new Set(catalog.map(t=>t.name)).size,catalog.length);
 for(const tool of catalog){assert.equal(tool.inputSchema.type,'object');assert.equal(typeof tool.description,'string');
  function walk(s){if(!s||typeof s!=='object')return;if(s.$ref)assert(tool.inputSchema.$defs?.[s.$ref.split('/').at(-1)],tool.name+' '+s.$ref);for(const value of Object.values(s))walk(value);}
  walk(tool.inputSchema);
 }
 const capture=catalog.find(t=>t.name==='fbones_capture_viewport');
 assert(capture.annotations.readOnlyHint);assert(accepts(capture.inputSchema,{expectedRevision:2,documentId:3}));assert(!accepts(capture.inputSchema,{documentId:3}));
 const trace=catalog.find(t=>t.name==='fbones_preview_trace_attachment');
 assert(accepts(trace.inputSchema,{id:1,options:{inner:true},expectedRevision:3}));
 assert(!accepts(trace.inputSchema,{id:1,options:{alphaThreshold:256},expectedRevision:3}));
 for(const target of ['trace','trace_attachment'])for(const action of ['preview','apply']){
  const {inputSchema}=catalog.find(t=>t.name===`fbones_${action}_${target}`);
  const request=options=>({id:1,expectedRevision:3,options});
  for(const options of [{},{padding:0},{padding:32}])assert(accepts(inputSchema,request(options)));
  for(const padding of [-1,0.5,33])assert(!accepts(inputSchema,request({padding})));
  assert.equal(inputSchema.$defs.trace__TraceOptions.properties.padding.default,0);
 }
 const evaluation=catalog.find(t=>t.name==='fbones_evaluate_project');
 assert(accepts(evaluation.inputSchema,{expectedRevision:2,request:{mode:'reset',time:0}}));
 assert(!accepts(evaluation.inputSchema,{expectedRevision:2,request:{mode:'bogus',time:0}}));
 const prune=catalog.find(t=>t.name==='fbones_preview_prune_weights');
 const request={targets:[{id:7,lockedBones:[9]}],maxInfluences:2,threshold:0.125};
 assert(prune.annotations.readOnlyHint);
 assert(accepts(prune.inputSchema,{expectedRevision:2,request}));
 assert(accepts(prune.inputSchema,{expectedRevision:2,poseEpoch:3,request}));
 assert(!accepts(prune.inputSchema,{request}));
 assert(!accepts(prune.inputSchema,{expectedRevision:2,request:{...request,threshold:'12.5%'}}));
});
