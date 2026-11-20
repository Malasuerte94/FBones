import {readFileSync, statSync} from 'node:fs';

function parseRelationships(raw, tasks) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Expected a map of parent IDs to child IDs.');
  const ids = new Set(tasks.map(task => task.id));
  const parents = new Map();
  for (const [parent, children] of Object.entries(raw)) {
    if (!Array.isArray(children) || children.some(child => typeof child !== 'string')) {
      throw Error(`Expected child IDs for ${parent}.`);
    }
    if (!ids.has(parent)) continue;
    for (const child of children) {
      if (!ids.has(child)) continue;
      if (parents.has(child)) throw Error(`Task ${child} has more than one parent.`);
      parents.set(child, parent);
    }
  }
  for (const child of parents.keys()) {
    const seen = new Set([child]);
    let parent = parents.get(child);
    while (parent) {
      if (seen.has(parent)) throw Error(`Task parent cycle involving ${child}.`);
      seen.add(parent);
      parent = parents.get(parent);
    }
  }
  return parents;
}

export function readHierarchy(path, tasks) {
  let modifiedAt = 0;
  let parents = new Map();
  let hierarchyError = null;
  try {
    const raw = readFileSync(path, 'utf8');
    modifiedAt = statSync(path).mtimeMs;
    parents = parseRelationships(JSON.parse(raw), tasks);
  } catch (error) {
    if (error.code !== 'ENOENT') hierarchyError = error.message;
  }
  return {parents, modifiedAt, hierarchyError};
}
