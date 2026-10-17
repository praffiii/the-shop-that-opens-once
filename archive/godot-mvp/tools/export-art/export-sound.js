'use strict';
/* Sound part: the presentation's music, evening wind and small sounds (presentation/audio.js) -> sound/ under game/art.
   Sound does all the synthesis: each render hands it an OfflineAudioContext in place of its AudioContext, with a clock
   (currentTime) we set by hand, and plays through its own _play, _windBed and sfx. The synthesis is mono; every file
   keeps the presentation's levels (through its master gain) and goes out as a float WAV, which export.py encodes. */
(() => {
  const RATE = 44100;
  const STEP = 60 / 69 / 2, STEPS = 16 * 6;   // as in audio.js: an eighth at 69 bpm, and the music loops every 16 bars of 3/4
  const SETTLE = 0.25;                        // Sound eases into its mood's filter and echo over 10 ms; start once they're set
  const WIND = 2 / 0.07, FADE = 4;            // the wind loop: two periods of its 0.07 Hz swell, so its loudness lines up
  const MOODS = ['dusk', 'shop', 'memory', 'resolved'];
  const EFFECTS = ['bell', 'tick', 'chime', 'motif', 'page', 'pop', 'wrong', 'right', 'whoosh'];

  // Math.random with a fixed seed (mulberry32), so Sound's noise, and so every export, comes out the same.
  const seeded = a => () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* Render `secs` seconds of a fresh Sound in `mood`. play(s, clock) queues what to hear; Sound reads clock.t as the time
     now. Returns the samples. */
  async function render(secs, play, mood = 'dusk') {
    const ctx = new OfflineAudioContext(1, Math.ceil(secs * RATE), RATE), clock = { t: 0 };
    // Sound plays only while its context runs, and takes the time from it: here both come from us.
    Object.defineProperties(ctx, { state: { value: 'running' }, currentTime: { get: () => clock.t } });
    const { AudioContext } = window, { random } = Math;
    window.AudioContext = function () { return ctx; };   // Sound's _init builds its graph in ctx...
    Math.random = seeded(1817);                          // ...and fills its noise buffer
    const s = new Sound(); s._scene = mood; s._init();
    window.AudioContext = AudioContext; Math.random = random;
    s._on = true;          // sfx() plays only while the sound is on
    s._track = () => {};   // no voice cap: it counts each voice until it ends, and here every voice is queued up front
    play(s, clock);
    return (await ctx.startRendering()).getChannelData(0);
  }

  // One loop of a mood, seamless: its eighths play once from the first bar, and what still rings past the loop's end
  // (note decays, the echo) is folded back onto its start, as it sounds once the music has been playing a while.
  async function music(mood) {
    const at = Math.round(SETTLE * RATE), n = Math.round(STEPS * STEP * RATE);
    const d = await render((at + 2 * n) / RATE, s => {
      s.mus.gain.value = 1;   // the music already up, not fading in
      for (let i = 0; i < STEPS; i++) s._play(i, at / RATE + i * STEP);
    }, mood);
    const loop = d.slice(at, at + n);
    for (let i = 0; i < n; i++) loop[i] += d[at + n + i];
    return loop;
  }

  // The wind bed after its 4 s fade-in. The FADE seconds that follow the loop cross-fade into its start (at equal power,
  // as the two stretches of noise are unrelated), so the end runs straight on into the start.
  async function wind() {
    const at = 4 * RATE, n = Math.round(WIND * RATE), x = FADE * RATE;
    const d = await render((at + n + x) / RATE, s => s._windBed(true));
    const loop = d.slice(at, at + n);
    for (let i = 0; i < x; i++) {
      const a = (Math.PI / 2) * (i / x);
      loop[i] = loop[i] * Math.sin(a) + d[at + n + i] * Math.cos(a);
    }
    return loop;
  }

  // One effect, trimmed to its sound and its decay. k picks the variation: footsteps cycle through four.
  async function effect(name, opts = {}, k = 0) {
    const d = await render(6, s => { s._n = k; s.sfx(name, opts); });   // 6 s is more than any effect needs, as checked below
    let a = 0, b = d.length;
    while (a < b && !d[a]) a++;
    while (b > a && !d[b - 1]) b--;
    if (b === d.length) throw new Error(`sound: ${name} is silent, or still rings at the end of its render`);
    return d.slice(a, b);
  }

  // A mono 32-bit float WAV, as a data URL.
  function wav(samples) {
    const h = new DataView(new ArrayBuffer(44)), text = (at, s) => [...s].forEach((c, i) => h.setUint8(at + i, c.charCodeAt(0)));
    text(0, 'RIFF'); h.setUint32(4, 36 + samples.byteLength, true); text(8, 'WAVE');
    text(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 3, true); h.setUint16(22, 1, true);   // IEEE float, mono
    h.setUint32(24, RATE, true); h.setUint32(28, RATE * 4, true); h.setUint16(32, 4, true); h.setUint16(34, 32, true);
    text(36, 'data'); h.setUint32(40, samples.byteLength, true);
    return new Promise(done => {
      const r = new FileReader();
      r.onload = () => done(r.result);
      r.readAsDataURL(new Blob([h, samples], { type: 'audio/wav' }));
    });
  }

  PARTS.sound = async () => {
    const put = async (name, samples) => { BAKE.out[`sound/${name}.ogg`] = await wav(samples); };
    for (const mood of MOODS) await put(`music_${mood}`, await music(mood));
    await put('wind', await wind());
    for (const name of EFFECTS) await put(name, await effect(name));
    for (let k = 0; k < 4; k++) {
      await put(`step_wood_${k}`, await effect('step', { surface: 'wood' }, k));
      await put(`step_${k}`, await effect('step', {}, k));
    }
  };
})();
