import type {Locator} from '@playwright/test';
import type {DeformKeyInput} from '../../src/domain/animationGeometry';
import type {EvaluationSnapshot, ProjectSummary, RigEdit} from '../../src/domain/project';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Graph Favor stages and commits one key batch while presets edit adjacent handles', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 740});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph breakdowns', discardChanges: true});
  const bone = project.bones[0]!.id;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({type: 'createAnimation', name: 'Breakdown'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'rotate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 20, values: [40, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 60, values: [100, 0], curve: 'linear'},
  ]});
  function keys(snapshot: ProjectSummary) {return snapshot.animations!.find(clip => clip.id === animation)!.tracks[0]!.keys;}
  const middleId = keys(project)[1]!.id;
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.getByTestId('timeline-tab-graph').click();
  const timeline = page.getByTestId('animation-timeline');
  const current = page.getByTestId('timeline-current');
  async function seek(frame: number) {
    await current.fill(String(frame));
    await current.press('Enter');
    await expect(current).toHaveValue(String(frame));
  }
  const middle = page.getByTestId(`timeline-graph-key-${middleId}-0`);
  await middle.press('Enter');
  await seek(20);

  const favor = page.getByTestId('timeline-tool-favor');
  const presets = page.getByTestId('timeline-tool-curve-presets');
  const amount = page.getByTestId('timeline-favor-amount');
  const preview = page.getByTestId('timeline-favor-preview');
  const firstCall = native.calls.length;
  const edits = () => native.calls.slice(firstCall).filter(call => call.command === 'edit_rig').map(call => call.args.edit as RigEdit);
  const before = await native.snapshot();
  await favor.press('Enter');
  await amount.fill('50');
  await expect(preview).toBeVisible();
  expect(await native.snapshot()).toEqual(before);
  await amount.press('Escape');
  await expect(favor).toBeFocused();
  await expect(middle).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveCount(0);
  expect(edits()).toEqual([]);

  const workingRotation = page.getByTestId('animate-bone-rotation');
  await page.getByTestId('timeline-auto-key').click();
  await workingRotation.fill('64');
  await workingRotation.press('Enter');
  await expect(workingRotation).toHaveValue('64');
  await favor.press('Enter');
  await page.getByTestId('timeline-favor-mode').selectOption('blend');
  await amount.fill('50');
  await expect(preview).toBeVisible();
  await amount.press('Enter');
  await expect.poll(async () => keys((await native.snapshot())!)[1]?.values).toEqual([70, 0]);
  await expect(workingRotation).toHaveValue('64');
  expect(edits().map(edit => edit.type)).toEqual(['setAnimationKeys']);
  expect(keys((await native.snapshot())!).map(key => key.id)).toEqual(keys(project).map(key => key.id));

  await presets.press('Space');
  await expect(page.getByTestId('timeline-curve-preset-bounce')).toBeDisabled();
  await page.getByTestId('timeline-curve-preset-flat').press('Enter');
  await expect.poll(async () => keys((await native.snapshot())!).map(key => key.curve)).toEqual(['bezier', 'bezier', 'linear']);
  const flat = keys((await native.snapshot())!);
  expect(flat[0]!.controls![0][3]).toBe(70);
  expect(flat[1]!.controls![0][1]).toBe(70);
  expect(flat[0]!.controls![1]).toEqual([0, 0, 0, 0]);
  expect(edits().map(edit => edit.type)).toEqual(['setAnimationKeys', 'setAnimationKeys']);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => keys((await native.snapshot())!).map(key => key.curve)).toEqual(['linear', 'linear', 'linear']);
  await expect(middle).toHaveAttribute('aria-pressed', 'true');

  await timeline.press('Escape');
  await seek(10);
  await favor.press('Enter');
  await amount.fill('100');
  await expect(preview).toBeVisible();
  await seek(11);
  await expect(preview).toHaveCount(0);
  await expect(amount).toHaveValue('0');
  await expect(page.getByTestId('timeline-favor-apply')).toBeDisabled();
  const slider = page.getByTestId('timeline-favor-slider');
  const bounds = (await slider.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .82, bounds.y + bounds.height / 2, {steps: 4});
  await expect(preview).toBeVisible();
  expect(keys((await native.snapshot())!).map(key => key.frame)).toEqual([0, 20, 60]);
  await page.mouse.up();
  await expect.poll(async () => keys((await native.snapshot())!).map(key => key.frame)).toEqual([0, 11, 20, 60]);
  const after = (await native.snapshot())!;
  expect(keys(after)[1]!.values[0]).toBeGreaterThan(38.5);
  expect(after.bones).toEqual(before!.bones);
  expect(edits().map(edit => edit.type)).toEqual(['setAnimationKeys', 'setAnimationKeys', 'undo', 'setAnimationKeys']);
  await page.screenshot({path: info.outputPath('graph-favor-panel.png')});
});

