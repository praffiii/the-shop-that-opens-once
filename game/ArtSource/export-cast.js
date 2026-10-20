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

  /* The minigame bench (the Board): a workbench frame of wood with brass rivets round the paper; the title on a nailed
     wood plate; the meter a brass-rimmed iron gauge with the sweet band glowing like hot iron, brass notches marking
     the band's ends above and below (so it reads without its colour) and a brass-headed needle; the steps as iron
     sockets that glow once done; and key caps for the keys the instructions name. */
  function bench(put) {
    const WOOD = { o: 'ink', fill: 'wood3', hi: 'wood2', lo: 'wood4' };
    const [frame, fx] = canvas(30, 30);
    fx.drawImage(box(30, 30, 2, WOOD), 0, 0);
    fx.drawImage(box(22, 22, 1, { o: 'ink', fill: 'sky0', hi: 'cream1', lo: 'white' }), 4, 4);   // the paper, set in
    for (const [i, j] of [[1, 1], [26, 1], [1, 26], [26, 26]]) { rect(fx, i + 1, j + 1, 2, 2, 'brass1'); dot(fx, i + 2, j + 2, 'brass3'); }
    put('bench', frame, { margins: [7, 7, 7, 7], text: PAL.ink });

    const [plate, px] = canvas(20, 14);
    px.drawImage(box(20, 14, 1, WOOD), 0, 0);
    rect(px, 1, 12, 18, 1, 'wood5');
    for (const i of [2, 16]) { rect(px, i, 5, 2, 2, 'brass1'); dot(px, i + 1, 6, 'brass3'); }
    put('plate', plate, { margins: [5, 4, 5, 4], text: PAL.cream0 });

    const [gauge, gx] = canvas(16, 12);
    gx.drawImage(box(16, 12, 1, { o: 'ink', fill: 'brass2', hi: 'brass1', lo: 'brass3' }), 0, 0);
    gx.drawImage(box(12, 8, 0, { o: 'iron4', fill: 'iron3', hi: 'iron4', lo: 'iron2' }), 2, 2);   // the iron, recessed
    put('gauge', gauge, { margins: [4, 4, 4, 4] });

    const [glow, lx] = canvas(6, 8);
    ['light3', 'light2', 'light1', 'light0', 'white', 'light0', 'light1', 'light2'].forEach((c, j) => rect(lx, 0, j, 6, 1, c));
    put('glow', glow, { margins: [1, 4, 1, 4] });

    const notch = sprite(['ooooo', '.obo.', '..o..'], { o: 'ink', b: 'brass1' });
    const [up, ux] = canvas(5, 3); ux.translate(0, 3); ux.scale(1, -1); ux.drawImage(notch, 0, 0);
    put('notch', strip([notch, up]), { frames: 2 });

    put('needle', sprite([
      'ooooooo',
      'obbbbbo',
      '.occco.',
      '..oco..',
      ...Array(15).fill('..owo..'),
      '...o...',
    ], { o: 'ink', b: 'brass1', c: 'brass2', w: 'cream0' }));

    // a step's socket: dark iron to do, a glowing ember once done
    const pip = shades => {
      const [c, x] = canvas(9, 9);
      const inside = (i, j) => i >= 0 && j >= 0 && i < 9 && j < 9 && (i - 4) ** 2 + (j - 4) ** 2 <= 18;
      for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
        if (!inside(i, j)) continue;
        const r = (i - 4) ** 2 + (j - 4) ** 2, edge = !(inside(i - 1, j) && inside(i + 1, j) && inside(i, j - 1) && inside(i, j + 1));
        dot(x, i, j, edge ? 'ink' : shades[r < 3 ? 0 : r < 9 ? 1 : 2]);
      }
      return c;
    };
    put('pip', strip([pip(['iron4', 'iron3', 'iron2']), pip(['light0', 'light1', 'light2'])]), { frames: 2 });

    // a key cap, its face over a deeper side
    const [key, kx] = canvas(12, 13);
    kx.drawImage(box(12, 13, 1, { o: 'ink', fill: 'cream0', hi: 'white', lo: 'cream1' }), 0, 0);
    rect(kx, 1, 9, 10, 3, 'cream2'); rect(kx, 1, 9, 10, 1, 'stone2');
    put('key', key, { margins: [3, 3, 3, 5], text: PAL.ink });
  }

  // Fills every pixel where inside(i, j) holds with colour(i, j), outlined in ink where it meets the outside.
  function shape(w, h, inside, colour) {
    const [c, x] = canvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!inside(i, j)) continue;
      const edge = !(inside(i - 1, j) && inside(i + 1, j) && inside(i, j - 1) && inside(i, j + 1));
      dot(x, i, j, edge ? 'ink' : colour(i, j));
    }
    return c;
  }
  // A ring of radius r round the middle of a w x w frame, its bands from the outside in.
  function ring(w, r, bands) {
    const [c, x] = canvas(w, w), m = (w - 1) / 2;
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
      const k = Math.floor(r + 0.5 - Math.hypot(i - m, j - m));
      if (k >= 0 && k < bands.length) dot(x, i, j, bands[k]);
    }
    return c;
  }

  /* Minigame 1A, the Baker's sifting and kneading: a brass-armed metronome on a walnut base keeping the 75 BPM beat
     (its arm in nine steps from the left to the right), the round sieve tipped left, level and right, the spruce
     basin the flour heaps up in (empty to full), the dough lumped, pressed flat and folded over, and the kneading
     rings: one closing in (from wide to tight, a frame per 2 px) on the glowing ring of the sweet spot. */
  function kneading(put) {
    const [mw, mh] = [21, 34];
    put('metronome', strip(Array.from({ length: 9 }, (_, f) => {
      const [c, x] = canvas(mw, mh);
      x.drawImage(shape(mw, 14, (i, j) => Math.abs(i - 10) <= 4 + j * 0.45, (i, j) => (i < 8 ? 'wood2' : i > 13 ? 'wood4' : 'wood3')), 0, mh - 14);
      rect(x, 8, mh - 6, 5, 2, 'brass1');   // the brass name plate
      const a = (f / 8 - 0.5) * 0.9, px0 = 10, py0 = mh - 9;
      for (let t = 0; t <= 22; t += 0.5) { const i = Math.round(px0 + Math.sin(a) * t), j = Math.round(py0 - Math.cos(a) * t); dot(x, i - 1, j, 'ink'); dot(x, i + 1, j, 'ink'); dot(x, i, j, 'brass1'); }
      const bi = Math.round(px0 + Math.sin(a) * 15), bj = Math.round(py0 - Math.cos(a) * 15);   // the sliding weight
      rect(x, bi - 2, bj - 2, 5, 4, 'ink'); rect(x, bi - 1, bj - 1, 3, 2, 'brass0');
      rect(x, px0 - 1, py0 - 1, 3, 3, 'ink'); dot(x, px0, py0, 'brass2');
      return c;
    })), { frames: 9 });

    const [sw, sh] = [46, 18];
    put('sieve', strip([-1, 0, 1].map(tilt => shape(sw, sh, (i, j) => {
      const y = j - 9 - tilt * (i - 23) / 8;   // the rim tipped toward the side shaken
      return ((i - 23) / 22) ** 2 + (y / 6) ** 2 <= 1;
    }, (i, j) => {
      const y = j - 9 - tilt * (i - 23) / 8, r = ((i - 23) / 22) ** 2 + (y / 6) ** 2;
      return r > 0.62 ? (y < 0 ? 'wood2' : 'wood4') : (i + j) % 2 ? 'stone2' : 'cream1';   // the bentwood rim round the mesh
    }))), { frames: 3 });

    const [bw, bh] = [66, 26];
    put('basin', strip([0, 1, 2, 3, 4].map(full => {
      const [c, x] = canvas(bw, bh);
      if (full) x.drawImage(shape(bw, bh, (i, j) => j >= 8 - full * 2 && Math.abs(i - 33) <= 28 - (8 - j) * (6 - full) && j < 10, () => 'white'), 0, 0);   // the flour heaped in it
      x.drawImage(shape(bw, bh, (i, j) => j >= 6 && j < bh && Math.abs(i - 33) <= 32 - (j - 6) * 0.35, (i, j) =>
        j <= 8 ? (j === 7 ? 'wood2' : 'wood3') : i % 11 === 4 ? 'wood5' : j > bh - 5 ? 'wood4' : i < 20 ? 'wood2' : 'wood3'), 0, 0);   // staves under a hoop
      rect(x, 4, 14, bw - 8, 1, 'iron3');
      if (full) for (let i = 8; i < 58; i += 3) dot(x, i, 7, (i / 3) % 2 ? 'cream0' : 'white');
      return c;
    })), { frames: 5 });

    const [dw, dh] = [38, 18];
    const dough = (rx, ry, fold) => shape(dw, dh, (i, j) => ((i - 19) / rx) ** 2 + ((j - dh + 1 + ry) / ry) ** 2 <= 1 && j < dh,
      (i, j) => (fold && Math.abs(j - (dh - ry)) < 1 && i > 6 && i < 32 ? 'cream2' : j < dh - ry * 1.4 ? 'white' : ((i - 13) / rx) ** 2 + ((j - dh + ry * 1.6) / ry) ** 2 < 0.25 ? 'white' : 'cream0'));
    put('dough', strip([dough(12, 8, false), dough(17, 5, false), dough(14, 7, true)]), { frames: 3 });

    // the Baker's scrubbed table: planks running its length (they stretch with it), its front edge in shadow
    const [tt, tx] = canvas(24, 18);
    tx.drawImage(box(24, 18, 1, { o: 'ink', fill: 'wood2', hi: 'wood1', lo: 'wood3' }), 0, 0);
    for (const j of [5, 9]) rect(tx, 1, j, 22, 1, 'wood3');
    rect(tx, 1, 13, 22, 4, 'wood4'); rect(tx, 1, 13, 22, 1, 'wood5');
    put('tabletop', tt, { margins: [4, 4, 4, 7] });

    put('ring', strip(Array.from({ length: 12 }, (_, f) => ring(62, 6 + f * 2, ['ink', 'cream0', 'ink']))), { frames: 12 });
    put('ring_sweet', ring(62, 15, ['light3', 'light1', 'light0', 'light1', 'light3']));
  }

  /* Minigame 1B, the clockwork: three brass gears from the watch (the great wheel, the third wheel and the escape
     wheel), each in twelve steps of a turn with its red seating mark, which must point up at the plate's arrow; brass
     corner brackets round the gear in hand; and the pendulum swinging in seven steps. */
  function clockwork(put) {
    const gear = (r, teeth) => strip(Array.from({ length: 12 }, (_, f) => {
      const w = 2 * r + 7, m = (w - 1) / 2, turn = f * Math.PI / 6;
      const at = (i, j) => [Math.hypot(i - m, j - m), Math.atan2(i - m, -(j - m)) - turn];
      const img = shape(w, w, (i, j) => {
        const [d, a] = at(i, j);
        const tooth = Math.cos(a * teeth) > 0.1;
        if (d > r + (tooth ? 3 : 0)) return false;
        if (d < 2) return false;   // the arbor hole
        const spoke = Math.min(...[0, 1, 2, 3].map(k => Math.abs(Math.sin(a - k * Math.PI / 2 + Math.PI / 4)))) * d;
        return !(d > 4.5 && d < r - 3.5 && r > 9 && spoke > 3);   // windows between four crossed spokes
      }, (i, j) => {
        const [d] = at(i, j), lit = (i - m) + (j - m);
        return d > r - 1.5 ? (lit < -3 ? 'brass0' : lit > 4 ? 'brass3' : 'brass1') : lit < 0 ? 'brass1' : 'brass2';
      });
      const x = img.getContext('2d'), mk = r - 4;
      rect(x, Math.round(m + Math.sin(turn) * mk) - 1, Math.round(m - Math.cos(turn) * mk) - 1, 3, 3, 'red');   // the seating mark
      return img;
    }));
    put('gear_great', gear(20, 14), { frames: 12 });
    put('gear_third', gear(14, 10), { frames: 12 });
    put('gear_escape', gear(9, 8), { frames: 12 });

    const [k, kx] = canvas(12, 12);
    for (const [i, j, fi, fj] of [[0, 0, 1, 1], [8, 0, -1, 1], [0, 8, 1, -1], [8, 8, -1, -1]]) {
      const ci = fi > 0 ? i : i + 3, cj = fj > 0 ? j : j + 3;
      rect(kx, i, cj, 4, 1, 'ink'); rect(kx, ci, j, 1, 4, 'ink');
      rect(kx, i + (fi > 0 ? 1 : 0), cj + fj, 3, 1, 'brass1'); rect(kx, ci + fi, j + (fj > 0 ? 1 : 0), 1, 3, 'brass1');
    }
    put('bracket', k, { margins: [5, 5, 5, 5] });

    // the green baize of the Mender's gear bench in its brass-edged frame
    const [bz, bx] = canvas(24, 24);
    bx.drawImage(box(24, 24, 1, { o: 'ink', fill: 'brass1', hi: 'brass0', lo: 'brass2' }), 0, 0);
    bx.drawImage(box(20, 20, 0, { o: 'brass3', fill: 'roofG2', hi: 'roofG3', lo: 'roofG1' }), 2, 2);
    put('baize', bz, { margins: [5, 5, 5, 5] });

    const [pw, ph] = [35, 46];
    put('pendulum', strip(Array.from({ length: 7 }, (_, f) => {
      const [c, x] = canvas(pw, ph), a = (f / 6 - 0.5) * 0.7, top = 3;
      for (let t = 0; t <= 34; t += 0.5) { const i = Math.round(17 + Math.sin(a) * t), j = Math.round(top + Math.cos(a) * t); dot(x, i, j, 'ink'); dot(x, i + 1, j, 'brass2'); }
      const bi = Math.round(17 + Math.sin(a) * 36), bj = Math.round(top + Math.cos(a) * 36);
      x.drawImage(shape(11, 11, (i, j) => (i - 5) ** 2 + (j - 5) ** 2 <= 26, (i, j) => (i + j < 8 ? 'brass0' : i + j > 12 ? 'brass3' : 'brass1')), bi - 5, bj - 5);
      rect(x, 14, 0, 7, 4, 'ink'); rect(x, 15, 1, 5, 2, 'iron2');   // the suspension block
      return c;
    })), { frames: 7 });
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
    bench(put);
    kneading(put);
    clockwork(put);
    put('title', TITLE.render(10 * 60 + 17));   // the clock in the O stopped at 10:17, the hour the station's watch stopped
    json('ui/ui.json', spec);
    // Every PAL colour as #rrggbb; the translucent cast shadow becomes #rrggbbaa.
    const hex = v => (v[0] === '#' ? v : '#' + v.match(/[\d.]+/g).map((n, i) => Math.round(i < 3 ? n : n * 255).toString(16).padStart(2, '0')).join(''));
    json('ui/palette.json', Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, hex(v)])));
  }

  PARTS.cast = () => { chars(); ui(); };
})();
