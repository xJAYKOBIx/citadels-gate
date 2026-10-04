# Citadel's Gate

A browser lane battler in the spirit of *Final Assault* (the VR game), built for phones. One HTML file, no build step: open `index.html` and play.

Two factions (Covenant and Forsaken), six commanders, each with their own army: Human Knights, Elves, Dwarves, Orcs, the Skeletal host and Trolls. Deploy units from your keep, draw their paths with a finger, post mages on the nests above each lane, and break both towers in one lane to expose the enemy keep.

## Play

- **Open `index.html`** in any modern browser (it loads Three.js from cdnjs, so it needs a network connection the first time).
- On a phone, add it to the home screen or use the fullscreen button.
- Hash options: `#battle` starts a match straight away, `#fast` runs it at 4×, `#lab` opens the Library (every unit of a commander, in 3D), `#sheet-borvik` shows an army as a grid of thumbnails, `#frostmere` / `#pass` load the two older maps that are set aside for now.

## Layout

| Path | What |
| --- | --- |
| `index.html` | The game, current build (v16). |
| `src/roster.js` | The roster block as spliced into `index.html`: infantry, core units, race names, uniques, factions, commanders. |
| `src/models16.js` | The v16 miniatures (one look per army), spliced into `index.html`. |
| `docs/` | Design docs and the build handoff (`build-status.md` — read this first if you work on the code). |
| `tools/` | Headless test scripts (Playwright): AI-vs-AI sims, commander pairings, equal-gold duels, pathing walks, HUD screenshots. |
| `design/` | Map generators and previews (Sylvanmere, Warden's Ford). |
| `builds/` | Previous builds. |

## Tests

```
cd tools && npm install playwright && npx playwright install chromium
node sim.js ../index.html regular 4 sylvan        # 4 AI-vs-AI games
node pairs.js ../index.html sylvan 4 holts,grom   # commander pairings, both sides
node walk.js ../index.html sylvan                 # every overlook and cache reachable from both keeps
```

Three.js can't load in a sandbox without network, so the 3D side is checked by hand in a browser; the sim and pathing tests run headless.

## Credits

Design and direction: Jaykobi Moore. Code and art: built with Claude. Inspired by *Final Assault* by Phaser Lock Interactive (2019); no assets from it are used.