test('@native Graph frames selected keys and preserves committed stored curves as a read-only comparison', async ({page, native}, info) => {
  await page.setViewportSize({width: 960, height: 740});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph camera', discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const bone = project.bones[0]!.id;
  await edit({type: 'createAnimation', name: 'Wide graph'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'rotate', frame: 0, values: [0, 0], curve: 'bezier', controls: [[35, 10, 150, 80], [0, 0, 0, 0]]},
    {bone, channel: 'rotate', frame: 200, values: [90, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 240, values: [130, 0], curve: 'linear'},
  ]});
  const keys = project.animations!.find(clip => clip.id === animation)!.tracks[0]!.keys;
  await edit({type: 'createAnimation', name: 'Other graph'});
  const other = project.editedAnimation!;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  const animationSelect = page.getByTestId('animation-select');
  await animationSelect.selectOption(String(animation));
  const zoom = page.getByTestId('timeline-zoom');
  const sheetZoom = await zoom.inputValue();
  await page.getByTestId('timeline-tab-graph').click();
  const pane = page.getByTestId('timeline-scroll');
  const frame = page.getByTestId('timeline-tool-frame');
  const auto = page.getByTestId('timeline-tool-auto-fit');
  const store = page.getByTestId('timeline-tool-store');
  const first = page.getByTestId(`timeline-graph-key-${keys[0]!.id}-0`);
  const last = page.getByTestId(`timeline-graph-key-${keys[2]!.id}-0`);
  const live = page.locator('[data-testid^="timeline-curve-"][aria-label^="Rotate"]');
  const saved = page.locator('[data-testid^="timeline-stored-curve-"]');
  const current = page.getByTestId('timeline-current');
  await current.fill('17'); await current.press('Enter');
  const untouched = await native.snapshot();
  const firstCall = native.calls.length;

  async function inPlot(key: Locator) {
    const [plot, body, mark] = await Promise.all([pane.boundingBox(), page.getByTestId('timeline-ruler').boundingBox(), key.boundingBox()]);
    if (!plot || !body || !mark) return false;
    const center = mark.x + mark.width / 2;
    return center >= body.x - .5 && center <= plot.x + plot.width && mark.y >= plot.y && mark.y + mark.height <= plot.y + plot.height;
  }
  await expect.poll(() => inPlot(last)).toBe(false);
  await frame.press('Enter');
  await expect.poll(() => inPlot(first)).toBe(true);
  await expect.poll(() => inPlot(last)).toBe(true);
  const fitted = Number(await zoom.inputValue());
  expect(fitted).toBeLessThan(2);

  await last.press('Enter');
  await expect(last).toHaveAttribute('aria-pressed', 'true');
  await frame.click();
  await expect.poll(() => Number(zoom.inputValue())).not.toBe(fitted);
  await expect.poll(() => inPlot(last)).toBe(true);
  expect(await inPlot(first)).toBe(false);
  const axis = page.getByTestId('timeline-graph-axis').locator('span');
  await expect.poll(async () => Number(await axis.last().innerText()) - Number(await axis.first().innerText())).toBeLessThan(30);
  await expect(current).toHaveValue('17');
  expect(await native.snapshot()).toEqual(untouched);

  await store.press('Space');
  await expect(store).toHaveAttribute('aria-pressed', 'true');
  const originalPath = await live.getAttribute('d');
  await expect(saved).toHaveCount(1);
  await expect(saved).toHaveAttribute('d', originalPath!);
  await expect(page.getByTestId('timeline-tool-swap')).toBeEnabled();
  const keyValue = page.getByTestId('timeline-key-value-0');
  await keyValue.fill('155'); await keyValue.press('Enter');
  await expect.poll(() => live.getAttribute('d')).not.toBe(originalPath);
  await expect(saved).toHaveAttribute('d', originalPath!);
  const authored = await native.snapshot();
  expect(authored?.animations?.find(clip => clip.id === animation)?.tracks[0]?.keys.at(-1)?.values[0]).toBe(155);

  await auto.press('Space');
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => inPlot(first)).toBe(true);
  await expect.poll(() => inPlot(last)).toBe(true);
  const narrowZoom = Number(await zoom.inputValue());
  await page.setViewportSize({width: 1060, height: 740});
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(narrowZoom);
  await expect.poll(() => inPlot(last)).toBe(true);
  await page.screenshot({path: info.outputPath('graph-store-and-auto.png')});

  await page.getByTestId('timeline-tab-dopesheet').click();
  await expect(zoom).toHaveValue(sheetZoom);
  await page.getByTestId('timeline-tab-graph').click();
  await animationSelect.selectOption(String(other));
  await expect(saved).toHaveCount(0);
  await animationSelect.selectOption(String(animation));
  await expect(saved).toHaveCount(1);
  await store.click();
  await expect(store).toHaveAttribute('aria-pressed', 'false');
  await expect(saved).toHaveCount(0);
  const {storedAnimation, ...authoredProject} = authored!;
  expect(storedAnimation?.id).toBe(animation);
  expect(await native.snapshot()).toEqual(authoredProject);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'edit_rig')
    .map(call => (call.args.edit as RigEdit).type)).toEqual(['storeAnimationKeys', 'setAnimationKey', 'clearStoredAnimationKeys']);
});

test('@native Graph Swap restores deleted keys atomically and keeps the outgoing graph after Undo', async ({page, native}, info) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph exchange', discardChanges: true});
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  const bone = project.bones[0]!.id;
  await edit({type: 'createAnimation', name: 'Exchange'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'rotate', frame: 0, values: [0, 0], curve: 'bezier', controls: [[6, 5, 13, 27], [0, 0, 0, 0]]},
    {bone, channel: 'rotate', frame: 20, values: [35, 0], curve: 'linear'},
  ]});
  const original = project.animations!.find(clip => clip.id === animation)!;
  const active = async () => (await native.snapshot())!.animations!.find(clip => clip.id === animation)!;

  await page.setViewportSize({width: 960, height: 740});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.getByTestId('timeline-tab-graph').click();
  const store = page.getByTestId('timeline-tool-store');
  const swap = page.getByTestId('timeline-tool-swap');
  const saved = page.locator('[data-testid^="timeline-stored-curve-"]');
  const current = page.getByTestId('timeline-current');
  await current.fill('12'); await current.press('Enter');
  const before = (await native.snapshot())!;
  await expect(swap).toBeDisabled();
  await store.press('Enter');
  await expect(swap).toBeEnabled();
  expect((await native.snapshot())?.revision).toBe(before.revision);
  await expect(saved).toHaveCount(1);

  for (const [index, key] of original.tracks[0]!.keys.entries()) {
    const mark = page.getByTestId(`timeline-graph-key-${key.id}-0`);
    await mark.press(index === 0 ? 'Enter' : 'Control+Enter');
    await expect(mark).toHaveAttribute('aria-pressed', 'true');
  }
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await active()).tracks).toEqual([]);
  await expect(saved).toHaveCount(1);
  await expect(swap).toBeEnabled();
  const empty = (await native.snapshot())!;
  const autoKey = page.getByTestId('timeline-auto-key');
  if (await autoKey.getAttribute('aria-pressed') === 'true') await autoKey.click();
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const rotation = page.getByTestId('animate-bone-rotation');
  await rotation.fill('17'); await rotation.press('Enter');
  await expect(rotation).toHaveValue('17');
  expect(await native.snapshot()).toEqual(empty);

  await swap.press('Space');
  await expect.poll(active).toEqual(original);
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(empty.revision + 1);
  expect((await native.snapshot())?.storedAnimation?.tracks).toEqual([]);
  await expect(saved).toHaveCount(0);
  await expect(rotation).toHaveValue('17');

  await swap.press('Enter');
  await expect.poll(async () => (await active()).tracks).toEqual([]);
  await expect(saved).toHaveCount(1);
  await expect(current).toHaveValue('12');
  await page.screenshot({path: info.outputPath('graph-outgoing-after-swap.png')});
  await page.keyboard.press('Control+z');
  await expect.poll(active).toEqual(original);
  expect((await native.snapshot())?.storedAnimation).toEqual(original);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async () => (await active()).tracks).toEqual([]);
  await expect(swap).toBeEnabled();
  expect(native.calls.filter(call => call.command === 'edit_rig' && (call.args.edit as RigEdit).type === 'swapStoredAnimationKeys')).toHaveLength(2);
});

