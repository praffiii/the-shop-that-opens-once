// The Mender's gear bench, ported from the game's Minigames/ClockworkAlign.cs on its Board (UI/Board.cs): the great
// wheel, the third wheel and the escape wheel seated in turn from the left (W / S pick one, A / D turn it a step, and
// it is seated when its red mark points up at the plate's arrow; turning one before the wheel on its left is seated
// slips it), then the pendulum swings with its rate wandering, and Space sets the watch going while it reads 3.0 Hz.
// A fail jolts the board and the Mender (or Satria, to himself) says his line; R starts it over with nothing lost.
// The play area is drawn at the art's own pixels and scaled by whole device pixels; the key caps are buttons too.
import { lang } from './lang';
import { sound } from './sound';
import { Talk } from './talk';

const STEPS = 12;
/** Each wheel's piece, its middle on the bench and how far its teeth reach (art px). */
const WHEELS = [
  { piece: 'gear_great', x: 38, y: 33, reach: 23 },
  { piece: 'gear_third', x: 78, y: 33, reach: 17 },
  { piece: 'gear_escape', x: 106, y: 33, reach: 12 },
] as const;
const START = [5, 8, 3];
/** The pendulum's rate from the meter's left end to its right (Hz), and the band that sets the watch going. */
const SLOW_HZ = 2, FAST_HZ = 4, BAND = [0.44, 0.56] as const;
/** The play area (art px), and the meter's place, gauge and rim in it (Meter). */
const AREA = { w: 200, h: 92 }, METER = 74, NOTCH = 3, GAUGE = 12, RIM = 2;
/** Frames in each strip, laid side by side. */
const FRAMES: Record<string, number> = { gear_great: 12, gear_third: 12, gear_escape: 12, pendulum: 7, notch: 2, pip: 2 };
const PIECES = [...Object.keys(FRAMES), 'baize', 'bracket', 'gauge', 'glow', 'needle'];
const SHAKE = 0.3, SPARK = 0.35, PULSE = 5;
/** How far a drag goes (art px) to turn a wheel one step. */
const DRAG = 8;
/** How far the title plate stands over the bench's top edge (Board); the bench's padding is the page's CSS. */
const OVER = 9;

type Input = 'up' | 'down' | 'left' | 'right' | 'go' | 'retry';
type Mode = 'play' | 'fail' | 'won';
type Words = Record<'en' | 'id', string>;

/** The keys the bench reads, as the game's Controls. */
const KEYS: Record<string, Input> = {
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'go',
  KeyR: 'retry',
};
const FAIL = {
  a: { who: 'mender', name: 'Mender', line: "Easy, Satria. Old clockwork is like an old ant: don't force it, don't hurry it. Breathe. We'll seat them again, from the great wheel on the left." },
  b: { who: 'courier', name: 'Satria', line: "It's running a beat too fast... Twenty years still. No wonder its insides need time to find their rhythm again." },
};
/** The page's own words: what each key cap does as a button, and the row once the watch is going. */
const SAY = {
  up: { en: 'Pick the wheel before', id: 'Pilih roda sebelumnya' },
  down: { en: 'Pick the next wheel', id: 'Pilih roda berikutnya' },
  left: { en: 'Turn it one way', id: 'Putar ke satu arah' },
  right: { en: 'Turn it the other way', id: 'Putar ke arah lain' },
  again: { en: 'Take it apart again', id: 'Bongkar lagi' },
} satisfies Record<string, Words>;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement) => {
  const e = document.createElement(tag);
  e.className = cls;
  parent.append(e);
  return e;
};

const image = (name: string) =>
  new Promise<HTMLImageElement>((done, fail) => {
    const i = new Image();
    i.onload = () => done(i);
    i.onerror = fail;
    i.src = `/art/ui/${name}.png`;
  });

export class Mend {
  private readonly bench: HTMLElement;
  private readonly plate: HTMLElement;
  private readonly screen: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private readonly rate: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly talk: Talk;
  private art: Record<string, HTMLImageElement> = {};
  private unit = 2;
  private readonly turned = [...START];
  private picked = 0;
  private mode: Mode = 'play';
  /** The pendulum's clock, the board's jolt, the sparks' age and the glow's breath. */
  private t = 0;
  private shake = 0;
  private spark = -1;
  private sparks: { x: number; vx: number; vy: number; hot: boolean }[] = [];
  private clock = 0;
  private needle = 0;
  /** What the rows were last built for, so a press doesn't rebuild the button under it. */
  private built = '';

