// Star on GitHub, as a piece of the game's kit: a small wooden sign with the GitHub mark in pixels, and a slot
// holding a pixel star and the repository's stars. When it first comes into view the star fills gold with a pop and
// a burst of sparks (the strike's sparks, from the game's Meter) and the count runs up to the stars it has; a hover
// or a focus throws the sparks again. The count only shows once there is a star to count.
import { sound } from './sound';

const REPO = 'praffiii/the-shop-that-opens-once';
/** The star, drawn here in the game's way, a pixel at a time: its outline, fill and highlight. */
const STAR = [
  '.....#.....',
  '....#o#....',
  '....#o#....',
  '####ooo####',
  '#hhooooooo#',
  '.#hoooooo#.',
  '..#ooooo#..',
  '..#ooooo#..',
  '.#oo#.#oo#.',
  '.#o#...#o#.',
  '.##.....##.',
];
const INK = '#2a1b22', GOLD = '#ffc35a', SHINE = '#fff7c8';
/** GitHub's mark (Octicons' mark-github, 16 px), drawn into the page at its own 16 px and kept to whole pixels. */
const MARK =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';
/** How long the count runs up, the sparks fly, and the least time between two bursts (s). */
const COUNT = 0.9, SPARK = 0.6, AGAIN = 0.6;
/** The sparks' throw and fall (art px per second), harder than the Meter's so they clear the cream slot. */
const THROW = { x: 60, up: 60, more: 50 }, FALL = 220;

function star(filled: boolean) {
  const fill = { '#': INK, o: filled ? GOLD : 'none', h: filled ? SHINE : 'none' } as const;
  const rects = STAR.flatMap((row, y) =>
    [...row].map((c, x) => (c in fill && fill[c as keyof typeof fill] !== 'none' ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill[c as keyof typeof fill]}"/>` : '')),
  );
  return `<svg viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

// The mark at 16 px in the paper colour, each pixel either in or out, as the art is.
function mark() {
  const c = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
  const g = c.getContext('2d')!;
  g.fillStyle = '#fffaf0';
  g.fill(new Path2D(MARK));
  const img = g.getImageData(0, 0, 16, 16);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i]! >= 128 ? 255 : 0;
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

export class Stars {
  private readonly star: HTMLElement;
  private readonly count: HTMLElement;
  private stars = 0;
  private shown = false;
  private last = -AGAIN;

  constructor(link: HTMLAnchorElement) {
    link.querySelector<HTMLImageElement>('.stars-mark')!.src = mark();
    this.star = link.querySelector('.stars-star')!;
    this.count = link.querySelector('.stars-n')!;
    this.star.innerHTML = star(false);
    const seen = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      seen.disconnect();
      this.shown = true;
      this.fill();
    }, { threshold: 1 });
    seen.observe(link);
    for (const type of ['pointerenter', 'focus'] as const) link.addEventListener(type, () => this.shown && this.burst());
    void this.load();
  }

  // The repository's stars, if GitHub answers; without them the star still fills, with no number.
  private async load() {
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}`);
      if (!r.ok) return;
      const { stargazers_count: n } = (await r.json()) as { stargazers_count: number };
      this.stars = n;
      if (this.shown) this.run();
    } catch {
      /* offline, or GitHub's rate limit: the sign still links */
    }
  }

  private fill() {
    this.star.innerHTML = star(true);
    this.star.classList.remove('pop');
    void this.star.offsetWidth;
    this.star.classList.add('pop');
    sound.play('ting', 0.4, 1.25);
    this.burst();
    this.run();
  }

  // The count runs up from nothing, easing to rest on the stars it has.
  private run() {
    if (this.stars < 1) return;
    const start = performance.now(), n = this.stars;
    this.count.hidden = false;
    const step = (ms: number) => {
      const k = Math.min(1, (ms - start) / 1000 / COUNT);
      this.count.textContent = `${Math.round(n * (1 - (1 - k) ** 3))}`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Sparks fly up off the star and fall away, as from a good strike (Meter.Sparks).
  private burst() {
    const now = performance.now() / 1000;
    if (now - this.last < AGAIN || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.last = now;
    const sparks = Array.from({ length: 10 }, (_, i) => {
      const s = document.createElement('i');
      s.className = 'stars-spark';
      s.style.background = i % 2 === 0 ? SHINE : GOLD;
      this.star.append(s);
      return { s, vx: (Math.random() * 2 - 1) * THROW.x, vy: -THROW.up - Math.random() * THROW.more };
    });
    const start = performance.now();
    const step = (ms: number) => {
      const t = (ms - start) / 1000;
      for (const { s, vx, vy } of sparks) {
        s.style.setProperty('--x', `${Math.round(vx * t)}`);
        s.style.setProperty('--y', `${Math.round(vy * t + FALL * t * t)}`);
        s.style.opacity = `${1 - t / SPARK}`;
      }
      if (t < SPARK) return requestAnimationFrame(step);
      for (const { s } of sparks) s.remove();
    };
    requestAnimationFrame(step);
  }
}
