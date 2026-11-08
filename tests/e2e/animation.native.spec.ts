import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {BoneView,EvaluationSnapshot,ProjectSummary} from '../../src/domain/project';

async function fixture(page:Page,native:NativeSession,fromTree=false){
 let project=await native.invoke<ProjectSummary>('create_project',{name:'Own Animate timeline',discardChanges:true});
 project=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:project.revision,edit:{type:'create',parent:project.bones[0]!.id,x:20,y:5,rotation:0,length:45}});
 const bone=project.editedBone!,initialNames=project.animations?.map(a=>a.name)??[];await openNativeEditor(page);
 await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
 if(fromTree){await page.getByTestId('tree-new').click();await page.getByTestId('tree-new-animation').click();}
 else{await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-create').click();}
 await expect(page.getByTestId('animation-timeline')).toBeVisible();await expect(page.getByTestId('animation-tools')).toBeVisible();await page.getByTestId('animation-name').fill('anticipation');await page.getByTestId('animation-name').press('Enter');
 await expect.poll(async()=>(await native.snapshot())?.animations?.map(a=>a.name)).toEqual([...initialNames,'anticipation']);
 await expect(page.getByTestId('animation-select')).toHaveValue(String(clip((await native.snapshot())!).id));
 return {bone,setup:project.bones};
}
async function seek(page:Page,frame:number){const field=page.getByTestId('timeline-current');await field.fill(String(frame));await field.press('Enter');await expect(field).toHaveValue(String(frame));}
async function xField(page:Page,value:number){const field=page.getByTestId('animate-bone-x');await field.fill(String(value));await field.press('Enter');await expect(field).toHaveValue(String(value));}
function clip(project:ProjectSummary){return project.animations!.find(a=>a.name==='anticipation')!;}
function keys(project:ProjectSummary){return clip(project).tracks.find(t=>t.channel==='translate')!.keys;}
function authoring(native:NativeSession,start:number){return native.calls.slice(start).filter(c=>c.command==='edit_rig');}
async function renderedX(page:Page,id:number){return page.evaluate(id=>{const app=document.querySelector('#app') as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,{renderedBones:BoneView[]}>}}}}};return app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!.renderedBones.find(b=>b.id===id)?.evaluatedWorld?.x;},id);}
async function threeKeys(page:Page,native:NativeSession){
 await page.getByTestId('timeline-key-translate').click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0]);
 await seek(page,15);await xField(page,50);await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,15]);
 await seek(page,30);await xField(page,80);await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,15,30]);
}
function semantic(project:ProjectSummary){const names=new Map(project.bones.map(b=>[b.id,b.name]));return project.animations!.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.map(t=>({bone:names.get(t.bone),channel:t.channel,keys:t.keys.map(({id:_,...key})=>key)}))}));}

