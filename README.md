# The Shop That Opens Once

A cozy, melancholic 2D pixel-art mystery. Satria, an ant courier, comes home to Bellwood to sell the family house, and a shop that opens only at midnight asks Satria to return seven keepsakes to the villagers.

A game project by SE.3 · Kelompok 1: Andika Rafa Akbar, Dara Dwi Hidayat, Khairul Insan, Piere Valkyrie and Praffi Ramadhani.

**Status:** building the full game in Unity 6.6 (C#), on the redesigned story and gameplay in the UTS GDD. The foundation is built (places, walking, talk with voice blips, the bag, keepsakes, saving and sound), Bellwood is redrawn, and the Prologue (Day 0) plays from Begin to Satria's first night. Next comes Night 1, The Stopped Watch. The Godot MVP (Nights 1–2 of the earlier story) is archived.

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
- **Play the archived Godot MVP:** open https://the-shop-that-opens-once-game.vercel.app in a browser. See `archive/README.md`.
- **See the presentation:** open `presentation/the-shop-that-opens-once.html` in a browser. It works offline.
