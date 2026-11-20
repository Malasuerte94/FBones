import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {ProjectSummary,RigEdit,EvaluationSnapshot,BoneView,TransformProperty} from '../../src/domain/project';
import type {ConstraintAnimationTrack,ConstraintKeyInput,ScalarControls,TransformMixControls} from '../../src/domain/animationConstraints';
import {preserveConstraintKeyBits} from '../../src/domain/constraintTransport';
import {copyFile,cp,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {stringifyNativeResponse} from '../../scripts/e2e/native-response.mjs';
const NAME='Constraint performance';
async function edit(native:NativeSession,edit:RigEdit){return native.invoke<ProjectSummary>('edit_rig',{expectedRevision:(await native.snapshot())!.revision,edit});}
function clip(p:ProjectSummary){return p.animations!.find(a=>a.name===NAME)!;}
function tracks(p:ProjectSummary){return clip(p).constraintTracks??[];}
function animations(p:ProjectSummary){return p.animations!.map(a=>({...a,tracks:a.tracks.map(t=>({...t,keys:t.keys.map(({id:_,...k})=>k)})),constraintTracks:a.constraintTracks?.map(t=>({...t,keys:t.keys.map(({id:_,...k})=>k)})),eventTracks:a.eventTracks?.map(t=>({...t,keys:t.keys.map(({id:_,...k})=>k)}))}));}
function setup(p:ProjectSummary){return{bones:p.bones,slots:p.slots,constraints:p.constraints,events:p.events};}
async function field(page:Page,id:string,value:string|number){const input=page.getByTestId(id);await input.fill(String(value));await input.press('Enter');}
async function seek(page:Page,frame:number){await field(page,'timeline-current',frame);await expect(page.getByTestId('timeline-current')).toHaveValue(String(frame));}
async function choose(page:Page,id:number){await page.getByRole('button',{name:'Tree',exact:true}).click();await page.locator(`[data-tree-kind="constraint"][data-tree-id="${id}"]`).getByRole('treeitem').click();}
async function evaluated(native:NativeSession,frame:number){const p=(await native.snapshot())!;return native.invoke<EvaluationSnapshot>('evaluate_project',{expectedRevision:p.revision,request:{mode:'none',time:frame/Math.fround(p.animationFps??30),animationId:clip(p).id}});}
async function rendered(page:Page,id:number){return page.evaluate(id=>{const app=document.querySelector('#app')as HTMLElement&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,{renderedBones:BoneView[]}>}}}}};return app.__vue_app__.config.globalProperties.$pinia._s.get('workspace')!.renderedBones.find(b=>b.id===id)?.evaluatedWorld;},id);}
async function fixture(page:Page,native:NativeSession,all=false,seed?: (ids:{animation:number;ik:number;transform:number;physics:number})=>Promise<ProjectSummary>){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own keyed constraints and events',discardChanges:true});const root=p.bones[0]!.id,ids:number[]=[];
 for(const b of[{parent:root,x:-80,y:0,length:60},{parent:1,x:60,y:0,length:50},{parent:root,x:-20,y:70,length:10},{parent:root,x:90,y:-30,length:35}]){p=await edit(native,{type:'create',rotation:0,...b,parent:b.parent===1?ids[0]!:b.parent});ids.push(p.editedBone!);}
 const[upper,lower,target,mapped]=ids as[number,number,number,number];
 p=await edit(native,{type:'addConstraint',constraint:{type:'ik',name:'Keyed IK',bones:[upper,lower],target,mix:0,softness:0,stretch:false,compress:false,bendPositive:true}});const ik=p.constraints!.at(-1)!.id;let transform=-1,physics=-1;
 if(all){const channels:TransformProperty[]=['rotate','x','y','scaleX','scaleY','shearY'];p=await edit(native,{type:'addConstraint',constraint:{type:'transform',name:'Keyed Transform',source:target,bones:[mapped],localSource:false,localTarget:false,additive:false,clamp:false,offsets:[0,0,0,0,0,0],mix:[0,0,0,0,0,0],properties:channels.map(property=>({property,offset:0,to:[{property,offset:0,max:1,scale:1}]}))}});transform=p.constraints!.at(-1)!.id;
 p=await edit(native,{type:'addConstraint',constraint:{type:'physics',name:'Keyed Physics',bone:mapped,x:1,y:1,rotate:null,scaleX:0,shearX:0,step:Math.fround(1/60),inertia:.5,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}});physics=p.constraints!.at(-1)!.id;}
 p=await edit(native,{type:'createAnimation',name:NAME});
 if(seed)p=await seed({animation:clip(p).id,ik,transform,physics});
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip(p).id));return{before:p,upper,lower,target,mapped,ik,transform,physics};
}
async function saveReopen(page:Page,native:NativeSession,path:string){await native.queueDialog('save',path);await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.dirty).toBe(false);const saved=(await native.snapshot())!,file=page.locator('header details').filter({has:page.locator('summary').filter({hasText:/^File$/})});await file.locator('summary').click();await file.getByRole('button',{name:/^Close project/}).click();await expect.poll(()=>native.snapshot()).toBeNull();await native.queueDialog('open',path);await page.getByRole('button',{name:'Open project',exact:true}).first().click();await expect.poll(()=>native.snapshot()).not.toBeNull();return{saved,reopened:(await native.snapshot())!};}