test('@native Animate translation keys scrub and interpolate without changing Setup, with history and binary Save Close Open',async({page,native},info)=>{
 const f=await fixture(page,native);await threeKeys(page,native);const authored=(await native.snapshot())!;
 expect(authored.bones).toEqual(f.setup);expect(keys(authored).map(k=>k.values)).toEqual([[0,0],[30,0],[60,0]]);expect(clip(authored).duration).toBe(30);
 await seek(page,7.5);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(35,3);
 // A real ruler mouse scrub to the already marked frame15 shares the same pose.
 const ruler=page.getByTestId('timeline-ruler'),rulerBox=(await ruler.boundingBox())!,first=(await page.getByTestId('timeline-key-'+keys(authored)[0]!.id).boundingBox())!,last=(await page.getByTestId('timeline-key-'+keys(authored)[2]!.id).boundingBox())!;
 await page.mouse.click((first.x+last.x)/2+first.width/2,rulerBox.y+12);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(50,3);
 const beforeCurve=(await native.snapshot())!,start=native.calls.length;await page.getByTestId('timeline-key-'+keys(beforeCurve)[0]!.id).click();await page.getByTestId('timeline-interpolation-stepped').click();
 await expect.poll(async()=>keys((await native.snapshot())!)[0]!.curve).toBe('stepped');expect(authoring(native,start)).toHaveLength(1);expect((await native.snapshot())!.revision).toBe(beforeCurve.revision+1);
 await seek(page,7.5);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(20,3);expect((await native.snapshot())!.bones).toEqual(f.setup);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!)[0]!.curve).toBe('linear');await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(35,3);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!)[0]!.curve).toBe('stepped');
 await native.queueDialog('save','animate-keyframes.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);const saved=(await native.snapshot())!;
 const output=info.outputPath('animation-comparison');await mkdir(output,{recursive:true});await copyFile(saved.path!,join(output,'ui-authored.fbones'));await page.screenshot({path:join(output,'animate-dopesheet.png')});
 const file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await file.locator('summary').click();await file.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();
 await native.queueDialog('open','animate-keyframes.fbones');await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;
 expect(reopened.bones).toEqual(saved.bones);expect(semantic(reopened)).toEqual(semantic(saved));await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip(reopened).id));await expect(page.getByTestId('animation-select')).toHaveValue(String(clip(reopened).id));
 const reopenedBone=reopened.bones.find(b=>b.name===f.setup.find(b=>b.id===f.bone)!.name)!;await page.locator(`[data-tree-kind="bone"][data-tree-id="${reopenedBone.id}"]`).getByRole('treeitem').click();await seek(page,30);await expect.poll(()=>renderedX(page,reopenedBone.id)).toBeCloseTo(80,3);
 await writeFile(join(output,'semantic-result.json'),JSON.stringify({setup:f.setup,authored,saved,reopened},null,2));
});

