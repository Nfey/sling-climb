# Slinger

Mobile web prototype of a slingshot climbing game. Client-side only: a Vite + TypeScript
app rendered to a `<canvas>`, using `localStorage` for persistence. In production the static
`dist/` build is served by a Cloudflare Worker (`wrangler.jsonc`). There is no backend/database.

Game logic lives under `src/game/`. A second entry point, `playable.html` (`src/playable/`),
is a stripped-down "playable ad" build.

## Cursor Cloud specific instructions

- Package manager is npm (`package-lock.json`); Node 22 is expected (matches CI in `.github/workflows/deploy.yml`).
- Run the dev server with `npm run dev -- --host` (serves on port 5173). Two pages exist:
  `/` (main game) and `/playable.html` (playable ad). The main game also accepts URL params
  documented in `README.md`, e.g. `/?bot=perfect-seek` for an autopilot bot.
- There is no separate lint step and no automated test suite. `npm run build`
  (`tsc && vite build`) is the type-check/lint gate — run it to validate changes.
- The game is canvas-based with pointer/drag controls; there is no DOM UI to assert against,
  so verify changes by loading the page in a browser and interacting with the canvas.
