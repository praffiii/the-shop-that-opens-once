// The edge of Bellwood behind the page, all of it the game's own art: the clouds of the sunset sky (ui/sunset_sky,
// one colour for each time of day) drifting over the far hills, and a strip of the village's ground with its trees,
// hedges, meadow grass, lamps and carts cut from the square's atlas by name. The ground takes the game's grade for
// the time of day, the shader's sum as an SVG colour matrix; its grass sways as the game's does, butterflies are out
// by day, and the lamps and fireflies glow after dark.
import { ART } from './hero';
import { json, unroll, type Grades, type Item, type Place } from './world/data';
import { PHASES } from './world/grade';

/** The ground strip's height in art px, and the row its things stand on. */
const H = 136, BASE = 120;
/** The sunset sky: four frames 256 px wide, its three clouds round these centres (export-cast.js, sprint). */
const SKY_W = 256, CLOUDS: [number, number][] = [[40, 14], [120, 22], [214, 10]];
/** The sky's frame at each time of day (0 morning .. 3 night): its white clouds until midday, then dusk, then sunset. */
const CLOUD_AT = [0, 0, 2, 3];
/**
 * The clouds over the page: which cloud, where across and down the window (fractions), drift in art px a second. They
 * keep to the top of the sky, over the words rather than through them.
 */
const DRIFT: { k: number; x: number; y: number; v: number; flip?: boolean }[] = [
  { k: 0, x: 0.06, y: 0.07, v: 1.6 },
  { k: 2, x: 0.46, y: 0.02, v: 1.1 },
  { k: 1, x: 0.8, y: 0.12, v: 2 },
  { k: 0, x: 0.3, y: 0.14, v: 0.8, flip: true },
  { k: 2, x: 0.64, y: 0.08, v: 1.3, flip: true },
];

/**
 * The village's ground, as laid out: a piece by name, how far from its side (art px to its middle), and how deep in
 * the grass its feet stand (nearer is drawn over). Left and right pieces keep to their half of the window; the middle
 * ones show only where the window is wide.
 */
type Side = 'left' | 'mid' | 'right';
const GROUND: [name: string, side: Side, x: number, deep: number][] = [
  ['blossom_1', 'left', 26, 2],
  ['bush', 'left', 76, 8],
  ['lamp_0', 'left', 100, 5],
  ['meadow_0', 'left', 112, 11],
  ['flowers_0', 'left', 130, 13],
  ['bench_w', 'left', 158, 6],
  ['meadow_1', 'left', 186, 10],
  ['butterfly_0', 'left', 128, 4],
  ['hedge_0', 'mid', -44, 4],
  ['hedge_1', 'mid', -4, 4],
  ['flowers_1', 'mid', -62, 12],
  ['meadow_2', 'mid', 26, 11],
  ['bush', 'mid', 58, 9],
  ['oak_w', 'right', 40, 2],
  ['blossom_2', 'right', 104, 4],
  ['meadow_0', 'right', 62, 12],
  ['crates', 'right', 128, 9],
  ['cart', 'right', 162, 8],
  ['barrel', 'right', 192, 11],
  ['flowers_2', 'right', 106, 14],
  ['lamp_1', 'right', 214, 5],
  ['butterfly_3', 'right', 150, 3],
];
/** Fireflies over the grass after dark: where across (a fraction of the window) and how deep. */
const FIREFLIES: [x: number, deep: number][] = [[0.1, 3], [0.34, 6], [0.52, 2], [0.71, 5], [0.9, 4]];

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

interface Piece {
  item: Item;
  frames: number[];
  x: number;
  y: number;
  /** Where this piece's sway starts in its wave, as the shader's per-piece phase. */
  phase: number;
}

function layer(cls: string) {
  const c = document.createElement('canvas');
  c.className = cls;
  return [c, c.getContext('2d')!] as const;
}

export class Land {
  private readonly el = document.createElement('div');
  private readonly sky = layer('land-sky');
  private readonly ground = layer('land-ground');
  private readonly lights = layer('land-lights');
  private readonly matrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
  private atlas!: HTMLImageElement;
  private place!: Place;
  private grades!: Grades;
  /** Each cloud cut from each of the sky's four frames. */
  private clouds: HTMLCanvasElement[][] = [];
  private pieces: Piece[] = [];
  private glows: Piece[] = [];
  private bugs: Piece[] = [];
  private hills!: HTMLImageElement;
  private scale = 2;
  private cloudScale = 3;
  private graded = NaN;
  private readonly still = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(parent: HTMLElement) {
    this.el.className = 'land';
    this.el.setAttribute('aria-hidden', 'true');
    // The grade as a filter: sRGB, as the game's shader grades.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = 'land-grade';
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.append(this.matrix);
    svg.append(filter);
    this.el.append(svg, this.sky[0], this.ground[0], this.lights[0]);
    parent.prepend(this.el);
  }

