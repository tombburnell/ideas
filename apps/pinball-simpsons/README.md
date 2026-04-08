# Pinball Simpsons (idea)

A single-screen browser pinball game themed with Simpsons branding and sounds, built with **PixiJS** for rendering and **Rapier2D** for physics. High scores are stored in **SQLite** via **Drizzle ORM** and persisted on Fly.io using a volume.

## Local development

1. Configure env (optional — defaults to `file:data/pinball-simpsons.db` under the app directory):

   ```bash
   cp .env.example .env
   ```

2. Install deps and run the app:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

The first run applies SQL migrations from `drizzle/` and creates the database file automatically.

## Production (Fly.io)

This app expects a **Fly volume** mounted at `/data`. On Fly (`FLY_APP_NAME` is set), the server uses **`file:/data/pinball-simpsons.db`** automatically.

1. Create the volume once:

   ```bash
   fly volumes create pinball_simpsons_data --region lhr --size 1
   ```

2. Deploy:

   ```bash
   fly deploy
   ```

## Controls

1. Desktop:
   - Left / right arrow or A / D — flippers
   - Space — launch ball / start game
2. Mobile:
   - Left flipper button
   - Launch button
   - Right flipper button
3. Enter a name after game over to save a high score.

## Bundled third-party assets

1. `public/assets/simpsons-logo.svg` — from Wikimedia Commons: <https://commons.wikimedia.org/wiki/File:The_Simpsons_Logo.svg>
2. `public/assets/homer-signature.svg` — from Wikimedia Commons: <https://commons.wikimedia.org/wiki/File:Homer_Simpson_signature.svg>
3. `public/assets/homer.ogg` — from Wikimedia Commons: <https://commons.wikimedia.org/wiki/File:Homer_Simpson.ogg>
4. `public/assets/bart.ogg` — from Wikimedia Commons: <https://commons.wikimedia.org/wiki/File:Bart_Simpson.ogg>
5. `public/assets/doh.mp3` — from Myinstants: <https://www.myinstants.com/en/instant/homer-simpson-doh-80012/>
