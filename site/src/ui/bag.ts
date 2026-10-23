// The courier's bag over the grove, ported from the game's UI/Bag.cs as the page shows it: Night 1's watch in its
// slot, turned over side by side (A / D, the arrow keys, the < and >, or a tap on the watch), each side's line under
// it, and what a side shows going into the Notes beside it, with the game's toast and its page sound (Main.OnNoted).
// When its window comes into view the bag turns the watch over by itself, once round, till the visitor takes it in
// hand. Every line is the game's own, in its own translation.
import { lang } from './lang';
import { sound } from './sound';

/** The watch as Marlow hands it over (Core/Keepsakes.cs, "watch"): each side's picture, what is seen, and its note. */
const WATCH = {
  name: 'Brass pocket watch',
  sides: [
    { art: 'front', seen: 'A railway service watch. The hands stopped at 10:17.', note: 'The pocket watch stopped at 10:17.' },
    {
      art: 'scorched',
      seen: 'The back is burnt black, crusted hard, as if lightning had found it. It smells of sulphur and scorched wire.',
      note: "The watch's back is burnt black.",
    },
    { art: 'side', seen: 'The crown is pulled out, as if someone stopped it on purpose.', note: '' },
  ],
};
/** How long the toast shows (Hud.ToastSeconds), and how long the bag holds each side when it turns by itself. */
const TOAST = 4, HOLD = 2.6;
/** The page's own words for the bag's arrows, which the game's keys name instead. */
const SAY = {
  back: { en: 'Turn it back', id: 'Balik ke sisi sebelumnya' },
  on: { en: 'Turn it over', id: 'Balik ke sisi berikutnya' },
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement) => {
  const e = document.createElement(tag);
  e.className = cls;
  parent.append(e);
  return e;
};

export class Bag {
  private readonly big: HTMLImageElement;
  private readonly seen: HTMLElement;
  private readonly list: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly heads: HTMLElement[];
  private readonly name: HTMLElement;
  private readonly arrows: HTMLButtonElement[];
  private side = 0;
  private readonly notes: string[] = [];
  /** Turning by itself until the visitor turns it, then never again; the time to the next turn. */
  private auto = true;
  private wait = HOLD;
  private shown = 0;
  private toastLeft = 0;

  constructor(win: HTMLElement) {
    const panel = el('div', 'bag panel', win);
    const look = el('div', 'bag-look', panel);
    this.heads = [el('span', 'bag-head', look)];
    const slot = el('span', 'tab bag-slot', look);
    slot.setAttribute('aria-selected', 'true');
    const small = el('img', '', slot);
    small.src = '/art/items/watch_sm_front.png';
    small.alt = '';
    this.name = el('span', 'bag-name', look);
    const turn = el('div', 'bag-turn', look);
    this.arrows = [-1, 1].map(step => {
      const b = el('button', 'bag-arrow', turn);
      b.type = 'button';
      b.textContent = step < 0 ? '<' : '>';
      b.addEventListener('click', () => this.take(step));
      return b;
    });
    this.big = el('img', 'bag-big', turn);
    this.big.alt = '';
    this.big.addEventListener('click', () => this.take(1));
    turn.insertBefore(this.big, this.arrows[1]!);
    this.seen = el('p', 'bag-seen', look);
    this.seen.setAttribute('aria-live', 'polite');
    const notes = el('div', 'bag-notes', panel);
    this.heads.push(el('span', 'bag-head', notes));
    this.list = el('ul', 'bag-list', notes);
    this.toast = el('div', 'bag-toast panel', win);
    lang.listeners.add(() => this.paint());
    this.paint();
  }

  /** The visitor turns it: the bag stops turning by itself. */
  take(step: number) {
    this.auto = false;
    this.turn(step);
  }

  private turn(step: number) {
    const n = WATCH.sides.length;
    this.side = (this.side + step + n) % n;
    this.paint();
  }

  /** Advances the bag's own turning while its window is in view, and the toast. */
  tick(dt: number, inView: boolean) {
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      this.toast.classList.toggle('on', this.toastLeft > 0);
    }
    if (!inView || !this.auto) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = HOLD;
    this.turn(1);
    // Once round, it rests on its face for the visitor to take over.
    if (++this.shown >= WATCH.sides.length) this.auto = false;
  }

  private paint() {
    const s = WATCH.sides[this.side]!, l = lang.now;
    this.big.src = `/art/items/watch_lg_${s.art}.png`;
    this.big.dataset.side = s.art;
    this.seen.textContent = lang.t(s.seen);
    this.name.textContent = lang.t(WATCH.name);
    const [bag, notes] = this.heads;
    bag!.textContent = lang.t('Bag');
    notes!.textContent = lang.t('Notes');
    this.arrows[0]!.setAttribute('aria-label', SAY.back[l]);
    this.arrows[1]!.setAttribute('aria-label', SAY.on[l]);
    this.toast.textContent = lang.t('Added to your notes.');
    // Noticing something adds it to the notes, once (Game.Note).
    const added = !!s.note && !this.notes.includes(s.note);
    if (added) {
      this.notes.push(s.note);
      this.toastLeft = TOAST;
      this.toast.classList.add('on');
      sound.play('page', 0.6);
    }
    this.list.replaceChildren(
      ...(this.notes.length ? this.notes : ['Nothing noted yet.']).map((n, i) => {
        const li = document.createElement('li');
        li.textContent = lang.t(n);
        if (!this.notes.length) li.className = 'soft';
        else if (added && i === this.notes.length - 1) li.className = 'new';
        return li;
      }),
    );
  }
}
