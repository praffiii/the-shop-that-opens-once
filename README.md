# The Shop That Opens Once

A cozy, melancholic 2D pixel-art mystery. Satria, an ant courier, comes home to Bellwood to sell the family house, and a shop that opens only at midnight asks Satria to return seven keepsakes to the villagers.

A game project by SE.3 · Kelompok 1: Andika Rafa Akbar, Dara Dwi Hidayat, Khairul Insan, Piere Valkyrie and Praffi Ramadhani.

**Status:** the whole game is built in Unity 6.6 (C#), on the redesigned story and gameplay in the UTS GDD. It plays from the Prologue (Day 0) through all seven nights and the Epilogue (Day 8) to the credits, with 14 minigames. Every pixel is drawn in code and every sound is synthesized in code. The Godot MVP (Nights 1–2 of the earlier story) is archived.

## How to play

| Key | Action |
| --- | --- |
| WASD or the arrow keys | Walk |
| Shift | Switch between running and walking (indoors the courier always walks) |
| Space or Enter | Talk, look and use; hold it in some minigames |
| E | Open the bag |
| I | Inspect a keepsake in the bag |
| R | Retry a minigame |
| Esc | Pause, and the settings (volumes, text speed, the screen) |

There are no markers. Follow what the villagers say, and read the Notes in the bag. The game saves at every checkpoint, and Continue on the title picks up from there.

Developer keys, in the Unity editor and development builds only (not in a normal build), for trying the story out:

| Key | Cheat |
| --- | --- |
| F5 | The time of day moves on |
| F6 | Win the minigame on screen |
| F7 (hold) | Talk types out and moves on by itself |
| F8 | Start the next chapter |

## What's in this repo

| Path | What it is |
| --- | --- |
| `GAME-CONTEXT.md` | The game's design summary: decisions, story, the seven nights and open questions. Start here. |
| `docs/` | The UTS game design document, the feasibility report and the earlier concept proposal |
| `docs/devlog/` | The dev log, one entry per step of the work (in Bahasa Indonesia) |
| `game/` | The game, a Unity 6.6 project. Its art and sound are made in code in `game/ArtSource/`. |
| `presentation/` | The web presentation, frozen with the earlier story. Live at https://the-shop-that-opens-once.vercel.app |
| `archive/godot-mvp/` | The Godot 4 MVP, archived and unchanged |

## Quick start

- **Read the design:** `GAME-CONTEXT.md`, then `docs/game-design-document.pdf`.
- **Open the game:** in Unity Hub, choose **Add → Add project from disk**, pick `game/`, and open it with Unity 6000.6.6f1. Open `Assets/Scenes/Main.unity` and press Play.
- **Build the game:** in Unity choose **File → Build Profiles**, pick **Windows** or **macOS**, and build into `game/Builds/Windows` or `game/Builds/macOS` (both ignored by git). There is no web build: the full HD-2D look runs far too slowly in a browser.
- **Run the tests:** in Unity open **Window → General → Test Runner** and run the PlayMode tests. `PlaythroughTest` and `NightsTest` play the Prologue, every night and the Epilogue through unattended.
- **Play the archived Godot MVP:** open https://the-shop-that-opens-once-game.vercel.app in a browser. See `archive/README.md`.
- **See the presentation:** open `presentation/the-shop-that-opens-once.html` in a browser. It works offline.
