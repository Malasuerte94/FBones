export function taskTree(tasks, matches, isUnread) {
  const nodes = new Map(tasks.map(task => [task.id, {
    task, matched: matches.has(task.id), children: [], count: 0, unread: 0,
  }]));
  const roots = [];
  for (const node of nodes.values()) {
    (nodes.get(node.task.parentId)?.children ?? roots).push(node);
  }

  function visit(node) {
    node.hasChildren = node.children.length > 0;
    node.children = node.children.filter(visit);
    node.count = node.children.reduce((sum, child) => sum + child.count, Number(node.matched));
    node.unread = node.children.reduce((sum, child) => sum + child.unread, Number(node.matched && isUnread(node.task)));
    return node.matched || node.children.length > 0;
  }
  return roots.filter(visit);
}
