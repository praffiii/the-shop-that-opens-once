import { describe, expect, test } from 'bun:test';
import { WalkMap, type V } from '../src/play/walkmap';

// A 40x40 room with a wall down the middle (x 18-21) open only at the bottom (y >= 32).
function room() {
  const w = 40, h = 40, mask = new Uint8Array(w * h).fill(1);
  for (let y = 0; y < 32; y++) for (let x = 18; x < 22; x++) mask[y * w + x] = 0;
  return new WalkMap(mask, w, h);
}

const walkable = (m: WalkMap, path: V[]) => {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let s = 0; s <= n; s++) if (!m.walkable({ x: a.x + ((b.x - a.x) * s) / n, y: a.y + ((b.y - a.y) * s) / n })) return false;
  }
  return true;
};

describe('WalkMap', () => {
  test('goes round a wall through its gap, every step on open ground', () => {
    const m = room(), path = m.path({ x: 6, y: 6 }, { x: 34, y: 6 });
    expect(path.length).toBeGreaterThan(2);
    expect(path.at(-1)).toEqual({ x: 34, y: 6 });
    expect(path.some(p => p.y >= 32)).toBe(true);
    expect(walkable(m, path)).toBe(true);
  });

  test('a clear line is one straight step', () => {
    expect(room().path({ x: 4, y: 36 }, { x: 36, y: 36 })).toEqual([{ x: 4, y: 36 }, { x: 36, y: 36 }]);
  });

  test('a goal inside a wall ends on open ground beside it', () => {
    const m = room(), end = m.path({ x: 6, y: 6 }, { x: 20, y: 6 }).at(-1)!;
    expect(m.walkable(end)).toBe(true);
    expect(Math.abs(end.x - 20)).toBeLessThan(8);
  });

  test('feet against a wall slide along it', () => {
    expect(room().slide({ x: 17, y: 10 }, { x: 2, y: 1 })).toEqual({ x: 17, y: 11 });
  });
});
