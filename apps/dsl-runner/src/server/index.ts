import http from "node:http";
import next from "next";
import { appConfig } from "@/config/app-config";
import { createApiApp } from "@/server/http/app";
import { promptService } from "@/server/services/prompt-service";
import { workflowWorker } from "@/server/workers/workflow-worker";

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: process.cwd() });
const nextHandler = nextApp.getRequestHandler();

const bootstrap = async (): Promise<void> => {
  await promptService.init();
  await nextApp.prepare();

  const apiApp = createApiApp();

  apiApp.all(/.*/, (request, response) => nextHandler(request, response));

  const server = http.createServer(apiApp);

  server.listen(appConfig.server.port, appConfig.server.host, () => {
    console.log(`dsl-runner listening on http://${appConfig.server.host}:${appConfig.server.port}`);
  });
};

void bootstrap();

const shutdown = async (): Promise<void> => {
  await workflowWorker.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
