# Sling Climb

Mobile web prototype of a slingshot climbing game (Doodle Jump meets slingshot aiming).

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
- **Miss:** if the ball falls below the line under the slingshot, game over. Run points come from climb + bonuses; the end-of-run high score is roughly height × points / time (height weighted a bit more — faster runs score higher). A blue “BEST” height line marks your previous max climb and turns green once you pass it. High score and max height are stored in `localStorage`.

The band under the slingshot line is reserved for future powerups/upgrades.

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
