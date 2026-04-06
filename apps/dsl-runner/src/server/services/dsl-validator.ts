import { parseDocument } from "yaml";
import { stringify } from "yaml";
import { z } from "zod";
import { appConfig } from "@/config/app-config";
import type {
  ValidationIssue,
  ValidationResult,
  WorkflowBranchStep,
  WorkflowDslDefinition,
  WorkflowLlmStep,
  WorkflowParallelStep,
  WorkflowStepDefinition
} from "@/shared/dsl";

const fieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean"])
});

const llmStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("llm"),
  prompt: z.string().min(1),
  input: z.string().optional(),
  output: z.record(z.string(), z.enum(["string", "number", "boolean"])),
  model: z.enum(["fast", "smart", "reasoning"]),
  tools: z.array(z.string().min(1)).optional()
});

const branchStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("branch"),
  condition: z.string().min(1),
  then: z.string().min(1),
  else: z.string().min(1)
});

const parallelStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal("parallel"),
  steps: z.array(z.string().min(1)).min(1)
});

const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  form: z.object({
    fields: z.array(fieldSchema)
  }),
  steps: z.array(z.union([llmStepSchema, branchStepSchema, parallelStepSchema])).min(1).max(appConfig.workflowLimit)
});

const createIssue = (path: string, message: string): ValidationIssue => ({
  path,
  message,
  line: 1,
  column: 1
});

const validateGraphStructure = (definition: WorkflowDslDefinition): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const stepMap = new Map<string, WorkflowStepDefinition>();

  for (const step of definition.steps) {
    if (stepMap.has(step.id)) {
      issues.push(createIssue(`steps.${step.id}`, `Duplicate step id '${step.id}'`));
      continue;
    }

    stepMap.set(step.id, step);
  }

  for (const step of definition.steps) {
    if (step.type === "branch") {
      const branchStep = step as WorkflowBranchStep;
      if (!stepMap.has(branchStep.then)) {
        issues.push(createIssue(`steps.${branchStep.id}.then`, `Unknown target step '${branchStep.then}'`));
      }

      if (!stepMap.has(branchStep.else)) {
        issues.push(createIssue(`steps.${branchStep.id}.else`, `Unknown target step '${branchStep.else}'`));
      }
    }

    if (step.type === "parallel") {
      const parallelStep = step as WorkflowParallelStep;
      for (const nestedStepId of parallelStep.steps) {
        if (!stepMap.has(nestedStepId)) {
          issues.push(createIssue(`steps.${parallelStep.id}.steps`, `Unknown nested step '${nestedStepId}'`));
        }
      }
    }

    if (step.type === "llm") {
      const llmStep = step as WorkflowLlmStep;
      if (llmStep.tools?.some((toolName) => toolName !== "web_search")) {
        issues.push(createIssue(`steps.${llmStep.id}.tools`, "Only the 'web_search' tool is supported"));
      }
    }
  }

  return issues;
};

export const parseWorkflowDsl = (dsl: string): ValidationResult => {
  try {
    const document = parseDocument(dsl);
    const parsedValue = document.toJS();
    const definition = workflowSchema.parse(parsedValue) as WorkflowDslDefinition;
    const issues = validateGraphStructure(definition);

    return {
      valid: issues.length === 0,
      issues,
      definition: issues.length === 0 ? definition : null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid workflow DSL";

    return {
      valid: false,
      issues: [createIssue("dsl", message)],
      definition: null
    };
  }
};

export const serializeDefinition = (definition: WorkflowDslDefinition): string => stringify(definition);
