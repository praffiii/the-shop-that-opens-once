'use strict';
/* The Shop That Opens Once — scroll presentation.
   Every picture is a PX.Stage drawing a scene at native resolution and blitting it at an
   integer scale. Stages only animate while visible; scroll position drives the story beats. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (a, b, v) => clamp((v - a) / (b - a));
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = RM.matches;
  const DPR = () => window.devicePixelRatio || 1;
  const { PAL } = PX;
  const snd = typeof Sound === 'function' ? new Sound() : null;
  const sfx = (n, o) => { if (snd && snd.on) snd.sfx(n, o); };

  /* ---------- crisp DOM sprites ---------- */
  function blit(el, src, cssScale) {
    const S = Math.max(1, Math.round(cssScale * DPR()));
    if (el.width !== src.width * S || el.height !== src.height * S) { el.width = src.width * S; el.height = src.height * S; }
    el.style.width = src.width * cssScale + 'px'; el.style.height = src.height * cssScale + 'px';
    const x = el.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, el.width, el.height); x.drawImage(src, 0, 0, el.width, el.height);
  }
  const litIcon = new Map();
  function dimmed(src) { // crisp desaturated copy (unlit lantern)
    if (litIcon.has(src)) return litIcon.get(src);
    const [c, x] = PX.canvas(src.width, src.height); x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * 0.62 + 40; p[i] = l * 0.95; p[i + 1] = l * 0.93; p[i + 2] = l * 1.08; }
    x.putImageData(d, 0, 0); litIcon.set(src, c); return c;
  }

  /* ---------- paths & actors ---------- */
  function track(pts) {
    let L = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0); segs.push({ x0, y0, x1, y1, l, a: L }); L += l; }
    return { segs, L, pts };
  }
  function along(tr, d) {
    d = clamp(d, 0, tr.L); let s = tr.segs[tr.segs.length - 1];
    for (const q of tr.segs) if (d <= q.a + q.l) { s = q; break; }
    const k = s.l ? (d - s.a) / s.l : 0;
    return { x: lerp(s.x0, s.x1, k), y: lerp(s.y0, s.y1, k), dir: s.x1 > s.x0 + 0.5 ? 1 : s.x1 < s.x0 - 0.5 ? -1 : 0 };
  }
  const distTo = (tr, pt) => { let best = 0, bd = 1e9; for (let d = 0; d <= tr.L; d += 2) { const p = along(tr, d), e = Math.hypot(p.x - pt[0], p.y - pt[1]); if (e < bd) { bd = e; best = d; } } return best; };
  const frameOf = (id, pose, t, off = 0) => Math.floor(t * CH.fps(pose) + off) % CH.frames(id, pose);
  const stride = (id, pose) => (CH.stride ? CH.stride(id, pose) : 3);            // px travelled per walk frame
  const stepFrame = (id, pose, d) => Math.floor(d / stride(id, pose)) % CH.frames(id, pose); // feet never skate
  const held = name => { try { return IT.item(name, 'xs'); } catch (e) { return IT.item(name, 'sm'); } };
  const holding = (id, pose, frame, x, y, dir, item) => {
    const [hx, hy] = CH.hand(id, pose, frame); const im = held(item);
    return c => { CH.draw(c, id, pose, frame, Math.round(x), Math.round(y), dir); c.drawImage(im, Math.round(x + hx * dir - im.width / 2), Math.round(y + hy - im.height / 2)); };
  };
  const actor = (id, pose, frame, x, y, dir = 1, item) => ({ x, y: Math.round(y), draw: item ? holding(id, pose, frame, x, y, dir, item) : c => CH.draw(c, id, pose, frame, Math.round(x), Math.round(y), dir) });
  // A villager pacing a path back and forth at `speed` art px per second.
  function pacer(id, pts, speed, off = 0) {
    const tr = track(pts);
    return t => {
      const cyc = (t * speed + off * tr.L) % (tr.L * 2), fwd = cyc < tr.L, d = fwd ? cyc : tr.L * 2 - cyc, p = along(tr, d);
      const dir = (p.dir || 1) * (fwd ? 1 : -1);
      return actor(id, 'walk', stepFrame(id, 'walk', d), p.x, p.y, dir);
    };
  }
  // Tiny pixel speech bubble drawn in the world.
  function bubble(c, x, y, str) {
    const w = PX.textWidth(str) + 6, h = 9; x = Math.round(x - w / 2); y = Math.round(y - h);
    PX.rect(c, x - 1, y - 1, w + 2, h + 2, PAL.ink); PX.rect(c, x, y, w, h, PAL.cream0);
    PX.rect(c, x + w / 2 - 1, y + h + 1, 3, 1, PAL.ink); PX.rect(c, x + w / 2, y + h, 1, 1, PAL.cream0); PX.rect(c, x + w / 2, y + h + 2, 1, 1, PAL.ink);
    PX.text(c, str, x + 3, y + 2, PAL.ink);
  }

  /* ---------- stage registry: animate only what is on screen ---------- */
  const blocks = [];
  let clock = 0, last = 0, raf = 0;
  // Size a framed box so its canvas is an exact integer multiple of w×h device pixels (no letterbox, no crop).
  function snapBox(box, w, h, border = 3) {
    const d = DPR(), avail = box.parentElement.clientWidth - border * 2, S = Math.max(1, Math.floor((avail * d) / w));
    box.style.width = (w * S) / d + border * 2 + 'px'; box.style.height = (h * S) / d + border * 2 + 'px';
    return S;
  }
  function addStage(el, scene, frame, opts = {}) {
    const b = { el, scene, frame, stage: new PX.Stage(el, opts), visible: false, after: opts.after };
    blocks.push(b); io.observe(el); ro.observe(el); return b;
  }
  const io = new IntersectionObserver(es => { es.forEach(e => { const b = blocks.find(k => k.el === e.target); if (b) b.visible = e.isIntersecting; }); kick(); }, { rootMargin: '120px 0px' });
  const ro = new ResizeObserver(es => { es.forEach(e => { const b = blocks.find(k => k.el === e.target); if (b) { b.stage.resize(); draw(b); } }); });
  function draw(b) {
    const f = b.frame(reduced ? 3 : clock);
    const view = b.stage.render(b.scene, f.cam, reduced ? 3 : clock, { ...f.state, still: reduced }, f.actors || [], f.overlay);
    if (b.after) b.after(view, b.stage, f);
  }
  function tick(now) {
    raf = 0; const dt = clamp((now - last) / 1000 || 0, 0, 0.1); last = now; // rAF stamps can precede the kick() time
    if (!document.hidden) clock += dt;
    let any = false;
    for (const b of blocks) if (b.visible) { draw(b); any = true; }
    extraTick();
    if (any && !reduced && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  const redrawAll = () => { for (const b of blocks) if (b.visible) draw(b); extraTick(); };

  /* ---------- scroll progress of pinned sections ---------- */
  const secProg = el => { const r = el.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp(-r.top / span) : 0; };
  let scrollTick = 0;
  addEventListener('scroll', () => { if (!scrollTick) scrollTick = requestAnimationFrame(() => { scrollTick = 0; onScroll(); if (reduced) redrawAll(); else kick(); }); }, { passive: true });

  /* =====================================================================
     1 · Journey: sky → Bellwood → dusk → the shop appears
     ===================================================================== */
  let village, shop, station;
  const journey = $('#top'), logo = $('#journey-logo'), heroCopy = $('#hero-copy'), cue = $('#cue'), beats = $$('.beat');
  let jp = 0; // journey progress
  function setupJourney() {
    const A = village.anchors, arrival = track(village.paths.arrival);
    const dStairs = distTo(arrival, A.stairsBottom);
    const cams = [[0, A.vista], [0.1, A.vista], [0.3, [Math.max(200, A.bridge[0] + 30), A.bridge[1] - 20]], [0.48, A.square], [0.6, [A.square[0], (A.square[1] + A.stairsTop[1]) / 2]], [0.68, [A.shopDoor[0], A.shopDoor[1] - 10]], [1, [A.shopDoor[0], A.shopDoor[1] - 10]]];
    const camAt = p => { for (let i = 1; i < cams.length; i++) if (p <= cams[i][0]) { const [p0, a] = cams[i - 1], [p1, b] = cams[i], k = ease(prog(p0, p1, p)); return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k) }; } const e = cams[cams.length - 1][1]; return { x: e[0], y: e[1] }; };
    const walkers = [pacer('baker', village.paths.plaza, 11, 0), pacer('kid', village.paths.bakery, 16, 0.4), pacer('gardener', village.paths.cottage, 8, 0.7)];
    const b = addStage($('#journey-stage'), village, t => {
      const p = reduced ? 0.86 : jp;
      const d = p < 0.14 ? 0 : p < 0.6 ? dStairs * ease(prog(0.14, 0.6, p)) : p < 0.9 ? dStairs : lerp(dStairs, arrival.L, ease(prog(0.9, 0.99, p)));
      const pos = along(arrival, d), moving = (p > 0.14 && p < 0.6) || (p > 0.9 && p < 0.99);
      const courier = actor('courier', moving ? 'carryWalk' : 'carry', moving ? stepFrame('courier', 'carryWalk', d) : frameOf('courier', 'carry', t), pos.x, pos.y, pos.dir || 1);
      const lanterns = [...Array(7)].map((_, i) => prog(0.83 + i * 0.018, 0.85 + i * 0.018, p));
      return {
        cam: reduced ? { x: A.vista[0], y: A.vista[1] } : camAt(p), // still frame: dusk sky, title, the shop's roof
        state: { tod: prog(0.55, 0.74, p), windows: prog(0.6, 0.76, p), shop: prog(0.68, 0.82, p), lanterns },
        actors: [...walkers.map(w => w(t)), ...(p > 0.12 || reduced ? [courier] : [])],
      };
    }, { after: placeLogo, area: 360 * 215 });
    return b;
  }
  const title = () => TITLE.render(18 * 60 + 17);
  function placeLogo(view, stage) {
    const t = title(), dw = stage.el.width, S = Math.max(1, Math.min(stage.S, Math.floor((dw * 0.94) / t.width)));
    if (logo.width !== t.width * S) { logo.width = t.width * S; logo.height = t.height * S; const x = logo.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, logo.width, logo.height); }
    const d = stage.dpr, cssW = logo.width / d, cssH = logo.height / d;
    logo.style.width = cssW + 'px'; logo.style.height = cssH + 'px';
    const vista = village.anchors.vista, ly = vista[1] - 44, sx = ((vista[0] - view.x) * stage.S) / d - cssW / 2, sy = ((ly - view.y) * stage.S) / d - cssH / 2;
    const sy0 = (ly * stage.S) / d - cssH / 2, top = sy + Math.max(0, 76 - sy0); // painted on the sky: scrolls away with it
    logo.style.transform = `translate(${Math.round(sx * d) / d}px, ${Math.round(top * d) / d}px)`;
    if (!reduced) heroCopy.style.top = top + cssH + 14 + 'px';
  }
  function onScroll() {
    jp = reduced ? 0.86 : secProg(journey);
    heroCopy.style.opacity = reduced ? 1 : 1 - prog(0.03, 0.1, jp);
    cue.style.opacity = jp > 0.015 ? 0 : 1;
    beats.forEach(b => b.classList.toggle('on', reduced || (jp >= +b.dataset.from && jp < +b.dataset.to)));
    if (!reduced && jp > 0.8 && !onScroll.bell) { onScroll.bell = true; sfx('bell'); }
    if (jp < 0.6) onScroll.bell = false;
    $('#topbar').classList.toggle('solid', scrollY > innerHeight * 0.3); // over busy art once the title screen is left behind
    nightsScroll();
    navCurrent();
  }

  /* =====================================================================
     2 · The shop, annotated
     ===================================================================== */
  function setupShop() {
    const A = shop.anchors, labels = $('#shop-labels'), MY = A.marlow[1] - 7; // stand a little taller behind the counter
    const pins = [[A.slot0[0] + 12, A.slot0[1] - 10], [A.lantern6[0] + 10, A.lantern6[1] + 2], [A.clock[0] + 16, A.clock[1] - 12], [A.marlow[0] + 10, MY - 30]];
    const els = pins.map((_, i) => { const el = document.createElement('span'); el.className = 'marker notch'; el.textContent = i + 1; labels.appendChild(el); return el; });
    addStage($('#shop-screen canvas'), shop, t => ({
      cam: { x: shop.w / 2, y: shop.h / 2 },
      state: { lanterns: [1, 1, 1, 1, 1, 1, 1], clockMin: 1097, keepsakes: [1, 1, 1, 1, 1, 1, 1], highlight: 0 },
      actors: [
        actor('marlow', (t % 5) < 1.6 ? 'talk' : 'idle', frameOf('marlow', (t % 5) < 1.6 ? 'talk' : 'idle', t), A.marlow[0], MY, -1),
        actor('courier', 'idle', frameOf('courier', 'idle', t, 1), A.customer[0], A.customer[1], 1),
      ],
    }), { area: shop.w * shop.h, after: (view, st) => pins.forEach((p, i) => placePin(els[i], st, view, p[0], p[1])) });
  }
  function placePin(el, st, view, wx, wy) {
    const d = st.dpr, sx = ((wx - view.x) * st.S) / d, sy = ((wy - view.y) * st.S) / d;
    el.style.transform = `translate(${Math.round(sx - el.offsetWidth / 2)}px,${Math.round(sy - el.offsetHeight / 2)}px)`;
  }

  /* =====================================================================
     3 · Pillars (three tiny living vignettes)
     ===================================================================== */
  function setupPillars() {
    const V = village.anchors;
    addStage($('#pillar-0'), village, t => {
      const look = Math.floor(t / 1.6) % 2 ? 1 : -1;
      return { cam: { x: V.square[0], y: V.square[1] - 14 }, state: { tod: 0 },
        actors: [{ x: V.square[0], y: V.square[1] + 10, draw: c => { CH.draw(c, 'courier', 'idle', frameOf('courier', 'idle', t), V.square[0], V.square[1] + 10, look); bubble(c, V.square[0] + 2 * look, V.square[1] - 20, '?'); } }] };
    }, { area: 110 * 60 });
    // A keepsake joined to its owner by a thread of light.
    const thread = { w: 150, h: 84, bg: PAL.sky1, anchors: {}, draw(c, v) {
      const x0 = Math.min(0, v.x), x1 = Math.max(150, v.x + v.w), y1 = Math.max(84, v.y + v.h);
      PX.rect(c, x0, Math.min(0, v.y), x1 - x0, 60, PAL.sky1); PX.rect(c, x0, 50, x1 - x0, y1 - 50, PAL.grass2); PX.rect(c, x0, 50, x1 - x0, 2, PAL.grass1);
      [[18, 14, 22], [96, 8, 30]].forEach(([x, y, w]) => { PX.rect(c, x, y, w, 4, PAL.cloud0); PX.rect(c, x + 3, y - 2, w - 8, 2, PAL.cloud0); PX.rect(c, x + 2, y + 4, w - 3, 1, PAL.cloud2); });
      for (let i = x0 - (x0 % 7); i < x1; i += 7) { const k = ((i / 7) % 3 + 3) % 3; PX.rect(c, i + k, 55 + k * 3, 2, 1, PAL.grass3); if (k === 1) PX.rect(c, i + 4, 60 + k * 4, 1, 1, [PAL.pink, PAL.yellow, PAL.white][((i / 7) % 3 + 3) % 3]); }
      const t = v.t, bob = Math.floor(t * 2) % 2, w = IT.item('watch', 'lg', 'back');
      c.drawImage(w, 14, 8 + bob);
      const n = 16, ax = 14 + w.width, ay = 24, bx = 118, by = 30;
      for (let i = 0; i < n; i++) { const k = i / n, on = (Math.floor(t * 8) - i) % 4 === 0; PX.rect(c, lerp(ax, bx, k), ay + (by - ay) * k - Math.sin(k * Math.PI) * 8, 2, 2, on ? PAL.light1 : PAL.light3); }
      CH.draw(c, 'helen', 'idle', frameOf('helen', 'idle', t), 128, 54, -1);
    } };
    addStage($('#pillar-1'), thread, () => ({ cam: { x: 75, y: 36 }, state: {} }), { area: 150 * 84 });
    const St = station.anchors;
    addStage($('#pillar-2'), station, t => ({ cam: { x: (St.benchCustomer[0] + St.helenSeat[0]) / 2 - 4, y: St.helenSeat[1] + 4 }, state: { tod: 0.7, lamps: 1 },
      actors: [actor('helen', 'sit', frameOf('helen', 'sit', t), St.helenSeat[0], St.helenSeat[1], -1),
        { x: St.benchCustomer[0], y: St.benchCustomer[1], draw: c => { CH.draw(c, 'courier', 'idle', frameOf('courier', 'idle', t, 2), St.benchCustomer[0], St.benchCustomer[1], 1); const h = IT.icon('heart'); if (Math.floor(t * 1.5) % 3 !== 2) c.drawImage(h, Math.round((St.benchCustomer[0] + St.helenSeat[0]) / 2 - 8), Math.round(St.helenSeat[1] - 44 - (Math.floor(t * 3) % 2))); } }] }), { area: 110 * 60 });
  }

  /* =====================================================================
     4 · Core loop comic
     ===================================================================== */
  function setupLoop() {
    const A = shop.anchors, St = station.anchors;
    const panel = n => $(`[data-panel="${n}"] canvas`);
    addStage(panel('receive'), shop, t => {
      const give = t % 4 < 2;
      return { cam: { x: (A.marlow[0] + A.customer[0]) / 2, y: A.marlow[1] - 12 }, state: { lanterns: [1, 1, 1, 1, 1, 1, 1], clockMin: 1097, keepsakes: [0, 1, 1, 1, 1, 1, 1] },
        actors: [actor('marlow', 'give', frameOf('marlow', 'give', t), A.marlow[0], A.marlow[1] - 7, -1, give ? 'watch' : null),
          actor('courier', 'receive', give ? 0 : 1, A.customer[0], A.customer[1], 1, give ? null : 'watch')] };
    }, { area: 150 * 112 });
    const inspect = { w: 120, h: 90, bg: PAL.cream1, anchors: {}, draw(c, v) {
      const x0 = Math.min(0, v.x), y0 = Math.min(0, v.y), x1 = Math.max(120, v.x + v.w), y1 = Math.max(90, v.y + v.h);
      PX.rect(c, x0, y0, x1 - x0, y1 - y0, PAL.cream1);
      for (let y = y0 - (y0 % 8) + 4; y < y1; y += 8) for (let x = x0 - (x0 % 8) + 4 + (((y / 8) | 0) % 2) * 4; x < x1; x += 8) PX.rect(c, x, y, 1, 1, PAL.cream2);
      PX.ellipse(c, 60, 45, 34, 30, PAL.cream0);
      const ph = v.t % 4, variant = ph < 1.7 ? 'front' : ph < 1.8 ? 'side' : ph < 3.7 ? 'back' : 'side';
      const im = IT.item('watch', 'lg', variant), bob = Math.floor(v.t * 2) % 2;
      PX.shadow(c, 60, 72, 16, 3); c.drawImage(im, Math.round(60 - im.width / 2), Math.round(44 - im.height / 2) - bob);
    } };
    addStage(panel('inspect'), inspect, () => ({ cam: { x: 60, y: 45 }, state: {} }), { area: 120 * 90 });
    addStage(panel('listen'), station, t => {
      const who = Math.floor(t / 2.2) % 2;
      return { cam: { x: (St.menderCustomer[0] + St.mender[0]) / 2, y: St.mender[1] - 14 }, state: { tod: 0.6, lamps: 1 },
        actors: [actor('courier', who ? 'idle' : 'talk', frameOf('courier', who ? 'idle' : 'talk', t), St.menderCustomer[0] - 14, St.menderCustomer[1], 1),
          actor('traveller', 'idle', frameOf('traveller', 'idle', t, 2), St.traveller[0], St.traveller[1], -1),
          { x: St.mender[0], y: St.mender[1], draw: c => { CH.draw(c, 'mender', who ? 'talk' : 'idle', frameOf('mender', who ? 'talk' : 'idle', t), St.mender[0], St.mender[1], -1); bubble(c, who ? St.mender[0] : St.menderCustomer[0] - 14, (who ? St.mender[1] : St.menderCustomer[1]) - 36, '...'); } }] };
    }, { area: 150 * 112 });
    addStage(panel('return'), station, t => {
      const ph = t % 7, gx = St.benchCustomer[0], hy = St.helenStand;
      const helen = ph < 2 ? actor('helen', 'sit', frameOf('helen', 'sit', t), St.helenSeat[0], St.helenSeat[1], -1)
        : actor('helen', ph < 4.2 ? 'receive' : 'moved', ph < 3 ? 0 : 1, hy[0], hy[1], -1);
      const court = actor('courier', ph < 3 ? 'give' : 'idle', ph < 3 ? frameOf('courier', 'give', t) : frameOf('courier', 'idle', t), gx - 6, St.benchCustomer[1], 1, ph < 3 ? 'watch' : null);
      const extra = ph >= 3 ? [{ x: hy[0], y: hy[1] + 1, draw: c => { const [hx, hy2] = CH.hand('helen', ph < 4.2 ? 'receive' : 'moved', 1); const im = held('watch'); c.drawImage(im, Math.round(hy[0] - hx - im.width / 2), Math.round(hy[1] + hy2 - im.height / 2)); } }] : [];
      return { cam: { x: (gx + St.helenSeat[0]) / 2 - 6, y: St.helenSeat[1] - 8 }, state: { tod: 0.8, lamps: 1 }, actors: [helen, court, actor('traveller', 'idle', frameOf('traveller', 'idle', t, 2), St.traveller[0], St.traveller[1], -1), ...extra] };
    }, { area: 150 * 112 });
    addStage(panel('end'), shop, t => {
      const ph = t % 6, out = ph > 2 ? 1 : 0;
      return { cam: { x: (A.lantern0[0] + A.clock[0]) / 2 - 2, y: A.clock[1] - 12 }, state: { lanterns: [out ? clamp(1 - (ph - 2) * 2) : 1, 1, 1, 1, 1, 1, 1], clockMin: out ? 1098 : 1097, keepsakes: [0, 1, 1, 1, 1, 1, 1] } };
    }, { area: 196 * 147 });
  }

  /* =====================================================================
     5 · Try Night 1 (playable)
     ===================================================================== */
  const M = {};
  const LINES = {
    face: { note: 'The hands stopped at 18:17. It was never wound again.', who: 'courier', say: 'Stopped at 18:17. Nobody wound it again.' },
    back: { note: 'Engraved on the back: A.T.', who: 'courier', say: 'Two letters on the back: “A.T.”' },
    plaque: { note: 'A plaque by the station door: KEEPER A. TATE.', who: 'courier', say: '“Keeper A. Tate.” Arthur Tate?' },
    timetable: { note: 'The timetable: EVENING, 18:17.', who: 'courier', say: 'The evening train was due at 18:17.' },
    mender: { note: 'The mender: Helen sits on that bench every evening at 18:17. Twenty years now.', who: 'mender', say: 'Helen sits on that bench every evening at 18:17. Twenty years now. Someone promised to meet her.' },
  };
  const OFFERS = {
    traveller: { who: 'traveller', say: 'A.T.? Those are my initials, but that isn\'t my watch. Ask someone who\'s waited here longer.', hint: 'Not quite. The initials match, but the story doesn\'t.' },
    'mender-give': { who: 'mender', say: 'Nothing\'s broken. Somebody let it stop at 18:17 and never wound it again. That\'s a promise, not a repair.', hint: 'Not quite, but that\'s a new clue.' },
    helen: { who: 'helen', say: 'Arthur\'s watch… still at 18:17. I kept waiting for a train that never brought him. I think I can stop waiting now.', hint: 'The watch is home. One lantern goes out.', ok: true },
  };
  function setupTry() {
    const St = station.anchors, y = St.courierStart[1], face = $('#reply-face'), X0 = St.courierStart[0] + 22;
    const spot = { mender: St.menderCustomer[0], plaque: St.plaque[0], timetable: St.timetable[0], traveller: St.travellerCustomer[0], 'mender-give': St.menderCustomer[0], helen: St.benchCustomer[0] };
    const reset = () => { const p = $('#try-pip'); if (p) p.hidden = true; Object.assign(M, { x: X0, from: X0, to: X0, t0: 0, found: new Set(), result: null, rt: 0, say: null }); $('#notes').innerHTML = '<li class="empty">Nothing yet.</li>'; $$('.side .act').forEach(b => { b.disabled = false; b.removeAttribute('aria-pressed'); }); speak('courier', 'Who has been waiting for this?'); $('#reply').classList.remove('ok'); };
    function speak(who, text) { $('#reply-who').textContent = { courier: 'Courier', mender: 'Clock mender', traveller: 'Traveller', helen: 'Helen' }[who]; $('#reply-text').textContent = text; blit(face, CH.portrait(who, 0), 2); }
    function act(k) {
      const walk = x => { M.from = M.x; M.to = x; M.t0 = clock; };
      if (LINES[k]) {
        const L = LINES[k];
        if (!M.found.has(k)) { M.found.add(k); const ul = $('#notes'); if (ul.querySelector('.empty')) ul.innerHTML = ''; const li = document.createElement('li'); li.textContent = L.note; ul.appendChild(li); }
        $(`.side [data-m="${k}"]`).setAttribute('aria-pressed', 'true');
        if (k !== 'face' && k !== 'back') walk(spot[k]);
        M.say = { k, t: clock }; speak(L.who, L.say); sfx(k === 'mender' ? 'pop' : 'page');
      } else if (OFFERS[k]) {
        const O = OFFERS[k]; walk(spot[k]); M.result = k; M.rt = clock + Math.abs(spot[k] - M.x) / 80 + 0.2; M.say = null;
        speak(O.who, O.say); $('#reply-text').insertAdjacentHTML('beforeend', `<span class="tiny-note" style="display:block">${O.hint}</span>`);
        $('#reply').classList.toggle('ok', !!O.ok); sfx(O.ok ? 'right' : 'wrong');
        if (O.ok) $$('.side .act').forEach(b => { b.disabled = true; });
      }
      kick();
    }
    $('.side').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b && !b.disabled) act(b.dataset.m); });
    $('#try-reset').addEventListener('click', () => { reset(); kick(); });
    const cv = $('#try-screen canvas');
    let tb;
    cv.addEventListener('click', e => { const [wx, wy] = tb.stage.toWorld(e.clientX, e.clientY); const hit = Object.entries(station.hotspots).find(([, [x, y2, w, h]]) => wx >= x && wx <= x + w && wy >= y2 && wy <= y2 + h); if (hit && !$$('.side .act')[0].disabled) act(hit[0] === 'helen' ? 'helen' : hit[0]); });
    cv.addEventListener('mousemove', e => { const [wx, wy] = tb.stage.toWorld(e.clientX, e.clientY); cv.style.cursor = Object.values(station.hotspots).some(([x, y2, w, h]) => wx >= x && wx <= x + w && wy >= y2 && wy <= y2 + h) ? 'pointer' : 'default'; });
    reset();
    const box = $('#try-screen'), wideEnough = () => box.parentElement.clientWidth >= 700;
    const layout = () => {
      if (wideEnough()) { snapBox(box, station.w, station.h); box.style.aspectRatio = 'auto'; if (tb) { tb.stage.fit = [station.w, station.h]; tb.stage.resize(); } }
      else { box.style.width = box.style.height = ''; box.style.aspectRatio = '4 / 3'; if (tb) { tb.stage.fit = null; tb.stage.area = 190 * 142; tb.stage.resize(); } }
    };
    layout(); new ResizeObserver(layout).observe(box.parentElement);
    tb = addStage(cv, station, t => {
      const dur = Math.abs(M.to - M.from) / 80, k = reduced || dur === 0 ? 1 : clamp((t - M.t0) / dur);
      M.x = lerp(M.from, M.to, k);
      const moving = k < 1, dir = moving ? Math.sign(M.to - M.from) || 1 : 1, dist = Math.abs(M.x - M.from);
      const ok = M.result === 'helen' && t >= M.rt, since = t - M.rt;
      const cour = moving ? actor('courier', 'walk', stepFrame('courier', 'walk', dist), M.x, y, dir)
        : ok && since < 1 ? actor('courier', 'give', 0, M.x, y, 1, 'watch') : actor('courier', M.say && t - M.say.t < 2.5 ? 'talk' : 'idle', frameOf('courier', M.say && t - M.say.t < 2.5 ? 'talk' : 'idle', t), M.x, y, 1);
      const talking = who => (M.say && M.say.k === who && t - M.say.t < 4) || (M.result && M.result.startsWith(who) && t >= M.rt && t - M.rt < 4 && !ok);
      const helen = ok ? actor('helen', since < 1 ? 'receive' : 'moved', since < 1 ? 0 : frameOf('helen', 'moved', t), St.helenStand[0], St.helenStand[1], -1) : actor('helen', 'sit', frameOf('helen', 'sit', t), St.helenSeat[0], St.helenSeat[1], -1);
      const acts = [cour, helen,
        actor('mender', talking('mender') ? 'talk' : 'idle', frameOf('mender', talking('mender') ? 'talk' : 'idle', t, 1), St.mender[0], St.mender[1], -1),
        actor('traveller', talking('traveller') ? 'talk' : 'idle', frameOf('traveller', talking('traveller') ? 'talk' : 'idle', t, 2), St.traveller[0], St.traveller[1], -1)];
      if (ok && since >= 1) acts.push({ x: St.helenStand[0], y: St.helenStand[1] + 1, draw: c => { const [hx, hy] = CH.hand('helen', 'moved', 1), im = held('watch'); c.drawImage(im, Math.round(St.helenStand[0] - hx - im.width / 2), Math.round(St.helenStand[1] + hy - im.height / 2)); } });
      if (M.result && !ok && t >= M.rt && t - M.rt < 3) { const w = M.result === 'traveller' ? St.traveller : St.mender; acts.push({ x: w[0], y: w[1] + 2, draw: c => bubble(c, w[0], w[1] - 36, '?') }); }
      const focus = M.result ? spot[M.result] : M.say && spot[M.say.k] ? spot[M.say.k] : M.x;
      return { cam: wideEnough() ? { x: station.w / 2, y: station.h / 2 } : { x: lerp(M.x, focus, 0.5) + 20, y: St.helenSeat[1] - 4 }, state: { tod: ok ? lerp(0.6, 1, clamp(since / 3)) : 0.6, lamps: 1 }, actors: acts };
    }, wideEnough() ? { fit: [station.w, station.h] } : { area: 190 * 142 });
    layout();
    // Picture-in-picture: the result, shown in the shop (clock ticks once, the first lantern goes out).
    const pip = $('#try-pip'), SA = shop.anchors;
    addStage($('canvas', pip), shop, t => {
      const since = t - M.rt;
      return { cam: { x: (SA.lantern0[0] + SA.clock[0]) / 2 - 2, y: SA.clock[1] - 12 }, state: { lanterns: [1 - prog(2.6, 3.4, since), 1, 1, 1, 1, 1, 1], clockMin: since > 2 ? 1098 : 1097, keepsakes: [0, 1, 1, 1, 1, 1, 1] } };
    }, { area: 196 * 147 });
    const pipTick = () => { const show = M.result === 'helen' && clock - M.rt > 1.2; if (pip.hidden === show) { pip.hidden = !show; if (show) { sfx('chime'); } } };
    pipHooks.push(pipTick);
  }

  /* =====================================================================
     6 · Seven nights
     ===================================================================== */
  const NIGHTS = [
    { dio: 'station', item: 'watch', title: 'An old wristwatch', who: 'Arthur & Helen', line: 'A promise made for 18:17, twenty years ago.', mvp: true, cast: [['courier', 'give', 1, 'watch'], ['helen', 'receive', -1]] },
    { dio: 'toyshop', item: 'doll', title: 'A rabbit doll with a stitched ear', who: 'Nora, Mia & a grandchild', line: 'A mother and daughter find their way back.', mvp: true, cast: [['nora', 'idle', 1], ['mia', 'idle', -1], ['grandkid', 'receive', -1, 'doll']] },
    { dio: 'darkroom', item: 'camera', title: 'An old film camera', who: 'Theo & his late friend Daniel', line: 'Six last photos of Bellwood, finally printed.', cast: [['theo', 'give', 1, 'camera'], ['courier', 'idle', -1]] },
    { dio: 'archive', item: 'key', title: 'A key with no markings', who: 'Sam & the old archivist\'s room', line: 'A room that remembers everyone the town lost.', cast: [['sam', 'give', 1, 'key'], ['courier', 'idle', -1]] },
    { dio: 'lighthouse', item: 'shoes', title: 'Two shoes, two sizes', who: 'Leo', line: 'After his brother died, Leo stopped running. A child asks him to start again.', cast: [['leo', 'run', 1], ['kid', 'walk', 1]] },
    { dio: 'desk', item: 'book', title: '“The Things We Leave Behind”', who: 'Marlow', line: 'A book that keeps moving from shelf to shelf.', spoil: 'Marlow is Marcus. The book helps him write down that he has accepted the death of his sister, Elise. Then it burns to ash.', cast: [['marlow', 'idle', 1]] },
    { dio: 'home', item: 'letter', item2: 'musicbox', title: 'An unsigned letter & a music box', who: 'The courier', line: 'The last night is for the courier.', spoil: 'The letter is from the courier\'s mother, and it explains why the shop chose them. The shop disappears. In the epilogue, the courier keeps its spirit alive: a small place that listens to the town\'s stories.', cast: [['courier', 'moved', 1], ['mother', 'idle', -1, null, 0.5]] },
  ];
  let spoilers = false, nightIdx = -1;
  function setupNights() {
    const list = $('#nights-list'), bar = $('#lantern-bar');
    bar.innerHTML = [...Array(7)].map((_, i) => `<canvas data-lantern="${i}" aria-hidden="true"></canvas>`).join('') + '<span class="time" id="night-time">18:17</span>';
    NIGHTS.forEach((N, i) => {
      const el = document.createElement('article'); el.className = 'night'; el.dataset.i = i;
      el.innerHTML = `<div class="night-art notch"><canvas aria-hidden="true"></canvas></div><div class="night-copy"><div class="row"><span class="chip notch ${N.mvp ? 'leaf' : 'lilac'}">Night ${i + 1}</span>${N.mvp ? '<span class="chip notch gold">MVP</span>' : '<span class="chip notch">Full game</span>'}</div><h3>${N.title}</h3><span class="who">${N.who}</span><p>${N.line}</p>${N.spoil ? `<div class="spoil notch" hidden>${N.spoil}</div>` : ''}</div>`;
      list.appendChild(el);
      const dio = DIO.create(N.dio), A = dio.anchors, spots = [A.a, A.b, A.c].filter(Boolean);
      addStage($('canvas', el), dio, t => {
        const active = nightIdx === i;
        const actors = N.cast.map(([id, pose, dir, item, alpha], k) => {
          const p = spots[k] || A.a, fr = frameOf(id, pose, t, k);
          if (pose === 'run' || pose === 'walk') { const sway = Math.round(Math.sin(t * 0.8 + k) * 10); return actor(id, pose, fr, p[0] + sway, p[1], Math.cos(t * 0.8 + k) >= 0 ? 1 : -1); }
          const a = actor(id, pose, fr, p[0], p[1], dir, item);
          return alpha ? { x: a.x, y: a.y, draw: c => { c.globalAlpha = alpha; a.draw(c); c.globalAlpha = 1; } } : a;
        });
        const it = IT.item(N.item, 'sm'), it2 = N.item2 && IT.item(N.item2, 'sm'), inHand = N.cast.some(c => c[3] === N.item);
        const overlay = inHand ? null : c => { const bob = active && !reduced && Math.floor(t * 2) % 2 ? 1 : 0; c.drawImage(it, Math.round(A.item[0] - it.width / 2 - (it2 ? 9 : 0)), Math.round(A.item[1] - it.height / 2 - bob)); if (it2) c.drawImage(it2, Math.round(A.item[0] - it2.width / 2 + 9), Math.round(A.item[1] - it2.height / 2)); };
        return { cam: { x: dio.w / 2, y: dio.h / 2 }, state: { glow: active ? 1 : 0.25 }, actors, overlay };
      }, { area: 160 * 96 });
    });
    $('#spoilers').addEventListener('click', e => { spoilers = !spoilers; e.currentTarget.setAttribute('aria-pressed', spoilers); e.currentTarget.textContent = spoilers ? 'Hide ending spoilers' : 'Show ending spoilers (nights 6–7)'; $$('.spoil').forEach(s => { s.hidden = !spoilers; }); });
    drawLanterns(0);
  }
  function drawLanterns(done) {
    const icon = IT.icon('lantern');
    $$('[data-lantern]').forEach((c, i) => blit(c, i < done ? dimmed(icon) : icon, 2));
    $('#night-time').textContent = `18:${17 + done}`;
    $('#lantern-bar').setAttribute('aria-label', `Seven lanterns, ${7 - done} still lit. Clock at 18:${17 + done}.`);
  }
  let lanternsDone = -1;
  function nightsScroll() {
    const cards = $$('.night'); if (!cards.length) return;
    const mid = innerHeight * 0.55; let done = 0, active = -1;
    cards.forEach((c, i) => { const r = c.getBoundingClientRect(); if (r.bottom < mid) done = i + 1; if (r.top < mid && r.bottom > mid - 40) active = i; });
    nightIdx = active;
    if (done !== lanternsDone) { if (lanternsDone >= 0 && done > lanternsDone) sfx('chime'); lanternsDone = done; drawLanterns(done); }
  }

  /* =====================================================================
     7 · Cast
     ===================================================================== */
  const CAST = [
    ['courier', 'The courier', 'You', 'Came home too late to say goodbye.'],
    ['marlow', 'Marlow', 'Shopkeeper', 'Keeps the shop for seven nights, and keeps a secret.'],
    ['helen', 'Helen', 'Night 1', 'Still waits at the station at 18:17.'],
    ['nora', 'Nora', 'Night 2', 'A toymaker who hasn\'t spoken to her daughter in years.'],
    ['mia', 'Mia', 'Night 2', 'Nora\'s daughter, now a mother herself.'],
    ['theo', 'Theo', 'Night 3', 'Holds the last photos of his best friend.'],
    ['sam', 'Sam', 'Night 4', 'A kid who finds a room nobody remembers.'],
    ['leo', 'Leo', 'Night 5', 'Stopped running when his brother died.'],
    ['mother', 'Mother', 'In memories', 'Her absence runs under every night.'],
  ];
  function setupCast() {
    const list = $('#cast-list');
    CAST.forEach(([id, name, role, line]) => {
      const el = document.createElement('div'); el.className = 'person box notch';
      el.innerHTML = `<div class="face notch"><canvas aria-hidden="true"></canvas></div><div><span class="role">${role}</span><h3>${name}</h3><p>${line}</p></div>`;
      list.appendChild(el); blit($('canvas', el), CH.portrait(id, 0, id === 'courier' || id === 'mother' || id === 'marlow' ? 'smile' : 'neutral'), 2);
    });
    const ids = CAST.map(c => c[0]);
    const gap = 40, W = ids.length * gap + 16, H = 60;
    const line = { w: W, h: H, bg: PAL.sky1, anchors: {}, draw(c, v) {
      const x0 = Math.min(0, v.x), x1 = Math.max(W, v.x + v.w), y1 = Math.max(H, v.y + v.h); // paint the whole view, not just the scene
      PX.rect(c, x0, Math.min(0, v.y), x1 - x0, 44 - Math.min(0, v.y), PAL.sky1);
      [[20, 10, 26], [W * 0.55, 6, 34], [W * 0.82, 14, 22], [-60, 16, 30], [W + 30, 8, 28]].forEach(([x, y, w]) => { PX.rect(c, x, y, w, 5, PAL.cloud0); PX.rect(c, x + 4, y - 3, w - 10, 3, PAL.cloud0); PX.rect(c, x + 2, y + 5, w - 2, 1, PAL.cloud2); });
      PX.rect(c, x0, 44, x1 - x0, 12, PAL.grass2); PX.rect(c, x0, 44, x1 - x0, 2, PAL.grass1); PX.rect(c, x0, 56, x1 - x0, y1 - 56, PAL.dirt2); PX.rect(c, x0, 56, x1 - x0, 1, PAL.dirt3);
      for (let x = x0 - (x0 % 11) + 3; x < x1; x += 11) { const k = ((x % 33) + 33) % 33; PX.rect(c, x, 47 + (k % 3), 2, 1, PAL.grass3); if (k % 4 === 1) PX.rect(c, x + 5, 49, 1, 1, [PAL.pink, PAL.yellow, PAL.white][k % 3]); }
      ids.forEach((id, i) => CH.draw(c, id, 'idle', frameOf(id, 'idle', v.t, i * 1.3), 28 + i * gap, 52, i < (ids.length - 1) / 2 ? 1 : -1));
    } };
    const lc = $('#lineup'); lc.style.aspectRatio = `${W} / ${H}`;
    addStage(lc, line, () => ({ cam: { x: W / 2, y: H / 2 }, state: {} }), { fit: [W, H] });
    const sheet = $('#sheet');
    [['idle', 'Idle'], ['walk', 'Walk'], ['carryWalk', 'Carry'], ['give', 'Give'], ['inspect', 'Inspect']].forEach(([pose, label]) => {
      const el = document.createElement('div'); el.className = 'anim box notch'; el.innerHTML = `<canvas aria-hidden="true"></canvas><span>${label}</span>`; sheet.appendChild(el);
      const cv = $('canvas', el), [buf, bx] = PX.canvas(40, 40);
      anims.push(() => { bx.clearRect(0, 0, 40, 40); CH.draw(bx, 'courier', pose, frameOf('courier', pose, clock), 20, 37, 1); blit(cv, buf, 3); });
    });
  }
  const anims = [];
  let sheetVisible = false;
  const pipHooks = [];
  function extraTick() { if (sheetVisible || reduced) anims.forEach(f => f()); pipHooks.forEach(f => f()); }

  /* =====================================================================
     8 · UI demo, 9 · finale
     ===================================================================== */
  function setupUI() {
    const V = village.anchors, walkers = [pacer('baker', village.paths.plaza, 11, 0.3), pacer('kid', village.paths.stall, 14, 0.1)];
    const cx = V.square[0] - 22, cy = V.square[1] + 8;
    addStage($('#ui-screen canvas'), village, t => ({ cam: { x: cx + 26, y: cy - 22 }, state: { tod: 0.15 },
      actors: [actor('courier', 'idle', frameOf('courier', 'idle', t), cx, cy, 1), actor('nora', t % 4 < 2 ? 'talk' : 'idle', frameOf('nora', t % 4 < 2 ? 'talk' : 'idle', t), cx + 32, cy, -1), ...walkers.map(w => w(t))] }), { area: 250 * 141 });
  }
  function setupLook() {
    const V = village.anchors, walkers = [pacer('baker', village.paths.plaza, 11, 0.2), pacer('kid', village.paths.tailor, 15, 0.6)];
    $$('[data-tod]').forEach(el => {
      const tod = +el.dataset.tod;
      const st = [{ tod: 0, shop: 0, windows: 0 }, { tod: 1, shop: 1, windows: 0.6, lanterns: [1, 1, 1, 1, 1, 1, 1] }, { tod: 2, shop: 1, windows: 1, lanterns: [0, 1, 1, 1, 1, 1, 1] }][tod];
      addStage($('canvas', el), village, t => ({ cam: { x: V.shopDoor[0], y: V.shopDoor[1] - 26 }, state: st, actors: walkers.map(w => w(t + tod * 3.1)) }), { area: 172 * 129 });
    });
    const rows = [['Grass', 'grass0 grass1 grass2 grass3 grass4'], ['Paths', 'dirt0 dirt1 dirt2 dirt3 dirt4'], ['Water', 'water1 water2 water3 water4 water5'], ['Roofs', 'roofR1 roofR2 roofB1 roofB2 roofG2'], ['Wood', 'wood0 wood1 wood2 wood3 wood4'], ['Lanterns', 'light0 light1 light2 light3 light4'], ['Ants', 'ant0 ant1 ant2 ant3 ant4'], ['Dusk sky', 'dusk0 dusk1 dusk2 dusk3 dusk4']];
    $('#swatches').innerHTML = rows.map(([n, ks]) => `<div class="swatch-row"><b>${n}</b><span role="img" aria-label="${n} colours">${ks.split(' ').map(k => `<i style="background:${PAL[k]}"></i>`).join('')}</span></div>`).join('');
    $('#sound-2').addEventListener('click', () => $('#sound').click());
  }
  function setupFinale() {
    const V = village.anchors;
    addStage($('#end-stage'), village, t => ({ cam: { x: V.shopDoor[0], y: V.shopDoor[1] + 12 }, state: { tod: 1.45, windows: 1, shop: 0, lanterns: [0, 0, 0, 0, 0, 0, 0] },
      actors: [actor('courier', 'idle', frameOf('courier', 'idle', t), V.stairsTop[0], V.stairsTop[1] - 2, 1)] }),
    { after: (view, st) => { const t = TITLE.render(18 * 60 + 24), cs = Math.max(1, Math.min(4, Math.floor((st.el.clientWidth * 0.8) / t.width))); blit($('#end-logo'), t, cs); } });
  }

  /* ---------- decorations, icons, nav, sound ---------- */
  function decorate() {
    $$('canvas[data-icon]').forEach(c => blit(c, IT.icon(c.dataset.icon), 2));
    $$('canvas[data-item]').forEach(c => blit(c, IT.item(c.dataset.item, 'sm'), 2));
    $$('canvas[data-item-lg]').forEach(c => blit(c, IT.item(c.dataset.itemLg, 'lg'), 2));
    $$('canvas[data-portrait]').forEach(c => blit(c, CH.portrait(c.dataset.portrait, 0), 2));
    const cue = $('#cue canvas'), [a, ax] = PX.canvas(7, 7); PX.rect(ax, 2, 0, 3, 3, PAL.ink); PX.rect(ax, 0, 3, 7, 1, PAL.ink); PX.rect(ax, 1, 4, 5, 1, PAL.ink); PX.rect(ax, 2, 5, 3, 1, PAL.ink); PX.rect(ax, 3, 6, 1, 1, PAL.ink); blit(cue, a, 4);
    const edge = { cream: '#fdf0d8', sky: '#e8f6ff', leaf: '#f1fae3', dusk: '#fdeee6' };
    $$('.edge').forEach(e => { const col = edge[e.dataset.edge], [c, x] = PX.canvas(16, 8); x.fillStyle = col; x.fillRect(0, 5, 16, 3); x.fillRect(2, 3, 12, 2); x.fillRect(4, 2, 8, 1); x.fillRect(5, 1, 6, 1); e.style.backgroundImage = `url(${c.toDataURL()})`; e.style.backgroundSize = '32px 16px'; });
    $('#meters').innerHTML = [['Narrative design', 5], ['No-quest-marker design', 5], ['Deduction and clues', 4], ['NPC schedules', 4], ['Pixel art and animation', 4], ['Testing', 4], ['Dialogue, bag, inspect', 3], ['Walking around', 2]].map(([n, v]) => `<div class="meter"><span>${n}</span><span class="pips" role="img" aria-label="${v} out of 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span></div>`).join('');
    const sb = $('#sound'), sc = $('canvas', sb), paint = () => { blit(sc, IT.icon(snd && snd.on ? 'sound-on' : 'sound-off'), 2); sb.setAttribute('aria-pressed', !!(snd && snd.on)); sb.setAttribute('aria-label', snd && snd.on ? 'Sound on' : 'Sound off'); const s2 = $('#sound-2'); if (s2) s2.textContent = snd && snd.on ? 'Turn off the sound' : 'Turn on the sound'; };
    paint();
    sb.addEventListener('click', () => { if (!snd) return; if (snd.on) { snd.disable(); paint(); } else snd.enable().then(() => { snd.setScene('dusk'); paint(); }).catch(paint); });
    if (!snd) sb.hidden = true;
  }
  const MOODS = { top: 'dusk', shop: 'shop', pillars: 'shop', loop: 'memory', try: 'memory', nights: 'memory', cast: 'dusk', look: 'dusk', ui: 'dusk', build: 'plan', end: 'resolved' };
  let mood = '';
  function navCurrent() {
    const ids = ['shop', 'loop', 'nights', 'cast', 'look', 'build']; let cur = null, sec = 'top';
    ids.forEach(id => { const r = document.getElementById(id).getBoundingClientRect(); if (r.top < innerHeight * 0.4) cur = id; });
    Object.keys(MOODS).forEach(id => { const r = document.getElementById(id).getBoundingClientRect(); if (r.top < innerHeight * 0.5) sec = id; });
    $$('.topbar nav a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + cur));
    if (snd && MOODS[sec] !== mood) { mood = MOODS[sec]; snd.setScene(mood); }
  }

  /* ---------- boot ---------- */
  async function boot() {
    if (reduced) document.documentElement.classList.add('reduced');
    try { await document.fonts.ready; } catch (e) { /* fonts optional */ }
    village = WORLD.createVillage(); shop = INTERIORS.createShop(); station = INTERIORS.createStation();
    decorate();
    setupJourney(); setupShop(); setupPillars(); setupLoop(); setupTry(); setupNights(); setupCast(); setupLook(); setupUI(); setupFinale();
    new IntersectionObserver(es => { sheetVisible = es.some(e => e.isIntersecting); kick(); }).observe($('#sheet'));
    onScroll(); redrawAll(); kick();
    RM.addEventListener('change', () => { reduced = RM.matches; document.documentElement.classList.toggle('reduced', reduced); onScroll(); redrawAll(); kick(); });
    addEventListener('resize', () => { onScroll(); });
  }
  boot().catch(err => { console.error(err); });
})();
