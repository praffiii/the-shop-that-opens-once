# Presentation

The web presentation for The Shop That Opens Once, live at https://the-shop-that-opens-once.vercel.app.

Every image is pixel art drawn in code when the page loads. This folder has no image assets, only code and two fonts.

## Files

| File | What it holds |
| --- | --- |
| `the-shop-that-opens-once.html` | The built presentation: one self-contained file that works offline |
| `template.html` | Page layout, styles and all the text. The `%%NAME%%` markers are replaced at build time. |
| `px.js` | Shared pixel core: the palette, drawing helpers, and `Stage` (crisp whole-number scaling) |
| `title.js` | The title lettering. The O in OPENS is a clock stopped at 18:17. |
| `world.js` | Bellwood village: day, dusk, evening, and the shop appearing |
| `chars.js` | The 15 ant characters: poses, walk cycles, portraits |
| `interiors.js` | Marlow's shop, the station, the keepsakes, UI icons |
| `dioramas.js` | The seven night scenes |
| `audio.js` | Optional synthesized music and sound effects |
| `main.js` | Scroll story, playable Night 1, section wiring |
| `ART.md` | Art direction rules and module contracts |
| `stubs.js` | Placeholder art, used only by `--dev` builds |
| `fonts/` | Pixelify Sans and DM Sans (SIL Open Font License, licenses included) |
| `*-preview.html` | Open any of these in a browser to inspect one module on its own |

## Build

```sh
python3 assemble.py the-shop-that-opens-once.html
```

Needs only Python 3. Rebuild after editing any source file, and commit the rebuilt HTML together with your change.

## Publish to Vercel

```sh
./deploy.sh
```

This rebuilds the page and deploys it to production. It needs the Vercel CLI logged in to the `praffis-projects` account.

Share only the short link. The long per-deploy links are login-protected.
