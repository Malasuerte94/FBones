export interface ImageSelection {
  keys: string[];
  anchor: string | null;
}

/** Range order follows visible PNG rows, excluding folder headings. */
export function selectImageKeys(current: ImageSelection, key: string, ordered: readonly string[],
  modifiers: { shift?: boolean; toggle?: boolean } = {}): ImageSelection {
  const available = new Set(ordered);
  if (!available.has(key)) return current;
  const selected = new Set(current.keys.filter(value => available.has(value)));
  if (modifiers.shift && current.anchor !== null && available.has(current.anchor)) {
    const a = ordered.indexOf(current.anchor), b = ordered.indexOf(key);
    if (!modifiers.toggle) selected.clear();
    for (const value of ordered.slice(Math.min(a, b), Math.max(a, b) + 1)) selected.add(value);
    return { keys: ordered.filter(value => selected.has(value)), anchor: current.anchor };
  }
  if (modifiers.toggle) {
    if (selected.has(key)) selected.delete(key); else selected.add(key);
  } else {
    selected.clear(); selected.add(key);
  }
  return { keys: ordered.filter(value => selected.has(value)), anchor: key };
}

/** Starting a drag on one selected row preserves the complete selected set. */
export function imageDragKeys(selected: readonly string[], key: string, ordered: readonly string[]): string[] {
  const chosen = new Set(selected.includes(key) ? selected : [key]);
  return ordered.filter(value => chosen.has(value));
}

export function parseImageDropKeys(transfer: {types: readonly string[]; getData(type: string): string} | null,
  imageKeys: readonly string[]): string[] | null {
  if (!transfer) return null;
  const batch = transfer.types.includes('application/x-fbones-images');
  const single = transfer.types.includes('application/x-fbones-image');
  const data = transfer.getData(batch ? 'application/x-fbones-images' : single ? 'application/x-fbones-image' : 'text/plain');
  if (!data || data.length > 270336) return null;
  try {
    const keys: unknown = batch ? JSON.parse(data) : [data];
    const known = new Set(imageKeys);
    if (!Array.isArray(keys) || keys.length < 1 || keys.length > 128
      || !keys.every(key => typeof key === 'string' && key.length > 0 && key.length <= 2048
        && !/[\u0000-\u001f]/.test(key) && known.has(key))
      || new Set(keys).size !== keys.length) return null;
    return keys;
  } catch { return null; }
}