test('@native Dopesheet Rotate Delete repairs the joined Graph tangent and preserves Store and Current', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name:'Own Rotate Delete', discardChanges:true});
  const bone = project.bones[0]!.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision:project.revision, edit:change});
  }
  await edit({type:'createAnimation', name:'Rotate splice'});
  const animation = project.editedAnimation!;
  await edit({type:'setAnimationFps', fps:24});
  // Own replay of the retained Linux Rotate Delete input, with a
  // Translate key at the same frame to detect time-wide deletion.
  await edit({type:'setAnimationKeys', animation, keys:[
    {bone, channel:'rotate', frame:0, values:[7,0], curve:'linear'},
    {bone, channel:'rotate', frame:6, values:[29,0], curve:'bezier', controls:[[7.5,20.6,10.5,-4.6],[0,0,0,0]]},
    {bone, channel:'rotate', frame:12, values:[-13,0], curve:'stepped'},
    {bone, channel:'rotate', frame:18, values:[48,0], curve:'bezier', controls:[[19.5,40.6,22.5,18.4],[0,0,0,0]]},
    {bone, channel:'rotate', frame:24, values:[11,0], curve:'linear'},
    {bone, channel:'translate', frame:0, values:[4,3], curve:'linear'},
    {bone, channel:'translate', frame:12, values:[-8,14], curve:'stepped'},
    {bone, channel:'translate', frame:24, values:[5,5], curve:'linear'},
  ]});
  const clip = (snapshot: ProjectSummary) => snapshot.animations!.find(item => item.id === animation)!;
  const before = clip(project);
  const rotate = before.tracks.find(track => track.channel === 'rotate')!;
  const [initial, predecessor, removed, successor, last] = rotate.keys;
  const translate = before.tracks.find(track => track.channel === 'translate')!;
  const neighbor = translate.keys.find(key => key.frame === 12)!;

  await page.setViewportSize({width:1120, height:820});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.getByTestId('timeline-tab-graph').click();
  const store = page.getByTestId('timeline-tool-store');
  await store.press('Enter');
  await expect(store).toHaveAttribute('aria-pressed', 'true');
  const baseline = (await native.snapshot())!;
  expect(baseline.storedAnimation).toEqual(before);
  const start = native.calls.length;
  const authored = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await page.getByTestId('timeline-tab-dopesheet').click();
  const current = page.getByTestId('timeline-current');
  await current.fill('12');
  await current.press('Enter');
  const marker = page.getByTestId(`timeline-key-${removed!.id}`);
  const otherMarker = page.getByTestId(`timeline-key-${neighbor.id}`);
  await marker.click();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(otherMarker).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await native.snapshot())?.revision).toBe(baseline.revision + 1);
  await expect(marker).toHaveCount(0);
  await expect(otherMarker).toBeVisible();
  await expect(current).toHaveValue('12');
  expect(authored().map(call => call.args)).toEqual([
    {expectedRevision:baseline.revision, edit:{type:'deleteAnimationKeys', animation, keys:[removed!.id]}},
  ]);

  const after = (await native.snapshot())!;
  const repaired = clip(after).tracks.find(track => track.channel === 'rotate')!;
  const joined = repaired.keys[1]!;
  const [outTime, outValue, inTime, inValue] = joined.controls![0];
  expect([outTime,outValue]).toEqual(predecessor!.controls![0].slice(0, 2));
  expect(Math.abs(inTime - 14.148648)).toBeLessThan(.00002);
  expect(inValue).toBe(67);
  const approach = (successor!.values[0] - inValue) / (successor!.frame - inTime);
  const departure = (successor!.controls![0][1] - successor!.values[0]) / (successor!.controls![0][0] - successor!.frame);
  expect(approach).toBeCloseTo(departure, 5);
  expect(approach * 24).toBeCloseTo(-118.4, 3);
  const expected = {...before, tracks:before.tracks.map(track => track === rotate
    ? {...track, keys:[initial!, {...predecessor!, controls:[[outTime,outValue,inTime,inValue],predecessor!.controls![1]]}, successor!, last!]}
    : track)};
  expect(clip(after)).toEqual(expected);
  expect(after.storedAnimation).toEqual(baseline.storedAnimation);

  await page.getByTestId('timeline-tab-graph').click();
  await expect(store).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId(`timeline-stored-curve-${bone}:rotate-0`)).toBeVisible();
  await page.getByTestId(`timeline-graph-key-${predecessor!.id}-0`).press('Control+Enter');
  await expect(page.getByTestId(`timeline-bezier-${predecessor!.id}-0-1`)).toHaveAttribute('data-graph-display-value', '67');
  await expect(current).toHaveValue('12');
  const active = async () => clip((await native.snapshot())!);
  await page.getByRole('button', {name:'Undo', exact:true}).click();
  await expect.poll(active).toEqual(before);
  expect((await native.snapshot())?.storedAnimation).toEqual(baseline.storedAnimation);
  await page.getByRole('button', {name:'Redo', exact:true}).click();
  await expect.poll(active).toEqual(expected);
  expect((await native.snapshot())?.storedAnimation).toEqual(baseline.storedAnimation);
  expect(authored().map(call => (call.args.edit as RigEdit).type)).toEqual(['deleteAnimationKeys', 'undo', 'redo']);
  await expect(current).toHaveValue('12');
});

test('@native HUD Key and dirty K split a Rotate Bézier without keying the visible Translate track', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name:'Own ordinary Bézier Key', discardChanges:true});
  const setup = project.bones[0]!, bone = setup.id;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision:project.revision, edit:change});
  }
  await edit({type:'createAnimation', name:'Ordinary Key'});
  const animation = project.editedAnimation!;
  await edit({type:'setAnimationKeys', animation, keys:[
    {bone, channel:'rotate', frame:12, values:[10,0], curve:'bezier', controls:[[14,10,22,50],[0,0,0,0]]},
    {bone, channel:'rotate', frame:24, values:[70,0], curve:'linear'},
    {bone, channel:'translate', frame:12, values:[1,2], curve:'linear'},
    {bone, channel:'translate', frame:24, values:[9,16], curve:'linear'},
  ]});
  const clip = (state: ProjectSummary) => state.animations!.find(item => item.id === animation)!;
  const before = clip(project);
  const rotate = before.tracks.find(track => track.channel === 'rotate')!;
  const [left, right] = rotate.keys;
  await page.setViewportSize({width:1120, height:820});
  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  await page.getByTestId('timeline-tab-graph').click();
  await expect(page.getByTestId(`timeline-curve-${bone}:translate-0`)).toBeVisible();
  const autoKey = page.getByTestId('animate-auto-key');
  if (await autoKey.getAttribute('aria-pressed') === 'true') await autoKey.click();
  await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed', 'false');
  const current = page.getByTestId('timeline-current');
  const tools = page.getByTestId('animation-tools');
  const x = page.getByTestId('animate-bone-x');
  const rotation = page.getByTestId('animate-bone-rotation');
  async function seek(frame: number) {
    await current.fill(String(frame));
    await current.press('Enter');
    await expect(current).toHaveValue(String(frame));
  }
  async function verifyInsertion(trigger: () => Promise<void>, offset: number) {
    const baseline = (await native.snapshot())!, start = native.calls.length;
    expect(clip(baseline)).toEqual(before);
    await trigger();
    await expect.poll(async () => (await native.snapshot())?.revision).toBe(baseline.revision + 1);
    const after = (await native.snapshot())!;
    const newKey = clip(after).tracks.find(track => track.channel === 'rotate')!.keys[1]!;
    expect(newKey.id).not.toBe(left!.id);
    expect(newKey.id).not.toBe(right!.id);
    // t=.5 subdivides the symmetric time cubic. A drafted ordinate moves
    // the two adjacent handles with the new point to keep its tangent.
    const firstControls = [[13,10,15.5,20+offset],[0,0,0,0]];
    const secondControls = [[20.5,45+offset,23,60],[0,0,0,0]];
    const values = [32.5+offset,0];
    expect(native.calls.slice(start).filter(call => call.command === 'edit_rig').map(call => call.args)).toEqual([{
      expectedRevision:baseline.revision,
      edit:{type:'setAnimationKeys', animation, keys:[
        {bone, channel:'rotate', keyId:left!.id, frame:12, values:[10,0], curve:'bezier', controls:firstControls},
        {bone, channel:'rotate', frame:18, values, curve:'bezier', controls:secondControls},
      ]},
    }]);
    expect(clip(after)).toEqual({...before, tracks:before.tracks.map(track => track === rotate
      ? {...track, keys:[{...left!, controls:firstControls},
        {id:newKey.id, frame:18, values, curve:'bezier', controls:secondControls}, right!]}
      : track)});
    expect(after.bones).toEqual(baseline.bones);
    await expect(current).toHaveValue('18');
  }
  async function undo() {
    await page.getByRole('button', {name:'Undo', exact:true}).click();
    await expect.poll(async () => clip((await native.snapshot())!)).toEqual(before);
    await expect(current).toHaveValue('18');
  }

  await seek(18);
  const xDraft = String(setup.x + 57);
  await x.fill(xDraft);
  await x.press('Enter');
  await verifyInsertion(() => tools.getByRole('button', {name:'Key Rotate', exact:true}).click(), 0);
  await expect(x).toHaveValue(xDraft);
  await undo();

  // K intentionally keys dirty channels. Scrubbing clears the earlier X
  // draft before creating the distinct Rotate working value.
  await seek(17);
  await seek(18);
  await expect(x).not.toHaveValue(xDraft);
  await rotation.fill(String(setup.rotation + 37.5));
  await rotation.press('Enter');
  await verifyInsertion(async () => {
    await page.getByTestId('viewport').locator('canvas').focus();
    await page.keyboard.press('k');
  }, 5);
  await expect(rotation).toHaveValue(String(setup.rotation + 37.5));
  await undo();
});