test('@native an invalid key value blocks Save until Escape cancels its draft without changing the stored animation',async({page,native})=>{
 const f=await fixture(page,native);await page.getByTestId('timeline-key-translate').click();await expect.poll(async()=>keys((await native.snapshot())!).length).toBe(1);
 const before=(await native.snapshot())!,key=keys(before)[0]!;await page.getByTestId('timeline-key-'+key.id).click();const value=page.getByTestId('timeline-key-value-0'),start=native.calls.length;
 await value.fill('');await expect(value).toHaveAttribute('aria-invalid','true');await page.getByRole('button',{name:'Save',exact:true}).click();
 expect(await native.snapshot()).toEqual(before);expect(native.calls.slice(start).some(c=>c.command==='save_project')).toBe(false);expect(authoring(native,start)).toHaveLength(0);
 await value.press('Escape');await expect(value).toHaveValue('0');await expect(value).toHaveAttribute('aria-invalid','false');await native.queueDialog('save','animation-invalid-draft.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);
 const saved=(await native.snapshot())!;expect(saved.bones).toEqual(f.setup);expect(semantic(saved)).toEqual(semantic(before));
});

test('@native Auto Key off leaves only a temporary pose until manually keyed, while playback and repeat never author Setup or keys',async({page,native})=>{
 const f=await fixture(page,native);await page.getByTestId('timeline-key-translate').click();await expect.poll(async()=>keys((await native.snapshot())!).length).toBe(1);
 await page.getByTestId('animate-auto-key').click();await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed','false');await seek(page,10);
 const before=(await native.snapshot())!,start=native.calls.length;await xField(page,55);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(55,3);expect(await native.snapshot()).toEqual(before);expect(authoring(native,start)).toHaveLength(0);
 await seek(page,0);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(20,3);
 await seek(page,10);await xField(page,65);await page.getByTestId('animation-tools').getByRole('button',{name:'Key Translate',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>({frame:k.frame,values:k.values}))).toEqual([{frame:0,values:[0,0]},{frame:10,values:[45,0]}]);
 expect(authoring(native,start)).toHaveLength(1);expect((await native.snapshot())!.bones).toEqual(f.setup);
 await seek(page,0);const stable=(await native.snapshot())!,calls=native.calls.length;await page.getByTestId('timeline-play').click();await expect(page.getByTestId('timeline-play')).toHaveAttribute('aria-label','Pause');
 await expect.poll(async()=>Number(await page.getByTestId('timeline-current').inputValue())).toBeGreaterThan(0);await page.getByTestId('timeline-play').click();await expect(page.getByTestId('timeline-play')).toHaveAttribute('aria-label','Play');
 expect(await native.snapshot()).toEqual(stable);expect(authoring(native,calls)).toHaveLength(0);await page.getByTestId('timeline-repeat').click();await expect(page.getByTestId('timeline-repeat')).toHaveAttribute('aria-pressed','false');
 await page.getByTestId('editor-mode-setup').click();await expect(page.getByTestId('animation-timeline')).toHaveCount(0);expect((await native.snapshot())!.bones).toEqual(f.setup);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(20,3);
});

test('@native compact Dopesheet and Graph retain real multi-key move delete and value editing across a resized bottom dock',async({page,native},info)=>{
 const f=await fixture(page,native);await threeKeys(page,native);const timeline=page.getByTestId('animation-timeline');
 await expect(timeline.locator('.at-property-row')).toHaveCount(4);for(const channel of ['rotate','translate','scale','shear']as const)await expect(page.getByTestId('timeline-key-'+channel)).toBeEnabled();await expect(page.getByTestId('timeline-interpolation-bezier')).toBeDisabled();
 const initial=(await native.snapshot())!,middle=keys(initial)[1]!;await page.getByTestId('timeline-key-'+middle.id).click();const value=page.getByTestId('timeline-key-value-0');await value.fill('45');await value.press('Enter');await expect.poll(async()=>keys((await native.snapshot())!)[1]!.values[0]).toBe(45);
 const beforeMove=(await native.snapshot())!,first=keys(beforeMove)[0]!,last=keys(beforeMove)[2]!;await page.getByTestId('timeline-key-'+first.id).click();await page.getByTestId('timeline-key-'+last.id).click({modifiers:['Control']});
 const a=(await page.getByTestId('timeline-key-'+first.id).boundingBox())!,b=(await page.getByTestId('timeline-key-'+last.id).boundingBox())!,pixels=(b.x-a.x)/(last.frame-first.frame),start=native.calls.length;
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+10*pixels,b.y+b.height/2,{steps:5});await page.mouse.up();
 await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([10,15,40]);expect(authoring(native,start)).toHaveLength(1);
 await page.getByTestId('timeline-delete-keys').click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([15]);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([10,15,40]);
 const box=(await timeline.boundingBox())!;await page.getByTestId('timeline-resize').focus();await page.getByTestId('timeline-resize').press('ArrowUp');await page.getByTestId('timeline-resize').press('ArrowUp');await expect.poll(async()=>(await timeline.boundingBox())!.height).toBeCloseTo(box.height+40,0);
 await page.getByTestId('timeline-tab-graph').click();await expect(timeline.locator('svg[aria-label="Key value curves"] rect')).toHaveCount(6);await expect(timeline.locator('svg[aria-label="Key value curves"] path')).toHaveCount(2);
 const tools=(await page.getByTestId('animation-tools').boundingBox())!,plot=(await timeline.boundingBox())!;expect(tools.y+tools.height).toBeLessThanOrEqual(plot.y+1);expect((await native.snapshot())!.bones).toEqual(f.setup);await page.screenshot({path:info.outputPath('animation-graph-layout.png')});
 await page.getByTestId('timeline-tab-dopesheet').click();await expect(page.getByTestId('timeline-key-'+middle.id)).toBeVisible();
});

