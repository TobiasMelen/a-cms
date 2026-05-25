import { randomBytes } from "node:crypto";

export function uuid(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

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
