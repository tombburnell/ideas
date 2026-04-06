# Create-idea workflow

This repo supports a repeatable flow for new apps: **clarify → build → ship**.

## Cursor: `/create-idea` and the skill

- **Canonical workflow** (all steps, commands, conventions): **`.cursor/skills/create-idea/SKILL.md`**
- **Slash command** (`.cursor/commands/create-idea.md`) only tells the agent to follow that skill and passes the user’s text after `/create-idea`—no duplicated instructions.

In chat you can either type **`/create-idea "…"`** or describe a new app in natural language; the **create-idea** skill description helps Cursor attach the same playbook when you don’t use the slash.

## Fly.io naming

Use a globally unique `app` in each `fly.toml`:

```toml
app = "retro-snake-idea"
```

Convention: `**{folder-name}-idea**`.

## After merge

Pushing to `main` runs **Deploy Apps to Fly.io** and deploys only apps under `apps/` that changed. If the Fly app does not exist yet, the workflow creates it (requires `FLY_API_TOKEN` in GitHub Actions secrets).

## Postgres

For Postgres on Fly:

1. Create a Postgres cluster (or use an existing one): see [Fly Postgres](https://fly.io/docs/postgres/).
2. Attach or set `DATABASE_URL` with `fly secrets set DATABASE_URL=... -a your-app-idea`.
3. Document local dev (e.g. Docker Compose or local Postgres URL) in the app `README.md` without committing secrets.

