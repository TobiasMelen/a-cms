const BASE = "abcdefghijklmnopqrstuvwxyz";
const MID = 13; // index of 'n', middle of alphabet

export function sortKeyBetween(a: string | null, b: string | null): string {
  if (!a && !b) return BASE[MID];

  if (!a) {
    // Before b: find a character before b's first char
    const c = b!.charCodeAt(0) - 97; // 'a' = 0
    if (c > 0) return BASE[Math.floor(c / 2)];
    // b starts with 'a', go deeper
    return "a" + sortKeyBetween(null, b!.slice(1) || null);
  }

  if (!b) {
    // After a: find a character after a's first char
    const c = a.charCodeAt(0) - 97;
    if (c < 25) return BASE[c + Math.ceil((25 - c) / 2)];
    // a starts with 'z', go deeper
    return "z" + sortKeyBetween(a.slice(1) || null, null);
  }

  // Between a and b
  const ca = a.charCodeAt(0) - 97;
  const cb = b.charCodeAt(0) - 97;

  if (cb - ca > 1) {
    return BASE[ca + Math.floor((cb - ca) / 2)];
  }

  if (ca === cb) {
    return BASE[ca] + sortKeyBetween(a.slice(1) || null, b.slice(1) || null);
  }

  // Adjacent characters: go deeper after the first
  return BASE[ca] + sortKeyBetween(a.slice(1) || null, null);
}

type SortableItem = {
  sortKey: string;
};

export function sortKeyForPosition<T extends SortableItem>(
  siblings: T[],
  position: { beforeId?: string; afterId?: string },
  getId: (item: T) => string
): string {
  if (position.beforeId) {
    const before = siblings.find((item) => getId(item) === position.beforeId);
    const idx = before ? siblings.indexOf(before) : -1;
    const prev = idx > 0 ? siblings[idx - 1] : null;
    return sortKeyBetween(prev?.sortKey ?? null, before?.sortKey ?? null);
  }

  if (position.afterId) {
    const after = siblings.find((item) => getId(item) === position.afterId);
    const idx = after ? siblings.indexOf(after) : -1;
    const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
    return sortKeyBetween(after?.sortKey ?? null, next?.sortKey ?? null);
  }

  // No position specified — append to end
  const last = siblings.length > 0 ? siblings[siblings.length - 1] : null;
  return sortKeyBetween(last?.sortKey ?? null, null);
}
