'use strict';
/* Ant cast for "The Shop That Opens Once" (v2). Every pixel is authored here in code:
   ASCII part grids (head, abdomen, torso + clothes, hats) wrapped in a 1 px ink outline,
   plus thin ink limbs (legs placed by a tiny two-bone IK, arms by explicit elbows).
   Defines window.CH per ART.md "Character contract": 40x40 frames, body faces RIGHT, feet at (20, 37). */
(() => {
  const { canvas, sprite, outline, flip, shadow } = PX;

  // Extra colours, hue-shifted from the PX ramps (12).
  const XC = {
    moss0: '#d6e38c', moss1: '#a8c25c', moss2: '#7c9b45', moss3: '#58733a',   // Marlow's waistcoat
    slate0: '#c6d2f2', slate1: '#97a9da', slate2: '#6f81b9',                  // Helen's cardigan
    dusty0: '#ffd2da', dusty1: '#f2a6b6', dusty2: '#cf7d94',                  // Nora's headscarf
    lilac2: '#9d84de', pink0: '#ffd4ea',
  };
  const R = k => XC[k] || k;
  // PX raster primitives that also understand the extra colour keys above.
  const rect = (g, x, y, w, h, c) => PX.rect(g, x, y, w, h, R(c));
  const dot = (g, x, y, c) => PX.dot(g, x, y, R(c));
  const line = (g, x0, y0, x1, y1, c) => PX.line(g, x0, y0, x1, y1, R(c));
  const ellipse = (g, cx, cy, rx, ry, c) => PX.ellipse(g, cx, cy, rx, ry, R(c));
  const keyed = key => { const o = {}; for (const c in key) o[c] = R(key[c]); return o; };
  const grid = (rows, key) => sprite(rows, keyed(key));
  // ASCII grid wrapped in a 1 px ink outline (same result as PX.outline(grid), computed from the rows: no readback).
  function outlined(rows, key) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), k = keyed(key);
    const on = (i, j) => j >= 0 && j < h && i >= 0 && i < w && rows[j][i] !== undefined && rows[j][i] !== '.' && rows[j][i] !== ' ';
    const [c, x] = canvas(w + 2, h + 2);
    x.fillStyle = PX.PAL.ink;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++)
      if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) x.fillRect(i + 1, j + 1, 1, 1);
    x.drawImage(sprite(rows, k), 1, 1);
    return c;
  }

  // Scratch buffers that get outlined every render: CPU-backed so PX.outline's getImageData stays cheap.
  function scratch(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; return [c, x];
  }

  const cache = new Map();
  const memo = (k, f) => { let v = cache.get(k); if (v === undefined) { v = f(); cache.set(k, v); } return v; };

  /* ---------------- shared body grids (fill only; outlines are added) ---------------- */
  const BK = { a: 'ant0', b: 'ant1', c: 'ant2', d: 'ant3', e: 'ant4' };
  const HEAD = {
    A: ['..aabbbb..',
        '.abbbbbbbc',
        'abbbbbbbcc',
        'bbbbbbbccc',
        'bbbbbbcccc',
        'bbbbcccccc',
        'bccccccccc',
        '.cccccccdd',
        '.dcccccdd.',
        '...ddddd..'],
    K: ['..aabbb..',
        '.abbbbbbc',
        'abbbbbbcc',
        'bbbbbbccc',
        'bbbbccccc',
        'bcccccccd',
        '.cccccccd',
        '.dccccdd.',
        '...ddd...'],
  };
  const ABD = {
    A: ['...bbbb..',
        '.bbabbbb.',
        'bbaabbbbc',
        'bbbbbbccc',
        'cbbbccccc',
        '.ccccccd.',
        '...dddd..'],
    K: ['..bbb..',
        '.babbbc',
        'baabbcc',
        'bbbcccc',
        '.ccccd.',
        '..ddd..'],
  };

  // Layout (fill origins) for adults (A) and children (K). Feet on y = 37.
  // ant: antenna pixel paths from a base on the head's top outline (a 2x2 club is added at the tip).
  const LAY = {
    A: { head: [20, 14], torso: [16, 23], abd: [8, 25], hipF: [20, 31], hipB: [17, 31], shN: [19, 26], shF: [17, 26],
         leg: 8, eye: [5, 4], mouth: [6, 8], step: 3, lift: 2, arm: 4,
         ant: [{ base: [2, -1], path: [[0, -1], [0, -2], [1, -3], [1, -4], [2, -5], [2, -6]] },
               { base: [6, -1], path: [[0, -1], [1, -2], [1, -3], [2, -4], [2, -5], [3, -6]] }] },
    K: { head: [19, 19], torso: [17, 27], abd: [11, 28], hipF: [20, 33], hipB: [18, 33], shN: [19, 29], shF: [17, 29],
         leg: 6, eye: [4, 3], mouth: [5, 7], step: 2, lift: 1, arm: 3,
         ant: [{ base: [2, -1], path: [[0, -1], [0, -2], [1, -3], [1, -4]] },
               { base: [5, -1], path: [[0, -1], [1, -2], [1, -3], [2, -4]] }] },
  };

  // Eyes: '.' keeps the head colour. w cream0, h white, p pupil, k ink.
  const EK = { w: 'cream0', h: 'white', p: 'pupil', k: 'ink' };
  const EYE = {
    open:   ['.ww.', 'wwph', 'wwpp', '.ww.'],
    blink:  ['....', '....', 'kkkk', '....'],
    happy:  ['....', '.kk.', 'k..k', '....'],
    closed: ['....', '....', 'kkkk', '.kk.'],
    squint: ['....', 'kkkk', 'wwph', '.ww.'],
  };
  const MK = { k: 'ink', r: 'roofR4' };
  const MOUTH = {
    closed: ['.kk', '...'],
    smile:  ['k..', '.k.'],
    open:   ['.kr', '.kk'],
    sad:    ['.kk', 'k..'],
  };

  /* ---------------- cast ---------------- */
  const CAP = { 1: 'cap0', 2: 'cap1', 3: 'cap2', 4: 'cap3', 5: 'cap4', w: 'cream0', v: 'cream1' };
  const CAST = {
    courier: { sleeve: ['ant1', 'ant2'],
      torso: { rows: ['.cccc4.', 'cccc43d', 'ccc43dd', 'cc43ddd', 'c43dddd', '43ddddd', '.dddde.', '..eee..'], key: { ...BK, 3: 'cap2', 4: 'cap3' } },
      bent: 1,
      parts: [
        { z: 'body', at: [-7, -3], rows: ['.222223.', '22ww2233', '22wv2233', '44444444', '33333334', '.444444.'], key: CAP },
        { z: 'hat', at: [-1, -1], rows: ['..12222223.....', '.12ww222333....', '122wv2233333...', '444444444443333'], key: CAP },
      ],
    },
    marlow: { sleeve: ['cream0', 'cream2'],
      torso: { rows: ['.mMMvw.', 'mMMMMvw', 'mMMMnow', 'MMMMnvw', 'MMMnnow', 'MMnnnvv', '.nnNNv.', '..NNN..'],
               key: { m: 'moss0', M: 'moss1', n: 'moss2', N: 'moss3', w: 'cream0', v: 'cream1', o: 'brass1' } },
      bent: 0, stoop: 1,
      parts: [
        { z: 'face', ol: false, at: [6, 3], rows: ['.oo.', 'o..o', 'o..o', 'o..o', '.oo.'], key: { o: 'brass1' } },
        { z: 'face', ol: false, at: [2, 4], rows: ['oooo'], key: { o: 'brass2' } },
        { z: 'face', ol: false, at: [6, 8], rows: ['.www', 'wwws'], key: { w: 'white', s: 'stone1' } },
        { z: 'face', ol: false, at: [0, 5], rows: ['w', 'w', 's'], key: { w: 'white', s: 'stone1' } },
      ],
    },
    mother: { sleeve: ['cream1', 'cream2'],
      torso: { rows: ['.GGGGg.', 'vGHHGGv', 'wvuvHGv', 'wvuvHGu', 'vvuvvHu', 'vvuvvuu', '.uuvuu.', '..uuu..'],
               key: { w: 'cream0', v: 'cream1', u: 'cream2', g: 'cap1', G: 'cap2', H: 'cap3' } },
      bent: 1, lash: true,
      parts: [],
    },
    helen: { sleeve: ['slate1', 'slate2'],
      torso: { rows: ['.yyyyY.', 'SyYYYyS', 'sSSYyYS', 'sSoSYYS', 'sSSSSYT', 'SSSSSTT', '.SSTTT.', '..TTT..'],
               key: { s: 'slate0', S: 'slate1', T: 'slate2', y: 'brass1', Y: 'brass2', o: 'brass0' } },
      lash: true,
      parts: [
        { z: 'hat', at: [-1, -1], rows: ['...sssss...', '.sssSSSSS..', 'ssSSSSSSTT.', 'sSSSSSTT...', 'sSSST......', 'sSST.......', 'sST........', 'ST.........'],
          key: { s: 'stone0', S: 'stone1', T: 'stone2' } },
        { z: 'hat', at: [-3, -3], rows: ['.ss.', 'sSSs', 'SSST', '.TT.'], key: { s: 'stone0', S: 'stone1', T: 'stone2' } },
      ],
    },
    mender: { sleeve: ['cream0', 'cream2', true],
      torso: { rows: ['.vvvMw.', 'wvvMMMw', 'wvLMMMM', 'vvLMMMN', 'vuLMMMN', 'uuLMMMN', '.uLMMMN', '..LMMN.', '..LMMN.', '..LMNN.'],
               key: { w: 'cream0', v: 'cream1', u: 'cream2', L: 'wood2', M: 'wood3', N: 'wood4' } },
      parts: [
        { z: 'face', ol: false, at: [0, 3], rows: ['ssssssss'], key: { s: 'wood4' } },
        { z: 'face', at: [8, 4], rows: ['122', '2t3', '2t3', '333'], key: { 1: 'brass0', 2: 'brass1', 3: 'brass2', t: 'water1' } },
        { z: 'face', at: [-1, 4], rows: ['ss', 'sS', 'S.'], key: { s: 'stone1', S: 'stone2' } },
      ],
    },
    traveller: { sleeve: ['brass1', 'brass2'],
      torso: { rows: ['.BBBBC.', 'ABBBCCB', 'ABBBBCk', 'ABBBBCC', 'ABBBBCk', 'ABBBBCC', 'BBBBCCC', 'BBBBCCD', 'BBBCCDD', '.CCDDD.'],
               key: { A: 'brass0', B: 'brass1', C: 'brass2', D: 'brass3', k: 'wood4' } },
      parts: [
        { z: 'hat', at: [-3, -4], rows: ['.....3333333....', '....32333333....', '....22222223....', '....wwwwwwww....', '1122222222222223', '..33333333333...'],
          key: { 1: 'wood1', 2: 'wood3', 3: 'wood4', w: 'cream1' } },
      ],
    },
    nora: { sleeve: ['lilac', 'lilac2'],
      torso: { rows: ['.llwwv.', 'lllwwvv', 'llLwvvv', 'lLLwvvu', 'lLLvuuu', 'LLLvuvu', 'LLLvvvv', 'LLLvvvu', '.LLvvu.'],
               key: { l: 'lilac', L: 'lilac2', w: 'cream0', v: 'cream1', u: 'cream2' } },
      lash: true,
      parts: [
        { z: 'hat', at: [-2, -1], rows: ['....11111...', '..111222222.', '.11222222222', '.12222223333', '.1222333....', '.1223.......', '12223.......', '2223........', '.33.........'],
          key: { 1: 'dusty0', 2: 'dusty1', 3: 'dusty2' } },
      ],
    },
    mia: { sleeve: ['roofG1', 'roofG2'],
      torso: { rows: ['.TTTww.', 'tTTTTww', 'tTTTUww', 'TTTTUww', 'TTTTUwv', 'TTTUUvv', '.TUUVV.', '..VVV..'],
               key: { t: 'roofG0', T: 'roofG1', U: 'roofG2', V: 'roofG3', w: 'cream0', v: 'cream1' } },
      lash: true,
      parts: [
        { z: 'hat', at: [-1, -1], rows: ['..2222222..', '.122222222.', '12222222223', '1222222333.', '12223333...', '1223.......', '123........', '123........', '233........', '.3.........'],
          key: { 1: 'wood2', 2: 'wood3', 3: 'wood4' } },
        { z: 'hat', ol: false, at: [5, 0], rows: ['yy'], key: { y: 'yellow' } },
      ],
    },
    grandkid: { kid: true, sleeve: ['pink', 'rose', true],
      torso: { dx: -1, rows: ['..RPPw..', '.RPPPPw.', '.RPPPPQ.', '.PPPPQQ.', 'PPPPPQQQ', 'PPPPQQQQ', '.PQQQQQ.'],
               key: { R: 'pink0', P: 'pink', Q: 'rose', w: 'white' } },
      lash: true,
      parts: [
        { z: 'hat', at: [1, -2], rows: ['PP.PP', 'PPQPP'], key: { P: 'pink', Q: 'rose' } },
      ],
    },
    theo: { sleeve: ['wood1', 'wood2'],
      torso: { rows: ['.gGGGH.', '1gGGHH2', '11GHH22', '111HH22', '1111H22', '1112223', '.12233.', '..333..'],
               key: { 1: 'wood1', 2: 'wood2', 3: 'wood3', g: 'stone1', G: 'stone2', H: 'stone3' } },
      parts: [
        { z: 'body', at: [4, 3], rows: ['1122', '2tt3', '2333'], key: { 1: 'iron1', 2: 'iron2', 3: 'iron3', t: 'water2' } },
        { z: 'hat', at: [-2, -2], rows: ['.....3......', '..2222222...', '.222222222..', '12222222233.'], key: { 1: 'roofB2', 2: 'roofB3', 3: 'roofB4' } },
      ],
    },
    leo: { sleeve: ['brass1', 'brass2'],
      torso: { rows: ['.gyyyw.', 'gGyyyyw', 'gGyyyyw', 'gGyyyYw', 'gGyyYYw', 'gGyYYYw', '.GYYYY.', '..ZZZ..'],
               key: { y: 'brass1', Y: 'brass2', Z: 'brass3', g: 'cap2', G: 'cap3', w: 'white' } },
      shoe: 'sneaker',
      parts: [
        { z: 'hat', at: [0, 1], rows: ['wwwwwwwwww', 'rrrrrrrrrr'], key: { w: 'white', r: 'red' } },
      ],
    },
    sam: { kid: true, sleeve: ['yellow', 'light3'],
      torso: { rows: ['.yYYY.', 'yYYYYk', 'yYYYYY', 'YYYYYk', 'YYYYOO', 'YYYOOO', '.YOOO.'],
               key: { y: 'light1', Y: 'yellow', O: 'light3', k: 'brass3' } },
      parts: [
        { z: 'neck', at: [-2, -1], rows: ['.yY.', 'yYYO', 'YYO.'], key: { y: 'light1', Y: 'yellow', O: 'light3' } },
        { z: 'body', at: [-3, 2], rows: ['2233', '2333', '3334'], key: { 2: 'wood1', 3: 'wood2', 4: 'wood3' } },
      ],
    },
    baker: { sleeve: ['sky2', 'sky3', true],
      torso: { rows: ['.bbbWw.', 'bbbbWww', 'bbbWwww', 'bBBWwww', 'bBBWwws', 'BBBWwss', '.BBWss.', '..Wwss.', '..Wsss.'],
               key: { b: 'sky2', B: 'sky3', W: 'cream0', w: 'white', s: 'stone1' } },
      villager: true, antTop: true,
      parts: [
        { z: 'hat', at: [0, -5], rows: ['.wwwwww.', 'wwwwwwws', 'wwwwwwss', '.wwwwss.', '.ssssss.'], key: { w: 'white', s: 'stone1' } },
      ],
    },
    gardener: { sleeve: ['orange', 'light4'],
      torso: { rows: ['.ooo2o.', 'oooo22o', 'ooo2112', 'oo21112', 'o221112', '2221113', '.22133.', '..233..'],
               key: { o: 'orange', 1: 'roofB1', 2: 'roofB2', 3: 'roofB3' } },
      villager: true,
      parts: [
        { z: 'hat', at: [-3, -2], rows: ['.....11111.....', '....1222222....', '...rrrrrrrr....', '112222222222223'],
          key: { 1: 'brass0', 2: 'dirt1', 3: 'dirt2', r: 'red' } },
      ],
    },
    kid: { kid: true, sleeve: ['white', 'stone1', true],
      torso: { rows: ['.wwww.', 'bbbbbB', 'wwwwws', 'bbbbbB', '.wwws.', '..bB..'], key: { w: 'white', s: 'stone1', b: 'blue', B: 'roofB2' } },
      villager: true,
      parts: [
        { z: 'hat', at: [-3, -1], rows: ['....12222...', '...1222223..', '3332222233..'], key: { 1: 'roofR0', 2: 'red', 3: 'roofR3' } },
      ],
    },
  };
  const IDS = Object.keys(CAST);

  /* ---------------- poses ---------------- */
  const POSES = { idle: 4, walk: 6, talk: 2, give: 2, receive: 2, carry: 2, carryWalk: 6, inspect: 2, wave: 2, sit: 2, moved: 2, run: 6 };
  const HAS = {};
  for (const id of IDS) {
    const s = ['idle', 'walk'];
    if (!CAST[id].villager) s.push('talk');
    if (['nora', 'mia', 'grandkid', 'theo', 'leo', 'sam', 'mother', 'marlow', 'courier', 'helen'].includes(id)) s.push('receive');
    if (['nora', 'mia', 'grandkid', 'theo', 'leo', 'sam', 'mother', 'marlow', 'courier'].includes(id)) s.push('give');
    if (id === 'courier') s.push('carry', 'carryWalk', 'inspect', 'wave', 'sit', 'moved');
    if (id === 'helen') s.push('sit', 'moved');
    if (id === 'marlow') s.push('wave');
    if (id === 'leo') s.push('run');
    HAS[id] = s;
  }
  const FALLBACK = { run: 'walk', carryWalk: 'walk', carry: 'idle', talk: 'idle' };
  const resolve = (id, pose) => {
    const s = HAS[id]; if (!s) throw new Error(`CH: unknown id '${id}'`);
    if (s.includes(pose)) return pose;
    return s.includes(FALLBACK[pose]) ? FALLBACK[pose] : 'idle';
  };
  const FPS = { idle: 4, walk: 10, run: 12, carryWalk: 9, talk: 6, give: 3, receive: 3, carry: 4, inspect: 3, wave: 5, sit: 2, moved: 2 };

  /* ---------------- rig: pose -> joint positions (sprite coords) ---------------- */
  // Two-bone IK for knees: returns the middle joint, bending forward.
  function knee(a, b, len) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const off = d < len ? Math.sqrt((len / 2) ** 2 - (d / 2) ** 2) : 0;
    return [Math.round((a[0] + b[0]) / 2 + off * dy / d), Math.round((a[1] + b[1]) / 2 - off * dx / d)];
  }

  // Walk: each foot is planted for 4 frames (sliding back `step` px per frame), then swings for 2.
  const WALKX = { 3: [4, 1, -2, -5, -2, 1], 2: [3, 1, -1, -3, -1, 1] };
  const walkFoot = (i, step) => WALKX[step][i], walkLift = (i, lift) => [0, 0, 0, 0, lift, 1][i];
  // Run: 2 planted frames, flight on frames 2 and 5.
  const RUNX = [3, -1, -4, -3, 0, 3], RUNL = [0, 0, 1, 3, 4, 2];

  function rig(ch, pose, f) {
    const S = ch.kid ? 'K' : 'A', L = LAY[S], k = ch.kid ? 1 : 0, G = 37;
    const r = { S, dx: 0, dy: 0, hx: ch.stoop || 0, hy: ch.stoop || 0, eye: 'open', mouth: 'closed', sway: 0, droop: 0, parcel: null, tear: false, hold: null };
    // three visible legs: the near pair alternates; the far leg (lighter, foot one row higher) mirrors the back one
    const leg3 = (fx, fl, bx, bl) => [
      { far: true, hip: L.hipF, foot: [L.hipF[0] + 1 + bx, G - 1 - bl] },
      { hip: L.hipB, foot: [L.hipB[0] + bx, G - bl] },
      { hip: L.hipF, foot: [L.hipF[0] + fx, G - fl] },
    ];
    let legs = [
      { far: true, hip: L.hipF, foot: [L.hipF[0] + 4 - k, G - 1] },
      { hip: L.hipB, foot: [L.hipB[0] - 2 + k, G] },
      { hip: L.hipF, foot: [L.hipF[0] + 2 - k, G] },
    ];
    // arms are [hand] or [elbow, hand], relative to the shoulder
    const A0 = L.arm;
    let armN = [[1, A0]], armF = [[0, A0]];

    switch (pose) {
      case 'idle':
        r.dy = [0, -1, -1, 0][f]; r.sway = [0, 0, 1, 1][f]; if (f === 3) r.eye = 'blink';
        break;
      case 'talk':
        r.mouth = f === 0 ? 'open' : 'closed';
        armN = f === 0 ? [[1, 3], [5, 1]] : [[1, 3], [4, 2]];
        r.hy += f === 0 ? -1 : 0;
        break;
      case 'walk': case 'carryWalk': {
        const a = (f + 3) % 6;
        legs = leg3(walkFoot(f, L.step), walkLift(f, L.lift), walkFoot(a, L.step), walkLift(a, L.lift));
        r.dy = [0, -1, -1, 0, -1, -1][f]; r.sway = [0, -1, -1, 0, -1, -1][f];
        const sw = [-2, -1, 1, 2, 1, -1][f];
        armN = [[1 + sw, A0 - (Math.abs(sw) > 1 ? 1 : 0)]]; armF = [[-sw, A0 - (Math.abs(sw) > 1 ? 1 : 0)]];
        break;
      }
      case 'run': {
        const a = (f + 3) % 6;
        legs = leg3(RUNX[f], RUNL[f], RUNX[a], RUNL[a]);
        r.dy = [0, -1, -2, 0, -1, -2][f]; r.dx = 1; r.hx += 1; r.sway = -1;
        const sw = [-2, -1, 1, 2, 1, -1][f];
        armN = [[sw, 2], [sw + 3, 0]]; armF = [[-sw, 2], [-sw + 3, 0]];
        r.mouth = 'open';
        break;
      }
      case 'give':
        r.dx = f; r.hx += f;
        armN = f ? [[3, 3], [9, 1]] : [[1, 3], [6, 2]]; armF = f ? [[5, 2], [12, 0]] : [[3, 2], [9, 1]];
        r.hold = f ? [10, 0] : [6, 1];
        break;
      case 'receive':
        if (f === 0) { armN = [[3, 3], [9, 2]]; armF = [[5, 2], [12, 1]]; r.hold = [10, 1]; r.mouth = 'open'; }
        else { armN = [[1, 3], [4, 2]]; armF = [[3, 2], [7, 1]]; r.hold = [4, 2]; r.hy += 1; r.eye = 'happy'; r.mouth = 'smile'; }
        break;
      case 'carry':
        r.dy = [0, -1][f];
        break;
      case 'inspect':
        armN = [[4, 1], [10, -5 + f]]; r.hold = [15, -6 + f]; r.hy -= 1; r.eye = f ? 'squint' : 'open';
        break;
      case 'wave':
        armN = f ? [[5, -1], [13, -8]] : [[5, 0], [12, -6]]; r.mouth = 'smile'; r.behind = true;
        break;
      case 'sit':
        r.dy = 4 + [0, -1][f];
        // thighs lie along the seat, shins dangle over its edge (the anchor is the seat surface)
        legs = [
          { hip: L.hipB, foot: [L.hipB[0] + 5, 39], knee: [L.hipB[0] + 5, L.hipB[1] + 1] },
          { hip: L.hipF, foot: [L.hipF[0] + 5, 39], knee: [L.hipF[0] + 5, L.hipF[1] + 1] },
        ];
        armN = [[1, 3], [5, 5]]; armF = [[2, 3], [7, 5]];
        if (f) r.eye = 'blink';
        break;
      case 'moved':
        r.hy += 2; r.hx += 1; r.eye = 'closed'; r.mouth = 'sad'; r.droop = 1; r.tear = f === 1;
        armN = [[1, 3], [7, -2]]; armF = [[2, 3], [4, 5]]; r.hold = [1, 5];   // item held low so the bowed face and tear stay visible
        break;
    }
    if (pose === 'carry' || pose === 'carryWalk') {
      r.parcel = [3, -1];                                   // parcel fill origin, relative to the near shoulder
      armN = [[0, 3], [5, 3]]; armF = [[2, 1], [10, 1]];
      r.hold = [7, 2];
    }
    // children have shorter reach
    if (k) { const sc = a => a.map(([px, py]) => [Math.round(px * 0.75), Math.round(py * 0.75)]); armN = sc(armN); armF = sc(armF); if (r.hold) r.hold = sc([r.hold])[0]; }
    // resolve to absolute sprite coords; body offset moves hips/shoulders (feet stay planted)
    const o = (p) => [p[0] + r.dx, p[1] + r.dy];
    const sN = o(L.shN), sF = o(L.shF);
    const abs = (s, pts) => pts.map(p => [s[0] + p[0], s[1] + p[1]]);
    r.legs = legs.map(l => ({ far: !!l.far, hip: o(l.hip), foot: l.foot, knee: l.knee ? o(l.knee) : null }));
    r.arms = [{ far: true, pts: [sF, ...abs(sF, armF)] }, { far: false, pts: [sN, ...abs(sN, armN)] }];
    if (r.hold) r.hold = [sN[0] + r.hold[0], sN[1] + r.hold[1]];
    if (r.parcel) r.parcel = [sN[0] + r.parcel[0], sN[1] + r.parcel[1]];
    return r;
  }

  /* ---------------- rendering ---------------- */
  const put = (x, img, fx, fy, ol = true) => x.drawImage(img, fx - (ol ? 1 : 0), fy - (ol ? 1 : 0));

  function parts(id) {
    return memo('parts|' + id, () => {
      const ch = CAST[id], S = ch.kid ? 'K' : 'A';
      return {
        head: outlined(HEAD[S], BK),
        abd: outlined(ABD[S], BK),
        torso: outlined(ch.torso.rows, ch.torso.key),
        extra: ch.parts.map(p => ({ ...p, img: p.ol === false ? grid(p.rows, p.key) : outlined(p.rows, p.key) })),
      };
    });
  }

  const PARCEL = ['11TT1111', '22UU2222', '22UU2223', '22222223', '22222233', '33333333'];
  const PARCEL_K = { 1: 'dirt1', 2: 'dirt2', 3: 'dirt3', T: 'wood1', U: 'wood2' };

  function leg(x, l, L, shoe) {
    const c = l.far ? 'ant3' : 'ink';
    const kn = l.knee || knee(l.hip, l.foot, L.leg);
    line(x, l.hip[0], l.hip[1], kn[0], kn[1], c);
    line(x, kn[0], kn[1], l.foot[0], l.foot[1], c);
    if (shoe === 'sneaker') { rect(x, l.foot[0] - 1, l.foot[1] - 1, 4, 2, 'ink'); rect(x, l.foot[0], l.foot[1] - 1, 2, 1, l.far ? 'stone1' : 'white'); }
    else if (!l.far) dot(x, l.foot[0] + 1, l.foot[1], c);
  }

  // Bresenham over integer points (same stepping as PX.line), calling fn(x, y).
  function raster(x0, y0, x1, y1, fn) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // Stubby arm: a 1 px core (sleeve colour, then a rust hand) wrapped in its own 1 px outline.
  // The outline is computed from the core's pixel set directly (no canvas readback).
  function arm(x, a, sleeve) {
    const p = a.pts, [lit, shade, bare] = sleeve;
    const up = a.far ? shade : lit, fore = bare ? (a.far ? 'ant2' : 'ant1') : up;
    const el = p.length > 2 ? p[1] : [Math.round((p[0][0] + p[1][0]) / 2), Math.round((p[0][1] + p[1][1]) / 2)];
    const h = p[p.length - 1], core = new Map(), set = (px, py, c) => core.set(px + ',' + py, [px, py, c]);
    raster(p[0][0], p[0][1], el[0], el[1], (px, py) => set(px, py, up));
    raster(el[0], el[1], h[0], h[1], (px, py) => set(px, py, fore));
    const hand = a.far ? 'ant2' : 'ant1';
    set(h[0], h[1] - 1, a.far ? 'ant1' : 'ant0'); set(h[0] + 1, h[1] - 1, hand); set(h[0], h[1], hand); set(h[0] + 1, h[1], hand);
    const ol = a.far ? 'ant4' : 'ink';
    for (const [px, py] of core.values()) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (!core.has((px + ox) + ',' + (py + oy))) dot(x, px + ox, py + oy, ol);
    for (const [px, py, c] of core.values()) dot(x, px, py, c);
  }

  // Elbowed antenna along a pixel path; sway leans the upper half, droop lowers the tip.
  // The 2x2 club continues the stalk's forward lean (a bent tip kinks one pixel forward-down first).
  function antenna(x, hx, hy, spec, sway, bent, droop) {
    const bx = hx + spec.base[0], by = hy + spec.base[1];
    const shift = (dx, dy) => [bx + dx + (dy <= -4 ? sway : 0), by + dy + (dy <= -4 ? droop : 0)];
    for (const [dx, dy] of spec.path) { const [px, py] = shift(dx, dy); dot(x, px, py, 'ink'); }
    const [lx, ly] = shift(...spec.path[spec.path.length - 1]);
    let cx = lx + 1, cy = ly - 2;
    if (bent) { dot(x, lx + 1, ly - 1, 'ink'); cx = lx + 2; cy = ly - 1; }
    rect(x, cx, cy, 2, 2, 'ant2'); dot(x, cx, cy, 'ant1'); dot(x, cx + 1, cy + 1, 'ant3');
  }

  function render(id, pose, f) {
    const ch = CAST[id], P = parts(id), r = rig(ch, pose, f), L = LAY[r.S];
    const [c, x] = canvas(40, 40);
    const hx = L.head[0] + r.dx + r.hx, hy = L.head[1] + r.dy + r.hy;
    const tx0 = L.torso[0] + r.dx + (ch.torso.dx || 0), ty0 = L.torso[1] + r.dy + (ch.torso.dy || 0);
    const layer = (z) => { for (const p of P.extra) if (p.z === z) {
      const base = (z === 'body' || z === 'neck') ? [tx0, ty0] : [hx, hy];
      put(x, p.img, base[0] + p.at[0], base[1] + p.at[1], p.ol !== false);
    } };

    for (const l of r.legs) if (l.far) leg(x, l, L, ch.shoe);
    arm(x, r.arms[0], ch.sleeve);
    put(x, P.abd, L.abd[0] + r.dx, L.abd[1] + r.dy);
    for (const l of r.legs) if (!l.far) leg(x, l, L, ch.shoe);
    put(x, P.torso, tx0, ty0);
    layer('body');
    layer('neck');
    if (r.behind) arm(x, r.arms[1], ch.sleeve);
    put(x, P.head, hx, hy);
    x.drawImage(memo('eye|' + r.eye, () => grid(EYE[r.eye] || EYE.open, EK)), hx + L.eye[0], hy + L.eye[1]);
    x.drawImage(memo('mouth|' + r.mouth, () => grid(MOUTH[r.mouth], MK)), hx + L.mouth[0], hy + L.mouth[1]);
    if (ch.lash && (r.eye === 'open' || r.eye === 'squint')) { dot(x, hx + L.eye[0], hy + L.eye[1], 'ink'); dot(x, hx + L.eye[0] - 1, hy + L.eye[1] - 1, 'ink'); }
    layer('face');
    const ants = () => L.ant.forEach((a, i) => antenna(x, hx, hy, a, r.sway, ch.bent === i, r.droop));
    if (!ch.antTop) ants();
    layer('hat');
    if (ch.antTop) ants();
    if (r.parcel) put(x, memo('parcel', () => outlined(PARCEL, PARCEL_K)), r.parcel[0], r.parcel[1]);
    if (!r.behind) arm(x, r.arms[1], ch.sleeve);
    if (r.tear) { dot(x, hx + L.eye[0] + 1, hy + L.eye[1] + 4, 'water1'); dot(x, hx + L.eye[0] + 1, hy + L.eye[1] + 5, 'white'); }
    return c;
  }

  /* ---------------- portraits (48x48, bust facing right, three-quarter view) ---------------- */
  // Same design language as the sprites at 2x detail: layered hard-edged ellipse bands for form,
  // every part in its own ink outline, per-character clothing / headwear / face gear on top.
  const [pT, pX] = scratch(48, 48);
  // Draw a part into a scratch layer, outline it, and composite it.
  function plate(x, fn, ol = 'ink') {
    pX.clearRect(0, 0, 48, 48); fn(pX);
    if (ol) x.drawImage(outline(pT, ol), -1, -1); else x.drawImage(pT, 0, 0);
  }
  const G2 = (g, rows, key, px, py) => g.drawImage(grid(rows, key), px, py);
  // shaded blob: shade base, mid offset up-left, light further up-left
  function blob(g, cx, cy, rx, ry, [c0, c1, c2], lx = 2, ly = 2) {
    ellipse(g, cx, cy, rx, ry, c2);
    ellipse(g, cx - 1, cy - 1, rx - 1, ry - 1, c1);
    ellipse(g, cx - lx - 1, cy - ly - 1, Math.max(1, rx - 4), Math.max(1, ry - 4), c0);
  }
  const RUST = ['ant1', 'ant2', 'ant3'];
  const inE = (x, y, cx, cy, rx, ry) => ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1;
  // Fill every pixel that passes test(x, y) with shade(x, y): hard-edged shapes with stepped bands.
  function region(g, test, shade) { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (test(x, y)) dot(g, x, y, shade(x, y)); }
  const band = (v, a, b, [c0, c1, c2]) => (v < a ? c0 : v < b ? c1 : c2);

  // Eye grids (near eye). w cream0, v cream1, p pupil, h white, k ink, t tear.
  const PEK = { w: 'cream0', v: 'cream1', u: 'cream2', p: 'pupil', h: 'white', k: 'ink', t: 'water1', s: 'water0' };
  const PEYE = {
    open:       ['.kkkkk.', 'kvvvvvk', 'wwwhhpp', 'wwwhhpp', 'wwwpppp', 'wwwpphp', 'wwwwppw', '.wwwww.'],
    blink:      ['.......', '.......', '.......', 'k.....k', '.kkkkk.', '.......', '.......', '.......'],
    smile:      ['.......', '.......', '.kkkkk.', 'k.....k', '.......', '.......', '.......', '.......'],
    moved:      ['.......', '.......', '.kkkkk.', 'kvvvvvk', 'wwhhppp', 'wwwpphw', '.wwwww.', '...t...'],
    movedBlink: ['.......', '.......', '.......', 'k.....k', '.kkkkk.', '..t....', '..s....', '.......'],
  };
  const PMOUTH = {
    neutral: ['k...k', '.kkk.'],
    talk:    ['.kkk.', 'krrrk', 'krRrk', '.kkk.'],
    smile:   ['k....k', '.kkkk.'],
    wobble:  ['.k.k.', 'k.k.k'],
  };
  const PMK = { k: 'ink', r: 'roofR4', R: 'rose' };

  // Shoulders: a wide dome under the head, lit from the left.
  const inBust = (x, y) => inE(x, y, 23, 49, 18, 14);
  const bustShade = ramp => (x, y) => band(x + (y - 40) * 0.5, 14, 31, ramp);
  // Hair / headwear over the head's top and back, bounded by a hairline.
  const hairShade = (P, ramp, lo = -13, hi = -2) => (x, y) => band((x - P.cx) + (y - P.cy), lo, hi, ramp);

  // Portrait specs. cloth: shoulder ramp; bust(g, P) details inside the bust plate; back/face/hat add layers.
  const PORT = {
    courier: { cloth: RUST, bent: 1,
      back(x) { plate(x, g => { region(g, (x, y) => inE(x, y, 9, 39, 7, 7), (x, y) => band(x + y, 44, 52, ['cap1', 'cap2', 'cap3'])); line(g, 3, 40, 15, 40, 'cap3'); rect(g, 6, 35, 4, 4, 'cream0'); rect(g, 7, 36, 2, 2, 'cap2'); }); },
      bust(g) { line(g, 29, 33, 15, 47, 'cap3'); line(g, 30, 33, 16, 47, 'cap2'); line(g, 31, 33, 17, 47, 'cap3'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, 22, 10, 13, 7) && y <= 14, (x, y) => band((x - 22) + (y - 10) * 1.5, -7, 5, ['cap1', 'cap2', 'cap3']));
        rect(g, 12, 4, 4, 2, 'cap0'); rect(g, 11, 6, 2, 2, 'cap0');
        rect(g, 9, 14, 27, 2, 'cap3');                                     // band
        rect(g, 33, 12, 9, 3, 'cap2'); rect(g, 33, 12, 9, 1, 'cap1'); rect(g, 33, 14, 9, 1, 'cap3'); // visor
        rect(g, 13, 8, 5, 4, 'cream0'); rect(g, 14, 9, 3, 2, 'cream1'); dot(g, 15, 9, 'cap2');   // patch
      }); } },
    marlow: { cloth: ['moss0', 'moss1', 'moss2'], stoop: 2, bent: 0,
      bust(g, P) {
        region(g, (x, y) => inBust(x, y) && x >= 25 && x - 25 <= (y - 33) * 0.9 + 4, (x, y) => (x > 31 ? 'cream1' : 'cream0'));  // shirt front
        line(g, 25, 33, 21, 47, 'moss3'); for (const by of [38, 42, 46]) { dot(g, 23 + (46 - by) * 0.2 | 0, by, 'brass1'); }
        line(g, 23, 40, 16, 43, 'brass2'); line(g, 16, 43, 12, 42, 'brass2'); dot(g, 12, 42, 'brass0');          // watch chain
        rect(g, 27, 33, 5, 2, 'rose'); dot(g, 29, 33, 'roofR3');                                                  // bow tie
      },
      face(x, P) {
        const ring = ['..ooooooo..', '.o.......o.', 'o.........o', 'o.........o', 'o.........o', 'o.........o', 'o.........o', 'o.........o', '.o.......o.', '..ooooooo..'];
        G2(x, ring, { o: 'brass1' }, P.ex - 2, P.ey - 2);
        line(x, P.ex - 3, P.ey + 2, P.ex - 10, P.ey + 1, 'brass2');
        plate(x, g => { rect(g, P.ex, P.ey - 5, 7, 2, 'white'); rect(g, P.ex - 2, P.ey - 4, 2, 1, 'stone0'); });   // bushy brows
        plate(x, g => { region(g, (x, y) => inE(x, y, P.mx - 1, P.my + 1, 5, 2) || inE(x, y, P.mx - 5, P.my + 2, 2, 2), (x, y) => (y > P.my + 1 ? 'stone1' : 'white')); });
        region(x, (x, y) => inE(x, y, P.cx, P.cy, 12, 10) && x <= P.cx - 8 + (y % 3 === 0 ? 1 : 0) && y >= P.cy - 3 && y <= P.cy + 6,
          (x, y) => (x === P.cx - 8 + (y % 3 === 0 ? 1 : 0) ? 'stone1' : 'white'));
      } },
    mother: { cloth: ['cream0', 'cream1', 'cream2'], bent: 1, lash: true,
      bust(g) { for (let i = 10; i < 40; i += 3) line(g, i, 37, i, 47, 'cream2');
        region(g, (x, y) => inE(x, y, 25, 35, 10, 3), (x, y) => band(x, 20, 30, ['cap1', 'cap2', 'cap3'])); rect(g, 28, 37, 4, 9, 'cap2'); rect(g, 30, 37, 2, 9, 'cap3'); rect(g, 28, 45, 4, 1, 'cap1'); } },
    helen: { cloth: ['slate0', 'slate1', 'slate2'], lash: true,
      back(x, P) { plate(x, g => region(g, (x, y) => inE(x, y, P.cx - 11, P.cy - 9, 5, 5), (x, y) => band(x + y - (P.cx + P.cy - 20), -3, 3, ['stone0', 'stone1', 'stone2']))); },
      bust(g) { region(g, (x, y) => inE(x, y, 25, 35, 11, 3), (x, y) => band(x, 20, 31, ['brass0', 'brass1', 'brass2'])); rect(g, 29, 37, 4, 8, 'brass1'); rect(g, 31, 37, 2, 8, 'brass2'); rect(g, 29, 44, 4, 1, 'brass3');
        rect(g, 17, 40, 4, 4, 'brass1'); rect(g, 17, 40, 2, 1, 'brass0'); rect(g, 20, 41, 1, 3, 'brass3'); dot(g, 18, 42, 'brass2'); },
      hat(x, P) { plate(x, g => {
        // curved hairline: everything on the head outside the face oval, down to the nape
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 1, 14, 12) && !inE(x, y, P.cx + 5, P.cy + 4, 12, 11) && y <= P.cy + 6, hairShade(P, ['stone0', 'stone1', 'stone2']));
        line(g, P.cx - 2, P.cy - 11, P.cx - 9, P.cy - 3, 'stone2'); line(g, P.cx + 2, P.cy - 11, P.cx - 3, P.cy - 7, 'stone1'); line(g, P.cx - 6, P.cy - 9, P.cx - 11, P.cy + 1, 'stone1');
      }); } },
    mender: { cloth: ['cream0', 'cream1', 'cream2'],
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 21 && x <= 38, (x, y) => band(x, 25, 34, ['wood1', 'wood2', 'wood3']));
        line(g, 22, 36, 21, 39, 'wood4'); line(g, 37, 36, 37, 39, 'wood4'); rect(g, 24, 42, 7, 4, 'wood3'); rect(g, 24, 42, 7, 1, 'wood4'); rect(g, 26, 40, 1, 3, 'iron1'); rect(g, 28, 39, 1, 4, 'brass1'); },
      face(x, P) {
        region(x, (x, y) => inE(x, y, P.cx, P.cy, 12, 10) && x <= P.cx - 9 + (y % 3 === 1 ? 1 : 0) && y >= P.cy - 5 && y <= P.cy + 5,
          (x, y) => (x === P.cx - 9 + (y % 3 === 1 ? 1 : 0) ? 'stone2' : 'stone1'));
        plate(x, g => { rect(g, P.ex - 13, P.ey - 3, 14, 2, 'wood4'); rect(g, P.ex - 13, P.ey - 3, 14, 1, 'wood3'); });
        plate(x, g => { rect(g, P.ex + 3, P.ey - 1, 7, 8, 'brass2'); rect(g, P.ex + 3, P.ey - 1, 7, 2, 'brass1'); rect(g, P.ex + 3, P.ey + 5, 7, 2, 'brass3'); rect(g, P.ex + 5, P.ey - 1, 1, 8, 'brass3');
          rect(g, P.ex + 9, P.ey, 2, 6, 'water1'); dot(g, P.ex + 9, P.ey + 1, 'white'); dot(g, P.ex + 10, P.ey + 4, 'water2'); });
      } },
    traveller: { cloth: ['brass0', 'brass1', 'brass2'],
      bust(g) { region(g, (x, y) => inBust(x, y) && Math.abs(x - 27) <= (y - 33) * 0.35 + 1, () => 'brass3');
        region(g, (x, y) => inE(x, y, 32, 36, 6, 3) || inE(x, y, 18, 36, 5, 3), (x, y) => (y < 36 ? 'brass0' : 'brass1')); dot(g, 25, 40, 'wood4'); dot(g, 24, 44, 'wood4'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, 23, 12, 22, 3), (x, y) => (y < 12 ? 'wood3' : 'wood4')); rect(g, 5, 11, 12, 1, 'wood2');   // brim
        rect(g, 13, 2, 19, 9, 'wood3'); rect(g, 13, 2, 5, 9, 'wood2'); rect(g, 29, 2, 3, 9, 'wood4'); rect(g, 19, 2, 5, 2, 'wood4'); // crown with a dent
        rect(g, 13, 8, 19, 2, 'cream1'); rect(g, 13, 9, 19, 1, 'cream2'); rect(g, 29, 8, 2, 2, 'cream2');                       // band
      }); } },
    nora: { cloth: ['lilac', 'lilac', 'lilac2'], lash: true,
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 22 && x <= 37 && y >= 36, (x, y) => band(x, 34, 99, ['cream0', 'cream1', 'cream1']));
        rect(g, 22, 36, 16, 1, 'cream2'); rect(g, 25, 42, 8, 5, 'cream2'); rect(g, 25, 42, 8, 1, 'cream1'); dot(g, 30, 41, 'cap2'); dot(g, 30, 40, 'rose');
         },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => (inE(x, y, P.cx - 1, P.cy - 2, 14, 12) && (y <= P.cy - 5 || (x <= P.cx - 5 && y <= P.cy + 5))),
          (x, y) => ((y > P.cy - 7 && x > P.cx - 7) || (x > P.cx - 7 && x <= P.cx - 5 && y > P.cy - 7) ? 'dusty0' : band((x - P.cx) + (y - P.cy), -12, -2, ['dusty0', 'dusty1', 'dusty2'])));
        for (const [dx, dy] of [[-8, -8], [-3, -11], [2, -8], [-10, -2]]) rect(g, P.cx + dx, P.cy + dy, 2, 2, 'cream0');
        region(g, (x, y) => inE(x, y, P.cx - 14, P.cy + 4, 3, 3), (x, y) => (x + y < P.cx + P.cy - 11 ? 'dusty0' : 'dusty1'));
        region(g, (x, y) => y > P.cy + 5 && y < P.cy + 13 && x >= P.cx - 18 + ((y - P.cy - 5) >> 1) && x <= P.cx - 16, () => 'dusty2');
        region(g, (x, y) => y > P.cy + 6 && y < P.cy + 12 && x >= P.cx - 14 && x <= P.cx - 12 - ((y - P.cy - 6) >> 1), () => 'dusty1');
      }); } },
    mia: { cloth: ['roofG0', 'roofG1', 'roofG2'], lash: true,
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 26 && x <= 33, (x, y) => (x > 31 ? 'cream1' : 'cream0')); line(g, 26, 33, 25, 47, 'roofG3'); dot(g, 24, 39, 'cream0'); dot(g, 24, 44, 'cream0'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 1, 14, 12) && (y <= P.cy - 6 - (x % 3 === 0 && x > P.cx ? -1 : 0) || (x <= P.cx - 3 && y <= P.cy + 9)),
          hairShade(P, ['wood2', 'wood3', 'wood4']));
        line(g, P.cx - 2, P.cy - 11, P.cx - 10, P.cy + 1, 'wood4'); line(g, P.cx + 3, P.cy - 11, P.cx + 7, P.cy - 7, 'wood4');
      }); plate(x, g => { rect(g, P.cx + 1, P.cy - 12, 5, 2, 'yellow'); dot(g, P.cx + 1, P.cy - 12, 'light0'); dot(g, P.cx + 5, P.cy - 11, 'brass2'); }); } },
    theo: { cloth: ['wood1', 'wood2', 'wood3'],
      bust(g) { region(g, (x, y) => inE(x, y, 25, 35, 11, 3), (x, y) => band(x, 20, 31, ['stone1', 'stone2', 'stone3'])); rect(g, 19, 37, 5, 10, 'stone2'); rect(g, 19, 37, 2, 10, 'stone1'); rect(g, 19, 46, 5, 1, 'stone3');
        line(g, 31, 34, 35, 40, 'ink2'); rect(g, 30, 40, 9, 6, 'iron3'); rect(g, 30, 40, 9, 2, 'iron2'); rect(g, 33, 42, 4, 4, 'iron4'); rect(g, 34, 43, 2, 2, 'water2'); dot(g, 34, 43, 'white'); rect(g, 31, 39, 2, 1, 'iron1'); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => inE(x, y, P.cx - 3, P.cy - 9, 14, 5) && y <= P.cy - 6, (x, y) => band((x - P.cx) + (y - P.cy) * 2, -24, -4, ['roofB2', 'roofB3', 'roofB4'])); rect(g, P.cx - 2, P.cy - 16, 2, 2, 'roofB4'); }); } },
    leo: { cloth: ['brass1', 'brass1', 'brass2'],
      bust(g) { rect(g, 10, 38, 4, 10, 'cap2'); rect(g, 10, 38, 1, 10, 'cap1'); rect(g, 36, 38, 3, 10, 'cap3'); rect(g, 29, 33, 2, 15, 'white'); dot(g, 29, 38, 'iron1');
        region(g, (x, y) => inE(x, y, 26, 35, 8, 2), (x, y) => (y < 35 ? 'cap1' : 'cap2')); },
      hat(x, P) {
        plate(x, g => { rect(g, P.cx - 5, P.cy - 13, 3, 3, 'stone1'); rect(g, P.cx - 2, P.cy - 14, 3, 4, 'stone0'); rect(g, P.cx + 1, P.cy - 13, 3, 3, 'stone1'); });
        plate(x, g => { region(g, (x, y) => inE(x, y, P.cx, P.cy, 14, 12) && y >= P.cy - 8 && y <= P.cy - 4, (x, y) => (y === P.cy - 8 ? 'stone0' : y >= P.cy - 5 ? 'red' : 'white')); }); } },
    grandkid: { cloth: ['pink0', 'pink', 'rose'], kid: true, lash: true,
      bust(g) { region(g, (x, y) => inE(x, y, 26, 35, 7, 2), () => 'white'); for (const [bx, by] of [[14, 42], [20, 45], [33, 42], [27, 46]]) rect(g, bx, by, 2, 1, 'white'); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => inE(x, y, P.cx - 5, P.cy - 12, 4, 3) || inE(x, y, P.cx + 3, P.cy - 12, 4, 3), (x, y) => (y < P.cy - 12 ? 'pink0' : 'pink')); rect(g, P.cx - 2, P.cy - 14, 3, 4, 'rose'); }); } },
    baker: { cloth: ['sky1', 'sky2', 'sky3'],
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 20 && x <= 37 && y >= 35, (x, y) => (x > 34 ? 'stone1' : 'white')); line(g, 21, 36, 20, 38, 'stone1'); line(g, 36, 36, 37, 38, 'stone1'); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => (inE(x, y, P.cx - 2, P.cy - 16, 11, 7) && y <= P.cy - 11) || (y > P.cy - 12 && y <= P.cy - 8 && Math.abs(x - P.cx + 2) <= 11),
        (x, y) => (y > P.cy - 12 ? (y === P.cy - 8 ? 'stone2' : 'stone1') : band(x - P.cx + (y - P.cy), -24, -8, ['white', 'white', 'stone0']))); line(g, P.cx - 5, P.cy - 20, P.cx - 5, P.cy - 13, 'stone1'); line(g, P.cx + 2, P.cy - 20, P.cx + 2, P.cy - 13, 'stone1'); }); } },
    gardener: { cloth: ['orange', 'orange', 'light4'],
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 19 && x <= 36 && y >= 38, (x, y) => band(x, 24, 33, ['roofB1', 'roofB2', 'roofB3'])); line(g, 21, 36, 21, 38, 'roofB2'); line(g, 34, 36, 34, 38, 'roofB2'); dot(g, 21, 39, 'brass1'); dot(g, 34, 39, 'brass1'); rect(g, 25, 41, 6, 4, 'roofB2'); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => inE(x, y, 23, 13, 22, 3), (x, y) => (y < 13 ? 'dirt1' : 'dirt2')); region(g, (x, y) => inE(x, y, 22, 8, 9, 6) && y <= 11, (x, y) => band(x + y, 26, 34, ['brass0', 'dirt1', 'dirt2']));
        rect(g, 13, 9, 19, 2, 'red'); for (let i = 4; i < 42; i += 4) dot(g, i, 13, 'dirt3'); }); } },
    kid: { cloth: ['white', 'white', 'stone1'], kid: true,
      bust(g) { for (let y = 38; y < 48; y += 4) region(g, (x, yy) => inBust(x, yy) && yy >= y && yy < y + 2, (x) => (x > 31 ? 'roofB2' : 'blue')); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 6, 13, 7) && y <= P.cy - 5, (x, y) => band((x - P.cx) + (y - P.cy) * 1.5, -20, -4, ['roofR0', 'red', 'roofR3']));
        rect(g, P.cx - 22, P.cy - 7, 10, 3, 'red'); rect(g, P.cx - 22, P.cy - 5, 10, 1, 'roofR3'); rect(g, P.cx - 14, P.cy - 6, 27, 2, 'roofR3'); }); } },
    sam: { cloth: ['light1', 'yellow', 'light3'], kid: true,
      back(x, P) { plate(x, g => region(g, (x, y) => inE(x, y, 13, 36, 9, 6), (x, y) => band(x + y, 43, 52, ['light1', 'yellow', 'light3']))); },
      bust(g) { rect(g, 28, 38, 2, 1, 'brass3'); rect(g, 28, 43, 2, 1, 'brass3'); line(g, 27, 33, 26, 47, 'light3'); line(g, 33, 34, 20, 47, 'wood3'); line(g, 34, 34, 21, 47, 'wood2'); } },
  };

  function renderPortrait(id, frame, mood) {
    const d = PORT[id] || { cloth: [CAST[id].sleeve[0], CAST[id].sleeve[0], CAST[id].sleeve[1]] };
    const [c, x] = canvas(48, 48);
    const st = d.stoop || 0, kd = d.kid ? 2 : 0, cx = 24 + st, cy = 21 + st + kd, hr = [13 - kd / 2, 11 - kd / 2];
    const P = { cx, cy, ex: cx + 3 - kd / 2, ey: cy - 4 + kd / 2, mx: cx + 9 - kd / 2, my: cy + 6 - kd / 2 };
    const moved = mood === 'moved', smile = mood === 'smile';
    if (d.back) d.back(x, P);                                     // bag, bun, hood
    plate(x, g => { region(g, inBust, bustShade(d.cloth)); if (d.bust) d.bust(g, P); });
    // antennae: stalks rise from the head top and bend forward to a club (behind hats, over the head)
    const ant = (bx, by, pts, bent) => {
      let [px, py] = [bx, by];
      for (const [qx, qy] of pts) { line(x, px, py, bx + qx, by + qy, 'ink'); [px, py] = [bx + qx, by + qy]; }
      if (bent) { line(x, px, py, px + 1, py + 2, 'ink'); px += 1; py += 2; }
      plate(x, g => { rect(g, px + 1, py - 2, 3, 3, 'ant2'); rect(g, px + 1, py - 2, 2, 1, 'ant1'); dot(g, px + 3, py, 'ant3'); });
    };
    const aSw = frame === 1 ? 1 : 0, aDr = moved ? 1 : 0;
    ant(cx - 5, cy - 9, [[-1, -5], [aSw, -9 + aDr], [3 + aSw, -11 + aDr]], d.bent === 0);
    ant(cx + 2, cy - 10, [[1, -5], [4 + aSw, -8 + aDr], [8 + aSw, -8 + aDr]], d.bent === 1);
    // head
    plate(x, g => {
      ellipse(g, cx, cy, hr[0], hr[1], 'ant3');
      ellipse(g, cx - 1, cy - 1, hr[0] - 1, hr[1] - 1, 'ant2');
      ellipse(g, cx - 4, cy - 4, hr[0] - 5, hr[1] - 5, 'ant1');
      rect(g, cx - 9, cy - 7, 3, 2, 'ant0'); rect(g, cx - 10, cy - 5, 2, 2, 'ant0'); dot(g, cx - 6, cy - 8, 'ant0');
    });
    // face
    const eyeKey = frame === 2 ? (moved ? 'movedBlink' : 'blink') : moved ? 'moved' : (smile && frame !== 1) ? 'smile' : 'open';
    G2(x, PEYE[eyeKey], PEK, P.ex, P.ey);
    if (d.lash && eyeKey === 'open') { dot(x, P.ex - 1, P.ey, 'ink'); dot(x, P.ex - 2, P.ey - 1, 'ink'); }
    if (frame !== 2 && !moved) { rect(x, P.ex + 9, P.ey + 2, 2, 5, 'cream0'); rect(x, P.ex + 10, P.ey + 3, 1, 3, 'pupil'); dot(x, P.ex + 9, P.ey + 1, 'ink'); }  // far eye, foreshortened
    else line(x, P.ex + 9, P.ey + 4, P.ex + 10, P.ey + 4, 'ink');
    rect(x, P.ex - 3, P.ey + 9, 3, 1, smile || moved ? 'rose' : 'roofR1');                          // blush
    G2(x, PMOUTH[frame === 1 ? 'talk' : moved ? 'wobble' : smile ? 'smile' : 'neutral'], PMK, P.mx - 2, P.my);
    if (d.face) d.face(x, P);
    if (moved && frame !== 2) { dot(x, P.ex - 1, P.ey + 9, 'water1'); dot(x, P.ex - 1, P.ey + 10, 'water1'); dot(x, P.ex - 1, P.ey + 11, 'white'); }
    if (moved) { dot(x, P.ex + 8, P.ey - 3, 'white'); dot(x, P.ex + 9, P.ey - 4, 'light1'); dot(x, P.ex + 7, P.ey - 4, 'light1'); }
    if (d.hat) d.hat(x, P);
    return c;
  }

  /* ---------------- public API ---------------- */
  const wrap = (pose, frame) => { const n = POSES[pose]; return ((frame | 0) % n + n) % n; };
  function sprite40(id, pose, frame = 0) {
    const p = resolve(id, pose), f = wrap(p, frame);
    return memo(`s|${id}|${p}|${f}`, () => render(id, p, f));
  }
  const MOODS = { courier: ['smile'], marlow: ['smile'], mother: ['smile'], helen: ['moved'] };

  window.CH = {
    ids: IDS,
    POSES,
    poses: id => HAS[id].slice(),
    // px of ground covered per frame by walk / carryWalk / run, so feet don't skate (advance a frame every stride px)
    stride: (id, pose) => (resolve(id, pose) === 'run' ? 4 : CAST[id].kid ? 2 : 3),
    frames: (id, pose) => POSES[resolve(id, pose)],
    fps: pose => FPS[pose] || 6,
    sprite: sprite40,
    hand(id, pose, frame = 0) {
      const p = resolve(id, pose), f = wrap(p, frame);
      const r = rig(CAST[id], p, f), a = r.arms[1].pts, h = r.hold || a[a.length - 1];
      return [h[0] - 20, h[1] - 37];
    },
    draw(ctx, id, pose, frame, x, y, dir = 1, opts = {}) {
      x = Math.round(x); y = Math.round(y);
      if (opts.shadow !== false) shadow(ctx, x - 2 * dir, y, CAST[id].kid ? 6 : 8, 1);
      const s = sprite40(id, pose, frame);
      if (dir < 0) ctx.drawImage(flip(s), x - 19, y - 37); else ctx.drawImage(s, x - 20, y - 37);
    },
    portrait(id, frame = 0, mood = 'neutral') {
      if (!(MOODS[id] || []).includes(mood)) mood = 'neutral';
      frame = ((frame | 0) % 3 + 3) % 3;
      return memo(`p|${id}|${frame}|${mood}`, () => renderPortrait(id, frame, mood));
    },
  };
})();
