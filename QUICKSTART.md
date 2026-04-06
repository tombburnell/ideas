# Quick Start Guide

Get your first app deployed in 5 minutes!

## Prerequisites

1. **Fly.io account** - Sign up at https://fly.io
2. **Fly CLI installed**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
3. **GitHub secret configured**:
   - Get token: `fly auth token`
   - Add to GitHub: Settings → Secrets → `FLY_API_TOKEN`

## Deploy an Example App

```bash
# Choose an example
cd apps/hello-node  # or hello-python or hello-static

# Login to Fly.io
fly auth login

# Launch (creates app and deploys)
fly launch

# Open in browser
fly open
```

Done! Your app is live at `https://[app-name].fly.dev`

## Create Your First App

### 1. Create App Folder
```bash
mkdir apps/my-first-app
cd apps/my-first-app
```

### 2. Add Your Code

**Node.js Example:**
```bash
npm init -y
npm install express

cat > index.js << 'EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from my first app!');
});

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
EOF
```

### 3. Add Dockerfile
```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
EOF
```

### 4. Add Fly Config
```bash
# Copy template
cp ../../.github/fly-templates/node-template.toml fly.toml

# Edit fly.toml - change app name to something unique
# Example: my-first-app-idea
```

### 5. Deploy
```bash
fly launch  # First time
# OR
fly deploy  # Subsequent deployments
```

### 6. Push to GitHub
```bash
git add .
git commit -m "Add my-first-app"
git push
```

Your app now auto-deploys on every push! 🎉

## Common Commands

```bash
# View logs
fly logs -a your-app-name

# Check status
fly status -a your-app-name

# Open dashboard
fly dashboard -a your-app-name

# SSH into machine
fly ssh console -a your-app-name

# Set secrets
fly secrets set API_KEY=xxx -a your-app-name

# Scale resources
fly scale memory 512 -a your-app-name
```

## Tips

- **App names must be globally unique** - add a suffix like `-idea`
- **Free tier**: 3 VMs with 256MB each, auto-stop when idle
- **Port must match**: `internal_port` in fly.toml = port your app listens on
- **Listen on 0.0.0.0**, not localhost
- **Check logs** if something goes wrong: `fly logs -a app-name`

## Help

- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guide
- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for best practices
- Check [Fly.io docs](https://fly.io/docs/)
- Look at example apps in `apps/` folder

## What's Next?

Build something cool! Ideas:
- Personal blog
- URL shortener
- Weather app
- Todo list
- API for something interesting
- Portfolio site
- Chat app
- Game

Each idea gets its own folder and deployment. Mix and match tech stacks as you like!
