import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { serializeRunDetail, serializeStep } from "@/server/db/serializers";
import type { WorkflowRunDetail, WorkflowStepRecord } from "@/shared/dsl";

const toJsonValue = (value: Record<string, unknown> | Record<string, string>): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export const runRepo = {
  async create(input: {
    workflowRecordId: string;
    formData: Record<string, string>;
    contextData: Record<string, unknown>;
  }): Promise<string> {
    const run = await prisma.workflowRun.create({
      data: {
        workflowId: input.workflowRecordId,
        status: "pending",
        formData: toJsonValue(input.formData),
        contextData: toJsonValue(input.contextData)
      }
    });

    return run.id;
  },

  async getById(runId: string): Promise<WorkflowRunDetail | null> {
    const run = await prisma.workflowRun.findUnique({
      where: {
        id: runId
      },
      include: {
        workflow: true,
        steps: {
          orderBy: {
            orderIndex: "asc"
          }
        }
      }
    });

    if (!run) {
      return null;
    }

    return serializeRunDetail({
      run,
      workflow: run.workflow,
      steps: run.steps
    });
  },

  async setRunStatus(input: {
    runId: string;
    status: "running" | "completed" | "failed";
    contextData?: Record<string, unknown>;
    errorMessage?: string | null;
    completedAt?: Date | null;
  }): Promise<void> {
    await prisma.workflowRun.update({
      where: {
        id: input.runId
      },
      data: {
        status: input.status,
        contextData: input.contextData ? toJsonValue(input.contextData) : undefined,
        errorMessage: input.errorMessage,
        completedAt: input.completedAt
      }
    });
  },

  async createStep(input: {
    runId: string;
    stepId: string;
    stepType: string;
    orderIndex: number;
    inputData: Record<string, unknown>;
  }): Promise<WorkflowStepRecord> {
    const step = await prisma.workflowStep.create({
      data: {
        runId: input.runId,
        stepId: input.stepId,
        stepType: input.stepType,
        status: "running",
        orderIndex: input.orderIndex,
        inputData: toJsonValue(input.inputData),
        outputData: toJsonValue({}),
        startedAt: new Date()
      }
    });

    return serializeStep(step);
  },

  async completeStep(input: {
    stepRecordId: string;
    outputData: Record<string, unknown>;
  }): Promise<WorkflowStepRecord> {
    const step = await prisma.workflowStep.update({
      where: {
        id: input.stepRecordId
      },
      data: {
        status: "completed",
        outputData: toJsonValue(input.outputData),
        completedAt: new Date()
      }
    });

    return serializeStep(step);
  },

  async failStep(input: {
    stepRecordId: string;
    errorMessage: string;
  }): Promise<WorkflowStepRecord> {
    const step = await prisma.workflowStep.update({
      where: {
        id: input.stepRecordId
      },
      data: {
        status: "failed",
        errorMessage: input.errorMessage,
        completedAt: new Date()
      }
    });

    return serializeStep(step);
  }
};
