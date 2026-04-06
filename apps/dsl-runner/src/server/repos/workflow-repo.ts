import { prisma } from "@/server/db/prisma";
import { serializeWorkflow } from "@/server/db/serializers";
import type { WorkflowRecord } from "@/shared/dsl";

export const workflowRepo = {
  async list(): Promise<WorkflowRecord[]> {
    const workflows = await prisma.workflow.findMany({
      orderBy: {
        updatedAt: "desc"
      }
    });

    return workflows.map(serializeWorkflow);
  },

  async getByWorkflowId(workflowId: string): Promise<WorkflowRecord | null> {
    const workflow = await prisma.workflow.findUnique({
      where: {
        workflowId
      }
    });

    return workflow ? serializeWorkflow(workflow) : null;
  },

  async upsert(input: { workflowId: string; name: string; dsl: string }): Promise<WorkflowRecord> {
    const workflow = await prisma.workflow.upsert({
      where: {
        workflowId: input.workflowId
      },
      update: {
        name: input.name,
        dsl: input.dsl
      },
      create: {
        workflowId: input.workflowId,
        name: input.name,
        dsl: input.dsl
      }
    });

    return serializeWorkflow(workflow);
  }
};
