# The Shop That Opens Once: game context

The single source of truth for what this game is, what has been decided, and what is still open. Read it before any full-game design, story or development task.

Last updated: 2026-10-18.

**Status:** building the full game in Unity, on the new design in the UTS GDD. The following exist:
- the UTS GDD, which redesigns the story and gameplay (`docs/game-design-document.pdf`)
- the earlier concept proposal and the feasibility report
- the Unity project in `game/` with the foundation built: the Godot core ported to C# (places, walking, talk, the bag, keepsakes, saving, sound), a systems-test chapter that is not part of the story, and a playthrough test that passes
- the art pipeline in `game/ArtSource/`, exporting into `game/Assets/Resources/Art/`. Bellwood outdoors is five small areas joined by edge exits (the station, the banyan grove, the square, the east and the coast; `areas.js`, drawn with the `village*.js` kits) in a cozy RPG-village style, with wind, cloud shadows and bugs. The game shows them in an HD-2D 3D view (raised ground, upright cards, tilt-shift blur and bloom), graded for the time of day (design: `docs/superpowers/specs/2026-10-18-bellwood-world-overhaul-design.md`, look and layout revised the same day). The nine interiors follow; the shop is still the Godot set.
- the dev log of each step, in Bahasa Indonesia, in `docs/devlog/`
- the web presentation, frozen. It still tells the earlier story.
- the Godot MVP (Nights 1 and 2 of the earlier story), archived in `archive/godot-mvp/`

## How to use this file

1. Read **Decisions** and **Open questions** first. You are done when you know which open questions your task depends on.
2. Ask the user about each open question your task depends on before designing around it. Label anything you invent `[Illustrative]` until the user adopts it.
3. When the user settles a question, move it into **Decisions** with the date. You are done when the two lists agree.

Every fact carries a source tag:

| Tag | Source | Governs |
|---|---|---|
| `[Decision]` | The user's explicit choices, dated | Everything. It overrides the other tags. |
| `[GDD]` | SE.3 Kelompok 1, *Perancangan Game Design Document (GDD) dan Storyboard Game*, the UTS report (`docs/game-design-document.pdf`, in Indonesian) | World, story, characters, mechanics, the seven nights, UI, audio |
| `[Report]` | SE.3 Kelompok 1, *Game Concept and Development Feasibility Research Report* (`docs/feasibility-report.pdf`, in Indonesian) | Scope, audience, production risk |
| `[Proposal]` | Andika Rafa Akbar's *Game Design Document & Concept Proposal* (`docs/concept-proposal.pdf`) | Superseded by the GDD. History only. |
| `[Illustrative]` | Invented for the presentation or a draft | Not canon until the user adopts it |
| `[Open]` | Undecided | Ask the user |

## Decisions

