'use strict';
/* Rooms: Nora's toy shop as a place, plus the keepsake items and the UI icons (PARTS.rooms). Marlow's shop is a room
   cut open in the grove now (inside.js). The scene is split with the export hook in toyshop.js (view.state.part).
   Output format: see bake.js. */
(() => {
  const { canvas, png, json, layer, item, place } = BAKE;
  const CLEAR = 5, HALF = 10;   // walk masks: clearance from walls and furniture bases; half an ant's width, kept clear beside walls

  // The scene's sorted props, in the order toyshop.js pushes them.
  const TOYSHOP_PROPS = ['workbench', 'rocking_horse', 'blocks', 'toy_chest', 'sewing_basket', 'train', 'tea_party', 'pram', 'dress_form', 'geranium', 'parcels', 'scrap_basket'];
  // IT.item names and their variants (ART.md, items contract), and the IT.icon names. '' is the plain image, written without a suffix.
  const ITEMS = { watch: ['front', 'scorched', 'side'], watch_clean: ['front', 'back', 'side'], watch_ticking: ['front', 'open', 'side'], bread: [], damar_oil: [], oil_lantern: [], doll: ['', 'foot'], camera: [], key: [], shoes: [], book: [], letter: [], musicbox: ['closed', 'open'], parcel: [], suitcase: [], contract: [], purse: [], shirt: [], biscuit: [], basket: [], homekey: [], briefcase: [] };
  const ICONS = ['bag', 'look', 'talk', 'hand', 'lantern', 'clock', 'heart', 'note', 'sound-on', 'sound-off', 'morning', 'midday', 'dusk', 'night'];

  PARTS.rooms = () => { toyshop(); itemsAndIcons(); };

  const view = (S, t, state) => ({ x: 0, y: 0, w: S.w, h: S.h, t, state });
  // Each prop alone, sorted by its base line like drawSorted (a character on the same line stands in front).
  function propItems(S, names, state) {
    if (S.props.length !== names.length) throw new Error(`expected ${names.length} props, found ${S.props.length}`);
    return S.props.map((p, k) => ({ name: names[k], y: p.y, track: item((g, t) => S.draw(g, view(S, t, { ...state, part: 'item', item: k }), []),
      p.c ? [p.x0, p.y0, p.c.width, p.c.height] : [0, 0, S.w, S.h]) }));
  }

  // Nora's toy shop at dusk (Night 2). Nora stands behind her workbench, where nobody else walks.
  function toyshop() {
    const S = TOYSHOP.createToyShop(), { w: W, h: H } = S, A = S.anchors;
    const items = propItems(S, TOYSHOP_PROPS, {});
    place('toyshop', 'dusk', { size: [W, H], bg: S.bg, below: layer(W, H, (g, t) => S.draw(g, view(S, t, { part: 'below' }), [])), above: null, items, anchors: A, hotspots: S.hotspots, paths: S.paths });
    png('places/toyshop/walk.png', walk(W, H, [S.floor, S.door], items, [items[TOYSHOP_PROPS.indexOf('workbench')]], [A.door, A.customer, A.rabbits, A.frame, A.shirt, A.spool]));
  }

  // An item's base line: the x range of its lowest row of opaque pixels, [x0, x1, y].
  function baseLine({ track: { at: [ax, ay], size: [w, h], frames: [f] } }) {
    for (let y = h - 1; y >= 0; y--) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < w; x++) if (f.data[(y * w + x) * 4 + 3] === 255) { if (x0 < 0) x0 = x; x1 = x; }
      if (x0 >= 0) return [ax + x0, ax + x1, ay + y];
    }
  }

  /* Walk mask: opaque white where a character's feet may stand, black elsewhere. Starts from the floor rects [x, y, w, h] (the
     image edge is a wall unless the floor runs past it), keeps CLEAR px from what bounds them above and below and HALF px beside,
     and CLEAR px around each item's base line. `behind` items (NPCs stand there) block the floor behind them and HALF px beside,
     since the bench sorts by its seat, above its legs. Only floor connected to the first spot in `need` stays white, and every
     spot in `need` must be on it. */
  function walk(W, H, floor, items, behind, need) {
    const block = new Uint8Array(W * H), top = Math.min(...floor.map(r => r[1]));
    const fill = (x0, y0, x1, y1) => { for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) block[y * W + x] = 1; };
    const onFloor = (x, y) => floor.some(([fx, fy, fw, fh]) => x >= fx && y >= fy && x < fx + fw && y < fy + fh);
    for (let y = -CLEAR; y < H + CLEAR; y++) for (let x = -HALF; x < W + HALF; x++) if (!onFloor(x, y)) fill(x - HALF, y - CLEAR, x + HALF, y + CLEAR);
    for (const it of items) { const [x0, x1, y] = baseLine(it), b = behind.includes(it), d = b ? HALF : CLEAR; fill(x0 - d, (b ? top : y) - CLEAR, x1 + d, y + CLEAR); }
    const seen = new Uint8Array(W * H), todo = [];
    const visit = (x, y) => { const p = y * W + x; if (x >= 0 && y >= 0 && x < W && y < H && !block[p] && !seen[p]) { seen[p] = 1; todo.push(p); } };
    visit(...need[0]);
    while (todo.length) { const p = todo.pop(), x = p % W, y = (p - x) / W; visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1); }
    for (const [x, y] of need) if (!seen[y * W + x]) throw new Error(`walk mask: (${x}, ${y}) is blocked or cut off from (${need[0]})`);
    const [c, g] = canvas(W, H), im = g.createImageData(W, H), px = new Uint32Array(im.data.buffer);
    for (let p = 0; p < px.length; p++) px[p] = seen[p] ? 0xffffffff : 0xff000000;
    g.putImageData(im, 0, 0);
    return c;
  }

  // items/<name>_<size>[_<variant>].png for every size IT draws, items/items.json, icons/<name>.png
  function itemsAndIcons() {
    const list = {};
    for (const [name, variants] of Object.entries(ITEMS)) {
      const sizes = ['xs', 'sm', 'lg'].filter(size => { try { return IT.item(name, size); } catch (e) { if (!e.message.startsWith('IT.item: no ')) throw e; return false; } });
      for (const size of sizes) for (const v of variants.length ? variants : [undefined]) png(`items/${name}_${size}${v ? '_' + v : ''}.png`, IT.item(name, size, v));
      list[name] = { sizes, variants };
    }
    for (const [path, img] of INSIDE.boxItems()) png(path, img);
    json('items/items.json', list);
    for (const name of ICONS) png(`icons/${name}.png`, IT.icon(name));
  }
})();