test('@native IK animation uses grouped flags and two real Bezier axes with sampled viewport pose Auto Key-off drafts and unchanged Setup',async({page,native},info)=>{
 const f=await fixture(page,native);await choose(page,f.ik);await expect(page.getByTestId('constraint-reference')).toBeDisabled();await expect(page.getByTestId('constraint-members')).toBeDisabled();await page.getByTestId('constraint-animation-key').click();
 await expect.poll(async()=>tracks((await native.snapshot())!).find(t=>t.channel==='ik')?.keys.length).toBe(1);
 await seek(page,24);const start=native.calls.length;await field(page,'constraint-mix',100);await expect.poll(async()=>{const t=tracks((await native.snapshot())!).find(t=>t.channel==='ik');return t?.channel==='ik'?t.keys.at(-1)?.mix:null;}).toBe(1);expect(native.calls.slice(start).filter(c=>c.command==='edit_rig')).toHaveLength(1);await field(page,'constraint-softness',8.25);
 const authored=(await native.snapshot())!,track=tracks(authored).find(t=>t.channel==='ik')!;expect(track.channel).toBe('ik');if(track.channel!=='ik')throw Error('Own IK missing');expect(track.keys.map(k=>k.frame)).toEqual([0,24]);expect(setup(authored)).toEqual(setup(f.before));
 await seek(page,12);await expect.poll(async()=>Number(await page.getByTestId('constraint-mix').inputValue())).toBeCloseTo(50,5);const sampled=await evaluated(native,12),pose=sampled.constraintPose!.find(p=>p.constraint===f.ik);expect(pose?.type).toBe('ik');if(pose?.type!=='ik')throw Error('Native IK pose missing');expect(pose.mix).toBeCloseTo(.5,6);expect(pose.softness).toBeCloseTo(4.125,6);const world=sampled.bones.find(b=>b.id===f.lower)!.world;await expect.poll(async()=>(await rendered(page,f.lower))?.x).toBeCloseTo(world.x,4);await expect.poll(async()=>(await rendered(page,f.lower))?.y).toBeCloseTo(world.y,4);
 await seek(page,36);await page.getByTestId('timeline-auto-key').click();const draftBefore=(await native.snapshot())!;await field(page,'constraint-mix',25);expect(await native.snapshot()).toEqual(draftBefore);await seek(page,24);await expect(page.getByTestId('constraint-mix')).toHaveValue('100');await seek(page,36);await field(page,'constraint-mix',25);await page.getByTestId('constraint-animation-key').click();await expect.poll(async()=>tracks((await native.snapshot())!).find(t=>t.channel==='ik')?.keys.length).toBe(3);await page.getByTestId('timeline-auto-key').click();
 await page.getByTestId('timeline-key-'+track.keys[0]!.id).click();await page.getByTestId('timeline-interpolation-bezier').click();await expect.poll(async()=>{const t=tracks((await native.snapshot())!).find(t=>t.channel==='ik');return t?.channel==='ik'?t.keys[0]!.controls?.length:null;}).toBe(2);await page.getByTestId('timeline-ik-compress').check();await expect.poll(async()=>{const t=tracks((await native.snapshot())!).find(t=>t.channel==='ik');return t?.channel==='ik'?t.keys[0]!.compress:null;}).toBe(true);
 await page.getByTestId('timeline-tab-graph').click();await expect(page.locator('[data-testid^="timeline-curve-"]')).toHaveCount(2);const handle=page.getByTestId(`timeline-bezier-${track.keys[0]!.id}-0-0`),box=(await handle.boundingBox())!,before=(await native.snapshot())!,calls=native.calls.length;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+8,box.y+box.height/2-5,{steps:5});expect(await native.snapshot()).toEqual(before);await page.mouse.up();await expect.poll(()=>native.calls.slice(calls).filter(c=>c.command==='edit_rig').length).toBe(1);
 const changed=(await native.snapshot())!,t=tracks(changed).find(t=>t.channel==='ik');if(t?.channel!=='ik')throw Error('Own IK missing');expect(t.keys[0]!.compress).toBe(true);const{saved,reopened}=await saveReopen(page,native,'ik-animation.fbones');expect(animations(reopened)).toEqual(animations(saved));expect(setup(reopened)).toEqual(setup(f.before));await writeFile(info.outputPath('ik-animation-semantic.json'),stringifyNativeResponse({before:f.before,changed,saved,reopened}));
});

