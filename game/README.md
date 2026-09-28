# The game

The Shop That Opens Once, built in Godot 4. Night 1 is playable from start to finish.

## Run it

1. Install Godot 4.7 (the standard build, not .NET) from https://godotengine.org/download.
2. Open Godot, choose **Import**, and pick `game/project.godot`.
3. Press **F5** (Run Project).

## Play it in a browser

The web version is live at https://the-shop-that-opens-once-game.vercel.app. Share that link: it
works in any desktop browser, with nothing to install.

To publish a new version, run `game/deploy.sh`. It needs:
- Godot's web export templates. In Godot, open **Editor → Manage Export Templates** and download them.
- The Vercel CLI, logged in to the `praffis-projects` account.

## Controls

| Action | Mouse | Keyboard |
| --- | --- | --- |
| Walk | Click where to go | WASD or the arrow keys |
| Talk, use, go through a door | Click it | Space or Enter when the bubble shows |
| Next line, pick a choice | Click | Space or Enter; W/S or the arrows to move between choices |
| Open the bag | The bag icon, top right | E |
| Look closer at a keepsake | Click it in the bag | I |
| Turn it over | Click `<` or `>` | A / D |
| Menu | | Esc |

## How it is built

| Path | What it holds |
| --- | --- |
| `main.tscn`, `main.gd` | The title screen, running a night, moving between places, and the screen UI |
| `core/game.gd` | The story so far (autoload `Game`): night, flags, bag, notes, saving |
| `core/place.gd` | A place to explore: walking by keys or clicks, hotspots, exits |
| `core/baked_art.gd` | Draws a place's exported art, depth-sorted with the characters |
| `core/walk_map.gd` | Where feet can stand, and paths around obstacles |
| `core/hotspot.gd` | Something to click or walk up to: a person, a sign, a door |
| `core/night.gd` | The base for night scripts, with helpers such as `say`, `choose` and `go` |
| `actors/ant.gd` | An ant character: poses, facing, walking, holding an item |
| `ui/` | The talk box, the bag and inspect view, the HUD, full-screen cards, shared look |
| `nights/night_1.gd` | All of Night 1: its dialogue, clues and ending |
| `nights/keepsakes.gd` | Each keepsake's name and what each side shows |
| `places/*.tscn` | One scene per place: its art, the people in it, hotspots and spawn points |
| `art/` | Exported art: places, characters, items, icons, UI pieces |
| `fonts/` | Pixelify Sans (SIL Open Font License) |
| `tools/export-art/` | Renders the presentation's code-drawn art into `art/` |
| `tests/` | An automated playthrough of Night 1 |

## Places

A place scene has a `World` node (`baked_art.gd`) that draws its exported art. The people in it are
`Ant` nodes under `World`, so they sort in depth with the art. Each person has a `Hotspot` child
named after them. Signs and doors are `Hotspot` nodes under `Hotspots`. A hotspot's node name is the
id the night script receives. A hotspot with `exit_to = "place/spawn"` is a way out. `Spawns` holds
the points where the courier arrives.

In the editor, a hotspot shows its clickable area in orange and the spot where the courier stands in
blue.

Where feet can stand comes from `art/places/<place>/walk.png`: white is walkable, black is not.
Repaint it in any pixel editor. It is imported as an Image (see its `.import` file), and the exporter
never overwrites it.

## Writing a night

A night is a script in `nights/` that extends `Night`. It overrides `start()`, `entered(place)` and
`interact(id)`, and uses the helpers in `core/night.gd`. Await every helper that shows something:

```gdscript
func interact(id: String) -> void:
	match id:
		"baker":
			await say("baker", "Evening! The last loaves are gone, I'm afraid.")
			if (await choose(["Show the watch", "Goodbye"])) == 0:
				await say("baker", "The station keeper cared about the time.")
				note("The baker: the station keeper cared about the time.")
```

Add the night to `NIGHTS` in `main.gd`. Story state lives in `Game`: `Game.mark(&"flag")`,
`Game.has(&"flag")`, `Game.bag` and `Game.notes`. The shop's lanterns, clock and shelf follow
`Game.night` and `Game.lanterns_out` automatically.

## Art

All art comes from the presentation's code-drawn pixel art (`../presentation/`). The exporter in
`tools/export-art/` renders it into `art/`. See `tools/export-art/README.md` to re-export. Once the
team retouches a PNG by hand, stop re-exporting that part, or the export will overwrite it.

The game shows at least 480x270 art pixels and scales them only by whole numbers, so pixels stay
crisp. On a window that isn't an exact multiple, the view grows a little to fill it instead of
leaving black bars. The UI is laid out for 480x270 and centred.

## Test

```sh
/Applications/Godot.app/Contents/MacOS/Godot --headless --path game res://tests/night_1_test.tscn
```

It plays Night 1 on the real maps at 8x speed and prints `PASS` (exit code 0) or what failed.
