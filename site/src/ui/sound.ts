// The game's sounds (Art/sound, transcoded by tools/sync.py), off until the visitor turns them on. One-shots, voice
// blips pitched like Sound.Blip, footsteps cycling their four takes, and looping beds (music and ambience) that fade.
const ROOT = '/sound';
const KEY = 'shop.sound';

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();
const beds = new Map<string, { gain: GainNode; source: AudioBufferSourceNode; volume: number }>();
let steps = 0;
let speaking = false;

function read() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export const sound = {
  on: read(),
  listeners: new Set<(on: boolean) => void>(),

  set(on: boolean) {
    this.on = on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* private window: the choice lasts this visit */
    }
    if (on) audio().resume();
    else for (const name of [...beds.keys()]) stopBed(name);
    for (const f of this.listeners) f(on);
  },

  play(name: string, volume = 1, rate = 1) {
    if (!this.on) return;
    void buffer(name).then(b => {
      const a = audio(), s = a.createBufferSource(), g = a.createGain();
      s.buffer = b;
      s.playbackRate.value = rate;
      g.gain.value = volume;
      s.connect(g).connect(a.destination);
      s.start();
    });
  },

  blip(id: string, pitch: number) {
    this.play(`voice_${id}`, 0.55, pitch);
  },

  step() {
    this.play(`step_${steps++ % 4}`, 0.35, 0.95 + Math.random() * 0.1);
  },

  /** Plays a looping bed at volume, fading in; beds not named in keep fade out. */
  beds(keep: Record<string, number>) {
    if (!this.on) return;
    for (const name of [...beds.keys()]) if (!(name in keep)) stopBed(name);
    for (const [name, volume] of Object.entries(keep)) {
      const bed = beds.get(name);
      if (!bed) startBed(name, volume);
      else if (bed.volume !== volume) {
        bed.volume = volume;
        bed.gain.gain.setTargetAtTime(level(name, volume), audio().currentTime, 0.4);
      }
    }
  },

  /** Music ducks under a voice, as the game's Sound.Speaking. */
  set speaking(on: boolean) {
    if (on === speaking) return;
    speaking = on;
    if (!ctx) return;
    for (const [name, bed] of beds) bed.gain.gain.setTargetAtTime(level(name, bed.volume), ctx.currentTime, 0.15);
  },
};

// A saved 'on' waits for the visitor's first touch: browsers start sound only after one.
for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, () => void ctx?.resume(), { once: true });

function audio() {
  return (ctx ??= new AudioContext());
}

function buffer(name: string) {
  let b = buffers.get(name);
  if (!b) {
    b = fetch(`${ROOT}/${name}.mp3`)
      .then(r => r.arrayBuffer())
      .then(data => audio().decodeAudioData(data));
    buffers.set(name, b);
  }
  return b;
}

const level = (name: string, volume: number) => (speaking && name.startsWith('music') ? volume * 0.5 : volume);

function startBed(name: string, volume: number) {
  const a = audio(), source = a.createBufferSource(), gain = a.createGain();
  gain.gain.value = 0;
  source.loop = true;
  source.connect(gain).connect(a.destination);
  beds.set(name, { gain, source, volume });
  void buffer(name).then(b => {
    if (beds.get(name)?.source !== source) return;
    source.buffer = b;
    source.start();
    gain.gain.setTargetAtTime(level(name, volume), a.currentTime, 0.8);
  });
}

function stopBed(name: string) {
  const bed = beds.get(name);
  if (!bed) return;
  beds.delete(name);
  const a = audio();
  bed.gain.gain.setTargetAtTime(0, a.currentTime, 0.3);
  setTimeout(() => {
    try {
      bed.source.stop();
    } catch {
      /* never started: its buffer had not loaded */
    }
  }, 1500);
}
