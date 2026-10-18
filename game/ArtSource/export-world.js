'use strict';
/* Bellwood outdoors -> places/world/day/, places/world/walk.png and grades.json.
   Renders bellwood.js through its exporter opt-in: view.state.part draws only the layer below the depth-sorted
   entries, one entry, or the air above them, and scene.bake lists the entries and the walk-mask data.
   The world is drawn once, at midday; the game grades it for the time of day with KIT.GRADES (grades.json). */
(() => {
  PARTS.world = () => {
    const S = BELLWOOD.createWorld(), W = S.w, H = S.h;
    const draw = (g, t, more) => S.draw(g, { x: 0, y: 0, w: W, h: H, t, state: more });
    const CELL = 8; // animated ground tiles: small, so the water's frames stay small and repeat
    const below = BAKE.layer(W, H, (g, t) => draw(g, t, { part: 'below' }), { cell: CELL });
    const above = BAKE.layer(W, H, (g, t) => draw(g, t, { part: 'above' }), { cell: CELL });
    const items = S.bake.items.map(it => ({
      name: it.name, y: it.y, light: it.light, day: it.day, foot: it.foot,
      track: BAKE.item((g, t) => draw(g, t, { part: 'item', item: it.name }), it.box, { n: it.animated ? BAKE.N : 1 }),
    }));
    BAKE.place('world', 'day', { size: [W, H], bg: S.bg, below, above, items, anchors: S.anchors, paths: S.paths });
    BAKE.json('grades.json', KIT.GRADES);
    const walk = walkMask(S, items);
    BAKE.png('places/world/walk.png', walk.canvas);
    if (walk.missing.length) throw new Error('world walk mask: not walkable or not connected: ' + walk.missing.join(', '));
  };

  /* Walk mask: opaque white where a character's feet may stand, opaque black elsewhere. It comes from the world's own
     data and art: water (not under a deck), the cliff and the hill faces (not their steps), the wood, the rails, the
     platform's edge, the fields, and each prop's footprint: its lowest rows, or for a building the span of its walls
     from its base back (never its roof, nor a sign hanging off a wall). Solids grow by the room an ant's feet need: 8 px sideways and 3 px in front and behind, where
     depth sorting already keeps its body in front of or behind the prop. Only what the start can reach is kept, and
     every path and every spot a character walks to must be in it. */
  function walkMask(S, items) {
    const W = S.w, H = S.h, B = S.bake, A = S.anchors;
    const solid = new Uint8Array(W * H), at = (x, y) => y * W + x, inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const terrain = (x, y) => (B.water(x, y) && !B.onDeck(x, y)) || (B.onCliff(x, y) && !B.onSteps(x, y)) || (B.onHillFace(x, y) && !B.onHillSteps(x, y)) ||
      B.onHillSide(x, y) || B.inForest(x, y) || B.onRails(x, y) || B.onPlatformFace(x, y) || B.inGarden(x, y) || B.inWheat(x, y);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (terrain(x, y)) solid[at(x, y)] = 1;
    const free = /^(hen_|chick$|cat$|crab$|gull$|boat$|butterfly_|firefly_|tunnel$|rail_bridge$)/;
    const base = new Map(B.items.map(it => [it.name, it.base]));
    for (const { name, y, light, foot, track } of items) {
      if (!track || light || free.test(name)) continue;
      const span = base.get(name);
      if (span) { for (let j = Math.round(y) - foot; j < Math.round(y); j++) for (let i = span[0]; i <= span[1]; i++) if (inside(i, j)) solid[at(i, j)] = 1; continue; }
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
    const walk = new Uint8Array(W * H), stack = [A.start];
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
