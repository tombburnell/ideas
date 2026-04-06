# Ideas Monorepo

A monorepo containing multiple independent web applications and ideas, each deployable separately to Fly.io.

## Structure

```
ideas/
├── apps/
│   ├── app-name-1/          # Each app in its own folder
│   ├── app-name-2/
│   └── ...
├── .github/
│   └── workflows/
│       └── deploy.yml       # Automated deployment workflow
└── README.md
```

## Getting Started

### Adding a New App

1. Create a new folder in `apps/` with your app name (use kebab-case)
2. Add a `fly.toml` configuration file in your app folder
3. Add a `README.md` describing your app
4. Build your app using any framework/stack you prefer

### Deployment

Each app is automatically deployed to Fly.io when changes are detected:

- **Automatic**: Push to `main` branch triggers deployment for changed apps only
- **Manual**: Use GitHub Actions "Run workflow" to deploy specific apps

### Fly.io Setup

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Get API token: `fly auth token`
4. Add GitHub Secret:
   - Go to your repo Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `FLY_API_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

**Note:** Apps are automatically created on first deployment. Use the `-idea` suffix in `app = "my-app-idea"` so names stay unique on Fly.io.

**Region:** Templates and example apps use **`lhr` (London)** as `primary_region`. Fly.io [prices machines by region](https://fly.io/docs/about/pricing/) slightly differently; use the [calculator](https://fly.io/calculator) to compare. For UK users, `lhr` is usually the best latency.

### Tech Stack Freedom

Each app can use any technology stack:

- Node.js (Express, Next.js, etc.)
- Python (Flask, Django, FastAPI)
- Go, Rust, Ruby, etc.
- Static sites (React, Vue, vanilla HTML)

The only requirement is a `fly.toml` configuration file.

## Apps

### Example Apps

- **[hello-node](./apps/hello-node)** - Simple Express.js app
- **[hello-python](./apps/hello-python)** - Simple Flask app
- **[hello-static](./apps/hello-static)** - Static HTML site
- **[snake](./apps/snake)** - Retro Snake web game with SQLite (Drizzle + libSQL) high scores

<!-- Add your own apps here as you create them -->

## Development

Each app is independent. Navigate to the app folder and follow its README for local development instructions.

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get your first app deployed in 5 minutes ⚡
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide and best practices
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to add new apps to this monorepo
- **[Fly.io Templates](./.github/fly-templates/)** - Configuration templates for different stacks
- **[Create-idea workflow](./docs/CREATE_IDEA_WORKFLOW.md)** - `/create-idea` slash command, skill, and PR flow

## What to Think About

### Monorepo Structure ✅

- Each app is isolated in `apps/` directory
- Shared resources in `.github/` (workflows, templates)
- Clear documentation at root level

### Deployment Strategy ✅

- **Selective deployment**: Only changed apps deploy
- **Automatic**: Push to main → auto-deploy
- **Manual override**: Deploy specific apps via GitHub Actions
- **Independent failures**: One app failing doesn't affect others

### Fly.io Integration ✅

- Each app has own `fly.toml` config
- Dockerfiles for containerization
- Templates for common stacks
- Auto-start/stop for cost optimization

### Cost Management

- Free tier: 3 shared VMs with 256MB each
- Auto-stop unused apps to stay within free tier
- Easy to scale up specific apps as needed
- Monitor usage with `fly billing show`

### Tech Stack Freedom

- Each app can use different technologies
- No shared dependencies between apps
- Pick the right tool for each idea

### Future Considerations

- **Shared libraries**: Add `/packages` for shared code if needed
- **Databases**: Use Fly Postgres or external providers
- **CDN**: Add Cloudflare for static assets
- **Monitoring**: Add logging/monitoring service
- **Staging**: Add staging apps or branches
- **Custom domains**: Point domains to Fly.io apps