test('@native Graph visibility scopes filter graph marks and stored curves without authoring', async ({page, native}) => {
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph visibility', discardChanges: true});
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  const root = project.bones[0]!.id;
  await edit({type: 'create', parent: root, x: 20, y: 0, rotation: 0, length: 30});
  const child = project.editedBone!;
  await edit({type: 'createAnimation', name: 'Visibility'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: root, channel: 'rotate', frame: 0, values: [15, 0], curve: 'linear'},
    {bone: root, channel: 'rotate', frame: 24, values: [32, 0], curve: 'linear'},
    {bone: root, channel: 'translate', frame: 0, values: [5, 10], curve: 'linear'},
    {bone: root, channel: 'translate', frame: 24, values: [75, 105], curve: 'linear'},
    {bone: child, channel: 'rotate', frame: 0, values: [5, 0], curve: 'linear'},
    {bone: child, channel: 'rotate', frame: 24, values: [12, 0], curve: 'linear'},
  ]});
  const clip = project.animations!.find(item => item.id === animation)!;
  const translation = clip.tracks.find(track => track.bone === root && track.channel === 'translate')!;
  await edit({type: 'createAnimation', name: 'Other'});
  const other = project.editedAnimation!;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  const animationSelect = page.getByTestId('animation-select');
  await animationSelect.selectOption(String(animation));
  const bone = (id: number) => page.locator(`[data-tree-kind="bone"][data-tree-id="${id}"]`).getByRole('treeitem');
  await bone(root).click();
  await bone(child).click({modifiers: ['Control']});
  const graph = page.getByTestId('timeline-tab-graph');
  const sheet = page.getByTestId('timeline-tab-dopesheet');
  await graph.click();
  await page.getByTestId('timeline-tool-store').press('Space');
  const baseline = await native.snapshot();
  const firstCall = native.calls.length;

  const key = translation.keys[0]!.id;
  const graphKey = page.getByTestId(`timeline-graph-key-${key}-0`);
  const graphVisibility = (suffix: string) => page.getByTestId(`timeline-graph-visibility-${suffix}`);
  const property = graphVisibility(`${root}:translate`);
  const rootGroup = graphVisibility(`bone-${root}`);
  const overview = graphVisibility('overview');
  const live = page.locator('[data-testid^="timeline-curve-"]');
  const stored = page.locator('[data-testid^="timeline-stored-curve-"]');

  await expect(live).toHaveCount(4);
  await expect(stored).toHaveCount(4);
  await graphKey.press('Enter');
  await expect(graphKey).toHaveAttribute('aria-pressed', 'true');
  await property.press('Space');
  await expect(property).toHaveAttribute('aria-pressed', 'false');
  await expect(property).toBeFocused();
  await expect(rootGroup).toHaveAttribute('aria-pressed', 'mixed');
  await expect(overview).toHaveAttribute('aria-pressed', 'mixed');
  await expect(graphKey).toHaveCount(0);
  await expect(live).toHaveCount(2);
  await expect(stored).toHaveCount(2);
  await property.press('Delete');
  await expect(page.getByTestId('timeline-delete-keys')).toBeDisabled();
  expect(await native.snapshot()).toEqual(baseline);

  await rootGroup.press('Enter');
  await expect(rootGroup).toHaveAttribute('aria-pressed', 'true');
  await expect(live).toHaveCount(4);
  await rootGroup.press('Enter');
  await expect(live).toHaveCount(1);
  await expect(stored).toHaveCount(1);
  await overview.press('Enter');
  await expect(live).toHaveCount(4);
  await overview.press('Enter');
  await expect(live).toHaveCount(0);
  await expect(stored).toHaveCount(0);
  await expect(page.getByTestId('timeline-tool-frame')).toBeDisabled();

  await sheet.click();
  await expect(overview).toHaveCount(0);
  const sheetKey = page.getByTestId(`timeline-key-${key}`);
  await expect(sheetKey).toBeVisible();
  await graph.click();
  await expect(live).toHaveCount(0);
  await sheet.click();
  await sheetKey.press('Enter');
  await graph.click();
  await expect(graphKey).toHaveAttribute('aria-pressed', 'true');
  await expect(live).toHaveCount(2);

  await animationSelect.selectOption(String(other));
  await animationSelect.selectOption(String(animation));
  await expect(live).toHaveCount(4);
  await expect(stored).toHaveCount(4);
  expect(await native.snapshot()).toEqual(baseline);
  expect(native.calls.slice(firstCall).filter(call => call.command === 'edit_rig')).toEqual([]);
});

