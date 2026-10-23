// The seven nights as the game's chapter cards (UI/Card.cs): each night's postcard slides up onto the cream, its stamp
// holding the night's keepsake, the postmark thumps down on it with the day, and the card jolts a pixel. Over them hang
// Marlow's seven lanterns on their banyan branch (UI/Dial.cs), flickering; one goes out in a wisp of smoke as each of
// Nights 1 to 5 lands. Nights 6 and 7 come sealed: no keepsake, no postmark, no hint, and their lanterns burn on.
// Hovering or tapping a lantern makes it flicker. Sizes are the art's own px, scaled by whole device pixels.
import { lang } from './lang';
import { sound } from './sound';

/** With reduced motion, what moves only to be alive holds still; what answers the visitor still moves. */
const STILL = matchMedia('(prefers-reduced-motion: reduce)');

type Words = Record<'en' | 'id', string>;

/** Nights 1 to 5: the title the game writes on the card, the keepsake in its stamp, and the page's one-line hook. */
const NIGHTS: { title: string; stamp: string; hook: Words }[] = [
  {
    title: 'The Stopped Watch',
    stamp: 'watch_sm_front',
    hook: { en: 'A railway watch, stopped at 10:17, its back burnt black.', id: 'Jam saku kereta, berhenti di 10.17, punggungnya hangus hitam.' },
  },
  {
    title: 'The Stitched Rabbit',
    stamp: 'rabbit_sm_front',
    hook: { en: 'A patchwork rabbit, one ear torn and one eye gone.', id: 'Kelinci tambal sulam, satu telinganya sobek dan satu matanya hilang.' },
  },
  {
    title: 'The Old Film Camera',
    stamp: 'camera_sm_side',
    hook: { en: 'A cine camera with a reel still inside, twenty years on.', id: 'Kamera film yang gulungannya masih di dalam, dua puluh tahun kemudian.' },
  },
  {
    title: 'The Key With No Engraving',
    stamp: 'key_sm_front',
    hook: { en: 'A black iron key, with no number and no name.', id: 'Kunci besi hitam, tanpa nomor dan tanpa nama.' },
  },
  {
    title: 'The Mismatched Running Shoes',
    stamp: 'shoes_sm_pair',
    hook: { en: 'Red running shoes whose soles are two sizes.', id: 'Sepatu lari merah yang solnya beda ukuran.' },
  },
];
const LANTERNS = 7;
const SAY = {
  sealed: { en: 'Sealed', id: 'Tersegel' },
  open: { en: 'Yours to open, in the game.', id: 'Untuk kau buka sendiri, di dalam game.' },
  lantern: { en: "Night {0}'s lantern", id: 'Lentera Malam {0}' },
} satisfies Record<string, Words>;
/** The card's slide up, the wait before the postmark, its jolt, and how long a lantern smokes going out (Card, Dial). */
const SLIDE = 0.45, STAMP_DELAY = 0.2, JOLT = 0.08, SMOKE = 1.6, FLICKER = 0.5;
/** The postcard (art px), and the branch's scale over the card's (where its lanterns hang is the page's CSS). */
const CARD = { w: 339, h: 195 }, BRANCH = 2;
/** What the window needs round the card, in card px: the branch and its lanterns, the line under them, and air. */
const ROOM = 16 * BRANCH + 14 + 20;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement) => {
  const e = document.createElement(tag);
  e.className = cls;
  parent.append(e);
  return e;
};

const format = (s: string, n: number) => s.replace('{0}', `${n}`);

interface Card {
  el: HTMLElement;
  night: number;
  mark: HTMLElement | null;
}

export class Post {
  private readonly root: HTMLElement;
  private readonly desk: HTMLElement;
  private readonly lanterns: HTMLButtonElement[] = [];
  private readonly smoke: HTMLElement;
  private readonly burning: HTMLElement;
  private readonly list: HTMLElement[];
  private unit = 2;
  /** The card on the desk and the one under it while it slides, and where the new one is in its arrival. */
  private card: Card | null = null;
  private under: Card | null = null;
  private age = 0;
  private thumped = false;
  /** Lanterns out, and the one smoking now (its seconds left); each lantern's flicker left from a hover or a tap. */
  private out = 0;
  private smoking = 0;
  private readonly flicker = new Array<number>(LANTERNS).fill(0);
  private clock = 0;