test('@native all four bone channels persist and a real Bezier tangent drag commits once while Escape cancels its preview',async({page,native},info)=>{
 const f=await fixture(page,native,true),channels=['rotate','translate','scale','shear']as const;await expect(page.getByTestId('editor-mode-animate')).toHaveAttribute('aria-pressed','true');await expect(page.getByTestId('animation-preview').getByRole('img',{name:'Live animation preview'})).toHaveAttribute('data-ready','true');
 expect((await native.snapshot())!.animationChannels).toEqual([...channels,'translateX','translateY','scaleX','scaleY']);
 for(const channel of channels){await page.getByTestId('timeline-key-'+channel).click();await expect.poll(async()=>clip((await native.snapshot())!).tracks.find(t=>t.channel===channel)?.keys.length).toBe(1);}
 const fps=page.getByTestId('timeline-fps');await fps.fill('24');await fps.press('Enter');await expect.poll(async()=>(await native.snapshot())!.animationFps).toBe(24);expect(clip((await native.snapshot())!).tracks.every(t=>t.keys[0]!.frame===0)).toBe(true);
 await seek(page,24);
 for(const [field,value]of [['x',80],['y',20],['rotation',45],['scaleX',1.5],['shearY',20]]as const){const input=page.getByTestId('animate-bone-'+field);await input.fill(String(value));await input.press('Enter');await expect(input).toHaveValue(String(value));}
 await expect.poll(async()=>clip((await native.snapshot())!).tracks.map(t=>t.keys.length)).toEqual([2,2,2,2]);
 await seek(page,12);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(50,3);
 const initial=(await native.snapshot())!;expect(initial.bones).toEqual(f.setup);const key=keys(initial)[0]!;await page.getByTestId('timeline-key-'+key.id).click();await expect(page.getByTestId('timeline-interpolation-bezier')).toBeEnabled();await page.getByTestId('timeline-interpolation-bezier').click();
 await expect.poll(async()=>keys((await native.snapshot())!)[0]!.curve).toBe('bezier');const before=(await native.snapshot())!,control=keys(before)[0]!.controls!;
 await page.getByTestId('timeline-tab-graph').click();const first=page.getByTestId(`timeline-bezier-${key.id}-0-0`),second=page.getByTestId(`timeline-bezier-${key.id}-0-1`),curve=page.getByTestId(`timeline-curve-${f.bone}:translate-0`);await expect(first).toBeVisible();await expect(page.getByTestId(`timeline-bezier-${key.id}-1-0`)).toBeVisible();await expect(curve).toHaveAttribute('d',/C/);
 const a=(await first.boundingBox())!,b=(await second.boundingBox())!,ppf=(b.x-a.x)/(control[0][2]-control[0][0]),oldPath=await curve.getAttribute('d'),start=native.calls.length;
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2+ppf*2,a.y+a.height/2-10,{steps:5});expect(await native.snapshot()).toEqual(before);expect(authoring(native,start)).toHaveLength(0);await page.mouse.up();
 await expect.poll(async()=>keys((await native.snapshot())!)[0]!.controls![0][0]).toBeCloseTo(control[0][0]+2,3);const changed=(await native.snapshot())!,updated=keys(changed)[0]!.controls!;
 expect(authoring(native,start)).toHaveLength(1);expect(changed.revision).toBe(before.revision+1);expect(changed.bones).toEqual(before.bones);expect(updated[0][1]).toBeGreaterThan(control[0][1]);expect(updated[0].slice(2)).toEqual(control[0].slice(2));expect(updated[1]).toEqual(control[1]);expect(keys(changed)[0]!.values).toEqual(keys(before)[0]!.values);await expect(curve).not.toHaveAttribute('d',oldPath!);
 const cancelledStart=native.calls.length,stablePath=await curve.getAttribute('d'),handle=(await second.boundingBox())!;await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2-ppf*2,handle.y+handle.height/2+10,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();expect(await native.snapshot()).toEqual(changed);expect(authoring(native,cancelledStart)).toHaveLength(0);await expect(curve).toHaveAttribute('d',stablePath!);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!)[0]!.controls).toEqual(control);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!)[0]!.controls).toEqual(updated);
 await native.queueDialog('save','animation-bezier-edit.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);const saved=(await native.snapshot())!;await copyFile(saved.path!,info.outputPath('ui-authored-bezier.fbones'));await page.screenshot({path:info.outputPath('bezier-tangent-graph.png')});
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open','animation-bezier-edit.fbones');await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!;
 expect(reopened.bones).toEqual(saved.bones);expect(semantic(reopened)).toEqual(semantic(saved));expect(reopened.animationFps).toBe(24);expect(clip(reopened).tracks.map(t=>t.channel)).toEqual([...channels]);expect(clip(reopened).tracks.reduce((sum,t)=>sum+t.keys.length,0)).toBe(8);expect(keys(reopened)[0]!.controls).toEqual(updated);
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip(reopened).id));await expect(page.getByTestId('timeline-fps')).toHaveValue('24');await expect(page.getByTestId('animation-preview').getByRole('img',{name:'Live animation preview'})).toHaveAttribute('data-ready','true');await writeFile(info.outputPath('bezier-semantic.json'),JSON.stringify({before,changed,saved,reopened},null,2));
});

