import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { toolEditMode } from '../src/domain/toolMode.ts';
import { draftSummary } from '../src/domain/project.ts';

globalThis.document = { title: '' };
const nativeCalls = [];
globalThis.__TAURI__ = {
  core: { invoke: async (...args) => { nativeCalls.push(args); throw Error('Tool selection must not edit native data'); } },
  window: { getCurrentWindow: () => ({ setTitle: async () => {} }) },
};
const { useWorkspace } = await import('../src/stores/workspace.ts');

test('whole-attachment tools leave clipping vertex mode with inactive selection and activation intact', () => {
  setActivePinia(createPinia());
  const w = useWorkspace();
  const clip = { id: 0, slot: 7, name: 'inactive mask', type: 'clipping', region: null, mesh: null,
    imageAvailable: false, clipping: { weighted: false, bones: [0], vertices: [[0, 0], [40, 0], [0, 40]].map(positions => ({ weights: [1], positions })),
      edges: [0, 1, 1, 2, 2, 0], endSlot: 7, color: 0xce3a8bff, convex: false, inverse: false } };
  const image = { id: 1, slot: 7, name: 'active image', type: 'region', clipping: null, mesh: null, imageAvailable: true,
    region: { name: 'active image', image: 'image', x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1, width: 32, height: 32 } };
  w.project = { ...draftSummary('Tool transitions'), documentId: 42, revision: 5, sceneEditing: true, dirty: false,
    slots: [{ id: 7, bone: 0, name: 'slot', visible: true, blend: 'normal', imageAvailable: true,
      region: image.region, mesh: null, activeAttachmentId: 1, attachments: [clip, image] }] };
  for (const selected of [[0], [0, 1]]) {
    w.selectSceneAttachments(selected, 0);
    for (const tool of ['translate', 'rotate', 'scale']) {
      w.editMode = 'clipping';
      const before = JSON.stringify(w.project);
      const target = toolEditMode({ mode: w.editMode, sceneEditing: w.sceneEditing, selectedAttachmentIds: w.selectedAttachmentIds }, tool);
      assert.equal(target, 'images');
      w.setMode(target);
      w.tool = tool;
      assert.deepEqual(w.selectedAttachmentIds, selected);
      assert.equal(w.selectedAttachmentId, 0);
      assert.equal(w.selectedSlotId, 7);
      assert.equal(w.editMode, 'images');
      assert.equal(w.tool, tool);
      assert.equal(JSON.stringify(w.project), before, 'selection transition cannot activate, dirty, revise or rewrite attachments');
    }
  }
  assert.equal(nativeCalls.length, 0);
});

test('pan retains editor context while bone tools and legacy editing keep their established routing', () => {
  const context = { mode: 'clipping', sceneEditing: true, selectedAttachmentIds: [0] };
  assert.equal(toolEditMode(context, 'pan'), 'clipping');
  for (const tool of ['shear', 'pose', 'length', 'create']) assert.equal(toolEditMode(context, tool), 'bones');
  assert.equal(toolEditMode({ ...context, selectedAttachmentIds: [] }, 'rotate'), 'bones');
  assert.equal(toolEditMode({ ...context, sceneEditing: false }, 'scale'), 'bones');
  assert.equal(toolEditMode({ ...context, mode: 'meshes' }, 'translate'), 'bones');
  assert.equal(toolEditMode({ ...context, mode: 'images' }, 'rotate'), 'images');
  assert.equal(toolEditMode({ ...context, mode: 'bones' }, 'rotate'), 'bones');
});
