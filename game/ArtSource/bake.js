'use strict';
/* Bake helpers: turn the presentation's code-drawn art into PNG + JSON for the game.
   Runs inside export.html in headless Chrome (see export.py). Deterministic: time is sampled, never read.

   Animation is baked as a loop of N = FPS * SECONDS samples. Each animated thing is a "track":
   its unique frames plus a run-length sequence saying which frame shows at each sample.
   Stepped animations repeat exactly; only things that drift across the scene can jump at the loop seam. */
(() => {
  const FPS = 30, SECONDS = 24, N = FPS * SECONDS;
  const out = {};                                   // published path (relative to game/Assets/Resources/Art) -> data URL or JSON text

  const canvas = (w, h) => {
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
    return [c, g];
  };
  const png = (path, c) => { out[path] = c.toDataURL('image/png'); };
  const json = (path, obj) => { out[path] = JSON.stringify(obj); };

  // 53-bit content key for a w x h block of a 32-bit pixel buffer with row stride W.
  function key(u32, W, x0, y0, w, h) {
    let a = 2166136261, b = 5381;
    for (let y = 0; y < h; y++) {
      const o = (y0 + y) * W + x0;
      for (let x = 0; x < w; x++) { const v = u32[o + x]; a = Math.imul(a ^ v, 16777619); b = Math.imul(b, 33) ^ v; }
    }
    return (a >>> 0) * 2097152 + ((b >>> 0) & 0x1fffff);
  }
  function crop(u32, W, x0, y0, w, h) {
    const im = new ImageData(w, h), d = new Uint32Array(im.data.buffer);
    for (let y = 0; y < h; y++) d.set(u32.subarray((y0 + y) * W + x0, (y0 + y) * W + x0 + w), y * w);
    return im;
  }
  const rle = seq => { const r = []; for (const f of seq) { const l = r[r.length - 1]; if (l && l[0] === f) l[1]++; else r.push([f, 1]); } return r; };
  const times = n => Array.from({ length: n }, (_, k) => k / FPS);

  /* A layer covering the whole place. render(g, t) draws it (g is cleared first, world coords).
     Returns { base, tiles }: base is the first sample with every animated tile cleared, and each
     animated cell x cell tile is a track drawn over it. Opaque layers stay opaque; alpha is kept. */
  function layer(W, H, render, { cell = 16, n = N } = {}) {
    const [c, g] = canvas(W, H), cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const tiles = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * cell, y = j * cell;
      tiles.push({ at: [x, y], size: [Math.min(cell, W - x), Math.min(cell, H - y)], keys: new Map(), frames: [], seq: [] });
    }
    let base = null;
    for (const t of times(n)) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      render(g, t);
      const u32 = new Uint32Array(g.getImageData(0, 0, W, H).data.buffer);
      if (!base) { base = canvas(W, H); base[1].putImageData(new ImageData(new Uint8ClampedArray(u32.buffer.slice(0)), W, H), 0, 0); }
      for (const tl of tiles) {
        const [x, y] = tl.at, [w, h] = tl.size, k = key(u32, W, x, y, w, h);
        let f = tl.keys.get(k);
        if (f === undefined) { f = tl.frames.length; tl.keys.set(k, f); tl.frames.push(crop(u32, W, x, y, w, h)); }
        tl.seq.push(f);
      }
    }
    const moving = tiles.filter(tl => tl.frames.length > 1);
    for (const tl of moving) base[1].clearRect(tl.at[0], tl.at[1], tl.size[0], tl.size[1]);
    return { base: base[0], tiles: moving.map(({ at, size, frames, seq }) => ({ at, size, frames, seq })) };
  }

  /* One depth-sorted thing (a prop, a critter). render(g, t) draws it alone in world coords.
     box = [x, y, w, h] is the world region it can ever touch; the result is cropped to what it
     actually drew. n = 1 for things that never change. Returns a track, or null if it drew nothing. */
  function item(render, box, { n = N } = {}) {
    const [bx, by, bw, bh] = box, [, g] = canvas(bw, bh), keys = new Map(), shots = [], seq = [];
    let x0 = bw, y0 = bh, x1 = -1, y1 = -1;
    for (const t of times(n)) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bw, bh); g.setTransform(1, 0, 0, 1, -bx, -by);
      render(g, t);
      const u32 = new Uint32Array(g.getImageData(0, 0, bw, bh).data.buffer), k = key(u32, bw, 0, 0, bw, bh);
      let f = keys.get(k);
      if (f === undefined) {
        f = shots.length; keys.set(k, f); shots.push(u32);
        for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (u32[y * bw + x] >>> 24) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      seq.push(f);
    }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    return { at: [bx + x0, by + y0], size: [w, h], frames: shots.map(u32 => crop(u32, bw, x0, y0, w, h)), seq };
  }

  /* Atlases. Tracks are packed whole: all of a track's frames land in the same atlas, so one material draws it.
     A frame drawn more than once in an atlas (calm water, a repeating tile) is packed once. Atlases are at most
     MAX_W x MAX_H, inside what every WebGL device takes; a place that needs more gets more atlases. */
  const MAX_W = 2048, MAX_H = 2048, PAD = 1;
  function atlases(tracks) {
    const sheets = [], fkey = im => `${im.width}x${im.height}:${key(new Uint32Array(im.data.buffer), im.width, 0, 0, im.width, im.height)}`;
    let cur = null;
    const open = () => (cur = { imgs: [], pos: [], seen: new Map(), x: 0, y: 0, rowH: 0, w: 1, h: 1 }, sheets.push(cur), cur);
    // Try to place a track's new frames on sheet a; returns their positions or null when they do not fit.
    function fit(a, frames) {
      let { x, y, rowH } = a; const pos = [], fresh = new Map();
      for (const im of frames) {
        const k = fkey(im);
        if (a.seen.has(k) || fresh.has(k)) { pos.push(null); continue; }
        if (x > 0 && x + im.width > MAX_W) { x = 0; y += rowH + PAD; rowH = 0; }
        if (y + im.height > MAX_H || im.width > MAX_W) return null;
        pos.push([x, y]); fresh.set(k, [x, y]); x += im.width + PAD; rowH = Math.max(rowH, im.height);
      }
      return { pos, x, y, rowH };
    }
    // Tallest first keeps the shelves tight; the result keeps the callers' order.
    const order = tracks.map((_, i) => i).sort((a, b) => Math.max(...tracks[b].frames.map(f => f.height)) - Math.max(...tracks[a].frames.map(f => f.height)));
    const placed = new Array(tracks.length);
    for (const i of order) {
      const frames = tracks[i].frames;
      let a = cur || open(), r = fit(a, frames);
      if (!r) { a = open(); r = fit(a, frames); if (!r) throw new Error(`a track of ${frames.length} frames does not fit one ${MAX_W}x${MAX_H} atlas`); }
      const at = frames.map((im, k) => {
        const fk = fkey(im);
        if (a.seen.has(fk)) return a.seen.get(fk);
        const p = r.pos[k] || a.seen.get(fk); a.seen.set(fk, p); a.imgs.push([im, p]);
        a.w = Math.max(a.w, p[0] + im.width); a.h = Math.max(a.h, p[1] + im.height); return p;
      });
      Object.assign(a, { x: r.x, y: r.y, rowH: r.rowH });
      placed[i] = { atlas: sheets.indexOf(a), frames: at };
    }
    const canvases = sheets.map(a => {
      const [c, g] = canvas(a.w, a.h);
      for (const [im, [x, y]] of a.imgs) im instanceof ImageData ? g.putImageData(im, x, y) : g.drawImage(im, x, y);
      return c;
    });
    return { canvases, placed };
  }

  // A static layer drawn once (no animated tiles): the ground of a big place, whose motion lives in clips.
  function still(W, H, render) {
    const [c, g] = canvas(W, H); render(g, 0);
    return { base: c, tiles: [] };
  }

  // Cut a layer image into CHUNK x CHUNK images, skipping the empty ones. Returns [{ image, at }].
  const CHUNK = 1024;
  function chunks(dir, name, img) {
    const out = [], g = img.getContext('2d');
    for (let y = 0; y < img.height; y += CHUNK) for (let x = 0; x < img.width; x += CHUNK) {
      const w = Math.min(CHUNK, img.width - x), h = Math.min(CHUNK, img.height - y), d = g.getImageData(x, y, w, h);
      if (!new Uint32Array(d.data.buffer).some(v => v >>> 24)) continue;
      const [c, cg] = canvas(w, h); cg.putImageData(d, 0, 0);
      const file = `${name}_${x / CHUNK}_${y / CHUNK}.png`; png(`${dir}/${file}`, c); out.push({ image: file, at: [x, y] });
    }
    return out;
  }

  /* Write one place variant to places/<place>/<variant>/: place.json, the layer chunks and the atlases.
     spec: { size: [W, H], bg, below: layer() | still(), above: layer() | still() | null,
             clips: { name: track }, decals: { below: [[clip, x, y, offset]], above: [...] },
             items: [{ name, y, track, light, day }], anchors, paths, hotspots, extra }
     A clip is a small loop drawn once and placed many times as decals; a decal's offset (in samples) staggers it.
     A layer's animated tiles become one-off clips. Items whose track is null are skipped. A light item shows only at
     dusk and night and is never graded; a day item shows only in the morning and at midday. A clip or item with a
     sway (art px at its top) bends in the wind in the game's shader. */
  function place(placeName, variant, spec) {
    const dir = `places/${placeName}/${variant}`, clipNames = Object.keys(spec.clips || {}), tracks = [];
    const clipIx = new Map(), addTrack = tr => (tracks.push(tr), tracks.length - 1);
    for (const n of clipNames) clipIx.set(n, addTrack(spec.clips[n]));
    const layerDecals = l => (l ? l.tiles.map(tr => [addTrack(tr), tr.at[0], tr.at[1], 0]) : []);
    const named = (list = []) => list.map(([n, x, y, o]) => { if (!clipIx.has(n)) throw new Error(`no clip "${n}"`); return [clipIx.get(n), x, y, o | 0]; });
    const decals = {
      below: [...layerDecals(spec.below), ...named(spec.decals && spec.decals.below)],
      above: [...layerDecals(spec.above), ...named(spec.decals && spec.decals.above)],
    };
    const items = spec.items.filter(it => it.track).map(it => ({ it, t: addTrack(it.track) }));
    const { canvases, placed } = atlases(tracks);
    canvases.forEach((c, i) => png(`${dir}/atlas_${i}.png`, c));
    // Clips are the tracks decals use, numbered in order of first use.
    const used = new Map(), clips = [];
    const clipOf = t => { if (!used.has(t)) { used.set(t, clips.length); clips.push({ atlas: placed[t].atlas, size: tracks[t].size, frames: placed[t].frames, seq: rle(tracks[t].seq), ...(tracks[t].sway ? { sway: tracks[t].sway } : {}) }); } return used.get(t); };
    const dec = list => list.map(([t, x, y, o]) => [clipOf(t), x, y, o]);
    json(`${dir}/place.json`, {
      size: spec.size, bg: spec.bg, fps: FPS, loop: N, atlases: canvases.length,
      below: { chunks: chunks(dir, 'below', spec.below.base), decals: dec(decals.below) },
      above: spec.above ? { chunks: chunks(dir, 'above', spec.above.base), decals: dec(decals.above) } : null,
      clips,
      items: items.map(({ it, t }) => ({
        name: it.name, y: Math.round(it.y), ...(it.light ? { light: true } : {}), ...(it.day ? { day: true } : {}), ...(it.sway ? { sway: it.sway } : {}),
        atlas: placed[t].atlas, at: tracks[t].at, size: tracks[t].size, frames: placed[t].frames, seq: rle(tracks[t].seq),
      })),
      anchors: spec.anchors || {}, paths: spec.paths || {}, hotspots: spec.hotspots || {},
      ...(spec.extra || {}),
    });
  }

  window.BAKE = { FPS, SECONDS, N, out, canvas, png, json, layer, still, item, place, rle, times };
  window.PARTS = {};
})();
