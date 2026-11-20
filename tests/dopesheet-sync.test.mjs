import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  graphTrackIdsForDopesheetSelection,
  hasTimelineGraphCurves,
  syncedTimelineRows,
} from '../src/domain/dopesheetSync.ts';

const first = { id: 1 }, second = { id: 2 }, third = { id: 3 };
const group = bone => ({ id: 'bone-' + bone.id, bone });
const row = (id, channel, keyIds, bone) => ({
  id, bone, track: { id, channel, keys: keyIds.map(id => ({ id })) },
});
const firstGroup = group(first), secondGroup = group(second);
const x = row('x', 'translateX', [11, 12], first);
const y = row('y', 'translateY', [13], first);
const order = row('draw', 'drawOrder', [14]);
const region = row('region', 'attachment', [15], second);
const color = row('color', 'rgba', [16], second);
const placeholder = row('stored-only', 'rotate', [], third);
const deform = row('deform', 'deform', [17, 18], third);
const rows = [firstGroup, x, y, secondGroup, region, color, group(third), placeholder, deform, order];
const tracks = rows.flatMap(row => row.track ? [row.track] : []);

test('Graph to Dopesheet retains only requested live rows, grouped in source order', () => {
  const suppliedIds = new Set(['color', 'stored-only', 'x', 'draw', 'deform', 'region', 'comparison']);
  const synced = syncedTimelineRows(rows, suppliedIds);
  assert.deepEqual(synced, [firstGroup, x, secondGroup, color]);
  assert.equal(synced[1], x);
  assert.deepEqual(syncedTimelineRows(rows, new Set(['stored-only', 'comparison'])), []);
  assert.deepEqual(rows.map(row => row.id), [
    'bone-1', 'x', 'y', 'bone-2', 'region', 'color', 'bone-3', 'stored-only', 'deform', 'draw',
  ]);
});

test('Dopesheet to Graph follows the selected live property tracks and keeps split axes independent', () => {
  const combined = row('xy', 'translate', [20, 21], first).track;
  assert.equal(hasTimelineGraphCurves(combined), true);
  assert.equal(hasTimelineGraphCurves(placeholder.track), false);
  assert.equal(hasTimelineGraphCurves(deform.track), false);
  assert.deepEqual(graphTrackIdsForDopesheetSelection(tracks, new Set()), new Set());
  assert.deepEqual(graphTrackIdsForDopesheetSelection(tracks, new Set([14, 15, 17, 999])), new Set());
  assert.deepEqual(
    graphTrackIdsForDopesheetSelection([...tracks, combined], new Set([12, 16, 21])),
    new Set(['x', 'color', 'xy']),
  );
  assert.deepEqual(
    graphTrackIdsForDopesheetSelection(tracks.filter(track => track !== x.track), new Set([12, 13])),
    new Set(['y']),
  );
});