test('@native Graph projects Setup values and keeps raw key editing and inverse Bézier drags', async ({page, native}, info) => {
  await page.setViewportSize({width: 1024, height: 820});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph display projection', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({...root, type: 'update', x: 80, y: 7, rotation: 10});
  await edit({type: 'create', parent: root.id, x: 36, y: 18, rotation: 25, length: 32});
  const child = project.bones.find(bone => bone.id === project.editedBone)!;
  const bone = child.id;
  await edit({...child, type: 'update', scaleX: -2, scaleY: 0});
  await edit({type: 'createAnimation', name: 'Projected graph'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone, channel: 'rotate', frame: 0, values: [4, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 12, values: [12, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 24, values: [40, 0], curve: 'linear'},
    {bone, channel: 'translate', frame: 0, values: [8, -6], curve: 'linear'},
    {bone, channel: 'translate', frame: 12, values: [14, 10], curve: 'linear'},
    {bone, channel: 'translate', frame: 24, values: [30, 26], curve: 'linear'},
    {bone, channel: 'scale', frame: 0, values: [1, .75], curve: 'bezier', controls: [[6, 1.125, 18, 1.375], [7, .875, 17, 1.125]]},
    {bone, channel: 'scale', frame: 24, values: [1.5, 1.25], curve: 'linear'},
  ]});
  const track = (snapshot: ProjectSummary, channel: 'rotate' | 'translate' | 'scale') =>
    snapshot.animations!.find(clip => clip.id === animation)!.tracks.find(item => item.bone === bone && item.channel === channel)!;
  const middleRotate = track(project, 'rotate').keys[1]!;
  const firstTranslate = track(project, 'translate').keys[0]!;
  const firstScale = track(project, 'scale').keys[0]!;
  expect(project.bones.find(item => item.id === bone)).toMatchObject({x: 36, y: 18, rotation: 25, scaleX: -2, scaleY: 0});

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
  const graph = page.getByTestId('timeline-tab-graph');
  await graph.click();
  await page.getByTestId('timeline-tool-frame').press('Enter');
  const pane = page.getByTestId('timeline-scroll');
  const guides = page.getByTestId('timeline-graph-value-guides').locator('line');
  const keyMark = (key: number, axis: number) => page.getByTestId(`timeline-graph-key-${key}-${axis}`);
  const curve = (channel: string, axis: number) => page.getByTestId(`timeline-curve-${bone}:${channel}-${axis}`);
  const storedScale = page.getByTestId(`timeline-stored-curve-${bone}:scale-0`);
  const readGuides = () => guides.evaluateAll(lines => lines.map(line => ({
    value: Number(line.getAttribute('data-graph-value')), y: Number(line.getAttribute('y1')),
  })));
  async function plotValues() {
    const values = await readGuides();
    const low = values[0]!, high = values.at(-1)!;
    return (y: number) => low.value + (y - low.y) * (high.value - low.value) / (high.y - low.y);
  }
  async function valuesAlong(path: Locator) {
    const data = await path.getAttribute('d');
    const coordinates = data?.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
    const valueAt = await plotValues();
    return coordinates.filter((_, index) => index % 2 === 1).map(y => Number(valueAt(Number(y)).toFixed(4)));
  }
  async function markValue(mark: Locator) {
    const [y, height] = await Promise.all([mark.getAttribute('y'), mark.getAttribute('height')]);
    return (await plotValues())(Number(y) + Number(height) / 2);
  }
  const authoringSince = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await expect(guides).toHaveCount(5);
  await expect.poll(async () => {
    const values = await readGuides();
    return values[0]!.value < -300 && values.at(-1)!.value > 66;
  }).toBe(true);
  await expect.poll(() => valuesAlong(curve('rotate', 0))).toEqual([29, 37, 65]);
  await expect.poll(() => valuesAlong(curve('translate', 0))).toEqual([44, 50, 66]);
  await expect.poll(() => valuesAlong(curve('translate', 1))).toEqual([12, 28, 44]);
  await expect.poll(() => valuesAlong(curve('scale', 0))).toEqual([-200, -225, -275, -300]);
  await expect.poll(() => valuesAlong(curve('scale', 1))).toEqual([0, 0, 0, 0]);
  await expect.poll(() => markValue(keyMark(firstScale.id, 0))).toBeCloseTo(-200, 3);
  await expect(keyMark(firstScale.id, 0)).toHaveAccessibleName(/[-−]200/);
  await expect.poll(() => markValue(keyMark(firstTranslate.id, 1))).toBeCloseTo(12, 3);

  await page.getByTestId('timeline-tool-store').press('Space');
  await expect.poll(() => valuesAlong(storedScale)).toEqual([-200, -225, -275, -300]);
  const stored = (await native.snapshot())!;
  const beforeFavor = native.calls.length;
  await keyMark(middleRotate.id, 0).press('Enter');
  const favor = page.getByTestId('timeline-tool-favor');
  await favor.press('Enter');
  await page.getByTestId('timeline-favor-mode').selectOption('blend');
  const amount = page.getByTestId('timeline-favor-amount');
  await amount.fill('50');
  const draftCurve = page.getByTestId('timeline-favor-preview').locator('path');
  await expect.poll(() => valuesAlong(draftCurve)).toEqual([29, 51, 65]);
  expect(await native.snapshot()).toEqual(stored);
  expect(authoringSince(beforeFavor)).toHaveLength(0);
  await amount.press('Escape');
  await expect(draftCurve).toHaveCount(0);

  await keyMark(firstScale.id, 0).press('Enter');
  const fieldX = page.getByTestId('timeline-key-value-0');
  const fieldY = page.getByTestId('timeline-key-value-1');
  await expect(fieldX).toHaveValue('1');
  await expect(fieldY).toHaveValue('0.75');
  const handle = page.getByTestId(`timeline-bezier-${firstScale.id}-0-0`);
  await expect(handle).toBeInViewport();
  const projectedAt = await plotValues();
  const initialY = Number(await handle.getAttribute('cy'));
  expect(projectedAt(initialY)).toBeCloseTo(-225, 3);
  const handleBox = (await handle.boundingBox())!, plotBox = (await pane.boundingBox())!;
  const x = handleBox.x + handleBox.width / 2, y = handleBox.y + handleBox.height / 2;
  expect(y - 10).toBeGreaterThan(plotBox.y);
  const beforeDrag = (await native.snapshot())!;
  const dragStart = native.calls.length;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 10, {steps: 4});
  await expect.poll(async () => Number(await handle.getAttribute('cy'))).toBeLessThan(initialY);
  const projectedDrag = projectedAt(Number(await handle.getAttribute('cy')));
  expect(projectedDrag).toBeGreaterThan(-225);
  expect(await native.snapshot()).toEqual(beforeDrag);
  expect(authoringSince(dragStart)).toHaveLength(0);
  await page.mouse.up();

  await expect.poll(async () => (await native.snapshot())!.revision).toBe(beforeDrag.revision + 1);
  const afterDrag = (await native.snapshot())!;
  const scaleBefore = track(beforeDrag, 'scale').keys;
  const scaleAfter = track(afterDrag, 'scale').keys;
  const oldControls = scaleBefore[0]!.controls!, controls = scaleAfter[0]!.controls!;
  expect(controls[0][1]).toBeLessThan(oldControls[0][1]);
  expect(controls[0][1]).toBeCloseTo(Math.fround(projectedDrag / -200), 4);
  expect(controls[0][0]).toBe(oldControls[0][0]);
  expect(controls[0].slice(2)).toEqual(oldControls[0].slice(2));
  expect(controls[1]).toEqual(oldControls[1]);
  expect(scaleAfter.map(({controls: _, ...key}) => key)).toEqual(scaleBefore.map(({controls: _, ...key}) => key));
  expect(afterDrag.bones).toEqual(beforeDrag.bones);
  expect(afterDrag.storedAnimation).toEqual(beforeDrag.storedAnimation);
  expect(authoringSince(dragStart).map(call => (call.args.edit as RigEdit).type)).toEqual(['setAnimationKey']);
  await expect.poll(() => valuesAlong(storedScale)).toEqual([-200, -225, -275, -300]);

  const collapsedHandle = page.getByTestId(`timeline-bezier-${firstScale.id}-1-0`);
  await expect(collapsedHandle).toBeInViewport();
  const collapsedBox = (await collapsedHandle.boundingBox())!;
  const collapsedX = Number(await collapsedHandle.getAttribute('cx'));
  const collapsedY = await collapsedHandle.getAttribute('cy');
  const collapsedStart = native.calls.length;
  await page.mouse.move(collapsedBox.x + collapsedBox.width / 2, collapsedBox.y + collapsedBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(collapsedBox.x + collapsedBox.width / 2 + 12, collapsedBox.y + collapsedBox.height / 2 + 8, {steps: 4});
  await expect.poll(async () => Number(await collapsedHandle.getAttribute('cx'))).toBeGreaterThan(collapsedX);
  await expect(collapsedHandle).toHaveAttribute('cy', collapsedY!);
  expect(await native.snapshot()).toEqual(afterDrag);
  await page.mouse.up();
  await expect.poll(async () => (await native.snapshot())!.revision).toBe(afterDrag.revision + 1);
  const collapsedControls = track((await native.snapshot())!, 'scale').keys[0]!.controls!;
  expect(collapsedControls[0]).toEqual(controls[0]);
  expect(collapsedControls[1][0]).toBeGreaterThan(oldControls[1][0]);
  expect(collapsedControls[1].slice(1)).toEqual(oldControls[1].slice(1));
  expect(authoringSince(collapsedStart)).toHaveLength(1);

  await keyMark(firstTranslate.id, 0).press('Enter');
  await expect(fieldX).toHaveValue('8');
  await expect(fieldY).toHaveValue('-6');
  await fieldX.fill('19');
  await fieldX.press('Enter');
  await expect.poll(async () => track((await native.snapshot())!, 'translate').keys[0]!.values).toEqual([19, -6]);
  await expect.poll(() => markValue(keyMark(firstTranslate.id, 0))).toBeCloseTo(55, 3);
  await page.screenshot({path: info.outputPath('graph-projected-display.png')});
  await page.getByTestId('timeline-tab-dopesheet').click();
  const sheetMark = page.getByTestId(`timeline-key-${firstTranslate.id}`);
  await expect(sheetMark).toHaveAttribute('title', '19, -6');
  await sheetMark.press('Enter');
  await expect(fieldX).toHaveValue('19');
  await expect(fieldY).toHaveValue('-6');
});

