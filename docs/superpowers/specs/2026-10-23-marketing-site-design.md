# The marketing site: what the game is, shown working

Date: 2026-10-23, revised 2026-10-24. Status: approved by the user, 2026-10-23; the page's structure revised and
approved 2026-10-24, and its layout revised again the same day (the game in framed windows). The user skipped a
written build plan.

## Why

Version 1.0.0 is out on GitHub (macOS and Windows zips), but the only page the game has is the frozen presentation,
which still tells the retired story. The game needs a public page that people can find, share and download from.

The user wants a stranger who opens the link to think "oh my God, what page is this? This is so cool" within the
first few seconds. Their references are https://x.ai/bot and https://boat.dev/.

The first build (2026-10-23) made the hero the playable square and nothing else, and the user found it "more like
demo web version not marketing itself, it's not explaining the game". What boat.dev does, which this page now does:
- the hero says in one line what the product is, in one sentence why, and offers the download straight away;
- each section after it is one short, plain claim with a few lines of copy and a live visual proving it (boat's
  terminal mockups, here the game running);
- the live parts are the proof under the words, not a substitute for them.

**Who it is for.** The public: anyone who might play the game. The lecturer and classmates see it first, but it is
not built only for them.

**Success:** a first-time visitor knows within a few seconds what the game is (a cozy pixel-art mystery: seven
nights, seven keepsakes to return), plays with it, scrolls to the end, and downloads the game or stars the repo.

