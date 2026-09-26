'use strict';
/* Development stand-ins that follow the ART.md contracts (replaced by the real modules at build time). */
(() => {
  const { PAL, rect, ellipse, shadow, canvas } = PX;
  const sortDraw = (ctx, props, actors) => [...props, ...actors].sort((a, b) => a.y - b.y).forEach(o => o.draw(ctx));
  if (!window.WORLD) window.WORLD = {
    createVillage() {
      const s = { w: 720, h: 560, bg: PAL.grass2,
        anchors: { vista: [360, 60], shopDoor: [360, 252], stairsTop: [360, 262], stairsBottom: [360, 300], square: [360, 360], well: [360, 350], bakeryDoor: [185, 322], tailorDoor: [535, 322], stall: [610, 400], bench: [300, 410], bridge: [180, 470], arrivalStart: [30, 555], riverRock: [90, 420], cottageDoor: [585, 532] },
        paths: { arrival: [[30, 555], [180, 470], [300, 400], [360, 360], [360, 300], [360, 262], [360, 252]], plaza: [[240, 340], [480, 340], [480, 400], [240, 400], [240, 340]], bakery: [[360, 360], [185, 322]], tailor: [[360, 360], [535, 322]], stall: [[360, 380], [610, 400]], cottage: [[480, 400], [585, 532]] },
        draw(ctx, v, actors) {
          const st = v.state || {}, tod = st.tod || 0;
          rect(ctx, 0, 0, 720, 110, tod > 0.5 ? PAL.dusk2 : PAL.sky2); rect(ctx, 0, 90, 720, 60, PAL.grass3);
          rect(ctx, 150, 260, 440, 160, PAL.dirt1); rect(ctx, 0, 300, 90, 260, PAL.water3); rect(ctx, 90, 430, 220, 130, PAL.water3);
          rect(ctx, 150, 455, 60, 30, PAL.wood2); rect(ctx, 230, 200, 260, 60, PAL.stone2);
          const k = st.shop == null ? 1 : st.shop; if (k > 0) { ctx.globalAlpha = k; rect(ctx, 300, 170, 120, 80, PAL.roofG2); ctx.globalAlpha = 1; }
          (st.lanterns || []).forEach((l, i) => rect(ctx, 306 + i * 16, 226, 6, 8, l > 0.5 ? PAL.light2 : PAL.iron3));
          const props = [[185, 322, PAL.roofR2, 110], [535, 322, PAL.roofB2, 110], [585, 532, PAL.roofB2, 100]].map(([x, y, c, w]) => ({ y, draw: g => rect(g, x - w / 2, y - 70, w, 70, c) }));
          sortDraw(ctx, props, actors);
        } };
      return s;
    } };
  if (!window.CH) {
    const cols = { courier: PAL.cap2, marlow: PAL.leaf4, helen: PAL.roofB2, mender: PAL.wood3, traveller: PAL.orange, nora: PAL.pink, mia: PAL.water3, grandkid: PAL.rose, theo: PAL.stone4, leo: PAL.yellow, sam: PAL.light2, mother: PAL.cream1, baker: PAL.white, gardener: PAL.dirt3, kid: PAL.red };
    window.CH = {
      ids: Object.keys(cols), POSES: { idle: 4, walk: 6, talk: 2, give: 2, receive: 2, sit: 2, moved: 2, wave: 2, carry: 2, carryWalk: 6, inspect: 2, run: 6 },
      frames: (id, pose) => CH.POSES[pose] || 1, fps: pose => (pose === 'walk' || pose === 'carryWalk' || pose === 'run' ? 10 : 4),
      draw(ctx, id, pose, frame, x, y, dir = 1, opts = {}) {
        if (opts.shadow !== false) shadow(ctx, x, y, 7, 2);
        const bob = pose === 'walk' || pose === 'carryWalk' ? frame % 2 : 0, h = id === 'sam' || id === 'grandkid' || id === 'kid' ? 18 : 24;
        rect(ctx, x - 5, y - h - bob, 10, h, cols[id] || PAL.ant2); rect(ctx, x - 5 - dir * 6, y - 12 - bob, 7, 8, PAL.ant2); rect(ctx, x + (dir > 0 ? 1 : -4), y - h + 3 - bob, 3, 3, PAL.cream0);
      },
      hand: (id, pose) => [8, -14], sprite: () => canvas(40, 40)[0],
      portrait(id) { const [c, x] = canvas(48, 48); ellipse(x, 24, 24, 16, 16, PAL.ant2); ellipse(x, 30, 22, 4, 4, PAL.cream0); rect(x, 12, 36, 24, 12, cols[id] || PAL.cap2); return c; },
    };
  }
  if (!window.INTERIORS) window.INTERIORS = {
    createShop() { return { w: 360, h: 240, bg: PAL.wood4, anchors: { marlow: [180, 128], customer: [180, 196], door: [180, 236], clock: [180, 40], slot0: [132, 150], slot1: [148, 150], slot2: [164, 150], slot3: [180, 150], slot4: [196, 150], slot5: [212, 150], slot6: [228, 150], ...Object.fromEntries([...Array(7)].map((_, i) => ['lantern' + i, [60 + i * 40, 24]])) },
      draw(ctx, v, actors) { const st = v.state || {}; rect(ctx, 0, 0, 360, 120, PAL.wall1); rect(ctx, 0, 120, 360, 120, PAL.wood1); ellipse(ctx, 180, 44, 16, 16, PAL.cream0);
        (st.lanterns || [1, 1, 1, 1, 1, 1, 1]).forEach((l, i) => rect(ctx, 57 + i * 40, 18, 7, 10, l > 0.5 ? PAL.light2 : PAL.iron3));
        sortDraw(ctx, [{ y: 150, draw: g => rect(g, 110, 130, 140, 24, PAL.wood3) }], actors); } }; },
    createStation() { return { w: 420, h: 220, bg: PAL.grass3, anchors: { courierStart: [30, 150], menderCustomer: [150, 152], mender: [185, 132], travellerCustomer: [255, 152], traveller: [290, 150], helenSeat: [350, 140], helenStand: [335, 152], benchCustomer: [312, 152], plaque: [70, 92], timetable: [230, 100], stall: [185, 140] },
      hotspots: { plaque: [58, 86, 26, 10], timetable: [218, 84, 26, 30], mender: [174, 104, 24, 34], traveller: [280, 118, 22, 34], helen: [336, 108, 28, 36] },
      draw(ctx, v, actors) { rect(ctx, 0, 0, 420, 110, PAL.grass3); rect(ctx, 0, 110, 420, 60, PAL.wood1); rect(ctx, 0, 176, 420, 20, PAL.stone3); rect(ctx, 20, 50, 110, 62, PAL.wall1); rect(ctx, 58, 86, 26, 8, PAL.cream0); sortDraw(ctx, [{ y: 142, draw: g => rect(g, 330, 126, 44, 16, PAL.wood3) }], actors); } }; },
  };
  if (!window.IT) window.IT = {
    item(name, size = 'sm') { const n = size === 'lg' ? 44 : 14, [c, x] = canvas(n, n); ellipse(x, n / 2, n / 2, n / 2 - 1, n / 2 - 1, { watch: PAL.brass1, doll: PAL.cream0, camera: PAL.iron2, key: PAL.brass2, shoes: PAL.white, book: PAL.rose, letter: PAL.cream1, musicbox: PAL.wood2, parcel: PAL.dirt2, suitcase: PAL.wood3 }[name] || PAL.pink); return c; },
    icon(name) { const [c, x] = canvas(16, 16); rect(x, 2, 2, 12, 12, PAL.ink); rect(x, 3, 3, 10, 10, PAL.light2); return c; },
  };
  if (!window.DIO) window.DIO = {
    names: ['station', 'toyshop', 'darkroom', 'archive', 'lighthouse', 'desk', 'home'],
    create(name) { const hue = { station: PAL.dusk2, toyshop: PAL.pink, darkroom: PAL.rose, archive: PAL.wood1, lighthouse: PAL.sky2, desk: PAL.dusk4, home: PAL.light1 }[name];
      return { w: 160, h: 96, bg: hue, anchors: { a: [58, 84], b: [102, 84], c: [80, 88], item: [80, 62] }, draw(ctx, v, actors) { rect(ctx, 0, 0, 160, 60, hue); rect(ctx, 0, 60, 160, 36, PAL.wood1); sortDraw(ctx, [], actors); } }; },
  };
})();
