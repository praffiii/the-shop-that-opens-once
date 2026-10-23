// The game's own pixel mouse cursor (Hud.cs): its arrow, and its hand over whatever can be used. Each is scaled up by
// nearest pixel for the screen's own pixels and set as a CSS cursor (--cursor and --hand, style.css); until then, and
// where a browser takes no such cursor, the system's.
import { ART } from '../hero';
import { json } from '../world/data';

/** CSS px per art pixel: the game's UI scale on the page, and as big as a cursor safely goes (32 px). */
const SCALE = 2;

interface Piece {
  size: [number, number];
  hotspot: [number, number];
}

async function cursor(name: string, piece: Piece, sharp: boolean) {
  const img = new Image();
  img.src = `${ART}/ui/${name}.png`;
  await img.decode();
  const n = sharp ? Math.max(SCALE, Math.round(SCALE * devicePixelRatio)) : SCALE;
  const c = Object.assign(document.createElement('canvas'), { width: piece.size[0] * n, height: piece.size[1] * n });
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, c.width, c.height);
  const url = `url(${c.toDataURL()})`;
  const [x, y] = piece.hotspot.map(v => v * SCALE);
  return `${sharp ? `image-set(${url} ${n / SCALE}x)` : url} ${x} ${y}`;
}

export async function cursors() {
  const ui = await json<Record<'cursor' | 'cursor_hand', Piece>>(`${ART}/ui/ui.json`);
  const sharp = CSS.supports('cursor', 'image-set(url(a.png) 2x) 0 0, auto');
  const [arrow, hand] = await Promise.all([cursor('cursor', ui.cursor, sharp), cursor('cursor_hand', ui.cursor_hand, sharp)]);
  const root = document.documentElement.style;
  root.setProperty('--cursor', `${arrow}, auto`);
  root.setProperty('--hand', `${hand}, pointer`);
}
