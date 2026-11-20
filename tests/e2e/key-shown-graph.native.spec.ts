import type {ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Graph Key Shown splits the visible Bézier and keys a working axis while preserving hidden keys and drafts', async ({page, native}, info) => {
  const path = await native.invoke<string>('e2e_seed_split_fixture');
  await native.queueDialog('open', path);
  const loaded = await native.invoke<ProjectSummary>('open_project', {discardChanges:true});
  const animation = loaded.animations![0]!.id;
  const bone = loaded.animations![0]!.splitModes!.find(row => row.mode === 1)!.bone;
  const setup = loaded.bones.find(item => item.id === bone)!;
  const clip = (state: ProjectSummary) => state.animations!.find(item => item.id === animation)!;
  const track = (state: ProjectSummary, channel: string) => clip(state).tracks.find(item => item.bone === bone && item.channel === channel)!;
  const source = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision:loaded.revision,edit:{
    type:'setAnimationKeys',animation,keys:[
      {bone,channel:'rotate',frame:12,values:[10,0],curve:'bezier',controls:[[14,10,22,50],[0,0,0,0]]},
      {bone,channel:'rotate',frame:24,values:[70,0],curve:'linear'},
    ],
  }});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const timeline = page.getByTestId('animation-timeline');
  await page.getByTestId('timeline-tab-graph').click();
  await page.getByTestId('timeline-tool-store').click();
  await page.getByTestId(`timeline-graph-visibility-${bone}:translateY`).click();
  await expect(page.getByTestId(`timeline-curve-${bone}:translateY-0`)).toHaveCount(0);
  await page.getByTestId('animate-auto-key').click();
  await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed','false');
  const current = page.getByTestId('timeline-current');
  await current.fill('18');
  await current.press('Enter');
  await expect(current).toHaveValue('18');

  const x = page.getByTestId('animate-bone-x'), y = page.getByTestId('animate-bone-y');
  const xDraft = setup.x + 57, yDraft = setup.y - 43;
  await x.fill(String(xDraft));
  await x.press('Enter');
  await y.fill(String(yDraft));
  await y.press('Enter');
  await expect(x).toHaveValue(String(xDraft));
  await expect(y).toHaveValue(String(yDraft));

  const before = (await native.snapshot())!, start = native.calls.length;
  const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  const keyShown = page.getByTestId('timeline-row-key-shown');
  await expect(keyShown).toBeEnabled();
  await expect(keyShown).toHaveAttribute('aria-keyshortcuts','Control+Shift+L');
  await y.press('Control+Shift+l');
  expect(await native.snapshot()).toEqual(before);
  expect(edits()).toEqual([]);
  await timeline.press('Control+Shift+l');
  await expect(page.getByRole('alert').filter({hasText: 'would change the Sequence phase'})).toBeVisible();
  expect(edits()).toEqual([]);
  expect(await native.snapshot()).toEqual(before);

  await page.getByTestId('timeline-row-filter').click();
  await page.getByTestId('timeline-row-filter-rotate').click();
  await page.getByTestId('timeline-row-filter-translate').click({modifiers: ['Control']});
  await page.getByTestId('timeline-row-filter-close').click();
  await expect(page.getByTestId('timeline-curve-'+bone+':rotate-0')).toBeVisible();
  await expect(keyShown).toBeEnabled();
  await timeline.press('Control+Shift+l');
  await expect.poll(async () => track((await native.snapshot())!, 'rotate').keys.find(key => key.frame === 18)?.values[0]).toBe(32.5);

  expect(edits()).toHaveLength(1);
  const command = edits()[0]!.args.edit as Extract<RigEdit,{type:'setAnimationKeyBatch'}>;
  expect(command.type).toBe('setAnimationKeyBatch');
  expect(command.sequenceKeys).toBeUndefined();
  expect(command.boneKeys.filter(key => key.channel === 'translateX')).toEqual([
    expect.objectContaining({bone,frame:18,values:[57,0]}),
  ]);
  expect(command.boneKeys.some(key => key.channel === 'translateY')).toBe(false);
  const after = (await native.snapshot())!;
  const rotate = track(after,'rotate').keys;
  expect(rotate.find(key => key.frame === 12)).toMatchObject({
    id:track(source,'rotate').keys.find(key => key.frame === 12)!.id, values:[10,0], controls:[[13,10,15.5,20],[0,0,0,0]],
  });
  expect(rotate.find(key => key.frame === 18)).toMatchObject({values:[32.5,0],controls:[[20.5,45,23,60],[0,0,0,0]]});
  expect(rotate.find(key => key.frame === 24)).toEqual(track(source,'rotate').keys.find(key => key.frame === 24));
  expect(track(after,'translateY')).toEqual(track(before,'translateY'));
  expect(after.bones).toEqual(before.bones);
  await expect(y).toHaveValue(String(yDraft));
  await expect(current).toHaveValue('18');

  await keyShown.press('Enter');
  expect(await native.snapshot()).toEqual(after);
  expect(edits()).toHaveLength(1);
  await page.screenshot({path:info.outputPath('key-shown-graph.png')});
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect.poll(async () => clip((await native.snapshot())!)).toEqual(clip(before));
});
