# The Shop That Opens Once

- Read `GAME-CONTEXT.md` before any game design, story or development work. It is the source of truth: follow its Decisions, ask the user about the Open questions a task depends on, and record each new decision there with its date.
- The design comes from the UTS GDD (`docs/game-design-document.pdf`, in Indonesian). The earlier story (Arthur Tate, the 18:17 clock, Elise) is retired.
- The game is the Unity 6.6 project in `game/`, written in C#. We are building the full game, not an MVP.
- Make every asset from scratch: pixel art drawn in code and sound synthesized in code, in `game/ArtSource/`, exported into `game/Assets/Art/`. Never use AI-generated art, audio or assets.
- `presentation/` is frozen and `archive/godot-mvp/` is archived. Read them for reference, but never change them.
