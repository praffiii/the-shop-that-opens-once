/* The Shop That Opens Once — synthesized ambience + small sounds (Web Audio, decorative only). */
(() => {
  const LEVEL = 0.5;                 // master gain; voices are already subtle
  const BPM = 69, STEP = 60 / BPM / 2; // eighth note at 69 bpm, 6 per 3/4 bar (a scene may keep its own tempo and bar)
  const AHEAD = 0.3, BARS = 16;      // look-ahead window (s), loop length
  const MUSIC_CAP = 20, FX_CAP = 28; // max simultaneous voices
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const midi = (n) => n === '.' ? 0 : (+n.slice(-1) + 1) * 12 + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[n[0]] + (n[1] === '#') - (n[1] === 'b');

  // Timbres: [ratio, amp, decay scale]
  const BOX = [[1, 1, 1], [2, 0.16, 0.5], [5.43, 0.06, 0.12]];   // music box: bright inharmonic ping
  const PIANO = [[1, 1, 1], [2.003, 0.18, 0.4]];
  const WARM = [[1, 1, 1], [2, 0.1, 0.5], [3, 0.04, 0.3]];
  const BELL = [[1, 1, 1], [2.41, 0.6, 0.75]];
  // The GDD themes' other voices, as _note options: a celesta, a nylon guitar's pluck, and a cello's bow (its slow swell).
  const CELESTA = { partials: [[1, 1, 1], [4, 0.1, 0.2], [2, 0.06, 0.4]], vol: 0.065, dec: 2.2, atk: 0.003 };
  const GUITAR = { type: 'triangle', partials: [[1, 1, 1], [2, 0.3, 0.4], [3, 0.1, 0.25]], lp: 2200, vol: 0.024, dec: 1.3, atk: 0.004 };
  const CELLO = { type: 'sawtooth', lp: 800, vol: 0.03, dec: 3, atk: 0.22 };

  // 16 bars of A minor; chords as [bass, ...voicing]. 'resolved' swaps Am->C, Em->G.
  const PROG = 'Am Am F C Dm Am Em Em Am Am F G C F Em Am'.split(' ');
  const CHORDS = { Am: [45, 57, 60, 64], F: [41, 57, 60, 65], C: [48, 55, 60, 64], Dm: [38, 57, 62, 65], Em: [40, 55, 59, 64], G: [43, 55, 59, 62], Bb: [46, 58, 62, 65], Gm: [43, 58, 62, 67], A: [45, 57, 61, 64], D: [38, 54, 57, 62], E: [40, 56, 59, 64] };
  const MAJOR = { Am: 'C', Em: 'G' };
  const tune = (bars) => bars.replace(/\|/g, ' ').trim().split(/\s+/).map(midi);
  // Melody in eighths; opens with the 1-0-1-7 motif of 10:17 (A4 A3 A4 G5: the 0 the root an octave down).
  const MEL = tune(`A4 . A3 . A4 . | G5 . . . . . | . . F5 . E5 . | E5 . D5 . C5 . |
               D5 . . . F5 . | E5 . . . C5 . | B4 . . . . . | . . . . . . |
               A4 . A3 . A4 . | G5 . . . E5 . | F5 . E5 . C5 . | D5 . . . B4 . |
               E5 . . . . . | . . A4 . C5 . | B4 . . . G4 . | A4 . . . . .`);

  const SCENES = {
    dusk:     { lp: 1500, wet: 0.22, dens: 1, oct: 0 },
    /* The Shop at Midnight: the dusk theme's music box turned to clockwork, a plucked waltz under it (the bass on the
       one, the chord on two and three) and the pendulum's tick-tock on every beat. */
    shop: {
      lp: 2000, wet: 0.16, oct: 0,
      comp(v) {
        if (v.s === 0) v.note(v.bass, { type: 'triangle', partials: PIANO, vol: 0.055, dec: 0.8, atk: 0.004 });
        if (v.s === 2 || v.s === 4) v.ch.forEach(m => v.note(m, { type: 'triangle', partials: WARM, vol: 0.016, dec: 0.45, atk: 0.004 }));
        if (v.s % 2 === 0) v.hit({ type: 'highpass', f: (v.bar * 3 + v.s / 2) % 2 ? 2600 : 3400, vol: 0.05, dur: 0.025, atk: 0.001 });
      },
    },
    // A memory: the music box an octave up, slow, over chords that swell in and hang in the echo.
    memory: {
      lp: 1000, wet: 0.4, oct: 12, bpm: 60,
      comp(v) { if (v.s === 0) [v.bass, ...v.ch].forEach((m, k) => v.note(m, { partials: WARM, vol: k ? 0.018 : 0.03, atk: 0.9, dec: 4.5 })); },
    },
    plan:     { lp: 1300, wet: 0.18, dens: 1, oct: 0, thin: true },  // melody only on motif bars
    resolved: { lp: 2400, wet: 0.25, dens: 2, oct: 0, major: true, bpm: 72, bow: true, arp: true },
    /* The night: slower, the cello holding each bar's root low, the music box keeping only the 10:17 motif and a few
       notes after it, a chord now and then, and a celesta's star high over it. */
    night: {
      lp: 1200, wet: 0.36, oct: 0, bpm: 60, lead: { partials: BOX, vol: 0.055, dec: 3.2, atk: 0.003 },
      prog: 'Am Am F F Dm Dm E E Am Am F F Dm E Am Am'.split(' '),
      mel: tune(`A4 . A3 . A4 . | G5 . . . . . | . . . . . . | . . E5 . . . |
                 F5 . . . . . | . . . . D5 . | E5 . . . . . | . . . . . . |
                 A4 . A3 . A4 . | G5 . . . . . | . . . . C5 . | A4 . . . . . |
                 . . D5 . . . | B4 . . . G#4 . | A4 . . . . . | . . . . . .`),
      comp(v) {
        if (v.s === 0) v.note(v.bass, { ...CELLO, vol: 0.036, atk: 0.6, dec: 5 });
        if (v.s === 0 && v.bar % 2 === 0) v.ch.forEach((m, k) => v.key(m, 0.016, 0.14 * k));
        if (v.s === 3 && v.bar % 2) v.note(v.ch[(v.bar >> 1) % 3] + 12, { ...CELESTA, vol: 0.035, dec: 2.8 });
      },
    },
    /* The GDD's own themes (13.2), 16 bars a loop, each with its chords, line, lead voice, tempo and bar; bow adds a
       cello under each bar, arp a guitar picking the chord on the other eighths. The Cliff of Lingering Waves: in 6/8,
       a celesta over the guitar rolling through the chord every eighth like the swell, the bass on both beats and the
       cello under it, in D minor. */
    coast: {
      lp: 1800, wet: 0.34, oct: 0, lead: CELESTA, bpm: 80,
      comp(v) {
        if (v.s === 0) { v.key(v.bass, 0.05); v.note(v.bass, CELLO); }
        if (v.s === 3) v.key(v.bass + 12, 0.03);
        v.note([v.ch[0], v.ch[1], v.ch[2], v.ch[0] + 12, v.ch[2], v.ch[1]][v.s], GUITAR);
      },
      prog: 'Dm Dm Bb F C C Dm A Dm Dm Bb F Gm A Dm Dm'.split(' '),
      mel: tune(`A5 . . . . . | F5 . E5 . D5 . | D5 . . . F5 . | C5 . . . . . |
                 E5 . . . G5 . | E5 . D5 . C5 . | D5 . . . . . | C#5 . . . E5 . |
                 A5 . . . D6 . | C6 . A5 . F5 . | G5 . . . F5 . | A5 . . . . . |
                 G5 . F5 . D5 . | E5 . . . C#5 . | D5 . . . . . | . . . . . .`),
    },
    // Mother's Loom and Memories: solo piano, Satria's home, built on Ratih's lullaby (G E D C A D C).
    loom: {
      lp: 1700, wet: 0.2, oct: 0, bpm: 60, lead: { type: 'triangle', partials: PIANO, vol: 0.06, dec: 2.6, atk: 0.008 },
      // the left hand breaking each chord up and back down, as a lullaby rocks
      comp(v) { v.key([v.bass, v.ch[0], v.ch[1], v.ch[2], v.ch[1], v.ch[0]][v.s], v.s ? 0.024 : 0.055); },
      prog: 'C Am F G C Am Dm G F G Em Am Dm G C C'.split(' '),
      mel: tune(`G4 . . . E5 . | D5 . . . C5 . | A4 . . . D5 . | C5 . . . B4 . |
                 G4 . . . E5 . | D5 . . . C5 . | A4 . . . F5 . | E5 . . . D5 . |
                 C5 . . . A4 . | B4 . . . D5 . | G5 . . . E5 . | C5 . . . . . |
                 D5 . . . F5 . | E5 . D5 . B4 . | C5 . . . . . | . . . . . .`),
    },
    // Uncut Letter, for the epilogue and the credits: piano, guitar and a cello carrying the 10:17 motif home in F major.
    letter: {
      lp: 2200, wet: 0.24, dens: 1, oct: 0, bpm: 63, lead: { ...CELLO, lp: 1600, vol: 0.045, dec: 2.4, atk: 0.12 }, arp: true, bow: true,
      prog: 'F C Dm Bb F C Bb C Dm Am Bb F Gm C F F'.split(' '),
      mel: tune(`A4 . A3 . A4 . | G5 . . . E5 . | F5 . E5 . D5 . | D5 . . . . . |
                 C5 . . . F5 . | E5 . . . G5 . | F5 . D5 . Bb4 . | C5 . . . . . |
                 A4 . A3 . A4 . | G5 . . . E5 . | F5 . . . D5 . | C5 . . . A4 . |
                 Bb4 . . . D5 . | E5 . . . G5 . | F5 . . . . . | . . . . . .`),
    },
    // Quiet Station at Dawn, the village's mornings: a celesta over rolled piano chords in G major, sparse as first light,
    // the piano rolling up through each bar's chord, and now and then a bird's two notes high over it.
    dawn: {
      lp: 1600, wet: 0.32, oct: 0, lead: CELESTA, bpm: 76,
      comp(v) {
        v.key([v.bass, v.ch[0], v.ch[1], v.ch[2], v.ch[0] + 12, v.ch[1] + 12][v.s], v.s ? 0.022 : 0.05);
        if (v.s === 5 && v.bar % 4 === 3) [0, 0.6].forEach((dt, k) => v.note(v.ch[2 - k] + 24, { ...CELESTA, vol: 0.03, dec: 0.5 }, dt * v.step));
      },
      prog: 'G G Em Em C C D D G G Em Em C D G G'.split(' '),
      mel: tune(`B4 . . . D5 . | G5 . . . . . | E5 . . . G5 . | B4 . . . . . |
                 C5 . . . E5 . | G5 . . . E5 . | F#5 . . . D5 . | A4 . . . . . |
                 B4 . . . D5 . | G5 . . . A5 . | B5 . . . G5 . | E5 . . . . . |
                 E5 . . . C5 . | D5 . . . F#5 . | G5 . . . . . | . . . . . .`),
    },
    /* Bellwood Marketplace, the village's middays: in 4/4, the busiest of them, a nylon guitar's bass on one and three
       (the root, then its fifth) and its strum on two and four, a shaker on every eighth, under a guitar line that keeps
       moving. */
    market: {
      lp: 2400, wet: 0.18, oct: 0, bpm: 80, beats: 8,
      lead: { type: 'triangle', partials: [[1, 1, 1], [2, 0.35, 0.4], [3, 0.12, 0.25]], lp: 2600, vol: 0.05, dec: 0.9, atk: 0.004 },
      prog: 'C G Am F C G F G C G Am Em F G C C'.split(' '),
      mel: tune(`E5 . G5 . C6 . G5 . | B5 . . . G5 . D5 . | C6 . B5 . A5 . E5 . | F5 . . . A5 . . . |
                 G5 . E5 . G5 . C6 . | D6 . . . B5 . G5 . | A5 . G5 . F5 . A5 . | G5 . . . . . . . |
                 E5 . G5 . C6 . E6 . | D6 . B5 . G5 . B5 . | C6 . A5 . E5 . A5 . | B5 . . . G5 . . . |
                 A5 . C6 . A5 . F5 . | G5 . B5 . D6 . B5 . | C6 . . . G5 . E5 . | C5 . . . . . . .`),
      comp(v) {
        if (v.s === 0 || v.s === 4) v.note(v.bass + (v.s && 7), { ...GUITAR, lp: 1200, vol: 0.05, dec: 0.5 });
        if (v.s === 2 || v.s === 6) v.ch.forEach((m, k) => v.note(m, { ...GUITAR, vol: 0.02, dec: 0.35 }, 0.012 * k));
        v.hit({ type: 'highpass', f: 6500, vol: v.s % 2 ? 0.05 : 0.028, dur: 0.05, atk: 0.004 });
      },
    },
  };

  const CAPTIONS = {
    bell: 'Shop bell', step: 'Footsteps', tick: 'Clock ticking', chime: 'Soft chime',
    motif: 'Music box: 10:17 motif', page: 'Paper rustle', pop: 'Soft blip',
    wrong: 'Gentle "hmm"', right: 'Rising notes', whoosh: 'Soft whoosh', latch: 'Box latch', bus_far: 'A bus far off, driving away', bus_stop: 'A bus pulling up and opening its door', drop: 'A basket dropped on the ground', gate: 'A rusty gate creaking open', door: 'A key turning, a heavy door creaking open', bed: 'An old bed creaking', blow: 'A lamp blown out', crickets: 'Crickets', bell_toll: 'A great brass bell tolling', match: 'A match struck', scrub: 'Feet scrubbed on a coir mat', pour: 'Water poured from a jar', hiss: 'A mosquito coil hissing as it catches', kettle: 'A kettle coming to the boil', pen: 'A dip pen scratching', sift: 'Flour shaken through a sieve', thump: 'Dough pressed on the table', click: 'A gear clicking round', ting: 'A spring pinging loose', ticktock: 'A watch ticking again', oil: 'Oil rubbed in with a rag', flare: 'A lantern wick catching', whistle: 'A steam whistle', rain: 'Heavy rain', clink: 'Marbles clinking', snip: 'Shears snipping a stem', rustle: 'Brambles rustling', whir: 'A treadle sewing machine running', trrak: 'A needle jamming on the plate', knot: 'Thread pulled tight', spray: 'A mist spray', lullaby: 'A music-box lullaby', music: 'Quiet piano and music box',
    pump: 'A hand pump stroked, water gulping up', squeal: 'A rubber valve squealing, water spraying', gurgle: 'Water gurgling down a drain', tumbler: 'A lock tumbler clicking into place', blot: 'Blotting paper pressed down', pinch: 'Tweezers squeezed', fan: 'A bamboo fan wafting',
    climb: 'Hands and boots finding a hold on wet rock', gust: 'A gust of sea wind', sreek: 'A boot slipping down the rock', snag: 'A rope snagging on a shell and creaking', pluck: 'Mint leaves picked', slosh: 'Developer sloshing in the tank', ice: 'Ice dropped into water', bubble: 'Bubbles rising in the warm developer', alarm: 'A darkroom timer ringing',
    lantern_out: 'A lantern going out, one low warm note', waves: 'Waves breaking on the rocks', chain: 'A chain and padlock coming off a door', tea: 'Tea poured into a clay cup', projector: 'An 8mm projector rattling', shutter: 'An 8mm camera cranked and clicking', thunder: 'Thunder rolling', drip: 'Water dripping into a tin bucket', vault: 'A vault door unbolted and swinging open', ledger: 'A ledger page turned', seal: 'A wax seal cracking', unfold: 'A letter unfolded', run: 'Running feet', start_whistle: 'A starting whistle', radio_static: 'Radio static', radio_hum: 'A radio humming, tuned in', musicbox: "Mother's music box playing", tear: 'Paper tearing', flutter: 'Paper scraps fluttering away', train: 'The old engine steaming down the line', cheer: 'The village cheering', stamp: 'A stamp thumped down',
    crank: 'A music box crank winding a notch', mbox_1: 'A music-box note', mbox_2: 'A music-box note', mbox_3: 'A music-box note', mbox_4: 'Two quick music-box notes', klangg: 'A spring twanging loose', stall: 'A music box running down', drawer: 'A hidden catch clicking, a drawer sliding out', rip: 'Paper ripping', crumple: 'Paper crumpling',
    radio_crackle: 'Radio static crackling', radio_howl: 'A radio howling', radio_tone: 'A clean tone on the radio', keroncong: 'Keroncong on an old radio', ink_spill: 'Ink spilling', wax_press: 'A wax seal pressed',
  };

  const FX = {
    bell: (s, t) => [0, 0.13].forEach((d, i) => s._note(t + d, 1480, { partials: BELL, vol: i ? 0.04 : 0.065, dec: 1.4, atk: 0.002 })),
    step(s, t, o) {
      const k = s._n++ % 4, v = [1, 0.87, 1.12, 0.94][k];
      if (o.surface === 'wood') {
        s._noise(t, { f: 520 * v, q: 2, vol: 0.6, dur: 0.09, off: k * 0.3 });
        s._note(t, 95 * v, { vol: 0.07, dec: 0.1, atk: 0.003 });
      } else s._noise(t, { f: 1900 * v, q: 1.2, vol: 0.45, dur: 0.05, off: k * 0.3 });
    },
    tick: (s, t) => {
      s._noise(t, { type: 'highpass', f: 3000, vol: 0.1, dur: 0.018, atk: 0.001 });
      s._note(t, s._n++ % 2 ? 2000 : 2400, { vol: 0.025, dec: 0.03, atk: 0.001 });
    },
    chime: (s, t) => [81, 76].forEach((m, i) => s._note(t + i * 0.24, hz(m), { partials: WARM, vol: 0.06, dec: 1.8 })),
    motif: (s, t) => [69, 57, 69, 79].forEach((m, i) => s._note(t + i * STEP, hz(m), { partials: BOX, vol: 0.075, dec: i === 3 ? 3 : 2, atk: 0.003 })),
    page: (s, t) => s._noise(t, { f: 2400, f2: 5200, q: 0.8, vol: 0.25, atk: 0.02, dur: 0.14 }),
    pop: (s, t) => s._note(t, 660, { vol: 0.045, dec: 0.12, atk: 0.003, glide: 1.5 }),
    wrong: (s, t) => [55, 52].forEach((m, i) => s._note(t + i * 0.28, hz(m), { type: 'triangle', lp: 700, vol: 0.08, dec: 0.6, atk: 0.02 })),
    right: (s, t) => [72, 76, 79].forEach((m, i) => s._note(t + i * 0.13, hz(m), { partials: WARM, vol: 0.055, dec: i === 2 ? 1.6 : 1 })),
    whoosh: (s, t) => s._noise(t, { f: 400, f2: 1800, q: 0.7, vol: 0.35, atk: 0.45, dur: 0.85 }),
    // a brass clasp flicked open, then the wooden lid lifting
    latch: (s, t) => {
      s._noise(t, { type: 'highpass', f: 2600, vol: 0.14, dur: 0.02, atk: 0.001 });
      s._note(t, 1900, { vol: 0.03, dec: 0.05, atk: 0.001 });
      s._noise(t + 0.12, { f: 340, f2: 620, q: 3, vol: 0.3, atk: 0.06, dur: 0.32 });
    },
    // a bus far off up the road, driving away: its engine faint and fading
    bus_far: (s, t) => engine(s, t, 3.6, u => 0.1 - 0.03 * u, u => 0.4 * (1 - u) * (1 - u)),
    // a bus pulling up just out of sight: its engine slowing, the brakes' hiss, the door folding open
    bus_stop: (s, t) => {
      engine(s, t, 2.2, u => 0.08 + 0.06 * u, u => 0.45 * (1 - 0.5 * u));
      s._noise(t + 1.5, { type: 'highpass', f: 2800, vol: 0.16, atk: 0.02, dur: 0.55 });
      s._noise(t + 2.3, { type: 'lowpass', f: 320, vol: 0.4, dur: 0.06, atk: 0.003 });
      s._noise(t + 2.36, { f: 1200, q: 2, vol: 0.12, dur: 0.12, atk: 0.01 });
    },
    // a woven basket landing on the cobbles, then the loaves in it settling with a little bounce
    drop: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 420, vol: 0.55, dur: 0.08, atk: 0.003 });
      s._note(t, 110, { vol: 0.08, dec: 0.12, atk: 0.002 });
      s._noise(t + 0.09, { f: 900, q: 1.5, vol: 0.2, dur: 0.05, atk: 0.003 });
      s._noise(t + 0.16, { type: 'lowpass', f: 380, vol: 0.18, dur: 0.05, atk: 0.003 });
    },
    // a rusty iron gate pushed open, its hinges shrieking, and its latch clacking against the post
    gate: (s, t) => {
      creak(s, t, 0.9, 1400, 900, 0.05);
      s._noise(t + 0.95, { type: 'highpass', f: 1800, vol: 0.2, dur: 0.03, atk: 0.001 });
      s._note(t + 0.95, 820, { type: 'triangle', vol: 0.05, dec: 0.18, atk: 0.001 });
    },
    // the key turned in the lock (click), then the heavy teak door dragging open on its old hinges
    door: (s, t) => {
      s._noise(t, { type: 'highpass', f: 2400, vol: 0.18, dur: 0.02, atk: 0.001 });
      s._note(t, 1700, { vol: 0.03, dec: 0.04, atk: 0.001 });
      creak(s, t + 0.5, 1.3, 520, 300, 0.07);
      s._noise(t + 0.5, { type: 'lowpass', f: 300, vol: 0.18, atk: 0.3, dur: 1.2 });
    },
    // the old bed's springs giving under a tired body
    bed: (s, t) => { creak(s, t, 0.5, 700, 560, 0.06); creak(s, t + 0.65, 0.3, 640, 600, 0.07); },
    // a soft breath, and the flame gone
    blow: (s, t) => s._noise(t, { f: 900, f2: 500, q: 0.6, vol: 0.3, atk: 0.08, dur: 0.5 }),
    // the great brass bell at midnight, one stroke: a deep hum felt in the chest, its shimmer dying away slowly
    bell_toll: (s, t) => {
      s._note(t, 98, { partials: [[1, 1, 1], [2.0, 0.5, 0.8], [2.76, 0.35, 0.6], [5.4, 0.12, 0.3]], vol: 0.16, dec: 4.2, atk: 0.004 });
      s._note(t, 49, { vol: 0.12, dec: 3, atk: 0.01 });
      s._noise(t, { type: 'lowpass', f: 260, vol: 0.4, dur: 0.06, atk: 0.002 });
    },
    // a match dragged along the box (cresst), then the flare catching
    match: (s, t) => {
      s._noise(t, { f: 2600, f2: 5200, q: 1.4, vol: 0.3, atk: 0.01, dur: 0.16 });
      s._noise(t + 0.16, { type: 'lowpass', f: 900, vol: 0.25, atk: 0.04, dur: 0.5 });
    },
    // feet scrubbed on the coir doormat, twice (srek-srek)
    scrub: (s, t) => [0, 0.32].forEach(d => s._noise(t + d, { f: 1400, f2: 2200, q: 0.9, vol: 0.3, atk: 0.03, dur: 0.22 })),
    // water poured from the clay jar into the dipper (syuuur)
    pour: (s, t) => {
      s._noise(t, { f: 700, f2: 1300, q: 1.6, vol: 0.32, atk: 0.12, dur: 1.1 });
      for (let k = 0; k < 6; k++) s._note(t + 0.15 + k * 0.15, 900 + 140 * k, { vol: 0.012, dec: 0.08, atk: 0.005 });
    },
    // the mosquito coil's end catching: a soft hiss
    hiss: (s, t) => s._noise(t, { type: 'highpass', f: 4200, vol: 0.12, atk: 0.1, dur: 0.9 }),
    // the kettle on the stove, its whistle rising as it boils
    kettle: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 500, vol: 0.12, atk: 0.4, dur: 1.4 });
      s._note(t + 0.7, 1500, { vol: 0.03, dec: 1.2, atk: 0.4, glide: 1.25 });
    },
    // flour shaken through the sieve, one shake (shh)
    sift: (s, t) => s._noise(t, { f: 3000, f2: 5200, q: 0.8, vol: 0.2, atk: 0.03, dur: 0.16 }),
    // the heels of the hands pushing into the dough on the table (thump)
    thump: (s, t) => { s._noise(t, { type: 'lowpass', f: 300, vol: 0.5, dur: 0.07, atk: 0.004 }); s._note(t, 80, { vol: 0.1, dec: 0.12, atk: 0.003 }); },
    // a brass gear turned one tooth on (click)
    click: (s, t) => { s._noise(t, { type: 'highpass', f: 3600, vol: 0.12, dur: 0.012, atk: 0.001 }); s._note(t, 1250, { vol: 0.03, dec: 0.04, atk: 0.001 }); },
    // a gear slipping and its spring pinging off (tinggg)
    ting: (s, t) => { s._noise(t, { type: 'highpass', f: 2400, vol: 0.14, dur: 0.03, atk: 0.001 }); s._note(t + 0.02, 2600, { partials: BOX, vol: 0.05, dec: 1.6, atk: 0.002, glide: 0.92 }); },
    // the old watch going again: tick, tock, tick, tock
    ticktock: (s, t) => { for (let k = 0; k < 6; k++) { s._noise(t + k * 0.42, { type: 'highpass', f: k % 2 ? 2400 : 3200, vol: 0.12, dur: 0.016, atk: 0.001 }); s._note(t + k * 0.42, k % 2 ? 1500 : 2100, { vol: 0.03, dec: 0.05, atk: 0.001 }); } },
    // damar oil worked into the soot with a rag (srrk, srrk)
    oil: (s, t) => [0, 0.5].forEach(d => s._noise(t + d, { f: 1800, f2: 1100, q: 1.1, vol: 0.22, atk: 0.12, dur: 0.38 })),
    // an oil lantern's wick taking the flame: a soft rising whump
    flare: (s, t) => { s._noise(t, { type: 'lowpass', f: 380, f2: 900, vol: 0.32, atk: 0.06, dur: 0.45 }); s._note(t + 0.05, 220, { vol: 0.03, dec: 0.4, atk: 0.05, glide: 1.4 }); },
    // the night train's steam whistle, 1952: two notes together, long, over the hiss of steam
    whistle: (s, t) => { for (const m of [74, 78]) s._note(t, hz(m), { partials: WARM, vol: 0.05, dec: 1.4, atk: 0.12 }); s._noise(t, { type: 'highpass', f: 2600, vol: 0.12, atk: 0.1, dur: 1.6 }); },
    // the storm's rain on the platform roof, a few seconds of it
    rain: (s, t) => { s._noise(t, { f: 1600, f2: 2600, q: 0.5, vol: 0.3, atk: 0.5, dur: 3.2 }); s._noise(t + 1.2, { type: 'lowpass', f: 140, vol: 0.3, atk: 0.4, dur: 1.4 }); },
    // marbles knocking together in the ring (klik-tik)
    clink: (s, t) => [0, 0.09].forEach((d, i) => { s._noise(t + d, { type: 'highpass', f: 3800, vol: 0.1, dur: 0.01, atk: 0.001 }); s._note(t + d, i ? 2950 : 3400, { partials: BOX, vol: 0.035, dec: 0.18, atk: 0.001 }); }),
    // the Gardener's little shears closing on a stem (snip)
    snip: (s, t) => { s._noise(t, { f: 4200, q: 3, vol: 0.18, dur: 0.03, atk: 0.001 }); s._note(t + 0.01, 3100, { vol: 0.02, dec: 0.08, atk: 0.001 }); },
    // thorny brambles shaken, petals falling (kresek)
    rustle: (s, t) => [0, 0.12, 0.27].forEach((d, i) => s._noise(t + d, { f: 2600 - 400 * i, q: 0.9, vol: 0.22, atk: 0.02, dur: 0.16 })),
    // the treadle going and the needle running (drrrt)
    whir: (s, t) => {
      for (let k = 0; k < 14; k++) s._noise(t + k * 0.07, { f: 1700, q: 2, vol: 0.12, dur: 0.025, atk: 0.002 });
      s._note(t, 70, { type: 'triangle', vol: 0.06, dec: 1, atk: 0.1, glide: 1.3 });
    },
    // the needle striking the throat plate and the thread snarling in the bobbin (TRRAK)
    trrak: (s, t) => {
      s._noise(t, { type: 'highpass', f: 2000, vol: 0.32, dur: 0.04, atk: 0.001 });
      s._note(t, 1900, { partials: BOX, vol: 0.05, dec: 0.4, atk: 0.001, glide: 0.8 });
      for (let k = 1; k < 7; k++) s._noise(t + k * 0.035, { f: 900, q: 1.5, vol: 0.2 / k, dur: 0.03, atk: 0.002 });
    },
    // red thread drawn tight through the button and knotted
    knot: (s, t) => { s._noise(t, { f: 1800, f2: 3600, q: 2, vol: 0.14, atk: 0.04, dur: 0.22 }); s._note(t + 0.24, 880, { vol: 0.04, dec: 0.12, atk: 0.003, glide: 1.3 }); },
    // the chamomile water misted over the cloth, twice (pss, pss)
    spray: (s, t) => [0, 0.36].forEach(d => s._noise(t + d, { type: 'highpass', f: 5200, vol: 0.12, atk: 0.02, dur: 0.24 })),
    // Ratih's lullaby, the one she hummed at the treadle, on a music box: a slow rocking line and its root under it
    lullaby: (s, t) => {
      const B = 0.3;
      [['G4', 2], ['E5', 1], ['D5', 2], ['C5', 1], ['A4', 2], ['D5', 1], ['C5', 3]]
        .reduce((at, [n, len]) => { s._note(t + at * B, hz(midi(n)), { partials: BOX, vol: 0.06, dec: Math.min(len * 0.5, 1.1), atk: 0.003 }); return at + len; }, 0);
      [[0, 48], [6, 53], [9, 48]].forEach(([at, m]) => s._note(t + at * B, hz(m), { partials: PIANO, vol: 0.035, dec: 1.1, atk: 0.01 }));
    },
    // the hall basement's 1952 hand pump, one stroke: the iron lever's clunk, then the water gulping up the pipe (gluk)
    pump: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 420, vol: 0.42, dur: 0.06, atk: 0.003 });
      s._note(t, 130, { type: 'triangle', vol: 0.06, dec: 0.1, atk: 0.002 });
      s._note(t + 0.08, 230, { vol: 0.05, dec: 0.12, atk: 0.01, glide: 1.6 });
      s._noise(t + 0.1, { f: 600, f2: 1100, q: 2, vol: 0.18, atk: 0.03, dur: 0.18 });
    },
    // the pump's rubber valve squealing shut, and the water spraying out round it (iiik, psshh)
    squeal: (s, t) => {
      s._note(t, 1250, { type: 'sawtooth', lp: 2600, vol: 0.035, dec: 0.45, atk: 0.02, glide: 1.25 });
      s._note(t + 0.02, 1290, { type: 'square', lp: 2000, vol: 0.02, dec: 0.4, atk: 0.02, glide: 1.2 });
      s._noise(t + 0.15, { type: 'highpass', f: 2800, vol: 0.16, atk: 0.02, dur: 0.6 });
    },
    // the last of the flood going down the drain: glug, glug, glug, and a gurgle after it
    gurgle: (s, t) => {
      for (let k = 0; k < 5; k++) s._note(t + k * 0.17, 180 + 40 * (k % 3), { vol: 0.11, dec: 0.09, atk: 0.01, glide: 1.8 });
      s._noise(t, { f: 500, f2: 260, q: 1.5, vol: 0.4, atk: 0.1, dur: 1 });
    },
    // a tumbler's spring dropping its pin into the key's notch (klik)
    tumbler: (s, t) => {
      s._noise(t, { type: 'highpass', f: 4200, vol: 0.16, dur: 0.012, atk: 0.001 });
      s._note(t, 2200, { partials: BOX, vol: 0.04, dec: 0.12, atk: 0.001 });
      s._note(t + 0.005, 520, { vol: 0.04, dec: 0.05, atk: 0.001 });
    },
    // blotting paper pressed down under the roller (fff)
    blot: (s, t) => s._noise(t, { f: 1400, f2: 900, q: 0.9, vol: 0.34, atk: 0.04, dur: 0.2 }),
    // the brass tweezers' tips squeezed a little (tik)
    pinch: (s, t) => { s._noise(t, { type: 'highpass', f: 5000, vol: 0.16, dur: 0.01, atk: 0.001 }); s._note(t, 3600, { vol: 0.03, dec: 0.04, atk: 0.001 }); },
    // one waft of the bamboo fan (fwip)
    fan: (s, t) => s._noise(t, { f: 700, f2: 1500, q: 0.7, vol: 0.34, atk: 0.06, dur: 0.2 }),
    // Night 3's sea-mint cliff: a hand and a boot finding the next hold on the wet rock, a pebble or two falling away
    climb: (s, t) => {
      s._noise(t, { f: 900, f2: 600, q: 1.2, vol: 0.28, atk: 0.01, dur: 0.09 });
      s._noise(t + 0.08, { type: 'highpass', f: 2600, vol: 0.08, dur: 0.03, atk: 0.002 });
      [0.2, 0.31].forEach((d, i) => s._note(t + d, i ? 2300 : 1800, { vol: 0.015, dec: 0.05, atk: 0.001 }));
    },
    // the sea wind gusting up the cliff face, rising and falling away
    gust: (s, t) => {
      s._noise(t, { f: 450, f2: 1500, q: 0.6, vol: 0.34, atk: 0.8, dur: 1.9 });
      s._noise(t + 0.4, { f: 1900, f2: 900, q: 1.5, vol: 0.12, atk: 0.5, dur: 1.4 });
    },
    // a boot skidding down the wet rock to the ledge below (SREEK) and landing
    sreek: (s, t) => {
      s._noise(t, { f: 3200, f2: 900, q: 1.6, vol: 0.32, atk: 0.01, dur: 0.38 });
      s._noise(t + 0.36, { type: 'lowpass', f: 380, vol: 0.4, dur: 0.07, atk: 0.003 });
      s._note(t + 0.36, 90, { vol: 0.07, dec: 0.12, atk: 0.002 });
    },
    // the rope caught on an oyster shell: the shell's scrape, then the hemp creaking taut
    snag: (s, t) => {
      s._noise(t, { type: 'highpass', f: 3000, vol: 0.18, dur: 0.05, atk: 0.001 });
      s._note(t, 2100, { partials: [[1, 1, 1], [2.7, 0.4, 0.4]], vol: 0.03, dec: 0.12, atk: 0.001 });
      creak(s, t + 0.1, 0.55, 380, 300, 0.06);
    },
    // a clump of sea mint pulled from its crack: leaves tearing and a soft snap
    pluck: (s, t) => {
      s._noise(t, { f: 2400, f2: 4200, q: 1, vol: 0.2, atk: 0.02, dur: 0.12 });
      s._note(t + 0.1, 700, { vol: 0.035, dec: 0.08, atk: 0.002, glide: 1.4 });
    },
    // Night 3's darkroom: the developer sloshing round as the tank is rocked
    slosh: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 900, f2: 380, vol: 0.3, atk: 0.06, dur: 0.32 });
      for (let k = 0; k < 3; k++) s._note(t + 0.08 + k * 0.07, 420 + 90 * k, { vol: 0.012, dec: 0.06, atk: 0.004, glide: 1.3 });
    },
    // a cube of sea-water ice knocked on the bucket's rim and dropped into the bath (plop)
    ice: (s, t) => {
      s._noise(t, { type: 'highpass', f: 3600, vol: 0.1, dur: 0.012, atk: 0.001 });
      s._note(t, 3100, { partials: BOX, vol: 0.03, dec: 0.14, atk: 0.001 });
      s._note(t + 0.16, 520, { vol: 0.05, dec: 0.1, atk: 0.003, glide: 1.8 });
      s._noise(t + 0.16, { type: 'lowpass', f: 700, vol: 0.18, dur: 0.08, atk: 0.004 });
    },
    // the old emulsion overheating: bubbles rising and popping in the developer
    bubble: (s, t) => { for (let k = 0; k < 7; k++) s._note(t + k * 0.09 + (k % 3) * 0.02, 380 + ((k * 7) % 5) * 70, { vol: 0.06, dec: 0.07, atk: 0.003, glide: 1.9 }); },
    // the darkroom timer's bell: TING, and its ring dying away
    alarm: (s, t) => [0, 0.16].forEach((d, i) => s._note(t + d, 2093, { partials: BELL, vol: i ? 0.035 : 0.06, dec: 1.2, atk: 0.001 })),
    // the radio crackling as the knob goes by between stations (kssk)
    radio_crackle: (s, t) => {
      s._noise(t, { f: 2800, q: 0.5, vol: 0.09, atk: 0.02, dur: 0.22 });
      [0.02, 0.09, 0.16].forEach(d => s._noise(t + d, { type: 'highpass', f: 3200, vol: 0.1, dur: 0.008, atk: 0.001 }));
    },
    // the tuning turned too fast: the capacitor's plates feed back and the speaker howls (WUUUUNGG)
    radio_howl: (s, t) => {
      s._note(t, 260, { type: 'sawtooth', lp: 1800, vol: 0.05, atk: 0.05, dec: 1.3, glide: 2.4 });
      s._note(t, 263, { type: 'square', lp: 1200, vol: 0.025, atk: 0.05, dec: 1.2, glide: 2.38 });
      s._noise(t, { f: 1200, f2: 3000, q: 3, vol: 0.18, atk: 0.05, dur: 1 });
      s._note(t, 70, { vol: 0.08, dec: 0.8, atk: 0.02, glide: 0.7 });
    },
    // the old station's carrier swelling clean through the static as the wave crests: one pure tone at 740
    radio_tone: (s, t) => {
      s._note(t, 740, { partials: [[1, 1, 1], [2, 0.2, 0.6], [3, 0.06, 0.4]], vol: 0.045, atk: 0.15, dec: 0.7 });
      s._note(t, 370, { vol: 0.02, atk: 0.15, dec: 0.7 });
    },
    // the static gone and Father's afternoon station playing through the old radio: keroncong, a violin over the
    // ukuleles' interlocking cak and cuk and a plucked cello, three bars, all through the cabinet's warm speaker
    keroncong: (s, t) => {
      const B = 0.36, at = t + 0.25, radio = { lp: 1700 };
      s._noise(t, { f: 2600, q: 0.4, vol: 0.1, atk: 0.01, dur: 0.5 });
      [['E5', 2], ['D5', 1], ['C5', 1], ['D5', 1.5], ['E5', 0.5], ['F5', 1], ['D5', 1], ['E5', 1], ['D5', 0.5], ['C5', 2.5]]
        .reduce((b, [n, len]) => { s._note(at + b * B, hz(midi(n)), { type: 'sawtooth', ...radio, vol: 0.03, atk: 0.07, dec: len * B * 1.1 }); return b + len; }, 0);
      ['C', 'G', 'C'].forEach((chord, bar) => {
        const [cak, root, fifth] = chord === 'C' ? [[60, 64, 67], 36, 43] : [[62, 65, 67, 71], 31, 38];
        for (let b = 0; b < 4; b++) {
          const beat = at + (bar * 4 + b) * B;
          s._note(beat, hz(b % 2 ? fifth : root + (b === 2 ? 12 : 0)), { type: 'triangle', lp: 800, vol: 0.06, dec: 0.3, atk: 0.004 });
          cak.forEach((m, k) => s._note(beat + B / 2 + k * 0.012, hz(m), { type: 'triangle', lp: 2400, vol: 0.016, dec: 0.12, atk: 0.003 }));
          for (const q of [0.25, 0.75]) s._note(beat + q * B, hz(root + 36), { type: 'triangle', ...radio, vol: 0.01, dec: 0.08, atk: 0.003 });
        }
      });
    },
    // the stamp pressed while the books don't balance: the ink spills out over the page, and drips
    ink_spill: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 900, f2: 300, vol: 0.45, atk: 0.004, dur: 0.14 });
      s._noise(t + 0.01, { f: 1800, q: 1.5, vol: 0.12, dur: 0.1 });
      [0.22, 0.36, 0.55].forEach((d, i) => s._note(t + d, 900 - 120 * i, { vol: 0.03, dec: 0.07, atk: 0.003, glide: 0.55 }));
    },
    // the red wax of the 1952 service pressed soft under the seal, hissing as it sets
    wax_press: (s, t) => {
      s._noise(t, { f: 600, f2: 280, q: 1.4, vol: 0.28, atk: 0.02, dur: 0.22 });
      s._noise(t + 0.04, { type: 'highpass', f: 4800, vol: 0.05, atk: 0.06, dur: 0.5 });
    },
    // a dip pen across the page, three strokes (srek-srek)
    pen: (s, t) => [0, 0.26, 0.5].forEach((d, i) => s._noise(t + d, { f: 3400 + 300 * i, q: 2.5, vol: 0.12, atk: 0.02, dur: 0.18 })),
    // crickets outside in the dark: two of them, a few chirps each, one a little farther off
    crickets: (s, t) => {
      for (let k = 0; k < 6; k++) for (const [at, f, v] of [[0, 4300, 0.03], [0.37, 4700, 0.018]])
        for (let p = 0; p < 3; p++) s._note(t + at + k * 0.62 + p * 0.045, f, { vol: v, dec: 0.03, atk: 0.004 });
    },
    // a shop lantern going out: one warm low note, the flame's last breath over it
    lantern_out: (s, t) => {
      s._note(t, 110, { partials: WARM, vol: 0.1, dec: 2.6, atk: 0.06 });
      s._note(t, 55, { vol: 0.05, dec: 2, atk: 0.1 });
      s._noise(t, { f: 900, f2: 500, q: 0.6, vol: 0.12, atk: 0.08, dur: 0.5 });
    },
    // a swell breaking on the black rock under the cliff: its rise, the boom and the spray, the wash drawing back
    waves: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 160, f2: 420, vol: 0.14, atk: 0.7, dur: 0.95 });
      s._noise(t + 0.8, { type: 'lowpass', f: 520, f2: 220, vol: 0.5, dur: 0.7, atk: 0.02 });
      s._note(t + 0.8, 58, { vol: 0.08, dec: 0.5, atk: 0.01 });
      s._noise(t + 0.85, { f: 3200, f2: 1600, q: 0.6, vol: 0.18, atk: 0.06, dur: 1.4 });
      s._noise(t + 0.95, { type: 'lowpass', f: 700, f2: 300, vol: 0.2, atk: 0.3, dur: 1.9 });
      s._noise(t + 2.1, { f: 1800, f2: 3400, q: 0.8, vol: 0.07, atk: 0.5, dur: 1.5 });
    },
    // the chain run out through the hasp, the padlock knocking on the door (KLANK-KLANK), and the chain let fall
    chain: (s, t) => {
      const link = (at, f, v) => {
        s._noise(at, { type: 'highpass', f: 2800, vol: v, dur: 0.015, atk: 0.001 });
        s._note(at, f, { partials: [[1, 1, 1], [2.7, 0.5, 0.4]], vol: v * 0.3, dec: 0.12, atk: 0.001 });
      };
      for (let k = 0; k < 9; k++) link(t + k * 0.055 + (k % 3) * 0.012, 1700 + ((k * 5) % 7) * 130, 0.12);
      [0.62, 0.98].forEach((d, i) => {
        s._noise(t + d, { type: 'lowpass', f: 600, vol: 0.4, dur: 0.06, atk: 0.002 });
        s._note(t + d, i ? 380 : 420, { partials: [[1, 1, 1], [2.76, 0.5, 0.5], [5.1, 0.2, 0.25]], vol: 0.07, dec: 0.5, atk: 0.001 });
      });
      for (let k = 0; k < 6; k++) link(t + 1.25 + k * 0.07, 1500 + ((k * 3) % 5) * 150, 0.1 - 0.012 * k);
      s._noise(t + 1.72, { type: 'lowpass', f: 380, vol: 0.3, dur: 0.07, atk: 0.003 });
    },
    // tea poured from the pot into a clay cup, rising in pitch as the cup fills, and the spout's tap on its rim
    tea: (s, t) => {
      s._noise(t, { f: 900, f2: 2100, q: 2.2, vol: 0.26, atk: 0.1, dur: 1.3 });
      for (let k = 0; k < 7; k++) s._note(t + 0.12 + k * 0.15, 620 * 1.09 ** k, { vol: 0.012, dec: 0.09, atk: 0.006, glide: 1.2 });
      s._note(t + 1.38, 980, { partials: [[1, 1, 1], [2.3, 0.4, 0.3]], vol: 0.03, dec: 0.1, atk: 0.001 });
    },
    // the 8mm projector running, its claw pulling the film down a frame at a time (TEK-TEK-TEK) over the motor: two
    // seconds, that lay end to end
    projector: (s, t) => {
      for (let k = 0; k < 18; k++) {
        const at = t + k / 9;
        s._noise(at, { type: 'highpass', f: k % 2 ? 2600 : 3000, vol: 0.2, dur: 0.016, atk: 0.001 });
        s._noise(at + 0.004, { f: 800, q: 3, vol: 0.22, dur: 0.035, atk: 0.002 });
        s._note(at, 96, { type: 'sawtooth', lp: 420, vol: 0.05, dec: 0.11, atk: 0.004 });
      }
    },
    // the 8mm camera: its crank wound a few clicks, the shutter's klik, and the film running through for a moment
    shutter: (s, t) => {
      for (let k = 0; k < 4; k++) {
        s._noise(t + k * 0.09, { type: 'highpass', f: 3000, vol: 0.09, dur: 0.012, atk: 0.001 });
        s._note(t + k * 0.09, 1100 + 80 * k, { vol: 0.025, dec: 0.035, atk: 0.001 });
      }
      s._noise(t + 0.5, { type: 'highpass', f: 2400, vol: 0.22, dur: 0.02, atk: 0.001 });
      s._note(t + 0.5, 1500, { vol: 0.04, dec: 0.05, atk: 0.001 });
      for (let k = 1; k < 12; k++) s._noise(t + 0.5 + k * 0.045, { f: 1400, q: 2.5, vol: 0.06, dur: 0.02, atk: 0.002 });
    },
    // thunder over the hall: a crack far off, then the roll
    thunder: (s, t) => {
      s._noise(t, { f: 900, f2: 400, q: 0.5, vol: 0.22, atk: 0.01, dur: 0.35 });
      s._noise(t + 0.05, { type: 'lowpass', f: 220, f2: 90, vol: 0.55, atk: 0.15, dur: 2.8 });
      s._noise(t + 0.9, { type: 'lowpass', f: 160, f2: 80, vol: 0.4, atk: 0.4, dur: 2.6 });
      s._note(t + 0.1, 42, { vol: 0.09, dec: 2.2, atk: 0.2 });
    },
    // a drop of water falling into a tin bucket (TING)
    drip: (s, t) => {
      s._note(t, 1300, { vol: 0.03, dec: 0.06, atk: 0.001, glide: 1.6 });
      s._note(t + 0.01, 1720, { partials: [[1, 1, 1], [2.76, 0.3, 0.4], [5.4, 0.1, 0.2]], vol: 0.035, dec: 0.7, atk: 0.001 });
    },
    // the vault's three bolts drawn back (KLUNK), its great iron door swinging open (KREEEAAAK) to a deep stop
    vault: (s, t) => {
      for (let k = 0; k < 3; k++) {
        s._noise(t + k * 0.32, { type: 'lowpass', f: 450, vol: 0.5, dur: 0.08, atk: 0.002 });
        s._note(t + k * 0.32, 150 - 12 * k, { partials: [[1, 1, 1], [2.7, 0.35, 0.4], [4.9, 0.12, 0.2]], vol: 0.08, dec: 0.35, atk: 0.002 });
      }
      creak(s, t + 1.1, 1.7, 330, 190, 0.085);
      s._noise(t + 1.1, { type: 'lowpass', f: 240, vol: 0.2, atk: 0.4, dur: 1.7 });
      s._noise(t + 2.9, { type: 'lowpass', f: 300, vol: 0.45, dur: 0.12, atk: 0.003 });
      s._note(t + 2.9, 55, { vol: 0.12, dec: 0.9, atk: 0.005 });
    },
    // a heavy page of the old ledger lifted, turned over and laid flat
    ledger: (s, t) => {
      s._noise(t, { f: 1300, f2: 2600, q: 0.8, vol: 0.18, atk: 0.08, dur: 0.24 });
      s._noise(t + 0.2, { f: 2200, f2: 900, q: 0.7, vol: 0.16, atk: 0.1, dur: 0.34 });
      s._noise(t + 0.55, { type: 'lowpass', f: 520, vol: 0.3, dur: 0.07, atk: 0.003 });
    },
    // a wax seal cracking, its crumbs falling
    seal: (s, t) => {
      s._noise(t, { type: 'highpass', f: 1800, vol: 0.22, dur: 0.02, atk: 0.001 });
      s._noise(t + 0.015, { f: 950, q: 2, vol: 0.16, dur: 0.05, atk: 0.002 });
      [0.09, 0.15, 0.24].forEach((d, i) => s._noise(t + d, { f: 3600 - 500 * i, q: 3, vol: 0.05, dur: 0.015, atk: 0.001 }));
    },
    // a folded letter opened out, crease by crease
    unfold: (s, t) => {
      for (const d of [0, 0.5]) {
        for (let k = 0; k < 6; k++) s._noise(t + d + k * 0.035, { f: 3000 + ((k * 7) % 5) * 450, q: 2, vol: 0.09, dur: 0.025, atk: 0.002 });
        s._noise(t + d + 0.05, { f: 1600, f2: 2800, q: 0.8, vol: 0.12, atk: 0.06, dur: 0.22 });
      }
    },
    // running feet up the grass, eight quick strides
    run: (s, t) => {
      for (let k = 0; k < 8; k++) {
        s._noise(t + k * 0.17, { f: 1700 * [1, 0.88, 1.1, 0.95][k % 4], q: 1.2, vol: 0.4, dur: 0.05, off: k * 0.3 });
        s._noise(t + k * 0.17, { type: 'lowpass', f: 220, vol: 0.18, dur: 0.045, atk: 0.003 });
      }
    },
    // the race's reed whistle, a short peep and a long one, its pea trilling
    start_whistle: (s, t) => {
      for (const [d, len] of [[0, 0.14], [0.3, 0.75]]) {
        for (let at = 0, k = 0; at < len; at += 0.026, k++) s._note(t + d + at, k % 2 ? 2240 : 2160, { vol: 0.04, dec: 0.035, atk: 0.003 });
        s._noise(t + d, { type: 'highpass', f: 4500, vol: 0.05, atk: 0.02, dur: len });
      }
    },
    // the valve radio between stations: static hissing and crackling, a whistle drifting through it
    radio_static: (s, t) => {
      for (let k = 0; k < 13; k++) s._noise(t + k * 0.2, { f: 2600, q: 0.4, vol: 0.1, atk: 0.2, dur: 0.45, off: k * 0.21 });
      for (let k = 0; k < 14; k++) s._noise(t + ((k * 37) % 23) * 0.11, { type: 'highpass', f: 3000, vol: 0.12, dur: 0.008, atk: 0.001 });
      s._note(t + 0.6, 1400, { vol: 0.012, dec: 1.4, atk: 0.4, glide: 0.75 });
    },
    // the radio tuned in: the static falls away to the station's warm hum, nobody speaking
    radio_hum: (s, t) => {
      s._noise(t, { f: 2600, q: 0.4, vol: 0.1, atk: 0.01, dur: 0.8 });
      s._note(t + 0.1, 110, { partials: [[1, 1, 1], [2, 0.5, 0.9], [3, 0.25, 0.7]], vol: 0.07, dec: 3.4, atk: 0.5 });
      s._note(t + 0.1, 880, { vol: 0.008, dec: 3, atk: 0.6 });
    },
    // Ratih's lullaby on her music box at 60 bpm as the crank turns it: three long notes and two short, then its rest
    musicbox: (s, t) => {
      [['G4', 1], ['E5', 1], ['D5', 1], ['C5', 0.5], ['A4', 0.5]]
        .reduce((at, [n, len]) => { s._note(t + at, hz(midi(n)), { partials: BOX, vol: 0.07, dec: len * 1.4, atk: 0.003 }); return at + len; }, 0);
      [[0, 'C4'], [2, 'G3'], [3, 'A3']].forEach(([at, n]) => s._note(t + at, hz(midi(n)), { partials: BOX, vol: 0.035, dec: 1.2, atk: 0.003 }));
    },
    // the deed torn across, thick paper giving fibre by fibre (SREEEKKK)
    tear: (s, t) => {
      s._noise(t, { f: 1700, f2: 3800, q: 1.4, vol: 0.3, atk: 0.06, dur: 0.85 });
      for (let k = 0; k < 24; k++) s._noise(t + k * 0.033, { f: 2400 + ((k * 7) % 9) * 220, q: 4, vol: 0.05 + ((k * 5) % 3) * 0.03, dur: 0.02, atk: 0.002 });
      s._noise(t + 0.82, { type: 'highpass', f: 2000, vol: 0.2, dur: 0.03, atk: 0.001 });
    },
    // the scraps let go on the sea wind, flapping as they scatter
    flutter: (s, t) => {
      s._noise(t, { f: 500, f2: 1300, q: 0.6, vol: 0.16, atk: 0.5, dur: 2.2 });
      for (let k = 0; k < 16; k++) s._noise(t + 0.1 + k * 0.12 + ((k * 3) % 4) * 0.02, { f: 1600 + ((k * 5) % 6) * 200, q: 1.2, vol: 0.1 * (1 - k / 18), dur: 0.05, atk: 0.004 });
    },
    // the old engine moving under its own steam: the hiss as the brake lets go, chuffs coming quicker, wheels on the joints
    train: (s, t) => {
      s._noise(t, { type: 'highpass', f: 2400, vol: 0.14, atk: 0.05, dur: 0.8 });
      for (let at = 0.7, k = 0; at < 4.8; at += 0.95 - 0.1 * k, k = Math.min(k + 1, 5)) {
        s._noise(t + at, { f: 650, f2: 300, q: 0.7, vol: 0.36, atk: 0.01, dur: 0.28 });
        s._noise(t + at, { type: 'lowpass', f: 160, vol: 0.3, dur: 0.07, atk: 0.003 });
      }
      for (const at of [1.9, 3.2, 4.3]) for (const d of [0, 0.13]) {
        s._noise(t + at + d, { f: 1500, q: 2, vol: 0.12, dur: 0.03, atk: 0.001 });
        s._note(t + at + d, 160, { type: 'triangle', vol: 0.05, dec: 0.08, atk: 0.002 });
      }
    },
    // the village cheering: bug voices chirping up all round, and antennae tapping like applause
    cheer: (s, t) => {
      let a = 89;
      const r = () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let k = 0; k < 70; k++) {
        const at = r() * 2.2, f = 300 + r() * 420;
        s._note(t + at, f * (1 + at * 0.1), { type: 'triangle', lp: 1600, vol: 0.035 * Math.max(0.2, Math.min(1, at / 0.4, (2.2 - at) / 0.6)), dec: 0.07, atk: 0.006, glide: 1.15 });
      }
      for (let k = 0; k < 60; k++) s._noise(t + 0.3 + r() * 1.8, { f: 2600 + r() * 1400, q: 3, vol: 0.08, dur: 0.012, atk: 0.001 });
    },
    // a post-office stamp pressed to its ink pad, then brought down on the page (THUNK)
    stamp: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 700, vol: 0.12, dur: 0.05, atk: 0.004 });
      s._noise(t + 0.3, { type: 'lowpass', f: 360, vol: 0.55, dur: 0.08, atk: 0.002 });
      s._noise(t + 0.3, { f: 1100, q: 3, vol: 0.12, dur: 0.03, atk: 0.001 });
      s._note(t + 0.3, 120, { type: 'triangle', vol: 0.1, dec: 0.12, atk: 0.002 });
    },
    // Minigame 7: the music box's crank wound a quarter turn (its pawl ticking over the ratchet), and each turn's notes
    // of the melody, one a quarter turn: the musicbox tune's three long notes, then its two short ones, with its roots
    crank: (s, t) => {
      for (let k = 0; k < 3; k++) { s._noise(t + k * 0.06, { type: 'highpass', f: 3400, vol: 0.1, dur: 0.012, atk: 0.001 }); s._note(t + k * 0.06, 1400 + 120 * k, { vol: 0.02, dec: 0.03, atk: 0.001 }); }
      s._noise(t, { f: 700, q: 3, vol: 0.08, atk: 0.04, dur: 0.16 });
    },
    mbox_1: (s, t) => { s._note(t, hz(midi('G4')), { partials: BOX, vol: 0.07, dec: 1.4, atk: 0.003 }); s._note(t, hz(midi('C4')), { partials: BOX, vol: 0.035, dec: 1.2, atk: 0.003 }); },
    mbox_2: (s, t) => s._note(t, hz(midi('E5')), { partials: BOX, vol: 0.07, dec: 1.4, atk: 0.003 }),
    mbox_3: (s, t) => { s._note(t, hz(midi('D5')), { partials: BOX, vol: 0.07, dec: 1.4, atk: 0.003 }); s._note(t, hz(midi('G3')), { partials: BOX, vol: 0.035, dec: 1.2, atk: 0.003 }); },
    mbox_4: (s, t) => {
      s._note(t, hz(midi('C5')), { partials: BOX, vol: 0.07, dec: 0.7, atk: 0.003 });
      s._note(t + 0.5, hz(midi('A4')), { partials: BOX, vol: 0.07, dec: 0.7, atk: 0.003 });
      s._note(t + 0.5, hz(midi('A3')), { partials: BOX, vol: 0.035, dec: 1.2, atk: 0.003 });
    },
    // the crank wound too fast: the spring slips its catch and twangs loose (KLANGG), the train rattling free
    klangg: (s, t) => {
      s._noise(t, { type: 'highpass', f: 2200, vol: 0.26, dur: 0.03, atk: 0.001 });
      s._note(t, 330, { partials: [[1, 1, 1], [2.76, 0.5, 0.6], [5.4, 0.3, 0.3]], vol: 0.12, dec: 1.2, atk: 0.002, glide: 0.6 });
      for (let k = 1; k < 10; k++) s._noise(t + k * 0.04 * (1 + k * 0.08), { type: 'highpass', f: 3000, vol: 0.12 / k ** 0.5, dur: 0.012, atk: 0.001 });
    },
    // the music box left unwound running down mid-song: its last notes slowing and sagging flat, then the cylinder stops
    stall: (s, t) => {
      [['C5', 0], ['B4', 0.4], ['A4', 0.95]].forEach(([n, at], i) => s._note(t + at, hz(midi(n)), { partials: BOX, vol: 0.06 - 0.012 * i, dec: 0.9, atk: 0.003, glide: 0.94 - 0.03 * i }));
      s._noise(t + 1.5, { type: 'lowpass', f: 500, vol: 0.12, dur: 0.04, atk: 0.002 });
    },
    // the melody's last note shaking the hidden catch free (KLIK), the spring drawer sliding out of the apron
    drawer: (s, t) => {
      s._noise(t, { type: 'highpass', f: 2800, vol: 0.2, dur: 0.018, atk: 0.001 });
      s._note(t, 2100, { vol: 0.04, dec: 0.06, atk: 0.001 });
      s._note(t + 0.04, 190, { vol: 0.04, dec: 0.3, atk: 0.005, glide: 1.2 });
      s._noise(t + 0.08, { type: 'lowpass', f: 420, f2: 760, vol: 0.32, atk: 0.08, dur: 0.75 });
      s._noise(t + 0.86, { type: 'lowpass', f: 300, vol: 0.2, dur: 0.05, atk: 0.003 });
    },
    // Minigame 8: one pull at the deed, the tear running on a little (srek), and the deed crumpled in one hand
    rip: (s, t) => {
      s._noise(t, { f: 1800, f2: 3400, q: 1.3, vol: 0.24, atk: 0.01, dur: 0.16 });
      for (let k = 0; k < 6; k++) s._noise(t + k * 0.025, { f: 2600 + ((k * 7) % 5) * 260, q: 4, vol: 0.06, dur: 0.015, atk: 0.001 });
    },
    crumple: (s, t) => [0, 0.05, 0.12, 0.2, 0.27, 0.36].forEach((d, k) => s._noise(t + d, { f: 2000 + ((k * 3) % 4) * 400, q: 0.9, vol: 0.2 - 0.02 * k, atk: 0.005, dur: 0.06 })),
  };

  /* Voice blips (the bible's 3.1B): one short syllable per letter as a line types out, Animal Crossing style. Each is
     exported as voice_<id>; the game varies its pitch letter by letter. Anyone not listed speaks as `villager`. */
  const VOICES = {
    courier: (s, t) => s._note(t, 320, { type: 'triangle', vol: 0.07, dec: 0.06, atk: 0.004 }),
    // low and slow, ringing on like an old bell in the root cave
    marlow: (s, t) => {
      s._note(t, 110, { partials: [[1, 1, 1], [2, 0.3, 0.4]], vol: 0.11, dec: 0.12, atk: 0.008 });
      s._note(t + 0.02, 110, { partials: [[1, 1, 1], [3.01, 0.15, 0.5]], vol: 0.025, dec: 0.5, atk: 0.04 });
    },
    // a soft bell-flute; the near-octave partial gives it a slow shimmer
    helen: (s, t) => s._note(t, 440, { partials: [[1, 1, 1], [2.006, 0.18, 0.6]], vol: 0.06, dec: 0.08, atk: 0.008 }),
    pip: (s, t) => s._note(t, 680, { type: 'square', lp: 2600, vol: 0.035, dec: 0.035, atk: 0.002 }),
    nora: (s, t) => s._note(t, 260, { type: 'triangle', lp: 1100, vol: 0.08, dec: 0.1, atk: 0.012 }),
    // a shutter's click with the tone under it
    theo: (s, t) => {
      s._noise(t, { type: 'highpass', f: 3200, vol: 0.12, dur: 0.012, atk: 0.001 });
      s._note(t, 290, { vol: 0.05, dec: 0.045, atk: 0.002 });
    },
    // a typewriter key: a dry strike and a short pulse
    sam: (s, t) => {
      s._noise(t, { f: 2600, q: 2, vol: 0.14, dur: 0.018, atk: 0.001 });
      s._note(t, 360, { type: 'square', lp: 1400, vol: 0.025, dec: 0.03, atk: 0.001 });
    },
    leo: (s, t) => s._note(t, 220, { type: 'sawtooth', lp: 1500, vol: 0.04, dec: 0.045, atk: 0.002 }),
    // a hammer on an anvil, far down: a thud with a dull ring
    mender: (s, t) => {
      s._noise(t, { type: 'lowpass', f: 260, vol: 0.35, dur: 0.05, atk: 0.002 });
      s._note(t, 95, { partials: [[1, 1, 1], [3.7, 0.12, 0.4]], vol: 0.1, dec: 0.12, atk: 0.003 });
    },
    baker: (s, t) => s._note(t, 520, { vol: 0.06, dec: 0.06, atk: 0.004, glide: 1.12 }),
    // a mellow tone with breath through it, like wind in leaves
    gardener: (s, t) => {
      s._note(t, 380, { partials: [[1, 1, 1], [2, 0.08, 0.5]], vol: 0.05, dec: 0.08, atk: 0.012 });
      s._noise(t, { f: 1800, q: 0.8, vol: 0.05, dur: 0.07, atk: 0.01 });
    },
    // rough and low: a buzzing pulse, salted with grit
    arlo: (s, t) => {
      s._note(t, 150, { type: 'square', lp: 650, vol: 0.06, dec: 0.08, atk: 0.004 });
      s._noise(t, { type: 'lowpass', f: 900, vol: 0.06, dur: 0.06, atk: 0.004 });
    },
    // a hollow whistle with a faint hiss of steam
    bram: (s, t) => {
      s._note(t, 190, { partials: [[1, 1, 1], [3, 0.1, 0.5]], vol: 0.08, dec: 0.12, atk: 0.015 });
      s._noise(t, { type: 'highpass', f: 4200, vol: 0.05, dur: 0.1, atk: 0.02 });
    },
    mia: (s, t) => s._note(t, 490, { partials: WARM, vol: 0.055, dec: 0.07, atk: 0.005 }),
    // smooth and a touch synthetic: a clean tone sliding up, as if smiling
    valdo: (s, t) => s._note(t, 340, { partials: [[1, 1, 1], [3, 0.06, 0.5]], vol: 0.06, dec: 0.05, atk: 0.004, glide: 1.04 }),
    // the marble trio: a quick chirp of a bell
    kid: (s, t) => s._note(t, 720, { partials: BELL, vol: 0.04, dec: 0.04, atk: 0.002 }),
    villager: (s, t) => s._note(t, 300, { type: 'triangle', lp: 1500, vol: 0.07, dec: 0.06, atk: 0.004 }),
  };
  for (const [id, blip] of Object.entries(VOICES)) FX['voice_' + id] = blip;

  /* Each phase's ambience under the music (GDD 9): a loop of AMB seconds, its events placed by a seeded hash so every
     export is the same. Bugs only, as on the ant planet: the GDD's morning sparrows are tree crickets and bees here. */
  const AMB = 16;
  const AMBIENCE = {
    // dew and bugs waking: tree crickets trilling now and then, a bee droning past, drops falling off the leaves
    morning: (s, r) => {
      for (let k = 0; k < 9; k++) {
        const t = r() * AMB, f = 3400 + r() * 900;
        for (let p = 0; p < 7; p++) s._note(t + p * 0.032, f, { vol: 0.012, dec: 0.022, atk: 0.003 });
      }
      for (let k = 0; k < 2; k++) {
        const t = 1 + k * 8 + r() * 4;
        s._note(t, 205 + r() * 30, { type: 'sawtooth', lp: 700, vol: 0.016, atk: 1.2, dec: 1.6, glide: 1.03 });
      }
      for (let k = 0; k < 6; k++) s._note(r() * AMB, 1500 + r() * 700, { vol: 0.02, dec: 0.12, atk: 0.002, glide: 0.7 });
    },
    // the market: voices murmuring too far off to make out, a cart's wheels knocking, a basket set down
    midday: (s, r) => {
      for (let t = 0; t < AMB; t += 0.07 + r() * 0.16) {
        const f = 420 + r() * 700;
        s._noise(t, { f, f2: f * (0.8 + r() * 0.4), q: 5, vol: 0.05 + r() * 0.05, atk: 0.02, dur: 0.08 + r() * 0.12 });
      }
      for (let k = 0; k < 3; k++) {
        const t = r() * (AMB - 2);
        for (let p = 0; p < 5; p++) s._noise(t + p * 0.21, { type: 'lowpass', f: 300, vol: 0.12, dur: 0.05, atk: 0.003 });
      }
      for (let k = 0; k < 4; k++) s._noise(r() * AMB, { f: 900, q: 1.5, vol: 0.06, dur: 0.06, atk: 0.003 });
    },
    // waves breaking on the far shore: a slow swell and its hiss drawing back, four to the loop
    dusk: (s, r) => {
      for (let k = 0; k < 4; k++) {
        const t = k * 4 + r() * 0.6;
        s._noise(t, { type: 'lowpass', f: 300, f2: 900, vol: 0.14, atk: 1.4, dur: 2.6 });
        s._noise(t + 1.5, { f: 2400, f2: 1200, q: 0.6, vol: 0.05, atk: 0.4, dur: 2.2 });
      }
    },
    // crickets all round in the dark, three near and a chorus farther off, and now and then dew dripping
    night: (s, r) => {
      for (const [f, v, gap] of [[4300, 0.02, 0.62], [4700, 0.012, 0.81], [3900, 0.009, 0.53]])
        for (let t = r() * gap; t < AMB; t += gap * (0.9 + r() * 0.2))
          for (let p = 0; p < 3; p++) s._note(t + p * 0.045, f, { vol: v, dec: 0.03, atk: 0.004 });
      for (let t = 0; t < AMB; t += 0.05) s._note(t, 5200 + r() * 400, { vol: 0.0025, dec: 0.03, atk: 0.01 });
      for (let k = 0; k < 4; k++) s._note(r() * AMB, 1700 + r() * 500, { vol: 0.015, dec: 0.1, atk: 0.002, glide: 0.7 });
    },
    // Two beds the chapters lay down in place of the phase's. The coast: swells breaking on the rock below, the sea wind
    // gusting, a moored boat knocking and a buoy's bell far out.
    coast: (s, r) => {
      for (let k = 0; k < 5; k++) {
        const t = k * 3.2 + r() * 0.8;
        s._noise(t, { type: 'lowpass', f: 200, f2: 480, vol: 0.12, atk: 0.8, dur: 1.1 });
        s._noise(t + 0.9, { type: 'lowpass', f: 480, f2: 220, vol: 0.3, dur: 0.8, atk: 0.03 });
        s._noise(t + 0.95, { f: 3000, f2: 1500, q: 0.6, vol: 0.1, atk: 0.08, dur: 1.4 });
        s._noise(t + 2, { f: 1800, f2: 3200, q: 0.8, vol: 0.04, atk: 0.5, dur: 1.4 });
      }
      for (let t = 0; t < AMB; t += 1.6 + r()) s._noise(t, { f: 520 + r() * 300, f2: 700 + r() * 300, q: 0.5, vol: 0.05, atk: 1.2, dur: 2.8, off: r() * 0.2 });
      for (let k = 0; k < 3; k++) s._noise(r() * AMB, { f: 380, q: 3, vol: 0.12, dur: 0.06, atk: 0.004 });
      for (let k = 0; k < 2; k++) s._note(2 + k * 8 + r() * 3, 620, { partials: BELL, vol: 0.012, dec: 2.4, atk: 0.004 });
    },
    // rain on the clay tiles: a soft roar of drops and the patter of the near ones, water running off the eaves
    rain: (s, r) => {
      for (let t = 0; t < AMB; t += 0.7) s._noise(t, { f: 1500, f2: 1900, q: 0.4, vol: 0.04, atk: 1.2, dur: 2.9, off: r() * 0.1 });
      for (let t = 0; t < AMB; t += 0.015 + r() * 0.04) s._noise(t, { f: 2200 + r() * 3600, q: 3, vol: 0.02 + r() * 0.04, dur: 0.012, atk: 0.001, off: r() * 2.9 });
      for (let k = 0; k < 10; k++) s._note(r() * AMB, 900 + r() * 600, { vol: 0.012, dec: 0.08, atk: 0.003, glide: 0.75 });
    },
  };

  // A hinge or a bed's creak: the wood or iron sticks and slips, pulse after pulse every gap seconds for dur, its pitch
  // sliding from f0 to f1.
  function creak(s, t, dur, f0, f1, gap) {
    for (let at = 0, k = 0; at < dur; at += gap * (0.8 + 0.4 * ((k * 7) % 5) / 4), k++) {
      const f = f0 + (f1 - f0) * at / dur;
      s._noise(t + at, { f, q: 9, vol: 0.32, dur: 0.05, atk: 0.004 });
      s._note(t + at, f / 2, { type: 'triangle', vol: 0.025, dec: 0.05, atk: 0.003 });
    }
  }

  // An engine's putter: a low thud of noise and a growl every period(u) seconds for dur, its loudness level(u), u 0 to 1.
  function engine(s, t, dur, period, level) {
    for (let at = 0; at < dur; at += period(at / dur)) {
      const v = level(at / dur);
      s._noise(t + at, { type: 'lowpass', f: 180, vol: 0.5 * v, dur: 0.06, atk: 0.004 });
      s._note(t + at, 62, { type: 'triangle', vol: 0.05 * v, dec: 0.07, atk: 0.003 });
    }
  }

  class Sound {
    constructor() {
      this.ctx = null; this._on = false; this._paused = false;
      this._scene = 'dusk'; this._cur = SCENES.dusk;
      this._step = 0; this._next = 0; this._timer = 0; this._voices = 0; this._n = 0; this._wind = null;
    }
    static caption(name) { return CAPTIONS[name] || ''; }
    static get voices() { return Object.keys(VOICES); }
    static get ambiences() { return Object.keys(AMBIENCE); }
    static get ambienceLength() { return AMB; }
    // A mood's eighth (s) and its loop in eighths: 16 bars of its own bar.
    static meter(mood) { const sc = SCENES[mood]; return { step: 60 / (sc.bpm || BPM) / 2, steps: BARS * (sc.beats || 6) }; }
    // Queues one loop of a phase's ambience from t, its events placed by a hash seeded with `seed`.
    _ambience(name, t, seed) {
      let a = seed;
      const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
      AMBIENCE[name]({ _note: (at, f, o) => this._note(t + at, f, o), _noise: (at, o) => this._noise(t + at, o) }, r);
    }
    get on() { return this._on; }

    _init() {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = (v) => { const g = c.createGain(); g.gain.value = v; return g; };
      this.master = gain(LEVEL); this.master.connect(c.destination);
      this.fx = gain(1); this.fx.connect(this.master);
      this.mus = gain(0); this.mus.connect(this.master);
      this.pno = c.createBiquadFilter(); this.pno.connect(this.mus);       // piano "pad colour"
      // Soft dotted-eighth echo on the music bus, darkened in the feedback loop.
      const dly = this.dly = c.createDelay(1), fb = gain(0.3), tone = c.createBiquadFilter();
      this.wet = gain(0); dly.delayTime.value = STEP * 1.5; tone.frequency.value = 2200;
      this.mus.connect(this.wet).connect(dly).connect(tone).connect(fb).connect(dly);
      tone.connect(this.master);
      const len = c.sampleRate * 3, d = (this.noise = c.createBuffer(1, len, c.sampleRate)).getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._apply(0.01);
      document.addEventListener('visibilitychange', () =>
        this.master.gain.setTargetAtTime(document.hidden ? 0 : LEVEL, c.currentTime, 0.2));
    }

    async enable() {
      if (!this.ctx) this._init();
      this._on = true;
      await this.ctx.resume();                         // unlock inside the gesture
      if (this._paused) await this.ctx.suspend();      // presentation paused: stay frozen until resume()
      if (this._on) this.music(true);
      return this._on;
    }
    disable() {
      this._on = false;
      if (!this.ctx) return;
      this.music(false);
      this.ctx.suspend();
    }
    pause() { this._paused = true; if (this.ctx) this.ctx.suspend(); }
    resume() { this._paused = false; if (this._on) this.ctx.resume(); }

    sfx(name, opts = {}) {
      if (!this._on || this._paused || !this.ctx || this.ctx.state !== 'running' || !FX[name]) return;
      FX[name](this, this.ctx.currentTime + 0.01, opts);
    }

    music(on) {
      if (!this.ctx || !!on === !!this._timer) return;
      const t = this.ctx.currentTime;
      this.mus.gain.cancelScheduledValues(t);
      this.mus.gain.setTargetAtTime(on ? 1 : 0, t, 0.4);
      clearInterval(this._timer); this._timer = 0;
      if (on) { this._next = Math.max(this._next, t + 0.05); this._timer = setInterval(() => this._tick(), 100); }
      this._windBed(on);
    }

    setScene(mood) {
      if (!SCENES[mood]) return;
      this._scene = mood;                              // melody/density latch at the next bar
      if (this.ctx) this._apply(1.5);
    }
    _apply(tc) {
      const sc = SCENES[this._scene], t = this.ctx.currentTime;
      this.pno.frequency.setTargetAtTime(sc.lp, t, tc);
      this.wet.gain.setTargetAtTime(sc.wet, t, tc);
      this.dly.delayTime.setTargetAtTime(Sound.meter(this._scene).step * 1.5, t, tc);
    }

    // Look-ahead scheduler: only ever ~0.3s ahead of ctx time, so suspend() truly freezes it.
    _tick() {
      if (this.ctx.state !== 'running' || document.hidden) return;
      const now = this.ctx.currentTime, { step } = Sound.meter(this._scene);
      if (this._next < now) {                          // fell behind (hidden tab / throttling): skip, don't burst
        const n = Math.ceil((now - this._next) / step);
        this._step += n; this._next += n * step;
      }
      while (this._next < now + AHEAD) { this._play(this._step++, this._next); this._next += step; }
    }
    // One eighth of the music: i counts eighths in the mood's bar (a mood switched to mid-bar starts at the next bar).
    _play(i, t) {
      const beats = SCENES[this._scene].beats || 6, s = i % beats, bar = Math.floor(i / beats) % BARS;
      if (s === 0) this._cur = SCENES[this._scene];
      const sc = this._cur, name = (sc.prog || PROG)[bar];
      const [bass, ...ch] = CHORDS[(sc.major && MAJOR[name]) || name];
      const key = (m, vol, dt = 0) => this._note(t + dt, hz(m), { type: 'triangle', partials: PIANO, vol, atk: 0.012, dec: 2.6, bus: this.pno });
      // a mood's own accompaniment, else the dusk theme's waltz of piano chords, thicker with dens
      if (sc.comp) sc.comp({ s, bar, bass, ch, key, step: Sound.meter(this._scene).step, note: (m, o, dt = 0) => this._note(t + dt, hz(m), { ...o, bus: this.pno }), hit: o => this._noise(t, { ...o, bus: this.mus }) });
      else {
        if (s === 0) { key(bass, 0.06); if (!sc.dens) ch.forEach((m, k) => key(m, 0.03, 0.05 * (k + 1))); }
        if (s === 2 && sc.dens) ch.forEach((m, k) => key(m, 0.03, 0.015 * k));
        if (s === 4 && sc.dens > 1) ch.slice(1).forEach((m, k) => key(m, 0.022, 0.015 * k));
      }
      if (s === 0 && sc.bow) this._note(t, hz(bass), { ...CELLO, bus: this.pno });
      if (s && sc.arp) this._note(t, hz(ch[[0, 0, 1, 2, 1, 2][s]]), { ...GUITAR, bus: this.pno });
      const m = (sc.mel || MEL)[bar * beats + s];
      if (m && (!sc.thin || bar % 8 < 2)) this._note(t, hz(m + sc.oct), sc.lead ? { ...sc.lead, bus: this.mus } : { partials: BOX, vol: sc.oct ? 0.05 : 0.07, dec: 2.4, atk: 0.003, bus: this.mus });
    }

    // One pitched voice made of decaying partials; nodes are disconnected when it ends.
    _note(t, f, { type = 'sine', partials = [[1, 1, 1]], vol = 0.05, atk = 0.005, dec = 1, lp = 0, glide = 0, bus = this.fx } = {}) {
      if (this._voices >= (bus === this.fx ? FX_CAP : MUSIC_CAP)) return;
      const c = this.ctx, nodes = [];
      let out = bus, last, lastEnd = 0;
      if (lp) { out = c.createBiquadFilter(); out.frequency.value = lp; out.connect(bus); nodes.push(out); }
      for (const [r, a, d] of partials) {
        const o = c.createOscillator(), g = c.createGain(), end = t + atk + dec * d;
        o.type = type; o.frequency.setValueAtTime(f * r, t);
        if (glide) o.frequency.exponentialRampToValueAtTime(f * r * glide, t + 0.08);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * a, t + atk);
        g.gain.exponentialRampToValueAtTime(1e-4, end);
        o.connect(g).connect(out); o.start(t); o.stop(end + 0.02);
        nodes.push(o, g);
        if (end > lastEnd) { lastEnd = end; last = o; }
      }
      this._track(last, nodes);
    }
    _noise(t, { f = 1000, f2 = f, q = 1, type = 'bandpass', vol = 0.3, atk = 0.004, dur = 0.08, off = 0, bus = this.fx }) {
      if (this._voices >= FX_CAP) return;
      const c = this.ctx, src = c.createBufferSource(), bq = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noise; bq.type = type; bq.Q.value = q;
      bq.frequency.setValueAtTime(f, t); bq.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.value = 0;   // silent from the first frame: a start landing exactly on a frame could pass one sample at gain 1
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + atk);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      src.connect(bq).connect(g).connect(bus); src.start(t, off); src.stop(t + dur + 0.02);
      this._track(src, [src, bq, g]);
    }
    _track(src, nodes) {
      this._voices++;
      src.onended = () => { nodes.forEach((n) => n.disconnect()); this._voices--; };
    }

    // Evening wind: looped noise -> lowpass, with two slow LFOs drifting gain and cutoff.
    _windBed(on) {
      const c = this.ctx, t = c.currentTime;
      if (on && !this._wind) {
        const src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
        const l1 = c.createOscillator(), d1 = c.createGain(), l2 = c.createOscillator(), d2 = c.createGain();
        src.buffer = this.noise; src.loop = true;
        lp.frequency.value = 420; lp.Q.value = 0.7;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 4);
        l1.frequency.value = 0.07; d1.gain.value = 0.03; l1.connect(d1).connect(g.gain);
        l2.frequency.value = 0.043; d2.gain.value = 180; l2.connect(d2).connect(lp.frequency);
        src.connect(lp).connect(g).connect(this.master);
        [src, l1, l2].forEach((n) => n.start(t));
        this._wind = { g, srcs: [src, l1, l2], nodes: [src, lp, g, l1, d1, l2, d2] };
      } else if (!on && this._wind) {
        const { g, srcs, nodes } = this._wind; this._wind = null;
        g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.3);
        srcs[0].onended = () => nodes.forEach((n) => n.disconnect());
        srcs.forEach((n) => n.stop(t + 1.5));
      }
    }
  }

  window.Sound = Sound;
})();
