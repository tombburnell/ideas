---
name: create-idea
description: Scaffold a new app in apps/, clarify requirements, open a PR, optionally merge. Use when the user runs /create-idea or wants a new idea app with Dockerfile and fly.toml.
---

# Create idea app

Workflow for adding a new deployable app under `apps/<kebab-name>/` and opening a PR.

## When to use

- User invokes `/create-idea "..."` or asks to add a new idea/site to the monorepo.
- User wants clarification + implementation + PR + optional merge.

## Steps

1. **Clarify** – functional and non-functional requirements, tech stack, Fly naming (`<name>-idea`).
2. **Scaffold** – `Dockerfile`, `fly.toml` (`app = "<name>-idea"`), source, `README.md`, `.dockerignore` as needed.
3. **Branch** – `idea/<name>` from `main`.
4. **Commit & push** – one or more logical commits.
5. **PR** – `gh pr create` to `main` with summary and test notes.
6. **Summarize** – short bullet list of what was done.
7. **Ask** – "Review the PR on GitHub, or reply `merge` to merge it now."
8. **If merge** – `gh pr merge` (squash or merge per repo preference; default merge).

## Conventions

- Fly.io app name: `{{folder}}-idea` in `fly.toml`.
- Default `primary_region`: `lhr` (London); override if the user prefers another region.
- Secrets: `fly secrets set DATABASE_URL=...` etc., never in git.
- Merge to `main` triggers `.github/workflows/deploy.yml` for changed apps only.

## References

- Templates: `.github/fly-templates/`
- Examples: `apps/hello-node`, `apps/hello-python`, `apps/hello-static`
- Full command text: `.cursor/commands/create-idea.md`
