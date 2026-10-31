import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validProjectName, draftSummary, errorMessage } from '../src/domain/project.ts';

test('project names work on all target platforms', () => {
  for (const name of ['My character', 'Animație', '骨格', '🦊', 'a'.repeat(120)]) assert.equal(validProjectName(name), true, name);
  for (const name of ['', ' ', '..', 'Rig.', 'bad/name', 'bad\\name', 'bad:name', 'CON', 'nul.txt', 'LPT9', 'a\u0080b', 'a'.repeat(121)]) assert.equal(validProjectName(name), false, name);
});

test('new desktop project is saveable and has no path until the first save', () => {
  const project = draftSummary('  Character  ');
  assert.equal(project.name, 'Character');
  assert.equal(project.dirty, true);
  assert.equal(project.path, null);
  assert.equal(project.canSave, true);
  assert.equal(project.canCopy, true);
  assert.equal(project.boneCount, 1);
  assert.equal(project.version, '4.3.26');
});

test('structured desktop errors are displayed as useful messages', () => {
  assert.equal(errorMessage({ code: 'Io', message: 'Permission denied' }), 'Permission denied');
  assert.equal(errorMessage('Operation cancelled'), 'Operation cancelled');
  assert.equal(typeof errorMessage(null), 'string');
});
