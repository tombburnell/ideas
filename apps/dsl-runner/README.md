# DSL Runner (idea)

DSL Runner is a full-stack workflow playground that lets you define YAML-based LLM workflows, edit them directly or through an AI-assisted chat, persist them in SQLite, execute them through BullMQ + LangGraph, and watch execution progress live through SSE.

## Stack

1. Next.js App Router + TypeScript + Tailwind + Monaco Editor
2. Express custom server for API routes and SSE
3. BullMQ with Redis running inside the same Docker container
4. LangGraph for execution planning
5. Prisma ORM with SQLite on a Fly volume
6. OpenRouter for chat editing and workflow execution via `@openrouter/ai-sdk-provider`
7. TanStack Query on the frontend

## Local development

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `OPENROUTER_API_KEY` in `.env`.

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start Redis locally on port `6379`.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Production on Fly.io

1. This app uses a Fly volume mounted at `/data` and `DATABASE_URL=file:/data/dsl-runner.db`.
2. Set the OpenRouter secret:

   ```bash
   fly secrets set OPENROUTER_API_KEY=your-key -a dsl-runner-idea
   ```

3. Deploy:

   ```bash
   fly deploy
   ```

Redis runs inside the same container as the app, so no separate Redis service is required.
