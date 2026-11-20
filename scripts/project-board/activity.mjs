import {createHash, randomUUID} from 'node:crypto';
import {mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

function readActivity(path) {
  try {
    const state = JSON.parse(readFileSync(path, 'utf8'));
    if (state?.version !== 1 || !state.tasks || typeof state.tasks !== 'object' || Array.isArray(state.tasks)) {
      throw new Error('Invalid board activity file.');
    }
    const timestamp = (value) => value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
    if (Object.values(state.tasks).some(row => !row || typeof row.content !== 'string' ||
        typeof row.status !== 'string' || (row.priority !== null && !Number.isInteger(row.priority)) ||
        !timestamp(row.updatedAt) || !timestamp(row.movedAt) ||
        (row.activityVersion != null && typeof row.activityVersion !== 'string'))) {
      throw new Error('Invalid board activity record.');
    }
    return state.tasks;
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read board activity. Starting a new baseline.', error);
    return null;
  }
}

function writeActivity(path, tasks) {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify({version: 1, tasks}, null, 2)}\n`, {flag: 'wx', mode: 0o600});
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, {force: true});
  }
}

export function createActivityObserver(path) {
  let previous = readActivity(path);
  let needsWrite = false;
  return (tasks, priorities) => {
    const observedAt = new Date().toISOString();
    const positions = new Map(priorities.map((id, index) => [id, index]));
    const current = {};
    needsWrite ||= !previous || Object.keys(previous).length !== tasks.length;
    const withActivity = tasks.map(task => {
      const {id, status, summary, dependencies} = task;
      const content = createHash('sha256').update(JSON.stringify([summary, dependencies])).digest('hex');
      const priority = positions.get(id) ?? null;
      const before = previous?.[id];
      const updated = previous !== null && (!before || before.content !== content);
      const moved = before && (before.status !== status || before.priority !== priority);
      const updatedAt = updated ? observedAt : before?.updatedAt ?? null;
      const movedAt = moved ? observedAt : before?.movedAt ?? null;
      const activityVersion = updated || moved ? randomUUID()
        : before?.activityVersion ?? (updatedAt || movedAt ? `${updatedAt ?? ''}/${movedAt ?? ''}` : null);
      const movement = moved ? movementKind(before, status) : before?.movement ?? null;
      needsWrite ||= updated || Boolean(moved);
      current[id] = {content, status, priority, updatedAt, movedAt, activityVersion, movement};
      return {...task, updatedAt, movedAt, activityVersion, movement};
    });
    previous = current;
    if (needsWrite) {
      try {
        writeActivity(path, current);
        needsWrite = false;
      } catch (error) {
        // TASKS.md still supplies the board if optional local history cannot be written.
        console.error('Could not save board activity.', error);
      }
    }
    return withActivity;
  };
}

function movementKind(before, status) {
  if (before.status === status) return 'priority';
  if (status === 'ACTIVE') return 'started';
  if (status === 'READY90') return 'ready';
  if (status === 'DONE') return 'completed';
  return 'status';
}