test('@native Transform six-axis mixes and independent Physics properties reset and mixed clipboard retain native samples history and Setup through binary reopen',async({page,native},info)=>{
 const f=await fixture(page,native,true);await page.getByTestId('editor-mode-setup').click();await page.getByTestId('tree-new').click();await page.getByTestId('tree-new-event').click();const dialog=page.getByRole('dialog',{name:'New event',exact:true});await dialog.getByRole('textbox',{name:'Event name',exact:true}).fill('Composite pulse');await dialog.getByRole('button',{name:'Create event',exact:true}).click();await expect(dialog).toHaveCount(0);await expect.poll(async()=>(await native.snapshot())!.events?.length).toBe(1);const event=(await native.snapshot())!.events![0]!;await page.getByTestId('tree-event-'+event.id).click();const definitionPanel=page.getByTestId('event-inspector').filter({has:page.getByTestId('event-name')});await definitionPanel.getByTestId('event-int').fill('9');await definitionPanel.getByTestId('event-int').press('Enter');await definitionPanel.getByTestId('event-float').fill('1.125');await definitionPanel.getByTestId('event-float').press('Enter');await native.queueDialog('folder','audio');await definitionPanel.getByTestId('event-audio-folder').click();await expect.poll(async()=>(await native.snapshot())!.audioLibrary?.sounds.map(s=>s.key)).toEqual(['tone.wav']);await definitionPanel.getByTestId('event-audio').fill('tone.wav');await definitionPanel.getByTestId('event-audio').press('Enter');await definitionPanel.getByTestId('event-volume').fill('60');await definitionPanel.getByTestId('event-volume').press('Enter');await definitionPanel.getByTestId('event-balance').fill('-25');await definitionPanel.getByTestId('event-balance').press('Enter');const compositeBefore=(await native.snapshot())!;await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip(compositeBefore).id));
 await choose(page,f.ik);await page.getByTestId('constraint-animation-key').click();await seek(page,24);await field(page,'constraint-mix',80);await field(page,'constraint-softness',4.25);const ik=tracks((await native.snapshot())!).find(t=>t.channel==='ik');if(ik?.channel!=='ik')throw Error('Own composite IK missing');await page.getByTestId('timeline-key-'+ik.keys[0]!.id).click();await page.getByTestId('timeline-interpolation-bezier').click();
 await choose(page,f.transform);await seek(page,0);await page.getByTestId('constraint-animation-key').click();await seek(page,24);
 for(const[index,value]of[20,75,35,90,45,60].entries())await field(page,'transform-mix-'+index,value);
 let p=(await native.snapshot())!,transform=tracks(p).find(t=>t.channel==='transformMix');if(transform?.channel!=='transformMix')throw Error('Own Transform missing');expect(transform.keys.map(k=>k.frame)).toEqual([0,24]);expect(transform.keys[1]!.values.map(Math.fround)).toEqual([.2,.75,.35,.9,.45,.6].map(Math.fround));
 await seek(page,12);const pose=(await evaluated(native,12)).constraintPose!.find(p=>p.constraint===f.transform);if(pose?.type!=='transform')throw Error('Native Transform pose missing');pose.mixes.forEach((v,i)=>expect(v).toBeCloseTo(Math.fround([.2,.75,.35,.9,.45,.6][i]!)/2,6));
 await page.getByTestId('timeline-key-'+transform.keys[0]!.id).click();await page.getByTestId('timeline-interpolation-bezier').click();await page.getByTestId('timeline-tab-graph').click();await expect(page.locator('[data-testid^="timeline-curve-"]')).toHaveCount(6);await page.getByTestId('timeline-tab-dopesheet').click();
 await choose(page,f.physics);await expect(page.getByTestId('physics-x')).toBeDisabled();await seek(page,0);for(const key of['inertia','strength','damping','mass','wind','gravity','mix'])await page.getByTestId('physics-key-'+key).click();await seek(page,24);
 for(const[key,value]of[['inertia',75],['strength',80],['damping',30],['mass',125],['wind',7.5],['gravity',12.25],['mix',65]]as const)await field(page,'physics-'+key,value);
 await seek(page,12);await page.getByTestId('physics-reset-key').click();p=(await native.snapshot())!;expect(tracks(p).filter(t=>t.channel==='physics')).toHaveLength(7);expect(tracks(p).find(t=>t.channel==='physicsReset')?.keys.map(k=>k.frame)).toEqual([12]);const sampled=(await evaluated(native,12)).constraintPose!.find(p=>p.constraint===f.physics);if(sampled?.type!=='physics')throw Error('Native Physics pose missing');expect(sampled.gravity).toBeCloseTo(6.125,5);expect(sampled.wind).toBeCloseTo(3.75,5);expect(setup(p)).toEqual(setup(compositeBefore));
 await page.getByTestId('tree-event-'+event.id).click();await seek(page,0);await definitionPanel.getByTestId('event-manual-key').click();await seek(page,24);await definitionPanel.getByTestId('event-manual-key').click();await definitionPanel.getByTestId('event-int').fill('-7');await definitionPanel.getByTestId('event-int').press('Enter');await definitionPanel.getByTestId('event-string').fill('Pulse B');await definitionPanel.getByTestId('event-string').press('Enter');p=(await native.snapshot())!;expect(clip(p).eventTracks![0]!.keys.map(k=>[k.frame,k.int])).toEqual([[0,9],[24,-7]]);
 const selectedKeys=tracks(p).flatMap(t=>t.keys),eventKeys=clip(p).eventTracks!.flatMap(t=>t.keys),ids=[...selectedKeys,...eventKeys].map(k=>k.id);for(const[index,id]of ids.entries()){await page.getByTestId('timeline-key-'+id).click({modifiers:index?['Control']:[]});}await page.getByTestId('timeline-copy').click();await seek(page,60);const beforePaste=(await native.snapshot())!,calls=native.calls.length;await page.getByTestId('timeline-paste').click();await expect.poll(async()=>tracks((await native.snapshot())!).reduce((sum,t)=>sum+t.keys.length,0)).toBe(selectedKeys.length*2);await expect.poll(async()=>clip((await native.snapshot())!).eventTracks!.flatMap(t=>t.keys).length).toBe(eventKeys.length*2);expect(native.calls.slice(calls).filter(c=>c.command==='edit_rig')).toHaveLength(1);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>tracks((await native.snapshot())!).reduce((sum,t)=>sum+t.keys.length,0)).toBe(selectedKeys.length);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>tracks((await native.snapshot())!).reduce((sum,t)=>sum+t.keys.length,0)).toBe(selectedKeys.length*2);
 const changed=(await native.snapshot())!,{saved,reopened}=await saveReopen(page,native,'constraint-performance.fbones');expect(animations(reopened)).toEqual(animations(saved));expect(setup(reopened)).toEqual(setup(compositeBefore));await writeFile(info.outputPath('constraint-animation-semantic.json'),stringifyNativeResponse({before:compositeBefore,beforePaste,changed,saved,reopened}));await copyFile(saved.path!,info.outputPath('ui-authored-constraint-performance.fbones'));await cp(join(dirname(saved.path!),'audio'),info.outputPath('audio'),{recursive:true});
});

