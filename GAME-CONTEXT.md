# The Shop That Opens Once: game context

The single source of truth for what this game is, what has been decided, and what is still open. Read it before any full-game design, story or development task.

Last updated: 2026-09-26.

**Status:** concept stage. The following exist:
- a written GDD
- a feasibility report
- a web presentation with a code-drawn pixel art library

Full-game development has not started.

## How to use this file

1. Read **Decisions** and **Open questions** first. You are done when you know which open questions your task depends on.
2. Ask the user about each open question your task depends on before designing around it. Label anything you invent `[Illustrative]` until the user adopts it.
3. When the user settles a question, move it into **Decisions** with the date. You are done when the two lists agree.

Every fact carries a source tag:

| Tag | Source | Governs |
|---|---|---|
| `[Decision]` | The user's explicit choices, dated | Everything. It overrides the other tags. |
| `[GDD]` | Andika Rafa Akbar's *Game Design Document & Concept Proposal* (`docs/game-design-document.pdf`, in Indonesian) | World, story, mechanics, the seven nights |
| `[Report]` | SE.3 Kelompok 1, *Game Concept and Development Feasibility Research Report* (`docs/feasibility-report.pdf`, in Indonesian) | Scope, platform, audience, production risk |
| `[Illustrative]` | Invented for the presentation or a draft | Not canon until the user adopts it |
| `[Open]` | Undecided | Ask the user |

## Decisions

**Sources**
- `[Decision]` The GDD defines the world, premise, mechanics and the seven-night story. The report defines feasibility and scope. (2026-09-26)

**Scope and platform**
- `[Decision]` PC comes first. The MVP is 1–2 playable chapters (Nights 1–2). (2026-09-26)
- `[Decision]` The full-game vision is seven nights plus an epilogue, about 1–3 hours. Mobile comes after the PC version is stable. (2026-09-26)
- `[Decision]` The engine is not settled: Unity and Godot 4 are both options. The GDD's schedule is not a confirmed plan. (2026-09-26)

**Characters and world**
- `[Decision]` Every character is an ant: expressive reddish-brown ants, as drawn in `presentation/chars.js`. (2026-09-13, reaffirmed 2026-09-26)
- `[Decision]` The protagonist is drawn as the ant courier with a green cap and a green delivery bag. This is the visual adaptation of the GDD's human protagonist, a young man coming home. (2026-09-26)
- `[Decision]` The game has no fishing mechanic and is not a timed delivery game. The fishing scene and the parcel handoff in early mood art were atmosphere only. (2026-09-26)

**Art**
- `[Decision]` Visuals are hand-authored pixel art. The palette is bright and light, pixels are crisp at whole-number scales, and environments are full of small ambient motion. The user rejected AI-generated images and blurry, dark scenes. Ask the user before introducing any AI-generated asset. (2026-09-26)

**Canon boundaries**
- `[Decision]` The earlier browser prototype and its two test cases (a wooden songbird and a mended ribbon) are retired, together with all AI-generated art and the reference images it was made from. None of it is part of this project. The code-drawn art in `presentation/` is the only visual reference. (2026-09-26)
- `[Decision]` Difficulty scores are the team's own estimates, not industry data. (2026-09-26)

**Sharing**
- `[Decision]` Shareable pages are hosted on Vercel, not Claude Artifacts. (2026-09-26)
- `[Decision]` The project lives in a public GitHub repo, `praffiii/the-shop-that-opens-once`. The full game gets its own folder once the engine is chosen. (2026-09-26)
- `[Decision]` The PDFs in `docs/` and the presentation's credits are published as they are, including the team's student IDs. (2026-09-26)

## The game at a glance `[GDD]`

| | |
|---|---|
| Title | The Shop That Opens Once |
| Genre | 2D pixel-art narrative adventure: a cozy, melancholic mystery, inspired by Odencat |
| Logline | A young man comes home to Bellwood and finds a shop that appears for only seven nights. With no quest markers, he must return seven keepsakes to their true owners by watching and listening to the townsfolk. The journey slowly leads him to make peace with his mother's death. |
| Themes | Grief and letting go, empathy, finding the way home |
| Player feeling | Reflective, warm, bittersweet, and in the end calm (catharsis) |
| Audience | Ages 16–35. Fans of story-rich indie games, Odencat, To the Moon, Coffee Talk and A Short Hike. |
| Length | 1–3 hours: seven night chapters plus an epilogue |
| Failure | None. There is no combat, death, timer or game over. |
| Platform | PC and mobile in the GDD; PC first by decision |

