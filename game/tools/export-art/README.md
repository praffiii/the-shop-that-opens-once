# Export art

Renders the presentation's code-drawn pixel art (`../../../presentation/`) into PNG and JSON files
in `game/art/`. No image is drawn by hand or generated here: every pixel comes from the same code
that draws the website.

## Run it

```sh
python3 game/tools/export-art/export.py            # everything
python3 game/tools/export-art/export.py village    # one part: village, rooms or cast
```

It needs Python 3 and Google Chrome. It opens `export.html?only=<part>` in headless Chrome and writes
the files the page returns. Open that URL in a normal browser to debug a part.

| File | What it does |
| --- | --- |
| `bake.js` | The shared helpers: sampling animation, packing atlases, writing a place |
| `export-village.js` | Bellwood at dusk, and its walk mask |
| `export-rooms.js` | Marlow's shop, the old station and their walk masks; the keepsakes; the UI icons |
| `export-cast.js` | The ant characters, their portraits, the title lettering, the palette and the UI pieces |

## What a place looks like

Each place variant is written to `art/places/<place>/<variant>/`:

- `below.png` and the `below` tiles: everything under the characters.
- `items`: each prop as its own sprite, depth-sorted with the characters by its feet line `y`.
- `above.png` and the `above` tiles: everything over the characters, such as smoke and leaves.
- `atlas.png`: every animation frame.
- `place.json`: where everything goes, plus the scene's anchors and hotspots.

Animation is sampled as a 24-second loop at 30 frames per second. Stepped animations repeat exactly.
Things that drift across the scene (hens, smoke, a passing bird, the water's ripples) jump a few
pixels when the loop restarts.

Things the story changes are separate named items, so the game can show or hide them: the shop's
lanterns, the keepsakes on its shelf, the clock's hands, and the lanterns on the shop front.

## Walk masks

`art/places/<place>/walk.png` is white where feet can stand and black where they can't. The exporter
only writes one when it is missing (or with `--force`), because the masks are meant to be repainted
by hand.

## Changing the art

Once someone retouches an exported PNG, stop re-exporting that part, or the export will overwrite it.