**Sources**
- `[Decision]` The UTS GDD defines the world, story, characters, mechanics and the seven nights. It replaces the concept proposal, whose story (Arthur Tate, the 18:17 clock, Marlow's sister Elise, Sam as a child) is retired. The report still defines feasibility and scope. (2026-10-18)

**Engine and builds**
- `[Decision]` The engine is Unity 6.6 (6000.6.6f1) with C#. It replaces Godot 4. The editor is VS Code. (2026-10-18)
- `[Decision]` Build targets: Web first, then Windows. Those two build modules are installed. (2026-10-18)
- `[Decision]` The Godot MVP is an archive and stays untouched. It lives in `archive/godot-mvp/`, and the git tag `godot-mvp` marks its last commit. Its web build stays live at https://the-shop-that-opens-once-game.vercel.app as a record. (2026-10-18)
- `[Decision]` The Unity project lives in `game/`. It started from the Universal 2D template (URP with the 2D renderer), trimmed to sprites, the Input System, uGUI and the Test Framework. (2026-10-18)
- `[Decision]` Before Unity: the engine was Godot 4.7.2 with GDScript, because C# projects in Godot 4 cannot export to the web. (2026-09-28, superseded 2026-10-18)

**Scope and platform**
- `[Decision]` No MVP in Unity: build the full game, the prologue, seven nights and the epilogue. This replaces the Nights 1–2 MVP. (2026-10-18)
- `[Decision]` PC comes first. Mobile comes after the PC version is stable. (2026-09-26)

**Assets: made from scratch, no AI**
- `[Decision]` Art, sound and every other asset are made from scratch, the way the Godot build made them: pixel art drawn in code and exported to images, and music and sound synthesized in code. No AI-generated art, audio or assets. The GDD's AI-assisted pipeline (Midjourney, FLUX, Suno in section 13.3) was written for the formal report only. (2026-09-26, reaffirmed 2026-10-18)
- `[Decision]` The art and sound source lives with the game in `game/ArtSource/`: the presentation's drawing and sound code (`px.js`, `chars.js`, `world.js`, `interiors.js`, `toyshop.js`, `audio.js`, `ART.md`) copied in as the starting point, plus the Godot exporter adapted for Unity. It renders in headless Chrome to PNG, JSON and OGG in `game/Assets/Resources/Art/`. New art is drawn there in the same style. (2026-10-18)
- `[Decision]` The presentation is frozen: it stays as it is, live on Vercel, and is no longer updated. Its art set the style. (2026-10-18)
- `[Decision]` Reuse the drawn parts and redraw the maps. The ants, portraits, keepsakes, UI, sound and the drawing toolkit carry over. The four zones and nine interiors are redrawn in code. The three characters the GDD adds are drawn new. (2026-10-18)
- `[Decision]` The GDD's zone and interior maps are a layout guide only: what is where and how places connect. They are redrawn in our own style, never traced or used as art. (2026-10-18)

**Tools and process**
- `[Decision]` The game is built in code, as the Godot build was. One scene (`Main.unity`) holds an object with `Main`, which builds the cameras, UI and places. Places are C# data (`Places.cs`); each chapter's story is a C# class. The world and UI draw into a small canvas that is scaled up by a whole number. (2026-10-18)
- `[Decision]` Unity MCP: the free community server CoplayDev/unity-mcp, pinned to v10.3.0, in the project's packages. Unity's official MCP needs a Unity AI subscription. (2026-10-18)
- `[Decision]` `.mcp.json` connects to the server the Unity package runs, over HTTP at `http://127.0.0.1:8080/mcp`, instead of starting its own over stdio. Open the project in Unity first. (2026-10-18)
- `[Decision]` Every step of the work gets a dev log entry in Bahasa Indonesia in `docs/devlog/`, with its goal, what was built, the decisions, the problems, screenshots, how it was checked, and its commits. Each milestone gets a git tag. The project is a course assignment, and the log records its progress. (2026-10-18)

**The world** (chosen while redrawing the maps, on the user's go-ahead)
- `[Decision]` (superseded 2026-10-18, see the areas below) Bellwood outdoors is one seamless map of the four zones, as GDD 8.1 describes it ("seamless connected world"), not four scenes. The West (the station and Marlow's banyan) and the Centre (the square) are joined by a bridge over the west river; the Centre and the East by a bridge over the east river; the South lies below the cliff, down the cliff steps. Interiors are separate places behind doors. (2026-10-18)
- `[Decision]` The time of day is a colour grade, not a redrawn variant. Each place is drawn once, at midday, and the game's pixel shader grades it per phase with the grades in `ArtSource/kit.js`. Lit windows, lamps, lanterns and fireflies are separate pieces that show at dusk and night and are never graded; butterflies show in the morning and at midday. This replaces drawing every place per phase, which would have meant four copies of every place. (2026-10-18)
- `[Decision]` Helen's tea stall is on the station platform (West zone), as most of the GDD has it. (2026-10-18)
- `[Decision]` (revised 2026-10-18, see the hidden grove below) Marlow's shop is in the roots of the great banyan by the station (West zone), as the GDD's text has it. Seven lanterns hang in its branches. (2026-10-18)
- `[Decision]` Leo's hill is in the north-east of the East zone: a raised plateau reached by steps, with Leo's lookout hut on top. (2026-10-18)
- `[Decision]` The station clock is frozen at 10:17. (2026-10-18)

**The world overhaul** (design: `docs/superpowers/specs/2026-10-18-bellwood-world-overhaul-design.md`, approved 2026-10-18)
- `[Decision]` Bellwood is an **ant planet**. No humans exist and nothing human is left behind. Ants build everything from nature (twigs, bark, leaves, walnut and acorn shells, mushrooms, pebbles, clay, reeds) and from their own crafts (woodwork, stone, iron from the forge, glass). The railway, the train, the station clock and the lighthouse are ant-made. This overrides the GDD's "human leftovers" (selling point 1.5 and design pillar 4): human leftovers would raise questions the story never answers. (2026-10-18)
- `[Decision]` (superseded 2026-10-18, see the look below) The look is natural materials: walnut-shell and acorn houses, leaf roofs, twig fences, mushroom street lamps, pebble paths, and clover, dandelions and ferns towering over the roofs so the ants feel small. Each zone has its own main materials and colours, and no two buildings share both their shape and their main material. (2026-10-18)
- `[Decision]` The world must never feel empty: no plain patch without a purpose bigger than about a third of the view, forest, fields, water or rock between places instead of lawn, and something moving on every screen. (2026-10-18)
- `[Decision]` (superseded 2026-10-18, see the areas below) The world grows to about 3 times today's width and height, so walking past everything takes minutes, filled with new sub-areas rather than stretched. Buildings grow too: a home is 3–4 ants tall. (2026-10-18)
- `[Decision]` Holding Shift makes the courier run. No fast travel and no map. Story places sit close to the main road and the bridges; the extra exploring space lies off to the sides. (2026-10-18)
- `[Decision]` The only animals are bugs at ant scale (aphids herded like cattle, beetles, snails, ladybugs, crickets, water striders, butterflies, moths, fireflies). No hens, cats, birds or crabs. (2026-10-18)
- `[Decision]` Homes for the named villagers: Helen's by the station, Mender's by the forge and Kapten Bram's by the rail yard (West); Baker's over the bakery, Mia and Pip's by the market street and Sam's near the hall (Centre); Arlo's by the jetty, and Theo lives at the studio (South); the Gardener's by the fields (East), with Nora's stilt house and Satria's childhood home there too. Other buildings belong to unnamed ants known only by their trade. Where Marlow lives by day is open. (2026-10-18)
- `[Decision]` The village post office stands on the square, closed since the storm, so Satria can reopen it there on Day 8. (2026-10-18)
- `[Decision]` Villagers live like NPCs in Harvest Moon or Stardew Valley: homes, work and routines across the four day phases, plus unnamed background ants. Designed later, after the world. (2026-10-18)
- `[Decision]` The train stands still all game, since the railway was cut for good in 1952. It moves once, in the epilogue (Day 8), when time in Bellwood flows again: Kapten Bram blows the whistle and the old engine rolls a few lengths down the line under its own steam. Until then the Mender's tinkering with it hints at it. (2026-10-18)
- `[Decision]` The villagers are drawn from the GDD's character text (6.x), which wins where its design sheet disagrees. Sam is the hall's adult archivist (stiff-collared shirt, moss-green knitted vest, black sleeve protectors), though the sheet still shows the retired story's child. Pip has a blue and white striped shirt and an oversized courier's cap worn tilted, though the sheet shows a pink-bowed child; the cap is postbox red, so he is never taken for the green-capped courier. Kapten Bram wears the conductor's peaked cap with a gold band, a white collar, a white moustache and the brass whistle on its chain. Everyone stays a reddish-brown ant (see the ants below); the GDD's skin colours are not followed. (2026-10-18)
- `[Decision]` No villager carries or shows a watch, so nothing in the world points at Night 1's keepsake by look alone. Kapten Bram paces the platform checking the frozen tower clock against the timetable board instead. (2026-10-18)
- `[Decision]` Leo wears cloth wraps round his ankles (GDD 6.8), not sneakers, so his look does not point at Night 5's keepsake, the spiked running shoes. Nenek Nora (a deep-plum knitted wool shawl over her head, thick reading glasses on a thread) and the Gardener (grass-green cotton, a seed pouch, a woven straw hat) follow the GDD's text too. (2026-10-19)
- `[Decision]` Nora's stilt house has a veranda with her loom on it, where she weaves by day. The chamomile field's fence has a gate in its middle, onto the path between the rows, so the Gardener and the courier can walk in. (2026-10-19)
- `[Decision]` Theo (a dark-brown many-pocketed vest, a brass magnifier lens, his beret) keeps his own camera on its strap, because his routine has him photographing; Night 3's keepsake is Daniel's 8mm film camera, a different camera. Nelayan Arlo wears a navy knitted wool jumper, olive waders, tall rubber boots and a mustard knitted cap (GDD 6.12 and its sheet). (2026-10-19)
- `[Decision]` The order of work: the look, proven on the West zone; the whole bigger world; living villagers; the nine interiors. Reference packs and the GDD's AI images are studied for technique only; nothing is traced or copied. (2026-10-18)
- `[Decision]` The look is a cozy top-down RPG village, not the ant-scale fable: Harvest Moon / zedpxl houses with big roofs and short walls, flat colour with a few deliberate marks, a dark outline on everything that stands, leafy clumped trees, real height (grey cliff faces between terrace levels, stairs, eaves, footings) and bright water. Rich, one-of-a-kind buildings for the story places; simpler homes for background villagers. It replaces the natural-materials look, which felt flat and pasted together. Ants are still the only people and bugs the only animals. (2026-10-18)
- `[Decision]` Reference packs (zedpxl, LimeZu, Maeve, Kenmi, anokolisa) are studied for technique only, because their licences cannot be bought. Every pixel is drawn in our own code; nothing is copied, traced, downloaded or sampled. The notes are in `game/ArtSource/ART.md`. (2026-10-18)
- `[Decision]` The full outdoor map comes first; interiors and small details come later. (2026-10-18)
- `[Decision]` (superseded 2026-10-18, see the areas below) The map is 4800x3200 art px (300x200 tiles), laid out after the GDD's world map: two rivers wind down to the sea under bridges; the town stands on a plateau with the north ridge above and a terrace and the coast below; forest fills the land between places and the main road runs through every zone. (2026-10-18)
- `[Decision]` The world feels alive through the shader as well as drawn loops: trees and bushes bend in the wind (each texel row shifted by whole texels), and cloud shadows drift over the ground by day. Butterflies and dragonflies fly by day, fireflies at night, and chimneys smoke. The old whole-world "look" colour grade is gone; only the time-of-day grade remains. (2026-10-18)
- `[Decision]` Forest trees are drawn under everything, and the ground under their crowns is solid: the courier walks up to the forest and in front of its trees, never behind them. This keeps the world to about 500 game objects. (2026-10-18)

**The areas and the HD-2D view** (2026-10-18, after the user found the seamless map too big)
- `[Decision]` Bellwood outdoors is five small areas, one per part of town, each its own place about 15 s to walk across (at most about 1024x832 art px). Exits at an area's edges lead on, with a short fade, as top-down RPGs build a town: the Station (west to the Grove, east to the Square), the Grove, the Square (east to the East, south down to the Coast), the East and the Coast. This overrides GDD 8.1's "seamless connected world" and the 4800x3200 map. (2026-10-18)
- `[Decision]` (camera and buildings revised 2026-10-18, see the 3D buildings below) The game draws Bellwood in an HD-2D 3D view, like Octopath Traveler: the ground is a mesh raised from each area's height map, so cliffs and banks stand up; buildings, trees and ants are upright cards leaning back to face a camera tilted 45 degrees down; a tilt-shift depth of field, bloom on lights and a soft vignette. The art stays drawn top-down in code, and URP now uses the Universal renderer instead of the 2D renderer. (2026-10-18)
- `[Decision]` (the banyan revised 2026-10-18, see the overgrown shop below) Marlow's shop is hidden in a grove west of the station: a narrow path winds between enormous ancient trees with tangled roots, ferns, moss and logs, and ends at a massive banyan with a small wooden door in the gap between its roots. It is concealed but recognisable, never a standalone house or a floating door, and the path never gets stuck. Seven lanterns hang in the banyan. (2026-10-18)

**The 3D buildings** (2026-10-18, after the first HD-2D vignette)
- `[Decision]` Buildings are 3D models, as Octopath Traveler builds its towns: walls, sloped roofs with eaves, gables, chimneys and porches, each face a picture drawn in code (`game/ArtSource/model.js`). The sun shades each face by how it turns and casts real shadows. Trees, props and ants stay upright cards. (2026-10-18)
- `[Decision]` The camera looks down 35 degrees with a 42-degree field of view, so the sides and roofs of buildings show. The depth of field keeps the blur level approved before. (2026-10-18)
- `[Decision]` After dark, lights glow on what is near them; ants catch a rim of light along their tops at dusk and night, and each casts a small dark spot where it stands. (2026-10-18)
- `[Decision]` Marlow's shop is an old shopfront at the end of the grove path, grown into the ancient tree behind it and covered in its roots, ivy, moss and ferns. By day its door is closed with a CLOSED card on it; its seven lanterns hang from its front verges and go out one per night resolved. This replaces the door in the banyan's roots. (2026-10-18)
- `[Decision]` The courier faces the camera and turns away from it as well as left and right: walking mostly up or down the screen shows its front or back for standing, walking, running and carrying. Talking, giving and the other poses stay side-on. Villagers get the same later. (2026-10-18)
- `[Decision]` (sizes revised 2026-10-18, see the next decision) Once this look is approved, each area grows to about 1600x1200 art px with 8–15 buildings, all in 3D, and the layout is reworked. Villagers come after the world. (2026-10-18)
- `[Decision]` The Centre's houses are built from one kit, as Octopath's are: each stands on a stone plinth with three steps up to its door, its walls set back under a tiled gable roof whose deep eaves shade the top of the walls, windows with flower boxes, a lantern by the door that glows and lights the ground after dark, and a chimney; a gabled bay can stand out over the door (the hall, the post office), with signs and awnings hung out over the street. They stand shoulder to shoulder, so the streets have walls. Areas are sized to stay packed rather than to a fixed size: the square is 1280x1040 with 11 buildings, five along a terrace with three stairs down to a paved plaza. Tried on the square first; approved, so the other areas follow. (2026-10-18)
- `[Decision]` The station, the east and the coast are rebuilt with the same kit, each in its part of town's own materials (the West's rough stone and slate, the East's pastel clapboard and stilts, the coast's bleached boards and weathered blue). Only the buildings the story names are houses: the station, Helen's, Mender's by the forge and Bram's carriage; Nora's, Satria's, the Gardener's and Leo's lookout; Theo's studio, the salt store and Arlo's. The space between them is filled with what belongs to the place (the goods yard, gardens and a well, the orchard, the glasshouse and the playground, fish racks, nets and boats on the sand), never with repeated filler houses. Anything on the camera's side of where the courier walks stays low, since a tall building there blurs over the view. Stairs are real steps as wide as their road: flat treads and upright 4 px risers, cut a tile back into the level above. (2026-10-18)
- `[Decision]` The station is one place, not a single building beside a train: the line runs along the back, and the rails, the platform, the tea stall, the water tower and the hall's forecourt stand together on one paved terrace walled in rough stone, the hall at its east end facing the camera. Stairs lead up from the goods yard below, under the hall's door and at the platform's west end. Helen's cottage stands at the terrace's west end, with her herb garden below the wall. Nothing tall stands on the camera's side of the platform. (2026-10-18)
- `[Decision]` Bellwood has no welcome arch. Travellers arrive by rail, so the station is the town's front door and the hall's BELLWOOD name board greets them; an arch over the path up to the station read as the way into town, the wrong way round. A STATION waymark stands where that path leaves the road, like the waymarks at the areas' exits. This replaces the overhaul design's "each zone is entered through a recognisable gateway" for the West: its gateway is the station itself. (2026-10-18)
- `[Decision]` (revised 2026-10-18, see the camera below) No area ends in a void: the land goes on past its edges, where the forest continues and the roads and rails that leave it run on out of sight, though only the area itself is walked. Each exit has a waymark naming the next area, its lantern lit after dark. (2026-10-18)
- `[Decision]` The game is made and checked at a fixed 1920x1080 (Full HD). (2026-10-18)

**The camera, after studying Octopath Traveler 2** (2026-10-18)
- `[Decision]` The camera stands back as Octopath's does: it shows about 640x360 art px (each art px 3 screen px at 1080p), so the courier is about a tenth of the screen's height. A strong depth of field keeps a band round the courier sharp and blurs what is nearer and farther, like a miniature, under a darker vignette. This replaces the close camera of 2026-09-29; the UI keeps its scale. (2026-10-18)
- `[Decision]` (edges revised 2026-10-18, see the next decision) The camera may look up to 96 art px past an area's edge, so the courier is never pinned to the side of the screen. Past the edges the land fades into a pale haze, graded for the time of day (warm by morning, deep blue at night), never into black: darkness read as a horror game. (2026-10-18)
- `[Decision]` Nature closes every area's edges, with no fade: the haze read as pollution. Past the edges the forest is solid, standing close up to the roads and rails that leave, with its floor deep green in the shade of the crowns. Each road leaves through a doorway of ancient trees, one either side, except on the camera's side, where a tree would stand in front of the area. Toward the camera the edge is a dense, low hedge. Rails leave through a tree-lined cutting. Tried on the station and the square first; approved for every area. (2026-10-18)
- `[Decision]` Toward the camera (the last 120 art px of an area) the forest stays low, bushes only, so it frames the place without hiding the courier. Paths and grass carry fine grit, and lamps light the ground further round them. (2026-10-18)

**Characters and art**
- `[Decision]` Every character is an ant: chunky, expressive reddish-brown ants as drawn in `presentation/chars.js`. (2026-09-13, reaffirmed 2026-09-26)
- `[Decision]` The protagonist, Satria in the GDD, is drawn as the ant courier with a green cap and a green bag. (2026-09-26)
- `[Decision]` The palette is bright and light, and pixels stay crisp at whole-number scales. Dusk and night stay pastel and readable, never dark or muddy. Environments are full of small ambient motion. (2026-09-26)
- `[Decision]` The game has no fishing mechanic and is not a timed delivery game. (2026-09-26)

**Carried over from the Godot build** (design choices, not engine code)
- `[Decision]` (camera revised 2026-10-18, see the camera above) The camera is close: it shows about 320x180 art pixels of the world, each drawn 2x on a canvas of at least 640x360. The UI uses that finer canvas. (2026-09-29)
- `[Decision]` Controls: mouse and keyboard. Click to walk or use something, or walk with WASD or the arrow keys and use things with Space or Enter. E opens the bag, I inspects, Esc opens the menu. The GDD adds R to retry a minigame. Holding Shift runs (2026-10-18). (2026-09-28)
- `[Decision]` The game's text is in English. Indonesian may be added later. (2026-09-28)

**Canon boundaries**
- `[Decision]` The earlier browser prototype, its two test cases (a wooden songbird and a mended ribbon) and all AI-generated art are retired. (2026-09-26)
- `[Decision]` Difficulty scores are the team's own estimates, not industry data. (2026-09-26)

**Sharing**
- `[Decision]` Shareable pages are hosted on Vercel, not Claude Artifacts. (2026-09-26)
- `[Decision]` The project lives in a public GitHub repo, `praffiii/the-shop-that-opens-once`. (2026-09-26)
- `[Decision]` The PDFs in `docs/` are published as they are, including the team's student IDs. The GDD is stored compressed (images at 200 dpi) to keep the repo small. (2026-09-28, GDD 2026-10-18)

## The game at a glance `[GDD]`

| | |
|---|---|
| Title | The Shop That Opens Once |
| Genre | 2D pixel-art narrative adventure: a cozy, melancholic mystery |
| Logline | Satria, an ant courier from the city, comes home to Bellwood to sell the late parents' house. A shop that opens only at midnight, in the roots of an old banyan by the station, gives Satria one last job: return seven keepsakes to the villagers. Along the way Satria uncovers the parents' sacrifice and chooses between going back to the city and staying. |
| Themes | Loss, regret, memory, sacrifice and accepting the past |
| Player feeling | Empathy, reflection, and a calm, bittersweet coziness |
| Audience | Ages 16–35, rated Everyone 10+ / Teen for themes of grief. Story-rich and cozy players, and fans of nostalgic pixel art. |
| Length | 1–3 hours over seven nights (section 2.2 says 3–4; see Known inconsistencies) |
| Players | Single-player |
| Failure | None. No combat, health, timer or game over. |
| Platform | PC (Steam) first, mobile later |

Design pillars:
1. **No quest markers.** No arrows or checklists. The player matches clues from inspecting keepsakes (a station serial number, hands stopped at 10:17, a kind of stitching) with what residents say.
2. **Things connect people.** Every keepsake is a bridge between characters.
3. **Kindness over winning.** Wrong guesses get a puzzled reply or a new hint, never a penalty.
4. **A miniature fable.** An anthropomorphic ant colony lives among human leftovers, such as a walnut-shell cup or a station clock. Overridden: Bellwood is an ant planet with no humans; the clock and the cup are ant-made `[Decision]` (2026-10-18).
5. **Restoration minigames.** Tactile minigames (calibrating gears, stitching a patchwork, tuning a radio) with instant, penalty-free retries.

## World and story `[GDD]`

**Premise.** Satria spent eleven years as an express courier in the metropolis and comes home to the rural ant colony of Bellwood only to settle the deed and sell the late parents' house (Ibu Ratih and Ayah Satria) to a city property agent. A brass bell leads Satria to The Shop That Opens Once: Marlow's old shop in the roots of the banyan tree by the station. It opens only from 00:00 to 00:30, for those with unfinished business. For seven nights Marlow gives Satria one relic box a night.

**Bellwood** is built from natural materials: twigs, roots, walnut shells and leaves. It has four zones joined by footpaths, with no loading screens between them:

| Zone | What is there |
|---|---|
| West: station and old rails | The abandoned station, its tower clock frozen at 10:17, Helen's tea stall on the platform, Mender's forge, mossy sleepers, and the banyan where Marlow's shop appears |
| Centre: square and market | A gravel square with a walnut-shell fountain, Mia's vegetable stalls, Baker's bakery, the notice board, and Sam's village hall with its underground archive |
| South: coast and cliffs | Arlo's leaf-rotted jetty, a small lighthouse, the salt store, the remains of the 1952 rope bridge, and stone steps up to Theo's cliff-top studio |
| East: homes and flower garden | Stilt houses, a wooden bus stop, Gardener's chamomile garden, Pip's twig swing, Nora's house, and Satria's childhood home |

Paths: West–Centre, Centre–East and Centre–South.

**Nine interiors** can be entered: Satria's childhood home, Marlow's shop, Helen's tea stall, Mender's forge, Baker's bakery, Sam's archive and vault No. 7, Theo's studio and darkroom, Nora's loom house, and Arlo's salt store.

**Lore.** Twenty years before the story, in 1952, a great storm and flash flood hit the Bellwood estuary. It brought down the south bridge and cut the railway for good. At 10:17 that night the last steam train was in danger. Satria's parents and the village elders gave up their tickets to move to the city to help: they led the bridge repairs and sewed warm clothes for the children. Traces of that kindness are left in the relics in Marlow's shop.

**Story arc:**
1. **Inciting incident.** Satria arrives at dusk with the sale contract from the city agent. That night Marlow's shop appears.
2. **Rising action (Nights 1–6).** Satria receives a relic each night, restores it through a minigame and returns it, and slowly understands why the parents stayed.
3. **Climax (Night 7).** Every lantern is out and the shelves are empty. Satria receives the family's walnut music box and Ratih's last letter.
4. **Ending (Day 8).** In the square, before the agent and the whole village, Satria tears up the contract, refuses the city's compensation, stays and reopens the village post office. Time in Bellwood flows again.

## Characters `[GDD]`

All 18 characters are ants. The GDD's colour codes are suggestions for each ant's palette.

| # | Character | Role | Story |
|---|---|---|---|
| 1 | Satria | Playable courier | Left at 17, thinking the parents were "stuck" in a poor village. Both parents died while Satria was building a city career; Satria carries the regret of never saying goodbye. Quiet, polite, reflective; keeps a journal. |
| 2 | Marlow (Marcus Bell) | Keeper of the midnight shop | Station master in 1952. Out of guilt over the station's closing, Marlow keeps the shop to help others finish their unfinished business. Speaks in parables and never dictates. |
| 3 | Helen | Runs the tea stall on the dead platform | Ratih's best friend. Still waits for a train, and a love, that never came back after 1952. |
| 4 | Pip | Little post-office apprentice | Mia's child; dreams of becoming a great courier. Terrified of thunder since the storm and soothed only by Mochi, a patchwork rabbit Ratih made. |
| 5 | Nenek Nora | Village elder and weaver | Sewed warm clothes with Ratih at the storm shelter in 1952. |
| 6 | Theo | Cliff-side photographer | Withdrew from village life after best friend Daniel died. Keeps Daniel's undeveloped 8mm film. |
| 7 | Sam | Village archivist | Strict and rule-bound but honest. Guards the 1952 archive and vault No. 7 from damp and from the land deal. |
| 8 | Leo | Former sprinter | Carries the guilt of failing to deliver an emergency message in time when the dyke gave way in 1952. Lives alone on the hill. |
| 9 | Mender | Station mechanic and blacksmith | Rebuilt the bridge with Satria's father. Blunt, loyal, expert at restoring brass. |
| 10 | Baker | Bakes at the square | Cheerful hub of village news. |
| 11 | Gardener | Keeps the flower garden | Patient and poetic; regrew the chamomile after the storm. |
| 12 | Nelayan Arlo | Fisher at the jetty | Satria's father's sailing friend. |
| 13 | Kapten Bram | Retired train driver | Blew the whistle for the last train at 10:17 on the night of the storm, and still carries the guilt. |
| 14 | Mia | Vegetable seller at the square | Pip's mother; protective and kind. |
| 15 | Agen Properti Bram | City property agent | The narrative antagonist: presses for the sale to turn the house into a resort. A deadline, not a villain to fight. |
| 16 | Ibu Ratih | Satria's late mother | A generous seamstress who gave up her ticket to care for the storm's children. Present through relics, flashbacks and her letter. |
| 17 | Ayah Satria | Satria's late father | An AM-radio builder who led the bridge rebuild and never asked for credit. |
| 18 | Daniel | Theo's late best friend | Filmed the village's important moments on 8mm. |

## Core loop and rules `[GDD]`

**One night, one keepsake:**
1. **Night: receive the relic.** At the midnight bell Satria visits the shop and receives a keepsake and a vague first hint. It goes into the courier bag.
2. **Inspect it.** In the bag the player turns the keepsake to see its front, back and sides (initials, a year, cracks, a scent). Clues go into Notes automatically.
3. **Morning to midday: explore and talk.** Satria walks the four zones, watches residents and shows them the keepsake.
4. **Afternoon: the empathy minigame.** A key witness opens a minigame (mend a stitch, tune a radio, clean a lens). Solving it unlocks the memory that names the owner.
5. **Dusk: the handover.** Satria gives the keepsake to its owner, a reconciliation cutscene plays, and one of the shop's seven lanterns goes out for good.

**Time of day.** A day has four phases: morning, midday, dusk and night. They advance with the player's progress, not with a clock. Each phase changes the light, the music and what the residents are doing. The HUD shows the day and phase on a small dial, never a digital time.

**Mechanics:**
- **Exploration.** The whole map is open from the start. Interactive things show a speech-bubble icon with three dots. What a place offers depends on the time of day and the clues found.
- **Dialogue.** A dialogue box at the bottom shows the speaker's portrait and name. After the opening lines the player picks one of two replies, and while carrying a keepsake can show it or say goodbye.
- **Bag and Notes.** Keepsakes on the left with a short description, Notes on the right. A notification at the top of the screen marks each new item or clue.
- **Clues** come from inspecting keepsakes and from minigames. They point to the next person or place. A keepsake can be handed over only after its required minigames and conversations are done.
- **Minigames.** Each fits the resident who offers it. Witnesses with clues carry no marker. Some minigames ask the player to remember earlier conversations. The GDD plans 14 or more.
- **Daily life at home.** Resting and writing the journal. Each night closes with a journal page on what Satria learned.

**Rules:**
- **Win:** finish all seven nights, open the secret drawer of Ratih's sewing table on Night 7, read her letter, and tear up the contract on the morning of Day 8.
- **No lose state:** no health, no game over, no permanent failure.
- **Minigame failure:** a friendly joke and an instant retry (R), with no penalty and no lost progress.
- **Wrong person:** a natural refusal, village gossip, or a hint toward the right witness.
- **Rewards:** no money or XP. Rewards are emotional: Notes, and the nightly journal page.

## The prologue, seven nights and epilogue `[GDD]`

Nights 6 and 7 and the epilogue are the ending. Keep them hidden as spoilers in anything shown to players.

| Chapter | Keepsake | Owner and place | Minigame or resolution | Theme |
|---|---|---|---|---|
| Prologue: The Boy Who Left (Day 0) | The draft sale contract | Agen Properti Bram; the square and Satria's home | Satria comes home, looks over the house, and finds Marlow's shop in the banyan roots | |
| 1: The Stopped Watch | A brass service pocket watch stopped at 10:17, engraved with initials | Helen, tea stall on the platform | Clean and calibrate its gears; tell her the truth about that night | Waiting |
| 2: The Stitched Rabbit | Mochi, a patchwork rabbit with a loose ear | Pip (with Mia); the square and the chamomile garden | Re-stitch the ear on Ratih's treadle sewing machine; it calms Pip's fear of thunder | Caring |
| 3: The Old Film Camera | Daniel's 8mm camera, dusty lens and undeveloped film | Theo, cliff-top studio and darkroom | Clean the lens and develop Daniel's last film of the villagers | Remembering |
| 4: The Key With No Engraving | A plain black iron key | Sam, the village hall archive | Find the combination of vault No. 7 and open the 1952 storm-aid register | Preserving |
| 5: The Mismatched Running Shoes | Spiked running shoes, one worn sole, dried mud | Leo, the hilltop | Restore the sole with damar resin; Leo lets go of the late message | Moving on |
| 6: The Deer Leather Ledger | The 1952 deer-leather ledger of debts and aid | Marlow, the shop | Read it with Marlow; it reveals the parents' sacrifice | Letting go |
| 7: The Unsigned Letter and Music Box | The walnut music box and Ratih's letter | Satria, the childhood home | Open the sewing table's secret drawer with the inherited key, wind the music box, read the letter | Choosing |
| Epilogue: The Morning After (Day 8) | The torn contract and a new post stamp | Agen Properti Bram and the whole village, the square | Refuse the offer, tear up the contract, reopen Bellwood's post office | |

**Each night's emotional obstacle** (the "bosses" are inner walls, not enemies):

| Night | Who | How they shut Satria out | The root |
|---|---|---|---|
| 1 | Helen | Stiff; won't talk about trains and keeps busy brewing tea | Waiting since 1952 for a love who never came |
| 2 | Pip | Hides and cries at thunder | Storm trauma and a lost comfort toy |
| 3 | Theo | Cynical; locks the studio and won't develop the old film | Guilt over Daniel's death |
| 4 | Sam | Refuses access to the vault | Fear that the 1952 archive will be misused by the city |
| 5 | Leo | Hides on the hill; harsh about the past | The emergency message that arrived too late |
| 6 | Marlow | Speaks only in riddles | Takes the blame for the station and the village's decline |
| 7 | Satria | Wants to sell and leave | Not being there at the end of both parents' lives |
| Day 8 | The agent | Pushes for the signature with city money | A city that would flatten Bellwood's history |

**Difficulty curve.** Days 1–2 stay around the station and the square (Helen, Mender, Baker, Mia, Pip). Days 3–4 reach Theo's cliff and Sam's vault. Days 5–6 go deeper with Leo, Nora and Mender. Day 7 brings every zone together.

**The Godot MVP's clue chains** (Arthur Tate's watch at 18:17 and Nora the toymaker's doll) belong to the retired story. They are archived in `archive/godot-mvp/nights/` and are not canon.

## UI `[GDD]`

The UI is minimal: no health bar, timer, minimap or quest markers. Panels are warm cream `#FFFAF0` with dark brown text `#2A1B22`.

- **Screens:** the title (Begin, Continue when a save exists, Quit on desktop only); exploration; the pause menu (Keep playing, Sound on/off, Back to the title); the bag; close inspection; dialogue; full-screen story cards with a lantern at the start and end of each night; minigames. Progress saves automatically at the end of each night.
- **HUD:** the bag icon top right; notifications top centre for 4 seconds; an interaction bubble over nearby things; an object's name next to the cursor; the dialogue box (moves to the top if it would cover a character), with a portrait that talks and blinks, the speaker's name, text typed at 50 characters a second and a "next" arrow; choices; a pixel cursor; and the day-and-phase dial top left.
- **Bag:** a 400x230 panel. Keepsake slots and their names on the left, Notes on the right, and "E or Esc to close".
- **Type:** Pixelify Sans for titles, chapter cards, place names and speaker names. DM Sans for dialogue, item descriptions and Notes. Both are already in `presentation/fonts/`.
- **Icons:** 16x16 and 24x24 with a thin dark-brown outline. A "..." bubble over people, a "?" magnifier over things to inspect, sun, lantern and moon phase icons, and a satchel with a gold dot when something new arrives.

## Audio `[GDD]`

All of it is synthesized or recorded from scratch `[Decision]`, as the Godot build did with `presentation/audio.js`.

- **Music:** 60–80 BPM, organic instruments: upright piano (Satria and home), nylon guitar (village days), celesta and music box (the shop and the keepsakes), low cello (confessions). Music cross-fades between zones and phases. Six planned tracks: *Quiet Station at Dawn*, *Bellwood Marketplace*, *The Cliff of Lingering Waves*, *Mother's Loom and Memories*, *The Shop at Midnight* and *Uncut Letter* (the epilogue and credits).
- **Footsteps** on six surfaces: wet soil, creaking boards, gravel, wet sand, grass and tiles.
- **Object sounds:** a watch ticking, cloth, the 8mm shutter, a key, a music box spring, a lantern going out.
- **Ambience by phase:** sparrows in the morning, a murmuring market at midday, waves and wind at dusk, crickets and dew at night.
- **Voices:** no voice acting. Each character has their own pitch of short dialogue blips: calm and middling for Satria, high and quick for Pip, low and heavy for Marlow. A soft chime marks a new clue, and a warm low note marks a lantern going out.

## Art `[Decision]` `[GDD]`

- **View:** angled top-down (3/4) pixel art like the Bellwood village in `presentation/world.js`.
- **Light:** four phases: a golden dawn, a soft bright midday, an orange dusk, and a blue night glowing with gold lanterns. All stay pastel and readable.
- **Palette groups** from the GDD: cream `#FDFBF7` `#F4EFE6`, timber brown `#8B5A2B` `#5C3A21`, midnight navy `#0F172A` `#1E1B4B`, autumn amber `#D97706` `#F59E0B`, moss green `#3F6212` `#65A30D`. Keep night colours light enough to read.
- **Characters:** chunky ants with one big eye, thin legs and antennae, from `presentation/chars.js`. The presentation has 15 ants; the GDD needs 18.
- **Asset list:** Satria walking in 4 directions, idle, inspecting, and four portrait moods (neutral, surprised, tired, moved). Marlow behind the counter. Idle and talking sprites for the residents, with translucent silhouettes for Ratih, Satria's father and Daniel. Tilesets for the four zones, props for the nine interiors, and the seven keepsakes.
- **Pipeline:** made from scratch only, in `game/ArtSource/` `[Decision]`. Each place is drawn once, at midday, and graded per day phase in the game's shader; lights are drawn separately and never graded `[Decision]` (2026-10-18). This replaces drawing a variant per phase.

## Production and scope

**Milestones** `[GDD]`. This is the GDD's plan, not yet a confirmed one:

| Weeks | Work |
|---|---|
| 1–2 | Movement controller, collisions, a smooth follow camera, dialogue box, door transitions; a vertical slice of Night 1 |
| 3–5 | Sprites and portraits for 18 characters, tilesets for 4 zones and 9 interiors, 6 music tracks, footsteps and voice blips |
| 6–7 | Bag and inspection, minigames, all chapters from the prologue to the epilogue |
| 8 | Playtesting for pacing and soft-locks, lighting and fog polish, the final PC build |

**Systems needed** `[Report]` `[GDD]`: movement, NPC interaction, dialogue, the bag, inspection, clues and Notes, minigames, chapter progression, the day-phase system, saving, scene management. Not needed: combat, enemy AI, multiplayer, procedural generation, complex physics or online services.

**Where the difficulty is** `[Report]`. These are team estimates.
- **Overall: 8/10.** The difficulty is content, consistent pixel art, story and clue design without markers, not code.
- **By discipline:** programming about 6/10, pixel art and animation about 8/10, narrative and game design about 9/10.

**Main risks** `[Report]`:
- **Clue clarity without markers.** Playtest every night to check that players can solve it on their own.
- **Consistent pixel art** across 18 characters, 4 zones and 9 interiors.
- **Tying systems to the story.** Dialogue, the bag, minigames, day phases and chapter state all depend on story progress.
- **Scope.** The GDD's 14+ minigames, 18 characters and 9 interiors are far larger than the Godot MVP.

**References** `[GDD]`: Coffee Talk (dialogue and atmosphere), To the Moon (memory as the driver), A Space for the Unbound (a living small town). Tools: Aseprite for sprites; Figma, Canva or Ibis Paint X for UI layouts.

## What's in this repo

| Path | What it is |
|---|---|
| `docs/game-design-document.pdf` | The UTS GDD `[GDD]` |
| `docs/feasibility-report.pdf` | The feasibility report `[Report]` |
| `docs/concept-proposal.pdf` | The earlier concept proposal `[Proposal]` |
| `game/` | The Unity 6.6 project |
| `game/ArtSource/` | The art and sound, drawn and synthesized in code, and the exporter |
| `docs/devlog/` | The dev log, one entry per step, in Bahasa Indonesia |
| `.mcp.json` | The Unity MCP server for Claude Code |
| `presentation/` | The web presentation, frozen, live at https://the-shop-that-opens-once.vercel.app. It still tells the earlier story. |
| `archive/godot-mvp/` | The Godot 4 MVP, archived and untouched |

## Known inconsistencies

**Inside the GDD**
- **Length:** 1–3 hours (1.3) against 3–4 hours (2.2).
- **When keepsakes are handed over:** the shop opens at midnight (2.1, 5.1), but 2.1 also says keepsakes "wait to be returned at dusk", and the loop hands them over at dusk.
- **Perspective:** 1.3 says side-scrolling and top-down hybrid with a micro-isometric angle. The art decision is 3/4 top-down.
- **Lanterns:** 2.2 has the seventh lantern go out on the last night; 5.4 has all lanterns already out when Night 7 begins.
- **The ending:** 2.2 and 5.4 let the player choose to leave or stay; 4.4 makes tearing up the contract the canon win condition.
- **Two Brams:** Kapten Bram and Agen Properti Bram share a name. Kapten Bram is called both a train driver (*masinis*) and a conductor (*kondektur*).
- **Helen:** she runs a tea stall on the platform (West zone) everywhere except 5.2, which gives her a grocery stall in the Centre zone. Resolved: the tea stall on the platform (2026-10-18).
- **Leo:** lives on a hilltop (Night 5), but the four zones have no hill, and 8.2 places Leo in the East garden. Resolved: a hill in the north-east of the East zone, above the garden (2026-10-18).
- **Day 7 vs Day 8:** 8.2 puts the contract climax on Day 7; everywhere else it is the morning of Day 8.
- **Engine:** the GDD still weighs Godot 4 and Unity. The user chose Unity.
- **Where Marlow's shop is:** the text puts it in the banyan roots by the station (West zone), but the Centre zone map's legend lists "Toko Marlow". Resolved: the banyan in the West (2026-10-18).
- **Typos:** the title appears as "The Shop That Once Opens" in 4.3, and table 6.1 numbers Mender 9 before Leo 8.

**Between the GDD and decisions or the repo**
- **AI assets:** section 13.3 plans Midjourney, FLUX and Suno. The decision is no AI; 13.3 is for the formal report only.
- **Night palette:** the GDD's midnight navy and fog read dark; the decision keeps night pastel and readable.
- **Human leftovers:** the GDD (1.5, 5.2) has the ants live among things humans left behind. The decision is an ant planet with no humans.
- **Animals:** the GDD's world has no rule on animals; the old map had hens, a cat and gulls. The decision is bugs only.
- **The 18:17 motif is gone.** The GDD moves the frozen time to 10:17, the storm's night. The presentation's title lettering, shop clock and story still use 18:17, and so does the art carried over from Godot that is not redrawn yet (the title, the shop clock and the watch's A.T.). The redrawn world's station clock reads 10:17; the rest is redrawn with the interiors and keepsakes.
- **The presentation** is frozen with the earlier story (Arthur Tate, Elise, Sam as a child, a dusk shop) and 15 ants, not 18. That is expected.

## Open questions

**Technology and pipeline**
- Under which URL does the Unity web build go live?
- Camera: zoom in during conversations? The user wants this later, not now (2026-09-29).

**Game design**
- By day, does the banyan's root gap show the closed door, or nothing at all? The shop opens only from 00:00 to 00:30.
- Day phases: what exactly moves time forward: each clue, each conversation, or entering a new zone?
- Is the ending a real choice, with a "leave" ending, or only the canon "stay"?
- Which minigames, and how many: one per night, or the GDD's 14 or more?
- Saving, chapter select, text speed and other accessibility options.

**Story**
- Satria's pronouns.
- Night 1: what the watch's engraved initials are, who Helen waited for, and the "truth" Satria tells her.
- Night 2: Mochi was made by Ratih. Why does Satria have it now?
- How the two Brams are told apart, or whether one is renamed.
- What Ratih's letter says.

**Business**
- The business model, release targets and schedule. The concept proposal's pricing ideas have not been carried over.

## Team

SE.3 · Kelompok 1: Andika Rafa Akbar (2410511026), Praffi Ramadhani (2410511028), Khairul Insan (2410511018), Dara Dwi Hidayat (2410511084) and Piere Valkyrie (2410511152).

## Glossary

- **Keepsake** (in the GDD, *benda peninggalan* or *relik*): the object Marlow hands out each night. It belongs to a resident's unfinished story.
- **Night** (a chapter): one keepsake, from receiving it at midnight to handing it over at the next dusk.
- **10:17:** the time the 1952 storm cut the railway. The station's tower clock, the shop's pendulum clock and the Night 1 watch are frozen there.
- **Lantern:** one of the seven in the shop. One goes out for each resolved night.
- **Notes:** the clue list inside the courier bag.
- **Day phase:** morning, midday, dusk or night, which moves with the story.
- **No quest markers:** no arrows, waypoints or checklists. Players find each owner by observation and conversation.
