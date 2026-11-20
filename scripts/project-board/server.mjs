import {createHash, randomUUID} from 'node:crypto';
import {readFileSync, renameSync, statSync, unlinkSync, unwatchFile, watchFile, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createActivityObserver} from './activity.mjs';
import {readHierarchy} from './hierarchy.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const statuses = new Set(['TODO', 'ACTIVE', 'WAITING', 'READY90', 'DONE']);
const taskRow = /^(\|[ \t]*(F[A-Za-z0-9-]+)[ \t]*\|[ \t]*)(TODO|ACTIVE|WAITING|READY90|DONE)([ \t]*\|[ \t]*)([^|]*?)\|[ \t]*(.*?)[ \t]*\|[ \t]*\r?$/gm;
const priorityBlock = /^(<!-- project-board:priorities -->\r?\n)([\s\S]*?)(^<!-- \/project-board:priorities -->)/m;
const priorityRow = /^\d+\. `(F[A-Za-z0-9-]+)`([^\r\n]*)\r?$/gm;
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/task-tree.js', ['task-tree.js', 'text/javascript; charset=utf-8']],
  ['/seen-activity.js', ['seen-activity.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);

class RequestFault extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseTasks(markdown) {
  const tasks = [...markdown.matchAll(taskRow)].map((match) => ({
    id: match[2], status: match[3], dependencies: match[5].trim(), summary: match[6].trim(),
  }));
  if (!tasks.length || new Set(tasks.map(({id}) => id)).size !== tasks.length) {
    throw Error('The task table in docs/TASKS.md has missing or duplicate IDs.');
  }
  return tasks;
}

function parsePriorities(markdown) {
  const block = markdown.match(priorityBlock);
  if (!block) throw Error('The priorities section is missing from docs/TASKS.md.');
  const rows = new Map();
  for (const line of block[2].split(/\r?\n/).filter(Boolean)) {
    const [row] = line.matchAll(priorityRow);
    if (!row || rows.has(row[1])) throw Error('The priorities list contains an invalid row.');
    rows.set(row[1], row[2]);
  }
  return rows;
}

function taskRevision(markdown) {
  return '"' + createHash('sha256').update(markdown).digest('hex') + '"';
}

function writeTasks(path, before, after) {
  if (before === after) return;
  const temp = path + '.' + randomUUID() + '.tmp';
  try {
    writeFileSync(temp, after, {encoding: 'utf8', flag: 'wx', mode: statSync(path).mode & 0o777});
    if (readFileSync(path, 'utf8') !== before) {
      throw new RequestFault(409, 'TASKS.md changed. Refresh and try again.');
    }
    renameSync(temp, path);
  } finally {
    try { unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

async function readBody(request) {
  if (request.headers['content-type']?.split(';', 1)[0].trim() !== 'application/json') {
    throw new RequestFault(415, 'The request body must be JSON.');
  }
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 32_768) throw new RequestFault(413, 'The request is too large.');
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new RequestFault(400, 'Invalid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestFault(400, 'The request must contain an object.');
  }
  return value;
}

function json(response, status, body) {
  response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  response.end(JSON.stringify(body));
}

export function createBoardServer(workspaceRoot = projectRoot) {
  const tasksPath = join(workspaceRoot, 'docs/TASKS.md');
  const statePath = join(workspaceRoot, 'docs/STATE.md');
  const rulesPath = join(workspaceRoot, 'AGENTS.md');
  const hierarchyPath = join(workspaceRoot, 'docs/TASK-HIERARCHY.json');
  const observe = createActivityObserver(join(workspaceRoot, '.local/project-board/activity.json'));
  const observeDocument = (markdown) => {
    const priorities = [...parsePriorities(markdown).keys()];
    return {tasks: observe(parseTasks(markdown), priorities), priorities};
  };
  const snapshot = (markdown = readFileSync(tasksPath, 'utf8')) => {
    const {tasks, priorities} = observeDocument(markdown);
    const {parents, modifiedAt, hierarchyError} = readHierarchy(hierarchyPath, tasks);
    return {
      tasks: tasks.map(task => ({...task, parentId: parents.get(task.id) ?? null})),
      priorities, hierarchyError, tasksRevision: taskRevision(markdown),
      state: readFileSync(statePath, 'utf8'), rules: readFileSync(rulesPath, 'utf8'),
      refreshedAt: new Date(Math.max(modifiedAt, ...[tasksPath, statePath, rulesPath].map(path => statSync(path).mtimeMs))).toISOString(),
    };
  };
  const observeFile = () => {
    try { observeDocument(readFileSync(tasksPath, 'utf8')); }
    catch (error) { console.error('Could not observe board activity in docs/TASKS.md.', error); }
  };
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    try {
      const port = server.address().port;
      const host = request.headers.host;
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
        throw new RequestFault(403, 'The dashboard is available only on localhost.');
      }
      const origin = `http://${host}`;
      if ((request.headers.origin && request.headers.origin !== origin) || request.headers['sec-fetch-site'] === 'cross-site') {
        throw new RequestFault(403, 'The request origin must match the dashboard.');
      }
      const path = new URL(request.url, origin).pathname;
      const method = request.method;
      if (path === '/api/board' && method === 'GET') return json(response, 200, snapshot());
      if (path === '/favicon.ico' && method === 'GET') {
        response.writeHead(204);
        return response.end();
      }

      const id = path.match(/^\/api\/tasks\/(F[A-Za-z0-9-]+)$/)?.[1];
      if ((id && method === 'PATCH') || (path === '/api/priorities' && method === 'PUT')) {
        const body = await readBody(request);
        const before = readFileSync(tasksPath, 'utf8');
        const tasks = parseTasks(before);
        const current = parsePriorities(before);
        observe(tasks, [...current.keys()]);
        let after;
        if (id) {
          if (!statuses.has(body.status)) throw new RequestFault(400, 'Unknown task status.');
          if (!tasks.some(task => task.id === id)) throw new RequestFault(404, 'Task not found.');
          after = before.replace(taskRow, (row, prefix, taskId, status, delimiter) =>
            taskId === id ? prefix + body.status + delimiter + row.slice(prefix.length + status.length + delimiter.length) : row);
        } else {
          if (request.headers['if-match'] && request.headers['if-match'] !== taskRevision(before)) {
            throw new RequestFault(409, 'Priorities changed. Refresh before reordering.');
          }
          const priorities = body.priorities;
          const ids = new Set(tasks.map(task => task.id));
          if (!Array.isArray(priorities) || new Set(priorities).size !== priorities.length ||
              priorities.some(taskId => !ids.has(taskId))) {
            throw new RequestFault(400, 'Priorities must be unique existing tasks.');
          }
          after = before.replace(priorityBlock, (_block, start, _rows, end) => {
            const newline = start.endsWith('\r\n') ? '\r\n' : '\n';
            const rows = priorities.map((taskId, i) =>
              `${i + 1}. \`${taskId}\`${current.get(taskId) ?? ''}${newline}`).join('');
            return start + rows + end;
          });
        }
        writeTasks(tasksPath, before, after);
        return json(response, 200, snapshot(after));
      }

      const asset = assets.get(path);
      if (!asset || !['GET', 'HEAD'].includes(method)) throw new RequestFault(404, 'Resource not found.');
      const [name, contentType] = asset;
      const bytes = readFileSync(join(publicDir, name));
      response.writeHead(200, {'Content-Type': contentType});
      response.end(method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      if (error instanceof RequestFault) return json(response, error.status, {error: error.message});
      console.error(error);
      json(response, 500, {error: 'The dashboard could not read or save the project files.'});
    }
  });
  server.once('listening', () => {
    watchFile(tasksPath, {interval: 1000, persistent: false}, observeFile);
    observeFile();
  });
  server.once('close', () => unwatchFile(tasksPath, observeFile));
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const port = Number(process.env.FBONES_BOARD_PORT ?? 4180);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('FBONES_BOARD_PORT must be between 1024 and 65535.');
  createBoardServer().listen(port, '127.0.0.1', () => console.log(`FBones Dashboard http://127.0.0.1:${port}/`));
}
