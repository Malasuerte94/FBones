import {test,expect,openNativeEditor,type NativeSession} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {ProjectSummary} from '../../src/domain/project';
import type {useWorkspace} from '../../src/stores/workspace';

type StoreElement=Element&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,ReturnType<typeof useWorkspace>>}}}}};
async function live(page:Page){return page.evaluate(()=>{const w=(document.querySelector('#app')as StoreElement).__vue_app__.config.globalProperties.$pinia._s.get('workspace')!;return{frame:w.animationFrame,playing:w.animationPlaying,start:w.animationLoopStart,end:w.animationLoopEnd};});}
async function seek(page:Page,frame:number){const input=page.getByTestId('timeline-current');await input.fill(String(frame));await input.press('Enter');await expect(input).toHaveValue(String(frame));}
async function fixture(page:Page,native:NativeSession){
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own transport interaction',discardChanges:true});
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'create',parent:p.bones[0]!.id,x:20,y:0,rotation:0,length:35}});const bone=p.editedBone!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'createAnimation',name:'Transport keys'}});const animation=p.editedAnimation!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'setAnimationKeys',animation,keys:[{bone,channel:'translate',frame:0,values:[0,0],curve:'bezier',controls:[[10,10,20,20],[10,0,20,0]]},{bone,channel:'translate',frame:30,values:[30,0],curve:'linear'},{bone,channel:'translate',frame:60,values:[60,0],curve:'linear'}]}});
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('animation-select').selectOption(String(animation));await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
 return{before:p,bone,animation,keys:p.animations!.find(a=>a.id===animation)!.tracks[0]!.keys};
}
function edits(native:NativeSession,from:number){return native.calls.slice(from).filter(call=>call.command==='edit_rig');}

test('@native loop fields show accepted playback bounds after invalid edits mode remount and clip changes without authoring',async({page,native})=>{
 await page.clock.install();const f=await fixture(page,native);await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
 const start=page.getByTestId('timeline-loop-start'),end=page.getByTestId('timeline-loop-end'),calls=native.calls.length;
 await start.fill('10');await start.press('Enter');await end.fill('20');await end.press('Enter');await expect.poll(()=>live(page)).toMatchObject({start:10,end:20});
 await end.fill('5');await end.press('Enter');await expect(end).toHaveValue('20');await start.fill('20');await start.press('Enter');await expect(start).toHaveValue('10');
 await end.fill('');await end.press('Enter');await expect.poll(()=>live(page)).toMatchObject({start:10,end:null});await start.fill('61');await start.press('Enter');await expect(start).toHaveValue('10');await end.fill('1000001');await end.press('Enter');await expect(end).toHaveValue('');
 await start.fill('12.5');await start.press('Escape');await expect(start).toHaveValue('10');await end.fill('20');await end.press('Enter');
 await page.getByTestId('editor-mode-setup').click();await page.getByTestId('editor-mode-animate').click();await expect(start).toHaveValue('10');await expect(end).toHaveValue('20');
 await seek(page,0);await page.getByTestId('timeline-play').click();await expect.poll(()=>live(page)).toMatchObject({frame:10,playing:true});await page.clock.runFor(100);const moving=await live(page);expect(moving.frame).toBeGreaterThan(10);expect(moving.frame).toBeLessThan(20);await page.getByTestId('timeline-play').click();
 const other=f.before.animations!.find(a=>a.id!==f.animation)!;await page.getByTestId('animation-select').selectOption(String(other.id));await expect(start).toHaveValue('');await expect(end).toHaveValue('');await expect.poll(()=>live(page)).toMatchObject({start:null,end:null});expect(await native.snapshot()).toEqual(f.before);expect(edits(native,calls)).toHaveLength(0);
});

