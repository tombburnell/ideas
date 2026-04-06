import { Router } from "express";
import { runOrchestrator } from "@/server/orchestrators/run-orchestrator";
import { runRepo } from "@/server/repos/run-repo";
import { runEventBus } from "@/server/services/event-bus";
import type { CreateRunInput } from "@/shared/dsl";

export const runRouter = Router();

runRouter.post("/runs", async (request, response, next) => {
  try {
    const payload = request.body as CreateRunInput;
    const runId = await runOrchestrator.createRun(payload);
    response.status(201).json({ runId });
  } catch (error) {
    next(error);
  }
});

runRouter.get("/runs/:runId", async (request, response, next) => {
  try {
    const run = await runRepo.getById(request.params.runId);

    if (!run) {
      response.status(404).json({ error: "Run not found" });
      return;
    }

    response.json({ run });
  } catch (error) {
    next(error);
  }
});

runRouter.get("/workflows/:runId/stream", async (request, response, next) => {
  try {
    const run = await runRepo.getById(request.params.runId);

    if (!run) {
      response.status(404).json({ error: "Run not found" });
      return;
    }

    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();

    response.write(`data: ${JSON.stringify({
      runId: run.id,
      status: run.status,
      step: null,
      errorMessage: run.errorMessage
    })}\n\n`);

    const unsubscribe = runEventBus.subscribe(run.id, (event) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    request.on("close", () => {
      unsubscribe();
      response.end();
    });
  } catch (error) {
    next(error);
  }
});