test('@native Graph Repeat and pre-zero navigation preserve authored keys', async ({page, native}, info) => {
  await page.setViewportSize({width: 1280, height: 850});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph repeat', discardChanges: true});
  const root = project.bones[0]!;
  const edit = async (change: RigEdit) => {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  };
  await edit({...root, type: 'update', rotation: 25});
  await edit({type: 'createAnimation', name: 'Sparse rotate'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeys', animation, keys: [
    {bone: root.id, channel: 'rotate', frame: 8, values: [12, 0], curve: 'linear'},
    {bone: root.id, channel: 'rotate', frame: 18, values: [38, 0], curve: 'linear'},
    {bone: root.id, channel: 'translate', frame: 30, values: [0, 0], curve: 'linear'},
  ]});
  const clip = project.animations!.find(item => item.id === animation)!;
  expect(clip.duration).toBe(30);
  const lastKey = clip.tracks.find(track => track.channel === 'rotate')!.keys[1]!.id;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.getByTestId('timeline-tab-graph').click();
  const holds = page.getByTestId('timeline-graph-edge-holds');
  const repeats = page.getByTestId('timeline-graph-repeats');
  const repeat = page.getByTestId('timeline-repeat');
  const leadIn = page.getByTestId('timeline-graph-lead-in');
  const ruler = page.getByTestId('timeline-ruler');
  const zero = ruler.locator('[data-timeline-frame="0"]');
  const current = page.getByTestId('timeline-current');
  const curve = page.getByTestId('timeline-curve-'+root.id+':rotate-0');
  const storedCurve = page.getByTestId('timeline-stored-curve-'+root.id+':rotate-0');
  const key = page.getByTestId('timeline-graph-key-'+lastKey+'-0');
  const guides = page.getByTestId('timeline-graph-value-guides').locator('line');

  async function readAxes() {
    const [first, last] = await curve.evaluate(node => {
      const path = node as SVGPathElement;
      return [path.getPointAtLength(0), path.getPointAtLength(path.getTotalLength())].map(({x, y}) => ({x, y}));
    });
    const scale = await guides.evaluateAll(lines => lines.map(line => ({
      value: Number(line.getAttribute('data-graph-value')), y: Number(line.getAttribute('y1')),
    })));
    const low = scale[0]!, high = scale.at(-1)!;
    const pixelsPerFrame = (last!.x - first!.x) / 10;
    const valueAt = (y: number) => low.value + (y - low.y) * (high.value - low.value) / (high.y - low.y);
    return {
      frameX: (frame: number) => first!.x + (frame - 8) * pixelsPerFrame,
      valueAt, pixelsPerFrame, values: [valueAt(first!.y), valueAt(last!.y)],
    };
  }
  async function holdsAt(frame: number, value: number) {
    const {frameX, valueAt, pixelsPerFrame} = await readAxes();
    const points = await holds.locator('path').evaluateAll(paths => paths.flatMap(node => {
      const path = node as SVGPathElement;
      const length = path.getTotalLength();
      return Array.from({length: 129}, (_, index) => {
        const {x, y} = path.getPointAtLength(length * index / 128);
        return {x, y};
      });
    }));
    return points.some(({x, y}) => Math.abs(x - frameX(frame)) < pixelsPerFrame && Math.abs(valueAt(y) - value) < .01);
  }
  const screenZero = () => zero.evaluate(node => {
    const label = node as HTMLElement;
    return label.parentElement!.getBoundingClientRect().left + Number.parseFloat(label.style.left);
  });
  const offsets = () => repeats.locator('use').evaluateAll(copies => copies.map(copy => Number(copy.getAttribute('data-repeat-offset'))));

  const graphContext = page.getByTestId('timeline-graph-context');
  await expect(graphContext).toBeVisible();
  await expect(graphContext).toHaveAttribute('aria-hidden', 'true');
  await expect(guides).toHaveCount(5);
  await expect(repeat).toHaveAttribute('aria-pressed', 'true');
  await expect(leadIn).toHaveAccessibleName('Space before frame zero');
  await expect(leadIn).toHaveAttribute('aria-pressed', 'false');
  const original = await readAxes();
  expect(original.values[0]).toBeCloseTo(37, 3);
  expect(original.values[1]).toBeCloseTo(63, 3);
  await expect.poll(() => holdsAt(4, 25)).toBe(true);
  await expect.poll(() => holdsAt(24, 63)).toBe(true);

  const untouched = (await native.snapshot())!;
  const viewOnlyCalls = native.calls.length;
  const collapsedZero = await screenZero();
  await leadIn.press('Space');
  await expect(leadIn).toBeFocused();
  await expect(leadIn).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(screenZero).toBeGreaterThan(collapsedZero + 24);
  await expect.poll(async () => (await offsets()).map(offset => Math.round(offset / original.pixelsPerFrame)))
    .toEqual(expect.arrayContaining([-30, 30]));
  await expect(repeats.locator('[data-timeline-key-id], [tabindex]')).toHaveCount(0);
  const copy = repeats.locator('use[data-repeat-offset^="-"]').first();
  const appearance = await copy.evaluate(node => {
    let opacity = 1;
    for (let element: Element | null = node; element && element.tagName !== 'svg'; element = element.parentElement) {
      opacity *= Number(getComputedStyle(element).opacity);
    }
    return {opacity, pointerEvents: getComputedStyle(node).pointerEvents};
  });
  expect(appearance.opacity).toBeGreaterThan(0);
  expect(appearance.opacity).toBeLessThan(1);
  expect(appearance.pointerEvents).toBe('none');
  expect(await native.snapshot()).toEqual(untouched);

  const beforeOffsets = await offsets();
  await page.getByTestId('timeline-tool-store').press('Enter');
  await expect(storedCurve).toBeVisible();
  const storedPath = (await storedCurve.getAttribute('d'))!;
  const stored = (await native.snapshot())!;
  expect(stored.revision).toBe(untouched.revision);
  expect(stored.animations).toEqual(untouched.animations);
  expect(stored.storedAnimation?.tracks).toEqual(clip.tracks);
  expect(await offsets()).toEqual(beforeOffsets);

  await repeat.press('Enter');
  await expect(repeat).toHaveAttribute('aria-pressed', 'false');
  await expect(repeats.locator('use')).toHaveCount(0);
  await expect.poll(() => holdsAt(-4, 25)).toBe(true);
  await expect.poll(() => holdsAt(38, 63)).toBe(true);
  await expect(storedCurve).toHaveAttribute('d', storedPath);

  const zeroX = await screenZero();
  const rulerBox = (await ruler.boundingBox())!;
  const rulerY = rulerBox.y + rulerBox.height / 2;
  const keyBox = (await key.boundingBox())!;
  const keyX = keyBox.x + keyBox.width / 2;
  expect(keyX - zeroX).toBeCloseTo(18 * original.pixelsPerFrame, 1);
  await page.mouse.click(keyX, rulerY);
  await expect(current).toHaveValue('18');
  await page.mouse.click(zeroX - 12, rulerY);
  await expect(current).toHaveValue('0');
  await page.mouse.click(keyX, rulerY);
  await expect(current).toHaveValue('18');
  await key.click();
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await expect(current).toHaveValue('18');

  await repeat.press('Enter');
  await expect.poll(offsets).toEqual(beforeOffsets);
  await page.screenshot({path: info.outputPath('graph-repeat-lead-in.png')});
  await leadIn.press('Enter');
  await expect(leadIn).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(screenZero).toBeCloseTo(collapsedZero, 1);
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('timeline-tab-dopesheet').click();
  await expect(leadIn).toHaveCount(0);
  await expect(page.getByTestId('timeline-key-'+lastKey)).toHaveAttribute('aria-pressed', 'true');
  expect(await native.snapshot()).toEqual(stored);
  expect(native.calls.slice(viewOnlyCalls).filter(call => call.command === 'edit_rig')
    .map(call => (call.args.edit as RigEdit).type)).toEqual(['storeAnimationKeys']);
});

