# ArtSource

Every picture and sound in the game is made here, from scratch: pixel art drawn in code and sound synthesized in
code. Nothing is AI-generated. `export.py` renders it all into `../Assets/Resources/Art/`, where the game loads it.

| File | What it draws or does |
|---|---|
| `px.js` | The drawing toolkit and the palette |
| `kit.js` | Shared props (lamps, benches, trees, windows) and the time-of-day grades |
| `chars.js` | The ants: poses, walking frames and portraits |
| `village.js` | The village kit: the terrain painter (levels, cliffs, rivers, paths, sand, sea), foliage, trees and small props |
| `village-west.js`, `village-centre.js`, `village-south.js`, `village-east.js` | Each zone's buildings and landmarks |
| `village-nature.js` | Trees, plants, rocks, yard props and bugs |
| `world.js` | Bellwood outdoors: the layout of the one seamless map, and everything placed on it |
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

- `places/<place>/<variant>/`: the ground (`below_<col>_<row>.png`) and what is drawn over everyone
  (`above_<col>_<row>.png`), cut into 1024 px chunks with empty chunks left out; `atlas_<n>.png`, up to 2048 px
  each, holding every animated or depth-sorted piece (all frames of one piece share an atlas); and `place.json`.
  `place.json` lists the chunks, the clips (small loops such as ripples or swaying grass, drawn once), the decals
  that place a clip many times with a timing offset, the items with their atlas, and the anchors, paths and hotspots.
  A rebake removes the chunks and atlases its variant no longer writes.
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
