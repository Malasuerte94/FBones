import type {EvaluationSnapshot, ProjectSummary, RigEdit} from '../../src/domain/project';
import {preserveDeformKeyBits} from '../../src/domain/deformTransport';
import {test, expect, openNativeEditor} from './fixtures/native-session';

test('@native Curves edits one Deform progress lane from the terminal key and retains the dense working draft', async ({page, native}) => {
  await page.setViewportSize({width: 1120, height: 820});
  const owned = await native.invoke<string>('e2e_seed_sequence_fixture');
  await native.queueDialog('open', owned);
  let model = await native.invoke<ProjectSummary>('open_project', {discardChanges: true});
  const mesh = model.slots.flatMap(slot => slot.attachments ?? []).find(attachment => attachment.mesh)!;
  const bone = model.slots.find(slot => slot.id === mesh.slot)!.bone;
  const offsetCount = mesh.mesh!.vertices.reduce((count, vertex) => count + vertex.positions.length, 0);
  expect(offsetCount).toBe(8);
  const offsets = [-0, 1, 2, 3, -4, 5, 6, -7];
  async function edit(change: RigEdit) {
    model = await native.invoke<ProjectSummary>('edit_rig', {expectedRevision: model.revision, edit: change});
  }
  await edit({type: 'createAnimation', name: 'Own Deform progress'});
  const animation = model.editedAnimation!;
  await edit({type: 'setAnimationKeyBatch', animation, boneKeys: [
    {bone, channel: 'rotate', frame: 0, values: [0, 0], curve: 'linear'},
    {bone, channel: 'rotate', frame: 24, values: [20, 0], curve: 'linear'},
  ], slotKeys: [], deformKeys: [
    preserveDeformKeyBits({attachment: mesh.id, frame: 0, offsets, dataPresent: true, curve: 'bezier', controls: [8, .25, 16, -0]}),
    preserveDeformKeyBits({attachment: mesh.id, frame: 24, offsets, dataPresent: true, curve: 'linear'}),
  ]});
  const clip = (snapshot: ProjectSummary) => snapshot.animations!.find(item => item.id === animation)!;
  const deform = (snapshot: ProjectSummary) => clip(snapshot).deformTracks!.find(track => track.attachment === mesh.id)!;
  const authored = (start: number) => native.calls.slice(start).filter(call => call.command === 'edit_rig');

  await openNativeEditor(page);
  await page.getByTestId('editor-mode-animate').click();
  await page.getByTestId('animation-select').selectOption(String(animation));
  await expect(page.getByTestId('timeline-tab-dopesheet')).toHaveClass(/active/);
  const row = page.locator(`[data-tree-kind="attachment"][data-tree-id="${mesh.id}"]`).getByRole('treeitem');
  await row.click();
  await page.getByRole('group', {name: 'Editing mode', exact: true}).getByRole('button', {name: 'Meshes', exact: true}).click();
  const views = page.getByText('Views', {exact: true});
  await views.click();
  await page.getByTestId('view-toggle-curves').check();
  await views.click();
  const panel = page.getByTestId('curves-panel');
  const span = panel.getByTestId('curves-segment-span');
  const handle = panel.getByTestId('curves-handle-0');
  const path = panel.getByTestId('curves-path');
  const current = page.getByTestId('timeline-current');
  const vertexX = page.getByRole('spinbutton', {name: 'Vertex X', exact: true});
  const vertexY = page.getByRole('spinbutton', {name: 'Vertex Y', exact: true});
  await current.fill('0');
  await current.press('Enter');
  await expect(current).toHaveValue('0');
  const baseline = (await native.snapshot())!;
  const [first, terminal] = deform(baseline).keys;
  expect(first!.offsets).toEqual(terminal!.offsets);
  expect(first!.offsets[0]).toBe(-0);
  expect(first!.controls?.[3]).toBe(-0);

  const sample = await native.invoke<EvaluationSnapshot>('evaluate_project', {expectedRevision: baseline.revision,
    request: {animationId: animation, mode: 'none', time: 0, deformTargets: [mesh.id]},
  });
  const corner = sample.deformPose!.find(pose => pose.attachment === mesh.id)!.worldVertices![0]!;
  const canvas = (await page.getByTestId('viewport').locator('canvas').boundingBox())!;
  await page.mouse.move(canvas.x + canvas.width / 2 + corner[0], canvas.y + canvas.height / 2 - corner[1]);
  await page.mouse.down();
  await expect(vertexX).toBeEnabled();
  await expect.poll(async () => Number(await vertexX.inputValue())).toBeCloseTo(corner[0], 3);
  await page.mouse.up();
  await page.getByTestId('timeline-auto-key').click();
  await expect(page.getByTestId('timeline-auto-key')).toHaveAttribute('aria-pressed', 'false');
  const draftX = Number(await vertexX.inputValue()) + 6;
  const draftY = await vertexY.inputValue();
  const draftStart = native.calls.length;
  await vertexX.fill(String(draftX));
  await vertexX.press('Enter');
  await draftRetained();
  expect(authored(draftStart)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(baseline);

  const terminalMarker = page.getByTestId(`timeline-key-${terminal!.id}`);
  await terminalMarker.press('Enter');
  await expect(terminalMarker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId(`timeline-key-${first!.id}`)).toHaveAttribute('aria-pressed', 'false');
  await expect(span).toHaveText(/Deform\s*·\s*0–24/);
  await expect(panel.getByTestId('curves-component-select')).toHaveCount(0);
  await expect(panel.getByTestId('curves-component-0')).toHaveCount(0);
  await expect(panel.getByTestId('curves-equal')).toHaveCount(0);
  await expect(path).toHaveAttribute('d', /C/);
  await expect(handle).toBeVisible();
  await expect.poll(async () => Number(await handle.getAttribute('data-curve-progress'))).toBeCloseTo(.25, 6);
  await draftRetained();

  const handleStart = native.calls.length;
  await handle.press('ArrowUp');
  await expect.poll(async () => deform((await native.snapshot())!).keys[0]!.controls?.[1]).toBeCloseTo(.26, 6);
  const changed = (await native.snapshot())!;
  const nextControls = deform(changed).keys[0]!.controls!;
  expect(changed.revision).toBe(baseline.revision + 1);
  expect(authored(handleStart)).toHaveLength(1);
  expect(authored(handleStart)[0]!.args).toMatchObject({expectedRevision: baseline.revision, edit: {
    type: 'setAnimationDeformKeys', animation, keys: [{attachment: mesh.id, frame: 0, keyId: first!.id,
      controlsBits: [0x41000000, bits(.26), 0x41800000, 0x80000000], offsetBits: offsets.map(bits)}],
  }});
  expect(deform(changed).keys).toEqual([{...first, controls: [8, nextControls[1], 16, -0]}, terminal]);
  expect(changed.slots).toEqual(baseline.slots);
  expect(changed.bones).toEqual(baseline.bones);
  expect(clip(changed).tracks).toEqual(clip(baseline).tracks);
  await draftRetained();

  const shapeStart = native.calls.length;
  await panel.getByTestId('curves-interpolation-stepped').click();
  await expect.poll(async () => deform((await native.snapshot())!).keys[0]!.curve).toBe('stepped');
  const stepped = (await native.snapshot())!;
  expect(stepped.revision).toBe(changed.revision + 1);
  expect(authored(shapeStart)).toHaveLength(1);
  expect(authored(shapeStart)[0]!.args).toMatchObject({expectedRevision: changed.revision, edit: {
    type: 'setAnimationKeyBatch', animation, boneKeys: [], deformKeys: [{attachment: mesh.id, frame: 0, keyId: first!.id, curve: 'stepped'}],
  }});
  expect(deform(stepped).keys[0]).toMatchObject({id: first!.id, frame: 0, offsets, dataPresent: true, curve: 'stepped'});
  expect(deform(stepped).keys[0]!.controls).toBeFalsy();
  expect(deform(stepped).keys[1]).toEqual(terminal);
  await expect(path).toHaveAttribute('d', /H.*V/);
  await draftRetained();

  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(changed.animations);
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(baseline.animations);
  await expect(current).toHaveValue('0');
  await expect(row).toHaveAttribute('aria-selected', 'true');

  const graphStart = native.calls.length;
  const beforeGraph = (await native.snapshot())!;
  await page.getByTestId(`timeline-key-${first!.id}`).press('Enter');
  await page.getByTestId('timeline-tab-graph').click();
  await page.getByTestId('timeline-deform-progress').locator(`[data-timeline-key-id="${terminal!.id}"]`).press('Enter');
  await expect(span).toHaveText(/Deform\s*·\s*0–24/);
  await expect(handle).toBeVisible();
  await page.getByTestId('timeline-row-filter').click();
  await page.getByTestId('timeline-row-filter-rotate').click();
  await page.getByTestId('timeline-row-filter-close').click();
  await expect(panel.getByTestId('curves-empty')).toBeVisible();
  await expect(handle).toHaveCount(0);
  await expect(current).toHaveValue('0');
  expect(authored(graphStart)).toHaveLength(0);
  expect(await native.snapshot()).toEqual(beforeGraph);

  await page.getByTestId('timeline-row-filter').click();
  await page.getByTestId('timeline-row-filter-reset').click();
  await page.getByTestId('timeline-row-filter-close').click();
  await page.getByTestId('timeline-tab-dopesheet').click();
  await page.getByTestId(`timeline-key-${first!.id}`).press('Enter');
  await page.getByTestId('timeline-tab-graph').click();
  const inlineStart = native.calls.length;
  await vertexX.fill(String(draftX));
  await vertexX.press('Enter');
  await draftRetained();
  expect(authored(inlineStart)).toHaveLength(0);
  const progressInput = page.getByTestId('timeline-deform-control-1');
  await progressInput.fill('.375');
  await progressInput.press('Enter');
  await expect.poll(async () => deform((await native.snapshot())!).keys[0]!.controls).toEqual([8, .375, 16, -0]);
  expect(authored(inlineStart)).toHaveLength(1);
  await draftRetained();
  await undo.click();
  await expect.poll(async () => (await native.snapshot())!.animations).toEqual(beforeGraph.animations);

  async function draftRetained() {
    await expect(current).toHaveValue('0');
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect.poll(async () => Number(await vertexX.inputValue())).toBeCloseTo(draftX, 3);
    await expect(vertexY).toHaveValue(draftY);
  }

  function bits(value: number) {
    const word = new DataView(new ArrayBuffer(4));
    word.setFloat32(0, value);
    return word.getUint32(0);
  }
});
