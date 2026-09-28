'use strict';
/* Cast part: the ant sheets and portraits (chars.js), the title (title.js), the palette (px.js) and a
   small pixel UI kit authored here with the PX palette. Writes chars/ and ui/ under game/art. */
(() => {
  const { PAL, sprite, col, rect, dot } = PX;
  const { canvas, png, json } = BAKE;
  const CELL = 40, FEET = [20, 37], FLIPPED_X = 19, PORTRAIT = 48, PFRAMES = 3;
  const MOODS = ['smile', 'moved'];   // every mood chars.js draws; an id without one gets its neutral face back

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

    put('title', TITLE.render(18 * 60 + 17));   // the clock in the O stopped at 18:17, as on the presentation's title
    json('ui/ui.json', spec);
    // Every PAL colour as #rrggbb; the translucent cast shadow becomes #rrggbbaa.
    const hex = v => (v[0] === '#' ? v : '#' + v.match(/[\d.]+/g).map((n, i) => Math.round(i < 3 ? n : n * 255).toString(16).padStart(2, '0')).join(''));
    json('ui/palette.json', Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, hex(v)])));
  }

  PARTS.cast = () => { chars(); ui(); };
})();
