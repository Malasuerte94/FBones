// End-to-end native authoring export -> installed-shaped headless runtime.
// Only generated fixtures and isolated Sessions; no original/user instances.
import assert from 'node:assert/strict';
import {readFile,mkdir,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {NativeHost,defaultNativeBinary} from './e2e/native-host.mjs';
import {FBonesPlayer} from '../packages/runtime/dist/index.js';
import {meshPoints} from '../src/domain/meshes.ts';

const workspaces=resolve('.local/runtime-export-verification');
await mkdir(workspaces,{recursive:true});
const results=[];
for(const seed of ['e2e_seed_import_metadata_fixture','e2e_seed_sequence_fixture','e2e_seed_two_color_fixture']){
 const host=await NativeHost.create(defaultNativeBinary,workspaces);
 try{
  const source=await host.invoke(seed);
  await host.invoke('e2e_dialog',{kind:'open',path:source});
  const project=await host.invoke('open_project',{discardChanges:true});
  await host.invoke('e2e_dialog',{kind:'folder',path:'.'});
  const bundle=await host.invoke('export_runtime',{expectedRevision:project.revision});
  const json=await readFile(join(bundle.path,'skeleton.fbones.runtime.json'),'utf8');
  const player=new FBonesPlayer(json);
  let samples=0,maxResidual=0;
  for(const clip of project.animations){
   player.play(clip.name,{loop:false});
   for(const frame of [...new Set([0,2,4,8,12,20,Math.min(30,player.duration*project.animationFps)])].filter(frame=>frame<=player.duration*project.animationFps)){
    const actual=player.seek(frame/project.animationFps);
    const native=await host.invoke('evaluate_project',{expectedRevision:project.revision,request:{mode:'replay',time:frame/project.animationFps,animationId:clip.id,deformTargets:project.slots.flatMap(s=>s.attachments.filter(a=>a.mesh||a.clipping).map(a=>a.id))}});
    for(const bone of actual.bones){const expected=native.bones.find(b=>b.id===bone.id).world;for(const field of ['a','b','c','d','x','y']){const residual=Math.abs(bone.evaluatedWorld[field]-expected[field]);maxResidual=Math.max(maxResidual,residual);assert.ok(residual<0.0002,`${seed}/${clip.name}/${frame}/${bone.id}/${field}: ${residual}`);}}
    if(native.drawOrder)assert.deepEqual(actual.slots.map(s=>s.id),native.drawOrder);
    for(const pose of native.slotPose??[]){const slot=actual.slots.find(s=>s.id===pose.slot);assert.equal(slot.activeAttachmentId,pose.attachment);for(let i=0;i<4;i++)assert.ok(Math.abs(slot.animatedColor[i]-pose.color[i])<0.00001);}
    for(const pose of native.sequencePose??[]){const attachment=actual.slots.flatMap(s=>s.attachments).find(a=>a.id===pose.attachment);assert.equal(attachment.region.image,pose.image);assert.ok((await readFile(join(bundle.path,'images',pose.image+'.png'))).length>0);}
    for(const pose of native.deformPose??[]){const attachment=actual.slots.flatMap(s=>s.attachments).find(a=>a.id===pose.attachment);if(!attachment?.mesh||!pose.worldVertices)continue;const points=meshPoints(actual.bones,attachment.mesh);for(let i=0;i<points.length;i++)for(const [at,key]of ['x','y'].entries())assert.ok(Math.abs(points[i][key]-pose.worldVertices[i][at])<0.0002);}
    samples++;
   }
  }
  assert.deepEqual(await host.invoke('get_project'),project);
  results.push({seed,clips:project.animations.length,samples,maxResidual,imageCount:bundle.imageCount,authoredStateUnchanged:true});
 }finally{await host.close();await rm(host.root,{recursive:true,force:true});}
}
assert.ok(results.every(r=>r.samples>0));
const report={passed:true,scope:'Independent generated native fixtures -> JSON/PNG export -> bundled headless runtime; no original/OS/GPU claim',results};
await mkdir('analysis',{recursive:true});
await writeFile('analysis/runtime-export-integration-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
