export const seenActivityKey = 'fbones.board.seen-activity.v1';

function loadSeen() {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(seenActivityKey) ?? '{}')));
  } catch {
    return new Map();
  }
}

export function createSeenActivity() {
  let seen = loadSeen();
  return {
    isUnread: task => Boolean(task.activityVersion && task.activityVersion !== seen.get(task.id)),
    sync() { seen = loadSeen(); },
    markRead(tasks) {
      for (const [id, version] of loadSeen()) seen.set(id, version);
      for (const task of tasks) {
        if (task.activityVersion) seen.set(task.id, task.activityVersion);
      }
      try {
        localStorage.setItem(seenActivityKey, JSON.stringify(Object.fromEntries(seen)));
      } catch {
        // Keep the read state for this page when browser storage is unavailable.
      }
    },
  };
}
