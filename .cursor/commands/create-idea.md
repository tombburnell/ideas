# /create-idea

You are helping scaffold a **new app** under `apps/<kebab-name>/` in this monorepo.

## Invocation

The user message will look like:

`/create-idea "<short description of the idea>"`

or free-form text describing what to build.

## Your workflow (do in order)

### 1. Clarify requirements (ask before coding)

Ask concise follow-up questions until these are clear (skip any the user already answered):

- **Functional**: core user flows, data to store, APIs, auth (if any), edge cases.
- **Non-functional**: performance, privacy, accessibility, expected traffic.
- **Tech stack**: language/runtime, framework, DB if needed (default: **Node + Express** or **static** for simple sites; **Postgres on Fly** when persistence is required).
- **Fly app name**: must be globally unique; use pattern `{{folder}}-idea` in `fly.toml` (e.g. `retro-snake-idea` for folder `retro-snake`).
- **Region**: default `primary_region = "lhr"` (London) unless the user asks otherwise.

### 2. Plan

- Pick folder name: kebab-case, short, e.g. `retro-snake`.
- List files to add (Dockerfile, `fly.toml`, app source, `README.md`, etc.).
- If Postgres: plan `DATABASE_URL` via `fly secrets` and document in the app README (no secrets in git).

### 3. Implement

- Create `apps/<name>/` with the same conventions as existing apps:
  - `Dockerfile`, `fly.toml`, `README.md`
  - `.dockerignore` where appropriate
  - App listens on `0.0.0.0` and port matching `internal_port` in `fly.toml`
- Copy patterns from `.github/fly-templates/` when helpful.
- **Fly `app` name**: use `{{kebab-name}}-idea` unless the user chose a different unique suffix.

### 4. Git

```bash
git checkout -b idea/<name>
git add apps/<name>
git commit -m "feat(<name>): <short description>"
git push -u origin idea/<name>
```

### 5. Open PR

```bash
gh pr create --base main --head idea/<name> --title "feat(<name>): <title>" --body "<summary + test notes + deploy notes>"
```

If `gh` is unavailable, describe the PR title/body for the user to paste.

### 6. Summarize

- What was built (files, stack, Fly app name).
- How to run locally.
- That merge to `main` triggers deploy for changed apps only.

### 7. Ask how to proceed

Ask exactly:

> **Review the PR on GitHub, or reply `merge` to merge it now.**

If the user says **merge** (or merge now / yes merge):

```bash
gh pr merge <number> --merge --delete-branch
```

If `gh` fails, give the merge instructions.

## Notes

- Do not commit `.env` or secrets; use Fly secrets for production.
- Keep `app` names unique; `-idea` is the repo convention for Fly.io app names.
