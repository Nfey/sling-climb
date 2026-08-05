# Slinger

Mobile web prototype of a slingshot climbing game (Doodle Jump meets slingshot aiming).

## Play (iPhone)

```bash
npm install
npm run dev -- --host
```

Open the printed URL on your iPhone (same Wi‑Fi), or use Safari on a Mac with responsive mode.

**Install as a PWA:** Add to Home Screen (iOS) or Install app (Android/Chrome). The app ships a web manifest, icons drawn from the default sling/ball/background (pulled pose), and a service worker. Equipped cosmetics update the tab favicon (and Apple touch link) live.

## Controls

- **Ball loaded:** drag (past a small deadzone) to aim; release to fire. Trajectory dots show the path.
- **Ball in flight:** press and hold to move the slingshot left/right on the midline.
- **Catch:** if the ball hits the slingshot while your finger is down, it is caught. Keep holding and drag a little to aim again — no need to lift between move and aim. Only lift to launch.
- **Miss:** if the ball falls below the line under the slingshot, game over. Run **score** is climb distance (with combo) plus platform and hazard bonuses; **height** is peak climb in world units. Both are tracked separately in the HUD, with bests saved in `localStorage`. A blue “BEST” height line marks your previous max climb and turns green once you pass it.

The main menu runs a silent **perfect-seek** bot in the background for atmosphere only — its score does not count toward your high score. Tap Play (or anywhere) to start a fresh player run. Tap **Shop** to browse and buy slingshot, background, and ball customizations.

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

## Deploy (Cloudflare Worker)

Static build is served by a Cloudflare Worker (`wrangler.jsonc` → `assets.directory = ./dist`).

### Option A — GitHub Actions (configured in this repo)

1. Create a Cloudflare API token with **Edit Cloudflare Workers**  
   https://dash.cloudflare.com/profile/api-tokens
2. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` (from the Workers dashboard URL / account overview)
3. Push to `main` (or run the **Deploy to Cloudflare Workers** workflow).

### Option B — Cloudflare Workers Builds (dashboard)

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create** → **Import a repository**
2. Select `Nfey/sling-climb`, production branch `main`
3. Build command: `npm run build`
4. Deploy command: `npx wrangler deploy`

Worker name must stay `sling-climb` to match `wrangler.jsonc`.

### Local deploy

```bash
npx wrangler login
npm run deploy
```

## Later: App Store & Google Play

This project is a standard Vite web app. When you are ready to ship:

1. `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `npx cap init` / `npx cap add ios` / `npx cap add android`
3. Point Capacitor `webDir` at `dist`, run `npm run build` then `npx cap sync`

Game logic lives under `src/game/` with canvas + `localStorage` only, so wrapping stays straightforward.
