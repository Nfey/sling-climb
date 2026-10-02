# Sling Bounce™

Sling Bounce is a mobile web prototype of a slingshot climbing game (Doodle Jump meets slingshot aiming).

## Play (iPhone)

```bash
npm install
npm run dev -- --host
```

Open the printed URL on your iPhone (same Wi‑Fi), or use Safari on a Mac with responsive mode.

Add to Home Screen for a fullscreen feel.

## Controls

- **Ball loaded:** drag (past a small deadzone) to aim; release to fire. Trajectory dots show the path.
- **Ball in flight:** press and hold to move the slingshot left/right on the midline.
- **Catch:** if the ball hits the slingshot while your finger is down, it is caught. Keep holding and drag a little to aim again — no need to lift between move and aim. Only lift to launch.
- **Miss:** if the ball falls below the line under the slingshot, game over. Run **score** is climb distance (with combo) plus platform and hazard bonuses; **height** is peak climb in world units. Both are tracked separately in the HUD, with bests saved in `localStorage`. A blue “BEST” height line marks your previous max climb and turns green once you pass it.

The main menu runs a silent **perfect-seek** bot in the background for atmosphere only — its score does not count toward your high score. Tap Play (or anywhere) to start a fresh player run. Tap **Shop** to browse and buy slingshot, background, and ball customizations. Tap **Daily** for the 7-day login calendar (coins, soft run boosts, hats). **Hats** and **Trails** are separate coin gachas with rarity-colored tap-to-reveal pulls; equip owned cosmetics from those screens.

The band under the slingshot line is reserved for future powerups/upgrades.

## Playable ad

A stripped HTML5 playable lives at `/playable.html` (built to `dist/playable.html`).

```bash
npm run dev -- --host
# open http://localhost:5173/playable.html
# optional store URL: /playable.html?installUrl=https://example.com/store
```

Session ends on first game over or after **30 seconds**, then an Install CTA appears. The CTA uses MRAID → `clickTag` → `window.open` (`src/playable/install.ts`). Scores are not persisted.

After `npm run build`, zip the playable assets for an ad network (typically `dist/playable.html` plus its hashed JS/CSS from `dist/assets/`, or host the built URL). Network upload is manual.

## Autopilot video bot

Run the main game with a bot that keeps the slingshot under the ball and fires on its own:

```bash
npm run dev -- --host
# Perfect tracking + random aims:
#   http://localhost:5173/?bot=perfect
# Human-like lag + noisy aims:
#   http://localhost:5173/?bot=human
# Seek variants (full pulls, diagonal bias, aim at portals/hazards):
#   http://localhost:5173/?bot=perfect-seek
#   http://localhost:5173/?bot=human-seek
# Auto-start WebM recording:
#   http://localhost:5173/?bot=human-seek&record=1
```

Use the **Record** / **Stop & save** control (top-right) to download a `.webm` (Chrome/Edge recommended). You can also screen-record the tab for TikTok/Reels MP4s. The bot auto-restarts on game over and does not write high scores.

### Art and debug params

Sunbaked Canyon sprites are on by default. `?art=0` keeps the previous code-drawn look (also used while images are still decoding).

```bash
# Code-drawn fallback
http://localhost:5173/?art=0

# Debug session (never writes localStorage). Skips the title menu.
# best = previous best climb, so the BEST line and 2×… milestone lines show.
# climb = world altitude of the slingshot (run origin stays 0).
http://localhost:5173/?debug=1&best=220
http://localhost:5173/?debug=1&climb=400
```

With `?debug=1&climb=`, one turret is placed in view if the generator didn't spawn one, and the first platforms above the slingshot are shown as normal, bonus, crumbling, and moving. Collision sizes are unchanged.

Screenshots (390×844, deviceScaleFactor 2): `node scripts/screenshots.mjs` against a preview server. See the script header.

## Deploy (Cloudflare Worker)

Static build is served by a Cloudflare Worker (`wrangler.jsonc` → `assets.directory = ./dist`).

**Option B (Cloudflare Workers Builds) is the active deploy path.** Production deploys run from the Cloudflare Git integration on every `main` commit. Pushes to other branches get a preview alias at `https://<branch-slug>-sling-climb.nfey.workers.dev` (this art branch: `https://art-sling-bounce-v1-sling-climb.nfey.workers.dev`).

### Option A — GitHub Actions — not configured

The repo has no `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` Actions secrets. `.github/workflows/deploy.yml` is a **build-only CI check** (`CI (build)`: `npm ci` and `npm run build` on `main` pushes and pull requests). It does not deploy.

Do not add a Wrangler deploy step or a second preview workflow here. Workers Builds already deploys `main` and previews branches; wiring both would double-deploy production.

### Option B — Cloudflare Workers Builds (active)

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → the existing `sling-climb` Worker
2. Production branch `main`
3. Build command: `npm run build`
4. Deploy command: `npx wrangler deploy`

Worker name must stay `sling-climb` to match `wrangler.jsonc`.

### Local deploy

```bash
npx wrangler login
npm run deploy
```

## Credits

The Sling Bounce wordmark uses [Lilita One](https://fonts.google.com/specimen/Lilita+One) by Juan Montoreano, licensed under the SIL Open Font License 1.1. The stacked-subtitle lockup is converted to outlines; no font file is shipped. The licence text is at `src/assets/brand/sling-bounce/licences/LilitaOne-OFL.txt`.

## Later: App Store & Google Play

This project is a standard Vite web app. When you are ready to ship:

1. `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `npx cap init` / `npx cap add ios` / `npx cap add android`
3. Point Capacitor `webDir` at `dist`, run `npm run build` then `npx cap sync`

Game logic lives under `src/game/` with canvas + `localStorage` only, so wrapping stays straightforward.
