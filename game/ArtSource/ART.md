# The Shop That Opens Once: pixel art direction

These rules define the project's pixel art. They come from the user's rejection of an earlier presentation, which felt like AI slop, looked blurry and was too dark and muddy.

The art is **authored from scratch in code**, bright and light, crisp, and alive. A pixel artist should respect it.

Source folder: this folder, `game/ArtSource/`. See `README.md` for exporting into the game.

Shared core: `px.js` defines `window.PX`. It holds the palette (`PX.PAL`), `canvas`, `sprite` (ASCII to canvas), `outline`, `flip`, `recolor`, `rng`, and the integer primitives `rect`, `dot`, `line`, `ellipse` and `shadow`. It also has the tiny sign font (`text`, `textWidth`) and `Stage` for crisp integer-scaled display. Read it first. Do not edit it; put any extra helpers in your own module.

## Non-negotiable rules

1. **From scratch.** Every pixel is authored in code, either as ASCII sprite grids or as procedural drawing at native resolution.
   - Never load, fetch, trace, embed or sample any image file.
2. **Crisp.** Draw only integer-aligned pixels and rects. The helpers in `px.js` already do this.
   - Canvas `arc`, `stroke` and `bezier` shapes, gradients, blur, `filter`, smoothing and sub-pixel positions are all forbidden.
   - Soft-looking light and shadow must be hard-edged, flat-colour pixel shapes. Use stepped bands for light pools, and `PX.shadow` or flat ellipses for cast shadows.
