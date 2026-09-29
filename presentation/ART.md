# The Shop That Opens Once: pixel art direction

These rules define the project's pixel art. They come from the user's rejection of an earlier presentation, which felt like AI slop, looked blurry and was too dark and muddy.

The art is **authored from scratch in code**, bright and light, crisp, and alive. A pixel artist should respect it.

Build folder: this folder, `presentation/`. See `README.md` for building, previewing and deploying.

Shared core: `px.js` defines `window.PX`. It holds the palette (`PX.PAL`), `canvas`, `sprite` (ASCII to canvas), `outline`, `flip`, `recolor`, `rng`, and the integer primitives `rect`, `dot`, `line`, `ellipse` and `shadow`. It also has the tiny sign font (`text`, `textWidth`) and `Stage` for crisp integer-scaled display. Read it first. Do not edit it; put any extra helpers in your own module.

## Non-negotiable rules

1. **From scratch.** Every pixel is authored in code, either as ASCII sprite grids or as procedural drawing at native resolution.
   - Never load, fetch, trace, embed or sample any image file.
2. **Crisp.** Draw only integer-aligned pixels and rects. The helpers in `px.js` already do this.
   - Canvas `arc`, `stroke` and `bezier` shapes, gradients, blur, `filter`, smoothing and sub-pixel positions are all forbidden.
   - Soft-looking light and shadow must be hard-edged, flat-colour pixel shapes. Use stepped bands for light pools, and `PX.shadow` or flat ellipses for cast shadows.
3. **Bright and light.** The mood is a sunny afternoon in a cozy village: high value, fresh saturation, never neon, never muddy.
   - No dark overlays or multiply washes.
   - Shadows are hue-shifted toward violet or teal, never grey or black.
   - Dusk variants stay light and pastel: peach, rose, lilac sky with warm lamps. They must not become a dark night.
4. **Palette.** Use the ramps in `PX.PAL`. You may add up to about 12 extra colours per module, derived by hue-shifting existing ramps. Each object should use 3–5 colours per material.
5. **Readable form.**
   - Light comes from the top-left: highlights on top and left edges, shade on bottom and right.
   - Use 1px selective outlines in the darkest hue-shifted colour of each material, never pure black. Characters get a full `ink` outline.
   - Texture comes from intentional clusters of 2–6 px. No single-pixel salt-and-pepper noise. Avoid dithering, except sparingly in sky bands.
   - Keep silhouettes clean and shapes chunky, like the existing cast in `chars.js`.
6. **Scale** (in art px):
   - Adult ant: about 32 tall including antennae, about 22 without. Child: about 24.
   - Door: about 26 tall. Cottage front wall: 30–36 tall. Roof depth: 30–44. Trees: 48–100 tall.
   - Cobblestones: 5–9 px. Flowers: 2–4 px clusters. Lantern head: about 6x8.
7. **View.** Angled top-down (3/4), like the village in `world.js`: ground seen from above, walls facing the viewer, roofs seen from above and in front. Characters are side-facing (right, flipped for left).
8. **Alive.**
   - Every scene has gentle, continuous motion: water, foliage sway, smoke, critters, flicker, drifting motes.
   - Stepped sprite animation runs at 6–12 fps. Anything moving across the scene snaps to integer pixels each frame.
   - Motion is deterministic from `view.t` (seconds). No `Math.random` at draw time.
   - With `state.still === true`, render one calm frame with no motion (reduced motion).
9. **Performance.** Cache static layers in offscreen canvases, keyed by variant, and draw only dynamic things per frame. Aim for under 3 ms per frame at native resolution.
10. **Honest craft.** Preview at 1x and at an integer zoom (5–9x), iterate, and keep the console free of errors. Compare new work against the existing previews (`world-preview.html`, `chars-preview.html`) for brightness, richness, charm and character chunkiness.

Quality bar, as the user put it: "the color more bright and light, make the environment looks alive", not blurry, not AI slop.

## Scene contract (world.js, interiors.js, toyshop.js)

```js
const scene = createX(opts);
scene.w, scene.h                 // world size in art px
scene.bg                         // colour for any area outside the world (hex)
scene.anchors = { name: [x, y] } // actor feet positions and points of interest
scene.paths   = { name: [[x,y],...] }    // walkable polylines (the village)
scene.hotspots = { name: [x, y, w, h] }  // clickable rects (the station, the toy shop)
scene.draw(ctx, view, actors)
```

- `ctx` is a native-resolution buffer **already translated** by `(-view.x, -view.y)`, so draw in world coordinates. Skip work that is outside `view` where it is cheap to do so.
- `view` is `{ x, y, w, h, t, state }`. The first four are integers: the visible world rect.
- `actors` is an array of `{ x, y, draw(ctx) }`. `y` is the feet line. Interleave actors with your props by `y`, so a character walks behind a lamp post but in front of the bench back, for example. Draw ground layers first and canopies or roof overhangs last.
- The page owns the camera. Your scene must look complete wherever the camera is inside it.

## Character contract (chars.js, `window.CH`)

- **Frames.** Every frame image is exactly 40x40. Feet contact is at `(20, 37)` and the body faces RIGHT.
- **Calls:**
  - `CH.draw(ctx, id, pose, frame, x, y, dir = 1, opts)` draws with the feet at `(x, y)`. `dir = -1` mirrors it. It draws a small ground shadow unless `opts.shadow === false`.
  - `CH.frames(id, pose)` returns the number of frames. `CH.fps(pose)` returns the suggested playback rate.
  - `CH.hand(id, pose, frame)` returns `[dx, dy]`, the offset from the feet to a held item's centre (facing right).
  - `CH.portrait(id, frame = 0, mood = 'neutral')` returns a 48x48 transparent bust canvas.
- **Sitting.** For the `sit` pose, the feet anchor is the point on the seat surface where the character sits. Legs dangle below it.

## Items contract (in interiors.js, `window.IT`)

- `IT.item(name, size = 'xs' | 'sm' | 'lg', variant)` returns a transparent canvas: about 7-10 px for `xs` (held in a hand), 12-16 px for `sm` and 40-48 px for `lg`.
- Items: `watch` (`front` with hands at 18:17, `back` engraved `A.T.`, `side`), `doll` (`foot`: turned over, an `N` stitched on its sole), `camera`, `key`, `shoes`, `book`, `letter`, `musicbox` (`closed`, `open`), `parcel`, `suitcase`.
- `IT.icon(name)` returns a 16x16 UI icon: `bag`, `look`, `talk`, `hand`, `lantern`, `clock`, `heart`, `note`, `sound-on`, `sound-off`.

## The world: Bellwood

Bellwood is a small, lush village of ants: cottages with timber frames, terracotta and slate roofs, a stream with a wooden bridge and rope rails, a small waterfall, stone walls with moss, cobble paths on warm sand, flowers everywhere, lanterns on posts, banners, a market stall with a striped awning, barrels, crates, chickens and a cat.

At the top of the lane, Marlow's shop appears for seven nights. It has a teal roof, a green striped awning, and seven small lanterns across its front.

Behind the scissors sign on the square is Nora's toy shop (`toyshop.js`, Night 2): a timber-framed room with a powder-blue wainscot, a cabinet of plush rabbits, bolts of fabric and her workbench.