  constructor(private readonly win: HTMLElement) {
    this.root = el('div', 'post', win);
    const branch = el('div', 'post-branch', this.root);
    el('span', 'post-bough', branch);
    for (let i = 0; i < LANTERNS; i++) {
      const b = el('button', 'post-lantern', branch);
      b.type = 'button';
      b.style.setProperty('--i', `${i}`);
      const flick = () => {
        this.flicker[i] = FLICKER;
      };
      b.addEventListener('pointerenter', flick);
      b.addEventListener('click', flick);
      this.lanterns.push(b);
    }
    this.smoke = el('span', 'post-smoke', branch);
    this.burning = el('p', 'post-burning', this.root);
    this.desk = el('div', 'post-desk', this.root);
    this.list = [...document.querySelectorAll<HTMLElement>('.nights-list li')];
    win.style.setProperty('--k', `${this.unit}`);
    new ResizeObserver(() => this.fit()).observe(this.root);
    lang.listeners.add(() => this.words());
    this.words();
  }

  /** The largest scale the card and its branch fit at, in whole device pixels and never past the page's own. */
  private fit() {
    const dpr = devicePixelRatio || 1;
    const page = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 2;
    const fits = Math.min(this.root.clientWidth / CARD.w, this.root.clientHeight / (CARD.h + ROOM));
    const unit = Math.max(1 / dpr, Math.min(page, Math.floor(fits * dpr) / dpr));
    if (unit === this.unit) return;
    this.unit = unit;
    this.win.style.setProperty('--k', `${unit}`);
  }

  /** The night the scroll has come to (0 to 6), or -1 before the first. */
  show(night: number) {
    if (night === (this.card?.night ?? -1)) return;
    const forward = night > (this.card?.night ?? -1);
    this.under?.el.remove();
    this.under = null;
    if (night < 0) {
      this.card?.el.remove();
      this.card = null;
      this.out = this.smoking = 0;
      return this.mark();
    }
    if (forward) {
      // The new card slides up over the one on the desk.
      this.under = this.card;
      this.card = this.make(night);
      // Nights skipped over in one scroll are home already: their lanterns are out, and any smoking has gone.
      if (this.smoking > 0) this.out++;
      this.smoking = 0;
      this.out = Math.max(this.out, Math.min(night, NIGHTS.length));
      // With reduced motion the card is cut to, not slid in; the postmark still lands.
      this.age = matchMedia('(prefers-reduced-motion: reduce)').matches ? SLIDE : 0;
      this.thumped = false;
    } else {
      // Back up the page: the card is simply there, stamped, and the lanterns burn again.
      this.card?.el.remove();
      this.card = this.make(night);
      this.age = SLIDE + STAMP_DELAY + JOLT;
      this.thumped = true;
      if (this.card.mark) this.card.mark.hidden = false;
      this.out = Math.min(night + 1, NIGHTS.length);
      this.smoking = 0;
    }
    this.mark();
  }

