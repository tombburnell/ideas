# Space Creepers

Browser **Space Invaders**–style shooter with blocky creeper-inspired invaders, synthesized sound, SQLite high scores (same stack as `apps/snake`), and touch controls for mobile.

## Local development

1. Optional env:

   ```bash
   cp .env.example .env
   ```

2. Run:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

Migrations in `drizzle/` run on first start.

### Schema changes

After editing `src/schema.ts`:

```bash
npm run db:generate
```

Commit new files under `drizzle/`.

## Production (Fly.io)

`fly.toml` mounts volume `space_creepers_data` at `/data`. On Fly the app uses **`file:/data/space-creepers.db`** when `FLY_APP_NAME` is set.

1. Create the volume once (same region as the app, e.g. `lhr`):

   ```bash
   fly volumes create space_creepers_data --region lhr --size 1
   ```

2. Deploy from `apps/space-creepers`:

   ```bash
   fly deploy
   ```

If `DATABASE_URL` was set as a secret and you want the default Fly file DB instead, run `fly secrets unset DATABASE_URL`.

## Controls

- **←** **→** — move
- **Space** — fire (or use overlay **Start** when paused)
- **P** — pause
- **R** — restart

Touch: bottom row **←** **FIRE** **→**; pause and restart under **Help** on small screens.