test('@native Graph Key Shown splits only the selected live Deform progress curve', async ({page, native}) => {
  await page.setViewportSize({width: 960, height: 740});
  let project = await native.invoke<ProjectSummary>('create_project', {name: 'Own Graph Deform', discardChanges: true});
  const bone = project.bones[0]!;
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await native.queueDialog('folder', 'images');
  project = await native.invoke<ProjectSummary>('choose_images_folder', {expectedRevision: project.revision});
  const targets = [];
  for (const [name, image] of [['Graph mesh', 'red'], ['Other mesh', 'green']] as const) {
    await edit({type: 'createSlot', bone: bone.id, name});
    const slot = project.editedSlot!;
    project = await native.invoke<ProjectSummary>('place_attachments', {expectedRevision: project.revision, slot, keys: [image]});
    const id = project.editedAttachment!;
    await edit({type: 'attachmentEdit', id, edit: {type: 'convertMesh', id: slot}});
    const mesh = project.slots.find(item => item.id === slot)!.attachments!.find(item => item.id === id)!.mesh!;
    const dimension = mesh.vertices.reduce((total, vertex) => total + vertex.positions.length, 0);
    targets.push({id, dimension});
  }
  const [source, other] = targets;
  const endpoint = (dimension: number, scale: number) => Array.from({length: dimension}, (_, lane) => (lane + 1) * scale);
  const keys = targets.flatMap<DeformKeyInput>(({id, dimension}, index) => [
    {attachment: id, frame: 0, offsets: Array(dimension).fill(0), dataPresent: false, curve: 'bezier', controls: [5, .25, 15, .75]},
    {attachment: id, frame: 20, offsets: endpoint(dimension, index ? -2 : 2), dataPresent: true, curve: 'linear'},
  ]);
  await edit({type: 'createAnimation', name: 'Deform progress'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationDeformKeys', animation, keys});
  const clip = (state: ProjectSummary) => state.animations!.find(clip => clip.id === animation)!;
  const track = (state: ProjectSummary, id: number) => clip(state).deformTracks!.find(track => track.attachment === id)!;
  const [first, last] = track(project, source!.id).keys;

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone.id}"]`).getByRole('treeitem').click();
  const timeline = page.getByTestId('animation-timeline');
  const graph = page.getByTestId('timeline-tab-graph');
  const current = page.getByTestId('timeline-current');
  const keyShown = page.getByTestId('timeline-row-key-shown');
  const progress = page.getByTestId('timeline-deform-progress');
  const storedProgress = page.getByTestId('timeline-stored-deform');

  await graph.click();
  await page.getByTestId('timeline-tool-store').click();
  await expect.poll(async () => (await native.snapshot())?.storedAnimation?.deformTracks).toEqual(clip(project).deformTracks);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const edits = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');
  await expect(progress).toHaveCount(0);
  await expect(keyShown).toBeDisabled();
  await timeline.press('Control+Shift+l');
  expect(edits()).toEqual([]);

  await page.getByTestId('timeline-tab-dopesheet').click();
  const firstMark = page.getByTestId(`timeline-key-${first!.id}`);
  await firstMark.press('Enter');
  await expect(firstMark).toHaveAttribute('aria-pressed', 'true');
  await graph.click();
  await current.fill('10');
  await current.press('Enter');
  await expect(current).toHaveValue('10');
  await expect(progress.getByRole('button', {name: 'Deform progress 0', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(storedProgress).toBeVisible();
  await expect(keyShown).toBeEnabled();

  const row = page.getByTestId(`timeline-bone-row-${bone.id}`);
  const sourceRow = page.getByTestId(`timeline-property-row-deform:${source!.id}`);
  await expect(sourceRow).toBeVisible();
  await row.getByRole('button', {name: `Collapse ${bone.name}`, exact: true}).click();
  await expect(sourceRow).toHaveCount(0);
  await expect(keyShown).toBeDisabled();
  await timeline.press('Control+Shift+l');
  expect(edits()).toEqual([]);
  expect(await native.snapshot()).toEqual(before);

  await row.getByRole('button', {name: `Expand ${bone.name}`, exact: true}).click();
  await expect(sourceRow).toBeVisible();
  await expect(progress).toHaveCount(0);
  await expect(keyShown).toBeDisabled();
  await page.getByTestId('timeline-tab-dopesheet').click();
  await firstMark.press('Enter');
  await graph.click();
  await current.fill('10');
  await current.press('Enter');
  await expect(progress.getByRole('button', {name: 'Deform progress 0', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(keyShown).toBeEnabled();
  await timeline.press('Control+Shift+l');
  await expect.poll(async () => track((await native.snapshot())!, source!.id).keys.map(key => key.frame)).toEqual([0, 10, 20]);
  expect(edits()).toHaveLength(1);
  expect(edits()[0]!.args.expectedRevision).toBe(before.revision);
  expect(edits()[0]!.args.poseEpoch).toBeUndefined();
  const leftControls = [2.5, .25, 6.25, .625], rightControls = [13.75, .375, 17.5, .75];
  const midpoint = endpoint(source!.dimension, 1);
  expect(edits()[0]!.args.edit).toMatchObject({
    type: 'setAnimationKeyBatch', animation, boneKeys: [], slotKeys: [],
    deformKeys: [
      {attachment: source!.id, frame: 0, keyId: first!.id, curve: 'bezier', controls: leftControls},
      {attachment: source!.id, frame: 10, offsets: midpoint, curve: 'bezier', controls: rightControls},
    ],
  });
  const after = (await native.snapshot())!;
  expect(after.revision).toBe(before.revision + 1);
  const [left, middle, right] = track(after, source!.id).keys;
  expect(left).toEqual({...first, controls: leftControls});
  expect(middle).toMatchObject({frame: 10, offsets: midpoint, dataPresent: true, curve: 'bezier', controls: rightControls});
  expect(right).toEqual(last);
  expect(track(after, other!.id)).toEqual(track(before, other!.id));
  expect(after.storedAnimation).toEqual(before.storedAnimation);
  expect(after.slots).toEqual(before.slots);
  await expect(current).toHaveValue('10');
  await keyShown.press('Enter');
  expect(await native.snapshot()).toEqual(after);
  expect(edits()).toHaveLength(1);

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => clip((await native.snapshot())!)).toEqual(clip(before));
});

test('@native Graph Key Shown keys a visible aligned Sequence marker with the bone curve', async ({page, native}) => {
  await page.setViewportSize({width: 960, height: 740});
  const path = await native.invoke<string>('e2e_seed_sequence_fixture');
  await native.queueDialog('open', path);
  let project = await native.invoke<ProjectSummary>('open_project', {discardChanges: true});
  const meshSlot = project.slots.find(slot => slot.attachments?.some(attachment => attachment.type === 'mesh'))!;
  const mesh = meshSlot.attachments!.find(attachment => attachment.type === 'mesh')!;
  const region = project.slots.flatMap(slot => slot.attachments ?? []).find(attachment => attachment.type === 'region')!;
  const bone = project.bones.find(bone => bone.id === meshSlot.bone)!;
  expect(mesh.sequence?.count).toBe(4);
  async function edit(change: RigEdit) {
    project = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: project.revision, edit: change});
  }
  await edit({type: 'setAnimationFps', fps: 8});
  await edit({type: 'createAnimation', name: 'Graph Sequence phase'});
  const animation = project.editedAnimation!;
  await edit({type: 'setAnimationKeyBatch', animation, slotKeys: [], boneKeys: [
    {bone: bone.id, channel: 'rotate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone: bone.id, channel: 'rotate', frame: 10, values: [20, 0], curve: 'linear'},
  ], sequenceKeys: [
    {attachment: mesh.id, frame: 0, mode: 2, index: 1, delay: .25},
    {attachment: mesh.id, frame: 10, mode: 0, index: 2, delay: .25},
    {attachment: region.id, frame: 1, mode: 2, index: 0, delay: .25},
    {attachment: region.id, frame: 10, mode: 0, index: 2, delay: .25},
  ]});
  const clip = (state: ProjectSummary) => state.animations!.find(clip => clip.id === animation)!;
  const track = (state: ProjectSummary, id: number) => clip(state).sequenceTracks!.find(track => track.attachment === id)!;
  const [first, last] = track(project, mesh.id).keys;
  async function nativeIndex(state: ProjectSummary, frame: number) {
    const pose = await native.invoke<EvaluationSnapshot>('evaluate_project', {
      expectedRevision: state.revision, request: {mode: 'none', time: frame / 8, animationId: animation},
    });
    return pose.sequencePose!.find(item => item.attachment === mesh.id)!.index;
  }

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone.id}"]`).getByRole('treeitem').click();
  await page.getByTestId('timeline-tab-graph').click();
  const timeline = page.getByTestId('animation-timeline');
  const current = page.getByTestId('timeline-current');
  const keyShown = page.getByTestId('timeline-row-key-shown');
  const sequence = page.getByTestId(`timeline-property-row-sequence:${mesh.id}`);
  const marker = sequence.getByTestId(`timeline-key-${first!.id}`);
  const otherMarker = page.getByTestId(`timeline-key-${track(project, region.id).keys[0]!.id}`);
  const boneRow = page.getByTestId(`timeline-bone-row-${bone.id}`);
  const filter = page.getByTestId('timeline-row-filter');
  async function seek(frame: number) {
    await current.fill(String(frame));
    await current.press('Enter');
    await expect(current).toHaveValue(String(frame));
  }

  await expect(marker).toBeVisible();
  await expect(otherMarker).toHaveCount(0);
  await page.getByTestId('timeline-tool-store').click();
  await expect.poll(async () => (await native.snapshot())?.storedAnimation?.sequenceTracks).toEqual(clip(project).sequenceTracks);
  const before = (await native.snapshot())!;
  const start = native.calls.length;
  const authoring = () => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await seek(5);
  await boneRow.getByRole('button', {name: `Collapse ${bone.name}`, exact: true}).click();
  await expect(marker).toHaveCount(0);
  await expect(keyShown).toBeDisabled();
  await timeline.press('Control+Shift+l');
  await boneRow.getByRole('button', {name: `Expand ${bone.name}`, exact: true}).click();
  await expect(marker).toBeVisible();
  await filter.click();
  await page.getByTestId('timeline-row-filter-translate').click();
  await page.getByTestId('timeline-row-filter-close').click();
  await expect(marker).toHaveCount(0);
  await expect(keyShown).toBeDisabled();
  await timeline.press('Control+Shift+l');
  expect(authoring()).toEqual([]);
  expect(await native.snapshot()).toEqual(before);

  await filter.click();
  await page.getByTestId('timeline-row-filter-reset').click();
  await page.getByTestId('timeline-row-filter-close').click();
  // The sampled image changes from index 3 to index 0 at frame 6 in the source Loop.
  const sampleFrames = [5.99, 6.01];
  const indices = await Promise.all(sampleFrames.map(frame => nativeIndex(before, frame)));
  expect(indices).toEqual([3, 0]);
  await seek(4);
  await expect(marker).toBeVisible();
  await expect(otherMarker).toHaveCount(0);
  await expect(keyShown).toBeEnabled();
  await timeline.press('Control+Shift+l');
  await expect.poll(async () => track((await native.snapshot())!, mesh.id).keys.map(key => key.frame)).toEqual([0, 4, 10]);
  expect(authoring()).toHaveLength(1);
  expect(authoring()[0]!.args.expectedRevision).toBe(before.revision);
  expect(authoring()[0]!.args.poseEpoch).toBeUndefined();
  expect(authoring()[0]!.args.edit).toMatchObject({
    type: 'setAnimationKeyBatch', animation, slotKeys: [],
    boneKeys: [{bone: bone.id, channel: 'rotate', frame: 4, values: [8, 0], curve: 'linear'}],
    sequenceKeys: [{attachment: mesh.id, frame: 4, mode: 2, index: 3, delay: .25}],
  });
  const after = (await native.snapshot())!;
  expect(after.revision).toBe(before.revision + 1);
  const [left, middle, right] = track(after, mesh.id).keys;
  expect(left).toEqual(first);
  expect(middle).toMatchObject({frame: 4, mode: 2, index: 3, delay: .25});
  expect(right).toEqual(last);
  expect(clip(after).tracks[0]!.keys.map(key => [key.frame, key.values[0]])).toEqual([[0, 0], [4, 8], [10, 20]]);
  expect(track(after, region.id)).toEqual(track(before, region.id));
  expect(after.storedAnimation).toEqual(before.storedAnimation);
  expect(await Promise.all(sampleFrames.map(frame => nativeIndex(after, frame)))).toEqual(indices);
  await expect(sequence.getByTestId(`timeline-key-${middle!.id}`)).toBeVisible();
  await expect(current).toHaveValue('4');

  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => clip((await native.snapshot())!)).toEqual(clip(before));
});
