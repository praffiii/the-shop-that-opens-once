'use strict';
/* Bellwood outdoors -> places/<area>/day/, places/<area>/height.png, places/<area>/walk.png and grades.json.
   Bakes each area of areas.js, built on a canvas reaching past its edges (S.area is the area's rect on it; the
   height map covers the canvas, the walk mask only the area): its ground is one still image cut into chunks, its small loops and its forest are
   clips placed as decals, and every depth-sorted thing is an item. An area is drawn once, at midday; the game grades
   it for the time of day with KIT.GRADES (grades.json). */
(() => {
  // Each outdoor area is its own place, and so is each room (inside.js).
  PARTS.areas = () => { AREA.ids.forEach(id => bake(id, AREA.build(id))); INSIDE.ids.forEach(id => bake(id, INSIDE.build(id))); };

  function bake(id, S) {
    const W = S.w, H = S.h;
    const clips = Object.fromEntries(Object.entries(S.clips).map(([k, c]) => [k, Object.assign(BAKE.item(c.draw, [0, 0, c.w, c.h], { n: c.animated ? BAKE.N : 1 }) || {}, c.sway ? { sway: c.sway } : {})]));
    for (const [k, c] of Object.entries(clips)) if (!c.frames) throw new Error(`clip "${k}" draws nothing`);
    // A clip's track is cropped to what it drew; shift each decal by that crop.
    const decal = ([k, x, y, o]) => [k, x + clips[k].at[0], y + clips[k].at[1], o];
    const items = S.items.map(it => ({ ...it, track: it.track || BAKE.item(it.draw, it.box, { n: it.animated ? BAKE.N : 1 }) }));
    BAKE.place(id, 'day', {
      size: [S.area[2], S.area[3]], origin: [-S.area[0], -S.area[1]], bg: S.bg, below: BAKE.still(W, H, g => g.drawImage(S.ground, 0, 0)), above: null,
      clips, decals: { below: S.decals.below.map(decal) }, items, anchors: S.anchors, paths: S.paths,
      ...(S.room ? { extra: { room: [S.room[0] - S.area[0], S.room[1] - S.area[1], S.room[2] - S.area[0], S.room[3] - S.area[1]] } } : {}),
    });
    BAKE.json('grades.json', KIT.GRADES);
    BAKE.png(`places/${id}/height.png`, heightMap(S));
    const walk = walkMask(S, items), [ax, ay, aw, ah] = S.area, [cut, cg] = BAKE.canvas(aw, ah);
    cg.drawImage(walk.canvas, -ax, -ay);
    BAKE.png(`places/${id}/walk.png`, cut);
    if (walk.missing.length) throw new Error(`${id} walk mask: not walkable or not connected: ` + walk.missing.join(', '));
  }

  /* Height map for the game's 3D view (Core/Relief.cs): red is each pixel's surface height in px above level 0, plus
     64; green is 255 on a cliff or bank face, which stands upright. A deck (a bridge, the jetty) is flat at the height
     of the land it joins, over the water and the banks under it; S.flats are more such rects (a bridge's whole deck
     and the rows its rails stand on, past where it can be walked). */
  function heightMap(S) {
    const W = S.w, H = S.h, h = new Int16Array(W * H), up = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { h[y * W + x] = S.height(x, y); up[y * W + x] = S.vertical(x, y); }
    for (const [x0, y0, x1, y1] of [...S.decks, ...(S.flats || [])]) {
      let top = -99;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!up[y * W + x]) top = Math.max(top, h[y * W + x]);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { h[y * W + x] = top; up[y * W + x] = 0; }
    }
    const [canvas, g] = BAKE.canvas(W, H), im = g.createImageData(W, H), px = new Uint32Array(im.data.buffer);
    for (let i = 0; i < W * H; i++) px[i] = (0xff000000 | (up[i] ? 0xff00 : 0) | Math.max(0, Math.min(255, h[i] + 64))) >>> 0;
    g.putImageData(im, 0, 0);
    return canvas;
  }

  /* Walk mask: opaque white where a character's feet may stand, opaque black elsewhere. Solid is what the world calls
     blocked (water, rock faces, the woods, the platform's edge) plus each item's footprint: for a building or prop
     with a base, the span of its walls from its base back `foot` rows; otherwise its lowest `foot` drawn rows. Lights
     and items marked walk (fireflies, smoke, bugs) never block. Solids grow by the room an ant's feet need: 8 px
     sideways and 3 px in front and behind, where depth sorting already keeps its body in front of or behind the prop.
     Only what the start (S.start, else the anchor named start) can reach is kept, and every path and anchor must be in it. */
  function walkMask(S, items) {
    const W = S.w, H = S.h, A = S.anchors;
    const solid = new Uint8Array(W * H), at = (x, y) => y * W + x, inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (S.blocked(x, y)) solid[at(x, y)] = 1;
    for (const { y, light, walk, foot = 4, base, track } of items) {
      if (!track || light || walk) continue;
      if (base) { for (let j = Math.round(y) - foot; j < Math.round(y); j++) for (let i = Math.round(base[0]); i <= base[1]; i++) if (inside(i, j)) solid[at(i, j)] = 1; continue; }
      const [ax, ay] = track.at, [w, h] = track.size, bot = ay + h - 1, y0 = bot - foot;
      for (const im of track.frames) for (let j = Math.max(0, y0 - ay); j <= bot - ay; j++) for (let i = 0; i < w; i++)
        if (im.data[(j * w + i) * 4 + 3] && inside(ax + i, ay + j)) solid[at(ax + i, ay + j)] = 1;
    }
    // Grow every solid edge pixel by the clearance ellipse.
    const RX = 8, RY = 3, ring = [], side = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let dy = -RY; dy <= RY; dy++) for (let dx = -RX; dx <= RX; dx++) if ((dx / RX) ** 2 + (dy / RY) ** 2 <= 1) ring.push([dx, dy]);
    const blocked = solid.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!solid[at(x, y)] || side.every(([dx, dy]) => !inside(x + dx, y + dy) || solid[at(x + dx, y + dy)])) continue;
      for (const [dx, dy] of ring) if (inside(x + dx, y + dy)) blocked[at(x + dx, y + dy)] = 1;
    }
    const open = (x, y) => y >= RY && y < H - RY && x >= RX && x < W - RX && !blocked[at(x, y)];
    // Keep the region reachable from the start (4-connected flood fill).
    const walk = new Uint8Array(W * H), stack = [A[S.start || 'start']];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (!inside(x, y) || walk[at(x, y)] || !open(x, y)) continue;
      walk[at(x, y)] = 1; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    // Required: every path and every anchor (each is a spot where someone stands or arrives).
    const missing = [], ok = (x, y) => walk[at(Math.round(x), Math.round(y))] === 1;
    for (const [name, pts] of Object.entries(S.paths)) for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let s = 0; s <= n; s++) if (!ok(x0 + ((x1 - x0) * s) / n, y0 + ((y1 - y0) * s) / n)) { missing.push(`${name} near ${[Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n)]}`); break; }
    }
    for (const [k, p] of Object.entries(A)) if (!ok(...p)) missing.push(`${k} ${p}`);
    const [canvas, g] = BAKE.canvas(W, H), im = g.createImageData(W, H), px = new Uint32Array(im.data.buffer);
    for (let i = 0; i < W * H; i++) px[i] = walk[i] ? 0xffffffff : 0xff000000;
    g.putImageData(im, 0, 0);
    return { canvas, missing };
  }
})();
