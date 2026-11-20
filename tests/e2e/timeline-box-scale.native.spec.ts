import type {Locator, Page} from '@playwright/test';
import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {expect, openNativeEditor, test, type NativeSession} from './fixtures/native-session';

async function fixture(page:Page,native:NativeSession){
  await page.setViewportSize({width:1280,height:850});
  let project=await native.invoke<ProjectSummary>('create_project',{name:'Own timing scale',discardChanges:true});
  const bone=project.bones[0]!.id;
  async function edit(edit:RigEdit){
    project=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:project.revision,edit});
  }
  await edit({type:'createAnimation',name:'Scale cohort'});
  const animation=project.editedAnimation!;
  await edit({type:'setAnimationKeys',animation,keys:[
    ...[10,20,50].map(frame=>({bone,channel:'rotate' as const,frame,values:[frame,0] as [number,number],curve:'linear' as const})),
    ...[30,40].map(frame=>({bone,channel:'translate' as const,frame,values:[frame,0] as [number,number],curve:'linear' as const})),
  ]});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  const current=page.getByTestId('timeline-current');
  await current.fill('5');
  await current.press('Enter');
  const settings=page.getByTestId('timeline-navigation-settings');
  await settings.click();
  await page.getByTestId('timeline-jump-to-key').check();
  await page.getByTestId('timeline-jump-to-frame').check();
  await page.getByTestId('timeline-jump-to-frame').press('Escape');
  return animation;
}

async function rowKeys(native:NativeSession,animation:number,channel:'rotate'|'translate'){
  return (await native.snapshot())!.animations!.find(clip=>clip.id===animation)!.tracks.find(row=>row.channel===channel)!.keys;
}

function mark(page:Page,id:number){return page.getByTestId('timeline-key-'+id);}

async function rectangle(page:Page,first:Locator,last:Locator,{wait=false,add=false}={}){
  const start=(await first.boundingBox())!,end=(await last.boundingBox())!;
  if(add)await page.keyboard.down('Control');
  await page.mouse.move(start.x-10,start.y-2);
  await page.mouse.down();
  await page.mouse.move(end.x+end.width+10,end.y+end.height+2,{steps:5});
  await expect(page.getByTestId('timeline-marquee')).toBeVisible();
  if(wait)await page.waitForTimeout(330);
  await page.mouse.up();
  if(add)await page.keyboard.up('Control');
}

async function edgeGesture(page:Page,edge:Locator,deltaPixels:number){
  const bounds=(await edge.boundingBox())!;
  const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+deltaPixels,y,{steps:5});
}

function expectedTime(frame:number,anchor:number,oldEdge:number,newEdge:number){
  return Math.fround(anchor+(frame-anchor)*(newEdge-anchor)/(oldEdge-anchor));
}

test('@native Dopesheet retains paused and additive boxes, scales one cohort with preview, and cancels without seeking',async({page,native},info)=>{
  const animation=await fixture(page,native),rotate=await rowKeys(native,animation,'rotate'),translate=await rowKeys(native,animation,'translate');
  const selectedBox=page.getByTestId('timeline-selection-box'),current=page.getByTestId('timeline-current');
  const before=(await native.snapshot())!,start=native.calls.length;
  await rectangle(page,mark(page,rotate[0]!.id),mark(page,rotate[1]!.id));
  await expect(selectedBox).toHaveCount(0);
  await rectangle(page,mark(page,rotate[0]!.id),mark(page,rotate[1]!.id),{wait:true});
  await expect(selectedBox).toHaveCount(1);
  await rectangle(page,mark(page,translate[0]!.id),mark(page,translate[1]!.id),{wait:true,add:true});
  await expect(selectedBox).toHaveCount(2);
  for(const key of [...rotate.slice(0,2),...translate])await expect(mark(page,key.id)).toHaveAttribute('aria-pressed','true');
  await expect(current).toHaveValue('5');
  expect(await native.snapshot()).toEqual(before);
  await page.screenshot({path:info.outputPath('dopesheet-retained-boxes.png')});

  const scale=selectedBox.first(),edge=scale.getByTestId('timeline-scale-edge-right');
  const anchor=Number(await scale.getAttribute('data-box-left')),oldEdge=Number(await scale.getAttribute('data-box-right'));
  const zoom=Number(await page.getByTestId('timeline-zoom').inputValue());
  const positionBefore=await mark(page,rotate[1]!.id).evaluate(el=>el.style.left);
  await edgeGesture(page,edge,4*zoom);
  await expect.poll(()=>mark(page,rotate[1]!.id).evaluate(el=>el.style.left)).not.toBe(positionBefore);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(selectedBox).toHaveCount(2);
  await expect.poll(()=>mark(page,rotate[1]!.id).evaluate(el=>el.style.left)).toBe(positionBefore);
  expect(await native.snapshot()).toEqual(before);

  await edgeGesture(page,edge,4*zoom);
  await page.mouse.up();
  await expect.poll(async()=>(await rowKeys(native,animation,'rotate')).map(key=>key.frame)).toEqual([
    expectedTime(10,anchor,oldEdge,oldEdge+4),expectedTime(20,anchor,oldEdge,oldEdge+4),50,
  ]);
  expect((await rowKeys(native,animation,'rotate')).map(key=>key.id)).toEqual(rotate.map(key=>key.id));
  expect(await rowKeys(native,animation,'translate')).toEqual(translate);
  expect(native.calls.slice(start).filter(call=>call.command==='edit_rig')).toHaveLength(1);
  await expect(current).toHaveValue('5');
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect.poll(()=>rowKeys(native,animation,'rotate')).toEqual(rotate);
});

test('@native Dopesheet without a pause retains immediately and crossing an edge reverses linear timing with Shift',async({page,native})=>{
  const animation=await fixture(page,native),rotate=await rowKeys(native,animation,'rotate');
  const settings=page.getByTestId('timeline-navigation-settings');
  await settings.click();
  const pause=page.getByTestId('timeline-box-select-pause');
  await expect(pause).toBeChecked();
  await pause.uncheck();
  await pause.press('Escape');
  await rectangle(page,mark(page,rotate[0]!.id),mark(page,rotate[1]!.id));
  const box=page.getByTestId('timeline-selection-box');
  await expect(box).toHaveCount(1);
  const start=Number(await box.getAttribute('data-box-left')),anchor=Number(await box.getAttribute('data-box-right'));
  const zoom=Number(await page.getByTestId('timeline-zoom').inputValue());
  await page.keyboard.down('Shift');
  await edgeGesture(page,box.getByTestId('timeline-scale-edge-left'),(anchor+6.5-start)*zoom);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(async()=>(await rowKeys(native,animation,'rotate')).map(key=>key.id)).toEqual([rotate[1]!.id,rotate[0]!.id,rotate[2]!.id]);
  const [right,left]=(await rowKeys(native,animation,'rotate')).map(key=>key.frame);
  expect(right).toBeCloseTo(expectedTime(20,anchor,start,anchor+6.5),1);
  expect(left).toBeCloseTo(expectedTime(10,anchor,start,anchor+6.5),1);
  await expect(page.getByTestId('timeline-current')).toHaveValue('5');
  await page.getByTestId('timeline-tab-graph').click();
  await settings.click();
  await expect(pause).toHaveCount(0);
});
