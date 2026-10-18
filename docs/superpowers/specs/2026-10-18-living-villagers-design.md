# Living villagers: Bellwood's ants at home, at work and on the move

Date: 2026-10-18. Status: approved by the user, 2026-10-18.

## Why

The world is built: five areas in the HD-2D view, every story building in 3D, edges closed by forest. But it is empty
of life. Only Helen and Marlow stand in it, side-on, still. `GAME-CONTEXT.md` already decided what comes next
(2026-10-18): "Villagers live like NPCs in Harvest Moon or Stardew Valley: homes, work and routines across the four
day phases, plus unnamed background ants", built after the world and before the nine interiors.

The GDD asks for the same: in the morning Bellwood has "aktivitas pasar, serta suara burung dan percakapan warga yang
menciptakan kesan hidup dan bersahabat"; the time of day changes "suasana lingkungan, aktivitas NPC, dan perkembangan
cerita"; places can have "NPC, interaksi, dan percakapan yang berbeda tergantung waktu"; and from morning to midday
Satria "mengamati aktivitas warga".

**Success:** walking any area in the morning, at midday or at dusk, you see the villagers who belong there doing
something that is clearly theirs, and a few unnamed ants going about their trades, so the town feels alive.

**What would make this a failure even if it technically works:**
- villagers who stand still like statues, or face sideways whatever you do;
- background ants that are visibly the same ant, walking the same loop;
- crowds that block roads, stairs or doors, or that trap the courier;
- villagers that interrupt the player or need the player to wait for them.

## What the user agreed (in conversation, 2026-10-18)

The picture below was played back from the GDD, and the user answered "okay we align and we good".