Unique selling points `[GDD]` `[Report]`:
1. **No quest markers.** There are no arrows or checklists. Progress comes from listening to residents, reading the details of objects and observing Bellwood.
2. **Emotional resonance.** Small, Odencat-style moments carry the story. The stories are about inner wounds, regret, reconciliation and acceptance, not about saving the world.
3. **The 18:17 motif.** Warm sunset visuals set against loneliness, and a stopped time that finally moves again.

## World and story `[GDD]`

**Bellwood** is a small town where an old road links the centre to the outskirts. Once every few decades, just before sunset, a small shop with no name and no number appears at the end of an alley. It stays for exactly seven nights.

**Marlow's shop** is kept by an old man called Marlow. Its wall clock is frozen at **18:17**. Seven lanterns hang in the shop, and one goes out each time a keepsake reaches its true owner.

**The protagonist** has lived away from home. He comes back to clear out the family house before it is sold, feels he came home too late, and is grieving his mother. He stumbles on the shop. Marlow asks him to return seven keepsakes, each belonging to someone who lost something, to their rightful owners.

**The arc** runs across the seven nights:
- The residents' intertwined stories mirror phases of grief and uncover a deep secret of his late mother.
- On the last night, a letter from her explains why the shop chose him, and he is finally ready to go home to his own life.
- The shop then vanishes. In the epilogue he carries on its spirit as a small shop that listens to the town's stories.

**Places** named in the GDD:
- the park, the bakery, the old station, the dusk alley and the riverside
- the town museum, the former archivist's abandoned house and the lighthouse path
- Marlow's shop and the family house

## Characters `[GDD]`

All characters are ants `[Decision]`. The GDD says more residents will be added to support the story.

| Character | Role | Story | Keepsake (night) |
|---|---|---|---|
| The protagonist (the courier) | Playable. In the GDD, a young man who moved away. | Feels he came home too late; grieving his mother | Receives the music box (7) |
| His mother | Died before the game begins | Her secret and her letter drive the arc | The unsigned letter (7) |
| Marlow (real name Marcus) | Keeper of the shop, an old man | Trapped in regret over the death of his younger sister, Elise | The book *The Things We Leave Behind* (6) |
| Arthur Tate and Helen | Station keeper and a former ticket clerk | A couple separated for 20 years by a promise made for 18:17 that was never kept | Old wristwatch (1) |
| Nora and Mia | Toymaker and her daughter | Estranged for years after a fight when Mia was newly pregnant. Nora has a grandchild. | Rabbit doll with a stitched ear (2) |
| Theo and Daniel | Old photographer and his best friend | Photographer friends since youth. Daniel died before printing the last photos of Bellwood. | Old film camera (3) |
| Sam | A small child | Finds the former town archivist's room | Key with no engraving (4) |
| Leo | Former runner | Stopped running out of guilt over his older sibling's death | Pair of shoes in two sizes (5) |

## Core loop and rules

**One night** `[Report]`:
1. Visit Marlow's shop at dusk.
2. Take that night's keepsake.
3. Explore Bellwood.
4. Talk to residents.
5. Inspect the keepsake and look for clues.
6. Connect the clues.
7. Give the keepsake to the right person.
8. Witness the emotional resolution.
9. One shop lantern goes out.
10. Time moves on to the next night.

**Mechanics** `[GDD]`:
- **Cozy walking and interaction.** The player strolls through Bellwood and interacts with objects and residents.
- **Inspecting items.** The player rotates and examines keepsakes in the inventory, for example reading engraved initials, unrolling film, noting numbers or listening for subtle clues.
- **Deductive dialogue.** No dialogue choice is punished as "wrong". Choices let the player gently draw out residents' memories.
- **The 18:17 trigger.** When a keepsake reaches its owner, the shop clock's hands move briefly away from 18:17, one lantern goes out, and the night ends.

**Winning and failing** `[GDD]`:
- **Win:** deliver all seven keepsakes, then open the music box on the seventh night.
- **Fail:** there is no failure state. Offering a keepsake to the wrong person gets a puzzled reply or an extra hint toward the right person.

**Controls** `[GDD]`:

