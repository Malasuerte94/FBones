import assert from 'node:assert/strict';
import {once} from 'node:events';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import test from 'node:test';
import {chromium, expect} from '@playwright/test';
import {createBoardServer} from './server.mjs';

const markdown = `# Tasks

<!-- project-board:priorities -->
1. \`F001\` — [First](#first)
2. \`F002\` — [Second](#second)
<!-- /project-board:priorities -->

| ID | Status | Dependencies | Summary |
| --- | --- | --- | --- |
| F001 | TODO | — | Păstrează textul autorului. |
| F002 | DONE | F001 | Retain this row. |
| F003 | WAITING | — | Leave this task alone. |
`;

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'fbones-board-'));
  const tasksPath = join(root, 'docs/TASKS.md');
  await mkdir(join(root, 'docs'));
  await Promise.all([
    writeFile(tasksPath, markdown),
    writeFile(join(root, 'docs/STATE.md'), '# Amintiri\n\nTextul scris rămâne.\n'),
    writeFile(join(root, 'AGENTS.md'), '# Reguli locale\n'),
  ]);
  let server;
  async function close() {
    if (!server?.listening) return;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  t.after(async () => { await close(); await rm(root, {recursive: true, force: true}); });
  async function start() {
    server = createBoardServer(root);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  }
  return {start, close, tasksPath, hierarchyPath: join(root, 'docs/TASK-HIERARCHY.json'),
    activityPath: join(root, '.local/project-board/activity.json')};
}

async function request(base, path, method = 'GET', body, headers = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: {...(body === undefined ? {} : {'Content-Type': 'application/json'}), ...headers},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  return {response, board: await response.json()};
}

function activity(board, id) {
  const {updatedAt, movedAt} = board.tasks.find(task => task.id === id);
  return {updatedAt, movedAt};
}

