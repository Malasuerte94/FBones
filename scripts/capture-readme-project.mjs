#!/usr/bin/env node
// Real production frontend + isolated production Rust Session, read-only source.
// Requires an already-running scripts/serve-e2e.mjs server; never builds/starts
// a shared server. Raw user projects/assets remain inside ignored local output.
import {chromium,expect} from '@playwright/test';
import {cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {resolve,join,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {NativeHost,defaultNativeBinary} from './e2e/native-host.mjs';

const args=new Map();
for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i]?.startsWith('--')||!process.argv[i+1])throw Error('Expected --source PATH --output PATH [--url URL] [--binary PATH] [--project FILE].');args.set(process.argv[i],process.argv[i+1]);}
const source=resolve(args.get('--source')??'.local/mcp-presentation-source/mascota-spine');
const output=resolve(args.get('--output')??`.local/readme-capture-${Date.now()}`);
if(!output.startsWith(resolve('.local')+'/'))throw Error('Capture to fresh ignored .local output; inspect before copying public PNGs.');
const project=args.get('--project')??'persona.spine';
if(project.includes('/')||project.includes('\\')||!['.spine','.fbones'].includes(extname(project)))throw Error('Use one binary project filename inside the source directory.');
const url=args.get('--url')??'http://127.0.0.1:4173';
if(new URL(url).hostname!=='127.0.0.1')throw Error('Use the own loopback production-frontend server.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function inventory(root,prefix=''){
 const result=[];
 for(const item of await readdir(join(root,prefix),{withFileTypes:true})){
  const path=join(prefix,item.name);
  if(item.isSymbolicLink())throw Error('Source symlinks are not accepted.');
  if(item.isDirectory())result.push(...await inventory(root,path));
  else if(item.isFile()){const bytes=await readFile(join(root,path));result.push({path,bytes:bytes.length,sha256:sha(bytes)});}
 }
 return result.sort((a,b)=>a.path.localeCompare(b.path));
}
const before=await inventory(source);
await mkdir(output,{recursive:false,mode:0o700});
const packageInfo=JSON.parse(await readFile('package.json','utf8'));
const result={passed:false,applicationVersion:packageInfo.version,sourceFiles:before,viewport:{width:1440,height:900},captures:[],scope:'Unedited production-CSP Chromium screenshots; real isolated Rust Session, user-supplied mascot copy. No native OS window or general Spine compatibility claim.'};
let browser,host;
try{
 const health=await fetch(url+'/__e2e/health');if(!health.ok||(await health.json()).csp!=='production')throw Error('Expected existing production-CSP FBones server.');
 host=await NativeHost.create(resolve(args.get('--binary')??defaultNativeBinary),join(output,'workspaces'));
 const privateSource=join(host.root,'presentation');await cp(source,privateSource,{recursive:true,errorOnExist:true});
 await host.invoke('e2e_dialog',{kind:'open',path:'presentation/'+project});
 const model=await host.invoke('open_project',{discardChanges:false});
 result.nativeProfile={name:model.name,inspectionOnly:model.inspectionOnly,sceneEditing:model.sceneEditing,boneCount:model.bones.length,slotCount:model.slots?.length??0,animationCount:model.animations?.length??0};
 if(model.inspectionOnly||!model.sceneEditing||!model.bones.length)throw Error('Supplied binary is inspection-only in the real native Session. Refuse staged/fake reconstruction or silent data removal for screenshots.');
 const clip=model.animations?.find(animation=>animation.name==='big_win')??model.animations?.find(animation=>animation.tracks.some(track=>track.keys.length>2));
 if(!clip)throw Error('A real supported animation with existing keys is required.');
 const companion=JSON.parse(await readFile(join(source,'persona.json'),'utf8'));
 const bounds=companion.skeleton;
 if(![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)throw Error('Expected source-provided mascot bounds for camera framing.');
 result.animation={name:clip.name,frame:Math.min(17,Math.floor(clip.duration/3)),duration:clip.duration};
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BINARY??'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--disable-background-networking','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:result.viewport,deviceScaleFactor:1,locale:'en-US',colorScheme:'dark'});
 const page=await context.newPage(),runtimeErrors=[],calls=[];
 let imageFlights=0,imageLoads=0;
 page.on('pageerror',error=>runtimeErrors.push(error.message));
 await page.exposeBinding('__fbonesReadmeInvoke',async(_source,command,values={})=>{
  if(command==='frontend_ready')return null;
  calls.push(command);
  if(command==='get_image_data')imageFlights++;
  try{return await host.invoke(command,values);}
  finally{if(command==='get_image_data'){imageFlights--;imageLoads++;}}
 });
 await page.addInitScript(()=>{
  const panels=['weights','mesh','tree','properties','ik','transform','physics'];
  const layout={version:1,columns:[{id:'scene',width:320,panels:panels.map(id=>({id,visible:id==='tree'||id==='properties',height:id==='tree'?.6:.4}))}]};
  localStorage.setItem('fbones.dock-layout.v1',JSON.stringify(layout));localStorage.setItem('fbones.animate-dock-layout.v1',JSON.stringify(layout));localStorage.setItem('fbones.animation-height','360');
  globalThis.__TAURI__={core:{invoke:(command,args)=>globalThis.__fbonesReadmeInvoke(command,args)},event:{listen:async()=>()=>{}},window:{getCurrentWindow:()=>({setTitle:async title=>{document.title=title;},onCloseRequested:async()=>()=>{},destroy:async()=>{}})}};
 });
 await page.goto(url);await expect(page.getByTestId('viewport').locator('canvas')).toBeVisible();
 await expect(page.locator('footer.editor-status')).toContainText('Version '+result.applicationVersion);
 await expect(page.getByTestId('project-inspection-notice')).toHaveCount(0);
 await expect.poll(()=>imageLoads,{timeout:15000}).toBeGreaterThan(0);await expect.poll(()=>imageFlights,{timeout:15000}).toBe(0);
 const simulate=page.getByTestId('physics-simulate');if(await simulate.count())await simulate.uncheck();
 const selectBone=async(name,additive=false)=>{
  const bone=model.bones.find(value=>value.name===name);if(!bone)throw Error('Source lacks presentation bone '+name);
  const row=page.locator(`[data-tree-kind="bone"][data-tree-id="${bone.id}"]`).getByRole('treeitem');
  // Tree starts expanded in a fresh profile; scroll remains an actual UI action.
  await row.scrollIntoViewIfNeeded();await row.click({modifiers:additive?['Control']:[]});
 };
 const frameCamera=async()=>{
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  const box=await page.getByTestId('viewport').boundingBox();
  // Reserve the real shared transform HUD at the bottom of the viewport;
  // camera framing only, never hide/move product controls for publication.
  const bottomOverlay=130,zoom=Math.min(.7,(box.width-130)/bounds.width,(box.height-bottomOverlay-60)/bounds.height);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-Math.log(zoom)/.0015);
  await page.waitForTimeout(150);
  const dx=-(bounds.x+bounds.width/2)*zoom,dy=(bounds.y+bounds.height/2)*zoom-bottomOverlay/2;
  await page.mouse.down({button:'middle'});await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:8});await page.mouse.up({button:'middle'});
  await page.mouse.move(5,895);
  return{zoom,dx,dy,bottomOverlay};
 };
 const capture=async(name,view,camera)=>{
  await expect.poll(()=>imageFlights,{timeout:15000}).toBe(0);
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
  await page.waitForTimeout(400);
  const text=await page.locator('body').innerText();
  if(text.includes('/home/')||text.includes('.local/')||text.includes('Bearer ')||/[A-Z]:\\/.test(text))throw Error('Personal path or credential is visible; refuse public screenshot.');
  if(runtimeErrors.length)throw Error('Browser runtime failure: '+runtimeErrors.join('; '));
  const path=join(output,name);await page.screenshot({path,fullPage:false,animations:'disabled'});
  const bytes=await readFile(path);result.captures.push({name,view,camera,width:1440,height:900,bytes:bytes.length,sha256:sha(bytes)});
 };
 await selectBone('head');const setupCamera=await frameCamera();await capture('setup.png','Setup; source-authored pose',setupCamera);
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip.id));
 await page.getByTestId('timeline-current').fill(String(result.animation.frame));await page.getByTestId('timeline-current').press('Enter');
 await selectBone('pelvis');await selectBone('torso',true);await selectBone('head',true);await selectBone('upperarm_free',true);
 await page.getByTestId('timeline-tab-dopesheet').click();await expect(page.locator('[data-timeline-key-id]').first()).toBeVisible();
 const animateCamera=await frameCamera();await capture('animate-dopesheet.png','Animate Dopesheet; existing '+clip.name+' keys',animateCamera);
 await selectBone('head');await page.getByTestId('timeline-tab-graph').click();
 await expect(page.locator('[data-testid^="timeline-curve-"]').first()).toBeVisible();
 await capture('animate-graph.png','Animate Graph; existing '+clip.name+' head rotation curve',animateCamera);
 const final=await host.invoke('get_project');
 if(final.revision!==model.revision||final.dirty!==model.dirty||calls.includes('edit_rig')||calls.includes('save_project'))throw Error('Capture unexpectedly authored/saved project data.');
 const after=await inventory(source);if(JSON.stringify(after)!==JSON.stringify(before))throw Error('Source copy changed during capture.');
 result.passed=true;result.imageLoads=imageLoads;result.runtimeErrors=runtimeErrors;result.sourceUnchanged=true;result.nativeRevisionUnchanged=true;
}catch(error){result.error=error instanceof Error?error.message:String(error);process.exitCode=1;}
finally{
 await browser?.close();if(host){await host.close();await rm(host.root,{recursive:true});}
 await writeFile(join(output,'capture-manifest.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({passed:result.passed,captures:result.captures.map(({name,sha256})=>({name,sha256})),manifest:relative(process.cwd(),join(output,'capture-manifest.json')),error:result.error}));
