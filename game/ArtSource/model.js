'use strict';
/* Houses in 3D, as HD-2D builds its towns: a house is a few flat faces, each a picture drawn in code laid on a
   rectangle in space (walls, gables, roof slopes, a chimney's sides, the boards along an eave). The game
   (Core/BakedArt.cs) builds a model's faces into a mesh and shades each face by how it turns from the sun; the previews
   draw them flat, as the camera sees them.

   A model's space is in texels, the same size every way: x right, up, and back (away from the camera, from the
   house's front line). The camera looks down PITCH degrees (Core/Art.cs Pitch), so a texel back is DEEP art rows,
   and a picture of w x h texels on a face that size keeps its texels square. Pictures are cut out like every
   sprite: a gable is a wall picture whose corners above its roof line are clear. A face's corners run top left,
   top right, bottom right, bottom left as seen from outside it. */
(() => {
  const PITCH = 35, DEEP = Math.tan(PITCH * Math.PI / 180);
  const { Buf, u32 } = KIT;
  const INK = u32(PX.PAL.ink);
  // What a lit window shows: its glass and curtains turned to lamplight, its flames as they are, nothing else.
  const LIT = new Map(Object.entries({ sky1: 'light0', sky2: 'light1', sky3: 'light2', sky4: 'light3', white: 'light0', wall2: 'light1', wall3: 'light2', light0: 'light0', light1: 'light1', light2: 'light2', light3: 'light3', light4: 'light4' })
    .map(([f, t]) => [u32(KIT.hex(f)), u32(KIT.hex(t))]));

  // Ink the edge of a picture: every opaque texel next to a clear one or the picture's border.
  function ink(b) {
    const edge = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++)
      if (b.get(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => !b.get(x + i, y + j))) edge.push([x, y]);
    for (const [x, y] of edge) b.set(x, y, INK);
  }
  const mirror = b => { const m = new Buf(b.w, b.h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) m.d[y * b.w + x] = b.d[y * b.w + b.w - 1 - x]; return m; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  /* A model to add faces to. draw(b, w, h, lit) paints a face's picture on a Buf and pushes the rects of its window
     glass onto lit ([x, y, w, h], as win() does); its edge is inked after (o.ink false leaves it). Each lit rect
     becomes a face of m.lit, the light model that glows over it after dark. */
  function make() {
    const faces = [], lit = [];
    const m = {
      faces, lit,
      face(w, h, draw, corners, o = {}) {
        let b = new Buf(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
        const glass = [];
        draw(b, b.w, b.h, glass);
        if (o.ink !== false) ink(b);
        if (o.mirror) b = mirror(b);
        faces.push({ b, corners });
        // A pane's corners on the face, a little out from it.
        const [tl, tr, , bl] = corners, at = (u, v) => [0, 1, 2].map(k => tl[k] + (tr[k] - tl[k]) * u / b.w + (bl[k] - tl[k]) * v / b.h + n[k] * 0.4);
        const e = [0, 1, 2].map(k => tr[k] - tl[k]), f = [0, 1, 2].map(k => bl[k] - tl[k]);
        const c = [e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]], l = Math.hypot(...c) || 1, n = c.map(v => v / l);
        for (const [gx0, gy, gw, gh] of glass) {
          const gx = o.mirror ? b.w - gx0 - gw : gx0, pane = new Buf(gw, gh);
          for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) pane.d[j * gw + i] = LIT.get(b.get(gx + i, gy + j)) || 0;
          lit.push({ b: pane, corners: [at(gx, gy), at(gx + gw, gy), at(gx + gw, gy + gh), at(gx, gy + gh)] });
        }
        return m;
      },
      // A wall facing the camera, back texels back: from x0, w wide, from up0, h tall.
      front(x0, back, up0, w, h, draw, o) {
        return m.face(w, h, draw, [[x0, up0 + h, back], [x0 + w, up0 + h, back], [x0 + w, up0, back], [x0, up0, back]], o);
      },
      // A wall facing left (side -1) or right (side 1) at x, from back0, d deep. Its picture runs from the front
      // (x 0) to the back, whichever way it faces.
      side(x, side, back0, up0, d, h, draw, o = {}) {
        const f = back0, k = back0 + d;
        return side < 0
          ? m.face(d, h, draw, [[x, up0 + h, k], [x, up0 + h, f], [x, up0, f], [x, up0, k]], { ...o, mirror: true })
          : m.face(d, h, draw, [[x, up0 + h, f], [x, up0 + h, k], [x, up0, k], [x, up0, f]], o);
      },
      // A slope (or any rectangle) from its four corners; the picture is as big as the face.
      quad(draw, tl, tr, br, bl, o) { return m.face(dist(tl, tr), dist(tl, bl), draw, [tl, tr, br, bl], o); },
      // A flat top facing up, from x0 to x1, from back0 (its front edge) to back1.
      top(x0, x1, back0, back1, up, draw, o) {
        return m.face(x1 - x0, back1 - back0, draw, [[x0, up, back1], [x1, up, back1], [x1, up, back0], [x0, up, back0]], o);
      },
      // A box's front, sides and top: a chimney, a post. draw(b, w, h, lit, which) for 'front', 'left', 'right', 'top'.
      box(x0, x1, back0, back1, up0, up1, draw) {
        const w = x1 - x0, d = back1 - back0, h = up1 - up0;
        m.front(x0, back0, up0, w, h, (b, bw, bh, l) => draw(b, bw, bh, l, 'front'));
        m.side(x0, -1, back0, up0, d, h, (b, bw, bh, l) => draw(b, bw, bh, l, 'left'));
        m.side(x1, 1, back0, up0, d, h, (b, bw, bh, l) => draw(b, bw, bh, l, 'right'));
        return m.top(x0, x1, back0, back1, up1, (b, bw, bh, l) => draw(b, bw, bh, l, 'top'));
      },
    };
    return m;
  }

  /* A house under a gable roof, its walls from x0 to x1 and from back0, d deep, wall texels to the eaves; the roof
     rises rise more to its ridge and hangs ov past the walls. ridge 'x' runs the ridge along the front (the eaves face
     the camera, the gables the sides); 'back' runs it away (a gable faces the camera). Pictures:
       front(b, w, h, lit), left(...), right(...): the walls, a gable's picture as tall as its peak and cut to its
         roof line after it is drawn (side walls run from the front, x 0, back);
       roof(b, w, h, which): a slope ('front', or 'left' and 'right'), its ridge along the top and eave along the
         bottom, rows parallel to them;
       board(b, w, h): the boards along its eaves and verges, 3 texels deep.
     The walls stand up0 texels up (on a plinth); the boards are thick texels deep; shade rows under the roof line are
     darkened on every wall, the shadow of the eaves.
     Returns the points the roof's slope passes through: roofAt(x, back), the height of the roof over a point. */
  function gable(m, o) {
    const { x0, x1, back0 = 0, d, wall, rise, ov = 4, ridge, up0: U = 0, thick: B = 3, shade = 0 } = o, w = x1 - x0;
    const along = ridge === 'x', half = along ? d / 2 : w / 2, k = rise / half, R = U + wall + rise, E = U + wall - ov * k;
    const cut = span => (b, bw, bh) => {
      for (let u = 0; u < bw; u++) {
        const top = Math.round(bh - (wall + rise * Math.max(0, 1 - Math.abs(u + 0.5 - span / 2) / (span / 2))));
        for (let v = 0; v < Math.min(bh, top); v++) b.set(u, v, 0);
      }
    };
    const then = (f, g) => (b, bw, bh, lit) => { f(b, bw, bh, lit); g(b, bw, bh); eaves(b, shade); };
    const H = wall + rise, flat = f => then(f, () => {});
    if (along) {
      m.front(x0, back0, U, w, wall, flat(o.front));
      m.side(x0, -1, back0, U, d, H, then(o.left, cut(d)));
      m.side(x1, 1, back0, U, d, H, then(o.right, cut(d)));
      const rb = back0 + d / 2, fl = [x0 - ov, E, back0 - ov], fr = [x1 + ov, E, back0 - ov];
      m.quad((b, bw, bh) => o.roof(b, bw, bh, 'front'), [x0 - ov, R, rb], [x1 + ov, R, rb], fr, fl);
      m.quad(o.board, fl, fr, [fr[0], E - B, fr[2]], [fl[0], E - B, fl[2]]);
      m.quad(o.board, [x0 - ov, R, rb], fl, [x0 - ov, E - B, fl[2]], [x0 - ov, R - B, rb]);
      m.quad(o.board, fr, [x1 + ov, R, rb], [x1 + ov, R - B, rb], [x1 + ov, E - B, fr[2]]);
    } else {
      const xm = (x0 + x1) / 2, f = back0 - ov, k2 = back0 + d + ov;
      m.front(x0, back0, U, w, H, then(o.front, cut(w)));
      m.side(x0, -1, back0, U, d, wall, flat(o.left));
      m.side(x1, 1, back0, U, d, wall, flat(o.right));
      m.quad((b, bw, bh) => o.roof(b, bw, bh, 'left'), [xm, R, k2], [xm, R, f], [x0 - ov, E, f], [x0 - ov, E, k2]);
      m.quad((b, bw, bh) => o.roof(b, bw, bh, 'right'), [xm, R, f], [xm, R, k2], [x1 + ov, E, k2], [x1 + ov, E, f]);
      m.quad(o.board, [x0 - ov, E, f], [xm, R, f], [xm, R - B, f], [x0 - ov, E - B, f]);
      m.quad(o.board, [xm, R, f], [x1 + ov, E, f], [x1 + ov, E - B, f], [xm, R - B, f]);
      m.quad(o.board, [x0 - ov, E, k2], [x0 - ov, E, f], [x0 - ov, E - B, f], [x0 - ov, E - B, k2]);
      m.quad(o.board, [x1 + ov, E, f], [x1 + ov, E, k2], [x1 + ov, E - B, k2], [x1 + ov, E - B, f]);
    }
    return { R, E, roofAt: (x, back) => R - k * (along ? Math.abs(back - back0 - d / 2) : Math.abs(x - (x0 + x1) / 2)) };
  }

  // The shadow of the eaves: in each column, the n texels under the top of the picture a step darker, the last row
  // every other texel, so the shadow's edge is soft.
  function eaves(b, n) {
    for (let x = 0; x < b.w; x++) {
      let y = 0; while (y < b.h && !b.get(x, y)) y++;
      for (let j = 0; j < n && y + j < b.h; j++) {
        if (j === n - 1 && (x + y) & 1) continue;
        const i = (y + j) * b.w + x, c = b.d[i];
        b.d[i] = (c & 0xff000000) | (((c >> 16 & 0xff) * 0.7) << 16) | (((c >> 8 & 0xff) * 0.7) << 8) | ((c & 0xff) * 0.7);
      }
    }
  }

  // Where a model point lands on the screen, flat, for a model whose front line stands at (x, y): one texel up or back
  // is one row up or DEEP rows up.
  const flat = (x, y, [px, up, back]) => [x + px, y - back * DEEP - up];

  /* A model as an item of the place at (x, y) (export-world.js, bake.js): its pictures packed into one sheet (the
     item's track), and each face's rect in the sheet and corners in art px (x, up, rows back). draw paints it flat. */
  function item(model, x, y) {
    // shelves of pictures, at least 256 texels wide
    const W = Math.max(256, ...model.faces.map(f => f.b.w)), rects = [];
    let sx = 0, sy = 0, row = 0;
    for (const f of model.faces) {
      if (sx + f.b.w > W) { sx = 0; sy += row + 1; row = 0; }
      rects.push([sx, sy, f.b.w, f.b.h]); sx += f.b.w + 1; row = Math.max(row, f.b.h);
    }
    const sheet = new Buf(W, sy + row);
    model.faces.forEach((f, i) => { const [rx, ry] = rects[i]; for (let j = 0; j < f.b.h; j++) for (let k = 0; k < f.b.w; k++) sheet.d[(ry + j) * W + rx + k] = f.b.d[j * f.b.w + k]; });
    const canvas = sheet.canvas(), pts = model.faces.flatMap(f => f.corners.map(c => flat(x, y, c)));
    const x0 = Math.floor(Math.min(...pts.map(p => p[0]))), y0 = Math.floor(Math.min(...pts.map(p => p[1])));
    const x1 = Math.ceil(Math.max(...pts.map(p => p[0]))), y1 = Math.ceil(Math.max(...pts.map(p => p[1])));
    return {
      box: [x0, y0, x1 - x0, y1 - y0],
      model: { at: [x, y], faces: model.faces.map((f, i) => ({ rect: rects[i], corners: f.corners.map(([cx, up, back]) => [cx, up, +(back * DEEP).toFixed(3)]) })) },
      track: { at: [0, 0], size: [W, sheet.h], frames: [canvas.getContext('2d').getImageData(0, 0, W, sheet.h)], seq: [0] },
      draw: g => draw(g, model, x, y),
    };
  }

  // The model drawn flat as the camera sees it: each face's picture stretched onto where its corners land, farthest
  // first (a texel up is as much nearer the camera as a row back is farther), faces turned away left out.
  function draw(g, model, x, y) {
    const far = f => f.corners.reduce((s, c) => s + c[2] * DEEP - c[1], 0);
    const order = model.faces.map(f => ({ f, far: far(f) })).sort((a, b) => b.far - a.far);
    for (const { f } of order) {
      const [tl, tr, , bl] = f.corners.map(c => flat(x, y, c)), w = f.b.w, h = f.b.h;
      const a = (tr[0] - tl[0]) / w, b = (tr[1] - tl[1]) / w, c = (bl[0] - tl[0]) / h, d = (bl[1] - tl[1]) / h;
      if (a * d - b * c <= 0) continue;
      g.save(); g.transform(a, b, c, d, tl[0], tl[1]); g.drawImage(f.b.canvas(), 0, 0); g.restore();
    }
  }

  window.MODEL = { PITCH, DEEP, make, gable, item, flat, ink };
})();
