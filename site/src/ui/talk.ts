// The talk box, ported from the game's UI/Talk.cs: a portrait in its slot, the speaker's name tag, the line typed at
// the speaker's pace with their voice blip on each letter and a breath at commas and full stops, words written
// *like this* in red, and the next arrow once it has all been said. Space, Enter or a click shows the whole line,
// then moves on. Sizes are the game's canvas px, times the page's UI scale (--s).
import { lang } from './lang';
import { sound } from './sound';

const SPEED = 50;
/** Seconds per letter for the voiced ones; anyone else speaks as a villager, pitched by their id. */
const VOICES: Record<string, number> = { courier: 0.035, pip: 0.025, sam: 0.032, mia: 0.033, marlow: 0.055, helen: 0.04 };
const VILLAGER_PACE = 0.036;
const COMMA = 0.12, STOP = 0.32;
const HEIGHT = 62, MAX_WIDTH = 560, MARGIN = 6, FACE_LEFT = 62;
const MOODS = ['neutral', 'smile', 'moved', 'surprised', 'sad', 'cross'];

export class Talk {
  private readonly root = document.createElement('div');
  private readonly face = document.createElement('div');
  private readonly slot = document.createElement('div');
  private readonly name = document.createElement('div');
  private readonly text = document.createElement('p');
  private readonly next = document.createElement('div');
  private full = '';
  private marked: boolean[] = [];
  private shown = 0;
  private typed = 0;
  private hold = 0;
  private clock = 0;
  private speed = SPEED;
  private pitch = 1;
  private voice = '';
  private row = 0;
  private done: (() => void) | null = null;

  constructor(parent: HTMLElement, private readonly scale: () => number) {
    this.root.className = 'talk panel';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-live', 'polite');
    this.slot.className = 'talk-slot slot';
    this.face.className = 'talk-face';
    this.name.className = 'talk-name tag';
    this.text.className = 'talk-text';
    this.next.className = 'talk-next';
    this.root.append(this.slot, this.face, this.name, this.text, this.next);
    this.root.hidden = true;
    this.root.addEventListener('pointerdown', e => {
      e.stopPropagation();
      this.press();
    });
    parent.append(this.root);
  }

  get open() {
    return !this.root.hidden;
  }

  /**
   * Shows one line until the visitor moves on. who is a character id for the portrait and voice; feet are where those
   * on screen stand (CSS px), so the box goes to the top of the screen rather than cover them.
   */
  say(speaker: string, who: string, line: string, mood = 'neutral', feet: number[] = []) {
    this.mark(lang.t(line));
    this.row = Math.max(0, MOODS.indexOf(mood));
    this.voiceOf(who);
    this.name.textContent = lang.t(speaker);
    this.name.hidden = !speaker;
    this.slot.hidden = this.face.hidden = !who;
    if (who) this.face.style.backgroundImage = `url(/art/chars/portraits/${who}.png)`;
    const s = this.scale();
    const width = Math.min(innerWidth / s - 2 * MARGIN, MAX_WIDTH);
    this.root.style.setProperty('--w', `${width}`);
    this.root.style.setProperty('--left', `${who ? FACE_LEFT : 10}`);
    this.root.hidden = false;
    this.shown = -1;
    this.type(0);
    const height = Math.max(HEIGHT, Math.ceil(this.text.offsetHeight / s) + 12);
    this.root.style.setProperty('--h', `${height}`);
    const bottom = innerHeight - (height + MARGIN) * s;
    const top = feet.some(y => y > bottom + 24 * s && y < innerHeight + 32 * s);
    this.root.classList.toggle('top', top);
    this.root.classList.remove('in');
    void this.root.offsetWidth;
    this.root.classList.add('in');
    this.typed = this.hold = 0;
    return new Promise<void>(done => (this.done = done));
  }

  close() {
    this.root.hidden = true;
    sound.speaking = false;
  }

  /** Space, Enter or a click: the whole line at once, or on to the next. */
  press() {
    if (!this.open) return;
    if (this.typing) return this.type(this.full.length);
    sound.play('click', 0.5);
    const done = this.done;
    this.done = null;
    done?.();
  }

  private get typing() {
    return this.shown < this.full.length;
  }

  tick(dt: number) {
    if (!this.open) return;
    this.clock += dt;
    if (this.typing && (this.hold -= dt) <= 0) {
      this.typed += this.speed * dt;
      const was = this.shown;
      this.type(Math.min(Math.floor(this.typed), this.full.length));
      const c = this.full[this.shown - 1] ?? '';
      // One blip a frame at most, on the newest letter shown: spaces and punctuation are silent.
      if (this.voice && this.shown > was && /[\p{L}\p{N}]/u.test(c))
        sound.blip(this.voice, this.pitch * (1 + ((c.toLowerCase().charCodeAt(0) * 7) % 9 - 4) * 0.025));
      // A breath after a comma, a longer one at the end of a sentence (not inside "..." or "?!").
      if (this.shown > was && this.shown < this.full.length && this.full[this.shown] === ' ') {
        this.hold = /[,;:-]/.test(c) ? COMMA : /[.!?]/.test(c) ? STOP : 0;
        if (this.hold > 0) this.typed = this.shown;
      }
    }
    sound.speaking = !!this.voice && this.typing;
    this.next.hidden = this.typing;
    this.next.style.setProperty('--f', `${Math.floor(this.clock * 6) % 4}`);
    // Portrait frames: 0 rests, 1 has the mouth open, 2 blinks.
    const mouth = this.typing && Math.floor(this.clock * 8) % 2 === 1;
    const blink = !this.typing && this.clock % 3.5 < 0.15;
    this.face.style.setProperty('--f', `${mouth ? 1 : blink ? 2 : 0}`);
    this.face.style.setProperty('--row', `${this.row}`);
  }

  // The line without its *marks*, and which of its letters they made stand out.
  private mark(line: string) {
    let on = false;
    this.full = '';
    this.marked = [];
    for (const c of line) {
      if (c === '*') on = !on;
      else {
        this.full += c;
        this.marked.push(on);
      }
    }
  }

  private voiceOf(id: string) {
    this.pitch = 1;
    const pace = VOICES[id];
    if (!id) [this.voice, this.speed] = ['', SPEED];
    else if (pace) [this.voice, this.speed] = [id, 1 / pace];
    else {
      [this.voice, this.speed] = ['villager', 1 / VILLAGER_PACE];
      let h = 0;
      for (const c of id) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
      this.pitch = 0.85 + ((h & 0x7fffffff) % 7) * 0.05;
    }
  }

  // The untyped rest is laid out but clear, so words never jump to the next line midway.
  private type(n: number) {
    if (n === this.shown && this.text.childNodes.length) return;
    this.shown = n;
    this.text.replaceChildren();
    let i = 0;
    while (i < n) {
      const m = this.marked[i];
      let j = i;
      while (j < n && this.marked[j] === m) j++;
      const run = this.full.slice(i, j);
      if (m) {
        const em = document.createElement('em');
        em.textContent = run;
        this.text.append(em);
      } else this.text.append(run);
      i = j;
    }
    if (n < this.full.length) {
      const rest = document.createElement('span');
      rest.className = 'untyped';
      rest.textContent = this.full.slice(n);
      this.text.append(rest);
    }
  }
}
