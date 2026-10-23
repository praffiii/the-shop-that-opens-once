// Where feet may stand in a place (the white pixels of its walk.png), and walking paths across it, ported from the
// game's Core/WalkMap.cs. Paths are found on a coarse grid, then straightened wherever a direct line stays walkable.
export type V = { x: number; y: number };

const CELL = 4;
const DIAGONAL = Math.SQRT2;

export class WalkMap {
  private readonly solid: Uint8Array;
  private readonly cols: number;
  private readonly rows: number;

  /** mask: 1 where feet may go, per art pixel, row 0 at the top. */
  constructor(private readonly mask: Uint8Array, readonly width: number, readonly height: number) {
    this.cols = Math.ceil(width / CELL);
    this.rows = Math.ceil(height / CELL);
    this.solid = new Uint8Array(this.cols * this.rows);
    for (let i = 0; i < this.solid.length; i++) this.solid[i] = this.walkable(this.centre(i)) ? 0 : 1;
  }

  static fromImage(img: ImageData) {
    const mask = new Uint8Array(img.width * img.height);
    for (let i = 0; i < mask.length; i++) mask[i] = img.data[i * 4]! > 127 ? 1 : 0;
    return new WalkMap(mask, img.width, img.height);
  }

  walkable(p: V) {
    const x = Math.floor(p.x), y = Math.floor(p.y);
    return x >= 0 && y >= 0 && x < this.width && y < this.height && this.mask[y * this.width + x] === 1;
  }

  /** Where feet moving from `from` by `m` end up: the full move, or a slide along a wall. */
  slide(from: V, m: V): V {
    for (const s of [m, { x: m.x, y: 0 }, { x: 0, y: m.y }]) {
      if ((s.x !== 0 || s.y !== 0) && this.walkable({ x: from.x + s.x, y: from.y + s.y })) return { x: from.x + s.x, y: from.y + s.y };
    }
    return from;
  }

  /** Points to walk through from `from` toward `to`, ending on the walkable point nearest it; empty when there is no way. */
  path(from: V, to: V): V[] {
    const goal = this.nearestCell(to), start = this.nearestCell(from);
    const cells = goal < 0 || start < 0 ? null : this.search(start, goal);
    if (!cells) return [];
    const points: V[] = [from, ...cells.map(c => this.centre(c))];
    const last = points[points.length - 1]!;
    points.push(this.walkable(to) && this.clear(last, to) ? to : last);
    return this.straighten(points);
  }

  private centre(cell: number): V {
    return { x: (cell % this.cols) * CELL + CELL / 2, y: Math.floor(cell / this.cols) * CELL + CELL / 2 };
  }

  private isSolid(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.cols || y >= this.rows || this.solid[y * this.cols + x] === 1;
  }

  private estimate(a: number, b: number) {
    const p = this.centre(a), q = this.centre(b);
    return Math.hypot(p.x - q.x, p.y - q.y) / CELL;
  }

  // A* over the grid. Diagonal steps only when both cells beside them are open.
  private search(start: number, goal: number): number[] | null {
    const cost = new Map<number, number>([[start, 0]]);
    const came = new Map<number, number>();
    const done = new Set<number>();
    const open = new Heap();
    open.push(this.estimate(start, goal), start);
    while (open.size) {
      const cur = open.pop();
      if (cur === goal) {
        const path = [cur];
        for (let c = came.get(cur); c !== undefined; c = came.get(c)) path.push(c);
        return path.reverse();
      }
      if (done.has(cur)) continue;
      done.add(cur);
      const cx = cur % this.cols, cy = Math.floor(cur / this.cols);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if ((dx === 0 && dy === 0) || this.isSolid(nx, ny)) continue;
          const diagonal = dx !== 0 && dy !== 0;
          if (diagonal && (this.isSolid(cx + dx, cy) || this.isSolid(cx, cy + dy))) continue;
          const next = ny * this.cols + nx;
          const g = cost.get(cur)! + (diagonal ? DIAGONAL : 1);
          const old = cost.get(next);
          if (done.has(next) || (old !== undefined && old <= g)) continue;
          cost.set(next, g);
          came.set(next, cur);
          open.push(g + this.estimate(next, goal), next);
        }
      }
    }
    return null;
  }

  private nearestCell(p: V) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    for (let r = 0; r < 13; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && !this.isSolid(cx + dx, cy + dy)) return (cy + dy) * this.cols + cx + dx;
        }
      }
    }
    return -1;
  }

  private straighten(points: V[]) {
    const result = [points[0]!];
    let i = 0;
    while (i < points.length - 1) {
      let j = points.length - 1;
      while (j > i + 1 && !this.clear(points[i]!, points[j]!)) j--;
      result.push(points[j]!);
      i = j;
    }
    return result;
  }

  private clear(a: V, b: V) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      if (!this.walkable({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
    }
    return true;
  }
}

/** A binary min-heap of (priority, cell). */
class Heap {
  private readonly keys: number[] = [];
  private readonly vals: number[] = [];

  get size() {
    return this.keys.length;
  }

  push(k: number, v: number) {
    let i = this.keys.length;
    this.keys.push(k);
    this.vals.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p]! <= k) break;
      this.keys[i] = this.keys[p]!;
      this.vals[i] = this.vals[p]!;
      i = p;
    }
    this.keys[i] = k;
    this.vals[i] = v;
  }

  pop() {
    const top = this.vals[0]!;
    const k = this.keys.pop()!, v = this.vals.pop()!;
    const n = this.keys.length;
    if (n) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i, mk = k;
        if (l < n && this.keys[l]! < mk) (m = l), (mk = this.keys[l]!);
        if (r < n && this.keys[r]! < mk) m = r;
        if (m === i) break;
        this.keys[i] = this.keys[m]!;
        this.vals[i] = this.vals[m]!;
        i = m;
      }
      this.keys[i] = k;
      this.vals[i] = v;
    }
    return top;
  }
}
