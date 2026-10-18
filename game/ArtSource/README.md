# ArtSource

Every picture and sound in the game is made here, from scratch: pixel art drawn in code and sound synthesized in
code. Nothing is AI-generated. `export.py` renders it all into `../Assets/Resources/Art/`, where the game loads it.

| File | What it draws or does |
|---|---|
| `px.js` | The drawing toolkit and the palette |
| `kit.js` | Shared props (lamps, benches, trees, windows) and the time-of-day grades |
| `chars.js` | The ants: poses, walking frames and portraits |
| `bellwood.js` | Bellwood outdoors: one seamless world of the four zones |
| `interiors.js`, `toyshop.js` | Rooms |
| `title.js` | The title lettering |
| `audio.js` | Music, wind and sound effects |
| `ART.md` | The art style rules. Read it before drawing. |
| `bake.js`, `export-*.js`, `export.html` | Turn the drawings into images and data for the game |
| `export.py` | Runs the export in headless Chrome |

## Export

Needs Google Chrome and `oggenc` (`brew install vorbis-tools`). From `game/`:

```sh
python3 ArtSource/export.py            # everything
python3 ArtSource/export.py world      # one part: world, rooms, cast or sound
python3 ArtSource/export.py --force    # also rewrite the walk masks
```

What it writes, under `Assets/Resources/Art/`:

- `places/<place>/<variant>/`: `below.png` (the ground), `atlas.png` (every animated or depth-sorted piece),
  `above.png` (what is drawn over everyone) and `place.json` (where each piece goes, its frames, anchors and hotspots).
- `places/<place>/walk.png`: where feet may go, white on black. It is written when missing; `--force` overwrites it.
  The world's mask is built from its own data (water, cliffs, buildings' walls, props' footprints), and the export
  fails if any path or anchor is not walkable and connected.
- `grades.json`: the time-of-day colour grades. The world is drawn once, at midday (`places/world/day/`), and the
  game grades it for morning, dusk and night in its shader. Lights (lit windows, lamps, fireflies) are separate items
  that show at dusk and night and are never graded.
- `chars/`: one sheet per ant, their portraits, and `chars.json` (poses, frames, hand positions).
- `items/`, `icons/`, `ui/`: keepsakes at three sizes, icons, and the UI pieces with `ui.json`.
- `sound/`: OGG files.

Unity imports the images unfiltered, unscaled and uncompressed (`Assets/Scripts/Editor/PixelArtImport.cs`).
