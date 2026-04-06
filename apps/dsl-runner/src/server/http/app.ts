import express from "express";
import { httpConfig } from "@/shared/http";
import { errorHandler } from "@/server/http/middleware/error-handler";
import { healthRouter } from "@/server/http/routers/health-router";
import { runRouter } from "@/server/http/routers/run-router";
import { workflowRouter } from "@/server/http/routers/workflow-router";

export const createApiApp = (): express.Express => {
  const app = express();

  app.use(express.json({ limit: httpConfig.jsonBodyLimit }));
  app.use(httpConfig.apiBasePath, healthRouter, workflowRouter, runRouter);
  app.use(errorHandler);

  return app;
};
