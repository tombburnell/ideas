import { Router } from "express";
import { chatOrchestrator } from "@/server/orchestrators/chat-orchestrator";
import { promptService } from "@/server/services/prompt-service";
import { workflowService } from "@/server/services/workflow-service";
import type { ChatEditInput, SaveWorkflowInput } from "@/shared/dsl";

export const workflowRouter = Router();

workflowRouter.get("/workflows", async (_request, response, next) => {
  try {
    response.json({
      workflows: await workflowService.list()
    });
  } catch (error) {
    next(error);
  }
});

workflowRouter.get("/workflows/:workflowId", async (request, response, next) => {
  try {
    const workflow = await workflowService.get(request.params.workflowId);

    if (!workflow) {
      response.status(404).json({ error: "Workflow not found" });
      return;
    }

    response.json({ workflow });
  } catch (error) {
    next(error);
  }
});

workflowRouter.post("/workflows/validate", async (request, response, next) => {
  try {
    const dsl = String(request.body.dsl ?? "");
    response.json({
      validation: workflowService.validate(dsl)
    });
  } catch (error) {
    next(error);
  }
});

workflowRouter.post("/workflows", async (request, response, next) => {
  try {
    const payload = request.body as SaveWorkflowInput;
    const workflow = await workflowService.save(payload);
    response.status(201).json({ workflow });
  } catch (error) {
    next(error);
  }
});

workflowRouter.post("/workflows/chat-edit", async (request, response, next) => {
  try {
    const payload = request.body as ChatEditInput;
    const result = await chatOrchestrator.editDsl(payload);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

workflowRouter.get("/prompts", async (_request, response, next) => {
  try {
    response.json({
      prompts: await promptService.list()
    });
  } catch (error) {
    next(error);
  }
});
