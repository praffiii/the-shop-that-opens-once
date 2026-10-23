// The shape of a place's ground, from its height.png (ported from the game's Core/Relief.cs): how high each art
// pixel's surface stands, and whether it stands upright (a cliff or bank face). The art is drawn as the camera sees
// it, so a pixel at row r on a surface h px high sits at depth r + h; seen along the camera's tilt every pixel lands
// back where it was drawn, seen in perspective the cliffs stand up and the ground recedes.
import { Lean, Mesh } from './space';

export class Relief {
  private readonly height: Int16Array;
  private readonly upright: Uint8Array;
  private readonly w: number;
  private readonly rows: number;

  /** img is the place's height.png (red: height + 64, green: upright), its top left at origin. */
  constructor(img: ImageData, private readonly origin: [number, number]) {
    this.w = img.width;
    this.rows = img.height;
    this.height = new Int16Array(this.w * this.rows);
    this.upright = new Uint8Array(this.w * this.rows);
    for (let i = 0; i < this.w * this.rows; i++) {
      this.height[i] = img.data[i * 4]! - 64;
      this.upright[i] = img.data[i * 4 + 1]! > 127 ? 1 : 0;
    }
  }

  private index(x: number, y: number) {
    const cx = Math.min(Math.max(x - this.origin[0], 0), this.w - 1);
    const cy = Math.min(Math.max(y - this.origin[1], 0), this.rows - 1);
    return cy * this.w + cx;
  }

  at(x: number, y: number) {
    return this.height[this.index(x, y)]!;
  }

  /** The ground under feet: the pixel just behind the feet line. */
  under(x: number, y: number) {
    return this.at(Math.floor(x), Math.floor(y) - 1);
  }

  /** How high to stand something tall px tall that leans to face the camera, so the ground behind never covers it. */
  stand(x: number, y: number, tall: number) {
    const fx = Math.floor(x), fy = Math.floor(y) - 1;
    let h = this.at(fx, fy);
    for (let up = 1; up <= tall; up++) h = Math.max(h, this.at(fx, fy - up) - Lean(up));
    return h;
  }

  private standing(x: number, y: number) {
    return this.upright[this.index(x, y)] === 1;
  }

  /**
   * The ground under a chunk (art px x0, y0, w, h) as a mesh showing that chunk's picture. Each column of pixels is
   * one strip: a flat pixel spans a row of depth, an upright one a pixel of height; straight runs are merged, and
   * where neighbouring columns differ a side wall closes the gap, textured with the higher column's pixels.
   */
  mesh(x0: number, y0: number, w: number, h: number, last: boolean): Mesh {
    const m = new Mesh();
    const n = h * 2 + (last ? 0 : 1);
    // (depth, height, texture row) of each row's top and bottom, down one column and the one left of it.
    let left: number[][] = Array.from({ length: n }, () => [0, 0, 0]);
    let here: number[][] = Array.from({ length: n }, () => [0, 0, 0]);
    const tex = (x: number, row: number): [number, number] => [x - x0, row - y0];
    const same = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    for (let x = x0 - 1; x < x0 + w; x++) {
      for (let r = y0; r < y0 + h; r++) {
        const hh = this.at(x, r), k = (r - y0) * 2;
        here[k] = [r + hh, hh, r];
        here[k + 1] = this.standing(x, r) ? [r + hh, hh - 1, r + 1] : [r + 1 + hh, hh, r + 1];
      }
      if (n % 2 === 1) {
        const hh = this.at(x, y0 + h);
        here[n - 1] = [y0 + h + hh, hh, y0 + h];
      }
      if (x >= x0) {
        const line: number[][] = [];
        for (const p of here) add(line, p);
        for (let k = 0; k < line.length - 1; k++) {
          const a = line[k]!, b = line[k + 1]!;
          m.quad(
            [x, a[1]!, a[0]!], [x + 1, a[1]!, a[0]!], [x + 1, b[1]!, b[0]!], [x, b[1]!, b[0]!],
            tex(x, a[2]!), tex(x + 1, a[2]!), tex(x + 1, b[2]!), tex(x, b[2]!),
          );
        }
        for (let k = 0; k < n - 1; k++) {
          const la = left[k]!, lb = left[k + 1]!, ha = here[k]!, hb = here[k + 1]!;
          if (same(la, ha) && same(lb, hb)) continue;
          const col = Math.max(la[1]!, lb[1]!) >= Math.max(ha[1]!, hb[1]!) ? x - 1 : x;
          const u = Math.min(Math.max(col, x0), x0 + w - 1) + 0.5;
          m.quad(
            [x, la[1]!, la[0]!], [x, lb[1]!, lb[0]!], [x, hb[1]!, hb[0]!], [x, ha[1]!, ha[0]!],
            tex(u, la[2]!), tex(u, lb[2]!), tex(u, hb[2]!), tex(u, ha[2]!),
          );
        }
      }
      [left, here] = [here, left];
    }
    return m;
  }
}

// Adds a point to a column's line; a point going on straight from the last two replaces the last.
function add(line: number[][], p: number[]) {
  const n = line.length;
  const last = line[n - 1];
  if (last && last[0] === p[0] && last[1] === p[1] && last[2] === p[2]) return;
  if (n > 1) {
    const b0 = line[n - 2]!, b1 = last!;
    const a = [b1[0]! - b0[0]!, b1[1]! - b0[1]!, b1[2]! - b0[2]!];
    const b = [p[0]! - b1[0]!, p[1]! - b1[1]!, p[2]! - b1[2]!];
    const cross = [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
    const dot = a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    if (cross[0]! ** 2 + cross[1]! ** 2 + cross[2]! ** 2 < 1e-6 && dot > 0) {
      line[n - 1] = [...p];
      return;
    }
  }
  line.push([...p]);
}
