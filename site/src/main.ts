import './style.css';
import { Hero } from './hero';
import { Land } from './land';
import { DOING, Hud } from './ui/hud';
import { lang } from './ui/lang';
import { sound } from './ui/sound';
import { Talk } from './ui/talk';

const TALK_KEYS = new Set(['Space', 'Enter', 'KeyE']);
/** Whom the day's section follows, in turn as it scrolls by. */
const DAY_CAST = Object.keys(DOING);
/** The time the day's section runs to: dusk, its lamps and windows lit. */
const DUSK = 2;
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
  const wins: Win[] = [...document.querySelectorAll<HTMLElement>('.window')].map(el => ({
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
  await Promise.all([hero.load(), land.load(), lang.load()]);
  const day = $('.day');
  let scale = 2;
  const talk = new Talk(document.body, () => scale, () => ({ left: 0, width: innerWidth }));
  const hud = new Hud(hero, talk);
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
  const beds = () => sound.beds({ music_dawn: 0.35, amb_morning: 0.5 });
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
  // dusk with the villagers at work, and the page's sky moves with it.
  const direct = () => {
    const r = day.getBoundingClientRect();
    const p = clamp01(-r.top / Math.max(1, r.height - innerHeight));
    const time = r.top > 0 ? 0 : p * DUSK;
    sky(time);
    if (current?.name === 'day') {
      const id = DAY_CAST[Math.min(DAY_CAST.length - 1, Math.floor(p * DAY_CAST.length))]!;
      const ant = hero.villagers.find(v => v.def.id === id)!.ant;
      if (hero.subject !== ant) hero.snap();
      hero.subject = ant;
      hero.day = time;
      hud.dial(hero.time, id);
    } else {
      hero.subject = null;
      hero.day = 0;
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
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  hud.dial(0, DAY_CAST[0]!);
  document.body.classList.add('ready');
  Object.assign(window, { hero, land });
}

start();
