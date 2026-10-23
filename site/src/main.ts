import './style.css';
import { Hero } from './hero';
import { Hud } from './ui/hud';
import { lang } from './ui/lang';
import { sound } from './ui/sound';
import { Talk } from './ui/talk';

const TALK_KEYS = new Set(['Space', 'Enter', 'KeyE']);

async function start() {
  const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
  const small = matchMedia('(max-width: 720px)').matches;
  const hero = new Hero(canvas, small);
  await Promise.all([hero.load(), lang.load()]);
  hero.time = Number(new URLSearchParams(location.search).get('t') ?? 0);
  let scale = 2;
  const talk = new Talk(document.body, () => scale);
  const hud = new Hud(hero, talk);
  const resize = () => {
    hero.resize();
    scale = hud.scale();
  };
  resize();
  window.addEventListener('resize', resize);

  hero.player.ant.onStep = () => sound.step();
  const beds = () => sound.beds({ music_dawn: 0.35, amb_morning: 0.5 });
  sound.listeners.add(beds);
  beds();
  window.addEventListener('keydown', e => {
    if (!TALK_KEYS.has(e.code) || e.repeat || (e.target instanceof Element && e.target.closest('a, button'))) return;
    e.preventDefault();
    if (talk.open) talk.press();
    else {
      const near = hero.near();
      if (near) void hero.talk(near, talk);
    }
  });
  canvas.addEventListener('pointerdown', e => {
    if (talk.open) return talk.press();
    const p = hero.pick(e.clientX, e.clientY);
    const someone = hero.villagerAt(p);
    if (someone) void hero.reach(someone, talk);
    else void hero.player.goTo(p);
  });

  let last = performance.now();
  const loop = (ms: number) => {
    const dt = Math.min((ms - last) / 1000, 0.1);
    last = ms;
    hero.frame(dt, ms / 1000);
    talk.tick(dt);
    hud.tick(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.body.classList.add('ready');
  Object.assign(window, { hero });
}

start();
