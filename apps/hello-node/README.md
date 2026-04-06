# Hello Node

A simple Express.js application demonstrating Node.js deployment from the monorepo.

## Local Development

```bash
cd apps/hello-node
npm install
npm run dev
```

Visit `http://localhost:3000`

## Deployment

This app automatically deploys to Fly.io when changes are pushed to the main branch.

**Manual deployment:**
```bash
cd apps/hello-node
fly deploy
```

## Tech Stack

- Node.js
- Express.js
