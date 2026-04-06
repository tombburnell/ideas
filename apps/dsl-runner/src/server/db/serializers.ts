import { parseDocument } from "yaml";
import type { Prompt, Workflow, WorkflowRun, WorkflowStep } from "@prisma/client";
import type {
  PromptRecord,
  WorkflowDslDefinition,
  WorkflowRecord,
  WorkflowRunDetail,
  WorkflowRunRecord,
  WorkflowStepRecord
} from "@/shared/dsl";

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const parseDefinition = (dsl: string): WorkflowDslDefinition => parseDocument(dsl).toJS() as WorkflowDslDefinition;

export const serializeWorkflow = (workflow: Workflow): WorkflowRecord => ({
  id: workflow.id,
  workflowId: workflow.workflowId,
  name: workflow.name,
  dsl: workflow.dsl,
  definition: parseDefinition(workflow.dsl),
  createdAt: workflow.createdAt.toISOString(),
  updatedAt: workflow.updatedAt.toISOString()
});

export const serializePrompt = (prompt: Prompt): PromptRecord => ({
  id: prompt.id,
  promptId: prompt.promptId,
  name: prompt.name,
  template: prompt.template,
  version: prompt.version,
  createdAt: prompt.createdAt.toISOString(),
  updatedAt: prompt.updatedAt.toISOString()
});

export const serializeRun = (run: WorkflowRun): WorkflowRunRecord => ({
  id: run.id,
  workflowRecordId: run.workflowId,
  status: run.status as WorkflowRunRecord["status"],
  formData: toRecord(run.formData) as Record<string, string>,
  contextData: toRecord(run.contextData),
  errorMessage: run.errorMessage,
  createdAt: run.createdAt.toISOString(),
  updatedAt: run.updatedAt.toISOString(),
  completedAt: run.completedAt?.toISOString() ?? null
});

export const serializeStep = (step: WorkflowStep): WorkflowStepRecord => ({
  id: step.id,
  runId: step.runId,
  stepId: step.stepId,
  stepType: step.stepType as WorkflowStepRecord["stepType"],
  status: step.status as WorkflowStepRecord["status"],
  orderIndex: step.orderIndex,
  inputData: toRecord(step.inputData),
  outputData: toRecord(step.outputData),
  errorMessage: step.errorMessage,
  startedAt: step.startedAt?.toISOString() ?? null,
  completedAt: step.completedAt?.toISOString() ?? null,
  createdAt: step.createdAt.toISOString(),
  updatedAt: step.updatedAt.toISOString()
});

export const serializeRunDetail = (payload: {
  run: WorkflowRun;
  workflow: Workflow;
  steps: WorkflowStep[];
}): WorkflowRunDetail => ({
  ...serializeRun(payload.run),
  workflow: serializeWorkflow(payload.workflow),
  steps: payload.steps.map(serializeStep)
});
