# Deployment Guide

This guide covers how to deploy apps from this monorepo to Fly.io.

## Table of Contents

- [Initial Setup](#initial-setup)
- [Adding a New App](#adding-a-new-app)
- [Automatic Deployment](#automatic-deployment)
- [Manual Deployment](#manual-deployment)
- [Monitoring & Debugging](#monitoring--debugging)
- [Best Practices](#best-practices)

## Initial Setup

### 1. Install Fly CLI

**macOS/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows:**
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Get API Token for GitHub Actions

```bash
fly auth token
```

### 4. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `FLY_API_TOKEN`
5. Value: Paste the token from step 3
6. Click "Add secret"

## Adding a New App

### Step 1: Create App Folder

```bash
mkdir -p apps/my-new-app
cd apps/my-new-app
```

### Step 2: Add Your Code

Create your application files. Example for Node.js:

```bash
# Create package.json
npm init -y

# Install dependencies
npm install express

# Create your app files
# index.js, etc.
```

### Step 3: Add Dockerfile

Create a `Dockerfile` appropriate for your tech stack. See example apps for reference.

### Step 4: Add Fly.io Configuration

Copy a template from `.github/fly-templates/`:

```bash
cp ../../.github/fly-templates/node-template.toml fly.toml
```

Edit `fly.toml`:
- Change `app` to a unique name (e.g., `my-new-app-idea`)
- Adjust `internal_port` if needed
- Set your preferred `primary_region`

### Step 5: Create App on Fly.io

**Option A: Interactive (Recommended for first time)**
```bash
fly launch
```

**Option B: Using existing fly.toml**
```bash
# Extract app name from fly.toml
APP_NAME=$(grep "^app" fly.toml | cut -d'"' -f2)

# Create the app
fly apps create $APP_NAME
```

### Step 6: Set Environment Variables (if needed)

```bash
fly secrets set DATABASE_URL=postgres://... -a your-app-name
fly secrets set API_KEY=your-key -a your-app-name
```

### Step 7: Initial Deployment

```bash
fly deploy
```

### Step 8: Commit and Push

```bash
git add .
git commit -m "Add my-new-app"
git push
```

Future changes to this app will auto-deploy via GitHub Actions!

## Automatic Deployment

### How It Works

1. **Push to main branch**: GitHub Actions detects which apps changed
2. **Selective deployment**: Only changed apps are deployed
3. **Parallel execution**: Multiple apps deploy simultaneously
4. **Independent failures**: One app failing doesn't stop others

### Triggering Deployment

**Automatic:**
```bash
git add apps/my-app/
git commit -m "Update my-app"
git push
```

**Manual (specific app):**
1. Go to GitHub Actions tab
2. Select "Deploy Apps to Fly.io"
3. Click "Run workflow"
4. Enter app name (e.g., `my-app`)
5. Click "Run workflow"

### What Gets Deployed

Changes detected in these paths trigger deployment:
- `apps/my-app/**` - Any file in the app directory

Changes to these do NOT trigger deployment:
- Root-level files (README.md, etc.)
- `.github/` files
- Other apps' files

## Manual Deployment

### Deploy Specific App

```bash
cd apps/my-app
fly deploy
```

### Deploy with Custom Options

```bash
# Deploy without HA (single machine)
fly deploy --ha=false

# Deploy to specific region
fly deploy --region ord

# Deploy without remote builder
fly deploy --local-only
```

### Rollback to Previous Version

```bash
# List releases
fly releases -a your-app-name

# Rollback to version
fly releases rollback v2 -a your-app-name
```

## Monitoring & Debugging

### View Logs

```bash
# Real-time logs
fly logs -a your-app-name

# Historical logs
fly logs -a your-app-name --past 1h
```

### Check App Status

```bash
# App info
fly status -a your-app-name

# Machine details
fly machine list -a your-app-name

# Resource usage
fly scale show -a your-app-name
```

### SSH into Machine

```bash
fly ssh console -a your-app-name
```

### Open App Dashboard

```bash
fly dashboard -a your-app-name
```

## Best Practices

### Resource Management

**Free Tier Optimization:**
- Use `auto_stop_machines = true` to stop when idle
- Use `auto_start_machines = true` to start on request
- Set `min_machines_running = 0` for low-traffic apps
- Start with 256MB memory, scale up if needed

**Production Apps:**
- Set `min_machines_running = 1` or higher
- Use `--ha` flag for high availability (2+ machines)
- Monitor resource usage and scale accordingly

### Security

**Environment Variables:**
```bash
# Never commit secrets to git
# Use fly secrets instead
fly secrets set SECRET_KEY=xxx -a your-app-name

# List secrets (values hidden)
fly secrets list -a your-app-name
```

**Database Connections:**
```bash
# Use Fly Postgres or connect to external DB
fly postgres create --name my-db
fly postgres attach my-db -a your-app-name
```

### Performance

**Region Selection:**
- Choose region closest to your users
- Use multiple regions for global apps: `fly regions add lhr fra`
- Check latency: `fly regions list`

**Caching:**
- Use CDN for static assets
- Configure browser caching in your app
- Consider Fly's built-in caching options

### Cost Management

**Monitor Usage:**
```bash
# View current usage
fly billing show

# Set spending limit
fly orgs billing limit set 10
```

**Optimize Costs:**
- Use auto-stop for dev/test apps
- Delete unused apps: `fly apps destroy app-name`
- Scale down memory if under-utilized
- Use shared CPUs unless you need dedicated

### Troubleshooting

**Deployment Fails:**
```bash
# Check logs during deployment
fly logs -a your-app-name

# Verify Dockerfile builds locally
docker build -t test-app .
docker run -p 8080:8080 test-app

# Check fly.toml syntax
fly config validate
```

**App Won't Start:**
```bash
# Check health checks
fly checks list -a your-app-name

# Verify port matches fly.toml
# internal_port must match the port your app listens on

# Check environment variables
fly secrets list -a your-app-name
```

**GitHub Actions Fails:**
- Verify `FLY_API_TOKEN` is set in GitHub Secrets
- Check Actions logs for specific errors
- Ensure `fly.toml` exists in app directory
- Verify app name in `fly.toml` matches Fly.io app

### Multi-Environment Setup

For staging/production environments:

**Option 1: Separate Apps**
```toml
# apps/my-app/fly.toml (production)
app = "my-app-prod"

# apps/my-app/fly.staging.toml
app = "my-app-staging"
```

Deploy staging:
```bash
fly deploy --config fly.staging.toml
```

**Option 2: Separate Branches**
- `main` → production
- `staging` → staging

Update GitHub Actions to deploy based on branch.

## Example Workflows

### Adding a Next.js App

```bash
# Create app
npx create-next-app@latest apps/my-nextjs-app

# Add Dockerfile
cat > apps/my-nextjs-app/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Add fly.toml
cp .github/fly-templates/node-template.toml apps/my-nextjs-app/fly.toml

# Edit fly.toml with unique app name
# Deploy
cd apps/my-nextjs-app
fly launch
```

### Adding a Python FastAPI App

```bash
# Create app
mkdir -p apps/my-fastapi-app
cd apps/my-fastapi-app

# Create files
cat > main.py << 'EOF'
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
EOF

cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
EOF

cat > Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

# Add fly.toml
cp ../../.github/fly-templates/python-template.toml fly.toml

# Deploy
fly launch
```

## Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Pricing Calculator](https://fly.io/docs/about/pricing/)
- [Fly.io Community](https://community.fly.io/)
- [Fly.io Status](https://status.flyio.net/)

## Getting Help

**Issues with this monorepo:**
- Open an issue on GitHub
- Check existing apps for examples

**Issues with Fly.io:**
- Check [Fly.io docs](https://fly.io/docs/)
- Visit [community forum](https://community.fly.io/)
- Run `fly doctor` for diagnostics
