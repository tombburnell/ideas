import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  REDIS_HOST: z.string().min(1).default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379)
});

const parsedEnv = envSchema.parse(process.env);

export const appConfig = {
  appName: "dsl-runner-idea",
  workflowLimit: 10,
  routes: {
    apiBasePath: "/api"
  },
  server: {
    host: "0.0.0.0",
    port: parsedEnv.PORT
  },
  database: {
    url: parsedEnv.DATABASE_URL,
    flyVolumePath: "/data/dsl-runner.db"
  },
  queue: {
    runQueueName: "workflow-runs",
    connectionName: "dsl-runner-redis"
  },
  redis: {
    host: parsedEnv.REDIS_HOST,
    port: parsedEnv.REDIS_PORT,
    url: `redis://${parsedEnv.REDIS_HOST}:${parsedEnv.REDIS_PORT}`
  },
  openRouter: {
    apiKey: parsedEnv.OPENROUTER_API_KEY,
    baseUrl: parsedEnv.OPENROUTER_BASE_URL,
    models: {
      fast: "openai/gpt-5-nano",
      smart: "qwen/qwen3.5-9b",
      reasoning: "qwen/qwen3.5-27b"
    }
  },
  ui: {
    sseReconnectDelayMs: 1000,
    defaultWorkflowName: "Example Workflow"
  }
} as const;

export type AppConfig = typeof appConfig;