test('board activity stays separate from task source and survives restart', async t => {
  const {start, close, tasksPath, activityPath} = await fixture(t);
  let base = await start();
  const initial = await request(base, '/api/board');
  assert.equal(initial.response.status, 200);
  assert.equal(initial.response.headers.get('content-security-policy').includes("script-src 'self'"), true);
  assert.equal(await readFile(tasksPath, 'utf8'), markdown);
  for (const {id} of initial.board.tasks) assert.deepEqual(activity(initial.board, id), {updatedAt: null, movedAt: null});

  const moved = await request(base, '/api/tasks/F001', 'PATCH', {status: 'ACTIVE'});
  assert.equal(moved.response.status, 200);
  assert.equal(moved.board.tasks.find(task => task.id === 'F001').status, 'ACTIVE');
  const firstMove = activity(moved.board, 'F001');
  assert.equal(firstMove.updatedAt, null);
  assert.ok(Date.parse(firstMove.movedAt));
  const repeated = await request(base, '/api/tasks/F001', 'PATCH', {status: 'ACTIVE'});
  assert.deepEqual(activity(repeated.board, 'F001'), firstMove);
  const stale = await request(base, '/api/priorities', 'PUT', {priorities: ['F002', 'F001']}, {'If-Match': initial.board.tasksRevision});
  assert.equal(stale.response.status, 409);
  assert.equal(stale.board.error, 'Priorities changed. Refresh before reordering.');
  const foreign = await request(base, '/api/board', 'GET', undefined, {Origin: 'https://example.com'});
  assert.equal(foreign.response.status, 403);

  const external = (await readFile(tasksPath, 'utf8'))
    .replace('Retain this row.', 'Updated by an external editor.')
    .replace('| F003 | WAITING | — |', '| F003 | WAITING | F002 |')
    + '| F004 | TODO | — | Added outside the dashboard. |\n';
  await writeFile(tasksPath, external);
  let recorded;
  for (let tryCount = 0; tryCount < 40; tryCount++) {
    recorded = JSON.parse(await readFile(activityPath, 'utf8')).tasks;
    if (recorded.F004?.updatedAt) break;
    await delay(100);
  }
  assert.ok(recorded.F004?.updatedAt, 'file observer records tasks without a browser request');
  for (const id of ['F002', 'F003', 'F004']) {
    assert.ok(Date.parse(recorded[id].updatedAt));
    assert.equal(recorded[id].movedAt, null);
  }

  await close();
  await writeFile(tasksPath, external.replace('| F003 | WAITING |', '| F003 | READY90 |'));
  base = await start();
  const restarted = await request(base, '/api/board');
  assert.deepEqual(activity(restarted.board, 'F001'), firstMove);
  assert.equal(activity(restarted.board, 'F002').updatedAt, recorded.F002.updatedAt);
  assert.equal(activity(restarted.board, 'F003').updatedAt, recorded.F003.updatedAt);
  assert.ok(Date.parse(activity(restarted.board, 'F003').movedAt));
  assert.deepEqual(restarted.board.priorities, ['F001', 'F002']);
  const reordered = await request(base, '/api/priorities', 'PUT', {priorities: ['F002', 'F001']}, {'If-Match': restarted.board.tasksRevision});
  assert.equal(reordered.response.status, 200);
  assert.deepEqual(reordered.board.priorities, ['F002', 'F001']);
  assert.ok(Date.parse(activity(reordered.board, 'F002').movedAt));
  assert.equal(activity(reordered.board, 'F002').updatedAt, recorded.F002.updatedAt);
  assert.match(await readFile(tasksPath, 'utf8'), /^1\. `F002` — \[Second\]\(#second\)$/m);
});

test('board UI is English with keyboard-accessible timestamps and edit controls', async t => {
  const {start, tasksPath} = await fixture(t);
  const base = await start();
  const executablePath = process.env.CHROME_BINARY || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const browser = await chromium.launch({executablePath});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 760, height: 840}});
  await page.clock.install();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(base);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {name: 'Task board'})).toBeVisible();
  await page.getByRole('button', {name: 'Status board', exact: true}).click();
  const legend = page.getByRole('list', {name: 'Task activity legend'});
  await expect(legend).toContainText('Activity in the past 24 hours');
  await expect(legend).toContainText('No recent activity');
  const task = page.locator('[data-task="F001"]');
  await expect(task.locator('[data-activity="unrecorded"]')).toHaveText('No activity recorded');
  await expect(task.locator('.task-activity .activity-dot')).toHaveCount(1);
  await expect(task.locator('.task-activity .activity-dot')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(task).toContainText('Păstrează textul autorului.');
  const activityFilter = page.getByLabel('Filter by activity');
  await activityFilter.selectOption('recent');
  await expect(page.locator('.task-card')).toHaveCount(0);

  await writeFile(tasksPath, markdown.replace('Păstrează textul autorului.', 'Descriere schimbată.'));
  await page.getByRole('button', {name: 'Refresh'}).click();
  await expect(page.getByRole('status')).toHaveText('Board refreshed.');
  await expect(task.locator('[data-activity="update"] time')).toHaveAttribute('datetime', /Z$/);
  await expect(task.locator('[data-activity="update"] time')).toContainText('just now');
  await expect(task.locator('[data-activity="update"] .activity-dot')).toHaveCSS('background-color', 'rgb(8, 118, 105)');
  await expect(task.locator('[data-activity="move"]')).toHaveCount(0);
  await expect(page.locator('.task-card')).toHaveCount(1);
  await writeFile(tasksPath, `${await readFile(tasksPath, 'utf8')}| F004 | TODO | — | New task. |\n`);
  await page.getByRole('button', {name: 'Refresh'}).click();
  await expect(page.locator('.task-card h3')).toHaveText(['F004', 'F001']);
  const status = page.getByLabel('Status for task F001');
  await status.selectOption('ACTIVE');
  await expect(page.getByRole('status')).toHaveText('F001 · In progress');
  await expect(task.locator('[data-activity="move"] time')).toHaveAttribute('datetime', /Z$/);
  await expect(task.locator('[data-activity="move"] .activity-dot')).toHaveCSS('background-color', 'rgb(70, 92, 163)');
  await expect(task.locator('.task-activity .activity-dot')).toHaveCount(2);
  await task.locator('summary').press('Enter');
  await expect(task.locator('details .activity-detail time')).toHaveCount(2);
  await expect(task.locator('.activity-detail time').first()).toBeVisible();
  await expect(task.locator('.activity-detail time').first()).toHaveText(/\d{4}/);

  await page.getByRole('button', {name: 'Move up F002'}).press('Enter');
  await expect(page.getByRole('status')).toHaveText('Priorities saved.');
  await expect(page.locator('.priority-item').first()).toHaveAttribute('data-priority', 'F002');
  const movedOnly = page.locator('[data-task="F002"]');
  await expect(movedOnly.locator('[data-activity="move"]')).toHaveAttribute('data-recent', 'true');
  await expect(movedOnly.locator('[data-activity="update"]')).toHaveCount(0);
  await activityFilter.selectOption('updatedAt');
  await expect(page.locator('.task-card h3')).toHaveText(['F004', 'F001']);
  await activityFilter.selectOption('movedAt');
  await expect(page.locator('.task-card h3')).toHaveText(['F001', 'F002']);
  await page.getByLabel('Filter by status').selectOption('DONE');
  await expect(page.locator('.task-card h3')).toHaveText(['F002']);
  await page.getByRole('searchbox', {name: 'Search tasks'}).fill('F004');
  await expect(page.locator('.task-card')).toHaveCount(0);
  await page.getByRole('searchbox', {name: 'Search tasks'}).clear();
  await expect(page.locator('.task-card h3')).toHaveText(['F002']);
  await page.clock.fastForward(24 * 60 * 60_000 + 60_000);
  await expect(page.locator('.task-card')).toHaveCount(0);
  await activityFilter.selectOption('');
  await page.getByLabel('Filter by status').selectOption('');
  await expect(movedOnly.locator('[data-activity="move"]')).toHaveAttribute('data-recent', 'false');
  await expect(movedOnly.locator('[data-activity="move"] time')).toContainText('1 day ago');
  await expect(movedOnly.locator('[data-activity="unrecorded"]')).toHaveCount(0);
  await page.getByRole('tab', {name: 'Tasks'}).press('ArrowRight');
  await expect(page.getByRole('heading', {name: 'Project memory'})).toBeVisible();
  await expect(page.getByText('Textul scris rămâne.')).toBeVisible();
  await page.getByRole('tab', {name: 'Memory'}).press('ArrowRight');
  await expect(page.getByRole('heading', {name: 'Working rules'})).toBeVisible();
  await expect(page.getByText('Reguli locale')).toBeVisible();
  assert.deepEqual(errors, []);
});