test('@native Event Tree definitions and discrete key payloads preserve defaults signed zero invalid drafts and native history through Save Close Open',async({page,native},info)=>{
 await fixture(page,native);await page.getByTestId('editor-mode-setup').click();await page.getByTestId('tree-new').click();await page.getByTestId('tree-new-event').click();const dialog=page.getByRole('dialog',{name:'New event',exact:true});await dialog.getByRole('textbox',{name:'Event name',exact:true}).fill('Footstep');await dialog.getByRole('button',{name:'Create event',exact:true}).click();await expect(dialog).toHaveCount(0);await expect.poll(async()=>(await native.snapshot())!.events?.length).toBe(1);
 let p=(await native.snapshot())!,event=p.events![0]!;await page.getByTestId('tree-event-'+event.id).click();await field(page,'event-int',17);await field(page,'event-float','-0');await field(page,'event-string','Setup default');p=(await native.snapshot())!;event=p.events![0]!;expect(event.int).toBe(17);expect(Object.is(event.float,-0)).toBe(true);expect(event.string).toBe('Setup default');const before=p;
 await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(clip(p).id));await page.getByTestId('tree-event-'+event.id).click();await page.getByTestId('event-manual-key').click();await expect.poll(async()=>clip((await native.snapshot())!).eventTracks?.[0]?.keys.length).toBe(1);await seek(page,24);await page.getByTestId('event-manual-key').click();await expect.poll(async()=>clip((await native.snapshot())!).eventTracks?.[0]?.keys.length).toBe(2);
 const panel=page.getByTestId('event-inspector').filter({has:page.getByTestId('event-name')});await panel.getByTestId('event-int').fill('-23');await panel.getByTestId('event-int').press('Enter');await panel.getByTestId('event-string').fill('Animated footstep');await panel.getByTestId('event-string').press('Enter');p=(await native.snapshot())!;let keys=clip(p).eventTracks![0]!.keys;expect(keys.map(k=>k.frame)).toEqual([0,24]);expect(keys[1]!.int).toBe(-23);expect(keys[1]!.string).toBe('Animated footstep');expect(Object.is(keys[1]!.float,-0)).toBe(true);expect(p.events).toEqual(before.events);expect(setup(p)).toEqual(setup(before));
 await page.getByTestId('timeline-key-'+keys[1]!.id).click();await expect(page.getByTestId('timeline-interpolation-bezier')).toBeDisabled();await page.getByTestId('timeline-tab-graph').click();await expect(page.locator('[data-testid^="timeline-curve-"]')).toHaveCount(0);await page.getByTestId('timeline-tab-dopesheet').click();
 const numeric=panel.getByTestId('event-int'),stable=(await native.snapshot())!,start=native.calls.length;await numeric.fill('2147483648');await expect(numeric).toHaveAttribute('aria-invalid','true');await page.getByRole('button',{name:'Save',exact:true}).click();expect(await native.snapshot()).toEqual(stable);expect(native.calls.slice(start).filter(c=>c.command==='save_project')).toHaveLength(0);await numeric.press('Escape');await expect(numeric).toHaveAttribute('aria-invalid','false');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>clip((await native.snapshot())!).eventTracks![0]!.keys[1]!.string).toBe('Setup default');await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(async()=>clip((await native.snapshot())!).eventTracks![0]!.keys[1]!.string).toBe('Animated footstep');const changed=(await native.snapshot())!,{saved,reopened}=await saveReopen(page,native,'event-performance.fbones');expect(animations(reopened)).toEqual(animations(saved));expect(setup(reopened)).toEqual(setup(before));expect(Object.is(clip(reopened).eventTracks![0]!.keys[1]!.float,-0)).toBe(true);await writeFile(info.outputPath('event-animation-semantic.json'),stringifyNativeResponse({before,changed,saved,reopened}));await copyFile(saved.path!,info.outputPath('ui-authored-event-performance.fbones'));
});

