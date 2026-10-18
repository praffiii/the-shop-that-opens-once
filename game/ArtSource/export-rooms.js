'use strict';
/* Rooms: Marlow's shop, the old station and Nora's toy shop as places, plus the keepsake items and the UI icons (PARTS.rooms).
   The scenes are split with the export hook in interiors.js and toyshop.js (view.state.part). Output format: see bake.js. */
(() => {
  const { canvas, png, json, layer, item, place } = BAKE;
  const CLEAR = 5, HALF = 10;   // walk masks: clearance from walls and furniture bases; half an ant's width, kept clear beside walls

  // The scenes' sorted props, in the order interiors.js and toyshop.js push them.
  const SHOP_PROPS = ['counter', 'floor_lamp', 'armchair', 'side_table', 'book_pile', 'globe', 'plant_left', 'plant_right', 'gramophone', 'coat_stand', 'trunks', 'umbrella_stand', 'map_basket'];
  const STATION_PROPS = ['timetable', 'sign', 'stall', 'suitcase', 'bench', 'lamp_left', 'lamp_right', 'churn', 'planter_left', 'planter_right'];
  const TOYSHOP_PROPS = ['workbench', 'rocking_horse', 'blocks', 'toy_chest', 'sewing_basket', 'train', 'tea_party', 'pram', 'dress_form', 'geranium', 'parcels', 'scrap_basket'];
  // IT.item names and their variants (ART.md, items contract), and the IT.icon names. '' is the plain image, written without a suffix.
  const ITEMS = { watch: ['front', 'back', 'side'], doll: ['', 'foot'], camera: [], key: [], shoes: [], book: [], letter: [], musicbox: ['closed', 'open'], parcel: [], suitcase: [] };
  const ICONS = ['bag', 'look', 'talk', 'hand', 'lantern', 'clock', 'heart', 'note', 'sound-on', 'sound-off'];

  PARTS.rooms = () => { shop(); station(); toyshop(); itemsAndIcons(); };

  const view = (S, t, state) => ({ x: 0, y: 0, w: S.w, h: S.h, t, state });
  // Each prop alone, sorted by its base line like drawSorted (a character on the same line stands in front).
  function propItems(S, names, state) {
    if (S.props.length !== names.length) throw new Error(`expected ${names.length} props, found ${S.props.length}`);
    return S.props.map((p, k) => ({ name: names[k], y: p.y, track: item((g, t) => S.draw(g, view(S, t, { ...state, part: 'item', item: k }), []),
      p.c ? [p.x0, p.y0, p.c.width, p.c.height] : [0, 0, S.w, S.h]) }));
  }

  /* Marlow's shop at dusk. The base shows every lantern unlit, the shelf empty and the clock without hands; the game shows
     lantern_i, keepsake_i and one clock_18mm on top. Wall items sort behind the floor, so their y only orders them. */
  function shop() {
    // one room per lantern state: a lantern that goes out between two draws of the same room puffs smoke
    const rooms = [...Array(8)].map(() => INTERIORS.createShop()), S = rooms[7], { w: W, h: H } = S, seven = [0, 1, 2, 3, 4, 5, 6];
    const below = (k, g, t) => rooms[k].draw(g, view(S, t, { part: 'below', lanterns: seven.map(i => +(i >= k)) }), []);   // lanterns 0..k-1 out
    const wall = [0, 0, W, S.floor[1]], shelfY = S.anchors.slot0[1];
    // lantern_i: the pixels that change when lantern i goes out after lanterns 0..i-1 (the order the nights put them out), taken
    // from the room with it lit. Its glow is drawn under the furniture, so it can't be an overlay: the patch is opaque instead,
    // and lantern_i sorts above lantern_i+1. Lanterns k..6 shown then rebuild the room exactly; any other mix is only off where
    // two glows overlap.
    const [ca, a] = canvas(W, H), [, b] = canvas(W, H);
    const lantern = i => item((g, t) => {
      a.clearRect(0, 0, W, H); below(i, a, t); b.clearRect(0, 0, W, H); below(i + 1, b, t);
      const im = a.getImageData(0, 0, W, H), on = new Uint32Array(im.data.buffer), off = new Uint32Array(b.getImageData(0, 0, W, H).data.buffer);
      for (let p = 0; p < on.length; p++) if (on[p] === off[p]) on[p] = 0;
      a.putImageData(im, 0, 0); g.drawImage(ca, 0, 0);
    }, wall);
    const alone = state => item((g, t) => S.draw(g, view(S, t, state), []), wall);
    const props = propItems(S, SHOP_PROPS, {});
    const items = [
      ...seven.map(i => ({ name: `lantern_${i}`, y: shelfY - 1 - i, track: lantern(i) })),
      ...seven.map(i => ({ name: `keepsake_${i}`, y: shelfY, track: alone({ part: 'keepsakes', keepsakes: seven.map(k => +(k === i)) }) })),
      ...[...Array(8)].map((_, k) => ({ name: `clock_18${17 + k}`, y: S.anchors.clock[1], track: alone({ part: 'hands', clockMin: 1097 + k }) })),
      ...props,
    ];
    place('shop', 'night', { size: [W, H], bg: S.bg, below: layer(W, H, (g, t) => below(7, g, t)), above: null, items, anchors: S.anchors, hotspots: S.hotspots, paths: S.paths });
    // the customer's side of the counter: the floor in front of its base line, and the doorway
    const [fx, fy, fw, fh] = S.floor, top = baseLine(props[SHOP_PROPS.indexOf('counter')])[2] + 1;
    png('places/shop/walk.png', walk(W, H, [[fx, top, fw, fy + fh - top], S.door], props, [], [S.anchors.door, S.anchors.customer]));
  }

  // The old station as Night 1 plays it (main.js, Try Night 1): dusk at tod 0.6, lamps lit.
  function station() {
    const S = INTERIORS.createStation(), { w: W, h: H } = S, state = { tod: 0.6, lamps: 1 }, A = S.anchors;
    const part = p => (g, t) => S.draw(g, view(S, t, { ...state, part: p }), []);
    const items = propItems(S, STATION_PROPS, state), named = n => items.find(it => it.name === n);
    place('station', 'dusk', { size: [W, H], bg: S.bg, below: layer(W, H, part('below')), above: layer(W, H, part('above')), items, anchors: A, hotspots: S.hotspots, paths: S.paths });
    // the platform, running on at the left into the road to the village; nobody walks behind the mender's stall or Helen's
    // bench. The courier reads the plaque and the timetable from their walking line.
    const [fx, fy, fw, fh] = S.floor, y = A.courierStart[1];
    png('places/station/walk.png', walk(W, H, [[fx - HALF, fy, fw + HALF, fh]], items, [named('stall'), named('bench')],
      [A.courierStart, A.menderCustomer, A.travellerCustomer, A.benchCustomer, [A.plaque[0], y], [A.timetable[0], y]]));
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
    json('items/items.json', list);
    for (const name of ICONS) png(`icons/${name}.png`, IT.icon(name));
  }
})();
