/* The Shop That Opens Once — synthesized ambience + small sounds (Web Audio, decorative only). */
(() => {
  const LEVEL = 0.5;                 // master gain; voices are already subtle
  const STEP = 60 / 69 / 2;          // eighth note at 69 bpm, 6 per 3/4 bar
  const AHEAD = 0.3, BARS = 16;      // look-ahead window (s), loop length
  const MUSIC_CAP = 20, FX_CAP = 28; // max simultaneous voices
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const midi = (n) => n === '.' ? 0 : (+n.slice(-1) + 1) * 12 + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[n[0]];

  // Timbres: [ratio, amp, decay scale]
  const BOX = [[1, 1, 1], [2, 0.16, 0.5], [5.43, 0.06, 0.12]];   // music box: bright inharmonic ping
  const PIANO = [[1, 1, 1], [2.003, 0.18, 0.4]];
  const WARM = [[1, 1, 1], [2, 0.1, 0.5], [3, 0.04, 0.3]];
  const BELL = [[1, 1, 1], [2.41, 0.6, 0.75]];

  // 16 bars of A minor; chords as [bass, ...voicing]. 'resolved' swaps Am->C, Em->G.
  const PROG = 'Am Am F C Dm Am Em Em Am Am F G C F Em Am'.split(' ');
  const CHORDS = { Am: [45, 57, 60, 64], F: [41, 57, 60, 65], C: [48, 55, 60, 64], Dm: [38, 57, 62, 65], Em: [40, 55, 59, 64], G: [43, 55, 59, 62] };
  const MAJOR = { Am: 'C', Em: 'G' };
  // Melody in eighths; opens with the 1-8-1-7 motif (A4 A5 A4 G5).
  const MEL = `A4 . A5 . A4 . | G5 . . . . . | . . F5 . E5 . | E5 . D5 . C5 . |
               D5 . . . F5 . | E5 . . . C5 . | B4 . . . . . | . . . . . . |
               A4 . A5 . A4 . | G5 . . . E5 . | F5 . E5 . C5 . | D5 . . . B4 . |
               E5 . . . . . | . . A4 . C5 . | B4 . . . G4 . | A4 . . . . .`
    .replace(/\|/g, ' ').trim().split(/\s+/).map(midi);

  const SCENES = {
    dusk:     { lp: 1500, wet: 0.22, dens: 1, oct: 0 },
    shop:     { lp: 2000, wet: 0.16, dens: 2, oct: 0 },
    memory:   { lp: 1000, wet: 0.4,  dens: 0, oct: 12 },
    plan:     { lp: 1300, wet: 0.18, dens: 1, oct: 0, thin: true },  // melody only on motif bars
    resolved: { lp: 2400, wet: 0.25, dens: 2, oct: 0, major: true },
  };

  const CAPTIONS = {
    bell: 'Shop bell', step: 'Footsteps', tick: 'Clock ticking', chime: 'Soft chime',
    motif: 'Music box: 18:17 motif', page: 'Paper rustle', pop: 'Soft blip',
    wrong: 'Gentle "hmm"', right: 'Rising notes', whoosh: 'Soft whoosh', latch: 'Box latch', bus_far: 'A bus far off, driving away', bus_stop: 'A bus pulling up and opening its door', drop: 'A basket dropped on the ground', gate: 'A rusty gate creaking open', door: 'A key turning, a heavy door creaking open', bed: 'An old bed creaking', blow: 'A lamp blown out', crickets: 'Crickets', music: 'Quiet piano and music box',
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
    motif: (s, t) => [69, 81, 69, 79].forEach((m, i) => s._note(t + i * STEP, hz(m), { partials: BOX, vol: 0.075, dec: i === 3 ? 3 : 2, atk: 0.003 })),
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
    // crickets outside in the dark: two of them, a few chirps each, one a little farther off
    crickets: (s, t) => {
      for (let k = 0; k < 6; k++) for (const [at, f, v] of [[0, 4300, 0.03], [0.37, 4700, 0.018]])
        for (let p = 0; p < 3; p++) s._note(t + at + k * 0.62 + p * 0.045, f, { vol: v, dec: 0.03, atk: 0.004 });
    },
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
    get on() { return this._on; }

    _init() {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = (v) => { const g = c.createGain(); g.gain.value = v; return g; };
      this.master = gain(LEVEL); this.master.connect(c.destination);
      this.fx = gain(1); this.fx.connect(this.master);
      this.mus = gain(0); this.mus.connect(this.master);
      this.pno = c.createBiquadFilter(); this.pno.connect(this.mus);       // piano "pad colour"
      // Soft dotted-eighth echo on the music bus, darkened in the feedback loop.
      const dly = c.createDelay(1), fb = gain(0.3), tone = c.createBiquadFilter();
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
    }

    // Look-ahead scheduler: only ever ~0.3s ahead of ctx time, so suspend() truly freezes it.
    _tick() {
      if (this.ctx.state !== 'running' || document.hidden) return;
      const now = this.ctx.currentTime;
      if (this._next < now) {                          // fell behind (hidden tab / throttling): skip, don't burst
        const n = Math.ceil((now - this._next) / STEP);
        this._step += n; this._next += n * STEP;
      }
      while (this._next < now + AHEAD) { this._play(this._step++, this._next); this._next += STEP; }
    }
    _play(i, t) {
      const s = i % 6, bar = Math.floor(i / 6) % BARS;
      if (s === 0) this._cur = SCENES[this._scene];
      const sc = this._cur, name = PROG[bar];
      const [bass, ...ch] = CHORDS[(sc.major && MAJOR[name]) || name];
      const key = (m, vol, dt = 0) => this._note(t + dt, hz(m), { type: 'triangle', partials: PIANO, vol, atk: 0.012, dec: 2.6, bus: this.pno });
      if (s === 0) { key(bass, 0.06); if (!sc.dens) ch.forEach((m, k) => key(m, 0.03, 0.05 * (k + 1))); }
      if (s === 2 && sc.dens) ch.forEach((m, k) => key(m, 0.03, 0.015 * k));
      if (s === 4 && sc.dens > 1) ch.slice(1).forEach((m, k) => key(m, 0.022, 0.015 * k));
      const m = MEL[bar * 6 + s];
      if (m && (!sc.thin || bar % 8 < 2)) this._note(t, hz(m + sc.oct), { partials: BOX, vol: sc.oct ? 0.05 : 0.07, dec: 2.4, atk: 0.003, bus: this.mus });
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
    _noise(t, { f = 1000, f2 = f, q = 1, type = 'bandpass', vol = 0.3, atk = 0.004, dur = 0.08, off = 0 }) {
      if (this._voices >= FX_CAP) return;
      const c = this.ctx, src = c.createBufferSource(), bq = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noise; bq.type = type; bq.Q.value = q;
      bq.frequency.setValueAtTime(f, t); bq.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + atk);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      src.connect(bq).connect(g).connect(this.fx); src.start(t, off); src.stop(t + dur + 0.02);
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