| Action | PC | Mobile (later) |
|---|---|---|
| Move | Click a tile | Tap a tile |
| Talk or interact | Left-click a nearby resident | Tap a nearby resident |
| Open the inventory | E | Bag icon in the top-right corner |
| Inspect an item | I, on an item in the inventory | Double-tap the item |

## The seven nights `[GDD]`

Nights 1–2 are the MVP `[Decision]`. Nights 3–7 and the epilogue are the full-game vision. The lantern counts are cumulative.

| Night | Keepsake | Who | What happens | Lanterns out |
|---|---|---|---|---|
| 1 | Old wristwatch, engraved "A.T.", stopped at 18:17 | Arthur Tate and Helen | The player traces the initials "A.T." to Arthur Tate and finds Helen at the old station. The watch releases her from a 20-year wait. | 1 |
| 2 | Rabbit doll with a stitched ear | Nora, Mia, Nora's grandchild | The player reconnects Nora, who runs the toy shop, with her daughter Mia. The doll goes to Nora's grandchild as a bridge back to each other. | 2 |
| 3 | Old film camera | Theo, the late Daniel | Theo develops six frames Daniel left behind. The photos lead the player onward until they are donated to the town museum to remember the two friends. | 3 |
| 4 | Key with no engraving | Sam, the former town archivist | The player follows Sam to the archivist's abandoned house and opens a room that keeps the memories of residents who have died, so they are not lost. | 4 |
| 5 | Pair of shoes in two sizes | Leo, a small child | Leo makes peace with his guilt over his older sibling's death by practising running with a child on the lighthouse path. | 5 |
| 6 | The book *The Things We Leave Behind* | Marlow (Marcus) | A book that keeps changing places guides Marlow to write down that he has accepted Elise's death. The book then burns to ash. | 6 |
| 7 | Unsigned letter and a music box | The protagonist | His late mother's letter reveals why the shop chose him. He receives the music box on the empty shop counter and is ready to go home to his life. In the epilogue the shop vanishes and he carries on its legacy as a small shop that listens to residents' stories. | 7 (implied, not stated) |

Nights 6 and 7 are the ending. Keep them hidden as spoilers in anything shown to players.

### Night 1 clue chain: a draft `[Illustrative]`

This chain was written for the presentation's playable demo. It is not in the GDD. Adopt it, change it or drop it.
- **The keepsake:** a watch stopped at 18:17 and never rewound, with "A.T." engraved on the back.
- **The station:** an enamel plaque by the door reads "KEEPER A. TATE", and the timetable shows the evening train at 18:17.
- **Testimony:** a clock mender at the station says Helen has sat on the platform bench every evening before 18:17 for twenty years.
- **Red herring:** a traveller carries a suitcase marked "A.T.". The initials match, but his story doesn't.
- **Wrong offers:**
  - The traveller points the player elsewhere.
  - The clock mender adds a clue: the watch isn't broken, and keeping it stopped is a promise, not a repair.
- **Right offer:** Helen. Afterwards the shop clock ticks once and the first lantern goes out.

The presentation moves the shop clock forward one minute per resolved night (18:17, then 18:18, and so on). That is its own interpretation; the GDD only says the hands move briefly `[Illustrative]`.

## Art and audio

**The GDD's direction** `[GDD]`:
- Expressive pixel-art characters with simple but soulful animation: blinks, head tilts, small emotes.
- Bellwood drawn in warm detail with a twilight palette: golden orange, dusk purple, and the shop's warm incandescent yellow.
- Audio: melancholic solo piano, a music box and soft acoustic guitar. Ambient sound includes evening wind, the shop's door bell and the creaking wooden floor of the old station.
- Visual references: Bear's Restaurant, Fishing Paradiso, Meg's Monster (all by Odencat), A Space for the Unbound and To the Moon.

**The current direction** `[Decision]` (2026-09-26):
- **View:** angled top-down (3/4) pixel art like the Bellwood village in `presentation/world.js`, with cottages, foliage, stone paths, water, bridges and warm lanterns.
- **Light:** a bright, sunny Bellwood by day. Dusk and evening stay pastel and readable, never dark or muddy.
- **Crispness:** art is drawn at its native resolution and only ever scaled by whole numbers, with no blur or soft filtering.
- **Life:** water, foliage, chimney smoke, animals and villagers are always gently moving.
- **Characters:** chunky, expressive ants with one big eye, thin legs and antennae, as drawn in `presentation/chars.js`. The courier wears a green cap with a cream patch and carries a green bag.
- **Sourcing:** hand-authored art only. Ask the user before using any AI-generated asset.

