# Contributing Guide

Thanks for your interest in contributing to this monorepo! This guide will help you add new ideas and apps.

## Quick Start

1. **Create your app folder**
   ```bash
   mkdir apps/your-app-name
   cd apps/your-app-name
   ```

2. **Build your app**
   - Use any framework or tech stack
   - Add a `README.md` explaining your app
   - Add a `Dockerfile` for deployment

3. **Configure Fly.io**
   ```bash
   cp ../../.github/fly-templates/node-template.toml fly.toml
   # Edit fly.toml with unique app name
   ```

4. **Test locally**
   ```bash
   # Test with Docker
   docker build -t your-app .
   docker run -p 8080:8080 your-app
   ```

5. **Deploy**
   ```bash
   fly launch
   ```

6. **Commit and push**
   ```bash
   git add .
   git commit -m "Add your-app-name"
   git push
   ```

## App Structure

Each app should be self-contained in `apps/your-app-name/`:

```
apps/your-app-name/
├── Dockerfile          # Required for Fly.io
├── fly.toml           # Required for Fly.io
├── README.md          # Document your app
├── [app files]        # Your application code
└── [dependencies]     # package.json, requirements.txt, etc.
```

## Naming Conventions

- **Folder names**: Use kebab-case (e.g., `my-cool-app`)
- **App names in fly.toml**: Use unique names (e.g., `my-cool-app-ideas`)
- **Branches**: Use descriptive names (e.g., `add-my-cool-app`)

## Tech Stack Freedom

You can use any technology:
- **Node.js**: Express, Next.js, Nuxt, Nest, etc.
- **Python**: Flask, Django, FastAPI, etc.
- **Go, Rust, Ruby, PHP**: All supported
- **Static sites**: HTML, React, Vue, Svelte, etc.
- **Databases**: Postgres, Redis, MongoDB (via Fly.io or external)

## Required Files

### Dockerfile

Your Dockerfile should:
- Use an appropriate base image
- Copy your application files
- Install dependencies
- Expose the correct port (matching `fly.toml`)
- Define a CMD to start your app

### fly.toml

Your `fly.toml` should:
- Have a unique `app` name
- Set `internal_port` matching your app's port
- Configure resources appropriately
- Use auto-start/stop for low-traffic apps

### README.md

Your app's README should include:
- Description of what it does
- Local development instructions
- Any environment variables needed
- Tech stack used

## Environment Variables & Secrets

**Never commit secrets to git!**

For local development:
```bash
# Create .env file (already in .gitignore)
echo "API_KEY=your-key" > apps/your-app/.env
```

For production:
```bash
# Use fly secrets
fly secrets set API_KEY=your-key -a your-app-name
```

## Testing Before Push

1. **Build Docker image**
   ```bash
   docker build -t test .
   ```

2. **Run locally**
   ```bash
   docker run -p 8080:8080 test
   ```

3. **Test endpoints**
   ```bash
   curl http://localhost:8080
   curl http://localhost:8080/health
   ```

## Git Workflow

1. **Create feature branch**
   ```bash
   git checkout -b add-my-app
   ```

2. **Make changes**
   ```bash
   # Add your app files
   git add apps/my-app
   git commit -m "Add my-app"
   ```

3. **Push and create PR**
   ```bash
   git push origin add-my-app
   # Create PR on GitHub
   ```

4. **Auto-deployment**
   - Once merged to `main`, GitHub Actions deploys automatically
   - Only your changed app is deployed

## Cost Considerations

- **Free tier**: 3 shared-cpu-1x 256mb VMs (stopped when idle)
- **Auto-stop**: Set `auto_stop_machines = true` for free tier
- **Memory**: Start with 256MB, increase if needed
- **Regions**: More regions = more cost

Monitor usage:
```bash
fly billing show
```

## Common Issues

**"App name taken"**
- Change `app` in `fly.toml` to something unique
- Try adding suffix: `my-app-ideas`, `my-app-tb`, etc.

**"Dockerfile not found"**
- Ensure `Dockerfile` exists in app root
- Check capitalization (must be `Dockerfile`)

**"Port mismatch"**
- Verify `internal_port` in `fly.toml` matches app's port
- Check your app listens on `0.0.0.0`, not `localhost`

**"Out of memory"**
- Increase `memory_mb` in `fly.toml`
- Optimize your app's memory usage

## Getting Help

- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide
- Look at example apps in `apps/` folder
- Read [Fly.io docs](https://fly.io/docs/)
- Open an issue on GitHub

## Code of Conduct

- Be respectful and inclusive
- Test your apps before pushing
- Document your code
- Keep apps self-contained
- Don't modify other apps without permission

## Ideas for Apps

Looking for inspiration? Try building:
- Personal blog or portfolio
- URL shortener
- Todo list app
- Weather app
- API for something interesting
- Game or interactive tool
- Data visualization
- Chat application
- File sharing service
- Bookmark manager

Have fun and be creative! 🚀
