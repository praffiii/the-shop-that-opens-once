'use strict';
/* Bellwood indoors, as HD-2D shows a room: the house cut open, its front wall and roof taken away, so the camera looks
   in at the same tilt as outdoors. A room stands where its house stands in its area, on its stone footing, FLOOR px
   over that area's land, which lies round it in soft shade; its walls and big furniture are models (model.js), its
   small things cards. A room is baked like an area (export-world.js): ground, height map, walk mask and items.

   A room's def, in its own art px from the back wall's foot at its west end: area (where its house stands; the house
   is the item named after the room, its door the anchor <room>_door), room [w, d] (the floor inside the walls),
   door (the x of the way out at the open front), bays [[x, row]] (a partition from the back wall to that row), solid
   [[x0, y0, x1, y1]] (furniture feet can't enter), anchors {name: [x, row]} (points the game looks for), paint(b, R,
   at) (rugs and such on the floor, R(x0, y0, x1, y1, f) asking f(x, y, w, h) for each pixel's colour, at(x, row) the
   floor's pixel there), wall(b, w, h, seed) (the walls' paper and wainscot, plaster unless given), back/left/right(b,
   w, h, win) (the walls' pictures, win(b, x, y, w, h) putting a window in) and things(T) (the furniture, T as below). */
(() => {
  const V = VIL, { fill, px } = V, { hash, Buf, u32 } = KIT, DEEP = MODEL.DEEP;
  const FLOOR = 10, WALL = 60, THICK = 6; // art px: the footing's height; texels: the walls' height and thickness
  const SHADE = 0.72;                     // how much light reaches the land round the room
  // A window's glass after dark: the day's sky turned to night.
  const NIGHT = new Map(Object.entries({ sky1: 'water5', sky2: 'water5', sky3: 'water6', sky4: 'water6', white: 'roofB3' })
    .map(([f, t]) => [u32(KIT.hex(f)), u32(KIT.hex(t))]));

  const darker = (v, k) => (v & 0xff000000) | ((((v >>> 16) & 255) * k) << 16) | ((((v >>> 8) & 255) * k) << 8) | ((v & 255) * k);
  // Light on a pixel: k under 1 shades it, over 1 warms it toward sunlight; stepped through a 4x4 Bayer matrix so the
  // shading stays in crisp pixel-art bands rather than smooth gradients.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], STEP = 0.07;
  const lit = (v, k, x, y) => {
    const q = Math.floor((k - 1) / STEP + BAYER[(y & 3) * 4 + (x & 3)] / 16) * STEP + 1;
    if (q === 1) return v;
    const c = (s, warm) => Math.max(0, Math.min(255, Math.round(q < 1 ? ((v >>> s) & 255) * q : ((v >>> s) & 255) + (255 - ((v >>> s) & 255)) * (q - 1) * warm)));
    return (v & 0xff000000) | (c(16, 0.5) << 16) | (c(8, 0.9) << 8) | c(0, 1.1);
  };
  const light = (b, x0, y0, x1, y1, k) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = b.get(x, y); if (v >>> 24) b.set(x, y, lit(v, k(x, y), x, y)); } };
  const stamp = (b, x, y, rows, key) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (key[r[i]]) px(b, x + i, y + j, key[r[i]]); });
  const sprite = (w, h, paint) => ({ img: V.inked(w, h, paint).canvas(), ax: (w >> 1) + 1, ay: h + 1 });
  const bare = (w, h, paint) => { const b = new Buf(w, h); paint(b); return { img: b.canvas(), ax: w >> 1, ay: h }; }; // a sprite with no ink round it: glass

  /* ---------- the parts every room shares ---------- */
  // Old boards running across, 5 rows each, a lit top row and a dark seam, their ends staggered, a knot here and there.
  function boards(b, x0, y0, x1, y1, seed) {
    for (let y = y0; y < y1; y++) {
      const k = ((y - y0) / 5) | 0, r = (y - y0) % 5, off = (hash(k, 0, seed) * 60) | 0;
      for (let x = x0; x < x1; x++) {
        const joint = (x + off) % 64 === 0, h = hash(x >> 2, y, seed + k);
        px(b, x, y, r === 4 || joint ? 'wood4' : r === 0 ? 'wood1' : h < 0.04 ? 'wood3' : 'wood2');
      }
    }
  }
  // Tiles laid in a check, terracotta and cream, a lit edge to each and a dark grout line: a hall's floor.
  function tiles(b, x0, y0, x1, y1, seed) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const gx = (x - x0) % 8, gy = (y - y0) % 6, dark = (((x - x0) >> 3) + (((y - y0) / 6) | 0)) % 2, h = hash(x >> 1, y, seed);
      px(b, x, y, gx === 7 || gy === 5 ? 'wood4' : gy === 0 ? (dark ? 'roofR1' : 'cream0') : h < 0.05 ? (dark ? 'roofR3' : 'cream2') : dark ? 'roofR2' : 'cream1');
    }
  }
  // Flagstones, big and uneven, worn pale where feet go: a cellar's floor.
  function flagstones(b, x0, y0, x1, y1, seed) {
    for (let y = y0; y < y1; y++) {
      const row = ((y - y0) / 10) | 0, off = (hash(row, 0, seed) * 20) | 0;
      for (let x = x0; x < x1; x++) {
        const col = ((x - x0 + off) / 18) | 0, edge = (x - x0 + off) % 18 === 0 || (y - y0) % 10 === 9, k = hash(col, row, seed + 1);
        px(b, x, y, edge ? 'stone5' : (y - y0) % 10 === 0 ? 'stone2' : hash(x >> 1, y >> 1, seed + 2) < 0.06 ? 'stone4' : k < 0.4 ? 'stone3' : 'stone2');
      }
    }
  }
  // Rough-cut stone blocks, damp toward the floor, a timber beam along the top: a cellar's walls.
  function masonry(b, w, h, seed) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const row = (y / 7) | 0, seam = y % 7 === 6 || (x + (row % 2) * 8) % 16 === 0, k = hash((x + (row % 2) * 8) >> 4, row, seed);
      px(b, x, y, seam ? 'stone5' : y > h - 12 && hash(x, y, 3) < 0.3 ? 'stone4' : k < 0.35 ? 'stone4' : hash(x, y, seed) < 0.05 ? 'stone2' : 'stone3');
    }
    fill(b, 0, 0, w, 4, 'wood4'); fill(b, 0, 3, w, 1, 'wood5'); fill(b, 0, 0, w, 1, 'wood3');
  }
  // The 1950 master map of Bellwood on a sheet of birch bark: the bark's dark lenticels, the two rivers down to the
  // estuary, the rail line, the town's blocks and the bridge, pinned at its corners.
  function drawMap(b, x, y, w, h) {
    fill(b, x, y, w, h, 'cream1');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (hash(i >> 2, j, 6) < 0.08) px(b, x + i, y + j, 'wood4'); else if (hash(i, j, 7) < 0.06) px(b, x + i, y + j, 'cream2');
    for (let i = 0; i < w; i++) { px(b, x + i, y + 4 + Math.round(Math.sin(i / 5) * 2 + i / 4), 'water4'); if (i > w / 2) px(b, x + i, y + h - 4 - Math.round((i - w / 2) / 5), 'water4'); }
    for (let i = 2; i < w - 2; i++) if (i % 2) px(b, x + i, y + 10, 'roofR3');
    for (const [i, j] of [[10, 13], [16, 15], [22, 13], [28, 16]]) fill(b, x + i, y + j, 4, 3, 'wood3');
    fill(b, x + 30, y + 19, 6, 1, 'wood4');
    for (const [i, j] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) px(b, x + i, y + j, 'brass2');
  }
  // A wall's inside: plaster over a wainscot of upright boards, a beam along the top, a rail and a skirting board.
  function plaster(b, w, h, seed) {
    fill(b, 0, 0, w, h, 'wall1');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x, y, seed) < 0.03) px(b, x, y, 'wall2');
    V.wallPanel(b, 0, h - 18, w, 18, 'plank');
    fill(b, 0, h - 19, w, 2, 'wood4'); fill(b, 0, h - 19, w, 1, 'wood2');
    fill(b, 0, h - 2, w, 2, 'wood5');
    fill(b, 0, 0, w, 4, 'wood4'); fill(b, 0, 3, w, 1, 'wood5'); fill(b, 0, 0, w, 1, 'wood3');
  }
  const post = (b, x, h) => { fill(b, x, 0, 4, h, 'wood4'); fill(b, x, 0, 1, h, 'wood3'); fill(b, x + 3, 0, 1, h, 'wood5'); };
  // Where the walls are cut: their tops and their ends, dark timber.
  const cut = (b, w, h) => { fill(b, 0, 0, w, h, 'wood5'); fill(b, 0, 0, w, 1, 'wood4'); };
  // A framed picture on a wall: a mount and a sepia print of an ant or two.
  function photo(b, x, y, w, h, who) {
    fill(b, x, y, w, h, 'wood3'); fill(b, x, y, w, 1, 'wood2'); fill(b, x + 1, y + 1, w - 2, h - 2, 'cream1');
    fill(b, x + 2, y + 2, w - 4, h - 4, 'wall3');
    who.forEach(([dx, s]) => { const cx = x + dx, top = y + h - 3 - 6 * s; fill(b, cx - s, top, 2 * s + 1, 2 * s, 'wood4'); fill(b, cx - s - 1, top + 2 * s, 2 * s + 3, h - 3 - (top + 2 * s - y), 'wood4'); });
  }

  // The odds and ends every lived-in room gathers, shared so each room can have its corners filled.
  const PROPS = {
    // a box's paint: a slatted crate, its boards and a brace
    crate: (b, w, h) => { fill(b, 0, 0, w, h, 'wood2'); fill(b, 0, 0, w, 1, 'wood1'); fill(b, 0, 0, 2, h, 'wood4'); fill(b, w - 2, 0, 2, h, 'wood4'); fill(b, 0, h - 2, w, 2, 'wood4'); for (let k = 2; k < Math.min(w, h) - 2; k++) px(b, k, h - 1 - k, 'wood3'); },
    barrel: () => sprite(12, 16, b => { fill(b, 1, 0, 10, 16, 'wood3'); fill(b, 0, 2, 12, 12, 'wood3'); fill(b, 2, 1, 2, 14, 'wood2'); fill(b, 9, 1, 1, 14, 'wood4'); for (const y of [3, 12]) fill(b, 0, y, 12, 1, 'iron3'); fill(b, 1, 0, 10, 1, 'wood4'); }),
    sack: (c = 'cream1') => sprite(12, 14, b => { V.disc(b, 6, 8, 5, 6, c); fill(b, 3, 2, 6, 3, c); fill(b, 4, 0, 4, 3, c); fill(b, 3, 3, 6, 1, 'dirt2'); fill(b, 2, 9, 2, 3, 'white'); fill(b, 8, 10, 2, 3, 'dirt1'); }),
    // a wicker basket heaped with loaves, balls of wool or vegetables
    basket: kind => sprite(16, 11, b => {
      const heap = { loaves: ['orange', 'roofR1', 'yellow'], yarn: ['rose', 'sky3', 'roofG1'], veg: ['roofG2', 'orange', 'roofR2'] }[kind];
      heap.forEach((c, i) => { V.disc(b, 4 + i * 4, 4, 3, 3, c); px(b, 3 + i * 4, 3, 'white'); });
      fill(b, 1, 5, 14, 6, 'dirt2'); for (let x = 1; x < 15; x += 2) fill(b, x, 6, 1, 4, 'dirt3'); fill(b, 0, 5, 16, 1, 'dirt1'); fill(b, 2, 10, 12, 1, 'dirt3');
    }),
    stool: () => sprite(10, 12, b => { fill(b, 0, 0, 10, 3, 'wood2'); fill(b, 0, 0, 10, 1, 'wood1'); for (const x of [1, 7]) fill(b, x, 3, 2, 9, 'wood4'); fill(b, 2, 7, 6, 1, 'wood3'); }),
    // a broom leant against the wall
    broom: () => sprite(8, 28, b => { for (let y = 0; y < 18; y++) px(b, 1 + (y >> 3), y, 'wood3'); fill(b, 2, 18, 5, 2, 'roofR3'); for (let x = 1; x < 8; x++) fill(b, x, 20, 1, 8 - (x % 2), x % 2 ? 'yellow' : 'dirt1'); }),
    plant: () => sprite(14, 22, b => { fill(b, 3, 15, 8, 7, 'roofR2'); fill(b, 3, 15, 8, 1, 'roofR1'); fill(b, 4, 21, 6, 1, 'roofR3'); V.foliage(b, (x, y) => ((x - 7) / 7) ** 2 + ((y - 8) / 8) ** 2 <= 1 && y < 16, [0, 0, 14, 16], V.LEAF.green, 21, { cw: 5, ch: 4, dx: 3, dy: 3 }); }),
  };
  // Things painted on a wall: a shelf of jars, hung pans, a calendar, and a row of hooks with what hangs on them.
  const shelf = (b, x, y, w, seed) => {
    fill(b, x, y, w, 2, 'wood3'); fill(b, x, y, w, 1, 'wood2'); fill(b, x + 1, y + 2, 1, 3, 'wood4'); fill(b, x + w - 2, y + 2, 1, 3, 'wood4');
    for (let i = x + 1; i < x + w - 4; i += 5) { const t = 4 + ((hash(i, y, seed) * 4) | 0), c = ['roofR2', 'cream2', 'roofB2', 'brass2', 'roofG2', 'orange'][((hash(i, y, seed + 1) * 6) | 0)]; fill(b, i, y - t, 4, t, c); fill(b, i, y - t, 4, 1, 'wood3'); px(b, i + 1, y - t + 2, 'white'); }
  };
  const pans = (b, x, y, n) => { fill(b, x, y, n * 9, 1, 'iron3'); for (let i = 0; i < n; i++) { const cx = x + 4 + i * 9, r = 3 + (i % 2); fill(b, cx, y + 1, 1, 4, 'iron3'); V.disc(b, cx, y + 5 + r, r, r, i % 2 ? 'orange' : 'roofR3'); V.disc(b, cx - 1, y + 4 + r, r - 2, r - 2, 'light2'); } };
  const calendar = (b, x, y, red = 'roofR2') => { fill(b, x, y, 10, 13, 'cream0'); fill(b, x, y, 10, 3, red); px(b, x + 4, y - 1, 'iron3'); for (let j = 5; j < 12; j += 2) for (let i = 1; i < 9; i += 2) px(b, x + i, y + j, j === 7 && i === 5 ? red : 'stone2'); };
  const hooks = (b, x, y, items) => { fill(b, x, y, items.length * 8, 2, 'wood3'); items.forEach((k, i) => { const cx = x + 3 + i * 8; px(b, cx, y + 2, 'iron2');
    if (k === 'cap') { fill(b, cx - 3, y + 3, 7, 3, 'roofG2'); fill(b, cx - 4, y + 5, 9, 1, 'roofG3'); fill(b, cx - 2, y + 3, 3, 1, 'roofG1'); }
    else if (k === 'coat') { fill(b, cx - 3, y + 3, 7, 14, 'dirt3'); fill(b, cx - 3, y + 3, 2, 14, 'dirt2'); fill(b, cx, y + 4, 1, 12, 'wood5'); }
    else if (k === 'chain') { for (let j = 0; j < 12; j += 2) { px(b, cx, y + 3 + j, 'iron2'); px(b, cx + (j % 4 ? 1 : -1), y + 4 + j, 'iron3'); } }
    else if (k === 'shoe') { fill(b, cx - 2, y + 3, 4, 3, 'iron2'); fill(b, cx - 3, y + 6, 2, 3, 'iron2'); fill(b, cx + 1, y + 6, 2, 3, 'iron2'); }
    else if (k === 'ladle') { fill(b, cx, y + 3, 1, 8, 'brass2'); V.disc(b, cx, y + 12, 2, 2, 'brass2'); }
    else if (k === 'rope') { for (let j = 0; j < 4; j++) { V.disc(b, cx, y + 9, 5 - (j & 1), 6 - (j & 1), j % 2 ? 'dirt2' : 'dirt3'); } V.disc(b, cx, y + 9, 2, 3, 'wall2'); fill(b, cx - 1, y + 2, 2, 2, 'dirt3'); }
    else if (k === 'net') { for (let j = 0; j < 16; j++) for (let i = -4; i <= 4; i++) if ((i + j) % 3 === 0 || (i - j + 30) % 3 === 0) { if (Math.abs(i) <= 2 + (j >> 2)) px(b, cx + i, y + 3 + j, 'dirt2'); } px(b, cx - 3, y + 12, 'roofR2'); px(b, cx + 2, y + 15, 'roofR2'); }
    else if (k === 'apron') { fill(b, cx - 3, y + 3, 7, 13, 'white'); fill(b, cx - 3, y + 3, 7, 1, 'cream1'); fill(b, cx - 1, y + 8, 3, 3, 'cream1'); } }); };

  // A stack of n paper folders tied with red tape, for desks and tables.
  const folders = n => sprite(12, n * 2 + 2, b => { for (let i = 0; i < n; i++) { fill(b, i % 2, n * 2 - i * 2, 11, 2, ['dirt2', 'cream1', 'dirt3', 'roofB2'][i % 4]); px(b, 5 + (i % 2), n * 2 - i * 2, 'roofR2'); } });

  /* ---------- the rooms ---------- */
  // Marlow's shop's paint: its shopfront's bottle green, and faded plum.
  const GREEN = ['#8fc3a8', '#5f9680', '#46755f', '#325747', '#213b35'], PLUM = ['#b49ab4', '#8a7196', '#68557a', '#4a3c5c', '#3f3350', '#30263f'];
  // The seven keepsake boxes, one a night: each wood's light, base and dark, and its clasp.
  const BOXES = [['wood2', 'wood3', 'wood4', 'brass1'], ['roofR2', 'roofR3', 'roofR4', 'brass1'], ['roofB2', 'roofB3', 'roofB4', 'brass1'],
    [PLUM[1], PLUM[2], PLUM[3], 'brass1'], ['roofG2', 'roofG3', 'roofG4', 'brass1'], ['wood3', 'wood4', 'wood5', 'cream0'], ['roofR1', 'roofR2', 'roofR3', 'brass0']];
  /* A box as an item (items/box_<i>_<size>_<variant>): xs closed, in a hand; lg up close, closed, or open as two
     layers so what is in it can rise from inside: 'open' (the lid standing up, the velvet inside) behind it, 'front'
     (the body's front) over it. */
  function boxItem(i, size, variant) {
    const [l, c, d, k] = BOXES[i];
    if (size === 'xs') return V.inked(8, 7, b => { fill(b, 0, 0, 8, 3, c); fill(b, 1, 0, 6, 1, l); fill(b, 0, 3, 8, 4, c); fill(b, 0, 3, 8, 1, d); px(b, 3, 3, k); px(b, 4, 3, k); fill(b, 0, 6, 8, 1, d); }).canvas();
    const W = 56, H = 40;
    // the body from row y down: a light rim, the carved band of diamonds, brass bands at its ends, the clasp's lock plate
    const body = (b, y) => {
      fill(b, 0, y, W, H - y, c); fill(b, 0, y, W, 1, l); fill(b, 0, H - 2, W, 2, d);
      for (let x = 4; x < W - 4; x++) { const t = (x - 4) % 8, z = t < 4 ? t : 8 - t; px(b, x, y + 8 + z, d); px(b, x, y + 16 - z, d); }
      for (const x of [0, W - 4]) { fill(b, x, y, 4, H - y, 'brass2'); fill(b, x + 1, y, 1, H - y, 'brass1'); }
      fill(b, 24, y + 1, 8, 7, 'brass2'); fill(b, 25, y + 1, 6, 1, 'brass1'); fill(b, 27, y + 3, 2, 3, 'wood5');
    };
    return V.inked(W, H, b => {
      if (variant === 'closed') {
        // the domed lid and its brass band, the clasp hanging over the lock
        for (let y = 0; y < 16; y++) { const e = y === 0 ? 3 : y === 1 ? 1 : 0; fill(b, e, y, W - 2 * e, 1, y < 4 ? l : y < 12 ? c : d); }
        for (const x of [0, W - 4]) { fill(b, x, 2, 4, 14, 'brass2'); fill(b, x + 1, 2, 1, 14, 'brass1'); }
        fill(b, 0, 14, W, 2, 'brass3'); body(b, 16); fill(b, 26, 11, 4, 7, k); px(b, 27, 12, 'white');
        lidMark(b, i, l, d);
        if (i === 6) { fill(b, 4, 21, W - 8, 15, c); carve(b, 'FOR THE', 28, 23, d, l); carve(b, 'COURIER', 28, 30, d, l); }
      } else if (variant === 'open') {
        // the lid stands up behind, its inside lined in plum velvet; inside the box, dark velvet
        fill(b, 1, 0, W - 2, 16, c); fill(b, 4, 2, W - 8, 13, PLUM[3]); fill(b, 4, 2, W - 8, 1, PLUM[2]); fill(b, 0, 14, W, 2, 'brass3');
        fill(b, 0, 16, W, 6, l); fill(b, 3, 17, W - 6, 6, PLUM[5]);
      } else {
        body(b, 20);
        if (i === 6) { fill(b, 4, 25, W - 8, 13, c); carve(b, 'FOR THE', 28, 26, d, l); carve(b, 'COURIER', 28, 32, d, l); }
      }
    }).canvas();
  }
  // What each box's lid has carved on it, seen only up close (the cabinet's cubbies show them plain, so the nights
  // stay secret): the owner's name or initial, Marcus Bell's seal in deer leather on the sixth, and on the seventh
  // coconut fronds over "FOR THE COURIER".
  const CARVED = ['H', 'PIP', 'THEO', 'SAM', 'LEO', null, null];
  const GLYPH = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '.##'],
  };
  const textWidth = t => [...t].reduce((w, ch) => w + (ch === ' ' ? 2 : 4), 0) - 1;
  // Letters cut into the wood: the cut dark, its lower lip catching the light.
  function carve(b, text, cx, y, cut, lip) {
    let x = Math.round(cx - textWidth(text) / 2);
    for (const ch of text) {
      if (ch === ' ') { x += 2; continue; }
      GLYPH[ch].forEach((row, j) => [...row].forEach((on, i) => { if (on === '#') px(b, x + i, y + j, cut); }));
      GLYPH[ch].forEach((row, j) => [...row].forEach((on, i) => { if (on === '#' && (GLYPH[ch][j + 1] || '...')[i] !== '#') px(b, x + i, y + j + 1, lip); }));
      x += 4;
    }
  }
  function lidMark(b, i, l, d) {
    if (CARVED[i]) carve(b, CARVED[i], 28, 4, d, l);
    if (i === 5) {
      // a round seal of deer leather, stitched round its edge, M.B. pressed into it
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
        const r = x * x + y * y;
        if (r <= 26) px(b, 14 + x, 8 + y, r > 20 ? 'dirt4' : r > 14 && (x + y) % 2 === 0 ? 'cream1' : y < -2 ? 'dirt2' : 'dirt3');
      }
      carve(b, 'MB', 14, 6, 'wood5', 'dirt2');
    }
    if (i === 6) {
      // two coconut fronds springing from the lid's middle, their leaflets hanging
      for (const side of [-1, 1]) for (let t = 1; t < 20; t++) {
        const x = 28 + side * t, y = 3 + Math.round(t * t / 60);
        px(b, x, y, 'leaf3');
        if (t % 2 === 0) { px(b, x, y + 1, 'leaf2'); px(b, x - side, y + 2, 'leaf2'); if (t < 16) px(b, x - side, y + 3, 'leaf4'); }
      }
    }
  }
  const boxItems = () => BOXES.flatMap((_, i) => [['xs', 'closed'], ['lg', 'closed'], ['lg', 'open'], ['lg', 'front']].map(([size, v]) => [`items/box_${i}_${size}_${v}.png`, boxItem(i, size, v)]));
  /* Daniel's last reel, as Theo's projector throws it on the burlap screen (Night 3): the villagers by the river
     the year the bridge went up, Daniel shouldering a beam, Ratih and young Helen calling to him from the bank, all
     in flickering black and white with the film's scratches and dust. Drawn at twice the size from the cast's own
     sprites and halved, so they read small, as people on a screen do. */
  function footage() {
    const W = 48, H = 34, FR = 8, out = [];
    const GREYS = ['#f4efe0', '#cfc9b8', '#9d978a', '#6b665e', '#3c3934', '#1f1d1b'];
    for (let k = 0; k < FR; k++) {
      const big = document.createElement('canvas'); big.width = W * 2; big.height = H * 2;
      const g = big.getContext('2d');
      // sky, the far bank's trees, the river, the near bank
      g.fillStyle = '#b9d6ef'; g.fillRect(0, 0, W * 2, 30);
      g.fillStyle = '#4a9848'; for (let x = 0; x < W * 2; x += 6) g.fillRect(x, 18 - ((x * 7) % 5), 7, 14);
      g.fillStyle = '#3db3e0'; g.fillRect(0, 30, W * 2, 12);
      g.fillStyle = '#86cc55'; g.fillRect(0, 42, W * 2, 26);
      // the new bridge's posts and its first beams, going up across the river
      g.fillStyle = '#7a452e'; for (const x of [24, 56]) g.fillRect(x, 22, 4, 22);
      g.fillStyle = '#cf8a4c'; g.fillRect(20, 24, 40, 3); g.fillRect(52, 28, 30, 3);
      // Daniel walks the beam across, Ratih and Helen on the bank, a neighbour hauling a rope
      CH.draw(g, 'daniel', 'carryWalk', k, 36 + k * 2, 62, 1, { shadow: false });
      CH.draw(g, 'mother', k % 4 < 2 ? 'talk' : 'idle', k, 74, 64, -1, { shadow: false });
      CH.draw(g, 'young_helen', 'talk', k + 1, 86, 66, -1, { shadow: false });
      CH.draw(g, 'porter', 'carry', k, 12, 64, 1, { shadow: false });
      // halved, then washed to the film's greys, its light flickering frame to frame
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(big, 0, 0, W, H);
      const im = x.getImageData(0, 0, W, H), d = im.data, flick = [0, 0.06, -0.04, 0.03, 0.08, -0.02, 0.05, -0.05][k];
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const o = (j * W + i) * 4, l = (0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) / 255;
        const v = Math.hypot((i - W / 2) / (W / 2), (j - H / 2) / (H / 2)), lum = Math.min(1, Math.max(0, l + flick - Math.max(0, v - 0.75) * 0.9));
        const [r, gg, b] = KIT.hex(GREYS[Math.min(5, Math.floor((1 - lum) * 6))]).match(/\w\w/g).map(h => parseInt(h, 16));
        d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
      }
      // a scratch down the film, and dust, never the same twice
      const sx = (k * 13 + 7) % W;
      for (let j = 0; j < H; j++) if ((j + k) % 5) { const o = (j * W + sx) * 4; d[o] = d[o + 1] = d[o + 2] = 240; }
      for (let n = 0; n < 4; n++) { const o = ((((k * 7 + n * 11) % H) * W) + ((k * 17 + n * 23) % W)) * 4; d[o] = d[o + 1] = d[o + 2] = n % 2 ? 30 : 245; }
      x.putImageData(im, 0, 0);
      out.push(c);
    }
    return { img: out[0], frames: out, fps: 4, ax: W >> 1, ay: H };
  }

  const ROOMS = {
    // Satria's childhood home (GDD 7.5, LOC-INT-01). Three bays under one roof: the bedroom (west: the bed, the desk
    // where Satria writes the journal each night, Ibu Ratih's treadle sewing machine and her tin of scraps), the
    // family room (the dusty sofa, Ayah's books and wooden tube radio, the family's photos) and the kitchen (east:
    // the counter, the wood stove, the walnut table, the clay water jar). The door is in the middle of the front.
    satria_home: {
      area: 'east', seed: 7, room: [224, 92], door: 112,
      bays: [[76, 50], [150, 50]],
      solid: [[4, 0, 36, 30], [42, 0, 72, 14], [46, 14, 58, 24], [1, 36, 17, 62], [22, 52, 50, 60], [9, 62, 19, 68],
        [79, 0, 95, 8], [98, 0, 148, 20], [100, 32, 124, 42], [132, 36, 148, 50],
        [154, 0, 222, 16], [164, 30, 190, 48], [154, 40, 166, 46], [188, 40, 200, 46], [204, 60, 224, 70],
        [82, 80, 94, 90], [130, 80, 142, 90], [140, 54, 152, 62], [78, 52, 90, 60], [151, 64, 163, 72], [208, 82, 224, 90]],
      paint(b, R) {
        // the bedroom's braided rag rug and the family room's woven one, the doormat
        R(22, 28, 70, 50, (x, y, w, h) => { const d = Math.min(x, y, w - 1 - x, h - 1 - y); return ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2 > 1.02 ? 0 : ['rose', 'cream1', 'sky3', 'cream1', 'roofR1'][d % 5]; });
        R(92, 26, 134, 56, (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 2 ? 'roofR3' : e < 4 ? 'cream1' : (x + y) % 8 < 4 === (x - y + 64) % 8 < 4 ? 'roofR2' : 'roofR1'; });
        R(98, 76, 126, 90, (x, y, w, h) => (Math.min(x, y, w - 1 - x, h - 1 - y) < 1 ? 'dirt3' : y % 2 ? 'dirt2' : 'dirt1'));
      },
      back(b, w, h, win) {
        // posts where the bays meet; over the bed a stitched sampler, over the desk the bedroom's window, the family's
        // photos over the sofa, the kitchen's shelf of jars over the counter
        for (const x of [76, 150]) post(b, x - 2, h - 2);
        fill(b, 10, 14, 22, 16, 'wood3'); fill(b, 11, 15, 20, 14, 'cream0');
        stamp(b, 14, 17, ['.rr.rr..y.', 'rrrrrrr.yy', '.rrrrr..y.', '..rrr...g.', '...r...ggg'], { r: 'rose', y: 'yellow', g: 'roofG2' });
        fill(b, 13, 25, 16, 1, 'roofB2');
        win(b, 48, 12, 18, 16);
        photo(b, 106, 10, 12, 14, [[6, 2]]); photo(b, 120, 6, 18, 14, [[5, 2], [12, 1]]); photo(b, 140, 12, 8, 10, [[4, 1]]);
        hooks(b, 37, 10, ['cap']);
        V.clock(b, 160, 8, 5, 17);
        fill(b, 156, 24, 40, 3, 'wood2'); fill(b, 156, 26, 40, 1, 'wood4');
        [[158, 'roofR2'], [168, 'cream1'], [178, 'sky3'], [188, 'roofR1']].forEach(([x, c], i) => { fill(b, x, 24 - 7 - (i % 2) * 2, 6, 7 + (i % 2) * 2, c); fill(b, x + 1, 24 - 6 - (i % 2) * 2, 2, 5, 'white'); });
      },
      left(b, w, h, win) { win(b, 70, 14, 16, 16); },
      right(b, w, h, win) { win(b, 30, 14, 16, 16); hooks(b, 56, 14, ['ladle', 'ladle', 'apron']); pans(b, 6, 12, 2); },
      things(T) {
        // Ratih's basket of wool by the sofa, a palm by the partition, Satria's slippers by the bed, the rice sack by
        // the kitchen, and the firewood in its front corner, clear of the way to the stove
        T.card('wool', PROPS.basket('yarn'), 146, 60); T.card('palm', PROPS.plant(), 84, 58);
        T.card('slippers', sprite(12, 4, b => { for (const x of [0, 7]) { fill(b, x, 0, 5, 4, 'roofB2'); fill(b, x + 1, 0, 3, 1, 'roofB1'); } }), 22, 36);
        T.card('rice_sack', PROPS.sack(), 157, 70); T.card('firewood', sprite(16, 10, b => { for (const [y, n] of [[5, 3], [0, 2]]) for (let i = 0; i < n; i++) { const x = i * 5 + (n === 2 ? 3 : 0); V.disc(b, x + 2, y + 2, 2, 2, 'wood2'); fill(b, x + 2, y, 3, 5, 'wood3'); px(b, x + 2, y + 2, 'wood4'); } }), 216, 90);
        // the bed: a low frame, the kapok mattress, Ratih's patchwork quilt over most of it, a pillow, the headboard
        T.box('bed_frame', 4, 0, 36, 30, 0, 7, (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); fill(b, 0, h - 1, w, 1, 'wood4'); });
        T.box('bed_quilt', 6, 3, 34, 28, 7, 11, (b, w, h, l, which) => {
          if (which !== 'top') { fill(b, 0, 0, w, h, 'roofR2'); fill(b, 0, 0, w, 1, 'roofR1'); return; }
          const Q = ['roofR1', 'cream1', 'sky3', 'yellow', 'rose', 'roofG1'];
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, y < 12 ? (y < 2 ? 'cream2' : 'cream0') : x % 7 === 0 || (y - 12) % 7 === 0 ? 'wall3' : Q[((x / 7 | 0) * 5 + ((y - 12) / 7 | 0) * 3) % Q.length]);
          fill(b, 5, 2, w - 10, 8, 'white'); fill(b, 5, 9, w - 10, 1, 'cream2');
        });
        T.box('bed_head', 4, 0, 36, 2, 0, 20, (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 3, 'wood2'); for (let x = 4; x < w - 2; x += 6) fill(b, x, 4, 2, h - 6, 'wood4'); });
        // a mosquito coil on its tin stand by the foot of the bed, lit each night before sleep: its end glows, a thread of smoke
        const coil = lit => sprite(10, 7, b => {
          fill(b, 0, 5, 10, 2, 'iron2'); fill(b, 0, 5, 10, 1, 'iron1');
          for (const [x, y, w] of [[1, 1, 8], [0, 2, 10], [1, 3, 8], [2, 4, 6]]) fill(b, x, y, w, 1, 'roofG3');
          fill(b, 2, 2, 6, 1, 'roofG2'); fill(b, 4, 2, 2, 1, 'roofG4'); px(b, 3, 3, 'roofG2'); px(b, 6, 1, 'roofG2');
          if (lit) { px(b, 8, 2, 'light0'); px(b, 9, 2, 'light2'); px(b, 9, 1, 'stone1'); px(b, 9, 0, 'stone0'); }
        });
        T.card('coil', coil(false), 40, 34); T.card('coil_lit', coil(true), 40, 34, 0, true);
        // the wardrobe against the west wall, its doors toward the room
        T.box('wardrobe', 1, 36, 17, 62, 0, 40, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); fill(b, 0, h - 3, w, 3, 'wood4');
          if (which === 'right') for (const x of [3, (w >> 1) + 1]) { fill(b, x, 4, (w >> 1) - 4, h - 10, 'wood2'); fill(b, x, 4, (w >> 1) - 4, 1, 'wood1'); px(b, x === 3 ? (w >> 1) - 2 : (w >> 1) + 2, h >> 1, 'brass1'); }
          if (which === 'top') fill(b, 0, 0, w, h, 'wood4');
        });
        // the writing desk under the window, the journal open on it and the oil lamp at its end by the bed, its chair pulled out
        T.box('desk_top', 42, 0, 72, 14, 13, 16, (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); });
        T.box('desk_drawers', 58, 2, 70, 14, 0, 13, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); if (which === 'front') for (const y of [2, 7]) { fill(b, 1, y, w - 2, 4, 'wood2'); px(b, w >> 1, y + 2, 'brass1'); } });
        T.box('desk_leg', 43, 2, 46, 14, 0, 13, (b, w, h) => fill(b, 0, 0, w, h, 'wood4'));
        T.card('journal', sprite(12, 4, b => { fill(b, 0, 0, 6, 4, 'cream0'); fill(b, 6, 0, 6, 4, 'cream1'); for (let y = 1; y < 4; y++) { fill(b, 1, y, 4, 1, y % 2 ? 'stone2' : 'cream0'); fill(b, 7, y, 3, 1, y % 2 ? 'stone2' : 'cream1'); } }), 55, 10, 16);
        T.card('lamp', sprite(7, 13, b => { fill(b, 2, 9, 3, 4, 'brass2'); fill(b, 1, 11, 5, 2, 'brass3'); fill(b, 1, 2, 5, 7, 'cream0'); fill(b, 2, 3, 2, 5, 'light1'); fill(b, 2, 0, 3, 2, 'brass2'); }), 45, 6, 16);
        T.card('lamp_lit', sprite(7, 13, b => { fill(b, 2, 9, 3, 4, 'brass2'); fill(b, 1, 11, 5, 2, 'brass3'); fill(b, 1, 2, 5, 7, 'light1'); fill(b, 2, 3, 3, 5, 'light0'); px(b, 3, 5, 'white'); fill(b, 2, 0, 3, 2, 'brass2'); }), 45, 6, 16, true);
        T.card('desk_chair', sprite(14, 22, b => { fill(b, 1, 0, 12, 3, 'wood3'); fill(b, 1, 0, 12, 1, 'wood2'); fill(b, 2, 3, 2, 9, 'wood3'); fill(b, 10, 3, 2, 9, 'wood3'); fill(b, 4, 5, 6, 1, 'wood4'); fill(b, 0, 12, 14, 3, 'wood2'); fill(b, 1, 15, 2, 7, 'wood4'); fill(b, 11, 15, 2, 7, 'wood4'); }), 52, 24);
        // Ibu Ratih's treadle sewing machine, walnut on iron legs, and her tin of fabric scraps on the floor beside it (by
        // the wardrobe, clear of the way between the bedroom and the rest of the house)
        T.card('sewing_machine', sprite(28, 26, b => {
          for (const x of [2, 22]) { fill(b, x, 12, 3, 14, 'iron3'); fill(b, x, 12, 1, 14, 'iron2'); }
          fill(b, 5, 19, 17, 5, 'iron3'); for (let x = 6; x < 21; x += 3) fill(b, x, 20, 1, 3, 'iron4'); fill(b, 9, 24, 9, 2, 'iron2');
          fill(b, 0, 9, 28, 4, 'wood3'); fill(b, 0, 9, 28, 1, 'wood2'); fill(b, 0, 12, 28, 1, 'wood4');
          fill(b, 6, 1, 15, 3, 'iron4'); fill(b, 17, 1, 4, 8, 'iron4'); fill(b, 6, 4, 3, 5, 'iron4'); fill(b, 7, 1, 13, 1, 'iron3'); fill(b, 9, 2, 6, 1, 'brass1'); px(b, 19, 5, 'brass1');
          fill(b, 22, 3, 3, 4, 'iron3'); px(b, 23, 4, 'brass2');
        }), 36, 60);
        T.card('scrap_tin', sprite(12, 10, b => { fill(b, 0, 3, 12, 7, 'roofB2'); fill(b, 0, 3, 12, 1, 'roofB1'); fill(b, 2, 5, 8, 3, 'roofB3'); fill(b, 3, 6, 6, 1, 'brass1'); fill(b, 1, 0, 3, 4, 'rose'); fill(b, 4, 1, 3, 3, 'yellow'); fill(b, 7, 0, 4, 4, 'roofG1'); }), 14, 68);
        // the family room: Ayah's books, the dusty sofa against the back wall, his radio on its side table, the tea table
        T.box('bookshelf', 79, 0, 95, 8, 0, 44, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'front') for (let y = 3; y < h - 4; y += 10) { fill(b, 2, y, w - 4, 8, 'wood5'); for (let x = 2; x < w - 3; x += 3) fill(b, x, y + 1 + (x % 2), 2, 7 - (x % 2), ['roofR2', 'roofB2', 'roofG2', 'brass2', 'cream2'][(x + y) % 5]); fill(b, 2, y + 8, w - 4, 1, 'wood2'); }
        });
        const sofa = (b, w, h) => { fill(b, 0, 0, w, h, 'roofG2'); fill(b, 0, 0, w, 1, 'roofG1'); for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) if (hash(x, y, 31) < 0.05) px(b, x, y, 'stone1'); fill(b, 0, h - 1, w, 1, 'roofG3'); };
        T.box('sofa_seat', 104, 5, 142, 20, 0, 10, sofa);
        T.box('sofa_back', 100, 0, 146, 6, 0, 24, sofa);
        T.box('sofa_arm_l', 98, 2, 105, 20, 0, 15, sofa);
        T.box('sofa_arm_r', 141, 2, 148, 20, 0, 15, sofa);
        T.box('tea_table', 100, 32, 124, 42, 0, 8, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); fill(b, 2, 2, w - 4, h - 4, 'cream1'); } });
        T.card('teapot', sprite(11, 8, b => { fill(b, 2, 2, 7, 6, 'white'); fill(b, 3, 1, 5, 1, 'white'); fill(b, 4, 0, 3, 1, 'roofB2'); fill(b, 0, 3, 2, 2, 'white'); fill(b, 9, 3, 2, 3, 'white'); fill(b, 3, 4, 5, 1, 'roofB2'); }), 110, 39, 8);
        T.box('radio_table', 132, 36, 148, 50, 0, 12, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'front') fill(b, 2, 3, w - 4, h - 5, 'wood4'); });
        T.card('radio', sprite(16, 13, b => { fill(b, 0, 2, 16, 11, 'wood2'); fill(b, 1, 0, 14, 3, 'wood2'); fill(b, 2, 0, 12, 1, 'wood1'); fill(b, 2, 4, 7, 7, 'cream2'); for (let y = 5; y < 11; y += 2) fill(b, 2, y, 7, 1, 'wood3'); fill(b, 10, 4, 5, 4, 'brass0'); px(b, 12, 6, 'roofR3'); fill(b, 10, 9, 2, 2, 'wood4'); fill(b, 13, 9, 2, 2, 'wood4'); }), 140, 45, 12);
        T.card('radio_lit', sprite(16, 13, b => { fill(b, 10, 4, 5, 4, 'light1'); fill(b, 11, 5, 3, 2, 'light0'); px(b, 12, 6, 'roofR3'); }), 140, 45, 12, true);
        // the kitchen: the counter along the back wall with its pots, the wood stove and its pipe, the walnut table
        // and its two chairs, the clay water jar
        T.box('counter', 154, 0, 196, 14, 0, 14, (b, w, h, l, which) => {
          if (which === 'top') { fill(b, 0, 0, w, h, 'stone1'); fill(b, 0, 0, w, 1, 'stone0'); return; }
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 2, 'stone2');
          if (which === 'front') for (let x = 3; x < w - 12; x += 18) { fill(b, x, 4, 14, h - 6, 'wood2'); px(b, x + 11, 8, 'brass1'); }
        });
        [[164, 'iron3', 9], [182, 'roofR2', 7]].forEach(([x, c, w], i) => T.card('pot_' + i, sprite(w, 7, b => { fill(b, 0, 1, w, 6, c); fill(b, 1, 0, w - 2, 1, 'iron4'); fill(b, 1, 2, 2, 3, 'white'); }), x, 10, 14));
        T.box('stove', 198, 0, 222, 16, 0, 18, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'iron3'); fill(b, 0, 0, w, 1, 'iron2'); fill(b, 0, h - 2, w, 2, 'iron4');
          if (which === 'front') { fill(b, 3, 5, 10, 8, 'iron4'); fill(b, 5, 7, 6, 4, 'light3'); fill(b, 6, 8, 4, 2, 'light1'); fill(b, 15, 5, 7, 8, 'iron4'); }
          if (which === 'top') for (const cx of [6, 17]) V.disc(b, cx, h >> 1, 4, 3, 'iron4');
        });
        T.card('stove_fire', sprite(10, 8, b => { fill(b, 0, 0, 10, 8, 'light3'); fill(b, 1, 2, 8, 6, 'light2'); fill(b, 2, 4, 6, 4, 'light1'); fill(b, 3, 6, 4, 2, 'light0'); }), 207, 16, 5, true);
        T.box('stove_pipe', 206, 0, 212, 4, 18, WALL - 2, (b, w, h) => { fill(b, 0, 0, w, h, 'iron3'); fill(b, 0, 0, 1, h, 'iron2'); for (let y = 6; y < h; y += 12) fill(b, 0, y, w, 1, 'iron4'); });
        T.card('kettle', sprite(10, 8, b => { fill(b, 1, 2, 8, 6, 'brass2'); fill(b, 2, 1, 6, 1, 'brass2'); fill(b, 3, 0, 4, 1, 'brass3'); fill(b, 2, 3, 2, 3, 'brass0'); fill(b, 8, 3, 2, 2, 'brass3'); }), 215, 10, 18);
        const walnut = (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3'); if (which === 'top') for (let y = 2; y < h; y += 4) fill(b, 1, y, w - 2, 1, 'wood5'); };
        T.box('table_top', 164, 30, 190, 48, 12, 15, walnut);
        for (const [x, y] of [[166, 32], [185, 32], [166, 44], [185, 44]]) T.box(`table_leg_${x}_${y}`, x, y, x + 3, y + 3, 0, 12, (b, w, h) => fill(b, 0, 0, w, h, 'wood5'));
        const chair = flip => sprite(12, 22, b => { const bx = flip ? 9 : 0; fill(b, bx, 0, 3, 14, 'wood4'); fill(b, bx, 0, 3, 1, 'wood3'); fill(b, 0, 12, 12, 3, 'wood3'); fill(b, 0, 12, 12, 1, 'wood2'); for (const x of [1, 9]) fill(b, x, 15, 2, 7, 'wood4'); });
        const lantern = lit => sprite(8, 12, b => { fill(b, 3, 0, 2, 1, 'iron3'); fill(b, 1, 1, 6, 2, 'iron3'); fill(b, 1, 3, 6, 6, lit ? 'light1' : 'cream0'); fill(b, 2, 4, 4, 4, lit ? 'light0' : 'cream1'); fill(b, 1, 3, 1, 6, 'iron3'); fill(b, 6, 3, 1, 6, 'iron3'); fill(b, 0, 9, 8, 3, 'iron3'); fill(b, 0, 9, 8, 1, 'iron2'); });
        T.card('lantern', lantern(false), 180, 40, 15); T.card('lantern_lit', lantern(true), 180, 40, 15, true);
        // the night's keepsake box, brought home from the shop and set on the table (one per night; the story shows it)
        BOXES.forEach((_, i) => T.card(`box_on_table_${i}`, { img: boxItem(i, 'xs', 'closed'), ax: 5, ay: 8 }, 170, 38, 15));
        T.card('chair_l', chair(false), 160, 46); T.card('chair_r', chair(true), 194, 46);
        T.card('water_jar', sprite(20, 22, b => {
          V.disc(b, 10, 12, 9, 9, 'roofR3'); V.disc(b, 9, 11, 8, 8, 'roofR2'); V.disc(b, 7, 9, 3, 3, 'roofR1'); fill(b, 4, 18, 12, 3, 'roofR4');
          fill(b, 3, 0, 14, 4, 'wood3'); fill(b, 3, 0, 14, 1, 'wood2'); fill(b, 9, 0, 2, 1, 'wood4');
        }), 214, 70);
        // by the door, a fern either side of the mat
        const plant = PROPS.plant();
        T.card('door_fern_l', plant, 88, 90); T.card('door_fern_r', plant, 136, 90);
      },
    },
    // The Baker's bakery on the square (Night 1's 1A, and Night 5), cut open: the brick dome oven glowing in the west
    // corner with its flour sacks, the dough and sifting table in the middle (the spruce basin, the sieve, the wash
    // bucket by it), and the shop's counter in the east with the bread display behind it, the recipe book on it and
    // the copper tins along the wall.
    bakery: {
      area: 'square', seed: 11, room: [184, 84], door: 134, bays: [],
      solid: [[4, 0, 54, 30], [2, 38, 22, 50], [62, 30, 116, 46], [118, 44, 128, 52], [150, 22, 182, 34], [132, 0, 182, 8],
        [58, 0, 76, 8], [112, 0, 128, 8], [2, 60, 26, 74], [166, 70, 182, 82]],
      anchors: { knead: [88, 52], oven: [30, 38], till: [140, 16] },
      paint(b, R) {
        // flour dusted round the dough table, and the woven mat before the counter
        R(56, 26, 122, 58, (x, y, w, h) => hash(x, y, 5) < 0.1 * (1 - Math.abs(x - w / 2) / (w / 2)) ? 'cream0' : 0);
        R(134, 40, 176, 56, (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 2 ? 'roofR3' : (x + y) % 6 < 3 ? 'yellow' : 'roofR1'; });
        R(118, 64, 150, 74, (x, y, w, h) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 'wood4' : (x + y) % 4 < 2 ? 'dirt2' : 'dirt1'));
      },
      back(b, w, h, win) {
        win(b, 78, 14, 18, 16);
        // the copper tins on their shelf over the counter, and a bunch of wheat hung to dry by the window
        fill(b, 132, 22, 48, 3, 'wood2'); fill(b, 132, 24, 48, 1, 'wood4');
        [[134, 9], [146, 7], [156, 10], [168, 8]].forEach(([x, hh], i) => { fill(b, x, 22 - hh, 8, hh, i % 2 ? 'roofR2' : 'orange'); fill(b, x + 1, 22 - hh, 2, hh - 1, 'light2'); fill(b, x, 22 - hh, 8, 1, 'roofR3'); });
        for (let i = 0; i < 7; i++) { fill(b, 102 + i, 12, 1, 12 + (i % 3), 'yellow'); px(b, 102 + i, 11, 'brass2'); }
        fill(b, 101, 18, 9, 1, 'roofR3');
        // a shelf of jars over the cooling rack, the peel hung beside it, and the day's loaves chalked on a board
        shelf(b, 56, 12, 20, 4); fill(b, 76, 4, 2, 18, 'wood3'); fill(b, 74, 20, 6, 7, 'wood2'); fill(b, 75, 21, 4, 1, 'wood1');
        fill(b, 112, 6, 16, 14, 'wood3'); fill(b, 113, 7, 14, 12, 'ink2'); for (const [y, n] of [[9, 9], [12, 11], [15, 7]]) { fill(b, 114, y, n, 1, 'cream1'); px(b, 125, y, 'yellow'); }
      },
      left(b, w, h, win) { win(b, 40, 14, 14, 14); pans(b, 8, 10, 3); hooks(b, 62, 12, ['apron']); },
      right(b, w, h, win) { calendar(b, 30, 14); photo(b, 48, 10, 14, 12, [[7, 2]]); },
      things(T) {
        const brick = (b, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, y % 4 === 3 || (x + ((y >> 2) % 2) * 4) % 8 === 0 ? 'roofR4' : hash(x >> 2, y >> 2, 7) < 0.3 ? 'roofR3' : 'roofR2'); };
        // the dome oven: a brick block, its arched mouth dark over the fire
        T.box('oven', 6, 0, 52, 28, 0, 36, (b, w, h, l, which) => {
          brick(b, w, h);
          if (which === 'front') { V.disc(b, w >> 1, h - 4, 10, 11, 'ink2'); fill(b, (w >> 1) - 10, h - 6, 20, 6, 'ink2'); fill(b, (w >> 1) - 12, h - 18, 24, 2, 'stone2'); }
          if (which === 'top') { fill(b, 0, 0, w, h, 'roofR3'); V.disc(b, w >> 1, h >> 1, (w >> 1) - 3, (h >> 1) - 2, 'roofR2'); }
        });
        T.card('oven_fire', sprite(18, 10, b => { fill(b, 0, 4, 18, 6, 'light3'); fill(b, 2, 2, 14, 7, 'light2'); fill(b, 4, 3, 10, 6, 'light1'); fill(b, 6, 5, 6, 3, 'light0'); for (const x of [3, 8, 13]) fill(b, x, 8, 3, 2, 'roofR4'); }), 29, 29, 2, true);
        T.card('oven_embers', sprite(16, 5, b => { fill(b, 0, 2, 16, 3, 'roofR4'); for (const [x, c] of [[1, 'light3'], [4, 'orange'], [7, 'light2'], [10, 'orange'], [13, 'light3']]) fill(b, x, 1 + (x % 2), 3, 2, c); }), 29, 28, 2);
        T.box('oven_flue', 24, 0, 34, 6, 36, WALL - 2, brick);
        const sack = sprite(14, 16, b => { V.disc(b, 7, 9, 6, 7, 'cream1'); fill(b, 2, 3, 10, 3, 'cream2'); fill(b, 4, 0, 6, 4, 'cream1'); fill(b, 3, 3, 8, 1, 'dirt2'); for (const x of [5, 8]) fill(b, x, 8, 1, 4, 'yellow'); px(b, 6, 7, 'yellow'); });
        T.card('flour_sack_0', sack, 9, 48); T.card('flour_sack_1', sack, 18, 46); T.card('flour_sack_2', sack, 12, 40, 6);
        // the dough and sifting table: a scrubbed top on stout legs
        T.box('dough_table', 64, 32, 114, 46, 12, 16, (b, w, h, l, which) => { fill(b, 0, 0, w, h, which === 'top' ? 'cream1' : 'wood3'); fill(b, 0, 0, w, 1, which === 'top' ? 'white' : 'wood2'); if (which === 'top') for (let x = 4; x < w; x += 9) fill(b, x, 2, 4, 1, 'cream2'); });
        for (const [x, y] of [[65, 33], [110, 33], [65, 43], [110, 43]]) T.box(`dough_leg_${x}_${y}`, x, y, x + 3, y + 3, 0, 12, (b, w, h) => fill(b, 0, 0, w, h, 'wood4'));
        T.card('basin', sprite(16, 8, b => { fill(b, 0, 1, 16, 7, 'wood2'); fill(b, 1, 0, 14, 2, 'wood1'); fill(b, 2, 2, 12, 2, 'cream0'); fill(b, 0, 5, 16, 1, 'wood3'); fill(b, 1, 7, 14, 1, 'wood4'); }), 76, 40, 16);
        T.card('sieve', sprite(12, 5, b => { fill(b, 0, 0, 12, 5, 'wood3'); fill(b, 1, 1, 10, 3, 'stone1'); for (let x = 2; x < 10; x += 2) fill(b, x, 1, 1, 3, 'stone2'); fill(b, 0, 0, 12, 1, 'wood2'); }), 96, 38, 16);
        T.card('dough', sprite(10, 6, b => { V.disc(b, 5, 4, 4, 2, 'cream0'); fill(b, 2, 2, 6, 1, 'white'); fill(b, 1, 5, 8, 1, 'cream2'); }), 104, 44, 16);
        T.card('wash_bucket', sprite(10, 11, b => { fill(b, 1, 2, 8, 9, 'wood3'); fill(b, 0, 2, 10, 2, 'iron3'); fill(b, 0, 8, 10, 1, 'iron3'); fill(b, 2, 2, 6, 1, 'water2'); fill(b, 1, 0, 8, 1, 'iron2'); px(b, 0, 1, 'iron2'); px(b, 9, 1, 'iron2'); }), 122, 50);
        // the shop: the counter and its glass case of buns, the bread display on the back wall, the recipe book
        T.box('counter', 150, 22, 182, 34, 0, 16, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 2, 'wood2');
          if (which === 'front') for (let x = 3; x < w - 8; x += 12) { fill(b, x, 4, 9, h - 6, 'wood2'); fill(b, x + 1, 5, 7, 1, 'wood1'); }
          if (which === 'top') { fill(b, 0, 0, w, h, 'cream1'); fill(b, 4, 2, 18, h - 4, 'sky3'); for (let x = 6; x < 20; x += 5) V.disc(b, x, h >> 1, 2, 2, 'orange'); }
        });
        T.box('display', 132, 0, 182, 8, 0, 42, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'front') for (const y of [4, 16, 28]) {
            fill(b, 2, y + 8, w - 4, 2, 'wood4');
            for (let x = 3; x < w - 8; x += 8) { V.disc(b, x + 3, y + 5, 3, 3, y === 16 ? 'roofR1' : 'orange'); fill(b, x + 1, y + 3, 4, 1, 'light2'); }
          }
        });
        T.card('recipe_book', sprite(12, 5, b => { fill(b, 0, 1, 12, 4, 'roofR3'); fill(b, 1, 0, 10, 4, 'cream0'); fill(b, 6, 0, 1, 4, 'cream2'); for (const y of [1, 2, 3]) { fill(b, 2, y, 3, 1, 'stone2'); fill(b, 8, y, 2, 1, 'stone2'); } }), 170, 30, 16);
        T.card('bell', sprite(6, 6, b => { fill(b, 1, 1, 4, 4, 'brass1'); fill(b, 2, 0, 2, 1, 'brass2'); fill(b, 0, 5, 6, 1, 'brass3'); px(b, 2, 2, 'brass0'); }), 156, 30, 16);
        // the cooling rack of loaves, baskets of bread by the shelves, crates and the broom in the corner, a stool by
        // the counter and a fern by the door
        T.box('cooling_rack', 58, 0, 76, 8, 0, 36, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3');
          if (which === 'front') for (let y = 4; y < h - 2; y += 10) { fill(b, 1, y + 6, w - 2, 1, 'iron2'); for (let x = 2; x < w - 4; x += 5) { V.disc(b, x + 2, y + 4, 2, 2, (x + y) % 3 ? 'orange' : 'roofR1'); px(b, x + 1, y + 3, 'light2'); } }
        });
        T.card('bread_basket_0', PROPS.basket('loaves'), 120, 8); T.card('bread_basket_1', PROPS.basket('loaves'), 120, 4, 9);
        T.box('crate_0', 4, 60, 22, 72, 0, 14, PROPS.crate); T.box('crate_1', 6, 62, 18, 70, 14, 24, PROPS.crate);
        T.card('broom', PROPS.broom(), 27, 64);
        T.card('flour_barrel', PROPS.barrel(), 174, 80); T.card('stool', PROPS.stool(), 146, 42); T.card('fern', PROPS.plant(), 160, 82);
        T.card('bakery_lamp', sprite(8, 12, b => { fill(b, 3, 0, 2, 2, 'iron3'); fill(b, 1, 2, 6, 8, 'light1'); fill(b, 2, 3, 4, 6, 'light0'); fill(b, 0, 10, 8, 2, 'iron3'); }), 92, 36, 16, true);
      },
    },
    // The Mender's forge by the line (Night 1's 1B, Night 5's resoling), cut open: the stone hearth glowing in the west
    // corner with its bellows and the quench tub, the rail anvil on its stump, the tools on the back wall, the gear
    // table with its lens under the window, and in the east corner the resin heater and the wooden shoe press under
    // the shelf of old parts and the brass plates of 1952.
    forge: {
      area: 'station', seed: 19, room: [184, 80], door: 120, bays: [],
      solid: [[4, 0, 46, 26], [46, 6, 58, 20], [30, 44, 46, 56], [62, 40, 78, 50], [110, 6, 152, 22], [156, 0, 182, 8], [160, 26, 182, 56],
        [60, 0, 76, 10], [80, 0, 106, 10], [4, 62, 20, 74], [160, 66, 182, 76]],
      anchors: { anvil: [70, 56], bench: [130, 30], hearth: [26, 34] },
      wall(b, w, h, seed) {
        V.wallPanel(b, 0, 0, w, h, 'stone', seed);
        // a plinth of dark stone where the floor's cinders get kicked
        for (let y = h - 12; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, y === h - 12 ? 'stone2' : (x + ((y >> 2) % 2) * 6) % 12 === 0 || y % 4 === 3 ? 'stone4' : 'stone3');
        fill(b, 0, 0, w, 4, 'wood4'); fill(b, 0, 3, w, 1, 'wood5'); fill(b, 0, h - 2, w, 2, 'stone4');
      },
      paint(b, R) {
        // stone flags round the hearth and the anvil, where sparks fall, and cinders on them
        R(2, 24, 84, 66, (x, y, w, h) => { const d = ((x - 4) / 80) ** 2 + ((y - 2) / 42) ** 2; if (d > 1 - hash(x >> 3, y >> 2, 4) * 0.12) return 0; const r = y % 7, c = (x + ((y / 7 | 0) % 2) * 5) % 10; return r === 6 || c === 0 ? 'stone4' : hash(x, y, 9) < 0.06 ? 'wood5' : hash(x >> 2, y / 7 | 0, 3) < 0.4 ? 'stone3' : 'stone2'; });
        R(100, 64, 140, 74, (x, y, w, h) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 'wood4' : (x * 3 + y) % 5 < 2 ? 'dirt3' : 'dirt2'));
      },
      back(b, w, h, win) {
        win(b, 120, 14, 18, 16);
        // soot climbing the wall over the hearth, horseshoes nailed up for luck, a chain on its hook
        for (let y = 0; y < h; y++) for (let x = 0; x < 50; x++) if (hash(x, y, 2) < 0.5 * (1 - Math.abs(x - 25) / 25) * (1 - y / h)) px(b, x, y, hash(x, y, 3) < 0.5 ? 'stone4' : 'stone3');
        hooks(b, 62, 34, ['shoe', 'shoe', 'shoe', 'shoe', 'shoe']); hooks(b, 142, 10, ['chain', 'chain']);
        // the tool rack: a board with tongs, hammers and files hung in a row
        fill(b, 62, 14, 44, 4, 'wood3'); fill(b, 62, 14, 44, 1, 'wood2');
        [[66, 'tongs'], [74, 'hammer'], [82, 'hammer'], [90, 'file'], [96, 'tongs'], [102, 'file']].forEach(([x, k]) => {
          if (k === 'hammer') { fill(b, x + 1, 18, 1, 12, 'wood3'); fill(b, x - 1, 28, 5, 3, 'iron3'); }
          else if (k === 'tongs') { fill(b, x, 18, 1, 13, 'iron3'); fill(b, x + 2, 18, 1, 13, 'iron3'); fill(b, x, 29, 3, 2, 'iron4'); }
          else { fill(b, x, 18, 2, 12, 'iron2'); fill(b, x, 18, 2, 3, 'wood3'); }
        });
      },
      right(b, w, h, win) { win(b, 36, 14, 14, 14); calendar(b, 58, 14, 'stone3'); },
      left(b, w, h, win) { hooks(b, 60, 12, ['coat', 'chain']); },
      things(T) {
        const stoneBox = (b, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, y % 6 === 5 || (x + ((y / 6 | 0) % 2) * 5) % 10 === 0 ? 'stone4' : hash(x >> 2, y >> 2, 3) < 0.3 ? 'stone3' : 'stone2'); };
        // the hearth: a stone block, the fire in its mouth, the hood and chimney over it
        T.box('hearth', 6, 0, 44, 24, 0, 22, (b, w, h, l, which) => { stoneBox(b, w, h); if (which === 'front') { fill(b, 6, h - 12, w - 12, 10, 'ink2'); fill(b, 4, h - 14, w - 8, 2, 'stone1'); } if (which === 'top') { fill(b, 3, 3, w - 6, h - 6, 'ink2'); for (let i = 0; i < 14; i++) px(b, 5 + ((i * 7) % (w - 10)), 5 + ((i * 5) % (h - 10)), i % 3 ? 'light2' : 'light1'); } });
        T.card('hearth_fire', sprite(20, 10, b => { fill(b, 0, 5, 20, 5, 'light3'); fill(b, 2, 3, 16, 6, 'light2'); fill(b, 5, 2, 10, 6, 'light1'); fill(b, 8, 4, 4, 3, 'light0'); for (const x of [2, 8, 14]) fill(b, x, 8, 4, 2, 'stone4'); }), 25, 25, 2, true);
        T.card('hearth_embers', sprite(18, 5, b => { fill(b, 0, 2, 18, 3, 'stone4'); for (const [x, c] of [[1, 'light3'], [5, 'orange'], [9, 'light2'], [12, 'orange'], [15, 'light3']]) fill(b, x, 1 + (x % 2), 3, 2, c); }), 25, 24, 2);
        T.box('hood', 4, 0, 46, 14, 34, 48, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'iron3'); fill(b, 0, 0, w, 1, 'iron2'); fill(b, 0, h - 2, w, 2, 'iron4'); for (let x = 5; x < w; x += 8) fill(b, x, 2, 1, h - 4, 'iron4'); });
        T.box('chimney', 18, 0, 32, 8, 48, WALL - 2, stoneBox);
        T.card('bellows', sprite(14, 10, b => { fill(b, 0, 3, 12, 6, 'wood4'); fill(b, 1, 2, 10, 2, 'dirt3'); fill(b, 2, 4, 8, 4, 'dirt2'); for (const x of [3, 6, 9]) fill(b, x, 4, 1, 4, 'dirt3'); fill(b, 12, 5, 2, 2, 'brass2'); }), 52, 20);
        T.card('quench_tub', sprite(16, 12, b => { fill(b, 1, 2, 14, 10, 'wood3'); fill(b, 0, 2, 16, 2, 'iron3'); fill(b, 0, 9, 16, 1, 'iron3'); fill(b, 2, 2, 12, 1, 'water3'); fill(b, 1, 0, 14, 2, 'wood2'); fill(b, 4, 0, 3, 1, 'stone0'); }), 38, 56);
        // the rail anvil, cut from a length of the old line, on its stump
        T.card('anvil', sprite(18, 16, b => {
          fill(b, 4, 8, 10, 8, 'wood3'); fill(b, 4, 8, 10, 1, 'wood2'); for (const x of [6, 10]) fill(b, x, 10, 1, 5, 'wood4');
          fill(b, 1, 2, 16, 3, 'iron2'); fill(b, 1, 2, 16, 1, 'iron1'); fill(b, 6, 5, 6, 3, 'iron3'); fill(b, 3, 7, 12, 2, 'iron3'); fill(b, 0, 3, 2, 1, 'iron2');
        }), 70, 50);
        // the gear table under the window: the calibration lens on its arm, gears and a loupe laid out
        T.box('gear_table', 110, 8, 152, 22, 12, 16, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'top') { fill(b, 2, 2, w - 4, h - 4, 'roofG3'); fill(b, 2, 2, w - 4, 1, 'roofG2'); } });
        for (const [x, y] of [[111, 9], [148, 9], [111, 19], [148, 19]]) T.box(`gear_leg_${x}_${y}`, x, y, x + 3, y + 3, 0, 12, (b, w, h) => fill(b, 0, 0, w, h, 'wood4'));
        T.card('gears', sprite(20, 6, b => { for (const [cx, r, c] of [[4, 3, 'brass1'], [11, 2, 'brass2'], [16, 2, 'brass1']]) { V.disc(b, cx, 3, r, r, c); px(b, cx, 3, 'brass3'); } }), 124, 18, 16);
        T.card('lens', sprite(10, 14, b => { fill(b, 1, 12, 8, 2, 'iron3'); fill(b, 4, 4, 2, 8, 'iron3'); V.disc(b, 5, 3, 4, 3, 'iron2'); V.disc(b, 5, 3, 3, 2, 'sky2'); px(b, 4, 2, 'white'); }), 142, 14, 16);
        // the shelf of old parts and the brass plates of 1952
        T.box('parts_shelf', 156, 0, 182, 8, 0, 40, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'front') for (const y of [4, 16, 28]) { fill(b, 2, y + 8, w - 4, 2, 'wood4'); for (let x = 3; x < w - 4; x += 6) fill(b, x, y + 3, 4, 5, (x + y) % 3 ? 'brass1' : 'iron2'); }
        });
        // the coal bin and the workbench with its vice under the tools, the grindstone and a heap of scrap iron by the
        // door, and lengths of old rail stacked in the east corner
        T.box('coal_bin', 60, 0, 76, 10, 0, 12, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3'); if (which === 'top') { fill(b, 1, 1, w - 2, h - 2, 'ink2'); for (let i = 0; i < 12; i++) px(b, 2 + ((i * 5) % (w - 4)), 2 + ((i * 3) % (h - 4)), 'stone3'); } });
        T.box('workbench', 80, 0, 106, 10, 0, 16, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 2, 'wood2'); if (which === 'front') { fill(b, 2, 4, w - 4, h - 6, 'wood4'); fill(b, 4, 6, 6, 3, 'wood2'); px(b, 7, 7, 'brass1'); } });
        T.card('vice', sprite(10, 8, b => { fill(b, 0, 4, 10, 4, 'iron3'); fill(b, 1, 0, 3, 4, 'iron2'); fill(b, 6, 0, 3, 4, 'iron2'); fill(b, 0, 2, 10, 1, 'iron4'); }), 98, 8, 16);
        T.card('grindstone', sprite(16, 16, b => { fill(b, 2, 9, 2, 7, 'wood4'); fill(b, 12, 9, 2, 7, 'wood4'); fill(b, 1, 9, 14, 2, 'wood3'); V.disc(b, 8, 7, 6, 6, 'stone2'); V.disc(b, 8, 7, 4, 4, 'stone1'); px(b, 8, 7, 'iron3'); fill(b, 14, 6, 2, 1, 'iron3'); }), 12, 74);
        T.card('scrap', sprite(16, 8, b => { fill(b, 1, 5, 14, 3, 'iron3'); fill(b, 3, 2, 3, 4, 'iron2'); fill(b, 8, 1, 6, 2, 'roofR3'); fill(b, 10, 3, 2, 3, 'iron4'); V.disc(b, 6, 4, 2, 2, 'brass3'); px(b, 4, 3, 'iron1'); }), 30, 74);
        T.box('rails', 160, 66, 182, 76, 0, 8, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'iron3'); for (let y = 0; y < h; y += 3) fill(b, 0, y, w, 1, 'iron2'); if (which === 'right' || which === 'front') fill(b, 0, h - 1, w, 1, 'iron4'); });
        // the resin heater (a little brazier with its pot) and the wooden shoe press in the east corner
        T.card('resin_heater', sprite(12, 14, b => { fill(b, 1, 6, 10, 8, 'iron3'); fill(b, 1, 6, 10, 1, 'iron2'); fill(b, 3, 9, 6, 3, 'light2'); fill(b, 2, 2, 8, 4, 'iron4'); fill(b, 3, 1, 6, 2, 'wood5'); fill(b, 4, 1, 4, 1, 'orange'); }), 168, 34);
        T.card('shoe_press', sprite(14, 20, b => { fill(b, 1, 14, 12, 6, 'wood3'); fill(b, 1, 14, 12, 1, 'wood2'); fill(b, 2, 0, 2, 14, 'wood4'); fill(b, 10, 0, 2, 14, 'wood4'); fill(b, 2, 0, 10, 2, 'wood3'); fill(b, 6, 2, 2, 7, 'iron3'); fill(b, 4, 9, 6, 2, 'wood2'); fill(b, 4, 11, 6, 3, 'dirt3'); }), 170, 54);
      },
    },
    // Marlow's shop (GDD 7.6, LOC-INT-02). The Shop That Opens Once, grown into the ancient tree behind it: its roots
    // come over the back wall, down it and out across the boards. In the middle the shop: the counter and its oil
    // lamp, Marlow behind it, and against the back wall the pendulum clock stopped at 10:17 (clock_<hhmm>, a minute
    // on for each lantern out) and the glass-fronted cabinet of the seven carved boxes (keepsake_i, opened and empty
    // once Marlow hands its keepsake over: box_open_i), each box's lantern standing on the cabinet over it (lantern_i
    // lit over its dark one). West, the red rug and its round table, the curio cases along the wall, and behind the
    // partition Marlow's own room: the stair up, his books and writing desk, his armchair and candle, the station
    // master's cap and the last train in its frame. East, the store: shelves, crates, a trunk, barrels, sacks and the
    // back door. The door is in the front, a little west of the middle.
    shop: {
      area: 'grove', seed: 13, room: [272, 136], door: 150,
      bays: [[96, 44], [204, 40]],
      solid: [[2, 0, 28, 44], [46, 0, 62, 8], [66, 0, 92, 12], [34, 36, 50, 46], [56, 36, 64, 42],
        [100, 0, 114, 6], [116, 0, 200, 10], [124, 46, 196, 54],
        [1, 64, 15, 80], [1, 90, 15, 106], [48, 86, 72, 96], [34, 88, 44, 96], [76, 88, 86, 96],
        [208, 0, 226, 12], [258, 18, 271, 60], [258, 72, 271, 106], [214, 52, 240, 62], [236, 74, 254, 86],
        [220, 92, 244, 104], [208, 108, 222, 116], [176, 78, 200, 90], [98, 100, 110, 108], [113, 118, 123, 126],
        [194, 48, 206, 56], [211, 18, 227, 26]],
      // the customer's side of the counter, the clock, Marlow's place behind the counter, and before each box
      anchors: { counter: [160, 64], clock: [107, 16], marlow: [160, 36], ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(i => ['box_' + i, [Math.min(122 + 12 * i, 190), 18]])) },
      // faded plum paper with a gold sprig, over a wainscot painted the shopfront's bottle green
      wall(b, w, h, seed) {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, x % 10 === 0 ? PLUM[4] : hash(x, y, seed) < 0.03 ? PLUM[5] : PLUM[3]);
        for (let y = 9; y < h - 22; y += 12) for (let x = 5; x < w; x += 10) { px(b, x, y, 'brass2'); px(b, x - 1, y + 1, PLUM[2]); px(b, x + 1, y + 1, PLUM[2]); px(b, x, y + 2, PLUM[2]); }
        for (let x = 0; x < w; x++) fill(b, x, h - 18, 1, 18, x % 6 === 0 ? GREEN[3] : x % 6 === 1 ? GREEN[1] : GREEN[2]);
        fill(b, 0, h - 19, w, 2, 'wood4'); fill(b, 0, h - 19, w, 1, 'wood2');
        fill(b, 0, h - 2, w, 2, 'wood5');
        fill(b, 0, 0, w, 4, 'wood4'); fill(b, 0, 3, w, 1, 'wood5'); fill(b, 0, 0, w, 1, 'wood3');
      },
      paint(b, R) {
        // the red rug under the round table, Marlow's worn one by his armchair, the runner from the door to the
        // counter and the doormat
        const red = (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 1 ? 'roofR4' : e < 3 ? 'brass2' : e < 4 ? 'roofR3' : (x + y) % 6 === 0 || (x - y + 120) % 6 === 0 ? 'roofR1' : 'roofR2'; };
        R(24, 68, 96, 114, (x, y, w, h) => (((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2 > 1.02 ? 0 : red(x, y, w, h)));
        R(32, 28, 72, 52, (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 1 ? PLUM[4] : e < 2 ? 'brass3' : (x >> 2) % 2 === (y >> 2) % 2 ? PLUM[1] : PLUM[2]; });
        R(140, 56, 160, 126, red);
        R(136, 126, 164, 136, (x, y, w, h) => (Math.min(x, y, w - 1 - x, h - 1 - y) < 1 ? 'dirt3' : y % 2 ? 'dirt2' : 'dirt1'));
      },
      back(b, w, h) {
        // posts where the bays meet; the roots over the wall down the partitions, the tree's leaves spilling over its
        // top; the store's back door
        for (const x of [96, 204]) post(b, x - 2, h - 2);
        // over the stair, the way up into Marlow's rooms: a dark doorway in a timber frame
        fill(b, 3, 0, 24, h - 38, 'wood4'); fill(b, 5, 0, 20, h - 40, '#1d1420'); fill(b, 5, 0, 20, 2, 'wood5');
        // his station master's cap on its peg, and the last train in its frame over his desk
        fill(b, 35, 14, 2, 2, 'wood4'); fill(b, 31, 16, 10, 4, 'roofB3'); fill(b, 31, 16, 10, 1, 'roofB2'); fill(b, 30, 19, 13, 2, 'iron4'); px(b, 35, 17, 'brass1');
        fill(b, 66, 6, 26, 18, 'wood3'); fill(b, 66, 6, 26, 1, 'wood2'); fill(b, 67, 7, 24, 16, 'cream1'); fill(b, 68, 8, 22, 14, 'wall3');
        fill(b, 71, 14, 12, 5, 'wood4'); fill(b, 81, 11, 5, 8, 'wood4'); fill(b, 74, 11, 2, 3, 'wood4'); fill(b, 69, 20, 20, 1, 'wood4');
        for (const x of [73, 77, 83]) px(b, x, 19, 'wall2');
        for (const [x, y] of [[74, 9], [72, 8], [69, 9]]) fill(b, x, y, 2, 1, 'cream0');
        V.hangRoot(b, [[92, 0], [98, 16], [94, 34], [96, h]], 15, 6, 3);
        V.hangRoot(b, [[210, 0], [204, 20], [208, 38], [204, h]], 14, 6, 4);
        V.hangRoot(b, [[84, 0], [80, 12], [79, 22]], 6, 3, 5);
        V.hangRoot(b, [[218, 0], [223, 14], [224, 26]], 7, 3, 6);
        V.hangRoot(b, [[156, 0], [160, 8], [158, 14]], 6, 3, 7);
        for (const [cx, cy, rx, ry, seed] of [[94, 2, 22, 5, 7], [70, 1, 9, 3, 8], [158, 1, 14, 3, 9], [210, 2, 20, 5, 10], [240, 1, 9, 3, 11]])
          V.foliage(b, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, [cx - rx, cy - ry, cx + rx, cy + ry], V.LEAF.deep, seed, { cw: 6, ch: 5, dx: 4, dy: 3 });
        fill(b, 230, h - 46, 26, 46, 'wood5'); fill(b, 232, h - 44, 22, 42, GREEN[2]); fill(b, 232, h - 44, 22, 1, GREEN[1]);
        for (let x = 236; x < 254; x += 5) fill(b, x, h - 43, 1, 41, GREEN[3]);
        fill(b, 233, h - 32, 20, 2, GREEN[4]); fill(b, 233, h - 12, 20, 2, GREEN[4]); px(b, 251, h - 23, 'brass1'); px(b, 251, h - 22, 'brass3');
      },
      left(b, w, h, win) { win(b, 42, 14, 16, 16); }, // over the curio cases
      right(b, w, h, win) { win(b, 20, 14, 16, 16); },
      things(T) {
        // Marlow's room: the stair up the west wall to the doorway into his rooms, its banister along the open side;
        // his books and his writing desk with its ledgers; his armchair, his little table and its candle
        for (let k = 0; k < 11; k++) T.box('stair_' + k, 4, 0, 26, 44 - 4 * k, 0, 2 + 4 * k, (b, w, h, l, which) => {
          if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); fill(b, 0, 0, w, 1, 'wood1'); return; }
          fill(b, 0, 0, w, h, which === 'front' ? 'wood4' : 'wood5'); fill(b, 0, 0, w, 1, 'wood3');
        });
        T.box('stair_string', 26, 0, 28, 44, 0, 4, (b, w, h) => fill(b, 0, 0, w, h, 'wood5'));
        for (let k = 0; k < 11; k += 2) T.card('baluster_' + k, sprite(1, 12, b => fill(b, 0, 0, 1, 12, 'wood3')), 27, 43 - 4 * k, 2 + 4 * k);
        T.card('newel', sprite(3, 16, b => { fill(b, 0, 0, 3, 16, 'wood3'); fill(b, 0, 0, 3, 2, 'wood2'); fill(b, 1, 2, 1, 14, 'wood2'); }), 27, 46);
        T.box('bookshelf', 46, 0, 62, 8, 0, 48, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3');
          if (which === 'front') for (let y = 3; y < h - 4; y += 11) { fill(b, 2, y, w - 4, 9, 'wood5'); for (let x = 2; x < w - 3; x += 3) fill(b, x, y + 2 + (x % 2), 2, 7 - (x % 2), ['roofR3', PLUM[2], 'roofG3', 'brass3', 'wood2'][(x + y) % 5]); fill(b, 2, y + 9, w - 4, 1, 'wood3'); }
        });
        T.box('desk', 66, 0, 92, 12, 0, 15, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); return; }
          if (which === 'front') for (const x of [2, w - 10]) { fill(b, x, 3, 8, h - 5, 'wood4'); px(b, x + 4, 7, 'brass1'); }
        });
        T.card('desk_ledgers', sprite(14, 7, b => { fill(b, 0, 3, 13, 4, 'roofR3'); fill(b, 1, 3, 12, 1, 'cream1'); fill(b, 1, 0, 11, 3, 'roofB3'); fill(b, 2, 0, 10, 1, 'cream1'); fill(b, 6, 4, 1, 3, 'brass2'); }), 74, 8, 15);
        const candle = lit => sprite(5, 9, b => { fill(b, 0, 7, 5, 2, 'brass2'); fill(b, 1, 3, 3, 4, 'cream0'); fill(b, 1, 3, 1, 4, 'white'); if (lit) { fill(b, 2, 0, 1, 3, 'light1'); px(b, 2, 2, 'light0'); } });
        T.card('desk_candle', candle(false), 86, 6, 15); T.card('desk_candle_lit', candle(true), 86, 6, 15, true);
        T.card('armchair', sprite(18, 20, b => {
          fill(b, 1, 0, 7, 16, PLUM[1]); fill(b, 1, 0, 7, 1, PLUM[0]); fill(b, 1, 10, 16, 5, PLUM[1]); fill(b, 1, 10, 16, 1, PLUM[0]);
          fill(b, 13, 7, 4, 8, PLUM[2]); fill(b, 13, 7, 4, 1, PLUM[0]); fill(b, 1, 15, 16, 2, PLUM[3]); fill(b, 2, 17, 2, 3, 'wood4'); fill(b, 14, 17, 2, 3, 'wood4');
        }), 42, 46);
        T.card('nook_table', sprite(10, 14, b => { fill(b, 0, 0, 10, 2, 'wood2'); fill(b, 0, 1, 10, 1, 'wood3'); fill(b, 4, 2, 2, 10, 'wood4'); fill(b, 2, 12, 6, 2, 'wood4'); }), 60, 41);
        T.card('candle', candle(false), 62, 40, 14); T.card('candle_lit', candle(true), 62, 40, 14, true);
        // the pendulum clock against the back wall, stopped at 10:17: its face a card for each minute on
        T.box('clock_case', 100, 0, 114, 6, 0, 60, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3'); fill(b, 0, h - 3, w, 3, 'wood5');
          if (which === 'top') { fill(b, 0, 0, w, h, 'wood3'); return; }
          if (which !== 'front') return;
          fill(b, 1, 2, w - 2, 17, 'wood5'); fill(b, 3, 24, w - 6, 24, 'wood5'); fill(b, 4, 25, w - 8, 22, '#1d1420');
          fill(b, w >> 1, 25, 1, 15, 'brass3'); V.disc(b, w >> 1, 41, 2, 2, 'brass1'); px(b, (w >> 1) - 1, 40, 'brass0'); fill(b, 4, 25, 1, 22, PLUM[4]);
        });
        // (a card leans back a third of a row for each px up it stands, so one in front of a face stands far enough out
        // that its top stays in front, lifted as much more so it shows where it was)
        for (let m = 0; m < 8; m++) T.card('clock_' + (1017 + m), sprite(13, 13, b => V.clock(b, 6, 6, 6, 17 + m)), 107, 12, 49);
        // the cabinet of the seven boxes: drawers under seven cubbies lined in plum velvet and lit from above, each
        // behind its glass; in each a carved box clasped in brass, or once its keepsake is given, that box open and
        // empty; on top, each box's lantern
        T.box('cabinet', 116, 0, 200, 10, 0, 32, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); fill(b, 0, h - 2, w, 2, 'wood5');
          if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); fill(b, 0, h - 1, w, 1, 'wood3'); return; }
          if (which !== 'front') return;
          fill(b, 0, 0, w, 4, 'wood4'); fill(b, 0, 3, w, 1, 'brass3'); fill(b, 0, 0, w, 1, 'wood2');
          for (let i = 0; i < 7; i++) {
            const x = 12 * i + 2;
            for (let y = 5; y < 21; y++) fill(b, x, y, 10, 1, y < 7 ? 'light2' : y < 9 ? PLUM[1] : y < 14 ? PLUM[2] : PLUM[3]);
            fill(b, x, 21, 10, 1, 'wood2');
            fill(b, x + 1, 24, 7, 4, 'wood4'); fill(b, x + 1, 24, 7, 1, 'wood2'); px(b, x + 4, 26, 'brass1');
          }
        });
        T.card('cabinet_light', sprite(80, 2, b => fill(b, 0, 0, 80, 2, 'light1')), 158, 12, 27, true);
        const RELIC = BOXES.map(([, c, , k]) => [c, k]);
        // a box: its body carved in a band of diamonds, brass bands at its ends and its clasp; closed, its lid domed
        // over it; open, the lid stands up behind and the velvet inside is empty
        const body = (b, y, c, k) => {
          fill(b, 0, y, 9, 11 - y, c); fill(b, 0, 10, 9, 1, 'wood5');
          for (let x = 1; x < 8; x++) px(b, x, y + 2 + ((x & 1) ^ 1), 'wood5');
          fill(b, 0, y, 1, 11 - y, 'brass3'); fill(b, 8, y, 1, 11 - y, 'brass3'); fill(b, 4, y, 1, 3, k);
        };
        RELIC.forEach(([c, k], i) => {
          const x = 122 + 12 * i;
          T.card('box_open_' + i, sprite(9, 11, b => { fill(b, 0, 0, 9, 4, c); fill(b, 1, 1, 7, 3, 'wood5'); fill(b, 0, 0, 9, 1, 'cream0'); fill(b, 0, 4, 9, 2, PLUM[5]); body(b, 6, c, k); }), x, 15, 16);
          T.card('keepsake_' + i, sprite(9, 11, b => { fill(b, 1, 0, 7, 1, c); fill(b, 0, 1, 9, 4, c); fill(b, 1, 0, 7, 1, 'cream0'); fill(b, 0, 1, 1, 1, 'cream0'); fill(b, 0, 4, 9, 1, 'wood5'); body(b, 5, c, k); px(b, 4, 4, k); }), x, 15, 16);
          T.card('glass_' + i, bare(10, 15, b => { for (let k2 = 0; k2 < 4; k2++) px(b, 7 - k2, 1 + k2, 'white'); px(b, 8, 9, 'white'); px(b, 9, 8, 'white'); }), x, 16, 17);
        });
        const lantern = lit => sprite(9, 16, b => {
          fill(b, 3, 0, 3, 1, 'iron4'); px(b, 2, 1, 'iron4'); px(b, 6, 1, 'iron4'); fill(b, 3, 2, 3, 1, 'iron3');
          fill(b, 2, 3, 5, 1, 'iron3'); fill(b, 1, 4, 7, 1, 'iron4');
          fill(b, 1, 5, 7, 8, 'iron4'); fill(b, 2, 5, 5, 8, lit ? 'light2' : 'stone5');
          if (lit) { fill(b, 3, 6, 3, 6, 'light1'); fill(b, 4, 7, 1, 3, 'light0'); } else px(b, 2, 5, 'sky4');
          fill(b, 4, 5, 1, 8, lit ? 'brass2' : 'iron3'); fill(b, 0, 13, 9, 2, 'iron3'); fill(b, 0, 13, 9, 1, 'iron2'); fill(b, 1, 15, 7, 1, 'iron4');
        });
        RELIC.forEach((_, i) => { const x = 122 + 12 * i; T.card('lantern_dark_' + i, lantern(false), x, 5, 32); T.card('lantern_' + i, lantern(true), x, 5, 32, true); });
        // the counter: bottle-green panels under a worn top, the ledger, the bell and the oil lamp
        T.box('counter', 124, 46, 196, 54, 0, 14, (b, w, h, l, which) => {
          if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); fill(b, 0, 0, w, 1, 'wood1'); for (let x = 9; x < w; x += 14) fill(b, x, 0, 1, h, 'wood3'); return; }
          fill(b, 0, 0, w, h, GREEN[2]); fill(b, 0, 0, w, 2, 'wood2'); fill(b, 0, h - 2, w, 2, GREEN[4]);
          if (which === 'front') for (let x = 3; x < w - 8; x += 13) { fill(b, x, 4, 10, h - 8, GREEN[3]); fill(b, x + 1, 5, 8, h - 10, GREEN[1]); fill(b, x + 2, 6, 6, h - 12, GREEN[2]); }
        });
        T.card('ledger', sprite(14, 4, b => { fill(b, 0, 0, 14, 4, 'roofR3'); fill(b, 1, 0, 12, 3, 'cream0'); fill(b, 7, 0, 1, 3, 'wood4'); for (let y = 1; y < 3; y++) { fill(b, 2, y, 4, 1, 'stone2'); fill(b, 9, y, 3, 1, 'stone2'); } }), 140, 52, 14);
        T.card('bell', sprite(7, 5, b => { fill(b, 1, 1, 5, 3, 'brass2'); fill(b, 2, 0, 3, 1, 'brass1'); fill(b, 0, 4, 7, 1, 'wood4'); px(b, 2, 1, 'brass0'); }), 172, 52, 14);
        const lamp = lit => sprite(7, 13, b => { fill(b, 2, 9, 3, 4, 'brass2'); fill(b, 1, 11, 5, 2, 'brass3'); fill(b, 1, 2, 5, 7, lit ? 'light1' : 'cream0'); fill(b, 2, 3, lit ? 3 : 2, 5, lit ? 'light0' : 'light1'); if (lit) px(b, 3, 5, 'white'); fill(b, 2, 0, 3, 2, 'brass2'); });
        T.card('oil_lamp', lamp(false), 188, 51, 14); T.card('oil_lamp_lit', lamp(true), 188, 51, 14, true);
        // the round table on the red rug and its two chairs, a teapot waiting on it
        T.card('round_table', sprite(26, 16, b => { V.disc(b, 13, 3, 12, 3, 'wood3'); V.disc(b, 13, 2, 12, 2, 'wood2'); fill(b, 1, 3, 24, 2, 'wood4'); fill(b, 11, 5, 4, 9, 'wood4'); fill(b, 7, 14, 12, 2, 'wood4'); }), 60, 96);
        T.card('teapot', sprite(11, 8, b => { fill(b, 2, 2, 7, 6, 'white'); fill(b, 3, 1, 5, 1, 'white'); fill(b, 4, 0, 3, 1, 'roofG2'); fill(b, 0, 3, 2, 2, 'white'); fill(b, 9, 3, 2, 3, 'white'); fill(b, 3, 4, 5, 1, 'roofG2'); }), 60, 93, 13);
        const chair = flip => sprite(12, 22, b => { const bx = flip ? 9 : 0; fill(b, bx, 0, 3, 14, 'wood4'); fill(b, bx, 0, 3, 1, 'wood3'); fill(b, 0, 12, 12, 3, PLUM[1]); fill(b, 0, 12, 12, 1, PLUM[0]); for (const x of [1, 9]) fill(b, x, 15, 2, 7, 'wood4'); });
        T.card('chair_l', chair(false), 39, 96); T.card('chair_r', chair(true), 81, 96);
        // the curio cases along the west wall: old glass in wooden frames, odd things on their shelves
        [[64, 80], [90, 106]].forEach(([c, e], i) => T.box('curio_' + i, 1, c, 15, e, 0, 30, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'top') { fill(b, 1, 1, w - 2, h - 2, 'wood2'); return; }
          if (which !== 'right' && which !== 'front') return;
          fill(b, 2, 2, w - 4, h - 7, 'sky3'); fill(b, 2, 12, w - 4, 1, 'wood3'); fill(b, 0, h - 5, w, 5, 'wood4');
          [[3, 8, 'brass1'], [7, 9, 'rose'], [11, 8, 'roofB2'], [4, 19, 'roofG2'], [9, 19, 'brass2'], [13, 18, 'cream0']].forEach(([x, y, k]) => x < w - 3 && fill(b, x, y, 2, 3, k));
          px(b, 3, 3, 'white'); px(b, 4, 3, 'white');
        }));
        // the store: crates by the back door and the post waiting before them, string-tied, shelves of jars and parcels
        // along the east wall, a trunk, a stack of crates, barrels and sacks
        const crate = PROPS.crate;
        T.box('crate_0', 208, 0, 226, 12, 0, 14, crate); T.box('crate_1', 210, 1, 222, 10, 14, 25, crate);
        T.card('parcels', sprite(16, 14, b => {
          fill(b, 0, 8, 16, 6, 'dirt2'); fill(b, 0, 8, 16, 1, 'dirt1'); fill(b, 0, 13, 16, 1, 'dirt3'); fill(b, 6, 8, 1, 6, 'cream0'); fill(b, 10, 10, 4, 2, 'cream0');
          fill(b, 3, 2, 10, 6, 'dirt1'); fill(b, 3, 2, 10, 1, 'cream1'); fill(b, 3, 7, 10, 1, 'dirt3'); fill(b, 7, 2, 1, 6, 'roofR3'); fill(b, 3, 4, 10, 1, 'roofR3');
          px(b, 6, 1, 'roofR3'); px(b, 8, 1, 'roofR3'); px(b, 5, 0, 'roofR3'); px(b, 9, 0, 'roofR3');
        }), 219, 26);
        T.box('crate_2', 236, 74, 254, 86, 0, 16, crate); T.box('crate_3', 238, 76, 250, 84, 16, 27, crate);
        const shelves = (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3');
          if (which !== 'left') return;
          for (let y = 4; y < h - 4; y += 12) {
            fill(b, 2, y, w - 4, 10, 'wood5'); fill(b, 2, y + 10, w - 4, 1, 'wood3');
            for (let x = 3; x < w - 6; x += 7 + ((hash(x, y, 5) * 4) | 0)) {
              const k = ['roofR2', 'cream2', 'roofB2', 'brass2', 'roofG2', 'wood2'][((hash(x, y, 6) * 6) | 0)], t = 5 + ((hash(x, y, 7) * 4) | 0);
              fill(b, x, y + 10 - t, 5, t, k); fill(b, x + 1, y + 10 - t, 1, t - 1, 'white');
            }
          }
        };
        T.box('shelves_0', 258, 18, 271, 60, 0, 46, shelves); T.box('shelves_1', 258, 72, 271, 106, 0, 40, shelves);
        T.box('trunk', 214, 52, 240, 62, 0, 12, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'roofB3'); fill(b, 0, 0, w, 1, 'roofB2'); for (let x = 3; x < w; x += 8) fill(b, x, 0, 2, h, 'brass3'); if (which === 'front') fill(b, (w >> 1) - 1, 3, 3, 3, 'brass1'); });
        const barrel = PROPS.barrel();
        T.card('barrel_0', barrel, 226, 100); T.card('barrel_1', barrel, 238, 104);
        T.card('sacks', sprite(14, 12, b => { V.disc(b, 4, 7, 4, 5, 'cream2'); V.disc(b, 10, 8, 4, 4, 'cream2'); V.disc(b, 3, 6, 2, 3, 'cream1'); fill(b, 3, 1, 3, 2, 'wood4'); }), 215, 116);
        // a table of curios by the counter (the compass, the brass lens, the black camera, a spool of patchwork
        // thread, a pair of old boots under it), a globe on its stand, the umbrella stand by the door, books stacked
        T.box('curio_table', 176, 78, 200, 90, 0, 12, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'top') { fill(b, 0, 0, w, h, PLUM[2]); fill(b, 1, 1, w - 2, 1, PLUM[1]); } if (which === 'front') fill(b, 2, 3, w - 4, h - 5, 'wood4'); });
        T.card('compass', sprite(7, 4, b => { V.disc(b, 3, 2, 3, 2, 'brass1'); V.disc(b, 3, 2, 2, 1, 'cream0'); px(b, 3, 1, 'roofR2'); }), 180, 86, 12);
        T.card('lens', sprite(9, 5, b => { V.disc(b, 3, 2, 3, 2, 'brass2'); V.disc(b, 3, 2, 2, 1, 'sky2'); fill(b, 6, 3, 3, 1, 'wood3'); }), 187, 84, 12);
        T.card('camera', sprite(9, 6, b => { fill(b, 0, 1, 9, 5, 'ink2'); fill(b, 1, 0, 3, 1, 'iron3'); V.disc(b, 5, 3, 2, 2, 'iron2'); px(b, 5, 3, 'sky2'); px(b, 1, 2, 'iron1'); }), 194, 86, 12);
        T.card('thread', sprite(6, 5, b => { fill(b, 0, 0, 6, 1, 'wood2'); fill(b, 0, 4, 6, 1, 'wood2'); fill(b, 1, 1, 4, 3, 'rose'); fill(b, 1, 2, 4, 1, 'sky3'); }), 184, 88, 12);
        T.card('boots', sprite(12, 9, b => { for (const x of [0, 6]) { fill(b, x + 1, 0, 4, 7, 'dirt3'); fill(b, x, 6, 6, 3, 'dirt3'); fill(b, x + 1, 1, 1, 5, 'dirt2'); fill(b, x, 8, 6, 1, 'wood5'); } }), 206, 92);
        T.card('globe', sprite(12, 20, b => { V.disc(b, 6, 6, 5, 5, 'sky3'); V.disc(b, 5, 5, 2, 2, 'roofG2'); fill(b, 7, 7, 2, 2, 'roofG2'); fill(b, 0, 5, 1, 3, 'brass2'); fill(b, 11, 5, 1, 3, 'brass2'); fill(b, 5, 12, 2, 5, 'wood3'); fill(b, 2, 17, 8, 3, 'wood4'); }), 104, 106);
        T.card('umbrellas', sprite(10, 22, b => { fill(b, 1, 10, 8, 12, 'roofB3'); fill(b, 1, 10, 8, 1, 'roofB2'); fill(b, 2, 0, 1, 12, 'wood3'); V.disc(b, 3, 1, 1, 1, 'wood3'); fill(b, 5, 2, 2, 10, 'roofR3'); fill(b, 7, 4, 1, 8, 'ink2'); }), 118, 124);
        T.card('books', sprite(12, 10, b => { [['roofR2', 0, 12], ['roofB2', 3, 10], ['roofG2', 6, 11], ['brass2', 8, 9]].forEach(([c, y, w]) => { fill(b, 0, y, w, 2, c); fill(b, 0, y, w, 1, 'cream0'); }); }), 106, 62);
        // by the door, ferns grown in from the grove
        T.card('fern_l', V.fern(3), 128, 132); T.card('fern_r', V.fern(6), 172, 132);
        // and a potted palm closing the counter's end by the store
        T.card('palm', PROPS.plant(), 200, 56);
      },
    },
    // Theo's studio on the bluff (Night 3), cut open: the darkroom in the west behind its red curtain (the bench of
    // three trays and the developing tank, the enlarger, the red enamel basin, the safelight, the film pegged up to
    // dry), the gallery in the middle under its round sea window (the photographs, the work table with its loupe and
    // negatives, his old plate camera on its tripod) and the projector lounge in the east (the burlap screen, the
    // 8mm projector on its table, the rocking chair, the cans of film).
    theo_studio: {
      area: 'coast', seed: 23, room: [256, 88], door: 128,
      bays: [[80, 46]],
      solid: [[4, 0, 58, 14], [1, 22, 15, 42], [76, 46, 84, 60], [96, 30, 150, 42], [160, 18, 172, 28], [96, 72, 110, 84],
        [186, 0, 242, 4], [204, 54, 222, 62], [244, 8, 256, 40], [230, 64, 246, 74], [18, 36, 30, 44]],
      anchors: { tank: [36, 26], basin: [24, 52], projector: [229, 50], screen_seat: [198, 74], rocker: [236, 82], gallery: [124, 56], curtain: [80, 74] },
      paint(b, R) {
        // the darkroom's black rubber mat by the bench, the gallery's old kilim, the lounge's woven rug
        R(4, 16, 60, 30, (x, y, w, h) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 'iron3' : (x + y) % 2 ? 'iron4' : 'ink2'));
        R(100, 46, 150, 66, (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 2 ? 'roofB3' : Math.abs(((x - w / 2) | 0) % 8) + Math.abs(((y - h / 2) | 0) % 8) < 4 ? 'roofR2' : e % 4 < 2 ? 'cream1' : 'roofB2'; });
        R(180, 42, 252, 84, (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 2 ? 'dirt4' : e < 4 ? 'roofR3' : (x + y * 2) % 6 < 3 ? 'dirt2' : 'dirt1'; });
      },
      back(b, w, h, win) {
        // the darkroom's wall painted black-red, the safelight's red glass and its glow, the film pegged on its line
        for (let y = 4; y < h - 2; y++) for (let x = 0; x < 80; x++) px(b, x, y, hash(x, y, 4) < 0.08 ? 'roofR4' : 'ink2');
        fill(b, 28, 8, 10, 8, 'iron4'); fill(b, 29, 9, 8, 6, 'red'); fill(b, 30, 10, 3, 2, 'rose'); fill(b, 32, 16, 2, 3, 'iron3');
        for (let y = 4; y < 30; y++) for (let x = 14; x < 52; x++) if (hash(x, y, 9) < 0.3 * (1 - Math.hypot(x - 33, y - 12) / 22)) px(b, x, y, 'roofR4');
        fill(b, 6, 22, 70, 1, 'iron2');
        for (let i = 0; i < 6; i++) { const fx = 9 + i * 11; fill(b, fx, 21, 2, 3, 'wood2'); fill(b, fx - 1, 24, 4, 14 + (i % 3) * 2, 'iron4'); for (let j = 25; j < 36 + (i % 3) * 2; j += 3) { fill(b, fx, j, 2, 2, 'stone3'); } }
        shelf(b, 58, 40, 20, 8);
        V.clock(b, 70, 12, 5, 21);
        // the gallery: the round sea window and the photographs round it, framed in black, a few in colour
        const cx = 128, cy = 22, r = 13;
        for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r + 2) px(b, x, y, d > r ? (y < cy ? 'brass1' : 'brass3') : y < cy + 1 ? (y < cy - 6 ? 'sky2' : 'sky3') : y === cy + 1 ? 'white' : (x + y) % 5 === 0 ? 'water2' : y > cy + 7 ? 'water5' : 'water4');
        }
        for (let a = 0; a < 8; a++) px(b, Math.round(cx + Math.cos(a * Math.PI / 4) * (r + 1)), Math.round(cy + Math.sin(a * Math.PI / 4) * (r + 1)), 'brass4');
        fill(b, cx - r, cy, 2 * r + 1, 1, 'brass3'); fill(b, cx, cy - r, 1, 2 * r + 1, 'brass3');
        photo(b, 86, 8, 14, 12, [[7, 2]]); photo(b, 86, 24, 12, 10, [[4, 1], [8, 1]]); photo(b, 102, 14, 10, 14, [[5, 2]]);
        photo(b, 146, 8, 16, 12, [[5, 2], [11, 2]]); photo(b, 150, 24, 12, 12, [[6, 2]]); photo(b, 164, 14, 10, 10, [[5, 1]]);
        fill(b, 88, 40, 70, 2, 'wood3'); fill(b, 88, 40, 70, 1, 'wood2');
        // the lounge: posters of old films and a shelf of reels
        fill(b, 246, 10, 8, 14, 'roofR3'); fill(b, 247, 11, 6, 12, 'cream1'); fill(b, 248, 13, 4, 4, 'ink2'); fill(b, 248, 19, 4, 1, 'roofR2');
        fill(b, 178, 10, 8, 12, 'roofB3'); fill(b, 179, 11, 6, 10, 'cream0'); V.disc(b, 182, 15, 2, 2, 'ink2');
      },
      left(b, w, h, win) { hooks(b, 30, 14, ['apron', 'coat']); calendar(b, 60, 16, 'ink2'); },
      right(b, w, h, win) { win(b, 34, 14, 16, 16); photo(b, 58, 12, 12, 10, [[6, 2]]); },
      things(T) {
        // the darkroom's bench: three trays on it (developer amber, stop clear, fixer grey), the tank, the enlarger
        T.box('dark_bench', 4, 0, 58, 14, 0, 15, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3');
          if (which === 'top') { fill(b, 0, 0, w, h, 'iron3'); fill(b, 0, 0, w, 1, 'iron2'); return; }
          if (which === 'front') for (let x = 3; x < w - 6; x += 7) { fill(b, x, 5, 4, 8, ['wood3', 'roofR4', 'wood2', 'roofR4'][(x / 7 | 0) % 4]); fill(b, x + 1, 5, 2, 2, 'cream2'); }
        });
        [['tray_dev', 14, 'brass2'], ['tray_stop', 28, 'water1'], ['tray_fix', 42, 'stone2']].forEach(([n, x, c]) => T.card(n, sprite(12, 4, b => { fill(b, 0, 0, 12, 4, 'cream0'); fill(b, 1, 1, 10, 2, c); fill(b, 0, 3, 12, 1, 'cream2'); px(b, 3, 1, 'white'); }), x, 10, 15));
        T.card('dev_tank', sprite(8, 11, b => { fill(b, 1, 2, 6, 9, 'ink2'); fill(b, 1, 2, 1, 9, 'iron3'); fill(b, 0, 0, 8, 3, 'iron3'); fill(b, 0, 0, 8, 1, 'iron2'); fill(b, 3, 0, 2, 1, 'brass1'); fill(b, 6, 4, 2, 1, 'iron2'); }), 36, 6, 15);
        T.card('enlarger', sprite(12, 30, b => { fill(b, 9, 2, 2, 28, 'iron3'); fill(b, 9, 2, 1, 28, 'iron2'); fill(b, 0, 2, 10, 9, 'iron4'); fill(b, 1, 3, 8, 2, 'iron3'); fill(b, 3, 11, 4, 4, 'iron3'); fill(b, 4, 15, 2, 2, 'water4'); fill(b, 0, 27, 12, 3, 'wood3'); fill(b, 0, 27, 12, 1, 'wood2'); }), 53, 10, 15);
        T.card('thermometer', sprite(3, 12, b => { fill(b, 0, 0, 3, 12, 'cream0'); fill(b, 1, 2, 1, 8, 'red'); fill(b, 0, 10, 3, 2, 'red'); }), 22, 8, 15);
        // the red enamel basin on its cupboard against the west wall, the ice bucket by it
        T.box('red_basin', 1, 22, 15, 42, 0, 13, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'top') { fill(b, 0, 0, w, h, 'roofR2'); fill(b, 2, 2, w - 4, h - 4, 'roofR3'); fill(b, 3, 3, w - 6, h - 6, 'water5'); px(b, 4, 4, 'water2'); return; }
          if (which === 'right') { fill(b, 2, 3, w - 4, h - 5, 'wood4'); px(b, w - 4, h >> 1, 'brass1'); }
        });
        T.card('ice_bucket', sprite(12, 11, b => { fill(b, 1, 2, 10, 9, 'iron2'); fill(b, 1, 2, 1, 9, 'iron1'); fill(b, 0, 0, 12, 3, 'iron3'); for (const [x, y] of [[2, 0], [5, 1], [8, 0]]) fill(b, x, y, 3, 2, 'water0'); fill(b, 3, 6, 6, 1, 'iron3'); }), 24, 44);
        T.card('chemicals', sprite(16, 12, b => { [[0, 10, 'wood4'], [4, 12, 'roofR4'], [8, 9, 'wood3'], [12, 11, 'wood4']].forEach(([x, h2, c]) => { fill(b, x, 12 - h2, 4, h2, c); fill(b, x + 1, 12 - h2, 2, 2, 'iron3'); fill(b, x + 1, 12 - h2 + 4, 1, 3, 'cream0'); }); }), 70, 30);
        // the red curtain drawn back across the darkroom's way in
        T.box('curtain', 76, 46, 84, 60, 0, 44, (b, w, h, l, which) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, y < 3 ? 'brass2' : x % 3 === 0 ? 'roofR4' : x % 3 === 1 ? 'roofR2' : 'roofR3'); });
        // the gallery's work table: prints and negatives, the loupe, a lamp; Theo's old plate camera on its tripod
        T.box('work_table', 96, 30, 150, 42, 12, 15, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); fill(b, 3, 2, 20, h - 4, 'cream1'); } });
        for (const [x, y] of [[97, 31], [146, 31], [97, 39], [146, 39]]) T.box(`table_leg_${x}`, x, y, x + 3, y + 3, 0, 12, (b, w, h) => fill(b, 0, 0, w, h, 'wood4'));
        T.card('prints', sprite(16, 4, b => { fill(b, 0, 1, 10, 3, 'white'); fill(b, 1, 2, 8, 1, 'stone2'); fill(b, 6, 0, 10, 3, 'cream0'); fill(b, 7, 1, 8, 1, 'stone3'); }), 108, 38, 15);
        T.card('negatives', sprite(14, 3, b => { fill(b, 0, 0, 14, 3, 'iron4'); for (let x = 1; x < 13; x += 3) fill(b, x, 1, 2, 1, 'brass1'); }), 126, 36, 15);
        T.card('loupe', sprite(5, 5, b => { V.disc(b, 2, 2, 2, 2, 'iron3'); px(b, 2, 2, 'water1'); }), 136, 38, 15);
        T.card('desk_lamp', sprite(10, 14, b => { fill(b, 1, 0, 8, 4, 'roofG3'); fill(b, 2, 4, 6, 1, 'light1'); fill(b, 4, 4, 2, 8, 'iron3'); fill(b, 1, 12, 8, 2, 'iron3'); }), 144, 34, 15);
        T.card('tripod', sprite(16, 34, b => { fill(b, 2, 0, 12, 10, 'wood3'); fill(b, 2, 0, 12, 1, 'wood2'); fill(b, 0, 2, 3, 6, 'ink2'); V.disc(b, 0, 5, 2, 2, 'iron3'); fill(b, 12, 3, 4, 4, 'wood4'); for (const [a, e] of [[7, 1], [8, 8], [8, 15]]) for (let y = 10; y < 34; y++) px(b, Math.round(a + (e - a) * (y - 10) / 24), y, 'wood4'); }), 166, 26);
        T.card('stool', PROPS.stool(), 120, 50);
        T.box('print_crate', 96, 72, 110, 84, 0, 12, PROPS.crate);
        T.card('crate_prints', sprite(14, 6, b => { for (let i = 0; i < 4; i++) { fill(b, i * 3, 6 - 4 - (i % 2), 4, 4 + (i % 2), i % 2 ? 'white' : 'cream1'); fill(b, i * 3 + 1, 6 - 3 - (i % 2), 2, 2, 'stone3'); } }), 103, 82, 12);
        // the lounge: the burlap screen on its frame, and on its cloth the reel of the night, a frame a model so the
        // film stands on the cloth (the screening shows them in turn; hidden till then)
        T.box('screen', 186, 0, 242, 4, 6, 52, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'front') for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) px(b, x, y, (x + y) % 2 ? 'dirt1' : (x % 4 === 0 || y % 4 === 0) ? 'dirt2' : 'cream1');
        });
        for (const x of [188, 238]) T.box('screen_leg_' + x, x, 0, x + 3, 3, 0, 6, (b, w, h) => fill(b, 0, 0, w, h, 'wood4'));
        footage().frames.forEach((f, k) => T.box('screen_film_' + k, 190, 4, 238, 5, 12, 46, (b, w, h, l, which) => {
          if (which !== 'front') return;
          const d = f.getContext('2d').getImageData(0, 0, w, h).data;
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const o = (j * w + i) * 4; b.set(i, j, (0xff000000 | (d[o + 2] << 16) | (d[o + 1] << 8) | d[o]) >>> 0); }
        }));
        T.box('projector_table', 204, 54, 222, 62, 0, 12, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'front') fill(b, 2, 3, w - 4, h - 5, 'wood4'); });
        T.card('projector', sprite(18, 18, b => {
          for (const [cx, cy] of [[5, 4], [13, 4]]) { V.disc(b, cx, cy, 4, 4, 'iron3'); V.disc(b, cx, cy, 2, 2, 'iron1'); px(b, cx, cy, 'iron4'); }
          fill(b, 8, 4, 2, 6, 'iron4'); fill(b, 2, 9, 14, 8, 'iron3'); fill(b, 2, 9, 14, 1, 'iron2'); fill(b, 4, 11, 4, 3, 'iron4'); fill(b, 16, 11, 2, 4, 'iron4'); px(b, 17, 12, 'light1'); fill(b, 11, 12, 3, 1, 'brass1');
        }), 213, 60, 12);
        T.card('film_cans', sprite(14, 10, b => { [[0, 6], [1, 3], [2, 0]].forEach(([dx, y]) => { fill(b, dx, y, 12, 4, 'iron2'); fill(b, dx, y, 12, 1, 'iron1'); fill(b, dx + 4, y + 1, 4, 1, 'roofR2'); }); }), 194, 76);
        T.box('reel_shelf', 244, 8, 256, 40, 0, 38, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3');
          if (which === 'left') for (let y = 4; y < h - 4; y += 9) { fill(b, 1, y + 7, w - 2, 1, 'wood3'); for (let x = 2; x < w - 4; x += 6) { V.disc(b, x + 2, y + 4, 2, 3, 'iron2'); px(b, x + 2, y + 4, 'iron4'); } }
        });
        T.card('rocking_chair', sprite(18, 24, b => {
          fill(b, 11, 0, 3, 14, 'wood3'); fill(b, 11, 0, 3, 1, 'wood2'); for (let y = 2; y < 12; y += 3) fill(b, 3, y, 9, 1, 'wood4');
          fill(b, 2, 0, 2, 14, 'wood3'); fill(b, 1, 12, 14, 3, 'roofR2'); fill(b, 1, 12, 14, 1, 'roofR1'); for (const x of [3, 12]) fill(b, x, 15, 2, 6, 'wood4');
          for (let x = 0; x < 18; x++) px(b, x, 21 + Math.round(((x - 8) / 9) ** 2 * 2), 'wood4');
        }), 238, 70);
        T.card('cushion', sprite(14, 5, b => { V.disc(b, 7, 3, 6, 2, 'roofB2'); fill(b, 3, 1, 8, 1, 'roofB1'); px(b, 7, 3, 'roofB4'); }), 198, 68);
        T.card('lounge_lamp', sprite(10, 30, b => { fill(b, 1, 0, 8, 7, 'cream1'); fill(b, 1, 6, 8, 1, 'cream2'); fill(b, 4, 7, 2, 21, 'iron3'); fill(b, 1, 28, 8, 2, 'iron3'); }), 176, 30);
        T.card('lounge_lamp_lit', sprite(10, 8, b => { fill(b, 1, 0, 8, 7, 'light1'); fill(b, 2, 2, 6, 4, 'light0'); }), 176, 7, 22, true);
        const fern = PROPS.plant();
        T.card('door_fern_l', fern, 112, 86); T.card('door_fern_r', fern, 146, 86);
      },
    },
    // Arlo's salt store on the beach street (Night 3's rope), cut open: the salt bin and its sacks in the west, Arlo's
    // nets heaped on the floor with their floats and his mending stool, the bench of net needles and twine under the
    // storm lantern, coils of rope and oars on the walls, the drums of resin for the boats' seams in the east corner.
    salt_store: {
      area: 'coast', seed: 29, room: [208, 80], door: 104,
      bays: [],
      solid: [[4, 0, 44, 16], [2, 24, 22, 52], [108, 34, 138, 50], [150, 0, 200, 12], [182, 50, 206, 74], [60, 0, 80, 8]],
      anchors: { nets: [124, 58], bench: [176, 22], rope: [162, 30] },
      wall(b, w, h, seed) {
        // weathered boards, salt crust along their foot
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, x % 12 === 0 ? 'wood4' : hash(x >> 1, y >> 3, seed) < 0.15 ? 'stone2' : y > h - 8 && hash(x, y, 3) < 0.6 ? 'cream0' : 'stone1');
        fill(b, 0, 0, w, 4, 'wood4'); fill(b, 0, 3, w, 1, 'wood5'); fill(b, 0, h - 2, w, 2, 'wood4');
      },
      paint(b, R) {
        // salt trodden into the boards round the bin, a rag rug before the bench
        R(0, 14, 60, 44, (x, y) => hash(x, y, 2) < 0.18 * (1 - y / 30) ? 'white' : 0);
        R(150, 14, 196, 30, (x, y, w, h) => (Math.min(x, y, w - 1 - x, h - 1 - y) < 1 ? 'water4' : y % 3 ? 'water3' : 'cream1'));
      },
      back(b, w, h, win) {
        win(b, 92, 14, 16, 14);
        hooks(b, 52, 10, ['rope', 'rope', 'net']); hooks(b, 118, 12, ['net', 'rope']);
        // oars crossed on the wall, a tide chart, the storm lantern's hook
        for (let i = 0; i < 26; i++) { px(b, 140 + i, 8 + i, 'wood3'); px(b, 166 - i, 8 + i, 'wood2'); }
        fill(b, 138, 32, 5, 4, 'wood3'); fill(b, 164, 32, 5, 4, 'wood2');
        fill(b, 176, 12, 18, 14, 'cream0'); for (let x = 177; x < 193; x++) px(b, x, 19 + Math.round(Math.sin(x / 2.5) * 4), 'water4'); fill(b, 176, 12, 18, 1, 'wood3');
      },
      left(b, w, h, win) { hooks(b, 40, 14, ['coat', 'cap']); },
      right(b, w, h, win) { win(b, 30, 14, 14, 14); hooks(b, 52, 12, ['rope']); },
      things(T) {
        // the salt bin, heaped white, and the sacks stacked by it
        T.box('salt_bin', 4, 0, 44, 16, 0, 16, (b, w, h, l, which) => {
          if (which === 'top') { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, x < 2 || x > w - 3 || y < 1 || y > h - 2 ? 'wood3' : hash(x, y, 5) < 0.2 ? 'stone0' : 'white'); return; }
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); for (let x = 6; x < w; x += 10) fill(b, x, 0, 1, h, 'wood4');
        });
        const sack = PROPS.sack('cream1');
        [[8, 34], [17, 36], [10, 46], [6, 26, 10], [16, 30, 9]].forEach(([x, y, up = 0], i) => T.card('salt_sack_' + i, sack, x, y, up));
        T.card('salt_scoop', sprite(10, 5, b => { fill(b, 0, 1, 7, 4, 'iron2'); fill(b, 1, 1, 5, 2, 'white'); fill(b, 7, 2, 3, 1, 'wood3'); }), 30, 10, 16);
        // Arlo's nets heaped on the floor, their cork floats, his stool and the needle in the mesh
        T.card('net_heap', sprite(34, 16, b => {
          for (let y = 0; y < 16; y++) for (let x = 0; x < 34; x++) if (((x - 17) / 17) ** 2 + ((y - 15) / 15) ** 2 <= 1) px(b, x, y, (x + y) % 3 === 0 || (x - y + 33) % 3 === 0 ? 'dirt3' : y < 6 ? 'water4' : 'water5');
          for (const [x, y] of [[6, 10], [14, 4], [24, 7], [29, 12], [18, 12]]) { fill(b, x, y, 3, 2, 'roofR2'); px(b, x, y, 'roofR1'); }
        }), 123, 48);
        T.card('net_stool', PROPS.stool(), 112, 58);
        // the bench of net needles, twine and floats, the storm lantern on it
        T.box('bench', 150, 0, 200, 12, 0, 14, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 2, 'wood2');
          if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); for (let x = 4; x < w - 6; x += 9) { fill(b, x, 3, 5, 1, 'wood4'); fill(b, x + 1, 6, 3, 2, 'roofR2'); } }
          if (which === 'front') fill(b, 3, 4, w - 6, h - 6, 'wood4');
        });
        T.card('twine', sprite(8, 6, b => { V.disc(b, 4, 3, 3, 2, 'dirt2'); fill(b, 1, 2, 6, 1, 'dirt1'); }), 160, 8, 14);
        const lantern = lit => sprite(8, 13, b => { fill(b, 3, 0, 2, 2, 'iron3'); fill(b, 1, 2, 6, 2, 'roofR3'); fill(b, 1, 4, 6, 6, lit ? 'light1' : 'cream0'); fill(b, 2, 5, 4, 4, lit ? 'light0' : 'cream1'); fill(b, 1, 4, 1, 6, 'roofR3'); fill(b, 6, 4, 1, 6, 'roofR3'); fill(b, 0, 10, 8, 3, 'roofR3'); fill(b, 0, 10, 8, 1, 'roofR2'); });
        T.card('storm_lantern', lantern(false), 190, 8, 14); T.card('storm_lantern_lit', lantern(true), 190, 8, 14, true);
        // the coil of rope Arlo lends for the cliff, on the floor by the bench
        T.card('rope_coil', sprite(16, 8, b => { for (const [rx, ry, c] of [[7, 3, 'dirt3'], [6, 2.5, 'dirt2'], [4, 1.6, 'dirt1']]) V.disc(b, 8, 4, rx, ry, c); V.disc(b, 8, 4, 2, 1, 'dirt4'); fill(b, 13, 5, 3, 1, 'dirt3'); }), 162, 30);
        // the resin drums for caulking the boats, drips down their sides
        const drum = sprite(14, 18, b => { fill(b, 1, 0, 12, 18, 'roofR4'); fill(b, 0, 2, 14, 14, 'roofR4'); fill(b, 2, 1, 3, 16, 'roofR3'); for (const y of [3, 14]) fill(b, 0, y, 14, 1, 'iron3'); fill(b, 1, 0, 12, 1, 'brass3'); for (const x of [6, 10]) fill(b, x, 1, 1, 3 + x % 4, 'brass2'); });
        T.card('drum_0', drum, 190, 62); T.card('drum_1', drum, 200, 70); T.card('drum_2', drum, 194, 52, 0);
        T.box('crate_0', 60, 0, 80, 8, 0, 14, PROPS.crate); T.card('float_basket', PROPS.basket('veg'), 70, 4, 14);
        T.card('oars', sprite(10, 34, b => { for (let y = 0; y < 34; y++) { px(b, 2 + (y >> 4), y, 'wood3'); px(b, 6 + (y >> 4), y, 'wood2'); } fill(b, 1, 24, 4, 10, 'wood2'); fill(b, 5, 24, 4, 10, 'wood1'); }), 204, 36);
        T.card('broom', PROPS.broom(), 46, 70); T.card('bucket', sprite(10, 11, b => { fill(b, 1, 2, 8, 9, 'wood3'); fill(b, 0, 2, 10, 2, 'iron3'); fill(b, 2, 2, 6, 1, 'water2'); }), 58, 74);
      },
    },
    // The village hall on the square (Night 4), cut open: the wet tiled lobby where the old roof drips into tin
    // buckets; the mahogany registration counter in the middle with the pigeonholes of files behind it and the brass
    // pendulum clock over them; Sam's typewriter desk under its folders and the filing cabinets in the east; the
    // waiting benches and the coat hooks in the west, and in the back corner the head of the stone stair down to the
    // archive, roped off.
    hall: {
      area: 'square', seed: 37, room: [240, 96], door: 120, bays: [], floor: tiles,
      solid: [[4, 0, 50, 32], [84, 20, 156, 34], [88, 0, 152, 6], [176, 10, 218, 26], [222, 0, 238, 12], [158, 0, 172, 8],
        [4, 44, 14, 84], [172, 70, 214, 78], [62, 46, 72, 54], [156, 38, 166, 46], [200, 56, 210, 64], [94, 84, 106, 92], [150, 84, 162, 92], [80, 84, 90, 92]],
      anchors: { stair: [42, 40], counter: [120, 44], desk: [196, 36], board: [226, 52], buckets: [160, 54] },
      paint(b, R) {
        // the stairwell: steps going down toward the back, darker as they go, the shaft's walls either side
        R(4, 2, 48, 30, (x, y, w, h) => {
          if (x < 2 || x > w - 3) return 'stone5';
          const k = ((h - 1 - y) / 4) | 0, r = (h - 1 - y) % 4, tone = ['stone2', 'stone3', 'stone3', 'stone4', 'stone4', 'stone5', 'stone5', 'ink2'][Math.min(7, k)];
          return r === 3 ? 'stone1' : r === 0 ? 'stone5' : hash(x, y, 4) < 0.08 ? 'stone4' : tone;
        });
        R(4, 0, 48, 2, () => 'ink2');
        // rain on the floor round the buckets, the tiles dark and shining
        for (const [cx, cy, rx, ry] of [[66, 54, 14, 6], [160, 46, 12, 5], [204, 64, 13, 5]])
          R(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, w, h) => {
            const dx = (x - rx) / rx, dy = (y - ry) / ry;
            if (dx * dx + dy * dy > 1 - hash(x, y, 9) * 0.25) return 0;
            const ax = cx - rx + x, ay = cy - ry + y, dark = (ax >> 3) + ((ay / 6) | 0);
            if (ax % 8 === 7 || ay % 6 === 5) return 0; // the grout stays
            return hash(x, y, 2) < 0.05 ? 'white' : hash(x >> 1, y, 4) < 0.12 ? 'sky2' : dark % 2 ? 'roofR3' : 'stone1';
          });
        // the coir mat at the door, and the runner from it to the counter
        R(104, 84, 136, 96, (x, y, w, h) => (Math.min(x, y, w - 1 - x, h - 1 - y) < 1 ? 'dirt4' : (x + y) % 3 ? 'dirt3' : 'dirt2'));
        R(108, 36, 132, 84, (x, y, w, h) => (x < 2 || x > w - 3 ? 'roofG4' : x < 3 || x > w - 4 ? 'brass2' : (y % 8 < 1) ? 'roofG2' : 'roofG3'));
      },
      back(b, w, h, win) {
        win(b, 56, 8, 16, 22); win(b, 168, 8, 16, 22);
        // the red banners either side, the Bellwood bell on them in gold
        for (const bx of [28, 202]) {
          fill(b, bx - 1, 5, 14, 2, 'brass3'); fill(b, bx, 7, 12, 26, 'red'); fill(b, bx, 7, 2, 26, 'roofR1'); fill(b, bx + 10, 7, 2, 26, 'roofR3');
          for (let j = 0; j < 4; j++) for (let i = 4 - j; i < 8 + j; i++) if (j < 3 || i < 5 || i > 6) px(b, bx + i, 30 + j, 0);
          stamp(b, bx + 3, 13, ['..11..', '.1221.', '.1221.', '122221', '..33..'], { 1: 'yellow', 2: 'light1', 3: 'brass3' });
        }
        // the pendulum clock over the pigeonholes: its case, the brass face, the pendulum behind its glass
        fill(b, 112, 2, 16, 34, 'wood4'); fill(b, 112, 2, 16, 1, 'wood3'); fill(b, 113, 3, 1, 32, 'wood3'); fill(b, 110, 1, 20, 2, 'wood5');
        V.disc(b, 120, 10, 6, 6, 'brass2'); V.disc(b, 120, 10, 5, 5, 'cream0'); for (const [i, j] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) px(b, 120 + i, 10 + j, 'iron4');
        fill(b, 120, 6, 1, 5, 'iron4'); fill(b, 120, 10, 3, 1, 'iron4'); px(b, 120, 10, 'red');
        fill(b, 115, 18, 10, 16, 'ink2'); fill(b, 116, 19, 1, 14, 'stone3'); fill(b, 120, 18, 1, 11, 'brass3'); V.disc(b, 120, 30, 3, 3, 'brass1'); px(b, 119, 29, 'brass0');
        // a calendar and the founders' photograph either side of it
        calendar(b, 94, 8); photo(b, 136, 6, 18, 14, [[5, 2], [9, 2], [13, 2]]);
        // the hall's notices by Sam's desk: rules pinned in a row
        for (let i = 0; i < 3; i++) { fill(b, 184 + i * 11, 10 + (i % 2), 9, 12, 'cream0'); fill(b, 184 + i * 11, 10 + (i % 2), 9, 2, i === 1 ? 'roofB2' : 'roofR2'); px(b, 188 + i * 11, 9 + (i % 2), 'iron3'); for (let j = 15; j < 21; j += 2) fill(b, 185 + i * 11, j + (i % 2), 7, 1, 'stone3'); }
      },
      left(b, w, h, win) {
        win(b, 54, 12, 14, 18);
        hooks(b, 18, 12, ['coat', 'cap', 'coat']);
        for (let i = 0; i < 2; i++) { fill(b, 76 + i * 10, 14 + i * 2, 8, 10, 'cream0'); px(b, 79 + i * 10, 13 + i * 2, 'roofR2'); for (let j = 17; j < 23; j += 2) fill(b, 77 + i * 10, j + i * 2, 6, 1, 'stone3'); }
      },
      right(b, w, h, win) {
        // the residents' directory: a framed board of name slips under its painted heading
        fill(b, 18, 6, 44, 30, 'wood4'); fill(b, 18, 6, 44, 1, 'wood3'); fill(b, 20, 8, 40, 26, 'roofG4'); fill(b, 22, 9, 36, 3, 'cream1');
        for (let x = 26; x < 54; x += 4) fill(b, x, 10, 2, 1, 'wood4');
        for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) { const x = 22 + c * 19, y = 14 + r * 4; fill(b, x, y, 17, 3, hash(r, c, 3) < 0.15 ? 'stone2' : 'cream0'); for (let i = 1; i < 14; i += 2) if (hash(i, r * 3 + c, 5) < 0.7) px(b, x + i, y + 1, 'stone4'); }
        win(b, 72, 12, 14, 18);
      },
      things(T) {
        const mahogany = (b, w, h) => { fill(b, 0, 0, w, h, 'roofR4'); fill(b, 0, 0, w, 1, 'roofR3'); for (let y = 2; y < h; y += 3) for (let x = 0; x < w; x++) if (hash(x >> 3, y, 2) < 0.3) px(b, x, y, 'wood5'); };
        // the stairwell's rail, a gap at its front east end where the steps start, roped off with the archive's sign
        const rail = (b, w, h) => { fill(b, 0, 0, w, 2, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); for (let x = 1; x < w; x += 4) fill(b, x, 2, 2, h - 2, 'wood4'); };
        T.box('stair_rail', 4, 30, 34, 32, 0, 12, (b, w, h, l, which) => (which === 'top' ? fill(b, 0, 0, w, h, 'wood3') : rail(b, w, h)));
        T.box('stair_rail_side', 47, 2, 49, 32, 0, 12, (b, w, h, l, which) => (which === 'top' ? fill(b, 0, 0, w, h, 'wood3') : rail(b, w, h)));
        T.card('stair_rope', sprite(16, 13, b => {
          for (const x of [0, 13]) { fill(b, x, 2, 3, 11, 'brass2'); fill(b, x, 2, 1, 11, 'brass1'); fill(b, x - (x ? 0 : 0), 0, 3, 2, 'brass1'); }
          for (let x = 3; x < 13; x++) px(b, x, 4 + Math.round(Math.sin((x - 3) / 10 * Math.PI) * 2), 'red');
          fill(b, 4, 6, 8, 5, 'cream0'); fill(b, 4, 6, 8, 1, 'roofR2'); fill(b, 5, 8, 6, 1, 'stone4');
        }), 41, 32);
        // the registration counter, mahogany with raised panels; the ledger, the inkstand and the bell on it
        T.box('counter', 84, 22, 156, 34, 0, 16, (b, w, h, l, which) => {
          mahogany(b, w, h);
          if (which === 'front') for (let x = 3; x < w - 8; x += 12) { fill(b, x, 4, 9, h - 6, 'roofR3'); fill(b, x + 1, 5, 7, 1, 'roofR2'); fill(b, x + 8, 5, 1, h - 7, 'wood5'); }
          if (which === 'top') { fill(b, 0, 0, w, h, 'roofR3'); fill(b, 0, 0, w, 1, 'roofR2'); }
        });
        T.card('ledger_open', sprite(16, 6, b => { fill(b, 0, 1, 16, 5, 'roofG4'); fill(b, 1, 0, 14, 5, 'cream0'); fill(b, 8, 0, 1, 5, 'cream2'); for (const y of [1, 2, 3]) { fill(b, 2, y, 5, 1, 'stone3'); fill(b, 10, y, 4, 1, 'stone3'); } }), 104, 30, 16);
        T.card('inkstand', sprite(8, 8, b => { fill(b, 0, 5, 8, 3, 'brass2'); fill(b, 0, 5, 8, 1, 'brass1'); fill(b, 1, 2, 3, 3, 'ink2'); px(b, 2, 2, 'stone2'); for (let y = 0; y < 5; y++) px(b, 6 - (y >> 1), y, 'cream0'); }), 120, 30, 16);
        T.card('counter_bell', sprite(6, 6, b => { fill(b, 1, 1, 4, 4, 'brass1'); fill(b, 2, 0, 2, 1, 'brass2'); fill(b, 0, 5, 6, 1, 'brass3'); px(b, 2, 2, 'brass0'); }), 140, 30, 16);
        T.card('paper_tray', sprite(12, 6, b => { fill(b, 0, 2, 12, 4, 'wood3'); fill(b, 1, 0, 10, 3, 'cream1'); fill(b, 2, 1, 8, 1, 'white'); fill(b, 0, 2, 12, 1, 'wood2'); }), 148, 28, 16);
        // the pigeonholes of the hall's files behind it, every cell a bundle tied in tape
        T.box('pigeonholes', 88, 0, 152, 6, 0, 24, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3');
          if (which === 'front') for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
            const x = 2 + c * 8, y = 2 + r * 7; fill(b, x, y, 6, 5, 'wood5');
            const k = hash(c, r, 7); if (k < 0.85) { fill(b, x + 1, y + 1, 4, 4, ['cream1', 'dirt2', 'roofB2', 'cream2'][(k * 4) | 0]); fill(b, x + 1, y + 2, 4, 1, 'roofR2'); }
          }
        });
        // Sam's desk: the brass typewriter, his folders stacked high, the soot-ink bottle and a lamp; his chair
        T.box('sam_desk', 176, 12, 218, 26, 0, 14, (b, w, h, l, which) => {
          mahogany(b, w, h);
          if (which === 'front') { fill(b, 3, 3, 12, h - 4, 'roofR3'); fill(b, w - 15, 3, 12, h - 4, 'roofR3'); for (const x of [8, w - 10]) fill(b, x, 6, 3, 1, 'brass1'); }
          if (which === 'top') { fill(b, 0, 0, w, h, 'roofR3'); fill(b, 6, 2, 30, h - 4, 'roofG4'); }
        });
        T.card('typewriter', sprite(16, 11, b => {
          fill(b, 4, 0, 8, 4, 'white'); fill(b, 4, 0, 8, 1, 'cream1'); for (let y = 1; y < 4; y++) fill(b, 5, y, 6, 1, y % 2 ? 'stone2' : 'white');
          fill(b, 1, 3, 14, 2, 'iron3'); fill(b, 0, 3, 2, 2, 'iron2'); fill(b, 14, 3, 2, 2, 'iron2');
          fill(b, 1, 5, 14, 6, 'brass2'); fill(b, 1, 5, 14, 1, 'brass1'); fill(b, 2, 10, 12, 1, 'brass3');
          for (let r = 0; r < 3; r++) for (let x = 2 + r; x < 14 - r; x += 2) px(b, x, 6 + r + r, 'ink2');
        }), 194, 22, 14);
        T.card('folders_0', folders(6), 182, 20, 14); T.card('folders_1', folders(4), 210, 18, 14); T.card('folders_2', folders(8), 212, 24, 14);
        T.card('ink_bottle', sprite(4, 5, b => { fill(b, 0, 1, 4, 4, 'ink2'); fill(b, 1, 0, 2, 1, 'wood4'); px(b, 1, 2, 'stone3'); }), 203, 24, 14);
        T.card('desk_lamp', sprite(8, 12, b => { fill(b, 3, 0, 2, 2, 'iron3'); fill(b, 1, 2, 6, 7, 'light1'); fill(b, 2, 3, 4, 5, 'light0'); fill(b, 0, 9, 8, 3, 'brass3'); }), 186, 16, 14, true);
        T.card('desk_chair', sprite(14, 18, b => { fill(b, 1, 0, 12, 9, 'wood4'); fill(b, 1, 0, 12, 1, 'wood3'); fill(b, 3, 2, 8, 5, 'roofG3'); fill(b, 0, 9, 14, 3, 'wood3'); for (const x of [1, 11]) fill(b, x, 12, 2, 6, 'wood4'); }), 196, 32);
        // the filing cabinets, iron, their drawers labelled
        const cabinet = (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'iron2'); fill(b, 0, 0, w, 1, 'iron1');
          if (which === 'front') for (let y = 2; y < h - 2; y += 7) { fill(b, 1, y, w - 2, 6, 'iron3'); fill(b, 1, y, w - 2, 1, 'iron2'); fill(b, (w >> 1) - 2, y + 2, 4, 1, 'brass1'); fill(b, (w >> 1) - 1, y + 4, 2, 1, 'cream0'); }
        };
        T.box('cabinet_0', 222, 0, 238, 10, 0, 32, cabinet); T.box('cabinet_1', 158, 0, 172, 8, 0, 26, cabinet);
        // tin buckets under the leaks; while it rains a drop falls into each, rings spreading
        const bucket = sprite(10, 9, b => { fill(b, 1, 1, 8, 8, 'iron2'); fill(b, 0, 0, 10, 2, 'iron1'); fill(b, 2, 0, 6, 1, 'water3'); fill(b, 1, 5, 8, 1, 'iron3'); fill(b, 2, 2, 1, 6, 'iron1'); });
        const drip = k => { const frames = []; for (let f = 0; f < 8; f++) { const c = document.createElement('canvas'); c.width = 4; c.height = 40; const g = c.getContext('2d'); g.fillStyle = 'rgba(214,236,255,0.85)'; if (f < 6) { const y = Math.round(((f + k) % 6) * 6); g.fillRect(1, y, 2, 3); g.fillRect(1, y + 3, 1, 1); } else { g.fillRect(0, 37, 1, 1); g.fillRect(3, 37, 1, 1); g.fillRect(1, 36, 2, 1); } frames.push(c); } return { img: frames[0], frames, fps: 8, ax: 2, ay: 40 }; };
        [[66, 52], [160, 44], [204, 62]].forEach(([x, y], i) => { T.card('bucket_' + i, bucket, x, y); T.card('drip_' + i, drip(i * 2), x, y, 8); });
        // the waiting benches: one along the west wall, a low one facing the counter
        const bench = (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'front' || which === 'right') for (let x = 2; x < w - 2; x += Math.max(6, w - 4)) fill(b, x, 3, 2, h - 3, 'wood4'); };
        T.box('bench_w', 4, 44, 14, 84, 0, 9, bench); T.box('bench_front', 172, 70, 214, 78, 0, 8, bench);
        T.card('hat_on_bench', sprite(10, 4, b => { fill(b, 2, 0, 6, 3, 'roofB3'); fill(b, 0, 3, 10, 1, 'roofB4'); fill(b, 3, 2, 4, 1, 'red'); }), 9, 64, 9);
        // by the door: the umbrella stand with the morning's wet umbrellas, the ferns in their pots
        T.card('umbrellas', sprite(10, 22, b => { fill(b, 1, 14, 8, 8, 'iron2'); fill(b, 0, 14, 10, 1, 'iron1'); for (const [x, c] of [[2, 'roofB2'], [5, 'roofR2'], [7, 'ink2']]) { fill(b, x, 0, 2, 15, c); px(b, x, 0, 'wood4'); } fill(b, 3, 21, 4, 1, 'water3'); }), 85, 90);
        T.card('fern_0', PROPS.plant(), 100, 90); T.card('fern_1', PROPS.plant(), 156, 90);
        T.card('water_jar', sprite(10, 13, b => { V.disc(b, 5, 8, 5, 5, 'roofR3'); fill(b, 3, 1, 4, 3, 'roofR3'); fill(b, 2, 0, 6, 1, 'roofR2'); fill(b, 2, 6, 2, 4, 'roofR2'); }), 9, 92);
      },
    },
    // Under the hall, down its stair (Night 4): Sam's archive and vault No. 7 in the old rock, lit by castor-oil
    // lanterns, the seep water ankle-deep over its flagstones till the hand pump drains it. The stone stair comes down
    // the west wall; the copper pump stands at its foot with its pipes up the wall; the 1950 master map of Bellwood on
    // birch bark beside it; the thick steel door of vault No. 7 in the back wall, shut, then swung open on its racks;
    // the archive's racks along the east wall; Sam's table in the middle with its oil lamps and the files he has saved;
    // the catalogue drawers in the west corner.
    hall_vault: {
      under: true, seed: 41, room: [224, 88], door: 112, bays: [], floor: flagstones, wall: masonry,
      solid: [[4, 0, 34, 48], [50, 12, 76, 26], [140, 0, 198, 8], [190, 6, 200, 44], [206, 22, 222, 72], [104, 48, 160, 62], [4, 58, 26, 74], [194, 74, 216, 86], [40, 48, 50, 56]],
      anchors: { stair: [44, 40], pump: [84, 24], aside: [104, 36], vault: [168, 18], table: [120, 70], sam_table: [148, 70] },
      paint(b, R) {
        // the damp the seep leaves in the floor's low middle, darker round the drain grate by the pump
        R(36, 26, 204, 86, (x, y, w, h) => {
          const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), fy = y + 26, row = (fy / 10) | 0, fx = x + 36 + ((hash(row, 0, 41) * 20) | 0);
          if (fx % 18 === 0 || fy % 10 === 9 || dx * dx + dy * dy > 1 - hash((fx / 18) | 0, row, 3) * 0.3) return 0;
          return fy % 10 === 0 ? 'stone3' : hash(x >> 1, y >> 1, 8) < 0.05 ? 'stone3' : 'stone4';
        });
        R(78, 30, 92, 38, (x, y, w, h) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 'iron4' : x % 3 ? 'iron3' : 'ink2'));
      },
      back(b, w, h) {
        // the pump's pipes up the wall and away through it, a gauge on them
        for (const [x0, y0, x1, y1] of [[60, 20, 64, 60], [60, 18, 112, 22], [108, 2, 112, 22], [34, 30, 62, 33]]) { fill(b, x0, y0, x1 - x0, y1 - y0, 'roofR3'); fill(b, x0, y0, x1 - x0, 1, 'orange'); }
        for (const [x, y] of [[62, 32], [84, 20], [110, 16]]) { fill(b, x - 2, y - 1, 4, 3, 'brass2'); px(b, x - 1, y, 'brass1'); }
        V.disc(b, 74, 10, 5, 5, 'brass2'); V.disc(b, 74, 10, 4, 4, 'cream0'); fill(b, 74, 7, 1, 4, 'red'); fill(b, 73, 15, 3, 5, 'roofR3');
        // the master map on birch bark: the rivers, the line, the town and the estuary, pinned at its corners
        drawMap(b, 86, 6, 48, 26);
        // the archive's rule, painted on the stone over the vault
        fill(b, 148, 2, 42, 6, 'stone1'); fill(b, 148, 2, 42, 1, 'stone0'); for (let x = 151; x < 187; x += 3) if (hash(x, 1, 4) < 0.8) fill(b, x, 4, 2, 2, 'stone4');
      },
      left(b, w, h) { fill(b, 50, 24, 10, 14, 'wood4'); fill(b, 51, 25, 8, 12, 'cream1'); for (let j = 27; j < 36; j += 2) fill(b, 52, j, 6, 1, 'stone3'); },
      right(b, w, h) { for (const x of [20, 70]) { fill(b, x - 1, 16, 6, 1, 'iron3'); fill(b, x - 1, 20, 6, 9, 'iron4'); fill(b, x, 21, 4, 7, 'light2'); fill(b, x + 1, 22, 2, 4, 'light0'); fill(b, x - 2, 29, 8, 2, 'iron3'); } },
      things(T) {
        // the stone stair coming down the west wall, worn in the middle of each step, a wet sheen at its foot
        for (let k = 0; k < 6; k++) T.box('stair_' + k, 4, k * 8, 34, k * 8 + 8, 0, 48 - k * 8, (b, w, h, l, which) => {
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, (x + (y >> 2) * 5) % 12 === 0 || y % 8 === 7 ? 'stone4' : hash(x >> 1, y >> 1, k) < 0.1 ? 'stone2' : 'stone3');
          if (which === 'top') { fill(b, 0, 0, w, h, 'stone2'); fill(b, 8, 0, w - 16, h, 'stone1'); fill(b, 0, h - 1, w, 1, 'stone4'); }
        });
        T.box('stair_post', 32, 44, 35, 47, 0, 18, (b, w, h) => { fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3'); });
        T.card('mop_bucket', sprite(12, 26, b => { fill(b, 2, 17, 9, 9, 'iron2'); fill(b, 1, 17, 11, 2, 'iron1'); fill(b, 3, 18, 7, 1, 'water4'); for (let y = 0; y < 18; y++) px(b, 9 - (y >> 3), y, 'wood3'); for (let x = 4; x < 11; x++) fill(b, x, 15, 1, 4, x % 2 ? 'cream2' : 'cream1'); }), 45, 56);
        // the copper hand pump on its plinth, its spout over the drain
        T.box('pump_plinth', 50, 12, 76, 26, 0, 8, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'stone3'); fill(b, 0, 0, w, 1, 'stone2'); if (which === 'top') fill(b, 0, 0, w, h, 'stone2'); });
        T.card('pump', sprite(18, 30, b => {
          fill(b, 4, 6, 9, 24, 'roofR3'); fill(b, 4, 6, 2, 24, 'orange'); fill(b, 11, 6, 2, 24, 'roofR4'); for (const y of [8, 18, 27]) fill(b, 3, y, 11, 2, 'brass2');
          fill(b, 13, 12, 5, 3, 'roofR3'); fill(b, 16, 14, 2, 3, 'roofR4');
          fill(b, 6, 0, 5, 6, 'iron3'); fill(b, 7, 0, 3, 1, 'iron2'); for (let i = 0; i < 6; i++) px(b, 2 - (i > 3 ? 1 : 0), 3 - (i >> 1), 'iron3'); fill(b, 0, 0, 7, 2, 'iron3');
        }), 62, 22, 8);
        // ankle-deep seep water over the floor, lying flat, rippling; drained after the pump
        const pool = (w, h, seed) => {
          const frames = [];
          for (let f = 0; f < 4; f++) {
            const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h), d = new Uint32Array(im.data.buffer);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
              const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), r = dx * dx + dy * dy + (hash(x >> 2, y >> 1, seed) - 0.5) * 0.12;
              if (r > 1) continue;
              const ripple = (x + y * 2 + f * 3) % 11 === 0 && hash(x >> 1, y, seed + f) < 0.5;
              const k = r > 0.86 ? 'stone2' : ripple ? 'water3' : hash(x >> 3, y >> 2, seed + 2) < 0.3 ? 'water5' : 'water6';
              d[y * w + x] = (KIT.u32(KIT.hex(k)) & 0x00ffffff | (r > 0.86 ? 0x90000000 : 0xb8000000)) >>> 0;   // murky, the flags showing through
            }
            g.putImageData(im, 0, 0); frames.push(c);
          }
          return { img: frames[0], frames, fps: 3, ax: w >> 1, ay: 0 };
        };
        T.card('flood_0', pool(150, 54, 3), 118, 31, 1); T.card('flood_1', pool(70, 24, 5), 70, 59, 1);   // a px up, or the floor hides it
        // vault No. 7: the steel door in its frame, shut on its wheel and cylinder lock; and swung open on its racks
        const frame = (b, w, h) => { fill(b, 0, 0, w, h, 'stone4'); for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 * 6; x < w; x += 12) fill(b, x, y, 1, 6, 'stone5'); fill(b, 0, h - 6, w, 6, 'stone3'); };
        T.box('vault_shut', 140, 0, 196, 6, 0, 52, (b, w, h, l, which) => {
          if (which !== 'front') return fill(b, 0, 0, w, h, 'stone4');
          frame(b, w, h); const cx = w >> 1, cy = 24;
          V.disc(b, cx, cy, 22, 22, 'iron4'); V.disc(b, cx, cy, 21, 21, 'iron2'); V.disc(b, cx, cy, 17, 17, 'iron3'); V.disc(b, cx, cy, 16, 16, 'iron2');
          for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; px(b, cx + Math.round(Math.cos(t) * 19), cy + Math.round(Math.sin(t) * 19), 'iron0'); }
          for (let a = 0; a < 6; a++) { const t = a / 6 * Math.PI * 2; for (let r = 3; r < 11; r++) px(b, cx + Math.round(Math.cos(t) * r), cy + Math.round(Math.sin(t) * r), 'brass2'); }
          V.disc(b, cx, cy, 10, 10, 'brass3'); V.disc(b, cx, cy, 9, 9, 'iron2'); V.disc(b, cx, cy, 3, 3, 'brass1'); fill(b, cx - 1, cy - 1, 2, 3, 'ink2');
          stamp(b, cx + 9, cy - 20, ['111', '..1', '.1.', '.1.', '.1.'], { 1: 'brass1' });
          fill(b, 2, cy - 4, 3, 9, 'iron3'); fill(b, w - 5, cy - 4, 3, 9, 'iron3');
        });
        T.box('vault_open', 140, 0, 196, 6, 0, 52, (b, w, h, l, which) => {
          if (which !== 'front') return fill(b, 0, 0, w, h, 'stone4');
          frame(b, w, h); const cx = w >> 1, cy = 24;
          V.disc(b, cx, cy, 22, 22, 'iron4'); V.disc(b, cx, cy, 20, 20, 'ink2');
          // inside: racks of archive boxes and rolled maps in the lamplight
          for (let y = cy - 16; y < cy + 18; y += 8) for (let x = cx - 18; x < cx + 18; x++) { const dx = (x - cx) / 19, dy = (y - cy) / 19; if (dx * dx + dy * dy < 1) { px(b, x, y, 'wood4'); if (hash(x >> 2, y, 5) < 0.75) for (let j = 1; j < 7; j++) if ((((x - cx) / 19) ** 2 + ((y - j - cy) / 19) ** 2) < 1) px(b, x, y - j, ['dirt3', 'cream2', 'roofB3', 'dirt2'][((x >> 2) + y) % 4]); } }
          V.disc(b, cx, cy + 14, 6, 3, 'light2');
        });
        T.box('vault_open_door', 196, 6, 202, 46, 0, 50, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'iron2'); fill(b, 0, 0, w, 1, 'iron1');
          if (which === 'left') { for (let y = 4; y < h; y += 8) for (let x = 3; x < w - 2; x += 8) px(b, x, y, 'iron0'); fill(b, 4, 22, 10, 10, 'brass3'); V.disc(b, 9, 27, 4, 4, 'brass2'); }
        });
        // the archive's racks along the east wall, boxed files and rolled rail maps on their shelves
        T.box('racks', 206, 22, 222, 72, 0, 42, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3');
          if (which === 'left' || which === 'front') for (let y = 2; y < h - 2; y += 10) { fill(b, 0, y + 8, w, 2, 'wood3'); for (let x = 1; x < w - 3; x += 5) { const k = hash(x, y, 9); if (k < 0.8) { fill(b, x, y + 1, 4, 7, k < 0.3 ? 'cream1' : k < 0.55 ? 'dirt2' : 'roofB3'); fill(b, x + 1, y + 3, 2, 1, 'cream0'); } else { V.disc(b, x + 2, y + 6, 2, 2, 'cream0'); px(b, x + 2, y + 6, 'roofR2'); } } }
        });
        // Sam's work table: oil lamps burning on it, the files he has saved stacked to dry, his leather folder
        T.box('work_table', 104, 50, 160, 62, 10, 14, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); if (which === 'top') { fill(b, 0, 0, w, h, 'wood2'); for (let x = 3; x < w; x += 11) fill(b, x, 0, 1, h, 'wood3'); } });
        for (const [x, y] of [[105, 51], [156, 51], [105, 59], [156, 59]]) T.box(`table_leg_${x}_${y}`, x, y, x + 3, y + 3, 0, 10, (b, w, h) => fill(b, 0, 0, w, h, 'wood4'));
        const lamp = sprite(8, 13, b => { fill(b, 3, 0, 2, 2, 'iron3'); fill(b, 2, 2, 4, 1, 'brass2'); fill(b, 1, 3, 6, 6, 'light1'); fill(b, 2, 4, 4, 4, 'light0'); fill(b, 3, 5, 2, 2, 'white'); fill(b, 0, 9, 8, 4, 'brass2'); fill(b, 0, 9, 8, 1, 'brass1'); });
        T.card('table_lamp_0', lamp, 110, 58, 14, true); T.card('table_lamp_1', lamp, 154, 56, 14, true);
        T.card('saved_files', folders(5), 124, 56, 14); T.card('drying_sheets', sprite(18, 5, b => { for (let i = 0; i < 3; i++) { fill(b, i * 6, 1 + (i % 2), 6, 4, 'cream1'); fill(b, i * 6 + 1, 2 + (i % 2), 4, 1, 'roofB3'); } }), 138, 58, 14);
        T.card('leather_folder', sprite(14, 5, b => { fill(b, 0, 1, 14, 4, 'wood4'); fill(b, 0, 1, 14, 1, 'wood3'); fill(b, 5, 2, 4, 3, 'roofR3'); px(b, 6, 3, 'roofR1'); }), 146, 60, 14);
        T.card('archive_box', sprite(16, 10, b => { fill(b, 0, 2, 16, 8, 'iron3'); fill(b, 0, 2, 16, 1, 'iron2'); fill(b, 1, 0, 14, 3, 'iron2'); fill(b, 6, 4, 4, 3, 'brass2'); for (const x of [2, 13]) fill(b, x, 3, 1, 7, 'iron4'); stamp(b, 6, 7, ['1.1', '.1.'], { 1: 'cream0' }); }), 130, 54, 14);
        T.card('table_stool', PROPS.stool(), 168, 60);
        // the catalogue: drawers of index cards, brass pulls and label slots
        T.box('catalogue', 4, 58, 26, 74, 0, 20, (b, w, h, l, which) => {
          fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2');
          if (which === 'front' || which === 'right') for (let y = 2; y < h - 1; y += 6) for (let x = 1; x < w - 4; x += 7) { fill(b, x, y, 6, 5, 'wood4'); fill(b, x + 1, y + 1, 4, 2, 'cream1'); px(b, x + 2, y + 3, 'brass1'); px(b, x + 3, y + 3, 'brass1'); }
        });
        T.box('crate_0', 194, 74, 216, 86, 0, 12, PROPS.crate); T.box('crate_1', 198, 76, 212, 84, 12, 22, PROPS.crate);
        T.card('cellar_lantern_0', lamp, 44, 4, 24, true); T.card('cellar_lantern_1', lamp, 138, 8, 24, true); T.card('cellar_lantern_2', lamp, 204, 8, 24, true);
      },
    },
  };

  /* ---------- building a room ---------- */
  // Darkens a picture's pixels in place by SHADE.
  const dim = d => { const p = new Uint32Array(d.data.buffer); for (let i = 0; i < p.length; i++) p[i] = darker(p[i], SHADE); return d; };
  const dimDraw = draw => (g, t) => { g.save(); g.filter = `brightness(${SHADE})`; draw(g, t); g.restore(); };

  // What stands round a room under the ground (R.under): no area, only the dark earth it is dug into, as big as the
  // room and room to spare for the camera; its door anchor sets the room in it.
  function cellar(id, R) {
    const M = 56, TOP = 84, w = R.room[0] + 2 * M, h = TOP + R.room[1] + 56, b = new Buf(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, hash(x >> 2, y >> 2, 5) < 0.18 ? 'wood5' : hash(x, y, 6) < 0.04 ? 'stone5' : 'ink2');
    return { area: [0, 0, w, h], w, h, bg: '#1b1016', clips: {}, items: [], decals: { below: [] }, decks: [], flats: [], ground: b.canvas(),
      height: () => 0, vertical: () => false, anchors: { [id + '_door']: [M + R.door, TOP + R.room[1] + 8] } };
  }

  function build(id) {
    // The room stands where its house stands in its area, in the area's own coordinates: its door on the house's door,
    // its open front on the house's front. Round it is that area itself, in shade, so going through the door only
    // takes the walls and roof away (or puts them back).
    const R = ROOMS[id], E = R.under ? cellar(id, R) : AREA.build(R.area), [dx, dy] = E.anchors[id + '_door'], ox = dx - R.door, oy = dy - 8 - R.room[1];
    const P = x => x + ox, Q = y => y + oy, [W, H] = [E.w, E.h];
    const [x0, y0, x1, y1] = [P(0), Q(0), P(R.room[0]), Q(R.room[1])], xd = P(R.door), xc = (x0 + x1) >> 1;
    const back = Math.ceil(THICK * DEEP) + 1, fx0 = x0 - THICK, fx1 = x1 + THICK;
    // The floor stands FLOOR px over the land in front of the door.
    const top = E.height(xd, y1 + FLOOR) + FLOOR;
    const footed = (x, y) => x >= fx0 && x < fx1 && y >= y0 - back && y < y1, face = (x, y) => x >= fx0 && x < fx1 && y >= y1 && y < y1 + FLOOR;
    const S = { id, w: W, h: H, area: E.area, bg: E.bg, start: 'door', clips: {}, decals: { below: [] }, items: [], anchors: { door: [xd, y1 - 16] }, paths: {}, decks: E.decks, flats: E.flats };
    for (const [k, [x, y]] of Object.entries(R.anchors || {})) S.anchors[k] = [P(x), Q(y)];
    // What stands on the floor keeps the room's own light while the area round it is graded (Pixel.shader): x and
    // row + height, which is the floor's row + top for everything on it, walls and furniture too.
    S.room = [fx0, y0 - back + top, fx1, y1 + top + 1];
    // The area round it, dimmed: its ground, its animated bits and its things, but not the house or what the room covers.
    for (const [k, c] of Object.entries(E.clips)) S.clips[k] = { ...c, draw: dimDraw(c.draw) };
    const standsIn = (x, y) => x > fx0 - 4 && x < fx1 + 4 && y > y0 - back - 4 && y < y1 + FLOOR + 4;
    const covered = it => { const [bx, , bw] = it.box; return it.name.startsWith(id) || standsIn(bx + bw / 2, it.y); };
    // The game stands a decal on the bottom row of what it draws, every column of it upright there: one standing at the
    // room's depth with any of it across the room (a tree beside it or behind it whose roots reach over its floor) goes.
    const drawn = new Map(), span = c => drawn.get(c) || drawn.set(c, (() => {
      const cv = document.createElement('canvas'); cv.width = c.w; cv.height = c.h;
      const g = cv.getContext('2d'); c.draw(g, 0);
      const a = g.getImageData(0, 0, c.w, c.h).data;
      let l = c.w, r = -1, bottom = -1;
      for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) if (a[(j * c.w + i) * 4 + 3]) { l = Math.min(l, i); r = Math.max(r, i); bottom = j; }
      return [l, r, bottom];
    })()).get(c);
    const across = (x, y, c) => { const [l, r, bottom] = span(c); return x + r > fx0 - 4 && x + l < fx1 + 4 && standsIn(fx0, y + bottom); };
    S.decals.below = E.decals.below.filter(([k, x, y]) => { const c = E.clips[k]; return c.ay === undefined || !across(x, y, c); });
    for (const it of E.items) if (!covered(it)) S.items.push(it.track ? { ...it, track: { ...it.track, frames: it.track.frames.map(f => dim(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height))) } } : { ...it, draw: dimDraw(it.draw) });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cg = cv.getContext('2d'); cg.filter = `brightness(${SHADE})`; cg.drawImage(E.ground, 0, 0); cg.filter = 'none';
    const b = new Buf(W, H); b.d.set(new Uint32Array(cg.getImageData(0, 0, W, H).data.buffer));
    // The footing: the floor stands on it, under the walls too; its stone face drops to the land, with a step at the door.
    fill(b, fx0, y0 - back, fx1 - fx0, y1 - y0 + back, 'wood5');
    (R.floor || boards)(b, x0, y0, x1, y1, R.seed);
    R.paint(b, (a, c, d, e, f) => { for (let y = c; y < e; y++) for (let x = a; x < d; x++) { const k = f(x - a, y - c, d - a, e - c); if (k) px(b, P(x), Q(y), k); } }, (x, y) => [P(x), Q(y)]);
    V.wallPanel(b, fx0, y1, fx1 - fx0, FLOOR, 'stone', R.seed);
    fill(b, fx0, y1, fx1 - fx0, 1, 'wood4');
    if (!R.under) for (let k = 0; k < 2; k++) { fill(b, xd - 14 + k * 2, y1 + 1 + k * 5, 28 - k * 4, 4, 'stone1'); fill(b, xd - 14 + k * 2, y1 + 1 + k * 5, 28 - k * 4, 1, 'stone0'); fill(b, xd - 14 + k * 2, y1 + 4 + k * 5, 28 - k * 4, 1, 'stone3'); }
    // Higher land just behind the back wall (a bank, a terrace) is levelled to the floor: the wall leans back to face
    // the camera, so anything standing up there would show through it.
    const behind = (x, y) => x >= fx0 && x < fx1 && y >= y0 - back - WALL && y < y0 - back;
    S.height = (x, y) => (footed(x, y) ? top : face(x, y) ? top - (y - y1) : behind(x, y) ? Math.min(E.height(x, y), top) : E.height(x, y));
    S.vertical = (x, y) => face(x, y) || (!footed(x, y) && !behind(x, y) && E.vertical(x, y));
    // Feet stay on the floor, off the furniture and the partitions.
    const solid = [...R.solid.map(([a, c, d, e]) => [P(a), Q(c), P(d), Q(e)]), ...R.bays.map(([x, row]) => [P(x) - 3, y0, P(x) + 3, Q(row)])];
    S.blocked = (x, y) => !(x >= x0 && x < x1 && y >= y0 && y < y1) || solid.some(([a, c, d, e]) => x >= a && x < d && y >= c && y < e);
    // The floor's light: shaded where it meets the walls (deepest in the corners) and a little toward the back, each
    // board its own tone, and the sun falling in through the back wall's windows, slanting east as it reaches the floor.
    const sun = [];
    if (R.back) R.back(new Buf(x1 - x0, WALL), x1 - x0, WALL, (bb, x, y, w) => sun.push([P(x), w]));
    light(b, x0, y0, x1, y1, (x, y) => {
      const back = y - y0, side = Math.min(x - x0, x1 - 1 - x), near = Math.min(back * 1.4, side);
      let k = 1 - 0.2 * (1 - (y - y0) / (y1 - y0)) - (near < 18 ? 0.34 * (1 - near / 18) ** 1.4 : 0) - (back < 20 && side < 20 ? 0.1 : 0);
      k += (hash((y - y0) / 5 | 0, (x + (hash((y - y0) / 5 | 0, 0, R.seed) * 60 | 0)) >> 6, R.seed + 3) - 0.5) * 0.16;
      for (const [sx, sw] of sun) { const r = back - 4, at = x - sx - r * 0.35; if (r >= 0 && r < sw * 1.6 && at >= 0 && at < sw) k += 0.3 * (1 - r / (sw * 1.6)) + 0.08; }
      return k;
    });
    // Soft shadows on the floor: along the walls' feet and under the furniture.
    const ground = b.canvas();
    V.shadows(ground, [['r', x0, y0, x1 - x0, 3], ['r', x0, y0, 3, y1 - y0], ['r', x1 - 3, y0, 3, y1 - y0], ...solid.map(([a, c, d, e]) => ['r', a + 2, c + 2, d - a, e - c])]);
    S.ground = ground;

    // A model standing on the floor with its front line at (ax, ay); fn(m, X, B, panes) builds it, X(x) and B(row)
    // turning a point of the room into the model's texels across and back. Its windows' day glass (panes, in the
    // order of m.lit) is a model of its own over them that shows by day.
    const model = (name, ax, ay, fn) => {
      const m = MODEL.make(), panes = [];
      fn(m, x => x - ax, row => (ay - row) / DEEP, panes);
      S.items.push({ name, y: ay, walk: true, ...MODEL.item(m, ax, ay) });
      m.lit.forEach((l, i) => (l.b = panes[i]));
      if (m.lit.length) S.items.push({ name: name + '_day', y: ay, day: true, walk: true, ...MODEL.item({ faces: m.lit }, ax, ay) });
    };
    // A wall's picture: plaster (or the room's own paper), and what extra puts on it; its windows' glass is drawn for the night, the day's kept
    // for its pane (glass is its rect on the wall, for the pane's corners; flip for a wall whose picture is mirrored).
    const wall = R.wall || plaster;
    const walls = (b2, w, h, extra, glass, panes, flip) => {
      wall(b2, w, h, R.seed);
      // shaded under the ceiling beam, along the floor and into the corners
      light(b2, 0, 0, w, h, (x, y) => 1 - (y < 24 ? 0.26 * (1 - y / 24) : 0) - (y > h - 10 ? 0.2 * (1 - (h - y) / 10) : 0) - (Math.min(x, w - 1 - x) < 16 ? 0.24 * (1 - Math.min(x, w - 1 - x) / 16) : 0));
      if (extra) extra(b2, w, h, (b3, x, y, ww, wh) => {
        V.win(b3, x, y, ww, wh, { frame: ['wood1', 'wood2', 'wood3'] });
        const pane = new Buf(ww, wh);
        for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { const k = b3.get(x + i, y + j); pane.d[j * ww + (flip ? ww - 1 - i : i)] = k; b3.set(x + i, y + j, NIGHT.get(k) ?? k); }
        glass.push([x, y, ww, wh]); panes.push(pane);
      });
    };
    model('room_back', xc, y0 + 1, (m, X, B, panes) => {
      m.front(X(x0), B(y0), 0, x1 - x0, WALL, (bb, w, h, glass) => walls(bb, w, h, R.back, glass, panes), { ink: false });
      m.top(X(x0 - THICK), X(x1 + THICK), B(y0), B(y0) + THICK, WALL, cut, { ink: false });
    });
    for (const [side, x, name] of [[1, x0, 'left'], [-1, x1, 'right']]) model('room_' + name, x - side * 3, y1 - 1, (m, X, B, panes) => {
      const f = B(y1), d = B(y0) - f, xo = X(x) - (side > 0 ? THICK : 0);
      m.side(X(x), side, f, 0, d, WALL, (bb, w, h, glass) => walls(bb, w, h, R[name], glass, panes, side < 0), { ink: false });
      m.top(xo, xo + THICK, f, f + d, WALL, cut, { ink: false });
      m.front(xo, f, 0, THICK, WALL, cut, { ink: false });
    });
    // The partitions between the bays: lower than the walls, cut along their tops and ends.
    R.bays.forEach(([x, row], i) => model('partition_' + i, P(x), Q(row) - 1, (m, X, B) => {
      const f = B(Q(row)), d = B(y0) - f;
      m.box(X(P(x)) - 2, X(P(x)) + 2, f, f + d, 0, WALL - 16, (bb, w, h, l, which) => (which === 'top' || which === 'front' ? cut(bb, w, h) : wall(bb, w, h, R.seed + i)));
    }));

    // What the room's def puts in it: boxes (models) and cards, each at its feet on the floor.
    R.things({
      // a box from (a, c) to (d, e) on the floor (its back and front rows), up0 to up1 texels up; paint(b, w, h, lit, which)
      box(name, a, c, d, e, up0, up1, paint) {
        model(name, P((a + d) >> 1), Q(e) - 1, (m, X, B) => m.box(X(P(a)), X(P(d)), B(Q(e)), B(Q(c)), up0, up1, paint));
      },
      // a card standing with its feet at (x, y), or up texels up on what is there; a light shows at dusk and night only
      // (s.frames and s.fps: it plays them over and over)
      card(name, s, x, y, up = 0, light = false) {
        const fy = Q(y) - up, ox2 = P(x) - s.ax, oy2 = fy - s.ay, fr = s.frames, fps = s.fps || 4;
        S.items.push({ name, y: fy, box: [ox2, oy2, s.img.width, s.img.height], foot: 3, walk: true, ...(up ? { lift: up, on: [P(x), Q(y)] } : {}), ...(light ? { light: true } : {}),
          ...(fr ? { animated: true, draw: (g, t) => g.drawImage(fr[Math.floor(t * fps) % fr.length], ox2, oy2) } : { draw: g => g.drawImage(s.img, ox2, oy2) }) });
      },
    });
    return S;
  }

  window.INSIDE = { ids: Object.keys(ROOMS), build, boxItems };
})();
