import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { draftSummary } from '../src/domain/project.ts';

let current, response, calls, finishSave, rigResponse, finishRig, importResponse, finishImport;
globalThis.document = { title: '' };
globalThis.__TAURI__ = {
  core: { async invoke(command, args) {
    calls.push([command, args]);
    if (command === 'get_project') return current;
    if (command === 'save_project') {
      if (response === 'pending') return new Promise(resolve => { finishSave = resolve; });
      if (response instanceof Error) throw response;
      return response;
    }
    if (command === 'import_image') {
      if (importResponse === 'pending') return new Promise(resolve => {finishImport=resolve;});
      return importResponse;
    }
    if (command === 'edit_rig') {
      if (rigResponse === 'pending') return new Promise(resolve => { finishRig = resolve; });
      if (rigResponse instanceof Error) throw rigResponse;
      return rigResponse;
    }
    if (command === 'close_project') { current = null; return; }
    throw new Error(`Unexpected command: ${command}`);
  } },
  window: { getCurrentWindow: () => ({ async setTitle() {}, async destroy() {} }) },
};
const { useWorkspace } = await import('../src/stores/workspace.ts');

beforeEach(() => {
  setActivePinia(createPinia());
  current = draftSummary('Character'); response = null; calls = []; finishSave = undefined;
  rigResponse = null; finishRig = undefined; importResponse = null; finishImport = undefined;
});

test('desktop save updates the authoritative path, dirty state and title', async () => {
  const workspace = useWorkspace(); await workspace.initialize();
  response = { ...current, path: '/projects/Character.fbones', dirty: false, compressedBytes: 381 };
  assert.equal(await workspace.save(), true); await nextTick();
  assert.equal(workspace.project.path, response.path);
  assert.equal(workspace.project.dirty, false);
  assert.equal(document.title, 'Character — FBones');
  assert.deepEqual(calls.at(-1), ['save_project', { saveAs: false }]);
});

test('cancelled and failed save keep the pending document and discard dialog intact', async () => {
  const workspace = useWorkspace(); await workspace.initialize();
  await workspace.request('close');
  await workspace.saveAndContinue();
  assert.equal(workspace.discardDialog, true);
  assert.equal(workspace.project.dirty, true);
  response = new Error('Disk full'); await workspace.saveAndContinue();
  assert.equal(workspace.discardDialog, true);
  assert.equal(workspace.project.name, 'Character');
  assert.equal(workspace.notice, 'Disk full');
  assert.equal(calls.some(([cmd]) => cmd === 'close_project'), false);
});

test('save and continue closes only after a successful save', async () => {
  const workspace = useWorkspace(); await workspace.initialize();
  await workspace.request('close');
  response = { ...current, path: '/projects/Character.fbones', dirty: false };
  await workspace.saveAndContinue();
  assert.equal(workspace.discardDialog, false);
  assert.equal(workspace.project, null);
  assert.deepEqual(calls.slice(-2), [['save_project', { saveAs: false }], ['close_project', { discardChanges: false }]]);
});

test('save as uses its own command option and concurrent saves are ignored', async () => {
  const workspace = useWorkspace(); await workspace.initialize();
  response = 'pending';
  const first = workspace.copy();
  assert.equal(workspace.busy, true);
  assert.equal(await workspace.save(), false);
  finishSave({ ...current, path: '/projects/Copy.fbones', dirty: false });
  await first;
  assert.equal(calls.filter(([cmd]) => cmd === 'save_project').length, 1);
  assert.deepEqual(calls.at(-1), ['save_project', { saveAs: true }]);
  assert.equal(workspace.project.path, '/projects/Copy.fbones');
});

test('bone edits use the current revision, select new stable IDs and keep errors atomic', async () => {
  const workspace = useWorkspace(); await workspace.initialize();
  rigResponse = { ...current, revision: 1, editedBone: 7, canUndo: true, boneCount: 2,
    bones: [...current.bones, { id: 7, parent: 0, name: 'bone1', x: 0, y: 0, rotation: 0, length: 100 }] };
  await workspace.addBone();
  assert.equal(workspace.selectedId, 7); assert.equal(workspace.project.canUndo, true);
  assert.deepEqual(calls.at(-1), ['edit_rig', { expectedRevision: 0, edit: { type: 'create', parent: 0, x: 0, y: 0, rotation: 0, length: 12 } }]);
  const before = workspace.project;
  rigResponse = new Error('A bone cannot be parented to its descendant.');
  assert.equal(await workspace.editRig({ type: 'reparent', id: 7, parent: 7 }), false);
  assert.equal(workspace.project, before); assert.equal(workspace.selectedId, 7);
});

test('save waits for a pending bone edit and blocks unresolved invalid inspector fields', async () => {
  const workspace = useWorkspace(); await workspace.initialize();
  rigResponse = 'pending';
  const editing = workspace.editRig({ type: 'move', id: 0, x: 25, y: 30 });
  response = { ...current, revision: 2, path: '/projects/Character.fbones', dirty: false };
  const saving = workspace.save();
  assert.equal(workspace.editing, true);
  assert.equal(calls.some(([cmd]) => cmd === 'save_project'), false);
  finishRig({ ...current, revision: 1, bones: [{ ...current.bones[0], x: 25, y: 30 }] });
  await editing; assert.equal(await saving, true); assert.equal(workspace.editing, false);
  assert.equal(workspace.project.revision, 2);
  workspace.inspectorError = 'Correct the bone name.';
  const count = calls.length;
  assert.equal(await workspace.save(), false); assert.equal(calls.length, count);
  assert.equal(workspace.notice, 'Correct the bone name.');
});

test('PNG import selects its slot and a queued Save waits for the native image operation', async () => {
  const workspace=useWorkspace(); await workspace.initialize();
  importResponse='pending';
  const imported={...current,revision:1,editedSlot:9,slots:[{id:9,name:'image',bone:0,visible:true,imageAvailable:true,region:{name:'image',image:'image',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24}}]};
  response={...imported,dirty:false,path:'/projects/Character.fbones'};
  const importing=workspace.importImage();
  const saving=workspace.save();
  assert.equal(calls.some(([command])=>command==='save_project'),false);
  finishImport(imported); await importing;
  assert.equal(await saving,true);
  assert.equal(workspace.editMode,'images');assert.equal(workspace.selectedSlotId,9);
  assert.deepEqual(calls.find(([command])=>command==='import_image'),['import_image',{bone:0,expectedRevision:0}]);
  assert.equal(workspace.project.slots[0].imageAvailable,true);
});

test('Escape during a pending native edit keeps the explicit empty selection',async()=>{
 const workspace=useWorkspace();await workspace.initialize();rigResponse='pending';
 const edited=workspace.editRig({type:'move',id:0,x:15,y:20});workspace.escapeSelection();
 finishRig({...current,revision:1,editedBone:0,bones:[{...current.bones[0],x:15,y:20}]});
 assert.equal(await edited,true);assert.equal(workspace.selectedId,null);assert.deepEqual(workspace.selectedIds,[]);assert.equal(workspace.selectedBone,null);assert.equal(workspace.tool,'translate');assert.equal(workspace.project.bones[0].x,15);
});