test('@native IK Key, Transform Auto Key and Physics Auto Key split interior Beziers with one Undo each', async ({page, native}) => {
  const leftFlags = {stretch: true, compress: false, bendPositive: false};
  const rightFlags = {stretch: false, compress: true, bendPositive: true};
  const f = await fixture(page, native, true, ({animation, ik, transform, physics}) => {
    const keys: ConstraintKeyInput[] = [
      {channel: 'ik', constraint: ik, frame: 0, mix: .125, softness: 2, ...leftFlags,
        curve: 'bezier', controls: [[8, .25, 16, .5], [6, 3, 18, 5]]},
      {channel: 'ik', constraint: ik, frame: 24, mix: .625, softness: 6, ...rightFlags, curve: 'linear'},
      {channel: 'transformMix', constraint: transform, frame: 0, values: [.125, -0, .125, .25, .5, .75],
        curve: 'bezier', controls: transformControls(8, 16, .25, .5)},
      {channel: 'transformMix', constraint: transform, frame: 24, values: [.625, -0, .125, .25, .5, .75], curve: 'linear'},
      {channel: 'physics', constraint: physics, property: 'gravity', frame: 0, value: 2, curve: 'bezier', controls: [8, 3, 16, 5]},
      {channel: 'physics', constraint: physics, property: 'gravity', frame: 24, value: 6, curve: 'linear'},
      {channel: 'physics', constraint: physics, property: 'wind', frame: 6, value: -3, curve: 'stepped'},
      {channel: 'physicsReset', constraint: physics, frame: 8},
    ];
    return edit(native, {type: 'setAnimationConstraintKeys', animation, keys: keys.map(preserveConstraintKeyBits)});
  });
  function transformControls(frame1: number, frame2: number, rotate1: number, rotate2: number): TransformMixControls {
    return [
      [frame1, rotate1, frame2, rotate2], [frame1, -0, frame2, -0],
      [frame1, .125, frame2, .125], [frame1, .25, frame2, .25],
      [frame1, .5, frame2, .5], [frame1, .75, frame2, .75],
    ];
  }

  await seek(page, 12);
  const current = page.getByTestId('timeline-current');
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const redo = page.getByRole('button', {name: 'Redo', exact: true});
  const autoKey = page.getByTestId('timeline-auto-key');
  const inspector = page.getByTestId('constraint-inspector');
  const authored = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  const baseline = (await native.snapshot())!;
  const animation = clip(baseline).id;
  const setupTransform = tracks(baseline).find(track => track.channel === 'transformMix');
  if (setupTransform?.channel !== 'transformMix') throw Error('Own Transform timeline missing');
  expect(setupTransform.keys[0]!.values[1]).toBe(-0);
  expect(setupTransform.keys[0]!.controls?.[1]).toEqual([8, -0, 16, -0]);

  async function splice(channel: 'ik'|'transformMix'|'physics', constraint: number, action: () => Promise<void>,
    leftControls: ScalarControls | ScalarControls[], middle: Record<string, unknown>) {
    const match = (track: ConstraintAnimationTrack) => track.constraint === constraint && track.channel === channel
      && (track.channel !== 'physics' || track.property === 'gravity');
    const before = (await native.snapshot())!;
    const [left, right] = tracks(before).find(match)!.keys;
    const start = native.calls.length;
    await action();
    await expect.poll(async () => tracks((await native.snapshot())!).find(match)!.keys.map(key => key.frame)).toEqual([0, 12, 24]);
    const after = (await native.snapshot())!;
    const [predecessor, inserted, end] = tracks(after).find(match)!.keys;
    const calls = authored(start);
    const property = channel === 'physics' ? {property: 'gravity'} : {};
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args).toMatchObject({expectedRevision: before.revision, edit: {
      type: 'setAnimationConstraintKeys', animation,
      keys: [{channel, constraint, frame: 0, keyId: left!.id, ...property}, {channel, constraint, frame: 12, ...property}],
    }});
    expect(after.revision).toBe(before.revision + 1);
    expect(predecessor).toEqual({...left, controls: leftControls});
    expect(inserted).toMatchObject({frame: 12, curve: 'bezier', ...middle});
    expect(end).toEqual(right);
    expect(tracks(after).filter(track => !match(track))).toEqual(tracks(before).filter(track => !match(track)));
    expect(clip(after).tracks).toEqual(clip(before).tracks);
    expect(setup(after)).toEqual(setup(baseline));

    await undo.click();
    await expect.poll(async () => (await native.snapshot())!.animations).toEqual(before.animations);
    await redo.click();
    await expect.poll(async () => (await native.snapshot())!.animations).toEqual(after.animations);
    await expect(current).toHaveValue('12');
    await expect(inspector).toHaveAttribute('data-constraint-id', String(constraint));
  }

  await choose(page, f.ik);
  await autoKey.click();
  await expect(autoKey).toHaveAttribute('aria-pressed', 'false');
  const bend = inspector.getByRole('checkbox', {name: 'Positive bend', exact: true});
  await expect(bend).not.toBeChecked();
  const draftStart = native.calls.length;
  await bend.check();
  await field(page, 'constraint-mix', 50);
  await expect(bend).toBeChecked();
  await expect(inspector.getByTestId('constraint-mix')).toHaveValue('50');
  expect(await native.snapshot()).toEqual(baseline);
  expect(authored(draftStart)).toHaveLength(0);
  await splice('ik', f.ik, () => inspector.getByTestId('constraint-animation-key').click(),
    [[4, .1875, 8, .40625], [3, 2.5, 7.5, 3.25]],
    {mix: .5, softness: 4, ...leftFlags, bendPositive: true, controls: [[16, .59375, 20, .5625], [16.5, 4.75, 21, 5.5]]});

  await autoKey.click();
  await expect(autoKey).toHaveAttribute('aria-pressed', 'true');
  await choose(page, f.transform);
  await splice('transformMix', f.transform, () => field(page, 'transform-mix-0', 50),
    transformControls(4, 8, .1875, .40625),
    {values: [.5, -0, .125, .25, .5, .75], controls: transformControls(16, 20, .59375, .5625)});

  await choose(page, f.physics);
  await splice('physics', f.physics, () => field(page, 'physics-gravity', 5),
    [4, 2.5, 8, 4.25], {value: 5, controls: [16, 5.75, 20, 5.5]});

  const {saved, reopened} = await saveReopen(page, native, 'constraint-interior-keys.fbones');
  expect(animations(reopened)).toEqual(animations(saved));
  expect(setup(reopened)).toEqual(setup(baseline));
  const transform = tracks(reopened).find(track => track.channel === 'transformMix');
  if (transform?.channel !== 'transformMix') throw Error('Reopened Transform timeline missing');
  expect(transform.keys[1]?.values[1]).toBe(-0);
  expect(transform.keys[1]?.controls?.[1]).toEqual([16, -0, 20, -0]);
});
