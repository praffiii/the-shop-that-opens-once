// What sits over the hero: the key caps that teach walking and talking, the bubble over whoever Satria can talk to,
// the Download sign's lantern, and the sound and language switches.
import type { Hero } from '../hero';
import { lang } from './lang';
import { sound } from './sound';
import type { Talk } from './talk';

const RELEASES = 'https://github.com/praffiii/the-shop-that-opens-once/releases/latest';

/** The page's own words that change as the visitor plays, in both languages. */
const SAY = {
  walk: { en: 'to walk', id: 'untuk berjalan' },
  talk: { en: 'to talk', id: 'untuk bicara' },
  tap: { en: 'Tap to walk', id: 'Ketuk untuk berjalan' },
  tapTalk: { en: 'Tap them to talk', id: 'Ketuk untuk bicara' },
  soundOn: { en: 'Turn sound on', id: 'Nyalakan suara' },
  soundOff: { en: 'Turn sound off', id: 'Matikan suara' },
  mac: { en: 'Download for macOS', id: 'Unduh untuk macOS' },
  win: { en: 'Download for Windows', id: 'Unduh untuk Windows' },
} satisfies Record<string, Record<'en' | 'id', string>>;

const $ = <T extends HTMLElement>(q: string) => document.querySelector<T>(q)!;

/** The visitor's computer, for the right download: the zips the release workflow names. */
function platform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|Android/i.test(ua)) return null;
  if (/Mac/i.test(ua)) return { zip: 'TheShopThatOpensOnce-macOS.zip', say: SAY.mac };
  if (/Win/i.test(ua)) return { zip: 'TheShopThatOpensOnce-Windows.zip', say: SAY.win };
  return null;
}

export class Hud {
  private readonly hint = $('.hint');
  private readonly say = $('.hint-say');
  private readonly prompt = $('.prompt');
  private readonly lantern = $('.lantern');
  private readonly mute = $<HTMLButtonElement>('.mute');
  private readonly touch = matchMedia('(pointer: coarse)').matches;
  private readonly os = platform();
  private clock = 0;
  private walked = 0;

  constructor(private readonly hero: Hero, private readonly talk: Talk) {
    this.hint.classList.toggle('touch', this.touch);
    if (this.os) $<HTMLAnchorElement>('.get').href = `${RELEASES}/download/${this.os.zip}`;
    $('.lang').addEventListener('click', () => lang.set(lang.now === 'en' ? 'id' : 'en'));
    this.mute.addEventListener('click', () => sound.set(!sound.on));
    sound.listeners.add(() => this.words());
    lang.listeners.add(() => this.words());
    for (const type of ['keydown', 'keyup'] as const)
      window.addEventListener(type, e => {
        const cap = document.querySelector(`.cap[data-key="${e.code}"]`);
        cap?.classList.toggle('down', type === 'keydown');
      });
    this.words();
  }

  /** The whole-number scales the pieces are drawn at, for the window's size. */
  scale() {
    const s = Math.min(Math.max(Math.floor(innerHeight / 300), 2), 4);
    // The title takes up to the left two fifths of a wide window, the whole width of a narrow one.
    const room = innerWidth <= 720 ? innerWidth - 8 : Math.min(innerWidth * 0.42, innerHeight * 0.75);
    const t = Math.min(Math.max(Math.floor(room / 188), 1), 4);
    const root = document.documentElement.style;
    root.setProperty('--s', `${s}`);
    root.setProperty('--t', `${t}`);
    root.setProperty('--z', `${Math.round(this.hero.view.zoom)}`);
    return s;
  }

  tick(dt: number) {
    this.clock += dt;
    const near = this.talk.open ? null : this.hero.near();
    // The bubble over the one to talk to, popping up and bobbing (Talk.Over).
    this.prompt.classList.toggle('on', !!near);
    if (near) {
      const z = Math.round(this.hero.view.zoom), head = this.hero.head(near);
      const bob = Math.round(Math.sin(this.clock * 6)) * z;
      this.prompt.style.transform = `translate(${Math.round(head.x - 5 * z)}px, ${Math.round(head.y - 9 * z + bob)}px)`;
      this.prompt.classList.toggle('blink', Math.floor(this.clock * 2) % 2 === 1);
    }
    // The key caps: walking until the visitor has walked a while, then talking whenever someone is near.
    if (this.hero.player.ant.walking || this.hero.player.ant.currentPose === 'walk' || this.hero.player.ant.currentPose === 'run')
      this.walked += dt;
    const talking = !!near;
    const gone = this.talk.open || (this.walked > 2.5 && !talking);
    this.hint.classList.toggle('gone', gone);
    if (this.hint.classList.contains('near') !== talking) {
      this.hint.classList.toggle('near', talking);
      this.words();
    }
    // Marlow's lantern on the sign flickers now and then.
    this.lantern.classList.toggle('flicker', Math.floor(this.clock * 5) % 7 === 0);
  }

  private words() {
    const l = lang.now, talking = this.hint.classList.contains('near');
    this.say.textContent = (this.touch ? (talking ? SAY.tapTalk : SAY.tap) : talking ? SAY.talk : SAY.walk)[l];
    this.mute.setAttribute('aria-pressed', `${sound.on}`);
    this.mute.setAttribute('aria-label', (sound.on ? SAY.soundOff : SAY.soundOn)[l]);
    if (this.os) $('.get-label').textContent = this.os.say[l];
  }
}