  async load() {
    const image = async (url: string) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    };
    const [place, atlas, sky, hills, grades] = await Promise.all([
      json<Place>(`${ART}/places/square/day/place.json`),
      image(`${ART}/places/square/day/atlas_0.png`),
      image(`${ART}/ui/sunset_sky.png`),
      image(`${ART}/ui/far_hills.png`),
      json<Grades>(`${ART}/grades.json`),
    ]);
    Object.assign(this, { place, atlas, hills, grades });
    this.clouds = this.cut(sky);
    this.resize();
  }

  /** Each cloud out of each frame of the sky: the pixels that differ from the sky band beside them. */
  private cut(sky: HTMLImageElement) {
    const c = document.createElement('canvas');
    [c.width, c.height] = [sky.width, sky.height];
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(sky, 0, 0);
    return [0, 1, 2, 3].map(f =>
      CLOUDS.map(([cx, cy]) => {
        const [x0, y0, w, h] = [f * SKY_W + cx - 20, cy - 8, 41, 10];
        const src = g.getImageData(x0, y0, w, h), band = g.getImageData(f * SKY_W, y0, 1, h).data;
        for (let j = 0; j < h; j++)
          for (let i = 0; i < w; i++) {
            const p = (j * w + i) * 4;
            if ([0, 1, 2].every(n => src.data[p + n] === band[j * 4 + n])) src.data[p + 3] = 0;
          }
        const out = document.createElement('canvas');
        [out.width, out.height] = [w, h];
        out.getContext('2d')!.putImageData(src, 0, 0);
        return out;
      }),
    );
  }

  resize() {
    if (!this.place) return;
    const w = document.documentElement.clientWidth, h = innerHeight;
    this.scale = h >= 1200 ? 3 : 2;
    this.cloudScale = w >= 900 ? this.scale * 2 : this.scale + 1;
    const W = Math.ceil(w / this.scale);
    const size = (c: HTMLCanvasElement, cw: number, ch: number, s: number) => {
      [c.width, c.height] = [cw, ch];
      Object.assign(c.style, { width: `${cw * s}px`, height: `${ch * s}px` });
    };
    size(this.sky[0], Math.ceil(w / this.cloudScale), Math.ceil(h / this.cloudScale), this.cloudScale);
    size(this.ground[0], W, H, this.scale);
    size(this.lights[0], W, H, this.scale);
    this.lay(W);
    this.graded = NaN;
  }

  /** Stands the ground's pieces along the strip for a window W art px across. */
  private lay(W: number) {
    const named = (name: string) => this.place.items.find(i => i.name === name)!;
    const stand = (item: Item, mid: number, deep: number): Piece => {
      const feet = item.y - item.at[1];
      return {
        item,
        frames: unroll(item.seq),
        x: Math.round(mid - item.size[0] / 2),
        y: BASE + deep - feet,
        phase: item.at[0] * 0.013 + item.at[1] * 0.004,
      };
    };
    const laid = GROUND.filter(([, side, x]) => (side === 'mid' ? W >= 560 : x < W / 2)).map(([name, side, x, deep]) => {
      const mid = side === 'left' ? x : side === 'right' ? W - x : W / 2 + x;
      return { piece: stand(named(name), mid, deep), deep };
    });
    laid.sort((a, b) => a.deep - b.deep);
    this.pieces = laid.map(l => l.piece);
    // A lamp's lit glass stands where it does on the lamp in the square.
    this.glows = this.pieces.flatMap(p => {
      const lit = this.place.items.find(i => i.name === `${p.item.name}_lit_0`);
      return lit ? [{ ...p, item: lit, frames: unroll(lit.seq), x: p.x + lit.at[0] - p.item.at[0], y: p.y + lit.at[1] - p.item.at[1] }] : [];
    });
    const fly = named('firefly_0_0');
    this.bugs = FIREFLIES.map(([x, deep], k) => ({ ...stand(fly, x * W, deep - 14), phase: k * 37 }));
  }

  /** Draws the land at clock t (s) and time of day `time` (0 morning .. 3 night). */
  frame(t: number, time: number) {
    if (!this.place) return;
    if (this.still.matches) t = 0;
    this.grade(time);
    this.drawSky(t, time);
    this.drawGround(t, time);
  }

  /** The game's grade at this time, as the shader's sum: v * mul + (add + shade * (1 - luma)) / 255. */
  private grade(time: number) {
    if (Math.abs(time - this.graded) < 0.005) return;
    this.graded = time;
    const i = Math.min(Math.floor(time), 2), k = clamp01(time - i);
    const [a, b] = [this.grades[PHASES[i]!], this.grades[PHASES[i + 1]!]];
    const mix = (x: number[], y: number[], n: number) => x[n]! + (y[n]! - x[n]!) * k;
    const rows = [0, 1, 2].map(n => {
      const [m, add, shade] = [mix(a.mul, b.mul, n), mix(a.add, b.add, n) / 255, mix(a.shade, b.shade, n) / 255];
      const row = [0.299, 0.587, 0.114].map((l, c) => (c === n ? m : 0) - l * shade);
      return [...row, 0, add + shade].join(' ');
    });
    this.matrix.setAttribute('values', `${rows.join(' ')} 0 0 0 1 0`);
  }

  private drawSky(t: number, time: number) {
    const [c, g] = this.sky;
    g.clearRect(0, 0, c.width, c.height);
    const i = Math.min(Math.floor(time), 2), k = clamp01(time - i);
    const [fa, fb] = [CLOUD_AT[i]!, CLOUD_AT[i + 1]!];
    // Toward night the clouds thin out against the dark.
    const fade = 1 - 0.85 * clamp01(time - 2);
    for (const d of DRIFT) {
      const a = this.clouds[fa]![d.k]!, b = this.clouds[fb]![d.k]!;
      const span = c.width + a.width;
      const x = Math.floor((((d.x * c.width + d.v * t) % span) + span) % span) - a.width;
      // On a phone the words start near the top, so the clouds keep higher still.
      const y = Math.round(d.y * c.height * (this.cloudScale === this.scale * 2 ? 1 : 0.55));
      g.save();
      if (d.flip) g.setTransform(-1, 0, 0, 1, x * 2 + a.width, 0);
      g.globalAlpha = fade;
      g.drawImage(a, x, y);
      if (fb !== fa && k > 0) {
        g.globalAlpha = fade * k;
        g.drawImage(b, x, y);
      }
      g.restore();
    }
  }

  private drawGround(t: number, time: number) {
    const [c, g] = this.ground;
    const sample = Math.floor(t * this.place.fps) % this.place.loop;
    g.clearRect(0, 0, c.width, c.height);
    // The far hills across the bay, tiled, then the grass the village stands on.
    for (let x = 0; x < c.width; x += this.hills.width) g.drawImage(this.hills, x, BASE - this.hills.height + 2);
    g.fillStyle = '#86cc55';
    g.fillRect(0, BASE, c.width, H - BASE);
    g.fillStyle = '#b6e36b';
    g.fillRect(0, BASE, c.width, 1);
    g.fillStyle = '#5aac4c';
    g.fillRect(0, H - 4, c.width, 4);
    // The butterflies go before dusk; the lamps are lit by it, and the fireflies come out after it.
    const [day, lit, bugs] = [1 - clamp01((time - 1.5) / 0.4), clamp01((time - 1.4) / 0.6), clamp01((time - 2.3) / 0.5)];
    for (const p of this.pieces) {
      if (p.item.day) g.globalAlpha = day;
      if (g.globalAlpha > 0) this.draw(g, p, sample, t);
      g.globalAlpha = 1;
    }
    // The lamps' glass and the fireflies are never graded.
    const [lc, lg] = this.lights;
    lg.clearRect(0, 0, lc.width, lc.height);
    for (const [all, a] of [[this.glows, lit], [this.bugs, bugs]] as const) {
      if (a <= 0) continue;
      lg.globalAlpha = a;
      for (const p of all) this.draw(lg, p, sample, t);
    }
    lg.globalAlpha = 1;
  }

  /** One piece at this sample of the loop, its rows bent by the wind if it sways (the shader's texel()). */
  private draw(g: CanvasRenderingContext2D, p: Piece, sample: number, t: number) {
    const { item } = p, [w, h] = item.size;
    const [fx, fy] = item.frames[p.frames[(sample + Math.round(p.phase)) % p.frames.length]!]!;
    const sway = item.sway ?? 0;
    if (!sway) return g.drawImage(this.atlas, fx, fy, w, h, p.x, p.y, w, h);
    const wave = Math.sin(t * 1.6 + p.phase) * 0.7 + Math.sin(t * 0.55 + p.phase * 1.9) * 0.3;
    for (let row = 0; row < h; row++) {
      const up = clamp01((h - row - 0.5) / h);
      const bend = clamp01((up - 0.3) / 0.7) ** 1.5;
      const dx = Math.floor(sway * bend * wave + 0.5);
      g.drawImage(this.atlas, fx, fy + row, w, 1, p.x + dx, p.y + row, w, 1);
    }
  }
}
