// What sits over the world: the Download with its macOS and Windows tabs, the postmark that thumps onto the hero's
// card, the key caps that teach walking and talking, the bubble over whoever Satria can talk to, the day's dial, and
// the sound and language switches. It also works out the stage: the part of the screen beside the copy, where the
// camera frames its subject and the talk box sits.
import type { Hero } from '../hero';
import type { Villager } from '../play/villagers';
import { lang } from './lang';
import { sound } from './sound';
import type { Talk } from './talk';

const RELEASES = 'https://github.com/praffiii/the-shop-that-opens-once/releases/latest';
const ZIPS = { mac: 'TheShopThatOpensOnce-macOS.zip', win: 'TheShopThatOpensOnce-Windows.zip' };
type Os = keyof typeof ZIPS;
type Words = Record<'en' | 'id', string>;

/** The page's own words that change as the visitor plays, in both languages. */
const SAY = {
  walk: { en: 'walk around Bellwood', id: 'jelajahi Bellwood' },
  talk: { en: 'to talk to {0}', id: 'untuk bicara dengan {0}' },
  tap: { en: 'tap to walk around Bellwood', id: 'ketuk untuk menjelajahi Bellwood' },
  tapTalk: { en: 'tap {0} to talk', id: 'ketuk {0} untuk bicara' },
  soundOn: { en: 'Turn sound on', id: 'Nyalakan suara' },
  soundOff: { en: 'Turn sound off', id: 'Matikan suara' },
  mac: { en: 'Download for macOS', id: 'Unduh untuk macOS' },
  win: { en: 'Download for Windows', id: 'Unduh untuk Windows' },
  any: { en: 'Download', id: 'Unduh' },
} satisfies Record<string, Words>;

const PHASES: Words[] = [
  { en: 'Morning', id: 'Pagi' },
  { en: 'Midday', id: 'Siang' },
  { en: 'Dusk', id: 'Senja' },
  { en: 'Night', id: 'Malam' },
];

/** What each villager the day's section follows is doing, as the camera finds them. */
export const DOING: Record<string, Words> = {
  mia: { en: 'Mia sets out her stall, a crate at a time.', id: 'Mia menata kiosnya, satu peti demi satu peti.' },
  pip: { en: 'Pip runs the letters door to door.', id: 'Pip mengantar surat dari pintu ke pintu.' },
  sam: { en: 'Sam keeps the hall in order: steps first, then the ledgers.', id: 'Sam merapikan balai: tangga dulu, baru buku-buku catatan.' },
};

const $ = <T extends HTMLElement>(q: string) => document.querySelector<T>(q)!;

/** The visitor's computer, for the right download; a phone or anything else gets the releases page. */
function guess(): Os | null {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|Android/i.test(ua)) return null;
  if (/Mac/i.test(ua)) return 'mac';
  if (/Win/i.test(ua)) return 'win';
  return null;
}

export interface Stage {
  left: number;
  width: number;
  /** How much of the world shows, in CSS px of height: too little and the key caps would sit on the copy. */
  room: number;
  /** Where the camera holds its subject, in CSS px. */
  aim: { x: number; y: number };
}

export class Hud {
  private readonly hint = $('.hint');
  private readonly say = $('.hint-say');
  private readonly prompt = $('.prompt');
  private readonly lantern = $('.lantern');
  private readonly mute = $<HTMLButtonElement>('.mute');
  private readonly get = $<HTMLAnchorElement>('.get');
  private readonly tabs = [...document.querySelectorAll<HTMLButtonElement>('.tab')];
  private readonly clock = $('.clock');
  private readonly phase = $('.phase');
  private readonly who = $('.who');
  private readonly touch = matchMedia('(pointer: coarse)').matches;
  private os = guess();
  private age = 0;
  private walked = 0;
  private near: Villager | null = null;
  private doing = '';
  /** The hero is on screen: Satria is the visitor's. */
  playing = true;

  constructor(private readonly hero: Hero, private readonly talk: Talk) {
    this.hint.classList.toggle('touch', this.touch);
    for (const tab of this.tabs) tab.addEventListener('click', () => this.pick(tab.dataset.os as Os));
    $('.lang').addEventListener('click', () => lang.set(lang.now === 'en' ? 'id' : 'en'));
    this.mute.addEventListener('click', () => sound.set(!sound.on));
    sound.listeners.add(() => this.words());
    lang.listeners.add(() => this.words());
    for (const type of ['keydown', 'keyup'] as const)
      window.addEventListener(type, e => {
        const cap = document.querySelector(`.cap[data-key="${e.code}"]`);
        cap?.classList.toggle('down', type === 'keydown');
      });
    this.pick(this.os);
  }

