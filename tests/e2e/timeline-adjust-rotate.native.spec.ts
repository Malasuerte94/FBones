import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Dopesheet Adjust rotates selected keys once and cancels gestures without falling through to Auto Key', async ({page, native}, info) => {
  await page.setViewportSize({width:1280,height:840});
  const initial = await native.invoke<ProjectSummary>('create_project', {name:'Own Dopesheet Adjust',discardChanges:true});
  const bone = initial.bones[0]!.id, animation = initial.animations![0]!.id;
  const track = (snapshot:ProjectSummary) => snapshot.animations!.find(clip=>clip.id===animation)!.tracks.find(row=>row.channel==='rotate')!;
  const original = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision:initial.revision,edit:{
    type:'setAnimationKeys',animation,keys:[
      {bone,channel:'rotate',frame:0,values:[0,0],curve:'linear'},
      {bone,channel:'rotate',frame:10,values:[50,0],curve:'stepped'},
      {bone,channel:'rotate',frame:20,values:[85,0],curve:'linear'},
      {bone,channel:'rotate',frame:30,values:[145,0],curve:'linear'},
    ],
  }});
  const source = track(original).keys;
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animate-auto-key').click();
  const adjust = page.getByTestId('timeline-tool-adjust');
  const status = page.getByTestId('timeline-adjust-status');
  const current = page.getByTestId('timeline-current');
  const canvas = page.getByTestId('viewport').locator('canvas');
  const rotateTool = page.getByTestId('animation-tools').getByRole('button',{name:'Rotate',exact:true});
  const key = (index:number) => page.getByTestId(`timeline-key-${source[index]!.id}`);
  async function seek(frame:number){await current.fill(String(frame));await current.press('Enter');await expect(current).toHaveValue(String(frame));}
  async function startRotation(localX:number){
    const box=(await canvas.boundingBox())!;
    const x=box.x+box.width/2+localX, y=box.y+box.height/2;
    await page.mouse.move(x+48,y);
    await page.mouse.down();
    return {x,y};
  }
  await seek(20);
  const xDraft=page.getByTestId('animate-bone-x');
  await xDraft.fill('17');await xDraft.press('Enter');await expect(xDraft).toHaveValue('17');
  await rotateTool.click();
  await key(0).press('Enter');
  await key(1).press('Control+Enter');
  await key(2).press('Control+Enter');
  for(const index of [0,1,2])await expect(key(index)).toHaveAttribute('aria-pressed','true');
  await adjust.press('Space');
  await expect(adjust).toHaveAttribute('aria-pressed','true');
  await expect(status).toHaveText(/Drag with Rotate/);

  const before=(await native.snapshot())!, callStart=native.calls.length;
  const edits=()=>native.calls.slice(callStart).filter(call=>call.command==='edit_rig');
  const pivot=await startRotation(17);
  await expect(status).toHaveText(/Release to apply/);
  await page.mouse.move(pivot.x,pivot.y-48,{steps:10});
  expect(await native.snapshot()).toEqual(before);
  expect(edits()).toHaveLength(0);
  await page.mouse.up();
  await expect.poll(async()=>track((await native.snapshot())!).keys[0]!.values[0]).toBeCloseTo(90,0);
  const after=(await native.snapshot())!;
  const updated=track(after).keys, delta=updated[0]!.values[0];
  for(const index of [0,1,2]){
    expect(updated[index]).toMatchObject({id:source[index]!.id,frame:source[index]!.frame,curve:source[index]!.curve});
    expect(updated[index]!.values[0]-source[index]!.values[0]).toBeCloseTo(delta,3);
  }
  expect(updated[3]).toEqual(source[3]);
  expect(after.bones).toEqual(before.bones);
  expect(edits()).toHaveLength(1);
  const batch=edits()[0]!.args.edit as Extract<RigEdit,{type:'setAnimationKeys'}>;
  expect(batch.type).toBe('setAnimationKeys');
  expect(batch.keys.map(item=>item.keyId)).toEqual(source.slice(0,3).map(item=>item.id));
  expect(edits()[0]!.args.poseEpoch).toBeUndefined();
  await expect(xDraft).toHaveValue('17');
  await expect(current).toHaveValue('20');
  await expect(adjust).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:info.outputPath('dopesheet-adjust-rotate.png')});

  const cancelPivot=await startRotation(17);
  await expect(status).toHaveText(/Release to apply/);
  await page.mouse.move(cancelPivot.x,cancelPivot.y-48,{steps:8});
  await page.keyboard.press('Escape');
  await expect(status).toHaveText(/Drag with Rotate/);
  await page.mouse.up();
  await expect(adjust).toHaveAttribute('aria-pressed','true');
  await expect(rotateTool).toHaveAttribute('aria-pressed','true');
  await expect(key(2)).toHaveAttribute('aria-pressed','true');
  expect(await native.snapshot()).toEqual(after);
  expect(edits()).toHaveLength(1);

  const stalePivot=await startRotation(17);
  await expect(status).toHaveText(/Release to apply/);
  await page.mouse.move(stalePivot.x,stalePivot.y-48,{steps:8});
  await page.keyboard.press('ArrowRight');
  await expect(current).toHaveValue('21');
  await expect(status).toHaveText(/current frame/);
  await page.mouse.up();
  expect(await native.snapshot()).toEqual(after);
  await page.getByTestId('animate-auto-key').click();
  const unmatched=await startRotation(0);
  await page.mouse.move(unmatched.x,unmatched.y-48,{steps:8});
  await page.mouse.up();
  expect(await native.snapshot()).toEqual(after);
  expect(edits()).toHaveLength(1);

  await seek(20);
  await page.getByTestId('animate-auto-key').click();
  const workingRotation=page.getByTestId('animate-bone-rotation');
  await workingRotation.fill('105');await workingRotation.press('Enter');
  await expect(workingRotation).toHaveValue('105');
  await expect(status).toHaveText(/Key or clear the current pose edits/);
  const dirty=await startRotation(0);
  await page.mouse.move(dirty.x,dirty.y-48,{steps:8});
  await page.mouse.up();
  await expect(workingRotation).toHaveValue('105');
  expect(await native.snapshot()).toEqual(after);
  expect(edits()).toHaveLength(1);

  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect.poll(async()=>track((await native.snapshot())!).keys).toEqual(source);
  await page.getByTestId('timeline-tab-graph').click();
  await page.getByTestId('timeline-tab-dopesheet').click();
  await expect(adjust).toHaveAttribute('aria-pressed','false');
});
