import { workflowRepo } from "@/server/repos/workflow-repo";
import { parseWorkflowDsl, serializeDefinition } from "@/server/services/dsl-validator";
import type { SaveWorkflowInput, ValidationResult, WorkflowRecord } from "@/shared/dsl";

export const workflowService = {
  async list(): Promise<WorkflowRecord[]> {
    return workflowRepo.list();
  },

  async get(workflowId: string): Promise<WorkflowRecord | null> {
    return workflowRepo.getByWorkflowId(workflowId);
  },

  validate(dsl: string): ValidationResult {
    return parseWorkflowDsl(dsl);
  },

  async save(input: SaveWorkflowInput): Promise<WorkflowRecord> {
    const validation = parseWorkflowDsl(input.dsl);

    if (!validation.valid || !validation.definition) {
      throw new Error(validation.issues[0]?.message ?? "Workflow DSL is invalid");
    }

    validation.definition.name = input.name;

    return workflowRepo.upsert({
      workflowId: validation.definition.id,
      name: input.name,
      dsl: serializeDefinition(validation.definition)
    });
  }
};