test('@native key clipboard shifts absolute Bezier handles and duplicate animation creates independent native key identities',async({page,native})=>{
 const f=await fixture(page,native);await threeKeys(page,native);const source=(await native.snapshot())!,first=keys(source)[0]!,middle=keys(source)[1]!;await page.getByTestId('timeline-key-'+first.id).click();await page.getByTestId('timeline-interpolation-bezier').click();await expect.poll(async()=>keys((await native.snapshot())!)[0]!.curve).toBe('bezier');const before=(await native.snapshot())!,original=keys(before);
 await page.getByTestId('timeline-key-'+first.id).click();await page.getByTestId('timeline-key-'+middle.id).click({modifiers:['Control']});const copyStart=native.calls.length;await page.getByTestId('timeline-copy').click();await expect(page.getByTestId('timeline-paste')).toBeEnabled();expect(await native.snapshot()).toEqual(before);expect(authoring(native,copyStart)).toHaveLength(0);
 await seek(page,60);const pasteStart=native.calls.length;await page.getByTestId('timeline-paste').click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,15,30,60,75]);const pasted=(await native.snapshot())!,newKey=keys(pasted).find(k=>k.frame===60)!;
 expect(authoring(native,pasteStart)).toHaveLength(1);expect(pasted.revision).toBe(before.revision+1);expect(newKey.values).toEqual(original[0]!.values);expect(newKey.curve).toBe('bezier');expect(newKey.controls).toEqual(original[0]!.controls!.map(axis=>[axis[0]+60,axis[1],axis[2]+60,axis[3]]));expect(pasted.bones).toEqual(f.setup);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,15,30]);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,15,30,60,75]);
 const beforeDuplicate=(await native.snapshot())!,duplicateStart=native.calls.length;await page.getByTestId('animation-duplicate').click();await expect.poll(async()=>(await native.snapshot())!.animations!.map(a=>a.name)).toContain('anticipation copy');const after=(await native.snapshot())!,duplicated=after.animations!.find(a=>a.name==='anticipation copy')!;
 expect(authoring(native,duplicateStart)).toHaveLength(1);expect(after.revision).toBe(beforeDuplicate.revision+1);expect(duplicated.id).not.toBe(clip(after).id);await expect(page.getByTestId('animation-select')).toHaveValue(String(duplicated.id));
 const originals=new Set(clip(after).tracks.flatMap(t=>t.keys.map(k=>k.id)));expect(duplicated.tracks.flatMap(t=>t.keys).every(k=>!originals.has(k.id))).toBe(true);
 expect(duplicated.tracks.map(t=>({...t,keys:t.keys.map(({id:_,...key})=>key)}))).toEqual(clip(after).tracks.map(t=>({...t,keys:t.keys.map(({id:_,...key})=>key)})));expect(after.bones).toEqual(f.setup);
});

