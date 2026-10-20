'use strict';
/* Rooms: the keepsake items and the UI icons (PARTS.rooms). The rooms themselves are cut open in their places now
   (inside.js). Output format: see bake.js. */
(() => {
  const { png, json } = BAKE;

  // IT.item names and their variants (ART.md, items contract), and the IT.icon names. '' is the plain image, written without a suffix.
  const ITEMS = { watch: ['front', 'scorched', 'side'], watch_clean: ['front', 'back', 'side'], watch_ticking: ['front', 'open', 'side'], bread: [], damar_oil: [], oil_lantern: [], rabbit: ['front', 'back'], rabbit_mended: ['front', 'back'], chamomile: [], red_thread: [], button: [], camera: ['side', 'front', 'top'], camera_clean: ['side', 'front', 'top'], rope: [], mint: [], mint_tea: [], key: ['front', 'back'], key_turned: ['front', 'back'], register: [], shoes: ['pair', 'soles', 'tongue'], shoes_mended: ['pair', 'soles', 'tongue'], ledger: ['cover', 'spine', 'page'], ledger_balanced: ['page', 'cover'], savings_book: ['cover', 'inside'], musicbox: ['closed', 'under', 'open'], musicbox_open: ['open', 'under'], letter: ['back', 'front'], letter_read: [], photo: ['front', 'back'], parcel: [], contract: [], contract_torn: [], post_stamp: ['handle', 'face'], purse: [], shirt: [], biscuit: [], basket: [], homekey: [], briefcase: [] };
  const ICONS = ['bag', 'look', 'talk', 'hand', 'lantern', 'clock', 'heart', 'note', 'sound-on', 'sound-off', 'morning', 'midday', 'dusk', 'night'];

  PARTS.rooms = () => itemsAndIcons();

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