**The visual reference.** `presentation/` holds the code-drawn art library. It is the only visual reference for the game:
- **Places:** the Bellwood village, including day, dusk and evening versions, the shop appearing, and its lanterns lighting. Also Marlow's shop interior with the working 18:17 clock, the old station, and seven small scenes, one per night.
- **Characters:** 15 ant characters in 40×40 px frames, about 32 px tall, with poses for walking, talking, giving, receiving, carrying, inspecting, sitting and being moved, plus 48×48 px portraits.
- **Items and interface:** the keepsakes at three sizes, UI icons and the title lettering.
- **Palette and sound:** the colour palette (in `px.js`) and synthesized music and sound effects (in `audio.js`).

This art is JavaScript canvas code, so a game engine would need it exported to sprite sheets first. `presentation/ART.md` has the art rules and each module's specifications.

## Production and scope

**Systems needed** `[Report]`:
- Needed: player movement, NPC interaction, dialogue, inventory, item inspection, an interaction system, chapter progression, the 18:17 time transition, saving and loading, and scene management.
- Not needed: multiplayer, complex combat, enemy AI, procedural generation, complex physics, skill trees, an open world or online services.

**Where the difficulty is** `[Report]`. These are team estimates, not industry data.
- **Overall: 8/10 (difficult).** The difficulty comes from content volume, visual consistency, storytelling, clue design and playtesting without markers, not from the code.
- **By discipline:** programming about 6/10, pixel art and animation about 8/10, narrative and game design about 9/10.

| Component | Score | Component | Score |
|---|---|---|---|
| Player movement | 2/5 | NPC schedules | 4/5 |
| NPC interaction | 2/5 | Deduction and clue system | 4/5 |
| Dialogue system | 3/5 | No-quest-marker design | 5/5 |
| Inventory | 3/5 | Pixel art | 4/5 |
| Item inspection | 3/5 | Animation | 4/5 |
| Chapter progression | 3/5 | Environment | 4/5 |
| 18:17 time system | 3/5 | Narrative design | 5/5 |
| Audio | 3/5 | Mobile adaptation | 4/5 |
| Testing | 4/5 | | |

**Main risks** `[Report]`:
- **Clue clarity without markers.** Too easy and the deduction means nothing; too hard and players get lost. Playtest every case to check players can solve it on their own.
- **Consistent pixel art across many assets.** Limit the variety of animations to keep this manageable.
- **Tying the systems to story progression.** Connecting dialogue, inventory and chapter state to the story is the hard part of the code.

**Roadmap** `[Decision]` `[Report]`:
1. Prove one case works from start to finish.
2. Build the MVP: Nights 1–2 playable on PC, playtested to confirm players can solve them without markers.
3. Expand to all seven nights and the epilogue, then adapt for mobile.