test('@native manually keying an unchanged frame retains its existing stepped or Bezier interpolation and handles',async({page,native})=>{
 const f=await fixture(page,native);await threeKeys(page,native);const key=keys((await native.snapshot())!)[0]!;await page.getByTestId('timeline-key-'+key.id).click();await page.getByTestId('timeline-interpolation-stepped').click();await expect.poll(async()=>keys((await native.snapshot())!)[0]!.curve).toBe('stepped');await seek(page,0);
 const stepped=(await native.snapshot())!,manual=page.getByTestId('animation-tools').getByRole('button',{name:'Key Translate',exact:true});await manual.click();await expect(manual).toBeEnabled();expect(semantic((await native.snapshot())!)).toEqual(semantic(stepped));expect((await native.snapshot())!.bones).toEqual(f.setup);
 await page.getByTestId('timeline-interpolation-bezier').click();await expect.poll(async()=>keys((await native.snapshot())!)[0]!.curve).toBe('bezier');const bezier=(await native.snapshot())!,controls=keys(bezier)[0]!.controls;
 const keyButton=page.getByTestId('timeline-key-translate');await keyButton.click();await expect(keyButton).toBeEnabled();const unchanged=(await native.snapshot())!;expect(semantic(unchanged)).toEqual(semantic(bezier));expect(keys(unchanged)[0]!.controls).toEqual(controls);expect(unchanged.bones).toEqual(f.setup);
});

test('@native an Animate viewport drag freezes the native keyed pose and authors one key; changing frame cancels the next gesture',async({page,native})=>{
 const f=await fixture(page,native);await page.getByTestId('timeline-key-translate').click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0]);
 await seek(page,30);await xField(page,80);await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,30]);await seek(page,15);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(50,3);
 const before=(await native.snapshot())!,start=native.calls.length,canvas=page.getByTestId('viewport').locator('canvas'),box=(await canvas.boundingBox())!;
 // Own fixture has an identity root, default100% viewport and selected child.
 // Its native interpolated origin is(50,5), distinct from authoredSetup(20,5).
 const origin={x:box.x+box.width/2+50,y:box.y+box.height/2-5};await page.mouse.move(origin.x,origin.y);await page.mouse.down();
 await expect.poll(()=>native.calls.slice(start).filter(c=>c.command==='evaluate_project'&&c.result!==undefined).length).toBe(1);
 const frozenCall=native.calls.slice(start).find(c=>c.command==='evaluate_project')!,frozen=frozenCall.result as EvaluationSnapshot;
 expect(frozenCall.args.expectedRevision).toBe(before.revision);expect(frozenCall.args.request).toMatchObject({animationId:clip(before).id,mode:'none',time:.5});expect(frozen.localBones!.find(b=>b.id===f.bone)!.x).toBeCloseTo(50,4);
 await page.mouse.move(origin.x+25,origin.y-12,{steps:6});expect(await native.snapshot()).toEqual(before);await page.mouse.up();
 await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,15,30]);const after=(await native.snapshot())!,edit=authoring(native,start);
 expect(edit).toHaveLength(1);expect(edit[0]!.args.poseEpoch).toBe(frozen.poseEpoch);expect((edit[0]!.args.edit as {type:string}).type).toBe('setAnimationKeys');expect(after.revision).toBe(before.revision+1);expect(after.bones).toEqual(before.bones);
 const moved=keys(after).find(k=>k.frame===15)!;expect(moved.values[0]).toBeCloseTo(55,3);expect(moved.values[1]).toBeCloseTo(12,3);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(75,3);
 expect(native.calls.slice(start).filter(c=>c.command==='evaluate_project')).toHaveLength(1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,30]);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(50,3);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).map(k=>k.frame)).toEqual([0,15,30]);await expect.poll(()=>renderedX(page,f.bone)).toBeCloseTo(75,3);
 const stable=(await native.snapshot())!,cancelStart=native.calls.length,next={x:box.x+box.width/2+75,y:box.y+box.height/2-17};await page.mouse.move(next.x,next.y);await page.mouse.down();
 await expect.poll(()=>native.calls.slice(cancelStart).filter(c=>c.command==='evaluate_project'&&c.result!==undefined).length).toBe(1);
 // Real keyboard input changes the active pose while this mouse gesture is held.
 await page.keyboard.press('ArrowRight');await expect(page.getByTestId('timeline-current')).toHaveValue('16');await page.mouse.move(next.x+20,next.y,{steps:3});await page.mouse.up();
 expect(authoring(native,cancelStart)).toHaveLength(0);expect(await native.snapshot()).toEqual(stable);expect((await native.snapshot())!.bones).toEqual(f.setup);
});

