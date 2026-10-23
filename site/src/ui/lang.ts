// English or Bahasa Indonesia, as the game has. The game's own lines come from its translations (Lang/id.json, keyed
// by the English); the page's own copy is written in both, in the page as data-id beside the English.
const KEY = 'shop.lang';
export type Lang = 'en' | 'id';

let words: Record<string, string> = {};

function read(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'id') return saved;
  } catch {
    /* no storage: guess from the browser */
  }
  return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export const lang = {
  now: read(),
  listeners: new Set<(l: Lang) => void>(),

  async load() {
    const r = await fetch('/lang/id.json');
    words = (await r.json()) as Record<string, string>;
    this.paint();
  },

  /** A game line in the language shown. */
  t(en: string) {
    return this.now === 'id' ? (words[en] ?? en) : en;
  },

  set(l: Lang) {
    this.now = l;
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* private window */
    }
    this.paint();
    for (const f of this.listeners) f(l);
  },

  // The page's own copy: each element keeps its English and carries its Indonesian in data-id.
  paint() {
    document.documentElement.lang = this.now;
    for (const el of document.querySelectorAll<HTMLElement>('[data-id]')) {
      el.dataset.en ??= el.textContent ?? '';
      el.textContent = this.now === 'id' ? el.dataset.id! : el.dataset.en;
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-id-label]')) {
      el.dataset.enLabel ??= el.getAttribute('aria-label') ?? '';
      el.setAttribute('aria-label', this.now === 'id' ? el.dataset.idLabel! : el.dataset.enLabel);
    }
  },
};
