import {createSeenActivity, seenActivityKey} from './seen-activity.js';
import {taskTree} from './task-tree.js';

const stages = new Map([
  ['TODO', 'To do'], ['ACTIVE', 'In progress'], ['WAITING', 'Waiting'],
  ['READY90', 'Ready 90%'], ['DONE', 'Done'],
]);

const byId = id => document.getElementById(id);
const lanes = byId('lanes');
const priorityList = byId('priority-list');
const prioritySelect = byId('priority-select');
const priorityAdd = byId('priority-add');
const search = byId('search');
const statusFilter = byId('status-filter');
const activityFilter = byId('activity-filter');
const hierarchyView = byId('view-hierarchy');
const statusView = byId('view-status');
const markAllRead = byId('mark-all-read');
const refreshButton = byId('refresh');
const notice = byId('notice');
const refreshedAt = byId('refreshed-at');
const timeFormat = new Intl.DateTimeFormat('en', {dateStyle: 'medium', timeStyle: 'short'});
const activityDateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
});
const relativeTimeFormat = new Intl.RelativeTimeFormat('en', {numeric: 'always', style: 'short'});
const minute = 60_000, hour = 60 * minute, day = 24 * hour;
const activityUnits = [[365 * day, 'year'], [30 * day, 'month'], [day, 'day'], [hour, 'hour'], [minute, 'minute']];
const tabs = [...document.querySelectorAll('[role="tab"]')];
const seenActivity = createSeenActivity();
const branchExpansion = new Map();
const movementLabels = {started: 'Started', ready: 'Ready 90%', completed: 'Completed', status: 'Status changed', priority: 'Priority moved'};

let snapshot;
let reading;
let saving = false;
let drag;
let dropMarker;
const expanded = new Set();
let view = 'hierarchy';
let nextActivityExpiry = Infinity;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function announce(text, kind = '') {
  notice.textContent = text;
  notice.dataset.kind = kind;
}

function option(value, label = value) {
  const node = element('option', '', label);
  node.value = value;
  return node;
}

