'use strict';
/* Ant cast for "The Shop That Opens Once" (v2). Every pixel is authored here in code:
   ASCII part grids (head, abdomen, torso + clothes, hats) wrapped in a 1 px ink outline,
   plus thin ink limbs (legs placed by a tiny two-bone IK, arms by explicit elbows).
   Defines window.CH per ART.md "Character contract": 40x40 frames, body faces RIGHT, feet at (20, 37); the courier's
   pose_front and pose_back views face the camera and away from it. */
(() => {
  const { canvas, sprite, outline, flip, shadow } = PX;

  // Extra colours, hue-shifted from the PX ramps (12).
  const XC = {
    moss0: '#d6e38c', moss1: '#a8c25c', moss2: '#7c9b45', moss3: '#58733a',   // Marlow's waistcoat
    slate0: '#c6d2f2', slate1: '#97a9da', slate2: '#6f81b9',                  // Helen's cardigan
    plum0: '#b48ad6', plum1: '#8a5fb8', plum2: '#633f8f',                       // Nora's knitted wool shawl
    lilac0: '#e2d2ff', lilac2: '#9d84de', pink0: '#ffd4ea',
    navy0: '#8197d1', navy1: '#5a6ba8', navy2: '#3f4c82',                       // Kapten Bram's driver's jacket
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
    up:     ['.wpp', 'wwph', 'wwww', '.ww.'],
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
    helen: { sleeve: ['slate1', 'slate2'], polish: 'cup',
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
    // Nenek Nora, the village's old weaver (GDD 6.5): small and frail, a thick knitted wool shawl in deep plum drawn up
    // over her head, thick reading glasses on a thread.
    nora: { sleeve: ['plum1', 'plum2'],
      torso: { rows: ['.llwwv.', 'lllwwvv', 'llLwvvv', 'lLLwvvu', 'lLLvuuu', 'LLLvuvu', 'LLLvvvv', 'LLLvvvu', '.LLvvu.'],
               key: { l: 'plum1', L: 'plum2', w: 'cream0', v: 'cream1', u: 'cream2' } },
      lash: true, stoop: 1,
      parts: [
        { z: 'face', ol: false, at: [4, 3], rows: ['.oooo.', 'o....o', 'o....o', 'o....o', '.oooo.'], key: { o: 'wood4' } },
        { z: 'hat', at: [-2, -1], rows: ['....11111...', '..111222222.', '.11222122222', '.12222223333', '.1222333....', '.1223.......', '12123.......', '2223........', '.33.........'],
          key: { 1: 'plum0', 2: 'plum1', 3: 'plum2' } },
        { z: 'hat', ol: false, at: [4, 5], rows: ['c.', 'c.', '.c', '.c', '.c'], key: { c: 'cream2' } },
      ],
    },
    mia: { sleeve: ['roofG1', 'roofG2'],
      torso: { rows: ['.TTTww.', 'tTTTTww', 'tTTTUww', 'TTTTUww', 'TTTTUwv', 'TTTUUvv', '.TUUVV.', '..VVV..'],
               key: { t: 'roofG0', T: 'roofG1', U: 'roofG2', V: 'roofG3', w: 'cream0', v: 'cream1' } },
      lash: true, villager: true,
      load: { rows: ['.g.o.gG.', 'gGoOgGO.', 'TTTTTTTT', 'TttttttT', 'TTTTTTTT'], key: { g: 'roofG1', G: 'roofG2', o: 'orange', O: 'light4', T: 'wood2', t: 'wood3' } },
      parts: [
        { z: 'body', ol: false, at: [0, 0], rows: ['ry.....', '.ry....', '..ry...', '...ry..', '....ry.', '.....ry'], key: { r: 'red', y: 'yellow' } },
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
    // Theo, the cliff photographer (GDD 6.6): tall and calm, a dark-brown photographer's vest with many pockets, a
    // magnifying lens for his eye, his camera on its strap (put away while he shoots with it).
    theo: { sleeve: ['wood2', 'wood3'],
      torso: { rows: ['.gGGGH.', '1gGGHH2', '1pGHH22', '1p1HHp2', '11p1Hp2', '1pp22p3', '.12233.', '..333..'],
               key: { 1: 'wood3', 2: 'wood4', 3: 'wood5', p: 'wood2', g: 'stone1', G: 'stone2', H: 'stone3' } },
      parts: [
        { z: 'body', at: [4, 3], off: ['photo'], rows: ['1122', '2tt3', '2333'], key: { 1: 'iron1', 2: 'iron2', 3: 'iron3', t: 'water2' } },
        { z: 'face', ol: false, at: [8, 3], rows: ['oo', 'tO', 'wO', 'oo'], key: { o: 'brass1', O: 'brass2', t: 'water1', w: 'white' } },
        { z: 'hat', at: [-2, -2], rows: ['.....3......', '..2222222...', '.222222222..', '12222222233.'], key: { 1: 'roofB2', 2: 'roofB3', 3: 'roofB4' } },
      ],
    },
    // Leo, Bellwood's old sprinter (GDD 6.8): still built like an athlete, in a worn striped track jacket, cloth wrapped
    // round his ankles.
    leo: { sleeve: ['roofB1', 'roofB2'],
      torso: { rows: ['.bwbbs.', 'bbwbbbs', 'bbwbfbs', 'Bbwbbbs', 'BBwbbBs', 'BBwBfBs', '.BwBBB.', '..ZZZ..'],
               key: { b: 'roofB1', B: 'roofB2', f: 'roofB0', Z: 'roofB3', w: 'white', s: 'stone1' } },
      shoe: 'wrap',
      parts: [
        { z: 'hat', at: [0, 1], rows: ['wwwwwwwwww', 'rrrrrrrrrr'], key: { w: 'white', r: 'red' } },
      ],
    },
    // Sam, the hall's archivist (GDD 6.7): a stiff-collared white shirt under a moss-green knitted vest, black cloth
    // sleeve protectors.
    sam: { sleeve: ['iron3', 'iron4'],
      torso: { rows: ['.wwwGG.', 'wwwGgGH', 'wwGgGoH', 'wGGGgGH', 'wGgGGoH', 'GGGgGHH', '.GGHHH.', '..HHH..'],
               key: { w: 'white', G: 'moss1', g: 'moss0', H: 'moss2', o: 'stone2' } },
      villager: true,
      parts: [
        { z: 'neck', ol: false, at: [4, -1], rows: ['ww', '.w'], key: { w: 'white' } },
      ],
    },
    baker: { sleeve: ['sky2', 'sky3', true],
      torso: { rows: ['.bbbWw.', 'bbbbWww', 'bbbWwww', 'bBBWwww', 'bBBWwws', 'BBBWwss', '.BBWss.', '..Wwss.', '..Wsss.'],
               key: { b: 'sky2', B: 'sky3', W: 'cream0', w: 'white', s: 'stone1' } },
      villager: true, antTop: true,
      load: { rows: ['.12..12.', '1223122.', '22332233', 'TTTTTTTT', '.tttttt.'], key: { 1: 'brass0', 2: 'brass1', 3: 'brass2', T: 'iron2', t: 'iron3' } },
      parts: [
        { z: 'hat', at: [0, -5], rows: ['.wwwwww.', 'wwwwwwws', 'wwwwwwss', '.wwwwss.', '.ssssss.'], key: { w: 'white', s: 'stone1' } },
      ],
    },
    // The Gardener, who keeps the village's flower fields (GDD 6.11): grass-green cotton, a seed pouch at the hip, a
    // finely woven straw hat.
    gardener: { sleeve: ['grass2', 'grass3'],
      torso: { rows: ['.ggggG.', 'gggggGG', 'ggggGGG', 'gggGGGH', 'ggGGGGH', 'GGGGGHH', '.GGGHH.', '..HHH..'],
               key: { g: 'grass2', G: 'grass3', H: 'grass4' } },
      villager: true,
      parts: [
        { z: 'body', at: [-2, 4], rows: ['.t.', 'ppp', 'pPp', 'PPP'], key: { t: 'wood3', p: 'dirt2', P: 'dirt3' } },
        { z: 'hat', at: [-3, -2], rows: ['.....12121.....', '....1212121....', '...gggggggg....', '112121212121213'],
          key: { 1: 'dirt1', 2: 'dirt2', 3: 'dirt3', g: 'grass4' } },
      ],
    },
    kid: { kid: true, sleeve: ['white', 'stone1', true],
      torso: { rows: ['.wwww.', 'bbbbbB', 'wwwwws', 'bbbbbB', '.wwws.', '..bB..'], key: { w: 'white', s: 'stone1', b: 'blue', B: 'roofB2' } },
      villager: true,
      parts: [
        { z: 'hat', at: [-3, -1], rows: ['....12222...', '...1222223..', '3332222233..'], key: { 1: 'roofR0', 2: 'red', 3: 'roofR3' } },
      ],
    },
    // Pip, Mia's son and the post office's young apprentice (GDD 6.4): a blue and white striped shirt, an oversized
    // courier's cap worn tilted, postbox red so he is never taken for the courier, and a bundle of letters to carry.
    pip: { kid: true, sleeve: ['white', 'stone1', true],
      torso: { rows: ['.wwww.', 'bbbbbB', 'wwwwws', 'bbbbbB', '.wwws.', '..bB..'], key: { w: 'white', s: 'stone1', b: 'blue', B: 'roofB2' } },
      villager: true, lash: false,
      load: { rows: ['.111111.', '12222T21', '1222T221', '12TT2221', '.333333.'], key: { 1: 'cream0', 2: 'white', 3: 'cream2', T: 'wood3' } },
      parts: [
        { z: 'body', ol: false, at: [-1, 1], rows: ['T.', '.T', '.T'], key: { T: 'wood3' } },
        { z: 'hat', at: [-3, -3], rows: ['....11111....', '..122222221..', '.12222c222233', '1222222222333', '.....33333333'], key: { 1: 'roofR0', 2: 'red', 3: 'roofR3', c: 'cream0' } },
      ],
    },
    // Kapten Bram, the retired engine driver (GDD 6.13): a navy conductor's uniform with brass buttons and a white
    // collar, the brass whistle on its silver chain round his neck, a white moustache, the peaked cap with its gold band.
    bram: { sleeve: ['navy1', 'navy2'], polish: 'whistle',
      torso: { rows: ['.rrrmm.', 'mrRNNNn', 'mNNNNon', 'mNNNNNn', 'mNNNNon', 'NNNNNnn', '.NNnnn.', '..nnn..'],
               key: { r: 'cream0', R: 'stone1', m: 'navy0', N: 'navy1', n: 'navy2', o: 'brass1' } },
      bent: 0,
      parts: [
        { z: 'body', ol: false, at: [3, 1], rows: ['c..', '.c.', '.c.', '.ww', '.wW'], key: { c: 'stone1', w: 'brass1', W: 'brass2' } },
        { z: 'face', ol: false, at: [5, 7], rows: ['.sss', 'ss.s'], key: { s: 'stone0' } },
        { z: 'hat', at: [0, -3], rows: ['..NNNNNN...', '.NNNNNNNn..', 'NNNNNNNNnn.', 'yyyyyyByyy.', '....kkkkkkkk'], key: { N: 'navy1', n: 'navy2', y: 'brass1', B: 'brass0', k: 'ink' } },
      ],
    },
    // Nelayan Arlo, the fisherman at the jetty (GDD 6.12): sturdy, in a navy knitted wool jumper, olive waders and tall
    // rubber boots, a mustard knitted cap.
    arlo: { sleeve: ['water4', 'water5'],
      torso: { rows: ['.kNNNN.', 'kNnNnNN', 'kNnNnNN', 'NNnNnNn', 'NNnNnNn', 'NnNnNnn', '.oooOO.', '..OOO..'],
               key: { k: 'water4', N: 'water5', n: 'water6', o: 'moss2', O: 'moss3' } },
      villager: true, shoe: 'boot',
      parts: [
        { z: 'hat', at: [-1, -2], rows: ['...11111...', '.112222222.', '12222222223', '33333333333'], key: { 1: 'brass1', 2: 'brass2', 3: 'brass3' } },
      ],
    },
    // Background ants, known by what they wear, none like a named villager. Two neighbours who chat at the station: an
    // aunt in a lavender dress, a white apron and a dotted cream headscarf; an uncle in a mustard shirt with brown
    // braces and a black bowler hat.
    neighbour_a: { sleeve: ['lilac', 'lilac2'],
      torso: { rows: ['.rrrWw.', 'rrrrWww', 'rrRWwww', 'rRRWwww', 'rRRWwws', 'RRRWwss', '.RRWss.', '..Wwss.'],
               key: { r: 'lilac', R: 'lilac2', W: 'cream0', w: 'white', s: 'stone1' } },
      villager: true, lash: true,
      parts: [
        { z: 'hat', at: [-1, -1], rows: ['...sssss...', '.sssSrSSS..', 'ssSrSSSrTT.', 'sSSSrSTT...', 'sSrST......', 'sSST.......', 'sST........', 'ST.........'],
          key: { s: 'cream0', S: 'cream1', T: 'cream2', r: 'roofR2' } },
      ],
    },
    neighbour_b: { sleeve: ['brass1', 'brass2'],
      torso: { rows: ['.yyyyY.', 'yBYyyBY', 'yBYyyBY', 'yBYyYBY', 'yBYYYBY', 'YBYYYBZ', '.BYYZB.', '..ZZZ..'],
               key: { y: 'brass1', Y: 'brass2', Z: 'brass3', B: 'wood4' } },
      villager: true,
      parts: [
        { z: 'hat', at: [0, -3], rows: ['...kkkk...', '..kKKKKk..', '..kKKKKk..', 'kkkkkkkkkk'], key: { k: 'iron4', K: 'iron3' } },
      ],
    },
    // Two in the square: a shopper in an aqua cardigan over a cream blouse and a cream sun hat with an aqua ribbon, her
    // wicker basket on her arm; the flower seller in a pink pinafore over a white blouse, sleeves rolled, a wreath of
    // flowers round her head, a tray of potted flowers to carry home.
    shopper: { sleeve: ['water2', 'water3'],
      torso: { rows: ['.aaaAc.', 'aaaaAcc', 'aaAAocc', 'aAAAAcc', 'aAAAocs', 'AAAAAss', '.AAAss.', '..AAs..'],
               key: { a: 'water2', A: 'water3', c: 'cream0', s: 'cream1', o: 'white' } },
      villager: true, lash: true,
      load: { rows: ['..TTTT..', '.T.cc.T.', '.TgccgT.', 'WWWWWWWW', 'WwWwWwWW', '.wWwWww.'], key: { T: 'wood3', c: 'wood1', g: 'grass2', W: 'dirt2', w: 'dirt3' } },
      parts: [
        { z: 'hat', at: [-3, -2], rows: ['.....11111.....', '....1222222....', '...aaaaaaaa....', '111222222222223'], key: { 1: 'cream0', 2: 'cream1', 3: 'cream2', a: 'water3' } },
      ],
    },
    florist: { sleeve: ['white', 'stone1', true],
      torso: { rows: ['.wwwpw.', 'wwwpppw', 'wwppPpw', 'wpppPpp', 'wppPPpp', 'ppPPPPp', '.pPPPP.', '..PPP..'],
               key: { w: 'white', p: 'pink', P: 'rose' } },
      villager: true, lash: true,
      load: { rows: ['.pp...yy.', 'gppg.gyyg', '.gg...gg.', 'RRRR.RRRR', 'rRRR.rRRR', '.RR...RR.'], key: { p: 'pink', y: 'yellow', g: 'leaf3', R: 'roofR2', r: 'roofR1' } },
      parts: [
        { z: 'hat', ol: false, at: [-1, -2], rows: ['..pgygwgp..', '.gpgygwgpg.', 'g.........g'], key: { g: 'leaf3', y: 'yellow', w: 'white', p: 'rose' } },
      ],
    },
    // A porter at the station: a brown waistcoat over a cream shirt, sleeves rolled, a tweed flat cap, a sack to carry.
    porter: { sleeve: ['cream0', 'cream2', true],
      torso: { rows: ['.wwwLL.', 'wwwLLLM', 'wwLLLoM', 'wLLLLLM', 'wLLLLoM', 'LLLLLMM', '.LLMMM.', '..MMM..'],
               key: { w: 'cream0', L: 'wood2', M: 'wood3', o: 'brass1' } },
      villager: true,
      load: { rows: ['..1T1...', '.122221.', '12222223', '12222233', '22222233', '.223333.'], key: { 1: 'cream0', 2: 'cream1', 3: 'cream2', T: 'wood3' } },
      parts: [
        { z: 'hat', at: [-1, -1], rows: ['...111111...', '.1122222223.', '1222222222333'], key: { 1: 'stone2', 2: 'stone3', 3: 'stone4' } },
      ],
    },
  };
  const IDS = Object.keys(CAST);

  /* How each character that turns looks from the front and from the back, over the shared ant body (drawn round x 20,
     d the body's bob): cloth on its thorax ([lit, mid, shade]; bare ant without), what crosses it (chest), what shows
     either side of the body from the front (behind), the bag on its back (bag), its hat, and marks on its face. */
  const dome = (g, d, c0, c1) => { ellipse(g, 20, 15 + d, 6, 4, c1); g.clearRect(0, 16 + d, 40, 24); ellipse(g, 19, 13 + d, 4, 2, c0); };
  const atop = (g, fn) => { g.globalCompositeOperation = 'source-atop'; fn(); g.globalCompositeOperation = 'source-over'; };
  const TURN = {
    courier: {
      chest(g, d, back) { const side = back ? -1 : 1; for (let k = 0; k < 7; k++) rect(g, 20 - side * (3 - k), 24 + d + k, 1, 2, k < 3 ? 'cap2' : 'cap3'); },
      behind(g, d) { ellipse(g, 20, 25 + d, 5, 2, 'cap3'); rect(g, 15, 24 + d, 11, 1, 'cap2'); },
      bag: true,
      // the cap: its dome, the brim toward whichever way the courier faces
      hat(g, d, back) {
        ellipse(g, 20, 15 + d, 6, 4, 'cap2'); g.clearRect(0, 16 + d, 40, 24); ellipse(g, 19, 13 + d, 4, 2, 'cap1'); rect(g, 17, 12 + d, 2, 1, 'cap0');
        if (back) { rect(g, 14, 15 + d, 13, 1, 'cap3'); rect(g, 19, 14 + d, 3, 1, 'cream1'); }
        else { rect(g, 13, 15 + d, 15, 2, 'cap3'); rect(g, 13, 15 + d, 15, 1, 'cap2'); rect(g, 19, 12 + d, 2, 2, 'cream0'); dot(g, 20, 13 + d, 'cream1'); }
      },
    },
    // Helen: the slate cardigan, a brass chain at the collar, the headscarf with its bun at the back
    helen: {
      cloth: ['slate0', 'slate1', 'slate2'],
      chest(g, d) { rect(g, 17, 23 + d, 7, 1, 'brass1'); },
      hat(g, d, back) {
        dome(g, d, 'stone0', 'stone1');
        if (back) { ellipse(g, 20, 17 + d, 4, 2, 'stone2'); ellipse(g, 20, 11 + d, 2, 2, 'stone1'); }
      },
    },
    // the Mender: a cream shirt under the leather apron, its straps crossed at the back, goggles pushed up
    mender: {
      cloth: ['cream0', 'cream1', 'cream2'],
      chest(g, d, back) {
        if (back) { line(g, 17, 24 + d, 23, 30 + d, 'wood4'); line(g, 23, 24 + d, 17, 30 + d, 'wood4'); }
        else { rect(g, 18, 25 + d, 5, 7, 'wood3'); rect(g, 18, 25 + d, 1, 7, 'wood2'); dot(g, 18, 24 + d, 'wood4'); dot(g, 22, 24 + d, 'wood4'); }
      },
      hat(g, d, back) {
        rect(g, 15, 15 + d, 11, 1, 'wood4');
        if (!back) for (const ex of [17, 22]) { rect(g, ex - 1, 14 + d, 3, 3, 'brass1'); dot(g, ex, 15 + d, 'water1'); }
      },
    },
    // Kapten Bram: the navy uniform with its white collar and brass buttons, the whistle on its chain, the white
    // moustache, the peaked cap with its gold band
    bram: {
      cloth: ['navy0', 'navy1', 'navy2'],
      chest(g, d, back) {
        rect(g, 17, 23 + d, 7, 1, 'cream0');
        if (!back) { line(g, 18, 24 + d, 21, 27 + d, 'stone1'); rect(g, 21, 27 + d, 2, 2, 'brass1'); dot(g, 22, 28 + d, 'brass2'); dot(g, 19, 27 + d, 'brass1'); dot(g, 19, 29 + d, 'brass1'); }
      },
      face(x, d) { rect(x, 18, 20 + d, 5, 1, 'stone0'); dot(x, 17, 21 + d, 'stone0'); dot(x, 23, 21 + d, 'stone0'); },
      hat(g, d, back) {
        dome(g, d, 'navy0', 'navy1');
        rect(g, 14, 14 + d, 13, 1, 'brass1');
        if (back) rect(g, 14, 15 + d, 13, 1, 'navy2'); else { dot(g, 20, 13 + d, 'brass0'); rect(g, 15, 15 + d, 11, 2, 'ink'); }
      },
    },
    // the Baker: the white apron over the blue shirt, the tall chef's hat
    baker: {
      cloth: ['sky1', 'sky2', 'sky3'],
      chest(g, d, back) { if (back) { line(g, 17, 24 + d, 23, 24 + d, 'white'); rect(g, 19, 29 + d, 3, 1, 'white'); } else { rect(g, 17, 24 + d, 7, 8, 'white'); rect(g, 22, 24 + d, 2, 8, 'stone1'); } },
      hat(g, d) { rect(g, 16, 7 + d, 9, 7, 'white'); rect(g, 15, 8 + d, 11, 5, 'white'); rect(g, 22, 8 + d, 4, 5, 'stone1'); rect(g, 15, 13 + d, 11, 2, 'stone1'); rect(g, 15, 14 + d, 11, 1, 'stone2'); },
    },
    // Mia: the green work dress, the woven sling across it, her bobbed hair
    mia: {
      cloth: ['roofG0', 'roofG1', 'roofG2'],
      chest(g, d, back) { for (let k = 0; k < 7; k++) { dot(g, 17 + k, 24 + d + k, 'red'); dot(g, 18 + k, 24 + d + k, 'yellow'); } },
      hat(g, d, back) {
        dome(g, d, 'wood2', 'wood3');
        if (back) rect(g, 14, 15 + d, 13, 4, 'wood3'); else { rect(g, 13, 14 + d, 3, 5, 'wood3'); rect(g, 25, 14 + d, 3, 5, 'wood4'); rect(g, 22, 11 + d, 3, 1, 'yellow'); }
      },
    },
    // Sam: the moss-green knitted vest over the white collared shirt
    sam: {
      cloth: ['moss0', 'moss1', 'moss2'],
      chest(g, d, back) { rect(g, 17, 23 + d, 7, 1, 'white'); if (!back) { rect(g, 19, 24 + d, 3, 6, 'white'); dot(g, 20, 26 + d, 'stone2'); dot(g, 20, 28 + d, 'stone2'); } },
    },
    // Nora: the plum shawl over her head and down her shoulders, the cream dress under it, her glasses on their thread
    nora: {
      cloth: ['plum0', 'plum1', 'plum2'],
      chest(g, d, back) { if (!back) rect(g, 19, 24 + d, 3, 7, 'cream0'); },
      face(x, d) {
        for (const ex of [16, 22]) { rect(x, ex - 1, 16 + d, 4, 1, 'wood4'); rect(x, ex - 1, 20 + d, 4, 1, 'wood4'); rect(x, ex - 1, 17 + d, 1, 3, 'wood4'); rect(x, ex + 2, 17 + d, 1, 3, 'wood4'); }
        line(x, 15, 19 + d, 16, 24 + d, 'cream2');
      },
      hat(g, d, back) {
        dome(g, d, 'plum0', 'plum1');
        rect(g, 14, 15 + d, 2, 4, 'plum1'); rect(g, 25, 15 + d, 2, 4, 'plum2');
        if (back) rect(g, 15, 15 + d, 11, 6, 'plum1'); else dot(g, 18, 12 + d, 'cream0');
      },
    },
    // Leo: the worn track jacket, a stripe down each side and the zip down the front, his headband
    leo: {
      cloth: ['roofB0', 'roofB1', 'roofB2'],
      chest(g, d, back) { for (const sx of [17, 23]) rect(g, sx, 24 + d, 1, 7, 'white'); if (!back) rect(g, 20, 23 + d, 1, 8, 'stone1'); },
      hat(g, d) { rect(g, 15, 14 + d, 11, 1, 'white'); rect(g, 15, 15 + d, 11, 1, 'red'); },
    },
    // the Gardener: grass-green cotton, the seed pouch at the hip, the woven straw hat with its green band
    gardener: {
      cloth: ['grass1', 'grass2', 'grass3'],
      chest(g, d, back) { if (!back) { dot(g, 20, 25 + d, 'grass4'); dot(g, 20, 28 + d, 'grass4'); } rect(g, back ? 16 : 23, 29 + d, 3, 3, 'dirt2'); },
      hat(g, d) {
        ellipse(g, 20, 15 + d, 10, 1, 'dirt2'); rect(g, 11, 14 + d, 19, 1, 'dirt1');
        ellipse(g, 20, 11 + d, 5, 3, 'dirt1'); rect(g, 15, 12 + d, 11, 2, 'dirt2'); rect(g, 15, 13 + d, 11, 1, 'grass4');
        for (let x = 12; x < 29; x += 3) dot(g, x, 15 + d, 'dirt3');
      },
    },
    // Theo: the many-pocketed vest open on the grey shirt, the camera on his chest, the magnifier, the beret
    theo: {
      cloth: ['wood2', 'wood3', 'wood4'],
      chest(g, d, back) {
        if (back) return;
        rect(g, 19, 24 + d, 3, 7, 'stone1'); rect(g, 17, 28 + d, 2, 2, 'wood2'); rect(g, 22, 28 + d, 2, 2, 'wood2');
        rect(g, 18, 25 + d, 5, 3, 'iron2'); rect(g, 19, 26 + d, 2, 2, 'iron4'); dot(g, 19, 26 + d, 'water2');
      },
      face(x, d) { rect(x, 21, 16 + d, 4, 1, 'brass1'); rect(x, 21, 20 + d, 4, 1, 'brass1'); rect(x, 21, 17 + d, 1, 3, 'brass1'); rect(x, 24, 17 + d, 1, 3, 'brass1'); },
      hat(g, d, back) { dome(g, d, 'roofB2', 'roofB3'); rect(g, 13, 15 + d, 15, 1, 'roofB4'); rect(g, 19, 9 + d, 2, 2, 'roofB4'); },
    },
    // Arlo: the navy knitted jumper, ribbed, the olive waders' bib and straps, the mustard knitted cap
    arlo: {
      cloth: ['water4', 'water5', 'water6'],
      chest(g, d, back) {
        for (let x = 17; x < 24; x += 2) rect(g, x, 24 + d, 1, 4, 'water6');
        if (!back) rect(g, 18, 28 + d, 5, 3, 'moss2');
        for (const sx of [17, 23]) rect(g, sx, 24 + d, 1, 5, 'moss3');
      },
      hat(g, d) { dome(g, d, 'brass1', 'brass2'); rect(g, 14, 13 + d, 13, 3, 'brass3'); for (let x = 15; x < 27; x += 2) dot(g, x, 14 + d, 'brass2'); },
    },
    // the porter: a brown waistcoat open on the cream shirt, the tweed flat cap
    porter: {
      cloth: ['wood1', 'wood2', 'wood3'],
      chest(g, d, back) { if (!back) { rect(g, 19, 23 + d, 3, 6, 'cream0'); dot(g, 20, 26 + d, 'brass1'); } },
      hat(g, d, back) {
        dome(g, d, 'stone2', 'stone3');
        if (back) rect(g, 14, 15 + d, 13, 1, 'stone4'); else { rect(g, 14, 15 + d, 13, 2, 'stone4'); rect(g, 14, 15 + d, 13, 1, 'stone3'); }
      },
    },
  };

  /* ---------------- poses ---------------- */
  const POSES = { idle: 4, walk: 6, talk: 2, give: 2, receive: 2, carry: 2, carryWalk: 6, inspect: 2, wave: 2, sit: 2, moved: 2, run: 6, brew: 4, hammer: 4, look: 4, lift: 2, polish: 4, sweep: 4, weave: 4, water: 4, tend: 4, peer: 2, photo: 2, fish: 4 };
  const FPS = { idle: 4, walk: 10, run: 12, carryWalk: 9, talk: 6, give: 3, receive: 3, carry: 4, inspect: 3, wave: 5, sit: 2, moved: 2, brew: 3, hammer: 6, look: 2, lift: 2, polish: 4, sweep: 4, weave: 3, water: 4, tend: 3, peer: 1, photo: 1, fish: 2 };
  // Those in TURN also face the camera (pose_front) and turn away from it (pose_back) as they stand, walk, run and carry.
  const TURNS = ['idle', 'walk', 'run', 'carry', 'carryWalk'], VIEWS = ['front', 'back'];
  for (const p of TURNS) for (const v of VIEWS) { POSES[`${p}_${v}`] = POSES[p]; FPS[`${p}_${v}`] = FPS[p]; }
  const turned = pose => { const [p, v] = pose.split('_'); return v ? [p, v] : null; };
  const HAS = {};
  for (const id of IDS) {
    const s = ['idle', 'walk'];
    s.push('talk');
    if (['nora', 'mia', 'grandkid', 'theo', 'leo', 'sam', 'mother', 'marlow', 'courier', 'helen'].includes(id)) s.push('receive');
    if (['nora', 'mia', 'grandkid', 'theo', 'leo', 'sam', 'mother', 'marlow', 'courier'].includes(id)) s.push('give');
    if (id === 'courier') s.push('carry', 'carryWalk', 'inspect', 'wave', 'sit', 'moved', 'run');
    if (id === 'helen') s.push('sit', 'moved', 'brew');
    if (id === 'marlow') s.push('wave');
    if (id === 'leo') s.push('run');
    if (id === 'mender') s.push('hammer');
    if (id === 'bram' || id === 'sam' || id === 'leo') s.push('look');
    if (CAST[id].load) s.push('carry', 'carryWalk', 'lift');
    if (CAST[id].polish) s.push('polish');
    if (id === 'sam' || id === 'baker') s.push('sweep');
    if (id === 'pip') s.push('run');
    if (id === 'nora') s.push('weave');
    if (id === 'gardener') s.push('water', 'tend');
    if (id === 'leo') s.push('peer');
    if (id === 'theo') s.push('photo', 'look');
    if (id === 'arlo') s.push('fish', 'tend', 'sit');
    if (id === 'neighbour_a' || id === 'neighbour_b') s.push('sit');
    if (id === 'neighbour_a') s.push('look');
    if (id === 'shopper') s.push('look', 'sit');
    if (id === 'florist') s.push('water');
    if (TURN[id]) s.push(...TURNS.filter(p => s.includes(p)).flatMap(p => VIEWS.map(v => `${p}_${v}`)));
    HAS[id] = s;
  }
  const FALLBACK = { run: 'walk', carryWalk: 'walk', carry: 'idle', talk: 'idle' };
  const resolve = (id, pose) => {
    const s = HAS[id]; if (!s) throw new Error(`CH: unknown id '${id}'`);
    if (s.includes(pose)) return pose;
    return s.includes(FALLBACK[pose]) ? FALLBACK[pose] : 'idle';
  };

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
      case 'brew':   // pouring tea: the pot held out over the counter, tipped to pour on the middle frames
        r.pot = { tip: f === 1 || f === 2, pour: f === 2 };
        armN = r.pot.tip ? [[3, 2], [7, 2]] : [[3, 2], [6, 1]]; armF = [[3, 3], [6, 4]];
        if (f === 3) r.eye = 'blink';
        break;
      case 'hammer':   // at the anvil: the hammer raised, raised high, struck down, bounced up; tongs hold the work
        armN = [[[3, 0], [3, -4]], [[2, -2], [2, -6]], [[4, 1], [7, 2]], [[4, 1], [6, 0]]][f];
        armF = [[3, 3], [7, 4]];
        r.hammer = { to: [[-2, -4], [-3, -3], [4, 3], [4, -1]][f], spark: f === 2 };
        if (f === 2) { r.dx = 1; r.hy += 1; }
        break;
      case 'lift':   // bent over the load on the ground, hands on it: lifting it on the first frame, setting it down on the next
        r.dx = 1; r.hx += 2; r.hy += 4; r.dy = f ? 1 : 0;
        armN = [[3, 5], [6, 9 - f]]; armF = [[4, 5], [9, 9 - f]];
        r.ground = f ? 0 : 1;
        break;
      case 'look':   // looking up (at the clock), hands clasped behind the back
        r.dy = [0, 0, -1, 0][f]; r.hy -= 1; r.hx -= 1; r.eye = f === 3 ? 'blink' : 'up';
        armN = [[-1, 3], [-3, 4]]; armF = [[-1, 3], [-2, 4]];
        break;
      case 'sweep': {   // the broom held low in both hands, swept forward and back across the ground
        const k = [0, 1, 2, 1][f];
        armN = [[2, 3], [4 + k, 6]]; armF = [[3, 2], [6 + k, 4]];
        r.broom = { tip: [k * 2 - 1, 0], dust: f === 2 };
        break;
      }
      case 'weave':   // at the loom before her: the shuttle passed through the warp, then the beater pulled home
        armN = [[[3, 1], [8, 0]], [[3, 0], [9, -2]], [[3, 1], [8, 0]], [[2, 2], [6, 2]]][f];
        armF = f === 3 ? [[2, 2], [5, 2]] : [[3, 1], [7, 1]];
        r.hy += 1; if (f === 1) r.eye = 'squint';
        break;
      case 'water':   // the watering can held out low by its handle, tipped over the flowers, the water falling
        armN = [[2, 3], [6, 3]]; armF = [[2, 3], [4, 4]];
        r.hy += 1; r.can = f;
        break;
      case 'tend':   // bent over the rows, the hands working the soil round a plant in turn
        r.dx = 1; r.hx += 2; r.hy += 4;
        armN = [[3, 5], [[6, 9], [7, 8], [6, 9], [5, 8]][f]]; armF = [[4, 5], [[9, 8], [9, 9], [8, 8], [9, 9]][f]];
        break;
      case 'peer':   // an eye to the telescope's eyepiece, a hand steadying its tube
        r.hx += 1; r.eye = f ? 'closed' : 'squint';
        armN = [[3, 0], [7, -3]]; armF = [[2, 2], [5, 1]];
        break;
      case 'photo':   // the camera up to the eye in both hands; the shutter goes on the second frame
        armN = [[3, -1], [6, -4]]; armF = [[3, 0], [7, -3]];
        r.camera = f;
        break;
      case 'fish':   // the rod held out over the water, its tip nodding, the line drifting
        armN = [[3, 1], [7, -1]]; armF = [[3, 2], [6, 0]];
        r.rod = f;
        break;
      case 'polish':   // rubbing what they hold (Helen's cup, Bram's whistle) with a cloth, round and round
        armF = [[3, 3], [7, 3]]; armN = [[2, 3], [[4, 2], [6, 2], [6, 4], [4, 4]][f]];
        r.polish = true;
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
  // What someone carries: their own load (the porter's sack), else the courier's parcel.
  const load = id => memo('load|' + id, () => { const l = CAST[id].load; return l ? outlined(l.rows, l.key) : outlined(PARCEL, PARCEL_K); });

  function leg(x, l, L, shoe) {
    const c = l.far ? 'ant3' : 'ink';
    const kn = l.knee || knee(l.hip, l.foot, L.leg);
    line(x, l.hip[0], l.hip[1], kn[0], kn[1], c);
    line(x, kn[0], kn[1], l.foot[0], l.foot[1], c);
    if (shoe === 'boot') { rect(x, l.foot[0] - 1, l.foot[1] - 5, 2, 6, l.far ? 'moss3' : 'moss2'); rect(x, l.foot[0], l.foot[1], 2, 1, 'ink'); }
    if (shoe === 'wrap') rect(x, l.foot[0] - 1, l.foot[1] - 3, 3, 2, l.far ? 'cream2' : 'cream0');   // cloth wrapped round the ankle
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
    const layer = (z) => { for (const p of P.extra) if (p.z === z && !(p.off && p.off.includes(pose))) {
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
    if (r.parcel) put(x, load(id), r.parcel[0], r.parcel[1]);
    if (r.ground !== undefined) { const L = load(id); put(x, L, 26, 37 - L.height + 2 - r.ground); }   // the load at its feet, just off the ground as it lifts
    const hand = r.arms[1].pts[r.arms[1].pts.length - 1];
    if (r.hammer) {   // the handle from the hand, the iron head across its end, a spark off the anvil as it strikes
      const [ex, ey] = [hand[0] + r.hammer.to[0], hand[1] + r.hammer.to[1]];
      plated(x, g => { line(g, hand[0], hand[1], ex, ey, 'wood2'); rect(g, ex - 1, ey - 1, 3, 3, 'iron2'); dot(g, ex - 1, ey - 1, 'iron1'); });
      if (r.hammer.spark) { dot(x, ex + 3, ey - 2, 'yellow'); dot(x, ex + 4, ey, 'light0'); dot(x, ex + 2, ey - 3, 'light2'); }
    }
    if (r.broom) {   // the handle through both hands, up past the shoulder and down to the bristles on the ground
      const [bx, by] = [hand[0] + 6 + r.broom.tip[0], 37];
      plated(x, g => { line(g, hand[0] - 3, hand[1] - 6, bx, by - 2, 'wood2'); rect(g, bx - 1, by - 3, 5, 3, 'brass2'); rect(g, bx - 1, by - 3, 5, 1, 'wood3'); });
      if (r.broom.dust) { dot(x, bx + 5, by - 1, 'stone1'); dot(x, bx + 6, by - 3, 'stone0'); }
    }
    if (r.polish) {   // what is polished, in the far hand, under the cloth
      const [px2, py2] = r.arms[0].pts[r.arms[0].pts.length - 1];
      plated(x, g => ch.polish === 'cup'
        ? (rect(g, px2 - 1, py2 - 3, 4, 3, 'white'), dot(g, px2 - 2, py2 - 2, 'white'))
        : (rect(g, px2, py2 - 5, 2, 5, 'brass1'), dot(g, px2, py2 - 5, 'brass0'), dot(g, px2 + 1, py2 - 2, 'brass2')));
    }
    if (!r.behind) arm(x, r.arms[1], ch.sleeve);
    if (r.polish) [[0, -1, 'red'], [1, -1, 'white'], [0, 0, 'white'], [1, 0, 'red']].forEach(([ox, oy, c]) => dot(x, hand[0] + ox, hand[1] + oy, c));   // a checked cloth
    if (r.pot) {   // the teapot by its handle, leaning forward to pour, tea running from the spout
      const [hx2, hy2] = hand, lean = i => (r.pot.tip ? i >> 1 : 0);
      plated(x, g => {
        for (let i = 0; i < 5; i++) { const t = hy2 - 3 + lean(i); rect(g, hx2 + 1 + i, t, 1, 4, 'pink'); dot(g, hx2 + 1 + i, t, 'pink0'); dot(g, hx2 + 1 + i, t + 3, 'rose'); }
        rect(g, hx2 + 2, hy2 - 4 + lean(2), 3, 1, 'rose'); dot(g, hx2 + 3, hy2 - 5 + lean(3), 'rose');
        const sy = hy2 - 2 + lean(4) + (r.pot.tip ? 1 : 0);
        dot(g, hx2 + 6, sy, 'pink'); dot(g, hx2 + 7, sy + (r.pot.tip ? 1 : -1), 'pink');
      });
      if (r.pot.pour) for (let k = 1; k <= 4; k++) dot(x, hx2 + 8, hy2 + k, 'wood2');
    }
    if (r.camera !== undefined) {   // the camera held to the eye, its lens toward what is shot
      const [cx2, cy2] = hand;
      plated(x, g => { rect(g, cx2 - 2, cy2 - 3, 6, 4, 'iron2'); rect(g, cx2 - 2, cy2 - 3, 6, 1, 'iron1'); rect(g, cx2 + 4, cy2 - 2, 2, 2, 'iron3'); });
      dot(x, cx2 + 5, cy2 - 2, r.camera ? 'white' : 'water2');
    }
    if (r.rod !== undefined) {   // the rod from the hand out and up to its tip, the line from the tip down to the water
      const [rx, ry] = hand, tx = rx + 12, ty = ry - 13 + (r.rod & 1);
      line(x, rx, ry, tx, ty, 'wood3'); dot(x, rx - 1, ry + 1, 'wood4');
      for (let y = ty + 1; y < 39; y++) dot(x, tx + (((y + r.rod) >> 3) & 1), y, 'stone0');
    }
    if (r.can !== undefined) {   // the can's handle in the hand, its body below, its spout and rose down toward the ground
      const [cx2, cy2] = hand;
      plated(x, g => {
        rect(g, cx2 - 1, cy2 + 2, 7, 5, 'iron1'); rect(g, cx2 - 1, cy2 + 2, 7, 1, 'iron0'); rect(g, cx2 + 4, cy2 + 3, 2, 4, 'iron2');
        line(g, cx2, cy2, cx2 + 4, cy2 + 2, 'iron2'); line(g, cx2 + 6, cy2 + 5, cx2 + 9, cy2 + 6, 'iron2'); rect(g, cx2 + 9, cy2 + 6, 2, 2, 'iron0');
      });
      for (const [ox, oy] of [[11, 9], [12, 11], [10, 12]]) { const y = cy2 + oy + (r.can * 2 + ox) % 4; if (y < 38) dot(x, cx2 + ox, y, ox === 12 ? 'water2' : 'water1'); }
    }
    if (r.tear) { dot(x, hx + L.eye[0] + 1, hy + L.eye[1] + 4, 'water1'); dot(x, hx + L.eye[0] + 1, hy + L.eye[1] + 5, 'white'); }
    return c;
  }

  /* ---------------- front and back views ---------------- */
  /* Someone in TURN facing the camera or turned away, drawn round x 20 from the same colours, each part in its own
     ink outline as the side view's are: the head and its hat, the thorax in its cloth, the abdomen (behind it from the
     front, in front of the legs from the back), two legs stepping in place and two splayed ones, the arms swinging.
     The gaits keep the side view's timing: the same frames lift the same foot and bob the body. */
  const [tT, tX] = scratch(40, 40);
  function plated(x, fn) { tX.clearRect(0, 0, 40, 40); fn(tX); x.drawImage(outline(tT, 'ink'), -1, -1); }
  function gait(pose, f) {
    const g = { lift: [0, 0], dy: 0, sw: 0, blink: false, open: false };
    if (pose === 'idle') { g.dy = [0, -1, -1, 0][f]; g.blink = f === 3; }
    else if (pose === 'carry') g.dy = [0, -1][f];
    else if (pose === 'walk' || pose === 'carryWalk') { const L = [0, 0, 0, 0, 2, 1]; g.lift = [L[f], L[(f + 3) % 6]]; g.dy = [0, -1, -1, 0, -1, -1][f]; g.sw = [-1, -1, 1, 1, 1, -1][f]; }
    else if (pose === 'run') { g.lift = [RUNL[f], RUNL[(f + 3) % 6]]; g.dy = [0, -1, -2, 0, -1, -2][f]; g.sw = [-2, -1, 1, 2, 1, -1][f]; g.open = true; }
    return g;
  }
  // where a hand holds an item, turned: at the chest
  const turnedHand = (pose, f) => [20, 26 + gait(pose, f).dy];
  function renderTurned(id, pose, f, view) {
    const ch = CAST[id], T = TURN[id], back = view === 'back', g = gait(pose, f), d = g.dy, [c, x] = canvas(40, 40), G = 37;
    const carry = pose === 'carry' || pose === 'carryWalk', bag = T.bag && ch.parts.find(p => p.z === 'body');
    const [lit, mid, shade] = T.cloth || ['ant0', 'ant1', 'ant2'];
    // the splayed middle legs, then (from the front) the abdomen behind the body, then the two walking legs
    for (const s of [-1, 1]) { line(x, 20 + s * 4, 30 + d, 20 + s * 6, 33 + d, 'ant3'); line(x, 20 + s * 6, 33 + d, 20 + s * 7, 36, 'ant3'); }
    if (!back) {
      plated(x, gx => { ellipse(gx, 20, 29 + d, 5, 2, 'ant2'); rect(gx, 16, 30 + d, 9, 1, 'ant3'); });
      if (T.behind) plated(x, gx => T.behind(gx, d));
    }
    [[18, 17, g.lift[0]], [22, 23, g.lift[1]]].forEach(([hx, fx, l]) => {
      line(x, hx, 31 + d, fx, G - l, 'ink'); dot(x, fx + (fx < 20 ? -1 : 1), G - l, 'ink');
      if (ch.shoe === 'wrap') rect(x, fx - 1, G - l - 3, 3, 2, 'cream0');
      if (ch.shoe === 'boot') rect(x, fx - 1, G - l - 5, 3, 6, 'moss2');
    });
    // the arms hang at the sides and swing (a hand forward is a pixel lower), or hold the load to the chest
    const arms = () => [-1, 1].forEach(s => {
      const sh = [20 + s * 4, 25 + d], hand = carry ? [20 + s * 4, 28 + d] : [20 + s * 6, 30 + d + (s * g.sw > 0 ? 1 : 0) - (s * g.sw < -1 ? 1 : 0)];
      arm(x, { far: false, pts: [sh, hand] }, ch.sleeve);
    });
    if (!carry || back) arms();
    // the thorax in its cloth and what crosses it; from the back, the bag
    plated(x, gx => {
      ellipse(gx, 20, 27 + d, 3, 4, mid); rect(gx, 18, 24 + d, 1, 4, lit); rect(gx, 22, 25 + d, 1, 5, shade);
      if (T.chest) T.chest(gx, d, back);
    });
    if (back && bag) put(x, memo('bag|' + id, () => outlined(bag.rows, bag.key)), 16, 23 + d);
    // the head: from the front its eyes and mouth, from the back only its round
    plated(x, gx => { ellipse(gx, 20, 18 + d, 5, 4, 'ant1'); ellipse(gx, 21, 19 + d, 4, 3, 'ant2'); ellipse(gx, 19, 18 + d, 4, 3, 'ant1'); rect(gx, 17, 16 + d, 2, 1, 'ant0'); if (back) ellipse(gx, 20, 20 + d, 4, 1, 'ant2'); });
    if (!back) {
      for (const ex of [16, 22]) {
        if (g.blink) rect(x, ex, 19 + d, 2, 1, 'ink');
        else { rect(x, ex, 17 + d, 2, 3, 'cream0'); rect(x, ex < 20 ? ex + 1 : ex, 18 + d, 1, 2, 'pupil'); dot(x, ex < 20 ? ex : ex + 1, 17 + d, 'white'); }
        if (ch.lash && !g.blink) dot(x, ex < 20 ? ex - 1 : ex + 2, 16 + d, 'ink');
      }
      if (g.open) { rect(x, 19, 21 + d, 2, 2, 'ink'); dot(x, 19, 22 + d, 'roofR4'); } else rect(x, 19, 21 + d, 2, 1, 'ink');
      if (T.face) T.face(x, d);
    }
    // the antennae, elbowed outward (one bent at its tip, as in the side view), each with its club
    [-1, 1].forEach((s, i) => {
      const bx = 20 + s * 2, by = 14 + d, sway = pose === 'idle' && f >= 2 ? 1 : 0;
      [[0, -1], [0, -2], [1, -3], [1, -4], [2, -5], [2 + sway, -6]].forEach(([ax, ay]) => dot(x, bx + s * ax, by + ay, 'ink'));
      const tx = bx + s * (2 + sway), ty = by - 6, bent = ch.bent === (back ? 1 - i : i);
      const cx = bent ? tx + s : tx + (s > 0 ? 1 : -2), cy = bent ? ty - 1 : ty - 2;
      if (bent) dot(x, tx + s, ty, 'ink');
      rect(x, cx, cy, 2, 2, 'ant2'); dot(x, cx, cy, 'ant1'); dot(x, cx + 1, cy + 1, 'ant3');
    });
    if (T.hat) plated(x, gx => T.hat(gx, d, back));
    // from the back, the abdomen in front of the legs, banded
    if (back) plated(x, gx => { ellipse(gx, 20, 31 + d, 6, 3, 'ant1'); ellipse(gx, 21, 32 + d, 5, 2, 'ant2'); rect(gx, 16, 30 + d, 3, 1, 'ant0'); rect(gx, 15, 33 + d, 11, 1, 'ant3'); });
    if (carry && !back) { put(x, load(id), 16, 23 + d); arms(); }
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
    nora: { cloth: ['plum0', 'plum1', 'plum2'], lash: true,
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 22 && x <= 37 && y >= 36, (x, y) => band(x, 34, 99, ['cream0', 'cream1', 'cream1']));
        rect(g, 22, 36, 16, 1, 'cream2'); rect(g, 25, 42, 8, 5, 'cream2'); rect(g, 25, 42, 8, 1, 'cream1'); dot(g, 30, 41, 'cap2'); dot(g, 30, 40, 'rose');
         },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => (inE(x, y, P.cx - 1, P.cy - 2, 14, 12) && (y <= P.cy - 5 || (x <= P.cx - 5 && y <= P.cy + 5))),
          (x, y) => ((y > P.cy - 7 && x > P.cx - 7) || (x > P.cx - 7 && x <= P.cx - 5 && y > P.cy - 7) ? 'plum0' : band((x - P.cx) + (y - P.cy), -12, -2, ['plum0', 'plum1', 'plum2'])));
        for (const [dx, dy] of [[-8, -8], [-3, -11], [2, -8], [-10, -2]]) rect(g, P.cx + dx, P.cy + dy, 2, 2, 'cream0');
        region(g, (x, y) => inE(x, y, P.cx - 14, P.cy + 4, 3, 3), (x, y) => (x + y < P.cx + P.cy - 11 ? 'plum0' : 'plum1'));
        region(g, (x, y) => y > P.cy + 5 && y < P.cy + 13 && x >= P.cx - 18 + ((y - P.cy - 5) >> 1) && x <= P.cx - 16, () => 'plum2');
        region(g, (x, y) => y > P.cy + 6 && y < P.cy + 12 && x >= P.cx - 14 && x <= P.cx - 12 - ((y - P.cy - 6) >> 1), () => 'plum1');
      }); },
      face(x, P) {   // thick reading glasses, the thread they hang on running back under the shawl
        region(x, (x, y) => inE(x, y, P.ex + 3, P.ey + 4, 5, 5) && !inE(x, y, P.ex + 3, P.ey + 4, 3, 4), () => 'wood4');
        region(x, (x, y) => inE(x, y, P.ex + 11, P.ey + 4, 2, 5) && !inE(x, y, P.ex + 11, P.ey + 4, 1, 4), () => 'wood4');
        line(x, P.ex + 8, P.ey + 3, P.ex + 9, P.ey + 3, 'wood4'); line(x, P.ex - 2, P.ey + 4, P.cx - 12, P.cy + 6, 'cream2');
      } },
    mia: { cloth: ['roofG0', 'roofG1', 'roofG2'], lash: true,
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 26 && x <= 33, (x, y) => (x > 31 ? 'cream1' : 'cream0')); line(g, 26, 33, 25, 47, 'roofG3'); dot(g, 24, 39, 'cream0'); dot(g, 24, 44, 'cream0');
        for (let k = 0; k < 3; k++) line(g, 14 + k, 34, 31 + k, 47, ['red', 'yellow', 'red'][k]); },   // the woven sling
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 1, 14, 12) && (y <= P.cy - 6 - (x % 3 === 0 && x > P.cx ? -1 : 0) || (x <= P.cx - 3 && y <= P.cy + 9)),
          hairShade(P, ['wood2', 'wood3', 'wood4']));
        line(g, P.cx - 2, P.cy - 11, P.cx - 10, P.cy + 1, 'wood4'); line(g, P.cx + 3, P.cy - 11, P.cx + 7, P.cy - 7, 'wood4');
      }); plate(x, g => { rect(g, P.cx + 1, P.cy - 12, 5, 2, 'yellow'); dot(g, P.cx + 1, P.cy - 12, 'light0'); dot(g, P.cx + 5, P.cy - 11, 'brass2'); }); } },
    theo: { cloth: ['wood2', 'wood3', 'wood4'],
      face(x, P) {   // the magnifying lens over the near eye, its brass tube standing out
        region(x, (x, y) => inE(x, y, P.ex + 3, P.ey + 4, 5, 5) && !inE(x, y, P.ex + 3, P.ey + 4, 3, 4), () => 'brass1');
        rect(x, P.ex + 8, P.ey + 2, 2, 5, 'brass2'); dot(x, P.ex + 8, P.ey + 2, 'brass0');
      },
      bust(g) { for (const [px2, py2] of [[12, 40], [15, 44]]) { rect(g, px2, py2, 5, 3, 'wood4'); rect(g, px2, py2, 5, 1, 'wood2'); } region(g, (x, y) => inE(x, y, 25, 35, 11, 3), (x, y) => band(x, 20, 31, ['stone1', 'stone2', 'stone3'])); rect(g, 19, 37, 5, 10, 'stone2'); rect(g, 19, 37, 2, 10, 'stone1'); rect(g, 19, 46, 5, 1, 'stone3');
        line(g, 31, 34, 35, 40, 'ink2'); rect(g, 30, 40, 9, 6, 'iron3'); rect(g, 30, 40, 9, 2, 'iron2'); rect(g, 33, 42, 4, 4, 'iron4'); rect(g, 34, 43, 2, 2, 'water2'); dot(g, 34, 43, 'white'); rect(g, 31, 39, 2, 1, 'iron1'); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => inE(x, y, P.cx - 3, P.cy - 9, 14, 5) && y <= P.cy - 6, (x, y) => band((x - P.cx) + (y - P.cy) * 2, -24, -4, ['roofB2', 'roofB3', 'roofB4'])); rect(g, P.cx - 2, P.cy - 16, 2, 2, 'roofB4'); }); } },
    leo: { cloth: ['roofB0', 'roofB1', 'roofB2'],
      bust(g) { for (const sx of [11, 14]) line(g, sx, 37, sx - 1, 47, 'white'); line(g, 37, 37, 38, 47, 'white'); rect(g, 29, 34, 1, 14, 'stone1'); dot(g, 29, 38, 'iron1');
        region(g, (x, y) => inE(x, y, 26, 35, 8, 2), (x, y) => (y < 35 ? 'roofB2' : 'roofB3')); for (const [fx, fy] of [[20, 41], [33, 44], [24, 46]]) rect(g, fx, fy, 2, 1, 'roofB0'); },
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
    gardener: { cloth: ['grass1', 'grass2', 'grass3'],
      bust(g) { region(g, (x, y) => inE(x, y, 26, 35, 8, 2), (x, y) => (y < 35 ? 'grass1' : 'grass3')); line(g, 33, 34, 19, 47, 'wood3'); dot(g, 28, 40, 'grass4'); dot(g, 28, 44, 'grass4'); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => inE(x, y, 23, 13, 22, 3), (x, y) => (y < 13 ? 'dirt1' : 'dirt2')); region(g, (x, y) => inE(x, y, 22, 8, 9, 6) && y <= 11, (x, y) => band(x + y, 26, 34, ['dirt0', 'dirt1', 'dirt2']));
        rect(g, 13, 9, 19, 2, 'grass4'); for (let i = 4; i < 42; i += 3) dot(g, i, 12 + (i & 1), 'dirt3'); for (let i = 15; i < 30; i += 3) dot(g, i, 6 + (i & 1) * 2, 'dirt2'); }); } },
    kid: { cloth: ['white', 'white', 'stone1'], kid: true,
      bust(g) { for (let y = 38; y < 48; y += 4) region(g, (x, yy) => inBust(x, yy) && yy >= y && yy < y + 2, (x) => (x > 31 ? 'roofB2' : 'blue')); },
      hat(x, P) { plate(x, g => { region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 6, 13, 7) && y <= P.cy - 5, (x, y) => band((x - P.cx) + (y - P.cy) * 1.5, -20, -4, ['roofR0', 'red', 'roofR3']));
        rect(g, P.cx - 22, P.cy - 7, 10, 3, 'red'); rect(g, P.cx - 22, P.cy - 5, 10, 1, 'roofR3'); rect(g, P.cx - 14, P.cy - 6, 27, 2, 'roofR3'); }); } },
    bram: { cloth: ['navy0', 'navy1', 'navy2'],
      bust(g) { region(g, (x, y) => inE(x, y, 26, 35, 8, 2), (x, y) => (y < 35 ? 'white' : 'stone1')); for (const y of [40, 44]) rect(g, 28, y, 2, 2, 'brass1');
        line(g, 22, 36, 31, 43, 'stone1'); rect(g, 31, 42, 4, 3, 'brass1'); rect(g, 31, 42, 4, 1, 'brass0'); dot(g, 34, 44, 'brass2'); },
      face(x, P) { rect(x, P.mx - 4, P.my - 1, 7, 2, 'white'); dot(x, P.mx - 5, P.my + 1, 'white'); dot(x, P.mx + 3, P.my + 1, 'white'); rect(x, P.mx - 4, P.my, 7, 1, 'stone0'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx, P.cy - 7, 14, 8) && y <= P.cy - 6, (x, y) => band((x - P.cx) + (y - P.cy), -22, -4, ['navy0', 'navy1', 'navy2']));
        rect(g, P.cx - 14, P.cy - 6, 28, 2, 'brass1'); rect(g, P.cx - 2, P.cy - 10, 3, 3, 'brass0'); dot(g, P.cx - 1, P.cy - 9, 'brass2');
        rect(g, P.cx + 6, P.cy - 4, 12, 2, 'ink');
      }); } },
    arlo: { cloth: ['water4', 'water5', 'water6'],
      bust(g) { for (let x = 11; x < 40; x += 3) line(g, x, 38, x, 47, 'water6'); region(g, (x, y) => inE(x, y, 25, 35, 9, 2), () => 'water4');
        rect(g, 20, 41, 14, 7, 'moss2'); rect(g, 20, 41, 14, 1, 'moss1'); line(g, 21, 41, 18, 35, 'moss3'); line(g, 32, 41, 33, 35, 'moss3'); dot(g, 22, 43, 'brass1'); dot(g, 31, 43, 'brass1'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 7, 14, 8) && y <= P.cy - 4, (x, y) => band((x - P.cx) + (y - P.cy), -22, -6, ['brass1', 'brass2', 'brass3']));
        rect(g, P.cx - 15, P.cy - 7, 29, 4, 'brass3'); for (let x = P.cx - 14; x < P.cx + 14; x += 2) dot(g, x, P.cy - 6, 'brass2');
        rect(g, P.cx - 3, P.cy - 17, 4, 2, 'brass2');
      }); } },
    neighbour_a: { cloth: ['lilac0', 'lilac', 'lilac2'], lash: true,
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 20 && x <= 37 && y >= 37, (x, y) => (x > 34 ? 'stone1' : 'white')); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 1, 14, 12) && !inE(x, y, P.cx + 5, P.cy + 4, 12, 11) && y <= P.cy + 6, hairShade(P, ['cream0', 'cream1', 'cream2']));
        for (const [dx, dy] of [[-8, -8], [-2, -11], [3, -8], [-11, -2], [-6, -4]]) rect(g, P.cx + dx, P.cy + dy, 2, 2, 'roofR2');
      }); } },
    neighbour_b: { cloth: ['brass0', 'brass1', 'brass2'],
      bust(g) { for (const bx of [19, 33]) { line(g, bx, 35, bx - 1, 47, 'wood4'); line(g, bx + 1, 35, bx, 47, 'wood3'); } },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 9, 10, 7) && y <= P.cy - 5, (x, y) => band(x - P.cx + (y - P.cy), -22, -10, ['iron2', 'iron3', 'iron4']));
        rect(g, P.cx - 15, P.cy - 6, 29, 2, 'iron4');
      }); } },
    shopper: { cloth: ['water1', 'water2', 'water3'], lash: true,
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 25 && x <= 32, (x, y) => (x > 30 ? 'cream1' : 'cream0')); dot(g, 24, 40, 'white'); dot(g, 24, 44, 'white'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx, P.cy - 5, 22, 3), (x, y) => (y < P.cy - 5 ? 'cream0' : 'cream1'));
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 10, 10, 6) && y <= P.cy - 7, (x, y) => band(x + y, P.cx + P.cy - 16, P.cx + P.cy - 6, ['cream0', 'cream1', 'cream2']));
        rect(g, P.cx - 10, P.cy - 9, 20, 2, 'water3');
      }); } },
    florist: { cloth: ['white', 'white', 'stone1'], lash: true,
      bust(g) { region(g, (x, y) => inBust(x, y) && y >= 39 && x >= 17 && x <= 37, (x, y) => (x > 33 ? 'rose' : 'pink')); for (const bx of [19, 35]) line(g, bx, 34, bx, 39, 'pink'); },
      hat(x, P) { plate(x, g => {
        for (let k = -12; k <= 12; k += 3) { const y = P.cy - 9 + Math.round((k / 12) ** 2 * 6); rect(g, P.cx + k - 1, y, 3, 2, 'leaf3'); dot(g, P.cx + k, y, ['rose', 'yellow', 'white'][(k + 12) / 3 % 3]); }
      }); } },
    porter: { cloth: ['wood1', 'wood2', 'wood3'],
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 25 && x <= 31, () => 'cream0'); dot(g, 28, 40, 'brass1'); dot(g, 28, 44, 'brass1'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx - 1, P.cy - 7, 14, 6) && y <= P.cy - 4, (x, y) => band(x - P.cx + (y - P.cy), -22, -8, ['stone2', 'stone3', 'stone4']));
        rect(g, P.cx + 4, P.cy - 5, 12, 2, 'stone4');
      }); } },
    sam: { cloth: ['moss0', 'moss1', 'moss2'],
      bust(g) { region(g, (x, y) => inBust(x, y) && x >= 25 && x <= 31, () => 'white'); region(g, (x, y) => inE(x, y, 28, 34, 6, 2), (x, y) => (y < 34 ? 'white' : 'stone1'));
        for (let y = 38; y < 48; y += 2) { dot(g, 22, y, 'moss2'); dot(g, 34, y, 'moss2'); } dot(g, 28, 40, 'stone2'); dot(g, 28, 44, 'stone2'); } },
    pip: { cloth: ['white', 'white', 'stone1'], kid: true,
      bust(g) { for (let y = 38; y < 48; y += 4) region(g, (x, yy) => inBust(x, yy) && yy >= y && yy < y + 2, (x) => (x > 31 ? 'roofB2' : 'blue')); line(g, 30, 34, 18, 47, 'wood3'); },
      hat(x, P) { plate(x, g => {
        region(g, (x, y) => inE(x, y, P.cx - 2, P.cy - 9, 16, 9) && y <= P.cy - 5 + ((x - P.cx) >> 3), (x, y) => band((x - P.cx) + (y - P.cy) * 1.5, -24, 0, ['roofR0', 'red', 'roofR3']));
        rect(g, P.cx - 18, P.cy - 6, 34, 2, 'roofR3'); rect(g, P.cx + 10, P.cy - 4, 12, 3, 'red'); rect(g, P.cx + 10, P.cy - 2, 12, 1, 'roofR3');
        rect(g, P.cx - 6, P.cy - 13, 5, 4, 'cream0'); rect(g, P.cx - 5, P.cy - 12, 3, 2, 'cream1');
      }); } },
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
    return memo(`s|${id}|${p}|${f}`, () => { const t = turned(p); return t ? renderTurned(id, t[0], f, t[1]) : render(id, p, f); });
  }
  const MOODS = { courier: ['smile'], marlow: ['smile'], mother: ['smile'], helen: ['moved'], nora: ['smile', 'moved'], mia: ['smile', 'moved'], grandkid: ['smile', 'moved'] };

  window.CH = {
    ids: IDS,
    POSES,
    poses: id => HAS[id].slice(),
    // px of ground covered per frame by walk / carryWalk / run, so feet don't skate (advance a frame every stride px)
    stride: (id, pose) => (resolve(id, pose).split('_')[0] === 'run' ? (CAST[id].kid ? 4 : 5) : CAST[id].kid ? 2 : 3),
    frames: (id, pose) => POSES[resolve(id, pose)],
    fps: pose => FPS[pose] || 6,
    sprite: sprite40,
    hand(id, pose, frame = 0) {
      const p = resolve(id, pose), f = wrap(p, frame), t = turned(p);
      if (t) { const [hx, hy] = turnedHand(t[0], f); return [hx - 20, hy - 37]; }
      const r = rig(CAST[id], p, f), a = r.arms[1].pts, h = r.hold || a[a.length - 1];
      return [h[0] - 20, h[1] - 37];
    },
    draw(ctx, id, pose, frame, x, y, dir = 1, opts = {}) {
      x = Math.round(x); y = Math.round(y);
      if (opts.shadow !== false) shadow(ctx, turned(resolve(id, pose)) ? x : x - 2 * dir, y, CAST[id].kid ? 6 : 8, 1);
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
