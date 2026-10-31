import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useWorkspace } from '../src/stores/workspace.ts';
import { closeProject } from '../src/services/desktop.ts';

describe('project lifecycle in the browser preview', () => {
  beforeEach(async () => {
    globalThis.document = { title: '' };
    await closeProject(true);
    setActivePinia(createPinia());
  });

  test('creates a draft and updates the application title', async () => {
    const workspace = useWorkspace();
    await workspace.initialize();
    await workspace.request('new');
    assert.equal(workspace.newDialog, true);
    await workspace.create('My character');
    await nextTick();
    assert.equal(workspace.project.name, 'My character');
    assert.equal(workspace.project.dirty, true);
    assert.equal(workspace.newDialog, false);
    assert.equal(document.title, 'My character * — FBones');
  });

  test('selecting several image assets retains the selected destination bone', async () => {
    const workspace=useWorkspace();await workspace.create('Assets');
    workspace.project={...workspace.project,bones:[...workspace.project.bones,{id:1,parent:0,name:'target',x:20,y:30,rotation:0,length:40}],library:{root:'./images/',warnings:[],images:['a','b','c'].map(key=>({key,width:32,height:24}))}};
    workspace.selectBone(1);
    workspace.selectLibraryImage('a',['a','b','c']);
    workspace.selectLibraryImage('c',['a','b','c'],{shift:true});
    assert.deepEqual(workspace.librarySelectedKeys,['a','b','c']);
    assert.equal(workspace.selectedBone.id,1);assert.equal(workspace.selectedId,1);
    workspace.selectBone(0);
    assert.deepEqual(workspace.librarySelectedKeys,[]);
  });

  test('cancel leaves the unsaved project intact', async () => {
    const workspace = useWorkspace();
    await workspace.create('Keep this');
    await workspace.request('new');
    assert.equal(workspace.discardDialog, true);
    workspace.cancelDiscard();
    assert.equal(workspace.project.name, 'Keep this');
    assert.equal(workspace.newDialog, false);
    await workspace.request('close');
    await workspace.discardAndContinue();
    assert.equal(workspace.project, null);
  });

  test('cancelling a replacement dialog does not discard the old document', async () => {
    const workspace = useWorkspace();
    await workspace.create('Original');
    await workspace.request('new');
    await workspace.discardAndContinue();
    assert.equal(workspace.newDialog, true);
    workspace.newDialog = false;
    assert.equal(workspace.project.name, 'Original');
    assert.equal(workspace.project.dirty, true);
  });

  test('failed open and invalid creation preserve the current project', async () => {
    const workspace = useWorkspace();
    await workspace.create('Original');
    await workspace.request('open');
    await workspace.discardAndContinue();
    assert.equal(workspace.noticeError, true);
    assert.equal(workspace.project.name, 'Original');
    await workspace.request('new');
    await workspace.discardAndContinue();
    await workspace.create('bad/name');
    assert.equal(workspace.project.name, 'Original');
    assert.equal(workspace.newDialog, true);
    assert.equal(workspace.busy, false);
  });
});
