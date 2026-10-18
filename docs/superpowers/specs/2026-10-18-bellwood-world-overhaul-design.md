# Bellwood world overhaul: an ant planet that feels alive

Date: 2026-10-18. Status: design, awaiting the user's approval.

## Why

The first redraw of Bellwood (dev log 04, tag `m2-world`) works in the game but fails as a place. In the user's words:
the map "feels so empty", "too small", "not live", "monoton, everything it's same", and "the tree, the house, all
feels same". You can see all of it in about a minute. The user wants a world that is a pleasure to explore and feels
lived in, like Harvest Moon or Stardew Valley: "villagers walking around, animals moving, shops open, busy streets,
every building looks different".

**What would make this a failure even if it technically works** (the user's own test): it still feels empty, or the
buildings still look the same.

## The four projects

The overhaul is four projects, in this order. This document designs the first two in full and records what is
already decided about the last two; each of those gets its own short design talk before it is built.

1. **The look.** A new ant-planet building and prop kit, bigger buildings, ground with levels, dense props, bugs as
   animals. Proven on one zone (the West) for the user to react to before it scales.
2. **The big world.** All four zones laid out and drawn at the new size.
3. **Living villagers** (later design talk). Routines across the four day phases, background ants, moving bug animals.
4. **The nine interiors** (later), in the new style, reusing the new kit.

## Decisions taken in this design (the user's)

- **An ant planet.** No humans exist and nothing human is left lying around. Ants build everything themselves, from
  nature (twigs, bark, leaves, walnut and acorn shells, mushrooms, pebbles, clay, reeds) and from their own crafts:
  woodwork, stone, iron from the forge, glass. The railway, the train, the station clock and the lighthouse are ant
  technology. This departs from the GDD's selling point 1.5 ("human civilisation's leftovers" as witnesses), and must be
  recorded in `GAME-CONTEXT.md` as a decision that overrides it, with the reason: a world with human leftovers raises
  questions (where did the humans go?) that the story never answers, and the "modern" railway felt out of place in a
  natural-materials world until it became ant-made.
- **Natural-materials look** (option B in the brainstorm sketches): walnut-shell and acorn houses, leaf roofs, twig
  fences, mushroom street lamps, pebble paths, and plants that tower over the roofs (clover, dandelions, grass blades,
  ferns), so the ants feel small.
- **Bigger.** Walking past everything once should take minutes, not one minute. The world grows with new places and
  purposeful space, never with stretched grass.
- **Bigger buildings.** Houses must read as real places next to the ants, not toys.
- **Every zone, and every building, has its own character.**
- **Villagers act like NPCs in Harvest Moon or Stardew Valley** (project 3).
- **Getting around: run with Shift.** Holding Shift makes the courier run. No fast travel and no map (the GDD already
  rules out a minimap and quest markers). Every story place sits close to the main road and the bridges; the extra
  exploring space lies off to the sides, so the story's back-and-forth stays short.
- **Homes for the named villagers.** The world places a home for each named villager who lives in Bellwood. Extra
  buildings belong to unnamed ants known only by their trade (a cooper, a reed weaver, a seed seller): no names, no
  backstory. Each placement is recorded in `GAME-CONTEXT.md` as a decision the user can change.
- **Bugs only.** The only animals are bugs at ant scale. No hens, cats, birds or crabs; the old map's are removed.
- **References are references.** The GDD's maps and images are AI-generated: layout and mood hints only. The asset
  packs the user shared (anokolisa's free top-down pack; zedpxl's village, interior and forest packs; LimeZu's Modern
  Exteriors, which is paid) are studied for technique only. Nothing is traced, sampled, copied or downloaded into the
  project. Every pixel stays authored in code (`ArtSource/ART.md` rule 1).
- **No deadline.** Quality over speed.

## Still true from earlier decisions

One seamless outdoor map; interiors are separate places behind doors. Time of day is a shader grade on art drawn at
midday, with lights drawn separately and never graded. Helen's tea stall is on the platform (West). Marlow's shop is in
the banyan roots by the station (West). Nenek Nora's stilt house and Satria's childhood home are in the East (GDD). Leo lives on a hill in the East. The station clock is frozen at 10:17. The
ants, their portraits and the palette rules in `ART.md` (bright, light, crisp, pastel nights) stay. Our camera shows
about 320x180 art px.

## What we learn from the references

From the asset packs and the GDD's map, as technique:

- **The ground has shape.** Wide roads and plazas are bold shapes. Land sits on several levels with clear cliff or
  bank edges and steps between them. Our current ground is one flat sheet of grass with thin paths: the biggest single
  reason it reads as empty.
- **Nothing is left blank.** Every patch carries small things: stumps, stones, buckets, crates, sacks, mushrooms,
  signposts, flower clumps, tools.
- **Spaces are framed.** Yards, fields, pens and market corners are closed in by fences and hedges, so the town reads
  as places that are used.
- **Little scenes with a purpose** (LimeZu): each block is a vignette, like a garage sale with goods laid out or a
  building site, and props tell you what happens there.
- **Mixed vegetation.** Several kinds of tree and plant, in several colours, side by side; no single tree stamped
  everywhere.
- **Strong silhouettes and contrast**, so objects pop off the ground (within `ART.md`'s selective-outline rule).
- **From the GDD's map:** rivers that wind and split the land on the diagonal; grey rock cliffs between levels;
  forest filling the in-between with paths cut through it, instead of open lawn; a coast with bays and rock stacks;
  each zone entered through a recognisable gateway.

## Project 1: the look

### Scale

`ART.md` rule 6 sets a cottage's front wall at 30–36 px and its roof at 30–44 px. That is why the houses read as toys
next to a 32 px ant. New scale (it replaces rule 6's building and tree numbers; update `ART.md`):

| Thing | New size (art px) |
|---|---|
| Adult ant | about 32 tall with antennae (unchanged) |
| Door | about 38–44 tall, wider than an ant |
| Home: front wall | 48–64 tall |
| Home: roof or shell top | 44–64 deep |
| Home overall | about 110–170 wide, 100–140 tall: a house is 3–4 ants tall |
| Landmark (station, hall, banyan, lighthouse) | up to about 260 wide and 220 tall |
| Towering plants at edges (clover, dandelion, fern) | 120–260 tall |
| Ordinary trees and shrubs | 48–140 tall, in several species |

On the 320x180 view, a home fills roughly a third to half of the screen width, as in the references.

### The kit (`ArtSource/kit.js`, extended or split)

A new set of drawn building blocks, all from scratch in the existing toolkit:

- **Shells and bodies:** walnut half-shells, acorns with their caps, hollow logs and stumps, gourds, clay pots and
  domes, bark planks, river stone, iron.
- **Roofs:** big single leaves and layered leaf shingles (several leaf species and colours), bark shingles, thatch of
  grass, moss, mushroom caps.
- **Doors and windows** in several shapes (round, arched, square, shuttered), sized to the new scale, with lit
  variants for night.
- **Fences and edges:** twig fences, woven reed fences, pebble kerbs, root hedges, clover-leaf hedges.
- **Street furniture:** mushroom lamps (several species, each with a lit variant), bark benches, signposts on twigs,
  seed-pod barrels, leaf awnings, notice boards of bark.
- **Clutter:** seed and grain sacks, berry baskets, crumb crates, stacked twigs, pebble piles, snail shells used as
  planters, acorn-cap bowls, coiled spider silk rope, tools.
- **Plants:** towering clover, dandelions (some gone to seed), grass blades, ferns, moss beds, wildflowers in clumps,
  mushrooms of several kinds, reeds and lily pads, and trees of several species and seasons' colours.
- **Bugs as animals**, the only animals (still art in project 1; they move in project 3, apart from simple baked loops):
  aphids grazing in pens (ants herd them), a beetle with a cart, a snail on the road, ladybugs, butterflies, moths and
  fireflies at night, crickets, water striders on the river, a dragonfly over the reeds.

### The variety rules (the anti-sameness test)

- No two buildings share both their silhouette and their main material.
- Every building has an owner and shows it: yard props, a sign, tools and goods that say who lives or works there.
- Each zone has its own main materials and accent colours (below); a screenshot of any zone must be recognisable
  without a label.
- Trees and plants mix at least three species in any screen-sized area.
- Repeated props are varied (size, colour, flip, damage, what sits on them).

### The emptiness rules (the anti-empty test)

- No open patch of plain ground bigger than about one third of the view (roughly 110x60 art px) without a purpose:
  a field, a yard, a plaza, a pen, a pond, or forest.
- The space between places is forest, garden, field, water or rock with paths through it, never open lawn.
- Every screen-sized area has at least one moving thing and at least one small "scene" (a vignette that shows what
  happens there).

### Proving it: the West zone first

Project 1 ends with the West zone redrawn at the new scale in the new kit, running in the game, so the user can
react before the other zones are built. The West is first because it holds the station and Marlow's banyan, and the
systems test runs there. If the user asks for changes, the kit changes before project 2 starts.

*Builder's call (made in this design):* the West is built at its **final** size and position inside the new world's
frame, including all its sub-areas (station and platform, rail yard, forge yard, banyan grove), so the work carries
straight into project 2. The new scale cannot sit next to the old Centre, South and East, so while the West is
reviewed the world is the West alone: its exits towards the other zones end at the West bridge for now. The systems
test keeps working there (the shop door and Helen are in the West); the Baker, the kid and the notice board leave the
systems test until their zones exist. The old world (`m2-world`) stays in git history.

## Project 2: the big world

### Size

The adult ant walks at 56 art px a second (`Ant.Speed`). Today's map is 1536x1152, about 27 seconds across and about
one minute to see everything. Target: about 5–10 minutes to walk past everything once, which is roughly 3 times
today's width and height (about 4600x3500 art px; the builder may adjust within that range). The extra space is
filled with new sub-areas, not stretched.

### Layout

- Rivers wind and run on the diagonal, splitting the land as in the GDD's map, with bridges as the zone crossings.
- Land has levels: plateaus with rock or earth cliffs and steps or ramps between them.
- Forest fills the in-between, with paths cut through it and a few hidden corners off the main paths (a pond, a
  clearing, a lookout) to reward exploring.
- The coast has bays, rocks and a river mouth (the GDD's South is an estuary, not a waterfall).
- Each zone is entered through a recognisable gateway (a sign arch, a bridge, a gate).
- The GDD's axes stay: West–Centre, Centre–East, Centre–South.

### The zones

Each zone below lists its feel, main materials and accents, sub-areas, and signature life. Places named in the GDD are
marked GDD; the rest are environment the builder may arrange. Nothing here adds story: no new characters, events,
names or history beyond the GDD and `GAME-CONTEXT.md`.

**West: the old gate, stopped in time.** Quiet, a little melancholic. Grey stone, rust-brown iron, deep moss, dark
bark; accents of brass (the clock) and Helen's warm rose awning.
- The station and platform (GDD): the clock tower frozen at 10:17 (GDD), Helen's tea stall on the platform (GDD),
  benches, timetable boards.
- The rail yard: mossy sleepers (GDD), rusted rails, the old locomotive and wagons standing still, a tunnel,
  points and a water tower.
- Homes nearby (builder's call): Helen's by the station, Mender's by the forge, Kapten Bram's by the rail yard.
- Mender's forge yard (GDD): anvil, scrap iron, brass pieces being restored, smoke and sparks.
- The banyan grove (GDD): the giant banyan with Marlow's shop in its root gap and seven lanterns in its branches.
- Life: moths and beetles around the old lamps, crickets in the sleepers, sparks at the forge, mist in the grove.

**Centre: the busy heart.** The most people and the most colour. Warm cream, red clay brick, bright awnings, gravel
and pebble paving.
- The round gravel square with the walnut-shell fountain (GDD), benches, bunting.
- The market street: Mia's vegetable stalls (GDD) and more stalls with goods laid out.
- The bakery lane: Baker's bakery with its red brick chimney (GDD), bread racks, flour sacks.
- The hall steps: Sam's hall on the north side (GDD), the notice board (GDD).
- The village post office, closed and boarded since the storm. *Builder's call:* it stands on the square because
  the GDD's ending (Day 8) has Satria reopen it there, in front of the whole village, and Pip is its apprentice. It is
  drawn in two states, closed now and reopened for the ending; it is not one of the nine interiors. The square is
  big enough to hold the whole village for that scene.
- Homes nearby (builder's call): Baker's over the bakery, Mia and Pip's by the market street, Sam's near the hall.
- Life: the most villagers (project 3), a beetle cart, aphid-milk deliveries, kids playing.

**South: the windy coast.** Wind and waves. Sand, sea blue, salt white, sun-bleached wood, grey rock.
- The river mouth among rocks (GDD).
- Arlo's jetty (GDD) with boats, nets and fish drying.
- The salt store with salt crystals (GDD).
- The small fog lighthouse (GDD), an ant-made glass lamp.
- The remains of the 1952 rope bridge (GDD).
- The stone stairs up the cliff to Theo's studio and darkroom on the cliff top (GDD).
- Arlo's home by the jetty (builder's call); Theo lives at the studio (GDD).
- Life: sand hoppers, beach beetles, water striders in the rock pools, surf, boats bobbing, wind in the grass.

**East: the green hills of home.** Soft, nostalgic. Soft greens, flowers, pastel paint, wood on stilts.
- The bus stop at the village edge (GDD), where the road to the city leaves.
- Gardener's chamomile fields (GDD).
- The stilt-house hill (GDD): houses on stilts, including Nenek Nora's (GDD).
- Pip's twig swing (GDD) and the playground (GDD).
- Satria's childhood home in a quiet corner of the valley (GDD).
- Leo's hill with his hut (decision 2026-10-18).
- The Gardener's home by the fields (builder's call).
- Life: butterflies, bees on the chamomile, aphid pens, a snail on the lane, kids at the swing.

### Running

Holding Shift makes the courier run, about twice walking speed (the builder tunes it), with a run animation drawn
for the courier in `chars.js`. Click-to-walk keeps walking; Shift held while clicking runs. Update the controls
decision in `GAME-CONTEXT.md`.

### Interior doors

The nine interiors (GDD 7.3) keep the zones the GDD gives them. Each of their buildings gets a clear, readable door
and an arrival spot outside. Doors for buildings without an interior read as closed or as background.

## Project 3: living villagers (recorded, to be designed later)

What the user wants, as decided so far:
- Named villagers have a home, a workplace and a routine across the four day phases (morning at home or in the
  garden, midday at work or the market, dusk heading home or at the square, night indoors with the window lit). They
  walk between places along the paths.
- Unnamed background ants fill the streets (shoppers, kids, workers carrying leaves and seeds, someone fishing) and
  each says a short line.
- Anyone can be talked to wherever they are. The story overrides routines when a scene needs someone.
- Bug animals move: aphids graze, the beetle pulls its cart, the snail plods along.
- New characters and their sprites are needed for background ants; the GDD's three missing cast members are drawn
  anyway.

## Project 4: the nine interiors (recorded, to be designed later)

The GDD's nine (7.3), in the new style and kit. From the references: cut-away rooms with thick wall tops, warm walls,
rugs and dense furniture.

## Constraints

- Every asset made from scratch in code in `game/ArtSource/`; no AI art, no asset-pack pixels.
- `presentation/` and `archive/godot-mvp/` are not touched.
- Web is the first build target, then Windows. Today one place is a single `below.png`, one atlas and one
  `place.json` (2.7 MB at today's size); at about 9 times the area the world must be split into chunks.
  *Builder's call, as targets:* the whole web build stays under about 60 MB; the title screen appears within about
  10 seconds on a mid-range laptop over a normal connection; play holds 60 fps there; no single texture is larger than
  4096 px on a side. Baking every animated thing as 720 frames will not scale to this world, so repeating ambient
  motion (water, swaying plants, smoke, simple bug loops) may move into game code where that is cheaper; how is the
  builder's call.
- The walk mask stays generated from the world's data, and the export keeps failing when a path or anchor is
  unreachable.
- Every step ends with a dev log entry in Indonesian, decisions dated in `GAME-CONTEXT.md`, and conventional commits.
- The systems test and its playthrough test keep passing.

## Left to the builder

- Exact map size within the target, exact zone shapes and sub-area placement.
- The chunking scheme, atlas packing and data format.
- How the kit is organised in code.
- Palette additions within `ART.md` rule 4.
- Which baked ambient loops (water, smoke, swaying plants, simple bug loops) belong to project 1 versus project 3.
