import { parse } from "yaml";
import type { WorkflowBranchStep, WorkflowDslDefinition, WorkflowParallelStep, WorkflowStepDefinition } from "@/shared/dsl";

const escapeLabel = (value: string): string => value.replaceAll('"', '\\"');

const nodeIdForStep = (stepId: string): string => `step_${stepId.replaceAll(/[^a-zA-Z0-9_]/g, "_")}`;

const topLevelSteps = (definition: WorkflowDslDefinition): WorkflowStepDefinition[] => {
  const nestedStepIds = new Set<string>();

  for (const step of definition.steps) {
    if (step.type === "parallel") {
      for (const nestedStepId of (step as WorkflowParallelStep).steps) {
        nestedStepIds.add(nestedStepId);
      }
    }
  }

  return definition.steps.filter((step) => !nestedStepIds.has(step.id));
};

export const buildWorkflowMermaid = (dsl: string): string | null => {
  try {
    const definition = parse(dsl) as WorkflowDslDefinition;

    if (!definition?.steps || !Array.isArray(definition.steps)) {
      return null;
    }

    const lines = ["flowchart LR", `start([\"${escapeLabel(definition.name)}\"])`];

    for (const step of definition.steps) {
      lines.push(`${nodeIdForStep(step.id)}["${escapeLabel(`${step.id} (${step.type})`)}"]`);
    }

    const visibleSteps = topLevelSteps(definition);

    if (visibleSteps.length > 0) {
      lines.push(`start --> ${nodeIdForStep(visibleSteps[0].id)}`);
    }

    for (let index = 0; index < visibleSteps.length - 1; index += 1) {
      lines.push(`${nodeIdForStep(visibleSteps[index].id)} --> ${nodeIdForStep(visibleSteps[index + 1].id)}`);
    }

    for (const step of definition.steps) {
      if (step.type === "branch") {
        const branchStep = step as WorkflowBranchStep;
        lines.push(`${nodeIdForStep(step.id)} -->|then| ${nodeIdForStep(branchStep.then)}`);
        lines.push(`${nodeIdForStep(step.id)} -->|else| ${nodeIdForStep(branchStep.else)}`);
      }

      if (step.type === "parallel") {
        const parallelStep = step as WorkflowParallelStep;

        for (const nestedStepId of parallelStep.steps) {
          lines.push(`${nodeIdForStep(step.id)} --> ${nodeIdForStep(nestedStepId)}`);
        }
      }
    }

    return lines.join("\n");
  } catch {
    return null;
  }
};
