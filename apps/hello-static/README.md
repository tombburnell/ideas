# Hello Static

A simple static HTML site demonstrating static site deployment from the monorepo.

## Local Development

```bash
cd apps/hello-static
# Option 1: Using Python's built-in server
python -m http.server 8080

# Option 2: Using Node.js
npx serve

# Option 3: Just open index.html in a browser
```

Visit `http://localhost:8080`

## Deployment

This app automatically deploys to Fly.io when changes are pushed to the main branch.

**Manual deployment:**
```bash
cd apps/hello-static
fly deploy
```

## Tech Stack

- HTML5
- CSS3
- Nginx (for serving)