test('explicit parent links survive filtering and changes become unread until acknowledged', async t => {
  const {start, close, tasksPath, hierarchyPath} = await fixture(t);
  const tasks = markdown.replace(
    '| F003 | WAITING | — |',
    '| F003 | WAITING | F002 |',
  ) + '| F004 | TODO | F003 | Draft a fixture. |\n';
  await writeFile(tasksPath, tasks);
  const base = await start();
  await request(base, '/api/board');
  await writeFile(hierarchyPath, JSON.stringify({F001: ['F002'], F002: ['F004']}));
  let board = (await request(base, '/api/board')).board;
  assert.deepEqual(board.tasks.map(({id, parentId}) => [id, parentId]), [
    ['F001', null], ['F002', 'F001'], ['F003', null], ['F004', 'F002'],
  ]);
  assert.equal(board.tasks.find(task => task.id === 'F002').activityVersion, null, 'adding a relationship is not task activity');

  const executablePath = process.env.CHROME_BINARY || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const browser = await chromium.launch({executablePath});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 360, height: 790}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(base);
  await expect(page.getByRole('button', {name: 'Hierarchy', exact: true})).toHaveAttribute('aria-pressed', 'true');
  const card = id => page.locator(`[data-task="${id}"]`);
  const branch = id => card(id).getByRole('button', {name: new RegExp(`Child tasks of ${id}`)});
  const refresh = async () => {
    await page.getByRole('button', {name: 'Refresh', exact: true}).click();
    await expect(page.locator('#notice')).toHaveText('Board refreshed.');
  };
  await expect(branch('F001')).toHaveAttribute('aria-expanded', 'false');
  await expect(card('F001')).toContainText('Parent');
  await expect(card('F003')).toBeVisible();
  await expect(card('F004')).toBeHidden();
  await branch('F001').press('Enter');
  await branch('F002').press('Enter');
  await expect(card('F004')).toBeVisible();
  await expect(page.locator('#task-children-F002 > li > article')).toHaveAttribute('data-task', 'F004');
  await expect(page.getByRole('button', {name: /Mark all read/})).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  const begun = tasks.replace('| F004 | TODO |', '| F004 | ACTIVE |');
  await writeFile(tasksPath, begun);
  await refresh();
  await expect(card('F004')).toHaveClass(/task-unread/);
  await expect(card('F004').locator('[data-activity="move"]')).toContainText('Started');
  await expect(card('F004')).toHaveCSS('background-color', 'rgb(255, 245, 216)');
  const first = (await request(base, '/api/board')).board.tasks.find(task => task.id === 'F004').activityVersion;
  assert.ok(first);

  const filter = page.getByLabel('Filter by activity');
  await filter.selectOption('unread');
  await expect(page.locator('[data-task].task-context')).toHaveCount(2);
  await expect(page.getByLabel('Status for task F004')).toHaveValue('ACTIVE');
  await expect(page.getByLabel('Status for task F001')).toHaveCount(0);
  await expect(page.locator('#results')).toHaveText('1 of 4 tasks');
  await card('F004').getByRole('button', {name: 'Mark F004 as read'}).press('Enter');
  await expect(page.locator('.task-card')).toHaveCount(0);
  await expect(page.locator('#notice')).toHaveText('F004 marked read.');
  await expect(filter).toBeFocused();
  await page.reload();
  await expect(page.getByRole('button', {name: /Mark all read/})).toBeDisabled();

  await writeFile(tasksPath, begun.replace('| F004 | ACTIVE |', '| F004 | DONE |'));
  await refresh();
  await expect(card('F004').locator('[data-activity="move"]')).toContainText('Completed');
  await expect(card('F004')).toHaveClass(/task-unread/);
  board = (await request(base, '/api/board')).board;
  assert.notEqual(board.tasks.find(task => task.id === 'F004').activityVersion, first);
  await page.getByRole('button', {name: /Mark all read/}).press('Enter');
  await expect(card('F004')).not.toHaveClass(/task-unread/);
  await page.getByRole('button', {name: 'Status board', exact: true}).click();
  await expect(card('F004')).toContainText('Child of F002');
  await page.getByLabel('Status for task F004').selectOption('ACTIVE');
  await expect(page.locator('#notice')).toHaveText('F004 · In progress');
  await expect(card('F004')).not.toHaveClass(/task-unread/);
  await expect(page.locator('.lane[data-status="ACTIVE"] [data-task="F004"]')).toHaveCount(1);
  await expect(page.locator('[data-task="F004"]')).toHaveCount(1);
  await page.setViewportSize({width: 1440, height: 790});
  await card('F003').dragTo(page.locator('.lane[data-status="TODO"] .lane-heading'), {
    sourcePosition: {x: 5, y: 5},
  });
  await expect(page.getByLabel('Status for task F003')).toHaveValue('TODO');
  await expect(card('F003')).not.toHaveClass(/task-unread/);
  await page.close();
  await close();
  const restarted = await start();
  const afterRestart = (await request(restarted, '/api/board')).board;
  assert.equal(afterRestart.tasks.find(task => task.id === 'F004').movement, 'started');
  assert.deepEqual(errors, []);
});

test('invalid hierarchy keeps the task board available with an error', async t => {
  const {start, hierarchyPath} = await fixture(t);
  const base = await start();
  for (const [map, reason] of [
    [{F001: ['F002'], F003: ['F002']}, /more than one parent/],
    [{F001: ['F002'], F002: ['F001']}, /parent cycle/],
  ]) {
    await writeFile(hierarchyPath, JSON.stringify(map));
    const {response, board} = await request(base, '/api/board');
    assert.equal(response.status, 200);
    assert.match(board.hierarchyError, reason);
    assert.equal(board.tasks.length, 3);
    assert.ok(board.tasks.every(({parentId}) => parentId === null));
  }
});