function normalizeSearch(text) {
  return text.toLocaleLowerCase('en').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function cardText(source) {
  return source.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*|`/g, '');
}

function setActivityTime(time, now) {
  const age = Math.max(0, now - Date.parse(time.dateTime));
  const unit = activityUnits.find(([size]) => age >= size);
  time.firstElementChild.textContent = unit ? relativeTimeFormat.format(-Math.floor(age / unit[0]), unit[1]) : 'just now';
  time.parentElement.dataset.recent = String(age < day);
}

function taskActivity(label, kind, timestamp) {
  const mark = element('span', 'activity-mark');
  mark.dataset.activity = kind;
  const dot = element('span', 'activity-dot');
  dot.setAttribute('aria-hidden', 'true');
  mark.append(dot, element('span', 'activity-label', timestamp ? `${label} ` : label));
  if (!timestamp) return mark;
  const time = element('time');
  time.dateTime = timestamp;
  time.title = activityDateFormat.format(new Date(timestamp));
  time.append(element('span'), element('span', 'sr-only', ` (${time.title})`));
  mark.append(time);
  setActivityTime(time, Date.now());
  return mark;
}

function activityDetails(label, timestamp) {
  const item = element('p', 'activity-detail', `${label} `);
  if (!timestamp) {
    item.append('No record');
    return item;
  }
  const time = element('time', '', activityDateFormat.format(new Date(timestamp)));
  time.dateTime = timestamp;
  item.append(time);
  return item;
}

function latestActivityAt(task, filter) {
  if (filter !== 'recent') return task[filter] ? Date.parse(task[filter]) : -Infinity;
  const updated = task.updatedAt ? Date.parse(task.updatedAt) : -Infinity;
  const moved = task.movedAt ? Date.parse(task.movedAt) : -Infinity;
  return Math.max(updated, moved);
}

function taskCard(task, hasChildren, {context = false} = {}) {
  const card = element(view === 'hierarchy' ? 'article' : 'li', 'task-card');
  card.dataset.task = task.id;
  card.draggable = view === 'status' && !saving;
  card.classList.toggle('task-parent', hasChildren);
  card.classList.toggle('task-context', context);
  const heading = element('div', 'task-card-heading');
  heading.append(element('h3', '', task.id));
  if (hasChildren) heading.append(element('span', 'parent-label', 'Parent'));
  if (view === 'status' && task.parentId) heading.append(element('span', 'child-label', `Child of ${task.parentId}`));
  card.append(heading);
  if (context) {
    heading.append(element('span', 'context-status', stages.get(task.status)));
    card.append(element('p', 'task-summary clamp', cardText(task.summary)));
    return card;
  }
  if (seenActivity.isUnread(task)) {
    card.classList.add('task-unread');
    heading.append(element('span', 'unread-label', 'Unread'));
    const mark = element('button', 'mark-task-read', 'Mark read');
    mark.type = 'button';
    mark.dataset.readTask = task.id;
    mark.dataset.focus = `read:${task.id}`;
    mark.setAttribute('aria-label', `Mark ${task.id} as read`);
    heading.append(mark);
  }
  const activity = element('div', 'task-activity');
  if (task.updatedAt) activity.append(taskActivity('Updated', 'update', task.updatedAt));
  if (task.movedAt) activity.append(taskActivity(movementLabels[task.movement] ?? 'Moved', 'move', task.movedAt));
  if (!activity.childElementCount) activity.append(taskActivity('No activity recorded', 'unrecorded'));
  card.append(activity);

  const summary = cardText(task.summary);
  const clip = element('p', 'task-summary clamp', summary);
  const details = element('details');
  details.open = expanded.has(task.id);
  clip.hidden = details.open;
  const disclosure = element('summary', '', 'Details');
  disclosure.dataset.focus = `details:${task.id}`;
  const detailBody = element('div', 'task-details');
  detailBody.append(element('p', '', summary));
  if (task.dependencies && task.dependencies !== '—' && task.dependencies !== '-') {
    detailBody.append(element('p', '', `Dependencies · ${cardText(task.dependencies)}`));
  }
  detailBody.append(activityDetails('Last updated', task.updatedAt), activityDetails('Last moved', task.movedAt));
  details.append(disclosure, detailBody);
  details.addEventListener('toggle', () => {
    clip.hidden = details.open;
    if (details.open) expanded.add(task.id);
    else expanded.delete(task.id);
  });
  card.append(clip, details);

  const status = element('select', 'task-select');
  status.dataset.focus = `status:${task.id}`;
  status.setAttribute('aria-label', `Status for task ${task.id}`);
  status.title = 'Change task status';
  for (const [value, label] of stages) status.append(option(value, label));
  status.value = task.status;
  status.disabled = saving;
  card.append(status);
  return card;
}

function taskMatches(now) {
  const query = normalizeSearch(search.value.trim());
  const filter = statusFilter.value;
  const activity = activityFilter.value;
  nextActivityExpiry = Infinity;
  let tasks = snapshot.tasks.filter(task => (!filter || task.status === filter) && (!query ||
    normalizeSearch(`${task.id} ${task.parentId ?? ''} ${task.dependencies} ${cardText(task.summary)}`).includes(query)));
  if (activity === 'unread') tasks = tasks.filter(seenActivity.isUnread);
  else if (activity) {
    const recent = tasks.map(task => ({task, at: latestActivityAt(task, activity)}))
      .filter(({at}) => at + day > now)
      .sort((a, b) => b.at - a.at);
    for (const {at} of recent) nextActivityExpiry = Math.min(nextActivityExpiry, at + day);
    tasks = recent.map(({task}) => task);
  }
  return {tasks, filter, filtered: Boolean(query || filter || activity)};
}

function renderStatusBoard(tasks, filter, parentIds) {
  const columns = document.createDocumentFragment();

  for (const [status, label] of stages) {
    if (filter && filter !== status) continue;
    const statusTasks = tasks.filter(task => task.status === status);
    const lane = element('section', 'lane');
    lane.dataset.status = status;
    lane.setAttribute('aria-labelledby', `lane-heading-${status}`);
    const header = element('header', 'lane-heading');
    const heading = element('h2', '', label);
    heading.id = `lane-heading-${status}`;
    header.append(heading, element('span', 'lane-count', statusTasks.length));
    lane.append(header);
    if (statusTasks.length) {
      const list = element('ul', 'task-list');
      for (const task of statusTasks) list.append(taskCard(task, parentIds.has(task.id)));
      lane.append(list);
    } else {
      lane.append(element('p', 'lane-empty', 'No tasks to show.'));
    }
    columns.append(lane);
  }
  return columns;
}

function renderHierarchy(nodes, filtered) {
  const list = element('ul', 'task-tree');
  for (const node of nodes) {
    const {task, matched, children, hasChildren, count, unread} = node;
    const item = element('li', 'task-tree-node');
    item.append(taskCard(task, hasChildren, {context: !matched}));
    if (children.length) {
      const descendants = count - Number(matched);
      const unreadChildren = unread - Number(matched && seenActivity.isUnread(task));
      const label = `${descendants} ${descendants === 1 ? 'child task' : 'child tasks'}${unreadChildren ? ` · ${unreadChildren} unread` : ''}`;
      const button = element('button', 'task-branch-toggle');
      button.type = 'button';
      button.dataset.focus = `branch:${task.id}`;
      const mark = element('span', 'branch-chevron', '›');
      mark.setAttribute('aria-hidden', 'true');
      button.append(mark, element('span', '', label));
      const childrenList = renderHierarchy(children, filtered);
      childrenList.id = `task-children-${task.id}`;
      button.setAttribute('aria-controls', childrenList.id);
      button.setAttribute('aria-label', `Child tasks of ${task.id} · ${label}`);
      const setOpen = open => {
        button.setAttribute('aria-expanded', String(open));
        childrenList.hidden = !open;
      };
      if (!filtered && unread && !branchExpansion.has(task.id)) branchExpansion.set(task.id, true);
      setOpen(filtered || branchExpansion.get(task.id) === true);
      button.addEventListener('click', () => {
        const open = childrenList.hidden;
        if (!filtered) branchExpansion.set(task.id, open);
        setOpen(open);
      });
      item.firstElementChild.querySelector('.task-card-heading').append(button);
      item.append(childrenList);
    }
    list.append(item);
  }
  return list;
}

function restoreTaskFocus(token, taskId) {
  if (!token) return;
  const controls = [...lanes.querySelectorAll('[data-focus]')];
  const target = controls.find(control => control.dataset.focus === token && !control.closest('[hidden]'))
    ?? controls.find(control => control.dataset.focus === `details:${taskId}` && !control.closest('[hidden]'));
  (target ?? activityFilter).focus({preventScroll: true});
}

function renderBoard() {
  if (!snapshot) return;
  const focused = document.activeElement;
  const token = lanes.contains(focused) ? focused.dataset.focus : null;
  const focusTaskId = focused?.closest('[data-task]')?.dataset.task;
  const {tasks, filter, filtered} = taskMatches(Date.now());
  const parentIds = new Set(snapshot.tasks.map(task => task.parentId).filter(Boolean));
  const parents = tasks.filter(task => parentIds.has(task.id)).length;
  const unread = snapshot.tasks.filter(seenActivity.isUnread).length;
  lanes.classList.toggle('is-filtered', Boolean(filter));
  lanes.classList.toggle('is-hierarchy', view === 'hierarchy');
  lanes.setAttribute('aria-label', view === 'hierarchy' ? 'Task hierarchy' : 'Tasks grouped by status');
  hierarchyView.setAttribute('aria-pressed', String(view === 'hierarchy'));
  statusView.setAttribute('aria-pressed', String(view === 'status'));
  byId('hierarchy-notice').hidden = view !== 'hierarchy' || !snapshot.hierarchyError;
  byId('hierarchy-notice').textContent = snapshot.hierarchyError ? `Hierarchy unavailable. ${snapshot.hierarchyError}` : '';

  if (view === 'status') lanes.replaceChildren(renderStatusBoard(tasks, filter, parentIds));
  else if (tasks.length) {
    const matches = new Set(tasks.map(task => task.id));
    lanes.replaceChildren(renderHierarchy(taskTree(snapshot.tasks, matches, seenActivity.isUnread), filtered));
  } else lanes.replaceChildren(element('p', 'lane-empty', 'No tasks to show.'));

  const shown = tasks.length;
  const count = filtered ? `${shown} of ${snapshot.tasks.length} tasks` : `${shown} ${shown === 1 ? 'task' : 'tasks'}`;
  byId('results').textContent = parents ? `${count} · ${parents} ${parents === 1 ? 'parent' : 'parents'}` : count;
  byId('unread-count').textContent = `${unread} unread`;
  markAllRead.disabled = unread === 0;
  restoreTaskFocus(token, focusTaskId);
}

function priorityButton(taskId, action, glyph, label, disabled = false) {
  const button = element('button', '', glyph);
  button.type = 'button';
  button.dataset.priorityAction = action;
  button.dataset.focus = `priority:${taskId}:${action}`;
  button.setAttribute('aria-label', `${label} ${taskId}`);
  button.title = label;
  button.disabled = disabled || saving;
  return button;
}

function renderPriorities() {
  if (!snapshot) return;
  const rows = document.createDocumentFragment();
  for (const [index, id] of snapshot.priorities.entries()) {
    const item = element('li', 'priority-item');
    item.dataset.priority = id;
    item.draggable = !saving;
    const number = element('span', 'priority-number', index + 1);
    number.setAttribute('aria-hidden', 'true');
    const actions = element('div', 'priority-actions');
    actions.append(priorityButton(id, 'up', '↑', 'Move up', index === 0),
      priorityButton(id, 'down', '↓', 'Move down', index === snapshot.priorities.length - 1),
      priorityButton(id, 'remove', '×', 'Remove from priorities'));
    item.append(number, element('span', 'priority-name', id), actions);
    rows.append(item);
  }
  priorityList.replaceChildren(rows);
  byId('priority-empty').hidden = snapshot.priorities.length > 0;
  const chosen = prioritySelect.value;
  const choices = snapshot.tasks.filter(task => !snapshot.priorities.includes(task.id));
  prioritySelect.replaceChildren(option('', 'Choose a task'),
    ...choices.sort((a, b) => a.id.localeCompare(b.id)).map(task => option(task.id)));
  prioritySelect.value = choices.some(task => task.id === chosen) ? chosen : '';
  prioritySelect.disabled = saving || choices.length === 0;
  priorityAdd.disabled = saving || !prioritySelect.value;
}

function inlineText(node, source) {
  const token = /\[([^\]\n]+)\]\(([^)\n]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;
  let position = 0;
  for (const match of source.matchAll(token)) {
    node.append(document.createTextNode(source.slice(position, match.index)));
    if (match[1]) {
      if (/^https?:\/\//i.test(match[2])) {
        const link = element('a', '', match[1]);
        link.href = match[2];
        link.rel = 'noreferrer';
        link.target = '_blank';
        node.append(link);
      } else {
        node.append(document.createTextNode(`${match[1]} (${match[2]})`));
      }
    } else {
      node.append(match[3] ? element('strong', '', match[3]) : element('code', '', match[4]));
    }
    position = match.index + match[0].length;
  }
  node.append(document.createTextNode(source.slice(position)));
}

function renderDocument(target, source) {
  const content = document.createDocumentFragment();
  let paragraph = [];
  let list;
  let code;
  const flush = () => {
    if (!paragraph.length) return;
    const p = element('p');
    inlineText(p, paragraph.join(' '));
    content.append(p);
    paragraph = [];
  };
  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith('```')) {
      if (code) {
        content.append(element('pre', '', code.join('\n')));
        code = undefined;
      } else {
        flush();
        list = undefined;
        code = [];
      }
    } else if (code) {
      code.push(line);
    } else if (!line.trim()) {
      flush();
      list = undefined;
    } else if (/^#{1,6}\s/.test(line)) {
      flush();
      list = undefined;
      const [marks, ...words] = line.split(/\s+/);
      const heading = element(`h${Math.min(4, marks.length + 1)}`);
      inlineText(heading, words.join(' '));
      content.append(heading);
    } else {
      const item = line.match(/^\s*([-*+]\s|\d+\.\s)(.*)/);
      if (item) {
        flush();
        const kind = /^\d/.test(item[1]) ? 'OL' : 'UL';
        if (list?.tagName !== kind) {
          list = element(kind.toLowerCase());
          content.append(list);
        }
        const row = element('li');
        inlineText(row, item[2]);
        list.append(row);
      } else if (/^\s+/.test(line) && list?.lastElementChild) {
        inlineText(list.lastElementChild, ` ${line.trim()}`);
      } else {
        list = undefined;
        paragraph.push(line.trim());
      }
    }
  }
  flush();
  if (code) content.append(element('pre', '', code.join('\n')));
  if (!content.childNodes.length) content.append(element('p', '', 'The document is empty.'));
  target.replaceChildren(content);
}

