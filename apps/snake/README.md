# Snake (idea)

Retro Snake in the browser with a leaderboard stored in **SQLite** via **Drizzle ORM** and the **libSQL** client (`@libsql/client`).

## Local development

1. Configure env (optional — defaults to `file:data/snake.db` under the app directory):

   ```bash
   cp .env.example .env
   ```

2. Run the server:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

The first run applies SQL migrations from `drizzle/` and creates the database file (and `data/` if needed).

### Schema changes

After editing `src/schema.ts`:

```bash
npm run db:generate
```

Commit the new files under `drizzle/`.

## Production (Fly.io)

Use a **Fly volume** so the SQLite file survives deploys. This app’s `fly.toml` mounts `snake_data` at `/data` and sets `DATABASE_URL=file:/data/snake.db`.

1. Create the volume once (same region as the app, e.g. `lhr`):

   ```bash
   fly volumes create snake_data --region lhr --size 1
   ```

2. Deploy:

   ```bash
   fly deploy
   ```

For **Turso** or another remote libSQL URL, set `DATABASE_URL` to that URL (e.g. `fly secrets set DATABASE_URL="libsql://..."`) and remove or adjust the `[mounts]` block if you do not need a local file.

## Controls

- Arrow keys — move
- P — pause
- R — restart
- Click the canvas — start
