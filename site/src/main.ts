import './style.css';
import { Hero } from './hero';
import { Land } from './land';
import { Bag } from './ui/bag';
import { DOING, Hud } from './ui/hud';
import { lang } from './ui/lang';
import { Mend } from './ui/mend';
import { Post } from './ui/post';
import { sound } from './ui/sound';
import { Talk } from './ui/talk';

const TALK_KEYS = new Set(['Space', 'Enter', 'KeyE']);
/** The keys that turn the bag's keepsake over, as the game's A / D. */
const TURN_KEYS: Record<string, number> = { KeyA: -1, ArrowLeft: -1, KeyD: 1, ArrowRight: 1 };
/** Whom the day's section follows, in turn as it scrolls by. */
const DAY_CAST = Object.keys(DOING);
/** The time the day's section runs to: dusk, its lamps and windows lit. */
const DUSK = 2;
/**
 * The night's section, as far through it as each beat: night has fallen, the bell tolls midnight and the door opens,
 * then the lanterns light one at each step after it.
 */
const NIGHTFALL = 0.3, MIDNIGHT = 0.38, LANTERN_STEP = 0.05;
/** How long the hero's Download takes to glide down to the shop's door (ms). */
const GLIDE = 1800;
/** The music and ambience for each time of day (as the game's), and for the shop in the grove. */
const BEDS: Record<string, Record<string, number>> = {
  0: { music_dawn: 0.35, amb_morning: 0.5 },
  1: { music_market: 0.35, amb_midday: 0.5 },
  2: { music_dusk: 0.35, amb_dusk: 0.5 },
  3: { music_night: 0.35, amb_night: 0.5 },
  shop: { music_shop: 0.35, amb_night: 0.5, crickets: 0.3 },
};
/** The page's sky at each time of day (0 morning .. 3 night), top and bottom, from the game's own sky colours. */
const SKY: [string, string][] = [
  ['#c2e6ff', '#f2faff'],
  ['#3db3e0', '#c2e6ff'],
  ['#b893d6', '#ffd3a8'],
  ['#1d2347', '#3a4585'],
];

const $ = <T extends HTMLElement>(q: string, root: ParentNode = document) => root.querySelector<T>(q)!;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/** A window into Bellwood: its frame, the screen the canvas goes in, and the still it keeps when the canvas leaves. */
interface Win {
  name: string;
  el: HTMLElement;
  screen: HTMLElement;
  still: HTMLCanvasElement;
}