test('@native Dopesheet key drag and marquee begun during Play pause before the next animation frame and preserve one history action',async({page,native})=>{
 await page.clock.install();const f=await fixture(page,native);await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));await seek(page,15);await page.getByTestId('timeline-play').click();
 const key=page.getByTestId('timeline-key-'+f.keys[1]!.id),box=(await key.boundingBox())!,other=(await page.getByTestId('timeline-key-'+f.keys[2]!.id).boundingBox())!,ppf=(other.x-box.x)/30,calls=native.calls.length;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect.poll(()=>live(page)).toMatchObject({frame:15,playing:false});await page.clock.runFor(128);await page.mouse.move(box.x+box.width/2+ppf*5,box.y+box.height/2,{steps:5});expect(await native.snapshot()).toEqual(f.before);await page.mouse.up();
 await expect.poll(async()=>(await native.snapshot())!.animations!.find(a=>a.id===f.animation)!.tracks[0]!.keys.map(k=>k.frame)).toEqual([0,35,60]);expect(edits(native,calls)).toHaveLength(1);const changed=(await native.snapshot())!;expect(changed.bones).toEqual(f.before.bones);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await native.snapshot())!.animations!.find(a=>a.id===f.animation)!.tracks[0]!.keys.map(k=>k.frame)).toEqual([0,30,60]);
 await seek(page,15);await page.getByTestId('timeline-play').click();const ruler=(await page.getByTestId('timeline-ruler').boundingBox())!,pane=(await page.getByTestId('timeline-scroll').boundingBox())!,beforeBox=(await native.snapshot())!,boxCalls=native.calls.length;
 await page.mouse.move(ruler.x+ppf*10,pane.y+10);await page.mouse.down();await expect.poll(()=>live(page)).toMatchObject({frame:15,playing:false});await page.clock.runFor(128);await page.mouse.move(ruler.x+ppf*40,pane.y+80,{steps:5});await expect(page.getByTestId('timeline-marquee')).toBeVisible();await page.keyboard.press('Escape');await page.mouse.up();await expect(page.getByTestId('timeline-marquee')).toHaveCount(0);expect(await native.snapshot()).toEqual(beforeBox);expect(edits(native,boxCalls)).toHaveLength(0);
});

test('@native Graph tangent drag begun during Play pauses transport and Escape cancels before one completed history action',async({page,native})=>{
 await page.clock.install();const f=await fixture(page,native);await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));await seek(page,15);await page.getByTestId('timeline-key-'+f.keys[0]!.id).click();await page.getByTestId('timeline-tab-graph').click();
 const handle=page.getByTestId(`timeline-bezier-${f.keys[0]!.id}-0-0`);await expect(handle).toBeVisible();const box=(await handle.boundingBox())!,calls=native.calls.length;await page.getByTestId('timeline-play').click();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect.poll(()=>live(page)).toMatchObject({frame:15,playing:false});await page.clock.runFor(128);await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2-8,{steps:5});expect(await native.snapshot()).toEqual(f.before);await page.keyboard.press('Escape');await page.mouse.up();expect(await native.snapshot()).toEqual(f.before);expect(edits(native,calls)).toHaveLength(0);
 // At frame0 both components have value0: the upper Y marker is the real
 // pointer target for their shared key ID. The following drag still edits X.
 await page.getByTestId(`timeline-graph-key-${f.keys[0]!.id}-1`).click();await page.getByTestId('timeline-play').click();const second=(await handle.boundingBox())!;await page.mouse.move(second.x+second.width/2,second.y+second.height/2);await page.mouse.down();await expect.poll(()=>live(page)).toMatchObject({frame:15,playing:false});await page.clock.runFor(128);await page.mouse.move(second.x+second.width/2+20,second.y+second.height/2-8,{steps:5});await page.mouse.up();
 await expect.poll(()=>edits(native,calls).length).toBe(1);const changed=(await native.snapshot())!,controls=changed.animations!.find(a=>a.id===f.animation)!.tracks[0]!.keys[0]!.controls!;expect(controls[0][0]).toBeGreaterThan(10);expect(controls[0][1]).toBeGreaterThan(10);expect(controls[0].slice(2)).toEqual([20,20]);expect(controls[1]).toEqual([10,0,20,0]);expect(changed.bones).toEqual(f.before.bones);
});
