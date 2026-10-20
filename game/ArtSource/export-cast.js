'use strict';
/* Cast part: the ant sheets and portraits (chars.js), the title (title.js), the palette (px.js) and a
   small pixel UI kit authored here with the PX palette. Writes chars/ and ui/ under game/Assets/Resources/Art. */
(() => {
  const { PAL, sprite, col, rect, dot, line } = PX;
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

  /* Rain (Night 4's drizzle), drawn over the world a screen pixel to the art pixel: rain_streak is three drops falling
     slant on the sea wind, short to long, pale and see-through, brightest at the head; rain_splash is a drop landing,
     a dot, its crown thrown up, the ring spreading and fading. */
  function rain(put) {
    const pale = (x, i, j, a) => { x.fillStyle = `rgba(226,240,255,${a})`; x.fillRect(i, j, 1, 1); };
    const streaks = [6, 9, 12].map(L => {
      const [c, x] = canvas(4, 12);
      for (let j = 0; j < L; j++) pale(x, Math.round((L - 1 - j) / 4), 12 - L + j, 0.18 + 0.42 * (j / (L - 1)));
      return c;
    });
    put('rain_streak', strip(streaks), { frames: 3 });
    const rings = [[[3, 3, 0.7]], [[2, 2, 0.6], [4, 2, 0.6], [3, 3, 0.4], [1, 1, 0.45], [5, 1, 0.45]], [[0, 3, 0.45], [6, 3, 0.45], [1, 2, 0.35], [5, 2, 0.35], [2, 3, 0.3], [4, 3, 0.3]], [[0, 3, 0.2], [6, 3, 0.2]]];
    put('rain_splash', strip(rings.map(r => { const [c, x] = canvas(7, 4); r.forEach(([i, j, a]) => pale(x, i, j, a)); return c; })), { frames: 4 });
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

  /* Minigame 2A, the Gardener's chamomile: the field's earth under a grassy edge (the furrows are laid over it in the
     game, so they don't stretch), a chamomile stem as a bud, in full bloom and snipped, the thorny brambles still and
     shaken, and the Gardener's little shears open and shut, pointing right along the row. */
  function harvest(put) {
    const [g, gx] = canvas(24, 24);
    gx.drawImage(box(24, 24, 1, { o: 'ink', fill: 'dirt2', hi: 'dirt1', lo: 'dirt3' }), 0, 0);
    rect(gx, 1, 1, 22, 5, 'grass2'); rect(gx, 1, 1, 22, 1, 'grass1'); rect(gx, 1, 5, 22, 1, 'grass3');
    put('garden', g, { margins: [4, 7, 4, 4] });

    const [bw, bh] = [16, 24];
    const stem = (x, top) => {
      for (let j = top; j < bh; j++) { dot(x, 7, j, 'ink'); dot(x, 8, j, 'leaf3'); dot(x, 9, j, 'ink'); }
      if (top < 14) for (const [i, j, k] of [[4, 17, -1], [11, 15, 1]]) { rect(x, i, j, 3, 2, 'leaf2'); dot(x, i + (k > 0 ? 2 : 0), j - 1, 'leaf2'); }
    };
    const flower = full => {
      const [c, x] = canvas(bw, bh);
      stem(x, 8);
      if (full) {
        x.drawImage(shape(15, 13, (i, j) => (i - 7) ** 2 + (j - 6) ** 2 * 1.3 <= 40, (i, j) => ((i + j) % 4 === 0 ? 'cream0' : 'white')), 0, 0);
        x.drawImage(shape(7, 7, (i, j) => (i - 3) ** 2 + (j - 3) ** 2 <= 8, (i, j) => (i + j < 4 ? 'light0' : i + j > 6 ? 'orange' : 'yellow')), 4, 3);
      } else {
        x.drawImage(shape(9, 11, (i, j) => ((i - 4) / 4) ** 2 + ((j - 6) / 5) ** 2 <= 1, (i, j) => (j < 4 ? 'cream0' : i < 4 ? 'leaf1' : 'leaf2')), 4, 1);
      }
      return c;
    };
    const [cut, cx] = canvas(bw, bh); stem(cx, 15); rect(cx, 7, 14, 3, 1, 'ink'); dot(cx, 8, 15, 'leaf1');
    put('bloom', strip([flower(false), flower(true), cut]), { frames: 3 });

    const bramble = shake => {
      const [c, x] = canvas(26, 24);
      // three arching canes, thorns along them, leaves and a few dark berries
      for (const [x0, h, bend] of [[5, 20, 9], [12, 22, -7], [19, 18, -9]]) {
        let last = null;
        for (let t = 0; t <= 1; t += 0.03) {
          const i = Math.round(x0 + bend * Math.sin(t * Math.PI * 0.8) + shake * t * 2), j = Math.round(23 - h * t);
          dot(x, i, j, 'ink'); dot(x, i + 1, j, 'roofR3');
          if (Math.round(t * 33) % 5 === 0 && last !== j) { dot(x, i + 2, j - 1, 'ink'); dot(x, i - 1, j - 1, 'ink'); last = j; }
        }
      }
      for (const [i, j] of [[3, 9], [15, 5], [21, 12], [9, 15], [17, 17]]) { rect(x, i + shake, j, 4, 3, 'leaf3'); rect(x, i + shake, j, 2, 1, 'leaf1'); dot(x, i + 3 + shake, j + 2, 'leaf5'); }
      for (const [i, j] of [[8, 6], [20, 8], [13, 12]]) { rect(x, i + shake, j, 2, 2, 'dusk5'); dot(x, i + shake, j, 'lilac'); }
      return c;
    };
    put('bramble', strip([bramble(0), bramble(1)]), { frames: 2 });

    const shears = open => {
      const [c, x] = canvas(24, 13);
      // two red-painted handle loops on the left, the brass pivot, and the two steel blades (2 px, a lit edge on top)
      for (const j of [0, 8]) { rect(x, 0, j, 7, 5, 'ink'); rect(x, 1, j + 1, 5, 3, 'roofR2'); rect(x, 1, j + 1, 5, 1, 'roofR1'); rect(x, 2, j + 2, 3, 1, 'ink'); }
      line(x, 6, 3, 9, 6, 'ink'); line(x, 6, 9, 9, 6, 'ink');
      for (const sgn of [-1, 1]) for (let t = 0; t <= 13; t++) {
        const i = 9 + t, j = Math.round(6 + sgn * (open ? t * 0.38 : 0)) + (open ? 0 : sgn > 0 ? 1 : 0);
        dot(x, i, j - 1, 'ink'); dot(x, i, j, t > 9 ? 'iron0' : 'iron1'); dot(x, i, j + 1, 'ink');
      }
      rect(x, 8, 5, 3, 3, 'ink'); dot(x, 9, 6, 'brass1');
      return c;
    };
    put('shears', strip([shears(true), shears(false)]), { frames: 2 });
  }

  /* Minigame 2B, Ratih's treadle sewing machine: the patchwork cotton under the needle (its polka dots are laid over it
     in the game, so they don't stretch), the machine's black cast-iron arm with its gold scrolls, the needle up and
     down, the hand wheel turning and the iron treadle rocking. */
  function stitching(put) {
    const [cl, clx] = canvas(24, 24);
    clx.drawImage(box(24, 24, 1, { o: 'roofR3', fill: 'pink', hi: '#ffd0e8', lo: 'rose' }), 0, 0);
    put('cloth', cl, { margins: [3, 3, 3, 3] });

    const [mw, mh] = [104, 44];
    put('machine', strip([0, 1].map(down => {
      const [c, x] = canvas(mw, mh);
      // the pillar down to the bed on the right, the arm across, the head over the needle on the left
      x.drawImage(shape(mw, mh, (i, j) => (i >= 76 && i < 96 && j >= 10 && j < 44) || (i >= 8 && i < 98 && j >= 4 && j < 17) || (i >= 2 && i < 30 && j >= 2 && j < 26 && !(i < 5 && j < 5)),
        (i, j) => (j < 6 || i < 4 ? 'iron3' : (i >= 76 && i > 92) || j > 22 ? 'ink' : 'iron4')), 0, 0);
      for (let i = 34; i < 74; i += 4) { dot(x, i, 8, 'brass1'); dot(x, i + 1, 9, 'brass2'); dot(x, i + 2, 8, 'brass0'); }   // the gold scrolls
      rect(x, 80, 20, 12, 2, 'brass1'); rect(x, 80, 26, 12, 1, 'brass2'); rect(x, 8, 12, 14, 1, 'brass1');
      // the tension discs on the head's face, the red thread from them down to the needle
      rect(x, 22, 6, 4, 4, 'iron1'); dot(x, 23, 7, 'white');
      const n = down ? 4 : 0;
      line(x, 24, 9, 17, 27 + n, 'red');
      // the needle bar, the presser foot, the needle
      rect(x, 13, 26, 4, 7 + n, 'iron2'); rect(x, 13, 26, 1, 7 + n, 'iron1');
      rect(x, 10, 35, 10, 3, 'iron3'); rect(x, 10, 35, 10, 1, 'iron1');
      rect(x, 14, 33 + n, 2, 5, 'iron0'); dot(x, 14, 38 + n > 43 ? 43 : 38 + n, 'white');
      return c;
    })), { frames: 2 });

    put('flywheel', strip(Array.from({ length: 4 }, (_, f) => {
      const turn = f * Math.PI / 8;
      return shape(23, 23, (i, j) => { const d = Math.hypot(i - 11, j - 11); return d <= 11 && (d > 8 || d < 3 || [0, 1, 2, 3].some(k => Math.abs(Math.sin(Math.atan2(j - 11, i - 11) - turn - k * Math.PI / 2)) * d < 1.2)); },
        (i, j) => { const d = Math.hypot(i - 11, j - 11); return d < 3 ? 'brass1' : d > 8 ? ((i + j) < 20 ? 'iron2' : 'iron4') : 'iron3'; });
    })), { frames: 4 });

    put('treadle', strip([-1, 0, 1].map(tilt => shape(38, 16, (i, j) => {
      const y = j - 8 - tilt * (i - 19) / 7;
      return Math.abs(y) <= 3 && i > 0 && i < 37;
    }, (i, j) => {
      const y = j - 8 - tilt * (i - 19) / 7;
      return (i % 5 === 2 && Math.abs(y) < 2) ? 'iron4' : y < -1 ? 'iron2' : 'iron3';
    }))), { frames: 3 });
  }

  /* Minigame 3A, the sea-mint cliff over the south coast: the cliff as one tall picture (the day sky and the sea behind
     it, the wet black rock with its moss and salt, and the crevice Satria climbs, a foothold knob either side of it every
     18 px from y 218 up), the wider ledges he can rest on, the oyster shells in its nooks (shut, and with the rope caught
     round one), the clumps of sea mint on the clifftop (growing, in reach and picked), Satria climbing it seen from
     behind (a hand high in turn, leaning in five steps, and slipping), Arlo calling up from his rowboat, the surf at the
     cliff's foot and the windsock on its little plaque showing which way the gusts blow. */
  function cliff(put) {
    const W = 200, H = 240, CX = 100, LIP = 30, FOOT = 218, STEP = 18;
    const r = PX.rng(1043);
    const [c, x] = canvas(W, H);
    // the sky in bands down to the horizon, two clouds, then the sea
    [[0, 'sky3'], [36, 'sky2'], [90, 'sky1'], [134, 'sky0']].forEach(([y, k]) => rect(x, 0, y, W, 150 - y, k));
    for (const [cx, cy, w] of [[14, 64, 30], [176, 104, 36]]) {
      rect(x, cx - w / 2, cy, w, 4, 'cloud1'); rect(x, cx - w / 4, cy - 3, w / 2, 3, 'cloud0'); rect(x, cx - w / 2 + 2, cy + 4, w - 4, 1, 'cloud2');
    }
    rect(x, 0, 150, W, 2, 'water1'); rect(x, 0, 152, W, 8, 'water2'); rect(x, 0, 160, W, H - 160, 'water3');
    for (let k = 0; k < 26; k++) { const y = 156 + ((r() * 80) | 0); rect(x, (r() * W) | 0, y, 3 + ((r() * 5) | 0), 1, y < 168 ? 'water1' : 'water4'); }
    // the cliff: wet black rock in strata, lit from the left, the crevice up its middle
    const xl = y => Math.round(46 - (y - LIP) * 0.075 + Math.sin(y / 17) * 2), xr = y => Math.round(154 + (y - LIP) * 0.075 + Math.sin(y / 13 + 1) * 2);
    const crev = y => Math.round(Math.sin(y / 23) * 1.5);
    const inRock = (i, j) => j >= LIP && j < H && i >= xl(j) && i <= xr(j) && !(j < LIP + 3 && (i - xl(j) < 3 - (j - LIP) || xr(j) - i < 3 - (j - LIP)));
    const shift = Array.from({ length: 20 }, () => (r() * 9) | 0);
    for (let j = LIP; j < H; j++) for (let i = 0; i < W; i++) {
      if (!inRock(i, j)) continue;
      const band = Math.floor((j + shift[(i / 12) | 0]) / 14), inBand = (j + shift[(i / 12) | 0]) % 14;
      let k = inBand < 2 ? 'stone4' : inBand === 13 ? 'ink2' : 'stone5';
      if (i - xl(j) < 3) k = inBand === 13 ? 'stone5' : 'stone4';
      if (xr(j) - i < 2) k = 'ink2';
      if ((i * 7 + band * 13) % 41 === 0 && inBand > 2) k = 'ink2';   // a joint in the stratum
      dot(x, i, j, k);
    }
    for (let j = LIP; j < H; j++) for (let i = 0; i < W; i++) if (inRock(i, j) && !(inRock(i - 1, j) && inRock(i + 1, j) && inRock(i, j - 1))) dot(x, i, j, 'ink');
    // wet glints running down the face, moss on the strata, salt and barnacles low down where the spray reaches
    for (let k = 0; k < 22; k++) { const i = 52 + ((r() * 96) | 0), j = 50 + ((r() * 160) | 0); if (Math.abs(i - CX) < 10) continue; rect(x, i, j, 1, 3 + ((r() * 4) | 0), k % 3 ? 'stone3' : 'water1'); }
    for (let k = 0; k < 16; k++) {
      const i = 50 + ((r() * 100) | 0), j = 48 + ((r() * 150) | 0), w = 4 + ((r() * 6) | 0);
      if (Math.abs(i + w / 2 - CX) < 12 || !inRock(i, j) || !inRock(i + w, j)) continue;
      rect(x, i, j, w, 2, 'leaf4'); rect(x, i + 1, j - 1, w - 2, 1, 'leaf3'); dot(x, i + 2, j - 1, 'leaf2'); rect(x, i + 1, j + 2, 1, 2, 'leaf4');
    }
    for (let k = 0; k < 30; k++) { const i = 40 + ((r() * 120) | 0), j = 196 + ((r() * 26) | 0); if (inRock(i, j) && Math.abs(i - CX) > 8) { dot(x, i, j, 'stone0'); if (k % 3 === 0) dot(x, i + 1, j, 'cream1'); } }
    // the sea over the cliff's foot, the rock going down dark under it
    rect(x, 0, 226, W, H - 226, 'water3');
    for (let i = xl(226) + 2; i < xr(226) - 1; i++) rect(x, i, 227 + ((i * 5) % 3), 1, 2, 'water4');
    for (let k = 0; k < 8; k++) rect(x, (k * 29 + 11) % W, 230 + (k % 4) * 2, 5, 1, k % 2 ? 'water1' : 'water4');
    // the grassy clifftop in tufts, its turf hanging over the lip in tongues
    for (let i = xl(LIP) + 1; i < xr(LIP) - 1; i++) {
      const top = LIP - 4 - Math.round(1 + Math.sin(i / 3.1) + Math.sin(i / 7.3)), hang = LIP + 1 + (i % 11 < 4 ? 2 + (i % 3) : i % 5 === 0 ? 1 : 0);
      rect(x, i, top, 1, 1, 'ink'); rect(x, i, top + 1, 1, LIP - top, 'grass2'); dot(x, i, top + 1, 'grass1');
      rect(x, i, LIP, 1, hang - LIP, 'grass3'); dot(x, i, hang - 1, 'grass4'); dot(x, i, hang, 'ink');
    }
    for (let j = LIP - 6; j <= LIP + 4; j++) { dot(x, xl(LIP), j, 'ink'); dot(x, xr(LIP) - 1, j, 'ink'); }
    // wild mint flowering in the nooks of the face, white and lilac
    for (let k = 0; k < 14; k++) {
      const i = 52 + ((r() * 96) | 0), j = 44 + ((r() * 150) | 0);
      if (Math.abs(i - CX) < 12 || !inRock(i - 2, j) || !inRock(i + 3, j)) continue;
      rect(x, i - 1, j, 4, 2, 'leaf3'); dot(x, i, j - 1, 'leaf2'); dot(x, i + 2, j - 1, 'leaf2'); dot(x, i - 1, j + 2, 'leaf4');
      dot(x, i, j - 2, k % 2 ? 'white' : 'lilac'); dot(x, i + 2, j - 2, k % 2 ? 'lilac' : 'white');
    }
    // the crevice: a dark slot, its left lip lit, a knob either side at every foothold
    for (let j = LIP + 1; j < FOOT + 6; j++) {
      const m = CX + crev(j);
      rect(x, m - 4, j, 9, 1, 'ink'); rect(x, m - 2, j, 5, 1, '#1d1424');
      dot(x, m - 5, j, 'stone3'); dot(x, m + 5, j, 'ink2');
    }
    for (let k = 0; k < 10; k++) {
      const j = FOOT - k * STEP, m = CX + crev(j);
      for (const s of [-1, 1]) {
        const i = s < 0 ? m - 5 : m + 3;
        rect(x, i - (s < 0 ? 1 : 0), j - 1, 4, 3, 'ink'); rect(x, i, j - 1, 3, 1, 'stone3'); rect(x, i, j, 3, 1, 'stone4');
      }
    }
    put('cliff', c);

    // a ledge to stand and rest on, spanning the crevice: a lit top, its front in shade, moss along it
    const [lg, lx] = canvas(44, 8);
    lx.drawImage(shape(44, 8, (i, j) => j >= 1 && j < 8 && i >= Math.max(0, 3 - j) && i < 44 - Math.max(0, 3 - j) && !(j > 5 && (i < 4 || i > 39)), (i, j) =>
      j === 1 ? 'stone2' : j === 2 ? 'stone3' : j > 5 ? 'stone5' : 'stone4'), 0, 0);
    for (const i of [6, 7, 15, 27, 28, 36]) { dot(lx, i, 0, 'leaf2'); dot(lx, i, 1, 'leaf3'); }
    put('ledge', lg);

    // an oyster clinging in a nook: a ridged shell, its pearly lip; then caught in a turn of the rope, a glint where it bit
    const oyster = caught => {
      const [o, ox] = canvas(13, 11);
      ox.drawImage(shape(11, 9, (i, j) => ((i - 5) / 5.4) ** 2 + ((j - 4) / 4.2) ** 2 <= 1, (i, j) => (j < 2 ? 'stone0' : (i + j) % 3 === 0 ? 'stone2' : j > 6 ? 'stone3' : 'stone1')), 1, 1);
      rect(ox, 3, 6, 6, 1, 'ink2'); rect(ox, 4, 5, 4, 1, 'pink');
      if (caught) {
        for (let i = 0; i < 13; i++) { dot(ox, i, 4 + Math.round(Math.sin(i / 2) * 1), 'ink'); dot(ox, i, 5 + Math.round(Math.sin(i / 2) * 1), 'dirt2'); }
        for (const [i, j] of [[10, 0], [11, 1], [12, 0], [11, -1]]) if (j >= 0) dot(ox, i, j, 'light0');
        dot(ox, 11, 0, 'white');
      }
      return o;
    };
    put('oyster', strip([oyster(false), oyster(true)]), { frames: 2 });

    // a clump of wild sea mint with its white and lilac flowers; in reach it lifts and glints; picked, a few stalks stay
    const mint = (lift, glint) => {
      const [m, mx] = canvas(20, 17);
      const leaf = PX.rng(77);
      for (let k = 0; k < 10; k++) {
        const i = 2 + ((leaf() * 13) | 0), j = 5 + ((leaf() * 8) | 0) - lift;
        rect(mx, i, j, 4, 2, k % 3 ? 'leaf2' : 'leaf3'); dot(mx, i + 1, j - 1, 'leaf1'); dot(mx, i, j + 2, 'leaf4');
      }
      for (const [i, j, k] of [[4, 3, 'white'], [8, 1, 'lilac'], [12, 2, 'white'], [15, 4, 'lilac'], [6, 6, 'lilac'], [10, 5, 'white']]) { dot(mx, i, j - lift, k); dot(mx, i, j + 1 - lift, 'leaf3'); }
      rect(mx, 6, 13 - lift, 8, 3 + lift, 'leaf4');
      const out = PX.outline(m, 'ink');
      if (glint) { const gx = out.getContext('2d'); for (const [i, j] of [[18, 1], [17, 2], [19, 2], [18, 3], [1, 6]]) dot(gx, i, j, 'light0'); dot(gx, 18, 2, 'white'); }
      return out;
    };
    const [stub, sx] = canvas(20, 17);
    for (const [i, h] of [[6, 3], [8, 4], [10, 3], [12, 2]]) rect(sx, i, 16 - h, 1, h, 'leaf4');
    rect(sx, 5, 14, 9, 2, 'leaf3');
    const picked = PX.outline(stub, 'ink');
    put('seamint', strip([mint(0, false), mint(1, true), picked]), { frames: 3 });

    // Satria climbing, seen from behind: his back view with both arms up the rock, one hand high and the other low in
    // turn, then the whole of him leaning (each row shifted, the feet fixed) in five steps, then slipping, arms flung up
    const ARM = { l: [15, 22], r: [25, 22] };
    const climber = (hands, lean) => {
      const [a, ax] = canvas(40, 40);
      for (const [from, to] of hands) {
        const len = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
        for (const [k, w] of [['ink', 1], ['ant2', 0]]) for (let t = 0; t <= len; t++) {
          const i = Math.round(from[0] + (to[0] - from[0]) * t / len), j = Math.round(from[1] + (to[1] - from[1]) * t / len);
          rect(ax, i - w, j - w, 2 * w + 1, 2 * w + 1, k);
        }
        rect(ax, to[0] - 2, to[1] - 2, 4, 4, 'ink'); rect(ax, to[0] - 1, to[1] - 1, 2, 2, 'ant3');
      }
      CH.draw(ax, 'courier', 'idle_back', 0, 20, 37, 1, { shadow: false });
      if (!lean) return a;
      const [b, bx] = canvas(40, 40);
      for (let j = 0; j < 40; j++) bx.drawImage(a, 0, j, 40, 1, Math.round(lean * (37 - j) / 18), j, 40, 1);
      return b;
    };
    const reach = [[[ARM.l, [10, 6]], [ARM.r, [31, 18]]], [[ARM.l, [9, 18]], [ARM.r, [30, 6]]]];
    const frames = [];
    for (const hands of reach) for (let lean = -2; lean <= 2; lean++) frames.push(climber(hands, lean));
    frames.push(climber([[ARM.l, [5, 3]], [ARM.r, [35, 3]]], 0));
    put('climber', strip(frames), { frames: frames.length });

    // Arlo standing in his rowboat under the cliff, still, then calling up with a hand to his mouth
    const boat = VIL.rowboat(true).img;
    const bw = boat.width + 4, bh = boat.height + 30;
    put('arloboat', strip([0, 1].map(f => {
      const [b, bx] = canvas(bw, bh);
      CH.draw(bx, 'arlo', f ? 'talk' : 'idle', f, Math.round(bw / 2) + 2, bh - 19, -1, { shadow: false });
      bx.drawImage(boat, 2, bh - boat.height);
      return b;
    })), { frames: 2 });

    // the surf along the cliff's foot: a line of foam lapping, and the ripples off it
    put('surf', strip(Array.from({ length: 4 }, (_, f) => {
      const [s, sx2] = canvas(W, 14);
      for (let i = 0; i < W; i++) {
        const h = Math.round(1.5 + Math.sin(i / 6 + f * Math.PI / 2) * 1.5 + Math.sin(i / 2.3 - f) * 0.6);
        rect(sx2, i, 3 - h, 1, h + 2, 'water0'); dot(sx2, i, 5, 'water1');
        if ((i + f * 5) % 23 < 2) dot(sx2, i, 2 - h, 'cloud0');
      }
      for (let k = 0; k < 12; k++) rect(sx2, (k * 37 + f * 9) % W, 8 + (k % 3) * 2, 4 + (k % 4), 1, 'water1');
      return s;
    })), { frames: 4 });

    // the windsock on its plaque: limp, then streaming right (half, full, full flapping), then the same to the left
    const sock = (dir, len, flap) => {
      const [s, sx2] = canvas(34, 26);
      sx2.drawImage(box(34, 7, 1, { o: 'ink', fill: 'wood3', hi: 'wood2', lo: 'wood4' }), 0, 19);
      for (const i of [3, 29]) { rect(sx2, i, 21, 2, 2, 'brass1'); dot(sx2, i + 1, 22, 'brass3'); }
      rect(sx2, 15, 2, 4, 18, 'ink'); rect(sx2, 16, 3, 2, 16, 'brass1'); dot(sx2, 16, 3, 'brass0'); rect(sx2, 15, 1, 4, 2, 'ink');
      const cloth = [];
      for (let t = 0; t < len; t++) {
        const w = Math.max(1, 3 - Math.floor(t / 5)), along = dir ? 17 + dir * (2 + t) : 0;
        const y = dir ? 4 + Math.round(flap * Math.sin(t / 2.5) + t * 0.12) : 4 + t, i = dir ? along : 19 + Math.round(t * 0.15);
        cloth.push([i, y, w, Math.floor(t / 3) % 2 ? 'white' : 'red']);
      }
      for (const [i, y, w] of cloth) for (let d = -w - 1; d <= w + 1; d++) dir ? dot(sx2, i, y + d, 'ink') : dot(sx2, i + d, y, 'ink');
      for (const [i, y, w, k] of cloth) for (let d = -w; d <= w; d++) dir ? dot(sx2, i, y + d, k) : dot(sx2, i + d, y, k);
      return s;
    };
    put('windsock', strip([sock(0, 11, 0), sock(1, 9, 0), sock(1, 13, 1), sock(1, 13, -1), sock(-1, 9, 0), sock(-1, 13, 1), sock(-1, 13, -1)]), { frames: 7 });
  }

  /* Minigame 3B, Theo's darkroom: everything in the safelight's black and red. The room (the wall glowing round the red
     lamp, film drying on a line, the bottles, the bench with the developer, stop and fixer trays), the water bath the
     tank stands in and its front wall laid over the tank, the steel developing tank level, rocked left and right and
     opened, the bucket of sea-water ice (and a cube scooped from it), the copper kettle on its stand level and pouring,
     the tall glass thermometer marked 16 to 26 with notches at the 20-22 band and a cross at 24, the darkroom timer
     filling in 24 steps round its face (the agitation's part of its rim marked) and ringing, the agitation gauge with
     its needle, and Daniel's reel lifted out: four frames on the 8mm strip, first murky, then clear in black and white,
     Daniel and the villagers fitting the emergency bridge's beams and laughing. */
  function darkroom(put) {
    const S = ['#12060a', '#2a0a10', '#4a1016', '#781a1c', '#a82a22', '#d84a2e', '#ff8058', '#ffc4a4'];
    const W = 200, H = 104;
    const [c, x] = canvas(W, H);
    // the wall, glowing in rings round the safelight, its boards' seams one step darker than the light they're in
    for (let j = 0; j < 58; j++) for (let i = 0; i < W; i++) {
      const d = Math.hypot((i - 100) / 2, j - 9), k = d < 16 ? 4 : d < 26 ? 3 : d < 40 ? 2 : 1;
      dot(x, i, j, S[i % 18 === 0 ? k - 1 : i % 18 === 1 ? Math.min(7, k + 1) : k]);
    }
    // the safelight on its wall arm: a black dome, its round red lens lit, facing down at the bench
    rect(x, 99, 0, 3, 4, S[0]); rect(x, 100, 0, 1, 3, S[3]);
    for (let j = 0; j < 7; j++) { const w = Math.round(5 + j * 1.6); rect(x, 100 - w, 3 + j, 2 * w + 1, 1, S[0]); if (j > 1) rect(x, 100 - w + 2, 3 + j, 3, 1, S[2]); }
    for (let j = 0; j < 4; j++) { const w = [9, 10, 9, 6][j]; rect(x, 100 - w, 10 + j, 2 * w + 1, 1, j === 3 ? S[5] : S[6]); }
    rect(x, 94, 10, 7, 1, S[7]); rect(x, 92, 11, 4, 1, S[7]);
    // the line with Daniel's earlier reels pegged up to dry, from hooks in the wall
    for (const [a, b] of [[34, 84], [116, 160]]) {
      rect(x, a, 21, b - a, 1, S[0]); rect(x, a - 1, 20, 2, 3, S[5]); rect(x, b - 1, 20, 2, 3, S[5]);
      for (let i = a + 8; i < b - 6; i += 16) {
        rect(x, i - 1, 19, 4, 4, S[5]); dot(x, i, 19, S[7]);
        rect(x, i - 2, 23, 6, 22, S[0]); for (let j = 25; j < 44; j += 3) dot(x, i - 1, j, S[3]);
        rect(x, i + 1, 26, 2, 5, S[2]); rect(x, i + 1, 34, 2, 5, S[2]);
      }
    }
    // a shelf of brown bottles at the left
    rect(x, 30, 44, 34, 2, S[4]); rect(x, 30, 46, 34, 1, S[0]);
    for (const [i, h] of [[34, 10], [43, 8], [51, 11]]) { rect(x, i, 44 - h, 6, h, S[0]); rect(x, i + 1, 45 - h, 4, h - 2, S[3]); rect(x, i + 1, 45 - h, 1, h - 2, S[5]); rect(x, i + 2, 42 - h, 2, 2, S[0]); }
    // the bench: its deep top, the lit front edge, the front's planks
    rect(x, 0, 58, W, 18, S[3]); rect(x, 0, 58, W, 1, S[4]); for (const j of [63, 69]) rect(x, 0, j, W, 1, S[2]);
    rect(x, 0, 76, W, 2, S[5]); rect(x, 0, 78, W, 1, S[0]); rect(x, 0, 79, W, H - 79, S[2]);
    for (const j of [90, 100]) rect(x, 0, j, W, 1, S[1]);
    for (const i of [40, 104, 168]) rect(x, i, 79, 1, H - 79, S[1]);
    // the three trays at the back of the bench: developer, stop and fixer
    for (const i of [150, 166, 182]) { rect(x, i, 57, 15, 5, S[0]); rect(x, i + 1, 58, 13, 2, S[4]); rect(x, i + 2, 58, 6, 1, S[6]); }
    put('darkroom', c);

    // the water bath the tank stands in: its back rim and the water, then its front wall, drawn over the tank
    const [bt, btx] = canvas(86, 8);
    rect(btx, 0, 0, 86, 3, S[0]); rect(btx, 1, 1, 84, 1, S[5]); rect(btx, 1, 3, 84, 5, S[3]);
    for (let i = 4; i < 82; i += 7) rect(btx, i, 4 + (i % 3), 3, 1, S[6]);
    put('bath', bt);
    const [bf, bfx] = canvas(86, 16);
    bfx.drawImage(box(86, 16, 1, { o: S[0], fill: S[2], hi: S[4], lo: S[1] }), 0, 0);
    rect(bfx, 1, 1, 84, 1, S[6]); rect(bfx, 2, 6, 82, 1, S[1]);
    put('bath_front', bf);

    // the developing tank: a black lid with its agitation knob, the steel body, ribbed, lit down its left
    const tank = open => {
      const [t, tx] = canvas(40, 40);
      // the steel cylinder, round in bands from its lit left to its shaded right, two ribs pressed round it
      tx.drawImage(shape(24, 32, (i, j) => !(j > 29 && (i < 1 || i > 22)), (i, j) =>
        j % 11 === 5 ? S[2] : j % 11 === 6 ? S[6] : i < 2 ? S[6] : i < 4 ? S[7] : i < 12 ? S[5] : i < 19 ? S[4] : S[3]), 8, 8);
      if (open) {
        // the lid off: the mouth, dark, the film's spiral reel glinting inside
        rect(tx, 8, 6, 24, 4, S[0]); rect(tx, 10, 7, 20, 2, S[1]); for (const i of [12, 17, 22, 27]) dot(tx, i, 8, S[5]);
      } else {
        // the black lid, its knurled rim and the funnel the agitation stick goes in
        rect(tx, 6, 3, 28, 6, S[0]); rect(tx, 7, 4, 26, 1, S[3]); for (let i = 7; i < 33; i += 2) dot(tx, i, 7, S[2]);
        rect(tx, 15, 0, 10, 4, S[0]); rect(tx, 16, 1, 8, 1, S[4]); rect(tx, 18, 2, 4, 1, S[2]);
      }
      return t;
    };
    const lean = (img, dir) => {
      const [t, tx] = canvas(img.width, img.height);
      for (let j = 0; j < img.height; j++) tx.drawImage(img, 0, j, img.width, 1, Math.round(dir * (img.height - j) / 14), j, img.width, 1);
      return t;
    };
    const upright = tank(false);
    put('tank', strip([upright, lean(upright, -1), lean(upright, 1), tank(true)]), { frames: 4 });

    // the bucket of sea-water ice: dark staves, iron hoops, the ice heaped above the rim; then a cube scooped up
    const bucket = scoop => {
      const [b, bx] = canvas(26, 24);
      bx.drawImage(shape(22, 15, (i, j) => Math.abs(i - 10.5) <= 10.5 - j * 0.15, (i, j) => (i % 5 === 2 ? S[2] : i < 5 ? S[4] : S[3])), 2, 9);
      for (const j of [11, 20]) rect(bx, 3, j, 20, 1, S[0]);
      for (const [i, j] of scoop ? [[5, 6], [11, 5], [16, 6]] : [[4, 6], [9, 4], [14, 5], [18, 6]]) { rect(bx, i, j, 5, 4, S[0]); rect(bx, i + 1, j + 1, 3, 2, S[7]); dot(bx, i + 3, j + 2, S[5]); }
      if (scoop) { rect(bx, 9, 0, 5, 4, S[0]); rect(bx, 10, 1, 3, 2, S[7]); }
      return b;
    };
    put('bucket', strip([bucket(false), bucket(true)]), { frames: 2 });
    const [cube, cx2] = canvas(4, 4); rect(cx2, 0, 0, 4, 4, S[0]); rect(cx2, 1, 1, 2, 2, S[7]);
    put('cube', cube);

    // the copper kettle on its iron stand, its spout over the bath's end; level, then tipped to pour
    const kettle = tip => {
      const [k, kx] = canvas(30, 40);
      for (const [a, b] of [[8, 4], [22, 26]]) for (let t = 0; t <= 18; t++) dot(kx, Math.round(a + (b - a) * t / 18), 22 + t, S[0]);
      rect(kx, 6, 21, 20, 2, S[0]);
      const [body, bdx] = canvas(30, 22);
      bdx.drawImage(shape(20, 13, (i, j) => ((i - 9.5) / 10) ** 2 + ((j - 8) / 8) ** 2 <= 1 && j >= 0, (i, j) => (i < 5 && j < 8 ? S[6] : i > 14 || j > 10 ? S[3] : S[5])), 7, 8);
      for (let t = 0; t < 7; t++) { rect(bdx, 7 - t, 13 - t, 3, 2, S[0]); dot(bdx, 8 - t, 13 - t, S[5]); }
      for (let t = 0; t <= 10; t++) dot(bdx, 11 + t, Math.round(7 - Math.sin(t / 10 * Math.PI) * 6), S[0]);
      rect(bdx, 14, 6, 4, 2, S[0]);
      kx.drawImage(tip ? lean(body, -2) : body, 0, 0);
      return k;
    };
    put('kettle', strip([kettle(false), kettle(true)]), { frames: 2 });

    // the thermometer: the scale 16 to 26 (7 px a degree from y 8), the 20-22 band notched either side, a cross at 24
    const [th, thx] = canvas(26, 92);
    thx.drawImage(shape(8, 80, (i, j) => i >= 0 && i < 8 && !(j < 2 && (i < 2 || i > 5)), (i, j) => (i === 1 ? S[7] : i > 5 ? S[3] : S[1])), 9, 0);
    thx.drawImage(shape(12, 12, (i, j) => (i - 5.5) ** 2 + (j - 5.5) ** 2 <= 30, (i, j) => (i + j < 7 ? S[7] : S[6])), 7, 78);
    rect(thx, 12, 72, 2, 8, S[6]);
    const at = deg => 8 + (26 - deg) * 7;
    for (let d = 16; d <= 26; d++) rect(thx, 17, at(d), d % 2 ? 2 : 4, 1, S[5]);
    for (const d of [16, 20, 24]) PX.text(thx, String(d), 0, at(d) - 2, d === 24 ? S[6] : S[5]);
    for (const d of [20, 22]) { rect(thx, 21, at(d) - 2, 1, 5, S[0]); rect(thx, 22, at(d) - 1, 1, 3, S[7]); rect(thx, 23, at(d), 1, 1, S[7]); }
    rect(thx, 20, at(22), 1, at(20) - at(22), S[7]);
    for (let t = -2; t <= 2; t++) { dot(thx, 21 + t, at(24) + t, S[7]); dot(thx, 21 + t, at(24) - t, S[7]); }
    put('thermo', th);

    // the darkroom timer: its rim, the luminous marks, the agitation's part of the rim dashed bright, a wedge filling
    // clockwise from the top with its hand; the last two frames ring, the bell on top shaking
    const AGITATE = 8 / 13, D = 33, C = 16;
    const timer = (fill, ring) => {
      const [t, tx] = canvas(D, D + 4);
      for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
        const dx = i - C, dy = j - C, rr = Math.hypot(dx, dy), a = ((Math.atan2(dx, -dy) / (2 * Math.PI)) + 1) % 1;
        if (rr > 15.5) continue;
        let k = rr > 14.5 ? S[0] : rr > 12.5 ? (dx + dy < -2 ? S[6] : dx + dy > 3 ? S[3] : S[5]) : rr > 11.5 ? S[0] : a <= fill && rr > 1.5 ? S[3] : S[1];
        if (rr > 12.5 && rr <= 14.5 && a <= AGITATE && Math.floor(a * 48) % 2 === 0) k = S[7];
        dot(tx, i, j + 4, k);
      }
      for (let m = 0; m < 12; m++) { const a = m * Math.PI / 6; dot(tx, Math.round(C + Math.sin(a) * 10), Math.round(C - Math.cos(a) * 10) + 4, S[7]); }
      const a = fill * 2 * Math.PI;
      for (let s = 0; s <= 9; s += 0.5) dot(tx, Math.round(C + Math.sin(a) * s), Math.round(C - Math.cos(a) * s) + 4, S[7]);
      rect(tx, C - 1, C + 3, 3, 3, S[0]); dot(tx, C, C + 4, S[6]);
      const bx = C - 4 + ring;
      rect(tx, bx, 0, 9, 4, S[0]); rect(tx, bx + 1, 1, 7, 2, S[6]); dot(tx, bx + 2, 1, S[7]);
      if (ring) for (const [i, j] of [[1, 1], [0, 3], [31, 1], [32, 3]]) dot(tx, i, j, S[7]);
      return t;
    };
    put('devtimer', strip([...Array.from({ length: 25 }, (_, k) => timer(k / 24, 0)), timer(1, -1), timer(1, 1)]), { frames: 27 });

    // the agitation gauge on the bench front: a black slot, its band lit (notched above and below at its ends), dark
    // while the tank stands; and its needle
    const BAND = [0.4, 0.8];
    const gauge = lit => {
      const [g, gx] = canvas(80, 12);
      gx.drawImage(box(80, 8, 1, { o: S[0], fill: S[1], hi: S[3], lo: S[0] }), 0, 2);
      const a = Math.round(2 + BAND[0] * 76), b = Math.round(2 + BAND[1] * 76);
      rect(gx, a, 4, b - a, 4, lit ? S[5] : S[2]); if (lit) rect(gx, a, 5, b - a, 2, S[6]);
      for (const i of [a, b]) for (const [j, dj] of [[0, 1], [11, -1]]) { rect(gx, i - 2, j, 5, 1, S[0]); dot(gx, i - 1, j, lit ? S[7] : S[3]); dot(gx, i, j, lit ? S[7] : S[3]); dot(gx, i + 1, j, lit ? S[7] : S[3]); rect(gx, i - 1, j + dj, 3, 1, S[0]); dot(gx, i, j + dj, lit ? S[7] : S[3]); }
      return g;
    };
    put('agigauge', strip([gauge(true), gauge(false)]), { frames: 2 });
    put('agineedle', sprite(['ooooo', 'owwwo', '.owo.', '.owo.', '.owo.', '.owo.', '.owo.', '..o..'], { o: S[0], w: S[7] }));

    // Daniel's reel: four frames on the 8mm strip, perforated along its top edge. Each is drawn at twice the size from
    // the cast's own sprites and halved, then washed to the film's greys: murky still in the developer, clear once lifted.
    const GREYS = ['#f4efe0', '#cfc9b8', '#9d978a', '#6b665e', '#3c3934', '#1f1d1b'];
    const FW = 40, FH = 28, SHOTS = 3;
    // A frame: the river under a bright sky, the posts of the new bridge, and the people as dark figures against the
    // light (each the cast's sprite, halved: a frame pixel is figure wherever any of its four is), lit along the top.
    const shot = (n, clear) => {
      const [big, g] = canvas(FW * 2, FH * 2), [s, sx2] = canvas(FW, FH), G = k => GREYS[clear ? k : Math.min(5, 4 + (k > 2))];
      const hand = (id, pose, at, dir) => { const [dx, dy] = CH.hand(id, pose, 0); return [(at + dx * dir) / 2, (52 + dy) / 2]; };
      const people = [
        [['daniel', 'carry', 30, 1], ['porter', 'carry', 58, 1]],
        [['daniel', 'lift', 22, 1], ['farmhand', 'lift', 62, -1]],
        [['fisher', 'talk', 18, 1], ['daniel', 'talk', 40, 1], ['salter', 'talk', 62, -1]],
      ][n];
      for (const [id, pose, at, dir] of people) CH.draw(g, id, pose, 0, at, 52, dir, { shadow: false });
      rect(sx2, 0, 0, FW, FH, G(0)); rect(sx2, 0, 9, FW, 4, G(2)); for (let i = 0; i < FW; i += 5) rect(sx2, i, 7 + (i % 3), 4, 2, G(2));
      rect(sx2, 0, 13, FW, 5, G(1)); for (const i of [4, 17, 29]) rect(sx2, i, 15, 4, 1, G(0));
      rect(sx2, 0, 18, FW, FH - 18, G(2)); rect(sx2, 0, 18, FW, 1, G(3));
      for (const i of [5, 33]) rect(sx2, i, 5, 2, 15, G(4));   // the bridge's posts
      const beam = (x0, x1, y) => { rect(sx2, x0, y, x1 - x0, 2, G(4)); rect(sx2, x0, y + 2, x1 - x0, 1, G(5)); };
      if (n === 0) { const [a, ay] = hand('daniel', 'carry', 30, 1), [b] = hand('porter', 'carry', 58, 1); beam(a - 5, b + 5, ay - 1); }
      if (n === 1) beam(2, 38, 5);
      if (n === 2) { beam(2, 38, 5); beam(2, 38, 9); }
      const d = g.getImageData(0, 0, FW * 2, FH * 2).data, on = (i, j) => i >= 0 && j >= 0 && i < FW && j < FH &&
        [0, 1, 2, 3].some(q => d[((2 * j + (q >> 1)) * FW * 2 + 2 * i + (q & 1)) * 4 + 3] > 0);
      for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) if (on(i, j)) dot(sx2, i, j, on(i, j - 1) ? G(5) : G(3));
      if (!clear) for (let k = 0; k < 18; k++) dot(sx2, (k * 17 + n * 7) % FW, (k * 11 + n * 5) % FH, G(3));   // the fog still on it
      return s;
    };
    const film = clear => {
      const w = SHOTS * (FW + 2) + 2, h = FH + 9, [f, fx] = canvas(w, h);
      rect(fx, 0, 0, w, h, '#161312'); rect(fx, 0, 0, w, 1, '#2e2a27'); rect(fx, 0, h - 1, w, 1, '#0a0908');
      for (let i = 3; i < w - 3; i += 8) rect(fx, i, 2, 4, 3, clear ? '#cfc9b8' : '#3c3934');
      for (let n = 0; n < SHOTS; n++) fx.drawImage(shot(n, clear), 2 + n * (FW + 2), 7);
      return f;
    };
    put('film', strip([film(false), film(true)]), { frames: 2 });
  }

  /* Minigame 4A, the village hall's flooded basement and Vault No. 7: the cellar's stone wall under its beam, warm
     round the castor-oil lantern on its bracket, the stones below the waterline dark with the damp, the depth staff
     and the stone gutter out to the drain (the flood is laid over it in the game, its top rippling in four steps);
     the copper hand pump of 1952 with its lever up, halfway and down; then the round steel door of the vault, shut,
     swinging and open on the iron archive box; the lock's four tumbler pins, rising in five steps to the brass line
     and then caught and glowing; and the black iron key's acorn bow in eight steps of a turn. */
  function vault(put) {
    const W = 200, H = 74, FLOOR = 66, DAMP = 40, LAMP = [132, 12];
    // the cellar: stone blocks in offset courses under a timber beam, flagstones underfoot
    const cellar = bare => {
      const [c, x] = canvas(W, H);
      rect(x, 0, 0, W, FLOOR, 'stone4');
      for (let r = 0; r * 9 + 6 < FLOOR; r++) for (let i = (r % 2) * -9; i < W; i += 18) {
        const y = 6 + r * 9, cx = i + 8, cy = y + 4, warm = Math.hypot(cx - LAMP[0], cy - LAMP[1]) < 26, damp = y >= DAMP;
        const [fill, hi, lo] = damp ? ['stone3', 'stone2', 'stone4'] : warm ? ['wall2', 'wall1', 'wall3'] : (i * 3 + r) % 7 === 0 ? ['stone1', 'stone0', 'stone2'] : ['stone2', 'stone1', 'stone3'];
        rect(x, i, y, 17, 8, fill); rect(x, i, y, 17, 1, hi); rect(x, i, y, 1, 8, hi); rect(x, i, y + 7, 17, 1, lo);
        if ((i * 5 + r * 3) % 11 === 0) { line(x, i + 4, y + 2, i + 7, y + 5, lo); dot(x, i + 8, y + 5, lo); }   // a crack
      }
      rect(x, 0, DAMP - 1, W, 1, 'stone3');   // the old tide mark
      rect(x, 0, 0, W, 6, 'wood4'); rect(x, 0, 0, W, 1, 'wood3'); rect(x, 0, 5, W, 1, 'wood5');   // the beam
      for (let i = 10; i < W; i += 46) { rect(x, i, 2, 2, 2, 'iron2'); dot(x, i, 2, 'iron1'); }
      rect(x, 0, FLOOR, W, H - FLOOR, 'stone3');
      for (let i = 0; i < W; i += 23) rect(x, i, FLOOR, 1, H - FLOOR, 'stone4');
      rect(x, 0, FLOOR, W, 1, 'stone4'); rect(x, 0, FLOOR + 1, W, 1, 'stone2');
      // the lantern on its wall bracket, and its warm glow
      rect(x, LAMP[0] - 8, LAMP[1] - 1, 9, 2, 'ink'); rect(x, LAMP[0] - 8, LAMP[1] - 1, 8, 1, 'iron2');
      x.drawImage(sprite([
        '..ooo..',
        '.obbbo.',
        'obllllo',
        'olwwllo',
        'olwwllo',
        'obllllo',
        '.obbbo.',
        '..ooo..',
      ], { o: 'ink', b: 'brass2', l: 'light2', w: 'light0' }), LAMP[0] - 3, LAMP[1]);
      if (bare) return c;
      // the drain's arch in the right wall, an iron grate across it
      const [ax, ay, aw] = [178, 24, 18];
      for (let j = ay - 3; j < 46; j++) for (let i = ax - 1; i <= ax + aw; i++) {
        const top = j < ay + 6 ? Math.hypot(i - (ax + aw / 2 - 0.5), j - (ay + 6)) : 0;
        if (top > aw / 2 + 1) continue;
        dot(x, i, j, top > aw / 2 || i < ax || i >= ax + aw ? 'ink' : j < ay + 2 ? 'ink2' : 'iron4');
      }
      for (let i = ax + 3; i < ax + aw - 1; i += 4) { rect(x, i, ay - 1, 1, 22, 'iron2'); dot(x, i, ay, 'iron1'); }
      // the stone gutter along the wall from the pump's spout into the drain
      rect(x, 44, 33, ax - 44, 1, 'stone0'); rect(x, 44, 34, ax - 44, 4, 'stone1'); rect(x, 44, 37, ax - 44, 1, 'stone3'); rect(x, 44, 38, ax - 44, 1, 'ink');
      rect(x, 43, 33, 1, 6, 'ink');
      // the depth staff: a board with a brass mark every 6 px
      rect(x, 100, 24, 7, FLOOR - 24, 'ink'); rect(x, 101, 25, 5, FLOOR - 26, 'wood2'); rect(x, 101, 25, 1, FLOOR - 26, 'wood1');
      for (let j = 28; j < FLOOR - 2; j += 6) { rect(x, 102, j, 4, 1, 'brass2'); if ((j - 28) % 12 === 0) rect(x, 102, j, 4, 1, 'brass1'); }
      return c;
    };
    put('cellar', cellar());

    // the flood's top, its glints drifting along in four steps
    put('flood', strip([0, 1, 2, 3].map(f => {
      const [c, x] = canvas(W, 4);
      rect(x, 0, 0, W, 4, 'water3'); rect(x, 0, 1, W, 1, 'water2');
      for (let i = 0; i < W; i++) if ((i + f * 3) % 16 < 5) dot(x, i, 0, (i + f * 3) % 16 < 2 ? 'water0' : 'water1');
      return c;
    })), { frames: 4 });

    // the copper pump: a riveted barrel on an iron foot, a spout to the gutter, a rubber valve and the iron lever
    const PIVOT = [21, 10];
    put('pump', strip([-0.6, 0, 0.6].map(a => {
      const [c, x] = canvas(56, 62);
      const copper = i => (i < 4 ? 'roofR1' : i < 6 ? 'roofR0' : i < 14 ? 'roofR1' : i < 18 ? 'roofR2' : 'roofR3');
      x.drawImage(shape(28, 46, (i, j) => i >= 3 && i < 21 && j >= 4 && j < 44, (i, j) => copper(i)), 9, 12);   // the barrel
      for (const j of [22, 44]) { rect(x, 13, j, 17, 2, 'brass2'); for (let i = 14; i < 30; i += 4) dot(x, i, j, 'brass0'); }
      x.drawImage(shape(26, 8, (i, j) => i >= 1 && i < 25 && j >= 2, (i, j) => (j < 4 ? 'iron1' : 'iron2')), 8, 54);   // the foot
      x.drawImage(shape(24, 6, (i, j) => Math.abs(i - 11.5) <= 9 + j * 0.4, (i, j) => (j < 2 ? 'iron1' : 'iron2')), 10, 10);   // the cap
      x.drawImage(shape(26, 12, (i, j) => (j >= 1 && j < 6 && i < 24) || (i >= 18 && i < 24 && j < 11), (i, j) => (j < 2 || i === 18 ? 'orange' : i > 21 || j > 4 ? 'roofR2' : 'roofR1')), 28, 18);   // the spout
      rect(x, 45, 28, 7, 1, 'ink'); rect(x, 46, 28, 5, 1, 'roofR3');
      x.drawImage(shape(7, 8, (i, j) => j > 0 && j < 7 && i < 6, (i, j) => (j === 1 ? 'iron1' : i < 2 ? 'stone5' : 'ink2')), 6, 26);   // the valve
      rect(x, 18, 4, 7, 9, 'ink'); rect(x, 19, 5, 5, 7, 'iron2'); rect(x, 19, 5, 1, 7, 'iron1');   // the pivot post
      // the lever: iron, turned about the pivot, its wooden grip at the end; the piston's link opposite it
      const L = 21, ux = -Math.cos(a), uy = Math.sin(a), at = t => [Math.round(PIVOT[0] + ux * t), Math.round(PIVOT[1] + uy * t)];
      for (let t = -4; t <= L; t += 0.25) {
        const [i, j] = at(t), thick = t > L - 7 ? 3 : 2;
        for (let k = -1; k <= thick; k++) { dot(x, i - 1, j + k, 'ink'); dot(x, i + 1, j + k, 'ink'); }
      }
      for (let t = -4; t <= L - 0.5; t += 0.25) {
        const [i, j] = at(t), grip = t > L - 7;
        dot(x, i, j, grip ? 'wood1' : 'iron1'); dot(x, i, j + 1, grip ? 'wood2' : 'iron2'); if (grip) dot(x, i, j + 2, 'wood3');
      }
      rect(x, PIVOT[0] - 1, PIVOT[1] - 1, 3, 3, 'ink'); dot(x, PIVOT[0], PIVOT[1], 'brass1');
      return c;
    })), { frames: 3 });

    // the round steel door in its frame, shut (0), swung halfway (1) and open (2) on the archive box inside
    const C = [100, 38], R = 33;
    put('vault', strip([1, 0.45, 0.1].map((open, f) => {
      const [c, x] = canvas(W, H);
      x.drawImage(cellar(true), 0, 0);   // the next wall along, with no gutter or staff
      // the frame: a square of riveted iron round the door
      x.drawImage(box(R * 2 + 16, H - 6, 2, { o: 'ink', fill: 'iron3', hi: 'iron2', lo: 'iron4' }), C[0] - R - 8, 6);
      for (const [i, j] of [[-R - 4, 4], [R + 3, 4], [-R - 4, H - 10], [R + 3, H - 10]]) { rect(x, C[0] + i, j + 2, 2, 2, 'brass2'); dot(x, C[0] + i, j + 2, 'brass0'); }
      // the doorway: the vault's dark inside, and once open the shelf with the iron archive box under the lamp's glow
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const d = Math.hypot(i - C[0], j - C[1]);
        if (d <= R + 1) dot(x, i, j, d > R ? 'ink' : j > C[1] + 18 ? 'stone5' : 'ink2');
      }
      if (f > 0) {
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
          const d = Math.hypot(i - C[0] - 6, j - C[1] - 4);
          if (Math.hypot(i - C[0], j - C[1]) < R && d < 22) dot(x, i, j, d < 14 ? 'wood4' : 'wood5');
        }
        rect(x, C[0] - 22, C[1] + 12, 50, 3, 'wood2'); rect(x, C[0] - 22, C[1] + 12, 50, 1, 'wood1'); rect(x, C[0] - 22, C[1] + 15, 50, 1, 'ink');   // the shelf
        x.drawImage(box(30, 18, 1, { o: 'ink', fill: 'iron3', hi: 'iron2', lo: 'iron4' }), C[0] - 9, C[1] - 6);   // the archive box
        for (const [i, j] of [[1, 1], [25, 1], [1, 13], [25, 13]]) rect(x, C[0] - 9 + i, C[1] - 6 + j, 4, 4, 'brass2');
        rect(x, C[0] + 2, C[1] - 1, 8, 4, 'ink'); rect(x, C[0] + 3, C[1], 6, 2, 'brass1');   // its clasp
        PX.text(x, 'IV', C[0] - 4, C[1] + 4, 'brass1');
        for (const [i, j] of [[-16, -12], [20, -14], [-12, 8]]) rect(x, C[0] + i, C[1] + j, 1, 1, 'light1');   // dust in the light
      }
      // the door: its face turned about the hinge on the left, narrowing as it swings, its thick steel edge showing
      const hinge = C[0] - R, mid = hinge + R * open, rx = R * open, edge = Math.round(9 * (1 - open));
      const onFace = (i, j) => ((i - mid) / Math.max(rx, 0.5)) ** 2 + ((j - C[1]) / R) ** 2 <= 1;
      if (edge) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++)
        if (!onFace(i, j) && Array.from({ length: edge }, (_, e) => onFace(i - e - 1, j)).some(Boolean)) dot(x, i, j, j < C[1] ? 'iron2' : 'iron3');
      x.drawImage(shape(W, H, (i, j) => onFace(i, j), (i, j) => {
        const u = (i - mid) / Math.max(rx, 0.5), v = (j - C[1]) / R, d = Math.hypot(u, v);
        if (Math.abs(d - 0.8) < 0.035) return 'iron3';   // the groove round the face
        const lit = u * 0.6 + v;
        return d > 0.92 ? (lit < -0.3 ? 'iron1' : 'iron3') : lit < -0.55 ? 'iron0' : lit > 0.6 ? 'iron2' : 'iron1';
      }), 0, 0);
      // rivets round the face, and the plate with its number
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6, i = Math.round(mid + Math.sin(a) * rx * 0.88), j = Math.round(C[1] - Math.cos(a) * R * 0.88);
        dot(x, i, j, 'brass2'); if (open > 0.5) dot(x, i - 1, j - 1, 'brass0');
      }
      if (open > 0.5) {
        x.drawImage(box(19, 9, 1, { o: 'ink', fill: 'brass1', hi: 'brass0', lo: 'brass2' }), C[0] - 9, 3);
        PX.text(x, 'NO7', C[0] - 6, 5, 'brass4');
        // the lock plate: four tumbler windows over the keyhole's ring of brass
        x.drawImage(box(46, 52, 2, { o: 'ink', fill: 'brass1', hi: 'brass0', lo: 'brass2' }), C[0] - 23, 13);
        for (let k = 0; k < 4; k++) {
          const wx = C[0] - 19 + k * 10;
          rect(x, wx, 16, 9, 18, 'ink');
          rect(x, wx - 2, 21, 2, 1, 'brass3'); rect(x, wx + 9, 21, 2, 1, 'brass3');   // the brass line the pin must reach
          rect(x, wx - 2, 20, 2, 1, 'ink'); rect(x, wx + 9, 20, 2, 1, 'ink');
        }
        // the keyhole's iron ring round a brass face, notched at each eighth of a turn
        for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) {
          const d = Math.hypot(i, j);
          if (d <= 12.4) dot(x, C[0] + i, 52 + j, d > 11.4 ? 'ink' : d > 9.6 ? (i + j < 0 ? 'iron1' : 'iron3') : d > 8.8 ? 'ink' : i + j < -6 ? 'brass0' : 'brass2');
        }
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; dot(x, Math.round(C[0] + Math.sin(a) * 10.5), Math.round(52 - Math.cos(a) * 10.5), k ? 'ink' : 'brass0'); }
      } else {
        // swung round: the plate seen at a slant
        x.drawImage(box(Math.max(4, Math.round(46 * open)), 52, 1, { o: 'ink', fill: 'brass3', hi: 'brass2', lo: 'brass4' }), Math.round(mid - 23 * open), 13);
      }
      // the great hinges on the left
      for (const j of [16, 54]) { rect(x, hinge - 6, j, 10, 7, 'ink'); rect(x, hinge - 5, j + 1, 8, 5, 'iron3'); rect(x, hinge - 5, j + 1, 8, 1, 'iron2'); }
      return c;
    })), { frames: 3 });

    // a tumbler pin in its window: the spring above, the brass pin below rising to the line (4), then caught (5)
    put('tumbler', strip([0, 1, 2, 3, 4, 5].map(h => {
      const [c, x] = canvas(7, 16), top = 12 - 2 * Math.min(h, 4), set = h === 5;
      rect(x, 0, 0, 7, 16, 'ink2');
      for (let j = 0; j < top - 1; j++) dot(x, [1, 2, 3, 4, 5, 4, 3, 2][(j + (set ? 0 : h)) % 8], j, set ? 'iron0' : 'iron1');
      rect(x, 1, top, 5, 16 - top, set ? 'light1' : 'brass1');
      rect(x, 1, top, 1, 16 - top, set ? 'light0' : 'brass0'); rect(x, 5, top, 1, 16 - top, set ? 'light2' : 'brass2');
      rect(x, 1, top + 3, 5, 1, set ? 'light3' : 'brass3');
      rect(x, 1, top, 5, 1, set ? 'white' : 'brass0');
      return c;
    })), { frames: 6 });

    // the black iron key round the keyhole, in eight steps of a turn: its collar, a shoulder, the looped bow with an
    // acorn knob at its end, and a silver glint on the loop
    put('vault_key', strip(Array.from({ length: 8 }, (_, f) => {
      const a = f * Math.PI / 4, s = Math.sin(a), k = Math.cos(a), M = 16;
      const local = (i, j) => { const dx = i - M, dy = j - M; return [dx * s - dy * k, dx * k + dy * s]; };   // along the bow, across it
      const loop = (u, v) => ((u - 9.6) / 4.8) ** 2 + (v / 5.8) ** 2;
      const inside = (i, j) => {
        const [u, v] = local(i, j);
        if (Math.hypot(i - M, j - M) <= 3.2) return true;   // the collar on the shaft
        if (u > 1 && u < 6 && Math.abs(v) <= 1.7) return true;   // the neck
        if (u >= 3.4 && u <= 4.6 && Math.abs(v) <= 3.2) return true;   // the shoulder
        if (loop(u, v) <= 1 && loop(u, v) > 0.14) return true;   // the bow's loop
        return Math.hypot(u - 14.6, v) <= 1.6;   // the acorn knob
      };
      return shape(33, 33, inside, (i, j) => {
        const [u, v] = local(i, j), lit = (i - M) + (j - M);
        if (Math.hypot(i - M, j - M) <= 1.2) return 'iron2';
        if (loop(u, v) <= 1 && Math.abs(u - 8) < 1.2 && v < -2.5) return 'iron0';   // the glint
        return lit < -4 ? 'iron2' : lit > 5 ? 'iron4' : 'iron3';
      });
    })), { frames: 8 });
  }

  /* Minigame 4B, Sam's table in the vault room: the felt cloth tray, the soaked blueprint of the emergency bridge (its
     elevation over the old land map, the colony's boundary dashed in red across it and three holes torn along that line)
     drying in four steps under the blotting paper; the blotting sheet fresh and pressed; the roller that smooths it;
     the three map fragments that fill the holes, whole and torn; the brass tweezers from open to pinching; the
     bamboo fan swaying in four steps; and the ink running where the wind was too strong. */
  function restoring(put) {
    const BW = 128, BH = 58, SLOTS = [[8, 30], [40, 30], [72, 30]], FW = 24, FH = 20, LINE = 40;
    const [ft, fx] = canvas(18, 18);
    fx.drawImage(box(18, 18, 1, { o: 'ink', fill: 'wood3', hi: 'wood2', lo: 'wood4' }), 0, 0);
    fx.drawImage(box(14, 14, 0, { o: 'wood5', fill: 'roofR3', hi: 'roofR4', lo: 'roofR2' }), 2, 2);   // the felt, sunk in its rim
    put('felt_tray', ft, { margins: [4, 4, 4, 4] });

    // where each fragment is, inside its slot's frame: a torn, ragged shape
    const torn = k => (i, j) => {
      const r = (n) => ((n * 7 + k * 5) % 5 === 0 ? 1 : 0) + ((n * 3 + k) % 4 === 0 ? 1 : 0);
      return i >= 1 + r(j) && i <= FW - 2 - r(j + 9) && j >= 1 + r(i + 3) && j <= FH - 2 - r(i + 11);
    };
    const inHole = (i, j) => SLOTS.some(([sx, sy], k) => torn(k)(i - sx, j - sy));
    // the blueprint's drawing, wet (0) to dry (3)
    const paper = wet => {
      const [c, x] = canvas(BW, BH);
      const base = ['water6', 'water5', 'water5', 'water4'][wet], blot = ['water5', 'water6', 'water4', null][wet];
      const ink = ['water3', 'water2', 'water1', 'cream0'][wet], faint = ['water5', 'water4', 'water3', 'water3'][wet];
      rect(x, 0, 0, BW, BH, base);
      for (let j = 4; j < BH; j += 8) for (let i = 4; i < BW; i += 2) dot(x, i, j, faint);   // the grid
      if (blot) for (const [i, j, rx, ry] of [[22, 14, 12, 6], [86, 24, 16, 8], [50, 46, 14, 6], [110, 46, 10, 7], [60, 8, 8, 4]].slice(0, 5 - wet * 2))
        PX.ellipse(x, i, j, rx, ry, blot);
      if (wet < 2) for (const [i, j] of [[18, 11], [84, 21], [47, 44], [108, 43]]) { rect(x, i, j, 3, 1, 'water1'); dot(x, i + 4, j, 'water2'); }   // the sheen of the wet
      const thick = (x0, y0, x1, y1) => { line(x, x0, y0, x1, y1, ink); if (wet < 2) line(x, x0, y0 + 1, x1, y1 + 1, ink); };
      // the bridge: its deck, the arch under it with hangers, and its piers
      thick(6, 14, 122, 14);
      for (let i = 14; i <= 114; i++) {
        const j = Math.round(28 - 12 * (1 - ((i - 64) / 50) ** 2));
        dot(x, i, j, ink); if (wet < 2) dot(x, i, j + 1, ink);
        if ((i - 14) % 10 === 0 && i > 14 && i < 114) line(x, i, 15, i, j - 1, ink);
      }
      for (const i of [10, 112]) { rect(x, i, 15, 6, 13, faint); line(x, i, 15, i, 27, ink); line(x, i + 5, 15, i + 5, 27, ink); line(x, i, 27, i + 5, 27, ink); }
      // the measure over it, arrowheads at each end
      line(x, 6, 7, 122, 7, ink); for (const i of [6, 122]) line(x, i, 5, i, 9, ink);
      dot(x, 7, 6, ink); dot(x, 7, 8, ink); dot(x, 121, 6, ink); dot(x, 121, 8, ink);
      // the old land map below: contour lines and the colony's boundary dashed in red
      for (let i = 2; i < 98; i++) { dot(x, i, Math.round(34 + Math.sin(i / 7) * 1.5), faint === 'water3' ? 'water2' : faint); dot(x, i, Math.round(49 + Math.sin(i / 9 + 1) * 1.5), faint === 'water3' ? 'water2' : faint); }
      for (let i = 2; i < 98; i++) if (i % 6 < 4) dot(x, i, LINE, wet ? 'roofR3' : 'red'); else if (i % 6 === 5) dot(x, i, LINE, wet ? 'roofR3' : 'rose');
      for (let i = 6; i < 98; i += 12) { dot(x, i, LINE - 1, wet ? 'roofR3' : 'red'); dot(x, i, LINE + 1, wet ? 'roofR3' : 'red'); }   // the boundary's crosses
      // the title block in the corner, and a north arrow
      rect(x, 102, 38, 22, 16, faint); line(x, 102, 38, 123, 38, ink); line(x, 102, 53, 123, 53, ink); line(x, 102, 38, 102, 53, ink); line(x, 123, 38, 123, 53, ink); line(x, 102, 44, 123, 44, ink);
      PX.text(x, '1952', 105, 46, ink);
      for (const [i, j] of [[106, 40], [110, 40], [114, 41], [118, 40]]) dot(x, i, j, ink);
      line(x, 118, 22, 118, 30, ink); line(x, 116, 24, 118, 22, ink); line(x, 120, 24, 118, 22, ink);
      return c;
    };
    // the paper with its holes torn out, the torn edge outlined
    const holed = src => {
      const [c, x] = canvas(BW, BH);
      x.drawImage(src, 0, 0);
      for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
        if (inHole(i, j)) x.clearRect(i, j, 1, 1);
        else if (inHole(i - 1, j) || inHole(i + 1, j) || inHole(i, j - 1) || inHole(i, j + 1)) dot(x, i, j, 'ink');
        else if (i === 0 || j === 0 || i === BW - 1 || j === BH - 1) dot(x, i, j, 'ink');
      }
      x.clearRect(BW - 1, 0, 1, 1); x.clearRect(0, BH - 1, 1, 1);
      return c;
    };
    put('blueprint', strip([0, 1, 2, 3].map(w => holed(paper(w)))), { frames: 4 });

    // the fragments: the dry paper inside each hole's shape, its torn edge showing white fibres; and torn in two
    const dry = paper(3);
    put('fragment', strip(SLOTS.flatMap(([sx, sy], k) => [false, true].map(split => {
      const [c, x] = canvas(FW, FH), on = torn(k);
      const crack = (i, j) => Math.abs(i - (9 + j * 0.4 + (j % 3 === 0 ? 1 : 0))) < 0.8;
      for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
        const si = split && i > 9 + j * 0.4 ? i - 1 : i, sj = split && i > 9 + j * 0.4 ? j + 1 : j;   // the right half sags off
        if (!on(si, sj)) continue;
        if (split && crack(si, sj)) { dot(x, i, j, 'cream1'); continue; }
        const edge = !(on(si - 1, sj) && on(si + 1, sj) && on(si, sj - 1) && on(si, sj + 1));
        x.drawImage(dry, sx + si, sy + sj, 1, 1, i, j, 1, 1);
        if (edge) dot(x, i, j, (si + sj) % 3 ? 'cream1' : 'cream0');
      }
      return c;
    }))), { frames: 6 });

    // the blotting sheet: fresh and a little puckered (0), pressed flat with the wet soaked into it (1)
    put('sheet', strip([0, 1].map(pressed => {
      const [c, x] = canvas(BW, BH);
      x.drawImage(box(BW, BH, 1, { o: 'ink', fill: pressed ? 'cream1' : 'cream0', hi: 'white', lo: 'cream2' }), 0, 0);
      if (!pressed) for (const [x0, y0, x1, y1] of [[14, 8, 30, 20], [70, 34, 92, 46], [100, 10, 112, 22], [36, 40, 46, 52], [56, 6, 50, 18], [116, 36, 108, 50]]) { line(x, x0, y0, x1, y1, 'stone2'); line(x, x0 + 1, y0, x1 + 1, y1, 'white'); line(x, x0 - 1, y0, x1 - 1, y1, 'cream2'); }
      else for (const [i, j, rx, ry] of [[22, 14, 11, 5], [86, 24, 15, 7], [50, 46, 13, 5], [110, 46, 9, 6], [60, 8, 7, 3]]) { PX.ellipse(x, i, j, rx, ry, 'sky2'); PX.ellipse(x, i - 1, j, rx - 4, ry - 2, 'sky3'); }
      return c;
    })), { frames: 2 });

    // the roller, its wooden drum between two brass-capped handles, its seams turning in three steps
    put('roller', strip([0, 1, 2].map(f => {
      const [c, x] = canvas(12, 66);
      for (const j of [0, 59]) { x.drawImage(box(8, 7, 1, { o: 'ink', fill: 'wood2', hi: 'wood1', lo: 'wood3' }), 2, j); dot(x, 5, j + 3, 'brass1'); }
      x.drawImage(box(12, 54, 1, { o: 'ink', fill: 'wood1', hi: 'wood0', lo: 'wood2' }), 0, 6);
      rect(x, 8, 7, 3, 52, 'wood3');
      for (let j = 8 + f * 2; j < 58; j += 6) rect(x, 1, j, 10, 1, 'wood2');
      return c;
    })), { frames: 3 });

    // the brass tweezers pointing down, from open (0) to pinching hard (3), blunt at the tips
    put('tweezers', strip([5, 3.5, 2, 1].map(spread => {
      const [c, x] = canvas(13, 32), arms = [];
      for (const side of [-1, 1]) for (let j = 2; j <= 29; j++) {
        const t = (j - 2) / 27, i = Math.round(6 + side * (1 + (spread - 1) * Math.sin(t * Math.PI * 0.55) + 0.8 * Math.sin(t * Math.PI)));
        arms.push([i, j, side]);
      }
      for (const [i, j] of arms) for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) dot(x, i + di, j + dj, 'ink');
      for (const [i, j, side] of arms) dot(x, i, j, j > 26 ? 'iron0' : side < 0 ? 'brass1' : 'brass2');
      rect(x, 4, 0, 5, 4, 'ink'); rect(x, 5, 1, 3, 2, 'brass0');   // the joint
      return c;
    })), { frames: 4 });

    // the bamboo fan: a round paper face on bamboo ribs and a bamboo handle, swaying about the handle's end
    const FAN = [30, 40];
    const fanAt = (i, j) => {
      const d = Math.hypot(i - 15, j - 13);
      if (d <= 12.5) return d > 11.5 ? 'ink' : d > 10.5 ? 'dirt3' : (Math.round(Math.atan2(i - 15, 26 - j) * 9) % 2 === 0 && d > 3 ? 'dirt1' : 'cream0');
      if (Math.abs(i - 15) <= 1.5 && j > 24 && j < 39) return Math.abs(i - 15) > 0.5 ? 'ink' : j % 5 === 0 ? 'dirt4' : 'dirt2';
      return null;
    };
    put('fan', strip([-2, -1, 1, 2].map(tilt => {
      const [c, x] = canvas(...FAN);
      for (let j = 0; j < FAN[1]; j++) for (let i = 0; i < FAN[0]; i++) {
        const k = fanAt(Math.round(i - (39 - j) * tilt * 0.1), j);
        if (k) dot(x, i, j, k);
      }
      // a sprig of plum blossom painted on its face
      for (const [i, j, k] of [[11, 10, 'pink'], [15, 8, 'rose'], [19, 12, 'pink'], [14, 15, 'pink']]) { const s = Math.round(i + (39 - j) * tilt * 0.1); rect(x, s, j, 2, 2, k); }
      return c;
    })), { frames: 4 });

    // ink run in the wet: streaks dripping down from the lines, a drop at the foot of each
    const [ir, irx] = canvas(BW, BH);
    for (const [i, j, n] of [[18, 15, 9], [33, 15, 6], [52, 18, 12], [70, 15, 8], [88, 21, 10], [104, 15, 7], [26, 41, 8], [60, 41, 6], [90, 41, 9]]) {
      rect(irx, i, j, 1, n, 'water2'); rect(irx, i + 1, j, 1, n - 3, 'water1');
      rect(irx, i - 1, j + n, 3, 2, 'water2'); dot(irx, i - 1, j + n, 'water0');
    }
    put('ink_run', ir);
  }

  /* Minigame 6A, Father's valve radio on his workbench: the walnut cathedral cabinet, its fretwork over the gold speaker
     cloth, the lit dial glass from 700 to 760 kHz with the old station's 740 in red and the volume knob; the red dial
     needle; the copper tuning knob in eight steps of a turn; the brass-bezelled glass the wave shows on, brass notches
     either side marking its crest; and Daniel's post-office savings book, which slides out from behind the radio. */
  function tuning(put) {
    const COPPER = ['#ffd2a8', '#f4a46a', '#d27a44', '#9c5230'];
    const knob = turn => shape(15, 15, (i, j) => (i - 7) ** 2 + (j - 7) ** 2 <= 50, (i, j) => {
      const dx = i - 7, dy = j - 7, d = Math.hypot(dx, dy), a = Math.atan2(dx, -dy) - turn;
      if (d > 5.2) return Math.cos(a * 8) > 0 ? COPPER[dx + dy < 0 ? 1 : 2] : COPPER[3];   // the knurled rim
      if (d > 1.2 && Math.cos(a) > 0 && Math.abs(Math.sin(a)) * d < 0.8) return 'cream0';    // the pointer
      return dx + dy < -3 ? COPPER[0] : dx + dy > 3 ? COPPER[2] : COPPER[1];
    });
    put('radio_knob', strip(Array.from({ length: 8 }, (_, f) => knob(f * Math.PI / 4))), { frames: 8 });

    // the cabinet, a round-topped arch over a box; cab(i, j, k) is its shape stepped in by k px
    const W = 100, H = 100;
    const cab = (i, j, k) => {
      const dx = i - 49.5, rx = 50 - k;
      if (Math.abs(dx) > rx || j < k || j > H - 1 - k) return false;
      return j >= 30 || (dx / rx) ** 2 + ((j - 30) / (30 - k)) ** 2 <= 1;
    };
    const BARS = [-18, -6, 6, 18];
    const cabinet = shape(W, H, (i, j) => cab(i, j, 0), (i, j) => {
      const dx = i - 49.5, lit = dx / 50 + (j - 50) / 50;
      if (!cab(i, j, 3)) return lit < -0.25 ? 'wood2' : lit > 0.55 ? 'wood4' : 'wood3';   // the rounded rim, lit from the top left
      if (!cab(i, j, 4)) return lit < 0 ? 'wood4' : 'wood2';                               // the bevel stepping in to the face
      if (!cab(i, j, 10) || j > 53) return 'wood3';
      if (!cab(i, j, 11) || j === 53) return 'wood5';                                      // the grille's dark edge
      const bar = BARS.map(b => dx - b).find(d => d >= -1.5 && d < 1.5);
      if (bar !== undefined) return bar < -1 ? 'wood2' : bar > 0 ? 'wood4' : 'wood3';     // the fretwork
      if (cab(i, j, 20) && !cab(i, j, 23)) return j < 30 && dx < 0 ? 'wood2' : 'wood3';   // its pointed arch
      return BARS.some(b => dx - b > 1 && dx - b < 2.5) || (cab(i, j, 23) && !cab(i, j, 24)) ? 'dirt3' : 'dirt2';   // the cloth, shaded under the frets
    });
    const x = cabinet.getContext('2d');
    // the brass name plate under the grille
    rect(x, 42, 55, 16, 4, 'ink'); rect(x, 43, 55, 14, 3, 'brass1'); rect(x, 43, 55, 14, 1, 'brass0'); rect(x, 43, 57, 14, 1, 'brass2');
    // the dial: a brass bezel round the lit glass, its scale every 5 kHz, numbered every 20, the station in red
    rect(x, 10, 59, 80, 19, 'ink'); rect(x, 11, 60, 78, 17, 'brass2'); rect(x, 11, 60, 78, 1, 'brass0'); rect(x, 11, 60, 1, 17, 'brass1');
    rect(x, 11, 76, 78, 1, 'brass3'); rect(x, 88, 60, 1, 17, 'brass3');
    rect(x, 13, 62, 74, 13, 'ink'); rect(x, 14, 63, 72, 11, 'light1'); rect(x, 14, 63, 72, 1, 'light0'); rect(x, 14, 73, 72, 1, 'light2');
    for (let f = 700; f <= 760; f += 5) {
      const gx = 14 + Math.round((f - 700) * 71 / 60), major = f % 20 === 0;
      rect(x, gx, major ? 69 : 71, 1, major ? 4 : 2, f === 740 ? 'roofR3' : major ? 'ink' : 'wood4');
      if (!major) continue;
      const s = String(f), w = PX.textWidth(s);
      PX.text(x, s, Math.min(85 - w, Math.max(15, gx - (w >> 1))), 63, f === 740 ? 'roofR3' : 'wood5');
    }
    // the knobs' sockets, the volume knob in the left one; the tuning knob turns in the right one
    for (const i of [19, 64]) x.drawImage(shape(17, 17, (a, b) => (a - 8) ** 2 + (b - 8) ** 2 <= 70, () => 'wood5'), i, 80);
    x.drawImage(knob(0.7), 20, 81);
    put('radio', cabinet);

    put('radio_needle', sprite(['ooooo', 'orrro', '.oro.', '.oro.', '.oro.', '.oro.', '..o..'], { o: 'ink', r: 'red' }));

    // the wave glass: dark green phosphor behind a brass bezel, its graticule, the crest's dashed lines and the notches
    const [sc, sx] = canvas(80, 48);
    sx.drawImage(box(80, 48, 2, { o: 'ink', fill: 'brass2', hi: 'brass1', lo: 'brass3' }), 0, 0);
    rect(sx, 3, 3, 74, 42, 'ink'); rect(sx, 4, 4, 72, 40, 'roofG4');
    for (let i = 13; i < 76; i += 9) for (let j = 5; j < 44; j += 2) dot(sx, i, j, 'roofG3');
    rect(sx, 4, 23, 72, 1, 'roofG3');
    for (const j of [10, 36]) {
      for (let i = 5; i < 76; i += 3) dot(sx, i, j, 'roofG2');
      rect(sx, 0, j - 1, 1, 3, 'ink'); rect(sx, 1, j, 2, 1, 'ink');      // a notch on either side, pointing in
      rect(sx, 79, j - 1, 1, 3, 'ink'); rect(sx, 77, j, 2, 1, 'ink');
    }
    for (const [i, j] of [[6, 6], [7, 6], [8, 6], [6, 7], [6, 8]]) dot(sx, i, j, 'roofG2');   // a glint on the glass
    put('radio_scope', sc);

    // Daniel's savings book from the village post office: a slate-blue cover, the post's brass seal and his name
    const [bk, bx] = canvas(32, 20);
    bx.drawImage(box(32, 20, 1, { o: 'ink', fill: 'roofB2', hi: 'roofB1', lo: 'roofB3' }), 0, 0);
    rect(bx, 3, 1, 1, 18, 'roofB3'); rect(bx, 1, 17, 30, 1, 'cream1');
    bx.drawImage(sprite(['.ooo.', 'obbbo', 'obcbo', 'obbbo', '.ooo.'], { o: 'ink', b: 'brass1', c: 'brass3' }), 14, 3);
    rect(bx, 3, 9, 27, 7, 'ink'); rect(bx, 4, 10, 25, 5, 'cream0');
    PX.text(bx, 'DANIEL', 5, 10, 'ink');
    put('radio_book', bk);
  }

  /* Minigame 6B, Marcus Bell's station ledger, open on the walnut table: the deer-leather cover with brass corner plates,
     a receipt tucked in, the debit page of the bridge beams (4,800 perak) with his old station stamp and signature, the
     credit page of Father's wages, ruled, and the settlement row of columns along the foot, PAID IN FULL WITH FAMILY
     LOVE's box with the brass duty seal in it. Then a credit line for each year, the brass scale on the gutter from
     tipped to level, the station stamp swinging in five steps, its mark square, crooked or spilt, and the red wax seal. */
  function ledger(put) {
    const LEATHER = { o: 'ink', fill: '#5c3a21', hi: '#7d5034', lo: '#3e2616' };
    const W = 248, H = 160, [lg, x] = canvas(W, H);
    x.drawImage(box(W, H, 3, LEATHER), 0, 0);
    for (const [fi, fj] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let a = 0; a < 10; a++) for (let b = 0; a + b < 10; b++) {
      const i = fi > 0 ? a : W - 1 - a, j = fj > 0 ? b : H - 1 - b;   // a brass plate on each corner
      dot(x, i, j, a + b > 8 || a === 0 || b === 0 ? 'ink' : a + b > 7 ? 'brass3' : (fi > 0 && fj > 0) || a + b < 4 ? 'brass0' : 'brass1');
      if (a === 3 && b === 3) { dot(x, i, j, 'brass3'); }
    }
    // a receipt tucked into the debit page, peeking over the cover's edge
    rect(x, 84, 0, 18, 8, 'ink'); rect(x, 85, 1, 16, 7, 'cream0'); rect(x, 87, 3, 10, 1, 'stone2'); rect(x, 87, 5, 7, 1, 'stone2');
    for (const [l, r] of [[4, 123], [124, 243]]) {
      rect(x, l, 3, r - l + 1, H - 6, 'dirt4');
      rect(x, l + 1, 4, r - l - 1, H - 11, 'dirt0');
      for (const [j, k] of [[H - 7, 'dirt2'], [H - 6, 'dirt1'], [H - 5, 'dirt3']]) rect(x, l + 1, j, r - l - 1, 1, k);   // the stacked pages' edges
    }
    rect(x, 118, 4, 3, H - 11, 'dirt1'); rect(x, 121, 4, 2, H - 11, 'dirt2');   // the gutter's shade
    rect(x, 125, 4, 2, H - 11, 'dirt2'); rect(x, 127, 4, 3, H - 11, 'dirt1');
    const say = (s, i, j, k, align = 'left') => PX.text(x, s, align === 'centre' ? i - (PX.textWidth(s) >> 1) : align === 'right' ? i - PX.textWidth(s) + 1 : i, j, k);
    const leaders = (from, to, j) => { for (let i = from; i <= to; i += 2) dot(x, i, j, 'dirt3'); };
    // the debit page
    say('BRIDGE BEAMS, 1952', 63, 6, 'brass3', 'centre');
    rect(x, 10, 13, 93, 1, 'brass2');
    say('DEBIT', 10, 16, 'roofR3');
    [['OAK BEAMS', '2,400'], ['IRON BOLTS', '900'], ['CLAY MORTAR', '600'], ['CARPENTERS', '900']].forEach(([what, sum], k) => {
      const j = 24 + k * 8;
      say(what, 10, j, 'wood5'); say(sum, 102, j, 'wood5', 'right');
      leaders(12 + PX.textWidth(what), 100 - PX.textWidth(sum), j + 4);
      rect(x, 10, j + 6, 93, 1, 'dirt1');
    });
    // Marcus Bell's old station stamp and his signature
    for (let a = 0; a < 64; a++) { const t = a / 64 * 2 * Math.PI; dot(x, Math.round(26 + 9 * Math.cos(t)), Math.round(70 + 8 * Math.sin(t)), 'blue'); }
    say('STN', 26, 68, 'blue', 'centre');
    for (let i = 0; i < 46; i++) dot(x, 42 + i, Math.round(71 - i * 0.1 + 3 * Math.sin(i * 0.55) * (i < 30 ? 1 : 0.4)), 'wood4');
    say('M. BELL', 52, 77, 'dirt4');
    // the credit page
    say('STATION CASH, M. BELL', 184, 6, 'brass3', 'centre');
    rect(x, 132, 13, 107, 1, 'brass2');
    say("CREDIT: DANIEL'S WAGES", 144, 16, 'roofR3');
    for (let k = 0; k < 10; k++) rect(x, 144, 28 + k * 6, 95, 1, 'dirt1');
    // both totals, their sums written in by the game
    for (const [l, r] of [[10, 102], [144, 238]]) { rect(x, l, 85, r - l + 1, 1, 'wood4'); rect(x, l, 87, r - l + 1, 1, 'wood4'); say('TOTAL', l, 90, 'wood5'); }
    // the settlement row: a double rule, the columns' heads and their boxes
    for (const [l, r] of [[8, 120], [127, 240]]) { rect(x, l, 101, r - l + 1, 1, 'wood4'); rect(x, l, 103, r - l + 1, 1, 'wood4'); }
    say('UNPAID', 35, 108, 'wood5', 'centre'); say('CARRIED OVER', 93, 108, 'wood5', 'centre'); say('REMARKS', 223, 108, 'wood5', 'centre');
    say('PAID IN FULL', 165, 106, 'roofR3', 'centre'); say('WITH FAMILY LOVE', 165, 112, 'roofR3', 'centre');
    const frame = (l, t, r, b, k) => { rect(x, l, t, r - l + 1, 1, k); rect(x, l, b, r - l + 1, 1, k); rect(x, l, t, 1, b - t + 1, k); rect(x, r, t, 1, b - t + 1, k); };
    for (const [l, r] of [[8, 62], [66, 119], [205, 240]]) frame(l, 119, r, 150, 'dirt3');
    frame(128, 119, 201, 150, 'wood4'); frame(130, 121, 199, 148, 'wood4');   // the supervisor's box, ruled twice
    say('SUPERVISOR', 165, 142, 'dirt4', 'centre');
    // the brass duty seal stuck in its middle, a rail wheel struck on it, its edge perforated
    rect(x, 160, 129, 10, 10, 'ink'); rect(x, 161, 130, 8, 8, 'brass1'); rect(x, 161, 130, 8, 1, 'brass0'); rect(x, 161, 130, 1, 8, 'brass0');
    rect(x, 161, 137, 8, 1, 'brass3'); rect(x, 168, 130, 1, 8, 'brass3');
    for (const [i, j] of [[163, 132], [164, 132], [165, 132], [166, 133], [166, 134], [166, 135], [165, 136], [164, 136], [163, 136], [162, 135], [162, 134], [162, 133], [164, 134]]) dot(x, i, j, 'brass3');
    for (let i = 161; i < 170; i += 2) { dot(x, i, 128, 'dirt0'); dot(x, i, 139, 'dirt0'); }
    put('ledger', lg);

    // a credit line a year, 1953 to 1962, the wages Father gave each year
    put('ledger_line', strip(Array.from({ length: 10 }, (_, k) => {
      const [c, lx] = canvas(95, 5), sum = '480';
      PX.text(lx, String(1953 + k), 0, 0, 'wood5'); PX.text(lx, 'WAGES', 20, 0, 'wood5');
      PX.text(lx, sum, 95 - PX.textWidth(sum), 0, 'wood5');
      for (let i = 41; i < 95 - PX.textWidth(sum) - 2; i += 2) dot(lx, i, 4, 'dirt3');
      return c;
    })), { frames: 10 });

    // the brass scale: tipped down toward the debit (left) until, in the last frame, it hangs level
    put('ledger_scale', strip([0, 1, 2, 3, 4].map(f => {
      const [c, bx] = canvas(36, 24), a = (4 - f) * 0.09, cx = 18;
      rect(bx, cx - 7, 20, 14, 4, 'ink'); rect(bx, cx - 6, 21, 12, 2, 'brass2'); rect(bx, cx - 6, 21, 12, 1, 'brass1');
      rect(bx, cx - 2, 6, 4, 15, 'ink'); rect(bx, cx - 1, 7, 2, 14, 'brass1'); rect(bx, cx, 7, 1, 14, 'brass2');
      for (let t = -13; t <= 13; t += 0.5) {
        const i = Math.round(cx + t * Math.cos(a)), j = Math.round(5 - t * Math.sin(a));
        dot(bx, i, j - 1, 'ink'); dot(bx, i, j, 'brass1'); dot(bx, i, j + 1, 'ink');
      }
      for (const t of [-13, 13]) {
        const i = Math.round(cx + t * Math.cos(a)), j = Math.round(5 - t * Math.sin(a));
        rect(bx, i, j + 1, 1, 6, 'ink');
        rect(bx, i - 4, j + 7, 9, 3, 'ink'); rect(bx, i - 3, j + 7, 7, 1, 'brass1'); rect(bx, i - 2, j + 8, 5, 1, 'brass2');
      }
      rect(bx, cx - 2, 3, 5, 5, 'ink'); rect(bx, cx - 1, 4, 3, 3, 'brass0');
      return c;
    })), { frames: 5 });

    // Turns an image about (px, py) by deg degrees, clockwise, pixel for pixel.
    const turned = (src, deg, px, py) => {
      const [c, cx] = canvas(src.width, src.height), a = deg * Math.PI / 180, d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
      for (let j = 0; j < src.height; j++) for (let i = 0; i < src.width; i++) {
        const dx = i + 0.5 - px, dy = j + 0.5 - py;
        const si = Math.floor(px + dx * Math.cos(a) + dy * Math.sin(a)), sj = Math.floor(py - dx * Math.sin(a) + dy * Math.cos(a));
        if (si < 0 || sj < 0 || si >= src.width || sj >= src.height) continue;
        const k = (sj * src.width + si) * 4;
        if (d[k + 3]) { cx.fillStyle = `rgb(${d[k]},${d[k + 1]},${d[k + 2]})`; cx.fillRect(i, j, 1, 1); }
      }
      return c;
    };

    // the station stamp, held by its turned knob: a brass collar, the walnut block with its brass band and the
    // red-inked rubber; it swings from the hand in five steps, -6 to 6 degrees, each part drawn turned so its outline
    // stays whole, and its shadow falls level on the page under it
    const STAMP = [   // [left, top, width, height, round, colour(u, v)] in the stamp's own px, hung from (36, 0)
      [8, 24, 56, 4, false, (u, v) => (v < 2 ? 'roofR2' : 'roofR3')],
      [8, 16, 56, 9, false, (u, v) => (v < 1 ? 'wood2' : v > 7 ? 'wood4' : v === 4 ? (u < 12 ? 'brass0' : 'brass1') : u < 3 ? 'wood2' : 'wood3')],
      [29, 13, 14, 4, false, (u, v) => (v < 2 ? 'brass1' : 'brass2')],
      [33, 9, 6, 5, false, u => (u < 3 ? 'wood2' : 'wood3')],
      [29, 0, 14, 11, true, (u, v) => (u + v < 8 ? 'wood1' : u + v > 15 ? 'wood4' : 'wood2')],
    ];
    const stamp = deg => {
      const [c, cx] = canvas(72, 36), a = deg * Math.PI / 180;
      rect(cx, 8, 32, 56, 3, 'shadow');
      for (const [l, t, w, h, round, colour] of STAMP) {
        const at = (i, j) => { const dx = i + 0.5 - 36, dy = j + 0.5; return [36 + dx * Math.cos(a) + dy * Math.sin(a) - l, -dx * Math.sin(a) + dy * Math.cos(a) - t]; };
        const inside = (i, j) => { const [u, v] = at(i, j); return round ? ((u - w / 2) / (w / 2)) ** 2 + ((v - h / 2) / (h / 2)) ** 2 <= 1 : u >= 0 && v >= 0 && u < w && v < h; };
        cx.drawImage(shape(72, 36, inside, (i, j) => { const [u, v] = at(i, j); return colour(Math.floor(u), Math.floor(v)); }), 0, 0);
      }
      return c;
    };
    put('ledger_stamp', strip([-6, -3, 0, 3, 6].map(stamp)), { frames: 5 });

    // its mark: PAID IN FULL WITH FAMILY LOVE in bright red, square, crooked, or the ink spilt in a blot
    const [im, ix] = canvas(56, 26);
    for (const [l, t, r, b] of [[0, 0, 55, 25], [2, 2, 53, 23]]) { rect(ix, l, t, r - l + 1, 1, 'red'); rect(ix, l, b, r - l + 1, 1, 'red'); rect(ix, l, t, 1, b - t + 1, 'red'); rect(ix, r, t, 1, b - t + 1, 'red'); }
    for (const [s, j] of [['PAID IN FULL', 5], ['WITH', 11], ['FAMILY LOVE', 17]]) PX.text(ix, s, 28 - (PX.textWidth(s) >> 1), j, 'red');
    const worn = PX.rng(1952);
    for (let k = 0; k < 40; k++) ix.clearRect(Math.floor(worn() * 56), Math.floor(worn() * 26), 1, 1);   // the old rubber's worn spots
    const mark = (img, deg) => { const [c, mx] = canvas(72, 40); mx.drawImage(img, 8, 7); return deg ? turned(c, deg, 36, 20) : c; };
    const [sp, spx] = canvas(72, 40), r = PX.rng(48);
    for (let k = 0; k < 9; k++) { const a = k / 9 * 2 * Math.PI, d = 6 + r() * 6; PX.ellipse(spx, 36 + Math.cos(a) * d * 1.4, 20 + Math.sin(a) * d * 0.8, 4 + Math.round(r() * 4), 3 + Math.round(r() * 3), 'roofR3'); }
    PX.ellipse(spx, 36, 20, 14, 8, 'roofR3');
    for (let k = 0; k < 10; k++) { const a = r() * 2 * Math.PI, d = 18 + r() * 12; rect(spx, 36 + Math.cos(a) * d * 1.2, 20 + Math.sin(a) * d * 0.6, 2, 2, 'roofR3'); }
    PX.ellipse(spx, 34, 18, 9, 5, 'red'); rect(spx, 30, 15, 3, 1, 'roofR1'); dot(spx, 29, 16, 'roofR1');
    rect(spx, 44, 26, 2, 9, 'roofR3'); rect(spx, 43, 34, 4, 2, 'roofR3');   // a drip running down
    put('ledger_mark', strip([mark(im, 0), mark(im, 11), sp]), { frames: 3 });

    // the red wax seal of the 1952 service, squashed out at its edge, 52 pressed into it
    const lobe = (i, j) => { const a = Math.atan2(j - 8.5, i - 8.5); return Math.hypot(i - 8.5, j - 8.5) <= 7.4 + 0.9 * Math.sin(a * 5 + 1); };
    const wax = shape(18, 18, lobe, (i, j) => {
      const d = Math.hypot(i - 8.5, j - 8.5);
      return d > 5.5 ? (i + j < 14 ? 'roofR2' : 'roofR3') : i + j < 13 ? 'roofR1' : 'roofR2';
    });
    PX.text(wax.getContext('2d'), '52', 6, 7, 'roofR1'); PX.text(wax.getContext('2d'), '52', 5, 6, 'roofR4');
    put('ledger_wax', wax);
  }

  /* Minigame 5A, the resoling of Leo's shoes at the Mender's forge: the forge's planked back wall over the workbench,
     lit warm by the heater, with a shelf of shoe lasts and a beeswax tin; the clay candle heater, its flame calm or
     roaring; the pottery bowl of pine damar, hard lumps to a melted golden pool, bubbling when too hot and burnt
     black; the small brass iron, cold or hot; the burnt resin's black smoke; the shoe press (its beam with four peg
     holes, iron rods, the leather-padded clamp bar); Leo's faded red canvas shoe in profile over its spiked rubber
     sole, worn and restored; the wooden pegs standing, driven and split; and the hammer leaning in seven steps
     either side of upright, about the middle of its face. */
  function resoling(put) {
    const [W, H, BENCH] = [216, 114, 100], [wall, wx] = canvas(W, H);
    for (let j = 0; j < BENCH; j++) for (let i = 0; i < W; i++) {
      const e = i % 18, lit = Math.hypot((i - 22) / 1.4, j - 88) < 28;   // the heater's glow on the planks, in one hard step
      dot(wx, i, j, j < 4 ? 'wood5' : e === 0 ? 'wood5' : e === 1 ? (lit ? 'wood2' : 'wood3') : lit ? 'wood3' : 'wood4');
    }
    for (const [i, j] of [[34, 40], [97, 54], [152, 24], [192, 70], [62, 64], [130, 82], [176, 8]]) { rect(wx, i, j, 3, 2, 'wood5'); dot(wx, i + 1, j, 'wood3'); }   // knots
    // the shelf on two brackets, its shadow under it: a glass jar of pegs, a ball of hemp thread, the beeswax tin
    rect(wx, 4, 30, 60, 5, 'ink'); rect(wx, 5, 31, 58, 1, 'wood1'); rect(wx, 5, 32, 58, 2, 'wood2'); rect(wx, 4, 35, 60, 2, 'wood5');
    for (const i of [9, 55]) for (let k = 0; k < 5; k++) { rect(wx, i - 1, 35 + k, 4 - k, 1, 'ink'); rect(wx, i, 35 + k, Math.max(0, 2 - k), 1, 'wood3'); }
    wx.drawImage(shape(12, 15, (i, j) => !(j < 3 && (i < 2 || i > 9)), (i, j) => (j < 3 ? (j === 1 ? 'wood1' : 'wood3') : i === 2 ? 'white' : 'sky1')), 8, 16);   // the jar, its cork
    for (const [i, j] of [[4, 6], [6, 5], [8, 6], [5, 9], [7, 9], [9, 10], [4, 12]]) { rect(wx, 8 + i, 16 + j, 1, 3, 'wood1'); dot(wx, 8 + i, 16 + j, 'wood0'); }
    wx.drawImage(shape(10, 9, (i, j) => (i - 4.5) ** 2 + (j - 4.5) ** 2 <= 21, (i, j) => ((i + j) % 3 === 0 ? 'dirt3' : i + j < 6 ? 'dirt0' : 'dirt1')), 24, 22);   // the thread
    rect(wx, 46, 25, 13, 6, 'ink'); rect(wx, 47, 26, 11, 4, 'brass1'); rect(wx, 47, 26, 11, 1, 'brass0'); rect(wx, 49, 27, 7, 2, 'cream0'); rect(wx, 47, 29, 11, 1, 'brass2');   // the beeswax tin
    // the bench: its top (a shadow where it meets the wall, a lit front lip), its face with a plank seam and brass nails
    rect(wx, 0, BENCH, W, 1, 'wood4'); rect(wx, 0, BENCH + 1, W, 2, 'wood2'); rect(wx, 0, BENCH + 3, W, 1, 'wood1');
    rect(wx, 0, BENCH + 4, W, 10, 'wood3'); rect(wx, 0, BENCH + 8, W, 1, 'wood4'); rect(wx, 0, H - 1, W, 1, 'wood5');
    for (let i = 12; i < W; i += 36) { dot(wx, i, BENCH + 6, 'brass1'); dot(wx, i, BENCH + 11, 'brass1'); }
    for (const [i, k] of [[44, 'wood0'], [58, 'wood1'], [196, 'wood0'], [204, 'light3'], [48, 'light3']]) rect(wx, i, BENCH + 1, 2, 1, k);   // shavings, a drop of resin
    put('forge_wall', wall);

    // the candle heater: a clay pot with a rim the bowl sits in and an arched mouth with the candle in it
    put('candle_heater', strip([0, 1, 2, 3].map(f => {
      const [c, x] = canvas(32, 24), high = f > 1, flick = f % 2;
      if (high) for (const [i, h] of [[1, 4 + flick], [28, 5 - flick]]) { rect(x, i, 8 - h, 3, h, 'light3'); rect(x, i + 1, 8 - h + 1, 1, h - 1, 'light1'); }   // tongues over the rim
      x.drawImage(shape(32, 16, (i, j) => (j < 2 ? true : Math.abs(i - 15.5) <= 14.5 - (j - 2) * 0.18),
        (i, j) => (j === 0 ? 'roofR0' : j === 1 ? 'roofR1' : j === 15 ? 'roofR4' : i < 7 ? 'roofR1' : i > 24 ? 'roofR3' : 'roofR2')), 0, 8);
      for (let j = 12; j < 22; j++) for (let i = 11; i < 21; i++) if (j > 15 || Math.hypot(i - 15.5, j - 15.5) <= 4.6) dot(x, i, j, high ? 'roofR3' : 'ink2');
      for (let i = 11; i < 21; i++) dot(x, i, 22, 'roofR1');   // the mouth's lit sill
      rect(x, 14, 17, 4, 5, 'cream0'); rect(x, 17, 17, 1, 5, 'cream2'); dot(x, 15, 16, 'ink');   // the candle and its wick
      if (high) { rect(x, 13, 10 + flick, 6, 6 - flick, 'light3'); rect(x, 14, 11 + flick, 4, 4 - flick, 'light1'); rect(x, 15, 13, 2, 2, 'light0'); }
      else { rect(x, 15, 13 + flick, 2, 3 - flick, 'light2'); dot(x, 15, 15, 'light0'); }
      for (const [i, j] of [[5, 13], [26, 13], [6, 18], [25, 18]]) dot(x, i, j, 'roofR4');   // vents
      return c;
    })), { frames: 4 });

    // the pottery bowl, glazed green at the rim, and the damar in it
    put('resin_bowl', strip([0, 1, 2, 3, 4].map(f => {
      const [c, x] = canvas(26, 14);
      const blob = (i, j, w, h, lit, mid, low) => x.drawImage(shape(w, h, (a, b) => ((a - (w - 1) / 2) / (w / 2)) ** 2 + ((b - (h - 1) / 2) / (h / 2)) ** 2 <= 1.1,
        (a, b) => (a + b < (w + h) / 3 ? lit : a + b > (w + h) * 0.7 ? low : mid)), i, j);
      if (f === 0) for (const [i, j, w] of [[2, 1, 7], [8, 0, 7], [14, 1, 7], [18, 2, 6]]) blob(i, j, w, 6, 'light3', 'brass2', 'brass3');
      if (f === 1) { rect(x, 2, 3, 22, 3, 'ink'); rect(x, 3, 4, 20, 2, 'light3'); blob(6, 1, 6, 5, 'light3', 'brass2', 'brass3'); blob(14, 2, 5, 4, 'light3', 'brass2', 'brass3'); }
      if (f === 2 || f === 3) {
        rect(x, 1, 2, 24, 4, 'ink'); rect(x, 2, 3, 22, 3, f === 3 ? 'light2' : 'light3'); rect(x, 2, 3, 22, 1, f === 3 ? 'light0' : 'light1');
        if (f === 2) rect(x, 6, 3, 4, 1, 'white');
        else for (const [i, j] of [[5, 0], [11, 1], [17, 0], [20, 2], [8, 2]]) { rect(x, i, j, 2, 2, 'ink'); dot(x, i, j, 'white'); }   // bubbles
      }
      if (f === 4) { x.drawImage(shape(24, 6, (i, j) => j >= 3 - Math.round(2 * Math.sin(i / 3.5)) - 1, (i, j) => ((i * 3 + j) % 7 === 0 ? 'roofR1' : j < 3 ? 'stone5' : 'ink2')), 1, 0); }
      x.drawImage(shape(26, 10, (i, j) => Math.abs(i - 12.5) <= 12.6 * Math.sqrt(Math.max(0, 1 - (j / 10.5) ** 2)), (i, j) =>
        (j < 2 || (j < 4 && i % 5 === 2) ? (j === 0 ? 'roofG1' : 'roofG2') : j === 9 ? 'wood4' : i < 7 ? 'wood1' : i > 18 ? 'wood3' : 'wood2')), 0, 4);
      return c;
    })), { frames: 5 });

    // the brass iron: a brass blade at the tip, an iron rod, a wooden handle with a brass ferrule
    put('brass_iron', strip([false, true].map(hot => {
      const [ax, ay, bx, by] = [2, 14, 20, 1], len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
      const at = (i, j) => { const px = i + 0.5 - ax, py = j + 0.5 - ay; return [(px * ux + py * uy) / len, px * uy - py * ux]; };
      const radius = t => (t < -0.05 || t > 1.02 ? -1 : t < 0.24 ? 1.3 + t * 5 : t < 0.5 ? 1 : 1.9);
      return shape(22, 16, (i, j) => { const [t, v] = at(i, j); return Math.abs(v) <= radius(t); }, (i, j) => {
        const [t, v] = at(i, j);
        if (t < 0.24) return hot ? (t < 0.1 ? 'light0' : v < 0 ? 'light2' : 'light3') : v < 0 ? 'brass0' : t < 0.1 ? 'brass2' : 'brass1';
        if (t < 0.5) return v < 0 ? 'iron1' : 'iron2';
        if (t < 0.56) return 'brass1';
        return v < 0 ? 'wood2' : 'wood3';
      });
    })), { frames: 2 });

    // thick black smoke rolling up off burnt resin, in three steps
    put('resin_smoke', strip([0, 1, 2].map(f => {
      const s = 0.75 + 0.25 * f, rise = 4 * f, puffs = [[13, 23, 5.5], [8, 17, 4.5], [18, 15, 5], [13, 9, 4.5]].map(([i, j, r]) => [i, j - rise + 6 * (1 - s), r * s]);
      const inside = (i, j) => puffs.some(([a, b, r]) => (i - a) ** 2 + (j - b) ** 2 <= r * r);
      return shape(26, 30, inside, (i, j) => (puffs.some(([a, b, r]) => (i - a + 1) ** 2 + (j - b + 1) ** 2 <= (r - 1.4) ** 2) ? 'stone4' : inside(i + 1, j + 1) ? 'stone5' : 'ink2'));
    })), { frames: 3 });

    // the shoe press: uprights and a beam (iron strapped, four brass-collared peg holes), two threaded rods, the bed
    const [pw, ph] = [132, 66], [press, prx] = canvas(pw, ph);
    for (const i of [14, 116]) for (let j = 10; j < 56; j++) { rect(prx, i - 1, j, 4, 1, 'ink'); rect(prx, i, j, 2, 1, j % 2 ? 'iron1' : 'iron2'); }
    const plank = (i, j, w, h) => prx.drawImage(shape(w, h, () => true, (a, b) => (b === 1 ? 'wood1' : a === 1 ? 'wood2' : b === h - 2 ? 'wood4' : 'wood3')), i, j);
    plank(0, 2, 8, 56); plank(124, 2, 8, 56); plank(0, 2, pw, 8);
    for (const i of [24, 44, 64, 86, 108]) rect(prx, i, 5, 5, 1, 'wood2');   // grain
    for (const i of [1, 123]) { rect(prx, i, 3, 8, 6, 'iron3'); rect(prx, i, 3, 8, 1, 'iron2'); dot(prx, i + 2, 5, 'iron0'); dot(prx, i + 5, 7, 'iron0'); }
    for (const i of [37, 57, 77, 97]) { rect(prx, i - 4, 0, 9, 3, 'ink'); rect(prx, i - 3, 1, 7, 1, 'brass1'); rect(prx, i - 2, 2, 5, 1, 'ink2'); }   // the brass-collared holes
    rect(prx, 8, 56, 116, 2, 'wood5'); rect(prx, 8, 56, 116, 1, 'wood4');   // the leather mat on the bed
    prx.drawImage(shape(pw, 8, (i, j) => !(j > 5 && (i < 2 || i > pw - 3 || (i > 12 && i < pw - 13))), (i, j) => (j === 1 ? 'wood1' : j > 4 ? 'wood4' : 'wood2')), 0, 58);
    put('shoe_press', press);

    const [bw, bh] = [112, 7], [bar, bax] = canvas(bw, bh);
    bax.drawImage(shape(bw, 5, () => true, (i, j) => (j === 1 ? 'wood1' : j === 3 ? 'wood3' : 'wood2')), 0, 0);
    rect(bax, 1, 4, bw - 2, 3, 'ink'); rect(bax, 2, 4, bw - 4, 2, 'wood5'); rect(bax, 2, 4, bw - 4, 1, 'wood4');   // the leather pad
    for (const i of [3, 105]) { rect(bax, i, 1, 4, 3, 'iron3'); rect(bax, i, 1, 4, 1, 'iron1'); }
    put('press_bar', bar);

    // Leo's canvas running shoe, toe to the right: the leather heel tab, the collar dipping to the opening, the tongue
    // standing up, the laced instep, the vamp's seam and the white rubber foxing round its foot and toe
    const TOP = [[0, 13], [1, 8], [3, 6], [13, 5], [16, 8], [18, 12], [28, 12], [29, 4], [32, 2], [35, 3], [36, 9], [50, 13], [58, 15], [64, 17], [68, 19], [70, 21], [71, 23]];
    const top = i => { for (let k = 1; k < TOP.length; k++) if (i <= TOP[k][0]) { const [a, ya] = TOP[k - 1], [b, yb] = TOP[k]; return Math.round(ya + (yb - ya) * (i - a) / (b - a)); } return 27; };
    const EYELETS = [38, 42, 46, 50];
    put('shoe_upper', strip([false, true].map(fresh => {
      const [hi, mid, lo] = fresh ? ['roofR1', 'red', 'roofR2'] : ['roofR0', 'roofR1', 'roofR2'];
      const c = shape(72, 28, (i, j) => j >= top(i) && !((i === 0 || i === 71) && j === 27), (i, j) => {
        const t = top(i);
        if (j >= 23 || (i > 58 && j >= t + 3)) return j === 23 || (i > 58 && j === t + 3) ? (fresh ? 'cream1' : 'dirt2') : fresh ? (j === 27 ? 'cream2' : 'cream0') : j === 27 ? 'dirt3' : 'dirt1';   // the foxing and toe cap
        if (j === 22 && i % 3 === 0) return fresh ? 'cream0' : 'dirt1';   // stitching
        if (i < 10 && j >= 9) return i === 9 || (i === 7 && j % 2) ? 'wood4' : fresh ? 'wood2' : 'wood3';   // the stitched heel tab
        if (i > 15 && i < 29 && j < t + 4 && j >= 7) return j === t + 3 ? (fresh ? 'cream1' : 'dirt1') : 'ink2';   // the dark inside, through the opening, over the lining's edge
        if (i === 29 || i === 36) return lo;                                    // the tongue's and the vamp's seams
        return j < t + 2 ? hi : i > 61 ? lo : mid;
      });
      const x = c.getContext('2d');
      for (const i of EYELETS) { dot(x, i, top(i) + 2, 'ink'); dot(x, i + 1, top(i) + 2, fresh ? 'brass1' : 'brass3'); }
      if (fresh) {
        for (const i of EYELETS) line(x, i - 2, top(i) + 1, i + 2, top(i) + 4, 'white');   // the laces crossing the instep
        for (const [i, j] of [[34, 4], [35, 3], [37, 3], [38, 4], [36, 5], [37, 6], [39, 6]]) dot(x, i, j, 'white');   // the bow
        for (const [i, j, w] of [[52, 16, 5], [3, 9, 1], [20, 16, 3], [61, 24, 4]]) rect(x, i, j, w, 1, 'white');   // the polish shining
      } else {
        line(x, 36, top(38) + 1, 40, top(38) + 4, 'cream1'); line(x, 44, top(46) + 1, 47, top(46) + 3, 'cream1');
        for (let j = 0; j < 8; j++) dot(x, 42 + (j > 5 ? 1 : 0), top(42) + 4 + j, 'cream1');   // a broken lace hanging
        for (const [i, j, w] of [[11, 17, 3], [52, 18, 4], [24, 19, 2], [62, 25, 3]]) { rect(x, i, j, w, 2, 'leaf3'); rect(x, i, j, w - 1, 1, 'leaf2'); }   // moss
        rect(x, 47, 18, 2, 2, 'ink2'); rect(x, 15, 25, 3, 1, 'dirt4'); rect(x, 44, 26, 4, 1, 'dirt4');   // a hole, mud
      }
      return c;
    })), { frames: 2 });

    // the rubber sole with its iron spikes: old dark rubber cracked, the spikes rusted; or fresh gum and clean iron
    put('shoe_sole', strip([false, true].map(fresh => {
      const [s, x] = canvas(80, 8);
      x.drawImage(shape(80, 5, (i, j) => !((i === 0 || i === 79) && (j === 0 || j === 4)), (i, j) =>
        (fresh ? (j === 1 ? 'dirt2' : j === 3 ? 'dirt4' : 'dirt3') : j === 1 ? 'wood3' : j === 3 ? 'wood5' : 'wood4')), 0, 0);
      if (!fresh) for (const i of [26, 52, 63]) { dot(x, i, 1, 'ink'); dot(x, i + 1, 2, 'ink'); dot(x, i, 3, 'ink'); }   // cracks
      for (const i of [10, 18, 44, 51, 58, 65, 72]) {
        rect(x, i - 2, 5, 5, 1, 'ink'); rect(x, i - 1, 5, 3, 1, fresh ? 'iron1' : 'roofR3');
        rect(x, i - 1, 6, 3, 1, 'ink'); dot(x, i, 6, fresh ? 'iron0' : 'brass3'); dot(x, i, 7, 'ink');
      }
      return s;
    })), { frames: 2 });

    // a peg of pale wood standing in its hole, driven flush, and split by a crooked blow
    const PEG = { o: 'ink', a: 'wood0', b: 'wood1', c: 'wood2' };
    const peg = sprite(['.ooooo.', 'oaaaabo', 'oaaabbo', 'ooooooo', '.oaabo.', '.oaabo.', '.oaabo.', '.oaabo.', '.oabco.', '.oabco.'], PEG);
    const flush = sprite(['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.ooooo.', 'oaaabbo', 'ooooooo'], PEG);
    const split = sprite(['o.....o', 'ao...ob', 'oao.obo', '.oa.bo.', '.oaobo.', '..oao..', '.oaabo.', '.oaabo.', '.oabco.', '.oabco.'], PEG);
    put('shoe_peg', strip([peg, flush, split]), { frames: 3 });

    // the hammer, head down, leaning from -3 to 3 steps about the middle of its face
    put('peg_hammer', strip([-3, -2, -1, 0, 1, 2, 3].map(k => {
      const a = k * 0.15, ca = Math.cos(a), sa = Math.sin(a);
      const at = (i, j) => { const dx = i + 0.5 - 14, dy = 22 - (j + 0.5); return [dx * sa + dy * ca, dx * ca - dy * sa]; };   // u up the handle, v across
      return shape(28, 24, (i, j) => { const [u, v] = at(i, j); return u >= 0 && ((u < 7 && Math.abs(v) <= 5.6) || (u < 21 && Math.abs(v) <= 1.6)); }, (i, j) => {
        const [u, v] = at(i, j);
        if (u < 7) return u < 1.3 ? 'iron3' : v < -3 ? 'iron0' : u > 5.6 ? 'iron1' : 'iron2';
        return u < 8.6 ? 'brass1' : v < 0 ? 'wood1' : 'wood2';
      });
    })), { frames: 7 });
  }

  /* Minigame 5B, the sprint up Leo's hill at dusk, side on: the sky and the sea in four steps from late afternoon to
     sunset, the sun sinking through the same four colours, low headlands across the bay (they tile as they scroll),
     the hillside as tiles that rise a pixel every six (grass, then the rocky upper slope, and the flat foot), the top
     with Leo's rock, his bench and a pennant, Leo on the rock, the courier running (six strides, a leap, a tumble in
     two quarter turns, standing), the roots, slippery rocks and coral steps, the mid-hill pennant (furled till
     passed), and the trail along the top that shows how far up the courier is. */
  function sprint(put) {
    const [W, H, HORIZON] = [256, 112, 44];
    const SKY = [['sky3', 'sky2', 'sky1', 'sky0', 'light0'], ['sky2', 'sky1', 'dusk0', 'dusk1', 'light1'], ['dusk4', 'dusk3', 'dusk2', 'dusk1', 'light2'], ['dusk5', 'dusk4', 'dusk3', 'dusk2', 'light3']];
    const SEA = [['water1', 'water2', 'water3', 'water4'], ['light1', 'water2', 'water3', 'water4'], ['dusk1', 'dusk3', 'dusk4', 'roofB3'], ['light2', 'dusk3', 'dusk5', 'roofB4']];
    const CLOUD = [['cloud0', 'cloud2'], ['light0', 'dusk1'], ['dusk1', 'dusk3'], ['dusk2', 'dusk4']];
    put('sunset_sky', strip([0, 1, 2, 3].map(f => {
      const [c, x] = canvas(W, H);
      [0, 13, 24, 33, 40].forEach((j, k, all) => rect(x, 0, j, W, (all[k + 1] || HORIZON) - j, SKY[f][k]));
      [HORIZON, HORIZON + 2, 52, 68].forEach((j, k, all) => rect(x, 0, j, W, (all[k + 1] || H) - j, SEA[f][k]));
      for (const [i, j, w] of [[18, 56, 6], [70, 60, 4], [120, 54, 8], [44, 74, 5], [210, 64, 6], [160, 82, 4], [96, 90, 6], [230, 96, 5]]) rect(x, i, j, w, 1, SEA[f][0]);   // wave glints
      for (const [cx, cy, n] of [[40, 14, 4], [120, 22, 3], [214, 10, 3]]) {
        const puffs = Array.from({ length: n }, (_, k) => [cx + (k - (n - 1) / 2) * 7, cy - (k % 2) * 2 - (k === 1 ? 2 : 0), 4 + (k % 2)]);
        for (let j = cy - 8; j <= cy + 1; j++) for (let i = cx - 20; i <= cx + 20; i++)
          if (puffs.some(([a, b, r]) => (i - a) ** 2 + (j - b) ** 2 <= r * r) && j <= cy + 1) dot(x, i, j, j >= cy ? CLOUD[f][1] : CLOUD[f][0]);
      }
      return c;
    })), { frames: 4 });
    const SUN = [['white', 'light0', 'light1', 'light0'], ['light0', 'light1', 'light2', 'dusk0'], ['light1', 'light2', 'light3', 'dusk1'], ['light2', 'light3', 'light4', 'dusk2']];
    put('sunset_sun', strip(SUN.map(([core, mid, rim, halo]) => {
      const [c, x] = canvas(21, 21);
      for (let j = 0; j < 21; j++) for (let i = 0; i < 21; i++) {
        const r = Math.hypot(i - 10, j - 10);
        if (r <= 10.2 && (r > 8.6 || r <= 7.6)) dot(x, i, j, r > 8.6 ? halo : r > 6.4 ? rim : (i - 8) ** 2 + (j - 8) ** 2 < 8 ? core : mid);
      }
      return c;
    })), { frames: 4 });
    // low headlands across the bay, the far ones lilac in the haze, the near ones teal with a few trees
    const [hw, hh] = [W, 14], [hills, hx] = canvas(hw, hh), TAU = 2 * Math.PI;
    for (let i = 0; i < hw; i++) {
      const far = Math.round(7 + 4 * Math.sin(TAU * i / hw * 2 + 1) + 2 * Math.sin(TAU * i / hw * 5)), near = Math.round(10 + 3 * Math.sin(TAU * i / hw * 3 + 2) + 2 * Math.sin(TAU * i / hw * 7));
      if (far < 10) for (let j = far; j < hh; j++) dot(hx, i, j, j === far ? 'dusk3' : 'dusk4');
      if (near < 12) for (let j = near; j < hh; j++) dot(hx, i, j, j === near ? 'roofG1' : 'roofG2');
    }
    for (const i of [22, 30, 150, 158, 166]) { rect(hx, i - 2, 5, 5, 4, 'roofG2'); rect(hx, i - 1, 4, 3, 1, 'roofG1'); rect(hx, i, 9, 1, 3, 'roofG3'); }
    put('far_hills', hills);

    // the hillside, its surface a pixel higher every six: grass with tufts, flowers and buried roots; the rocky upper
    // slope, mossy and wet; and the flat foot of the hill
    const TILE = 48, DEEP = 72;
    put('hill_slope', strip([0, 1, 2].map(kind => {
      const [c, x] = canvas(TILE, DEEP), surface = i => (kind === 2 ? 8 : 8 - Math.floor(i / 6));
      for (let i = 0; i < TILE; i++) for (let j = surface(i); j < DEEP; j++) {
        const d = j - surface(i);
        const rocky = kind === 1, slab = rocky && i >= 18 && i < 31 && d < 4;   // the upper slope: thin grass, stony earth, a slab breaking through
        dot(x, i, j, slab ? (d === 0 ? 'stone1' : d < 3 ? 'stone2' : 'stone3') : d === 0 ? 'grass1' : d < (rocky ? 3 : 4) ? 'grass2'
          : d === (rocky ? 3 : 4) || (d === (rocky ? 4 : 5) && i % 4 === 1) ? 'grass3' : d < 16 ? (rocky ? 'dirt3' : 'dirt2') : d < 34 ? (rocky ? 'dirt4' : 'dirt3') : 'dirt4');
      }
      const s = surface;
      if (kind === 1) {
        for (const [i, d, w, h] of [[3, 7, 6, 4], [34, 9, 8, 5], [14, 18, 5, 3], [26, 26, 7, 4], [6, 34, 6, 3], [38, 40, 5, 3]]) {   // stones bedded in the earth
          for (let b = 0; b <= h; b++) for (let a = 0; a < w; a++) {
            const r = ((a - (w - 1) / 2) / (w / 2)) ** 2 + ((b - h / 2) / (h / 2 + 0.5)) ** 2;
            if (r <= 1) dot(x, i + a, s(i) + d + b, b === h ? 'dirt4' : b === 0 || a + b < 2 ? 'stone1' : a + b > w + h - 4 ? 'stone4' : a < w / 2 ? 'stone2' : 'stone3');
          }
        }
        for (const i of [8, 40]) { rect(x, i, s(i) - 2, 4, 2, 'stone2'); rect(x, i, s(i) - 2, 3, 1, 'stone1'); dot(x, i + 1, s(i) - 2, 'white'); }   // wet stones on the grass
        for (const [i, h] of [[13, 2], [35, 3]]) { rect(x, i, s(i) - h, 1, h, 'grass3'); dot(x, i + 1, s(i) - 1, 'grass1'); }
        rect(x, 20, s(20) + 1, 2, 1, 'white');
      } else {
        for (const [i, h] of [[3, 2], [14, 3], [27, 2], [36, 3]]) { rect(x, i, s(i) - h, 1, h, 'grass3'); rect(x, i + 1, s(i) - h + 1, 1, h - 1, 'grass1'); dot(x, i - 1, s(i) - 1, 'grass2'); }
        for (const [i, k] of [[9, 'yellow'], [21, 'white'], [31, 'pink']]) { dot(x, i, s(i) - 2, k); dot(x, i, s(i) - 1, 'grass3'); }
        for (const [i, d] of [[6, 10], [24, 14], [40, 9], [16, 24], [34, 30]]) { rect(x, i, s(i) + d, 2, 1, 'dirt1'); dot(x, i, s(i) + d + 1, 'dirt4'); }   // pebbles
        for (let i = 2; i < 20; i++) dot(x, i, s(i) + 19 + Math.round(Math.sin(i / 3) * 1.5), 'wood4');   // a buried root
      }
      return c;
    })), { frames: 3 });

    // the top: flat grass to the far edge, Leo's mossy rock, his wooden bench and a pennant, then the drop to the sea
    const [tw, th, TOPS] = [232, 112, 40], [hill, tx] = canvas(tw, th), ts = i => (i < 196 ? TOPS : TOPS + Math.round(((i - 196) / 36) ** 2 * 40));
    for (let i = 0; i < tw; i++) for (let j = ts(i); j < th; j++) {
      const d = j - ts(i);
      dot(tx, i, j, d === 0 ? 'grass1' : d < 3 ? 'grass2' : d === 3 ? 'grass3' : d < 16 ? 'dirt3' : 'dirt4');   // the rocky slope's earth
    }
    for (const [i, h] of [[6, 2], [18, 3], [46, 2], [112, 3], [160, 2], [184, 3]]) { rect(tx, i, TOPS - h, 1, h, 'grass3'); rect(tx, i + 1, TOPS - h + 1, 1, h - 1, 'grass1'); }
    for (const [i, k] of [[12, 'yellow'], [40, 'white'], [58, 'pink'], [118, 'yellow'], [166, 'white'], [176, 'lilac']]) { dot(tx, i, TOPS - 2, k); dot(tx, i, TOPS - 1, 'grass3'); }
    tx.drawImage(shape(36, 18, (i, j) => ((i - 17.5) / 18) ** 2 + ((j - 17) / 16) ** 2 <= 1, (i, j) => (j < 4 && (i * 5 + j) % 7 < 5 ? (j < 2 ? 'leaf2' : 'leaf3') : i + j < 14 ? 'stone1' : i + j > 38 || j > 15 ? 'stone4' : i > 24 ? 'stone3' : 'stone2')), 70, TOPS - 17);   // Leo's rock
    rect(tx, 68, TOPS, 40, 1, 'grass4');
    const bench = shape(28, 14, (i, j) => (j >= 1 && j < 4 && i > 0 && i < 27) || (j >= 6 && j < 9) || (j >= 8 && (i < 3 || i > 24 || (i > 10 && i < 13 && j < 10))), (i, j) => (j === 1 || j === 6 ? 'wood1' : j > 8 ? 'wood4' : 'wood2'));
    tx.drawImage(bench, 124, TOPS - 13); rect(tx, 125, TOPS, 26, 1, 'grass4');
    for (let j = TOPS - 34; j < TOPS; j++) { rect(tx, 178, j, 3, 1, 'ink'); dot(tx, 179, j, 'wood2'); }   // the pennant's pole
    rect(tx, 177, TOPS - 36, 5, 2, 'ink'); rect(tx, 178, TOPS - 35, 3, 1, 'brass1');
    for (let j = 0; j < 7; j++) { rect(tx, 181, TOPS - 33 + j, 12 - Math.abs(j - 3) * 3, 1, j === 0 || j === 6 ? 'ink' : 'light3'); dot(tx, 181 + 12 - Math.abs(j - 3) * 3, TOPS - 33 + j, 'ink'); }
    put('hill_top', hill);

    // Leo on his rock, facing down the hill toward the runner
    const [leo, lx] = canvas(4 * CELL, CELL);
    for (let f = 0; f < 4; f++) CH.draw(lx, 'leo', 'idle', f % CH.frames('leo', 'idle'), f * CELL + FLIPPED_X, FEET[1], -1);
    put('hill_leo', leo, { frames: 4 });

    // the courier: six strides, a leap (a stride with the legs gathered), a tumble pitching forward a quarter turn and
    // then onto its back, and standing ready; the tumble's frames are settled onto the feet line
    const cell = draw => { const [c, x] = canvas(CELL, CELL); draw(x); return c; };
    const turned = (src, q) => {
      const [c, x] = canvas(CELL, CELL); x.translate(CELL / 2, CELL / 2); x.rotate(q * Math.PI / 2); x.drawImage(src, -CELL / 2, -CELL / 2);
      const p = pixels(c); let low = 0;
      for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) if (p[(j * CELL + i) * 4 + 3]) low = j;
      const [d, dx] = canvas(CELL, CELL); dx.drawImage(c, 0, FEET[1] - low); return d;
    };
    const run = f => cell(x => CH.draw(x, 'courier', 'run', f, FEET[0], FEET[1], 1, { shadow: false }));
    put('sprinter', strip([0, 1, 2, 3, 4, 5].map(run).concat([
      cell(x => CH.draw(x, 'courier', 'run', 1, FEET[0], FEET[1], 1, { shadow: false })), turned(run(3), 1), turned(run(3), 2),
      cell(x => CH.draw(x, 'courier', 'idle', 0, FEET[0], FEET[1], 1, { shadow: false })),
    ])), { frames: 10 });

    // what trips a runner: a kapok root looping out of the ground, a slippery mossy rock, a coral step
    const [ow, oh] = [20, 14];
    const root = shape(ow, oh, (i, j) => [[1, 17, 10], [10, 19, 6]].some(([a, b, h]) => {
      if (i < a - 2 || i > b + 2) return false;
      const t = (i - a) / (b - a), y = oh - 1 - h * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      return Math.abs(j - y) <= 2 && j <= oh - 1;
    }), (i, j) => (j < 6 ? 'wood2' : (i + j) % 5 === 0 ? 'wood5' : 'wood4'));
    for (const [i, j, h] of [[7, 5, 4], [12, 5, 3], [15, 9, 2]]) rect(root.getContext('2d'), i, j, 1, h, 'wood5');   // rootlets hanging off the loop
    const rock = shape(ow, oh, (i, j) => ((i - 9.5) / 8.5) ** 2 + ((j - 13) / 8) ** 2 <= 1, (i, j) =>
      (j < 7 && (i * 3 + j) % 5 < 3 ? 'leaf2' : i + j < 14 ? 'stone1' : i + j > 24 ? 'stone4' : 'stone2'));
    for (const [i, j] of [[6, 9], [7, 9], [13, 10]]) dot(rock.getContext('2d'), i, j, 'white');
    const coral = shape(ow, oh, (i, j) => i > 0 && i < 19 && (j > 7 || (j > 2 && i > 6)), (i, j) =>   // a step cut from bleached coral rag, its pores dark
      (j === 3 || (j === 8 && i < 7) ? 'white' : (i * 7 + j * 3) % 8 === 0 ? 'dirt3' : i > 16 || j > 11 ? 'cream2' : 'cream1'));
    put('hill_obstacle', strip([root, rock, coral]), { frames: 3 });

    // the mid-hill pennant on its cairn: furled, then flying the courier's green
    put('hill_flag', strip([0, 1, 2].map(f => {
      const [c, x] = canvas(18, 32);
      for (let j = 3; j < 29; j++) { rect(x, 3, j, 3, 1, 'ink'); dot(x, 4, j, 'wood2'); }
      rect(x, 2, 1, 5, 3, 'ink'); rect(x, 3, 2, 3, 1, 'brass1');
      if (f === 0) { rect(x, 6, 4, 3, 9, 'ink'); rect(x, 6, 5, 2, 7, 'cream2'); }
      else for (let k = 0; k < 7; k++) {
        const len = 12 - Math.abs(k - 3) * 3, y = 4 + k + (f === 2 && k > 3 ? 0 : 0);
        for (let i = 0; i <= len; i++) dot(x, 6 + i, y + Math.round(Math.sin((i + f * 2) / 2.2) * (i / 12)), k === 0 || k === 6 || i === len ? 'ink' : k < 3 ? 'cap1' : 'cap2');
      }
      x.drawImage(shape(14, 6, (i, j) => ((i - 6.5) / 7) ** 2 + ((j - 5.5) / 6) ** 2 <= 1, (i, j) => (i + j < 7 ? 'stone1' : j > 3 ? 'stone3' : 'stone2')), 0, 26);
      return c;
    })), { frames: 3 });

    // the trail: a wooden rail with brass ends, the mid-hill pennant on it and the top's flag at its end; the cap rides it
    const [trail, trx] = canvas(90, 11);
    trx.drawImage(box(90, 5, 1, { o: 'ink', fill: 'wood2', hi: 'wood1', lo: 'wood3' }), 0, 4);
    for (const i of [0, 86]) { rect(trx, i, 3, 4, 7, 'ink'); rect(trx, i + 1, 4, 2, 5, 'brass1'); }
    rect(trx, 44, 0, 1, 5, 'ink'); rect(trx, 45, 0, 3, 2, 'cap2');   // the pennant at half way
    rect(trx, 84, 0, 1, 5, 'ink'); rect(trx, 85, 0, 3, 2, 'light3');
    put('trail', trail);
    put('trail_cap', sprite(['..ooo..', '.occco.', 'occcbco', 'obbbbbo', 'ooooooo', '.....oo'], { o: 'ink', c: 'cap1', b: 'cap3' }));
  }

  /* Minigame 7, the melody of home: Ratih's walnut sewing table close up (its top with her pincushion, spools, thimble
     and patchwork round a lace doily, the apron over turned legs, the bedroom floor under it); the walnut music box
     Daniel carved, lid up with a little house carved in it, its pinned brass cylinder turning in four steps over the
     steel comb (and again with a tooth just plucked) and its governor fan spinning; the brass crank with its wooden grip
     in sixteen steps of a turn clockwise from straight up; the arrow showing which way the grip goes next; a note rising
     off the comb (one, then two beamed); and the hidden spring drawer in the apron, flush and all but unseen, then
     sliding out 2 px a frame with the family photo lying in it. */
  function melody(put) {
    const lit = (i, j, cx, cy, ramp) => ramp[(i - cx) + (j - cy) < -1 ? 0 : (i - cx) + (j - cy) > 1 ? 2 : 1];
    const [tb, tx] = canvas(200, 96);
    // the bedroom floor under the table, the table's hard shadow on it, the turned legs, then the top and its apron
    rect(tx, 0, 56, 200, 40, 'wood1');
    for (const j of [64, 73, 82, 91]) rect(tx, 0, j, 200, 1, 'wood2');
    for (const [i, j] of [[38, 65], [120, 74], [70, 83], [164, 65], [24, 92], [150, 92], [96, 65]]) rect(tx, i, j, 1, 8, 'wood2');
    rect(tx, 0, 70, 200, 5, 'wood2');
    const LEG = [4, 4, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4];   // its half-widths below the apron, tapering to a foot
    const leg = shape(11, 40, (i, j) => Math.abs(i - 5) <= (j < 14 ? 5 : LEG[j - 14]), i => (i < 4 ? 'wood2' : i > 6 ? 'wood4' : 'wood3'));
    for (const i of [6, 183]) { rect(tx, i - 1, 93, 13, 3, 'wood2'); tx.drawImage(leg, i, 56); }
    tx.drawImage(shape(200, 70, () => true, (i, j) =>
      j < 52 ? ([12, 25, 38].includes(j) ? 'wood4' : j === 1 || i === 1 ? 'wood2' : 'wood3')   // the top's walnut planks
        : j === 52 ? 'wood1' : j < 55 ? 'wood2' : j === 55 ? 'wood5'                         // its lit front edge
          : j === 56 ? 'wood5' : j === 66 ? 'wood3' : j === 67 ? 'wood2' : 'wood4'), 0, 0);   // the apron and its bead
    for (const [i, j, n] of [[30, 5, 9], [150, 18, 12], [160, 4, 7], [14, 31, 10], [176, 44, 8], [10, 18, 6]]) rect(tx, i, j, n, 1, 'wood2');   // a few streaks of grain
    for (const i of [11, 188]) { rect(tx, i - 2, 59, 5, 5, 'wood5'); rect(tx, i - 1, 60, 3, 3, 'wood3'); dot(tx, i - 1, 60, 'wood2'); }   // rosettes over the legs

    // Ratih's lace doily, the box sits on it
    for (let j = -6; j <= 6; j++) for (let i = -52; i <= 52; i++) {
      const r = (i / 52) ** 2 + (j / 6.5) ** 2;
      if (r > 1) continue;
      dot(tx, 98 + i, 46 + j, r > 0.82 ? (Math.cos(Math.atan2(j * 8, i) * 20) > 0.2 ? 'white' : 'cream2') : r > 0.6 && (i + 2 * j) % 4 === 0 ? 'cream1' : 'white');
    }
    // the tomato pincushion, its pins, a red thread trailing off to the spool
    rect(tx, 10, 41, 20, 3, 'wood4');
    tx.drawImage(shape(19, 13, (i, j) => ((i - 9) / 9.4) ** 2 + ((j - 7) / 5.6) ** 2 <= 1, (i, j) =>
      [4, 9, 14].includes(i) && j > 3 ? 'roofR3' : (i - 9) + (j - 7) < -5 ? 'rose' : (i - 9) + (j - 7) > 5 ? 'roofR3' : 'red'), 10, 30);
    rect(tx, 16, 30, 7, 2, 'leaf2'); dot(tx, 19, 29, 'leaf3'); dot(tx, 17, 30, 'leaf1');
    for (const [i, j, k] of [[12, 29, 'yellow'], [26, 27, 'blue'], [21, 26, 'white'], [8, 33, 'lilac']]) {
      line(tx, i, j, i + Math.sign(19 - i) * 2, j + 3, 'iron1'); rect(tx, i - 1, j - 1, 2, 2, 'ink'); dot(tx, i, j, k);
    }
    for (let i = 30; i < 38; i++) dot(tx, i, 38 + Math.round(Math.sin(i / 2) * 1.5), 'red');
    // two spools, red thread and blue, standing
    const spool = (i, j, thread, lo) => {
      rect(tx, i - 1, j + 9, 12, 2, 'wood4');
      tx.drawImage(shape(10, 11, (a, b) => (b < 2 || b > 8 ? true : a > 0 && a < 9), (a, b) =>
        b < 2 ? 'wood1' : b > 8 ? 'wood2' : a < 3 ? thread : b % 2 ? lo : thread), i, j);
    };
    spool(36, 20, 'red', 'roofR3'); spool(30, 8, 'blue', 'roofB2');
    // the brass thimble and a little stack of her patchwork squares
    rect(tx, 160, 33, 9, 2, 'wood4');
    tx.drawImage(shape(7, 8, (i, j) => Math.abs(i - 3) <= 2 + (j > 2 ? 1 : 0) && !(j === 0 && Math.abs(i - 3) > 1), (i, j) =>
      (i + j) % 3 === 0 && j > 1 && j < 6 ? 'brass3' : i < 3 ? 'brass0' : 'brass1'), 161, 26);
    for (const [i, j, k, d] of [[174, 34, 'roofB1', 'white'], [177, 30, 'pink', 'rose'], [172, 26, 'roofG1', 'cream0']]) {
      rect(tx, i + 1, j + 9, 18, 2, 'wood4');
      tx.drawImage(shape(18, 10, () => true, (a, b) => ((a + 2 * b) % 6 === 0 ? d : k)), i, j);
    }
    put('mbox_table', tb);

    const [bw, bh] = [88, 50];
    put('mbox_box', strip([0, 1].flatMap(pluck => [0, 1, 2, 3].map(phase => {
      const [c, x] = canvas(bw, bh);
      const flare = j => Math.round((13 - j) / 4);   // the lid leans back, wider at its top edge
      x.drawImage(shape(84, bh, (i, j) => (j < 13 ? i >= 4 - flare(j) && i < 80 + flare(j) : j < 45 || (i > 2 && i < 11) || (i > 72 && i < 81)), (i, j) =>
        j < 13 ? (i < 7 - flare(j) || i > 76 + flare(j) || j < 2 ? 'wood2' : j > 11 ? 'roofR3' : 'roofR2')   // the lid, up: rose velvet framed in walnut
          : j < 25 ? (i < 4 || i > 79 ? 'wood3' : j === 13 ? 'wood1' : 'wood5')     // the open top, dark inside
            : j < 45 ? (j < 26 ? 'wood1' : j > 41 ? 'wood3' : i < 3 ? 'wood1' : 'wood2')   // the front, lit along its lip
              : lit(i, j, i < 11 ? 6 : 76, 47, ['brass0', 'brass1', 'brass2'])), 0, 0);    // the brass bun feet
      // the carved house in the lid's inlay: its roof, a lit window, the door, a leaf either side
      rect(x, 27, 2, 30, 9, 'ink'); rect(x, 28, 2, 28, 8, 'wood1'); rect(x, 28, 9, 28, 1, 'wood2');
      line(x, 34, 7, 42, 2, 'wood4'); line(x, 42, 2, 50, 7, 'wood4');
      rect(x, 36, 7, 13, 4, 'wood4'); rect(x, 37, 7, 11, 3, 'wood2'); rect(x, 38, 8, 2, 1, 'light2'); rect(x, 45, 8, 1, 3, 'wood5');
      for (const i of [31, 53]) { dot(x, i, 5, 'leaf3'); dot(x, i + 1, 6, 'leaf3'); dot(x, i - 1, 7, 'wood4'); }
      for (const i of [15, 67]) { rect(x, i, 11, 3, 4, 'ink'); rect(x, i + 1, 11, 1, 3, 'brass1'); }   // the brass hinges
      // inside: the spring barrel, the pinned brass cylinder turning, the governor fan, the steel comb before them
      rect(x, 7, 15, 10, 8, 'brass2'); for (let i = 8; i < 17; i += 2) rect(x, i, 15, 1, 8, 'brass3'); rect(x, 7, 15, 10, 1, 'brass1');
      ['brass0', 'brass1', 'brass1', 'brass2', 'brass2', 'brass3', 'brass4'].forEach((k, j) => rect(x, 20, 14 + j, 44, 1, k));
      rect(x, 19, 14, 1, 7, 'ink'); rect(x, 64, 14, 1, 7, 'ink');
      for (let k = 0; k < 14; k++) dot(x, 21 + 3 * k, 14 + (k * 3 + phase) % 6, 'white');
      const fan = phase % 2;
      rect(x, 71, 15, 1, 8, 'iron2'); rect(x, fan ? 68 : 70, fan ? 18 : 15, fan ? 7 : 3, fan ? 2 : 8, 'iron1');
      rect(x, 20, 24, 45, 1, 'iron3');
      for (let i = 21; i < 64; i += 2) rect(x, i, 21, 1, 3, 'iron0');
      if (pluck) { const i = 21 + 2 * ((phase * 7 + 3) % 21); rect(x, i, 21, 1, 3, 'white'); dot(x, i, 20, 'light1'); dot(x, i - 1, 19, 'light0'); dot(x, i + 1, 19, 'light0'); }
      // the front: Daniel's carved vine along it, the brass keyhole, brass caps on the corners
      for (let i = 9; i < 75; i++) {
        const j = 35 + Math.round(Math.sin(i / 4) * 2);
        dot(x, i, j, 'wood4');
        if (i % 8 === 2) { rect(x, i, j - 3, 2, 2, 'wood4'); dot(x, i, j - 3, 'wood1'); }
        if (i % 8 === 6) { rect(x, i, j + 2, 2, 2, 'wood4'); dot(x, i, j + 2, 'wood1'); }
      }
      rect(x, 39, 30, 7, 10, 'ink'); rect(x, 40, 31, 5, 8, 'brass1'); rect(x, 40, 31, 5, 1, 'brass0'); rect(x, 41, 33, 3, 2, 'ink'); rect(x, 42, 35, 1, 2, 'ink');
      for (const [i, fi] of [[1, 1], [77, -1]]) for (const [j, fj] of [[26, 1], [39, -1]]) {
        const ci = fi > 0 ? i : i + 5, cj = fj > 0 ? j : j + 5;
        rect(x, i, cj, 6, 1, 'brass1'); rect(x, ci, j, 1, 6, 'brass1'); dot(x, ci, cj, 'brass0');
      }
      rect(x, 11, 45, 62, 2, 'cream2');   // its shadow on the lace
      // the crank's arbor out through the right side
      rect(x, 84, 31, 4, 5, 'ink'); rect(x, 84, 32, 3, 3, 'brass2'); rect(x, 84, 32, 3, 1, 'brass1');
      return c;
    }))), { frames: 8 });

    put('mbox_crank', strip(Array.from({ length: 16 }, (_, f) => {
      const a = f * Math.PI / 8, m = 14, R = 11, kx = m + Math.sin(a) * R, ky = m - Math.cos(a) * R;
      const seg = (i, j) => { const t = Math.max(0, Math.min(1, ((i - m) * (kx - m) + (j - m) * (ky - m)) / (R * R))); return Math.hypot(i - m - t * (kx - m), j - m - t * (ky - m)); };
      const grip = (i, j) => Math.hypot(i - kx, j - ky) <= 3.3, boss = (i, j) => Math.hypot(i - m, j - m) <= 3.2;
      const img = shape(29, 29, (i, j) => grip(i, j) || boss(i, j) || seg(i, j) <= 1.3, (i, j) =>
        grip(i, j) ? lit(i, j, kx, ky, ['wood0', 'wood1', 'wood3'])                  // the turned wooden grip
          : boss(i, j) ? lit(i, j, m, m, ['brass0', 'brass1', 'brass3'])            // the brass boss
            : (i - m) + (j - m) < (kx - m) + (ky - m) ? 'brass1' : 'brass2');
      dot(img.getContext('2d'), m, m, 'iron2');
      return img;
    })), { frames: 16 });

    const arrow = sprite(['.oo....', '.oao...', '.obbo..', '.obbbo.', '.obco..', '.oco...', '.oo....'], { o: 'ink', a: 'light1', b: 'brass1', c: 'brass2' });
    put('mbox_way', strip([arrow, PX.flip(arrow)]), { frames: 2 });

    const K = { o: 'ink', w: 'white', c: 'cream1' };
    put('mbox_note', strip([
      sprite(['....oo...', '....owo..', '....owwo.', '....owcwo', '....ow.oo', '..oooo...', '.owwwo...', '.owwco...', '..ooo....', '.........'], K),
      sprite(['..ooooooo', '..owwwwwo', '..owoooow', '..ow...ow', '..ow...ow', 'oooo.oooo', 'owwwoowwo', 'owwcoowco', '.ooo..ooo', '.........'], K),
    ]), { frames: 2 });

    // the drawer's inside, 20 rows of it from its back to its front: plain pine walls and floor, the photo lying there
    const [inner, ix] = canvas(56, 20);
    rect(ix, 0, 0, 56, 20, 'dirt1'); rect(ix, 0, 0, 56, 3, 'dirt3'); rect(ix, 0, 0, 56, 1, 'wood4');
    for (const [i, k] of [[0, 'ink'], [1, 'wood2'], [2, 'wood3'], [53, 'wood3'], [54, 'wood4'], [55, 'ink']]) rect(ix, i, 0, 1, 20, k);
    rect(ix, 16, 5, 27, 15, 'dirt2');   // the photo's shadow
    rect(ix, 14, 3, 27, 16, 'ink'); rect(ix, 15, 4, 25, 14, 'cream0');
    rect(ix, 17, 6, 21, 10, 'wood1'); rect(ix, 17, 6, 21, 3, 'light2'); rect(ix, 17, 14, 21, 2, 'wood2'); rect(ix, 33, 7, 3, 3, 'white');   // the kitchen, warm, its window
    const head = (i, j, k, r) => { for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) if (a * a + b * b <= r * r + 1) dot(ix, i + a, j + b, a * a + b * b > (r - 1) * (r - 1) + 1 ? 'ink' : k); };
    head(21, 11, 'ant2', 3); head(34, 11, 'ant1', 3); head(27, 12, 'ant0', 2);   // Daniel, Ratih, and little Satria between them
    for (const [i, j] of [[19, 7], [23, 7], [32, 7], [36, 7], [26, 9], [28, 9]]) dot(ix, i, j, 'ink');   // their antennae
    rect(ix, 32, 9, 5, 1, 'rose');   // her headscarf
    for (const [i, j] of [[22, 12], [35, 12], [27, 13]]) dot(ix, i, j, 'pupil');   // laughing
    rect(ix, 24, 15, 7, 2, 'yellow'); dot(ix, 23, 15, 'leaf2'); dot(ix, 31, 16, 'leaf2'); dot(ix, 26, 15, 'orange');   // the grilled corn
    dot(ix, 39, 4, 'white');
    put('mbox_drawer', strip(Array.from({ length: 11 }, (_, k) => {
      const [c, x] = canvas(56, 34), out = 2 * k;
      if (out) x.drawImage(inner, 0, 20 - out, 56, out, 0, 0, 56, out);
      if (k) {
        rect(x, 0, out + 12, 56, 2, 'wood2');   // its shadow on the floor
        x.drawImage(box(56, 12, 0, { o: 'ink', fill: 'wood4', hi: 'wood3', lo: 'wood5' }), 0, out);
        rect(x, 1, out + 1, 54, 1, 'wood2');
      } else { rect(x, 0, 0, 1, 9, 'wood5'); rect(x, 55, 0, 1, 9, 'wood5'); }   // shut: only its hairline seams in the apron
      return c;
    })), { frames: 11 });
  }

  function contract(put) {
    put('deed_view', strip(['smile', 'surprised'].map(mood => {
      const [c, x] = canvas(200, 84);
      [[0, 'sky3'], [12, 'sky2'], [28, 'sky1'], [42, 'sky0']].forEach(([j, k]) => rect(x, 0, j, 200, 84 - j, k));
      for (const [i, j, w] of [[30, 10, 26], [138, 18, 34]]) {   // two flat clouds
        rect(x, i, j, w, 4, 'cloud0'); rect(x, i + 4, j - 3, w * 0.45, 3, 'cloud0'); rect(x, i + w * 0.5, j - 2, w * 0.3, 2, 'cloud0'); rect(x, i + 2, j + 4, w - 4, 1, 'cloud2');
      }
      rect(x, 0, 48, 200, 7, 'water2'); rect(x, 0, 48, 200, 1, 'water1'); rect(x, 0, 54, 200, 1, 'water3');
      for (const [i, j] of [[12, 50], [58, 52], [96, 50], [150, 51], [182, 50], [120, 53]]) rect(x, i, j, 5, 1, 'water1');
      rect(x, 0, 55, 200, 29, 'stone1');   // the forecourt's flags
      for (let j = 59; j < 84; j += 7) {
        rect(x, 0, j, 200, 1, 'stone2');
        for (let i = (j % 14 ? 0 : 9); i < 200; i += 18) rect(x, i, j - 6, 1, 6, 'stone2');
      }
      // the hall's corner on the left, a lamp post on the right
      x.drawImage(shape(26, 56, (i, j) => j < 6 ? i < 26 : i < 22, (i, j) => (j < 6 ? (j < 2 ? 'roofR1' : 'roofR2') : i > 14 && i < 20 ? (i === 15 ? 'stone0' : 'stone2') : j > 50 ? 'wall3' : 'wall1')), 0, 0);
      rect(x, 3, 14, 9, 14, 'ink'); rect(x, 4, 15, 7, 12, 'roofB0'); rect(x, 4, 21, 7, 1, 'ink'); rect(x, 7, 15, 1, 12, 'ink');
      rect(x, 186, 20, 3, 40, 'ink'); rect(x, 187, 21, 1, 38, 'iron2');
      x.drawImage(shape(9, 10, (i, j) => j > 0 && Math.abs(i - 4) <= (j < 3 ? j + 1 : 4), (i, j) => (j < 3 ? 'iron3' : i === 4 || j === 9 ? 'iron3' : 'light1')), 183, 11);
      // the village watching from the edges of the square
      for (const [id, i, j, dir] of [['mia', 34, 72, 1], ['baker', 52, 76, 1], ['nora', 22, 80, 1], ['helen', 150, 74, -1], ['sam', 168, 77, -1], ['pip', 158, 82, -1]])
        CH.draw(x, id, 'idle', 0, i, j, dir);
      x.drawImage(CH.portrait('valdo', 0, mood), 76, 36);
      return c;
    })), { frames: 2 });

    // The deed, untorn: cream paper with its shading, title and rules, the lines of terms, the fold, the signatures and stamps.
    const W = 60, H = 70, r = PX.rng(1972);
    const [deed, dx] = canvas(W, H);
    rect(dx, 0, 0, W, H, 'cream0'); rect(dx, W - 3, 0, 3, H, 'cream1'); rect(dx, 0, H - 3, W, 3, 'cream1'); rect(dx, 1, 1, W - 4, 1, 'white'); rect(dx, 1, 1, 1, H - 4, 'white');
    PX.text(dx, 'DEED OF SALE', 8, 4, 'ink');
    rect(dx, 6, 11, 48, 1, 'roofR3'); rect(dx, 6, 13, 48, 1, 'roofR3');
    for (let j = 17; j < 48; j += 4) for (let i = 6; i < (j === 45 ? 34 : 54);) { const n = 2 + Math.floor(r() * 6); rect(dx, i, j, Math.min(n, 54 - i), 1, 'stone3'); i += n + 2; }
    rect(dx, 1, 33, W - 2, 1, 'cream2'); rect(dx, 1, 34, W - 2, 1, 'white');   // the fold from the bag
    for (let b = -6; b <= 6; b++) for (let a = -6; a <= 6; a++) { const d = Math.hypot(a, b); if (d > 4.6 && d < 6.2) dot(dx, 15 + a, 57 + b, 'roofB2'); }
    PX.text(dx, 'V&C', 10, 55, 'roofB2');
    for (let i = 0; i < 20; i++) dot(dx, 6 + i, 58 + Math.round(Math.sin(i * 0.9) * 2.5 - i * 0.15), 'ink');   // his flourish
    line(dx, 25, 55, 28, 61, 'ink');
    for (let i = 33; i < 46; i += 2) dot(dx, i, 63, 'stone3');
    line(dx, 30, 60, 32, 62, 'ink'); line(dx, 32, 60, 30, 62, 'ink');
    rect(dx, 46, 50, 11, 14, 'rose'); for (let i = 46; i < 57; i += 2) { dot(dx, i, 50, 'white'); dot(dx, i, 63, 'white'); } for (let j = 50; j < 64; j += 2) { dot(dx, 46, j, 'white'); dot(dx, 56, j, 'white'); }
    rect(dx, 48, 52, 7, 10, 'pink'); rect(dx, 50, 54, 3, 3, 'yellow'); rect(dx, 49, 59, 5, 1, 'rose');   // the revenue stamp
    const src = dx.getImageData(0, 0, W, H).data;
    const at = (u, j) => { const p = (j * W + u) * 4; return `rgb(${src[p]},${src[p + 1]},${src[p + 2]})`; };
    const tear = j => 30 + Math.round(1.3 * Math.sin(j * 1.1) + 0.8 * Math.sin(j * 2.7 + 1));
    // Draws what is in `cell(i, j)` (a colour, 'fibre' at a torn edge, or null for nothing), inked round its outline.
    const paint = (w, h, cell) => {
      const [c, x] = canvas(w, h), got = (i, j) => i >= 0 && j >= 0 && i < w && j < h && cell(i, j) != null;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const v = cell(i, j);
        if (v == null) continue;
        const edge = !(got(i - 1, j) && got(i + 1, j) && got(i, j - 1) && got(i, j + 1));
        dot(x, i, j, edge ? 'ink' : v === 'fibre' ? 'white' : v);
      }
      return c;
    };
    const OX = 8, OY = 2;
    put('deed', strip(Array.from({ length: 9 }, (_, k) => {
      const depth = Math.round(H * k / 8), spread = k * 0.75;
      return paint(W + 2 * OX, H + 2 * OY, (i, j) => {
        const v = j - OY, u = i - OX;
        if (v < 0 || v >= H) return null;
        const s = v < depth ? Math.round(spread * (depth - v) / depth) : 0, t = tear(v);
        if (v >= depth) return u >= 0 && u < W ? at(u, v) : null;
        if (u + s >= 0 && u + s < t) return u + s >= t - 1 ? 'fibre' : at(u + s, v);
        if (u - s >= t && u - s < W) return s === 0 && u - s === t ? null : u - s === t ? 'fibre' : at(u - s, v);
        return null;
      });
    })), { frames: 9 });
    // the halves torn apart: the left one 1 px in from its frame's corner, the right one 21 px out to the left of its own
    put('deed_half', strip([0, 1].map(side => paint(40, H + 2, (i, j) => {
      const v = j - 1, u = side ? i + 21 : i - 1;
      if (v < 0 || v >= H || u < 0 || u >= W || (u < tear(v)) !== !side) return null;
      return u === tear(v) - 1 || u === tear(v) ? 'fibre' : at(u, v);
    }))), { frames: 2 });

    // Satria's hand at the left edge, its pincers open and then shut on the paper, and the right one the same, mirrored
    const hand = grip => shape(18, 16, (i, j) => (i < 9 && j >= 6 && j <= 10) || ((i - 9.5) / 3.8) ** 2 + ((j - 8) / 4.2) ** 2 <= 1 ||
      (i >= 10 && i <= 16 && (grip ? (j >= 5 && j <= 7) || (j >= 9 && j <= 11) : (j >= 2 + (i - 10) * 0.3 && j <= 4 + (i - 10) * 0.3) || (j >= 12 - (i - 10) * 0.3 && j <= 14 - (i - 10) * 0.3))),
    (i, j) => (i === 4 && j > 6 && j < 10 ? 'ant3' : i < 7 ? (j === 6 ? 'ant0' : j > 9 ? 'ant2' : 'ant1')
      : i > 13 ? (j < 8 ? 'ant1' : 'ant2') : (i - 9) + (j - 8) < -2 ? 'ant0' : (i - 9) + (j - 8) > 2 ? 'ant2' : 'ant1'));
    const hands = [hand(false), hand(true)];
    put('deed_grip', strip([...hands, ...hands.map(h => PX.flip(h))]), { frames: 4 });

    put('deed_scrap', strip([0, 1].flatMap(kind => [0, 1, 2, 3].map(f => {
      const a = f * Math.PI / 4 + 0.3, squash = [1, 0.75, 0.45, 0.75][f], cs = Math.cos(a), sn = Math.sin(a);
      const at = (i, j) => { const p = i - 5, q = j - 5; return [p * cs + q * sn, (-p * sn + q * cs) / squash]; };
      return shape(11, 11, (i, j) => { const [u, w] = at(i, j); return Math.abs(u) <= 4.4 && Math.abs(w) <= 3.6 - u * 0.15; }, (i, j) => {
        const [u, w] = at(i, j);
        if (kind && u > 0.5 && w < 0) return 'rose';
        return f === 2 ? 'cream1' : Math.abs(w) < 0.7 && Math.abs(u) < 3 ? 'stone3' : 'cream0';
      });
    }))), { frames: 8 });
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
    rain(put);
    bench(put);
    kneading(put);
    clockwork(put);
    harvest(put);
    stitching(put);
    melody(put);
    contract(put);
    resoling(put);
    sprint(put);
    vault(put);
    restoring(put);
    cliff(put);
    darkroom(put);
    tuning(put);
    ledger(put);
    put('title', TITLE.render(10 * 60 + 17));   // the clock in the O stopped at 10:17, the hour the station's watch stopped
    json('ui/ui.json', spec);
    // Every PAL colour as #rrggbb; the translucent cast shadow becomes #rrggbbaa.
    const hex = v => (v[0] === '#' ? v : '#' + v.match(/[\d.]+/g).map((n, i) => Math.round(i < 3 ? n : n * 255).toString(16).padStart(2, '0')).join(''));
    json('ui/palette.json', Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, hex(v)])));
  }

  PARTS.cast = () => { chars(); ui(); };
})();
