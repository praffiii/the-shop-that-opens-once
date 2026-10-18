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
    wrong: 'Gentle "hmm"', right: 'Rising notes', whoosh: 'Soft whoosh', music: 'Quiet piano and music box',
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
  };

  class Sound {
    constructor() {
      this.ctx = null; this._on = false; this._paused = false;
      this._scene = 'dusk'; this._cur = SCENES.dusk;
      this._step = 0; this._next = 0; this._timer = 0; this._voices = 0; this._n = 0; this._wind = null;
    }
    static caption(name) { return CAPTIONS[name] || ''; }
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
