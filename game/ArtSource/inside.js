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
      } else if (variant === 'open') {
        // the lid stands up behind, its inside lined in plum velvet; inside the box, dark velvet
        fill(b, 1, 0, W - 2, 16, c); fill(b, 4, 2, W - 8, 13, PLUM[3]); fill(b, 4, 2, W - 8, 1, PLUM[2]); fill(b, 0, 14, W, 2, 'brass3');
        fill(b, 0, 16, W, 6, l); fill(b, 3, 17, W - 6, 6, PLUM[5]);
      } else body(b, 20);
    }).canvas();
  }
  const boxItems = () => BOXES.flatMap((_, i) => [['xs', 'closed'], ['lg', 'closed'], ['lg', 'open'], ['lg', 'front']].map(([size, v]) => [`items/box_${i}_${size}_${v}.png`, boxItem(i, size, v)]));
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
        [154, 0, 222, 16], [164, 30, 200, 48], [154, 40, 166, 46], [198, 40, 210, 46], [204, 60, 224, 70],
        [82, 80, 94, 90], [130, 80, 142, 90]],
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
        fill(b, 156, 24, 40, 3, 'wood2'); fill(b, 156, 26, 40, 1, 'wood4');
        [[158, 'roofR2'], [168, 'cream1'], [178, 'sky3'], [188, 'roofR1']].forEach(([x, c], i) => { fill(b, x, 24 - 7 - (i % 2) * 2, 6, 7 + (i % 2) * 2, c); fill(b, x + 1, 24 - 6 - (i % 2) * 2, 2, 5, 'white'); });
      },
      left(b, w, h, win) { win(b, 70, 14, 16, 16); },
      right(b, w, h, win) { win(b, 30, 14, 16, 16); },
      things(T) {
        // the bed: a low frame, the kapok mattress, Ratih's patchwork quilt over most of it, a pillow, the headboard
        T.box('bed_frame', 4, 0, 36, 30, 0, 7, (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); fill(b, 0, h - 1, w, 1, 'wood4'); });
        T.box('bed_quilt', 6, 3, 34, 28, 7, 11, (b, w, h, l, which) => {
          if (which !== 'top') { fill(b, 0, 0, w, h, 'roofR2'); fill(b, 0, 0, w, 1, 'roofR1'); return; }
          const Q = ['roofR1', 'cream1', 'sky3', 'yellow', 'rose', 'roofG1'];
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(b, x, y, y < 12 ? (y < 2 ? 'cream2' : 'cream0') : x % 7 === 0 || (y - 12) % 7 === 0 ? 'wall3' : Q[((x / 7 | 0) * 5 + ((y - 12) / 7 | 0) * 3) % Q.length]);
          fill(b, 5, 2, w - 10, 8, 'white'); fill(b, 5, 9, w - 10, 1, 'cream2');
        });
        T.box('bed_head', 4, 0, 36, 2, 0, 20, (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 3, 'wood2'); for (let x = 4; x < w - 2; x += 6) fill(b, x, 4, 2, h - 6, 'wood4'); });
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
        T.box('table_top', 164, 30, 200, 48, 12, 15, walnut);
        for (const [x, y] of [[166, 32], [195, 32], [166, 44], [195, 44]]) T.box(`table_leg_${x}_${y}`, x, y, x + 3, y + 3, 0, 12, (b, w, h) => fill(b, 0, 0, w, h, 'wood5'));
        const chair = flip => sprite(12, 22, b => { const bx = flip ? 9 : 0; fill(b, bx, 0, 3, 14, 'wood4'); fill(b, bx, 0, 3, 1, 'wood3'); fill(b, 0, 12, 12, 3, 'wood3'); fill(b, 0, 12, 12, 1, 'wood2'); for (const x of [1, 9]) fill(b, x, 15, 2, 7, 'wood4'); });
        const lantern = lit => sprite(8, 12, b => { fill(b, 3, 0, 2, 1, 'iron3'); fill(b, 1, 1, 6, 2, 'iron3'); fill(b, 1, 3, 6, 6, lit ? 'light1' : 'cream0'); fill(b, 2, 4, 4, 4, lit ? 'light0' : 'cream1'); fill(b, 1, 3, 1, 6, 'iron3'); fill(b, 6, 3, 1, 6, 'iron3'); fill(b, 0, 9, 8, 3, 'iron3'); fill(b, 0, 9, 8, 1, 'iron2'); });
        T.card('lantern', lantern(false), 182, 40, 15); T.card('lantern_lit', lantern(true), 182, 40, 15, true);
        T.card('chair_l', chair(false), 160, 46); T.card('chair_r', chair(true), 204, 46);
        T.card('water_jar', sprite(20, 22, b => {
          V.disc(b, 10, 12, 9, 9, 'roofR3'); V.disc(b, 9, 11, 8, 8, 'roofR2'); V.disc(b, 7, 9, 3, 3, 'roofR1'); fill(b, 4, 18, 12, 3, 'roofR4');
          fill(b, 3, 0, 14, 4, 'wood3'); fill(b, 3, 0, 14, 1, 'wood2'); fill(b, 9, 0, 2, 1, 'wood4');
        }), 214, 70);
        // by the door, a fern either side of the mat
        const plant = sprite(14, 22, b => { fill(b, 3, 15, 8, 7, 'roofR2'); fill(b, 3, 15, 8, 1, 'roofR1'); fill(b, 4, 21, 6, 1, 'roofR3'); V.foliage(b, (x, y) => ((x - 7) / 7) ** 2 + ((y - 8) / 8) ** 2 <= 1 && y < 16, [0, 0, 14, 16], V.LEAF.green, 21, { cw: 5, ch: 4, dx: 3, dy: 3 }); });
        T.card('door_fern_l', plant, 88, 90); T.card('door_fern_r', plant, 136, 90);
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
        [220, 92, 244, 104], [208, 108, 222, 116]],
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
      paint(b, R, at) {
        // the red rug under the round table, Marlow's worn one by his armchair, the runner from the door to the
        // counter, the doormat, and the tree's roots out from under the back wall
        const red = (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 1 ? 'roofR4' : e < 3 ? 'brass2' : e < 4 ? 'roofR3' : (x + y) % 6 === 0 || (x - y + 120) % 6 === 0 ? 'roofR1' : 'roofR2'; };
        R(24, 68, 96, 114, (x, y, w, h) => (((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2 > 1.02 ? 0 : red(x, y, w, h)));
        R(32, 28, 72, 52, (x, y, w, h) => { const e = Math.min(x, y, w - 1 - x, h - 1 - y); return e < 1 ? PLUM[4] : e < 2 ? 'brass3' : (x >> 2) % 2 === (y >> 2) % 2 ? PLUM[1] : PLUM[2]; });
        R(140, 56, 160, 126, red);
        R(136, 126, 164, 136, (x, y, w, h) => (Math.min(x, y, w - 1 - x, h - 1 - y) < 1 ? 'dirt3' : y % 2 ? 'dirt2' : 'dirt1'));
        const root = (pts, w0, w1, seed) => V.root(b, pts.map(([x, y]) => at(x, y)), w0, w1, V.OLD, seed);
        root([[96, 0], [92, 8], [80, 16], [68, 20]], 12, 4, 1);
        root([[100, 0], [104, 10], [98, 22]], 8, 3, 2);
        root([[206, 0], [212, 10], [224, 16]], 11, 4, 3);
        root([[202, 0], [198, 12], [200, 24]], 8, 3, 4);
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
        // the store: crates by the back door, shelves of jars and parcels along the east wall, a trunk, a stack of
        // crates, barrels and sacks
        const crate = (b, w, h) => { fill(b, 0, 0, w, h, 'wood2'); fill(b, 0, 0, w, 1, 'wood1'); fill(b, 0, 0, 2, h, 'wood4'); fill(b, w - 2, 0, 2, h, 'wood4'); fill(b, 0, h - 2, w, 2, 'wood4'); for (let k = 2; k < Math.min(w, h) - 2; k++) px(b, k, h - 1 - k, 'wood3'); };
        T.box('crate_0', 208, 0, 226, 12, 0, 14, crate); T.box('crate_1', 210, 1, 222, 10, 14, 25, crate);
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
        const barrel = sprite(12, 16, b => { fill(b, 1, 0, 10, 16, 'wood3'); fill(b, 0, 2, 12, 12, 'wood3'); fill(b, 2, 1, 2, 14, 'wood2'); for (const y of [3, 12]) fill(b, 0, y, 12, 1, 'iron3'); fill(b, 1, 0, 10, 1, 'wood4'); });
        T.card('barrel_0', barrel, 226, 100); T.card('barrel_1', barrel, 238, 104);
        T.card('sacks', sprite(14, 12, b => { V.disc(b, 4, 7, 4, 5, 'cream2'); V.disc(b, 10, 8, 4, 4, 'cream2'); V.disc(b, 3, 6, 2, 3, 'cream1'); fill(b, 3, 1, 3, 2, 'wood4'); }), 215, 116);
        // by the door, ferns grown in from the grove
        T.card('fern_l', V.fern(3), 128, 132); T.card('fern_r', V.fern(6), 172, 132);
      },
    },
  };

  /* ---------- building a room ---------- */
  // Darkens a picture's pixels in place by SHADE.
  const dim = d => { const p = new Uint32Array(d.data.buffer); for (let i = 0; i < p.length; i++) p[i] = darker(p[i], SHADE); return d; };
  const dimDraw = draw => (g, t) => { g.save(); g.filter = `brightness(${SHADE})`; draw(g, t); g.restore(); };

  function build(id) {
    // The room stands where its house stands in its area, in the area's own coordinates: its door on the house's door,
    // its open front on the house's front. Round it is that area itself, in shade, so going through the door only
    // takes the walls and roof away (or puts them back).
    const R = ROOMS[id], E = AREA.build(R.area), [dx, dy] = E.anchors[id + '_door'], ox = dx - R.door, oy = dy - 8 - R.room[1];
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
    S.decals.below = E.decals.below.filter(([k, x, y]) => { const c = E.clips[k]; return c.ay === undefined || !standsIn(x + c.w / 2, y + c.ay - 1); });
    for (const it of E.items) if (!covered(it)) S.items.push(it.track ? { ...it, track: { ...it.track, frames: it.track.frames.map(f => dim(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height))) } } : { ...it, draw: dimDraw(it.draw) });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cg = cv.getContext('2d'); cg.filter = `brightness(${SHADE})`; cg.drawImage(E.ground, 0, 0); cg.filter = 'none';
    const b = new Buf(W, H); b.d.set(new Uint32Array(cg.getImageData(0, 0, W, H).data.buffer));
    // The footing: the floor stands on it, under the walls too; its stone face drops to the land, with a step at the door.
    fill(b, fx0, y0 - back, fx1 - fx0, y1 - y0 + back, 'wood5');
    boards(b, x0, y0, x1, y1, R.seed);
    R.paint(b, (a, c, d, e, f) => { for (let y = c; y < e; y++) for (let x = a; x < d; x++) { const k = f(x - a, y - c, d - a, e - c); if (k) px(b, P(x), Q(y), k); } }, (x, y) => [P(x), Q(y)]);
    V.wallPanel(b, fx0, y1, fx1 - fx0, FLOOR, 'stone', R.seed);
    fill(b, fx0, y1, fx1 - fx0, 1, 'wood4');
    for (let k = 0; k < 2; k++) { fill(b, xd - 14 + k * 2, y1 + 1 + k * 5, 28 - k * 4, 4, 'stone1'); fill(b, xd - 14 + k * 2, y1 + 1 + k * 5, 28 - k * 4, 1, 'stone0'); fill(b, xd - 14 + k * 2, y1 + 4 + k * 5, 28 - k * 4, 1, 'stone3'); }
    S.height = (x, y) => (footed(x, y) ? top : face(x, y) ? top - (y - y1) : E.height(x, y));
    S.vertical = (x, y) => face(x, y) || (!footed(x, y) && E.vertical(x, y));
    // Feet stay on the floor, off the furniture and the partitions.
    const solid = [...R.solid.map(([a, c, d, e]) => [P(a), Q(c), P(d), Q(e)]), ...R.bays.map(([x, row]) => [P(x) - 3, y0, P(x) + 3, Q(row)])];
    S.blocked = (x, y) => !(x >= x0 && x < x1 && y >= y0 && y < y1) || solid.some(([a, c, d, e]) => x >= a && x < d && y >= c && y < e);
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
      card(name, s, x, y, up = 0, light = false) {
        const fy = Q(y) - up, ox2 = P(x) - s.ax, oy2 = fy - s.ay;
        S.items.push({ name, y: fy, box: [ox2, oy2, s.img.width, s.img.height], foot: 3, walk: true, ...(up ? { lift: up, on: [P(x), Q(y)] } : {}), ...(light ? { light: true } : {}), draw: g => g.drawImage(s.img, ox2, oy2) });
      },
    });
    return S;
  }

  window.INSIDE = { ids: Object.keys(ROOMS), build, boxItems };
})();
