import './style.css';
import { Hero } from './hero';
import { DOING, Hud } from './ui/hud';
import { lang } from './ui/lang';
import { sound } from './ui/sound';
import { Talk } from './ui/talk';

const TALK_KEYS = new Set(['Space', 'Enter', 'KeyE']);
/** Whom the day's section follows, in turn as it scrolls by. */
const DAY_CAST = Object.keys(DOING);
/** The time the day's section runs to: dusk, its lamps and windows lit. */
const DUSK = 2;

const $ = <T extends HTMLElement>(q: string) => document.querySelector<T>(q)!;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

async function start() {
  const canvas = $<HTMLCanvasElement>('#world');
  const small = matchMedia('(max-width: 720px)').matches;
  const hero = new Hero(canvas, small);
  await Promise.all([hero.load(), lang.load()]);
  const heroCopy = $('.hero .copy'), day = $('.day'), dayCopy = $('.day .copy');
  let scale = 2;
  let stage = { left: 0, width: innerWidth, room: innerHeight, aim: { x: innerWidth / 2, y: innerHeight / 2 } };
  const talk = new Talk(document.body, () => scale, () => stage);
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
    if (!hud.playing || !TALK_KEYS.has(e.code) || e.repeat || (e.target instanceof Element && e.target.closest('a, button'))) return;
    if (talk.open) {
      e.preventDefault();
      talk.press();
      return;
    }
    const near = hero.near();
    if (!near) return;
    e.preventDefault();
    void hero.talk(near, talk);
  });
  // A click, not a press: on a phone a drag to scroll the page is not a step.
  canvas.addEventListener('click', e => {
    if (!hud.playing) return;
    if (talk.open) return talk.press();
    const p = hero.pick(e.clientX, e.clientY);
    const someone = hero.villagerAt(p);
    if (someone) void hero.reach(someone, talk);
    else void hero.player.goTo(p);
  });

  // The scroll directs the world: the hero is Satria's, the day's section runs morning to dusk with the villagers.
  const direct = () => {
    const playing = scrollY < innerHeight * 0.45;
    if (playing !== hud.playing) {
      hud.playing = playing;
      hero.player.away = !playing;
      if (!playing) {
        talk.end();
        hero.player.ant.stop();
      }
    }
    const r = day.getBoundingClientRect();
    const p = clamp01(-r.top / Math.max(1, r.height - innerHeight));
    stage = hud.stage(playing ? heroCopy : dayCopy);
    hero.aim = stage.aim;
    if (playing) {
      hero.subject = null;
      hero.day = 0;
      return;
    }
    const id = DAY_CAST[Math.min(DAY_CAST.length - 1, Math.floor(p * DAY_CAST.length))]!;
    hero.subject = hero.villagers.find(v => v.def.id === id)!.ant;
    hero.day = p * DUSK;
    hud.dial(hero.time, id);
  };

  let last = performance.now();
  const loop = (ms: number) => {
    const dt = Math.min((ms - last) / 1000, 0.1);
    last = ms;
    direct();
    hero.frame(dt, ms / 1000);
    talk.tick(dt);
    hud.tick(dt, stage);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  hud.dial(0, DAY_CAST[0]!);
  document.body.classList.add('ready');
  setTimeout(() => hud.thump(), 800);
  Object.assign(window, { hero });
}

start();