  /** The hero's card has come to rest: the postmark thumps down on its stamp. */
  thump() {
    document.body.classList.add('thumped');
    sound.play('stamp', 0.6);
  }

  private pick(os: Os | null) {
    this.os = os;
    for (const tab of this.tabs) tab.setAttribute('aria-selected', `${tab.dataset.os === os}`);
    this.get.href = os ? `${RELEASES}/download/${ZIPS[os]}` : RELEASES;
    this.words();
  }

  /** The whole-number scales the pieces are drawn at, for the window's size. */
  scale() {
    const s = Math.min(Math.max(Math.floor(innerHeight / 300), 2), 3);
    const w = document.documentElement.clientWidth;
    const t = w <= 900 ? Math.max(1, Math.floor((w - 8) / 188)) : innerHeight >= 1100 ? 3 : 2;
    const root = document.documentElement.style;
    root.setProperty('--s', `${s}`);
    root.setProperty('--t', `${t}`);
    root.setProperty('--z', `${Math.round(this.hero.view.zoom)}`);
    return s;
  }

  /** The screen beside a section's copy, or under it on a narrow screen. */
  stage(copy: HTMLElement): Stage {
    const r = copy.getBoundingClientRect(), w = innerWidth, h = innerHeight;
    if (w <= 900) {
      const top = Math.min(Math.max(r.bottom, 0), h * 0.6);
      return { left: 0, width: w, room: h - Math.max(r.bottom, 0), aim: { x: w / 2, y: (top + h) / 2 + 24 } };
    }
    const left = r.right + 16;
    return { left, width: w - left, room: h, aim: { x: (left + w) / 2, y: h * 0.56 } };
  }

  /** The day's dial: the clock's quarter for the phase, its hand round the day, and who the camera is with. */
  dial(time: number, doing: string) {
    const phase = Math.min(3, Math.floor(time + 0.5));
    this.clock.style.setProperty('--phase', `${phase}`);
    this.clock.style.setProperty('--step', `${Math.round(time * 4) % 16}`);
    if (this.phase.dataset.phase !== `${phase}` || this.doing !== doing) {
      this.phase.dataset.phase = `${phase}`;
      this.doing = doing;
      this.words();
    }
  }

  tick(dt: number, stage: Stage) {
    this.age += dt;
    document.documentElement.style.setProperty('--stage-mid', `${stage.left + stage.width / 2}px`);
    const near = this.talk.open || !this.playing ? null : this.hero.near();
    // The bubble over the one to talk to, popping up and bobbing (Talk.Over).
    this.prompt.classList.toggle('on', !!near);
    if (near) {
      const z = Math.round(this.hero.view.zoom), head = this.hero.head(near);
      const bob = Math.round(Math.sin(this.age * 6)) * z;
      this.prompt.style.transform = `translate(${Math.round(head.x - 5 * z)}px, ${Math.round(head.y - 9 * z + bob)}px)`;
      this.prompt.classList.toggle('blink', Math.floor(this.age * 2) % 2 === 1);
    }
    // The key caps: walking until the visitor has walked a while, then talking whenever someone is near.
    const pose = this.hero.player.ant.currentPose;
    if (pose === 'walk' || pose === 'run') this.walked += dt;
    this.hint.classList.toggle('gone', !this.playing || this.talk.open || stage.room < 200 || (this.walked > 4 && !near));
    if (this.near !== near) {
      this.near = near;
      this.hint.classList.toggle('near', !!near);
      this.words();
    }
    // Marlow's lantern on the sign flickers now and then.
    this.lantern.classList.toggle('flicker', Math.floor(this.age * 5) % 7 === 0);
  }

  private words() {
    const l = lang.now, near = this.near;
    const name = near ? lang.t(near.def.label) : '';
    const line = this.touch ? (near ? SAY.tapTalk : SAY.tap) : near ? SAY.talk : SAY.walk;
    this.say.textContent = line[l].replace('{0}', name);
    this.mute.setAttribute('aria-pressed', `${sound.on}`);
    this.mute.setAttribute('aria-label', (sound.on ? SAY.soundOff : SAY.soundOn)[l]);
    $('.get-label').textContent = (this.os ? SAY[this.os] : SAY.any)[l];
    this.phase.textContent = PHASES[Number(this.phase.dataset.phase ?? 0)]![l];
    this.who.textContent = DOING[this.doing]?.[l] ?? '';
  }
}
