# Snake (idea)

Retro Snake in the browser with a leaderboard stored in PostgreSQL.

## Local development

1. Start Postgres (from this folder):

   ```bash
   docker compose up -d
   ```

2. Configure env:

   ```bash
   cp .env.example .env
   ```

3. Run the server:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000

## Production (Fly.io)

The container expects `DATABASE_URL` pointing at a Postgres instance. Create a Fly Postgres app (or use an external URL), then:

```bash
fly secrets set DATABASE_URL="postgresql://..."
fly deploy
```

Without a valid `DATABASE_URL`, the app will fail on startup when it tries to run migrations.

## Controls

- Arrow keys — move
- P — pause
- R — restart
- Click the canvas — start
