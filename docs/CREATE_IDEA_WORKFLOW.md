# Create-idea workflow

This repo supports a repeatable flow for new apps: **clarify → build → ship**.

## Cursor: `/create-idea`

In Cursor chat, use the slash command **`/create-idea`** (or paste the prompt from `.cursor/commands/create-idea.md`). The assistant will:

1. Ask clarifying questions (functional / non-functional requirements, stack, naming).
2. Create `apps/<kebab-name>/` with `Dockerfile`, `fly.toml`, code, and `README.md`.
3. Commit on branch `idea/<name>`, push, and open a PR to `main`.
4. Summarize what it did and ask whether to **review** or **`merge`**.
5. Merge the PR if you reply `merge`.

## Skill

The **create-idea** skill (`.cursor/skills/create-idea/SKILL.md`) gives the same workflow in a compact form so Cursor can attach it automatically when relevant.

## Fly.io naming

Use a globally unique `app` in each `fly.toml`:

```toml
app = "retro-snake-idea"
```

Convention: **`{folder-name}-idea`**.

## After merge

Pushing to `main` runs **Deploy Apps to Fly.io** and deploys only apps under `apps/` that changed. If the Fly app does not exist yet, the workflow creates it (requires `FLY_API_TOKEN` in GitHub Actions secrets).

## Postgres

For Postgres on Fly:

1. Create a Postgres cluster (or use an existing one): see [Fly Postgres](https://fly.io/docs/postgres/).
2. Attach or set `DATABASE_URL` with `fly secrets set DATABASE_URL=... -a your-app-idea`.
3. Document local dev (e.g. Docker Compose or local Postgres URL) in the app `README.md` without committing secrets.
