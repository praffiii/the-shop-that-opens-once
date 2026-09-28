# Export art

Renders the presentation's code-drawn pixel art and synthesized sound (`../../../presentation/`) into
PNG, JSON and OGG files in `game/art/`. Nothing is drawn, recorded or generated here: every pixel and
every sample comes from the same code that draws and plays the website.

## Run it

```sh
python3 game/tools/export-art/export.py            # everything
python3 game/tools/export-art/export.py village    # one part: village, rooms, cast or sound
```

It needs Python 3 and Google Chrome. The sound part also needs `oggenc` (`brew install vorbis-tools`).
It opens `export.html?only=<part>` in headless Chrome, waits for the part to finish and writes the
files the page returns. Open that URL in a normal browser to debug a part.

| File | What it does |
| --- | --- |
| `bake.js` | The shared helpers: sampling animation, packing atlases, writing a place |
| `export-village.js` | Bellwood at dusk, and its walk mask |
| `export-rooms.js` | Marlow's shop, the old station and their walk masks; the keepsakes; the UI icons |
| `export-cast.js` | The ant characters, their portraits, the title lettering, the palette and the UI pieces |
| `export-sound.js` | The music loops, the evening wind and the sound effects |

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

## Sound

`sound/` holds mono 44.1 kHz OGG Vorbis files at the presentation's own levels. Turn on Loop for the
music and the wind in Godot.

- `music_<mood>.ogg` for dusk, shop, memory and resolved: one 16-bar loop each. Whatever still rings at
  the loop's end is folded back onto its start, so it loops seamlessly.
- `wind.ogg`: the evening wind, a 28.6-second loop whose end cross-fades into its start.
- The effects, trimmed to their sound: `bell`, `tick`, `chime`, `motif`, `page`, `pop`, `wrong`, `right`
  and `whoosh`, and four variations of each footstep, `step_wood_0` to `3` and `step_0` to `3` (outdoors).

## Walk masks

`art/places/<place>/walk.png` is white where feet can stand and black where they can't. The exporter
only writes one when it is missing (or with `--force`), because the masks are meant to be repainted
by hand.

## Changing the art

Once someone retouches an exported PNG, stop re-exporting that part, or the export will overwrite it.