**Proposed tools** `[GDD]`:
- **Engine:** Unity (C#) or Godot 4 (GDScript).
- **Art and design:** Aseprite for sprites and animation; Canva or Figma for UI and mood boards.
- **Sound:** Freesound for foley and sound effects. The GDD also lists AI asset generation and Suno for music (see Known inconsistencies).

**Proposed schedule** `[GDD]`. This is not a confirmed plan.

| Week | Deliverables |
|---|---|
| 1 (days 1–7) | Dialogue scripts for all seven nights (text or JSON); 2D movement and basic NPC interaction; tilesets for Bellwood and Marlow's shop |
| 2 (days 8–14) | Inventory bag and the inspect feature; the dialogue system inside the engine; a playable demo of Nights 1–2 |
| 3 (days 15–21) | Scripts and events for Nights 3–7 and the ending; the 18:17 trigger and night transitions; piano and music-box music, plus footstep and door-bell sound effects; NPC pixel animation |
| 4 (days 22–28) | A full playthrough test; fixes to collisions and UI text; the final build (PC executable and mobile APK) |

**Proposed distribution** `[GDD]`:
- **PC (Steam, itch.io):** a premium one-time purchase at Rp 45,000–65,000 (about $4.99), with Steam achievements and a soundtrack bundle.
- **Mobile (Google Play, App Store):** Odencat-style freemium. Chapters 1–2 are free; after that, players either buy a one-time, ad-free unlock for Rp 29,000 or watch a rewarded ad to continue to each next night.

**Market position** `[Report]`: the game competes on identity, meaning pixel art, emotional story, a cozy mood and light deduction, rather than on complex mechanics. What sets it apart is that each keepsake links clues, characters and story, so players have to observe as well as follow dialogue.

| Reference game | In common | Its strength | Gap or opportunity | Used as a reference for |
|---|---|---|---|---|
| Bear's Restaurant | Pixel art, emotional story, short length | A strong, simple emotional story | Linear, with no deduction | Storytelling |
| A Space for the Unbound | Pixel art, town exploration, NPCs | A living world and cast | Larger, more complex scope | World-building |
| Coffee Talk | Cozy mood, character-driven dialogue | Dialogue at the centre | Little exploration or deduction | Atmosphere and dialogue |

**Audiences** `[Report]`:
- **Primary:** players who like story-rich indie games, pixel art, light mysteries and exploration.
- **Secondary:** fans of cozy, atmospheric games.
- **Tertiary:** fans of light mysteries and puzzles.

## What's in this repo

| Path | What it is |
|---|---|
| `docs/game-design-document.pdf` | The GDD `[GDD]` |
| `docs/feasibility-report.pdf` | The feasibility report `[Report]` |
| `presentation/` | The web presentation: its code-drawn art library, build script and Vercel deploy script. `the-shop-that-opens-once.html` is the built page, live at https://the-shop-that-opens-once.vercel.app |

## Known inconsistencies

- **Schedule:** the GDD's heading says "10-week MVP", but its table covers only four weeks. Treat neither as a plan.
- **Platform:** the GDD targets PC and mobile together, while the report and the user put PC first and mobile later.
- **AI assets:** the GDD's tool list includes AI-generated art and Suno for music, but the user rejected AI-generated images on 2026-09-26.
- **Palette:** the GDD asks for a twilight palette; the current direction is bright and light, with a pastel dusk.
- **Leo's sibling:** the GDD says *kakak*, meaning an older sibling of unspecified gender. The presentation currently says "brother".
- **Days vs nights:** the GDD calls the chapters "seven nights" but its synopsis speaks of "seven days of searching".

## Open questions

**Technology and pipeline**
- Engine: Unity or Godot 4 (the GDD's options), or the web?
- Art pipeline: export the presentation's code-drawn art to sprites, redraw it in Aseprite, or both? What base resolution and pixel scale?
- Are AI-generated assets acceptable anywhere, for art or for music?

**Game design**
- Controls: click-to-move only (as in the GDD), or keyboard walking as well?
- Time structure: does exploration happen at dusk, through the night, or by day between shop visits? Does the town's clock move?
- Residents: how many, where they are, and on what daily schedules? The report scores NPC schedules 4/5 for difficulty.
- Saving, chapter select, text speed and other accessibility options.
- Language: English (as in the presentation), Indonesian (as in the GDD), or both?

**Story**
- **Protagonist:** his name, age, and pronouns for the ant courier. The GDD's protagonist is a young man.
- **The mother:** her name, her "deep secret", and what her letter says about why the shop chose him.
- **Grief:** which phase of grief each night mirrors.
- **Night 1:** adopt the draft clue chain above?
- **Night 2:** which clues lead to Nora's grandchild, and who the grandchild is.
- **Night 3:** what the six photos show, and how the museum donation plays out.
- **Night 4:** who the former archivist was, what the key opens, and how the player finds it.
- **Night 5:** who the child on the lighthouse path is (possibly Sam), and who Leo's sibling was.
- **Night 6:** how the book moves from place to place, what Marlow writes, and why he goes by Marlow rather than Marcus.
- **Night 7 and the epilogue:** what the music box means, and what the epilogue's shop looks like.

**Business**
- The final business model, release targets and schedule.

## Team

SE.3 · Kelompok 1: Andika Rafa Akbar (GDD author), Dara Dwi Hidayat, Khairul Insan, Piere Valkyrie and Praffi Ramadhani.

## Glossary

- **Keepsake** (in the GDD, *benda peninggalan*): the object Marlow hands out each night. It belongs to a resident's unfinished story.
- **Night** (a chapter): one keepsake, from receiving it to its resolution.
- **18:17:** the time at which the shop clock is frozen, and the game's central motif.
- **Lantern:** one of the seven in the shop. One goes out for each resolved night.
- **No quest markers:** there are no arrows, waypoints or checklists. Players find each owner through observation and conversation.
- **The courier:** the playable ant protagonist.