function mix(a: string, b: string, k: number) {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i]! - v) * k)).join(' ')})`;
}

/** Sets the page's sky for a time of day, and the ink that reads on it. */
function sky(t: number) {
  const i = Math.min(Math.floor(t), SKY.length - 2), k = clamp01(t - i);
  const [a, b] = [SKY[i]!, SKY[i + 1]!];
  const root = document.documentElement.style;
  root.setProperty('--sky-top', mix(a[0], b[0], k));
  root.setProperty('--sky-bottom', mix(a[1], b[1], k));
  root.setProperty('--fg', t > 2.5 ? 'var(--paper)' : 'var(--ink)');
}

async function start() {
  // The windows the world shows in; the post's is the game's cream, with no world behind it.
  const wins: Win[] = [...document.querySelectorAll<HTMLElement>('.window:has(.screen)')].map(el => ({
    name: el.dataset.window!,
    el,
    screen: $('.screen', el),
    still: $<HTMLCanvasElement>('.still', el),
  }));
  const heroWin = wins.find(w => w.name === 'hero')!;
  const canvas = document.createElement('canvas');
  heroWin.screen.append(canvas);
  const hero = new Hero(canvas, matchMedia('(max-width: 720px)').matches);
  const land = new Land(document.body);
  const mend = new Mend(wins.find(w => w.name === 'mend')!.el);
  const postWin = $('[data-window=post]');
  const post = new Post(postWin);
  await Promise.all([hero.load(), land.load(), lang.load(), mend.load()]);
  const [day, night, nights] = [$('.day'), $('.night'), $('.nights')];
  let scale = 2;
  const talk = new Talk(document.body, () => scale, () => ({ left: 0, width: innerWidth }));
  const hud = new Hud(hero, talk);
  const bag = new Bag(wins.find(w => w.name === 'bag')!.el);
  hero.player.away = true;
  let current: Win | null = heroWin;
  const resize = () => {
    hero.resize();
    land.resize();
    scale = hud.scale();
  };
  resize();
  window.addEventListener('resize', resize);
  const watch = new ResizeObserver(() => current && hero.resize());
  for (const w of wins) watch.observe(w.screen);

  hero.player.ant.onStep = () => sound.step();
  let bed = '0';
  const beds = () => sound.beds(BEDS[bed]!);
  sound.listeners.add(beds);
  beds();

  // Play: the hero's window opens to fill the screen and Satria is the visitor's; Esc or Close shrinks it back.
  const morph = (change: () => void) => {
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      document.startViewTransition(change);
    else change();
  };
  const open = (on: boolean) => {
    if (on === hud.playing) return;
    if (!on) {
      talk.end();
      hero.player.ant.stop();
    }
    morph(() => {
      heroWin.el.classList.toggle('open', on);
      document.body.classList.toggle('playing', on);
      hero.resize();
    });
    hud.playing = on;
    hero.player.away = !on;
    (on ? $('.close', heroWin.el) : $('.play', heroWin.el)).focus({ preventScroll: true });
  };
  $('.play', heroWin.el).addEventListener('click', e => {
    e.stopPropagation();
    open(true);
  });
  $('.close', heroWin.el).addEventListener('click', e => {
    e.stopPropagation();
    open(false);
  });
  heroWin.el.addEventListener('click', e => {
    if (hud.playing) return;
    e.preventDefault();
    open(true);
  });

  window.addEventListener('keydown', e => {
    // The bag in view takes the keys that turn its keepsake over.
    if (!hud.playing && current?.name === 'bag' && TURN_KEYS[e.code] && !e.repeat) return bag.take(TURN_KEYS[e.code]!);
    // The bench in view takes its keys, but a focused key cap's Space or Enter is its own click.
    const onButton = e.target instanceof Element && !!e.target.closest('a, button');
    if (!hud.playing && current?.name === 'mend' && !e.repeat && !(onButton && (e.code === 'Space' || e.code === 'Enter'))) {
      if (mend.key(e.code)) e.preventDefault();
      return;
    }
    if (!hud.playing) return;
    if (e.code === 'Escape') return open(false);
    if (!TALK_KEYS.has(e.code) || e.repeat || (e.target instanceof Element && e.target.closest('a, button'))) return;
    e.preventDefault();
    if (talk.open) talk.press();
    else {
      const near = hero.near();
      if (near) void hero.talk(near, talk);
    }
  });
  // A click, not a press: on a phone a drag is not a step.
  canvas.addEventListener('click', e => {
    if (!hud.playing) return;
    if (talk.open) return talk.press();
    const p = hero.pick(e.offsetX, e.offsetY);
    const someone = hero.villagerAt(p);
    if (someone) void hero.reach(someone, talk);
    else void hero.player.goTo(p);
  });

  // The window most on screen gets the canvas; the one it leaves keeps a still of its last frame.
  const choose = (): Win | null => {
    if (hud.playing) return heroWin;
    let best: Win | null = null, most = 0;
    for (const w of wins) {
      const r = w.el.getBoundingClientRect();
      const seen = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      if (seen > most) (best = w), (most = seen);
    }
    return best;
  };
  const move = (to: Win | null, t: number) => {
    if (current && canvas.width && canvas.height) {
      // One more frame where it was, kept as that window's still.
      hero.frame(0, t);
      const { width, height } = canvas;
      Object.assign(current.still, { width, height });
      current.still.getContext('2d')!.drawImage(canvas, 0, 0);
      current.el.classList.add('away');
    }
    current = to;
    if (!to) return;
    to.el.classList.remove('away');
    to.screen.append(canvas);
    hero.resize();
    hero.snap();
  };

  // The scroll directs the world: the hero's window is the square's morning with Satria, the day's runs morning to
  // dusk with the villagers at work, the night's falls on the grove till the bell tolls and the shop opens; and the
  // page's sky moves with it.
  const through = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, p: clamp01(-r.top / Math.max(1, r.height - innerHeight)) };
  };
  const shop = { open: false, lit: 0 };
  // The hero's Download glides down the page to the shop's door, the day running by on the way to midnight; a wheel,
  // a touch or a key takes the scroll back. With reduced motion it is the link's own jump.
  let gliding = false;
  $('.hero .go').addEventListener('click', e => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    const from = scrollY, to = $('#download').getBoundingClientRect().top + scrollY, start = performance.now();
    const stop = () => (gliding = false);
    for (const type of ['wheel', 'touchstart', 'keydown'] as const) addEventListener(type, stop, { once: true, passive: true });
    gliding = true;
    const step = (ms: number) => {
      if (!gliding) return;
      const k = Math.min(1, (ms - start) / GLIDE), ease = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      scrollTo(0, from + (to - from) * ease);
      if (k < 1) return requestAnimationFrame(step);
      gliding = false;
      $<HTMLAnchorElement>('.door .get').focus({ preventScroll: true });
    };
    requestAnimationFrame(step);
  });
  const direct = () => {
    const d = through(day), n = through(night);
    const time = n.top <= 0 ? DUSK + clamp01(n.p / NIGHTFALL) : d.top > 0 ? 0 : d.p * DUSK;
    sky(time);
    const where = current && ['night', 'bag', 'mend', 'door'].includes(current.name) ? 'grove' : 'square';
    if (where !== hero.where) hero.snap();
    hero.where = where;
    hero.day = current?.name === 'hero' ? 0 : time;
    let subject = null;
    if (current?.name === 'day') {
      const id = DAY_CAST[Math.min(DAY_CAST.length - 1, Math.floor(d.p * DAY_CAST.length))]!;
      subject = hero.villagers.find(v => v.def.id === id)!.ant;
      hud.dial(hero.time, id);
    }
    if (subject && subject !== hero.subject) hero.snap();
    hero.subject = subject;
    if (current?.name === 'night') {
      const open = n.p >= MIDNIGHT;
      const lit = open ? Math.min(7, Math.floor((n.p - MIDNIGHT) / LANTERN_STEP) + 1) : 0;
      // The bell and each lantern sound as the scroll comes to them, not as it goes back.
      // (Not while gliding past on the way to the door, which would ring them all at once.)
      if (open && !shop.open && !gliding) sound.play('bell_toll', 0.8);
      if (lit > shop.lit && shop.lit > 0 && !gliding) sound.play('ting', 0.35, 0.9 + lit * 0.05);
      if (open !== shop.open) hud.night(open);
      Object.assign(shop, { open, lit });
      hero.stage(lit, open);
    }
    // After midnight the shop stays open behind what follows.
    if (current && ['bag', 'mend', 'door'].includes(current.name)) hero.stage(7, true);
    // A postcard a night as the section scrolls by, the first as it comes in.
    const v = through(nights);
    post.show(v.top < innerHeight * 0.3 ? Math.min(6, Math.floor(v.p * 7)) : -1);
    land.at(n.top < innerHeight / 2 ? 'grove' : 'square');
    const want = hero.where === 'grove' ? 'shop' : `${Math.min(3, Math.floor(time + 0.5))}`;
    if (want !== bed) {
      bed = want;
      beds();
    }
    return time;
  };

  let last = performance.now();
  const loop = (ms: number) => {
    // The first frame's stamp can come before the start, and a step back in time would ease the light past morning.
    const dt = Math.min(Math.max((ms - last) / 1000, 0), 0.1), t = ms / 1000;
    last = ms;
    const want = choose();
    if (want !== current) move(want, t);
    const time = direct();
    if (!hud.playing) land.frame(t, time);
    if (current) hero.frame(dt, t);
    talk.tick(dt);
    hud.tick(dt);
    bag.tick(dt, current?.name === 'bag');
    mend.tick(dt, current?.name === 'mend');
    const r = postWin.getBoundingClientRect();
    post.tick(dt, r.bottom > 0 && r.top < innerHeight);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  hud.dial(0, DAY_CAST[0]!);
  document.body.classList.add('ready');
  Object.assign(window, { hero, land });
}

start();
