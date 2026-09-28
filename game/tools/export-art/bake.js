'use strict';
/* Bake helpers: turn the presentation's code-drawn art into PNG + JSON for Godot.
   Runs inside export.html in headless Chrome (see export.py). Deterministic: time is sampled, never read.

   Animation is baked as a loop of N = FPS * SECONDS samples. Each animated thing is a "track":
   its unique frames plus a run-length sequence saying which frame shows at each sample.
   Stepped animations repeat exactly; only things that drift across the scene can jump at the loop seam. */
(() => {
  const FPS = 30, SECONDS = 24, N = FPS * SECONDS;
  const out = {};                                   // published path (relative to game/art) -> data URL or JSON text

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

  // Shelf-pack images (canvases or ImageData) into one atlas. Returns { canvas, pos: [[x, y], ...] }.
  function pack(imgs, maxW = 2048, pad = 1) {
    const order = imgs.map((_, i) => i).sort((a, b) => imgs[b].height - imgs[a].height || imgs[b].width - imgs[a].width);
    const pos = new Array(imgs.length);
    let x = 0, y = 0, rowH = 0, W = 1;
    for (const i of order) {
      const { width: w, height: h } = imgs[i];
      if (x > 0 && x + w > maxW) { x = 0; y += rowH + pad; rowH = 0; }
      pos[i] = [x, y]; x += w + pad; rowH = Math.max(rowH, h); W = Math.max(W, x - pad);
    }
    const [c, g] = canvas(W, y + rowH);
    imgs.forEach((im, i) => (im instanceof ImageData ? g.putImageData(im, pos[i][0], pos[i][1]) : g.drawImage(im, pos[i][0], pos[i][1])));
    return { canvas: c, pos };
  }

  /* Write one place variant to places/<place>/<variant>/: place.json, below.png, above.png, atlas.png.
     spec: { size: [W, H], bg, below: layer(), above: layer() | null, items: [{ name, y, track }],
             anchors, paths, hotspots, extra } (items whose track is null are skipped). */
  function place(placeName, variant, spec) {
    const dir = `places/${placeName}/${variant}`, imgs = [];
    const ref = tr => {
      const first = imgs.length; imgs.push(...tr.frames);
      return { at: tr.at, size: tr.size, frames: tr.frames.map((_, i) => first + i), seq: rle(tr.seq) };
    };
    const below = spec.below.tiles.map(ref);
    const above = spec.above ? spec.above.tiles.map(ref) : [];
    const items = spec.items.filter(it => it.track).map(it => ({ name: it.name, y: Math.round(it.y), ...ref(it.track) }));
    const { canvas: atlas, pos } = pack(imgs);
    const fix = tr => { tr.frames = tr.frames.map(i => pos[i]); return tr; };
    [...below, ...above, ...items].forEach(fix);
    png(`${dir}/atlas.png`, atlas);
    png(`${dir}/below.png`, spec.below.base);
    if (spec.above) png(`${dir}/above.png`, spec.above.base);
    json(`${dir}/place.json`, {
      size: spec.size, bg: spec.bg, fps: FPS, loop: N,
      below: { image: 'below.png', tiles: below },
      above: spec.above ? { image: 'above.png', tiles: above } : null,
      items,
      anchors: spec.anchors || {}, paths: spec.paths || {}, hotspots: spec.hotspots || {},
      ...(spec.extra || {}),
    });
  }

  window.BAKE = { FPS, SECONDS, N, out, canvas, png, json, layer, item, pack, place, rle, times };
  window.PARTS = {};
})();
