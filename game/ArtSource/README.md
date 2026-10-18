# ArtSource

Every picture and sound in the game is made here, from scratch: pixel art drawn in code and sound synthesized in
code. Nothing is AI-generated. `export.py` renders it all into `../Assets/Resources/Art/`, where the game loads it.

| File | What it draws or does |
|---|---|
| `px.js` | The drawing toolkit and the palette |
| `chars.js` | The ants: poses, walking frames and portraits |
| `world.js` | Bellwood outdoors |
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
python3 ArtSource/export.py village    # one part: village, rooms, cast or sound
python3 ArtSource/export.py --force    # also rewrite the walk masks
```

What it writes, under `Assets/Resources/Art/`:

- `places/<place>/<variant>/`: `below.png` (the ground), `atlas.png` (every animated or depth-sorted piece),
  `above.png` (what is drawn over everyone) and `place.json` (where each piece goes, its frames, anchors and hotspots).
- `places/<place>/walk.png`: where feet may go, white on black. It is only a seed, written when missing. Repaint it by
  hand where the drawing needs it; `--force` overwrites it.
- `chars/`: one sheet per ant, their portraits, and `chars.json` (poses, frames, hand positions).
- `items/`, `icons/`, `ui/`: keepsakes at three sizes, icons, and the UI pieces with `ui.json`.
- `sound/`: OGG files.

Unity imports the images unfiltered, unscaled and uncompressed (`Assets/Scripts/Editor/PixelArtImport.cs`).