3. **Bright, bold and readable**, like a top-down RPG village pack (references, studied for technique only: zedpxl's
   village and forest packs, Kenmi's Cute Fantasy, Maeve's farm RPG, LimeZu's Modern Farm and Exteriors, anokolisa's
   pack). Saturated but not neon, with deep darks where depth needs them. No global grade or muting at export.
   - Shadows are hard, one step darker than what they fall on (`VIL.shade`), hue-shifted, never grey or black.
   - The dusk and night grades (in the game's shader) stay light and pastel; lamps glow warm.
4. **Palette.** `VIL.C` (ground: grass, path, water, rock, earth) and `PX.PAL` (wood, roofs, walls, stone, iron,
   brass, flowers, light), plus `VIL.LEAF` for foliage. Up to about 12 extra colours per module, derived from these.
   Each material uses a 3–5 step ramp.
5. **Readable form** (what the packs do):
   - Light from the top-left: lit top and left edges, darker bottom and right.
   - Everything that stands up gets a 1 px dark `ink` outline around its silhouette (`VIL.inked`), the same as the
     ants, so characters and world belong together. Inner detail lines use the material's darkest step.
   - Big areas are **flat colour**. Texture is a few deliberate marks: a sprig, a pebble cluster, a crack, a plank
     seam. Never noise, speckle or dithering spread evenly over a surface.
   - Foliage is **leaf clumps** (`VIL.foliage`): rounded clumps with a lit cap and a dark hem, in offset rows, upper
     clumps over lower ones, lighter to the upper left of the crown.
   - Height reads through **thickness**: cliff faces, kerbs, steps, footings, roof eaves, plank edges, each with a
     lit top edge and a dark bottom edge, and a contact shadow where it meets the ground.
   - Buildings are rich: trim, beams, frames, sills, flower boxes, signs, lamps, clutter that says who lives there.
6. **Scale** (in art px):
   - Adult ant: about 32 tall including antennae. Child: about 24.
   - Door: 34–40 tall, 20–26 wide (taller than an ant). Home: front wall 44–56, roof 48–64 deep, 110–160 wide.
     Landmarks up to about 260 wide and 220 tall.
   - Trees 60–120 tall, in several species. Fence 16–18 tall. Lamp post about 40. Tiles: a 16 px ground grid.
7. **View.** Angled top-down (3/4): ground seen from above, walls facing the viewer, roofs seen from above and in
   front (a big roof over a short wall, as in Harvest Moon and zedpxl's village). Characters are side-facing (right,
   flipped for left); the courier also faces the camera and turns away from it (`pose_front`, `pose_back`).
8. **Alive.**
   - Every scene has gentle, continuous motion: water, foliage sway, smoke, critters, flicker, drifting motes.
   - Stepped sprite animation runs at 6–12 fps. Anything moving across the scene snaps to integer pixels each frame.
   - Motion is deterministic from `view.t` (seconds). No `Math.random` at draw time.
   - With `state.still === true`, render one calm frame with no motion (reduced motion).
9. **Performance.** Cache static layers in offscreen canvases, keyed by variant, and draw only dynamic things per frame. Aim for under 3 ms per frame at native resolution.
10. **Honest craft.** Preview at 1x and at an integer zoom (5–9x), iterate, and keep the console free of errors. Compare new work against the frozen presentation's previews (`presentation/world-preview.html`, `presentation/chars-preview.html`) for brightness, richness, charm and character chunkiness.

Quality bar, as the user put it: "the color more bright and light, make the environment looks alive", not blurry, not AI slop.

## Scene contract (interiors.js, toyshop.js)

```js
const scene = createX(opts);
scene.w, scene.h                 // world size in art px
scene.bg                         // colour for any area outside the world (hex)
scene.anchors = { name: [x, y] } // actor feet positions and points of interest
scene.paths   = { name: [[x,y],...] }    // walkable polylines (the outdoor world)
scene.hotspots = { name: [x, y, w, h] }  // clickable rects (the station, the toy shop)
scene.draw(ctx, view, actors)
```

- `ctx` is a native-resolution buffer **already translated** by `(-view.x, -view.y)`, so draw in world coordinates. Skip work that is outside `view` where it is cheap to do so.
- `view` is `{ x, y, w, h, t, state }`. The first four are integers: the visible world rect.
- `actors` is an array of `{ x, y, draw(ctx) }`. `y` is the feet line. Interleave actors with your props by `y`, so a character walks behind a lamp post but in front of the bench back, for example. Draw ground layers first and canopies or roof overhangs last.
- The page owns the camera. Your scene must look complete wherever the camera is inside it.
- **Exporter opt-in.** A scene the game depth-sorts also gives `scene.bake = { items: [{ name, x, y, box, animated, light, day, foot, base }], ...terrain tests }` and honours `view.state.part`: `'below'` draws only the ground, `'item'` only the entry `view.state.item`, `'above'` only the air over everyone. `light` entries show at dusk and night only and are never graded; `day` entries (butterflies) show in the morning and at midday only.
- **Time of day.** Draw at midday. The game grades the finished picture per phase with `KIT.GRADES`: `out = in * mul + add + shade * (1 - luma)` on sRGB 0-255. Lights are drawn as separate entries over the graded picture.

## Character contract (chars.js, `window.CH`)

- **Frames.** Every frame image is exactly 40x40. Feet contact is at `(20, 37)` and the body faces RIGHT.
- **Calls:**
  - `CH.draw(ctx, id, pose, frame, x, y, dir = 1, opts)` draws with the feet at `(x, y)`. `dir = -1` mirrors it. It draws a small ground shadow unless `opts.shadow === false`.
  - `CH.frames(id, pose)` returns the number of frames. `CH.fps(pose)` returns the suggested playback rate.
  - `CH.hand(id, pose, frame)` returns `[dx, dy]`, the offset from the feet to a held item's centre (facing right).
  - `CH.portrait(id, frame = 0, mood = 'neutral')` returns a 48x48 transparent bust canvas.
- **Turning.** The courier's `idle`, `walk`, `run`, `carry` and `carryWalk` also come as `<pose>_front` (facing the camera) and `<pose>_back` (turned away), drawn round x 20 with the same frames and timing. The game never mirrors them.
- **Sitting.** For the `sit` pose, the feet anchor is the point on the seat surface where the character sits. Legs dangle below it.

## Items contract (in interiors.js, `window.IT`)

- `IT.item(name, size = 'xs' | 'sm' | 'lg', variant)` returns a transparent canvas: about 7-10 px for `xs` (held in a hand), 12-16 px for `sm` and 40-48 px for `lg`.
- Items: `watch` (`front` with hands at 18:17, `back` engraved `A.T.`, `side`), `doll` (`foot`: turned over, an `N` stitched on its sole), `camera`, `key`, `shoes`, `book`, `letter`, `musicbox` (`closed`, `open`), `parcel`, `suitcase`.
- `IT.icon(name)` returns a 16x16 UI icon: `bag`, `look`, `talk`, `hand`, `lantern`, `clock`, `heart`, `note`, `sound-on`, `sound-off`.

## The world: Bellwood

Bellwood is five small outdoor areas, one per part of town, joined by exits at their edges with a short fade between
them, as top-down RPGs build a town (decision of 2026-10-18; the one seamless map is retired). Each is about 15 s to
walk across. The Station (the old station frozen at 10:17, Helen's tea stall on the platform, the train, the forge and
Bram's carriage) leads west into the Grove (a narrow path between ancient trees to Marlow's shop, grown into one of
them) and east to the Square (the hall, the bakery and three homes shoulder to shoulder on a terrace, stairs down to the
paved plaza with the fountain and Mia's stalls, the post office and the homes along the streets below). The Square leads east to the East (a bridge over the river, the stilt houses with Nora's, the chamomile
fields, Satria's home and Leo's lookout on the hill) and down the bluff stairs to the Coast (Theo's studio, the beach,
the salt store, Arlo's home, the jetty and the lighthouse). Forest fills each area's edges as a solid mass with paths
cut through it; grey rock cliffs step the land between levels. Only ants live here, and the only animals are bugs.

The camera stays inside an area, but in perspective it sees past the edges, most at the top corners. So `areas.js`
builds each area on a wider canvas (256 px more left and right, 320 above, 64 below), where the forest goes on and
the roads and rails that leave run on out of sight; only the area itself is walked. Past the area's edges the forest
is solid and close up to the way out, its floor in the shade of its crowns, so the land never just ends; ancient trees
stand either side of each road where it leaves (none on the camera's side), and toward the camera the edge is a dense,
low hedge. `place.json` keeps the area's own
coordinates and gives the canvas's corner as `origin`. At each exit a waymark (`VIL.waysign`) points the way with the
name of the next area, its lantern lit after dark.

The game draws them in an HD-2D 3D view: the ground follows each area's height map, so cliffs stand up; trees, props
and characters are upright cards; and buildings are being rebuilt as 3D models (`model.js`: walls, roof slopes,
gables, eave boards and chimneys, each face a picture drawn in code): the forge, Marlow's shop and the square's houses.
The Centre's houses come from one kit, `house()` in `village-centre.js`: a stone plinth with steps up to the door,
walls set back under a deep-eaved gable roof (`MODEL.gable`'s `up0`, `thick` and `shade`, the eaves' shadow on the
walls), windows with flower boxes, a lantern by the door that is a lit face (so it glows and lights the ground at
night), a chimney, and optionally a gabled bay over the door, a sign hung out on an arm and a striped awning. A model
maker returns `{ model, base, depth, door, cards, smoke }`: cards are sprites that stand in or hang on it
(`[x, back, up]` in texels), and `areas.js` places it with `placeModel`. The camera looks down 35 degrees, a texel
back is `MODEL.DEEP` rows up, and the scene has a strong tilt-shift blur and bloom. The camera stands back to show
about 640x360 art px, so one art px is 3 screen px at 1080p: draw detail that still reads at that size.

The ground is a tile map painted by `VIL.ground` (`village.js`); buildings, trees and props are `VIL` sprites (the
zone kits `village-west.js`, `village-centre.js`, `village-south.js`, `village-east.js`, `village-grove.js` and `village-nature.js`), and
`areas.js` lays them out. A sprite maker returns `{ img, ax, ay }` (the feet point in img px) and, where it applies,
`base` and `foot` (its footprint), `door`, `lit` (window glass rects that glow at night), `smoke` (chimney tops),
`shadow` and `frames`/`fps`. Window glass is drawn in `sky2`, `sky3` or `white` so it can be relit.

Forest trees are decals under everything, and the ground under their crowns is solid, so the courier never stands
behind one; a crown that would hang over a path gives way to a bush. Within 120 px of an area's bottom edge, the
side nearest the camera, the forest is only things under 48 px tall, so it frames the view without hiding it. Standalone trees (blossoms, birches, willows)
are items and sort with the courier.

Marlow's shop is an old shopfront at the end of the grove path, grown into the ancient tree behind it: roots over its
roof and down its corners, ivy, moss and ferns. Seven lanterns hang from its front verges, and one goes out for each
night resolved; by day its door is closed with a CLOSED card.

Behind the scissors sign on Nora's house in the East is her toy shop (`toyshop.js`, Night 2): a timber-framed room with a powder-blue wainscot, a cabinet of plush rabbits, bolts of fabric and her workbench.
