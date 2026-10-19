'use strict';
/* Bellwood indoors, as HD-2D shows a room: the house cut open, its front wall and roof taken away, so the camera looks
   in at the same tilt as outdoors. A room stands where its house stands in its area, on its stone footing, FLOOR px
   over that area's land, which lies round it in soft shade; its walls and big furniture are models (model.js), its
   small things cards. A room is baked like an area (export-world.js): ground, height map, walk mask and items.

   A room's def, in its own art px from the back wall's foot at its west end: area (where its house stands; the house
   is the item named after the room, its door the anchor <room>_door), room [w, d] (the floor inside the walls),
   door (the x of the way out at the open front), bays [[x, row]] (a partition from the back wall to that row), solid
   [[x0, y0, x1, y1]] (furniture feet can't enter), paint(b, R) (rugs and such on the floor, R(x0, y0, x1, y1, f)
   asking f(x, y, w, h) for each pixel's colour), back/left/right(b, w, h, win) (the walls' pictures, plaster and
   wainscot already on them, win(b, x, y, w, h) putting a window in) and things(T) (the furniture, T as below). */
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

  /* ---------- Satria's childhood home (GDD 7.5, LOC-INT-01) ---------- */
  // Three bays under one roof: the bedroom (west: the bed, the desk where Satria writes the journal each night, Ibu
  // Ratih's treadle sewing machine and her tin of scraps), the family room (the dusty sofa, Ayah's books and wooden
  // tube radio, the family's photos) and the kitchen (east: the counter, the wood stove, the walnut table, the clay
  // water jar). The door is in the middle of the front.
  const ROOMS = {
    satria_home: {
      area: 'east', seed: 7, room: [224, 92], door: 112,
      bays: [[76, 50], [150, 50]],
      solid: [[4, 0, 36, 30], [42, 0, 72, 14], [46, 14, 58, 24], [1, 36, 17, 62], [22, 52, 50, 60], [51, 54, 61, 60],
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
        // the writing desk under the window, the journal open on it and the oil lamp, its chair pulled out
        T.box('desk_top', 42, 0, 72, 14, 13, 16, (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); });
        T.box('desk_drawers', 58, 2, 70, 14, 0, 13, (b, w, h, l, which) => { fill(b, 0, 0, w, h, 'wood3'); if (which === 'front') for (const y of [2, 7]) { fill(b, 1, y, w - 2, 4, 'wood2'); px(b, w >> 1, y + 2, 'brass1'); } });
        T.box('desk_leg', 43, 2, 46, 14, 0, 13, (b, w, h) => fill(b, 0, 0, w, h, 'wood4'));
        T.card('journal', sprite(12, 4, b => { fill(b, 0, 0, 6, 4, 'cream0'); fill(b, 6, 0, 6, 4, 'cream1'); for (let y = 1; y < 4; y++) { fill(b, 1, y, 4, 1, y % 2 ? 'stone2' : 'cream0'); fill(b, 7, y, 3, 1, y % 2 ? 'stone2' : 'cream1'); } }), 52, 10, 16);
        T.card('lamp', sprite(7, 13, b => { fill(b, 2, 9, 3, 4, 'brass2'); fill(b, 1, 11, 5, 2, 'brass3'); fill(b, 1, 2, 5, 7, 'cream0'); fill(b, 2, 3, 2, 5, 'light1'); fill(b, 2, 0, 3, 2, 'brass2'); }), 66, 6, 16);
        T.card('lamp_lit', sprite(7, 13, b => { fill(b, 2, 9, 3, 4, 'brass2'); fill(b, 1, 11, 5, 2, 'brass3'); fill(b, 1, 2, 5, 7, 'light1'); fill(b, 2, 3, 3, 5, 'light0'); px(b, 3, 5, 'white'); fill(b, 2, 0, 3, 2, 'brass2'); }), 66, 6, 16, true);
        T.card('desk_chair', sprite(14, 22, b => { fill(b, 1, 0, 12, 3, 'wood3'); fill(b, 1, 0, 12, 1, 'wood2'); fill(b, 2, 3, 2, 9, 'wood3'); fill(b, 10, 3, 2, 9, 'wood3'); fill(b, 4, 5, 6, 1, 'wood4'); fill(b, 0, 12, 14, 3, 'wood2'); fill(b, 1, 15, 2, 7, 'wood4'); fill(b, 11, 15, 2, 7, 'wood4'); }), 52, 24);
        // Ibu Ratih's treadle sewing machine, walnut on iron legs, and her tin of fabric scraps on the floor beside it
        T.card('sewing_machine', sprite(28, 26, b => {
          for (const x of [2, 22]) { fill(b, x, 12, 3, 14, 'iron3'); fill(b, x, 12, 1, 14, 'iron2'); }
          fill(b, 5, 19, 17, 5, 'iron3'); for (let x = 6; x < 21; x += 3) fill(b, x, 20, 1, 3, 'iron4'); fill(b, 9, 24, 9, 2, 'iron2');
          fill(b, 0, 9, 28, 4, 'wood3'); fill(b, 0, 9, 28, 1, 'wood2'); fill(b, 0, 12, 28, 1, 'wood4');
          fill(b, 6, 1, 15, 3, 'iron4'); fill(b, 17, 1, 4, 8, 'iron4'); fill(b, 6, 4, 3, 5, 'iron4'); fill(b, 7, 1, 13, 1, 'iron3'); fill(b, 9, 2, 6, 1, 'brass1'); px(b, 19, 5, 'brass1');
          fill(b, 22, 3, 3, 4, 'iron3'); px(b, 23, 4, 'brass2');
        }), 36, 60);
        T.card('scrap_tin', sprite(12, 10, b => { fill(b, 0, 3, 12, 7, 'roofB2'); fill(b, 0, 3, 12, 1, 'roofB1'); fill(b, 2, 5, 8, 3, 'roofB3'); fill(b, 3, 6, 6, 1, 'brass1'); fill(b, 1, 0, 3, 4, 'rose'); fill(b, 4, 1, 3, 3, 'yellow'); fill(b, 7, 0, 4, 4, 'roofG1'); }), 56, 60);
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
    const footed = (x, y) => x >= fx0 && x < fx1 && y >= y0 - back && y < y1, face = (x, y) => x >= fx0 && x < fx1 && y >= y1 && y < y1 + FLOOR;
    const S = { id, w: W, h: H, area: E.area, bg: E.bg, start: 'door', clips: {}, decals: { below: E.decals.below }, items: [], anchors: { door: [xd, y1 - 16] }, paths: {}, decks: E.decks, flats: E.flats };
    // What stands on the floor keeps the room's own light while the area round it is graded (Pixel.shader): x and
    // row + height, which is the floor's row + FLOOR for everything on it, walls and furniture too.
    S.room = [fx0, y0 - back + FLOOR, fx1, y1 + FLOOR + 1];
    // The area round it, dimmed: its ground, its animated bits and its things, but not the house or what the room covers.
    for (const [k, c] of Object.entries(E.clips)) S.clips[k] = { ...c, draw: dimDraw(c.draw) };
    const covered = it => { const [bx, , bw] = it.box, x = bx + bw / 2; return it.name.startsWith(id) || (x > fx0 - 4 && x < fx1 + 4 && it.y > y0 - back - 4 && it.y < y1 + FLOOR + 4); };
    for (const it of E.items) if (!covered(it)) S.items.push(it.track ? { ...it, track: { ...it.track, frames: it.track.frames.map(f => dim(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height))) } } : { ...it, draw: dimDraw(it.draw) });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cg = cv.getContext('2d'); cg.filter = `brightness(${SHADE})`; cg.drawImage(E.ground, 0, 0); cg.filter = 'none';
    const b = new Buf(W, H); b.d.set(new Uint32Array(cg.getImageData(0, 0, W, H).data.buffer));
    // The footing: the floor stands on it, under the walls too; its stone face drops to the land, with a step at the door.
    fill(b, fx0, y0 - back, fx1 - fx0, y1 - y0 + back, 'wood5');
    boards(b, x0, y0, x1, y1, R.seed);
    R.paint(b, (a, c, d, e, f) => { for (let y = c; y < e; y++) for (let x = a; x < d; x++) { const k = f(x - a, y - c, d - a, e - c); if (k) px(b, P(x), Q(y), k); } });
    V.wallPanel(b, fx0, y1, fx1 - fx0, FLOOR, 'stone', R.seed);
    fill(b, fx0, y1, fx1 - fx0, 1, 'wood4');
    for (let k = 0; k < 2; k++) { fill(b, xd - 14 + k * 2, y1 + 1 + k * 5, 28 - k * 4, 4, 'stone1'); fill(b, xd - 14 + k * 2, y1 + 1 + k * 5, 28 - k * 4, 1, 'stone0'); fill(b, xd - 14 + k * 2, y1 + 4 + k * 5, 28 - k * 4, 1, 'stone3'); }
    S.height = (x, y) => (footed(x, y) ? FLOOR : face(x, y) ? FLOOR - (y - y1) : E.height(x, y));
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
    // A wall's picture: plaster, and what extra puts on it; its windows' glass is drawn for the night, the day's kept
    // for its pane (glass is its rect on the wall, for the pane's corners; flip for a wall whose picture is mirrored).
    const walls = (b2, w, h, extra, glass, panes, flip) => {
      plaster(b2, w, h, R.seed);
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
      m.box(X(P(x)) - 2, X(P(x)) + 2, f, f + d, 0, WALL - 16, (bb, w, h, l, which) => (which === 'top' || which === 'front' ? cut(bb, w, h) : plaster(bb, w, h, R.seed + i)));
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

  window.INSIDE = { ids: Object.keys(ROOMS), build };
})();
