import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldBones, localPoint, previewEdit, creation, hierarchy, canParent, segmentDistance } from '../src/domain/rig.ts';
const bones = [
  { id: 0, parent: null, name: 'root', x: 10, y: -20, rotation: 90, length: 0 },
  { id: 5, parent: 0, name: 'arm', x: 30, y: 0, rotation: -90, length: 100 },
  { id: 8, parent: 0, name: 'branch', x: 0, y: 20, rotation: 0, length: 50 },
  { id: 9, parent: 5, name: 'hand', x: 100, y: 0, rotation: 30, length: 40 },
];
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`);
test('world/local transforms agree for rotated parents and descendants', () => {
  const posed = worldBones(bones);
  near(posed[1].worldX, 10); near(posed[1].worldY, 10); near(posed[1].tipX, 110); near(posed[1].tipY, 10);
  near(posed[3].worldX, 110); near(posed[3].worldY, 10);
  const local = localPoint(posed[0], posed[1].worldX, posed[1].worldY);
  near(local.x, 30); near(local.y, 0);
  assert.throws(() => worldBones([...bones].reverse()), /Invalid bone hierarchy/);
});
test('move/tip previews preserve source and produce the intended world endpoint', () => {
  const before = structuredClone(bones);
  const moved = worldBones(previewEdit(bones, { type: 'move', id: 5, x: 40, y: 50 }));
  near(moved[1].worldX, 40); near(moved[1].worldY, 50); near(moved[3].worldX, 140); near(moved[3].worldY, 50);
  const edited = worldBones(previewEdit(bones, { type: 'tip', id: 5, x: 10, y: 110 }));
  near(edited[1].tipX, 10); near(edited[1].tipY, 110);
  assert.deepEqual(bones, before);
});
test('drawing creates parent-local coordinates and tree ordering prevents cycle options', () => {
  const edit = creation(bones, 5, { x: 110, y: 10 }, { x: 150, y: 50 });
  near(edit.x, 100); near(edit.y, 0); near(edit.rotation, 45); near(edit.length, Math.sqrt(3200));
  assert.deepEqual(hierarchy(bones).map(b => b.id), [0, 5, 9, 8]);
  assert.equal(canParent(bones, 5, 9), false); assert.equal(canParent(bones, 5, 5), false);
  assert.equal(canParent(bones, 5, 8), true);
  assert.equal(canParent(bones, 5, 999), false);
  near(segmentDistance(50, 7, { x: 0, y: 0 }, { x: 100, y: 0 }), 7);
  near(segmentDistance(3, 4, { x: 0, y: 0 }, { x: 0, y: 0 }), 5);
});