function showSnapshot(next, redraw = false) {
  const previous = snapshot;
  snapshot = next;
  if (redraw || !previous || previous.hierarchyError !== next.hierarchyError || JSON.stringify(previous.tasks) !== JSON.stringify(next.tasks)) {
    renderBoard();
    renderPriorities();
  } else if (JSON.stringify(previous.priorities) !== JSON.stringify(next.priorities)) {
    renderPriorities();
  }
  if (previous?.state !== next.state) renderDocument(byId('memory-document'), next.state);
  if (previous?.rules !== next.rules) renderDocument(byId('rules-document'), next.rules);
  const timestamp = new Date(next.refreshedAt);
  if (Number.isFinite(timestamp.getTime())) {
    refreshedAt.dateTime = timestamp.toISOString();
    refreshedAt.textContent = `Sources updated ${timeFormat.format(timestamp)}`;
  } else {
    refreshedAt.textContent = 'Sources loaded';
  }
}

async function request(path, options) {
  const response = await fetch(path, {cache: 'no-store', ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${response.status}`);
  return data;
}

function editingInProgress() {
  const active = document.activeElement;
  return active?.matches('.task-select') || priorityList.contains(active) || active === prioritySelect || active === priorityAdd;
}

async function refresh({manual = false} = {}) {
  if (reading || saving || drag || (!manual && (document.hidden || editingInProgress()))) return;
  const controller = new AbortController();
  reading = controller;
  refreshButton.disabled = true;
  if (manual) announce('Refreshing…');
  try {
    const next = await request('/api/board', {signal: controller.signal});
    if (reading !== controller) return;
    if (drag || saving || (!manual && editingInProgress())) return;
    showSnapshot(next);
    if (manual || notice.dataset.kind === 'refresh-error') announce(manual ? 'Board refreshed.' : '', manual ? 'success' : '');
  } catch (error) {
    if (error.name !== 'AbortError') {
      if (!snapshot) refreshedAt.textContent = 'Project data unavailable';
      announce(`Refresh failed. ${error.message}`, 'refresh-error');
    }
  } finally {
    if (reading === controller) {
      reading = undefined;
      refreshButton.disabled = false;
    }
  }
}

async function save(path, method, body, message, {revision, statusEdit} = {}) {
  if (saving || !snapshot) return;
  const focused = document.activeElement;
  const focusToken = focused?.dataset.focus;
  reading?.abort();
  reading = undefined;
  saving = true;
  refreshButton.disabled = true;
  lanes.setAttribute('aria-busy', 'true');
  priorityList.setAttribute('aria-busy', 'true');
  for (const control of document.querySelectorAll('.task-select, .priority-actions button, #priority-select, #priority-add')) {
    control.disabled = true;
  }
  announce('Saving…');
  let next;
  try {
    const headers = {'Content-Type': 'application/json'};
    if (revision) headers['If-Match'] = revision;
    next = await request(path, {method, headers, body: JSON.stringify(body)});
    if (statusEdit) {
      const changed = next.tasks.find(task => task.id === statusEdit.id);
      if (changed?.status === body.status && changed.updatedAt === statusEdit.updatedAt && changed.summary === statusEdit.summary) {
        seenActivity.markRead([changed]);
      }
    }
    announce(message, 'success');
  } catch (error) {
    announce(`Could not save the change. ${error.message}`, 'error');
  } finally {
    const restoreFocus = document.activeElement === focused || document.activeElement === document.body;
    saving = false;
    refreshButton.disabled = false;
    lanes.removeAttribute('aria-busy');
    priorityList.removeAttribute('aria-busy');
    showSnapshot(next ?? snapshot, true);
    if (restoreFocus && focusToken) {
      const controls = [...document.querySelectorAll('[data-focus]')];
      const replacement = controls.find(control => control.dataset.focus === focusToken && !control.disabled);
      const companion = focused.closest('.priority-item')?.dataset.priority;
      const fallback = companion && controls.find(control => control.dataset.focus.startsWith(`priority:${companion}:`) && !control.disabled);
      (replacement || fallback || (companion ? prioritySelect : search)).focus();
    }
  }
}

function changeStatus(id, status) {
  const task = snapshot.tasks.find(task => task.id === id);
  if (!stages.has(status) || !task || task.status === status) return;
  save(`/api/tasks/${encodeURIComponent(id)}`, 'PATCH', {status}, `${id} · ${stages.get(status)}`, {statusEdit: task});
}

function changePriorities(priorities) {
  if (priorities.every((id, index) => id === snapshot.priorities[index]) && priorities.length === snapshot.priorities.length) return;
  save('/api/priorities', 'PUT', {priorities}, 'Priorities saved.', {revision: snapshot.tasksRevision});
}

function clearDropMarker() {
  dropMarker?.classList.remove('drag-over', 'drop-before', 'drop-after');
  dropMarker = undefined;
}

function endDrag() {
  drag?.node.classList.remove('is-dragging');
  drag = undefined;
  clearDropMarker();
}

function dropTarget(event) {
  return drag?.type === 'task' ? event.target.closest('.lane') : event.target.closest('.priority-item');
}

function afterMidpoint(target, event) {
  const rect = target.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

for (const title of stages) statusFilter.append(option(...title));
search.addEventListener('input', renderBoard);
statusFilter.addEventListener('change', renderBoard);
activityFilter.addEventListener('change', renderBoard);
hierarchyView.addEventListener('click', () => { view = 'hierarchy'; renderBoard(); });
statusView.addEventListener('click', () => { view = 'status'; renderBoard(); });
markAllRead.addEventListener('click', () => {
  seenActivity.markRead(snapshot.tasks);
  renderBoard();
  activityFilter.focus({preventScroll: true});
  announce('All task changes marked read.', 'success');
});
window.addEventListener('storage', event => {
  if (event.key !== null && event.key !== seenActivityKey) return;
  seenActivity.sync();
  if (!saving && !drag) renderBoard();
});
refreshButton.addEventListener('click', () => refresh({manual: true}));
lanes.addEventListener('change', event => {
  if (event.target.matches('.task-select')) changeStatus(event.target.closest('[data-task]').dataset.task, event.target.value);
});
lanes.addEventListener('click', event => {
  const id = event.target.closest('[data-read-task]')?.dataset.readTask;
  const task = id && snapshot.tasks.find(task => task.id === id);
  if (!task) return;
  seenActivity.markRead([task]);
  renderBoard();
  announce(`${id} marked read.`, 'success');
});
prioritySelect.addEventListener('change', () => { priorityAdd.disabled = saving || !prioritySelect.value; });
byId('priority-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!saving && prioritySelect.value) changePriorities([...snapshot.priorities, prioritySelect.value]);
});
priorityList.addEventListener('click', event => {
  const action = event.target.closest('[data-priority-action]')?.dataset.priorityAction;
  if (!action || saving) return;
  const id = event.target.closest('[data-priority]').dataset.priority;
  const order = [...snapshot.priorities];
  const index = order.indexOf(id);
  order.splice(index, 1);
  if (action !== 'remove') order.splice(index + (action === 'up' ? -1 : 1), 0, id);
  changePriorities(order);
});

document.addEventListener('dragstart', event => {
  const source = event.target.closest('[data-task], [data-priority]');
  if (!source || !event.dataTransfer) return;
  if (saving || !source.draggable || event.target.closest('button, select, summary')) { event.preventDefault(); return; }
  const type = source.dataset.task ? 'task' : 'priority';
  const id = source.dataset[type];
  drag = {node: source, type, id};
  event.dataTransfer.setData('text/plain', id);
  event.dataTransfer.effectAllowed = 'move';
  source.classList.add('is-dragging');
});
document.addEventListener('dragover', event => {
  if (!drag) return;
  const target = dropTarget(event);
  if (target !== dropMarker) clearDropMarker();
  if (!target) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dropMarker = target;
  if (drag.type === 'task') target.classList.add('drag-over');
  else {
    const after = afterMidpoint(target, event);
    target.classList.toggle('drop-before', !after);
    target.classList.toggle('drop-after', after);
  }
});
document.addEventListener('drop', event => {
  if (!drag) return;
  const target = dropTarget(event);
  const {type, id} = drag;
  endDrag();
  if (!target) return;
  event.preventDefault();
  if (type === 'task') changeStatus(id, target.dataset.status);
  else if (target.dataset.priority !== id) {
    const order = snapshot.priorities.filter(value => value !== id);
    order.splice(order.indexOf(target.dataset.priority) + Number(afterMidpoint(target, event)), 0, id);
    changePriorities(order);
  }
});
document.addEventListener('dragend', endDrag);

function selectTab(selected) {
  for (const tab of tabs) {
    const active = tab === selected;
    tab.tabIndex = active ? 0 : -1;
    tab.setAttribute('aria-selected', String(active));
    byId(tab.getAttribute('aria-controls')).hidden = !active;
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1)
      : offset ? tabs[(index + offset + tabs.length) % tabs.length] : undefined;
    if (!next) return;
    event.preventDefault();
    selectTab(next);
    next.focus();
  });
}

refresh();
window.setInterval(() => {
  if (document.hidden) return;
  const now = Date.now();
  if (now >= nextActivityExpiry && !saving && !drag && !editingInProgress()) renderBoard();
  for (const time of document.querySelectorAll('.task-activity time')) setActivityTime(time, now);
  refresh();
}, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
