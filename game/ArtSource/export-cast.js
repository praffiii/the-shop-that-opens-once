'use strict';
/* Cast part: the ant sheets and portraits (chars.js), the title (title.js), the palette (px.js) and a
   small pixel UI kit authored here with the PX palette. Writes chars/ and ui/ under game/Assets/Resources/Art. */
(() => {
  const { PAL, sprite, col, rect, dot } = PX;
  const { canvas, png, json } = BAKE;
  const CELL = 40, FEET = [20, 37], FLIPPED_X = 19, PORTRAIT = 48, PFRAMES = 3;
  const MOODS = ['smile', 'moved', 'surprised', 'sad', 'cross'];   // every mood chars.js draws; an id without one gets its neutral face back

  const pixels = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const same = (a, b) => { const p = pixels(a), q = pixels(b); return p.every((v, i) => v === q[i]); };

  /* ---------------- characters ---------------- */
  // Every cell must equal CH.draw pixel for pixel: facing right at feet - FEET, mirrored at feet - [FLIPPED_X, 37].
  function check(id, sheet, poses) {
    const [a, ga] = canvas(CELL, CELL), [b, gb] = canvas(CELL, CELL);
    for (const pose in poses) for (let f = 0; f < poses[pose].frames; f++) for (const dir of [1, -1]) {
      ga.clearRect(0, 0, CELL, CELL); CH.draw(ga, id, pose, f, dir > 0 ? FEET[0] : FLIPPED_X, FEET[1], dir);
      gb.setTransform(dir, 0, 0, 1, dir > 0 ? 0 : CELL, 0); gb.clearRect(0, 0, CELL, CELL);
      gb.drawImage(sheet, f * CELL, poses[pose].row * CELL, CELL, CELL, 0, 0, CELL, CELL);
      if (!same(a, b)) throw new Error(`cast: ${id} ${pose} frame ${f} dir ${dir} differs from CH.draw`);
    }
  }

  function chars() {
    const all = {};
    for (const id of CH.ids) {
      const names = CH.poses(id), [sheet, g] = canvas(Math.max(...names.map(p => CH.frames(id, p))) * CELL, names.length * CELL), poses = {};
      names.forEach((pose, row) => {
        const frames = CH.frames(id, pose), hand = [];
        for (let f = 0; f < frames; f++) { CH.draw(g, id, pose, f, f * CELL + FEET[0], row * CELL + FEET[1]); hand.push(CH.hand(id, pose, f)); }
        poses[pose] = { row, frames, fps: CH.fps(pose), stride: CH.stride(id, pose), hand };
      });
      check(id, sheet, poses);
      png(`chars/${id}.png`, sheet);

      const moods = ['neutral', ...MOODS.filter(m => !same(CH.portrait(id, 0, m), CH.portrait(id, 0)))];
      const [pc, pg] = canvas(PFRAMES * PORTRAIT, moods.length * PORTRAIT);
      moods.forEach((m, row) => { for (let f = 0; f < PFRAMES; f++) pg.drawImage(CH.portrait(id, f, m), f * PORTRAIT, row * PORTRAIT); });
      png(`chars/portraits/${id}.png`, pc);

      all[id] = { kid: CH.stride(id, 'walk') < 3, poses, moods };   // chars.js walks children 2 px a frame, adults 3
    }
    json('chars/chars.json', { cell: [CELL, CELL], feet: FEET, flippedFeetX: FLIPPED_X, chars: all });
  }

  /* ---------------- UI kit (new art, 1 px ink outlines, light from the top-left) ---------------- */
  // Rounded box with corners cut by `cut` px: outline, a light top/left inner edge, a shaded bottom/right one.
  function box(w, h, cut, { o, fill, hi, lo }) {
    const [c, x] = canvas(w, h);
    const inside = (i, j) => i >= 0 && j >= 0 && i < w && j < h && Math.min(i, w - 1 - i) + Math.min(j, h - 1 - j) >= cut;
    const edge = (i, j) => inside(i, j) && !(inside(i - 1, j) && inside(i + 1, j) && inside(i, j - 1) && inside(i, j + 1));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!inside(i, j)) continue;
      const up = edge(i, j - 1) || edge(i - 1, j), down = edge(i, j + 1) || edge(i + 1, j);
      x.fillStyle = col(edge(i, j) ? o : up && !down ? hi : down && !up ? lo : fill);
      x.fillRect(i, j, 1, 1);
    }
    return c;
  }
  // Frames side by side.
  function strip(frames) {
    const [c, x] = canvas(frames.length * frames[0].width, frames[0].height);
    frames.forEach((f, i) => x.drawImage(f, i * f.width, 0));
    return c;
  }

  /* The day dial (GDD 10.2) in the kit's own look: a small brass-rimmed wheel of the four phases, worn like a medallion
     on a paper panel, its quarters clockwise from the left: morning, midday (at the top), dusk and night (at the
     bottom), each in its own sky. clock_face has a frame per phase with that quarter clear and the rest veiled;
     clock_hand turns in sixteen steps clockwise from straight up; phase_glyph is each phase's little picture, drawn
     beside its name. */
  const PHASES = ['morning', 'midday', 'dusk', 'night'];
  function dayDial(put) {
    const D = 27, C = 13;
    const quarter = (dx, dy) => { const a = (Math.atan2(dx, -dy) * 180 / Math.PI + 405) % 360; return [1, 2, 3, 0][Math.floor(a / 90)]; };   // up is midday
    const SKY = [['sky1', 'dusk0'], ['sky2', 'sky1'], ['dusk2', 'dusk1'], ['dusk5', 'iron3']];   // [main, the lower half]
    const faces = PHASES.map((_, now) => {
      const [c, x] = canvas(D, D);
      for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
        const dx = i - C, dy = j - C, r = Math.hypot(dx, dy);
        if (r > 13.4) continue;
        let k;
        if (r > 12.4 || (r > 9.6 && r <= 10.4)) k = 'ink';
        else if (r > 10.4) k = dx + dy < -3 ? 'brass0' : dx + dy > 4 ? 'brass2' : 'brass1';   // the rim, lit from the top left
        else if (Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.6 && r > 1.5) k = 'cream2';           // the seams between the quarters
        else { const q = quarter(dx, dy); k = SKY[q][dy > 0 && q !== 3 ? 1 : 0]; }
        dot(x, i, j, k);
        if (r <= 9.6 && k !== 'cream2' && quarter(dx, dy) !== now) { x.fillStyle = 'rgba(255,250,240,0.55)'; x.fillRect(i, j, 1, 1); }   // veiled
      }
      // a dot of each phase's light in its quarter: the low sun, the high sun, the setting sun, the moon
      [[C - 6, C, 'light3'], [C, C - 6, 'light2'], [C + 6, C, 'roofR2'], [C, C + 6, 'light0']].forEach(([i, j, k], q) => {
        rect(x, i - 1, j - 1, 3, 3, k); if (q !== now) { x.fillStyle = 'rgba(255,250,240,0.55)'; x.fillRect(i - 1, j - 1, 3, 3); }
      });
      return c;
    });
    put('clock_face', strip(faces), { frames: 4 });
    // the hand: a slim brass pointer from the hub nearly to the rim, outlined in ink, on a brass pin
    const hands = [];
    for (let s = 0; s < 16; s++) {
      const a = s * Math.PI / 8, ux = Math.sin(a), uy = -Math.cos(a), on = new Set();
      for (let t = 0; t <= 7.5; t += 0.25) on.add(`${Math.round(C + ux * t)},${Math.round(C + uy * t)}`);
      const [c, x] = canvas(D, D);
      for (const p of on) { const [i, j] = p.split(',').map(Number); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!on.has(`${i + di},${j + dj}`)) dot(x, i + di, j + dj, 'ink'); }
      for (const p of on) { const [i, j] = p.split(',').map(Number); dot(x, i, j, 'brass1'); }
      rect(x, C - 1, C - 1, 3, 3, 'ink'); dot(x, C, C, 'brass0');
      hands.push(c);
    }
    put('clock_hand', strip(hands), { frames: 16 });
    // each phase's picture, 7x7, in its sky's colours and outlined like the kit's icons
    const glyphs = PHASES.map((_, k) => {
      const [c, x] = canvas(7, 7);
      const sun = (cy, r, col, cut) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1 && cy + j <= cut) dot(x, 3 + i, cy + j, col); };
      if (k === 0) { sun(5, 2, 'light3', 5); rect(x, 0, 6, 7, 1, 'ink'); for (const [i, j] of [[0, 3], [6, 3], [3, 1]]) dot(x, i, j, 'light3'); }
      if (k === 1) { sun(3, 2, 'brass1', 9); for (const [i, j] of [[3, 0], [0, 3], [6, 3], [3, 6], [1, 1], [5, 1], [1, 5], [5, 5]]) dot(x, i, j, 'brass2'); dot(x, 2, 2, 'light0'); }
      if (k === 2) { sun(5, 3, 'roofR2', 5); rect(x, 0, 6, 7, 1, 'ink'); rect(x, 1, 4, 5, 1, 'light3'); }
      if (k === 3) { sun(3, 3, 'dusk5', 9); for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if ((i - 2) ** 2 + (j + 1) ** 2 <= 6) x.clearRect(3 + i, 3 + j, 1, 1); dot(x, 6, 6, 'brass1'); }
      return c;
    });
    put('phase_glyph', strip(glyphs), { frames: 4 });
  }

  function ui() {
    const O = { o: 'ink' }, PAPER = { o: 'ink', fill: 'sky0', hi: 'white', lo: 'cream1' }, spec = {};
    const put = (name, img, extra = {}) => { png(`ui/${name}.png`, img); spec[name] = { size: [img.width / (extra.frames || 1), img.height], ...extra }; };
    // 9-slice box: the corners (cut, outline and the mitred bevel pixel) stay, the uniform rows and columns between them stretch.
    const nine = (name, w, h, cut, colours, extra) => put(name, box(w, h, cut, colours), { margins: Array(4).fill(cut + 1), ...extra });
    // One frame per dy: img shifted down by dy in a frame h px tall.
    const bob = (img, h, dys) => strip(dys.map(dy => { const [c, x] = canvas(img.width, h); x.drawImage(img, 0, dy); return c; }));

    nine('panel', 24, 24, 2, PAPER, { text: PAL.ink });
    nine('name', 16, 12, 1, { o: 'ink', fill: 'wood3', hi: 'wood2', lo: 'wood4' }, { text: PAL.cream0 });
    nine('choice', 16, 12, 1, { o: 'brass2', fill: 'light1', hi: 'light0', lo: 'light2' }, { text: PAL.ink });
    nine('slot', 22, 22, 2, { o: 'ink', fill: 'cream1', hi: 'cream2', lo: 'white' });   // a recess in the paper

    const arrow = sprite([
      '.ooooo.',
      'oaaaabo',
      'obbbbco',
      '.obbco.',
      '..oco..',
      '...o...',
    ], { ...O, a: 'light1', b: 'brass1', c: 'brass2' });
    put('next', bob(arrow, 8, [0, 1, 2, 1]), { frames: 4, fps: 4 });

    // "..." speech bubble on the panel's paper; its tail tip (anchor) sits just above a head.
    const [bubble, bx] = canvas(11, 9);
    bx.drawImage(box(11, 7, 2, PAPER), 0, 0);
    rect(bx, 4, 7, 3, 1, 'ink'); rect(bx, 5, 6, 1, 2, 'cream1'); dot(bx, 5, 8, 'ink');
    for (const dx of [3, 5, 7]) dot(bx, dx, 3, 'ink');
    put('prompt', bob(bubble, 10, [1, 0]), { frames: 2, fps: 2, anchor: [5, 9] });

    // Emotes, popping over a speaker's head as a line begins (Talk): the same bubble with a sign of the line's mood
    // in it. Frames: surprised (!), puzzled (?), smile (a note), moved (a heart), cross (a vein), sad (a sweat drop).
    const SIGNS = [
      [[5, 2], [5, 3], [5, 4], [5, 6]],
      [[4, 2], [5, 1], [6, 2], [6, 3], [5, 4], [5, 6]],
      [[6, 1], [7, 2], [6, 2], [6, 3], [6, 4], [5, 4], [4, 5], [5, 5]],
      [[3, 2], [4, 2], [6, 2], [7, 2], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [4, 4], [5, 4], [6, 4], [5, 5]],
      [[4, 2], [6, 2], [3, 3], [7, 3], [3, 5], [7, 5], [4, 6], [6, 6]],
      [[5, 1], [5, 2], [4, 3], [6, 3], [4, 4], [5, 5], [6, 4]],
    ];
    const SIGN = ['ink', 'ink', 'ink', 'rose', 'red', 'blue'];
    const emotes = SIGNS.map((pts, k) => {
      const [c, x] = canvas(11, 10);
      x.drawImage(box(11, 8, 2, PAPER), 0, 0);
      rect(x, 4, 8, 3, 1, 'ink'); rect(x, 5, 7, 1, 2, 'cream1'); dot(x, 5, 9, 'ink');
      for (const [i, j] of pts) dot(x, i, j, SIGN[k]);
      return c;
    });
    put('emote', strip(emotes), { frames: 6, anchor: [5, 9] });

    put('cursor', sprite([
      'o.........',
      'oo........',
      'owo.......',
      'owco......',
      'owcso.....',
      'owccso....',
      'owcccso...',
      'owccccso..',
      'owccooooo.',
      'owcooso...',
      'owo.oso...',
      'oo...oo...',
    ], { ...O, w: 'white', c: 'cream0', s: 'cream2' }), { hotspot: [0, 0] });
    put('cursor_hand', sprite([   // a cream glove: it mostly hovers over ants, so it must not share their colours
      '...oo.......',
      '..owbo......',
      '..owbo......',
      '..owbooo....',
      '..owbobbooo.',
      '.oobbobbobbo',
      'owobbbbbbbbo',
      'owbbbbbbbbco',
      '.obbbbbbbbco',
      '..obbbbbbco.',
      '...obbbbcco.',
      '....oooooo..',
    ], { ...O, w: 'white', b: 'cream0', c: 'cream2' }), { hotspot: [3, 0] });

    dayDial(put);
    put('title', TITLE.render(10 * 60 + 17));   // the clock in the O stopped at 10:17, the hour the station's watch stopped
    json('ui/ui.json', spec);
    // Every PAL colour as #rrggbb; the translucent cast shadow becomes #rrggbbaa.
    const hex = v => (v[0] === '#' ? v : '#' + v.match(/[\d.]+/g).map((n, i) => Math.round(i < 3 ? n : n * 255).toString(16).padStart(2, '0')).join(''));
    json('ui/palette.json', Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, hex(v)])));
  }

  PARTS.cast = () => { chars(); ui(); };
})();