  constructor(private readonly win: HTMLElement) {
    const root = el('div', 'mend', win);
    this.bench = el('div', 'mend-bench', root);
    this.plate = el('div', 'mend-plate', this.bench);
    const area = el('div', 'mend-area', this.bench);
    this.screen = el('canvas', 'mend-play', area);
    Object.assign(this.screen, { width: AREA.w, height: AREA.h });
    this.screen.setAttribute('aria-hidden', 'true');
    this.g = this.screen.getContext('2d')!;
    this.rate = el('span', 'mend-rate', area);
    this.rows = el('div', 'mend-rows', this.bench);
    this.talk = new Talk(win, () => this.unit, () => ({ left: 0, width: win.clientWidth }));
    this.hands();
    win.style.setProperty('--k', `${this.unit}`);
    new ResizeObserver(() => this.fit()).observe(root);
    lang.listeners.add(() => this.paint());
  }

  async load() {
    const all = await Promise.all(PIECES.map(image));
    this.art = Object.fromEntries(PIECES.map((p, i) => [p, all[i]!]));
    this.reset();
  }

  // A mouse or a finger: press a wheel to take it in hand and drag across to turn it a step at a time; once all three
  // are seated, a tap sets it going.
  private hands() {
    let drag: { x: number; wheel: number } | null = null;
    const at = (e: PointerEvent) => {
      const r = this.screen.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * AREA.w) / r.width, y: ((e.clientY - r.top) * AREA.h) / r.height };
    };
    this.screen.addEventListener('pointerdown', e => {
      if (this.talk.open) return this.talk.press();
      if (this.mode !== 'play') return;
      if (this.seated) return this.press('go');
      const p = at(e);
      const wheel = WHEELS.findIndex(w => Math.hypot(p.x - w.x, p.y - w.y) <= w.reach + 4);
      if (wheel < 0) return;
      if (wheel !== this.picked) {
        this.picked = wheel;
        sound.play('pop');
      }
      drag = { x: p.x, wheel };
      this.screen.setPointerCapture(e.pointerId);
    });
    this.screen.addEventListener('pointermove', e => {
      const x = drag && at(e).x;
      // A step for each length dragged, till the wheel seats or slips.
      while (drag && x !== null && Math.abs(x - drag.x) >= DRAG) {
        const right = x > drag.x;
        drag.x += right ? DRAG : -DRAG;
        this.press(right ? 'right' : 'left');
        if (this.mode !== 'play' || this.turned[drag.wheel] === 0) drag = null;
      }
    });
    for (const type of ['pointerup', 'pointercancel'] as const) this.screen.addEventListener(type, () => (drag = null));
  }

  /** A key while the bench is in view: true when the bench took it, so the page doesn't scroll. */
  key(code: string) {
    const input = KEYS[code];
    if (!input) return false;
    // Space scrolls the page unless the bench is waiting on it.
    if (input === 'go' && !(this.mode === 'play' && this.seated) && !this.talk.open) return false;
    this.press(input);
    return true;
  }

  private press(input: Input) {
    if (this.talk.open && input !== 'retry') return this.talk.press();
    if (this.mode !== 'play') {
      if (input !== 'retry') return;
      this.talk.end();
      this.talk.close();
      sound.play('pop');
      return this.reset();
    }
    if (input === 'retry') return;
    if (!this.seated) this.seat(input);
    else if (input === 'go') this.go();
    this.paint();
  }

  private get seated() {
    return this.turned.every(n => n === 0);
  }

  private seat(input: Input) {
    if (input === 'up' || input === 'down') {
      this.picked = (this.picked + (input === 'down' ? 1 : WHEELS.length - 1)) % WHEELS.length;
      sound.play('pop');
      return;
    }
    if (input !== 'left' && input !== 'right') return;
    if (this.picked > 0 && this.turned[this.picked - 1] !== 0) {
      sound.play('ting');
      return this.lose('a');
    }
    this.turned[this.picked] = (this.turned[this.picked]! + (input === 'right' ? STEPS - 1 : 1)) % STEPS;
    sound.play('click');
    if (this.turned[this.picked] === 0) {
      sound.play('latch');
      if (this.picked < WHEELS.length - 1) this.picked++; // on to the next wheel
      if (this.seated) this.t = 0;
    }
  }

  private go() {
    if (this.needle < BAND[0] || this.needle > BAND[1]) return this.lose('b');
    this.mode = 'won';
    this.needle = 0.5;
    this.spark = 0;
    this.sparks = Array.from({ length: 6 }, (_, i) => ({
      x: this.meterX(this.needle),
      vx: Math.random() * 80 - 40,
      vy: -30 - Math.random() * 40,
      hot: i % 2 === 0,
    }));
    sound.play('ticktock');
    sound.play('chime');
  }

  // Jolts the board, then whoever it is says his line; R tries again.
  private lose(which: keyof typeof FAIL) {
    this.mode = 'fail';
    this.shake = SHAKE;
    sound.play('wrong');
    const f = FAIL[which];
    setTimeout(() => {
      if (this.mode === 'fail') void this.talk.say(f.name, f.who, f.line).then(() => this.talk.close());
    }, SHAKE * 1000);
  }

  private reset() {
    START.forEach((n, i) => (this.turned[i] = n));
    Object.assign(this, { picked: 0, mode: 'play', t: 0, needle: 0 });
    this.paint();
  }

  /** The largest scale the bench fits its window at, in whole device pixels and never past the page's own. */
  private fit() {
    const root = this.bench.parentElement!, dpr = devicePixelRatio || 1;
    const page = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 2;
    const w = this.bench.offsetWidth / this.unit, h = this.bench.offsetHeight / this.unit + OVER;
    const fits = Math.floor(Math.min(root.clientWidth / w, root.clientHeight / h) * dpr) / dpr;
    const unit = Math.max(1 / dpr, Math.min(page, fits));
    if (unit === this.unit) return;
    this.unit = unit;
    this.win.style.setProperty('--k', `${unit}`);
  }

  // The words: the title, and the rows of key caps for each turn of play, all laid out so the bench keeps its size,
  // with only the one for now shown (the instructions, or the key cap to try again in their place).
  private paint() {
    const l = lang.now;
    if (this.built !== l) {
      this.built = l;
      this.plate.textContent = lang.t("The watch's wheels");
      const set = (mode: Mode, rows: [[string, string, Input][], string][]) => {
        const box = el('div', 'mend-set', this.rows);
        box.dataset.for = mode;
        for (const [caps, text] of rows) {
          const keys = el('span', 'mend-keys', box);
          for (const [code, label, input] of caps) {
            const b = el('button', 'cap', keys);
            b.type = 'button';
            b.dataset.key = code;
            b.textContent = label;
            if (input in SAY) b.setAttribute('aria-label', SAY[input as keyof typeof SAY][l]);
            b.addEventListener('click', () => this.press(input));
          }
          el('span', 'mend-say', box).textContent = text;
        }
      };
      this.rows.replaceChildren();
      set('play', [
        [[['KeyW', 'W', 'up'], ['KeyS', 'S', 'down']], lang.t('Pick a wheel, from the left.')],
        [[['KeyA', 'A', 'left'], ['KeyD', 'D', 'right']], lang.t('Turn it till its red mark points up.')],
        [[['Space', lang.t('Space'), 'go']], lang.t('Set it going at 3.0 Hz.')],
      ]);
      set('fail', [[[['KeyR', 'R', 'retry']], lang.t('Try again')]]);
      set('won', [[[['KeyR', 'R', 'retry']], SAY.again[l]]]);
    }
    for (const box of this.rows.children as HTMLCollectionOf<HTMLElement>) box.inert = box.dataset.for !== this.mode;
  }

  private meterX(v: number) {
    return RIM + v * (AREA.w - 2 * RIM);
  }

  /** Advances the bench while its window is in view: the pendulum, the jolt, the sparks and the talk. */
  tick(dt: number, inView: boolean) {
    if (!inView || !this.art.baize) return;
    this.clock += dt;
    this.talk.tick(dt);
    let hz = 0;
    if (this.mode === 'won') hz = 3;
    else if (this.seated && this.mode === 'play') {
      this.t += dt;
      // the rate wanders through the band and out again, never resting in it
      this.needle = 0.5 + 0.42 * Math.sin(this.t * 1.1) + 0.06 * Math.sin(this.t * 3.7);
      hz = SLOW_HZ + (FAST_HZ - SLOW_HZ) * this.needle;
    }
    if (this.mode === 'won') this.t += dt;
    this.rate.textContent = hz ? `${hz.toFixed(1)} Hz` : '-.- Hz';
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    const jolt = this.shake ? Math.round(Math.sin((SHAKE - this.shake) * 60) * 4 * (this.shake / SHAKE)) : 0;
    this.bench.style.translate = `${jolt * this.unit}px 0`;
    if (this.spark >= 0) this.spark = this.spark + dt > SPARK ? -1 : this.spark + dt;
    this.draw(hz);
  }

  private draw(hz: number) {
    const g = this.g, a = this.art;
    g.clearRect(0, 0, AREA.w, AREA.h);
    this.nine(a.baize!, 0, 0, AREA.w, 70, 5, 5);
    WHEELS.forEach(({ piece, x, y, reach }, i) => {
      const size = a[piece]!.height;
      this.frame(piece, this.turned[i]!, x - Math.floor(size / 2), y - Math.floor(size / 2));
      this.frame('notch', 0, x - 2, y - reach - 4);
      this.frame('pip', this.turned[i] === 0 ? 1 : 0, x - 4, y + reach + 4);
    });
    if (!this.seated && this.mode !== 'won') {
      const { x, y, reach } = WHEELS[this.picked]!;
      this.nine(a.bracket!, x - reach - 4, y - reach - 4, 2 * reach + 9, 2 * reach + 9, 5, 5);
    }
    const swing = hz ? Math.round((Math.sin((this.t * Math.PI * hz) / 2) + 1) * 3) : 3;
    this.frame('pendulum', swing, 146, 6);
    // The meter: the gauge, its sweet band glowing like hot iron, the brass notches at its ends, and the needle.
    const top = METER;
    this.nine(a.gauge!, 0, top + NOTCH, AREA.w, GAUGE, 4, 4);
    const [from, to] = BAND.map(v => Math.round(this.meterX(v))) as [number, number];
    this.nine(a.glow!, from, top + NOTCH + RIM, to - from, GAUGE - 2 * RIM, 1, 4);
    const breath = (Math.sin(this.clock * PULSE) + 1) / 2;
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(255 ${Math.round(209 + 46 * breath)} ${Math.round(179 + 76 * breath)})`;
    g.fillRect(from, top + NOTCH + RIM, to - from, GAUGE - 2 * RIM);
    g.restore();
    for (const [x, y, f] of [[from - 2, 0, 0], [to - 3, 0, 0], [from - 2, NOTCH + GAUGE, 1], [to - 3, NOTCH + GAUGE, 1]] as const)
      this.frame('notch', f, x, top + y);
    g.drawImage(a.needle!, Math.round(this.meterX(this.needle)) - 3, top - 2);
    if (this.spark >= 0) {
      const t = this.spark;
      g.globalAlpha = 1 - t / SPARK;
      for (const s of this.sparks) {
        g.fillStyle = s.hot ? '#fff7c8' : '#ffc35a';
        g.fillRect(Math.round(s.x + s.vx * t), Math.round(top + NOTCH + GAUGE / 2 + s.vy * t + 160 * t * t), 3, 3);
      }
      g.globalAlpha = 1;
    }
  }

  private frame(piece: string, i: number, x: number, y: number) {
    const img = this.art[piece]!, w = img.width / FRAMES[piece]!;
    this.g.drawImage(img, i * w, 0, w, img.height, x, y, w, img.height);
  }

  // A 9-sliced piece drawn to a box, its corners whole and its edges and middle stretched.
  private nine(img: HTMLImageElement, x: number, y: number, w: number, h: number, mx: number, my: number) {
    const sw = img.width, sh = img.height;
    const cols = [[0, mx, x, mx], [mx, sw - 2 * mx, x + mx, w - 2 * mx], [sw - mx, mx, x + w - mx, mx]] as const;
    const rows = [[0, my, y, my], [my, sh - 2 * my, y + my, h - 2 * my], [sh - my, my, y + h - my, my]] as const;
    for (const [sx, sw2, dx, dw] of cols)
      for (const [sy, sh2, dy, dh] of rows) if (dw > 0 && dh > 0) this.g.drawImage(img, sx, sy, sw2, sh2, dx, dy, dw, dh);
  }
}