- **Time moves with the story, not a clock** (GDD: the four phases advance with the player's progress). So a villager
  has no minute-by-minute schedule: for each phase they have **a spot and an activity** you can see them doing, and some
  make **short walks** within the phase.
- **Each activity comes from their character in the GDD.** The table below is that picture.
- **At night everyone is home**, their windows lit (the night belongs to Marlow's shop).
- **Unnamed background ants**, known by their trade, walk set routes between places (carrying sacks, sweeping,
  chatting in pairs), so the roads are never empty.
- **Every villager turns four ways** like the courier, **faces the courier** when talked to, and **stops walking**
  while talking.

## The routines

Areas and spots follow the world as built (`areas.js`). Unless marked otherwise, each line is the picture the user
agreed; the exact spot is the builder's, close to the place named.

| Villager | Morning | Midday | Dusk |
|---|---|---|---|
| Helen (station) | brewing tea at her stall on the platform | serving at the stall, wiping cups | on the platform bench, looking toward the tunnel, still waiting for the train |
| Kapten Bram (station) | pacing the platform under the tower clock, frozen at 10:17, checking it against the timetable board as if the train might still come; he carries no watch (see below) | on the porch of his carriage, polishing the whistle *(my call)* | at the platform edge by the old engine *(my call)* |
| Mender (station) | hammering at the forge's anvil | working on the old engine *(my call)* | at the forge *(my call)* |
| Baker (square) | setting loaves out at the bakery | at Mia's stall, trading gossip | sweeping before the bakery *(my call)* |
| Mia (square) | setting out her vegetable stall *(my call)* | selling at her stall | walking home with Pip from the stall to their door, and going in *(my call)* |
| Pip (square, east) | running letters between the post office and the houses; the office stays shut (see below) | at the playground in the east *(my call)* | home with Mia, before dark (the thunder trauma) |
| Sam (square) | sweeping the hall steps | at the notice board *(my call)* | locking the hall doors *(my call)* |
| Nenek Nora (east) | weaving on her deck | weaving on her deck | sitting on her steps *(my call)* |
| Gardener (east) | watering the chamomile | in the glasshouse or the garden rows *(my call)* | on the orchard bench *(my call)* |
| Leo (east) | running laps of the east lane | up at the lookout *(my call)* | up at the lookout with the telescope |
| Theo (coast) | photographing from the bluff | at the studio door *(my call)* | on the bluff with the camera at sunset *(my call)* |
| Arlo (coast) | fishing off the jetty | mending nets by the fish rack | sitting on the jetty *(my call)* |

Marlow keeps to the shop at night. Agen Properti Bram is not part of any routine: he appears where the story puts him
(the prologue and the epilogue).

**No watches outside the keepsake.** Night 1's keepsake is a brass railway pocket watch stopped at 10:17, and its
owner is on the station platform. Players find owners by matching what they see, so no villager carries or shows a
watch: Kapten Bram reads the tower clock instead (the user's choice, 2026-10-18).

**The post office stays shut.** It has been closed since the storm so that Satria can reopen it on Day 8
(`GAME-CONTEXT.md`, 2026-10-18), and nothing here may make it look open: its door, sign and windows don't change. Pip
keeps the post going on his own: he sets off from its shut steps with a satchel of letters, and walks them to doors
*(my call)*.

**The story wins.** A chapter can move or hide any villager (`Person.Chapters` already exists for this); where it
does, its placement replaces the routine for that chapter. A keepsake's owner must be findable at dusk for the
handover, so a chapter that needs someone elsewhere at dusk says so.

## Background ants (my calls, within what was agreed)

- Two to four per area by day, each known by a trade and dressed for it (a porter with a hand cart at the station, a
  shopper and a sweeper in the square, a farmhand with a basket in the east, a fisher with a crate and a salt worker
  with a sack on the coast, two neighbours chatting). No two in view look alike: each takes its own colours and a
  carried prop.
- Each walks a set route of points on walkable ground, pausing at the ends (setting the sack down, chatting), or works
  in place.
- None at night.
- Talking to one gives one short line in their voice, never a clue (GDD: "Tidak semua NPC memberikan petunjuk").

## How villagers behave

- **Four ways.** Villagers stand and walk facing the camera, away from it, left and right, as the courier already does
  (`chars.js` front and back views of `idle` and `walk`).
- **Activities read at a glance** at the camera's scale (about 640x360 art px on screen, one art px 3 screen px): a
  looped pose with a held prop, or a pose next to a prop card (the anvil, the stall, the loom). Activities can share a
  small set of poses (working with the hands, sweeping, sitting, looking out) with a different tool in hand; the
  builder decides how many poses that takes.
- **Talking.** When the courier talks to a villager, the villager stops, turns to face the courier, and turns back to
  their activity afterwards. Talking, giving and the other poses stay side-on, as they do for the courier
  (`GAME-CONTEXT.md`, 2026-10-18), so "facing the courier" means turning to the courier's side. Today's chapter
  dialogue keeps working as it is; a villager the chapter has nothing for answers with their default line.
- **Walking never gets in the way.** A walking ant never blocks a road, stairs or a door for long, and never traps the
  courier; how (pausing, stepping aside, not colliding) is the builder's choice.
- **Phase changes** take effect when a place is entered: a villager is placed at their spot for the current phase.
  Nobody has to be seen walking from one phase's spot to the next.
- **The game is always at dusk today** (`Game.Phase` is set to `Dusk` and nothing changes it). This project adds a
  developer-only way to set the phase, so morning and midday can be seen and tested *(my call)*. It is not the
  player's way to move the day forward.

## Goals, non-goals

**Goals**
- Every named villager in the table has a spot, an activity and, where the table says so, a walk for morning, midday
  and dusk, and is home at night.
- Background ants in every outdoor area by day.
- Villagers turn four ways, face the courier in conversation, and stop while talking.
- Every routine spot and every route point is checked at export, the way anchors are now: reachable from the area's
  start. A broken spot fails the export. For a villager on a deck, porch or bench, it is the spot where the courier
  stands to talk to them that must be reachable, not the villager's own feet *(my call)*.

**Non-goals**
- Writing story dialogue for every villager in every phase. Story lines come with the chapters. This project gives each
  named villager one default line per phase, so talking to anyone always gets an answer (my call).
- Interiors (the next project), gifts, friendship, shops and a real-time clock.
- Pathfinding: routes are fixed points.
- Deciding what moves the day forward (still an open question in `GAME-CONTEXT.md`). This project only reads the
  current phase.

## Constraints

- Everything is drawn in code in `game/ArtSource/` (`chars.js` for the ants) and exported. Nothing AI-made.
- `presentation/` and `archive/godot-mvp/` are not touched.
- PlaythroughTest and RunTest must keep passing. Add focused tests only where they guard something real (for example,
  that a villager's spot is chosen by phase and that the chapter's placement wins).
- Before scaling: show one vignette first, the station in the morning with Helen, Kapten Bram, Mender and a porter, for
  the user to judge, then the rest.
- A devlog entry in Indonesian after each step, and decisions recorded in `GAME-CONTEXT.md` with their date.

## The cast as drawn today, and what is missing

`chars.js` has: courier, marlow, mother, helen, mender, traveller, nora, mia, grandkid, theo, leo, sam, baker,
gardener and kid. Some come from the retired story:

- **Sam** is drawn as a child (the retired story's Sam). The GDD's Sam is the hall's archivist, an adult. Needs
  redrawing.
- **Pip** (Mia's son, the post office's young apprentice) has no sprite of his own; `kid` or `grandkid` may serve.
- **Kapten Bram** and **Nelayan Arlo** have no sprites.
- Background ants need a few bodies and trade outfits that can be recoloured.

## What is left to the builder

- Where routines live in code (a table keyed by villager and phase, next to `Places.cs`, is the obvious place), and
  how the place spawns villagers from it.
- The exact spots, routes, poses and props, within the table.
- The default lines (short, in each villager's voice, in English like the current dialogue).
- How walking ants avoid the courier.
- Anything the engine caps today that more ants will hit (for example, the ground shadows have room for only 8 ants
  per area).