**What would make it a failure even if it works** (the user's words: "if it looks plain or generic, like a
template"):
- anything that reads as a template: centred hero over a gradient, three feature cards with icons, stock section
  rhythm;
- flat panels with no crafted pieces or motion (the same complaint the user made about the game's first UI);
- art that is not the game's: redrawn, AI-made or placeholder pictures;
- a page that stutters, or a hero that sits blank while it loads;
- a page that only demos the game and never says what it is (the 2026-10-24 review);
- spoilers of Nights 6 and 7 or the ending.

## What the user decided

In conversation, 2026-10-23:
- The audience is the public, not only the lecturer and classmates.
- The playable square (walk Satria, talk to villagers) is on the page.
- Scrolling moves the time of day, ending at Marlow's shop at midnight.
- Mending the Night 1 watch and the bag are sections along the way.
- At the end a visitor can download the game and go to the GitHub repo.
- It must look rich, with beautiful animation and motion; never plain or generic.
- No mockups first: the user declined the visual companion.

In conversation, 2026-10-24:
- The page explains the game, boat.dev's way: a hero that says what it is, then one claim per section shown live.
- The sections are the hero and the six below. No "how it was made" section.
- The game does not fill the screen behind the page: with the world behind everything, the hero was "noisy", and the
  copy panels "spamming the whole screen". The page is calm, and each section has its own framed live scene beside
  its words, as boat.dev gives each feature its own animation. The hero's scene opens full screen to play and
  shrinks back ("shrink and unshrink").
- The hero does not explain the whole game; each section explains one thing.

## The page, top to bottom

The page is calm: no game behind it. Its background is the sky, and it moves from morning to midnight as the
visitor scrolls, so the day still runs down the page. Each section is its words on the left and its own framed scene
on the right (stacked on a phone): a window into Bellwood in a wooden frame, live, showing only what that section
claims. One WebGL canvas serves the windows: it moves into whichever window is on screen, and a window it leaves
keeps a still of its last frame.

### The hero: what it is, in one look

- The game's title lettering (`ui/title.png`).
- **Headline:** "One shop. Seven nights. Seven keepsakes to return."
- **One line:** "A cozy pixel-art mystery for macOS and Windows."
- **Download** for the visitor's computer, with macOS and Windows tabs (as boat.dev shows its install command per
  OS), and the GitHub link.
- **The window:** the live square, villagers about their morning, Satria among them, with a Play button: "Walk
  around Bellwood". Play opens the window full screen, where the visitor walks Satria by keys or taps and talks to
  villagers (the game's dialogue box, real lines from the Prologue and Night 1 days, no spoilers). Esc or the close
  button shrinks it back into its frame.
- No premise, facts or features here: the sections below carry them.

### 1. "A village that lives its own day."

The villagers keep their own routines: Mia carries crates to her stall, Pip runs letters, Sam sweeps the hall's
steps. The section holds still while the scroll runs the day from morning to dusk in its window (the game's
grades, lamps and windows lighting up) and the page's sky with it, the camera with Mia, then Pip, then Sam, the
game's day dial turning beside the words.

### 2. "The shop opens at midnight."

The camera cuts to the Banyan Grove at night. The bell tolls midnight, the door in the banyan's roots glows and
opens (the grove's exported `shop_closed` gives way to `shop`, and its seven `shop_lantern_*` light one by one).
The copy says how a night works: Marlow opens a relic box, Satria finds whose keepsake it is by day, and returns
it before the shop closes. The world stays at the grove at night for the sections that follow.

### 3. "No quest markers, just people."

The courier bag opens over the scene; the visitor picks the brass pocket watch and turns it (front, back, sides).
Each new side drops a clue into the Notes page with the game's chime ("Stopped at 10:17", "Initials on the back").
The copy: no arrows, no checklist; you find who owns it by matching what you see with what villagers say.

### 4. "Mend it with your own hands."

The Night 1 minigame, playable, ported from `Minigames/ClockworkAlign.cs`: pick a wheel, turn it till its red mark
points up, set it going. Keyboard as in the game (W/S, A/D, Space), plus drag and tap for mouse and touch. Failing
gets the game's own friendly lines and an instant retry. Winning starts the watch ticking.

### 5. "Seven nights, seven lanterns."

Marlow's seven lanterns hang from a banyan branch, as on the game's HUD. Nights 1 to 5 each show their keepsake
and a one-line hook, as postcards (the watch, Mochi, Daniel's camera, the plain key, the running shoes). Nights 6
and 7 are sealed: a postcard face down, its lantern burning, no keepsake and no hint of what it is. Hovering or
tapping a lantern makes it flicker.

### 6. Midnight at the shop: download

The shop's door, open, its lantern light spilling out, and the Download standing in that light:
- it detects the visitor's computer and offers that zip straight from the latest GitHub release ("Download for
  macOS", with Windows one tap away, and the reverse);
- under it, the short "first time you open it" note from the README (neither build is signed);
- beside it, "Star on GitHub", linking to the repo;
- on a phone: "Play it on your Mac or PC" instead of a download that would not run, with the repo link.

A quiet footer under it: the repo, the team's credit line and the licence. No making-of section.

## Throughout

- **Language:** English, with a switch to Bahasa Indonesia, as the game has. Game lines come from the game's own
  translations (`Resources/Lang/id.json`); the page's own copy is written in both.
- **Sound:** off until the visitor turns it on (a pixel speaker toggle, the game's `sound-on`/`sound-off` icons).
  On: the music for the time of day (`music_dawn`, `music_market`, `music_dusk`, `music_night`), cross-faded as the
  day moves, the ambience, footsteps, blips, the bell at midnight.
- **Motion everywhere, crafted:** every piece of UI is the game's own pixel art (`ui/`, `icons/`), and everything
  moves a little: pieces pop and settle, the postmark thumps, the sign drops on ropes, lanterns flicker, cards slide
  up on scroll. Type: Pixelify Sans for titles, DM Sans for reading, as in the game.
- **Reduced motion:** with `prefers-reduced-motion`, the camera holds still and transitions become cuts; the world
  still lives (grass sways gently), and everything stays usable.
- **Accessible:** all copy is real HTML text over the canvas; every control works by keyboard; the canvas has a text
  description.
- **Link previews:** a shared link shows Bellwood with the title (an Open Graph image rendered from the square), a
  title and a one-line description.

## How it gets made

These are the builder's calls (the agent's), stated here so the user can change them.

- **The premise and the facts** (free, 1 to 3 hours, English and Bahasa Indonesia) move out of the hero: the premise
  into section 2, the facts beside the final Download.
- **Where:** a new `site/` folder in this repo. `presentation/` is frozen and stays untouched.
- **Stack** (the user's picks, 2026-10-23): Bun (the latest, 1.4.4) to install, run scripts and test (`bun test`);
  Vite as the dev server and bundler, run through Bun; TypeScript, strict; three.js, the one runtime library, for
  the 3D world; plain HTML and CSS with no UI framework. Not Next.js and not shadcn: boat.dev is Next.js, but its look
  is hand-drawn canvas code, and a one-page static site gains nothing from a server framework, while shadcn's
  components are the generic look the user does not want.
- **The world in 3D, like the game.** The site draws Bellwood from the game's exported files, the same way Unity
  does: the ground from `below_*.png` raised by `height.png` (ported from `Core/Relief.cs`), every item an upright
  card, every house built from its model's faces in `place.json` and shaded by how each face turns from the sun
  (ported from `Core/BakedArt.cs`), the camera at the game's 35 degree pitch, the time-of-day grades from
  `grades.json`, lights shown at dusk and night and never graded. The Unity web build was cancelled for running at
  about 6 fps (Bokeh depth of field, bloom and HDR over a full window), so the site does not copy that post-processing:
  its tilt-shift is a cheap blur in a single pass, weighted by screen height, and its glow is drawn into the light
  sprites. The target is 60 fps on an Apple M-series laptop and a smooth 30 on an ordinary laptop and a recent phone.
- **One screen first** (the user's rule for any new look): the hero and section 1, which set the copy-and-proof look
  every section follows, are built and shown to the user before the rest of the page is built.
- **Assets come from the game.** A sync script copies what the page uses from `game/Assets/Resources/Art/` into
  `site/public/` (the square, the grove, the cast in the hero, the watch's minigame pieces, the keepsakes of Nights
  1 to 5, the UI pieces, the fonts) and turns the OGG sounds it uses into MP3, which every browser plays. Nothing is
  drawn again and nothing is AI-made. It also renders the flat poster of the square: the first paint while the 3D
  loads, the fallback when WebGL is missing, and the link-preview image.
- **Loading:** the poster shows at once; the 3D square streams in behind it and fades over. The grove and the
  section assets load when the visitor scrolls near them.
- **Phones:** tap to walk, with a short path found on the walk mask; tap to talk; drag for the minigame. The world
  renders at a lower resolution and pauses when off screen or in a background tab.
- **Hosting:** Vercel, as decided on 2026-09-26 ("Shareable pages are hosted on Vercel, not Claude Artifacts"). The
  agent asks before deploying, since that publishes it.
- **Downloads:** links point at `https://github.com/praffiii/the-shop-that-opens-once/releases/latest/download/<zip>`,
  so a new release needs no change to the site.

## Not in this work

- No web build of the game itself, no saves, no story past the square's morning talk.
- No section on how the game was made (the user, 2026-10-24).
- No other areas to walk in (the station, the east, the coast); the grove is seen, not walked.
- No accounts, newsletter, analytics or comments.
- No changes to the game, `presentation/` or `archive/`.

## The builder's smaller calls

Settled by the builder, marked here so the user can check them:
- Which villagers stand in the square and which lines they say: picked from the Prologue's and Night 1's day talk,
  two or three lines each, nothing past Night 1.
- The title lettering is the game's `ui/title.png` (it already reads 10:17's story, not the retired 18:17), scaled
  up by a whole number.
- Each version of the page records itself as a decision in `GAME-CONTEXT.md` and a dev log entry, as every step of
  the game does.

## Open

- The web address. `the-shop-that-opens-once.vercel.app` is the frozen presentation and stays live (2026-10-18), and
  `the-shop-that-opens-once-game` is the Godot archive, so the site needs a new Vercel project name. To be settled
  with the user when deploying.