test('@native reopened animation key Undo and Redo preserve the explicitly selected child and its visible tracks',async({page,native})=>{
 const f=await fixture(page,native);await threeKeys(page,native);await native.queueDialog('save','animation-history-selection.fbones');await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())?.dirty).toBe(false);const saved=(await native.snapshot())!;
 const menu=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await menu.locator('summary').click();await menu.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open','animation-history-selection.fbones');await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();const reopened=(await native.snapshot())!,root=reopened.bones[0]!,child=reopened.bones.find(b=>b.name===saved.bones.find(b=>b.id===f.bone)!.name)!;
 // This precondition distinguishes the real reopen path from fixtures whose
 // native focus was left on the just-created child and masked this UI defect.
 expect(reopened.editedBone).toBe(root.id);expect(child.id).not.toBe(root.id);
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip(reopened).id));const childRow=page.locator(`[data-tree-kind="bone"][data-tree-id="${child.id}"]`).getByRole('treeitem');await childRow.click();await expect(childRow).toHaveAttribute('aria-selected','true');expect((await native.snapshot())!.editedBone).toBe(root.id);
 const middle=keys(reopened).find(k=>k.frame===15)!,visibleKey=page.getByTestId('timeline-key-'+middle.id);await visibleKey.click();const value=page.getByTestId('timeline-key-value-0');await value.fill('37');await value.press('Enter');await expect.poll(async()=>keys((await native.snapshot())!).find(k=>k.id===middle.id)!.values[0]).toBe(37);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).find(k=>k.id===middle.id)!.values[0]).toBe(30);await expect(childRow).toHaveAttribute('aria-selected','true');await expect(visibleKey).toBeVisible();await expect(page.getByTestId('timeline-key-bone-'+child.id+'-translate')).toBeVisible();
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).find(k=>k.id===middle.id)!.values[0]).toBe(37);await expect(childRow).toHaveAttribute('aria-selected','true');await expect(visibleKey).toBeVisible();await expect(page.getByTestId('timeline-key-bone-'+child.id+'-translate')).toBeVisible();
 const rootRow=page.locator(`[data-tree-kind="bone"][data-tree-id="${root.id}"]`).getByRole('treeitem');await rootRow.click();await childRow.click({modifiers:['Shift']});await expect(rootRow).toHaveAttribute('aria-selected','true');await expect(childRow).toHaveAttribute('aria-selected','true');await expect(page.getByTestId('animate-bone-x')).toHaveValue(String(child.x));await visibleKey.click();await value.fill('41');await value.press('Enter');await expect.poll(async()=>keys((await native.snapshot())!).find(k=>k.id===middle.id)!.values[0]).toBe(41);
 for(const [button,expected]of [['Undo',37],['Redo',41]]as const){await page.getByRole('button',{name:button,exact:true}).click();await expect.poll(async()=>keys((await native.snapshot())!).find(k=>k.id===middle.id)!.values[0]).toBe(expected);await expect(rootRow).toHaveAttribute('aria-selected','true');await expect(childRow).toHaveAttribute('aria-selected','true');await expect(page.getByTestId('animate-bone-x')).toHaveValue(String(child.x));await expect(visibleKey).toBeVisible();await expect(page.getByTestId('animation-timeline').locator('.at-property-row')).toHaveCount(8);}
 expect((await native.snapshot())!.bones).toEqual(reopened.bones);expect((await native.snapshot())!.bones).toEqual(f.setup);
});
