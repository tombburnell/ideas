import { promptService } from "@/server/services/prompt-service";
import { runEventBus } from "@/server/services/event-bus";
import { langGraphService } from "@/server/services/langgraph-service";
import { openRouterService } from "@/server/services/openrouter-service";
import { workflowRunQueue } from "@/server/services/queue-service";
import { runRepo } from "@/server/repos/run-repo";
import { workflowRepo } from "@/server/repos/workflow-repo";
import type { CreateRunInput, RunEvent, WorkflowDslDefinition, WorkflowLlmStep } from "@/shared/dsl";

const createEvent = (input: Omit<RunEvent, "step"> & { step?: RunEvent["step"] }): RunEvent => ({
  runId: input.runId,
  status: input.status,
  step: input.step ?? null,
  errorMessage: input.errorMessage
});

export const runOrchestrator = {
  async createRun(input: CreateRunInput): Promise<string> {
    const workflow = await workflowRepo.getByWorkflowId(input.workflowId);

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const contextData = {
      ...input.formData
    } satisfies Record<string, unknown>;

    const runId = await runRepo.create({
      workflowRecordId: workflow.id,
      formData: input.formData,
      contextData
    });

    await workflowRunQueue.add(runId, {
      runId,
      workflowId: workflow.workflowId
    });

    return runId;
  },

  async executeRun(runId: string): Promise<void> {
    const run = await runRepo.getById(runId);

    if (!run) {
      throw new Error("Run not found");
    }

    const definition = run.workflow.definition as WorkflowDslDefinition;
    const contextData: Record<string, unknown> = {
      ...run.formData,
      ...run.contextData
    };

    await runRepo.setRunStatus({
      runId,
      status: "running",
      contextData,
      errorMessage: null,
      completedAt: null
    });

    runEventBus.publish(createEvent({ runId, status: "running", errorMessage: null }));

    try {
      const executionPlan = await langGraphService.compileExecutionPlan(definition, contextData);

      for (const [orderIndex, step] of executionPlan.entries()) {
        const stepRecord = await runRepo.createStep({
          runId,
          stepId: step.id,
          stepType: step.type,
          orderIndex,
          inputData: contextData
        });

        runEventBus.publish(createEvent({ runId, status: "running", step: stepRecord, errorMessage: null }));

        try {
          const llmStep = step as WorkflowLlmStep;
          const prompt = await promptService.get(llmStep.prompt);

          if (!prompt) {
            throw new Error(`Prompt '${llmStep.prompt}' not found`);
          }

          const outputData = await openRouterService.executeWorkflowStep({
            step: llmStep,
            promptTemplate: prompt.template,
            contextData
          });

          Object.assign(contextData, outputData);

          const completedStep = await runRepo.completeStep({
            stepRecordId: stepRecord.id,
            outputData
          });

          runEventBus.publish(createEvent({ runId, status: "running", step: completedStep, errorMessage: null }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Workflow step failed";
          const failedStep = await runRepo.failStep({
            stepRecordId: stepRecord.id,
            errorMessage: message
          });

          await runRepo.setRunStatus({
            runId,
            status: "failed",
            contextData,
            errorMessage: message,
            completedAt: new Date()
          });

          runEventBus.publish(createEvent({ runId, status: "failed", step: failedStep, errorMessage: message }));
          return;
        }
      }

      await runRepo.setRunStatus({
        runId,
        status: "completed",
        contextData,
        errorMessage: null,
        completedAt: new Date()
      });

      runEventBus.publish(createEvent({ runId, status: "completed", errorMessage: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow execution failed";
      await runRepo.setRunStatus({
        runId,
        status: "failed",
        contextData,
        errorMessage: message,
        completedAt: new Date()
      });

      runEventBus.publish(createEvent({ runId, status: "failed", errorMessage: message }));
    }
  }
};