  private make(night: number): Card {
    const card = el('div', 'post-card', this.desk);
    const story = NIGHTS[night];
    const message = el('div', 'post-message', card);
    el('span', 'post-kicker', message).textContent = format(lang.t('Night {0}'), night + 1);
    el('span', 'post-title', message).textContent = story ? lang.t(story.title) : SAY.sealed[lang.now];
    el('i', 'post-rule', message);
    el('span', 'post-line', message).textContent = (story ? story.hook : SAY.open)[lang.now];
    // addressed to the courier
    el('span', 'post-to', card).textContent = lang.t('Satria,');
    el('span', 'post-to post-town', card).textContent = lang.t('Bellwood.');
    const stamp = el('span', 'post-stamp', card);
    let mark: HTMLElement | null = null;
    if (story) {
      const keepsake = el('img', 'post-keepsake', stamp);
      keepsake.src = `/art/items/${story.stamp}.png`;
      keepsake.alt = '';
      // At its own size, its middle on the stamp's picture (Card: 20, 20), on whole pixels.
      keepsake.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = keepsake;
        for (const [k, v] of Object.entries({ '--w': w, '--h': h, '--x': 20 - Math.floor(w / 2), '--y': 20 - Math.floor(h / 2) }))
          keepsake.style.setProperty(k, `${v}`);
      };
      mark = el('span', 'post-mark', card);
      el('span', 'post-day', mark).textContent = format(lang.t('Day {0}'), night + 1);
      mark.hidden = true;
    } else card.classList.add('sealed');
    return { el: card, night, mark };
  }

  // The words that change with the language: the line under the lanterns, their names, and the cards' words.
  private words() {
    const n = this.card?.night ?? -1;
    if (this.card) {
      this.card.el.remove();
      const thumped = this.thumped;
      this.card = this.make(n);
      if (this.card.mark) this.card.mark.hidden = !thumped;
    }
    this.lanterns.forEach((b, i) => b.setAttribute('aria-label', format(SAY.lantern[lang.now], i + 1)));
    this.mark();
  }

  // The night shown in the copy's list, and how many lanterns still burn.
  private mark() {
    const n = this.card?.night ?? -1;
    this.list.forEach((li, i) => li.toggleAttribute('aria-current', i === n));
    this.burning.textContent = format(lang.t("Marlow's lanterns: {0} still burning."), LANTERNS - this.out);
  }

  /** Advances the card's arrival, the smoke and the flicker while the window is in view. */
  tick(dt: number, inView: boolean) {
    if (!inView) return;
    this.clock += dt;
    const card = this.card;
    if (card && this.age < SLIDE + STAMP_DELAY + JOLT) {
      this.age += dt;
      // Slides up from below the window, easing to rest (Card.Postcard).
      const k = Math.min(1, this.age / SLIDE), ease = 1 - (1 - k) ** 3;
      const from = this.desk.clientHeight / this.unit;
      let y = Math.round((1 - ease) * from);
      if (k >= 1) this.under?.el.remove();
      if (this.age >= SLIDE + STAMP_DELAY && !this.thumped) {
        this.thumped = true;
        if (card.mark) {
          card.mark.hidden = false;
          sound.play('stamp', 0.7);
        }
      }
      // The postmark lands and the card jolts down a pixel and back.
      if (this.thumped && card.mark && this.age < SLIDE + STAMP_DELAY + JOLT) y += 2;
      card.el.style.setProperty('--y', `${y}`);
      // Its lantern goes out once it is stamped (Nights 1 to 5).
      if (this.age >= SLIDE + STAMP_DELAY + JOLT) {
        card.el.style.setProperty('--y', '0');
        if (card.mark && this.out < card.night + 1) {
          this.out = card.night; // this one smokes
          this.smoking = SMOKE;
          sound.play('lantern_out', 0.6);
        }
      }
    }
    if (this.smoking > 0) {
      this.smoking -= dt;
      if (this.smoking <= 0) {
        this.out++;
        this.mark();
      }
    }
    this.smoke.hidden = this.smoking <= 0;
    if (this.smoking > 0) {
      this.smoke.style.setProperty('--i', `${this.out}`);
      this.smoke.style.setProperty('--f', `${Math.min(3, Math.floor((1 - this.smoking / SMOKE) * 4))}`);
    }
    this.lanterns.forEach((b, i) => {
      this.flicker[i] = Math.max(0, this.flicker[i]! - dt);
      const dark = i < this.out || (i === this.out && this.smoking > 0);
      const flick = this.flicker[i]! > 0 ? Math.floor(this.clock * 12) % 2 === 0 : !STILL.matches && Math.floor(this.clock * 5 + i * 2.3) % 7 === 0;
      b.style.setProperty('--f', `${dark ? 2 : flick ? 1 : 0}`);
    });
  }
}
